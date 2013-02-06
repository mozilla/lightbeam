// Clock Visualization

// Visualization of tracking data over 24 hours

(function(visualizations){
"use strict";
const CX = 300;
const CY = 500;
const CENTRE = CX + ',' + CY;
const DOT_TRANS = 'translate(640, 495)';
const HAND_TRANS = 'translate(505, 495)';
const TIME_TRANS = 'translate(0, 4)';
const SVG_NS = 'http://www.w3.org/2000/svg';
const TIME_X1 = 35;
const TIME_X2 = 600 - TIME_X1;
const TIME_Y = CY - 5;


// TODO: Make visualization an event emitter, so I can call on('connection', fn) and emit('connection', connection)

var clock = new Emitter();
visualizations.clock = clock;


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

var vizcanvas = document.querySelector('.vizcanvas');
var times = ['12 am', '1 am', '2 am', '3 am', '4 am', '5 am', '6 am', '7 am', '8 am', '9 am', '10 am', '11 am', '12 pm', '1 pm', '2 pm', '3 pm', '4 pm', '5 pm', '6 pm', '7 pm', '8 pm', '9 pm', '10 pm', '11 pm', '12 am'];
var timeslots = {};
var offsets = [':00', ':15', ':30', ':45'];
times.slice(1).forEach(function(time){
    timeslots[time] = {':00': [], ':15': [], ':30': [], ':45': [] };
});

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
    times.slice(0,12).forEach(function(time, idx){
        vizcanvas.appendChild(svg('text', {
            x: TIME_X1,
            y: TIME_Y,
            transform: 'rotate(' + (7.5 * idx) + ' ' + CENTRE + ') ' + TIME_TRANS
        }, time)
    );});
    times.slice(12).reverse().forEach(function(time, idx){
        vizcanvas.appendChild(svg('text', {
            x: TIME_X2,
            y: TIME_Y,
            transform: 'rotate(' + (-7.5 * idx) + ' ' + CENTRE + ') ' + TIME_TRANS
        }, time)
    )});
}

clock.timeslots = new Array(96);

function timeToBucket(timestamp){
    return timestamp.getHours() * 4 + Math.floor(timestamp.getMinutes() / 15);
}

// TODO: implement timeToBucket

clock.on('connection', onConnection);

function onConnection(connection){
    // A connection has the following keys:
    // source (url), target (url), timestamp (int), contentType (str), cookie (bool), sourceVisited (bool), secure(bool), sourcePathDepth (int), sourceQueryDepth(int)
    var bucketIdx = timeToBucket(connection.timestamp);
    if (! clock.timeslots[bucketIdx]){
        var angle = -180 + (bucketIdx * 1.875); // in degrees
        clock.timeslots[bucketIdx] = {
            group: svg('g', {
                transform: 'rotate(' + angle + ' ' + CENTRE + ') ' + DOT_TRANS
            }),
            connections: []
        }
        vizcanvas.appendChild(clock.timeslots[bucketIdx].group);
    }
    var bucket = clock.timeslots[bucketIdx];
    var connectionIdx = bucket.connections.length;
    bucket.connections.push(connection);
    bucket.group.appendChild(svg('circle', {
        cx: connectionIdx * 10,
        cy: 0,
        r: 3,
        'class': 'tracker'
    }));
}

function drawTimerHand(time){
    if (!time) time = new Date();
    var hand = document.getElementById('timerhand');
    if (!hand){
        var hand = svg('g', {id: 'timerhand'});
        hand.appendChild(svg('line', {x1: 0, y1: 0, x2: 400, y2: 0}));
        hand.appendChild(svg('path', {d: 'M47,-8 L47,8 73,5 73,-5 Z'}));
        vizcanvas.appendChild(hand);
    }
    hand.setAttribute('transform', 'rotate(' + (timeToAngle(time) - 180) + ' ' + CENTRE + ') ' + HAND_TRANS);
    setTimeout(drawTimerHand, 1000);
}


clock.on('init', function(connections){
    // draw clock dial
    drawTimes();
    drawTimerHand();
    connections.forEach(function(connection){
        onConnection(connection);
    });
});

})(visualizations);

