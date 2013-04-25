// Connection object
//
// Convert an HTTP request (channel) to a loggable, visualizable connection object, if possible

var {
    Cc, Ci, Cr
} = require('chrome');
const Request = require('sdk/request').Request;
var timers = require('sdk/timers');

var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);

const { getTabForChannel } = require('./tab/utils');
const {on, once, off, emit} = require('sdk/event/core');

var allConnections = [];

var filter24hours = function(connection){
    var now = new Date();
    var day = 24 * 60 * 60 * 1000;
    var yesterday = now - day;
    return connection.timestamp > yesterday;
};
var connectionFilter = filter24hours; // default filter

exports.Connection = Connection;
exports.allConnections = [];
exports.setConnectionFilter = setConnectionFilter;
exports.getConnectionFilter = getConnectionFilter;
exports.addConnection = addConnection;
exports.exportFormat = exportFormat;
exports.filteredConnections = filteredConnections;

function setConnectionFilter(filter){
}

function getConnectionFilter(){
    return connectionFilter;
}

function filteredConnections(){
    return allConnections.filter(connectionFilter);
}

// FIXME: Move persistence into a component
/* BEGIN FLAG PERSISTENCE */
var restored = false;
var ss = require('simple-storage');
var storage = ss.storage;
function restore(){
    // only called when add-on is initialized, not when ui page is refreshed
    if (storage.connections){
        if (typeof storage.connections === 'string'){
            console.log('storage connections is a string');
            storage.connections = JSON.parse(storage.connections);
        }
        console.error('there are ' + storage.connections.length + ' connections stored (' + Math.round(ss.quotaUsage * 100) + '%)');
        allConnections = storage.connections.filter(connectionFilter).map(Connection.restore);
        restored = true;
        Connection.emit('restored', filteredConnections());
    }else{
        restored = true;
        Connection.emit('restored', filteredConnections());
    }
    if (!storage.collusionToken){
        storage.collusionToken = require('sdk/util/uuid').uuid().toString();
    }
}

function reset(){
    if (storage.connections){
        storage.connections.length = 0;
    }
    if (allConnections){
        allConnections.length = 0;
    }
}
var collusionToken = storage.collusionToken;
console.log('Current capacity is %s% of quota', Math.round(ss.quotaUsage * 100));
function onOverQuotaListener(){
    console.error('Over quota, deleting old data');
    var startTime = Date.now();
    var tenPercent = Math.floor(storage.connections.length * 0.1);
    storage.connections.splice(0, tenPercent);
    var endTime = Date.now();
    console.log('Deleting data took ' + Math.floor((endTime - startTime)/1000) + ' seconds');
};
ss.on('OverQuota', onOverQuotaListener);
/* END FLAG PERSISTENCE */

function addConnection(connection){
    allConnections.push(connection);
    if (connectionFilter(connection)){
        Connection.emit('connection', connection);
    }
/* BEGIN FLAG PERSISTENCE */
    storage.connections.push(connection.toStorage());
/* END FLAG PERSISTENCE */
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
        conn.restoreFromArray(obj);
    }else{
        conn.restoreFromObject(obj);
    }
    return conn;
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
    // Check to see if this is in fact a third-party connection, if not, return    var conn =
    var channel = subject.QueryInterface(Ci.nsIHttpChannel);
    this.valid = true;
    if (!channel.referrer){
        this.valid = false;
        this.message = 'Connection has no referrer';
        return this;
    }
    this.source = getDomain(channel.referrer.host);
    this.sourceSub = getSubdomain(channel.referrer.host);
    this.target = getDomain(channel.URI.host);
    this.targetSub = getSubdomain(channel.URI.host);
    if (this.source === this.target){
        this.valid = false;
        this.message = 'Connection is not a third-party';
        return this;
    }
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
    this.sourceVisited = (this._sourceTab.linkedBrowser.currentURI.spec === channel.referrer.spec);
    console.log('restoreComplete');
}

// Connection - level methods (not on instances)

Connection.on = function(eventname, handler){
    on(Connection, eventname, handler);
    if (eventname === 'restored' && restored){
        Connection.emit('restored', filteredConnections());
    }
};

Connection.once = function(eventname, handler){
    once(Connection, eventname, handler);
    if (eventname === 'restored' && restored){
        Connection.emit('restored', filteredConnections());
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

// FIXME: Move data shaping into its own library?
/* BEGIN FLAG SERIALIZATION */
Connection.prototype.toLog = function(){
    if (!this.valid){
        throw new Error('Do not log invalid connections: ' + this);
    }
    return [
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
        this.cacheable
    ];
};

Connection.prototype.restoreFromLog = function(log){
    this.source = log[0];
    this.target = log[1];
    this.timestamp = new Date(log[2]);
    this.contentType = log[3];
    this.cookie = log[4];
    this.sourceVisited = log[5];
    this.secure = log[6];
    this.sourcePathDepth = log[7];
    this.sourceQueryDepth = log[8];
    this.sourceSub = log[10] || '';
    this.targetSub = log[11] || '';
    this.method = log[12] || 'GET';
    this.status = log[13] || 200;
    this.cacheable = log[14] || true;
    Connection.restoredLogs += 1;
    return this;
};

Connection.prototype.toJSON = function(){
    return {
        source: this.source,
        target: this.target,
        timestamp: this.timestamp.valueOf(),
        contentType: this.contentType,
        cookie: this.cookie,
        sourceVisited: this.sourceVisited,
        secure: this.secure,
        sourcePathDepth: this.sourcePathDepth,
        sourceQueryDepth: this.sourceQueryDepth,
        sourceSub: this.sourceSub,
        targetSub: this.targetSub,
        method: this.method,
        status: this.status,
        cacheable: this.cacheable
    };
};

Connection.prototype.toStorage = function(){
    return this.toLog();
}


Connection.prototype.toString = function(){
    if (!this.valid){
        return 'Invalid Connection: ' + this.message;
    }
    return '[source: ' + this.source +
           ', target: ' + this.target +
           ', timestamp: ' + this.timestamp +
           ', contentType: ' + this.contentType +
           ', cookie: ' + this.cookie +
           ', sourceVisited: ' + this.sourceVisited +
           ', secure: ' + this.secure +
           ', sourcePathDepth: ' + this.sourcePathDepth +
           ', sourceQueryDepth: ' + this.sourceQueryDepth +
           ', sourceTab: ' + this._sourceTab +
    ']';
};
/* END FLAG SERIALIZATION */

// FIXME: Read this from config file
var uploadServer = 'http://collusiondb-development.herokuapp.com/donateData';

const notifications = require('sdk/notifications');

/* BEGIN FLAG NETWORKING */
Connection.upload = function(){
    log('Beginning Upload');
    var lastUpload = storage.lastUpload || 0;
    var connections = storage.connections.filter(function(connection){
        return connection.timestamp > lastUpload;
    }).map(Connection.restore);
    var data = exportFormat(connections);
    var request = Request({
        url: uploadServer,
        content: data,
        contentType: 'application/json',
        onComplete: function(response){
            if (response.status === 200){
                storage.lastUpload = Date.now();
            }else{
                log('response: ' + response.text);
                notifications.notify({
                  title: "Collusion Upload Error",
                  text: "Click to log the response",
                  data: response.text,
                  onClick: function (data) {
                    console.log(data);
                  }
                });
            }
        },
        onError: function(){
            log('Error: there was a problem sending connection info to the server');
        }
    });
    request.post();
    uploadTimer = timers.setTimeout(Connection.upload, 10 * 60 * 1000); // upload every 10 minutes
}

var uploadTimer;

Connection.startUpload = function(){
    storage.userHasOptedIntoSharing = true;
    Connection.upload();
};

Connection.stopUpload = function(){
    storage.userHasOptedIntoSharing = false;
    if (uploadTimer){
        timers.clearTimeout(uploadTimer);
        uploadTimer = null;
    }
};
/* END FLAG NETWORKING */

/* BEGIN FLAG EVENTS */
Connection.on('startUpload', Connection.startUpload);
Connection.on('stopUpload', Connection.stopUpload);
Connection.on('reset', reset);
if (storage.userHasOptedIntoSharing){
    Connection.startUpload();
}
/* END FLAG EVENTS */

/* BEGIN FLAG SERIALIZATION */

function exportFormat(connections, lastSync){
    if (!connections){
        connections = storage.connections.map(Connection.fromObject);
    }
    if (!lastSync){
        lastSync = new Date(0).valueOf();
    }
    return JSON.stringify({
        format: 'Collusion Save File',
        version: '1.1',
        token: collusionToken,
        connections: connections.map(function(connection){
            if (connection && connection.toLog){
                return connection.toLog();
            }else{
                log('Connection could not convert  [' + connection.toLog + '] ' + JSON.stringify(connection) + ' to log format');
            }
        })
    });
}
/* END FLAG SERIALIZATION */

/* BEGIN FLAG PERSISTENCE */
if (!restored) restore();
/* END FLAG PERSISTENCE */

