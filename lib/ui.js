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
}

function collusionTabClosed(tab){
    //console.error('collusionTabClosed: ', tab);
    // Stop all Collusion processes, close worker(s)
}

function collusionTabReady(tab){
    //console.error('collusionTabReady: ', tab);
    // add-on page should be ready to go, attach scripts
    // var worker = attachToExistingCollusionPages(tab);
    // worker.port.emit('log', 'collusionTabReady');
    // worker.port.emit('init', allConnections || []); // FIXME: Send appropriate data
}

function collusionTabActivate(tab){
    //console.error('collusionTabActivate: ', tab);
    // restart any paused processing, send data through that has changed since pause
}

function collusionTabDeactivate(tab){
    //console.error('collusionTabDeactivate: ', tab);
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

    worker.port.on('uiready', function(){
        worker.port.emit('log', 'addon received uiready');
        Connection.on('restored', onRestored);
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
        var firstTimestamp = new Date(allConnections[0].timestamp);
        var localTimeSince = firstTimestamp.getFullYear() + "-" +
                  (firstTimestamp.getMonth() + 1) + "-" +
                  firstTimestamp.getDate() + " " +
                  firstTimestamp.getHours() + ":" +
                  firstTimestamp.getMinutes() + ":" +
                  firstTimestamp.getSeconds();

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
    label: "Show Collusion",
    contentURL: data.url("favicon.ico"),
    onClick: function() {
        openOrSwitchToOrClose(mainPage);
    }
});

