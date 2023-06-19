export class API {
    static APP_ID = "AncestorLineExplorer";
    static MAX_API_DEPTH = 10; // how many generations we are prepared to retrieve per API call
    static GET_PERSON_LIMIT = 1000;
    static PRIMARY_FIELDS = [
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
        "LastNameOther",
        "MiddleName",
        "Mother",
        "Name",
        "Nicknames",
        // "Photo",
        "Prefix",
        "RealName",
        "Suffix",
    ];

    static async getAncestorData(id, depth, fields = API.PRIMARY_FIELDS) {
        return WikiTreeAPI.getAncestors(API.APP_ID, id, depth, fields);
    }

    static async getRelatives(ids, fields = API.PRIMARY_FIELDS) {
        return WikiTreeAPI.getRelatives(API.APP_ID, ids, fields);
    }

    static async getPeople(ids, ancestors = 0, start = 0, limit = API.GET_PERSON_LIMIT, fields = API.PRIMARY_FIELDS) {
        const [status, resultByKey, people] = await WikiTreeAPI.getPeople(API.APP_ID, ids, fields, {
            ancestors: ancestors,
            start: start,
            limit: limit,
        });
        if (status != "") {
            console.warn(`getpeople returned status: ${status}`);
        }
        return [resultByKey, people];
    }
}
