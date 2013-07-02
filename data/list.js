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

list.on("init", onInit);
list.on("conneciton", onConnection);
list.on("remove", onRemove);
list.on('setFilter', setFilter);
list.on("showFilteredTable", function(filter){
    showFilteredTable(filter);
});

function setFilter(){
    addon.emit('setFilter', 'filterNothing');
}


function onInit(connections){
    console.log('initializing list from %s connections', connections.length);
    vizcanvas = document.querySelector('.vizcanvas');
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    aggregate.emit('load', connections);
    // This binds our data to the D3 visualization and sets up the callbacks
    initList();
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


function initList(){
    console.log('begin initList()');
    var stage = document.querySelector('.stage');
    stage.classList.add("list");
    // breadcrumb
    breadcrumb = elem("div", {'class': 'list-breadcrumb'});
    stage.appendChild(breadcrumb);

    // list header
    header = elem("div", {'class': 'list-header'});
    stage.appendChild(header);

    var table = elem("table", {'class': 'list-table'}, [
        elem('thead', [
            elem('tr', [
                elem('th', elem('input', {'class': 'selectedHeader', type: 'checkbox'})),
                elem('th', 'Type'),
                elem('th', 'Preference'),
                elem('th', 'Website'),
                elem('th', 'First Access'),
                elem('th', 'Last Access'),
                elem('th', 'Connections')
            ])
        ]),
        elem('tbody', {'class': 'list-body'})
    ]);
    stage.appendChild(table);

    showFilteredTable(); // showing all data so no filter param is passed here

    document.querySelector('.list-table').addEventListener('click', function(event){
        // FIXME: This selector is too broad
        if (event.target.mozMatchesSelector('td') && event.target.parentNode.getAttribute('site-url') ){
            showFilteredTable(event.target.parentNode.getAttribute('site-url'));
        }
    },false);
    console.log('done initList()');
}


function setFilteredBreadcrumb(filter){
    console.log('begin setFilteredBreadcrumb()')
    while ( breadcrumb.firstChild ) breadcrumb.removeChild(breadcrumb.firstChild);
    while ( header.firstChild ) header.removeChild(header.firstChild);

    var link = elem("a", {'filter-by': 'All'}, '<<< Return to All');
    breadcrumb.appendChild(link);
    link.addEventListener('click', function(event){
        document.querySelector("#content").classList.remove("showinfo");
        showFilteredTable();
    },false);

    var headerText = document.createTextNode(filter + " has connections linked from/to the following sites" );
    header.appendChild(headerText);
    console.log('done setFilteredBreadcrumb');
}

function setUnfilteredBreadcrumb(){
    console.log('begin setUnfilteredBreadcrumb()');
    while ( breadcrumb.firstChild ) breadcrumb.removeChild(breadcrumb.firstChild);
    while ( header.firstChild ) header.removeChild(header.firstChild);
    breadcrumb.appendChild(elem("a", 'All'));

    var summaryDiv = document.createElement("div");
    if ( allConnections.length > 0 ){
        header.appendChild(elem('div', [
            elem("div", [
                "Based on the data we have gathered since "
                    + new Date(allConnections[0][TIMESTAMP]) + ", ",
                elem("div", allConnections.length
                    + " connections were made between "
                    + (aggregate.sitenodes.length+aggregate.bothnodes.length)
                    + " visited sites and "
                    + (aggregate.thirdnodes.length+aggregate.bothnodes.length)
                    + " third party sites")
            ])
        ]));
    }else{
        header.appendChild(elem('div', 'No data has been collected yet.'));
    }
    console.log('done setUnfilteredBreadcrumb()');
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
    table.removeChild(table.querySelector('.list-body'));
    var nodes = getNodes(filter);
    // FIXME: For sorting we only want one tbody
    table.appendChild( createBody(nodes) );
    setBreadcrumb(filter);
}


function getNodes(filter){
    if( !filter ){ // if no filter, show all
        return aggregate.allnodes;
    }else{
        var nodeMap = aggregate.nodeForKey(filter);
        return Object.keys(nodeMap).map(function(key){ return nodeMap[key]; });
    }
}
// A Node has the following properties:
// contentTypes: []
// cookieCount: #
// firstAccess: Date
// howMany: #
// method: []
// name: ""
// nodeType: site | thirdparty | both
// secureCount: #
// status: []
// subdomain: []
// visitedCount: #


function nodeToRow(node){
    return elem('tr', {'class': userSettings[node.name]}, [
        elem('td', elem('input', {'type': 'checkbox', 'class': 'selectedRow'})),
        elem('td', node.nodeType === 'thirdparty' ? 'Third Party' : 'Visited'),
        elem('td', {'class': 'preferences'}),
        elem('td', node.name),
        elem('td', node.firstAccess.toString().slice(0,24)),
        elem('td', node.lastAccess.toString().slice(0,24)),
        elem('td', '' + node.howMany)
    ]);
}


function createBody(nodes){
    return elem("tbody", {'class': 'list-body'}, nodes.map(nodeToRow));
}

function createRow(namelist, type){
    return elem('tr',
        {'class': 'node ' + type, 'data-name': namelist[1], 'site-url': namelist[1] },
        namelist.map(function(name){
            return elem('td', name);
        })
    );
}

function resetCanvas(){
    document.querySelector(".stage").classList.remove("list");
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-breadcrumb") );
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-header") );
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-table") );
    vizcanvas.classList.remove("hide");
}

})(visualizations);
