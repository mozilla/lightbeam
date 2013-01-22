// Visualization of tracking data over 24 hours
(function(){
const CX = 300;
const CY = 500;
const CENTRE = CX + ',' + CY;
const DOT_TRANS = 'translate(640, 495)';
const TIME_TRANS = 'translate(0, 4)';
const SVG_NS = 'http://www.w3.org/2000/svg';
const TIME_X1 = 35;
const TIME_X2 = 600 - TIME_X1;
const TIME_Y = CY - 5;

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

var visualization = document.querySelector('.visualization');
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

function drawTimes(){
    var text;
    times.slice(0,12).forEach(function(time, idx){
        visualization.appendChild(svg('text', {
            x: TIME_X1,
            y: TIME_Y,
            transform: 'rotate(' + (7.5 * idx) + ' ' + CENTRE + ') ' + TIME_TRANS
        }, time)
    )});
    times.slice(12).reverse().forEach(function(time, idx){
        visualization.appendChild(svg('text', {
            x: TIME_X2,
            y: TIME_Y,
            transform: 'rotate(' + (-7.5 * idx) + ' ' + CENTRE + ') ' + TIME_TRANS
        }, time)
    )});
}

function drawTrackerDots(){
    var count = 0;
    times.forEach(function(time, idx){
        var trackers, angle, group, circle;
        offsets.forEach(function(offset, offIdx){
            trackers = timeslots[time][offset];
            if (!trackers.length) return;
            count += trackers.length;
            angle = -180 + (idx * 4 + offIdx) * 1.875; // in degrees
            // <g transform="rotate(-46.875 300,500) translate(640,495)">
            group = document.createElementNS(SVG_NS, 'g');
            group.setAttribute('transform', 'rotate(' + angle + ' ' + CENTRE + ') ' + DOT_TRANS );
            trackers.forEach(function(tracker, trackIdx){
                // <circle cx="0" cy="0" r="3" class="tracker" />
                circle = document.createElementNS(SVG_NS, 'circle');
                circle.setAttribute('cx', trackIdx * 10);
                circle.setAttribute('cy', '0');
                circle.setAttribute('r', '3');
                circle.setAttribute('class', 'tracker');
                circle.setAttribute('title', tracker.target);
                group.appendChild(circle);
            });
            visualization.appendChild(group);
        });
    });
}

function update(){
    // draw clock dial
    drawTimes();
    drawTrackerDots();
    // draw timer hand
    // draw text info
}

function test(){
    var urls = ['google.com', 'adsense.google.com', 'youtube.com', 'friendfeed.com', 'news.google.com', 'mozilla.org', 'apple.com', 'twitter.com', 'facebook.com', 'news.google.com', 'nytimes.com', 'boingboing.net', 'slashdot.org', 'livingcode.org', 'marginalrevolution.org'];
    var times = ['8:11 am', '8:31 am', '8:47 am', '9:01 am', '9:15 am', '10:20 am', '10:46 am', '11:00 am', '11:20 am', '11:35 am', '1:15 pm', '1:31 pm', '2:00 pm', '2:15 pm', '2:30 pm', '2:45 pm', '3:00 pm', '3:45 pm', '4:00 pm', '4:45 pm', '5:00 pm', '5:16 pm', '7:45 pm', '8:00 pm', '8:30 pm', '8:45 pm', '10:15 pm', '10:30 pm'];
    function addTestTracker(date, time, url){
        var t = time.split(':');
        var h = parseInt(t[0], 10) - 1;
        if (time.split(' ')[1] === 'pm') h += 12;
        date.setHours(h);
        date.setMinutes(parseInt(t[1], 10));
        addTracker({target: url, timestamp: date.valueOf()});
    }
    var today = new Date();
    times.forEach(function(time, idx){
        var count = urls[idx % urls.length].length;
        for (var i = 0; i < count; i++){
            addTestTracker(today, time, urls[(idx + i) % urls.length]);
        }
    });
    update();
}
test();

window.vis = window.vis || {};
vis.addTracker = addTracker;
vis.update = update;

})();
