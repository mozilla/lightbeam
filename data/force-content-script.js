var graphCallback = null;
var queuedGraph = null;

unsafeWindow.onGraph = function onGraph(cb) {
  graphCallback = cb;
  if (queuedGraph) {
    var graph = queuedGraph;
    queuedGraph = null;
    graphCallback(queuedGraph);
  }
};

self.port.on("log", function(log) {
  log = JSON.parse(log);
  if (graphCallback)
    graphCallback(log);
  else
    queuedGraph = log;
});
