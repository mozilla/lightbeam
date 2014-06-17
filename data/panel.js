console.log("loaded panel.js");

document.querySelector("a#openGlobalTab").addEventListener("click", function() {
  self.port.emit("openGlobalTab", {});
});

self.port.on('change', function onChange(wInfo) {
  console.log("Panel switches to aggregate for " + wInfo.host);
});

/*
self.port.on("winInfo", function(winInfo) {
  console.log("host", winInfo.host);
  console.log("connections", winInfo.connections);
});
*/
