import { theSourceRules } from "../../lib/biocheck-api/src/SourceRules.js";
import { BioCheckPerson } from "../../lib/biocheck-api/src/BioCheckPerson.js";
import { Biography } from "../../lib/biocheck-api/src/Biography.js";

// ancestor_lines_explorer.js --> add HTML for PopupDIV and ConnectionsDIV and draggable();
// display.js --> add call to .on ("click", function(e,d) { d.data.handleClick();

export class Person {
    constructor(data, fromFile = false) {
        let name = data.BirthName ? data.BirthName : data.BirthNamePrivate;
        if (fromFile) {
            this._data = data;
        } else {
            if ("bio" in data && data.Name) {
                const bioPerson = new BioCheckPerson();
                if (bioPerson.canUse(data, false, true, data.Name)) {
                    const biography = new Biography(theSourceRules);
                    biography.parse(bioPerson.getBio(), bioPerson, "");
                    biography.validate();
                    this.hasBioIssues = biography.hasStyleIssues() || !biography.hasSources();
                    if (this.hasBioIssues) {
                        this.bioCheckReport = Person.getReportLines(biography, bioPerson.isPre1700());
                    }
                }
            }
            this._data = {};

            let x = Object.entries(data);
            for (const [key, value] of x) {
                if (!["Parents", "Spouses", "Children", "Siblings", "bio"].includes(key)) {
                    this._data[key] = value;
                }
            }
        }
        this.generations = new Map();
        this.marked = false;
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
    getBirthYear() {
        const d = this._data.BirthDate || this._data.BirthDateDecade;
        return d?.substring(0, 4) || "0000";
    }
    getBirthDecade() {
        return this._data.BirthDateDecade;
    }
    getBirthLocation() {
        return this._data.BirthLocation;
    }
    getDeathDate() {
        return this._data.DeathDate;
    }
    getDeathDecade() {
        return this._data.DeathDateDecade;
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
    getName() {
        return this._data.Name;
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
    getNrCopies(upToGen) {
        // Count how many copies of this profile are there within upToGen generations
        return [...this.generations.entries()].reduce((acc, [gen, cnt]) => (gen <= upToGen ? acc + cnt : acc), 0);
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
    isLiving() {
        return this._data.IsLiving;
    }
    isMarked() {
        return this.marked;
    }
    setMarked(what = true) {
        this.marked = what;
    }
    toggleMarked() {
        this.marked = !this.marked;
        return this.marked;
    }
    isBrickWall() {
        return this.brickWall;
    }
    setBrickWall(what = true) {
        this.brickWall = what;
    }
    isPrivate() {
        const priv = this._data.Privacy;
        return priv >= 20 && priv <= 40;
    }
    isUnlisted() {
        return this._data.Privacy == 10;
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
        return `${this.getWtId()} (${this.getId()}) ${this.getDisplayName()}`;
    }

    handleClick() {
        console.log("Gday Mate!");
        personPopup.popupHTML(
            this,
            {
                type: "Ahn",
                ahNum: 1,
                primaryPerson: this,
                myAhnentafel: FractalView.myAhnentafel,
            },
            AboutAppIcon,
            "fractal"
        );
    }

    static getReportLines(biography, isPre1700) {
        const profileReportLines = [];
        if (!biography.hasSources()) {
            profileReportLines.push(["Profile may be unsourced", null]);
        }
        const invalidSources = biography.getInvalidSources();
        const nrInvalidSources = invalidSources.length;
        if (nrInvalidSources > 0) {
            let msg = "Bio Check found sources that are not ";
            if (isPre1700) {
                msg += "reliable or ";
            }
            msg += "clearly identified:";
            const subLines = [];
            for (const invalidSource of invalidSources) {
                subLines.push(invalidSource);
            }
            profileReportLines.push([msg, subLines]);
        }
        for (const sectMsg of biography.getSectionMessages()) {
            profileReportLines.push([sectMsg, null]);
        }
        for (const styleMsg of biography.getStyleMessages()) {
            profileReportLines.push([styleMsg, null]);
        }
        return profileReportLines;
    }
}

export class LinkToPerson extends Person {
    constructor(p) {
        super(p._data, true);
        this.generations = p.generations;
        this.nrOlderGenerations = 0;
    }
    getDisplayName() {
        return "See " + super.getDisplayName();
    }
}
