// Connection object
//
// Convert an HTTP request (channel) to a loggable, visualizable connection object, if possible

const { Cc, Ci, Cr } = require('chrome');
const Request = require('sdk/request').Request;
const timers = require('sdk/timers');
const { on, once, off, emit } = require('sdk/event/core');
const ss = require('sdk/simple-storage');
const { data } = require("sdk/self");
const addonUrl = data.url("index.html");

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

    // console.error('restored ' + Connection.restoredLogs + ' logs, ' + Connection.restoredObjects + ' objects');
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
        // console.error('addConnection() ' + connection.toLog());
    }
}

function getDomain(host) {
  try {
    return eTLDSvc.getBaseDomainFromHost(host);
  } catch (e if e.result === Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
    return false;
  } catch (e if e.result === Cr.NS_ERROR_HOST_IS_IP_ADDRESS) {
    console.error('getDomain(): ip address: ' + host);
    return false;
  } catch (e){
    console.error('getDomain(): unexpected error: ' + host + ': ' + e);
    throw e;
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

function getAjaxRequestHeader(channel){
    var header = null;
    try{
        header = channel.getRequestHeader('X-Requested-With').toLowerCase() === 'xmlhttprequest';
    }catch(e){
        if (e.name === 'NS_ERROR_NOT_AVAILABLE'){
            /* header not found, do nothing */
        }else{
            console.error('what is this? ' + Object.keys(e).join(','));
            throw e;
        }
    }
    return header;
}

function hasCookie(channel){
    try {
        return !! channel.getRequestHeader('Cookie');
    } catch (e) {
        return false;
    }
}

function getProtocol(uri){
    return uri.scheme;
}


Connection.prototype.restoreFromSubject = function(subject){
    // Check to see if this is in fact a third-party connection, if not, return
    var channel = subject.QueryInterface(Ci.nsIHttpChannel);
    var source = channel.referrer;
    var target = channel.URI;
    var targetDomain = getDomain(target.host);
    try{
        var tab = getTabForChannel(channel);
    }catch(e){
        console.log('EXCEPTION CAUGHT: No tab for connection');
        tab = null;
    }
    var isAjax = getAjaxRequestHeader(channel);
    var valid = true;
    var browserUri = tab ? tab.linkedBrowser.currentURI : null;
    var browserSpec = browserUri && browserUri.spec;
    var browserDomain = null;
    try{
        var browserDomain = browserUri && getDomain(browserUri.host);
    }catch(e){
        // chances are the URL is about:blank, which has no host and throws an exception
        // console.error('Error getting host from: ' + browserUri.spec);
    }
    var sourceVisited = !isAjax && (browserDomain === targetDomain || browserSpec === 'about:blank');
    // Connection.log('browserUri ' + browserUri.spec + (sourceVisited ? ' equals ' : ' does not equal') + ' target ' + ( target && target.spec));
    if (sourceVisited){
        source = target;
    }else if (!source){
        // console.error('No source for target ' + target.spec + ' (' + channel.referrer  + ')');
        source = target; // can't have a null source
    }
    var sourceDomain = getDomain(source.host);
    var cookie = hasCookie(channel);
    var sourceProtocol = getProtocol(source);
    var targetProtocol = getProtocol(target);
    var isSecure = targetProtocol === 'https';
    var isPrivate = tab && tab.isPrivate;
    // Handle all failure conditions
    if (browserUri && browserUri.spec === addonUrl){
        this.valid = false;
        this.message = 'Do not record connections made by this add-on';
        // console.error(this.message);
        return this;
    }
    if (!sourceDomain){
        this.valid = false;
        this.message = 'Invalid source domain: ' + source.host;
        // console.error(this.message);
        return this;
    }
    if (!targetDomain){
        this.valid = false;
        this.message = 'Invalid target domain: ' + target.host;
        // console.error(this.message);
        return this;
    }
   if (target.host === 'localhost' || source.host === 'localhost'){
        this.valid = false;
        this.message = 'Localhost is not trackable';
        // console.error(this.message);
        return this;
    }
    if (sourceProtocol === 'http' || sourceProtocol === 'https' ||
        targetProtocol === 'http' || targetProtocol === 'https'){
        /* OK, do nothing */
    }else{
        this.valid = false;
        this.message = 'Unsupported protocol: ' + sourceProtocol + ' -> ' + targetProtocol;
        // console.error(this.message);
        return this;
    }
    if (!tab){
        this.valid = false;
        this.message = 'No tab found for request: ' + target.spec + ',  isAjax: ' + isAjax;
        // console.error(this.message);
        return this;
    }
    // set instance values for return
    this.valid = true;
    this.source = sourceDomain;
    this.target = targetDomain;
    this.timestamp = Date.now();
    this.contentType = channel.contentType || 'text/plain';
    this.cookie = cookie;
    this.sourceVisited = sourceVisited;
    this.secure = isSecure;
    this.sourcePathDepth = source.path.split('/').length - 1;
    this.sourceQueryDepth = source.query ? target.query.split(/;|\&/).length : 0;
    this.sourceSub = getSubdomain(source.host);
    this.targetSub = getSubdomain(target.host);
    this.method = channel.requestMethod;
    this.status = channel.responseStatus;
    this.cacheable = !channel.isNoCacheResponse();
    this.isPrivate = isPrivate;
    this._sourceTab = tab; // Never logged, only for associating data with current tab
    // console.error((sourceVisited ? 'site: ' : 'tracker: ') + sourceDomain + ' -> ' + targetDomain + ' (' + browserUri.spec + ')');
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
        throw new Error('Do not log invalid connections: ' + this.message);
    }
    var theLog = [
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
    if (this.isPrivate){
        theLog.push(this.isPrivate);
    }
    return theLog;
};

/* END FLAG SERIALIZATION */

/* BEGIN FLAG EVENTS */

Connection.on('reset', reset);

Connection.on("toggleStore", function(toggle){
    captureAndStoreConnections = toggle;
});
Connection.on("clearStoredTempConnections", function(result){
    // console.error("before clear = " + storage.tempConnections.length);
    if (result){
        storage.tempConnections.length = 0;
        // console.error("after clear = " + storage.tempConnections.length)
    }
});

/* END FLAG EVENTS */

/* BEGIN FLAG PERSISTENCE */
if (!restored) restore();
/* END FLAG PERSISTENCE */
