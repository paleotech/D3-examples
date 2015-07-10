/*
    hourHeatmap.js: an example of Data Driven Documents
    This file is an adapatation of original work by Trulia.com, using Michael Bostock's D3.js libraries.
    Adapted to display surgical scheduling information by Jim Hurst.
*/
'use strict';

/* jshint globalstrict: true */
/* global dc,d3,crossfilter,colorbrewer */

var browser = BrowserDetect;

var formatTime = d3.time.format("%e %B");
var thisState = 'all';
var hospNames = ['Mary Black', 'Pardee', 'Person', 'Other', 'Wilson', 'Cumberland', 'Randolph', 'Central Piedmont', 'Newberry', 'Gaffney', 'Maria Parham', 'Northern', 'Clinch Valley', 'Raleigh General', 'Colleton', 'Southern Tennessee'];

var buckets = 11,
    colorScheme = 'rbow2',
    days = [
        { name: 'Sunday', abbr: 'Su' },
        { name: 'Monday', abbr: 'Mo' },
        { name: 'Tuesday', abbr: 'Tu' },
        { name: 'Wednesday', abbr: 'We' },
        { name: 'Thursday', abbr: 'Th' },
        { name: 'Friday', abbr: 'Fr' },
        { name: 'Saturday', abbr: 'Sa' }
    ],
    types = {
        all: 'All',
        pc: 'Computer',
        mob: 'Mobile'
    },
    hours = ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'],
    states = {
        all: { name: 'All States', abbr: 'all', offset: 0 },
        AK: { name: 'Alaska', abbr: 'AK', offset: -1 }
    };
    
var data;
var hospitalChart = dc.rowChart('#hospital-chart');
//var dayOfWeekChart = dc.rowChart('#day-of-week-chart');

/*    createMap(); */
/*addStateButtons(); */

d3.select('#vis').classed(colorScheme, true);

d3.json('hourHeatmap.json', function(json) {
    
    data = json;
    var ndx = crossfilter(data);
    var all = ndx.groupAll();
  
    createTiles('all');
    reColorTiles('all');

        // Hospital selection bar chart
        // counts per weekday
        var hospital = ndx.dimension(function (d) {
          var facility = d;
          var name = ['Mary Black', 'Pardee', 'Person', 'Other', 'Wilson', 'Cumberland', 'Randolph', 'Central Piedmont', 'Newberry', 'Gaffney', 'Maria Parham', 'Northern', 'Clinch Valley', 'Raleigh General', 'Colleton', 'Southern Tennessee'];
          return d + '.' + name[d];
           });
        var hospitalGroup = hospital.group();
	
        hospitalChart.width(380)
          .height(180)
          .margins({top: 20, left: 10, right: 10, bottom: 20})
          .group(hospitalGroup)
          .dimension(hospital)
          // assign colors to each value in the x scale domain
          .ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb', '#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb', '#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb', '#3182bd'])
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

    // State map click events
    d3.selectAll('#map path.state').on('click', function() {
        var $sel = d3.select('path.state.sel'),
            prevState, currState;
                
        if ($sel.empty()) {
            prevState = '';
        } else {
            prevState = $sel.attr('id');
        }
        
        currState = d3.select(this).attr('id');
        
        if (prevState !== currState) {
            var type = d3.select('#type label.sel span').attr('class');
            reColorTiles(currState);
            drawMobilePie(currState);
        }
        
        d3.selectAll('#map path.state').classed('sel', false);
        d3.select(this).classed('sel', true);
        d3.select('#show_all_states').classed('sel', false);
        d3.select('#wtf h2').html(states[currState].name);
        d3.select('fieldset#state label.sel').classed('sel', false);
        d3.select('fieldset#state label[for="state_' + currState + '"]').classed('sel', true);
    });
    
    // All, PC, Mobile control event listener
    $('input[name="type"]').change(function() {
        
        var type = $(this).val(),
            $sel = d3.select('#map path.state.sel');
        
        d3.selectAll('fieldset#type label').classed('sel', false);
        d3.select('label[for="type_' + type + '"]').classed('sel', true);
        
        if ($sel.empty()) {
            var state = 'all';
        } else {
            var state = $sel.attr('id');
        }
        
        reColorTiles(state);
        d3.select('#total').attr('class', type);
        
        var type = types[selectedType()];
        d3.select('#wtf .subtitle').html(type  + ' traffic daily');
    });
    
    // All States click
    $('label[for="state_all"]').click(function() {
        
        d3.selectAll('fieldset#state label').classed('sel', false);
        $(this).addClass('sel');
        var type = d3.select('input[name="type"]').property('value');
        
        d3.selectAll('#map path.state').classed('sel', false);
        
        reColorTiles('all');
        drawMobilePie('all');
        
        d3.select('#wtf h2').html('All States');
    });
    
    // Text States list event listener
    $('input[name="state"]').change(function() {
        
        var state = $(this).val(),
            type = d3.select('input[name="type"]').property('value');
        
        d3.selectAll('fieldset#state label').classed('sel', false);
        d3.select('label[for="state_' + state + '"]').classed('sel', true);
        
        reColorTiles(state);
    });

    // tiles mouseover events
    $('#tiles td').hover(function() {
    
        $(this).addClass('sel');
        
        var tmp = $(this).attr('id').split('d').join('').split('h'),
            day = parseInt(tmp[0]),
            hour = parseInt(tmp[1]);
        var $sel = d3.select('#map path.state.sel');
        
        if ($sel.empty()) {
            var state = 'all';
        } else {
            var state = $sel.attr('id');
        }
        
        var view = 'all';
        
	// titles
	var hourIndex = day * 24 + hour;
  	var val = data[state][hourIndex];
	var thePercent = data[state][hourIndex] / 52724;
        var val = data[state][hourIndex];
        var theTitle = days[day].abbr + ' @ ' + hour + '00:' + val + ' cases (' + thePercent + ')';

        if (isOldBrowser() === false) {
            drawHourlyChart(state, day);
            selectHourlyChartBar(hour);
        }
        
        var type = types[selectedType()];
        d3.select('#wtf .subtitle').html(type  + ' traffic on ' + days[day].name + 's');
  
    }, function() {
        
        $(this).removeClass('sel');
        
        var $sel = d3.select('#map path.state.sel');
        
        if ($sel.empty()) {
            var state = 'all';
        } else {
            var state = $sel.attr('id');
        }
        if (isOldBrowser() === false) {
            drawHourlyChart(state, 3);
        }
        var type = types[selectedType()];
        d3.select('#wtf .subtitle').html(type  + ' traffic daily');
    });
    // tiles click events
    $('#tiles td').click(function() {
   
       // First, hide any existing popover
       var hideAllPopovers = function() {
	        $('.popup-marker').each(function() {
		              $(this).popover('hide');
			              });  
		    };

        $(this).addClass('sel');
        
        var tmp = $(this).attr('id').split('d').join('').split('h'),
            day = parseInt(tmp[0]),
            hour = parseInt(tmp[1]);
        var $sel = d3.select('#map path.state.sel');
        
        if ($sel.empty()) {
            var state = 'all';
        } else {
            var state = $sel.attr('id');
        }
        
        var view = 'all';
        
	// titles
	var theName = 'all';
	if (thisState != "all")
	  theName = hospNames[thisState];
	var hourIndex = day * 24 + hour;
	var thePercent = (data[thisState][hourIndex] / 527.24).toFixed(2);
        var val = data[thisState][hourIndex];
        var thisTitle = 'OR Utilization for '+ theName + ' for ' + days[day].name + ' @ ' + hour + '00';
	var theContent = days[day].name + ' @ ' + hour + '00: ' + val + ' cases (' + thePercent + ' % of total)';

	$('#tiles td').popover('destroy').popover({
		    html:true,
		    placement:'left',
		    trigger:'click',
		    title:thisTitle,
		    content:'<p>'+theContent+'</p>'
		  });
        } );
     
        // Render the DC chart
        dc.renderAll();
});

function isOldBrowser() {

    var result = false;
    if (browser.browser === 'Explorer' && browser.version < 9) {
        result = true;
    } else if (browser.browser === 'Firefox' && browser.version < 4) {
        result = true;
    }
    
    //console.log(result);
    
    return result;
}

function selectedType() {
    
    //return d3.select('input[name="type"]:checked').property('value'); // IE8 doesn't like this
    return $('input[name="type"]:checked').val();
}

function getCalcs(state) 
{
    var min = 1, max = -1;
    // calculate min + max
        var theLength = Object.keys(data[state]).length;
    for (var d = 0; d < theLength; d++) {
      var tot = data[state][d];
      if (tot > max) {
        max = tot;
        }
          if (tot < min) {
        min = tot;
      }
    }
    return {'min': min, 'max': max};
};

function reColorTiles(state) {
    if (state == null)
      state = 'all';    
    var calcs = getCalcs(state),
        range = [];
    
    for (var i = 1; i <= buckets; i++) {
        range.push(i);
    }
    
    var bucket = d3.scale.quantize().domain([0, calcs.max > 0 ? calcs.max : 1]).range(range),
        side = d3.select('#tiles').attr('class');
    
    
    if (side === 'front') {
        side = 'back';
    } else {
        side = 'front';
    }
    
    var theLength = Object.keys(data[state]).length;
    for (var d = 0; d < theLength; d++) {
            var day = parseInt(d / 24);
            var h = d % 24;
            var sel = '#d' + day + 'h' + h + ' .tile .' + side,
                val = (data[state][d]);
            
            //if (view !== 'all') {
            //    val = data[state][d];
            //}
            
            // erase all previous bucket designations on this cell
            for (var i = 1; i <= buckets; i++) {
                var cls = 'q' + i + '-' + buckets;
                d3.select(sel).classed(cls , false);
            }
            
            // set new bucket designation for this cell
            var cls = 'q' + (val > 0 ? bucket(val) : 0) + '-' + buckets;
            d3.select(sel).classed(cls, true);
    }
    flipTiles();
    if (isOldBrowser() === false) {
        drawHourlyChart(state, 3);
    }
}

function flipTiles() {

    var oldSide = d3.select('#tiles').attr('class'),
        newSide = '';
    
    if (oldSide == 'front') {
        newSide = 'back';
    } else {
        newSide = 'front';
    }
    
    var flipper = function(h, d, side) {
        return function() {
            var sel = '#d' + d + 'h' + h + ' .tile',
                rotateY = 'rotateY(180deg)';
            
            if (side === 'back') {
                rotateY = 'rotateY(0deg)';    
            }
            if (browser.browser === 'Safari' || browser.browser === 'Chrome') {
                d3.select(sel).style('-webkit-transform', rotateY);
            } else {
                d3.select(sel).select('.' + oldSide).classed('hidden', true);
                d3.select(sel).select('.' + newSide).classed('hidden', false);
            }
                
        };
    };
    
    for (var h = 0; h < hours.length; h++) {
        for (var d = 0; d < days.length; d++) {
            var side = d3.select('#tiles').attr('class');
            setTimeout(flipper(h, d, side), (h * 20) + (d * 20) + (Math.random() * 100));
        }
    }
    d3.select('#tiles').attr('class', newSide);
}

function drawHourlyChart(state, day) {
    
    d3.selectAll('#hourly_values svg').remove();
    
    var w = 300,
        h = 150;
    
    //var weeklyData = data[state].cases[day],
    //    view = d3.select('#type label.sel span').attr('class');
        
        
    //var y = d3.scale.linear()
    //    .domain([0, d3.max(weeklyData, function(d) { return (view === 'all') ? d.pc : d[view] })])
    //    .range([0, h]);

    
    var chart = d3.select('#hourly_values .svg')
        .append('svg:svg')
        .attr('class', 'chart')
        .attr('width', 300)
        .attr('height', 170);
        
    var rect = chart.selectAll('rect'),
        text = chart.selectAll('text');
    
    //rect.data(weeklyData)
    //    .enter()
    //        .append('svg:rect')
    //            .attr('x', function(d, i) { return i * 12; })
    //            .attr('y', function(d) { return (view === 'all') ? h - y(d.pc ) : h - y(d[view]) })
    //            .attr('height', function(d) { return (view === 'all') ? y(d.pc ) : y(d[view]) })
    //            .attr('width', 10)
    //            .attr('class', function(d, i) { return 'hr' + i});
    
    text.data(hours)
        .enter()
            .append('svg:text')
                .attr('class', function(d, i) { return (i % 3) ? 'hidden hr' + i : 'visible hr' + i })
                .attr("x", function(d, i) { return i * 12 })
                .attr("y", 166)
                .attr("text-anchor", 'left')
                .text(String);
}

function drawMobilePie(state) {

    var w = 150,
        h = 150,
        r = Math.min(w, h) / 2,
        pieData = [1, data[state].total],
        pie = d3.layout.pie(),
        arc = d3.svg.arc().innerRadius(0).outerRadius(r),
        type = selectedType();
    
    d3.select('#total').attr('class', type);
    d3.selectAll('#total svg').remove();
    
    var chart = d3.select("#total .svg").append('svg:svg')
        .data([pieData])
        .attr("width", w)
        .attr("height", h);
    
    var arcs = chart.selectAll('g')
        .data(pie)
        .enter().append('svg:g')
            .attr("transform", "translate(" + r + "," + r + ")");
    
    arcs.append('svg:path')
        .attr('d', arc)
        .attr('class', function(d, i) { return i === 0 ? 'mob' : 'pc' });
    
    var rawMobPercent = 100 / (data[state].total + 1);
    
    if (rawMobPercent < 1) {
        var mobPercent = '< 1',
            pcPercent = '> 99';
    } else {
        var mobPercent = Math.round(rawMobPercent),
            pcPercent = 100 - mobPercent;
    }
    
    d3.select('#total .pc span').html(pcPercent + '%');
    d3.select('#total .mob span').html(mobPercent + '%');
    
    var html = d3.select('#total ul').html();
    d3.select('#ie8_percents').html(html);
}

function createTiles(state) {

    var html = '<table id="tiles" class="front">';

    html += '<tr><th><div>&nbsp;</div></th>';

    for (var h = 0; h < hours.length; h++) {
        html += '<th class="h' + h + '">' + hours[h] + '</th>';
    }
    
    html += '</tr>';

    for (var d = 0; d < days.length; d++) {
        html += '<tr class="d' + d + '">';
        html += '<th>' + days[d].abbr + '</th>';
        for (var h = 0; h < hours.length; h++) {
	  //var hourIndex = d * 24 + h;
	  //var val = data[state][hourIndex];
	  //var thePercent = (data[state][hourIndex] / 527.24).toFixed(2);
	  //var val = data[state][hourIndex];
	  //var theTitle = days[d].abbr + ' @ ' + h + '00: ' + val + ' cases (' + thePercent + ' % of total)';
          //html += '<td id="d' + d + 'h' + h + '" class="d' + d + ' h' + h + '" title="' + theTitle + '"><div class="tile"><div class="face front"></div><div class="face back"></div></div></td>';
          html += '<td id="d' + d + 'h' + h + '" class="d' + d + ' h' + h + '"><div class="tile"><div class="face front"></div><div class="face back"></div></div></td>';
        }
        html += '</tr>';
    }
    
    html += '</table>';
    d3.select('#vis').html(html);
}

function selectHourlyChartBar(hour) {

    d3.selectAll('#hourly_values .chart rect').classed('sel', false);
    d3.selectAll('#hourly_values .chart rect.hr' + hour).classed('sel', true);
    
    d3.selectAll('#hourly_values .chart text').classed('hidden', true);
    d3.selectAll('#hourly_values .chart text.hr' + hour).classed('hidden', false);

};

var reloadData = function() {
  var chooseFacility = document.getElementById('chooseFacility').selectedOptions[0].value;
  var state;
  if (chooseFacility == 'all')
  {
    state = 'all';
  }
  else
  {
    state = chooseFacility;
  }
  thisState = state;
  reColorTiles(state);
}
