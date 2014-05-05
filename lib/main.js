/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* jshint moz: true */
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
const tabEvents = require('./tab/events');
const ui = require('./ui');
const persist = require("./persist");

var tabs = require("sdk/tabs");

const prefService = require("sdk/preferences/service");
// Set this back
prefService.set("extensions.console.logLevel", "debug");

// This is the heart of Lightbeam, we get all of our data from observing these
// requests.
events.on("http-on-examine-response", function (subject) {
  var connection = Connection.fromSubject(subject);
  if (connection.valid) {
    addConnection(connection);
    // Pass the message on to the UI
    ui.emitForWorker('connection', connection.toLog());
  }
}, true);

// This lets us hook into page load events and communicate to page workers.
PageMod({
  include: ui.mainPage,
  contentScriptWhen: 'ready',
  contentScriptFile: [
    data.url('content-script.js'),
    data.url('d3/d3.min.js'),
    data.url('events.js'),
    data.url('infobar.js'),
    data.url('lightbeam.js'),
    data.url('svgdataset.js'),
    data.url('aggregate.js'),
    data.url('picoModal/picoModal-1.0.0.min.js'),
    data.url('tooltip.js'),
    data.url('dialog.js'),
    data.url('ui.js'),
    data.url('parseuri.js'),
    data.url('graph.js'),
    data.url('list.js'),
  ],
  onAttach: ui.attachToLightbeamPage
});

exports.main = function (options, callbacks) {
  let loadURL = null;
  switch (options.loadReason) {
  case "install":
    loadURL = "first-run.html";
    break;
    /*
    case "upgrade":
      loadURL = "upgrade.html";
      break;
    */
  default:
    return;
  }
  tabs.open(data.url(loadURL));
};
