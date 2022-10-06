/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Fan Chart uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 * There is a Button Bar TABLE at the top of the container, then the SVG graphic is below that.
 * The Button Bar does not resize, but has clickable elements, which set global variables in the FanChartView, then calls a redraw
 */
(function(){

	var originOffsetX = 500,
		originOffsetY = 300,
		boxWidth = 200,
		boxHeight = 50,
		nodeWidth = boxWidth * 1.5,
		nodeHeight = boxHeight * 2;

		
		/**
		 * Constructor
		 */
		var FanChartView = window.FanChartView = function(selector, startId){
			// console.log("FanChartView.js - line:18") ;
			var container = document.querySelector(selector),
			width = container.offsetWidth,
			height = container.offsetHeight;
			
			var self = this;
			

		// Setup zoom and pan
		var zoom = d3.behavior.zoom()
			.scaleExtent([.1,1])
			.on('zoom', function(){
				svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
			})
			// Offset so that first pan and zoom does not jump back to the origin
			.translate([originOffsetX, originOffsetY]);

		// Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version
		var btnBarHTML = 
			'<table border=0 width="100%"><tr>' +    
				'<td width="30%"><A onclick="FanChartView.maxAngle = 360; FanChartView.redraw();">360˚</A> | <A onclick="FanChartView.maxAngle = 240; FanChartView.redraw();">240˚</A> | <A onclick="FanChartView.maxAngle = 180; FanChartView.redraw();">180˚</A></td>' +
				'<td width="5%">&nbsp;</td>'  +
				'<td width="30%" align="center">-1 [ 3 gens ] +1</td>' +
				'<td width="5%">&nbsp;</td>' +
				'<td width="30%" align="right"> &#x1F4BE; | <font size=+2>&#x2699;</font></td>' +
			'</tr></table>';

		// Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
		container.innerHTML = btnBarHTML;
		// console.log("adding Button Bar HTML");
		// CREATE the SVG object (which will be placed immediately under the button bar)
		var svg = d3.select(container).append('svg')
			.attr('width', width)
			.attr('height', height)
			.call(zoom)
			.append('g')
			// Left padding of tree; TODO: find a better way
			.attr("transform", "translate(" + originOffsetX + "," + originOffsetY + ")");    
		
		// console.log("creating SVG object and setting up ancestor tree object")
		// Setup controllers for the ancestor tree which will be displayed as the Fan Chart
		self.ancestorTree = new AncestorTree(svg);
		
		// Listen to tree events
		self.ancestorTree.expand(function(person){	
			// console.log("line:66 - self.ancestorTre.expand")		;
			return self.loadMore(person);
		});

		
		// Setup pattern
		svg.append('defs')
			.append('pattern')
			.attr({
				id: 'loader',
				width: 20,
				height: 20
			})
			.append('image')
			.attr({
				width: 20,
				height: 20,
				//'xlink:href': 'ringLoader.svg'
			});
		
		self.load(startId);

	};

	// STATIC VARIABLES --> USED to store variables used to customize the current display of the Fan Chart

	/** Static variable to hold unique ids for private persons **/
	FanChartView.nextPrivateId = -1;
	
	/** Static variable to hold the Maximum Angle for the Fan Chart (360 full circle / 240 partial / 180 semicircle)   **/
	FanChartView.maxAngle = 240;

	/** Static variable to hold the NumberOfGenerations to display  */
	FanChartView.numGens2Display = 3;

	/** FUNCTION used to force a redraw of the Fan Chart, used when called from Button Bar after a parameter has been changed */
	FanChartView.redraw = function () {
		// console.log("FanChartView.redraw");
		FanChartView.myAncestorTree.draw();
	}

	/**
	 * Load and display a person
	 */
	FanChartView.prototype.load = function(id){
		// console.log("FanChartView.prototype.load");
		var self = this;
		self._load(id).then(function(person){
			// console.log("FanChartView.prototype.load : self._load(id) ");
			person._data.AhnNum = 1;
			
			if(person.children && person.children.length > 0){
				for (let index = 0; index <  person.children.length; index++) {	
					// console.log(".load person Child # " + index, person.children[index]);
					if(person.children[index]) {
						// Assign Ahnentafel #s to initial Father and Mother
						if(person.children[index]._data.Gender == "Male") {
							person.children[index]._data.AhnNum = 2;
						} else {
							person.children[index]._data.AhnNum = 3;
						}
					}
				}
			} else {
				// console.log("Did not go through KIDS loop: ", person, person.depth);
			}
			// console.log(".load person:",person);
			
			self.drawTree(person);
		});
	};
	
	/**
	 * Load more ancestors. Update existing data in place
	 */
	FanChartView.prototype.loadMore = function(oldPerson){
		var self = this;
		// console.log("loadMore - line:94", oldPerson) ;
		return self._load(oldPerson.getId()).then(function(newPerson){
			var mother = newPerson.getMother(),
					father = newPerson.getFather();

			if(mother){
				// console.log("mother:", mother);
				oldPerson.setMother(mother);
			}
			if(father){
				oldPerson.setFather(father);
			}
			oldPerson.setChildren(newPerson.getChildren());
			self.drawTree();
		});
	};

	
	/**
	 * Main WikiTree API call
	 * Uses a getPerson call initially, but, a getAncestors call would be more efficient - will switch to that shortly
	 * Testing username change ...
	 */
	FanChartView.prototype._load = function(id){
		// console.log("INITIAL _load - line:118", id) ;
		let thePersonObject =  WikiTreeAPI.getPerson(id, [
			'Id',
			'Derived.BirthName',
			'Derived.BirthNamePrivate',
			'FirstName',
			'MiddleInitial',
			'LastNameAtBirth',
			'LastNameCurrent',
			'BirthDate',
			'BirthLocation',
			'DeathDate',
			'DeathLocation',
			'Mother',
			'Father',
			'Children',
			'Parents',
			'Spouses',
			'Siblings',
			'Photo',
			'Name',
			'Gender',
			'Privacy'
		]);
		// console.log("_load PersonObj:",thePersonObject);
		return thePersonObject;
	};
	
	/**
	 * Draw/redraw the tree
	 */
	FanChartView.prototype.drawTree = function(data){
		// console.log("FanChartView.prototype.drawTree");
		if(data){
			// console.log("(FanChartView.prototype.drawTree WITH data !)");
			this.ancestorTree.data(data);
			// this.descendantTree.data(data);
		}
		this.ancestorTree.draw();
		// this.descendantTree.draw();
	}; 
	
	/**
	 * Shared code for drawing ancestors or descendants.
	 * `selector` is a class that will be applied to links
	 * and nodes so that they can be queried later when
	 * the tree is redrawn.
	 * `direction` is either 1 (forward) or -1 (backward).
	 */
	var Tree = function(svg, selector, direction){
		// console.log("Create TREE var");
		this.svg = svg;
		this.root = null;
		this.selector = selector;
		this.direction = typeof direction === 'undefined' ? 1 : direction;
		
		this._expand = function(){
			return $.Deferred().resolve().promise();
		};
		
		this.tree = d3.layout.tree()
			.nodeSize([nodeHeight, nodeWidth])
			.separation(function(){
				return 1;
			});
	};
	
	/**
	 * Set the `children` function for the tree
	 */
	Tree.prototype.children = function(fn){
		this.tree.children(fn);
		return this;
	};
	
	/**
	 * Set the root of the tree
	 */
	Tree.prototype.data = function(data){
		this.root = data;
		return this;
	};
	
	/**
	 * Set a function to be called when the tree is expanded.
	 * The function will be passed a person representing whose
	 * line needs to be expanded. The registered function
	 * should return a promise. When it's resolved the state
	 * will be updated.
	 */
	Tree.prototype.expand = function(fn){
		this._expand = fn;
		return this;
	};
	
	/**
	 * Draw/redraw the tree
	 */
	Tree.prototype.draw = function(){
		if(this.root){
			var nodes = this.tree.nodes(this.root),
					links = this.tree.links(nodes);    
			// this.drawLinks(links);
			this.drawNodes(nodes);
		} else {
			throw new Error('Missing root');
		}
		return this;
	};
	
	// REVISE THIS FUNCTION to instead of drawing connecting lines to draw the FAN CHART SHELL around the peeps
	/**
	 * Draw/redraw the connecting lines
	 */
	// Tree.prototype.drawLinks = function(links){
		
	// 	var self = this;
		
	// 	// Get a list of existing links
	// 	var link = this.svg.selectAll("path.link." + this.selector)
	// 			.data(links, function(link){
	// 				return link.target.getId();
	// 			});
		
	// 	// Add new links
	// 	link.enter().append("path")
	// 			.attr("class", "link " + this.selector);
		
	// 	// Remove old links
	// 	link.exit().remove();
		
	// 	// Update the paths
	// 	link.attr("d", function(d){
	// 		return self.elbow(d);
	// 	});
	// };
	
	/**
	 * Helper function for drawing straight connecting lines
	 * http://stackoverflow.com/a/10249720/879121
	 */
	Tree.prototype.elbow = function(d) {
		var dir = this.direction,
				sourceX = d.source.x,
				sourceY = dir * (d.source.y + (boxWidth / 2)),
				targetX = d.target.x,
				targetY = dir * (d.target.y - (boxWidth / 2));
				
		return "M" + sourceY + "," + sourceX
			+ "H" + (sourceY + (targetY-sourceY)/2)
			+ "V" + targetX 
			+ "H" + targetY;
	}
	
	/**
	 * Draw the person boxes.
	 */
	Tree.prototype.drawNodes = function(nodes){
		// console.log("Tree.prototpe.DRAW NODES");
		var self = this;
	 
		// Get a list of existing nodes
		var node = this.svg.selectAll("g.person." + this.selector)
				.data(nodes, function(person){
					return person.getId();
				});
		
		// Add new nodes
		var nodeEnter = node.enter()
				.append("g")
				.attr("class", "person " + this.selector);


		// Draw the person boxes
		nodeEnter.append('foreignObject')
			.attr({
				width: boxWidth,
				height: 0.01, // the foreignObject won't display in Firefox if it is 0 height
				x: -boxWidth / 2,
				y: -boxHeight / 2,
			})
			.style('overflow', 'visible') // so the name will wrap
			.append("xhtml:div")
			.html(person => {

				let borderColor = 'rgba(102, 204, 102, .5)';
				if (person.getGender() == 'Male') { borderColor = 'rgba(102, 102, 204, .5)'; }
				if (person.getGender() == 'Female') { borderColor = 'rgba(204, 102, 102, .5)'; }

				return `
				<div class="box" style="background-color: ${borderColor}">
					<div class="name">${getShortName(person)}</div>
					<div class="lifespan">${lifespan(person)}</div>
				</div>
				`;
			});
	
		// Show info popup on click
		nodeEnter.on('click', function(person){
			d3.event.stopPropagation();
			self.personPopup(person, d3.mouse(self.svg.node()));
		});
				
		// Draw the plus icons
		var expandable = node.filter(function(person){
			return !person.getChildren() && (person.getFatherId() || person.getMotherId());
		});
				
		// console.log("line:397 - self just before the DRAW PLUS command: ", self);
		self.drawPlus(expandable.data());
		FanChartView.myAncestorTree = self;

		// Remove old nodes
		node.exit().remove();
		
		// *****************************
		// *
		// * REAL MAGIC HAPPENS HERE !!! --> By adjusting the Position, we can use the underlying logic of the d3.js Tree to handle the icky stuff, and we just position the boxes using some logic and a generalized formula
		// *
		// *****************************
	
		// Position
		node.attr("transform", function(d) { 
			// NOTE:  This "transform" function is being cycled through by EVERY data point in the Tree
			// 			SO ... the logic has to work for not only the central dude(tte), but also anyone on the outer rim and all those in between
			//			The KEY behind ALL of these calculations is the Ahnentafel numbers for each person in the Tree
			//			Each person in the data collection has an .AhnNum numeric property assigned, which uniquely determines where their name plate should be displayed.

			// console.log("node.attr.transform  - line:324 (x,y) = ",d.x, d.y, d._data.Name);
			
			let thisRadius = 270;  // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY
			
			// Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
			let thisGenNum = Math.floor(Math.log2(d._data.AhnNum));
			// Calculate which position # (starting lower left and going clockwise around the fan chart) (0 is father's father's line, largest number is mother's mother's line)
			let thisPosNum = d._data.AhnNum - 2**thisGenNum;
			// Calculate how many positions there are in this current Ring of Relatives
			let numSpotsThisGen =  2**thisGenNum;

			// Placement Angle = the angle at which the person's name card should be placed. (in degrees, where 0 = facing due east, thus the starting point being 180, due west, with modifications)
			let placementAngle = 180 + (180 - FanChartView.maxAngle) / 2 +  (FanChartView.maxAngle / numSpotsThisGen) * (0.5 + thisPosNum);
			// Name Angle = the angle of rotation for the name card so that it is readable easily in the Fan Chart (intially, perpendicular to the spokes of the Fan Chart so that it appears horizontal-ish)
			let nameAngle = 90 + placementAngle;
			if (thisGenNum > 4) {
				// HOWEVER ... once we have Too Many cooks in the kitchen, we need to be more efficient with our space, so need to switch to a more vertical-ish approach, stand the name card on its end (now parallel to the spokes)
				nameAngle += 90;
				// AND ... if we go beyond the midpoint in this particular ring, we need to rotate it another 180 degrees so that we don't have to read upside down.  All name cards should be readable, facing inwards to the centre of the Fan Chart
				if (thisPosNum > numSpotsThisGen/2) {
					nameAngle += 180;
				}
			}

			// HERE we get to use some COOL TRIGONOMETRY to place the X,Y position of the name card using basically ( rCOS(ø), rSIN(ø) )  --> see that grade 11 trig math class paid off after all!!!
			let newX = thisGenNum * thisRadius * Math.cos(placementAngle * Math.PI / 180) ;
			let newY = thisGenNum * thisRadius * Math.sin(placementAngle * Math.PI / 180) ;
			// console.log("Place",d._data.Name,"AhnNum:" + d._data.AhnNum,"Gen:"+thisGenNum,"Pos:" + thisPosNum, FanChartView.maxAngle);

			// FINALLY ... we return the transformation statement back - the translation based on our Trig calculations, and the rotation based on the nameAngle
			return   "translate(" + newX + "," + (newY) + ")" + " "  + "rotate(" + nameAngle + ")" ;
			
		}); 
	};

	/**
	 * Add an plus icons (expand indicator)
	 * We add icons to the svg element
	 * so that it's not considered part of the person box.
	 * This makes styling and events easier, sometimes
	 * It means we have to keep it's position in sync
	 * with the person's box.
	 */
	Tree.prototype.drawPlus = function(persons){
		var self = this;
		
		var buttons = self.svg.selectAll('g.plus')
				.data(persons, function(person){
					return person.getId();
				});
		
		buttons.enter().append(drawPlus())
				.on('click', function(person){
					var plus = d3.select(this);
					var loader = self.svg.append('image')
						  .attr({
						    //'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
						    height: 16,
						    width: 16,
						    // transform: plus.attr('transform')
						  })
						  .attr("transform", function() {
						    var y = self.direction * (person.y + (boxWidth / 2) + 12);
						    return "translate(" + y + "," + (person.x - 8) + ")"; 
						  });
					plus.remove();
					self._expand(person).then(function(){
						loader.remove();
					});
				});
		
		buttons.attr("transform", function(person) {
					var y = self.direction * (person.y + (boxWidth / 2) + 20);
					return "translate(" + y + "," + person.x + ")"; 
				});
	};
	
	/**
	 * Show a popup for the person.
	 */
	Tree.prototype.personPopup = function(person, event){
		this.removePopups();
		
		var photoUrl = person.getPhotoUrl(75),
				treeUrl = window.location.pathname + '?id=' + person.getName();
				
		// Use generic gender photos if there is not profile photo available
		if(!photoUrl){
			if(person.getGender() === 'Male'){
				photoUrl = 'https://www.wikitree.com/images/icons/male.gif';
			} else {
				photoUrl = 'https://www.wikitree.com/images/icons/female.gif';
			}
		}

		var popup = this.svg.append('g')
				.attr('class', 'popup')
				.attr('transform', 'translate('+event[0]+','+event[1]+')');    

		let borderColor = 'rgba(102, 204, 102, .5)';
		if (person.getGender() == 'Male') { borderColor = 'rgba(102, 102, 204, .5)'; }
		if (person.getGender() == 'Female') { borderColor = 'rgba(204, 102, 102, .5)'; }

		popup.append('foreignObject')
			.attr({
				width: 400,
				height: 300,
			})
			.style('overflow', 'visible')
			.append('xhtml:div')
			.html(`
				<div class="popup-box" style="border-color: ${borderColor}">
					<div class="top-info">
						<div class="image-box"><img src="https://www.wikitree.com/${photoUrl}"></div>
						<div class="vital-info">
						  <div class="name">
						    <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${person.getDisplayName()}</a>
						    <span class="tree-links"><a onClick="newTree('${person.getName()}');" href="#"><img src="https://www.wikitree.com/images/icons/pedigree.gif" /></a></span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>

				</div>
			`);
				
		d3.select('#treeViewerContainer').on('click', function(){
			popup.remove();
		});
	};
	
	/**
	 * Remove all popups. It will also remove
	 * any popups displayed by other trees on the
	 * page which is what we want. If later we
	 * decide we don't want that then we can just
	 * add the selector class to each popup and
	 * select on it, like we do with nodes and links.
	 */
	Tree.prototype.removePopups = function(){
		d3.selectAll('.popup').remove();
	};
	
	/**
	 * Manage the ancestors tree
	 */
	var AncestorTree = function(svg){
		// console.log("var ANCESTOR TREE");
		Tree.call(this, svg, 'ancestor', 1);
		this.children(function(person){
			// console.log("Defining the CHILDREN for ", person._data.Name);
			var children = [],
					mother = person.getMother(),
					father = person.getFather();

			if(father){
				// Calculate the father's Ahnentafel Number and assign it to the AhnNum variable (a new property being added manually to each person in the data set)
				// A father's Ahnentafel number is 2 times the original person's Ahnentafel number
				father._data.AhnNum = 2 * person._data.AhnNum;
				children.push(father);
			}
			if(mother){
				// Calculate the mother's Ahnentafel Number and assign it to the AhnNum variable
				// A mother's Ahnentafel number is 1 more than the father's Ahnentafel number
				mother._data.AhnNum = 2 * person._data.AhnNum + 1;
				children.push(mother);
			}
			return children;
		});
	};
	
	// Inheritance
	AncestorTree.prototype = Object.create(Tree.prototype);
	
	
	
	/**
	 * Create an unattached svg group representing the plus sign
	 */
	function drawPlus(){
		return function(){
			var group = d3.select(document.createElementNS(d3.ns.prefix.svg, 'g'))
					.attr('class', 'plus');
					
			group.append('circle')
					.attr({
						cx: 0,
						cy: 0,
						r: 10
					});
					
			group.append('path')
					.attr('d', 'M0,5v-10M5,0h-10');
					
			return group.node();
		}
	};
	
	/**
	 * Generate a string representing this person's lifespan 0000 - 0000
	 */
	function lifespan(person){
		var birth = '', death = '';
		if (person.getBirthDate()) { birth = person.getBirthDate().substr(0,4); }
		if (person.getDeathDate()) { death = person.getDeathDate().substr(0,4); }

		var lifespan = '';
		if (birth && birth != '0000') { lifespan += birth; }
		lifespan += ' - ';
		if (death && death != '0000') { lifespan += death; }

		return lifespan;
	};
	
	/**
	 * Generate text that display when and where the person was born
	 */
	function birthString(person){
		var string = '',
				date = humanDate(person.getBirthDate()),
				place = person.getBirthLocation();

		return `B. ${date ? `<strong>${date}</strong>` : '[date unknown]'} ${place ? `in ${place}` : '[location unknown]'}.`
	};
	
	/**
	 * Generate text that display when and where the person died
	 */
	function deathString(person){
		var string = '',
				date = humanDate(person.getDeathDate()),
				place = person.getDeathLocation();

		return `D. ${date ? `<strong>${date}</strong>` : '[date unknown]'} ${place ? `in ${place}` : '[location unknown]'}.`;
	};
	
	var monthNames = [
		'Jan', 'Feb', 'Mar',
		'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep',
		'Oct', 'Nov', 'Dec'
	];
	
	/**
	 * Turn a wikitree formatted date into a humanreadable date
	 */
	function humanDate(dateString){
		if(dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)){
			var parts = dateString.split('-'),
					year = parseInt(parts[0], 10),
					month = parseInt(parts[1], 10),
					day = parseInt(parts[2], 10);
			if(year){
				if(month){
					if(day){
						return `${day} ${monthNames[month-1]} ${year}`;
					} else {
						return `${monthNames[month-1]} ${year}`;
					}
				} else {
					return year;
				}
			}
		} else {
			return dateString;
		}
	};

	/**
	 * Shorten the name if it will be too long to display in full.
	 */
	function getShortName(person) {
		const maxLength = 20;

		const birthName = person.getDisplayName();
		const middleInitialName = `${person._data.FirstName} ${person._data.MiddleInitial} ${person._data.LastNameAtBirth}`;
		const noMiddleInitialName = `${person._data.FirstName} ${person._data.LastNameAtBirth}`;

		if (birthName.length < maxLength) {
			return birthName;
		} else if (middleInitialName.length < maxLength) {
			return middleInitialName;
		} else if (noMiddleInitialName.length < maxLength) {
			return noMiddleInitialName;
		} else {
			return `${person._data.FirstName.substring(0,1)}. ${person._data.LastNameAtBirth}`;
		}

	}

	/**
	 * Sort by the birth year from earliest to latest.
	 */
	function sortByBirthDate(list) {
		list.sort((a, b) => {
			const aBirthYear = a._data.BirthDate.split('-')[0];
			const bBirthYear = b._data.BirthDate.split('-')[0];

			return aBirthYear - bBirthYear;
		});
	}

	

}());
