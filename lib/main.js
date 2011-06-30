var obSvc = require('observer-service');
var data = require("self").data;
var {Ci, Cr} = require('chrome');

//var BASE_URL = "http://localhost:8001/force.html";
var BASE_URL = "https://secure.toolness.com/collusion/force.html";

require("widget").Widget({
  id: "collusion",
  label: "Display Collusion Diagram",
  contentURL: data.url("favicon.ico"),
  onClick: function() {
    var payload = encodeURIComponent(JSON.stringify(log));
    var url = BASE_URL + "?log=" + encodeURIComponent(JSON.stringify(log));
    require("tabs").open({url: url});
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
