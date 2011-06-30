var obSvc = require('observer-service');
var {Ci, Cr} = require('chrome');

obSvc.add("http-on-examine-response", function(subject, topic, data) {
  var channel = subject.QueryInterface(Ci.nsIHttpChannel);
  
  try {
    var type = subject.getResponseHeader("Content-Type");
  } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}
  
  var args = [channel.requestMethod, channel.responseStatus, type,
              channel.URI.host, "requested"];

  if (channel.referrer && channel.referrer.host != channel.URI.host)
    args.push("from", channel.referrer.host);

  try {
    var cookie = subject.getRequestHeader("Cookie");
  } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}

  if (!cookie) {
    try {
      cookie = subject.getResponseHeader("Set-Cookie");
    } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}
  }
  
  if (cookie)
    args.push("with a cookie");

  console.log.apply(console.log, args);
});
