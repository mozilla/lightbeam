var CollusionAddon = (function() {
  var self = {
    isInstalled: function() {
      return ('onGraph' in window);
    },
    onGraph: window.onGraph,
    importGraph: window.importGraph,
    resetGraph: window.resetGraph,
    saveGraph: window.saveGraph,
    getSavedGraph: window.getSavedGraph,
    whitelistDomain: window.whitelistDomain,
    getPanelDimensions: window.getPanelDimensions,
    shareGraph: window.shareGraph
  };

  return self;
})();
