/*
 * This code was adpated from WikiTreeDynamicTreeViewer.js
 * We use the D3.js library to render the graph.
 *
 * The code currently makes use of getPerson API calls. Call counts come down to about one call per person being displayed
 * (in their own little box) plus one for each of their other spouses. This is regardless of whether it is for the initial
 * display, or when the tree is being expanded - every new person "in a box" requires an API call. Children that only
 * appear in drop-down lists do not need their own calls. They'll only need a call when they appear in their own box.
 * The opening display can therefore result in about 20 to 40 getPerson calls for a large family and 10 for a family
 * with 2 married children and 2 sets of grand-parents.
 *
 * At a high level it seems straight-forward to replace these calls with one or two getPerson calls, but when you dig
 * deeper, it gets complicated. None of the current api calls that retrieve more than one profile's data in one call, is
 * (imho) a good fit to give one everything one needs when retrieving more than one profile for the couples tree. The
 * reason for this is that one needs spousal and children data of the relatives.
 *
 * The result is that managing what you need to call when, in order to add the missing information that you did not get
 * the first time, becomes tricky. I think the current solution is a good one if you ignore the number of calls. However,
 * I don't think the latter is excessive. All people are cached, so there should be at most one call for any person added.
 * Sometimes a person is added as result of someone else's call and then, depending on where the user clicks, we might
 * have to make a call again for that person (to get info on relatives), but that will only happen once, if at all.
 * Since we are doing this at user click frequency, we should be ok as far as API call limits are concerned.  I might
 * be wrong, but unless there is compelling evidence for the need to reduce the number calls, I don't think it is
 * worthwhile to attempt it. You are welcome to prove me wrong, but you do it. :)  [Riël Smit, 4 Sep 2023]
 */

import { PeopleCache } from "./people_cache.js";
import { CacheLoader } from "./cache_loader.js";
import { CachedPerson } from "./cached_person.js";
import { Utils } from "../shared/Utils.js";

window.CouplesTreeView = class CouplesTreeView extends View {
    static #DESCRIPTION = "Click on the question mark in the green circle below right for help.";
    #container;
    constructor() {
        super();
        CachedPerson.init(new PeopleCache(new CacheLoader()));
    }

    meta() {
        return {
            title: "Couples Dynamic Tree",
            description: CouplesTreeView.#DESCRIPTION,
            docs: "https://www.wikitree.com/wiki/Space:Couples_Dynamic_Tree",
        };
    }

    init(container_selector, person_id) {
        // If we need to clear the cache whenever the focus of the tree changes, uncomment the next line
        // this.#peopleCache.clear();
        wtViewRegistry.setInfoPanel(CouplesTreeView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        this.#container = document.querySelector(container_selector);
        new CouplesTreeViewer(container_selector).loadAndDraw(person_id);
    }

    close() {
        this.#container.classList.remove("cvtc");
    }
};

(function () {
    // if addTestInfo is true, a person's (integer) id is displayed in their person box (to assist with reading
    // the debug logs) and, if debug logging is on (see index.html), the Person object is logged to the console
    // whenever one clicks in a person box (i.e. when the person pop-up is generated).
    const addTestInfo = typeof debugLoggingOn != "undefined" && debugLoggingOn && true;

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

    const HELP_TEXT = `
        <xx>[ x ]</xx>
        <h2 style="text-align: center">About The Couples Tree</h2>
        <p>The display combines the trees of two people that are in some relationship
           (e.g. in a marriage, or the parents of a child - a couple in other words) and shows the ancestors and descendants
           of both members of the couple. You can expand and contract the tree and change its focus as you please.
           See <a href="https://www.wikitree.com/wiki/Space:Couples_Dynamic_Tree" target="_blank">Couples Tree Help</a>
           for more detail.</p>
        <p>Navigation Summary
        <ul>
            <li>⇩ - show the children of a couple, or all the spouses of the other member of the couple.
            <li>⇧ - close the children or other spouses list.
            <li>⤇ - select this spouse for this couple (can only be done for the central couple and blood-line descendants).
            <li><img src="https://www.wikitree.com/images/icons/pedigree.gif"/> - make this person the focus of the tree.
            <li>+ : expand the tree.
            <li>– : prune this branch of the tree.
            <li>Click on a person to see more detail about that person.
            <li>Use your track pad (two finger drag) or mouse wheel to zoom the tree.
            <li>Click and drag to pan around.
        </ul>
        <p>You can double click in this box, or click the X in the top right corner to remove this About text.</p>`;

    /**
     * A Couple consists of two Persons that are either married, or are the parents of a child.
     * One of them is 'in focus', i.e. is the person of main interest in an ancestor or descendant
     * tree. A Couple may also consist of only a single Person if they do not have a (known) spouse.
     */
    class Couple {
        constructor(idPrefix, { a, b, focus, isRoot = false } = {}) {
            this.idPrefix = idPrefix;
            this.isRoot = isRoot;
            this.expanded = isRoot;
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
         *     arbitrary: A_a_a_b-<aId-<bId> (the root's father's father's mother's parents)
         *   for decendants couples
         *     root: D-<aId>-<bId>
         *     arbitrary: D_2_0_1-<aId-<bId> (the root's 3rd child's first child's 2nd child and partner)
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
            const fatherId = this.a ? this.a.getId() : undefined;
            const motherId = this.b ? this.b.getId() : undefined;
            const otherParent = this.getNotInFocus();
            const childrenIds = this.getInFocus().getChildrenIds() || new Set();
            let list = [];

            if (typeof otherParent == "undefined" || otherParent.isNoSpouse) {
                list = [...childrenIds];
            } else {
                const otherChildrenIds = otherParent.getChildrenIds() || new Set();
                for (const id of otherChildrenIds) {
                    if (childrenIds.has(id)) {
                        list.push(id);
                    }
                }
            }
            for (const i in list) {
                const c = CachedPerson.get(list[i]);
                list[i] = c;
            }
            return sortByBirthDate(list);
        }

        mayHaveChildren() {
            return this.a && this.b
                ? this.a.hasAChild() && this.b.hasAChild()
                : this.a?.hasAChild() || this.b?.hasAChild();
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
            return !this.children && this.hasAParent() && !this.expanded;
        }

        isDescendantExpandable() {
            return (
                !this.children &&
                !this.expanded &&
                this.mayHaveChildren() &&
                ((this.a && !this.a.getChildrenIds()) || (this.b && !this.b.getChildrenIds()))
            );
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
                return;
            }
            if (this.a && this.a.getId() == personId) {
                // Change b in this couple to newPartner
                this.b = updatePartner(this.a, newPartner) || this.b;
            } else {
                // Change a in this couple to newPartner
                this.a = updatePartner(this.b, newPartner) || this.a;
            }

            function updatePartner(stablePartner, newPartner) {
                if (!stablePartner.setPreferredSpouse(newPartner.getId())) {
                    console.error(
                        `${this.a.toString()} does not have ${newPartner.getId()} as a spouse. ` +
                            `Cannot change partner of couple ${this.toString()}`
                    );
                    return undefined;
                }
                // if newPartner has stablePartner as spouse, change their preferred spouse as well
                newPartner.setPreferredSpouse(personId);
                return newPartner;
            }
        }

        /**
         * Resfresh newPerson in the couple if it is part of the couple
         * @param {*} newPerson
         */
        refreshPerson(newPerson) {
            let oldPerson = undefined;
            let oldSpouse = undefined;
            let newId = newPerson.getId();
            if (this.a && this.a.getId() == newId) {
                oldPerson = this.a;
                oldSpouse = this.b;
            } else if (this.b && this.b.getId() == newId) {
                oldPerson = this.b;
                oldSpouse = this.a;
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
                // Refresh the other person in this Couple only if newPerson contains new data for them.
                // Note that the two people forming a Couple may not in fact be spouses of each other.
                const newSpouse = newPerson.getSpouse(oldSpouse.getId());
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
            // Move the ancestors out of the way rather than completely deleting them so we can restore them later
            if (this.a && this.a._data.Parents) {
                this.a._data._Parents = this.a._data.Parents;
                delete this.a._data.Parents;
            }
            if (this.b && this.b._data.Parents) {
                this.b._data._Parents = this.b._data.Parents;
                delete this.b._data.Parents;
            }
            this.expanded = false;
            if (this.children) delete this.children;
            return new Promise((resolve, reject) => {
                resolve(this);
            });
        }

        removeDescendants() {
            // Move the ancestors out of the way rather than completely deleting them so we can restore them later
            if (this.a && this.a._data.Children) {
                this.a._data._Children = this.a._data.Children;
                delete this.a._data.Children;
            }
            if (this.b && this.b._data.Children) {
                this.b._data._Children = this.b._data.Children;
                delete this.b._data.Children;
            }
            this.expanded = false;
            if (this.children) delete this.children;
            return new Promise((resolve, reject) => {
                resolve(this);
            });
        }

        toString() {
            return `${this.getId()}:[${this.a ? this.a.toString() : "none"}][${this.b ? this.b.toString() : "none"}]`;
        }
    } // End Couple class definition

    /**
     * CouplesTreeViewer
     */
    const CouplesTreeViewer = (window.CouplesTreeViewer = class CouplesTreeViewer {
        constructor(containerSelector) {
            const viewContainer = document.querySelector(containerSelector);
            viewContainer.classList.add("cvtc");
            const width = viewContainer.offsetWidth;
            const height = viewContainer.offsetHeight;

            // Add our own container so we can position things relative to it
            const container = document.createElement("div");
            container.id = "couples-view-container";
            viewContainer.append(container);

            // Add button for help text
            const helpButton = document.createElement("div");
            helpButton.id = "ct-help-button";
            helpButton.setAttribute("title", "About this");
            helpButton.textContent = "?";
            helpButton.addEventListener("click", function () {
                $("#ct-help-text").slideToggle();
            });
            container.append(helpButton);

            // Add the help text as a draggable pop-up
            const help = document.createElement("div");
            help.innerHTML = HELP_TEXT;
            help.id = "ct-help-text";
            help.addEventListener("dblclick", function () {
                $(this).slideToggle();
            });
            container.append(help);
            document.querySelector("#ct-help-text xx").addEventListener("click", function () {
                $(this).parent().slideUp();
            });
            $("#ct-help-text").draggable();

            const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
            this.svg = svg;
            const g = svg.append("g");

            // Setup zoom and pan
            const zoom = d3
                .zoom()
                .scaleExtent([0.1, 1])
                .on("zoom", function (event) {
                    g.attr("transform", event.transform);
                });
            svg.call(zoom);
            svg.call(zoom.transform, d3.zoomIdentity.scale(1).translate(originOffsetX, originOffsetY));

            // Setup controllers for the ancestor and descendant trees
            this.ancestorTree = new AncestorTree(g);
            this.descendantTree = new DescendantTree(g);

            const self = this;

            // Listen to tree events
            this.ancestorTree.setExpandCallback(function (couple) {
                return self.loadMore(couple, ANCESTORS);
            });

            this.descendantTree.setExpandCallback(function (couple) {
                return self.loadMore(couple, DESCENDANTS);
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
                .attrs({
                    id: "loader",
                    width: 20,
                    height: 20,
                })
                .append("image")
                .attrs({
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
            const self = this;
            self.richLoad(id).then(function (person) {
                condLog(`=======RICH_LOADed ${person.toString()}`, person);
                const aRoot = new Couple("A", { a: person, isRoot: true });
                const dRoot = new Couple("D", { a: person, isRoot: true });
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
         * each profile, we make getPerson calls (to get other spouses and children if
         * necessary) on each parent of the profile being richLoaded as well as on the
         * parents of his/her spouses.
         *
         * These calls are only made if we have not rerieved the relevant data in the past.
         */
        async richLoad(id, partnerId, direction) {
            condLog(`=======RICH_LOAD ${id}`);
            const person = await this.getFullPerson(id);
            condLog(`=======RICH_LOAD completed await getWithChildren ${person.toString()}`);
            return await this.loadRelated(person, partnerId, direction);
        }

        async loadRelated(person, partnerId, direction) {
            const self = this;
            let loadPromises = [];
            condLog(`=======RICH_LOAD loadRelated for ${person.toString()}`);

            // Collect promises for the names of step-parents, i.e. the names of the other spouses (if any)
            // of the father and mother of this person
            condLog(`loadRelated: getPromisesForParents of ${person.toString()}`);
            loadPromises = getPromisesForParents(person, loadPromises);

            // Add promises for loading of current partner with the names of all of their children and spouses
            const spouseId = partnerId || person._data.PreferredSpouseId;
            if (spouseId) {
                condLog(`loadRelated: get load promise for spouse ${spouseId}`);
                loadPromises.push(this.getFullPerson(spouseId));
            } else {
                condLog(`loadRelated called on Person ${person.toString()} without preferred spouse`, person);
            }
            // Add promises to load all the children, if we're expanding descendants. This is so that we can get
            // the names of all their spouses
            if (direction != ANCESTORS) {
                let childrenIds = person.getChildrenIds();
                if (childrenIds) {
                    condLog(`loadRelated Children`, childrenIds);
                    for (const childId of childrenIds) {
                        const child = person.getChild(childId);
                        if (child && !child.getSpouseIds()) {
                            condLog(`loadRelated: get promise for child ${childId}`);
                            loadPromises.push(this.getWithSpouses(childId));
                        }
                    }
                } else {
                    condLog(`loadRelated called on Person ${person.toString()} without Children[]`, person);
                }
            }

            // Now wait for all the above promises to complete and process the results
            condLog(`=======loadRelated awaiting promise fulfillment for ${person.toString()}`);
            let results = await Promise.all(loadPromises);
            condLog(`=======loadRelated promises fulfilled for ${person.toString()}`);

            // Get the person object for the partner
            let selectedSpouse = undefined;
            for (const newPerson of results) {
                const id = newPerson.getId();
                if (spouseId && spouseId == id) {
                    selectedSpouse = newPerson;
                    break;
                }
            }

            // Now that we have loaded the current person's selected spouse, make sure we have the names of all the
            // parents (including step-parents) and their children for this spouse as well. We need these to create
            // spouse and children drop-downs for the parents.
            loadPromises = [];
            if (selectedSpouse) {
                condLog(
                    `=======loadRelated get promises for step parents and their children of selected spouse ${selectedSpouse.toString()}`
                );
                loadPromises = getPromisesForParents(selectedSpouse, loadPromises);
            }
            // For the same reason as above, if we are expanding descendants, we also need the names of the other
            // spouses and children of each child's spouse.
            if (direction != ANCESTORS) {
                const children = person.getChildren();
                condLog("=======loadRelated get promises for spouses of children");
                for (const i in children) {
                    const child = children[i];
                    const spouseIds = child.getSpouseIds() || new Set();
                    for (const spouseId of spouseIds) {
                        condLog(`loadRelated: get promise for spouse ${spouseId} of child ${child.toString()}`);
                        loadPromises.push(self.getWithSpouses(spouseId));
                    }
                }
            }

            condLog(`=======loadRelated awaiting spouse-related promise fulfillment for ${person.toString()}`);
            results = await Promise.all(loadPromises);
            condLog(`=======loadRelated spouse-related promises fulfilled for ${person.toString()}`);

            return person;

            function getPromisesForParents(person, promises) {
                const parentIds = [person.getFatherId(), person.getMotherId()];
                for (const i in parentIds) {
                    const parentIds = [person.getFatherId(), person.getMotherId()];
                    const pId = parentIds[i];
                    if (pId) promises.push(self.getWithSpousesAndChildren(pId));
                }
                return promises;
            }
        } // end loadRelated

        /**
         * Load more ancestors or descendants. Update existing data in place
         */
        async loadMore(couple, direction) {
            const self = this;
            condLog(`loadMore for ${couple.toString()}`, couple);
            const oldPerson = couple.getInFocus();
            const oldSpouse = couple.getNotInFocus();
            const wasNotExpanded = oldPerson && !oldPerson.isFullyEnriched();
            if (direction != DESCENDANTS) {
                // Restore ancestors if we have contracted them before
                if (couple.a && couple.a._data._Parents) {
                    couple.a._data.Parents = couple.a._data._Parents;
                    delete couple.a._data._Parents;
                }
                if (couple.b && couple.b._data._Parents) {
                    couple.b._data.Parents = couple.b._data._Parents;
                    delete couple.b._data._Parents;
                }
            }
            if (direction != ANCESTORS) {
                // Restore descendants if we have contracted them before
                if (couple.a && couple.a._data._Children) {
                    couple.a._data.Children = couple.a._data._Children;
                    delete couple.a._data._Children;
                }
                if (couple.b && couple.b._data._Children) {
                    couple.b._data.Children = couple.b._data._Children;
                    delete couple.b._data._Children;
                }
            }
            const isNowExpanded = oldPerson && oldPerson.isFullyEnriched();
            if (wasNotExpanded) {
                if (!isNowExpanded) {
                    await self.richLoad(
                        oldPerson.getId(),
                        oldSpouse?.isNoSpouse ? null : oldSpouse?.getId(),
                        direction
                    );
                    condLog(`loadMore done for ${couple.toString()}`, couple);
                }
                couple.expanded = true;
                self.drawTree();
            } else {
                console.error("Attempted to loadMore for enriched person", oldPerson);
                return new Promise((resolve, reject) => {
                    resolve(couple);
                });
            }
        }

        removeAncestors(couple) {
            const self = this;
            condLog(`Removing Ancestors for ${couple.toString()}`, couple);
            return couple.removeAncestors().then(function () {
                couple.expanded = false;
                self.drawTree();
            });
        }

        removeDescendants(couple) {
            const self = this;
            condLog(`Removing Descendants for ${couple.toString()}`, couple);
            return couple.removeDescendants().then(function () {
                couple.expanded = false;
                self.drawTree();
            });
        }

        /**
         * This is the function that gets called (via callbacks in the tree) when the change partner button
         * is clicked.
         * @param {*} coupleId The id of couple node for which a partner needs to be changed
         * @param {*} personId The profile id of whose partner needs to be changes
         * @param {*} newPartnerID The profile id of the new partner
         */
        async changePartner(coupleId, personId, newPartnerID) {
            condLog(`======changePartner for ${personId} in couple node ${coupleId} to ${newPartnerID}`);

            // First make sure we have all the data for the new partner profile
            const newPartner = await this.richLoad(newPartnerID, personId);
            let foundRoot = false;

            // Find the couple node to change, remove it from the page and then change it
            const couples = d3
                .select(`#${coupleId}`)
                .remove()
                .each(function (d) {
                    changeIt(d.data);
                });

            // If we changed a root node, we also have to change the other tree's root node
            if (foundRoot) {
                d3.select(`#${flipRootId(coupleId)}`)
                    .remove()
                    .each(function (d) {
                        changeIt(d.data);
                    });
            }
            // Redraw the tree
            this.drawTree();

            function changeIt(couple) {
                if ([couple.a?.getId(), couple.b?.getId()].includes(+personId)) {
                    const subTree = couple.idPrefix.startsWith("A") ? "ancestor" : "descendant";
                    condLog(
                        `Changing partner for ${personId} in ${subTree} couple ${couple.toString()} to ${newPartnerID}`
                    );
                    foundRoot = foundRoot || couple.isRoot;
                    couple.changePartner(personId, newPartner);
                    condLog(`Couple changed to: ${couple.toString()}`, couple);
                } else {
                    console.error(
                        `Retrieved wrong couple ${couple.toString()}. It does not contain profile ${personId}`
                    );
                }
            }
            function flipRootId(id) {
                // A vicious hack!
                const prefix = id.slice(0, 1);
                if (prefix == "A") {
                    return `D${id.slice(1)}`;
                } else {
                    return `A${id.slice(1)}`;
                }
            }
        }

        /**
         * Draw/redraw the tree
         */
        drawTree(ancestorRoot, descendantRoot) {
            condLog("=======drawTree for:", ancestorRoot, descendantRoot, CachedPerson.getCache());
            if (ancestorRoot) {
                this.ancestorTree.setRoot(ancestorRoot);
            }
            if (descendantRoot) {
                this.descendantTree.setRoot(descendantRoot);
            }
            condLog("draw ancestorTree:", this.ancestorTree);
            this.ancestorTree.draw();
            condLog("draw descendantTree:", this.descendantTree);
            this.descendantTree.draw();
            condLog("drawTree done", this.ancestorTree, this.descendantTree);
            this.svg.node().querySelectorAll("foreignObject").forEach((e) => { e.setAttribute("height", Math.max(0.1, e.firstElementChild.clientHeight)); });  // https://github.com/wikitree/wikitree-dynamic-tree/issues/42
        }

        /**
         * Main WikiTree API calls
         */

        async getFullPerson(id) {
            return await CachedPerson.getWithLoad(id, ["Parents", "Spouses", "Children"]);
        }

        async getWithSpousesAndChildren(id) {
            return await CachedPerson.getWithLoad(id, ["Spouses", "Children"]);
        }

        async getWithSpouses(id) {
            return await CachedPerson.getWithLoad(id, ["Spouses"]);
        }
    }); // End CoupleTreeViewer class definition

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
            this.getChildrenFn = null;

            this._expand = function () {
                return $.Deferred().resolve().promise();
            };

            this._contract = function () {
                return $.Deferred().resolve().promise();
            };

            this._partnerChangeCallback = function () {
                return $.Deferred().resolve().promise();
            };

            this.treeLayout = d3
                .tree()
                .nodeSize([nodeHeight, nodeWidth])
                .separation(function () {
                    return 1;
                });
        }
        /**
         * @returns 'descendant' iff this is a descendant tree, otherwise returns 'ancestor'
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
            this.getChildrenFn = fn;
            return this;
        }
        /**
         * Set the root of the tree
         */
        setRoot(data) {
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
                const rootHierarchy = this.treeLayout(d3.hierarchy(this.root, this.getChildrenFn));
                const nodes = rootHierarchy.descendants();
                const links = rootHierarchy.links();
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
            const self = this;

            // Get a list of existing links
            const link = this.svg.selectAll("path.link." + this.selector).data(links, function (link) {
                return link.target.data.getId();
            });

            // Remove old links
            link.exit().remove();

            // Add new links
            link.enter()
                .append("path")
                .attr("class", "link " + this.selector)
                .merge(link)
                // Update the paths
                .attr("d", function (d) {
                    return self.elbow(d);
                });
        }
        /**
         * Helper function for drawing angled connecting lines
         * http://stackoverflow.com/a/10249720/879121
         */
        elbow(d) {
            const dir = this.direction;
            // offsetDir determines the direction of the offset of the startpoint of the elbow (i.e. the connector
            // from one node to the next): 0 - no offset, -1 - up, 1 - down
            let offsetDir;
            if (dir < 0) {
                offsetDir = 0;
            } else {
                const dx = d.target.x - d.source.x;
                if (dx < 0) {
                    offsetDir = -1;
                } else if (dx > 0) {
                    offsetDir = 1;
                } else if (d.target.data.idPrefix.endsWith("b")) {
                    offsetDir = 1;
                } else {
                    offsetDir = -1;
                }
            }

            const sourceX = d.source.x + offsetDir * halfBoxHeight,
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
            const self = this;

            // Get a list of existing nodes
            const nodeUpdate = this.svg.selectAll("g.couple." + this.selector).data(nodes, function (d) {
                return d.data.getId();
            });

            // Remove old nodes
            nodeUpdate.exit().remove();

            // Add new nodes. We flag the root nodes so we can easily find and remove them if we change
            // a partner in the root node (the only node where we're allowed to do so)
            const nodeEnter = nodeUpdate
                .enter()
                .append("g")
                .attrs({
                    class: function (d) {
                        return "couple " + self.selector + (d.data.isRoot ? " root" : "");
                    },
                    id: function (d) {
                        return d.data.getId();
                    },
                });

            // Draw the person boxes
            nodeEnter
                .append("foreignObject")
                .attrs({
                    width: boxWidth,
                    height: 0.01,
                    x: -halfBoxWidth,
                    y: function (d) {
                        return d.data.hasNoSpouse() ? -halfBoxHeight : -boxHeight;
                    },
                })
                .style("overflow", "visible") // so the name will wrap
                .append((d) => {
                    return self.drawCouple(d.data);
                });

            const allNodes = nodeEnter.merge(nodeUpdate);

            // Draw the plus icons
            const expandable = allNodes.filter(function (d) {
                return !d.children && self.direction == ANCESTORS
                    ? d.data.isAncestorExpandable()
                    : d.data.isDescendantExpandable();
            });

            const contractable = allNodes.filter(function (d) {
                return d.children != undefined;
            });

            self.drawPlus(expandable.data(), this.selector);

            self.drawMinus(contractable.data(), this.selector);

            this.svg.selectAll(".box").on("click", function (event, d) {
                event.stopPropagation();
                let person = undefined;
                if (this.classList.contains("L")) {
                    person = this.parentNode.__data__.data.a;
                } else if (this.classList.contains("R")) {
                    person = this.parentNode.__data__.data.b;
                } else {
                    return;
                }
                if (event.altKey) {
                    // provide a way to examine the current node and internal person structure
                    console.log(person.toString(), person, this.parentNode.__data__);
                    return;
                }
                self.personPopup(person, d3.pointer(event, self.svg.node()));
            });

            // Set up behaviour of the "change partner" buttons in the descendant tree and the
            // ancestor tree root (the only places where it is allowed).
            this.svg.selectAll(".select-spouse-button").on("click", function (event) {
                event.stopPropagation();
                const coupleId = this.getAttribute("couple-id");
                const personId = this.getAttribute("person-id");
                const newPartnerId = this.getAttribute("spouse-id");
                self._partnerChangeCallback(coupleId, personId, newPartnerId);
            });

            // Position
            allNodes.attr("transform", function (d) {
                return "translate(" + self.direction * d.y + "," + d.x + ")";
            });
        }

        drawCouple(couple) {
            const div = document.createElement("div");  // Not xhtml:div, that's a D3 hack
            if (!couple.a || !couple.a.isNoSpouse) {
                div.appendChild(this.drawPerson(couple, L));
            }
            if (!couple.b || !couple.b.isNoSpouse) {
                div.appendChild(this.drawPerson(couple, R));
            }
            if (this.direction == ANCESTORS) {
                const children = couple.getJointChildren();
                if (children.length > 0) {
                    div.appendChild(this.drawChildrenList(couple, children));
                }
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
            let shortName = "?";
            let lifeSpan = "? - ?";
            let displayName = null;

            if (person) {
                shortName = getShortName(person);
                displayName = person.getDisplayName();
                lifeSpan = lifespan(person);
            }
            const div = document.createElement("div");
            div.className = `person box ${side == R ? "R" : "L"}`;
            div.setAttribute("data-gender", gender);
            div.setAttribute("data-infocus", inFocus);
            if (person) {
                div.setAttribute("title", `Click to show more detail on ${displayName}`);
            }

            // Add spouse list behind a button
            const mayChangeSpouse = couple.isRoot || (this.direction == DESCENDANTS && !inFocus);
            const [button, spouseList] = getSpouseSelection(couple, person, spouse, mayChangeSpouse);
            if (button) {
                spouseList.setAttribute("data-gender", gender);
                const nameWrapper = document.createElement("div");
                nameWrapper.className = "cname";
                nameWrapper.appendChild(button);
                nameWrapper.appendChild(document.createTextNode(shortName));
                div.appendChild(nameWrapper);
                div.appendChild(aDivWith("lifespan", lifeSpan));
                div.appendChild(spouseList);
            } else {
                div.appendChild(aDivWith("cname", shortName));
                div.appendChild(aDivWith("lifespan", lifeSpan));
            }
            return div;
        }

        drawChildrenList(couple, children) {
            const listDiv = document.createElement("div");
            listDiv.className = "children-list";
            listDiv.style.display = "none";

            const childrenList = document.createElement("ol");
            for (const child of children) {
                const item = document.createElement("li");
                const childName = getShortName(child);
                item.appendChild(
                    aDivWith(
                        "aChild",
                        aProfileLink(childName, child.getWtId()),
                        document.createTextNode(" "),
                        aTreeLink(childName, child.getWtId())
                    )
                );
                childrenList.appendChild(item);
            }
            listDiv.appendChild(childrenList);

            const wrapper = document.createElement("div");
            wrapper.className = "children-list-wrapper";

            const button = document.createElement("button");
            button.className = "drop-button";

            const aName = couple.a && !couple.a.isNoSpouse ? getShortName(couple.a) : null;
            const bName = couple.b && !couple.b.isNoSpouse ? getShortName(couple.b) : null;
            let combinedName = aName;
            if (bName) {
                if (aName) {
                    combinedName += ` and ${bName}`;
                } else {
                    combinedName = bName;
                }
            }
            button.setAttribute("title", `Show the children of ${combinedName}`);

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
                    button.setAttribute("title", `Hide the children of ${combinedName}`);
                } else {
                    listDiv.style.display = "none";
                    button.replaceChild(down, up);
                    button.setAttribute("title", `Show the children of ${combinedName}`);
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
            const self = this;

            let buttons = self.svg.selectAll("g.plus." + selector).data(couples, function (d) {
                return d.data.getId();
            });

            buttons.exit().remove();

            buttons = buttons
                .enter()
                .append(drawPlus(selector))
                .on("click", function (event, d) {
                    const plus = d3.select(this);
                    const loader = self.svg
                        .append("image")
                        .attrs({
                            "height": 16,
                            "width": 16,
                            "transform": plus.attr("transform"),
                            "xlink:href": "https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif",
                        })
                        .attr("transform", function () {
                            const y = self.direction * (d.y + halfBoxWidth + 12);
                            return "translate(" + y + "," + (d.x - 8) + ")";
                        });
                    plus.remove();
                    self._expand(d.data).then(function () {
                        loader.remove();
                    });
                })
                .merge(buttons);

            buttons.attr("transform", function (d) {
                const y = self.direction * (d.y + halfBoxWidth + 20);
                return "translate(" + y + "," + d.x + ")";
            });
        }
        drawMinus(couples, selector) {
            const self = this;

            let buttons = self.svg.selectAll("g.minus." + selector).data(couples, function (d) {
                return d.data.getId();
            });

            buttons.exit().remove();

            buttons = buttons
                .enter()
                .append(drawMinus(selector))
                .on("click", function (event, d) {
                    const minus = d3.select(this);
                    const loader = self.svg
                        .append("image")
                        .attrs({
                            height: 16,
                            width: 16,
                            // transform: minus.attr('transform'),
                            // 'xlink:href': 'https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif',
                        })
                        .attr("transform", function () {
                            const y = self.direction * (d.y + halfBoxWidth + 12);
                            return "translate(" + y + "," + (d.x - 8) + ")";
                        });
                    minus.remove();
                    self._contract(d.data).then(function () {
                        loader.remove();
                    });
                })
                .merge(buttons);

            buttons.attr("transform", function (d) {
                const y = self.direction * (d.y + halfBoxWidth + 20);
                return "translate(" + y + "," + d.x + ")";
            });
        }
        /**
         * Show a popup for the person.
         */
        personPopup(person, xy) {
            this.removePopups();
            if (!person || person.isNoSpouse) {
                return;
            }

            if (addTestInfo) {
                condLog(`${person.toString()}`, person);
            }

            let photoUrl = person.getPhotoUrl(75),
                treeUrl = window.location.pathname + "?id=" + person.getWtId();

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
            const displayName = person.getDisplayName();

            const popup = this.svg
                .append("g")
                .attr("class", "popup")
                .attr("transform", "translate(" + xy[0] + "," + xy[1] + ")");

            popup
                .append("foreignObject")
                .attrs({
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
						    <a href="https://www.wikitree.com/wiki/${person.getWtId()}" title="Open the profile of ${displayName} on a new page" target="_blank">${displayName}</a>
						    <span class="tree-links">
                                <a href="#name=${person.getWtId()}" title="Make ${person.getDisplayName()} the centre of the tree"><img src="https://www.wikitree.com/images/icons/pedigree.gif" /></a>
                                <a href="#name=${person.getWtId()}&view=fanchart"  title="Open a fan chart for ${displayName} on a new page" target="_blank"><img src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></a>
                            </span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>

				</div>
			`);

            d3.select("#couples-view-container").on("click", function () {
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
    } // End Tree class definition

    /**
     * Manage the ancestors tree
     */
    class AncestorTree extends Tree {
        constructor(svg) {
            super(svg, ANCESTORS);

            this.children(function (couple) {
                condLog(`AncestorTree children for ${couple.toString()}`, couple);
                const children = [];
                if (couple.a?.getExpandedParentIds()) {
                    const father = couple.a.getFather();
                    const mother = couple.a.getMother();
                    if (father || mother) {
                        children.push(new Couple(couple.idPrefix + "_a", { a: father, b: mother }));
                    }
                }
                if (couple.b?.getExpandedParentIds()) {
                    const father = couple.b.getFather();
                    const mother = couple.b.getMother();
                    if (father || mother) {
                        children.push(new Couple(couple.idPrefix + "_b", { a: father, b: mother }));
                    }
                }
                condLog(`Returning AncestorTree children for ${couple.toString()}`, children);
                return children;
            });
        }
    } // End AncestorTree class definition

    /**
     * Manage the descendants tree
     */
    class DescendantTree extends Tree {
        constructor(svg) {
            super(svg, DESCENDANTS);

            this.children(function (couple) {
                condLog(`Determining DescendantTree children for ${couple.toString()}`, couple);
                // Convert children map to an array of couples
                const children = couple.getJointChildren();
                const list = [];

                for (const i in children) {
                    list.push(new Couple(`${couple.idPrefix}_${i}`, { a: children[i] }));
                }

                condLog(`Returning DescendantTree children for ${couple.toString()}`, list);
                return list;
            });
        }
    } // End DescendantTree class definition

    /**
     * Create an unattached svg group representing the plus sign
     */
    function drawPlus(selector) {
        return function () {
            const group = d3.select(document.createElementNS(d3.namespaces.svg, "g")).attr("class", "plus " + selector);
            group.append("circle").attrs({
                cx: 0,
                cy: 0,
                r: 10,
            });

            group.append("path").attr("d", "M0,5v-10M5,0h-10");
            group
                .append("title")
                .text(`Add more ${selector}s to the ${selector == "ancestor" ? "right" : "left"} at this point`);

            return group.node();
        };
    }

    /**
     * Create an unattached svg group representing the minus sign
     */
    function drawMinus(selector) {
        return function () {
            const group = d3
                .select(document.createElementNS(d3.namespaces.svg, "g"))
                .attr("class", "minus " + selector);

            group.append("circle").attrs({
                cx: 0,
                cy: 0,
                r: 10,
            });

            group.append("path").attr("d", "M5,0h-10");
            group
                .append("title")
                .text(`Hide the ${selector}s to the ${selector == "ancestor" ? "right" : "left"} of this point`);

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

        let lifespan = addTestInfo ? `${person.getId()}:` : "";
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
        const date = humanDate(person.getBirthDate()),
            place = person.getBirthLocation();

        return `B. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    /**
     * Generate text that display when and where the person died
     */
    function deathString(person) {
        const date = humanDate(person.getDeathDate()),
            place = person.getDeathLocation();

        return `D. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /**
     * Turn a wikitree formatted date into a humanreadable date
     */
    function humanDate(dateString) {
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            const parts = dateString.split("-"),
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

        let nameToReturn;
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
        const firstInitial = firstName.substring(0, 1);
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

    /**
     * Sort a list of people by their birth date from earliest to latest.
     * People with no birth year is put last.
     */
    function sortByBirthDate(list) {
        return list.sort((a, b) => {
            const aBirthDate = Utils.dateObject(a.getBirthDate());
            const bBirthDate = Utils.dateObject(b.getBirthDate());

            return aBirthDate - bBirthDate;
        });
    }

    /**
     * For the given couple, conisting of 'person' and 'currentSpouse', determine the list of all
     * spouses of currentSpouse. This list will therefore contain 'person' as well as the possible
     * other spouses of their spouse 'currentSpouse'.
     * @param {*} couple The couple containing 'person' and 'currentSpouse'
     * @param {*} person The current partner of 'currentSpouse' in couple
     * @param {*} currentSpouse The current spouse of 'person' in couple
     * @param {*} mayChangeSpouse true iff we are allowed to add a 'change partner' button
     * @returns [botton, spouseList] where button is a 'show other spouses' button and will be
     *          undefined if there is only one spouse
     */
    function getSpouseSelection(couple, person, currentSpouse, mayChangeSpouse) {
        if (!currentSpouse) return [];
        const currentSpouseFullName = currentSpouse.getDisplayName();

        // Collect a list of the names and lifespans of all the spouses of currentSpouse
        const spouses = currentSpouse.getSpouses();
        const list = [];
        if (spouses) {
            for (const s in spouses) {
                const spouse = spouses[s];
                const mDate = currentSpouse._data.MarriageDates[spouse.getId()].marriage_date;
                list.push({
                    id: spouse.getId(),
                    name: getShortName(spouse),
                    lifespan: lifespan(spouse),
                    wtId: spouse.getWtId(),
                    mDate: mDate,
                    msDate: Utils.dateObject(mDate),
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

        const wrapper = document.createElement("div");
        wrapper.className = "box alt-spouse-list-wrapper";
        wrapper.setAttribute("title", ""); // prevent the spouse box's title from being actibe here
        wrapper.style.display = "none";
        const heading = document.createElement("h4");
        heading.textContent = `Spouses of ${getShortName(currentSpouse)}`;
        wrapper.appendChild(heading);

        const listDiv = document.createElement("div");
        listDiv.className = "spouse-list";

        const spouseList = document.createElement("ol");
        for (const spouseData of list) {
            const item = document.createElement("li");
            item.appendChild(aDivWith("altSpouse", aProfileLink(spouseData.name, spouseData.wtId)));
            const lifespanDiv = aDivWith(
                "lifespan",
                document.createTextNode(spouseData.lifespan),
                document.createTextNode(" "),
                aTreeLink(spouseData.name, spouseData.wtId)
            );
            if (mayChangeSpouse && person.getId() != spouseData.id) {
                // Create a "change partner" button
                const button = document.createElement("button");
                button.className = "select-spouse-button";
                button.textContent = RIGHT_ARROW;
                button.setAttribute("couple-id", couple.getId());
                button.setAttribute("person-id", currentSpouse.getId());
                button.setAttribute("spouse-id", spouseData.id);
                button.setAttribute("title", `Change ${currentSpouseFullName}'s spouse to ${spouseData.name}`);
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
        button.setAttribute("title", `Show other spouses of ${currentSpouseFullName}`);
        button.onclick = (event) => {
            if (wrapper.style.display == "none") {
                // Ensure we bring the spouses list to the front
                // This is hacky code and should be improved ... if you know how
                d3.select(wrapper).each(function () {
                    let childNode = this.parentNode.parentNode; // should be the div node
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
                button.setAttribute("title", `Hide other spouses of ${currentSpouseFullName}`);
            } else {
                wrapper.style.display = "none";
                button.textContent = DOWN_ARROW;
                button.setAttribute("title", `Show other spouses of ${currentSpouseFullName}`);
            }
            event.stopPropagation();
        };
        wrapper.appendChild(listDiv);
        return [button, wrapper];
    }

    function aDivWith(itsClass, ...elements) {
        const div = document.createElement("div");
        if (itsClass) div.className = itsClass;
        div.append(...elements);
        return div;
    }

    function aSpanWith(itsClass, ...elements) {
        const div = document.createElement("span");
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
        const profileLink = document.createElement("a");
        profileLink.appendChild(document.createTextNode(itsText));
        profileLink.href = `https://www.wikitree.com/wiki/${personId}`;
        profileLink.target = "_blank";
        profileLink.setAttribute("title", `Open the profile of ${itsText} on a new page`);
        return profileLink;
    }

    function aTreeLink(shortName, wtId) {
        // Icon and link to dynamic tree
        const img = document.createElement("img");
        img.src = "https://www.wikitree.com/images/icons/pedigree.gif";
        const treeLink = document.createElement("a");
        treeLink.href = `#name=${wtId}`;
        treeLink.appendChild(img);
        treeLink.setAttribute("title", `Make ${shortName} the centre of the tree`);
        return treeLink;
    }
})();
