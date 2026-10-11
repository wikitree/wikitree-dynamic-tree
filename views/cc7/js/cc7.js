/**
 * This code was originally written by Ian Beacall (Beacall-6) as a stand-alone WikiTree App.
 * With Ian's permission, Riël Smit (Smit-641) adapted it to be a WikiTree Dynamic Tree view
 * using the getPeople API call for fetching the CC7 profiles.
 *
 * It makes use (through direct code inclusion) of FileSave (https://github.com/eligrey/FileSaver.js/)
 * and SheetJs (https://www.npmjs.com/package/xlsx)
 */
import { theSourceRules } from "../../../lib/biocheck-api/src/SourceRules.js";
import { BioCheckPerson } from "../../../lib/biocheck-api/src/BioCheckPerson.js";
import { Biography } from "../../../lib/biocheck-api/src/Biography.js";
import { PeopleTable } from "./PeopleTable.js";
import { CC7Notes } from "./CC7Notes.js";
import { Settings } from "./Settings.js";
import { CC7Utils } from "./CC7Utils.js";
import { Utils } from "../../shared/Utils.js";
import { CirclesView } from "./CirclesView.js";
import { HELP_TEXT } from "./CC7Help.js";

export { CC7, downloadArray, CC7UrlParams, CC7MLParamMap, CC7CirclesParamMap };

// CC7Views-specific URL paramters
const CC7UrlParams = [
    "cc7View",
    "degrees",
    "getExtra",
    "only",
    "nop",
    "onep",
    "nonms",
    "nonmc",
    "nonmcnc",
    "gender",
    "display",
    "fill",
    "bnw",
    "gray",
];

// Map between the CC7 missing family parameter selectors, the URL parameters, and the Settings names
const CC7MLParamMap = [
    { id: "mlNoParents", urlp: "nop", option: "missingFamily_options_noParents" },
    { id: "mlOneParent", urlp: "onep", option: "missingFamily_options_oneParent" },
    { id: "mlNoNoSpouses", urlp: "nonms", option: "missingFamily_options_noNoSpouses" },
    { id: "mlNoNoChildren", urlp: "nonmc", option: "missingFamily_options_noNoChildren" },
    { id: "mlNoChildren", urlp: "nonmcnc", option: "missingFamily_options_noChildren" },
];

// Map between the CC7 circles parameter selectors and the URL parameters
const CC7CirclesParamMap = [
    { id: "displayType_filled", urlp: "fill" },
    { id: "displayType_BandW", urlp: "bnw" },
    { id: "displayType_GrayAncs", urlp: "gray" },
];

// Which URL parameters are valid for which view
const CC7ParamMap = {
    table: ["only", CC7MLParamMap.map((x) => x.urlp)].flat(),
    list: ["only", CC7MLParamMap.map((x) => x.urlp)].flat(),
    hierarchy: [],
    stats: ["only", "gender"],
    ml: CC7MLParamMap.map((x) => x.urlp),
    circles: ["display", CC7CirclesParamMap.map((x) => x.urlp)].flat(),
};

// const NON_BIO = "5"; // DataStatus value for non-biological parent

class CC7 {
    static LONG_LOAD_WARNING =
        "Loading 7 degrees may take a while, especially with Bio Check enabled (it can be 3 minutes or more) " +
        "so the default is set to 3. Feel free to change it. ";
    static firstTimeLoad = true;
    static SETTINGS_GEAR = "&#x2699;";

    static GET_PEOPLE_FIELDS = [
        "BioFather",
        "BioMother",
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
        "IsMember",
        "LastNameAtBirth",
        "LastNameCurrent",
        "LastNameOther",
        "Manager",
        "Managers",
        "Meta",
        "MiddleName",
        "Mother",
        "Name",
        "Nicknames",
        "NoChildren",
        "PhotoData",
        "Prefix",
        "Privacy",
        "RealName",
        "ResearchStatus",
        "ShortName",
        "Spouses",
        "Suffix",
        "Templates",
        "Touched",
    ].join(",");

    static VIEWS = {
        TABLE: "table",
        HIERARCHY: "hierarchy",
        LIST: "list",
        STATS: "stats",
        MISSING_LINKS: "ml",
        CIRCLES: "circles",
    };

    static GET_PEOPLE_LIMIT = 1025;
    static MAX_DEGREE = 7;

    static cancelLoadController;
    static URL_PARAMS = {};

    // Constants for IndexedDB
    static CONNECTION_DB_NAME = "ConnectionFinderWTE";
    static CONNECTION_DB_VERSION = 2;
    static CONNECTION_STORE_NAME = "distance2";
    static RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
    static RELATIONSHIP_DB_VERSION = 2;
    static RELATIONSHIP_STORE_NAME = "relationship2";

    constructor(selector, startId, params) {
        this.startId = startId;
        this.selector = selector;
        Object.assign(CC7.URL_PARAMS, params);

        Settings.restoreSettings();
        $(selector).html(
            `<div id="${CC7Utils.CC7_CONTAINER_ID}" class="cc7Table">
            <div class="mt-1">
            <button
                id="getPeopleButton"
                class="btn btn-primary btn-sm ms-1 me-1"
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
            ><button id="getDegreeButton" class="btn btn-secondary btn-sm ms-1 me-3"
                title="Get only people connected at the indicated degree">
                Get Degree 3 Only</button
            ><button id="cancelLoad" class="btn btn-primary btn-sm"
                title="Cancel the current loading of profiles.">
                Cancel</button
            ><button id="savePeople" class="btn btn-secondary btn-sm ms-1"
                title="Save this data to a file for faster loading next time.">
                Save</button
            ><button id="loadButton" class="btn btn-secondary btn-sm ms-1"
                title="Load a previously saved data file.">
                Load A File</button
            ><input class="form-check-input ms-2"
              id="getExtraDegrees"
              type="checkbox"
              title="Retrieve extra degrees (in addition to those requested) when a GET button is clicked, to ensure the counts of relatives are more accurate." />
            <label class="form-check-label"
              for="getExtraDegrees"
              title="Retrieve extra degrees (in addition to those requested) when a GET button is clicked, to ensure the counts of relatives are more accurate.">
              Improve count accuracy</label
            ><input type="file" id="fileInput" style="display: none"/>
            <input type="file" id="noteFileInput" style="display: none"/>
            <span id="adminButtons">
              <span id="settingsButton" title="Settings"><img src="./views/cc7/images/setting-icon.png" /></span>
              <span id="help" title="About this">?</span>
            </span>
            ${Settings.getSettingsDiv()}
            <div id="explanation" class="pop-up">${HELP_TEXT}</div>
            </div>
            </div>`
        );

        $("#cc7Degree")
            .off("change")
            .on("change", function () {
                const theDegree = $("#cc7Degree").val();
                CC7.handleDegreeChange(theDegree);
            });
        $("#getExtraDegrees")
            .off("change")
            .on("change", function () {
                const theDegree = $("#cc7Degree").val();
                CC7.updateButtonLabels(theDegree);
                CC7.updateURL();
            });
        $("#getPeopleButton").off("click").on("click", CC7.getConnectionsAction);

        $("#help")
            .off("click")
            .on("click", function () {
                $("#explanation").css("z-index", `${Settings.getNextZLevel()}`).slideToggle();
            });
        $("#cc7Container")
            .off("click", "x")
            .on("click", "x", function () {
                CC7.closePopup($(this).parent());
            });
        $("#explanation").draggable();

        $("#settingsButton").off("click").on("click", CC7.toggleSettings);
        $("#saveSettingsChanges")
            .html("Apply Changes")
            .addClass("btn-sm")
            .off("click")
            .on("click", CC7.settingsChanged);
        $("#settingsDIV").addClass("pop-up").css("width", "400");

        $("#cc7Container")
            .off("dblclick", ".pop-up")
            .on("dblclick", ".pop-up", function () {
                CC7.closePopup($(this));
            });

        $("#cc7Container")
            .off("click", ".pop-up")
            .on("click", ".pop-up", function () {
                // Bring the clicked popup to the front
                const self = $(this);
                const myId = self.attr("id");
                const [lastPopup] = CC7.findTopPopup();
                if (self.is(":visible") && myId != lastPopup?.attr("id")) {
                    self.css("z-index", ++StatsView.lastZLevel);
                }
            });

        $("#settingsDIV").draggable();
        Settings.renderSettings();
        CC7.setInfoPanelMessage();

        // These 3 buttons are defined in Settings.js, but I could not get the setting's onClick function definition
        // to work so I am just forcing the issue here
        $("#notes_functions_backupNotes")
            .removeClass("btn-primary")
            .addClass("btn-secondary btn-sm mb-1")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                CC7Notes.backupNotes();
            });
        $("#notes_functions_deleteNotes")
            .removeClass("btn-primary")
            .addClass("btn-secondary btn-sm mb-1")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                CC7Notes.deleteAllNotes();
            });
        $("#notes_functions_restoreNotes")
            .removeClass("btn-primary")
            .addClass("btn-secondary btn-sm mb-1")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                $("#noteFileInput").trigger("click");
            });
        $("#noteFileInput")
            .off("change")
            .on("change", function (e) {
                CC7Notes.restoreNotes(e);
                this.value = "";
            });

        $("#cancelLoad").off("click").on("click", CC7.cancelLoad);
        $("#getDegreeButton").off("click").on("click", CC7.getOneDegreeOnly);

        $("#savePeople")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                CC7.handleFileDownload();
            });
        $("#loadButton")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                $("#fileInput").trigger("click");
            });
        $("#fileInput")
            .off("change")
            .on("change", function (e) {
                CC7.handleFileUpload(e);
                this.value = "";
            });

        // handle "degrees" parameter
        if (params["degrees"]) {
            const cc7Degree = Number(params["degrees"]);
            if (cc7Degree && cc7Degree > 0 && cc7Degree <= CC7.MAX_DEGREE) {
                CC7.handleDegreeChange(cc7Degree, false);
            }
        } else {
            const cc7Degree = Utils.getCookie("w_cc7Degree");
            if (cc7Degree && cc7Degree > 0 && cc7Degree <= CC7.MAX_DEGREE) {
                CC7.handleDegreeChange(cc7Degree, false);
            }
        }

        // Handle "getExtra" parameter
        const getExtra = params["getExtra"];
        if (typeof getExtra !== "undefined" && getExtra !== "0") {
            $("#getExtraDegrees").prop("checked", true);
            CC7.updateButtonLabels($("#cc7Degree").val());
        }

        // Start loading the people data
        $("#getPeopleButton").trigger("click");
        $(document).off("keyup", CC7.closeTopPopup).on("keyup", CC7.closeTopPopup);
    }

    static closePopup(jqPopup) {
        if (jqPopup.hasClass("cc7notes")) {
            CC7Notes.saveNote(jqPopup);
        } else {
            jqPopup.slideUp("fast");
        }
    }

    static setInfoPanelMessage() {
        const loadWarning = CC7.firstTimeLoad ? CC7.LONG_LOAD_WARNING : "";
        wtViewRegistry.setInfoPanel(
            `Bio Check is ${Settings.current["biocheck_options_biocheckOn"] ? "ENABLED" : "DISABLED"} in settings. ` +
                loadWarning
        );
        wtViewRegistry.showInfoPanel();
    }

    static cancelLoad() {
        if (CC7.cancelLoadController) {
            CC7.clearDisplay();
            wtViewRegistry.showWarning("Cancelling profile retrieval...");
            CC7.cancelLoadController.abort();
        }
    }

    static toggleSettings() {
        const theDIV = document.getElementById("settingsDIV");
        if (theDIV.style.display == "none") {
            theDIV.style.zIndex = `${Settings.getNextZLevel()}`;
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    }

    static settingsChanged(e) {
        if (Settings.hasSettingsChanged()) {
            const veryYoungImg = CC7Utils.imagePath(Settings.current["icons_options_veryYoung"]);
            const youngImg = CC7Utils.imagePath(Settings.current["icons_options_young"]);
            $("img.diedVeryYoungImg").each(function () {
                const it = $(this);
                it.attr("src", veryYoungImg);
            });
            $("img.diedYoungImg").each(function () {
                $(this).attr("src", youngImg);
            });
            if (!Settings.current["biocheck_options_biocheckOn"]) {
                $("td.bioIssue").each(function () {
                    $(this).off("click");
                    $(this).removeClass("bioIssue");
                });
            } else {
                CC7.redoBioCheckFlags();
            }
            CC7.setInfoPanelMessage();
            Utils.setCookie("w_diedYoung", JSON.stringify(Settings.current), { expires: 365 });
            if ($("#cc7Subset").val() == "missing-links") {
                $("#cc7Subset").trigger("change");
            }
        }
        CC7View.cancelSettings();
    }

    static redoBioCheckFlags() {
        $("#peopleTable tbody tr").each(function () {
            const $row = $(this);
            $row.find("td.bioIssue, td.bioIssue2").each(function () {
                const $td = $(this);
                const person = window.people.get(+$row.attr("data-id"));
                if (person) {
                    $td.removeClass("bioIssue bioIssue2").addClass(
                        Settings.mustHighlight(person.bioCheckReport) ? "bioIssue" : "bioIssue2"
                    );
                }
            });
        });
    }

    static updateButtonLabels(degree) {
        const getExtra = document.getElementById("getExtraDegrees").checked;
        $("#getPeopleButton").text(`Get CC${degree}${getExtra ? "+1" : ""}`);
        $("#getDegreeButton").text(`Get Degree ${degree}${getExtra ? "±1" : ""} Only`);
    }

    static handleDegreeChange(wantedDegree, withURLChange = true) {
        const newDegree = Math.min(CC7.MAX_DEGREE, wantedDegree);
        CC7.updateButtonLabels(newDegree);
        if (newDegree > 3) {
            CC7.LONG_LOAD_WARNING =
                "Loading larger degrees may take a while, especially with Bio Check enabled " +
                "(it can be 3 minutes or more for 7 degrees) so please be patient. ";
        } else if (newDegree != 3) {
            CC7.LONG_LOAD_WARNING =
                "Loading larger degrees may take a while, especially with Bio Check enabled " +
                "(it can be 3 minutes or more for 7 degrees) so please be patient when you do that. ";
        }
        // Set the selected degree value if required
        let theDegree = $("#cc7Degree").val();
        if (newDegree != theDegree) {
            const select = document.querySelector("#cc7Degree");
            select.value = newDegree;
        }
        // Set the cookie if required
        theDegree = Utils.getCookie("w_cc7Degree");
        if (newDegree != theDegree) {
            Utils.setCookie("w_cc7Degree", newDegree, { expires: 365 });
        }
        if (withURLChange) CC7.updateURL();
    }

    static updateURL() {
        const url = new URL(window.location.href);
        const usp = new URLSearchParams(url.hash.slice(1));
        const oldHash = usp.toString();
        const wtId = wtViewRegistry.getCurrentWtId();

        // console.log(`UpdateURL, actView=${PeopleTable.ACTIVE_VIEW}, oldHash=${oldHash}`, CC7.URL_PARAMS);
        function setUrlParam(param, value) {
            usp.set(param, value);
            CC7.URL_PARAMS[param] = value;
        }
        function clearUrlParam(param) {
            usp.delete(param);
            delete CC7.URL_PARAMS[param];
        }

        if (!PeopleTable.ACTIVE_VIEW) PeopleTable.ACTIVE_VIEW = CC7.VIEWS.TABLE;

        // Remove all current cc7-specific parameters that don't belong to this view
        const viewParams = CC7ParamMap[PeopleTable.ACTIVE_VIEW];
        for (const param of CC7UrlParams) {
            if (viewParams.includes(param)) continue;
            clearUrlParam(param);
        }
        //
        // Set parameters common to all the cc7 views
        //
        // This is not cc7 specific, but we set it, in case the user changed it
        usp.set("name", wtId);

        if (PeopleTable.ACTIVE_VIEW != CC7.VIEWS.TABLE) {
            setUrlParam("cc7View", PeopleTable.ACTIVE_VIEW);
        }
        usp.set("degrees", $("#cc7Degree").val());
        CC7.URL_PARAMS["degrees"] = $("#cc7Degree").val();

        if ($("#getExtraDegrees").prop("checked")) {
            setUrlParam("getExtra", "1");
        }

        //
        // Set parameters specific to the current view
        //

        function setMissingLinksParams() {
            for (const pm of CC7MLParamMap) {
                Settings.current[pm.option] ? setUrlParam(pm.urlp, "1") : clearUrlParam(pm.urlp);
            }
        }
        function clearMissingLinksParams() {
            for (const pm of CC7MLParamMap) {
                clearUrlParam(pm.urlp);
            }
        }

        function setOnlyParams() {
            clearUrlParam("only");
            clearMissingLinksParams();
            const subset = $("#cc7Subset").val();
            if (subset && subset != "all") {
                setUrlParam("only", subset);
                if (subset == "missing-links") {
                    setMissingLinksParams();
                }
            }
            const gender = $("#cc7Gender").val();
            gender && gender != "all" ? setUrlParam("gender", gender[0]) : clearUrlParam("gender");
        }

        switch (PeopleTable.ACTIVE_VIEW) {
            case CC7.VIEWS.TABLE:
            case CC7.VIEWS.LIST:
            case CC7.VIEWS.STATS:
                setOnlyParams();
                break;

            case CC7.VIEWS.MISSING_LINKS:
                setMissingLinksParams();
                break;

            case CC7.VIEWS.CIRCLES:
                if ($("#circlesBtnBar").length) {
                    const displayType = $('input[name="circlesDisplayType"]:checked').val();
                    setUrlParam("display", displayType);
                    for (const pm of CC7CirclesParamMap) {
                        if ($(`#${pm.id}`).prop("checked")) {
                            setUrlParam(pm.urlp, "1");
                        } else {
                            clearUrlParam(pm.urlp);
                        }
                    }
                }
                break;
            case CC7.VIEWS.HIERARCHY:
                break;
            default:
                console.error(`Unknown view: ${PeopleTable.ACTIVE_VIEW}`);
                break;
        }

        const newHash = usp.toString();
        if (newHash != oldHash) {
            window.history.pushState(null, null, "#" + newHash);
        }
        // console.log(`..done, actView=${PeopleTable.ACTIVE_VIEW}, oldHash=${newHash}`, CC7.URL_PARAMS);
    }

    static closeTopPopup(e) {
        if (e.key === "Escape") {
            // Find the popup with the highest z-index
            const [lastPopup, highestZIndex] = CC7.findTopPopup();

            // Close the popup with the highest z-index
            if (lastPopup) {
                CC7.closePopup(lastPopup);
                Settings.setNextZLevel(highestZIndex);
            }
        }
    }

    static findTopPopup() {
        // Find the popup with the highest z-index
        let highestZIndex = 0;
        let lastPopup = null;
        $(".pop-up:visible").each(function () {
            const zIndex = parseInt($(this).css("z-index"), 10);
            if (zIndex > highestZIndex) {
                highestZIndex = zIndex;
                lastPopup = $(this);
            }
        });
        return [lastPopup, highestZIndex];
    }

    static async getOneDegreeOnly(event) {
        wtViewRegistry.clearStatus();
        window.people = new Map();
        window.rootId = null;
        window.cc7MinPrivateId = 0;
        event.preventDefault();
        const wtId = wtViewRegistry.getCurrentWtId();
        if (wtId.match(/.+\-.+/)) {
            CC7.firstTimeLoad = false;
            $("#getPeopleButton").prop("disabled", true);
            $("#getDegreeButton").prop("disabled", true);
            $("#getExtraDegrees").prop("disabled", true);
            $("#cancelLoad").show();
            CC7.cancelLoadController = new AbortController();
            CC7.clearDisplay();
            Utils.showShakingTree(CC7Utils.CC7_CONTAINER_ID);
            $(`#${CC7Utils.CC7_CONTAINER_ID}`).addClass("degreeView");
            const theDegree = +$("#cc7Degree").val();
            const degreeCounts = []; // currently this is being ignored

            const starttime = performance.now();
            const [resultByKeyAtD, countAtD, dIsPartial] = await CC7.collectPeopelAtNthDegree(
                wtId,
                theDegree,
                degreeCounts
            );
            if (resultByKeyAtD == "aborted") {
                wtViewRegistry.showWarning("Profile retrieval cancelled.");
                Utils.hideShakingTree();
            } else {
                console.log(
                    `Retrieved ${countAtD} profiles at degrees ${theDegree - 1} to ${theDegree + 1} in ${
                        performance.now() - starttime
                    }ms`
                );
                if (dIsPartial) {
                    wtViewRegistry.showWarning(
                        `Due to limits imposed by the API, we could not retrieve all required data. Relative counts may also be incorrect.`
                    );
                }

                if (countAtD == 0) {
                    Utils.hideShakingTree();
                    return;
                }
                window.rootId = Utils.getProfileId(wtId, resultByKeyAtD);
                window.cc7Degree = theDegree;
                CC7.populateRelativeArrays(window.people);
                Utils.hideShakingTree();
                $("#degreesTable").remove();
                $("#ancReport").remove();
                $(`#${CC7Utils.CC7_CONTAINER_ID}`).append(
                    $(
                        "<table id='degreesTable'>" +
                            "<tr id='trDeg'><th>Degrees</th></tr>" +
                            "<tr id='trCon'><th>Connections</th></tr>" +
                            "</table>"
                    )
                );
                CC7.buildDegreeTableData(degreeCounts, theDegree);
                PeopleTable.addPeopleTable();
            }
            $("#getPeopleButton").prop("disabled", false);
            $("#getDegreeButton").prop("disabled", false);
            $("#getExtraDegrees").prop("disabled", false);
            $("#cancelLoad").hide();
            CC7.setInfoPanelMessage();
        }
    }

    // Not only get people at degree 'theDegree' from 'wtid', but also those at degree (theDegree - 1) and
    // (theDgree + 1) (if the user chooses), but flag the additional people as hidden. We get the extra degrees
    // so that we can calculate the relatives counts correctly for the theDegree people.
    static async collectPeopelAtNthDegree(wtId, theDegree, degreeCounts) {
        let start = 0;
        let isPartial = false;
        const limit = CC7.GET_PEOPLE_LIMIT;
        console.log(`Calling getPeople at Nth degree, key:${wtId}, degree:${theDegree}, start:${start}`);
        let callNr = 1;
        const starttime = performance.now();
        const [status, resultByKey, peopleData] = await CC7.getPeopleForNthDegree(wtId, theDegree, start, limit);
        if (status == "aborted") {
            return [status, 0, false];
        }
        let theresMore = status.startsWith("Maximum number of profiles");
        if (status != "" && peopleData && peopleData.length > 0 && !theresMore) {
            isPartial = true;
        }
        let profiles = peopleData ? Object.values(peopleData) : [];
        if (profiles.length == 0) {
            const reason = resultByKey[wtId]?.status || status;
            wtViewRegistry.showError(`Could not retrieve relatives for ${wtId}. Reason: ${reason}`);
        }
        const getExtra = document.getElementById("getExtraDegrees").checked;
        if (getExtra) {
            console.log(
                `Received ${profiles.length} degree ${theDegree - 1} to ${theDegree + 1} profiles for start:${start}`
            );
        } else {
            console.log(
                `Retrieving getPeople result page ${callNr}. key:${wtId}, nuclear:${theDegree}, minGen:${theDegree}, start:${start}, limit:${limit}`
            );
        }
        let resultByKeyReturned = {};
        let profileCount = 0;

        while (profiles.length > 0) {
            profileCount += profiles.length;
            CC7.addPeople(profiles, degreeCounts, theDegree, theDegree);
            Object.assign(resultByKeyReturned, resultByKey);

            // Check if we're done
            // if (profiles.length < limit) break;
            if (!theresMore) break;

            // We have more paged profiles to fetch
            ++callNr;
            start += limit;
            if (getExtra) {
                console.log(
                    `Retrieving getPeople result page ${callNr}. key:${wtId}, nuclear:${theDegree + 1}, minGen:${
                        theDegree - 1
                    }, start:${start}, limit:${limit}`
                );
            } else {
                console.log(
                    `Retrieving getPeople result page ${callNr}. key:${wtId}, nuclear:${theDegree}, minGen:${theDegree}, start:${start}, limit:${limit}`
                );
            }
            const [sstatus, , ancestorJson] = await CC7.getPeopleForNthDegree(wtId, theDegree, start, limit);
            if (sstatus == "aborted") {
                return [sstatus, 0, false];
            }
            theresMore = sstatus.startsWith("Maximum number of profiles");
            if (sstatus != "" && !theresMore) {
                console.warn(`Partial results obtained when requesting relatives for ${wtId}: ${sstatus}`);
                isPartial = true;
            }
            profiles = ancestorJson ? Object.values(ancestorJson) : [];
            if (getExtra) {
                console.log(
                    `Received ${profiles.length} degree ${theDegree - 1} to ${
                        theDegree + 1
                    } profiles for start:${start}`
                );
            } else {
                console.log(`Received ${profiles.length} degree ${theDegree} profiles for start:${start}`);
            }
        }
        console.log(
            `Retrieved ${profileCount} degree ${theDegree} profiles with ${callNr} API call(s) in ${
                performance.now() - starttime
            }ms`
        );
        return [resultByKeyReturned, profileCount, isPartial];
    }

    static async getPeopleForNthDegree(key, degree, start, limit) {
        // We get two more degrees than necessary to ensure we can calculate the relative counts
        // correctly. --- We only do this if the user has asked us to do so
        try {
            const getExtra = document.getElementById("getExtraDegrees").checked;
            const result = await WikiTreeAPI.postToAPI(
                {
                    appId: Settings.APP_ID,
                    action: "getPeople",
                    keys: key,
                    nuclear: getExtra ? degree + 1 : degree,
                    minGeneration: getExtra ? degree - 1 : degree,
                    start: start,
                    limit: limit,
                    fields: Settings.current["biocheck_options_biocheckOn"]
                        ? CC7.GET_PEOPLE_FIELDS + ",Bio"
                        : CC7.GET_PEOPLE_FIELDS,
                },
                CC7.cancelLoadController.signal
            );
            return [result[0].status, result[0].resultByKey, result[0].people];
        } catch (error) {
            if (error.name !== "AbortError") {
                console.warn(
                    `Could not retrieve relatives at degrees ${degree - 1} to ${degree + 1} for ${key}: ${error}`
                );
                return [`${error}`, [], []];
            } else {
                return ["aborted", [], []];
            }
        }
    }

    static addPeople(profiles, degreeCounts, minDegree, maxDegree) {
        let nrAdded = 0;
        let maxDegreeFound = -1;
        for (const person of profiles) {
            let id = +person.Id;
            if (id < 0) {
                // This is a private profile
                // WT returns negative ids for private profiles, but they seem to be unique only
                // within the result returned by the call (i.e. per page). However, since they are
                // different people, we give them unique ids.
                if (window.people.has(id)) {
                    id = window.cc7MinPrivateId - 1;
                }
                person.Id = id;
                person.Name = `Private${id}`;
                person.DataStatus = { Spouse: "", Gender: "" };
            } else if (!person.Name) {
                // WT seems not to return Name for some private profiles, even though they do
                // return a positive id for them, so we just set Name to Id since WT URLs work for both.
                person.Name = `${id}`;
            }
            if (!window.people.has(id)) {
                if (id < 0) {
                    window.cc7MinPrivateId = Math.min(id, window.cc7MinPrivateId);
                }
                // This is a new person, add them to the tree
                Utils.setAdjustedDates(person);
                person.Parents = [person.Father, person.Mother];
                const personDegree = typeof person.Meta?.Degrees === "undefined" ? -1 : +person.Meta.Degrees;
                person.Hide = personDegree < minDegree || personDegree > maxDegree;

                // To be filled later (in populateRelativeArrays). We use the singular name because these
                // field names are also used to assign relationships for family and timeline displays
                person.Parent = []; // Biological parents
                person.AParent = []; // Adoptive parents
                person.Spouse = [];
                person.Sibling = []; // Siblings and half-siblings (but not adoptive)
                person.Child = []; // Biological children
                person.AChild = []; // Adopted children
                person.Marriage = {};

                if (Settings.current["biocheck_options_biocheckOn"]) {
                    const bioPerson = new BioCheckPerson();
                    if (bioPerson.canUse(person, false, false, false, wtViewRegistry.session.lm.user.id)) {
                        const biography = new Biography(theSourceRules);
                        biography.parse(bioPerson.getBio(), bioPerson, "");
                        biography.validate();
                        person.bioScore = biography.getScore();
                        person.hasBioIssues = biography.hasStyleIssues() || !biography.hasSources();
                        if (person.hasBioIssues) {
                            person.bioCheckReport = getReportLines(biography, bioPerson.isPre1700());
                        }
                    }
                    delete person.bio;
                }

                function getReportLines(biography, isPre1700) {
                    const profileReportLines = [];
                    if (!biography.hasSources()) {
                        profileReportLines.push(["Profile may be unsourced", null]);
                    }
                    const invalidSources = biography.getInvalidSources();
                    if (invalidSources.length > 0) {
                        let msg = "Bio Check found sources that are not ";
                        if (isPre1700) {
                            msg += "reliable or ";
                        }
                        msg += "clearly identified:";
                        const subLines = [];
                        for (const invalidSource of invalidSources) {
                            subLines.push(invalidSource);
                        }
                        profileReportLines.push([msg, subLines]);
                    }
                    for (const sectMsg of biography.getSectionMessages()) {
                        profileReportLines.push([sectMsg, null]);
                    }
                    for (const styleMsg of biography.getStyleMessages()) {
                        profileReportLines.push([styleMsg, null]);
                    }
                    return profileReportLines;
                }

                window.people.set(id, person);
                ++nrAdded;

                // Update the degree counts
                if (degreeCounts[personDegree]) {
                    degreeCounts[personDegree] = degreeCounts[personDegree] + 1;
                } else {
                    degreeCounts[personDegree] = 1;
                }
                if (personDegree > maxDegreeFound) {
                    maxDegreeFound = personDegree;
                }
            } else {
                console.log(`${person.Name} (${id}) not added since they are already present`);
            }
        }
        console.log(`Added ${nrAdded} people to the tree`);
        return [nrAdded, maxDegreeFound];
    }

    static async getConnectionsAction(event) {
        wtViewRegistry.clearStatus();
        const theDegree = +$("#cc7Degree").val();
        const wtId = wtViewRegistry.getCurrentWtId();
        event.preventDefault();
        $(`#${CC7Utils.CC7_CONTAINER_ID}`).removeClass("degreeView");
        window.people = new Map();
        window.rootId = 0;
        window.cc7MinPrivateId = 0;
        CC7.clearDisplay();
        CC7.getConnections(theDegree);
    }

    static populateRelativeArrays(peopleMap) {
        const offDegreeParents = new Map();

        for (const pers of peopleMap.values()) {
            // Add Parent and Child arrays
            for (const pId of CC7Utils.bioParentIds(pers)) {
                if (pId) {
                    let parent = peopleMap.get(+pId);
                    if (parent) {
                        pers.Parent.push(parent);
                        parent.Child.push(pers);
                    } else {
                        parent = offDegreeParents.get(+pId);
                        if (parent) {
                            parent.Child.push(pers);
                        } else {
                            offDegreeParents.set(+pId, { Id: pId, Child: [pers], AChild: [] });
                        }
                    }
                }
            }
            // Add adoptive parent and child arrays
            for (const pId of CC7Utils.adoptiveParentIds(pers)) {
                if (pId) {
                    let parent = peopleMap.get(+pId);
                    if (parent) {
                        pers.AParent.push(parent);
                        parent.AChild.push(pers);
                    } else {
                        parent = offDegreeParents.get(+pId);
                        if (parent) {
                            parent.AChild.push(pers);
                        } else {
                            offDegreeParents.set(+pId, { Id: pId, Child: [], AChild: [pers] });
                        }
                    }
                }
            }
            // Add Spouse and corresponding Marriage arrays
            for (const sp of pers.Spouses) {
                const spouse = peopleMap.get(+sp.Id);
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
                            DataStatus: sp.DataStatus,
                        };
                        pers.Spouse.push(spouse);
                    }
                }
            }
        }
        // Now that all child arrays are complete, add Sibling arrays
        for (const pers of [...peopleMap.values(), ...offDegreeParents.values()]) {
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
        const getExtra = document.getElementById("getExtraDegrees").checked;
        $("#getPeopleButton").prop("disabled", true);
        $("#getDegreeButton").prop("disabled", true);
        $("#getExtraDegrees").prop("disabled", true);
        $("#cancelLoad").show();
        CC7.cancelLoadController = new AbortController();
        Utils.showShakingTree(CC7Utils.CC7_CONTAINER_ID);
        const wtId = wtViewRegistry.getCurrentWtId();
        const degreeCounts = {};
        const [resultByKey, isPartial, actualMaxDegree] = await CC7.makePagedCallAndAddPeople(
            wtId,
            maxWantedDegree,
            getExtra,
            degreeCounts
        );
        if (resultByKey == "aborted") {
            wtViewRegistry.showWarning("Profile retrieval cancelled.");
            Utils.hideShakingTree();
        } else {
            if (isPartial) {
                wtViewRegistry.showWarning(
                    "Limits imposed by the API is causing relative counts of people at the highest degree of separation " +
                        "to be incomplete."
                );
            }

            window.rootId = Utils.getProfileId(wtId, resultByKey);
            CC7.populateRelativeArrays(window.people);
            const root = window.people.get(window.rootId);
            let haveRoot = typeof root != "undefined";
            if (haveRoot) {
                root.isRoot = true;
            } else {
                wtViewRegistry.showWarning(
                    `The requested profile (${wtId}) was not returned by WikiTree, so some functionality, ` +
                        "like the Hierarchy view and ancestor statistics, has been disabled and some filters " +
                        "will return unexpected results."
                );
            }
            const maxRequestedDeg = getExtra ? maxWantedDegree + 1 : maxWantedDegree;
            const catResult = CC7.categoriseProfiles(root, maxRequestedDeg);
            window.cc7Breakdown = {
                bioAncestors: catResult.hasBioAncestors,
                bioDescendants: catResult.hasBioDescendants,
                adoptedAncestors: catResult.hasAdoptedAncestors,
                adoptiveAncestors: catResult.hasAdoptiveAncestors,
                adoptedInDescendants: catResult.hasAdoptedInDescendants,
                adoptedOutDescendants: catResult.hasAdoptedOutDescendants,
            };
            window.cc7Degree = Math.min(maxWantedDegree, actualMaxDegree);
            Utils.hideShakingTree();
            if ($("#degreesTable").length != 0) {
                $("#degreesTable").remove();
                $("#ancReport").remove();
            }

            // A complete binary tree for N generations contains 2**N - 1 nodes.
            // We requested maxRequestedDeg + 1 generations. However, the highest generation (like all others) contains
            // parent ids, which we can examine to see if there are profiles for them (even though we did not load
            // those profiles), therefore we actually know how many profiles exists in maxRequestedDeg + 2 generations.
            // Furthermore we subtract 1 from the total because we are talking about ancestors, so the root is not
            // counted.
            const maxDirectAncestors = 2 ** (maxRequestedDeg + 2) - 2;
            $(`#${CC7Utils.CC7_CONTAINER_ID}`).append(
                $(
                    "<table id='degreesTable'>" +
                        "<tr id='trDeg'><th>Degrees</th></tr>" +
                        "<tr id='trCon'><th>Connections</th></tr>" +
                        "<tr id='trTot'><th>Total</th></tr>" +
                        '</table><p id="ancReport">' +
                        (haveRoot && catResult.nrDirectAncestors > 0
                            ? `Out of ${maxDirectAncestors} possible direct ancestors in ${
                                  maxRequestedDeg + 2
                              } generations, ${catResult.nrDirectAncestors} (${(
                                  (catResult.nrDirectAncestors / maxDirectAncestors) *
                                  100
                              ).toFixed(
                                  2
                              )}%) have WikiTree profiles and out of them, ${catResult.nrDuplicateAncestors} (${(
                                  (catResult.nrDuplicateAncestors / catResult.nrDirectAncestors) *
                                  100
                              ).toFixed(2)}%) occur more than once due to pedigree collapse.</p>`
                            : "</p>")
                )
            );
            CC7.buildDegreeTableData(degreeCounts, 1);
            // console.log(window.people);
            CC7.addRelationships();
            PeopleTable.addPeopleTable();
        }

        $("#getPeopleButton").prop("disabled", false);
        $("#getDegreeButton").prop("disabled", false);
        $("#getExtraDegrees").prop("disabled", false);
        $("#cancelLoad").hide();
        CC7.setInfoPanelMessage();
        CC7.firstTimeLoad = false;
    }

    static addRelationships() {
        const familyMapEntries = Array.from(window.people, ([key, value]) => [
            key,
            {
                Name: value.Name,
                BirthDate: value.BirthDate,
                BirthDateDecade: value.BirthDateDecade,
                DeathDate: value.DeathDate,
                DeathDateDecade: value.DeathDateDecade,
                DataStatus: value.DataStatus,
                FirstName: value.FirstName,
                LastNameCurrent: value.LastNameCurrent,
                LastNameAtBirth: value.LastNameAtBirth,
                Gender: value.Gender,
                LongNamePrivate: value.LongNamePrivate,
                Father: value.Father,
                Mother: value.Mother,
                BioFather: value.BioFather,
                BioMother: value.BioMother,
                DataStatus: value.DataStatus,
                Meta: value.Meta,
            },
        ]);
        // console.log("addRelationships request", JSON.stringify(familyMapEntries));
        const rootPersonId = window.rootId;
        const loggedInUser = window.wtViewRegistry.session.lm.user.name;
        const loggedInUserId = window.wtViewRegistry.session.lm.user.id;

        const worker = new Worker(new URL("./relationshipWorker.js", import.meta.url), { type: "module" });

        const $this = this;
        worker.onmessage = function (event) {
            // console.log("Worker returned:", JSON.stringify(event.data));
            if (event.data.type === "completed") {
                if (event.data.rootId == rootPersonId) {
                    CC7.updateTableWithResults(event.data.results);
                    if (loggedInUserId == rootPersonId) {
                        $this.storeDataInIndexedDB(event.data.dbEntries);
                    }
                } else {
                    console.log(
                        `Received unexpected relationship worker response for ${event.data.rootId} while expecting for ${rootPersonId}`
                    );
                }
                worker.terminate();
            } else if (event.data.type === "log") {
                console.log("Worker log:", event.data.message);
            } else if (event.data.type === "error") {
                console.error("Worker returned an error:", event.data.message);
                worker.terminate();
            }
        };

        worker.onerror = function (error) {
            console.error("Error in worker:", error.message);
        };

        // Send data to worker in chunks
        const chunkSize = 300;
        for (let i = 0; i < familyMapEntries.length; i += chunkSize) {
            const chunk = familyMapEntries.slice(i, i + chunkSize);
            worker.postMessage({ cmd: "chunk", data: chunk });
        }

        worker.postMessage({
            cmd: "process",
            rootPersonId: rootPersonId,
            loggedInUser: loggedInUser,
            loggedInUserId: loggedInUserId,
        });
    }

    static storeDataInIndexedDB(dbEntries) {
        if (dbEntries.length == 0) {
            return;
        }
        const $this = this;
        this.openDatabase(CC7.RELATIONSHIP_DB_NAME, CC7.RELATIONSHIP_DB_VERSION, CC7.RELATIONSHIP_STORE_NAME)
            .then((db) => {
                return $this.addDataToStore(db, CC7.RELATIONSHIP_STORE_NAME, dbEntries, true);
            })
            .then(() => {
                console.log("Data added to RelationshipFinderWTE.");
                if (CirclesView.firstDegreeCirclesToRevise.length > 0) {
                    CirclesView.checkForDegree1CirclesToRevise();
                }
            })
            .catch((error) => {
                console.error("Error:", error);
            });

        let connectionEntries = dbEntries.map((entry) => ({
            theKey: entry.theKey,
            userId: entry.userId,
            id: entry.id,
            distance: entry.distance,
        }));

        this.openDatabase(CC7.CONNECTION_DB_NAME, CC7.CONNECTION_DB_VERSION, CC7.CONNECTION_STORE_NAME)
            .then((db) => {
                return $this.addDataToStore(db, CC7.CONNECTION_STORE_NAME, connectionEntries, false);
            })
            .then(() => {
                console.log("Data added to ConnectionFinderWTE.");
                if (CirclesView.firstDegreeCirclesToRevise.length > 0) {
                    CirclesView.checkForDegree1CirclesToRevise();
                }
            })
            .catch((error) => {
                console.error("Error:", error);
            });
    }

    static openDatabase(dbName, dbVersion, storeName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onupgradeneeded = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "theKey" });
                }
            };

            request.onsuccess = function (event) {
                const db = event.target.result;
                db.onversionchange = function () {
                    db.close();
                    alert(`The ${dbName} database is outdated and needs a version upgrade. Please reload this page.`);
                };
                resolve(event.target.result);
            };

            request.onblocked = function () {
                // This event shouldn't trigger if onversionchange was handled correctly above. However, it can happen
                // if the other tabs/pages are still running code that does not have the onversionchange code above.
                // It means that there's another open connection to the same database
                // and it wasn't closed after db.onversionchange triggered for it.
                alert(
                    "Access to the ${dbName} database is blocked because other open tabs/pages to WikiTree are not " +
                        "successfully closing their database connections. Unfortunately the only way to correct this is " +
                        "to restart your browser, or to close all those other tabs/pages and then to reload this page."
                );
            };
            request.onerror = function (event) {
                reject(event.target.error);
            };
        });
    }

    static addDataToStore(db, storeName, data, checkRelationship) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], "readwrite");
            const objectStore = transaction.objectStore(storeName);

            data.forEach((item) => {
                const getRequest = objectStore.get(item.theKey);
                getRequest.onsuccess = function (event) {
                    const existing = event.target.result;

                    // Always update distance
                    const updatedItem = {
                        ...existing,
                        ...item,
                        relationship: checkRelationship
                            ? item.relationship || existing?.relationship
                            : item?.relationship || existing?.relationship,
                    };

                    const request = objectStore.put(updatedItem);
                    request.onsuccess = function () {
                        // Successfully added/updated item
                    };
                    request.onerror = function (event) {
                        reject(event.target.error);
                    };
                };
                getRequest.onerror = function (event) {
                    reject(event.target.error);
                };
            });

            transaction.oncomplete = function () {
                resolve();
            };

            transaction.onerror = function (event) {
                reject(event.target.error);
            };
        });
    }

    static async updateTableWithResults(results) {
        if (results.length == 0) {
            return;
        }
        // Wait for the people table to be present
        await new Promise((resolve) => {
            if ($("#peopleTable").length) {
                // Table already exists, resolve immediately
                resolve();
                return;
            }

            const observer = new MutationObserver(() => {
                if ($("#peopleTable").length) {
                    observer.disconnect(); // Stop observing further changes
                    resolve();
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        });

        // Add relationships for the root person's spouse(s) if they are not in results
        const rootPerson = window.people.get(window.rootId);
        if (rootPerson) {
            for (const key of Object.keys(rootPerson.Marriage)) {
                const spId = +key;
                const spouse = window.people.get(spId);
                if (!spouse) continue;

                const gender = CC7Utils.genderOf(spouse);
                const relationship = {
                    full: CC7Utils.mapGender(gender, "husband", "wife", "spouse"),
                    abbr: CC7Utils.mapGender(gender, "Husband", "Wife", "Spouse"),
                };
                const foundResult = results.find((el) => el.personId == spId);
                if (!foundResult) {
                    results.push({
                        personId: spId,
                        relationship: relationship,
                    });
                } else if (foundResult.relationship == "") {
                    foundResult.relationship = relationship;
                }
            }
        }

        const pTable = document.querySelector("#peopleTable");
        results.forEach((result) => {
            // window.people is an array of objects with the personId as the key
            // Add the relationship to the person object
            const person = window.people.get(result.personId);
            if (person) {
                person.Relationship = result.relationship;
            }

            // Update the people table relationship column in this person's row
            const row = pTable.querySelector(`tr[data-id="${result.personId}"]`);
            if (row) {
                row.setAttribute("data-relation", result?.relationship?.abbr || "");
                const relationCell = row.querySelector("td.relation");
                if (relationCell) {
                    relationCell.textContent = result.relationship.abbr;
                    relationCell.setAttribute("title", result?.relationship?.full);
                }
            }
        });
    }

    static getIdsOf(arrayOfPeople) {
        return arrayOfPeople.map((p) => +p.Id);
    }

    static getIdsOfRelatives(person, arrayOfRelationships) {
        let relIds = [];
        for (const relation of arrayOfRelationships) {
            relIds = relIds.concat(CC7.getIdsOf(person[relation]));
        }
        return relIds;
    }

    static async makePagedCallAndAddPeople(reqId, upToDegree, getExtra, degreeCounts) {
        // If the user wants, we get one more degree than necessary to ensure we can calculate the relative counts
        // correctly.
        const upToDegreeToGet = getExtra ? upToDegree + 1 : upToDegree;
        if ($("#degreesTable").length == 0) {
            $(`#${CC7Utils.CC7_CONTAINER_ID}`).append(
                $(
                    "<table id='degreesTable'>" +
                        "<tr><th colspan=2>Collecting Profiles</th></tr>" +
                        "<tr><th>Data Request No.</th></tr>" +
                        "<tr><th>Received</th></tr>" +
                        "<tr><th>Total</th></tr></table>"
                )
            );
        }
        const loadingGIF = "<td><img width='12' height='12' src='./views/cc7/images/load-33_128.gif'></td>";
        let start = 0;
        let callNr = 0;
        const limit = CC7.GET_PEOPLE_LIMIT;
        let resultByKey = {};
        let maxDegree = -1;
        let isPartial = false;

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
                    `Calling getPeople with key:${reqId}, nuclear:${upToDegreeToGet}, start:${start}, limit:${limit}`
                );
            } else {
                console.log(
                    `Retrieving getPeople result page ${callNr}. keys:${reqId}, nuclear:${upToDegreeToGet}, start:${start}, limit:${limit}`
                );
            }
            const starttime = performance.now();
            const [status, keysResult, peopleData] = await CC7.getPeopleUpToDegree(
                [reqId],
                upToDegreeToGet,
                start,
                limit
            );
            if (status == "aborted") {
                return [status, false, 0];
            }
            const callTime = performance.now() - starttime;
            getMore = status.startsWith("Maximum number of profiles");
            if (status != "" && peopleData && peopleData.length > 0 && !getMore) {
                isPartial = true;
            }
            const profiles = peopleData ? Object.values(peopleData) : [];
            if (profiles.length == 0) {
                const reason = keysResult?.[reqId]?.status || status;
                wtViewRegistry.showError(`Could not retrieve relatives for ${reqId}. Reason: ${reason}`);
            }
            console.log(
                `Received ${profiles.length} CC${upToDegreeToGet} profiles for start:${start} in ${callTime}ms`
            );
            if (callNr == 1) {
                resultByKey = keysResult;
            }

            // We're re-using the degrees table here to show response counts as a way of a progress bar
            const degTable = document.getElementById("degreesTable");
            degTable.rows[2].cells[callNr].innerHTML = profiles.length;

            // Note: getPeople does not guarantee return order
            const [nrAdded, largestDegree] = CC7.addPeople(profiles, degreeCounts, 0, upToDegree);
            maxDegree = Math.max(maxDegree, largestDegree);
            degTable.rows[3].cells[callNr].innerHTML = window.people.size;

            start += limit;
            // Check if we're done
            // getMore = profiles.length == limit;
        }
        console.log(
            `Retrieved ${window.people.size} unique CC${upToDegreeToGet} profiles with ${callNr} API call(s) in ${
                performance.now() - starttime
            }ms`
        );
        return [resultByKey, isPartial, maxDegree];
    }

    static async getPeopleUpToDegree(ids, depth, start = 0, limit = CC7.GET_PEOPLE_LIMIT) {
        try {
            const result = await WikiTreeAPI.postToAPI(
                {
                    appId: Settings.APP_ID,
                    action: "getPeople",
                    keys: ids.join(","),
                    start: start,
                    limit: limit,
                    nuclear: depth,
                    fields: Settings.current["biocheck_options_biocheckOn"]
                        ? CC7.GET_PEOPLE_FIELDS + ",Bio"
                        : CC7.GET_PEOPLE_FIELDS,
                },
                CC7.cancelLoadController.signal
            );
            return [result[0]["status"], result[0]["resultByKey"], result[0]["people"]];
        } catch (error) {
            if (error.name !== "AbortError") {
                console.warn(`Could not retrieve relatives up to degree ${depth} for ${ids}: ${error}`);
                return [`${error}`, [], []];
            } else {
                return ["aborted", [], []];
            }
        }
    }

    /**
     * Categorise all profiles in the tree in the following categories (some of them are overlapping):
     *   * above or below the root person
     *   * ancestor or descendant of the root person
     *   * biological ancestor or not
     *   * adoptive ancestor or not
     *   * biological descendant or not
     *   * adoptive descendant or not
     *   * blood relative or not
     * This is done by traversing the tree in a breadth-first manner, starting from the root person.
     * @param {Object} theRoot - The root person object from which to start the categorisation.
     * @param {number} maxRequestedDegree - The maximum degree of separation to consider when categorising ancestors.
     * @returns {Object} An object containing:
     *    nrDirectAncestors: the number of direct ancestor profiles
     *    nrDuplicateAncestors: the number of duplicate ancestor profiles
     *    hasBioAncestors: boolean indicating if there are any biological ancestors
     *    hasBioDescendants: boolean indicating if there are any biological descendants
     *    hasAdoptedAncestors: boolean indicating if any ancestor was adopted
     *    hasAdoptiveAncestors: boolean indicating if the root or any of their ancestors were adopted
     *    hasAdoptedInDescendants: boolean indicating if there is anyone adopted by a biological descendant.
     *                             This includes anyone adpted by such an adoptee or their descendants
     *    hasAdoptedOutDescendants: boolean indicating if any biological descendant was adopted by someone else
     **/
    static categoriseProfiles(theRoot, maxRequestedDegree) {
        if (!theRoot) return [-1, -1];

        // -----------------
        // For debug logging (set to true the ones you want to see (ths only works for requested degrees <= 3))
        const pAncestors = false;
        const pBlood = false; // show when blood relatives are detected
        const pAdopPreferredAncestors = false; // show when adoptive parents are detected
        const pBioAncestors = false; // Show when biological ancestors are detected
        const pBioExtended = false;
        const pExtendedAdopAnc = false;

        function debugLogAddition(selector, showFrom, from, person) {
            if (!selector) return;

            let relation = "unknown";
            switch (selector) {
                case pAncestors:
                    relation = "ancestors";
                    break;
                case pBlood:
                    relation = "blood relatives";
                    break;
                case pAdopPreferredAncestors:
                    relation = "adoptive preferred ancestors";
                    break;
                case pBioAncestors:
                    relation = "biological ancestors";
                    break;
                case pBioExtended:
                    relation = "extended biological ancestors";
                    break;
                case pExtendedAdopAnc:
                    relation = "extended adoptive ancestors";
                    break;
            }
            if (maxRequestedDegree <= 3) {
                if (showFrom) {
                    console.log(`From ${from.BirthNamePrivate} (${from.Name}, ${from.Id}) ${relation} are:`);
                }
                console.log(`  ${person.BirthNamePrivate} (${person.Name}, ${person.Id})`);
            }
        }
        // -----------------

        const ABOVE = true;
        const BELOW = false;
        const collator = new Intl.Collator();
        theRoot.isAncestor = false;
        theRoot.isBioAncestor = false;
        theRoot.isExtendedBioAnc = false;
        theRoot.isAdoptivePreferred = false;
        theRoot.isStrictAdoptAnc = false;
        theRoot.isExtendedAdoptAnc = false;

        theRoot.isDescendant = false;
        theRoot.isBioDescendant = false;
        theRoot.isExtendedAdoptDesc = false;
        theRoot.isAbove = false;
        theRoot.isBloodRelative = false;
        setIfAdopted(theRoot);

        // Note: unlike the usual case, where the queue contains nodes still to be "visited" and processed,
        // the people on the queues here have already been categorised and it is their appropriate
        // relatives (depending on the queue) that needs to be categorised and then added to the queues
        // ancestor traversals
        const ancestorQ = [[+theRoot.Id, 0]]; // for processing ancestors (bio and adopted), along with their degree
        const bioAncestorQ = [+theRoot.Id]; // for processing (strict) bio ancestors
        const extBioAncestorQ = []; // for processing extended bio ancestors
        const adoptPreferredAncQ = [+theRoot.Id]; // for processing adoptive preferred ancestors
        const strictAdoptAncQ = [];
        const extendAdoptAncQ = [];

        // descendant traversls
        const descendantQ = [+theRoot.Id]; // for processing descendants of the root person (bio and adopted)
        const bioDescendantQ = [+theRoot.Id]; // for processing bio descendants of the root
        const extAdoptDescendantsQ = []; // for processing extended adoptive descendants

        // below and above queues are also used to set isAdopted flag since they look at all profiles
        const belowQ = [+theRoot.Id];
        const aboveQ = [+theRoot.Id];
        const bloodQ = [+theRoot.Id];
        const directAncestors = new Set();
        const duplicates = new Set();
        let nrProfiles = 0;
        let firstIteration = true;
        // These are used to determine which options in the filter select should be disabled
        let rootHasBioAncestors = false;
        let rootHasBioDescendants = false;
        let rootHasAdoptedAncestors = false; // true if ancestor is adopted - TODO: do we need this??
        let rootHasAdoptiveAncestors = false; // true if the root or any ancestor was adopted
        let rootHasAdoptedInDescendants = false; // true if any bio descendant has an adopted child
        let rootHasAdoptedOutDescendants = false; // true if any bio descendant or their bio or adopted descendants was adopted by someone else

        function isAdopted(person) {
            return CC7Utils.adoptiveParentIds(person).length > 0;
        }
        function setIfAdopted(person) {
            if (isAdopted(person)) {
                person.isAdopted = true;
            }
        }
        function addExtAdoptedDescendant(person) {
            if (person && typeof person.isExtendedAdoptDesc === "undefined") {
                person.isExtendedAdoptDesc = true;
                extAdoptDescendantsQ.push(+person.Id);
            }
        }
        function setAsDescendant(child) {
            if (child && typeof child.isDescendant === "undefined") {
                child.isDescendant = true;
                descendantQ.push(+child.Id);
            }
        }
        function setAsAncestor(degree, person, printFrom, from) {
            // We have requested maxRequestedDegree from WT, so to set isAncestor
            // we only check profiles up to and including that degree
            if (degree <= maxRequestedDegree) {
                if (person && typeof person.isAncestor === "undefined") {
                    person.isAncestor = true;
                    ancestorQ.push([+person.Id, degree]);
                    debugLogAddition(pAncestors, printFrom, from, person);
                }
            }
        }

        function setAsExtAdopted(person, printFrom, from) {
            if (person && typeof person.isExtendedAdoptAnc == "undefined") {
                person.isExtendedAdoptAnc = true;
                extendAdoptAncQ.push(+person.Id);
                debugLogAddition(pExtendedAdopAnc, printFrom, from, person);
            }
        }

        while (
            ancestorQ.length > 0 ||
            bioAncestorQ.length > 0 ||
            extBioAncestorQ.length > 0 ||
            adoptPreferredAncQ.length > 0 ||
            strictAdoptAncQ.length > 0 ||
            extendAdoptAncQ.length > 0 ||
            descendantQ.length > 0 ||
            bioDescendantQ.length > 0 ||
            extAdoptDescendantsQ.length > 0 ||
            belowQ.length > 0 ||
            aboveQ.length > 0 ||
            bloodQ.length > 0
        ) {
            if (descendantQ.length > 0) {
                // bio and adoptive descendants
                const pId = descendantQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add this person's children (bio and adoptive) to the descendant queue
                    for (const child of person.Child) {
                        setAsDescendant(child);
                        if (isAdopted(child)) {
                            // Any bio descendant that was adopted out, should join the extAdoptDescendantsQ
                            rootHasAdoptedOutDescendants = true;
                            addExtAdoptedDescendant(child);
                            // We make sure any adopted child of the root is flagged as such
                            if (CC7Utils.bioParentIds(child).includes(+theRoot.Id)) child.isAdoptedOutByRoot = true;
                        }
                    }
                    for (const child of person.AChild) {
                        setAsDescendant(child);
                        // All adoptive children must also be flagged as adoptive descendants and
                        // added to the extAdoptDescendantsQ for processing
                        rootHasAdoptedInDescendants = true;
                        addExtAdoptedDescendant(child);
                    }
                }
            }
            if (bioDescendantQ.length > 0) {
                // bio descendants only
                const pId = bioDescendantQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add this person's biological children to the queue
                    for (const child of person.Child) {
                        if (child && typeof child.isBioDescendant === "undefined") {
                            child.isBioDescendant = true;
                            bioDescendantQ.push(+child.Id);
                            rootHasBioDescendants = true;
                        }
                    }
                }
            }
            if (bloodQ.length > 0) {
                // We only find blood relatives sideways and down from the profiles on this queue.
                // Ancestor blood relatives are found when processing the bioAncestorQ queue, and
                // we then add them to this queue there to find their sideways and down blood relatives.
                const pId = bloodQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    let printFrom = true;
                    for (const relative of person.Sibling.concat(person.Child)) {
                        if (relative && typeof relative.isBloodRelative === "undefined") {
                            relative.isBloodRelative = true;
                            bloodQ.push(+relative.Id);
                            debugLogAddition(pBlood, printFrom, person, relative);
                            printFrom = false;
                        }
                    }
                }
            }
            if (extAdoptDescendantsQ.length > 0) {
                // adoptive descendants
                const pId = extAdoptDescendantsQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add all this person's children (bio and adopted) to the queue.
                    // Bio cildren of this person
                    for (const child of person.Child) {
                        if (isAdopted(child)) {
                            // A bio child that was adopted out
                            rootHasAdoptedOutDescendants = true;
                        }
                        addExtAdoptedDescendant(child);
                    }
                    // Adopted cildren of this person
                    for (const child of person.AChild) {
                        rootHasAdoptedInDescendants = true;
                        addExtAdoptedDescendant(child);
                    }
                }
            }
            if (belowQ.length > 0) {
                const pId = belowQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add this person's relatives to the queue
                    const relatives = firstIteration
                        ? person.Sibling.concat(person.Spouse, person.Child, person.AChild)
                        : person.Parent.concat(
                              person.AParent,
                              person.Sibling,
                              person.Spouse,
                              person.Child,
                              person.AChild
                          );
                    for (const rel of relatives) {
                        if (setAndShouldAdd(rel, BELOW)) {
                            if (!belowQ.includes(+rel.Id)) {
                                belowQ.push(+rel.Id);
                            }
                        }
                    }
                }
            }
            if (ancestorQ.length > 0) {
                // bio and adoptive ancestors
                const [pId, degree] = ancestorQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    const parentDegree = degree + 1;
                    const bioParents = CC7Utils.bioParentIds(person);
                    const adoptiveParentIds = CC7Utils.adoptiveParentIds(person);
                    const personIsAdopted = adoptiveParentIds.length > 0;
                    if (personIsAdopted && pId != window.rootId) {
                        rootHasAdoptedAncestors = true;
                    }

                    let printFromAnc = true;
                    let printFromExtAdop = true;
                    for (const relId of bioParents) {
                        // Set ancestor relationship.
                        const bioParent = window.people.get(+relId);
                        setAsAncestor(parentDegree, bioParent, printFromAnc, person);
                        printFromAnc = false;

                        if (personIsAdopted) {
                            setAsExtAdopted(bioParent, printFromExtAdop, person);
                            printFromExtAdop = false;
                        }
                    }
                    // If this person has adoptive parents, we mark the person as a strict and extended adoptive
                    // ancestor and add their adoptive parents for processing to the strict and extended adoptive
                    // ancestor queues.
                    if (personIsAdopted) {
                        rootHasAdoptiveAncestors = true;
                        person.isStrictAdoptAnc = true;
                        person.isExtendedAdoptAnc = true;
                        for (const relId of adoptiveParentIds) {
                            // Adoptive ancestors are included in isAncestor
                            const parent = window.people.get(+relId);
                            setAsAncestor(parentDegree, parent, printFromAnc, person);
                            printFromAnc = false;

                            // Add adoptive parents to strictAdoptAncQ and extendAdoptAncQfor their own
                            // branch traversal determining isStrictAdoptAnc and isExtendedAdoptAnc sets
                            if (parent && typeof parent.isStrictAdoptAnc === "undefined") {
                                parent.isStrictAdoptAnc = true;
                                strictAdoptAncQ.push(relId);
                            }
                            setAsExtAdopted(parent, printFromExtAdop, person);
                            printFromExtAdop = false;
                        }
                    }
                }
            }
            if (adoptPreferredAncQ.length > 0) {
                const pId = adoptPreferredAncQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // If a person has adoptive parents, only traverse them, otherwise use bioParents
                    let parentIds = CC7Utils.adoptiveParentIds(person);
                    if (parentIds.length == 0) parentIds = CC7Utils.bioParentIds(person);
                    let printFrom = true;
                    for (const relId of parentIds) {
                        const parent = window.people.get(+relId);
                        if (parent && typeof parent.isAdoptivePreferred === "undefined") {
                            parent.isAdoptivePreferred = true;
                            adoptPreferredAncQ.push(relId);
                            debugLogAddition(pAdopPreferredAncestors, printFrom, person, parent);
                            printFrom = false;
                        }
                    }
                }
            }
            if (strictAdoptAncQ.length > 0) {
                const pId = strictAdoptAncQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Only adoptees and their adoptive parents are in the isStrictAdoptAnc set
                    const adoptiveParentIds = CC7Utils.adoptiveParentIds(person);
                    for (const relId of adoptiveParentIds) {
                        const parent = window.people.get(+relId);
                        if (parent && typeof parent.isStrictAdoptAnc == "undefined") {
                            parent.isStrictAdoptAnc = true;
                            strictAdoptAncQ.push(relId);
                        }
                    }
                }
            }
            if (extendAdoptAncQ.length > 0) {
                const pId = extendAdoptAncQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Adoptees and their bio and adoptive parents are in the isExtendedAdoptAnc set
                    const parentIds = CC7Utils.adoptiveParentIds(person).concat(CC7Utils.bioParentIds(person));
                    for (const relId of parentIds) {
                        const parent = window.people.get(+relId);
                        if (parent && typeof parent.isExtendedAdoptAnc == "undefined") {
                            parent.isExtendedAdoptAnc = true;
                            extendAdoptAncQ.push(relId);
                        }
                    }
                }
            }
            if (bioAncestorQ.length > 0) {
                const pId = bioAncestorQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Note that we're effectively using the Parents array and not the Parent array here
                    // so that we can count profiles and duplicates to as high a degree as possible.
                    // The Parent array contains actual profiles that we have loaded, while
                    // Parents contain parent IDs and may be for profiles we have not loaded
                    // (but which actually exists in WikiTree).
                    let printFromBioAnc = true;
                    let printFromExtBioAnc = true;
                    const bioParentIds = CC7Utils.bioParentIds(person);
                    for (const relId of bioParentIds) {
                        // Count profiles and duplicates
                        if (relId) {
                            ++nrProfiles;
                            if (directAncestors.has(relId)) {
                                duplicates.add(relId);
                            } else {
                                directAncestors.add(relId);
                            }
                        }

                        const parent = window.people.get(+relId);
                        if (parent) {
                            debugLogAddition(pBioAncestors, printFromBioAnc, person, parent);
                            printFromBioAnc = false;
                            parent.isBioAncestor = true;
                            bioAncestorQ.push(relId);
                            rootHasBioAncestors = true;

                            // Adopted parents of a bio ancestor belongs to the isExtendedAdoptAnc set
                            const adoptiveGPIds = CC7Utils.adoptiveParentIds(parent);
                            for (const aGPId of adoptiveGPIds) {
                                const grandParent = window.people.get(+aGPId);
                                if (grandParent && typeof grandParent.isExtendedBioAnc == "undefined") {
                                    grandParent.isExtendedBioAnc = true;
                                    extBioAncestorQ.push(aGPId);
                                    debugLogAddition(pBioExtended, printFromExtBioAnc, parent, grandParent);
                                    printFromExtBioAnc = false;
                                }
                            }

                            // All bio ancestros are also blood relatives, so set this parent as well as their
                            // siblings and descendents as blood relatives and add them to the blood queue for
                            // processing
                            parent.isBloodRelative = true;
                            let printFromBlood = true;
                            for (const relative of parent.Sibling.concat(parent.Child)) {
                                if (relative && typeof relative.isBloodRelative === "undefined") {
                                    relative.isBloodRelative = true;
                                    bloodQ.push(+relative.Id);
                                    debugLogAddition(pBlood, printFromBlood, parent, relative);
                                    printFromBlood = false;
                                }
                            }
                        }
                    }
                }
            }
            if (extBioAncestorQ.length > 0) {
                const pId = extBioAncestorQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Adoptees and all their ancestors are in the extBioAncestorQ set
                    const parentIds = CC7Utils.adoptiveParentIds(person).concat(CC7Utils.bioParentIds(person));
                    let printFromExtBioAnc = true;
                    for (const relId of parentIds) {
                        const parent = window.people.get(+relId);
                        if (parent && typeof parent.isExtendedBioAnc == "undefined") {
                            parent.isExtendedBioAnc = true;
                            extBioAncestorQ.push(relId);
                            debugLogAddition(pBioExtended, printFromExtBioAnc, person, parent);
                            printFromExtBioAnc = false;
                        }
                    }
                }
            }
            if (aboveQ.length > 0) {
                const pId = aboveQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add this person's relatives to the queue
                    const relatives = firstIteration
                        ? person.Parent.concat(person.AParent)
                        : person.Parent.concat(
                              person.AParent,
                              person.Sibling,
                              person.Spouse,
                              person.Child,
                              person.AChild
                          );
                    for (const rel of relatives) {
                        if (setAndShouldAdd(rel, ABOVE)) {
                            if (!aboveQ.includes(+rel.Id)) {
                                aboveQ.push(+rel.Id);
                            }
                        }
                    }
                }
            }
            firstIteration = false;
        }
        console.log(`nr direct ancestor profiles=${directAncestors.size}, nr dups=${duplicates.size}`);
        return {
            nrDirectAncestors: nrProfiles,
            nrDuplicateAncestors: duplicates.size,
            hasBioAncestors: rootHasBioAncestors,
            hasBioDescendants: rootHasBioDescendants,
            hasAdoptedAncestors: rootHasAdoptedAncestors,
            hasAdoptiveAncestors: rootHasAdoptiveAncestors,
            hasAdoptedInDescendants: rootHasAdoptedInDescendants,
            hasAdoptedOutDescendants: rootHasAdoptedOutDescendants,
        };

        function setAndShouldAdd(p, where) {
            if (p) {
                setIfAdopted(p);
                if (
                    where == BELOW &&
                    // isAbove is not defined yet, or the person is above, but is the same age or younger
                    // than the root person
                    (typeof p.isAbove === "undefined" ||
                        (p.isAbove && collator.compare(theRoot.adjustedBirth.date, p.adjustedBirth.date) <= 0))
                ) {
                    p.isAbove = false;
                    return true;
                } else if (
                    where == ABOVE &&
                    // isAbove is not defined yet, or the person is below, but is older than the root person
                    (typeof p.isAbove === "undefined" ||
                        (!p.isAbove && collator.compare(theRoot.adjustedBirth.date, p.adjustedBirth.date) > 0))
                ) {
                    p.isAbove = true;
                    return true;
                }
            }
            return false;
        }
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
        // Remove the filter event listeners
        document
            .querySelector("#peopleTable")
            ?.querySelectorAll(".filter-input")
            .forEach((input, inputIndex) => {
                input.removeEventListener("input", PeopleTable.stripLtGt);
                input.removeEventListener("input", PeopleTable.filterListener);
                input.removeEventListener("click", PeopleTable.clearFilterClickListener);
            });
        $("#cc7PrivFilter").off("select2:select");
        $("#cc7DegFilter").off("select2:select");
        $("#cc7BCSFilter").off("select2:select");

        $(
            [
                "#degreesTable",
                "#ancReport",
                "#hierarchyView",
                "#lanceTable",
                "#peopleTable",
                "#statsView",
                "#missingLinksTable",
                "#circlesDisplay",
                "#tooBig",
                ".viewButton",
                "#wideTableButton",
                "#clearTableFiltersButton",
                "#cc7Subset",
                "#cc7Gender",
                "#tableButtons",
                "#mlButtons",
            ].join(",")
        ).remove();
    }

    static handleFileDownload() {
        try {
            CC7.collapsePeople();
            const fileName = PeopleTable.makeFilename();
            CC7.downloadArray(
                [
                    [
                        window.rootId,
                        window.cc7Degree,
                        Utils.getTreeAppWtId(),
                        $(`#${CC7Utils.CC7_CONTAINER_ID}`).hasClass("degreeView"),
                    ],
                    ...window.people.entries(),
                ],
                fileName
            );
        } finally {
            CC7.expandPeople(window.people);
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
        let oldFormat = false;
        for (const person of peopleMap.values()) {
            if (typeof person.Meta === "undefined") {
                // This is an old format file (before Meta was present)
                oldFormat = true;
                if (typeof person.Degree != "undefined") {
                    person.Meta = { Degrees: person.Degree };
                }
                delete person.Degree;
            }
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
        return [peopleMap, oldFormat];
    }

    static handleFileUpload(event) {
        wtViewRegistry.clearStatus();
        const file = event.target.files[0];
        if (typeof file == "undefined" || file == "") {
            return;
        }

        let isOneDegree = false;
        const reader = new FileReader();
        reader.onload = async function (e) {
            const contents = e.target.result;
            try {
                let oldFormat = false;
                const peeps = JSON.parse(contents);
                const [rId, cc7Deg, rWtId, oneDeg] = peeps.shift();
                [window.people, oldFormat] = CC7.expandPeople(new Map(peeps));
                window.rootId = rId;
                window.cc7Degree = Number.isFinite(cc7Deg) ? cc7Deg : 0;
                isOneDegree = oneDeg;
                if (oldFormat) {
                    wtViewRegistry.showNotice(
                        "This file is still in an old format. It is recommended that you regenerate it " +
                            "after reloading profiles from WikiTree."
                    );
                }
                const root = window.people.get(window.rootId);
                $(wtViewRegistry.WT_ID_TEXT).val(root?.Name || rWtId || window.rootId);
            } catch (error) {
                Utils.hideShakingTree();
                wtViewRegistry.showError(`The input file is not valid: ${error}`);
                return;
            }

            const degreeCounts = {};
            let maxDegree = 0;
            let minDegree = 1000;
            let hasBioAncestors = false;
            let hasBioDescendants = false;
            let hasAdoptedAncestors = false;
            let hasAdoptiveAncestors = false;
            let hasAdoptedInDescendants = false;
            let hasAdoptedOutDescendants = false;
            for (const aPerson of window.people.values()) {
                if (aPerson.isBioAncestor) hasBioAncestors = true;
                if (aPerson.isBioDescendant) hasBioDescendants = true;
                if (aPerson.isAdopted && pId != window.rootId) {
                    rootHasAdoptedAncestors = true;
                }
                if (aPerson.isAdoptivePreferred) hasAdoptiveAncestors = true;
                if (aPerson.isExtendedAdoptDesc) hasAdoptedInDescendants = true;
                if (aPerson.isBioDescendant && CC7Utils.adoptiveParentIds(aPerson).length > 0)
                    hasAdoptedOutDescendants = true;
                if (aPerson.Hide) continue;

                const pDeg = aPerson.Meta.Degrees;
                if (degreeCounts[pDeg]) {
                    degreeCounts[pDeg] = degreeCounts[pDeg] + 1;
                } else {
                    degreeCounts[pDeg] = 1;
                }
                if (pDeg > maxDegree) {
                    maxDegree = pDeg;
                }
                if (pDeg < minDegree) {
                    minDegree = pDeg;
                }
            }
            window.cc7Breakdown = {
                bioAncestors: hasBioAncestors,
                bioDescendants: hasBioDescendants,
                adoptedAncestors: hasAdoptedAncestors,
                adoptiveAncestors: hasAdoptiveAncestors,
                adoptedInDescendants: hasAdoptedInDescendants,
                adoptedOutDescendants: hasAdoptedOutDescendants,
            };
            isOneDegree ||= minDegree != 0;
            if (window.cc7Degree == 0) window.cc7Degree = Math.min(maxDegree - 1, CC7.MAX_DEGREE);
            if (isOneDegree) {
                $(`#${CC7Utils.CC7_CONTAINER_ID}`).addClass("degreeView");
            } else {
                $(`#${CC7Utils.CC7_CONTAINER_ID}`).removeClass("degreeView");
            }
            Utils.hideShakingTree();
            CC7.addRelationships();
            PeopleTable.addPeopleTable();
            $(`#${CC7Utils.CC7_CONTAINER_ID}`).append(
                $(
                    "<table id='degreesTable'>" +
                        "<tr id='trDeg'><th>Degrees</th></tr>" +
                        "<tr id='trCon'><th>Connections</th></tr>" +
                        (isOneDegree ? "" : "<tr id='trTot'><th>Total</th></tr></table>")
                )
            );
            CC7.buildDegreeTableData(degreeCounts, isOneDegree ? window.cc7Degree : 1);
            CC7.handleDegreeChange(window.cc7Degree);
        };

        try {
            CC7.clearDisplay();
            Utils.showShakingTree(CC7Utils.CC7_CONTAINER_ID, () => reader.readAsText(file));
        } catch (error) {
            Utils.hideShakingTree();
            wtViewRegistry.showError(`The input file is not valid: ${error}`);
        }
    }

    static getCC7Total() {
        // We retrieve the actual CC7 Total from the "My WikiTree/Connections" menu item, present when the user is logged in
        // and on any WT page except G2G (and also not on the apps server).
        const connText = $('nav[aria-label="My WikiTree Navigation"] a[href*="Special:MyConnections"]').text();
        if (!connText) return null;
        const m = connText.match(/\d+/);
        return m ? +m[0] : null;
    }

    static buildDegreeTableData(degreeCounts, fromDegree) {
        function addTableCol(i, degreeSum) {
            $("#trDeg").append($(`<td>${i}</td>`));
            $("#trCon").append($(`<td>${degreeCounts[i] || "?"}</td>`));
            if (fromDegree == 1) {
                $("#trTot").append($(`<td>${degreeSum || "?"}</td>`));
            }
        }
        let degreeSum = 0;
        for (let i = fromDegree; i <= window.cc7Degree; ++i) {
            degreeSum = degreeSum + (degreeCounts[i] || 0);
            addTableCol(i, degreeSum);
        }
        if (degreeCounts[-1]) {
            degreeSum = degreeSum + degreeCounts[-1];
            addTableCol(-1, degreeSum);
        }
        const loggedInUser = window.wtViewRegistry.session.lm.user.name;
        const currentId = wtViewRegistry.getCurrentWtId();
        const trueSize = currentId == loggedInUser ? CC7.getCC7Total() : "";
        const showWarn = window.people.size > 9500 && (!trueSize || trueSize >= 10000);
        const rowSpan = $("#trTot").length == 0 ? 2 : 3;
        let msgHtml = `True CC7 size for ${currentId} = ${trueSize ? trueSize : "[not available]"}</br>`;
        if (showWarn) {
            msgHtml +=
                "<span id='sizeWarn'>This CC7 has reached such a size that we can no longer retrieve all items to display. " +
                "What we do retrieve typically includes the latest additions, but at the cost of other, " +
                "usually unchanged profiles still in your CC7 which are not being returned by the server.</span";
        } else {
            msgHtml +=
                "We might not have retrieved all the requested connections if there are profiles with Privacy " +
                "settings that prevent them from being loaded.";
        }
        $("#trDeg").append($(`<td rowspan="${rowSpan}" class='trueSize'>${msgHtml}</td>`));
    }
}
const downloadArray = CC7.downloadArray;
