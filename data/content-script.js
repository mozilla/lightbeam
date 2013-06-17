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
        if ( unsafeWindow.allConnections.length == 0 ){ // when the addon is initialized and passTempConnections was not emitted
            localStorage.connections = localStorage.connections || "[]";
            unsafeWindow.allConnections = JSON.parse(localStorage.connections);
        }
        unsafeWindow.currentVisualization.emit('init', unsafeWindow.allConnections);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: ' + unsafeWindow);
    }
});


self.port.on("passTempConnections", function(connReceived){
    // connReceived can be an empty array [] or an array of connection arrays [ [], [], [] ]
    localStorage.tempConnections = JSON.stringify(connReceived);
    self.port.emit("tempConnectionTransferred", true);
    
    var allConnectionsAsArray = connReceived;
    localStorage.lastSaved = Date.now();
    
    if ( localStorage.connections && localStorage.connections != "[]" ){
        var allConnectionsAsString = localStorage.connections.slice(0,-1) + "," + localStorage.tempConnections.slice(1);
        allConnectionsAsArray = JSON.parse(allConnectionsAsString);
    }
    var allNonPrivateConnections = allConnectionsAsArray.filter(function(connection){
        return (connection[unsafeWindow.FROM_PRIVATE_MODE] == null);
    });
    localStorage.connections = JSON.stringify(allNonPrivateConnections); // do not store connections collected in private mode
    unsafeWindow.splitByDate(allNonPrivateConnections);
    localStorage.totalNumConnections = unsafeWindow.allConnections.length;
    unsafeWindow.allConnections = allConnectionsAsArray;
});


unsafeWindow.addon = self.port;
