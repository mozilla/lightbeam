var obSvc = require('observer-service');
var prefs = require('preferences-service');
var url = require('url');
var data = require("self").data;
var tabs = require("tabs");
var {Cc, Ci, Cr} = require('chrome');
var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);
var DEFAULT_BASE_URLS = "http://collusion.toolness.org/";

try {
  DEFAULT_BASE_URLS = data.load("collusion.urls.default-value").trim();
} catch (e) {}

var baseUrls = prefs.get("collusion.urls", DEFAULT_BASE_URLS).split(",");
var baseHosts = {};

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

function queueInfo(info) {
  if (!(info.domain in log))
    log[info.domain] = {};

  var referrers = log[info.domain];

  if (!(info.referrer in referrers))
    referrers[info.referrer] = [(new Date()) - startTime];

  var types = referrers[info.referrer];

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
    
      if (cookie)
        queueInfo({
          type: type,
          domain: domain,
          referrer: referrerDomain
        });
    }
  }
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
