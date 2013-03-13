// Graph Visualization

// Visualization of tracking data interconnections

(function(visualizations){
"use strict";


var graph = new Emitter();
visualizations.graph = graph;
var vizcanvas = document.querySelector('.vizcanvas');
var vis = d3.select('.vizcanvas');
var width = 1000, height = 1000;
var force;

// Should we separate source nodes and target nodes?
var nodemap = {};
var nodes = [];
var edgemap = {};
var edges = [];

graph.on('connection', onConnection);
graph.on('init', function(connections){
    // draw any background
    // massage data for visualization
    // initialize layout
    console.log('visualizing %s connections from the last 24 hours', connections.length);
    connections.forEach(function(connection){
        onConnection(connection, false);
    });
    initGraph();
    console.log('visualizing %s nodes and %s edges', nodes.length, edges.length);
    vizcanvas.setAttribute('viewBox', [0,0,width,height].join(' '));
});

function initGraph(){
    force = d3.layout.force()
        .nodes(nodes)
        .links(edges)
        .charge(-500)
        .size([width,height])
        .start();

        // Data binding for links
        var lines = vis.selectAll('.edge')
            .data(edges, function(d){ return d.name; });

        lines.enter()
            .insert('line', ':first-child')
            .classed('edge', true);

        lines.exit()
            .remove();

        var circles = vis.selectAll('.node')
            .call(force.drag)
            .data(nodes, function(d){ return d.name; });

        circles.enter()
            .append('circle')
            .classed('node', true)
            .attr('title', function(d){ return d.name; })
            .attr('data-target', function(d){ return d.target; })
            .attr('data-source', function(d){ return d.source; });

        circles.exit()
            .remove();

        // update method
        force.on('tick', function(){
            lines
                .attr('x1', function(d){ return d.source.x; })
                .attr('y1', function(d){ return d.source.y; })
                .attr('x2', function(d){ return d.target.x; })
                .attr('y2', function(d){ return d.target.y; });

            circles
                .attr('cx', function(d){ return d.x; })
                .attr('cy', function(d){ return d.y; })
                .attr('r', function(d){ return d.linkedTo.length + d.linkedFrom.length + 12; })
                .classed('visitedYes', function(d){ return d.visited && !d.notVisited; })
                .classed('visitedNo', function(d){ return !d.visited && d.notVisited; })
                .classed('visitedBoth', function(d){ return d.visited && d.notVisited; })
                .classed('secureYes', function(d){ return d.secure && !d.notSecure; })
                .classed('secureNo', function(d){ return !d.secure && d.notSecure; })
                .classed('secureBoth', function(d){ return d.secure && d.notSecure; })
                .classed('cookieYes', function(d){ return d.cookie && !d.notCookie; })
                .classed('cookieNo', function(d){ return !d.cookie && d.notCookie; })
                .classed('cookieBoth', function(d){ return d.cookie && d.notCookie; })
                .attr('data-timestamp', function(d){ return d.lastAccess.toISOString(); });
        });
        // Expose globally for debugging
        window.force = force;
}

function GraphEdge(source, target){
    this.source = source;
    this.target = target;
    this.name = source.name + '->' + target.name;
}
GraphEdge.prototype.lastAccess = function(){
    return (this.source.lastAccess > this.target.lastAccess) ? this.source.lastAccess : this.target.lastAccess;
}
GraphEdge.prototype.firstAccess = function(){
    return (this.source.firstAccess < this.target.firstAccess) ? this.source.firstAccess : this.target.firstAccess;
}

function GraphNode(){
}
GraphNode.prototype.updateSource = function(connection){
    if (connection.timestamp > this.lastAccess){
        this.lastAccess = connection.timestamp;
    }
    if (connection.timestamp < this.firstAccess){
        this.firstAccess = connection.timestamp;
    }
    if (this.linkedTo.indexOf(connection.target) < 0){
        this.linkedTo.push(connection.target);
    }
    if (this.contentTypes.indexOf(connection.contentType) < 0){
        this.contentTypes.push(connection.contentType);
    }
    this.cookie = this.cookie || connection.cookie;
    this.notCookie = this.notCookie || !connection.cookie;
    this.visited = this.visited || connection.visited;
    this.notVisited = this.notVisited || !connection.visited;
    this.secure = this.secure || connection.secure;
    this.notSecure = this.secure || !connection.visited;
    this.howMany++;
};
GraphNode.prototype.updateTarget = function(connection){
    if (connection.timestamp > this.lastAccess){
        this.lastAccess = connection.timestamp;
    }
    if (connection.timestamp < this.firstAccess){
        this.firstAccess = connection.timestamp;
    }
    if (this.linkedFrom.indexOf(connection.target) < 0){
        this.linkedFrom.push(connection.target);
    }
    if (this.contentTypes.indexOf(connection.contentType) < 0){
        this.contentTypes.push(connection.contentType);
    }
    this.cookie = this.cookie || connection.cookie;
    this.notCookie = this.notCookie || !connection.cookie;
    this.visited = this.visited || connection.visited;
    this.notVisited = this.notVisited || !connection.visited;
    this.secure = this.secure || connection.secure;
    this.notSecure = this.secure || !connection.visited;
    this.howMany++;
};

function SourceNode(connection){
    this.name = connection.source;
    this.firstAccess = this.lastAccess = connection.timestamp;
    this.linkedFrom = [];
    this.linkedTo = [connection.target];
    this.contentTypes = [connection.contentType];
    this.cookie = connection.cookie;
    this.notCookie = !connection.cookie;
    this.visited = connection.visited;
    this.notVisited = !connection.visited;
    this.secure = connection.secure;
    this.notSecure = !connection.visited;
    this.x = (Math.random() - .5) * 10;
    this.y = (Math.random() - .5) * 10;
    this.howMany = 1;
}
SourceNode.prototype = new GraphNode();
SourceNode.prototype.constructor = SourceNode;

function TargetNode(connection){
    this.name = connection.target;
    this.firstAccess = this.lastAccess = connection.timestamp;
    this.linkedFrom = [connection.source];
    this.linkedTo = [];
    this.contentTypes = [connection.contentType];
    this.cookie = connection.cookie;
    this.notCookie = !connection.cookie;
    this.visited = connection.visited;
    this.notVisited = !connection.visited;
    this.secure = connection.secure;
    this.notSecure = !connection.visited;
    this.x = (Math.random() - .5) * 10;
    this.y = (Math.random() - .5) * 10;
    this.howMany = 1;
}
TargetNode.prototype = new GraphNode();
TargetNode.prototype.constructor = TargetNode;

function onConnection(connection, reheat){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    var sourcenode, targetnode, edge;
    if (nodemap[connection.source]){
        sourcenode = nodemap[connection.source];
        sourcenode.updateSource(connection);
    }else{
        sourcenode = new SourceNode(connection);
        nodemap[sourcenode.name] = sourcenode;
        nodes.push(sourcenode);
    }
    if (nodemap[connection.target]){
        targetnode = nodemap[connection.target];
        targetnode.updateTarget(connection);
    }else{
        targetnode = new TargetNode(connection);
        nodemap[targetnode.name] = targetnode;
        nodes.push(targetnode);
    }
    if (edgemap[connection.source + '->' + connection.target]){
        edge = edgemap[connection.source + '->' + connection.target];
    }else{
        edge = new GraphEdge(sourcenode, targetnode);
        edgemap[edge.name] = edge;
        edges.push(edge);
    }
    if (reheat !== false){
        force.resume();
    }
}

function resetCanvas(){
    // You will still need to remove timer events
    var parent = vizcanvas.parentNode;
    var newcanvas = vizcanvas.cloneNode(false);
    parent.replaceChild(newcanvas, vizcanvas);
    viscanvas = newcanvas;
}


graph.on('remove', function(connections){
    resetCanvas();
});

})(visualizations);

