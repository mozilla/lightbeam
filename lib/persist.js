/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global console, require, exports */
// All writes to storage and upload logic in the addon process goes here.
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

// Upload logic.
function serializeConnections(connections) {
  let exportSet = {
    format: 'Lightbeam Save File',
    version: '1.2',
    userId: storage.userId,
    userAgentData: getUserAgentData(),
    uploadTime: Date.now(),
    connections: connections
  };
  console.debug(JSON.stringify(exportSet));
  return JSON.stringify(exportSet);
}

function getUserAgentData() {
  let retval = {};
  let app = require("sdk/system/xul-app");
  retval.appname = app.name;
  retval.fxVersion = app.version;
  let prefService = require("sdk/preferences/service");
  let prefs = [ "app.update.channel",
                "network.cookie.behavior",
                "privacy.donottrackheader.enabled",
                "privacy.donottrack.header.value" ];
  prefs.forEach(function(p) { retval[p] = prefService.get(p); });
  retval.addons = getAddons();
  console.debug(JSON.stringify(retval));
  return retval;
}

function getAddons() {
  const { Cu } = require('chrome');
  let { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");
  let addons = [];
  AddonManager.getAllAddons(function(addonList) {
    addonList.forEach(function(addon) {
      let o = {};
      let states = ['id', 'name', 'appDisabled', 'isActive', 'type',
                    'userDisabled'];
      states.forEach(function(state) { o[state] = addon[state]; });
      addons.push(o);
    });
  });
  console.debug(JSON.stringify(addons));
  return addons;
}

function upload(connections) {
  console.debug("received upload event in addon");
  let uploadServer = 'https://data.mozilla.com/submit/lightbeam';
  let request = Request({
    url: uploadServer,
    contentType: "application/json",
    onComplete: function (response) {
      let status = Number(response.status);
      if (status >= 200 && status < 300) {
        console.log("successful upload: ", response.text);
      } else {
        // Ignore errors for now. We could save last upload time and try
        // uploading again the ones that failed previously.
        console.log("error uploading: ", status, response.text);
      }
    },
    content: serializeConnections(connections)
  });
  request.post();
}

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
  if (prefs.contributeData) {
    upload(connections);
  }
};

// Reset stored state, including preferences
exports.reset = function reset() {
  storage.connections.length = 0;
  storage.blockmap = {};
  storage.userId = generateUserId();
  prefs.contributeData = false;
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
