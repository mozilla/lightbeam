/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
'use strict';

const { Class } = require("sdk/core/heritage");
const unloadNS = require("sdk/core/namespace").ns();
const { when: unload } = require("sdk/system/unload");

var Unloader = exports.Unloader = Class({
  initialize: function Unloader() {
    unloadNS(this).unloaders = [];
    unloadNS(this).unloadersUnload = unloadersUnload.bind(null, unloadNS(this).unloaders);

    // run the unloaders on unload
    unload(unloadNS(this).unloadersUnload);
  },
  unload: function unload(callback, container) {
    // Calling with no arguments runs all the unloader callbacks
    if (callback == null) {
      unloadNS(this).unloadersUnload();
      return null;
    }
  
    let windowRemover = windowUnloader.bind(null, unloader, unloadNS(this).unloaders);
  
    // The callback is bound to the lifetime of the container if we have one
    if (container != null) {
      // Remove the unloader when the container unloads
      container.addEventListener("unload", windowRemover, false);
  
      // Wrap the callback to additionally remove the unload listener
      let origCallback = callback;
      callback = function() {
        container.removeEventListener("unload", windowRemover, false);
        origCallback();
      }
    }
  
    // Wrap the callback in a function that ignores failures
    function unloader() {
      try {
        callback();
      }
      catch(e) {
        console.error(e);
      }
    }
    unloadNS(this).unloaders.push(unloader);
  
    // Provide a way to remove the unloader
    return removeUnloader.bind(null, unloader, unloadNS(this).unloaders);
  }
});

function sliceUnloader(unloader, unloaders) {
  let index = unloaders.indexOf(unloader);
  if (index < 0)
    return [];
  return unloaders.splice(index, 1);
}
// wraps sliceUnloader and doesn't return anything
function removeUnloader(unloader, unloaders) {
  sliceUnloader.apply(null, arguments);
}
function windowUnloader(unloader, unloaders) {
  sliceUnloader.apply(null, arguments).forEach(function(u) u());
}
function unloadersUnload(unloaders) {
  // run all the pending unloaders
  unloaders.slice().forEach(function(u) u());
  // clear the unload array
  unloaders.length = 0;
}

/**
 * Save callbacks to run when unloading. Optionally scope the callback to a
 * container, e.g., window. Provide a way to run all the callbacks.
 *
 * @usage unload(): Run all callbacks and release them.
 *
 * @usage unload(callback): Add a callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 *
 * @usage unload(callback, container) Add a scoped callback to run on unload.
 * @param [function] callback: 0-parameter function to call on unload.
 * @param [node] container: Remove the callback when this container unloads.
 * @return [function]: A 0-parameter function that undoes adding the callback.
 */
const gUnload = Unloader();
exports.unload = gUnload.unload.bind(gUnload);
