/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* global require, exports, console */
'use strict';

const self = require("sdk/self");
const data = self.data;
const tabs = require('sdk/tabs');
const {
  isPrivate
} = require("sdk/private-browsing");
const {
  ContentPolicy
} = require('shared/policy');
const ss = require('sdk/simple-storage');
const {
  on, once, off, emit
} = require("sdk/event/core");
const prefs = require("sdk/simple-prefs").prefs;

const persist = require("./persist");
const {
  Connection, getAllConnections
} = require("./connection");

const xulapp = require("sdk/system/xul-app");
const usingAustralis = xulapp.satisfiesVersion(">=29");
if (usingAustralis) {
  const {
    ActionButton
  } = require("sdk/ui/button/action");
} else {
  const {
    Widget
  } = require("sdk/widget");
}
exports.usingAustralis = usingAustralis;

const mainPage = data.url("index.html");
var uiworker = null;

exports.mainPage = mainPage;
exports.attachToLightbeamPage = attachToLightbeamPage;
// These attach page workers to new tabs.
exports.onForWorker = function (eventname, handler) {
  if (uiworker) {
    uiworker.port.on(eventname, handler);
  } else {
    console.log('no uiworker to subscript to order');
  }
};

exports.emitForWorker = function (eventname, obj) {
  if (uiworker) {
    uiworker.port.emit(eventname, obj);
  }
};

// Begin tab handlers. These are for sidebar functionality, which is not
// present yet.
// FIXME: Move tab handlers into a tab component
// And specify what we're trying to do with it

function lightbeamTabClosed(tab) {
  menuitem.label = "Show Lightbeam";
  button.tooltip = "Show Lightbeam";
}

function lightbeamTabReady(tab) {
  menuitem.label = "Close Lightbeam";
  button.tooltip = "Close Lightbeam";
}

function lightbeamTabDeactivate(tab) {
  menuitem.label = "Switch to Lightbeam Tab";
  button.tooltip = "Switch to Lightbeam Tab";
}

const blockmap = ss.storage.blockmap;
var blocksites = Object.keys(blockmap);
console.log("blocking " + blocksites.length + ' sites');

// This is the heart of the Lightbeam blocking functionality.
ContentPolicy({
  description: "Blocks user-defined blocklist from Lightbeam UI",
  shouldLoad: function ({
    location: location,
    origin: origin
  }) {
    // ignore URIs with no host
    var topLevelDomain;
    try {
      topLevelDomain = Connection.getDomain(location.host);
    } catch (e) {
      // See Issue 374: https://github.com/mozilla/lightbeam/issues/374
      // if there is no host, like in about:what, then the host getter throws
      return true;
    }

    if (blockmap[topLevelDomain]) {
      return false;
    }
    return true;
  }
});

function handlePrivateTab(tab) {
  if (isPrivate(tab) && uiworker) {
    // console.error('tab is private and uiworker exists');
    uiworker.port.emit("private-browsing");
    // console.error('sent message');
    return true;
  }
}

// if there is a private tab opened while the lightbeam tab is open,
// then alert the user about it.
tabs.on('open', handlePrivateTab);

// Notify the user in case they open a private window. Connections are
// visualized but never stored.
function hasPrivateTab() {
  // console.error('hasPrivateTab: %s tabs to test', tabs.length);
  for (var i = 0; i < tabs.length; i++) {
    if (handlePrivateTab(tabs[i])) {
      break; // the presence of a Private Window has been detected
    }
  }
}

// Connect the tab to the content script of the UI page. There may only ever be
// one UI page.
function attachToLightbeamPage(worker) {
  console.debug("Attaching to lightbeam page");
  uiworker = worker;

  // The blocklist is maintained on both sides to reduce latency. However,
  // this may cause sync errors.
  function onWorkerUpdateBlocklist(site, blockFlag) {
    if (blockFlag) {
      if (!blockmap[site]) {
        blockmap[site] = true;
      }
    } else {
      if (blockmap[site]) {
        delete blockmap[site];
      }
    }

    uiworker.port.emit('update-blocklist', {
      domain: site,
      flag: blockFlag
    });
  }

  function onPrefChanged(event) {
    console.debug("Received updated prefs", JSON.stringify(event));
    if ("contributeData" in event) {
      prefs.contributeData = event.contributeData;
    }
    if ("defaultVisualization" in event) {
      prefs.defaultVisualization = event.defaultVisualization;
    }
    if ("defaultFilter" in event) {
      prefs.defaultFilter = event.defaultFilter;
    }
  }

  // Send over the the blocklist initially so we can use it.
  worker.port.emit('update-blocklist-all',
    Object.keys(blockmap).map(
      function (site) {
        return {
          domain: site,
          flag: blockmap[site]
        };
      }));

  function onWorkerReset() {
    // Reset buffered state
    Connection.reset();
    // And stored state, including prefs
    persist.reset();
  }

  function onUIReady() {
    worker.port.emit("updateUIFromMetadata", { version: self.version });
    worker.port.emit("updateUIFromPrefs", prefs);
    worker.port.emit("passStoredConnections", getAllConnections());
  }

  function onWorkerDetach() {
    // console.error('detaching lightbeam view');
    /* jshint validthis:true */
    this.port.removeListener('reset', onWorkerReset);
    this.port.removeListener('uiready', onUIReady);
    this.port.removeListener('updateBlocklist', onWorkerUpdateBlocklist);
    this.port.removeListener("prefChanged", onPrefChanged);
    uiworker = null;
    this.destroy();
  }

  worker.on("detach", onWorkerDetach);
  worker.port.on("reset", onWorkerReset);
  worker.port.on('uiready', onUIReady);
  worker.port.on('updateBlocklist', onWorkerUpdateBlocklist);
  worker.port.on("prefChanged", onPrefChanged);
  worker.port.emit('init');

  // if there is a private window open, then alert the user about it.
  try {
    hasPrivateTab();
  } catch (e) {
    console.error('Error testing with hasPrivateTab(): %o', e);
  }
}

// This lets us toggle between the 3 states (no lightbeam tab open, lightbeam
// tab open but it's not the tab you're on, you're on the lightbeam tab)
function getLightbeamTab() {
  for each(let tab in tabs) {
    if (tab.url.slice(0, mainPage.length) === mainPage) {
      return tab;
    }
  }
}
exports.getLightbeamTab = getLightbeamTab;

// Set up the menu item to open the main UI page:
var menuitem = require("shared/menuitems").Menuitem({
  id: "lightbeam_openUITab",
  menuid: "menu_ToolsPopup",
  label: "Show Lightbeam",
  onCommand: function () {
    openOrSwitchToOrClose();
  },
  insertbefore: "sanitizeItem",
  image: data.url("icons/lightbeam_logo-only_32x32.png")
});

function openOrSwitchToOrClose() {
  // Open the Lightbeam tab, if it doesn't exist.
  var tab = getLightbeamTab();
  if (!tab) {
    return tabs.open({
      url: mainPage,
      onOpen: lightbeamTabReady,
      onClose: lightbeamTabClosed,
      onReady: lightbeamTabReady,
      onActivate: lightbeamTabReady,
      onDeactivate: lightbeamTabDeactivate
    });
  }
  // Close it if it's active.
  if (tab === tabs.activeTab) {
    tab.close();
  } else {
    // Otherwise, switch to the Lightbeam tab
    tab.activate();
    tab.window.activate();
  }
}
exports.openOrSwitchToOrClose = openOrSwitchToOrClose;

// Set up the status bar button to open the main UI page:
var button;
if (usingAustralis) {
  console.debug("Using australis");
  button = ActionButton({
    id: "lightbeam_Widget",
    label: "Lightbeam",
    tooltip: "Show Lightbeam",
    // Relative to the data directory
    icon: {
      "16": "./icons/lightbeam_logo-only_16x16.png",
      "32": "./icons/lightbeam_logo-only_32x32.png",
      "48": "./icons/lightbeam_logo-only_48x48.png",
    },
    onClick: function () {
      openOrSwitchToOrClose();
    }
  });
} else {
  console.debug("Not using australis");
  button = Widget({
    id: "lightbeam_Widget",
    label: "Lightbeam",
    tooltip: "Show Lightbeam",
    contentURL: data.url("icons/lightbeam_logo-only_32x32.png"),
    onClick: function () {
      openOrSwitchToOrClose();
    }
  });
}
