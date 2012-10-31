// Visualization 1
//
// Attempting to be similar to the visualization we use in data/ui/graphrunner.js
// i.e., the current Collusion visualization
// Not really there yet

// Protect from leaking global variables into the browser
(function(){

    // Variables for this visualization (global within this file)
    var links = [], // data for graph edges
        nodes = [], // vertices for graph edges
        width = window.innerWidth,
        height = window.innerHeight;
        
    // Grab a handle to the SVG element in the page for use later
    // Resize it to fill the page
    var vis = d3.select('#svg')
        .attr('width', width)
        .attr('height', height);
    var force;
    
        
// Resize when window resizes
// We'll want to do this in any visualization
window.addEventListener('resize', function(){
    width = window.innerWidth;
    height = window.innerHeight;
    // Resize SVG element
    vis.attr('width', width).attr('height', height);
    // Resize d3 visualization
    if (force){
        force.size([width,height]);
    }
});

// Load some data from the dummy directory, this kicks off the whole thing
d3.json('../dummy/days_worth_of_data.json', dynamicForceVisualization);

function dynamicForceVisualization(trackers){
    
    // Map Collusion data to nodes and links for force visualization
    // This is where we fill the links and nodes lists
    // Each link should have attributes source and target, but we can add others
    // Initial values for a link's nodes can be the index they occupy in the array
    // Each node will have x, y, px, py (previous position), etc. Again, we can add extra data.
    Object.keys(trackers).forEach(function(target, targetIdx){
        Object.keys(trackers[target].referrers).forEach(function(source, sourceIdx){
            links.push({
                source: sourceIdx,
                target: targetIdx,
                timestamp: trackers[target].referrers[source].timestamp
            });
            if (!trackers[source]){
                console.log('Source not in trackers: %s', source);
                trackers[source] = true;
                nodes.push({
                   name: source,
                   radius: 12,
                   visited: false 
                });
            }
        });
        nodes.push({
            name: target,
            radius: 12,
            visited: trackers[target].visited
        });
    });
    // We now have data in the right shape in the nodes and links lists. We can add or remove data to these lists after starting the visualizaiton and D3 should manage it for us.
        

    // Initialize Layout
    force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .gravity(0.05)
        .charge(function(d,i){ return 1==0? 0: -2000})
       // .distance(function(d){return d.source.r + d.target.r + 30;})
       .size([width, height])
       .start()
    // Data binding for links
    var lines = vis.selectAll('line')
        .data(links, function(d){return d.source.name + '->' + d.target.name});

    lines.enter()
        .append('line');

    lines.exit()
        .remove();
        
    // Data binding for nodes
    var circles = vis.selectAll('circle')
        // .call(force.drag)
        .data(nodes);//, function(d){return d.name;});

    circles.enter()
        .append('circle');
        
    circles.exit()
        .remove();
    
    // Update method
    force.on('tick', function(){
        var q = d3.geom.quadtree(nodes),
            i = 0,
            n = nodes.length;

        while (++i < n) q.visit(collide(nodes[i]));

        
        lines
            .attr('x1', function(d){ return d.source.x;})
            .attr('y1', function(d){ return d.source.y;})
            .attr('x2', function(d){ return d.target.x;})
            .attr('y2', function(d){ return d.target.y;});
            
        circles
            .attr('cx', function(d){return d.x;})
            .attr('cy', function(d){return d.y;})
            .attr('r', function(d){d.radius = Math.sqrt(d.weight) + 12; return d.radius;})
            .attr('title', function(d){return d.name;})
            .attr('class', function(d){return d.visited ? 'site': 'tracker';});
    });
}

function collide(node) {
  var r = node.radius + 16,
      nx1 = node.x - r,
      nx2 = node.x + r,
      ny1 = node.y - r,
      ny2 = node.y + r;
  return function(quad, x1, y1, x2, y2) {
    if (quad.point && (quad.point !== node)) {
      var x = node.x - quad.point.x,
          y = node.y - quad.point.y,
          l = Math.sqrt(x * x + y * y),
          r = node.radius + quad.point.radius;
      if (l < r) {
        l = (l - r) / l * .5;
        node.x -= x *= l;
        node.y -= y *= l;
        quad.point.x += x;
        quad.point.y += y;
      }
    }
    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
  };
}

})();