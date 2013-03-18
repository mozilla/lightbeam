// Graph Visualization

// Visualization of tracking data interconnections

(function(visualizations){
"use strict";


var graph = new Emitter();
visualizations.graph = graph;
var width = 1000, height = 1000;
var force, vizcanvas, vis;

// Should we separate source nodes and target nodes?
var nodemap, allnodes, sitenodes, thirdnodes, bothnodes, edgemap, edges;

function resetData(){
    allnodes = [];
    nodemap = {};
    sitenodes = [];
    thirdnodes = [];
    bothnodes = [];
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
        onConnection(connection);
    });
    // This binds our data to the D3 visualization and sets up the callbacks
    initGraph();
    // Differenct visualizations may have different viewBoxes, so make sure we use the right one
    vizcanvas.setAttribute('viewBox', [0,0,width,height].join(' '));
};

function onConnection(connection){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    // We want to shape the collection of connections that represent points in time into
    // aggregate data for graphing. Each connection has two endpoints represented by GraphNode objects
    // and one edge represented by a GraphEdge object, but we want to re-use these when connections
    // map to the same endpoints or edges.
    var sourcenode, targetnode, edge, nodelist, reheat = false;
    if (nodemap[connection.source]){
        sourcenode = nodemap[connection.source];
        var oldNodeType = sourcenode.nodeType;
        sourcenode.update(connection, true);
        if (oldNodeType !== sourcenode.nodeType){
            moveNode(sourcenode, oldNodeType);
            reheat = true;
	}
    }else{
        sourcenode = new GraphNode(connection, true);
        nodemap[connection.source] = sourcenode;
        nodelist = getNodeList(sourcenode.nodeType);
        nodelist.push(sourcenode);
	allnodes.push(sourcenode);
        reheat = true;
    }
    if (nodemap[connection.target]){
        targetnode = nodemap[connection.target];
        var oldNodeType = targetnode.nodeType;
        targetnode.update(connection, false);
        if (oldNodeType !== targetnode.nodeType){
            moveNode(targetnode, oldNodeType);
            reheat = true;
	}
    }else{
        targetnode = new GraphNode(connection, false);
        nodemap[connection.target] = targetnode;
        nodelist = getNodeList(targetnode.nodeType);
        nodelist.push(targetnode);
        allnodes.push(targetnode); // all nodes
        reheat = true
    }
    if (edgemap[connection.source + '->' + connection.target]){
        edge = edgemap[connection.source + '->' + connection.target];
    }else{
        edge = new GraphEdge(sourcenode, targetnode);
        edgemap[edge.name] = edge;
        edges.push(edge);
        reheat = true;
    }
    if (force && reheat){ // reheat is default, pass false in to turn it off
        force.start();
    }
}

function getNodeList(nodeType){
    switch(nodeType){
        case 'site': return sitenodes;
        case 'thirdparty': return thirdnodes;
        case 'both': return bothnodes;
        default: throw new Error('It has to be one of the choices above');
    }
}

function moveNode(node, oldNodeType){
    var oldlist = getNodeList(oldNodeType);
    var newlist = getNodeList(node.nodeType);
    oldlist.splice(oldlist.indexOf(node), 1);
    newlist.push(node);
}


function onRemove(){
    console.log('removing graph');
    if (force){
        force.stop();
        force = null;
    }
    resetData();
    resetCanvas();
};

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


function initGraph(){
    // Initialize D3 layout and bind data
    force = d3.layout.force()
        .nodes(allnodes)
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

        var nodes = vis.selectAll('.node')
	    .data(allnodes, function(node){ return node.name; })
        .call(force.drag);

	nodes.enter();

        nodes.exit()
            .remove();

        var sites = vis.selectAll('.site')
            .data(sitenodes, function(node){ return node.name; });

        sites.enter()
            .append('circle')
	        .attr('cx', 0)
	        .attr('cy', 0)
	        .attr('r', 12)
            .attr('data-name', function(node){ return node.name; })
            .classed('node', true)
            .classed('site', true);

        var thirdparties = vis.selectAll('.thirdparty')
            .data(thirdnodes, function(node){ return node.name; });

        thirdparties.enter()
            .append('polygon')
    	    .attr('points', polygonAsString(3, 20))
            .attr('data-name', function(node){ return node.name; })
            .classed('node', true)
            .classed('thirdparty', true);

        var boths = vis.selectAll('.both')
            .data(bothnodes, function(node){ return node.name; });

        boths.enter()
    	    .append('rect')
    	    .attr('x', -9)
    	    .attr('y', -9)
    	    .attr('width', 18)
    	    .attr('height', 18)
            .attr('data-name', function(node){ return node.name; })
    	    .classed('node', true)
    	    .classed('both', true);

        // update method
        force.on('tick', function(){
            lines
                .attr('x1', function(edge){ return edge.source.x; })
                .attr('y1', function(edge){ return edge.source.y; })
                .attr('x2', function(edge){ return edge.target.x; })
                .attr('y2', function(edge){ return edge.target.y; });
    	    updateNodes(sites);
    	    updateNodes(thirdparties);
    	    updateNodes(boths);
        });
}

function updateNodes(thenodes){
    thenodes
	.attr('transform', function(node){ return 'translate(' + node.x + ',' + node.y + ') scale(' + (1 + .03 * node.weight) + ')'; })
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
    if (this.visited && this.notVisited){
        this.nodeType = 'both';
    }else if (this.visited){
        this.nodeType = 'site';
    }else{
	this.nodeType = 'thirdparty';
    }
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
        var preHighlight = toArray(document.querySelectorAll(".highlight-country"));
        preHighlight.forEach(function(element){
            element.classList.remove("highlight-country");
        });
        updateInfo(nodemap[event.target.getAttribute('data-name')]);
    }
});

/* Updates info on the right info bar */
function updateInfo(node){
    var nodeName = node.name;
    document.querySelector(".holder .title").innerHTML = nodeName;
    document.querySelector(".holder .url").innerHTML = nodeName;
    /* uses Steven Levithan's parseUri 1.2.2 */
    var info = parseUri(nodeName);
    var jsonURL = "http://freegeoip.net/json/" + info.host;
    function getServerInfo(theUrl){
        var xmlHttp = null;
        xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", theUrl, false );
        xmlHttp.send( null );
        return JSON.parse(xmlHttp.responseText);
    }
    var data = getServerInfo(jsonURL);
    var countryName = data.country_name;
    var countryCode = data.country_code;
    var countryPathOnMap = document.querySelectorAll("svg #" + countryCode.toLowerCase() + " > *");
    if ( countryPathOnMap ){
        document.querySelector("#country").innerHTML = "Country: " + countryName;
        toArray(countryPathOnMap).forEach(function(path){
            path.classList.add("highlight-country");
        });
    }

    var connections = new Array();
    var htmlList = "";
    connections = connections.concat(node.linkedFrom, node.linkedTo);
    connections.forEach(function(conn){
        htmlList = htmlList + "<li>" + conn + "</li>";
    });
    document.querySelector(".connections-list ul").innerHTML = htmlList;


}

})(visualizations);
