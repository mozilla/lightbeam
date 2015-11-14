/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// ChromeTab
//
// This is a module for getting the tab a channel is loaded in, from the channel

exports.getTabForChannel = getTabForChannel;
exports.on = onTab;
exports.getTabInfo = getTabInfo;

const {
  Cc, Ci, components
} = require('chrome');
const tabs = require('sdk/tabs');
const {
  getTabForBrowser,
  getTabForContentWindow
} = require('sdk/tabs/utils');

var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

// return a variety of info on the tab
function getTabInfo(jpTab) {
  // Some windows don't have performance initialized (because they haven't been reloaded since the plugin was initialized?
  try {
    var chromeWindow = wm.getMostRecentWindow('navigator:browser');
    var gBrowser = chromeWindow.gBrowser;
    var window = gBrowser.contentWindow.wrappedJSObject;
    return {
      gBrowser: gBrowser,
      tab: gBrowser.selectedTab,
      document: gBrowser.contentDocument,
      window: window,
      title: gBrowser.contentTitle, // nsIPrincipal
      principal: gBrowser.contentPrincipal, // security context
      uri: gBrowser.contentURI, // nsURI .spec to get string representation
      loadTime: window.performance.timing.responseStart // milliseconds at which page load was initiated
    };
  } catch (e) {
    return null;
  }
}

function onTab(eventname, fn) {
  tabs.on(eventname, function (jptab) {
    var tabinfo = getTabInfo(jptab);
    fn(tabinfo);
  });
}


// Below code is based on adhacker, taken from http://forums.mozillazine.org/viewtopic.php?f=19&p=6335275
// Erik Vold may have the most current information on this.
function getTabForChannel(aHttpChannel) {
  var loadContext = getLoadContext(aHttpChannel);
  if (!loadContext) {
    // fallback
    return getTabForChannel2(aHttpChannel);
  }

  return getTabForLoadContext(loadContext);
}

// Special case in case we don't have a load context.
function getTabForChannel2(aChannel) {
  var win = getWindowForChannel(aChannel);
  if (!win) return null;

  var tab = getTabForContentWindow(win);
  return tab;
}

// Get the tab for a LoadContext
function getTabForLoadContext(aLoadContext) {
    var browser = aLoadContext.topFrameElement;
    if (browser) {
      // Should work in e10s or in non-e10s Firefox >= 39
      var tab = getTabForBrowser(browser);

      if ( tab ) {
        tab.isPrivate = PrivateBrowsingUtils.isBrowserPrivate(browser);
        return tab;
      }
    }

    // fallback
    return getTabForLoadContext2(aLoadContext);
}

// Fallback for when we can't get the tab for a LoadContext via
// topFrameElement. This happens in:
//    * Firefox < 38, where topFrameElement is not defined when not
//      in e10s.
//    * Firefox 38, where topFrameElement is defined when not in e10s, but
//      the getTabForBrowser call fails
//    * other cases where the tab simply cannot be figured out. This function
//      will return null in these cases.
function getTabForLoadContext2(aLoadContext) {
  try {
    var win = aLoadContext.topWindow;
    if (win) {
      var tab = getTabForContentWindow(win);

      // http://developer.mozilla.org/en/docs/XUL:tab
      if (PrivateBrowsingUtils.isContentWindowPrivate) {
        tab.isPrivate = PrivateBrowsingUtils.isContentWindowPrivate(win);
      } else {
        tab.isPrivate = PrivateBrowsingUtils.isWindowPrivate(win); // ESR 31
      }

      return tab;
    }
  } catch(err1) {
    // requesting aLoadContext.topWindow when in e10s throws an error
  }

  return null;
}

function getLoadContext(aRequest) {
  try {
    // first try the notification callbacks
    var loadContext = aRequest.QueryInterface(Ci.nsIChannel)
      .notificationCallbacks.getInterface(Ci.nsILoadContext);
    return loadContext;
  } catch (err1) {
    // fail over to trying the load group
    try {
      if (!aRequest.loadGroup) return null;

      var loadContext = aRequest.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
      return loadContext;
    } catch (err2) {
      return null;
    }
  }
}

function getWindowForChannel(aRequest) {
  var oHttp = aRequest.QueryInterface(Ci.nsIHttpChannel);

  if (!oHttp.notificationCallbacks) {
    console.log("HTTP request missing callbacks: " + oHttp.originalURI.spec);
    return null;
  }
  var interfaceRequestor = oHttp.notificationCallbacks.QueryInterface(Ci.nsIInterfaceRequestor);

  try {
    return interfaceRequestor.getInterface(Ci.nsIDOMWindow);
  } catch (e) {
    console.log("Failed to to find nsIDOMWindow from interface requestor: " + e);
    return null;
  }
}
