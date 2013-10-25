'use strict';


const { browserWindows } = require('sdk/windows');
const { windows } = require('sdk/window/utils');
const tabs = require('sdk/tabs');
const { data } = require("sdk/self");
const { isPrivate } = require("sdk/private-browsing");
const { Widget } = require("sdk/widget");
const { Connection } = require('./connection');
const { ContentPolicy } = require('shared/policy');
const ss = require('sdk/simple-storage');
// const {components} = require('chrome');
// components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

const mainPage = data.url("index.html");
const contentScript = data.url('content-script.js');
let uiworker = null;
let tempConnections = [];


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
        console.error('no uiworker to receive ' + eventname);
    }
}

// Begin tab handlers
// FIXME: Move tab handlers into a tab component
// And specify what we're trying to do with it

function collusionTabOpened(tab){
    //console.error('collusionTabOpened: ', tab);
    menuitem.label = "Close Lightbeam";
    widget.tooltip = "Close Lightbeam";
}

function collusionTabClosed(tab){
    //console.error('collusionTabClosed: ', tab);
    menuitem.label = "Show Lightbeam";
    widget.tooltip = "Show Lightbeam";
    // Stop all Collusion processes, close worker(s)
}

function collusionTabReady(tab){
    //console.error('collusionTabReady: ', tab);
    menuitem.label = "Close Lightbeam";
    widget.tooltip = "Close Lightbeam";
    // add-on page should be ready to go, attach scripts
    // var worker = attachToExistingCollusionPages(tab);
    // worker.port.emit('log', 'collusionTabReady');
}

function collusionTabActivate(tab){
    //console.error('collusionTabActivate: ', tab);
    menuitem.label = "Close Lightbeam";
    widget.tooltip = "Close Lightbeam";
    // restart any paused processing, send data through that has changed since pause
}

function collusionTabDeactivate(tab){
    //console.error('collusionTabDeactivate: ', tab);
    menuitem.label = "Switch to Lightbeam Tab";
    widget.tooltip = "Switch to Lightbeam Tab";
    // pause processing, queue data to be processed on reactivate
}


// End tab handlers

if (!ss.storage.blockmap){
    ss.storage.blockmap = {};
}
const blockmap = ss.storage.blockmap;
var blocksites = Object.keys(blockmap);
console.error('log', 'blocking ' + blocksites.length + ' sites');

ContentPolicy({
  description: "Blocks user-defined blocklist from Lightbeam UI",
  shouldLoad: function({location: location, origin: origin}) {
    // ignore URIs with no host
    try {
      var topLevelDomain = Connection.getDomain(location.host);
    }
    catch(e) {
      // See Issue 374: https://github.com/mozilla/collusion/issues/374
      // if there is no host, like in about:what, then the host getter throws
      return true;
    }

    if (blockmap[topLevelDomain]){
        // Connection.emit('log', 'blocked ' + location + ' on origin ' + origin);
        return false;
    }
    return true;
  }
});


// function handlePrivateWindow(window) {
//     console.log('handlePrivateWindow'); // %o', window);
//   if (PrivateBrowsingUtils.isWindowPrivate(window) && uiworker) {
//     console.log('window is private and ui worker exists');
//     uiworker.port.emit("private-browsing");
//     console.log('message sent');
//     return true;
//   }
// }
// function hasPrivateWindow() {
//   var wins = windows(null, { includePrivate: true });
//   console.log('hasPrivateWindow, there are %s windows to check', wins.length);
//   for ( var i = 0; i < wins.length; i++){
//     if ( handlePrivateWindow(wins[i]) ) {
//         console.log('Found one');
//         break; // the presence of a Private Window has been detected
//     }
//   }
// }

// // if there is a private window opened while the collusion tab is open,
// // then alert the user about it.
// browserWindows.on('open', handlePrivateWindow);

function handlePrivateWindow(window) {
    console.error('handlePrivateWindow: %o', window);
  if (isPrivate(window) && uiworker) {
    console.error('window is private and uiworker exists');
    uiworker.port.emit("private-browsing");
    console.error('sent message');
    return true;
  }
}

// if there is a private window opened while the collusion tab is open,
// then alert the user about it.
browserWindows.on('open', handlePrivateWindow);

function hasPrivateWindow() {
  var wins = windows(null, { includePrivate: true });
  console.error('hasPrivateWindow: %s windows to test', wins.length);
  for ( var i=0; i<wins.length; i++){
    if ( handlePrivateWindow(wins[i]) ) {
        break; // the presence of a Private Window has been detected
    }
  }
}

function attachToCollusionPage(worker) {
  /* Set up channel of communication between this add-on and the script (content-script.js)
   * that we attached to the web page running the Collusion UI. */
    // FIXME, this is drawn directly from old Collusion
    // worker.port.emit('log', 'attaching worker');

    uiworker = worker;

    var onRestored = function(){
        ss.storage.collusionToken = ss.storage.collusionToken ? ss.storage.collusionToken : require('sdk/util/uuid').uuid().toString();
        if (ss.storage.graph){
            // handle old data format
            worker.port.emit('promptToSaveOldData', ss.storage.graph);
            // delete old data
            delete ss.storage.graph;
            delete ss.storage.blocklist;
            delete ss.storage.whitelist;
        }
        if ( tempConnections && tempConnections.length > 0 ){
            worker.port.emit("log", "tempConnections.length = " + tempConnections.length);
            worker.port.emit("passTempConnections", tempConnections);
        }
        Connection.emit("toggleStore", false);
        worker.port.emit('log', 'Connection received restored');
        worker.port.emit('init', ss.storage.collusionToken);
    };

    var onTempConnections = function(tempConn){
        tempConnections = tempConn;
    };

    var onUIReady = function(){
        worker.port.emit('log', 'addon received uiready');
        Connection.on('restored', onRestored);
    }

    var onTempConnectionTransferred = function(result){
        Connection.emit('clearStoredTempConnections', result);
    }

    var onConnection = function(connection){
        //console.error('connection: ' + connection);
        try{
            worker.port.emit('connection', connection);
        }catch(e){
            console.error('Exception caught. Worker: ' + Object.keys(worker).join(','));
        }
    };

    function onWorkerReset(){
        // console.error('UI called reset');
        Connection.emit('reset');
    }

    function onWorkerUpdateBlocklist(site, blockFlag){
        if (blockFlag){
            if (blockmap[site]){
                /* do nothing */
            }else{
                blockmap[site] = true;
            }
        }else{
            if (!blockmap[site]){
                /* do nothing */
            }else{
                delete blockmap[site];
            }
        }

        uiworker.port.emit('update-blocklist', { domain: site, flag: blockFlag });
    }

    worker.port.emit('update-blocklist-all', Object.keys(blockmap).map(function(site) {
      return { domain: site, flag: blockmap[site] };
    }));

    function log(message){
        worker.port.emit('log', message);
    }

    Connection.on('log', log);

    function onWorkerDetach(){
        // console.error('detaching collusion view');
        Connection.off('restored', onRestored);
        Connection.off('connection', onConnection);
        Connection.off('tempConnections', onTempConnections);
        Connection.off('log', log);
        Connection.emit("toggleStore", true);

        this.port.removeListener('reset', onWorkerReset);
        this.port.removeListener('uiready', onUIReady);
        this.port.removeListener('updateBlocklist', onWorkerUpdateBlocklist);
        this.port.removeListener('tempConnectionTransferred', onTempConnectionTransferred);
        uiworker = null;
        this.destroy();
    }

    worker.on("detach", onWorkerDetach);
    worker.port.on("reset", onWorkerReset);
    worker.port.on('uiready', onUIReady);
    worker.port.on('updateBlocklist', onWorkerUpdateBlocklist);
    worker.port.on("tempConnectionTransferred", onTempConnectionTransferred);

    // if there is a private window open, then alert the user about it.
    hasPrivateWindow();

    Connection.on('tempConnections', onTempConnections);
    Connection.on('connection', onConnection);
}


function getCollusionTab() {
    for each (let tab in tabs) {
        if (tab.url.slice(0,mainPage.length) === mainPage){
            return tab;
        }
    }
}
exports.getCollusionTab = getCollusionTab;

 // Set up the menu item to open the main UI page:
var menuitem = require("shared/menuitems").Menuitem({
    id: "lightbeam_openUITab",
    menuid: "menu_ToolsPopup",
    label: "Show Lightbeam",
    onCommand: function() {
        openOrSwitchToOrClose();
    },
    insertbefore: "sanitizeItem",
    image: data.url("icons/lightbeam_logo-only_16x16.png")
});

function openOrSwitchToOrClose(){
    // is there a tab open for Collusion?
    var tab = getCollusionTab();
    // if not, open one
    if (!tab){
        return tabs.open({
            url: mainPage,
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
        // bring Collusion window/tab to the front
        tab.activate();
        tab.window.activate();
    }
}
exports.openOrSwitchToOrClose = openOrSwitchToOrClose;

// Set up the status bar button to open the main UI page:
var widget = Widget({
    id: "lightbeam_Widget",
    label: "Lightbeam",
    tooltip: "Show Lightbeam",
    contentURL: data.url("icons/lightbeam_logo-only_16x16.png"),
    onClick: function() {
        openOrSwitchToOrClose();
    }
});

