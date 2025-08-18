export class CacheLoader {
    static APP_ID = "CacheLoader";
    static DEFAULT_PRIMARY_FIELDS = [
        "BirthDate",
        "BirthLocation",
        "DataStatus",
        "DeathDate",
        "DeathLocation",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "Father",
        "FirstName",
        "Gender",
        "HasChildren",
        "Id",
        "LastNameAtBirth",
        "LastNameCurrent",
        "MiddleInitial",
        "Mother",
        "Name",
        "Suffix",
    ];
    static DEFAULT_VARIABLE_FIELDS = ["Parents", "Spouses", "Children"];

    #allFields = [...new Set([...CacheLoader.DEFAULT_PRIMARY_FIELDS, ...CacheLoader.DEFAULT_VARIABLE_FIELDS])];

    #appId;
    #primaryFields;
    #variableFields;

    /**
     * Construct the loader with two sets of fields to load:
     *
     * @param {*} primaryFields (optional) fields that will always be retrieved.
     *            See CacheLoader.DEFAULT_PRIMARY_FIELDS for the default
     * @param {*} variableFields (optional) additional fields that will be retrieved by default, but the user
     *             can change these per get() call. The default value is ["Parents", "Spouses", "Children"]
     */
    constructor(appId, primaryFields, variableFields) {
        this.#appId = appId || CacheLoader.APP_ID;
        this.#primaryFields =
            typeof primaryFields === "undefined" ? CacheLoader.DEFAULT_PRIMARY_FIELDS : [...new Set(primaryFields)];
        this.#variableFields =
            typeof variableFields === "undefined" ? CacheLoader.DEFAULT_VARIABLE_FIELDS : [...new Set(variableFields)];
        this.#allFields = [...new Set([...this.#primaryFields, ...this.#variableFields])];
    }

    /**
     * Retrieve the indicated profile using getPerson. By default all the fields (primary and variable) specified
     * in the constructor will be retrieved.
     * @param {*} id The profile id to retrieve
     * @param {*} requestedVariableFields (optional) If not specified, all the primary and variable fields defined
     *            in the constructor, plus any additionalFields specfied, will be retrieved. If specified, these
     *            fields will replace the set of variable fields specified in the constructor.
     * @param {*} additionalFields (optional) Additional fields to be included in the retrieval.
     * @returns
     */
    async get(id, cache, requestedVariableFields, additionalFields) {
        let data;
        if (!additionalFields && !requestedVariableFields) {
            data = await this.getPersonViaAPI(id, this.#allFields);
        } else {
            data = await this.getPersonViaAPI(id, [
                ...new Set([
                    ...this.#primaryFields,
                    ...(requestedVariableFields ? requestedVariableFields : CacheLoader.DEFAULT_VARIABLE_FIELDS),
                    ...(additionalFields ? additionalFields : []),
                ]),
            ]);
        }
        let person = null;
        const peopleToAdd = [data];
        while (peopleToAdd.length > 0) {
            const pData = peopleToAdd.shift();
            if (!pData || !pData.Id) {
                continue; // skip if no data or no Id
            }
            // const id = +data.Id;
            // if (cache.has(id)) {
            //     continue; // already cached
            // }
            // add the person to the cache
            for (const field of ["Parents", "Spouses", "Children", "Siblings"]) {
                const mapOfPeopleData = pData[field];
                if (mapOfPeopleData) {
                    for (const rData of Object.values(mapOfPeopleData)) {
                        peopleToAdd.push(rData);
                    }
                }
            }
            const relatedPerson = cache.getWithData(pData);
            if (!person) person = relatedPerson; // the first person is the one we are looking for
        }
        return person;
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
            appId: this.#appId,
            action: "getPerson",
            key: id,
            fields: fields.join(","),
            resolveRedirect: 1,
        });
        return result[0].person;
    }
}
