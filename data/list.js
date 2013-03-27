// List Visualization

// Display data in tabular format

(function(visualizations){
"use strict";


var list = new Emitter();
visualizations.list = list;
var vizcanvas;
var stage = d3.select(".stage").classed("list", true);
var breadcrumb = stage.append("div").classed("list-breadcrumb", true);
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
    stage.append("div").attr("style", "clear:both");
    var table = stage.append("table").classed("list-table", true);
    var thead = table.append("thead");
    var tbody = table.append("tbody");

    // append the header row
    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(column) { return column; });
 
    appendData(aggregate.sitenodes, "visited", columns);
    appendData(aggregate.thirdnodes, "third", columns);
}


// append data rows to table
function appendData(nodes, type, columns, filter){
    var tbody = d3.select(".list-table tbody");

    var data = new Array();
    if ( nodes ){
        nodes.forEach(function(node){
                data.push( [ "", node.name, node.firstAccess.toString().substring(0,24), node.lastAccess.toString().substring(0,24)  ] ); // strip out the timezone info 
        });
        if (data[0]) data[0][0] = (type=="visited") ? "Visited" : "Third-Party";
        //data.push([" "," "," ","&nbsp;"]);
    }

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data, function(d){ return d; })
        .enter()
        .append("tr")
        .classed(type + "-row", true);

    // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function(row) {
            return columns.map(function(column, i) {
                var value = row[i];
                if (column==columns[1]) value = "<span class='source-data' filter-url='"+ value +"'>" + value + "</span>";
                return {column: column, value: value};
            });
        })
        .enter()
        .append("td")
            .html(function(d) { return d.value; });

    var source = d3.selectAll(".source-data")
                        .on("click", function(d,i){
                            showFilteredList(this.getAttribute("filter-url"));
                        });
}


function setBreadcrumb(nav){
    d3.select(".list-breadcrumb div").classed("hide", false);
    //if ( !nav )
        nav = ["<<< List All"];
    
    breadcrumb
        .selectAll("div")
        .data(nav, function(d){ return d; })
        .enter()
        .append("div")
        .classed("piece", true)
        .html(function(d) { return d; })
        .on("click", function(d,i){
            document.querySelector(".list").removeChild( document.querySelector(".list .list-table") );
            initGraph();
            d3.select(".list-breadcrumb div").classed("hide", true);
        });
}


function filterNodes(nodes, filter){
    var filtered = new Array();
    nodes.forEach(function(node){
        if ( node.name == filter || node.linkedFrom.indexOf(filter) != -1 || node.linkedTo.indexOf(filter) != -1 ){
            filtered.push(node);
        }
    });
    return filtered;
}


function showFilteredList(filter){
    document.querySelector(".list-table").removeChild( document.querySelector(".list-table tbody") );
    d3.select(".list-table").append("tbody");
    var siteNodes = aggregate.sitenodes.concat(aggregate.bothnodes);
    var thirdNodes = aggregate.thirdnodes.concat(aggregate.bothnodes);
    appendData(filterNodes(siteNodes,filter), "visited", columns);
    appendData(filterNodes(thirdNodes,filter), "third", columns);
    setBreadcrumb(filter);
}


function resetCanvas(){ 
    document.querySelector(".stage").removeChild( document.querySelector(".stage .list-table") );
    vizcanvas.classList.remove("hide");
}



})(visualizations);
