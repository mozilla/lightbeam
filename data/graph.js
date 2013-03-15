// Graph Visualization

// Visualization of tracking data interconnections

(function(visualizations){
"use strict";


var graph = new Emitter();
visualizations.graph = graph;
var width = 1000, height = 1000;
var force, vizcanvas, vis;

// Should we separate source nodes and target nodes?
var nodemap, nodes, edgemap, edges;

function resetData(){
    nodemap = {};
    nodes = [];
    edgemap = {};
    edges = [];
}
resetData();

// There are three phases for a visualization life-cycle:
// init does initialization and receives the existing set of connections
// connection notifies of a new connection that matches existing filter
// remove lets the visualization know it is about to be switched out so it can clean up
graph.on('init', onInit);
graph.on('connection', onConnection);
graph.on('remove', onRemove);

function onInit(connections){
    console.log('initializing graph from %s connections', connections.length);
    vizcanvas = document.querySelector('.vizcanvas');
    vis = d3.select('.vizcanvas');

    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    connections.forEach(function(connection){
        // This does our data shaping and is also used by visualization.on('connect')
        onConnection(connection, false);
    });
    // This binds our data to the D3 visualization and sets up the callbacks
    initGraph();
    // Differenct visualizations may have different viewBoxes, so make sure we use the right one
    vizcanvas.setAttribute('viewBox', [0,0,width,height].join(' '));
};

function onConnection(connection, reheat){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    // We want to shape the collection of connections that represent points in time into
    // aggregate data for graphing. Each connection has two endpoints represented by GraphNode objects
    // and one edge represented by a GraphEdge object, but we want to re-use these when connections
    // map to the same endpoints or edges.
    var sourcenode, targetnode, edge;
    if (nodemap[connection.source]){
        sourcenode = nodemap[connection.source];
        sourcenode.update(connection, true);
    }else{
        sourcenode = new GraphNode(connection, true);
        nodemap[connection.source] = sourcenode;
        nodes.push(sourcenode);
    }
    if (nodemap[connection.target]){
        targetnode = nodemap[connection.target];
        targetnode.update(connection, false);
    }else{
        targetnode = new GraphNode(connection, false);
        nodemap[connection.target] = targetnode;
        nodes.push(targetnode);
    }
    if (edgemap[connection.source + '->' + connection.target]){
        edge = edgemap[connection.source + '->' + connection.target];
    }else{
        edge = new GraphEdge(sourcenode, targetnode);
        edgemap[edge.name] = edge;
        edges.push(edge);
    }
    if (reheat !== false){ // reheat is default, pass false in to turn it off
        force.start();
    }
}


function onRemove(connections){
    console.log('removing graph');
    if (force){
        force.stop();
        force = null;
    }
    resetData();
    resetCanvas();
};


function initGraph(){
    // Initialize D3 layout and bind data
    force = d3.layout.force()
        .nodes(nodes)
        .links(edges)
        .charge(-500)
        .size([width,height])
        .start();

        // Data binding for links
        var lines = vis.selectAll('.edge')
            .data(edges, function(edge){ return edge.name; });

        lines.enter()
            .insert('line', ':first-child')
            .classed('edge', true);

        lines.exit()
            .remove();

        var circles = vis.selectAll('.node')
            .call(force.drag)
            .data(nodes, function(node){ return node.name; });

        circles.enter()
            .append('circle')
            .classed('node', true)
            .attr('data-name', function(node){ return node.name; });
        circles.exit()
            .remove();

        // update method
        force.on('tick', function(){
            lines
                .attr('x1', function(edge){ return edge.source.x; })
                .attr('y1', function(edge){ return edge.source.y; })
                .attr('x2', function(edge){ return edge.target.x; })
                .attr('y2', function(edge){ return edge.target.y; });

            circles
                .attr('cx', function(node){ return node.x; })
                .attr('cy', function(node){ return node.y; })
                .attr('r', function(node){ return node.linkedTo.length + node.linkedFrom.length + 12; })
                .classed('visitedYes', function(node){ return node.visited && !node.notVisited; })
                .classed('visitedNo', function(node){ return !node.visited && node.notVisited; })
                .classed('visitedBoth', function(node){ return node.visited && node.notVisited; })
                .classed('secureYes', function(node){ return node.secure && !node.notSecure; })
                .classed('secureNo', function(node){ return !node.secure && node.notSecure; })
                .classed('secureBoth', function(node){ return node.secure && node.notSecure; })
                .classed('cookieYes', function(node){ return node.cookie && !node.notCookie; })
                .classed('cookieNo', function(node){ return !node.cookie && node.notCookie; })
                .classed('cookieBoth', function(node){ return node.cookie && node.notCookie; })
                .attr('data-timestamp', function(node){ return node.lastAccess.toISOString(); });
        });
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

// A graph node represents one end of a connection, either a target or a source
// Where a connection is a point in time with a timestamp, a graph node has a  time range
// represented by firstAccess and lastAccess. Where a connection has a contentType, a node
// has an array of content types. Booleans in graph nodes become boolean pairs in graph nodes
// (for instance, some connections may have cookies and some may not, which would result in both
// cookie and notCookie being true). We set an initial position randomly to keep the force graph
// from exploding.
//
// FIXME: Other visualizations could use this aggregate structure for reporting. Move it out of
// the graph visualization into a re-usable library.
function GraphNode(connection, isSource){
    this.firstAccess = this.lastAccess = connection.timestamp;
    this.linkedFrom = [];
    this.linkedTo = [];
    this.contentTypes = [];
    this.cookie = false;
    this.notCookie = false;
    this.visited = false;
    this.notVisited = false;
    this.secure = false;
    this.notSecure = false;
    this.howMany = 0;
    if (connection){
        this.update(connection, isSource);
    }
}
GraphNode.prototype.update = function(connection, isSource){
    if (!this.name){
        this.name = isSource ? connection.source : connection.target;
    }
    if (connection.timestamp > this.lastAccess){
        this.lastAccess = connection.timestamp;
    }
    if (connection.timestamp < this.firstAccess){
        this.firstAccess = connection.timestamp;
    }
    if (isSource && (this.linkedTo.indexOf(connection.target) < 0)){
        this.linkedTo.push(connection.target);
    }
    if ((!isSource) && (this.linkedFrom.indexOf(connection.source) < 0)){
        this.linkedFrom.push(connection.source);
    }
    if (this.contentTypes.indexOf(connection.contentType) < 0){
        this.contentTypes.push(connection.contentType);
    }
    this.cookie = this.cookie || connection.cookie;
    this.notCookie = this.notCookie || (!connection.cookie);
    this.visited = this.visited || connection.sourceVisited;
    this.notVisited = this.notVisited || (!connection.sourceVisited);
    this.secure = this.secure || connection.secure;
    this.notSecure = this.secure || (!connection.visited);
    this.howMany++;
    return this;
};


// FIXME: Move this out of visualization so multiple visualizations can use it.
function resetCanvas(){
    // You will still need to remove timer events
    var parent = vizcanvas.parentNode;
    var newcanvas = vizcanvas.cloneNode(false);
    parent.replaceChild(newcanvas, vizcanvas);
    vizcanvas = newcanvas;
}


// update info
document.querySelector('#content').addEventListener('click', function(event){
    if (event.target.mozMatchesSelector('.node')){
        updateInfo(nodemap[event.target.getAttribute('data-name')]);
    }
});

function updateInfo(node){
	// FIXME: Update text here
    console.log(node);
}

})(visualizations);

