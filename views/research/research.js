/*
 * Research View for WikiTree Tree Apps
 * Based on the RootsSearch project by Justin York (York-1423)
 * Adapted and extended for WikiTree Tree Apps
 */

window.ResearchView = class ResearchView extends View {
    static APP_ID = "Research";

    meta() {
        return {
            title: "Research",
            description: "Search other genealogy websites using data from a WikiTree profile.",
            docs: "https://www.wikitree.com/wiki/Help:Research",
            params: []
        };
    }

    init(selector, person_id, params) {
        const profile = person_id;

        WikiTreeAPI.postToAPI({
            appId: ResearchView.APP_ID,
            action: "getPerson",
            key: profile,
            fields: [
                "Name",
                "FirstName",
                "LastNameAtBirth",
                "LastNameCurrent",
                "BirthDate",
                "BirthLocation",
                "DeathDate",
                "DeathLocation",
                "Father",
                "Mother",
                "Spouses",
                "Parents"
            ].join(",")
        }).then((data) => {
            const person = data?.[0]?.person;

            if (!person) {
                wtViewRegistry.showError(`Unable to load profile data for ${profile}.`);
                wtViewRegistry.hideInfoPanel();
                return;
            }

            this.render(selector, person);

            document.getElementById("toggle-search").addEventListener("click", (event) => {
                const panel = document.querySelector("#research-app .research-panel");
                if (!panel) return;
                const isHidden = panel.style.display === "none" || getComputedStyle(panel).display === "none";
                panel.style.display = isHidden ? "block" : "none";
                event.target.textContent = isHidden ? "Hide Search Input" : "Show Search Input";
            });

            document.querySelectorAll(".research-group-toggle").forEach((button) => {
                button.addEventListener("click", () => {
                    const targetId = button.dataset.target;
                    const body = document.getElementById(targetId);
                    const indicator = button.querySelector(".research-group-indicator");

                    if (!body) return;

                    const isOpen = body.classList.toggle("open");

                    if (indicator) {
                        indicator.textContent = isOpen ? "−" : "+";
                    }
                });
            });
        });
    }

    render(selector, person) {
        const birthDate = this.cleanDate(person.BirthDate);
        const deathDate = this.cleanDate(person.DeathDate);

        const father = person.Parents?.[person.Father] || {};
        const mother = person.Parents?.[person.Mother] || {};
        const spouse = Array.isArray(person.Spouses) && person.Spouses.length ? person.Spouses[0] : {};

        const marriageDate = this.cleanDate(spouse.MarriageDate || spouse.marriage_date);
        const marriagePlace = spouse.MarriageLocation || spouse.marriage_location || "";

        document.querySelector(selector).innerHTML = `
            <button id="toggle-search" class="btn btn-pill-sm float-end mt-3 me-3">
                Show Search Input
            </button>
            <div id="research-app" class="container container-fluid px-3 py-3">
                <div class="research-panel">
                    <form id="research-form" class="row g-3">
                        ${this.inputCol("givenName", "First Name", person.FirstName || "")}
                        ${this.inputCol("familyName", "Last Name", person.LastNameAtBirth || person.LastNameCurrent || "")}

                        ${this.inputCol("birthDate", "Birth Date", birthDate)}
                        ${this.inputCol("birthPlace", "Birth Place", person.BirthLocation || "")}

                        ${this.inputCol("deathDate", "Death Date", deathDate)}
                        ${this.inputCol("deathPlace", "Death Place", person.DeathLocation || "")}

                        ${this.inputCol("fatherGivenName", "Father's First Name", father.FirstName || "")}
                        ${this.inputCol("fatherFamilyName", "Father's Last Name", father.LastNameAtBirth || father.LastNameCurrent || "")}

                        ${this.inputCol("motherGivenName", "Mother's First Name", mother.FirstName || "")}
                        ${this.inputCol("motherFamilyName", "Mother's Last Name", mother.LastNameAtBirth || mother.LastNameCurrent || "")}

                        ${this.inputCol("spouseGivenName", "Spouse's First Name", spouse.FirstName || "")}
                        ${this.inputCol("spouseFamilyName", "Spouse's Last Name", spouse.LastNameAtBirth || spouse.LastNameCurrent || "")}

                        ${this.inputCol("marriageDate", "Marriage Date", marriageDate)}
                        ${this.inputCol("marriagePlace", "Marriage Place", marriagePlace)}
                    </form>
                </div>

                <div class="research-search-header mt-5">
                    <p>Research <a href="https://www.wikitree.com/wiki/${person.Name}">${person.FirstName} ${person.LastNameAtBirth || person.LastNameCurrent}</a> on an external website by clicking a search icon below. To easily integrate information back into WikiTree as you research, use the <a href="https://www.wikitree.com/wiki/Space:WikiTree_Sourcer" title="What is the WikiTree Sourcer?">WikiTree Sourcer</a> browser extension instead. <a href="https://www.wikitree.com/wiki/Help:Research" target="Help" title="Open more information about research tools in a new window"><span class="icon--help" data-bs-toggle="tooltip" data-bs-title="More about research tools"></span></a></p>
                </div>

                <div id="research-search-buttons">
                    ${/*this.renderGroupedSiteButtons()*/""}
                    ${this.renderSiteButtons()}
                </div>
            </div>
        `;

        document.querySelectorAll(".research-search-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const siteName = button.dataset.site;
                const site = window.ResearchSites.find((item) => item.name === siteName);

                if (!site) {
                    wtViewRegistry.showError(`Search site not found: ${siteName}`);
                    return;
                }

                const formData = this.getFormData();
                const url = this.buildSearchUrl(site, formData);

                if (url) {
                    window.open(url, "_blank");
                }
            });
        });
    }

    inputCol(id, label, value) {
        return `
            <div class="col-12 col-md-6">
                <label for="${id}" class="form-label">${label}</label>
                <input type="text" class="form-control" id="${id}" name="${id}" value="${this.escapeHtml(value)}">
            </div>
        `;
    }

    searchButton(label, siteName) {
        return `
            <div class="col-12 col-md-6 col-xl-3">
                <button type="button" class="button small research-search-btn" data-site="${this.escapeHtml(siteName)}">
                    <span>${this.escapeHtml(label)}</span>
                    <span class="icon--search"></span>
                </button>
            </div>
        `;
    }

    renderSiteButtons() {
        return `
        <div class="row g-3">
            ${window.ResearchSites.map((site) =>
            this.searchButton(site.label, site.name)
        ).join("")}
        </div>
    `;
    }

    renderGroupedSiteButtons() {
        if (!Array.isArray(window.ResearchSites)) {
            return `<p class="text-danger">No research sites have been configured.</p>`;
        }

        const groups = {};

        window.ResearchSites.forEach((site) => {
            const group = site.group || "General";

            if (!groups[group]) {
                groups[group] = [];
            }

            groups[group].push(site);
        });

        let html = "";

        if (groups.General) {
            html += `
            <div class="row g-3 mb-4">
                ${groups.General.map((site) => this.searchButton(site.label, site.name)).join("")}
            </div>
        `;
        }

        const otherGroups = Object.keys(groups)
            .filter((group) => group !== "General")
            .sort();

        otherGroups.forEach((group, index) => {
            const groupId = `research-group-${index}`;

            html += `
            <div class="research-group">
                <button type="button" class="research-group-toggle" data-target="${groupId}">
                    <span>${this.escapeHtml(group)}</span>
                    <span class="research-group-indicator">+</span>
                </button>

                <div id="${groupId}" class="research-group-body">
                    <div class="row g-3">
                        ${groups[group].map((site) => this.searchButton(site.label, site.name)).join("")}
                    </div>
                </div>
            </div>
        `;
        });

        return html;
    }

    getFormData() {
        const fieldIds = [
            "givenName",
            "familyName",
            "birthDate",
            "birthPlace",
            "deathDate",
            "deathPlace",
            "fatherGivenName",
            "fatherFamilyName",
            "motherGivenName",
            "motherFamilyName",
            "spouseGivenName",
            "spouseFamilyName",
            "marriageDate",
            "marriagePlace"
        ];

        const data = {};

        fieldIds.forEach((id) => {
            data[id] = document.getElementById(id)?.value.trim() || "";
        });

        return data;
    }

    buildSearchUrl(site, data) {
        const utils = {
            getYear: this.getYear.bind(this),

            getYearInt: (value) => {
                const year = parseInt(this.getYear(value), 10);
                return Number.isInteger(year) ? year : null;
            },

            queryString(params) {
                return new URLSearchParams(params).toString();
            }
        };

        if (!site || typeof site.buildUrl !== "function") {
            wtViewRegistry.showError(`Search site is missing buildUrl(): ${site?.name || "unknown"}`);
            return "";
        }

        return site.buildUrl(data, utils);
    }

    cleanDate(value) {
        if (!value || value === "0000-00-00") return "";
        return value;
    }

    getYear(value) {
        if (!value) return "";
        const match = String(value).match(/\d{4}/);
        return match ? match[0] : "";
    }

    escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
};