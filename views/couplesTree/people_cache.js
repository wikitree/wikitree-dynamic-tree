class PeopleCache {
    constructor() {
        this.peopleCache = new Map();
        condLog("NEW PEOPLE CACHE CREATED")
    }

    clear() {
        this.peopleCache.clear();
        condLog("PEOPLE CACHE CLEARED");
    }

    add(person) {
        const id = person.getId();
        if (id) {
            condLog(`caching ${person.toString()}`);
            this.peopleCache.set(id, person);
        }
        return person;
    }

    /**
     *
     * @param {*} id Profile id
     * @param {*} fields array of field names to retrieve
     * @returns A Person if present in the cache, otherwise undefined
     */
    getWithFields(id, fields) {
        const cachedPerson = this.peopleCache.get(id);
        if (cachedPerson && this.isRequestCoveredByPerson(fields, cachedPerson)) {
            condLog(`getPerson from cache ${cachedPerson.toString()}`);
            return cachedPerson;
        }
        return undefined;
    }

    /**
     * If an enriched person with the given id exists in the cache and it has at least
     * the same level of richness than the new data, the cached Person is returned, otherwise
     * undefined is returned
     * @param {*} data
     * @returns
     */
    getWithData(data) {
        const cachedPerson = this.peopleCache.get(data.Id);
        if (cachedPerson && isSameOrHigherRichness(cachedPerson._data, data)) {
            condLog(`makePerson from cache ${cachedPerson.toString()}`);
            return cachedPerson;
        }
        return undefined;
    }

    isRequestCoveredByPerson(reqFields, person) {
        const reqRichness = this.getRequestRichness(reqFields);
        return (getRichness(person._data) & reqRichness) == reqRichness;
    }

    getRequestRichness(fields) {
        let r = 0;
        if (fields.includes("Parents")) {
            r = r | 0b1000;
        }
        if (fields.includes("Spouses")) {
            r = r | 0b0100;
        }
        if (fields.includes("Siblings")) {
            r = r | 0b0010;
        }
        if (fields.includes("Children")) {
            r = r | 0b001;
        }
        return r;
    }
}
