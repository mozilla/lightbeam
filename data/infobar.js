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
        name = node.getAttribute("data-name");
        selectedNodeEffect(name);
        updateInfo(name);
    }
},false);

document.querySelector(".connections-list ul").addEventListener("click", function(event){
    var name = event.target.innerHTML;
    var previouslySelected = document.querySelector(".connections-list ul li[data-selected]");
    if ( previouslySelected ){
        document.querySelector(".connections-list ul li[data-selected]").removeAttribute("data-selected");
    }
    event.target.setAttribute("data-selected",true);
    resetAllGlow("connected");
    connectedNodeEffect(name);
});

// get server info from http://freegeoip.net
function getServerInfo(nodeName, callback){
    var info = parseUri(nodeName); // uses Steven Levithan's parseUri 1.2.2
    var jsonURL = "http://freegeoip.net/json/" + info.host;
    var xmlHttp = null;
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", jsonURL, false );
    xmlHttp.send( null );
    callback( (xmlHttp.status == 200) ? JSON.parse(xmlHttp.responseText) : false );
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
        var favicon = "<img src='http://"+ nodeName +"/favicon.ico' class='favicon'>";
        document.querySelector(".holder .title").innerHTML = favicon+nodeName;

        // update the connections list
        var nodeList = aggregate.nodeForKey(nodeName);
        var htmlList = "";
        var numConnectedSites = 0;
        var firstAccess;
        var lastAccess;
        for ( var key in nodeList ){
            if ( key != nodeName ){ // connected site
                htmlList = htmlList + "<li>" + key + "</li>";
                numConnectedSites++;
            }else{ // the selected site itself
                firstAccess = formattedDate( nodeList[key].firstAccess,"long");
                lastAccess = formattedDate( nodeList[key].lastAccess,"long");
            }
        }

        document.querySelector('.info-first-access').textContent = firstAccess;
        document.querySelector('.info-last-access').textContent = lastAccess;

        document.querySelector(".num-connected-sites").textContent = numConnectedSites + " " + singularOrPluralNoun(numConnectedSites,"site");
        document.querySelector(".connections-list ul").innerHTML = htmlList;

        // display site profile in Info Panel 
        showSiteProfile();

        // update map after we have loaded the SVG
        if ( data == false || data.country_name === "Reserved" ){
            document.querySelector("#country").innerHTML = "(Unable to find server location)";
            resetMap();
        }else{
            // update country info only when it is different from the current one
            if ( data.country_name !==  document.querySelector("#country").innerHTML ){
                resetMap();
                document.querySelector("#country").innerHTML = data.country_name;
                updateMap(data.country_code.toLowerCase());
            }
        }
    });

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


