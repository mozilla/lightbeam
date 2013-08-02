// Connection object
//
// Convert an HTTP request (channel) to a loggable, visualizable connection object, if possible

const { Cc, Ci, Cr } = require('chrome');
const Request = require('sdk/request').Request;
const timers = require('sdk/timers');
const { on, once, off, emit } = require('sdk/event/core');
const ss = require('sdk/simple-storage');

var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);

const { getTabForChannel } = require('./tab/utils');

var captureAndStoreConnections = true;

exports.Connection = Connection;
exports.addConnection = addConnection;

// FIXME: Move persistence into a component
/* BEGIN FLAG PERSISTENCE */
var restored = false;
var storage = ss.storage;
function restore(){
    // only called when add-on is initialized, not when ui page is refreshed
    Connection.emit('restored');
    if ( storage.tempConnections && storage.tempConnections.length > 0 ){
        Connection.emit("tempConnections", storage.tempConnections);
    }
    restored = true;

    console.error('restored ' + Connection.restoredLogs + ' logs, ' + Connection.restoredObjects + ' objects');
}

function reset(){
    if (storage.tempConnections){
        storage.tempConnections.length = 0;
    }
}

console.log('Current capacity is %s% of quota', Math.round(ss.quotaUsage * 100));
/* END FLAG PERSISTENCE */

function addConnection(connection){
    Connection.emit("connection", connection.toLog()); // pass connection as array
    if ( !storage.tempConnections ) storage.tempConnections = [];
    if ( captureAndStoreConnections ){
        storage.tempConnections.push(connection.toLog());
        console.error("=====");
        console.error(connection.toLog());
    }
}


function getDomain(host) {
  try {
    return eTLDSvc.getBaseDomainFromHost(host);
  } catch (e if e.result === Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
    return host;
  } catch (e if e.result === Cr.NS_ERROR_HOST_IS_IP_ADDRESS) {
    return host;
  }
}

Connection.getDomain = getDomain; // make it part of what we export

function getSubdomain(host){
    var domain = getDomain(host);
    return host.slice(0, host.length - domain.length);
}

function Connection() {};

Connection.restoredLogs = 0;
Connection.restoredObjects = 0;

Connection.fromSubject = function(subject){
    var conn = new Connection();
    conn.restoreFromSubject(subject);
    return conn;
}

Connection.restore = function(obj){
    var conn = new Connection();
    if (Array.isArray(obj)){
        return obj;
    }else{
        conn.restoreFromObject(obj);
        return;
    }
};

Connection.prototype.restoreFromObject = function(obj){
    var self = this, host;
    Object.keys(obj).forEach(function(key){
        self[key] = obj[key];
    });
    // defaults for 1.1
    if (self.sourceSub === undefined){
        host = self.source;
        self.source = getDomain(host);
        self.sourceSub = getSubdomain(host);
    }
    if (self.targetSub === undefined){
        host = self.target;
        self.target = getDomain(host);
        self.targetSub = getSubdomain(host);
    }
    if (self.method === undefined){
        self.method = 'GET';
    }
    if (self.status === undefined){
        self.status = 200;
    }
    if (self.cacheable === undefined){
        self.cacheable = true;
    }
    self.valid = true;
    self.timestamp = new Date(obj.timestamp);
    Connection.restoredObjects += 1;
    return self
};

Connection.prototype.restoreFromSubject = function(subject){
    // Check to see if this is in fact a third-party connection, if not, return
    var channel = subject.QueryInterface(Ci.nsIHttpChannel);
    this.valid = true;
    if (!channel.referrer){
        this.source = getDomain(channel.URI.host);
        this.sourceSub = getSubdomain(channel.URI.host);
    }else{
        this.source = getDomain(channel.referrer.host);
        this.sourceSub = getSubdomain(channel.referrer.host);
    }
    this.target = getDomain(channel.URI.host);
    this.targetSub = getSubdomain(channel.URI.host);
    this.timestamp = Date.now();
    this.contentType = channel.contentType || 'text/plain';
    try {
        this.cookie = !! channel.getRequestHeader('Cookie');
    } catch (e) {
        this.cookie = false;
    }
    var protocol = channel.URI.scheme;
    switch (protocol) {
        case 'http':
            this.secure = false;
            break;
        case 'https':
            this.secure = true;
            break;
        default:
            this.valid = false;
            this.message = 'Unsupported protocol: ' + protocol;
            return;
    }
    this.sourcePathDepth = channel.URI.path.split('/').length - 1;
    if (channel.URI.query) {
        this.sourceQueryDepth = channel.URI.query.split(/;|\&/).length;
    } else {
        this.sourceQueryDepth = 0;
    }
    this.method = channel.requestMethod;
    this.status = channel.responseStatus;
    this.cacheable = !channel.isNoCacheResponse();
    this._sourceTab = getTabForChannel(channel); // Never logged, only for associating data with current tab
    this.sourceVisited = (this._sourceTab && this._sourceTab.linkedBrowser.currentURI.spec === channel.URI.spec);
    if ((this.source === this.target) && (!this.sourceVisited)){
        this.valid = false;
        this.message = 'Connection is not a third-party';
        return this;
    }
    if (!this._sourceTab){
        Connection.log('No tab found for request: %s', channel.URI.spec);
    }
    // if (this.sourceVisited){
    //     Connection.log('visited site: ' + channel.URI.spec);
    // }
    // console.log('restoreComplete');
}

// Connection - level methods (not on instances)

Connection.on = function(eventname, handler){
    on(Connection, eventname, handler);
    if (eventname === 'restored'){
        Connection.emit('restored');
    }
    if (eventname === "tempConnections"){
        Connection.emit("tempConnections", storage.tempConnections);
    }
};

Connection.once = function(eventname, handler){
    once(Connection, eventname, handler);
    if (eventname === 'restored'){
        Connection.emit('restored');
    }
    if (eventname === "tempConnections"){
        Connection.emit("tempConnections", storage.tempConnections);
    }
};

Connection.off = function(eventname){
    off(Connection, eventname);
};

Connection.emit = function(eventname, arg1, arg2, arg3){
    emit(Connection, eventname, arg1, arg2, arg3);
};

function log(message){
    Connection.emit('log', message);
}
Connection.log = log;

// Constants for indexes of properties in array format
Connection.SOURCE = 0;
Connection.TARGET = 1;
Connection.TIMESTAMP = 2;
Connection.CONTENT_TYPE = 3;
Connection.COOKIE = 4;
Connection.SOURCE_VISITED = 5;
Connection.SECURE = 6;
Connection.SOURCE_PATH_DEPTH = 7;
Connection.SOURCE_QUERY_DEPTH = 8;
Connection.SOURCE_SUB = 9;
Connection.TARGET_SUB = 10;
Connection.METHOD = 11;
Connection.STATUS = 12;
Connection.CACHEABLE = 13;
Connection.FROM_PRIVATE_MODE = 14;

// FIXME: Move data shaping into its own library?
/* BEGIN FLAG SERIALIZATION */
Connection.prototype.toLog = function(){
    if (!this.valid){
        throw new Error('Do not log invalid connections: ' + this);
    }
    var connectionAsArray = [
        this.source,
        this.target,
        this.timestamp.valueOf(),
        this.contentType,
        this.cookie,
        this.sourceVisited,
        this.secure,
        this.sourcePathDepth,
        this.sourceQueryDepth,
        this.sourceSub,
        this.targetSub,
        this.method,
        this.status,
        this.cacheable,
        this._sourceTab.isPrivate
    ];
    
    return connectionAsArray;
};

/* END FLAG SERIALIZATION */

/* BEGIN FLAG EVENTS */

Connection.on('reset', reset);

Connection.on("toggleStore", function(toggle){
    captureAndStoreConnections = toggle;
});
Connection.on("clearStoredTempConnections", function(result){
    console.error("before clear = " + storage.tempConnections.length);
    if (result){
        storage.tempConnections.length = 0;
        console.error("after clear = " + storage.tempConnections.length)
    }
});

/* END FLAG EVENTS */

/* BEGIN FLAG PERSISTENCE */
if (!restored) restore();
/* END FLAG PERSISTENCE */
