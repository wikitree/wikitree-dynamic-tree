/**
 * This code was originally written by Ian Beacall (Beacall-6) as a stand-alone WikiTree App.
 * With Ian's permission, Riël Smit (Smit-641) adapted it to be a WikiTree Dynamic Tree view.
 *
 * It makes use (through direct code inclusion) of FileSave (https://github.com/eligrey/FileSaver.js/)
 * and SheetJs (https://www.npmjs.com/package/xlsx)
 */
export class CC7 {
    static #helpText = `
        <x>[ x ]</x>
        <h2 style="text-align: center">About The CC7 Table</h2>
        <p>This tool allows you to retrieve the list of people that are connected to someone within 7 degrees.</p>
        <ul>
            <li>
                Depending on the size of the CC7 (the connection count to the 7th degree), the data can take a
                long time to load (maybe five minutes or so).
            </li>
            <li>To avoid the long waiting time, you can load only one degree at a time.</li>
            <li>Also to reduce the loading time, you can save the data to a file for faster loading next time.</li>
            <li>The Table view will always load first. This shows the most data.</li>
            <li>The Hierarchy view may also be useful.</li>
            <li>You need to log in to the apps server to get your private and unlisted profiles.</li>
            <li>
                We can't get the connections to the private and unlisted profiles that you're not on the Trusted
                List for (or the connections that go through that person).
            </li>
            <li>
                Due to the previous point, the numbers shown in the degrees table will be less than those you see
                elsewhere on WikiTree.
            </li>

            <li>Double-clicking this 'About' box will close it.</li>
            <li>
                If you find problems with this page or have suggestions for improvements,
                <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Beacall-6"
                    >let me know</a
                >.
            </li>
        </ul>
        <h3>Table</h3>
        <ul>
            <li>
                You can sort the table by any of the columns by clicking on the column heading. Clicking a second
                time, reverses the sort order.
            </li>
            <li>
                The location columns can be sorted by Town &rarr; Country or Country &rarr; Town. Clicking on a
                location heading will toggle between the two. Locations can't be ordered in reverse.
            </li>
            <li>
                Sorting by Created or Modified dates may help you find profiles that are new to your list (maybe
                added by other people).
            </li>
            <li>
                The 'Died Young' images are for people who died under 16 years of age. Their spouse and children
                boxes are greyed out as we can assume they didn't have any of these.
            </li>
            <li>
                With the 'Wide table', grab and drag the table to scroll left and right, or use a two-finger drag
                on the track-pad.
            </li>
        </ul>
        <ul id="key" class="key">
            <li><img src="./views/cc7/images/blue_bricks_small.jpg" /> missing father</li>
            <li><img src="./views/cc7/images/pink_bricks_small.jpg" /> missing mother</li>
            <li><img src="./views/cc7/images/purple_bricks_small.jpg" /> both parents missing</li>
            <li>
                <span><span class="none"></span> 'No more spouses/children' box is checked or Died Young</span>
            </li>
        </ul>
        <h3>Hierarchy</h3>
        <ul>
            <li>The number in the first box next to a person's name shows how many profiles are 'hidden' below them.</li>
            <li>
                The icons in the box at the end of the line show the number of hidden people with missing parents
                (blue and pink bricks for fathers and mothers respectively), possible missing spouses
                (the couple icon), and children (the child icon).
            </li>
            <li>Reveal more people by clicking the '+' buttons to the left of the names.</li>
            <li>The big '+' and '−' buttons expand and collapse the list by one degree at a time.</li>
        </ul>
        <h3>List</h3>
        <ul>
            <li>
                Clicking a surname in the heading shows only the people with that surname in the same column in the
                table below.
            </li>
            <li>Click the surname again to show all the people in the list.</li>
            <li>The lists are ordered alphabetically.</li>
        </ul>`;

    static PROFILE_FIELDS = [
        "BirthDate",
        "BirthDateDecade",
        "BirthLocation",
        "Created",
        "DataStatus",
        "DeathDate",
        "DeathDateDecade",
        "DeathLocation",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "Derived.LongName",
        "Derived.LongNamePrivate",
        "Father",
        "FirstName",
        "Gender",
        "Id",
        "IsLiving",
        "LastNameAtBirth",
        "LastNameCurrent",
        "LastNameOther",
        "Manager",
        "MiddleName",
        "Mother",
        "Name",
        "Nicknames",
        "Prefix",
        "Privacy",
        "RealName",
        "ShortName",
        "Suffix",
        "Touched",
    ].join(",");

    static RELATIONS_FIELDS = ["Children", "Parents", "Siblings", "Spouses"].join(",");

    static WANTED_NAME_PARTS = [
        "Prefix",
        "FirstName",
        "MiddleNames",
        "PreferredName",
        "Nicknames",
        "LastNameAtBirth",
        "LastNameCurrent",
        "Suffix",
        "LastNameOther",
    ];

    constructor(selector, startId) {
        this.selector = selector;
        $(selector).html(
            `<div id="cc7Container" class="cc7Table">
            <input type="text" placeholder="Enter WikiTree ID" id="wtid" value="${
                wtViewRegistry.session.personName
            }" /><button
                class="small button"
                id="getPeopleButton"
                title="Get a list of connected people up to this degree">
                Get CC7</button
            ><select id="cc7Degree" title="Select the degree of connection">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7" selected>7</option></select
            ><button class="small button" id="getDegreeButton" title="Get only people connected at the indicated degree">
                Get Degree 7 Only</button
            ><button id="savePeople" title="Save this data to a file for faster loading next time." class="small button">
                Save</button
            ><button class="small button" id="loadButton" title="Load a previously saved data file.">Load A File</button
            ><input type="file" id="fileInput" style="display: none"/>
            <span id="help" title="About this">?</span>
            <div id="explanation">${CC7.#helpText}</div>
            </div>`
        );

        $("#cc7Degree").on("change", function () {
            const theDegree = $("#cc7Degree").val();
            $("#getPeopleButton").text(`Get CC${theDegree}`);
            $("#getDegreeButton").text(`Get Degree ${theDegree} Only`);
        });
        $("#fileInput").on("change", CC7.handleFileUpload);
        $("#getPeopleButton").on("click", CC7.getConnectionsAction);

        $("#wtid").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#getPeopleButton").click();
            }
        });
        $("#help").click(function () {
            $("#explanation").slideToggle();
        });
        $("#explanation").dblclick(function () {
            $(this).slideToggle();
        });
        $(".cc7Table #explanation x").click(function () {
            $(this).parent().slideUp();
        });
        $("#explanation").draggable({
            cursor: "grabbing",
        });

        $("#getDegreeButton").on("click", CC7.getDegreeAction);

        $("#savePeople").click(function (e) {
            e.preventDefault();
            const fileName = CC7.makeFilename();
            CC7.downloadArray(window.people, fileName);
        });
        $("#loadButton").click(function (e) {
            e.preventDefault();
            $("#fileInput").click();
        });
    }

    // Age functions
    static getAge(birth, death) {
        // must be date objects
        let age = death.getFullYear() - birth.getFullYear();
        let m = death.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    static ageAtDeath(person, showStatus = true) {
        // ages
        let about = "";
        let diedAged = "";
        if (person?.BirthDate != undefined) {
            if (
                person["BirthDate"].length == 10 &&
                person["BirthDate"] != "0000-00-00" &&
                person["DeathDate"].length == 10 &&
                person["DeathDate"] != "0000-00-00"
            ) {
                about = "";
                const obDateBits = person["BirthDate"].split("-");
                if (obDateBits[1] == "00") {
                    obDateBits[1] = "06";
                    obDateBits[2] = "15";
                    about = "~";
                } else if (obDateBits[2] == "00") {
                    obDateBits[2] = "15";
                    about = "~";
                }
                const odDateBits = person["DeathDate"].split("-");
                if (odDateBits[1] == "00") {
                    odDateBits[1] = "06";
                    odDateBits[2] = "15";
                    about = "~";
                } else if (odDateBits[2] == "00") {
                    odDateBits[2] = "15";
                    about = "~";
                }

                diedAged = CC7.getAge(
                    new Date(obDateBits[0], obDateBits[1], obDateBits[2]),
                    new Date(odDateBits[0], odDateBits[1], odDateBits[2])
                );
                if (person.Name == "Muller-10846") {
                    console.log(person.Name, diedAged);
                }
            } else {
                diedAged = "";
            }
        }
        if (person?.DataStatus?.DeathDate) {
            if (person.DataStatus.DeathDate == "after") {
                about = ">";
            }
        }
        //console.log(diedAged);
        if (diedAged == "" && diedAged != "0") {
            return false;
        } else if (showStatus == false) {
            return diedAged;
        } else {
            return about + diedAged;
        }
    }
    // End age functions

    static showShakingTree() {
        if ($("#tree").length) {
            $("#tree").slideDown();
        } else {
            const treeGIF = $("<img id='tree' src='./views/cc7/images/tree.gif'>");
            treeGIF.appendTo("div.cc7Table");
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "100px",
                "width": "100px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
        }
    }

    static hideShakingTree() {
        $("#tree").slideUp();
    }

    static async addWideTableButton() {
        $("#wideTableButton").show();

        const wideTableButton = $("<button class='button small' id='wideTableButton'>Wide Table</button>");
        let dTable;
        if ($("#wideTableButton").length == 0) {
            if ($(".peopleTable").length) {
                dTable = $(".peopleTable");
            } else {
                dTable = $("#connectionsTable");
            }

            wideTableButton.insertBefore(dTable);

            $("#wideTableButton").click(function (e) {
                e.preventDefault();

                dTable = $(".peopleTable").eq(0);
                if (Cookies.get("w_wideTable") == "1") {
                    Cookies.set("w_wideTable", 0, { expires: 365 });

                    dTable.removeClass("wide");
                    dTable.insertBefore($("#tableContainer"));
                    $("#buttonBox").hide();
                    $(this).text("Wide table");
                    $("#peopleTable").attr("title", "");
                    dTable.css({
                        position: "relative",
                        top: "0px",
                        left: "0px",
                    });
                    dTable.draggable("disable");
                } else {
                    Cookies.set("w_wideTable", 1, { expires: 365 });
                    $(this).text("Normal Table");
                    $("#peopleTable").attr("title", "Drag to scroll left or right");
                    // if ($("div.cc7Table").length == 0) {
                    //     $("#buttonBox").show();
                    // }
                    let container;
                    if ($("#tableContainer").length) {
                        container = $("#tableContainer");
                    } else {
                        container = $("<div id='tableContainer'></div>");
                    }
                    container.insertBefore(dTable);
                    container.append(dTable);
                    dTable.addClass("wide");
                    dTable.find("th").each(function () {
                        $(this).data("width", $(this).css("width"));
                        $(this).css("width", "auto");
                    });
                    var isiPad = navigator.userAgent.match(/iPad/i) != null;
                    if (isiPad) {
                        if ($("#cc7Container").length) {
                            dTable.draggable({
                                cursor: "grabbing",
                            });
                        }
                    } else {
                        if ($("#cc7Container").length) {
                            dTable.draggable({
                                axis: "x",
                                cursor: "grabbing",
                            });
                        }
                    }
                    dTable.draggable("enable");

                    if ($("#buttonBox").length == 0) {
                        let leftButton = $("<button id='leftButton'>&larr;</button>");
                        let rightButton = $("<button id='rightButton'>&rarr;</button>");
                        let buttonBox = $("<div id='buttonBox'></div>");
                        buttonBox.append(leftButton, rightButton);
                        container.before(buttonBox);
                        buttonBox.hide();

                        $("#rightButton").click(function (event) {
                            event.preventDefault();
                            container.animate(
                                {
                                    scrollLeft: "+=300px",
                                },
                                "slow"
                            );
                        });

                        $("#leftButton").click(function (event) {
                            event.preventDefault();
                            container.animate(
                                {
                                    scrollLeft: "-=300px",
                                },
                                "slow"
                            );
                        });
                    }
                }
            });
        }
        if (Cookies.get("w_wideTable") == "1") {
            Cookies.set("w_wideTable", 0, { expires: 365 });
            $("#wideTableButton").click();
        }
    }

    static htmlEntities(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    static displayName(fPerson) {
        let fName1 = "";
        if (typeof fPerson["LongName"] != "undefined") {
            if (fPerson["LongName"] != "") {
                fName1 = fPerson["LongName"].replace(/\s\s/, " ");
            }
        }
        let fName2 = "";
        let fName4 = "";
        if (typeof fPerson["MiddleName"] != "undefined") {
            if (fPerson["MiddleName"] == "" && typeof fPerson["LongNamePrivate"] != "undefined") {
                if (fPerson["LongNamePrivate"] != "") {
                    fName2 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
                }
            }
        } else {
            if (typeof fPerson["LongNamePrivate"] != "undefined") {
                if (fPerson["LongNamePrivate"] != "") {
                    fName4 = fPerson["LongNamePrivate"].replace(/\s\s/, " ");
                }
            }
        }

        let fName3 = "";
        const checks = [
            "Prefix",
            "FirstName",
            "RealName",
            "MiddleName",
            "Nicknames",
            "LastNameAtBirth",
            "LastNameCurrent",
            "Suffix",
        ];
        checks.forEach(function (dCheck) {
            if (typeof fPerson["" + dCheck + ""] != "undefined") {
                if (fPerson["" + dCheck + ""] != "" && fPerson["" + dCheck + ""] != null) {
                    if (dCheck == "LastNameAtBirth") {
                        if (fPerson["LastNameAtBirth"] != fPerson.LastNameCurrent) {
                            fName3 += "(" + fPerson["LastNameAtBirth"] + ") ";
                        }
                    } else if (dCheck == "RealName") {
                        if (typeof fPerson["FirstName"] != "undefined") {
                        } else {
                            fName3 += fPerson["RealName"] + " ";
                        }
                    } else if (dCheck == "Nicknames") {
                        let nnamesSplit = fPerson.Nicknames.split(/,\s?/);
                        let out = "";
                        nnamesSplit.forEach(function (aNname, index) {
                            nnamesSplit[index] = "“" + aNname + "”";
                        });
                        out += nnamesSplit.join(" ") + " ";
                        fName3 += out;
                    } else {
                        fName3 += fPerson["" + dCheck + ""] + " ";
                    }
                }
            }
        });

        const arr = [fName1, fName2, fName3, fName4];
        var longest = arr.reduce(function (a, b) {
            return a.length > b.length ? a : b;
        });

        const fName = longest;
        let sName = fName;
        if (fPerson["ShortName"]) {
            sName = fPerson["ShortName"];
        }

        return [fName.trim(), sName.trim()];
    }

    static getOffset(el) {
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
        };
    }

    static getTheYear(theDate, ev, person) {
        if (!CC7.isOK(theDate)) {
            if (ev == "Birth" || ev == "Death") {
                theDate = person[ev + "DateDecade"];
            }
        }
        let theDateM = theDate.match(/[0-9]{4}/);
        if (CC7.isOK(theDateM)) {
            return parseInt(theDateM[0]);
        } else {
            return false;
        }
    }

    static dateToYMD(enteredDate) {
        let enteredD;
        if (enteredDate.match(/[0-9]{3,4}\-[0-9]{2}\-[0-9]{2}/)) {
            enteredD = enteredDate;
        } else {
            let eDMonth = "00";
            let eDYear = enteredDate.match(/[0-9]{3,4}/);
            if (eDYear != null) {
                eDYear = eDYear[0];
            }
            let eDDate = enteredDate.match(/\b[0-9]{1,2}\b/);
            if (eDDate != null) {
                eDDate = eDDate[0].padStart(2, "0");
            }
            if (eDDate == null) {
                eDDate = "00";
            }

            if (enteredDate.match(/jan/i) != null) {
                eDMonth = "01";
            }
            if (enteredDate.match(/feb/i) != null) {
                eDMonth = "02";
            }
            if (enteredDate.match(/mar/i) != null) {
                eDMonth = "03";
            }
            if (enteredDate.match(/apr/i) != null) {
                eDMonth = "04";
            }
            if (enteredDate.match(/may/i) != null) {
                eDMonth = "05";
            }
            if (enteredDate.match(/jun/i) != null) {
                eDMonth = "06";
            }
            if (enteredDate.match(/jul/i) != null) {
                eDMonth = "07";
            }
            if (enteredDate.match(/aug/i) != null) {
                eDMonth = "08";
            }
            if (enteredDate.match(/sep/i) != null) {
                eDMonth = "09";
            }
            if (enteredDate.match(/oct/i) != null) {
                eDMonth = "10";
            }
            if (enteredDate.match(/nov/i) != null) {
                eDMonth = "11";
            }
            if (enteredDate.match(/dec/i) != null) {
                eDMonth = "12";
            }
            enteredD = eDYear + "-" + eDMonth + "-" + eDDate;
        }
        return enteredD;
    }

    static mapGender(gender, maleName, femaleName, neutralName) {
        return gender == "Male" ? maleName : gender == "Female" ? femaleName : neutralName;
    }

    static capitalizeFirstLetter(string) {
        return string.substring(0, 1).toUpperCase() + string.substring(1);
    }

    static #BMD_EVENTS = ["Birth", "Death", "marriage"];

    static getTimelineEvents(tPerson) {
        const family = [tPerson].concat(tPerson.Parent, tPerson.Sibling, tPerson.Spouse, tPerson.Child);
        const timeLineEvent = [];
        const startDate = CC7.getTheYear(tPerson.BirthDate, "Birth", tPerson);

        // Get all BMD events for each family member
        family.forEach(function (aPerson) {
            CC7.#BMD_EVENTS.forEach(function (ev) {
                let evDate = "";
                let evLocation;
                if (aPerson[ev + "Date"]) {
                    evDate = aPerson[ev + "Date"];
                    evLocation = aPerson[ev + "Location"];
                } else if (aPerson[ev + "DateDecade"]) {
                    evDate = aPerson[ev + "DateDecade"];
                    evLocation = aPerson[ev + "Location"];
                }
                if (ev == "marriage") {
                    if (aPerson[ev + "_date"]) {
                        evDate = aPerson[ev + "_date"];
                        evLocation = aPerson[ev + "_location"];
                    }
                }
                if (aPerson.Relation) {
                    const theRelation = aPerson.Relation.replace(/s$/, "").replace(/ren$/, "");
                    const gender = aPerson.Gender;
                    if (theRelation == "Child") {
                        aPerson.Relation = CC7.mapGender(gender, "son", "daughter", "child");
                    } else if (theRelation == "Sibling") {
                        aPerson.Relation = CC7.mapGender(gender, "brother", "sister", "sibling");
                    } else if (theRelation == "Parent") {
                        aPerson.Relation = CC7.mapGender(gender, "father", "mother", "parent");
                    } else if (theRelation == "Spouse") {
                        aPerson.Relation = CC7.mapGender(gender, "husband", "wife", "spouse");
                    } else {
                        aPerson.Relation = theRelation;
                    }
                }
                if (evDate != "" && evDate != "0000" && CC7.isOK(evDate)) {
                    let fName = aPerson.FirstName;
                    if (!aPerson.FirstName) {
                        fName = aPerson.RealName;
                    }
                    let bDate = aPerson.BirthDate;
                    if (!aPerson.BirthDate) {
                        bDate = aPerson.BirthDateDecade;
                    }
                    let mBio = aPerson.bio;
                    if (!aPerson.bio) {
                        mBio = "";
                    }
                    if (evLocation == undefined) {
                        evLocation = "";
                    }
                    timeLineEvent.push({
                        eventDate: evDate,
                        location: evLocation,
                        firstName: fName,
                        LastNameAtBirth: aPerson.LastNameAtBirth,
                        lastNameCurrent: aPerson.LastNameCurrent,
                        birthDate: bDate,
                        relation: aPerson.Relation,
                        bio: mBio,
                        evnt: ev,
                        wtId: aPerson.Name,
                    });
                }
            });
            // Look for military events in bios
            if (aPerson.bio) {
                const tlTemplates = aPerson.bio.match(/\{\{[^]*?\}\}/gm);
                if (tlTemplates != null) {
                    const warTemplates = [
                        "Creek War",
                        "French and Indian War",
                        "Iraq War",
                        "Korean War",
                        "Mexican-American War",
                        "Spanish-American War",
                        "The Great War",
                        "US Civil War",
                        "Vietnam War",
                        "War in Afghanistan",
                        "War of 1812",
                        "World War II",
                    ];
                    tlTemplates.forEach(function (aTemp) {
                        let evDate = "";
                        let evLocation = "";
                        let ev = "";
                        let evDateStart = "";
                        let evDateEnd = "";
                        let evStart;
                        let evEnd;
                        aTemp = aTemp.replaceAll(/[{}]/g, "");
                        const bits = aTemp.split("|");
                        const templateTitle = bits[0].replaceAll(/\n/g, "").trim();
                        bits.forEach(function (aBit) {
                            const aBitBits = aBit.split("=");
                            const aBitField = aBitBits[0].trim();
                            if (aBitBits[1]) {
                                const aBitFact = aBitBits[1].trim().replaceAll(/\n/g, "");
                                if (warTemplates.includes(templateTitle) && CC7.isOK(aBitFact)) {
                                    if (aBitField == "startdate") {
                                        evDateStart = CC7.dateToYMD(aBitFact);
                                        evStart = "joined " + templateTitle;
                                    }
                                    if (aBitField == "enddate") {
                                        evDateEnd = CC7.dateToYMD(aBitFact);
                                        evEnd = "left " + templateTitle;
                                    }
                                    if (aBitField == "enlisted") {
                                        evDateStart = CC7.dateToYMD(aBitFact);
                                        evStart = "enlisted for " + templateTitle.replace("american", "American");
                                    }
                                    if (aBitField == "discharged") {
                                        evDateEnd = CC7.dateToYMD(aBitFact);
                                        evEnd = "discharged from " + templateTitle.replace("american", "American");
                                    }
                                    if (aBitField == "branch") {
                                        evLocation = aBitFact;
                                    }
                                }
                            }
                        });
                        if (CC7.isOK(evDateStart)) {
                            evDate = evDateStart;
                            ev = evStart;
                            timeLineEvent.push({
                                eventDate: evDate,
                                location: evLocation,
                                firstName: aPerson.FirstName,
                                LastNameAtBirth: aPerson.LastNameAtBirth,
                                lastNameCurrent: aPerson.LastNameCurrent,
                                birthDate: aPerson.BirthDate,
                                relation: aPerson.Relation,
                                bio: aPerson.bio,
                                evnt: ev,
                                wtId: aPerson.Name,
                            });
                        }
                        if (CC7.isOK(evDateEnd)) {
                            evDate = evDateEnd;
                            ev = evEnd;
                            timeLineEvent.push({
                                eventDate: evDate,
                                location: evLocation,
                                firstName: aPerson.FirstName,
                                LastNameAtBirth: aPerson.LastNameAtBirth,
                                lastNameCurrent: aPerson.LastNameCurrent,
                                birthDate: aPerson.BirthDate,
                                relation: aPerson.Relation,
                                bio: aPerson.bio,
                                evnt: ev,
                                wtId: aPerson.Name,
                            });
                        }
                    });
                }
            }
        });
        return timeLineEvent;
    }

    static buildTimeline(tPerson, timelineEvents) {
        const timelineTable = $(
            `<div class='timeline' data-wtid='${tPerson.Name}'><w>↔</w><x>[ x ]</x><table class="timelineTable">` +
                `<caption>Events in the life of ${tPerson.FirstName}'s family</caption>` +
                "<thead><th class='tlDate'>Date</th><th class='tlBioAge'>Age</th>" +
                "<th class='tlEventDescription'>Event</th><th class='tlEventLocation'>Location</th>" +
                `</thead><tbody></tbody></table></div>`
        );
        let bpDead = false;
        let bpDeadAge;
        timelineEvents.forEach(function (aFact) {
            // Add events to the table
            const isEventForBioPerson = aFact.wtId == tPerson.Name;
            const showDate = aFact.eventDate.replace("-00-00", "").replace("-00", "");
            const tlDate = "<td class='tlDate'>" + showDate + "</td>";
            let aboutAge = "";
            let bpBdate = tPerson.BirthDate;
            if (!tPerson.BirthDate) {
                bpBdate = tPerson.BirthDateDecade.replace(/0s/, "5");
            }
            let hasBdate = true;
            if (bpBdate == "0000-00-00") {
                hasBdate = false;
            }
            const bpBD = CC7.getApproxDate(bpBdate);
            const evDate = CC7.getApproxDate(aFact.eventDate);
            const aPersonBD = CC7.getApproxDate(aFact.birthDate);
            if (bpBD.Approx == true) {
                aboutAge = "~";
            }
            if (evDate.Approx == true) {
                aboutAge = "~";
            }
            const bpAgeAtEvent = CC7.getAge(new Date(bpBD.Date), new Date(evDate.Date));
            let bpAge;
            if (bpAgeAtEvent == 0) {
                bpAge = "";
            } else if (bpAgeAtEvent < 0) {
                bpAge = `–${-bpAgeAtEvent}`;
            } else {
                bpAge = `${bpAgeAtEvent}`;
            }
            if (bpDead == true) {
                const theDiff = parseInt(bpAgeAtEvent - bpDeadAge);
                bpAge = "&#x1F397;+ " + theDiff;
            }
            let theBPAge;
            if (aboutAge != "" && bpAge != "") {
                theBPAge = "(" + bpAge + ")";
            } else {
                theBPAge = bpAge;
            }
            if (hasBdate == false) {
                theBPAge = "";
            }
            const tlBioAge =
                "<td class='tlBioAge'>" +
                (aFact.evnt == "Death" && aFact.wtId == tPerson.Name ? "&#x1F397; " : "") +
                theBPAge +
                "</td>";
            if (aFact.relation == undefined || isEventForBioPerson) {
                aFact.relation = "";
            }

            let relation = aFact.relation.replace(/s$/, "");
            const eventName = aFact.evnt.replaceAll(/Us\b/g, "US").replaceAll(/Ii\b/g, "II");

            let fNames = aFact.firstName;
            if (aFact.evnt == "marriage") {
                fNames = tPerson.FirstName + " and " + aFact.firstName;
                relation = "";
            }
            const tlFirstName = "<a href='https://www.wikitree.com/wiki/" + aFact.wtId + "'>" + fNames + "</a>";
            const tlEventLocation = "<td class='tlEventLocation'>" + aFact.location + "</td>";

            if (aPersonBD.Approx == true) {
                aboutAge = "~";
            }
            let aPersonAge = CC7.getAge(new Date(aPersonBD.Date), new Date(evDate.Date));
            if (aPersonAge == 0 || aPersonBD.Date.match(/0000/) != null) {
                aPersonAge = "";
                aboutAge = "";
            }
            let theAge;
            if (aboutAge != "" && aPersonAge != "") {
                theAge = "(" + aPersonAge + ")";
            } else {
                theAge = aPersonAge;
            }

            let descr;
            if (CC7.#BMD_EVENTS.includes(aFact.evnt)) {
                descr =
                    CC7.capitalizeFirstLetter(eventName) +
                    " of " +
                    (relation == "" ? relation : relation + ", ") +
                    tlFirstName +
                    (theAge == "" ? "" : ", " + theAge);
            } else {
                const who =
                    relation == ""
                        ? tlFirstName
                        : CC7.capitalizeFirstLetter(relation) +
                          " " +
                          tlFirstName +
                          (theAge == "" ? "" : ", " + theAge + ",");
                descr = who + " " + eventName;
            }

            const tlEventDescription = "<td class='tlEventDescription'>" + descr + "</td>";

            let classText = "";
            if (isEventForBioPerson) {
                classText += "BioPerson ";
            }
            classText += aFact.evnt + " ";
            const tlTR = $(
                "<tr class='" + classText + "'>" + tlDate + tlBioAge + tlEventDescription + tlEventLocation + "</tr>"
            );
            timelineTable.find("tbody").append(tlTR);
            if (aFact.evnt == "Death" && aFact.wtId == tPerson.Name) {
                bpDead = true;
                bpDeadAge = bpAgeAtEvent;
            }
        });
        return timelineTable;
    }

    static showTimeline(jqClicked) {
        const wtId = jqClicked.attr("data-name");
        let tPerson = "";
        for (const oPers of window.people) {
            if (oPers.Name == wtId) {
                tPerson = oPers;
                break;
            }
        }
        const theClickedName = tPerson.Name;
        const familyId = theClickedName.replace(" ", "_") + "_timeLine";
        if ($(`#${familyId}`).length) {
            $(`#${familyId}`).slideToggle();
            return;
        }

        const familyFacts = CC7.getTimelineEvents(tPerson);
        // Sort the events
        familyFacts.sort((a, b) => {
            return a.eventDate.localeCompare(b.eventDate);
        });
        if (!tPerson.FirstName) {
            tPerson.FirstName = tPerson.RealName;
        }
        // Make a table
        const timelineTable = CC7.buildTimeline(tPerson, familyFacts, familyId);
        // Attach the table to the container div
        timelineTable.prependTo($("div.cc7Table"));
        //timelineTable.css({ top: window.pointerY - 30, left: 10 });

        timelineTable.attr("id", familyId);
        timelineTable.draggable();
        timelineTable.dblclick(function () {
            $(this).slideUp();
        });

        CC7.setOffset(jqClicked, timelineTable, 75, 40);
        $(window).resize(function () {
            if (timelineTable.length) {
                CC7.setOffset(jqClicked, timelineTable, 75, 40);
            }
        });

        timelineTable.slideDown("slow");
        timelineTable.find("x").click(function () {
            timelineTable.slideUp();
        });
        timelineTable.find("w").click(function () {
            timelineTable.toggleClass("wrap");
        });
    }

    static setOffset(theClicked, elem, lOffset, tOffset) {
        const theLeft = CC7.getOffset(theClicked[0]).left + lOffset;
        elem.css({ top: CC7.getOffset(theClicked[0]).top + tOffset, left: theLeft });
    }

    static peopleToTable(kPeople) {
        let disName = CC7.displayName(kPeople[0])[0];
        if ($("#cc7Container").length) {
            if (kPeople[0].MiddleName) {
                disName = disName.replace(kPeople[0].MiddleName + " ", "");
            }
        }
        const captionHTML =
            "<a href='https://www.wikitree.com/wiki/" + CC7.htmlEntities(kPeople[0].Name) + "'>" + disName + "</a>";
        const kTable = $(
            `<div class='familySheet'><w>↔</w><x>[ x ]</x><table><caption>${captionHTML}</caption>` +
                "<thead><tr><th>Relation</th><th>Name</th><th>Birth Date</th><th>Birth Place</th><th>Death Date</th><th>Death Place</th></tr></thead>" +
                "<tbody></tbody></table></div>"
        );
        kPeople.forEach(function (kPers) {
            let rClass = "";
            let isDecades = false;
            kPers.RelationShow = kPers.Relation;
            if (kPers.Relation == undefined || kPers.Active) {
                kPers.Relation = "Sibling";
                kPers.RelationShow = "";
                rClass = "self";
            }

            let bDate;
            if (kPers.BirthDate) {
                bDate = kPers.BirthDate;
            } else if (kPers.BirthDateDecade) {
                bDate = kPers.BirthDateDecade.slice(0, -1) + "-00-00";
                isDecades = true;
            } else {
                bDate = "0000-00-00";
            }

            let dDate;
            if (kPers.DeathDate) {
                dDate = kPers.DeathDate;
            } else if (kPers.DeathDateDecade) {
                if (kPers.DeathDateDecade == "unknown") {
                    dDate = "0000-00-00";
                } else {
                    dDate = kPers.DeathDateDecade.slice(0, -1) + "-00-00";
                }
            } else {
                dDate = "0000-00-00";
            }

            if (kPers.BirthLocation == null || kPers.BirthLocation == undefined) {
                kPers.BirthLocation = "";
            }

            if (kPers.DeathLocation == null || kPers.DeathLocation == undefined) {
                kPers.DeathLocation = "";
            }

            if (kPers.MiddleName == null) {
                kPers.MiddleName = "";
            }
            let oName = CC7.displayName(kPers)[0];

            if (kPers.Relation) {
                kPers.Relation = kPers.Relation.replace(/s$/, "").replace(/ren$/, "");
                if (rClass != "self") {
                    kPers.RelationShow = kPers.Relation;
                }
            }
            if (oName) {
                let oBDate = CC7.ymdFix(bDate);
                let oDDate = CC7.ymdFix(dDate);
                if (isDecades == true) {
                    oBDate = kPers.BirthDateDecade;
                    if (oDDate != "") {
                        oDDate = kPers.DeathDateDecade;
                    }
                }
                const linkName = CC7.htmlEntities(kPers.Name);
                const aLine = $(
                    "<tr data-name='" +
                        kPers.Name +
                        "' data-birthdate='" +
                        bDate.replaceAll(/\-/g, "") +
                        "' data-relation='" +
                        kPers.Relation +
                        "' class='" +
                        rClass +
                        " " +
                        kPers.Gender +
                        "'><td>" +
                        kPers.RelationShow +
                        "</td><td><a  target='_blank'  href='https://www.wikitree.com/wiki/" +
                        linkName +
                        "'>" +
                        oName +
                        "</td><td class='aDate'>" +
                        oBDate +
                        "</td><td>" +
                        kPers.BirthLocation +
                        "</td><td class='aDate'>" +
                        oDDate +
                        "</td><td>" +
                        kPers.DeathLocation +
                        "</td></tr>"
                );

                kTable.find("tbody").append(aLine);
            }

            if (kPers.Relation == "Spouse") {
                let marriageDeets = "m.";
                const dMdate = CC7.ymdFix(kPers.marriage_date);
                if (dMdate != "") {
                    marriageDeets += " " + dMdate;
                }
                if (CC7.isOK(kPers.marriage_location)) {
                    marriageDeets += " " + kPers.marriage_location;
                }
                if (marriageDeets != "m.") {
                    const spouseLine = $(
                        "<tr class='marriageRow " +
                            kPers.Gender +
                            "' data-spouse='" +
                            kPers.Name +
                            "'><td>&nbsp;</td><td colspan='3'>" +
                            marriageDeets +
                            "</td><td></td><td></td></tr>"
                    );
                    kTable.find("tbody").append(spouseLine);
                }
            }
        });
        const rows = kTable.find("tbody tr");
        rows.sort((a, b) => ($(b).data("birthdate") < $(a).data("birthdate") ? 1 : -1));
        kTable.find("tbody").append(rows);

        const familyOrder = ["Parent", "Sibling", "Spouse", "Child"];
        familyOrder.forEach(function (relWord) {
            kTable.find("tr[data-relation='" + relWord + "']").each(function () {
                $(this).appendTo(kTable.find("tbody"));
            });
        });

        kTable.find(".marriageRow").each(function () {
            $(this).insertAfter(kTable.find("tr[data-name='" + $(this).data("spouse") + "']"));
        });

        return kTable;
    }

    static doFamilySheet(fPerson, theClicked) {
        const theClickedName = fPerson.Name;
        const familyId = theClickedName.replace(" ", "_") + "_family";
        if ($(`#${familyId}`).length) {
            $(`#${familyId}`).slideToggle();
            return;
        }

        const thisFamily = [fPerson].concat(fPerson.Parent, fPerson.Sibling, fPerson.Spouse, fPerson.Child);

        const kkTable = CC7.peopleToTable(thisFamily);
        kkTable.prependTo("div.cc7Table");
        kkTable.attr("id", familyId);
        kkTable.draggable();
        kkTable.on("dblclick", function () {
            $(this).slideUp();
        });

        CC7.setOffset(theClicked, kkTable, 0, 40);
        $(window).resize(function () {
            if (kkTable.length) {
                CC7.setOffset(theClicked, kkTable, 0, 40);
            }
        });

        kkTable.slideDown("slow");
        kkTable.find("x").click(function () {
            kkTable.slideUp();
        });
        kkTable.find("w").click(function () {
            kkTable.toggleClass("wrap");
        });
    }

    static showFamilySheet(jq) {
        let theClicked = jq;
        let theClickedName = jq.closest("tr").attr("data-name");

        let fsReady = false;
        for (const aPeo of window.people) {
            if (aPeo.Name == theClickedName) {
                //console.log(aPeo.Name);
                if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
                    CC7.doFamilySheet(aPeo, theClicked);
                    fsReady = true;
                    break;
                }
            }
        }
        if (fsReady == false) {
            WikiTreeAPI.postToAPI({
                action: "getRelatives",
                getSpouses: "1",
                getChildren: "1",
                getParents: "1",
                getSiblings: "1",
                keys: theClickedName,
            }).then((data) => {
                const thePeople = data[0].items;
                thePeople.forEach(function (aPerson, index) {
                    const mPerson = aPerson.person;
                    const mSpouses = CC7.getRels(mPerson.Spouses, mPerson, "Spouse");
                    mPerson.Spouse = mSpouses;
                    const mChildren = CC7.getRels(mPerson.Children, mPerson, "Child");
                    mPerson.Child = mChildren;
                    const mSiblings = CC7.getRels(mPerson.Siblings, mPerson, "Sibling");
                    mPerson.Sibling = mSiblings;
                    const mParents = CC7.getRels(mPerson.Parents, mPerson, "Parent");
                    mPerson.Parent = mParents;
                });
                window.people.forEach(function (aPeo) {
                    if (aPeo.Name == theClickedName) {
                        aPeo = mPerson;
                    }
                });
                CC7.doFamilySheet(mPerson, theClicked);
            });
        }
    }

    static getRels(rel, person, theRelation = false) {
        const peeps = [];
        if (typeof rel == undefined || rel == null) {
            return false;
        }
        const pKeys = Object.keys(rel);
        pKeys.forEach(function (pKey) {
            const aPerson = rel[pKey];
            if (theRelation != false) {
                aPerson.Relation = theRelation;
            }
            peeps.push(aPerson);
        });

        return peeps;
    }

    static getDateFormat(fbds) {
        let fullDateFormat = "j M Y";

        let dateFormat;
        if (Cookies.get("w_dateFormat")) {
            dateFormat = Cookies.get("w_dateFormat");
        } else {
            dateFormat = 0;
            fullDateFormat = "M j, Y";
        }
        if (dateFormat == 1) {
            fullDateFormat = "j M Y";
        }
        if (dateFormat == 2) {
            fullDateFormat = "F j, Y";
        } else if (dateFormat == 3) {
            fullDateFormat = "j F Y";
        }

        let fbd;
        if (fbds[1] != "00" && fbds[2] != "00" && fbds[0] != "00") {
            // month is zero-indexed(!)
            const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
            fbd = fbdsDate.format("j M Y");
            if (dateFormat > 0) {
                fbd = fbdsDate.format(fullDateFormat);
            }
        } else if (fbds[1] != "00" && fbds[2] == "00" && fbds[0] != "00") {
            // month is zero-indexed(!)
            const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
            fbd = fbdsDate.format("M Y");
            if (dateFormat > 1) {
                fbd = fbdsDate.format("F Y");
            }
        } else if (fbds[1] != "00" && fbds[2] == "00") {
            // month is zero-indexed(!)
            const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
            fbd = fbdsDate.format("M Y");
            if (dateFormat > 1) {
                fbd = fbdsDate.format("F Y");
            }
        } else {
            // month is zero-indexed(!)
            const fbdsDate = new Date(fbds[0], 0, 1);
            fbd = fbdsDate.format("Y");
        }
        return fbd;
    }

    static bdDatesStatus(person) {
        let statusChoice = "symbols";
        let abbr = false;
        if ($("input[name='statusChoice'][value='abbreviations']").prop("checked") == true) {
            statusChoice = "abbreviations";
            abbr = true;
        }

        var bdStatus = "";
        var ddStatus = "";
        if (typeof person["DataStatus"] != "undefined") {
            if (person["BirthDate"] != "0000-00-00") {
                if (person["DataStatus"]["BirthDate"] != "") {
                    if (person["DataStatus"]["BirthDate"] == "guess") {
                        bdStatus = "~";
                        if (abbr) {
                            bdStatus = "abt. ";
                        }
                    } else if (person["DataStatus"]["BirthDate"] == "before") {
                        bdStatus = "<";
                        if (abbr) {
                            bdStatus = "bef. ";
                        }
                    } else if (person["DataStatus"]["BirthDate"] == "after") {
                        bdStatus = ">";
                        if (abbr) {
                            bdStatus = "aft. ";
                        }
                    }
                }
            }
        }
        if (typeof person["DataStatus"] != "undefined") {
            if (person["DeathDate"] != "0000-00-00") {
                if (person["DataStatus"]["DeathDate"] != "") {
                    if (person["DataStatus"]["DeathDate"] == "guess") {
                        ddStatus = "~";
                        if (abbr) {
                            ddStatus = "abt. ";
                        }
                    } else if (person["DataStatus"]["DeathDate"] == "before") {
                        ddStatus = "<";
                        if (abbr) {
                            ddStatus = "bef. ";
                        }
                    } else if (person["DataStatus"]["DeathDate"] == "after") {
                        ddStatus = ">";
                        if (abbr) {
                            ddStatus = "aft. ";
                        }
                    }
                }
            }
        }
        return [bdStatus, ddStatus];
    }

    static ymdFix(date) {
        let outDate;
        if (date == undefined || date == "") {
            outDate = "";
        } else {
            const dateBits1 = date.split(" ");
            if (dateBits1[2]) {
                const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const dMonth = date.match(/[A-z]+/i);
                let dMonthNum;
                if (dMonth != null) {
                    sMonths.forEach(function (aSM, i) {
                        if (
                            dMonth[0].toLowerCase() == aSM.toLowerCase() ||
                            dMonth[0].toLowerCase() == aSM + ".".toLowerCase()
                        ) {
                            dMonthNum = (i + 1).toString().padStart(2, "0");
                        }
                    });
                }
                const dDate = date.match(/\b[0-9]{1,2}\b/);
                const dDateNum = dDate[0];
                const dYear = date.match(/\b[0-9]{4}\b/);
                const dYearNum = dYear[0];
                return dYearNum + "-" + dMonthNum + "-" + dDateNum;
            } else {
                const dateBits = date.split("-");
                outDate = date;
                if (dateBits[1] == "00" && dateBits[2] == "00") {
                    if (dateBits[0] == "0000") {
                        outDate = "";
                    } else {
                        outDate = dateBits[0];
                    }
                }
            }
        }
        return outDate;
    }

    static isOK(thing) {
        const excludeValues = [
            "",
            null,
            "null",
            "0000-00-00",
            "unknown",
            "Unknown",
            "undefined",
            undefined,
            "0000",
            "0",
            0,
        ];
        if (!excludeValues.includes(thing)) {
            if (CC7.isNumeric(thing)) {
                return true;
            } else {
                if (jQuery.type(thing) === "string") {
                    const nanMatch = thing.match(/NaN/);
                    if (nanMatch == null) {
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            }
        } else {
            return false;
        }
    }

    static isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    static location2ways(locationText) {
        const alSplit = locationText.split(",");
        const alSplit2 = alSplit.map((string) => string.trim());
        const s2b = alSplit2.join(", ");
        const b2s = alSplit2.reverse().join(", ");
        return [s2b, b2s];
    }

    static USstatesObjArray = [
        { name: "Alabama", abbreviation: "AL" },
        { name: "Alaska", abbreviation: "AK" },
        { name: "American Samoa", abbreviation: "AS" },
        { name: "Arizona", abbreviation: "AZ" },
        { name: "Arkansas", abbreviation: "AR" },
        { name: "California", abbreviation: "CA" },
        { name: "Colorado", abbreviation: "CO" },
        { name: "Connecticut", abbreviation: "CT" },
        { name: "Delaware", abbreviation: "DE" },
        { name: "District Of Columbia", abbreviation: "DC" },
        { name: "Federated States Of Micronesia", abbreviation: "FM" },
        { name: "Florida", abbreviation: "FL" },
        { name: "Georgia", abbreviation: "GA" },
        { name: "Guam", abbreviation: "GU" },
        { name: "Hawaii", abbreviation: "HI" },
        { name: "Idaho", abbreviation: "ID" },
        { name: "Illinois", abbreviation: "IL" },
        { name: "Indiana", abbreviation: "IN" },
        { name: "Iowa", abbreviation: "IA" },
        { name: "Kansas", abbreviation: "KS" },
        { name: "Kentucky", abbreviation: "KY" },
        { name: "Louisiana", abbreviation: "LA" },
        { name: "Maine", abbreviation: "ME" },
        { name: "Marshall Islands", abbreviation: "MH" },
        { name: "Maryland", abbreviation: "MD" },
        { name: "Massachusetts", abbreviation: "MA" },
        { name: "Michigan", abbreviation: "MI" },
        { name: "Minnesota", abbreviation: "MN" },
        { name: "Mississippi", abbreviation: "MS" },
        { name: "Missouri", abbreviation: "MO" },
        { name: "Montana", abbreviation: "MT" },
        { name: "Nebraska", abbreviation: "NE" },
        { name: "Nevada", abbreviation: "NV" },
        { name: "New Hampshire", abbreviation: "NH" },
        { name: "New Jersey", abbreviation: "NJ" },
        { name: "New Mexico", abbreviation: "NM" },
        { name: "New York", abbreviation: "NY" },
        { name: "North Carolina", abbreviation: "NC" },
        { name: "North Dakota", abbreviation: "ND" },
        { name: "Northern Mariana Islands", abbreviation: "MP" },
        { name: "Ohio", abbreviation: "OH" },
        { name: "Oklahoma", abbreviation: "OK" },
        { name: "Oregon", abbreviation: "OR" },
        { name: "Palau", abbreviation: "PW" },
        { name: "Pennsylvania", abbreviation: "PA" },
        { name: "Puerto Rico", abbreviation: "PR" },
        { name: "Rhode Island", abbreviation: "RI" },
        { name: "South Carolina", abbreviation: "SC" },
        { name: "South Dakota", abbreviation: "SD" },
        { name: "Tennessee", abbreviation: "TN" },
        { name: "Texas", abbreviation: "TX" },
        { name: "Utah", abbreviation: "UT" },
        { name: "Vermont", abbreviation: "VT" },
        { name: "Virgin Islands", abbreviation: "VI" },
        { name: "Virginia", abbreviation: "VA" },
        { name: "Washington", abbreviation: "WA" },
        { name: "West Virginia", abbreviation: "WV" },
        { name: "Wisconsin", abbreviation: "WI" },
        { name: "Wyoming", abbreviation: "WY" },
    ];

    static secondarySort3(aList, dataThing1, dataThing2, isText = 0, reverse = 0) {
        let lastOne = "Me";
        let tempArr = [lastOne];

        const rows = aList.find("li");
        rows.each(function (index) {
            if ($(this).data(dataThing1) == lastOne) {
                tempArr.push($(this));
            } else {
                tempArr.sort(function (a, b) {
                    if (isText == 1) {
                        if (reverse == 0) {
                            return $(a).data(dataThing2).localeCompare($(b).data(dataThing2));
                        } else {
                            return $(b).data(dataThing2).localeCompare($(a).data(dataThing2));
                        }
                    } else {
                        if (reverse == 0) {
                            return $(a).data(dataThing2) - $(b).data(dataThing2);
                        } else {
                            return $(b).data(dataThing2) - $(a).data(dataThing2);
                        }
                    }
                });

                tempArr.forEach(function (item) {
                    if (lastOne != "Me") {
                        item.insertBefore(rows.eq(index));
                    }
                });
                tempArr = [$(this)];
            }
            lastOne = $(this).data(dataThing1);
        });
    }

    static fillLocations(rows, order) {
        rows.each(function () {
            $(this)
                .find("td.birthlocation")
                .text($(this).attr("data-birthlocation" + order));
            $(this)
                .find("td.deathlocation")
                .text($(this).attr("data-deathlocation" + order));
        });
        return rows;
    }

    static sortByThis(el) {
        const aTable = $("#peopleTable");
        el.click(function () {
            let sorter = el.attr("id");
            let rows = aTable.find("tbody tr");
            if (sorter == "birthlocation" || sorter == "deathlocation") {
                if (sorter == "birthlocation") {
                    if (el.attr("data-order") == "s2b") {
                        sorter = "birthlocation-reversed";
                        el.attr("data-order", "b2s");
                        rows = CC7.fillLocations(rows, "-reversed");
                    } else {
                        el.attr("data-order", "s2b");
                        rows = CC7.fillLocations(rows, "");
                    }
                } else if (sorter == "deathlocation") {
                    if (el.attr("data-order") == "s2b") {
                        sorter = "deathlocation-reversed";
                        el.attr("data-order", "b2s");
                        rows = CC7.fillLocations(rows, "-reversed");
                    } else {
                        el.attr("data-order", "s2b");
                        rows = CC7.fillLocations(rows, "");
                    }
                }
                rows.sort(function (a, b) {
                    if ($(b).data(sorter) == "") {
                        return true;
                    }
                    return $(a).data(sorter).localeCompare($(b).data(sorter));
                });
            } else if (isNaN(rows.data(sorter))) {
                if (el.attr("data-order") == "asc") {
                    rows.sort(function (a, b) {
                        if ($(a).data(sorter) == "") {
                            return true;
                        }
                        return $(b).data(sorter).localeCompare($(a).data(sorter));
                    });
                    el.attr("data-order", "desc");
                } else {
                    rows.sort(function (a, b) {
                        if ($(b).data(sorter) == "") {
                            return true;
                        }
                        return $(a).data(sorter).localeCompare($(b).data(sorter));
                    });
                    el.attr("data-order", "asc");
                }
            } else {
                if (el.attr("data-order") == "asc") {
                    rows.sort((a, b) => ($(b).data(sorter) > $(a).data(sorter) ? 1 : -1));
                    el.attr("data-order", "desc");
                } else {
                    rows.sort((a, b) => ($(a).data(sorter) > $(b).data(sorter) ? 1 : -1));
                    el.attr("data-order", "asc");
                }
            }
            aTable.find("tbody").append(rows);
            rows.each(function () {
                const toBottom = ["", "00000000"];
                if (toBottom.includes(el.data(sorter))) {
                    aTable.find("tbody").append(el);
                }
            });
            aTable.find("tr.main").prependTo(aTable.find("tbody"));
        });
    }

    static async addPeopleTable() {
        $("#savePeople").show();
        const sortTitle = "title='Click to sort'";
        const aCaption = "<caption></caption>";
        const degreeTH = `<th id='degree' ${sortTitle}>°</th>`;
        const createdTH = `<th id='created' ${sortTitle} data-order='asc'>Created</th>`;
        const touchedTH = `<th id='touched' ${sortTitle} data-order='asc'>Modified</th>`;
        const parentsNum = "<th id='parent' title='Parents. Click to sort.' data-order='desc'>Par.</th>";
        const siblingsNum = "<th id='sibling' title='Siblings. Click to sort.' data-order='desc'>Sib.</th>";
        const spousesNum = "<th id='spouse' title='Spouses. Click to sort.' data-order='desc'>Sp.</th>";
        const childrenNum = "<th id='child' title='Children. Click to sort.' data-order='desc'>Ch.</th>";
        const ageAtDeathCol = "<th id='age-at-death' title='Age at Death. Click to sort.'  data-order='desc'>Age</th>";

        const aTable = $(
            "<table id='peopleTable' class='peopleTable'>" +
                aCaption +
                "<thead><tr><th></th><th></th><th></th>" +
                degreeTH +
                parentsNum +
                siblingsNum +
                spousesNum +
                childrenNum +
                `<th data-order='' id='firstname' ${sortTitle}>Given name(s)</th>` +
                `<th data-order='' id='lnab' ${sortTitle}>Last name at Birth</th>` +
                `<th data-order='' id='lnc' ${sortTitle}>Current Last Name</th>` +
                `<th data-order='' id='birthdate' ${sortTitle}>Birth date</th>` +
                `<th data-order='' id='birthlocation' ${sortTitle}>Birth place</th>` +
                `<th data-order='' id='deathdate' ${sortTitle}>Death date</th>` +
                `<th data-order='' id='deathlocation' ${sortTitle}>Death place</th>` +
                ageAtDeathCol +
                createdTH +
                touchedTH +
                "</tr></thead><tbody></tbody></table>"
        );

        if ($(".peopleTable").length) {
            $(".peopleTable").eq(0).replaceWith(aTable);
        } else {
            aTable.appendTo($("div.cc7Table"));
        }

        function makePrivateAncestor(ancestor, degree, gender, name, firstname, lnab, lnc) {
            const person = ancestor;
            person.Degree = degree;
            person.Gender = gender;
            person.Name = name;
            person.FirstName = firstname;
            person.LastNameAtBirth = lnab;
            person.LastNameCurrent = lnc;
            person.DataStatus = { Spouse: "", Gender: "" };
            return person;
        }
        function addRelativeArraysToPrivateAncestor(person, spouse, child) {
            person.Parent = [];
            person.Spouse = [spouse];
            person.Sibling = [];
            person.Child = [child];
            return person;
        }
        function addMissingGrandparents(parent, ForM, gender, name, relation, lnab, lnc, parentClone) {
            let person;
            if (parent[ForM] < 0) {
                window.ancestors.forEach(function (anAncestor) {
                    if (anAncestor.Id == parent[ForM]) {
                        person = makePrivateAncestor(anAncestor, 2, gender, name, relation, lnab, lnc);
                    }
                });
            } else {
                window.people.forEach(function (aPerson) {
                    if (aPerson.Id == parent[ForM]) {
                        person = JSON.parse(JSON.stringify(aPerson));
                    }
                });
            }
            if (person) {
                const personClone = JSON.parse(JSON.stringify(person));
                person = addRelativeArraysToPrivateAncestor(person, "", parentClone);
                parent.Parent.push(personClone);
                if (!parent.Parents) {
                    parent.Parents = {};
                }
                parent.Parents[person.Id] = personClone;
                if (window[ForM] < 0) {
                    window.people.push(person);
                }
                console.log(person, window.people);
            }
            return person;
        }

        if (!window.people[0].Father || !window.people[0].Mother) {
            window.people[0].Father = window.ancestors[0].Father;
            window.people[0].Mother = window.ancestors[0].Mother;
            let theFather;
            let theMother;
            window.ancestors.forEach(function (anAncestor) {
                if (window.people[0].Father && anAncestor.Id == window.people[0].Father) {
                    theFather = makePrivateAncestor(
                        anAncestor,
                        1,
                        "Male",
                        "Private-Father",
                        "Father",
                        window.people[0].LastNameAtBirth,
                        window.people[0].LastNameAtBirth
                    );
                    if (window.people[0].Father < 0) {
                        window.people.push(theFather);
                    }
                }
                if (window.people[0].Mother && anAncestor.Id == window.people[0].Mother) {
                    theMother = makePrivateAncestor(
                        anAncestor,
                        1,
                        "Female",
                        "Private-Mother",
                        "Mother",
                        "Private",
                        "Private"
                    );
                    if (window.people[0].Mother < 0) {
                        window.people.push(theMother);
                    }
                }
            });

            if (theFather) {
                var theFatherClone = JSON.parse(JSON.stringify(theFather));
                window.people[0].Parent.push(theFatherClone);
            }
            if (theMother) {
                var theMotherClone = JSON.parse(JSON.stringify(theMother));
                window.people[0].Parent.push(theMotherClone);
            }
            let paternalGrandfather, paternalGrandmother, maternalGrandfather, maternalGrandmother;
            if (theFather) {
                let fSpouse = "";
                if (theMother) {
                    fSpouse = theMotherClone;
                }
                theFather = addRelativeArraysToPrivateAncestor(
                    theFather,
                    fSpouse,
                    JSON.parse(JSON.stringify(window.ancestors[0]))
                );

                if (theFather.Father) {
                    paternalGrandfather = addMissingGrandparents(
                        theFather,
                        "Father",
                        "Male",
                        "Private-Grandfather-1",
                        "Grandfather",
                        window.people[0].LastNameAtBirth,
                        window.people[0].LastNameAtBirth,
                        theFatherClone
                    );
                }
                if (theFather.Mother) {
                    paternalGrandmother = addMissingGrandparents(
                        theFather,
                        "Mother",
                        "Female",
                        "Private-Grandmother-1",
                        "Grandmother",
                        "Private",
                        "Private",
                        theFatherClone
                    );
                }
            }

            if (theMother) {
                let fSpouse = "";
                if (theFather) {
                    fSpouse = theFatherClone;
                }
                theMother = addRelativeArraysToPrivateAncestor(
                    theMother,
                    fSpouse,
                    JSON.parse(JSON.stringify(window.ancestors[0]))
                );

                if (theMother.Father) {
                    maternalGrandfather = addMissingGrandparents(
                        theMother,
                        "Father",
                        "Male",
                        "Private-Grandfather-2",
                        "Grandfather",
                        "Private",
                        "Private",
                        theMotherClone
                    );
                }
                if (theMother.Mother) {
                    maternalGrandmother = addMissingGrandparents(
                        theMother,
                        "Mother",
                        "Female",
                        "Private-Grandmother-2",
                        "Grandmother",
                        "Private",
                        "Private",
                        theMotherClone
                    );
                }
            }

            [
                theFather,
                theMother,
                paternalGrandfather,
                paternalGrandmother,
                maternalGrandfather,
                maternalGrandmother,
            ].forEach(function (aGrandparent) {
                if (aGrandparent) {
                    window.people.forEach(function (person) {
                        if (person.Id == aGrandparent.Father || person.Id == aGrandparent.Mother) {
                            let notIn = true;
                            if (person.Child.length) {
                                person.Child.forEach(function (aChild) {
                                    if (aChild.Id == aGrandparent.Id) {
                                        notIn = false;
                                    }
                                });
                            }
                            if (notIn) {
                                person.Child.push(JSON.parse(JSON.stringify(aGrandparent)));
                            }
                        }
                    });
                }
            });
        }

        window.people.forEach(function (mPerson, index) {
            let birthDate = CC7.ymdFix(mPerson.BirthDate);
            if (birthDate == "") {
                if (mPerson.BirthDateDecade) {
                    birthDate = mPerson.BirthDateDecade;
                }
            }
            let deathDate = CC7.ymdFix(mPerson.DeathDate);
            if (deathDate == "") {
                if (mPerson.deathDateDecade) {
                    deathDate = mPerson.DeathDateDecade;
                }
            }

            let birthLocation = mPerson.BirthLocation;
            let birthLocationReversed = "";
            if (birthLocation == null || typeof birthLocation == "undefined") {
                birthLocation = "";
            } else {
                const bLocation2ways = CC7.location2ways(birthLocation);
                birthLocation = bLocation2ways[0];
                birthLocationReversed = bLocation2ways[1];
            }
            let deathLocation = mPerson.DeathLocation;
            let deathLocationReversed = "";
            if (deathLocation == null || typeof deathLocation == "undefined") {
                deathLocation = "";
            } else {
                const dLocation2ways = CC7.location2ways(deathLocation);
                deathLocation = dLocation2ways[0];
                deathLocationReversed = dLocation2ways[1];
            }

            function setLocations(mPerson) {
                const oLocations = [];
                const checkEm = [[mPerson], mPerson.Parent, mPerson.Spouse, mPerson.Sibling, mPerson.Child];

                checkEm.forEach(function (anArr) {
                    if (anArr) {
                        anArr.forEach(function (aPers) {
                            if (aPers.BirthLocation) {
                                const bits = aPers.BirthLocation.split(",");
                                bits.forEach(function (aBit) {
                                    const bit = aBit.trim();
                                    if (!oLocations.includes(bit)) {
                                        oLocations.push(bit);
                                    }
                                    let isUS = false;
                                    CC7.USstatesObjArray.forEach(function (obj) {
                                        if (bit == obj.name) {
                                            if (!oLocations.includes(obj.abbreviation)) {
                                                oLocations.push(obj.abbreviation);
                                            }
                                            isUS = true;
                                        }
                                        if (bit == obj.abbreviation) {
                                            if (!oLocations.includes(obj.name)) {
                                                oLocations.push(obj.name);
                                            }
                                            isUS = true;
                                        }
                                    });
                                });
                            }
                            if (aPers.DeathLocation) {
                                const bits = aPers.DeathLocation.split(",");
                                bits.forEach(function (aBit) {
                                    const bit = aBit.trim();
                                    if (!oLocations.includes(bit)) {
                                        oLocations.push(bit);
                                    }
                                    let isUS = false;
                                    CC7.USstatesObjArray.forEach(function (obj) {
                                        if (bit == obj.name) {
                                            if (!oLocations.includes(obj.abbreviation)) {
                                                oLocations.push(obj.abbreviation);
                                            }
                                            isUS = true;
                                        }
                                        if (bit == obj.abbreviation) {
                                            if (!oLocations.includes(obj.name)) {
                                                oLocations.push(obj.name);
                                            }
                                            isUS = true;
                                        }
                                    });
                                });
                            }
                        });
                    }
                });

                return oLocations;
            }

            const oLocations = setLocations(mPerson).join(",");

            const privacyLevel = mPerson.Privacy;

            let privacy = "";
            let privacyTitle = "";
            if (mPerson.Privacy_IsOpen == true || privacyLevel == 60) {
                privacy = "./views/cc7/images/privacy_open.png";
                privacyTitle = "Open";
            }
            if (mPerson.Privacy_IsPublic == true) {
                privacy = "./views/cc7/images/privacy_public.png";
                privacyTitle = "Public";
            }
            if (mPerson.Privacy_IsSemiPrivate == true || privacyLevel == 40) {
                privacy = "./views/cc7/images/privacy_public-tree.png";
                privacyTitle = "Private with Public Bio and Tree";
            }
            if (privacyLevel == 35) {
                privacy = "./views/cc7/images/privacy_privacy35.png";
                privacyTitle = "Private with Public Tree";
            }
            if (mPerson.Privacy_IsSemiPrivateBio == true || privacyLevel == 30) {
                privacy = "./views/cc7/images/privacy_public-bio.png";
                privacyTitle = "Public Bio";
            }
            if (privacyLevel == 20) {
                privacy = "./views/cc7/images/privacy_private.png";
                privacyTitle = "Private";
            }
            let firstName = mPerson.FirstName;
            if (mPerson.MiddleName) {
                firstName = mPerson.FirstName + " " + mPerson.MiddleName;
            }

            if (!mPerson.FirstName && mPerson.RealName) {
                firstName = mPerson.RealName;
            }

            if (birthDate == "unknown") {
                birthDate = "";
            }
            if (deathDate == "unknown") {
                deathDate = "";
            }

            let dBirthDate;
            if (mPerson.BirthDate) {
                dBirthDate = mPerson.BirthDate.replaceAll("-", "");
            } else if (mPerson.BirthDateDecade) {
                dBirthDate = CC7.getApproxDate2(mPerson.BirthDateDecade).Date.replace("-", "").padEnd(8, "0");
            } else {
                dBirthDate = "00000000";
            }

            let dDeathDate;
            if (mPerson.DeathDate) {
                dDeathDate = mPerson.DeathDate.replaceAll("-", "");
            } else if (mPerson.DeathDateDecade) {
                dDeathDate = CC7.getApproxDate2(mPerson.DeathDateDecade).Date.replace("-", "").padEnd(8, "0");
            } else {
                dDeathDate = "00000000";
            }

            if (firstName == undefined) {
                firstName = "Private";
                mPerson.LastNameCurrent = "";
                if (mPerson.Name.match(/Private/) == null) {
                    mPerson.LastNameAtBirth = mPerson.Name.split("-")[1];
                } else {
                    mPerson.LastNameAtBirth = "Private";
                }
            }
            const oLink =
                "<a target='_blank' href='https://www.wikitree.com/wiki/" +
                CC7.htmlEntities(mPerson.Name) +
                "'>" +
                firstName +
                "</a>";

            let degreeCell = "";
            let touched = "";
            let created = "";
            let ddegree = "";
            let dtouched = "";
            let dcreated = "";
            let ageAtDeathCell = "";
            let dAgeAtDeath = "";
            let diedYoung = false;

            let relNums = {
                Parent_data: "",
                Sibling_data: "",
                Spouse_data: "",
                Child_data: "",
                Parent_cell: "",
                Sibling_cell: "",
                Spouse_cell: "",
                Child_cell: "",
            };

            if ($("div.cc7Table").length) {
                degreeCell = "<td class='degree'>" + mPerson.Degree + "°</td>";
                ddegree = "data-degree='" + mPerson.Degree + "'";
                if (mPerson.Created) {
                    created =
                        "<td class='created aDate'>" +
                        mPerson.Created.replace(/([0-9]{4})([0-9]{2})([0-9]{2}).*/, "$1-$2-$3") +
                        "</td>";
                    dcreated = "data-created='" + mPerson.Created + "'";
                } else {
                    created = "<td class='created aDate'></td>";
                }

                let mAgeAtDeath = CC7.ageAtDeath(mPerson);
                let mAgeAtDeathNum = CC7.ageAtDeath(mPerson, false);

                if (mAgeAtDeath === false && mAgeAtDeath !== "0") {
                    mAgeAtDeath = "";
                }
                if (mAgeAtDeathNum < 0) {
                    mAgeAtDeath = 0;
                }
                if (mAgeAtDeathNum < 16 && (mAgeAtDeath != false || mAgeAtDeathNum === 0)) {
                    diedYoung = true;
                }

                ageAtDeathCell = "<td class='age-at-death'>" + mAgeAtDeath + "</td>";
                dAgeAtDeath = "data-age-at-death='" + mAgeAtDeathNum + "'";
                //	}
                if (mPerson.Touched) {
                    touched =
                        "<td class='touched aDate'>" +
                        mPerson.Touched.replace(/([0-9]{4})([0-9]{2})([0-9]{2}).*/, "$1-$2-$3") +
                        "</td>";
                    dtouched = "data-touched='" + mPerson.Touched + "'";
                } else {
                    touched = "<td class='touched aDate'></td>";
                    dtouched = "data-touched=''";
                }

                relNums = {};
                const rArr = ["Parent", "Sibling", "Spouse", "Child"];
                rArr.forEach(function (aR) {
                    let cellClass = "class='number'";
                    if (mPerson[aR].length) {
                        relNums[aR] = mPerson[aR].length;
                    } else {
                        relNums[aR] = "";
                    }
                    relNums[aR + "_data"] = "data-" + aR + "='" + relNums[aR] + "'";
                    let word;
                    if (aR == "Child") {
                        word = "Children";
                        if (mPerson.NoChildren == 1 || diedYoung == true) {
                            cellClass = "class='none number'";
                        }
                    } else {
                        word = aR + "s";
                    }
                    if (aR == "Spouse") {
                        if (mPerson.DataStatus.Spouse == "blank" || diedYoung == true) {
                            cellClass = "class='none number'";
                        }
                    }
                    relNums[aR + "_cell"] = "<td " + cellClass + " title='" + word + "'>" + relNums[aR] + "</td>";
                });

                if (!mPerson.Father && !mPerson.Mother) {
                    relNums["Parent_cell"] = "<td class='noParents number' title='missing parents'>0</td>";
                } else if (!mPerson.Father) {
                    relNums["Parent_cell"] = "<td class='noFather number' title='missing father'>1</td>";
                } else if (!mPerson.Mother) {
                    relNums["Parent_cell"] = "<td class='noMother number' title='missing mother'>1</td>";
                }
            }

            let diedYoungImg = "";
            let diedYoungClass = "";
            if (diedYoung == true) {
                diedYoungClass = "diedYoung";
                diedYoungImg = "<img  src='./views/cc7/images/diedYoung.png' class='diedYoungImg'>";
            }

            let gender = mPerson.Gender;
            if (mPerson?.DataStatus?.Gender == "blank") {
                gender = "blank";
            }

            const aLine = $(
                "<tr " +
                    ddegree +
                    " " +
                    dAgeAtDeath +
                    " " +
                    dtouched +
                    " " +
                    dcreated +
                    " " +
                    relNums["Parent_data"] +
                    " " +
                    relNums["Sibling_data"] +
                    " " +
                    relNums["Spouse_data"] +
                    " " +
                    relNums["Child_data"] +
                    " data-name='" +
                    CC7.htmlEntities(mPerson.Name) +
                    "' data-locations='" +
                    CC7.htmlEntities(oLocations) +
                    "' data-firstname='" +
                    CC7.htmlEntities(firstName) +
                    "' data-lnab='" +
                    CC7.htmlEntities(mPerson.LastNameAtBirth) +
                    "'  data-lnc='" +
                    CC7.htmlEntities(mPerson.LastNameCurrent) +
                    "' data-birthdate='" +
                    dBirthDate +
                    "' data-deathdate='" +
                    dDeathDate +
                    "' data-birthlocation='" +
                    CC7.htmlEntities(birthLocation) +
                    "' data-birthlocation-reversed='" +
                    CC7.htmlEntities(birthLocationReversed) +
                    "' data-deathlocation='" +
                    CC7.htmlEntities(deathLocation) +
                    "' data-deathlocation-reversed='" +
                    CC7.htmlEntities(deathLocationReversed) +
                    "' class='" +
                    gender +
                    "'><td><img class='privacyImage' src='" +
                    privacy +
                    "' title='" +
                    privacyTitle +
                    `'></td><td><img class='familyHome' src='./views/cc7/images/Home_icon.png' title="Click to see ${firstName}'s family sheet"></td>` +
                    `<td><img class='timelineButton' src='./views/cc7/images/timeline.png' title="Click to see a timeline for ${firstName}"></td>` +
                    degreeCell +
                    relNums["Parent_cell"] +
                    relNums["Sibling_cell"] +
                    relNums["Spouse_cell"] +
                    relNums["Child_cell"] +
                    "<td class='connectionsName " +
                    diedYoungClass +
                    "' >" +
                    oLink +
                    "</td><td class='lnab'><a target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
                    CC7.htmlEntities(mPerson.LastNameAtBirth) +
                    "'>" +
                    mPerson.LastNameAtBirth +
                    "</a></td><td class='lnc'><a   target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
                    CC7.htmlEntities(mPerson.LastNameCurrent) +
                    "'>" +
                    mPerson.LastNameCurrent +
                    "</a></td><td class='aDate birthdate'>" +
                    birthDate +
                    "</td><td class='location birthlocation'>" +
                    CC7.htmlEntities(birthLocation) +
                    "</td><td  class='aDate deathdate'>" +
                    deathDate +
                    "</td><td class='location deathlocation'>" +
                    CC7.htmlEntities(deathLocation) +
                    "</td>" +
                    ageAtDeathCell +
                    created +
                    touched +
                    "</tr>"
            );

            aTable.find("tbody").append(aLine);
        });

        if ($("div.cc7Table").length == 0) {
            $(".peopleTable caption").click(function () {
                $(this).parent().find("thead,tbody").slideToggle();
            });
        }

        $("img.familyHome").click(function () {
            CC7.showFamilySheet($(this));
        });
        $("img.timelineButton").click(function (event) {
            CC7.showTimeline($(this).closest("tr"));
        });

        aTable.find("th[id]").each(function () {
            CC7.sortByThis($(this));
        });
        CC7.addWideTableButton();
        if ($("#hierarchyViewButton").length == 0) {
            $("#wideTableButton").before(
                $(
                    "<button class='button small viewButton' id='hierarchyViewButton'>Hierarchy</button>" +
                        "<button class='button small viewButton' id='listViewButton'>List</button>" +
                        "<button class='button small viewButton active' id='tableViewButton'>Table</button>"
                )
            );
        }
        $("#listViewButton").on("click", function () {
            $(".viewButton").removeClass("active");
            $(this).addClass("active");
            $("#peopleTable,#hierarchyView").hide();
            if ($("#lanceTable").length == 0) {
                CC7.lanceView();
            } else {
                $("#lanceTable").show().addClass("active");
                $("#wideTableButton").hide();
            }
        });
        $("#hierarchyViewButton").on("click", function () {
            $(".viewButton").removeClass("active");
            $(this).addClass("active");
            $("#peopleTable,#lanceTable").hide().removeClass("active");
            if ($("#hierarchyView").length == 0) {
                CC7.hierarchyCC7();
                $("#wideTableButton").hide();
            } else {
                $("#hierarchyView").show();
            }
        });
        $("#tableViewButton").on("click", function () {
            $(".viewButton").removeClass("active");
            $(this).addClass("active");
            $("#hierarchyView,#lanceTable").hide().removeClass("active");
            $("#peopleTable").show();
            $("#wideTableButton").show();
        });

        const locationFilterSP = $(
            "<label id='spLocationFilterLabel'><input type='text' id='spLocationFilter' title='Enter place names separated by commas and click the button; empty the textbox and click the button to remove the filter'><button class=' button small searchResultsButton' id='spLocationFilterButton'>Filter by Location</button></label>"
        );
        locationFilterSP.insertBefore($(".peopleTable"));
        $("#moreSearchDetails").hide();
        $("#spLocationFilterButton").click(function (e) {
            e.preventDefault();
            if ($(this).text() == "Remove Location Filter" || $("#spLocationFilter").val() == "") {
                $(this).text("Filter By Location");
                $("tr").removeClass("locationFilteredOut");
            } else if ($("#spLocationFilter").val() != "") {
                $(this).text("Remove Location Filter");
                const rows = $(".peopleTable tbody tr");
                const locations = $("#spLocationFilter").val().split(",");
                const locationsT = locations.map((string) => string.trim());
                //oLocations = [];

                rows.each(function () {
                    let keepIt = false;

                    const thisLocations = $(this).attr("data-locations");
                    if (thisLocations != "") {
                        const thisLocationsSplit = thisLocations.split(",");
                        thisLocationsSplit.forEach(function (aLocation) {
                            locationsT.forEach(function (aLocation2) {
                                if (aLocation2.toLowerCase() == aLocation.toLowerCase()) {
                                    keepIt = true;
                                }
                            });
                        });
                    }
                    if (keepIt == false) {
                        $(this).addClass("locationFilteredOut");
                    }
                });
            }
        });
        $("#spLocationFilter").keypress(function (e) {
            if (e.which == 13) {
                $("#spLocationFilterButton").click();
            }
        });

        CC7.hideShakingTree();
        $("#countdown").fadeOut();
        if ($("div.cc7Table").length == 0) {
            $("#birthdate").click();
        }

        CC7.cc7excelOut();
    }

    static getApproxDate(theDate) {
        let approx = false;
        let aDate;
        if (theDate.match(/0s$/) != null) {
            aDate = theDate.replace(/0s/, "5");
            approx = true;
        } else {
            const bits = theDate.split("-");
            if (theDate.match(/00\-00$/) != null) {
                aDate = bits[0] + "-07-02";
                approx = true;
            } else if (theDate.match(/-00$/) != null) {
                aDate = bits[0] + "-" + bits[1] + "-" + "16";
                approx = true;
            } else {
                aDate = theDate;
            }
        }
        return { Date: aDate, Approx: approx };
    }

    static getApproxDate2(theDate) {
        let approx = false;
        let aDate;
        if (theDate.match(/0s$/) != null) {
            aDate = theDate.replace(/0s/, "5");
            approx = true;
        } else {
            const bits = theDate.split("-");
            if (theDate.match(/00\-00$/) != null || !bits[1]) {
                aDate = bits[0] + "-07-02";
                approx = true;
            } else if (theDate.match(/-00$/) != null) {
                aDate = bits[0] + "-" + bits[1] + "-" + "16";
                approx = true;
            } else {
                aDate = theDate;
            }
        }
        return { Date: aDate, Approx: approx };
    }

    static displayDates(fPerson) {
        const mbdDatesStatus = CC7.bdDatesStatus(fPerson);
        const bdStatus = mbdDatesStatus[0];
        const ddStatus = mbdDatesStatus[1];

        let fbd = "";
        let fdd = "";

        if (
            fPerson["BirthDate"] != "" &&
            fPerson["BirthDate"] != "0000-00-00" &&
            typeof fPerson["BirthDate"] != "undefined" &&
            fPerson["BirthDate"] != "unknown"
        ) {
            fbd = fPerson["BirthDate"].split("-")[0];
        } else if (typeof fPerson["BirthDateDecade"] != "undefined" && fPerson["BirthDateDecade"] != "unknown") {
            fbd = fPerson["BirthDateDecade"];
            // decadeMidpoint = fPerson["BirthDateDecade"].slice(0, -2) + 5;
        } else {
            fbd = "";
        }

        if (typeof fPerson["IsLiving"] != "undefined") {
            if (fPerson["IsLiving"] == 1) {
                fdd = "living";
            }
        }
        if (fdd == "") {
            if (
                fPerson["DeathDate"] != "" &&
                fPerson["DeathDate"] != "0000-00-00" &&
                typeof fPerson["DeathDate"] != "undefined"
            ) {
                fdd = fPerson["DeathDate"].split("-")[0];
            } else if (typeof fPerson["DeathDateDecade"] != "undefined" && fPerson["DeathDateDecade"] != "unknown") {
                fdd = fPerson["DeathDateDecade"];
                // decadeMidpoint = fPerson["DeathDateDecade"].slice(0, -2) + 5;
            } else {
                fdd = "";
            }
        }

        const fDates = "(" + bdStatus + fbd + " - " + ddStatus + fdd + ")";
        return fDates;
    }

    static displayFullDates(fPerson, showStatus = true) {
        const mbdDatesStatus = CC7.bdDatesStatus(fPerson);
        const bdStatus = mbdDatesStatus[0];
        const ddStatus = mbdDatesStatus[1];

        let fbd = "";
        let fdd = "";

        const fDates = [];

        if (
            fPerson["BirthDate"] != "" &&
            fPerson["BirthDate"] != "0000-00-00" &&
            typeof fPerson["BirthDate"] != "undefined"
        ) {
            const fbds = fPerson["BirthDate"].split("-");
            if (fbds[0] == "unkno5") {
                fbd = "";
            } else {
                fbd = CC7.getDateFormat(fbds);
            }
        } else if (typeof fPerson["BirthDateDecade"] != "undefined") {
            fbd = fPerson["BirthDateDecade"];
        } else {
            fbd = "";
        }

        if (fbd == "") {
            fDates.push("");
        } else if (showStatus == false) {
            fDates.push(fbd);
        } else {
            fDates.push(bdStatus + fbd);
        }

        if (typeof fPerson["IsLiving"] != "undefined") {
            if (fPerson["IsLiving"] == 1) {
                fdd = "living";
            }
        }
        if (fdd == "") {
            if (
                fPerson["DeathDate"] != "" &&
                fPerson["DeathDate"] != "0000-00-00" &&
                typeof fPerson["DeathDate"] != "undefined"
            ) {
                const fdds = fPerson["DeathDate"].split("-");
                if (fdds[0] == "unkno5") {
                    fdd = "";
                } else {
                    fdd = CC7.getDateFormat(fdds);
                }
            } else if (typeof fPerson["DeathDateDecade"] != "undefined") {
                if (fPerson["DeathDateDecade"] != "unknown") {
                    fdd = fPerson["DeathDateDecade"];
                }
            } else {
                fdd = "";
            }
        }

        if (fdd == "") {
            fDates.push("");
        } else if (showStatus == false) {
            fDates.push(fdd);
        } else {
            fDates.push(ddStatus + fdd);
        }

        return fDates;
    }

    static sortList(aList, dataField, reverse = 0) {
        const rows = aList.find("li");
        rows.sort(function (a, b) {
            if (reverse == 0) {
                return $(a).data(dataField).localeCompare($(b).data(dataField));
            } else {
                return $(b).data(dataField).localeCompare($(a).data(dataField));
            }
        });
        rows.appendTo(aList);
        CC7.secondarySort3(aList, "lnab", "first-name", 1);
    }

    static async lanceView() {
        $("#peopleTable").hide();
        if (!window.surnames) {
            window.surnames = {
                degree_1: [],
                degree_2: [],
                degree_3: [],
                degree_4: [],
                degree_5: [],
                degree_6: [],
                degree_7: [],
            };
        }
        const lanceTable = $(
            "<table id='lanceTable'>" +
                "<thead>" +
                "<tr></tr>" +
                "</thead>" +
                "<tbody>" +
                "<tr></tr>" +
                "</tbody>" +
                "</table>"
        );
        $("#peopleTable").before(lanceTable);
        for (let i = 1; i < 8; i++) {
            let aHeading = $("<th id='degreeHeading_" + i + "'><span>" + i + ".</span><ol></ol></th>");
            lanceTable.find("thead tr").append(aHeading);
            let aCell = $("<td id='degree_" + i + "'><ol></ol></td>");
            lanceTable.find("tbody tr").append(aCell);
        }

        window.people.forEach(function (aPerson) {
            if (!aPerson.Missing) {
                aPerson = CC7.missingBits(aPerson);
            }
            const theDegree = aPerson.Degree;
            const aName = new PersonName(aPerson);
            const theName = aName.withParts(CC7.WANTED_NAME_PARTS);
            const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
            const theLNAB = theParts.get("LastNameAtBirth");
            const theFirstName = theParts.get("FirstName");

            if (CC7.isOK(theDegree)) {
                if (!window.surnames["degree_" + theDegree].includes(theLNAB)) {
                    window.surnames["degree_" + theDegree].push(theLNAB);
                    const anLi2 = $(
                        "<li data-lnab='" +
                            theLNAB +
                            "' data-name='" +
                            aPerson.Name +
                            "'><a target='_blank' href='https://www.wikitree.com/genealogy/" +
                            theLNAB +
                            "'>" +
                            theLNAB +
                            "</a></li>"
                    );
                    $("#degreeHeading_" + theDegree)
                        .find("ol")
                        .append(anLi2);
                    anLi2.find("a").on("click", function (e) {
                        e.preventDefault();

                        const degreeNum = $(this).closest("th").prop("id").slice(-1);
                        const theList = $("#degree_" + degreeNum).find("li");
                        if ($(this).attr("data-clicked") == 1) {
                            theList.show();
                            $("#lanceTable thead a").each(function () {
                                $(this).attr("data-clicked", 0);
                            });
                        } else {
                            const thisLNAB = $(this).closest("li").data("lnab");
                            $("#lanceTable thead a").each(function () {
                                $(this).attr("data-clicked", 0);
                            });
                            $(this).attr("data-clicked", 1);
                            theList.each(function () {
                                if ($(this).data("lnab") != thisLNAB) {
                                    $(this).hide();
                                } else {
                                    $(this).show();
                                }
                            });
                        }
                    });
                }
            }
            const linkName = CC7.htmlEntities(aPerson.Name);
            const missing = CC7.missingThings(aPerson);
            const anLi = $(
                "<li " +
                    missing.missingBit +
                    " data-first-name='" +
                    theFirstName +
                    "' data-lnab='" +
                    theLNAB +
                    "' data-name=\"" +
                    aPerson.Name +
                    "\"><a target='_blank' href='https://www.wikitree.com/wiki/" +
                    linkName +
                    "'>" +
                    theName +
                    "</a> " +
                    missing.missingIcons +
                    "</li>"
            );
            $("#degree_" + theDegree)
                .find("ol")
                .append(anLi);
        });

        $("td ol,th ol").each(function () {
            CC7.sortList($(this), "lnab");
        });
    }

    static missingBits(aPerson) {
        aPerson.Missing = [];
        if (!aPerson.Father) {
            aPerson.Missing.push("Father");
        }
        if (!aPerson.Mother) {
            aPerson.Missing.push("Mother");
        }

        if (
            (CC7.ageAtDeath(aPerson, false) > 15 ||
                aPerson?.DeathDate == "0000-00-00" ||
                aPerson?.BirthDate == "0000-00-00") &&
            ((aPerson?.Spouse != "known" && aPerson?.Spouse != "blank") || aPerson.NoChildren != "1")
        ) {
            if (aPerson.Spouse.length == 0 && aPerson?.DataStatus?.Spouse != "blank") {
                aPerson.Missing.push("Spouse");
            }
            if (aPerson.Child.length == 0 && aPerson.NoChildren != "1") {
                aPerson.Missing.push("Children");
            }
        }
        return aPerson;
    }

    static missingThings(aPerson) {
        let missingBit = "";
        let missingIcons = "";
        aPerson.Missing.forEach(function (relation) {
            missingBit += "data-missing-" + relation + "='1' ";
            if (relation == "Father") {
                missingIcons +=
                    "<img title='missing father' class='missingFather missingIcon' src='./views/cc7/images/blue_bricks_small.jpg'>";
            }
            if (relation == "Mother") {
                missingIcons +=
                    "<img title='missing mother' class='missingMother missingIcon' src='./views/cc7/images/pink_bricks_small.jpg'>";
            }
            if (relation == "Spouse") {
                missingIcons +=
                    "<img title='possible missing spouse' class='missingSpouse missingIcon' src='./views/cc7/images/spouse_bricks_small.png'>";
            }
            if (relation == "Children") {
                missingIcons +=
                    "<img title='possible missing children' class='missingChildren missingIcon' src='./views/cc7/images/baby_bricks_small.png'>";
            }
        });
        return { missingBit: missingBit, missingIcons: missingIcons };
    }

    static addPeopleToHierarchy(degree) {
        $("#hierarchyView li[data-degree='" + degree + "']").each(function () {
            const wtid = $(this).data("name");
            const thisLI = $(this);
            window.people.forEach(function (aPerson) {
                if (aPerson.Name == wtid) {
                    const familyMembersKeys = [];
                    if (aPerson.Parents) {
                        if (aPerson.Father) {
                            familyMembersKeys.push({ id: aPerson.Father, relation: "Father" });
                        }
                        if (aPerson.Mother) {
                            familyMembersKeys.push({ id: aPerson.Mother, relation: "Mother" });
                        }
                    }
                    const relations = ["Siblings", "Spouses", "Children"];
                    relations.forEach(function (aRelation) {
                        if (aPerson[aRelation]) {
                            const relKeys = Object.keys(aPerson[aRelation]);
                            relKeys.forEach(function (aRel) {
                                familyMembersKeys.push({ id: aRel, relation: aRelation });
                            });
                        }
                    });

                    const familyMembers = [];

                    familyMembersKeys.forEach(function (aKeyPair) {
                        window.people.forEach(function (oPerson) {
                            if (aKeyPair.id == oPerson.Id) {
                                const oPersonClone = JSON.parse(JSON.stringify(oPerson));
                                oPersonClone.Relation = aKeyPair.relation;
                                familyMembers.push(oPersonClone);
                            }
                        });
                    });

                    familyMembers.forEach(function (aMember) {
                        aMember = CC7.missingBits(aMember);

                        if (thisLI.closest('li[data-name="' + aMember.Name + '"]').length == 0) {
                            const theDegree = aMember.Degree;
                            if (theDegree > aPerson.Degree) {
                                const aName = new PersonName(aMember);
                                const theName = aName.withParts(CC7.WANTED_NAME_PARTS);
                                const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
                                const theLNAB = theParts.get("LastNameAtBirth");
                                const theFirstName = theParts.get("FirstName");
                                let relation = aMember.Relation;
                                if (aMember.Relation == "Siblings") {
                                    relation = "Sibling";
                                    if (aMember.Gender == "Male") {
                                        relation = "Brother";
                                    }
                                    if (aMember.Gender == "Female") {
                                        relation = "Sister";
                                    }
                                }
                                if (aMember.Relation == "Children") {
                                    relation = "Child";
                                    if (aMember.Gender == "Male") {
                                        relation = "Son";
                                    }
                                    if (aMember.Gender == "Female") {
                                        relation = "Daughter";
                                    }
                                }
                                if (aMember.Relation == "Spouses") {
                                    relation = "Spouse";
                                    if (aMember.Gender == "Male") {
                                        relation = "Husband";
                                    }
                                    if (aMember.Gender == "Female") {
                                        relation = "Wife";
                                    }
                                }

                                const missing = CC7.missingThings(aMember);
                                const missingBit = missing.missingBit;
                                const missingIcons = missing.missingIcons;
                                const linkName = CC7.htmlEntities(aMember.Name);
                                const bdDates = CC7.displayDates(aMember);
                                const anLi = $(
                                    `<li data-birth-date='${aMember.BirthDate}' data-father='${aMember.Father}' ` +
                                        `data-mother='${aMember.Mother}' data-id='${aMember.Id}' data-relation='${relation}' ` +
                                        `${missingBit} data-lnab='${theLNAB}' data-degree='${aMember.Degree}' ` +
                                        `data-name=\"${aMember.Name}\" data-first-name='${theFirstName}'>${aMember.Degree}° ` +
                                        `<span class='relation ${relation}'>${relation}</span>: ` +
                                        `<a target='_blank' href='https://www.wikitree.com/wiki/${linkName}'>${theName}</a> ` +
                                        `<span class='birthDeathDates'>${bdDates}</span> ${missingIcons}<ul></ul></li>`
                                );
                                thisLI.children("ul").append(anLi);
                            }
                        }
                    });
                }
            });
        });
    }

    static hierarchyCC7() {
        window.visibleDegrees = 0;
        const hierarchySection = $(
            "<section id='hierarchyView'><menu><button class='button small' id='showAllDegrees'>Expand All</button>" +
                "<button id='showOneMoreDegree' class='button small'>+</button>" +
                "<button id='showOneFewerDegree' class='button small'>−</button>" +
                "</menu><ul></ul></section>"
        );
        hierarchySection.insertBefore($("#peopleTable"));
        const aPerson = window.people[0];
        const aName = new PersonName(aPerson);
        const theName = aName.withParts(CC7.WANTED_NAME_PARTS);
        const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
        const theLNAB = theParts.get("LastNameAtBirth");
        const theFirstName = theParts.get("FirstName");
        const linkName = CC7.htmlEntities(aPerson.Name);
        const anLi = $(
            `<li data-lnab='${theLNAB}' data-id='${aPerson.Id}' data-degree='${aPerson.Degree}' ` +
                `data-name=\"${aPerson.Name}\" data-first-name='${theFirstName}'>${aPerson.Degree}° ` +
                `<a target='_blank' href='https://www.wikitree.com/wiki/${linkName}'>${theName}</a><ul></ul></li>`
        );
        hierarchySection.children("ul").append(anLi);
        for (let i = 0; i < 7; i++) {
            CC7.addPeopleToHierarchy(i);
        }
        $("#hierarchyView li").each(function () {
            let aButton;
            if ($(this).find("ul li").length) {
                aButton = $("<button class='toggler'>+</button>");
                $(this).prepend(aButton);
                CC7.showMissingCounts(aButton);
                aButton.on("click", function (e) {
                    e.preventDefault();
                    $(this).parent().children("ul").toggle();
                    $(this).text($(this).text() == "+" ? "−" : "+");
                    CC7.showMissingCounts($(this));
                });
            } else {
                aButton = $("<button class='nonToggler'></button>");
                $(this).prepend(aButton);
            }
        });
        $("#showAllDegrees").on("click", function (e) {
            e.preventDefault();
            window.visibleDegrees = 7;
            if ($(this).text() == "Expand All") {
                $(this).text("Collapse All");
                $("#hierarchyView ul ul").show();
                $("#hierarchyView button.toggler").text("−");
                $("span.countBit").hide();
                $("span.nodeCount").hide();
            } else {
                window.visibleDegrees = 0;
                $(this).text("Expand All");
                $("#hierarchyView ul ul").hide();
                $("#hierarchyView button.toggler").text("+");
                $("span.countBit").show();
                $("span.nodeCount").show();
            }
        });
        $("#showOneMoreDegree").on("click", function (e) {
            e.preventDefault();
            if (window.visibleDegrees < 7) {
                window.visibleDegrees++;
                let j = window.visibleDegrees;
                for (let i = 0; i < j + 1; i++) {
                    $("li[data-degree='" + i + "']")
                        .parent()
                        .show();

                    $("li[data-degree='" + (i - 1) + "']")
                        .children("span.countBit")
                        .hide();
                    $("li[data-degree='" + (i - 1) + "']")
                        .children("span.nodeCount")
                        .hide();

                    $("li[data-degree='" + (i - 1) + "']")
                        .closest("li")
                        .children("button.toggler")
                        .text("−");
                }
            }
        });
        $("#showOneFewerDegree").on("click", function (e) {
            e.preventDefault();
            if (window.visibleDegrees > 0) {
                window.visibleDegrees--;
                let j = window.visibleDegrees;

                for (let i = 7; i >= j + 1; i--) {
                    $("li[data-degree='" + i + "']")
                        .parent()
                        .hide();
                    $("li[data-degree='" + (i - 1) + "']")
                        .children("span.countBit")
                        .show();
                    $("li[data-degree='" + (i - 1) + "']")
                        .children("span.nodeCount")
                        .show();
                    $("li[data-degree='" + (i - 1) + "']")
                        .closest("li")
                        .children("button.toggler")
                        .text("+");
                }
            }
        });

        // Sort the lists
        $("#hierarchyView ul").each(function () {
            const theUL = $(this);
            const rows = $(this).children("li");
            rows.sort((a, b) =>
                $(b).data("birth-date").replaceAll(/\-/g, "") < $(a).data("birth-date").replaceAll(/\-/g, "") ? 1 : -1
            );
            rows.appendTo($(this));
            if ($(this).children("li[data-relation='Husband'],li[data-relation='Wife']").length) {
                $(this)
                    .children("li[data-relation='Husband'],li[data-relation='Wife']")
                    .each(function () {
                        let spouseId = $(this).data("id");
                        theUL
                            .children("li[data-father='" + spouseId + "'],li[data-father='" + spouseId + "']")
                            .eq(0)
                            .before($(this));
                    });
            }
            theUL.children("li[data-relation='Father']").prependTo(theUL);
        });
    }

    static showMissingCounts(jq) {
        const thisLI = jq.parent();
        if (thisLI.children("span.countBit,span.nodeCount").length) {
            if (thisLI.children("ul:visible").length) {
                thisLI.children("span.countBit").hide();
                thisLI.children("span.nodeCount").hide();
            } else {
                thisLI.children("span.countBit").show();
                thisLI.children("span.nodeCount").show();
            }
        } else {
            const allCount = thisLI.find("li").length;

            const missingFathers =
                thisLI.find("ul img.missingFather").length -
                thisLI.find("li[data-degree='7'] img.missingFather").length;
            const missingMothers =
                thisLI.find("ul img.missingMother").length -
                thisLI.find("li[data-degree='7'] img.missingMother").length;
            const missingSpouses =
                thisLI.find("ul img.missingSpouse").length -
                thisLI.find("li[data-degree='7'] img.missingSpouse").length;
            const missingChildren =
                thisLI.find("ul img.missingChildren").length -
                thisLI.find("li[data-degree='7'] img.missingChildren").length;
            const countBit = $("<span class='countBit'></span>");
            if (allCount > 0 && thisLI.children(".nodeCount").length == 0) {
                $(
                    `<span class='nodeCount' title='Number of profiles hidden under ${thisLI.attr(
                        "data-first-name"
                    )}'>${allCount}</span>`
                ).appendTo(thisLI);
            }
            if ((missingFathers || missingMothers || missingSpouses || missingChildren) && allCount > 0) {
                countBit.appendTo(thisLI);
                if (missingFathers) {
                    countBit.append(
                        $(
                            "<span>" +
                                missingFathers +
                                "<img title='people with missing father' class='missingFatherCount missingCountIcon' src='./views/cc7/images/blue_bricks_small.jpg'></span>"
                        )
                    );
                }
                if (missingMothers) {
                    countBit.append(
                        $(
                            "<span>" +
                                missingMothers +
                                "<img title='people with missing mother' class='missingMotherCount missingCountIcon' src='./views/cc7/images/pink_bricks_small.jpg'></span>"
                        )
                    );
                }
                if (missingSpouses) {
                    countBit.append(
                        $(
                            "<span>" +
                                missingSpouses +
                                "<img title='people with possible missing spouse' class='missingSpouseCount missingCountIcon' src='./views/cc7/images/spouse_bricks_small.png'></span>"
                        )
                    );
                }
                if (missingChildren) {
                    countBit.append(
                        $(
                            "<span>" +
                                missingChildren +
                                "<img title='people with posiible missing children' class='missingChildrenCount missingCountIcon' src='./views/cc7/images/baby_bricks_small.png'></span>"
                        )
                    );
                }
            }
        }
    }

    static async getPeopleAction(keys, siblings, ancestors, descendants, nuclear, minGeneration, fields) {
        try {
            const result = await WikiTreeAPI.postToAPI({
                action: "getPeople",
                keys: keys,
                siblings: siblings,
                ancestors: ancestors,
                descendants: descendants,
                nuclear: nuclear,
                minGeneration: minGeneration,
                fields: fields,
            });
            const people = result[0].people;
            if (typeof people == "undefined" || people == "") {
                wtViewRegistry.showError(`No results obtained when requesting relatives for ${keys}`);
                return null;
            }
            return result[0].people;
        } catch (error) {
            wtViewRegistry.showError(`Could not retrieve relatives for ${keys}: ${error}`);
            return null;
        }
    }

    static async getSomeRelatives(ids, fields = "*") {
        try {
            const result = await WikiTreeAPI.postToAPI({
                action: "getRelatives",
                keys: ids,
                fields: fields,
                getParents: 1,
                getSiblings: 1,
                getSpouses: 1,
                getChildren: 1,
            });
            return result[0].items;
        } catch (error) {
            CC7.hideShakingTree();
            wtViewRegistry.showError(`Could not retrieve relatives for ${ids}: ${error}`);
        }
    }

    static getDegreeAction(event) {
        wtViewRegistry.clearStatus();
        window.people = [];
        window.peopleKeys = [];
        window.chunksOut = 0;
        window.chunksBack = 0;
        event.preventDefault();
        if (
            $("#wtid")
                .val()
                .match(/.+\-.+/)
        ) {
            CC7.clearDisplay();
            CC7.showShakingTree();
            $("div.cc7Table").addClass("degreeView");
            const theDegree = $("#cc7Degree").val();
            const fields = "Id";
            CC7.getPeopleAction($("#wtid").val(), 0, 0, 0, theDegree, theDegree, fields).then((people) => {
                $("#oneDegreeList").remove();
                const oneDegreeList = $("<ol id='oneDegreeList'></ol>");
                $("div.cc7Table").append(oneDegreeList);
                if (people === null) {
                    CC7.hideShakingTree();
                    return;
                }
                window.peopleKeys = Object.keys(people);
                while (window.peopleKeys.length) {
                    const chunk = window.peopleKeys.splice(0, 100).join(",");
                    //console.log(chunk);
                    window.chunksOut++;
                    CC7.getSomeRelatives(chunk, CC7.PROFILE_FIELDS).then((result) => {
                        if (result) {
                            result.forEach(function (aPerson) {
                                const mPerson = aPerson.person;
                                const mSpouses = CC7.getRels(mPerson.Spouses, mPerson, "Spouse");
                                mPerson.Spouse = mSpouses;
                                const mChildren = CC7.getRels(mPerson.Children, mPerson, "Child");
                                mPerson.Child = mChildren;
                                const mSiblings = CC7.getRels(mPerson.Siblings, mPerson, "Sibling");
                                mPerson.Sibling = mSiblings;
                                const mParents = CC7.getRels(mPerson.Parents, mPerson, "Parent");
                                mPerson.Parent = mParents;
                                mPerson.Degree = $("#cc7Degree").val();
                                if (mPerson.Name != $("#wtid").val()) {
                                    window.people.push(mPerson);
                                }
                            });
                        }
                        window.chunksBack++;
                        if (window.peopleKeys.length == 0 && window.chunksOut == window.chunksBack) {
                            //console.log(window.people);
                            CC7.hideShakingTree();
                            if (window.people.length == 0) {
                                $("div.cc7Table").append(
                                    $(
                                        "<div id='tooBig' style='text-align:center'>No Result... Maybe the CC7 is too big. <br>" +
                                            "These may be after the first thousand.<br>" +
                                            "How about going to a grandparent and looking at their results or reduce the degrees?</div>"
                                    )
                                );
                            } else {
                                CC7.addPeopleTable();
                            }
                        }
                    });
                }
            });
        }
    }

    static addFamilyToPerson(person) {
        person.Parent = CC7.getRels(person.Parents, person, "Parent");
        person.Sibling = CC7.getRels(person.Siblings, person, "Sibling");
        person.Spouse = CC7.getRels(person.Spouses, person, "Spouse");
        person.Child = CC7.getRels(person.Children, person, "Child");
        return person;
    }

    static async getConnectionsAction(event) {
        wtViewRegistry.clearStatus();
        const theDegree = $("#cc7Degree").val();
        if (
            $("#wtid")
                .val()
                .match(/.+\-.+/)
        ) {
            window.ancestors = await CC7.getAncestors($("#wtid").val(), 3, CC7.PROFILE_FIELDS + CC7.RELATIONS_FIELDS);
            CC7.assignGeneration(window.ancestors, ancestors[0], 0);
        }
        event.preventDefault();
        $("div.cc7Table").removeClass("degreeView");
        window.people = [];
        window.gotEm = [];
        window.toGet = [];
        window.thisDegreeIn = 0;
        window.degree = 0;
        window.people = [];
        CC7.clearDisplay();
        CC7.getConnections(theDegree);
        CC7.showShakingTree();
    }

    static getConnections(maxDegree, keys = 0) {
        let WTID;
        if (keys == 0) {
            WTID = $("#wtid").val().trim();
        } else {
            WTID = keys;
        }
        WikiTreeAPI.postToAPI({
            action: "getRelatives",
            keys: WTID,
            getParents: "1",
            getSiblings: "1",
            getSpouses: "1",
            getChildren: "1",
            fields: CC7.PROFILE_FIELDS,
        }).then((data) => {
            const items = data[0]["items"];
            if (items) {
                items.forEach(function (item) {
                    let person = item.person;
                    if (window.gotEm.includes(person.Id) == false) {
                        window.gotEm.push(person.Id);
                        person.Degree = window.degree;
                        window.people.push(person);
                        thisDegreeIn++;
                    }
                    person = CC7.addFamilyToPerson(person);
                    const arr = ["Parent", "Sibling", "Spouse", "Child"];
                    arr.forEach(function (rel) {
                        if (person[rel].length > 0) {
                            person[rel].forEach(function (aRel) {
                                if (
                                    window.toGet.includes(aRel.Id) == false &&
                                    window.gotEm.includes(aRel.Id) == false
                                ) {
                                    window.toGet.push(aRel.Id);
                                }
                            });
                        }
                    });
                });
            }

            if (window.degree < 3) {
                if (window.ancestors) {
                    window.ancestors.forEach(function (anAncestor) {
                        if (anAncestor.Generation == window.degree + 1) {
                            if (!window.gotEm.includes(anAncestor.Id) && !window.toGet.includes(anAncestor.Id)) {
                                window.toGet.push(anAncestor.Id);
                            }
                        }
                    });
                }
            }

            const keys = window.toGet.join(",");
            if (window.degree < maxDegree) {
                CC7.getConnections(maxDegree, keys);
                if ($("#degreesTable").length == 0) {
                    $("div.cc7Table").append(
                        $(
                            "<table id='degreesTable'><tr><th>Degrees</th></tr><tr><th>Connections</th></tr><tr><th>Total</th></tr></table>"
                        )
                    );
                }
                window.toGet = [];
            } else {
                CC7.hideShakingTree();
                CC7.addPeopleTable();
            }
            if (window.degree > 0) {
                $("#degreesTable")
                    .find("tr")
                    .eq(0)
                    .append($("<td>" + window.degree + "</td>"));
                $("#degreesTable")
                    .find("tr")
                    .eq(1)
                    .append($("<td>" + window.thisDegreeIn + "</td>"));

                $("#degreesTable")
                    .find("tr")
                    .eq(2)
                    .append($("<td>" + (parseInt(window.people.length) - 1) + "</td>"));
            }
            window.degree++;
            window.thisDegreeIn = 0;
            //},
        });
    }

    static makeFilename() {
        const date = new Date();
        let fileName = $("#wtid").val() + "_";
        fileName += $("div.degreeView").length ? "Degree_" + $("#cc7Degree").val() + "_" : "";
        fileName += date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-";
        fileName += date.getDate().toString().padStart(2, "0") + "-";
        fileName += date.getHours().toString().padStart(2, "0");
        fileName += date.getMinutes().toString().padStart(2, "0");
        fileName += date.getSeconds().toString().padStart(2, "0");
        return fileName;
    }

    static downloadArray(array, fileName) {
        // Convert the JavaScript array to a string
        const arrayString = JSON.stringify(array);

        // Create a Blob object with the string data
        const blob = new Blob([arrayString], { type: "text/plain" });

        // Create a link element to trigger the download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;

        // Append the link to the DOM and trigger the download
        document.body.appendChild(link);
        link.click();

        // Remove the link from the DOM
        document.body.removeChild(link);
    }

    static clearDisplay() {
        $(
            [
                "#degreesTable",
                "#hierarchyView",
                "#lanceTable",
                "#peopleTable",
                "#spLocationFilterLabel",
                "#tableContainer",
                ".tableContainer",
                "#tooBig",
                ".viewButton",
                "#wideTableButton",
            ].join(",")
        ).remove();
    }

    static handleFileUpload(event) {
        wtViewRegistry.clearStatus();
        const file = event.target.files[0];
        if (typeof file == "undefined" || file == "") {
            return;
        }
        const reader = new FileReader();
        CC7.clearDisplay();
        CC7.showShakingTree();

        reader.onload = async function (e) {
            const contents = e.target.result;
            try {
                window.people = JSON.parse(contents);
            } catch (error) {
                CC7.hideShakingTree();
                wtViewRegistry.showError(`The input file is not valid: ${error}`);
                return;
            }

            window.ancestors = await CC7.getAncestors(
                window.people[0].Id,
                3,
                CC7.PROFILE_FIELDS + CC7.RELATIONS_FIELDS
            );
            CC7.assignGeneration(window.ancestors, ancestors[0], 0);

            $("#wtid").val(window.people[0].Name);
            CC7.addPeopleTable();
            $("div.cc7Table #hierarchyViewButton").before(
                $(
                    "<table id='degreesTable'><tr><th>Degrees</th></tr><tr><th>Connections</th></tr><tr><th>Total</th></tr></table>"
                )
            );
            const degreeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
            let maxDegree = 0;
            window.people.forEach(function (aPerson) {
                degreeCounts[aPerson.Degree] = degreeCounts[aPerson.Degree] + 1;
                if (aPerson.Degree > maxDegree) {
                    maxDegree = aPerson.Degree;
                }
            });
            let degreeSum = 0;
            for (let i = 1; i <= maxDegree; i++) {
                degreeSum = degreeSum + degreeCounts[i];
                $("#degreesTable tr")
                    .eq(0)
                    .append($(`<td>${i}</td>`));
                $("#degreesTable tr")
                    .eq(1)
                    .append($(`<td>${degreeCounts[i]}</td>`));
                $("#degreesTable tr")
                    .eq(2)
                    .append($(`<td>${degreeSum}</td>`));
            }
            CC7.hideShakingTree();
        };

        try {
            reader.readAsText(file);
        } catch (error) {
            CC7.hideShakingTree();
            wtViewRegistry.showError(`The input file is not valid: ${error}`);
        }
    }

    static cc7excelOut() {
        const fileName = CC7.makeFilename();

        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: fileName,
            Subject: fileName,
            Author: "WikiTree",
            CreatedDate: new Date(),
        };

        wb.SheetNames.push(fileName);
        const ws_data = [];
        const headings = [
            "WikiTree ID",
            "Degree",
            "Parents",
            "Siblings",
            "Spouses",
            "Children",
            "Given Name(s)",
            "Last name at birth",
            "Current last name",
            "Birth date",
            "Birth place",
            "Death date",
            "Death place",
            "Age",
            "Created",
            "Modified",
        ];

        ws_data.push(headings, []);
        $("#peopleTable > tbody tr").each(function () {
            const row = $(this);
            const tds = row.find("td");
            let birthdate, birthplace, deathdate, deathplace, deathAge, created, touched;
            tds.each(function () {
                if ($(this).hasClass("birthdate")) {
                    birthdate = $(this).text();
                }
                if ($(this).hasClass("birthlocation")) {
                    birthplace = $(this).text();
                }
                if ($(this).hasClass("deathdate")) {
                    deathdate = $(this).text();
                }
                if ($(this).hasClass("deathlocation")) {
                    deathplace = $(this).text();
                }
                if ($(this).hasClass("age-at-death")) {
                    deathAge = $(this).text();
                }
                if ($(this).hasClass("created")) {
                    created = $(this).text();
                }
                if ($(this).hasClass("touched")) {
                    touched = $(this).text();
                }
            });
            const pData = [
                row.data("name"),
                row.data("degree"),
                row.data("parent"),
                row.data("sibling"),
                row.data("spouse"),
                row.data("child"),
                row.data("firstname"),
                row.data("lnab"),
                row.data("lnc"),
                birthdate,
                birthplace,
                deathdate,
                deathplace,
                deathAge,
                created,
                touched,
            ];
            ws_data.push(pData);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        wb.Sheets[fileName] = ws;

        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
            return buf;
        }

        if ($("#cc7excel").length == 0) {
            $(
                '<button id="cc7excel" title="Export an Excel file." class="small button" style="display: inline-block;">Excel</button>'
            ).insertAfter($("#loadButton"));
        }
        if ($("#cc7csv").length == 0) {
            $(
                '<button id="cc7csv" title="Export a CSV file." class="small button" style="display: inline-block;">CSV</button>'
            ).insertAfter($("#loadButton"));
        }

        const wscols = [
            { wch: 20 },
            { wch: 5 },
            { wch: 5 },
            { wch: 5 },
            { wch: 5 },
            { wch: 5 },
            { wch: 25 },
            { wch: 20 },
            { wch: 20 },
            { wch: 10 },
            { wch: 40 },
            { wch: 10 },
            { wch: 40 },
            { wch: 5 },
            { wch: 10 },
            { wch: 10 },
        ];

        ws["!cols"] = wscols;

        $("#cc7csv").click(function () {
            var wbout = XLSX.write(wb, { bookType: "csv", type: "binary" });
            saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), CC7.makeFilename() + ".csv");
        });
        $("#cc7excel").click(function () {
            var wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
            saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), CC7.makeFilename() + ".xlsx");
        });
    }

    static async getAncestors(id, depth, fields = "*") {
        try {
            const result = await WikiTreeAPI.postToAPI({
                action: "getAncestors",
                key: id,
                depth: depth,
                fields: fields,
            });
            if (typeof result[0].ancestors == "undefined") {
                wtViewRegistry.showError(`Could not retrieve ancestors for ${id}: ${result[0].status}`);
                return [];
            }
            return result[0].ancestors;
        } catch (error) {
            wtViewRegistry.showError(`Could not retrieve ancestors for ${id}: ${error}`);
        }
    }

    static assignGeneration(persons, person, generation) {
        person.Generation = generation;
        for (let ancestor of persons) {
            if (ancestor.Id === person.Father || ancestor.Id === person.Mother) {
                CC7.assignGeneration(persons, ancestor, generation + 1);
            }
        }
    }
}
