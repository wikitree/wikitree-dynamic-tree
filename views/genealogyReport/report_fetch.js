/*
 * Gathers the profiles a Genealogy Report needs from the WikiTree API.
 *
 *   1. getPeople with `ancestors` for the direct line (with biographies if wanted). Paged, because a report of
 *      10 generations can hold more profiles than one response returns.
 *   2. Any ancestor on the chosen line that the first call did not return, such as the biological parents of
 *      someone whose profile lists adoptive parents (the `ancestors` call only follows the listed parents). These
 *      are requested with as many generations as the report still needs below them.
 *   3. If the Family block is on: getPeople with `nuclear: 1` for the ancestors, which returns their parents,
 *      siblings, spouses and children. The API takes at most 100 keys per call, so the ancestors are sent in
 *      batches of 100, and each batch is paged too.
 *
 * Steps 2 and 3 are in completeReportData(), which can be called again after the reader switches a person to their
 * biological (or listed) parents: it fetches only what the new choice needs.
 *
 * `api` is WikiTreeAPI (or a stand-in in tests).
 */

import { APP_ID, MAX_KEYS_PER_CALL, PAGE_SIZE } from "./report_options.js";
import { buildSlots, generationOf, makeParentChooser } from "./report_model.js";

const PERSON_FIELDS = [
    "Id",
    "Name",
    "Prefix",
    "FirstName",
    "MiddleName",
    "RealName",
    "LastNameAtBirth",
    "LastNameCurrent",
    "Suffix",
    "Gender",
    "BirthDate",
    "DeathDate",
    "BirthLocation",
    "DeathLocation",
    "DataStatus",
    "Father",
    "Mother",
    "BioFather",
    "BioMother",
    "Privacy",
    "IsLiving",
    "Spouses",
    "Photo",
    "PhotoData",
];

const MAX_PAGES = 20;
const RETRIES = 3;

export class ReportFetchError extends Error {
    constructor(message) {
        super(message);
        this.name = "ReportFetchError";
    }
}

const defaultWait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(call, wait) {
    let lastError;
    for (let attempt = 0; attempt < RETRIES; attempt++) {
        try {
            return await call();
        } catch (error) {
            lastError = error;
            await wait(500 * 2 ** attempt);
        }
    }
    throw new ReportFetchError(`The WikiTree API could not be reached (${lastError?.message || "unknown error"}).`);
}

function checkStatus(status) {
    if (status) throw new ReportFetchError(`The WikiTree API returned an error: ${status}`);
}

// Records already held win over the same profile in a later response: the ancestor calls carry the biography, the
// relatives calls do not.
function mergePeople(into, incoming) {
    for (const [id, person] of Object.entries(incoming || {})) {
        into[id] = into[id] ? { ...person, ...into[id] } : person;
    }
}

/**
 * One getPeople request, followed through its pages. The requested keys come back on every page and only the
 * related profiles are paged, so a page with fewer than PAGE_SIZE related profiles is the last.
 */
async function fetchPages({ api, keys, fields, params, wait, isCancelled, onProgress, describe }) {
    const people = {};
    let resultByKey = null;
    const keySet = new Set(keys.map(String));
    for (let page = 0; page < MAX_PAGES; page++) {
        if (isCancelled()) return { people, resultByKey, cancelled: true };
        onProgress(describe(page));
        const [status, byKey, pagePeople] = await withRetry(
            () => api.getPeople(APP_ID, keys, fields, { ...params, limit: PAGE_SIZE, start: page * PAGE_SIZE }),
            wait
        );
        checkStatus(status);
        resultByKey ??= byKey;
        Object.assign(people, pagePeople || {});
        const related = Object.keys(pagePeople || {}).filter((id) => !keySet.has(id)).length;
        if (related < PAGE_SIZE) break;
    }
    return { people, resultByKey, cancelled: false };
}

const chunk = (list, size) => {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
};

const fieldsFor = (options) => (options.includeBio ? [...PERSON_FIELDS, "Bio"] : PERSON_FIELDS);

function bioParams(options) {
    return options.includeBio ? { bioFormat: "both" } : {};
}

/**
 * Fetch whatever the current parent choices need and are not yet held: ancestors on the chosen line, then (with the
 * Family block) the relatives of everyone on it. Mutates and returns `state`.
 *
 * @param {object} params
 * @param {object} params.state  { rootId, people, attempted: Set, relativesLoaded: Set }
 * @param {Map<string, string>} [params.parentModes]  per-profile "main" | "bio" choices
 */
export async function completeReportData({
    api,
    state,
    options,
    parentModes,
    onProgress = () => {},
    isCancelled = () => false,
    wait = defaultWait,
}) {
    const { rootId, people } = state;
    const chooseParents = makeParentChooser(options.parentMode, parentModes);
    const generations = options.generations;

    // Ancestors on the chosen line that have not been fetched, grouped by how many more generations are needed.
    for (let round = 0; round <= generations; round++) {
        const slots = buildSlots(rootId, people, generations, chooseParents);
        const byDepth = new Map();
        for (const [n, id] of slots) {
            if (people[id] || state.attempted.has(id)) continue;
            const remaining = Math.max(0, generations - generationOf(n));
            if (!byDepth.has(remaining)) byDepth.set(remaining, new Set());
            byDepth.get(remaining).add(id);
        }
        if (!byDepth.size) break;

        for (const [remaining, ids] of byDepth) {
            for (const batch of chunk([...ids], MAX_KEYS_PER_CALL)) {
                batch.forEach((id) => state.attempted.add(id));
                const result = await fetchPages({
                    api,
                    keys: batch,
                    fields: fieldsFor(options),
                    params: {
                        resolveRedirect: 1,
                        ...(remaining ? { ancestors: remaining } : {}),
                        ...bioParams(options),
                    },
                    wait,
                    isCancelled,
                    onProgress,
                    describe: (page) => `Fetching more ancestors…${page ? ` (page ${page + 1})` : ""}`,
                });
                mergePeople(people, result.people);
                if (result.cancelled) return { ...state, cancelled: true };
            }
        }
    }

    if (!options.includeFamily) return state;

    // Relatives of everyone on the chosen line who has not had them fetched yet.
    const lineIds = [...new Set([...buildSlots(rootId, people, generations, chooseParents).values()])].filter(
        (id) => people[id] && !state.relativesLoaded.has(id)
    );
    const batches = chunk(lineIds, MAX_KEYS_PER_CALL);
    for (const [index, batch] of batches.entries()) {
        const result = await fetchPages({
            api,
            keys: batch,
            fields: PERSON_FIELDS,
            params: { resolveRedirect: 1, nuclear: 1 },
            wait,
            isCancelled,
            onProgress,
            describe: (page) =>
                `Fetching relatives…${batches.length > 1 ? ` (batch ${index + 1} of ${batches.length})` : ""}${
                    page ? ` (page ${page + 1})` : ""
                }`,
        });
        mergePeople(people, result.people);
        if (result.cancelled) return { ...state, cancelled: true };
        batch.forEach((id) => state.relativesLoaded.add(id));
    }
    return state;
}

/**
 * @param {object} params
 * @param {object} params.api  WikiTreeAPI
 * @param {string} params.rootKey  WikiTree ID of the starting profile, e.g. "Windsor-1"
 * @param {object} params.options  normalized options
 * @param {Map<string, string>} [params.parentModes]  per-profile "main" | "bio" choices
 * @param {(message: string) => void} [params.onProgress]
 * @param {() => boolean} [params.isCancelled]
 * @param {(ms: number) => Promise<void>} [params.wait]
 * @returns {Promise<{ rootId: string, people: object, attempted: Set, relativesLoaded: Set, cancelled?: boolean }>}
 */
export async function fetchReportData({
    api,
    rootKey,
    options,
    parentModes,
    onProgress = () => {},
    isCancelled = () => false,
    wait = defaultWait,
}) {
    const ancestorResult = await fetchPages({
        api,
        keys: [rootKey],
        fields: fieldsFor(options),
        params: { resolveRedirect: 1, ancestors: options.generations - 1, ...bioParams(options) },
        wait,
        isCancelled,
        onProgress,
        describe: (page) => `Fetching ancestors…${page ? ` (page ${page + 1})` : ""}`,
    });
    if (ancestorResult.cancelled) {
        return { rootId: "", people: {}, attempted: new Set(), relativesLoaded: new Set(), cancelled: true };
    }
    const rootId = String(Object.values(ancestorResult.resultByKey || {})[0]?.Id || "");
    if (!rootId || !ancestorResult.people[rootId]) {
        throw new ReportFetchError(`No profile was found for ${rootKey}, or it is private.`);
    }

    // Everything the first call returned has been fetched; ids it did not return are tried once, later.
    const state = {
        rootId,
        people: ancestorResult.people,
        attempted: new Set(Object.keys(ancestorResult.people)),
        relativesLoaded: new Set(),
    };
    if (isCancelled()) return { ...state, cancelled: true };
    return completeReportData({ api, state, options, parentModes, onProgress, isCancelled, wait });
}
