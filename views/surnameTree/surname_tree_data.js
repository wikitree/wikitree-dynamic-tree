/*
Created By: Azure Robinson (Robinson-27225)
*/

import { entriesFromReach, idOf, markReach, nextFrontier, parentEdges, reachNearby } from "./surname_tree_core.js";

// WikiTreeAPI is the global from WikiTreeAPI.js; its calls are tagged TA-surnameTree in the API log
const APP_ID = "surnameTree";

/** What the lists and cards show about each person. */
const PERSON_FIELDS = [
    "Id",
    "Name",
    "LongName",
    "FirstName",
    "MiddleName",
    "RealName",
    "LastNameAtBirth",
    "LastNameCurrent",
    "BirthDate",
    "DeathDate",
    "BirthLocation",
    "DeathLocation",
];
/** What is needed to tell birth parents from adoptive ones. */
const PARENT_FIELDS = ["Father", "Mother", "BioFather", "BioMother", "DataStatus"];

/** At most this many ids go in one getPeople request. */
const KEYS_PER_REQUEST = 200;
/** CC7 is fetched a page of 1,000 at a time; this many pages (60,000 people) is the most that is read. */
export const MAX_CC_PAGES = 60;

/** Profiles by id or WikiTree ID, as an array. getPeople answers with an object keyed by id. */
async function peopleByKeys(keys, fields) {
    const found = [];
    for (let i = 0; i < keys.length; i += KEYS_PER_REQUEST) {
        const [, , people] = await WikiTreeAPI.getPeople(APP_ID, keys.slice(i, i + KEYS_PER_REQUEST), fields);
        found.push(...Object.values(people || {}));
    }
    return found;
}

/**
 * The profile's ancestors, a generation at a time. Both kinds of parent are followed: the parents shown on the profile
 * (adoptive ones when marked so) and the birth parents named beside them. Every person comes back marked with how they are
 * connected (see reachFrom), so the page can show biological, adoptive or both without asking again.
 * Returns { entries: [{ person, bio, adopt }], rootId }.
 */
export async function fetchAncestors(key, generations, onProgress = () => {}) {
    const fields = [...PERSON_FIELDS, ...PARENT_FIELDS];
    const [root] = await peopleByKeys([key], fields);
    if (!root) return { entries: [] };
    const rootId = idOf(root);
    const byId = new Map([[rootId, root]]);
    const reach = new Map();
    const seen = new Set([`${rootId}|false`]);
    let frontier = [{ id: rootId, adoptive: false }];
    for (let generation = 0; frontier.length; generation++) {
        markReach(reach, frontier);
        onProgress(byId.size);
        if (generation >= generations) break;
        // fetch this generation's parents together, then step out to them
        const wanted = new Set();
        frontier.forEach(({ id }) => parentEdges(byId.get(id)).forEach((e) => !byId.has(e.id) && wanted.add(e.id)));
        if (wanted.size) {
            const people = await peopleByKeys([...wanted], fields);
            people.forEach((person) => idOf(person) && byId.set(idOf(person), person));
        }
        frontier = nextFrontier(frontier, seen, (id) => parentEdges(byId.get(id)), rootId);
    }
    return { entries: entriesFromReach(reach, byId), rootId };
}

/**
 * Everyone within `degrees` of the profile (its CC7 when degrees is 7), read a page at a time, with what is needed to tell
 * birth links from adoptive ones. `onProgress(count)` is told how many people have been read so far, because a big CC7 takes
 * a while. Returns { entries: [{ person, bio, adopt }], truncated, rootId }.
 */
export async function fetchNearby(key, degrees, onProgress = () => {}) {
    const fields = [...PERSON_FIELDS, ...PARENT_FIELDS, "Spouses"];
    const byId = new Map();
    let truncated = false;
    for (let page = 0, more = true; more; page++) {
        if (page >= MAX_CC_PAGES) {
            truncated = true;
            break;
        }
        const [status, , found] = await WikiTreeAPI.getPeople(APP_ID, key, fields, {
            nuclear: degrees,
            start: page * 1000,
            limit: 1000,
        });
        const batch = Object.values(found || {});
        batch.forEach((person) => idOf(person) && byId.set(idOf(person), person));
        onProgress(byId.size);
        more = batch.length > 0 && typeof status === "string" && status.startsWith("Maximum number of profiles");
    }
    const people = [...byId.values()];
    let root = people.find((p) => p.Name === key || String(p.Id) === String(key));
    if (!root) {
        // the root is not in every answer
        [root] = await peopleByKeys([key], fields);
        if (root && idOf(root)) {
            byId.set(idOf(root), root);
            people.push(root);
        }
    }
    if (!root) return { entries: [], truncated };
    const reach = reachNearby(people, idOf(root), degrees);
    return { entries: entriesFromReach(reach, byId), truncated, rootId: idOf(root) };
}

/** Fetch the people for a scope ("ancestors" or "cc7") and an amount (generations or degrees). */
export function fetchScope(scope, key, amount, onProgress) {
    return scope === "cc7" ? fetchNearby(key, amount, onProgress) : fetchAncestors(key, amount, onProgress);
}
