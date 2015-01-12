/*
 * wikitree-dynamic-tree.js
 *
 * Display a "dynamic" family tree with information about a person's ancestors.
 *
 * This program uses the wikitree-javascript-sdk to query the API functions at wikitree.com and
 * gather profile data for the starting WikiTree ID and their ancestors. 
 *
 * The tree is then drawn using the D3.js library for Data-Driven documents.
 *
 * This beta gathers three generations and displays the tree with name, birth date, death date, and
 * a male/female icon. An anchor box can be hovered to display additional profile information (parents, 
 * birth location, etc). The display can be zoomed in and out (mouse wheel or </>) and panned around (click+drag or arrow keys). 
 *
 * This code is essentially functional, but the display is significantly lacking, and it also needs to have a way to dynamically grow
 * the displayed tree instead of just restarting at new ancestors.  The D3.js library is powerful and does a lot of drawing for us,
 * but in the end may be too cumbersome to be worth it. Perhaps drawing with just positioned HTML divs would make more sense.
 *
 *  Brian Casey
 *  Root Level Services, LLC
 *  brian@wikitree.com
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
	if (opts.statusId) { this.statusId = opts.statusId; }

	this.margin = { top: 10, right: 10, bottom: 10, left: 10 };
	if (opts.margin) { this.margin = opts.margin; }

	// Node dimensions
	this.node_width  = 400; 
	this.node_height =  140;
	this.node_buffer =  0;
	if (opts.node_width)  { this.node_width = opts.node_width; }
	if (opts.node_height) { this.node_height = opts.node_height; }

	// Default/starting width of our canvas is the container pane size less the margins.
	// These get edited when we draw the tree based on the nodes we have.
   	this.width  = this.pane.width()  - this.margin.left - this.margin.right;
   	this.height = this.pane.height() - this.margin.top  - this.margin.bottom;

	/* Internally defined references, etc. */
   	
	// Define the data fields we want for profiles from the API.
	//this.fields = 'Id,Name,FirstName,MiddleName,RealName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Father,Mother';
	this.fields = '*';

	// Start with an empty hash of nodes and an empty store of tree node/profile data.
	this.profileById = {};
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

	// Say we're working, until we're done.
	self.setWorking('Working...');

	// Get the root profile and ancestors.
	var p = new wikitree.Person( { user_id: this.rootId } );
	p.load( { fields: this.fields} ).then(function(data){ 

		$.ajax({
			url: '/api.php',
			type: 'POST',
			crossDomain: true,
			xhrFields: { withCredentials: true },
			dataType: 'json',
			data: { 'action': 'getAncestors', 'key': p.Id, 'depth': 5, 'format': 'json' },
			success: function(data) { 
				for (i in data[0].ancestors) { 
					self.profileById[ data[0].ancestors[i].Id ] = data[0].ancestors[i];
				}
				self.rootNode = p;
				self.drawTree();
				self.setWorking(false);
			},
			error: function(xhr, status) { 
				self.rootNode = {};
				self.nodes = false;
				self.setWorking(false);
			}
		});

	}); 

};

/* This just sets the HTML in a status div to alert the viewer to some info. */
TreeDisplay.prototype.setWorking = function (working) { 
	if (this.statusId) { 
		if (working) { 
			$(this.statusId).html(working);
		} else { 
			$(this.statusId).html("");
		}
	}
}

// (Re)Draw the tree data into the SVG canvas. 
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
	// These are always a click behind because we don't reparse our nodes from a click until below...	
	// Ugly.
	// Now we just load a set number of generations from the start, and don't add more.
	// Find a better way to actually grow this tree...
	var max_generation = self.maxGeneration();
	if (max_generation < 2) { max_generation = 2; }

   	//var min_width = self.pane.width()   - self.margin.left - self.margin.right;
   	//var min_height = self.pane.height() - self.margin.top  - self.margin.bottom;
   	var min_width  = self.node_width  + 100;
   	var min_height = self.node_height + 100;

	//self.width  = (max_generation + 1) * (self.node_width + self.node_buffer) + 100;
	//self.height = Math.pow((max_generation + 1), 2) * (self.node_height + self.node_buffer) + 100;
	self.height = (max_generation + 1) * (self.node_height + self.node_buffer+100) + 100;
	self.width  = Math.pow((max_generation + 1), 2) * (self.node_width + self.node_buffer) + 100;

	if (self.width  < min_width)  { self.width  = min_width; }
	if (self.height < min_height) { self.height = min_height; }

	// Do initial D3 layout into a tree object.
	var tree = d3.layout.tree()
		.separation(function(a, b) { return a.parent === b.parent ? 1.0 : 1.0; })
    		.children(function(d) { 
				return self.getParents(d);
			})
    		.size([this.width, this.height]);

	// (Re)Parse our wikitree profiles into d3.tree nodes, recalculating the positions of each node and connecting line
	this.nodes = tree.nodes( this.rootNode );

	// Set our initial scale and center if we don't have it.
	if (!d3.tree_scale) { 
		d3.tree_scale = 0.50;
	}
	if (!d3.tree_center) { 
		var n = this.nodes[0];
		d3.tree_center = [ (-n.x * d3.tree_scale + this.pane.width() / 2), 100 ];
	}

	// Add an SVG object to our display window (https://github.com/mbostock/d3/wiki/SVG-Shapes).
	// Set the svg space to be as wide as the Tree's width.
	// Add a single group element to our SVG element to hold our nodes.
	d3.select("svg").remove();
	var svg = d3.select(this.paneId).append("svg")
		.attr("width",  this.width  + this.margin.left + this.margin.right  + (this.node_width  + this.node_buffer) )
		.attr("height", this.height + this.margin.top  + this.margin.bottom + (this.node_height + this.node_buffer) )
		.append("g")
			.attr("class", "drawarea")
			.attr("transform", "translate(" + d3.tree_center + ")scale(" + d3.tree_scale + ")")
		.append("g")
			.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
	;

	var max_generation = self.maxGeneration();

	// Define the links between our elements. Each one has a CSS class of "link".
	// The path is defined by our "elbow" function.

	// Stroke width 3 at min scale of 0.5 and 1 at scales 1 or greater
	// These lines don't work well at some scales... need a connector of a set pixel size instead? 
	var stroke_width = 2;
	if (d3.tree_scale < 0.75) { stroke_width = 3; }
	if (d3.tree_scale < 0.65) { stroke_width = 4; }
	if (d3.tree_scale < 0.45) { stroke_width = 5; }

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
		.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })


	// *** 
	// * Each node is drawn with a name, lifespan, and location as SVG text elements. 
	// * We shift these elements about and apply CSS styles to control the appearance.
	// ***

	// *** 
	// * Render each node with HTML inside the SVG as a foreign object.
	// *** 
	node.append("foreignObject")
		.attr('width',self.node_width)
		.attr('height',self.node_height)
		.attr("x", -(self.node_width/2))
		.attr("y", 0)
		.append("xhtml:body")
		.html(function(d){ return nodeHTML(d); })
	;

	// Define some mouse-over / click behavior
	// Here if we hover the anchor we've put into the nodes we want to display extra information
	$('.hoverAnchor').mouseover( function(e) { treeDisplay.nodeHover(e, $(this)); } );

	/*
	node.on("click", function(d){ 

		var mousePosition = d3.mouse(this);
		console.log("mouse click on node id="+d.Id+" mousePos:"+mousePosition);
		var nodePosition = $(this).position();
		console.log("nodePosition: "+nodePosition.left+","+nodePosition.top);
		d3.tree_center_node = d.Id;

		console.log('Node id#'+d.Id+' - '+d.Name);
		console.log("self.infoId: "+self.infoId);
		if (self.infoId) { 
			//var p = new wikitree.Person( {user_id: d.Id} );
			//p.load({fields: '*'}).then(function(d){ 
			//	var html = infoHTML( p );
			//	$(self.infoId).html(html);
			//});

			var html = infoHTML( d );
			$(self.infoId).html(html);
		}

	}); // End node.on("click")
	*/

	// This seems to only trigger on the node edges themselves. Anything inside (like our div containing person info) does _not_ trigger the hover...
	/*
	node.on("mouseover", function(d) { 
		var mousePosition = d3.mouse(this);
		var nodePosition = $(this).position();
		console.log("mouse over on node id="+d.Id+" mousePos:"+mousePosition);
		console.log("nodePosition: "+nodePosition.left+","+nodePosition.top);

		var pageX = d3.event.pageX;
		var pageY = d3.event.pageY;
		console.log("pageX = "+pageX+", pageY="+pageY);

		var html = "<div class='inner'>This is a hover on an item</div>";
		var hover_left = pageX + 50;
		var hover_top  = pageY;
		$('#nodeHover').html(html)
			.css('top',hover_top+"px")
			.css('left',hover_left+"px")
			.click(function(){ $('#nodeHover').hide(100); })
			.show()
		;
	}); // End node.on("mouseover")
	*/


	/*
	node.on("mouseout", function(d) { 
		$('#nodeHover').hide(50);
	}); // End node.on("mouseout")
	*/

	// Catch key-down events in the window so we can translate them into pan/zoom actions.
	d3.select(window).on('keydown', function(event){ keydown(); } );

	self.svg = svg;

	// Add zoom/pan behavior, starting at our current location and zoom
	d3.select("svg").call(d3.behavior.zoom().scale(d3.tree_scale).scaleExtent([0.1,2]).translate(d3.tree_center).on("zoom", zoom));
};

// Return the parents for the tree.layout().children() nodes
TreeDisplay.prototype.getParents = function (d) {
	var parents = new Array;
	if (d.Father && this.profileById[d.Father]) { parents.push( this.profileById[d.Father] ); }
	if (d.Mother && this.profileById[d.Mother]) { parents.push( this.profileById[d.Mother] ); }
	return parents;
}


// Handle a key-down event from the D3 window
function keydown() { 
	var scale = d3.tree_scale;
	var translation = d3.tree_center;

	var redraw = 0;
	switch (d3.event.keyCode) {
		case 13: // return
			break;

		case 37: // Left
			translation[0] = parseInt(translation[0]) -10;
			redraw = 1;
			break;

		case 38: // Up
			translation[1] = parseInt(translation[1]) -10;
			redraw = 1;
			break;

		case 39: // Right
			translation[0] = parseInt(translation[0]) +10;
			redraw = 1;
			break;

		case 40: // Down
			translation[1] = parseInt(translation[1]) +10;
			redraw = 1;
			break;

		case 188: // <
			var oldScale = scale;
			scale -= 0.01;
			translation[0] = parseInt(translation[0]) * (scale / oldScale);
			translation[1] = parseInt(translation[1]) * (scale / oldScale);
			redraw = 1;
			break;

		case 190: { // >
			var oldScale = scale;
			scale += 0.01;
			translation[0] = parseInt(translation[0]) * (scale / oldScale);
			translation[1] = parseInt(translation[1]) * (scale / oldScale);
			redraw = 1;
			break;
		}

	}

	if (redraw) { 
		d3.select(".drawarea").attr("transform", "translate(" + translation + ")scale(" + scale + ")");
		d3.tree_scale = scale;
		d3.tree_center = translation;
		$('#status').html('Scale='+parseFloat(scale).toFixed(2)+', Translation='+parseInt(translation[0])+', '+parseInt(translation[1]));
		treeDisplay.nodeHoverOff();

		treeDisplay.drawTree();
		d3.event.preventDefault();
	}
}

// Build the HTML div for a node display of a particular profile.
// <div id='##' class='node'>
// 		<div class='name'>Real Middle Last</div>
// 		<div class='dates'>...</div>
// 		<div class='clear'><br /></div>
// </div>
function nodeHTML(d) { 
	var html = "";

	var c = "node ";
	if (d.Gender == 'Male') { c += "genderMale"; } else if (d.Gender == 'Female') { c += "genderFemale"; }
	html += "<div id='node_"+d.Id+"' class='"+c+"'>";

	html += "<div class='nodeImage'>";
	if (d.PhotoData) { 
		html += "<img src=\""+d.PhotoData.url+"\" width=\""+d.PhotoData.width+"\" height=\""+d.PhotoData.height+"\" />"
	} else { 
		if (d.Gender == 'Male') { 
			html += "<img src=\"/images/icons/male.gif\" width=\"75\">";
		}
		else if (d.Gender == 'Female') { 
			html += "<img src=\"/images/icons/female.gif\" width=\"75\">";
		}
		else { 
			html += "<img src=\"/images/icons/unknown.gif\" width=\"75\">";
		}
	}
	html += "</div>";

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

	html += "<div class='clear'></div>";
	html += "<div class='hoverAnchor' id='hoverAnchor_"+d.Id+"'></div>";
	html += "<div class='clear'></div>";

	html += "</div>";

	return html;

}


// This function displays the "hover box" that comes up with extra information about 
// a particular profile node. The contents come from the infoHTML() function, which works with the
// profile data grabbed from the cache this.profileById[]. Positioning of this box is a bit tricky.
// The offsets are thrown off if the starting (hidden) div with id='nodeHover' is inside other divs used
// to build the page. This function assumes that div (see index.php) is outside all of that, and just inside
// the HTML <body> tags. 
TreeDisplay.prototype.nodeHover = function(e, item) { 
	// Translate the DOM item id into a profile id
	var x = item.attr('id');
	var id = x.replace('hoverAnchor_', '');

	// Get the Profile data, and then build the HTML for the hover box from that.
	var p = this.profileById[id];
	var html = this.infoHTML(p);

	// Pop-up our hover box at the same position as the triggering item
	//var mouse_left = e.pageX;
	//var mouse_top = e.pageY;
	var hover_left = item.offset().left;
	var hover_top  = item.offset().top;

	$('#nodeHover').html(html)
			.css('position', 'absolute')
			.css('left',hover_left+"px")
			.css('top',hover_top+"px")
			.css('margin', '0px')
			.click(function(){ $('#nodeHover').hide(100); })
			.show(100)
	;
}

// To turn off the hover box, just hide it. We don't care about its position or content.
TreeDisplay.prototype.nodeHoverOff = function() { 
	$('#nodeHover').hide(100);
}


TreeDisplay.prototype.infoHTML = function(p) { 
	/*
	var html = $('#infoHTML_template').html();
	for (var k in p) { 
		var re = new RegExp("#"+k+"#","g");
		html = html.replace(re, p[k]);
	}
	*/

	var html = "";

	html += "<span style='float:right;' onClick=\"treeDisplay.nodeHoverOff();\">X</span>";
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
		//html += "<a href='http://www.wikitree.com/wiki/"+p.Parents[ p.Father ].Name+"' target='_new'>"+p.Parents[p.Father].FirstName+" "+p.Parents[p.Father].LastNameCurrent+"</a>";
		html += "Father: "+p.Father+"<br>\n";
	} else { 
		html += "[father]";
	}
	html += " and ";
	if (p.Mother) { 
		//html += "<a href='http://www.wikitree.com/wiki/"+p.Parents[ p.Mother ].Name+"' target='_new'>"+p.Parents[p.Mother].FirstName+" "+p.Parents[p.Mother].LastNameCurrent+"</a>";
		html += "Mother: "+p.Mother+"<br>\n";
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
	var scale = d3.event.scale;
	var translation = d3.event.translate;

	d3.select(".drawarea").attr("transform", "translate(" + translation + ")scale(" + scale + ")");
	d3.tree_scale = scale;
	d3.tree_center = translation;

	$('#status').html('Scale='+parseFloat(scale).toFixed(2)+', Translation='+parseInt(translation[0])+', '+parseInt(translation[1]));
	treeDisplay.nodeHoverOff();
}

TreeDisplay.prototype.maxGeneration = function() { 
	return 5;
}

TreeDisplay.prototype.pathFunction = function (d,i) {
	// "elbow"
	// https://www.dashingd3js.com/svg-paths-and-d3js
	// M(m) = put pen down at (m)
	// H(h) = Horizontal line to (h)
	// V(v) = Vertical line to (v)
	// h(j) = relative horziontal line to j

	var path = "M" + d.source.x + "," + d.source.y
		 + "V" + (d.source.y + (d.target.y-d.source.y)/2)
       		 + "H" + d.target.x 
		 + "V" + d.target.y
	;
 
	return path;
}
