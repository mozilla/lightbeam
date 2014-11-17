/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global console, require, exports */
// All writes to storage in the addon process goes here.
"use strict";

const ss = require('sdk/simple-storage');
const Request = require("sdk/request").Request;
const prefs = require("sdk/simple-prefs").prefs;

var storage = ss.storage;

// Only these keys may exist as maps on ss.storage. Everything else is legacy.
const STORAGE_KEYS = [
  "blockmap",
  "connections",
];

// Delete oldest connections. When we hit the simple storage quota limit,
// Firefox throws an exception that the user won't see.  We tried switching to
// indexdb (which is async) but abandoned it. localForage may be a viable
// substitute.
function checkStorageQuota() {
  while (ss.quotaUsage > 1) {
    var sliceStart = ss.storage.connections.length / 2;
    ss.storage.connections = ss.storage.connections.slice(sliceStart);
  }
}

// Flush connections to simple-storage.
exports.storeConnections = function storeConnections(connections) {
  checkStorageQuota();
  storage.connections = storage.connections.concat(connections);
};

// Reset stored state, including preferences
exports.reset = function reset() {
  storage.connections.length = 0;
  storage.blockmap = {};
  storage.userId = generateUserId();
  prefs.defaultVisualization = "graph";
  prefs.defaultFilter = "daily";
};

// Generate a new user id.
function generateUserId() {
  // Short hex string.
  let userId = Math.floor(0xFFFFFFFF * Math.random()).toString(16);
  storage.userId = userId + ":" + Date.now();
  return storage.userId;
}

// Possibly rotate the user id.
function maybeRotateUserId(forceChange) {
  let parts = storage.userId.split(":");
  // 90 days in ms
  let MAX_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;
  let timeToChange = Date(parts[1] + MAX_LIFETIME_MS);
  if (forceChange || Date.now() >= timeToChange) {
    generateUserId();
  }
}

// Initialize all of our storage
if (!storage.connections) {
  storage.connections = [];
}

if (!storage.blockmap) {
  storage.blockmap = {};
}

if (!storage.userId) {
  generateUserId();
}

// Rotate user id if necessary
maybeRotateUserId();

console.log('Current quota usage:', Math.round(ss.quotaUsage * 100));
