export class PersonDataCache {
    constructor(maxSize = 50) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    getPersonData(id) {
        const data = this.cache.get(id);
        return data;
    }

    setPersonData(id, data) {
        if (!this.cache.has(id)) {
            if (this.cache.size >= this.maxSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
                console.log(`[Cache] Cache limit reached. Evicting oldest entry: ${firstKey}`);
            }
            this.cache.set(id, data);
            console.log(`[Cache] Setting data for ${id}`);
        } else {
            console.log(`[Cache] Data for ${id} already exists in cache. Not updating.`);
        }
    }

    // This method can be used to inspect the current state of the cache.
    logCacheState() {
        console.log("Current cache state:", Array.from(this.cache.entries()));
    }
}
