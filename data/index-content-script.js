var graphCallback = null;

unsafeWindow.setCollusionSounds = function(flag){
    self.port.emit('setCollusionSounds', flag);
}

unsafeWindow.onGraph = function onGraph(cb) {
  graphCallback = cb;
  self.port.emit("init");
};

/* resetGraph effectively wipes out the graph in storage
 * because after it is called, an empty graph is passed
 * to 'self.port.on("log")'.
 */
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
  self.port.emit('getSavedGraph');
};

unsafeWindow.whitelistDomain = function whitelistDomain(domain) {
  self.port.emit('whitelistDomain', {"domain": domain});
};

unsafeWindow.shareGraph = function shareGraph() {
  self.port.emit('uploadGraph');
};

self.port.on("log", function(log) {
  log = JSON.parse(log);
  if (graphCallback) {
    self.port.emit('save', JSON.stringify(log));
    graphCallback(log);
  }
});

self.port.on("getSavedGraph", function(saved_graph) {
  self.port.emit('import', saved_graph);
  window.location.reload();
});

self.port.on("setPanelSize", function(data) {
  if (unsafeWindow.makeGraphSizedToPanel) {
    unsafeWindow.makeGraphSizedToPanel(data);
  }
});