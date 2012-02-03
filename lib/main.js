var obSvc = require('observer-service');
var prefs = require('simple-prefs').prefs;
var url = require('url');
var data = require("self").data;
var tabs = require("tabs");
var {Cc, Ci, Cr} = require('chrome');
var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);
var ioService = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService);

var deployment = {};
var baseUrls = [];
var baseHosts = {};

try {
  deployment = JSON.parse(data.load("deployment.json"));
} catch (e) {}

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

function attachToCollusionPage(worker) {
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

require("page-mod").PageMod({
  include: baseUrls,
  contentScriptWhen: 'start',
  contentScriptFile: data.url("index-content-script.js"),
  onAttach: attachToCollusionPage
});

require("widget").Widget({
  id: "collusion",
  label: "Display Collusion Diagram",
  contentURL: data.url("favicon.ico"),
  onClick: function() {
    tabs.open({url: baseUrls[0]});
  }
});

var startTime = new Date();
var log = {};
var workers = [];
var visitedDomains = [];

function queueInfo(info) {
  if (!(info.domain in log)) {
    log[info.domain] = { referrers: {},
                         visited: false // Will be set to true by tabs.on handler if we visit
                         };
  }

  var referrers = log[info.domain].referrers;

  if (!(info.referrer in referrers))
    referrers[info.referrer] = [(new Date()) - startTime];

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
        queueInfo({
          type: type,
          domain: domain,
          referrer: referrerDomain
        });
      }
    }
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

attachToExistingCollusionPages();

// TODO listen with observer-service for "cookie-rejected" - https://developer.mozilla.org/en/Observer_Notifications
// "Called when the setting of a cookie was rejected by the browser (per the user's preferences)"