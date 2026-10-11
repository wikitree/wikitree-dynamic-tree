/*
 * Options for the Genealogy Report view: defaults, validation and a request-cost estimate.
 */

import { DATE_FORMATS, DEFAULT_DATE_STYLE, STATUS_FORMATS } from "./report_dates.js";

// Shown in the report so a reader (and anyone helping them) can tell which build is running: browsers keep old copies
// of a view's files, and a half-updated page is easy to mistake for a bug.
export const REPORT_VERSION = "2026.10.11-7";

// Sent to the API as "TA-GenealogyReport" (WikiTreeAPI.postToAPI prepends "TA-").
export const APP_ID = "GenealogyReport";

// The API follows at most 25 generations of parents, but a report of N generations can hold 2^N - 1 profiles, each
// with a biography. Ten generations is what the Ahnentafel app's report also allows.
export const MAX_GENERATIONS = 10;
export const MIN_GENERATIONS = 1;
export const DEFAULT_GENERATIONS = 4;

// getPeople "nuclear" and "ancestors" accept at most 100 keys per call, and return at most this many related
// profiles per page.
export const MAX_KEYS_PER_CALL = 100;
export const PAGE_SIZE = 1000;

export const DEFAULT_OPTIONS = Object.freeze({
    generations: DEFAULT_GENERATIONS,
    includeFamily: true,
    includeBio: true,
    includeSources: true,
    includeBioImages: true,
    includePortraits: true,
    hideStickers: true,
    maskLiving: true,
    showWtIds: true,
    showRelationship: true,
    showPath: true,
    dateFormat: DEFAULT_DATE_STYLE.dateFormat,
    dateStatusFormat: DEFAULT_DATE_STYLE.statusFormat,
    parentMode: "main",
    sectionStats: true,
    sectionFan: true,
    sectionCalendar: true,
    sectionSurnames: true,
    fanAngle: 180,
    aiOverview: false,
    showStatus: true,
    showConfident: true,
});

function toBoolean(value, fallback) {
    if (value === undefined || value === null) return fallback;
    if (typeof value === "string") return !["", "0", "false", "off", "no"].includes(value.toLowerCase());
    return Boolean(value);
}

function oneOf(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

/**
 * Turn whatever the form (or the URL hash) gave us into a complete, valid options object.
 */
export function normalizeOptions(raw = {}) {
    const parsed = Number.parseInt(raw.generations, 10);
    const generations = Number.isFinite(parsed)
        ? Math.min(MAX_GENERATIONS, Math.max(MIN_GENERATIONS, parsed))
        : DEFAULT_OPTIONS.generations;
    const options = { generations };
    for (const [name, fallback] of Object.entries(DEFAULT_OPTIONS)) {
        if (typeof fallback === "boolean") options[name] = toBoolean(raw[name], fallback);
    }
    options.dateFormat = oneOf(raw.dateFormat, DATE_FORMATS, DEFAULT_OPTIONS.dateFormat);
    options.dateStatusFormat = oneOf(raw.dateStatusFormat, STATUS_FORMATS, DEFAULT_OPTIONS.dateStatusFormat);
    options.parentMode = oneOf(raw.parentMode, ["main", "bio"], DEFAULT_OPTIONS.parentMode);
    options.fanAngle = oneOf(Number(raw.fanAngle), [180, 240, 360], DEFAULT_OPTIONS.fanAngle);
    return options;
}

/**
 * The page title while printing. Browsers use it as the suggested file name when saving a PDF:
 * "Report Robinson-27265 20261011" (WikiTree ID, then the date as YYYYMMDD).
 */
export function printTitle(wtId, date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    // A file name: keep only what WikiTree IDs are made of.
    const id = String(wtId || "").replace(/[^A-Za-z0-9_-]/g, "");
    return ["Report", id, day].filter(Boolean).join(" ");
}

/**
 * The date style the formatters take, from normalized options.
 */
export function dateStyleOf(options) {
    return { dateFormat: options.dateFormat, statusFormat: options.dateStatusFormat };
}

/**
 * Upper bound on the people and API calls a report needs, for showing the user before they press Generate.
 */
export function estimateCost(options) {
    const { generations, includeFamily } = normalizeOptions(options);
    const ancestors = 2 ** generations - 1;
    // Rough guess at relatives per ancestor (siblings + children + partners) for the estimate only.
    const relatives = includeFamily ? ancestors * 6 : 0;
    const ancestorCalls = Math.ceil(ancestors / PAGE_SIZE);
    const relativeCalls = includeFamily
        ? Math.max(Math.ceil(ancestors / MAX_KEYS_PER_CALL), Math.ceil((ancestors + relatives) / PAGE_SIZE))
        : 0;
    return { ancestors, relatives, apiCalls: ancestorCalls + relativeCalls };
}
