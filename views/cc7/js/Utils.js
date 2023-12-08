export class CC7Utils {
    static addMissingBits(aPerson) {
        aPerson.Missing = [];
        if (!aPerson.Father) {
            aPerson.Missing.push("Father");
        }
        if (!aPerson.Mother) {
            aPerson.Missing.push("Mother");
        }

        if (
            (CC7Utils.ageAtDeath(aPerson, false) > 15 ||
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

                diedAged = CC7Utils.getAge(
                    new Date(obDateBits[0], obDateBits[1], obDateBits[2]),
                    new Date(odDateBits[0], odDateBits[1], odDateBits[2])
                );
            } else {
                diedAged = "";
            }
        }
        if (person?.DataStatus?.DeathDate) {
            if (person.DataStatus.DeathDate == "after") {
                about = ">";
            }
        }
        if (diedAged == "" && diedAged != "0") {
            return false;
        } else if (showStatus == false) {
            return diedAged;
        } else {
            return about + diedAged;
        }
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

    static capitalizeFirstLetter(string) {
        return string.substring(0, 1).toUpperCase() + string.substring(1);
    }

    static fixBirthDate(person) {
        let birthDate = CC7Utils.ymdFix(person.BirthDate);
        if (birthDate == "" && person.BirthDateDecade) {
            birthDate = person.BirthDateDecade || "";
        }
        person.fixedBirthDate = birthDate;
    }

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

    static formDisplayName(aPerson, aName) {
        return aPerson.Name.startsWith("Private")
            ? aPerson.LastNameAtBirth || "Private"
            : aName.withParts(CC7Utils.WANTED_NAME_PARTS);
    }

    static getAge(birth, death) {
        // must be date objects
        let age = death.getFullYear() - birth.getFullYear();
        let m = death.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    static htmlEntities(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    static imagePath(fileName) {
        return `./views/cc7/images/${fileName}`;
    }

    static isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
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
            if (CC7Utils.isNumeric(thing)) {
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

    static mapGender(gender, maleName, femaleName, neutralName) {
        return gender == "Male" ? maleName : gender == "Female" ? femaleName : neutralName;
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

    static profileLink(wtRef, text) {
        return wtRef.startsWith("Private")
            ? text
            : `<a target='_blank' href='https://www.wikitree.com/wiki/${this.htmlEntities(wtRef)}'>${text}</a>`;
    }

    static setOverflow(value) {
        $("#view-container").css({
            overflow: value,
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
                outDate = dYearNum + "-" + dMonthNum + "-" + dDateNum;
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
}
