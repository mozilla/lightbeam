var graphCallback = null;

unsafeWindow.onGraph = function onGraph(cb) {
  graphCallback = cb;
  self.port.emit("init");
};

unsafeWindow.resetGraph = function resetGraph() {
  self.port.emit('reset');
};

self.port.on("log", function(log) {
  log = JSON.parse(log);
  if (graphCallback)
    graphCallback(log);
});
