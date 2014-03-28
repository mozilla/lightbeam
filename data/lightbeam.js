'use strict';

const roundOffFactor = 5*60*1000; // in milliseconds
var visualizations = {};
var currentVisualization;
var currentFilter;
var allConnections = [];
var isRobot = false; // Used for spidering the web only
var userSettings = {};

// Constants for indexes of properties in array format
const SOURCE = 0;
const TARGET = 1;
const TIMESTAMP = 2;
const CONTENT_TYPE = 3;
const COOKIE = 4;
const SOURCE_VISITED = 5;
const SECURE = 6;
const SOURCE_PATH_DEPTH = 7;
const SOURCE_QUERY_DEPTH = 8;
const SOURCE_SUB = 9;
const TARGET_SUB = 10;
const METHOD = 11;
const STATUS = 12;
const CACHEABLE = 13;
const FROM_PRIVATE_MODE = 14;

var vizcanvas = document.querySelector('.vizcanvas');
var mapDocument, mapcanvas;
document.querySelector('.world-map').addEventListener('load', function(event){
  mapDocument = event.target.contentDocument;
  mapcanvas = mapDocument.querySelector('.mapcanvas');
  initMap();
}, false);


// DOM Utility

function elem(name, attributes, children){
   // name is the tagName of an element
   // [optional] attributes can be null or undefined, or an object of key/values to setAttribute on, attribute values can be functions to call to get the actual value
   // [optional] children can be an element, text or an array (or null or undefined). If an array, can contain strings or elements
   var e = document.createElement(name);
   var val;
   if (attributes && (Array.isArray(attributes) || attributes.nodeName || typeof attributes === 'string')){
        children = attributes;
        attributes = null;
   }
   try{
   if (attributes){
       Object.keys(attributes).forEach(function(key){
           if (attributes[key] === null || attributes[key] === undefined) return;
           if (typeof attributes[key] === 'function'){
               val = attributes[key](key, attributes);
               if (val){
                   e.setAttribute(key, val);
               }
           }else{
               e.setAttribute(key, attributes[key]);
           }
       });
   }
    }catch(e){
        console.log('attributes: not what we think they are: %o', attributes);
    }
   if (children){
       if (!Array.isArray(children)){
    children = [children]; // convenience, allow a single argument vs. an array of one
   }
   children.forEach(function(child){
          if (child.nodeName){
              e.appendChild(child);
          }else{
               // assumes child is a string
               e.appendChild(document.createTextNode(child));
           }
       });
   }
   return e;
};

window.addEventListener('load', function(evt){
    console.log('window onload');
    addon.emit('uiready');
    // Wire up events
    document.querySelector('[data-value=Graph]').setAttribute("data-selected", true);
    var visualizationName = "graph";
    console.log("current vis", visualizationName);
    currentVisualization = visualizations[visualizationName];
    switchVisualization(visualizationName);
});

function initCap(str){
    return str[0].toUpperCase() + str.slice(1);
}

function switchVisualization(name){
    // var startTime = Date.now();
    console.log('switchVisualizations(' + name + ')');
    if (currentVisualization != visualizations[name]) {
        currentVisualization.emit('remove');
    }
    currentVisualization = visualizations[name];
    resetAdditionalUI();
    currentVisualization.emit('init');
    addon.emit("prefChanged", { defaultVisualization: name });
    // console.log('it took %s ms to switch visualizations', Date.now() - startTime);
}

function resetAdditionalUI(){
    // toggle off info panel
    document.querySelector("#content").classList.remove("showinfo");
    var activeTab = document.querySelector(".info-panel-controls ul li.active");
    if ( activeTab ){ // make the active tab inactive, if any
        activeTab.classList.remove("active");
        activeTab.querySelector("img").classList.remove("hidden");
        activeTab.querySelector("i").classList.add("hidden");
    }
    // hide all help sections
    document.querySelector(".help-content .graph-view-help").classList.add("hidden");
    document.querySelector(".help-content .list-view-help").classList.add("hidden");
    // show vizcanvas again in case it is hidden
    document.querySelector(".vizcanvas").classList.remove("hide");
    // toggle footer section accordingly
    document.querySelector(".graph-footer").classList.add("hidden");
    document.querySelector(".list-footer").classList.add("hidden");
    var vizName = currentVisualization.name;
    document.querySelector("." + vizName + "-footer").classList.remove("hidden");
}


/****************************************
*   Upload data
*/


function startSharing(askForConfirmation, callback) {
  let result = true;
  if (askForConfirmation) {
    askForDataSharingConfirmationDialog(function(confirmed) {
      result = confirmed;
      callback(confirmed);
    });
  } else {
    callback(true);
  }
}

/****************************************
*   Format date string
*/
function formattedDate(date,format){
    var d = ( typeof date == "number" ) ? new Date(date) : date;
    var month = [ "Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec" ][d.getMonth()];
    var formatted = month + " " + d.getDate() + ", " + d.getFullYear();
    if ( format == "long" ){
        var dayInWeek = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ][d.getDay()];
        formatted = dayInWeek + ", " + formatted + " " +  ( (d.getHours() == 12) ? 12 : (d.getHours() % 12) ) + ':' + d.toLocaleFormat('%M') + ['AM','PM'][Math.floor(d.getHours() / 12)];
    }
    return formatted;
}


/****************************************
*   update Stats Bar
*/
function updateStatsBar(){
    var dateSince = "just now";
    if ( allConnections.length > 0 ){
        dateSince = formattedDate(allConnections[0][2]);
    }
    document.querySelector(".top-bar .date-gathered").textContent = dateSince;
    document.querySelector(".top-bar .third-party-sites").textContent = aggregate.trackerCount + " " + singularOrPluralNoun(aggregate.trackerCount,"THIRD PARTY SITE"); 
    document.querySelector(".top-bar .first-party-sites").textContent = aggregate.siteCount  + " " + singularOrPluralNoun(aggregate.siteCount,"SITE");
}



