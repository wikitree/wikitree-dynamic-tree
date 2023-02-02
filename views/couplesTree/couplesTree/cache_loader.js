import { CachedPerson } from "./cached_person.js";

export class CacheLoader {
    static DEFAULT_PRIMARY_FIELDS = [
        "Id",
        "Name",
        "FirstName",
        "LastNameCurrent",
        "LastNameAtBirth",
        "Suffix",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "MiddleInitial",
        "BirthDate",
        "DeathDate",
        "BirthLocation",
        "DeathLocation",
        "Gender",
        "Mother",
        "Father",
        "DataStatus",
        "Photo",
    ];
    static DEFAULT_RECURSIVE_FIELDS = ["Parents", "Spouses", "Children"];

    #allFields = [...CacheLoader.DEFAULT_PRIMARY_FIELDS, ...CacheLoader.DEFAULT_RECURSIVE_FIELDS];

    #primaryFields;
    #recursiveFields;
    constructor(primaryFields, recursiveFields) {
        this.#primaryFields =
            typeof this.#primaryFields === "undefined" ? CacheLoader.DEFAULT_PRIMARY_FIELDS : primaryFields;
        this.#recursiveFields =
            typeof this.#recursiveFields === "undefined" ? CacheLoader.DEFAULT_RECURSIVE_FIELDS : recursiveFields;
        this.#allFields = [...this.#primaryFields, ...this.#recursiveFields];
    }

    async get(id, requestedRecursiveFields) {
        if (!requestedRecursiveFields) {
            return await this.getPersonViaAPI(id, this.#allFields);
        } else {
            return await this.getPersonViaAPI(id, [...this.#primaryFields, ...requestedRecursiveFields]);
        }
    }

    /**
     * To get a Person for a given id, we POST to the API's getPerson action. When we get a result back,
     * we convert the returned JSON data into a Person object.
     * Note that postToAPI returns the Promise from Javascript's fetch() call.
     * This function returns a Promise (as result of the await), which gets resolved after the await.
     * So we can use this through asynchronous actions with something like:
     *   getPersonViaAPI.then(function(result) {
     *      // the "result" here is a new Person object.
     *   });
     * or
     *   newPerson = await getPersonViaAPI(id, fields);
     *
     * @param id The WikiTree ID of the person to retrieve
     * @param fields An array of field names to retrieve for the given person
     * @returns a Promise
     */
    async getPersonViaAPI(id, fields) {
        const result = await WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: id,
            fields: fields.join(","),
            resolveRedirect: 1,
        });
        return new CachedPerson(result[0].person);
    }
}
