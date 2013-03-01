'use strict';

const tabs = require('tabs');
const { data } = require("self");
let { Connection, saveConnections, exportFormat } = require('./connection');

const mainPage = data.url("index.html");
const contentScript = data.url('content-script.js');
let uiworker = null;
let allConnections = null;

exports.mainPage = mainPage;
exports.contentScript = contentScript;
exports.attachToCollusionPage = attachToCollusionPage;
exports.on = function(eventname, handler){
    uiworker.port.on(eventname, handler);
}
exports.emit = function(eventname, arg1, arg2, arg3){
    if (uiworker){
        uiworker.port.emit(eventname, arg1, arg2, arg3);
    }else{
        console.log('no uiworker to receive %s', eventname);
    }
}

// Begin tab handlers
// FIXME: Move tab handlers into a tab component
// And specify what we're trying to do with it

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
    // var worker = attachToExistingCollusionPages(tab);
    // worker.port.emit('log', 'collusionTabReady');
    // worker.port.emit('init', allConnections || []); // FIXME: Send appropriate data
}

function collusionTabActivate(tab){
    console.log('collusionTabActivate: ', tab);
    // restart any paused processing, send data through that has changed since pause
}

function collusionTabDeactivate(tab){
    console.log('collusionTabDeactivate: ', tab);
    // pause processing, queue data to be processed on reactivate
}


// End tab handlers


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
        allConnections.length = 0;
    });
    worker.port.on('uiready', function(){
        // worker.port.emit('log', 'addon received uiready: "' + JSON.stringify(allConnections) + '"');
        Connection.on('restored', function(connections){
            console.log('ui received Connection.restored');
            allConnections = connections;
            worker.port.emit('init', allConnections); // FIXME, should used filtered connections
        });
    });
    Connection.on('connection', function(connection){
        worker.port.emit('connection', connection);
    });

    worker.port.on('debug', function(){
        var { filteredConnections } = require('./connection');
        worker.port.emit('log', 'There are ' + allConnections.length + ' connections stored');
        worker.port.emit('log', 'There are ' + filteredConnections().length  +' filtered connections');
    });

    worker.port.on('export', function(){
        worker.port.emit('log', 'exporting data from addon');
        worker.port.emit('export-data', exportFormat());
    });

    worker.port.on('upload', function(){
        Connection.emit('upload');
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

