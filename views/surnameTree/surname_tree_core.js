/*
Created By: Azure Robinson (Robinson-27225)
*/

// The pure parts of the Surname Tree feature: counting surnames, the shape of the tree, and the word cloud layout.
// Nothing here touches the page, so it can be tested on its own. Sizes are in "logical pixels" on a WIDTH x HEIGHT canvas.

export const WIDTH = 1000;
export const HEIGHT = 880;
export const CELL = 4; // the layout grid is CELL logical pixels per cell

/** Capital letters are about this tall compared with the font size; the layout reserves a box of this height. */
const CAP_HEIGHT = 0.8;

/** Surname values that stand for "nobody", so they are not drawn. */
const NOT_A_SURNAME = /^(unknown|unk|unknown-?\d*|private|private-?\d*|\?+|-+|n\/?a|none|\(.*\))$/i;

/** The surname a person is counted under: the one they were born with (or the current one when that is missing), in capitals. "" if none. */
export function surnameOf(person) {
    const raw = String((person && (person.LastNameAtBirth || person.LastNameCurrent)) || "")
        .replace(/\s+/g, " ")
        .trim();
    return !raw || NOT_A_SURNAME.test(raw) ? "" : raw.toLocaleUpperCase();
}

/**
 * What the tree is made of. Surnames are one name each. First names and middle names are fields that can hold several
 * names with spaces between ("Mary Ann"), and each of those is counted on its own.
 */
export const NAME_KINDS = [
    {
        id: "surname",
        name: "Surnames",
        noun: "surname",
        nouns: "surnames",
        title: "Surname Tree",
        file: "surname-tree",
    },
    {
        id: "first",
        name: "First names",
        noun: "first name",
        nouns: "first names",
        title: "First Name Tree",
        file: "first-name-tree",
    },
    {
        id: "middle",
        name: "Middle names",
        noun: "middle name",
        nouns: "middle names",
        title: "Middle Name Tree",
        file: "middle-name-tree",
    },
    {
        id: "given",
        name: "First and middle names",
        noun: "given name",
        nouns: "given names",
        title: "Given Name Tree",
        file: "given-name-tree",
    },
];

export const kindById = (id) => NAME_KINDS.find((k) => k.id === id) || NAME_KINDS[0];

/** Punctuation round a name that is not part of it: "(Ann)," or "J." */
const EDGE_PUNCTUATION = /^[\s.,;:!?()[\]{}"'\u2018\u2019\u201c\u201d]+|[\s.,;:!?()[\]{}"'\u2018\u2019\u201c\u201d]+$/g;

/**
 * The separate names in a field, in capitals: it is split wherever there is a space, so "Mary Ann" is MARY and ANN, and
 * "Mary-Ann" (no space) stays one name. Initials (a single letter, as in "J." or "J") and values that stand for nobody
 * ("Unknown", "Private") are left out. A name that appears twice in the field is listed once.
 */
export function splitNames(field) {
    const names = [];
    String(field || "")
        .split(/\s+/)
        .forEach((token) => {
            const name = token.replace(EDGE_PUNCTUATION, "");
            if (name.length < 2 || NOT_A_SURNAME.test(name)) return;
            const upper = name.toLocaleUpperCase();
            if (!names.includes(upper)) names.push(upper);
        });
    return names;
}

/** The names a person is counted under for this kind of tree, each once: a person with two first names is in both. */
export function namesOf(person, kind = "surname") {
    if (!person) return [];
    if (kind === "surname") {
        const surname = surnameOf(person);
        return surname ? [surname] : [];
    }
    const fields =
        kind === "first"
            ? [person.FirstName]
            : kind === "middle"
              ? [person.MiddleName]
              : [person.FirstName, person.MiddleName];
    const names = [];
    fields.forEach((field) => splitNames(field).forEach((name) => names.includes(name) || names.push(name)));
    return names;
}

/**
 * Group entries ({ person, bio, adopt }) by name, for surnames, first names, middle names or both given names. Returns
 * [{ text, count, entries }], most common first, ties alphabetical. A person counts once for each of their names.
 */
export function groupNames(entries, kind = "surname") {
    const groups = new Map();
    (Array.isArray(entries) ? entries : []).forEach((entry) => {
        namesOf(entry && entry.person, kind).forEach((text) => {
            if (!groups.has(text)) groups.set(text, []);
            groups.get(text).push(entry);
        });
    });
    return [...groups]
        .map(([text, list]) => ({ text, count: list.length, entries: list }))
        .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

/** The same, for surnames. */
export const groupSurnames = (entries) => groupNames(entries, "surname");

/** Count the surnames in a list of people from the API: [{ text, count }], most common first. */
export function countSurnames(people) {
    return groupSurnames((Array.isArray(people) ? people : []).map((person) => ({ person }))).map(
        ({ text, count }) => ({
            text,
            count,
        })
    );
}

/**
 * How far the tree reaches. "Ancestors" goes back by generations; "CC7" is everyone connected within a number of degrees
 * (parents, children, siblings and spouses each one degree). min and max bound the + and - buttons (the API's own limit
 * for degrees is 10).
 */
export const SCOPES = [
    {
        id: "ancestors",
        name: "Ancestors",
        hint: "parents, grandparents and so on back through the generations",
        unit: "generation",
        units: "generations",
        min: 2,
        max: 12,
        start: 8,
    },
    {
        id: "cc7",
        name: "CC7 (everyone nearby)",
        hint: "everyone connected within a number of degrees: parents, children, siblings and spouses each count as one",
        unit: "degree",
        units: "degrees",
        min: 1,
        max: 10,
        start: 7,
    },
];

export const scopeById = (id) => SCOPES.find((s) => s.id === id) || SCOPES[0];

/** WikiTree's `DataStatus.Father` / `DataStatus.Mother` value for a parent who is not the birth parent. */
const NON_BIOLOGICAL = 5;

/** A real profile id: a positive number. Zero, null and negative placeholders (private) are not. */
const realId = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
};

const isNonBiological = (person, field) =>
    Number(person && person.DataStatus && person.DataStatus[field]) === NON_BIOLOGICAL;

/**
 * The links from a person up to their parents: [{ id, adoptive }]. The parent shown on the profile is an adoptive (or
 * step or foster) parent when it is marked non-biological, and then BioFather / BioMother, when present, name the birth
 * parent as well. A shown parent that is not marked non-biological is the birth parent.
 */
export function parentEdges(person) {
    if (!person) return [];
    const edges = [];
    [
        ["Father", "BioFather"],
        ["Mother", "BioMother"],
    ].forEach(([shownField, bioField]) => {
        const shown = realId(person[shownField]);
        const bio = realId(person[bioField]);
        const shownIsAdoptive = isNonBiological(person, shownField);
        if (bio) edges.push({ id: bio, adoptive: false });
        if (shown && shown !== bio) edges.push({ id: shown, adoptive: shownIsAdoptive });
    });
    return edges;
}

/** A person's own id as a number. */
export const idOf = (person) => realId(person && person.Id);

/**
 * Which of the two kinds of connection reach each person from the root, within `maxSteps` steps. "Biological" means a
 * path of birth links only; "adoptive" means a path with at least one adoptive link in it (after which any link may
 * follow, since the adoptive parent's own parents are the adopted person's family too), that does not come back to the
 * root. Marriages count as neither, so
 * they keep whichever kind the path already was. Returns Map id -> { bio, adopt }.
 *
 * `neighbours(id)` gives [{ id, adoptive }] for the links out of a person.
 */
export function reachFrom(rootId, maxSteps, neighbours) {
    const reach = new Map();
    const seen = new Set([`${rootId}|false`]);
    let frontier = [{ id: rootId, adoptive: false }];
    for (let step = 0; frontier.length; step++) {
        markReach(reach, frontier);
        if (step >= maxSteps) break;
        frontier = nextFrontier(frontier, seen, neighbours, rootId);
    }
    return reach;
}

/** Record in `reach` that these people ({ id, adoptive }) were reached, by a birth path or an adoptive one. */
export function markReach(reach, frontier) {
    frontier.forEach(({ id, adoptive }) => {
        const mark = reach.get(id) || { bio: false, adopt: false };
        if (adoptive) mark.adopt = true;
        else mark.bio = true;
        reach.set(id, mark);
    });
}

/**
 * The people one more step out from `frontier`, skipping any already reached the same way (`seen` remembers them).
 * A path through an adoptive link may not come back to the root: that would lead out along the root's own birth
 * relatives and make them adoptive family too.
 */
export function nextFrontier(frontier, seen, neighbours, rootId) {
    const next = [];
    frontier.forEach(({ id, adoptive }) => {
        neighbours(id).forEach((edge) => {
            const flag = adoptive || edge.adoptive;
            if (flag && edge.id === rootId) return;
            const key = `${edge.id}|${flag}`;
            if (seen.has(key)) return;
            seen.add(key);
            next.push({ id: edge.id, adoptive: flag });
        });
    });
    return next;
}

/**
 * Everyone within `degrees` of the root, from a list of profiles that already holds them all (the API's CC7 answer):
 * a graph of parent, child, sibling and spouse links, searched with reachFrom. Siblings are a link of their own: an
 * adoptive one if either child was adopted by the shared parent. Returns Map id -> { bio, adopt }.
 */
export function reachNearby(people, rootId, degrees) {
    const byId = new Map();
    people.forEach((person) => idOf(person) && byId.set(idOf(person), person));
    const links = new Map();
    const link = (from, to, adoptive) => {
        if (!byId.has(from) || !byId.has(to) || from === to) return;
        if (!links.has(from)) links.set(from, []);
        links.get(from).push({ id: to, adoptive });
    };
    const children = new Map(); // parent id -> [{ id: child id, adoptive }]
    byId.forEach((person, id) => {
        parentEdges(person).forEach((edge) => {
            link(id, edge.id, edge.adoptive);
            link(edge.id, id, edge.adoptive);
            if (!children.has(edge.id)) children.set(edge.id, []);
            children.get(edge.id).push({ id, adoptive: edge.adoptive });
        });
        const spouses = person.Spouses;
        const spouseIds = Array.isArray(spouses)
            ? spouses.map((s) => realId(s && s.Id))
            : Object.entries(spouses || {}).map(([key, value]) => realId((value && value.Id) || key));
        spouseIds.forEach((spouseId) => {
            link(id, spouseId, false);
            link(spouseId, id, false);
        });
    });
    children.forEach((kids) => {
        for (let i = 0; i < kids.length; i++) {
            for (let j = i + 1; j < kids.length; j++) {
                const adoptive = kids[i].adoptive || kids[j].adoptive;
                link(kids[i].id, kids[j].id, adoptive);
                link(kids[j].id, kids[i].id, adoptive);
            }
        }
    });
    return reachFrom(rootId, degrees, (id) => links.get(id) || []);
}

/** Entries ({ person, bio, adopt }) for the people a reach map holds. */
export function entriesFromReach(reach, byId) {
    const entries = [];
    reach.forEach((mark, id) => {
        const person = byId.get(id);
        if (person) entries.push({ person, bio: mark.bio, adopt: mark.adopt });
    });
    return entries;
}

/** The entries to show for the Biological and Adoptive tick boxes. */
export function chooseByRelation(entries, { biological = true, adoptive = true } = {}) {
    return (entries || []).filter((e) => (biological && e.bio) || (adoptive && e.adopt));
}

/** "adoptive" for someone who is family only through an adoption; "" otherwise. */
export const relationNote = (entry) => (entry && entry.adopt && !entry.bio ? "adoptive" : "");

// ---------------------------------------------------------------------------------------------
// Showing people
// ---------------------------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "1901-08-02" as "2 Aug 1901"; "1901-08-00" as "Aug 1901"; "1901-00-00" as "1901"; nothing known as "". */
export function formatDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match || match[1] === "0000") return "";
    const [, year, month, day] = match;
    const monthName = MONTHS[Number(month) - 1];
    if (!monthName) return year;
    return Number(day) ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
}

/** A person's full name: WikiTree's LongName when the API gave it, otherwise built from the parts. */
export function fullName(person) {
    if (!person) return "";
    const long = String(person.LongName || "")
        .replace(/\s+/g, " ")
        .trim();
    if (long) return long;
    const built = [
        person.FirstName || person.RealName,
        person.MiddleName,
        person.LastNameAtBirth || person.LastNameCurrent,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
    return built || person.Name || "";
}

/** "2 Aug 1901, Caledonia, Missouri": the date and the place, whichever are known. */
export const lifeEvent = (date, place) => [formatDate(date), String(place || "").trim()].filter(Boolean).join(", ");

/** A sort key for a person's list order: birth year, with unknown years last. */
export function birthYear(person) {
    const m = String((person && person.BirthDate) || "").match(/^(\d{4})/);
    return m && m[1] !== "0000" ? Number(m[1]) : 9999;
}

/** A small seeded random number generator, so the same profile gives the same tree until "Shuffle" is pressed. */
export function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A number from a string, for seeding. */
export function hashString(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// ---------------------------------------------------------------------------------------------
// The shape
// ---------------------------------------------------------------------------------------------

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const lerp = (a, b, t) => a + (b - a) * t;

/** A rough crown, like the rounded dome of an oak or a maple: lobes of leaves. buildTree bends, resizes and adds to these so no two trees match. */
const CROWN_TEMPLATE = [
    [500, 265, 220],
    [315, 320, 175],
    [690, 320, 178],
    [190, 415, 138],
    [815, 412, 140],
    [395, 255, 152],
    [610, 245, 152],
    [385, 420, 138],
    [630, 418, 138],
    [500, 410, 148],
    [260, 275, 112],
    [745, 275, 114],
];

/** Points along a cubic Bezier curve. */
function bezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
}

/**
 * A limb as a chain of circles along a curve, thick at the start and tapering to the tip. Circles overlap enough to
 * look like a smooth tapered stroke, and the whole limb is the union of its circles.
 */
function limb(p0, p1, p2, p3, startRadius, endRadius, taper = 1) {
    const circles = [];
    let t = 0;
    while (t <= 1) {
        const [x, y] = bezier(p0, p1, p2, p3, t);
        const r = lerp(startRadius, endRadius, Math.pow(t, taper));
        circles.push({ x, y, r });
        t += Math.max(0.01, (r * 0.4) / 340);
    }
    const [x, y] = p3;
    circles.push({ x, y, r: endRadius });
    return circles;
}

/** Whether two circles overlap well enough to look like one mass (a fraction `slack` of the smaller one's radius). */
export const touching = (a, b, slack = 0.3) =>
    Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - slack * Math.min(a.r, b.r);

/**
 * Make a set of circles one connected mass: starting from the biggest, the circle nearest to what is joined so far is
 * moved in until it overlaps it, and so on. So no clump of leaves is left floating apart from the rest of the crown.
 */
export function joinUp(circles) {
    if (circles.length < 2) return circles;
    const biggest = circles.reduce((a, b) => (b.r > a.r ? b : a));
    const joined = [biggest];
    let rest = circles.filter((c) => c !== biggest);
    while (rest.length) {
        let best = null;
        rest.forEach((c) =>
            joined.forEach((j) => {
                const gap = Math.hypot(c.x - j.x, c.y - j.y) - (c.r + j.r - 0.4 * Math.min(c.r, j.r));
                if (!best || gap < best.gap) best = { c, j, gap };
            })
        );
        if (best.gap > 0) {
            const distance = Math.hypot(best.c.x - best.j.x, best.c.y - best.j.y) || 1;
            best.c.x += ((best.j.x - best.c.x) * best.gap) / distance;
            best.c.y += ((best.j.y - best.c.y) * best.gap) / distance;
        }
        joined.push(best.c);
        rest = rest.filter((c) => c !== best.c);
    }
    return circles;
}

/**
 * How lopsided a crown is about the vertical line `axis` (where the trunk stands): the difference between the leaf area of
 * its two sides (0 is even, 1 is all on one side), how far the middle of its leaves is from the axis, how far the middle
 * of its width is from the axis, and how much higher the leaves on one side sit than on the other. A real tree is not
 * symmetrical, but it is balanced over its trunk.
 */
export function crownBalance(crown, axis = 500) {
    let left = 0;
    let right = 0;
    let sumX = 0;
    let leftY = 0;
    let rightY = 0;
    let lo = Infinity;
    let hi = -Infinity;
    crown.forEach((c) => {
        const area = c.r * c.r;
        sumX += c.x * area;
        if (c.x < axis) {
            left += area;
            leftY += c.y * area;
        } else {
            right += area;
            rightY += c.y * area;
        }
        lo = Math.min(lo, c.x - c.r);
        hi = Math.max(hi, c.x + c.r);
    });
    const total = left + right || 1;
    return {
        mass: Math.abs(left - right) / total,
        offset: Math.abs(sumX / total - axis),
        reach: Math.abs((lo + hi) / 2 - axis),
        height: Math.abs(leftY / (left || 1) - rightY / (right || 1)),
    };
}

/** One number for how lopsided a crown is (0 is perfect): the measures of crownBalance, each against what would be noticed. */
function lopsidedness(crown, axis) {
    const { mass, offset, reach, height } = crownBalance(crown, axis);
    return mass / 0.06 + offset / 12 + reach / 12 + height / 15;
}

/**
 * Balance a crown over the line `axis`, in place: even out the leaf area of its two sides by growing the lighter side's
 * clumps and shrinking the heavier side's, bring the two sides to the same height, and centre it on the axis. The outline
 * stays uneven, but the tree does not lean or droop to one side. `settle` keeps the clumps in the picture and joined, in
 * place. Each round is judged by how lopsided the crown then is, and the best one is kept.
 */
function balanceCrown(crown, axis, settle) {
    const centre = () => {
        // halfway between the middle of its width and the middle of its leaves, moving every clump the same way
        const lo = Math.min(...crown.map((c) => c.x - c.r));
        const hi = Math.max(...crown.map((c) => c.x + c.r));
        const leaves = crown.reduce((sum, c) => sum + c.r * c.r, 0);
        const middleOfLeaves = crown.reduce((sum, c) => sum + c.x * c.r * c.r, 0) / leaves;
        const slide = axis - ((lo + hi) / 2 + middleOfLeaves) / 2;
        crown.forEach((c) => (c.x += slide));
    };
    let best = { score: lopsidedness(crown, axis), state: crown.map((c) => ({ ...c })) };
    for (let round = 0; round < 12; round++) {
        const areas = [0, 0];
        crown.forEach((c) => (areas[c.x < axis ? 0 : 1] += c.r * c.r));
        const target = (areas[0] + areas[1]) / 2;
        crown.forEach((c) => {
            const grow = Math.sqrt(target / (areas[c.x < axis ? 0 : 1] || 1));
            c.r *= 1 + 0.8 * (grow - 1);
        });

        const heights = [0, 0];
        const weights = [0, 0];
        crown.forEach((c) => {
            const side = c.x < axis ? 0 : 1;
            heights[side] += c.y * c.r * c.r;
            weights[side] += c.r * c.r;
        });
        const gap = heights[0] / (weights[0] || 1) - heights[1] / (weights[1] || 1);
        crown.forEach((c) => (c.y += (c.x < axis ? -gap : gap) * 0.45));

        settle();
        centre();
        const score = lopsidedness(crown, axis);
        if (score < best.score) best = { score, state: crown.map((c) => ({ ...c })) };
        if (score < 1.2) break;
    }
    crown.forEach((c, i) => Object.assign(c, best.state[i]));
}

/** No clump of leaves is smaller than this: small circles on the outline look like stray bubbles, not leaves. */
const MIN_CLUMP = 85;

/** The lowest the leaves come, and the ground the trunk stands on. */
const CROWN_BOTTOM = 650;
export const GROUND = { x: 500, y: 878, rx: 400, ry: 30 };

/**
 * A tree that is different for each seed, like an oak: a broad, rounded crown of leafy lobes of uneven size and tint,
 * all joined into one mass; a short, stout trunk that flares at the
 * base into roots spreading over the ground; and thick limbs forking from the top of the trunk, each running up into a
 * clump of leaves, with a branch off most of them that ends in the leaves too, so nothing hangs loose.
 * Returns { crown: [{ x, y, r, hue, light }], trunk: [{ x, y, r }], spine, tips, axis, seed }, where axis is the line the trunk
 * stands on and the crown is balanced over, spine is the trunk's own
 * circles from the ground up (the limbs and roots follow them in trunk), and tips are the points where limbs and
 * branches end, inside the crown.
 */
export function buildTree(seed = 1) {
    const random = seededRandom((seed >>> 0) ^ 0x9e3779b9);
    const between = (lo, hi) => lo + random() * (hi - lo);

    // ---- the crown, built round the line the trunk stands on
    const axis = 500 + between(-25, 25);
    const lean = between(-1, 1); // a slight tilt, which side is a little lower
    const widthLeft = between(0.95, 1.05);
    const widthRight = between(0.95, 1.05);
    const fit = (c) => {
        const r = clamp(c.r, MIN_CLUMP, 235);
        return { ...c, r, x: clamp(c.x, 8 + r, 992 - r), y: clamp(c.y, 8 + r, CROWN_BOTTOM - r) };
    };
    const body = CROWN_TEMPLATE.map(([x, y, r]) => {
        const spread = x < 500 ? widthLeft : widthRight;
        return fit({
            x: axis + (x - 500) * spread + between(-28, 28),
            y: y + between(-26, 26) + lean * (x - 500) * 0.03,
            r: r * between(0.86, 1.14),
        });
    });
    // now and then a lobe is missing, so the outline is not the same each time
    if (random() < 0.5) body.splice(1 + Math.floor(random() * 6), 1);
    const crown = body.map((c) => ({ ...c, hue: between(100, 140), light: random() })); // each clump its own green
    // joined into one mass and kept inside the picture, so no clump floats apart (in place, so the crown stays the same list)
    const settle = () => {
        for (let pass = 0; pass < 3; pass++) {
            joinUp(crown);
            crown.forEach((c) => Object.assign(c, fit(c)));
        }
    };
    settle();
    // and balanced over the trunk: uneven in outline, but not leaning or drooping to one side
    balanceCrown(crown, axis, settle);
    // drawn from the top down, so lower clumps overlap the ones above them
    crown.sort((a, b) => a.y + a.r - (b.y + b.r));
    // the lobes as they now are, after balancing (the limbs go to these)
    const lobes = crown;

    // the trunk stands under the middle of the crown as it has ended up: halfway between the middle of its width and of its leaves
    const leafArea = crown.reduce((sum, c) => sum + c.r * c.r, 0);
    const middleOfLeaves = crown.reduce((sum, c) => sum + c.x * c.r * c.r, 0) / leafArea;
    const middleOfWidth = (Math.min(...crown.map((c) => c.x - c.r)) + Math.max(...crown.map((c) => c.x + c.r))) / 2;
    const trunkAxis = (middleOfLeaves + middleOfWidth) / 2;

    // ---- the trunk: short, stout, widest at the ground
    const lowest = Math.max(...lobes.map((c) => c.y + c.r));
    const baseX = trunkAxis + between(-14, 14);
    const base = [baseX, 872];
    const fork = [trunkAxis + between(-22, 22) + lean * 6, clamp(lowest - between(30, 100), 470, 610)];
    // the trunk divides inside the leaves; if that point fell in a gap, move it into the nearest clump
    if (!crown.some((c) => Math.hypot(fork[0] - c.x, fork[1] - c.y) < c.r - 10)) {
        const near = crown.reduce((a, b) =>
            Math.hypot(fork[0] - b.x, fork[1] - b.y) - b.r < Math.hypot(fork[0] - a.x, fork[1] - a.y) - a.r ? b : a
        );
        const distance = Math.hypot(fork[0] - near.x, fork[1] - near.y) || 1;
        fork[0] = near.x + ((fork[0] - near.x) / distance) * near.r * 0.5;
        fork[1] = near.y + ((fork[1] - near.y) / distance) * near.r * 0.5;
    }
    const sway = between(10, 32) * (random() < 0.5 ? -1 : 1);
    const rise = base[1] - fork[1];
    const trunk = limb(
        base,
        [baseX + sway, base[1] - rise * 0.35],
        [fork[0] - sway * 0.6, base[1] - rise * 0.7],
        fork,
        between(100, 124),
        between(60, 72),
        0.45 // the radius drops quickly at first: the flare at the foot
    );
    const spine = trunk.slice();

    // roots spreading over the ground, thick where they leave the trunk and thinning as they go
    const rootCount = 4 + Math.floor(random() * 3);
    for (let i = 0; i < rootCount; i++) {
        const side = i % 2 ? 1 : -1;
        // the first two reach well past the foot of the trunk, so they show; the others are shorter
        const footRadius = spine[0].r;
        const reach = footRadius * (i < 2 ? between(1.4, 2.5) : between(1.15, 1.7));
        const start = [baseX + side * between(25, 60), base[1] - between(70, 120)];
        const end = [clamp(baseX + side * reach, 60, 940), 862 + between(-8, 2)];
        trunk.push(
            ...limb(
                start,
                [start[0] + side * between(30, 70), start[1] + between(0, 30)],
                [end[0] - side * between(40, 90), end[1] - between(25, 55)],
                end,
                between(40, 54),
                between(8, 13),
                0.7
            )
        );
    }

    // ---- the central leader, and limbs that leave the trunk at different heights and end in clumps of leaves
    const tips = [];
    const limbs = [];

    // Apical dominance: the main stem does not stop where the limbs begin. It goes on up through the crown, thinning as it goes.
    const crownTop = Math.min(...lobes.map((c) => c.y - c.r));
    const leaderTop = [fork[0] + between(-25, 25), lerp(fork[1], crownTop, between(0.45, 0.62))];
    if (!crown.some((c) => Math.hypot(leaderTop[0] - c.x, leaderTop[1] - c.y) < c.r - 10)) {
        // it must end inside the leaves: move it into the lobe nearest to where it was going
        const near = crown.reduce((a, b) =>
            Math.hypot(leaderTop[0] - b.x, leaderTop[1] - b.y) - b.r <
            Math.hypot(leaderTop[0] - a.x, leaderTop[1] - a.y) - a.r
                ? b
                : a
        );
        leaderTop[0] = near.x;
        leaderTop[1] = near.y;
    }
    const leaderRise = fork[1] - leaderTop[1];
    trunk.push(
        ...limb(
            fork,
            [fork[0] + between(-20, 20), fork[1] - leaderRise * 0.35],
            [leaderTop[0] + between(-20, 20), leaderTop[1] + leaderRise * 0.3],
            leaderTop,
            spine[spine.length - 1].r * 0.85,
            between(10, 15),
            0.9
        )
    );
    tips.push({ x: leaderTop[0], y: leaderTop[1] });

    // Side limbs leave the upper trunk one after another, alternating left and right as leaves do on a twig. The lowest is the
    // longest and runs nearly level, as an oak's heavy lower limbs do (it grows reaction wood on its underside to hold itself
    // up); the ones above are shorter. Each bends upward at its end, towards the light.
    const lower = lobes.filter((c) => c.y + c.r > lowest - 240);
    const limbCount = Math.min(lower.length, random() < 0.4 ? 4 : 3);
    const used = new Set();
    let side = random() < 0.5 ? -1 : 1;
    for (let i = 0; i < limbCount; i++, side = -side) {
        // where it leaves the trunk: the lowest first, each one higher up
        const along = lerp(0.58, 0.97, limbCount === 1 ? 0 : i / (limbCount - 1));
        const start = spine[Math.round(along * (spine.length - 1))];
        // its target: of the clumps on its side, the one that reaches furthest out; failing that, any that is left
        const free = lower.filter((c) => !used.has(c));
        const onSide = free
            .filter((c) => (c.x - trunkAxis) * side > 0)
            .sort((a, b) => Math.abs(b.x - trunkAxis) - Math.abs(a.x - trunkAxis));
        const target = (
            onSide.length ? onSide : free.sort((a, b) => Math.abs(b.x - trunkAxis) - Math.abs(a.x - trunkAxis))
        )[0];
        used.add(target);
        // the tip is well inside the clump, so the limb is hidden in the leaves where it ends
        const tip = [target.x + between(-0.3, 0.3) * target.r, target.y + between(-0.2, 0.35) * target.r];
        const dx = tip[0] - start.x;
        const thisLimb = limb(
            [start.x, start.y],
            [start.x + dx * between(0.4, 0.55), start.y + between(-30, 5)], // going out nearly level
            [tip[0] - dx * between(0.1, 0.25), tip[1] + between(45, 100)], // and coming up into the tip
            tip,
            Math.min(start.r * 0.7, between(32, 42)),
            between(8, 12),
            between(0.6, 1)
        );
        trunk.push(...thisLimb);
        tips.push({ x: tip[0], y: tip[1] });
        limbs.push({ side, start: { x: start.x, y: start.y }, tip: { x: tip[0], y: tip[1] } });
        // a branch off most limbs, forking away and growing up into the leaves
        if (random() < 0.85) {
            const at = thisLimb[Math.floor(thisLimb.length * between(0.35, 0.7))];
            const near = lobes.filter((c) => Math.hypot(c.x - at.x, c.y - at.y) < 360 && c !== target);
            if (near.length) {
                const goal = near[Math.floor(random() * near.length)];
                const end = [goal.x + between(-0.35, 0.35) * goal.r, goal.y + between(-0.35, 0.35) * goal.r];
                const away = end[0] > at.x ? 1 : -1;
                trunk.push(
                    ...limb(
                        [at.x, at.y],
                        [at.x + away * between(5, 25), at.y - between(20, 60)],
                        [end[0] - away * between(10, 40), end[1] + between(20, 60)],
                        end,
                        at.r * 0.75,
                        5,
                        0.9
                    )
                );
                tips.push({ x: end[0], y: end[1] });
            }
        }
    }
    return { crown, trunk, spine, tips, limbs, leaderTop: { x: leaderTop[0], y: leaderTop[1] }, axis: trunkAxis, seed };
}

/**
 * Lines of bark: ridges running up the trunk, as polylines [[x, y], ...]. Each follows the trunk's spine at a place across
 * its width, wobbling a little, and covers part of its height. Drawn faintly over the trunk, they give it the grain of oak.
 */
export function barkLines(tree) {
    const spine = tree.spine || [];
    if (spine.length < 4) return [];
    const random = seededRandom(((tree.seed || 1) >>> 0) ^ 0x51ed270b);
    const between = (lo, hi) => lo + random() * (hi - lo);
    const lines = [];
    const count = 10 + Math.floor(random() * 6);
    for (let i = 0; i < count; i++) {
        const across = lerp(-0.86, 0.86, (i + random() * 0.7) / count); // -1 is the left edge, 1 the right
        const length = between(0.22, 0.6);
        const from = random() * (1 - length);
        const points = [];
        for (let k = 0; k <= 12; k++) {
            const t = from + (length * k) / 12;
            const c = spine[Math.round(t * (spine.length - 1))];
            points.push([c.x + (across + Math.sin(t * 11 + i * 1.7) * 0.05) * c.r, c.y]);
        }
        lines.push(points);
    }
    return lines;
}

/** Rasterize circles into a mask of grid cells. */
function paintCircles(mask, cols, rows, circles, skip) {
    circles.forEach(({ x, y, r }) => {
        const row0 = Math.max(0, Math.floor((y - r) / CELL));
        const row1 = Math.min(rows - 1, Math.ceil((y + r) / CELL));
        const col0 = Math.max(0, Math.floor((x - r) / CELL));
        const col1 = Math.min(cols - 1, Math.ceil((x + r) / CELL));
        for (let row = row0; row <= row1; row++) {
            for (let col = col0; col <= col1; col++) {
                const dx = (col + 0.5) * CELL - x;
                const dy = (row + 0.5) * CELL - y;
                if (dx * dx + dy * dy <= r * r && !(skip && skip[row * cols + col])) mask[row * cols + col] = 1;
            }
        }
    });
}

const DEFAULT_TREE_SEED = 1;
/** Words stop above this line, where the ground begins. */
const GROUND_TEXT_LIMIT = 856;

/** Which cells of the layout grid are inside the crown, and inside the trunk and limbs (the part the crown does not cover). */
export function buildMasks(tree = buildTree(DEFAULT_TREE_SEED)) {
    const cols = Math.ceil(WIDTH / CELL);
    const rows = Math.ceil(HEIGHT / CELL);
    const crown = new Uint8Array(cols * rows);
    const trunk = new Uint8Array(cols * rows);
    paintCircles(crown, cols, rows, tree.crown);
    paintCircles(trunk, cols, rows, tree.trunk, crown);
    // no words on the strip of ground the trunk stands in
    for (let row = Math.floor(GROUND_TEXT_LIMIT / CELL); row < rows; row++) trunk.fill(0, row * cols, (row + 1) * cols);
    return { cols, rows, crown, trunk };
}

// ---------------------------------------------------------------------------------------------
// The wide banner: the whole area filled with names, for a profile's background
// ---------------------------------------------------------------------------------------------

/** The banner's size when saved at full size, in pixels. WikiTree has no set size; this is wide enough not to repeat on most screens. */
export const BANNER_PIXELS = { width: 2560, height: 400 };
/** The banner's frame in logical pixels: as wide as the tree's, and as tall as the banner's shape. */
export const BANNER_FRAME = {
    x: 0,
    y: 0,
    w: WIDTH,
    h: (WIDTH * BANNER_PIXELS.height) / BANNER_PIXELS.width, // 156.25: the same shape as 2560 x 400
};
/** The largest and smallest the words are in the banner, in logical pixels (the tree's are bigger, as it is much taller). */
export const BANNER_FONTS = { maxFont: 40, minFont: 12 };
export const DEFAULT_BANNER_BACKGROUND = "#e9f4e1";
export const DEFAULT_BANNER_WORD = "#2e6b2a";

/** The part of the drawing that is shown: the whole frame for a tree or a picture's shape, the banner's frame for a banner. */
export const frameOf = (shape) => (shape && shape.bounds) || { x: 0, y: 0, w: WIDTH, h: HEIGHT };

/**
 * The banner's shape: every cell of its frame is for words, with no trunk. `background` is the colour behind the words;
 * `wordColor` is one colour for every word, or "" for the greens of the oak's canopy.
 */
export function buildBannerShape({ background = DEFAULT_BANNER_BACKGROUND, wordColor = "" } = {}) {
    const cols = Math.ceil(BANNER_FRAME.w / CELL);
    const rows = Math.ceil(BANNER_FRAME.h / CELL);
    return {
        kind: "banner",
        look: "outlined", // the canopy's own dark greens
        bounds: BANNER_FRAME,
        masks: { cols, rows, crown: new Uint8Array(cols * rows).fill(1), trunk: new Uint8Array(cols * rows) },
        background,
        wordColor,
    };
}

/** The middle of a mask, in cells. */
function centroid(mask, cols) {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let i = 0; i < mask.length; i++) {
        if (mask[i]) {
            sx += i % cols;
            sy += Math.floor(i / cols);
            n++;
        }
    }
    return n ? { col: sx / n, row: sy / n } : { col: 0, row: 0 };
}

// ---------------------------------------------------------------------------------------------
// The layout
// ---------------------------------------------------------------------------------------------

/** The most surnames laid out, and how many in a row may fail to fit before the rest are given up on. */
export const MAX_WORDS = 600;
const MAX_MISSES = 15;
/** The rescue pass for names that found no room: it starts no bigger than RESCUE_START, may go as small as RESCUE_MIN_FONT, and gives up after this many in a row. */
const RESCUE_START = 14;
const RESCUE_MIN_FONT = 6;
const MAX_RESCUE_MISSES = 150;

export const MAX_FONT = 118;
export const MIN_FONT = 10;

/**
 * How the picture looks. "Shaded" is the oak with gradients, a shadow under the leaves, bark, and roots in a patch of
 * ground, and words spaced with a little air round them. "Flat two-tone" is the crisp, silhouette style of word art: solid
 * colours, nothing shaded, and words packed tight, with many more small ones filling the gaps. "Outlined" is the cartoon
 * look of clip art: puffy clusters of leaves and a trunk with dark outlines, and the words packed fairly tight. `gapCells` is the gap
 * left round a word (in layout cells), `minFont` the smallest a word may become, `shrink` how much a word that does not
 * fit is made smaller each try, and fillLimit, fillMisses and fillSize how the small repeats that fill the gaps go.
 */
export const LOOKS = [
    {
        id: "shaded",
        name: "Shaded",
        gapCells: 1.5,
        minFont: MIN_FONT,
        shrink: 0.88,
        fillLimit: 700,
        fillMisses: 25,
        fillSize: [MIN_FONT + 3, MIN_FONT + 12],
    },
    {
        id: "flat",
        name: "Flat two-tone",
        gapCells: 0.9,
        minFont: 7,
        shrink: 0.93,
        fillLimit: 2200,
        fillMisses: 80,
        fillSize: [8, 17],
    },
    {
        id: "outlined",
        name: "Outlined",
        gapCells: 1.1,
        minFont: 8,
        shrink: 0.92,
        fillLimit: 1500,
        fillMisses: 55,
        fillSize: [9, 18],
    },
];

export const lookById = (id) => LOOKS.find((l) => l.id === id) || LOOKS[0];

/** A font size for each count: the most common name is MAX_FONT, the least common near MIN_FONT, eased so the middle is not tiny. */
export function fontSizeFor(count, minCount, maxCount, maxFont = MAX_FONT, minFont = 14) {
    if (maxCount <= minCount) return Math.round((maxFont + minFont) / 2);
    const t = (count - minCount) / (maxCount - minCount);
    return Math.round(minFont + (maxFont - minFont) * Math.pow(t, 0.62));
}

/**
 * The angle, in degrees, to turn a word: clockwise is positive, and never past upright, so nothing is upside down. The
 * first few and the biggest words stay (nearly) level to be easy to read; the rest are level, upright, or at any angle.
 */
export function chooseAngle(random, index, size) {
    if (index === 0) return 0;
    if (index < 3 || size >= 80) return (random() - 0.5) * 24;
    const r = random();
    if (r < 0.38) return 0;
    if (r < 0.5) return random() < 0.5 ? -90 : 90;
    return (random() - 0.5) * 150; // anywhere from -75 to 75
}

/**
 * The cells (as [columns across, rows down] from the cell holding the word's middle) that a w x h box turned by `angle`
 * degrees covers, with `pad` added all round. A cell counts when its middle is inside the box.
 */
export function boxOffsets(w, h, angle, pad) {
    const radians = (angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const halfW = w / 2 + pad;
    const halfH = h / 2 + pad;
    const reach = Math.ceil(Math.hypot(halfW, halfH) / CELL);
    const cells = [];
    for (let dr = -reach; dr <= reach; dr++) {
        for (let dc = -reach; dc <= reach; dc++) {
            const x = dc * CELL;
            const y = dr * CELL;
            // the cell's middle, as seen from the turned box
            if (Math.abs(x * cos + y * sin) <= halfW && Math.abs(-x * sin + y * cos) <= halfH) cells.push([dc, dr]);
        }
    }
    return cells;
}

/** The grid cells a placed word covers (for checking that words stay inside the tree and apart from each other). */
export function wordCells(item) {
    const col = Math.round(item.x / CELL - 0.5);
    const row = Math.round(item.y / CELL - 0.5);
    return boxOffsets(item.w, item.h, item.angle, CELL * 0.5).map(([dc, dr]) => [col + dc, row + dr]);
}

/**
 * Place words inside the tree. Words are tried largest first, each spiralling out from the middle of its part of the tree
 * (the crown or the trunk) until it finds a spot where its turned box is wholly inside that part and clear of every other
 * word. A word that finds no room is made smaller until it fits or reaches the smallest size, then dropped.
 *
 * words:   [{ text, count }], most common first
 * measure: (text, fontSize) => width in logical pixels
 * masks:   from buildMasks(tree), or made from a picture (see surname_tree_image.js)
 * look:    "shaded" or "flat" (see LOOKS): how tightly the words are packed and how small they may become
 * fonts:    { maxFont, minFont } for the biggest and the rarest names, where the shape is not as tall as the tree (the banner)
 * Returns [{ text, count, region: "crown" | "trunk", x, y, size, angle, w, h, rank }] where x, y is the middle of the
 * word, angle its turn in degrees, and w, h the size of its box before turning.
 */
export function layoutWords({
    words,
    measure,
    random = Math.random,
    fillGaps = true,
    masks = buildMasks(),
    look = "shaded",
    fonts = {},
}) {
    const tune = lookById(look);
    const { cols, rows } = masks;
    const regions = {
        crown: { mask: masks.crown, ...centroid(masks.crown, cols), stretchX: 1.5, stretchY: 1 },
        trunk: { mask: masks.trunk, ...centroid(masks.trunk, cols), stretchX: 1.0, stretchY: 1.3 },
    };
    // a shape made from a picture has no trunk: there is nothing to try there
    Object.values(regions).forEach((region) => (region.empty = !region.mask.includes(1)));
    const taken = new Uint8Array(cols * rows);
    const placed = [];

    /** Whether a word whose middle is the cell (col, row) fits: every cell it covers is in the region and free. */
    const fits = (region, col, row, cover) => {
        const mask = region.mask;
        for (let i = 0; i < cover.length; i++) {
            const c = col + cover[i][0];
            const r = row + cover[i][1];
            if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
            const at = r * cols + c;
            if (!mask[at] || taken[at]) return false;
        }
        return true;
    };

    const occupy = (col, row, cover) => {
        cover.forEach(([dc, dr]) => {
            const c = col + dc;
            const r = row + dr;
            if (c >= 0 && r >= 0 && c < cols && r < rows) taken[r * cols + c] = 1;
        });
    };

    /** Spiral out from the region's middle; returns the cell for the word's middle, or null. */
    const findSpot = (region, cover) => {
        const maxIterations = 9000;
        let theta = random() * Math.PI * 2;
        let r = 0;
        for (let i = 0; i < maxIterations; i++) {
            const col = Math.round(region.col + r * Math.cos(theta) * region.stretchX);
            const row = Math.round(region.row + r * Math.sin(theta) * region.stretchY);
            if (fits(region, col, row, cover)) return { col, row };
            theta += 1.6 / Math.max(r, 3);
            r += (3 / (Math.PI * 2)) * (1.6 / Math.max(r, 3));
            if (r > cols) break;
        }
        return null;
    };

    /**
     * For the small words that fill the gaps: try free cells picked from anywhere in the region. A gap is found wherever it
     * is, and when there are none left this gives up quickly, where spiralling out from the middle would search everything.
     */
    const findSpotInGaps = (region, cover) => {
        const pool = region.pool;
        for (let tries = 0; tries < 250 && pool.length; tries++) {
            const at = Math.floor(random() * pool.length);
            const cell = pool[at];
            if (taken[cell]) {
                pool[at] = pool[pool.length - 1]; // no longer free
                pool.pop();
                continue;
            }
            const col = cell % cols;
            const row = (cell - col) / cols;
            if (fits(region, col, row, cover)) return { col, row };
        }
        return null;
    };

    const place = (word, size, regionName, angle, rank, inGaps = false, smallest = tune.minFont) => {
        const region = regions[regionName];
        if (region.empty) return null;
        let fontSize = size;
        while (fontSize >= smallest) {
            const w = measure(word.text, fontSize);
            const h = fontSize * CAP_HEIGHT;
            const cover = boxOffsets(w, h, angle, CELL * 0.5);
            const spot = inGaps ? findSpotInGaps(region, cover) : findSpot(region, cover);
            if (spot) {
                // a gap of one more cell round the word keeps the next one from touching it
                occupy(spot.col, spot.row, boxOffsets(w, h, angle, CELL * tune.gapCells));
                const item = {
                    text: word.text,
                    count: word.count,
                    region: regionName,
                    x: (spot.col + 0.5) * CELL,
                    y: (spot.row + 0.5) * CELL,
                    size: fontSize,
                    angle,
                    w,
                    h,
                    rank,
                };
                placed.push(item);
                return item;
            }
            fontSize = Math.floor(fontSize * tune.shrink);
        }
        return null;
    };

    if (!words.length) return placed;
    const maxCount = words[0].count;
    const minCount = words[words.length - 1].count;

    // Pass one: every surname once, sized by how common it is. Every fifth name from the fourth on goes in the trunk, so
    // the trunk carries some of the larger names too rather than only the leftovers.
    // A big CC7 can have thousands of surnames, most of them one person each. Only the first MAX_WORDS are tried, and
    // trying stops after a run of names that find no room, since the rarer ones that follow would not fit either.
    let misses = 0;
    for (let index = 0; index < Math.min(words.length, MAX_WORDS) && misses < MAX_MISSES; index++) {
        const word = words[index];
        const size = fontSizeFor(word.count, minCount, maxCount, fonts.maxFont, fonts.minFont);
        const regionName = index >= 3 && index % 5 === 4 ? "trunk" : "crown";
        const angle = chooseAngle(random, index, size);
        // if one part of the tree has no room for it, the other may
        const done =
            place(word, size, regionName, angle, index) ||
            place(word, size, regionName === "crown" ? "trunk" : "crown", angle, index);
        misses = done ? 0 : misses + 1;
    }

    // The cells still free, for the passes below to try (see findSpotInGaps)
    Object.values(regions).forEach((region) => {
        region.pool = [];
        for (let cell = 0; cell < region.mask.length; cell++)
            if (region.mask[cell] && !taken[cell]) region.pool.push(cell);
    });

    // Rescue: pass one gives up after a run of names that find no room, and a name may simply not have fitted where the
    // spiral looked. Every name left over gets a second try in the gaps, at any size down to a very small one, so that a
    // surname is left out only when there is truly no room for it.
    const placedWords = new Set(placed.map((item) => item.text));
    let rescueMisses = 0;
    for (let index = 0; index < Math.min(words.length, MAX_WORDS) && rescueMisses < MAX_RESCUE_MISSES; index++) {
        const word = words[index];
        if (placedWords.has(word.text)) continue;
        const size = Math.min(fontSizeFor(word.count, minCount, maxCount, fonts.maxFont, fonts.minFont), RESCUE_START);
        const regionName = random() < 0.8 ? "crown" : "trunk";
        const angle = chooseAngle(random, 99, size);
        const done =
            place(word, size, regionName, angle, index, true, RESCUE_MIN_FONT) ||
            place(word, size, regionName === "crown" ? "trunk" : "crown", angle, index, true, RESCUE_MIN_FONT);
        rescueMisses = done ? 0 : rescueMisses + 1;
        if (done) placedWords.add(word.text);
    }

    // Pass two: if the member wants the tree filled, repeat the names at small sizes until nothing more fits.
    if (fillGaps) {
        let missed = 0;
        let i = 0;
        const limit = tune.fillLimit;
        while (missed < tune.fillMisses && i < limit) {
            const index = i % words.length;
            const word = words[index];
            const size = Math.round(tune.fillSize[0] + random() * (tune.fillSize[1] - tune.fillSize[0]));
            const regionName = random() < 0.8 ? "crown" : "trunk";
            const angle = chooseAngle(random, 99, size);
            const item = place(word, size, regionName, angle, index, true);
            if (!item) {
                const other = place(word, size, regionName === "crown" ? "trunk" : "crown", angle, index, true);
                missed = other ? 0 : missed + 1;
            } else {
                missed = 0;
            }
            i++;
        }
    }
    return placed;
}

// ---------------------------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------------------------

export function hslToHex(h, s, l) {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const channel = (n) => {
        const k = (n + h / 30) % 12;
        const value = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(255 * value)
            .toString(16)
            .padStart(2, "0");
    };
    return `#${channel(0)}${channel(8)}${channel(4)}`;
}

function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (!d) return [0, 0, l * 100];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return [h, s * 100, l * 100];
}

export const COLORS = {
    trunkLight: "#f1e4cd",
    trunkDark: "#cdb48f",
    trunkInner: "#6e4a1e", // the limbs as they show through the leaves
    bark: "#5b3a14", // lines of bark
    groundCentre: "#cfdcb6",
    groundEdge: "#cfdcb6",
    crownShadow: "#2f5d34",
    outline: "#27481f", // the outlined look: the line round each puff of leaves
    trunkOutline: "#4a2e1c",
    crownOutlined: ["#d6ecb8", "#bfe09a"], // light and mid green of a puff of leaves
    trunkOutlined: "#e8c3a6",
    crownWordsOutlined: ["#1d5a1a", "#24661f", "#2c7226", "#1a4f18", "#2f7a2a"],
    trunkWordsOutlined: ["#5d3309", "#6b3a0c", "#4a2a08", "#7a4510"],
    crownFlat: "#d4ecd4", // the flat look: one green for the crown and one tan for the trunk
    trunkFlat: "#e9dbc2",
    crownWords: ["#1f8f2b", "#2ba03a", "#3aaa49", "#52b85a", "#1a7a26", "#6cc274"],
    trunkWords: ["#7a4510", "#8b5a1c", "#6b3a0c", "#9a6a2a", "#5d3309"],
};

/** How strongly a picture used as the shape shows behind the words. */
export const BACKDROP_OPACITY = 0.22;

/** How strongly the bark lines, the shadow under the leaves, and the ground patch show. */
export const BARK_OPACITY = 0.3;
export const CROWN_SHADOW_OPACITY = 0.28;
export const CROWN_SHADOW_OFFSET = [6, 13];
export const GROUND_OPACITY = 0.85;

/** How strongly the limbs show through the leaves. */
export const INNER_BRANCH_OPACITY = 0.2;

/** The two greens of a clump of leaves: lit at its upper left, shadowed towards the lower right. */
export function crownColors(lobe) {
    const lift = lobe.light * 6;
    return {
        lit: hslToHex(lobe.hue, 54, 94 - lift * 0.5),
        shade: hslToHex(lobe.hue + 6, 48, 74 - lift),
    };
}

/** Where on a clump the light falls, and how far the shading spreads, as fractions of its radius. */
export const LIGHT = { dx: -0.32, dy: -0.38, spread: 1.2 };

/**
 * The colour of a placed word: one of the greens (or browns on the trunk), made lighter towards the upper left of the tree and
 * darker towards the lower right, the way the clumps are shaded (not in the flat look). A word with its own `color` keeps it.
 */
export function colorFor(item, look = "shaded") {
    // a word in a shape made from a picture has the colour of the picture under it
    if (item.color) return item.color;
    const outlined = look === "outlined";
    const list =
        item.region === "trunk"
            ? outlined
                ? COLORS.trunkWordsOutlined
                : COLORS.trunkWords
            : outlined
              ? COLORS.crownWordsOutlined
              : COLORS.crownWords;
    const picked = list[(item.rank * 7 + item.text.length) % list.length];
    // the flat and outlined looks are plain tones, so the words are not made lighter or darker by where they are
    if (look === "flat" || outlined) return picked;
    const [h, s, l] = hexToHsl(picked);
    const toward = (item.x / WIDTH - 0.5) * 8 + (item.y / HEIGHT - 0.4) * 12; // positive towards the lower right
    return hslToHex(h, s, clamp(l - toward, 16, 58));
}

/**
 * The note about the names that found no room: " 1 rarer surname did not fit: BOSWELL." for a few, and " 30 rarer surnames did
 * not fit." for more than `listed`, where the page offers the whole list (see unseenRows). "" when none were left out.
 */
export function unseenNote(names, noun, nouns, listed = 3) {
    if (!names.length) return "";
    const count = `${names.length.toLocaleString()} rarer ${names.length === 1 ? noun : nouns} did not fit`;
    return names.length > listed ? ` ${count}.` : ` ${count}: ${names.join(", ")}.`;
}

/** The list of names that did not fit, most common first: [{ text, count }], at most `limit`, and how many were left off the end. */
export function unseenRows(words, left, limit = 500) {
    const out = new Set(left);
    const rows = words.filter((w) => out.has(w.text)).map((w) => ({ text: w.text, count: w.count }));
    return { rows: rows.slice(0, limit), more: Math.max(0, rows.length - limit) };
}
