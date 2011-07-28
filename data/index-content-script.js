var graphCallback = null;

unsafeWindow.onGraph = function onGraph(cb) {
  graphCallback = cb;
  self.port.emit("init");
};

self.port.on("log", function(log) {
  log = JSON.parse(log);
  if (graphCallback)
    graphCallback(log);
});
