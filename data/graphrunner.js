function isAddonInstalled() {
  return ('onGraph' in window);
}

function isPageBig() {
  return isAddonInstalled() || window.location.search.match("page=big");
}

var SVG_WIDTH =  isPageBig() ? $(window).width() : 640,
    SVG_HEIGHT = isPageBig() ? $(window).height() : 480;

var vis = d3.select("#chart")
  .append("svg:svg")
    .attr("width", SVG_WIDTH)
    .attr("height", SVG_HEIGHT);

vis.append("svg:defs")
  .append("svg:marker")
    .attr("id", "Triangle")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 30)
    .attr("refY", 5)
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", 4*2)
    .attr("markerHeight", 3*2)
    .attr("orient", "auto")
    .append("svg:path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z");

vis.append("svg:g").attr("class", "links");
vis.append("svg:g").attr("class", "nodes");

jQuery.fn.extend({
  setDomainLink: function(d) {
    this.removeClass("tracker").removeClass("site");
    if (d.trackerInfo) {
      var TRACKER_INFO = "http://www.privacychoice.org/companies/index/";
      var trackerId = d.trackerInfo.network_id;
      this.attr("href", TRACKER_INFO + trackerId);
      this.addClass("tracker");
    } else {
      this.attr("href", "http://" + d.name);
      this.addClass("site");
    }
  }
});

function showDomainInfo(d) {
  var className = d.name.replace(/\./g, '-dot-');
  var info = $("#domain-infos").find("." + className);

  $("#domain-infos .info").hide();

  if (!info.length) {
    info = $("#templates .info").clone();
    info.addClass(className);
    info.find(".domain").text(d.name);
    var img = $('<img>');
    if (d.trackerInfo) {
      var TRACKER_LOGO = "http://images.privacychoice.org/images/network/";
      var trackerId = d.trackerInfo.network_id;
      info.find("h2.domain").empty();
      img.attr("src", TRACKER_LOGO + trackerId + ".jpg").addClass("tracker");
    } else
      img.attr("src", 'http://' + d.name + '/favicon.ico')
         .addClass("favicon");
    info.find("a.domain").setDomainLink(d);
    info.find("h2.domain").prepend(img);
    img.error(function() { img.remove(); });
    $("#domain-infos").append(info);
  }
  var referrers = info.find(".referrers");
  var domains = findReferringDomains(d);
  if (domains.length) {
    var list = referrers.find("ul");
    list.empty();
    domains.forEach(function(d) {
      var item = $('<li><a></a></li>');
      item.find("a").text(d.name).setDomainLink(d);
      list.append(item);
    });
    referrers.show();
  } else {
    referrers.hide();
  }
  info.show();
}

function createNodes(nodes, force) {

  /* Represent each site as a node consisting of an svg group <g>
   * containing a <circle> and an <image>, where the image shows
   * the favicon; circle size shows number of links, color shows
   * type of site. */

  function getReferringLinkCount(d) {
    return selectReferringLinks(d)[0].length;
  }

  function radius(d) {
    var added = getReferringLinkCount(d) / 3;
    if (added > 7)
      added = 7;
    return 4 + added;
  }

  function selectArcs(d) {
    return vis.selectAll("line.to-" + d.index +
                         ",line.from-" + d.index);
  }

  var node = vis.select("g.nodes").selectAll("g.node")
      .data(nodes);

  node.transition()
      .duration(1000)
      .attr("r", radius);

  // For eadch node, create svg group <g> to hold circle, image, and title
  var gs = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function(d) {
        // <g> doesn't take x or y attributes but it can be positioned with a transformation
        return "translate(" + d.x + "," + d.y + ")";
      })
      .on("mouseover", function(d) {
        /* On mouseover, make the node appear larger, pull it to front,
           and make the links black so they stand out from the crowd. */
        selectArcs(d).attr("marker-end", "url(#Triangle)").classed("bold", true);
        showDomainInfo(d);
        d3.select(this).attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ") scale(2, 2)";
          });
        /* SVG z-index is determined by node order within DOM, so move the node
           to the end of its parent in order to bring it to the front: */
        this.parentNode.appendChild(this);
      })
      .on("mouseout", function(d) {
        /* Upon leaving, undo the changes made in mouseover */
        selectArcs(d).attr("marker-end", null).classed("bold", false);
        d3.select(this).attr("transform", function(d) {
          return "translate(" + d.x + "," + d.y + ")";
        });
      });

  gs.append("svg:circle")
      .attr("cx", "0")
      .attr("cy", "0")
      .attr("r", radius)
      .attr("class", function(d) {
         return "node " + (d.trackerInfo ? "tracker" : "site");
      });

  gs.append("svg:image")
      .attr("class", "node")
      .attr("width", "16")
      .attr("height", "16")
      .attr("x", "-8") // offset to make 16x16 favicon appear centered
      .attr("y", "-8")
      .attr("xlink:href", function(d) {return 'http://' + d.name + '/favicon.ico'; } )
      .call(force.drag);

  gs.append("svg:title")
      .text(function(d) { return d.name; });

  return node;
}

function createLinks(links) {
  var link = vis.select("g.links").selectAll("line.link")
      .data(links)
    .enter().append("svg:line")
      .attr("class", function(d) { return "link from-" + d.source.index +
                                   " to-" + d.target.index; })
      .style("stroke-width", 1)
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  return link;
}

function draw(json) {
  var force = d3.layout.force()
      .charge(-120)
      .distance(60)
      .friction(0)
      .nodes(json.nodes)
      .links(json.links)
      .size([SVG_WIDTH, SVG_HEIGHT])
      .start();

  createLinks(json.links);
  createNodes(json.nodes, force);

  vis.style("opacity", 1e-6)
    .transition()
      .duration(1000)
      .style("opacity", 1);

  force.on("tick", function() {
     vis.selectAll("line.link").attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

     vis.selectAll("g.node").attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
     });
  });

  return {
    vis: vis,
    force: force
  };
}

function selectReferringLinks(d) {
  return vis.selectAll("line.to-" + d.index);
}

function findReferringDomains(d, list, domain) {
  if (!list) {
    list = [];
    domain = d.name;
  }

  selectReferringLinks(d).each(function(d) {
    if (list.indexOf(d.source) == -1 &&
        d.source.name != domain) {
      list.push(d.source);
      findReferringDomains(d.source, list, domain);
    }
  });

  return list;
}

// TODO there was once a break between scripts here; not sure why or if it's needed...
function CollusionGraph(trackers) {
  var nodes = [];
  var links = [];
  var domainIds = {};

  function getNodeId(domain) {
    if (!(domain in domainIds)) {
      domainIds[domain] = nodes.length;
      var trackerInfo = null;
      for (var i = 0; i < trackers.length; i++)
        if (trackers[i].domain == domain) {
          trackerInfo = trackers[i];
          break;
        }
      nodes.push({
        name: domain,
        trackerInfo: trackerInfo
      });
    }
    return domainIds[domain];
  }

  function addLink(options) {
    var fromId = getNodeId(options.from);
    var toId = getNodeId(options.to);
    var link = vis.select("line.to-" + toId + ".from-" + fromId);
    if (!link[0][0])
      links.push({source: fromId, target: toId});
  }

  var drawing = draw({nodes: nodes, links: links});

  return {
    data: null,
    update: function(json) {
      this.data = json;
      drawing.force.stop();

      for (var domain in json)
        for (var referrer in json[domain])
          addLink({from: referrer, to: domain});

      drawing.force.nodes(nodes);
      drawing.force.links(links);
      drawing.force.start();
      createLinks(links);
      createNodes(nodes, drawing.force);
    }
  };
}

function showDemo(graph) {
  function findPageLoadIntervals(json, requestReferrer) {
    var requests = [];

    if (typeof(requestRefferer) == "string")
      requestReferrer = [requestReferrer];

    for (var domain in json)
      for (var referrer in json[domain]) {
        var time = json[domain][referrer][0];
        if (requestReferrer.indexOf(referrer) != -1) {
          requests.push(time);
        }
      }

    var uniqueRequests = [];
    requests.forEach(function(time) {
      if (uniqueRequests.indexOf(time) == -1)
        uniqueRequests.push(time);
    });

    return uniqueRequests.sort().reverse();
  }

  function getJsonAtTime(json, maxTime) {
    var filtered = {};

    for (var domain in json) {
      filtered[domain] = {};
      for (var referrer in json[domain]) {
        var time = json[domain][referrer][0];
        if (time <= maxTime)
          filtered[domain][referrer] = json[domain][referrer];
      }
    }

    return filtered;
  }

  jQuery.getJSON("sample-tracking-info.json", function(json) {
    $(".demo").find(".step").hide();
    $(".demo").show();
    $(".demo").find(".step.0").fadeIn();

    var step = 0;
    var DOMAINS = [
      "imdb.com",
      "nytimes.com",
      ["huffingtonpost.com", "atwola.com"],
      "gamespot.com",
      "reference.com"
    ];

    function showNextStep() {
      $(".exposition").slideUp();
      $(".demo").find(".step." + step).fadeOut(function() {
        var times = findPageLoadIntervals(json, DOMAINS[step]);
        var nextTime = times.pop();
        var virtualTime = 0;

        function triggerNextRequest() {
          virtualTime = nextTime;
          graph.update(getJsonAtTime(json, virtualTime));
          if (times.length) {
            nextTime = times.pop();
            setTimeout(triggerNextRequest, nextTime - virtualTime);
          } else
            $(".demo").find(".step." + step).fadeIn();
        }

        triggerNextRequest();

        step++;
      });
    }

    $(".demo").find(".next").click(showNextStep);
  });
}

function makeBufferedGraphUpdate(graph) {
  var timeoutID = null;

  return function(json) {
    if (timeoutID !== null)
     clearTimeout(timeoutID);
    timeoutID = setTimeout(function() {
      timeoutID = null;

      // This is for debugging purposes only!
      // window.lastJSON = json;

      graph.update(json);
    }, 250);
  };
}

$(window).ready(function() {
  if (isAddonInstalled())
    $(".exposition").hide();
  
  jQuery.getJSON("trackers.json", function(trackers) {
    var graph = CollusionGraph(trackers);

    $(document.body).bind("dragover", function(event) {
      event.preventDefault();
    }).bind("drop", function(event) {
      event.preventDefault();
      var files = event.originalEvent.dataTransfer.files;
      if (files.length == 1) {
        var reader = new FileReader();
        reader.onload = function() {
          if ('importGraph' in window) {
            window.importGraph(reader.result);
            window.location.reload();
          } else
            graph.update(JSON.parse(reader.result));
        };
        reader.readAsText(files[0], "UTF-8");
      }
    });

    $("#page").width(SVG_WIDTH);

    if (isAddonInstalled()) {
      $(".live-data").fadeIn();
      window.onGraph(makeBufferedGraphUpdate(graph));
      $("#reset-graph").click(function() {
        if ('resetGraph' in window) {
          window.resetGraph();
          window.location.reload();
        } else
          alert("You need to update your add-on to use this feature.");
      });
      $("#export-graph").click(function() {
        var data = JSON.stringify(graph.data);
        window.open("data:application/json," + data);
      });
    } else {
      showDemo(graph);
      setInterval(function displayMessageIfAddonIsInstalled() {
        if (isAddonInstalled())
          $("#addon-installation-detected").slideDown();
      }, 1000);
    }
  });
});
