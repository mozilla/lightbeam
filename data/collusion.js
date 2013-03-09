var visualizations = {};
window.addEventListener('load', function(evt){
    // Wire up events
    window.currentVisualization = visualizations.graph;
    addon.emit('uiready');
//    document.defaultView.postMessage('pageloaded', '*');
});
