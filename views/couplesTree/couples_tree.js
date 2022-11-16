/*
 * We use the D3.js library to render the graph.
 */
window.CouplesTreeView = class CouplesTreeView extends View {
    #peopleCache = new PeopleCache();
    constructor() {
        super();
    }

    meta() {
        return {
            title: "Couples Dynamic Tree",
            description:
                "&#x21e9; - see children or other spouses (&#x21e7 to restore); " +
                "&#x2907; - select this spouse for this couple (can only be done for central couple and blood-line descendants); " +
                '<img src="https://www.wikitree.com/images/icons/pedigree.gif" /> - make this person the focus of the tree; ' +
                "+/- : expand/prune the tree. " +
                "Click on a person to see more detail. Use track pad or mouse wheel to zoom the tree. Click and drag to pan around.",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        let self = this;
        /**
         * Register a new makePerson function with the Person class.
         * The idea is to construct a person object from the given data object rerieved via an API call,
         * except, if a person with the given id already exists in our cache,
         * meeting the requirements defined by the cache, the cached person is returned.
         *
         * @param {*} data A JSON object for a person retrieved via the API
         * @returns a Person object. It will also have been cached for re-use if the cache
         * is enabled.
         */
        Person.setMakePerson(function (data) {
            const cachedPerson = self.#peopleCache.getWithData(data);
            if (cachedPerson) {
                return cachedPerson;
            }
            const newPerson = new Person(data);
            self.#peopleCache.add(newPerson);
            return newPerson;
        });
        Person.setLogging(localTesting);
        new CouplesTreeViewer(container_selector, this.#peopleCache).loadAndDraw(person_id);
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
    const RIGHT_ARROW = "\u2907";

    const NAME_FIELDS = [
        "Id",
        "Name",
        "FirstName",
        "LastNameCurrent",
        "LastNameAtBirth",
        "Suffix",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "MiddleInitial",
        "BirthDate",
        "DeathDate",
    ];

    const REQUIRED_FIELDS = [
        ...NAME_FIELDS,
        "BirthLocation",
        "DeathLocation",
        "Mother",
        "Father",
        "DataStatus",
        "Parents",
        "Spouses",
        "Children",
        "Photo",
        "Gender",
    ];

    const REQUIRED_FIELDS_NO_CHILDREN = REQUIRED_FIELDS.filter((item) => item != "Children");

    /**
     * A Couple consists of two Persons that are either married, or are the parents of a child.
     * One of them is 'in focus', i.e. is the person of main interest in an ancestor or descendant
     * tree. A Couple may also consist of only a single Person if they do not have a (known) spouse.
     */
    class Couple {
        constructor(idPrefix, { a, b, focus, isRoot = false } = {}) {
            this.idPrefix = idPrefix;
            this.isRoot = isRoot;
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
            condLog(`new Couple: ${this.toString()}, focus=${this.focus}`, this.a, this.b);
        }

        /**
         * We append the profile id of the 2 partners in the couple, to the couple's idPrefix to form its ID.
         * The way we currently use idPrefixes results in the following ids:
         *   for ancestor couples:
         *     root: A-<aId>-<bId>
         *     arbitrary: A_a_a_b-<aId-<bId> (the father's father's mother's parents)
         *   for decendants couples
         *     root: D-<aId>-<bId>
         *     arbitrary: D_2_0_1-<aId-<bId> (the 3rd child's first child's 2nd child and partner)
         * @returns The ID of the current couple
         */
        getId() {
            return `${this.idPrefix}-${this.a?.getId() || ""}-${this.b?.getId() || ""}`;
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

        /**
         * Change the partner of personId to newPartner
         * @param {*} personId the id of the couple member whose partner should change
         * @param {*} newPartner the new partner
         */
        changePartner(personId, newPartner) {
            if (![this.a?.getId(), this.b?.getId()].includes(+personId)) {
                console.error(
                    `Could not find profile id ${personId} in couple ${this.toString()} in order to change their partner`
                );
            } else {
                if (this.a && this.a.getId() == personId) {
                    // Change b
                    if (this.a.setCurrentSpouse(newPartner.getId())) {
                        this.b = newPartner;
                    } else {
                        console.error(
                            `${this.a.toString()} does not have ${newPartner.getId()} as a spouse. ` +
                                `Cannot change partner of couple ${this.toString()}`
                        );
                    }
                } else {
                    // Change a
                    if (this.b.setCurrentSpouse(newPartner.getId())) {
                        this.a = newPartner;
                    } else {
                        console.error(
                            `${this.b.toString()} does not have ${newPartner.getId()} as a spouse. ` +
                                `Cannot change partner of couple ${this.toString()}`
                        );
                    }
                }
            }
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
            return `${this.getId()}:[${this.a ? this.a.toString() : "none"}][${this.b ? this.b.toString() : "none"}]`;
        }
    }

    /**
     * CouplesTreeViewer
     */
    let CouplesTreeViewer = (window.CouplesTreeViewer = class CouplesTreeViewer {
        constructor(selector, peopleCache) {
            this.peopleCache = peopleCache;

            let container = document.querySelector(selector),
                width = container.offsetWidth,
                height = container.offsetHeight;

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
            this.ancestorTree = new AncestorTree(svg);
            this.descendantTree = new DescendantTree(svg);

            let self = this;

            // Listen to tree events
            this.ancestorTree.setExpandCallback(function (couple) {
                return self.loadMore(couple);
            });

            this.descendantTree.setExpandCallback(function (couple) {
                return self.loadMore(couple);
            });

            this.ancestorTree.setContractCallback(function (couple) {
                return self.removeAncestors(couple);
            });

            this.descendantTree.setContractCallback(function (couple) {
                return self.removeDescendants(couple);
            });

            // Register callback for root partner change
            this.ancestorTree.setPartnerChangeCallback(function (coupleId, personId, newPartnerId) {
                return self.changePartner(coupleId, personId, newPartnerId);
            });

            this.descendantTree.setPartnerChangeCallback(function (coupleId, personId, newPartnerId) {
                return self.changePartner(coupleId, personId, newPartnerId);
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
        }

        /**
         * Load and display a person and their spouse
         */
        loadAndDraw(id) {
            condLog(`loadAndDraw(${id})`);
            let self = this;
            self.richLoad(id).then(function (person) {
                condLog(`=======RICH_LOADed ${person.toString()}`, person);
                let aRoot = new Couple("A", { a: person, isRoot: true });
                let dRoot = new Couple("D", { a: person, isRoot: true });
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
            condLog(`=======RICH_LOAD completed await getWithChildren ${person.toString()}`);
            return await this.loadRelated(person);
        }

        async loadRelated(person) {
            let self = this;
            let loadPromises = [];
            condLog(`=======RICH_LOAD loadRelated for ${person.toString()}`);

            // Collect promises for the names of step-parents, i.e. the names of the other spouses (if any)
            // of the father and mother of this person
            condLog(`loadRelated: getPromisesforNamesOfStepParentsAndChildren of ${person.toString()}`);
            loadPromises = getPromisesforNamesOfStepParentsAndChildren(person, loadPromises);

            // Add promises for loading all spouses with the names of all of their children and spouses
            const spouses = person.getSpouses();
            if (spouses) {
                condLog(`loadRelated Spouses`, spouses);
                for (let i in spouses) {
                    condLog(`loadRelated: get load promise for ${spouses[i].toString()}`);
                    loadPromises.push(this.getWithChildren(spouses[i].getId()));
                }
            } else {
                condLog(`loadRelated called on Person ${person.toString()} without Spouses[]`, person);
            }
            // Add promises to load all the children (but without their children). This is so that we can get
            // the names of all their spouses
            const children = person.getChildren();
            if (children) {
                condLog(`loadRelated Children`, children);
                for (let i in children) {
                    condLog(`loadRelated: get loadWithoutChildren promise for ${children[i].toString()}`);
                    loadPromises.push(this.getWithoutChildren(children[i].getId()));
                }
            } else {
                condLog(`loadRelated called on Person ${person.toString()} without Children[]`, person);
            }

            // Now wait for all the above promises to complete and process the results
            condLog(`=======loadRelated awaiting promise fulfillment for ${person.toString()}`);
            let results = await Promise.all(loadPromises);
            condLog(`=======loadRelated promises fulfilled for ${person.toString()}`);
            for (let newPerson of results) {
                let id = newPerson.getId();
                if (spouses && spouses[id]) {
                    condLog(`loadRelated: Setting as spouse ${newPerson.toString()}`);
                    person._data.Spouses[id] = newPerson;
                } else if (children && children[id]) {
                    condLog(`loadRelated: Setting as child ${newPerson.toString()}`);
                    person._data.Children[id] = newPerson;
                } else if (person._data.Parents && person._data.Parents[id]) {
                    condLog(`loadRelated: Updating due to getNamesOfRelatives on parent ${newPerson.toString()}`);
                    updateNames(person._data.Parents[id], newPerson);
                } else {
                    console.error(
                        `loadRelated ${person.toString()} Promises resolved for none of spouse, child or parent`,
                        newPerson
                    );
                }
            }

            // Now that we have loaded all the current person's spouses, make sure we have all parent (including
            // step-parents) and sibling names of each of these spouses as well, in order to create spouse and
            // children drop-downs for the parents.
            // For the same reason we also need the names of the other spouses of each child's spouse.
            loadPromises = [];
            if (spouses) {
                condLog("=======loadRelated get promises for spouses of spouses");
                for (let i in spouses) {
                    condLog(
                        `loadRelated: getPromisesforNamesOfStepParentsAndChildren for spouse ${spouses[i].toString()}`
                    );
                    loadPromises = getPromisesforNamesOfStepParentsAndChildren(spouses[i], loadPromises);
                }
            }
            if (children) {
                condLog("=======loadRelated get promises for spouses of children");
                for (let i in children) {
                    condLog(`loadRelated: getPromisesforNamesOfSpouses for spouse ${children[i].toString()}`);
                    loadPromises = getPromisesforNamesOfSpouses(children[i], loadPromises);
                }
            }

            condLog(`=======loadRelated awaiting spouses promise fulfillment for ${person.toString()}`);
            results = await Promise.all(loadPromises);
            condLog(`=======loadRelated spouse promises fulfilled for ${person.toString()}`);
            processResults: for (let newPerson of results) {
                let newPersonId = newPerson.getId();
                if (spouses) {
                    // Check if the new profile is one of the spouses' parents
                    for (let i in spouses) {
                        let spouseParents = spouses[i]._data.Parents || [];
                        if (spouseParents[newPersonId]) {
                            condLog(
                                `loadRelated: Setting as spouse's parent. spouse: ${
                                    spouses[i]
                                }, parent: ${newPerson.toString()}`
                            );
                            updateNames(spouseParents[newPersonId], newPerson);
                            continue processResults;
                        }
                    }
                }
                if (children) {
                    // Check if the new profile is one of the children's spouses
                    for (let i in children) {
                        let childSpouses = children[i].getSpouses() || [];
                        if (childSpouses[newPersonId]) {
                            condLog(
                                `loadRelated: Setting as child's spouse. child: ${
                                    children[i]
                                }, spouse: ${newPerson.toString()}`
                            );
                            updateNames(childSpouses[newPersonId], newPerson);
                            continue processResults;
                        }
                    }
                }
            }

            return person;

            // Obtain promises for the loading of the names of all the spouses and their children of the
            // parents of the given person
            function getPromisesforNamesOfStepParentsAndChildren(person, promises) {
                let parents = person._data.Parents || [];
                for (let p in parents) {
                    let parent = parents[p];
                    if (!parent.getSpouses()) {
                        condLog(`get names of spouses for ${parent.toString()}`);
                        promises.push(self.getNamesOfRelatives(parent.getId(), ["Spouses", "Children"]));
                    }
                }
                return promises;
            }

            function getPromisesforNamesOfSpouses(person, promises) {
                let spouses = person._data.Spouses || [];
                for (let s in spouses) {
                    let spouse = spouses[s];
                    if (!spouse.getSpouses()) {
                        condLog(`get names of spouses for ${spouse.toString()}`);
                        promises.push(self.getNamesOfRelatives(spouse.getId(), ["Spouses"]));
                    }
                }
                return promises;
            }

            function updateNames(person, newPerson) {
                condLog(`updateNames for ${person.toString()} from ${newPerson.toString()}`);
                if (person.getChildren()) {
                    console.error(`Unexpected update of Children for ${person.toString()}`, person, newPerson);
                } else if (newPerson.getChildren()) {
                    condLog(`Setting children of ${person.toString()}`, newPerson);
                    person.setChildren(newPerson.getChildren());
                }
                if (person.getSpouses()) {
                    console.error(`Unexpected update of Spouses for ${person.toString()}`, person, newPerson);
                } else if (newPerson.getSpouses()) {
                    condLog(`Setting spouses of ${person.toString()}`, newPerson);
                    person.copySpouses(newPerson);
                }
                if (person.getSiblings()) {
                    console.error(`Unexpected update of Siblings for ${person.toString()}`, person, newPerson);
                } else if (newPerson.getSiblings()) {
                    condLog(`Setting siblings of ${person.toString()}`, newPerson);
                    person.setSiblings(newPerson.getSiblings());
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
                            condLog(`loadMore: Rich loading spouse ${oldSpouse.toString()}`);
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
            const self = this;
            condLog(`Removing Ancestors for ${couple.toString()}`, couple);
            return couple.removeAncestors().then(function () {
                self.drawTree();
            });
        }

        removeDescendants(couple) {
            const self = this;
            condLog(`Removing Descendants for ${couple.toString()}`, couple);
            return couple.removeDescendants().then(function () {
                self.drawTree();
            });
        }

        /**
         * This is the function that gets called (via a callback in the tree) when the change partner button
         * is clicked.
         * @param {*} coupleId The id of couple node for which a partner needs to be changed
         * @param {*} personId The profile id of whose partner needs to be changes
         * @param {*} newPartnerID The profile id of the new partner
         */
        async changePartner(coupleId, personId, newPartnerID) {
            condLog(`======changePartner for ${personId} in couple node ${coupleId} to ${newPartnerID}`);

            // First make sure we have all the data for the new partner profile
            const newPartner = await this.richLoad(newPartnerID);
            let foundRoot = false;

            const changeIt = function (couple) {
                if ([couple.a?.getId(), couple.b?.getId()].includes(+personId)) {
                    const subTree = couple.idPrefix.startsWith("A") ? "ancestor" : "descendant";
                    condLog(
                        `Changing partner for ${personId} in ${subTree} couple ${couple.toString()} to ${newPartnerID}`
                    );
                    foundRoot = foundRoot || couple.isRoot;
                    couple.changePartner(personId, newPartner);
                    condLog(`Couple changed to: ${couple.toString()}`);
                } else {
                    console.error(
                        `Retrieved wrong couple ${couple.toString()}. It does not contain profile ${personId}`
                    );
                }
            };
            const flipRootId = function (id) {
                // A vicious hack!
                const prefix = id.slice(0, 1);
                if (prefix == "A") {
                    return `D${id.slice(1)}`;
                } else {
                    return `A${id.slice(1)}`;
                }
            };

            // Find the couple node to change, remove it it froom the page and then change it
            const couples = d3.select(`#${coupleId}`);
            const r = couples.remove();
            r.each(function (couple) {
                changeIt(couple);
            });

            // If we changed a root node, we also have to change the other tree's root node
            if (foundRoot) {
                d3.select(`#${flipRootId(coupleId)}`)
                    .remove()
                    .each(function (couple) {
                        changeIt(couple);
                    });
            }
            // Redraw the tree
            this.drawTree();
        }

        /**
         * Main WikiTree API calls
         */

        async getWithChildren(id) {
            return await this.getPerson(id, REQUIRED_FIELDS);
        }

        async getWithoutChildren(id) {
            return await this.getPerson(id, REQUIRED_FIELDS_NO_CHILDREN);
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

        /**
         * Return a promise for a person object with the given id.
         * If a person meeting the requirements already exists in our cache (if enabled)
         * the cached value is returned.
         * Otherwise a new API call is made and the promise will store the result (if successful)
         * in the cache (if enabled) before it is returned.
         *
         * @param {*} id The WikiTree ID of the person to retrieve
         * @param {*} fields An array of field names to retrieve for the given person
         * @returns a Person object
         */
        async getPerson(id, fields) {
            const cachedPerson = this.peopleCache.getWithFields(id, fields);
            if (cachedPerson) {
                return new Promise((resolve, reject) => {
                    resolve(cachedPerson);
                });
            }
            const newPerson = await this.getPersonViaAPI(id, fields);
            this.peopleCache.add(newPerson);
            return newPerson;
        }

        /**
         * To get a Person for a given id, we POST to the API's getPerson action. When we get a result back,
         * we convert the returned JSON data into a Person object.
         * Note that postToAPI returns the Promise from Javascript's fetch() call.
         * This function returns a Promise (as result of the await), which gets resolved after the await.
         * So we can use this through asynchronous actions with something like:
         *   getPersonViaAPI.then(function(result) {
         *      // the "result" here is a new Person object.
         *   });
         * or
         *   newPerson = await getPersonViaAPI(id, fields);
         *
         * @param {*} id The WikiTree ID of the person to retrieve
         * @param {*} fields An array of field names to retrieve for the given person
         * @returns a Promise
         */
        async getPersonViaAPI(id, fields) {
            const result = await WikiTreeAPI.postToAPI({
                action: "getPerson",
                key: id,
                fields: fields.join(","),
                resolveRedirect: 1,
            });
            return new WikiTreeAPI.Person(result[0].person);
        }

        async getNamesOfRelatives(id, namesOf) {
            let cachedPerson = this.peopleCache.getWithFields(id, namesOf);
            if (cachedPerson && cachedPerson.getChildren() && cachedPerson.getSpouses()) {
                condLog(`getNamesOfRelatives from cache ${cachedPerson.toString()}`);
                return new Promise((resolve, reject) => {
                    resolve(cachedPerson);
                });
            }

            let readFromCache = true;
            const options = {};
            if (namesOf.includes("Parents")) {
                readFromCache &&= cachedPerson && cachedPerson.getChildren();
                options.getParents = 1;
            }
            if (namesOf.includes("Spouses")) {
                readFromCache &&= cachedPerson && cachedPerson.getSpouses();
                options.getSpouses = 1;
            }
            if (namesOf.includes("Siblings")) {
                readFromCache;
                options.getSiblings = 1;
            }
            if (namesOf.includes("Children")) {
                readFromCache &&= cachedPerson && cachedPerson.getChildren();
                options.getChildren = 1;
            }

            const result = await WikiTreeAPI.getRelatives([id], NAME_FIELDS, options);
            // We do not cache the new person constructed here because it only contains name fields
            return new WikiTreeAPI.Person(result[0].person);
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

            this._partnerChangeCallback = function () {
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
        setExpandCallback(fn) {
            this._expand = fn;
            return this;
        }
        /**
         * Same as above, but for contracting the tree (i.e. removing a branch)
         */
        setContractCallback(fn) {
            this._contract = fn;
            return this;
        }
        setPartnerChangeCallback(fn) {
            this._partnerChangeCallback = fn;
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

            // Add new nodes. We flag the root nodes so we can easily find and remove them if we change
            // a partner in the root node (the only node where we're allowed to do so)
            let nodeEnter = node
                .enter()
                .append("g")
                .attr({
                    class: function (couple) {
                        return "couple " + self.selector + (couple.isRoot ? " root" : "");
                    },
                    id: function (couple) {
                        return couple.getId();
                    },
                });

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
            const e = node.exit();
            e.remove();

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

            // Set up behaviour of the "change partner" buttons in the descendant tree and the
            // ancestor tree root (the only places where it is allowed).
            this.svg.selectAll(".select-spouse-button").on("click", function (event) {
                d3.event.stopPropagation();
                const coupleId = this.getAttribute("couple-id");
                const personId = this.getAttribute("person-id");
                const newPartnerId = this.getAttribute("spouse-id");
                self._partnerChangeCallback(coupleId, personId, newPartnerId);
            });

            // Position
            node.attr("transform", function (d) {
                return "translate(" + self.direction * d.y + "," + d.x + ")";
            });
        }

        drawCouple(couple) {
            let div = document.createElement("xhtml:div");
            if (!couple.a || !couple.a.isNoSpouse) {
                div.appendChild(this.drawPerson(couple, L));
            }
            if (!couple.b || !couple.b.isNoSpouse) {
                div.appendChild(this.drawPerson(couple, R));
            }
            if (this.direction == ANCESTORS) {
                div.appendChild(this.drawChildrenList(couple));
            }
            return div;
        }
        /**
         * Draw a person box.
         */
        drawPerson(couple, side) {
            const person = side == R ? couple.b : couple.a;
            const spouse = side == R ? couple.a : couple.b;
            const inFocus = couple.focus == side;
            const gender = (person?.getGender() || "other").toLowerCase();
            let name = "?";
            let lifeSpan = "? - ?";

            if (person) {
                name = getShortName(person);
                lifeSpan = lifespan(person);
            }
            let div = document.createElement("div");
            div.className = `person box ${side == R ? "R" : "L"}`;
            div.setAttribute("data-gender", gender);
            div.setAttribute("data-infocus", inFocus);

            // Add spouse list behind a button
            let mayChangeSpouse = couple.isRoot || (this.direction == DESCENDANTS && !inFocus);
            let [button, spouseList] = getSpouseSelection(couple, person, spouse, mayChangeSpouse);
            if (button) {
                spouseList.setAttribute("data-gender", gender);
                let nameWrapper = document.createElement("div");
                nameWrapper.className = "cname";
                nameWrapper.appendChild(button);
                nameWrapper.appendChild(document.createTextNode(name));
                div.appendChild(nameWrapper);
                div.appendChild(aDivWith("lifespan", lifeSpan));
                div.appendChild(spouseList);
            } else {
                div.appendChild(aDivWith("cname", name));
                div.appendChild(aDivWith("lifespan", lifeSpan));
            }
            return div;
        }

        drawChildrenList(couple) {
            const listDiv = document.createElement("div");
            listDiv.className = "children-list";
            listDiv.style.display = "none";

            const children = couple.getJointChildren();
            const childrenList = document.createElement("ol");
            for (let child of children) {
                let item = document.createElement("li");
                item.appendChild(
                    aDivWith(
                        "aChild",
                        aProfileLink(getShortName(child), child.getName()),
                        document.createTextNode(" "),
                        aTreeLink(child.getName())
                    )
                );
                childrenList.appendChild(item);
            }
            listDiv.appendChild(childrenList);

            const wrapper = document.createElement("div");
            wrapper.className = "children-list-wrapper";

            const button = document.createElement("button");
            button.className = "drop-button";
            const up = document.createTextNode(`${UP_ARROW} Children [${children.length}]`);
            const down = aSpanWith(
                undefined,
                document.createTextNode(`${DOWN_ARROW}`),
                aSpanWith("button-words", document.createTextNode(` Children [${children.length}]`))
            );
            button.append(down);
            button.onclick = (event) => {
                if (listDiv.style.display == "none") {
                    // Ensure we bring the children list to the front.
                    // i.e. from the children list wrapper up to the view container, walk up the DOM tree,
                    // moving each node encountered to be the last child of its parent, which will ensure
                    // it gets rendered last and hence be on top of everything else.
                    // This code might be a bit brittle(?) - is there a better way?
                    d3.select(wrapper).each(function () {
                        let childNode = this;
                        let parentNode = childNode.parentNode;
                        do {
                            parentNode.appendChild(childNode);
                            childNode = parentNode;
                            parentNode = parentNode.parentNode;
                        } while (parentNode && parentNode.id !== "view-container");
                    });
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
                            "height": 16,
                            "width": 16,
                            "transform": plus.attr("transform"),
                            "xlink:href": "https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif",
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
                            height: 16,
                            width: 16,
                            // transform: minus.attr('transform'),
                            // 'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
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
                if (person.isFemale()) {
                    photoUrl = "images/icons/female.gif";
                } else if (person.isMale()) {
                    photoUrl = "images/icons/male.gif";
                } else {
                    photoUrl = "images/icons/no-gender.gif";
                }
            }
            const gender = (person?.getGender() || "other").toLowerCase();

            let popup = this.svg
                .append("g")
                .attr("class", "popup")
                .attr("transform", "translate(" + event[0] + "," + event[1] + ")");

            popup
                .append("foreignObject")
                .attr({
                    width: 400,
                    height: 300,
                })
                .style("overflow", "visible")
                .append("xhtml:div").html(`
				<div class="popup-box" data-gender="${gender}">
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
                        children.push(new Couple(couple.idPrefix + "_a", { a: father, b: mother }));
                    }
                }
                if (couple.b) {
                    let father = couple.b.getFather();
                    let mother = couple.b.getMother();
                    if (father || mother) {
                        children.push(new Couple(couple.idPrefix + "_b", { a: father, b: mother }));
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
                    list.push(new Couple(`${couple.idPrefix}_${i}`, { a: children[i] }));
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

        let lifespan = localTesting ? `${person.getId()}:` : "";
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

    function dateObject(dateStr) {
        let parts = (dateStr || "9999-12-31").split("-");
        // Unknown year goes last
        if (parts[0] && parts[0] == 0) parts[0] = 9999;
        if (parts[1] && parts[1] > 0) parts[1] -= 1;
        if (parts.length == 1) {
            parts[1] = 0;
        }
        return new Date(...parts);
    }

    /**
     * Sort a list of people by their birth date from earliest to latest.
     * People with no birth year is put last.
     */
    function sortByBirthDate(list) {
        return list.sort((a, b) => {
            const aBirthDate = dateObject(a.getBirthDate());
            const bBirthDate = dateObject(b.getBirthDate());

            return aBirthDate - bBirthDate;
        });
    }

    /**
     * Determine the list of all spouses of the partner (partner) of currentSpouse in couple.
     * @param {*} couple The couple containing the partner and currentSpouse
     * @param {*} partnerId The id of the current partner of currentSpouse
     * @param {*} currentSpouse The current spouse of the other partner in couple,
     * @param {*} mayChangeSpouse true iff we are allowed to add a 'change partner button'
     * @returns [botton, spouseList] where button is a 'show other spouses button and will be
     *          undefined if there is only one spouse
     */
    function getSpouseSelection(couple, partner, currentSpouse, mayChangeSpouse) {
        if (!currentSpouse) return [];

        // Collect a list of the names and lifespans of all the spouses of the given person
        let spouses = currentSpouse.getSpouses();
        let list = [];
        if (spouses) {
            for (let s in spouses) {
                let spouse = spouses[s];
                let mDate = currentSpouse._data.MarriageDates[spouse.getId()].marriage_date;
                list.push({
                    id: spouse.getId(),
                    name: getShortName(spouse),
                    lifespan: lifespan(spouse),
                    wtId: spouse.getName(),
                    mDate: mDate,
                    msDate: dateObject(mDate),
                });
            }
        }
        if (list.length <= 1) return [];

        // Sort the list of spouses
        ((spl) => {
            spl.sort((a, b) => {
                return a.msDate - b.msDate;
            });
        })(list);

        let wrapper = document.createElement("div");
        wrapper.className = "box alt-spouse-list-wrapper";
        wrapper.style.display = "none";
        let heading = document.createElement("h4");
        heading.textContent = `Spouses for ${getShortName(currentSpouse)}`;
        wrapper.appendChild(heading);

        let listDiv = document.createElement("div");
        listDiv.className = "spouse-list";

        let spouseList = document.createElement("ol");
        for (let spouseData of list) {
            let item = document.createElement("li");
            item.appendChild(aDivWith("altSpouse", aProfileLink(spouseData.name, spouseData.wtId)));
            let lifespanDiv = aDivWith(
                "lifespan",
                document.createTextNode(spouseData.lifespan),
                document.createTextNode(" "),
                aTreeLink(spouseData.wtId)
            );
            const x = currentSpouse.getId();
            const y = spouseData.id;
            if (mayChangeSpouse && partner.getId() != spouseData.id) {
                // Create a "change partner" button
                const button = document.createElement("button");
                button.className = "select-spouse-button";
                button.textContent = RIGHT_ARROW;
                button.setAttribute("couple-id", couple.getId());
                button.setAttribute("person-id", currentSpouse.getId());
                button.setAttribute("spouse-id", spouseData.id);
                // Note; the button's click behaviour is added in Tree.drawNodes()
                lifespanDiv.prepend(button);
            }
            item.appendChild(lifespanDiv);
            item.appendChild(aDivWith("marriage-date", document.createTextNode(`x ${spouseData.mDate}`)));
            spouseList.appendChild(item);
        }
        listDiv.appendChild(spouseList);

        // Create a "show other spouses" button
        const button = document.createElement("button");
        button.className = "drop-button";
        button.textContent = DOWN_ARROW;
        button.onclick = (event) => {
            if (wrapper.style.display == "none") {
                // Ensure we bring the spouses list to the front
                // This is hacky code and should be improved ... if you know how
                d3.select(wrapper).each(function () {
                    let childNode = this.parentNode.parentNode; // should be the xhtml:div node
                    if (childNode) {
                        let parentNode = childNode.parentNode;
                        do {
                            parentNode.appendChild(childNode);
                            childNode = parentNode;
                            parentNode = parentNode.parentNode;
                        } while (parentNode && parentNode.id !== "view-container");
                    }
                });
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

    function aDivWith(itsClass, ...elements) {
        div = document.createElement("div");
        if (itsClass) div.className = itsClass;
        div.append(...elements);
        return div;
    }

    function aSpanWith(itsClass, ...elements) {
        div = document.createElement("span");
        if (itsClass) div.className = itsClass;
        div.append(...elements);
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

    function aTreeLink(wtId) {
        // Icon and link to dynamic tree
        let img = document.createElement("img");
        img.src = "https://www.wikitree.com/images/icons/pedigree.gif";
        let treeLink = document.createElement("a");
        treeLink.href = `#name=${wtId}`;
        treeLink.appendChild(img);
        return treeLink;
    }
})();
