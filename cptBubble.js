/* This is an example of Dimensional Charting Javascript Library by the amazing Gordon Woodhull,
   applied to thoroughly sanitized medical billing information. Adapted by Jim Hurst for iStream Technologies.
 */
'use strict';

// ### Create Chart Objects
// Create chart objects assocated with the container elements identified by the css selector.
var gainOrLossChart = dc.pieChart('#gain-loss-chart');
var dayOfWeekChart = dc.rowChart('#day-of-week-chart');
var yearlyBubbleChart = dc.bubbleChart('#yearly-bubble-chart');

// ### Anchor Div for Charts
/*
// A div anchor that can be identified by id
    <div id='your-chart'></div>
// Title or anything you want to add above the chart
    <div id='chart'><span>Days by Gain or Loss</span></div>
// ##### .turnOnControls()
// If a link with css class 'reset' is present then the chart
// will automatically turn it on/off based on whether there is filter
// set on this chart (slice selection for pie chart and brush
// selection for bar chart). Enable this with `chart.turnOnControls(true)`
     <div id='chart'>
       <a class='reset' href='javascript:myChart.filterAll();dc.redrawAll();' style='display: none;'>reset</a>
     </div>
// dc.js will also automatically inject applied current filter value into
// any html element with css class set to 'filter'
    <div id='chart'>
        <span class='reset' style='display: none;'>Current filter: <span class='filter'></span></span>
    </div>
*/

//### Load data
d3.csv('cptBubble.csv', function (data) {
    /* since its a csv file we need to format the data a bit */
    var dateFormat = d3.time.format('%m/%d/%Y');
    var numberFormat = d3.format('.2f');

    data.forEach(function (d) {
        d.dd = dateFormat.parse(d.date);
        d.month = d3.time.month(d.dd); // pre-calculate month for better performance
        d.billed = +d.billed;
        d.cost = +d.cost;
    });

    //### Create Crossfilter Dimensions and Groups
    //See the [crossfilter API](https://github.com/square/crossfilter/wiki/API-Reference) for reference.
    var ndx = crossfilter(data);
    var all = ndx.groupAll();

    // dimension by year
    var yearlyDimension = ndx.dimension(function (d) {
        //return d3.time.year(d.dd).getFullYear();
        return d.location;
    });
    // maintain running tallies by year as filters are applied or removed
    var yearlyPerformanceGroup = yearlyDimension.group().reduce(
        /* callback for when data is added to the current filter results */
        function (p, v) {
            ++p.count;
            p.absGain += v.billed - v.cost;
            p.fluctuation += Math.abs(v.billed - v.cost);
            p.sumIndex += v.billed - v.cost;
            var utilization = parseFloat(v.utilization);
            var sum = parseFloat(p.sumUtilization);
            p.sumUtilization = sum + utilization;
            if (p.count > 0)
                p.avgUtilization = (p.sumUtilization / p.count) * 100;
            else
                p.avgUtilization = 0;
            p.avgIndex = p.sumIndex / p.count;
            p.percentageGain = (p.absGain / p.avgIndex) * 100;
            p.fluctuationPercentage = (p.fluctuation / p.avgIndex) * 100;
            p.caseCount = p.count;
            return p;
        },
        /* callback for when data is removed from the current filter results */
        function (p, v) {
            --p.count;
            p.absGain -= v.billed - v.cost;
            p.fluctuation -= Math.abs(v.billed - v.cost);
            p.sumIndex -= v.billed - v.cost;
            var utilization = parseFloat(v.utilization);
            var sum = parseFloat(p.sumUtilization);
            p.sumUtilization = sum - utilization;
            if (p.count > 0)
                p.avgUtilization = (p.sumUtilization / p.count) * 100;
            else
                p.avgUtilization = 0;
            p.avgIndex = p.sumIndex / p.count;
            p.percentageGain = (p.absGain / p.avgIndex) * 100;
            p.fluctuationPercentage = (p.fluctuation / p.avgIndex) * 100;
            p.caseCount = p.count;
            return p;
        },
        /* initialize p */
        function () {
            return {
                count: 0,
                absGain: 0,
                fluctuation: 0,
                caseCount: 0,
                sumIndex: 0,
                avgIndex: 0,
                sumUtilization: 0,
                avgUtilization: 0
            };
        }
    );

    // dimension by full date
    var dateDimension = ndx.dimension(function (d) {
        return d.location;
    });

    // dimension by month
    var moveMonths = ndx.dimension(function (d) {
        return d.month;
    });
    // group by total movement within month
    var monthlyMoveGroup = moveMonths.group().reduceSum(function (d) {
        return Math.abs(d.cost - d.billed);
    });
    // group by total volume within move, and scale down result
    var volumeByMonthGroup = moveMonths.group().reduceSum(function (d) {
        return d.volume / 500000;
    });
    var indexAvgByMonthGroup = moveMonths.group().reduce(
        function (p, v) {
            ++p.days;
            p.total += v.billed - v.cost;
            p.avg = Math.round(p.total / p.days);
            return p;
        },
        function (p, v) {
            --p.days;
            p.total -= v.billed - v.cost;
            p.avg = p.days ? Math.round(p.total / p.days) : 0;
            return p;
        },
        function () {
            return {days: 0, total: 0, avg: 0};
        }
    );

    // create categorical dimension
    var gainOrLoss = ndx.dimension(function (d) {
        return d.cost > d.billed ? 'Loss' : 'Gain';
    });
    // produce counts records in the dimension
    var gainOrLossGroup = gainOrLoss.group();

    // determine a histogram of percent changes
    var fluctuation = ndx.dimension(function (d) {
        return Math.round((d.cost - d.billed) / d.billed * 100);
    });
    var fluctuationGroup = fluctuation.group();

    // summerize volume by quarter
    var quarter = ndx.dimension(function (d) {
        var month = d.dd.getMonth();
        if (month <= 2) {
            return 'Q1';
        } else if (month > 2 && month <= 5) {
            return 'Q2';
        } else if (month > 5 && month <= 8) {
            return 'Q3';
        } else {
            return 'Q4';
        }
    });
    var quarterGroup = quarter.group().reduceSum(function (d) {
        return d.volume;
    });

    // counts per weekday
    var dayOfWeek = ndx.dimension(function (d) {
        var day = d.dd.getDay();
        var name = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        return day + '.' + name[day];
    });
    var dayOfWeekGroup = dayOfWeek.group();

    //### Define Chart Attributes
    //Define chart attributes using fluent methods. See the
    // [dc API Reference](https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md) for more information
    //

    //#### Bubble Chart
    //Create a bubble chart and use the given css selector as anchor. You can also specify
    //an optional chart group for this chart to be scoped within. When a chart belongs
    //to a specific group then any interaction with such chart will only trigger redraw
    //on other charts within the same chart group.
    /* dc.bubbleChart('#yearly-bubble-chart', 'chartGroup') */
    yearlyBubbleChart
        .width(990) // (optional) define chart width, :default = 200
        .height(250)  // (optional) define chart height, :default = 200
        .transitionDuration(1500) // (optional) define chart transition duration, :default = 750
        .margins({top: 10, right: 50, bottom: 30, left: 40})
        .dimension(yearlyDimension)
        //Bubble chart expect the groups are reduced to multiple values which would then be used
        //to generate x, y, and radius for each key (bubble) in the group
        .group(yearlyPerformanceGroup)
        .colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
        .colorDomain([-500, 500]) //(optional) define color domain to match your data domain if you want to bind data or
                                  //color
        //##### Accessors
        //Accessor functions are applied to each value returned by the grouping
        //
        //* `.colorAccessor` The returned value will be mapped to an internal scale to determine a fill color
        //* `.keyAccessor` Identifies the `X` value that will be applied against the `.x()` to identify pixel location
        //* `.valueAccessor` Identifies the `Y` value that will be applied agains the `.y()` to identify pixel location
        //* `.radiusValueAccessor` Identifies the value that will be applied agains the `.r()` determine radius size,
        //*     by default this maps linearly to [0,100]
        .colorAccessor(function (d) {
            return d.value.absGain;
        })
        .keyAccessor(function (p) {
            return p.value.absGain;
        })
        .valueAccessor(function (p) {
            //return p.value.percentageGain;
            return p.value.avgUtilization;
        })
        .radiusValueAccessor(function (p) {
            return p.value.caseCount;
        })
        .maxBubbleRelativeSize(0.3)
        .x(d3.scale.linear().domain([-2500, 2500]))
        .y(d3.scale.linear().domain([-100, 100]))
        .r(d3.scale.linear().domain([0, 4000]))
        //##### Elastic Scaling
        //`.elasticX` and `.elasticX` determine whether the chart should rescale each axis to fit data.
        //The `.yAxisPadding` and `.xAxisPadding` add padding to data above and below their max values in the same unit
        //domains as the Accessors.
        .elasticY(true)
        .elasticX(true)
        .yAxisPadding(5)
        .xAxisPadding(500)
        .renderHorizontalGridLines(true) // (optional) render horizontal grid lines, :default=false
        .renderVerticalGridLines(true) // (optional) render vertical grid lines, :default=false
        .xAxisLabel('Total Billed') // (optional) render an axis label below the x axis
        .yAxisLabel('OR Efficiency') // (optional) render a vertical axis lable left of the y axis
        //#### Labels and  Titles
        //Labels are displaed on the chart for each bubble. Titles displayed on mouseover.
        .renderLabel(true) // (optional) whether chart should render labels, :default = true
        .label(function (p) {
            return p.key;
        })
        .renderTitle(true) // (optional) whether chart should render titles, :default = false
        .title(function (p) {
            return [
                p.key,
                'OR Efficiency: ' + numberFormat(p.value.avgUtilization),
                'Total Billed: $' + numberFormat(p.value.absGain),
                'Case Count: ' + p.value.caseCount
            ].join('\n');
        })
        //#### Customize Axis
        //Set a custom tick format. Note `.yAxis()` returns an axis object, so any additional method chaining applies
        //to the axis, not the chart.
        .yAxis().tickFormat(function (v) {
            return v + '%';
        });

    // #### Pie/Donut Chart
    // Create a pie chart and use the given css selector as anchor. You can also specify
    // an optional chart group for this chart to be scoped within. When a chart belongs
    // to a specific group then any interaction with such chart will only trigger redraw
    // on other charts within the same chart group.
    gainOrLossChart
        .width(180) // (optional) define chart width, :default = 200
        .height(180) // (optional) define chart height, :default = 200
        .radius(80) // define pie radius
        .dimension(gainOrLoss) // set dimension
        .group(gainOrLossGroup) // set group
        /* (optional) by default pie chart will use group.key as its label
         * but you can overwrite it with a closure */
        .label(function (d) {
            if (gainOrLossChart.hasFilter() && !gainOrLossChart.hasFilter(d.key)) {
                return d.key + '(0%)';
            }
            var label = d.key;
            if (all.value()) {
                label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
            }
            return label;
        }) /*
        // (optional) whether chart should render labels, :default = true
        .renderLabel(true)
        // (optional) if inner radius is used then a donut chart will be generated instead of pie chart
        .innerRadius(40)
        // (optional) define chart transition duration, :default = 350
        .transitionDuration(500)
        // (optional) define color array for slices
        .colors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        // (optional) define color domain to match your data domain if you want to bind data or color
        .colorDomain([-1750, 1644])
        // (optional) define color value accessor
        .colorAccessor(function(d, i){return d.value;})
        */;

    //#### Row Chart
    
    dayOfWeekChart.width(180)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(dayOfWeekGroup)
        .dimension(dayOfWeek)
        // assign colors to each value in the x scale domain
        .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
        .label(function (d) {
            return d.key.split('.')[1];
        })
        // title sets the row text
        .title(function (d) {
            return d.value;
        })
        .elasticX(true)
        .xAxis().ticks(4);
    
    dc.dataCount('.dc-data-count')
        .dimension(ndx)
        .group(all)
        // (optional) html, for setting different html for some records and all records.
        // .html replaces everything in the anchor with the html given using the following function.
        // %filter-count and %total-count are replaced with the values obtained.
        .html({
            some:'<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
                ' | <a href=\'javascript:dc.filterAll(); dc.renderAll();\'\'>Reset All</a>',
            all:'All records selected. Please click on the graph to apply filters.'
        });

    dc.dataTable('.dc-data-table')
        .dimension(dateDimension)
        // data table does not use crossfilter group but rather a closure
        // as a grouping function
        .group(function (d) {
            var format = d3.format('02d');
            //return d.dd.getFullYear() + '/' + format((d.dd.getMonth() + 1));
            return d.location;  // .getFullYear() + '/' + format((d.dd.getMonth() + 1));
        })
        .size(10) // (optional) max number of records to be shown, :default = 25
        // There are several ways to specify the columns; see the data-table documentation.
        // This code demonstrates generating the column header automatically based on the columns.
        .columns([
            'date',    // d['date'], ie, a field accessor; capitalized automatically
            'billed',    // ...
            'cost',   // ...
            {
                label: 'Change', // desired format of column name 'Change' when used as a label with a function.
                format: function (d) {
                    return numberFormat(d.cost - d.billed);
                }
            },
            'volume'   // d['volume'], ie, a field accessor; capitalized automatically
        ])

        // (optional) sort using the given field, :default = function(d){return d;}
        .sortBy(function (d) {
            return d.location;
        })
        // (optional) sort order, :default ascending
        .order(d3.ascending)
        // (optional) custom renderlet to post-process chart using D3
        .on('renderlet', function (table) {
            table.selectAll('.dc-table-group').classed('info', true);
        });

    //#### Rendering
    //simply call renderAll() to render all charts on the page
    dc.renderAll();

});

//#### Version
//Determine the current version of dc with `dc.version`
d3.selectAll('#version').text(dc.version);
