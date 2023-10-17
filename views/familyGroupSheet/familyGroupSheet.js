class FamilyGroupSheetView extends View {
    static APP_ID = "familyGroupSheet";
    meta() {
        return {
            title: "Family Group Sheet",
            description: `Produce a printer-friendly Family Group Sheet.`,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        super.init(container_selector);
        this.person_id = person_id;

        if ($("body.familySheetForm").length) {
            window.keepSpouse = "";

            // Handle family sheet form submission

            let omySearches = localStorage.searches || "";
            const wtid = this.person_id;

            if (!omySearches.includes(`${wtid}|`)) {
                localStorage.searches = `${omySearches}${wtid}|`;
            }

            // Remove existing elements and insert loading icon
            $("#familySheetFormTable,#tree,#notesAndSources,.tableContainer,#privateQ").remove();
            $("<img id='tree' src='images/tree.gif'>").appendTo($("body"));

            let theWTID = capitalizeFirstLetter(`${wtid} `.trim(), 1);

            if (!theWTID.match(/\-/)) {
                theWTID = theWTID.replace(/([0-9])/, "-$1");
            }

            window.people = [];
            window.husband = 0;
            window.wife = 0;
            window.calledPeople = [theWTID];

            if (theWTID !== "") {
                $("#h1Text").remove();
                $("title").text(`Family Sheet: ${theWTID}`);
                window.calls = 1;
                getFamily(theWTID);
            }

            // Trigger family sheet form submission on Enter key press in wtid input
            $("#wtid").on("keydown", function (event) {
                window.keepSpouse = "";
                if (event.keyCode === 13) {
                    $("#familySheetGo").click();
                }
            });

            // Option toggle handlers
            $("#showBaptism").change(
                toggleStyle("showBaptismStyle", "tr.baptismRow{display:none;}", "baptChrist input")
            );
            $("#showBurial").change(toggleStyle("showBurialStyle", "tr.buriedRow{display:none;}"));
            $("#showNicknames").change(
                toggleStyle(
                    "showNicknamesStyle",
                    ".familySheetForm caption span.nicknames,span.nicknames{display:none;}"
                )
            );
            $("#showParentsSpousesDates").change(
                toggleStyle(
                    "showParentsSpousesDatesStyle",
                    ".familySheetForm  span.parentDates,.familySheetForm span.spouseDates{display:none;}"
                )
            );
            $("#showOtherLastNames").change(
                toggleStyle(
                    "showOtherLastNamesStyle",
                    ".familySheetForm caption span.otherLastNames,span.otherLastNames{display:none;}"
                )
            );
            $("#useColour").change(
                toggleStyle(
                    "useColourStyle",
                    ".familySheetForm tr.marriedRow, .familySheetForm caption, .roleRow[data-gender],.roleRow[data-gender] th, #familySheetFormTable thead tr th:first-child{background-color: #fff; border-left:1px solid black;border-right:1px solid black;}"
                )
            );
            $("#showBios").change(toggleBios);
            $("#showWTIDs").change(toggleStyle("showWTIDsStyle", ".familySheetForm .fsWTID{display:inline-block;}"));

            // Other event handlers
            $("input[type=radio][name=baptismChristening]").change(function () {
                setBaptChrist();
                storeVal($(this));
            });

            $("#fgsInfo").click(function () {
                handleSlideToggle("#fgsInfo", "fgsInfoState");
            });

            $("#fgsOptions x, #fgsOptions .notesHeading").click(function () {
                handleSlideToggle("#fgsOptions", "fgsOptionsState", function (isRemoved) {
                    if (isRemoved) {
                        $("#fgsOptions .notesHeading").show();
                    } else {
                        $("#fgsOptions .notesHeading").hide();
                    }
                });
            });

            // Check if nicknames are absent and hide the option
            if ($(".nicknames").length === 0) {
                $(".showNicknamesSpan").hide();
            }

            // Handle long month display setting
            $("#longMonth").change(function () {
                storeVal($(this));
                const opt = $(this).prop("checked") ? "full" : "short";
                $(".date").each(function () {
                    $(this).text(monthFormat($(this).text(), opt));
                });
            });

            // Handle fgsInfo and fgsOptions state
            if (localStorage.fgsInfoState === "removed") {
                $("#fgsInfo").addClass("removed");
            }
        }

        /* HTML */

        const familyGroupSheetHTML = `
        <div id='fgsOptions'>
        <x>x</x>
        <span class='notesHeading'>Options</span>
        <label id='getBiosLabel' style='display:none;'><input type='checkbox' id='getBios'  checked value='1'>Get biographies</label>
        <label id='showNicknamesLabel'><input type='checkbox' id='showNicknames'  checked value='1'><span id='showNicknamesSpan'>Show nicknames</span></label>
        <label id='husbandFirstLabel'><input type='checkbox' id='husbandFirst'  checked value='1'><span id='husbandFirstSpan'>Husband first</span></label>
        <label id='showOtherLastNamesLabel'><input type='checkbox' id='showOtherLastNames'  checked value='1'><span id='showOtherLastNamesSpan'>Show other last names</span></label>
        <div id='statusChoice' class='radios'>
        <label><input type='radio' name='statusChoice' checked value='symbols'>~, &lt;, &gt;</label><label><input type='radio' name='statusChoice' value='abbreviations'>abt., bef., aft.</label></div>
        <label><input type='checkbox' id='longMonth' value='1'><span id='longMonthSpan'>Full months</span></label>
        <label><input type='checkbox' id='showBaptism'  checked value='1'><span id='showBaptisedText'>Show Baptized</span></label>
        <div id='baptChrist' class='radios'>
        <label><input type='radio' name='baptismChristening' checked value='Baptized'>'Baptized'</label><label><input type='radio' name='baptismChristening' value='Christened'>'Christened'</label></div>
        <label><input type='checkbox' id='showBurial'  checked value='1'>Show Buried</label>
        <label id='showWTIDsLabel'><input type='checkbox' id='showWTIDs'><span>Show WikiTree IDs</span></label>
        <label id='showParentsSpousesDatesLabel'><input type='checkbox' checked id='showParentsSpousesDates'><span>Show parents' and spouses' dates</span></label>
        <div id='showGenderDiv' class='radios'><span>Show children's genders:</span> 
        <label><input type='radio' name='showGender' checked value='initial'>initial</label><label><input type='radio' name='showGender' value='word'>word</label><label><input type='radio' name='showGender' value='none'>none</label></div>
        <label id='showTablesLabel'><input type='checkbox' id='showTables'  checked value='1'>Show tables in 'Sources'</label>
        <label id='showListsLabel'><input type='checkbox' id='showLists'  checked value='1'>Show lists in 'Sources'</label>
        <label><input type='checkbox' id='useColour' checked value='1'>Color</label>
        <label id='toggleBios'><input type='checkbox' id='showBios'><span>Show all biographies</span></label>
        <label id='includeBiosWhenPrinting'><input type='checkbox' id='includeBios'><span>Include biographies when printing</span></label>
        </div>
        
        <div id='fgsInfo'>
        <x>x</x>
        <span class='notesHeading'>Notes</span>
        <ul>
        <li id='bioInstructions'>Click 'Biography' (bottom left) to see each biography.</li>
        <li>The roles ('Husband', 'Wife', etc.) link to WikiTree profiles.</li>
        <li>Click a name to see that person's family group.</li>
        <li>Most of the page is editable for printing. If you see some HTML (e.g. &lt;span&gt;John Brown&lt;/span&gt;), just edit the text between the tags.</li>
        </ul>
        </div>
        <label id="categoryBox"><input type="text" id="theCategory"><button class="small button" id="theCategoryGo">Go</button></label>`;
    }
}

USstatesObjArray = [
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

// Ahnen functions
function ancestorType(generation, gender) {
    let relType = "";
    if (generation > 0) {
        if (gender == "Female") {
            relType = "Mother";
        }
        if (gender == "Male") {
            relType = "Father";
        }
    }
    if (generation > 1) {
        relType = "Grand" + relType.toLowerCase();
    }
    if (generation > 2) {
        relType = "Great-" + relType.toLowerCase();
    }
    if (generation > 3) {
        relType = ordinal(generation - 2) + " " + relType;
    }
    return relType;
}
function decimalToBinary(x) {
    let bin = 0;
    let rem,
        i = 1,
        step = 1;
    while (x != 0) {
        rem = x % 2;
        x = parseInt(x / 2);
        bin = bin + rem * i;
        i = i * 10;
    }
    return bin;
}
function ahnenToMF(ahnen) {
    let bin = decimalToBinary(ahnen);
    bin = bin.toString().substring(1);
    return bin.replaceAll(/1/g, "M").replaceAll(/0/g, "F");
}
function ahnenToMF2(ahnen) {
    let mf = ahnenToMF(ahnen);
    let mfTitle = "Your";
    for (let i = 0; i < mf.length; i++) {
        if (mf[i] == "M") {
            mfTitle += " mother&apos;s";
        } else if (mf[i] == "F") {
            mfTitle += " father&apos;s";
        }
    }
    const mfTitleOut = mfTitle.substring(0, mfTitle.length - 7);
    return [mf, mfTitleOut];
}
// end Ahnen functions

// Age functions
function getAge(birth, death) {
    // must be date objects

    const age = death.getFullYear() - birth.getFullYear();
    const m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
        age--;
    }
    //console.log(age);
    return age;
}

function ageAtDeath(person, showStatus = true) {
    // ages
    let about = "";
    let diedAged = "";
    if (person?.BirthDate) {
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

            diedAged = getAge(
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
    if (diedAged == "") {
        return false;
    } else if (showStatus == false) {
        return diedAged;
    } else {
        return about + diedAged;
    }
}
// End age functions

function nl2br(str, replaceMode, isXhtml) {
    const breakTag = isXhtml ? "<br />" : "<br>";
    const replaceStr = replaceMode ? "$1" + breakTag : "$1" + breakTag + "$2";
    return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, replaceStr);
}

function br2nl(str, replaceMode) {
    const replaceStr = replaceMode ? "\n" : "";
    // Includes <br>, <BR>, <br />, </br>
    return str.replace(/<\s*\/?br\s*[\/]?>/gi, replaceStr);
}

//capitalize only the first letter of the string.
function capitalizeFirstLetter(string, only = 0) {
    // only = only change the first letter
    if (only == 0) {
        string = string.toLowerCase();
    }
    const bits = string.split(" ");
    let out = "";
    bits.forEach(function (abit) {
        out += abit.charAt(0).toUpperCase() + abit.slice(1) + " ";
    });
    function replacer(match, p1) {
        return "-" + p1.toUpperCase();
    }
    out = out.replace(/\-([a-z])/, replacer);
    return out.trim();
}

// make surname table scrollable
async function addWideTableButton() {
    $("#wideTableButton").show();

    const wideTableButton = $("<button class='button small' id='wideTableButton'>Wide Table</button>");
    if ($("#wideTableButton").length == 0) {
        let dTable;
        if ($(".peopleTable").length) {
            dTable = $(".peopleTable");
        } else if ($("body#missingParents").length) {
            dTable = $("#peopleList");
        } else {
            dTable = $("#connectionsTable");
        }

        if ($("body#missingParents").length) {
            wideTableButton.appendTo("#formThings");
        } else {
            wideTableButton.insertBefore(dTable);
        }

        $("#wideTableButton").click(function (e) {
            e.preventDefault();

            dTable = $(".peopleTable").eq(0);
            if ($("body#missingParents").length) {
                dTable = $("#peopleList");
            }

            if (Cookies.get("w_wideTable") == "1") {
                Cookies.set("w_wideTable", 0, { expires: 365 });

                if ($("body#missingParents").length && dTable.hasClass("wide")) {
                    dTable.draggable("destroy");
                    dTable.css({ left: "0" });
                }

                dTable.removeClass("wide");
                dTable.insertBefore($("#tableContainer"));
                $("#buttonBox").hide();
                $(this).text("Wide table");
            } else {
                Cookies.set("w_wideTable", 1, { expires: 365 });
                $(this).text("Normal Table");
                if ($("body#missingParents,body.cc7Table").length == 0) {
                    $("#buttonBox").show();
                }
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

                    const isiPad = navigator.userAgent.match(/iPad/i) != null;
                    if (isiPad) {
                        if ($("body#missingParents,body.app").length) {
                            dTable.draggable({
                                cursor: "grabbing",
                            });
                        }
                    } else {
                        if ($("body#missingParents,body.app").length) {
                            dTable.draggable({
                                axis: "x",
                                cursor: "grabbing",
                            });
                        }
                    }
                });

                if ($("#buttonBox").length == 0) {
                    const leftButton = $("<button id='leftButton'>&larr;</button>");
                    const rightButton = $("<button id='rightButton'>&rarr;</button>");
                    const buttonBox = $("<div id='buttonBox'></div>");
                    buttonBox.append(leftButton, rightButton);
                    $("body").prepend(buttonBox);

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
    //console.log(Cookies.get("w_wideTable"));
    if (Cookies.get("w_wideTable") == "1") {
        Cookies.set("w_wideTable", 0, { expires: 365 });
        $("#wideTableButton").click();
    }
}

function htmlEntities(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function displayName(fPerson) {
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
                    nnamesSplit = fPerson.Nicknames.split(/,\s?/);
                    out = "";
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
    const longest = arr.reduce(function (a, b) {
        return a.length > b.length ? a : b;
    });

    let fName = longest;
    let sName = "";
    if (fPerson["ShortName"]) {
        sName = fPerson["ShortName"];
    } else {
        sName = fName;
    }

    return [fName.trim(), sName.trim()];
}

/**
 * Transforms people data into an HTML table.
 *
 * @param {Array} kPeople - An array of people objects.
 * @returns {jQuery} kTable - The jQuery object of the table.
 */
function peopleToTable(kPeople) {
    // Initialize variables
    let disName = displayName(kPeople[0])[0];
    let rClass = "";
    let isDecades = false;
    let bDate = "";
    let dDate = "";
    let oName, oBDate, oDDate, linkName, aLine, marriageDeets, dMdate, spouseLine;

    // Check if we are in the app context and update the display name accordingly
    if ($(".app").length) {
        if (kPeople[0].MiddleName) {
            disName = disName.replace(kPeople[0].MiddleName + " ", "");
        }
    }

    // Generate the caption HTML with a link to the WikiTree profile
    const captionHTML =
        "<a href='https://www.wikitree.com/wiki/" + htmlEntities(kPeople[0].Name) + "'>" + disName + "</a>";

    // Create the table with jQuery
    const kTable = $(
        "<div class='familySheet'><w>↔</w><x>x</x><table><caption>" +
            captionHTML +
            "</caption><thead><tr><th>Relation</th><th>Name</th><th>Birth Date</th><th>Birth Place</th><th>Death Date</th><th>Death Place</th></tr></thead><tbody></tbody></table></div>"
    );

    // Loop through each person to populate the table
    kPeople.forEach(function (kPers) {
        kPers.RelationShow = kPers.Relation;

        // Check relation type and update it if undefined or active
        if (kPers.Relation === undefined || kPers.Active) {
            kPers.Relation = "Sibling";
            kPers.RelationShow = "";
            rClass = "self";
        }

        // Check and populate birth date
        if (kPers.BirthDate) {
            bDate = kPers.BirthDate;
        } else if (kPers.BirthDateDecade) {
            bDate = kPers.BirthDateDecade.slice(0, -1) + "-00-00";
            isDecades = true;
        } else {
            bDate = "0000-00-00";
        }

        // Check and populate death date
        if (kPers.DeathDate) {
            dDate = kPers.DeathDate;
        } else if (kPers.DeathDateDecade) {
            if (kPers.DeathDateDecade === "unknown") {
                dDate = "0000-00-00";
            } else {
                dDate = kPers.DeathDateDecade.slice(0, -1) + "-00-00";
            }
        } else {
            dDate = "0000-00-00";
        }

        // Check and populate birth and death locations
        if (kPers.BirthLocation === null || kPers.BirthLocation === undefined) {
            kPers.BirthLocation = "";
        }
        if (kPers.DeathLocation === null || kPers.DeathLocation === undefined) {
            kPers.DeathLocation = "";
        }

        // Check and populate middle name
        if (kPers.MiddleName === null) {
            kPers.MiddleName = "";
        }

        // Generate display name
        oName = displayName(kPers)[0];

        if (kPers.Relation) {
            kPers.Relation = kPers.Relation.replace(/s$/, "").replace(/ren$/, "");
            if (rClass != "self") {
                kPers.RelationShow = kPers.Relation;
            }
        }
        if (oName) {
            oBDate = ymdFix(bDate);
            oDDate = ymdFix(dDate);
            if (isDecades == true) {
                oBDate = kPers.BirthDateDecade;
                if (oDDate != "") {
                    oDDate = kPers.DeathDateDecade;
                }
            }
            let linkName = htmlEntities(kPers.Name);
            aLine = $(
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
            //console.log(kPers);

            marriageDeets = "m.";
            dMdate = ymdFix(kPers.marriage_date);
            if (dMdate != "") {
                marriageDeets += " " + dMdate;
            }
            if (isOK(kPers.marriage_location)) {
                marriageDeets += " " + kPers.marriage_location;
            }
            if (marriageDeets != "m.") {
                spouseLine = $(
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

    // Sort rows and append them to the table
    let rows = kTable.find("tbody tr");
    let familyOrder = ["Parent", "Sibling", "Spouse", "Child"];

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

function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
    };
}

function getTheYear(theDate, ev, person) {
    if (!isOK(theDate)) {
        if (ev == "Birth" || ev == "Death") {
            theDate = person[ev + "DateDecade"];
        }
    }
    const theDateM = theDate.match(/[0-9]{4}/);
    if (isOK(theDateM)) {
        return parseInt(theDateM[0]);
    } else {
        return false;
    }
}

/**
 * Calculates the age based on birth and death dates.
 *
 * @param {Date} birth - The birth date as a JavaScript Date object.
 * @param {Date} death - The death date as a JavaScript Date object.
 * @returns {number} age - The calculated age.
 */
function getAge(birth, death) {
    // Must be date objects
    let age = death.getFullYear() - birth.getFullYear();
    let m = death.getMonth() - birth.getMonth();

    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Converts a date into the format YYYY-MM-DD.
 *
 * @param {string} enteredDate - The date string to be converted.
 * @returns {string} enteredD - The converted date string.
 */
function dateToYMD(enteredDate) {
    let enteredD, eDMonth, eDYear, eDDate;

    if (enteredDate.match(/[0-9]{3,4}\-[0-9]{2}\-[0-9]{2}/)) {
        enteredD = enteredDate;
    } else {
        eDMonth = "00";
        eDYear = "00";

        eDYear = enteredDate.match(/[0-9]{3,4}/);
        if (eDYear !== null) {
            eDYear = eDYear[0];
        }

        eDDate = enteredDate.match(/\b[0-9]{1,2}\b/);
        if (eDDate !== null) {
            eDDate = eDDate[0].padStart(2, "0");
        }
        if (eDDate === null) {
            eDDate = "00";
        }

        // Map month names to numbers
        const monthMapping = [
            { regex: /jan/i, value: "01" },
            { regex: /feb/i, value: "02" },
            { regex: /mar/i, value: "03" },
            { regex: /apr/i, value: "04" },
            { regex: /may/i, value: "05" },
            { regex: /jun/i, value: "06" },
            { regex: /jul/i, value: "07" },
            { regex: /aug/i, value: "08" },
            { regex: /sep/i, value: "09" },
            { regex: /oct/i, value: "10" },
            { regex: /nov/i, value: "11" },
            { regex: /dec/i, value: "12" },
        ];

        monthMapping.forEach((month) => {
            if (enteredDate.match(month.regex) !== null) {
                eDMonth = month.value;
            }
        });

        enteredD = `${eDYear}-${eDMonth}-${eDDate}`;
    }

    return enteredD;
}

/**
 * Creates a timeline based on people data.
 *
 * @param {jQuery} jqClicked - The jQuery object that was clicked to trigger the timeline.
 */
function timeline(jqClicked) {
    let tPerson = "";
    let fam = [];
    let familyFacts = [];
    let startDate = "";
    let events = [];
    let evDate = "";
    let evLocation = "";
    let fName = "";
    let bDate = "";
    let mBio = "";
    let timelineTable = "";
    let bpDead = false;
    let bpDeadAge = 0;
    let bpBdate = "";
    let hasBdate = true;
    let bpBD = {};
    let aPersonBD = {};
    let bpAge = 0;
    let theDiff = 0;
    let theBPAge = "";
    let fNames = "";
    let tlDate = "";
    let tlBioAge = "";
    let tlRelation = "";
    let tlFirstName = "";
    let tlEventName = "";
    let tlEventLocation = "";
    let aPersonAge = 0;
    let theAge = "";
    let tlAge = "";
    let classText = "";
    let tlTR = "";

    window.people.forEach(function (oPers) {
        if (oPers.Name == jqClicked.attr("data-name")) {
            tPerson = oPers;
        }
    });

    fam = [tPerson].concat(tPerson.Parent, tPerson.Sibling, tPerson.Spouse, tPerson.Child);

    console.log(fam);

    /*
      famArr.forEach(function(anArr){
          if (anArr){if (anArr.length>0){fam.push(...anArr)}}
      })
      */
    familyFacts = [];
    startDate = getTheYear(tPerson.BirthDate, "Birth", tPerson);
    fam.forEach(function (aPerson) {
        events = ["Birth", "Death", "marriage"];
        events.forEach(function (ev) {
            evDate = "";
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
                aPerson.Relation = aPerson.Relation.replace(/s$/, "").replace(/ren$/, "");
            }

            if (evDate != "" && evDate != "0000" && isOK(evDate)) {
                fName = aPerson.FirstName;

                if (!aPerson.FirstName) {
                    fName = aPerson.RealName;
                }
                bDate = aPerson.BirthDate;
                if (!aPerson.BirthDate) {
                    bDate = aPerson.BirthDateDecade;
                }
                mBio = aPerson.bio;
                if (!aPerson.bio) {
                    mBio = "";
                }
                if (evLocation == undefined) {
                    evLocation = "";
                }

                familyFacts.push([
                    evDate,
                    evLocation,
                    fName,
                    aPerson.LastNameAtBirth,
                    aPerson.LastNameCurrent,
                    bDate,
                    aPerson.Relation,
                    mBio,
                    ev,
                    aPerson.Name,
                ]);
            }
        });
        if (aPerson.bio) {
            tlTemplates = aPerson.bio.match(/\{\{[^]*?\}\}/gm);
            if (tlTemplates != null) {
                //	console.log(tlTemplates);
                warTemplates = [
                    "The Great War",
                    "Korean War",
                    "Vietnam War",
                    "World War II",
                    "US Civil War",
                    "War of 1812",
                    "Mexican-American War",
                    "French and Indian War",
                    "Spanish-American War",
                ];
                tlTemplates.forEach(function (aTemp) {
                    evDate = "";
                    evLocation = "";
                    ev = "";
                    evDateStart = "";
                    evDateEnd = "";
                    aTemp = aTemp.replaceAll(/[{}]/g, "");
                    bits = aTemp.split("|");
                    templateTitle = bits[0].replaceAll(/\n/g, "").trim();
                    //	console.log(templateTitle);
                    bits.forEach(function (aBit) {
                        aBitBits = aBit.split("=");
                        aBitField = aBitBits[0].trim();
                        if (aBitBits[1]) {
                            aBitFact = aBitBits[1].trim().replaceAll(/\n/g, "");
                            //console.log("|"+aBitField+"|");
                            //console.log("|"+aBitFact+"|");
                            //if (aBitFact.match(/[0-9]{4}/)!=null) {
                            //HERE
                            if (warTemplates.includes(templateTitle) && isOK(aBitFact)) {
                                if (aBitField == "startdate") {
                                    evDateStart = dateToYMD(aBitFact);
                                    evStart = "Joined " + templateTitle;
                                }
                                if (aBitField == "enddate") {
                                    evDateEnd = dateToYMD(aBitFact);
                                    evEnd = "Left " + templateTitle;
                                }
                                if (aBitField == "enlisted") {
                                    evDateStart = dateToYMD(aBitFact);
                                    evStart = "Enlisted for " + templateTitle.replace("american", "American");
                                }
                                if (aBitField == "discharged") {
                                    evDateEnd = dateToYMD(aBitFact);
                                    evEnd = "Discharged from " + templateTitle.replace("american", "American");
                                }
                                if (aBitField == "branch") {
                                    //	console.log(aBitFact);
                                    evLocation = aBitFact;
                                }
                            }
                            //}
                        }
                    });
                    //if (evDate!=""){
                    if (isOK(evDateStart)) {
                        evDate = evDateStart;
                        ev = evStart;
                        familyFacts.push([
                            evDate,
                            evLocation,
                            aPerson.FirstName,
                            aPerson.LastNameAtBirth,
                            aPerson.LastNameCurrent,
                            aPerson.BirthDate,
                            aPerson.Relation,
                            aPerson.bio,
                            ev,
                            aPerson.Name,
                        ]);
                    }
                    if (isOK(evDateEnd)) {
                        //	console.log(evDateEnd);
                        evDate = evDateEnd;
                        ev = evEnd;
                        familyFacts.push([
                            evDate,
                            evLocation,
                            aPerson.FirstName,
                            aPerson.LastNameAtBirth,
                            aPerson.LastNameCurrent,
                            aPerson.BirthDate,
                            aPerson.Relation,
                            aPerson.bio,
                            ev,
                            aPerson.Name,
                        ]);
                    }
                    //}
                });
            }
        }
    });
    familyFacts.sort();

    if (!tPerson.FirstName) {
        tPerson.FirstName = tPerson.RealName;
    }

    if (tPerson.LastNameAtBirth != tPerson.LastNameCurrent) {
        tName = tPerson.FirstName + " (" + tPerson.LastNameAtBirth + ") " + tPerson.LastNameCurrent;
    } else {
        tName = tPerson.FirstName + " " + tPerson.LastNameCurrent;
    }

    timelineTable = $(
        "<div class='wrap timeline' data-wtid='" +
            tPerson.Name +
            "'><w>↔</w><x>x</x><table class='timelineTable'><caption>Events in the life of " +
            tName +
            "'s family</caption><thead><th class='tlDate'>Date</th><th class='tlBioAge'>Age (" +
            tPerson.FirstName +
            ")</th><th class='tlRelation'>Relation</th><th class='tlName'>Name</th><th class='tlAge'>Age</th><th class='tlEventName'>Event</th><th class='tlEventLocation'>Location</th></thead></table></div>"
    );

    timelineTable.prependTo($("body"));
    timelineTable.css({ top: window.pointerY - 30, left: 10 });

    bpDead = false;
    //console.log(familyFacts);
    familyFacts.forEach(function (aFact) {
        showDate = aFact[0].replace("-00-00", "").replace("-00", "");
        tlDate = "<td class='tlDate'>" + showDate + "</td>";

        aboutAge = "";
        bpBdate = tPerson.BirthDate;
        if (!tPerson.BirthDate) {
            bpBdate = tPerson.BirthDateDecade.replace(/0s/, "5");
        }
        hasBdate = true;
        if (bpBdate == "0000-00-00") {
            hasBdate = false;
        }
        bpBD = getApproxDate(bpBdate);
        evDate = getApproxDate(aFact[0]);
        aPersonBD = getApproxDate(aFact[5]);
        if (bpBD.Approx == true) {
            aboutAge = "~";
        }
        if (evDate.Approx == true) {
            aboutAge = "~";
        }

        bpAge = getAge(new Date(bpBD.Date), new Date(evDate.Date));
        if (bpAge == 0) {
            bpAge = "";
        }
        if (bpDead == true) {
            theDiff = parseInt(bpAge - bpDeadAge);
            bpAge = bpAge + " (" + bpDeadAge + " + " + theDiff + ")";
        }
        if (aboutAge != "" && bpAge != "") {
            theBPAge = "(" + bpAge + ")";
        } else {
            theBPAge = bpAge;
        }
        if (hasBdate == false) {
            theBPAge = "";
        }
        tlBioAge = "<td class='tlBioAge'>" + theBPAge + "</td>";
        if (aFact[6] == undefined || aFact[9] == tPerson.Name) {
            aFact[6] = "";
        }
        tlRelation = "<td class='tlRelation'>" + aFact[6].replace(/s$/, "") + "</td>";
        fNames = aFact[2];
        if (aFact[8] == "marriage") {
            fNames = tPerson.FirstName + " and " + aFact[2];
        }
        tlFirstName =
            "<td class='tlFirstName'><a  target='_blank'  href='https://www.wikitree.com/wiki/" +
            aFact[9] +
            "'>" +
            fNames +
            "</a></td>";
        tlEventName = "<td class='tlEventName'>" + capitalizeFirstLetter(aFact[8]).replaceAll(/Us\b/g, "US") + "</td>";
        tlEventLocation = "<td class='tlEventLocation'>" + aFact[1] + "</td>";

        if (aPersonBD.Approx == true) {
            aboutAge = "~";
        }

        aPersonAge = getAge(new Date(aPersonBD.Date), new Date(evDate.Date));
        if (aPersonAge == 0 || aPersonBD.Date.match(/0000/) != null) {
            aPersonAge = "";
            aboutAge = "";
        }

        if (aboutAge != "" && aPersonAge != "") {
            theAge = "(" + aPersonAge + ")";
        } else {
            theAge = aPersonAge;
        }
        tlAge = "<td class='tlAge'>" + theAge + "</td>";

        // <tr><td colspan='7'></td></tr>
        classText = "";
        if (aFact[9] == tPerson.Name) {
            classText += "BioPerson ";
        }
        classText += aFact[8] + " ";
        tlTR = $(
            "<tr class='" +
                classText +
                "'>" +
                tlDate +
                tlBioAge +
                tlRelation +
                tlFirstName +
                tlAge +
                tlEventName +
                tlEventLocation +
                "</tr>"
        );
        //console.log(tlTR);
        timelineTable.find(".timelineTable").append(tlTR);
        if (aFact[8] == "Death" && aFact[9] == tPerson.Name) {
            bpDead = true;
            bpDeadAge = bpAge;
        }
    });

    timelineTable.slideDown("slow");
    timelineTable.find("x").click(function () {
        timelineTable.slideUp();
    });
    timelineTable.find("w").click(function () {
        timelineTable.toggleClass("wrap");
    });

    timelineTable.draggable();
    timelineTable.dblclick(function () {
        $(this).slideUp("swing");
    });
}

/**
 * Creates a family sheet based on the clicked person.
 *
 * @param {Object} fPerson - The person object that was clicked to trigger the family sheet.
 */
function doFamilySheet(fPerson) {
    let theClickedName = fPerson.Name;
    let hidIt = false; // Initialize hidIt to a default value
    let thisFamily = [];
    let kkTable = "";
    let theLeft = 0;

    if ($("#" + theClickedName.replace(" ", "_") + "_family").length) {
        $("#" + theClickedName.replace(" ", "_") + "_family").fadeToggle();
        hidIt = true;
    }

    if (!hidIt) {
        // Use !hidIt instead of hidIt == false for clarity
        thisFamily = [fPerson].concat(fPerson.Parent, fPerson.Sibling, fPerson.Spouse, fPerson.Child);

        kkTable = peopleToTable(thisFamily);
        kkTable.prependTo("body");
        kkTable.attr("id", theClickedName.replace(" ", "_") + "_family");
        kkTable.draggable();
        kkTable.on("dblclick", function () {
            $(this).fadeOut();
        });

        theLeft = getOffset(theClicked[0]).left;

        kkTable.css({ top: getOffset(theClicked[0]).top + 50, left: theLeft });
        $(window).resize(function () {
            if (kkTable.length) {
                theLeft = getOffset(theClicked[0]).left;
                kkTable.css({ top: getOffset(theClicked[0]).top + 50, left: theLeft });
            }
        });

        $(".familySheet x").unbind();
        $(".familySheet x").click(function () {
            $(this).parent().fadeOut();
        });
        $(".familySheet w").unbind();
        $(".familySheet w").click(function () {
            $(this).parent().toggleClass("wrap");
        });
    }
}

/**
 * Displays the family sheet for a given person.
 *
 * @param {jQuery} jq - The jQuery object that was clicked to trigger the family sheet.
 */
function showFamilySheet(jq) {
    let theClicked = jq;
    let hidIt = false; // Initialize hidIt to a default value
    let theClickedName = jq.closest("tr").attr("data-name");
    let fsReady = false; // Initialize fsReady to a default value
    let thePeople = [];
    let mPerson = {};
    let mSpouses = [];
    let mChildren = [];
    let mSiblings = [];
    let mParents = [];

    if ($("body#missingParents").length) {
        theClickedName = jq.closest("li").attr("data-name");
    }
    if ($("body#missingParents.table").length) {
        theClickedName = jq.closest("tr").attr("data-name");
    }

    window.people.forEach(function (aPeo) {
        if (aPeo.Name === theClickedName) {
            if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
                doFamilySheet(aPeo);
                fsReady = true;
            }
        }
    });

    if (!fsReady) {
        $.ajax({
            url: "https://api.wikitree.com/api.php",
            data: {
                action: "getRelatives",
                getSpouses: "1",
                getChildren: "1",
                getParents: "1",
                getSiblings: "1",
                keys: theClickedName,
            },
            crossDomain: true,
            xhrFields: { withCredentials: true },
            type: "POST",
            dataType: "json",
            success: function (data) {
                //	console.log(data);
                thePeople = data[0].items;
                thePeople.forEach(function (aPerson, index) {
                    mPerson = aPerson.person;
                    mSpouses = getRels(mPerson.Spouses, mPerson, "Spouse");
                    mPerson.Spouse = mSpouses;
                    mChildren = getRels(mPerson.Children, mPerson, "Child");
                    mPerson.Child = mChildren;
                    mSiblings = getRels(mPerson.Siblings, mPerson, "Sibling");
                    mPerson.Sibling = mSiblings;
                    mParents = getRels(mPerson.Parents, mPerson, "Parent");
                    mPerson.Parent = mParents;
                });
                window.people.forEach(function (aPeo) {
                    if (aPeo.Name == theClickedName) {
                        aPeo = mPerson;
                    }
                });
                doFamilySheet(mPerson);
            },
        });
    }
}

/**
 * Handles the login process for the WikiTree API.
 */
function login() {
    // Get search parameters from the URL
    let searchParams = new URLSearchParams(window.location.search);
    let authCode = searchParams.get("authcode");

    // If the URL contains an 'authcode' parameter
    if (searchParams.has("authcode")) {
        $.ajax({
            url: "https://api.wikitree.com/api.php",
            crossDomain: true,
            xhrFields: { withCredentials: true },
            type: "POST",
            data: { action: "clientLogin", authcode: authCode },
            dataType: "json",
            success: function (data) {
                if (data.clientLogin.result === "Success") {
                    Cookies.set("loggedInID", data.clientLogin.userid);
                    Cookies.set("loggedInName", data.clientLogin.username);
                    Cookies.set("authCode", authCode);
                    window.location = window.location.href.split("?authcode=")[0];
                }
            },
        });
    }
    // If the user is already logged in
    else if (Cookies.get("loggedInID") !== undefined) {
        if (Cookies.get("authCode") !== undefined) {
            $.ajax({
                url: "https://api.wikitree.com/api.php",
                crossDomain: true,
                xhrFields: { withCredentials: true },
                type: "POST",
                data: { action: "clientLogin", authcode: Cookies.get("authCode") },
                dataType: "json",
                success: function (data) {
                    if (data.clientLogin.result === "Success") {
                        console.log("logged in");
                        $("#loginForm").css("visibility", "hidden");
                        if ($("body.cc7Table").length) {
                            $("#wtid").val(Cookies.get("loggedInName"));
                        }
                        if ($("#textSearch").length && $("#loggedIn").length === 0) {
                            $(
                                "<span id='loggedIn'>Logged in as " + Cookies.get("loggedInName") + "</span>"
                            ).insertBefore($("#loginForm"));
                        }
                    }
                },
            });
        }
    }
}

/**
 * Fetches and displays a list of people related to a given WikiTree ID.
 * The function can fetch either ancestors or descendants based on the action provided.
 *
 * @param {string} [action="getAncestors"] - The action to perform, either "getAncestors" or "getDescendants".
 */
function getPeople(action = "getAncestors") {
    const WTID = $("#wtid").val().trim(); // Trimmed WikiTree ID
    let depth = $("#depth").val(); // Depth to fetch

    // If the action selected is "dec", change the action to "getDescendants" and limit the depth to 5
    if ($("#action").val() === "dec") {
        action = "getDescendants";
        if (depth > 5) {
            depth = 5;
        }
    }

    // Make an AJAX request to fetch the data
    $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        data: { action: action, key: WTID, depth: depth, fields: "*" },
        dataType: "json",
        success: function (data) {
            $(".peopleList").remove(); // Remove existing list

            const myList = $("<ol class='peopleList'></ol>");
            myList.appendTo($("body"));

            let myPeople = [];

            if (data[0]?.ancestors) {
                myPeople = data[0].ancestors;
            } else if (data[0]?.descendants) {
                myPeople = data[0].descendants;
            }

            // Append list items for each person
            if (myPeople.length) {
                myPeople.forEach(function (aPerson) {
                    const listItem = $(
                        `<li>
                            ${aPerson.Name}: ${aPerson?.LongName}<br>
                            B. ${aPerson?.BirthDate}, ${aPerson?.BirthLocation}<br>
                            D. ${aPerson?.DeathDate} ${aPerson?.DeathLocation}
                        </li>`
                    );
                    listItem.appendTo(myList);
                });
            }
        },
    });
}

/**
 * Processes the relatives of a person and returns an array of people objects.
 *
 * @param {object} rel - Object containing relatives.
 * @param {object} person - The person to whom these relatives are related.
 * @param {string} [theRelation=false] - The type of relation (e.g., "Parent", "Child", etc.).
 * @returns {object[]} - An array of people objects with the relationship added.
 */
function getRels(rel, person, theRelation = false) {
    const peeps = [];

    // Check if 'rel' is undefined or null
    if (typeof rel === "undefined" || rel === null) {
        return false;
    }

    const pKeys = Object.keys(rel);
    pKeys.forEach((pKey) => {
        const aPerson = rel[pKey];

        // If 'theRelation' is provided, add it to the person object
        if (theRelation) {
            aPerson.Relation = theRelation;
        }

        peeps.push(aPerson);
    });

    return peeps;
}

window.privates = 0;

/**
 * Fetches relatives of a person by their ID from WikiTree API and processes the data.
 *
 * @param {string} id - The ID of the person for whom relatives are to be fetched.
 * @returns {void}
 */
async function getRelatives(id) {
    let secondTime = false; // Indicates whether this function was called before
    console.log(window.people.length, window.categoryProfiles.length);

    // Initialize parameters for fetching children, parents, and siblings
    let gC = "1"; // Get Children
    let gP = "1"; // Get Parents
    let gSib = "1"; // Get Siblings

    // If all people are fetched, set secondTime to true and exit
    if (window.people.length === window.categoryProfiles.length) {
        secondTime = true;
        return false;
    }

    // Make an AJAX call to the WikiTree API
    $.ajax({
        url: "https://api.wikitree.com/api.php",
        data: {
            action: "getRelatives",
            getSpouses: "1",
            getChildren: gC,
            getParents: gP,
            getSiblings: gSib,
            keys: id,
            // List of fields to fetch from the API
            fields: "BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Derived.BirthName,Bio,Privacy",
        },
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "json",
        success: function (data) {
            const thePeople = data[0].items;
            // Process each person's data
            thePeople.forEach(function (aPerson, index) {
                const mPerson = aPerson.person;
                // Get and set relations
                mPerson.Spouse = getRels(mPerson.Spouses, mPerson, "Spouse");
                mPerson.Child = getRels(mPerson.Children, mPerson, "Child");
                mPerson.Sibling = getRels(mPerson.Siblings, mPerson, "Sibling");
                mPerson.Parent = getRels(mPerson.Parents, mPerson, "Parent");

                // Check and update if this person is already in `window.people`
                let inArr = false;
                if (inArr === false) {
                    window.people.push(mPerson);
                }
            });
            // Additional operations if needed
        },
        error: function (err) {
            console.error(err); // Log any errors
        },
    });
}

/**
 * Processes the profiles stored in the global `window.categoryProfiles` array,
 * breaks them into batches and fetches relatives for each profile.
 *
 * @returns {void}
 */
function doCategoryProfiles() {
    // Check if the `window.categoryProfiles` array exists
    if (window.categoryProfiles) {
        console.log(window.categoryProfiles); // Debugging line

        // Calculate the number of batches needed for processing
        window.batches = Math.floor(window.categoryProfiles.length / 100);

        // Initialize a countdown for tracking the number of batches
        window.countdown = window.batches + 1;

        // Append a countdown display if it doesn't already exist
        if ($("#countdown").length === 0) {
            $("body").append($("<span id='countdown'>" + window.countdown + "</span>"));
        }

        // If the number of batches is less than 1, fetch relatives for all profiles
        if (window.batches < 1) {
            const IDString = window.categoryProfiles.join(",");
            getRelatives(IDString);
        } else {
            // Otherwise, divide the profiles into batches and fetch relatives for each batch
            const remainder = window.categoryProfiles.length % 100;

            for (let i = 0; i < window.batches; i++) {
                let miniArr = [];
                for (let j = 100 * i; j < 100 + 100 * i; j++) {
                    miniArr.push(window.categoryProfiles[j]);
                }
                const IDString = miniArr.join(",");
                getRelatives(IDString);
            }

            // If there are any remaining profiles, fetch relatives for them
            if (remainder > 0) {
                let miniArr = [];
                for (let k = j; k < j + remainder; k++) {
                    miniArr.push(window.categoryProfiles[k]);
                }
                const IDString = miniArr.join(",");
                getRelatives(IDString);
            }
        }
    }
}

/**
 * Fetches profiles from a specific category on WikiTree and initiates their processing.
 *
 * @param {string} category - The name of the category to fetch profiles from.
 * @returns {void}
 */
function getCategoryProfiles(category) {
    // URL encode the category name to make it safe for URL construction
    category = encodeURIComponent(category);

    // Add a loading image to the DOM
    $("body").append("<img id='tree' src='images/tree.gif'>");

    // Perform the AJAX request to fetch profiles from WikiTree
    $.ajax({
        url:
            "https://wikitree.sdms.si/function/WTWebProfileSearch/Ian.json?Query=CategoryFull%3D" +
            category +
            "&Format=JSON",
        crossDomain: true,
        xhrFields: { withCredentials: false },
        type: "POST",
        dataType: "text",
        success: function (data) {
            // Parse the JSON response and store the profiles in a global variable
            window.categoryProfiles = JSON.parse(data).response.profiles;

            // If profiles exist, initiate their processing
            if (window.categoryProfiles) {
                doCategoryProfiles();
            } else {
                // If no profiles were found, remove the loading image and display a message
                $("#tree").fadeOut();
                $("<p class='opsStat' id='noResults'>No results!</p>").insertAfter($("h1"));
            }
        },
        error: function (err) {
            // On error, remove the loading image and log the error
            $("#tree").slideUp();
            console.log(err);
        },
    });
}

/**
 * Formats a date based on user settings stored in cookies.
 *
 * @param {Array} fbds - Array containing [year, month, day] of the date.
 * @returns {string} - Formatted date string.
 */
function getDateFormat(fbds) {
    let dateFormat, fullDateFormat, fbdsDate, fbd;

    // Check if a date format is stored in cookies, or use a default format
    if (Cookies.get("w_dateFormat")) {
        dateFormat = Cookies.get("w_dateFormat");
    } else {
        dateFormat = 0;
        fullDateFormat = "M j, Y";
    }

    // Update fullDateFormat based on user's preference
    if (dateFormat === 1) {
        fullDateFormat = "j M Y";
    } else if (dateFormat === 2) {
        fullDateFormat = "F j, Y";
    } else if (dateFormat === 3) {
        fullDateFormat = "j F Y";
    }

    // Format date based on the existence of year, month, and day
    if (fbds[1] !== "00" && fbds[2] !== "00" && fbds[0] !== "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
        fbd = fbdsDate.format("j M Y");
        if (dateFormat > 0) {
            fbd = fbdsDate.format(fullDateFormat);
        }
    } else if (fbds[1] !== "00" && fbds[2] === "00" && fbds[0] !== "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else if (fbds[1] !== "00" && fbds[2] === "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else {
        fbdsDate = new Date(fbds[0], 0, 1);
        fbd = fbdsDate.format("Y");
    }

    return fbd;
}

/**
 * Determine the status symbols or abbreviations for birth and death dates.
 *
 * @param {Object} person - Object containing information about a person.
 * @returns {Array} - Array containing [Birth Date Status, Death Date Status].
 */
function bdDatesStatus(person) {
    let statusChoice = "symbols";
    let abbr = false;
    if ($("input[name='statusChoice'][value='abbreviations']").prop("checked") === true) {
        statusChoice = "abbreviations";
        abbr = true;
    }

    let bdStatus = "";
    let ddStatus = "";

    // Check birth date status
    if (typeof person["DataStatus"] !== "undefined") {
        if (person["BirthDate"] !== "0000-00-00") {
            if (person["DataStatus"]["BirthDate"] !== "") {
                if (person["DataStatus"]["BirthDate"] === "guess") {
                    bdStatus = abbr ? "abt. " : "~";
                } else if (person["DataStatus"]["BirthDate"] === "before") {
                    bdStatus = abbr ? "bef. " : "<";
                } else if (person["DataStatus"]["BirthDate"] === "after") {
                    bdStatus = abbr ? "aft. " : ">";
                }
            }
        }
    }

    // Check death date status
    if (typeof person["DataStatus"] !== "undefined") {
        if (person["DeathDate"] !== "0000-00-00") {
            if (person["DataStatus"]["DeathDate"] !== "") {
                if (person["DataStatus"]["DeathDate"] === "guess") {
                    ddStatus = abbr ? "abt. " : "~";
                } else if (person["DataStatus"]["DeathDate"] === "before") {
                    ddStatus = abbr ? "bef. " : "<";
                } else if (person["DataStatus"]["DeathDate"] === "after") {
                    ddStatus = abbr ? "aft. " : ">";
                }
            }
        }
    }

    return [bdStatus, ddStatus];
}

/**
 * Display the full dates for a given person object.
 *
 * @param {Object} fPerson - The person object containing date information.
 * @param {boolean} showStatus - Whether to show the date status (like 'abt.', 'bef.', etc.).
 * @returns {Array} - Array containing [Formatted Birth Date, Formatted Death Date].
 */
function displayFullDates(fPerson, showStatus = true) {
    // Get the date status symbols or abbreviations for birth and death dates
    const mbdDatesStatus = bdDatesStatus(fPerson);
    const bdStatus = mbdDatesStatus[0];
    const ddStatus = mbdDatesStatus[1];

    let fbd = "";
    let fdd = "";

    const fDates = [];

    // Handle Birth Date
    if (fPerson["BirthDate"] && fPerson["BirthDate"] !== "0000-00-00") {
        const fbds = fPerson["BirthDate"].split("-");
        fbd = fbds[0] === "unkno5" ? "" : getDateFormat(fbds);
    } else if (fPerson["BirthDateDecade"]) {
        fbd = fPerson["BirthDateDecade"];
    }

    fDates.push(showStatus && fbd ? bdStatus + fbd : fbd);

    // Handle Death Date
    if (fPerson["IsLiving"] === 1) {
        fdd = "living";
    } else if (fPerson["DeathDate"] && fPerson["DeathDate"] !== "0000-00-00") {
        const fdds = fPerson["DeathDate"].split("-");
        fdd = fdds[0] === "unkno5" ? "" : getDateFormat(fdds);
    } else if (fPerson["DeathDateDecade"] && fPerson["DeathDateDecade"] !== "unknown") {
        fdd = fPerson["DeathDateDecade"];
    }

    fDates.push(showStatus && fdd ? ddStatus + fdd : fdd);

    return fDates;
}

/**
 * Convert month names between short and long formats within a date string.
 *
 * @param {string} aDate - The original date string containing a month name.
 * @param {string} opt - Option indicating the target format ('short' for abbreviations).
 * @returns {string} - The date string with the month name converted.
 */
function monthFormat(aDate, opt) {
    // Short and long month names
    const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const lMonths = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    let gotit = false; // Flag to indicate if a month name was found and replaced
    let theDate = ""; // The final date string with the converted month name

    // Convert long month names to short
    if (opt === "short") {
        lMonths.forEach((aMonth, i) => {
            const reg = new RegExp(aMonth, "g");
            if (aDate.match(reg)) {
                theDate = aDate.replace(reg, sMonths[i]);
                gotit = true;
            }
        });
    }
    // Convert short month names to long
    else {
        if (!gotit) {
            sMonths.forEach((aMonth, i) => {
                const reg = new RegExp(aMonth, "i");
                if (aDate.match(reg)) {
                    theDate = aDate.replace(reg, lMonths[i]);
                    gotit = true;
                }
            });
        }
    }

    // Return the converted date or the original date if no conversion was made
    return gotit ? theDate : aDate;
}

/**
 * Converts a date string into YYYY-MM-DD format or extracts the year.
 *
 * @param {string} date - The original date string in various formats.
 * @returns {string} - The date string in YYYY-MM-DD format or just the year.
 */
function ymdFix(date) {
    let outDate;
    if (!date) {
        return "";
    }

    const dateBits1 = date.split(" ");
    // Check if date has day, month, and year
    if (dateBits1[2]) {
        const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const lMonths = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];

        // Extract the month
        const dMonth = date.match(/[A-Za-z]+/i);
        let dMonthNum;
        if (dMonth) {
            sMonths.forEach((aSM, i) => {
                if (
                    dMonth[0].toLowerCase() === aSM.toLowerCase() ||
                    dMonth[0].toLowerCase() === `${aSM}.`.toLowerCase()
                ) {
                    dMonthNum = (i + 1).toString().padStart(2, "0");
                }
            });
        }

        // Extract the day
        const dDate = date.match(/\b\d{1,2}\b/)[0];

        // Extract the year
        const dYear = date.match(/\b\d{4}\b/)[0];

        return `${dYear}-${dMonthNum}-${dDate}`;
    } else {
        const dateBits = date.split("-");
        outDate = date;
        if (dateBits[1] === "00" && dateBits[2] === "00") {
            if (dateBits[0] === "0000") {
                outDate = "";
            } else {
                outDate = dateBits[0];
            }
        }
    }
    return outDate;
}

/**
 * Checks if the given value is valid according to the specified criteria.
 *
 * @param {any} thing - The value to be checked.
 * @returns {boolean} - Returns true if the value is valid, otherwise false.
 */
function isOK(thing) {
    // List of values to be excluded
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

    // Check if the value is not in the excludeValues list
    if (!excludeValues.includes(thing)) {
        // Check if the value is numeric
        if (jQuery.isNumeric(thing)) {
            return true;
        } else {
            // Check if the value is a string
            if (jQuery.type(thing) === "string") {
                // Check if the string contains 'NaN'
                const nanMatch = thing.match(/NaN/);
                if (nanMatch === null) {
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

/**
 * Determines if a given value is numeric.
 *
 * @param {any} n - The value to be checked.
 * @returns {boolean} - Returns true if the value is numeric, otherwise false.
 */
function isNumeric(n) {
    // Check if the value is a finite number
    return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Takes a location string formatted as "part1, part2, ..., partN" and returns two strings:
 * 1. The original string with spaces trimmed around each part.
 * 2. The reversed string with spaces trimmed around each part.
 *
 * @param {string} locationText - The original location string.
 * @returns {Array} - An array containing two strings: [trimmed original, trimmed reversed]
 */
function location2ways(locationText) {
    // Split the location text by commas
    const alSplit = locationText.split(",");

    // Remove leading and trailing whitespaces from each part
    const alSplit2 = alSplit.map((string) => string.trim());

    // Join the trimmed parts back into a string
    const s2b = alSplit2.join(", ");

    // Reverse the order of parts and join them back into a string
    const b2s = alSplit2.reverse().join(", ");

    return [s2b, b2s];
}

/**
 * Determines if a given location string contains the name or abbreviation of a U.S. state.
 *
 * @param {string} locationText - The location string to be checked.
 * @returns {boolean} - Returns true if the location is in the USA, otherwise false.
 */
function isUSA(locationText) {
    // Split the location text by commas, optionally followed by a space
    const oLocations = locationText.split(/, ?/);
    let isUS = false;

    // Iterate through each part of the location
    oLocations.forEach(function (bit) {
        // Check if the part matches any U.S. state
        USstatesObjArray.forEach(function (obj) {
            if (bit === obj.name || bit === obj.abbreviation) {
                isUS = true;
                // Add the missing name or abbreviation to oLocations
                if (!oLocations.includes(obj.name)) oLocations.push(obj.name);
                if (!oLocations.includes(obj.abbreviation)) oLocations.push(obj.abbreviation);
            }
        });
    });

    return isUS;
}

/**
 * Returns the top K frequent elements in an array.
 *
 * @param {Array} nums - The array of numbers.
 * @param {number} k - The number of most frequent elements to return.
 * @returns {Array} - An array containing the top K frequent elements.
 */
function topKFrequent(nums, k) {
    // Create a hash to store the frequency of each number
    const hash = {};

    // Populate the hash with frequencies
    for (const num of nums) {
        hash[num] = (hash[num] || 0) + 1;
    }

    // Convert the hash to an array of [key, value] pairs and sort it by frequency
    const sortedArray = Object.entries(hash).sort((a, b) => b[1] - a[1]);

    // Extract the keys (the numbers) and parse them as integers
    const sortedElements = sortedArray.map((num) => parseInt(num[0]));

    // Return the top K frequent elements
    return sortedElements.slice(0, k);
}

/**
 * Sorts table rows based on two data attributes.
 *
 * @param {jQuery Object} dTable - The table element.
 * @param {string} dataThing1 - The primary data attribute.
 * @param {string} dataThing2 - The secondary data attribute.
 * @param {number} isText - Flag to indicate if the secondary data attribute is text (1) or numeric (0).
 * @param {number} reverse - Flag to indicate if the secondary sort should be reversed.
 */
function secondarySort2(dTable, dataThing1, dataThing2, isText = 0, reverse = 0) {
    let lastOne = "Me";
    let tempArr = [lastOne];
    let rows;

    const hasTbody = !!dTable.find("tbody").length;

    rows = hasTbody ? dTable.find("tbody tr") : dTable.find("tr");

    rows.each(function (index) {
        if ($(this).find("th").length == 0) {
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
        }
    });
}

/**
 * Sorts list items based on two data attributes.
 *
 * @param {jQuery Object} aList - The list element.
 * @param {string} dataThing1 - The primary data attribute.
 * @param {string} dataThing2 - The secondary data attribute.
 * @param {number} isText - Flag to indicate if the secondary data attribute is text (1) or numeric (0).
 * @param {number} reverse - Flag to indicate if the secondary sort should be reversed.
 */
function secondarySort3(aList, dataThing1, dataThing2, isText = 0, reverse = 0) {
    let lastOne = "Me";
    let tempArr = [lastOne];
    let rows;

    rows = aList.find("li");

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

/**
 * Fills table rows with birth and death location information based on a specific order.
 *
 * @param {jQuery Object} rows - The table rows to be filled.
 * @param {string} order - The suffix used to identify the specific data attribute for location.
 * @returns {jQuery Object} - The updated table rows.
 */
function fillLocations(rows, order) {
    // Iterate over each row in the table.
    rows.each(function () {
        // Find the table cell with class 'birthlocation'
        // and fill its text with the value of the data attribute
        // 'data-birthlocation' followed by the specified order.
        $(this)
            .find("td.birthlocation")
            .text($(this).attr("data-birthlocation" + order));

        // Similar to above, but for 'deathlocation'.
        $(this)
            .find("td.deathlocation")
            .text($(this).attr("data-deathlocation" + order));
    });

    // Return the updated rows.
    return rows;
}

/**
 * Sorts table rows based on a clicked element's attributes.
 *
 * @param {jQuery Object} el - The clicked element that determines the sorting order.
 */
function sortByThis(el) {
    // Event handler for click event on the element.
    el.click(function () {
        // Get the id attribute of the clicked element to know which column to sort.
        let sorter = el.attr("id");
        let rows = aTable.find("tbody tr");

        // Handle location-based sorting.
        if (sorter === "birthlocation" || sorter === "deathlocation") {
            // Check if we are sorting based on birth location.
            if (sorter === "birthlocation") {
                // Flip the order and sort accordingly.
                toggleLocationOrder(el, sorter, rows, "birthlocation");
            }
            // Check if we are sorting based on death location.
            else if (sorter === "deathlocation") {
                // Flip the order and sort accordingly.
                toggleLocationOrder(el, sorter, rows, "deathlocation");
            }

            // Sort the rows based on the localeCompare method.
            rows.sort(function (a, b) {
                if ($(b).data(sorter) === "") {
                    return true;
                }
                return $(a).data(sorter).localeCompare($(b).data(sorter));
            });
        }
        // Handle non-location-based sorting.
        else {
            // If the data is not a number, then it's a string.
            if (isNaN(rows.data(sorter))) {
                handleStringSorting(el, sorter, rows);
            }
            // If the data is a number, then sort numerically.
            else {
                handleNumericSorting(el, sorter, rows);
            }
        }

        // Append sorted rows to the table body.
        aTable.find("tbody").append(rows);

        // Move rows with missing or default data to the bottom.
        moveDefaultToBottom(el, rows, aTable);

        // Make sure the header row remains at the top.
        aTable.find("tr.main").prependTo(aTable.find("tbody"));
    });
}

/**
 * Function to toggle sorting order for location-based sorting.
 */
function toggleLocationOrder(el, sorter, rows, locationType) {
    if (el.attr("data-order") === "s2b") {
        sorter = `${locationType}-reversed`;
        el.attr("data-order", "b2s");
        rows = fillLocations(rows, "-reversed");
    } else {
        el.attr("data-order", "s2b");
        rows = fillLocations(rows, "");
    }
}

/**
 * Function to handle string-based sorting.
 */
function handleStringSorting(el, sorter, rows) {
    if (el.attr("data-order") === "asc") {
        rows.sort(function (a, b) {
            if ($(a).data(sorter) === "") {
                return true;
            }
            return $(b).data(sorter).localeCompare($(a).data(sorter));
        });
        el.attr("data-order", "desc");
    } else {
        rows.sort(function (a, b) {
            if ($(b).data(sorter) === "") {
                return true;
            }
            return $(a).data(sorter).localeCompare($(b).data(sorter));
        });
        el.attr("data-order", "asc");
    }
}

/**
 * Function to handle numeric-based sorting.
 */
function handleNumericSorting(el, sorter, rows) {
    if (el.attr("data-order") === "asc") {
        rows.sort((a, b) => ($(b).data(sorter) > $(a).data(sorter) ? 1 : -1));
        el.attr("data-order", "desc");
    } else {
        rows.sort((a, b) => ($(a).data(sorter) > $(b).data(sorter) ? 1 : -1));
        el.attr("data-order", "asc");
    }
}

/**
 * Function to move rows with default or missing data to the bottom of the table.
 */
function moveDefaultToBottom(el, rows, aTable) {
    const toBottom = ["", "00000000"];
    rows.each(function () {
        if (toBottom.includes($(this).data(sorter))) {
            aTable.find("tbody").append($(this));
        }
    });
}

/**
 * Create a person object with private information.
 * @param {Object} ancestor - The ancestor object to be modified.
 * @param {number} degree - Degree of relationship.
 * @param {string} gender - Gender of the person.
 * @param {string} name - Name of the person.
 * @param {string} firstname - First name of the person.
 * @param {string} lnab - Last name at birth.
 * @param {string} lnc - Current last name.
 * @returns {Object} - The modified person object.
 */
const makePrivateAncestor = (ancestor, degree, gender, name, firstname, lnab, lnc) => {
    const person = Object.assign({}, ancestor);
    person.Degree = degree;
    person.Gender = gender;
    person.Name = name;
    person.FirstName = firstname;
    person.LastNameAtBirth = lnab;
    person.LastNameCurrent = lnc;
    person.DataStatus = { Spouse: "", Gender: "" };
    return person;
};

/**
 * Adds a new row to the people table.
 * @param {Object} mPerson - The person object containing relevant data.
 * @param {jQuery} aTable - The table to which the row will be added.
 */
const addTableRow = (mPerson, aTable) => {
    const row = $("<tr></tr>");
    row.append($("<td></td>").text(mPerson.FirstName));
    row.append($("<td></td>").text(mPerson.LastNameAtBirth));
    row.append($("<td></td>").text(mPerson.LastNameCurrent));
    aTable.append(row);
};

/**
 * Initializes the people table, adding headers.
 * @returns {jQuery} - The initialized table.
 */
const initializePeopleTable = () => {
    const aTable = $("<table class='peopleTable'></table>");
    const header = $("<tr></tr>");
    header.append($("<th></th>").text("First Name"));
    header.append($("<th></th>").text("Last Name at Birth"));
    header.append($("<th></th>").text("Current Last Name"));
    aTable.append(header);
    return aTable;
};

/**
 * Main function to add people table to the DOM.
 */
const addPeopleTable = async () => {
    // Show the save people button
    $("#savePeople").show();

    // Initialize the table
    const aTable = initializePeopleTable();

    // Replace or append the table in the DOM
    if ($(".peopleTable").length) {
        $(".peopleTable").eq(0).replaceWith(aTable);
    } else {
        $("body").append(aTable);
    }

    // Assume window.people is the data source for the table
    for (const mPerson of window.people) {
        addTableRow(mPerson, aTable);
    }
};

/**
 * Calculate the average age at which people get married.
 * @returns {Object} - The average age statistics.
 */
function averageMarriageAge() {
    let marriedPeople = 0;
    let marriedAtDays = 0;
    const countedMarriedPeople = [];
    let maleAge = 0;
    let femaleAge = 0;
    let countedCouples = 0;
    const marriageAgeArray = [];
    const marriageAgeYArray = [];

    /**
     * Process a single person and update the statistics.
     * @param {Object} aPer - A person object.
     */
    const processPerson = (aPer) => {
        if (!aPer.Spouse) return;

        const marriage_date = aPer.Spouse[0]?.marriage_date;

        if (!isOK(marriage_date)) return;

        const marriageDate = ymdFix(marriage_date);
        const mYear = marriageDate.match(/[0-9]{4}/);

        if (!mYear) return;

        const marriageYear = mYear[0];
        const c_dDate = getApproxDate2(marriageDate);
        const dt2 = c_dDate.Date;

        if (!isOK(aPer.BirthDate)) return;

        const birthDate = ymdFix(aPer.BirthDate);
        const c_bDate = getApproxDate2(birthDate);
        const dt1 = c_bDate.Date;

        const marriedAt = getAge2(dt1, dt2);
        aPer.MarriedAt = marriedAt;

        if (!countedMarriedPeople.includes(aPer.Name)) {
            marriedAtDays += marriedAt[2];
            marriedPeople++;
            countedMarriedPeople.push(aPer.Name);
            marriageAgeArray.push(marriedAt[2]);
            marriageAgeYArray.push(marriedAt[0]);
        }
    };

    // Iterate through all people and process them
    window.people.forEach((aPer) => {
        processPerson(aPer);
    });

    const averageMarriedAt = Math.round(marriedAtDays / marriedPeople / 365.25);
    const averageAgeDiff = Math.round((maleAge - femaleAge) / countedCouples / 365.25);
    marriageAgeArray.sort((a, b) => a - b);
    const medianMarriedAt = Math.round(marriageAgeArray[Math.round(marriageAgeArray.length / 2)] / 365.25);
    const modeMarriedAt = topKFrequent(marriageAgeYArray, 1);

    return {
        AgeDifference: averageAgeDiff,
        MeanAge: averageMarriedAt,
        MedianAge: medianMarriedAt,
        ModeAge: modeMarriedAt,
    };
}

/**
 * Get an approximate date based on the given date string.
 * @param {string} theDate - The date string to be approximated.
 * @returns {Object} - The approximate date and a flag indicating if the date is approximated.
 */
function getApproxDate(theDate) {
    let approx = false;
    let aDate;

    // Check if the date ends with '0s', e.g., 1950s
    if (theDate.match(/0s$/) !== null) {
        aDate = theDate.replace(/0s/, "5");
        approx = true;
    } else {
        const bits = theDate.split("-");

        // Check if the date ends with 00-00, e.g., 1950-00-00
        if (theDate.match(/00-00$/) !== null) {
            aDate = `${bits[0]}-07-02`;
            approx = true;
        }
        // Check if the date ends with -00, e.g., 1950-07-00
        else if (theDate.match(/-00$/) !== null) {
            aDate = `${bits[0]}-${bits[1]}-16`;
            approx = true;
        }
        // Default case where the date doesn't need approximation
        else {
            aDate = theDate;
        }
    }

    return { Date: aDate, Approx: approx };
}

/**
 * Get an approximate date based on the given date string, considering an extra condition for missing month and date.
 * @param {string} theDate - The date string to be approximated.
 * @returns {Object} - Returns an object with the approximate date and a flag indicating if the date is approximated.
 */
function getApproxDate2(theDate) {
    let approx = false;
    let aDate;

    // Check if the date ends with '0s', e.g., 1950s
    if (theDate.match(/0s$/) !== null) {
        aDate = theDate.replace(/0s/, "5");
        approx = true;
    } else {
        const bits = theDate.split("-");

        // Check if the date ends with 00-00 or if the month is missing, e.g., 1950-00-00 or 1950
        if (theDate.match(/00-00$/) !== null || !bits[1]) {
            aDate = `${bits[0]}-07-02`;
            approx = true;
        }
        // Check if the date ends with -00, e.g., 1950-07-00
        else if (theDate.match(/-00$/) !== null) {
            aDate = `${bits[0]}-${bits[1]}-16`;
            approx = true;
        }
        // Default case where the date doesn't need approximation
        else {
            aDate = theDate;
        }
    }

    return { Date: aDate, Approx: approx };
}

/**
 * Check if a given year is a leap year.
 * @param {number} year - The year to check.
 * @returns {boolean} - Returns true if the year is a leap year, otherwise false.
 */
function isLeapYear(year) {
    return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}

/**
 * Calculate age between two dates in years, extra days, and total days.
 * @param {string} start - The start date in the format 'YYYY-MM-DD'.
 * @param {string} end - The end date in the format 'YYYY-MM-DD'.
 * @returns {Array} - Returns an array containing full years, extra days, and total days.
 */
function getAge2(start, end) {
    const startSplit = start.split("-");
    const start_day = parseInt(startSplit[2]);
    const start_month = parseInt(startSplit[1]);
    const start_year = parseInt(startSplit[0]);

    const endSplit = end.split("-");
    const end_day = parseInt(endSplit[2]);
    const end_month = parseInt(endSplit[1]);
    const end_year = parseInt(endSplit[0]);

    let month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    if (isLeapYear(start_year)) {
        month[1] = 29;
    }

    const firstMonthDays = month[start_month - 1] - start_day;

    let restOfYearDays = 0;
    for (let i = start_month; i < 12; i++) {
        restOfYearDays += month[i];
    }

    const firstYearDays = firstMonthDays + restOfYearDays;
    let fullYears = end_year - (start_year + 1);

    let lastYearMonthDays = 0;
    if (isLeapYear(end_year)) {
        month[1] = 29;
    } else {
        month[1] = 28;
    }

    for (let i = 0; i < end_month - 1; i++) {
        lastYearMonthDays += month[i];
    }

    const lastYearDaysTotal = end_day + lastYearMonthDays;
    let totalExtraDays = lastYearDaysTotal + firstYearDays;
    let andDays;

    if (totalExtraDays > 364) {
        fullYears++;
        let yearDays = 365;

        if (isLeapYear(start_year) && start_month < 3) {
            yearDays++;
        }
        if (isLeapYear(end_year) && end_month > 3) {
            yearDays++;
        }
        andDays = totalExtraDays - yearDays;
    } else {
        andDays = totalExtraDays;

        if (isLeapYear(start_year) && start_month < 3) {
            totalExtraDays--;
        }
        if (isLeapYear(end_year) && end_month > 3) {
            totalExtraDays--;
        }
    }

    const totalDays = Math.round(fullYears * 365.25) + andDays;
    return [fullYears, andDays, totalDays];
}

/**
 * Get the formatted date based on the given date array and user's date format settings from cookies.
 * @param {Array} fbds - The input date as an array of [Year, Month, Day].
 * @returns {string} - Returns the formatted date as a string.
 */
function getDateFormat(fbds) {
    let fullDateFormat = "j M Y";

    // Retrieve date format setting from cookies
    const dateFormat = Cookies.get("w_dateFormat") || 0;
    if (dateFormat === 0) {
        fullDateFormat = "M j, Y";
    }

    // Update fullDateFormat based on user's setting
    if (dateFormat === 1) {
        fullDateFormat = "j M Y";
    } else if (dateFormat === 2) {
        fullDateFormat = "F j, Y";
    } else if (dateFormat === 3) {
        fullDateFormat = "j F Y";
    }

    let fbd; // Formatted date to be returned
    if (fbds[1] !== "00" && fbds[2] !== "00" && fbds[0] !== "00") {
        // Month is zero-indexed in JavaScript Date
        const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
        fbd = fbdsDate.format(fullDateFormat);
    } else if (fbds[1] !== "00" && fbds[2] === "00" && fbds[0] !== "00") {
        const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else if (fbds[1] !== "00" && fbds[2] === "00") {
        const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else {
        const fbdsDate = new Date(fbds[0], 0, 1);
        fbd = fbdsDate.format("Y");
    }

    return fbd;
}

/**
 * Display the birth and death dates of a given person in a formatted manner.
 * @param {Object} fPerson - The person object containing birth and death date information.
 * @returns {string} - Returns the formatted string of birth and death dates.
 */
function displayDates(fPerson) {
    const mbdDatesStatus = bdDatesStatus(fPerson);
    const bdStatus = mbdDatesStatus[0];
    const ddStatus = mbdDatesStatus[1];

    let fbd = ""; // Formatted Birth Date
    let fdd = ""; // Formatted Death Date

    // Handling Birth Date
    if (fPerson["BirthDate"] && fPerson["BirthDate"] !== "0000-00-00" && fPerson["BirthDate"] !== "unknown") {
        fbd = fPerson["BirthDate"].split("-")[0];
    } else if (fPerson["BirthDateDecade"] && fPerson["BirthDateDecade"] !== "unknown") {
        fbd = fPerson["BirthDateDecade"];
        const decadeMidpoint = fPerson["BirthDateDecade"].slice(0, -2) + 5;
    }

    // Handling Death Date
    if (fPerson["IsLiving"] !== undefined && fPerson["IsLiving"] === 1) {
        fdd = "living";
    } else if (fdd === "" && fPerson["DeathDate"] && fPerson["DeathDate"] !== "0000-00-00") {
        fdd = fPerson["DeathDate"].split("-")[0];
    } else if (fPerson["DeathDateDecade"] && fPerson["DeathDateDecade"] !== "unknown") {
        fdd = fPerson["DeathDateDecade"];
        const decadeMidpoint = fPerson["DeathDateDecade"].slice(0, -2) + 5;
    }

    const fDates = `(${bdStatus}${fbd} - ${ddStatus}${fdd})`;

    return fDates;
}

/**
 * Display the full birth and death dates of a given person in a formatted manner.
 * @param {Object} fPerson - The person object containing birth and death date information.
 * @param {boolean} [showStatus=true] - Whether to show the status of the birth and death dates.
 * @returns {Array} - Returns an array containing the formatted birth and death dates.
 */
function displayFullDates(fPerson, showStatus = true) {
    const mbdDatesStatus = bdDatesStatus(fPerson);
    const bdStatus = mbdDatesStatus[0];
    const ddStatus = mbdDatesStatus[1];

    let fbd = "";
    let fdd = "";

    const fDates = [];

    // Handle Birth Date
    if (fPerson["BirthDate"] && fPerson["BirthDate"] !== "0000-00-00") {
        const fbds = fPerson["BirthDate"].split("-");
        fbd = fbds[0] === "unkno5" ? "" : getDateFormat(fbds);
    } else if (fPerson["BirthDateDecade"]) {
        fbd = fPerson["BirthDateDecade"];
    }

    fDates.push(showStatus && fbd ? bdStatus + fbd : fbd);

    // Handle Death Date
    if (fPerson["IsLiving"] !== undefined && fPerson["IsLiving"] === 1) {
        fdd = "living";
    } else if (!fdd && fPerson["DeathDate"] && fPerson["DeathDate"] !== "0000-00-00") {
        const fdds = fPerson["DeathDate"].split("-");
        fdd = fdds[0] === "unkno5" ? "" : getDateFormat(fdds);
    } else if (fPerson["DeathDateDecade"] && fPerson["DeathDateDecade"] !== "unknown") {
        fdd = fPerson["DeathDateDecade"];
    }

    fDates.push(showStatus && fdd ? ddStatus + fdd : fdd);

    return fDates;
}

function familySheetPerson(fsPerson, role) {
    baptismDate = "";
    baptismPlace = "";
    burialDate = "";
    burialPlace = "";

    fsBio = fsPerson.bio;
    //console.log(fsPerson.Name,fsBio);
    bioDummy = document.createElement("html");
    bioDummy.innerHTML = fsBio;
    myRefs = [];
    mSeeAlso = [];
    bioDummy.querySelectorAll("ref").forEach(function (aRef) {
        //console.log(aRef);
        if ($(aRef).find("references").length == 0) {
            myRefs.push(aRef.textContent.replace(/^\*/, "").trim());
            //console.log(myRefs);
        }
    });
    if (fsBio) {
        bioSplit = fsBio.split("<references />");
        if (bioSplit[1]) {
            removedAck = bioSplit[1].split(/=+\s?Acknowledge?ments?\s?=+/)[0];
            seeAlsoSplit = removedAck.split(/See also:/i);
            if (seeAlsoSplit[1]) {
                seeAlsoSplit2 = seeAlsoSplit[1].split(/\*/g);
                seeAlsoSplit2.forEach(function (aSeeAlso, ind) {
                    if (aSeeAlso != "\n" && aSeeAlso.trim() != "") {
                        mSeeAlso.push(aSeeAlso.replace(/^\*/, "").trim());
                    }
                });
            }
            citations = seeAlsoSplit[0].split(/\*/g);
            citations.forEach(function (aCit, index) {
                //console.log(aCit);

                if (citations[index + 1]) {
                    /*
                          if (citations[index+1].match(/^\* /)==null){
                              aCit = aCit+citations[index+1];
                              citations.splice(index+1,1);
                          }
                          */
                }
                if (aCit != "\n" && aCit.trim() != "") {
                    myRefs.push(aCit.replace(/^\*/, "").trim());
                }
            });
        }
        categoryMatch = bioSplit[0].match(/\[\[Category:.*?\]\]/g);
        if (categoryMatch != null) {
            //console.log(categoryMatch);
            categoryMatch.forEach(function (aCat) {
                //console.log(fsPerson.Name,aCat);
                dCat = aCat.split("Category:")[1].replace(/\]\]/, "");
                if (
                    dCat.match(
                        /(Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Grave)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)/i
                    ) != null &&
                    dCat.match("Crawford-7109") == null
                ) {
                    fsPerson.Cemetery = dCat.trim();
                    //console.log(fsPerson.Cemetery);
                }
            });
        }
        eventMatch = bioSplit[0].match(/\{\{Event[^]*?\}\}/gm);
        //console.log(eventMatch);
        if (eventMatch != null) {
            //console.log(eventMatch);
            eventMatch.forEach(function (anEvent) {
                //console.log(anEvent);
                if (anEvent.match(/type=(Baptism|Christening)/i) != null) {
                    eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                    eBits.forEach(function (anBit) {
                        anBit = anBit.replace(/<ref.*?>/, "");
                        anBitBits = anBit.split("=");
                        //console.log(anBitBits);
                        if (anBitBits[0] + " ".trim() == "date") {
                            baptismDate = anBitBits[1] + " ".trim();
                        }
                        if (anBitBits[0] + " ".trim() == "location") {
                            baptismPlace = anBitBits[1] + " ".trim();
                        }
                    });
                }
                if (anEvent.match(/type=Burial/i) != null) {
                    eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                    eBits.forEach(function (anBit) {
                        anBit = anBit.replace(/<ref.*?>/, "");
                        anBitBits = anBit.split("=");
                        //console.log(anBitBits);
                        if (anBitBits[0] + " ".trim() == "date") {
                            burialDate = anBitBits[1] + " ".trim();
                        }
                        if (anBitBits[0] + " ".trim() == "location") {
                            burialPlace = anBitBits[1] + " ".trim();
                        }
                    });
                }
            });
        }
    }
    window.references.push([fsPerson.Name, myRefs, mSeeAlso]);
    //console.log(window.references);

    myRefs.forEach(function (anRef) {
        if (anRef.match(/(burial\b)|(Grave\b)/i) != null) {
            burialDateMatch = anRef.match(/Burial Date.*(\b[0-9]+.*[0-9]{4})/);
            burialPlaceMatch = anRef.match(/Burial Place.*?(\b[A-z,\s]+)/);
            fagRx = new RegExp(
                "Find a Grave.*?" + fsPerson.FirstName + ".*?" + fsPerson.LastNameCurrent + ".*?" + "citing",
                "i"
            );
            fagMatch = anRef.match(fagRx);
            if (fagMatch != null) {
                burialPlaceFagMatch = anRef.match(/citing (.*?) ;/);
                if (burialPlaceFagMatch != null) {
                    if (burialPlaceFagMatch[1]) {
                        burialPlace = burialPlaceFagMatch[1];
                    }
                    burialDatesMatch = anRef.match(/\([0-9A-z\s]+?\–.+?[12][0-9]+?\),/);
                    if (burialDatesMatch != null) {
                        burialDate2 = burialDatesMatch[0];
                        bdSplit = burialDate2.split("–");
                        if (bdSplit[1]) {
                            burialDate = bdSplit[1].replace("),", "");
                        }
                    }
                }
            }
            if (burialDateMatch != null) {
                burialDate = burialDateMatch[1];
            }
            if (burialPlaceMatch != null) {
                burialPlace = burialPlaceMatch[1];
            }
        }
        if (anRef.match(/(Baptism\b)|(Christening\b)/i) != null) {
            baptismDateMatch = anRef.match(/(Baptism\b|Christening\b) Date.*/);
            baptismPlaceMatch = anRef.match(/(Baptism\b|Christening\b) Place.*/);
            if (baptismDateMatch != null && baptismDate == "") {
                baptismDate = baptismDateMatch[0].match(/([0-9]{1,2}\b)?\s([A-z]{3,}\b)\s[0-9]{4}/)[0];
            }
            if (baptismPlaceMatch != null && baptismPlace == "") {
                baptismPlaceBits = baptismPlaceMatch[0].split("|");
                baptismPlaceBits.forEach(function (aBit) {
                    if (aBit.match(/Baptism|Christening/i) == null && aBit.match(/[0-9]/i) == null) {
                        baptismPlace = aBit + " ".trim();
                    }
                });
            }
        }
    });
    if (isOK(fsPerson.Cemetery)) {
        burialPlace = fsPerson.Cemetery;
    }

    bdDates = displayFullDates(fsPerson);
    bDate = bdDates[0];
    dDate = bdDates[1];
    if (!isOK(bDate)) {
        bDate = "";
    }
    if (!isOK(dDate)) {
        dDate = "";
    }
    mainPerson = false;
    otherSpouse = "";
    otherSpouses = [];
    mainSpouse = "";
    if (fsPerson.Name == window.people[0].Name) {
        mainPerson = true;

        if (fsPerson.Spouse.length) {
            if (window.keepSpouse) {
                mainSpouseName = window.keepSpouse;
            } else {
                mainSpouse = fsPerson.Spouse[0];
                mainSpouseName = mainSpouse.Name;
            }
            if (fsPerson.Spouse.length > 0) {
                fsPerson.Spouse.forEach(function (fSpouse) {
                    if (window.keepSpouse) {
                        if (fSpouse.Name == window.keepSpouse) {
                            mainSpouse = fSpouse;
                        }
                    }
                    if (fSpouse.Name != mainSpouseName) {
                        otherSpouses.push(fSpouse);
                    }
                });
            }
            //	console.log(mainSpouse);
        }
    }

    showGenderVal = $("input[name='showGender']:checked").val();
    dGender = "";
    if (fsPerson.Gender) {
        if (showGenderVal == "initial") {
            dGender = fsPerson.Gender.substring(0, 1);
        } else if (showGenderVal == "word") {
            dGender = fsPerson.Gender;
        }
    }

    genderSpan = "";
    if (role != "Husband" && role != "Wife") {
        genderSpan = "<span data-gender='" + fsPerson.Gender + "' class='fsGender'>" + dGender + "</span>";
    }

    roleName = "";
    //if (!["Husband","Wife"].includes(role)){
    if (fsPerson.Name != $("#wtid").val()) {
        roleName = "data-name='" + htmlEntities(fsPerson.Name) + "'";
    }
    dGender = "";
    if (fsPerson.Gender) {
        dGender = fsPerson.Gender;
    }

    fsWTIDSpan = "";
    if (fsPerson.Name) {
        fsWTIDSpan = "<span class='fsWTID'>(" + htmlEntities(fsPerson.Name) + ")</span>";
    }

    showName = htmlEntities(displayName(fsPerson)[0]);

    showName = showName.replace(/(“.+”)/, "<span class='nicknames'>$1</span>");
    otherLastNames = "";
    prefix = "";
    suffix = "";
    if (fsPerson.LastNameOther) {
        otherLastNames = " <span class='otherLastNames'>(also " + fsPerson.LastNameOther + ")</span> ";
        $("#showOtherLastNamesLabel").css("display", "inline-block");
    }

    showRole = role;
    if (dGender == "Female" && role == "Husband") {
        showRole = "Wife";
    }
    if (dGender == "Male" && role == "Wife") {
        showRole = "Husband";
    }

    roleRow =
        "<tr data-gender='" +
        dGender +
        "' data-name='" +
        htmlEntities(fsPerson.Name) +
        "' title='" +
        htmlEntities(fsPerson.Name) +
        "' data-role='" +
        role +
        "' class='roleRow'><th class='role heading'><a href='https://www.wikiTree.com/wiki/" +
        htmlEntities(fsPerson.Name) +
        "'>" +
        showRole +
        "</a>: </th><td class='fsName' " +
        roleName +
        " colspan='2'><a href='https://apps.wikitree.com/apps/beacall6/familySheet.php?id=" +
        fsPerson.Name +
        "'>" +
        showName +
        otherLastNames +
        "</a>" +
        genderSpan +
        " " +
        fsWTIDSpan +
        "</td></tr>";
    if (role == "Husband") {
        window.husband = fsPerson.Id;
        window.husbandWTID = fsPerson.Name;
    }
    if (role == "Wife") {
        window.wife = fsPerson.Id;
        window.wifeWTID = fsPerson.Name;
    }

    birthPlace = fsPerson.BirthLocation;
    if (!isOK(fsPerson.BirthLocation) || fsPerson.BirthLocation == undefined) {
        birthPlace = "";
    }
    deathPlace = fsPerson.DeathLocation;
    if (!isOK(fsPerson.DeathLocation)) {
        deathPlace = "";
    }

    birthRow =
        "<tr  data-role='" +
        role +
        "' class='birthRow'><th class='birthHeading heading'>Born:</th><td class='BirthDate date'>" +
        bDate +
        "</td><td class='BirthPlace'>" +
        birthPlace +
        "</td></tr>";

    baptismRow =
        "<tr  data-role='" +
        role +
        "' class='baptismRow'><th class='baptismHeading heading'>Baptized:</th><td class='BaptismDate date'>" +
        baptismDate +
        "</td><td class='BaptismPlace'>" +
        baptismPlace +
        "</td></tr>";

    marriageRow = "";
    mainSpouseMarriageDate = "";
    mainSpouseMarriagePlace = "";
    mainSpouseMarriageEndDate = "";
    if (mainSpouse != "") {
        if (isOK(mainSpouse.marriage_date)) {
            mainSpouseMarriageDate =
                "<span class='marriageDate date'>" + getDateFormat(mainSpouse.marriage_date.split("-")) + "</span>";
        }
        if (isOK(mainSpouse.marriage_end_date)) {
            mainSpouseMarriageEndDate =
                "<span class='marriageEndDate date'>&nbsp;- " +
                getDateFormat(mainSpouse.marriage_end_date.split("-")) +
                "</span>";
        }
        if (isOK(mainSpouse.marriage_location)) {
            mainSpouseMarriagePlace = mainSpouse.marriage_location;
        }
    }
    if (role == "Husband" || role == "Wife") {
        //console.log(window);
        marriageRow =
            "<tr  data-role='" +
            role +
            "' class='marriedRow'><th class='marriedHeading heading'>Married:</th><td>" +
            mainSpouseMarriageDate +
            mainSpouseMarriageEndDate +
            "</td><td class='marriedPlace'>" +
            mainSpouseMarriagePlace +
            "</td></tr>";
    }

    deathRow =
        "<tr data-role='" +
        role +
        "'  class='deathRow'><th class='deathHeading heading'>Died:</th><td class='DeathDate date'>" +
        dDate +
        "</td><td class='DeathPlace'>" +
        deathPlace +
        "</td></tr>";

    burialRow =
        "<tr data-role='" +
        role +
        "'  class='buriedRow'><th class='buriedHeading heading'>Buried:</th><td class='buriedDate date'>" +
        burialDate +
        "<td class='buriedPlace'>" +
        burialPlace +
        "</td></td></tr>";

    otherMarriageRow = "";

    if (otherSpouses.length == 0) {
        if (fsPerson.Spouse) {
            if (fsPerson.Spouse.length > 1) {
                fsPerson.Spouse.forEach(function (anoSpouse) {
                    if (
                        anoSpouse.Name != window.people[0].Name &&
                        anoSpouse.Name != mainSpouse.Name &&
                        anoSpouse.Name != window.keepSpouse
                    ) {
                        otherSpouses.push(anoSpouse);
                    }
                });
            }
        }
    }

    if (otherSpouses.length > 0) {
        otherSpouses.forEach(function (oSpouse, index) {
            otherSpouseMarriageDate = "";
            otherSpouseName = "";
            otherSpouseMarriageLocation = "";
            otherSpouseNameDate = "";
            otherSpouseMarriageEndDate = "";

            if (isOK(oSpouse.marriage_date)) {
                otherSpouseMarriageDate =
                    "<span class='marriageDate'>" + getDateFormat(oSpouse.marriage_date.split("-")) + "</span>";
            }
            if (isOK(oSpouse.marriage_end_date)) {
                otherSpouseMarriageEndDate =
                    "<span class='marriageEndDate date'>&nbsp;- " +
                    getDateFormat(oSpouse.marriage_end_date.split("-")) +
                    "</span>";
            }
            otherSpouseName = displayName(oSpouse)[0];
            if (isOK(oSpouse.marriage_location)) {
                otherSpouseMarriageLocation = oSpouse.marriage_location;
            }

            otherSpouseData = "data-name='" + htmlEntities(oSpouse.Name) + "'";

            otherSpouseNameDate =
                "<span class='otherSpouseName' " +
                otherSpouseData +
                ">" +
                otherSpouseName.replace(/(“.+”)/, "<span class='nicknames'>$1</span>") +
                "</span>, " +
                "<span class='marriageDate date'>" +
                otherSpouseMarriageDate +
                "</span>" +
                otherSpouseMarriageEndDate;

            oSpousesHeadingText = "";
            if (index == 0) {
                oSpousesHeadingText = "Other Marriage:";
                if (otherSpouses.length > 1) {
                    oSpousesHeadingText = "Other Marriages:";
                }
            }
            otherMarriageRow +=
                "<tr data-person='" +
                htmlEntities(fsPerson.Name) +
                "' data-role='" +
                role +
                "'  class='otherMarriageRow'><th class='otherMarriageHeading heading'>" +
                oSpousesHeadingText +
                "</th><td   class='otherMarriageDate'>" +
                otherSpouseNameDate +
                "</td><td class='otherMarriagePlace'>" +
                otherSpouseMarriageLocation +
                "</td></tr>";
        });
    } else {
        otherMarriageRow =
            "<tr data-role='" +
            role +
            "'  class='otherMarriageRow'><th class='otherMarriageHeading heading'>Other Marriage:</th><td class='otherMarriageDate date editable empty' ></td><td class='otherMarriagePlace empty editable'></td></tr>";
    }

    if (window.keepSpouse) {
        matchingPerson = window.keepSpouse;
    } else {
        matchingPerson = window.people[0].Spouse[0]?.Name;
    }

    parentsRow = "";
    if (mainPerson || fsPerson.Name == matchingPerson) {
        fatherName = "";
        motherName = "";
        fsFather = "";
        fsMother = "";
        if (fsPerson.Parent) {
            if (fsPerson.Parent.length > 0) {
                if (fsPerson.Parent[0].Gender == "Male") {
                    fatherName = displayName(fsPerson.Parent[0])[0].replace(
                        /(“.+”)/,
                        "<span class='nicknames'>$1</span>"
                    );
                    fsFather = fsPerson.Parent[0];
                }
                if (fsPerson.Parent[0].Gender == "Female") {
                    motherName = displayName(fsPerson.Parent[0])[0].replace(
                        /(“.+”)/,
                        "<span class='nicknames'>$1</span>"
                    );
                    fsMother = fsPerson.Parent[0];
                }
            }

            if (fsPerson.Parent.length > 1) {
                if (fsPerson.Parent[1].Gender == "Male") {
                    fatherName = displayName(fsPerson.Parent[1])[0].replace(
                        /(“.+”)/,
                        "<span class='nicknames'>$1</span>"
                    );
                    fsFather = fsPerson.Parent[1];
                }
                if (fsPerson.Parent[1].Gender == "Female") {
                    motherName = displayName(fsPerson.Parent[1])[0].replace(
                        /(“.+”)/,
                        "<span class='nicknames'>$1</span>"
                    );
                    fsMother = fsPerson.Parent[1];
                }
            }
        }

        fsFatherName = "";
        fsMotherName = "";
        fsFatherLink = "" + showRole + "'s Father";
        fsMotherLink = "" + showRole + "'s Mother";
        fsFatherWTID = "";
        fsMotherWTID = "";
        fsFatherDates = "";
        fsMotherDates = "";
        if (fsFather != "") {
            fsFatherName = "data-name='" + htmlEntities(fsFather.Name) + "'";
            fsFatherLink =
                "<a href='https://www.wikitree.com/wiki/" + htmlEntities(fsFather.Name) + "'>" + role + "'s Father</a>";
            fsFatherWTID = "<span class='fsWTID'>(" + htmlEntities(fsFather.Name) + ")</span>";
            fsFatherDates = "<span class='parentDates date'>" + displayDates(fsFather) + "</span>";
        }
        if (fsMother != "") {
            fsMotherName = "data-name='" + htmlEntities(fsMother.Name) + "'";
            fsMotherLink =
                "<a href='https://www.wikitree.com/wiki/" + htmlEntities(fsMother.Name) + "'>" + role + "'s Mother</a>";
            fsMotherWTID = "<span class='fsWTID'>(" + htmlEntities(fsMother.Name) + ")</span>";
            fsMotherDates = "<span class='parentDates date'>" + displayDates(fsMother) + "</span>";
        }

        //	if (mainPerson || window.people[0].Spouse[0].Name = fsPerson.Name){
        //parentsRow = "<tr data-role='"+role+"'  class='"+role+"ParentsRow'><th class='"+role+"FatherHeading heading'>"+fsFatherLink+": </th><td "+fsFatherName+" class='"+role+"Father'><span class='parentName'>"+fatherName+"</span> "+fsFatherWTID+" "+fsFatherDates+"</td><td class='"+role+"Mother' "+fsMotherName+" ><span class='"+role+"MotherHeading heading'>"+fsMotherLink+": </span><span class='parentName'>"+motherName+"</span> "+fsMotherWTID+" "+fsMotherDates+"</td></tr>";

        parentsRow =
            "<tr data-role='" +
            role +
            "'  class='" +
            role +
            "ParentsRow'><th class='" +
            role +
            "FatherHeading heading'>" +
            fsFatherLink +
            ": </th><td colspan='2' " +
            fsFatherName +
            " class='" +
            role +
            "Father'><span class='parentName'>" +
            fatherName +
            "</span> " +
            fsFatherWTID +
            " " +
            fsFatherDates +
            "</td></tr><tr data-role='" +
            role +
            "'  class='" +
            role +
            "ParentsRow'><th class='" +
            role +
            "MotherHeading heading'>" +
            fsMotherLink +
            ": </th><td colspan='2' " +
            fsMotherName +
            " class='" +
            role +
            "Mother'><span class='parentName'>" +
            motherName +
            "</span> " +
            fsMotherWTID +
            " " +
            fsMotherDates +
            "</td></tr>";

        //	}
    }

    theSpouse = "";
    theMarriage = "";
    theMarriageEnd = "";
    theSpouses = [];
    theSpouseName = "";
    spouseRow = "";
    spouseDates = "";
    if (fsPerson.Spouse) {
        if (fsPerson.Spouse.length > 0) {
            fsPerson.Spouse.forEach(function (fsSp, index) {
                theSpouse = displayName(fsSp)[0].replace(/(“.+”)/, "<span class='nicknames'>$1</span>");
                if (isOK(fsSp.marriage_date)) {
                    theMarriage =
                        "<span class='marriageDate date'>" + getDateFormat(fsSp.marriage_date.split("-")) + "</span>";
                }
                if (isOK(fsSp.marriage_end_date)) {
                    theMarriageEnd =
                        "<span class='marriageDate date'> - " +
                        getDateFormat(fsSp.marriage_end_date.split("-")) +
                        "</span>";
                }
                //console.log(theSpouse,fsSp.marriage_date);
                theSpouseName = "data-name='" + htmlEntities(fsSp.Name) + "'";
                spouseHeading = "";
                mClass = "hidden";
                if (index == 0) {
                    mClass = "";
                    spouseHeading = "Spouse:";
                    if (fsPerson.Spouse.length > 1) {
                        spouseHeading = "Spouses:";
                    }
                }
                spouseRow +=
                    "<tr data-person='" +
                    htmlEntities(fsPerson.Name) +
                    "' data-role='" +
                    role +
                    "'  class='spouseRow'><th class='spouseHeading heading'>" +
                    spouseHeading +
                    " </th><td class='spouseName' " +
                    theSpouseName +
                    ">" +
                    theSpouse +
                    " <span class='spouseDates date'>" +
                    displayDates(fsSp) +
                    "</span></td><td class='dateOfMarriage'><span class='dateOfMarriageHeading heading " +
                    mClass +
                    "'>Date of Marriage: </span><span class='marriageDate date'>" +
                    theMarriage +
                    theMarriageEnd +
                    "</span></td></tr>";
            });
        } else {
            spouseRow +=
                "<tr data-role='" +
                role +
                "'  class='spouseRow'><th class='spouseHeading heading'>Spouse: </th><td class='spouseName'></td><td class='dateOfMarriage'><span class='dateOfMarriageHeading heading'>Date of Marriage: </span><span class='marriageDate date'></span></td></tr>";
        }
    }

    bioRow = "";
    if (fsPerson.bioHTML) {
        abioHTML = fsPerson.bioHTML.split('<a name="Sources"></a>')[0];

        rNotesSplit = abioHTML.split(/<h2.*?research note.*?h2>/i);
        if (rNotesSplit[1]) {
            window.researchNotes.push([fsPerson.Name, displayName(fsPerson)[0], rNotesSplit[1]]);
        }
        abioHTML = rNotesSplit[0];

        bioRow =
            "<tr data-role='" +
            role +
            "'  class='bioRow'><th class='bioHeading heading'>Biography: </th><td colspan='2'><div class='theBio'>" +
            abioHTML
                .replace(/<h2>.*?<\/h2>/, "")
                .trim()
                .replaceAll(/(src|href)="\//g, '$1="https://www.wikitree.com/')
                .replaceAll(/href="#_/g, 'href="https://www.wikitree.com/wiki/' + fsPerson.Name + "#_") +
            "</div></td></tr>";
    }

    if (role == "Husband" || role == "Wife") {
        //if (role=="Wife"){marriageRow = "";}
        return (
            roleRow +
            birthRow +
            baptismRow +
            marriageRow +
            deathRow +
            burialRow +
            otherMarriageRow +
            parentsRow +
            bioRow
        );
    } else {
        return roleRow + birthRow + baptismRow + deathRow + burialRow + spouseRow + bioRow;
    }
}

// Array to store references
const references = [];

/**
 * Function to handle the person's family sheet
 * @param {Object} fsPerson - Object containing family sheet person's data
 * @param {string} role - Role of the person (e.g. Husband, Wife)
 * @returns {string} - HTML string for the family sheet
 */
const familySheetPerson = (fsPerson, role) => {
    // Initialize variables
    let baptismDate = "";
    let baptismPlace = "";
    let burialDate = "";
    let burialPlace = "";
    const myRefs = [];
    const mSeeAlso = [];

    // Get the biography HTML and parse it
    const fsBio = fsPerson.bio;
    const bioDummy = document.createElement("html");
    bioDummy.innerHTML = fsBio;

    // Extract references from the biography
    bioDummy.querySelectorAll("ref").forEach((aRef) => {
        if (!$(aRef).find("references").length) {
            myRefs.push(aRef.textContent.replace(/^\*/, "").trim());
        }
    });

    // Further processing of the biography
    if (fsBio) {
        bioSplit = fsBio.split("<references />");
        if (bioSplit[1]) {
            removedAck = bioSplit[1].split(/=+\s?Acknowledge?ments?\s?=+/)[0];
            seeAlsoSplit = removedAck.split(/See also:/i);
            if (seeAlsoSplit[1]) {
                seeAlsoSplit2 = seeAlsoSplit[1].split(/\*/g);
                seeAlsoSplit2.forEach(function (aSeeAlso, ind) {
                    if (aSeeAlso != "\n" && aSeeAlso.trim() != "") {
                        mSeeAlso.push(aSeeAlso.replace(/^\*/, "").trim());
                    }
                });
            }
            citations = seeAlsoSplit[0].split(/\*/g);
            citations.forEach(function (aCit, index) {
                //console.log(aCit);

                if (citations[index + 1]) {
                    /*
                          if (citations[index+1].match(/^\* /)==null){
                              aCit = aCit+citations[index+1];
                              citations.splice(index+1,1);
                          }
                          */
                }
                if (aCit != "\n" && aCit.trim() != "") {
                    myRefs.push(aCit.replace(/^\*/, "").trim());
                }
            });
        }
        categoryMatch = bioSplit[0].match(/\[\[Category:.*?\]\]/g);
        if (categoryMatch != null) {
            //console.log(categoryMatch);
            categoryMatch.forEach(function (aCat) {
                //console.log(fsPerson.Name,aCat);
                dCat = aCat.split("Category:")[1].replace(/\]\]/, "");
                if (
                    dCat.match(
                        /(Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Grave)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)/i
                    ) != null &&
                    dCat.match("Crawford-7109") == null
                ) {
                    fsPerson.Cemetery = dCat.trim();
                    //console.log(fsPerson.Cemetery);
                }
            });
        }
        eventMatch = bioSplit[0].match(/\{\{Event[^]*?\}\}/gm);
        //console.log(eventMatch);
        if (eventMatch != null) {
            //console.log(eventMatch);
            eventMatch.forEach(function (anEvent) {
                //console.log(anEvent);
                if (anEvent.match(/type=(Baptism|Christening)/i) != null) {
                    eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                    eBits.forEach(function (anBit) {
                        anBit = anBit.replace(/<ref.*?>/, "");
                        anBitBits = anBit.split("=");
                        //console.log(anBitBits);
                        if (anBitBits[0] + " ".trim() == "date") {
                            baptismDate = anBitBits[1] + " ".trim();
                        }
                        if (anBitBits[0] + " ".trim() == "location") {
                            baptismPlace = anBitBits[1] + " ".trim();
                        }
                    });
                }
                if (anEvent.match(/type=Burial/i) != null) {
                    eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                    eBits.forEach(function (anBit) {
                        anBit = anBit.replace(/<ref.*?>/, "");
                        anBitBits = anBit.split("=");
                        //console.log(anBitBits);
                        if (anBitBits[0] + " ".trim() == "date") {
                            burialDate = anBitBits[1] + " ".trim();
                        }
                        if (anBitBits[0] + " ".trim() == "location") {
                            burialPlace = anBitBits[1] + " ".trim();
                        }
                    });
                }
            });
        }
    }

    // Store references
    references.push([fsPerson.Name, myRefs, mSeeAlso]);

    // Check if value is OK (not null or undefined)
    const isOK = (value) => value !== null && value !== undefined;

    // Extract data for rendering HTML
    const { birthDate, birthPlace, deathDate, deathPlace } = fsPerson;

    const roleRow = renderRoleRow(fsPerson, role);
    const birthRow = renderBirthRow(fsPerson, role, isOK);
    const deathRow = renderDeathRow(fsPerson, role, isOK);
    const baptismRow = renderBaptismRow(fsPerson, role);
    const marriageRow = renderMarriageRow(fsPerson, role);
    const burialRow = renderBurialRow(fsPerson, role);
    const otherMarriageRow = renderOtherMarriageRow(fsPerson, mainSpouse, otherSpouses, role);
    const parentsRow = renderParentsRow(fsPerson, role, mainPerson, matchingPerson);
    const spouseRow = renderSpouseRow(fsPerson, role);
    const bioRow = renderBioRow(fsPerson, role);
    // Return the final HTML based on the role
    if (role === "Husband" || role === "Wife") {
        return `${roleRow}${birthRow}${baptismRow}${marriageRow}${deathRow}${burialRow}${otherMarriageRow}${parentsRow}${bioRow}`;
    } else {
        return `${roleRow}${birthRow}${baptismRow}${deathRow}${burialRow}${spouseRow}${bioRow}`;
    }
};

/**
 * Render Role Row
 * @param {Object} fsPerson
 * @param {string} role
 * @returns {string} - HTML string for role row
 */
const renderRoleRow = (fsPerson, role) => {
    const roleRow = `<tr><td class="role" colspan="2">${role}</td></tr>`;
    return roleRow;
};

/**
 * Render Birth Row
 * @param {string} birthDate
 * @param {string} birthPlace
 * @param {string} role
 * @param {Function} isOK
 * @returns {string} - HTML string for birth row
 */
const renderBirthRow = (birthDate, birthPlace, role, isOK) => {
    const birthRow =
        isOK(birthDate) || isOK(birthPlace)
            ? `<tr><td class="${role.toLowerCase()} birth">Born:</td><td>${birthDate}, ${birthPlace}</td></tr>`
            : "";
    return birthRow;
};

/**
 * Render Death Row
 * @param {string} deathDate
 * @param {string} deathPlace
 * @param {string} role
 * @param {Function} isOK
 * @returns {string} - HTML string for death row
 */
const renderDeathRow = (deathDate, deathPlace, role, isOK) => {
    const deathRow =
        isOK(deathDate) || isOK(deathPlace)
            ? `<tr><td class="${role.toLowerCase()} death">Died:</td><td>${deathDate}, ${deathPlace}</td></tr>`
            : "";
    return deathRow;
};

// ... [other render functions]
/*
    baptismRow =
        "<tr  data-role='" +
        role +
        "' class='baptismRow'><th class='baptismHeading heading'>Baptized:</th><td class='BaptismDate date'>" +
        baptismDate +
        "</td><td class='BaptismPlace'>" +
        baptismPlace +
        "</td></tr>";
        */
const renderBaptismRow = (baptismDate, baptismPlace, role, isOK) => {
    const baptismRow =
        isOK(baptismDate) || isOK(baptismPlace)
            ? `<tr><td class="${role.toLowerCase()} baptism">Baptized:</td><td>${baptismDate}, ${baptismPlace}</td></tr>`
            : "";
    return baptismRow;
};

/*

marriageRow = "";
    mainSpouseMarriageDate = "";
    mainSpouseMarriagePlace = "";
    mainSpouseMarriageEndDate = "";
    if (mainSpouse != "") {
        if (isOK(mainSpouse.marriage_date)) {
            mainSpouseMarriageDate =
                "<span class='marriageDate date'>" + getDateFormat(mainSpouse.marriage_date.split("-")) + "</span>";
        }
        if (isOK(mainSpouse.marriage_end_date)) {
            mainSpouseMarriageEndDate =
                "<span class='marriageEndDate date'>&nbsp;- " +
                getDateFormat(mainSpouse.marriage_end_date.split("-")) +
                "</span>";
        }
        if (isOK(mainSpouse.marriage_location)) {
            mainSpouseMarriagePlace = mainSpouse.marriage_location;
        }
    }
    if (role == "Husband" || role == "Wife") {
        //console.log(window);
        marriageRow =
            "<tr  data-role='" +
            role +
            "' class='marriedRow'><th class='marriedHeading heading'>Married:</th><td>" +
            mainSpouseMarriageDate +
            mainSpouseMarriageEndDate +
            "</td><td class='marriedPlace'>" +
            mainSpouseMarriagePlace +
            "</td></tr>";
    }

    */
const renderMarriageRow = (marriageDate, marriagePlace, role, isOK) => {
    const marriageRow =
        isOK(marriageDate) || isOK(marriagePlace)
            ? `<tr><td class="${role.toLowerCase()} marriage">Married:</td><td>${marriageDate}, ${marriagePlace}</td></tr>`
            : "";
    return marriageRow;
};
/*
    burialRow =
        "<tr data-role='" +
        role +
        "'  class='buriedRow'><th class='buriedHeading heading'>Buried:</th><td class='buriedDate date'>" +
        burialDate +
        "<td class='buriedPlace'>" +
        burialPlace +
        "</td></td></tr>";
*/
const renderBurialRow = (burialDate, burialPlace, role, isOK) => {
    const burialRow =
        isOK(burialDate) || isOK(burialPlace)
            ? `<tr><td class="${role.toLowerCase()} burial">Buried:</td><td>${burialDate}, ${burialPlace}</td></tr>`
            : "";
    return burialRow;
};

/*

otherMarriageRow = "";

    if (otherSpouses.length == 0) {
        if (fsPerson.Spouse) {
            if (fsPerson.Spouse.length > 1) {
                fsPerson.Spouse.forEach(function (anoSpouse) {
                    if (
                        anoSpouse.Name != window.people[0].Name &&
                        anoSpouse.Name != mainSpouse.Name &&
                        anoSpouse.Name != window.keepSpouse
                    ) {
                        otherSpouses.push(anoSpouse);
                    }
                });
            }
        }
    }

    if (otherSpouses.length > 0) {
        otherSpouses.forEach(function (oSpouse, index) {
            otherSpouseMarriageDate = "";
            otherSpouseName = "";
            otherSpouseMarriageLocation = "";
            otherSpouseNameDate = "";
            otherSpouseMarriageEndDate = "";

            if (isOK(oSpouse.marriage_date)) {
                otherSpouseMarriageDate =
                    "<span class='marriageDate'>" + getDateFormat(oSpouse.marriage_date.split("-")) + "</span>";
            }
            if (isOK(oSpouse.marriage_end_date)) {
                otherSpouseMarriageEndDate =
                    "<span class='marriageEndDate date'>&nbsp;- " +
                    getDateFormat(oSpouse.marriage_end_date.split("-")) +
                    "</span>";
            }
            otherSpouseName = displayName(oSpouse)[0];
            if (isOK(oSpouse.marriage_location)) {
                otherSpouseMarriageLocation = oSpouse.marriage_location;
            }

            otherSpouseData = "data-name='" + htmlEntities(oSpouse.Name) + "'";

            otherSpouseNameDate =
                "<span class='otherSpouseName' " +
                otherSpouseData +
                ">" +
                otherSpouseName.replace(/(“.+”)/, "<span class='nicknames'>$1</span>") +
                "</span>, " +
                "<span class='marriageDate date'>" +
                otherSpouseMarriageDate +
                "</span>" +
                otherSpouseMarriageEndDate;

            oSpousesHeadingText = "";
            if (index == 0) {
                oSpousesHeadingText = "Other Marriage:";
                if (otherSpouses.length > 1) {
                    oSpousesHeadingText = "Other Marriages:";
                }
            }
            otherMarriageRow +=
                "<tr data-person='" +
                htmlEntities(fsPerson.Name) +
                "' data-role='" +
                role +
                "'  class='otherMarriageRow'><th class='otherMarriageHeading heading'>" +
                oSpousesHeadingText +
                "</th><td   class='otherMarriageDate'>" +
                otherSpouseNameDate +
                "</td><td class='otherMarriagePlace'>" +
                otherSpouseMarriageLocation +
                "</td></tr>";
        });
    } else {
        otherMarriageRow =
            "<tr data-role='" +
            role +
            "'  class='otherMarriageRow'><th class='otherMarriageHeading heading'>Other Marriage:</th><td class='otherMarriageDate date editable empty' ></td><td class='otherMarriagePlace empty editable'></td></tr>";
    }

*/

/**
 * Render other marriage row
 * @param {Object} fsPerson - Object containing the family sheet person's data
 * @param {Array} otherSpouses - Array of other spouses
 * @param {string} role - Role of the person (e.g. Husband, Wife)
 * @returns {string} - HTML string for the other marriage row
 */
const renderOtherMarriageRow = (fsPerson, otherSpouses, role) => {
    let otherMarriageRow = "";

    // Check if value is OK (not null or undefined)
    const isOK = (value) => value !== null && value !== undefined;

    if (otherSpouses.length === 0 && fsPerson.Spouse && fsPerson.Spouse.length > 1) {
        otherSpouses.push(
            ...fsPerson.Spouse.filter(
                (anoSpouse) =>
                    anoSpouse.Name !== window.people[0].Name &&
                    anoSpouse.Name !== mainSpouse.Name &&
                    anoSpouse.Name !== window.keepSpouse
            )
        );
    }

    if (otherSpouses.length > 0) {
        otherSpouses.forEach((oSpouse, index) => {
            const { marriage_date, marriage_end_date, marriage_location, Name } = oSpouse;
            let otherSpouseMarriageDate = isOK(marriage_date)
                ? `<span class='marriageDate'>${getDateFormat(marriage_date.split("-"))}</span>`
                : "";
            let otherSpouseMarriageEndDate = isOK(marriage_end_date)
                ? `<span class='marriageEndDate date'>&nbsp;- ${getDateFormat(marriage_end_date.split("-"))}</span>`
                : "";
            let otherSpouseName = displayName(oSpouse)[0];
            let otherSpouseMarriageLocation = isOK(marriage_location) ? marriage_location : "";

            const oSpousesHeadingText =
                index === 0 ? (otherSpouses.length > 1 ? "Other Marriages:" : "Other Marriage:") : "";

            otherMarriageRow += `
                <tr data-person='${htmlEntities(fsPerson.Name)}' data-role='${role}' class='otherMarriageRow'>
                    <th class='otherMarriageHeading heading'>${oSpousesHeadingText}</th>
                    <td class='otherMarriageDate'>
                        <span class='otherSpouseName' data-name='${htmlEntities(Name)}'>${otherSpouseName.replace(
                /(“.+”)/,
                "<span class='nicknames'>$1</span>"
            )}</span>,
                        <span class='marriageDate date'>${otherSpouseMarriageDate}</span>${otherSpouseMarriageEndDate}
                    </td>
                    <td class='otherMarriagePlace'>${otherSpouseMarriageLocation}</td>
                </tr>`;
        });
    } else {
        otherMarriageRow = `
            <tr data-role='${role}' class='otherMarriageRow'>
                <th class='otherMarriageHeading heading'>Other Marriage:</th>
                <td class='otherMarriageDate date editable empty'></td>
                <td class='otherMarriagePlace empty editable'></td>
            </tr>`;
    }

    return otherMarriageRow;
};

let matchingPerson = "";
if (window.keepSpouse) {
    matchingPerson = window.keepSpouse;
} else {
    matchingPerson = window.people[0].Spouse[0]?.Name;
}

/**
 * Render parents row
 * @param {Object} fsPerson - Object containing the family sheet person's data
 * @param {boolean} mainPerson - Boolean indicating if the person is the main person
 * @param {string} matchingPerson - The name of the person to match
 * @param {string} role - Role of the person (e.g. Husband, Wife)
 * @param {string} showRole - The role to display (can be different from role parameter)
 * @returns {string} - HTML string for the parents row
 */
const renderParentsRow = (fsPerson, mainPerson, matchingPerson, role, showRole) => {
    let parentsRow = "";

    if (mainPerson || fsPerson.Name === matchingPerson) {
        let fatherName = "";
        let motherName = "";
        let fsFather = null;
        let fsMother = null;

        if (fsPerson.Parent && fsPerson.Parent.length > 0) {
            fsPerson.Parent.forEach((parent) => {
                const nameWithNicknames = displayName(parent)[0].replace(/(“.+”)/, "<span class='nicknames'>$1</span>");
                if (parent.Gender === "Male") {
                    fatherName = nameWithNicknames;
                    fsFather = parent;
                } else if (parent.Gender === "Female") {
                    motherName = nameWithNicknames;
                    fsMother = parent;
                }
            });
        }

        const fsFatherName = fsFather ? `data-name='${htmlEntities(fsFather.Name)}'` : "";
        const fsMotherName = fsMother ? `data-name='${htmlEntities(fsMother.Name)}'` : "";

        const fsFatherLink = fsFather
            ? `<a href='https://www.wikitree.com/wiki/${htmlEntities(fsFather.Name)}'>${role}'s Father</a>`
            : `${showRole}'s Father`;
        const fsMotherLink = fsMother
            ? `<a href='https://www.wikitree.com/wiki/${htmlEntities(fsMother.Name)}'>${role}'s Mother</a>`
            : `${showRole}'s Mother`;

        const fsFatherWTID = fsFather ? `<span class='fsWTID'>(${htmlEntities(fsFather.Name)})</span>` : "";
        const fsMotherWTID = fsMother ? `<span class='fsWTID'>(${htmlEntities(fsMother.Name)})</span>` : "";

        const fsFatherDates = fsFather ? `<span class='parentDates date'>${displayDates(fsFather)}</span>` : "";
        const fsMotherDates = fsMother ? `<span class='parentDates date'>${displayDates(fsMother)}</span>` : "";

        parentsRow = `
            <tr data-role='${role}' class='${role}ParentsRow'>
                <th class='${role}FatherHeading heading'>${fsFatherLink}: </th>
                <td colspan='2' ${fsFatherName} class='${role}Father'>
                    <span class='parentName'>${fatherName}</span> ${fsFatherWTID} ${fsFatherDates}
                </td>
            </tr>
            <tr data-role='${role}' class='${role}ParentsRow'>
                <th class='${role}MotherHeading heading'>${fsMotherLink}: </th>
                <td colspan='2' ${fsMotherName} class='${role}Mother'>
                    <span class='parentName'>${motherName}</span> ${fsMotherWTID} ${fsMotherDates}
                </td>
            </tr>`;
    }

    return parentsRow;
};

/**
 * Render spouse row
 * @param {Object} fsPerson - Object containing the family sheet person's data
 * @param {string} role - Role of the person (e.g. Husband, Wife)
 * @returns {string} - HTML string for the spouse row
 */
const renderSpouseRow = (fsPerson, role) => {
    let spouseRow = "";

    if (fsPerson.Spouse) {
        if (fsPerson.Spouse.length > 0) {
            fsPerson.Spouse.forEach((fsSp, index) => {
                const theSpouse = displayName(fsSp)[0].replace(/(“.+”)/, "<span class='nicknames'>$1</span>");
                let theMarriage = isOK(fsSp.marriage_date)
                    ? `<span class='marriageDate date'>${getDateFormat(fsSp.marriage_date.split("-"))}</span>`
                    : "";

                let theMarriageEnd = isOK(fsSp.marriage_end_date)
                    ? `<span class='marriageDate date'> - ${getDateFormat(fsSp.marriage_end_date.split("-"))}</span>`
                    : "";

                const theSpouseName = `data-name='${htmlEntities(fsSp.Name)}'`;

                let spouseHeading = "";
                let mClass = "hidden";
                if (index === 0) {
                    mClass = "";
                    spouseHeading = fsPerson.Spouse.length > 1 ? "Spouses:" : "Spouse:";
                }

                spouseRow += `
                    <tr data-person='${htmlEntities(fsPerson.Name)}' data-role='${role}' class='spouseRow'>
                        <th class='spouseHeading heading'>${spouseHeading} </th>
                        <td class='spouseName' ${theSpouseName}>${theSpouse} 
                            <span class='spouseDates date'>${displayDates(fsSp)}</span>
                        </td>
                        <td class='dateOfMarriage'>
                            <span class='dateOfMarriageHeading heading ${mClass}'>Date of Marriage: </span>
                            <span class='marriageDate date'>${theMarriage}${theMarriageEnd}</span>
                        </td>
                    </tr>`;
            });
        } else {
            spouseRow += `
                <tr data-role='${role}' class='spouseRow'>
                    <th class='spouseHeading heading'>Spouse: </th>
                    <td class='spouseName'></td>
                    <td class='dateOfMarriage'>
                        <span class='dateOfMarriageHeading heading'>Date of Marriage: </span>
                        <span class='marriageDate date'></span>
                    </td>
                </tr>`;
        }
    }

    return spouseRow;
};

/**
 * Render biography row
 * @param {Object} fsPerson - Object containing the family sheet person's data
 * @param {string} role - Role of the person (e.g. Husband, Wife)
 * @returns {string} - HTML string for the biography row
 */
const renderBioRow = (fsPerson, role) => {
    let bioRow = "";

    if (fsPerson.bioHTML) {
        // Split the bioHTML to separate out the main content and research notes
        let [mainBio, researchNotes] = fsPerson.bioHTML.split('<a name="Sources"></a>');

        // Handle research notes if they exist
        const rNotesSplit = mainBio.split(/<h2.*?research note.*?h2>/i);
        if (rNotesSplit[1]) {
            window.researchNotes.push([fsPerson.Name, displayName(fsPerson)[0], rNotesSplit[1]]);
        }
        mainBio = rNotesSplit[0];

        // Prepare the bio row HTML
        bioRow = `
            <tr data-role='${role}' class='bioRow'>
                <th class='bioHeading heading'>Biography: </th>
                <td colspan='2'>
                    <div class='theBio'>${mainBio
                        .replace(/<h2>.*?<\/h2>/, "")
                        .trim()
                        .replaceAll(/(src|href)="\//g, '$1="https://www.wikitree.com/')
                        .replaceAll(/href="#_/g, `href="https://www.wikitree.com/wiki/${fsPerson.Name}#_"`)}
                    </div>
                </td>
            </tr>`;
    }

    return bioRow;
};

/**
 * Store the value of a checkbox or radio button to localStorage.
 *
 * @param {jQuery} jq - The jQuery object representing the checkbox or radio button.
 */
function storeVal(jq) {
    const id = jq.attr("id");
    const type = jq.attr("type");
    const name = jq.attr("name");

    // Handle checkboxes
    if (type === "checkbox") {
        const isChecked = jq.prop("checked");
        localStorage.setItem(id, isChecked ? 1 : 0);
    }
    // Handle radio buttons
    else if (type === "radio") {
        $("input[name='" + name + "']").each(function () {
            const radio = $(this);
            if (radio.prop("checked")) {
                localStorage.setItem(name, radio.val());
            }
        });
    }
}

/**
 * Set the state of checkboxes and radio buttons based on the values stored in localStorage.
 */
function setVals() {
    // Handle checkboxes
    const checkboxes = $("#fgsOptions input[type='checkbox']");
    checkboxes.each(function () {
        const checkbox = $(this);
        const id = checkbox.attr("id");
        const originalState = checkbox.prop("checked");

        // Check if localStorage has a value for this checkbox
        if (localStorage[id] !== undefined) {
            const newState = localStorage[id] === "1";
            checkbox.prop("checked", newState);

            // Trigger change event if state changed
            if (newState !== originalState) {
                checkbox.change();
            }
        }
    });

    // Handle radio buttons
    const radios = $("#fgsOptions input[type='radio']");
    radios.each(function () {
        const radio = $(this);
        const name = radio.attr("name");
        const originalState = radio.prop("checked");

        // Check if localStorage has a value for this radio group
        if (localStorage[name] !== undefined) {
            const newState = localStorage[name] === radio.val();
            radio.prop("checked", newState);

            // Trigger change event if state changed
            if (newState !== originalState) {
                radio.change();
            }
        }
    });
}

function privateQ() {
    $("body").append("<div id='privateQ'><p>Is this a private profile?</p><p>Maybe you need to log in?</p></div>");
}
function isLeapYear(year) {
    return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
}
/*
  function getDayFromDate(aDate){
      dYear = ""; dMonth=""; dDate ="";
      if (aDate.match(/[A-z]/)==null){
          return false;
      }
      else {
          aDateBits = aDate.split(" ");
          if (!aDateBits[2]){
              return false;
          }
          else {
              aDateBits.forEach(function(dBit){
                  if (dBit.match(/[0-9]{4}/)!=null){
                      dYear = dBit;
                  }
                  else if(dBit.match(/[A-Z]/)!=null){
                      dMonth = dBit;
                  }
                  else {
                      dDate = dBit;
                  }
              })
              monthKeys = [1,4,4,0,2,5,0,3,6,1,4,6];
              sMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              sMonths.forEach(function(aMonth,i){
                  if (dMonth.indexOf(aMonth)!=-1){
                      mKey = monthKeys[i];
                  }
              })
              leapYear=0;
              if (isLeapYear(dYear)){
                  leapYear = 1;
              }
              century = dYear.substring(0, 2);
              take = floor(parseInt(dYear.slice(-2))/4)+parseInt(dDate)+mKey-leapYear;
              
          }
      }
      
  Take the last two digits of the year.
  Divide by 4, discarding any fraction.
  Add the day of the month.
  Add the month's key value: JFM AMJ JAS OND 144 025 036 146
  Subtract 1 for January or February of a leap year.
  For a Gregorian date, add 0 for 1900's, 6 for 2000's, 4 for 1700's, 2 for 1800's; for other years, add or subtract multiples of 400.
  For a Julian date, add 1 for 1700's, and 1 for every additional century you go back.
  Add the last two digits of the year.
  Divide by 7 and take the remainder.
      
  }
  */

/**
 * Checks for children in a family, and if found, appends them to the family sheet table.
 * @param {Array} oChildren - List of children.
 */
function checkAndAppendChildren(oChildren) {
    if (oChildren.length > 0) {
        window.people[0].Child.forEach((aChild, index) => {
            window.people.forEach((cPerson) => {
                // Initialize husband and wife if undefined
                window.husband = window.husband || 0;
                window.wife = window.wife || 0;

                // Check for matching child and parent relationship
                if (
                    cPerson.Name === aChild.Name &&
                    ((cPerson.Father === window.husband && cPerson.Mother === window.wife) ||
                        (!window.husband && cPerson.Mother === window.wife) ||
                        (window.husband === cPerson.Father && !window.wife))
                ) {
                    // Check if child is already processed
                    if (!doneKids.includes(aChild.Name)) {
                        const theChildRow = familySheetPerson(cPerson, ordinal(index + 1) + " Child");
                        fsTable.find("> tbody").append($(theChildRow));
                        doneKids.push(cPerson.Name);
                    }
                }
            });
        });
    }
}

function makeFamilySheet() {
    window.references = [];
    window.researchNotes = [];
    fsTable = $(
        "<table id='familySheetFormTable'><thead><tr><th></th><th>Name and/or Date</th><th>Place</th></tr></thead><tbody></tbody></table>"
    );
    mainRole = "Wife";
    spouseRole = "Husband";
    if (window.people[0].Gender == "Male") {
        mainRole = "Husband";
        spouseRole = "Wife";
        fsTable.attr("data-husband", window.people[0].Name);
    } else {
        fsTable.attr("data-wife", window.people[0].Name);
    }
    mainRow = familySheetPerson(window.people[0], mainRole);

    if (window.keepSpouse) {
        matchPerson = window.keepSpouse;
    } else {
        matchPerson = window.people[0]?.Spouse[0]?.Name;
    }
    window.people.forEach(function (aPerson) {
        if (aPerson.Name == matchPerson) {
            theSpouse = aPerson;
        }
    });
    spouseRow = familySheetPerson(theSpouse, spouseRole);

    fsTable.find("> tbody").append($(mainRow), $(spouseRow));

    oChildren = window.people[0].Child;
    if (oChildren.length > 0) {
        oChildren.sort((a, b) =>
            a.BirthDate + "-".replaceAll(/\-/g, "") > b.BirthDate + "-".replaceAll(/\-/g, "") ? 1 : -1
        );
    }
    doneKids = [];
    checkAndAppendChildren(oChildren);

    $("#tree").slideUp();

    if (window.people[0].Name == undefined) {
        privateQ();
    } else {
        // Everything's OK!
        if (localStorage.fgsOptionsState == "removed") {
            $("#fgsOptions").addClass("removed");
        }
        $("#fgsOptions").slideDown();
        $("body").append(fsTable);
        if (localStorage.husbandFirst == "1") {
            $("tr[data-role='Husband']").prependTo($("#familySheetFormTable > tbody"));
        }

        clonedRow = "";
        $(".marriedRow").each(function () {
            if ($(this).text() != "Married:") {
                clonedRow = $(this); //.clone(true)
                //	console.log(clonedRow.text());
            }
        });
        if (clonedRow == "") {
            clonedRow = $(".marriedRow").eq(0); //.clone(true);
        }
        //console.log(clonedRow.text());

        //$(".marriedRow").remove();

        if (
            $("tr.roleRow[data-role='Wife']").attr("data-name") == $("#wtid").val() &&
            localStorage.husbandFirst != "1"
        ) {
            clonedRow.insertBefore($("tr.roleRow[data-role='Husband']"));
        } else {
            clonedRow.insertBefore($("tr.roleRow[data-role='Wife']"));
            if ($("tr[data-role='Husband'].marriedRow").length == 2) {
                $("tr[data-role='Husband'].marriedRow").eq(1).remove();
            }
            //				$("tr[data-role='Husband'].marriedRow").remove();
        }

        $("#h1Text").remove();
        husbandName = "";
        wifeName = "";
        andText = "";
        if ($("tr.roleRow[data-role='Husband'] td.fsName").length) {
            husbandName = $("tr.roleRow[data-role='Husband'] td.fsName").eq(0).html();
            if (
                $("tr.roleRow[data-role='Husband'] td.fsName")
                    .eq(0)
                    .text()
                    .match(/[A-z0-9]/) == null
            ) {
                husbandName = "";
            }
        }
        if ($("tr.roleRow[data-role='Wife'] td.fsName").length) {
            wifeName = $("tr.roleRow[data-role='Wife'] td.fsName").html();
            if ($("tr.roleRow[data-role='Wife'] td.fsName").eq(0).text() + " ".trim() == "") {
                wifeName = "";
            }
        }
        if (husbandName != "" && wifeName.match(/^\W*?$/) == null) {
            //console.log("|"+husbandName+"|"+wifeName+"|");
            andText = "&nbsp;and&nbsp;";
        }
        coupleText = husbandName + andText + wifeName;
        husbandNameSpan = $("<span>" + husbandName + "</span>");
        wifeNameSpan = $("<span>" + wifeName + "</span>");
        andSpan = $("<span>" + andText + "</span>");

        if (husbandName.match(/^\W*$/) != null || wifeName.match(/^\W*$/) != null) {
            $("tr.marriedRow").remove();
        }

        if ($("#familySheetFormTable caption").length == 0) {
            $("#familySheetFormTable").prepend($("<caption></caption>"));
        }

        $("#familySheetFormTable caption").append(husbandNameSpan, andSpan, wifeNameSpan);

        $("title").text(
            "Family Group: " +
                coupleText
                    .replaceAll(/&nbsp;/g, " ")
                    .replaceAll(/<span.*?>(.*?)<\/span>/g, "$1")
                    .replaceAll(/<a.+?>(.+?)<\/a>/g, "$1")
        );

        notesAndSources = $("<section id='notesAndSources'></section>");
        $("<div id='notes'><h2>Research Notes:</h2><div id='notesNotes'></div></div>").appendTo(notesAndSources);

        //console.log(window.researchNotes);
        if (window.researchNotes.length > 0) {
            window.researchNotes.forEach(function (rNote) {
                //	console.log(rNote);
                if (rNote[2].replace(/[\n\W\s]/, "") != "") {
                    notesAndSources
                        .find("#notesNotes")
                        .append(
                            $(
                                "<a class='sourcesName' href='https://www.wikitree.com/wiki/" +
                                    rNote[0] +
                                    "'>" +
                                    rNote[1] +
                                    " <span class='fsWTID'>(" +
                                    rNote[0] +
                                    ")</span></a>"
                            )
                        );
                    notesAndSources.find("#notesNotes").append($(rNote[2].replaceAll(/<sup.*?<\/sup>/g, "")));
                }
            });
        }

        if ($("#familySheetFormTable").length) {
            setWidth = $("#familySheetFormTable")[0].scrollWidth;
        } else if ($(".tablecontainer.husband table").length) {
            setWidth = $(".tablecontainer.husband table")[0].scrollWidth;
        } else {
            setWidth = $(".tablecontainer.wife table")[0].scrollWidth;
        }

        $("<div id='sources'><h2>Sources:</h2></div>").appendTo(notesAndSources);
        notesAndSources.appendTo($("body"));
        notesAndSources.css({ "max-width": setWidth, "width": setWidth });
        $("#familySheetFormTable").css({ "max-width": setWidth, "min-width": setWidth, "width": setWidth });
        mList = $("<ul id='citationList'></ul>");

        window.citationTables = [];

        //

        /**
         * Fixes a citation text by converting various citation templates to HTML.
         * @param {string} citation - The citation text to be fixed.
         * @returns {string} - The fixed citation.
         */
        function fixCitation(citation) {
            // Find all tables and lists in the citation
            const tableMatches = Array.from(citation.matchAll(/\{\|[^]+?\|\}/gm));
            const listMatches = Array.from(citation.matchAll(/\n:+[A-z]+.*/gm));

            // Process lists
            let madeList = false;
            if (listMatches.length > 0) {
                let aList = "\n<ul class='sourceUL'>\n";
                for (const lMatch of listMatches) {
                    aList += `<li>${lMatch[0].replace(/\n:+/, "")}</li>\n`;
                    madeList = true;
                }
                aList += "</ul>\n";
                if (madeList) {
                    citation += aList;
                    citation = citation.replace(/\n:+[A-z]+.*/gm, "");
                }
            }

            // Process tables
            if (tableMatches.length > 0) {
                const newTables = [];
                for (const aMatch of tableMatches) {
                    let aTable = `<table class='citationTable' id='citationTable_${window.citationTables.length}'>`;
                    const lines = Array.from(
                        aMatch[0].matchAll(
                            /[|!](.*?)\|\|(.*?)(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?\n/g
                        )
                    );

                    for (const line of lines) {
                        let aTableRow = "<tr>";
                        for (let i = 1; i < 10; i++) {
                            if (line[i] !== undefined) {
                                aTableRow += `<td>${line[i].replace("||", "")}</td>`;
                            }
                        }
                        aTableRow += "</tr>\n";
                        aTable += aTableRow;
                    }
                    aTable += "</table>";
                    newTables.push(aTable);
                    const newMatch = aMatch[0].replace(/([!|{}()\-.\[\]])/g, "\\$1");
                    citation = citation.replace(new RegExp(newMatch, "m"), aTable);
                }
                window.citationTables.push(...newTables);
            }

            citation = citation
                .replaceAll(/(^|\s|\()(https?:\/\/[^\s)\]]+?)($|\s)/gm, "$1<a href='$2'>$2</a>$3")
                .replaceAll(/\[(https?:\/\/.+?)(\s.*?)?\]/gm, "$2: <a href='$1'>$1</a>")
                .replaceAll(
                    /\{\{Ancestry Record\s*\|\s*(.+)\|([0-9]+)\}\}/gm,
                    "Ancestry Record: <a href='https://www.ancestry.com/discoveryui-content/view/$2:$1'>https://www.ancestry.com/discoveryui-content/view/$2:$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch Record\s*\|\s*(.*?)\}\}/gm,
                    "<a href='https://www.familysearch.org/ark:/61903/1:1:$1'>https://www.familysearch.org/ark:/61903/1:1:$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch\|(.+?\-.+?)\s*\|\s*(discovery)\}\}/gm,
                    "FamilySearch Person Discovery: <a href='https://ancestors.familysearch.org/en/$1'>https://ancestors.familysearch.org/en/$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch\|(.+?\-.+?)s*\|\s*(timeline)\}\}/gm,
                    "FamilySearch Person Timeline: <a href='https://www.familysearch.org/tree/person/timeline/$1'>https://www.familysearch.org/tree/person/timeline/$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch\|(.+?\-.+?)s*\|\s*(sources)\}\}/gm,
                    "FamilySearch Person Sources: <a href='https://www.familysearch.org/tree/person/sources/$1'>https://www.familysearch.org/tree/person/sources/$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearchs*\|\s*(.+?\-.+?)\|(.+?)\}\}/gm,
                    "FamilySearch Person $2: <a href='https://www.familysearch.org/tree/person/$2/$1'>https://www.familysearch.org/tree/person/$2/$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch Book\s*\|\s*(.+?)\}\}/gm,
                    "FamilySearch Book $1: <a href='http://www.familysearch.org/library/books/idurl/1/$1'>http://www.familysearch.org/library/books/idurl/1/$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch Image\s*\|\s*(.+?)\}\}/gm,
                    "FamilySearch Image $1: <a href='https://www.familysearch.org/ark:/61903/3:1:$1'>https://www.familysearch.org/ark:/61903/3:1:$1</a>"
                )
                .replaceAll(
                    /\{\{FamilySearch\s*\|\s*(.+?\-.+?)\}\}/gm,
                    "FamilySearch Person: <a href='https://www.familysearch.org/tree/person/$1'>https://www.familysearch.org/tree/person/$1</a>"
                )
                .replaceAll(
                    /\{\{FindAGrave\s*\|\s*([0-9]+)(\|sameas.*?)?\}\}/gim,
                    "Find a Grave Memorial #$1: <a href='https://www.findagrave.com/memorial/$1'>https://www.findagrave.com/memorial/$1</a>"
                )
                .replaceAll(
                    /\[\[Wikipedia:(.*?)\]\]/g,
                    "Wikipedia: <a href='https://en.wikipedia.org/wiki/$1'>https://en.wikipedia.org/wiki/$1</a>"
                )
                .replaceAll(/\/wiki\/(.*?)\s(.*?)/g, "/wiki/$1_$2")
                .replaceAll(
                    /\{\{Wikidatas*\|\s*(.*?)\}\}/g,
                    "Wikidata: <a href='https://www.wikidata.org/wiki/$1'>https://www.wikidata.org/wiki/$1</a>"
                )
                .replaceAll(
                    /\[\[(Space:.*?)\]\]/g,
                    "<a href='https://www.wikitree.com/wiki/$1'>https://www.wikitree.com/wiki/$1</a>"
                )
                .replaceAll(
                    /\[\[(.*?\-[0-9]+)s*\|\s*(.*?)\]\]/g,
                    "$2 (<a href='https://www.wikitree.com/wiki/$1'>https://www.wikitree.com/wiki/$1</a>)"
                )
                .replaceAll(
                    /\{\{Ancestry Sharings*\|\s*(.+?)\|(.+?)\}\}/g,
                    "Ancestry Sharing: <a href='https://www.ancestry.com/sharing/$1?h=$2'>https://www.ancestry.com/sharing/$1?h=$2</a>"
                )
                .replaceAll(
                    /\{\{DAR\-grs\|(.+?)s*\|\s*(.+?)\s*?\|(.+?)\}\}/g,
                    "Daughters of the American Revolution, DAR Genealogical Research Databases, database online, (<a href='http://services.dar.org/Public/DAR_Research/search_adb/?action=full&p_id=$1'>http://www.dar.org/</a> : accessed $3), \"Record of $2\", Ancestor # $1."
                )
                .replaceAll(
                    /\{\{Ancestry Images*\|\s*(.+?)\|(.+?)\}\}/g,
                    "Ancestry Image: <a href='https://www.ancestry.com/interactive/$1/$2'>https://www.ancestry.com/interactive/$1/$2</a>"
                )
                .replaceAll(
                    /\{\{Ancestry Trees*\|\s*(.+?)\|(.+?)\}\}/g,
                    "Ancestry Tree: <a href='https://www.ancestry.com/family-tree/person/tree/$1/person/$2/facts'>https://www.ancestry.com/family-tree/person/tree/$1/person/$2/facts</a>"
                )
                .replaceAll(
                    /\{\{Ancestry Tree Media\|(.+?)s*\|\s*(.+?)\}\}/g,
                    "Ancestry Tree: <a href='https://www.ancestry.com/family-tree/tree/$1/media/$2'>https://www.ancestry.com/family-tree/tree/$1/media/$2</a>"
                )
                .replaceAll(
                    /\{\{National Archives Australias*\|\s*(.+?)\}\}/g,
                    "<a href='https://recordsearch.naa.gov.au/scripts/AutoSearch.asp?O=I&Number=$1'>https://recordsearch.naa.gov.au/scripts/AutoSearch.asp?O=I&Number=$1</a>"
                )
                .replaceAll(
                    /\{\{ODMPs*\|\s*(.+?)\}\}/g,
                    "The Officer Down Memorial Page: <a href='https://www.odmp.org/officer/$1'>https://www.odmp.org/officer/$1</a>"
                )
                .replaceAll(
                    /\{\{SBLs*\|\s*(.+?)(\|(.*?))?\}\}/g,
                    "Svenkst Biografiskt Lexikon: <a href='https://sok.riksarkivet.se/SBL/Presentation.aspx?id=$1'>https://sok.riksarkivet.se/SBL/Presentation.aspx?id=$1</a> $3"
                )
                .replaceAll(
                    /\{\{SQ\-NOs*\|\s*(.+?)\}\}/g,
                    "Profile $1 sur Nos Origines: <a href='http://www.nosorigines.qc.ca/GenealogieQuebec.aspx?pid=$1'>http://www.nosorigines.qc.ca/GenealogieQuebec.aspx?pid=$1</a>"
                )
                .replaceAll(
                    /\{\{TexasHistorys*\|\s*(.+?)\}\}/g,
                    "The Portal to Texas History: ERC Record #$1: <a href='https://texashistory.unt.edu/ark%3A/67531/metapth$1'>https://texashistory.unt.edu/ark%3A/67531/metapth$1</a>"
                )
                .replaceAll(
                    /\{\{Newspapers.com\|(.+?)\}\}/g,
                    "<a href='https://www.newspapers.com/clip/$1'>https://www.newspapers.com/clip/$1</a>"
                )
                .replaceAll(/\'\'\'(.+?)\'\'\'/g, "<b>$1</b>")
                .replaceAll(/\'\'(.+?)\'\'/g, "<i>$1</i>");

            const eeMatch = citation.match(/\{\{EE source[\s\S]*?\}\}/gm);
            if (eeMatch != null) {
                const eeData = {};
                const dataBits = eeMatch[0].replaceAll(/[{}\n]/g, "").split("|");
                dataBits.forEach(function (aBit) {
                    const aBitBits = aBit.split("=");
                    if (aBitBits[1]) {
                        eeData[aBitBits[0].replace("-", "_")] = aBitBits[1];
                    }
                });

                let eeName = "";
                if (eeData.last) {
                    let punc = "";
                    if (eeData.first1) {
                        punc = ", ";
                    }
                    eeName += eeData.last + ", " + eeData.first + punc;
                }
                if (eeData.last1) {
                    punc = "";
                    if (eeData.first2) {
                        punc = ", ";
                    }
                    eeName += eeData.last1 + ", " + eeData.first1 + punc;
                }
                if (eeData.last2) {
                    punc = "";
                    if (eeData.first3) {
                        punc = ", ";
                    }
                    eeName += eeData.last2 + ", " + eeData.first2 + punc;
                }
                if (eeData.last3) {
                    punc = "";
                    if (eeData.first4) {
                        punc = ", ";
                    }
                    eeName += eeData.last3 + ", " + eeData.first3 + punc;
                }
                if (eeData.last4) {
                    eeName += eeData.last4 + ", " + eeData.first4 + "";
                }

                const eeCitation =
                    (eeData.author ? eeData.author + ", " : "") +
                    (eeData.editor ? "Ed.: " + eeData.editor + ", " : "") +
                    eeName +
                    " " +
                    (eeData.title ? eeData.title + " " : "") +
                    (eeData.journal ? eeData.journal + " " : "") +
                    (eeData.periodical ? eeData.periodical + " " : "") +
                    (eeData.newspaper ? eeData.newspaper + " " : "") +
                    (eeData.repository ? eeData.repository + " " : "") +
                    (eeData.volume ? eeData.volume + " " : "") +
                    (eeData.publication_place ? eeData.publication_place + ": " : "") +
                    (eeData.publisher ? eeData.publisher + ", " : "") +
                    (eeData.isbn ? "ISBN: " + eeData.isbn + "; " : "") +
                    (eeData.month ? eeData.month + " " : "") +
                    (eeData.year ? eeData.year + ". " : "") +
                    (eeData.pages ? "pp." + eeData.pages + ". " : "") +
                    (eeData.accessdate ? "Accessed: " + eeData.accessdate + ". " : "") +
                    (eeData.url ? "<a href='" + eeData.url + "'>" + eeData.url + "</a>" : "");
                const reg = new RegExp(eeMatch[0].replaceAll(/([!|{}()\-.\[\]])/g, "\\$1"), "m");
                citation = citation.replace(reg, eeCitation);
            }

            return citation;
        }

        function appendReferences(mList) {
            window.references.forEach((pRefs) => {
                const anID = pRefs[0];
                let thisName = getFormattedName(anID);
                const wtidSpan = getWtidSpan(thisName);
                thisName = thisName.replace(/\(\b[^\s]+\-[0-9]+\)/, "");

                const anLI = createListItem(anID, thisName, wtidSpan);
                const aUL = $("<ul></ul>");

                pRefs[1].forEach((aRef) => {
                    aUL.append($("<li>" + fixCitation(aRef) + "</li>"));
                });

                appendSeeAlso(aUL, pRefs[2]);

                aUL.appendTo(anLI);
                anLI.appendTo(mList);
            });
        }

        function getFormattedName(anID) {
            return $("tr[data-name='" + htmlEntities(anID) + "'] .fsName")
                .eq(0)
                .text()
                .replace(/(Female)|(Male)\b/, "")
                .replace(/([a-z])(\)\s)?[MF]\b/, "$1$2");
        }

        function getWtidSpan(thisName) {
            const wtidMatch = thisName.match(/\(\b[^\s]+\-[0-9]+\)/);
            if (wtidMatch !== null) {
                return $("<span class='fsWTID'>" + htmlEntities(wtidMatch) + "</span>");
            }
            return "";
        }

        function createListItem(anID, thisName, wtidSpan) {
            const anLI = $(
                `<li data-wtid='${anID}'><a class='sourcesName' href='https://www.wikitree.com/wiki/${anID}'>${thisName}</a></li>`
            );
            anLI.find("a").append(wtidSpan);
            return anLI;
        }

        function appendSeeAlso(aUL, seeAlsoRefs) {
            if (seeAlsoRefs !== "") {
                const anLI2 = $("<li><span>See also:</span></li>");
                const aUL2 = $("<ul></ul>");
                seeAlsoRefs.forEach((aSA) => {
                    aUL2.append($("<li>" + fixCitation(aSA) + "</li>"));
                });
                aUL2.appendTo(anLI2);
                anLI2.appendTo(aUL);
            }
        }

        // Initialize mList as you did in your original code
        const mList = $("<ul></ul>"); // For example

        // Then call the refactored function
        appendReferences(mList);

        // Your existing code for appending to the DOM and other logic
        const params = new URLSearchParams(window.location.search);
        $("#sources").append(mList);
        $("#sources li[data-wtid='" + window.husbandWTID + "']").prependTo($("#sources ul").eq(0));

        // ... (rest of your code)

        setBaptChrist();

        $(".bioHeading").click(function () {
            $(this).next().find(".theBio").slideToggle();
        });

        /**
         * Toggles the visibility of citation tables based on the state of the "#showTables" checkbox.
         * If the checkbox is checked, citation tables are hidden.
         * Otherwise, citation tables are shown.
         */
        function toggleTables() {
            // Get the checked state of the "#showTables" checkbox
            const isChecked = $("#showTables").prop("checked");

            // Show or hide all ".citationTable" elements based on the checkbox state
            isChecked ? $(".citationTable").hide() : $(".citationTable").show();

            // Iterate through each nested list item in "#citationList"
            $("#citationList li li").each(function () {
                // Retrieve all text nodes within the current list item
                const textNodes = $(this)
                    .contents()
                    .filter(function () {
                        return this.nodeType === Node.TEXT_NODE;
                    });

                // If there's a visible ".citationTable" in this list item
                if ($(this).find(".citationTable:visible").length) {
                    let lastNode = textNodes[textNodes.length - 1];

                    // Remove trailing table headings from the text node if needed
                    if (lastNode.textContent.match(/:(\W|\n)*/) && !window.removedTableHeading) {
                        lastNode.textContent = lastNode.textContent.replace(/[A-Z][a-z]+:[\W\n]*?$/m, "");
                        window.removedTableHeading = true;
                    }

                    // Hide the citation table
                    $(this).find(".citationTable").hide();
                }
                // If there's a ".citationTable" but it's not visible
                else if ($(this).find(".citationTable").length) {
                    // Show the citation table
                    $(this).find(".citationTable").show();
                }
            });
        }

        /**
         * Toggles the visibility of source lists based on the state of the "#showLists" checkbox.
         * If the checkbox is checked, source lists are shown.
         * Otherwise, source lists are hidden.
         */
        function toggleLists() {
            // Get the checked state of the "#showLists" checkbox
            const isChecked = $("#showLists").prop("checked");

            // Show or hide all ".sourceUL" elements based on the checkbox state
            isChecked ? $(".sourceUL").show() : $(".sourceUL").hide();
        }

        /**
         * Updates the state of tables based on checkbox state and stores the state.
         */
        $("#showTables").change(function () {
            toggleTables();
            storeVal($(this));
        });

        /**
         * Updates the state of lists based on checkbox state and stores the state.
         */
        $("#showLists").change(function () {
            toggleLists();
            storeVal($(this));
        });

        /**
         * Allows editing of citation list items.
         * Creates a textarea for editing when a list item is clicked.
         */
        $("#citationList li li").click(function () {
            closeInputs();
            if ($(this).find("textarea").length === 0) {
                const newTextarea = $("<textarea class='citationEdit'>" + $(this).html() + "</textarea>");
                $(this).html(newTextarea);
                newTextarea.focus();
                newTextarea.on("blur", function () {
                    if ($(this).val() === "") {
                        $(this).parent().remove();
                    } else {
                        $(this).parent().html($(this).val());
                        $(this).remove();
                    }
                });
            }
        });

        /**
         * Handles the visibility of bio instructions and styles for print media based on the existence of ".bioRow" elements.
         */
        if ($(".bioRow").length) {
            $("#toggleBios,#includeBiosWhenPrinting").css("display", "inline-block");
            $("#includeBios").change(function () {
                storeVal($(this));
                if ($(this).prop("checked") === true) {
                    $(
                        "<style id='includeBiosStyle'>@media print {.familySheetForm .bioRow{display:table-row !important;} .familySheetForm .theBio {display:block !important}}</style>"
                    ).appendTo("body");
                } else {
                    $("#includeBiosStyle").remove();
                }
            });
            $("#bioInstructions").show();
        } else {
            $("#bioInstructions").hide();
        }

        /**
         * Updates the display of gender based on radio button selection and stores the value.
         */
        $("input[name='showGender']").change(function () {
            storeVal($(this));
            const showGenderVal = $("input[name='showGender']:checked").val();

            $(".fsGender").each(function () {
                $(this).text("");

                if (showGenderVal === "initial") {
                    $(this).text($(this).attr("data-gender").substring(0, 1));
                }

                if (showGenderVal === "word") {
                    $(this).text($(this).attr("data-gender"));
                }
            });
        });

        $("#fgsInfo").slideDown();

        /**
         * Hides or shows elements based on the presence and attributes of Husband and Wife roles.
         */
        function manageRoleRows() {
            const husbandRow = $("tr.roleRow[data-role='Husband']");
            const wifeRow = $("tr.roleRow[data-role='Wife']");
            const husbandFirstLabel = $("#husbandFirstLabel");

            // Check for undefined Husband and Wife roles and hide labels accordingly
            if (husbandRow.attr("data-name") === "undefined") {
                husbandRow.remove();
                husbandFirstLabel.hide();
            } else if (wifeRow.attr("data-name") === "undefined") {
                wifeRow.remove();
                husbandFirstLabel.hide();
            } else if (people[0].Gender === "Male") {
                husbandFirstLabel.hide();
            } else {
                husbandFirstLabel.css("display", "inline-block");
            }

            // Update Wife labels if conditions are met
            if (wifeRow.attr("data-gender") === "" || husbandRow.length === 0) {
                updateLabels("Wife");
            }

            // Update Husband labels if conditions are met
            if (husbandRow.attr("data-gender") === "" || wifeRow.length === 0) {
                updateLabels("Husband");
            }
        }

        /**
         * Updates labels based on the role type.
         * @param {string} role - The role type, either "Husband" or "Wife".
         */
        function updateLabels(role) {
            const roleRow = $(`tr.roleRow[data-role='${role}']`);
            const fatherHeading = $(`tr.${role}ParentsRow[data-role='${role}'] th.${role}FatherHeading`);
            const motherHeading = $(`tr.${role}ParentsRow[data-role='${role}'] th.${role}MotherHeading`);

            roleRow.find("th a").text("Name");
            fatherHeading.find("a").text("Father");
            if (fatherHeading.find("a").length === 0) {
                fatherHeading.text("Father:");
            }
            motherHeading.find("a").text("Mother");
            if (motherHeading.find("a").length === 0) {
                motherHeading.text("Mother:");
            }
        }

        /**
         * Updates the status choice and modifies the date strings accordingly.
         */
        $("input[name='statusChoice']").change(function () {
            storeVal($(this));

            // Check if abbreviations are selected
            const isAbbr = $("input[name='statusChoice'][value='abbreviations']").prop("checked");

            // Update each date text based on the selected status
            $(".date").each(function () {
                const currentText = $(this).text();
                if (isAbbr) {
                    const replacedText = currentText
                        .replaceAll(/~/g, "abt. ")
                        .replaceAll(/</g, "bef. ")
                        .replaceAll(/>/g, "aft. ");
                    $(this).text(replacedText);
                } else {
                    const replacedText = currentText
                        .replaceAll(/abt\.\s/g, "~")
                        .replaceAll(/bef\.\s/g, "<")
                        .replaceAll(/aft\.\s/g, ">");
                    $(this).text(replacedText);
                }
            });
        });

        /**
         * Configures roles and layout based on existing data and settings.
         */
        function configureRolesAndLayout() {
            let roles = ["Husband", "Wife"];

            // Check if the role should be swapped based on local storage and data attributes
            if (
                $("tr.roleRow[data-role='Wife']").attr("data-name") === $("#wtid").val() &&
                localStorage.husbandFirst !== "1"
            ) {
                roles = ["Wife", "Husband"];
            }

            // Hide the 'husbandFirstLabel' if the roles are non-traditional
            if ($("tr[data-gender='Female'][data-role='Husband'],tr[data-gender='Male'][data-role='Wife']").length) {
                localStorage.husbandFirst = 0;
                $("#husbandFirstLabel").hide();
            }

            // Add children roles
            for (let i = 1; i < 31; i++) {
                roles.push(ordinal(i) + " Child");
            }

            // Get table and column widths
            const divWidth = $("#familySheetFormTable")[0].scrollWidth;
            const th1Width = $("#familySheetFormTable > thead > tr > th")[0].scrollWidth;
            const th2Width = $("#familySheetFormTable > thead > tr > th:nth-child(2)")[0].scrollWidth;
            const th3Width = $("#familySheetFormTable > thead > tr > th:nth-child(3)")[0].scrollWidth;

            // TODO: Use the width information (divWidth, th1Width, etc.) as needed
        }

        // Assume ordinal is a function that already exists to convert numbers to their ordinal form (1st, 2nd, etc.)

        /**
         * Update DOM to append new styles and organize table by roles.
         * @param {number} divWidth - The width of the main table container.
         * @param {number} th2Width - The width of the 2nd column in the table header.
         * @param {number} th3Width - The width of the 3rd column in the table header.
         * @param {Array<string>} roles - Array of roles to be used for organizing the table.
         */
        function updateDOMAndOrganizeTable(divWidth, th2Width, th3Width, roles) {
            // Append new styles to the body
            $(
                `<style id='newDivs'>
            #familySheetFormTable, .tableContainer, .tableContainer table { width: ${divWidth}px; margin: auto; }
            .birthHeading, .BirthDate, #familySheetFormTable > thead > tr > th:nth-child(2) { width: ${th2Width}px; max-width: ${th2Width}px; }
            .BirthPlace { width: ${th3Width - 3}px; }
        </style>`
            ).appendTo("body");

            // Loop through each role and organize the table accordingly
            roles.forEach(function (aRole) {
                const newDiv = $(`<div class='tableContainer ${aRole}'></div>`);
                const newTable = $("<table></table>");
                const newTbody = $("<tbody></tbody>");
                $("#familySheetFormTable > tbody > tr[data-role='" + aRole + "']").appendTo(newTbody);

                if (newTbody.find("tr").length) {
                    newTbody.appendTo(newTable);
                    newTable.appendTo(newDiv);
                    newDiv.insertBefore("#notesAndSources");
                }
            });
        }

        // Example usage:
        // Assume divWidth, th2Width, th3Width, and roles are already defined
        updateDOMAndOrganizeTable(divWidth, th2Width, th3Width, roles);

        /**
         * Initialize the page based on the presence of various elements and data.
         */
        function initializePage() {
            // Show or hide 'Tables' label based on the presence of citation tables
            toggleDisplay("#showTablesLabel", !!$(".citationTable").length);

            // Show or hide 'Lists' label based on the presence of source lists
            toggleDisplay("#showListsLabel", !!$(".sourceUL").length);

            // Show or hide 'Gender' div based on the presence of '1st Child'
            toggleDisplay("#showGenderDiv", !!$("tr[data-role='1st Child']").length);

            // Determine if there are uncertain dates and show/hide status choice accordingly
            let uncertain = Array.from($(".date")).some((el) =>
                $(el)
                    .text()
                    .match(/[~<>]|abt\.|bef.\|aft\./)
            );
            toggleDisplay("#statusChoice", uncertain);

            // Initialize values
            setVals();

            // Remove the second married row if it exists
            if ($(".marriedRow").eq(1)) {
                $(".marriedRow").eq(1).remove();
            }

            // Show or hide 'Nicknames' label based on the presence of nicknames
            toggleDisplay("#showNicknamesLabel", !!$(".nicknames").length);

            // Call toggleTables function
            toggleTables();

            // Handle query parameters
            const searchParams = new URLSearchParams(window.location.search);
            const testing = searchParams.get("test");
            if (testing === "1") {
                // Implement any testing logic here
            }

            // Add print icon if not already present
            if ($("#printIcon").length === 0) {
                $("<img id='printIcon' src='images/print50.png'>").appendTo("header");
                $("#printIcon").click(() => window.print());
            }
        }

        /**
         * Toggle the display of an element.
         * @param {string} selector - The jQuery selector for the element.
         * @param {boolean} condition - The condition to toggle the display.
         */
        function toggleDisplay(selector, condition) {
            if (condition) {
                $(selector).css("display", "inline-block");
            } else {
                $(selector).hide();
            }
        }

        // Initialize the page
        initializePage();
    }
    $(".fsName a, caption a").click(function (e) {
        e.preventDefault();
    });

    // End making the form/tables

    //$("td[data-name],span[data-name]")

    /**
     * Handle click events on elements with the data-name attribute.
     * This function updates the input field and triggers a click event.
     */
    $("td[data-name],span[data-name]").click(function () {
        const dTR = $(this).closest("tr");
        window.keepSpouse = dTR.attr("data-person") || "";

        $("#wtid").val($(this).attr("data-name"));
        $("#familySheetGo").trigger("click");
    });

    /**
     * Closes any open input elements and updates their parent elements with the new value.
     * Filters out any unsafe "script" tags.
     */
    function closeInputs() {
        $(".edit").each(function () {
            const isTextarea = $(this).prop("tagName") === "TEXTAREA";
            const isCaption = $(this).parent().prop("tagName") === "CAPTION";

            let newValue = $(this).val();

            // Check for unsafe "script" tags
            if (!/script/i.test(newValue)) {
                if (isTextarea || isCaption) {
                    $(this).parent().html(nl2br(newValue));
                } else {
                    $(this).parent().text(newValue);
                }
            }

            $(this).remove();
        });
    }

    /**
     * Handles click events on various elements to allow in-place editing.
     * Creates an input box for the clicked element and focuses it.
     */
    $(document).on(
        "click",
        ".BaptismDate, .BaptismPlace, .buriedDate, .buriedPlace, caption, h1, .birthRow td, .deathRow td, .otherMarriagePlace, span.marriageDate, .marriedPlace, .editable",
        function () {
            // Check if an input already exists within the clicked element
            if ($(this).find("input").length === 0) {
                let inputBox;

                // Determine if the clicked element is a CAPTION
                const isCaption = $(this).prop("tagName") === "CAPTION";
                const initialValue = isCaption ? $(this).html() : $(this).text();

                // Create the input box
                inputBox = $("<input style='background:white;' type='text' class='edit'>").val(initialValue);

                // Clear existing text and append input box
                $(this).empty().append(inputBox);

                // Focus on the input box
                inputBox.focus();

                // Event handlers for the input box
                inputBox.keypress(function (e) {
                    if (e.which === 13) {
                        // Enter key
                        closeInputs();
                    }
                });

                inputBox.focusout(function () {
                    closeInputs();
                });
            }
        }
    );

    $("a").attr("target", "_blank");
}

/**
 * Returns the ordinal representation of a given integer.
 *
 * @param {number} i - The integer to convert to its ordinal representation.
 * @return {string} The ordinal representation of the integer.
 */
function ordinal(i) {
    const j = i % 10;
    const k = i % 100;

    if (j === 1 && k !== 11) {
        return `${i}st`;
    }
    if (j === 2 && k !== 12) {
        return `${i}nd`;
    }
    if (j === 3 && k !== 13) {
        return `${i}rd`;
    }

    return `${i}th`;
}

/**
 * Fetches family data from the WikiTree API.
 *
 * @param {string} WTID - The WikiTree ID of the person to get family data for.
 */
function getFamily(WTID) {
    let bioFormat = "text";
    if ($("#getBios").prop("checked")) {
        bioFormat = "both";
    }

    const apiUrl = "https://api.wikitree.com/api.php";
    const requestData = {
        action: "getRelatives",
        getSpouses: "1",
        getChildren: "1",
        getParents: "1",
        getSiblings: "1",
        keys: WTID,
        fields: "Spouse,NoChildren,IsLiving,BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Nicknames,Derived.LongName,Derived.LongNamePrivate,Derived.BirthName,Derived.BirthNamePrivate,Manager,MiddleName,MiddleInitial,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Bio,Privacy",
        bioFormat: bioFormat,
    };

    $.ajax({
        url: apiUrl,
        data: requestData,
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "json",
        success: function (data) {
            const thePeople = data[0]?.items;
            if (thePeople) {
                thePeople.forEach((aPerson) => {
                    const mPerson = aPerson.person;

                    // Populate spouse, children, siblings, and parents
                    ["Spouse", "Child", "Sibling", "Parent"].forEach((relation) => {
                        const relatives = getRels(mPerson[`${relation}s`], mPerson, relation);
                        mPerson[relation] = relatives;
                    });

                    window.people.push(mPerson);

                    // Recursive call and makeFamilySheet() as in your original code
                    if (window.people[0].Spouse) {
                        window.people[0].Spouse.forEach(function (aSpouse) {
                            if (!window.calledPeople.includes(aSpouse.Name)) {
                                window.calledPeople.push(aSpouse.Name);
                                getFamily(aSpouse.Name);
                            }
                        });
                    }
                    if (window.people[0].Child) {
                        window.people[0].Child.forEach(function (aChild) {
                            if (!window.calledPeople.includes(aChild.Name)) {
                                window.calledPeople.push(aChild.Name);
                                getFamily(aChild.Name);
                            }
                        });
                    }
                    if (window.calledPeople.length === window.people.length) {
                        makeFamilySheet();
                    }
                });
            } else {
                privateQ();
                $("#tree").slideUp();
            }
        },
    });
}

/**
 * Sets the column heading and label text based on the selected radio button value for Baptism or Christening.
 */
function setBaptChrist() {
    // Loop through each radio button to find the one that is checked
    $("input[type=radio][name=baptismChristening]").each(function () {
        // Check if the radio button is selected
        if ($(this).prop("checked")) {
            // Get the value of the selected radio button
            const selectedValue = $(this).val();

            // Update the column heading and label text based on the selected value
            $("th.baptismHeading").text(`${selectedValue}:`);
            $("#showBaptisedText").text(`Show ${selectedValue}`);
        }
    });
}

/**
 * Exports the data to an Excel sheet.
 */
function excelOut() {
    const today = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    let fileName;

    // Determine the file name based on the context
    if ($("#missingParents").length) {
        fileName = `Missing Parents - ${$("#wtid").val()}`;
    }

    // Initialize workbook
    const wb = XLSX.utils.book_new();
    wb.Props = {
        Title: fileName,
        Subject: fileName,
        Author: "WikiTree",
        CreatedDate: new Date(),
    };

    wb.SheetNames.push(fileName);

    const ws_data = [];

    // Populate the worksheet data if the missingParents element is present
    if ($("#missingParents").length) {
        const thVals = [
            "ID",
            "First Name",
            "LNAB",
            "CLN",
            "Birth Date",
            "Birth Location",
            "Death Date",
            "Death Location",
            "Missing",
        ];

        ws_data.push(thVals);

        const rows = $("#peopleList tbody tr");
        rows.each(function () {
            if ($(this).css("display") !== "none") {
                const rowValues = [
                    $(this).attr("data-name"),
                    $(this).attr("data-first-name"),
                    $(this).attr("data-lnab"),
                    $(this).attr("data-lnc"),
                    $(this).attr("data-birth-date"),
                    $(this).attr("data-birth-location"),
                    $(this).attr("data-death-date"),
                    $(this).attr("data-death-location"),
                    $(this).attr("data-missing"),
                ];
                ws_data.push(rowValues);
            }
        });
    }

    // Create the worksheet and attach it to the workbook
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    wb.Sheets[fileName] = ws;

    // Convert string to array buffer
    function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    }

    $("#downloadLines, .downloadLines").unbind();
    $("#downloadLines, .downloadLines").click(function () {
        if ($("#missingParents").length) {
            const wscols = [
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
                { wch: 15 },
                { wch: 10 },
                { wch: 30 },
                { wch: 10 },
                { wch: 30 },
                { wch: 10 },
            ];
            ws["!cols"] = wscols;
        }

        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
        saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), `${fileName}.xlsx`);
    });
}

$(document).ready(function () {});

// Function to toggle styles and update localStorage
function toggleStyle(styleId, styleContent, optionalElement = null) {
    return function () {
        if ($(this).prop("checked") === false) {
            $(`<style id='${styleId}'>${styleContent}</style>`).appendTo("body");
            if (optionalElement) {
                $(`${optionalElement}`).prop("disabled", true);
            }
        } else {
            $(`#${styleId}`).remove();
            if (optionalElement) {
                $(`${optionalElement}`).prop("disabled", false);
            }
        }
        storeVal($(this));
    };
}

// Function to toggle bios and update localStorage
function toggleBios() {
    if ($(this).prop("checked") === true) {
        $(".theBio").slideDown();
        setTimeout(() => {
            $(`<style id='showBiosStyle'>.familySheetForm .bioRow div.theBio{display:block;}</style>`).appendTo("body");
        }, 1000);
    } else {
        $(".theBio").slideUp();
        setTimeout(() => {
            $("#showBiosStyle").remove();
        }, 1000);
    }
    storeVal($(this));
}

/**
 * General function to handle slide toggle and localStorage state.
 *
 * @param {string} selector - The jQuery selector for the element.
 * @param {string} localStorageKey - The localStorage key to use for storing state.
 * @param {Function} [callback] - Optional callback to execute after toggling.
 */
function handleSlideToggle(selector, localStorageKey, callback = null) {
    $(selector).slideUp("slow");
    setTimeout(function () {
        const elem = $(selector);
        elem.toggleClass("removed");
        elem.slideDown("slow");

        const isRemoved = elem.hasClass("removed");
        localStorage.setItem(localStorageKey, isRemoved ? "removed" : "center");

        if (callback) {
            callback(isRemoved);
        }
    }, 1000);
}

async function getSomeRelatives(id, fields = "*") {
    try {
        const result = await $.ajax({
            url: "https://api.wikitree.com/api.php",
            crossDomain: true,
            xhrFields: { withCredentials: true },
            type: "POST",
            dataType: "json",
            data: {
                action: "getRelatives",
                keys: id,
                fields: fields,
                getParents: 1,
                getSiblings: 1,
                getSpouses: 1,
                getChildren: 1,
            },
        });
        return result[0].items;
    } catch (error) {
        console.error(error);
        // Consider additional error-handling logic here
    }
}

// Used in familyTimeline, familyGroup, locationsHelper
// Make the family member arrays easier to handle
/**
 * Extracts relative data from a given object and optionally adds a relation type.
 *
 * @param {Object} rel - The object containing relative data.
 * @param {string} [theRelation=false] - The type of relation to be added to each person object.
 *
 * @returns {Array|boolean} - An array of person objects if `rel` is defined, false otherwise.
 */
function extractRelatives(rel, theRelation = false) {
    // Initialize an empty array to hold person objects.
    let people = [];

    // Check if rel is undefined or null and return false if it is.
    if (typeof rel === "undefined" || rel === null) {
        return false;
    }

    // Get keys from the rel object.
    const pKeys = Object.keys(rel);

    // Loop through each key to get person object and optionally add relation type.
    pKeys.forEach(function (pKey) {
        let aPerson = rel[pKey];
        if (theRelation !== false) {
            aPerson.Relation = theRelation;
        }
        people.push(aPerson);
    });

    // Return the array of person objects.
    return people;
}

// Used in familyTimeline, familyGroup, locationsHelper
/**
 * Generates an array of a person and their relatives.
 *
 * @param {Object} person - The main person object obtained from getRelatives().
 *
 * @returns {Array} - An array containing the main person and their relatives.
 */
function familyArray(person) {
    // Define the types of relationships to look for.
    const rels = ["Parents", "Siblings", "Spouses", "Children"];

    // Initialize the familyArr array with the main person.
    let familyArr = [person];

    // Loop through each type of relationship.
    rels.forEach(function (rel) {
        // Remove trailing 's' or 'ren' to get the singular form of the relation.
        const relation = rel.replace(/s$/, "").replace(/ren$/, "");

        // Concatenate the relatives of the current type to the familyArr.
        familyArr = familyArr.concat(extractRelatives(person[rel], relation));
    });

    // Return the complete family array.
    return familyArr;
}
