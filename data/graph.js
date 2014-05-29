/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// Graph Visualization (one of 3 views: graph, clock, and list). This is way
// too heavyweight for mobile right now.

// Visualization of tracking data interconnections

(function (visualizations, global) {
"use strict";

// Bunch of utilities related to UI elements.
const graphNodeRadius = {
  "graph": 12
};

// The graph is an emitter with a default size.
var graph = new Emitter();
visualizations.graph = graph;
graph.name = "graph";
var width = 750,
  height = 750;
var force, vis;
var edges, nodes;

// There are three phases for a visualization life-cycle:
// init does initialization and receives the existing set of connections
// connection notifies of a new connection that matches existing filter
// remove lets the visualization know it is about to be switched out so it can clean up
graph.on('init', onInit);
// graph.on('connection', onConnection);
graph.on('remove', onRemove);
graph.on('reset', onReset);

/* for Highlighting and Colouring -------------------- */

var highlight = {
  visited: true,
  neverVisited: true,
  connections: true,
  cookies: true,
  watched: true,
  blocked: true
};

// Restart the simulation. This is only called when there's a new connection we
// haven't seen before.
function onUpdate() {
  // new nodes, reheat graph simulation
  if (force) {
    // console.log('restarting graph due to update');
    force.stop();
    force.nodes(filteredAggregate.nodes);
    force.links(filteredAggregate.edges);
    force.start();
    updateGraph();
    colourHighlightNodes(highlight);
  } else {
    console.log('the force is not with us');
  }
}

function onInit() {
  // console.log('graph::onInit()');
  // console.log('initializing graph from %s connections', filteredAggregate.nodes.length);
  // Handles all of the panning and scaling.
  vis = d3.select(vizcanvas);
  // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
  // This binds our data to the D3 visualization and sets up the callbacks
  initGraph();
  aggregate.on('update', onUpdate);
  // Differenct visualizations may have different viewBoxes, so make sure we use the right one
  vizcanvas.setAttribute('viewBox', [0, 0, width, height].join(' '));
  // console.log('graph::onInit end');
  document.querySelector(".filter-display").classList.remove("hidden");
}

function onRemove() {
  // var startTime = Date.now();
  if (force) {
    force.stop();
    force = null;
  }
  resetCanvas();
  document.querySelector(".filter-display").classList.add("hidden");
  // console.log('it took %s ms to remove graph view', Date.now() - startTime);
}

function onReset() {
  onRemove();
  aggregate.emit('load', global.allConnections);
}

// UTILITIES FOR CREATING POLYGONS

function point(angle, size) {
  return [Math.round(Math.cos(angle) * size), -Math.round(Math.sin(angle) * size)];
}

function polygon(points, size, debug) {
  var increment = Math.PI * 2 / points;
  var angles = [],
    i;
  for (i = 0; i < points; i++) {
    angles.push(i * increment + Math.PI / 2); // add 90 degrees so first point is up
  }
  return angles.map(function (angle) {
    return point(angle, size);
  });
}

function polygonAsString(points, size) {
  var poly = polygon(points, size);
  return poly.map(function (pair) {
    return pair.join(',');
  }).join(' ');
}

// ACCESSOR FUNCTIONS

// function scaleNode(node){ return 'translate(' + node.x + ',' + node.y + ') scale(' + (1 + .05 * node.weight) + ')'; }
function visited(node) {
  return node.nodeType === 'site' || node.nodeType === 'both';
}

function notVisited(node) {
  return node.nodeType === 'thirdparty';
}
// function timestamp(node){ return node.lastAccess.toISOString(); }
// function nodeHighlight(node){ return ( node.visitedCount > 0 ) ? highlight.highlightVisited : highlight.highlightNeverVisited; }
// function sourceX(edge){ return edge.source.x; }
// function sourceY(edge){ return edge.source.y; }
// function targetX(edge){ return edge.target.x; }
// function targetY(edge){ return edge.target.y; }
// function edgeCookie(edge){ return edge.cookieCount > 0; }
// function edgeHighlight(edge){ return highlight.connections; }
// function edgeColoured(edge){ return edge.cookieCount > 0 && highlight.cookies; }
function nodeName(node) {
  if (node) {
    return node.name;
  }
  return undefined;
}

function siteHasPref(site, pref) {
  return (userSettings.hasOwnProperty(site) &&
    userSettings[site].contains(pref));
}

function watchSite(node) {
  return siteHasPref(node.name, "watch");
}

function blockSite(node) {
  return siteHasPref(node.name, "block");
}

// SET UP D3 HANDLERS

var ticking = false;

function charge(d) {
  return -(500 + d.weight * 25);
}

function colourHighlightNodes(highlight) {
  var i;
  var watchedSites = document.querySelectorAll(".watched");
  var blockedSites = document.querySelectorAll(".blocked");
  if (highlight.watched) {
    for (i = 0; i < watchedSites.length; i++) {
      watchedSites[i].classList.add("watchedSites");
    }
  } else {
    for (i = 0; i < watchedSites.length; i++) {
      watchedSites[i].classList.remove("watchedSites");
    }
  }
  if (highlight.blocked) {
    for (i = 0; i < blockedSites.length; i++) {
      blockedSites[i].classList.add("blockedSites");
    }
  } else {
    for (i = 0; i < blockedSites.length; i++) {
      blockedSites[i].classList.remove("blockedSites");
    }
  }
}

function initGraph() {
  // Initialize D3 layout and bind data
  // console.log('initGraph()');
  force = d3.layout.force()
    .nodes(filteredAggregate.nodes)
    .links(filteredAggregate.edges)
    .charge(charge)
    .size([width, height])
    .start();
  updateGraph();
  colourHighlightNodes(highlight);

  // update method
  var lastUpdate, lastTick;
  lastUpdate = lastTick = Date.now();
  var draws = [];
  var ticks = 0;
  const second = 1000;
  const minute = 60 * second;
  force.on('tick', function ontick(evt) {
    // find a way to report how often tick() is called, and how long it takes to run
    // without trying to console.log() every 5 milliseconds...
    if (ticking) {
      console.log('overlapping tick!');
      return;
    }
    ticking = true;
    var nextTick = Date.now();
    ticks++;
    lastTick = nextTick;
    if ((lastTick - lastUpdate) > second) {
      // console.log('%s ticks per second, each draw takes %s milliseconds', ticks, Math.floor(d3.mean(draws)));
      lastUpdate = lastTick;
      draws = [];
      ticks = 0;
    }
    edges.each(function (d, i) {
      // `this` is the DOM node
      this.setAttribute('x1', d.source.x);
      this.setAttribute('y1', d.source.y);
      this.setAttribute('x2', d.target.x);
      this.setAttribute('y2', d.target.y);
      if (d.cookieCount) {
        this.classList.add('cookieYes');
      } else {
        this.classList.remove('cookieYes');
      }
      if (highlight.connections) {
        this.classList.add('highlighted');
      } else {
        this.classList.remove('highlighted');
      }
      if (d.cookieCount && highlight.cookies) {
        this.classList.add('coloured');
      } else {
        this.classList.remove('coloured');
      }
    });
    nodes.each(function (d, i) {
      // `this` is the DOM node
      this.setAttribute('transform', 'translate(' + d.x + ',' + d.y + ') scale(' + (1 + 0.05 * d.weight) + ')');
      this.setAttribute('data-timestamp', d.lastAccess.toISOString());
      if (d.nodeType === 'site' || d.nodeType === 'both') {
        this.classList.add('visitedYes');
        this.classList.remove('visitedNo');
      } else {
        this.classList.add('visitedNo');
        this.classList.remove('visitedYes');
      }
      if ((d.nodeType === 'site' || d.nodeType === 'both') && highlight.visited) {
        this.classList.add('highlighted');
      } else if ((d.nodeType === 'thirdparty') && highlight.neverVisited) {
        this.classList.add('highlighted');
      } else {
        this.classList.remove('highlighted');
      }
    });
    var endDraw = Date.now();
    draws.push(endDraw - lastTick);
    if (force) {
      nodes.call(force.drag);
    }

    ticking = false;
  });
}

function updateGraph() {
  // console.log('updateGraph()');
  // Data binding for links
  edges = vis.selectAll('.edge')
    .data(filteredAggregate.edges, nodeName);

  edges.enter().insert('line', ':first-child')
    .classed('edge', true);

  edges.exit()
    .remove();

  nodes = vis.selectAll('.node')
    .data(filteredAggregate.nodes, nodeName);


  nodes.enter().append('g')
    .classed('visitedYes', visited)
    .classed('visitedNo', notVisited)
    .classed("watched", watchSite)
    .classed("blocked", blockSite)
    .call(addShape)
    .attr('data-name', nodeName)
    .on('mouseenter', tooltip.show)
    .on('mouseleave', tooltip.hide)
    .classed('node', true);

  nodes.exit()
    .remove();

}

function addFavicon(selection) {
  selection.append("svg:image")
    .attr("class", "favicon")
    .attr("width", "16") // move these to the favicon class in css
  .attr("height", "16")
    .attr("x", "-8") // offset to make 16x16 favicon appear centered
  .attr("y", "-8")
    .attr("xlink:href", function (node) {
      return 'http://' + node.name + '/favicon.ico';
    });
}

function addCircle(selection) {
  selection
    .append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', graphNodeRadius.graph)
    .classed('site', true);
}

function addShape(selection) {
  selection.filter('.visitedYes').call(addCircle).call(addFavicon);
  selection.filter('.visitedNo').call(addTriangle).call(addFavicon);
}

function addTriangle(selection) {
  selection
    .append('polygon')
    .attr('points', polygonAsString(3, 20))
    .attr('data-name', function (node) {
      return node.name;
    });
}



// FIXME: Move this out of visualization so multiple visualizations can use it.
function resetCanvas() {
  // You will still need to remove timer events
  var parent = vizcanvas.parentNode;
  var newcanvas = vizcanvas.cloneNode(false);
  var vizcanvasDefs = document.querySelector(".vizcanvas defs").cloneNode(true);
  newcanvas.appendChild(vizcanvasDefs);
  parent.replaceChild(newcanvas, vizcanvas);
  vizcanvas = newcanvas;
  aggregate.off('update', onUpdate);
}



var graphLegend = document.querySelector(".graph-footer");

function legendBtnClickHandler(legendElm) {
  legendElm.querySelector(".legend-controls").addEventListener("click", function (event) {
    if (event.target.mozMatchesSelector(".btn, .btn *")) {
      var btn = event.target;
      while (btn.mozMatchesSelector('.btn *')) {
        btn = btn.parentElement;
      }
      btn.classList.toggle("active");
    }
  });
}

legendBtnClickHandler(graphLegend);

graphLegend.querySelector(".legend-toggle-visited").addEventListener("click", function (event) {
  var visited = document.querySelectorAll(".visitedYes");
  toggleVizElements(visited, "highlighted");
  highlight.visited = !highlight.visited;
});

graphLegend.querySelector(".legend-toggle-never-visited").addEventListener("click", function (event) {
  var neverVisited = document.querySelectorAll(".visitedNo");
  toggleVizElements(neverVisited, "highlighted");
  highlight.neverVisited = !highlight.neverVisited;
});

graphLegend.querySelector(".legend-toggle-connections").addEventListener("click", function (event) {
  var cookiesConnections = document.querySelectorAll(".edge");
  toggleVizElements(cookiesConnections, "highlighted");
  highlight.connections = !highlight.connections;
});

graphLegend.querySelector(".legend-toggle-cookies").addEventListener("click", function (event) {
  var cookiesConnections = document.querySelectorAll(".cookieYes");
  toggleVizElements(cookiesConnections, "coloured");
  highlight.cookies = !highlight.cookies;
});

graphLegend.querySelector(".legend-toggle-watched").addEventListener("click", function (event) {
  highlight.watched = !highlight.watched;
  colourHighlightNodes(highlight);
});

graphLegend.querySelector(".legend-toggle-blocked").addEventListener("click", function (event) {
  highlight.blocked = !highlight.blocked;
  colourHighlightNodes(highlight);
});


graphLegend.querySelector(".legend-toggle").addEventListener("click", function (event) {
  toggleLegendSection(event.target, graphLegend);
});


})(visualizations, this);
