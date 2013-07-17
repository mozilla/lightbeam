'use strict';

function initMap(){

var oriMapViewBox = mapcanvas.getAttribute('viewBox');

// update info when clicking on a node in the graph visualization
document.querySelector('#content').addEventListener('click', function(event){
    // click could happen on .node or an element inside of .node
    if (event.target.mozMatchesSelector('.node, .node *')){
        var node = event.target;
        if (node.mozMatchesSelector('[type=checkbox], td [type=checkbox]')) return;
        while(node.mozMatchesSelector('.node *')){
            node = node.parentElement;
        }
        // console.log('svg node: %o, name: %s, data node: %s', node, node.getAttribute('data-name'), aggregate.nodeForKey(node.getAttribute('data-name')));
        updateInfo(node.dataset.name);
    }else{
        //console.log('does not match .node: %o', event.target);
    }
},false);

document.querySelector(".connections-list ul").addEventListener("click", function(event){
    if (event.target.mozMatchesSelector("li")){
        updateInfo(event.target.innerHTML);
    }
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

function getLongDate(Short){
	var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
	var number_deco = ['st','nd','rd','th','th','th','th','th','th'];
	var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
	var array = Short.split('/');
	return days[new Date(Number(array[2]), Number(array[0])-1, Number(array[1])).getDay()]+', '+months[Number(array[0])-1]+' '+Number(array[1])+number_deco[Number(array[0].slice(-1))]+', '+array[2];
}

// updates info on the info panel
function updateInfo(nodeName){

    // get server info and then update content on the info panel
    getServerInfo(nodeName, function(data){
        var favicon = "<img src='http://"+ nodeName +"/favicon.ico' class='favicon'>";
        document.querySelector(".holder .title").innerHTML = favicon+nodeName;

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

        var HTMLnode = document.querySelector('[data-name="'+nodeName+'"]');
        document.querySelector('.info-first-access').textContent = getLongDate(HTMLnode.children[4].textContent);
        document.querySelector('.info-last-access').textContent = getLongDate(HTMLnode.children[5].textContent);
        

        // update the connections list
        var nodeList = aggregate.nodeForKey(nodeName);
        var htmlList = "";
        var numConnectedSites = 0;
        for ( var key in nodeList ){
            if ( key != nodeName ){
                htmlList = htmlList + "<li>" + key + "</li>";
                numConnectedSites++;
            }
        }
        document.querySelector(".num-connected-sites").textContent = numConnectedSites;
        document.querySelector(".connections-list ul").innerHTML = htmlList;

        document.querySelector("#content").classList.add("showinfo");
    });

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

