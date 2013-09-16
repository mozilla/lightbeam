'use strict';

// List Visualization

// Display data in tabular format

(function(visualizations){

var list = new Emitter();
var breadcrumbStack = [];
visualizations.list = list;
list.name = "list";

list.on("init", onInit);
// list.on("connection", onConnection);
list.on("remove", onRemove);
list.on("showFilteredTable", function(filter){
    showFilteredTable(filter);
});
list.on('reset', onReset);

function onReset(){
    onRemove();
    aggregate.emit('load', allConnections);
}

function onInit(connections){
    vizcanvas.classList.add("hide"); // we don't need vizcanvas here, so hide it
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    // This binds our data to the D3 visualization and sets up the callbacks
    initList();
    initializeHandlers();
    toggleShowHideHiddenButton();
    aggregate.on('update', onUpdate);
}

function onUpdate(){
    let { nodes } = aggregate;
    let oldNodeRows = getAllRows().map(function(row) row.getAttribute('data-name'));
    let newNodes = nodes.filter(function(node) {
        return oldNodeRows.indexOf(node.name) < 0;
    });
    if (newNodes.length <= 0) {
        return;
    }

    let refreshRow = document.getElementById('refresh-data-row');
    let refreshLink = document.getElementById('refresh-data-link');
    refreshLink.innerHTML = 'Click to refresh <b>' + newNodes.length + ' new site(s)</b> ...';
    refreshRow.addEventListener('click', function onClick() {
      refreshRow.removeEventListener('click', onClick, false);

      refreshRow.classList.remove('show');

      // FIXME: This is heavyweight: every new node involved deleting and recreating the table
      showFilteredTable(lastFilter);
    }, false);
    refreshRow.classList.add('show');
    return;
}


function onConnection(conn){
    var connection = aggregate.connectionAsObject(conn);
}


function onRemove(){
    // console.log('removing list');
    resetCanvas();
    aggregate.off('update', onUpdate);
}


function initList(){
    var stage = document.querySelector('.stage');

    // breadcrumb
    initBreadcrumb();

    // list header
    var table = elem("div", {'class': 'list-table'}, [
        elem('table', {'role': 'grid', 'aria-label': 'Entering List table'}, [
            elem('tr', {'class': 'refresh', 'id': 'refresh-data-row'}, [
              elem('td', {'colspan': '7', 'id': 'refresh-data-link'})
            ]),
            elem('thead', {'class': 'header-table'}, [
                elem('tr', {'role':'row', 'tabIndex': '0'}, [
                    elem('th', elem('input', {'class': 'selected-header', type: 'checkbox', 'tabIndex': '-1'})),
                    elem('th', {'role':'gridcell'}, 'Type'),
                    elem('th', {'role':'gridcell'}, 'Prefs'),
                    elem('th', {'role':'gridcell'}, 'Website'),
                    elem('th', {'role':'gridcell'}, 'First Access'),
                    elem('th', {'role':'gridcell'}, 'Last Access'),
                    elem('th', {'class': 'sort-numeric', 'role': 'gridcell'}, 'Sites Connected')
                ])
            ]),
        ]),
        elem('div', {'class': 'body-table'},
            elem('table', {'role': 'grid'},
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
    updateBreadcrumb();
}

function initBreadcrumb(){
    var stage = document.querySelector('.stage');
    var breadcrumb = elem("div", {"class": "breadcrumb"});
    stage.appendChild(breadcrumb);
}

function updateBreadcrumb(url){
    // push to breadcrumbStack
    breadcrumbStack.push(url ? url : "All Sites");
    // remove all child nodes in breadcrumb container before we start mapping breadcrumbs to UI again
    resetVisibleBreadcrumb();
    // map breadcrumbs to UI
    mapBreadcrumbsToUI();
}

var breadcrumbClickHandler = function(event){
    var url = event.target.getAttribute("site-url");
    var idxInStack = event.target.getAttribute("idx");
    while ( breadcrumbStack.length > idxInStack ){
        breadcrumbStack.pop();
    }
    showFilteredTable(url);
};

function mapBreadcrumbsToUI(){
    var breadcrumb = document.querySelector(".breadcrumb");
    var lastIdxInStack = breadcrumbStack.length-1;
    // add "All Sites" to breadcrumb container
    breadcrumb.appendChild( elem("div", {"class": "breadcrumb-chunk"}, breadcrumbStack[0]) );
    // other than "All Sites", there is only 1 tier in breadcrumbStack
    // add that tier to breadcrumb container
    if ( lastIdxInStack == 1 ){
        breadcrumb.appendChild( elem("div", {"class": "arrow-left"}) );
        breadcrumb.appendChild( elem(   "div",
                                        {
                                            "class": "breadcrumb-chunk no-click",
                                            "site-url": breadcrumbStack[lastIdxInStack]
                                        },
                                        breadcrumbStack[lastIdxInStack]) );
    }
    // other than "All Sites", there are more than 1 tier in breadcrumbStack
    // we only want to show "All Sites" and the last 2 tiers
    // so add the last 2 tiers to breadcrumb container
    if ( lastIdxInStack >= 2 ){
        // second last tier
        breadcrumb.appendChild( elem(   "div", {"class": "arrow-left"}) );
        breadcrumb.appendChild( elem(   "div",
                                        {
                                            "class": "breadcrumb-chunk",
                                            "site-url": breadcrumbStack[lastIdxInStack-1],
                                            "idx": (lastIdxInStack-1)
                                        },
                                        breadcrumbStack[lastIdxInStack-1]) );
        // last tier
        breadcrumb.appendChild( elem("div", {"class": "arrow-left"}) );
        breadcrumb.appendChild( elem(   "div",
                                        {
                                            "class": "breadcrumb-chunk no-click",
                                            "site-url": breadcrumbStack[lastIdxInStack],
                                            "idx": lastIdxInStack
                                        },
                                        breadcrumbStack[lastIdxInStack]) );
    }

    // add breadcrumbs click event handler
    var allBreadcrumbChunks = document.querySelectorAll(".breadcrumb-chunk");
    toArray(allBreadcrumbChunks).forEach(function(chunk){
        if ( !chunk.classList.contains("no-click") ){
            chunk.addEventListener("click", breadcrumbClickHandler, false);
        }
    });
}


function resetVisibleBreadcrumb(){
    var breadcrumbContainer = document.querySelector(".breadcrumb");
    while ( breadcrumbContainer.firstChild ){
        breadcrumbContainer.removeChild(breadcrumbContainer.firstChild);
    }
}

var lastFilter = null;

function showFilteredTable(filter){
    if ( lastFilter != filter ) updateBreadcrumb(filter);
    lastFilter = filter;
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
        return aggregate.getAllNodes();
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
    var settings = userSettings[node.name] || (node.nodeType == 'blocked' ? 'block' : '');
    var iconUrl = 'icons/collusion_icon_list.png';
    var listIcon = elem('img', {'src': iconUrl, 'class': 'update-table', 'role': 'gridcell'});
    var row = elem('tr', {
            'class': 'node ' + node.nodeType,
            'data-pref': settings,
            'data-name': node.name,
            'site-url': node.name,
            'role': 'row',
            'tabIndex': '0'
    }, [
        elem('td', elem('input', {'type': 'checkbox', 'class': 'selected-row', 'tabIndex':'-1'})),
        elem('td', {'data-sort-key': node.nodeType, 'role': 'gridcell'}, node.nodeType === 'thirdparty' ? 'Third Party' : (node.nodeType === 'blocked' ? 'Unknown' : 'Visited')),
        elem('td', {'class': 'preferences', 'data-sort-key': settings, 'role': 'gridcell'}, '\u00A0'),
        elem('td', {'data-sort-key': node.name, 'role': 'gridcell'}, [
                listIcon,
                node.name
            ]),
        elem('td', {'data-sort-key': node.firstAccess, 'role': 'gridcell'}, (node.nodeType === 'blocked' ? 'Unknown' : formattedDate(node.firstAccess))),
        elem('td', {'data-sort-key': node.lastAccess, 'role': 'gridcell'}, (node.nodeType === 'blocked' ? 'Unknown' : formattedDate(node.lastAccess))),
        elem('td', {'data-sort-key': aggregate.getConnectionCount(node), 'role': 'gridcell'}, aggregate.getConnectionCount(node) + '')
    ]);
    listIcon.addEventListener("mouseenter",tooltip.addTooltip);
    listIcon.addEventListener("mouseleave",tooltip.hide);
    row.addEventListener("mouseenter",function(){
        row.childNodes[3].firstChild.setAttribute("src", "image/collusion_icon_list_blue.png");
    });
    row.addEventListener("mouseleave",function(){
        row.childNodes[3].firstChild.setAttribute("src", iconUrl);
    });

    return row;
}


function createBody(nodes){
    return elem("tbody", {
      'class': 'list-body'
    }, nodes.map(nodeToRow));
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
        var preFrag = document.createDocumentFragment();

        // Is this the preference column?
        var prefCol = localStorage.lastSortColumn === '2';

        rows.forEach(function(row){
            var rowElement = row[1];

            // Check if there are any preferences set for this row
            var prefVal = rowElement.attributes.getNamedItem('data-pref').value;

            if (prefCol && prefVal != ''){
                // This row is marked with a preference and should
                // be appended to the top fragment.
                preFrag.appendChild(rowElement);
            }else{
                frag.appendChild(rowElement);
            }
         });

         tbody.appendChild(preFrag);
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
    var listTable = document.querySelector('.stage .list-table');
    if (listTable){
        listTable.parentElement.removeChild(listTable);
    }
    var breadcrumb = document.querySelector('.stage .breadcrumb');
    if (breadcrumb){
        breadcrumb.parentElement.removeChild(breadcrumb);
    }
    breadcrumbStack = [];
    document.querySelector('.stage-stack').removeEventListener('click', listStageStackClickHandler, false);
    vizcanvas.classList.remove("hide");
}

function getAllRows() {
    return Array.slice(document.querySelectorAll('.body-table tr'));
}

function getSelectedRows(){
    // returns selected rows as an Array
    return getAllRows().filter(function(item){
        return item.querySelector('.selected-row:checked');
    })
}

// Event handlers

function setUserSetting(row, pref) {
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


// selectAllRows should only select VISIBLE rows
function selectAllRows(flag){
    // apply flag to ALL rows first
    var rows = document.querySelectorAll(".body-table tr");
    for (var i = 0; i < rows.length; i++){
        rows[i].querySelector(".selected-row").checked = flag;
        highlightRow(rows[i],flag);
    }
    // and then exclude all the hidden rows
    if ( document.querySelector(".hide-hidden-rows") ){
        var hiddenRows = document.querySelectorAll(".list-table .body-table tr[data-pref=hide]");
        for (var i = 0; i < hiddenRows.length; i++){
            hiddenRows[i].querySelector(".selected-row").checked = false; // makes sure the hidden rows are always unchecked
            highlightRow(hiddenRows[i],false);
        }
    }
}

function setPreferences(pref){
    getSelectedRows().forEach(function(row){
        setUserSetting(row, pref);
    });
    togglePrefButtons();
    toggleShowHideHiddenButton();
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


var listStageStackClickHandler = function(event){
    var target = event.target;
    if(target.mozMatchesSelector('label[for=block-pref], label[for=block-pref] *') ){
        dialog( {   "name" : dialogNames.blockSites,
                    "title": "Block Sites",
                    "message":  "<p><b>Warning:</b></p> " +
                                "<p>Blocking sites will prevent any and all content from being loaded from these domains: [example.com, example.net] and all subdomains [mail.example.com, news.example.net etc.]. </p>" +
                                "<p>This can prevent some sites from working and degrade your interenet experience. Please use this feature carefully. </p>",
                    "imageUrl": "image/collusion_popup_blocked.png"
                },function(confirmed){
                    if ( confirmed ){
                        setPreferences('block');
                    }
                }
        );
    }else if (target.mozMatchesSelector('label[for=hide-pref], label[for=hide-pref] *') ){
        if ( doNotShowDialog(dialogNames.hideSites) ){
            setPreferences('hide');
        }else{
            dialog( {   "name": dialogNames.hideSites,
                        "dnsPrompt": true,
                        "title": "Hide Sites",
                        "message":  "<p>These sites will not be shown in Collusion visualizations, including List View, unless you specifically toggle them back on with the Show Hidden Sites button.</p>" +
                                    "<p>You can use this to ignore trusted sites from the data.</p>",
                        "imageUrl": "image/collusion_popup_hidden.png"
                    },function(confirmed){
                        if ( confirmed ){
                            setPreferences('hide');
                        }
                    }
            );
        }
    }else if (target.mozMatchesSelector('label[for=watch-pref], label[for=watch-pref] *')){
        setPreferences('watch');
    }else if(target.mozMatchesSelector('label[for=no-pref], label[for=no-pref] *')){
        setPreferences('');
    }else if(target.mozMatchesSelector('.toggle-hidden a')){
        toggleHiddenSites(target);
    }
};

// Install handlers
function initializeHandlers(){
    try{
    document.querySelector('.selected-header').addEventListener('change', function(event){
        selectAllRows(event.target.checked);
        togglePrefButtons();
    }, false);

    document.querySelector('.list-footer').querySelector(".legend-toggle").addEventListener("click", function(event){
    	toggleLegendSection(event.target,document.querySelector('.list-footer'));
	});

    document.querySelector('.stage-stack').addEventListener('click', listStageStackClickHandler, false);

    // highlight selected row
    document.querySelector(".list-table").addEventListener("click",function(event){
        var node = event.target;
        // clicking on the cell where the checkbox locates can also trigger the checkbox clicking handler
        if (node.mozMatchesSelector('tbody tr td:first-child, tbody tr td:first-child [type=checkbox]')){
            while(node.mozMatchesSelector('.node *')){
                node = node.parentElement;
            }
            highlightRow(node,node.querySelector("[type=checkbox]").checked);
            togglePrefButtons();
        }
    });

}catch(e){
    console.log('Error: %o', e);
}
}

function highlightRow(node,rowChecked){
    if (rowChecked){
        node.classList.add("checked");
    }else{
        node.classList.remove("checked");
    }
}

function togglePrefButtons(){
    var numChecked = document.querySelectorAll(".list-table .body-table tr input[type=checkbox]:checked").length;
    var toggleOn = numChecked > 0;
    var classToAdd = toggleOn ? "active" : "disabled";
    var classToRemove = toggleOn ? "disabled" : "active";
    // toggle on class
    toArray(document.querySelectorAll("input[name=pref-options] + label")).forEach(function(option){
        option.classList.add(classToAdd);
    });
    // toggle off class
    toArray(document.querySelectorAll("input[name=pref-options] + label")).forEach(function(option){
        option.classList.remove(classToRemove);
    });
}

function toggleShowHideHiddenButton(){
    if ( document.querySelectorAll("[data-pref='hide']").length > 0 ){
        document.querySelector(".toggle-hidden").classList.remove("disabled");
    }else{
        document.querySelector(".toggle-hidden").classList.add("disabled");
    }
}

})(visualizations);
