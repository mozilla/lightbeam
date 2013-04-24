
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
    addon.once('export-data', function(connections){
        console.log('received export data');
        window.open('data:application/json,' + connections);
    });
    addon.emit('export');
});

document.querySelector('.reset-data').addEventListener('click', function(){
    addon.emit('reset');
    aggregate.emit('reset');
    currentVisualization.emit('reset');
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

function stopSharing(){
        if (confirm('You are about to stop sharing data with the Mozilla Collusion server.\n\n' +
                    'By clicking Okay you will no longer be uploading data.')){
        addon.emit('stopUpload');
        uploadButton.innerHTML = 'Share Data';
        localStorage.userHasOptedIntoSharing = false;
    }
}

function startSharing(){
    if (confirm('You are about to start uploading anonymized data to the Mozilla Collusion server. ' +
                'Your data will continue to be uploaded periodically until you turn off sharing. ' +
                'For more information about the data we upload, how it is anonymized, and what Mozilla\'s ' +
                'privacy policies are, please visit http://ItsOurData.com/privacy/.\n\nBy clicking Okay ' +
                'you are agreeing to share your data under those terms.')){
        addon.emit('startUpload');
        uploadButton.innerHTML = 'Stop Sharing';
        localStorage.userHasOptedIntoSharing = true;
    }
}

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
            var box = document.querySelector('#mapcanvas')
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
                document.querySelector('#mapcanvas')
                    .setAttribute('viewBox', [box.x, box.y, box.w, box.h].join(' '));
                break;

        }
        default: throw new Error('It has to be one of the choices above');
    }
}

document.querySelector('.controls_options .move-up').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dY = Math.floor(box.h / 10);
    box.y += dY;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .move-down').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dY = Math.floor(box.h / 10);
    box.y -= dY;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .move-left').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 10);
    box.x += dX;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .move-right').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 10);
    box.x -= dX;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .zoom-in').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 5);
    var dY = Math.floor(box.h / 5);
    // box.x -= dX;
    // box.h -= dY;
    box.w /= 1.1;
    box.h /= 1.1;
    setZoom(box,'vizcanvas');
    return false;
});

document.querySelector('.controls_options .zoom-out').addEventListener('click', function(){
    var box = getZoom('vizcanvas');
    var dX = Math.floor(box.w / 5);
    var dY = Math.floor(box.h / 5);
    // box.x += dX;
    // box.h += dY;
    box.w *= 1.1;
    box.h *= 1.1;
    setZoom(box,'vizcanvas');
    return false;
});


/* Scroll over visualization to zoom in/out ========================= */

document.querySelector(".stage").addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && currentVisualization.name != "list" ){
        var currentViewBox = getZoom("vizcanvas");
        var withinZoomInLimit;
        var withinZoomOutLimit;
        
        if ( currentVisualization.name == "graph" ){  // default viewBox = " 0 0 1000 1000 "
            withinZoomInLimit = ( currentViewBox.w > 300
                               && currentViewBox.h > 300
                               && currentViewBox.x < 300
                               && currentViewBox.y < 300 );
            withinZoomOutLimit = ( currentViewBox.w < 4000 && currentViewBox.h < 4000 );
        }else{ // clock view, default viewBox = " -350 -495 700 500 "
            withinZoomInLimit = ( currentViewBox.w > 560 && currentViewBox.h > 400 );
            withinZoomOutLimit = ( currentViewBox.w < 2800 && currentViewBox.h < 2000 );
        }
        
        // event.deltaY can only be larger than 1.0 or less than -1.0
        if ( event.deltaY >= 1 ){
            if ( withinZoomInLimit ){ // zoom in
                vizZooming("vis", 1.05);
            }
        }else{ 
            if( withinZoomOutLimit ){ // zoom out
                vizZooming("vis", (1/1.05));
            }
        }
    }
},false);

document.querySelector(".world-map").addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector("#mapcanvas, #mapcanvas *") ){
        var currentViewBox = getZoom("mapcanvas");
        var withinZoomInLimit;
        var withinZoomOutLimit;
        
        // default viewBox = " 0 0 2711.3 1196.7 "
        withinZoomInLimit = ( currentViewBox.w > (2711.3/5)
                           && currentViewBox.h > (1196.7/5) );
        withinZoomOutLimit = ( currentViewBox.w <= 2711.3 && currentViewBox.h <= 1196.7 );
        console.log(withinZoomInLimit + " == " + withinZoomInLimit);
        
        // event.deltaY can only be larger than 1.0 or less than -1.0
        if ( event.deltaY >= 1 ){
            if ( withinZoomInLimit ){ // zoom in
                vizZooming("map", 1.05);
            }
        }else{ 
            if( withinZoomOutLimit ){ // zoom out
                vizZooming("map", (1/1.05));
            }
        }
    }
},false);

// Apply zoom level
function vizZooming(target,ratio){

    if ( target == "vis" ){
        var containerBox = document.querySelector(".stage").getBoundingClientRect();
        var canvasBox = document.querySelector(".vizcanvas").getBoundingClientRect();
        
        var canvasCenter = {};
        canvasCenter.x = containerBox.left + (containerBox.width/2);
        canvasCenter.y = containerBox.top + (containerBox.height/2);
        
        var vizCenter = {};
        vizCenter.x = canvasBox.left + (canvasBox.width/2);
        vizCenter.y = canvasBox.top + (canvasBox.height/2);
        
        var offsetFromCenter = {};
        offsetFromCenter.x = vizCenter.x - canvasCenter.x;
        offsetFromCenter.y = vizCenter.y - canvasCenter.y;
        
        var offset = {};
        offset.x =  vizCenter.x - (canvasCenter.x / ratio);
        offset.y = vizCenter.y - (canvasCenter.y / ratio);
        
        var box = getZoom("vizcanvas");
        box.w = box.w / ratio;
        box.h = box.h / ratio;
        box.x = box.x + offset.x;
        
        box.y = ( currentVisualization.name == "graph") ? (box.y + offset.y) : -1 * (box.h - 5);
        setZoom(box,"vizcanvas");
        
    }else{
        var box = getZoom("mapcanvas");
        containerBox = document.querySelector(".world-map").getBoundingClientRect();
        canvasBox = document.querySelector("#mapcanvas").getBoundingClientRect();
        box.w /= ratio;
        box.h /= ratio;
        setZoom(box,"mapcanvas");

    }
    
}


/* Pan by dragging ====================== */
var onDragGraph = false;
var onDragMap = false;
var graphDragStart = {};
var mapDragStart = {};

var mousedownHandler = function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && !event.target.mozMatchesSelector(".node, .node *") ){
        onDragGraph = true;
        graphDragStart.x = event.clientX;
        graphDragStart.y = event.clientY;
    }
    
    if ( event.target.mozMatchesSelector("#mapcanvas, #mapcanvas *") ){
        onDragMap = true;
        mapDragStart.x = event.clientX;
        mapDragStart.y = event.clientY;
    }
    
};

var mousemoveHandler = function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas") && !event.target.mozMatchesSelector(".node, .node *") && onDragGraph ){
        document.querySelector(".vizcanvas").style.cursor = "-moz-grab";
        var offsetX = ( Math.ceil(event.clientX) - graphDragStart.x );
        var offsetY = ( Math.ceil(event.clientY) - graphDragStart.y );
        var box = getZoom("vizcanvas");
        box.x -= offsetX;
        box.y -= offsetY;
        graphDragStart.x += offsetX;
        graphDragStart.y += offsetY;
        setZoom(box,"vizcanvas");
    }
    if ( event.target.mozMatchesSelector("#mapcanvas, #mapcanvas *") && onDragMap ){
        document.querySelector("#mapcanvas").style.cursor = "-moz-grab";
        var offsetX = ( Math.ceil(event.clientX) - mapDragStart.x );
        var offsetY = ( Math.ceil(event.clientY) - mapDragStart.y );
        var box = getZoom("mapcanvas");
        box.x -= (offsetX * 10);
        box.y -= (offsetY * 10);
        mapDragStart.x += offsetX;
        mapDragStart.y += offsetY;
        setZoom(box,"mapcanvas");
    }

};

var mouseupHandler = function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && !event.target.mozMatchesSelector(".node, .node *") ){
        onDragGraph = false;
        document.querySelector(".vizcanvas").style.cursor = "default";
    }
    if ( event.target.mozMatchesSelector("#mapcanvas, #mapcanvas *") ){
        onDragMap = false;
        document.querySelector("#mapcanvas").style.cursor = "default";
    }
};

var mouseleaveHandler = function(event){
    if ( event.target.mozMatchesSelector(".vizcanvas, .vizcanvas *") && !event.target.mozMatchesSelector(".node, .node *") ){
        onDragGraph = false;
        document.querySelector(".vizcanvas").style.cursor = "default";
    }
    if ( event.target.mozMatchesSelector("#mapcanvas, #mapcanvas *") ){
         onDragMap = false;
        document.querySelector("#mapcanvas").style.cursor = "default";
    }
};

document.querySelector(".stage").addEventListener("mousedown",mousedownHandler,false);
document.querySelector(".stage").addEventListener("mousemove",mousemoveHandler,false);
document.querySelector(".stage").addEventListener("mouseup",mouseupHandler,false);
document.querySelector(".stage").addEventListener("mouseleave",mouseleaveHandler,false);

document.querySelector(".world-map").addEventListener("mousedown",mousedownHandler,false);
document.querySelector(".world-map").addEventListener("mousemove",mousemoveHandler,false);
document.querySelector(".world-map").addEventListener("mouseup",mouseupHandler,false);
document.querySelector(".world-map").addEventListener("mouseleave",mouseleaveHandler,false);


/* Map Controls ========================= */

document.querySelector('.map-control .move-up').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dY = Math.floor(box.h / 10);
    box.y += dY;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .move-down').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dY = Math.floor(box.h / 10);
    box.y -= dY;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .move-left').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dX = Math.floor(box.w / 10);
    box.x += dX;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .move-right').addEventListener('click', function(){
    var box = getZoom('mapcanvas');
    var dX = Math.floor(box.w / 10);
    box.x -= dX;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .zoom-in').addEventListener('click', function(){
    // TODO: zoom in/out adjustment
    var box = getZoom('mapcanvas');
    box.w /= 1.5;
    box.h /= 1.5;
    setZoom(box,'mapcanvas');
    return false;
});

document.querySelector('.map-control .zoom-out').addEventListener('click', function(){
    // TODO: zoom in/out adjustment
    var box = getZoom('mapcanvas');
    box.w *= 1.5;
    box.h *= 1.5;
    setZoom(box,'mapcanvas');
    return false;
});


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
