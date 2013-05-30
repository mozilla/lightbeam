var visualizations = {};
var currentVisualization;
var allConnections = [];

window.addEventListener('load', function(evt){
    // Wire up events
    document.querySelector('.btn_group.visualization').click();
    document.querySelector('[data-value=' + (localStorage.visualization || 'Graph') + ']').click();
});

window.addEventListener('beforeunload', function(){
    saveConnections(allConnections);
}, false);

function initCap(str){
    return str[0].toUpperCase() + str.slice(1);
}


function switchVisualization(name){
    console.log('switchVisualizations(' + name + ')');
    saveConnections(allConnections);
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

    addon.emit('uiready');
}


function saveConnections(connections){
    if ( localStorage.connections && localStorage.connections != "[]" ){
        // TODO: currently using localStorage.totalSize to define the lastSavedIndex
        // will have to use timestamp once we have enable fitlering
        console.log("== existed ============");
        var paresedConnections = JSON.parse(localStorage.connections);
        var unsavedConnections = connections.slice(localStorage.totalSize, connections.length);
        localStorage.connections = JSON.stringify( paresedConnections.concat(unsavedConnections) );
        console.log("--- unsavedConnections.length = " + unsavedConnections.length );
    }else{
        console.log("== NOT existed ============");
        localStorage.connections = JSON.stringify(connections);
    }
    localStorage.totalSize = JSON.parse(localStorage.connections).length;
}