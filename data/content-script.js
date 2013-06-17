self.port.on('log', function log(arguments){
    if (unsafeWindow && unsafeWindow.console){
        unsafeWindow.console.log.call(unsafeWindow, arguments);
    }else{
        console.log('cannot call browser logging: ' + unsafeWindow);
    }
});

self.port.on('connection', function(connection){
    if (unsafeWindow && unsafeWindow.currentVisualization){
        unsafeWindow.allConnections.push(connection);
        unsafeWindow.currentVisualization.emit('connection', connection);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: '  + unsafeWindow);
    }
});

self.port.on('init', function(collusionToken){
    localStorage.collusionToken = collusionToken;
    
    if (unsafeWindow && unsafeWindow.currentVisualization){
        unsafeWindow.allConnections = getAllConnections();
        unsafeWindow.currentVisualization.emit('init', unsafeWindow.allConnections);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: ' + unsafeWindow);
    }
});


self.port.on("passTempConnections", function(connReceived){
    // connReceived can be an empty array [] or an array of connection arrays [ [], [], [] ]
    localStorage.tempConnections = JSON.stringify(connReceived);
    self.port.emit("tempConnectionTransferred", true);
    
    localStorage.lastSaved = Date.now();

    var nonPrivateConnections = connReceived.filter(function(connection){
        return (connection[unsafeWindow.FROM_PRIVATE_MODE] == null);
    });
    unsafeWindow.splitByDate(nonPrivateConnections);
    localStorage.totalNumConnections = unsafeWindow.allConnections.length;
});


function getAllConnections(){
    var allConnectionsAsArray = [];

    Object.keys(localStorage).sort().forEach(function(key){
        if ( key.charAt(0) == "2" ){ // date keys are in the format of yyyy-mm-dd
            var conns = JSON.parse(localStorage.getItem(key));
            allConnectionsAsArray = allConnectionsAsArray.concat(conns);
        }
    });
    
//    unsafeWindow.console.log(allConnectionsAsArray);

    return allConnectionsAsArray;
}


unsafeWindow.addon = self.port;
