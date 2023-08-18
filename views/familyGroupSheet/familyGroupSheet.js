class FamilyGroupSheetView extends View {
    static APP_ID = "familyGroupSheet";
    meta() {
        return {
            title: "Family Group Sheet",
            description: `Produce a printer-friendly Family Group Sheet.`,
        };
    }

    init(container_selector, person_id) {}
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
    bin = decimalToBinary(ahnen);
    bin = bin.toString().substring(1);
    return bin.replaceAll(/1/g, "M").replaceAll(/0/g, "F");
}
function ahnenToMF2(ahnen) {
    mf = ahnenToMF(ahnen);
    mfTitle = "Your";
    for (i = 0; i < mf.length; i++) {
        if (mf[i] == "M") {
            mfTitle += " mother&apos;s";
        } else if (mf[i] == "F") {
            mfTitle += " father&apos;s";
        }
    }
    mfTitleOut = mfTitle.substring(0, mfTitle.length - 7);
    return [mf, mfTitleOut];
}
// end Ahnen functions

// Age functions
function getAge(birth, death) {
    // must be date objects

    var age = death.getFullYear() - birth.getFullYear();
    var m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
        age--;
    }
    //console.log(age);
    return age;
}

function ageAtDeath(person, showStatus = true) {
    // ages
    about = "";
    diedAged = "";
    if (person.Name == "Muller-10846") {
        //console.log(person.Name, person.BirthDate, person.DeathDate);
    }
    if (person?.BirthDate != undefined) {
        if (
            person["BirthDate"].length == 10 &&
            person["BirthDate"] != "0000-00-00" &&
            person["DeathDate"].length == 10 &&
            person["DeathDate"] != "0000-00-00"
        ) {
            about = "";
            obDateBits = person["BirthDate"].split("-");
            if (obDateBits[1] == "00") {
                obDateBits[1] = "06";
                obDateBits[2] = "15";
                about = "~";
            } else if (obDateBits[2] == "00") {
                obDateBits[2] = "15";
                about = "~";
            }
            odDateBits = person["DeathDate"].split("-");
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

function nl2br(str, replaceMode, isXhtml) {
    var breakTag = isXhtml ? "<br />" : "<br>";
    var replaceStr = replaceMode ? "$1" + breakTag : "$1" + breakTag + "$2";
    return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, replaceStr);
}

function br2nl(str, replaceMode) {
    var replaceStr = replaceMode ? "\n" : "";
    // Includes <br>, <BR>, <br />, </br>
    return str.replace(/<\s*\/?br\s*[\/]?>/gi, replaceStr);
}

//capitalize only the first letter of the string.
function capitalizeFirstLetter(string, only = 0) {
    // only = only change the first letter
    if (only == 0) {
        string = string.toLowerCase();
    }
    bits = string.split(" ");
    out = "";
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

    wideTableButton = $("<button class='button small' id='wideTableButton'>Wide Table</button>");
    if ($("#wideTableButton").length == 0) {
        if ($(".peopleTable").length) {
            dTable = $(".peopleTable");
        } else if ($("body#missingParents").length) {
            dTable = $("#peopleList");
        } else {
            dTable = $("#connectionsTable");
        }
        //	dCaption = $("<caption></caption>");
        //	dTable.prepend(dCaption);
        //	dCaption.append(wideTableButton);

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
                console.log("clicked");
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

                    var isiPad = navigator.userAgent.match(/iPad/i) != null;
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
                    leftButton = $("<button id='leftButton'>&larr;</button>");
                    rightButton = $("<button id='rightButton'>&rarr;</button>");
                    buttonBox = $("<div id='buttonBox'></div>");
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
    fName1 = "";
    if (typeof fPerson["LongName"] != "undefined") {
        if (fPerson["LongName"] != "") {
            fName1 = fPerson["LongName"].replace(/\s\s/, " ");
        }
    }
    fName2 = "";
    fName4 = "";
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

    fName3 = "";
    checks = [
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
    //if (fPerson[""])

    //fName4 =

    arr = [fName1, fName2, fName3, fName4];
    var longest = arr.reduce(function (a, b) {
        return a.length > b.length ? a : b;
    });

    fName = longest;

    if (fPerson["ShortName"]) {
        sName = fPerson["ShortName"];
    } else {
        sName = fName;
    }

    return [fName.trim(), sName.trim()];
}

function peopleToTable(kPeople) {
    //if ($("#missingParents").length){
    disName = displayName(kPeople[0])[0];
    if ($(".app").length) {
        if (kPeople[0].MiddleName) {
            disName = disName.replace(kPeople[0].MiddleName + " ", "");
        }
    }

    captionHTML = "<a href='https://www.wikitree.com/wiki/" + htmlEntities(kPeople[0].Name) + "'>" + disName + "</a>";
    //}

    kTable = $(
        "<div class='familySheet'><w>↔</w><x>x</x><table><caption>" +
            captionHTML +
            "</caption><thead><tr><th>Relation</th><th>Name</th><th>Birth Date</th><th>Birth Place</th><th>Death Date</th><th>Death Place</th></tr></thead><tbody></tbody></table></div>"
    );
    kPeople.forEach(function (kPers) {
        //console.log(kPers);
        rClass = "";
        isDecades = false;
        kPers.RelationShow = kPers.Relation;
        if (kPers.Relation == undefined || kPers.Active) {
            kPers.Relation = "Sibling";
            kPers.RelationShow = "";
            rClass = "self";
        }

        if (kPers.BirthDate) {
            bDate = kPers.BirthDate;
        } else if (kPers.BirthDateDecade) {
            bDate = kPers.BirthDateDecade.slice(0, -1) + "-00-00";
            isDecades = true;
        } else {
            bDate = "0000-00-00";
        }

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
    rows = kTable.find("tbody tr");
    rows.sort((a, b) => ($(b).data("birthdate") < $(a).data("birthdate") ? 1 : -1));
    kTable.find("tbody").append(rows);

    familyOrder = ["Parent", "Sibling", "Spouse", "Child"];
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
    theDateM = theDate.match(/[0-9]{4}/);
    if (isOK(theDateM)) {
        return parseInt(theDateM[0]);
    } else {
        return false;
    }
}

function getAge(birth, death) {
    // must be date objects

    var age = death.getFullYear() - birth.getFullYear();
    var m = death.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
        age--;
    }
    //console.log(age);
    return age;
}

function dateToYMD(enteredDate) {
    if (enteredDate.match(/[0-9]{3,4}\-[0-9]{2}\-[0-9]{2}/)) {
        enteredD = enteredDate;
    } else {
        eDMonth = "00";
        eDYear = "00";
        eDYear = enteredDate.match(/[0-9]{3,4}/);
        if (eDYear != null) {
            eDYear = eDYear[0];
        }
        eDDate = enteredDate.match(/\b[0-9]{1,2}\b/);
        if (eDDate != null) {
            //console.log(eDDate);
            eDDate = eDDate[0].padStart(2, "0");
        }
        if (eDDate == null) {
            eDDate = "00";
        }

        //console.log(enteredDate);
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

function timeline(jqClicked) {
    tPerson = "";
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

function doFamilySheet(fPerson) {
    theClickedName = fPerson.Name;
    if ($("#" + theClickedName.replace(" ", "_") + "_family").length) {
        $("#" + theClickedName.replace(" ", "_") + "_family").fadeToggle();
        hidIt = true;
    }

    if (hidIt == false) {
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

function showFamilySheet(jq) {
    theClicked = jq;
    hidIt = false;
    theClickedName = jq.closest("tr").attr("data-name");
    if ($("body#missingParents").length) {
        theClickedName = jq.closest("li").attr("data-name");
    }
    if ($("body#missingParents.table").length) {
        theClickedName = jq.closest("tr").attr("data-name");
    }
    //console.log(theClickedName);

    fsReady = false;
    window.people.forEach(function (aPeo) {
        if (aPeo.Name == theClickedName) {
            //console.log(aPeo.Name);
            if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
                doFamilySheet(aPeo);
                fsReady = true;
            }
        }
    });
    //console.log(fsReady);
    if (fsReady == false) {
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

function login() {
    let searchParams = new URLSearchParams(window.location.search);
    let authCode = searchParams.get("authcode");
    if (searchParams.has("authcode")) {
        $.ajax({
            url: "https://api.wikitree.com/api.php",
            crossDomain: true,
            xhrFields: { withCredentials: true },
            type: "POST",
            data: { action: "clientLogin", authcode: authCode },
            dataType: "json",
            success: function (data) {
                if (data.clientLogin.result == "Success") {
                    Cookies.set("loggedInID", data.clientLogin.userid);
                    Cookies.set("loggedInName", data.clientLogin.username);
                    Cookies.set("authCode", authCode);
                    window.location = window.location.href.split("?authcode=")[0];
                }
            },
        });
    } else if (Cookies.get("loggedInID") != undefined) {
        if (Cookies.get("authCode") != undefined) {
            $.ajax({
                url: "https://api.wikitree.com/api.php",
                crossDomain: true,
                xhrFields: { withCredentials: true },
                type: "POST",
                data: { action: "clientLogin", authcode: Cookies.get("authCode") },
                dataType: "json",
                success: function (data) {
                    if (data.clientLogin.result == "Success") {
                        console.log("logged in");
                        $("#loginForm").css("visibility", "hidden");
                        if ($("body.cc7Table").length) {
                            $("#wtid").val(Cookies.get("loggedInName"));
                        }
                        if ($("#textSearch").length && $("#loggedIn").length == 0) {
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

function getPeople(action = "getAncestors") {
    WTID = $("#wtid").val().trim();
    depth = $("#depth").val();

    if ($("#action").val() == "dec") {
        action = "getDescendants";
        if (depth > 5) {
            depth = 5;
        }
    }

    $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        data: { action: action, key: WTID, depth: depth, fields: "*" },
        dataType: "json",
        success: function (data) {
            //console.log(data);
            $(".peopleList").remove();
            myList = $("<ol class='peopleList'></ol>");
            myList.appendTo($("body"));
            myPeople = [];
            if (data[0].ancestors) {
                myPeople = data[0].ancestors;
            } else if (data[0].descendants) {
                myPeople = data[0].descendants;
            }

            if (myPeople.length) {
                myPeople.forEach(function (aPerson) {
                    listItem = $(
                        "<li>" +
                            aPerson.Name +
                            ": " +
                            aPerson?.LongName +
                            "<br>B. " +
                            aPerson?.BirthDate +
                            ", " +
                            aPerson?.BirthLocation +
                            "<br>D. " +
                            aPerson?.DeathDate +
                            " " +
                            aPerson?.DeathLocation +
                            "</li>"
                    );
                    listItem.appendTo(myList);
                });
            }
        },
    });
}

function getRels(rel, person, theRelation = false) {
    peeps = [];
    if (typeof rel == undefined || rel == null) {
        return false;
    }
    pKeys = Object.keys(rel);
    pKeys.forEach(function (pKey) {
        aPerson = rel[pKey];
        if (theRelation != false) {
            aPerson.Relation = theRelation;
        }
        peeps.push(aPerson);
    });

    return peeps;
}

window.privates = 0;

async function getRelatives(id) {
    secondTime = false;
    console.log(window.people.length, window.categoryProfiles.length);
    //gC = "0"; gP = "0"; gSib = "0";
    gC = "1";
    gP = "1";
    gSib = "1";
    if (window.people.length == window.categoryProfiles.length) {
        //console.log(window.people.length, window.categoryProfiles.length);
        secondTime = true;
        gC = "1";
        gP = "1";
        gSib = "1";
        return false;
    }
    $.ajax({
        url: "https://api.wikitree.com/api.php",
        data: {
            action: "getRelatives",
            getSpouses: "1",
            getChildren: gC,
            getParents: gP,
            getSiblings: gSib,
            keys: id,
            fields: "BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Derived.BirthName,Bio,Privacy",
        },
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "json",
        success: function (data) {
            thePeople = data[0].items;
            //console.log(thePeople);
            thePeople.forEach(function (aPerson, index) {
                mPerson = aPerson.person;
                if (mPerson.Name == undefined) {
                    mPerson.Name = "Private-" + window.privates;
                    window.privates++;
                }

                mSpouses = getRels(mPerson.Spouses, mPerson, "Spouse");
                mPerson.Spouse = mSpouses;
                mChildren = getRels(mPerson.Children, mPerson, "Child");
                mPerson.Child = mChildren;
                mSiblings = getRels(mPerson.Siblings, mPerson, "Sibling");
                mPerson.Sibling = mSiblings;
                mParents = getRels(mPerson.Parents, mPerson, "Parent");
                mPerson.Parent = mParents;
                inArr = false;
                /*
                  window.people.forEach(function(aPeep){
                      if (aPeep.Name == mPerson.Name){
                          aPeep = mPerson;
                          inArr = true;
                          $("tr[data-name='"+htmlEntities(aPeep.Name)+"'] .familyHome").fadeIn();
                          //console.log(aPeep);
                      }
                  })
                  */
                if (inArr == false) {
                    window.people.push(mPerson);
                }
                //console.log(window.people.length, window.categoryProfiles.length);
            });
            if (secondTime == false) {
                if ($("#countdown").length == 0) {
                    $("body").append($("<span id='countdown'>" + window.countdown + "</span>"));
                } else {
                    window.countdown--;
                    $("#countdown").text(window.countdown);
                }
            }

            if (window.people.length == window.categoryProfiles.length && secondTime == false) {
                //console.log(window.people);
                addPeopleTable();

                //doCategoryProfiles();

                $("<p class='opsStat'>Profiles: " + window.people.length + "</p>").insertAfter($("h1"));
                ages = averageMarriageAge();
                //{"AgeDifference":averageAgeDiff, "MeanAge":averageMarriedAt,"MedianAge":medianMarriedAt,"ModeAge":modeMarriedAt}

                $(
                    "<p id='averageAgeDifference' class='opsStat'>Mean age difference at first marriage: " +
                        ages.AgeDifference +
                        " years</p>"
                ).insertAfter($("h1"));

                $(
                    "<p id='averageMarriedAt' class='opsStat'>Mean age at first marriage: " + ages.MeanAge + "</p>"
                ).insertAfter($("h1"));

                $(
                    "<p id='medianMarriedAt' class='opsStat'>Median age at first marriage: " + ages.MedianAge + "</p>"
                ).insertAfter($("h1"));

                $(
                    "<p id='modeMarriedAt' class='opsStat'>Mode age at first marriage: " + ages.ModeAge + "</p>"
                ).insertAfter($("h1"));
            }
        },
        error: function (err) {
            console.log(err);
        },
    });
}

function doCategoryProfiles() {
    if (window.categoryProfiles) {
        console.log(window.categoryProfiles);
        window.batches = Math.floor(window.categoryProfiles.length / 100);
        window.countdown = window.batches + 1;
        if (batches < 1) {
            IDString = window.categoryProfiles.join(",");
            getRelatives(IDString);
        } else {
            if ($("#countdown").length == 0) {
                $("body").append($("<span id='countdown'>" + window.countdown + "</span>"));
            }
            remainder = window.categoryProfiles.length % 100;
            for (i = 0; i < batches; i++) {
                miniArr = [];
                for (j = 100 * i; j < 100 + 100 * i; j++) {
                    miniArr.push(window.categoryProfiles[j]);
                    //console.log(miniArr.length);
                }
                IDString = miniArr.join(",");
                getRelatives(IDString);
            }
            if (remainder > 0) {
                miniArr = [];
                for (k = j; k < j + remainder; k++) {
                    //console.log(miniArr.length);
                    miniArr.push(window.categoryProfiles[k]);
                }
                IDString = miniArr.join(",");
                getRelatives(IDString);
            }
        }
    }
}

function getCategoryProfiles(category) {
    category = encodeURIComponent(category);
    $("body").append("<img id='tree' src='images/tree.gif'>");
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
            //console.log(data);
            window.categoryProfiles = JSON.parse(data).response.profiles;
            if (window.categoryProfiles) {
                doCategoryProfiles();
            } else {
                $("#tree").fadeOut();
                $("<p class='opsStat' id='noResults'>No results!</p>").insertAfter($("h1"));
            }
        },
        error: function (err) {
            $("#tree").slideUp();
            console.log(err);
        },
    });
}

function getDateFormat(fbds) {
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
    if (fbds[1] != "00" && fbds[2] != "00" && fbds[0] != "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
        fbd = fbdsDate.format("j M Y");
        if (dateFormat > 0) {
            fbd = fbdsDate.format(fullDateFormat);
        }
    } else if (fbds[1] != "00" && fbds[2] == "00" && fbds[0] != "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else if (fbds[1] != "00" && fbds[2] == "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else {
        // month is zero-indexed(!)
        fbdsDate = new Date(fbds[0], 0, 1);
        fbd = fbdsDate.format("Y");
    }
    return fbd;
}

function bdDatesStatus(person) {
    statusChoice = "symbols";
    abbr = false;
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

function displayFullDates(fPerson, showStatus = true) {
    mbdDatesStatus = bdDatesStatus(fPerson);
    bdStatus = mbdDatesStatus[0];
    ddStatus = mbdDatesStatus[1];

    fbd = "";
    fdd = "";

    fDates = [];

    if (
        fPerson["BirthDate"] != "" &&
        fPerson["BirthDate"] != "0000-00-00" &&
        typeof fPerson["BirthDate"] != "undefined"
    ) {
        fbds = fPerson["BirthDate"].split("-");
        if (fbds[0] == "unkno5") {
            fbd = "";
        } else {
            fbd = getDateFormat(fbds);
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
            fdds = fPerson["DeathDate"].split("-");

            if (fdds[0] == "unkno5") {
                fdd = "";
            } else {
                fdd = getDateFormat(fdds);
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

function monthFormat(aDate, opt) {
    sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    lMonths = [
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
    gotit = false;
    if (opt == "short") {
        lMonths.forEach(function (aMonth, i) {
            reg = new RegExp(aMonth, "g");
            if (aDate.match(reg) != null) {
                theDate = aDate.replace(reg, sMonths[i]);
                gotit = true;
            }
        });
    } else {
        if (gotit == false) {
            sMonths.forEach(function (aMonth, i) {
                reg = new RegExp(aMonth, "i");
                if (aDate.match(reg) != null) {
                    theDate = aDate.replace(reg, lMonths[i]);
                    gotit = true;
                }
            });
        }
    }
    if (gotit == false) {
        return aDate;
    } else {
        return theDate;
    }
}

function ymdFix(date) {
    if (date == undefined || date == "") {
        outDate = "";
    } else {
        dateBits1 = date.split(" ");
        if (dateBits1[2]) {
            //console.log(dateBits1);
            sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            lMonths = [
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
            dMonth = date.match(/[A-z]+/i);
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
            dDate = date.match(/\b[0-9]{1,2}\b/);
            dDateNum = dDate[0];
            dYear = date.match(/\b[0-9]{4}\b/);
            dYearNum = dYear[0];
            return dYearNum + "-" + dMonthNum + "-" + dDateNum;
        } else {
            dateBits = date.split("-");
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

function isOK(thing) {
    excludeValues = ["", null, "null", "0000-00-00", "unknown", "Unknown", "undefined", undefined, "0000", "0", 0];
    //console.log(thing);
    if (!excludeValues.includes(thing)) {
        if (isNumeric(thing)) {
            return true;
        } else {
            if (jQuery.type(thing) === "string") {
                nanMatch = thing.match(/NaN/);
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

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function location2ways(locationText) {
    alSplit = locationText.split(",");
    const alSplit2 = alSplit.map((string) => string.trim());
    s2b = alSplit2.join(", ");
    b2s = alSplit2.reverse().join(", ");
    return [s2b, b2s];
}

function isUSA(locationText) {
    oLocations = locationText.split(/, ?/);
    oLocations.forEach(function (bit) {
        isUS = false;
        USstatesObjArray.forEach(function (obj) {
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
    return isUS;
}

function topKFrequent(nums, k) {
    let hash = {};

    for (let num of nums) {
        if (!hash[num]) hash[num] = 0;
        hash[num]++;
    }

    const hashToArray = Object.entries(hash);
    const sortedArray = hashToArray.sort((a, b) => b[1] - a[1]);
    const sortedElements = sortedArray.map((num) => parseInt(num[0]));
    return sortedElements.slice(0, k);
}

function secondarySort2(dTable, dataThing1, dataThing2, isText = 0, reverse = 0) {
    lastOne = "Me";
    tempArr = [lastOne];

    hasTbody = false;
    if (dTable.find("tbody")) {
        hasTbody = true;
    }

    if (hasTbody == true) {
        rows = dTable.find("tbody tr");
    } else {
        rows = dTable.find("tr");
    }
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

function secondarySort3(aList, dataThing1, dataThing2, isText = 0, reverse = 0) {
    lastOne = "Me";
    tempArr = [lastOne];

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

function fillLocations(rows, order) {
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

function sortByThis(el) {
    el.click(function () {
        sorter = el.attr("id");
        rows = aTable.find("tbody tr");
        if (sorter == "birthlocation" || sorter == "deathlocation") {
            if (sorter == "birthlocation") {
                if (el.attr("data-order") == "s2b") {
                    sorter = "birthlocation-reversed";
                    el.attr("data-order", "b2s");
                    rows = fillLocations(rows, "-reversed");
                } else {
                    el.attr("data-order", "s2b");
                    rows = fillLocations(rows, "");
                }
            } else if (sorter == "deathlocation") {
                if (el.attr("data-order") == "s2b") {
                    sorter = "deathlocation-reversed";
                    el.attr("data-order", "b2s");
                    rows = fillLocations(rows, "-reversed");
                } else {
                    el.attr("data-order", "s2b");
                    rows = fillLocations(rows, "");
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
            toBottom = ["", "00000000"];
            if (toBottom.includes(el.data(sorter))) {
                aTable.find("tbody").append(el);
            }
        });
        aTable.find("tr.main").prependTo(aTable.find("tbody"));
    });
}

async function addPeopleTable() {
    $("#savePeople").show();
    aCaption = "<caption></caption>";

    degreeTH = "";
    createdTH = "";
    touchedTH = "";
    parentsNum = "";
    siblingsNum = "";
    spousesNum = "";
    childrenNum = "";
    ageAtDeathCol = "";
    if ($("body.cc7Table").length) {
        if ($("span.none").length == 0) {
            //aCaption = "<caption><span><span class='none'></span>: 'No more spouses/children' box is checked / Died young</span></caption>";
        }

        degreeTH = "<th id='degree'>°</th>";
        createdTH = "<th id='created'  data-order='asc'>Created</th>";
        touchedTH = "<th id='touched'  data-order='asc'>Modified</th>";
        parentsNum = "<th id='parent' title='Parents' data-order='desc'>Par.</th>";
        siblingsNum = "<th id='sibling'  title='Siblings'  data-order='desc'>Sib.</th>";
        spousesNum = "<th id='spouse'  title='Spouses'  data-order='desc'>Sp.</th>";
        childrenNum = "<th id='child'  title='Children'  data-order='desc'>Ch.</th>";

        //if (Cookies.get("isme")==1){
        ageAtDeathCol = "<th id='age-at-death' title='Age at Death'  data-order='desc'>Age</th>";
        //}
    }
    aTable = $(
        "<table id='peopleTable' class='peopleTable'>" +
            aCaption +
            "<thead><tr><th></th><th></th><th></th>" +
            degreeTH +
            parentsNum +
            siblingsNum +
            spousesNum +
            childrenNum +
            "<th id='firstname' data-order=''>Given name(s)</th><th id='lnab'>Last name at Birth</th><th id='lnc' data-order=''>Current Last Name</th><th id='birthdate' data-order=''>Birth date</th><th data-order='' id='birthlocation'>Birth place</th><th data-order='' id='deathdate'>Death date</th><th data-order='' id='deathlocation'>Death place</th>" +
            ageAtDeathCol +
            createdTH +
            touchedTH +
            "</tr></thead><tbody></tbody></table>"
    );

    if ($(".peopleTable").length) {
        $(".peopleTable").eq(0).replaceWith(aTable);
    } else {
        aTable.appendTo($("body"));
    }

    //if (window.location.href.match("testing")) {
    function makePrivateAncestor(ancestor, degree, gender, name, firstname, lnab, lnc) {
        person = ancestor;
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
            personClone = JSON.parse(JSON.stringify(person));
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
                console.log(1);
                window.people.forEach(function (person) {
                    if (person.Id == aGrandparent.Father || person.Id == aGrandparent.Mother) {
                        console.log(2);
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
                        console.log(person);
                    }
                });
            }
        });
    }
    //}

    window.people.forEach(function (mPerson, index) {
        pDates = displayFullDates(mPerson);
        birthDate = ymdFix(mPerson.BirthDate);
        if (birthDate == "") {
            if (mPerson.BirthDateDecade) {
                birthDate = mPerson.BirthDateDecade;
            }
        }
        deathDate = ymdFix(mPerson.DeathDate);
        if (deathDate == "") {
            if (mPerson.deathDateDecade) {
                deathDate = mPerson.DeathDateDecade;
            }
        }

        bYear = parseInt(birthDate.substring(0, 4));

        birthLocation = mPerson.BirthLocation;
        if (birthLocation == "null" || birthLocation == undefined) {
            birthLocation = "";
            birthLocationReversed = "";
        } else {
            bLocation2ways = location2ways(birthLocation);
            birthLocation = bLocation2ways[0];
            birthLocationReversed = bLocation2ways[1];
        }
        deathLocation = mPerson.DeathLocation;
        if (deathLocation == "null" || deathLocation == undefined) {
            deathLocation = "";
            deathLocationReversed = "";
        } else {
            dLocation2ways = location2ways(deathLocation);
            deathLocation = dLocation2ways[0];
            deathLocationReversed = dLocation2ways[1];
        }

        function setLocations(mPerson) {
            oLocations = [];
            mParr = [mPerson];
            checkEm = [mParr, mPerson.Parent, mPerson.Spouse, mPerson.Sibling, mPerson.Child];

            checkEm.forEach(function (anArr) {
                if (anArr) {
                    anArr.forEach(function (aPers) {
                        if (aPers.BirthLocation) {
                            bits = aPers.BirthLocation.split(",");
                            bits.forEach(function (aBit) {
                                bit = aBit.trim();
                                if (!oLocations.includes(bit)) {
                                    oLocations.push(bit);
                                }
                                isUS = false;
                                USstatesObjArray.forEach(function (obj) {
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
                            bits = aPers.DeathLocation.split(",");
                            bits.forEach(function (aBit) {
                                bit = aBit.trim();
                                if (!oLocations.includes(bit)) {
                                    oLocations.push(bit);
                                }
                                isUS = false;
                                USstatesObjArray.forEach(function (obj) {
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

        //console.log(mParent);

        oLocations = setLocations(mPerson).join(",");

        privacyLevel = mPerson.Privacy;

        if (mPerson.Privacy_IsOpen == true || privacyLevel == 60) {
            privacy = "images/privacy_open.png";
            privacyTitle = "Open";
        }
        if (mPerson.Privacy_IsPublic == true) {
            privacy = "images/privacy_public.png";
            privacyTitle = "Public";
        }
        if (mPerson.Privacy_IsSemiPrivate == true || privacyLevel == 40) {
            privacy = "images/privacy_public-tree.png";
            privacyTitle = "Private with Public Bio and Tree";
        }
        if (privacyLevel == 35) {
            privacy = "images/privacy_privacy35.png";
            privacyTitle = "Private with Public Tree";
        }
        if (mPerson.Privacy_IsSemiPrivateBio == true || privacyLevel == 30) {
            privacy = "images/privacy_public-bio.png";
            privacyTitle = "Public Bio";
        }
        if (privacyLevel == 20) {
            privacy = "images/privacy_private.png";
            privacyTitle = "Private";
        }
        firstName = mPerson.FirstName;
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

        if (mPerson.BirthDate) {
            dBirthDate = mPerson.BirthDate.replaceAll("-", "");
        } else if (mPerson.BirthDateDecade) {
            dBirthDate = getApproxDate2(mPerson.BirthDateDecade).Date.replace("-", "").padEnd(8, "0");
        } else {
            dBirthDate = "00000000";
        }

        if (mPerson.DeathDate) {
            dDeathDate = mPerson.DeathDate.replaceAll("-", "");
        } else if (mPerson.DeathDateDecade) {
            dDeathDate = getApproxDate2(mPerson.DeathDateDecade).Date.replace("-", "").padEnd(8, "0");
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
        oLink =
            "<a target='_blank' href='https://www.wikitree.com/wiki/" +
            htmlEntities(mPerson.Name) +
            "'>" +
            firstName +
            "</a>";

        degreeCell = "";
        touched = "";
        created = "";
        ddegree = "";
        dtouched = "";
        dcreated = "";
        ageAtDeathCell = "";
        dAgeAtDeath = "";
        diedYoung = false;

        relNums = {
            Parent_data: "",
            Sibling_data: "",
            Spouse_data: "",
            Child_data: "",
            Parent_cell: "",
            Sibling_cell: "",
            Spouse_cell: "",
            Child_cell: "",
        };

        if ($("body.cc7Table").length) {
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

            mAgeAtDeath = ageAtDeath(mPerson);
            mAgeAtDeathNum = ageAtDeath(mPerson, false);

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
            rArr = ["Parent", "Sibling", "Spouse", "Child"];
            rArr.forEach(function (aR) {
                cellClass = "class='number'";
                if (mPerson[aR].length) {
                    relNums[aR] = mPerson[aR].length;
                } else {
                    relNums[aR] = "";
                }
                relNums[aR + "_data"] = "data-" + aR + "='" + relNums[aR] + "'";
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
                relNums["Parent_cell"] = "<td class='noFather number' title='missing father'>0</td>";
            } else if (!mPerson.Mother) {
                relNums["Parent_cell"] = "<td class='noMother number' title='missing mother'>0</td>";
            }
        }

        diedYoungImg = "";
        diedYoungClass = "";
        if (diedYoung == true) {
            diedYoungClass = "diedYoung";
            diedYoungImg = "<img  src='images/diedYoung.png' class='diedYoungImg'>";
        }

        let gender = mPerson.Gender;
        if (mPerson?.DataStatus?.Gender == "blank") {
            gender = "blank";
        }

        aLine = $(
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
                htmlEntities(mPerson.Name) +
                "' data-locations='" +
                htmlEntities(oLocations) +
                "' data-firstname='" +
                htmlEntities(firstName) +
                "' data-lnab='" +
                htmlEntities(mPerson.LastNameAtBirth) +
                "'  data-lnc='" +
                htmlEntities(mPerson.LastNameCurrent) +
                "' data-birthdate='" +
                dBirthDate +
                "' data-deathdate='" +
                dDeathDate +
                "' data-birthlocation='" +
                htmlEntities(birthLocation) +
                "' data-birthlocation-reversed='" +
                htmlEntities(birthLocationReversed) +
                "' data-deathlocation='" +
                htmlEntities(deathLocation) +
                "' data-deathlocation-reversed='" +
                htmlEntities(deathLocationReversed) +
                "' class='" +
                gender +
                "'><td><img class='privacyImage' src='" +
                privacy +
                "' title='" +
                privacyTitle +
                "'></td><td><img class='familyHome' src='images/Home_icon.png'></td><td><img class='timelineButton' src='images/timeline.png'></td>" +
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
                htmlEntities(mPerson.LastNameAtBirth) +
                "'>" +
                mPerson.LastNameAtBirth +
                "</a></td><td class='lnc'><a   target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
                htmlEntities(mPerson.LastNameCurrent) +
                "'>" +
                mPerson.LastNameCurrent +
                "</a></td><td class='aDate birthdate'>" +
                birthDate +
                "</td><td class='location birthlocation'>" +
                htmlEntities(birthLocation) +
                "</td><td  class='aDate deathdate'>" +
                deathDate +
                "</td><td class='location deathlocation'>" +
                htmlEntities(deathLocation) +
                "</td>" +
                ageAtDeathCell +
                created +
                touched +
                "</tr>"
        );

        aTable.find("tbody").append(aLine);
    });

    if ($("body.cc7Table").length == 0) {
        $(".peopleTable caption").click(function () {
            $(this).parent().find("thead,tbody").slideToggle();
        });
    }

    $("img.familyHome").click(function () {
        showFamilySheet($(this));
    });
    $("img.timelineButton").click(function (event) {
        window.pointerX = event.pageX;
        window.pointerY = event.pageY;
        timeline($(this).closest("tr"));
    });

    aTable.find("th[id]").each(function () {
        sortByThis($(this));
    });
    addWideTableButton();
    firstTime = true;
    //if (window.location.href.match("cc7_table_testing")) {
    if ($("#hierarchyViewButton").length == 0) {
        $("#wideTableButton").before(
            $(
                "<button class='button small viewButton' id='hierarchyViewButton'>Hierarchy</button><button class='button small  viewButton' id='listViewButton'>List</button><button class=' viewButton button active small' id='tableViewButton'>Table</button>"
            )
        );
    }
    $("#listViewButton").on("click", function () {
        $(".viewButton").removeClass("active");
        $(this).addClass("active");
        $("#peopleTable,#hierarchyView").hide();
        if ($("#lanceTable").length == 0) {
            lanceView();
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
            hierarchyCC7();
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
    // }

    locationFilterSP = $(
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
            rows = $(".peopleTable tbody tr");
            locations = $("#spLocationFilter").val().split(",");
            const locationsT = locations.map((string) => string.trim());
            oLocations = [];

            rows.each(function () {
                keepIt = false;

                thisLocations = $(this).attr("data-locations");
                if (thisLocations != "") {
                    thisLocationsSplit = thisLocations.split(",");
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
            //}
        }
    });
    $("#spLocationFilter").keypress(function (e) {
        if (e.which == 13) {
            $("#spLocationFilterButton").click();
        }
    });

    $("#tree").slideUp();
    $("#countdown").fadeOut();
    if ($("body.cc7Table").length == 0) {
        $("#birthdate").click();
    }

    cc7excelOut();
}

function averageMarriageAge() {
    marriedPeople = 0;
    marriedAtDays = 0;
    countedMarriedPeople = [];
    maleAge = 0;
    femaleAge = 0;
    countedCouples = 0;
    marriageAgeArray = [];
    marriageAgeYArray = [];
    marriageAgeArray2 = [];
    marriageAgeYArray2 = [];
    window.people.forEach(function (aPer) {
        if (aPer.Spouse) {
            marriage_date = aPer.Spouse[0]?.marriage_date;

            if (isOK(marriage_date)) {
                //if (century == 0 || )
                marriageDate = ymdFix(marriage_date);
                mYear = marriageDate.match(/[0-9]{4}/);
                if (mYear != null) {
                    marriageYear = mYear[0];
                } else {
                    marriageYear = false;
                }
                century = marriageYear.substring(0, 2);

                c_dDate = getApproxDate2(marriageDate);
                dt2 = c_dDate.Date;

                if (isOK(aPer.BirthDate)) {
                    birthDate = ymdFix(aPer.BirthDate);
                    c_bDate = getApproxDate2(birthDate);
                    dt1 = c_bDate.Date;
                    marriedAt = getAge2(dt1, dt2);
                    aPer.MarriedAt = marriedAt;
                    if (!countedMarriedPeople.includes(aPer.Name)) {
                        marriedAtDays = marriedAtDays + marriedAt[2];
                        marriedPeople++;
                        countedMarriedPeople.push(aPer.Name);
                        marriageAgeArray.push(marriedAt[2]);
                        marriageAgeYArray.push(marriedAt[0]);
                        marriageAgeArray2.push([century, marriedAt[2]]);
                        marriageAgeYArray2.push([century, marriedAt[0]]);
                    }
                }
                if (isOK(aPer.Spouse[0].BirthDate)) {
                    spBirthDate = ymdFix(aPer.Spouse[0].BirthDate);
                    sp_bDate = getApproxDate2(spBirthDate);
                    spDt1 = sp_bDate.Date;
                    spMarriedAt = getAge2(spDt1, dt2);
                    aPer.Spouse[0].MarriedAt = spMarriedAt;
                    if (!countedMarriedPeople.includes(aPer.Spouse[0].Name)) {
                        marriedAtDays = marriedAtDays + spMarriedAt[2];
                        marriedPeople++;
                        countedMarriedPeople.push(aPer.Spouse[0].Name);
                        marriageAgeArray.push(spMarriedAt[2]);
                        marriageAgeYArray.push(spMarriedAt[0]);
                        marriageAgeArray2.push([century, spMarriedAt[2]]);
                        marriageAgeYArray2.push([century, spMarriedAt[0]]);
                    }
                }
                if (isOK(aPer.BirthDate) && isOK(aPer.Spouse[0].BirthDate)) {
                    if (aPer.Gender == "Male") {
                        maleAge = maleAge + marriedAt[2];
                        femaleAge = femaleAge + spMarriedAt[2];
                    } else {
                        maleAge = maleAge + spMarriedAt[2];
                        femaleAge = femaleAge + marriedAt[2];
                    }
                    countedCouples++;
                }
            }
        }
    });

    averageMarriedAt = Math.round(marriedAtDays / marriedPeople / 365.25);
    averageAgeDiff = Math.round((maleAge - femaleAge) / countedCouples / 365.25);
    marriageAgeArray.sort(function (a, b) {
        return a - b;
    });
    medianMarriedAt = Math.round(marriageAgeArray[Math.round(marriageAgeArray.length / 2)] / 365.25);
    modeMarriedAt = topKFrequent(marriageAgeYArray, 1);

    return {
        AgeDifference: averageAgeDiff,
        MeanAge: averageMarriedAt,
        MedianAge: medianMarriedAt,
        ModeAge: modeMarriedAt,
    };
}

function getApproxDate(theDate) {
    approx = false;
    if (theDate.match(/0s$/) != null) {
        aDate = theDate.replace(/0s/, "5");
        approx = true;
    } else {
        bits = theDate.split("-");
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

function getApproxDate2(theDate) {
    approx = false;
    if (theDate.match(/0s$/) != null) {
        aDate = theDate.replace(/0s/, "5");
        approx = true;
    } else {
        bits = theDate.split("-");
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

function getAge2(start, end) {
    startSplit = start.split("-");
    start_day = parseInt(startSplit[2]);
    start_month = parseInt(startSplit[1]);
    start_year = parseInt(startSplit[0]);

    endSplit = end.split("-");
    end_day = parseInt(endSplit[2]);
    end_month = parseInt(endSplit[1]);
    end_year = parseInt(endSplit[0]);

    month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    function isLeapYear(year) {
        return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
    }

    if (isLeapYear(start_year)) {
        month[1] = 29;
    }
    firstMonthDays = month[start_month - 1] - start_day;

    restOfYearDays = 0;
    for (i = start_month; i < 12; i++) {
        restOfYearDays = restOfYearDays + month[i];
    }
    firstYearDays = firstMonthDays + restOfYearDays;
    fullYears = end_year - (start_year + 1);
    lastYearMonthDays = 0;
    if (isLeapYear(end_year)) {
        month[1] = 29;
    } else {
        month[1] = 28;
    }
    for (i = 0; i < end_month - 1; i++) {
        lastYearMonthDays = lastYearMonthDays + month[i];
    }
    lastYearDaysTotal = 0;
    lastYearDaysTotal = end_day + lastYearMonthDays;
    totalExtraDays = lastYearDaysTotal + firstYearDays;
    if (totalExtraDays > 364) {
        fullYears++;
        yearDays = 365;
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
    totalDays = Math.round(fullYears * 365.25) + andDays;
    return [fullYears, andDays, totalDays];
}

function getDateFormat(fbds) {
    //console.log(fbds);
    fullDateFormat = "j M Y";

    if (Cookies.get("w_dateFormat")) {
        dateFormat = Cookies.get("w_dateFormat");
    } else {
        dateFormat = 0;
        fullDateFormat = "M j, Y";
    }
    //console.log(dateFormat);
    if (dateFormat == 1) {
        fullDateFormat = "j M Y";
    }
    if (dateFormat == 2) {
        fullDateFormat = "F j, Y";
    } else if (dateFormat == 3) {
        fullDateFormat = "j F Y";
    }

    //console.log(fullDateFormat);
    //console.log(fbds);
    if (fbds[1] != "00" && fbds[2] != "00" && fbds[0] != "00") {
        // month is zero-indexed(!)
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
        //console.log(fbdsDate);
        fbd = fbdsDate.format("j M Y");
        if (dateFormat > 0) {
            fbd = fbdsDate.format(fullDateFormat);
            //console.log(fbd);
        }
    } else if (fbds[1] != "00" && fbds[2] == "00" && fbds[0] != "00") {
        // month is zero-indexed(!)
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else if (fbds[1] != "00" && fbds[2] == "00") {
        // month is zero-indexed(!)
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
        //console.log(fbd);
    } else {
        // month is zero-indexed(!)
        fbdsDate = new Date(fbds[0], 0, 1);
        fbd = fbdsDate.format("Y");
    }

    //console.log(fbds,fbd);

    return fbd;
}

function displayDates(fPerson) {
    mbdDatesStatus = bdDatesStatus(fPerson);
    bdStatus = mbdDatesStatus[0]; //console.log(bdStatus);
    ddStatus = mbdDatesStatus[1]; //console.log(ddStatus);

    fbd = "";
    fdd = "";

    if (
        fPerson["BirthDate"] != "" &&
        fPerson["BirthDate"] != "0000-00-00" &&
        typeof fPerson["BirthDate"] != "undefined" &&
        fPerson["BirthDate"] != "unknown"
    ) {
        fbd = fPerson["BirthDate"].split("-")[0];

        //console.log(fbd);
    } else if (typeof fPerson["BirthDateDecade"] != "undefined" && fPerson["BirthDateDecade"] != "unknown") {
        fbd = fPerson["BirthDateDecade"];
        decadeMidpoint = fPerson["BirthDateDecade"].slice(0, -2) + 5;
        //console.log(fbd);
        //fPerson["BirthDate"]=decadeMidpoint+"-00-00";
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
            decadeMidpoint = fPerson["DeathDateDecade"].slice(0, -2) + 5;
            //	fPerson["DeathDate"]=decadeMidpoint+"-00-00";
        } else {
            fdd = "";
        }
    }

    fDates = "(" + bdStatus + fbd + " - " + ddStatus + fdd + ")";

    return fDates;
}

function displayFullDates(fPerson, showStatus = true) {
    mbdDatesStatus = bdDatesStatus(fPerson);
    bdStatus = mbdDatesStatus[0]; //console.log(bdStatus);
    ddStatus = mbdDatesStatus[1]; //console.log(ddStatus);

    fbd = "";
    fdd = "";

    fDates = [];

    if (
        fPerson["BirthDate"] != "" &&
        fPerson["BirthDate"] != "0000-00-00" &&
        typeof fPerson["BirthDate"] != "undefined"
    ) {
        fbds = fPerson["BirthDate"].split("-");
        if (fbds[0] == "unkno5") {
            fbd = "";
        } else {
            fbd = getDateFormat(fbds);
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

    //console.log(fbd,fDates);

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
            fdds = fPerson["DeathDate"].split("-");

            if (fdds[0] == "unkno5") {
                fdd = "";
            } else {
                fdd = getDateFormat(fdds);
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

    /*
      if (fsPerson.Prefix){
          prefix = "<span class='prefix'>("+fsPerson.Prefix+")</span> ";
      }		
      if (fsPerson.Suffix){
          suffix = " <span class='suffix'>("+fsPerson.Suffix+")</span>";
      }
  */
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

function storeVal(jq) {
    if (jq.attr("type") == "checkbox") {
        if (jq.prop("checked") == true) {
            localStorage.setItem(jq.attr("id"), 1);
        } else {
            localStorage.setItem(jq.attr("id"), 0);
        }
    } else if (jq.attr("type") == "radio") {
        $("input[name='" + jq.attr("name") + "']").each(function () {
            if ($(this).prop("checked") == true) {
                localStorage.setItem($(this).attr("name"), $(this).val());
            }
        });
    }
    //console.log(localStorage);
}

function setVals() {
    checkboxes = $("#fgsOptions input[type='checkbox']");
    checkboxes.each(function () {
        oVal = $(this).prop("checked");
        //console.log($(this).attr("id"),localStorage[$(this).attr("id")]);
        if (localStorage[$(this).attr("id")] == "1") {
            $(this).prop("checked", true);
            if (oVal == false) {
                $(this).change();
            }
        } else if (localStorage[$(this).attr("id")] == "0") {
            $(this).prop("checked", false);
            if (oVal == true) {
                $(this).change();
            }
        }
    });
    radios = $("#fgsOptions input[type='radio']");
    radios.each(function () {
        oVal = $(this).prop("checked");
        if (localStorage[$(this).attr("name")] == $(this).val()) {
            $(this).prop("checked", true);
            if (oVal == false) {
                $(this).change();
            }
        } else if (localStorage[$(this).attr("name")] != undefined) {
            $(this).prop("checked", false);
            if (oVal == true) {
                $(this).change();
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
    if (oChildren.length > 0) {
        window.people[0].Child.forEach(function (aChild, index) {
            //console.log(aChild);
            window.people.forEach(function (cPerson) {
                //	console.log(cPerson);

                //console.log(window.husband);
                if (window.husband == undefined) {
                    window.husband = 0;
                }
                if (window.wife == undefined) {
                    window.wife = 0;
                }

                if (
                    cPerson.Name == aChild.Name &&
                    ((cPerson.Father == window.husband && cPerson.Mother == window.wife) ||
                        (window.husband == 0 && cPerson.Mother == window.wife) ||
                        (window.husband == cPerson.Father && 0 == window.wife))
                ) {
                    if (!doneKids.includes(aChild.Name)) {
                        //console.log(index);

                        theChildRow = familySheetPerson(cPerson, ordinal(index + 1) + " Child");
                        fsTable.find("> tbody").append($(theChildRow));
                        doneKids.push(cPerson.Name);
                    }
                }
            });
        });
    }

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

        function fixCitation(citation) {
            tableMatch = citation.matchAll(/\{\|[^]+?\|\}/gm);
            listMatch = citation.matchAll(/\n:+[A-z]+.*/gm);
            //console.log(listMatch);

            madeList = false;
            if (listMatch != null) {
                aList = "\n<ul class='sourceUL'>\n";
                for (const lMatch of listMatch) {
                    aList += "<li>" + lMatch[0].replace(/\n:+/, "") + "</li>\n";
                    madeList = true;
                }
                aList += "</ul>\n";
                if (madeList == true) {
                    citation += aList;
                    citation = citation.replaceAll(/\n:+[A-z]+.*/gm, "");
                }
            }

            if (tableMatch != null) {
                newTable = [];
                for (const aMatch of tableMatch) {
                    aTable = "<table class='citationTable' id='citationTable_" + window.citationTables.length + "'>";
                    lines = aMatch[0].matchAll(
                        /[|!](.*?)\|\|(.*?)(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?\n/g
                    );
                    for (line of lines) {
                        aRow = [];
                        aTableRow = "<tr>";
                        for (i = 1; i < 10; i++) {
                            if (line[i] != undefined) {
                                aRow.push(line[i].replace("||", ""));
                                aTableRow += "<td>" + line[i].replace("||", "") + "</td>";
                            }
                        }
                        newTable.push(aRow);
                        aTableRow += "</tr>\n";
                        aTable += aTableRow;
                    }
                    aTable += "</table>";
                    window.citationTables.push(newTable);
                    newMatch = aMatch[0].replaceAll(/([!|{}()\-.\[\]])/g, "\\$1");
                    re = new RegExp(newMatch, "m");
                    citation = citation.replace(re, aTable);
                }
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

            eeMatch = citation.match(/\{\{EE source[\s\S]*?\}\}/gm);
            if (eeMatch != null) {
                eeData = {};
                //console.log(eeMatch);
                dataBits = eeMatch[0].replaceAll(/[{}\n]/g, "").split("|");
                dataBits.forEach(function (aBit) {
                    aBitBits = aBit.split("=");
                    if (aBitBits[1]) {
                        eeData[aBitBits[0].replace("-", "_")] = aBitBits[1];
                    }
                });
                //console.log(dataBits);
                //console.log(eeData);

                eeName = "";
                if (eeData.last) {
                    punc = "";
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

                eeCitation =
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
                //console.log(eeCitation);
                reg = new RegExp(eeMatch[0].replaceAll(/([!|{}()\-.\[\]])/g, "\\$1"), "m");
                citation = citation.replace(reg, eeCitation);
            }

            return citation;
        }

        window.references.forEach(function (pRefs) {
            anID = pRefs[0];
            thisName = $("tr[data-name='" + htmlEntities(anID) + "'] .fsName")
                .eq(0)
                .text()
                .replace(/(Female)|(Male)\b/, "")
                .replace(/([a-z])(\)\s)?[MF]\b/, "$1$2");

            wtidMatch = thisName.match(/\(\b[^\s]+\-[0-9]+\)/);
            aSpan = "";
            if (wtidMatch != null) {
                thisName = thisName.replace(/\(\b[^\s]+\-[0-9]+\)/, "");
                aSpan = $("<span class='fsWTID'>" + htmlEntities(wtidMatch) + "</span>");
            }

            /*
              if ($("#showWTIDs").prop("checked")==false){
                  thisName = thisName.replace(/\b.*\-[0-9]+/,"");
              }
              */
            anLI = $(
                "<li data-wtid='" +
                    anID +
                    "'><a class='sourcesName' href='https://www.wikitree.com/wiki/" +
                    anID +
                    "'>" +
                    thisName +
                    "</a></li>"
            );
            anLI.find("a").append(aSpan);
            aUL = $("<ul></ul>");
            pRefs[1].forEach(function (aRef) {
                aUL.append($("<li>" + fixCitation(aRef) + "</li>"));
            });
            if (pRefs[2] != "") {
                anLI2 = $("<li><span>See also:</span></li>");
                aUL2 = $("<ul></ul>");
                pRefs[2].forEach(function (aSA) {
                    aUL2.append($("<li>" + fixCitation(aSA) + "</li>"));
                });
                aUL2.appendTo(anLI2);
                anLI2.appendTo(aUL);
            }

            aUL.appendTo(anLI);
            anLI.appendTo(mList);
        });
        const params = new URLSearchParams(window.location.search);
        //if (params.has('test')){
        $("#sources").append(mList);
        //	}
        $("#sources li[data-wtid='" + window.husbandWTID + "']").prependTo($("#sources ul").eq(0));

        $("#notesNotes").click(function () {
            if ($(this).find("textarea").length == 0) {
                textBox = $("<textarea class='edit'>" + br2nl($(this).html()) + "</textarea>");
                $(this).text("");
                $(this).append(textBox);
                textBox.focus();

                textBox.focusout(function () {
                    closeInputs();
                });
            }
        });

        setBaptChrist();

        $(".bioHeading").click(function () {
            $(this).next().find(".theBio").slideToggle();
        });

        function toggleTables() {
            //console.log($("#showTables").prop("checked"));
            if ($("#showTables").prop("checked") == true) {
                $(".citationTable").hide();
            } else {
                $(".citationTable").show();
            }
            $("#citationList li li").each(function () {
                textNodes = $(this)
                    .contents()
                    .filter(function () {
                        return this.nodeType === Node.TEXT_NODE;
                    });
                if ($(this).find(".citationTable:visible").length) {
                    lastNode = textNodes[textNodes.length - 1];
                    //	console.log(textNodes);

                    if (lastNode.textContent.match(/:(\W|\n)*/) != null && !window.removedTableHeading) {
                        //console.log("match");
                        textNodes[textNodes.length - 1].textContent = textNodes[
                            textNodes.length - 1
                        ].textContent.replace(/[A-Z][a-z]+:[\W\n]*?$/m, "");
                        window.removedTableHeading = true;
                    }

                    $(this).find(".citationTable").hide();
                } else if ($(this).find(".citationTable").length) {
                    $(this).find(".citationTable").show();
                }
            });
        }
        function toggleLists() {
            if ($("#showLists").prop("checked") == true) {
                $(".sourceUL").show();
            } else {
                $(".sourceUL").hide();
            }
        }

        $("#showTables").change(function () {
            toggleTables();
            storeVal($(this));
        });
        $("#showLists").change(function () {
            toggleLists();
            storeVal($(this));
        });

        $("#citationList li li").click(function () {
            closeInputs();
            if ($(this).find("textarea").length == 0) {
                newTextarea = $("<textarea class='citationEdit'>" + $(this).html() + "</textarea>");
                $(this).html(newTextarea);
                newTextarea.focus();
                newTextarea.on("blur", function (e) {
                    if ($(this).val() == "") {
                        $(this).parent().remove();
                    } else {
                        $(this).parent().html($(this).val());
                        $(this).remove();
                    }
                });
            }
        });

        if ($(".bioRow").length) {
            $("#toggleBios,#includeBiosWhenPrinting").css("display", "inline-block");
            $("#includeBios").change(function () {
                storeVal($(this));
                if ($(this).prop("checked") == true) {
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

        $("input[name='showGender']").change(function () {
            storeVal($(this));
            showGenderVal = $("input[name='showGender']:checked").val();
            $(".fsGender").each(function () {
                $(this).text("");
                if (showGenderVal == "initial") {
                    $(this).text($(this).attr("data-gender").substring(0, 1));
                }
                if (showGenderVal == "word") {
                    $(this).text($(this).attr("data-gender"));
                }
            });
        });

        $("#fgsInfo").slideDown();

        if ($("tr.roleRow[data-role='Husband']").attr("data-name") == "undefined") {
            $("tr[data-role='Husband']").remove();
            $("#husbandFirstLabel").hide();
        } else if ($("tr.roleRow[data-role='Wife']").attr("data-name") == "undefined") {
            $("tr[data-role='Wife']").remove();
            $("#husbandFirstLabel").hide();
        } else if (people[0].Gender == "Male") {
            $("#husbandFirstLabel").hide();
        } else {
            $("#husbandFirstLabel").css("display", "inline-block");
        }
        if (
            $("tr.roleRow[data-role='Wife']").attr("data-gender") == "" ||
            $("tr.roleRow[data-role='Husband']").length == 0
        ) {
            $("tr.roleRow[data-role='Wife'] th a").text("Name");
            $("tr.WifeParentsRow[data-role='Wife'] th.WifeFatherHeading a").text("Father");
            if ($("tr.WifeParentsRow[data-role='Wife'] th.WifeFatherHeading a").length == 0) {
                $("tr.WifeParentsRow[data-role='Wife'] th.WifeFatherHeading").text("Father:");
            }
            $("tr.WifeParentsRow[data-role='Wife'] th.WifeMotherHeading a").text("Mother");
            if ($("tr.WifeParentsRow[data-role='Wife'] th.WifeMotherHeading a").length == 0) {
                $("tr.WifeParentsRow[data-role='Wife'] th.WifeMotherHeading").text("Mother:");
            }
        }
        if (
            $("tr.roleRow[data-role='Husband']").attr("data-gender") == "" ||
            $("tr.roleRow[data-role='Wife']").length == 0
        ) {
            $("tr.roleRow[data-role='Husband'] th a").text("Name");
            $("tr.HusbandParentsRow[data-role='Husband'] th.HusbandFatherHeading a").text("Father");
            if ($("tr.HusbandParentsRow[data-role='Husband'] th.HusbandFatherHeading a").length == 0) {
                $("tr.HusbandParentsRow[data-role='Husband'] th.HusbandFatherHeading").text("Father:");
            }
            $("tr.HusbandParentsRow[data-role='Husband'] th.HusbandMotherHeading a").text("Mother");
            if ($("tr.HusbandParentsRow[data-role='Husband'] th.HusbandMotherHeading a").length == 0) {
                $("tr.HusbandParentsRow[data-role='Husband'] th.HusbandMotherHeading").text("Mother:");
            }
        }

        $("input[name='statusChoice']").change(function () {
            storeVal($(this));
            isAbbr = false;
            if ($("input[name='statusChoice'][value='abbreviations']").prop("checked") == true) {
                isAbbr = true;
            }
            $(".date").each(function () {
                if (isAbbr) {
                    $(this).text(
                        $(this).text().replaceAll(/~/g, "abt. ").replaceAll(/</g, "bef. ").replaceAll(/>/g, "aft. ")
                    );
                } else {
                    $(this).text(
                        $(this)
                            .text()
                            .replaceAll(/abt\.\s/g, "~")
                            .replaceAll(/bef\.\s/g, "<")
                            .replaceAll(/aft\.\s/g, ">")
                    );
                }
            });
        });

        roles = ["Husband", "Wife"];
        if (
            $("tr.roleRow[data-role='Wife']").attr("data-name") == $("#wtid").val() &&
            localStorage.husbandFirst != "1"
        ) {
            roles = ["Wife", "Husband"];
        }

        if ($("tr[data-gender='Female'][data-role='Husband'],tr[data-gender='Male'][data-role='Wife']").length) {
            localStorage.husbandFirst = 0;
            $("#husbandFirstLabel").hide();
        }

        for (i = 1; i < 31; i++) {
            roles.push(ordinal(i) + " Child");
        }
        divWidth = $("#familySheetFormTable")[0].scrollWidth;
        th1Width = $("#familySheetFormTable > thead > tr > th")[0].scrollWidth;
        th2Width = $("#familySheetFormTable > thead > tr > th:nth-child(2)")[0].scrollWidth;
        th3Width = $("#familySheetFormTable > thead > tr > th:nth-child(3)")[0].scrollWidth;

        // ,#familySheetFormTable > thead > tr > th:first-child{width:"+th1Width+"px;

        $(
            "<style id='newDivs'>#familySheetFormTable,.tableContainer, .tableContainer table {width:" +
                divWidth +
                "px; margin:auto;} .birthHeading} .BirthDate,#familySheetFormTable > thead > tr > th:nth-child(2){width:" +
                th2Width +
                "px; max-width:" +
                th2Width +
                "px;} .BirthPlace{width:" +
                (th3Width - 3) +
                "px;} </style>"
        ).appendTo("body");
        roles.forEach(function (aRole) {
            newDiv = $("<div class='tableContainer " + aRole + "'></div>");
            newTable = $("<table></table>");
            newTbody = $("<tbody></tbody>");
            $("#familySheetFormTable > tbody > tr[data-role='" + aRole + "']").appendTo(newTbody);

            /*
              if (newTbody.find("tr").length){
                  newTbody.appendTo($("#familySheetFormTable"));
              }
              */
            if (newTbody.find("tr").length) {
                newTbody.appendTo(newTable);
                newTable.appendTo(newDiv);
                newDiv.insertBefore("#notesAndSources");
            }
        });

        if ($(".citationTable").length) {
            $("#showTablesLabel").css("display", "inline-block");
        } else {
            $("#showTablesLabel").hide();
        }
        if ($(".sourceUL").length) {
            $("#showListsLabel").css("display", "inline-block");
        } else {
            $("#showListsLabel").hide();
        }
        if ($("tr[data-role='1st Child']").length) {
            $("#showGenderDiv").css("display", "inline-block");
        } else {
            $("#showGenderDiv").hide();
        }
        uncertain = false;
        $(".date").each(function () {
            if (
                $(this)
                    .text()
                    .match(/[~<>]|abt\.|bef.\|aft\./) != null
            ) {
                uncertain = true;
            }
        });
        if (uncertain == false) {
            $("#statusChoice").hide();
        } else {
            $("#statusChoice").css("display", "inline-block");
        }
        setVals();

        if ($(".marriedRow").eq(1)) {
            $(".marriedRow").eq(1).remove();
        }

        if ($(".nicknames").length) {
            $("#showNicknamesLabel").show();
        } else {
            $("#showNicknamesLabel").hide();
        }

        toggleTables();

        let searchParams = new URLSearchParams(window.location.search);
        let testing = searchParams.get("test");
        if (testing == "1") {
        }

        if ($("#printIcon").length == 0) {
            $("<img id='printIcon' src='images/print50.png'>").appendTo("header");
            $("#printIcon").click(function () {
                window.print();
            });
        }
    }
    $(".fsName a, caption a").click(function (e) {
        e.preventDefault();
    });

    // End making the form/tables

    //$("td[data-name],span[data-name]")

    $("td[data-name],span[data-name]").click(function () {
        dTR = $(this).closest("tr");
        if (dTR.attr("data-person") != "") {
            window.keepSpouse = dTR.attr("data-person");
        } else {
            window.keepSpouse = "";
        }

        $("#wtid").val($(this).attr("data-name"));
        $("#familySheetGo").click();
    });

    function closeInputs() {
        $(".edit").each(function () {
            if ($(this).prop("tagName") == "TEXTAREA" || $(this).parent().prop("tagName") == "CAPTION") {
                if (
                    $(this)
                        .val()
                        .match(/script/i) == null
                ) {
                    $(this)
                        .parent()
                        .html(nl2br($(this).val()));
                }
            } else {
                if (
                    $(this)
                        .val()
                        .match(/script/i) == null
                ) {
                    $(this).parent().text($(this).val());
                }
            }
            $(this).remove();
        });
    }

    $(
        ".BaptismDate,.BaptismPlace,.buriedDate,.buriedPlace,caption,h1,.birthRow td, .deathRow td, .otherMarriagePlace, span.marriageDate,.marriedPlace, .editable"
    ).click(function () {
        if ($(this).find("input").length == 0) {
            if ($(this).prop("tagName") == "CAPTION") {
                inputBox = $(
                    "<input style='background:white;' type='text' class='edit' value='" + $(this).html() + "'>"
                );
            } else {
                inputBox = $(
                    "<input style='background:white;' type='text' class='edit' value='" + $(this).text() + "'>"
                );
            }
            $(this).text("");
            $(this).append(inputBox);
            inputBox.focus();

            inputBox.keypress(function (e) {
                if (e.which == 13) {
                    closeInputs();
                }
            });
            inputBox.focusout(function () {
                closeInputs();
            });
        }
    });

    $("a").attr("target", "_blank");
}

function ordinal(i) {
    var j = i % 10,
        k = i % 100;
    if (j == 1 && k != 11) {
        return i + "st";
    }
    if (j == 2 && k != 12) {
        return i + "nd";
    }
    if (j == 3 && k != 13) {
        return i + "rd";
    }
    return i + "th";
}

function getFamily(WTID) {
    bioFormat = "text";
    if ($("#getBios").prop("checked") == true) {
        bioFormat = "both";
    }

    $.ajax({
        url: "https://api.wikitree.com/api.php",
        data: {
            action: "getRelatives",
            getSpouses: "1",
            getChildren: "1",
            getParents: "1",
            getSiblings: "1",
            keys: WTID,
            fields: "Spouse,NoChildren,IsLiving,BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Nicknames,Derived.LongName,Derived.LongNamePrivate,Derived.BirthName,Derived.BirthNamePrivate,Manager,MiddleName,MiddleInitial,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Bio,Privacy",
            bioFormat: bioFormat,
        },
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "json",
        success: function (data) {
            thePeople = data[0].items;
            if (thePeople) {
                thePeople.forEach(function (aPerson, index) {
                    mPerson = aPerson.person;
                    //	console.log(data);
                    mSpouses = getRels(mPerson.Spouses, mPerson, "Spouse");
                    if (mSpouses.length > 1) {
                        mSpouses.sort((a, b) =>
                            a.marriage_date.replaceAll(/\-/g, "") > b.marriage_date.replaceAll(/\-/g, "") ? 1 : -1
                        );
                    }
                    mPerson.Spouse = mSpouses;

                    mChildren = getRels(mPerson.Children, mPerson, "Child");
                    mPerson.Child = mChildren;

                    mSiblings = getRels(mPerson.Siblings, mPerson, "Sibling");
                    mPerson.Sibling = mSiblings;

                    mParents = getRels(mPerson.Parents, mPerson, "Parent");
                    mPerson.Parent = mParents;
                });

                window.people.push(mPerson);
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

                if (window.calledPeople.length == window.people.length) {
                    makeFamilySheet();
                }
            } else {
                privateQ();
                $("#tree").slideUp();
            }
        },
    });
}

function setBaptChrist() {
    $("input[type=radio][name=baptismChristening]").each(function () {
        if ($(this).prop("checked") == true) {
            $("th.baptismHeading").text($(this).val() + ":");
            $("#showBaptisedText").text("Show " + $(this).val());
        }
    });
}

function excelOut() {
    const today = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    //if (lines.length>1){theS = "s";}else {theS = "";}
    if ($("#missingParents").length) {
        fileName = "Missing Parents - " + $("#wtid").val();
    }

    var wb = XLSX.utils.book_new();
    wb.Props = {
        Title: fileName,
        Subject: fileName,
        Author: "WikiTree",
        CreatedDate: new Date(),
    };

    wb.SheetNames.push(fileName);

    var ws_data = [];

    if ($("#missingParents").length) {
        ths = $("#peopleList th");
        thVals = [
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

        rows = $("#peopleList tbody tr");
        rows.each(function () {
            if ($(this).css("display") != "none") {
                texties = [
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
                ws_data.push(texties);
            }
        });
    }

    var ws = XLSX.utils.aoa_to_sheet(ws_data);
    wb.Sheets[fileName] = ws;

    //console.log(wb);

    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
    }

    $("#downloadLines, .downloadLines").unbind();
    $("#downloadLines, .downloadLines").click(function () {
        if ($("#missingParents").length) {
            var wscols = [
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

        var wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
        saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), fileName + ".xlsx");
    });
    //}
}


$(document).ready(function () {

    if ($("body.familySheetForm").length) {
        window.keepSpouse = "";
        $("#familySheetGo").click(function () {
            if (localStorage.searches) {
                omySearches = localStorage.searches;
            } else {
                omySearches = "";
            }
            if (omySearches.indexOf($("#wtid").val() + "|") == -1) {
                localStorage.searches = omySearches + $("#wtid").val() + "|";
            }

            $("#familySheetFormTable,#tree,#notesAndSources,.tableContainer,#privateQ").remove();
            $("<img id='tree' src='images/tree.gif'>").appendTo($("body"));
            theWTID = capitalizeFirstLetter($("#wtid").val() + " ".trim(), 1);
            if (theWTID.match(/\-/) == null) {
                theWTID = theWTID.replace(/([0-9])/, "-$1");
            }
            window.people = [];
            window.husband = 0;
            window.wife = 0;
            window.calledPeople = [theWTID];
            if (theWTID != "") {
                $("#h1Text").remove();
                $("title").text("Family Sheet: " + theWTID);
                window.calls = 1;
                getFamily(theWTID);
            }
        });
        $("#wtid").on("keydown", function (event) {
            window.keepSpouse = "";
            if (event.keyCode === 13) {
                $("#familySheetGo").click();
            }
        });
        $("#showBaptism").change(function () {
            if ($(this).prop("checked") == false) {
                $("<style id='showBaptismStyle'>tr.baptismRow{display:none;}</style>").appendTo("body");
                $("#baptChrist input").prop("disabled", true);
            } else {
                $("#showBaptismStyle").remove();
                $("#baptChrist input").prop("disabled", false);
            }
            storeVal($(this));
        });
        $("#showBurial").change(function () {
            if ($(this).prop("checked") == false) {
                $("<style id='showBurialStyle'>tr.buriedRow{display:none;}</style>").appendTo("body");
            } else {
                $("#showBurialStyle").remove();
            }
            storeVal($(this));
        });
        $("#showNicknames").change(function () {
            if ($(this).prop("checked") == false) {
                $(
                    "<style id='showNicknamesStyle'>.familySheetForm caption span.nicknames,span.nicknames{display:none;}</style>"
                ).appendTo("body");
            } else {
                $("#showNicknamesStyle").remove();
            }
            storeVal($(this));
        });
        $("#showParentsSpousesDates").change(function () {
            if ($(this).prop("checked") == false) {
                $(
                    "<style id='showParentsSpousesDatesStyle'>.familySheetForm  span.parentDates,.familySheetForm span.spouseDates{display:none;}</style>"
                ).appendTo("body");
            } else {
                $("#showParentsSpousesDatesStyle").remove();
            }
            storeVal($(this));
        });
        $("#husbandFirst").change(function () {
            husbandID = $("tr.roleRow[data-role='Husband']").attr("data-name");
            husbandCitations = $("#citationList li[data-wtid='" + htmlEntities(husbandID) + "']");
            husbandNameCaption = $("caption span.fsWTID:contains('" + htmlEntities(husbandID) + "')").parent();
            if (people[0].Name != husbandID) {
                wifeNameCaption = $("caption span.fsWTID:contains('" + htmlEntities(people[0].Name) + "')").parent();
            }

            clonedMarriage = $(".marriedRow").eq(0);
            if ($(this).prop("checked") == true) {
                $("div.tableContainer.Wife").insertAfter($("div.tableContainer.Husband"));
                $(".marriedRow").eq(0).appendTo($("div.tableContainer.Husband tbody"));

                husbandCitations.prependTo($("#citationList"));
                husbandNameCaption.prependTo($("caption"));

                if (people[0].Name != husbandID) {
                    wifeNameCaption.appendTo($("caption"));
                }
            } else if (people[0].Gender == "Female") {
                $("div.tableContainer.Husband").insertAfter($("div.tableContainer.Wife"));
                $(".marriedRow").eq(0).appendTo($("div.tableContainer.Wife tbody"));
                $(".marriedRow[data-role='Husband']").remove();
                $("#citationList li[data-wtid='" + htmlEntities(people[0].Name) + "']").prependTo($("#citationList"));

                husbandNameCaption.appendTo($("caption"));

                if (people[0].Name != husbandID) {
                    wifeNameCaption.prependTo($("caption"));
                }
            }
            if ($(".marriedRow").eq(1).length) {
                $(".marriedRow").eq(1).remove();
            }
            $(".marriedRow").remove();
            clonedMarriage.appendTo($("div.tableContainer").eq(0).find("tbody"));

            storeVal($(this));

            $(".theBio").find("tr.marriedRow").remove();
        });
        if ($(".nicknames").length == 0) {
            $(".showNicknamesSpan").hide();
        }
        $("#longMonth").change(function () {
            storeVal($(this));
            opt = "short";
            if ($(this).prop("checked") == true) {
                opt = "full";
            }
            $(".date").each(function () {
                $(this).text(monthFormat($(this).text(), opt));
            });
        });

        $("#showOtherLastNames").change(function () {
            if ($(this).prop("checked") == false) {
                $(
                    "<style id='showOtherLastNamesStyle'>.familySheetForm caption span.otherLastNames,span.otherLastNames{display:none;}</style>"
                ).appendTo("body");
            } else {
                $("#showOtherLastNamesStyle").remove();
            }
            storeVal($(this));
        });
        $("#useColour").change(function () {
            if ($(this).prop("checked") == false) {
                $(
                    "<style id='useColourStyle'>.familySheetForm tr.marriedRow, .familySheetForm caption, .roleRow[data-gender],.roleRow[data-gender] th, #familySheetFormTable thead tr th:first-child{background-color: #fff; border-left:1px solid black;border-right:1px solid black;}    </style>"
                ).appendTo("body");
            } else {
                $("#useColourStyle").remove();
            }
            storeVal($(this));
        });
        $("#showBios").change(function () {
            if ($(this).prop("checked") == true) {
                $(".theBio").slideDown();
                setTimeout(function () {
                    $("<style id='showBiosStyle'>.familySheetForm .bioRow div.theBio{display:block;}</style>").appendTo(
                        "body"
                    );
                }, 1000);
            } else {
                $(".theBio").slideUp();
                setTimeout(function () {
                    $("#showBiosStyle").remove();
                }, 1000);
            }
            storeVal($(this));
        });
        $("#showWTIDs").change(function () {
            if ($(this).prop("checked") == true) {
                $("<style id='showWTIDsStyle'>.familySheetForm .fsWTID{display:inline-block;}</style>").appendTo(
                    "body"
                );
            } else {
                $("#showWTIDsStyle").remove();
            }
            storeVal($(this));
        });

        $("input[type=radio][name=baptismChristening]").change(function () {
            setBaptChrist();
            storeVal($(this));
        });

        $("#fgsInfo").click(function () {
            $(this).slideUp("slow");
            setTimeout(function () {
                $("#fgsInfo").toggleClass("removed");
                $("#fgsInfo").slideDown("slow");
                if ($("#fgsInfo").hasClass("removed")) {
                    localStorage.setItem("fgsInfoState", "removed");
                } else {
                    localStorage.setItem("fgsInfoState", "center");
                }
            }, 1000);
        });
        $("#fgsOptions x,#fgsOptions .notesHeading").click(function () {
            $("#fgsOptions").slideUp("slow");
            setTimeout(function () {
                $("#fgsOptions").toggleClass("removed");
                $("#fgsOptions").slideDown("slow");
                if ($("#fgsOptions").hasClass("removed")) {
                    localStorage.setItem("fgsOptionsState", "removed");
                    $("#fgsOptions .notesHeading").show();
                } else {
                    localStorage.setItem("fgsOptionsState", "center");
                    $("#fgsOptions .notesHeading").hide();
                }
            }, 1000);
        });

        if (localStorage.fgsInfoState == "removed") {
            $("#fgsInfo").addClass("removed");
        }
    }
});







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
    }
}

// Used in familyTimeline, familyGroup, locationsHelper
// Make the family member arrays easier to handle
function extractRelatives(rel, theRelation = false) {
    let people = [];
    if (typeof rel == undefined || rel == null) {
        return false;
    }
    const pKeys = Object.keys(rel);
    pKeys.forEach(function (pKey) {
        var aPerson = rel[pKey];
        if (theRelation != false) {
            aPerson.Relation = theRelation;
        }
        people.push(aPerson);
    });
    return people;
}

// Used in familyTimeline, familyGroup, locationsHelper
function familyArray(person) {
    // This is a person from getRelatives()
    const rels = ["Parents", "Siblings", "Spouses", "Children"];
    let familyArr = [person];
    rels.forEach(function (rel) {
        const relation = rel.replace(/s$/, "").replace(/ren$/, "");
        familyArr = familyArr.concat(extractRelatives(person[rel], relation));
    });
    return familyArr;
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
