(function(){

// taken from http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] == variable) {
      return unescape(pair[1]);
    }
  }
}

function switchSidebar(sidebar) {
  var sidebars = [".live-data", "#domain-infos", "#filters", "#credits"];
  for (var i in sidebars) {
    if (sidebar == sidebars[i]) {
      $(sidebars[i]).slideDown();
    } else {
      $(sidebars[i]).slideUp();
    }
  }
}

function updateGraphViaPostMessage(graph, target) {
  target.postMessage("ready", "*");
  $(window).one("message", function(event) {
    graph.update(JSON.parse(event.originalEvent.data));
  });
}

function getJsonNoMatterWhat(url, callback) {
  /* jQuery.getJSON fails silently when trying to get a local json file. jQuery.ajax
   * gets the data but then throws a mysterious error. However, the data is there and
   * perfectly parseable. Not sure why jQuery behaves this way but here's a workaround. */
  jQuery.ajax(
    {url: url,
    dataType: "json",
    error: function(xhr, errText, err) {
      var trackers = JSON.parse(xhr.responseText);
      callback(trackers);
    },
    success: function(text) {
      callback(trackers);
    }});
}

$(window).ready(function() {
	console.log('ready, Captain')
  var addon = CollusionAddon;
  var graphUrl = getQueryVariable("graph_url");
  console.log('addon: %o, graphUrl: %s', addon, graphUrl);

  $("#domain-infos").hide();

  // get list of known trackers from trackers.json file hosted on website:
  getJsonNoMatterWhat("trackers.json", function(trackers) {
    var runner = GraphRunner.Runner({
      width: addon.isInstalled() || graphUrl ? $(window).width() : 640,
      height: addon.isInstalled() || graphUrl ? $(window).height() : 480,
      trackers: trackers,
      hideFavicons: false 
    });
    var graph = runner.graph;

    // Enable drag-and-drop to import collusion graph data from a json file:
    $(document.body).bind("dragover", function(event) {
      event.preventDefault();
    }).bind("drop", function(event) {
      event.preventDefault();
      var files = event.originalEvent.dataTransfer.files;
      if (files.length == 1) {
        var reader = new FileReader();
        reader.onload = function() {
          if (addon.importGraph) {
            addon.importGraph(reader.result);
            window.location.reload();
          } else
            graph.update(JSON.parse(reader.result));
        };
        reader.readAsText(files[0], "UTF-8");
      }
    });

    $("#page").width(runner.width);

    if (graphUrl) {
      if (graphUrl == "opener") {
        updateGraphViaPostMessage(graph, window.opener);
      } else if (graphUrl == "parent") {
        
        updateGraphViaPostMessage(graph, window.parent);
      } else
        jQuery.getJSON(graphUrl, function(data) {
          graph.update(data);
        });
      return;
    }

    if (addon.isInstalled()) {
      // You should only ever see this page if the addon is installed, anyway
      $(".live-data").fadeIn();
      addon.onGraph(runner.updateGraph);
      $("#reset-graph").click(function() {
        if (addon.resetGraph) {
          addon.resetGraph();
          window.location.reload();
        } else
          alert("You need to update your add-on to use this feature.");
      });
      $("#export-graph").click(function() {
        var data = JSON.stringify(graph.data);
        window.open("data:application/json," + data);
      });
      $("#share-graph").click(function() {
        addon.shareGraph();
        // Provide acknowledgement message, ignore further clicks:
        $("#share-graph").html("Thank you! Your graph is being uploaded. (It's OK to close this page.)");
        $("#share-graph").off("click");
      });
      $("#hide-ui").click(function() {
        $("#sidebar").slideUp();
        $("#domain-infos").slideUp();
      });
      $("#save-graph").click(function() {
        var data = JSON.stringify(graph.data);
        addon.saveGraph(data);
        alert("Graph Saved!");
      });
      $("#load-graph").click(function() {
        addon.getSavedGraph();
      });
      $("#clear-graph-history").click(function() {
        var to_save = "{}"
        addon.saveGraph(to_save);
        addon.resetGraph();
        window.location.reload();
      });
      $("#zoom-in-link").click(function() {
        runner.zoomIn();
      });
      $("#zoom-out-link").click(function() {
        runner.zoomOut();
      });
      $("#about-tab-link").click(function() {
        switchSidebar(".live-data");
      });
      $("#site-tab-link").click(function() {
        switchSidebar("#domain-infos");
      });
      $("#credits-tab-link").click(function() {
        switchSidebar("#credits");
      });
      $("#filters-link").click(function() {
        switchSidebar("#filters");
      });
	  $(window).resize(function(){
		  runner.width = $(window).width();
		  runner.height = $(window).height();
		  $('svg').width($(window).width());
		  $('svg').width($(window).width());
	  });
	  
	  function keys(obj){
	  	  var k = [];
		  for (var key in obj){
		      k.push(key);
		  }
		  return k;
	  }

      var setFilters = function() {
        var showCookie = $("#filter-cookie").prop("checked");
        var showNonCookie = $("#filter-noncookie").prop("checked");
        console.log("Show cookie? " + showCookie + " show noncookie? " + showNonCookie);

        $("g.node").hide();
        $("line").hide();
        if ($("#filter-cookie").prop("checked")) {
          $("g.cookie").show();
          $("line.cookie").show();
        }
        if ($("#filter-noncookie").prop("checked")) {
          $("g.noncookie").show();
          $("line.noncookie").show();
        }
      };
      /* Attach onchange listener to #filter-cookie and #filter-noncookie, select all lines and nodes with
       * appropriate classes, show or hide them.*/
      $("#filter-cookie").change(setFilters);
      $("#filter-noncookie").change(setFilters);
	  
	  function filterRecent(time){
		  // Time is one of the strings: 'launch', 'week', 'day', 'hour';
	  }
	  
	  
	  var setRecentFilter = function(evt){
		  console.log('show recent filter %s', keys(evt));
		  console.log('selected: ', $(evt.target).parent().text());
		  var time = $(evt.target).parent().text().split(/\s+/).pop(); // "launch|week|day|hour"
		  filterRecent(time);
	  }
	  $('#filters input[name=show_recent]').change(setRecentFilter);
    }
  });
});

})();