// List Visualization

// Display data in tabular format

(function(visualizations){
"use strict";

var list = new Emitter();
visualizations.list = list;
list.name = "list";

var vizcanvas;
var breadcrumb;
var header;
var columns = ["Type", "Site", "First Access", "Last Access"];

list.on("init", OnInit);
list.on("conneciton", onConnection);
list.on("remove", onRemove);
list.on('setFilter', setFilter);

function setFilter(){
    addon.emit('setFilter', 'filterNothing');
}


function OnInit(connections){
    console.log('initializing list from %s connections', connections.length);
    vizcanvas = document.querySelector('.vizcanvas');
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    aggregate.emit('load', connections);
    // This binds our data to the D3 visualization and sets up the callbacks
    initGraph();
    //aggregate.on('updated', function(){ });
    vizcanvas.classList.add("hide"); // we don't need vizcanvas here, so hide it
}


function onConnection(){
    aggregate.emit('connection', connection);
}


function onRemove(){
    console.log('removing list');
    //aggregate.emit('reset');
    resetCanvas();
}


function initGraph(){
    document.querySelector(".stage").classList.add("list");
    // breadcrumb
    breadcrumb = document.createElement("div");
    breadcrumb.classList.add("list-breadcrumb");
    document.querySelector(".stage").appendChild(breadcrumb);

    // list header
    header = document.createElement("div");
    header.classList.add("list-header");
    document.querySelector(".stage").appendChild(header);

    var table = document.createElement("table");
    table.classList.add("list-table");
    document.querySelector(".stage.list").appendChild(table);

    var thead = document.createElement("thead");
    table.appendChild(thead);
    thead.appendChild(createRow(columns));

    showFilteredTable(); // showing all data so no filter param is passed here

    document.querySelector('.list-table').addEventListener('click', function(event){
        if (event.target.mozMatchesSelector('td') && event.target.parentNode.getAttribute('site-url') ){
            showFilteredTable(event.target.parentNode.getAttribute('site-url'));
        }
    },false);
}


function setFilteredBreadcrumb(filter){
    while ( breadcrumb.firstChild ) breadcrumb.removeChild(breadcrumb.firstChild);
    while ( header.firstChild ) header.removeChild(header.firstChild);

    var link = document.createElement("a");
    link.setAttribute("filter-by", "All");
    var text = document.createTextNode("<<< Return to All");
    link.appendChild(text);
    breadcrumb.appendChild(link);
    link.addEventListener('click', function(event){
        document.querySelector("#content").classList.remove("showinfo");
        showFilteredTable();
    },false);

    var headerText = document.createTextNode("Site that have connections linked from/to " + filter);
    header.appendChild(headerText);
}

function setUnfilteredBreadcrumb(){
    while ( breadcrumb.firstChild ) breadcrumb.removeChild(breadcrumb.firstChild);
    while ( header.firstChild ) header.removeChild(header.firstChild);
    var link = document.createElement("a");
    var text = document.createTextNode("All");
    link.appendChild(text);
    breadcrumb.appendChild(link);
    getSummary(function(result){
        var summaryDiv = document.createElement("div");
        var timeSinceText = "Based on the data we have gathered since " + result.localTimeSince + ", ";
        var timeSinceTextNode = document.createTextNode(timeSinceText);
        var timeSinceDiv = document.createElement("div");
        timeSinceDiv.appendChild(timeSinceTextNode);
        summaryDiv.appendChild(timeSinceDiv);
        var detailText = result.numConnections + " connections were set between " + (result.numVisited+result.numBoth) + " visited sites and " + (result.numThird+result.numBoth) + " third party sites";
        var detailTextNode = document.createTextNode(detailText);
        var detailDiv = document.createElement("div");
        detailDiv.appendChild(detailTextNode);
        summaryDiv.appendChild(detailDiv);

        header.appendChild(summaryDiv);
    });

}


function setBreadcrumb(filter){
    if ( filter ){
        setFilteredBreadcrumb(filter);
    }else{
        setUnfilteredBreadcrumb();
    }
}


function showFilteredTable(filter){
    // remove existinb table tbodys, if any
    var table = document.querySelector("table.list-table");
    while ( document.querySelectorAll("table tbody").length > 0 ){
        table.removeChild(document.querySelector("table tbody"));
    }

    var filtered = getNodes(filter);
    table.appendChild( createBody("visited",filtered.sitenodes) );
    table.appendChild( createBody("third-party",filtered.thirdnodes) );

    setBreadcrumb(filter);
}


function getNodes(filter){
    function addToList(myNode){
        if ( myNode.nodeType == "site" || myNode.nodeType == "both" ){
            filtered.sitenodes.push(myNode);
        }
        if ( myNode.nodeType == "thirdparty" || myNode.nodeType == "both"){
            filtered.thirdnodes.push(myNode);
        }
    }

    var filtered = {};
    filtered.sitenodes = new Array();
    filtered.thirdnodes = new Array();
    if( !filter ){ // if no filter, show all
        filtered.sitenodes = aggregate.sitenodes.concat(aggregate.bothnodes);
        filtered.thirdnodes = aggregate.thirdnodes.concat(aggregate.bothnodes);
    }else{
        var nodeList = aggregate.nodeForKey(filter);
        for ( var key in nodeList ){
            if ( key != filter ) addToList(nodeList[key]);
        }
    }

    return filtered;
}


function createBody(type, nodes){
    var tbody = document.createElement("tbody");
    if (type == "visited"){
        nodes.forEach(function(node){
            var data = [ "Visited", node.name, node.firstAccess.toString().substring(0,24), node.lastAccess.toString().substring(0,24) ];
            tbody.appendChild(createRow(data,"visited-row"));
        });
    }else{ // type == "third-party"
        nodes.forEach(function(node){
            var data = [ "Third-Party", node.name, node.firstAccess.toString().substring(0,24), node.lastAccess.toString().substring(0,24) ];
            tbody.appendChild(createRow(data,"third-row"));
        });
    }
    return tbody;
}


function createRow(dataArray, type){
    var row = document.createElement("tr");
    dataArray.forEach(function(data){
        var cell = createCell(data);
        row.appendChild(cell);
    });
    if ( type ){
        row.classList.add(type);
        row.classList.add('node');
        row.setAttribute('data-name', dataArray[1]);
        row.setAttribute("site-url", dataArray[1]);
    }

    return row;
}


function createCell(data){
    var cell = document.createElement("td");
    var text = document.createTextNode(data);
    cell.appendChild(text);
    return cell;
}


function resetCanvas(){
    document.querySelector(".stage").classList.remove("list");
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-breadcrumb") );
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-header") );
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-table") );
    vizcanvas.classList.remove("hide");
}



})(visualizations);
