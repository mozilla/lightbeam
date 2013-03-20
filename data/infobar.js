(function(global){

// update info
document.querySelector('#content').addEventListener('click', function(event){
    if (event.target.mozMatchesSelector('.node')){
        // var preHighlight = document.querySelectorAll(".highlight-country");
//         if (preHighlight){
//             toArray(preHighlight).forEach(function(element){
//                 element.classList.remove("highlight-country");
//             });
//         }

        updateInfo(aggregate.nodeForKey(event.target.getAttribute('data-name')));
    }
});

/* Updates info on the right info bar */
function updateInfo(node){
    function getServerInfo(theUrl){
        var xmlHttp = null;
        xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", theUrl, false );
        xmlHttp.send( null );
        return (xmlHttp.status == 200) ? JSON.parse(xmlHttp.responseText) : false;
    }

    function resetMap(){
        var preHighlight = document.querySelectorAll(".highlight-country");
        if (preHighlight){
            toArray(preHighlight).forEach(function(element){
                element.classList.remove("highlight-country");
            });
        }
        document.querySelector("#mapcanvas").setAttribute("viewBox", [0,81.5,2711.3,1196.7].join(" "));
    }

    var nodeName = node.name;
    document.querySelector(".holder .title").innerHTML = nodeName;
    document.querySelector(".holder .url").innerHTML = nodeName;
    var info = parseUri(nodeName); // uses Steven Levithan's parseUri 1.2.2
    var jsonURL = "http://freegeoip.net/json/" + info.host;
    var data = getServerInfo(jsonURL);

    if ( data == false ){
        document.querySelector("#country").innerHTML = "(Cannot find server location)";
        resetMap();
    }else{
        // update country info only when it is different from the current one
        if ( data.country_name !==  document.querySelector("#country").innerHTML ){
            resetMap();
            document.querySelector("#country").innerHTML = data.country_name;
            var countryOnMap = document.querySelectorAll("svg ." + data.country_code.toLowerCase() + " > *");
            if ( countryOnMap ){
                toArray(countryOnMap).forEach(function(path){
                    path.classList.add("highlight-country");
                });
            }

            // position the highlighted country in center
            var svgViewBox = document.querySelector("#mapcanvas").getAttribute("viewBox").split(" ");
            var worldDimen = document.querySelector("#mapcanvas").getClientRects()[0];
            var countryDimen = document.querySelector("#"+data.country_code.toLowerCase()).getClientRects()[0];

            var ratio = svgViewBox[2] / worldDimen.width;
            var worldCenter = {
                x: 0.5*worldDimen.width+worldDimen.left,
                y: 0.5*worldDimen.height+worldDimen.top
            };
            var countryCenter = {
                x: 0.5*countryDimen.width+countryDimen.left,
                y: 0.5*countryDimen.height+countryDimen.top
            };
            document.querySelector("#mapcanvas").setAttribute("viewBox",
                            [ -(worldCenter.x-countryCenter.x) * ratio,
                              -(worldCenter.y-countryCenter.y) * ratio,
                              svgViewBox[2],
                              svgViewBox[3]]
                            .join(" "));
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

}

})(this);


