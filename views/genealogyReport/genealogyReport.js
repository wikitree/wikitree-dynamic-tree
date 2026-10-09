/*
 * GenealogyReportView
 *
 * A printable ancestor report: Ahnentafel-numbered entries for the direct line, each with a Family block
 * (siblings, children, other spouses/partners) and a cleaned-up biography with endnotes.
 *
 * Extends the base View class from the WikiTree Dynamic Tree. The logic lives in the ES modules beside this file:
 *   report_options.js  options and validation
 *   report_fetch.js    WikiTree API calls
 *   report_model.js    Ahnentafel numbering, family blocks, privacy
 *   report_bio.js      biography sanitising and endnotes
 *   report_render.js   HTML output
 */

import { DATE_FORMATS, STATUS_FORMATS } from "./report_dates.js";
import { MAX_GENERATIONS, estimateCost, normalizeOptions } from "./report_options.js";
import { ReportFetchError, completeReportData, fetchReportData } from "./report_fetch.js";
import { buildReportModel } from "./report_model.js";
import { sanitizeBio } from "./report_bio.js";
import { esc, renderReport } from "./report_render.js";

// What goes into the report, and how it is shown. Each is a checkbox named after its option.
const CONTENT_CHECKBOXES = [
    ["includeFamily", "Family block (siblings, children, other spouses)"],
    ["includeBio", "Biographies"],
    ["includeSources", "Sources (footnotes)"],
    ["includePortraits", "Profile portraits"],
    ["includeBioImages", "Images inside biographies"],
    ["hideStickers", "Hide stickers (badge and name-study boxes)"],
    ["maskLiving", "Hide living people (for sharing)"],
];
const DISPLAY_CHECKBOXES = [
    ["showWtIds", "WikiTree IDs"],
    ["showRelationship", "Relationship (grandfather, …)"],
    ["showPath", "Path from the subject"],
];
// Sections that reproduce a Tree App for the generations chosen.
const SECTION_CHECKBOXES = [
    ["sectionStats", "Statistics"],
    ["sectionFan", "Fan chart"],
    ["sectionCalendar", "Family calendar"],
    ["sectionSurnames", "Surnames list"],
];
const CHECKBOXES = [...CONTENT_CHECKBOXES, ...DISPLAY_CHECKBOXES, ...SECTION_CHECKBOXES];

const HASH_KEYS = [
    "generations",
    "dateFormat",
    "dateStatusFormat",
    "parentMode",
    "fanAngle",
    ...CHECKBOXES.map(([name]) => name),
];

const FAN_ANGLE_LABELS = { 180: "Semicircle (180°)", 240: "Traditional (240°)", 360: "Full circle (360°)" };
const PARENT_MODE_LABELS = { main: "Parents listed on the profile", bio: "Biological parents where different" };

const DATE_FORMAT_LABELS = {
    iso: "1859-11-24",
    mdy: "November 24, 1859",
    smdy: "Nov 24, 1859",
    dmy: "24 November 1859",
    dsmy: "24 Nov 1859",
    y: "1859",
};
const STATUS_LABELS = { abbreviations: "bef., aft., abt.", words: "before, after, about", symbols: "<, >, ~" };

// The date format is shared with the other Tree Apps (views/shared/DateFormatOptions.js keeps it in the browser),
// so a choice made there is the starting point here, and a choice made here is remembered there.
const sharedDates = () => window.DateFormatOptions;

// Options given in the URL hash, e.g. "#name=Windsor-1&view=genealogyReport&generations=4". The Tree Apps page
// rewrites the hash to just name and view before it starts a view, so the options are read once, when this
// script loads, and used for the first report only.
function readHashOptions(hash) {
    const params = new URLSearchParams(hash.slice(1));
    const raw = {};
    for (const key of HASH_KEYS) {
        if (params.has(key)) raw[key] = params.get(key);
    }
    return raw;
}
let pendingHashOptions = readHashOptions(location.hash);

function startingOptions() {
    const raw = {};
    const shared = sharedDates();
    if (shared) {
        raw.dateFormat = shared.getStoredFormatId();
        raw.dateStatusFormat = shared.getStoredStatusFormat();
    }
    Object.assign(raw, pendingHashOptions, readHashOptions(location.hash));
    pendingHashOptions = {};
    return normalizeOptions(raw);
}

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0));

window.GenealogyReportView = class GenealogyReportView extends View {
    meta() {
        return {
            title: "Genealogy Report",
            description: `A printable report of direct-line ancestors, numbered with the
                <a href="http://en.wikipedia.org/wiki/Ahnentafel" target="_Help">Ahnentafel</a> system. Each ancestor lists
                their parents, spouses, siblings and children, followed by their biography and sources. Relatives
                the report cannot show are counted but never named. Use your browser's Print command to save a PDF.`,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        this.close();
        this.runId = 0;
        this.rootKey = person_id;
        this.container = document.querySelector(container_selector);
        this.container.classList.add("genealogyReportView");
        this.container.innerHTML = this.formHtml(startingOptions());
        this.statusEl = this.container.querySelector(".gr-status");
        this.reportEl = this.container.querySelector(".gr-output");
        this.form = this.container.querySelector(".gr-form");

        this.form.addEventListener("submit", (event) => {
            event.preventDefault();
            this.generate();
        });
        this.form.addEventListener("input", () => this.onFormChange());
        this.form.addEventListener("change", (event) => this.rememberDateChoice(event.target));
        this.reportEl.addEventListener("click", (event) => {
            const button = event.target.closest(".gr-parent-mode");
            if (button) this.switchParents(button.dataset.personId, button.dataset.mode);
        });
        this.container.querySelector(".gr-print").addEventListener("click", () => window.print());
        this.container.querySelector(".gr-cancel").addEventListener("click", () => this.cancel());

        this.onFormChange();
        this.generate();
    }

    close() {
        this.runId = (this.runId || 0) + 1; // abandons any run still in flight
        if (this.container) {
            this.container.classList.remove("genealogyReportView");
            this.container.innerHTML = "";
        }
    }

    formHtml(options) {
        const checkbox = ([name, label]) =>
            `<label class="gr-check"><input type="checkbox" name="${name}"${options[name] ? " checked" : ""}> ${esc(label)}</label>`;
        const select = (name, label, values, labels, selected) =>
            `<label>${esc(label)} <select name="${name}">${values
                .map((v) => `<option value="${v}"${v === selected ? " selected" : ""}>${esc(labels[v] ?? v)}</option>`)
                .join("")}</select></label>`;
        const generations = Array.from({ length: MAX_GENERATIONS }, (_, i) => String(i + 1));
        return `<form class="gr-form">
<div class="gr-form-row">
${select("generations", "Generations", generations, {}, String(options.generations))}
${select("parentMode", "Parents followed", ["main", "bio"], PARENT_MODE_LABELS, options.parentMode)}
${CONTENT_CHECKBOXES.map(checkbox).join("")}
</div>
<div class="gr-form-row">
${select("dateFormat", "Date format", DATE_FORMATS, DATE_FORMAT_LABELS, options.dateFormat)}
${select("dateStatusFormat", "Date status", STATUS_FORMATS, STATUS_LABELS, options.dateStatusFormat)}
${DISPLAY_CHECKBOXES.map(checkbox).join("")}
</div>
<div class="gr-form-row">
<span class="gr-form-label">Add from the Tree Apps:</span>
${SECTION_CHECKBOXES.map(checkbox).join("")}
${select("fanAngle", "Fan shape", ["180", "240", "360"], FAN_ANGLE_LABELS, String(options.fanAngle))}
</div>
<div class="gr-form-row">
<button type="submit" class="btn btn-primary gr-generate">Generate</button>
<button type="button" class="btn gr-cancel" hidden>Cancel</button>
<button type="button" class="btn gr-print" disabled>Print / Save as PDF</button>
<span class="gr-estimate" aria-live="polite"></span>
</div>
</form>
<p class="gr-status" role="status" aria-live="polite"></p>
<div class="gr-output"></div>`;
    }

    readOptions() {
        const data = new FormData(this.form);
        const raw = {
            generations: data.get("generations"),
            dateFormat: data.get("dateFormat"),
            dateStatusFormat: data.get("dateStatusFormat"),
            parentMode: data.get("parentMode"),
            fanAngle: data.get("fanAngle"),
        };
        for (const [name] of CHECKBOXES) raw[name] = data.has(name);
        return normalizeOptions(raw);
    }

    onFormChange() {
        // Footnotes belong to biographies, and there is nothing to attach them to without any.
        const bioOn = this.form.elements.includeBio.checked;
        this.form.elements.includeSources.disabled = !bioOn;
        this.form.elements.includeBioImages.disabled = !bioOn;
        this.form.elements.hideStickers.disabled = !bioOn;
        this.form.elements.fanAngle.disabled = !this.form.elements.sectionFan.checked;
        this.updateEstimate();
    }

    rememberDateChoice(target) {
        const shared = sharedDates();
        if (!shared) return;
        if (target.name === "dateFormat") shared.setStoredFormatId(target.value);
        if (target.name === "dateStatusFormat") shared.setStoredStatusFormat(target.value);
    }

    updateEstimate() {
        const { ancestors, apiCalls } = estimateCost(this.readOptions());
        this.container.querySelector(".gr-estimate").textContent =
            `Up to ${ancestors} ancestors, about ${apiCalls} API request${apiCalls === 1 ? "" : "s"}.`;
    }

    setBusy(isBusy) {
        this.container.querySelector(".gr-generate").disabled = isBusy;
        this.container.querySelector(".gr-cancel").hidden = !isBusy;
        if (isBusy) this.container.querySelector(".gr-print").disabled = true;
    }

    cancel() {
        this.runId++;
        this.setBusy(false);
        this.statusEl.textContent = "Cancelled.";
    }

    // Clean the biographies a few at a time, letting the page breathe, so a 10-generation report does not freeze it.
    // Results are cached per profile and entry number (the endnote anchors carry the number), so switching one
    // person's parents does not clean every other biography again.
    async attachBiographies(model, options, isCurrent) {
        const people = model.entries.filter((entry) => entry.kind === "person");
        for (const [index, entry] of people.entries()) {
            if (index % 20 === 0) {
                this.statusEl.textContent = `Preparing biographies\u2026 (${index} of ${people.length})`;
                await yieldToBrowser();
                if (!isCurrent()) return false;
            }
            const cacheKey = `${entry.id}|${entry.n}`;
            if (!this.bioCache.has(cacheKey)) {
                const bio = sanitizeBio(entry.person.bioRaw, {
                    noteIdPrefix: `gr-n${entry.n}-`,
                    includeImages: options.includeBioImages,
                    hideStickers: options.hideStickers,
                    includeNotes: options.includeSources,
                });
                if (bio.droppedImages.length) {
                    console.warn(
                        `Genealogy Report: ${bio.droppedImages.length} image(s) in #${entry.n} had no usable https address`,
                        bio.droppedImages
                    );
                }
                this.bioCache.set(cacheKey, bio);
            }
            entry.bio = this.bioCache.get(cacheKey);
        }
        return true;
    }

    // Build the model from what has been fetched, attach biographies, and draw the report.
    async renderFromState(isCurrent) {
        const { options, state, parentModes } = this;
        this.statusEl.textContent = "Building the report\u2026";
        await yieldToBrowser();
        const model = buildReportModel({ rootId: state.rootId, people: state.people, options, parentModes });
        if (options.includeBio && !(await this.attachBiographies(model, options, isCurrent))) return false;

        const generatedOn = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
        this.reportEl.innerHTML = renderReport(model, { generatedOn });
        this.statusEl.textContent = `Done: ${model.stats.uniqueAncestors} ancestors in ${model.generations} generations.`;
        this.container.querySelector(".gr-print").disabled = false;
        return true;
    }

    reportFailed(error) {
        console.error("Genealogy Report failed", error);
        this.statusEl.textContent =
            error instanceof ReportFetchError
                ? error.message
                : "The report could not be built. See the console for details.";
    }

    async generate() {
        const runId = ++this.runId;
        const isCurrent = () => runId === this.runId;
        this.options = this.readOptions();
        this.parentModes = new Map(); // per-person choices start again from the "Parents followed" setting
        this.bioCache = new Map();
        this.state = null;

        this.setBusy(true);
        this.reportEl.innerHTML = "";
        try {
            const state = await fetchReportData({
                api: WikiTreeAPI,
                rootKey: this.rootKey,
                options: this.options,
                parentModes: this.parentModes,
                onProgress: (message) => isCurrent() && (this.statusEl.textContent = message),
                isCancelled: () => !isCurrent(),
            });
            if (state.cancelled || !isCurrent()) return;
            this.state = state;
            await this.renderFromState(isCurrent);
        } catch (error) {
            if (isCurrent()) this.reportFailed(error);
        } finally {
            if (isCurrent()) this.setBusy(false);
        }
    }

    // The reader chose the biological (or listed) parents for one person: fetch that line if it has not been
    // loaded, then draw the report again, keeping the page where it was.
    async switchParents(personId, mode) {
        if (!this.state || this.parentModes.get(personId) === mode) return;
        const runId = ++this.runId;
        const isCurrent = () => runId === this.runId;
        const previous = this.parentModes.get(personId);
        const anchorId = this.reportEl
            .querySelector(`[data-person-id="${CSS.escape(personId)}"]`)
            ?.closest("section")?.id;

        this.parentModes.set(personId, mode);
        this.setBusy(true);
        try {
            const result = await completeReportData({
                api: WikiTreeAPI,
                state: this.state,
                options: this.options,
                parentModes: this.parentModes,
                onProgress: (message) => isCurrent() && (this.statusEl.textContent = message),
                isCancelled: () => !isCurrent(),
            });
            if (result.cancelled || !isCurrent()) return;
            if (await this.renderFromState(isCurrent)) {
                (anchorId && document.getElementById(anchorId))?.scrollIntoView({ block: "center" });
            }
        } catch (error) {
            if (!isCurrent()) return;
            // Put the choice back, so the report still matches what is on screen.
            if (previous) this.parentModes.set(personId, previous);
            else this.parentModes.delete(personId);
            this.reportFailed(error);
        } finally {
            if (isCurrent()) this.setBusy(false);
        }
    }
};
