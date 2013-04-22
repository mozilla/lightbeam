// Graph Visualization

// Visualization of tracking data interconnections

(function(visualizations){
"use strict";


var graph = new Emitter();
visualizations.graph = graph;
graph.name = "graph";
var width = 1000, height = 1000;
var force, vizcanvas, vis;

// There are three phases for a visualization life-cycle:
// init does initialization and receives the existing set of connections
// connection notifies of a new connection that matches existing filter
// remove lets the visualization know it is about to be switched out so it can clean up
graph.on('init', onInit);
graph.on('connection', onConnection);
graph.on('remove', onRemove);
graph.on('reset', onReset);

function onInit(connections){
    console.log('initializing graph from %s connections', connections.length);
    vizcanvas = document.querySelector('.vizcanvas');
    vis = d3.select('.vizcanvas');
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    aggregate.emit('load', connections);
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
};

function onConnection(connection){
    aggregate.emit('connection', connection);
    updateGraph();
    if (force){
        force.start();
    }
}

function onRemove(){
    aggregate.emit('reset');
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
        .nodes(aggregate.allnodes)
        .links(aggregate.edges)
        .charge(-500)
        .size([width,height])
        .start();
    updateGraph();

    // update method
    force.on('tick', function(){
        vis.selectAll('.edge')
            .attr('x1', function(edge){ return edge.source.x; })
            .attr('y1', function(edge){ return edge.source.y; })
            .attr('x2', function(edge){ return edge.target.x; })
            .attr('y2', function(edge){ return edge.target.y; });
        vis.selectAll('.node').call(updateNodes);
    });
}

function updateGraph(){

        // Data binding for links
    var lines = vis.selectAll('.edge')
        .data(aggregate.edges, function(edge){ return edge.name; });

    lines.enter().insert('line', ':first-child')
        .classed('edge', true);

    lines.exit()
        .remove();

    var nodes = vis.selectAll('.node')
	    .data(aggregate.allnodes, function(node){ return node.name; });

    nodes.call(force.drag);

	nodes.enter().append('g')
        .classed('visitedYes', function(node){ return node.visitedCount/node.howMany == 1 })
        .classed('visitedNo', function(node){ return node.visitedCount/node.howMany == 0 })
        .classed('visitedBoth', function(node){ return node.visitedCount/node.howMany > 0 && node.visitedCount/node.howMany < 1 })
        .call(addShape)
        .attr('data-name', function(node){ return node.name; })
        .on('mouseenter', tooltip.show)
        .on('mouseleave', tooltip.hide)
        .classed('node', true);



    nodes.exit()
        .remove();

}

window.updategGraph = updateGraph;

function addCircle(selection){
    selection
        .append('circle')
        .attr('cx', 0)
        .attr('cy', 0)
        .attr('r', 12)
        .classed('site', true);
}

function addShape(selection){
    selection.filter('.visitedYes').call(addCircle);
    selection.filter('.visitedNo').call(addTriangle);
    selection.filter('.visitedBoth').call(addSquare);
}

function addTriangle(selection){
    selection
        .append('polygon')
	    .attr('points', polygonAsString(3, 20))
        .attr('data-name', function(node){ return node.name; });
}

function addSquare(selection){
    selection
	    .append('rect')
	    .attr('x', -9)
	    .attr('y', -9)
	    .attr('width', 18)
	    .attr('height', 18);
}


function updateNodes(thenodes){
    thenodes
	.attr('transform', function(node){ return 'translate(' + node.x + ',' + node.y + ') scale(' + (1 + .03 * node.weight) + ')'; })
    .classed('visitedYes', function(node){ return node.visitedCount/node.howMany == 1 })
    .classed('visitedNo', function(node){ return node.visitedCount/node.howMany == 0 })
    .classed('visitedBoth', function(node){ return node.visitedCount/node.howMany > 0 && node.visitedCount/node.howMany < 1 })
    .classed('secureYes', function(node){ return node.secureCount/node.howMany == 1 })
    .classed('secureNo', function(node){ return node.secureCount/node.howMany == 0 })
    .classed('secureBoth', function(node){ return node.secureCount/node.howMany > 0 && node.secureCount/node.howMany < 1 })
    .classed('cookieYes', function(node){ return node.cookieCount/node.howMany == 1 })
    .classed('cookieNo', function(node){ return node.cookieCount/node.howMany == 0 })
    .classed('cookieBoth', function(node){ return node.cookieCount/node.howMany > 0 && node.cookieCount/node.howMany < 1 })
    .attr('data-timestamp', function(node){ return node.lastAccess.toISOString(); })
    .attr('visited-scale', function(node){ return node.visitedCount/node.howMany; })
    .attr('secure-scale', function(node){ return node.secureCount/node.howMany; })
    .attr('cookie-scale', function(node){ return node.cookieCount/node.howMany; })
    .style('fill', function(node){
        // sites: #6CB4F9 rgb(108,180,249)
        // third-party: #E73547 rgb(231,53,71)
        var visitedRatio = node.visitedCount/node.howMany;
        var red = parseInt( visitedRatio * (108-231) ) + 231;
        var green = parseInt( visitedRatio * (180-53) ) + 53;
        var blue = parseInt( visitedRatio * (249-71) ) + 71;
        //console.log("rgba(%d,%d,%d,1)", red, green, blue);
        return "rgba(" + red + "," + green + "," + blue + "," + "1)";
    });
    // change shape if needed
}

// FIXME: Move this out of visualization so multiple visualizations can use it.
function resetCanvas(){
    // You will still need to remove timer events
    var parent = vizcanvas.parentNode;
    var newcanvas = vizcanvas.cloneNode(false);
    parent.replaceChild(newcanvas, vizcanvas);
    vizcanvas = newcanvas;
}


})(visualizations);
