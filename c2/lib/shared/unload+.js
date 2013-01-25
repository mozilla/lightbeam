/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { Class } = require("sdk/core/heritage");
const unloadNS = require("sdk/core/namespace").ns();

var Unloader = exports.Unloader = Class({
  initialize: function Unloader() {
    let unloaders = unloadNS(this).unloaders = [];

    let unloadersUnlaod = unloadNS(this).unloadersUnlaod = function() {
      unloaders.slice().forEach(function(u) u());
      unloaders.length = 0;
    }
  
    require("unload").when(unloadersUnlaod);
  },
  unload: function unload(callback, container) {
    // Calling with no arguments runs all the unloader callbacks
    if (callback == null) {
      unloadNS(this).unloadersUnlaod();
      return null;
    }
  
    var remover = removeUnloader.bind(null, unloader, unloadNS(this).unloaders);
  
    // The callback is bound to the lifetime of the container if we have one
    if (container != null) {
      // Remove the unloader when the container unloads
      container.addEventListener("unload", remover, false);
  
      // Wrap the callback to additionally remove the unload listener
      let origCallback = callback;
      callback = function() {
        container.removeEventListener("unload", remover, false);
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
    return remover;
  }
});

function removeUnloader(unloader, unloaders) {
  let index = unloaders.indexOf(unloader);
  if (index != -1)
    unloaders.splice(index, 1);
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
