'use strict';

const tabs = require('tabs');
const { data } = require("self");

// Add Menu item and widget for opening collusion
//
// 1. There should never be two Collusion tabs open
// 2. We should be able to switch to the Collusion tab if it exists
// 3. We should be able to close the Collusion tab if it is open

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

function getCollusionTab() {
    for(var i = 0, l = tabs.length; i < l; i++){
        let tab = tabs[i];
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
var widget = require("sdk/widget").Widget({
    id: "collusion_Widget",
    label: "Show Collusion",
    contentURL: data.url("favicon.ico"),
    onClick: function() {
        openOrSwitchToOrClose(mainPage);
    }
});
