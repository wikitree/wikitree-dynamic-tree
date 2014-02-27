/*
 *
 *
 *
 */


// Create a new TreeDisplay object
//
function TreeDisplay( opts ) {

	// Default options
	this.rootId = 0;
	this.paneId = '#pane';
	this.infoId = '';

	this.unknownProfile = { Name: 'Unknown', BirthDate: '?', DeathDate: '?' };

	// Handle options
	if (opts.rootId) { this.rootId = opts.rootId; }
	if (opts.paneId) { this.paneId = opts.paneId; }
	this.pane  = $(this.paneId);
	if (opts.infoId) { this.infoId = opts.infoId; }
	console.log("infoId: "+this.infoId);

	this.margin = { top: 10, right: 10, bottom: 10, left: 10 };
	if (opts.margin) { this.margin = opts.margin; }

	// Node dimensions
	this.node_width = 175; this.node_height = 50;
	this.node_buffer = 15;
	if (opts.node_width)  { this.node_width = opts.node_width; }
	if (opts.node_height) { this.node_height = opts.node_height; }

	// Default/starting width of our canvas is the container pane size less the margins.
	// These get edited when we draw the tree based on the nodes we have.
   	this.width = this.pane.width()   - this.margin.left - this.margin.right;
   	this.height = this.pane.height() - this.margin.top  - this.margin.bottom;
	console.log("canvas width = "+this.width + ", height = "+this.height);


	/* Internally defined references, etc. */
   	
	// Define the data fields we want for profiles from the API.
	this.fields = 'Id,Name,FirstName,MiddleName,RealName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Father,Mother';

	// Start with an empty hash of nodes and an empty store of tree node/profile data.
	this.rootNode = {};
	this.nodes = false;

	// Get things started.
	this.init();
}


// Initialize the TreeDisplay object. 
// This loads the starting/root person and, once we have that, draws the tree.
TreeDisplay.prototype.init = function () {

	// We get a new "this" in sub-functions below, so copy the TreeDisplay->init() "this" to "self" for reference in those.
	var self = this;

	// Get the root profile.
	var p = new wikitree.Person( { user_id: this.rootId } );
	p.load( { fields: this.fields} ).then(function(data){ 
		console.log("Got root p:"+p.Name);
		p.ahnentafel = 1;
		for (x in p) { self.rootNode[x] = p[x]; }
		self.drawTree();

	}); 

	d3.tree_center = [ 0, 0 ];
	d3.tree_scale = 1.0;
	d3.tree_center_node = 0;
	
};

// (Re)Draw the tree data into the SVG canvas. 
// ...
TreeDisplay.prototype.drawTree = function () {

	var self = this;

	// Create a Tree layout (https://github.com/mbostock/d3/wiki/Tree-Layout)	
	// Define the "children" (connections between nodes) to be the mother/father records from each Person.
	// The separation is the spacing between sibling nodes. If there are parents, use double the spacing as if there are not.
	// .size(x,y) get/set available layout size
	// .children(x) - sets specific children access function. Assumes return x.children. 
	// .nodeSize()
	// .sort(a,b)  - sort order of sibling nodes


	// The size needs to be large enough to hold all displayed generations.
	// The number of generations is mod-base-2 of the largest Ahnentafel number
	// These are always click behind because we don't reparse our nodes from a click until below...	
	// Ugly.
	var max_ahnentafel = self.maxAhnentafel();
	var max_generation = self.maxGeneration();

   	//var min_width = self.pane.width()   - self.margin.left - self.margin.right;
   	//var min_height = self.pane.height() - self.margin.top  - self.margin.bottom;
   	var min_width = self.node_width + 100;
   	var min_height = self.node_height + 100;

	console.log("min_width,min_height = "+min_width+","+min_height);

	self.width  = (max_generation + 1) * (self.node_width + self.node_buffer) + 100;
	self.height = Math.pow((max_generation + 1), 2) * (self.node_height + self.node_buffer) + 100;

	if (self.width < min_width) { self.width = min_width; }
	if (self.height < min_height) { self.height = min_height; }

	console.log("self.width = "+self.width);
	console.log("self.height = "+self.height);

	d3.tree_scale = 1.0 - 0.125 * (max_generation+1); 
	if (d3.tree_scale < 0.50) { d3.tree_scale = 0.50; }
	console.log("d3.tree_scale = "+d3.tree_scale);


	var tree = d3.layout.tree()
		.separation(function(a, b) { return a.parent === b.parent ? 0.5 : 0.5; })
    		.children(function(d) { return d.parents; })
    		.size([this.height, this.width]);

	console.log("d3.tree_center_node = "+d3.tree_center_node);
	console.log("d3.tree_center = "+d3.tree_center);

	// (Re)Parse our wikitree profiles into d3.tree nodes, recalculating the positions of each node and connecting line
	this.nodes = tree.nodes( this.rootNode );

	// Add an SVG object to our display window (https://github.com/mbostock/d3/wiki/SVG-Shapes).
	// Set the svg space to be as wide as the Tree's width.
	// Add a single group element to our SVG element to hold our nodes.
	d3.select("svg").remove();
	var svg = d3.select(this.paneId).append("svg")
		.attr("width", this.width + this.margin.left + this.margin.right + (this.node_width+this.node_buffer) )
		.attr("height", this.height + this.margin.top + this.margin.bottom + (this.node_height+this.node_buffer) )
		.append("g")
			.attr("class", "drawarea")
			.attr("transform", "translate(" + d3.tree_center + ")scale(" + d3.tree_scale + ")")
		.append("g")
			.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
	;


	for (i in this.nodes ) { 
		console.log( i+')'+this.nodes[i].Name+' - '+this.nodes[i].x+','+this.nodes[i].y + "; a = "+this.nodes[i].ahnentafel ); 
		//for (x in this.nodes[i]) { console.log( 'node '+i+'.'+x+')'+this.nodes[i]); }
	}
	var max_generation = self.maxGeneration();
	console.log("max generation number we have is "+max_generation);

	// Define the links between our elements. Each one has a CSS class of "link".
	// The path is defined by our "elbow" function.

	// Stroke width 3 at min scale of 0.5 and 1 at scales 1 or greater
	var stroke_width = 2;
	if (d3.tree_scale < 0.75) { stroke_width = 3; }
	if (d3.tree_scale < 0.65) { stroke_width = 4; }

	var link = svg.selectAll(".link")
		.data(tree.links(this.nodes))
		.enter().append("path")
		.attr("class", "link")
		.attr("d", this.pathFunction)
		.style("stroke-width", stroke_width)
	;

	// Add the nodes to the displayed tree. Here these are the profiles from our WikiTree data.
	// Add these to the (single) group element we have (g).
	// Assign each a CSS class of "node".
	// Define the transform function which moves the drawn piece by x and y.
	var node = svg.selectAll(".node")
		.data(this.nodes)
		.enter().append("g")
		.attr("class", "node")
		.attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })


	// *** 
	// * Each node is drawn with a name, lifespan, and location as SVG text elements. 
	// * We shift these elements about and apply CSS styles to control the appearance.
	// ***

	/* 
	node.append("text")
		.attr("class", "name")
		.attr("x", 8)
		.attr("y", -6)
		.text(function(d) { return d.Name; });

	node.append("text")
		.attr("x", 8)
		.attr("y", 8)
		.attr("dy", ".71em")
		.attr("class", "about lifespan")
		.text(function(d) { 
			var x = '';
			if (!d.BirthDate || d.BirthDate == '0000-00-00') { x += "?"; } else { x += d.BirthDate; }
			x += ' - ';
			if (!d.DeathDate || d.DeathDate == '0000-00-00') { x += "?"; } else { x += d.DeathDate; }
			return x;
		});

	node.append("text")
		.attr("x", 8)
		.attr("y", 8)
		.attr("dy", "1.86em")
		.attr("class", "about location")
		.text(function(d) { return d.BirthLocation; });
	*/

	// *** 
	// * Render each node with HTML inside the SVG as a foreign object.
	// *** 
	node.append("foreignObject")
		.attr('width',180)
		.attr('height',60)
		.attr("x", 8)
		.attr("y", -25)
		.append("xhtml:body")
		.html(function(d){ return nodeHTML(d); })
	;

	// Define some mouse-over behavior

	node.on("click", function(d){ 
		var mousePosition = d3.mouse(this);
		console.log("mouseover on "+d.Id+" mousePos:"+mousePosition);
		var nodePosition = $(this).position();
		console.log("nodePosition:"+nodePosition.left+","+nodePosition.top);
		d3.tree_center_node = d.Id;

		console.log('Node '+d.Id+' has parents:'+d.parents);
		var this_node = d;
		if (!this_node.parents) { 

			var f = new wikitree.Person( { user_id: this_node.Father } );
			var m = new wikitree.Person( { user_id: this_node.Mother } );

			$.when( 
				f.load( { fields: self.fields } ),
				m.load( { fields: self.fields} )
			).then(function() { 
				this_node.parents = [];
		
				if (f && f.Name) { 
					f.ahnentafel = this_node.ahnentafel * 2;
					this_node.parents.push( f );
				}
				if (m && m.Name) { 
					m.ahnentafel = this_node.ahnentafel * 2 + 1;
					this_node.parents.push( m );
				}

				self.drawTree();


			}); // End first then on getting root profile mother/father

		}

		if (self.infoId) { 
			var p = new wikitree.Person( {user_id: d.Id} );
			p.load({fields: '*'}).then(function(d){ 
				var html = infoHTML( p );
				$(self.infoId).html(html);
			});
		}

		/*
		var html = "<div class='inner'>This is a click on an item</div>";
		var hover_left = nodePosition.left - 50;
		var hover_top  = nodePosition.top  - 50;
		$('#nodeHover').html(html)
			.css('top',hover_top+"px")
			.css('left',hover_left+"px")
			.click(function(){ $('#nodeHover').hide(100); })
			.show(100)
		;
		*/

	}); // End node.on("click")


	//node.on("mouseout", function(d) { 
	//	$('#nodeHover').hide(50);
	//});

	self.svg = svg;

	// Add zoom/pan behavior
	d3.select("svg").call(d3.behavior.zoom().scaleExtent([0.5, 8]).scale(d3.tree_scale).on("zoom",zoom));

};

// Build the HTML div for a node display of a particular profile.
// <div id='##' class='node'>
// 		<div class='name'>Real Middle Last</div>
// 		<div class='dates'>...</div>
// 		<div class='clear'><br /></div>
// </div>
function nodeHTML(d) { 
	var html = "";
	html += "<div d='"+d.Id+"' class='node'>";

	//html += "<div class='parentlink' onClick='parentlink(this);' id='parentlink_"+d.Id+"'>+</div>";

	html += "<div class='name'>";
	if (d.RealName) { html += d.RealName; } else { html == d.FirstName; }
	if (d.MiddleName) { html += " "+d.MiddleName.substr(0,1)+". "; }
	if (d.LastNameCurrent != d.LastNameAtBirth) { html += " ("+d.LastNameAtBirth+") "; }
	html += " "+d.LastNameCurrent;
	html += "</div>";

	html += "<div class='dates'>";
	var x = '';
	if (!d.BirthDate || d.BirthDate == '0000-00-00') { x += " "; } else { x += d.BirthDate.substr(0,4); }
	x += ' - ';
	if (!d.DeathDate || d.DeathDate == '0000-00-00') { x += " "; } else { x += d.DeathDate.substr(0,4); }
	html += x + "</div>";

	//x += " (" + d.ahnentafel + ") ";
	//html += "<div class='about'>"+x+"</div>";


	html += "<div class='clear'></div>";
	html += "</div>";
	return html;

}


function infoHTML(p) { 
	/*
	var html = $('#infoHTML_template').html();
	for (var k in p) { 
		var re = new RegExp("#"+k+"#","g");
		html = html.replace(re, p[k]);
	}
	*/

	var html = "";

	html += "<h3><a href='http://www.wikitree.com/wiki/"+p.Name+"' target='_new'>"+p.Name+"</a></h3>";
	
	if (p.Prefix) { html += "" + p.Prefix+" "; }
	html += "" + p.FirstName + "";
	if (p.MiddleName) { html += " " + p.MiddleName + ""; }
	if (p.Nicknames) { html += " " + p.Nicknames + ""; }
	html += " " + p.LastNameCurrent + "";
	if (p.Suffix) { html += " " + p.Suffix + ""; }
	if (p.LastNameAtBirth != p.LastNameCurrent) { html += " formerly "+p.LastNameAtBirth+""; }
	if (p.LastNameOther) { html += " aka " + p.LastNameOther + ""; }
	html += "<br />";

	if (p.BirthDate != '0000-00-00') { 
		html += "Born " +p.BirthDate;
		if (p.BirthLocation) { 
			html += " in "+p.BirthLocation;
		}
		html += "<br />";
	}
	if (p.DeathDate != '0000-00-00') { 
		html += "Died " +p.DeathDate;
		if (p.DeathLocation) { 
			html += " in "+p.DeathLocation;
		}
		html += "<br />";
	}

	if (p.Gender == 'Male') { html += "Son"; } else if (p.Gender == 'Female') { html += "Daughter"; } else { html += 'Child'; } 
	html += " of ";
	if (p.Father) { 
		html += "<a href='http://www.wikitree.com/wiki/"+p.Parents[ p.Father ].Name+"' target='_new'>"+p.Parents[p.Father].FirstName+" "+p.Parents[p.Father].LastNameCurrent+"</a>";
	} else { 
		html += "[father]";
	}
	html += " and ";
	if (p.Mother) { 
		html += "<a href='http://www.wikitree.com/wiki/"+p.Parents[ p.Mother ].Name+"' target='_new'>"+p.Parents[p.Mother].FirstName+" "+p.Parents[p.Mother].LastNameCurrent+"</a>";
	} else { 
		html += "[mother]";
	}
	html += "<br />";


	if (p.Children) { 
		if (p.Gender == 'Male') { html += "Father"; } else if (p.Gender == 'Female') { html += "Mother"; } else { html += 'Parent'; } 
		html += " of ";
		var tmp = '';
		for (cid in p.Children) { 
			tmp += "<a href='http://www.wikitree.com/wiki/"+p.Children[cid].Name+"' target='_new'>"+p.Children[cid].FirstName+" "+p.Children[cid].LastNameCurrent+"</a>";
			tmp += ", ";
		}
		tmp = tmp.replace(/, $/, '');
		html += tmp;
		html += "<br />";
	}

	if (p.Spouses) { 
		html += " Spouses: ";
		var tmp = '';
		for (sid in p.Spouses) { 
			tmp += "<a href='http://www.wikitree.com/wiki/"+p.Spouses[sid].Name+"' target='_new'>"+p.Spouses[sid].FirstName+" "+p.Spouses[sid].LastNameCurrent+"</a>";
			tmp += ", ";
		}
		tmp = tmp.replace(/, $/, '');
		html += tmp;
		html += "<br />";
	}

	return html;
}

function zoom() {
	var scale = d3.event.scale,
	    translation = d3.event.translate;

	console.log("zoom translation = "+translation + ", scale = "+scale);

	d3.select(".drawarea").attr("transform", "translate(" + translation + ")scale(" + scale + ")");
	d3.tree_scale = scale;
	d3.tree_center = translation;
}

TreeDisplay.prototype.maxAhnentafel = function() { 
	var max_ahnentafel = 1;
	for (i in this.nodes ) { 
		console.log("i="+i+", a = "+this.nodes[i].ahnentafel);
		if (this.nodes[i].ahnentafel > max_ahnentafel) { max_ahnentafel = this.nodes[i].ahnentafel; }
	}
	return max_ahnentafel;
}
TreeDisplay.prototype.maxGeneration = function() { 
	var max_ahnentafel = this.maxAhnentafel();
	var max_generation = parseInt( Math.log( max_ahnentafel ) / Math.log(2) );
	return max_generation;
}

TreeDisplay.prototype.pathFunction = function (d,i) {
	// "elbow"
	
	// this doesn't know about "this" from Tree Display to get the margin....
	var right = 10;

	return "M" + d.source.y + "," + d.source.x
       	+ "H" + d.target.y + "V" + d.target.x
       	+ (d.target.children ? "" : "h" + right);
};



// Define an "elbow" path control for right-angled lines between nodes
function elbow(d, i) {
	return "M" + d.source.y + "," + d.source.x
       	+ "H" + d.target.y + "V" + d.target.x
       	+ (d.target.children ? "" : "h" + this.margin.right);
}

function parentlink(e) {
	console.log('parentlink:'+e.id);
}

