export class D3Node {
    constructor(idPrefix, person, type) {
        this.idPrefix = idPrefix;
        this.person = person;
        this.type = type;

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

    getD3ChildrenIds() {
        const ids = [];
        const maleParentMode = this.getParentMode(D3Node.Side.FATHER);
        const femaleParentMode = this.getParentMode(D3Node.Side.MOTHER);

        switch (maleParentMode) {
            case D3Node.ParentMode.NORMAL:
                if (this.getFatherId()) ids.push([this.getFatherId(), D3Node.Side.FATHER]);
                break;
            case D3Node.ParentMode.BIO:
                if (this.getBioFatherId())
                    ids.push([this.getBioFatherId(), D3Node.ParentMode.BIO + D3Node.Side.FATHER]);
                break;
            case D3Node.ParentMode.ALL:
                if (this.getFatherId()) ids.push([this.getFatherId(), D3Node.Side.FATHER]);
                if (this.getBioFatherId())
                    ids.push([this.getBioFatherId(), D3Node.ParentMode.BIO + D3Node.Side.FATHER]);
                break;
        }

        switch (femaleParentMode) {
            case D3Node.ParentMode.NORMAL:
                if (this.getMotherId()) ids.push([this.getMotherId(), D3Node.Side.MOTHER]);
                break;
            case D3Node.ParentMode.BIO:
                if (this.getBioMotherId())
                    ids.push([this.getBioMotherId(), D3Node.ParentMode.BIO + D3Node.Side.MOTHER]);
                break;
            case D3Node.ParentMode.ALL:
                if (this.getBioMotherId())
                    ids.push([this.getBioMotherId(), D3Node.ParentMode.BIO + D3Node.Side.MOTHER]);
                if (this.getMotherId()) ids.push([this.getMotherId(), D3Node.Side.MOTHER]);
                break;
        }

        return ids;
    }

    getId() {
        const t = this.type ? `-${this.type}` : "";
        return `${this.idPrefix}${t}-${this.person.getNumId()}`;
    }

    modeKey(side) {
        return `${this.idPrefix}-${side}`;
    }
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
