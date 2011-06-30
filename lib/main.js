var obSvc = require('observer-service');
var data = require("self").data;
var {Ci, Cr} = require('chrome');

require("widget").Widget({
  id: "log",
  label: "Display Log",
  contentURL: data.url("favicon.ico"),
  onClick: function() {
    var parts = [];
    for (var key in log)
      parts.push(key);
    log = {};
    require("tabs").open("data:text/plain,[" + parts.join(",") + "]");
  }
});

var log = {};

function queueInfo(info) {
  var key = JSON.stringify(info);
  if (!(key in log))
    log[key] = true;
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
          method: channel.requestMethod,
          type: type,
          domain: domain,
          referrer: referrerDomain
        });
    }
  }
});
