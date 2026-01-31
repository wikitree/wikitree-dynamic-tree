window.PrinterFriendlyView = class PrinterFriendlyView extends View {
    static APP_ID = "PrinterFriendly";
    WT_DOMAIN = "https://www.wikitree.com";
    PERSON_FIELDS = [
        ...["Id", "Name", "Father", "Mother", "Gender", "Photo"],
        ...["IsLiving", "DataStatus", "BirthDate", "BirthDateDecade", "DeathDate", "DeathDateDecade"],
        ...["Prefix", "FirstName", "RealName", "MiddleName", "Nicknames", "LastNameAtBirth", "LastNameCurrent"],
        ...["BirthLocation", "DeathLocation"],
    ];

    constructor(wtAPI, generationsCount) {
        super();

        this.wtAPI = wtAPI;
        this.generationsCount = generationsCount > 0 ? generationsCount : 1;
        const sharedFormatId = window.DateFormatOptions ? window.DateFormatOptions.getStoredFormatId() : null;
        this.dateFormat = window.DateFormatOptions
            ? window.DateFormatOptions.getFormatValue(sharedFormatId, "wtDate") || "D MMM YYYY"
            : "D MMM YYYY";
        this.dateStatusFormat = window.DateFormatOptions
            ? window.DateFormatOptions.getStoredStatusFormat()
            : "abbreviations";
        this.dateFormatSelectId = "printerFriendlyDateFormat";
        this.dateStatusSelectId = "printerFriendlyDateStatus";
        this.optionsContainerId = "printerFriendlyOptions";
    }

    meta() {
        return {
            title: "Printer Friendly",
            description: "",
            docs: "",
        };
    }

    init(containerSelector, personID) {
        this.containerSelector = containerSelector;
        this.personID = personID;
        this.template = Array(this.generationsCount).fill([]);
        this.renderDateFormatOptions();
        this.loadView(containerSelector, personID);
    }

    close() {
        const select = document.getElementById(this.dateFormatSelectId);
        if (select && this.onDateFormatChange) {
            select.removeEventListener("change", this.onDateFormatChange);
        }
        const statusSelect = document.getElementById(this.dateStatusSelectId);
        if (statusSelect && this.onDateStatusChange) {
            statusSelect.removeEventListener("change", this.onDateStatusChange);
        }
        const optionsContainer = document.getElementById(this.optionsContainerId);
        if (optionsContainer) optionsContainer.remove();
    }

    async loadView(containerSelector, personID) {
        let data = await this.wtAPI.getAncestors(
            PrinterFriendlyView.APP_ID,
            personID,
            this.generationsCount - 1,
            this.PERSON_FIELDS
        );
        this.people = Object.assign({}, ...data.map((x) => ({ [x.Id.toString()]: x })));
        this.dnaAssignments = new Set();

        this.prepareTemplate(this.generationsCount, "O"); // O = origin

        // DNA here is combination of O, F, M letters, //e.g. OF - father, OFM - father's side grandma
        this.assignDNAToPeople(personID, "O");

        this.unknownDNA = Array.from(new Set(this.template.flat())).filter((dna) => {
            return !Object.values(this.people)
                .flatMap((person) => person.dnas || [])
                .includes(dna);
        });

        this.render(containerSelector, personID);
    }

    prepareTemplate(remainingGens, dna) {
        const currGen = this.generationsCount - remainingGens;

        if (this.generationsCount === currGen) return;

        this.template[currGen] = this.template[currGen].concat(Array(2 ** (remainingGens - 1)).fill(`${dna}`));

        if (remainingGens === 0) return;

        this.prepareTemplate(remainingGens - 1, `${dna}F`); // F = father
        this.prepareTemplate(remainingGens - 1, `${dna}M`); // M = mother
    }

    assignDNAToPeople(personID, dna) {
        if (!this.people[personID]) return;
        const assignmentKey = `${personID}:${dna}`;
        if (this.dnaAssignments.has(assignmentKey)) return;
        this.dnaAssignments.add(assignmentKey);

        if (!this.people[personID].dnas) this.people[personID].dnas = [];
        if (!this.people[personID].dnas.includes(dna)) this.people[personID].dnas.push(dna);

        if (this.people[personID].Father) this.assignDNAToPeople(this.people[personID].Father, `${dna}F`);
        if (this.people[personID].Mother) this.assignDNAToPeople(this.people[personID].Mother, `${dna}M`);
    }

    render(containerSelector, personID) {
        let profiles = Object.values(this.people)
            .flatMap((person) => (person.dnas || []).map((dna) => this.renderPerson(person, dna)))
            .join("");

        let unknownProfiles = this.unknownDNA.map((dna) => this.renderUnknownDNA(dna)).join("");

        let subject = this.renderPerson(this.people[personID], "O", true);
        document.querySelector(containerSelector).innerHTML =
            `<div id="subject">${subject}</div><div id="profiles">${profiles}${unknownProfiles}</div>`;

        profiles = document.querySelector(`${containerSelector} #profiles`);

        profiles.style.gridTemplateAreas = this.template[0]
            // switches rows and columns and serializes template to string to be used for css grid
            .map((_, colIndex) => '"' + this.template.map((row) => row[colIndex]).join(" ") + '"')
            .join("\n");
    }

    getDNARelationship(dna) {
        if (dna.length === 1) {
            return Object({ M: "Mother", F: "Father" })[dna];
        } else if (dna.length === 2) {
            return `Grand${this.getDNARelationship(dna.slice(1)).toLowerCase()}`;
        } else if (dna.length > 2) {
            return `G-${this.getDNARelationship(dna.slice(1))}`;
        }
    }

    renderUnknownDNA(dna) {
        return `
            <div style="grid-area: ${dna};" class="unknown-relative g${dna.length}">
                <p>(${this.getDNARelationship(dna.slice(1))})</p>
            </div>`;
    }

    renderPerson(person, dna, isSubject = false) {
        if (!dna || dna.length > this.generationsCount || (dna.length === 1 && !isSubject)) return "";

        const photoUrl = person.PhotoData ? `${this.WT_DOMAIN}/${person.PhotoData.url}` : "";
        const photo = dna.length <= 3 ? `<img src="${photoUrl}" class="photo">` : "";

        let locations = "";

        if (dna.length < 5 && person?.BirthLocation) {
            locations = `<div class="locations">${person.BirthLocation}</div>`;
        }

        const born = `${person?.IsLiving ? "Born " : ""}${this.formatDateWithStatus(person, "BirthDate")}`;
        const died = person?.IsLiving ? "" : ` - ${this.formatDateWithStatus(person, "DeathDate")}`;
        if (isSubject) {
            if (person?.BirthLocation) {
                locations = ` / <div class="locations">${person.BirthLocation}</div>`;
            }
            return `
                ${photo}
                    <h2>
                        Ancestors of ${wtCompleteName(person)} 
                        / ${born}${died} ${locations}
                    </h2>`;
        }
        return `
            <div style="grid-area: ${dna};" class="known-relative g${dna.length}">
                ${photo}
                <div>
                    <h3>${wtCompleteName(person)}</h3>
                    <span>${born}${died}<br>
                    ${locations}</span>
                </div>
            </div>`;
    }

    renderDateFormatOptions() {
        const container = document.querySelector(this.containerSelector);
        if (!container) return;

        const existing = document.getElementById(this.optionsContainerId);
        if (existing) existing.remove();

        const optionsContainer = document.createElement("div");
        optionsContainer.id = this.optionsContainerId;
        optionsContainer.className = "familyViewOptions";
        const selectedFormatId = window.DateFormatOptions ? window.DateFormatOptions.getStoredFormatId() : null;
        const selectedStatusId = window.DateFormatOptions
            ? window.DateFormatOptions.getStoredStatusFormat()
            : this.dateStatusFormat;
        if (window.DateFormatOptions) {
            window.DateFormatOptions.setStoredFormatId(selectedFormatId);
            window.DateFormatOptions.setStoredStatusFormat(selectedStatusId);
        }
        const dateOptionsHtml = window.DateFormatOptions
            ? window.DateFormatOptions.buildFormatOptionsHtml(selectedFormatId)
            : "";
        const statusOptionsHtml = window.DateFormatOptions
            ? window.DateFormatOptions.buildStatusOptionsHtml(selectedStatusId)
            : "";
        optionsContainer.innerHTML = `
            <label for="${this.dateFormatSelectId}">Date Format:</label>
            <select id="${this.dateFormatSelectId}">
                ${dateOptionsHtml}
            </select>
            <label for="${this.dateStatusSelectId}">Date Status:</label>
            <select id="${this.dateStatusSelectId}">
                ${statusOptionsHtml}
            </select>
        `;

        container.parentNode.insertBefore(optionsContainer, container);

        const select = document.getElementById(this.dateFormatSelectId);
        if (!select) return;

        this.onDateFormatChange = (event) => {
            const selectedId = event.target.value;
            if (window.DateFormatOptions) {
                this.dateFormat = window.DateFormatOptions.getFormatValue(selectedId, "wtDate") || this.dateFormat;
                window.DateFormatOptions.setStoredFormatId(selectedId);
            } else {
                const fallbackMap = {
                    dsmy: "D MMM YYYY",
                    smdy: "MMM D, YYYY",
                    mdy: "MMMM D, YYYY",
                    dmy: "D MMMM YYYY",
                    iso: "YYYY-MM-DD",
                    y: "YYYY",
                };
                this.dateFormat = fallbackMap[selectedId] || this.dateFormat;
            }
            if (this.containerSelector && this.personID) {
                this.render(this.containerSelector, this.personID);
            }
        };
        select.addEventListener("change", this.onDateFormatChange);

        const statusSelect = document.getElementById(this.dateStatusSelectId);
        if (statusSelect) {
            this.onDateStatusChange = (event) => {
                this.dateStatusFormat = event.target.value;
                if (window.DateFormatOptions) {
                    window.DateFormatOptions.setStoredStatusFormat(this.dateStatusFormat);
                }
                if (this.containerSelector && this.personID) {
                    this.render(this.containerSelector, this.personID);
                }
            };
            statusSelect.addEventListener("change", this.onDateStatusChange);
        }
    }

    formatDateWithStatus(person, fieldName) {
        const formatted = window.wtDate(person, fieldName, {
            formatString: this.dateFormat,
            withCertainty: false,
        });
        if (!formatted || formatted === "[unknown]") return formatted || "";

        const status = person?.DataStatus?.[fieldName] || "";
        const statusPrefix = window.DateFormatOptions
            ? window.DateFormatOptions.formatStatus(status, this.dateStatusFormat)
            : "";
        if (!statusPrefix) return formatted;
        if (["<", ">", "~"].includes(statusPrefix.trim())) return `${statusPrefix}${formatted}`;
        return `${statusPrefix} ${formatted}`;
    }
};
