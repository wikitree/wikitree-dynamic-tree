/*
 * Small HTML helpers shared by the Genealogy Report renderers. Everything that comes from the API goes through esc().
 */

export const WIKITREE_URL = "https://www.wikitree.com";

export function esc(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
    );
}

export const entryId = (n) => `gr-a${n}`;

export const wikiTreeLink = (wtId, text) =>
    `<a href="${WIKITREE_URL}/wiki/${encodeURIComponent(wtId)}">${esc(text)}</a>`;

export const slotLink = (n) => `<a class="gr-slot" href="#${entryId(n)}">#${n}</a>`;

/**
 * Link to one of the Tree Apps for a profile, the same address the app's own menu uses: the app, the profile, and
 * any settings the app reads from the address (e.g. maxgen for the Statistics app).
 */
export function treeAppUrl(wtId, view, params = {}) {
    const hash = new URLSearchParams({ name: wtId, view, ...params });
    return `${WIKITREE_URL}/apps/${encodeURIComponent(wtId)}#${hash.toString()}`;
}
