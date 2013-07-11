// List Visualization

// Display data in tabular format

(function(visualizations){
"use strict";

var list = new Emitter();
visualizations.list = list;
list.name = "list";

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
    vizcanvas.classList.add("hide"); // we don't need vizcanvas here, so hide it
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    aggregate.emit('load', connections);
    // This binds our data to the D3 visualization and sets up the callbacks
    initList();
    initializeHandlers();
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
    document.querySelector('.stage-stack').classList.add("list");
    document.querySelector('.stage-header h1').textContent = 'List View';

    // list header
    var table = elem("div", {'class': 'list-table'}, [
        elem('table', [
            elem('thead', {'class': 'header-table'}, [
                elem('tr', [
                    elem('th', elem('input', {'class': 'selected-header', type: 'checkbox'})),
                    elem('th', 'Type'),
                    elem('th', 'Prefs'),
                    elem('th', 'Website'),
                    elem('th', 'First Access'),
                    elem('th', 'Last Access'),
                    elem('th', {'class': 'sort-numeric'}, 'Connections')
                ])
            ]),
        ]),
        elem('div', {'class': 'body-table'},
            elem('table',
                elem('tbody', {'class': 'list-body'})
            )
        )
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

function showFilteredTable(filter){
    // remove existinb table tbodys, if any
    var table = document.querySelector(".list-table");
    var tbody = table.querySelector('.list-body');
    var tbodyParent = tbody.parentElement;
    tbodyParent.removeChild(tbody);
    var nodes = getNodes(filter);
    tbodyParent.appendChild( createBody(nodes) );
    resort(table);
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
    return elem('tr', {
            'class': 'node ' + node.nodeType,
            'data-pref': settings,
            'data-name': node.name,
            'site-url': node.name
    }, [
        elem('td', elem('input', {'type': 'checkbox', 'class': 'selected-row'})),
        elem('td', {'data-sort-key': node.nodeType}, node.nodeType === 'thirdparty' ? 'Third Party' : 'Visited'),
        elem('td', {'class': 'preferences', 'data-sort-key': settings}, '\u00A0'),
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
    var direction = localStorage.lastSortDirection;
    if (direction){
        var index = parseInt(localStorage.lastSortColumn, 10) + 1; // nth child is 1-based
        var header = table.querySelector('th:nth-child(' + index + ')');
        // set the opposite class on header, then click it to get the right sorting
        header.classList.remove(direction === 'forward' ? 'sorted' : 'reverse-sorted');
        header.classList.add(direction === 'forward' ? 'reverse-sorted' : 'sorted');
        header.dispatchEvent(new MouseEvent('click'))
    }
}

function resetCanvas(){
    document.querySelector(".stage").classList.remove("list");
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-table") );
    vizcanvas.classList.remove("hide");
}

function getSelectedRows(){
    // returns selected rows as an Array
    return Array.prototype.slice.call(document.querySelectorAll('.body-table tr')).filter(function(item){
        return item.querySelector('.selected-row:checked');
    })
}

// Event handlers

function setUserSetting(row, pref){
    var site = row.dataset.name;
    console.log('setting user setting %s for %s', pref, site);
    // change setting
    userSettings[site] = pref;
    // send change through to add-on
    addon.emit('updateBlocklist', site, pref === 'block');
    // modify row
    row.dataset.pref = pref;
    // Add sort order to preference column
    row.querySelector('.preferences').dataset.sortKey = pref;
    // Re-sort if sorted by preference
    if(localStorage.lastSortColumn === '2'){
        resort(document.querySelector(".list-table"));
    }
}

function selectAllRows(flag){
    console.log('selecting all rows');
    var checkboxes = document.querySelectorAll('.selected-row');
    for (var i = 0; i < checkboxes.length; i++){
        checkboxes[i].checked = flag;
    }
}

function setPreferences(pref){
    getSelectedRows().forEach(function(row){
        setUserSetting(row, pref);
    });
}

function toggleHiddenSites(target){
    if (target.dataset.state === 'shown'){
        target.dataset.state = 'hidden';
        target.textContent = 'Show Hidden';
        document.querySelector('.stage-stack').classList.add('hide-hidden-rows');
        localStorage.listViewHideRows = true;
    }else{
        target.dataset.state = 'shown';
        target.textContent = 'Hide Hidden';
        document.querySelector('.stage-stack').classList.remove('hide-hidden-rows');
        localStorage.listViewHideRows = false;
    }
}

// Restore state on load
if (localStorage.listViewHideRows){
    var button = document.querySelector('.toggle-hidden a');
    button.dataset.state = 'hidden';
    button.textContent = 'Show Hidden';
    document.querySelector('.stage-stack').classList.add('hide-hidden-rows');
}

// Install handlers
function initializeHandlers(){
    try{
    document.querySelector('.selected-header').addEventListener('change', function(event){
        selectAllRows(event.target.checked);
    }, false);

    document.querySelector('.stage-stack').addEventListener('click', function(event){
        var target = event.target;
        if(target.mozMatchesSelector('.block-pref a')){
            setPreferences('block');
        }else if (target.mozMatchesSelector('.hide-pref a')){
            setPreferences('hide');
        }else if (target.mozMatchesSelector('.watch-pref a')){
            setPreferences('watch');
        }else if(target.mozMatchesSelector('.no-pref a')){
            setPreferences('');
        }else if(target.mozMatchesSelector('.toggle-hidden a')){
            toggleHiddenSites(target);
        }
    }, false);
}catch(e){
    console.log('Error: %o', e);
}
}

})(visualizations);
