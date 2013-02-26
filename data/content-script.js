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
        unsafeWindow.currentVisualization.emit('connection', connection);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: '  + unsafeWindow);
    }
});

self.port.on('init', function(message){
    if (unsafeWindow && unsafeWindow.currentVisualization){
        var connections = message.map(function(connection){
            connection.timestamp = new Date(connection.timestamp);
            return connection;
        });
        unsafeWindow.currentVisualization.emit('init', connections);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: ' + unsafeWindow);
    }
});

unsafeWindow.addon = self.port;
