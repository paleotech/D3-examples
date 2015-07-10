// This is an example of a force directed bubble chart, using Michael Bostock's amazing D3.js libraries.
// Adapted by Jim Hurst of iStream Technologies.
var BubbleChart, root, domain,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

BubbleChart = (function() {
  function BubbleChart(data) {
    
    this.on_tick = bind(this.on_tick, this);
    this.hide_details = bind(this.hide_details, this);
    this.show_details = bind(this.show_details, this);
    this.hide_years = bind(this.hide_years, this);
    //this.move_towards_center = bind(this.move_towards_center, this);

    this.move_towards_center = bind(this.move_towards_center, this);
    this.move_arranged = bind(this.move_arranged, this);
    this.domain = domain != null ? domain : d3.range(-200, 600, 200);
    this.map_group = d3.scale.quantize().domain(this.domain).range([4, 3, 2, 1, 0, -1, -2, -3, -4]);

    this.display_group_all = bind(this.display_group_all, this);
    this.start = bind(this.start, this);
    this.create_vis = bind(this.create_vis, this);
    this.create_nodes = bind(this.create_nodes, this);
    var max_amount;
    this.data = data;
    this.width = 940;
    this.height = 700;
    this.tooltip = CustomTooltip("gates_tooltip", 240);
    this.center = {
      x: this.width / 2,
      y: this.height / 2
    };
    this.year_centers = {
      "2008": {
        x: this.width / 3,
        y: this.height / 2
      },
      "2009": {
        x: this.width / 2,
        y: this.height / 2
      },
      "2010": {
        x: 2 * this.width / 3,
        y: this.height / 2
      }
    };
    this.layout_gravity = -0.01;
    this.damper = 0.1;
    this.vis = null;
    this.nodes = [];
    this.force = null;
    this.circles = null;
    this.fill_color = d3.scale.quantize().range(colorbrewer.Spectral[8]).domain([-100, 400]);
    max_amount = d3.max(this.data, function(d) {
      return parseInt(d.casecount);
    });
    this.radius_scale = d3.scale.pow().exponent(0.5).domain([0, max_amount]).range([2, 85]);
    this.create_nodes();
    this.create_vis();
  }

  BubbleChart.prototype.create_nodes = function() {
    this.data.forEach((function(_this) {
      return function(d) {
        var node;
        node = {
          id: d.id,
          radius: _this.radius_scale(parseInt(d.casecount)),
          value: d.casecount,
          name: d.label,
          group: d.group,
          code: d.code,
          net_profit: d.net_profit,
          year: d.start_year,
          x: Math.random() * 900,
          y: Math.random() * 900 + d.net_profit * 8
          //y: Math.random() * 800
        };
        return _this.nodes.push(node);
      };
    })(this));
    return this.nodes.sort(function(a, b) {
      return b.value - a.value;
    });
  };

  BubbleChart.prototype.create_vis = function() {
    var that;
    this.vis = d3.select("#vis").append("svg").attr("width", this.width).attr("height", this.height).attr("id", "svg_vis");
    this.circles = this.vis.selectAll("circle").data(this.nodes, function(d) {
      return d.id;
    });
    that = this;
    this.circles.enter().append("circle").attr("r", 0).attr("fill", (function(_this) {
      return function(d) {
        return _this.fill_color(d.net_profit);
      };
    })(this)).attr("stroke", (function(_this) {
      return function(d) {
        return d3.rgb(_this.fill_color(d.net_profit)).darker();
      };
    })(this)).attr("stroke-width", 2).attr("id", function(d) {
      return "bubble_" + d.id;
    }).on("mouseover", function(d, i) {
      return that.show_details(d, i, this);
    }).on("mouseout", function(d, i) {
      return that.hide_details(d, i, this);
    });
    return this.circles.transition().duration(50).attr("r", function(d) {
      return d.radius;
    });
  };

  BubbleChart.prototype.charge = function(d) {
    return -Math.pow(d.radius, 2.0) / 4;
    //return -(Math.pow(d.radius, 2.0) * d.net_profit * 0.01) / 8;
  };

  BubbleChart.prototype.start = function() {
    return this.force = d3.layout.force().nodes(this.nodes).size([this.width, this.height]);
  };

  BubbleChart.prototype.display_group_all = function() {
    this.force.gravity(this.layout_gravity).charge(this.charge).friction(0.9).on("tick", (function(_this) {
      return function(e) {
        return _this.circles.each(_this.move_towards_center(e.alpha)).attr("cx", function(d) {
          return d.x;
        }).attr("cy", function(d) {
          return d.y;
        });
      };
    })(this));
    this.force.start();
    return this.hide_years();
  };

    BubbleChart.prototype.move_arranged = function(alpha, slowdown) {
      var _this = this;

      return function(d) {
        var targetY;

        targetY = _this.center.y - (_this.map_group(d.group) / 8) * _this.boundingRadius;
        return d.y = d.y + (targetY - d.y + 30) * alpha * alpha * alpha * alpha * 180;
      };
    };

  BubbleChart.prototype.move_towards_center = function(alpha, slowdown) {
      var _this = this;

      return function(d) {
        d.x = d.x + (_this.center.x - d.x) * _this.damper * alpha * 2.0;
        return d.y = d.y + (_this.center.y - d.y + 50) * _this.damper * alpha * 3.5 - d.net_profit * 0.0010;
      };
    };

  BubbleChart.prototype.hide_years = function() {
    var years;
    return years = this.vis.selectAll(".years").remove();
  };

  BubbleChart.prototype.show_details = function(data, i, element) {
    var content;
    d3.select(element).attr("stroke", "black");
    content = "<span class=\"name\">Procedure:</span><span class=\"value\"> " + data.name + "</span><br/>";
    content += "<span class=\"name\">Net:</span><span class=\"value\"> $" + (addCommas(data.net_profit)) + "</span><br/>";
    content += "<span class=\"name\">CPT Code:</span><span class=\"value\"> " + data.code + "</span><br/>";
    content += "<span class=\"name\">Case Count:</span><span class=\"value\"> " + data.value + "</span>";
    return this.tooltip.showTooltip(content, d3.event);
  };

  BubbleChart.prototype.hide_details = function(data, i, element) {
    d3.select(element).attr("stroke", (function(_this) {
      return function(d) {
        return d3.rgb(_this.fill_color(d.net_profit)).darker();
      };
    })(this));
    return this.tooltip.hideTooltip();
  };

  BubbleChart.prototype.on_tick = function(move, e, circles) {
      return circles.each(this.move_towards_center(e.alpha)).each(this.move_arranged(e.alpha)).attr("cx", function(d) {
        return d.x;
      }).attr("cy", function(d) {
        return d.y;
      });
    };

  return BubbleChart;

})();

root = typeof exports !== "undefined" && exports !== null ? exports : this;

$(function() {
  var chart, render_vis;
  chart = null;
  render_vis = function(csv) {
    chart = new BubbleChart(csv);
    chart.start();
    return root.display_all();
  };
  root.display_all = (function(_this) {
    return function() {
      return chart.display_group_all();
    };
  })(this);
  root.toggle_view = (function(_this) {
    return function(view_type) {
      return root.display_all();
    };
  })(this);
  return d3.csv("cptFinancial.csv", render_vis);
});
