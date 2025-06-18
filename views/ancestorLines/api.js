export class API {
    static APP_ID = "AncestorLineExplorer";
    static MAX_API_DEPTH = 10; // how many generations we are prepared to retrieve per API call
    static GET_PERSON_LIMIT = 1000;
    static PRIMARY_FIELDS = [
        "BirthDate",
        "BirthDateDecade",
        "BirthLocation",
        "DataStatus",
        "DeathDate",
        "DeathDateDecade",
        "DeathLocation",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "Father",
        "FirstName",
        "Gender",
        "HasChildren",
        "Id",
        "IsLiving",
        "LastNameAtBirth",
        "LastNameCurrent",
        "LastNameOther",
        "MiddleName",
        "Mother",
        "Name",
        "Nicknames",
        "NoChildren",
        // "Photo",
        "Prefix",
        "Privacy",
        "RealName",
        "Suffix",

        "Spouse", // added for Person Popups
        "PhotoData"
    ];

    static FOR_BIO_CHECK = ["Bio", "IsMember", "Manager"];

    static async getPeople(ids, ancestors = 0, start = 0, limit = API.GET_PERSON_LIMIT, withBios = false) {
        const fields = withBios ? API.PRIMARY_FIELDS.concat(API.FOR_BIO_CHECK) : API.PRIMARY_FIELDS;
        const [status, resultByKey, people] = await WikiTreeAPI.getPeople(API.APP_ID, ids, fields, {
            ancestors: ancestors,
            start: start,
            limit: limit,
        });
        if (status != "") {
            console.warn(`getpeople returned status: ${status}`);
        }
        return [status, resultByKey, people];
    }
}
