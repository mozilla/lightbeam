
/* Convert a NodeList to Array */
function toArray(nl){
    return Array.prototype.slice.call(nl, 0);
}


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

// Default selections
document.querySelector('a[data-value=' + (localStorage.currentFilter || 'daily') + ']').dataset.selected = true;

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
            case 'recent':
            case 'last10sites':
            case 'daily':
            case 'weekly':
                aggregate.switchFilter(val);
                break;
            default:
                console.log("selected val=" + val);
        }
    });
});


/* Share Data Toggle */

var shareDataToggle = document.querySelector(".toggle-btn.share-btn");

document.querySelector(".toggle-btn.share-btn").addEventListener("click",function(event){
    var elmClicked = event.target;
    if ( elmClicked.mozMatchesSelector("input") ){
        if ( elmClicked.checked ){
            confirmStartSharing(elmClicked);
        }else{
            confirmStopSharing(elmClicked);
        }
    }
});

function confirmStartSharing(elmClicked){
    startSharing(function(confirmed){
        if ( confirmed ){
            toggleBtnOnEffect( document.querySelector(".share-btn") );
        }else{
            elmClicked.checked = false;
        }
    });
}

function confirmStopSharing(elmClicked){
     stopSharing(function(confirmed){
        if ( confirmed ){
            toggleBtnOffEffect( document.querySelector(".share-btn") );
        }else{
           elmClicked.checked = true;
        }
    });
}


if (localStorage.userHasOptedIntoSharing && localStorage.userHasOptedIntoSharing === 'true'){
    var toggleBtn = document.querySelector(".share-btn");
    toggleBtn.querySelector("input").checked = true;
    toggleBtnOnEffect( toggleBtn );
}


function toggleBtnOnEffect(toggleBtn){
    toggleBtn.querySelector(".toggle-btn-innner").classList.add("checked");
    toggleBtn.querySelector(".switch").classList.add("checked");
    toggleBtn.querySelector(".on-off-text").classList.add("checked");
    toggleBtn.querySelector(".on-off-text").innerHTML = "ON";
}

function toggleBtnOffEffect(toggleBtn){
    toggleBtn.querySelector(".toggle-btn-innner").classList.remove("checked");
    toggleBtn.querySelector(".switch").classList.remove("checked");
    toggleBtn.querySelector(".on-off-text").classList.remove("checked");
    toggleBtn.querySelector(".on-off-text").innerHTML = "OFF";
}


document.querySelector(".download").addEventListener('click', function(evt) {
    // console.log('received export data');
    var file = new Blob([exportFormat(allConnections)], {type: 'application/json'});
    var reader = new FileReader();
    var a = document.createElement('a');
    reader.onloadend = function(){
        a.href = reader.result;
        a.download = 'collusionData.json';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
    };
    reader.readAsDataURL(file);
    evt.preventDefault();
    // window.open('data:application/json,' + exportFormat(allConnections));
});

document.querySelector('.reset-data').addEventListener('click', function(){
    dialog( {   "title": "Reset Data",
                "message": "Are you sure you want to reset your data?"
            },function(confirmed){
                if ( confirmed ){
                    addon.emit('reset');
                    aggregate.emit('reset');
                    currentVisualization.emit('reset');
                    allConnections = [];
                    Object.keys(localStorage).sort().forEach(function(key){
                        if ( key.charAt(0) == "2" ){ // date keys are in the format of yyyy-mm-dd
                            delete localStorage[key];;
                        }
                    });
                    delete localStorage.dnsDialogs;
                    updateStatsBar();
                }
            }
    );
});

// function handleDisclosureToggle(elem){
//     console.log('disclosure toggled');
// }

// function handleUserSettingToggle(elem){
//     console.log('User setting changed');
// }

// document.querySelector('.stage').addEventListener('click', function(event){
//     // demultiplex "live" event handlers
//     if (event.target.mozMatchesSelector('.disclosure')){
//         handleDisclosureToggle(event.target);
//         event.preventDefault();
//         event.stopPropagation();
//     }else if (event.target.mozMatchesSelector('.userSetting')){
//         handleUserSettingToggle(event.target);
//         event.stopPropagation();
//     }else if (event.target.mozMatchesSelector('[type=checkbox]')){
//         event.stopPropagation();
//         if (event.target.mozMatchesSelector('selectedHeader')){
//             // what to do here, select all or sort?
//         }
//     }else{
//         console.log('so what is it, then? %o', event.target);
//     }
// });


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
*  graph view default viewBox = " 0 0 1000 1000 "
*  clock                      = " -350 -495 700 500 "
*  map                        = " 0 0 2711.3 1196.7 "
*/
var graphZoomInLimit   = { x:300, y:300, w:200, h:300 };
var graphZoomOutLimit  = { w:4000, h:4000 };
var clockZoomInLimit   = { w:350, h:250 };
var clockZoomOutLimit  = { w:2800, h:2800 };
var mapZoomInLimit     = { w:(2711.3/5), h:(1196.7/5) };
var mapZoomOutLimit    = { w:2711.3, h:1196.7 };

document.querySelector(".stage").addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && currentVisualization.name != "list" ){
        if ( currentVisualization.name == "graph" ){
            zoomWithinLimit(event, vizcanvas, graphZoomInLimit, graphZoomOutLimit);
        }else{ // clock view
            zoomWithinLimit(event, vizcanvas, clockZoomInLimit, clockZoomOutLimit);
        }
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


/* Export ========== */

function exportFormat(connections, roundOff){
    var tempConnections = excludePrivateConnection(connections).slice(0);
    if ( roundOff ){
        tempConnections = roundOffTimestamp(tempConnections);
    }
    return JSON.stringify({
        format: 'Collusion Save File',
        version: '1.1',
        token: localStorage.collusionToken,
        connections: tempConnections
    }, null, "  ");
}

/* Filter out connections collected in Private Mode */
function excludePrivateConnection(connections){
    return connections.filter(function(connection){
        return (connection[FROM_PRIVATE_MODE] == null);
    })
}

function roundOffTimestamp(connections){
    return  connections.map(function(conn){
                var tempConn = conn.slice(0);
                tempConn[TIMESTAMP] -= ( tempConn[TIMESTAMP] % roundOffFactor );
                return tempConn;
            });
}


/* Info Panel Connections List ===================================== */

document.querySelector(".connections-list ul").addEventListener("click", function(event){
    if (event.target.mozMatchesSelector("li")){
        if ( currentVisualization.name === "clock" ){
            applyHighlightingEffect(event.target.innerHTML);
        }
        else if ( currentVisualization.name === "list" ){
            //currentVisualization.emit("showFilteredTable", event.target.innerHTML);
        }else{

        }
    }
});


/* Legend & Controls ===================================== */

function toggleLegendSection(eventTarget,legendElm){
    var elmToToggle = legendElm.querySelector(".legend-controls");
    if ( elmToToggle.classList.contains("hidden") ){
        elmToToggle.classList.remove("hidden");
        eventTarget.innerHTML = "Hide";
    }else{
        elmToToggle.classList.add("hidden");
        eventTarget.innerHTML = "Show";
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


/* Dialog / Popup ===================================== */

// options: name, title, message, type, dnsPrompt(Do Not Show)
function dialog(options,callback){
    var dnsPref = localStorage.dnsDialogs || "[]";
    dnsPref = JSON.parse(dnsPref);
    if ( dnsPref.indexOf(options.name) > -1 ) return; // according to user pref, do not show this dialog
    showDialog(options,dnsPref,callback);
}

function showDialog(options,dnsPref,callback){
    var titleBar = "<div class='dialog-title'>" + (options.title || "&nbsp;") + "</div>";
    var messageBody = "<div class='dialog-message'>" + (options.message || "&nbsp;") + "</div>";
    var controls = "<div class='dialog-controls'>"+
                        "<div class='dialog-dns hidden'><input type='checkbox' /> Do not show this again.</div>" +
                        "<div class='pico-close dialog-cancel'>Cancel</div>" +
                        "<div class='pico-close dialog-ok'>OK</div>" +
                    "</div>";

    var modal = picoModal({
        content: titleBar + messageBody + controls,
        closeButton: false,
        overlayClose: false,
        // width: 400,
        overlayStyles: {
            backgroundColor: "#000",
            opacity: 0.75
        }
    });

    if ( options.dnsPrompt ){ // show Do Not Show Again prompt
        document.querySelector(".dialog-dns").classList.remove("hidden");
    }
    if ( options.type == "alert" ){
        document.querySelector(".dialog-cancel").classList.add("hidden");
    }

    toArray(document.querySelectorAll(".pico-close")).forEach(function(btn){
        btn.addEventListener("click", function(event){
            if ( options.dnsPrompt && (event.target.innerHTML == "OK") ){ // Do Not Show
                var checked = document.querySelector(".dialog-dns input").checked;
                if ( checked ){ // user does not want this dialog to show again
                    dnsPref.push(options.name);
                    localStorage.dnsDialogs = JSON.stringify(dnsPref);
                }
            }
            modal.close();
            callback( (event.target.innerHTML == "OK") ? true : false );
        });
    });
}

