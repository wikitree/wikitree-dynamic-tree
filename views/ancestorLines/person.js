export class Person {
    constructor(data, fromFile = false) {
        let name = data.BirthName ? data.BirthName : data.BirthNamePrivate;
        if (fromFile) {
            this._data = data;
        } else {
            this._data = {};
            //condLog(`<--New person data: for ${data.Id} ${name}`, data);

            let x = Object.entries(data);
            for (const [key, value] of x) {
                if (!["Parents", "Spouses", "Children", "Siblings"].includes(key)) {
                    this._data[key] = value;
                }
            }
        }
        this.generations = new Map();
        this.marked = false;

        //condLog(`>--New person done: for ${this.getId()} ${name}`, this);
    }

    // Since a person can appear in more than one generation and more than once in a generation,
    // their generation is a map of {generation => count}.
    addGeneration(gen) {
        if (this.generations.has(gen)) {
            const g = this.generations.get(gen);
            this.generations.set(gen, g + 1);
        } else {
            this.generations.set(gen, 1);
        }
    }
    clearGenerations() {
        this.generations.clear();
        this.setNrOlderGenerations(0);
    }

    setNrOlderGenerations(n) {
        this.nrOlderGenerations = n;
    }
    getNrOlderGenerations() {
        return this.nrOlderGenerations;
    }

    // Basic "getters" for the data elements.
    getId() {
        return this._data.Id;
    }
    getWtId() {
        return this._data.Name;
    }
    getGender() {
        return this._data.Gender;
    }
    getBirthDate() {
        return this._data.BirthDate;
    }
    getBirthLocation() {
        return this._data.BirthLocation;
    }
    getDeathDate() {
        return this._data.DeathDate;
    }
    getDeathLocation() {
        return this._data.DeathLocation;
    }
    getFatherId() {
        return this._data.Father;
    }
    getMotherId() {
        return this._data.Mother;
    }
    getParentIds() {
        return [this._data.Father, this._data.Mother];
    }
    getDisplayName() {
        return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate;
    }
    getPhotoUrl() {
        if (this._data.PhotoData && this._data.PhotoData["url"]) {
            return this._data.PhotoData["url"];
        }
    }
    isAtGeneration(n) {
        return this.generations.has(n);
    }
    isBelowGeneration(n) {
        for (const g of this.generations.keys()) {
            if (g < n) return true;
        }
        return false;
    }
    isDuplicate() {
        return this.generations.size > 1 || this.generations.values().next().value > 1;
    }
    isMarked() {
        return this.isMarked;
    }
    setMarked(what = true) {
        this.marked = what;
    }
    toggleMarked() {
        this.marked = !this.marked;
        return this.marked;
    }

    hasSuffix() {
        return this._data.Suffix && this._data.Suffix.length > 0;
    }
    hasAParent() {
        return this.getFatherId() || this.getMotherId();
    }
    hasAChild() {
        return this._data.HasChildren || this._data.Children?.length > 0;
    }
    isMale() {
        return this.getGender() == "Male";
    }
    isFemale() {
        return this.getGender() == "Female";
    }
    isDiedYoung() {
        return this._data.isDiedYoung || calculateDiedYoung(this);

        function calculateDiedYoung(self) {
            if (self._data.BirthDate && self._data.DeathDate) {
                const age = self._data.DeathDate.split("-")[0] - self._data.BirthDate.split("-")[0];
                self._data.isDiedYoung = age >= 0 && age <= 10;
            } else {
                self._data.isDiedYoung = false;
            }
            return self._data.isDiedYoung;
        }
    }
    isDeadEnd() {
        return !this.hasAParent();
    }

    toString() {
        return `${this.getId()} ${this.getDisplayName()}`;
    }
}

export class LinkToPerson extends Person {
    constructor(p) {
        super({
            Id: p.getId(),
            Name: p.getWtId(),
            BirthName: `See ${p.getDisplayName()}`,
            DataStatus: { Spouse: "" },
        });
        this.generations = p.generations;
        this.nrOlderGenerations = 0;
    }
}
