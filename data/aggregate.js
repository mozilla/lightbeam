// Graph Visualization

// Visualization of tracking data interconnections

(function(global){
"use strict";

// An emitter that lists nodes and edges so we can build the data structure
// used by all 3 visualizers.
var aggregate = new Emitter();

global.aggregate = aggregate;
global.filteredAggregate = {
    nodes: [],
    edges: []
};
// The name of the current filter (daily, weekly, recent, last10sites)
aggregate.currentFilter = "daily";

aggregate.trackerCount = 0;
aggregate.siteCount = 0;
// d3 has functionality to build graphs out of lists of nodes and edges.
aggregate.nodes = [];
aggregate.edges = [];
aggregate.recentSites = [];
aggregate.initialized = false;
aggregate.nodemap = {};
aggregate.edgemap = {};

function resetData(){
    console.log('aggregate::resetData');
    aggregate.getBlockedDomains().filter(function(domain) {
      console.log("deleting", domain);
      delete userSettings[domain];
    });
    aggregate.nodemap = {};
    aggregate.edgemap = {};
    aggregate.nodes = [];
    aggregate.edges = [];
    aggregate.trackerCount = 0;
    aggregate.siteCount = 0;
    aggregate.recentSites = [];
    currentVisualization.emit('reset');
    updateStatsBar();
}
aggregate.on('reset', resetData);

aggregate.getBlockedDomains = function() {
  return Object.keys(userSettings).filter(function(domain) {
    // ignore domains already known
    var nodes = aggregate.nodes;
    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].name == domain) {
        return false;
      }
    }
    return userSettings[domain] == 'block';
  });
}

aggregate.getAllNodes = function() {
  var blockedDomains = aggregate.getBlockedDomains();
  console.log("getAllNodes", JSON.stringify(blockedDomains));

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

// Pass the list of connections to build the graph structure to pass to d3 for
// visualizations.
function onLoad(connections){
    var startTime = Date.now();
    console.log("aggregate::onLoad", connections.length, "connections", aggregate.currentFilter);
    connections.forEach(onConnection);
    aggregate.initialized = true;
    filteredAggregate = aggregate.filters[aggregate.currentFilter]();

    // Tell the visualization that we're ready.
    currentVisualization.emit('init');
    updateStatsBar();
    console.log('aggregate::onLoad end, took %s ms', Date.now() - startTime);
}

function setPrefs(prefs) {
  console.log("in aggregate prefs");
  global.setPrefs(prefs);
}

aggregate.on('load', onLoad);
aggregate.on("setPrefs", setPrefs);

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

// Check that recent sites include the domain. This is another potential source
// of false positives.
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
    userSettings[domain] = 'block';
  }
  else if (userSettings[domain] == 'block') {
    delete userSettings[domain];
  }
}
aggregate.on('update-blocklist', onBlocklistUpdate);

// Read the blocklist to memory
function onBlocklistUpdateAll(domains) {
  (domains || []).forEach(onBlocklistUpdate);
}
aggregate.on('update-blocklist-all', onBlocklistUpdateAll);

// Used only by the graph view.
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
        // find index where we go beyond date
        var i;
        for (i = sortedNodes.length - 1; i > -1; i--){
            if (sortedNodes[i].lastAccess.valueOf() < then){
                break;
            }
        }
        // i is always 1 too low at the point
        i++; // put it back
        var filteredNodes = sortedNodes.slice(i);
        // Done filtering
        return aggregateFromNodes(filteredNodes);
    },
    weekly: function weekly(){
        var now = Date.now();
        var then = now - (7 * 24 * 60 * 60 * 1000);
        var sortedNodes = sitesSortedByDate();
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
        var filteredNodes = sortedNodes.slice(-10);
        return aggregateFromNodes(filteredNodes);
    },
    recent: function recent(){
        var sortedNodes = sitesSortedByDate();
        var filteredNodes = sortedNodes.slice(-1);
        return aggregateFromNodes(filteredNodes);
    }
};

function switchFilter(name){
  if (aggregate.currentFilter == name) {
    return;
  }
  aggregate.currentFilter = name;
  addon.emit("prefChanged", { defaultFilter: name });
  aggregate.update();
}

aggregate.switchFilter = switchFilter;

// Underscore debounce function
//
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
var debounce = function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

aggregate.update = debounce(function update(){
    // FIXME: maybe not for list view
    if (currentVisualization.name !== 'graph'){
        console.log('do not update aggregate for %s view', currentVisualization.name);
    }
    if (aggregate.initialized){
        global.filteredAggregate = aggregate.filters[aggregate.currentFilter]();
        aggregate.emit('update');
    }
    updateStatsBar();
});

})(this);
