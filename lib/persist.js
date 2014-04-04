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
]

// Upload logic.
function serializeConnections(connections) {
  let exportSet = {
    format: 'Lightbeam Save File',
    version: '1.1',
    uploadTime:  Date.now(),
    connections: connections
  }
  return JSON.stringify(exportSet);
}

function upload(connections) {
  console.log("received upload event in addon");
  let uploadServer = 'https://data.mozilla.com/submit/lightbeam';
  let request = Request({
    url: uploadServer,
    contentType: "application/json",
    onComplete: function(response) {
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
function checkStorageQuota(){
  while (ss.quotaUsage > 1){
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
}

// Reset stored state, including preferences
exports.reset = function reset() {
  storage.connections.length = 0;
  storage.blockmap = {};
  prefs.contributeData = false;
}

// Initialize all of our storage
if (!storage.connections) {
  storage.connections = [];
}

if (!storage.blockmap) {
  storage.blockmap = {};
}

console.log('Current quota usage:', Math.round(ss.quotaUsage * 100));
