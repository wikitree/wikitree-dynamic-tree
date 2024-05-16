self.addEventListener(
    "message",
    function (e) {
        console.log("4 Worker received data:", e.data);
        const familyMap = new Map(e.data.familyMap); // Reconstruct the map inside the worker
        const results = processRelationships(
            familyMap,
            e.data.rootPersonId,
            e.data.loggedInUser,
            e.data.loggedInUserId
        );
        console.log("7 Worker sending results:", results);
        self.postMessage({ type: "completed", results: results.relationships, dbEntries: results.dbEntries });
    },
    false
);

/*
self.addEventListener("error", function (e) {
    console.error("14 Worker error:", e);
    self.postMessage({ type: "error", message: `Worker error: ${e.message}` });
});
*/

self.console.log = function (message) {
    self.postMessage({ type: "log", message: message });
};

let logging = false;

function processRelationships(familyMap, rootPersonId, loggedInUser, loggedInUserId) {
    // Logging to check the content
    console.log("27 Processing relationships for root ID:", rootPersonId);
    console.log(familyMap);

    // Your previous relationship processing logic here
    let ancestorMaps = new Map();
    ancestorMaps.set("familyMap", familyMap);
    let relationships = determineAllRelationships(rootPersonId, ancestorMaps);

    relationships.forEach((relationship) => {
        if (relationship.personId) {
            let rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);
            let personAncestors = buildAncestorMap(relationship.personId, familyMap, ancestorMaps);
            let commonAncestors = findMostRecentCommonAncestors(
                rootAncestors,
                personAncestors,
                familyMap,
                rootPersonId,
                relationship.personId,
                ancestorMaps
            );

            if (commonAncestors.length > 0) {
                relationship.commonAncestors = commonAncestors;
            }
        }
    });

    // Log logged in user and rootpersonid
    console.log("Logged in user:" + loggedInUser);
    console.log("Logged in user ID:" + loggedInUserId);
    console.log("Root person ID:" + rootPersonId);

    // Create data structure for IndexedDB entries
    let dbEntries = createDbEntries(relationships, rootPersonId, loggedInUser, loggedInUserId, familyMap);

    return { relationships, dbEntries }; // Return both processed results and db entries
}

function createDbEntries(relationships, rootPersonId, loggedInUser, loggedInUserId, familyMap) {
    if (loggedInUserId != rootPersonId) {
        return [];
    }
    return relationships.map((relationship) => {
        const person = familyMap.get(relationship.personId);
        return {
            key: `${person.Name}:${loggedInUser}`,
            value: {
                theKey: `${person.Name}:${loggedInUser}`,
                userId: loggedInUser,
                id: person.Name,
                distance: person?.Meta?.Degrees,
                relationship: relationship.relationship,
                commonAncestors: relationship.commonAncestors,
            },
        };
    });
}

function findMostRecentCommonAncestors(
    rootAncestors,
    personAncestors,
    familyMap,
    rootPersonId,
    personId,
    ancestorMaps
) {
    let commonAncestors = [];
    let minGeneration = Infinity;

    rootAncestors.forEach((gen1, ancestorId) => {
        if (personAncestors.has(ancestorId)) {
            let gen2 = personAncestors.get(ancestorId);
            let maxGen = Math.max(gen1, gen2);

            if (maxGen < minGeneration) {
                commonAncestors = [
                    {
                        ancestor_id: ancestorId,
                        ancestor: getAncestorDetails(ancestorId, familyMap),
                        relationshipToRoot: describeRelationshipFromGenerations(
                            gen1,
                            0,
                            familyMap.get(ancestorId).Gender
                        ),
                        relationshipToPerson: describeRelationshipFromGenerations(
                            gen2,
                            0,
                            familyMap.get(ancestorId).Gender
                        ),
                        path1Length: gen1,
                        path2Length: gen2,
                    },
                ];
                minGeneration = maxGen;
            } else if (maxGen === minGeneration) {
                commonAncestors.push({
                    ancestor_id: ancestorId,
                    ancestor: getAncestorDetails(ancestorId, familyMap),
                    relationshipToRoot: describeRelationshipFromGenerations(gen1, 0, familyMap.get(ancestorId).Gender),
                    relationshipToPerson: describeRelationshipFromGenerations(
                        gen2,
                        0,
                        familyMap.get(ancestorId).Gender
                    ),
                    path1Length: gen1,
                    path2Length: gen2,
                });
            }
        }
    });

    return commonAncestors;
}

function getAncestorDetails(ancestorId, familyMap) {
    let person = familyMap.get(ancestorId);
    return {
        mId: ancestorId,
        mName: person.Name,
        mFirstName: person.FirstName,
        mLastNameCurrent: person.LastNameCurrent,
        mLastNameAtBirth: person.LastNameAtBirth,
        mSuffix: person.Suffix,
        mGender: person.Gender,
        displayName: person.LongNamePrivate,
    };
}

/**
 * Builds an ancestor map for a given person.
 * @param {number} personId - The ID of the person to build the map for.
 * @param {Map} map - The map containing all people.
 * @param {Map} ancestorMaps - Cached ancestor maps for reuse.
 * @returns {Map} The ancestor map for the given person.
 */
function buildAncestorMap(personId, map, ancestorMaps) {
    if (ancestorMaps.has(personId)) {
        return ancestorMaps.get(personId);
    }

    if (!map.has(personId)) {
        return new Map(); // Return an empty map if the person ID is not found
    }

    let person = map.get(personId);
    let ancestorMap = new Map();
    ancestorMap.set(personId, 0); // Add the current person at generation 0

    // Handling Father
    if (person.Father && person.Father !== 0) {
        if (map.has(person.Father)) {
            let parentMap = buildAncestorMap(person.Father, map, ancestorMaps);
            parentMap.forEach((gen, id) => ancestorMap.set(id, gen + 1));
        }
    }

    // Handling Mother
    if (person.Mother && person.Mother !== 0) {
        if (map.has(person.Mother)) {
            let parentMap = buildAncestorMap(person.Mother, map, ancestorMaps);
            parentMap.forEach((gen, id) => ancestorMap.set(id, gen + 1));
        }
    }

    ancestorMaps.set(personId, ancestorMap);
    return ancestorMap;
}

function findFirstIntersection(map1, map2) {
    for (let [ancestorId, gen1] of map1.entries()) {
        if (map2.has(ancestorId)) {
            return { ancestorId, gen1, gen2: map2.get(ancestorId) };
        }
    }
    return null;
}

// Function to determine relationships, assuming ancestorMaps includes familyMap
function determineAllRelationships(rootPersonId, ancestorMaps) {
    if (!ancestorMaps || !ancestorMaps.get("familyMap")) {
        console.error("89 Missing familyMap in ancestorMaps");
        return [];
    }

    let results = [];
    let familyMap = ancestorMaps.get("familyMap");
    let cache = new Map(); // Cache to optimize building ancestor maps

    familyMap.forEach((value, key) => {
        if (key !== rootPersonId) {
            let relationshipData = determineRelationship(rootPersonId, key, ancestorMaps);
            results.push(relationshipData);
        }
    });

    return results;
}

function determineRelationship(rootPersonId, personId, ancestorMaps) {
    let familyMap = ancestorMaps.get("familyMap"); // Make sure this retrieval is valid
    let rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);
    let personAncestors = buildAncestorMap(personId, familyMap, ancestorMaps);

    let intersection = findFirstIntersection(rootAncestors, personAncestors);
    if (!intersection) return { personId, relationship: "", ancestorId: null };

    let personData = familyMap.get(personId);

    let { ancestorId, gen1, gen2 } = intersection;
    let relationship = describeRelationshipFromGenerations(gen1, gen2, personData.Gender);

    return {
        personId,
        relationship,
        ancestorId,
        gen1: gen1,
        gen2: gen2,
    };
}

function describeRelationshipFromGenerations(gen1, gen2, gender) {
    let diff = Math.abs(gen1 - gen2);

    if (logging) {
        console.log("135 generations:", gen1, gen2, diff);
    }

    // Direct ancestor-descendant relationships
    if (gen1 === 0 || gen2 === 0) {
        let generation = Math.max(gen1, gen2);
        if (generation === 1) {
            return { full: gender === "Male" ? "father" : "mother", abbr: gender === "Male" ? "F" : "M" };
        } else if (generation === 2) {
            return {
                full: gender === "Male" ? "grandfather" : "grandmother",
                abbr: gender === "Male" ? "GF" : "GM",
            };
        } else if (generation === 3) {
            return {
                full: gender === "Male" ? "great grandfather" : "great grandmother",
                abbr: gender === "Male" ? "GGF" : "GGM",
            };
        } else {
            let greats = generation - 3;
            return {
                full: `${ordinal(greats + 1)} great grand${gender === "Male" ? "father" : "mother"}`,
                abbr: `${ordinal(greats + 1)} GG${gender === "Male" ? "F" : "M"}`,
            };
        }
    }

    // Cousins, siblings, nieces, and nephews
    if (gen1 === gen2 && gen1 === 1) {
        return { full: gender === "Male" ? "brother" : "sister", abbr: gender === "Male" ? "B" : "S" };
    }

    // Extended family (aunts/uncles, nieces/nephews, and further)
    let olderGeneration = Math.min(gen1, gen2);
    let youngerGeneration = Math.max(gen1, gen2);
    let removal = youngerGeneration - olderGeneration;
    let isOne = gen1 === 1 || gen2 === 1;

    // Determine the relationship direction
    let isRootCloser = gen1 < gen2;

    if (isOne) {
        if (removal === 1) {
            if (isRootCloser) {
                return { full: gender === "Male" ? "nephew" : "niece", abbr: "N" };
            } else {
                return { full: gender === "Male" ? "uncle" : "aunt", abbr: gender === "Male" ? "U" : "A" };
            }
        } else if (removal === 2) {
            if (isRootCloser) {
                return { full: gender === "Male" ? "grandnephew" : "grandniece", abbr: "GN" };
            } else {
                return {
                    full: gender === "Male" ? "granduncle" : "grandaunt",
                    abbr: gender === "Male" ? "GU" : "GA",
                };
            }
        } else {
            let greats = removal - 2;
            let relationship = isRootCloser
                ? gender === "Male"
                    ? "nephew"
                    : "niece"
                : gender === "Male"
                ? "uncle"
                : "aunt";
            let abbr = isRootCloser ? "N" : gender === "Male" ? "U" : "A";
            let relationshipPrefix = greats == 1 ? "great " : `${ordinal(greats)} great `;
            let abbrPrefix = greats == 1 ? "G" : `${ordinal(greats)} G`;
            return {
                full: `${relationshipPrefix}grand${relationship}`,
                abbr: `${abbrPrefix}G${abbr}`,
            };
        }
    }

    // Calculate the 'cousin level' based on the smaller generation number (subtracted by 1)
    // and the difference between the generations to determine how many times removed they are.
    let baseGeneration = Math.min(gen1, gen2);
    let cousinLevel = baseGeneration - 1; // cousin level is one less than the lower generation
    let removed = Math.abs(gen1 - gen2); // the 'removed' count is the difference between the two generations

    // Determine the full description and abbreviation for the cousin relationship
    let cousinDescription = cousinLevel === 0 ? "cousin" : `${ordinal(cousinLevel)} cousin`;
    let cousinAbbr = cousinLevel === 0 ? "C" : `${cousinLevel}C`;
    if (removed > 0) {
        cousinDescription += ` ${onceTwice(removed)} removed`;
        cousinAbbr += `${removed}R`;
    }

    // Adjust description for first cousins
    if (cousinLevel === 1) {
        cousinDescription = removed > 0 ? "first" : "cousin";
    }

    return { full: cousinDescription, abbr: cousinAbbr.toUpperCase() };
}

function ordinal(n) {
    if (n === 1) return ""; // no prefix for '1st'
    const v = n % 100;
    return v >= 11 && v <= 13
        ? n + "th"
        : n % 10 === 1
        ? n + "st"
        : n % 10 === 2
        ? n + "nd"
        : n % 10 === 3
        ? n + "rd"
        : n + "th";
}

function onceTwice(removal) {
    return removal === 1 ? "once" : removal === 2 ? "twice" : `${ordinal(removal)} times`;
}
