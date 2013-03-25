// List Visualization

// Display data in tabular format

(function(visualizations){
"use strict";


var list = new Emitter();
visualizations.list = list;
var width = 1000, height = 1000;
var vizcanvas, vis;

list.on("init", OnInit);
list.on("conneciton", onConnection);
list.on("remove", onRemove);

function OnInit(connections){
    console.log('initializing graph from %s connections', connections.length);
    vizcanvas = document.querySelector('.vizcanvas');
    vis = d3.select('.vizcanvas');
    // A D3 visualization has a two main components, data-shaping, and setting up the D3 callbacks
    aggregate.emit('load', connections);
    // This binds our data to the D3 visualization and sets up the callbacks
    initGraph();
    aggregate.on('updated', function(){
    });
    // Differenct visualizations may have different viewBoxes, so make sure we use the right one
    vizcanvas.setAttribute('viewBox', [0,0,width,height].join(' '));
    console.log("width: %s, height: %s", width, height);
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
    vis.attr("width", 0).attr("height", 0); // hide .vizcanvas
 
    var columns = ["Type","Source", "First Access", "Last Access"];
 
    var table = d3.select(".stage").classed("list", true).append("table").classed("list-table", true);
    var thead = table.append("thead");
    var tbody = table.append("tbody");

    // append the header row
    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(column) { return column; });
 
    function appendData(nodes, type){
        var data = new Array();
        if ( nodes ){
            nodes.forEach(function(node){
                    data.push( [ "", node.name, node.firstAccess.toString().substring(0,24), node.lastAccess.toString().substring(0,24)  ] );
            });
            if (data[0]) data[0][0] = type=="visited" ? "Visited" : "Third-Party";
            data.push([" "," "," ","&nbsp;"]);
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
                    //console.log(column, i);
                    return {column: column, value: row[i]};
                });
            })
            .enter()
            .append("td")
                .html(function(d) { return d.value; });
    }
 
    appendData(aggregate.sitenodes, "visited");
    appendData(aggregate.thirdnodes, "third");    
}

function resetCanvas(){
    // You will still need to remove timer events
    var parent = vizcanvas.parentNode;
    var newcanvas = vizcanvas.cloneNode(false);
    parent.replaceChild(newcanvas, vizcanvas);
    vizcanvas = newcanvas;
 
    vizcanvas.setAttribute('viewBox', [0,0,width,height].join(' '));
}

})(visualizations);
