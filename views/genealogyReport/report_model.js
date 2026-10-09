/*
 * Report model for the Genealogy Report.
 *
 * Pure functions only (no DOM, no network) so they can be tested in Node. Input is the "people" object the
 * WikiTree API getPeople action returns (profile Id -> fields); output is a plain object the renderer turns into HTML.
 *
 * Numbering follows the Ahnentafel convention: the subject is #1, a father is 2n and a mother is 2n + 1 for a
 * child numbered n. "Generation 1" is the subject, 2 the parents, 3 the grandparents, and so on.
 */

import { countryOf, dateSortKey, yearOf } from "./report_dates.js";

const MAX_EXACT_GENERATIONS = 50;

export function generationOf(n) {
    return Math.floor(Math.log2(n)) + 1;
}

function ordinal(n) {
    const rest = n % 100;
    if (rest >= 11 && rest <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
}

/**
 * How an ancestor is related to the subject, from the Ahnentafel number alone: "father", "grandmother",
 * "great-grandfather", "2nd great-grandmother". Even numbers are fathers and odd numbers mothers, so the
 * sex of the relationship never has to be guessed. "" for the subject.
 */
export function relationshipLabel(n) {
    if (!Number.isInteger(n) || n < 2) return "";
    const generation = generationOf(n);
    const parent = n % 2 === 0 ? "father" : "mother";
    if (generation === 2) return parent;
    if (generation === 3) return `grand${parent}`;
    const greats = generation - 3;
    return `${greats === 1 ? "great" : `${ordinal(greats)} great`}-grand${parent}`;
}

/**
 * The Ahnentafel numbers from the subject down to n: 13 -> [1, 3, 6, 13].
 */
export function pathNumbers(n) {
    const path = [];
    for (let current = n; current >= 1; current = Math.floor(current / 2)) path.push(current);
    return path.reverse();
}

function positiveId(value) {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? String(id) : "";
}

function uniqueTokens(...values) {
    const seen = new Set();
    const out = [];
    for (const value of values) {
        for (const token of String(value || "")
            .split(/\s+/)
            .filter(Boolean)) {
            const key = token.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                out.push(token);
            }
        }
    }
    return out;
}

/**
 * The parents a profile can have. "main" are the parents the profile lists (the ones WikiTree shows; when the
 * biological parents are different these are the adoptive or legal parents). "bio" are the biological parents,
 * which fall back to the listed parent when only one side differs.
 */
export function parentOptions(person) {
    const main = { fatherId: positiveId(person.Father), motherId: positiveId(person.Mother) };
    const bio = {
        fatherId: positiveId(person.BioFather) || main.fatherId,
        motherId: positiveId(person.BioMother) || main.motherId,
    };
    return { main, bio, hasAlternate: bio.fatherId !== main.fatherId || bio.motherId !== main.motherId };
}

/**
 * The parents to follow for a profile in the given mode ("main" or "bio"). A profile with no alternative is
 * always "main", whatever was asked for.
 */
export function parentsFor(person, mode) {
    const options = parentOptions(person);
    const effective = mode === "bio" && options.hasAlternate ? "bio" : "main";
    return { ...options[effective], mode: effective, hasAlternate: options.hasAlternate };
}

/**
 * (profile id) -> "main" | "bio": a per-profile choice if there is one, else the report-wide default.
 */
export function makeParentChooser(defaultMode, choices) {
    return (id) => choices?.get(id) || (defaultMode === "bio" ? "bio" : "main");
}

function isLivingFlag(value) {
    return value === true || value === 1 || value === "1";
}

/**
 * A profile we may not show. The API already decides what the logged-in viewer may see (for example, a profile
 * manager sees their own living profile, while a stranger gets a privacy-limited record with no name), so the
 * default is to trust it: hidden means absent, or no name came back. `maskLiving` additionally hides anyone the
 * API flags as living, for reports that will be shared.
 */
export function isHiddenPerson(person, { maskLiving = false } = {}) {
    if (!person) return true;
    if (maskLiving && isLivingFlag(person.IsLiving)) return true;
    return !(person.FirstName || person.LastNameAtBirth || person.RealName);
}

/**
 * The name used in headings. Genealogical practice (and WikiTree's LNAB rule) is the surname at birth.
 */
export function displayName(person) {
    const given = uniqueTokens(person.FirstName || person.RealName, person.MiddleName).join(" ");
    const last = person.LastNameAtBirth || person.LastNameCurrent || "";
    return [person.Prefix, given, last, person.Suffix].filter(Boolean).join(" ").trim() || person.Name || "";
}

function currentNameIfDifferent(person) {
    const lnab = person.LastNameAtBirth || "";
    const lnc = person.LastNameCurrent || "";
    if (!lnc || lnc === lnab || lnc === "Unknown") return "";
    return uniqueTokens(person.FirstName || person.RealName, person.MiddleName)
        .concat([lnc])
        .join(" ");
}

function photoUrlOf(person) {
    const candidate = person.PhotoData?.url || "";
    if (/^https:\/\//i.test(candidate)) return candidate;
    if (candidate.startsWith("//")) return `https:${candidate}`;
    if (candidate.startsWith("/")) return `https://www.wikitree.com${candidate}`;
    return "";
}

function spousesOf(person) {
    const raw = person.Spouses;
    if (!raw) return [];
    return Object.values(raw)
        .map((spouse) => ({
            id: positiveId(spouse?.Id),
            marriageDate: spouse?.MarriageDate || "",
            marriageLocation: spouse?.MarriageLocation || "",
            marriageStatus: spouse?.DataStatus?.MarriageDate || "",
        }))
        .filter((spouse) => spouse.id);
}

/**
 * Flatten an API person into the fields the report uses.
 */
export function normalizePerson(person) {
    const status = person.DataStatus || {};
    return {
        id: positiveId(person.Id),
        wtId: person.Name || "",
        name: displayName(person),
        given: uniqueTokens(person.FirstName || person.RealName, person.MiddleName).join(" "),
        lastNameAtBirth: person.LastNameAtBirth || "",
        sortName: `${person.LastNameAtBirth || person.LastNameCurrent || ""}, ${uniqueTokens(
            person.FirstName || person.RealName,
            person.MiddleName
        ).join(" ")}`,
        currentName: currentNameIfDifferent(person),
        gender: person.Gender || "",
        birthDate: person.BirthDate || "",
        birthStatus: status.BirthDate || "",
        birthLocation: person.BirthLocation || "",
        deathDate: person.DeathDate || "",
        deathStatus: status.DeathDate || "",
        deathLocation: person.DeathLocation || "",
        fatherId: positiveId(person.Father),
        motherId: positiveId(person.Mother),
        photoUrl: photoUrlOf(person),
        spouses: spousesOf(person),
        bioRaw: person.bioHTML || person.bio_html || person.Bio || "",
    };
}

/**
 * Map Ahnentafel number -> profile id for the direct line, down to `generations` generations.
 * A slot is recorded whenever the child names a parent, even if that profile did not come back.
 */
export function buildSlots(rootId, people, generations, chooseParents = () => "main") {
    const slots = new Map([[1, positiveId(rootId)]]);
    // Walk only the slots that exist, a generation at a time, so the cost follows the real number of ancestors
    // rather than 2^generations. Ahnentafel numbers stay exact as JavaScript integers up to 2^53, so the depth is capped.
    const depth = Math.min(generations, MAX_EXACT_GENERATIONS);
    let frontier = [1];
    for (let generation = 1; generation < depth && frontier.length; generation++) {
        const next = [];
        for (const n of frontier) {
            const id = slots.get(n);
            const person = people[id];
            if (!person) continue;
            const { fatherId, motherId } = parentsFor(person, chooseParents(id));
            if (fatherId) {
                slots.set(2 * n, fatherId);
                next.push(2 * n);
            }
            if (motherId) {
                slots.set(2 * n + 1, motherId);
                next.push(2 * n + 1);
            }
        }
        frontier = next;
    }
    return slots;
}

/**
 * "34, 35, 36, 40" -> "34–36, 40"
 */
export function compressRanges(numbers) {
    const sorted = [...new Set(numbers)].sort((a, b) => a - b);
    const parts = [];
    for (let i = 0; i < sorted.length;) {
        let j = i;
        while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
        parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : String(sorted[i]));
        i = j + 1;
    }
    return parts.join(", ");
}

// Visible relatives by birth date then name; hidden ones (no name or date to sort on) go last, in a stable order.
function byBirth(a, b) {
    if (a.hidden || b.hidden) return (a.hidden ? 1 : 0) - (b.hidden ? 1 : 0);
    return dateSortKey(a.birthDate) - dateSortKey(b.birthDate) || a.name.localeCompare(b.name);
}

/**
 * A relative as the Family block shows it: the normalized person, or `hidden` when we may not name them.
 */
function relativeRef(id, people, firstSlotOf, privacy) {
    const person = people[id];
    const slot = firstSlotOf.get(id) || 0;
    if (isHiddenPerson(person, privacy)) return { id, hidden: true, slot };
    return { ...normalizePerson(person), hidden: false, slot };
}

/**
 * Every father and mother a profile has on record, listed or biological.
 */
function parentSets(raw) {
    const options = parentOptions(raw);
    return {
        fathers: new Set([options.main.fatherId, options.bio.fatherId].filter(Boolean)),
        mothers: new Set([options.main.motherId, options.bio.motherId].filter(Boolean)),
    };
}

/**
 * Siblings are anyone sharing a parent with the person's chosen parents. "full" needs both shared; "half" needs
 * one shared and a different, known second parent on the sibling; anything else is left unlabelled rather than guessed.
 */
function siblingKind(chosen, siblingRaw) {
    const { fathers, mothers } = parentSets(siblingRaw);
    const sharedFather = chosen.fatherId && fathers.has(chosen.fatherId);
    const sharedMother = chosen.motherId && mothers.has(chosen.motherId);
    if (sharedFather && sharedMother) return "full";
    const otherSide = sharedFather ? mothers : fathers;
    if (chosen.fatherId && chosen.motherId && (sharedFather || sharedMother) && otherSide.size) return "half";
    return "";
}

/**
 * How a child is linked to a parent when it is not the ordinary way: "adoptive" if the parent is only one of the
 * profile's listed parents, "biological" if only a biological parent.
 */
function childLinkKind(parentId, childRaw) {
    const { main, bio, hasAlternate } = parentOptions(childRaw);
    if (!hasAlternate) return "";
    const isMain = main.fatherId === parentId || main.motherId === parentId;
    const isBio = bio.fatherId === parentId || bio.motherId === parentId;
    if (isMain && !isBio) return "adoptive";
    if (isBio && !isMain) return "biological";
    return "";
}

export function buildFamily(personId, number, context) {
    const { people, firstSlotOf, slots, privacy, childrenIndex, chooseParents } = context;
    const childrenOf = (parentId) => childrenIndex.get(parentId) || [];
    const self = normalizePerson(people[personId]);
    const chosen = parentsFor(people[personId], chooseParents(personId));
    const directSpouseId = number >= 2 ? slots.get(number ^ 1) || "" : "";

    const parents = [chosen.fatherId, chosen.motherId].filter(Boolean).map((id) => ({
        ...relativeRef(id, people, firstSlotOf, privacy),
        role: id === chosen.fatherId ? "father" : "mother",
    }));

    const siblingIds = new Set([...childrenOf(chosen.fatherId), ...childrenOf(chosen.motherId)]);
    siblingIds.delete(personId);
    const siblings = [...siblingIds].map((id) => ({
        ...relativeRef(id, people, firstSlotOf, privacy),
        kind: siblingKind(chosen, people[id]),
    }));

    const childIds = [...childrenOf(personId)];
    const children = childIds.map((id) => ({
        ...relativeRef(id, people, firstSlotOf, privacy),
        link: childLinkKind(personId, people[id]),
    }));

    // Partners: recorded spouses, plus the other parent of any child. The direct-line spouse is cross-referenced
    // as "married to #n" instead, because that person already has an entry of their own.
    const marriages = new Map(self.spouses.map((s) => [s.id, s]));
    const partnerIds = new Set(marriages.keys());
    for (const childId of childIds) {
        const { fathers, mothers } = parentSets(people[childId]);
        for (const other of [...fathers, ...mothers]) partnerIds.add(other);
    }
    partnerIds.delete(personId);
    partnerIds.delete(directSpouseId);
    const partners = [...partnerIds].map((id) => ({
        ...relativeRef(id, people, firstSlotOf, privacy),
        marriageDate: marriages.get(id)?.marriageDate || "",
        marriageLocation: marriages.get(id)?.marriageLocation || "",
        marriageStatus: marriages.get(id)?.marriageStatus || "",
    }));

    const marriageToDirectSpouse = directSpouseId ? marriages.get(directSpouseId) : null;
    const directSpouse = directSpouseId
        ? {
              slot: firstSlotOf.get(directSpouseId) || 0,
              marriageDate: marriageToDirectSpouse?.marriageDate || "",
              marriageLocation: marriageToDirectSpouse?.marriageLocation || "",
              marriageStatus: marriageToDirectSpouse?.marriageStatus || "",
          }
        : null;

    const sortVisible = (list) => [...list].sort(byBirth);
    return {
        parents,
        parentsMode: chosen.hasAlternate ? chosen.mode : "",
        directSpouse,
        partners: sortVisible(partners),
        siblings: sortVisible(siblings),
        children: sortVisible(children),
    };
}

function buildStats(entries, generations) {
    const byGeneration = [];
    for (let gen = 1; gen <= generations; gen++) {
        const known = new Set(entries.filter((e) => e.gen === gen && e.kind !== "unavailable").map((e) => e.id));
        byGeneration.push({ gen, possible: 2 ** (gen - 1), found: known.size });
    }
    const people = entries.filter((e) => e.kind === "person");
    const years = people.map((e) => yearOf(e.person.birthDate)).filter(Boolean);
    const countries = new Map();
    for (const e of people) {
        const country = countryOf(e.person.birthLocation);
        if (country) countries.set(country, (countries.get(country) || 0) + 1);
    }
    return {
        byGeneration,
        uniqueAncestors: new Set(entries.filter((e) => e.kind !== "unavailable").map((e) => e.id)).size,
        earliestBirthYear: years.length ? Math.min(...years) : null,
        latestBirthYear: years.length ? Math.max(...years) : null,
        birthCountries: [...countries.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    };
}

/**
 * parent id -> ids of the profiles that name them as father or mother (listed or biological). Built once, so each entry's siblings and
 * children are a lookup instead of a scan of every profile.
 */
export function buildChildrenIndex(people) {
    const index = new Map();
    const add = (parentId, childId) => {
        if (!parentId) return;
        if (!index.has(parentId)) index.set(parentId, []);
        const list = index.get(parentId);
        if (list[list.length - 1] !== childId) list.push(childId);
    };
    for (const person of Object.values(people)) {
        const id = positiveId(person.Id);
        if (!id) continue;
        const { fathers, mothers } = parentSets(person);
        for (const parentId of new Set([...fathers, ...mothers])) add(parentId, id);
    }
    return index;
}

/**
 * Build the whole report model.
 *
 * Entry kinds: "person" (full entry), "duplicate" (pedigree collapse: same profile as an earlier number, so just
 * a cross-reference), "hidden" (living or privacy-limited, no details shown), "unavailable" (named as a parent but
 * the profile did not come back).
 */
export function buildReportModel({ rootId, people, options, parentModes }) {
    const generations = options.generations;
    const chooseParents = makeParentChooser(options.parentMode, parentModes);
    const slots = buildSlots(rootId, people, generations, chooseParents);
    const numbers = [...slots.keys()].sort((a, b) => a - b);

    const firstSlotOf = new Map();
    for (const n of numbers) {
        const id = slots.get(n);
        if (!firstSlotOf.has(id)) firstSlotOf.set(id, n);
    }

    const context = {
        people,
        slots,
        firstSlotOf,
        privacy: { maskLiving: Boolean(options.maskLiving) },
        childrenIndex: buildChildrenIndex(people),
        chooseParents,
    };
    const entries = numbers.map((n) => {
        const id = slots.get(n);
        const base = { n, gen: generationOf(n), id };
        const raw = people[id];
        if (!raw) return { ...base, kind: "unavailable" };
        if (firstSlotOf.get(id) !== n) return { ...base, kind: "duplicate", firstSlot: firstSlotOf.get(id) };
        if (isHiddenPerson(raw, context.privacy)) return { ...base, kind: "hidden" };
        const chosen = parentsFor(raw, chooseParents(id));
        const listed = parentOptions(raw);
        const alternateIds = chosen.hasAlternate
            ? [listed.main, listed.bio].flatMap((o) => [o.fatherId, o.motherId])
            : [];
        return {
            ...base,
            kind: "person",
            person: normalizePerson(raw),
            // Set only when the profile has biological parents different from the ones it lists; drives the toggle.
            parentChoice: chosen.hasAlternate
                ? { mode: chosen.mode, loaded: alternateIds.filter(Boolean).every((pid) => people[pid]) }
                : null,
            family: options.includeFamily ? buildFamily(id, n, context) : null,
        };
    });

    // Positions that have no profile at all: a parent that is not recorded, or one that did not come back.
    const missing = [];
    for (const n of numbers) {
        const id = slots.get(n);
        const raw = people[id];
        if (!raw || firstSlotOf.get(id) !== n) continue;
        const { fatherId, motherId } = parentsFor(raw, chooseParents(id));
        if (!fatherId) missing.push(2 * n);
        if (!motherId) missing.push(2 * n + 1);
    }
    for (const n of numbers) {
        if (!people[slots.get(n)]) missing.push(n);
    }

    return {
        rootId: positiveId(rootId),
        generations,
        options,
        entries,
        missingPositions: [...new Set(missing)].sort((a, b) => a - b),
        stats: buildStats(entries, generations),
    };
}
