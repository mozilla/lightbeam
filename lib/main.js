"use strict";

let obSvc = require('sdk/deprecated/observer-service');
let { Connection } = require('./connection');
let tabEvents = require('./tab/events');
// var prefs = require('simple-prefs').prefs;
// var url = require('url');
// var data = require("self").data;
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


// Add Menu item and widget for opening collusion
//
// 1. There should never be two Collusion tabs open
// 2. We should be able to switch to the Collusion tab if it exists
// 3. We should be able to close the Collusion tab if it is open

let tabs = require('tabs');
let data = require("self").data;
let mainPage = data.url("index.html");
let workers = [];

function attachToCollusionPage(worker) {
  /* Set up channel of communication between this add-on and the script (content-script.js)
   * that we attached to the web page running the Collusion UI. */
    // FIXME, this is drawn directly from old Collusion
    workers.push(worker);
    if (workers.length > 1){
        console.log('WARNING: We should not have more than one worker here');
    }
    worker.on("detach", function() {
        workers.splice(workers.indexOf(worker), 1);
    });
    worker.port.on("init", function() {
        worker.port.emit("updateAllConnections", JSON.stringify(allConnections));
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
}


function attachToExistingCollusionPages() {
    var tab = getCollusionTab();
    if (tab){
        var worker = tab.attach({
            contentScriptFile: data.url('content-script.js')
        });
        attachToCollusionPage(worker);
    }
}

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

function openOrSwitchToOrClose(url){
    // is there a tab open for Collusion?
    console.log('Collusion is trying to open ' + url);
    var tab = getCollusionTab();
    // if not, open one
    if (!tab){
        console.log('Collusion did not find an open Collusion tab');
        return tabs.open({url: url});
    }
    // if we're on the collusion tab, close it
    if (tab === tabs.activeTab){
        console.log('Collusion is closing the open tab');
        tab.close();
    }
    else{
        // otherwise, switch to this tab
        console.log('Collusion is switching to the open tab');
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
