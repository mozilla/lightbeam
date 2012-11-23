var GraphRunner = (function(jQuery, d3) {	

    /* Keep track of whether we're dragging or not, so we can
     * ignore mousover/mouseout events when a drag is in progress:*/
    var isNodeBeingDragged = false;
    window.addEventListener("mousedown", function(e) {
        if ($(e.target).closest("g.node").length)
            isNodeBeingDragged = true;
        }, true);
        window.addEventListener("mouseup", function(e) {
        isNodeBeingDragged = false;
    }, true);


  function Runner(options) {
    var trackers = options.trackers;
    this.width = options.width;
    this.height = options.height;
	var runner  = this;
    var hideFavicons = options.hideFavicons;

    // Create the SVG element and populate it with some basic definitions
    // LONGTERM TODO: Since this is static markup, move it to index.html?
    var vis = d3.select("#chart")
      .append("svg:svg")
        .attr("width", options.width)
        .attr("height", options.height);

    // Create a group inside the SVG element to apply scaling transforms
    // to enable zooming in and out
    var scaleGroup = vis.append("svg:g")
      .attr("id", "scale-group");

    // This triangle marker can be added to the end of a line to make an arrow.
    var defs = vis.append("svg:defs");
    defs.append("svg:marker")
        .attr("id", "Triangle")
        .attr("viewBox", "0 0 10 10")
        .attr("refX", 10)
        .attr("refY", 5)
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", 4*2)
        .attr("markerHeight", 3*2)
        .attr("orient", "auto")
        .append("svg:path")
          .attr("d", "M 0 0 L 10 5 L 0 10 z");

    // This defines the "glow" gradient that appears around visited sites.
    var gradient = defs.append("svg:radialGradient")
      .attr("id", "glow-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%")
      .attr("fx", "50%")
      .attr("fy", "50%");

    gradient.append("svg:stop")
      .attr("offset", "0%")
      .attr("style", "stop-color:rgb(200, 240, 255);stop-opacity:1");

    gradient.append("svg:stop")
      .attr("offset", "100%")
      .attr("style", "stop-color:rgb(0,0,0);stop-opacity:0");

    scaleGroup.append("svg:g").attr("class", "links");
    scaleGroup.append("svg:g").attr("class", "nodes");

    /* Labels need to go on the top above the links and nodes, so we add them last.
     * SVG does not support z-indexing so it's the order of the child elements in the
     * document that determines how they stack visually.
     */
    scaleGroup.append("svg:path").attr("id", "domain-label");
    scaleGroup.append("svg:text").attr("id", "domain-label-text");
    scaleGroup.append("svg:text").attr("id", "domain-label-block-link");

    function setDomainLink(target, d) {
      target.removeClass("tracker").removeClass("site");
      if (d.trackerInfo) {
        var TRACKER_INFO = "http://www.privacychoice.org/companies/index/";
        var trackerId = d.trackerInfo.network_id;
        target.attr("href", TRACKER_INFO + trackerId);
        target.addClass("tracker");
      } else {
        target.attr("href", "http://" + d.name);
        target.addClass("site");
      }
    }

    function showDomainInfo(d) {
      var className = d.name.replace(/\./g, '-dot-');
      var info = $("#domain-infos").find("." + className);

      $("#domain-infos .info").hide();

      // Instead of just clearing out the domain info div and putting in the new info each time,
      // create a clone of the template for each new domain, and re-use that create a clone for each domain and then re-use it if it's already
      // created. An optimization?
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
        } else {
          img.attr("src", 'http://' + d.name + '/favicon.ico')
             .addClass("favicon");
        }
        setDomainLink(info.find("a.domain"), d);
        info.find("h2.domain").prepend(img);
        img.error(function() { img.remove(); });
        $("#domain-infos").append(info);
      }

      // List referrers, if any (sites that set cookies read by this site)
      var referrers = info.find(".referrers");
      var domains = findReferringDomains(d);
      if (domains.length) {
        var list = referrers.find("ul");
        list.empty();
        domains.forEach(function(d) {
          var item = $('<li><a></a></li>');
          setDomainLink(item.find("a").text(d.name), d);
          list.append(item);
        });
        referrers.show();
      } else {
        referrers.hide();
      }

      // List referees, if any (sites that read cookies set by this site)
      var referrees = info.find(".referrees");
      domains = [];
      vis.selectAll("line.from-" + d.index).each(function(e) {
        domains.push(e.target);
      });
      if (domains.length) {
        var list = referrees.find("ul");
        list.empty();
        domains.forEach(function(d) {
          var item = $('<li><a></a></li>');
          setDomainLink(item.find("a").text(d.name), d);
          list.append(item);
        });
        referrees.show();
      } else {
        referrees.hide();
      }

      info.show();
    }
    // End of showDomainInfo()

    function nodeRadius(d) {
      var linkCount = selectReferringLinks(d)[0].length;
      return 12 + linkCount;
    }

    function getCircleClassForSite(d) {
      var classString;
      if (d.wasVisited) {
        classString = "visited";
      } else {
        classString = "site";
      }
      /* Return "tracker" for a red circle;
       * Temporarily disabling this feature
       * until we get a more up-to-date data source for it.*/

      return classString;
    }


    function popupLabel() {

      var menuIsShowing = false;

      function makePath(x, y, r, labelWidth) {
        /* The popup label is defined as a path so that it can be shaped not to overlap its circle
         * Cutout circle on left end, rounded right end, length dependent on length of text.
         * Get ready for some crazy math and string composition! */
        var rightRadius = Math.floor(r/2);
        var reverseWidth = 0 - labelWidth - r;
        var extraHeight = 0;

        // arguments for a are: (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
        var path = "M " + x + " " + y  // starting point
          + " l " + labelWidth + " 0"
          + " a " + rightRadius + " " + rightRadius + " 0 0 1 " + rightRadius + " " + rightRadius
          + " l 0 " + extraHeight
          + " a " + rightRadius + " " + rightRadius + " 0 0 1 -" + rightRadius + " " + rightRadius
          + " l " + reverseWidth + " 0";
        path = path + " a " + r + " " + r + " 0 0 0 " + r + " " + (-2 * rightRadius);
        return path;
      }

      function showPopupLabel(d) {
        /* Show popup label to display domain name next to the circle. */
        var r = nodeRadius(d);
        var fontSize = Math.floor(4 * r / 5);
        var labelWidth = Math.floor( d.name.length * fontSize / 2  ) + 4;
        /* rough heuristic for calculating size of label based on font size and character count
         * (wish svg had the equivalent to canvas' measureText!) */
         /* [dethe]: it does: getComputedTextLength()
          * http://www.w3.org/TR/SVG/text.html#__svg__SVGTextContentElement__getComputedTextLength
          */
        d3.select("#domain-label").classed("hidden", false)
          .attr("d", makePath(d.x + r, d.y, r, labelWidth))
        .attr("class", "round-border " + getCircleClassForSite(d));
        d3.select("#domain-label-text").classed("hidden", false)
          .attr("x", d.x + r + 4)
          .attr("y", d.y + Math.floor(r/2) + fontSize/4)
          .style("font-size", fontSize + "px")
          .text(d.name);
      }

      return {show: function(d) {
                if (!menuIsShowing) {
                  showPopupLabel(d, false);
                }
              },
              hide: function() {
                if (!menuIsShowing) {
                  vis.selectAll("line").classed("hidden", false).attr("marker-end", null).classed("bold", false);
                  d3.selectAll("g.node").classed("unrelated-domain", false);
                  d3.select("#domain-label").classed("hidden", true);
                  d3.select("#domain-label-text").classed("hidden", true);
                  d3.select("#domain-label-block-link").classed("hidden", true);
                }
              },
              showMenu: function(d) {
                menuIsShowing = true;
                showPopupLabel(d, true);
              },
              clear: function() {
                menuIsShowing = false;
                this.hide();
              },
              menuIsShowing: function() {
                return menuIsShowing;
              }
             };
    }

    var thePopupLabel = popupLabel();

    function createNodes(nodes, force) {


      /* Represent each site as a node consisting of an svg group <g>
       * containing a <circle> and an <image>, where the image shows
       * the favicon; circle size shows number of links, color shows
       * type of site. */

      function selectArcs(d) {
        return vis.selectAll("line.to-" + d.index +
                             ",line.from-" + d.index);
      }

      function getGroupClassForSite(d) {
        /* The g.node that wraps around the cicle, favicon, and glow will get
         * tagged with "cookie", "noncookie", or both, so we can show/hide the groups
         * based on filter settings.
         */
        var classString = "";
        if (d.cookie) {
          classString += " cookie";
        }
        if (d.noncookie) {
          classString += " noncookie";
        }
        return classString;
      }

      function getConnectedDomains(d) {
        var connectedDomains = [d.name];
        findReferringDomains(d).forEach( function(e) {
          connectedDomains.push(e.name);
        });
        vis.selectAll("line.from-" + d.index).each(function(e) {
          connectedDomains.push(e.target.name);
        });

        return connectedDomains;
      }

      // Use d3 to bind node array to svg - each node becomes an svg:g with class node.
      // Use d.name as the "primary key" -- a node with the same name is considered the same node.
      var node = vis.select("g.nodes").selectAll("g.node")
        .data(nodes, function(d) { return d.name;});

      // For each node, create svg group <g> to hold circle, image, and title
      var gs = node.enter().append("svg:g")
          .attr("class", function(d) {return "node" + getGroupClassForSite(d);})
          .attr("transform", function(d) {
            // <g> doesn't take x or y attributes but it can be positioned with a transformation
            return "translate(" + d.x + "," + d.y + ")";
          })
          .on("mouseover", function(d) {
             if (isNodeBeingDragged){
                 return;
             }
            // Make directly-connected nodes opaque, the rest translucent:
            var subGraph = getConnectedDomains(d);
            thePopupLabel.show(d, false);
            if (!thePopupLabel.menuIsShowing()) {
              /* Hide all lines except the ones going in or out of this node;
               * make those ones bold and show the triangles on the ends;*/
              vis.selectAll("line").classed("hidden", true);
              selectArcs(d).attr("marker-end", "url(#Triangle)")
                .classed("hidden", false).classed("bold", true);
              showDomainInfo(d);
              // d3.selectAll("g.node").classed("unrelated-domain", function(d) {
              //     // FIXME: Why is d undefined here? Is this a change in d3 v2?
              //     return (subGraph.indexOf(d.name) === -1);
              // });
            }
          })
          .on("mouseout", function(d) {
             thePopupLabel.hide();
          })
          .on("click", function(d) {
            Collusion.switchSidebar("#domain-infos");
          })
          .call(force.drag);


      // glow if site is visited
      gs.append("svg:circle")
        .attr("cx", "0")
        .attr("cy", "0")
        .attr("r", "30")
        .attr("class", "glow")
        .attr("fill", "url(#glow-gradient)")
        .classed("hidden", function(d) {
                return !d.wasVisited;
              });

      gs.append("svg:circle")
          .attr("cx", "0")
          .attr("cy", "0")
          .attr("r", nodeRadius)
          .attr("class", function(d) {
                return "node round-border " + getCircleClassForSite(d);
                });

      if (!hideFavicons) {
        // If hiding favicons ("TED mode"), show initial letter of domain instead of favicon
        gs.append("svg:image")
          .attr("class", "node")
          .attr("width", "16")
          .attr("height", "16")
          .attr("x", "-8") // offset to make 16x16 favicon appear centered
          .attr("y", "-8")
          .attr("xlink:href", function(d) {return 'http://' + d.name + '/favicon.ico'; } );
      }

      /* Properties to apply to all nodes, not just the ones entering.
       * Dynamic properties (i.e. those that can change even after a node is added to the graph)
       * should be set here. */
      node.selectAll("circle.glow").classed("hidden", function(d) {
	      return !d.wasVisited;
	  });
	  // d.selectAll is not a function
      node.selectAll("circle.node").attr("class", function(d) {
              return "node round-border " + getCircleClassForSite(d);
	  });

      // Remove nodes if domain is removed from the data (e.g. user blocked it)
      node.exit().remove();

      return node;
    }

    function createLinks(links) {
      var getClassForLink = function(d) {
        var classString = "link from-" + d.source.index + " to-" + d.target.index;
        /* a link can have both "cookie" and "noncookie" - that would mean that connection happened
         * at least twice, using cookies one time and noncookie methods the other time. */
        if (d.cookie) {
          classString += " cookie";
        }
        if (d.noncookie) {
          classString += " noncookie";
        }
        if (d.userNavigated) {
          classString += " user-navigated";
        }
        return classString;
      };
      // bind links to d3 lines - use source name + target name as 'primary key':
      var link = vis.select("g.links").selectAll("line.link")
        .data(links, function(d) { return d.sourceDomain + "-" + d.targetDomain; });
      link.enter().insert("svg:line", ':first-child')
          .attr("class", getClassForLink)
          .style("stroke-width", 1)
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      // update class on all links - it might have changed for existing links:
      link.attr("class", getClassForLink);

      link.exit().remove();

      return link;
    }
	
   // Resolves collisions between d and all other circles.
   // Taken from http://bl.ocks.org/1748247
   var padding = 30;
   function collide(alpha, nodes) {
     var quadtree = d3.geom.quadtree(nodes);
     return function(d) {
       var r = d.radius + radius.domain()[1] + padding,
           nx1 = d.x - r,
           nx2 = d.x + r,
           ny1 = d.y - r,
           ny2 = d.y + r;
       quadtree.visit(function(quad, x1, y1, x2, y2) {
         if (quad.point && (quad.point !== d)) {
           var x = d.x - quad.point.x,
               y = d.y - quad.point.y,
               l = Math.sqrt(x * x + y * y),
               r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
           if (l < r) {
             l = (l - r) / l * alpha;
             d.x -= x *= l;
             d.y -= y *= l;
             quad.point.x += x;
             quad.point.y += y;
           }
         }
         return x1 > nx2
             || x2 < nx1
             || y1 > ny2
             || y2 < ny1;
       });
     };
   }
	

    function draw(json) {
      var force = d3.layout.force()
          .charge(-500)
          .distance(function(d){
              console.log('d: %s', Object.keys(d).join(', '));
              return 120;
          })
          // .drag()
          .nodes(json.nodes)
          .links(json.links)
          .size([runner.width, runner.height])
          .start();
      $('svg').data('layout', force); // save for later interactive use

      createLinks(json.links);
      createNodes(json.nodes, force);

      vis.style("opacity", 1e-6)
        .transition()
          .duration(1000)
          .style("opacity", 1);

      force.on("tick", function() {
        vis.selectAll("line.link").each(function(d) {
            /* We used to do trig here to find edge of target circle, now we just make sure the lines are drawn first, draw them to the center of the circles, then draw the circles over them. This may hide the arrows, though */
          var line = d3.select(this);
          line.attr("x1", d.source.x)
            .attr("y1", d.source.y)
            .attr("x2", d.target.x)
            .attr("y2", d.target.y);
        });

         vis.selectAll("g.node").attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
         })
         // .each(collide(0.5, json.nodes))
		 // .attr('translate', function(d){return 'translate(' + d.x + ',' + d.y + ')';})
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

    function CollusionGraph(trackers) {
      var nodes = [];
      var links = [];

      function getNodeId(domain) {
        // return index (in nodes array) of matching domain. Will create an entry if it doesn't
        // exist yet.
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n].name == domain) {
            return n;
          }
        }
        // Not found - no entry yet for this domain - create one:

        var trackerInfo = null;
        for (var i = 0; i < trackers.length; i++)
          if (trackers[i].domain == domain) {
            trackerInfo = trackers[i];
            break;
          }
        // console.log("Creating new node " + domain);
        nodes.push({
          name: domain,
          trackerInfo: trackerInfo
        });

        return (nodes.length - 1); // the index of the new node
      }

      // For when we just want the id of an existing node, without side-effects. TODO this
      // is awkward, refactor and get rid of it.
      function getNodeIdDontCreate(domain) {
        for (var n = 0; n < nodes.length; n++) {
          if (nodes[n].name == domain) {
            return n;
          }
        }
        return null;
      }

      function addLink(options) {
        // TODO probably refactor this function -- it's doing several different things awkwardly.

	// Note that getNode has side effect of creating the node if it doesn't exist.
        // This is how nodes get created!
        var fromId = getNodeId(options.from);
        var toId = getNodeId(options.to);

        var linkExists = false;
        // See if a link already exists between these nodes:
        for (var x = 0; x < links.length; x++) {
	  if (options.from == links[x].sourceDomain && options.to == links[x].targetDomain) {
            linkExists = true;
            // We've found an existing link -- update its properties:
            links[x].userNavigated = options.userNavigated;
            links.cookie = options.cookie;
            links.noncookie = options.noncookie;
            break;
          }
        }
        if (!linkExists) {
          /* If it doesn't exist, create a link. The source and target properties are treated
           * specially by d3's force-dircted graph: they must match the indices of the link's
           * source node and target node. */
          links.push({source: fromId, target: toId,
              sourceDomain: options.from, targetDomain: options.to,
              cookie: options.cookie, noncookie: options.noncookie,
              userNavigated: options.userNavigated});
        }

        /* When building up the graph, mark the nodes and links as cookie-based, non-cookie-based,
         * or both. (If a link is cookie-based, the nodes at both ends are cookie-based, etc.)
         * This data will be used to attach appropriate classes to the SVG nodes. */
        if (options.cookie) {
          nodes[toId].cookie = true;
          nodes[fromId].cookie = true;
        }
        if (options.noncookie) {
          nodes[toId].noncookie = true;
          nodes[fromId].noncookie = true;
        }
      }
      var drawing = draw({nodes: nodes, links: links});

      return {
        data: null,
        update: function(json) {
          /* This is the function that will be called whenever main.js wants to inform graphrunner
           * about a change to the data - new links added, or nodes removed, etc. We get passed
           * json of the full data structure. We'll use it to update a nodes array and a links array
           * and bind both to d3's force-directed graph.*/
          this.data = json;
          drawing.force.stop();
          var nodeToRemove = null; // I'm assuming at most one node will be removed per update.

          // Json contains list of domains, each with referrers. Each pair constitutes a link.
          // For each pair, add a link if it does not already exist.
          for (var domainName in json) {
            var domain = json[domainName];
            for (var referrerName in domain.referrers) {
                var referrer = domain.referrers[referrerName];
                var usedCookie = referrer.cookie;
                var usedNonCookie = referrer.noncookie;
                if (!referrer.datatypes){
                    referrer.datatypes = [];
                }
                var userNavigated = referrer.datatypes.indexOf("user_navigation") > -1;
                if (!userNavigated) {
                    // Don't add links if they were user-navigated:
                    addLink({from: referrerName, to: domainName, cookie: usedCookie, noncookie: usedNonCookie,
                         userNavigated: userNavigated});
                }else{
                    /* If we find out about a user-navigated connection, remove any link that
                     * already exists from that referrer to that domain: */
                    for (var l = 0; l < links.length; l++) {
        	            if (referrerName === links[l].sourceDomain && domainName === links[l].targetDomain) {
                            links.splice(l, 1);
                            break;
                        }
                    }
                }
            }
          }

          // addLink() has the side-effect of creating any nodes that didn't already exist
          for (var n = 0; n < nodes.length; n++) {
            if (json[nodes[n].name]) {
              nodes[n].wasVisited = (json[nodes[n].name].visits > 0);
            } else {
              // This node no longer has an entry
              nodeToRemove = n;
            }

            /* For nodes that don't already have a position, initialize them near the center.
             * This way the graph will start from center. If it already has a position, leave it.
             * Note that initializing them all exactly at center causes there to be zero distance,
             * which makes the repulsive force explode!! So add some random factor. */
            if (typeof nodes[n].x == "undefined") {
              nodes[n].x = nodes[n].px = runner.width / 2 + Math.floor( Math.random() * 100 ) - 50;
              nodes[n].y = nodes[n].py = runner.height / 2 + Math.floor( Math.random() * 100 ) - 50;
            }
          }

          if (nodeToRemove != null) {
            // A node must be removed! Start by splicing it out of the list:
            var badName = nodes[nodeToRemove].name;
            nodes.splice(nodeToRemove, 1);

            // Now we have to remove the links that point into or out of that node:
            var newLinks = [];
            for (var l = 0; l < links.length; l++) {
              if (links[l].sourceDomain == badName || links[l].targetDomain == badName) {
                continue; // leave it out
              } else {
                // But that's not all --
                // removing it might have caused the indices of other nodes to change, so all other links
                // have to be updated as well.
                links[l].source = getNodeIdDontCreate(links[l].sourceDomain);
                links[l].target = getNodeIdDontCreate(links[l].targetDomain);
                newLinks.push(links[l]);
              }
            }
            links = newLinks;
          }

          // Bind the links and nodes arrays to force-directed graph, which will create and animate all
          // the SVG elements.
          drawing.force.nodes(nodes);
          drawing.force.links(links);
          drawing.force.start();
          createLinks(links);
          createNodes(nodes, drawing.force);
        }
      };
    }

    function makeBufferedGraphUpdate(graph) {
      var timeoutID = null;

      return function(json) {
        // TODO this comparison sometimes throws:
        // TypeError: attempt to run compile-and-go script on a cleared scope
        if (timeoutID !== null){
            clearTimeout(timeoutID);
            timeoutID = null;
        }
        timeoutID = setTimeout(function() {
            graph.update(json);
        }, 30);
        // TODO the setTimeout call sometimes throws:
        // Illegal operation on WrappedNative prototype object
      };
    }

    var graph = CollusionGraph(trackers);

    // TODO: Move these to collusion-ui:
    var scale = 1.0;
    var draggingBackground = false; // TODO Too many globals - refactor into some kind of
      // ui controller
    var lastDragX = null;
    var lastDragY = null;
    var transX = 0;
    var transY = 0;
    
    // End drag
    window.addEventListener("mouseup", function(e) {
                              draggingBackground = false;
    }, true);
    
    // Start drag
    // Add drag handler on the background for panning:
    window.addEventListener("mousedown", function(e) {
        if (isNodeBeingDragged){
            return false;
        }
        draggingBackground = true;
        lastDragX = e.pageX;
        lastDragY = e.pageY;
    }, true);
    
    // Dragging
    window.addEventListener("mousemove", function(e) {
      if (draggingBackground) {
            var dX = e.pageX - lastDragX;
            var dY = e.pageY - lastDragY;
            lastDragX = e.pageX;
            lastDragY = e.pageY;
            transformSvg(1.0, dX, dY);
      }
    }, true);

    
    function transformSvg(factor, dX, dY) {
        // factor is multiplier to existing scale
        // dX is translation in X to accumulate
        // dY is translation in Y to accumulate
        scale *= factor;
        transX += dX;
        transY += dY;
      var moreTransX = transX + (1 - scale) * (runner.width/ 2);
      var moreTransY = transY + (1 - scale) * (runner.height/ 2);
      document.getElementById("scale-group").setAttribute("transform", "translate(" + moreTransX + "," + moreTransY +") scale(" + scale + "," + scale +")");
    }

    var self = {
      graph: graph,
      width: runner.width,
      height: runner.height,
      updateGraph: makeBufferedGraphUpdate(graph),
      zoomIn:function() {
        transformSvg(1.2, 0, 0);
      },
      zoomOut: function() {
        transformSvg(0.8, 0, 0);
      }
    };
    return self;
  }

  var GraphRunner = {
    Runner: Runner
  };

  return GraphRunner;
})(jQuery, d3);
