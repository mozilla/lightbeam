// Graph Visualization

// Visualization of tracking data interconnections

(function(visualizations){
"use strict";


var graph = new Emitter();
visualizations.graph = graph;
graph.name = "graph";
var width = 1000, height = 1000;
var force, vis;

// There are three phases for a visualization life-cycle:
// init does initialization and receives the existing set of connections
// connection notifies of a new connection that matches existing filter
// remove lets the visualization know it is about to be switched out so it can clean up
graph.on('init', onInit);
graph.on('connection', onConnection);
graph.on('remove', onRemove);
graph.on('reset', onReset);

function onInit(){
    console.log("graph::onInit() allConnections.length = %s" , allConnections.length);
    console.log('initializing graph from %s connections', connections.nodes.length);
    vis = d3.select(vizcanvas);
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    // This binds our data to the D3 visualization and sets up the callbacks
    initGraph();
    aggregate.on('updated', function(){
        // new nodes, reheat graph simulation
        if (force){
            force.start();
        }
    });
    // Differenct visualizations may have different viewBoxes, so make sure we use the right one
    vizcanvas.setAttribute('viewBox', [0,0,width,height].join(' '));
    if ( !statsBarInitiated ){  
        updateStatsBar();
    }
    console.log('graph::onInit end');
};

function onConnection(connection){
    console.log("= allConnections.length = %s" , allConnections.length);
    updateGraph();
    if (force){
        force.start();
    }
    updateStatsBar();
}

function onRemove(){
    if (force){
        force.stop();
        force = null;
    }
    resetCanvas();
};

function onReset(){
    updateGraph();
}


// UTILITIES FOR CREATING POLYGONS

function point(angle, size){
	return [Math.round(Math.cos(angle) * size), -Math.round(Math.sin(angle) * size)];
}

function polygon(points, size, debug){
    var increment = Math.PI * 2 / points;
    var angles = [], i;
    for (i = 0; i < points; i++){
        angles.push(i * increment + Math.PI/2); // add 90 degrees so first point is up
    }
    return angles.map(function(angle){ return point(angle, size); });
}

function polygonAsString(points, size){
    var poly = polygon(points, size);
    return poly.map(function(pair){return pair.join(',');}).join(' ');
}

// SET UP D3 HANDLERS

function initGraph(){
    // Initialize D3 layout and bind data
    force = d3.layout.force()
        .nodes(aggregate.nodes)
        .links(aggregate.edges)
        .charge(-500)
        .size([width,height])
        .start();
    updateGraph();

    // update method
    var lastUpdate, lastTick;
    lastUpdate = lastTick = Date.now();
    var draws = [];
    var ticks = [];
    const minute = 60 * 1000;
    force.on('tick', function(){
        // find a way to report how often tick() is called, and how long it takes to run
        // without trying to console.log() every 5 milliseconds...
        var nextTick = Date.now();
        ticks.push(nextTick - lastTick);
        lastTick = nextTick;
        if ((lastUpdate - lastTick) > minute){
            console.log('%s ticks per minute, each draw takes %s milliseconds', ticks.length, d3.mean(draws));
            lastUpdate = lastTick;
            draws = [];
            ticks = [];
        }
        vis.selectAll('.edge')
            .attr('x1', function(edge){ return edge.source.x; })
            .attr('y1', function(edge){ return edge.source.y; })
            .attr('x2', function(edge){ return edge.target.x; })
            .attr('y2', function(edge){ return edge.target.y; })
            .classed('cookieYes', function(edge){ return edge.cookieCount > 0; })
            .classed('highlighted', function(edge){ return highlight.connections; })
            .classed('coloured', function(edge){ return edge.cookieCount > 0 && highlight.cookies; });
        vis.selectAll('.node').call(updateNodes);
        var endDraw = Date.now();
        draws.push(endDraw - lastTick);
    });
}

function updateGraph(){

        // Data binding for links
    var lines = vis.selectAll('.edge')
        .data(filtered.edges, function(edge){ return edge.name; });

    lines.enter().insert('line', ':first-child')
        .classed('edge', true);

    lines.exit()
        .remove();

    var nodes = vis.selectAll('.node')
	    .data(filtered.nodes, function(node){ return node.name; });

    nodes.call(force.drag);

	nodes.enter().append('g')
        .classed('visitedYes', function(node){ return node.visitedCount/node.howMany === 1 })
        .classed('visitedNo', function(node){ return node.visitedCount/node.howMany === 0 })
        .call(addShape)
        .attr('data-name', function(node){ return node.name; })
        .on('mouseenter', tooltip.show)
        .on('mouseleave', tooltip.hide)
        .classed('node', true);

    nodes.exit()
        .remove();

}

window.updategGraph = updateGraph;

function addFavicon(selection){
    selection.append("svg:image")
          .attr("class", "favicon")
          .attr("width", "16") // move these to the favicon class in css
          .attr("height", "16")
          .attr("x", "-8") // offset to make 16x16 favicon appear centered
          .attr("y", "-8")
          .attr("xlink:href", function(node) {return 'http://' + node.name + '/favicon.ico'; } );
}

function addCircle(selection){
    selection
        .append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 12)
        .classed('site', true);
}

function addShape(selection){
    selection.filter('.visitedYes').call(addCircle).call(addFavicon);
    selection.filter('.visitedNo').call(addTriangle).call(addFavicon);
}

function addTriangle(selection){
    selection
        .append('polygon')
	    .attr('points', polygonAsString(3, 20))
        .attr('data-name', function(node){ return node.name; });
}


function updateNodes(thenodes){
    thenodes
	.attr('transform', function(node){ return 'translate(' + node.x + ',' + node.y + ') scale(' + (1 + .05 * node.weight) + ')'; })
    .classed('visitedYes', function(node){ return node.visitedCount > 0 })
    .classed('visitedNo', function(node){ return node.visitedCount == 0 })
    .classed('secureYes', function(node){ return node.secureCount > 0 })
    .classed('secureNo', function(node){ return node.secureCount == 0 })
    .attr('data-timestamp', function(node){ return node.lastAccess.toISOString(); })
    .classed('highlighted', function(edge){ return ( edge.visitedCount > 0 ) ? highlightVisited : highlightNeverVisited; });    // change shape if needed
}

// FIXME: Move this out of visualization so multiple visualizations can use it.
function resetCanvas(){
    // You will still need to remove timer events
    var parent = vizcanvas.parentNode;
    var newcanvas = vizcanvas.cloneNode(false);
    parent.replaceChild(newcanvas, vizcanvas);
    vizcanvas = newcanvas;
}



/* for Highlighting and Colouring -------------------- */

var highlight = {};
highlight.visited = true;
highlight.neverVisited = true;
highlight.connections = true;
highlight.cookies = false;
highlight.watched = false;
highlight.blocked = false;
var graphLegend = document.querySelector(".graph-footer");

legendBtnClickHandler(graphLegend);

graphLegend.querySelector(".legend-toggle-visited").addEventListener("click", function(event){
    var visited = document.querySelectorAll(".visitedYes");
    toggleVizElements(visited,"highlighted");
    highlight.visited = !highlight.visited;
});

graphLegend.querySelector(".legend-toggle-never-visited").addEventListener("click", function(event){
    var neverVisited = document.querySelectorAll(".visitedNo");
    toggleVizElements(neverVisited,"highlighted");
    highlight.neverVisited = !highlight.neverVisited;
});

graphLegend.querySelector(".legend-toggle-connections").addEventListener("click", function(event){
    var cookiesConnections = document.querySelectorAll(".edge");
    toggleVizElements(cookiesConnections,"highlighted");
    highlight.connections = !highlight.connections;
});

graphLegend.querySelector(".legend-toggle-cookies").addEventListener("click", function(event){
    var cookiesConnections = document.querySelectorAll(".cookieYes");
    toggleVizElements(cookiesConnections,"coloured");
    highlight.cookies = !highlight.cookies;
});

graphLegend.querySelector(".legend-toggle-watched").addEventListener("click", function(event){
    var watchedSites = document.querySelectorAll(".watched");
    toggleVizElements(watchedSites,"watchedSites");
    highlight.watched = !highlight.watched;
});

graphLegend.querySelector(".legend-toggle-blocked").addEventListener("click", function(event){
    var blockedSites = document.querySelectorAll(".blocked");
    toggleVizElements(blockedSites,"blockedSites");
    highlight.blocked = !highlight.blocked;
});


graphLegend.querySelector(".legend-toggle").addEventListener("click", function(event){
    toggleLegendSection(event.target,graphLegend);
});


})(visualizations);
