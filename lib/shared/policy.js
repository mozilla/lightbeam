/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { Cc, Ci } = require('chrome');
const { Class } = require('sdk/core/heritage');
const CP_NS = require('sdk/core/namespace').ns();
const { ensure } = require('sdk/system/unload');
const { validateOptions } = require('sdk/deprecated/api-utils');
const { id: ADDON_ID } = require('sdk/self');
const xpcom = require('sdk/platform/xpcom');

const CM = Cc["@mozilla.org/categorymanager;1"]
    .getService(Ci.nsICategoryManager);

const ACCEPT = exports.ACCEPT = Ci.nsIContentPolicy.ACCEPT;
const REJECT = exports.REJECT = Ci.nsIContentPolicy.REJECT_REQUEST;

const accept = function() ACCEPT;

let ContentPolicy_ID = 0;

const RULES = {
  description: {
    map: function(v) {
      return v ? v : '';
    },
    is: ['string']
  },
  contract: {
    map: function(v) {
      if (v === undefined) {
        v = '@erikvold.com/content-policy.' + ADDON_ID + ';' + ContentPolicy_ID++;
      }
      return v;
    },
    is: ['string']
  },
  entry: {
    is: ['string', 'undefined']
  },
  shouldLoad: {
    is: ['function', 'undefined']
  },
  shouldProcess: {
    is: ['function', 'undefined']
  },
};

function getType(aType) {
  switch (aType) {
    case Ci.nsIContentPolicy.TYPE_SCRIPT:
      return 'script';
    case Ci.nsIContentPolicy.TYPE_IMAGE:
      return 'image';
    case Ci.nsIContentPolicy.TYPE_STYLESHEET:
      return 'stylesheet';
    case Ci.nsIContentPolicy.TYPE_OBJECT:
      return 'object';
    case Ci.nsIContentPolicy.TYPE_DOCUMENT:
      return 'document';
    case Ci.nsIContentPolicy.TYPE_SUBDOCUMENT:
      return 'subdocument';
    case Ci.nsIContentPolicy.TYPE_REFRESH:
      return 'refresh';
    case Ci.nsIContentPolicy.TYPE_XBL:
      return 'xbl';
    case Ci.nsIContentPolicy.TYPE_XMLHTTPREQUEST:
      return 'xhr';
    case Ci.nsIContentPolicy.TYPE_PING:
      return 'ping';
    // TODO: support more types
  }
  return 'other';
}
const getTypeMemod = memoize(getType, 12, 1);

function makeDetails(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess) {
  return {
    type: getTypeMemod(aContentType),
    location: aContentLocation.spec,
    origin: aRequestOrigin.spec,
    context: null, // TODO: support this in a safe way somehow..
    mimeTypeGuess: String(aMimeTypeGuess)
  };
}

let ContentPolicy = exports.ContentPolicy = Class({
  initialize: function(options) {
    const self = this;
    options = CP_NS(self).options = validateOptions(options, RULES);
    CP_NS(self).shouldLoad = options.shouldLoad || accept;
    CP_NS(self).shouldProcess = options.shouldProcess || accept;

    let factory = CP_NS(this).factory = xpcom.Factory({
      Component: getProvider(self),
      description: options.description,
      contract: options.contract
    });

    let entry = options.entry || options.contract;
    CM.addCategoryEntry('content-policy', entry, factory.contract, false, true);
    ensure(this, 'destroy');
  },
  destroy: function() {
    // already destroyed?
    if (!CP_NS(this).options)
      return;

    let options = CP_NS(this).options;
    CP_NS(this).options = null;
    CP_NS(this).shouldLoad = accept;
    CP_NS(this).shouldProcess = accept;

    CM.deleteCategoryEntry('content-policy', options.entry || options.contract, false);
  }
});

function getProvider(self) {
  return Class({
    extends: xpcom.Unknown,
    interfaces: ['nsIContentPolicy'],
    shouldLoad: function (aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
      let load = CP_NS(self).shouldLoad(makeDetails.apply(null, arguments));
      return (load == REJECT || (!load && load !== undefined)) ? REJECT : ACCEPT;
    },
    shouldProcess: function (aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
      let load = CP_NS(self).shouldProcess(makeDetails.apply(null, arguments));
      return (load == REJECT || (!load && load !== undefined)) ? REJECT : ACCEPT;
    }
  });
}

function memoize(func) {
  let cache = Object.create(null);
  return function(a) {
    let key = a.toString();
    if (key in cache)
      return cache[key];
    return cache[key] = func.call(null, a);
  };
}
