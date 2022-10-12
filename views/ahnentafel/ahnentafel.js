/*
 * AhnentafelView
 *
 * Extend the base View class from the WikiTree Dynamic Tree.
 */

window.AhnentafelView = class AhnentafelView extends View {
    meta() {
        return {
            title: "Ahnentafel Ancestor List",

            // Note that we have some placeholder "#replaceme" text here. This gets filled with links and text built from the starting
            // profile data, after that data is loaded.
            description: `This basic ancestor view uses the <a href="http://en.wikipedia.org/wiki/Ahnentafel" target="_Help">ahnen numbering system</a>.
            See the <a id="familyListLink" href="#replaceme">Family List</a> for more generations and flexibility, the <a id="compactTreeLink" href="#replaceme">Compact Family Tree</a> for an alternative view with the numbers, or
            <a id="toolsLink" href="#replaceme">#replaceme</a> for a conventional pedigree chart and links to other views.`,

            docs: "",
        };
    }

    init(container_selector, person_id) {
        let ahnen = new AhnentafelAncestorList(container_selector, person_id);
        ahnen.displayAncestorList();
    }
};

/*
 * Display a list of ancestors using the ahnen numbering system.
 */
window.AhnentafelAncestorList = class AhnentafelAncestorList {
    constructor(selector, startId) {
        this.startId = startId;
        this.selector = selector;

        // This increments each time we add a person to the display
        this.ahnentafelNumber = 1;

        // This increments each time we display a new group of parents of the previous group.
        this.generation = 1;

        // This is how deep to keep looking for more ancestors.
        // TODO: We should quit searching for ancestors if all of the current step are "unknown".
        // TODO: It might be nice to start with a small number here and have a "Get more" button that continues.
        // Note the original page (e.g. https://www.wikitree.com/treewidget/Adams-35/9) went to 7 generations.
        this.maxGeneration = 7;

        // Used in formatDate()
        this.monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Placeholder data when we don't have a particular ancestor.
        this.blankPerson = { Id: 0, FirstName: "Unknown" };

        // The data we want to retrieve for each profile. We need to get everything required to list the ancestor (in displayPerson())
        // as well as Mother and Father so we can go back more generations.
        this.profileFields =
            "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,MiddleName,RealName,Nicknames,Suffix,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,DataStatus,Privacy,Father,Mother";

        // Add event listeners to highlight connected ancestors when the "Father of X" type links are hovered.
        $(this.selector).on("mouseover", ".aLink", function (e) {
            var id = $(e.target).attr("href").replace("#", "");
            $(`#person_${id}`).addClass("highlighted");
        });
        $(this.selector).on("mouseout", ".aLink", function (e) {
            var id = $(e.target).attr("href").replace("#", "");
            $(`#person_${id}`).removeClass("highlighted");
        });
    }

    // Generate the "Great-Great-...-Grandparents" headlines for each generation.
    generationTitle() {
        if (this.generation == 1) {
            return "";
        }
        if (this.generation == 2) {
            return ": Parents";
        }
        if (this.generation == 3) {
            return ": Grandparents";
        }
        let t = "Great-";
        t = t.repeat(this.generation - 3);
        t = ": " + t + "Grandparents";
        return t;
    }

    // When we have unknown ancestors (no mother/father), we display a placeholder name based on the generation.
    unknownName() {
        let prefix = "";
        if (this.generation == 1) {
            return "";
        }
        if (this.generation == 2) {
            if (this.ahnentafelNumber % 2 == 0) {
                return "Father";
            } else {
                return "Mother";
            }
        }
        if (this.ahnentafelNumber % 2 == 0) {
            prefix = "Grandfather";
        } else {
            prefix = "Grandmother";
        }
        if (this.generation == 3) {
            return prefix;
        }

        let t = "Great-";
        t = t.repeat(this.generation - 3);
        return t + prefix;
    }

    // For reference links, we want to say a particular profile is the mother/father or son/daughter of another one.
    genderAsParent(gender) {
        if (gender == "Male") {
            return "Father";
        }
        if (gender == "Female") {
            return "Mother";
        }
        return "Parent";
    }
    genderAsChild(gender) {
        if (gender == "Male") {
            return "Son";
        }
        if (gender == "Female") {
            return "Daughter";
        }
        return "Child";
    }

    // WikiTree BirthDate and DeathDate are YYYY-MM-DD. However, these are not always completely valid/complete dates.
    // They could be "fuzzy" and just have a month and year ("January 1960", returned as 1960-01-00) or as just a year (1960-00-00).
    // If we have a valid month, we want to replace the number with an abbreviation.
    formatDate(d) {
        if (!d) {
            return "";
        }
        if (d == "0000-00-00") {
            return "[date unknown]";
        }
        let ymd = d.split("-");
        let formattedDate = "";
        if (ymd[2] > 0) {
            formattedDate += `${ymd[2]} `;
        }
        if (ymd[1] > 0) {
            formattedDate += `${this.monthName[parseInt(ymd[1])]} `;
        }
        formattedDate += ymd[0];
        return formattedDate;
    }

    // This is the start of our view generation. We grab the starting profile by ID.
    // If that is valid, then we update the info in the View description and kick off the recursive gathering and display of ancestors.
    async displayAncestorList() {
        $(this.selector).html("Working....");

        let data = await WikiTreeAPI.postToAPI({ action: "getPerson", key: this.startId, fields: this.profileFields });
        if (data.length != 1) {
            $(this.selector).html(`There was an error starting with ${this.startId}.`);
            return;
        }

        // Yay, we have a valid starting person.
        // If the profile is private and the viewing user is not on the Trusted List, we still might not be able to continue.
        let p = data[0].person;
        if (p.Privacy < 50 && !p.Gender) {
            $(this.selector).html(
                `<p>Sorry, this profile is <a href="/wiki/Privacy">Private</a> and you are not on the profile's <a href="/wiki/Trusted_List">Trusted List</a>.</p>`
            );
            return;
        }

        // Fill in some custom links in the "description" with completed values.
        let x = p.Name.split("-");
        let count = x[x.length - 1];
        $("#familyListLink").attr("href", `https://www.wikitree.com/index.php?title=Special:FamilyList&p=${p.Id}`);
        $("#compactTreeLink").attr("href", `https://www.wikitree.com/treewidget/${p.Name}`);
        $("#toolsLink").attr("href", `https://www.wikitree.com/genealogy/${p.LastNameAtBirth}-Family-Tree-${count}`);
        $("#toolsLink").html(`${p.RealName}'s Tree &amp; Tools page`);

        // Now clear out our tree view and start filling it recursively with generations.
        $(this.selector).html(`<div id="ahnentafelAncestorList"></div>`);
        let people = new Array(p);
        this.displayGeneration(people);
    }

    // This is a recursive function.
    // This adds a headline for the new Generation, runs through all of the given people to display them.
    // Along the way it gathers the father/mother for those people as the set for the next generation.
    // Finally, if we haven't maxed out our search, that new set of parents is used to build the next generation by re-calling this method.
    async displayGeneration(people) {
        $("#ahnentafelAncestorList").append(`<h2>Generation ${this.generation}` + this.generationTitle() + `</h2>\n`);

        let nextPeople = new Array();
        for (let i = 0; i < people.length; i++) {
            this.displayPerson(people[i]);
            this.ahnentafelNumber++;
            nextPeople.push(await this.nextPerson(people[i].Father));
            nextPeople.push(await this.nextPerson(people[i].Mother));
        }

        this.generation++;
        if (this.generation <= this.maxGeneration) {
            this.displayGeneration(nextPeople);
        }
    }

    // Grab a parent profile for the next generation. If we don't have an id, we use a place-holder instead, so the
    // display keeps going with an "Unknown" relative displayed.
    async nextPerson(id) {
        if (id > 0) {
            let data = await WikiTreeAPI.postToAPI({ action: "getPerson", key: id, fields: this.profileFields });
            if (data.length != 1) {
                return this.blankPerson;
            } else {
                return data[0].person;
            }
        }
        return this.blankPerson;
    }

    // This code takes the WikiTree API person data and renders it into HTML for appending to the view display container.
    displayPerson(person) {
        let html = `<p class="ahnentafelPerson" id="person_${this.ahnentafelNumber}">${this.ahnentafelNumber}. `;

        if (person.Id == 0) {
            html += `[${this.unknownName()} Unknown]`;
        } else {
            if (this.generation == 1) {
                html += "<b>";
                html += `${person.FirstName} ${person.MiddleName} `;
                if (person.Nicknames) {
                    html += `${person.NickNames} `;
                }
                if (person.LastNameCurrent != person.LastNameAtBirth) {
                    html += ` (${person.LastNameAtBirth}) `;
                }
                html += `${person.LastNameCurrent}`;
                if (person.Suffix) {
                    html += ` ${person.Suffix}`;
                }
                html += "</b>";
            } else {
                html += `<a name="${this.ahnentafelNumber}"></a>`;
                html += `<a href="https://www.wikitree.com/wiki/${person.Name}">`;
                html += `${person.FirstName} ${person.MiddleName} `;
                if (person.Nicknames) {
                    html += `${person.NickNames} `;
                }
                if (person.LastNameCurrent != person.LastNameAtBirth) {
                    html += ` (${person.LastNameAtBirth}) `;
                }
                html += `${person.LastNameCurrent}`;
                if (person.Suffix) {
                    html += ` ${person.Suffix}`;
                }
                html += "</a>";
            }
            html += ": ";

            if (person.DataStatus.BirthDate != "blank" || person.DataStatus.BirthLocation != "blank") {
                html += "Born ";
            }
            if (person.BirthLocation && person.DataStatus.BirthLocation != "blank") {
                html += ` ${person.BirthLocation}`;
            }
            if (person.BirthDate != "" && person.BirthDate != "0000-00-00" && person.DataStatus.BirthDate != "blank") {
                if (person.DataStatus.BirthDate == "guess") {
                    html += " about ";
                }
                if (person.DataStatus.BirthDate == "before") {
                    html += " before ";
                }
                if (person.DataStatus.BirthDate == "after") {
                    html += " after ";
                }
                html += ` ${this.formatDate(person.BirthDate)}`;
            } else {
                if (person.DataStatus.BirthDate != "blank") {
                    html += " [date unknown]";
                }
            }
            if (person.DataStatus.BirthDate != "blank" || person.DataStatus.BirthLocation != "blank") {
                html += ". ";
            }

            if (
                person.DataStatus.DeathDate != "blank" &&
                ((person.DeathDate != "" && person.DeathDate != "0000-00-00") || person.DataStatus.DeathDate == "guess")
            ) {
                html += "Died ";
                if (person.DeathLocation && person.DataStatus.DeathLocation != "blank") {
                    html += ` ${person.DeathLocation}`;
                }
                if (person.DataStatus.DeathDate == "guess") {
                    html += " about ";
                }
                if (person.DataStatus.DeathDate == "before") {
                    html += " before ";
                }
                if (person.DataStatus.DeathDate == "after") {
                    html += " after ";
                }
                html += ` ${this.formatDate(person.DeathDate)}`;
                html += ".";
            }
        }

        if (this.generation > 1) {
            let childA = Math.floor(this.ahnentafelNumber / 2);
            html += ` ${this.genderAsParent(person.Gender)} of <a class="aLink" href="#${childA}">${childA}</a>.`;

            let fatherA = this.ahnentafelNumber * 2;
            let motherA = this.ahnentafelNumber * 2 + 1;

            html += ` ${this.genderAsChild(
                person.Gender
            )} of <a class="aLink" href="#${fatherA}">${fatherA}</a> and <a class="aLink" href="#${motherA}">${motherA}</a>.`;
        }

        html += "</p>\n";

        $("#ahnentafelAncestorList").append(html);
    }
};
