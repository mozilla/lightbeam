"use strict";
let obSvc = require('sdk/deprecated/observer-service');
let {Connection} = require('./connection');
let tabEvents = require('./tab/events');

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


// Add Menu item and widget for opening collusion
//
// 1. There should never be two Collusion tabs open
// 2. We should be able to switch to the Collusion tab if it exists
// 3. We should be able to close the Collusion tab if it is open

let tabs = require('tabs');
let data = require("self").data;
let mainPage = data.url("index.html");
let uiworker = null;

function attachToCollusionPage(worker) {
  /* Set up channel of communication between this add-on and the script (content-script.js)
   * that we attached to the web page running the Collusion UI. */
    // FIXME, this is drawn directly from old Collusion
    uiworker = worker;
    // worker.port.emit('log', 'attaching worker');
    worker.port.on("detach", function() {
        uiworker = null;
    });
    worker.port.on("reset", function() {
        allConnections = [];
    });
    worker.port.on("save", function() {
        // Don't permanently store data about graph in private browsing mode
        if (!privateBrowsing.isActive) {
            storage.allConnections = allConnections;
        }
    });
    worker.port.on('uiready', function(){
        // worker.port.emit('log', 'addon received uiready: "' + JSON.stringify(allConnections) + '"');
        worker.port.emit('init', allConnections || []); // FIXME, should used filtered connections
    });

    worker.port.on('debug', function(){
        worker.port.emit('log', 'There are ' + allConnections.length + ' connections stored');
    });

    worker.port.on('export', function(){
        worker.port.emit('log', 'exporting data from addon');
        worker.port.emit('export-data', exportWrap(allConnections));
    });
}

function exportWrap(connections){
    return JSON.stringify({
        format: 'Collusion Save File',
        version: '1.0',
        token: collusionToken,
        connections: connections.map(function(connection){
            if (connection && connection.toLog){
                return connection.toLog();
            }else{
                console.log('Could not convert ' + JSON.stringify(connection) + ' to log format');
            }
        })
    });
}



require("page-mod").PageMod({
    include: mainPage,
    contentScriptWhen: 'start',
    contentScriptFile: data.url('content-script.js'),
    onAttach: attachToCollusionPage
});

function getCollusionTab(){
    for(var i = 0; i < tabs.length; i++){
        var tab = tabs[i];
        if (tab.url === mainPage){
            return tab;
        }
    }
}

 // Set up the menu item to open the main UI page:
var menuitem = require("shared/menuitems").Menuitem({
    id: "collusion_openUITab",
    menuid: "menu_ToolsPopup",
    label: "Show Collusion",
    onCommand: function() {
        openOrSwitchToOrClose(mainPage);
    },
    insertbefore: "sanitizeItem",
    image: data.url("favicon.ico")
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

function openOrSwitchToOrClose(url){
    // is there a tab open for Collusion?
    var tab = getCollusionTab();
    // if not, open one
    if (!tab){
        return tabs.open({
            url: url,
            onOpen: collusionTabOpened,
            onClose: collusionTabClosed,
            onReady: collusionTabReady,
            onActivate: collusionTabActivate,
            onDeactivate: collusionTabDeactivate
        });
    }
    // if we're on the collusion tab, close it
    if (tab === tabs.activeTab){
        tab.close();
    }else{
        // otherwise, switch to this tab
        tab.activate();
    }
}

// Set up the status bar button to open the main UI page:
var widget = require("widget").Widget({
    id: "collusion_Widget",
    label: "Show Collusion",
    contentURL: data.url("favicon.ico"),
    onClick: function() {
        openOrSwitchToOrClose(mainPage);
    }
});

// attachToExistingCollusionPages();

