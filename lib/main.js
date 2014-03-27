"use strict";

const events = require("sdk/system/events");
const { PageMod } = require("sdk/page-mod");

const { Connection, addConnection } = require('./connection');
const tabEvents = require('./tab/events');
const ui = require('./ui');
const persist = require("./persist");

var tabs = require("sdk/tabs");
var data = require("sdk/self").data;

// This is the heart of Lightbeam, we get all of our data from observing these
// requests.
events.on("http-on-examine-response", function(subject) {
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
  contentScriptFile: ui.contentScript,
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
}
