/*
 * SurnamesView
 *
 * Display surnames from ancestors, highlighting those that are unique.
 */

window.SurnamesView = class SurnamesView extends View {
    static APP_ID = "SurnamesList";
    meta() {
        return {
            title: "Surnames List",
            description: `Display the surnames of ancestors, highlighting those that are unique.`,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        let view = new Surnames(container_selector, person_id);
        view.displaySurnames();
    }
};

/*
 * Display a list of ancestor surnames.
 */
window.Surnames = class Surnames {
    constructor(selector, startId) {
        this.startId = startId;
        this.selector = selector;

        // This increments each time we display a new group of parents of the previous group.
        this.generation = 1;

        // This is how deep to keep looking for more ancestors.
        // TODO: We should quit searching for ancestors if all of the current step are "unknown".
        // TODO: It might be nice to start with a small number here and have a "Get more" button that continues.
        // Note the original page (e.g. https://www.wikitree.com/treewidget/Adams-35/10) went to 6 generations.
        this.maxGeneration = 6;

        // Track surnames already seen
        this.surnamesSeen = new Array();

        // Placeholder data when we don't have a particular ancestor.
        this.blankPerson = { Id: 0, FirstName: "Unknown" };

        // The data we want to retrieve for each profile. We need to get everything required to list the ancestor (in displayPerson())
        // as well as Mother and Father so we can go back more generations.
        this.profileFields =
            "Id,Name,FirstName,RealName,LastNameAtBirth,LastNameCurrent,Gender,DataStatus,Privacy,Father,Mother";
    }

    // This is the start of our view generation. We grab the starting profile by ID.
    // If that is valid, then we update the info in the View description and kick off the recursive gathering and display of ancestors.
    async displaySurnames() {
        wtViewRegistry.showNotice(`Gathering surnames from ancestors to ${this.maxGeneration} generations...`);

        let data = await WikiTreeAPI.postToAPI({
            appId: SurnamesView.APP_ID,
            action: "getPerson",
            key: this.startId,
            fields: this.profileFields,
        });
        if (data.length != 1) {
            wtViewRegistry.showError(`There was an error starting with ${this.startId}.`);
            return;
        }

        // Yay, we have a valid starting person.
        // If the profile is private and the viewing user is not on the Trusted List, we still might not be able to continue.
        let p = data[0].person;
        if (!p?.Name) {
            let err = `The starting profile data could not be retrieved.`;
            if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                err += ` You may need to be added to the starting profile's Trusted List.`;
            } else {
                err += ` Try logging into the API.`;
            }
            wtViewRegistry.showError(err);
            wtViewRegistry.hideInfoPanel();
            return;
        }
        if (p.Privacy < 50 && !p.Gender) {
            wtViewRegistry.showError(
                `<p>Sorry, this profile is <a href="/wiki/Privacy">Private</a> and you are not on the profile's <a href="/wiki/Trusted_List">Trusted List</a>.</p>`
            );
            wtViewRegistry.hideInfoPanel();
            return;
        }

        // Now clear out our tree view and start filling it.
        $(this.selector).html(`<div id="surnamesList"></div>`);

        let x = p.Name.split("-");
        let count = x[x.length - 1];

        let html = `<p>Here are the last names from <a href="https://www.wikitree.com/wiki/${p.Name}">${p.RealName} ${p.LastNameCurrent}</a>'s <a href="https://wikitree.com/genealogy/${p.LastNameAtBirth}-Family-Tree-${count}">family tree</a>.`;
        if (p.Privacy >= 35) {
            html += `<br /><span class="small">This page is made for sharing, especially with <a href="https://www.wikitree.com/wiki/DNA_Matches" target="_Help" title="Information on DNA match sharing features">DNA matches</a>: https://www.WikiTree.com/treewidget/${p.Name}/10</span>`;
        }
        html += `</p>`;
        $("#view-description").html(html);

        // Add our starting profile.
        $("#surnamesList").append(
            `<div class="generationRow"><div class="surnameItem gen0 newSurname"><a href="https://www.wikitree.com/wiki/${p.Name}">${p.LastNameAtBirth}</a></div></div>`
        );
        this.surnamesSeen.push(p.LastNameAtBirth);

        // Add ancestors recursively.
        let paternal = new Array();
        paternal.push(await this.nextPerson(p.Father));

        let maternal = new Array();
        maternal.push(await this.nextPerson(p.Mother));

        this.displayAncestors(paternal, maternal);
    }

    // This is a recursive function listing all of the surnames for the given set of people/ancestors, and then
    // calling itself again for the next generation until we hit a maximum depth.

    async displayAncestors(paternal, maternal) {
        let nextPaternal = new Array();
        let nextMaternal = new Array();

        let html = `<div class="generationRow">`;

        html += `<div class="paternalColumn">`;
        for (let i = 0; i < paternal.length; i++) {
            html += this.displayPerson(paternal[i]);
            nextPaternal.push(await this.nextPerson(paternal[i].Father));
            nextPaternal.push(await this.nextPerson(paternal[i].Mother));
        }
        html += `</div>`;

        html += `<div class="maternalColumn">`;
        for (let i = 0; i < maternal.length; i++) {
            html += this.displayPerson(maternal[i]);
            nextMaternal.push(await this.nextPerson(maternal[i].Father));
            nextMaternal.push(await this.nextPerson(maternal[i].Mother));
        }
        html += `</div>`;

        html += `<div style="clear:both;"></div>`;
        html += `</div>`; // end generation div

        $("#surnamesList").append(html);
        this.generation++;
        if (this.generation <= this.maxGeneration) {
            this.displayAncestors(nextPaternal, nextMaternal);
        }
    }

    // Grab a parent profile for the next generation. If we don't have an id, we use a place-holder instead, so the
    // display keeps going with an "Unknown" relative displayed.
    async nextPerson(id) {
        if (id > 0) {
            let data = await WikiTreeAPI.postToAPI({
                appId: SurnamesView.APP_ID,
                action: "getPerson",
                key: id,
                fields: this.profileFields,
            });
            if (data.length != 1) {
                return this.blankPerson;
            } else {
                return data[0].person;
            }
        }
        return this.blankPerson;
    }

    // This code takes the WikiTree API person data and renders it into HTML for appending to the view display container.
    // Each generation is in a "row" with the paternal and maternal columns. Each row is just a list of surnames, styled to highlight
    // new surnames, and sized by generation.
    displayPerson(person) {
        let classes = "surnameItem";
        if (this.surnamesSeen.indexOf(person.LastNameAtBirth) < 0 && person.Id != 0) {
            classes += " newSurname";
            if (this.generation <= 6) {
                classes += ` gen${this.generation}`;
            } else {
                classes += " genx";
            }
        }
        this.surnamesSeen.push(person.LastNameAtBirth);
        let html = `<div class="${classes}">`;

        if (person.Id == 0) {
            html += `[?]`;
        } else {
            html += `<a href="https://www.wikitree.com/wiki/${person.Name}">${person.LastNameAtBirth}</a>`;
        }
        html += `</div>`;

        return html;
    }
};
