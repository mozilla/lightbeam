(function(global) {
    let obSvc = require('observer-service');
    let Connection = require('connection').Connection;
    let tabs = require('tabs');
    let { Cc, Ci, Cr } = require('chrome');
    let winutils = require('api-utils/window/utils');
    // var prefs = require('simple-prefs').prefs;
    // var url = require('url');
    // var data = require("self").data;
    // var xhr = require("xhr");
    // var timers = require("timers");
    // var privateBrowsing = require("private-browsing");
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

    tabs.on('activate', function(jptab){
        var tabinfo = getTabInfo(jptab);
        var tab = tabinfo.tab;
        var items = currentConnectionsForTab(tabinfo);
        // visualize items
        console.log('this tab matched ' + items.length + ' items');
    });

    // Tab Listener Component
    // Iterate through all windows to set tab listeners, then listen for new window
    var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    function getTabInfo(jpTab){
        // Yeah, this seems to be working! Now I just need to save data sets by tab, and get the load time for the tab
        var chromeWindow = wm.getMostRecentWindow('navigator:browser');
        var gBrowser = chromeWindow.gBrowser;
        var window = gBrowser.contentWindow.wrappedJSObject;
        return {
            gBrowser: gBrowser,
            tab: gBrowser.selectedTab,
            document: gBrowser.contentDocument,
            window: window,
            title: gBrowser.contentTitle, // nsIPrincipal
            principal: gBrowser.contentPrincipal, // security context
            uri: gBrowser.contentURI, // nsURI .spec to get string representation
            loadTime: window.performance.timing.responseStart // milliseconds at which page load was initiated
        };
    }


    function matchesTab(connection){
        return connection._sourceTab === this;
    }

    function matchesCurrentTab(connection){
        return (connection._sourceTab === this.tab) && (connection.timestamp > this.loadTime);
    }

    function connectionsForTab(tab){
        return allConnections.filter(matchesTab, tab);
    }

    function currentConnectionsForTab(tabinfo){
        return allConnections.filter(matchesCurrentTab, tabinfo);
    }


})(this);
