var obSvc = require('observer-service');
var prefs = require('preferences-service');
var data = require("self").data;
var {Cc, Ci, Cr} = require('chrome');
var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);

var baseUrls = prefs.get("collusion.urls",
                         "http://collusion.toolness.org/")
                    .split(",");

require("page-mod").PageMod({
  include: baseUrls,
  contentScriptWhen: 'start',
  contentScriptFile: data.url("force-content-script.js"),
  onAttach: function(worker) {
    workers.push(worker);
    worker.on("detach", function() {
      workers.splice(workers.indexOf(worker), 1);
    });
    worker.port.emit("log", JSON.stringify(log));
  }
});

require("widget").Widget({
  id: "collusion",
  label: "Display Collusion Diagram",
  contentURL: data.url("favicon.ico"),
  onClick: function() {
    require("tabs").open({url: baseUrls[0]});
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

obSvc.add("http-on-examine-response", function(subject, topic, data) {
  var channel = subject.QueryInterface(Ci.nsIHttpChannel),
      type = null,
      cookie = null;

  if (channel.referrer) {
    var referrerDomain = eTLDSvc.getBaseDomainFromHost(channel.referrer.host);
    var domain = eTLDSvc.getBaseDomainFromHost(channel.URI.host);
    if (domain != referrerDomain) {
      try {
        type = subject.getResponseHeader("Content-Type");
      } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}

      try {
        var cookie = subject.getRequestHeader("Cookie");
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
