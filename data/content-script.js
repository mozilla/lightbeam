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
        if ( localStorage.connections && localStorage.connections != "[]" ){
            unsafeWindow.allConnections = JSON.parse(localStorage.connections);
        }
        unsafeWindow.currentVisualization.emit('init', unsafeWindow.allConnections);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: ' + unsafeWindow);
    }
});

const FROM_PRIVATE_MODE = 14;

self.port.on("passTempConnections", function(message){
    // message can be an empty array [] or an array of connection arrays [ [], [], [] ]
    localStorage.tempConnections = JSON.stringify(message);
    self.port.emit("tempConnectionTransferred", true);
    
    localStorage.lastSaved = Date.now();
    if ( localStorage.connections && localStorage.connections != "[]" ){
        var allConnectionsAsString = localStorage.connections.slice(0,-1) + "," + localStorage.tempConnections.slice(1);
        var allConnectionsAsArray = JSON.parse(allConnectionsAsString);
        var allNonPrivateConnections = allConnectionsAsArray.filter(function(connection){
            return (connection[FROM_PRIVATE_MODE] == null);
        });

        localStorage.connections = JSON.stringify(allNonPrivateConnections); // do not store connections collected in private mode
        unsafeWindow.allConnections = allConnectionsAsArray;
    }else{
        var allNonPrivateConnections = message.filter(function(connection){
            return (connection[FROM_PRIVATE_MODE] == null);
        });
        localStorage.connections = JSON.stringify(allNonPrivateConnections); // do not store connections collected in private mode
        unsafeWindow.allConnections = message;
    }
    localStorage.totalNumConnections = unsafeWindow.allConnections.length;
});


unsafeWindow.addon = self.port;
