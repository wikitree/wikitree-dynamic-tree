/**
 * Encapsulate a family group sheet within a pair of objects
 *
 * @type {Window.FamilyView}
 */
window.FamilyView = class FamilyView extends window.View {
    static APP_ID = "FamilyGroup";
    /**
     * Provide information about the view to display in the menu system
     *
     * @returns {{docs: string, description: string, title: string}}
     */
    meta() {
        return {
            title: "Family Group View",
            description: "Gives a brief overview of a family group",
            docs: "",
        };
    }

    /**
     * Initialise the view to operate within the given container using the person_id
     *
     * @param container_selector
     * @param person_id
     */
    init(container_selector, person_id) {
        this.view = new window.FamilyGroup(container_selector, person_id);
        this.view.displayFamilyGroup();
    }

    close() {
        if (this.view && this.view.close) {
            this.view.close();
        }
    }
};

/**
 * The working heart of the Family Group Sheet display
 *
 * @type {Window.FamilyGroup}
 */
window.FamilyGroup = class FamilyGroup {
    /**
     * Set of predefined strings to enable alterations if necessary
     * @returns {string}
     */
    get baseWikiURL() {
        return "https://www.wikitree.com";
    }

    get editFamilyURL() {
        return "/index.php?title=Special:EditFamily";
    }

    get urlTreeAndTools() {
        return "/genealogy/";
    }

    get urlPrivacy() {
        return "/wiki/Privacy";
    }

    get urlTrustedList() {
        return "/wiki/Trusted_List";
    }

    get imgMaleShadow() {
        return "/images/icons/male.gif";
    }

    get imgFemaleShadow() {
        return "/images/icons/female.gif";
    }

    get imgFamilyGroup() {
        return "/images/icons/family-group.gif";
    }

    /**
     * Constructor receives the container_selector and the person_id from the FamilyView that creates it
     *
     * @param container_selector
     * @param person_id
     */
    constructor(container_selector, person_id) {
        this.selector = container_selector;
        this.person_id = person_id;
        this.profileFields =
            "Id,Name,Gender," +
            "FirstName,LastNameAtBirth,LastNameCurrent,MiddleName," +
            "Derived.ShortName,Derived.BirthName,Derived.LongName," +
            "RealName,Nicknames,Prefix,Suffix," +
            "BirthDate,BirthDateDecade,BirthLocation," +
            "DeathDate,DeathDateDecade,DeathLocation," +
            "IsLiving,DataStatus,Privacy," +
            "Father,Mother,Photo,PhotoData," +
            "Parents,Children,Spouses,Siblings";

        this.options = {
            showWTID: false,
            dateFormat: "D MMM YYYY",
        };
        this.localStorageKey = "familyView_options";
        this.loadOptions();
        this.isClosed = false;
    }

    loadOptions() {
        const storedOptions = localStorage.getItem(this.localStorageKey);
        if (storedOptions) {
            try {
                const parsed = JSON.parse(storedOptions);
                this.options = { ...this.options, ...parsed };
            } catch (e) {
                console.error("Error loading familyView options", e);
            }
        }
    }

    saveOptions() {
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.options));
    }

    /**
     * Sort by ascending year.
     * @param {array} list
     * @returns {array}
     */
    sortByDate(list) {
        return list.sort((a, b) => {
            const aYear = a.Date.split("-").join("");
            const bYear = b.Date.split("-").join("");

            return aYear - bYear;
        });
    }

    /**
     * Check if a field exists within an object and return it, otherwise return an empty string
     * @param {Object} obj
     * @param {string} field_name
     * @returns {string}
     */
    grabField(obj, field_name) {
        if (obj.hasOwnProperty(field_name) && obj[field_name]) {
            return obj[field_name];
        }
        return "";
    }

    /**
     * Given a person object, construct a 'full' name
     *
     * @param person
     * @returns {string}
     */
    fullName(person) {
        return window.wtCompleteName(person, {
            fields: ["Prefix", "FirstName", "MiddleName", "LastNameAtBirth", "LastNameCurrent"],
        });
    }

    /**
     * Given a person object, construct a 'short' name
     *
     * @param person
     * @returns {string}
     */
    shortName(person) {
        return person.ShortName;
    }

    /**
     * Although birth name only really applies to women, it doesn't matter to the code
     *
     * @param person
     * @returns {string}
     */
    birthName(person) {
        return person.BirthName;
    }

    /**
     * Create a link to the given persons profile page using the provided linkText
     *
     * @param person
     * @param linkText
     * @returns {string|*}
     */
    profileLink(person, linkText) {
        if (person.Id === 0) {
            return linkText;
        }
        return `<a href='${this.baseWikiURL}/wiki/${person.Name}' title>${linkText}</a>`;
    }

    /**
     * Create a link to the given persons profile page using the full name as link text
     *
     * @param person
     * @returns {string}
     */
    linkedProfileName(person) {
        return `${this.profileLink(person, this.fullName(person))}${this.makeLinkToSelf(person)}`;
    }

    /**
     * Create a link to the given persons profile page using the short name as link text
     * @param person
     * @returns {string}
     */
    linkedShortName(person) {
        return `${this.profileLink(person, this.shortName(person))}${this.makeLinkToSelf(person)}`;
    }

    /**
     * Create a link to the given persons parents profile… parentSide dictated 'Father' or 'Mother'
     * if requested profile doesn't exist return a link to allow a new profile page to be created
     *
     * @param person
     * @param parentSide
     * @returns {string}
     */
    extractParentLink(person, parentSide) {
        if (person[parentSide] && person[parentSide] !== 0) {
            return this.linkedProfileName(person.Parents[person[parentSide]]);
        } else {
            return `<span class="BLANK"><a href="${this.baseWikiURL}${this.editFamilyURL}&amp;u=${
                person.Id
            }&amp;who=${parentSide.toLowerCase()}">
                [${parentSide.toLowerCase()}?]</a></span>`;
        }
    }

    /**
     * Create a link to the given persons profile pic… if no pic is available return a silhouette placeholder
     * @param person
     * @returns {string}
     */
    getProfilePicHTML(person) {
        let name = person.RealName || "";
        if (name) {
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        if (person.Photo) {
            return `<img alt="Profile image for ${name}" src="${this.baseWikiURL}${person.PhotoData.url}"/><br/>`;
        } else {
            if (person.Gender === "Male") {
                return `<img alt="No photo available for ${name}" src="${this.baseWikiURL}${this.imgMaleShadow}"/><br/>`;
            }
            return `<img alt="No photo available for ${name}" src="${this.baseWikiURL}${this.imgFemaleShadow}"/><br/>`;
        }
    }

    /**
     * Create a link back to this page to switch to the given person—ignore if it is the same person already displayed
     *
     * @param person
     * @returns {string}
     */
    makeLinkToSelf(person) {
        if (person.Id !== this.person_id) {
            let html = `<span class="icon"> <a href="#name=${person.Name}&view=familygroup">`;
            html += `<img src="${this.baseWikiURL}${this.imgFamilyGroup}" border="0" width="7" height="11"
                    alt="family group sheet" title="Family Group Sheet">`;
            html += `</a></span>`;
            return html;
        }
        return "";
    }

    /**
     * Create the mini-bio for a single person, set showPic to 'false' to suppress any picture
     *
     * @param person
     * @param showPic
     * @returns {string}
     */
    createMiniBioHTML(person, showPic = true) {
        let html = `<td class="gender_${person.Gender}">`;
        if (showPic) {
            html += this.getProfilePicHTML(person);
        }
        html += `<strong>${this.linkedProfileName(person)}</strong><br/>`;
        if (this.options.showWTID) {
            html += `<span class="wt-id">(${person.Name})</span><br/>`;
        }
        if (person.BirthDate && person.BirthDate !== "0000-00-00" && person.DataStatus.BirthDate !== "blank") {
            let birth_place = this.grabField(person, "BirthLocation");
            if (birth_place.length > 1) {
                birth_place = ` in ${birth_place}`;
            }
            const birthDate = window.wtDate(person, "BirthDate", { formatString: this.options.dateFormat });
            html += `Born: ${birthDate}${birth_place}<br/>`;
        } else if (person.BirthDateDecade) {
            html += `Born: ${person.BirthDateDecade}<br/>`;
        }
        if (!person.IsLiving) {
            if (person.DeathDate && person.DeathDate !== "0000-00-00" && person.DataStatus.DeathDate !== "blank") {
                let death_place = this.grabField(person, "DeathLocation");
                if (death_place.length > 1) {
                    death_place = ` in ${death_place}`;
                }
                const deathDate = window.wtDate(person, "DeathDate", { formatString: this.options.dateFormat });
                html += `Died: ${deathDate}${death_place}<br/>`;
            } else if (person.DeathDateDecade) {
                html += `Died: ${person.DeathDateDecade}<br/>`;
            }
        }
        html += `</td>`;
        return `<div class="fv_Bio">${html}</div>`;
    }

    /**
     * Create a single family group with the given person plus spouse (spousal_relation indicates 'mother' or 'father')
     * 'spouse' may be 'null' to indicate no spouse
     *
     * @param person
     * @param spouse
     * @param spousal_relation
     * @param spousesKeyStr
     * @returns {string}
     */
    extractFamilyGroupHTML(person, spouse, spousal_relation, spousesKeyStr) {
        // We're passed a string, make it an integer!
        let spousesKey = parseInt(spousesKeyStr);
        let html = `<div class="fv_singleFamily"><table class="fv_Family"><tbody><tr class="fv_Parents">`;
        html += this.createMiniBioHTML(person);
        // We might not have a spouse…
        if (spouse) {
            html += this.createMiniBioHTML(spouse);
        } else {
            html += `<td>&nbsp;</td>`;
        }
        // Now to list any children for this marriage/solo person
        if (person.Children && Object.keys(person.Children).length > 0) {
            html += `</tr><tr class="fv_Children">`;
            html += `<td colspan="2"><table class="fv_Children_Table"><tbody><tr>`;
            // wv.append('<h2>Children</h2>');
            for (const childListKey in person.childList) {
                if (person.childList.hasOwnProperty(childListKey)) {
                    const childrenKey = person.childList[childListKey].Id;
                    if (person.Children.hasOwnProperty(childrenKey)) {
                        const child = person.Children[childrenKey];
                        if (child[spousal_relation] !== spousesKey) {
                            continue;
                        }
                        html += this.createMiniBioHTML(child);
                    }
                }
            }
            html += `</tr></tbody></table></td>`;
        }
        html += `</tr></tbody></table></div>`;
        return html;
    }

    /**
     * Create a link to the given persons 'Tree and Tools' page using linkText
     *
     * @param person
     * @param linkText
     * @returns {string}
     */
    linkToTreeAndTools(person, linkText) {
        let person_parts = person.Name.split("-");
        let url = `${this.baseWikiURL}${this.urlTreeAndTools}${person_parts[0]}-Family-Tree-${person_parts[1]}`;
        return `<a href="${url}">${linkText}</a>`;
    }

    /**
     * Set the text within the Description box to reflect the chosen person
     *
     * @param person
     */
    setViewDescription(person) {
        let html = `Here is a family group view for illustrating the marriage`;
        if (person.Spouses && Object.keys(person.Spouses).length > 1) {
            html += "s";
        }
        // html += ` [${Object.keys(person.Spouses).length}] `;
        if (person.Children && Object.keys(person.Children).length > 0) {
            html += ` and children`;
        }
        html += ` of ${this.linkedProfileName(person)}${this.makeLinkToSelf(person)},`;

        let fatherName = this.extractParentLink(person, "Father");
        let motherName = this.extractParentLink(person, "Mother");
        let childType = person.Gender === "Male" ? "son" : "daughter";

        html += ` the ${childType} of ${fatherName} and ${motherName}.
            See ${this.linkedShortName(person)}'s ${this.linkToTreeAndTools(
            person,
            "Tree &amp; Tools page"
        )} for more views.`;
        $("#view-description").html(html);
    }

    /**
     * Create an introduction line for the list of children
     *
     * @param person
     * @returns {string}
     */
    createChildListIntroductionLine(person) {
        // Select the traditional pronoun based upon declared gender
        let pronoun = "his";
        if (person.Gender !== "Male") {
            pronoun = "her";
        }
        // Account for single or multiple spouses
        let relation = "spouse is";
        if (person.Spouses && Object.keys(person.Spouses).length > 1) {
            relation = "spouses are";
        }
        // Build the introduction line
        return `<h2>Children of ${person.RealName}</h2>
                <p>The above shows children where ${this.profileLink(person, person.RealName)}'s ${relation} the
                other parent and may therefore be incomplete. Here is a simple list of all ${pronoun} children:</p>
                <ol>`;
    }

    /**
     * Here is the donkey work: control the requesting of data and then marshall the processing into the web page
     *
     * @returns {Promise<void>}
     */
    async displayFamilyGroup() {
        // Attempt to retrieve the data for the given person id
        let data = await window.WikiTreeAPI.postToAPI({
            appId: FamilyView.APP_ID,
            action: "getPerson",
            key: this.person_id,
            fields: this.profileFields,
        });
        // It is an error if nothing is returned
        if (data.length !== 1) {
            $(this.selector).html(`Error retrieving information for person id ${this.person_id}`);
            return;
        }
        // Extract the person data from the single element array
        let person = data[0].person;

        if (this.isClosed) return;
        this.renderOptions();

        // Check on the privacy before showing anything…
        // 50 is the public threshold; less than that is private of some kind, check if another field is visible to
        // gauge if it is a private profile that the logged-in user has access to
        if (person.Privacy < 50 && !person.Gender) {
            $(this.selector).html(
                `<p>Sorry, this profile is <a href="${this.baseWikiURL}${this.urlPrivacy}">Private</a>
                and you are not on the profile's
                <a href="${this.baseWikiURL}${this.urlTrustedList}">Trusted List</a>.</p>`
            );
            return;
        }

        // We have all the necessary information, so it is time to clear out our tree view and start filling it.
        // We'll use two main divs the upper one holding the family group(s) for any multiple marriages, and the
        // lower one just a list of all children across all marriages
        $(this.selector).html(`<div id="family_group"></div><div id="children_list"></div>`);

        // Update the view description with specifics for this set of relationships.
        this.setViewDescription(person);

        const wv = $("#family_group");

        if (0) {
            this.showDEBUG(wv, person);
        }

        // Check which relationship is changing to work out which child begins with which
        let spousal_relation = "Mother";
        if (person.Gender === "Female") {
            spousal_relation = "Father";
        }

        // Sort any children now because they might be needed multiple times
        if (person.Children && Object.keys(person.Children).length > 0) {
            person.childList = this.sortByDate(
                Object.values(person.Children).map((x) =>
                    Object({
                        Id: x.Id,
                        Date: x.BirthDate || "0000-00-00", // Protect against missing birth dates
                    })
                )
            );
        } else {
            person.childList = [];
        }

        // We will work through each spouse and produce a family table for every couple… provided there are any
        // marriages at all
        if (person.Spouses && Object.keys(person.Spouses).length > 0) {
            const spouseList = this.sortByDate(
                Object.values(person.Spouses).map((x) =>
                    Object({
                        Id: x.Id,
                        Date: x.marriage_date || "0000-00-00", // Protect against missing marriage dates
                    })
                )
            );

            for (const spouseEntry in spouseList) {
                if (spouseList.hasOwnProperty(spouseEntry)) {
                    const spousesKey = spouseList[spouseEntry].Id;
                    if (person.Spouses.hasOwnProperty(spousesKey)) {
                        const spouse = person.Spouses[spousesKey];
                        let marr_place = this.grabField(spouse, "marriage_location");
                        if (marr_place.length > 1) {
                            marr_place = `in ${marr_place}`;
                        }
                        let html = `<div class="fv_familyBlock">
                            <h2>${person.RealName} and ${this.fullName(spouse)}</h2>
                            <h3>${person.RealName} married ${this.birthName(spouse)},
                            ${window.wtDate(spouse, "marriage_date", { formatString: this.options.dateFormat })}
                            ${marr_place}</h3>`;
                        html += this.extractFamilyGroupHTML(person, spouse, spousal_relation, spousesKey);
                        html += "</div>";

                        wv.append(html);
                    }
                }
            }
        } else {
            // No spouses… just give the details for the person alone
            wv.append(this.extractFamilyGroupHTML(person, null, spousal_relation, "0"));
        }

        if (person.Children && Object.keys(person.Children).length > 0) {
            let html = this.createChildListIntroductionLine(person);
            for (const childListKey in person.childList) {
                if (person.childList.hasOwnProperty(childListKey)) {
                    const childrenKey = person.childList[childListKey].Id;
                    if (person.Children.hasOwnProperty(childrenKey)) {
                        const child = person.Children[childrenKey];
                        let childBio = this.createMiniBioHTML(child, false);
                        html += `<li>${childBio}</li>`;
                    }
                }
            }
            html += `</ol>`;
            $("#children_list").append(html);
        }
    }

    renderOptions() {
        if ($("#familyViewOptions").length > 0) {
            return;
        }
        const optionsHTML = `
            <div id="familyViewOptions" class="familyViewOptions">
                <label><input type="checkbox" id="showWTID" ${
                    this.options.showWTID ? "checked" : ""
                }> Show WikiTree IDs</label>
                <label for="dateFormatSelect">Date Format:</label>
                <select id="dateFormatSelect">
                    <option value="D MMM YYYY" ${
                        this.options.dateFormat === "D MMM YYYY" ? "selected" : ""
                    }>D MMM YYYY</option>
                    <option value="MMM D, YYYY" ${
                        this.options.dateFormat === "MMM D, YYYY" ? "selected" : ""
                    }>MMM D, YYYY</option>
                    <option value="MMMM D, YYYY" ${
                        this.options.dateFormat === "MMMM D, YYYY" ? "selected" : ""
                    }>MMMM D, YYYY</option>
                    <option value="D MMMM YYYY" ${
                        this.options.dateFormat === "D MMMM YYYY" ? "selected" : ""
                    }>D MMMM YYYY</option>
                    <option value="YYYY-MM-DD" ${
                        this.options.dateFormat === "YYYY-MM-DD" ? "selected" : ""
                    }>ISO (YYYY-MM-DD)</option>
                </select>
            </div>
        `;
        $("#view-container").before(optionsHTML);

        $("#showWTID").on("change", (e) => {
            this.options.showWTID = e.target.checked;
            this.saveOptions();
            this.displayFamilyGroup();
        });

        $("#dateFormatSelect").on("change", (e) => {
            this.options.dateFormat = e.target.value;
            this.saveOptions();
            this.displayFamilyGroup();
        });
    }

    close() {
        this.isClosed = true;
        $("#showWTID").off();
        $("#dateFormatSelect").off();
        $("#familyViewOptions").remove();
    }

    /**
     * Push DEBUG details to the webpage
     *
     * @param wv
     * @param person
     */
    showDEBUG(wv, person) {
        // DEBUG routine for following section
        function mkStr(obj) {
            if (obj) {
                const s = Object.entries(obj)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("<br/> ");
                return `<p style="font-family: 'Courier New',monospace">${s}</p>`;
            }
            return "";
        }

        wv.append(`<p>Person</p>${mkStr(person)}`);
        wv.append(`<p>Data Status</p>${mkStr(person.DataStatus)}`);
        wv.append(`<p>Photo Data</p>${mkStr(person.PhotoData)}`);
        wv.append(`<p>Parents</p>${mkStr(person.Parents)}`);
        wv.append(`<p>Children</p>${mkStr(person.Children)}`);
        wv.append(`<p>Siblings</p>${mkStr(person.Siblings)}`);
        if (person.Spouses && Object.keys(person.Spouses).length > 0) {
            let spHTML = "";
            let sp = 0;
            for (const spousesKey in person.Spouses) {
                if (person.Spouses.hasOwnProperty(spousesKey)) {
                    const spouse = person.Spouses[spousesKey];
                    sp += 1;
                    spHTML += `<p>Spouse #${sp}</p>${mkStr(spouse)}`;
                    spHTML += `<p>Spouse #${sp} Data Status</p>${mkStr(spouse.data_status)}`;
                }
            }
            wv.append(`<p>Spouses</p>${spHTML}`);
        }
    }
};
