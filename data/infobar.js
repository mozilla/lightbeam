// Used for managing the DOM for infobar part of the page
'use strict';

function initMap(){

var oriMapViewBox = mapcanvas.getAttribute('viewBox');

// update info when clicking on a node in the graph visualization
document.querySelector('#content').addEventListener('click', function(event){
    // click could happen on .node or an element inside of .node
    if (event.target.mozMatchesSelector('.node, .node *')){
        var node = event.target;
        var name;
        if (node.mozMatchesSelector('[type=checkbox], td [type=checkbox]')) return;
        while(node.mozMatchesSelector('.node *')){
            node = node.parentElement;
        }
        if (node.dataset && node.dataset.isBlocked){
            return;
        }
        name = node.getAttribute("data-name");
        selectedNodeEffect(name);
        updateInfo(name);
    }
},false);

document.querySelector(".connections-list ul").addEventListener("click", function(event){
    var name = event.target.textContent;
    var previouslySelected = document.querySelector(".connections-list ul li[data-selected]");
    if ( previouslySelected ){
        document.querySelector(".connections-list ul li[data-selected]").removeAttribute("data-selected");
    }
    event.target.setAttribute("data-selected",true);
    resetAllGlow("connected");
    connectedNodeEffect(name);
});
var currentRequest;
// get server info from http://freegeoip.net
function getServerInfo(nodeName, callback){
    var info = parseUri(nodeName); // uses Steven Levithan's parseUri 1.2.2
    var jsonURL = "http://freegeoip.net/json/" + info.host;
    var request = new XMLHttpRequest();
    currentRequest = info.host;
    request.open( "GET", jsonURL, true );
    request.onload = function(){
        if (currentRequest === info.host){
            callback( (request.status === 200) ? JSON.parse(request.responseText) : false );
        }
    }
    request.send( null );
}

// reset map
function resetMap(){
    var preHighlight = mapDocument.querySelectorAll(".highlight-country");
    if (preHighlight){
        toArray(preHighlight).forEach(function(element){
            element.classList.remove("highlight-country");
        });
    }
    mapcanvas.setAttribute("viewBox", oriMapViewBox);
}

// update map
function updateMap(countryCode){
    var countryOnMap = mapcanvas.getElementById(countryCode);
    if (!countryOnMap){
        console.log('no country found for country code "%s"', countryCode);
        return;
    }
    countryOnMap.classList.add('highlight-country');

    // position the highlighted country in center
    var svgViewBox = mapcanvas.getAttribute("viewBox").split(" ");
    var worldDimen = mapcanvas.getBoundingClientRect();
    var countryDimen = countryOnMap.getBoundingClientRect();

    var ratio = svgViewBox[2] / worldDimen.width;
    var worldCenter = {
        x: 0.5*worldDimen.width + worldDimen.left,
        y: 0.5*worldDimen.height + worldDimen.top
    };
    var countryCenter = {
        x: 0.5*countryDimen.width + countryDimen.left,
        y: 0.5*countryDimen.height + countryDimen.top
    };

    var newViewBox = {
        x: (countryCenter.x-worldCenter.x) * ratio,
        y: (countryCenter.y-worldCenter.y) * ratio,
        w: svgViewBox[2],
        h: svgViewBox[3]
    };
    setZoom(newViewBox, mapcanvas);
}

// updates info on the info panel
function updateInfo(nodeName){

    // get server info and then update content on the info panel
    getServerInfo(nodeName, function(data){
        var nodeList = aggregate.nodeForKey(nodeName);
        showFavIcon(nodeName);
        showFirstAndLastAccess(nodeList[nodeName]);
        showSitePref(nodeName);
        showConnectionsList(nodeName,nodeList);
        // display site profile in Info Panel 
        showSiteProfile();
        // update map after we have loaded the SVG
        showServerLocation(data);
    });

}

function showFavIcon(nodeName){
    var title = document.querySelector('.holder .title');
    while(title.childNodes.length){
        title.removeChild(title.firstChild);
    }
    title.appendChild(elem(nodeName, {src: 'http://' + nodeName + '/favicon.ico', 'class': 'favicon'}));
    title.appendChild(document.createTextNode(nodeName));
}

function showFirstAndLastAccess(site){
    var firstAccess = formattedDate(site.firstAccess,"long");
    var lastAccess = formattedDate(site.lastAccess,"long");
    document.querySelector('.info-first-access').textContent = firstAccess;
    document.querySelector('.info-last-access').textContent = lastAccess;
}

function showSitePref(nodeName){
    var prefTag = document.querySelector(".pref-tag");
    var sitePref = userSettings[nodeName];
    if ( sitePref ){
        prefTag.querySelector("img").src = "icons/lightbeam_icon_"+sitePref+".png";
        prefTag.querySelector("span").className = "";
        prefTag.querySelector("span").classList.add(sitePref + "-text");
        prefTag.querySelector("span").textContent = (sitePref=="hide") ? "hidden" : sitePref + "ed";
        prefTag.classList.remove("hidden");
    }else{
        prefTag.classList.add("hidden");
    }
}

function showConnectionsList(nodeName,nodeList){
    var htmlList = elem('ul');
    var numConnectedSites = 0;
    for ( var key in nodeList ){
        if ( key != nodeName ){ // connected site
            htmlList.appendChild(elem('li', {}, key));
            numConnectedSites++;
        }
    }
    document.querySelector(".num-connected-sites").textContent = numConnectedSites + " " + singularOrPluralNoun(numConnectedSites,"site");

    var list = document.querySelector(".connections-list");
    list.removeChild(list.querySelector('ul'));
    list.appendChild(htmlList);
}

function showServerLocation(serverData){
    if ( serverData == false || serverData.country_name === "Reserved" ){
        document.querySelector("#country").textContent = "(Unable to find server location)";
        resetMap();
    }else{
        // update country info only when it is different from the current one
        if ( serverData.country_name !==  document.querySelector("#country").textContent ){
            resetMap();
            document.querySelector("#country").textContent = serverData.country_name;
            updateMap(serverData.country_code.toLowerCase());
        }
    }
}

function showSiteProfile(){
    var siteProfileTab = document.querySelector(".toggle-site-profile");
    var contentToBeShown = document.querySelector(".site-profile-content");
    var infoPanelOpen = document.querySelector("#content").classList.contains("showinfo");
    var siteProfileTabActive = document.querySelector(".toggle-site-profile").classList.contains("active");
    if( !infoPanelOpen ){
        document.querySelector("#content").classList.add("showinfo");
        showInfoPanelTab(siteProfileTab, contentToBeShown);
    }

    if( infoPanelOpen ){
        if ( !siteProfileTabActive ){
            // make the previously active tab inactive
            deactivatePreviouslyActiveTab();
            showInfoPanelTab(siteProfileTab, contentToBeShown);
        }
    }

    document.querySelector(".toggle-site-profile").classList.remove("disabled");
}


/* mapcanvas events */
mapcanvas.addEventListener("mousedown",function(event){
    onDragMap = true;
    mapDragStart.x = event.clientX;
    mapDragStart.y = event.clientY;
},false);

mapcanvas.addEventListener("mousemove",function(event){
    if ( onDragMap ){
        mapcanvas.style.cursor = "-moz-grab";
        var offsetX = ( Math.ceil(event.clientX) - mapDragStart.x );
        var offsetY = ( Math.ceil(event.clientY) - mapDragStart.y );
        var box = getZoom(mapcanvas);
        box.x -= (offsetX * 10);
        box.y -= (offsetY * 10);
        mapDragStart.x += offsetX;
        mapDragStart.y += offsetY;
        setZoom(box,mapcanvas);
    }

},false);

mapcanvas.addEventListener("mouseup",function(event){
    onDragMap = false;
    mapcanvas.style.cursor = "default";
},false);

mapcanvas.addEventListener("mouseleave",function(event){
    onDragMap = false;
    mapcanvas.style.cursor = "default";
},false);

mapDocument.addEventListener("wheel",function(event){
    if ( event.target.mozMatchesSelector(".mapcanvas, .mapcanvas *") ){
        zoomWithinLimit(event, mapcanvas, mapZoomInLimit, mapZoomOutLimit );
    }
},false);


}


/* Info Panel Tabs ======================================== */


/* Toggle Site Profile */
document.querySelector(".toggle-site-profile").addEventListener("click", function(){
    var tabClicked = document.querySelector(".toggle-site-profile");
    if ( !tabClicked.classList.contains("disabled") ){
        var contentToBeShown = document.querySelector(".site-profile-content");
        toggleInfoPanelTab(tabClicked, contentToBeShown);
    }
});

/* Toggle Help Sections */
document.querySelector(".toggle-help").addEventListener("click", function(){
    var tabClicked = document.querySelector(".toggle-help");
    var contentToBeShown = document.querySelector(".help-content ." + currentVisualization.name +"-view-help");
    toggleInfoPanelTab(tabClicked, contentToBeShown);
});


/* Toggle About */
document.querySelector(".toggle-about").addEventListener("click", function(){
    var tabClicked = document.querySelector(".toggle-about");
    var contentToBeShown = document.querySelector(".about-content");
    toggleInfoPanelTab(tabClicked, contentToBeShown);
});


function toggleInfoPanelTab(tabClicked, contentToBeShown){
    var infoPanelOpen = document.querySelector("#content").classList.contains("showinfo");
    var isActiveTab = tabClicked.classList.contains("active");
    if( infoPanelOpen ){
        if ( isActiveTab ){ // collapse info panel
            document.querySelector("#content").classList.remove("showinfo");
            tabClicked.classList.remove("active");
            tabClicked.querySelector("img").classList.remove("hidden");
            tabClicked.querySelector("i").classList.add("hidden");
        }else{
            // make the previously active tab inactive
            deactivatePreviouslyActiveTab();
            // make the selected tab active
            showInfoPanelTab(tabClicked, contentToBeShown);
        }
    }else{
        // open the info panel and make the selected tab active
        document.querySelector("#content").classList.add("showinfo");
        showInfoPanelTab(tabClicked, contentToBeShown);
    }
}


function deactivatePreviouslyActiveTab(){
    var previouslyActiveTab = document.querySelector(".info-panel-controls ul li.active");
    if ( previouslyActiveTab ){
        previouslyActiveTab.classList.remove("active");
        previouslyActiveTab.querySelector("img").classList.remove("hidden");
        previouslyActiveTab.querySelector("i").classList.add("hidden");
    }
}


// make the selected tab active
function showInfoPanelTab(tabClicked, contentToBeShown){
    tabClicked.classList.add("active");
    tabClicked.querySelector("img").classList.add("hidden");
    tabClicked.querySelector("i").classList.remove("hidden");
    hideAllInfoPanelContentExcept(contentToBeShown);
}


function hideAllInfoPanelContentExcept(elmToShow){
    document.querySelector(".site-profile-content").classList.add("hidden");
    document.querySelector(".help-content .graph-view-help").classList.add("hidden");
    document.querySelector(".help-content .clock-view-help").classList.add("hidden");
    document.querySelector(".help-content .list-view-help").classList.add("hidden");
    document.querySelector(".about-content").classList.add("hidden");
    if (elmToShow){
        elmToShow.classList.remove("hidden");
    }
}


