import { CachedPerson } from "../couplesTree/cached_person.js";

/**
 * A Couple consists of two Persons that are either married, or are the parents of a child.
 * One of them is 'in focus', i.e. is the person of main interest in an ancestor or descendant
 * tree. A Couple may also consist of only a single Person if they do not have a (known) spouse.
 */
export class Couple {
    static L = -1; // a
    static R = 1; // b

    #peopleCache;
    constructor(idPrefix, { a, b, focus, isRoot = false } = {}, peopleCache) {
        if (!peopleCache) {
            console.log("Gitcha");
        }
        this.#peopleCache = peopleCache;
        this.idPrefix = idPrefix;
        this.isRoot = isRoot;
        // this.expanded = isRoot;
        if (typeof b == "undefined") {
            if (typeof a == "undefined") {
                throw new Error("Attempting to create an empty couple");
            }
            b = a.getSpouse();
        }
        if (focus == Couple.L || focus == Couple.R) {
            this.focus = focus;
        } else {
            if (a) {
                this.focus = Couple.L;
            } else {
                this.focus = Couple.R;
            }
        }
        if ((focus == Couple.L && !a) || (focus == Couple.R && !b)) {
            console.error(`Internal ERROR: The focus of a couple cannot be undefined: a=${a}, b=${b}, focus=${focus}`);
        }

        // If a couple has a male partner, we want a male to be in a.
        // Similarly we want a female partner to be in b, if present.
        if ((a && a.isFemale() && (!b || !b.isFemale())) || (b && b.isMale() && (!a || !a.isMale()))) {
            // Swap a and b
            this.a = b?.getId();
            this.b = a?.getId();
            this.focus = -this.focus;
        } else {
            this.a = a?.getId();
            this.b = b?.getId();
            this.focus = this.focus;
        }
        this.setJointChildrenIds(this.getInFocus(), this.getNotInFocus());
        condLog(`new Couple: ${this.toString()}, focus=${this.focus}`, this.aPerson(), this.bPerson());
    }

    aPerson() {
        return this.get("a");
    }

    bPerson() {
        return this.get("b");
    }

    get(side) {
        const id = this[side];
        if (id == "0000") return CachedPerson.NoSpouse;
        if (!id) return undefined;
        const p = this.getPerson(id);
        if (!p) return new NotLoadedPerson(id);
        return p;
    }

    getPerson(id) {
        return this.#peopleCache.getIfPresent(id);
    }

    /**
     * Change the partner of personId to newPartner.
     * @param {*} personId the id of the couple member whose partner should change
     * @param {*} newPartner the new partner
     */
    changePartner(personId, newPartner) {
        // We don't actually change the couple, we just change the preferred spouse of the couple members.
        // This will cause a new couple (with new ID) to be generated when the hierarchy is being updated.
        if (![this.a, this.b].includes(+personId)) {
            console.error(
                `Could not find profile id ${personId} in couple ${this.toString()} in order to change their partner`
            );
            return;
        }
        const self = this;
        const stablePartner = this.a == personId ? this.getPerson(this.a) : this.getPerson(this.b);
        updatePartner(stablePartner, newPartner);
        // For now the stable partner will alwasy be the in-focus person (for a descendant tree).
        // This may change when we allow either partner of the root to be change, in which case we'll have to
        // change this code.
        this.setJointChildrenIds(stablePartner, newPartner);

        function updatePartner(stablePartner, newPartner) {
            if (!stablePartner) {
                console.error(`Could not find profile id ${personId} in peopleCache in order to change their partner`);
                return;
            }
            if (!stablePartner.setPreferredSpouse(newPartner.getId())) {
                console.error(
                    `${stablePartner.toString()} does not have ${newPartner.getId()} as a spouse. ` +
                        `Cannot change partner of couple ${self.toString()}`
                );
                return;
            }
            // if newPartner has stablePartner as spouse, change their preferred spouse as well
            newPartner.setPreferredSpouse(personId);
        }
    }
    /**
     * This id identifies the couple (i.e. a<Id of a>-b<Id of b>) and is unique per couple, but is not
     * unique in the tree if there is pedigree collapse.
     * @returns
     */
    getCoupleId() {
        return `a${this.a || ""}-b${this.b || ""}`;
    }

    /**
     * This id is used as D3 node ids and is unique for every node in the tree, regardless of pedigree collapse.
     * We append the profile id of the 2 partners in the couple as well as the number of collapsed joint children
     * (if > 0) to the couple's idPrefix to form its ID.
     * The way we currently use idPrefixes results in the following ids:
     *   for decendants couples with no collapsed children:
     *     root: D-<aId>-<bId>
     *     arbitrary: D_2_0_1-<aId-<bId> (the root's 3rd child's first child's 2nd child and partner)
     * If the above arbitrary couple has 2 collapsed children the id would be
     *     D_2_0_1-<aId-<bId>-c2
     * @returns The ID of the node represented by this couple
     */
    getId(withCollapse = true) {
        let descColl = "";
        let aId = this.a || "";
        let bId = this.b || "";

        if (withCollapse) {
            const ancestorTree = this.idPrefix.startsWith("A");
            if (ancestorTree) {
                if (aId && this.aPerson()?.parentsCollapsed?.includes(this.idPrefix)) aId += "c";
                if (bId && this.bPerson()?.parentsCollapsed?.includes(this.idPrefix)) bId += "c";
            } else {
                const hCnt = this.collapsedChildrenCount();
                if (hCnt) descColl = `-c${hCnt}`;
            }
        }
        return `${this.idPrefix}-${aId}-${bId}${descColl}`;
    }

    /**
     * @returns The unique couple id, but without the last, collapsed children count part
     */
    getIdSansCollapsed() {
        return this.getId(false);
    }

    getInFocus() {
        if (this.focus == Couple.R) {
            return this.bPerson();
        } else {
            return this.aPerson();
        }
    }

    isInFocus(side) {
        if (this.focus == Couple.R) {
            return side == "b";
        } else {
            return side == "a";
        }
    }

    getNrOlderGenerations() {
        return Math.max(this.aPerson()?.getNrOlderGenerations() || 0, this.bPerson()?.getNrOlderGenerations() || 0);
    }

    getNotInFocus() {
        if (this.focus == Couple.R) {
            return this.aPerson();
        } else {
            return this.bPerson();
        }
    }

    hasAParent() {
        return (this.a && this.aPerson()?.hasAParent()) || (this.b && this.bPerson()?.hasAParent());
    }

    hasNoSpouse() {
        return (this.a && this.aPerson()?.isNoSpouse) || (this.b && this.bPerson().isNoSpouse);
    }

    isAnAAncestor() {
        return this.idPrefix.slice(-1) == "a";
    }

    isAncestorExpandable() {
        return !this.children && this.hasAParent() && !this.isExpanded();
    }

    isComplete() {
        return this.a && this.b; // && aPerson() && bPerson(); ??????
    }

    isDescendantExpandable(show = false) {
        const aP = this.aPerson();
        const bP = this.bPerson();
        const noD3children = !this.children;
        const aNotExpanded =
            !this.a || (!aP?.isNoSpouse && aP?.getSpouseIds()?.size > 0 && aP?.getSpouses().length == 0);
        const bNotExpanded =
            !this.b || (!bP?.isNoSpouse && bP?.getSpouseIds()?.size > 0 && bP?.getSpouses().length == 0);
        const mayHaveCh = this.mayHaveChildren();
        const aNoChildIds = this.a && !aP?.getChildrenIds();
        const bNoChildIds = this.b && !bP?.getChildrenIds();
        const isExpandable =
            noD3children && (aNotExpanded || bNotExpanded || (mayHaveCh && (aNoChildIds || bNoChildIds)));
        if (show) {
            console.log(
                `isDescendantExpandable ${this.getId()}:\n` +
                    `noD3children=${noD3children} && (aNotExpanded=${aNotExpanded} || bNotExpanded=${bNotExpanded}) ` +
                    `|| (mayHaveCh=${mayHaveCh} && (aNoChildIds=${aNoChildIds} || bNoChildIds=${bNoChildIds})) = ${isExpandable}`
            );
        }
        return isExpandable;
    }

    isExpanded() {
        return this.isAExpanded() && this.isBExpanded();
    }

    isAExpanded() {
        if (typeof this.a == "undefined") return false;
        const aP = this.aPerson();
        return aP?.isNoSpouse || (aP?.getExpandedParentIds() && aP?.getSpouses());
    }

    isBExpanded() {
        if (typeof this.b == "undefined") return false;
        const bP = this.bPerson();
        return bP?.isNoSpouse || (bP?.getExpandedParentIds() && bP?.getSpouses());
    }

    mayHaveChildren() {
        return this.a && this.b
            ? this.aPerson()?.hasAChild() && this.bPerson()?.hasAChild()
            : this.aPerson()?.hasAChild() || this.bPerson()?.hasAChild();
    }

    // jointChildrenIds is ultimately an array of ids of children that both partners have in common.
    // We keep two maps (on the in-focus partner), shownChildrenIds and hiddenChildrenIds, with the
    // couple id prefix as key so that we can collapse parts of duplicated subtrees (in case of
    // pedigree collapse) separately.
    // This is used to list all the children of a couple and is used in descendant trees to
    // determine the D3 children of tree nodes.
    getJointChildrenIds() {
        return [...this.getUncollapsedChildrenIds(), ...this.getCollapsedChildrenIds()];
    }

    getUncollapsedChildrenIds() {
        const fPerson = this.getInFocus();
        const shown = fPerson.shownChildrenIds?.get(this.idPrefix);
        return shown || [];
    }

    getCollapsedChildrenIds() {
        const fPerson = this.getInFocus();
        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix);
        return hidden || [];
    }

    hasCollapsedChildren() {
        const fPerson = this.getInFocus();
        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix);
        return hidden && hidden.length > 0;
    }

    jointChildrenCount() {
        const fPerson = this.getInFocus();
        const shown = fPerson.shownChildrenIds?.get(this.idPrefix);
        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix);
        return (shown ? shown.length : 0) + (hidden ? hidden.length : 0);
    }

    collapsedChildrenCount() {
        const fPerson = this.getInFocus();
        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix);
        return hidden ? hidden.length : 0;
    }

    setJointChildrenIds(parent, otherParent) {
        const childrenIds = parent.getChildrenIds() || new Set();
        let common = [];

        if (typeof otherParent == "undefined" || otherParent.isNoSpouse) {
            common = [...childrenIds];
        } else {
            const otherChildrenIds = otherParent.getChildrenIds() || new Set();
            for (const id of otherChildrenIds) {
                if (childrenIds.has(id)) {
                    common.push(id);
                }
            }
        }

        const oldHidden = parent.hiddenChildrenIds?.get(this.idPrefix) || [];
        const newHidden = [];
        const shown = [];
        for (const id of common) {
            if (oldHidden.includes(id)) {
                newHidden.push(id);
            } else {
                shown.push(id);
            }
        }
        this.updateChildren(parent, shown, newHidden);
    }

    collapseAllChildren() {
        // Assume this is a couple in a descendant tree and we want to hide their descendants
        // Move all the entries in shownChildren to hiddenChildren, so we can restore them later.
        // Not that collapsedChildren may already contain some children that were previously collapsed
        // individually.
        const fPerson = this.getInFocus();
        const shown = fPerson.shownChildrenIds?.get(this.idPrefix);
        if (!shown || shown.length == 0) {
            return;
        }
        let hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix) || [];

        // move all children to hiddenChildren
        hidden = hidden.concat(shown);
        this.updateChildren(fPerson, [], hidden);
    }

    collapseChild(childId) {
        const fPerson = this.getInFocus();
        const shown = fPerson.shownChildrenIds?.get(this.idPrefix) || [];
        if (!shown.includes(childId)) return;

        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix) || [];
        moveChildById(childId, shown, hidden);
        this.updateChildren(fPerson, shown, hidden);
    }

    expandAllCollapsedChildren() {
        // If this couple has collapsed children, expand them by moving them back to jointChildren.
        // Returns true if there were collapsed children to expand.
        const fPerson = this.getInFocus();
        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix) || [];
        if (hidden.length > 0) {
            let shown = fPerson.shownChildrenIds?.get(this.idPrefix) || [];
            shown = shown.concat(hidden);
            this.updateChildren(fPerson, shown, []);
            return true;
        }
        return false;
    }

    expandCollapsedChild(childId) {
        const fPerson = this.getInFocus();
        const hidden = fPerson.hiddenChildrenIds?.get(this.idPrefix) || [];
        if (!hidden.includes(childId)) return;
        const shown = fPerson.shownChildrenIds?.get(this.idPrefix) || [];
        moveChildById(childId, hidden, shown);
        this.updateChildren(fPerson, shown, hidden);
    }

    hasCollapsedParents(side) {
        return this.get(side)?.parentsCollapsed?.includes(this.idPrefix);
    }

    collapseParents(side) {
        if (this[side]) {
            const person = this.get(side);
            person.parentsCollapsed = person.parentsCollapsed || [];
            person.parentsCollapsed.push(this.idPrefix);
        }
    }

    expandCollapsedParents(side) {
        const p = this.get(side);
        if (p && p.parentsCollapsed?.includes(this.idPrefix)) {
            const i = this.idPrefix;
            p.parentsCollapsed = p.parentsCollapsed.filter((p) => p != i);
            return true;
        }
        return false;
    }

    updateChildren(person, shown, hidden) {
        person.hiddenChildrenIds = person.hiddenChildrenIds || new Map();
        person.hiddenChildrenIds.set(this.idPrefix, hidden);
        person.shownChildrenIds = person.shownChildrenIds || new Map();
        person.shownChildrenIds.set(this.idPrefix, shown);
    }

    toString() {
        return `${this.getId()}:[${this.a ? this.aPerson()?.toString() : "none"}][${
            this.b ? this.bPerson()?.toString() : "none"
        }]`;
    }
}

function moveChildById(childId, src, dst) {
    if (!src) return;
    const index = src.findIndex((id) => id === childId);
    if (index !== -1) {
        const [moved] = src.splice(index, 1);
        dst.push(moved);
    }
}
