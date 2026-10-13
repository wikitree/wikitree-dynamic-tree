/*
Created By: Azure Robinson (Robinson-27225)
*/

import { birthYear, fullName, lifeEvent, relationNote } from "./name_cloud_core.js";

/** People shown in the list at first, and added by each press of "Show more". */
export const PAGE_SIZE = 200;

export function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
    );
}

/** The link to a profile on WikiTree. */
export const profileHref = (person) => `https://www.wikitree.com/wiki/${encodeURIComponent(person.Name || person.Id)}`;

/** The people with a surname in the order the list shows them: oldest first, people with no birth year last, then by name. */
export function sortedEntries(word) {
    return [...word.entries].sort(
        (a, b) => birthYear(a.person) - birthYear(b.person) || fullName(a.person).localeCompare(fullName(b.person))
    );
}

/** "23 profiles", and how many of them are family by adoption when some are: "23 profiles (20 by birth, 3 by adoption)". */
export function countText(word) {
    const adopted = word.entries.filter((e) => relationNote(e)).length;
    const base = `${word.count.toLocaleString()} ${word.count === 1 ? "profile" : "profiles"}`;
    return adopted
        ? `${base} (${(word.count - adopted).toLocaleString()} by birth, ${adopted.toLocaleString()} by adoption)`
        : base;
}

const lifeLine = (label, date, place) => {
    const event = lifeEvent(date, place);
    return `<div class="ncloud-life">${label} ${
        event ? escapeHtml(event) : '<span class="ncloud-unknown">not recorded</span>'
    }</div>`;
};

/**
 * The list of everyone with a surname: full name and WikiTree ID as links, born and died with places. `shown` is how
 * many to list; the rest are behind "Show more".
 */
export function listHtml(word, shown = PAGE_SIZE) {
    const entries = sortedEntries(word);
    const rows = entries
        .slice(0, shown)
        .map((entry, index) => {
            const person = entry.person;
            const href = escapeHtml(profileHref(person));
            const note = relationNote(entry);
            return `<li class="ncloud-person">
        <a class="ncloud-name" href="${href}" data-index="${index}">${escapeHtml(fullName(person))}</a>
        <a class="ncloud-id" href="${href}" data-index="${index}">${escapeHtml(person.Name || person.Id)}</a>
        ${note ? `<span class="ncloud-tag">${note}</span>` : ""}
        ${lifeLine("Born:", person.BirthDate, person.BirthLocation)}
        ${lifeLine("Died:", person.DeathDate, person.DeathLocation)}
      </li>`;
        })
        .join("");
    const more = entries.length - shown;
    return {
        entries,
        html:
            `<ol class="ncloud-people">${rows}</ol>` +
            (more > 0
                ? `<button type="button" class="ncloud-more">Show ${Math.min(
                      PAGE_SIZE,
                      more
                  )} more (${more} not shown)</button>`
                : ""),
    };
}

/** The card for one person, like the fan chart's: who they are, born and died, and a link that opens the profile. */
export function cardHtml(entry) {
    const person = entry.person;
    const href = escapeHtml(profileHref(person));
    const how = entry.adopt ? (entry.bio ? "Family by birth and by adoption" : "Family by adoption") : "";
    return `<button type="button" class="ncloud-card-close" aria-label="Close card">&times;</button>
    ${how ? `<div class="ncloud-card-rel">${how}</div>` : ""}
    <b>${escapeHtml(fullName(person))}</b> <span class="ncloud-card-id">(${escapeHtml(person.Name || person.Id)})</span>
    ${lifeLine("Born:", person.BirthDate, person.BirthLocation)}
    ${lifeLine("Died:", person.DeathDate, person.DeathLocation)}
    <div class="ncloud-card-hint"><a href="${href}" target="_blank" rel="noopener noreferrer">Open the profile</a></div>`;
}
