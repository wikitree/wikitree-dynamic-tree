/*
 * The base/core WikiTree Dynamic Tree Viewer.
 * This view uses the D3.js library to render the graph.
 */

(function () {
    const APP_ID = "DynamicTree";
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;

    /**
     * Constructor
     */
    var WikiTreeDynamicTreeViewer = (window.WikiTreeDynamicTreeViewer = function () {
        Object.assign(this, this?.meta());
    });

    WikiTreeDynamicTreeViewer.prototype.meta = function () {
        return {
            title: "Dynamic Tree",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    WikiTreeDynamicTreeViewer.prototype.init = function (selector, startId) {
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;

        // Setup zoom and pan
        var zoom = d3.behavior
            .zoom()
            .scaleExtent([0.1, 1])
            .on("zoom", function () {
                svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
            })
            // Offset so that first pan and zoom does not jump back to the origin
            .translate([originOffsetX, originOffsetY]);

        var svg = d3
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
        self.ancestorTree.expand(function (person) {
            return self.loadMore(person);
        });

        self.descendantTree.expand(function (person) {
            return self.loadMore(person);
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

        self.load(startId);
    };

    /** Static variable to hold unique ids for private persons **/
    WikiTreeDynamicTreeViewer.nextPrivateId = -1;

    /**
     * Load and display a person
     */
    WikiTreeDynamicTreeViewer.prototype.load = function (id) {
        var self = this;
        if (!id) {
            wtViewRegistry.showError("A starting profile is required.");
            return;
        }
        self._load(id).then(function (person) {
            if (person._data.Name) {
                wtViewRegistry.setInfoPanel(
                    `Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.`
                );
                wtViewRegistry.showInfoPanel();
                self.drawTree(person);
            } else {
                let err = `The starting profile data could not be retrieved.`;
                if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                    err += ` You may need to be added to the starting profile's Trusted List.`;
                } else {
                    err += ` Try the Apps login.`;
                }
                wtViewRegistry.showError(err);
                wtViewRegistry.hideInfoPanel();
            }
        });
    };

    /**
     * Load more ancestors. Update existing data in place
     */
    WikiTreeDynamicTreeViewer.prototype.loadMore = function (oldPerson) {
        var self = this;

        return self._load(oldPerson.getId()).then(function (newPerson) {
            var mother = newPerson.getMother(),
                father = newPerson.getFather();

            if (mother) {
                oldPerson.setMother(mother);
            }
            if (father) {
                oldPerson.setFather(father);
            }
            oldPerson.setChildren(newPerson.getChildren());
            self.drawTree();
        });
    };

    /**
     * Main WikiTree API call
     */
    WikiTreeDynamicTreeViewer.prototype._load = function (id) {
        return WikiTreeAPI.getPerson(APP_ID, id, [
            "Id",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "FirstName",
            "MiddleInitial",
            "LastNameAtBirth",
            "LastNameCurrent",
            "Suffix",
            "BirthDate",
            "BirthLocation",
            "DeathDate",
            "DeathLocation",
            "Mother",
            "Father",
            "Children",
            "Parents",
            "Spouses",
            "Siblings",
            "Photo",
            "Name",
            "Gender",
            "Privacy",
        ]);
    };

    /**
     * Draw/redraw the tree
     */
    WikiTreeDynamicTreeViewer.prototype.drawTree = function (data) {
        if (data) {
            this.ancestorTree.data(data);
            this.descendantTree.data(data);
        }
        this.ancestorTree.draw();
        this.descendantTree.draw();
    };

    /**
     * Shared code for drawing ancestors or descendants.
     * `selector` is a class that will be applied to links
     * and nodes so that they can be queried later when
     * the tree is redrawn.
     * `direction` is either 1 (forward) or -1 (backward).
     */
    var Tree = function (svg, selector, direction) {
        this.svg = svg;
        this.root = null;
        this.selector = selector;
        this.direction = typeof direction === "undefined" ? 1 : direction;

        this._expand = function () {
            return $.Deferred().resolve().promise();
        };

        this.tree = d3.layout
            .tree()
            .nodeSize([nodeHeight, nodeWidth])
            .separation(function () {
                return 1;
            });
    };

    /**
     * Set the `children` function for the tree
     */
    Tree.prototype.children = function (fn) {
        this.tree.children(fn);
        return this;
    };

    /**
     * Set the root of the tree
     */
    Tree.prototype.data = function (data) {
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
    Tree.prototype.expand = function (fn) {
        this._expand = fn;
        return this;
    };

    /**
     * Draw/redraw the tree
     */
    Tree.prototype.draw = function () {
        if (this.root) {
            var nodes = this.tree.nodes(this.root),
                links = this.tree.links(nodes);
            this.drawLinks(links);
            this.drawNodes(nodes);
        } else {
            throw new Error("Missing root");
        }
        return this;
    };

    /**
     * Draw/redraw the connecting lines
     */
    Tree.prototype.drawLinks = function (links) {
        var self = this;

        // Get a list of existing links
        var link = this.svg.selectAll("path.link." + this.selector).data(links, function (link) {
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
    };

    /**
     * Helper function for drawing straight connecting lines
     * http://stackoverflow.com/a/10249720/879121
     */
    Tree.prototype.elbow = function (d) {
        var dir = this.direction,
            sourceX = d.source.x,
            sourceY = dir * (d.source.y + boxWidth / 2),
            targetX = d.target.x,
            targetY = dir * (d.target.y - boxWidth / 2);

        return (
            "M" + sourceY + "," + sourceX + "H" + (sourceY + (targetY - sourceY) / 2) + "V" + targetX + "H" + targetY
        );
    };

    /**
     * Draw the person boxes.
     */
    Tree.prototype.drawNodes = function (nodes) {
        var self = this;

        // Get a list of existing nodes
        var node = this.svg.selectAll("g.person." + this.selector).data(nodes, function (person) {
            return person.getId();
        });

        // Add new nodes
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // Draw the person boxes
        nodeEnter
            .append("foreignObject")
            .attr({
                width: boxWidth,
                height: 0.01, // the foreignObject won't display in Firefox if it is 0 height
                x: -boxWidth / 2,
                y: -boxHeight / 2,
            })
            .style("overflow", "visible") // so the name will wrap
            .append("xhtml:div")
            .html((person) => {
                let borderColor = "rgba(102, 204, 102, .5)";
                if (person.getGender() == "Male") {
                    borderColor = "rgba(102, 102, 204, .5)";
                }
                if (person.getGender() == "Female") {
                    borderColor = "rgba(204, 102, 102, .5)";
                }

                return `
				<div class="box" style="border-color: ${borderColor}">
					<div class="name">${getShortName(person)}</div>
					<div class="lifespan">${lifespan(person)}</div>
				</div>
				`;
            });

        // Show info popup on click
        nodeEnter.on("click", function (person) {
            d3.event.stopPropagation();
            self.personPopup(person, d3.mouse(self.svg.node()));
        });

        // Draw the plus icons
        var expandable = node.filter(function (person) {
            return !person.getChildren() && (person.getFatherId() || person.getMotherId());
        });

        self.drawPlus(expandable.data());

        // Remove old nodes
        node.exit().remove();

        // Position
        node.attr("transform", function (d) {
            return "translate(" + self.direction * d.y + "," + d.x + ")";
        });
    };

    /**
     * Add a plus icons (expand indicator)
     * We add icons to the svg element
     * so that it's not considered part of the person box.
     * This makes styling and events easier, sometimes
     * It means we have to keep its position in sync
     * with the person's box.
     */
    Tree.prototype.drawPlus = function (persons) {
        var self = this;

        var buttons = self.svg.selectAll("g.plus").data(persons, function (person) {
            return person.getId();
        });

        buttons
            .enter()
            .append(drawPlus())
            .on("click", function (person) {
                var plus = d3.select(this);
                var loader = self.svg
                    .append("image")
                    .attr({
                        //'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
                        height: 16,
                        width: 16,
                        // transform: plus.attr('transform')
                    })
                    .attr("transform", function () {
                        var y = self.direction * (person.y + boxWidth / 2 + 12);
                        return "translate(" + y + "," + (person.x - 8) + ")";
                    });
                plus.remove();
                self._expand(person).then(function () {
                    loader.remove();
                });
            });

        buttons.attr("transform", function (person) {
            var y = self.direction * (person.y + boxWidth / 2 + 20);
            return "translate(" + y + "," + person.x + ")";
        });
    };

    /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup = function (person, event) {
        this.removePopups();

        var treeUrl = window.location.pathname + "?id=" + person.getName();

        var photoUrl = person.getPhotoUrl(75);
        if (photoUrl) {
            photoUrl = "https://www.wikitree.com/" + photoUrl;
        } else {
            // Use generic gender photos if there is no profile photo available
            if (person.getGender() === "Male") {
                photoUrl = "https://www.wikitree.com/images/icons/male.gif";
            } else {
                photoUrl = "https://www.wikitree.com/images/icons/female.gif";
            }
        }

        var popup = this.svg
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
						<div class="image-box"><img src="${photoUrl}"></div>
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
    };

    /**
     * Remove all popups. It will also remove
     * any popups displayed by other trees on the
     * page which is what we want. If later we
     * decide we don't want that then we can just
     * add the selector class to each popup and
     * select on it, like we do with nodes and links.
     */
    Tree.prototype.removePopups = function () {
        d3.selectAll(".popup").remove();
    };

    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        Tree.call(this, svg, "ancestor", 1);
        this.children(function (person) {
            var children = [],
                mother = person.getMother(),
                father = person.getFather();

            if (father) {
                children.push(father);
            }
            if (mother) {
                children.push(mother);
            }
            return children;
        });
    };

    // Inheritance
    AncestorTree.prototype = Object.create(Tree.prototype);

    /**
     * Manage the descendants tree
     */
    var DescendantTree = function (svg) {
        Tree.call(this, svg, "descendant", -1);

        this.children(function (person) {
            // Convert children map to an array
            var children = person.getChildren(),
                list = [];

            for (var i in children) {
                list.push(children[i]);
            }

            sortByBirthDate(list);

            return list;
        });
    };

    // Inheritance
    DescendantTree.prototype = Object.create(Tree.prototype);

    /**
     * Create an unattached svg group representing the plus sign
     */
    function drawPlus() {
        return function () {
            var group = d3.select(document.createElementNS(d3.ns.prefix.svg, "g")).attr("class", "plus");

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
     * Generate a string representing this person's lifespan 0000 - 0000
     */
    function lifespan(person) {
        var birth = "",
            death = "";
        if (person.getBirthDate()) {
            birth = person.getBirthDate().substr(0, 4);
        }
        if (person.getDeathDate()) {
            death = person.getDeathDate().substr(0, 4);
        }

        var lifespan = "";
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
        var string = "",
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
        var string = "",
            date = humanDate(person.getDeathDate()),
            place = person.getDeathLocation();

        return `D. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /**
     * Turn a wikitree formatted date into a human-readable date
     */
    function humanDate(dateString) {
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            var parts = dateString.split("-"),
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
        const maxLength = 20;

        // Use birth name if it is not too long (note that it includes Suffix if present)
        const birthName = person.getDisplayName();
        if (birthName.length < maxLength) {
            return birthName;
        }

        // birth name is too long, so try successive shorter versions, but first determine a few fields with which
        // to construct shorter versions
        const lastNameAtBirth = person._data.LastNameAtBirth;
        const hasSuffix = person._data.Suffix && person._data.Suffix.length > 0;
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

        let nameToReturn = "";
        if (hasSuffix) {
            // Try <first name> <middle initials> <last name> <suffix>
            nameToReturn = `${firstName} ${middleInitials} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length < maxLength) {
                return nameToReturn;
            }

            // Try <first name> <last name> <suffix>
            nameToReturn = `${firstName} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length < maxLength) {
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
            if (nameToReturn.length < maxLength) {
                return nameToReturn;
            }

            // Try <first initial> <last name> <suffix>
            nameToReturn = `${firstInitial} ${lastNameAtBirthWithSuffix}`;
            if (nameToReturn.length < maxLength) {
                return nameToReturn;
            }
        }

        // Try <first name> <middle initials> <last name>
        nameToReturn = `${firstName} ${middleInitials} ${lastNameAtBirth}`;
        if (nameToReturn.length < maxLength) {
            return nameToReturn;
        }

        // Try <first name> <last name>
        nameToReturn = `${firstName} ${lastNameAtBirth}`;
        if (nameToReturn.length < maxLength) {
            return nameToReturn;
        }

        // Try <all initials> <last name>
        nameToReturn = `${allInitials} ${lastNameAtBirth}`;
        if (nameToReturn.length < maxLength) {
            return nameToReturn;
        }

        // Use <first initial> <last name>
        return `${firstInitial} ${lastNameAtBirth}`;
    }

    /**
     * Sort by the birth year from earliest to latest.
     */
    function sortByBirthDate(list) {
        list.sort((a, b) => {
            const aBirthYear = a._data.BirthDate ? a._data.BirthDate.split("-")[0] : "0000";
            const bBirthYear = b._data.BirthDate ? b._data.BirthDate.split("-")[0] : "0000";

            return aBirthYear - bBirthYear;
        });
    }
})();
