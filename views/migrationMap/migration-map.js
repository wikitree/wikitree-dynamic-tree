import { Utils } from "../shared/Utils.js";

window.MigrationMapView = class MigrationMapView extends View {
    static APP_ID = "MigrationMapTool";
    static US_STATES = {
        AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
        CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
        HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
        KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
        MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
        NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
        NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
        OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island",
        SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
        VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
        WI: "Wisconsin", WY: "Wyoming", DC: "District of Columbia",
    };
    static HISTORICAL_STATE_NAMES = {
        "massachusetts bay": "Massachusetts",
    };

    constructor() {
        super();
        this.abortController = null;
        this.playTimer = null;
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
    }

    close() {
        this.abortController?.abort();
        this._stopPlayback();
    }
    meta() {
        return {
            title: "Migration Map Tool",
            description: "Follow a WikiTree family's geographic migration through time on a historical-style map.",
            docs: "",
            params: ["ancestors"],
        };
    }

    init(container_selector, person_id, params = {}) {
        this.abortController?.abort();
        this.abortController = new AbortController();
        const root = document.querySelector(container_selector);
        root.innerHTML = `<div class="migration-map-tool"><div class="mmt-loading">Loading family history…</div></div>`;
        this._root = root;
        this._personId = person_id;
        const generations = Number(params.ancestors) || 7;
        this._load(root, person_id, Math.min(10, Math.max(5, generations)), this.abortController.signal);
    }

    async _load(root, personId, generations, signal) {
        Utils.showShakingTree();
        try {
            const people = await this._getPeople(personId, generations);
            if (signal.aborted) return;
            if (!people.length) throw new Error("No ancestor profiles were returned.");
            this._people = people;
            this._buildFamilyBranches(people, personId);
            const years = people.map((person) => this._birthYear(person)).filter(Number.isFinite);
            this._yearMin = years.length ? Math.min(...years) : 1730;
            this._yearMax = years.length ? Math.max(...years) : 1970;
            if (this._yearMin === this._yearMax) this._yearMin--;
            this._selectedYear = this._yearMax;
            this._locations = new Map();
            root.innerHTML = this._renderShell(people, personId, generations);
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this._wireControls(root, personId);
            await this._mapLocations(root, people, signal);
        } catch (e) {
            if (signal.aborted || e?.name === "AbortError") return;
            root.innerHTML = `<div class="mmt-error"><strong>Migration Map Tool could not load this family.</strong><br>${this._escape(e?.message || e)}</div>`;
            console.error(e);
        } finally {
            Utils.hideShakingTree();
        }
    }

    async _getPeople(personId, generations) {
        const fields = [
            "BirthLocation", "DeathLocation", "BirthDate", "DeathDate", "Name", "FirstName",
            "MiddleName", "LastNameAtBirth", "LastNameCurrent", "RealName", "LongName",
            "Derived.LongName", "Derived.BirthName", "Father", "Mother", "Gender", "Meta"
        ];
        let family = {};
        let rootResult = null;
        let start = 0;
        let more = true;
        while (more) {
            const options = { ancestors: generations, start };
            const [status, resultByKey, people] = await WikiTreeAPI.getPeople(
                MigrationMapView.APP_ID, personId, fields, options
            );
            if (!rootResult) rootResult = resultByKey;
            if (status && !String(status).startsWith("Maximum number of profiles")) {
                throw new Error(status);
            }
            family = { ...family, ...(people || {}) };
            more = String(status || "").startsWith("Maximum number of profiles");
            start = Object.keys(family).length;
            if (!people || !Object.keys(people).length) more = false;
        }

        // Make sure the selected profile is present even when it has no ancestors.
        if (!family[personId] && rootResult && rootResult[personId]) family[personId] = rootResult[personId];

        const arr = Object.entries(family).map(([id, p]) => ({
            ...p,
            Id: p.Id || id,
            generation: Number(p?.Meta?.Degrees ?? 0),
        }));
        return arr;
    }

    _renderShell(people, personId, generations) {
        const rootPerson = people.find(p => String(p.Id) === String(personId)) || people.find(p => p.generation === 0) || people[0];
        const mapped = people.filter(p => p.BirthLocation).length;
        const branchOptions = (generation) => people
            .filter((person) => person.generation === generation && this._lineagePaths.has(String(person.Id)))
            .sort((a, b) => String(a.Name).localeCompare(String(b.Name)))
            .map((person) => {
                const path = this._lineagePaths.get(String(person.Id));
                return `<option value="${path}">${this._escape(this._personDisplayName(person))} — ${this._describeLine(path)}</option>`;
            }).join("");
        return `<div class="migration-map-tool">
            <div class="mmt-header">
                <div>
                    <h2>Migration Trails <span>— ${this._escape(this._personDisplayName(rootPerson || { Name: personId }))}</span></h2>
                    <p>Follow family movement from each ancestor's birthplace toward the present. Scroll or pinch to zoom; drag to pan.</p>
                </div>
            </div>
            <div class="mmt-toolbar">
                <div class="mmt-map-views" role="group" aria-label="Map region">
                    <button type="button" class="mmt-view-button" data-view="world">World</button>
                    <button type="button" class="mmt-view-button active" data-view="atlantic">Atlantic</button>
                    <button type="button" class="mmt-view-button" data-view="north-america">US &amp; Canada</button>
                    <button type="button" class="mmt-view-button" data-view="europe">Europe</button>
                </div>
                <label class="mmt-toggle"><input class="mmt-paternal-toggle" type="checkbox" checked /> Paternal</label>
                <label class="mmt-toggle"><input class="mmt-maternal-toggle" type="checkbox" checked /> Maternal</label>
                <label class="mmt-line-select">Show line
                    <select class="mmt-line">
                        <option value="">Everyone</option>
                        <optgroup label="Grandparent lines">${branchOptions(2)}</optgroup>
                        <optgroup label="Great-grandparent lines">${branchOptions(3)}</optgroup>
                    </select>
                </label>
                <label class="mmt-generations-select">Generations
                    <select class="mmt-generations">${[5,6,7,8,9,10].map(n => `<option value="${n}" ${n === Number(generations) ? "selected" : ""}>${n}</option>`).join("")}</select>
                </label>
            </div>
            <div class="mmt-playback">
                <button type="button" class="mmt-play" aria-pressed="false">▶ Play</button>
                <input class="mmt-year" type="range" min="${this._yearMin}" max="${this._yearMax}" step="1" value="${this._yearMax}" aria-label="Show profiles born by year" />
                <strong>Born by <output class="mmt-year-label">${this._yearMax}</output></strong>
                <span class="mmt-status">Preparing ${mapped} recorded birth locations…</span>
            </div>
            <div class="mmt-map" aria-label="Family migration map">
                <svg class="mmt-overlay" viewBox="0 0 1200 650" preserveAspectRatio="none" role="img" aria-label="Family migration map">
                    <image class="mmt-basemap" href="views/migrationMap/maps/atlantic.png" x="0" y="0" width="1200" height="650" />
                    <g class="mmt-trails"></g><g class="mmt-points"></g>
                </svg>
                <div class="mmt-zoom-controls" aria-label="Map zoom controls">
                    <button type="button" class="mmt-zoom-in" aria-label="Zoom in">+</button>
                    <button type="button" class="mmt-zoom-out" aria-label="Zoom out">−</button>
                    <button type="button" class="mmt-zoom-reset">Reset zoom</button>
                </div>
            </div>
            <div class="mmt-info" aria-live="polite">&nbsp;</div>
            <div class="mmt-key">
                <span class="mmt-key-group"><b>Paternal</b>${this._generationSwatches("paternal")}</span>
                <span class="mmt-key-group"><b>Maternal</b>${this._generationSwatches("maternal")}</span>
                <span><i class="mmt-key-root"></i> Starting profile</span>
                <span class="mmt-key-note">${people.length} profiles · ${this._yearMin}–${this._yearMax} · ${this._locations.size} locations geocoded</span>
            </div>
            <details class="mmt-list"><summary>Ancestor profiles (${people.length})</summary><div class="mmt-rows"></div></details>
        </div>`;
    }

    _buildFamilyBranches(people, personId) {
        const byId = new Map(people.map((person) => [String(person.Id), person]));
        const rootId = String(personId);
        this._familySides = new Map([[rootId, "root"]]);
        this._lineagePaths = new Map([[rootId, ""]]);
        const queue = [rootId];
        while (queue.length) {
            const id = queue.shift();
            const person = byId.get(id);
            if (!person) continue;
            const path = this._lineagePaths.get(id);
            for (const [relation, side, letter] of [[person.Father, "paternal", "F"], [person.Mother, "maternal", "M"]]) {
                const parentId = this._parentId(relation);
                if (!parentId || !byId.has(parentId) || this._lineagePaths.has(parentId)) continue;
                this._lineagePaths.set(parentId, `${path}${letter}`);
                this._familySides.set(parentId, id === rootId ? side : this._familySides.get(id));
                queue.push(parentId);
            }
        }
    }

    _parentId(relation) {
        const id = typeof relation === "object" ? relation?.Id ?? relation?.id : relation;
        return id ? String(id) : "";
    }

    _personDisplayName(person) {
        const derivedLongName = typeof person.Derived === "object" ? person.Derived?.LongName : "";
        const lastName = person.LastNameCurrent || person.LastNameAtBirth;
        const givenNames = [person.FirstName, person.MiddleName].filter(Boolean);
        const fullName = [...givenNames, lastName].filter(Boolean).join(" ");
        const familiarName = [person.RealName, lastName].filter(Boolean).join(" ");
        return person.LongName || derivedLongName || (givenNames.length ? fullName : "") ||
            familiarName || person.Name || person.Id;
    }

    _describeLine(path) {
        return path.split("").map((letter) => letter === "F" ? "father" : "mother").join("'s ");
    }

    _birthYear(person) {
        const year = Number(String(person.BirthDate || "").match(/-?\d{3,4}/)?.[0]);
        return Number.isFinite(year) && year > 0 && year <= new Date().getFullYear() ? year : null;
    }

    _generationSwatches(side) {
        const palette = side === "paternal" ? ["#08306b", "#08519c", "#2171b5", "#4292c6", "#6baed6"] :
            ["#7a0b3e", "#a3145a", "#c9207a", "#e0559b", "#ec86b8"];
        return palette.map((color, index) => `<i class="mmt-generation-swatch" style="--swatch:${color}" title="${index + 1} generation${index ? "s" : ""} from root"></i>`).join("");
    }

    _wireControls(root, personId) {
        root.querySelector(".mmt-generations").addEventListener("change", e => {
            this.abortController?.abort();
            this._stopPlayback();
            this.abortController = new AbortController();
            this._load(root, personId, Number(e.target.value), this.abortController.signal);
        });
        root.querySelectorAll(".mmt-view-button").forEach((button) => button.addEventListener("click", () => {
            root.querySelectorAll(".mmt-view-button").forEach((item) => item.classList.toggle("active", item === button));
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this._draw(root);
        }));
        root.querySelectorAll(".mmt-paternal-toggle, .mmt-maternal-toggle, .mmt-line").forEach((control) => {
            control.addEventListener("change", () => this._draw(root));
        });
        root.querySelector(".mmt-year").addEventListener("input", (event) => {
            this._stopPlayback();
            this._selectedYear = Number(event.target.value);
            root.querySelector(".mmt-year-label").textContent = String(this._selectedYear);
            this._draw(root);
        });
        root.querySelector(".mmt-play").addEventListener("click", () => this._togglePlayback(root));
        root.querySelector(".mmt-zoom-in").addEventListener("click", () => this._zoomAt(root, 1.5));
        root.querySelector(".mmt-zoom-out").addEventListener("click", () => this._zoomAt(root, 1 / 1.5));
        root.querySelector(".mmt-zoom-reset").addEventListener("click", () => {
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this._draw(root);
        });

        const svg = root.querySelector(".mmt-overlay");
        svg.addEventListener("wheel", (event) => {
            event.preventDefault();
            this._zoomAt(root, Math.exp(-event.deltaY * 0.002), this._pointerFraction(svg, event));
        }, { passive: false });
        svg.addEventListener("pointerdown", (event) => {
            if (event.target.closest(".mmt-map-point")) return;
            svg.setPointerCapture(event.pointerId);
            this._pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
            root.querySelector(".mmt-map").classList.add("panning");
        });
        svg.addEventListener("pointermove", (event) => {
            if (!this._pointerStart || this._pointerStart.id !== event.pointerId) return;
            const rect = svg.getBoundingClientRect();
            const dx = event.clientX - this._pointerStart.x;
            const dy = event.clientY - this._pointerStart.y;
            if (Math.abs(dx) + Math.abs(dy) > 2) this._pointerStart.moved = true;
            if (!this._pointerStart.moved || this.zoom === 1) {
                this._pointerStart.x = event.clientX;
                this._pointerStart.y = event.clientY;
                return;
            }
            this.panX -= dx / rect.width * 1200 / this.zoom;
            this.panY -= dy / rect.height * 650 / this.zoom;
            this._draw(root);
        });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => svg.addEventListener(type, () => {
            this._pointerStart = null;
            root.querySelector(".mmt-map").classList.remove("panning");
        }));
    }

    _pointerFraction(svg, event) {
        const rect = svg.getBoundingClientRect();
        return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
    }

    _zoomAt(root, factor, fraction = [0.5, 0.5]) {
        const nextZoom = Math.max(1, Math.min(12, this.zoom * factor));
        if (nextZoom === this.zoom) return;
        const width = 1200 / this.zoom;
        const height = 650 / this.zoom;
        const focusX = this.panX + width * fraction[0];
        const focusY = this.panY + height * fraction[1];
        this.zoom = nextZoom;
        this.panX = focusX - 1200 / this.zoom * fraction[0];
        this.panY = focusY - 650 / this.zoom * fraction[1];
        this._draw(root);
    }

    _togglePlayback(root) {
        if (this.playTimer) {
            this._stopPlayback();
            return;
        }
        if (this._selectedYear >= this._yearMax) this._selectedYear = this._yearMin;
        const input = root.querySelector(".mmt-year");
        const button = root.querySelector(".mmt-play");
        button.textContent = "❚❚ Pause";
        button.setAttribute("aria-pressed", "true");
        const step = Math.max(1, Math.round((this._yearMax - this._yearMin) / 80));
        this.playTimer = window.setInterval(() => {
            this._selectedYear = Math.min(this._yearMax, this._selectedYear + step);
            input.value = String(this._selectedYear);
            root.querySelector(".mmt-year-label").textContent = String(this._selectedYear);
            this._draw(root);
            if (this._selectedYear >= this._yearMax) this._stopPlayback();
        }, 220);
        input.value = String(this._selectedYear);
        root.querySelector(".mmt-year-label").textContent = String(this._selectedYear);
        this._draw(root);
    }

    _stopPlayback() {
        if (this.playTimer) window.clearInterval(this.playTimer);
        this.playTimer = null;
        const button = this._root?.querySelector(".mmt-play");
        if (button) {
            button.textContent = "▶ Play";
            button.setAttribute("aria-pressed", "false");
        }
    }

    async _mapLocations(root, people, signal) {
        const places = [...new Set(people.map(p => String(p.BirthLocation || "").trim()).filter(Boolean))];
        const status = root.querySelector(".mmt-status");
        const uncached = [];
        let lookupFailures = 0;
        for (const place of places) {
            const cached = this._readCache(place);
            if (cached) this._locations.set(place, cached);
            else uncached.push(place);
        }

        let done = places.length - uncached.length;
        this._draw(root);
        status.textContent = `Mapping birth locations: ${done} of ${places.length}`;
        root.querySelector(".mmt-key-note").textContent =
            `${this._people.length} profiles · ${this._yearMin}–${this._yearMax} · ${this._locations.size} locations geocoded`;

        let nextPlace = 0;
        const concurrency = Math.min(4, uncached.length);
        const worker = async () => {
            while (nextPlace < uncached.length) {
                if (signal.aborted) return;
                const place = uncached[nextPlace++];
                try {
                    const coord = await this._geocode(place, signal);
                    if (coord) {
                        this._locations.set(place, coord);
                        this._writeCache(place, coord);
                    }
                } catch (e) {
                    if (signal.aborted || e?.name === "AbortError") return;
                    lookupFailures++;
                    console.error(`Could not geocode "${place}":`, e);
                }
                done++;
                status.textContent = `Mapping birth locations: ${done} of ${places.length}`;
                root.querySelector(".mmt-key-note").textContent =
                    `${this._people.length} profiles · ${this._yearMin}–${this._yearMax} · ${this._locations.size} locations geocoded`;
                if (done === places.length || done % concurrency === 0) this._draw(root);
            }
        };
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
        if (signal.aborted) return;
        this._draw(root);
        status.textContent = `${this._locations.size} of ${places.length} birth locations mapped` +
            (lookupFailures ? `; ${lookupFailures} lookups failed (Photon may be unavailable)` : "");
    }

    async _geocode(place, signal) {
        // Photon is used only for place -> coordinate conversion. Results are cached locally.
        const query = this._normalizePlaceForGeocoding(place);
        const geocoderUrl = ["localhost", "127.0.0.1"].includes(window.location.hostname)
            ? "/photon/"
            : "https://photon.komoot.io/api/";
        const url = `${geocoderUrl}?limit=1&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Photon returned HTTP ${response.status}`);
        const json = await response.json();
        const feature = json?.features?.[0];
        const c = feature?.geometry?.coordinates;
        if (!Array.isArray(c) || c.length < 2) return null;
        const lon = Number(c[0]), lat = Number(c[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { lat, lon };
    }

    _normalizePlaceForGeocoding(place) {
        let normalized = String(place || "").trim()
            .replace(/\bCo\.?(?=\s|,|$)/gi, "County")
            .replace(/\s+/g, " ");
        const countryPattern = /^(?:U\.?S\.?A?\.?|United States(?: of America)?)$/i;
        const parts = normalized.split(",").map(part => part.trim()).filter(Boolean);
        let hasUsCountry = false;
        if (parts.length && countryPattern.test(parts[parts.length - 1])) {
            hasUsCountry = true;
            parts.pop();
        }

        if (/\b(?:colony|colonies|colonial|province)\b/i.test(normalized)) {
            const historicalParts = parts.map(part => part
                .replace(/\([^)]*\)/g, " ")
                .replace(/\b(?:province|colony|colonies|colonial)\b/gi, " ")
                .replace(/\bof\b/gi, " ")
                .replace(/\s+/g, " ")
                .trim());
            const stateNames = new Map(
                Object.values(MigrationMapView.US_STATES).map(name => [name.toLowerCase(), name])
            );
            for (let index = 0; index < historicalParts.length; index++) {
                const candidate = historicalParts[index].toLowerCase();
                const stateName = stateNames.get(candidate) ||
                    MigrationMapView.HISTORICAL_STATE_NAMES[candidate];
                if (!stateName) continue;
                historicalParts[index] = stateName;
                return [...historicalParts.filter(Boolean), "United States"].join(", ");
            }
        }

        let statePart = parts[parts.length - 1] || normalized;
        if (!MigrationMapView.US_STATES[statePart.replace(/\./g, "").trim().toUpperCase()]) {
            const suffix = statePart.match(/^(.*?)\s+([A-Z]{2})\.?$/i);
            if (suffix && MigrationMapView.US_STATES[suffix[2]]) {
                parts[parts.length - 1] = suffix[1].trim();
                parts.push(suffix[2]);
                statePart = suffix[2];
            }
        }
        const stateCode = statePart.replace(/\./g, "").trim().toUpperCase();
        const stateName = MigrationMapView.US_STATES[stateCode];
        if (stateName) {
            if (parts.length) parts[parts.length - 1] = stateName;
            else parts.push(stateName);
            parts.push("United States");
            return parts.join(", ");
        }

        if (hasUsCountry) parts.push("United States");
        return parts.length ? parts.join(", ") : normalized;
    }

    _readCache(place) {
        try {
            const key = this._normalizePlaceForGeocoding(place).toLowerCase();
            const value = JSON.parse(localStorage.getItem("mmt-geocode:v3:" + key));
            return value && Number.isFinite(value.lat) && Number.isFinite(value.lon) ? value : null;
        } catch (e) { return null; }
    }

    _writeCache(place, value) {
        try {
            const key = this._normalizePlaceForGeocoding(place).toLowerCase();
            localStorage.setItem("mmt-geocode:v3:" + key, JSON.stringify(value));
        } catch (e) {}
    }

    _draw(root) {
        const view = root.querySelector(".mmt-view-button.active")?.dataset.view || "atlantic";
        const showPaternal = root.querySelector(".mmt-paternal-toggle").checked;
        const showMaternal = root.querySelector(".mmt-maternal-toggle").checked;
        const line = root.querySelector(".mmt-line").value;
        const bounds = {
            world: [-180,180,-60,85],
            atlantic: [-100,50,15,72],
            "north-america": [-140,-50,15,72],
            europe: [-25,45,32,72],
        }[view];
        root.querySelector(".mmt-basemap").setAttribute("href", `views/migrationMap/maps/${view}.png?v=20260930-europe`);
        const svg = root.querySelector(".mmt-overlay");
        const viewWidth = 1200 / this.zoom;
        const viewHeight = 650 / this.zoom;
        this.panX = Math.max(0, Math.min(1200 - viewWidth, this.panX));
        this.panY = Math.max(0, Math.min(650 - viewHeight, this.panY));
        svg.setAttribute("viewBox", `${this.panX} ${this.panY} ${viewWidth} ${viewHeight}`);
        const trails = root.querySelector(".mmt-trails");
        const points = root.querySelector(".mmt-points");
        trails.innerHTML = ""; points.innerHTML = "";

        const byId = new Map(this._people.map(p => [String(p.Id), p]));
        const familySide = this._familySides;
        const timeVisible = (person) => {
            const birthYear = this._birthYear(person);
            return birthYear === null ? this._selectedYear >= this._yearMax : birthYear <= this._selectedYear;
        };
        const allowed = (person) => {
            const side = familySide.get(String(person.Id));
            const path = this._lineagePaths.get(String(person.Id));
            const sideVisible = person.generation === 0 || (side === "paternal" && showPaternal) || (side === "maternal" && showMaternal);
            return sideVisible && (!line || person.generation === 0 || path?.startsWith(line));
        };

        const [lonMin, lonMax, latMin, latMax] = bounds;
        const geoAspect = (lonMax - lonMin) / (latMax - latMin);
        const frameAspect = 1200 / 650;
        const mapFrame = geoAspect > frameAspect
            ? { x: 0, y: (650 - 1200 / geoAspect) / 2, width: 1200, height: 1200 / geoAspect }
            : { x: (1200 - 650 * geoAspect) / 2, y: 0, width: 650 * geoAspect, height: 650 };
        const proj = p => {
            return {
                x: mapFrame.x + (Number(p.lon) - lonMin) / (lonMax - lonMin) * mapFrame.width,
                y: mapFrame.y + (latMax - Number(p.lat)) / (latMax - latMin) * mapFrame.height,
            };
        };
        const inView = (location) => location && location.lon >= bounds[0] && location.lon <= bounds[1] &&
            location.lat >= bounds[2] && location.lat <= bounds[3];
        const pointsData = this._people.filter((person) =>
            allowed(person) && timeVisible(person) && inView(this._locations.get(String(person.BirthLocation || "").trim()))
        );

        const paternalColors = ["#08306b", "#08519c", "#2171b5", "#4292c6", "#6baed6"];
        const maternalColors = ["#7a0b3e", "#a3145a", "#c9207a", "#e0559b", "#ec86b8"];
        const routePeople = this._people.filter((person) =>
            allowed(person) && timeVisible(person)
        );
        for (const child of routePeople) {
            const childLoc = this._locations.get(String(child.BirthLocation || "").trim());
            if (!childLoc) continue;
            for (const rel of [child.Father, child.Mother]) {
                const parent = byId.get(this._parentId(rel));
                if (!parent || !allowed(parent) || !timeVisible(parent)) continue;
                const parentLoc = this._locations.get(String(parent.BirthLocation || "").trim());
                if (!parentLoc || (!inView(parentLoc) && !inView(childLoc))) continue;
                const a = proj(parentLoc), b = proj(childLoc);
                const distance = Math.hypot(b.x - a.x, b.y - a.y);
                if ([a.x,a.y,b.x,b.y].some(v => !Number.isFinite(v)) || distance < 1) continue;
                const side = familySide.get(String(parent.Id));
                const color = side === "maternal"
                    ? maternalColors[Math.min(Math.max(parent.generation - 1, 0), maternalColors.length - 1)]
                    : paternalColors[Math.min(Math.max(parent.generation - 1, 0), paternalColors.length - 1)];
                const offset = Math.min(32, distance * 0.15);
                const controlX = (a.x + b.x) / 2 - (b.y - a.y) / distance * offset;
                const controlY = (a.y + b.y) / 2 + (b.x - a.x) / distance * offset;
                trails.insertAdjacentHTML("beforeend", `<path class="mmt-route" style="stroke:${color}" d="M ${a.x} ${a.y} Q ${controlX} ${controlY} ${b.x} ${b.y}"><title>${this._escape(this._personDisplayName(parent))} → ${this._escape(this._personDisplayName(child))}</title></path>`);
            }
        }

        for (const p of pointsData) {
            const c = proj(this._locations.get(String(p.BirthLocation || "").trim()));
            const side = familySide.get(String(p.Id));
            const palette = side === "maternal" ? maternalColors : paternalColors;
            const color = side === "root" ? "#f0b400" : palette[Math.min(Math.max(p.generation - 1, 0), palette.length - 1)];
            points.insertAdjacentHTML("beforeend", `<g class="mmt-map-point ${side === "root" ? "mmt-root" : ""}" transform="translate(${c.x},${c.y})" data-id="${this._escape(p.Id)}" style="--person-color:${color}"><circle r="${side === "root" ? 7 : 5}"/><title>${this._escape(this._personDisplayName(p))} — ${this._escape(p.BirthLocation || "")}</title></g>`);
        }

        points.querySelectorAll(".mmt-map-point").forEach(el => el.addEventListener("click", () => {
            const p = byId.get(String(el.dataset.id));
            if (!p) return;
            const url = `https://www.wikitree.com/wiki/${encodeURIComponent(p.Name || "")}`;
            const rows = root.querySelectorAll(".mmt-person");
            rows.forEach(r => r.classList.remove("selected"));
            root.querySelector(`.mmt-person[data-id="${CSS.escape(String(p.Id))}"]`)?.classList.add("selected");
            root.querySelector(".mmt-info").innerHTML = `<strong>${this._escape(this._personDisplayName(p))}</strong> · ${this._escape(p.BirthLocation || "Birth location unknown")} · <a href="${url}" target="_blank" rel="noopener">WikiTree profile</a>`;
        }));

        const rows = root.querySelector(".mmt-rows");
        rows.innerHTML = this._people.slice().sort((a,b) => a.generation-b.generation || String(a.Name).localeCompare(String(b.Name))).map(p => {
            const side = familySide.get(String(p.Id));
            const mapped = this._locations.has(String(p.BirthLocation || "").trim());
            const visible = allowed(p) && timeVisible(p);
            return `<div class="mmt-person ${mapped ? "" : "unmapped"} ${visible ? "" : "mmt-filtered"}" data-id="${this._escape(p.Id)}"><span class="mmt-person-gen">${p.generation}</span><span class="mmt-person-name">${this._escape(this._personDisplayName(p))}</span><span class="mmt-person-place">${this._escape(p.BirthLocation || "Location unknown")}</span><span class="mmt-person-side ${side || ""}">${side === "root" ? "You" : side || ""}</span></div>`;
        }).join("");
        rows.querySelectorAll(".mmt-person").forEach(el => el.addEventListener("click", () => {
            const p = byId.get(String(el.dataset.id));
            if (!p) return;
            root.querySelectorAll(".mmt-person").forEach(r => r.classList.remove("selected")); el.classList.add("selected");
            const url = `https://www.wikitree.com/wiki/${encodeURIComponent(p.Name || "")}`;
            root.querySelector(".mmt-info").innerHTML = `<strong>${this._escape(this._personDisplayName(p))}</strong> · ${this._escape(p.BirthLocation || "Birth location unknown")} · <a href="${url}" target="_blank" rel="noopener">WikiTree profile</a>`;
        }));
    }

    _escape(value) { return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
};
