"use strict";

const obSvc = require('sdk/deprecated/observer-service');
const {Connection} = require('./connection');
const tabEvents = require('./tab/events');
require('ui');

var allConnections = [];
var connectionFilter = function(connection){ return true; };

obSvc.add("http-on-examine-response", function(subject) {
    var connection = new Connection(subject);
    if (connection.valid){
        allConnections.push(connection);
        // FIXME: Save less frequently
        saveConnections();
        if (uiworker && connectionFilter(connection)){
            uiworker.port.emit('connection', connection);
        }
    }
});

tabEvents.on('activate', function(tabinfo){
    var items = currentConnectionsForTab(tabinfo);
    // visualize items
});


function matchesCurrentTab(connection){
    // this is a tabinfo object
    var tabinfo = this;
    if (!tabinfo) return false;
    if (!tabinfo.uri) return false;
    if (tabinfo.uri.spec === mainPage){ return false; }
    return (connection._sourceTab === tabinfo.tab) && (connection.timestamp > tabinfo.loadTime);
}

function currentConnectionsForTab(tabinfo){
    return allConnections.filter(matchesCurrentTab, tabinfo);
}

// START SERIALIZATION
var storage = require("simple-storage").storage;
if (storage.connections){
    allConnections = JSON.parse(storage.connections).map(function(connection){
        connection.__proto__ = Connection.prototype;
        connection.valid = true;
        connection.timestamp = new Date(connection.timestamp);
        return connection;
    });
}
if (!storage.collusionToken){
    storage.collusionToken = require('sdk/util/uuid').uuid().toString();
}
var collusionToken = storage.collusionToken;


function saveConnections(){
    storage.connections = JSON.stringify(allConnections);
}
// END SERIALIZATION

// Handle Private Browsing

let privateBrowsing = require("private-browsing");

  // Clear graph when going into private browsing mode:
privateBrowsing.on("start", function() {
    storage.allConnections = JSON.stringify(allConnections);
    allConnections = [];
});

// Restore original graph when leaving private browsing mode:
privateBrowsing.on("stop", function() {
    if (storage.allConnections) {
        allConnections = JSON.parse(storage.allConnections);
    }
});




require("page-mod").PageMod({
    include: mainPage,
    contentScriptWhen: 'start',
    contentScriptFile: data.url('content-script.js'),
    onAttach: attachToCollusionPage
});


function collusionTabOpened(tab){
    console.log('collusionTabOpened: ', tab);
}

function collusionTabClosed(tab){
    console.log('collusionTabClosed: ', tab);
    // Stop all Collusion processes, close worker(s)
}

function collusionTabReady(tab){
    console.log('collusionTabReady: ', tab);
    // add-on page should be ready to go, attach scripts
    var worker = attachToExistingCollusionPages(tab);
    // worker.port.emit('log', 'collusionTabReady');
    worker.port.emit('init', allConnections || []); // FIXME: Send appropriate data
}

function collusionTabActivate(tab){
    console.log('collusionTabActivate: ', tab);
    // restart any paused processing, send data through that has changed since pause
}

function collusionTabDeactivate(tab){
    console.log('collusionTabDeactivate: ', tab);
    // pause processing, queue data to be processed on reactivate
}



