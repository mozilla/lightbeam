console.log("loaded panel.js");

document.querySelector("a#openGlobalTab").addEventListener("click", function() {
  self.port.emit("openGlobalTab", {});
});

self.port.on("winInfo", function(winInfo) {
  console.log("host", winInfo.host);
  console.log("connections", winInfo.connections);
});
