export class API {
    static APP_ID = "AncestorLineExplorer";
    static MAX_API_DEPTH = 8; // how many generations we are prepared to retrieve per API call
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
        "Photo",
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
}
