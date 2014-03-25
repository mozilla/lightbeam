(function(global) {

'use strict';

const roundOffFactor = 5*60*1000; // in milliseconds
var visualizations = {};
var currentVisualization;
var currentFilter;
var allConnections = [];
var userSettings;
try{
    userSettings = JSON.parse(localStorage.userSettings || '{}');
}catch(e){
    userSettings = {};
}
var isRobot = false; // Used for spidering the web only
var uploadTimer;
var saveTimer;

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

// Constants for indexes of properties in array format
global.SOURCE = SOURCE;
global.TARGET = TARGET;
global.TIMESTAMP = TIMESTAMP;
global.CONTENT_TYPE = CONTENT_TYPE;
global.COOKIE = COOKIE;
global.SOURCE_VISITED = SOURCE_VISITED;
global.SECURE = SECURE;
global.SOURCE_PATH_DEPTH = SOURCE_PATH_DEPTH;
global.SOURCE_QUERY_DEPTH = SOURCE_QUERY_DEPTH;
global.SOURCE_SUB = SOURCE_SUB;
global.TARGET_SUB = TARGET_SUB;
global.METHOD = METHOD;
global.STATUS = STATUS;
global.CACHEABLE = CACHEABLE;
global.FROM_PRIVATE_MODE = FROM_PRIVATE_MODE;

var vizcanvas = document.querySelector('.vizcanvas');
var mapDocument, mapcanvas;
document.querySelector('.world-map').addEventListener('load', function(event){
  mapDocument = event.target.contentDocument;
  mapcanvas = mapDocument.querySelector('.mapcanvas');
  initMap(mapcanvas, mapDocument);
}, false);


// Exported globals
global.visualizations = visualizations;
global.currentVisualization = currentVisualization;
global.currentFilter = currentFilter;
global.allConnections = allConnections;
global.userSettings = userSettings;
global.vizcanvas = vizcanvas; // for ui.js
global.mapcanvas = mapcanvas;
global.isRobot = isRobot;
global.uploadTimer = uploadTimer;

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

function onLoad(event) {
  console.log('window onload');
  global.self.port.emit('uiready');
  //global.localStorage.numLaunch = parseInt(global.localStorage.numLaunch, 10)+1 || 1;
  // Wire up events
  document.querySelector('[data-value=' + (global.localStorage.visualization || 'Graph') + ']').setAttribute("data-selected", true);
  var visualizationName = global.localStorage.visualization ? ( global.localStorage.visualization.toLowerCase() ) : "graph";
  global.currentVisualization = global.visualizations[visualizationName];
  // switchVisualization(visualization);
  if (global.localStorage.userHasOptedIntoSharing && global.localStorage.userHasOptedIntoSharing === 'true' ){
    startUploadTimer();
  }
  // save to localStorage every 5 minutes
  saveTimer = setInterval(function(){saveConnections();}, 5 * 60 * 1000);
  console.log('lightbeam load() ended');
}

window.addEventListener('load', onLoad);

window.addEventListener('beforeunload', function(){
    saveConnections(allConnections);
}, false);

function initCap(str){
    return str[0].toUpperCase() + str.slice(1);
}


function switchVisualization(name){
    // var startTime = Date.now();
    // console.log('switchVisualizations(' + name + ')');
    saveConnections(allConnections);
    // console.log('it took %s ms to save connections', Date.now() - startTime)
    if (currentVisualization){
        if (currentVisualization === visualizations[name]) return;
        currentVisualization.emit('remove');
    }
    localStorage.visualization = initCap(name);
    currentVisualization = visualizations[name];
    resetAdditionalUI();
    currentVisualization.emit('init');
    // addon.emit('uiready'); // is this needed?
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
    document.querySelector(".help-content .clock-view-help").classList.add("hidden");
    document.querySelector(".help-content .list-view-help").classList.add("hidden");
    // show vizcanvas again in case it is hidden
    document.querySelector(".vizcanvas").classList.remove("hide");
    // toggle footer section accordingly
    document.querySelector(".graph-footer").classList.add("hidden");
    document.querySelector(".clock-footer").classList.add("hidden");
    document.querySelector(".list-footer").classList.add("hidden");
    var vizName = currentVisualization.name;
    document.querySelector("." + vizName + "-footer").classList.remove("hidden");
}


/****************************************
*   Save connections
*/
function saveConnections(){
    // console.error('saveConnections( ' + allConnections.length + ' connection)');
    var lastSaved = Number(localStorage.lastSaved || 0);
    var unsavedNonPrivateConn = global.excludePrivateConnection(allConnections).filter(function(connection){
        // console.log(connection[TIMESTAMP] + ' > ' + lastSaved + ' (' + (connection[TIMESTAMP] > lastSaved) + ' [' + (typeof connection[TIMESTAMP]) + ']');
        return ( connection[TIMESTAMP] > lastSaved);
    });
    // console.error(unsavedNonPrivateConn.length + ' unsaved, non-private connections');
    if ( unsavedNonPrivateConn.length > 0 ){
        saveConnectionsByDate(unsavedNonPrivateConn);
    }
    localStorage.lastSaved = Date.now();
}


function saveConnectionsByDate(connections){
    var connByDateSet = {};
    var conn, key;
    // group connections by date
    for ( var i=0; i<connections.length; i++ ){
        conn = connections[i];
        key = dateAsKey( conn[TIMESTAMP] );
        if ( connByDateSet[key] ){
            connByDateSet[key].push(conn);
        }else{
            connByDateSet[key] = [conn];
        }
    }
    // save each group of connections to localStorage
    for(var date in connByDateSet){
        saveConnToLocalStorage(date,connByDateSet[date]);
    }
}


function saveConnToLocalStorage(date,connections){
    if ( !localStorage.getItem(date) ){
        saveToLocalStorage(date, JSON.stringify(connections));
    }else{
        saveToLocalStorage(date, localStorage.getItem(date).slice(0,-1) + "," + JSON.stringify(connections).slice(1,-1) + "]");
    }
}


function dateAsKey(timestamp){
    var theDate = new Date(timestamp);
    var year = theDate.getFullYear();
    var month = "00" + (theDate.getMonth()+1);
    var date = "00" + theDate.getDate();
    month = month.substr(-2); // fix the format
    date = date.substr(-2);
    return year+ "-" + month + "-" + date; // in the format of YYYY-MM-DD
}


/****************************************
*   Upload data
*/


function startSharing(askForConfirmation,callback){
    if ( askForConfirmation ){
        askForDataSharingConfirmationDialog( function(confirmed){
            if ( confirmed ){
                localStorage.lastUpload = Date.now();
                localStorage.userHasOptedIntoSharing = true;
                sharingData();
            }
            callback(confirmed);        
        });
    }else{
        localStorage.lastUpload = Date.now();
        localStorage.userHasOptedIntoSharing = true;
        sharingData();
        callback(true);
    }
}

function sharingData(){
    console.log("Beginning Upload...");
    var lastUpload = localStorage.lastUpload;
    var connections = allConnections.filter(function(connection){
        return ( connection[TIMESTAMP] ) > lastUpload;
    });
    var data = exportFormat(connections,true); // round off timestamp
    addon.emit('upload', data);
    console.log('data: %s (%s characters total)', data.slice(0,40), data.length);
    // This is completely and totally broken. However, just leave it here for
    // now.
    startUploadTimer();
}

function startUploadTimer(){
    localStorage.lastUpload = Date.now();
    uploadTimer = setTimeout(function(){sharingData();}, 10 * 60 * 1000); // upload every 10 minutes
}

// Save user settings on exit
window.addEventListener('beforeunload', function(event){
    // don't need to store empty settings
    Object.keys(userSettings).forEach(function(key){
        if (!userSettings[key]){
            delete userSettings[key];
        } 
    });
    localStorage.userSettings = JSON.stringify(userSettings);
}, false);

function saveToLocalStorage(key,value){
    try{
        localStorage.setItem(key,value);
    }catch(error){
        console.log(error);
        if ( error.code == 1014 ){ // QUOTA_EXCEEDED_ERR
            console.log("localStorage reaches its quota, deleting the oldest connections set.");
            var dateKeyArray = [];
            Object.keys(localStorage).sort().forEach(function(key){
                if ( key.charAt(0) == "2" ){ // date keys are in the format of yyyy-mm-dd
                    dateKeyArray.push(key);
                }
            });
            if ( dateKeyArray.length == 0 ){ // exceed localStorage quota and there are no more connections can be deleted
                console.log("[ Error ] Failed to store data to localStorage.");
                return;
            }
            localStorage.removeItem( dateKeyArray.shift() );
            saveToLocalStorage(key,value); // try saving again
        }
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


// Export global functions
global.elem = elem;
global.updateStatsBar = updateStatsBar;
global.formattedDate = formattedDate;
global.switchVisualization = switchVisualization;
global.saveConnectionsByDate = saveConnectionsByDate;
global.startSharing = startSharing;

})(this);
