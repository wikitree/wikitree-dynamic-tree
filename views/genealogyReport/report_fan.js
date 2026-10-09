/*
 * Fan chart for the Genealogy Report: the subject in the middle, each generation of ancestors as a ring of wedges
 * around them, as in the Fan Chart Tree App. The app cannot be placed in a report (its generation count is internal
 * state of an interactive view), so the chart is drawn from the ancestors the report already holds, for exactly the
 * generations chosen.
 *
 * Pure string building (no DOM) so it can be tested in Node. Angles are in degrees clockwise from straight up, and the
 * chart is centred on "up": a 180 degree fan runs from -90 to +90.
 */

import { yearOf } from "./report_dates.js";
import { entryId, esc, treeAppUrl } from "./report_html.js";
import { visibleAncestors } from "./report_sections.js";

export const FAN_ANGLES = [180, 240, 360];
const ROOT_RADIUS = 72;
const MARGIN = 10;
// Generations beyond this are drawn as plain coloured wedges (hover for the name): the text would not be legible.
const LAST_LABELLED_GENERATION = 6;

const rad = (degrees) => (degrees * Math.PI) / 180;
const num = (value) => Math.round(value * 100) / 100;

function point(radius, angle) {
    return [num(radius * Math.sin(rad(angle))), num(-radius * Math.cos(rad(angle)))];
}

// A ring segment between two radii and two angles.
function wedgePath(inner, outer, from, to) {
    const [ox0, oy0] = point(outer, from);
    const [ox1, oy1] = point(outer, to);
    const [ix1, iy1] = point(inner, to);
    const [ix0, iy0] = point(inner, from);
    const large = to - from > 180 ? 1 : 0;
    return `M${ox0} ${oy0}A${outer} ${outer} 0 ${large} 1 ${ox1} ${oy1}L${ix1} ${iy1}A${inner} ${inner} 0 ${large} 0 ${ix0} ${iy0}Z`;
}

// Inner generations are thicker, so there is room for text where the wedges are widest.
function ringThickness(gen) {
    return Math.max(46, 112 - 11 * (gen - 2));
}

function ringRadii(generations) {
    const radii = new Map(); // gen -> [inner, outer]
    let inner = ROOT_RADIUS;
    for (let gen = 2; gen <= generations; gen++) {
        const outer = inner + ringThickness(gen);
        radii.set(gen, [inner, outer]);
        inner = outer;
    }
    return { radii, outermost: inner };
}

function truncate(text, maxChars) {
    if (text.length <= maxChars) return text;
    return maxChars > 1 ? `${text.slice(0, maxChars - 1)}…` : text.slice(0, maxChars);
}

function years(person) {
    const birth = yearOf(person.birthDate);
    const death = yearOf(person.deathDate);
    if (birth && death) return `${birth}–${death}`;
    if (birth) return `b. ${birth}`;
    if (death) return `d. ${death}`;
    return "";
}

// Text runs along the arc, so a wedge is wider than it is deep and the type can be small and still fit.
const FONT_SIZES = { 2: 13, 3: 12, 4: 11, 5: 10, 6: 9 };

// The given names if they fit, else the first name, cut short only if even that is too long.
function fitGiven(given, maxChars) {
    if (given.length <= maxChars) return given;
    return truncate(given.split(" ")[0] || "", maxChars);
}

/**
 * The lines of text for a wedge: given names, surname, years. `chord` is the width along the arc and `thickness`
 * the depth of the ring, so they decide how many characters and how many lines there is room for.
 */
function labelLines(person, gen, thickness, chord) {
    const fontSize = FONT_SIZES[gen] ?? 9;
    const maxChars = Math.max(3, Math.floor(chord / (fontSize * 0.52)));
    const maxLines = Math.max(1, Math.floor((thickness - 6) / (fontSize * 1.22)));
    const surname = person.lastNameAtBirth;
    const oneLine = () => {
        const full = `${person.given} ${surname}`.trim();
        return full.length <= maxChars
            ? full
            : truncate(`${(person.given.split(" ")[0] || "").trim()} ${surname}`.trim(), maxChars);
    };
    let lines;
    if (maxLines >= 3) {
        lines = [fitGiven(person.given, maxChars), truncate(surname, maxChars), truncate(years(person), maxChars)];
    } else if (maxLines === 2) {
        lines = [oneLine(), truncate(years(person), maxChars)];
    } else {
        lines = [oneLine()];
    }
    return { fontSize, lines: lines.filter(Boolean) };
}

function textGroup(lines, fontSize, x, y, rotation) {
    const lineHeight = fontSize * 1.18;
    const first = -((lines.length - 1) * lineHeight) / 2;
    const tspans = lines
        .map((line, i) => `<tspan x="0" y="${num(first + i * lineHeight)}">${esc(line)}</tspan>`)
        .join("");
    return `<text class="gr-fan-text" font-size="${fontSize}" text-anchor="middle" dominant-baseline="central" transform="translate(${x} ${y}) rotate(${num(rotation)})">${tspans}</text>`;
}

function wedge(n, gen, angle, radii, resolved) {
    const slotsInGeneration = 2 ** (gen - 1);
    const index = n - slotsInGeneration;
    const span = angle / slotsInGeneration;
    const from = -angle / 2 + index * span;
    const to = from + span;
    const [inner, outer] = radii.get(gen);
    const middleAngle = (from + to) / 2;
    const middleRadius = (inner + outer) / 2;
    const side = n % 2 === 0 ? "m" : "f";

    if (!resolved) {
        return `<a href="#${entryId(n)}"><title>Private #${n}</title><path class="gr-fan-wedge gr-fan-hidden" d="${wedgePath(inner, outer, from, to)}"/></a>`;
    }
    const { person } = resolved;
    const years_ = years(person);
    const title = `${esc(person.name)}${years_ ? ` (${esc(years_)})` : ""} #${n}`;
    let label = "";
    if (gen <= LAST_LABELLED_GENERATION) {
        // The width along the arc at the middle of the ring, less a margin at each side.
        const chord = 2 * middleRadius * Math.sin(rad(span) / 2) * 0.86;
        const { fontSize, lines } = labelLines(person, gen, outer - inner, chord);
        const [x, y] = point(middleRadius, middleAngle);
        // Text runs along the arc (clockwise at the top), turned so it is never upside down.
        let rotation = middleAngle;
        if (rotation > 90) rotation -= 180;
        else if (rotation < -90) rotation += 180;
        label = textGroup(lines, fontSize, x, y, rotation);
    }
    return `<a href="#${entryId(n)}"><title>${title}</title><path class="gr-fan-wedge gr-fan-${side} gr-fan-g${gen % 2}" d="${wedgePath(inner, outer, from, to)}"/>${label}</a>`;
}

/**
 * @param {object} model  from buildReportModel()
 * @param {object} [settings]
 * @param {number} [settings.angle]  180, 240 or 360
 */
export function buildFanChartSvg(model, settings = {}) {
    const angle = FAN_ANGLES.includes(settings.angle) ? settings.angle : 180;
    // Only as many rings as there are ancestors for: a report of 6 generations with nobody before the 3rd would
    // otherwise leave three empty rings around the chart.
    const deepest = Math.max(
        1,
        ...model.entries.filter((entry) => entry.kind !== "unavailable").map((entry) => entry.gen)
    );
    const generations = Math.min(Math.max(1, model.generations), deepest);
    const { radii, outermost } = ringRadii(generations);

    const slotEntries = new Map(model.entries.map((entry) => [entry.n, entry]));
    const resolvedByNumber = new Map(visibleAncestors(model).map((a) => [a.n, a.entry]));
    const parts = [];
    for (let gen = 2; gen <= generations; gen++) {
        for (let n = 2 ** (gen - 1); n < 2 ** gen; n++) {
            const entry = slotEntries.get(n);
            if (!entry || entry.kind === "unavailable") continue;
            parts.push(wedge(n, gen, angle, radii, entry.kind === "hidden" ? null : resolvedByNumber.get(n)));
        }
    }

    const root = resolvedByNumber.get(1);
    const rootLines = root
        ? [root.person.given, root.person.lastNameAtBirth, years(root.person)]
              .filter(Boolean)
              .map((l) => truncate(l, 14))
        : ["Private"];
    const rootText = textGroup(rootLines, 13, 0, 0, 0);
    const rootNode = `<a href="#${entryId(1)}"><title>${esc(root?.person.name || "Private")} #1</title><circle class="gr-fan-wedge gr-fan-root" r="${ROOT_RADIUS - 2}"/>${rootText}</a>`;

    const halfAngle = angle / 2;
    const bottom = Math.max(ROOT_RADIUS, halfAngle > 90 ? -outermost * Math.cos(rad(halfAngle)) : 0);
    const x = num(-outermost - MARGIN);
    const y = num(-outermost - MARGIN);
    const width = num(2 * (outermost + MARGIN));
    const height = num(outermost + bottom + 2 * MARGIN);
    const rootName = root?.person.name || "the starting profile";
    return `<svg class="gr-fan-svg" xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="${esc(`Fan chart of the ancestors of ${rootName}, ${generations} generations`)}">${parts.join("")}${rootNode}</svg>`;
}

export function fanChartHtml(model, ctx) {
    const angle = FAN_ANGLES.includes(model.options.fanAngle) ? model.options.fanAngle : 180;
    const appLink = ctx.rootWtId
        ? ` <a href="${esc(treeAppUrl(ctx.rootWtId, "fanchart"))}">Open the Fan Chart app</a>.`
        : "";
    const unlabelled =
        model.generations > LAST_LABELLED_GENERATION
            ? ` Generations after the ${LAST_LABELLED_GENERATION}th are shown as coloured wedges; hover over one for the name.`
            : "";
    return `<section class="gr-section gr-wide gr-fan" id="gr-fan"><h2>Fan Chart</h2>
<p class="gr-section-note">The ${model.generations} generation${model.generations === 1 ? "" : "s"} of this report as a ${angle}&deg; fan, with the starting profile in the centre. Blue wedges are fathers and pink wedges are mothers. Select a wedge to go to that ancestor.${unlabelled}${appLink}</p>
<div class="gr-fan-figure">${buildFanChartSvg(model, { angle })}</div></section>`;
}
