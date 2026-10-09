/*
 * Date and place helpers for the Genealogy Report.
 *
 * WikiTree API dates are "YYYY-MM-DD" strings where an unknown month or day is "00" and a wholly unknown
 * date is "0000-00-00". DataStatus values qualify a date: "guess", "before" and "after".
 *
 * The format and status-style ids match views/shared/DateFormatOptions.js, so a choice made in another Tree App
 * (stored in the browser) can be used here unchanged.
 */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export const DATE_FORMATS = ["iso", "mdy", "smdy", "dmy", "dsmy", "y"];
export const STATUS_FORMATS = ["abbreviations", "words", "symbols"];
export const DEFAULT_DATE_STYLE = Object.freeze({ dateFormat: "dsmy", statusFormat: "abbreviations" });

const STATUS_WORDS = { before: "before", after: "after", guess: "about" };
const STATUS_ABBREVIATIONS = { before: "bef.", after: "aft.", guess: "abt." };
const STATUS_SYMBOLS = { before: "<", after: ">", guess: "~" };

export function parseWtDate(value) {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const year = Number(match[1]);
    if (!year) return null;
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month > 12 || day > 31) return null;
    return { year, month, day };
}

function pad2(n) {
    return String(n).padStart(2, "0");
}

function layout({ year, month, day }, dateFormat) {
    switch (dateFormat) {
        case "iso":
            return [year, month && pad2(month), month && day && pad2(day)].filter(Boolean).join("-");
        case "mdy": {
            const monthDay = [month ? MONTHS_LONG[month - 1] : "", day || ""].filter(Boolean).join(" ");
            return monthDay && day ? `${monthDay}, ${year}` : [monthDay, year].filter(Boolean).join(" ");
        }
        case "smdy": {
            const monthDay = [month ? MONTHS_SHORT[month - 1] : "", day || ""].filter(Boolean).join(" ");
            return monthDay && day ? `${monthDay}, ${year}` : [monthDay, year].filter(Boolean).join(" ");
        }
        case "dmy":
            return [month && day ? day : "", month ? MONTHS_LONG[month - 1] : "", year].filter(Boolean).join(" ");
        case "y":
            return String(year);
        case "dsmy":
        default:
            return [month && day ? day : "", month ? MONTHS_SHORT[month - 1] : "", year].filter(Boolean).join(" ");
    }
}

/**
 * "24 Nov 1859" (default), with "abt.", "bef." or "aft." for qualified dates. "" when unknown.
 * `style` is { dateFormat, statusFormat }; unknown ids fall back to the defaults.
 */
export function formatDate(value, status, style = DEFAULT_DATE_STYLE) {
    const date = parseWtDate(value);
    if (!date) return "";
    const dateFormat = DATE_FORMATS.includes(style?.dateFormat) ? style.dateFormat : DEFAULT_DATE_STYLE.dateFormat;
    const statusFormat = STATUS_FORMATS.includes(style?.statusFormat)
        ? style.statusFormat
        : DEFAULT_DATE_STYLE.statusFormat;
    const text = layout(date, dateFormat);
    const table =
        statusFormat === "words" ? STATUS_WORDS : statusFormat === "symbols" ? STATUS_SYMBOLS : STATUS_ABBREVIATIONS;
    const prefix = table[status] || "";
    if (!prefix) return text;
    return statusFormat === "symbols" ? `${prefix}${text}` : `${prefix} ${text}`;
}

/**
 * Whole years from one date to another. When either date lacks a month or day only the years can be compared, so the
 * difference of the years is used. null if a year is missing, the order is wrong, or the result is not plausible
 * (over 130), so a typo in one profile cannot distort an average.
 */
export function ageBetween(fromDate, toDate) {
    const from = parseWtDate(fromDate);
    const to = parseWtDate(toDate);
    if (!from || !to) return null;
    let age = to.year - from.year;
    const bothFull = from.month && from.day && to.month && to.day;
    if (bothFull && (to.month < from.month || (to.month === from.month && to.day < from.day))) age -= 1;
    return age >= 0 && age <= 130 ? age : null;
}

export function yearOf(value) {
    return parseWtDate(value)?.year ?? null;
}

/**
 * Sort key that keeps unknown dates last and treats a missing month/day as the start of the period.
 */
export function dateSortKey(value) {
    const date = parseWtDate(value);
    if (!date) return Number.MAX_SAFE_INTEGER;
    return date.year * 10000 + date.month * 100 + date.day;
}

/**
 * "(1856–1904)", "(b. 1856)", "(d. 1904)" or "" depending on which years are known.
 */
export function formatLifespan(birthDate, deathDate) {
    const birth = yearOf(birthDate);
    const death = yearOf(deathDate);
    if (birth && death) return `(${birth}–${death})`;
    if (birth) return `(b. ${birth})`;
    if (death) return `(d. ${death})`;
    return "";
}

/**
 * The country is conventionally the last comma-separated part of a WikiTree location.
 */
export function countryOf(location) {
    if (typeof location !== "string") return "";
    const parts = location
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
}
