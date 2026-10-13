/*
 * Optional sections of the Genealogy Report that mirror four Tree Apps: Statistics, Family Calendar and Surnames List
 * (the Fan Chart is in report_fan.js).
 *
 * The apps themselves cannot be placed in a report: the Surnames List and Family Calendar have their generation
 * counts fixed in their code (6 and 10), the Fan Chart keeps its settings in static state, and each would download
 * the same ancestors again. So each section is worked out from the ancestors the report already holds, with the same
 * measures as the app, for exactly the generations chosen. Each also links to the real app for the same profile.
 *
 * Pure functions (no DOM, no network) so they can be tested in Node.
 */

import { ageBetween, parseWtDate, yearOf } from "./report_dates.js";
import { entryId, esc, slotLink, treeAppUrl, wikiTreeLink } from "./report_html.js";

const MONTH_NAMES = [
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

/**
 * The ancestors the report can show, one per Ahnentafel number. A repeated ancestor (pedigree collapse) is resolved to
 * the first entry, so it counts at each of its generations as in the apps.
 */
export function visibleAncestors(model) {
    const byNumber = new Map(model.entries.map((entry) => [entry.n, entry]));
    const out = [];
    for (const entry of model.entries) {
        const resolved = entry.kind === "duplicate" ? byNumber.get(entry.firstSlot) : entry;
        if (resolved?.kind !== "person") continue;
        out.push({ n: entry.n, gen: entry.gen, entry: resolved, isRepeat: entry.kind === "duplicate" });
    }
    return out;
}

// ---- Statistics ----------------------------------------------------------------------------------------------------

/**
 * "Self", "Parents", "Grandparents", "Great-Grandparents", "2x Great-Grandparents", ... as the Statistics app names them.
 */
export function generationName(gen) {
    if (gen === 1) return "Self";
    if (gen === 2) return "Parents";
    if (gen === 3) return "Grandparents";
    if (gen === 4) return "Great-Grandparents";
    return `${gen - 3}x Great-Grandparents`;
}

const mean = (list) => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null);
const rounded = (list) => (list.length ? Math.round(mean(list)) : null);
const oneDecimal = (list) => (list.length ? Math.round(mean(list) * 10) / 10 : null);

function earliestMarriage(person) {
    const dates = person.spouses
        .map((spouse) => spouse.marriageDate)
        .filter((date) => parseWtDate(date))
        .sort();
    return dates[0] || "";
}

/**
 * The Statistics app's table for ancestors: per generation, how many profiles, birth years, marriage age, generation
 * length, lifespan, children and siblings. Averages are over the profiles that have the data. Children and siblings
 * come from the Family block, so they are null when it is switched off.
 */
export function computeStatistics(model) {
    const ancestors = visibleAncestors(model);
    const rows = [];
    const oldest = { any: null, Male: null, Female: null };

    for (let gen = 1; gen <= model.generations; gen++) {
        const inGeneration = ancestors.filter((a) => a.gen === gen);
        const unique = new Map();
        for (const a of inGeneration) if (!unique.has(a.entry.id)) unique.set(a.entry.id, a);

        const birthYears = [];
        const marriageAges = [];
        const lifespans = [];
        const childCounts = [];
        const siblingCounts = [];
        for (const { n, entry } of unique.values()) {
            const { person, family } = entry;
            const birthYear = yearOf(person.birthDate);
            if (birthYear) birthYears.push(birthYear);
            const marriageAge = ageBetween(person.birthDate, earliestMarriage(person));
            if (marriageAge !== null) marriageAges.push(marriageAge);
            const lifespan = ageBetween(person.birthDate, person.deathDate);
            if (lifespan !== null) {
                lifespans.push(lifespan);
                const candidate = { age: lifespan, person, n };
                if (!oldest.any || lifespan > oldest.any.age) oldest.any = candidate;
                if (
                    oldest[person.gender] !== undefined &&
                    (!oldest[person.gender] || lifespan > oldest[person.gender].age)
                ) {
                    oldest[person.gender] = candidate;
                }
            }
            if (family) {
                childCounts.push(family.children.length);
                siblingCounts.push(family.siblings.length);
            }
        }

        rows.push({
            gen,
            name: generationName(gen),
            possible: 2 ** (gen - 1),
            slots: inGeneration.length,
            unique: unique.size,
            withBirthYear: birthYears.length,
            earliestBirthYear: birthYears.length ? Math.min(...birthYears) : null,
            latestBirthYear: birthYears.length ? Math.max(...birthYears) : null,
            avgBirthYear: rounded(birthYears),
            avgMarriageAge: rounded(marriageAges),
            genLength: null,
            avgLifespan: rounded(lifespans),
            avgChildren: oneDecimal(childCounts),
            avgSiblings: oneDecimal(siblingCounts),
        });
    }

    // Generation length: how much earlier the parents' generation was born than this one, on average.
    // It needs an average birth year for both generations: a missing one is not the year 0 (null - 1933 would be
    // -1933 in JavaScript), so a generation with no birth years gives no length.
    for (let i = 1; i < rows.length; i++) {
        const later = rows[i - 1].avgBirthYear;
        const earlier = rows[i].avgBirthYear;
        rows[i].genLength = later !== null && earlier !== null && later !== earlier ? later - earlier : null;
    }
    // Trailing generations with nobody in them are left out.
    while (rows.length > 1 && rows[rows.length - 1].slots === 0) rows.pop();

    const lengths = rows.map((row) => row.genLength).filter((value) => value !== null);
    const lifespanAverages = rows.map((row) => row.avgLifespan).filter((value) => value !== null);
    return {
        rows,
        overall: {
            avgGenerationLength: rounded(lengths),
            avgLifespan: rounded(lifespanAverages),
            oldest: oldest.any,
            oldestMale: oldest.Male,
            oldestFemale: oldest.Female,
        },
    };
}

const dash = (value) => (value === null || value === undefined || Number.isNaN(value) ? "-" : String(value));

function oldestHtml(label, found) {
    if (!found) return `<li>${label}: -</li>`;
    return `<li>${label}: ${wikiTreeLink(found.person.wtId, found.person.name)} ${slotLink(found.n)}, ${found.age} years.</li>`;
}

export function statisticsHtml(model, ctx) {
    const { rows, overall } = computeStatistics(model);
    const body = rows
        .map(
            (row) => `<tr>
<td>${row.gen}</td><td>${esc(row.name)}</td>
<td>${row.unique}${row.slots > row.unique ? ` <small>(${row.slots} with repeats)</small>` : ""} of ${row.possible}</td>
<td>${row.withBirthYear}</td><td>${dash(row.earliestBirthYear)}</td><td>${dash(row.latestBirthYear)}</td>
<td>${dash(row.avgBirthYear)}</td><td>${dash(row.avgMarriageAge)}</td><td>${dash(row.genLength)}</td>
<td>${dash(row.avgLifespan)}</td><td>${dash(row.avgChildren)}</td><td>${dash(row.avgSiblings)}</td></tr>`
        )
        .join("\n");
    const appLink = ctx.rootWtId
        ? ` <a href="${esc(treeAppUrl(ctx.rootWtId, "stats", { maxgen: Math.min(10, Math.max(2, model.generations)), mode: "ancestors", sibs: 0 }))}">Open the Statistics app</a>.`
        : "";
    const familyNote = model.options.includeFamily
        ? ""
        : " Average children and siblings need the Family block, which is switched off.";
    return `<section class="gr-section gr-wide gr-stats" id="gr-stats"><h2>Statistics</h2>
<p class="gr-section-note">Generational statistics for the ${model.generations} generation${model.generations === 1 ? "" : "s"} in this report, with the same measures as the Statistics Tree App. Averages use the profiles that have the data; "-" means none do.${familyNote}${appLink}</p>
<div class="gr-table-scroll"><table class="gr-table gr-stats-table"><thead><tr>
<th>Gen</th><th>Relation</th><th>Total profiles</th><th>With birth year</th><th>Earliest birth year</th><th>Latest birth year</th>
<th>Average birth year</th><th>Average marriage age</th><th>Generation length</th><th>Average lifespan</th><th>Average children</th><th>Average siblings</th>
</tr></thead><tbody>
${body}
</tbody></table></div>
<ul class="gr-stats-overall">
<li>Average generation length: ${dash(overall.avgGenerationLength)}</li>
<li>Average lifespan: ${dash(overall.avgLifespan)}</li>
${oldestHtml("Oldest ancestor", overall.oldest)}
${oldestHtml("Oldest male ancestor", overall.oldestMale)}
${oldestHtml("Oldest female ancestor", overall.oldestFemale)}
</ul></section>`;
}

// ---- Surnames List -------------------------------------------------------------------------------------------------

// A name is worth listing only if it really is a surname: not blank, and not a placeholder.
const PLACEHOLDER_SURNAME = /^(unknown|private|unk|\[?\?+\]?|n\/?a|none|-+)$/i;

export function isValidSurname(value) {
    const text = String(value ?? "").trim();
    return text.length > 0 && !PLACEHOLDER_SURNAME.test(text);
}

/**
 * The Surnames List app's content: per generation, the surnames on the father's side and on the mother's side, with
 * the first appearance of each marked, plus every distinct surname. Blank and placeholder names are left out.
 */
export function computeSurnames(model) {
    const ancestors = visibleAncestors(model).filter((a) => isValidSurname(a.entry.person.lastNameAtBirth));
    const seen = new Map(); // lower-case surname -> summary
    const generations = [];

    for (let gen = 1; gen <= model.generations; gen++) {
        const inGeneration = ancestors.filter((a) => a.gen === gen).sort((a, b) => a.n - b.n);
        if (!inGeneration.length) continue;
        // Within a generation the first half of the numbers is the father's side.
        const isPaternal = (n) => gen >= 2 && n < 3 * 2 ** (gen - 2);
        const row = { gen, root: [], paternal: [], maternal: [] };
        const ordered = [
            ...inGeneration.filter((a) => gen === 1 || isPaternal(a.n)),
            ...inGeneration.filter((a) => gen >= 2 && !isPaternal(a.n)),
        ];
        for (const a of ordered) {
            const surname = a.entry.person.lastNameAtBirth.trim();
            const key = surname.toLowerCase();
            const isNew = !seen.has(key);
            if (isNew) seen.set(key, { surname, count: 0, firstGen: gen, firstN: a.n, ids: new Set() });
            const summary = seen.get(key);
            summary.count++;
            summary.ids.add(a.entry.id);
            const item = { surname, n: a.n, isNew };
            (gen === 1 ? row.root : isPaternal(a.n) ? row.paternal : row.maternal).push(item);
        }
        generations.push(row);
    }

    const distinct = [...seen.values()]
        .map(({ ids, ...rest }) => ({ ...rest, people: ids.size }))
        .sort((a, b) => a.surname.localeCompare(b.surname));
    return { generations, distinct };
}

function surnameItemHtml(item, gen) {
    const sizeClass = item.isNew ? ` gr-surname-new gr-surname-g${Math.min(gen, 7)}` : "";
    return `<a class="gr-surname${sizeClass}" href="#${entryId(item.n)}">${esc(item.surname)}</a>`;
}

export function surnamesHtml(model, ctx) {
    const { generations, distinct } = computeSurnames(model);
    const rows = generations
        .map((row) => {
            if (row.gen === 1) {
                return `<div class="gr-surname-row"><div class="gr-surname-side gr-surname-root">${row.root
                    .map((item) => surnameItemHtml(item, row.gen))
                    .join(" ")}</div></div>`;
            }
            const side = (items) => items.map((item) => surnameItemHtml(item, row.gen)).join(" ");
            return `<div class="gr-surname-row"><div class="gr-surname-label">Generation ${row.gen}</div><div class="gr-surname-side">${side(row.paternal)}</div><div class="gr-surname-side">${side(row.maternal)}</div></div>`;
        })
        .join("\n");
    const list = distinct
        .map(
            (s) =>
                `<li>${esc(s.surname)} <small>(${s.count}${s.count === 1 ? " time" : " times"}, first in generation ${s.firstGen})</small></li>`
        )
        .join("");
    const appLink = ctx.rootWtId
        ? ` <a href="${esc(treeAppUrl(ctx.rootWtId, "surnames"))}">Open the Surnames List app</a>.`
        : "";
    return `<section class="gr-section gr-surnames" id="gr-surnames"><h2>Surnames List</h2>
<p class="gr-section-note">The last names at birth of the ${model.generations} generation${model.generations === 1 ? "" : "s"} in this report, father's side on the left and mother's side on the right. A surname is highlighted where it first appears. Unknown and blank names are left out.${appLink}</p>
<div class="gr-surname-rows">${rows}</div>
<h3>${distinct.length} distinct surname${distinct.length === 1 ? "" : "s"}</h3>
<ul class="gr-surname-list">${list}</ul></section>`;
}

// ---- Family Calendar -----------------------------------------------------------------------------------------------

/**
 * The Family Calendar app's content for the ancestors and their siblings: birth and death anniversaries, and the
 * marriages of the direct line. Only dates that have a month and a day can be placed on a calendar.
 */
export function computeCalendar(model) {
    const ancestors = visibleAncestors(model).filter((a) => !a.isRepeat);
    const byId = new Map(ancestors.map((a) => [a.entry.id, a]));
    const events = new Map();

    const add = (type, date, people, place, key) => {
        const parsed = parseWtDate(date);
        if (!parsed || !parsed.month || !parsed.day) return;
        const id = `${type}|${date}|${key}`;
        if (events.has(id)) return;
        events.set(id, { type, month: parsed.month, day: parsed.day, year: parsed.year, people, place: place || "" });
    };
    const who = (person, n) => ({ name: person.name, wtId: person.wtId, n: n || 0 });

    for (const { n, entry } of ancestors) {
        const { person, family } = entry;
        add("Birth", person.birthDate, [who(person, n)], person.birthLocation, person.id);
        add("Death", person.deathDate, [who(person, n)], person.deathLocation, person.id);

        for (const sibling of family?.siblings || []) {
            if (sibling.hidden || sibling.slot) continue;
            add("Birth", sibling.birthDate, [who(sibling)], sibling.birthLocation, sibling.id);
            add("Death", sibling.deathDate, [who(sibling)], sibling.deathLocation, sibling.id);
        }

        for (const spouse of person.spouses) {
            const partner = byId.get(spouse.id);
            const partnerPerson =
                partner?.entry.person || family?.partners.find((p) => p.id === spouse.id && !p.hidden);
            if (!partnerPerson) continue;
            const pair = [person.id, spouse.id].sort().join("-");
            add(
                "Marriage",
                spouse.marriageDate,
                [who(person, n), who(partnerPerson, partner?.n)],
                spouse.marriageLocation,
                pair
            );
        }
    }

    const months = MONTH_NAMES.map((name, index) => ({ month: index + 1, name, events: [] }));
    for (const event of events.values()) months[event.month - 1].events.push(event);
    for (const month of months) {
        month.events.sort(
            (a, b) =>
                a.day - b.day ||
                a.year - b.year ||
                a.type.localeCompare(b.type) ||
                a.people[0].name.localeCompare(b.people[0].name)
        );
    }
    return { months, total: events.size };
}

function eventPeopleHtml(people) {
    return people.map((p) => (p.n ? `${esc(p.name)} ${slotLink(p.n)}` : wikiTreeLink(p.wtId, p.name))).join(" and ");
}

export function calendarHtml(model, ctx) {
    const { months, total } = computeCalendar(model);
    const present = months.filter((month) => month.events.length);
    const appLink = ctx.rootWtId
        ? ` <a href="${esc(treeAppUrl(ctx.rootWtId, "calendar"))}">Open the Family Calendar app</a>.`
        : "";
    const siblingNote = model.options.includeFamily ? " and their siblings" : "";
    const blocks = present
        .map(
            (
                month
            ) => `<section class="gr-month"><h3>${month.name}</h3><table class="gr-table gr-calendar-table"><tbody>
${month.events
    .map(
        (event) =>
            `<tr><td class="gr-day">${event.day}</td><td>${event.type}</td><td>${eventPeopleHtml(event.people)}</td><td>${event.year}${
                event.place ? `, ${esc(event.place)}` : ""
            }</td></tr>`
    )
    .join("\n")}
</tbody></table></section>`
        )
        .join("\n");
    const summary = present.length
        ? `<p class="gr-calendar-summary">${present.map((month) => `${month.name.slice(0, 3)} ${month.events.length}`).join(" &middot; ")}</p>`
        : `<p>No ancestor has a birth, death or marriage with a full month and day.</p>`;
    return `<section class="gr-section gr-calendar" id="gr-calendar"><h2>Family Calendar</h2>
<p class="gr-section-note">Birth, death and marriage anniversaries of the ancestors${siblingNote} in this report, by month (${total} in all). Only dates with a month and a day are included.${appLink}</p>
${summary}
${blocks}</section>`;
}
