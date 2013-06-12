
/* Convert a NodeList to Array */
function toArray(nl){
    return Array.prototype.slice.call(nl, 0);
}


/* DOMContentLoaded event listener */
window.addEventListener("DOMContentLoaded", function(){

    function dropdownGroup(btnGroup, callback){
        var view = btnGroup.querySelector("[data-view]");
        var list = btnGroup.querySelector("[data-list]");

        callback = callback || function(){};

        btnGroup.addEventListener("click", function(e){
            var selected = btnGroup.querySelector("[data-selected]");
            var targetValue = e.target.getAttribute("data-value");
            var activeDropdown = document.querySelector(".active_dropdown");

            // opens up the current selected dropdown list
            btnGroup.querySelector(".dropdown_options").classList.toggle("collapsed");
            btnGroup.classList.toggle("active_dropdown");

            // when user selects an option from the dropdown list
            if ( targetValue ){
                view.querySelector("a:not(.invi_focus)").innerHTML = e.target.innerHTML;
                selected.removeAttribute("data-selected");
                e.target.setAttribute("data-selected", true);
                callback(targetValue);
            }

        }, false);
    }

    /* Bind click event listener to each of the btn_group memebers */
    var btnGroupArray = toArray(document.querySelectorAll(".btn_group"));
    btnGroupArray.forEach(function(btnGroup){
        dropdownGroup(btnGroup, function(val){
            val = val.toLowerCase();
            switch(val){
                case 'clock':
                case 'graph':
                case 'list':
                    switchVisualization(val);
                    break;
                default:
                    console.log("selected val=" + val);
            }
        });
    });


    /* Toggle Info Panel */
    document.querySelector(".show-info-button").addEventListener("click", function(){
        document.querySelector("#content").classList.toggle("showinfo");
    });


    /* When a open dropdown list loses focus, collapse it. */
    window.addEventListener("click", function(e){
        var activeDropdown = document.querySelector(".active_dropdown");
        if ( activeDropdown && !activeDropdown.contains(e.target) ){
                activeDropdown.querySelector(".dropdown_options").classList.add("collapsed");
                activeDropdown.classList.remove("active_dropdown");
        }
    }, true);


});

document.querySelector(".download").addEventListener('click', function() {
    console.log('received export data');
    window.open('data:application/json,' + exportFormat(allConnections));
});

document.querySelector('.reset-data').addEventListener('click', function(){
    addon.emit('reset');
    aggregate.emit('reset');
    currentVisualization.emit('reset');
    allConnections = [];
    delete localStorage.connections;
    delete localStorage.tempConnections;
    delete localStorage.totalNumConnections;
    // FIXME: empty the data from current view too
});

var uploadButton = document.querySelector('.upload');
if (localStorage.userHasOptedIntoSharing && localStorage.userHasOptedIntoSharing === 'true'){
    uploadButton.innerHTML = 'Stop Sharing';
}

uploadButton.addEventListener('click', function(){
    if (localStorage.userHasOptedIntoSharing && localStorage.userHasOptedIntoSharing === 'true'){
        stopSharing();
    }else{
        startSharing();
    }
});


function getZoom(canvas){
    // TODO: code cleanup if both cases use basically the same code
    switch(canvas){
        case 'vizcanvas': {
            var box = document.querySelector('.vizcanvas')
                        .getAttribute('viewBox')
                        .split(/\s/)
                        .map(function(i){ return parseInt(i, 10); });
            return {x: box[0], y: box[1], w: box[2], h: box[3]};
        }
        case 'mapcanvas': {
            var box = document.querySelector('.mapcanvas')
                        .getAttribute('viewBox')
                        .split(/\s/)
                        .map(function(i){ return parseInt(i, 10); });
            console.log(box);
            return {x: box[0], y: box[1], w: box[2], h: box[3]};
        }
        default: throw new Error('It has to be one of the choices above');
    }
}

function setZoom(box,canvas){
    // TODO: code cleanup if both cases use basically the same code
    switch(canvas){
        case 'vizcanvas': {
                document.querySelector('.vizcanvas')
                    .setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
                break;
        }
        case 'mapcanvas': {
                document.querySelector('.mapcanvas')
                    .setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
                break;

        }
        default: throw new Error('It has to be one of the choices above');
    }
}


/* Scroll over visualization to zoom in/out ========================= */

/* define viewBox limits
*  graph view default viewBox = " 0 0 1000 1000 "
*  clock                      = " -350 -495 700 500 "
*  map                        = " 0 0 2711.3 1196.7 "
*/
var graphZoomInLimit   = { x:300, y:300, w:200, h:300 };
var graphZoomOutLimit  = { w:4000, h:4000 };
var clockZoomInLimit   = { w:560, h:400 };
var clockZoomOutLimit  = { w:2800, h:2800 };
var mapZoomInLimit     = { w:(2711.3/5), h:(1196.7/5) };
var mapZoomOutLimit    = { w:2711.3, h:1196.7 };

document.querySelector(".stage").addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && currentVisualization.name != "list" ){
        if ( currentVisualization.name == "graph" ){ 
            zoomWithinLimit(event,"vizcanvas", graphZoomInLimit, graphZoomOutLimit);
        }else{ // clock view
            zoomWithinLimit(event,"vizcanvas", clockZoomInLimit, clockZoomOutLimit);
        }
    }
},false);

document.querySelector(".world-map").addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector(".mapcanvas, .mapcanvas *") ){
        zoomWithinLimit(event,"mapcanvas", mapZoomInLimit, mapZoomOutLimit );
    }
},false);


// Check to see if the viewBox of the targeting svg is within the limit we define
// if yes, zoom
function zoomWithinLimit(event, targetSvg, zoomInLimit, zoomOutLimit){
    var currentViewBox = getZoom(targetSvg);
    
    var withinZoomInLimit = ( currentViewBox.w > zoomInLimit.w && currentViewBox.h > zoomInLimit.h);
    if ( zoomInLimit.x && zoomInLimit.y ){
        withinZoomInLimit =
            withinZoomInLimit && ( currentViewBox.x < zoomInLimit.x && currentViewBox.y < zoomInLimit.y );
    }
    
    var withinZoomOutLimit = ( currentViewBox.w <= zoomOutLimit.w && currentViewBox.h <= zoomOutLimit.h );
    
    // event.deltaY can only be larger than 1.0 or less than -1.0
    // conditions set to +/- 3 to lower the scrolling control sensitivity
    if ( event.deltaY >= 3 && withinZoomOutLimit ){ // scroll up to zoom out
        svgZooming(targetSvg, (1/1.25));
    }
    if ( event.deltaY <= -3 && withinZoomInLimit) { // scroll down to zoom in
        svgZooming(targetSvg, 1.25);
    }
}

// Apply zoom level
function svgZooming(target,ratio){
    
    function generateNewViewBox(target, box){
        var oldWidth = box.w;
        var newWidth = oldWidth / ratio;
        var offsetX = ( newWidth - oldWidth ) / 2;
        
        var oldHeight = box.h;
        var newHeight = oldHeight / ratio;
        var offsetY = ( newHeight - oldHeight ) / 2;
        
        box.w = box.w / ratio;
        box.h = box.h / ratio;
        box.x = box.x - offsetX;
        
        if ( target == "vizcanvas" ){
            box.y = ( currentVisualization.name == "graph") ? (box.y - offsetY) : -1 * (box.h - 5);
        }else{
            box.y = box.y - offsetY;
        }
        
        return box;
    }


    if ( target == "vizcanvas" ){
        var box = getZoom("vizcanvas");
        var newViewBox = generateNewViewBox(target, box);
        setZoom(newViewBox,"vizcanvas");
        
    }else{
        var box = getZoom("mapcanvas");
        var newViewBox = generateNewViewBox(target, box);
        setZoom(newViewBox,"mapcanvas");
    }

}


/* Pan by dragging ======================================== */

var onDragGraph = false;
var onDragMap = false;
var graphDragStart = {};
var mapDragStart = {};

/* vizcanvas */
document.querySelector(".stage").addEventListener("mousedown",function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && !event.target.mozMatchesSelector(".node, .node *") ){
        onDragGraph = true;
        graphDragStart.x = event.clientX;
        graphDragStart.y = event.clientY;
    }

},false);

document.querySelector(".stage").addEventListener("mousemove",function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas") && !event.target.mozMatchesSelector(".node, .node *") && onDragGraph ){
        document.querySelector(".vizcanvas").style.cursor = "-moz-grab";
        var offsetX = ( Math.ceil(event.clientX) - graphDragStart.x );
        var offsetY = ( Math.ceil(event.clientY) - graphDragStart.y );
        var box = getZoom("vizcanvas");
        box.x -= ( offsetX * box.w/700);
        box.y -= ( offsetY * box.h/700);
        graphDragStart.x += offsetX;
        graphDragStart.y += offsetY;
        setZoom(box,"vizcanvas");
    }

},false);

document.querySelector(".stage").addEventListener("mouseup",function(event){
    onDragGraph = false;
    document.querySelector(".vizcanvas").style.cursor = "default";
},false);

document.querySelector(".stage").addEventListener("mouseleave",function(event){
    onDragGraph = false;
    document.querySelector(".vizcanvas").style.cursor = "default";
},false);

/* mapcanvas */
document.querySelector(".world-map").addEventListener("mousedown",function(event){
    if ( event.target.mozMatchesSelector(".mapcanvas, .mapcanvas *") ){
        onDragMap = true;
        mapDragStart.x = event.clientX;
        mapDragStart.y = event.clientY;
    }
},false);

document.querySelector(".world-map").addEventListener("mousemove",function(event){
    if ( event.target.mozMatchesSelector(".mapcanvas, .mapcanvas *") && onDragMap ){
        document.querySelector(".mapcanvas").style.cursor = "-moz-grab";
        var offsetX = ( Math.ceil(event.clientX) - mapDragStart.x );
        var offsetY = ( Math.ceil(event.clientY) - mapDragStart.y );
        var box = getZoom("mapcanvas");
        box.x -= (offsetX * 10);
        box.y -= (offsetY * 10);
        mapDragStart.x += offsetX;
        mapDragStart.y += offsetY;
        setZoom(box,"mapcanvas");
    }

},false);

document.querySelector(".world-map").addEventListener("mouseup",function(event){
    onDragMap = false;
    document.querySelector(".mapcanvas").style.cursor = "default";
},false);

document.querySelector(".world-map").addEventListener("mouseleave",function(event){
    onDragMap = false;
    document.querySelector(".mapcanvas").style.cursor = "default";
},false);


/* Help Mode ========================= */
document.querySelector(".help-mode").checked = false;
document.querySelector(".help-mode").addEventListener("click", function(){
    if( this.checked ){
        triggerHelp(document.querySelector("body"), "toggleOnHelp", currentVisualization.name);
    }else{
        triggerHelp(document.querySelector("body"), "toggleOffHelp", currentVisualization.name);
    }
});


/* Settings Page ========================= */
document.querySelector(".settings").addEventListener("click", function(event){
    if ( currentVisualization.name == "clock" || currentVisualization.name == "graph" ){
        document.querySelector(".vizcanvas").classList.toggle("hide");
    }else{
        document.querySelector(".list-breadcrumb").classList.toggle("hide");
        document.querySelector(".list-header").classList.toggle("hide");
        document.querySelector(".list-table").classList.toggle("hide");

    }
    var infoBarVisible = document.querySelector("#content").classList.contains("showinfo");
    if ( infoBarVisible ){
        document.querySelector("#content").classList.remove("showinfo");
    }
    document.querySelector(".settings-page").classList.toggle("hide");
});

document.querySelector(".settings-page").addEventListener("click", function(event){
    if (event.target.mozMatchesSelector(".settings-page ul li, .settings-page ul li *")){
        var site = event.target;
        while(site.mozMatchesSelector(".settings-page ul li *")){
            site = site.parentElement;
        }
        site.querySelector(".settings-option").classList.toggle("hide");
        site.querySelector(".icon-caret-right").parentElement.classList.toggle("hide");
        site.querySelector(".icon-caret-down").parentElement.classList.toggle("hide");
    }
},false);


/* Get data summary =============================== */

// to be fixed
function getSummary(callback){
    var summary = {};
    summary.localTimeSince = "(to be fixed)";
    summary.numConnections = allConnections.length;
    summary.numAllSites = aggregate.allnodes.length;
    summary.numVisited = aggregate.sitenodes.length;
    summary.numThird = aggregate.thirdnodes.length;
    summary.numBoth = aggregate.bothnodes.length;
    callback(summary);
}


/* Clock View ===================================== */

document.querySelector('#content').addEventListener('click', function(event){
    function highlightColludedNode(selection){
        selection.each(function(){
            var colludedNode = d3.select(this);
            if ( colludedNode.classed("source") ){  // this instance of colluded node is a source node
                colludedNode.classed("colluded-source", true);
            }
            if ( colludedNode.classed("target") ){ // this instance of colluded node is a target node
                colludedNode.classed("colluded-target", true);
            }
        });
    }
    /*
    *   When a node in the clock visualization is clicked,
    *       all instances of the same node across the day should be highlighted
    *       all colluded nodes should also be highlighted (differently)
    */
    if ( currentVisualization.name == "clock" ){
        // click could happen on .node or an element inside of .node
        if (event.target.mozMatchesSelector('.node, .node *')){
            var node = event.target;
            while(node.mozMatchesSelector('.node *')){
                node = node.parentElement;
            }
            
            // reset styling effect
            d3.selectAll("g.node").classed("clicked-node", false)
                                  .classed("colluded-source", false)
                                  .classed("colluded-target", false);
            
            // highlight all instances of the clicked node(both source and target)
            var clickedNodeName = node.getAttribute("data-name");
            d3.selectAll("g[data-name='" + clickedNodeName +"']")
                    .classed("clicked-node", true);
            
            // find all the colluded sites and highlight all instances of them
            for ( var key in aggregate.nodeForKey( clickedNodeName ) ){
                if ( key != clickedNodeName ){ 
                    d3.selectAll("g[data-name='"+ key +"']").call(highlightColludedNode);
                }
            }
            
        }
    }
},false);


/* Export ========== */

function exportFormat(connections){
//    if (!lastSync){
//        lastSync = 0;
//    }
    return JSON.stringify({
        format: 'Collusion Save File',
        version: '1.1',
        token: localStorage.collusionToken,
        connections: connections
    });
}
