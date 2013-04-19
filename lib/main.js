"use strict";

const obSvc = require('sdk/deprecated/observer-service');
const {Connection, allConnections, addConnection } = require('./connection');
const tabEvents = require('./tab/events');
const ui = require('./ui');
const addontab = require("sdk/addon-page");
const {mainPage, contentScript, attachToCollusionPage } = require('ui');


obSvc.add("http-on-examine-response", function(subject) {
    var connection = Connection.fromSubject(subject);
    if (connection.valid){
        addConnection(connection);
    }
});

tabEvents.on('activate', function(tabinfo){
    var items = currentConnectionsForTab(tabinfo);
    // visualize items if we have a per-tab view
});

Connection.on('log', function(message){
    ui.emit('log', message);
});


function matchesCurrentTab(connection){
    // this is a tabinfo object
    var tabinfo = this;
    if (!tabinfo) return false;
    if (!tabinfo.uri) return false;
    if (tabinfo.uri.spec === ui.mainPage){ return false; }
    return (connection._sourceTab === tabinfo.tab) && (connection.timestamp > tabinfo.loadTime);
}

function currentConnectionsForTab(tabinfo){
    return allConnections.filter(matchesCurrentTab, tabinfo);
}


require("page-mod").PageMod({
    include: ui.mainPage,
    contentScriptWhen: 'start',
    contentScriptFile: ui.contentScript,
    onAttach: ui.attachToCollusionPage
});




