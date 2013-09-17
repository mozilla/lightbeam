// Graph Visualization

// Visualization of tracking data interconnections

(function(global){
"use strict";

var aggregate = new Emitter();
global.aggregate = aggregate;
global.filteredAggregate = {
    nodes: [],
    edges: []
};

aggregate.trackerCount = 0;
aggregate.siteCount = 0;
aggregate.nodes = [];
aggregate.edges = [];
aggregate.recentSites = [];
aggregate.initialized = false;
aggregate.nodemap = {};
aggregate.edgemap = {};

function resetData(){
    aggregate.nodemap = {};
    aggregate.edgemap = {};
    aggregate.nodes = [];
    aggregate.edges = [];
    aggregate.trackerCount = 0;
    aggregate.siteCount = 0;
    aggregate.recentSites = [];
    if (currentVisualization){
        currentVisualization.emit('reset');
    }
    updateStatsBar();
}
aggregate.on('reset', resetData);

aggregate.getAllNodes = function() {
  var blockedDomains = Object.keys(userSettings).filter(function(domain) {
    // ignore domains already known
    var nodes = aggregate.nodes;
    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].name == domain) {
        return false;
      }
    }

    return userSettings[domain] == 'block';
  });

  return aggregate.nodes.concat(blockedDomains.map(function(domain) {
    return {
      site: domain,
      nodeType: 'blocked',
      name: domain
    };
  }));
}

aggregate.getConnectionCount = function(node) {
  if (node.nodeType === 'blocked')
    return 0;

  let connections = Object.keys(aggregate.nodeForKey(node.name)).length;
  return connections - 1 > 0 ? connections - 1 : 0;
}

aggregate.nodeForKey = function(key){
    var result = {};
    var linkedNodes = new Array();

    if (aggregate.nodemap[key]){
        linkedNodes = aggregate.nodemap[key].linkedFrom.concat(aggregate.nodemap[key].linkedTo);
        result[key] = aggregate.nodemap[key];
    }else{
        linkedNodes = [];
        result[key] = {};
    }

    linkedNodes.forEach(function(nodeName){
        var node = aggregate.nodemap[nodeName];
        var temp = {};
        for ( var p in node ){
            if ( node.hasOwnProperty(p) && !( p == "linkedFrom" || p == "linkedTo" ) ){
                temp[p] = node[p];
            }
        }
        result[nodeName] = temp;
    });

    return result;
};

aggregate.connectionAsObject = function(conn){
    if (Array.isArray(conn)){
        return{
            source: conn[SOURCE],
            target: conn[TARGET],
            timestamp: new Date(conn[TIMESTAMP]),
            contentType: conn[CONTENT_TYPE],
            cookie: conn[COOKIE],
            sourceVisited: conn[SOURCE_VISITED],
            secure: conn[SECURE],
            sourcePathDepth: conn[SOURCE_PATH_DEPTH],
            sourceQueryDepth: conn[SOURCE_QUERY_DEPTH],
            sourceSub: conn[SOURCE_SUB],
            targetSub: conn[TARGET_SUB],
            method: conn[METHOD],
            status: conn[STATUS],
            cacheable: conn[CACHEABLE]
        };
    }
    return conn;

}


function applyFilter(filter){
    currentFilter = filter;
}

aggregate.on('filter', applyFilter);

function onLoad(connections){
    // console.log('aggregate::onLoad with %s connections', connections.length);
    connections.forEach(onConnection);
    aggregate.initialized = true;
    filteredAggregate = currentFilter();
    currentVisualization.emit('init');
    updateStatsBar();
    // console.log('aggregate::onLoad end')
}

aggregate.on('load', onLoad);

// Constants for indexes of properties in array format
//const SOURCE = 0;
//const TARGET = 1;
//const TIMESTAMP = 2;
//const CONTENT_TYPE = 3;
//const COOKIE = 4;
//const SOURCE_VISITED = 5;
//const SECURE = 6;
//const SOURCE_PATH_DEPTH = 7;
//const SOURCE_QUERY_DEPTH = 8;
//const SOURCE_SUB = 9;
//const TARGET_SUB = 10;
//const METHOD = 11;
//const STATUS = 12;
//const CACHEABLE = 13;

aggregate.isDomainVisited = function isDomainVisited(domain){
    return aggregate.recentSites.length && (aggregate.recentSites.indexOf(domain) > -1);
}


function onConnection(conn){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    // We want to shape the collection of connections that represent points in time into
    // aggregate data for graphing. Each connection has two endpoints represented by GraphNode objects
    // and one edge represented by a GraphEdge object, but we want to re-use these when connections
    // map to the same endpoints or edges.
    var connection = aggregate.connectionAsObject(conn);
    var sourcenode, targetnode, edge, nodelist, updated = false;
    // Maintain the list of sites visited in dated order
    // console.log('check for recent sites: %s: %s', connection.source, connection.sourceVisited);
    if (connection.sourceVisited){
        // console.log('source visited: %s -> %s', connection.source, connection.target);
        var site = connection.target;
        var siteIdx = aggregate.recentSites.indexOf(site);
        if (aggregate.recentSites.length && siteIdx === (aggregate.recentSites.length - 1)){
            // most recent site is already at the end of the recentSites list, do nothing
        }else{

            if (siteIdx > -1){
                // if site is already in list (but not last), remove it
                aggregate.recentSites.splice(siteIdx, 1);
            }
            aggregate.recentSites.push(site); // push site on end of list if it is not there
            updated = true;
        }
    }else{
        // console.log('source not visited: %s -> %s', connection.source, connection.target);
    }
    // Retrieve the source node and update, or create it if not found
    if (aggregate.nodemap[connection.source]){
        sourcenode = aggregate.nodemap[connection.source];
        if (connection.sourceVisited && sourcenode.nodeType == "thirdparty"){
            // the previously "thirdparty" site has now become a "visited" site
            // +1 on visited sites counter and -1 on trackers counter
            aggregate.siteCount++;
            aggregate.trackerCount--;
        }
        sourcenode.update(connection, true);
    }else{
        sourcenode = new GraphNode(connection, true);
        aggregate.nodemap[connection.source] = sourcenode;
        aggregate.nodes.push(sourcenode);

        if (connection.sourceVisited){
            aggregate.siteCount++;
        }else{
            aggregate.trackerCount++;
        }
        // console.log('new source: %s, now %s nodes', sourcenode.name, aggregate.nodes.length);
        updated = true;
    }
    // Retrieve the target node and update, or create it if not found
    if (aggregate.nodemap[connection.target]){
        targetnode = aggregate.nodemap[connection.target];
        targetnode.update(connection, false);
    }else{
        targetnode = new GraphNode(connection, false);
        aggregate.nodemap[connection.target] = targetnode;
        aggregate.nodes.push(targetnode); // all nodes
        if (connection.sourceVisited){
            aggregate.siteCount++; // Can this ever be true?
        }else{
            aggregate.trackerCount++;
        }
        // console.log('new target: %s, now %s nodes', targetnode.name, aggregate.nodes.length);
        updated = true
    }
    // Create edge objects. Could probably do this lazily just for the graph view
    if (aggregate.edgemap[connection.source + '->' + connection.target]){
        edge = aggregate.edgemap[connection.source + '->' + connection.target];
        edge.update(connection);
    }else{
        edge = new GraphEdge(sourcenode, targetnode, connection);
        aggregate.edgemap[edge.name] = edge;
        aggregate.edges.push(edge);
        // updated = true;
    }
    if (updated){
        aggregate.update();
    }
    updateStatsBar();
}

aggregate.on('connection', onConnection);


function onBlocklistUpdate({ domain, flag }) {
  if (flag === true) {
    // Make sure we have blocked domains in localStorage, no matter what.
    // If localStorage is cleared the domains will still be blocked,
    // this is wahy the update is necessary.
    userSettings[domain] = 'block';
  }
  else if (userSettings[domain] == 'block') {
    delete userSettings[domain];
  }
}
aggregate.on('update-blocklist', onBlocklistUpdate);

function onBlocklistUpdateAll(domains) {
  (domains || []).forEach(onBlocklistUpdate);
}
aggregate.on('update-blocklist-all', onBlocklistUpdateAll);

function GraphEdge(source, target, connection){
    var name = source.name + '->' + target.name;
    if (aggregate.edgemap[name]){
        return aggregate.edgemap[name];
    }
    this.source = source;
    this.target = target;
    this.name = name;
    if (connection){
        this.cookieCount = connection.cookie ? 1 : 0;
    }
    // console.log('edge: %s', this.name);
}
GraphEdge.prototype.lastAccess = function(){
    return (this.source.lastAccess > this.target.lastAccess) ? this.source.lastAccess : this.target.lastAccess;
}
GraphEdge.prototype.firstAccess = function(){
    return (this.source.firstAccess < this.target.firstAccess) ? this.source.firstAccess : this.target.firstAccess;
}
GraphEdge.prototype.update = function(connection){
    this.cookieCount = connection.cookie ? this.cookieCount+1 : this.cookieCount;
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
    this.subdomain = [];
    this.method = [];
    this.status = [];
    this.visitedCount = 0;
    this.secureCount = 0;
    this.cookieCount = 0;
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
    if (connection.sourceVisited){
        this.visitedCount++;
    }
    if ( this.subdomain.indexOf(connection.sourceSub) < 0 ){
        this.subdomain.push(connection.sourceSub);
    }if (connection.cookie){
        this.cookieCount++;
    }
    if (connection.secure){
        this.secureCount++;
    }
    if ( this.method.indexOf(connection.method) < 0 ){
        this.method.push(connection.method);
    }
    if ( this.status.indexOf(connection.status) < 0 ){
        this.status.push(connection.status);
    }

    this.howMany++;
    if ( this.visitedCount/this.howMany == 1 ){
        this.nodeType = 'site';
    }else if ( this.visitedCount/this.howMany == 0 ){
        this.nodeType = 'thirdparty';
    }else{
        this.nodeType = 'both';
    }
    return this;
};

// Filtering

function sitesSortedByDate(){
    return aggregate.recentSites.map(function(sitename){
        return aggregate.nodemap[sitename];
    });
}
aggregate.sitesSortedByDate = sitesSortedByDate;

function aggregateFromNodes(nodes){
    var localmap = {};
    var edgemap = {};
    nodes.forEach(function(node){
        localmap[node.name] = node;
        node.linkedFrom.forEach(function(nodename){
            var linkedNode = aggregate.nodemap[nodename];
            var edge = new GraphEdge(node, linkedNode);
            edgemap[edge.name] = edge;
            localmap[nodename] = linkedNode;
        });
        node.linkedTo.forEach(function(nodename){
            var linkedNode = aggregate.nodemap[nodename];
            var edge = new GraphEdge(node, linkedNode);
            edgemap[edge.name] = edge;
            localmap[nodename] = linkedNode;
        });
    });
    return {
        nodes: Object.keys(localmap).map(function(name){
            return localmap[name];
        }),
        edges: Object.keys(edgemap).map(function(name){
            return edgemap[name];
        })
    };
}

// filters
aggregate.filters = {
    daily: function daily(){
        var now = Date.now();
        var then = now - (24 * 60 * 60 * 1000);
        var sortedNodes = sitesSortedByDate();
        // console.log('daily filter before: %s', aggregate.recentSites.length);
        // filter
        // find index where we go beyond date
        var i;
        for (i = sortedNodes.length - 1; i > -1; i--){
            // console.log(sortedNodes[i].lastAccess.valueOf() + ' < ' + then + ': ' + (sortedNodes[i].lastAccess.valueOf() < then));
            if (sortedNodes[i].lastAccess.valueOf() < then){
                break;
            }
        }
        // i is always 1 too low at the point
        i++; // put it back
        // console.log('slicing on index %s', i);
        var filteredNodes = sortedNodes.slice(i);
        // Done filtering
        // console.log('daily filter after: %s', filteredNodes.length);
        return aggregateFromNodes(filteredNodes);
    },
    weekly: function weekly(){
        var now = Date.now();
        var then = now - (7 * 24 * 60 * 60 * 1000);
        var sortedNodes = sitesSortedByDate();
        // console.log('weekly filter before: %s', sortedNodes.length);
        // filter
        // find index where we go beyond date
        var i;
        for (i = sortedNodes.length - 1; i > -1; i--){
            if (sortedNodes[i].lastAccess < then){
                break;
            }
        }
        i++; // we decrement too far, put it back
        var filteredNodes = sortedNodes.slice(i);
        // console.log('weekly filter after: %s', filteredNodes.length);
        return aggregateFromNodes(filteredNodes);
    },
    last10sites: function last10sites(){
        var sortedNodes = sitesSortedByDate();
        // console.log('last10sites filter before: %s', sortedNodes.length);
        var filteredNodes = sortedNodes.slice(-10);
        // console.log('last10sites filter after: %s', filteredNodes.length)
        // console.log('last 10 sites before joining with linked nodes:');
        // console.log('\t%o', filteredNodes.map(function(node){return node.name}));
        return aggregateFromNodes(filteredNodes);
    },
    recent: function recent(){
        var sortedNodes = sitesSortedByDate();
        // console.log('recent filter before: %s', sortedNodes.length);
        var filteredNodes = sortedNodes.slice(-1);
        // console.log('recent filter after: %s', filteredNodes.length);
        // console.log('recent nodes before joining with linked nodes:');
        // console.log('\t%o', filteredNodes.map(function(node){return node.name;}));
        return aggregateFromNodes(filteredNodes);
    }
};

var currentFilter = aggregate.filters[localStorage.currentFilter || 'daily'];

function switchFilter(name){
    // console.log('switchFilter(' + name + ')');
    if (currentFilter && currentFilter === aggregate.filters[name]) return;
    currentFilter = aggregate.filters[name];
    if (currentFilter){
        localStorage.currentFilter = name;
        aggregate.emit('filter', currentFilter);
    }else{
        console.log('unable to switch filter to %s', name);
    }
    aggregate.update();
}

aggregate.switchFilter = switchFilter;

aggregate.update = function update(){
    // FIXME: Don't do this for clock view, maybe not for list view
    if (aggregate.initialized){
        global.filteredAggregate = currentFilter();
        aggregate.emit('update');
    }
    updateStatsBar();
}

})(this);
