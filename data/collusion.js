var visualizations = {};
var currentVisualization;
window.addEventListener('load', function(evt){
    // Wire up events
    document.querySelector('.btn_group.visualization').click();
    document.querySelector('[data-value=' + (localStorage.visualization || 'Graph') + ']').click();
});

function initCap(str){
    return str[0].toUpperCase() + str.slice(1);
}


function switchVisualization(name){
    if (currentVisualization === visualizations[name]) return;
    localStorage.visualization = initCap(name);
    if (currentVisualization){
        currentVisualization.emit('remove');
    }
    currentVisualization = visualizations[name];
    // toggle off info panel, settings page, help bubbles
    document.querySelector("#content").classList.remove("showinfo");
    document.querySelector(".settings-page").classList.add("hide");
    clearAllBubbles();
    
    addon.emit('uiready');
}
