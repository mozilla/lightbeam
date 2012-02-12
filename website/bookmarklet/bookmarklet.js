var CollusionGraphBookmarklet = (function() {
  var exports = {};

  exports.getTLD = function(domain) {
    // TODO: This isn't the same as an *effective* TLD.
    // See https://wiki.mozilla.org/Public_Suffix_List for more info.
    return domain.split('.').slice(-2).join('.');
  };
  
  exports.getDomain = function(url) {
    var a = document.createElement('a');
    a.setAttribute("href", url);
    return a.hostname;
  };

  exports.forEach = function(nodes, cb) {
    if (typeof(nodes) == "string")
      nodes = document.querySelectorAll(nodes);
    for (var i = 0; i < nodes.length; i++)
      cb(nodes[i]);
  };

  exports.getColluders = function() {
    var domains = [];

    function add(url) {
      if (!url)
        return;
      var domain = exports.getTLD(exports.getDomain(url));
      if (domains.indexOf(domain) == -1)
        domains.push(domain);
    }

    function addSrc(node) { add(node.src); }
    
    exports.forEach("iframe", addSrc);
    exports.forEach(document.scripts, addSrc);
    exports.forEach(document.images, addSrc);
    exports.forEach(document.embeds, addSrc);
    exports.forEach(document.plugins, addSrc);
    exports.forEach(document.styleSheets, function(node) {
      add(node.href);
    });
    
    return domains;
  };

  exports.makeGraphJSON = function() {
    var graph = {};
    var colluders = exports.getColluders();
    var me = exports.getTLD(document.location.hostname);
    graph[me] = {referrers: {}, visited: true};
    colluders.forEach(function(domain) {
      if (!(domain in graph)) {
        graph[domain] = {referrers: {}, visited: false};
        graph[domain].referrers[me] = [1, null];
      }
    });
    return graph;
  };
  
  exports.makeLinkToGraph = function() {
    var link = document.createElement('a');
    var graph = exports.makeGraphJSON();

    document.documentElement.appendChild(link);

    link.textContent = "Click here for a collusion graph of this page.";
    link.href = "data:application/json," + JSON.stringify(graph);
    link.target = "_blank";
    link.style.position = "fixed";
    link.style.bottom = "0px";
    link.style.left = "0px";
    link.style.color = "white";
    link.style.backgroundColor = "black";
    link.style.padding = "10px";
    link.style.textDecoration = "none";
    link.style.fontFamily = "sans-serif";
    link.style.fontSize = "large";
    link.style.zIndex = 99999999;
  };

  if (window.console && window.console.log)
    window.console.log("Colluders:", exports.getColluders().join(", "));
  exports.makeLinkToGraph();

  return exports;
})();
