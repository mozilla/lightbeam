// Graph Visualization

// Visualization of tracking data interconnections

(function(global){
"use strict";

var nodemap, edgemap;

var aggregate = new Emitter();
global.aggregate = aggregate;

aggregate.allnodes = [];
aggregate.sitenodes = [];
aggregate.thirdnodes = [];
aggregate.bothnodes = [];
aggregate.edges = [];

function resetData(){
    aggregate.allnodes.length = 0;
    nodemap = {};
    aggregate.sitenodes.length = 0;
    aggregate.thirdnodes.length = 0;
    aggregate.bothnodes.length = 0;
    edgemap = {};
    aggregate.edges.length = 0;
}
resetData();
aggregate.on('reset', resetData);
aggregate.nodeForKey = function(key){
    return nodemap[key];
};

function onLoad(connections){
    connections.forEach(onConnection);
}

aggregate.on('load', onLoad);

function onConnection(connection){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    // We want to shape the collection of connections that represent points in time into
    // aggregate data for graphing. Each connection has two endpoints represented by GraphNode objects
    // and one edge represented by a GraphEdge object, but we want to re-use these when connections
    // map to the same endpoints or edges.
    var sourcenode, targetnode, edge, nodelist, updated = false;
    if (nodemap[connection.source]){
        sourcenode = nodemap[connection.source];
        var oldNodeType = sourcenode.nodeType;
        sourcenode.update(connection, true);
        if (oldNodeType !== sourcenode.nodeType){
            moveNode(sourcenode, oldNodeType);
            updated = true;
    }
    }else{
        sourcenode = new GraphNode(connection, true);
        nodemap[connection.source] = sourcenode;
        nodelist = getNodeList(sourcenode.nodeType);
        nodelist.push(sourcenode);
        aggregate.allnodes.push(sourcenode);
        updated = true;
    }
    if (nodemap[connection.target]){
        targetnode = nodemap[connection.target];
        var oldNodeType = targetnode.nodeType;
        targetnode.update(connection, false);
        if (oldNodeType !== targetnode.nodeType){
            moveNode(targetnode, oldNodeType);
            updated = true;
    }
    }else{
        targetnode = new GraphNode(connection, false);
        nodemap[connection.target] = targetnode;
        nodelist = getNodeList(targetnode.nodeType);
        nodelist.push(targetnode);
        aggregate.allnodes.push(targetnode); // all nodes
        updated = true
    }
    if (edgemap[connection.source + '->' + connection.target]){
        edge = edgemap[connection.source + '->' + connection.target];
    }else{
        edge = new GraphEdge(sourcenode, targetnode);
        edgemap[edge.name] = edge;
        aggregate.edges.push(edge);
        updated = true;
    }
    aggregate.emit('updated'); // tell listeners there are new node(s)
}

aggregate.on('connection', onConnection);

function getNodeList(nodeType){
    switch(nodeType){
        case 'site': return aggregate.sitenodes;
        case 'thirdparty': return aggregate.thirdnodes;
        case 'both': return aggregate.bothnodes;
        default: throw new Error('It has to be one of the choices above');
    }
}

function moveNode(node, oldNodeType){
    var oldlist = getNodeList(oldNodeType);
    var newlist = getNodeList(node.nodeType);
    oldlist.splice(oldlist.indexOf(node), 1);
    newlist.push(node);
}


function GraphEdge(source, target){
    this.source = source;
    this.target = target;
    this.name = source.name + '->' + target.name;
    // console.log('edge: %s', this.name);
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
    // FIXME: Get the width and height from the add-on somehow
    var width = 1000;
    var height = 1000;
    // Set defaults for graph
    this.x = this.px = (Math.random() - 0.5) * 800 + width/2;
    this.y = this.py = (Math.random() - 0.5) * 800 + height/2;
    this.weight = 0;
}
GraphNode.prototype.update = function(connection, isSource){
    if (!this.name){
        this.name = isSource ? connection.source : connection.target;
        // console.log('node: %s', this.name);
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
    if (isSource){
        this.visited = this.visited || connection.sourceVisited;
        this.notVisited = this.notVisited || (!connection.sourceVisited);
    }else{
        this.notVisited = true;
    }
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


})(this);
