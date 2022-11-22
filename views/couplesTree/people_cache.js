/**
 * A cache for People objects.
 */
class PeopleCache {
    #cache;
    #loader;
    constructor(loader) {
        this.#cache = new Map();
        this.#loader = loader;
        condLog("NEW PEOPLE CACHE CREATED");
    }

    clear() {
        this.#cache.clear();
        condLog("PEOPLE CACHE CLEARED");
    }

    getIfPresent(id) {
        return this.#cache.get(+id);
    }

    async getWithLoad(id, mustHaveFields = []) {
        const pId = +id;
        //condLog(`getWithLoad ${pId}`, [...this.#cache.keys()]);
        let cachedPerson = this.#cache.get(pId);
        if (cachedPerson && cachedPerson.hasFields(mustHaveFields)) {
            condLog(`getWithLoad from cache ${cachedPerson.toString()}`);
            return new Promise((resolve, reject) => {
                resolve(cachedPerson);
            });
        }
        if (this.#loader) {
            const newPerson = await this.#loader.get(pId, mustHaveFields);
            cachedPerson = this.#cache.get(pId);
            if (cachedPerson) {
                if (isSameOrHigherRichness(newPerson._data, cachedPerson._data)) {
                    condLog(`getWithLoad updating cache: ${newPerson.toString()}`);
                    cachedPerson._data = newPerson._data;
                } else {
                    condLog(`getWithLoad from cache: ${cachedPerson.toString()} richer than ${newPerson.toString()}`);
                }
            } else {
                condLog(`getWithLoad adding to cache: ${newPerson.toString()}`);
                this.#cache.set(pId, newPerson);
                cachedPerson = newPerson;
            }
        }
        return cachedPerson;
    }

    /**
     * If an enriched person with the given id (i.e. data.id) exists in the cache and it has at least
     * the same level of richness than the given data, the cached Person is returned, otherwise
     * the loader is asked to load the data
     * @param {*} data
     * @returns
     */
    getWithData(data) {
        const id = +data.Id;
        //condLog(`getWithData ${id}`, [...this.#cache.keys()]);
        let cachedPerson = this.#cache.get(id);
        if (cachedPerson && isSameOrHigherRichness(cachedPerson._data, data)) {
            condLog(`getWithData from cache ${cachedPerson.toString()}`);
            //TODO: should we update cachedPerson with any new data??
            return cachedPerson;
        }
        if (id == 33628647) {
            condLog(`gotcha`, cachedPerson);
        }
        const newPerson = new CachedPerson(data);
        cachedPerson = this.#cache.get(id);
        if (cachedPerson) {
            condLog(`getWithData updating cache: ${newPerson.toString()}`);
            cachedPerson._data = newPerson._data;
        } else {
            condLog(`getWithData adding to cache: ${newPerson.toString()}`);
            this.#cache.set(id, newPerson);
            cachedPerson = newPerson;
        }
        return cachedPerson;
    }

    isRequestCoveredByPerson(reqFields, person) {
        const reqRichness = Richness.fromFields(reqFields);
        return (person.getRichness() & reqRichness) == reqRichness;
    }
}
