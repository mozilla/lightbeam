/* temp; won't need this part once we pass connection as array instead of objects */
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

/* === */


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

self.port.on('init', function(message){
    // TODO: handle(save) storage.connections
    if (unsafeWindow && unsafeWindow.currentVisualization){
//        var connections = message.map(function(connection){
//            connection.timestamp = new Date(connection.timestamp);
//            return connection;
//        });
        if ( localStorage.connections ){
            unsafeWindow.allConnections = JSON.parse(localStorage.connections);
        }
        unsafeWindow.currentVisualization.emit('init', connections);
    }else{
        console.log('cannot call unsafeWindow.currentVisualization: ' + unsafeWindow);
    }
});

self.port.on("sendTempConnections", function(message){
    // message is an array of connection objects [ {},{},{} ]
    localStorage.tempConnections = JSON.stringify(message);
    localStorage.tempSize = message.length;
    self.port.emit("tempConnecitonTransferred", true);
    
    var parsedTempConnections = localStorage.tempConnections ? JSON.parse(localStorage.tempConnections) : [ {} ] ;
    if ( localStorage.connections ){
        var paresedConnections = JSON.parse(localStorage.connections);
        localStorage.temp = JSON.stringify(paresedConnections);
        unsafeWindow.allConnections = paresedConnections.concat(parsedTempConnections);
        localStorage.connections = JSON.stringify( paresedConnections.concat(parsedTempConnections) );
    }else{
        localStorage.connections = localStorage.tempConnections;
        unsafeWindow.allConnections = parsedTempConnections;
    }
    localStorage.totalSize = unsafeWindow.allConnections.length;
});


unsafeWindow.addon = self.port;
