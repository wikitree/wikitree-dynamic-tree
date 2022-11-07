/*
 * We use the D3.js library to render the graph.
 */
window.CouplesTreeView = class CouplesTreeView extends View {
    meta() {
        return {
            title: "Couples Dynamic Tree",
            description:
                "Click on the tree and use track pad or your mouse wheel to zoom. Click and drag to pan around.",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        let view = new CouplesTreeViewer(container_selector, person_id);
        view.loadAndDraw(person_id);
    }
};

(function () {
    const originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200,
        boxHeight = 52,
        halfBoxWidth = boxWidth / 2,
        halfBoxHeight = boxHeight / 2,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 3;

    const L = -1;
    const R = 1;
    const ANCESTORS = 1;
    const DESCENDANTS = -1;
    const DOWN_ARROW = "\u21e9";
    const UP_ARROW = "\u21e7";

    const REQUIRED_FIELDS = [
        "Id",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "FirstName",
        "MiddleInitial",
        "LastNameAtBirth",
        "BirthDate",
        "BirthLocation",
        "DeathDate",
        "DeathLocation",
        "Mother",
        "Father",
        "DataStatus",
        "Parents",
        "Spouses",
        "Suffix",
        "Children",
        "Photo",
        "Name",
        "Gender",
    ];

    const REQUIRED_FIELDS_NO_CHILDREN = REQUIRED_FIELDS.filter((item) => item != "Children");

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
                    throw new Error("Attempting to create an empty couple");
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
                console.error(
                    `Internal ERROR: The focus of a couple cannot be undefined: a=${a}, b=${b}, focus=${focus}`
                );
            }

            // If a couple has a male partner, we want a male to be in a.
            // Similarly we want a female partner to be in b, if present.
            if ((a && a.isFemale() && (!b || !b.isFemale())) || (b && b.isMale() && (!a || !a.isMale()))) {
                // Swap a and b
                this.a = b;
                this.b = a;
                this.focus = -this.focus;
            } else {
                this.a = a;
                this.b = b;
                this.focus = this.focus;
            }
            condLog(`new Couple: id=${this.getId()}, focus=${this.focus}, ${this.toString()}`, this.a, this.b);
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

        hasNoSpouse() {
            return (this.a && this.a.isNoSpouse) || (this.b && this.b.isNoSpouse);
        }

        isAncestorExpandable() {
            return (
                !this.children &&
                this.hasAParent() &&
                ((this.a && !this.a._data.Parents) || (this.b && !this.b._data.Parents))
            );
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
                console.error(
                    `Person ${newPerson.toString()} cannot be refreshed in couple Couple ${
                        this.toString
                    } - person not found`
                );
                return;
            }
            if (oldSpouse) {
                // Refresh the other person in this Couple only newPerson contains new data for them.
                // Note that the two people forming a Couple may not in fact be spouses of each other.
                let newSpouse = newPerson.getSpouse(oldSpouse.getId());
                if (newSpouse) {
                    oldSpouse.refreshFrom(newSpouse);
                } else {
                    condLog(
                        `Couple ${this.toString()} spouse ${oldSpouse.toString()} is not a spouse of ${newPerson.toString()}`,
                        newPerson
                    );
                }
            }
            oldPerson.refreshFrom(newPerson);
        }

        removeAncestors() {
            if (this.a && this.a._data.Parents) delete this.a._data.Parents;
            if (this.b && this.b._data.Parents) delete this.b._data.Parents;
            if (this.children) delete this.children;
            return new Promise((resolve, reject) => {
                resolve(this);
            });
        }

        removeDescendants() {
            if (this.a && this.a._data.Children) delete this.a._data.Children;
            if (this.b && this.b._data.Children) delete this.b._data.Children;
            if (this.children) delete this.children;
            return new Promise((resolve, reject) => {
                resolve(this);
            });
        }

        toString() {
            return `${this.a ? this.a.toString() : "none"} and ${this.b ? this.b.toString() : "none"}`;
        }
    }

    /**
     * CouplesTreeViewer
     */
    let CouplesTreeViewer = (window.CouplesTreeViewer = class CouplesTreeViewer {
        constructor(selector, startId) {
            let container = document.querySelector(selector),
                width = container.offsetWidth,
                height = container.offsetHeight;

            let self = this;

            // Setup zoom and pan
            let zoom = d3.behavior
                .zoom()
                .scaleExtent([0.1, 1])
                .on("zoom", function () {
                    svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
                })
                // Offset so that first pan and zoom does not jump back to the origin
                .translate([originOffsetX, originOffsetY]);

            let svg = d3
                .select(container)
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .call(zoom)
                .append("g")
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
            svg.append("defs")
                .append("pattern")
                .attr({
                    id: "loader",
                    width: 20,
                    height: 20,
                })
                .append("image")
                .attr({
                    width: 20,
                    height: 20,
                    //'xlink:href': 'ringLoader.svg'
                });

            //self.loadAndDraw(startId);
        }

        /**
         * Load and display a person and their spouse
         */
        loadAndDraw(id) {
            condLog(`loadAndDraw(${id})`);
            let self = this;
            self.richLoad(id).then(function (person) {
                condLog(`=======RICH_LOADed ${person.toString()}`, person);
                let aRoot = new Couple("A", person);
                let dRoot = new Couple("D", person);
                self.drawTree(aRoot, dRoot);
            });
        }

        /**
         * Fetch the given person's data via an API call, and make separate API calls
         * for each of their spouses and children.  This is to ensure that those related
         * people are also 'enriched', i.e. each have parent, spouse and children
         * collections (since they are absent if the person data was retrieved as part of
         * a getPerson for another person ID).  We'll only call the API if we have not
         * already retrieved the 'enriched' person in the past.
         *
         * We do not have to make API calls for the parents as part of loadRelated since
         * a parent will be richLoaded before they are expanded. However, since we need
         * to know the names of a person's siblings and the names of both of their parents'
         * other spouses (if any) in order to construct children and spouse dropdowns for
         * each profile, we make getRelatives calls (if necessary) on each parent of the
         * profile being richLoaded as well as on the parents of his/her spouses.
         *
         * These calls are only made if we have not rerieved the relevant data in the past.
         */
        async richLoad(id) {
            condLog(`=======RICH_LOAD ${id}`);
            const person = await this.getWithChildren(id);
            condLog(`=======RICH_LOAD _loaded ${person.toString()}`);
            return await this.loadRelated(person);
        }

        async loadRelated(person) {
            let loadPromises = [];
            condLog(`=======RICH_LOAD loadRelated for ${person.toString()}`);

            condLog(`loadRelated: getPromisesforNamesOfSiblingsAndStepParents of ${person.toString()}`);
            loadPromises = getPromisesforNamesOfSiblingsAndStepParents(person, loadPromises);

            if (person._data.Spouses) {
                let spouses = person._data.Spouses;
                condLog(`loadRelated Spouses`, spouses);
                for (let i in spouses) {
                    condLog(`loadRelated: get load promise for ${spouses[i].toString()}`);
                    loadPromises.push(this.getWithChildren(spouses[i].getId()));
                }
            } else {
                condLog(`loadRelated called on Person ${person.toString()} without Spouses[]`, person);
            }
            if (person._data.Children) {
                let children = person._data.Children;
                condLog(`loadRelated Children`, children);
                for (let i in children) {
                    condLog(`loadRelated: get loadWithoutChildren promise for ${children[i].toString()}`);
                    loadPromises.push(getWithoutChildren(children[i].getId()));
                }
            } else {
                condLog(`loadRelated called on Person ${person.toString()} without Children[]`, person);
            }
            condLog(`=======loadRelated awaiting promise fulfillment for ${person.toString()}`);
            let results = await Promise.all(loadPromises);
            condLog(`=======loadRelated promises fulfilled for ${person.toString()}`);
            for (let newPerson of results) {
                let id = newPerson.getId();
                if (person._data.Spouses && person._data.Spouses[id]) {
                    condLog(`loadRelated: Setting as spouse ${newPerson.toString()}`);
                    person._data.Spouses[id] = newPerson;
                } else if (person._data.Children && person._data.Children[id]) {
                    condLog(`loadRelated: Setting as child ${newPerson.toString()}`);
                    person._data.Children[id] = newPerson;
                } else if (person._data.Parents && person._data.Parents[id]) {
                    condLog(`loadRelated: Updating due to getSpouseAndChildrenNames on parent ${newPerson.toString()}`);
                    updateNames(person._data.Parents[id], newPerson);
                } else {
                    console.error(
                        `loadRelated ${person.toString()} Promises resolved for none of spouse, child or parent`,
                        newPerson
                    );
                }
            }

            // Now that we have loaded all the spouses, make sure we have all sibling and parent names of each
            // spouse as well
            loadPromises = [];
            if (person._data.Spouses) {
                condLog("=======loadRelated get promises for spouses");
                let spouses = person._data.Spouses;
                for (let i in spouses) {
                    condLog(
                        `loadRelated: getPromisesforNamesOfSiblingsAndStepParents for spouse ${spouses[i].toString()}`
                    );
                    loadPromises = getPromisesforNamesOfSiblingsAndStepParents(spouses[i], loadPromises);
                }
                condLog(`=======loadRelated awaiting spouse-related promise fulfillment for ${person.toString()}`);
                results = await Promise.all(loadPromises);
                for (let newPerson of results) {
                    condLog(
                        `loadRelated: Updating due to getNamesOfSiblingsAndStepParents on spouse's parent: ${newPerson.toString()}`
                    );
                    let id = newPerson.getId();
                    for (let s in spouses) {
                        let spouse = spouses[s];
                        if (spouse._data.Parents && spouse._data.Parents[id]) {
                            updateNames(spouse._data.Parents[id], newPerson);
                            // check other results
                            break;
                        }
                    }
                }
                condLog(`${person.toString()}: Siblings and parents of their spouses have been loaded`, person);
            }
            return person;

            // Obtain promises for the loading of the names of the children of both of the parents of the given person
            // as well as the names of all their spouses
            function getPromisesforNamesOfSiblingsAndStepParents(person, promises) {
                if (person._data.Parents) {
                    let parents = person._data.Parents;
                    for (let p in parents) {
                        let parent = parents[p];
                        if (!parent.getChildren() || !parent.getSpouses()) {
                            condLog(`getSpouseAndChildrenNames of ${parent.toString()}`);
                            promises.push(WikiTreeAPI.getSpouseAndChildrenNames(parent.getId()));
                        }
                    }
                }
                return promises;
            }

            function updateNames(parent, newPerson) {
                condLog(`Setting children of parent ${newPerson.toString()}`, newPerson);
                if (parent.getChildren()) {
                    console.error(`Unexpected update of Children for ${parent.toString()}`, parent, newPerson);
                } else if (newPerson.getChildren()) {
                    parent.setChildren(newPerson.getChildren());
                }
                condLog(`Setting spouses of parent ${newPerson.toString()}`, newPerson);
                if (parent.getSpouses()) {
                    console.error(`Unexpected update of Spouses for ${parent.toString()}`, parent, newPerson);
                } else if (newPerson.getSpouses()) {
                    parent.copySpouses(newPerson);
                }
            }
        }

        /**
         * Load more ancestors or descendants. Update existing data in place
         */
        loadMore(couple) {
            let self = this;
            condLog(`loadMore for ${couple.toString()}`, couple);
            let oldPerson = couple.getInFocus();
            let oldSpouse = couple.getNotInFocus();
            let oldSpouseId = oldSpouse && !oldSpouse.isNoSpouse ? oldSpouse.getId() : undefined;
            if (oldPerson && !oldPerson.isFullyEnriched()) {
                return self
                    .richLoad(oldPerson.getId())
                    .then(function (newPerson) {
                        condLog(
                            `=======RICH_LOADed (in loadMore) ${oldPerson.toString()} getting ${newPerson.toString()}`,
                            newPerson
                        );
                        couple.refreshPerson(newPerson);
                        return newPerson;
                    })
                    .then(function (newPerson) {
                        condLog(`=======RICH_LOADed (in loadMore) refreshed ${newPerson.toString()}`, newPerson);
                        let newSpouses = newPerson.getSpouses();
                        if (oldSpouseId && (!newSpouses || !newSpouses[oldSpouseId])) {
                            // the couple partner has not been updated, so we better do that
                            condLog(`Rich loading spouse ${oldSpouse.toString()}`);
                            return self.richLoad(oldSpouseId).then(function (newSpouse) {
                                condLog(
                                    `=======RICH_LOADed (in loadMore) refreshed spouse ${newPerson.toString()}`,
                                    newPerson
                                );
                                couple.refreshPerson(newSpouse);
                            });
                        }
                        condLog("Spouse already refreshed");
                    })
                    .then(function () {
                        condLog(`loadMore done for ${couple.toString()}`, couple);
                        self.drawTree();
                    });
            }
            console.error("Attempted to loadMore for non-enriched person", oldPerson);
            // what to return here?
        }

        removeAncestors(couple) {
            let self = this;
            condLog(`Removing Ancestors for ${couple.toString()}`, couple);
            return couple.removeAncestors().then(function () {
                self.drawTree();
            });
        }

        removeDescendants(couple) {
            let self = this;
            condLog(`Removing Descendants for ${couple.toString()}`, couple);
            return couple.removeDescendants().then(function () {
                self.drawTree();
            });
        }

        /**
         * Main WikiTree API call
         */
        async getWithChildren(id) {
            return await WikiTreeAPI.getPerson(id, REQUIRED_FIELDS);
        }

        async getWithoutChildren(id) {
            return await WikiTreeAPI.getPerson(id, REQUIRED_FIELDS_NO_CHILDREN);
        }

        /**
         * Draw/redraw the tree
         */
        drawTree(ancestorRoot, descendantRoot) {
            condLog("=======drawTree for:", ancestorRoot, descendantRoot);
            if (ancestorRoot) {
                this.ancestorTree.data(ancestorRoot);
            }
            if (descendantRoot) {
                this.descendantTree.data(descendantRoot);
            }
            condLog("draw ancestorTree:", this.ancestorTree);
            this.ancestorTree.draw();
            condLog("draw descendantTree:", this.descendantTree);
            this.descendantTree.draw();
            condLog("drawTree done", this.ancestorTree, this.descendantTree);
        }
    });

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

            this.tree = d3.layout
                .tree()
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
            this.selector = this.direction == DESCENDANTS ? "descendant" : "ancestor";
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
                let nodes = this.tree.nodes(this.root);
                let links = this.tree.links(nodes);
                this.drawLinks(links);
                this.drawNodes(nodes);
            } else {
                throw new Error("Missing root");
            }
            return this;
        }
        /**
         * Draw/redraw the connecting lines
         */
        drawLinks(links) {
            let self = this;

            // Get a list of existing links
            let link = this.svg.selectAll("path.link." + this.selector).data(links, function (link) {
                return link.target.getId();
            });

            // Add new links
            link.enter()
                .append("path")
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
            let dir = this.direction;
            let offsetDir = dir < 0 ? 0 : d.target.x - d.source.x > 0 ? 1 : -1;
            let sourceX = d.source.x + offsetDir * halfBoxHeight,
                sourceY = dir * (d.source.y + halfBoxWidth),
                targetX = d.target.x,
                targetY = dir * (d.target.y - halfBoxWidth);

            // We flip x and y because we draw the tree "on its side", i.e from
            // left to right rather than from top to bottom which is what the
            // default coordinate system assumes
            return (
                "M" +
                sourceY +
                "," +
                sourceX +
                "H" +
                (sourceY + (targetY - sourceY) / 2) +
                "V" +
                targetX +
                "H" +
                targetY
            );
        }
        /**
         * Draw the couple boxes.
         */
        drawNodes(nodes) {
            let self = this;

            // Get a list of existing nodes
            let node = this.svg.selectAll("g.couple." + this.selector).data(nodes, function (couple) {
                return couple.getId();
            });

            // Add new nodes
            let nodeEnter = node
                .enter()
                .append("g")
                .attr("class", "couple " + this.selector);

            // Draw the person boxes
            nodeEnter
                .append("foreignObject")
                .attr({
                    width: boxWidth,
                    height: 0.01,
                    x: -halfBoxWidth,
                    y: function (c) {
                        return c.hasNoSpouse() ? -halfBoxHeight : -boxHeight;
                    },
                })
                .style("overflow", "visible") // so the name will wrap
                .append((couple) => {
                    return self.drawCouple(couple);
                });

            // Draw the plus icons
            let expandable = node.filter(function (couple) {
                return !couple.children && self.direction == ANCESTORS
                    ? couple.isAncestorExpandable()
                    : couple.isDescendantExpandable();
            });

            let contractable = node.filter(function (couple) {
                return couple.children != undefined;
            });

            self.drawPlus(expandable.data(), this.selector);

            self.drawMinus(contractable.data(), this.selector);

            // Remove old nodes
            node.exit().remove();

            this.svg.selectAll(".box").on("click", function (event) {
                d3.event.stopPropagation();
                let person = undefined;
                if (this.classList.contains("L")) {
                    person = this.parentNode.__data__.a;
                } else if (this.classList.contains("R")) {
                    person = this.parentNode.__data__.b;
                } else {
                    return;
                }
                self.personPopup(person, d3.mouse(self.svg.node()), d3.mouse(this));
            });

            // Position
            node.attr("transform", function (d) {
                return "translate(" + self.direction * d.y + "," + d.x + ")";
            });
        }

        drawCouple(couple) {
            let div = document.createElement("xhtml:div");
            if (!couple.a || !couple.a.isNoSpouse) {
                div.appendChild(this.drawPerson(couple.a, couple.b, L, couple.focus == L));
            }
            if (!couple.b || !couple.b.isNoSpouse) {
                div.appendChild(this.drawPerson(couple.b, couple.a, R, couple.focus == R));
            }
            if (this.direction == ANCESTORS) {
                div.appendChild(this.drawChildrenList(couple));
            }
            return div;
        }
        /**
         * Draw a person box.
         */
        drawPerson(person, spouse, side, inFocus) {
            let borderColorCode = "102, 204, 102";
            let name = "?";
            let lifeSpan = "? - ?";
            let personId = undefined;
            if (person) {
                if (person.isMale()) {
                    borderColorCode = "102, 102, 204";
                }
                if (person.isFemale()) {
                    borderColorCode = "204, 102, 102";
                }
                name = getShortName(person);
                lifeSpan = lifespan(person);
                personId = person.getId();
            }
            let div = document.createElement("div");
            div.className = `person box ${side == R ? "R" : "L"}`;
            div.style.borderColor = `rgba(${borderColorCode},.5)`;
            if (inFocus && this.direction == DESCENDANTS) {
                div.style.backgroundImage = `linear-gradient(to top right, rgba(${borderColorCode},.2), rgba(${borderColorCode},0), rgba(${borderColorCode},0))`;
            }
            // Add spouse list behind a button
            let [button, spouseList] = getSpouseSelection(spouse, personId);
            if (button) {
                button.style.borderColor = `rgba(${borderColorCode},.2)`;
                spouseList.style.borderColor = `rgba(${borderColorCode},.5)`;
                let nameWrapper = document.createElement("div");
                nameWrapper.className = "cname";
                nameWrapper.appendChild(button);
                nameWrapper.appendChild(document.createTextNode(" " + name));
                div.appendChild(nameWrapper);
                div.appendChild(divWith("lifespan", lifeSpan));
                div.appendChild(spouseList);
            } else {
                div.appendChild(divWith("cname", name));
                div.appendChild(divWith("lifespan", lifeSpan));
            }
            return div;
        }

        drawChildrenList(couple) {
            let listDiv = document.createElement("div");
            listDiv.className = "children-list";
            listDiv.style.display = "none";

            let children = couple.getJointChildren();
            let childrenList = document.createElement("ol");
            for (let child of children) {
                let item = document.createElement("li");
                item.appendChild(
                    divWithNewTreeLink("aChild", aProfileLink(getShortName(child), child.getName()), child.getName())
                );
                childrenList.appendChild(item);
            }
            listDiv.appendChild(childrenList);

            let wrapper = document.createElement("div");
            wrapper.className = "children-list-wrapper";

            let button = document.createElement("button");
            button.className = "drop-button";
            button.style.backgroundColor = "transparent";
            button.style.borderColor = "rgba(0, 0, 0, .2)";
            // button.style.textAlign = "left";
            let down = document.createTextNode(`${DOWN_ARROW} Children`);
            let up = document.createTextNode(`${UP_ARROW} Children`);
            button.appendChild(down);
            button.onclick = (event) => {
                if (listDiv.style.display == "none") {
                    // let x = d3.selectAll(".children-list");
                    // x.sort(function (a, b) {
                    // d3.selectAll(".children-list").sort(function (a, b) {
                    //     // select the parent and sort the path's
                    //     if (a != listDiv) return -1; // a is not the hovered element, send "a" to the back
                    //     else return 1; // a is the hovered element, bring "a" to the front
                    // });
                    listDiv.style.display = "block";
                    button.replaceChild(up, down);
                } else {
                    listDiv.style.display = "none";
                    button.replaceChild(down, up);
                }
            };
            wrapper.appendChild(button);
            wrapper.appendChild(listDiv);
            return wrapper;
        }

        /**
         * Add any plus icons (expand indicator)
         * We add icons to the svg element
         * so that it's not considered part of the couple box.
         * This makes styling and events easier, sometimes.
         * It means we have to keep it's position in sync
         * with the couple's box.
         */
        drawPlus(couples, selector) {
            let self = this;

            let buttons = self.svg.selectAll("g.plus." + selector).data(couples, function (couple) {
                return couple.getId();
            });

            buttons
                .enter()
                .append(drawPlus(selector))
                .on("click", function (couple) {
                    let plus = d3.select(this);
                    let loader = self.svg
                        .append("image")
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

            let buttons = self.svg.selectAll("g.minus." + selector).data(couples, function (couple) {
                return couple.getId();
            });

            buttons
                .enter()
                .append(drawMinus(selector))
                .on("click", function (couple) {
                    let minus = d3.select(this);
                    let loader = self.svg
                        .append("image")
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
        personPopup(person, event, xyInCouple) {
            this.removePopups();
            if (!person || person.isNoSpouse) {
                return;
            }

            if (localTesting) {
                condLog(`${person.toString()}`, person);
            }

            let photoUrl = person.getPhotoUrl(75),
                treeUrl = window.location.pathname + "?id=" + person.getName();

            // Use generic gender photos if there is no profile photo available
            if (!photoUrl) {
                if (person.getGender() === "Male") {
                    photoUrl = "images/icons/male.gif";
                } else {
                    photoUrl = "images/icons/female.gif";
                }
            }

            let popup = this.svg
                .append("g")
                .attr("class", "popup")
                .attr("transform", "translate(" + event[0] + "," + event[1] + ")");

            let borderColor = "rgba(102, 204, 102, .5)";
            if (person.getGender() == "Male") {
                borderColor = "rgba(102, 102, 204, .5)";
            }
            if (person.getGender() == "Female") {
                borderColor = "rgba(204, 102, 102, .5)";
            }

            popup
                .append("foreignObject")
                .attr({
                    width: 400,
                    height: 300,
                })
                .style("overflow", "visible")
                .append("xhtml:div").html(`
				<div class="popup-box" style="border-color: ${borderColor}">
					<div class="top-info">
						<div class="image-box"><img src="https://www.wikitree.com/${photoUrl}"></div>
						<div class="vital-info">
						  <div class="name">
						    <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${person.getDisplayName()}</a>
						    <span class="tree-links">
                                <a href="#name=${person.getName()}"><img src="https://www.wikitree.com/images/icons/pedigree.gif" /></a>
                                <a href="#name=${person.getName()}&view=fanchart"><img src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></a>
                            </span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>

				</div>
			`);

            d3.select("#view-container").on("click", function () {
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
            d3.selectAll(".popup").remove();
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
                        children.push(new Couple(couple.getId() + "a", father, mother));
                    }
                }
                if (couple.b) {
                    let father = couple.b.getFather();
                    let mother = couple.b.getMother();
                    if (father || mother) {
                        children.push(new Couple(couple.getId() + "b", father, mother));
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
                let children = couple.getJointChildren();
                let list = [];

                for (let i in children) {
                    list.push(new Couple(`${couple.getId()}.${i}`, children[i]));
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
            let group = d3.select(document.createElementNS(d3.ns.prefix.svg, "g")).attr("class", "plus " + selector);

            group.append("circle").attr({
                cx: 0,
                cy: 0,
                r: 10,
            });

            group.append("path").attr("d", "M0,5v-10M5,0h-10");

            return group.node();
        };
    }

    /**
     * Create an unattached svg group representing the minus sign
     */
    function drawMinus(selector) {
        return function () {
            let group = d3.select(document.createElementNS(d3.ns.prefix.svg, "g")).attr("class", "minus " + selector);

            group.append("circle").attr({
                cx: 0,
                cy: 0,
                r: 10,
            });

            group.append("path").attr("d", "M5,0h-10");

            return group.node();
        };
    }

    /**
     * Generate a string representing this person's lifespan 0000 - 0000
     */
    function lifespan(person) {
        if (person.isNoSpouse) {
            return "-";
        }
        let birth = "",
            death = "";
        if (person.getBirthDate()) {
            birth = person.getBirthDate().substr(0, 4);
        }
        if (person.getDeathDate()) {
            death = person.getDeathDate().substr(0, 4);
        }

        let lifespan = localTesting ? `${person.getId()}: ` : "";
        if (birth && birth != "0000") {
            lifespan += birth;
        }
        lifespan += " - ";
        if (death && death != "0000") {
            lifespan += death;
        }

        return lifespan;
    }

    /**
     * Generate text that display when and where the person was born
     */
    function birthString(person) {
        let string = "",
            date = humanDate(person.getBirthDate()),
            place = person.getBirthLocation();

        return `B. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    /**
     * Generate text that display when and where the person died
     */
    function deathString(person) {
        let string = "",
            date = humanDate(person.getDeathDate()),
            place = person.getDeathLocation();

        return `D. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /**
     * Turn a wikitree formatted date into a humanreadable date
     */
    function humanDate(dateString) {
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            let parts = dateString.split("-"),
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
    }

    /**
     * Shorten the name if it will be too long to display in full.
     */
    function getShortName(person) {
        if (person.isNoSpouse) {
            return "";
        }
        const maxLength = 22;

        // Use birth name if it is not too long (note that it includes Suffix if present)
        const birthName = person.getDisplayName();
        if (birthName.length < maxLength) {
            return birthName;
        }

        // birth name is too long, so try successive shorter versions, but first determine a few fields with which
        // to construct shorter versions
        const lastNameAtBirth = person._data.LastNameAtBirth;
        const hasSuffix = person.hasSuffix();
        let lastNameAtBirthWithSuffix = lastNameAtBirth;
        let nameToSplit = birthName;
        if (person._data.Suffix) {
            lastNameAtBirthWithSuffix = `${lastNameAtBirth} ${person._data.Suffix}`;

            // Remove the suffix from birthName so we can split it into the other names
            let idx = birthName.lastIndexOf(person._data.Suffix);
            if (idx > 0) {
                nameToSplit = nameToSplit.substring(0, idx - 1);
            }
        }
        // Remove lastNameAtBirth from nameToSplit so we can split the result into the other names
        nameToSplit = nameToSplit.replace(lastNameAtBirth, "");
        let names = nameToSplit.split(" ");

        // However, if the above resulted in only one name and we have a FirstName field, use the latter to
        // obtain the other names on the assumption that it might contain all the names (as for profiles that
        // use 'no middle name' and have all the names in FirstName).
        if (person._data.FirstName && names.length <= 1) {
            names = person._data.FirstName.split(" ");
        }
        const firstName = names[0];

        // Obtain the middle name initials. We don't trust the field MiddleInitial since it does not always contain all initials
        // (it seems to assume there is only one middle name).
        let middleInitials = "";
        if (names.length > 1) {
            middleInitials = names
                .slice(1)
                .map((item) => item.substring(0, 1).toUpperCase())
                .join(" ");
        } else if (person._data.MiddleInitial != ".") {
            middleInitials = person._data.MiddleInitial;
        }

        if (hasSuffix) {
            // Try <first name> <middle initials> <last name> <suffix>
            nameToReturn = `${firstName} ${middleInitials} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length <= maxLength) {
                return nameToReturn;
            }

            // Try <first name> <last name> <suffix>
            nameToReturn = `${firstName} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length <= maxLength) {
                return nameToReturn;
            }
        }

        // Obtain initials
        let firstInitial = firstName.substring(0, 1);
        let allInitials = firstInitial;
        if (middleInitials.length > 0) {
            allInitials = `${firstInitial} ${middleInitials}`;
        }

        if (hasSuffix) {
            // Try <all initials> <last name> <suffix>
            nameToReturn = `${allInitials} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length <= maxLength) {
                return nameToReturn;
            }

            // Try <first initial> <last name> <suffix>
            nameToReturn = `${firstInitial} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length <= maxLength) {
                return nameToReturn;
            }
        }

        // Try <first name> <middle initials> <last name>
        nameToReturn = `${firstName} ${middleInitials} ${lastNameAtBirth}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }

        // Try <first name> <last name>
        nameToReturn = `${firstName} ${lastNameAtBirth}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }

        // Try <all initials> <last name>
        nameToReturn = `${allInitials} ${lastNameAtBirth}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }

        // Use <first initial> <last name>, truncated if necessary
        nameToReturn = `${firstInitial} ${lastNameAtBirth}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }
        return nameToReturn.substring(0, maxLength - 3) + "...";
    }

    async function getWithoutChildren(id) {
        return WikiTreeAPI.getPerson(id, REQUIRED_FIELDS_NO_CHILDREN);
    }

    /**
     * Sort a list of people by their birth year from earliest to latest.
     * People with no birth year is put last.
     */
    function sortByBirthDate(list) {
        return list.sort((a, b) => {
            const aBirthDate = a.getBirthDate();
            const bBirthDate = b.getBirthDate();
            const aBirthYear = aBirthDate ? aBirthDate.split("-")[0] : 9999;
            const bBirthYear = bBirthDate ? bBirthDate.split("-")[0] : 9999;

            return aBirthYear - bBirthYear;
        });
    }

    function getSpouseSelection(person, selectedSpouseId) {
        if (!person) return [];

        // Collect a list of the names and lifespans of all the spouses of the given person
        let spouses = person.getSpouses();
        let list = [];
        if (spouses) {
            for (let s in spouses) {
                let spouse = spouses[s];
                list.push({
                    name: getShortName(spouse),
                    lifespan: lifespan(spouse),
                    wtId: spouse.getName(),
                    mDate: person._data.MarriageDates[spouse.getId()].marriage_date,
                });
            }
        }
        if (list.length <= 1) return [];

        function sortByYear(list) {
            list.sort((a, b) => {
                // Unknown year goes last
                const aYear = a.mDate ? a.mDate.split("-")[0] : 9999;
                const bYear = b.mDate ? b.mDate.split("-")[0] : 9999;

                return (aYear == 0 ? 9999 : aYear) - (bYear == 0 ? 9999 : bYear);
            });
        }
        sortByYear(list);

        let wrapper = document.createElement("div");
        wrapper.className = "box alt-spouse-list-wrapper";
        wrapper.style.display = "none";
        let heading = document.createElement("h4");
        heading.textContent = `Spouses for ${getShortName(person)}`;
        wrapper.appendChild(heading);

        let listDiv = document.createElement("div");
        listDiv.className = "spouse-list";

        let spouseList = document.createElement("ol");
        spouseList.style.textAlign = "left";
        for (let spouse of list) {
            let item = document.createElement("li");
            item.appendChild(divWith("altSpouse", undefined, aProfileLink(spouse.name, spouse.wtId)));
            item.appendChild(
                divWithNewTreeLink(
                    "lifespan",
                    document.createTextNode(spouse.lifespan),
                    spouse.wtId,
                    (treeLinkIsAfter = false)
                )
            );
            spouseList.appendChild(item);
        }
        listDiv.appendChild(spouseList);

        let button = document.createElement("button");
        button.className = "drop-button";
        button.textContent = DOWN_ARROW;
        button.style.backgroundColor = "transparent";
        button.onclick = (event) => {
            if (wrapper.style.display == "none") {
                wrapper.style.display = "block";
                button.textContent = UP_ARROW;
            } else {
                wrapper.style.display = "none";
                button.textContent = DOWN_ARROW;
            }
            event.stopPropagation();
        };
        wrapper.appendChild(listDiv);
        return [button, wrapper];
    }

    function divWith(itsClass, itsText, aChild) {
        let div = document.createElement("div");
        div.className = itsClass;
        if (itsText) {
            div.textContent = itsText;
        }
        if (aChild) {
            div.appendChild(aChild);
        }
        return div;
    }

    /**
     * Create a link (<a href=...>)</a> to a given WikiTree profile
     * @param {*} itsText The text to display in the link
     * @param {*} personId The profile id to link to
     */
    function aProfileLink(itsText, personId) {
        let profileLink = document.createElement("a");
        profileLink.appendChild(document.createTextNode(itsText));
        profileLink.href = `https://www.wikitree.com/wiki/${personId}`;
        profileLink.target = "_blank";
        return profileLink;
    }

    function divWithNewTreeLink(itsClass, content, personId, treeLinkIsAfter = true) {
        // Icon and link to dynamic tree
        let img = document.createElement("img");
        img.src = "https://www.wikitree.com/images/icons/pedigree.gif";
        let treeLink = document.createElement("a");
        treeLink.href = `#name=${personId}`;
        treeLink.appendChild(img);

        // Put it all together
        let div = document.createElement("div");
        div.className = itsClass;
        span = document.createElement("span");
        if (treeLinkIsAfter) {
            span.appendChild(content);
            span.appendChild(document.createTextNode(" "));
            span.appendChild(treeLink);
        } else {
            span.appendChild(treeLink);
            span.appendChild(document.createTextNode(" "));
            span.appendChild(content);
        }
        div.appendChild(span);

        return div;
    }
})();
