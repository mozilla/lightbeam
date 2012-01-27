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

self.port.on("log", function(log) {
  log = JSON.parse(log);
  if (graphCallback)
    graphCallback(log);
});
