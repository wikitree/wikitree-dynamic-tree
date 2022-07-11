/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 */
(function () {

	let originOffsetX = 500,
		originOffsetY = 300,
		boxWidth = 200,
		boxHeight = 50,
		halfBoxWidth = boxWidth / 2,
		halfBoxHeight = boxHeight / 2,
		nodeWidth = boxWidth * 1.5,
		nodeHeight = boxHeight * 3;

	const L = -1, R = 1;
	const ANCESTORS = 1;
	const DESCENDANTS = -1;


	/**
	 * A Couple consists of two Persons that are either married, or are the parents of a child.
	 * One of them is 'in focus', i.e. is the person of main interest in an ancestor or descendant
	 * tree. A Couple may also consist of only a single Person if they do not have a (known) spouse.
	 */
	class Couple {
		constructor(id, a, b, focus) {
			this.id = id;
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

			// If a couple has a male partner, we want them to be in a.
			// Similarly we want a female partner to be in b, if present.
			if ((a && a.isFemale() && (!b || !b.isFemale()))
				|| (b && b.isMale() && (!a || !a.isMale()))) {
				// Swap a and b
				this.a = b;
				this.b = a;
				this.focus = -this.focus;
			} else {
				this.a = a;
				this.b = b;
				this.focus = this.focus;
			}
			condLog(`new Couple: id=${this.getId()}, focus=${this.focus}, ${this.toString()}`, this.a, this.b)
		}

		getId() {
			return this.id;
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
			let otherParent = this.getNotInFocus();
			let children = this.getInFocus().getChildren();
			let list = [];

			if (!otherParent || otherParent.isNoSpouse) {
				for (let i in children) {
					list.push(children[i]);
				}
			} else {
				for (let i in children) {
					let child = children[i];
					if (child.getFatherId() == fatherId && child.getMotherId() == motherId) {
						list.push(child);
					}
				}
			}
			return sortByBirthDate(list);
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

		isDescendantExpandable() {
			return !this.children && ((this.a && !this.a.getChildren()) || (this.b && !this.b.getChildren()));
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
				// Refresh the other person in this Couple only newPerson contains new data for them.
				// Note that the two people forming a Couple may not in fact be spouses of each other.
				let newSpouse = newPerson.getSpouse(oldSpouse.getId());
				if (newSpouse) {
					oldSpouse.refreshFrom(newSpouse);
				} else {
					condLog(`Couple ${this.toString()} spouse ${oldSpouse.toString()} is not a spouse of ${newPerson.toString()}`, newPerson);
				}
			}
			oldPerson.refreshFrom(newPerson);
		}

		removeAncestors() {
			if (this.a && this.a._data.Parents) delete this.a._data.Parents;
			if (this.b && this.b._data.Parents) delete this.b._data.Parents;
			if (this.children) delete this.children;
			return new Promise((resolve, reject) => { resolve(this); });
		}

		removeDescendants() {
			if (this.a && this.a._data.Children) delete this.a._data.Children;
			if (this.b && this.b._data.Children) delete this.b._data.Children;
			if (this.children) delete this.children;
			return new Promise((resolve, reject) => { resolve(this); });
		}

		toString() {
			return `${this.a ? this.a.toString() : 'none'} and ${this.b ? this.b.toString() : 'none'}`
		}
	}


	/**
	 * WikiTreeDynamicTreeViewer
	 */
	let WikiTreeDynamicTreeViewer = window.WikiTreeDynamicTreeViewer = class WikiTreeDynamicTreeViewer {
		constructor(selector, startId) {
			let container = document.querySelector(selector),
				width = container.offsetWidth,
				height = container.offsetHeight;

			let self = this;

			// Setup zoom and pan
			let zoom = d3.behavior.zoom()
				.scaleExtent([.1, 1])
				.on('zoom', function () {
					svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
				})
				// Offset so that first pan and zoom does not jump back to the origin
				.translate([originOffsetX, originOffsetY]);

			let svg = d3.select(container).append('svg')
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
			self.ancestorTree.expand(function (couple) {
				return self.loadMore(couple);
			});

			self.descendantTree.expand(function (couple) {
				return self.loadMore(couple);
			});

			self.ancestorTree.contract(function (couple) {
				return self.removeAncestors(couple);
			});

			self.descendantTree.contract(function (couple) {
				return self.removeDescendants(couple);
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

		/**
		 * Load and display a person and their spouse
		 */
		loadAndDraw(id) {
			condLog(`loadAndDraw(${id})`);
			let self = this;
			self.richLoad(id).then(function (person) {
				condLog(`=======RICH_LOADed ${person.toString()}`, person);
				let aRoot = new Couple('A', person);
				let dRoot = new Couple('D', person);
				self.drawTree(aRoot, dRoot);
			});
		};

		/**
		 * Fetch the given person's data via an API call, and make separate API calls
		 * for each of their spouses and children.  This is to ensure that those related
		 * people are also 'enriched', i.e. each have parent, spouse and children
		 * collections (since they are absent if the person data was retrieved as part of
		 * a getPerson for another person ID).  We'll only call the API if we have not
		 * already retrieved the 'enriched' person in the past.
		 *
		 * We do not have to make API calls for the parents as part of loadRelated since
		 * a parent will be richLoaded before they are expanded.
		 */
		 async richLoad(id) {
			condLog(`=======RICH_LOAD ${id}`);
			const person = await this.load(id);
			condLog(`=======RICH_LOAD _loaded ${person.toString()}`);
			return await this.loadRelated(person);
		};

		async loadRelated(person) {
			let loadPromises = [];
			condLog(`=======RICH_LOAD loadRelated for ${person.toString()}`)
			if (person._data.Spouses) {
				let collection = person._data.Spouses;
				condLog(`Spouses`, collection);
				for (let i in collection) {
					loadPromises.push(this.load(collection[i].getId()));
					loadPromises.push(this.load(collection[i].getId()));
				}
			} else {
				condLog(`loadRelated called on Person ${person.toString()} without Spouses[]`, person)
			}
			if (person._data.Children) {
				let collection = person._data.Children;
				condLog(`Children`, collection);
				for (let i in collection) {
					condLog(`loadWithoutChildren ${collection[i].toString()}`)
					loadPromises.push(this.loadWithoutChildren(collection[i].getId()));
				}
			} else {
				condLog(`loadRelated called on Person ${person.toString()} without Children[]`, person)
			}
			const results = await Promise.all(loadPromises);
			for (let i in results) {
				let newPerson = results[i];
				let id = newPerson.getId();
				if (person._data.Spouses && person._data.Spouses[id]) {
					condLog(`Setting as spouse ${newPerson.toString()}`);
					person._data.Spouses[id] = newPerson;
				} else if (person._data.Children && person._data.Children[id]) {
					condLog(`Setting as child ${newPerson.toString()}`);
					person._data.Children[id] = newPerson;
				} else {
					console.error(`loadRelated ${person.toString()} Promises resolved for neither spouse nor child`, newPerson);
				}
			}
			return person;
		};

		/**
		 * Load more ancestors. Update existing data in place
		 */
		loadMore(couple) {
			let self = this;
			condLog(`loadMore for ${couple.toString()}`, couple)
			let oldPerson = couple.getInFocus();
			let oldSpouse = couple.getNotInFocus();
			let oldSpouseId = oldSpouse && !oldSpouse.isNoSpouse ? oldSpouse.getId() : undefined;
			if (oldPerson && !oldPerson.isEnriched()) {
				return self.richLoad(oldPerson.getId()).then(function (newPerson) {
					condLog(`=======RICH_LOADed (in loadMore) ${oldPerson.toString()} getting ${newPerson.toString()}`, newPerson);
					couple.refreshPerson(newPerson);
					return newPerson;
				}).then(function (newPerson) {
					condLog(`=======RICH_LOADed (in loadMore) refreshed ${newPerson.toString()}`, newPerson);
					let newSpouses = newPerson.getSpouses();
					if (oldSpouseId && (!newSpouses || !newSpouses[oldSpouseId])) {
						// the couple partner has not been updated, so we better do that
						condLog(`Rich loading spouse ${oldSpouse.toString()}`)
						return self.richLoad(oldSpouseId).then(function (newSpouse) {
							condLog(`=======RICH_LOADed (in loadMore) refreshed spouse ${newPerson.toString()}`, newPerson);
							couple.refreshPerson(newSpouse);
						});
					}
					condLog('Spouse already refreshed')
				}).then(function () {
					condLog(`loadMore done for ${couple.toString()}`, couple)
					self.drawTree();
				});
			}
			console.error('Attempted to loadMore for non-enriched person', oldPerson);
			// what to return here?
		};

		removeAncestors(couple) {
			let self = this;
			condLog(`Removing Ancestors for ${couple.toString()}`, couple)
			return couple.removeAncestors().then(function () {
				self.drawTree();
			});
		};

		removeDescendants(couple) {
			let self = this;
			condLog(`Removing Descendants for ${couple.toString()}`, couple)
			return couple.removeDescendants().then(function () {
				self.drawTree();
			});
		};

		/**
		 * Main WikiTree API call
		 */
		async load(id) {
			return await WikiTreeAPI.getPerson(id);
		};

		static REQUIRED_FIELDS_NO_CHILDREN = REQUIRED_FIELDS.filter(item => item != 'Children');

		async loadWithoutChildren(id) {
			return await WikiTreeAPI.getPerson(id, WikiTreeDynamicTreeViewer.REQUIRED_FIELDS_NO_CHILDREN);
		};

		/**
		 * Draw/redraw the tree
		 */
		drawTree(ancestorRoot, descendantRoot) {
			condLog('drawTree for:', ancestorRoot);
			if (ancestorRoot) {
				this.ancestorTree.data(ancestorRoot);
			}
			if (descendantRoot) {
				this.descendantTree.data(descendantRoot);
			}
			condLog('draw ancestorTree:', this.ancestorTree);
			this.ancestorTree.draw();
			condLog('draw descendantTree:', this.descendantTree);
			this.descendantTree.draw();
			condLog('drawTree done', this.ancestorTree, this.descendantTree)
		};
	}


	/**
	 * Shared code for drawing ancestors or descendants.
	 * `selector` is a class that will be applied to links
	 * and nodes so that they can be queried later when
	 * the tree is redrawn.
	 * `direction` is either 1 (forward, i.e. ancestors) or
	 * -1 (backward, i.e. descendants).
	 */
	class Tree {
		constructor(svg, direction) {
			this.svg = svg;
			this.direction = direction != DESCENDANTS ? ANCESTORS : DESCENDANTS;
			this.selector = this.getSelector();
			this.root = null;

			this._expand = function () {
				return $.Deferred().resolve().promise();
			};

			this._contract = function () {
				return $.Deferred().resolve().promise();
			};

			this.tree = d3.layout.tree()
				.nodeSize([nodeHeight, nodeWidth])
				.separation(function () {
					return 1;
				});
		}
		/**
		 * @returns 'descendant' iff this is a descendent tree, otherwise returns 'ancestor'
		 */
		getSelector() {
			if (this.selector) {
				return this.selector;
			}
			this.selector = this.direction == DESCENDANTS ? 'descendant' : 'ancestor';
			return this.selector;
		}
		/**
		 * Set the `children` function for the tree
		 */
		children(fn) {
			this.tree.children(fn);
			return this;
		}
		/**
		 * Set the root of the tree
		 */
		data(data) {
			this.root = data;
			return this;
		}
		/**
		 * Set a function to be called when the tree is expanded.
		 * The function will be passed a Couple representing whose
		 * line needs to be expanded. The registered function
		 * should return a promise. When it's resolved, the state
		 * will be updated.
		 */
		expand(fn) {
			this._expand = fn;
			return this;
		}
		/**
		 * Same as above, but for contracting the tree (i.e. removing a branch)
		 */
		contract(fn) {
			this._contract = fn;
			return this;
		}
		/**
		 * Draw/redraw the tree
		 */
		draw() {
			if (this.root) {
				let nodes = this.tree.nodes(this.root), links = this.tree.links(nodes);
				this.drawLinks(links);
				this.drawNodes(nodes);
			} else {
				throw new Error('Missing root');
			}
			return this;
		}
		/**
		 * Draw/redraw the connecting lines
		 */
		drawLinks(links) {

			let self = this;

			// Get a list of existing links
			let link = this.svg.selectAll("path.link." + this.selector)
				.data(links, function (link) {
					return link.target.getId();
				});

			// Add new links
			link.enter().append("path")
				.attr("class", "link " + this.selector);

			// Remove old links
			link.exit().remove();

			// Update the paths
			link.attr("d", function (d) {
				return self.elbow(d);
			});
		}
		/**
		 * Helper function for drawing angled connecting lines
		 * http://stackoverflow.com/a/10249720/879121
		 */
		elbow(d) {
			let dir = this.direction, offsetDir = dir < 0 ? 0 : (d.target.x - d.source.x > 0 ? 1 : -1);
			let sourceX = d.source.x + offsetDir * halfBoxHeight,
				sourceY = dir * (d.source.y + halfBoxWidth),
				targetX = d.target.x,
				targetY = dir * (d.target.y - halfBoxWidth);

			// We flip x and y because we draw the tree "on its side", i.e from
			// left to right rather than from top to bottom which is what the
			// default coordinate system assumes
			return "M" + sourceY + "," + sourceX
				+ "H" + (sourceY + (targetY - sourceY) / 2)
				+ "V" + targetX
				+ "H" + targetY;
		}
		/**
		 * Draw the couple boxes.
		 */
		drawNodes(nodes) {
			let self = this;

			// Get a list of existing nodes
			let node = this.svg.selectAll("g.person." + this.selector)
				.data(nodes, function (couple) {
					return couple.getId();
				});

			// Add new nodes
			let nodeEnter = node.enter()
				.append("g")
				.attr("class", "person " + this.selector);

			// Draw the person boxes
			nodeEnter.append('foreignObject')
				.attr({
					width: boxWidth,
					height: 0.01,
					x: -halfBoxWidth,
					y: -boxHeight,
				})
				.style('overflow', 'visible') // so the name will wrap
				.append("xhtml:div")
				.html(couple => {
					return self.drawPerson(couple.a, couple.focus == L)
						.concat(self.drawPerson(couple.b, couple.focus == R));
				});

			// Show info popup on click
			nodeEnter.on('click', function (couple) {
				d3.event.stopPropagation();
				self.personPopup(couple, d3.mouse(self.svg.node()), d3.mouse(this));
			});

			// Draw the plus icons
			let expandable = node.filter(function (couple) {
				return !couple.children && self.direction == ANCESTORS ? couple.isAncestorExpandable() : couple.isDescendantExpandable();
			});

			let contractable = node.filter(function (couple) {
				return couple.children != undefined;
			});

			self.drawPlus(expandable.data(), this.selector);

			self.drawMinus(contractable.data(), this.selector);

			// Remove old nodes
			node.exit().remove();

			// Position
			node.attr("transform", function (d) { return "translate(" + (self.direction * d.y) + "," + d.x + ")"; });
		}
		/**
		 * Draw a person box.
		 */
		 drawPerson(person, inFocus) {
			let borderColorCode = '102, 204, 102';
			let name = '?';
			let lifeSpan = '? - ?';
			if (person) {
				if (person.isMale()) { borderColorCode = '102, 102, 204'; }
				if (person.isFemale()) { borderColorCode = '204, 102, 102'; }
				name = getShortName(person);
				lifeSpan = lifespan(person);
			}

			let shading = inFocus && this.direction == DESCENDANTS
				? `; background-image: linear-gradient(to top right, rgba(${borderColorCode},.2), rgba(${borderColorCode},0), rgba(${borderColorCode},0));`
				: '';

			return `
			<div class="box" style="border-color: rgba(${borderColorCode},.5)${shading}">
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
		drawPlus(couples, selector) {
			let self = this;

			let buttons = self.svg.selectAll('g.plus.' + selector)
				.data(couples, function (couple) {
					return couple.getId();
				});

			buttons.enter().append(drawPlus(selector))
				.on('click', function (couple) {
					let plus = d3.select(this);
					let loader = self.svg.append('image')
						.attr({
							//'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
							height: 16,
							width: 16,
							// transform: plus.attr('transform')
						})
						.attr("transform", function () {
							let y = self.direction * (couple.y + halfBoxWidth + 12);
							return "translate(" + y + "," + (couple.x - 8) + ")";
						});
					plus.remove();
					self._expand(couple).then(function () {
						loader.remove();
					});
				});

			buttons.exit().remove();

			buttons.attr("transform", function (couple) {
				let y = self.direction * (couple.y + halfBoxWidth + 20);
				return "translate(" + y + "," + couple.x + ")";
			});

		}
		drawMinus(couples, selector) {
			let self = this;

			let buttons = self.svg.selectAll('g.minus.' + selector)
				.data(couples, function (couple) {
					return couple.getId();
				});

			buttons.enter().append(drawMinus(selector))
				.on('click', function (couple) {
					let minus = d3.select(this);
					let loader = self.svg.append('image')
						.attr({
							//'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
							height: 16,
							width: 16,
							// transform: minus.attr('transform')
						})
						.attr("transform", function () {
							let y = self.direction * (couple.y + halfBoxWidth + 12);
							return "translate(" + y + "," + (couple.x - 8) + ")";
						});
					minus.remove();
					self._contract(couple).then(function () {
						loader.remove();
					});
				});

			buttons.exit().remove();

			buttons.attr("transform", function (couple) {
				let y = self.direction * (couple.y + halfBoxWidth + 20);
				return "translate(" + y + "," + couple.x + ")";
			});
		}
		/**
		 * Show a popup for the person.
		 */
		personPopup(couple, event, xyInCouple) {
			this.removePopups();

			let person = undefined;
			if (xyInCouple[1] < 0) {
				person = couple.a;
			} else {
				person = couple.b;
			}
			if (!person || person.isNoSpouse)
				person = couple.getInFocus();

			let photoUrl = person.getPhotoUrl(75), treeUrl = window.location.pathname + '?id=' + person.getName();

			// Use generic gender photos if there is no profile photo available
			if (!photoUrl) {
				if (person.getGender() === 'Male') {
					photoUrl = 'images/icons/male.gif';
				} else {
					photoUrl = 'images/icons/female.gif';
				}
			}

			let popup = this.svg.append('g')
				.attr('class', 'popup')
				.attr('transform', 'translate(' + event[0] + ',' + event[1] + ')');

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

			d3.select('#treeViewerContainer').on('click', function () {
				popup.remove();
			});
		}
		/**
		 * Remove all popups. It will also remove
		 * any popups displayed by other trees on the
		 * page which is what we want. If later we
		 * decide we don't want that then we can just
		 * add the selector class to each popup and
		 * select on it, like we do with nodes and links.
		 */
		removePopups() {
			d3.selectAll('.popup').remove();
		}
	}


	/**
	 * Manage the ancestors tree
	 */
	class AncestorTree extends Tree {
		constructor(svg) {
			super(svg, ANCESTORS);

			this.children(function (couple) {
				condLog(`AncestorTree children for ${couple.toString()}`, couple);
				let children = [];
				if (couple.a) {
					let father = couple.a.getFather();
					let mother = couple.a.getMother();
					if (father || mother) {
						children.push(new Couple(couple.getId() + 'a', father, mother));
					}
				}
				if (couple.b) {
					let father = couple.b.getFather();
					let mother = couple.b.getMother();
					if (father || mother) {
						children.push(new Couple(couple.getId() + 'b', father, mother));
					}
				}
				condLog(`Returning AncestorTree children for ${couple.toString()}`, children);
				return children;
			});
		}
	}


	/**
	 * Manage the descendants tree
	 */
	class DescendantTree extends Tree {
		constructor(svg) {
			super(svg, DESCENDANTS);

			this.children(function (couple) {
				// Convert children map to an array of couples
				let children = couple.getJointChildren(), list = [];

				for (let i in children) {
					let child = children[i];
					list.push(new Couple(`${couple.getId()}.${i}`, child));
				}

				condLog(`Returning DescendantTree children for ${couple.toString()}`, list);
				return list;
			});
		}
	}


	/**
	 * Create an unattached svg group representing the plus sign
	 */
	function drawPlus(selector) {
		return function () {
			let group = d3.select(document.createElementNS(d3.ns.prefix.svg, 'g'))
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
	function drawMinus(selector) {
		return function () {
			let group = d3.select(document.createElementNS(d3.ns.prefix.svg, 'g'))
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
	function lifespan(person) {
		if (person.isNoSpouse) {
			return '-';
		}
		let birth = '', death = '';
		if (person.getBirthDate()) { birth = person.getBirthDate().substr(0, 4); }
		if (person.getDeathDate()) { death = person.getDeathDate().substr(0, 4); }

		let lifespan = localTesting ? `${person.getId()}: ` : '';
		if (birth && birth != '0000') { lifespan += birth; }
		lifespan += ' - ';
		if (death && death != '0000') { lifespan += death; }

		return lifespan;
	};

	/**
	 * Generate text that display when and where the person was born
	 */
	function birthString(person) {
		let string = '',
			date = humanDate(person.getBirthDate()),
			place = person.getBirthLocation();

		return `B. ${date ? `<strong>${date}</strong>` : '[date unknown]'} ${place ? `in ${place}` : '[location unknown]'}.`
	};

	/**
	 * Generate text that display when and where the person died
	 */
	function deathString(person) {
		let string = '',
			date = humanDate(person.getDeathDate()),
			place = person.getDeathLocation();

		return `D. ${date ? `<strong>${date}</strong>` : '[date unknown]'} ${place ? `in ${place}` : '[location unknown]'}.`;
	};

	let monthNames = [
		'Jan', 'Feb', 'Mar',
		'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep',
		'Oct', 'Nov', 'Dec'
	];

	/**
	 * Turn a wikitree formatted date into a humanreadable date
	 */
	function humanDate(dateString) {
		if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
			let parts = dateString.split('-'),
				year = parseInt(parts[0], 10),
				month = parseInt(parts[1], 10),
				day = parseInt(parts[2], 10);
			if (year) {
				if (month) {
					if (day) {
						return `${day} ${monthNames[month - 1]} ${year}`;
					} else {
						return `${monthNames[month - 1]} ${year}`;
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
		let names = birthName.split(' ').slice(0, -1);
		if (person._data.FirstName) {
			names = person._data.FirstName.split(' ');
		}
		const firstName = names[0];
		let middleInitials = person._data.MiddleInitial;
		if (middleInitials == '.') {
			if (names.length > 1) {
				middleInitials = names.slice(1).map(item => item.substring(0, 1).toUpperCase()).join(' ');
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
			return `${person._data.FirstName.substring(0, 1)}. ${person._data.LastNameAtBirth}`;
		}
	}

	/**
	 * Sort a list of people by their birth year from earliest to latest.
	 * People with no birth year is put last.
	 */
	function sortByBirthDate(list) {
		return list.sort((a, b) => {
			const aBirthDate = a.getBirthDate();
			const bBirthDate = b.getBirthDate();
			const aBirthYear = aBirthDate ? aBirthDate.split('-')[0] : 9999;
			const bBirthYear = bBirthDate ? bBirthDate.split('-')[0] : 9999;

			return aBirthYear - bBirthYear;
		});
	}


}());
