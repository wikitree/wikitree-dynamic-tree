class Richness {
    static MAX_RICHNESS = 0b1111;
    static FULLY_ENRICHED = 0b0111; // Currently we don't use/consider siblings in our richness measurements
    static fromData(data) {
        let r = 0;
        if (data.Siblings) {
            r = r | 0b1000;
        }
        if (data.Parents) {
            r = r | 0b0100;
        }
        if (data.Spouses) {
            r = r | 0b0010;
        }
        if (data.Children) {
            r = r | 0b0001;
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

export class CachedPerson {
    static #peopleCache;

    static init(peopleCache) {
        CachedPerson.#peopleCache = peopleCache;
    }

    static get(id) {
        return CachedPerson.#peopleCache.getIfPresent(id);
    }

    static async getWithLoad(id, mustHaveFields) {
        return await CachedPerson.#peopleCache.getWithLoad(id, mustHaveFields);
    }

    static makePerson(data) {
        return CachedPerson.#peopleCache.getWithData(data);
    }

    static getCache() {
        return CachedPerson.#peopleCache;
    }

    constructor(data) {
        this.isNoSpouse = false;
        this._data = {};
        let name = data.BirthName ? data.BirthName : data.BirthNamePrivate;
        condLog(`<--New person data: for ${data.Id} ${name} (${Richness.fromData(data)}))`, data);

        let x = Object.entries(data);
        for (const [key, value] of x) {
            if (key == "Spouses") {
                this.setSpouses(value);
            } else if (["Parents", "Children", "Siblings"].includes(key)) {
                // Just set the IDs in the field and ensure each person is created and put in the cache
                // We don't really need a Parents field since we have Mother and Father, but if we do add
                // it because it is useful to determine if a profile's parents have been loaded and is
                // being used to control how much of an ancestor tree should be drawn
                const ids = Object.keys(value);
                this._data[key] = new Set(ids);
                if (ids.length > 0) {
                    createAndCachePeople(value);
                }
            } else if (!["marriage_date", "marriage_location", "marriage_end_date"].includes(key)) {
                // The above fields are only present in spouses and are handled in setSpouses.
                // Other keys as handled here by copying them to this person object
                this._data[key] = value;
            }
        }

        this._data.noMoreSpouses = data.DataStatus ? data.DataStatus.Spouse == "blank" : false;
        condLog(`>--New person done: for ${this.getId()} ${name} (${this.getRichness()})`, this);

        function createAndCachePeople(mapOfPeopleData) {
            for (const pData of Object.values(mapOfPeopleData)) {
                CachedPerson.makePerson(pData);
            }
        }
    }
    setSpouses(spousesData) {
        this._data.Spouses = new Set(Object.keys(spousesData));

        // The primary profile retrieved via an API call does not have marriage date and -place fields.
        // That data is only present in each of the Spouses sub-records retrieved with the primary profile.
        // However, such a spouse record has no Parents or Children records. If we then later retrieve the
        // spouse record again via API in order to obtain their Parents or Children records, that new record
        // no longer has the marriage data. Therefore, here we copy the marriage data (if any) from the Spouses
        // records to a new MarriageDates field at the Person._data level. We also determine who the first
        // spouse is absed on marriage date (unknown date goes last).
        let firstSpouseId = undefined;
        let firstMarriageDate = dateObject();
        this._data.MarriageDates = {};
        for (const [spouseId, spouseData] of Object.entries(spousesData)) {
            const mDate = spouseData.marriage_date || "0000-00-00";
            const dateObj = dateObject(mDate);
            this._data.MarriageDates[spouseId] = {
                marriage_date: mDate,
                marriage_end_date: spouseData.marriage_end_date || "0000-00-00",
                marriage_location: spouseData.marriage_location || "0000-00-00",
            };
            CachedPerson.makePerson(spouseData);
            if (dateObj - firstMarriageDate <= 0) {
                firstMarriageDate = dateObj;
                firstSpouseId = spouseId;
            }
        }
        this._data.PreferredSpouseId = firstSpouseId;

        function dateObject(dateStr) {
            const parts = (dateStr || "9999-12-31").split("-");
            // Unknown year goes last
            if (parts[0] && parts[0] == 0) parts[0] = 9999;
            if (parts[1] && parts[1] > 0) parts[1] -= 1;
            if (parts.length == 1) {
                parts[1] = 0;
            }
            return new Date(...parts);
        }
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
    getChildrenIds() {
        return this._data.Children;
    }
    getChild(id) {
        if (this._data.Children && this._data.Children.has(id)) {
            return CachedPerson.#peopleCache.getIfPresent(id);
        } else {
            return undefined;
        }
    }
    getChildren() {
        return CachedPerson.collectPeople(this._data.Children);
    }
    async getChildrenWithLoad() {
        return await Promise.all(CachedPerson.collectWithLoad(this._data.Children));
    }
    getFatherId() {
        return this._data.Father;
    }
    getMotherId() {
        return this._data.Mother;
    }
    getParentIds() {
        return this._data.Parents;
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
        if (this._data.Mother) {
            return CachedPerson.#peopleCache.getIfPresent(this.getMotherId());
        }
        return undefined;
    }
    async getMotherWithLoad() {
        if (this._data.Mother) {
            return await CachedPerson.#peopleCache.getWithLoad(this.getMotherId());
        }
        return CachedPerson.aPromiseFor(undefined);
    }
    getFather() {
        if (this._data.Father) {
            return CachedPerson.#peopleCache.getIfPresent(this.getFatherId());
        }
        return undefined;
    }
    async getFatherWithLoad() {
        if (this._data.Father) {
            return await CachedPerson.#peopleCache.getWithLoad(this.getFatherId());
        }
        return CachedPerson.aPromiseFor(undefined);
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
        return this.getRichness() == Richness.FULLY_ENRICHED;
    }
    getSpouseIds() {
        return this._data.Spouses;
    }
    getSpouses() {
        return CachedPerson.collectPeople(this._data.Spouses);
    }
    async getSpousesWithLoad() {
        return await Promise.all(CachedPerson.collectWithLoad(this._data.Spouses));
    }
    /**
     * If id is not provided, return the preferred spouse, otherwise if id is one of the spouse Ids,
     * return the spouse with that id. Otherwise return undefined.
     */
    async getSpouseWithLoad(id) {
        if (id) {
            if (this._data.Spouses && this._data.Spouses.has(id)) {
                return await CachedPerson.#peopleCache.getWithLoad(id);
            }
            return CachedPerson.aPromiseFor(undefined);
        }
        if (this.hasSpouse()) {
            return await CachedPerson.#peopleCache.getWithLoad(this._data.PreferredSpouseId);
        }
        if (this.hasNoSpouse() || this.isDiedYoung()) {
            return CachedPerson.aPromiseFor(NoSpouse);
        }
        return CachedPerson.aPromiseFor(undefined);
    }
    getSpouse(id) {
        if (id) {
            if (this._data.Spouses && this._data.Spouses.has(id)) {
                return CachedPerson.#peopleCache.getIfPresent(id) || new NotLoadedPerson(id);
            }
            return undefined;
        }
        if (this.hasSpouse()) {
            return (
                CachedPerson.#peopleCache.getIfPresent(this._data.PreferredSpouseId) ||
                new NotLoadedPerson(this._data.PreferredSpouseId)
            );
        }
        if (this.hasNoSpouse() || this.isDiedYoung()) {
            return NoSpouse;
        }
        return undefined;
    }
    // Note that !hasSpouse() is not the same as hasNoSpouse(). The former just means that the current
    // profile does not have any spouse field(s) loaded while the latter means the profile definitely
    // has no spouse.
    hasSpouse(id) {
        if (id) {
            this._data.Spouses && this._data.Spouses.has(id);
        }
        return this._data.Spouses && this._data.PreferredSpouseId;
    }
    hasNoSpouse() {
        return this._data.Spouses && this._data.noMoreSpouses && this._data.Spouses.length == 0;
    }
    hasSuffix() {
        return this._data.Suffix && this._data.Suffix.length > 0;
    }
    hasAParent() {
        return this.getFatherId() || this.getMotherId();
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
    hasFields(mustHaveFields) {
        let hasAll = true;
        for (const i in mustHaveFields || []) {
            hasAll &&= Object.hasOwn(this._data, mustHaveFields[i]);
        }
        return hasAll;
    }

    setPreferredSpouse(id) {
        if (this.hasSpouse(id)) {
            this._data.PreferredSpouseId = id;
            // also change the preferred spouse of the preferred spouse if possible
            const thisId = this.getId();
            const spouse = this.getSpouse();
            if (spouse._data.preferredSpouse != thisId && spouse._data.Spouses && spouse._data.Spouses[thisId]) {
                spouse._data.preferredSpouse = thisId;
            }
            return true;
        } else {
            return false;
        }
    }
    copySpouses(person) {
        this._data.PreferredSpouseId = person._data.PreferredSpouseId;
        this._data.Spouses = person._data.Spouses;
        this._data.MarriageDates = person._data.MarriageDates;
    }

    toString() {
        return `${this.getId()} ${this.getDisplayName()} (${this.getRichness()})`;
    }

    static collectPeople(set) {
        const result = [];
        if (set) {
            for (const id of set.keys()) {
                result.push(CachedPerson.#peopleCache.getIfPresent(id) || new NotLoadedPerson(id));
            }
        }
        return result;
    }

    static collectWithLoad(set) {
        const result = [];
        if (set) {
            for (const id of set.keys()) {
                result.push(CachedPerson.#peopleCache.getWithLoad(id));
            }
        }
        return result;
    }

    static aPromiseFor(value) {
        return new Promise((resolve, reject) => {
            resolve(value);
        });
    }
}

class NullPerson extends CachedPerson {
    constructor() {
        super({ Id: "0000", Children: {}, DataStatus: { Spouse: "blank" } });
        this.isNoSpouse = true;
    }
    toString() {
        return "No Spouse";
    }
}

const NoSpouse = new NullPerson();

class NotLoadedPerson extends CachedPerson {
    constructor(id) {
        super({ Id: id, BirthName: "Not Loaded", Children: {}, DataStatus: { Spouse: "" } });
    }
}

/**
 *
 * @param {*} a
 * @param {*} b
 * @returns true iff person data a has the same or higher richness of person data b
 */
export function isSameOrHigherRichness(a, b) {
    const bRichness = Richness.fromData(b);
    return (Richness.fromData(a) & bRichness) == bRichness;
}
