// The family world: everyone loaded round one person, in one people map, for the Family
// and Galaxy views. Everything loads as you go: getPeople "nuclear" pages (everyone within
// N steps) are merged in, with what is now known about each person's parents and children.

import { isHiddenMarriage, shownSpouses } from "./marriage_display.js";
import { getCountryFromLocation } from "./place_country.js";
import { shownGender } from "./gender_display.js";
import { personNameText, cleanDate } from "./text_utils.js";
import { fullWikiTreeName } from "./common.js";

// getPeople nuclear depths: the first fetch around the person (CC3: ~3s, where CC4 took ~20s for an old colonial family), and each
// fetch around someone at the edge as you zoom (CC3 around them).
export const FAMILY_WORLD_NUCLEAR = { start: 3, expand: 3 };

/** The chart's person summary (the same shape as the fan and descendant charts'). */
export function summarizeWorldPerson(person) {
  return {
    id: Number(person.Id),
    wtid: person.Name || "",
    // (only an Id comes for a profile you may not see: "Private", counted for a note in chat)
    name: person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name || "Private",
    hidden: !(person.RealName || person?.Derived?.ShortName || person.FirstName || person.Name),
    lnab: person.LastNameAtBirth || "",
    // (as PersonName writes it, for titles: personNameText)
    fullName: fullWikiTreeName(person),
    // (the gender to show, blank when marked not to; sex: the sex at birth, for DNA lines: chat_gender_display.js)
    gender: shownGender(person),
    sex: person.Gender || "",
    birth: cleanDate(person.BirthDate),
    death: cleanDate(person.DeathDate),
    // (null when the API didn't say)
    living: person.IsLiving === undefined || person.IsLiving === null ? null : Number(person.IsLiving) === 1,
    birthLocation: person.BirthLocation || "",
    birthCountry: getCountryFromLocation(person.BirthLocation || "") || "",
    // (for the card: where they died, and "about", "before" or "after" on the dates)
    deathLocation: person.DeathLocation || "",
    birthStatus: String(person.DataStatus?.BirthDate || ""),
    deathStatus: String(person.DataStatus?.DeathDate || ""),
    photo: person.Photo || "",
    photoData: person.PhotoData || null,
    fatherId: Number(person.Father) || 0,
    motherId: Number(person.Mother) || 0,
    // (the birth parents of someone raised by others, who are the Father and Mother: see showChosenParents)
    bioFatherId: Number(person.BioFather) || 0,
    bioMotherId: Number(person.BioMother) || 0,
    nonBioFather: String(person.DataStatus?.Father || "") === "5",
    nonBioMother: String(person.DataStatus?.Mother || "") === "5",
    // (not marriages the manager chose not to show: see chat_marriage_display.js)
    spouses: shownSpouses(person.Spouses)
      .filter((spouse) => Number(spouse.Id))
      .map((spouse) => ({ id: Number(spouse.Id), wtid: spouse.Name || "", married: cleanDate(spouse.MarriageDate || spouse.marriage_date), status: String(spouse.data_status?.marriage_date || spouse.DataStatus?.MarriageDate || ""), place: spouse.MarriageLocation || spouse.marriage_location || "" })),
  };
}

/** A new, empty world around `focusKey` (an Id or WikiTree ID). */
export function createFamilyWorld(focusKey) {
  return {
    focusKey: String(focusKey),
    focusId: 0,
    people: new Map(), // Id → summary
    childrenKnown: new Set(), // Ids whose children are all loaded
    parentsKnown: new Set(), // Ids whose parents were asked for
    tried: new Set(), // Ids fetched around (what didn't come then isn't coming)
  };
}

function findPerson(world, key) {
  const text = String(key || "");
  if (world.people.has(Number(text))) return world.people.get(Number(text));
  for (const person of world.people.values()) if (person.wtid === text) return person;
  return null;
}

function childrenIndex(world) {
  const index = new Map();
  world.people.forEach((person) => {
    [person.fatherId, person.motherId].forEach((parentId) => {
      if (!parentId) return;
      if (!index.has(parentId)) index.set(parentId, []);
      index.get(parentId).push(person);
    });
  });
  index.forEach((list) => list.sort((a, b) => (a.birth || "9999").localeCompare(b.birth || "9999") || a.id - b.id));
  return index;
}

// Profiles the viewer may not see (private, or the API login missing) come with
// a negative Id numbered per response (-1, -2 …), and the response's Father,
// Mother and Spouses refer to them by it. Family Explorer used to drop them, so a
// grandfather showed without his wife or children (user, 2026-10-04). Each
// response's negative Ids are renumbered to ones not used before, so two
// fetches' "-1"s stay different people.
function withUniqueHiddenIds(world, people) {
  const list = Object.values(people || {}).filter((person) => person && Number(person.Id));
  const renumber = new Map();
  list.forEach((person) => {
    const id = Number(person.Id);
    if (id < 0 && !renumber.has(id)) {
      world.nextHiddenId = (world.nextHiddenId || 0) - 1;
      renumber.set(id, world.nextHiddenId);
    }
  });
  if (!renumber.size) return list;
  const map = (value) => (Number(value) < 0 && renumber.has(Number(value)) ? renumber.get(Number(value)) : value);
  return list.map((person) => ({
    ...person,
    Id: map(person.Id),
    Father: map(person.Father),
    Mother: map(person.Mother),
    BioFather: map(person.BioFather),
    BioMother: map(person.BioMother),
    Spouses: (Array.isArray(person.Spouses) ? person.Spouses : Object.values(person.Spouses || {})).map((spouse) => (spouse ? { ...spouse, Id: map(spouse.Id) } : spouse)),
  }));
}

// Hidden people are known only by their visible parents: "Private", child of 123.
const visibleParentsKey = (fatherId, motherId) => [fatherId, motherId].filter((id) => Number(id) > 0).sort().join("|");

// A newer fetch that brings a visible parent's hidden children brings all of
// them, so the older placeholders for that parent go.
function replaceCoveredHidden(world, incoming) {
  const covered = new Set(
    incoming.filter((person) => Number(person.Id) < 0).map((person) => visibleParentsKey(Number(person.Father) || 0, Number(person.Mother) || 0)).filter(Boolean)
  );
  if (!covered.size) return;
  [...world.people.values()].forEach((person) => {
    // (the parents as sent, whichever pair is shown)
    const sent = person.raisedBy || person;
    if (person.id < 0 && covered.has(visibleParentsKey(sent.fatherId, sent.motherId))) world.people.delete(person.id);
  });
}

// A hidden placeholder nobody links to any more (its children were replaced) goes too.
function dropUnlinkedHidden(world) {
  for (let changed = true; changed; ) {
    changed = false;
    const linked = new Set();
    world.people.forEach((person) => {
      [person.fatherId, person.motherId, person.bioFatherId, person.bioMotherId, person.raisedBy?.fatherId, person.raisedBy?.motherId].forEach((id) => id < 0 && linked.add(id));
      (person.spouses || []).forEach((spouse) => spouse.id < 0 && linked.add(spouse.id));
    });
    [...world.people.values()].forEach((person) => {
      if (person.id < 0 && !visibleParentsKey(person.fatherId, person.motherId) && !linked.has(person.id)) {
        world.people.delete(person.id);
        changed = true;
      }
    });
  }
}

// Biological parents (the user, 2026-10-13: "Adopted people usually add their adoptive parents as their parents. They
// may also add their Bio parents … We want to be able to optionally show them and their connections"). Father and
// Mother are the parents who raised someone (marked non-biological); BioFather and BioMother their birth parents.
// The choice is each person's (the user: "the switches should probably be on individuals": Terry Rockstrom's birth
// mother is Patty Luker, who has two pairs of parents herself): someone in world.bioShown is shown as their birth
// parents' child, in their family. Where only one birth parent is recorded, a parent marked non-biological on the
// other side goes (they weren't a couple).
const hasBioParents = (person) => Boolean(person?.bioFatherId || person?.bioMotherId);

function showChosenParents(world) {
  world.people.forEach((person) => {
    if (!person.raisedBy) person.raisedBy = { fatherId: person.fatherId, motherId: person.motherId };
    // (dropHiddenMarriages works its cuts out again from the parents chosen here)
    delete person.parentsAsSent;
    const { fatherId, motherId } = person.raisedBy;
    const bio = hasBioParents(person) && Boolean(world.bioShown?.has(person.id));
    person.fatherId = !bio ? fatherId : person.bioFatherId || (person.nonBioFather ? 0 : fatherId);
    person.motherId = !bio ? motherId : person.bioMotherId || (person.nonBioMother ? 0 : motherId);
  });
}

/** For the Explorer's switch: {id, name, on} for someone with a birth parent recorded, else null. */
export function bioParentsChoice(world, id) {
  const person = world.people.get(Number(id));
  if (!hasBioParents(person) || person.hidden) return null;
  return { id: person.id, name: personNameText(person), on: Boolean(world.bioShown?.has(person.id)) };
}

/** Birth parents recorded but not loaded (a nuclear fetch can leave them out: live, Luker-573's father), once each. */
export function bioParentsToFetch(world) {
  if (!world.bioAsked) world.bioAsked = new Set();
  const ids = new Set();
  world.people.forEach((person) => [person.bioFatherId, person.bioMotherId].forEach((id) => id > 0 && !world.people.has(id) && !world.bioAsked.has(id) && ids.add(id)));
  ids.forEach((id) => world.bioAsked.add(id));
  return [...ids];
}

/**
 * People whose birth parents may be missing, to fetch by key alone, once each: getPeople "nuclear" can send
 * BioFather as null when it isn't (live 2026-10-13: Luker-573's with nuclear=2, Rockstrom-4's with nuclear=1; the
 * keys alone, ancestors and descendants send them). Those raised by a non-biological parent, or with one birth parent.
 */
export function bioParentsToCheck(world) {
  if (!world.bioChecked) world.bioChecked = new Set();
  const ids = [...world.people.values()]
    .filter((person) => person.id > 0 && !person.hidden && !world.bioChecked.has(person.id))
    .filter((person) => (person.nonBioFather || person.nonBioMother || hasBioParents(person)) && !(person.bioFatherId && person.bioMotherId))
    .map((person) => person.id);
  ids.forEach((id) => world.bioChecked.add(id));
  return ids;
}

/**
 * People a getPeople "nuclear" sent with Father or Mother null, to fetch with their ancestors, until they've been read
 * (live 2026-11-07: Murray-17695 and his brother, in every nuclear result, which also leaves out their parents and
 * can leave out those parents' parents; about 5% of people in a nuclear=3 fetch of Windsor-1. Keys alone and ancestors send them.)
 */
export function parentsToCheck(world) {
  return [...world.people.values()].filter((person) => person.id > 0 && !person.hidden && person.parentsUnsent && !world.parentsChecked?.has(person.id)).map((person) => person.id);
}

/** Adds a getPeople ancestors fetch for parentsToCheck: `ids`, their parents and those parents' parents. */
export function mergeCheckedParents(world, ids, people) {
  // (private parents aren't drawn: they come as negative Ids, which are the note's to count, as at the start)
  const shown = (value) => (Number(value) > 0 ? value : 0);
  const visible = Object.values(people || {})
    .filter((person) => Number(person?.Id) > 0)
    .map((person) => ({ ...person, Father: shown(person.Father), Mother: shown(person.Mother) }));
  mergeWorldPeople(world, visible, { root: world.focusKey });
  if (!world.parentsChecked) world.parentsChecked = new Set();
  const parentsOf = (person) => [person?.fatherId, person?.motherId].filter((id) => world.people.has(id));
  // (only those it brought: a failed fetch is tried again with the next one)
  ids
    .filter((id) => visible.some((person) => Number(person.Id) === id))
    .forEach((id) => {
      world.parentsChecked.add(id);
      [id, ...parentsOf(world.people.get(id))].forEach((known) => world.parentsKnown.add(known));
    });
  return world;
}

/** Shows someone's birth parents (on) or the parents who raised them (the view is then mounted again round them). */
export function setBiologicalParents(world, id, on) {
  if (!world.bioShown) world.bioShown = new Set();
  if (on) world.bioShown.add(Number(id));
  else world.bioShown.delete(Number(id));
  showChosenParents(world);
  dropHiddenMarriages(world, []);
  return world;
}

// A marriage marked not to show (do_not_display) goes both ways round: the other one's record may not say so.
// The ex goes from their children's families too (user, 2026-10-12: "maybe just attach the kids to Murray? … They
// can have a missing parent"): a child of the marriage keeps only the parent nearer the person the Explorer is
// about, by parents and children; for that child (or their children), nearer to both, both stay. Worked out again
// after every fetch, from the parents as sent (parentsAsSent, also how jointKids knows it isn't the spouse's child).
function dropHiddenMarriages(world, incoming) {
  incoming.forEach((person) =>
    (Array.isArray(person.Spouses) ? person.Spouses : Object.values(person.Spouses || {})).forEach((spouse) => {
      if (!isHiddenMarriage(spouse)) return;
      if (!world.hiddenMarriages) world.hiddenMarriages = new Set();
      world.hiddenMarriages.add(marriageKey(Number(person.Id), Number(spouse.Id)));
    })
  );
  if (!world.hiddenMarriages) return;
  const hidden = (x, y) => Boolean(x && y) && world.hiddenMarriages.has(marriageKey(x, y));
  world.people.forEach((person) => {
    if (person.parentsAsSent) {
      Object.assign(person, person.parentsAsSent);
      delete person.parentsAsSent;
    }
    if (person.spouses.some((spouse) => hidden(person.id, spouse.id))) person.spouses = person.spouses.filter((spouse) => !hidden(person.id, spouse.id));
  });
  const children = [...world.people.values()].filter((person) => hidden(person.fatherId, person.motherId));
  if (!children.length) return;
  // Steps from the person the Explorer is about, by parents and children only.
  const kids = childrenIndex(world);
  const steps = new Map(world.people.has(world.focusId) ? [[world.focusId, 0]] : []);
  const queue = [...steps.keys()];
  for (let at = 0; at < queue.length; at += 1) {
    const person = world.people.get(queue[at]);
    [person.fatherId, person.motherId, ...(kids.get(person.id) || []).map((child) => child.id)].forEach((id) => {
      if (!world.people.has(id) || steps.has(id)) return;
      steps.set(id, steps.get(person.id) + 1);
      queue.push(id);
    });
  }
  const away = (id) => (steps.has(id) ? steps.get(id) : Infinity);
  children.forEach((child) => {
    const [father, mother] = [away(child.fatherId), away(child.motherId)];
    if (father === mother) return;
    child.parentsAsSent = { fatherId: child.fatherId, motherId: child.motherId };
    if (father > mother) child.fatherId = 0;
    else child.motherId = 0;
  });
}

/**
 * Adds a getPeople result to the world and records what is now known.
 * nuclear N → everyone fewer than N steps from the root (Meta.Degrees) has all
 * their parents, siblings, spouses and children loaded. Or, for the plain
 * kinds of fetch:
 * descendants N → the children of everyone fewer than N generations below the
 * root; ancestors N → the parents of everyone fewer than N generations above
 * it; siblings → the children of those ancestors (each line person's siblings).
 */
export function mergeWorldPeople(world, people, { root, nuclear = 0, ancestors = 0, descendants = 0, siblings = false } = {}) {
  const incoming = withUniqueHiddenIds(world, people);
  replaceCoveredHidden(world, incoming);
  incoming.forEach((person) => {
    const id = Number(person.Id);
    const summary = summarizeWorldPerson(person);
    // (a getPeople "nuclear" can send BioFather as null when it isn't, so one known stays: see bioParentsToCheck)
    const before = world.people.get(id);
    if (before) ["bioFatherId", "bioMotherId"].forEach((field) => (summary[field] = summary[field] || before[field] || 0));
    // (it can send Father and Mother as null too, where 0 means none recorded, so one known stays: see parentsToCheck)
    const sentBefore = before?.raisedBy || before;
    if (sentBefore) {
      if (person.Father === null) summary.fatherId = sentBefore.fatherId;
      if (person.Mother === null) summary.motherId = sentBefore.motherId;
    }
    if (before?.parentsUnsent || person.Father === null || person.Mother === null) summary.parentsUnsent = true;
    world.people.set(id, summary);
    const degrees = Number(person.Meta?.Degrees);
    // (nothing more can be fetched around a profile WikiTree won't show)
    if (id < 0 || (nuclear > 0 && Number.isFinite(degrees) && degrees < nuclear)) {
      world.childrenKnown.add(id);
      world.parentsKnown.add(id);
      if (id < 0) world.tried.add(id);
    }
  });
  dropUnlinkedHidden(world);
  const rootPerson = findPerson(world, root ?? world.focusKey);
  if (!world.focusId) {
    const focus = findPerson(world, world.focusKey);
    if (focus) world.focusId = focus.id;
  }
  showChosenParents(world);
  dropHiddenMarriages(world, incoming);
  if (!rootPerson) return world;
  world.tried.add(rootPerson.id);
  if (descendants > 0) {
    const kids = childrenIndex(world);
    let level = [rootPerson];
    for (let depth = 0; depth < descendants && level.length; depth += 1) {
      const next = [];
      level.forEach((person) => {
        world.childrenKnown.add(person.id);
        next.push(...(kids.get(person.id) || []));
      });
      level = next;
    }
  }
  if (ancestors > 0) {
    let level = [rootPerson];
    for (let generation = 0; generation < ancestors && level.length; generation += 1) {
      const next = [];
      level.forEach((person) => {
        world.parentsKnown.add(person.id);
        [person.fatherId, person.motherId].forEach((parentId) => {
          const parent = world.people.get(parentId);
          if (!parent) return;
          if (siblings) world.childrenKnown.add(parent.id);
          next.push(parent);
        });
      });
      level = next;
    }
  }
  return world;
}


const marriageKey = (x, y) => `m${Math.min(x, y)}-${Math.max(x, y)}`;
