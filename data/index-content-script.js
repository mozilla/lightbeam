var graphCallback = null;

unsafeWindow.onGraph = function onGraph(cb) {
  graphCallback = cb;
  self.port.emit("init");
};

unsafeWindow.resetGraph = function resetGraph() {
  self.port.emit('reset');
};

unsafeWindow.importGraph = function importGraph(data) {
  self.port.emit('import', data);
};

unsafeWindow.saveGraph = function saveGraph(data) {
  self.port.emit('save', data);
};

unsafeWindow.getSavedGraph = function getSavedGraph() {
  self.port.emit('getSavedGraph')
};

self.port.on("log", function(log) {
  console.log("In index-content-script function log: " + log);
  log = JSON.parse(log);
  if (graphCallback)
    graphCallback(log);
});

self.port.on("getSavedGraph", function(log) {
  if (log != null) {
      log = JSON.parse(log);
  } else {
      log = {};
  }
  if (graphCallback) {
    graphCallback(log);
  }
});
