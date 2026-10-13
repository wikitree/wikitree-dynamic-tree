/*
 * Renders the Genealogy Report model as HTML.
 *
 * Pure string building (no DOM) so it can be tested in Node. Everything that comes from the API is escaped here.
 * The one exception is `entry.bio`, which must already have been through sanitizeBio() (report_bio.js).
 */

import { countryOf, formatDate, formatLifespan } from "./report_dates.js";
import { compressRanges, generationOf, pathNumbers, relationshipLabel } from "./report_model.js";
import { REPORT_VERSION, dateStyleOf } from "./report_options.js";

// WikiTree's printable logo (https://www.wikitree.com/photo/png/WikiTree_Images_New).
const LOGO_URL = "https://www.wikitree.com/photo.php/d/d7/WikiTree_Images_New.png";
import { WIKITREE_URL, entryId, esc, slotLink, wikiTreeLink } from "./report_html.js";
import { fanChartHtml } from "./report_fan.js";
import { CONFIDENT, RELATIONSHIP_STATUS, RESEARCH_STATUS, isMarked, researchStatusOf } from "./report_status.js";
import { calendarHtml, statisticsHtml, surnamesHtml } from "./report_sections.js";

export { esc };

// ctx carries the display choices: { dateStyle, showWtIds, showRelationship, showPath, entriesByNumber }.
function datePlace(date, status, location, ctx) {
    return [formatDate(date, status, ctx.dateStyle), location].filter(Boolean).join(", ");
}

function vitals(person, ctx) {
    const birth = datePlace(person.birthDate, person.birthStatus, person.birthLocation, ctx);
    const death = datePlace(person.deathDate, person.deathStatus, person.deathLocation, ctx);
    return [
        birth && `<p class="gr-vital"><em>b.</em> ${esc(birth)}</p>`,
        death && `<p class="gr-vital"><em>d.</em> ${esc(death)}</p>`,
    ]
        .filter(Boolean)
        .join("");
}

function marriageText(rel, ctx) {
    const text = datePlace(rel.marriageDate, rel.marriageStatus, rel.marriageLocation, ctx);
    return text ? `m. ${text}` : "";
}

// ---- research status and relationship confidence ---------------------------------------------------------------------
// Text badges (not colour alone), so they still read on a black and white printout.

// A parent-child link. Confident, the normal case, is marked with a check (as on WikiTree's own tree views) unless the
// reader turned that off; the other statuses are always marked.
function linkBadge(status, ctx, text) {
    if (!ctx.showStatus || !status) return "";
    const isConfident = status.code === CONFIDENT;
    if (isConfident && !ctx.showConfident) return "";
    if (!isConfident && !isMarked(status.code)) return "";
    const label = text || status.label;
    return `<span class="gr-badge gr-rel gr-rel-${status.code}" title="${esc(status.meaning)}">${isConfident ? "\u2713 " : ""}${esc(label)}</span>`;
}

// A marriage: uncertain is always marked, confident only if Confident marks are on.
function marriageBadge(status, ctx) {
    if (!ctx.showStatus || !status) return "";
    if (status.code === 10) {
        return `<span class="gr-badge gr-rel gr-rel-10" title="${esc(RELATIONSHIP_STATUS[10].meaning)}">Marriage uncertain</span>`;
    }
    if (status.code === CONFIDENT && ctx.showConfident) {
        return `<span class="gr-badge gr-rel gr-rel-20" title="${esc(RELATIONSHIP_STATUS[20].meaning)}">\u2713 Marriage confident</span>`;
    }
    return "";
}

function researchBadge(code, ctx) {
    const status = ctx.showStatus ? researchStatusOf(code) : null;
    if (!status) return "";
    return `<span class="gr-badge gr-rs gr-rs-${status.code}" title="Research status: ${esc(status.meaning)}">${esc(status.label)}</span>`;
}

// One relative in a Family row: a link to their entry if they are on the direct line, else to their profile.
function relativeHtml(rel, ctx, { showKind = false, showMarriage = false } = {}) {
    const linkTag = rel.link ? (rel.link === "adoptive" ? "adopted" : "biological child") : "";
    const badges = [linkBadge(rel.linkStatus, ctx), marriageBadge(rel.relationship, ctx)].filter(Boolean).join(" ");
    if (rel.slot) {
        return [
            `${esc(rel.name || "")} ${slotLink(rel.slot)}${linkTag ? ` <small>(${linkTag})</small>` : ""}`.trim(),
            badges,
        ]
            .filter(Boolean)
            .join(" ");
    }
    const life = formatLifespan(rel.birthDate, rel.deathDate);
    const extra = [
        showKind && rel.kind ? `${rel.kind} sibling` : "",
        linkTag,
        showMarriage ? marriageText(rel, ctx) : "",
    ]
        .filter(Boolean)
        .join("; ");
    return [wikiTreeLink(rel.wtId, rel.name), life && esc(life), extra && `<small>(${esc(extra)})</small>`, badges]
        .filter(Boolean)
        .join(" ");
}

// "A; B; and 2 living or private" - hidden relatives are counted, never named.
function relativeList(list, ctx, options) {
    if (!list.length) return "";
    const shown = list.filter((rel) => !rel.hidden).map((rel) => relativeHtml(rel, ctx, options));
    // Someone who came back with no name is private (or living and hidden); someone who did not come back at all is
    // simply not available, which is not the same thing.
    const hidden = list.filter((rel) => rel.hidden);
    const notRetrieved = hidden.filter((rel) => rel.reason === "missing").length;
    if (hidden.length - notRetrieved) shown.push(`${hidden.length - notRetrieved} living or private`);
    if (notRetrieved) shown.push(`${notRetrieved} not retrieved`);
    return shown.join("; ");
}

function familyHtml(family, ctx) {
    if (!family) return "";
    const rows = [];
    const parents = family.parents.map(
        (p) =>
            `${p.role === "father" ? "Father" : "Mother"}: ${p.hidden ? (p.reason === "missing" ? "not retrieved" : "living or private") : relativeHtml(p, ctx)}`
    );
    const parentsLabel =
        family.parentsMode === "bio"
            ? "Parents (biological)"
            : family.parentsMode === "main"
              ? "Parents (adoptive)"
              : "Parents";
    if (parents.length) rows.push([parentsLabel, parents.join("; ")]);
    if (family.directSpouse) {
        const detail = marriageText(family.directSpouse, ctx);
        rows.push([
            "Married to",
            [
                `${slotLink(family.directSpouse.slot)}${detail ? ` <small>(${esc(detail)})</small>` : ""}`,
                marriageBadge(family.directSpouse.relationship, ctx),
            ]
                .filter(Boolean)
                .join(" "),
        ]);
    }
    const partners = relativeList(family.partners, ctx, { showMarriage: true });
    if (partners) rows.push([family.directSpouse ? "Other partners" : "Spouses and partners", partners]);
    const siblings = relativeList(family.siblings, ctx, { showKind: true });
    if (siblings) rows.push(["Siblings", siblings]);
    const children = relativeList(family.children, ctx);
    if (children) rows.push(["Children", children]);
    if (!rows.length) return "";
    return `<div class="gr-family"><h4>Family</h4><dl>${rows
        .map(([label, html]) => `<dt>${esc(label)}</dt><dd>${html}</dd>`)
        .join("")}</dl></div>`;
}

function bioHtml(entry) {
    if (!entry.bio) return "";
    const notes = entry.bio.notes || [];
    return [
        entry.bio.html && `<div class="gr-bio"><h4>Biography</h4>${entry.bio.html}</div>`,
        notes.length &&
            `<div class="gr-sources"><h5>Sources</h5><ol class="gr-notes">${notes.map((note, i) => `<li id="gr-n${entry.n}-${i + 1}">${note}</li>`).join("")}</ol></div>`,
        entry.bio.tailHtml && `<div class="gr-bio gr-bio-tail">${entry.bio.tailHtml}</div>`,
    ]
        .filter(Boolean)
        .join("");
}

// "Greg Clarke -> Dwight Douglass (1945-2017) -> William Douglass (1907-1986)": the line from the subject down to n.
function pathHtml(n, ctx) {
    if (!ctx.showPath || n < 2) return "";
    const steps = pathNumbers(n).map((number) => {
        const entry = ctx.entriesByNumber.get(number);
        const label = entry?.person
            ? `${esc(entry.person.name)}${
                  formatLifespan(entry.person.birthDate, entry.person.deathDate)
                      ? ` <small>${esc(formatLifespan(entry.person.birthDate, entry.person.deathDate))}</small>`
                      : ""
              }`
            : "Private";
        return `<a class="gr-slot" href="#${entryId(number)}">${label}</a>`;
    });
    return `<p class="gr-path" aria-label="Line from the subject">${steps.join(' <span aria-hidden="true">&rarr;</span> ')}</p>`;
}

function headingHtml(entry, ctx) {
    const person = entry.person;
    const relationship = ctx.showRelationship ? relationshipLabel(entry.n) : "";
    return `<h3>${entry.n}. ${esc(person.name)}${
        ctx.showWtIds ? ` <span class="gr-wtid">(${wikiTreeLink(person.wtId, person.wtId)})</span>` : ""
    }${relationship ? ` <span class="gr-relationship">${esc(relationship)}</span>` : ""}</h3>`;
}

// Research status of the profile, and how sure its link is to the person below it on the line.
function statusBadgesHtml(entry, ctx) {
    const badges = [
        researchBadge(entry.person.researchStatus, ctx),
        linkBadge(
            entry.linkStatus,
            ctx,
            entry.linkStatus && `${entry.linkStatus.label} relationship to #${Math.floor(entry.n / 2)}`
        ),
    ].filter(Boolean);
    return badges.length ? `<p class="gr-badges">${badges.join(" ")}</p>` : "";
}

// Switch between the parents the profile lists and the biological ones. Screen only: print shows the chosen line,
// labelled in the Family block.
function parentToggleHtml(entry) {
    if (!entry.parentChoice) return "";
    const { mode } = entry.parentChoice;
    const button = (value, label, title) =>
        `<button type="button" class="gr-parent-mode" data-person-id="${esc(entry.id)}" data-mode="${value}" aria-pressed="${
            mode === value
        }" title="${esc(title)}">${label}</button>`;
    return `<p class="gr-parent-toggle" role="group" aria-label="Parents shown for ${esc(entry.person.name)}">${button(
        "bio",
        "Biological",
        "Follow the biological parents"
    )}${button("main", "Adoptive", "Follow the parents listed on the profile")}</p>`;
}

function entryHtml(entry, ctx) {
    const entriesByNumber = ctx.entriesByNumber;
    const id = entryId(entry.n);
    if (entry.kind === "duplicate") {
        const first = entriesByNumber.get(entry.firstSlot);
        return `<section class="gr-entry gr-entry-ref" id="${id}"><h3>${entry.n}. ${esc(first?.person?.name || "Same person")}</h3><p>Same person as ${slotLink(entry.firstSlot)} (the family tree line comes back to the same ancestor here).</p></section>`;
    }
    if (entry.kind === "hidden") {
        const why =
            entry.reason === "living"
                ? "This person is living, so no details are shown. Untick \u201cHide living people\u201d to show them."
                : "WikiTree returned no details for this profile, so none are shown. It is private to the account used to ask.";
        return `<section class="gr-entry gr-entry-private" id="${id}"><h3>${entry.n}. Private</h3><p>${why}</p></section>`;
    }
    if (entry.kind === "unavailable") {
        return `<section class="gr-entry gr-entry-private" id="${id}"><h3>${entry.n}. Profile not available</h3><p>This ancestor is named on the family tree but the profile could not be retrieved.</p></section>`;
    }
    const { person } = entry;
    const portrait =
        person.photoUrl && entry.showPortrait ? `<img class="gr-portrait" src="${esc(person.photoUrl)}" alt="">` : "";
    return `<section class="gr-entry" id="${id}">
${portrait}${headingHtml(entry, ctx)}
${statusBadgesHtml(entry, ctx)}
${parentToggleHtml(entry)}
${person.currentName ? `<p class="gr-vital"><em>later known as</em> ${esc(person.currentName)}</p>` : ""}
${vitals(person, ctx)}
${pathHtml(entry.n, ctx)}
${familyHtml(entry.family, ctx)}
${bioHtml(entry)}
</section>`;
}

function statusSummaryHtml(stats) {
    const research = Object.entries(stats.researchCounts)
        .map(([code, count]) => [Number(code), count])
        .sort((a, b) => b[0] - a[0])
        .map(([code, count]) => `${esc(RESEARCH_STATUS[code]?.label || "No status set")} ${count}`);
    const links = Object.entries(stats.linkCounts)
        .map(([code, count]) => [Number(code), count])
        .sort((a, b) => b[0] - a[0])
        .map(([code, count]) => `${esc(RELATIONSHIP_STATUS[code]?.label || code)} ${count}`);
    const check = stats.uncertainLinks.length
        ? `<p class="gr-research-note"><strong>Check these links:</strong> the relationship to the person below is Uncertain or Non-biological at ${stats.uncertainLinks
              .map(slotLink)
              .join(", ")}. Take care with anything further back on those lines.</p>`
        : "";
    const dna = stats.dnaLinks.length
        ? `<p>Relationships confirmed with DNA at ${stats.dnaLinks.map(slotLink).join(", ")}.</p>`
        : "";
    return `<h3>Research status and relationship confidence</h3>
<p>Research status of the ancestors: ${research.join(", ") || "none"}.</p>
<p>Relationships on the direct line: ${links.join(", ") || "none recorded"}.</p>${dna}${check}`;
}

function summaryHtml(model, ctx) {
    const { stats } = model;
    const years =
        stats.earliestBirthYear && stats.latestBirthYear
            ? `<p>Births range from ${stats.earliestBirthYear} to ${stats.latestBirthYear}.</p>`
            : "";
    const countries = stats.birthCountries.length
        ? `<h3>Countries of birth</h3><ul class="gr-countries">${stats.birthCountries
              .map(([country, count]) => `<li>${esc(country)} <small>(${count})</small></li>`)
              .join("")}</ul>`
        : "";
    const rows = stats.byGeneration
        .map((g) => `<tr><td>Generation ${g.gen}</td><td>${g.found} of ${g.possible}</td></tr>`)
        .join("");
    const statusSummary = ctx.showStatus ? statusSummaryHtml(stats) : "";
    return `<section class="gr-summary" id="gr-summary"><h2>Summary Findings</h2>
<p>${stats.uniqueAncestors} ancestors are on the family tree across ${model.generations} generations.</p>
<table class="gr-table"><thead><tr><th>Generation</th><th>Ancestors found</th></tr></thead><tbody>${rows}</tbody></table>
${years}${countries}${statusSummary}</section>`;
}

function omittedHtml(model, omitted) {
    if (!omitted.length) return "";
    const label = omitted.length === 1 ? `Generation ${omitted[0]} is` : `Generations ${omitted.join(", ")} are`;
    const living = model.entries.some((e) => omitted.includes(e.gen) && e.kind === "hidden" && e.reason === "living");
    const why = living
        ? "living people are hidden (untick \u201cHide living people\u201d to show them)"
        : "the only profiles in " + (omitted.length === 1 ? "it are" : "them are") + " private or not available";
    return `<p class="gr-research-note">${label} not shown, because ${why}.</p>`;
}

function missingHtml(model) {
    if (!model.missingPositions.length) return "";
    return `<p class="gr-research-note"><strong>Research note:</strong> Ahnentafel positions ${compressRanges(
        model.missingPositions
    )} have no profile on WikiTree and are not included in this report. These are the next research opportunities.</p>`;
}

function indexesHtml(model, ctx) {
    const people = model.entries.filter((e) => e.kind === "person");
    const names = people
        .map((e) => ({ key: e.person.sortName, label: e.person.name, wtId: e.person.wtId, n: e.n }))
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(
            (p) =>
                `<li>${esc(p.key)}${ctx.showWtIds ? ` <small>(${esc(p.wtId)})</small>` : ""} &mdash; ${slotLink(p.n)}</li>`
        )
        .join("");

    const places = new Map();
    for (const e of people) {
        for (const place of [e.person.birthLocation, e.person.deathLocation]) {
            if (!place) continue;
            if (!places.has(place)) places.set(place, new Set());
            places.get(place).add(e.n);
        }
    }
    // One heading per country (the last part of the place), in alphabetical order.
    const countries = new Map();
    for (const [place, numbers] of places) {
        const country = countryOf(place);
        if (!countries.has(country)) countries.set(country, []);
        countries.get(country).push([place, numbers]);
    }
    const byCountry = [...countries.keys()].sort((a, b) => a.localeCompare(b));
    const placeGroups = byCountry
        .map((country) => {
            const items = countries
                .get(country)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(
                    ([place, numbers]) =>
                        `<li>${esc(place)} &mdash; ${[...numbers]
                            .sort((a, b) => a - b)
                            .map(slotLink)
                            .join(", ")}</li>`
                )
                .join("");
            return `<h3>${esc(country)}</h3><ul>${items}</ul>`;
        })
        .join("");

    return `<section class="gr-index" id="gr-index-names"><h2>Index of Names</h2><ul>${names}</ul></section>
<section class="gr-index" id="gr-index-places"><h2>Index of Locations</h2>
${placeGroups}</section>`;
}

// The optional sections that mirror Tree Apps, in report order.
const APP_SECTIONS = [
    { option: "sectionStats", id: "gr-stats", title: "Statistics", html: statisticsHtml },
    { option: "sectionFan", id: "gr-fan", title: "Fan Chart", html: fanChartHtml },
    { option: "sectionCalendar", id: "gr-calendar", title: "Family Calendar", html: calendarHtml },
    { option: "sectionSurnames", id: "gr-surnames", title: "Surnames List", html: surnamesHtml },
];

function contentsHtml(model) {
    const generations = [...listedGenerations(model).listed.keys()];
    const items = [
        `<li><a href="#gr-summary">Summary Findings</a></li>`,
        ...generations.map((g) => `<li><a href="#gr-gen${g}">Generation ${g}</a></li>`),
        ...APP_SECTIONS.filter((s) => model.options[s.option]).map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`),
        `<li><a href="#gr-index-names">Index of Names</a></li>`,
        `<li><a href="#gr-index-places">Index of Locations</a></li>`,
    ];
    return `<nav class="gr-contents" aria-label="Contents"><h2>Contents</h2><ul>${items.join("")}</ul></nav>`;
}

// The name for the title page: given names and surname at birth, without a prefix or suffix.
// A starting person who is not listed is named by their surname at birth, which WikiTree gives even then.
function titleName(root, fallback) {
    const person = root?.person;
    if (person) return [person.given, person.lastNameAtBirth].filter(Boolean).join(" ") || person.name;
    return root?.surname || fallback;
}

// The generations that have somebody to list. One with only private or unavailable people would be a page holding
// just a heading, so it is left out (the research note and summary still count the people).
function listedGenerations(model) {
    const generations = new Map();
    for (const entry of model.entries) {
        if (!generations.has(entry.gen)) generations.set(entry.gen, []);
        generations.get(entry.gen).push(entry);
    }
    const listed = new Map(
        [...generations].filter(([, list]) => list.some((e) => e.kind === "person" || e.kind === "duplicate"))
    );
    return { listed, omitted: [...generations.keys()].filter((gen) => !listed.has(gen)) };
}

function titlePageHtml(model, root, rootName, settings) {
    const { earliestBirthYear: from, latestBirthYear: to } = model.stats;
    const span = from && to ? (from === to ? ` - ${from}` : ` - ${from}\u2013${to}`) : "";
    const count = `${model.generations} Generation${model.generations === 1 ? "" : "s"}`;
    const created = settings.generatedOn ? `created ${esc(settings.generatedOn)} - ` : "";
    return `<header class="gr-title">
<div class="gr-title-main">
<img class="gr-logo" src="${LOGO_URL}" alt="WikiTree">
<p class="gr-rooted">Rooted in WikiTree:</p>
<h1><span class="gr-for">Genealogical Report for</span> <strong>${esc(titleName(root, rootName))}</strong></h1>
<h2 class="gr-span">${count}${span}</h2>
</div>
<footer class="gr-title-foot">
<p>${created}compiled from <a href="${WIKITREE_URL}">WikiTree</a></p>
<p class="gr-version"><em>app version ${esc(REPORT_VERSION)}</em></p>
</footer>
</header>`;
}

/**
 * @param {object} model  from buildReportModel(), with `bio` attached to person entries if biographies are wanted
 * @param {object} [settings]
 * @param {string} [settings.generatedOn]  display date for the title block
 */
export function renderReport(model, settings = {}) {
    const entriesByNumber = new Map(model.entries.map((e) => [e.n, e]));
    const root = entriesByNumber.get(1);
    const rootName = root?.person?.name || "the starting profile";
    const showPortraits = model.options.includePortraits !== false;
    const ctx = {
        entriesByNumber,
        dateStyle: dateStyleOf(model.options),
        showWtIds: model.options.showWtIds !== false,
        showRelationship: Boolean(model.options.showRelationship),
        showPath: Boolean(model.options.showPath),
        rootWtId: root?.person?.wtId || "",
        showStatus: model.options.showStatus !== false,
        showConfident: model.options.showConfident !== false,
    };
    model.entries.forEach((e) => {
        e.showPortrait = showPortraits;
    });

    const { listed: generations, omitted } = listedGenerations(model);
    const body = [...generations.entries()]
        .map(
            ([gen, list]) =>
                `<section class="gr-generation" id="gr-gen${gen}"><h2>Generation No. ${gen}</h2>${list
                    .map((entry) => entryHtml(entry, ctx))
                    .join("\n")}</section>`
        )
        .join("\n");

    const appSections = APP_SECTIONS.filter((s) => model.options[s.option])
        .map((s) => s.html(model, ctx))
        .join("\n");

    return `<article class="gr-report">
${titlePageHtml(model, root, rootName, settings)}
${contentsHtml(model)}
<section class="gr-howto"><h2>How to read this report</h2>
<p>Ancestors are numbered with the <em>Ahnentafel</em> system. The subject is #1, the father is #2 and the mother #3. A father's number is double his child's, and a mother's is double plus one. Each ancestor's <em>Family</em> block lists their parents, spouses, siblings and children (where a profile has both listed and biological parents, the Biological / Adoptive buttons under the heading choose which line the report follows); relatives the report cannot show (private profiles, or living people if hidden) are counted but not named.</p>
${ctx.showStatus ? `<p>The badges show a profile's <em>Research Status</em> (set by WikiTree members; profiles with no status are not marked) and the <em>Relationship Status</em> of parent-child links and marriages. ${ctx.showConfident ? "A check mark means Confident, the normal case; the other statuses are named." : "A link is marked when it is Uncertain, Non-biological or Confirmed with DNA; an unmarked link is Confident."}</p>` : ""}
${omittedHtml(model, omitted)}${missingHtml(model)}
</section>
${summaryHtml(model, ctx)}
${body}
${appSections}
${indexesHtml(model, ctx)}
</article>`;
}

export { generationOf };
