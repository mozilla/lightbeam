console.log("loaded panel.js");

document.querySelector("a#openGlobalTab").addEventListener("click", function() {
  self.port.emit("openGlobalTab", {});
});
