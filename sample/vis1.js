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
//d3.json('../dummy/days_worth_of_data.json', dynamicForceVisualization);
// line above requires a web server, here we don't have that problem:
dynamicForceVisualization(data_large);

function dynamicForceVisualization(trackers){
    
    // Map Collusion data to nodes and links for force visualization
    // This is where we fill the links and nodes lists
    // Each link should have attributes source and target, but we can add others
    // Initial values for a link's nodes can be the index they occupy in the array
    // Each node will have x, y, px, py (previous position), etc. Again, we can add extra data.
    Object.keys(trackers).forEach(function(targetName){
        // shape nodes
        var targetNode = trackers[targetName];
        var referrerNames = Object.keys(targetNode.referrers);
        targetNode.name = targetName;
        targetNode.radius = 12 + referrerNames.length;
        nodes.push(targetNode);

        // shape trackers
        referrerNames.forEach(function(sourceName){
            if (!trackers[sourceName]){
                console.log('Source not in trackers: %s', sourceName);
                var sourceNode = {
                    name: sourceName,
                    radius: 12,
                    referrers: [],
                    visited: false
                };
                trackers[sourceName] = sourceNode;
                nodes.push(sourceNode);
            }
            links.push({
                source: trackers[sourceName],
                target: targetNode,
                timestamp: targetNode.referrers[sourceName].timestamp
            });
        });
    });
    // We now have data in the right shape in the nodes and links lists. We can add or remove data to these lists after starting the visualizaiton and D3 should manage it for us.
    
    // Initialize Layout
    force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .charge(-500)
        .size([width, height])
        .start();
       
    // Data binding for links
    var lines = vis.selectAll('line')
        .data(links, function(d){return d.source.name + '->' + d.target.name});

    lines.enter()
        // SVG doesn't support z-indexing, so we put lines behind the circles by inserting them earlier in the DOM tree.
        .insert('line', ':first-child');

    lines.exit()
        .remove();
        
    // Data binding for nodes
    var circles = vis.selectAll('circle')
        .call(force.drag)
        .data(nodes, function(d){return d.name;});

    circles.enter()
        .append('circle');
        
    circles.exit()
        .remove();
    
    // Update method
    force.on('tick', function(){

        lines
            .attr('x1', function(d){ return d.source.x;})
            .attr('y1', function(d){ return d.source.y;})
            .attr('x2', function(d){ return d.target.x;})
            .attr('y2', function(d){ return d.target.y;});
            
        circles
            .attr('cx', function(d){return d.x;})
            .attr('cy', function(d){return d.y;})
            .attr('r', function(d){return d.radius;})
            .attr('title', function(d){return d.name;})
            .attr('class', function(d){return d.visited ? 'site': 'tracker';});
    });
}

})();