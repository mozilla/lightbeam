var obSvc = require('observer-service');
var {Ci, Cr} = require('chrome');

obSvc.add("http-on-modify-request", function(subject, topic, data) {
  var channel = subject.QueryInterface(Ci.nsIHttpChannel);
  var args = [channel.URI.host, "was requested"];

  if (channel.referrer && channel.referrer.host != channel.URI.host)
    args.push("from", channel.referrer.host);

  try {
    var cookie = subject.getRequestHeader("Cookie");
  } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}

  if (cookie)
    args.push("with a cookie");

  console.log.apply(console.log, args);
});

obSvc.add("http-on-examine-response", function(subject, topic, data) {
  var channel = subject.QueryInterface(Ci.nsIHttpChannel);

  try {
    var cookie = subject.getResponseHeader("Set-Cookie");
  } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {}
  
  if (cookie)
    console.log(channel.URI.host, "set a cookie");
});
