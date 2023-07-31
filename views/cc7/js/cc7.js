/**
 * This code was originally written by Ian Beacall (Beacall-6) as a stand-alone WikiTree App.
 * With Ian's permission, Riël Smit (Smit-641) adapted it to be a WikiTree Dynamic Tree view
 * using the getPeople API call for fetching the CC7 profiles.
 *
 * It makes use (through direct code inclusion) of FileSave (https://github.com/eligrey/FileSaver.js/)
 * and SheetJs (https://www.npmjs.com/package/xlsx)
 */
export class CC7 {
    static APP_ID = "CC7";
    static #helpText = `
        <x>[ x ]</x>
        <h2 style="text-align: center">About CC7 Views</h2>
        <p>
            CC7 Views allows you to retrieve the list of people connected to a profile within 7 degrees.
            This guide explains how to use it.
        </p>
        <h3>Loading the Data</h3>
        <p>
            Depending on the number of connections, the data can take over two minutes to load fully.
            To reduce loading time, you can:
        </p>
        <ul>
            <li>Load fewer than the full 7 degrees.</li>
            <li>Load only one degree at a time.</li>
            <li>Save the data to a file for faster loading next time.</li>
        </ul>
        <h3>Calculating Degree of Separation</h3>
        <p>
            The app shows the degree of separation between the focal person and each person on the list.
            Here is how it works:
        </p>
        <ul>
            <li>
                The WikiTree API provides a list of connected people up to the requested number of degrees,
                such as 5 degrees.
            </li>
            <li>The app calculates the degrees by linking parents to children and spouses to each other.</li>
            <li>
                Because of the above, the app cannot always connect people perfectly as some profiles are private
                or unlisted, with limited information returned by the API.
            </li>
            <li>The degree shown will therefore sometimes be higher than the actual shortest path. For example,
                results for CC5 may show someone at 6 degrees although they are actually at 5 or less.</li>
        </ul>
        <p>The Table View, which shows the most data, will always load first.</p>
        <h3>Table View</h3>
        <p>Here are some tips:</p>
        <h4>Sorting the Table</h4>
        <ul>
            <li>Sort any column by clicking the header. Click again to reverse the sorting.</li>
            <li>
                Sort by Created/Modified to see new additions. (Due to a bug in the API, the Created column is
                currently empty. We hope this will be fixed soon.)
            </li>
            <li>
                The location column sort toggles between sorting Town &rarr; Country or Country &rarr; Town on each click
                on location header.
            </li>
        </ul>
        <h4>Scrolling the Wide Table</h4>
        <ul>
            <li>Drag the table left/right or two-finger drag on a trackpad.</li>
        </ul>
        <h4>Filtering Rows</h4>
        <ul>
            <li>
                Limit the content of the table based on the content of columns by entering values in the filter
                boxes just below the column headers.
            </li>
            <li>
                The numerical columns (including the years) can be filtered with &gt; and &lt;.
                For example, to see all people born after 1865, enter &gt;1865 in the birth year filter box.
            </li>
            <li>
                Clear the filters by clicking on the CLEAR FILTERS button that appears as soon as you have an
                active filter.
            </li>
        </ul>
        <h4>And...</h4>
        <ul>
            <li>
                The Died Young image <img src="./views/cc7/images/diedYoung.png" /> is used to flag people who died under
                16 years of age. Their spouse and children boxes are greyed out as we can assume they didn't have any
                of these.
            </li>
        </ul>
        <ul id="key" class="key">
            <li><img src="./views/cc7/images/blue_bricks_small.jpg" /> missing father</li>
            <li><img src="./views/cc7/images/pink_bricks_small.jpg" /> missing mother</li>
            <li><img src="./views/cc7/images/purple_bricks_small.jpg" /> both parents missing</li>
            <li>
                <span><span class="none"></span> the 'No more spouses/children' box is checked, or Died Young</span>
            </li>
        </ul>
        <h3>Hierarchy View</h3>
        <ul>
            <li>Numbers show the number of hidden profiles below each person.</li>
            <li>
                Icons show missing parents (blue and pink bricks for fathers and mothers, respectively), and potentially missing
                spouses and/or children.
            </li>
            <li>Click '+' to reveal more people.</li>
        </ul>
        <h4>Expanding and Collapsing the Hierarchy</h4>
        <ul>
            <li>Big '+' and '-' buttons expand and collapse by degree.</li>
        </ul>
        <h3>List View</h3>
        <ul>
            <li>Click a surname to show only those people.</li>
            <li>Click again to show all.</li>
        </ul>
        <h3>Other points</h3>
        <ul>
            <li>Double-clicking this 'About' box, or clicking the red X in its top right corner will close it.</li>
            <li>
                If you find problems with this page or have suggestions for improvements, let
                <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Smit-641">Riël</a> or
                <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Beacall-6">Ian</a>
                know about it.
            </li>
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
        "Managers",
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

    static GET_PEOPLE_FIELDS = CC7.PROFILE_FIELDS + ",Spouses";
    static GET_PEOPLE_LIMIT = 1000;
    static MAX_DEGREE = 7;
    static HIDE = true;

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
            <button
                class="small button"
                id="getPeopleButton"
                title="Get a list of connected people up to this degree">
                Get CC3</button
            ><select id="cc7Degree" title="Select the degree of connection">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3" selected>3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option></select
            ><button class="small button" id="getDegreeButton" title="Get only people connected at the indicated degree">
                Get Degree 3 Only</button
            ><button id="savePeople" title="Save this data to a file for faster loading next time." class="small button">
                Save</button
            ><button class="small button" id="loadButton" title="Load a previously saved data file.">Load A File</button
            ><input type="file" id="fileInput" style="display: none"/>
            <span id="help" title="About this">?</span>
            <div id="explanation">${CC7.#helpText}</div>
            </div>`
        );

        const cc7Degree = CC7.getCookie("w_cc7Degree");
        if (cc7Degree && cc7Degree > 0 && cc7Degree <= CC7.MAX_DEGREE) {
            CC7.handleDegreeChange(cc7Degree);
        }
        $("#cc7Degree").on("change", function () {
            const theDegree = $("#cc7Degree").val();
            CC7.handleDegreeChange(theDegree);
        });
        $("#fileInput").on("change", CC7.handleFileUpload);
        $("#getPeopleButton").on("click", CC7.getConnectionsAction);

        $("#help").click(function () {
            $("#explanation").slideToggle();
        });
        $("#explanation").dblclick(function () {
            $(this).slideToggle();
        });
        $("#cc7Container #explanation x").click(function () {
            $(this).parent().slideUp();
        });
        $("#explanation").draggable();

        $("#getDegreeButton").on("click", CC7.getDegreeAction);

        $("#savePeople").click(function (e) {
            e.preventDefault();
            CC7.handleFileDownload();
        });
        $("#loadButton").click(function (e) {
            e.preventDefault();
            $("#fileInput").click();
        });
        $("#getPeopleButton").click();
    }

    static handleDegreeChange(wantedDegree) {
        const newDegree = Math.min(CC7.MAX_DEGREE, wantedDegree);
        $("#getPeopleButton").text(`Get CC${newDegree}`);
        $("#getDegreeButton").text(`Get Degree ${newDegree} Only`);
        // Set the selected degree value if required
        let theDegree = $("#cc7Degree").val();
        if (newDegree != theDegree) {
            const select = document.querySelector("#cc7Degree");
            select.value = newDegree;
        }
        // Set the cookie if required
        theDegree = CC7.getCookie("w_cc7Degree");
        if (newDegree != theDegree) {
            CC7.setCookie("w_cc7Degree", newDegree, { expires: 365 });
        }
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

    static showShakingTree(callback) {
        if ($("#tree").length) {
            $("#tree").slideDown("fast", "swing", callback);
        } else {
            const treeGIF = $("<img id='tree' src='./views/cc7/images/tree.gif'>");
            treeGIF.appendTo("#cc7Container");
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "50px",
                "width": "50px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
        }
    }

    static hideShakingTree() {
        $("#tree").slideUp("fast");
    }

    static setOverflow(value) {
        $("#view-container").css({
            overflow: value,
        });
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
                if (CC7.getCookie("w_wideTable") == "1") {
                    // Display a normal table
                    CC7.setCookie("w_wideTable", 0, { expires: 365 });
                    CC7.setOverflow("visible");
                    dTable.removeClass("wide");
                    $(this).text("Wide table");
                    $("#peopleTable").attr("title", "");
                    dTable.css({
                        position: "relative",
                        top: "0px",
                        left: "0px",
                    });
                    dTable.draggable("disable");
                } else {
                    // Display a wide table
                    CC7.setCookie("w_wideTable", 1, { expires: 365 });
                    CC7.setOverflow("auto");
                    $(this).text("Normal Table");
                    $("#peopleTable").attr("title", "Drag to scroll left or right");
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
                }
            });
        }
        if (CC7.getCookie("w_wideTable") == "1") {
            CC7.setCookie("w_wideTable", 0, { expires: 365 });
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

    static #BMD_EVENTS = ["Birth", "Death", "Marriage"];

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
                if (ev == "Marriage") {
                    const marriageData = tPerson.Marriage[aPerson.Id];
                    if (marriageData && marriageData[ev + "Date"]) {
                        evDate = marriageData[ev + "Date"];
                        evLocation = marriageData[ev + "Location"];
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
            const tlFirstName = CC7.profileLink(aFact.wtId, fNames);
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
        const id = +jqClicked.attr("data-id");
        let tPerson = window.people.get(id);
        const theClickedName = tPerson.Name;
        const familyId = theClickedName.replace(" ", "_") + "_timeLine";
        if ($(`#${familyId}`).length) {
            $(`#${familyId}`).slideToggle();
            return;
        }

        CC7.assignRelationshipsFor(tPerson);
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
        timelineTable.prependTo($("#cc7Container"));
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
        const personOfInterest = kPeople[0];
        let disName = CC7.displayName(personOfInterest)[0];
        if ($("#cc7Container").length) {
            if (personOfInterest.MiddleName) {
                disName = disName.replace(personOfInterest.MiddleName + " ", "");
            }
        }
        const captionHTML = CC7.profileLink(CC7.htmlEntities(kPeople[0].Name), disName);
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
                        "</td><td>" +
                        CC7.profileLink(linkName, oName) +
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
                const marriageData = personOfInterest.Marriage[kPers.Id];
                if (marriageData) {
                    const dMdate = CC7.ymdFix(marriageData.MarriageDate);
                    if (dMdate != "") {
                        marriageDeets += " " + dMdate;
                    }
                    if (CC7.isOK(marriageData.MarriageLocation)) {
                        marriageDeets += " " + marriageData.MarriageLocation;
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

        CC7.assignRelationshipsFor(fPerson);
        const thisFamily = [fPerson].concat(fPerson.Parent, fPerson.Sibling, fPerson.Spouse, fPerson.Child);

        const kkTable = CC7.peopleToTable(thisFamily);
        kkTable.prependTo("#cc7Container");
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

    static assignRelationshipsFor(person) {
        person.Relation = undefined;
        for (const rel of ["Parent", "Spouse", "Sibling", "Child"]) {
            const relatives = person[rel];
            if (relatives) {
                for (const relative of relatives) {
                    relative.Relation = rel;
                }
            }
        }
    }

    static showFamilySheet(jq) {
        const theClicked = jq;
        const jqClosest = jq.closest("tr");
        const theClickedName = jqClosest.attr("data-name");
        const theClickedId = +jqClosest.attr("data-id");

        const aPeo = window.people.get(theClickedId);
        if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
            CC7.doFamilySheet(aPeo, theClicked);
        } else {
            console.log(`Calling getRelatives for ${theClickedName}`);
            WikiTreeAPI.postToAPI({
                appId: CC7.APP_ID,
                action: "getRelatives",
                getSpouses: "1",
                getChildren: "1",
                getParents: "1",
                getSiblings: "1",
                keys: theClickedName,
            }).then((data) => {
                // Construct this person so it conforms to the profiles retrieved using getPeople
                const mPerson = CC7.convertToInternal(data[0].items[0].person);
                window.people.set(+mPerson.Id, mPerson);
                CC7.doFamilySheet(mPerson, theClicked);
            });
        }
    }

    static convertToInternal(pData) {
        const person = CC7.addFamilyToPerson(pData);
        if (person.Parents) person.Parents = Object.keys(person.Parents);
        if (person.Siblings) person.Siblings = Object.keys(person.Siblings);
        if (person.Children) person.Children = Object.keys(person.Children);
        person.Marriage = {};
        if (person.Spouses) {
            for (const sp of Object.values(person.Spouses)) {
                person.Marriage[sp.Id] = {
                    MarriageDate: sp.marriage_date,
                    MarriageEndDate: sp.marriage_end_date,
                    MarriageLocation: sp.marriage_location,
                    DoNotDisplay: sp.do_not_display,
                };
            }
        }
        return person;
    }

    static addFamilyToPerson(person) {
        person.Parent = CC7.getRels(person.Parents, "Parent");
        person.Sibling = CC7.getRels(person.Siblings, "Sibling");
        person.Spouse = CC7.getRels(person.Spouses, "Spouse");
        person.Child = CC7.getRels(person.Children, "Child");
        return person;
    }

    static getRels(rel, theRelation = false) {
        const peeps = [];
        if (typeof rel == undefined || rel == null) {
            return peeps;
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
        const savedDateFormat = CC7.getCookie("w_dateFormat");
        if (savedDateFormat) {
            dateFormat = savedDateFormat;
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
            -1,
            "-1",
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
                        return $(b).data(sorter).toString().localeCompare($(a).data(sorter));
                    });
                    el.attr("data-order", "desc");
                } else {
                    rows.sort(function (a, b) {
                        if ($(b).data(sorter) == "") {
                            return true;
                        }
                        return $(a).data(sorter).toString().localeCompare($(b).data(sorter));
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

    static profileLink(wtRef, text) {
        return wtRef.startsWith("Private")
            ? text
            : `<a target='_blank' href='https://www.wikitree.com/wiki/${wtRef}'>${text}</a>`;
    }

    static async addPeopleTable(caption) {
        $("#savePeople").show();
        const sortTitle = "title='Click to sort'";
        const aCaption = `<caption>${caption}</caption>`;
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
                `<th data-order='' id='manager' ${sortTitle}>Manager</th>` +
                createdTH +
                touchedTH +
                "</tr></thead><tbody></tbody></table>"
        );

        if ($(".peopleTable").length) {
            $(".peopleTable").eq(0).replaceWith(aTable);
        } else {
            aTable.appendTo($("#cc7Container"));
        }

        function sortIdsByDegreeAndBirthDate(keys) {
            const collator = new Intl.Collator();
            return [...keys]
                .map((k) => {
                    const mPerson = window.people.get(k);
                    let birthDate = CC7.ymdFix(mPerson.BirthDate);
                    if (birthDate == "" && mPerson.BirthDateDecade) {
                        birthDate = mPerson.BirthDateDecade || "";
                    }
                    return [k, mPerson.Degree < 0 ? 100 : mPerson.Degree, birthDate];
                })
                .sort((a, b) => {
                    if (a[1] == b[1]) {
                        return collator.compare(a[2], b[2]);
                    } else {
                        return a[1] - b[1];
                    }
                });
        }

        for (let [id, degree, birthDate] of sortIdsByDegreeAndBirthDate(window.people.keys())) {
            const mPerson = window.people.get(id);
            if (mPerson.Hide) continue;

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

            const privacyLevel = mPerson.Privacy;

            let privacy = null;
            let privacyTitle = "";
            // From https://github.com/wikitree/wikitree-api/blob/main/getProfile.md :
            // Privacy_IsPrivate            True if Privacy = 20
            // Privacy_IsPublic             True if Privacy = 50
            // Privacy_IsOpen               True if Privacy = 60
            // Privacy_IsAtLeastPublic      True if Privacy >= 50
            // Privacy_IsSemiPrivate        True if Privacy = 30-40
            // Privacy_IsSemiPrivateBio     True if Privacy = 30
            switch (privacyLevel) {
                case 60:
                    privacy = "./views/cc7/images/privacy_open.png";
                    privacyTitle = "Open";
                    break;
                case 50:
                    privacy = "./views/cc7/images/privacy_public.png";
                    privacyTitle = "Public";
                    break;
                case 40:
                    privacy = "./views/cc7/images/privacy_public-tree.png";
                    privacyTitle = "Private with Public Bio and Tree";
                    break;
                case 35:
                    privacy = "./views/cc7/images/privacy_privacy35.png";
                    privacyTitle = "Private with Public Tree";
                    break;
                case 30:
                    privacy = "./views/cc7/images/privacy_public-bio.png";
                    privacyTitle = "Public Bio";
                    break;
                case 20:
                    privacy = "./views/cc7/images/privacy_private.png";
                    privacyTitle = "Private";
                    break;
                case 10:
                    privacy = "./views/cc7/images/privacy_unlisted.png";
                    privacyTitle = "Unlisted";
                    break;
                default:
                    break;
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

            const oLink = CC7.profileLink(mPerson.Name, firstName);
            let managerLink;
            let dManager;
            if (mPerson.Manager) {
                const mgrWtId = mPerson.Managers.find((m) => m.Id == mPerson.Manager)?.Name || mPerson.Manager;
                dManager = CC7.htmlEntities(mgrWtId);
                managerLink = CC7.profileLink(dManager, dManager);
            } else {
                managerLink = mPerson.Name.startsWith("Private") ? "Unknown" : "Orphaned";
                dManager = managerLink;
            }

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

            if ($("#cc7Container").length) {
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
                const rArr = ["Sibling", "Spouse", "Child"];
                rArr.forEach(function (aR) {
                    let cellClass = "class='number'";
                    // For spouse count we check the Spouses arrays since it contains everyone, not just
                    // those present in the returned data
                    const realAr = aR == "Spouse" ? "Spouses" : aR;
                    if (mPerson[realAr].length) {
                        relNums[aR] = mPerson[realAr].length;
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
                        if (mPerson.DataStatus?.Spouse == "blank" || diedYoung == true) {
                            cellClass = "class='none number'";
                        }
                    }
                    relNums[aR + "_cell"] = "<td " + cellClass + " title='" + word + "'>" + relNums[aR] + "</td>";
                });

                if (!mPerson.Father && !mPerson.Mother) {
                    relNums["Parent"] = 0;
                    relNums["Parent_data"] = "data-Parent='0'";
                    relNums["Parent_cell"] = "<td class='noParents number' title='Missing parents'>0</td>";
                } else if (!mPerson.Father) {
                    relNums["Parent"] = 1;
                    relNums["Parent_data"] = "data-Parent='1'";
                    relNums["Parent_cell"] = "<td class='noFather number' title='Missing father'>1</td>";
                } else if (!mPerson.Mother) {
                    relNums["Parent"] = 1;
                    relNums["Parent_data"] = "data-Parent='1'";
                    relNums["Parent_cell"] = "<td class='noMother number' title='Missing mother'>1</td>";
                } else {
                    relNums["Parent"] = 2;
                    relNums["Parent_data"] = "data-Parent='2'";
                    relNums["Parent_cell"] = "<td class='number' title='Parents'>2</td>";
                }
            }

            let diedYoungClass = "";
            if (diedYoung == true) {
                diedYoungClass = "diedYoung";
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
                    " data-id='" +
                    mPerson.Id +
                    "' data-name='" +
                    CC7.htmlEntities(mPerson.Name) +
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
                    "' data-manager='" +
                    dManager +
                    "' class='" +
                    gender +
                    "'><td>" +
                    (privacy ? "<img class='privacyImage' src='" + privacy + "' title='" + privacyTitle + "'>" : "") +
                    `</td><td><img class='familyHome' src='./views/cc7/images/Home_icon.png' title="Click to see ${firstName}'s family sheet"></td>` +
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
                    "</td><td class='lnab'>" +
                    (mPerson.LastNameAtBirth.startsWith("Private")
                        ? mPerson.LastNameAtBirth
                        : "<a target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
                          CC7.htmlEntities(mPerson.LastNameAtBirth) +
                          "'>" +
                          mPerson.LastNameAtBirth +
                          "</a>") +
                    "</td><td class='lnc'><a   target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
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
                    "<td class='managerCell'>" +
                    managerLink +
                    "</td>" +
                    created +
                    touched +
                    "</tr>"
            );

            aTable.find("tbody").append(aLine);
        }

        if (CC7.getCookie("w_wideTable") == "0") {
            CC7.setOverflow("visible");
        } else {
            CC7.setOverflow("auto");
        }
        if ($("#cc7Container").length == 0) {
            $(".peopleTable caption").click(function () {
                $(this).parent().find("thead,tbody").slideToggle();
            });
        }

        // Provide a way to examine the data record of a specific person
        $("img.privacyImage").click(function (event) {
            if (event.altKey) {
                const id = $(this).closest("tr").attr("data-id");
                const p = window.people.get(+id);
                console.log(`${p.Name}, ${p.BirthNamePrivate}`, p);
            }
        });
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
                CC7.showShakingTree(() => CC7.hierarchyCC7());
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

        CC7.hideShakingTree();
        $("#countdown").fadeOut();
        if ($("#cc7Container").length == 0) {
            $("#birthdate").click();
        }

        CC7.cc7excelOut();
        CC7.addFiltersToTable();
        aTable.css({
            "overflow-x": "auto",
            "width": "100%",
        });
        aTable.floatingScroll();
    }

    static repositionFilterRow(table) {
        const hasTbody = table.querySelector("tbody") !== null;
        const hasThead = table.querySelector("thead") !== null;
        const headerRow = hasThead
            ? table.querySelector("thead tr:first-child")
            : hasTbody
            ? table.querySelector("tbody tr:first-child")
            : table.querySelector("tr:first-child");
        const filterRow = table.querySelector(".cc7filter-row");
        if (filterRow) {
            if (filterRow.nextSibling !== headerRow) {
                headerRow.parentElement.insertBefore(filterRow, headerRow.nextSibling);
            }
        }
    }

    static addFiltersToTable(aTable = null) {
        let tables;
        if (aTable) {
            tables = [aTable];
        } else {
            tables = document.querySelectorAll("#peopleTable");
        }
        tables.forEach((table) => {
            const hasTbody = table.querySelector("tbody") !== null;
            const hasThead = table.querySelector("thead") !== null;
            const headerRow = hasThead
                ? table.querySelector("thead tr:first-child")
                : hasTbody
                ? table.querySelector("tbody tr:first-child")
                : table.querySelector("tr:first-child");

            let headerCells = headerRow.querySelectorAll("th");
            const originalHeaderCells = headerCells;
            const isFirstRowHeader = headerCells.length > 0;
            if (!isFirstRowHeader) {
                const firstRowCells = headerRow.querySelectorAll("td");
                const dummyHeaderRow = document.createElement("tr");
                firstRowCells.forEach(() => {
                    const emptyHeaderCell = document.createElement("th");
                    dummyHeaderRow.appendChild(emptyHeaderCell);
                });
                headerRow.parentElement.insertBefore(dummyHeaderRow, headerRow);
                headerCells = dummyHeaderRow.querySelectorAll("th");
            }

            const filterRow = document.createElement("tr");
            filterRow.classList.add("cc7filter-row");

            headerCells.forEach((headerCell, i) => {
                const filterCell = document.createElement("th");
                if (i == 0) {
                    filterCell.colSpan = 3;
                    filterCell.style.textAlign = "right";
                    filterCell.innerHTML = "Filters:";
                    filterCell.title =
                        "Show only rows with these column values. > and < may be used for numerical columns.";
                    filterRow.appendChild(filterCell);
                }
                const headerCellText = headerCell.textContent.trim();
                const originalHeaderCellText = originalHeaderCells[i].textContent.trim();
                if (!["Pos."].includes(headerCellText) && !["Pos.", ""].includes(originalHeaderCellText)) {
                    // console.log(headerCellText);
                    filterCell.title = "Enter a column value to which to limit the rows";
                    const filterInput = document.createElement("input");
                    filterInput.type = "text";
                    filterInput.classList.add("filter-input");

                    // Check the length of the text in the first ten cells of the column
                    const rows = hasTbody ? table.querySelectorAll("tbody tr") : table.querySelectorAll("tr");
                    let isNumeric = 0;
                    let isDate = 0;
                    let isText = 0;
                    for (let j = 1; j < Math.min(50, rows.length); j++) {
                        if (rows[j]) {
                            const cellText = rows[j].children[i].textContent.trim();
                            const cellTextStripped = cellText.replace(/[<>~]?(\d+)°?/g, "$1");
                            const dateMatch = cellText.match(/(\d{4})(-(\d{2})-(\d{2}))?/);
                            if (dateMatch) {
                                isDate++;
                            } else if (CC7.isNumeric(cellTextStripped)) {
                                isNumeric++;
                            } else if (cellText !== "") {
                                isText++;
                            }
                        }
                    }

                    let maxVal;
                    if (isNumeric > isDate && isNumeric > isText) {
                        maxVal = "isNumeric";
                    } else if (isDate > isNumeric && isDate > isText) {
                        maxVal = "isDate";
                    } else {
                        maxVal = "isText";
                    }

                    if (maxVal == "isNumeric") {
                        filterInput.classList.add("numeric-input");
                    } else if (maxVal == "isDate") {
                        filterInput.classList.add("date-input");
                    } else {
                        filterInput.classList.add("text-input");
                    }

                    filterCell.appendChild(filterInput);
                }
                if (i > 2) {
                    filterRow.appendChild(filterCell);
                }
            });

            if (isFirstRowHeader) {
                headerRow.parentElement.insertBefore(filterRow, headerRow.nextSibling);
            } else {
                headerRow.parentElement.insertBefore(filterRow, headerRow);
            }

            const sortArrows = table.querySelectorAll(".sortheader");
            sortArrows.forEach((arrow) => {
                arrow.addEventListener("click", () => {
                    setTimeout(() => {
                        repositionFilterRow(table);
                    }, 100);
                });
            });
        });

        const filterFunction = () => {
            const table = tables[0];
            const hasTbody = table.querySelector("tbody") !== null;
            const hasThead = table.querySelector("thead") !== null;
            const rows = hasTbody ? table.querySelectorAll("tbody tr") : table.querySelectorAll("tr");
            const filterInputs = table.querySelectorAll(".filter-input");

            rows.forEach((row, rowIndex) => {
                // Skip first row only if there's no 'thead'
                if (!hasThead && rowIndex === 0) {
                    return;
                }

                // Skip if row is a filter-row or contains 'th' elements
                if (row.classList.contains("cc7filter-row") || row.querySelector("th")) {
                    return;
                }

                let displayRow = true;

                filterInputs.forEach((input, inputIndex) => {
                    let text = input.value.toLowerCase();
                    const columnIndex =
                        Array.from(input.parentElement.parentElement.children).indexOf(input.parentElement) + 2;
                    let cellText = row.children[columnIndex].textContent.toLowerCase();
                    const isDateColumn = input.classList.contains("date-input");
                    const isNumericColumn = input.classList.contains("numeric-input");

                    // If the column is numeric and the input is a number or a comparison, perform the appropriate check
                    if (
                        (isNumericColumn || (isDateColumn && text.length >= 4)) &&
                        (text === "" ||
                            !isNaN(parseFloat(text.replace(/[<>~]/g, ""))) ||
                            text[0] === ">" ||
                            text[0] === "<")
                    ) {
                        if (text !== "") {
                            let operator = text[0];
                            if (operator === ">" || operator === "<") {
                                text = parseFloat(text.slice(1)); // Remove the operator from the text
                            } else {
                                operator = "=="; // Default to equality if there's no operator
                                text = parseFloat(text.replace(/[<>~]/g, ""));
                            }
                            if (isDateColumn) {
                                let year = cellText.slice(0, 4); // Get the year part of the date
                                if (year.endsWith("s")) {
                                    year = year.slice(0, -1); // Remove the 's' for decade dates
                                }
                                cellText = parseFloat(year);
                            } else {
                                cellText = parseFloat(cellText.replace(/[<>~]/g, ""));
                            }
                            if (!eval(cellText + operator + text)) {
                                displayRow = false;
                            }
                        }
                    } else {
                        if (!cellText.includes(text)) {
                            displayRow = false;
                        }
                    }
                });

                row.style.display = displayRow ? "" : "none";
            });
            $("#peopleTable").floatingScroll("update");
        };

        function updateClearFiltersButtonVisibility() {
            const anyFilterHasText = Array.from(document.querySelectorAll(".filter-input")).some(
                (input) => input.value.trim() !== ""
            );

            clearFiltersButton.style.display = anyFilterHasText ? "inline-block" : "none";
        }

        document.querySelectorAll(".filter-input").forEach((input) => {
            input.addEventListener("input", () => {
                filterFunction();
                updateClearFiltersButtonVisibility();
            });
        });

        // Add Clear Filters button
        const clearFiltersButton = document.createElement("button");
        clearFiltersButton.textContent = "X";
        clearFiltersButton.title = "Clear Filters";
        clearFiltersButton.id = "clearTableFiltersButton";
        //  clearFiltersButton.style.position = "absolute";
        clearFiltersButton.addEventListener("click", () => {
            document.querySelectorAll(".filter-input").forEach((input) => {
                input.value = "";
            });
            filterFunction();
            updateClearFiltersButtonVisibility();
        });

        $(clearFiltersButton).insertAfter($("#wideTableButton"));
        clearFiltersButton.textContent = "Clear Filters";

        // Initially hide the button
        clearFiltersButton.style.display = "none";
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

    static formDisplayName(aPerson, aName) {
        return aPerson.Name.startsWith("Private")
            ? aPerson.LastNameAtBirth || "Private"
            : aName.withParts(CC7.WANTED_NAME_PARTS);
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

        for (let aPerson of window.people.values()) {
            if (!aPerson.Missing) {
                CC7.addMissingBits(aPerson);
            }
            const theDegree = aPerson.Degree;
            const aName = new PersonName(aPerson);
            const theName = CC7.formDisplayName(aPerson, aName);
            const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
            const theLNAB = theParts.get("LastNameAtBirth");
            const theFirstName = theParts.get("FirstName");

            if (CC7.isOK(theDegree) && theDegree <= CC7.MAX_DEGREE) {
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
                        '">' +
                        CC7.profileLink(linkName, theName) +
                        " " +
                        missing.missingIcons +
                        "</li>"
                );
                $("#degree_" + theDegree)
                    .find("ol")
                    .append(anLi);
            }
        }

        $("td ol,th ol").each(function () {
            CC7.sortList($(this), "lnab");
        });
    }

    static addMissingBits(aPerson) {
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
            ((aPerson?.DataStatus.Spouse != "known" && aPerson?.DataStatus.Spouse != "blank") ||
                aPerson.NoChildren != "1")
        ) {
            if (aPerson.Spouse.length == 0 && aPerson?.DataStatus?.Spouse != "blank") {
                aPerson.Missing.push("Spouse");
            }
            if (aPerson.Child.length == 0 && aPerson.NoChildren != "1") {
                aPerson.Missing.push("Children");
            }
        }
    }

    static missingThings(aPerson) {
        let missingBit = "";
        let missingIcons = "";
        aPerson.Missing.forEach(function (relation) {
            missingBit += "data-missing-" + relation + "='1' ";
            if (relation == "Father") {
                missingIcons +=
                    "<img title='Missing father' class='missingFather missingIcon' src='./views/cc7/images/blue_bricks_small.jpg'>";
            }
            if (relation == "Mother") {
                missingIcons +=
                    "<img title='Missing mother' class='missingMother missingIcon' src='./views/cc7/images/pink_bricks_small.jpg'>";
            }
            if (relation == "Spouse") {
                missingIcons +=
                    "<img title='Possible missing spouse' class='missingSpouse missingIcon' src='./views/cc7/images/spouse_bricks_small.png'>";
            }
            if (relation == "Children") {
                missingIcons +=
                    "<img title='Possible missing children' class='missingChildren missingIcon' src='./views/cc7/images/baby_bricks_small.png'>";
            }
        });
        return { missingBit: missingBit, missingIcons: missingIcons };
    }

    static addPeopleToHierarchy(degree) {
        $("#hierarchyView li[data-degree='" + degree + "']").each(function () {
            const id = $(this).data("id");
            const thisLI = $(this);
            const aPerson = window.people.get(+id);

            if (aPerson) {
                CC7.assignRelationshipsFor(aPerson);
                const familyMembers = [].concat(aPerson.Parent, aPerson.Sibling, aPerson.Spouse, aPerson.Child);

                familyMembers.forEach(function (aMember) {
                    CC7.addMissingBits(aMember);

                    if (thisLI.closest('li[data-name="' + aMember.Name + '"]').length == 0) {
                        const theDegree = aMember.Degree;
                        if (theDegree > aPerson.Degree) {
                            const aName = new PersonName(aMember);
                            const theName = CC7.formDisplayName(aMember, aName);
                            const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
                            const theLNAB = theParts.get("LastNameAtBirth");
                            const theFirstName = theParts.get("FirstName");

                            let relation = aMember.Relation;
                            if (relation == "Child") {
                                relation = CC7.mapGender(aMember.Gender, "Son", "Daughter", "Child");
                            } else if (relation == "Sibling") {
                                relation = CC7.mapGender(aMember.Gender, "Brother", "Sister", "Sibling");
                            } else if (relation == "Parent") {
                                relation = CC7.mapGender(aMember.Gender, "Father", "Mother", "Parent");
                            } else if (relation == "Spouse") {
                                relation = CC7.mapGender(aMember.Gender, "Husband", "Wife", "Spouse");
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
                                    CC7.profileLink(linkName, theName) +
                                    ` <span class='birthDeathDates'>${bdDates}</span> ${missingIcons}<ul></ul></li>`
                            );
                            thisLI.children("ul").append(anLi);
                        }
                    }
                });
            }
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

        const aPerson = window.people.get(window.rootId);
        const aName = new PersonName(aPerson);
        const theName = CC7.formDisplayName(aPerson, aName);
        const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
        const theLNAB = theParts.get("LastNameAtBirth");
        const theFirstName = theParts.get("FirstName");
        const linkName = CC7.htmlEntities(aPerson.Name);
        const anLi = $(
            `<li data-lnab='${theLNAB}' data-id='${aPerson.Id}' data-degree='${aPerson.Degree}' ` +
                `data-name=\"${aPerson.Name}\" data-first-name='${theFirstName}'>${aPerson.Degree}° ` +
                CC7.profileLink(linkName, theName) +
                "<ul></ul></li>"
        );
        hierarchySection.children("ul").append(anLi);
        for (let i = 0; i < CC7.MAX_DEGREE; i++) {
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
            window.visibleDegrees = CC7.MAX_DEGREE;
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
            if (window.visibleDegrees < CC7.MAX_DEGREE) {
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

                for (let i = CC7.MAX_DEGREE; i >= j + 1; i--) {
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
        CC7.hideShakingTree();
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
                            "<span title='People with missing father'>" +
                                missingFathers +
                                "<img class='missingFatherCount missingCountIcon' src='./views/cc7/images/blue_bricks_small.jpg'></span>"
                        )
                    );
                }
                if (missingMothers) {
                    countBit.append(
                        $(
                            "<span title='People with missing mother'>" +
                                missingMothers +
                                "<img class='missingMotherCount missingCountIcon' src='./views/cc7/images/pink_bricks_small.jpg'></span>"
                        )
                    );
                }
                if (missingSpouses) {
                    countBit.append(
                        $(
                            "<span title='People with possible missing spouse'>" +
                                missingSpouses +
                                "<img class='missingSpouseCount missingCountIcon' src='./views/cc7/images/spouse_bricks_small.png'></span>"
                        )
                    );
                }
                if (missingChildren) {
                    countBit.append(
                        $(
                            "<span title='People with posiible missing children'>" +
                                missingChildren +
                                "<img class='missingChildrenCount missingCountIcon' src='./views/cc7/images/baby_bricks_small.png'></span>"
                        )
                    );
                }
            }
        }
    }

    static async getPeopleAtNthDegree(key, degree, start, limit) {
        try {
            const result = await WikiTreeAPI.postToAPI({
                appId: CC7.APP_ID,
                action: "getPeople",
                keys: key,
                nuclear: degree,
                minGeneration: degree,
                start: start,
                limit: limit,
                fields: CC7.GET_PEOPLE_FIELDS,
            });
            return [result[0].status, result[0].resultByKey, result[0].people];
        } catch (error) {
            wtViewRegistry.showError(`Could not retrieve relatives for ${key}: ${error}`);
            return [`${error}`, [], []];
        }
    }

    static async getDegreeAction(event) {
        wtViewRegistry.clearStatus();
        window.people = new Map();
        window.rootId = null;
        window.cc7MinPrivateId = 0;
        event.preventDefault();
        const wtId = wtViewRegistry.getCurrentWtId();
        if (wtId.match(/.+\-.+/)) {
            CC7.clearDisplay();
            CC7.showShakingTree();
            $("#cc7Container").addClass("degreeView");
            const theDegree = +$("#cc7Degree").val();

            // We get two more degrees than necessary to ensure we can calculate the relative counts
            // correctly. We make separate (async) calls for each degree in order to be able to identify
            // the extra degrees so we can hide them from the display and not include them in the degree counts.
            const starttime = performance.now();
            const [[resultByKeyAtD, countAtD, dIsPartial], [, countAtDm1, m1IsPartial], [, countAtDp1, p1IsPartial]] =
                await Promise.all([
                    CC7.collectPeopelAtNthDegree(wtId, theDegree),
                    CC7.collectPeopelAtNthDegree(wtId, theDegree - 1, CC7.HIDE),
                    CC7.collectPeopelAtNthDegree(wtId, theDegree + 1, CC7.HIDE),
                ]);
            console.log(
                `Retrieved ${countAtD}, ${countAtDm1}, ${countAtDp1} profiles at degrees ${
                    theDegree - 1
                }, ${theDegree}, ${theDegree + 1} in ${performance.now() - starttime}ms`
            );
            if (dIsPartial) {
                wtViewRegistry.showWarning(
                    `Due to limits imposed by the API, we could not retrieve all the people at degree ${theDegree}. Relative counts may therefore also be incorrect.`
                );
            } else if (m1IsPartial || p1IsPartial) {
                wtViewRegistry.showWarning(
                    `Due to limits imposed by the API, we could not retrieve all the required data, so relative counts may be incorrect.`
                );
            }

            $("#oneDegreeList").remove();
            const oneDegreeList = $("<ol id='oneDegreeList'></ol>");
            $("#cc7Container").append(oneDegreeList);
            if (countAtD == 0) {
                CC7.hideShakingTree();
                return;
            }
            window.rootId = +resultByKeyAtD[wtId].Id;
            CC7.populateRelativeArrays();
            CC7.hideShakingTree();
            CC7.addPeopleTable(`Degree ${theDegree} connected people for ${wtId}`);
        }
    }

    static async collectPeopelAtNthDegree(wtId, theDegree, hide = !CC7.HIDE) {
        let start = 0;
        let isPartial = false;
        const limit = CC7.GET_PEOPLE_LIMIT;
        console.log(`Calling getPeople at Nth degree, key:${wtId}, degree:${theDegree}, start:${start}, hide:${hide}`);
        let callNr = 1;
        const starttime = performance.now();
        const [status, resultByKey, peopleData] = await CC7.getPeopleAtNthDegree(wtId, theDegree, start, limit);
        let profiles;
        if (status != "") {
            console.warn(`A problem occurred while requesting relatives for ${wtId} at degree ${theDegree}: ${status}`);
            profiles = [];
            isPartial = true;
        } else {
            profiles = peopleData ? Object.values(peopleData) : [];
        }
        if (profiles.length == 0 && resultByKey[wtId]?.status) {
            wtViewRegistry.showError(resultByKey[wtId]?.status);
        }
        console.log(`Received ${profiles.length} degree ${theDegree} profiles for start:${start}`);
        let resultByKeyReturned = {};
        let profileCount = 0;

        while (profiles.length > 0) {
            profileCount += profiles.length;
            CC7.addPeople(profiles, theDegree, hide);
            Object.assign(resultByKeyReturned, resultByKey);

            // Check if we're done
            if (profiles.length < limit) break;

            // We have more paged profiles to fetch
            ++callNr;
            start += limit;
            console.log(
                `Retrieving getPeople result page ${callNr}. key:${wtId}, nuclear:${theDegree}, start:${start}, limit:${limit}`
            );
            const [sstatus, , ancestorJson] = await CC7.getPeopleAtNthDegree(wtId, theDegree, start, limit);
            if (sstatus != "") {
                console.warn(`Partial results obtained when requesting relatives for ${wtId}: ${sstatus}`);
                profiles = [];
                isPartial = true;
            } else {
                profiles = ancestorJson ? Object.values(ancestorJson) : [];
            }
            console.log(`Received ${profiles.length} degree ${theDegree} profiles for start:${start}`);
        }
        console.log(
            `Retrieved ${profileCount} degree ${theDegree} profiles with ${callNr} API call(s) in ${
                performance.now() - starttime
            }ms`
        );
        return [resultByKeyReturned, profileCount, isPartial];
    }

    static addPeople(profiles, theDegree = -1, hide = !CC7.HIDE) {
        let nrAdded = 0;
        for (const person of profiles) {
            let id = +person.Id;
            if (id < 0) {
                // This is a private profile
                // WT returns negative ids for private profiles, but they seem to be unique only
                // within the result returned by the call (i.e. per page). However, since they are
                // different people, we give them uniq ids.
                if (window.people.has(id)) {
                    id = window.cc7MinPrivateId - 1;
                }
                person.Id = id;
                person.Name = `Private${id}`;
                person.DataStatus = { Spouse: "", Gender: "" };
            }
            if (!window.people.has(id)) {
                if (id < 0) {
                    window.cc7MinPrivateId = Math.min(id, window.cc7MinPrivateId);
                }
                // This is a new person, add them to the tree
                person.Parents = [person.Father, person.Mother];
                person.Degree = theDegree;
                person.Hide = hide;
                // To be filled later
                person.Parent = [];
                person.Spouse = [];
                person.Sibling = [];
                person.Child = [];
                person.Marriage = {};

                window.people.set(id, person);
                ++nrAdded;
            } else {
                console.log(`${person.Name} (${id}) not added since they are already present`);
            }
        }
        console.log(`Added ${nrAdded} people to the tree`);
        return nrAdded;
    }

    static async getConnectionsAction(event) {
        wtViewRegistry.clearStatus();
        const theDegree = +$("#cc7Degree").val();
        const wtId = wtViewRegistry.getCurrentWtId();
        event.preventDefault();
        $("#cc7Container").removeClass("degreeView");
        window.people = new Map();
        window.rootId = 0;
        window.cc7MinPrivateId = 0;
        CC7.clearDisplay();
        CC7.getConnections(theDegree);
    }

    static populateRelativeArrays() {
        const offDegreeParents = new Map();

        for (const pers of window.people.values()) {
            // Add Parent and Child arrays
            for (const pId of pers.Parents) {
                if (pId) {
                    let parent = window.people.get(+pId);
                    if (parent) {
                        pers.Parent.push(parent);
                        parent.Child.push(pers);
                    } else {
                        parent = offDegreeParents.get(+pId);
                        if (parent) {
                            parent.Child.push(pers);
                        } else {
                            offDegreeParents.set(+pId, { Id: pId, Child: [pers] });
                        }
                    }
                }
            }

            // Add Spouse and coresponding Marriage arrays
            for (const sp of pers.Spouses) {
                const spouse = window.people.get(+sp.Id);
                if (spouse) {
                    // Add to spouse array if it is not already there
                    // Note that this does not cater for someone married to the same person more than once,
                    // but currently WikiTree also does not cater for that.
                    if (!pers.Marriage[spouse.Id]) {
                        pers.Marriage[spouse.Id] = {
                            MarriageDate: sp.MarriageDate,
                            MarriageEndDate: sp.MarriageEndDate,
                            MarriageLocation: sp.MarriageLocation,
                            DoNotDisplay: sp.DoNotDisplay,
                        };
                        pers.Spouse.push(spouse);
                    }
                }
            }
        }
        // Now that all child arrays are complete, add Sibling arrays
        for (const pers of [...window.people.values(), ...offDegreeParents.values()]) {
            if (pers.Child.length) {
                // Add this person's children as siblings to each of his/her children
                for (const child of pers.Child) {
                    // Exclude this child from the sibling list
                    const siblings = pers.Child.filter((c) => c.Id != child.Id);
                    // Add each one unless it already is there (mothers and fathers may have same and different children)
                    const childsCurrentSibIds = new Set(child.Sibling.map((s) => s.Id));
                    for (const sib of siblings) {
                        if (!childsCurrentSibIds.has(sib.Id)) {
                            child.Sibling.push(sib);
                        }
                    }
                }
            }
        }
    }

    static async getConnections(maxWantedDegree) {
        CC7.showShakingTree();
        const wtId = wtViewRegistry.getCurrentWtId();
        const starttime = performance.now();
        // We get one more degree than necessary to ensure we can calculate the relative counts
        // correctly. We make a separate (async) call in order to be able to identify the extra
        // degree so we can hide them from the display and not include them in the degree counts.
        const [resultByKey, [, , isPartial]] = await Promise.all([
            CC7.makePagedCallAndAddPeople(wtId, maxWantedDegree),
            CC7.collectPeopelAtNthDegree(wtId, maxWantedDegree + 1, CC7.HIDE),
        ]);
        console.log(
            `Retrieved a total of ${window.people.size} unique CC${maxWantedDegree + 1} profiles in ${
                performance.now() - starttime
            }ms`
        );
        if (isPartial) {
            wtViewRegistry.showWarning(
                "Limits imposed by the API is causing relative counts of people at the highest degree of separation " +
                    "to be incomplete."
            );
        }

        window.rootId = +resultByKey[wtId]?.Id;
        CC7.populateRelativeArrays();

        // Calculate and assign degrees
        const degreeCounts = {};
        const root = window.people.get(window.rootId);
        if (root) root.Degree = 0;
        let actualMaxDegree = 0;
        const q = [window.rootId];
        while (q.length > 0) {
            const pId = q.shift();
            const p = window.people.get(+pId);
            if (p) {
                const newDegree = p.Degree + 1;
                if (newDegree <= 0) {
                    console.error(
                        `This should be impossible. Person ${p.Name} found with no degree number on the degree q`
                    );
                    continue;
                }
                // Add the next degree people from this person to the queue only if they don't
                // already have a degree
                for (const relation of ["Parent", "Spouse", "Child", "Sibling"]) {
                    const relIds = CC7.getIdsOf(p[relation]);
                    //console.log(`Checking ${relIds.length} ${relation}s of ${p.Name} (${p.Id})`);
                    for (const relId of relIds) {
                        const relative = window.people.get(relId);
                        if (relative && relative.Degree < 0) {
                            // the relative exists and doesn't have a degree
                            // Assign them a degree and add them to the queue so their relatives can be inspected
                            if (newDegree > actualMaxDegree) {
                                actualMaxDegree = newDegree;
                            }
                            relative.Degree = newDegree;
                            q.push(relId);

                            // Update the degree counts
                            if (degreeCounts[newDegree]) {
                                degreeCounts[newDegree] = degreeCounts[newDegree] + 1;
                            } else {
                                degreeCounts[newDegree] = 1;
                            }
                            //console.log(`Assigned ${relative.Name} (${relative.Id}) degree ${degree}`);
                        }
                    }
                }
            }
        }
        // Count unknown degree profiles
        const nrUknownDegrees = [...window.people.values()].reduce(
            (acc, person) => (person.Degree < 0 ? ++acc : acc),
            0
        );
        if (nrUknownDegrees > 0) {
            degreeCounts[-1] = nrUknownDegrees;
        }
        window.cc7Degree = Math.min(maxWantedDegree, actualMaxDegree);
        CC7.hideShakingTree();
        if ($("#degreesTable").length != 0) {
            $("#degreesTable").remove();
        }
        $("#cc7Container").append(
            $(
                "<table id='degreesTable'><tr><th>Degrees</th></tr><tr><th>Connections</th></tr><tr><th>Total</th></tr></table>"
            )
        );
        CC7.buildDegreeTableData(degreeCounts, actualMaxDegree);
        CC7.addPeopleTable(
            root ? `CC${window.cc7Degree} for ${new PersonName(root).withParts(CC7.WANTED_NAME_PARTS)}` : ""
        );
    }

    static getIdsOf(arrayOfPeople) {
        return arrayOfPeople.map((p) => +p.Id);
    }

    static async makePagedCallAndAddPeople(reqId, upToDegree) {
        if ($("#degreesTable").length == 0) {
            $("#cc7Container").append(
                $(
                    "<table id='degreesTable'><tr><th colspan=2>Collecting Profiles</th></tr><tr><th>Data Request No.</th></tr><tr><th>Received</th></tr><tr><th>Total</th></tr></table>"
                )
            );
        }
        const loadingGIF = "<td><img width='12' height='12' src='./views/cc7/images/load-33_128.gif'></td>";
        let start = 0;
        let callNr = 0;
        const limit = CC7.GET_PEOPLE_LIMIT;
        let resultByKey = {};

        const starttime = performance.now();
        let getMore = true;
        while (getMore) {
            callNr += 1;
            $("#degreesTable tr")
                .eq(1)
                .append($(`<td>${callNr}</td>`));
            $("#degreesTable tr").eq(2).append($(loadingGIF));
            $("#degreesTable tr").eq(3).append($(loadingGIF));

            if (callNr == 1) {
                console.log(
                    `Calling getPeople with keys:${reqId}, nuclear:${upToDegree}, start:${start}, limit:${limit}`
                );
            } else {
                console.log(
                    `Retrieving getPeople result page ${callNr}. keys:${reqId}, nuclear:${upToDegree}, start:${start}, limit:${limit}`
                );
            }
            const [keysResult, peopleData] = await CC7.getPeopleUpToDegree([reqId], upToDegree, start, limit);
            if (peopleData.length == 0 && keysResult[reqId]?.status) {
                wtViewRegistry.showError(keysResult[reqId]?.status);
            }
            if (callNr == 1) {
                resultByKey = keysResult;
            }
            const profiles = peopleData ? Object.values(peopleData) : [];
            console.log(`Received ${profiles.length} CC${upToDegree} profiles for start:${start}`);

            // We're re-using the degrees table here to show response counts as a way of a progress bar
            const degTable = document.getElementById("degreesTable");
            degTable.rows[2].cells[callNr].innerHTML = profiles.length;

            // Note: getPeople does not guarantee return order
            CC7.addPeople(profiles);
            degTable.rows[3].cells[callNr].innerHTML = window.people.size;

            start += limit;
            // Check if we're done
            getMore = profiles.length == limit;
        }
        console.log(
            `Retrieved ${window.people.size} unique CC${upToDegree} profiles with ${callNr} API call(s) in ${
                performance.now() - starttime
            }ms`
        );
        return resultByKey;
    }

    static async getPeopleUpToDegree(ids, depth, start = 0, limit = CC7.GET_PEOPLE_LIMIT) {
        const result = await WikiTreeAPI.postToAPI({
            appId: CC7.APP_ID,
            action: "getPeople",
            keys: ids.join(","),
            start: start,
            limit: limit,
            nuclear: depth,
            fields: CC7.GET_PEOPLE_FIELDS,
        });
        const status = result[0]["status"];
        if (status != "") {
            console.warn(`getpeople returned status: ${status}`);
        }
        const resultByKey = result[0]["resultByKey"];
        const people = result[0]["people"];

        return [resultByKey, people];
    }

    static makeFilename() {
        return CC7.makeSheetname() + new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19);
    }

    static makeSheetname() {
        const theDegree = $("#cc7Degree").val();
        let fileName = `CC${theDegree}_${wtViewRegistry.getCurrentWtId()}_`;
        fileName += $("div.degreeView").length ? `Degree_${theDegree}_` : "";
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
                "#tooBig",
                ".viewButton",
                "#wideTableButton",
            ].join(",")
        ).remove();
    }

    static handleFileDownload() {
        try {
            CC7.collapsePeople();
            const fileName = CC7.makeFilename();
            CC7.downloadArray([[window.rootId, window.cc7Degree], ...window.people.entries()], fileName);
        } finally {
            this.expandPeople(window.people);
        }
    }

    static collapsePeople() {
        // Replace people objects with their IDs
        for (const person of window.people.values()) {
            for (const relation of ["Parent", "Sibling", "Spouse", "Child"]) {
                if (person[relation]) {
                    const ids = CC7.getIdsOf(person[relation]);
                    person[relation] = ids;
                }
            }
        }
    }

    static expandPeople(peopleMap) {
        // Replace ids with people objects
        for (const person of peopleMap.values()) {
            for (const relation of ["Parent", "Sibling", "Spouse", "Child"]) {
                if (person[relation]) {
                    const peeps = [];
                    for (const id of person[relation]) {
                        const relative = peopleMap.get(id);
                        if (relative) peeps.push(relative);
                    }
                    person[relation] = peeps;
                }
            }
        }
        return peopleMap;
    }

    static handleFileUpload(event) {
        wtViewRegistry.clearStatus();
        const file = event.target.files[0];
        if (typeof file == "undefined" || file == "") {
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (e) {
            const contents = e.target.result;
            try {
                const peeps = JSON.parse(contents);
                const [r, x] = peeps.shift();
                window.people = CC7.expandPeople(new Map(peeps));
                window.rootId = r;
                window.cc7Degree = Number.isFinite(x) ? (window.cc7Degree = x) : 0;
            } catch (error) {
                CC7.hideShakingTree();
                wtViewRegistry.showError(`The input file is not valid: ${error}`);
                return;
            }

            const root = window.people.get(window.rootId);
            $(wtViewRegistry.WT_ID_TEXT).val(root.Name);
            const degreeCounts = {};
            let maxDegree = 0;
            for (const aPerson of window.people.values()) {
                if (aPerson.Hide) continue;
                if (degreeCounts[aPerson.Degree]) {
                    degreeCounts[aPerson.Degree] = degreeCounts[aPerson.Degree] + 1;
                } else {
                    degreeCounts[aPerson.Degree] = 1;
                }
                if (aPerson.Degree > maxDegree) {
                    maxDegree = aPerson.Degree;
                }
            }
            if (window.cc7Degree == 0) window.cc7Degree = maxDegree;
            CC7.hideShakingTree();
            CC7.addPeopleTable(
                `CC${Math.min(window.cc7Degree, CC7.MAX_DEGREE)} for ${new PersonName(root).withParts(
                    CC7.WANTED_NAME_PARTS
                )}`
            );
            $("#cc7Container #hierarchyViewButton").before(
                $(
                    "<table id='degreesTable'><tr><th>Degrees</th></tr><tr><th>Connections</th></tr><tr><th>Total</th></tr></table>"
                )
            );
            CC7.buildDegreeTableData(degreeCounts, maxDegree);
            CC7.handleDegreeChange(window.cc7Degree);
        };

        try {
            CC7.clearDisplay();
            CC7.showShakingTree(() => reader.readAsText(file));
        } catch (error) {
            CC7.hideShakingTree();
            wtViewRegistry.showError(`The input file is not valid: ${error}`);
        }
    }

    static buildDegreeTableData(degreeCounts, maxDegree) {
        function addTableCol(i, degreeSum) {
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
        let degreeSum = 0;
        for (let i = 1; i <= maxDegree; ++i) {
            degreeSum = degreeSum + degreeCounts[i];
            addTableCol(i, degreeSum);
        }
        if (degreeCounts[-1]) {
            degreeSum = degreeSum + degreeCounts[-1];
            addTableCol(-1, degreeSum);
        }
    }

    static cc7excelOut() {
        const sheetName = CC7.makeSheetname();

        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: sheetName,
            Subject: sheetName,
            Author: "WikiTree",
            CreatedDate: new Date(),
        };

        wb.SheetNames.push(sheetName);
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
        wb.Sheets[sheetName] = ws;

        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
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

    static assignGeneration(persons, person, generation) {
        person.Generation = generation;
        for (const ancestor of persons) {
            if (ancestor.Id === person.Father || ancestor.Id === person.Mother) {
                CC7.assignGeneration(persons, ancestor, generation + 1);
            }
        }
    }

    static getCookie(name) {
        return WikiTreeAPI.cookie(name) || null;
    }

    static setCookie(name, value, options) {
        return WikiTreeAPI.cookie(name, value, options);
    }
}
