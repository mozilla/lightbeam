var CollusionGraphBookmarklet = (function() {
  var exports = {};

  exports.getBookmarkletURL = function(baseURI) {
    function getBaseURI() {
      // We would use document.baseURI, but it's not supported on IE9.
      var a = document.createElement("a");
      a.setAttribute("href", "./");
      return a.href;
    }
    
    baseURI = baseURI || getBaseURI();

    var baseCode = "(function(){var script=document.createElement('script');script.src='http://localhost:8000/bookmarklet.js';script.className='collusion-bookmarklet';document.body.appendChild(script);})();";
    var code = baseCode.replace('http://localhost:8000/', baseURI);
    
    return 'javascript:' + code;
  };
  
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

    function addSrc(node) {
      if (node.className != "collusion-bookmarklet")
        add(node.src);
    }
    
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
  
  exports.makeLinkToGraph = function(baseURI) {
    function sendGraphOnReady(target) {
      window.addEventListener("message", function(event) {
        if (event.source == target) {
          target.postMessage(JSON.stringify(graph), "*");
        }
      });
    }
    
    var link = document.createElement('iframe');
    var graph = exports.makeGraphJSON();

    link.setAttribute("src", baseURI + "../index.html?graph_url=parent");
    link.setAttribute("scrolling", "no");
    document.documentElement.appendChild(link);
    sendGraphOnReady(link.contentWindow);
    
    link.style.position = "fixed";
    link.style.bottom = "0px";
    link.style.right = "0px";
    link.style.width = "640px";
    link.style.height = "480px";
    link.style.zIndex = 99999999;
    link.style.cursor = "pointer";
    link.style.border = "none";
  };

  (function maybeInitBookmarklet() {
    var script = document.querySelector("script.collusion-bookmarklet");
    
    if (script) {
      var src = script.getAttribute("src");
      var baseURI = src.match(/(.*)bookmarklet\.js$/)[1];
      if (window.console && window.console.log)
        window.console.log("Colluders:", exports.getColluders().join(", "));
      exports.makeLinkToGraph(baseURI);
    }
  })();

  return exports;
})();
