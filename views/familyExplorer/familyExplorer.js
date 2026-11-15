/*
 * Family Explorer and Galaxy Explorer
 *
 * Two Tree Apps for moving through the family round one person, one person at a time:
 *  - Family Explorer: photo cards round one person (parents, siblings, spouses, children); click anyone to move to them.
 *  - Galaxy Explorer: everyone loaded as stars round one person, ancestors above and descendants below.
 * More of the family loads from the WikiTree API as you move about.
 *
 * Ported from the Family Explorer in WikiTree Browser Extension's Genie (src/features/chat/chat_family_*.js).
 * The files here keep the extension's names without the "chat_" prefix, so changes can be carried across.
 * The extension's Trees and 3D views are not included.
 */

import { mountFamilyNavigator } from "./family_navigator.js";
import { mountFamilyGalaxy } from "./family_galaxy.js";
import {
    addStyleOnce,
    createChartPopup,
    escapeText,
    mountChartPopup,
    personNameText,
    saveChart,
} from "./common.js";
import {
    bioParentsChoice,
    bioParentsToCheck,
    bioParentsToFetch,
    createFamilyWorld,
    mergeCheckedParents,
    mergeWorldPeople,
    parentsToCheck,
    setBiologicalParents,
    FAMILY_WORLD_NUCLEAR,
} from "./family_world_data.js";

const APP_ID = "FamilyExplorer";

const FAMILY_WORLD_FIELDS = [
    "Id",
    "Name",
    "RealName",
    "FirstName",
    "MiddleName",
    "LastNameAtBirth",
    "LastNameCurrent",
    "Gender",
    "BirthDate",
    "DeathDate",
    "BirthLocation",
    "DeathLocation",
    "Father",
    "Mother",
    "BioFather",
    "BioMother",
    "Photo",
    "PhotoData",
    "DataStatus",
    "Spouses",
    "Meta",
    "IsLiving",
].join(",");

/**
 * getPeople for `keys` (one key, or a list), with the profiles keyed by Id. One key with a "limit" is
 * fetched page by page while the API says there are more; a list of keys goes 1000 at a time.
 * Returns [status, total, people] like the extension's fetchPeoplePaged.
 */
async function fetchPeoplePaged(keys, fields, options = {}) {
    const limit = Number(options.limit) || 1000;
    const people = {};
    let lastStatus = "";
    const add = (found) =>
        Object.values(found || {}).forEach((profile) => {
            const key = profile?.Id != null ? String(profile.Id) : profile?.Name || null;
            if (key) people[key] = profile;
        });
    const keyList = Array.isArray(keys) ? keys.map(String) : null;
    if (keyList) {
        const keyOptions = { ...options };
        delete keyOptions.start;
        delete keyOptions.limit;
        for (let i = 0; i < keyList.length; i += limit) {
            const [status, , found] = await WikiTreeAPI.getPeople(APP_ID, keyList.slice(i, i + limit), fields, keyOptions);
            lastStatus = status || lastStatus;
            add(found);
        }
        return [lastStatus, keyList.length, people];
    }
    let start = Number(options.start) || 0;
    for (;;) {
        const [status, , found] = await WikiTreeAPI.getPeople(APP_ID, String(keys), fields, { ...options, start, limit });
        lastStatus = status;
        add(found);
        if (!(typeof status === "string" && status.startsWith("Maximum number of profiles"))) break;
        start += limit;
    }
    return [lastStatus, null, people];
}

/** The family round `key`: getPeople "nuclear" round them, with their parents and birth parents checked. */
async function loadFamilyWorld(key) {
    const world = createFamilyWorld(key);
    // Birth parents (BioFather, BioMother) a fetch named but didn't send, for the "biological parents" option.
    const fetchBioParents = async () => {
        const check = bioParentsToCheck(world);
        if (check.length) {
            const [, , checked] = await fetchPeoplePaged(check, FAMILY_WORLD_FIELDS, {});
            mergeWorldPeople(world, checked, { root: world.focusKey });
        }
        const ids = bioParentsToFetch(world);
        if (!ids.length) return;
        const [, , people] = await fetchPeoplePaged(ids, FAMILY_WORLD_FIELDS, {});
        mergeWorldPeople(world, people, { root: world.focusKey });
    };
    // Parents a nuclear fetch sent as null and left out.
    const fetchCheckedParents = async () => {
        const check = parentsToCheck(world);
        if (!check.length) return;
        const [, , people] = await fetchPeoplePaged(check, FAMILY_WORLD_FIELDS, { ancestors: 2 });
        mergeCheckedParents(world, check, people);
    };
    const fetchAround = async (root, nuclear) => {
        // (getPeople nuclear 2+ can leave out someone nuclear 1 has, so the immediate family is asked for as well)
        const [[, , people], [, , close]] = await Promise.all([
            fetchPeoplePaged(root, FAMILY_WORLD_FIELDS, { nuclear, limit: 1000 }),
            nuclear > 1 ? fetchPeoplePaged(root, FAMILY_WORLD_FIELDS, { nuclear: 1, limit: 1000 }) : [null, null, {}],
        ]);
        mergeWorldPeople(world, people, { root, nuclear });
        if (nuclear > 1) mergeWorldPeople(world, close, { root, nuclear: 1 });
        await fetchCheckedParents();
        await fetchBioParents();
        world.noteHiddenOnce?.();
    };
    // A nuclear getPeople leaves out the starting person, so fetch them alongside.
    const [, [, , selfAndParents]] = await Promise.all([
        fetchAround(key, FAMILY_WORLD_NUCLEAR.start),
        fetchPeoplePaged([key], FAMILY_WORLD_FIELDS, { ancestors: 1 }),
    ]);
    const isSelf = (person) =>
        String(person?.Name) === String(key) || String(person?.Id) === String(key) || Number(person?.Meta?.Degrees) === 0;
    const self = Object.values(selfAndParents || {}).filter((person) => Number(person?.Id) > 0 && isSelf(person));
    world.privateParents = self.length === 1 ? [self[0].Father, self[0].Mother].filter((id) => Number(id) < 0).length : 0;
    const asSent = self.map((person) => ({
        ...person,
        Father: Number(person.Father) > 0 ? person.Father : 0,
        Mother: Number(person.Mother) > 0 ? person.Mother : 0,
    }));
    mergeWorldPeople(world, asSent, { root: key, nuclear: FAMILY_WORLD_NUCLEAR.start });
    await fetchCheckedParents();
    await fetchBioParents();
    world.fetchAround = fetchAround;
    return world;
}

/** Says, once, why some profiles show as "Private". */
function noteHiddenProfiles(count) {
    if (!count) return;
    const what = `${count} profile${count === 1 ? "" : "s"} show${count === 1 ? "s" : ""} as "Private"`;
    const loggedIn = Boolean(WikiTreeAPI.cookie("WikiTreeAPI_userId"));
    wtViewRegistry.showWarning(
        loggedIn
            ? `${what}: their privacy settings hide them from you.`
            : `${what}. If you're on their Trusted Lists, use Apps Login (top right) and open this app again.`
    );
}

const SHELL_CSS = `
  .wbe-explorer .wbe-chart-stage { background: radial-gradient(ellipse at 50% 40%, #fffdf7 0%, #f6f3ea 55%, #ece7da 100%); }
  .wbe-explorer .wbe-explorer-host { position: absolute; inset: 0; z-index: 1; }
  .wbe-explorer .wbe-explorer-search { border: 1px solid rgba(0,0,0,.2); border-radius: 999px; padding: 3px 10px; font-size: 12px; width: 190px; }
  .wbe-explorer .wbe-explorer-bio { display: inline-flex; align-items: center; gap: 5px; flex: none; font-size: 12.5px; font-weight: 600; white-space: nowrap; cursor: pointer; }
  .wbe-explorer .wbe-explorer-bio[hidden] { display: none; }
  .wbe-explorer .wbe-explorer-bio input { margin: 0; }
`;

/**
 * The panel round one of the views, inside `container`: a header with the title and buttons, a toolbar with
 * the biological-parents switch and a find box, the view, and a count of the people loaded.
 * app: {mount, title, file (the saved file's name), svg (the view can save itself as SVG)}. Returns the panel.
 */
function openExplorer(world, container, app) {
    addStyleOnce("wbe-explorer-style", SHELL_CSS);
    const focus = world.people.get(world.focusId) || {};
    const homeName = String(focus.name || "").trim();

    const hiddenCount = () => [...world.people.values()].filter((person) => person?.hidden).length;
    let noted = false;
    world.noteHiddenOnce = () => {
        if (noted || !hiddenCount()) return;
        noted = true;
        noteHiddenProfiles(hiddenCount());
    };
    world.noteHiddenOnce();

    // (only a fetch that worked counts as tried; after three failures it counts as tried too)
    const load = (id) =>
        world.fetchAround(id, FAMILY_WORLD_NUCLEAR.expand).then(
            () => world.tried.add(id),
            (error) => {
                world.failedFetches = world.failedFetches || new Map();
                const count = (world.failedFetches.get(id) || 0) + 1;
                world.failedFetches.set(id, count);
                if (count >= 3) world.tried.add(id);
                throw error;
            }
        );
    const loadNearby = (id, steps) => world.fetchAround(id, steps);

    const popup = createChartPopup({
        id: "wbe-explorer-popup",
        host: container,
        html: `
    <div class="chat-popup-header">
      <strong class="wbe-chart-title"></strong>
      <div class="chat-popup-controls">
        <button type="button" class="small" data-act="up" title="Move to a parent">↑ Parents</button>
        <button type="button" class="small" data-act="home" title="Back to where you started">${
            homeName ? `Back to ${escapeText(homeName)}` : "Back to the start"
        }</button>
        ${app.svg ? `<button type="button" class="small" data-act="svg" title="Save the view as SVG">SVG</button>` : ""}
        <button type="button" class="small" data-act="png" title="Save the view as PNG">PNG</button>
      </div>
    </div>
    <div class="chat-popup-body">
      <div class="wbe-chart-toolbar">
        <label class="wbe-explorer-bio" hidden><input type="checkbox"> <span></span></label>
        <span class="wbe-chart-spacer"></span>
        <input type="search" class="wbe-explorer-search" placeholder="Find someone loaded…" aria-label="Find someone loaded">
      </div>
      <div class="wbe-chart-stage"></div>
      <div class="wbe-chart-footer">
        <div class="wbe-chart-stats"></div>
      </div>
    </div>`,
    });
    popup.classList.add("wbe-explorer");
    popup.querySelector(".wbe-chart-title").textContent = `${app.title}: ${personNameText(focus)}${
        focus.wtid ? ` (${focus.wtid})` : ""
    }`;
    const stage = popup.querySelector(".wbe-chart-stage");
    const stats = popup.querySelector(".wbe-chart-stats");
    const bioToggle = popup.querySelector(".wbe-explorer-bio");
    const search = popup.querySelector(".wbe-explorer-search");

    let view = null; // {host, api}

    // Someone's biological parents (BioFather, BioMother), switched one person at a time: the switch is for
    // the person picked in the view, or else the one at the centre, when they have any recorded.
    function currentBioChoice() {
        if (!view) return null;
        const picked = view.api.selectedId?.() || 0;
        if (picked && bioParentsChoice(world, picked)) return bioParentsChoice(world, picked);
        return bioParentsChoice(world, view.api.currentId());
    }
    function updateBioToggle() {
        const choice = currentBioChoice();
        bioToggle.hidden = !choice;
        if (!choice) return;
        bioToggle.dataset.id = choice.id;
        bioToggle.querySelector("input").checked = choice.on;
        bioToggle.querySelector("span").textContent = `${choice.name}'s biological parents`;
        bioToggle.title = choice.on
            ? `Showing ${choice.name} with their biological parents. Untick for the parents who raised them.`
            : `Show ${choice.name} with their biological parents (on WikiTree as BioFather and BioMother) instead of the parents who raised them.`;
    }
    function refreshStats() {
        stats.innerHTML = `<strong>${world.people.size.toLocaleString()}</strong>people loaded so far · more load as you go`;
        updateBioToggle();
    }

    function mountView(startId) {
        if (view) {
            view.api.destroy();
            view.host.remove();
            view = null;
        }
        const host = document.createElement("div");
        host.className = "wbe-explorer-host";
        stage.appendChild(host);
        const api = app.mount(host, {
            world,
            load,
            loadNearby,
            startId,
            onCentre: refreshStats,
            onSelect: updateBioToggle,
        });
        view = { host, api };
        refreshStats();
    }

    bioToggle.querySelector("input").addEventListener("change", (event) => {
        const id = Number(bioToggle.dataset.id);
        setBiologicalParents(world, id, event.target.checked);
        // (the families change shape, so the view starts again on them)
        mountView(id);
    });

    // Enter finds someone among everyone loaded and moves to them; Enter again for the next match.
    const found = { query: "", ids: [], at: -1 };
    search.addEventListener("keydown", (event) => {
        if (!view || event.key !== "Enter") return;
        event.preventDefault();
        const query = search.value.trim().toLowerCase();
        if (!query) return;
        if (found.query !== query) {
            found.query = query;
            found.ids = [...world.people.values()]
                .filter(
                    (person) =>
                        !person.hidden && `${person.name} ${person.lnab} ${person.wtid}`.toLowerCase().includes(query)
                )
                .map((person) => person.id);
            found.at = -1;
        }
        if (!found.ids.length) {
            search.title = "No one loaded matches";
            search.style.borderColor = "#e0533d";
            return;
        }
        search.style.borderColor = "";
        found.at = (found.at + 1) % found.ids.length;
        search.title = `${found.at + 1} of ${found.ids.length} (Enter for the next)`;
        view.api.centre(found.ids[found.at]);
    });

    const currentWtid = () => world.people.get(view?.api.currentId())?.wtid || "";

    popup.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !view || !popup.contains(button) || view.host.contains(button)) return;
        const act = button.dataset.act;
        if (act === "up") view.api.up();
        else if (act === "home") view.api.home();
        else if ((act === "svg" || act === "png") && view.api.exportSvg) {
            const wtid = currentWtid().replace(/[^A-Za-z0-9_-]/g, "");
            saveChart(view.api.exportSvg(), `${app.file}-${wtid || "view"}`, act);
        } else if (act === "png" && view.api.canvas) {
            savePng(view.api.canvas, `${app.file}-${currentWtid().replace(/[^A-Za-z0-9_-]/g, "") || "view"}`, button);
        }
    });

    mountChartPopup(popup, () => view?.api.destroy(), { stage, resize: () => view?.api.resize() });
    // In Tree Apps' full screen the panel fills the rest of the screen, below the app bar and any status line.
    const fitHeight = () => {
        if (!document.body.classList.contains("full-screen-view")) {
            popup.style.height = "";
            return;
        }
        const top = popup.getBoundingClientRect().top + window.scrollY;
        popup.style.height = `${Math.max(480, window.innerHeight - top - 6)}px`;
    };
    window.addEventListener("resize", fitHeight, { signal: popup._wbeSignal.signal });
    fitHeight();
    mountView(world.focusId);
    return popup;
}

/** Saves a canvas as PNG; a photo from another site can stop that, which the button then says. */
function savePng(canvas, fileBase, button) {
    try {
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = `${fileBase}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (error) {
        button.title = "This view can't be saved (a photo came from another site).";
        wtViewRegistry.showWarning("This view can't be saved as PNG: a photo in it came from another site.");
    }
}

/** A Tree App showing one of the views. */
class ExplorerApp extends View {
    constructor(app) {
        super();
        this.app = app;
    }

    init(containerSelector, personId) {
        this.close();
        const container = document.querySelector(containerSelector);
        const loading = document.createElement("p");
        loading.className = "family-explorer-loading";
        loading.textContent = "Loading the family…";
        container.appendChild(loading);
        const run = (this.run = {});
        loadFamilyWorld(personId)
            .then((world) => {
                if (this.run !== run) return;
                loading.remove();
                if (!world.focusId) {
                    wtViewRegistry.showError("The family couldn't be loaded from the WikiTree API.");
                    return;
                }
                run.popup = openExplorer(world, container, this.app);
            })
            .catch((error) => {
                if (this.run !== run) return;
                loading.remove();
                console.error(`${this.app.title} failed to load`, error);
                wtViewRegistry.showError(`${this.app.title} failed to load (${error?.message || error}).`);
            });
    }

    close() {
        this.run?.popup?._wbeCloseChart?.();
        this.run = null;
    }
}

window.FamilyExplorerView = class FamilyExplorerView extends ExplorerApp {
    constructor() {
        super({
            title: "Family Explorer",
            file: "family",
            mount: mountFamilyNavigator,
            svg: true,
        });
    }

    meta() {
        return {
            title: "Family Explorer",
            description:
                "Photo cards of a person's parents, siblings, spouses and children. Click anyone to move to them; more of the family loads as you go.",
            docs: "",
        };
    }
};

window.GalaxyExplorerView = class GalaxyExplorerView extends ExplorerApp {
    constructor() {
        super({
            title: "Galaxy Explorer",
            file: "galaxy",
            mount: mountFamilyGalaxy,
            svg: false,
        });
    }

    meta() {
        return {
            title: "Galaxy Explorer",
            description:
                "The family round a person as a galaxy of stars: ancestors above, descendants below. Click a star to move to them; more loads as you go.",
            docs: "",
        };
    }
};
