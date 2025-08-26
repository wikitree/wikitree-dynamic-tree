/**
 * A Couple consists of two Persons that are either married, or are the parents of a child.
 * One of them is 'in focus', i.e. is the person of main interest in an ancestor or descendant
 * tree. A Couple may also consist of only a single Person if they do not have a (known) spouse.
 */
export class Couple {
    static L = -1; // a
    static R = 1; // b

    static get(idPrefix, cd) {
        const c = new Couple(idPrefix, cd);
        return c;
    }

    static formId(prefix, a, b) {
        return `${prefix}-${a?.getId() || ""}-${b?.getId() || ""}`;
    }

    constructor(idPrefix, { a, b, focus, isRoot = false } = {}) {
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
            this.a = b;
            this.b = a;
            this.focus = -this.focus;
        } else {
            this.a = a;
            this.b = b;
            this.focus = this.focus;
        }
        this.setJointChildrenIds();
        condLog(`new Couple: ${this.toString()}, focus=${this.focus}`, this.a, this.b);
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
        this.setJointChildrenIds();

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
     * This id identifies the couple (i.e. a<Id of a>-b<Id of b>) and is unique per couple, but is not
     * unique in the tree if there is pedigree collapse.
     * @returns
     */
    getCoupleId() {
        return `a${this.a?.getId() || ""}-b${this.b?.getId() || ""}`;
    }

    /**
     * This id is used as D3 node ids and is unique for every node in the tree, regardless of pedigree collapse.
     * We append the profile id of the 2 partners in the couple, to the couple's idPrefix to form its ID.
     * The way we currently use idPrefixes results in the following ids:
     *   for ancestor couples:
     *     root: A-<aId>-<bId>
     *     arbitrary: A_a_a_b-<aId-<bId> (the root's father's father's mother's parents)
     *   for decendants couples
     *     root: D-<aId>-<bId>
     *     arbitrary: D_2_0_1-<aId-<bId> (the root's 3rd child's first child's 2nd child and partner)
     * @returns The ID of the node represented by this couple
     */
    getId() {
        return Couple.formId(this.idPrefix, this.a, this.b);
        // return `${this.idPrefix}-${this.a?.getId() || ""}-${this.b?.getId() || ""}`;
    }

    getInFocus() {
        if (this.focus == Couple.R) {
            return this.b;
        } else {
            return this.a;
        }
    }

    isInFocus(side) {
        if (this.focus == Couple.R) {
            return side == "b";
        } else {
            return side == "a";
        }
    }

    // joint`ChildrenIds is an array of ids of children that both partners have in common.
    // This is used in descendant trees to show the children of a couple and is used to
    // determine the D3 children of tree nodes.
    getJointChildrenIds() {
        return [...this.getUncollapsedChildrenIds(), ...this.getCollapsedDescendantIds()];
    }

    jointChildrenCount() {
        return (
            (this.jointChildrenIds ? this.jointChildrenIds.length : 0) +
            (this.collapsedChildrenIds ? this.collapsedChildrenIds.length : 0)
        );
    }

    getUncollapsedChildrenIds() {
        return this.jointChildrenIds || [];
    }

    setJointChildrenIds() {
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
        this.jointChildrenIds = list;
    }

    getCollapsedDescendantIds() {
        return this.collapsedChildrenIds || [];
    }

    hasCollapsedDescendants() {
        return this.collapsedChildrenIds && this.collapsedChildrenIds.length > 0;
    }

    getNrOlderGenerations() {
        return Math.max(this.a?.getNrOlderGenerations() || 0, this.b?.getNrOlderGenerations() || 0);
    }

    getNotInFocus() {
        if (this.focus == Couple.R) {
            return this.a;
        } else {
            return this.b;
        }
    }

    hasAParent() {
        return (this.a && this.a.hasAParent()) || (this.b && this.b.hasAParent());
    }

    hasNoSpouse() {
        return (this.a && this.a.isNoSpouse) || (this.b && this.b.isNoSpouse);
    }

    isAnAAncestor() {
        return this.idPrefix.slice(-1) == "a";
    }

    isAncestorExpandable() {
        return !this.children && this.hasAParent() && !this.isExpanded();
    }

    isComplete() {
        return this.a && this.b;
    }

    isDescendantExpandable(show = false) {
        if (show) {
            const noD3children = !this.children;
            const aNotExpanded =
                !this.a || (!this.a.isNoSpouse && this.a.getSpouseIds?.size > 0 && this.a.getSpouses().length == 0);
            const bNotExpanded =
                !this.b || (!this.b.isNoSpouse && this.b.getSpouseIds?.size > 0 && this.b.getSpouses().length == 0);
            const mayHaveCh = this.mayHaveChildren();
            const aNoChildIds = this.a && !this.a.getChildrenIds();
            const bNoChildIds = this.b && !this.b.getChildrenIds();
            const rslt = noD3children && (aNotExpanded || bNotExpanded || (mayHaveCh && (aNoChildIds || bNoChildIds)));
            console.log(
                `isDescendantExpandable ${this.getId()}:\n` +
                    `noD3children=${noD3children} && (aNotExpanded=${aNotExpanded} || bNotExpanded=${bNotExpanded}) ` +
                    `|| (mayHaveCh=${mayHaveCh} && (aNoChildIds=${aNoChildIds} || bNoChildIds=${bNoChildIds})) = ${rslt}`
            );
        }
        return (
            !this.children && // no D3 children and
            (!this.a ||
                (!this.a.isNoSpouse && this.a.getSpouseIds?.size > 0 && this.a.getSpouses().length == 0) || // a has unloaded spouse(s) or
                !this.b ||
                (!this.b.isNoSpouse && this.b.getSpouseIds?.size > 0 && this.b.getSpouses().length == 0) || // b has unloaded spouse(s) or
                (this.mayHaveChildren() &&
                    ((this.a && !this.a.getChildrenIds()) || (this.b && !this.b.getChildrenIds())))) // a or b has no children
        );
    }

    isExpanded() {
        return this.isAExpanded() && this.isBExpanded();
    }

    isAExpanded() {
        if (typeof this.a == "undefined") return false;
        return this.a.isNoSpouse || (this.a.getExpandedParentIds() && this.a.getSpouses());
    }

    isBExpanded() {
        if (typeof this.b == "undefined") return false;
        return this.b.isNoSpouse || (this.b.getExpandedParentIds() && this.b.getSpouses());
    }

    mayHaveChildren() {
        return this.a && this.b ? this.a.hasAChild() && this.b.hasAChild() : this.a?.hasAChild() || this.b?.hasAChild();
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
        this.setJointChildrenIds();
    }

    removeAncestors() {
        // Assume this is a couple in an ancestor tree and we want to hide their ancestors
        // Move the ancestors out of the way rather than completely deleting them so we can restore them later
        if (this.a && this.a._data.Parents) {
            this.a._data._Parents = this.a._data.Parents;
            delete this.a._data.Parents;
        }
        if (this.b && this.b._data.Parents) {
            this.b._data._Parents = this.b._data.Parents;
            delete this.b._data.Parents;
        }
        return new Promise((resolve, reject) => {
            resolve(this);
        });
    }

    collapseAllDescendants() {
        // Assume this is a couple in a descendant tree and we want to hide their descendants
        // Move all the entries in jointChildren to collapsedChildren, so we can restore them later.
        // Not that collapsedChildren may already contain some children that were previously collapsed
        // individually.

        if (!this.jointChildrenIds || this.jointChildrenIds.length == 0) {
            return;
        }
        this.collapsedChildrenIds = this.collapsedChildrenIds || []; // ensure it exists
        // move all children to savedChildren
        this.collapsedChildrenIds = this.collapsedChildrenIds.concat(this.jointChildrenIds);
        this.jointChildrenIds = [];
    }

    collapseDescendant(childId) {
        this.collapsedChildrenIds = this.collapsedChildrenIds || []; // ensure it exists
        moveChildById(childId, this.jointChildrenIds, this.collapsedChildrenIds);
    }

    expandCollapsedDescendants() {
        // If this couple has collapsed children, expand them by moving them back to jointChildren.
        // Returns true if there were collapsed children to expand.
        if (this.collapsedChildrenIds && this.collapsedChildrenIds.length > 0) {
            if (this.jointChildrenIds) {
                this.jointChildrenIds = this.jointChildrenIds.concat(this.collapsedChildrenIds);
            } else {
                this.jointChildrenIds = this.collapsedChildrenIds;
            }
            this.collapsedChildrenIds = [];
            return true;
        }
        return false;
    }

    expandCollapsedDescendant(childId) {
        moveChildById(childId, this.collapsedChildrenIds, this.jointChildrenIds);
    }

    toString() {
        return `${this.getId()}:[${this.a ? this.a.toString() : "none"}][${this.b ? this.b.toString() : "none"}]`;
    }

    // Ensure that this couple has the same children collapsed (hidden) as oldCouple
    collapseSameDescendants(oldCouple) {
        if (
            this.jointChildrenIds &&
            this.jointChildrenIds.length > 0 &&
            oldCouple.collapsedChildrenIds &&
            oldCouple.collapsedChildrenIds.length > 0
        ) {
            const hiddenChildrenIds = new Set(oldCouple.collapsedChildrenIds);
            const remaining = [];
            for (const childId of this.jointChildrenIds) {
                if (hiddenChildrenIds.has(childId)) {
                    if (!this.collapsedChildrenIds) this.collapsedChildrenIds = [];
                    this.collapsedChildrenIds.push(childId);
                } else {
                    remaining.push(childId);
                }
            }

            this.jointChildrenIds = remaining;
        }
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
