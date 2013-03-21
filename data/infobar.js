(function(global){

// update info
document.querySelector('#content').addEventListener('click', function(event){
    if (event.target.mozMatchesSelector('.node')){
        updateInfo(aggregate.nodeForKey(event.target.getAttribute('data-name')));
    }
},false);

// updates info on the right info bar 
function updateInfo(node){

    function getServerInfo(theUrl, callback){
        var xmlHttp = null;
        xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", theUrl, false );
        xmlHttp.send( null );
        callback( (xmlHttp.status == 200) ? JSON.parse(xmlHttp.responseText) : false );
    }

    function resetMap(){
        var preHighlight = document.querySelectorAll(".highlight-country");
        if (preHighlight){
            toArray(preHighlight).forEach(function(element){
                element.classList.remove("highlight-country");
            });
        }
        document.querySelector("#mapcanvas").setAttribute("viewBox", [0,0,2711.3,1196.7].join(" "));
    }

    function updateMap(newCountry, countryCode){
        toArray(newCountry).forEach(function(land){
                    land.classList.add("highlight-country");
                });

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
                    x: -(worldCenter.x-countryCenter.x) * ratio,
                    y: -(worldCenter.y-countryCenter.y) * ratio,
                    w: svgViewBox[2],
                    h: svgViewBox[3]
                };
                console.log("countryCenter = " + JSON.stringify(countryCenter));
                console.log("newViewBox = " + JSON.stringify(newViewBox));
                setZoom(newViewBox,'mapcanvas');
    }

    var info = parseUri(node.name); // uses Steven Levithan's parseUri 1.2.2
    var jsonURL = "http://freegeoip.net/json/" + info.host;

    // update content in the side bar when you have the server info ==========
    getServerInfo(jsonURL, function(data){
        document.querySelector(".holder .title").innerHTML = node.name;
        document.querySelector(".holder .url").innerHTML = node.name;

        if ( data == false || data.country_name === "Reserved" ){
            document.querySelector("#country").innerHTML = "(Unable to find server location)";
            resetMap();
        }else{
            // update country info only when it is different from the current one
            if ( data.country_name !==  document.querySelector("#country").innerHTML ){
                resetMap();
                document.querySelector("#country").innerHTML = data.country_name;
                var countryOnMap = document.querySelectorAll("svg ." + data.country_code.toLowerCase());
                if ( countryOnMap ){ updateMap(countryOnMap, data.country_code.toLowerCase()); }
            }
        }

        // update the connections list
        var connections = new Array();
        var htmlList = "";
        connections = connections.concat(node.linkedFrom, node.linkedTo);
        connections.forEach(function(conn){
            htmlList = htmlList + "<li>" + conn + "</li>";
        });
        document.querySelector(".connections-list").querySelector(".blue-text").innerHTML = connections.length + " connections from current site";
        document.querySelector(".connections-list ul").innerHTML = htmlList;

        document.querySelector("#content").classList.add("showinfo");
    });

}

})(this);


