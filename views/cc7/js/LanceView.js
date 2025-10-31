import { CC7Utils } from "./CC7Utils.js";

export class LanceView {
    static async build() {
        $("#peopleTable").hide();
        const surnames = {
            degree_1: [],
            degree_2: [],
            degree_3: [],
            degree_4: [],
            degree_5: [],
            degree_6: [],
            degree_7: [],
        };
        const subset = $("#cc7Subset").val();
        const genderFilter = $("#cc7Gender").val() || "all";
        const lanceTable = $(
            `<table id='lanceTable' class="cc7ViewTab subsetable ${subset} ${CC7Utils.genderClass(genderFilter)}">` +
                "<thead>" +
                "<tr></tr>" +
                "</thead>" +
                "<tbody>" +
                "<tr></tr>" +
                "</tbody>" +
                "</table>"
        );
        if ($("#lanceTable").length) {
            $("#lanceTable").eq(0).replaceWith(lanceTable);
        } else {
            $("#peopleTable").before(lanceTable);
        }
        for (let i = 1; i < 8; i++) {
            let aHeading = $("<th id='degreeHeading_" + i + "'><span>" + i + ".</span><ol></ol></th>");
            lanceTable.find("thead tr").append(aHeading);
            let aCell = $("<td id='degree_" + i + "'><ol></ol></td>");
            lanceTable.find("tbody tr").append(aCell);
        }

        for (let aPerson of window.people.values()) {
            // Ignore profiles not in the selected subset
            if (!CC7Utils.profileIsInSubset(aPerson, subset, genderFilter)) continue;
            if (!aPerson.Missing) {
                CC7Utils.addMissingBits(aPerson);
            }
            const theDegree = aPerson.Meta.Degrees;
            const aName = new PersonName(aPerson);
            const theName = CC7Utils.formDisplayName(aPerson, aName);
            const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
            const theLNAB = theParts.get("LastNameAtBirth");
            const theFirstName = theParts.get("FirstName");

            if (CC7Utils.isOK(theDegree) && theDegree <= window.cc7Degree) {
                if (!surnames["degree_" + theDegree].includes(theLNAB)) {
                    // Add the LNAB to the appropriate degree column header
                    surnames["degree_" + theDegree].push(theLNAB);
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
                    anLi2
                        .find("a")
                        .off("click")
                        .on("click", function (e) {
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
                // Add the person to the appropriate column
                const linkName = CC7Utils.htmlEntities(aPerson.Name);
                const missing = CC7Utils.missingThings(aPerson);
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
                        CC7Utils.profileLink(linkName, theName) +
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
            LanceView.sortList($(this), "lnab");
        });
        $("#peopleTable").removeClass("active");
        $("#lanceTable").addClass("active");
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
        LanceView.secondarySort3(aList, "lnab", "first-name", 1);
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
}
