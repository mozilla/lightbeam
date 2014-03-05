// This is the e10s/message passing content script that ties the workers to the
// addon. It can see most of the addon, the window is either not visible or not
// mutable so we use unsafeWindow below. This handles the post message
// connections and does a little UI work on the side.
self.port.on('log', function log(args) {
    console.log(args);
});

self.port.on('connection', function(connection) {
    allConnections.push(connection);
    aggregate.emit('connection', connection);
});

self.port.on('update-blocklist', function(domain) {
    console.log("in update-blocklist in content-script.js");
    aggregate.emit('update-blocklist', domain);
});

self.port.on('update-blocklist-all', function(domains) {
    console.log("in update-blocklist-all in content-script.js");
    aggregate.emit('update-blocklist-all', domains);
});

self.port.on('init', function(lightbeamToken) {
    console.log('content-script::init()');
    // localStorage.lightbeamToken = lightbeamToken;

    allConnections = getAllConnections();
    aggregate.emit('load', allConnections);

    // FIXME: temporary solution for now.  need to clean up the code
/*
    if (unsafeWindow && unsafeWindow.showPromptToShareDialog) {
        unsafeWindow.showPromptToShareDialog();
    } else {
        console.error('cannot call unsafeWindow.showPromptToShare: %s', unsafeWindow);
    }
*/
});


self.port.on("passTempConnections", function(connReceived) {
    console.log("in passTempConnections in content-script.js");
    // connReceived can be an empty array [] or an array of connection arrays [ [], [], [] ]
    self.port.emit("tempConnectionTransferred", true);

    localStorage.lastSaved = Date.now();

/*
    var nonPrivateConnections = connReceived.filter(function(connection) {
        return (connection[unsafeWindow.FROM_PRIVATE_MODE] == false);
    });
    unsafeWindow.saveConnectionsByDate(nonPrivateConnections);
*/
});

self.port.on("promptToSaveOldData", function(data) {
    console.log("in promptToSaveOldData in content-script.js");
    //unsafeWindow.promptToSaveOldDataDialog(data);
});

function getAllConnections() {
    var allConnectionsAsArray = [];
    Object.keys(localStorage).sort().forEach(function(key) {
        if (key.charAt(0) == "2") { // date keys are in the format of yyyy-mm-dd
            var conns = JSON.parse(localStorage.getItem(key));
            allConnectionsAsArray = allConnectionsAsArray.concat(conns);
        }
    });
    console.log('returning %s connections from getAllConnections', allConnectionsAsArray.length);
    return allConnectionsAsArray;
}

self.port.on("private-browsing", function() {
    //unsafeWindow.informUserOfUnsafeWindowsDialog();
});

/*
WTF?!!
try {
    unsafeWindow.addon = self.port;
} catch (e) {
    console.error('unable to add "addon" to unsafeWindow: %s', e);
}
*/
