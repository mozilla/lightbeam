(function(global) {
    let obSvc = require('observer-service');
    let Connection = require('connection').Connection;
    let chrometab = require('chrometab');
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

    chrometab.on('activate', function(tabinfo){
        var items = currentConnectionsForTab(tabinfo);
        // visualize items
        console.log('this tab matched ' + items.length + ' items');
    });


    function matchesCurrentTab(connection){
        return (connection._sourceTab === this.tab) && (connection.timestamp > this.loadTime);
    }

    function currentConnectionsForTab(tabinfo){
        return allConnections.filter(matchesCurrentTab, tabinfo);
    }


})(this);
