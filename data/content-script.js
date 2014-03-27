// This is the e10s/message passing content script that ties the workers to the
// addon. It can see most of the addon, the window is either not visible or not
// mutable so we use unsafeWindow below. This handles the post message
// connections and does a little UI work on the side.
self.port.on('log', function log(args) {
    if (unsafeWindow && unsafeWindow.console) {
        unsafeWindow.console.log.call(unsafeWindow, args);
    } else {
        console.log('cannot call browser logging: ' + unsafeWindow);
    }
});

self.port.on('connection', function(connection) {
    if (unsafeWindow && unsafeWindow.aggregate) {
        unsafeWindow.allConnections.push(connection);
        unsafeWindow.aggregate.emit('connection', connection);
    } else {
        console.log('cannot call unsafeWindow.aggregate: ' + unsafeWindow);
    }
});

self.port.on('update-blocklist', function(domain) {
    if (unsafeWindow && unsafeWindow.aggregate) {
        unsafeWindow.aggregate.emit('update-blocklist', domain);
    } else {
        console.log('cannot call unsafeWindow.aggregate to update blocklist: ' + unsafeWindow);
    }
});

self.port.on('update-blocklist-all', function(domains) {
    if (unsafeWindow && unsafeWindow.aggregate) {
        unsafeWindow.aggregate.emit('update-blocklist-all', domains);
    } else {
        console.log('cannot call unsafeWindow.aggregate to update blocklist: ' + unsafeWindow);
    }
});

self.port.on('init', function(lightbeamToken) {
    console.error('content-script::init()');

    if (unsafeWindow && unsafeWindow.aggregate && !unsafeWindow.aggregate.initialized) {
        unsafeWindow.aggregate.emit('load', unsafeWindow.allConnections);
    } else {
        console.error('cannot call unsafeWindow.aggregate: %s', unsafeWindow);
    }
});

self.port.on("private-browsing", function() {
    unsafeWindow.informUserOfUnsafeWindowsDialog();
});

try {
    unsafeWindow.addon = self.port;
} catch (e) {
    console.error('unable to add "addon" to unsafeWindow: %s', e);
}
