/**
 * This worker determines the root person's relationship to every other person in these stages:
 *
 * 1. Collect the family map
 *    The worker receives family-map (CCn) entries in `chunk` messages and accumulates them. A `process` message
 *    converts the entries into a `Map`, clears the accumulated entries, and returns a `completed` or `error` message.
 *
 * 2. Build and cache ancestor maps
 *    `buildAncestorMap()` performs a breadth-first traversal from a person through their adoptive and biological
 *    parents. Each path records its generation distance and the number of biological-parent links taken where the
 *    child also has adoptive parents. This distinguishes biological paths without labelling an ordinary parent as
 *    biological merely because no adoptive parent is known. The maps are cached for reuse. A biological-only map is
 *    also built when an adoptive parent has a separate biological relationship to the root.
 *    - Person themself: generation `0`
 *    - Parent: generation `1`
 *    - Grandparent: generation `2`
 *    - And so on
 *
 * 3. Find the closest shared ancestor
 *    `determineRelationship()` compares the root and other person's ancestor maps with `findClosestIntersection()`.
 *    It chooses the shared ancestor with the shortest combined path; a shorter maximum path length breaks a tie.
 *    That ancestor provides:
 *    - `gen1`: root person’s distance from the shared ancestor
 *    - `gen2`: other person’s distance from the shared ancestor
 *    - `ancestorId`: the shared ancestor
 *
 * 4. Convert generations into a relationship name
 *    `describeRelationshipFromGenerations()` uses `gen1`, `gen2`, gender, and the biological-path count to produce
 *    full and abbreviated relationships, such as `father`, `grandmother`, `brother`, `aunt`, and
 *    `2nd cousin once removed`. Biological paths receive compact `b` markers. When a person is both an adoptive
 *    parent and a biological relative, the direct parent relationship remains primary and the biological one is
 *    appended as an alternate.
 *
 * 5. Repeat for everyone in the family map
 *    `determineAllRelationships()` calculates a relationship for every person except the root.
 *
 * 6. Add database-specific common ancestors when applicable
 *    Only when the root is also the logged-in user, `findMostRecentCommonAncestors()` attaches all shared ancestors
 *    with the smallest maximum generation distance. `createDbEntries()` then moves those ancestors into records for
 *    storage, leaving them out of the relationship results returned to the caller.
 *
 **/
import { CC7Utils } from "./CC7Utils.js";

const NORMAL = "n";
const BIO = "b";
const NONE = -1;

let accumulatedFamilyMapEntries = [];

/**
 * Handles incoming family-map chunks and relationship-processing requests.
 **/
self.addEventListener("message", function (e) {
    if (!e.data || !e.data.cmd) {
        console.error("Received null or undefined data or missing cmd");
        self.postMessage({ type: "error", message: "Received null or undefined data or missing cmd" });
        return;
    }

    if (e.data.cmd === "chunk") {
        if (e.data.data && Array.isArray(e.data.data)) {
            accumulatedFamilyMapEntries.push(...e.data.data);
            // self.postMessage({ type: "receivedChunk" });
        } else {
            console.error("Chunk data is not an array or is missing");
            self.postMessage({ type: "error", message: "Chunk data is not an array or is missing" });
        }
    } else if (e.data.cmd === "process") {
        try {
            const familyMap = new Map(accumulatedFamilyMapEntries);
            accumulatedFamilyMapEntries = []; // Clear memory

            const results = processRelationships(
                familyMap,
                e.data.rootPersonId,
                e.data.loggedInUser,
                e.data.loggedInUserId
            );
            self.postMessage({
                type: "completed",
                rootId: e.data.rootPersonId,
                results: results.relationships,
                dbEntries: results.dbEntries,
            });
        } catch (error) {
            console.error("Error processing relationships:", error);
            self.postMessage({ type: "error", message: error.message });
        }
    } else {
        console.error("Unknown command:", e.data.cmd);
        self.postMessage({ type: "error", message: `Unknown command: ${e.data.cmd}` });
    }
});

/**
 * Calculate relationships and database entries for the supplied family map.
 **/
function processRelationships(familyMap, rootPersonId, loggedInUser, loggedInUserId) {
    const ancestorMaps = new Map();
    ancestorMaps.set("familyMap", familyMap);
    const relationships = determineAllRelationships(rootPersonId, ancestorMaps);

    let dbEntries = [];
    if (loggedInUserId == rootPersonId) {
        // DB entries are only required when the root person is also the logged in person
        const rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);

        relationships.forEach((relationship) => {
            if (relationship.personId) {
                const personAncestors = buildAncestorMap(relationship.personId, familyMap, ancestorMaps);
                const commonAncestors = findMostRecentCommonAncestors(rootAncestors, personAncestors, familyMap);

                if (commonAncestors.length > 0) {
                    relationship.commonAncestors = commonAncestors;
                }
            }
        });

        dbEntries = createDbEntries(relationships, loggedInUser, familyMap);
    }
    relationships.forEach((rel) => {
        delete rel.ancestorId;
        delete rel.gen1;
        delete rel.gen2;
    });
    return { relationships, dbEntries };
}

/**
 * Create database records for relationships (this is only valid when the logged-in user is the root person).
 * These DB entries are shared with the WikiTree Browser Extension (WBE)
 **/
function createDbEntries(relationships, loggedInUser, familyMap) {
    return relationships.map((relationship) => {
        const person = familyMap.get(relationship.personId);

        // No need for commonAncestors in the relationships collection. We only need it for the DB entries
        const commonAncestors = relationship.commonAncestors || [];
        delete relationship.commonAncestors;

        return {
            theKey: `${person.Name}:${loggedInUser}`,
            userId: loggedInUser,
            id: person.Name,
            distance: person?.Meta?.Degrees,
            relationship: relationship.relationship.full,
            commonAncestors: commonAncestors,
        };
    });
}

/**
 * Find the closest shared ancestors between two ancestor-generation maps.
 **/
function findMostRecentCommonAncestors(rootAncestors, personAncestors, familyMap) {
    let commonAncestors = [];
    let minGeneration = Infinity;

    rootAncestors.forEach((rootPath, ancestorId) => {
        if (personAncestors.has(ancestorId)) {
            const ancestor = familyMap.get(ancestorId);
            const ancestorGender = CC7Utils.genderOf(ancestor);
            const { generation: gen1, bioParentCount: rootBioParentCount } = rootPath;
            const { generation: gen2, bioParentCount: personBioParentCount } = personAncestors.get(ancestorId);
            let maxGen = Math.max(gen1, gen2);

            if (maxGen < minGeneration) {
                commonAncestors = [
                    {
                        ancestor_id: ancestorId,
                        ancestor: getAncestorDetails(ancestorId, familyMap),
                        relationshipToRoot: describeRelationshipFromGenerations(
                            gen1,
                            0,
                            ancestorGender,
                            rootBioParentCount
                        ),
                        relationshipToPerson: describeRelationshipFromGenerations(
                            gen2,
                            0,
                            ancestorGender,
                            personBioParentCount
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
                    relationshipToRoot: describeRelationshipFromGenerations(
                        gen1,
                        0,
                        ancestorGender,
                        rootBioParentCount
                    ),
                    relationshipToPerson: describeRelationshipFromGenerations(
                        gen2,
                        0,
                        ancestorGender,
                        personBioParentCount
                    ),
                    path1Length: gen1,
                    path2Length: gen2,
                });
            }
        }
    });

    return commonAncestors;
}

/**
 * Format a person's birth and death years with available date-status qualifiers.
 **/
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

/**
 * Build the display details for an ancestor from the family map.
 **/
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

/**
 * Build or retrieve a map of a person's ancestors and their path details.
 **/
function buildAncestorMap(personId, map, ancestorMaps, biologicalOnly = false) {
    const cacheKey = biologicalOnly ? `biological:${personId}` : personId;
    if (ancestorMaps.has(cacheKey)) {
        return ancestorMaps.get(cacheKey);
    }

    if (!map.has(personId)) {
        return new Map(); // Return an empty map if the person ID is not found
    }

    const ancestorMap = new Map();
    const queue = [{ personId, generation: 0, bioParentCount: 0 }];

    while (queue.length > 0) {
        const { personId, generation, bioParentCount } = queue.shift();
        const existingPath = ancestorMap.get(personId);
        if (
            existingPath &&
            (existingPath.generation < generation ||
                (existingPath.generation === generation && existingPath.bioParentCount <= bioParentCount))
        ) {
            continue;
        }
        ancestorMap.set(personId, { generation, bioParentCount });
        const person = map.get(personId);
        if (!person) continue;

        // A biological parent is labelled as such only when this child also has
        // adoptive parents.  That label is carried up the ancestry path.
        const bioParents = CC7Utils.bioParentIds(person);
        const hasBothKindsOfParents = bioParents.length > 0 && CC7Utils.adoptiveParentIds(person).length > 0;
        const parentEdges = new Map();
        if (!biologicalOnly) {
            for (const parentId of CC7Utils.adoptiveParentIds(person)) {
                parentEdges.set(parentId, false);
            }
        }
        for (const parentId of bioParents) {
            // If malformed data names the same profile in both roles, retain the
            // ordinary/adoptive interpretation rather than inventing a bio label.
            if (!parentEdges.has(parentId)) {
                parentEdges.set(parentId, hasBothKindsOfParents);
            }
        }

        parentEdges.forEach((isBioParent, parentId) => {
            if (parentId && map.has(parentId)) {
                queue.push({
                    personId: parentId,
                    generation: generation + 1,
                    bioParentCount: bioParentCount + (isBioParent ? 1 : 0),
                });
            }
        });
    }

    ancestorMaps.set(cacheKey, ancestorMap);
    return ancestorMap;
}

/**
 * Return the shared ancestor with the shortest combined path between two maps.
 * A lower maximum path length breaks ties, which favours the more direct
 * relationship (for example, parent over sibling).
 **/
function findClosestIntersection(map1, map2) {
    let closestIntersection = null;
    for (let [ancestorId, path1] of map1.entries()) {
        if (map2.has(ancestorId)) {
            const path2 = map2.get(ancestorId);
            const candidate = {
                ancestorId,
                gen1: path1.generation,
                gen2: path2.generation,
                bioParentCount: path1.bioParentCount,
            };
            const candidateDistance = candidate.gen1 + candidate.gen2;
            const closestDistance = closestIntersection && closestIntersection.gen1 + closestIntersection.gen2;
            const candidateMaxDistance = Math.max(candidate.gen1, candidate.gen2);
            const closestMaxDistance =
                closestIntersection && Math.max(closestIntersection.gen1, closestIntersection.gen2);

            if (
                !closestIntersection ||
                candidateDistance < closestDistance ||
                (candidateDistance === closestDistance && candidateMaxDistance < closestMaxDistance)
            ) {
                closestIntersection = candidate;
            }
        }
    }
    return closestIntersection;
}

/**
 * Determine relationships between the root person and every other person in the family map.
 **/
function determineAllRelationships(rootPersonId, ancestorMaps) {
    if (!ancestorMaps || !ancestorMaps.get("familyMap")) {
        return [];
    }

    const results = [];
    const familyMap = ancestorMaps.get("familyMap");

    familyMap.forEach((value, key) => {
        if (key !== rootPersonId) {
            const relationshipData = determineRelationship(rootPersonId, key, ancestorMaps);
            if (relationshipData) {
                results.push(relationshipData);
            }
        }
    });

    return results;
}

/**
 * Determine a person's relationship to the root person using their nearest shared ancestor.
 **/
function determineRelationship(rootPersonId, personId, ancestorMaps) {
    const familyMap = ancestorMaps.get("familyMap"); // Make sure this retrieval is valid
    const rootAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps);
    const personAncestors = buildAncestorMap(personId, familyMap, ancestorMaps);

    const intersection = findClosestIntersection(rootAncestors, personAncestors);
    if (!intersection) return { personId, relationship: "", ancestorId: null };
    const personData = familyMap.get(personId);

    const { ancestorId, gen1, gen2, bioParentCount } = intersection;
    const gender = CC7Utils.genderOf(personData);
    const relationship = describeRelationshipFromGenerations(gen1, gen2, gender, bioParentCount);

    // A person who is both an adoptive parent and a biological relative has two
    // valid relationships. Keep the direct parent role primary, and add the
    // biological relationship to its abbreviation (for example, Mother/bA).
    const rootPerson = familyMap.get(rootPersonId);
    const isAdoptiveParent = CC7Utils.adoptiveParentIds(rootPerson).some((parentId) => parentId == personId);
    if (isAdoptiveParent && gen1 === 1 && gen2 === 0) {
        const rootBiologicalAncestors = buildAncestorMap(rootPersonId, familyMap, ancestorMaps, true);
        const parentBiologicalAncestors = buildAncestorMap(personId, familyMap, ancestorMaps, true);
        const biologicalIntersection = findClosestIntersection(rootBiologicalAncestors, parentBiologicalAncestors);

        if (biologicalIntersection) {
            const biologicalRelationship = describeRelationshipFromGenerations(
                biologicalIntersection.gen1,
                biologicalIntersection.gen2,
                gender,
                biologicalIntersection.bioParentCount
            );
            relationship.alternateAbbr = biologicalRelationship.abbr;
            relationship.full = `${relationship.full} and ${biologicalRelationship.full}`;
            relationship.abbr = `${relationship.abbr}/${biologicalRelationship.abbr}`;
        }
    }

    if (relationship && ancestorId) {
        return {
            personId,
            relationship,
            ancestorId,
            gen1: gen1,
            gen2: gen2,
        };
    } else {
        return false;
    }
}

/**
 * Convert two ancestor-generation distances into a full and abbreviated relationship name.
 * NB: ChircleViews references the .full descriptions, so if they are changed, make sure it
 *     is updated as required.
 **/
function describeRelationshipFromGenerations(gen1, gen2, gender, bioParentCount = 0) {
    // Determine the relationship direction
    const isRootCloser = gen1 < gen2;

    // Direct ancestor-descendant relationships
    if (gen1 === 0 || gen2 === 0) {
        const generation = Math.max(gen1, gen2);
        if (generation === 0) {
            return { full: "self", abbr: "Self" };
        }
        if (generation === 1) {
            if (gen1 == 0) {
                return {
                    full: CC7Utils.mapGender(gender, "son", "daughter", "child"),
                    abbr: CC7Utils.mapGender(gender, "Son", "Daughter", "Child"),
                };
            }
            const isBioParent = bioParentCount > 0;
            return {
                full: CC7Utils.mapGender(
                    gender,
                    isBioParent ? "bio father" : "father",
                    isBioParent ? "bio mother" : "mother",
                    isBioParent ? "bio parent" : "parent"
                ),
                abbr: isBioParent
                    ? `${bioPrefix(bioParentCount)}${CC7Utils.mapGender(gender, "F", "M", "P")}`
                    : CC7Utils.mapGender(gender, "Father", "Mother", "Parent"),
            };
        }
        const genderedFullPart = CC7Utils.mapGender(
            gender,
            isRootCloser ? "son" : "father",
            isRootCloser ? "daughter" : "mother",
            isRootCloser ? "child" : "parent"
        );
        const genderedAbbrPart = genderedFullPart.charAt(0).toUpperCase();
        const bioMarker = bioPrefix(bioParentCount);
        const optionalBio = bioMarker ? "bio " : "";
        if (generation === 2) {
            return {
                full: `${optionalBio}grand${genderedFullPart}`,
                abbr: `${bioMarker}G${genderedAbbrPart}`,
            };
        } else if (generation === 3) {
            return {
                full: `${optionalBio}great grand${genderedFullPart}`,
                abbr: `${bioMarker}GG${genderedAbbrPart}`,
            };
        } else {
            const greats = generation - 3;
            return {
                full: `${optionalBio}${ordinal(greats + 1)} great grand${genderedFullPart}`,
                abbr: `${bioMarker}${ordinal(greats + 1)} GG${genderedAbbrPart}`,
            };
        }
    }

    // Cousins, siblings, nieces, and nephews
    if (gen1 === gen2 && gen1 === 1) {
        return {
            full: CC7Utils.mapGender(gender, "brother", "sister", "sibling"),
            abbr: CC7Utils.mapGender(gender, "Brother", "Sister", "Sibling"),
        };
    }

    // Extended family (aunts/uncles, nieces/nephews, and further)
    const olderGeneration = Math.min(gen1, gen2);
    const youngerGeneration = Math.max(gen1, gen2);
    const removal = youngerGeneration - olderGeneration;
    const isOne = gen1 === 1 || gen2 === 1;

    if (isOne) {
        if (removal === 1) {
            if (isRootCloser) {
                return {
                    full: CC7Utils.mapGender(gender, "nephew", "niece", "nibling (nephew/niece)"),
                    abbr: CC7Utils.mapGender(gender, "Nephew", "Niece", "Nibling"),
                };
            } else {
                const bioMarker = bioPrefix(bioParentCount);
                return {
                    full: CC7Utils.mapGender(
                        gender,
                        bioMarker ? "bio uncle" : "uncle",
                        bioMarker ? "bio aunt" : "aunt",
                        bioMarker ? "bio pibling (uncle/aunt)" : "pibling (uncle/aunt)"
                    ),
                    abbr: bioMarker
                        ? `${bioMarker}${CC7Utils.mapGender(gender, "U", "A", "P")}`
                        : CC7Utils.mapGender(gender, "Uncle", "Aunt", "Pibling"),
                };
            }
        } else if (removal === 2) {
            if (isRootCloser) {
                return {
                    full: CC7Utils.mapGender(gender, "grandnephew", "grandniece", "grandnibling (-nephew/niece)"),
                    abbr: CC7Utils.mapGender(gender, "GNe", "GNi", "GNb"),
                };
            } else {
                const bioMarker = bioPrefix(bioParentCount);
                return {
                    full: CC7Utils.mapGender(
                        gender,
                        bioMarker ? "bio granduncle" : "granduncle",
                        bioMarker ? "bio grandaunt" : "grandaunt",
                        bioMarker ? "bio grandpibling (-uncle/aunt)" : "grandpibling (-uncle/aunt)"
                    ),
                    abbr: `${bioMarker}${CC7Utils.mapGender(gender, "GU", "GA", "GPb")}`,
                };
            }
        } else {
            const greats = removal - 2;
            const relationship = isRootCloser
                ? CC7Utils.mapGender(gender, "nephew", "niece", "nibling (nephew/niece)")
                : CC7Utils.mapGender(gender, "uncle", "aunt", "pibling (uncle/aunt)");
            const abbr = isRootCloser
                ? CC7Utils.mapGender(gender, "Ne", "Ni", "Nb")
                : CC7Utils.mapGender(gender, "U", "A", "Pb");
            const relationshipPrefix = greats == 1 ? "great " : `${ordinal(greats)} great `;
            const abbrPrefix = greats == 1 ? "G" : `${ordinal(greats)} G`;
            const bioMarker = isRootCloser ? "" : bioPrefix(bioParentCount);
            return {
                full: `${bioMarker ? "bio " : ""}${relationshipPrefix}grand${relationship}`,
                abbr: `${bioMarker}${abbrPrefix}G${abbr}`,
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

/** Compact biological-path markers: b, bb, then 3b, 4b, and so on. */
function bioPrefix(bioParentCount) {
    if (!bioParentCount) return "";
    return bioParentCount <= 2 ? "b".repeat(bioParentCount) : `${bioParentCount}b`;
}

/**
 * Return the ordinal suffix for a generation or cousin level.
 **/
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

/**
 * Describe the number of generations of removal in natural language.
 **/
function onceTwice(removal) {
    return removal === 1 ? "once" : removal === 2 ? "twice" : `${removal} times`;
}
