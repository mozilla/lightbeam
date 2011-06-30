var obSvc = require('observer-service');
var data = require("self").data;
var {Ci, Cr} = require('chrome');

require("widget").Widget({
  id: "log",
  label: "Display Log",
  contentURL: data.url("favicon.ico"),
  onClick: function() {
    require("tabs").open("data:text/plain," + JSON.stringify(log));
  }
});

var log = {};

function queueInfo(info) {
  if (!(info.domain in log))
    log[info.domain] = {};
  
  var referrers = log[info.domain];
  
  if (!(info.referrer in referrers))
    referrers[info.referrer] = [];
    
  var types = referrers[info.referrer];
  
  if (types.indexOf(info.type) == -1)
    types.push(info.type);
}

function getDomain(host) {
  return host.split('.').slice(-2).join('.');
}

obSvc.add("http-on-examine-response", function(subject, topic, data) {
  var channel = subject.QueryInterface(Ci.nsIHttpChannel),
      type = null,
      cookie = null;

  if (channel.referrer) {
    var referrerDomain = getDomain(channel.referrer.host);
    var domain = getDomain(channel.URI.host);
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
