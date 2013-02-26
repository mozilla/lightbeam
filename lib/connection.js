// Connection object
//
// Convert an HTTP request (channel) to a loggable, visualizable connection object, if possible

var {
    Cc, Ci, Cr
} = require('chrome');

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
exports.saveConnections = saveConnections;
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
// START PERSISTENCE
var restored = false;
var storage = require("simple-storage").storage;
function restore(){
    // only called when add-on is initialized, not when ui page is refreshed
    if (storage.connections){
        allConnections = JSON.parse(storage.connections).map(function(connection){
            connection.__proto__ = Connection.prototype;
            connection.valid = true;
            connection.timestamp = new Date(connection.timestamp);
            return connection;
        });
        restored = true;
        Connection.emit('restored', filteredConnections);
    }else{
        restored = true;
        Connection.emit('restored', filteredConnections());
    }
    if (!storage.collusionToken){
        storage.collusionToken = require('sdk/util/uuid').uuid().toString();
    }
}

var collusionToken = storage.collusionToken;

function addConnection(connection){
    allConnections.push(connection);
    if (connectionFilter(connection)){
        Connection.emit('connection', connection);
    }

    // FIXME: Save less frequently
    saveConnections();
}

function saveConnections(){
    storage.connections = JSON.stringify(allConnections);
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

function isThirdParty(source, target) {
	return getDomain(source) !== getDomain(target);
}

function Connection(subject) {
    // Check to see if this is in fact a third-party connection, if not, return
	var channel = subject.QueryInterface(Ci.nsIHttpChannel);
	this.valid = true;
    if (!channel.referrer){
		this.valid = false;
		this.message = 'Connection has no referrer';
		return;
	}
    this.source = channel.referrer.host;
    this.target = channel.URI.host;
	if (!isThirdParty(this.source, this.target)){
		this.valid = false;
		this.message = 'Connection is not a third-party';
		return;
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
    this._sourceTab = getTabForChannel(channel); // Never logged, only for associating data with current tab
	this.sourceVisited = (this._sourceTab.linkedBrowser.currentURI.spec === channel.referrer.spec);
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

Connection.prototype.toLog = function(){
	if (!this.valid){
		throw new Exception('Do not log invalid connections: ' + this);
	}
	return [this.source, this.target, this.timestamp.valueOf(), this.contentType, this.cookie, this.sourceVisited, this.secure, this.sourcePathDepth, this.sourceQueryDepth];
};

Connection.prototype.toJSON = function(){
    return {
        source: this.source,
        target: this.target,
        timestamp: this.timestamp,
        contentType: this.contentType,
        cookie: this.cookie,
        sourceVisited: this.sourceVisited,
        secure: this.secure,
        sourcePathDepth: this.sourcePathDepth,
        sourceQueryDepth: this.sourceQueryDepth
    };
};


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


function exportFormat(){
    return JSON.stringify({
        format: 'Collusion Save File',
        version: '1.0',
        token: collusionToken,
        connections: allConnections.map(function(connection){
            if (connection && connection.toLog){
                return connection.toLog();
            }else{
                log('Connection could not convert ' + JSON.stringify(connection) + ' to log format');
            }
        })
    });
}

if (!restored) restore();

