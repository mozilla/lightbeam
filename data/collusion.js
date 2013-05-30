var visualizations = {};
var currentVisualization;
var allConnections = [];

window.addEventListener('load', function(evt){
    // Wire up events
    document.querySelector('.btn_group.visualization').click();
    document.querySelector('[data-value=' + (localStorage.visualization || 'Graph') + ']').click();
});

function initCap(str){
    return str[0].toUpperCase() + str.slice(1);
}


function switchVisualization(name){
    console.log('switchVisualizations(' + name + ')');
    if (currentVisualization){
        if (currentVisualization === visualizations[name]) return;
        currentVisualization.emit('remove');
    }
    localStorage.visualization = initCap(name);
    currentVisualization = visualizations[name];
    currentVisualization.emit('setFilter');
    // toggle off info panel, settings page, help bubbles
    document.querySelector("#content").classList.remove("showinfo");
    document.querySelector(".settings-page").classList.add("hide");
    clearAllBubbles();
    // show vizcanvas again in case it is hidden
    document.querySelector(".vizcanvas").classList.remove("hide");

    console.log(allConnections);
    addon.emit('uiready');
}
