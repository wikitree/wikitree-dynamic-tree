/**
 * A cache for People objects.
 */
class PeopleCache {
    constructor() {
        this.peopleCache = new Map();
        condLog("NEW PEOPLE CACHE CREATED");
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
     * We use the fields provided to determine the 'richness' of a profile with those fields. If such a profile
     * with the given id is present in the cache, it is returned, otherwise undefined is returned.
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
     * If an enriched person with the given id (i.e. data.id) exists in the cache and it has at least
     * the same level of richness than the given data, the cached Person is returned, otherwise
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
        const reqRichness = Richness.fromFields(reqFields);
        return (person.getRichness() & reqRichness) == reqRichness;
    }
}
