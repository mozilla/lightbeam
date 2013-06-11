self.port.on('log', function log(arguments){
    if (unsafeWindow && unsafeWindow.console){
        unsafeWindow.console.log.call(unsafeWindow, arguments);
    }else{
        console.log('cannot call browser logging: ' + unsafeWindow);
    }
});

self.port.on('connection', function(connection){
    if (unsafeWindow && unsafeWindow.currentVisualization){
        // var connection = JSON.parse(message);
        connection.timestamp = new Date(connection.timestamp);
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

self.port.on("sendTempConnections", function(message){
    // message is an array of connection [ [],[],[] ]
    localStorage.tempConnections = JSON.stringify(message);
    localStorage.tempConnectionsSize = message.length;
    self.port.emit("tempConnectionTransferred", true);
    
    localStorage.lastSaved = Date.now();
    if ( localStorage.connections && localStorage.connections != "[]" ){
        var allConnectionsAsString = localStorage.connections.slice(0,-1) + "," + localStorage.tempConnections.slice(1);
        localStorage.connections = allConnectionsAsString;
        unsafeWindow.allConnections = JSON.parse(allConnectionsAsString);
    }else{
        var parsedTempConnections = localStorage.tempConnections ? JSON.parse(localStorage.tempConnections) : [ [] ] ;
        localStorage.connections = localStorage.tempConnections;
        unsafeWindow.allConnections = parsedTempConnections;
    }
    localStorage.totalNumConnections = unsafeWindow.allConnections.length;
});


unsafeWindow.addon = self.port;
