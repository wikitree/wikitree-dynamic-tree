import { HierarchyView } from "./HierarchyView.js";
import { LanceView } from "./LanceView.js";
import { Settings } from "./Settings.js";
import { CC7Utils } from "./Utils.js";
import { Utils } from "../../shared/Utils.js";

export class PeopleTable {
    static EXCEL = "xlsx";
    static CSV = "csv";

    // From https://github.com/wikitree/wikitree-api/blob/main/getProfile.md :
    // Privacy_IsPrivate            True if Privacy = 20
    // Privacy_IsPublic             True if Privacy = 50
    // Privacy_IsOpen               True if Privacy = 60
    // Privacy_IsAtLeastPublic      True if Privacy >= 50
    // Privacy_IsSemiPrivate        True if Privacy = 30-40
    // Privacy_IsSemiPrivateBio     True if Privacy = 30
    static PRIVACY_LEVELS = new Map([
        [60, { title: "Privacy: Open", img: "./views/cc7/images/privacy_open.png" }],
        [50, { title: "Public", img: "./views/cc7/images/privacy_public.png" }],
        [40, { title: "Private with Public Bio and Tree", img: "./views/cc7/images/privacy_public-tree.png" }],
        [35, { title: "Private with Public Tree", img: "./views/cc7/images/privacy_privacy35.png" }],
        [30, { title: "Public Bio", img: "./views/cc7/images/privacy_public-bio.png" }],
        [20, { title: "Private", img: "./views/cc7/images/privacy_private.png" }],
        [10, { title: "Unlisted", img: "./views/cc7/images/privacy_unlisted.png" }],
        ["?", { title: "Unknown", img: "./views/cc7/images/question-mark-circle-outline-icon.png" }],
    ]);

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
        const bioCheck = Settings.current["biocheck_options_biocheckOn"];
        const subset = $("#cc7Subset").val() || "all";

        const aTable = $(
            `<table id='peopleTable' class='peopleTable ${subset}'>` +
                aCaption +
                `<thead><tr><th title='Privacy${bioCheck ? "/BioCheck" : ""}'>P${
                    bioCheck ? "/B" : ""
                }</th><th></th><th></th>` +
                degreeTH +
                parentsNum +
                siblingsNum +
                spousesNum +
                childrenNum +
                `<th data-order='' id='firstname' ${sortTitle}>Given Name(s)</th>` +
                `<th data-order='' id='lnab' ${sortTitle}>Last Name at Birth</th>` +
                `<th data-order='' id='lnc' ${sortTitle}>Current Last Name</th>` +
                `<th data-order='' id='birthdate' ${sortTitle}>Birth Date</th>` +
                `<th data-order='' id='birthlocation' ${sortTitle}>Birth Place</th>` +
                `<th data-order='' id='deathdate' ${sortTitle}>Death Date</th>` +
                `<th data-order='' id='deathlocation' ${sortTitle}>Death Place</th>` +
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
                    if (typeof mPerson.fixedBirthDate === "undefined") {
                        CC7Utils.fixBirthDate(mPerson);
                    }
                    const degree = +mPerson.Meta.Degrees;
                    return [+k, degree < 0 ? 100 : degree, mPerson.fixedBirthDate];
                })
                .sort((a, b) => {
                    if (a[1] == b[1]) {
                        return collator.compare(a[2], b[2]);
                    } else {
                        return a[1] - b[1];
                    }
                });
        }

        for (let [id, , birthDate] of sortIdsByDegreeAndBirthDate(window.people.keys())) {
            const mPerson = window.people.get(id);
            if (mPerson.Hide) continue;
            // Filter by the selected subset
            switch (subset) {
                case "above":
                    if (!mPerson.isAbove) continue; // hide
                    break;

                case "below":
                    if (mPerson.isAbove) continue; // hide
                    break;

                case "ancestors":
                    if (mPerson.isAncestor) break; // show
                    continue;

                case "descendants":
                    if (typeof mPerson.isAncestor != "undefined" && !mPerson.isAncestor) break; // show
                    continue;

                case "missing-links":
                    if (isMissingFamily(mPerson)) break; // show
                    continue; // else hide

                default:
                    break;
            }
            function isMissingFamily(person) {
                if (person.LastNameAtBirth == "Private") return false;
                let val = false;
                if (Settings.current["missingFamily_options_noNoChildren"]) {
                    // no more children flag is not set
                    val = person.NoChildren != 1;
                }
                if (!val && Settings.current["missingFamily_options_noNoSpouses"]) {
                    // no more spouses flag is not set
                    val = person.DataStatus.Spouse != "blank";
                }
                if (!val && Settings.current["missingFamily_options_noParents"]) {
                    // no father or mother
                    val = !person.Father && !person.Mother;
                }
                if (!val && Settings.current["missingFamily_options_noChildren"]) {
                    // no more children flag is not set and they don't have any children
                    val = person.NoChildren != 1 && (!person.Child || person.Child.length == 0);
                }
                if (!val && Settings.current["missingFamily_options_oneParent"]) {
                    // at least one parent missing
                    val = (person.Father && !person.Mother) || (!person.Father && person.Mother);
                }
                return val;
            }

            let deathDate = CC7Utils.ymdFix(mPerson.DeathDate);
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
                const bLocation2ways = PeopleTable.location2ways(birthLocation);
                birthLocation = bLocation2ways[0];
                birthLocationReversed = bLocation2ways[1];
            }
            let deathLocation = mPerson.DeathLocation;
            let deathLocationReversed = "";
            if (deathLocation == null || typeof deathLocation == "undefined") {
                deathLocation = "";
            } else {
                const dLocation2ways = PeopleTable.location2ways(deathLocation);
                deathLocation = dLocation2ways[0];
                deathLocationReversed = dLocation2ways[1];
            }

            const privacyLevel = +mPerson.Privacy || "?";
            const privacyDetail = PeopleTable.PRIVACY_LEVELS.get(privacyLevel);
            let privacyImg = null;
            let privacyTitle = "";
            let dprivacy = "";
            if (privacyDetail) {
                privacyTitle = privacyDetail.title;
                privacyImg = privacyDetail.img;
                dprivacy = "data-privacy='" + privacyLevel + "'";
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
                dBirthDate = PeopleTable.getApproxDate2(mPerson.BirthDateDecade).Date.replace("-", "").padEnd(8, "0");
            } else {
                dBirthDate = "00000000";
            }

            let dDeathDate;
            if (mPerson.DeathDate) {
                dDeathDate = mPerson.DeathDate.replaceAll("-", "");
            } else if (mPerson.DeathDateDecade) {
                dDeathDate = PeopleTable.getApproxDate2(mPerson.DeathDateDecade).Date.replace("-", "").padEnd(8, "0");
            } else {
                dDeathDate = "00000000";
            }

            if (firstName == undefined) {
                firstName = "Private";
                mPerson.LastNameCurrent = "";
                if (mPerson.Name && mPerson.Name.includes("-") && mPerson.Name.match(/Private/) == null) {
                    mPerson.LastNameAtBirth = mPerson.Name.split("-")[0];
                } else {
                    mPerson.LastNameAtBirth = "Private";
                }
            }

            const oLink = CC7Utils.profileLink(mPerson.Name, firstName);
            let managerLink;
            let dManager;
            if (typeof mPerson.Manager != "undefined" && mPerson.Manager == 0) {
                // Trial and error showed this means it is orphaned
                managerLink = "Orphaned";
                dManager = managerLink;
            } else if (mPerson.Managers && mPerson.Managers.length > 0) {
                // If the current user is a manager, show them, else grab the first manager in the list
                const watcher = window.WTUser.name;
                const mgrWtId = watcher
                    ? mPerson.Managers.find((m) => m.Name == watcher)?.Name || mPerson.Managers[0]?.Name
                    : mPerson.Managers[0]?.Name;
                dManager = CC7Utils.htmlEntities(mgrWtId);
                managerLink = CC7Utils.profileLink(mgrWtId, dManager);
            } else if (mPerson.Manager) {
                // We have a number, so we might as well use it
                dManager = mPerson.Manager;
                managerLink = CC7Utils.profileLink(dManager, dManager);
            } else {
                managerLink = "Unknown";
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
            let diedVeryYoung = false;
            let diedYoungIcon = "";
            let diedYoungTitle = "";

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
                degreeCell = "<td class='degree'>" + mPerson.Meta.Degrees + "°</td>";
                ddegree = "data-degree='" + mPerson.Meta.Degrees + "'";
                if (mPerson.Created) {
                    created =
                        "<td class='created aDate'>" +
                        mPerson.Created.replace(/([0-9]{4})([0-9]{2})([0-9]{2}).*/, "$1-$2-$3") +
                        "</td>";
                    dcreated = "data-created='" + mPerson.Created + "'";
                } else {
                    created = "<td class='created aDate'></td>";
                }

                let mAgeAtDeath = CC7Utils.ageAtDeath(mPerson);
                let mAgeAtDeathNum = CC7Utils.ageAtDeath(mPerson, false);

                if (mAgeAtDeath === false && mAgeAtDeath !== "0") {
                    mAgeAtDeath = "";
                }
                if (mAgeAtDeathNum < 0) {
                    mAgeAtDeath = 0;
                }
                if (mAgeAtDeathNum < 5 && (mAgeAtDeath != false || mAgeAtDeathNum === 0)) {
                    diedYoung = true;
                    diedVeryYoung = true;
                    diedYoungIcon = Settings.current["icons_options_veryYoung"];
                    diedYoungTitle = "Died before age 5";
                } else if (mAgeAtDeathNum < 16 && mAgeAtDeath != false) {
                    diedYoung = true;
                    diedYoungIcon = Settings.current["icons_options_young"];
                    diedYoungTitle = "Died before age 16";
                }

                ageAtDeathCell = "<td class='age-at-death'>" + mAgeAtDeath + "</td>";
                dAgeAtDeath = "data-age-at-death='" + mAgeAtDeathNum + "'";

                if (mPerson.Touched) {
                    touched =
                        "<td class='touched aDate'>" +
                        PeopleTable.changesLink(
                            mPerson.Name,
                            mPerson.Touched.replace(/([0-9]{4})([0-9]{2})([0-9]{2}).*/, "$1-$2-$3")
                        ) +
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
                    let word = aR + "s";
                    if (aR == "Child") {
                        word = "Children";
                        if (diedYoung && relNums[aR] == "") {
                            const imgClass = diedVeryYoung ? "diedVeryYoungImg" : "diedYoungImg";
                            relNums[aR] = `<img class="${imgClass}" src="${CC7Utils.imagePath(diedYoungIcon)}" />`;
                            cellClass = "class='number diedYoung'";
                            word = diedYoungTitle;
                        } else if (mPerson.NoChildren == 1) {
                            cellClass = "class='none number'";
                        }
                    } else if (
                        aR == "Sibling" &&
                        mPerson.Parent.length == 2 &&
                        mPerson.Parent[0].NoChildren &&
                        mPerson.Parent[0].NoChildren
                    ) {
                        cellClass = "class='none number'";
                    }
                    if (aR == "Spouse") {
                        if (mPerson.DataStatus?.Spouse == "blank" || (diedYoung && relNums[aR] == "")) {
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

            let gender = mPerson.Gender;
            if (mPerson?.DataStatus?.Gender == "blank") {
                gender = "blank";
            }

            const aLine = $(
                "<tr " +
                    dprivacy +
                    " " +
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
                    CC7Utils.htmlEntities(mPerson.Name) +
                    "' data-firstname='" +
                    CC7Utils.htmlEntities(firstName) +
                    "' data-lnab='" +
                    CC7Utils.htmlEntities(mPerson.LastNameAtBirth) +
                    "'  data-lnc='" +
                    CC7Utils.htmlEntities(mPerson.LastNameCurrent) +
                    "' data-birthdate='" +
                    dBirthDate +
                    "' data-deathdate='" +
                    dDeathDate +
                    "' data-birthlocation='" +
                    CC7Utils.htmlEntities(birthLocation) +
                    "' data-birthlocation-reversed='" +
                    CC7Utils.htmlEntities(birthLocationReversed) +
                    "' data-deathlocation='" +
                    CC7Utils.htmlEntities(deathLocation) +
                    "' data-deathlocation-reversed='" +
                    CC7Utils.htmlEntities(deathLocationReversed) +
                    "' data-manager='" +
                    dManager +
                    "' class='" +
                    gender +
                    `'><td ${
                        mPerson.hasBioIssues
                            ? Settings.mustHighlight(mPerson.bioCheckReport)
                                ? "class='privBio bioIssue' title='Click to see Bio Check Report'"
                                : "class='privBio bioIssue2' title='Click to see Bio Check Report'"
                            : "class='privBio'"
                    }>` +
                    (privacyImg
                        ? "<img class='privacyImage' src='" + privacyImg + "' title='" + privacyTitle + "'>"
                        : "<span title='Unknown'>?</span>") +
                    `</td><td><img class='familyHome' src='./views/cc7/images/Home_icon.png' title="Click to see ${firstName}'s family sheet"></td>` +
                    `<td><img class='timelineButton' src='./views/cc7/images/timeline.png' title="Click to see a timeline for ${firstName}"></td>` +
                    degreeCell +
                    relNums["Parent_cell"] +
                    relNums["Sibling_cell"] +
                    relNums["Spouse_cell"] +
                    relNums["Child_cell"] +
                    "<td class='connectionsName' >" +
                    oLink +
                    "</td><td class='lnab'>" +
                    (mPerson.LastNameAtBirth.startsWith("Private")
                        ? mPerson.LastNameAtBirth
                        : "<a target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
                          CC7Utils.htmlEntities(mPerson.LastNameAtBirth) +
                          "'>" +
                          mPerson.LastNameAtBirth +
                          "</a>") +
                    "</td><td class='lnc'><a   target='_blank' href='https://www.wikitree.com/index.php?title=Special:Surname&order=name&layout=table&s=" +
                    CC7Utils.htmlEntities(mPerson.LastNameCurrent) +
                    "'>" +
                    mPerson.LastNameCurrent +
                    "</a></td><td class='aDate birthdate'>" +
                    birthDate +
                    "</td><td class='location birthlocation'>" +
                    CC7Utils.htmlEntities(birthLocation) +
                    "</td><td  class='aDate deathdate'>" +
                    deathDate +
                    "</td><td class='location deathlocation'>" +
                    CC7Utils.htmlEntities(deathLocation) +
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

        if (Utils.getCookie("w_wideTable") == "0") {
            CC7Utils.setOverflow("visible");
        } else {
            CC7Utils.setOverflow("auto");
        }

        $("img.privacyImage, .bioIssue")
            .off("click")
            .on("click", function (event) {
                event.stopImmediatePropagation();
                const id = $(this).closest("tr").attr("data-id");
                const p = window.people.get(+id);
                if (event.altKey) {
                    // Provide a way to examine the data record of a specific person
                    console.log(`${p.Name}, ${p.BirthNamePrivate}`, p);
                } else if (p.hasBioIssues) {
                    PeopleTable.showBioCheckReport($(this));
                }
            });
        $("img.familyHome")
            .off("click")
            .on("click", function () {
                PeopleTable.showFamilySheet($(this));
            });
        $("img.timelineButton")
            .off("click")
            .on("click", function (event) {
                PeopleTable.showTimeline($(this));
            });

        aTable.find("th[id]").each(function () {
            PeopleTable.sortByThis($(this));
        });
        PeopleTable.addWideTableButton();
        if ($("#hierarchyViewButton").length == 0) {
            $("#wideTableButton").before(
                $(
                    "<select id='cc7Subset' title='Select which profiles should be displayed'>" +
                        "<option value='all' selected>All</option>" +
                        "<option value='ancestors' title='Direct ancestors only'>Ancestors</option>" +
                        "<option value='descendants' title='Direct descendants only'>Descendants</option>" +
                        '<option value="above" title="Anyone that can be reached by first following a parent link">All "Above"</option>' +
                        '<option value="below" title="Anyone that can be reached by first following a non-parent link">All "Below"</option>' +
                        '<option value="missing-links" title="People that may be missing family members" link">Missing Family</option>' +
                        "</select>" +
                        "<button class='button small viewButton' id='hierarchyViewButton'>Hierarchy</button>" +
                        "<button class='button small viewButton' id='listViewButton'>List</button>" +
                        "<button class='button small viewButton active' id='tableViewButton'>Table</button>"
                )
            );
        }
        $("#cc7Subset")
            .off("change")
            .on("change", function () {
                const curTableId = $("table.active").attr("id");
                if (curTableId == "lanceTable") {
                    LanceView.build();
                } else if (curTableId == "peopleTable") {
                    drawPeopleTable();
                }
                if ($("#cc7Subset").val() == "missing-links") {
                    PeopleTable.showMissingLinksCheckboxes();
                } else {
                    $("#mlButtons").hide();
                }
            });

        function drawPeopleTable() {
            const subset = $("#cc7Subset").val();
            let subsetWord = "";
            switch (subset) {
                case "ancestors":
                    subsetWord = " (Ancestors Only)";
                    break;
                case "descendants":
                    subsetWord = " (Descendants Only)";
                    break;
                case "above":
                    subsetWord = ' ("Above" Only)';
                    break;
                case "below":
                    subsetWord = ' ("Below" Only)';
                    break;
                case "missing-links":
                    subsetWord = " (Missing Family)";
                    break;
                default:
                    break;
            }
            PeopleTable.addPeopleTable(PeopleTable.tableCaption() + subsetWord);
        }

        $("#listViewButton")
            .off("click")
            .on("click", function () {
                $(".viewButton").removeClass("active");
                $(this).addClass("active");
                $("#peopleTable,#hierarchyView").hide();
                if ($("#lanceTable").length == 0 || !$("#lanceTable").hasClass($("#cc7Subset").val())) {
                    LanceView.build();
                } else {
                    $("#lanceTable").show().addClass("active");
                    $("#wideTableButton").hide();
                }
                $("#cc7Subset").show();
                if ($("#cc7Subset").val() == "missing-links") {
                    PeopleTable.showMissingLinksCheckboxes();
                }
            });
        $("#hierarchyViewButton")
            .off("click")
            .on("click", function () {
                if (!window.people.get(window.rootId)) {
                    // We don't have a root, so we can't do anything
                    return;
                }
                $(".viewButton").removeClass("active");
                $(this).addClass("active");
                $("#peopleTable,#lanceTable").hide().removeClass("active");
                if ($("#hierarchyView").length == 0) {
                    Utils.showShakingTree(CC7Utils.CC7_CONTAINER_ID, function () {
                        // We only call HierarchyView.buildView after a timeout in order to give the shaking tree
                        // animation a change to complete first
                        setTimeout(() => HierarchyView.buildView(), 10);
                    });
                    $("#wideTableButton").hide();
                } else {
                    $("#hierarchyView").show();
                }
                $("#cc7Subset").hide();
                $("#mlButtons").hide();
            });
        $("#tableViewButton")
            .off("click")
            .on("click", function () {
                $(".viewButton").removeClass("active");
                $(this).addClass("active");
                $("#hierarchyView, #lanceTable").hide().removeClass("active");
                $("#cc7Subset").show();
                if ($("#peopleTable").hasClass($("#cc7Subset").val())) {
                    // We don't have to re-draw the table
                    $("#peopleTable").show().addClass("active");
                    $("#wideTableButton").show();
                } else {
                    drawPeopleTable();
                }
                if ($("#cc7Subset").val() == "missing-links") {
                    PeopleTable.showMissingLinksCheckboxes();
                }
            });

        if (!window.people.get(window.rootId)) {
            // We don't have a root, so disable the hierarchy view
            $("#hierarchyViewButton").prop("disabled", true);
        }
        Utils.hideShakingTree();

        PeopleTable.addFiltersToPeopleTable();
        aTable.css({
            "overflow-x": "auto",
            "width": "100%",
        });

        if ($("#cc7excel").length == 0) {
            $(
                '<button id="cc7excel" title="Export an Excel file." class="small button" style="display: inline-block;">Excel</button>'
            ).insertAfter($("#loadButton"));
            $("#cc7excel")
                .off("click")
                .on("click", function () {
                    PeopleTable.cc7excelOut(PeopleTable.EXCEL);
                });
        }
        if ($("#cc7csv").length == 0) {
            $(
                '<button id="cc7csv" title="Export a CSV file." class="small button" style="display: inline-block;">CSV</button>'
            ).insertAfter($("#loadButton"));
            $("#cc7csv")
                .off("click")
                .on("click", function () {
                    PeopleTable.cc7excelOut(PeopleTable.CSV);
                });
        }
        $("#lanceTable").removeClass("active");
        aTable.addClass("active");
        aTable.floatingScroll();
    }

    static location2ways(locationText) {
        const alSplit = locationText.split(",");
        const alSplit2 = alSplit.map((string) => string.trim());
        const s2b = alSplit2.join(", ");
        const b2s = alSplit2.reverse().join(", ");
        return [s2b, b2s];
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
        el.off("click").on("click", function () {
            let sorter = el.attr("id");
            let rows = aTable.find("tbody tr");
            if (sorter == "birthlocation" || sorter == "deathlocation") {
                if (sorter == "birthlocation") {
                    if (el.attr("data-order") == "s2b") {
                        sorter = "birthlocation-reversed";
                        el.attr("data-order", "b2s");
                        rows = PeopleTable.fillLocations(rows, "-reversed");
                    } else {
                        el.attr("data-order", "s2b");
                        rows = PeopleTable.fillLocations(rows, "");
                    }
                } else if (sorter == "deathlocation") {
                    if (el.attr("data-order") == "s2b") {
                        sorter = "deathlocation-reversed";
                        el.attr("data-order", "b2s");
                        rows = PeopleTable.fillLocations(rows, "-reversed");
                    } else {
                        el.attr("data-order", "s2b");
                        rows = PeopleTable.fillLocations(rows, "");
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

    static async addWideTableButton() {
        $("#wideTableButton").show();

        if ($("#wideTableButton").length == 0) {
            const pTable = $(".peopleTable");
            const wideTableButton = $(
                "<div id='tableButtons'><button class='button small' id='wideTableButton'>Wide Table</button></div>"
            );
            wideTableButton.insertBefore(pTable);

            $("#wideTableButton")
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();

                    const dTable = $(".peopleTable").eq(0);
                    if (Utils.getCookie("w_wideTable") == "1") {
                        // Display a normal table
                        Utils.setCookie("w_wideTable", 0, { expires: 365 });
                        CC7Utils.setOverflow("visible");
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
                        Utils.setCookie("w_wideTable", 1, { expires: 365 });
                        CC7Utils.setOverflow("auto");
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
        if (Utils.getCookie("w_wideTable") == "1") {
            Utils.setCookie("w_wideTable", 0, { expires: 365 });
            $("#wideTableButton").trigger("click");
        }
    }

    static changesLink(wtRef, text) {
        return wtRef.startsWith("Private")
            ? text
            : `<a target='_blank' href='https://www.wikitree.com/index.php?title=Special:NetworkFeed&who=${wtRef}'>${text}</a>`;
    }

    static tableCaption() {
        const person = window.people.get(window.rootId);
        let displName;
        if (person) {
            displName = new PersonName(person).withParts(CC7Utils.WANTED_NAME_PARTS);
        } else {
            displName = wtViewRegistry.getCurrentWtId();
        }
        let caption = "";
        if ($("#cc7Container").hasClass("degreeView")) {
            caption = `Degree ${window.cc7Degree} connected people for ${displName}`;
        } else {
            caption = `CC${window.cc7Degree} for ${displName}`;
        }
        return caption;
    }

    static showMissingLinksCheckboxes() {
        $("#mlButtons").show();
        if ($("#mlButtons").length == 0) {
            const mlButtons = $(
                "<div id=mlButtons>" +
                    '<label><input id="mlNoParents" type="checkbox" class="mfCheckbox"> No parents</label>' +
                    '<label><input id="mlOneParent" type="checkbox" class="mfCheckbox"> One parent</label>' +
                    '<label><input id="mlNoNoSpouses" type="checkbox" class="mfCheckbox"> No "No more spouses"</label>' +
                    '<label><input id="mlNoNoChildren" type="checkbox" class="mfCheckbox"> No "No more children"</label>' +
                    '<label><input id="mlNoChildren" type="checkbox" class="mfCheckbox"> No children and no "No more children"</label>' +
                    "</div>"
            );
            mlButtons.insertAfter($("#tableButtons"));
            $(".mfCheckbox")
                .off("change")
                .on("change", function (e) {
                    const id = $(this).attr("id");
                    const optId = `#missingFamily_options_${id[2].toLowerCase() + id.substring(3)}`;
                    $(optId).prop("checked", $(this).prop("checked"));
                    $("#saveSettingsChanges").trigger("click");
                });
        }
        $("#mlNoParents").prop("checked", Settings.current["missingFamily_options_noParents"]);
        $("#mlOneParent").prop("checked", Settings.current["missingFamily_options_oneParent"]);
        $("#mlNoNoSpouses").prop("checked", Settings.current["missingFamily_options_noNoSpouses"]);
        $("#mlNoNoChildren").prop("checked", Settings.current["missingFamily_options_noNoChildren"]);
        $("#mlNoChildren").prop("checked", Settings.current["missingFamily_options_noChildren"]);
    }

    static addFiltersToPeopleTable() {
        const table = document.querySelector("#peopleTable");
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
                filterCell.title = "Select a column value to which to limit the rows";
                filterRow.appendChild(filterCell);
                // $(
                // "<select id='cc7PBFilter' title='Select which Privacy/BioCheck rows should be displayed'>"
                // <option value='all' title="Everything" selected>&nbsp;</option>"
                // <option value='bioBad' title="With Bio Check Issues">./views/cc7/images/checkbox-cross-red-icon.png</option>"
                // <option value='bioOK' title="No Bio Check Issues">./views/cc7/images/checkmark-box-green-icon.png</option>"
                // <option value='60' title='Privacy: Open'>./views/cc7/images/privacy_open.png</option>" +
                // <option value='50' title='Public'>./views/cc7/images/privacy_public.png</option>" +
                // <option value='40' title='Private with Public Bio and Tree'>./views/cc7/images/privacy_public-tree.png</option>"
                // etc.
                // );
                const filterSelect = document.createElement("select");
                filterSelect.id = "cc7PBFilter";
                filterSelect.title = "Select which Privacy/BioCheck rows should be displayed";
                let filterOption = document.createElement("option");
                filterOption.value = "all";
                filterOption.title = "Everything";
                filterOption.text = " ";
                filterSelect.appendChild(filterOption);
                if (Settings.current["biocheck_options_biocheckOn"]) {
                    filterOption = document.createElement("option");
                    filterOption.value = "bioBad";
                    filterOption.title = "With Bio Check Issues";
                    filterOption.text = "./views/cc7/images/checkbox-cross-red-icon.png";
                    filterSelect.appendChild(filterOption);
                    filterOption = document.createElement("option");
                    filterOption.value = "bioOK";
                    filterOption.title = "No Bio Check Issue";
                    filterOption.text = "./views/cc7/images/checkmark-box-green-icon.png";
                    filterSelect.appendChild(filterOption);
                }
                for (const privLevel of PeopleTable.PRIVACY_LEVELS.keys()) {
                    const privacy = PeopleTable.PRIVACY_LEVELS.get(privLevel);
                    filterOption = document.createElement("option");
                    filterOption.value = privLevel;
                    filterOption.title = privacy.title;
                    filterOption.text = privacy.img;
                    filterSelect.appendChild(filterOption);
                }
                filterCell.appendChild(filterSelect);
                return;
            } else if (i == 1) {
                filterCell.colSpan = 2;
                filterCell.style.textAlign = "right";
                filterCell.innerHTML = "Filters";
                filterCell.title =
                    "Show only rows with these column values. > and < may be used for numerical columns.";
                filterRow.appendChild(filterCell);
                return;
            }
            const headerCellText = headerCell.textContent.trim();
            const originalHeaderCellText = originalHeaderCells[i].textContent.trim();
            if (!["Pos.", "P/B"].includes(headerCellText) && !["Pos.", "P/B", ""].includes(originalHeaderCellText)) {
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
                        } else if (CC7Utils.isNumeric(cellTextStripped)) {
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
                    filterInput.addEventListener("input", PeopleTable.stripLtGt);
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

        function formatOptions(option) {
            // option:
            // {
            //     "id": "value attribute" || "option text",
            //     "text": "label attribute" || "option text",
            //     "element": HTMLOptionElement
            // }
            if (!option.id || option.id == "all") {
                return option.text;
            }
            return $(`<img class="privacyImage" src="./${option.text}"/>`);
        }
        $("#cc7PBFilter").select2({
            templateResult: formatOptions,
            templateResult: formatOptions,
            templateSelection: formatOptions,
            dropdownParent: $("#cc7Container"),
            minimumResultsForSearch: Infinity,
            width: "2em",
        });

        document.querySelectorAll(".filter-input").forEach((input) => {
            input.addEventListener("input", PeopleTable.filterListener);
        });
        $("#cc7PBFilter").off("select2:select").on("select2:select", PeopleTable.filterListener);

        // Add Clear Filters button
        $("#clearTableFiltersButton").remove();
        const clearFiltersButton = document.createElement("button");
        clearFiltersButton.textContent = "X";
        clearFiltersButton.title = "Clear Filters";
        clearFiltersButton.id = "clearTableFiltersButton";
        //  clearFiltersButton.style.position = "absolute";
        clearFiltersButton.addEventListener("click", PeopleTable.clearFilterClickListener);

        $(clearFiltersButton).insertAfter($("#wideTableButton"));
        clearFiltersButton.textContent = "Clear Filters";

        // Initially hide the button
        clearFiltersButton.style.display = "none";
    }

    static clearFilterClickListener() {
        document.querySelectorAll(".filter-input").forEach((input) => {
            input.value = "";
        });
        $("#cc7PBFilter").val("all").trigger("change");
        PeopleTable.filterFunction();
        PeopleTable.updateClearFiltersButtonVisibility();
    }

    static filterFunction() {
        const table = document.querySelector("#peopleTable");
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

            const filters = [];
            filterInputs.forEach((input, inputIndex) => {
                let filterText = input.value.toLowerCase();
                if (filterText.length == 0) {
                    return;
                }
                const columnIndex =
                    Array.from(input.parentElement.parentElement.children).indexOf(input.parentElement) + 1;
                filters.push({
                    input: input,
                    cellText: row.children[columnIndex].textContent.toLowerCase(),
                });
            });

            let displayRow = true;
            filters.forEach((filter, inputIndex) => {
                const input = filter.input;
                let filterText = input.value.toLowerCase();
                let cellText = filter.cellText;
                const isDateColumn = input.classList.contains("date-input");
                const isNumericColumn = input.classList.contains("numeric-input");
                let operator;
                if (["<", ">", "!", "?"].includes(filterText[0])) {
                    operator = filterText[0];
                    if (operator == "!") operator = "!=";
                    filterText = filterText.slice(1);
                    if (filterText.length == 0 && operator != "?") {
                        return;
                    }
                }

                // Perform the appropriate checks
                // Note, since we want the && of all the filters, the code below should only set
                // displayRow to false as and when necessary (and never set it to true).
                if (operator == "?") {
                    // Select rows with an empty cell in this column
                    if (cellText != "") displayRow = false;
                } else if (
                    (isNumericColumn && filterText != "~") ||
                    (isDateColumn && (operator == ">" || operator == "<"))
                ) {
                    // Use the operator to do an actual comparison
                    if (filterText.length > 0) {
                        if (operator) {
                            filterText = parseFloat(filterText);
                        } else if (!operator && isNumericColumn) {
                            operator = "=="; // Default to equality if there's no operator
                            filterText = parseFloat(filterText.replace(/[<>~]/g, ""));
                        } else {
                            filterText = `"${filterText}"`;
                        }
                        if (isDateColumn) {
                            let year = cellText.slice(0, 4); // Get the year part of the date
                            if (year.endsWith("s")) {
                                year = year.slice(0, -1); // Remove the 's' for decade dates
                            }
                            cellText = parseFloat(year);
                        } else if (isNumericColumn) {
                            cellText = parseFloat(cellText.replace(/[<>~]/g, ""));
                        } else {
                            cellText = `"${cellText}"`;
                        }
                        if (!eval(cellText + operator + filterText)) {
                            displayRow = false;
                        }
                    }
                } else {
                    // Perform partial matching and lip the result for the not (!) operator
                    let aMatch = cellText.includes(filterText);
                    if (operator == "!=") {
                        aMatch = !aMatch;
                    }
                    if (!aMatch) displayRow = false;
                }
            });
            // Add the Privacy/BioCheck filter
            const pbFilterSelected = $("#cc7PBFilter").select2("data")[0];
            const reqPrivacy = pbFilterSelected.id;
            if (reqPrivacy != "all") {
                if (reqPrivacy == "bioOK") {
                    if (row.children[0].classList.contains("bioIssue")) displayRow = false;
                } else if (reqPrivacy == "bioBad") {
                    if (!row.children[0].classList.contains("bioIssue")) displayRow = false;
                } else {
                    const rowPrivacy = row.getAttribute("data-privacy");
                    if (rowPrivacy != reqPrivacy) displayRow = false;
                }
            }

            row.style.display = displayRow ? "" : "none";
        });
        $("#peopleTable").floatingScroll("update");
    }

    static anyFilterActive() {
        return (
            Array.from(document.querySelectorAll(".filter-input")).some((input) => input.value.trim() !== "") ||
            $("#cc7PBFilter").select2("data")[0].id != "all"
        );
    }

    static updateClearFiltersButtonVisibility() {
        // let anyFilterHasText = Array.from(document.querySelectorAll(".filter-input")).some(
        //     (input) => input.value.trim() !== ""
        // );
        // if ($("#cc7PBFilter").select2("data")[0].id != "all") anyFilterHasText = true;
        const clearFiltersButton = document.querySelector("#clearTableFiltersButton");
        clearFiltersButton.style.display = PeopleTable.anyFilterActive() ? "inline-block" : "none";
    }

    static stripLtGt() {
        if (this.value == ">" || this.value == "<") {
            this.value = "";
        }
    }

    static filterListener() {
        PeopleTable.filterFunction();
        PeopleTable.updateClearFiltersButtonVisibility();
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

    static #BMD_EVENTS = ["Birth", "Death", "Marriage"];

    static getTimelineEvents(tPerson) {
        const family = [tPerson].concat(tPerson.Parent, tPerson.Sibling, tPerson.Spouse, tPerson.Child);
        const timeLineEvent = [];
        const startDate = PeopleTable.getTheYear(tPerson.BirthDate, "Birth", tPerson);

        // Get all BMD events for each family member
        family.forEach(function (aPerson) {
            PeopleTable.#BMD_EVENTS.forEach(function (ev) {
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
                        aPerson.Relation = CC7Utils.mapGender(gender, "son", "daughter", "child");
                    } else if (theRelation == "Sibling") {
                        aPerson.Relation = CC7Utils.mapGender(gender, "brother", "sister", "sibling");
                    } else if (theRelation == "Parent") {
                        aPerson.Relation = CC7Utils.mapGender(gender, "father", "mother", "parent");
                    } else if (theRelation == "Spouse") {
                        aPerson.Relation = CC7Utils.mapGender(gender, "husband", "wife", "spouse");
                    } else {
                        aPerson.Relation = theRelation;
                    }
                }
                if (evDate != "" && evDate != "0000" && CC7Utils.isOK(evDate)) {
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
                                if (warTemplates.includes(templateTitle) && CC7Utils.isOK(aBitFact)) {
                                    if (aBitField == "startdate") {
                                        evDateStart = PeopleTable.dateToYMD(aBitFact);
                                        evStart = "joined " + templateTitle;
                                    }
                                    if (aBitField == "enddate") {
                                        evDateEnd = PeopleTable.dateToYMD(aBitFact);
                                        evEnd = "left " + templateTitle;
                                    }
                                    if (aBitField == "enlisted") {
                                        evDateStart = PeopleTable.dateToYMD(aBitFact);
                                        evStart = "enlisted for " + templateTitle.replace("american", "American");
                                    }
                                    if (aBitField == "discharged") {
                                        evDateEnd = PeopleTable.dateToYMD(aBitFact);
                                        evEnd = "discharged from " + templateTitle.replace("american", "American");
                                    }
                                    if (aBitField == "branch") {
                                        evLocation = aBitFact;
                                    }
                                }
                            }
                        });
                        if (CC7Utils.isOK(evDateStart)) {
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
                        if (CC7Utils.isOK(evDateEnd)) {
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

    static getTheYear(theDate, ev, person) {
        if (!CC7Utils.isOK(theDate)) {
            if (ev == "Birth" || ev == "Death") {
                theDate = person[ev + "DateDecade"];
            }
        }
        let theDateM = theDate?.match(/[0-9]{4}/);
        if (CC7Utils.isOK(theDateM)) {
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

    static buildTimeline(tPerson, timelineEvents) {
        const tPersonFirstName = tPerson.FirstName || "(Private)";
        const timelineTable = $(
            `<div class='timeline' data-wtid='${tPerson.Name}'><w>↔</w><x>[ x ]</x><table class="timelineTable">` +
                `<caption>Events in the life of ${tPersonFirstName}'s family</caption>` +
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
            const bpBD = PeopleTable.getApproxDate(bpBdate);
            const evDate = PeopleTable.getApproxDate(aFact.eventDate);
            const aPersonBD = PeopleTable.getApproxDate(aFact.birthDate);
            if (bpBD.Approx == true) {
                aboutAge = "~";
            }
            if (evDate.Approx == true) {
                aboutAge = "~";
            }
            const bpAgeAtEvent = CC7Utils.getAge(new Date(bpBD.Date), new Date(evDate.Date));
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

            let fNames = aFact.firstName || "(Private)";
            if (aFact.evnt == "marriage") {
                fNames = tPersonFirstName + " and " + fNames;
                relation = "";
            }
            const tlFirstName = CC7Utils.profileLink(aFact.wtId, fNames);
            const tlEventLocation = "<td class='tlEventLocation'>" + aFact.location + "</td>";

            if (aPersonBD.Approx == true) {
                aboutAge = "~";
            }
            let aPersonAge = CC7Utils.getAge(new Date(aPersonBD.Date), new Date(evDate.Date));
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
            if (PeopleTable.#BMD_EVENTS.includes(aFact.evnt)) {
                descr =
                    CC7Utils.capitalizeFirstLetter(eventName) +
                    " of " +
                    (relation == "" ? relation : relation + ", ") +
                    tlFirstName +
                    (theAge == "" ? "" : ", " + theAge);
            } else {
                const who =
                    relation == ""
                        ? tlFirstName
                        : CC7Utils.capitalizeFirstLetter(relation) +
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
        const theClickedRow = jqClicked.closest("tr");
        const id = +theClickedRow.attr("data-id");
        let tPerson = window.people.get(id);
        const theClickedName = tPerson.Name;
        const familyId = theClickedName.replace(" ", "_") + "_timeLine";
        const $timelineTable = $(`#${familyId}`);
        if ($timelineTable.length) {
            $timelineTable.css("z-index", `${Settings.getNextZLevel()}`).slideToggle(() => {
                PeopleTable.setOffset(jqClicked, $timelineTable, 30, 30);
            });
            return;
        }

        CC7Utils.assignRelationshipsFor(tPerson);
        const familyFacts = PeopleTable.getTimelineEvents(tPerson);
        // Sort the events
        familyFacts.sort((a, b) => {
            return a.eventDate.localeCompare(b.eventDate);
        });
        if (!tPerson.FirstName) {
            tPerson.FirstName = tPerson.RealName;
        }
        // Make a table
        const timelineTable = PeopleTable.buildTimeline(tPerson, familyFacts, familyId);
        timelineTable.attr("id", familyId);
        PeopleTable.showTable(jqClicked, timelineTable, 30, 30);
    }

    static showTable(jqClicked, theTable, lOffset, tOffset) {
        // Attach the table to the container div
        theTable.prependTo($("#cc7Container"));
        theTable.draggable();
        theTable.off("dblclick").on("dblclick", function () {
            $(this).slideUp();
        });

        PeopleTable.setOffset(jqClicked, theTable, lOffset, tOffset);
        $(window).resize(function () {
            if (theTable.length) {
                PeopleTable.setOffset(jqClicked, theTable, lOffset, tOffset);
            }
        });

        theTable.css("z-index", `${Settings.getNextZLevel()}`);
        theTable.slideDown("slow");
        theTable
            .find("x")
            .off("click")
            .on("click", function () {
                theTable.slideUp();
            });
        theTable
            .find("w")
            .off("click")
            .on("click", function () {
                theTable.toggleClass("wrap");
            });
    }

    static getOffset(el) {
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
        };
    }

    static setOffset(theClicked, elem, lOffset, tOffset) {
        const theLeft = PeopleTable.getOffset(theClicked[0]).left + lOffset;
        elem.css({ top: PeopleTable.getOffset(theClicked[0]).top + tOffset, left: theLeft });
    }

    static showBioCheckReport(jqClicked) {
        const theClickedRow = jqClicked.closest("tr");
        const id = +theClickedRow.attr("data-id");
        let person = window.people.get(id);
        if (typeof person.bioCheckReport == "undefined" || person.bioCheckReport.length == 0) {
            return;
        }
        const theClickedName = person.Name;
        const familyId = theClickedName.replace(" ", "_") + "_bioCheck";
        const $bioReportTable = $(`#${familyId}`);
        if ($bioReportTable.length) {
            $bioReportTable.css("z-index", `${Settings.getNextZLevel()}`).slideToggle(() => {
                PeopleTable.setOffset(jqClicked, $bioReportTable, 30, 30);
            });
            return;
        }

        const bioReportTable = PeopleTable.getBioCheckReportTable(person);
        bioReportTable.attr("id", familyId);
        PeopleTable.showTable(jqClicked, bioReportTable, 30, 30);
    }

    static getBioCheckReportTable(person) {
        const issueWord = person.bioCheckReport.length == 1 ? "issue" : "issues";
        const bioCheckTable = $(
            `<div class='bioReport' data-wtid='${person.Name}'><w>↔</w><x>[ x ]</x><table class="bioReportTable">` +
                `<caption>Bio Check found the following ${issueWord} with the biography of ${person.FirstName}</caption>` +
                "<tbody><tr><td><ol></ol></td></tr></tbody></table></div>"
        );

        const ol = bioCheckTable.find("tbody ol");
        for (const [msg, subLines] of person.bioCheckReport) {
            let msgLI = $("<li></li>").text(msg);
            if (subLines && subLines.length > 0) {
                const subList = $("<ul></ul>");
                for (const line of subLines) {
                    subList.append($("<li></li>").text(line));
                }
                msgLI = msgLI.append(subList);
            }
            ol.append(msgLI);
        }
        return bioCheckTable;
    }

    static peopleToTable(kPeople) {
        const personOfInterest = kPeople[0];
        let disName = PeopleTable.displayName(personOfInterest)[0];
        if ($("#cc7Container").length) {
            if (personOfInterest.MiddleName) {
                disName = disName.replace(personOfInterest.MiddleName + " ", "");
            }
        }
        const captionHTML = CC7Utils.profileLink(CC7Utils.htmlEntities(kPeople[0].Name), disName);
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
            let oName = PeopleTable.displayName(kPers)[0];

            if (kPers.Relation) {
                kPers.Relation = kPers.Relation.replace(/s$/, "").replace(/ren$/, "");
                if (rClass != "self") {
                    kPers.RelationShow = kPers.Relation;
                }
            }
            if (oName) {
                let oBDate = CC7Utils.ymdFix(bDate);
                let oDDate = CC7Utils.ymdFix(dDate);
                if (isDecades == true) {
                    oBDate = kPers.BirthDateDecade;
                    if (oDDate != "") {
                        oDDate = kPers.DeathDateDecade;
                    }
                }
                const linkName = CC7Utils.htmlEntities(kPers.Name);
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
                        CC7Utils.profileLink(linkName, oName) +
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
                    const dMdate = CC7Utils.ymdFix(marriageData.MarriageDate);
                    if (dMdate != "") {
                        marriageDeets += " " + dMdate;
                    }
                    if (CC7Utils.isOK(marriageData.MarriageLocation)) {
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

    static doFamilySheet(fPerson, jqClicked) {
        const theClickedName = fPerson.Name;
        const familyId = theClickedName.replace(" ", "_") + "_family";
        const $famSheet = $(`#${familyId}`);
        if ($famSheet.length) {
            $famSheet.css("z-index", `${Settings.getNextZLevel()}`).slideToggle(() => {
                PeopleTable.setOffset(jqClicked, $famSheet, 30, 30);
            });
            return;
        }

        CC7Utils.assignRelationshipsFor(fPerson);
        const thisFamily = [fPerson].concat(fPerson.Parent, fPerson.Sibling, fPerson.Spouse, fPerson.Child);

        const famSheet = PeopleTable.peopleToTable(thisFamily);
        famSheet.attr("id", familyId);
        PeopleTable.showTable(jqClicked, famSheet, 30, 30);
    }

    static showFamilySheet(jqClicked) {
        const theClickedRow = jqClicked.closest("tr");
        const theClickedName = theClickedRow.attr("data-name");
        const theClickedId = +theClickedRow.attr("data-id");

        const aPeo = window.people.get(theClickedId);
        if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
            PeopleTable.doFamilySheet(aPeo, jqClicked);
        } else if (!theClickedName.startsWith("Private") || theClickedId > 0) {
            const key = theClickedName.startsWith("Private") ? theClickedId : theClickedName;
            console.log(`Calling getRelatives for ${key}`);
            WikiTreeAPI.postToAPI({
                appId: Settings.APP_ID,
                action: "getRelatives",
                getSpouses: "1",
                getChildren: "1",
                getParents: "1",
                getSiblings: "1",
                keys: key,
            }).then((data) => {
                // Construct this person so it conforms to the profiles retrieved using getPeople
                const mPerson = PeopleTable.convertToInternal(data[0].items[0]);
                PeopleTable.doFamilySheet(mPerson, jqClicked);
            });
        }
    }

    static convertToInternal(item) {
        const pData = item.person;
        if (!pData.Name && item.user_name) pData.Name = item.user_name;
        if (!pData.Name) pData.Name = pData.Id;

        const person = PeopleTable.addFamilyToPerson(pData);
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
        const curPerson = window.people.get(+person.Id);
        if (curPerson) {
            // Copy fields not present in the new person from the old to the new
            let x = Object.entries(curPerson);
            for (const [key, value] of x) {
                if (typeof person[key] == "undefined") {
                    person[key] = value;
                }
            }
        }
        window.people.set(+person.Id, person);
        return person;
    }

    static addFamilyToPerson(person) {
        person.Parent = PeopleTable.getRels(person.Parents, "Parent");
        person.Sibling = PeopleTable.getRels(person.Siblings, "Sibling");
        person.Spouse = PeopleTable.getRels(person.Spouses, "Spouse");
        person.Child = PeopleTable.getRels(person.Children, "Child");
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

    static cc7excelOut(fileType) {
        const bioCheck = Settings.current["biocheck_options_biocheckOn"];
        const idMap = new Map();
        const sheetName = PeopleTable.makeSheetname();

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
            "Manager",
            "Created",
            "Modified",
        ];
        if (bioCheck) {
            // Add biocheck column
            headings.splice(1, 0, "Bio Issue");
        }

        ws_data.push(headings, []);
        $("#peopleTable > tbody tr").each(function () {
            const row = $(this);
            if (!row.is(":visible")) return;
            const tds = row.find("td");
            let birthdate, birthplace, deathdate, deathplace, deathAge, created, touched, bioIssue;
            tds.each(function () {
                if ($(this).hasClass("privBio")) {
                    bioIssue = $(this).hasClass("bioIssue");
                }
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
                row.data("manager"),
                created,
                touched,
            ];
            if (bioCheck) {
                // Add biocheck column and create id lookup table
                pData.splice(1, 0, bioIssue);
                if (bioIssue) idMap.set(row.data("name"), row.data("id"));
            }
            ws_data.push(pData);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        Object.getOwnPropertyNames(ws)
            .filter((k) => k.startsWith("A"))
            .forEach((aCell) => {
                const bCell = `B${aCell.substring(1)}`;
                const wtId = ws[aCell].v;
                if (wtId.match(/.+\-.+/)) {
                    // Add a hyperlink to the WtId cell
                    ws[aCell].l = { Target: `https://www.wikitree.com/wiki/${wtId}` };
                }
                if (bioCheck && ws[bCell].v === true) {
                    // Add a BioCeck column with the BioCheck report as comment
                    const id = idMap.get(wtId);
                    const person = window.people.get(id);
                    if (person?.bioCheckReport) {
                        ws[bCell].c = [{ a: "WT", t: formCommentFromReport(person.bioCheckReport) }];
                    }
                }
            });

        function formCommentFromReport(bioCheckReport) {
            let comment = "";
            let cnt = 0;
            for (let [msg, subLines] of bioCheckReport) {
                if (subLines && subLines.length > 0) {
                    let subList = "";
                    for (const line of subLines) {
                        subList = subList.concat("\n  * ", line);
                    }
                    msg += subList;
                }
                if (++cnt == 1) {
                    comment += `${cnt}. `;
                } else {
                    comment += `\n${cnt}. `;
                }
                comment += msg;
            }
            return comment;
        }

        wb.Sheets[sheetName] = ws;

        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
            return buf;
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
        if (bioCheck) {
            wscols.splice(1, 0, { wch: 5 });
        }

        ws["!cols"] = wscols;

        const wbout = XLSX.write(wb, { bookType: fileType, type: "binary" });
        saveAs(
            new Blob([s2ab(wbout)], { type: "application/octet-stream" }),
            PeopleTable.makeFilename() + "." + fileType
        );
    }

    static makeFilename() {
        return (
            PeopleTable.makeSheetname() +
            "_" +
            new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19) +
            "_" +
            $("#cc7Subset").val().substring(0, 3) +
            (PeopleTable.anyFilterActive() ? "_filtered" : "")
        );
    }

    static makeSheetname() {
        const prefix = $("#cc7Container").hasClass("degreeView") ? "CC_Deg" : "CC";
        return `${prefix}${window.cc7Degree}_${wtViewRegistry.getCurrentWtId()}`;
    }
}
