window.LineageMatrixView = class LineageMatrixView extends View {
    static APP_ID = "LineageMatrix";
    static PROFILE_FIELDS = [
        "Id",
        "Name",
        "Derived.ShortName",
        "FirstName",
        "LastNameAtBirth",
        "Gender",
        "BirthDate",
        "DeathDate",
        "Father",
        "Mother",
        "Spouses",
    ];
    static DEFAULT_GENERATIONS = 5;
    static MIN_GENERATIONS = 2;
    static MAX_GENERATIONS = 10;

    constructor() {
        super();
        this.people = new Map();
        this.closed = false;
        this.rootId = null;
        this.statusMessage = "";
        this.loadRequestId = 0;
        this.generationCount = LineageMatrixView.DEFAULT_GENERATIONS;
    }

    meta() {
        return {
            title: "Lineage Matrix",
            description:
                `What is a 'Lineage Matrix'? See <a href=https://www.wikitree.com/wiki/Space:Lineage_Matrix>the documentation</a> for more details.`,
            docs: "https://www.wikitree.com/wiki/Space:Lineage_Matrix",
        };
    }

    async init(containerSelector, personId) {
        this.close();
        this.people = new Map();
        this.closed = false;
        this.rootId = String(personId);
        this.statusMessage = "";
        this.loadRequestId = 0;
        this.generationCount = LineageMatrixView.DEFAULT_GENERATIONS;
        this.container = document.querySelector(containerSelector);
        this.container.innerHTML = `
            <section class="lineage-matrix" aria-label="Lineage Matrix">
                <label class="lineage-matrix__generation-control">
                    Generations:
                    <select class="lineage-matrix__generation-count" aria-label="Number of generations">
                        ${Array.from(
                            { length: LineageMatrixView.MAX_GENERATIONS - LineageMatrixView.MIN_GENERATIONS + 1 },
                            (_, index) => LineageMatrixView.MIN_GENERATIONS + index
                        )
                            .map((count) => `<option value="${count}"${count === this.generationCount ? " selected" : ""}>${count}</option>`)
                            .join("")}
                    </select>
                </label>
                <p class="lineage-matrix__status" role="status">Loading the selected person's family...</p>
                <div class="lineage-matrix__scroller"></div>
            </section>`;
        this.container.addEventListener("change", this.onChange);
        this.container.addEventListener("click", this.onClick);
        wtViewRegistry.setInfoPanel(this.meta().description);
        wtViewRegistry.showInfoPanel();

        await this.loadGenerations(this.generationCount, true);
    }

    onChange = (event) => {
        if (!event.target.matches(".lineage-matrix__generation-count")) return;
        const generationCount = Number(event.target.value);
        if (!Number.isInteger(generationCount) || generationCount < LineageMatrixView.MIN_GENERATIONS || generationCount > LineageMatrixView.MAX_GENERATIONS) {
            this.setStatus(`Choose between ${LineageMatrixView.MIN_GENERATIONS} and ${LineageMatrixView.MAX_GENERATIONS} generations.`);
            return;
        }
        this.generationCount = generationCount;
        this.loadGenerations(generationCount);
    };

    onClick = (event) => {
        const cell = event.target.closest(".lineage-matrix__family-cell[data-person-id]");
        if (!cell || cell.dataset.personId === this.rootId) return;
        this.rootId = cell.dataset.personId;
        this.loadGenerations(this.generationCount);
    };

    close() {
        if (this.container) {
            this.container.removeEventListener("change", this.onChange);
            this.container.removeEventListener("click", this.onClick);
        }
        this.closed = true;
        this.loadRequestId++;
    }

    addPeople(people) {
        for (const person of Object.values(people || {})) {
            if (person?.Id != null) {
                const id = String(person.Id);
                this.people.set(id, { ...this.people.get(id), ...person });
            }
        }
    }

    async loadSpouses(people, requestId) {
        const relatedIds = people.flatMap((person) => this.getSpouseEntries(person).map(({ id }) => id));
        const spouseIds = new Set(relatedIds.filter((id) => !this.people.has(id)));
        if (!spouseIds.size) return;

        try {
            const [status, , spouses] = await WikiTreeAPI.getPeople(
                LineageMatrixView.APP_ID,
                [...spouseIds],
                LineageMatrixView.PROFILE_FIELDS,
                { limit: 1000 }
            );
            if (status) throw new Error(status);
            if (requestId === this.loadRequestId) this.addPeople(spouses);
        } catch (error) {
            console.error("Lineage Matrix failed to load spouse profiles:", error);
            wtViewRegistry.showWarning("Some spouse profiles could not be loaded.");
        }
    }

    async loadGenerations(generationCount, isInitialLoad = false) {
        const requestId = ++this.loadRequestId;
        this.setStatus(`Loading ${generationCount} generations...`);
        try {
            const [status, , people] = await WikiTreeAPI.getPeople(
                LineageMatrixView.APP_ID,
                [this.rootId],
                LineageMatrixView.PROFILE_FIELDS,
                { descendants: generationCount - 1, limit: 1000 }
            );
            if (requestId !== this.loadRequestId || this.closed) return;
            if (status) throw new Error(status);
            if (!people || !Object.keys(people).length) throw new Error(`No family data was returned for profile ${this.rootId}.`);

            this.people = new Map();
            this.addPeople(people);
            await this.loadSpouses(Object.values(people), requestId);
            if (requestId !== this.loadRequestId || this.closed) return;
            if (!this.people.has(this.rootId)) throw new Error(`The starting profile ${this.rootId} was not returned.`);

            this.setStatus(`${generationCount} generations · ${this.people.size} people`);
            this.render();
        } catch (error) {
            if (requestId !== this.loadRequestId || this.closed) return;
            console.error("Lineage Matrix failed to load generations:", error);
            const message = `Unable to load ${generationCount} generations. Please try again.`;
            this.setStatus(message);
            if (isInitialLoad) {
                wtViewRegistry.showError(`Lineage Matrix could not load family data for profile ${this.rootId}.`);
            } else {
                wtViewRegistry.showWarning(message);
            }
        }
    }

    setStatus(message) {
        this.statusMessage = message;
        const status = this.container?.querySelector(".lineage-matrix__status");
        if (status) status.textContent = message;
    }

    render() {
        if (!this.container || this.closed) return;
        const scroller = this.container.querySelector(".lineage-matrix__scroller");
        const generations = this.getGenerations();
        const columns = [];
        const rowByPersonId = new Map();
        const rowsByGeneration = new Map();
        let nextRow = 1;
        const spouseRows = new Map();
        const spouseRowByUnion = new Map();

        for (const [generationNumber, generationPeople] of generations) {
            const personColumn = { type: "generation", generationNumber, people: generationPeople };
            columns.push(personColumn);
            const generationRows = [];
            const nextGenerationPeople = generations[generationNumber]?.[1] || [];
            for (const person of generationPeople) {
                const personId = String(person.Id);
                rowByPersonId.set(personId, nextRow);
                generationRows.push({ person, isSpouse: false, row: nextRow++ });
                for (const spouse of this.getGenerationSpouses(person, nextGenerationPeople)) {
                    generationRows.push({ person: spouse, isSpouse: true, row: nextRow });
                    spouseRowByUnion.set(`${person.Id}|${spouse.Id}`, nextRow);
                    spouseRows.set(nextRow++, generationNumber);
                }
            }
            rowsByGeneration.set(generationNumber, generationRows);

            if (generationNumber < generations.length) {
                const childIds = new Set(nextGenerationPeople.map((person) => String(person.Id)));
                for (const person of generationPeople) {
                    for (const union of this.getUnions(person, nextGenerationPeople, childIds).filter((u) => u.children.length)) {
                        columns.push({
                            type: "family",
                            generationNumber,
                            person,
                            spouseId: union.spouseId,
                            spouse: this.people.get(union.spouseId) || union.spouse,
                            children: union.children,
                        });
                    }
                }
            }
        }

        const grid = document.createElement("div");
        grid.className = "lineage-matrix__grid";
        grid.setAttribute("role", "table");
        grid.setAttribute("aria-label", "Generations connected by spouse and family columns");
        grid.style.setProperty("--column-count", columns.length);
        grid.style.setProperty("--person-count", nextRow - 1);

        const connectors = new Map();
        const diamonds = new Map();
        const personCells = new Map();
        const familyCells = new Map();
        const highlights = new Map();
        const parentLinks = new Map();
        const generationColumnIndex = new Map();
        columns.forEach((column, columnIndex) => {
            if (column.type === "generation") generationColumnIndex.set(column.generationNumber, columnIndex);
        });

        columns.forEach((column, columnIndex) => {
            if (column.type === "generation") {
                for (const entry of rowsByGeneration.get(column.generationNumber) || []) {
                    const person = entry.person;
                    const personId = String(person.Id);
                    const row = document.createElement("div");
                    row.className = `lineage-matrix__person-cell${entry.isSpouse ? " is-spouse" : ""}${personId === this.rootId ? " is-focus" : ""}`;
                    row.setAttribute("role", "rowheader");
                    row.style.gridColumn = String(columnIndex + 1);
                    row.style.gridRow = String(entry.row);
                    row.append(this.createGenderSymbol(person), this.createPersonLink(person));
                    if (!entry.isSpouse) personCells.set(personId, row);
                    grid.append(row);
                }
                return;
            }

            const parentRow = rowByPersonId.get(String(column.person.Id));
            const childColumn = generationColumnIndex.get(column.generationNumber + 1);
            const childRows = column.children.map((child) => rowByPersonId.get(String(child.Id)));
            const lastRow = Math.max(...childRows);
            const color = "#000";
            const connect = (col, row, ...sides) => {
                const key = `${col},${row}`;
                if (!connectors.has(key)) connectors.set(key, { col, row, sides: new Map() });
                sides.forEach((side) => connectors.get(key).sides.set(side, color));
            };

            // Elbow lines: along the parent's row into this union column, down the column's right edge,
            // then along each child's row to the child's generation column.
            for (let col = generationColumnIndex.get(column.generationNumber) + 1; col < columnIndex; col++) {
                connect(col, parentRow, "bottom");
            }
            // The parent's diamond sits on the person's row and a circle on the matching spouse's row.
            const spouseRow = spouseRowByUnion.get(`${column.person.Id}|${column.spouseId}`);
            // The column runs through the whole child generation, so no cell along it is ever missing.
            const nextRows = rowsByGeneration.get(column.generationNumber + 1) || [];
            const columnEnd = Math.max(lastRow, nextRows.length ? nextRows[nextRows.length - 1].row : lastRow);
            for (let row = parentRow; row <= columnEnd; row++) connect(columnIndex, row, "right");
            diamonds.set(`${columnIndex},${parentRow}`, {
                kind: "parent",
                personId: String(column.person.Id),
                label: `${this.personName(column.person.Id)} and ${column.spouse?.ShortName || "an unknown spouse"} family`,
            });
            if (spouseRow) {
                diamonds.set(`${columnIndex},${spouseRow}`, {
                    kind: "spouse",
                    label: `${column.spouse?.ShortName || "Spouse"} is the spouse in this family`,
                });
            }
            // Cells lit when the parent is hovered: the column down to the last child, and each child's row across to their name.
            const parentId = String(column.person.Id);
            if (!highlights.has(parentId)) highlights.set(parentId, { keys: new Set(), personIds: new Set() });
            const highlight = highlights.get(parentId);
            for (let row = parentRow; row <= lastRow; row++) highlight.keys.add(`${columnIndex},${row}`);
            for (let col = generationColumnIndex.get(column.generationNumber) + 1; col < columnIndex; col++) {
                highlight.keys.add(`${col},${parentRow}`);
            }
            for (let i = 0; i < column.children.length; i++) {
                const row = childRows[i];
                const keys = new Set();
                for (let col = generationColumnIndex.get(column.generationNumber) + 1; col < columnIndex; col++) keys.add(`${col},${parentRow}`);
                for (let r = parentRow; r <= row; r++) keys.add(`${columnIndex},${r}`);
                for (let col = columnIndex; col < childColumn; col++) {
                    highlight.keys.add(`${col},${row}`);
                    keys.add(`${col},${row}`);
                }
                highlight.personIds.add(String(column.children[i].Id));
                parentLinks.set(String(column.children[i].Id), { parentId, keys });
            }
            for (let i = 0; i < column.children.length; i++) {
                const row = childRows[i];
                for (let col = columnIndex; col < childColumn; col++) connect(col, row, "bottom");
                diamonds.set(`${columnIndex},${row}`, {
                    kind: "child",
                    label: `${this.personName(column.children[i].Id)} is a child of ${this.personName(column.person.Id)} and ${column.spouse?.ShortName || "an unknown spouse"}`,
                });
            }
        });

        for (const [key, diamond] of diamonds) {
            const [col, row] = key.split(",").map(Number);
            if (!connectors.has(key)) connectors.set(key, { col, row, sides: new Map() });
            Object.assign(connectors.get(key), diamond);
        }
        for (const { col, row, sides, label, kind, personId } of connectors.values()) {
            const cell = document.createElement("div");
            cell.className = `lineage-matrix__family-cell${label ? " has-diamond" : ""}${[...sides.keys()].map((side) => ` b-${side}`).join("")}`;
            for (const [side, color] of sides) cell.style.setProperty(`--line-${side}`, color);
            cell.setAttribute("role", "cell");
            cell.style.gridColumn = String(col + 1);
            cell.style.gridRow = String(row);
            if (label) {
                cell.setAttribute("aria-label", label);
                if (kind === "parent") {
                    cell.dataset.personId = personId;
                    cell.title = "Make this person the starting point";
                }
                const marker = document.createElement("span");
                marker.className = `lineage-matrix__family-${kind === "child" ? "star" : kind === "spouse" ? "circle" : "diamond is-parent"}`;
                marker.setAttribute("aria-hidden", "true");
                if (kind === "child") marker.textContent = "★";
                cell.append(marker);
            }
            familyCells.set(`${col},${row}`, cell);
            grid.append(cell);
        }

        for (const [personId, personCell] of personCells) {
            const lit = new Set([personCell]);
            const below = highlights.get(personId);
            if (below) {
                below.keys.forEach((key) => lit.add(familyCells.get(key)));
                below.personIds.forEach((id) => lit.add(personCells.get(id)));
            }
            // Follow the path back up through each parent to the top of the chain.
            const seen = new Set([personId]);
            for (let link = parentLinks.get(personId); link && !seen.has(link.parentId); link = parentLinks.get(link.parentId)) {
                seen.add(link.parentId);
                lit.add(personCells.get(link.parentId));
                link.keys.forEach((key) => lit.add(familyCells.get(key)));
            }
            lit.delete(undefined);
            const toggle = (on) => lit.forEach((cell) => cell.classList.toggle("is-highlighted", on));
            personCell.addEventListener("mouseenter", () => toggle(true));
            personCell.addEventListener("mouseleave", () => toggle(false));
        }

        if (!this.statusMessage) this.statusMessage = `${this.people.size} people loaded`;
        scroller.replaceChildren(grid);
        // Whole-pixel column widths keep every 1px border crisp and consistent.
        const measured = getComputedStyle(grid).gridTemplateColumns.split(" ").map(parseFloat);
        if (measured.length === columns.length && measured.every(Number.isFinite)) {
            grid.style.gridTemplateColumns = measured.map((width) => `${Math.ceil(width)}px`).join(" ");
        }
        this.setStatus(this.statusMessage);
    }

    getGenerations() {
        const generations = [];
        const shown = new Set([this.rootId]);
        let currentGeneration = [this.people.get(this.rootId)].filter(Boolean);

        while (currentGeneration.length) {
            generations.push(currentGeneration);
            const nextGeneration = [];
            for (const person of currentGeneration) {
                for (const child of this.getChildren(String(person.Id))) {
                    const childId = String(child.Id);
                    if (shown.has(childId)) continue;
                    shown.add(childId);
                    nextGeneration.push(child);
                }
            }
            nextGeneration.sort((a, b) =>
                this.birthYear(a) - this.birthYear(b) ||
                this.personName(a.Id).localeCompare(this.personName(b.Id), undefined, { sensitivity: "base" })
            );
            currentGeneration = nextGeneration;
        }

        return generations.map((people, index) => [index + 1, people]);
    }

    getChildren(parentId) {
        return [...this.people.values()]
            .filter((person) => String(person.Id) !== parentId &&
                (String(person.Father || "") === parentId || String(person.Mother || "") === parentId))
            .sort((a, b) => this.birthYear(a) - this.birthYear(b) ||
                this.personName(a.Id).localeCompare(this.personName(b.Id), undefined, { sensitivity: "base" }));
    }

    getSpouseEntries(person) {
        return Object.entries(person?.Spouses || {})
            .map(([key, spouse]) => {
                const spouseId = spouse?.Id ?? (typeof spouse === "object" ? key : spouse);
                if (spouseId == null || String(spouseId) === String(person.Id)) return null;
                return { id: String(spouseId), person: typeof spouse === "object" ? spouse : null };
            })
            .filter(Boolean)
            .sort((a, b) => this.marriageKey(a.person).localeCompare(this.marriageKey(b.person)));
    }

    marriageKey(spouse) {
        const date = spouse?.marriage_date;
        return date && date !== "0000-00-00" ? date : "9999";
    }

    getGenerationSpouses(person, nextGenerationPeople) {
        const spouses = new Map(
            this.getSpouseEntries(person).map(({ id, person: spouse }) => [
                id,
                this.people.get(id) || spouse,
            ])
        );
        const personId = String(person.Id);
        for (const child of nextGenerationPeople) {
            if (String(child.Father || "") !== personId && String(child.Mother || "") !== personId) continue;
            const spouseId = String(child.Father || "") === personId
                ? String(child.Mother || "")
                : String(child.Father || "");
            if (spouseId && spouseId !== personId && !spouses.has(spouseId)) {
                spouses.set(spouseId, this.people.get(spouseId) || { Id: spouseId });
            }
        }
        return [...spouses.values()].filter(Boolean);
    }

    getUnions(person, nextGenerationPeople, childIds) {
        const personId = String(person.Id);
        const spouses = new Map(this.getSpouseEntries(person).map((spouse) => [spouse.id, spouse.person]));
        const children = nextGenerationPeople.filter((child) =>
            String(child.Father || "") === personId || String(child.Mother || "") === personId
        );

        for (const child of children) {
            const otherParent = String(child.Father || "") === personId
                ? String(child.Mother || "")
                : String(child.Father || "");
            if (otherParent && !spouses.has(otherParent)) spouses.set(otherParent, this.people.get(otherParent));
        }

        const hasUnassignedChildren = children.some((child) => {
            const otherParent = String(child.Father || "") === personId
                ? String(child.Mother || "")
                : String(child.Father || "");
            return !otherParent;
        });
        if (children.length && (!spouses.size || (spouses.size > 1 && hasUnassignedChildren))) spouses.set("", null);
        return [...spouses].map(([spouseId, spouse]) => ({
            spouseId,
            spouse,
            children: children.filter((child) => {
                if (!childIds.has(String(child.Id))) return false;
                const otherParent = String(child.Father || "") === personId
                    ? String(child.Mother || "")
                    : String(child.Father || "");
                return otherParent ? spouseId === otherParent : !spouseId || spouses.size === 1;
            }),
        }));
    }

    birthYear(person) {
        const year = Number.parseInt(person.BirthDate, 10);
        return Number.isFinite(year) ? year : Number.MAX_SAFE_INTEGER;
    }

    genderClass(person) {
        if (person.Gender === "Male") return "is-male";
        if (person.Gender === "Female") return "is-female";
        return "is-unknown";
    }

    createGenderSymbol(person) {
        const imageUrl = {
            Male: "https://www.wikitree.com/images/icons/male.gif",
            Female: "https://www.wikitree.com/images/icons/female.gif",
        }[person.Gender];
        if (!imageUrl) {
            const unknown = document.createElement("span");
            unknown.className = "lineage-matrix__gender is-unknown";
            unknown.setAttribute("role", "img");
            unknown.setAttribute("aria-label", "Gender not specified");
            unknown.title = "Gender not specified";
            unknown.textContent = "?";
            return unknown;
        }

        const image = document.createElement("img");
        image.className = `lineage-matrix__gender ${this.genderClass(person)}`;
        image.src = imageUrl;
        image.alt = person.Gender;
        image.title = person.Gender;
        return image;
    }

    createPersonLink(person) {
        const link = document.createElement("a");
        link.className = "lineage-matrix__person-link";
        link.textContent = this.personName(person.Id);
        if (person.Name) {
            link.href = `https://www.wikitree.com/wiki/${encodeURIComponent(person.Name)}`;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }
        return link;
    }

    personName(id) {
        const person = this.people.get(String(id));
        return person?.ShortName || `Profile ${id}`;
    }
};
