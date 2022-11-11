window.PrinterFriendlyView = class PrinterFriendlyView extends View {
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
    }

    meta() {
        return {
            title: "Printer Friendly",
            description: "",
            docs: "",
        };
    }

    init(containerSelector, personID) {
        this.template = Array(this.generationsCount).fill([]);
        this.loadView(containerSelector, personID);
    }

    async loadView(containerSelector, personID) {
        console.log("personID: ", personID);
        await this.wtAPI.getAncestors(personID, this.generationsCount - 1, this.PERSON_FIELDS);
        this.people = Object.assign({}, ...data.map((x) => ({ [x.Id.toString()]: x })));

        this.prepareTemplate(this.generationsCount, "O"); // O = origin

        // DNA here is combination of O, F, M letters, //e.g. OF - father, OFM - father's side grandma
        this.assignDNAToPeople(personID, "O");

        this.unknownDNA = Array.from(new Set(this.template.flat())).filter(
            (dna) =>
                !Object.values(this.people)
                    .map((person) => person.dna)
                    .includes(dna)
        );

        this.render(containerSelector);
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
        this.people[personID]["dna"] = dna;

        if (this.people[personID].Father) this.assignDNAToPeople(this.people[personID].Father, `${dna}F`);
        if (this.people[personID].Mother) this.assignDNAToPeople(this.people[personID].Mother, `${dna}M`);
    }

    render(containerSelector) {
        let profiles = Object.values(this.people)
            .map((person) => this.renderPerson(person))
            .join("");

        let unknownProfiles = this.unknownDNA.map((dna) => this.renderUnknownDNA(dna)).join("");

        document.querySelector(containerSelector).innerHTML = `<div id="profiles">${profiles}${unknownProfiles}</div>`;

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
            <div style="grid-area: ${dna};" class="unknown-relative">
                <p>(${this.getDNARelationship(dna.slice(1))})</p>
            </div>`;
    }

    renderPerson(person) {
        if (!person.dna || person.dna.length > this.generationsCount) return "";

        const photoUrl = person.PhotoData ? `${this.WT_DOMAIN}/${person.PhotoData.url}` : "";
        const photo = person.dna.length <= 3 ? `<img src="${photoUrl}" class="photo">` : "";

        let locations = "";

        if (person.dna.length < 5 && person?.BirthLocation) {
            locations = `<div class="locations">${person.BirthLocation}</div>`;
        }

        const born = `${person?.IsLiving ? "Born " : ""}${wtDate(person, "BirthDate")}`;
        const died = person?.IsLiving ? "" : ` - ${wtDate(person, "DeathDate")}`;

        return `
            <div style="grid-area: ${person.dna};" class="known-relative">
                ${photo}
                <div>
                    <h2>${wtCompleteName(person)}</h2>
                    <div>${born}${died}</div>
                    ${locations}
                </div>
            </div>`;
    }
};
