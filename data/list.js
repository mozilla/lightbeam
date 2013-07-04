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
    vizcanvas.classList.add("hide"); // we don't need vizcanvas here, so hide it
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    aggregate.emit('load', connections);
    // This binds our data to the D3 visualization and sets up the callbacks
    initList();
    //aggregate.on('updated', function(){ });
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
                elem('th', {'class': 'sort-numeric'}, 'Connections')
            ])
        ]),
        elem('tbody', {'class': 'list-body'})
    ]);
    stage.appendChild(table);

    // Set sort handlers. nth-child(n+2) skips the checkbox column
    var headers = Array.prototype.slice.call(table.querySelectorAll('th:nth-child(n+2)'))
    headers.forEach(function(th, idx){
        // idx+1 gives the actual column (skipping the checkbox the other way)
        th.addEventListener('click', sortTableOnColumn(table, idx+1), false);
    });
    // Add handler for rows
    document.querySelector('.list-table').addEventListener('click', function(event){
        // FIXME: This selector is too broad
        var url = event.target.parentNode.getAttribute('site-url');
        if (event.target.mozMatchesSelector('td') && url ){
            showFilteredTable(url);
        }
    },false);
    showFilteredTable(); // showing all data so no filter param is passed here
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
    table.appendChild( createBody(nodes) );
    resort(table);
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
    var settings = userSettings[node.name] || '';
    var settingsSort = {
        '': 0,
        'block': 1,
        'hide': 2,
        'watch': 3
    }[settings];
    return elem('tr', {
            'class': userSettings[node.name] + ' node ' + node.nodeType,
            'data-name': node.name,
            'site-url': node.name
    }, [
        elem('td', elem('input', {'type': 'checkbox', 'class': 'selectedRow'})),
        elem('td', {'data-sort-key': node.nodeType}, node.nodeType === 'thirdparty' ? 'Third Party' : 'Visited'),
        elem('td', {'class': 'preferences', 'data-sort-key': settings}),
        elem('td', {'data-sort-key': node.name}, node.name),
        elem('td', {'data-sort-key': node.firstAccess.toISOString().slice(0,10)}, node.firstAccess.toLocaleDateString()),
        elem('td', {'data-sort-key': node.lastAccess.toISOString().slice(0,10)}, node.lastAccess.toLocaleDateString()),
        elem('td', {'data-sort-key': node.howMany}, '' + node.howMany)
    ]);
}


function createBody(nodes){
    return elem("tbody", {'class': 'list-body'}, nodes.map(nodeToRow));
}

function sort(item1, item2){
    if (item1[0] < item2[0]) return -1;
    if (item2[0] < item1[0]) return 1;
    return 0;
}

function reverseSort(item1, item2){
    if (item1[0] < item2[0]) return 1;
    if (item2[0] < item1[0]) return -1;
    return 0;
}

function sortTableOnColumn(table, n){
    return function(evt){ // we could probably determine the column from the event.target
        // if this is sorted column, reverse
        // if this is reversed column, re-sort
        // if this is not sorted column, unset sorted flag on that column
        var reversed = evt.target.classList.contains('reverse-sorted');
        var sorted = evt.target.classList.contains('sorted');
        if (!(sorted || reversed)){
            var oldcolumn = table.querySelector('.sorted, .reverse-sorted');
            if (oldcolumn){
                oldcolumn.classList.remove('sorted');
                oldcolumn.classList.remove('reverse-sorted');
            }
        }
        var tbody = table.querySelector('tbody');
        var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr')).map(function(row){
            if (evt.target.classList.contains('sort-numeric')){
                return [parseInt(row.children[n].dataset.sortKey, 10), row];
            }else{
                return [row.children[n].dataset.sortKey, row];
            }
        });
        if (sorted){
            localStorage.lastSortColumn = n;
            localStorage.lastSortDirection = 'reversed';
            evt.target.classList.remove('sorted');
            evt.target.classList.add('reverse-sorted');
            rows.sort(reverseSort);
        }else{
            localStorage.lastSortColumn = n;
            localStorage.lastSortDirection = 'forward';
            evt.target.classList.remove('reverse-sorted');
            evt.target.classList.add('sorted');
            rows.sort(sort);
        }
        var frag = document.createDocumentFragment();
        rows.forEach(function(row){
            frag.appendChild(row[1]);
        });
        tbody.appendChild(frag);
    }
}

function resort(table){
    try{
    var direction = localStorage.lastSortDirection;
    if (direction){
        var index = parseInt(localStorage.lastSortColumn, 10) + 1; // nth child is 1-based
        var header = table.querySelector('th:nth-child(' + index + ')');
        // set the opposite class on header, then click it to get the right sorting
        header.classList.remove(direction === 'forward' ? 'sorted' : 'reverse-sorted');
        header.classList.add(direction === 'forward' ? 'reverse-sorted' : 'sorted');
        header.dispatchEvent(new MouseEvent('click'))
    }
}catch(e){
    console.log('Problem in resort: %o', e);
}
}

function resetCanvas(){
    document.querySelector(".stage").classList.remove("list");
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-breadcrumb") );
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-header") );
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-table") );
    vizcanvas.classList.remove("hide");
}

})(visualizations);
