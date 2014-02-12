// ChromeTab
//
// This is a module for getting the tab a channel is loaded in, from the channel

exports.getTabForChannel = getTabForChannel;
exports.on = onTab;
exports.getTabInfo = getTabInfo;

const { Cc, Ci, Cr, components } = require('chrome');
const tabs = require('sdk/tabs');
const winutils = require('sdk/window/utils');
const { getTabForContentWindow, getBrowserForTab } = require('sdk/tabs/utils');

var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

// return a variety of info on the tab
function getTabInfo(jpTab){
    // Some windows don't have performance initialized (because they haven't been reloaded since the plugin was initialized?
    try{
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
    }catch(e){
        return null;
    }
}

function onTab(eventname, fn){
    tabs.on(eventname, function(jptab){
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
    var win = loadContext.topWindow;
    if (win){
        var tab = getTabForContentWindow(win);
        // http://developer.mozilla.org/en/docs/XUL:tab
        tab.isPrivate = PrivateBrowsingUtils.isWindowPrivate(win);
        return tab;
    }else{
        // console.error('getTabForChannel() no topWindow found');
        return null;
    }
}

// Special case in case we don't have a load context.
function getTabForChannel2(aChannel) {
    var win = getWindowForChannel(aChannel);
    if (!win) return null;

    var tab = getTabForContentWindow(win);
    return tab;
}

function getLoadContext(aRequest) {
    try {
        // first try the notification callbacks
        var loadContext = aRequest.QueryInterface(Ci.nsIChannel)
            .notificationCallbacks.getInterface(Ci.nsILoadContext);
        return loadContext;
    } catch (ex) {
        // fail over to trying the load group
        try {
            if (!aRequest.loadGroup) return null;

            var loadContext = aRequest.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext);
            return loadContext;
        } catch (ex) {
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
        console.log("Failed to to find nsIDOMWindow from interface requestor");
        return null;
    }
}
