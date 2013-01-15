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
		console.log(connection);
        allConnections.push(connection);
    });

	tabs.on('activate', function(tab){
	    getCurrentTab(tab);
	});

	// Tab Listener Component
	// Iterate through all windows to set tab listeners, then listen for new window
	var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    function getCurrentTab(jpTab){
        var currentDomWindow = wm.getMostRecentWindow('navigator:browser');
        var gBrowser = currentDomWindow.gBrowser;
        var currentTab = gBrowser.selectedTab;
        console.log('Current tab: ', Object.keys(currentTab).join(', '));
        allConnections.forEach(function(connection){
            if (connection === currentTab){
                console.log(connection);
            }
        });
    }


})(this);
