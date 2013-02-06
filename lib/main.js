"use strict";

const obSvc = require('sdk/deprecated/observer-service');
const { Connection } = require('./connection');
const tabEvents = require('./tab/events');
require('ui');

// var prefs = require('simple-prefs').prefs;
// var url = require('url');
// var xhr = require("xhr");
// var timers = require("timers");
// var storage = require("simple-storage").storage;
// var windowUtils = require("window-utils");
// var addontab = require('addon-page');
var allConnections = [];
obSvc.add("http-on-examine-response", function(subject) {
    var connection = new Connection(subject);
    if (connection.valid){
        // console.log(connection);
        allConnections.push(connection);
    }
});

tabEvents.on('activate', function(tabinfo){
    var items = currentConnectionsForTab(tabinfo);
    // visualize items
    console.log('this tab matched ' + items.length + ' items');
});


function matchesCurrentTab(connection){
    // this is a tabinfo object
    var tabinfo = this;
    if (tabinfo.uri.spec === mainPage){ return false; }
    return (connection._sourceTab === tabinfo.tab) && (connection.timestamp > tabinfo.loadTime);
}

function currentConnectionsForTab(tabinfo){
    return allConnections.filter(matchesCurrentTab, tabinfo);
}

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

