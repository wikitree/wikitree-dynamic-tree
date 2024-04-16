self.addEventListener(
    "message",
    function (e) {
        console.log("Worker received data:", e.data);
        const familyMap = new Map(e.data.familyMap); // Reconstruct the map inside the worker
        const results = processRelationships(familyMap, e.data.rootPersonId);
        self.postMessage({ type: "completed", results: results });
    },
    false
);

self.addEventListener("error", function (e) {
    console.error("Worker error:", e);
    self.postMessage({ type: "error", message: `Worker error: ${e.message}` });
});

function processRelationships(familyMap, rootPersonId) {
    // Logging to check the content
    console.log("Processing relationships for root ID:", rootPersonId);
    console.log("Family Map is:", familyMap);

    // Your previous relationship processing logic here
    let ancestorMaps = new Map();
    ancestorMaps.set("familyMap", familyMap);
    let relationships = determineAllRelationships(rootPersonId, ancestorMaps);
    return relationships; // Assuming this returns the processed results
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
        console.error("Missing familyMap in ancestorMaps");
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

let logging = false;

function determineRelationship(rootPersonId, personId, ancestorMaps) {
    let familyMap = ancestorMaps.get("familyMap"); // Make sure this retrieval is valid
    let rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);
    let personAncestors = buildAncestorMap(personId, familyMap, ancestorMaps);

    let intersection = findFirstIntersection(rootAncestors, personAncestors);
    if (!intersection) return { personId, relationship: "No direct common ancestor", ancestorId: null };

    let personData = familyMap.get(personId);

    if (personData?.Name == "Boaz-310") {
        logging = true;
    } else {
        logging = false;
    }

    let { ancestorId, gen1, gen2 } = intersection;
    let relationship = describeRelationshipFromGenerations(gen1, gen2, personData.Gender);

    return {
        personId,
        relationship,
        ancestorId,
    };
}

function describeRelationshipFromGenerations(gen1, gen2, gender) {
    let diff = Math.abs(gen1 - gen2);

    if (logging) {
        console.log("generations:", gen1, gen2, diff);
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
        return { full: gender === "Male" ? "brother" : "sister", abbr: gender == "Male" ? "B" : "S" };
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
