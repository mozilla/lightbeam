'use strict';

const tabs = require('tabs');
const { data } = require("self");
let { Connection, saveConnections, exportFormat } = require('./connection');

const mainPage = data.url("index.html");
const contentScript = data.url('content-script.js');
let uiworker = null;
let allConnections = null;
let tempConnections = null;

var ss = require('simple-storage');
var storage = ss.storage;

exports.mainPage = mainPage;
exports.contentScript = contentScript;
exports.attachToCollusionPage = attachToCollusionPage;
exports.on = function(eventname, handler){
    if (uiworker){
        uiworker.port.on(eventname, handler);
    }else{
        console.error('no uiworker to subscript to order');
    }
}
exports.emit = function(eventname, arg1, arg2, arg3){
    if (uiworker){
        uiworker.port.emit(eventname, arg1, arg2, arg3);
    }else{
        console.error('no uiworker to receive %s', eventname);
    }
}

// Begin tab handlers
// FIXME: Move tab handlers into a tab component
// And specify what we're trying to do with it

function collusionTabOpened(tab){
    //console.error('collusionTabOpened: ', tab);
    menuitem.label = "Close Collusion";
    widget.tooltip = "Close Collusion";
}

function collusionTabClosed(tab){
    //console.error('collusionTabClosed: ', tab);
    menuitem.label = "Show Collusion";
    widget.tooltip = "Show Collusion";
    // Stop all Collusion processes, close worker(s)
}

function collusionTabReady(tab){
    //console.error('collusionTabReady: ', tab);
    menuitem.label = "Close Collusion";
    widget.tooltip = "Close Collusion";
    // add-on page should be ready to go, attach scripts
    // var worker = attachToExistingCollusionPages(tab);
    // worker.port.emit('log', 'collusionTabReady');
    // worker.port.emit('init', allConnections || []); // FIXME: Send appropriate data
}

function collusionTabActivate(tab){
    //console.error('collusionTabActivate: ', tab);
    menuitem.label = "Close Collusion";
    widget.tooltip = "Close Collusion";
    // restart any paused processing, send data through that has changed since pause
}

function collusionTabDeactivate(tab){
    //console.error('collusionTabDeactivate: ', tab);
    menuitem.label = "Switch to Collusion Tab";
    widget.tooltip = "Switch to Collusion Tab";
    // pause processing, queue data to be processed on reactivate
}


// End tab handlers


function attachToCollusionPage(worker) {
  /* Set up channel of communication between this add-on and the script (content-script.js)
   * that we attached to the web page running the Collusion UI. */
    // FIXME, this is drawn directly from old Collusion
    // worker.port.emit('log', 'attaching worker');

    uiworker = worker;

    worker.on("detach", function() {
        console.error('detaching collusion view');
        Connection.off('restored', onRestored);
        Connection.off('connection', onConnection);
        Connection.off('tempConnections', onTempConnections);
        Connection.emit("toggleStore", true);
        uiworker = null;
    });

    worker.port.on("reset", function() {
        console.error('UI called reset');
        Connection.emit('reset');
        allConnections.length = 0;
    });

    var onRestored = function(connections){
        worker.port.emit('log', 'Connection received restored');
        allConnections = connections;
        worker.port.emit('init', allConnections); // FIXME, should use filtered connections
    };

    var onTempConnections = function(tempConn){
        worker.port.emit("log", "omggggggggg====");
//        worker.port.emit("log", tempConn);
        tempConnections = tempConn;
    };
    
    Connection.on('tempConnections', onTempConnections);

    worker.port.on('uiready', function(){
        worker.port.emit('log', 'addon received uiready');
        Connection.on('restored', onRestored);
        worker.port.emit("sendTempConnections", tempConnections);
//        storage.tempConnections.length = 0;
        Connection.emit("toggleStore", false);
    });
    
    worker.port.on("tempConnecitonTransferred", function(result){
        worker.port.emit("log", "+++ transferred ++++++++++++ " + result);
        Connection.emit("clearStoredTempConnections", result);
    });
    
    worker.port.on('setFilter', function(filtername, filterarg){
        Connection.emit('setConnectionFilter', filtername, filterarg);
    });

    var onConnection = function(connection){
        //console.error('connection: ' + connection);
        try{
            worker.port.emit('connection', connection);
        }catch(e){
            console.error('Exception caught. Worker: ' + Object.keys(worker).join(','));
        }
    };

    Connection.on('connection', onConnection);

    worker.port.on('debug', function(){
        var { filteredConnections } = require('./connection');
        worker.port.emit('log', 'There are ' + allConnections.length + ' connections stored');
        worker.port.emit('log', 'There are ' + filteredConnections().length  +' filtered connections');
    });

    worker.port.on('export', function(){
        worker.port.emit('log', 'exporting data from addon');
        worker.port.emit('export-data', exportFormat());
    });

    worker.port.on('startUpload', function(){
        Connection.emit('startUpload');
    });

    worker.port.on('stopUpload', function(){
        Connection.emit('stopUpload');
    });

    worker.port.on("summarize", function(){
        var firstTimestamp = new Date(allConnections[0].timestamp || allConnections[0][Connection.TIMESTAMP]);
        var localTimeSince = firstTimestamp.getFullYear() + "-" +
            ("0" + (firstTimestamp.getMonth() + 1)).slice(-2) + "-" + // make sure the following are in 2-digit format
            ("0" + firstTimestamp.getDate()).slice(-2) + " " +
            ("0" + firstTimestamp.getHours()).slice(-2) + ":" +
            ("0" + firstTimestamp.getMinutes()).slice(-2) + ":" +
            ("0" + firstTimestamp.getSeconds()).slice(-2);

        var summary = {};
        summary.localTimeSince = localTimeSince;
        summary.numConnections = allConnections.length;

        worker.port.emit("displaySummary", summary);
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
    label: "Collusion",
    tooltip: "Show Collusion",
    contentURL: data.url("favicon.ico"),
    onClick: function() {
        openOrSwitchToOrClose(mainPage);
    }
});

