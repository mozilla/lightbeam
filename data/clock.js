// Clock Visualization

// Visualization of tracking data over 24 hours

(function(visualizations){
"use strict";
const CX = 0;
const CY = 0;
const CENTRE = CX + ',' + CY;
const DOT_TRANS = 'translate(305, 5)';
const HAND_TRANS = 'translate(205, 5)';
const TIME_TRANS = 'translate(0, 5)';
const SVG_NS = 'http://www.w3.org/2000/svg';
const TIME_X1 = -275;
const TIME_X2 = 270 ;
const TIME_Y = CY - 5;

var vizcanvas, times, timeslots, offsets;

// TODO: Make visualization an event emitter, so I can call on('connection', fn) and emit('connection', connection)

var clock = new Emitter();
visualizations.clock = clock;
clock.name = "clock";

clock.on('init', onInit);
clock.on('connection', onConnection);
clock.on('remove', onRemove);
clock.on('setFilter', setFilter);

function setFilter(){
    addon.emit('setFilter', 'filter24hours');
}

function onInit(connections){
    // draw clock dial
    console.log('initializing clock from %s connections', connections.length);
    vizcanvas = document.querySelector('.vizcanvas');
    aggregate.emit('init', connections);
    times = ['12 am', '1 am', '2 am', '3 am', '4 am', '5 am', '6 am', '7 am', '8 am', '9 am', '10 am', '11 am', '12 pm', '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm', '7 pm', '8 pm', '9 pm', '10 pm', '11 pm', '12 am'];
    timeslots = {};
    offsets = [':00', ':15', ':30', ':45'];
    times.slice(1).forEach(function(time){
        timeslots[time] = {':00': [], ':15': [], ':30': [], ':45': [] };
    });
    vizcanvas.setAttribute('viewBox', '-350 -495 700 500');
    drawTimes();
    updateTime();
    connections.forEach(function(connection){
        onConnection(connection);
    });
    fadeEarlierTrackers(timeToBucket(new Date()));
};

function onConnection(conn){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    var connection = aggregate.connectionAsObject(conn);
    aggregate.emit('connection', connection);
    var bucketIdx = timeToBucket(connection.timestamp);
    
    if (! clock.timeslots[bucketIdx]){
        var angle = -180 + (bucketIdx * 1.875); // in degrees
        clock.timeslots[bucketIdx] = {
            group: svg('g', {
                transform: 'rotate(' + angle + ' ' + CENTRE + ') ' + DOT_TRANS,
                bucketIdx: bucketIdx
            }),
            sourceNodes: [],
            targetNodes: [],
            connections: []
        }
        vizcanvas.appendChild(clock.timeslots[bucketIdx].group);
    }

    var bucket = clock.timeslots[bucketIdx];

    // see if we've already added this source node to the visualization
    // if not, create one
    var sourceIdx = -1;
    if ( bucket.sourceNodes.length > 0 ) {
        for (var i=0; i<bucket.sourceNodes.length; i++){
            if ( bucket.sourceNodes[i] == connection.source ){
                sourceIdx = i;
                break;
            }
        }
    }
    if ( sourceIdx < 0 ){
        bucket.sourceNodes.push(connection.source);
        appendNodeG(bucket,connection,"source");
    }
 
    // see if we've already added this target node to the visualization
    // if not, create one
    var targetIdx = -1;
    if ( bucket.targetNodes.length > 0 ) {
        for (var i=0; i<bucket.targetNodes.length; i++){
            if ( bucket.targetNodes[i] == connection.target ){
                targetIdx = i;
                break;
            }
        }
    }
    if ( targetIdx < 0 ){
        bucket.targetNodes.push(connection.target);
        appendNodeG(bucket,connection,"target");
    }
 
    // group source nodes closer to the center of the clock
    // and group target nodes further away
    arrangeNodePosition(bucketIdx);
 
}


function appendNodeG(bucket,connection,nodeType){
    console.log(connection);
    var g = svg('g', {
        'class': 'node ' + nodeType,
        'data-name': connection[nodeType]
    });
    g.appendChild(svg('circle', {
        cx: 0,
        cy: 0,
        r: 4,
        'class': 'tracker'
    }));

    // highlight this node if it belongs to the "colluded nodes" of the currently selected(clicked) node 
    if ( document.querySelector(".clicked-node") ){
        var clickedNodeName = document.querySelector(".clicked-node").getAttribute("data-name");
        if ( connection.source == clickedNodeName ){
            d3.select(g).classed("clicked-node", true);
        }
        for ( var key in aggregate.nodeForKey( clickedNodeName ) ){
            if ( key != clickedNodeName && key == connection[nodeType] ){
                d3.select(g).classed("colluded-"+nodeType, true);
            }
        }
    }
    connection.view = g;
    tooltip.add(g);
    bucket.group.appendChild(g);

}


function positionTargetDot(selection, numSourceNode){
    selection.select("circle").attr("cx", function(d,i){
        return ( numSourceNode + i + 1 ) * 10;
    });
};

function positionSourceDot(selection){
    selection.select("circle").attr("cx", function(d,i){
        return ( i + 1) * 10;
    });
};

function arrangeNodePosition(bucketIdx){
    var bucketG = d3.select("g[bucketIdx='"+bucketIdx+"']");
    var numSourceNode = bucketG.selectAll("g.source")[0].length;
    bucketG.selectAll("g.source").call(positionSourceDot);
    bucketG.selectAll("g.target").call(positionTargetDot, numSourceNode);
}


function onRemove(){
    clearTimeout(clockTimer);
    clock.timeslots = new Array(96);
    resetCanvas();
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
        stroke: '#999', // move to CSS
        fill: 'none',
        'stroke-width': 90,
        d: 'M-250,5 A185,185 0 0,1 250,5'
    }));
    vizcanvas.appendChild(svg('path', {
        stroke: '#CCC', // move to CSS
        fill: 'none',
        'stroke-width': 35,
        d: 'M-275,5 A205,205 0 0,1 275,5'
    }));
    // Draw all the :00 time increment titles
    times.slice(0,13).forEach(function(time, idx){
        vizcanvas.appendChild(svg('text', {
            x: TIME_X1,
            y: TIME_Y,
            transform: 'rotate(' + (7.5 * idx) + ' ' + CENTRE + ') ' + TIME_TRANS
        }, time)
    );});
    times.slice(13).reverse().forEach(function(time, idx){
        vizcanvas.appendChild(svg('text', {
            x: TIME_X2,
            y: TIME_Y,
            transform: 'rotate(' + (-7.5 * idx) + ' ' + CENTRE + ') ' + TIME_TRANS
        }, time)
    )});
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
    return (d.getHours() % 12) + ':' + d.toLocaleFormat('%M') + ['am','pm'][Math.floor(d.getHours() / 12)];
}

function dateNow(){
    return new Date().toLocaleFormat('%e %B %Y').trim();
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
        hand.appendChild(svg('line', {x1: 0, y1: 0, x2: 400, y2: 0}));
        hand.appendChild(svg('path', {d: 'M47,-8 L47,8 73,5 73,-5 Z'}));
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
    clockTimer = setTimeout(updateTime, 1000);
}


})(visualizations);

