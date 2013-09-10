self.port.on('log', function log(arguments){
    if (unsafeWindow && unsafeWindow.console){
        unsafeWindow.console.log.call(unsafeWindow, arguments);
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

self.port.on("private-browsing", function() {
    unsafeWindow.dialog( {
            "type": "alert",
            "name": unsafeWindow.dialogNames.privateBrowsing, 
            "dnsPrompt": true,
            "title": "Private Browsing",
            "message":  "<p>You have one or more private browsing windows open.</p>" +
                        "<p>Connections made in private browsing windows will be visualized in Collusion but that data is neither stored locally nor will it ever be shared, if sharing is enabled.</p>" + 
                        "<p>Data gathered in Private Browsing Mode will be deleted whenever Collusion is restarted, and is not collected at all when Collusion is not open.</p>",
            "imageUrl": "image/collusion_popup_privacy.png"
        },
        function(confirmed){}
    );
})

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
