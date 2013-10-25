// Clock Visualization

// Visualization of tracking data over 24 hours

(function(visualizations){
"use strict";
const CX = 0;
const CY = 0;
const CENTRE = CX + ',' + CY;
const DOT_TRANS = 'translate(305, 5)';
const HAND_TRANS = 'translate(205, 5)';
const TIME_TRANS = 'translate(280, -265)';
const TIME_LABEL_TRANS = 'translate(280, -248)';
const SVG_NS = 'http://www.w3.org/2000/svg';
const TIME_X = -275;
const TIME_Y = CY - 5;

var times, timeAmPmLabels, timeslots, offsets;

// TODO: Make visualization an event emitter, so I can call on('connection', fn) and emit('connection', connection)

var clock = new Emitter();
visualizations.clock = clock;
clock.name = "clock";

clock.on('init', onInit);
clock.on('remove', onRemove);
clock.on('reset', onReset);

function onReset(){
    onRemove();
    aggregate.emit('load', allConnections);
}

function onInit(){
    aggregate.on('connection', onConnection);
    // console.log("= onInit = allConnections.length = %s" , allConnections.length);
    drawClockFrame();
    var oneDayAgo = Date.now() - (24 *  60 * 60 * 1000);
    allConnections.forEach(function(connection){
        if (connection[TIMESTAMP] > oneDayAgo){
            onConnection(connection);
        }
    });
    fadeEarlierTrackers(timeToBucket(new Date()));
    colourHighlightNodes(highlight);
};

function drawClockFrame(){
    times = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    timeAmPmLabels = [ 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'AM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'PM', 'AM' ]
    timeslots = {};
    offsets = [':00', ':15', ':30', ':45'];
    times.slice(1).forEach(function(time){
        timeslots[time] = {':00': [], ':15': [], ':30': [], ':45': [] };
    });
    vizcanvas.setAttribute('viewBox', '-350 -515 700 530');
    drawTimes();
    updateTime();
}

function onConnection(conn){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    var connection = aggregate.connectionAsObject(conn);
    // aggregate.emit('connection', connection);
    var bucketIdx = timeToBucket(connection.timestamp);
    
    if (! clock.timeslots[bucketIdx]){
        var angle = -180 + (bucketIdx * 1.875); // in degrees
        clock.timeslots[bucketIdx] = {
            group: svg('g', {
                transform: 'rotate(' + angle + ' ' + CENTRE + ') ' + DOT_TRANS
            }),
            sourceNodes: [],
            targetNodes: [],
            connections: []
        }
        vizcanvas.appendChild(clock.timeslots[bucketIdx].group);
    }

    // check to see the site nodes have already existed, if not, create one and add it to the bucket
    addNodesFromConnection(clock.timeslots[bucketIdx],connection)
 
    // group visited site nodes closer to the center of the clock
    // and group third party site nodes further away
    arrangeNodePosition(bucketIdx);
}

function addNodesFromConnection(bucket,connection){
    if ( aggregate.isDomainVisited(connection.source) ){ // we only want to show visited source
        addNewNode(bucket,connection,"source");
    }
    if ( !aggregate.isDomainVisited(connection.target) ){ // if the target has been visited, leave it as visited node.  do not show it as third-party
        addNewNode(bucket,connection,"target");  
    }
}

function addNewNode(bucket,connection,type){
    var idxInBucket = -1;
    var existingNodes;
    var site;

    if ( type == "source" ){
        existingNodes = bucket.sourceNodes;
        site = connection.source;
    }else{ // "target"
        existingNodes = bucket.targetNodes;
        site = connection.target;
    }

    // see if we've already added this node to the specified type group("source"/"target")
    // if not, create one
    if ( existingNodes.length > 0 ) {
        for (var i=0; i<existingNodes.length; i++){
            if ( existingNodes[i] == site ){
                idxInBucket = i;
                break;
            }
        }
    }
    if ( idxInBucket < 0 ){
        existingNodes.push(site);
        appendNodeG(bucket,connection,type);
    }    
}


function appendNodeG(bucket,connection,nodeType){
    var classes = [ "node", nodeType ];
    if ( nodeType == "source" && highlight.source ){
        classes.push("highlighted");
    }
    if ( nodeType == "target" && highlight.target ){
        classes.push("highlighted");
    }
    if ( siteHasPref(connection[nodeType],"watch") ){
        classes.push("watched");
    }
    if ( siteHasPref(connection[nodeType],"block") ){
        classes.push("blocked");
    }

    var g = svg('g', {
        'class': classes.join(" "),
        'data-name': connection[nodeType]
    });

    if (nodeType == "source"){
        g.appendChild(svg('circle', {
            cx: 0,
            cy: 0,
            r: graphNodeRadius["clock"],
            'class': 'tracker'
        }));
    }else if (nodeType == "target"){
        g.appendChild(svg('polygon', {
            points: "-3,-3 3,0 -3,3",
            'class': 'tracker'
        }));
    }

    // highlight this node if it belongs to the "colluded nodes" of the currently selected(clicked) node 
    // if ( document.querySelector(".clicked-node") ){
    //     var clickedNodeName = document.querySelector(".clicked-node").getAttribute("data-name");
    //     if ( connection[nodeType] == clickedNodeName ){
    //         d3.select(g).classed("clicked-node", true);
    //     }
    //     for ( var key in aggregate.nodeForKey( clickedNodeName ) ){
    //         if ( key != clickedNodeName && key == connection[nodeType] ){
    //             d3.select(g).classed("colluded-"+nodeType, true);
    //         }
    //     }
    // }
    connection.view = g;
    tooltip.add(g);
    bucket.group.appendChild(g);

}


function positionTargetDot(selection, numSourceNode){
    selection.select("polygon").attr("transform", function(d,i){
        return "translate("+ (numSourceNode+i+1)*10 + ",0)" ;
    });
};

function positionSourceDot(selection){
    selection.select("circle").attr("cx", function(d,i){
        return ( i + 1) * 10;
    });
};

function arrangeNodePosition(bucketIdx){
    var bucketG = d3.select(clock.timeslots[bucketIdx].group);
    var numSourceNode = bucketG.selectAll("g.source")[0].length;
    bucketG.selectAll("g.source").call(positionSourceDot);
    bucketG.selectAll("g.target").call(positionTargetDot, numSourceNode);
}


function onRemove(){
    clearTimeout(clockTimer);
    clock.timeslots = new Array(96);
    resetCanvas();
    aggregate.off('connection', onConnection);
};


function svg(name, attrs, text){
    var node = document.createElementNS(SVG_NS, name);
    if (attrs){
        Object.keys(attrs).forEach(function(key){
            node.setAttribute(key, attrs[key]);
        });
    }
    if (text){
        node.appendChild(document.createTextNode(text));
    }
    return node;
}


function resetCanvas(){
    // You will still need to remove timer events
    var parent = vizcanvas.parentNode;
    var newcanvas = vizcanvas.cloneNode(false);
    var vizcanvasDefs = document.querySelector(".vizcanvas defs").cloneNode(true);
    newcanvas.appendChild(vizcanvasDefs);
    parent.replaceChild(newcanvas, vizcanvas);
    vizcanvas = newcanvas;
}

function addTracker(tracker){
    var timestamp = new Date(tracker.timestamp);
    var hour = timestamp.getHours();
    var meridian = (hour < 12) ? 'am' : 'pm';
    hour = (hour % 12) + 1; // convert to 12-hour time
    var minutes = timestamp.getMinutes() + 1;
    var offset;
    if (minutes < 15){
        offset = ':00';
    }else if(minutes < 30){
        offset = ':15';
    }else if(minutes < 45){
        offset = ':30';
    }else{
        offset = ':45';
    }
    var time = hour + ' ' + meridian;
    timeslots[time][offset].push(tracker);
    var count = timeslots[time][offset].length;
}

function timeToAngle(date){
    return (date.getHours() * 4 + Math.floor(date.getMinutes() / 15)) * 1.875;
}

function drawTimes(){
    var text;
    // Draw arcs
    vizcanvas.appendChild(svg('path', {
        d: 'M-240,5 A185,185 0 0,1 240,5',
        'class': 'clock-inner-curve'
    }));
    vizcanvas.appendChild(svg('path', {
        d: 'M-300,5 A205,205 0 0,1 300,5',
        'class': 'clock-outer-curve'
    }));
    // Draw all the :00 time increment titles
    times.forEach(function(time, idx){
        vizcanvas.appendChild(svg('text', {
            x: TIME_X,
            y: TIME_Y,
            transform: 'rotate(' + (-90+7.5*idx) + ' ' + CENTRE + ') ' + TIME_TRANS,
            'class': 'times-label'
        }, time)
    );});
    timeAmPmLabels.forEach(function(time, idx){
        vizcanvas.appendChild(svg('text', {
            x: TIME_X,
            y: TIME_Y,
            transform: 'rotate(' + (-90+7.5*idx) + ' ' + CENTRE + ') ' + TIME_LABEL_TRANS,
            'class': 'times-am-pm-label'
        }, time)
    );});
}

function drawText(){
    var clocktime = document.querySelector('.clock-time');
    if (!clocktime){
        clocktime = svg('text', {
            x: 0,
            y: -80,
            'class': 'clock-time'
        }, timeNow());
        vizcanvas.appendChild(clocktime);
    }else{
        clocktime.firstChild.data = timeNow();
    }
    var clockdate = document.querySelector('.clock-date');
    if (!clockdate){
        clockdate = svg('text', {
            x: 0,
            y: -40,
            'class': 'clock-date'
        }, dateNow());
        vizcanvas.appendChild(clockdate);
    }else{
        clockdate.firstChild.data = dateNow();
    }
}

function timeNow(){
    var d = new Date();
    return ( (d.getHours() == 12) ? 12 : (d.getHours() % 12) ) + ':' + d.toLocaleFormat('%M') + ['AM','PM'][Math.floor(d.getHours() / 12)];
}

function dateNow(){
    return formattedDate(new Date());
}


clock.timeslots = new Array(96);

function timeToBucket(timestamp){
    return timestamp.getHours() * 4 + Math.floor(timestamp.getMinutes() / 15);
}

function fadeEarlierTrackers(currentBucketIdx){
    // currentBucketIdx is the index of the bucket (0 - 95)
    // clock.timeslots[currentBucketIdx] is the current bucket
    // bucket.group is the SVG <g> container
    // bucket.connections is the array of connections
    //
    // Set opacity for each bucket
    // Clear items from the next bucket
    var total = clock.timeslots.length;
    clock.timeslots.forEach(function(bucket, idx){
        if (bucket){
            var distance = ((total + currentBucketIdx) - idx) % total; // how far behind currentBucketIdx?
            bucket.group.style.opacity = (100 - distance) / 100;
        }
    });
    var nextBucket = clock.timeslots[(currentBucketIdx + 1) % total];
    if (nextBucket){
        var group = nextBucket.group;
        while(group.firstChild){
            group.removeChild(group.firstChild);
        }
        nextBucket.connections.length = 0;
    }
}

var clockTimer = null;
var lastBucket = null;

function drawTimerHand(time){
    if (!time) time = new Date();
    var hand = document.getElementById('timerhand');
    if (!hand){
        var hand = svg('g', {id: 'timerhand'});
        hand.appendChild(svg('line', {x1: 87, y1: 0, x2: 400, y2: 0}));
        hand.appendChild(svg('path', {d: 'M32,-4 L32,4 88,4 88,-4 Z'}));
        hand.appendChild(svg('text',{
            x:0,
            y:-15,
            'class':'time-hand-label',
            transform: 'rotate(90)'
        },"Now"));
    }
    vizcanvas.appendChild(hand);
    if (!lastBucket){
        lastBucket = timeToBucket(time);
    }
    if (lastBucket !== timeToBucket(time)){
        lastBucket = timeToBucket(time);
        fadeEarlierTrackers(lastBucket);
    }
    hand.setAttribute('transform', 'rotate(' + (timeToAngle(time) - 180) + ' ' + CENTRE + ') ' + HAND_TRANS);
}

function updateTime(){
    drawTimerHand();
    drawText();
    clockTimer = setTimeout(function(){updateTime();}, 1000);
}


/* Visual Effect ===================================== */

/* ********************
*   When a node in the clock visualization is clicked,
*       all instances of the same node across the day should be highlighted
*       all colluded nodes should also be highlighted (differently)
*/
document.querySelector('#content').addEventListener('click', function(event){
    if ( currentVisualization.name == "clock" ){
        // click could happen on .node or an element inside of .node
        if (event.target.mozMatchesSelector('.node, .node *')){
            var node = event.target;
            while(node.mozMatchesSelector('.node *')){
                node = node.parentElement;
            }
            applyHighlightingEffect(node.getAttribute("data-name"));
        }
    }
},false);

function highlightColludedNode(selection){
    selection.each(function(){
        var colludedNode = d3.select(this);
        if ( colludedNode.classed("source") ){  // this instance of colluded node is a source node
            colludedNode.classed("colluded-source", true);
        }
        if ( colludedNode.classed("target") ){ // this instance of colluded node is a target node
            colludedNode.classed("colluded-target", true);
        }
    });
}

function applyHighlightingEffect(clickedNodeName){
    // reset styling effect
    d3.selectAll("g.node").classed("clicked-node", false)
                          .classed("colluded-source", false)
                          .classed("colluded-target", false)
                          .classed("greyed-out", true);

    // highlight all instances of the clicked node(both source and target)
    d3.selectAll("g[data-name='" + clickedNodeName +"']")
            .classed("clicked-node", true)
            .classed("greyed-out", false);

    // find all the colluded sites and highlight all instances of them
    for ( var key in aggregate.nodeForKey( clickedNodeName ) ){
        if ( key != clickedNodeName ){
            d3.selectAll("g[data-name='"+ key +"']").classed("greyed-out", false).call(highlightColludedNode);
        }
    }

}


/* for Highlighting and Colouring -------------------- */

var highlight = { 
    watched: true,
    blocked: true
};
var clockLegend = document.querySelector(".clock-footer");

legendBtnClickHandler(clockLegend);

clockLegend.querySelector(".legend-toggle-watched").addEventListener("click", function(event){
    highlight.watched = !highlight.watched;
    colourHighlightNodes(highlight);
});

clockLegend.querySelector(".legend-toggle-blocked").addEventListener("click", function(event){
    highlight.blocked = !highlight.blocked;
    colourHighlightNodes(highlight);
});

clockLegend.querySelector(".legend-toggle").addEventListener("click", function(event){
    toggleLegendSection(event.target,clockLegend);
});



})(visualizations);

