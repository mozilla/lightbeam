'use strict';

const tabs = require('tabs');
const { data } = require("self");

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

