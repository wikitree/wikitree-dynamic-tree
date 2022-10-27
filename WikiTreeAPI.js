/*
 * WikiTreeAPI.js
 *
 * Provide a "Person" object where data is gathered from the WikiTree API.
 * We use the WikiTree API action "getPerson" to retrieve the profile data and then store it in object fields.
 *
 */

// Put our functions into a "WikiTreeAPI" namespace.
window.WikiTreeAPI = window.WikiTreeAPI || {};

const dateTokenCache = {};

/**
 * Serializes WikiTree fuzzy date using formatting string
 * @param  {object}  person Person object received from WikiTree API
 * @param  {string}  fieldName Name of the fuzzy date to be serialized, possible values: `BirthDate`, `DeathDate`
 * @param  {object}  options object containing foloowing options
 *                      * {string} [formatString="MMM DD, YYYY"]
 *                      * {boolean} [withCertainty=true]
 * @return {string} Serialized date
 */
window.wtDate = function (person, fieldName, options = {}) {
    const MONTHS = [
        // just to keep it more compact and not too long (more than 120 characters)
        ...["January", "February", "March", "April", "May", "June"],
        ...["July", "August", "September", "October", "November", "December"],
    ];

    const CERTAINTY_MAP = { guess: "about", before: "before", after: "after" }; // '' & 'certain' will produce ''

    const DEFAULT_OPTIONS = { formatString: "MMM DD, YYYY", withCertainty: true };
    options = { ...DEFAULT_OPTIONS, ...options };

    function tokenize(formatString) {
        if (dateTokenCache[formatString]) return dateTokenCache[formatString];

        let prev = null;
        let tokens = [];

        for (let letter of formatString) {
            if (prev !== letter && ("DMY".includes(prev) || "DMY".includes(letter))) {
                // prev and letter are different and one of them is one on D|M|Y
                tokens[tokens.length] = letter;
            } else if (
                (!"DMY".includes(prev) && !"DMY".includes(letter)) || // both prev and letter are not one of D|M|Y
                (prev === letter && "DMY".includes(letter)) || // prev and letter are same and one of D|M|Y
                (!"DMY".includes(letter) && (prev !== letter || !"DMY".includes(prev)))
            ) {
                tokens[tokens.length - 1] += letter;
            }
            prev = letter;
        }

        dateTokenCache[formatString] = tokens;
        return tokens;
    }

    tokens = tokenize(options.formatString);

    let prop = person?.[fieldName];

    if (!prop || prop === "0000-00-00") return "[unknown]";

    let [day, month, year] = prop
        .split("-")
        .reverse()
        .map((x) => parseInt(x));

    if (month === 0) {
        // month is unknown, rest doesn't makes sense
        tokens = tokens.filter((token) => token.includes("Y"));
    }

    tokens = tokens
        .map((token) => {
            if (!"DMY".includes(token[0])) return token;

            return Object({
                D: day ? day : null,
                DD: day ? String(day).padStart(2, "0") : null,
                M: month ? month : null,
                MM: month ? String(month).padStart(2, "0") : null,
                MMM: month ? MONTHS[month - 1].slice(0, 3) : null,
                MMMM: month ? MONTHS[month - 1] : null,
                YYYY: prop[2] ? String(year).padStart(4, "0") : null,
            })[token];
        })
        .filter((token) => token !== null);

    let serialized = tokens.join("");
    serialized = serialized.replaceAll(" ,", ","); // solves one of many possible issues when the day is unknown

    certainty = options.withCertainty ? `${CERTAINTY_MAP?.[person?.DataStatus[fieldName]] || ""} ` : "";

    return `${certainty}${serialized}`;
};

/**
 * Serializes WikiTree complete name
 * @param  {object}  person Person object received from WikiTree API
 * @param  {object}  options object containing foloowing options
 *                      * {array[string]} fields - possible values: `FirstName`, `LastNameCurrent`, `LastNameAtBirth`,
 *                                                                  `MiddleName`, `Nickname`, `Prefix`, `Suffix`
 * @return {string} Serialized name
 */
window.wtCompleteName = function (person, options = {}) {
    const DEFAULT_OPTIONS = { fields: ["FirstName", "LastNameCurrent", "LastNameAtBirth", "MiddleName"] };
    options = { ...DEFAULT_OPTIONS, ...options };

    const has = (field) => options.fields.includes(field);

    if (has("LastNameAtBirth") && has("LastNameCurrent")) {
        lastName =
            person?.LastNameCurrent !== person.LastNameAtBirth
                ? (person?.LastNameAtBirth ? `(${person.LastNameAtBirth}) ` : null) + person.LastNameCurrent
                : person?.LastNameAtBirth || null;
    } else if (has("LastNameAtBirth")) {
        lastName = person?.LastNameAtBirth ? person.LastNameAtBirth : person?.LastNameCurrent || null;
    } else if (has("LastNameCurrent")) {
        lastName = person?.LastNameCurrent ? person.LastNameCurrent : person?.LastNameAtBirth || null;
    }

    const result = [
        has("Prefix") && person?.Prefix ? person.Prefix : null,
        has("FirstName") && (person?.FirstName || person.RealName) ? person.FirstName || person.RealName : null,
        has("MiddleName") && person?.MiddleName ? person.MiddleName : null,
        has("Nickname") && person?.Nicknames ? `<span class="nickname">„${person.Nicknames}"</span>` : null,
        lastName,
        has("Suffix") && person?.Suffix ? person.Suffix : null,
    ];

    return result.filter((part) => part !== null).join(" ");
};

/**
 * Our basic constructor for a Person. We expect the "person" data from the API returned result
 * (see getPerson below). The basic fields are just stored in the internal _data array.
 * We pull out the Parent and Child elements as their own Person objects.
 *
 * NOTE: Calling the constructor directly bypasses any caching of Person objects. Consider
 * rather calling WikiTree.makePerson() which will ensure newly created Person objects are cached
 * for re-use.
 */
WikiTreeAPI.Person = class Person {
    constructor(data) {
        this._data = data;
        let name = this.getDisplayName();
        condLog(`New person data: for ${this.getId()}: ${name} (${getRichness(data)})`, data);

        if (data.Parents) {
            condLog(`Setting parents for ${this.getId()}: ${name}...`);
            for (var p in data.Parents) {
                this._data.Parents[p] = WikiTreeAPI.makePerson(data.Parents[p]);
            }
        }

        this.setSpouses(data);

        if (data.Children) {
            condLog(`Setting children for ${this.getId()}: ${name}`);
            for (var c in data.Children) {
                this._data.Children[c] = new WikiTreeAPI.makePerson(data.Children[c]);
            }
        }
    }

    // Basic "getters" for the data elements.
    getId() {
        return this._data.Id;
    }
    getName() {
        return this._data.Name;
    }
    getGender() {
        return this._data.Gender;
    }
    getBirthDate() {
        return this._data.BirthDate;
    }
    getBirthLocation() {
        return this._data.BirthLocation;
    }
    getDeathDate() {
        return this._data.DeathDate;
    }
    getDeathLocation() {
        return this._data.DeathLocation;
    }
    getChildren() {
        return this._data.Children;
    }
    getFatherId() {
        return this._data.Father;
    }
    getMotherId() {
        return this._data.Mother;
    }
    getDisplayName() {
        return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate;
    }
    getPhotoUrl() {
        if (this._data.PhotoData && this._data.PhotoData["url"]) {
            return this._data.PhotoData["url"];
        }
    }

    // Getters for Mother and Father return the Person objects, if there is one.
    // The getMotherId and getFatherId functions above return the actual .Mother and .Father data elements (ids).
    getMother() {
        if (this._data.Mother && this._data.Parents) {
            return this._data.Parents[this._data.Mother];
        }
    }
    getFather() {
        if (this._data.Father && this._data.Parents) {
            return this._data.Parents[this._data.Father];
        }
    }
    /**
     * When a person object is created from data in e.g. a Parents field of another profile, this parent Person object
     * typically does not have Parents, Children, or Spouses fields. We refer to a Person object that has any of these
     * fields as 'enriched'. The degree to which a profile has been 'enriched' (its 'richness') depends on how
     * many of these 3 fields are present.
     */
    getRichness() {
        return getRichness(this._data);
    }

    // We use a few "setters". For the parents, we want to update the Parents Person objects as well as the ids
    // themselves.
    // For TreeViewer we only set the parents and children, so we don't need setters for all the _data elements.
    setMother(person) {
        var id = person.getId();
        var oldId = this._data.Mother;
        this._data.Mother = id;
        if (!this._data.Parents) {
            this._data.Parents = {};
        } else if (oldId) {
            delete this._data.Parents[oldId];
        }
        this._data.Parents[id] = person;
    }
    setFather(person) {
        var id = person.getId();
        var oldId = this._data.Father;
        this._data.Father = id;
        if (!this._data.Parents) {
            this._data.Parents = {};
        } else if (oldId) {
            delete this._data.Parents[oldId];
        }
        this._data.Parents[id] = person;
    }
    setChildren(children) {
        this._data.Children = children;
    }
    setSpouses(data) {
        // this._data.FirstSpouseId = undefined
        if (data.Spouses) {
            condLog(
                `setSpouses for ${this.getId()}: ${this.getDisplayName()}: ${summaryOfPeople(data.Spouses)}`,
                data.Spouses
            );
            let list = [];
            for (let s in data.Spouses) {
                list.push(WikiTreeAPI.makePerson(data.Spouses[s]));
            }
            sortByMarriageDate(list);
            if (list.length > 0) {
                // this._data.FirstSpouseId = list[0].getId();
                for (let spouse of list) {
                    this._data.Spouses[spouse.getId()] = spouse;
                }
            }
        }
    }

    toString() {
        return `${this.getId()}: ${this.getDisplayName()} (${this.getRichness()})`;
    }
}; // End Person class definition

const peopleCache = new Map();
WikiTreeAPI.clearCache = function () {
    peopleCache.clear();
    condLog("PEOPLE CACHE CLEARED");
};

/**
 * Return a person object with the given id.
 * If an enriched person (see Person.getRichness()) with the given id already exists in our cache
 * and it has at least the requested richness level, the cached value is returned.
 * Otherwise a new API call is made and the result (if successful)
 * is stored in the cache before it is returned.
 *
 * @param {*} id The WikiTree ID of the person to retrieve
 * @param {*} fields An array of field names to retrieve for the given person
 * @returns a Person object
 */
WikiTreeAPI.getPerson = async function (id, fields) {
    let cachedPerson = peopleCache.get(id);
    if (cachedPerson && isRequestCoveredByPerson(fields, cachedPerson)) {
        condLog(`getPerson from cache ${cachedPerson.toString()}`);
        return new Promise((resolve, reject) => {
            resolve(cachedPerson);
        });
    }

    const newPerson = await WikiTreeAPI.getPersonViaAPI(id, fields);
    condLog(`getPerson caching ${newPerson.toString()}`);
    peopleCache.set(id, newPerson);
    return newPerson;
};

/**
 * Construct a person object from the given data object rerieved via an API call.
 * However, if an enriched person with the given id already exists in our cache
 * and it has at least the same level of richness than the new data, the cached
 * value is returned instead.
 *
 * @param {*} data A JSON object for a person retrieved via the API
 * @returns a Person object. It will also have been cached for re-use
 */
WikiTreeAPI.makePerson = function (data) {
    let id = data.Id;
    let cachedPerson = peopleCache.get(id);
    if (cachedPerson && isSameOrHigherRichness(cachedPerson._data, data)) {
        condLog(`makePerson from cache ${cachedPerson.toString()}`);
        return cachedPerson;
    }

    let newPerson = new WikiTreeAPI.Person(data);
    condLog(`makePerson caching ${newPerson.toString()}`);
    peopleCache.set(id, newPerson);
    return newPerson;
};

/**
 * To get a Person for a given id, we POST to the API's getPerson action. When we get a result back,
 * we convert the returned JSON data into a Person object.
 * Note that postToAPI returns the Promise from jquerys .ajax() call.
 * That feeds our .then() here, which also returns a Promise, which gets resolved by the return inside the "then" function.
 * So we can use this through our asynchronous actions with something like:
 * WikiTree.getPersonViaAPI.then(function(result) {
 *    // the "result" here is that from our API call. The profile data is in result[0].person.
 * });
 *
 * @param {*} id The WikiTree ID of the person to retrieve
 * @param {*} fields An array of field names to retrieve for the given person
 * @returns a Promise
 */
WikiTreeAPI.getPersonViaAPI = function (id, fields) {
    return WikiTreeAPI.postToAPI({
        action: "getPerson",
        key: id,
        fields: fields.join(","),
        resolveRedirect: 1,
    }).then(function (result) {
        return new WikiTreeAPI.Person(result[0].person);
    });
};

/**
 * To get a set of Ancestors for a given id, we POST to the API's getAncestors action. When we get a result back,
 * we leave the result as an array of objects
 * Note that postToAPI returns the Promise from jquerys .ajax() call.
 * That feeds our .then() here, which also returns a Promise, which gets resolved by the return inside the "then" function.
 *
 * So we can use this through our asynchronous actions with something like:
 * WikiTree.getAncestors(myID, 5, ['Id','Name', 'LastNameAtBirth']).then(function(result) {
 *    // the "result" here is that from our API call. The profile data is in result[0].ancestors,
 *    // which will be an array of objects
 * });
 *
 * WARNING:  If you just do a NewAncestorsArray = WikiTree.getAncestors(id,depth,fields);
 *     --> what you get is the promise object - NOT the array of ancestors you might expect.
 * You HAVE to use the .then() with embedded function to wait and process the results
 *
 * @param {*} id
 * @param {*} depth
 * @param {*} fields
 * @returns
 */
WikiTreeAPI.getAncestors = function (id, depth, fields) {
    return WikiTreeAPI.postToAPI({
        action: "getAncestors",
        key: id,
        depth: depth,
        fields: fields.join(","),
        resolveRedirect: 1,
    }).then(function (result) {
        // console.log( result[0].ancestors );
        return result[0].ancestors;
    });
};

/**
 * To get a set of Relatives for a given id or a SET of ids, we POST to the API's getRelatives action.
 * When we get a result back, we leave the result as an array of objects
 * Note that postToAPI returns the Promise from jquerys .ajax() call.
 * That feeds our .then() here, which also returns a Promise, which gets resolved by the return inside the "then"
 * function.
 *
 * So we can use this through our asynchronous actions with something like:
 *
 * WikiTree.getRelatives(nextIDsToLoad, ['Id','Name', 'LastNameAtBirth'], {getParents:true} ).then(
 *		function(result) {
 *  	 	  // FUNCTION STUFF GOES HERE TO PROCESS THE ITEMS returned
 *				 for (let index = 0; index < result.length; index++) {
 *				 	thePeopleList.add(result[index].person);
 *				 }
 *		};
 * })
 *
 * NOTE:  the "result" here that is the input to the .then function is the JSON from our API call.
 * The profile data is in result[0].items, which will be an array of objects
 * Each object (or item) has a key, user_id, user_name, then a person object (that contains the fields requested),
 * and inside that person object could be a Parents object, a Children object, a Siblings object and a Spouses object.
 * If there is a Parents object, then in the list of fields will be Mother and Father, even if they weren't originally
 * in the fields list parameter.
 *
 * WARNING:  See note above about what you get if you don't use the .then() ....
 *
 * @param {*} IDs can be a single string, with a single ID or a set of comma separated IDs. OR it can be an array of IDs
 * @param {*} fields an array of fields to return for each profile (same as for getPerson or getProfile)
 * @param {*} options an option object which can contain these key-value pairs
 *                    - bioFormat	Optional: "wiki", "html", or "both"
 *                    - getParents	If true, the parents are returned
 *                    - getChildren	If true, the children are returned
 *                    - getSiblings	If true, the siblings are returned
 *                    - getSpouses	If true, the spouses are returned
 * @returns a Promise for the JSON in the returned API response
 */
WikiTreeAPI.getRelatives = function (IDs, fields, options = {}) {
    let getRelativesParameters = {
        action: "getRelatives",
        keys: IDs.join(","),
        fields: fields.join(","),
        resolveRedirect: 1,
    };

    // go through the options object, and add any of those options to the getRelativesParameters
    for (const key in options) {
        if (Object.hasOwnProperty.call(options, key)) {
            const element = options[key];
            getRelativesParameters[key] = element;
        }
    }
    // console.log("getRelativesParameters: ", getRelativesParameters);

    return WikiTreeAPI.postToAPI(getRelativesParameters).then(function (result) {
        // console.log("RESULT from getRelatives:", result );
        return result[0].items;
    });
};

/**
 * To get the Watchlist for the logged in user, we POST to the API's getWatchlist action. When we get a result back,
 * we leave the result as an array of objects
 * Note that postToAPI returns the Promise from jquerys .ajax() call.
 * That feeds our .then() here, which also returns a Promise, which gets resolved by the return inside the "then" function.
 *
 * So we can use this through our asynchronous actions with something like:
 * WikiTree.getWatchlist(limit, getPerson, getSpace, fields).then(function(result) {
 *    // the "result" here is that from our API call. The profile data is in result[0].watchlist, which will be an array of objects
 * });
 *
 * @param {*} limit
 * @param {*} getPerson
 * @param {*} getSpace
 * @param {*} fields
 * @returns
 */
WikiTreeAPI.getWatchlist = function (limit, getPerson, getSpace, fields) {
    return WikiTreeAPI.postToAPI({
        action: "getWatchlist",
        limit: limit,
        getPerson: getPerson,
        getSpace: getSpace,
        fields: fields.join(","),
        resolveRedirect: 1,
    }).then(function (result) {
        return result[0].watchlist;
    });
};

/**
 * This is just a wrapper for the Ajax call, sending along necessary options for the WikiTree API.
 *
 * @param {*} postData
 * @returns
 */
WikiTreeAPI.postToAPI = function (postData) {
    var API_URL = "https://api.wikitree.com/api.php";

    var ajax = $.ajax({
        // The WikiTree API endpoint
        url: API_URL,

        // We tell the browser to send any cookie credentials we might have (in case we authenticated).
        xhrFields: { withCredentials: true },

        // We're POSTing the data, so we don't worry about URL size limits and want JSON back.
        type: "POST",
        dataType: "json",
        data: postData,
    });

    return ajax;
};

/**
 * Utility function to get/set cookie data.
 * Adapted from https://github.com/carhartl/jquery-cookie which is obsolete and has been
 * superseded by https://github.com/js-cookie/js-cookie. The latter is a much more complete cookie utility.
 * Here we just want to get and set some simple values in limited circumstances to track an API login.
 * So we'll use a stripped-down function here and eliminate a prerequisite. This function should not be used
 * in complex circumstances.
 *
 * @param {*} key The name of the cookie to set/read. If reading and no key, then array of all key/value pairs is returned.
 * @param {*} value The value to set the cookie to. If undefined, the value is instead returned. If null, cookie is deleted.
 * @param {*} options Used when setting the cookie:
 *            - options.expires = Date or number of days in the future (converted to Date for cookie)
 *            - options.path, e.g. "/"
 *            - options.domain, e.g. "apps.wikitree.com"
 *            - options.secure, if true then cookie created with ";secure"
 * @returns
 */
WikiTreeAPI.cookie = function (key, value, options) {
    if (options === undefined) {
        options = {};
    }

    // If we have a value, we're writing/setting the cookie.
    if (value !== undefined) {
        if (value === null) {
            options.expires = -1;
        }
        if (typeof options.expires === "number") {
            var days = options.expires;
            options.expires = new Date();
            options.expires.setDate(options.expires.getDate() + days);
        }
        value = String(value);
        return (document.cookie = [
            encodeURIComponent(key),
            "=",
            value,
            options.expires ? "; expires=" + options.expires.toUTCString() : "",
            options.path ? "; path=" + options.path : "",
            options.domain ? "; domain=" + options.domain : "",
            options.secure ? "; secure" : "",
        ].join(""));
    }

    // We're not writing/setting the cookie, we're reading a value from it.
    var cookies = document.cookie.split("; ");

    var result = key ? null : {};
    for (var i = 0, l = cookies.length; i < l; i++) {
        var parts = cookies[i].split("=");
        var name = parts.shift();
        name = decodeURIComponent(name.replace(/\+/g, " "));
        var value = parts.join("=");
        value = decodeURIComponent(value.replace(/\+/g, " "));

        if (key && key === name) {
            result = value;
            break;
        }
        if (!key) {
            result[name] = value;
        }
    }
    return result;
};

/**
 * Sort a list of Person objects by their marriage date.
 * A person with no marriage date is placed at the end.
 */
function sortByMarriageDate(list) {
    list.sort((a, b) => {
        const aYear = a._data.marriage_date ? a._data.marriage_date.split("-")[0] : 9999;
        const bYear = b._data.marriage_date ? b._data.marriage_date.split("-")[0] : 9999;

        return aYear - bYear;
    });
}

function getRichness(data) {
    let r = 0;
    if (data.Parents) {
        r = r | 0b100;
    }
    if (data.Spouses) {
        r = r | 0b010;
    }
    if (data.Children) {
        r = r | 0b001;
    }
    return r;
}

function getRequestRichness(fields) {
    let r = 0;
    if (fields.includes("Parents")) {
        r = r | 0b100;
    }
    if (fields.includes("Spouses")) {
        r = r | 0b010;
    }
    if (fields.includes("Children")) {
        r = r | 0b001;
    }
    return r;
}

function isSameOrHigherRichness(a, b) {
    let bRichness = getRichness(b);
    return (getRichness(a) & bRichness) == bRichness;
}

function isRequestCoveredByPerson(reqFields, personData) {
    let reqRichness = getRequestRichness(reqFields);
    return (getRichness(personData) & reqRichness) == reqRichness;
}

// ===================================================================
// Functions used in debug logging

function personSummary(data) {
    return `${data.Id}: ${data.BirthName} (${getRichness(data)})`;
}

function summaryOfPeople(people) {
    let result = "";
    for (let i in people) {
        if (result.length > 0) {
            result = result.concat(",");
        }
        result = result.concat(personSummary(people[i]));
    }
    return result;
}

const logit = true;
function condLog(...args) {
    if (logit) {
        console.log.apply(null, args);
    }
}
