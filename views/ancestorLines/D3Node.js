export class D3Node {
    constructor(idPrefix, person, type = D3Node.NodeType.UNSPECIFIED, adoptiveSubtreeId = undefined) {
        this.idPrefix = idPrefix;
        this.person = person;
        this.type = type;
        this.adoptiveSubtreeId = adoptiveSubtreeId;

        return new Proxy(this, {
            get(target, prop, receiver) {
                // properties defined on the wrapper
                if (Reflect.has(target, prop)) {
                    return Reflect.get(target, prop, receiver);
                }
                const value = target.person[prop];
                if (typeof value === "function") {
                    return value.bind(target.person);
                }
                return value;
            },

            set(target, prop, value) {
                if (Reflect.has(target, prop)) {
                    target[prop] = value;
                } else {
                    target.person[prop] = value;
                }
                return true;
            },
        });
    }

    static ParentMode = {
        NORMAL: "n",
        BIO: "b",
        ALL: "nb",
    };
    static Side = {
        FATHER: "f",
        MOTHER: "m",
    };
    static NodeType = {
        UNSPECIFIED: "",
        FATHER: D3Node.Side.FATHER,
        MOTHER: D3Node.Side.MOTHER,
        BIO_FATHER: D3Node.ParentMode.BIO + D3Node.Side.FATHER,
        BIO_MOTHER: D3Node.ParentMode.BIO + D3Node.Side.MOTHER,
        ADOPTIVE_FATHER: "a" + D3Node.Side.FATHER,
        ADOPTIVE_MOTHER: "a" + D3Node.Side.MOTHER,
    };

    // Note: a parent is a bio parent only if there is also an adoptive parent
    isBioParent() {
        return this.type?.startsWith(D3Node.ParentMode.BIO);
    }

    isOnAdoptiveLine() {
        return !!this.adoptiveSubtreeId;
        // return this.onAdoptiveLine;
    }

    // Returns array of children ids for constructing D3 tree. Each id is an array of:
    //   [ id, NodeType, isOnAdoptiveLine ]
    getD3ChildrenIds() {
        self = this;
        const ids = [];
        // Which parents should be displayed, i.e. should be added as children of the D3 node
        const maleParentMode = this.getParentMode(D3Node.Side.FATHER);
        const femaleParentMode = this.getParentMode(D3Node.Side.MOTHER);

        const fatherId = this.getFatherId();
        const motherId = this.getMotherId();
        const bioFatherId = this.getBioFatherId();
        const bioMotherId = this.getBioMotherId();
        const hasBioFather = !!bioFatherId;
        const hasBioMother = !!bioMotherId;
        function subtreeId(isNewSubtree, parentId) {
            return isNewSubtree ? `${self.getNumId()}:${parentId}` : self.adoptiveSubtreeId;
        }

        // The order in which we add ids to ids[] here determines in which order the nodes (parents) will appear in the tree
        // for a node showing ALL parents.
        // Currently we have father top, mother below and for ALL parents we have the BIO parent(s) together in the middle
        // with adoptive/normal parent(s) on the "outside".
        switch (maleParentMode) {
            case D3Node.ParentMode.NORMAL:
                if (fatherId)
                    ids.push([
                        fatherId,
                        hasBioFather ? D3Node.NodeType.ADOPTIVE_FATHER : D3Node.NodeType.FATHER,
                        subtreeId(hasBioFather, fatherId),
                    ]);
                break;
            case D3Node.ParentMode.BIO:
                if (hasBioFather) ids.push([bioFatherId, D3Node.NodeType.BIO_FATHER, subtreeId(false, bioFatherId)]);
                break;
            case D3Node.ParentMode.ALL:
                if (fatherId)
                    ids.push([
                        fatherId,
                        hasBioFather ? D3Node.NodeType.ADOPTIVE_FATHER : D3Node.NodeType.FATHER,
                        subtreeId(hasBioFather, fatherId),
                    ]);
                if (bioFatherId) ids.push([bioFatherId, D3Node.NodeType.BIO_FATHER, subtreeId(false, bioFatherId)]);
                break;
        }

        switch (femaleParentMode) {
            case D3Node.ParentMode.NORMAL:
                if (motherId)
                    ids.push([
                        motherId,
                        hasBioMother ? D3Node.NodeType.ADOPTIVE_MOTHER : D3Node.NodeType.MOTHER,
                        subtreeId(hasBioMother, motherId),
                    ]);
                break;
            case D3Node.ParentMode.BIO:
                if (hasBioMother) ids.push([bioMotherId, D3Node.NodeType.BIO_MOTHER, subtreeId(false, bioMotherId)]);
                break;
            case D3Node.ParentMode.ALL:
                if (hasBioMother) ids.push([bioMotherId, D3Node.NodeType.BIO_MOTHER, subtreeId(false, bioMotherId)]);
                if (motherId)
                    ids.push([
                        motherId,
                        bioMotherId ? D3Node.NodeType.ADOPTIVE_MOTHER : D3Node.NodeType.MOTHER,
                        subtreeId(hasBioMother, motherId),
                    ]);
                break;
        }
        // console.log(self.person.toString(), ids);
        return ids;
    }

    getId() {
        const t = this.type ? `-${this.type}` : "";
        return `${this.idPrefix}${t}-${this.person.getNumId()}`;
    }

    modeKey(side) {
        return `${this.idPrefix}-${side}`;
    }

    // ParentMode determines which of bio, adoptive, or both parents are displayed in the tree
    getParentMode(side) {
        const mode = this.person.parentMode?.get(this.modeKey(side));
        return mode ? mode : D3Node.ParentMode.NORMAL;
    }

    toggleParentMode(side) {
        const p = this.person;
        const key = this.modeKey(side);
        // Absence of a D3Node's prefix in parentMode implies NORMAL
        p.parentMode = p.parentMode || new Map();
        let mode = this.person.parentMode?.get(key);
        if (!mode) {
            mode = D3Node.ParentMode.BIO;
        } else if (mode === D3Node.ParentMode.BIO) {
            mode = D3Node.ParentMode.ALL;
        } else if (mode === D3Node.ParentMode.ALL) {
            mode = false;
        }
        if (!mode) {
            p.parentMode.delete(key);
        } else {
            p.parentMode.set(key, mode);
        }
    }

    toString() {
        return `D3Node(${this.getId()}, ${this.person.getName()})`;
    }
}
