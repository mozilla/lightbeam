(function(global){

const oriMapViewBox = document.querySelector('#mapcanvas').getAttribute('viewBox');

// update info when clicking on a node in the graph visualization
document.querySelector('#content').addEventListener('click', function(event){
    // click could happen on .node or an element inside of .node
    if (event.target.mozMatchesSelector('.node, .node *')){
        var node = event.target;
        while(node.mozMatchesSelector('.node *')){
            node = node.parentElement;
        }
        // console.log('svg node: %o, name: %s, data node: %s', node, node.getAttribute('data-name'), aggregate.nodeForKey(node.getAttribute('data-name')));
        updateInfo(node.getAttribute('data-name'));
    }else{
        //console.log('does not match .node: %o', event.target);
    }
},false);

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
    var preHighlight = document.querySelectorAll(".highlight-country");
    if (preHighlight){
        toArray(preHighlight).forEach(function(element){
            element.classList.remove("highlight-country");
        });
    }
    document.querySelector("#mapcanvas").setAttribute("viewBox", oriMapViewBox);
}

// update map
function updateMap(countryCode){
    var countryOnMap = d3.select("#mapcanvas").select("#" + countryCode.toLowerCase());
    countryOnMap.classed("highlight-country", true);
    countryOnMap.selectAll("*").classed("highlight-country", true);

    // position the highlighted country in center
    var svgViewBox = document.querySelector("#mapcanvas").getAttribute("viewBox").split(" ");
    var worldDimen = document.querySelector("#mapcanvas").getClientRects()[0];
    var countryDimen = document.querySelector("#"+countryCode).getClientRects()[0];

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
    setZoom(newViewBox,'mapcanvas');
}



// updates info on the right info bar
function updateInfo(nodeName){

    // update content in the side bar
    getServerInfo(nodeName, function(data){
        document.querySelector(".holder .title").innerHTML = nodeName;
        //document.querySelector(".holder .url").innerHTML = nodeName;

        if ( data == false || data.country_name === "Reserved" ){
            document.querySelector("#country").innerHTML = "(Unable to find server location)";
            resetMap();
        }else{
            // update country info only when it is different from the current one
            if ( data.country_name !==  document.querySelector("#country").innerHTML ){
                resetMap();
                document.querySelector("#country").innerHTML = data.country_name;
                var countryOnMap = document.querySelectorAll("svg #" + data.country_code.toLowerCase());
                if ( countryOnMap ){ updateMap(data.country_code.toLowerCase()); }
            }
        }

        // update the connections list
        var nodeList = aggregate.nodeForKey(nodeName);
        var htmlList = "";
        for ( var key in nodeList ){
            if ( key != nodeName ){
                htmlList = htmlList + "<li>" + key + "</li>";
            }
        }
        document.querySelector(".connections-list").querySelector(".blue-text").innerHTML = Object.keys(nodeList).length-1 + " connections from current site";
        document.querySelector(".connections-list ul").innerHTML = htmlList;

        document.querySelector("#content").classList.add("showinfo");
    });

}

/*
// FIX THIS!!! applying translation causes the map to fracture
// the svg map uses Robinson projection
d3.select("#mapcanvas").attr("cursor","-moz-grab").call(
    d3.behavior.zoom()
        .translate ([0, 0])
        .scale (1.0)
        .scaleExtent([1.0, 4.0])
        .on("zoom", function(){
            d3.selectAll("#mapcanvas > *")
                .attr("transform","translate(" + d3.event.translate.join(",") + ")" +
                      " scale(" +  d3.event.scale + ")");
        })
);
*/


})(this);


