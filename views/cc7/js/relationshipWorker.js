let accumulatedFamilyMapEntries = [];

self.addEventListener("message", function (e) {
    console.log("Worker received data:", e.data);

    if (!e.data || !e.data.cmd) {
        console.error("Received null or undefined data or missing cmd");
        self.postMessage({ type: "error", message: "Received null or undefined data or missing cmd" });
        return;
    }

    if (e.data.cmd === "chunk") {
        console.log("Worker received chunk:", e.data.data);
        if (e.data.data && Array.isArray(e.data.data)) {
            accumulatedFamilyMapEntries.push(...e.data.data);
            self.postMessage({ type: "receivedChunk" });
        } else {
            console.error("Chunk data is not an array or is missing");
            self.postMessage({ type: "error", message: "Chunk data is not an array or is missing" });
        }
    } else if (e.data.cmd === "process") {
        console.log("Worker received process command");
        try {
            console.log("Reconstructing familyMap from chunks...");
            const familyMap = new Map(accumulatedFamilyMapEntries);
            accumulatedFamilyMapEntries = []; // Clear memory
            console.log("Reconstructed familyMap:", familyMap);
            const results = processRelationships(
                familyMap,
                e.data.rootPersonId,
                e.data.loggedInUser,
                e.data.loggedInUserId
            );
            self.postMessage({ type: "completed", results: results.relationships, dbEntries: results.dbEntries });
        } catch (error) {
            console.error("Error processing relationships:", error);
            self.postMessage({ type: "error", message: error.message });
        }
    } else {
        console.error("Unknown command:", e.data.cmd);
        self.postMessage({ type: "error", message: `Unknown command: ${e.data.cmd}` });
    }
});

function processRelationships(familyMap, rootPersonId, loggedInUser, loggedInUserId) {
    console.log("26: Processing relationships for root ID:", rootPersonId);

    const ancestorMaps = new Map();
    ancestorMaps.set("familyMap", familyMap);
    const relationships = determineAllRelationships(rootPersonId, ancestorMaps);
    const rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);

    relationships.forEach((relationship) => {
        if (relationship.personId) {
            const personAncestors = buildAncestorMap(relationship.personId, familyMap, ancestorMaps);
            const commonAncestors = findMostRecentCommonAncestors(
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

    console.log("Logged in user:", loggedInUser);
    console.log("Logged in user ID:", loggedInUserId);
    console.log("Root person ID:", rootPersonId);

    const dbEntries = createDbEntries(relationships, rootPersonId, loggedInUser, loggedInUserId, familyMap);

    return { relationships, dbEntries };
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
                relationship: relationship.relationship.full,
                commonAncestors: relationship.commonAncestors || [],
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
            const gen2 = personAncestors.get(ancestorId);
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

function makeDates(person) {
    if (!person) return " ";
    const yearFromDate = (date) => {
        if (!date) return " ";
        return date.split("-")[0];
    };
    let birthYear = " ";
    if (person.BirthDate && person.BirthDate !== "0000-00-00") {
        birthYear = yearFromDate(person.BirthDate);
    } else if (person.BirthDateDecade) {
        birthYear = person.BirthDateDecade;
    }

    let deathYear = " ";
    if (person.DeathDate && person.DeathDate !== "0000-00-00") {
        deathYear = yearFromDate(person.DeathDate);
    } else if (person.DeathDateDecade) {
        deathYear = person.DeathDateDecade;
    }

    let birthStatus = "";
    let deathStatus = "";
    if (person.DataStatus) {
        if (person.DataStatus.BirthDate) {
            switch (person.DataStatus.BirthDate) {
                case "before":
                    birthStatus = "bef.";
                    break;
                case "after":
                    birthStatus = "aft.";
                    break;
                case "guess":
                    birthStatus = "abt.";
                    break;
            }
        }
        if (person.DataStatus.DeathDate) {
            switch (person.DataStatus.DeathDate) {
                case "before":
                    deathStatus = "bef.";
                    break;
                case "after":
                    deathStatus = "aft.";
                    break;
                case "guess":
                    deathStatus = "abt.";
                    break;
            }
        }
    }

    return `${birthStatus}${birthYear}–${deathStatus}${deathYear}`;
}

function getAncestorDetails(ancestorId, familyMap) {
    const person = familyMap.get(ancestorId);
    return {
        mId: ancestorId,
        mName: person.Name,
        mFirstName: person.FirstName,
        mLastNameCurrent: person.LastNameCurrent,
        mLastNameAtBirth: person.LastNameAtBirth,
        mGender: person.Gender,
        mDerived: { LongNameWithDates: `${person.LongNamePrivate} (${makeDates(person)})` },
        displayName: person.LongNamePrivate,
    };
}

function buildAncestorMap(personId, map, ancestorMaps) {
    if (ancestorMaps.has(personId)) {
        return ancestorMaps.get(personId);
    }

    if (!map.has(personId)) {
        return new Map(); // Return an empty map if the person ID is not found
    }

    const ancestorMap = new Map();
    const queue = [{ personId, generation: 0 }];

    while (queue.length > 0) {
        const { personId, generation } = queue.shift();
        ancestorMap.set(personId, generation);

        const person = map.get(personId);

        // Handling Father
        if (person.Father && person.Father !== 0) {
            if (map.has(person.Father) && !ancestorMap.has(person.Father)) {
                queue.push({ personId: person.Father, generation: generation + 1 });
            }
        }

        // Handling Mother
        if (person.Mother && person.Mother !== 0) {
            if (map.has(person.Mother) && !ancestorMap.has(person.Mother)) {
                queue.push({ personId: person.Mother, generation: generation + 1 });
            }
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

function determineAllRelationships(rootPersonId, ancestorMaps) {
    if (!ancestorMaps || !ancestorMaps.get("familyMap")) {
        console.error("206: Missing familyMap in ancestorMaps");
        return [];
    }

    const results = [];
    const familyMap = ancestorMaps.get("familyMap");

    familyMap.forEach((value, key) => {
        if (key !== rootPersonId) {
            const relationshipData = determineRelationship(rootPersonId, key, ancestorMaps);
            results.push(relationshipData);
        }
    });

    return results;
}

function determineRelationship(rootPersonId, personId, ancestorMaps) {
    const familyMap = ancestorMaps.get("familyMap"); // Make sure this retrieval is valid
    const rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);
    const personAncestors = buildAncestorMap(personId, familyMap, ancestorMaps);

    const intersection = findFirstIntersection(rootAncestors, personAncestors);
    if (!intersection) return { personId, relationship: "", ancestorId: null };
    const personData = familyMap.get(personId);

    const { ancestorId, gen1, gen2 } = intersection;
    const relationship = describeRelationshipFromGenerations(gen1, gen2, personData.Gender);

    return {
        personId,
        relationship,
        ancestorId,
        gen1: gen1,
        gen2: gen2,
    };
}

function describeRelationshipFromGenerations(gen1, gen2, gender) {
    // Direct ancestor-descendant relationships
    if (gen1 === 0 || gen2 === 0) {
        const generation = Math.max(gen1, gen2);
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
            const greats = generation - 3;
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
    const olderGeneration = Math.min(gen1, gen2);
    const youngerGeneration = Math.max(gen1, gen2);
    const removal = youngerGeneration - olderGeneration;
    const isOne = gen1 === 1 || gen2 === 1;

    // Determine the relationship direction
    const isRootCloser = gen1 < gen2;

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
            const greats = removal - 2;
            const relationship = isRootCloser
                ? gender === "Male"
                    ? "nephew"
                    : "niece"
                : gender === "Male"
                ? "uncle"
                : "aunt";
            const abbr = isRootCloser ? "N" : gender === "Male" ? "U" : "A";
            const relationshipPrefix = greats == 1 ? "great " : `${ordinal(greats)} great `;
            const abbrPrefix = greats == 1 ? "G" : `${ordinal(greats)} G`;
            return {
                full: `${relationshipPrefix}grand${relationship}`,
                abbr: `${abbrPrefix}G${abbr}`,
            };
        }
    }

    // Calculate the 'cousin level' based on the smaller generation number (subtracted by 1)
    // and the difference between the generations to determine how many times removed they are.
    const baseGeneration = Math.min(gen1, gen2);
    const cousinLevel = baseGeneration - 1; // cousin level is one less than the lower generation
    const removed = Math.abs(gen1 - gen2); // the 'removed' count is the difference between the two generations

    // Determine the full description and abbreviation for the cousin relationship
    let cousinDescription = cousinLevel === 0 ? "cousin" : `${ordinal(cousinLevel)} cousin`;
    let cousinAbbr = cousinLevel === 0 ? "C" : `${cousinLevel}C`;
    if (removed > 0) {
        cousinDescription += ` ${onceTwice(removed)} removed`;
        cousinAbbr += `${removed}R`;
    }

    // Adjust description for first cousins
    if (cousinLevel === 1 && removed === 0) {
        cousinDescription = "cousin";
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
