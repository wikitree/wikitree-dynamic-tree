window.FamilyView = class FamilyView extends View {
    meta() {
        return {
            title: "Family Group View",
            description: "Gives a brief overview of a family group",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        const view = new FamilyGroup(container_selector, person_id);
        view.displayFamilyGroup();
    }
};

window.FamilyGroup = class FamilyGroup {
    constructor(container_selector, person_id) {
        this.selector = container_selector;
        this.person = person_id;
        this.profileFields = "Id,Name,Gender," +
            "FirstName,LastNameAtBirth,LastNameCurrent,MiddleName," +
            // "Derived.ShortName,Derived.BirthName,Derived.LongName," + // These don't work.
            "RealName,Nicknames,Prefix,Suffix," +
            "BirthDate,BirthLocation," +
            "DeathDate,DeathLocation," +
            "DataStatus,Privacy," +
            "Father,Mother,Photo,PhotoData," +
            "Parents,Children,Spouses,Siblings";
    }

    /**
     * Sort by ascending year.
     * @param {array} list
     * @returns {array}
     */
    sortByDate(list) {
        return list.sort((a, b) => {
            const aYear = a.Date.split('-').join('');
            const bYear = b.Date.split('-').join('');

            return aYear - bYear;
        });
    }

    /**
     * Check if a field exists within an object and return it, otherwise return an empty string
     * @param {Object} obj
     * @param {string} fieldname
     * @returns {string}
     */
    grabField(obj, fieldname) {
        if (obj.hasOwnProperty(fieldname)) {
            return obj[fieldname];
        }
        return '';
    }

    /**
     * Given a person object, construct a 'full' name
     *
     * @param person
     * @returns {string}
     */
    fullName(person) {
        const nm = [
            this.grabField(person, 'Prefix'),
            this.grabField(person, 'FirstName'),
            this.grabField(person, 'MiddleName')
        ];
        if (person.LastNameCurrent !== person.LastNameAtBirth) {
            nm.push(`(${this.grabField(person, 'LastNameAtBirth')})`)
        }
        const full = nm.concat([
            this.grabField(person, 'LastNameCurrent'),
            this.grabField(person, 'Suffix')
        ]);
        return full.join(' ').trim();
    }

    shortName(person) {
        const nm = [
            this.grabField(person, 'FirstName'),
            this.grabField(person, 'LastNameAtBirth'),
        ];
        return nm.join(' ').trim();
    }

    /**
     * Although 'maiden' name only really applies to women, it doesn't matter to the code
     */
    maidenName(person) {
        return `${person.FirstName} ${person.LastNameAtBirth}`;
    }

    profileLink(person, linkText) {
        if (person.Id === 0) {
            return linkText;
        }
        return `<a href='https://www.wikitree.com/wiki/${person.Name}'>${linkText}</a>`;
    }

    linkedProfileName(person) {
        return this.profileLink(person, this.fullName(person));
    }

    extractParentLink(person, parentSide) {
        if (person[parentSide] && person[parentSide] !== 0) {
            return this.linkedProfileName(person.Parents[person[parentSide]]);
        } else {
            return `unknown ${parentSide.toLowerCase()}`;
        }
    }

    getProfilePicHTML(person) {
        if (person.Photo) {
            return `<img alt="Profile image for ${person.RealName}" src="https://www.wikitree.com${person.PhotoData.url}"/><br/>`;
        } else {
            if (person.Gender === 'Male') {
                return `<img alt="No photo available for "${person.RealName}" src="https://www.wikitree.com/images/icons/male.gif.pagespeed.ce.sk2cBn-ts3.gif"/><br/>`;
            }
            return `<img alt="No photo available for "${person.RealName}" src="https://www.wikitree.com/images/icons/female.gif.pagespeed.ce._HpxLyYvZO.gif"/><br/>`;
        }
    }

    readableDate(aDate, qualifier) {
        const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (aDate === '0000-00-00' || qualifier === 'blank') {
            return '';
        }
        const dateParts = aDate.split('-'); // y, m, d
        let ans = '';
        if (qualifier === 'before') {
            ans += 'before ';
        } else if (qualifier === 'after') {
            ans += 'after ';
        } else if (qualifier === 'guess') {
            ans += 'about ';
        }
        if (dateParts[2] !== '00') {
            ans += `${parseInt(dateParts[2])} `;
        }
        if (dateParts[1] !== '00') {
            ans += `${months[parseInt(dateParts[1])]} `;
        }
        ans += dateParts[0];
        return ans;
    }

    createMiniBioHTML(person, showPic = true) {
        let html = `<td class="gender_${person.Gender}">`;
        if (showPic) {
            html += this.getProfilePicHTML(person);
        }
        html += `${this.linkedProfileName(person)}<br/>`;
        if (person.BirthDate !== '0000-00-00' && person.DataStatus.BirthDate !== 'blank') {
            html += `Born: ${this.readableDate(person.BirthDate, person.DataStatus.BirthDate)} in ${person.BirthLocation}<br/>`;
        }
        if (person.DeathDate !== '0000-00-00' && person.DataStatus.DeathDate !== 'blank') {
            html += `Died: ${this.readableDate(person.DeathDate, person.DataStatus.DeathDate)} in ${person.DeathLocation}<br/>`;
        }
        html += `</td>`;
        return html;
    }

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

    async displayFamilyGroup() {
        // Attempt to retrieve the data for the given person id
        let data = await WikiTreeAPI.postToAPI({action: "getPerson", key: this.person, fields: this.profileFields});
        // It's an error if nothing is returned
        if (data.length !== 1) {
            $(this.selector).html(`Error retrieving information for person id ${this.person}`);
            return;
        }
        // Extract the person data from the single element array
        let person = data[0].person;
        // Check on the privacy before showing anything…
        // 50 is the public threshold; less than that is private of some kind, check if another field is visible to
        // gauge if it is a private profile that the logged-in user has access to
        if (person.Privacy < 50 && !person.Gender) {
            $(this.selector).html(
                `<p>Sorry, this profile is <a href="/wiki/Privacy">Private</a> and you are not on the profile's 
                <a href="/wiki/Trusted_List">Trusted List</a>.</p>`
            );
            return;
        }

        // We have all the necessary information, so it's time to clear out our tree view and start filling it.
        // We'll use two main divs the upper one holding the family group(s) for any multiple marriages, and the
        // lower one just a list of all children across all marriages
        $(this.selector).html(`<div id="family_group"></div><div id="children_list"></div>`);

        // Update the view description with specifics for this set of relationships.
        this.setViewDescription(person);

        const wv = $('#family_group');

        // wv.html(`Family Group Sheet for ${person.Name}`);

        // DEBUG routine for following section
        function toString(obj) {
            if (obj) {
                const s = Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('<br/> ');
                return `<p style="font-family: 'Courier New',monospace">${s}</p>`;
            }
            return '';
        }

        if (0) {
            // let toString = oToStr();

            wv.append(`<p>Person</p>${toString(person)}`);
            wv.append(`<p>Data Status</p>${toString(person.DataStatus)}`);
            wv.append(`<p>Photo Data</p>${toString(person.PhotoData)}`);
            wv.append(`<p>Parents</p>${toString(person.Parents)}`);
            wv.append(`<p>Children</p>${toString(person.Children)}`);
            wv.append(`<p>Siblings</p>${toString(person.Siblings)}`);
            if (person.Spouses && Object.keys(person.Spouses).length > 0) {
                let spHTML = '';
                let sp = 0;
                for (const spousesKey in person.Spouses) {
                    if (person.Spouses.hasOwnProperty(spousesKey)) {
                        const spouse = person.Spouses[spousesKey];
                        sp += 1;
                        spHTML += `<p>Spouse #${sp}</p>${toString(spouse)}`;
                        spHTML += `<p>Spouse #${sp} Data Status</p>${toString(spouse.data_status)}`;
                    }
                }
                wv.append(`<p>Spouses</p>${spHTML}`);
            }
        }

        // Check which relationship is changing to work out which child begins with which
        let spousal_relation = 'Mother';
        if (person.Gender === "Female") {
            spousal_relation = "Father";
        }

        // Sort any children now because they might be needed multiple times
        if (person.Children && Object.keys(person.Children).length > 0) {
            person.childList = this.sortByDate(Object.values(person.Children).map(x => Object({
                Id: x.Id,
                Date: x.BirthDate
            })));
        } else {
            person.childList = [];
        }


        // We will work through each spouse and produce a family table for every couple… provided there are any
        // marriages at all
        if (person.Spouses && Object.keys(person.Spouses).length > 0) {
            const spouseList = this.sortByDate(Object.values(person.Spouses).map(x => Object({
                Id: x.Id,
                Date: x.marriage_date
            })));

            // for (const spousesKey in person.Spouses) {
            for (const spouseEntry in spouseList) {
                if (spouseList.hasOwnProperty(spouseEntry)) {
                    const spousesKey = spouseList[spouseEntry].Id;
                    if (person.Spouses.hasOwnProperty(spousesKey)) {
                        const spouse = person.Spouses[spousesKey];
                        wv.append(`<h2>${person.RealName} and ${this.fullName(spouse)}</h2>`);
                        wv.append(`<h3>${person.RealName} married ${this.maidenName(spouse)}, 
                        ${this.readableDate(spouse.marriage_date, spouse.data_status.marriage_date)} in
                        ${spouse.marriage_location}</h3>`);
                        // wv.append(`<p>${toString(spouse)}</p>`);
                        let html = this.extractFamilyGroupHTML(person, spouse, spousal_relation, spousesKey);
                        wv.append(html);
                    }
                }
            }
        } else {
            // No spouses… just give the details for the person alone
            wv.append(this.extractFamilyGroupHTML(person, null, spousal_relation, "0"));
        }

        if (person.Children && Object.keys(person.Children).length > 0) {
            let pronoun = 'his';
            if (person.Gender !== 'Male') {
                pronoun = 'her';
            }
            let relation = 'spouse is';
            if (person.Spouses && Object.keys(person.Spouses).length > 1) {
                relation = 'spouses are';
            }
            let html = `<h2>Children of ${person.RealName}</h2>
                <p>The above shows children where ${this.profileLink(person, person.RealName)}'s ${relation} the 
                other parent and may therefore be incomplete. Here is a simple list of all ${pronoun} children:</p>
                <ol>`;
            for (const childListKey in person.childList) {
                if (person.childList.hasOwnProperty(childListKey)) {
                    const childrenKey = person.childList[childListKey].Id;
                    if (person.Children.hasOwnProperty(childrenKey)) {
                        const child = person.Children[childrenKey];
                        html += `<li>${this.createMiniBioHTML(child, false)}</li>`;
                    }
                }
            }
            html += `</ol>`;
            $('#children_list').append(html);
        }
    }


    setViewDescription(person) {
        let html = `Here is a family group view for illustrating the marriage`;
        if (person.Spouses && Object.keys(person.Spouses).length > 1) {
            html += 's';
        }
        // html += ` [${Object.keys(person.Spouses).length}] `;
        if (person.Children && Object.keys(person.Children).length > 0) {
            html += ` and children`;
        }
        html += ` of ${this.linkedProfileName(person)},`;

        let fatherName = this.extractParentLink(person, 'Father');
        let motherName = this.extractParentLink(person, 'Mother');

        html += ` the son of ${fatherName} and ${motherName}. 
            See ${person.RealName}'s Tree & Tools page for more views.`;
        $("#view-description").html(html);
    }
};
