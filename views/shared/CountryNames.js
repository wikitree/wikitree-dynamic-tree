/*
 * CountryNames: map the many ways a country is written in WikiTree locations onto one name, so that, for
 * example, "Danmark" and "Denmark", or "Preußen" and "Preussen", are counted as the same country.
 *
 * It uses the country list in views/oneNameTrees/location_data.js (English name, native name and aliases)
 * plus the extra names below, mostly historical states that list doesn't have.
 *
 * Names are compared loosely: case, accents and punctuation are ignored and "ß" counts as "ss".
 * It only merges different spellings and languages of the same place; it does not merge historical states
 * into modern ones (Prussia stays Prussia rather than becoming Germany).
 */
import { countries } from "../oneNameTrees/location_data.js";

// Display name => other ways of writing it (not already covered by location_data.js)
const EXTRA_NAMES = {
    "Prussia": ["Preußen", "Königreich Preußen", "Kingdom of Prussia", "Prusy"],
    "Holy Roman Empire": [
        "Heiliges Römisches Reich",
        "Heiliges Römisches Reich Deutscher Nation",
        "HRE",
        "Sacrum Imperium Romanum",
        "Saint-Empire romain germanique",
    ],
    "German Empire": ["Deutsches Reich", "Deutsches Kaiserreich"],
    "Austria-Hungary": ["Österreich-Ungarn", "Austro-Hungarian Empire", "Osztrák-Magyar Monarchia"],
    "Bavaria": ["Bayern", "Königreich Bayern", "Kingdom of Bavaria"],
    "Bohemia": ["Böhmen", "Čechy", "Kingdom of Bohemia"],
    "Czech Republic": ["Czechia", "Česko"],
    "Switzerland": ["Suisse", "Svizzera", "Svizra", "Confoederatio Helvetica", "Helvetia"],
    "Belgium": ["Belgique", "Belgien"],
    "Wales": ["Cymru"],
    "Scotland": ["Alba"],
    "Netherlands": ["The Netherlands"],
};

// Words in front of a name that don't change which country it is, e.g. "Kingdom of Denmark".
// They are only dropped when what is left is a known country.
const PREFIXES = ["the", "kingdom of", "königreich", "republic of", "republik", "empire of", "commonwealth of"];

/**
 * Reduce a name to a loose comparison key: lower case, no accents, "ß" as "ss", punctuation as spaces.
 */
export function countryKey(name) {
    return String(name)
        .normalize("NFD")
        .replace(/\p{M}/gu, "") // accents
        .toLowerCase()
        .replace(/ß/g, "ss")
        .replace(/æ/g, "ae")
        .replace(/œ/g, "oe")
        .replace(/ø/g, "o")
        .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation, hyphens, dots
        .trim();
}

const PREFIX_KEYS = PREFIXES.map((p) => countryKey(p) + " ");

let lookup; // key => display name, built on first use
function getLookup() {
    if (lookup) return lookup;
    lookup = new Map();
    const add = (alias, displayName) => {
        // Also accept umlauts written out, as in "Oesterreich" for "Österreich"
        const spelledOut = alias.replace(/[äöüÄÖÜ]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue" })[c]);
        for (const key of new Set([countryKey(alias), countryKey(spelledOut)])) {
            if (key && !lookup.has(key)) lookup.set(key, displayName);
        }
    };
    for (const country of countries) {
        add(country.name, country.name);
        if (country.nativeName) add(country.nativeName, country.name);
        for (const alias of country.aliases || []) add(alias, country.name);
    }
    for (const [displayName, aliases] of Object.entries(EXTRA_NAMES)) {
        add(displayName, displayName);
        aliases.forEach((alias) => add(alias, displayName));
    }
    return lookup;
}

/**
 * Return the standard name for a country as written in a location, or the trimmed input if it isn't recognised.
 */
export function standardCountryName(name) {
    if (!name) return name;
    const trimmed = String(name).trim();
    const map = getLookup();
    const key = countryKey(trimmed);
    if (map.has(key)) return map.get(key);
    for (const prefix of PREFIX_KEYS) {
        if (key.startsWith(prefix) && map.has(key.slice(prefix.length))) {
            return map.get(key.slice(prefix.length));
        }
    }
    return trimmed;
}

/**
 * Like standardCountryName, but also merges unrecognised names that differ only in case, accents, "ß"/"ss"
 * or punctuation. Use one instance per chart/table: the first spelling seen is the one shown.
 */
export class CountryNameMerger {
    #seen = new Map(); // key => first spelling seen

    name(country) {
        if (!country) return country;
        const standard = standardCountryName(country);
        const key = countryKey(standard);
        if (!this.#seen.has(key)) this.#seen.set(key, standard);
        return this.#seen.get(key);
    }
}
