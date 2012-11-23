var graphCallback = null;


unsafeWindow.onGraph = function onGraph(cb) {
  graphCallback = cb;
  self.port.emit("init");
};

unsafeWindow.setCollusionSounds = function setCollusionSounds(flag){
    console.log('set collusion sounds: ', flag);
    self.port.emit('setCollusionSounds', flag);
};

/* Called by add-on to set the last value of saved sounds pref to checkbox */
self.port.on('initSounds', function(flag){
    console.log('soundsFlag restored: ', flag);
    unsafeWindow.document.getElementById('play-sounds').checked = !!flag;
    
});


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

