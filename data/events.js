// Basic implementation of an event emitter for visualization plugins

function Emitter(){
    this._listeners = {};
}

Emitter.prototype.on = function on(eventName, listener){
    if (!this._listeners[eventName]){
        this._listeners[eventName] = [];
    }
    this._listeners[eventName].push(listener);
};

Emitter.prototype.removeListener = function removeListener(eventName, listener){
    if (!this._listeners[eventName]) return;
    var listenerIndex = this._listeners.indexOf(listener);
    if (listenerIndex < 0) return;
    this._listeners[eventName].splice(listenerIndex, 1);
};

Emitter.prototype.removeAllListeners = function removeAllListeners(eventName){
    this._listeners[eventName] = [];
};

Emitter.prototype.clear = function clear(){
    this._listeners = {};
};

Emitter.prototype.emit = function emit(eventName, message, msg2, msg3){
    if (!this._listeners[eventName]) return;
    this._listeners[eventName].forEach(function(listener){
        listener(message, msg2, msg3);
    });
};
