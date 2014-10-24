/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global exports, require */
"use strict";

const events = require("sdk/system/events");
const {
  PageMod
} = require("sdk/page-mod");
const {
  data
} = require("sdk/self");

const {
  Connection, addConnection
} = require('./connection');
const ui = require('./ui');

var tabs = require("sdk/tabs");

// This is the heart of Lightbeam, we get all of our data from observing these
// requests.
// TODO: subject is a poor name for this parameter, event is used elsewhere
// and is clearer (because subject is actually a key in the "subject" param)
events.on("http-on-examine-response", function (subject) {
  var connection = Connection.fromSubject(subject);
  if (connection.valid) {
    addConnection(connection);
    // Pass the message on to the UI
    ui.emitForWorker('connection', connection.toLog());
    // Update the connections list for this specific window
    ui.updateWindow(subject, connection);
  }
}, true);

// This lets us hook into page load events and communicate to page workers.
PageMod({
  include: ui.mainPage,
  contentScriptWhen: 'ready',
  contentScriptFile: [
    data.url('content-script.js'),
    data.url('d3/d3.js'),
    data.url('events.js'),
    data.url('infobar.js'),
    data.url('lightbeam.js'),
    data.url('svgdataset.js'),
    data.url('aggregate.js'),
    data.url('picoModal/picoModal.js'),
    data.url('tooltip.js'),
    data.url('dialog.js'),
    data.url('ui.js'),
    data.url('parseuri.js'),
    data.url('graph.js'),
    data.url('list.js'),
  ],
  onAttach: ui.attachToLightbeamPage
});

function main(options, callbacks) {
  let initialPage = null;
  switch (options.loadReason) {
    case "install":
      initialPage = "first-run.html";
      break;
    //case "upgrade":
    //  initialPage = "upgrade.html";
    //  break;
  }
  if (initialPage) {
    let initialPageUrl = data.url(initialPage);
    tabs.open(initialPageUrl);
    // Add a content script to open lightbeam if the corresponding button is
    // pressed in the inital page
    PageMod({
      include: initialPageUrl,
      contentScriptWhen: 'ready',
      contentScriptFile: data.url('initialPage.js'),
      onAttach: function (worker) {
        worker.port.on('openLightbeam', ui.openOrSwitchToOrClose);
      }
    });
  }

  // Initialize the UI
  ui.onStartup();
};

function unload(reason) {
  ui.onShutdown();
};

exports.main = main;
exports.onUnload = unload;
