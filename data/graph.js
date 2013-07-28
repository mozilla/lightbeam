// Graph Visualization

// Visualization of tracking data interconnections

(function(visualizations){
"use strict";


var graph = new Emitter();
visualizations.graph = graph;
graph.name = "graph";
var width = 1000, height = 1000;
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

function onInit(){
    console.log('initializing graph from %s connections', filteredAggregate.nodes.length);
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

// function onConnection(connection){
//     console.log("= allConnections.length = %s" , allConnections.length);
//     updateGraph();
//     if (force){
//         force.start();
//     }
//     updateStatsBar();
// }

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

// ACCESSOR FUNCTIONS

function scaleNode(node){ return 'translate(' + node.x + ',' + node.y + ') scale(' + (1 + .05 * node.weight) + ')'; }
function visited(node){ return !!node.visitedCount; }
function notVisited(node){ return !node.visitedCount; }
function timestamp(node){ return node.lastAccess.toISOString(); }
function nodeHighlight(node){ return ( node.visitedCount > 0 ) ? highlight.highlightVisited : highlight.highlightNeverVisited; }
function sourceX(edge){ return edge.source.x; }
function sourceY(edge){ return edge.source.y; }
function targetX(edge){ return edge.target.x; }
function targetY(edge){ return edge.target.y; }
function edgeCookie(edge){ return edge.cookieCount > 0; }
function edgeHighlight(edge){ return highlight.connections; }
function edgeColoured(edge){ return edge.cookieCount > 0 && highlight.cookies; }
function nodeName(node){ return node.name; }

// SET UP D3 HANDLERS

var ticking = false;

function initGraph(){
    // Initialize D3 layout and bind data
    console.log('initGraph()');
    force = d3.layout.force()
        .nodes(filteredAggregate.nodes)
        .links(filteredAggregate.edges)
        .charge(-500)
        .alpha(0.01)
        .size([width,height])
        .start();
    updateGraph();

    // update method
    var lastUpdate, lastTick;
    lastUpdate = lastTick = Date.now();
    var draws = [];
    var ticks = 0;
    const second = 1000;
    const minute = 60 * second;
    force.on('tick', function ontick(evt){
        // find a way to report how often tick() is called, and how long it takes to run
        // without trying to console.log() every 5 milliseconds...
        if (ticking){
            console.log('overlapping tick!');
            return;
        }
        ticking = true;
        var nextTick = Date.now();
        ticks++;
        lastTick = nextTick;
        if ((lastTick - lastUpdate) > second){
            console.log('%s ticks per second, each draw takes %s milliseconds', ticks, d3.mean(draws));
            lastUpdate = lastTick;
            draws = [];
            ticks = 0;
        }
        edges
            .attr('x1', sourceX )
            .attr('y1', sourceY )
            .attr('x2', targetX )
            .attr('y2', targetY )
            .classed('cookieYes', edgeCookie )
            .classed('highlighted', edgeHighlight )
            .classed('coloured', edgeColoured );
        nodes
            .attr('transform', scaleNode)
            .classed('visitedYes', visited)
            .classed('visitedNo', notVisited)
            .attr('data-timestamp', timestamp)
            .classed('highlighted', nodeHighlight);

        var endDraw = Date.now();
        draws.push(endDraw - lastTick);
        nodes.call(force.drag);

        ticking = false;
    });
}

function updateGraph(){
    console.log('updateGraph()');
        // Data binding for links
    edges = vis.selectAll('.edge')
        .data(filteredAggregate.edges, nodeName );

    edges.enter().insert('line', ':first-child')
        .classed('edge', true);

    edges.exit()
        .remove();

    nodes = vis.selectAll('.node')
	    .data(filteredAggregate.nodes, nodeName );


	nodes.enter().append('g')
        .classed('visitedYes', visited )
        .classed('visitedNo', notVisited)
        .call(addShape)
        .attr('data-name', nodeName)
        .on('mouseenter', tooltip.show)
        .on('mouseleave', tooltip.hide)
        .classed('node', true);

    nodes.exit()
        .remove();

}

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
