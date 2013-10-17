self.port.on('log', function log(args){
    if (unsafeWindow && unsafeWindow.console){
        unsafeWindow.console.log.call(unsafeWindow, args);
    }else{
        console.log('cannot call browser logging: ' + unsafeWindow);
    }
});

self.port.on('connection', function(connection){
    if (unsafeWindow && unsafeWindow.aggregate){
        unsafeWindow.allConnections.push(connection);
        unsafeWindow.aggregate.emit('connection', connection);
    }else{
        console.log('cannot call unsafeWindow.aggregate: '  + unsafeWindow);
    }
});

self.port.on('update-blocklist', function(domain){
    if (unsafeWindow && unsafeWindow.aggregate){
        unsafeWindow.aggregate.emit('update-blocklist', domain);
    }else{
        console.log('cannot call unsafeWindow.aggregate to update blocklist: '  + unsafeWindow);
    }
});

self.port.on('update-blocklist-all', function(domains){
    if (unsafeWindow && unsafeWindow.aggregate){
        unsafeWindow.aggregate.emit('update-blocklist-all', domains);
    }else{
        console.log('cannot call unsafeWindow.aggregate to update blocklist: '  + unsafeWindow);
    }
});

self.port.on('init', function(collusionToken){
    // console.error('content-script::init()');
    localStorage.collusionToken = collusionToken;

    if (unsafeWindow && unsafeWindow.aggregate){
        unsafeWindow.allConnections = getAllConnections();
        unsafeWindow.aggregate.emit('load', unsafeWindow.allConnections);
    }else{
        // console.error('cannot call unsafeWindow.aggregate: ' + unsafeWindow);
    }

    // FIXME: temporary solution for now.  need to clean up the code
    unsafeWindow.showPromptToShareDialog();
});


self.port.on("passTempConnections", function(connReceived){
    // connReceived can be an empty array [] or an array of connection arrays [ [], [], [] ]
    self.port.emit("tempConnectionTransferred", true);

    localStorage.lastSaved = Date.now();

    var nonPrivateConnections = connReceived.filter(function(connection){
        return (connection[unsafeWindow.FROM_PRIVATE_MODE] == false);
    });
    unsafeWindow.saveConnectionsByDate(nonPrivateConnections);
});

self.port.on("promptToSaveOldData", function(){
    unsafeWindow.dialog({
        "type": "alert",
        "name": unsafeWindow.dialogNames.saveOldData,
        "dnsPrompt": false,
        "title": "Save Data from Earlier Format",
        "message": "<p>Lightbeam has been updated with a new data format.</p>" + 
                   "<p>The old data you have stored from the beta (Collusion) is no longer supported and will be deleted.</p>" + 
                   "<p>If you would like to save a copy of the old data before it is deleted, press OK. If you press Cancel, the old data will be gone.</p>"
    }),
    function(confirmed){
        alert(confirmed);
    }
});

self.port.on("private-browsing", function() {
    unsafeWindow.dialog( {
            "type": "alert",
            "name": unsafeWindow.dialogNames.privateBrowsing,
            "dnsPrompt": true,
            "title": "Private Browsing",
            "message":  "<p>You have one or more private browsing windows open.</p>" +
                        "<p>Connections made in private browsing windows will be visualized in Lightbeam but that data is neither stored locally nor will it ever be shared, even if sharing is enabled. </p>" +
                        "<p> Information gathered in private browsing mode will be deleted whenever Lightbeam is restarted, and is not collected at all when Lightbeam is not open..</p>",
            "imageUrl": "image/collusion_popup_privacy.png"
        },
        function(confirmed){}
    );
});

function getAllConnections(){
    var allConnectionsAsArray = [];
    Object.keys(localStorage).sort().forEach(function(key){
        if ( key.charAt(0) == "2" ){ // date keys are in the format of yyyy-mm-dd
            var conns = JSON.parse(localStorage.getItem(key));
            allConnectionsAsArray = allConnectionsAsArray.concat(conns);
        }
    });
    console.log('returning %s connections from getAllConnections', allConnectionsAsArray.length);
    return allConnectionsAsArray;
}


unsafeWindow.addon = self.port;
