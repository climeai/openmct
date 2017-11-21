/*global define, Promise*/

define([
    './Collection',
    './Model',
    '../lib/color'
], function (
    Collection,
    Model,
    color
) {
    'use strict';

    var PlotConfigurationModel = Model.extend({

        initialize: function (options) {
            this.series = new Collection({models: options.model.series});
            this.xAxis = new Model({model: options.model.xAxis});
            this.yAxis = new Model({model: options.model.yAxis});
            this.legend = new Model({model: options.model.legend});

            this.palette = new color.ColorPalette();

            this.xAxis.on('change:range', function (newValue, oldValue, model) {
                model.set('displayRange', newValue);
            });
            this.yAxis.on('change:range', function (newValue, oldValue, model) {
                if (!newValue) {
                    this.unset('displayRange');
                    return
                }
                if (model.get('autoscale')) {
                    var padding = Math.abs(newValue.max - newValue.min) * model.get('autoscalePadding');
                    if (padding === 0) {
                        padding = 1;
                    }
                    model.set('displayRange', {
                        min: newValue.min - padding,
                        max: newValue.max + padding,
                    });
                } else {
                    model.set('displayRange', newValue);
                }
            });

            this.listenTo(this.series, 'add', this.onSeriesAdd, this);
            this.listenTo(this.series, 'add', this.setLegendHeight, this);
            this.listenTo(this.series, 'remove', this.onSeriesRemove, this);
            this.listenTo(this.series, 'remove', this.setLegendHeight, this);

            this.yAxis.on('change:autoscale', function (autoscale, oldValue, model) {
                model.set('range', model.get('range')); // trigger autoscale
            });
            this.yAxis.on('change:autoscalePadding', function (padding, old, model) {
                if (model.get('autoscale')) {
                    model.set('range', model.get('range'));
                }
            });

            if (this.xAxis.get('range')) {
                this.xAxis.set('range', this.xAxis.get('range'));
            }
            if (this.yAxis.get('range')) {
                this.yAxis.set('range', this.yAxis.get('range'));
            }

            this.legend.set('expanded', this.legend.get('expandByDefault'));
            this.listenTo(this.legend, 'change:expanded', this.setLegendHeight, this);
            this.setLegendHeight();

            this.listenTo(this, 'destroy', this.onDestroy, this);

        },
        setLegendHeight: function () {
            var expanded = this.legend.get('expanded');
            if (this.legend.get('position') !== 'top') {
                this.legend.set('height', '0px');
            } else {
                this.legend.set('height', expanded ? (20 * (this.series.size() + 1) + 40) + 'px' : '21px');
            }
        },
        onDestroy: function () {
            this.xAxis.destroy();
            this.yAxis.destroy();
            this.series.destroy();
            this.legend.destroy();
        },
        defaults: function () {
            return {
                state: 'unloaded',
                series: [],
                xAxis: {
                },
                yAxis: {
                    autoscalePadding: 0.1
                },
                legend: {
                    position: 'top',
                    expandByDefault: false,
                    valueToShowWhenCollapsed: 'nearestValue',
                    showTimestampWhenExpanded: true,
                    showValueWhenExpanded: true,
                    showMaximumWhenExpanded: true,
                    showMinimumWhenExpanded: true
                }
            };
        },
        onSeriesAdd: function (series) {
            var seriesColor = series.get('color');
            if (seriesColor) {
                if (!(seriesColor instanceof color.Color)) {
                    seriesColor = color.Color.fromHexString(seriesColor);
                    series.set('color', seriesColor);
                }
                this.palette.remove(seriesColor);
            } else {
                series.set('color', this.palette.getNextColor());
            }
            this.listenTo(series, 'change:color', this.updateColorPalette, this);
        },
        onSeriesRemove: function (series) {
            this.palette.return(series.get('color'));
            this.stopListening(series);
        },
        updateColorPalette: function (newColor, oldColor) {
            this.palette.remove(newColor);
            var seriesWithColor = this.series.filter(function (series) {
                return series.get('color') === newColor;
            })[0];
            if (!seriesWithColor) {
                this.palette.return(oldColor);
            }
        }
    });

    return PlotConfigurationModel;
});