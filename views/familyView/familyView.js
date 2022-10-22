window.FamilyView = class FamilyView extends View {
    meta() {
        return {
            title: "Family Group View",
            description: "Gives a brief overview of a family group",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        var view = new FamilyGroup(container_selector, person_id);
        view.displayFamilyGroup();
    }
};

window.FamilyGroup = class FamilyGroup {
    constructor(container_selector, person_id) {
        this.selector = container_selector;
        this.person = person_id;
        this.profileFields = "Id,Name,Gender," +
            "FirstName,LastNameAtBirth,LastNameCurrent,MiddleName," +
            "RealName,Nicknames,Prefix,Suffix," +
            "BirthDate,BirthLocation," +
            "DeathDate,DeathLocation," +
            "DataStatus,Privacy," +
            "Father,Mother,Photo,PhotoData," +
            "Parents,Children,Spouses,Siblings";
    }

    fullName(person) {
        let nm = '';
        if (person.Prefix) {
            nm += `${person.Prefix} `;
        }
        if (person.FirstName) {
            nm += `${person.FirstName} `;
        }
        if (person.MiddleName) {
            nm += `${person.MiddleName} `;
        }
        if (person.LastNameCurrent !== person.LastNameAtBirth) {
            nm += ` (${person.LastNameAtBirth}) `;
        }
        if (person.LastNameCurrent) {
            nm += person.LastNameCurrent;
        }
        if (person.Suffix) {
            nm += person.Suffix;
        }
        return nm;
    }

    profileLink(person,linkText) {
        let html = '';
        if (person.Id === 0) {
            return linkText;
        }
        return `<a href='https://www.wikitree.com/wiki/${person.Name}'>${linkText}</a>`;
    }

    linkedProfileName(person) {
        return this.profileLink(person, this.fullName(person));
    }

    extractParentLink(person, parentSide) {
        let fatherName = '';
        if (person[parentSide] && person[parentSide] !== 0) {
            return this.linkedProfileName(person.Parents[person[parentSide]]);
        } else {
            return `unknown ${parentSide.toLowerCase()}`;
        }
    }

    getProfilePicHTML(person) {
        if (person.Photo) {
            return `<img alt="Profile image for ${person.RealName}" src="http://www.wikitree.com${person.PhotoData.url}"/><br/>`;
        } else {
            return '';
        }
    }

    async displayFamilyGroup() {
        // Attempt to retrieve the data for the given person id
        let data = await WikiTreeAPI.postToAPI({ action: "getPerson", key: this.person, fields: this.profileFields });
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

        const wv = $('#family_group');
        // wv.html(`Family Group Sheet for ${person.Name}`);

        if (0) {
            let toString = obj => Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join('<br/> ');

            wv.append(`<p>Person</p><p style="font-family: 'Courier New',monospace">${toString(person)}</p>`);
            wv.append(`<p>Data Status</p><p style="font-family: 'Courier New',monospace">${toString(person.DataStatus)}</p>`);
            wv.append(`<p>Photo Data</p><p style="font-family: 'Courier New',monospace">${toString(person.PhotoData)}</p>`);
            wv.append(`<p>Parents</p><p style="font-family: 'Courier New',monospace">${toString(person.Parents)}</p>`);
            wv.append(`<p>Children</p><p style="font-family: 'Courier New',monospace">${toString(person.Children)}</p>`);
            wv.append(`<p>Siblings</p><p style="font-family: 'Courier New',monospace">${toString(person.Siblings)}</p>`);
            wv.append(`<p>Spouses</p><p style="font-family: 'Courier New',monospace">${toString(person.Spouses)}</p>`);
        }

        // No more need for parent records right now, they were dealt with in the header
        // if (person.Parents) {
        //     wv.append('<h2>Parents</h2>');
        //     for (const parentsKey in person.Parents) {
        //         wv.append(`<p>${toString(person.Parents[parentsKey])}</p>`);
        //     }
        // }

        // Check which relationship is changing to work out which child begins with which
        let spousal_relation = 'Mother';
        if (person.Gender === "Female") {
            spousal_relation = "Father";
        }

        // We will work through each spouse and produce a family table for every couple… provided there are any
        // marriages at all
        if (person.Spouses) {
            // wv.append('<h2>Spouses</h2>');
            for (const spousesKey in person.Spouses) {
                const spouse = person.Spouses[spousesKey];
                wv.append(`<h2>${person.RealName} and ${this.fullName(spouse)}</h2>`);
                // wv.append(`<p>${toString(spouse)}</p>`);
                let html = `<table class="fv_Family"><tbody><tr class="fv_Parents">`;
                html += `<td class="gender_${person.Gender}">`;
                html += this.getProfilePicHTML(person);
                html += `${this.linkedProfileName(person)}`;
                html += `</td>`;
                html += `<td class="gender_${spouse.Gender}">`;
                html += this.getProfilePicHTML(spouse);
                html += `${this.linkedProfileName(spouse)}`;
                html += `</td>`;
                if (person.Children) {
                    html += `</tr><tr class="fv_Children">`;
                    html += `<td colspan="2"><table class="fv_Children_Table"><tbody><tr>`;
                    // wv.append('<h2>Children</h2>');
                    for (const childrenKey in person.Children) {
                        const child = person.Children[childrenKey];
                        if (child[spousal_relation] != spousesKey) {
                            continue;
                        }
                        html += `<td class="gender_${child.Gender}">`;
                        html += this.getProfilePicHTML(child);
                        html += `${this.fullName(child)}`;
                        // wv.append(`<p>${toString(person.Children[childrenKey])}</p>`);
                        html += `</td>`;
                    }
                    html+=`</tr></tbody></table></td>`;
                }
                html += `</tr></tbody></table>`;
                wv.append(html);
            }
        } else {
            // No spouses… just give the details for the person alone
        }


        // No need for the siblings here currently
        // if (person.Siblings) {
        //     wv.append('<h2>Siblings</h2>');
        //     for (const siblingsKey in person.Siblings) {
        //         wv.append(`<p>${toString(person.Siblings[siblingsKey])}</p>`);
        //     }
        // }

    }
};
