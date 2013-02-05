// Connection object
//
// Convert an HTTP request (channel) to a loggable, visualizable connection object, if possible

var {
    Cc, Ci, Cr
} = require('chrome');

var eTLDSvc = Cc["@mozilla.org/network/effective-tld-service;1"].
                getService(Ci.nsIEffectiveTLDService);

var getTabForChannel = require('chrometab').getTabForChannel;

exports.Connection = Connection;

function objstr(obj) {
	try{
        return '{' + obj + ':  [ ' + Object.keys(obj)
            .join(', ') + ']}';
	}catch(e){
		return '{Object: [' + Object.keys(obj).join(', ') + ']}';
	}
}

function getDomain(host) {
  try {
    return eTLDSvc.getBaseDomainFromHost(host);
  } catch (e if e.result === Cr.NS_ERROR_INSUFFICIENT_DOMAIN_LEVELS) {
    return host;
  } catch (e if e.result === Cr.NS_ERROR_HOST_IS_IP_ADDRESS) {
    return host;
  }
}

function isThirdParty(source, target) {
	return getDomain(source) !== getDomain(target);
}

function Connection(subject) {
    // Check to see if this is in fact a third-party connection, if not, return
	var channel = subject.QueryInterface(Ci.nsIHttpChannel);
	this.valid = true;
    if (!channel.referrer){
		this.valid = false;
		this.message = 'Connection has no referrer';
		return;
	}
    this.source = channel.referrer.host;
    this.target = channel.URI.host;
	if (!isThirdParty(this.source, this.target)){
		this.valid = false;
		this.message = 'Connection is not a third-party';
		return;
	}
    this.timestamp = Date.now();
    this.contentType = channel.contentType || 'text/plain';
    try {
        this.cookie = !! channel.getRequestHeader('Cookie');
    } catch (e) {
        this.cookie = false;
    }
    var protocol = channel.URI.scheme;
    switch (protocol) {
        case 'http':
            this.secure = false;
            break;
        case 'https':
            this.secure = true;
            break;
        default:
            this.valid = false;
            this.message = 'Unsupported protocol: ' + protocol;
            return;
    }
    this.sourcePathDepth = channel.URI.path.split('/').length - 1;
    if (channel.URI.query) {
        this.sourceQueryDepth = channel.URI.query.split(/;|\&/).length;
    } else {
        this.sourceQueryDepth = 0;
    }
    this._sourceTab = getTabForChannel(channel); // Never logged, only for associating data with current tab
	this.sourceVisited = (this._sourceTab.linkedBrowser.currentURI.spec === channel.referrer.spec);
}

Connection.prototype.toLog = function(){
	if (!this.valid){
		throw new Exception('Do not log invalid connections: ' + this);
	}
	return [this.source, this.target, this.timestamp, this.contentType, this.cookie, this.sourceVisited, this.secure, this.sourcePathDepth, this.sourceQueryDepth, this.sourceTab];
};

Connection.prototype.toString = function(){
	if (!this.valid){
		return 'Invalid Connection: ' + this.message;
	}
	return '[source: ' + this.source +
	       ', target: ' + this.target +
		   ', timestamp: ' + this.timestamp +
		   ', contentType: ' + this.contentType +
		   ', cookie: ' + this.cookie +
		   ', sourceVisited: ' + this.sourceVisited +
		   ', secure: ' + this.secure +
		   ', sourcePathDepth: ' + this.sourcePathDepth +
		   ', sourceQueryDepth: ' + this.sourceQueryDepth +
		   ', sourceTab: ' + this._sourceTab +
	']';
	return '[source: ' + this.source + ', target: ' + this.target + ',  timestamp: ' + this.timestamp + ', contentType: ' + this.contentType + ', cookie: ' + this.cookie + ', sourceVisited: ' + this.sourceVisited + ', secure: ' + this.secure + ', sourcePathDepth: ' + this.sourcePathDepth + ', sourceQueryDepth: ' + this.sourceQueryDepth + ', sourceTab: ' + objstr(this.sourceTab) + ']';
};



