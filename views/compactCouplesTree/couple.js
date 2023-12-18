/**
 * A Couple consists of two Persons that are either married, or are the parents of a child.
 * One of them is 'in focus', i.e. is the person of main interest in an ancestor or descendant
 * tree. A Couple may also consist of only a single Person if they do not have a (known) spouse.
 */
export class Couple {
    static L = -1;
    static R = 1;

    static #couplesCache = new Map();

    static init() {
        Couple.#couplesCache = new Map();
    }

    static get(idPrefix, cd) {
        //{ a, b, focus, isRoot = false }) {
        const id = Couple.formId(idPrefix, cd.a, cd.b);
        let c = Couple.#couplesCache.get(id);
        if (c) {
            condLog(`Couple.get from cache: ${c.toString()}`, c);
            return c;
        }

        c = new Couple(idPrefix, cd);
        Couple.#couplesCache.set(id, c);
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
     * This id identifies the couple (i.e. <WtId of a>:<WtId of b>) and is unique per couple, but is not
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

    getJointChildrenIds() {
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
        return list;
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

    isDescendantExpandable() {
        return (
            !this.children &&
            !this.isExpanded() &&
            this.mayHaveChildren() &&
            ((this.a && !this.a.getChildrenIds()) || (this.b && !this.b.getChildrenIds()))
        );
    }

    isExpanded() {
        return this.isAExpanded() && this.isBExpanded();
    }

    isAExpanded() {
        return !this.a || this.a.isNoSpouse || (this.a.getExpandedParentIds() && this.a.getSpouses());
    }

    isBExpanded() {
        return !this.b || this.b.isNoSpouse || (this.b.getExpandedParentIds() && this.b.getSpouses());
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
        // this.expanded = false;
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
        // this.expanded = false;
        if (this.children) delete this.children;
        return new Promise((resolve, reject) => {
            resolve(this);
        });
    }

    toString() {
        return `${this.getId()}:[${this.a ? this.a.toString() : "none"}][${this.b ? this.b.toString() : "none"}]`;
    }
}
