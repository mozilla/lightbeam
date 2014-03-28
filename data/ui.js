// Bunch of utilities related to UI elements.
const graphNodeRadius = {
    "graph": 12
};

/* Convert a NodeList to Array */
function toArray(nl){
    return Array.prototype.slice.call(nl, 0);
}

/**************************************************
*   For accessibility:
*       if the current focused element is an anchor, press Enter will mimic mouse click on that element
*/
document.addEventListener("keypress", function(event){
    var focusedElm = document.activeElement;
    if ( event.keyCode == "13" && focusedElm.mozMatchesSelector("a") && !focusedElm.getAttribute("href") ){
        focusedElm.click();
    }
});

/* Lightbeam Logo Click handler ====================== */
document.querySelector(".main header").addEventListener("click",function(){
    location.reload();
});


/**************************************************
*   Buttons
*/

function dropdownGroup(btnGroup, callback){
    callback = callback || function(){};
    var allOptions = btnGroup.querySelectorAll(".dropdown_options a");
    toArray(allOptions).forEach(function(option){
        option.addEventListener("click", function(e){
            btnGroup.querySelector("[data-selected]").removeAttribute("data-selected");
            e.target.setAttribute("data-selected", true);
            callback( e.target.getAttribute("data-value") );
        });
    });
}

/* Bind click event listener to each of the btn_group memebers */
var btnGroupArray = toArray(document.querySelectorAll(".btn_group"));
btnGroupArray.forEach(function(btnGroup){
    dropdownGroup(btnGroup, function(val){
        val = val.toLowerCase();
        switch(val){
            case 'graph':
            case 'list':
                switchVisualization(val);
                break;
            case 'recent':
            case 'last10sites':
            case 'daily':
            case 'weekly':
                aggregate.switchFilter(val);
                document.querySelector(".filter-display header").textContent = btnGroup.querySelector("[data-selected]").textContent;
                break;
            default:
                console.log("selected val=" + val);
        }
    });
});


/* Share Data Toggle */

var shareDataToggle = document.querySelector(".toggle-btn.share-btn");

document.querySelector(".toggle-btn.share-btn").addEventListener("click",
  function(event){
    var elmClicked = event.target;
    if (elmClicked.mozMatchesSelector("input")) {
      if (elmClicked.checked){
        confirmStartSharing(true, elmClicked);
      } else {
        confirmStopSharing(elmClicked);
      }
    }
});

function confirmStartSharing(askForConfirmation, elmClicked) {
  startSharing(askForConfirmation, function(confirmed) {
    if (confirmed) {
      toggleBtnOnEffect(document.querySelector(".share-btn") );
      addon.emit("prefChanged", { "contributeData" : true });
    } else {
      elmClicked.checked = false;
    }
  });
}

function confirmStopSharing(elmClicked) {
  stopSharingDialog(function(confirmed) {
    if (confirmed) {
      toggleBtnOffEffect(document.querySelector(".share-btn"));
      addon.emit("prefChanged", { "contributeData" : false });
    } else {
      elmClicked.checked = true;
    }
  });
}

function toggleBtnOnEffect(toggleBtn){
  toggleBtn.querySelector(".toggle-btn-innner").classList.add("checked");
  toggleBtn.querySelector(".switch").classList.add("checked");
  toggleBtn.querySelector(".on-off-text").classList.add("checked");
  toggleBtn.querySelector(".on-off-text").textContent = "ON";
}

function toggleBtnOffEffect(toggleBtn){
    toggleBtn.querySelector(".toggle-btn-innner").classList.remove("checked");
    toggleBtn.querySelector(".switch").classList.remove("checked");
    toggleBtn.querySelector(".on-off-text").classList.remove("checked");
    toggleBtn.querySelector(".on-off-text").textContent = "OFF";
}

function downloadAsJson(data, defaultFilename){
    var file = new Blob([data], {type: 'application/json'});
    var reader = new FileReader();
    var a = document.createElement('a');
    reader.onloadend = function(){
        a.href = reader.result;
        a.download = defaultFilename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
    }
    reader.readAsDataURL(file);
}


document.querySelector(".download").addEventListener('click', function(evt) {
    // console.log('received export data');
    downloadAsJson([JSON.stringify(allConnections)], 'lightbeamData.json');
    evt.preventDefault();
    // window.open('data:application/json,' + exportFormat(allConnections));
});



document.querySelector('.reset-data').addEventListener('click', function(){
    confirmResetDataDialog(function(confirmed){
        if ( confirmed ){
            // currentVisualization.emit('remove');
            allConnections = [];
            addon.emit('reset');
            aggregate.emit('reset');
            location.reload(); // reload page
        }
    });
});

function getZoom(canvas){
    try{
    var box = canvas.getAttribute('viewBox')
                    .split(/\s/)
                    .map(function(i){ return parseInt(i, 10); });
    return {x: box[0], y: box[1], w: box[2], h: box[3]};
    }catch(e){
        console.log('error in getZoom, called with %o instead of an element');
        console.log('Caller: %o', caller);
    }
}

function setZoom(box,canvas){
    // TODO: code cleanup if both cases use basically the same code
    canvas.setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
}


/* Scroll over visualization to zoom in/out ========================= */

/* define viewBox limits
*  graph view default viewBox = " 0 0 750 750 "
*  map                        = " 0 0 2711.3 1196.7 "
*/
const graphZoomInLimit   = { w:250, h:250 };
const graphZoomOutLimit  = { w:4000, h:4000 };
const mapZoomInLimit     = { w:(2711.3/5), h:(1196.7/5) };
const mapZoomOutLimit    = { w:2711.3, h:1196.7 };
const svgZoomingRatio   = 1.1;

document.querySelector(".stage").addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && currentVisualization.name != "list" ){
        if ( currentVisualization.name == "graph" ){
            zoomWithinLimit(event.deltaY, vizcanvas, graphZoomInLimit, graphZoomOutLimit);
        }
    }
},false);


// check to see if the viewBox of the targeting svg is within the limit we define
function checkWithinZoomLimit(targetSvg,zoomType,zoomLimit){
    var currentViewBox = getZoom(targetSvg);
    if ( zoomType == "in" ){
        var withinZoomInLimit = ( currentViewBox.w > zoomLimit.w && currentViewBox.h > zoomLimit.h);
        if ( zoomLimit.x && zoomLimit.y ){
            withinZoomInLimit =
                withinZoomInLimit && ( currentViewBox.x < zoomLimit.x && currentViewBox.y < zoomLimit.y );
        }
        return withinZoomInLimit;
    }else{
         var withinZoomOutLimit = ( currentViewBox.w <= zoomLimit.w && currentViewBox.h <= zoomLimit.h );
         return withinZoomOutLimit;
    }
}

// Check to see if the viewBox of the targeting svg is within the limit we define
// if yes, zoom
function zoomWithinLimit(scrollDist, targetSvg, zoomInLimit, zoomOutLimit){
    if ( scrollDist >= 1 ){ // scroll up to zoom out
        for ( var i=1; i<=scrollDist; i++){
            if ( checkWithinZoomLimit(targetSvg,"out",zoomOutLimit) ){
                svgZooming(targetSvg, (1/svgZoomingRatio));
            }
        }
    }
    if ( scrollDist <= -1 ){ // scroll down to zoom in
        for ( var i=scrollDist; i<=-1; i++){
            if ( checkWithinZoomLimit(targetSvg,"in",zoomInLimit) ){
                svgZooming(targetSvg, svgZoomingRatio);
            }
        }
    }
}

// Apply zoom level
function svgZooming(target,ratio){
    var box = getZoom(target);
    var newViewBox = generateNewViewBox(target,box,ratio);
    setZoom(newViewBox, target);
}

function generateNewViewBox(target,box,ratio){
    var oldWidth = box.w;
    var newWidth = oldWidth / ratio;
    var offsetX = ( newWidth - oldWidth ) / 2;

    var oldHeight = box.h;
    var newHeight = oldHeight / ratio;
    var offsetY = ( newHeight - oldHeight ) / 2;

    box.w = box.w / ratio;
    box.h = box.h / ratio;
    box.x = box.x - offsetX;
    box.y = box.y - offsetY;

    return box;
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
        vizcanvas.style.cursor = "-moz-grab";
        var offsetX = ( Math.ceil(event.clientX) - graphDragStart.x );
        var offsetY = ( Math.ceil(event.clientY) - graphDragStart.y );
        var box = getZoom(vizcanvas);
        box.x -= ( offsetX * box.w/700);
        box.y -= ( offsetY * box.h/700);
        graphDragStart.x += offsetX;
        graphDragStart.y += offsetY;
        setZoom(box,vizcanvas);
    }

},false);

document.querySelector(".stage").addEventListener("mouseup",function(event){
    onDragGraph = false;
    vizcanvas.style.cursor = "default";
},false);

document.querySelector(".stage").addEventListener("mouseleave",function(event){
    onDragGraph = false;
    vizcanvas.style.cursor = "default";
},false);


/* Legend & Controls ===================================== */

function toggleLegendSection(eventTarget,legendElm){
    var elmToToggle = legendElm.querySelector(".legend-controls");
    if ( elmToToggle.classList.contains("hidden") ){
        elmToToggle.classList.remove("hidden");
        eventTarget.textContent = "Hide";
    }else{
        elmToToggle.classList.add("hidden");
        eventTarget.textContent = "Show";
    }
}

function toggleVizElements(elements,classToggle){
    toArray(elements).forEach(function(elm){
        elm.classList.toggle(classToggle);
    });
}

function legendBtnClickHandler(legendElm){
    legendElm.querySelector(".legend-controls").addEventListener("click", function(event){
        if (event.target.mozMatchesSelector(".btn, .btn *")){
            var btn = event.target;
            while(btn.mozMatchesSelector('.btn *')){
                btn = btn.parentElement;
            }
            btn.classList.toggle("active");
        }
    });
}



/* Glowing Effect for Graph/Clock & Highlighting Effect for List ============= */

function selectedNodeEffect(name){
    if ( currentVisualization.name == "graph") {
        resetAllGlow("all");
        addGlow(name,"selected");
    }
    if ( currentVisualization.name == "list" ){
        resetHighlightedRow();
    }
}

function connectedNodeEffect(name){
    // console.log(name);
    if ( currentVisualization.name != "list" ){
        var glow = document.querySelector(".connected-glow");
        while( glow ){
            glow = document.querySelector(".connected-glow"); 
            glow.parentNode.removeChild(glow);
        }
        addGlow(name,"connected");
    }else{
        resetHighlightedRow();
        var row = document.querySelector(".list-table tr[data-name='"+name+"']");
        if (row ){ 
            row.classList.add("selected-connected-row");
        }
    }
    
}

// for Graph & Clock
function addGlow(name,type){
    type = ( type == "selected") ? "selected-glow" : "connected-glow";
    var viz = currentVisualization.name;
    var gNodes = document.querySelectorAll(".node[data-name='"+name+"']");
    toArray(gNodes).forEach(function(gNode){
        var glowProps = calculateGlowSize(gNode,viz);
        d3.select(gNode)
                .insert('circle', ":first-child")
                .attr('cx', glowProps.cx)
                .attr('cy', glowProps.cy)
                .attr('r', glowProps.radius)
                .attr("fill", "url(#"+type+")")
                .classed(type, true); 

    });
}

function calculateGlowSize(gNode,viz){
    var glowProps = {};
    var siteNode = gNode.childNodes[0];
    var shape = siteNode.nodeName.toLowerCase();
    var radius = graphNodeRadius[currentVisualization.name];
    if ( viz == "graph" ){
        if ( shape == "polygon" ) radius *= 2.2;
        glowProps.radius = radius + 22;
    }else{
        glowProps.radius = radius * 4;
    }

    glowProps.cx = siteNode.getAttribute("cx") || 0;
    glowProps.cy = siteNode.getAttribute("cy") || 0;    
    
    return glowProps;
}

// for Graph
function resetAllGlow(type){
    var selectedGlow;
    var connectedGlow;
    if ( type == "selected" || type == "all"){
        while( document.querySelector(".selected-glow") ){
            selectedGlow = document.querySelector(".selected-glow");
            selectedGlow.parentNode.removeChild(selectedGlow);
        }
    }
    if ( type == "connected" || type == "all"){
        while( document.querySelector(".connected-glow") ){
            connectedGlow = document.querySelector(".connected-glow");
            connectedGlow.parentNode.removeChild(connectedGlow);
        }
    }
}

// for List
function resetHighlightedRow(){
    var preHighlighted = document.querySelector(".list-table .selected-connected-row");
    if ( preHighlighted ){
        preHighlighted.classList.remove("selected-connected-row");
    }
}

/**************************************************
*   Singular / Plural Noun
*/
function singularOrPluralNoun(num,str){
    if ( typeof num != "number" ){
        num = parseFloat(num);
    }
    return ( num > 1) ? str+"s" : str;
}

/**************************************************
*   Check if a site has certain preference set to it
*/
function siteHasPref(site,pref){
  return (Object.keys(userSettings).indexOf(site) > -1 &&
          userSettings[site].contains(pref));
}

/**************************************************
*   When initializing Graph View / Clock View
*   if the "Watched Sites" or "Blocked Sites" toggles are on, apply colour to the corresponding nodes
*/
function colourHighlightNodes(highlight){
    var watchedSites = document.querySelectorAll(".watched");
    var blockedSites = document.querySelectorAll(".blocked");
    if ( highlight.watched ){
        for (var i=0; i<watchedSites.length; i++){
            watchedSites[i].classList.add("watchedSites");
        }
    }else{
        for (var i=0; i<watchedSites.length; i++){
            watchedSites[i].classList.remove("watchedSites");
        }
    }
    if ( highlight.blocked ){
        for (var i=0; i<blockedSites.length; i++){
            blockedSites[i].classList.add("blockedSites");
        }
    }else{
        for (var i=0; i<blockedSites.length; i++){
            blockedSites[i].classList.remove("blockedSites");
        }
    }
}

function setPrefs(event) {
  console.log("Setting content script prefs", JSON.stringify(event));
  if ("contributeData" in event) {
    var toggleBtn = document.querySelector(".share-btn");
    if (event["contributeData"]) {
      toggleBtn.querySelector("input").checked = true;
      toggleBtnOnEffect(toggleBtn);
    } else {
      toggleBtn.querySelector("input").checked = false;
      toggleBtnOffEffect(toggleBtn);
    }
  }
  if ("defaultVisualization" in event) {
    currentVisualization = visualizations[event["defaultVisualization"]];
  }
  // This is not working quite
  if ("defaultFilter" in event) {
    aggregate.currentFilter = event["defaultFilter"];
    document.querySelector('a[data-value=' + aggregate.currentFilter + ']').
      dataset.selected = true;
    document.querySelector(".filter-display header").textContent =
      document.querySelector(".btn_group.session").querySelector("[data-selected]").textContent;
  }
}
