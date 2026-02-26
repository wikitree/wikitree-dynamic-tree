import { Utils } from "../shared/Utils.js";

/**
 * When a person object is created from data in e.g. a Parents field of another profile, this parent Person object
 * typically does not have Parents, Children, or Spouses fields. We refer to a Person object that has any of these
 * fields as 'enriched'. The degree to which a profile has been 'enriched' (its 'richness') depends on how
 * many of these 3 fields are present.
 */
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
    #peopleCache;

    constructor(data, cache) {
        this.#peopleCache = cache;
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
                // We don't really need a Parents field since we have Mother and Father, but we do add
                // it because it is useful to determine if a profile's parents have been loaded and is
                // being used to control how much of an ancestor tree should be drawn
                const ids = Object.keys(value);
                this._data[key] = new Set(ids);
            } else if (!["marriage_date", "marriage_location", "marriage_end_date", "bio"].includes(key)) {
                // The above fields are only present in spouses and are handled in setSpouses.
                // Other keys are handled here by copying them to this person object
                this._data[key] = value;
            }
        }

        this._data.noMoreSpouses = data.DataStatus ? data.DataStatus.Spouse == "blank" : false;
        this.generations = new Map();
        this.marked = false;
        condLog(`>--New person done: for ${this.getId()} ${name} (${this.getRichness()})`, this);
    }

    //
    // Note: the methods below are sorted, first by their noun and then the verb (and adjective) so that everything to
    // do with a specific part of the object are together
    //

    // -----------------------------------
    // Birth Dates
    //
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
    // -----------------------------------
    // Brick Wall
    //
    isBrickWall() {
        return this.brickWall;
    }
    setBrickWall(what = true) {
        this.brickWall = what;
    }
    // -----------------------------------
    // Children
    //
    getChildrenIds() {
        return this._data.Children;
    }
    getChild(id) {
        if (this._data.Children && this._data.Children.has(id)) {
            return this.#peopleCache.getIfPresent(id);
        } else {
            return undefined;
        }
    }
    getChildren() {
        return this.collectPeople(this._data.Children);
    }
    async getChildrenWithLoad() {
        return await Promise.all(this.collectWithLoad(this._data.Children));
    }
    hasAChild() {
        return this._data.Children?.length > 0 || this._data.HasChildren;
    }

    // -----------------------------------
    // Death Dates
    //
    getDeathDate() {
        return this._data.DeathDate;
    }
    getDeathDecade() {
        return this._data.DeathDateDecade;
    }
    getDeathLocation() {
        return this._data.DeathLocation;
    }
    getDisplayName() {
        return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate;
    }

    // -----------------------------------
    // Father
    //
    getFather() {
        // Get the actual father person object, not their id
        const fId = this.getFatherId();
        return fId ? this.#peopleCache.getIfPresent(fId) : undefined;
    }
    getFatherId() {
        return this._data.Father;
    }
    async getFatherWithLoad() {
        const fId = this.getFatherId();
        return fId ? await this.#peopleCache.getWithLoad(fId) : CachedPerson.aPromiseFor(undefined);
    }

    // -----------------------------------
    // Gender
    //
    getGender() {
        return this._data.Gender;
    }

    // -----------------------------------
    // Generationms
    //
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
    getNrCopies(upToGen) {
        // Count how many times this person appear in the direct ancestor lines within upToGen generations
        return [...this.generations.entries()].reduce((acc, [gen, cnt]) => (gen <= upToGen ? acc + cnt : acc), 0);
    }
    getNrOlderGenerations() {
        // The number of direct ancestor generations above this person in the tree
        return this.nrOlderGenerations;
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
    setNrOlderGenerations(n) {
        this.nrOlderGenerations = n;
    }
    getLowestGeneration() {
        // Get the lowest generation this person appears in
        if (this.generations.size == 0) {
            return 0;
        }
        return Math.min(...this.generations.keys());
    }

    // -----------------------------------
    // Id
    //
    getId() {
        return this._data.Id;
    }

    // -----------------------------------
    // Mother
    //
    getMother() {
        // Get the actual mother person object, not their id
        const mId = this.getMotherId();
        return mId ? this.#peopleCache.getIfPresent(mId) : undefined;
    }
    getMotherId() {
        return this._data.Mother;
    }
    async getMotherWithLoad() {
        const mId = this.getMotherId();
        return mId ? await this.#peopleCache.getWithLoad(mId) : CachedPerson.aPromiseFor(undefined);
    }

    // -----------------------------------
    // Parents
    //
    getExpandedParentIds() {
        // Will return undefined if this person has not been fully loaded
        return this._data.Parents;
    }
    getLoadedParentIds() {
        // Get the ids of parents that are present in the cache regardless of whether this person has been
        // "full-loaded"
        const pIds = [];
        let pId = this.getFatherId();
        if (pId && this.#peopleCache.has(pId)) pIds.push(pId);
        pId = this.getMotherId();
        if (pId && this.#peopleCache.has(pId)) pIds.push(pId);
        return pIds;
    }
    getParentIds() {
        // Get the parent ids regardles of whether loaded or pesent in the cache
        const pIds = [];
        let pId = this.getFatherId();
        if (pId) pIds.push(pId);
        pId = this.getMotherId();
        if (pId) pIds.push(pId);
        return pIds;
    }
    hasAParent() {
        return this.getFatherId() || this.getMotherId();
    }

    // -----------------------------------
    // Photo
    //
    getPhotoUrl() {
        if (this._data.PhotoData && this._data.PhotoData["url"]) {
            return this._data.PhotoData["url"];
        }
    }

    // -----------------------------------
    // Richness
    isFullyEnriched() {
        return this.getRichness() == Richness.FULLY_ENRICHED;
    }
    getRichness() {
        return Richness.fromData(this._data);
    }

    // -----------------------------------
    // Spouses
    //
    copySpouses(person) {
        // Copy spousal data frm 'person' to this profile
        this._data.PreferredSpouseId = person._data.PreferredSpouseId;
        this._data.Spouses = person._data.Spouses;
        this._data.MarriageDates = person._data.MarriageDates;
    }
    getSpouse(id) {
        if (id) {
            if (this._data.Spouses && this._data.Spouses.has(id)) {
                return this.#peopleCache.getIfPresent(id) || new NotLoadedPerson(id);
            }
            return undefined;
        }
        if (this.hasSpouse()) {
            return (
                this.#peopleCache.getIfPresent(this._data.PreferredSpouseId) ||
                new NotLoadedPerson(this._data.PreferredSpouseId)
            );
        }
        if (this.hasNoSpouse() || this.isDiedYoung()) {
            return NoSpouse;
        }
        return undefined;
    }
    getSpouses() {
        return this.collectPeople(this._data.Spouses);
    }
    getSpouseIds() {
        return this._data.Spouses;
    }
    async getSpousesWithLoad() {
        return await Promise.all(this.collectWithLoad(this._data.Spouses));
    }
    /**
     * If id is not provided, return the preferred spouse, otherwise if id is one of the spouse Ids,
     * return the spouse with that id. Otherwise return undefined.
     */
    async getSpouseWithLoad(id) {
        if (id) {
            if (this._data.Spouses && this._data.Spouses.has(id)) {
                return await this.#peopleCache.getWithLoad(id);
            }
            return CachedPerson.aPromiseFor(undefined);
        }
        if (this.hasSpouse()) {
            return await this.#peopleCache.getWithLoad(this._data.PreferredSpouseId);
        }
        if (this.hasNoSpouse() || this.isDiedYoung()) {
            return CachedPerson.aPromiseFor(NoSpouse);
        }
        return CachedPerson.aPromiseFor(undefined);
    }
    // Note that !hasSpouse() is not the same as hasNoSpouse(). The former just means that the current
    // profile does not have any spouse field(s) loaded while the latter means the profile has no spouse
    // data even after a full load. definitelyHasNoSpouse() also takes the noMoreSpouses flag into account.
    hasSpouse(id) {
        if (id) {
            return this._data.Spouses && this._data.Spouses.has(id);
        }
        return this._data.Spouses && this._data.PreferredSpouseId;
    }
    hasNoSpouse() {
        return this._data.Spouses && this._data.Spouses.size == 0;
    }
    definitelyHasNoSpouse() {
        return this.hasNoSpouse() && this._data.noMoreSpouses;
    }
    setPreferredSpouse(id) {
        if (this.hasSpouse(id)) {
            this._data.PreferredSpouseId = id;
            // also change the preferred spouse of the preferred spouse if possible
            const thisId = this.getId();
            const spouse = this.getSpouse();
            if (spouse._data.preferredSpouse != thisId && spouse._data.Spouses && spouse._data.Spouses.has(thisId)) {
                spouse._data.preferredSpouse = thisId;
            }
            return true;
        } else {
            return false;
        }
    }
    setSpouses(spousesData) {
        // Note: unlike Parents, Children, and Siblings, a recent change made the Spouses field an array of spouse
        // records rather than a map of id to record.
        this._data.Spouses = new Set(spousesData.map((s) => +s.Id));

        // The primary profile retrieved via an API call does not have marriage date and -place fields.
        // That data is only present in each of the Spouses sub-records retrieved in the Spouses field with
        // the primary profile.
        // However, such a spouse record has no Parents or Children records. If we then later retrieve the
        // spouse record again via API in order to obtain their Parents or Children records, that new record
        // no longer has the marriage data. Therefore, here we copy the marriage data (if any) from the Spouses
        // records to a new MarriageDates field at the Person._data level. We also determine who the first
        // spouse is based on marriage date (unknown date goes last).
        let firstSpouseId = undefined;
        let firstMarriageDate = Utils.dateObject();
        this._data.MarriageDates = {};
        // for (const [spouseId, spouseData] of Object.entries(spousesData)) {
        for (const spouseData of spousesData) {
            const spouseId = +spouseData.Id;
            const mDate = spouseData.marriage_date || "0000-00-00";
            const dateObj = Utils.dateObject(mDate);
            this._data.MarriageDates[spouseId] = {
                marriage_date: mDate,
                marriage_end_date: spouseData.marriage_end_date || "0000-00-00",
                marriage_location: spouseData.marriage_location || "0000-00-00",
            };
            // CachedPerson.makePerson(spouseData);
            if (dateObj - firstMarriageDate <= 0) {
                firstMarriageDate = dateObj;
                firstSpouseId = spouseId;
            }
        }
        this._data.PreferredSpouseId = firstSpouseId;
    }

    // -----------------------------------
    // WikiTree ID
    //
    getWtId() {
        return this._data.Name;
    }

    // -----------------------------------
    // Various property fields
    //
    hasSuffix() {
        return this._data.Suffix && this._data.Suffix.length > 0;
    }
    hasFields(mustHaveFields) {
        let hasAll = true;
        for (const i in mustHaveFields || []) {
            hasAll &&= Object.hasOwn(this._data, mustHaveFields[i]);
        }
        return hasAll;
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
    isPrivate() {
        const priv = this._data.Privacy;
        return priv >= 20 && priv <= 40;
    }
    isUnlisted() {
        return this._data.Privacy == 10;
    }

    toString() {
        return `${this.getId()} ${this.getDisplayName()} (${this.getRichness()})`;
    }

    collectPeople(set) {
        const result = [];
        if (set) {
            for (const id of set.keys()) {
                result.push(this.#peopleCache.getIfPresent(id) || new NotLoadedPerson(id));
            }
        }
        return result;
    }

    collectWithLoad(set) {
        const result = [];
        if (set) {
            for (const id of set.keys()) {
                result.push(this.#peopleCache.getWithLoad(id));
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

export class NullPerson extends CachedPerson {
    constructor() {
        super({ Id: "0000", Children: {}, DataStatus: { Spouse: "blank" } });
        this.isNoSpouse = true;
    }
    toString() {
        return "No Spouse";
    }
}

export const NoSpouse = new NullPerson();

export class NotLoadedPerson extends CachedPerson {
    constructor(id) {
        super({ Id: id, BirthName: "Not Loaded", Children: {}, DataStatus: { Spouse: "" } });
        this.isNotLoaded = true;
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
