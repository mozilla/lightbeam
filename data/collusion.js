var visualizations = {};
var currentVisualization;
var allConnections = [];
var userSettings = {};
// FIXME: Read this from config file
var uploadServer = 'http://collusiondb-development.herokuapp.com/shareData';
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

var vizcanvas = document.querySelector('.vizcanvas');
var mapDocument, mapcanvas;
document.querySelector('.world-map').addEventListener('load', function(event){
  mapDocument = event.target.contentDocument;
  mapcanvas = mapDocument.querySelector('.mapcanvas');
  console.log('we should have a mapcanvas now: %o', mapcanvas);
  initMap();
  console.log('map initialized');
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
    addon.emit("privateWindowCheck");
    // Wire up events
    document.querySelector('[data-value=' + (localStorage.visualization || 'Graph') + ']').setAttribute("data-selected", true);
    document.querySelector('.btn_group.visualization [data-selected]').classList.remove("collapsed");
    switchVisualization(localStorage.visualization.toLowerCase() || 'graph');
    if ( localStorage.userHasOptedIntoSharing && localStorage.userHasOptedIntoSharing === 'true' ){
        startUploadTimer();
    }
    saveTimer = setInterval(saveConnections, 5 * 60 * 1000); // save to localStorage every 5 minutes
});


window.addEventListener('beforeunload', function(){
    saveConnections(allConnections);
}, false);


addon.on("isPrivateWindow", function(isPrivate){
    if ( !localStorage.privateBrowsingMsgShown ){
        if ( isPrivate ){
            alert("You've launched Collusion in a Private Browsing Window. Data collected under Private Browsing Windows will not be perserved or stored. It will not appear again once the Window is close.");
        }else{
            alert("Data collected under Private Browsing Windows will not be perserved or stored. It will not appear again once the Collusion tab is close.");
        }
    }

    localStorage.privateBrowsingMsgShown = true;
});

function initCap(str){
    return str[0].toUpperCase() + str.slice(1);
}


function switchVisualization(name){
    console.log('switchVisualizations(' + name + ')');
    saveConnections(allConnections);
    if (currentVisualization){
        if (currentVisualization === visualizations[name]) return;
        currentVisualization.emit('remove');
    }
    localStorage.visualization = initCap(name);
    currentVisualization = visualizations[name];
//    currentVisualization.emit('setFilter');
    resetAddtionalUI();

    addon.emit('uiready');
}


function resetAddtionalUI(){
    // toggle off info panel, settings page, help bubbles
    document.querySelector("#content").classList.remove("showinfo");
    clearAllBubbles();
    // show vizcanvas again in case it is hidden
    document.querySelector(".vizcanvas").classList.remove("hide");
    // toggle legend section accordingly
    document.querySelector(".graph-legend").classList.add("hidden");
    document.querySelector(".clock-legend").classList.add("hidden");
    document.querySelector(".list-footer").classList.add("hidden");
    var vizName = currentVisualization.name;
    if ( vizName != "list" ){
        document.querySelector("." + vizName + "-legend").classList.remove("hidden");
    }else{
        document.querySelector(".list-footer").classList.remove("hidden");
    }
    document.querySelector(".stage-header h1").textContent = initCap(vizName) + " View";
}


/****************************************
*   Save connections
*/
function saveConnections(){
    var lastSaved = localStorage.lastSaved || 0;
    var unsavedNonPrivateConn = excludePrivateConnection(allConnections).filter(function(connection){
        return ( connection[TIMESTAMP] > lastSaved);
    });
    if ( unsavedNonPrivateConn.length > 0 ){
        saveConnectionsByDate(unsavedNonPrivateConn);
    }
    localStorage.lastSaved = Date.now();
    localStorage.totalNumConnections = allConnections.length;
}


function saveConnectionsByDate(connections){
    for ( var i=0; i<connections.length; i++ ){
        var conn = connections[i];
        var key = dateAsKey( conn[TIMESTAMP] );
        if ( !localStorage.getItem(key) ){
            localStorage.setItem(key, "[" + JSON.stringify(conn) + "]");
        }else{
            localStorage.setItem(key, localStorage.getItem(key).slice(0,-1) + "," + JSON.stringify(conn) + "]");
        }
    }
}


function dateAsKey(timestamp){
    return new Date(timestamp).toISOString().slice(0,10);
}


/****************************************
*   Upload data
*/

function startSharing(){
    if (confirm('You are about to start uploading anonymized data to the Mozilla Collusion server. ' +
                'Your data will continue to be uploaded periodically until you turn off sharing. ' +
                'For more information about the data we upload, how it is anonymized, and what Mozilla\'s ' +
                'privacy policies are, please visit http://ItsOurData.com/privacy/.\n\nBy clicking Okay ' +
                'you are agreeing to share your data under those terms.')){
        sharingData();
        uploadButton.innerHTML = 'Stop Sharing';
        localStorage.userHasOptedIntoSharing = true;
    }
}

function stopSharing(){
    if (confirm('You are about to stop sharing data with the Mozilla Collusion server.\n\n' +
                    'By clicking Okay you will no longer be uploading data.')){
        uploadButton.innerHTML = '<img src="image/collusion_icon_share.png" /></i>Share Data';
        localStorage.userHasOptedIntoSharing = false;
        if (uploadTimer){
            clearTimeout(uploadTimer);
            uploadTimer = null;
        }
    }
}

function sharingData(){
    console.log("Beginning Upload...");
    var lastUpload = localStorage.lastUpload || 0;
    var connections = allConnections.filter(function(connection){
        return ( connection[TIMESTAMP] ) > lastUpload;
    });
    var data = exportFormat(connections);
    var request = new XMLHttpRequest();
    request.open("POST", uploadServer, true);
    request.setRequestHeader("Collusion-Share-Data","collusion");
    request.setRequestHeader("Content-type","application/json");
    request.send(data);
    request.onload = function(){
        console.log(this.responseText);
        if (this.status === 200){
            localStorage.lastUpload = Date.now();
        }
    };
    request.onerror = function(){
        console.log("Share data attempt failed.");
    };
    startUploadTimer();
}

function startUploadTimer(){
    uploadTimer = setTimeout(sharingData, 10 * 60 * 1000); // upload every 10 minutes
}
