(function(global){
"use strict";

var contentRect = document.querySelector("#content").getBoundingClientRect();
var graphBubbleMap = [
    { "x": contentRect.left + 400, "y": contentRect.top + 70 },
    { "x": contentRect.left + 90, "y": contentRect.top + 110 },
    { "x": contentRect.left + 120, "y": contentRect.top + 320 },
    { "x": contentRect.left + 50, "y": contentRect.top + 550 }
];

var triggerHelp = function(elem, eventname, data){
    var evt = new CustomEvent(eventname, {detail: data});
    elem.dispatchEvent(evt);
};


var clearAllBubbles = function(){
    d3.selectAll(".highlighted-elm").classed("highlighted-elm", false);
    d3.selectAll(".help-bubble").remove();
    d3.selectAll(".help-bubble-line").remove();
    d3.selectAll(".help-bubble-pointer").remove();
    document.querySelector(".help-mode").checked = false;
}

global.clearAllBubbles = clearAllBubbles;
global.triggerHelp = triggerHelp;


document.querySelector("body").addEventListener("toggleOnHelp", function(event){
    //var currVisualization = event.detail;
    if ( currentVisualization.name == "clock" ){
         clockHelp();
    }else if( currentVisualization.name == "graph" ){
        graphHelp();
    }else{
        listHelp();
    }
    
});


document.querySelector("body").addEventListener("toggleOffHelp", function(event){
    //var data = event.detail;
    clearAllBubbles();
});


/* find the target element where the bubble is pointed to */
function findTargetElement(targetGroup){
    var target = targetGroup[ Math.floor(targetGroup.length * Math.random()) ];
    target.classList.add("highlighted-elm");
    return target;
}


/* create a help bubble */
function createBubble(graphType, target, type, message){

    var bubble = document.createElement("div");
    var text = document.createTextNode(message);
    bubble.classList.add("help-bubble");
    bubble.appendChild(text);

    if ( !(graphType == "graph") ){
        if ( type == "node" ){
            bubble.style.top = target.getBoundingClientRect().top - 100 + "px";
            bubble.style.left = target.getBoundingClientRect().left - 100 + "px";
        }else if( type == "timehand") {
            target = target.querySelector("path");
            bubble.style.top = target.getBoundingClientRect().bottom + 100 + "px";
            bubble.style.left = target.getBoundingClientRect().left - 100 + "px";
        }else if( type == "edge" ){
            bubble.style.top = target.getBoundingClientRect().top  + "px";
            bubble.style.left = target.getBoundingClientRect().left  + "px";
        }
    }else{
        var bubbleCount = document.querySelectorAll(".help-bubble").length;
        bubble.style.top = graphBubbleMap[bubbleCount].y + "px";
        bubble.style.left = graphBubbleMap[bubbleCount].x + "px";
    }
 
    var targetRect = target.getBoundingClientRect();
    var targetX = targetRect.left + 0.5 * targetRect.width;
    var targetY = targetRect.top + 0.5 * targetRect.height;


    // append bubble 
    document.querySelector("#help").appendChild(bubble);
 
    // attach line
    var bubbleAddedRect = document.querySelector("#help").lastChild.getBoundingClientRect();
    d3.select(".helpcanvas")
            .append("svg:line")
            .classed("help-bubble-line", true)
            .attr("x1", bubbleAddedRect.left + 0.5 * bubbleAddedRect.width)
            .attr("y1", bubbleAddedRect.top + 0.5 * bubbleAddedRect.height)
            .attr("x2", targetX-10)
            .attr("y2", targetY-10);
 
    // attach a pointer
    d3.select(".helpcanvas")
            .append("svg:circle")
            .classed("help-bubble-pointer", true)
            .attr("cx", targetX-10)
            .attr("cy", targetY-10)
            .attr("r", 8);
}

/* help mode for clock visualization */
function clockHelp(){
    if ( document.querySelectorAll(".node").length > 0 ){
        createBubble(
            "clock",
            findTargetElement(document.querySelectorAll(".node")),
            "node",
            "each dot represents one third-party connection");
    }
    var timehand = document.querySelector("#timerhand");
    createBubble("clock", timehand, "timehand", "clock hand points to the current time");
}

/* help mode for graph visualization */
function graphHelp(){
    // select a random visited site, if any
    if ( document.querySelectorAll(".visitedYes").length > 0 ){
        createBubble(
            "graph",
            findTargetElement(document.querySelectorAll(".visitedYes")),
            "node",
            "circles represent visited sites");
    }
    // select a random third-party site, if any
    if ( document.querySelectorAll(".visitedNo").length > 0 ){
        createBubble(
            "graph",
            findTargetElement(document.querySelectorAll(".visitedNo")),
            "node",
            "triangles represent third party sites");
    }
    // select a random third-party site, if any
    if ( document.querySelectorAll(".visitedBoth").length > 0 ){
        createBubble(
            "graph",
            findTargetElement(document.querySelectorAll(".visitedBoth")),
            "node",
            "rectangles represent sites are both visited and third party");
    }
    // select a random edge, if any
    if ( document.querySelectorAll(".edge").length > 0 ){
        createBubble(
            "graph",
            findTargetElement(document.querySelectorAll(".edge")),
            "edge",
            "each line represents a connection");
    }
}


/* help mode for list visualization */
function listHelp(){

}


})(this);


