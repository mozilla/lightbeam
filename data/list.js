// List Visualization

// Display data in tabular format

(function(visualizations){
"use strict";

var list = new Emitter();
visualizations.list = list;
list.name = "list";

var vizcanvas;
document.querySelector(".stage").classList.add("list");
var breadcrumb = document.createElement("div");
breadcrumb.classList.add("list-breadcrumb");
document.querySelector(".stage").appendChild(breadcrumb);
var columns = ["Type","Site", "First Access", "Last Access"];

list.on("init", OnInit);
list.on("conneciton", onConnection);
list.on("remove", onRemove);


function OnInit(connections){
    console.log('initializing graph from %s connections', connections.length);
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
    var table = document.createElement("table");
    table.classList.add("list-table");
    document.querySelector(".stage.list").appendChild(table);
 
    var thead = document.createElement("thead");
    table.appendChild(thead);
    thead.appendChild(createRow(columns));
 
    showFilteredTable(); // showing all data so no filter param is passed here
 
    document.querySelector('.list-table').addEventListener('click', function(event){
        if (event.target.mozMatchesSelector('td')){
            showFilteredTable(event.target.parentNode.getAttribute('site-url'));
        }
    },false);
}


function setBreadcrumb(filter){
    if ( !breadcrumb.firstChild ){ // initialize
        var link = document.createElement("a");
        link.setAttribute("filter-by", "All");
        var text = document.createTextNode("All");
        link.appendChild(text);
        breadcrumb.appendChild(link);
        link.addEventListener('click', function(event){
            showFilteredTable();
        },false);
    }else{
        if ( !breadcrumb.lastChild.hasAttribute("filter-by") ){
            breadcrumb.removeChild(breadcrumb.lastChild);
            breadcrumb.removeChild(breadcrumb.lastChild);
        }
        if( filter ){
            breadcrumb.appendChild(document.createTextNode(" > "));
            var link = document.createElement("a");
            var text = document.createTextNode(filter);
            link.appendChild(text);
            breadcrumb.appendChild(link);
        }
    }
}


function showFilteredTable(filter){
    // remove existinb table tbodys, if any
    var table = document.querySelector("table.list-table");
    while ( document.querySelectorAll("table tbody").length > 0 ){
        table.removeChild(document.querySelector("table tbody"));
    }
 
    table.appendChild(createBody("visited",filter));
    table.appendChild(createBody("third-party",filter));

    setBreadcrumb(filter);
}


function getNodes(filter){
    function addToList(myNode){
        if ( myNode.nodeType == "both" ){
            filtered.sitenodes.push(myNode);
            filtered.thirdnodes.push(myNode);
        }else{
            if ( myNode.nodeType == "site" ) filtered.sitenodes.push(myNode);
            if ( myNode.nodeType == "thirdparty" ) filtered.thirdnodes.push(myNode);
        }
    }

    var filtered = {};
    filtered.sitenodes = new Array();
    filtered.thirdnodes = new Array();
    if( !filter ){ // if no filter, show all
        filtered.sitenodes = aggregate.sitenodes.concat(aggregate.bothnodes);
        filtered.thirdnodes = aggregate.thirdnodes.concat(aggregate.bothnodes);
    }else{
        // the selected node itself
        var nodePicked = aggregate.nodeForKey(filter);
        addToList(nodePicked);
        // check what's in the selected node's linkdedFrom array
        nodePicked.linkedFrom.forEach(function(key){
            var node = aggregate.nodeForKey(key);
            addToList(node);          
        });
        // check what's in the selected node's linkdedTo array
        nodePicked.linkedTo.forEach(function(key){
            var node = aggregate.nodeForKey(key);
            addToList(node);  
        });
    }
    
    return filtered;
}


function createBody(type, filter){
    var tbody = document.createElement("tbody");
    if (type == "visited"){
        var sitenodes = getNodes(filter).sitenodes;
        sitenodes.forEach(function(node){
            var data = [ "Visited", node.name, node.firstAccess.toString().substring(0,24), node.lastAccess.toString().substring(0,24) ];
            tbody.appendChild(createRow(data,"visited-row"));
        });
    }else{ // type == "third-party"
        var thirdnodes = getNodes(filter).thirdnodes;
        thirdnodes.forEach(function(node){
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
    row.classList.add(type);
    row.setAttribute("site-url", dataArray[1]);

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
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-table") );
    vizcanvas.classList.remove("hide");
}



})(visualizations);
