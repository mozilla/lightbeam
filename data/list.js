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
list.on("showFilteredTable", function(filter){
    showFilteredTable(filter);
});

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


function onConnection(conn){
    var connection = aggregate.connectionAsObject(conn);
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
    thead.appendChild(createRow(columns, 'head'));

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

    var headerText = document.createTextNode(filter + " has connections linked from/to the following sites" );
    header.appendChild(headerText);
}

function setUnfilteredBreadcrumb(){
    while ( breadcrumb.firstChild ) breadcrumb.removeChild(breadcrumb.firstChild);
    while ( header.firstChild ) header.removeChild(header.firstChild);
    var link = document.createElement("a");
    var text = document.createTextNode("All");
    link.appendChild(text);
    breadcrumb.appendChild(link);

    var summaryDiv = document.createElement("div");
    if ( allConnections.length > 0 ){
        var timeSinceText = "Based on the data we have gathered since " + new Date(allConnections[0][TIMESTAMP]) + ", ";
        var timeSinceTextNode = document.createTextNode(timeSinceText);
        var timeSinceDiv = document.createElement("div");
        timeSinceDiv.appendChild(timeSinceTextNode);
        summaryDiv.appendChild(timeSinceDiv);
        var detailText = allConnections.length + " connections were made between " + (aggregate.sitenodes.length+aggregate.bothnodes.length) + " visited sites and " + (aggregate.thirdnodes.length+aggregate.bothnodes.length) + " third party sites";
        var detailTextNode = document.createTextNode(detailText);
        var detailDiv = document.createElement("div");
        detailDiv.appendChild(detailTextNode);
        summaryDiv.appendChild(detailDiv);
    }else{
        var msg = document.createTextNode("No data has been collected yet.");
        summaryDiv.appendChild(msg);
    }
    header.appendChild(summaryDiv);
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
            tbody.appendChild(createSettingsRow(node.name, userSettings[node.name] || {}));
        });
    }else{ // type == "third-party"
        nodes.forEach(function(node){
            var data = [ "Third-Party", node.name, node.firstAccess.toString().substring(0,24), node.lastAccess.toString().substring(0,24) ];
            tbody.appendChild(createRow(data,"third-row"));
            tbody.appendChild(createSettingsRow(node.name, userSettings[node.name] || {}));
        });
    }
    return tbody;
}

function createSettingsRow(nodeName, settings){
    var row = document.createElement('tr');
    try{
    var td = document.createElement('td');
    td.setAttribute('colspan', '20');
    td.appendChild(createSettingsLine(nodeName, 'hide', settings.hide));
    td.appendChild(createSettingsLine(nodeName, 'block', settings.block));
    td.appendChild(createSettingsLine(nodeName, 'follow', settings.follow));
    row.appendChild(td);
    row.className = 'settings';
    }catch(e){
        console.log('problem in createSettingsRow: %o', e);
    }
    return row;
}

var inputText = {
    'hide': 'Hide site from graph',
    'block': 'Block site from loading (use with caution)',
    'follow': 'Follow site (highlights in graph)'
};

function createSettingsLine(nodeName, settingsName, settingsValue){
    var p = document.createElement('p');
    try{
    var input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.setAttribute('name', settingsName);
    input.className = 'userSetting';
    input.dataset.siteUrl = nodeName;
    if (settingsValue){
        input.checked = true;
    }
    var label = document.createElement('label');
    label.appendChild(input);
    label.appendChild(document.createTextNode(inputText[settingsName]));
    p.appendChild(label);
    }catch(e){
        console.log('Problem in createSettingsLine: %o', e);
    }
    return p;
}


function createRow(dataArray, type){
    console.log('createRow(%s, %s)', dataArray, type);
    var row = document.createElement("tr");
    if (type && type === 'head'){
        row.appendChild(document.createElement('th'));
    }else{
        var disclosure = createCell("▶");
        disclosure.className = 'disclosure';
        row.appendChild(disclosure);
    }
    dataArray.forEach(function(data){
        row.appendChild(createCell(data, type));
    });
    if ( type && type !== 'head' ){
        row.classList.add(type);
        row.classList.add('node');
        row.setAttribute('data-name', dataArray[1]);
        row.setAttribute("site-url", dataArray[1]);
    }
    return row;
}


function createCell(data, type){
    var cell;
    if (type && type === 'head'){
        cell = document.createElement('th');
    }else{
        cell = document.createElement("td");
    }
    cell.appendChild(document.createTextNode(data));
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
