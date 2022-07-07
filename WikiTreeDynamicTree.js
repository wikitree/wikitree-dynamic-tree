/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 */
(function(){

	var originOffsetX = 500,
		originOffsetY = 300,
		boxWidth = 200,
		boxHeight = 50,
		halfBoxWidth = boxWidth / 2,
		halfBoxHeight = boxHeight / 2,
		nodeWidth = boxWidth * 1.5,
		nodeHeight = boxHeight * 3;

	const L = -1, R = 1;


	class Couple {
		constructor(relationId, a, b, focus) {
			this.rId = relationId;
			if (b === undefined) {
				if (a === undefined) {
					throw new Error('Attempting to create an empty couple');
				}
				b = a.getSpouse();
			}
			if (focus == L || focus == R) {
				this.focus = focus;
			} else {
				if (a) {
					this.focus = L;
				} else {
					this.focus = R;
				}
			}
			if ((focus == L && !a) || (focus == R && !b)) {
				console.error(`Internal ERROR: The focus of a couple cannot be undefined: a=${a}, b=${b}, focus=${focus}`);
			}

			if ( (a && a.isFemale() && b && !b.isFemale())
			  || (b && b.isMale() && a && !a.isMale()) ) {
				// Swap a and b
				this.a = b;
				this.b = a;
				this.focus = -this.focus;
			} else {
				this.a = a;
				this.b = b;
				this.focus = this.focus;
			}
			condLog(`new Couple: rId=${this.rId}, focus=${this.focus}, ${this.toString()}`, this.a, this.b)
		}

		getId() {
			return `${this.getSimpleId()}-${this.rId}`;
		}

		getSimpleId() {
			let aId = this.a ? this.a.getId() : '';
			let bId = this.b ? this.b.getId() : '';
			return `${aId}:${bId}`;
		}

		getInFocus() {
			if (this.focus == R) {
				return this.b;
			} else {
				return this.a;
			}
		}

		getNotInFocus() {
			if (this.focus == R) {
				return this.a;
			} else {
				return this.b;
			}
		}

		getJointChildren() {
			let fatherId = this.a ? this.a.getId() : undefined;
			let motherId = this.b ? this.b.getId() : undefined;
			let children = this.getInFocus().getChildren();
			let list = [];

			for (var i in children) {
				var child = children[i];
				if (child.getFatherId() == fatherId && child.getMotherId() == motherId) {
					list.push(child);
				}
			}
			return list;
		}

		isComplete() {
			return this.a && this.b;
		}

		hasAParent() {
			return (this.a && this.a.hasAParent()) || (this.b && this.b.hasAParent());
		}

		isAncestorExpandable() {
			return !this.children && this.hasAParent() &&
				((this.a && !this.a._data.Parents) || (this.b && !this.b._data.Parents));
		}

		isDescendentExpandable() {
			return !this.children && (this.a && !this.a.getChildren()) && (this.b && !this.b.getChildren());
		}

		setA(person) {
			this.a = person;
			return this;
		}

		setB(person) {
			this.b = person;
			return this;
		}

		setSpouse(person) {
			if (person.isMale()) {
				if (!this.a || this.b) {
					this.a = person;
				} else {
					this.b = person;
				}
			} else {
				if (!this.b || this.a) {
					this.b = person;
				} else {
					this.a = person;
				}
			}
			return this;
		}

		refreshPerson(newPerson) {
			let oldPerson = undefined;
			let oldSpouse = undefined;
			let side = undefined;
			let newId = newPerson.getId();
			if (this.a && this.a.getId() == newId) {
				oldPerson = this.a;
				oldSpouse = this.b;
				side = L;
			} else if (this.b && this.b.getId() == newId) {
				oldPerson = this.b;
				oldSpouse = this.a;
				side = R;
			}
			if (!oldPerson) {
				console.error(`Person ${newPerson.toString()} cannot be refreshed in couple Couple ${this.toString} - person not found`);
				return;
			}
			if (oldSpouse) {
				// Refresh the spouse data
				let newSpouse = newPerson.getSpouses()[oldSpouse.getId()];
				if (newSpouse) {
					oldSpouse.refreshFrom(newSpouse);
				} else {
					newSpouse = newPerson.getSpouse();
					console.error(`Couple ${this.toString} unexpectedly has a new spouse ${newSpouse}; was ${oldSpouse}`);
					if (side == L) {
						this.b = newSpouse;
					} else {
						this.a = newSpouse;
					}
				}
			}
			oldPerson.refreshFrom(newPerson);
		}

		removeAncestors() {
			if (this.a && this.a._data.Parents) delete this.a._data.Parents;
			if (this.b && this.b._data.Parents) delete this.b._data.Parents;
			if (this.children) delete this.children;
			return new Promise((resolve, reject) => {resolve(this);});
		}

		removeDescendents() {
			if (this.a && this.a._data.Children) delete this.a._data.Children;
			if (this.b && this.b._data.Children) delete this.b._data.Children;
			if (this.children) delete this.children;
			return new Promise((resolve, reject) => {resolve(this);});
		}

		toString() {
			return `${this.a ? this.a.toString() : 'none'} and ${this.b ? this.b.toString() : 'none'}`
		}
	}


	/**
	 * Constructor
	 */
	var WikiTreeDynamicTreeViewer = window.WikiTreeDynamicTreeViewer = function(selector, startId){

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

		var svg = d3.select(container).append('svg')
			.attr('width', width)
			.attr('height', height)
			.call(zoom)
			.append('g')
			// Left padding of tree; TODO: find a better way
			.attr("transform", "translate(" + originOffsetX + "," + originOffsetY + ")");

		// Setup controllers for the ancestor and descendant trees
		self.ancestorTree = new AncestorTree(svg);
		self.descendantTree = new DescendantTree(svg);

		// Listen to tree events
		self.ancestorTree.expand(function(couple){
			return self.loadMore(couple);
		});

		self.descendantTree.expand(function(couple){
			return self.loadMore(couple);
		});

		self.ancestorTree.contract(function(couple){
			return self.removeAncestors(couple);
		});

		self.descendantTree.contract(function(couple){
			return self.removeDescendents(couple);
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

		self.loadAndDraw(startId);

	};

	/** Static variable to hold unique ids for private persons **/
	WikiTreeDynamicTreeViewer.nextPrivateId = -1;

	/**
	 * Load and display a person and their spouse
	 */
	WikiTreeDynamicTreeViewer.prototype.loadAndDraw = function(id){
		condLog(`loadAndDraw(${id})`);
		var self = this;
		self.richLoad(id).then(function(person){
			condLog(`=======RICH_LOADed ${person.toString()}`, person);
			let aRoot = new Couple(0, person);
			let dRoot = new Couple(1, person);
			self.drawTree(aRoot, dRoot);
		});
	};

	/**
	 * Feth the given person's data via an API call, and make separate API calls
	 * for each of their parents, spouses, and children.  This is to ensure that
	 * the related people also 'enriched', i.e. each have parent, spouse and children
	 * collections (since they are absent if the person data was retrieved as part of
	 * a getPerson for another person ID).  We'll only call the API if we have not
	 * already retrieved the 'enriched' person in the past.
	 */
	WikiTreeDynamicTreeViewer.prototype.richLoad = function(id){
		var self = this;
		condLog(`=======RICH_LOAD ${id}`);
		return self._load(id).then(function(person){
			condLog(`=======RICH_LOAD _loaded ${person.toString()}`)
			return person;
		}).then(function(person){
			return self.loadRelated(person);
		});
	};

	WikiTreeDynamicTreeViewer.prototype.loadRelated = async function(person){
		var self = this;
		let loadPromises = [];
		condLog(`=======RICH_LOAD loadRelated for ${person.toString()}`)
		if (person._data.Spouses) {
			let col = person._data.Spouses;
			condLog(`Spouses`,col);
			for (let i in col) {
				loadPromises.push(self._load(col[i].getId()))
			}
		} else {
			console.error(`loadRelated called on Person ${person.toString()} without Spouses[]`, person)
		}
		if (person._data.Children) {
			let col = person._data.Children;
			condLog(`Children`,col);
			for (let i in col) {
				condLog(`_loadWithoutChildren ${col[i].toString()}`)
				loadPromises.push(self._loadWithoutChildren(col[i].getId()))
			}
		} else {
			console.error(`loadRelated called on Person ${person.toString()} without Children[]`, person)
		}
		const results = await Promise.all(loadPromises);
		for (let i in results) {
			let newPerson = results[i];
			let id = newPerson.getId();
			if (person._data.Spouses[id]) {
				condLog(`Setting as spouse ${newPerson.toString()}`);
				person._data.Spouses[id] = newPerson;
			}
			if (person._data.Children[id]) {
				condLog(`Setting as child ${newPerson.toString()}`);
				person._data.Children[id] = newPerson;
			}
		}
		return person;
	};

	/**
	 * Load more ancestors. Update existing data in place
	 */
	WikiTreeDynamicTreeViewer.prototype.loadMore = function(couple){
		var self = this;
		condLog(`loadMore for ${couple.toString()}`, couple)
		let oldPerson = couple.getInFocus();
		if (oldPerson && !oldPerson.isEnriched()) {
			return self.richLoad(oldPerson.getId()).then(function(newPerson){
				condLog(`=======RICH_LOADed (in loadMore) ${oldPerson.toString()}`, newPerson);
				// console.error('RICH_LOAD (in loadMore) completed'); // error just for better visibiity

				couple.refreshPerson(newPerson)

				condLog(`loadMore done for ${couple.toString()}`, couple)
				self.drawTree();
			});
		}
		console.error('Attempted to loadMore for non-enriched person', oldPerson);
		// what to return here?
	};

	WikiTreeDynamicTreeViewer.prototype.removeAncestors = function(couple){
		var self = this;
		condLog(`Removing Ancestors for ${couple.toString()}`, couple)
		return couple.removeAncestors().then(function(){
			self.drawTree();
		});
	};

	WikiTreeDynamicTreeViewer.prototype.removeDescendents = function(couple){
		var self = this;
		condLog(`Removing Descendents for ${couple.toString()}`, couple)
		return couple.removeDescendents().then(function(){
			self.drawTree();
		});
	};

	/**
	 * Main WikiTree API call
	 */
	WikiTreeDynamicTreeViewer.prototype._load = function(id){
		return WikiTreeAPI.getPerson(id).then(function(person){
			return person;
		});
	};

	WikiTreeDynamicTreeViewer.prototype._loadWithoutChildren = function(id){
		let fields = REQUIRED_FIELDS.filter(item => item != 'Children');
		return WikiTreeAPI.getPerson(id, fields).then(function(person){
			return person;
		});
	};

	/**
	 * Draw/redraw the tree
	 */
	WikiTreeDynamicTreeViewer.prototype.drawTree = function(ancestorRoot, descendentRoot){
		condLog('drawTree for:', ancestorRoot);
		if(ancestorRoot){
			this.ancestorTree.data(ancestorRoot);
		}
		if(descendentRoot){
			this.descendantTree.data(descendentRoot);
		}
		condLog('draw ancestorTree:', this.ancestorTree);
		this.ancestorTree.draw();
		condLog('draw descendantTree:', this.descendantTree);
		this.descendantTree.draw();
		condLog('drawTree done', this.ancestorTree, this.descendantTree)
	};

	/**
	 * Shared code for drawing ancestors or descendants.
	 * `selector` is a class that will be applied to links
	 * and nodes so that they can be queried later when
	 * the tree is redrawn.
	 * `direction` is either 1 (forward) or -1 (backward).
	 */
	var Tree = function(svg, selector, direction){
		this.svg = svg;
		this.root = null;
		this.selector = selector;
		this.direction = typeof direction === 'undefined' ? 1 : direction;

		this._expand = function(){
			return $.Deferred().resolve().promise();
		};

		this._contract = function(){
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
	 * The function will be passed a couple representing whose
	 * line needs to be expanded. The registered function
	 * should return a promise. When it's resolved the state
	 * will be updated.
	 */
	Tree.prototype.expand = function(fn){
		this._expand = fn;
		return this;
	};

	/**
	 * Same as above, but for contracting the tree (i.e. removing a branch)
	 */
	Tree.prototype.contract = function(fn){
		this._contract = fn;
		return this;
	};

	/**
	 * Draw/redraw the tree
	 */
	Tree.prototype.draw = function(){
		if(this.root){
			var nodes = this.tree.nodes(this.root),
					links = this.tree.links(nodes);
			this.drawLinks(links);
			this.drawNodes(nodes);
		} else {
			throw new Error('Missing root');
		}
		return this;
	};

	/**
	 * Draw/redraw the connecting lines
	 */
	Tree.prototype.drawLinks = function(links){

		var self = this;

		// Get a list of existing links
		var link = this.svg.selectAll("path.link." + this.selector)
				.data(links, function(link){
					return link.target.getId();
				});

		// Add new links
		link.enter().append("path")
				.attr("class", "link " + this.selector);

		// Remove old links
		link.exit().remove();

		// Update the paths
		link.attr("d", function(d){
			return self.elbow(d);
		});
	};

	/**
	 * Helper function for drawing angled connecting lines
	 * http://stackoverflow.com/a/10249720/879121
	 */
	Tree.prototype.elbow = function(d) {
		var dir = this.direction,
				offsetDir = dir < 0 ? 0 : (d.target.x - d.source.x > 0 ? 1 : -1);
				sourceX = d.source.x + offsetDir * halfBoxHeight,
				sourceY = dir * (d.source.y + halfBoxWidth),
				targetX = d.target.x,
				targetY = dir * (d.target.y - halfBoxWidth);

		return "M" + sourceY + "," + sourceX
			+ "H" + (sourceY + (targetY-sourceY)/2)
			+ "V" + targetX
			+ "H" + targetY;
	}

	/**
	 * Draw the person boxes.
	 */
	Tree.prototype.drawNodes = function(nodes){

		var self = this;

		// Get a list of existing nodes
		var node = this.svg.selectAll("g.person." + this.selector)
				.data(nodes, function(couple){
					return couple.getId();
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
				x: -halfBoxWidth,
				y: -boxHeight,
			})
			.style('overflow', 'visible') // so the name will wrap
			.append("xhtml:div")
			.html(couple => {
				return self.drawPerson(couple.a)
					.concat(self.drawPerson(couple.b));
			});

		// Show info popup on click
		nodeEnter.on('click', function(couple){
			d3.event.stopPropagation();
			self.personPopup(couple, d3.mouse(self.svg.node()), d3.mouse(this));
		});

		// Draw the plus icons
		var expandable = node.filter(function(couple){
			return !couple.children && (couple.isAncestorExpandable() || couple.isDescendentExpandable());
		});

		var contractable = node.filter(function(couple){
			return couple.children != undefined;
		});

		self.drawPlus(expandable.data(), this.selector);

		self.drawMinus(contractable.data(), this.selector);

		// Remove old nodes
		node.exit().remove();

		// Position
		node.attr("transform", function(d) { return "translate(" + (self.direction * d.y) + "," + d.x + ")"; });
	};

	Tree.prototype.drawPerson = function(person) {
		let borderColor = 'rgba(102, 204, 102, .5)';
		let name = '?'
		let lifeSpan = '? - ?'
		if (person) {
			if (person.isMale()) { borderColor = 'rgba(102, 102, 204, .5)'; }
			if (person.isFemale()) { borderColor = 'rgba(204, 102, 102, .5)'; }
			name = getShortName(person);
			lifeSpan = lifespan(person);
		}

		return `
			<div class="box" style="border-color: ${borderColor}">
				<div class="name">${name}</div>
				<div class="lifespan">${lifeSpan}</div>
			</div>
			`;
	}

	/**
	 * Add any plus icons (expand indicator)
	 * We add icons to the svg element
	 * so that it's not considered part of the person box.
	 * This makes styling and events easier, sometimes
	 * It means we have to keep it's position in sync
	 * with the person's box.
	 */
	Tree.prototype.drawPlus = function(couples, selector){
		var self = this;

		var buttons = self.svg.selectAll('g.plus.' + selector)
				.data(couples, function(couple){
					return couple.getId();
				});

		buttons.enter().append(drawPlus(selector))
				.on('click', function(couple){
					var plus = d3.select(this);
					var loader = self.svg.append('image')
						  .attr({
						    //'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
						    height: 16,
						    width: 16,
						    // transform: plus.attr('transform')
						  })
						  .attr("transform", function() {
						    var y = self.direction * (couple.y + halfBoxWidth + 12);
						    return "translate(" + y + "," + (couple.x - 8) + ")";
						  });
					plus.remove();
					self._expand(couple).then(function(){
						loader.remove();
					});
				});

		buttons.exit().remove();

		buttons.attr("transform", function(couple) {
					var y = self.direction * (couple.y + halfBoxWidth + 20);
					return "translate(" + y + "," + couple.x + ")";
				});

	};

	Tree.prototype.drawMinus = function(couples, selector){
		var self = this;

		var buttons = self.svg.selectAll('g.minus.' + selector)
				.data(couples, function(couple){
					return couple.getId();
				});

		buttons.enter().append(drawMinus(selector))
				.on('click', function(couple){
					var minus = d3.select(this);
					var loader = self.svg.append('image')
						  .attr({
						    //'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
						    height: 16,
						    width: 16,
						    // transform: minus.attr('transform')
						  })
						  .attr("transform", function() {
						    var y = self.direction * (couple.y + halfBoxWidth + 12);
						    return "translate(" + y + "," + (couple.x - 8) + ")";
						  });
					minus.remove();
					self._contract(couple).then(function(){
						loader.remove();
					});
				});

		buttons.exit().remove();

		buttons.attr("transform", function(couple) {
					var y = self.direction * (couple.y + halfBoxWidth + 20);
					return "translate(" + y + "," + couple.x + ")";
				});
	};

	/**
	 * Show a popup for the person.
	 */
	Tree.prototype.personPopup = function(couple, event, xyInCouple){
		this.removePopups();

		let person = undefined;
		if (xyInCouple[1] < 0) {
			person = couple.a;
		} else {
			person = couple.b;
		}
		if (!person || person.isNoSpouse) person = couple.getInFocus();

		var photoUrl = person.getPhotoUrl(75),
				treeUrl = window.location.pathname + '?id=' + person.getName();

		// Use generic gender photos if there is not profile photo available
		if(!photoUrl){
			if(person.getGender() === 'Male'){
				photoUrl = 'images/icons/male.gif';
			} else {
				photoUrl = 'images/icons/female.gif';
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
		Tree.call(this, svg, 'ancestor', 1);

		this.children(function(couple){
			condLog(`AncestorTree children for ${couple.toString()}`,couple)
			var children = [];
			if (couple.a) {
				let father = couple.a.getFather();
				let mother = couple.a.getMother();
				if(father || mother) {
					children.push(new Couple(couple.getSimpleId(), father, mother));
				}
			}
			if (couple.b) {
				let father = couple.b.getFather();
				let mother = couple.b.getMother();
				if(father || mother) {
					children.push(new Couple(couple.getSimpleId(), father, mother));
				}
			}
			condLog(`Returning AncestorTree children for ${couple.toString()}`, children)
			return children;
		});
	};

	// Inheritance
	AncestorTree.prototype = Object.create(Tree.prototype);

	/**
	 * Manage the descendants tree
	 */
	var DescendantTree = function(svg){
		Tree.call(this, svg, 'descendant', -1);

		this.children(function(couple){
			// Convert children map to an array of couples
			var children = couple.getJointChildren(),
					list = [];

			for(var i in children){
				let child = children[i];
				list.push(new Couple(couple.getSimpleId(), child));
			}

			sortByBirthDate(list);

			condLog(`Returning DescendantTree children for ${couple.toString()}`, list)
			return list;
		});
	};

	// Inheritance
	DescendantTree.prototype = Object.create(Tree.prototype);

	/**
	 * Create an unattached svg group representing the plus sign
	 */
	function drawPlus(selector){
		return function(){
			var group = d3.select(document.createElementNS(d3.ns.prefix.svg, 'g'))
					.attr('class', 'plus ' + selector);

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
	 * Create an unattached svg group representing the minus sign
	 */
	 function drawMinus(selector){
		return function(){
			var group = d3.select(document.createElementNS(d3.ns.prefix.svg, 'g'))
					.attr('class', 'minus ' + selector);

			group.append('circle')
					.attr({
						cx: 0,
						cy: 0,
						r: 10
					});

			group.append('path')
					.attr('d', 'M5,0h-10');

			return group.node();
		}
	};

	/**
	 * Generate a string representing this person's lifespan 0000 - 0000
	 */
	function lifespan(person){
		if (person.isNoSpouse) {
			return '-';
		}
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
		if (person.isNoSpouse) {
			return '';
		}
		const maxLength = 20;

		const birthName = person.getDisplayName();
		let names = birthName.split(' ').slice(0,-1);
		if (person._data.FirstName) {
			names = person._data.FirstName.split(' ');
		}
		const firstName = names[0];
		let middleInitials = person._data.MiddleInitial;
		if (middleInitials == '.') {
			if (names.length > 1) {
				middleInitials = names.slice(1).map(item => item.substring(0,1).toUpperCase()).join(' ');
			} else {
				middleInitials = '';
			}
		}
		const middleInitialName = `${firstName} ${middleInitials} ${person._data.LastNameAtBirth}`;
		const noMiddleInitialName = `${firstName} ${person._data.LastNameAtBirth}`;

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
	 * Sort a list of couples by the birth year of the in-focus person from earliest to latest.
	 */
	function sortByBirthDate(list) {
		list.sort((a, b) => {
			const aBirthYear = a.getInFocus()._data.BirthDate.split('-')[0];
			const bBirthYear = b.getInFocus()._data.BirthDate.split('-')[0];

			return aBirthYear - bBirthYear;
		});
	}


}());
