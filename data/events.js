/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// Basic implementation of an event emitter for visualization plugins
// This may be built-in to jetpack, but it's not available on the HTML side so
// we need to keep this.
function Emitter() {
  this._listeners = {};
}

Emitter.prototype.on = function on(eventName, listener) {
  if (!this._listeners[eventName]) {
    this._listeners[eventName] = [];
  }
  this._listeners[eventName].push(listener);
};

Emitter.prototype.once = function once(eventName, listener) {
  var self = this;
  var wrapped = function wrapped(msg1, msg2, msg3) {
    listener(msg1, msg2, msg3);
    self.removeListener(eventName, wrapped);
  };
  this.on(eventName, wrapped);
};

Emitter.prototype.off = function off(eventName, listener) {
  if (!this._listeners[eventName]) return;
  var listenerIndex = this._listeners[eventName].indexOf(listener);
  if (listenerIndex < 0) return;
  this._listeners[eventName].splice(listenerIndex, 1);
};

Emitter.prototype.removeAllListeners = function removeAllListeners(eventName) {
  this._listeners[eventName] = [];
};

Emitter.prototype.clear = function clear() {
  this._listeners = {};
};

Emitter.prototype.emit = function emit(eventName, message, msg2, msg3) {
  if (!this._listeners[eventName]) return;
  this._listeners[eventName].forEach(function (listener) {
    listener(message, msg2, msg3);
  });
};
