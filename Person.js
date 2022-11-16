class Person {
    static logging = false;
    static #newPerson = function (data) {
        return new Person(data);
    };
    static #makePerson = Person.#newPerson;

    // Get a Person class definition where a new person is made by simply calling the default constructor
    static getPersonClass(logging = false) {
        Person.logging = logging;
        Person.#makePerson = Person.#newPerson;
        return Person;
    }

    // Provide a way by which one can override the "make a new person call" with someing else, e.g. one that would
    // make use of a chache.
    static setMakePerson(fn) {
        Person.#makePerson = fn;
        return Person;
    }

    // Turn console logging on or off
    static setLogging(logging) {
        Person.logging = logging;
    }

    static condLog(...args) {
        if (Person.logging) {
            console.log.apply(null, args);
        }
    }

    constructor(data) {
        this._data = data;
        this.isNoSpouse = false;
        let name = this.getDisplayName();
        Person.condLog(`<--New person data: for ${this.getId()}: ${name} (${Richness.fromData(data)})`, data);
        if (data.Parents) {
            Person.condLog(`Setting parents for ${this.getId()}: ${name}...`);
            for (var p in data.Parents) {
                this._data.Parents[p] = Person.#makePerson(data.Parents[p]);
            }
        }

        this.setSpouses(data);

        if (data.Siblings) {
            Person.condLog(`Setting Siblings for ${this.getId()}: ${name}`);
            for (var c in data.Siblings) {
                this._data.Siblings[c] = Person.#makePerson(data.Siblings[c]);
            }
        }

        if (data.Children) {
            Person.condLog(`Setting children for ${this.getId()}: ${name}`);
            for (var c in data.Children) {
                this._data.Children[c] = Person.#makePerson(data.Children[c]);
            }
        }
        this._data.noMoreSpouses = data.DataStatus ? data.DataStatus.Spouse == "blank" : false;
        Person.condLog(`>--New person done: for ${this.getId()}: ${name} (${this.getRichness()})`);
    }

    // Basic "getters" for the data elements.
    getId() {
        return this._data.Id;
    }
    getName() {
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
    getChildren() {
        return this._data.Children;
    }
    getFatherId() {
        return this._data.Father;
    }
    getMotherId() {
        return this._data.Mother;
    }
    getDisplayName() {
        return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate;
    }
    getPhotoUrl() {
        if (this._data.PhotoData && this._data.PhotoData["url"]) {
            return this._data.PhotoData["url"];
        }
    }

    // Getters for Mother and Father return the Person objects, if there is one.
    // The getMotherId and getFatherId functions above return the actual .Mother and .Father data elements (ids).
    getMother() {
        if (this._data.Mother && this._data.Parents) {
            return this._data.Parents[this._data.Mother];
        }
    }
    getFather() {
        if (this._data.Father && this._data.Parents) {
            return this._data.Parents[this._data.Father];
        }
    }
    /**
     * When a person object is created from data in e.g. a Parents field of another profile, this parent Person object
     * typically does not have Parents, Children, or Spouses fields. We refer to a Person object that has any of these
     * fields as 'enriched'. The degree to which a profile has been 'enriched' (its 'richness') depends on how
     * many of these 3 fields are present.
     */
    getRichness() {
        return Richness.fromData(this._data);
    }
    isFullyEnriched() {
        return this.getRichness() == Richness.MAX_RICHNESS;
    }
    getSiblings() {
        return this._data.Siblings;
    }
    getSpouses() {
        return this._data.Spouses;
    }
    getSpouse(id) {
        if (id) {
            if (this._data.Spouses) {
                return this._data.Spouses[id];
            }
            return undefined;
        }
        if (this.hasSpouse()) {
            return this._data.Spouses[this._data.CurrentSpouseId];
        }
        if (this.hasNoSpouse() || this.isDiedYoung()) {
            return NoSpouse;
        }
        return undefined;
    }
    hasAParent() {
        return this.getFatherId() || this.getMotherId();
    }
    // Note that !hasSpouse() is not the same as hasNoSpouse(). The former just means that the current
    // profile does not have any spouse field(s) loaded while the latter means the profile definitely
    // has no spouse.
    hasSpouse() {
        return this._data.Spouses && this._data.CurrentSpouseId;
    }
    hasNoSpouse() {
        return this._data.Spouses && this._data.noMoreSpouses && this._data.Spouses.length == 0;
    }
    hasSuffix() {
        return this._data.Suffix && this._data.Suffix.length > 0;
    }
    isMale() {
        return this.getGender() == "Male";
    }
    isFemale() {
        return this.getGender() == "Female";
    }
    isDiedYoung() {
        return this._data.isDiedYoung || this.calculateDiedYoung();
    }
    calculateDiedYoung() {
        if (this._data.BirthDate && this._data.DeathDate) {
            const age = this._data.DeathDate.split("-")[0] - this._data.BirthDate.split("-")[0];
            this._data.isDiedYoung = age >= 0 && age <= 10;
        } else {
            this._data.isDiedYoung = false;
        }
        return this._data.isDiedYoung;
    }

    // We use a few "setters". For the parents, we want to update the Parents Person objects as well as the ids
    // themselves.
    // For TreeViewer we only set the parents and children, so we don't need setters for all the _data elements.
    setMother(person) {
        var id = person.getId();
        var oldId = this._data.Mother;
        this._data.Mother = id;
        if (!this._data.Parents) {
            this._data.Parents = {};
        } else if (oldId) {
            delete this._data.Parents[oldId];
        }
        this._data.Parents[id] = person;
    }
    setFather(person) {
        var id = person.getId();
        var oldId = this._data.Father;
        this._data.Father = id;
        if (!this._data.Parents) {
            this._data.Parents = {};
        } else if (oldId) {
            delete this._data.Parents[oldId];
        }
        this._data.Parents[id] = person;
    }
    setChildren(children) {
        this._data.Children = children;
    }
    setSiblings(siblings) {
        this._data.Siblings = siblings;
    }
    setSpouses(data) {
        this._data.CurrentSpouseId = undefined;
        if (data.Spouses) {
            Person.condLog(
                `setSpouses for ${this.getId()}: ${this.getDisplayName()}: ${summaryOfPeople(data.Spouses)}`,
                data.Spouses
            );
            let list = [];

            // The primary profile retrieved via an API call does not have marriage date and -place fields.
            // That data is only present in each of the Spouses sub-records retrieved with the primary profile.
            // However, such a spouse record has no Parents or Children records. If we then later retrieve the
            // spouse record again via API in order to obtain their Parents or Children records, that new record
            // no longer has the marriage data. Therefore, here we copy the marriage data (if any) from the Spouses
            // records to a new MarriageDates field at the Person._data level. We also collect and sort the
            // marriage dates in order to determine who was the first wife.
            this._data.MarriageDates = {};
            for (let s in data.Spouses) {
                let spouseData = data.Spouses[s];
                let mDate = spouseData.marriage_date || "0000-00-00";
                this._data.MarriageDates[s] = {
                    marriage_date: mDate,
                    marriage_end_date: spouseData.marriage_end_date || "0000-00-00",
                    marriage_location: spouseData.marriage_location || "0000-00-00",
                };
                data.Spouses[s] = Person.#makePerson(spouseData);
                list.push({ id: s, marriage_date: mDate });
            }
            if (list.length > 0) {
                sortByMarriageYear(list);
                this._data.CurrentSpouseId = list[0].id;
            }
        }
    }
    setCurrentSpouse(id) {
        if (this.hasSpouse() && this.getSpouses()[id]) {
            this._data.CurrentSpouseId = id;
            return true;
        } else {
            return false;
        }
    }
    copySpouses(person) {
        this._data.CurrentSpouseId = person._data.CurrentSpouseId;
        this._data.Spouses = person._data.Spouses;
        this._data.MarriageDates = person._data.MarriageDates;
    }
    refreshFrom(newPerson) {
        if (isSameOrHigherRichness(this._data, newPerson._data)) {
            console.error(
                `Suspect Person.refreshFrom called on ${this.toString()} for less enriched ${newPerson.toString()}`
            );
        }
        const mother = newPerson.getMother();
        if (mother) {
            this.setMother(mother);
        }
        const father = newPerson.getFather();
        if (father) {
            this.setFather(father);
        }
        if (newPerson.hasSpouse()) {
            this.copySpouses(newPerson);
        }
        const siblings = newPerson.getSiblings();
        if (siblings) {
            this.setSiblings(siblings);
        }
        this.setChildren(newPerson.getChildren());
    }

    toString() {
        return `${this.getId()} ${this.getDisplayName()} (${this.getRichness()})`;
    }
} // End Person class definition

/**
 * Sort a list of objects containing 'marriage_date' by the year of the latter.
 * An with no marriage date is placed at the end.
 */
function sortByMarriageYear(list) {
    list.sort((a, b) => {
        const aYear = a.marriage_date ? a.marriage_date.split("-")[0] : 9999;
        const bYear = b.marriage_date ? b.marriage_date.split("-")[0] : 9999;

        return (aYear == 0 ? 9999 : aYear) - (bYear == 0 ? 9999 : bYear);
    });
}

class Richness {
    static MAX_RICHNESS = 0b1111;
    static fromData(data) {
        let r = 0;
        if (data.Siblings) {
            r = r | 0b100;
        }
        if (data.Parents) {
            r = r | 0b100;
        }
        if (data.Spouses) {
            r = r | 0b010;
        }
        if (data.Children) {
            r = r | 0b001;
        }
        return r;
    }
    static fromFields(fields) {
        let r = 0;
        if (fields.includes("Siblings")) {
            r = r | 0b1000;
        }
        if (fields.includes("Parents")) {
            r = r | 0b0100;
        }
        if (fields.includes("Spouses")) {
            r = r | 0b0010;
        }
        if (fields.includes("Children")) {
            r = r | 0b001;
        }
        return r;
    }
}

/**
 *
 * @param {*} a
 * @param {*} b
 * @returns true iff person data a has the same or higher richness of person data b
 */
function isSameOrHigherRichness(a, b) {
    const bRichness = Richness.fromData(b);
    return (Richness.fromData(a) & bRichness) == bRichness;
}

// ===================================================================
// Functions used in debug logging

function personSummary(data) {
    return `${data.Id}: ${data.BirthName} (${Richness.fromData(data)})`;
}

function summaryOfPeople(people) {
    let result = "";
    for (let i in people) {
        if (result.length > 0) {
            result = result.concat(",");
        }
        result = result.concat(personSummary(people[i]));
    }
    return result;
}

class NullPerson extends Person {
    constructor() {
        super({ Id: "0000", Children: [], DataStatus: { Spouse: "blank" } });
        this.isNoSpouse = true;
    }
    toString() {
        return "No Spouse";
    }
}

const NoSpouse = new NullPerson();
