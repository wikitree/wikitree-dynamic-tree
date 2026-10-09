(function () {
    const APP_ID = "CCWebs";
    const WIKITREE = "https://www.wikitree.com";
    const ID_RE = /[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F_'’-]*-\d+/g;
    const FIELDS =
        "Id,Name,FirstName,RealName,Father,Mother,BioFather,BioMother,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Photo,Gender,IsLiving,PhotoData";
    const BW = 300,
        BH = 64,
        GAPV = 34,
        GAPH = 96;
    const ARROW_PTS = {
        up: [
            [0, -12],
            [9, 0],
            [3, 0],
            [3, 12],
            [-3, 12],
            [-3, 0],
            [-9, 0],
        ],
        down: [
            [0, 12],
            [9, 0],
            [3, 0],
            [3, -12],
            [-3, -12],
            [-3, 0],
            [-9, 0],
        ],
        side: [
            [12, 0],
            [0, -9],
            [0, -3],
            [-12, -3],
            [-12, 3],
            [0, 3],
            [0, 9],
        ],
    };
    const CERT = {
        5: ["icon-dna-none.svg", 16, 25],
        10: ["icon-uncertain.svg", 14, 16],
        20: ["icon-confident.svg", 14, 16],
        30: ["icon-dna-checked.svg", 16, 40],
    };
    const LABELS = {
        parent: { Male: "father", Female: "mother", d: "parent" },
        child: { Male: "son", Female: "daughter", d: "child" },
        spouse: { Male: "husband", Female: "wife", d: "spouse" },
        sibling: { Male: "brother", Female: "sister", d: "sibling" },
    };

    function esc(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            (c) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[c]
        );
    }

    function parseIds(text) {
        const seen = new Set();
        return (String(text || "").match(ID_RE) || []).filter((id) => {
            const key = id.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function normType(type) {
        const t = String(type || "").toLowerCase();
        return t === "bioparent" ? "parent" : t === "biochild" ? "child" : t;
    }

    function sharesOneParent(a, b) {
        return ["Father", "Mother"].filter((key) => a[key] && b[key] && String(a[key]) === String(b[key])).length === 1;
    }

    function sharesAnyParent(a, b) {
        return ["Father", "Mother"].some((key) => a[key] && b[key] && String(a[key]) === String(b[key]));
    }

    function sharedParentIds(a, b) {
        return ["Father", "Mother"]
            .map((key) => (a[key] && b[key] && String(a[key]) === String(b[key]) ? a[key] : 0))
            .filter(Boolean);
    }

    function relLabel(person, previous) {
        const type = normType(person.pathType);
        const labels = LABELS[type];
        if (!labels) return type;
        const base = labels[person.Gender] || labels.d;
        if (type === "sibling" && previous && sharesOneParent(person, previous)) return `½ ${base}`;
        return person.pathStatus == 5 && (type === "parent" || type === "child") ? `adopted ${base}` : base;
    }

    function relDir(type) {
        const t = normType(type);
        return t === "parent" ? "up" : t === "child" ? "down" : "side";
    }

    function pathColours(path) {
        const colours = ["lightgreen"];
        let green = true;
        for (let i = 1; i < path.length; i++) {
            const type = normType(path[i].pathType);
            const previousWasHalfSibling =
                i > 1 && normType(path[i - 1].pathType) === "sibling" && sharesOneParent(path[i - 1], path[i - 2]);
            const remainsBiologicallyConnected =
                type === "child" ||
                (i > 1 &&
                    ((type === "parent" &&
                        sharedParentIds(path[i - 2], path[i - 1]).some((id) => String(id) === String(path[i].Id))) ||
                        (type === "sibling" && sharesAnyParent(path[i], path[i - 2]))));
            const breaksLine =
                type === "spouse" ||
                ((type === "parent" || type === "child") && path[i].pathStatus == 5) ||
                (type === "sibling" && !sharesAnyParent(path[i], path[i - 1])) ||
                (previousWasHalfSibling && !remainsBiologicallyConnected);
            if (breaksLine) green = !green;
            colours.push(green ? "lightgreen" : "lightyellow");
        }
        return colours;
    }

    function turnIndex(path) {
        for (let k = 1; k < path.length - 1; k++) {
            if (relDir(path[k].pathType) === "up" && relDir(path[k + 1].pathType) === "down") return k;
        }
        return -1;
    }

    function sharedSpouseId(path) {
        const k = turnIndex(path);
        if (k < 0) return 0;
        const turningId = path[k].Id;
        const otherParent = (child) =>
            child.Father === turningId ? child.Mother : child.Mother === turningId ? child.Father : 0;
        const a = otherParent(path[k - 1]);
        const b = otherParent(path[k + 1]);
        return a > 0 && a === b ? a : 0;
    }

    function ordinal(number) {
        return (
            number + (number % 100 >= 11 && number % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][number % 10] || "th")
        );
    }

    function greats(count) {
        return count <= 0 ? "" : count <= 2 ? "great-".repeat(count) : `${count}x great-`;
    }

    function familyRelation(path) {
        const directions = path.slice(1).map((person) => relDir(person.pathType));
        const ups = directions.filter((direction) => direction === "up").length;
        const downs = directions.filter((direction) => direction === "down").length;
        if (ups + downs !== directions.length || directions.join(",").includes("down,up")) return "";
        const male = path[path.length - 1].Gender === "Male";
        const female = path[path.length - 1].Gender === "Female";
        const gendered = (m, f, neutral) => (male ? m : female ? f : neutral);
        if (!downs)
            return (
                greats(ups - 2) +
                (ups === 1
                    ? gendered("father", "mother", "parent")
                    : gendered("grandfather", "grandmother", "grandparent"))
            );
        if (!ups)
            return (
                greats(downs - 2) +
                (downs === 1
                    ? gendered("son", "daughter", "child")
                    : gendered("grandson", "granddaughter", "grandchild"))
            );
        const half = !sharedSpouseId(path);
        const halfPrefix = half ? "half-" : "";
        if (ups === 1 && downs === 1)
            return half ? `½ ${gendered("brother", "sister", "sibling")}` : gendered("brother", "sister", "sibling");
        if (ups === 1) return greats(downs - 2) + halfPrefix + gendered("nephew", "niece", "nibling");
        if (downs === 1) return greats(ups - 2) + halfPrefix + gendered("uncle", "aunt", "uncle/aunt");
        const degree = Math.min(ups, downs) - 1;
        const removed = Math.abs(ups - downs);
        return `${half ? "half " : ""}${ordinal(degree)} cousin${removed ? ` ${removed}x removed` : ""}`;
    }

    function year(date) {
        const value = (date || "").slice(0, 4);
        return value && value !== "0000" ? value : "";
    }

    function displayName(person) {
        if (person.Id < 0) return "Private";
        const first = person.FirstName || person.RealName || "";
        const last = person.LastNameAtBirth || person.LastNameCurrent || "";
        return `${first} ${last}`.trim() || person.Name || "Unknown";
    }

    function dates(person) {
        if (person.Id < 0) return "";
        if (person.IsLiving) return "Living";
        const birth = year(person.BirthDate);
        const death = year(person.DeathDate);
        return birth || death ? `${birth} - ${death}` : "";
    }

    function arrowSvg(kind, x, y) {
        return `<polyline fill="orange" stroke="orange" points="${ARROW_PTS[kind]
            .map(([dx, dy]) => `${x + dx},${y + dy}`)
            .join(" ")}"/>`;
    }

    function labelSvg(text, x, y) {
        return `<text class="rel" text-anchor="middle" x="${x}" y="${y}">${esc(text)}</text>`;
    }

    function boxSvg(person, x, y, fill, spouse) {
        const photo =
            person.Id < 0
                ? ""
                : person.PhotoData?.url
                  ? WIKITREE + person.PhotoData.url
                  : `${WIKITREE}/images/icons/${person.Gender === "Female" ? "female" : "male"}.gif`;
        const centerX = x + 50 + (BW - 60) / 2;
        let name = esc(displayName(person));
        if (person.Id > 0 && person.Name) {
            name = `<a href="${WIKITREE}/wiki/${encodeURIComponent(person.Name)}" target="_blank" rel="noopener">${name}</a>`;
        }
        return (
            `<rect x="${x}" y="${y}" rx="10" ry="10" width="${BW}" height="${BH}" fill="${fill}" stroke="black"/>` +
            (photo ? `<image height="40" href="${esc(photo)}" x="${x + 10}" y="${y + 2}"/>` : "") +
            `<text class="nm" text-anchor="middle" x="${centerX}" y="${y + 20}">${name}</text>` +
            `<text class="dt" text-anchor="middle" x="${centerX}" y="${y + 42}">${esc(dates(person))}</text>` +
            (spouse
                ? `<text class="sp" text-anchor="middle" x="${centerX}" y="${y + 58}">&amp; ${esc(spouse)}</text>`
                : "")
        );
    }

    function certSvg(status, x, y) {
        const certainty = CERT[status];
        return certainty
            ? `<image height="${certainty[1]}" href="${WIKITREE}/images/icons/${certainty[0]}" x="${x - certainty[2]}" y="${y}"/>`
            : "";
    }

    function renderMerged(items, tagged, spouseNames) {
        const nodes = new Map();
        const edges = new Map();
        const adjacency = new Map();
        const flip = (direction) => (direction === "up" ? "down" : direction === "down" ? "up" : "side");
        items.forEach((item) => {
            item.path.forEach((person, index) => {
                if (!nodes.has(person.Id)) {
                    nodes.set(person.Id, { person, tags: [], relations: [], turns: [], last: false });
                    adjacency.set(person.Id, []);
                }
                if (!index) return;
                const previous = item.path[index - 1];
                const from = previous.Id;
                const to = person.Id;
                const key = from < to ? `${from}|${to}` : `${to}|${from}`;
                if (edges.has(key)) return;
                const direction = relDir(person.pathType);
                edges.set(key, { from, to, person, previous, direction });
                adjacency.get(from).push({ to, direction });
                adjacency.get(to).push({ to: from, direction: flip(direction) });
            });
            const end = nodes.get(item.path[item.path.length - 1].Id);
            end.last = true;
            if (tagged) {
                end.tags.push(item.n);
                if (item.relation) end.relations.push(item.relation);
            }
            const turningPoint = turnIndex(item.path);
            if (turningPoint > 0) nodes.get(item.path[turningPoint].Id).turns.push(sharedSpouseId(item.path));
        });

        const colours = new Map();
        if (!tagged) {
            pathColours(items[0].path).forEach((colour, index) => colours.set(items[0].path[index].Id, colour));
        }

        const root = items[0].path[0].Id;
        const levels = new Map([[root, 0]]);
        const kids = new Map();
        const queue = [root];
        while (queue.length) {
            const id = queue.shift();
            kids.set(id, []);
            adjacency.get(id).forEach((edge) => {
                if (levels.has(edge.to)) return;
                levels.set(
                    edge.to,
                    levels.get(id) + (edge.direction === "up" ? 1 : edge.direction === "down" ? -1 : 0)
                );
                kids.get(id).push(edge);
                queue.push(edge.to);
            });
        }
        const columns = new Map();
        const occupied = new Set();
        let nextColumn = 0;
        const place = (id) => {
            const childEdges = kids.get(id);
            const vertical = childEdges.filter((edge) => edge.direction !== "side");
            const side = childEdges.filter((edge) => edge.direction === "side");
            let column;
            if (vertical.length) {
                vertical.forEach((edge) => place(edge.to));
                column = columns.get(vertical[0].to);
            } else {
                column = nextColumn++;
            }
            while (occupied.has(`${column},${levels.get(id)}`)) column = nextColumn++;
            occupied.add(`${column},${levels.get(id)}`);
            columns.set(id, column);
            side.forEach((edge) => place(edge.to));
        };
        place(root);

        const ancestors = new Map();
        nodes.forEach((node, id) =>
            ancestors.set(id, adjacency.get(id).filter((edge) => levels.get(edge.to) > levels.get(id)).length)
        );
        nodes.forEach((node, id) => {
            const below = adjacency.get(id).filter((edge) => levels.get(edge.to) < levels.get(id));
            if (!ancestors.get(id) && below.length > 1) {
                const childColumns = below.map((edge) => columns.get(edge.to));
                columns.set(id, (Math.min(...childColumns) + Math.max(...childColumns)) / 2);
            }
        });
        const byLevel = new Map();
        nodes.forEach((node, id) => {
            const level = levels.get(id);
            if (!byLevel.has(level)) byLevel.set(level, []);
            byLevel.get(level).push(id);
        });
        byLevel.forEach((ids) => {
            ids.sort((a, b) => columns.get(a) - columns.get(b));
            for (let index = 1; index < ids.length; index++) {
                if (columns.get(ids[index]) - columns.get(ids[index - 1]) < 1) {
                    columns.set(ids[index], columns.get(ids[index - 1]) + 1);
                }
            }
        });

        const levelValues = [...levels.values()];
        const maxLevel = Math.max(...levelValues);
        const minLevel = Math.min(...levelValues);
        const maxColumn = Math.max(...columns.values());
        const x = (id) => 10 + columns.get(id) * (BW + GAPH);
        const y = (id) => 10 + (maxLevel - levels.get(id)) * (BH + GAPV);
        let svg = "";
        edges.forEach((edge) => {
            const person = edge.person;
            const label = relLabel(person, edge.previous);
            const from = edge.from;
            const to = edge.to;
            if (levels.get(from) === levels.get(to)) {
                const left = x(from) < x(to) ? from : to;
                const right = left === from ? to : from;
                const x1 = x(left) + BW;
                const x2 = x(right);
                const midY = y(from) + BH / 2;
                if (normType(person.pathType) === "spouse") {
                    svg +=
                        `<line x1="${x1}" y1="${midY - 4}" x2="${x2}" y2="${midY - 4}" stroke="red" stroke-width="3"/>` +
                        `<line x1="${x1}" y1="${midY + 4}" x2="${x2}" y2="${midY + 4}" stroke="red" stroke-width="3"/>`;
                } else {
                    svg += `<line x1="${x1}" y1="${midY}" x2="${x2}" y2="${midY}" stroke="blue" stroke-width="3"/>`;
                }
                svg += arrowSvg("side", x(to) + 25, y(to) + BH / 2) + labelSvg(label, (x1 + x2) / 2, midY - 8);
                svg += certSvg(person.pathStatus, x(to) + BW, y(to) + 2);
            } else {
                const upper = levels.get(from) > levels.get(to) ? from : to;
                const lower = upper === from ? to : from;
                const upperX = x(upper) + BW / 2;
                const lowerX = x(lower) + BW / 2;
                const topY = y(upper) + BH;
                const bottomY = y(lower);
                const middleY = topY + GAPV / 2;
                svg += `<polyline fill="none" stroke="rgb(10,108,24)" stroke-width="2" points="${upperX},${topY} ${upperX},${middleY} ${lowerX},${middleY} ${lowerX},${bottomY}"/>`;
                const kind = levels.get(to) > levels.get(from) ? "up" : "down";
                svg += arrowSvg(kind, x(to) + 25, topY + GAPV / 2) + labelSvg(label, x(to) + BW / 2, bottomY - 4);
                svg += certSvg(person.pathStatus, x(to) + BW, topY + 2);
            }
        });
        nodes.forEach((node, id) => {
            const fill = tagged
                ? id === root
                    ? "#ffff00"
                    : node.last
                      ? "lightgreen"
                      : "lightyellow"
                : colours.get(id) || "lightgreen";
            const spouse =
                node.turns.length && node.turns.every((id) => id && id === node.turns[0])
                    ? spouseNames[node.turns[0]]
                    : "";
            svg += boxSvg(node.person, x(id), y(id), fill, spouse);
            if (node.tags.length) {
                svg += `<text x="${x(id) + BW - 6}" y="${y(id) + BH - 6}" text-anchor="end" font-size="13" font-weight="bold" fill="#064">#${node.tags.join(", #")}</text>`;
            }
            if (node.relations.length) {
                svg += `<text x="${x(id) + BW / 2}" y="${y(id) + BH + 15}" text-anchor="middle" font-size="14" font-weight="bold" fill="darkgreen">${esc([...new Set(node.relations)].join("; "))}</text>`;
            }
        });
        const width = 10 + maxColumn * (BW + GAPH) + BW + 10;
        const height = 10 + (maxLevel - minLevel + 1) * (BH + GAPV) - GAPV + 10 + (tagged ? 18 : 0);
        return `<div class="ccw-diagram"><svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svg}</svg></div>`;
    }

    function summary(path) {
        const colours = pathColours(path);
        const cls = (index) => (colours[index] === "lightgreen" ? "hlg" : "hl");
        const end = path.length - 1;
        let html =
            `<b class="${cls(end)}">${esc(displayName(path[end]))}</b> is ` +
            `<span class="${cls(0)}">${esc(displayName(path[0]))}'s</span>`;
        let start = 1;
        while (start <= end) {
            let stop = start;
            while (stop < end && colours[stop + 1] === colours[start]) stop++;
            const labels = [];
            for (let index = start; index <= stop; index++) labels.push(relLabel(path[index], path[index - 1]));
            const text = simplifyFamilyRelationships(`(${labels.join("'s ")})`);
            html += ` <span class="${cls(start)}">${esc(text)}${stop === end ? "" : "'s"}</span>`;
            start = stop + 1;
        }
        return html + "!";
    }

    function summaryB(path, spouseNames = {}) {
        const relation = familyRelation(path);
        if (!relation) return summary(path);
        const turn = turnIndex(path);
        const topIndex = turn >= 0 ? turn : relDir(path[1].pathType) === "up" ? path.length - 1 : 0;
        const colours = pathColours(path);
        const cls = (index) => (colours[index] === "lightgreen" ? "hlg" : "hl");
        const end = path.length - 1;
        const spouseId = sharedSpouseId(path);
        const spouseName = spouseId ? spouseNames[spouseId] : "";
        const ancestors =
            `<span class="${cls(topIndex)}">${esc(displayName(path[topIndex]))}</span>` +
            (spouseName ? ` and <span class="${cls(topIndex)}">${esc(spouseName)}</span>` : "");
        return (
            `<b class="${cls(end)}">${esc(displayName(path[end]))}</b> is ` +
            `<span class="${cls(0)}">${esc(displayName(path[0]))}</span>'s ` +
            `<span class="${cls(end)}">${esc(relation)}</span> ` +
            `<span class="hint">(common ancestor${spouseName ? "s" : ""}: ${ancestors})</span>`
        );
    }

    function samePath(a, b) {
        return a.length === b.length && a.every((person, index) => person.Id === b[index].Id);
    }

    function addStyles() {
        if (document.getElementById("ccwebs-view-styles")) return;
        const style = document.createElement("style");
        style.id = "ccwebs-view-styles";
        style.textContent = `
            #ccwebs-view { color: #333; font-family: Arial, Helvetica, sans-serif; }
            #ccwebs-view h2 { font-size: 1.15em; margin: 10px 0; }
            #ccwebs-view .ccw-form label { display: block; font-weight: bold; margin-top: 8px; }
            #ccwebs-view .ccw-form input[type="text"], #ccwebs-view .ccw-form textarea { max-width: 700px; width: 100%; }
            #ccwebs-view .ccw-form textarea { height: 90px; }
            #ccwebs-view .ccw-hint, #ccwebs-view .hint { color: #777; font-size: .85em; }
            #ccwebs-view .ccw-status { margin: 10px 0; color: #555; }
            #ccwebs-view .ccw-error { color: #b00; }
            #ccwebs-view #ccw-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0; border-bottom: 2px solid #ccc; }
            #ccwebs-view #ccw-tabs button { margin: 0; min-width: 40px; padding: 6px 12px; border: 1px solid #ccc; border-bottom: 0; border-radius: 6px 6px 0 0; background: #eee; font-weight: bold; }
            #ccwebs-view #ccw-tabs button.active { background: #fff; border-color: #888; position: relative; top: 2px; border-bottom: 2px solid #fff; }
            #ccwebs-view #ccw-tabs button.bad { color: #b00; }
            #ccwebs-view .ccw-result { display: none; margin: 0 0 20px; }
            #ccwebs-view .ccw-result.active { display: block; }
            #ccwebs-view .ccw-diagram { border: 2px solid green; border-radius: 12px; background: #fff; padding: 4px; overflow-x: auto; max-width: 100%; }
            #ccwebs-view .ccw-diagram a { fill: #000; text-decoration: underline; }
            #ccwebs-view .ccw-diagram .nm { font-size: 17px; font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif; }
            #ccwebs-view .ccw-diagram .sp { font-size: 14px; }
            #ccwebs-view .ccw-diagram .dt { font-size: 16px; }
            #ccwebs-view .ccw-diagram .rel { font-size: 15px; font-weight: bold; fill: orange; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
            #ccwebs-view .ccw-summary { margin-top: 10px; color: #777; font-size: 1.05em; }
            #ccwebs-view .ccw-summary b { color: #555; }
            #ccwebs-view .ccw-summary .hl { background: #ffffe0; }
            #ccwebs-view .ccw-summary .hlg { background: lightgreen; }
            #ccwebs-view .ccw-toolbar { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
            #ccwebs-view .ccw-diagram svg { max-width: none; }
            #ccwebs-view details { margin-top: 6px; }
            #ccwebs-view .g2g-title { font-size: larger; color: orange; background-color: black; }
        `;
        document.head.appendChild(style);
    }

    window.CCWebsView = class CCWebsView extends View {
        constructor() {
            super();
            this.runId = 0;
        }

        meta() {
            return {
                title: "Connection Checkers Web",
                description:
                    "Visualize the shortest and common-ancestor connection paths between a primary profile and this week's Connection Checkers profiles.",
                docs: "",
                params: ["cc"],
            };
        }

        init(containerSelector, personId, params = {}) {
            condLog("Initializing the Connection Checkers view...");
            this.runId++;
            addStyles();
            this.container = document.querySelector(containerSelector);
            if (!this.container) throw new Error("Could not find the Connection Checkers view container.");
            const selectedId = document.querySelector("#wt-id-text")?.value || String(personId);
            this.container.innerHTML = `
                <section id="ccwebs-view">
                    <div class="ccw-form">
                        <label for="ccw-game-url">Connection Checkers game page URL</label>
                        <input type="text" id="ccw-game-url" placeholder="https://www.wikitree.com/g2g/...">
                        <button type="button" class="btn btn-secondary btn-sm" id="ccw-find-game">Find this week's game</button>
                        <button type="button" class="btn btn-secondary btn-sm" id="ccw-fetch-ids">Get WikiTree IDs from page</button>
                        <span id="ccw-get-status" class="ccw-hint" role="status"></span>
                        <div id="ccw-game-info" hidden>
                            <strong class="g2g-title"id="ccw-game-title"></strong>
                            <a class="btn btn-secondary btn-sm" id="ccw-view-g2g" target="_blank" rel="noopener noreferrer">View G2G post</a>
                        </div>
                        <details>
                            <summary>Paste game page source if browser access is blocked</summary>
                            <textarea id="ccw-page-source" aria-label="Connection Checkers page source"></textarea>
                            <button type="button" class="btn btn-secondary btn-sm" id="ccw-parse-source">Parse pasted source</button>
                        </details>
                             <!-- <label for="ccw-primary">Primary person's WikiTree ID</label>
                            <input type="text" id="ccw-primary" placeholder="e.g. Windsor-1"> -->
                        <label for="ccw-ids">Check out the web of Connections with these people:</label>
                        <textarea id="ccw-ids" placeholder="Paste WikiTree IDs, profile links, or the game page text"></textarea>
                        <div class="ccw-hint">IDs are extracted from pasted text or WikiTree profile links. Up to 12 profiles are used.</div>
                        <button type="button" class="btn btn-primary" id="ccw-show">Show connections</button>
                    </div>
                    <div id="ccw-progress" class="ccw-status" role="status"></div>
                    <div id="ccw-out"></div>
                </section>`;
            const root = this.container.querySelector("#ccwebs-view");
            // root.querySelector("#ccw-primary").value = selectedId;
            if (params.cc) root.querySelector("#ccw-ids").value = this.withoutExcluded(params.cc.split(",")).join("\n");
            root.querySelector("#ccw-show").addEventListener("click", () => this.run());
            root.querySelector("#ccw-find-game").addEventListener("click", () => this.findCurrentGame());
            root.querySelector("#ccw-fetch-ids").addEventListener("click", () => this.fetchGameIds());
            root.querySelector("#ccw-parse-source").addEventListener("click", () => this.parsePastedSource());
            if (params.cc) this.run();
            this.findCurrentGame();
            condLog("Connection Checkers view initialized.");
        }

        get root() {
            return this.container?.querySelector("#ccwebs-view");
        }

        // IDs that must not appear in the list: the primary person and the logged-in user.
        withoutExcluded(ids) {
            const excluded = new Set(
                [
                    document.querySelector("#wt-id-text")?.value.match(ID_RE)?.[0],
                    window.wtViewRegistry?.session?.lm?.user?.name,
                ]
                    .filter(Boolean)
                    .map((id) => String(id).toLowerCase())
            );
            return ids.filter((id) => !excluded.has(id.toLowerCase()));
        }

        parsePastedSource() {
            const root = this.root;
            if (!root) return;
            const ids = this.withoutExcluded(parseIds(root.querySelector("#ccw-page-source").value));
            if (!ids.length) {
                this.setFetchStatus("No WikiTree profile IDs were found in the pasted source.", true);
                return;
            }
            root.querySelector("#ccw-ids").value = ids.join("\n");
            this.setFetchStatus(
                `Found ${ids.length} profile IDs${ids.length > 12 ? "; only the first 12 will be used" : ""}.`
            );
        }

        setFetchStatus(message, error = false) {
            const status = this.root?.querySelector("#ccw-get-status");
            if (!status) return;
            status.textContent = message;
            status.classList.toggle("ccw-error", error);
        }

        async findCurrentGame() {
            condLog("Looking for this week's game on the WikiTree home page...");
            this.setFetchStatus("Looking for this week's game on the WikiTree home page...");
            try {
                const response = await fetch(`${WIKITREE}/`, { credentials: "include" });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const html = await response.text();
                const documentFragment = new DOMParser().parseFromString(html, "text/html");
                const gameLink = [...documentFragment.querySelectorAll("a[href]")].find((anchor) => {
                    const href = anchor.getAttribute("href") || "";
                    return /connection checkers/i.test(anchor.textContent) && /\/g2g\//i.test(href);
                });
                if (!gameLink) {
                    this.setFetchStatus(
                        "Could not find the Connection Checkers link on the WikiTree home page. Enter the game URL manually.",
                        true
                    );
                    return;
                }
                const url = new URL(gameLink.getAttribute("href"), WIKITREE).href;
                this.root.querySelector("#ccw-game-url").value = url;
                await this.fetchGameIds();
            } catch (error) {
                this.setFetchStatus(
                    `The browser could not read the WikiTree home page (${error.message}). Enter the game URL manually. If needed, open that game page and paste its source below.`,
                    true
                );
                console.error(
                    "Error fetching the WikiTree home page:",
                    error,
                    `The browser could not read the WikiTree home page (${error.message}). Enter the game URL manually. If needed, open that game page and paste its source below.`
                );
            }
        }

        async fetchGameIds() {
            const root = this.root;
            const url = root?.querySelector("#ccw-game-url").value.trim();
            if (!url) {
                this.setFetchStatus("Enter the game page URL first.", true);
                return;
            }
            let parsed;
            try {
                parsed = new URL(url);
            } catch {
                this.setFetchStatus("Enter a valid WikiTree game-page URL.", true);
                return;
            }
            if (!["http:", "https:"].includes(parsed.protocol) || !/(^|\.)wikitree\.com$/i.test(parsed.hostname)) {
                this.setFetchStatus("Please enter a wikitree.com URL.", true);
                return;
            }
            this.setFetchStatus("Reading the game page...");
            try {
                const response = await fetch(parsed.href, { credentials: "include" });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const html = await response.text();
                const ids = this.withoutExcluded(parseIdsFromHtml(html));
                if (!ids.length) {
                    this.setFetchStatus("No WikiTree profile IDs were found on that page.", true);
                    return;
                }
                root.querySelector("#ccw-ids").value = ids.join("\n");
                const pageTitle = new DOMParser()
                    .parseFromString(html, "text/html")
                    .querySelector("h1")
                    ?.textContent.trim();
                const gameInfo = root.querySelector("#ccw-game-info");
                root.querySelector("#ccw-game-title").textContent = pageTitle || "";
                root.querySelector("#ccw-view-g2g").href = parsed.href;
                gameInfo.hidden = false;
                this.setFetchStatus(
                    `Found ${ids.length} profile IDs${ids.length > 12 ? "; only the first 12 will be used" : ""}.`
                );
            } catch (error) {
                this.setFetchStatus(
                    `The browser could not read that page (${error.message}). Open the game page, copy its page source into the box above, then choose "Parse pasted source".`,
                    true
                );
            }
        }

        async fetchConnection(primary, target, relation) {
            const response = await WikiTreeAPI.postToAPI({
                action: "getConnections",
                appId: APP_ID,
                keys: [primary, target],
                relation,
                fields: FIELDS,
            });
            const result = Array.isArray(response) ? response[0] : response;
            if (!result) throw new Error("WikiTree returned an empty connection response.");
            return result;
        }

        async run() {
            condLog("Running the connection checkers ...");
            const root = this.root;
            if (!root) return;
            const primary = document.querySelector("#wt-id-text").value.match(ID_RE)?.[0];
            if (!primary) {
                document.querySelector("#ccw-progress").innerHTML =
                    '<span class="ccw-error">Enter the primary WikiTree ID (for example Windsor-1).</span>';
                return;
            }
            let ids = parseIds(document.querySelector("#ccw-ids").value).filter(
                (id) => id.toLowerCase() !== primary.toLowerCase()
            );
            if (!ids.length) {
                document.querySelector("#ccw-progress").innerHTML =
                    '<span class="ccw-error">Paste the Connection Checkers profile IDs first.</span>';
                return;
            }
            let note = "";
            if (ids.length > 12) {
                ids = ids.slice(0, 12);
                note = " (using the first 12 profiles)";
            }

            const runId = ++this.runId;
            const output = document.querySelector("#ccw-out");
            const progress = document.querySelector("#ccw-progress");
            output.innerHTML = "";
            const results = new Array(ids.length);
            const common = new Array(ids.length);
            const jobs = [];
            ids.forEach((id, index) => {
                jobs.push([index, 0]);
                jobs.push([index, 2]);
            });
            let completed = 0;
            let nextJob = 0;
            progress.textContent = `Loading 0 of ${jobs.length}${note}`;
            const worker = async () => {
                while (nextJob < jobs.length) {
                    const [index, relation] = jobs[nextJob++];
                    try {
                        const result = await this.fetchConnection(primary, ids[index], relation);
                        (relation === 2 ? common : results)[index] = result;
                    } catch (error) {
                        (relation === 2 ? common : results)[index] = { status: `Request failed: ${error.message}` };
                    }
                    completed++;
                    if (runId === this.runId && this.root)
                        progress.textContent = `Loading ${completed} of ${jobs.length}${note}`;
                }
            };
            await Promise.all([worker(), worker(), worker()]);
            if (runId !== this.runId || !this.root) return;

            const spouseIds = new Set();
            common.forEach((result) => {
                if (result && !result.status && result.path?.length > 1) {
                    const spouseId = sharedSpouseId(result.path);
                    if (spouseId) spouseIds.add(spouseId);
                }
            });
            const spouseNames = {};
            let spouseWarning = "";
            if (spouseIds.size) {
                try {
                    const peopleResponse = await WikiTreeAPI.postToAPI({
                        action: "getPeople",
                        appId: APP_ID,
                        keys: [...spouseIds],
                        fields: "Id,Name,FirstName,RealName,LastNameAtBirth",
                    });
                    const peopleResult = Array.isArray(peopleResponse) ? peopleResponse[0] : peopleResponse;
                    if (!peopleResult || peopleResult.status || !peopleResult.people) {
                        spouseWarning = `WikiTree did not return spouse profile details${peopleResult?.status ? `: ${peopleResult.status}` : "."}`;
                    } else {
                        Object.values(peopleResult.people).forEach((person) => {
                            const name =
                                `${person.FirstName || person.RealName || ""} ${person.LastNameAtBirth || ""}`.trim();
                            if (name) spouseNames[person.Id] = name;
                        });
                    }
                } catch (error) {
                    spouseWarning = `Could not load common-ancestor spouse names: ${error.message}`;
                }
            }
            progress.textContent = "";
            this.renderResults(output, ids, results, common, spouseNames);
            if (spouseWarning) {
                progress.textContent = spouseWarning;
                progress.classList.add("ccw-error");
            } else {
                progress.classList.remove("ccw-error");
            }
        }

        renderResults(output, ids, results, common, spouseNames) {
            let tabs =
                '<div class="ccw-toolbar"><span class="ccw-zoom"><button type="button" class="btn btn-secondary btn-sm" data-zoom="out" title="Zoom out" aria-label="Zoom out">&minus;</button> <button type="button" class="btn btn-secondary btn-sm" data-zoom="in" title="Zoom in" aria-label="Zoom in">+</button> <button type="button" class="btn btn-secondary btn-sm" data-zoom="fit" title="Fit diagram to the window">Fit</button> <button type="button" class="btn btn-secondary btn-sm" data-zoom="reset" title="Actual size">100%</button></span> <span class="ccw-save">Save: <button type="button" class="btn btn-secondary btn-sm" data-format="png">PNG</button> <button type="button" class="btn btn-secondary btn-sm" data-format="svg">SVG</button> <button type="button" class="btn btn-secondary btn-sm" data-format="pdf">PDF</button></span></div><div id="ccw-tabs">';
            let body = "";
            let index = 0;
            const addTab = (label, id, result, heading) => {
                const path = result.path || [];
                const valid = !result.status && path.length > 1;
                const name = valid ? displayName(path[path.length - 1]) : id;
                tabs += `<button type="button" data-index="${index}" class="${valid ? "" : "bad"}" title="${esc(name + heading)}">${label}</button>`;
                body += `<div class="ccw-result"><h2>${label}. ${esc(name)} <span class="hint">${esc(id)}${esc(heading)} &middot; ${
                    valid ? `${path.length - 1} steps` : "no path"
                }</span></h2>${
                    valid
                        ? renderMerged([{ n: label, path }], false, spouseNames) +
                          `<div class="ccw-summary">${heading ? summaryB(path, spouseNames) : summary(path)}</div>`
                        : `<div class="ccw-error">${esc(result.status || "No connection path found (the profile may be private or unconnected).")}</div>`
                }</div>`;
                index++;
            };
            const bItems = [];
            ids.forEach((id, profileIndex) => {
                const shortest = results[profileIndex] || {};
                addTab(profileIndex + 1, id, shortest, "");
                const commonResult = common[profileIndex] || {};
                const commonPath = commonResult.path || [];
                if (!commonResult.status && commonPath.length > 1 && !samePath(commonPath, shortest.path || [])) {
                    addTab(`${profileIndex + 1}B`, id, commonResult, " (through a common ancestor)");
                    bItems.push({
                        n: `${profileIndex + 1}B`,
                        path: commonPath,
                        relation:
                            familyRelation(commonPath) ||
                            simplifyFamilyRelationships(
                                `(${commonPath
                                    .slice(1)
                                    .map((person, i) => relLabel(person, commonPath[i]))
                                    .join("'s ")})`
                            ),
                    });
                }
            });
            if (bItems.length) {
                tabs += `<button type="button" data-index="${index}" title="All common-ancestor paths combined">All Bs</button>`;
                body += `<div class="ccw-result"><h2>All Bs <span class="hint">${bItems.length} combined paths through common ancestors (green boxes are labelled with their tab)</span></h2>${renderMerged(
                    bItems,
                    true,
                    spouseNames
                )}</div>`;
                index++;
            }
            output.innerHTML = tabs + "</div>" + body;
            const show = (tabIndex) => {
                output
                    .querySelectorAll("#ccw-tabs button")
                    .forEach((button) => button.classList.toggle("active", Number(button.dataset.index) === tabIndex));
                output
                    .querySelectorAll(".ccw-result")
                    .forEach((result, resultIndex) => result.classList.toggle("active", resultIndex === tabIndex));
            };
            output
                .querySelectorAll("#ccw-tabs button")
                .forEach((button) => button.addEventListener("click", () => show(Number(button.dataset.index))));
            show(0);
            output
                .querySelectorAll(".ccw-toolbar button[data-format]")
                .forEach((button) =>
                    button.addEventListener("click", () => this.saveDiagramImage(button.dataset.format))
                );
            output.querySelectorAll(".ccw-toolbar button[data-zoom]").forEach((button) =>
                button.addEventListener("click", () => {
                    const action = button.dataset.zoom;
                    if (action === "fit" || action === "reset") this.zoom = action === "fit" ? "fit" : 1;
                    else {
                        const current = this.currentScale();
                        this.zoom = Math.min(4, Math.max(0.1, current * (action === "in" ? 1.25 : 0.8)));
                    }
                    this.applyZoom();
                })
            );
            this.zoom = this.zoom || 1;
            if (!this.resizeHandler) {
                this.resizeHandler = () => this.zoom === "fit" && this.applyZoom();
                window.addEventListener("resize", this.resizeHandler);
            }
            output.querySelector("#ccw-tabs").addEventListener("click", () => this.applyZoom());
            this.applyZoom();
        }

        currentScale() {
            const svg = this.root?.querySelector(".ccw-result.active svg");
            if (!svg) return 1;
            if (this.zoom !== "fit") return this.zoom;
            return svg.getBoundingClientRect().width / Number(svg.getAttribute("width")) || 1;
        }

        applyZoom() {
            const svg = this.root?.querySelector(".ccw-result.active svg");
            if (!svg) return;
            const width = Number(svg.getAttribute("width"));
            const height = Number(svg.getAttribute("height"));
            let scale = this.zoom;
            if (scale === "fit") {
                const frame = svg.parentElement;
                const available = frame.clientWidth - 12;
                const top = frame.getBoundingClientRect().top;
                const availableHeight = Math.max(200, window.innerHeight - Math.max(top, 0) - 90);
                scale = Math.max(0.05, Math.min(available / width, availableHeight / height));
            }
            svg.style.width = `${width * scale}px`;
            svg.style.height = `${height * scale}px`;
        }

        close() {
            this.runId++;
            if (this.resizeHandler) window.removeEventListener("resize", this.resizeHandler);
            this.resizeHandler = null;
        }

        async saveDiagramImage(format = "png") {
            const svg = this.root?.querySelector(".ccw-result.active svg");
            if (!svg) return;
            const tab = this.root.querySelector("#ccw-tabs button.active")?.textContent || "diagram";
            const clone = svg.cloneNode(true);
            clone.removeAttribute("style");
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
            const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
            style.textContent = `
                text { fill: #000; font-family: Arial, Helvetica, sans-serif; }
                a { text-decoration: underline; }
                .nm { font-size: 17px; font-family: 'Arial Narrow', Arial, sans-serif; }
                .sp { font-size: 14px; }
                .dt { font-size: 16px; }
                .rel { font-size: 15px; font-weight: bold; fill: orange; paint-order: stroke; stroke: #fff; stroke-width: 4px; }`;
            clone.insertBefore(style, clone.firstChild);
            const toDataUrl = (blob) =>
                new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            // Embed images so the canvas isn't tainted; drop any that can't be loaded.
            await Promise.all(
                [...clone.querySelectorAll("image")].map(async (image) => {
                    try {
                        const response = await fetch(image.getAttribute("href"));
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        image.setAttribute("href", await toDataUrl(await response.blob()));
                    } catch {
                        image.remove();
                    }
                })
            );
            const width = Number(svg.getAttribute("width"));
            const height = Number(svg.getAttribute("height"));
            const markup = new XMLSerializer().serializeToString(clone);
            const baseName = `connection-checkers-${tab.replace(/\s+/g, "-")}`;
            const download = (blob, extension) => {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `${baseName}.${extension}`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            };
            if (format === "svg") {
                download(new Blob([markup], { type: "image/svg+xml" }), "svg");
                return;
            }
            const scale = 2;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = width * scale;
                canvas.height = height * scale;
                const context = canvas.getContext("2d");
                context.fillStyle = "#fff";
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.drawImage(img, 0, 0, canvas.width, canvas.height);
                if (format === "png") {
                    canvas.toBlob((blob) => blob && download(blob, "png"), "image/png");
                    return;
                }
                canvas.toBlob(
                    async (blob) => {
                        if (!blob) return;
                        download(
                            buildPdf(
                                new Uint8Array(await blob.arrayBuffer()),
                                canvas.width,
                                canvas.height,
                                width,
                                height
                            ),
                            "pdf"
                        );
                    },
                    "image/jpeg",
                    0.95
                );
            };
            img.onerror = () => this.setFetchStatus("Could not create the image.", true);
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);
        }
    };

    function parseIdsFromHtml(html) {
        const ids = [];
        const seen = new Set();
        const add = (id) => {
            const key = id.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                ids.push(id);
            }
        };
        const documentFragment = new DOMParser().parseFromString(html, "text/html");
        documentFragment.querySelectorAll("a[href]").forEach((anchor) => {
            try {
                const url = new URL(anchor.href, WIKITREE);
                const match = url.pathname.match(/\/wiki\/([^/]+-\d+)\/?$/i);
                if (match) add(decodeURIComponent(match[1]));
            } catch {
                // Ignore malformed links; continue parsing valid profile URLs.
            }
        });
        if (!ids.length) parseIds(html).forEach(add);
        return ids;
    }

    // Minimal single-page PDF wrapping a JPEG; the page is sized to the diagram (in points).
    function buildPdf(jpeg, pixelWidth, pixelHeight, pageWidth, pageHeight) {
        const encoder = new TextEncoder();
        const chunks = [];
        const offsets = [];
        let length = 0;
        const add = (data) => {
            const bytes = typeof data === "string" ? encoder.encode(data) : data;
            chunks.push(bytes);
            length += bytes.length;
        };
        const object = (number, body) => {
            offsets[number] = length;
            add(`${number} 0 obj\n${body}\nendobj\n`);
        };
        const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`;
        add("%PDF-1.4\n");
        object(1, "<< /Type /Catalog /Pages 2 0 R >>");
        object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
        object(
            3,
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
        );
        offsets[4] = length;
        add(
            `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
        );
        add(jpeg);
        add("\nendstream\nendobj\n");
        object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
        const xref = length;
        add(`xref\n0 6\n0000000000 65535 f \n`);
        for (let i = 1; i <= 5; i++) add(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
        add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
        return new Blob(chunks, { type: "application/pdf" });
    }

    function condLog() {}

    function simplifyFamilyRelationships(chain) {
        const simplified = simplifyChain(chain);
        if (!chain || simplified !== chain || !/^\([^()]*\)$/.test(chain)) return simplified;
        // Nothing was simplified: drop the first component and try to simplify the rest.
        const parts = chain.slice(1, -1).split("'s ");
        if (parts.length < 2) return simplified;
        return `${parts[0]}'s ${simplifyFamilyRelationships(`(${parts.slice(1).join("'s ")})`)}`;
    }

    function simplifyChain(chain) {
        if (!chain) return "";
        let thisHalfPrefix = "";
        const isHalfRelationship = false;
        // console.log("Starting to simplify family relationships for chain:", chain);
        // Remove redundant "'s " at the end of the chain
        chain = chain.replace(/'s $/, "");

        // Remove consecutive "'s " occurrences
        chain = chain.replace(/'s 's /g, "'s ");

        // get all (strings) of relationships
        var relationships = chain.match(/\(.*?\)/g);
        let halfPrefix = "½ ";
        // console.log("Extracted relationships from chain:", relationships);
        // Go through them one by one, and convert them to simpler forms if possible
        for (let index = 0; relationships && index < relationships.length; index++) {
            const element = relationships[index];
            condLog(element);

            // CASE 1: No simplification possible, keep as is
            if (element.indexOf(" ") == -1) {
                let revisedElement = element.replace("(", "").replace(")", "");
                chain = chain.replace(element, revisedElement);
            } else {
                // SOME simplification possible, handle accordingly
                // FIRST .. remove brackets
                let revisedElement = element.replace("(", "").replace(")", "");

                // SECOND .. make the relation's pieces more generic
                revisedElement = revisedElement.replace(/bio-mother's/g, "parent's");
                revisedElement = revisedElement.replace(/bio-father's/g, "parent's");
                revisedElement = revisedElement.replace(/mother's/g, "parent's");
                revisedElement = revisedElement.replace(/father's/g, "parent's");
                revisedElement = revisedElement.replace(/brother's/g, "sibling's");
                revisedElement = revisedElement.replace(/sister's/g, "sibling's");
                revisedElement = revisedElement.replace(/son's/g, "child's");
                revisedElement = revisedElement.replace(/daughter's/g, "child's");
                revisedElement = revisedElement.replace(/husband's/g, "spouse's");
                revisedElement = revisedElement.replace(/wife's/g, "spouse's");
                let numParents = (revisedElement.match(/parent's/g) || []).length;
                let numSiblings = (revisedElement.match(/sibling's/g) || []).length;
                let numChildren = (revisedElement.match(/child's/g) || []).length;
                let numSpouses = (revisedElement.match(/spouse's/g) || []).length;
                let numSpaces = (revisedElement.match(/ /g) || []).length;
                condLog({ numParents });
                condLog({ numChildren });
                condLog({ numSiblings });
                condLog({ numSpouses });
                condLog({ numSpaces });

                condLog({ revisedElement });
                condLog("sibling:", revisedElement.indexOf("sibling"));
                // THIRD ... based on the counts of generic relationships, further simplify if possible

                if (revisedElement.indexOf(halfPrefix) !== -1 && numSpaces == 1) {
                    chain = chain.replace(element, revisedElement);
                } else if (numParents > 0 && numSiblings + numChildren + numSpouses == 0) {
                    // a DIRECT ANCESTOR (or Aunt/Uncle)
                    revisedElement = revisedElement.replace(/parent's/g, "").trim();
                    if (revisedElement == "mother" || revisedElement == "father") {
                        if (numParents == 1) {
                            revisedElement = "grand" + revisedElement;
                        } else if (numParents == 2) {
                            revisedElement = "great grand" + revisedElement;
                        } else {
                            revisedElement = numParents - 1 + "x great grand" + revisedElement;
                        }
                        chain = chain.replace(element, revisedElement);
                    } else if (
                        revisedElement == "brother" ||
                        revisedElement == "sister" ||
                        revisedElement == halfPrefix + "brother" ||
                        revisedElement == halfPrefix + "sister"
                    ) {
                        thisHalfPrefix = "";
                        if (revisedElement.includes(halfPrefix)) {
                            thisHalfPrefix = halfPrefix;
                        }
                        if (revisedElement.includes("brother")) {
                            revisedElement = "uncle";
                        } else if (revisedElement.includes("sister")) {
                            revisedElement = "aunt";
                        }

                        if (numParents == 1) {
                            // If the uncle/aunt, no additional prefix is needed.
                        } else if (numParents == 2) {
                            revisedElement = "grand" + revisedElement;
                        } else if (numParents == 3) {
                            revisedElement = "great grand" + revisedElement;
                        } else {
                            revisedElement = numParents - 2 + "x great grand" + revisedElement;
                        }
                        revisedElement = thisHalfPrefix + revisedElement;
                        chain = chain.replace(element, revisedElement);
                    }
                } else if (numChildren > 0 && numParents + numSiblings + numSpouses == 0) {
                    // a DIRECT DESCENDANT
                    revisedElement = revisedElement.replace(/child's/g, "").trim();
                    if (revisedElement == "son" || revisedElement == "daughter") {
                        if (numChildren == 1) {
                            revisedElement = "grand" + revisedElement;
                        } else if (numChildren == 2) {
                            revisedElement = "great grand" + revisedElement;
                        } else {
                            revisedElement = numChildren - 1 + "x great grand" + revisedElement;
                        }
                        chain = chain.replace(element, revisedElement);
                    }
                } else if (
                    numChildren > 0 &&
                    numSiblings == 1 &&
                    numParents + numSpouses == 0 &&
                    (revisedElement.indexOf("sibling") == 0 || revisedElement.indexOf(halfPrefix + "sibling") == 0)
                ) {
                    thisHalfPrefix = "";
                    if (revisedElement.includes(halfPrefix + "sibling")) {
                        thisHalfPrefix = halfPrefix;
                    }

                    // a NIECE OR NEPHEW
                    revisedElement = revisedElement
                        .replace(/child's/g, "")
                        .replace(/sibling's/, "")
                        .replace(halfPrefix, "")
                        .trim();
                    if (revisedElement == "son" || revisedElement == "daughter") {
                        if (revisedElement == "son") {
                            revisedElement = "nephew";
                        } else if (revisedElement == "daughter") {
                            revisedElement = "niece";
                        }
                        if (numChildren == 1) {
                            revisedElement = "grand" + revisedElement;
                        } else if (numChildren == 2) {
                            revisedElement = "great grand" + revisedElement;
                        } else {
                            revisedElement = numChildren - 1 + "x great grand" + revisedElement;
                        }
                        revisedElement = thisHalfPrefix + revisedElement;
                        chain = chain.replace(element, revisedElement);
                    }
                } else if (revisedElement == "parent's brother") {
                    revisedElement = "uncle";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "parent's sister") {
                    revisedElement = "aunt";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "parent's ½ brother") {
                    revisedElement = "½ uncle";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "parent's ½ sister") {
                    revisedElement = "½ aunt";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "sibling's son") {
                    revisedElement = "nephew";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "sibling's daughter") {
                    revisedElement = "niece";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "½ sibling's son") {
                    revisedElement = "½ nephew";
                    chain = chain.replace(element, revisedElement);
                } else if (revisedElement == "½ sibling's daughter") {
                    revisedElement = "½ niece";
                    chain = chain.replace(element, revisedElement);
                } else {
                    // handle other cases if necessary - mostly Cousins
                    // simplify chain into clusters
                    let clusterPattern = element.replace(/parent/g, "P");
                    clusterPattern = clusterPattern.replace(/father/g, "P");
                    clusterPattern = clusterPattern.replace(/mother/g, "P");
                    clusterPattern = clusterPattern.replace(/sibling/g, "S");
                    clusterPattern = clusterPattern.replace(/brother/g, "S");
                    clusterPattern = clusterPattern.replace(/sister/g, "S");
                    clusterPattern = clusterPattern.replace(/child/g, "C");
                    clusterPattern = clusterPattern.replace(/daughter/g, "C");
                    clusterPattern = clusterPattern.replace(/son/g, "C");
                    clusterPattern = clusterPattern.replace(/ /g, "");
                    clusterPattern = clusterPattern.replace(/\(/g, "");
                    clusterPattern = clusterPattern.replace(/\)/g, "");
                    clusterPattern = clusterPattern.replace(/'s/g, "");
                    condLog("Cluster Pattern: ", clusterPattern);

                    let prevLength = clusterPattern.length;
                    let corePattern = clusterPattern.replace(/PP/g, "P").replace(/SS/g, "S").replace(/CC/g, "C");
                    let currLength = corePattern.length;
                    while (currLength < prevLength) {
                        prevLength = currLength;
                        corePattern = corePattern.replace(/PP/g, "P").replace(/SS/g, "S").replace(/CC/g, "C");
                        currLength = corePattern.length;
                    }
                    condLog("Core Pattern: ", corePattern);
                    if (corePattern == "bio-PSC") {
                        corePattern = "PSC";
                    } else if (corePattern == "bio-PC") {
                        corePattern = "PC";
                    }
                    let numParents = (clusterPattern.match(/P/g) || []).length;
                    let numSiblings = (clusterPattern.match(/S/g) || []).length;
                    let numChildren = (clusterPattern.match(/C/g) || []).length;

                    if (corePattern === "PSC" || corePattern === "P½SC") {
                        condLog("Core Pattern #s: ", numParents, numSiblings, numChildren);
                        // parent(s) + sibling + child(ren) --> some form of cousin (or half cousin if the sibling is a 1/2 sibling)

                        thisHalfPrefix = "";
                        if (corePattern.includes("½")) {
                            thisHalfPrefix = halfPrefix;
                        }

                        if (numSiblings == 1) {
                            revisedElement = " cousin";
                            condLog("Identified as cousin based on core pattern.");
                            let cousinType = Math.min(numParents, numChildren);
                            condLog("Cousin Type: ", cousinType);
                            let numRemoved = Math.max(numParents, numChildren) - cousinType;
                            revisedElement =
                                (cousinType == 1
                                    ? "1st"
                                    : cousinType == 2
                                      ? "2nd"
                                      : cousinType == 3
                                        ? "3rd"
                                        : cousinType + "th") + " cousin";
                            if (numRemoved > 0) {
                                revisedElement += " " + (numRemoved == 1 ? "once" : numRemoved + "x") + " removed";
                            }
                            revisedElement = thisHalfPrefix + revisedElement;
                            chain = chain.replace(element, revisedElement);
                        }
                    } else if (corePattern === "PC" && numParents > 1 && numChildren > 1) {
                        // parent child relationship, like you get from getConnections when restricting to descending from common ancestor
                        thisHalfPrefix = "";
                        if (isHalfRelationship == true) {
                            thisHalfPrefix = "½ ";
                        }
                        condLog("Core Pattern #s: ", numParents, numSiblings, numChildren);
                        let cousinType = Math.min(numParents, numChildren);
                        condLog("Cousin Type: ", cousinType);
                        let numRemoved = Math.max(numParents, numChildren) - cousinType;
                        revisedElement =
                            (cousinType == 2
                                ? "1st"
                                : cousinType == 3
                                  ? "2nd"
                                  : cousinType == 4
                                    ? "3rd"
                                    : cousinType - 1 + "th") + " cousin";
                        if (numRemoved > 0) {
                            revisedElement += " " + (numRemoved == 1 ? "once" : numRemoved + "x") + " removed";
                        }
                        revisedElement = thisHalfPrefix + revisedElement;
                        chain = chain.replace(element, revisedElement);
                    } else if (corePattern === "S") {
                        // revisedElement = "sibling";
                    } else if (corePattern === "C") {
                        // revisedElement = "child";
                    }
                }
            }
        }

        // chain = chain.replace(/mother's brother/g, "uncle");
        // chain = chain.replace(/father's brother/g, "uncle");
        // chain = chain.replace(/mother's sister/g, "aunt");
        // chain = chain.replace(/father's sister/g, "aunt");

        // console.log("Final simplified chain:", chain);
        return chain;
    }
})();
