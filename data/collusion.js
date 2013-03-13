var visualizations = {};
window.addEventListener('load', function(evt){
    // Wire up events
    window.currentVisualization = visualizations.graph;
    addon.emit('uiready');
//    document.defaultView.postMessage('pageloaded', '*');
});

function switchVisualization(name){
    if (currentVisualization === visualizations[name]) return;
    currentVisualization.emit('remove');
    currentVisualization = visualizations[name];
    addon.emit('uiready');
}
