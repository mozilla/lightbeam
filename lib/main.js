"use strict";

const obSvc = require('sdk/deprecated/observer-service');
const {Connection, allConnections, saveConnections, addConnection } = require('./connection');
const tabEvents = require('./tab/events');
const {mainPage, contentScript, attachToCollusionPage} = require('ui');


obSvc.add("http-on-examine-response", function(subject) {
    var connection = new Connection(subject);
    if (connection.valid){
        addConnection(connection);
    }
});

tabEvents.on('activate', function(tabinfo){
    var items = currentConnectionsForTab(tabinfo);
    // visualize items if we have a per-tab view
});


function matchesCurrentTab(connection){
    // this is a tabinfo object
    var tabinfo = this;
    if (!tabinfo) return false;
    if (!tabinfo.uri) return false;
    if (tabinfo.uri.spec === mainPage){ return false; }
    return (connection._sourceTab === tabinfo.tab) && (connection.timestamp > tabinfo.loadTime);
}

function currentConnectionsForTab(tabinfo){
    return allConnections.filter(matchesCurrentTab, tabinfo);
}


require("page-mod").PageMod({
    include: mainPage,
    contentScriptWhen: 'start',
    contentScriptFile: contentScript,
    onAttach: attachToCollusionPage
});

// FIXME: Move below into a tab component
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
    var worker = attachToExistingCollusionPages(tab);
    // worker.port.emit('log', 'collusionTabReady');
    worker.port.emit('init', allConnections || []); // FIXME: Send appropriate data
}

function collusionTabActivate(tab){
    console.log('collusionTabActivate: ', tab);
    // restart any paused processing, send data through that has changed since pause
}

function collusionTabDeactivate(tab){
    console.log('collusionTabDeactivate: ', tab);
    // pause processing, queue data to be processed on reactivate
}



