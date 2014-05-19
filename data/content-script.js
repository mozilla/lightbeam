/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function (global) {

// This is the e10s/message passing content script that ties the workers to the
// addon. It can see most of the addon, the window is either not visible or not
// mutable so we use unsafeWindow below. This handles the post message
// connections and does a little UI work on the side.
self.port.on('connection', function (connection) {
  global.allConnections.push(connection);
  global.aggregate.emit('connection', connection);
});

self.port.on('passStoredConnections', function (connections) {
  global.allConnections = connections;
  global.aggregate.emit('load', global.allConnections);
});

self.port.on('update-blocklist', function (domain) {
  global.aggregate.emit('update-blocklist', domain);
});

self.port.on('update-blocklist-all', function (domains) {
  global.aggregate.emit('update-blocklist-all', domains);
});

self.port.on('init', function () {
  console.debug('content-script::init()');
  global.aggregate.emit('load', global.allConnections);
});

self.port.on("updateUIFromMetadata", function (metadata) {
  console.debug("Got add-on metadata", metadata);
  global.aggregate.emit("updateUIFromMetadata", metadata);
});

self.port.on("updateUIFromPrefs", function (prefs) {
  console.debug("Got set prefs", prefs);
  global.aggregate.emit("updateUIFromPrefs", prefs);
});

})(this);
