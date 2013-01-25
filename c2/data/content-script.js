var graphCallback = null;

function init(cb) {
  graphCallback = cb;
  self.port.emit("init");
};

/* resetGraph effectively wipes out the graph in storage
 * because after it is called, an empty graph is passed
 * to 'self.port.on("log")'.
 */
function reset() {
  self.port.emit('reset');
};

function save() {
  self.port.emit('save');
};

self.port.on("log", function(log) {
  log = JSON.parse(log);
  if (graphCallback) {
    self.port.emit('save', JSON.stringify(log));
    graphCallback(log);
  }
});

unsafeWindow.Collusion = {
  init: init,
  reset: reset,
  save: save
};
