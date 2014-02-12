"use strict";

const events = require("sdk/system/events");
const { PageMod } = require("sdk/page-mod");

const { Connection, addConnection } = require('./connection');
const tabEvents = require('./tab/events');
const ui = require('./ui');

// This is the heart of Lightbeam, we get all of our data from observing these
// requests.
events.on("http-on-examine-response", function(subject) {
    var connection = Connection.fromSubject(subject);
    if (connection.valid){
        addConnection(connection);
    }
}, true);

// Enables us to see log messages on console, not on web log.
Connection.on('log', function(message){
    ui.emit('log', message);
});


// This is not currently supported. The purpose is to visualize per-tab
// connections.
function matchesCurrentTab(connection){
    // this is a tabinfo object
    var tabinfo = this;
    if (!tabinfo) return false;
    if (!tabinfo.uri) return false;
    if (tabinfo.uri.spec === ui.mainPage){ return false; }
    return (connection._sourceTab === tabinfo.tab) && (connection.timestamp > tabinfo.loadTime);
}


// This lets us hook into page load events and communicate to page workers.
PageMod({
    include: ui.mainPage,
    contentScriptWhen: 'ready',
    contentScriptFile: ui.contentScript,
    onAttach: ui.attachToLightbeamPage
});




