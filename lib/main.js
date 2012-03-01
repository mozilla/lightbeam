var obSvc = require('observer-service');
var prefs = require('simple-prefs').prefs;
var url = require('url');
var data = require("self").data;
var tabs = require("tabs");
var privateBrowsing = require("private-browsing");
var storage = require("simple-storage").storage;

var {Cc, Ci, Cr} = require('chrome');
var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);
var ioService = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService);
var cookieMgr = Cc["@mozilla.org/cookiemanager;1"]
                    .getService(Ci.nsICookieManager2);


// Global variables:
var deployment = {};
var baseUrls = [];
var baseHosts = {};

// The page to open when user clicks the toolbar icon:
var mainPage = data.url("ui/index.html");
var panelPage = data.url("ui/panel.html");

// The main data structure storing visited sites, trackers, and links between them:
var log = {};

// Array to maintain connections to any pages running collusion UI:
var workers = [];

var startTime = new Date();
var collusionPanel = null;



function attachToCollusionPage(worker) {
  /* Set up channel of communcation between this add-on and the script (index-content-script.js)
   * that we attached to the web page running the Collusion UI. */

  workers.push(worker);
  worker.on("detach", function() {
    workers.splice(workers.indexOf(worker), 1);
  });
  worker.port.on("init", function() {
    worker.port.emit("log", JSON.stringify(log));
  });
  worker.port.on("reset", function() {
    startTime = new Date();
    log = {};
  });
  worker.port.on("save", function(data) {
    // Don't permanently store data about graph in private browsing mode
    if (!privateBrowsing.isActive) {
      storage.graph = data;
    }
  });
  worker.port.on("getSavedGraph", function() {
    var graph = "{}";
    if (storage.graph) {
      graph = storage.graph;
    }
    worker.port.emit("getSavedGraph", graph);
  });
  worker.port.on("import", function(data) {
    var graph = JSON.parse(data);
    var maxTime = 0;

    for (var domain in graph) {
      var referrers = graph[domain];
      for (var referrer in referrers) {
        if (referrers[referrer][0] > maxTime)
          maxTime = referrers[referrer][0];
      }
    }

    startTime = new Date() - maxTime;
    log = graph;
  });
}


function attachToExistingCollusionPages() {
  for each (var tab in tabs)
    baseUrls.forEach(function(baseUrl) {
      if (tab.url == baseUrl) {
        var worker = tab.attach({
          contentScriptFile: data.url("index-content-script.js")
        });
        attachToCollusionPage(worker);
      }
    });
}

function queueInfo(info) {
  var newSite = false;
  if (!(info.domain in log)) {
    log[info.domain] = { referrers: {},
                         visited: false // Will be set to true by tabs.on handler if we visit
                        };
    newSite = true;
  }

  var referrers = log[info.domain].referrers;

  if (!(info.referrer in referrers)) {
    referrers[info.referrer] = [(new Date()) - startTime];
    newSite = true;
  }

  if (newSite && prefs["collusion.popup"]) {
    // Open panel whenever new site is added to the graph...
    if (!collusionPanel.isShowing) {
      collusionPanel.show();
    }
  }

  var types = referrers[info.referrer];

  // TODO types is a timestamp followed by a list of content types I guess?
  // kind of a weird data format.
  if (types.indexOf(info.type) == -1) {
    types.push(info.type);
    workers.forEach(function(worker) {
      worker.port.emit("log", JSON.stringify(log));
    });
  }
}

function getDomain(host) {
  try {
    return eTLDSvc.getBaseDomainFromHost(host);
  } catch (e if e.result == Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
    return host;
  } catch (e if e.result == Cr.NS_ERROR_HOST_IS_IP_ADDRESS) {
    return host;
  }
}

// Main entry point. Will be called when Firefox starts or when Collusion is installed:
function initCollusion() {

  try {
    deployment = JSON.parse(data.load("deployment.json"));
  } catch (e) {}

  baseUrls.push(mainPage);
  baseUrls.push(panelPage);
  baseUrls.push(deployment.url || "http://collusion.toolness.org/");

  prefs['collusion.urls'].split(',').forEach(function(url) {
    url = url.trim();
    if (url.length)
      baseUrls.push(url);
  });

  baseUrls.forEach(function(baseUrl) {
    try {
      baseHosts[url.URL(baseUrl).host] = true;
    } catch (e) {}
  });

  // Attach index-content-script.js to any pages matching one of the baseUrls:
  require("page-mod").PageMod({
    include: baseUrls,
    contentScriptWhen: 'start',
    contentScriptFile: data.url("index-content-script.js"),
    onAttach: attachToCollusionPage
  });

  // Create collusion panel, in case "show graph in panel" pref is turned on.
  collusionPanel = require("panel").Panel({
    width: 510,
    height: 410,
    contentURL: panelPage,
    contentScriptFile: data.url("index-content-script.js")
  });

  // Set up the status bar button to open the main UI page:
  require("widget").Widget({
    id: "collusion",
    label: "Display Collusion Diagram",
    contentURL: data.url("favicon.ico"),
    onClick: function() {
      tabs.open({url: mainPage});
    }
  });

  // Load any tracking data that we have stored from last time:
  if (storage.graph) {
    log = JSON.parse(storage.graph);
  }

  // Set up an observer to record third-party cookies. This callback
  // right here is the crux of Collusion.
  obSvc.add("http-on-examine-response", function(subject, topic, data) {
    var channel = subject.QueryInterface(Ci.nsIHttpChannel),
        type = null,
        cookie = null;

    if (channel.referrer) {
      var referrerDomain = getDomain(channel.referrer.host);
      var domain = getDomain(channel.URI.host);

      // This is a fix for https://github.com/toolness/collusion/issues/7.
      if (channel.referrer.host in baseHosts)
        return;

      if (domain != referrerDomain) {
        try {
          type = subject.getResponseHeader("Content-Type");
        } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}

        try {
          cookie = subject.getRequestHeader("Cookie");
        } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}

        if (!cookie) {
          try {
            cookie = subject.getResponseHeader("Set-Cookie");
          } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}
        }

        if (cookie) {
          /* At this point we know that the HTTP header contained a request to set a cookie.
           * But did Firefox actually accept the cookie? If it was blocked due to user's
           * preferences, then we shouldn't add it to the graph. Let's check. */
          var cookieReallyExists = false;
          // Look for cookies for the domain in Firefox's cookie manager:
          var thecount = cookieMgr.getCookiesFromHost(channel.URI.host);
          while (thecount.hasMoreElements()) {
            var storedCookie = thecount.getNext().QueryInterface(Ci.nsICookie2);
            /* A cookie exists for the domain but it might be a pre-existing or first-party
             * cookie. Do its contents match those of the cookie that the header requested? */
            if (cookie.indexOf(storedCookie.value) > -1) {
              // A match -- cookie was set!
              cookieReallyExists = true;
              break;
            }
            /* See https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsICookie
             * and https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsICookie2
             * and https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsICookieService
             * A different approach here would be to listen for cookie-modified events via
             * the CookieService, but we wouldn't get content-type info that way.*/
          }

          if (cookieReallyExists) {
            queueInfo({
              type: type,
              domain: domain,
              referrer: referrerDomain
            });

            // Play sound when cookie set (if CollusionSound pref is true)
            var strPref = prefs.CollusionSound;
            if (strPref) {
              var ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
              var soundURL = require("self").data.url("CameraSound.wav");
              var soundTwo = ios.newURI(soundURL, null, null);
              var player = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
              player.play(soundTwo);
            }
          }
        }
      }
    }
  });

  // Clear graph when going into private browsing mode:
  privateBrowsing.on("start", function() {
    log = {};
  });

  // Restore original graph when leaving private browsing mode:
  privateBrowsing.on("stop", function() {
    if (storage.graph) {
      log = JSON.parse(storage.graph);
    }
  });

  // When a site loads in a tab, make a record that the domain is one actively
  // visited by the user:
  tabs.on("ready", function(tab) {
    // skip "about:" urls
    if (tab.url.indexOf("about:") == 0) {
      return;
    }
    var domain = getDomain(ioService.newURI(tab.url, null, null).host);
    if (!(domain in log)) {
      log[domain] = { referrers: {},
                      visited: true };
    }
    log[domain].visited = true;
  });

  // If any collusion UI pages are already open when we start, connect to them:
  attachToExistingCollusionPages();
}

// Start!
initCollusion();