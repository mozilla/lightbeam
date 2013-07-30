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
    console.error('content-script::init()');
    localStorage.collusionToken = collusionToken;
    
    if (unsafeWindow && unsafeWindow.aggregate){
        unsafeWindow.allConnections = getAllConnections();
        unsafeWindow.aggregate.emit('load', unsafeWindow.allConnections);
    }else{
        console.error('cannot call unsafeWindow.aggregate: ' + unsafeWindow);
    }
});


self.port.on("passTempConnections", function(connReceived){
    // connReceived can be an empty array [] or an array of connection arrays [ [], [], [] ]
    self.port.emit("tempConnectionTransferred", true);
    
    localStorage.lastSaved = Date.now();

    var nonPrivateConnections = connReceived.filter(function(connection){
        return (connection[unsafeWindow.FROM_PRIVATE_MODE] == null);
    });
    unsafeWindow.saveConnectionsByDate(nonPrivateConnections);
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
