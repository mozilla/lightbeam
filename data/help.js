(function(global){
"use strict";

var triggerHelp = function(elem, eventname, data){
    var evt = new CustomEvent(eventname, {detail: data});
    elem.dispatchEvent(evt);
};

global.triggerHelp = triggerHelp;

document.querySelector("body").addEventListener("toggleOnHelp", function(event){
    var currVisualization = event.detail;
    // currVisualization TO BE FIXED 
    if ( currVisualization == "clock" ){ //if ( randNode.querySelector(".tracker") ){ // clock
        createBubble(
            findTargetElement(document.querySelectorAll(".node")),
            "node",
            "each dot represents one third-party connection");
        var timehand = document.querySelector("#timerhand");
        createBubble(timehand, "timehand", "clock hand points to the current time");
    }else if( currVisualization == "graph" ){ // graph
        // select a random visited site, if any
        if ( document.querySelectorAll(".visitedYes").length > 0 ){
        createBubble(
            findTargetElement(document.querySelectorAll(".visitedYes")),
            "node",
            "circles represent visited sites");
        }
        // select a random third-party site, if any
        if ( document.querySelectorAll(".visitedNo").length > 0 ){
            createBubble(
                findTargetElement(document.querySelectorAll(".visitedNo")),
                "node",
                "triangles represent third party sites");
        }
        // select a random third-party site, if any
        if ( document.querySelectorAll(".visitedBoth").length > 0 ){
            createBubble(
                findTargetElement(document.querySelectorAll(".visitedBoth")),
                "node",
                "rectangles represent sites are both visited and third party");
        }
        // select a random edge, if any
        createBubble(
            findTargetElement(document.querySelectorAll(".edge")),
            "edge",
            "each line represents a connection");
    }else{}
    
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
function createBubble(target, type, message){
    var bubble = document.createElement("div");
    var text = document.createTextNode(message);
    bubble.classList.add("help-bubble");
    bubble.appendChild(text);

    if ( type == "node" ){
        bubble.style.top = target.getBoundingClientRect().top - 30 + "px";
        bubble.style.left = target.getBoundingClientRect().left - 30 + "px";
    }else if( type == "timehand") {
        bubble.style.top = target.getBoundingClientRect().bottom - 50 + "px";
        bubble.style.left = target.getBoundingClientRect().left - 30 + "px";
    }else if( type == "edge" ){
        bubble.style.top = target.getBoundingClientRect().top + 30 + "px";
        bubble.style.left = target.getBoundingClientRect().left + 30 + "px";
    }

    document.querySelector("body #help").appendChild(bubble);
}


var clearAllBubbles = function(){
    var help = document.querySelector("#help");
    var clone = help.cloneNode(false);
    document.querySelector("body").removeChild(help); //can only remove one at a time
    document.querySelector("body").appendChild(clone);
    
    d3.selectAll(".highlighted-elm").classed("highlighted-elm", false);
 
    document.querySelector(".help-mode").checked = false;
}

global.clearAllBubbles = clearAllBubbles;



})(this);


