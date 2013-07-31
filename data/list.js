'use strict';

// List Visualization

// Display data in tabular format

(function(visualizations){

var list = new Emitter();
var breadcrumbList = [ "All Sites" ];
var currentState = {};
var pathToListIcon = "icons/collusion_icon_list.png";
visualizations.list = list;
list.name = "list";

list.on("init", onInit);
// list.on("connection", onConnection);
list.on("remove", onRemove);
list.on("showFilteredTable", function(filter){
    showFilteredTable(filter);
});

function onInit(connections){
    vizcanvas.classList.add("hide"); // we don't need vizcanvas here, so hide it
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    // This binds our data to the D3 visualization and sets up the callbacks
    initList();
    initializeHandlers();
    //aggregate.on('updated', function(){ });
    if ( !statsBarInitiated ){  
        updateStatsBar();
    }
}


function onConnection(conn){
    var connection = aggregate.connectionAsObject(conn);
    aggregate.emit('connection', connection);
    updateStatsBar();
}


function onRemove(){
    // console.log('removing list');
    //aggregate.emit('reset');
    resetCanvas();
}


function initList(){
    var stage = document.querySelector('.stage');
    document.querySelector('.stage-stack').classList.add("list");

    // breadcrumb
    initBreadcrumb();

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
                    elem('th', {'class': 'sort-numeric'}, 'Sites Connected')
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
        var url = event.target.parentNode.dataset.sortKey;
        if (event.target.mozMatchesSelector('td:nth-child(1)')){
            var checkbox = event.target.querySelector('input')
            if (checkbox){
                checkbox.checked = !checkbox.checked; // toggle it
            }
        }else if (event.target.mozMatchesSelector('.update-table') && url ){
            showFilteredTable(url);
        }
    },false);
    showFilteredTable(); // showing all data so no filter param is passed here
}


var breadcrumbClickHandler = function(event){
    var url = event.target.getAttribute("site-url");
    if ( url != breadcrumbList[0] ){
        history.back();
    }else{
        history.pushState({"site":currentState.site,"prevState":currentState}, null, generateCollusionPageUrl(currentState.site).join("/"));
        history.replaceState(null, null, generateCollusionPageUrl().join("/"));
        showFilteredTable();
    }
};

function initBreadcrumb(){
    var stage = document.querySelector('.stage');
    breadcrumbList.push("All Sites");
    var breadcrumb = elem("div", {"class": "breadcrumb"}, [
            elem("div", {"class": "breadcrumb-chunk"}),
            elem("div", {"class": "arrow-left hidden"}),
            elem("div", {"class": "breadcrumb-chunk hidden"}),
            elem("div", {"class": "arrow-left hidden"}),
            elem("div", {"class": "breadcrumb-chunk hidden"})
        ]);
    stage.appendChild(breadcrumb);
    document.querySelector(".breadcrumb-chunk").innerHTML = breadcrumbList[0]; // Show "All Sites" 
    document.querySelector(".breadcrumb-chunk").addEventListener("click",breadcrumbClickHandler);
}

function mapBreadcrumb(){
    resetBreadcrumbByHide();
    var chunks = toArray( document.querySelectorAll(".breadcrumb-chunk") );
    breadcrumbList.forEach(function(siteUrl,i){
        // show and update breadcrumb chunk 
        chunks[i].classList.remove("hidden");
        chunks[i].innerHTML = siteUrl;
        chunks[i].setAttribute("site-url", siteUrl);
        // show arrow accordingly
        var hiddenArrows = toArray(document.querySelectorAll(".arrow-left.hidden"));
        var numArrowShown = 2 - hiddenArrows.length;
        var numTier = breadcrumbList.length;
        if ( (numTier-1) > numArrowShown ){
            hiddenArrows[0].classList.remove("hidden");
        }
        // add click handler if the breadcrumb chunk is not on the last tier(current)
        if ( i <= (breadcrumbList.length-2) ){
            chunks[i].addEventListener("click",breadcrumbClickHandler);
        }else{
            chunks[i].classList.add("no-click");
        }
    });
}

// Reset the breadcrumb
function resetBreadcrumbByHide(){
    var chunks = document.querySelectorAll(".breadcrumb-chunk");
    for (var i=0; i<chunks.length; i++ ){
        chunks[i].classList.add("hidden");
        chunks[i].classList.remove("no-click");
    }
    var allArrows = toArray(document.querySelectorAll(".arrow-left"));
    for (var i=0; i<allArrows.length; i++ ){
        allArrows[i].classList.add("hidden");
    }
}

// Push State to Browser History
// FIXME: should this be global?
function pushUrlToHistory(siteUrl){
    var tempList = [ "All Sites" ];
    var href = generateCollusionPageUrl(siteUrl);
    if (siteUrl){
        if ( href[href.length-1] != "index.html" ){
            currentState.site = href[href.length-1];
            currentState.prevState = history.state;
        }
        history.pushState({"site": siteUrl, "prevState":currentState}, null, href.join("/"));
        if ( currentState.prevState ){
            tempList.push(currentState.prevState.site);
        }
        tempList.push(siteUrl);
    }else{
        // all sites list
        history.replaceState(null, null, generateCollusionPageUrl().join("/"));
    }
    breadcrumbList = tempList;
    mapBreadcrumb();
}

// FIXME: should this be global?
window.addEventListener("popstate", function(e){
    var filter = null;
    try{
        var previousNowCurrent = e.state.prevState;
        var filter = previousNowCurrent.site;
        history.replaceState(previousNowCurrent.prevState, null, generateCollusionPageUrl(filter).join("/"));
    }catch(e){
        // console.log("Show 'All Sites' List");
    }
    showFilteredTable(filter);
});

function showFilteredTable(filter){
    pushUrlToHistory(filter);
    pathToListIcon =  filter ? "../icons/collusion_icon_list.png" : "icons/collusion_icon_list.png";
    // remove existing table tbodys, if any
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
        return aggregate.nodes;
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
        elem('td', {'data-sort-key': node.name}, [
                elem('img', {'src': pathToListIcon, 'class': 'update-table'}),
                node.name
            ]),
        elem('td', {'data-sort-key': node.firstAccess.toISOString().slice(0,10)}, formattedDate(node.firstAccess)),
        elem('td', {'data-sort-key': node.lastAccess.toISOString().slice(0,10)}, formattedDate(node.lastAccess)),
        elem('td', {'data-sort-key': Object.keys(aggregate.nodeForKey(node.name)).length - 1}, '' + Object.keys(aggregate.nodeForKey(node.name)).length - 1)
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
    var listTable = document.querySelector('.stage .list-table');
    if (listTable){
        listTable.parentElement.removeChild(listTable);
    }
    var breadcrumb = document.querySelector('.stage .breadcrumb');
    if (breadcrumb){
        breadcrumb.parentElement.removeChild(breadcrumb);
    }
    breadcrumbList = [];
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
    // uncheck the row
    row.querySelector('[type=checkbox]').checked = false;
    row.classList.remove("checked");
}

function selectAllRows(flag){
    var checkboxes = document.querySelectorAll('.selected-row');
    for (var i = 0; i < checkboxes.length; i++){
        checkboxes[i].checked = flag;
    }
}

function setPreferences(pref){
    getSelectedRows().forEach(function(row){
        setUserSetting(row, pref);
    });
    toggleOnPrefButtons(false); // disable buttons since all checkboxes are unchecked now
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

    document.querySelector('.list-footer').querySelector(".legend-toggle").addEventListener("click", function(event){
    	toggleLegendSection(event.target,document.querySelector('.list-footer'));
	});

    document.querySelector('.stage-stack').addEventListener('click', function(event){
        var target = event.target;
        if(target.mozMatchesSelector('.block-pref.active a') ){
            dialog( {   "name": "blockDialog",
                        "dnsPrompt": true,
                        "title": "Block Sites", 
                        "message": "This will prevent you from connecting to the selected website(s) and can possibly break the web." 
                    },function(confirmed){
                        if ( confirmed ){
                            setPreferences('block');
                        }
                    }
            );
        }else if (target.mozMatchesSelector('.hide-pref.active a')){
            dialog( {   "name": "hideDialog",
                        "dnsPrompt": true,
                        "title": "Hide Sites", 
                        "message": "Data of the selected website(s) will be hidden in all the Visualizations." 
                    },function(confirmed){
                        if ( confirmed ){
                            setPreferences('hide');
                        }
                    }
            );
        }else if (target.mozMatchesSelector('.watch-pref.active a')){
            setPreferences('watch');
        }else if(target.mozMatchesSelector('.no-pref.active a')){
            setPreferences('');
        }else if(target.mozMatchesSelector('.toggle-hidden a')){
            toggleHiddenSites(target);
        }
    }, false);

    // highlight selected row
    document.querySelector(".list-table").addEventListener("click",function(event){
        var node = event.target;
        // clicking on the cell where the checkbox locates can also trigger the checkbox clicking handler
        if (node.mozMatchesSelector('tbody tr td:first-child, tbody tr td:first-child [type=checkbox]')){
            while(node.mozMatchesSelector('.node *')){
                node = node.parentElement;
            }
            var rowChecked = node.querySelector("[type=checkbox]").checked;
            if (rowChecked){
                node.classList.add("checked");
                toggleOnPrefButtons(true);
            }else{
                node.classList.remove("checked");
                toggleOnPrefButtons(false);
            }
        }
    });

}catch(e){
    console.log('Error: %o', e);
}
}

function toggleOnPrefButtons(toggleOn){
    var classToAdd = toggleOn ? "active" : "disabled";
    var classToRemove = toggleOn ? "disabled" : "active";
    // toggle on class
    document.querySelector(".block-pref").classList.add(classToAdd);
    document.querySelector(".hide-pref").classList.add(classToAdd);
    document.querySelector(".watch-pref").classList.add(classToAdd);
    document.querySelector(".no-pref").classList.add(classToAdd);
    // toggle off class
    document.querySelector(".block-pref").classList.remove(classToRemove);
    document.querySelector(".hide-pref").classList.remove(classToRemove);
    document.querySelector(".watch-pref").classList.remove(classToRemove);
    document.querySelector(".no-pref").classList.remove(classToRemove);
}

})(visualizations);
