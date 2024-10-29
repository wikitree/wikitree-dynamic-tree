import { CC7Utils } from "./CC7Utils.js";
import { Utils } from "../../shared/Utils.js";

export class HierarchyView {
    static buildView() {
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
        const theName = CC7Utils.formDisplayName(aPerson, aName);
        const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
        const theLNAB = theParts.get("LastNameAtBirth");
        const theFirstName = theParts.get("FirstName");
        const linkName = CC7Utils.htmlEntities(aPerson.Name);
        const anLi = $(
            `<li data-lnab='${theLNAB}' data-id='${aPerson.Id}' data-degree='${aPerson.Meta.Degrees}' ` +
                `data-name=\"${aPerson.Name}\" data-first-name='${theFirstName}'>${aPerson.Meta.Degrees}° ` +
                CC7Utils.profileLink(linkName, theName) +
                "<ul></ul></li>"
        );
        hierarchySection.children("ul").append(anLi);
        for (let i = 0; i < window.cc7Degree; i++) {
            HierarchyView.addPeopleToHierarchy(i);
        }
        $("#hierarchyView li").each(function () {
            let aButton;
            if ($(this).find("ul li").length) {
                aButton = $("<button class='toggler'>+</button>");
                $(this).prepend(aButton);
                CC7Utils.showMissingCounts(aButton);
                aButton.on("click", function (e) {
                    e.preventDefault();
                    $(this).parent().children("ul").toggle();
                    $(this).text($(this).text() == "+" ? "−" : "+");
                    CC7Utils.showMissingCounts($(this));
                });
            } else {
                aButton = $("<button class='nonToggler'></button>");
                $(this).prepend(aButton);
            }
        });
        $("#showAllDegrees").on("click", function (e) {
            e.preventDefault();
            window.visibleDegrees = window.cc7Degree;
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
            if (window.visibleDegrees < window.cc7Degree) {
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

                for (let i = window.cc7Degree; i >= j + 1; i--) {
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
        $("#cc7Subset").hide();
        Utils.hideShakingTree();
    }

    static addPeopleToHierarchy(degree) {
        $("#hierarchyView li[data-degree='" + degree + "']").each(function () {
            const id = $(this).data("id");
            const thisLI = $(this);
            const aPerson = window.people.get(+id);

            if (aPerson) {
                CC7Utils.assignRelationshipsFor(aPerson);
                const familyMembers = [].concat(aPerson.Parent, aPerson.Sibling, aPerson.Spouse, aPerson.Child);

                familyMembers.forEach(function (aMember) {
                    CC7Utils.addMissingBits(aMember);

                    if (thisLI.closest('li[data-name="' + aMember.Name + '"]').length == 0) {
                        const theDegree = aMember.Meta.Degrees;
                        if (theDegree > aPerson.Meta.Degrees) {
                            const aName = new PersonName(aMember);
                            const theName = CC7Utils.formDisplayName(aMember, aName);
                            const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
                            const theLNAB = theParts.get("LastNameAtBirth");
                            const theFirstName = theParts.get("FirstName");

                            let relation = aMember.Relation;
                            if (relation == "Child") {
                                relation = CC7Utils.mapGender(aMember.Gender, "Son", "Daughter", "Child");
                            } else if (relation == "Sibling") {
                                relation = CC7Utils.mapGender(aMember.Gender, "Brother", "Sister", "Sibling");
                            } else if (relation == "Parent") {
                                relation = CC7Utils.mapGender(aMember.Gender, "Father", "Mother", "Parent");
                            } else if (relation == "Spouse") {
                                relation = CC7Utils.mapGender(aMember.Gender, "Husband", "Wife", "Spouse");
                            }

                            const missing = CC7Utils.missingThings(aMember);
                            const missingBit = missing.missingBit;
                            const missingIcons = missing.missingIcons;
                            const linkName = CC7Utils.htmlEntities(aMember.Name);
                            const bdDates = HierarchyView.displayDates(aMember);
                            const anLi = $(
                                `<li data-birth-date='${aMember.BirthDate}' data-father='${aMember.Father}' ` +
                                    `data-mother='${aMember.Mother}' data-id='${aMember.Id}' data-relation='${relation}' ` +
                                    `${missingBit} data-lnab='${theLNAB}' data-degree='${aMember.Meta.Degrees}' ` +
                                    `data-name=\"${aMember.Name}\" data-first-name='${theFirstName}'>${aMember.Meta.Degrees}° ` +
                                    `<span class='relation ${relation}'>${relation}</span>: ` +
                                    CC7Utils.profileLink(linkName, theName) +
                                    ` <span class='birthDeathDates'>${bdDates}</span> ${missingIcons}<ul></ul></li>`
                            );
                            thisLI.children("ul").append(anLi);
                        }
                    }
                });
            }
        });
    }

    static displayDates(fPerson) {
        const mbdDatesStatus = HierarchyView.bdDatesStatus(fPerson);
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
}
