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
import { Settings } from "./Settings.js";
import { CC7Utils } from "./Utils.js";
import { Utils } from "../../shared/Utils.js";

export class CC7 {
    static LONG_LOAD_WARNING =
        "Loading 7 degrees may take a while, especially with Bio Check enabled (it can be 3 minutes or more) " +
        "so the default is set to 3. Feel free to change it. ";
    static firstTimeLoad = true;
    static SETTINGS_GEAR = "&#x2699;";
    static #helpText = `
        <x>[ x ]</x>
        <h2 style="text-align: center">About CC7 Views</h2>
        <p>
            CC7 Views allows you to retrieve the list of people connected to a profile within 7 degrees.
            This list of people does not include certain private profiles for which you are not on their
            trusted list, therefore counts of relatives might not always be accurate.
            Furthermore, sibling and child counts for people at the largest degree of separation will, by default, not be
            accurate as the counts are calculated from other data loaded and for the outer ring, this data
            is not always present. You can improve this by checking the "Improve count accuracy" checkbox and
            re-loading the data, but this will result in slower rerieval times.
        </p>
        <h3>Loading the Data</h3>
        <p>
            Depending on the number of connections, the data can take over two minutes to load fully,
            sometimes more than 5 minutes. Furthermore, WikiTree currently has a limit of about 10000
            profiles that can be retrieved, so for anyone with large numbers of connections, not all
            connections can be retrieved.
            To reduce loading time, you can:
        </p>
        <ul>
            <li>Load fewer than the full 7 degrees.</li>
            <li>Load only one degree at a time.</li>
            <li>Save the data to a file for faster loading next time.</li>
            <li>If it takes too long, or you entered the wrong degree, you can cancel the profile load via
                the Cancel button that appears during a load.</li>
        </ul>
        <h3>Views</h3>
        <p>
            Three different views of the data are available:
        </p>
        <ul>
            <li>
                The <b>Table View</b> shows the most data and will always load first. It shows, amongst other things,
                the degree of separation between the focal person and each person on the list.
            </li>
            <li>The <b>Hierarchy View</b> shows the hierarchial relationships between the people in the list.</li>
            <li>The <b>List View</b> provides a way by which you can look at particular surnames amongst your relatives.</li>
        </ul>
        <p>Below are some tips related to each view.</p>
        <h3>Table View</h3>
        <h4>Sorting the Table</h4>
        <ul>
            <li>Sort any column by clicking the header. Click again to reverse the sorting.</li>
            <li>Sort by Created/Modified to see new additions.</li>
            <li>The names in the location columns can be reversed (and subsequently re-sorted) by clicking the ↻ symbol
                in the header.
            </li>
        </ul>
        <h4>Scrolling the Wide Table</h4>
        <ul>
            <li>Click and drag the table left/right or two-finger drag on a trackpad.</li>
        </ul>
        <h4>Selecting Subsets</h4>
        <ul>
            <li>Use the select option to the left of the HIERARCHY button to select which subset of the loaded profiles
                should be displayed. This selection is also valid for the List View, but not for the Hierarchy View.
                Note: Some of these subsets will be partial in the presence of private profiles since the latter will
                "break" connections and the full subset then cannot be calculated.
                You have 6 choices:
                <ul>
                    <li><b>All</b> – All profiles.</li>
                    <li><b>Ancestors</b> – Only direct ancestors of the central person.</li>
                    <li><b>Descendants</b> – Only direct descendants of the central person.</li>
                    <li><b>All "Above"</b> – Anyone that can be reached by first following a parent link from the central
                        person as long as they are not in the "Below" group. After the first link, any link can be followed.
                    </li>
                    <li><b>All "Below"</b> – Anyone that can be reached by first following any link other than a parent
                        link from the central person. If someone can be reached by both a parent link and any of the other
                        links, they are placed in the "Above" group if they are older than the central person.
                        Otherwise they are in the "Below" group.
                    </li>
                    <li><b>Missing Family</b> – By default, anyone who might possibly be missing a family member. The default
                        setting includes all of the following:
                        <ul>
                          <li>Anyone with no parents.</li>
                          <li>Anyone with only one parent.</li>
                          <li>Anyone with their "No more spouses" box unchecked.</li>
                          <li>Anyone with their "No more children" box unchecked.</li>
                          <li>Anyone without children and their "No more children" box unchecked.</li>
                        </ul>
                        You may fine-tune the above missing family setting by selecting any combination of the above values
                        in the Settings (see <img width=16px src="./views/cc7/images/setting-icon.png" /> at the top right).
                    </li>
                    <li><b>Complete</b> – People with birth and death dates and places, both parents, No (More) Spouses box checked, and No (More) Children box checked.</li>
                </ul>
            </li>
        </ul>
        <h4>Filtering Rows</h4>
        <ul>
            <li>
                Limit the content of the table based on the content of columns by entering values in the filter
                boxes just below the column headers. Partial matching is used in text and date columns, while
                the complete numeric value is considered in numeric columns.
            </li>
            <li>
                Empty values can be selected by using '?'. For example ? in the death date column would show only
                people with no date of death.
            </li>
            <li>
                Any column can be filtered with '!', meaning "not matching". For text and date columns, this works
                on partial matches. For example !19 will exclude any date with 19 in it, including 1820-12-19. For
                numeric columns, the numbers as a whole are considered. For example !8 in the age column will
                exclude all 8 year olds.
            </li>
            <li>
                Numeric columns (including the years in date columns) can be filtered with &gt; and &lt;.
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
                The Died Young images, <img height=45px src="./views/cc7/images/pink-and-blue-ribbon.png" /> and
                <img src="./views/cc7/images/50px-Remember_the_Children-26.png" /> by default, are used to flag people
                (in their Children column) who died under age 5 and under age 16, respectively, provided they had
                no children. You can change the image by clicking on the settings gear
                (<img width=16px src="./views/cc7/images/setting-icon.png" />
                at the top right) and selecting the images you want to use.
            </li>
            <li>Click the images <img height=15px src="./views/cc7/images/Home_icon.png" /> and
                <img height=15px src="./views/cc7/images/timeline.png" /> to see a family sheet and timeline, respectively,
                of the given person.</li>
            <li> Some cells may be colour-coded as follows:
        </ul>
        <ul id="cc7ImgKey" class="cc7ImgKey">
            <li><span class="bioIssue">&nbsp;&nbsp;&nbsp;</span> Bio Check issue</li>
            <li><span class="bioIssue2">&nbsp;&nbsp;&nbsp;</span> Bio Check issue ("ignored")</li>
            <li><img src="./views/cc7/images/blue_bricks_small.jpg" /> missing father</li>
            <li><img src="./views/cc7/images/pink_bricks_small.jpg" /> missing mother</li>
            <li><img src="./views/cc7/images/purple_bricks_small.jpg" /> both parents missing</li>
            <li><span class="none"></span> the 'No more spouses/children' box is checked, or Died Young</li>
        </ul>
        <ul>
            <li>Click a Bio Check Issue cell to see the Bio Check report.</li>
            <li>You can close an open report/pop-up in four ways: 1) press the ESC key, 2) double-click the pop-up,
                3) click the [x] in the top right corner, or 4) click the button with which you opened it.</li>
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

    static GET_PEOPLE_FIELDS = [
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
        "Prefix",
        "Privacy",
        "RealName",
        "ShortName",
        "Spouses",
        "Suffix",
        "Touched",
    ].join(",");

    static GET_PEOPLE_LIMIT = 1000;
    static MAX_DEGREE = 7;

    static cancelLoadController;

    // Constants for IndexedDB
    static CONNECTION_DB_NAME = "ConnectionFinderWTE";
    static CONNECTION_DB_VERSION = 2;
    static CONNECTION_STORE_NAME = "distance2";
    static RELATIONSHIP_DB_NAME = "RelationshipFinderWTE";
    static RELATIONSHIP_DB_VERSION = 2;
    static RELATIONSHIP_STORE_NAME = "relationship2";

    constructor(selector, startId) {
        this.startId = startId;
        this.selector = selector;
        Settings.restoreSettings();
        $(selector).html(
            `<div id="${CC7Utils.CC7_CONTAINER_ID}" class="cc7Table">
            <button
                id="getPeopleButton"
                class="small button"
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
            ><button id="getDegreeButton" class="small button" title="Get only people connected at the indicated degree">
                Get Degree 3 Only</button
            ><button id="cancelLoad" title="Cancel the current loading of profiles." class="small button">
                Cancel</button
            ><button id="savePeople" title="Save this data to a file for faster loading next time." class="small button">
                Save</button
            ><button id="loadButton" class="small button" title="Load a previously saved data file.">Load A File</button
            ><input
              id="getExtraDegrees"
              type="checkbox"
              title="Retrieve extra degrees (in addition to those requested) when a GET button is clicked, to ensure the counts of relatives are more accurate." />
            <label
              for="getExtraDegrees"
              title="Retrieve extra degrees (in addition to those requested) when a GET button is clicked, to ensure the counts of relatives are more accurate."
              class="right">
              Improve count accuracy</label
            ><input type="file" id="fileInput" style="display: none"/>
            <span id="adminButtons">
            <span id="settingsButton" title="Settings"><img src="./views/cc7/images/setting-icon.png" /></span>
            <span id="help" title="About this">?</span>
            </span>
            ${Settings.getSettingsDiv()}
            <div id="explanation">${CC7.#helpText}</div>
            </div>`
        );

        const cc7Degree = Utils.getCookie("w_cc7Degree");
        if (cc7Degree && cc7Degree > 0 && cc7Degree <= CC7.MAX_DEGREE) {
            CC7.handleDegreeChange(cc7Degree);
        }
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
            });
        $("#fileInput").off("change").on("change", CC7.handleFileUpload);
        $("#getPeopleButton").off("click").on("click", CC7.getConnectionsAction);

        $("#help")
            .off("click")
            .on("click", function () {
                $("#explanation").css("z-index", `${Settings.getNextZLevel()}`).slideToggle();
            });
        $("#explanation")
            .off("dblclick")
            .on("dblclick", function () {
                $(this).slideToggle();
            });
        $(`#${CC7Utils.CC7_CONTAINER_ID} #explanation x`)
            .off("click")
            .on("click", function () {
                $(this).parent().slideUp();
            });
        $("#explanation").draggable();

        $("#settingsButton").off("click").on("click", CC7.toggleSettings);
        $("#saveSettingsChanges")
            .html("Apply Changes")
            .addClass("small button")
            .off("click")
            .on("click", CC7.settingsChanged);
        $("#settingsDIV")
            .css("width", "300")
            .dblclick(function () {
                CC7.toggleSettings();
            });
        $("#settingsDIV").draggable();
        Settings.renderSettings();
        CC7.setInfoPanelMessage();

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
        $("#getPeopleButton").trigger("click");
        $(document).off("keyup", CC7.closePopUp).on("keyup", CC7.closePopUp);
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

    static handleDegreeChange(wantedDegree) {
        const newDegree = Math.min(CC7.MAX_DEGREE, wantedDegree);
        CC7.updateButtonLabels(newDegree);
        // const getExtra = document.getElementById("getExtraDegrees").checked;
        // $("#getPeopleButton").text(`Get CC${newDegree}${getExtra ? "+1" : ""}`);
        // $("#getDegreeButton").text(`Get Degree ${newDegree}${getExtra ? "±1" : ""} Only`);
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
    }

    static closePopUp(e) {
        if (e.key === "Escape") {
            // Find the popup with the highest z-index
            let highestZIndex = 0;
            let lastPopup = null;
            $(
                ".familySheet:visible, .timeline:visible, .bioReport:visible, #settingsDIV:visible, #explanation:visible"
            ).each(function () {
                const zIndex = parseInt($(this).css("z-index"), 10);
                if (zIndex > highestZIndex) {
                    highestZIndex = zIndex;
                    lastPopup = $(this);
                }
            });

            // Close the popup with the highest z-index
            if (lastPopup) {
                Settings.setNextZLevel(highestZIndex);
                lastPopup.slideUp();
            }
        }
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
                window.rootId = +resultByKeyAtD[wtId].Id;
                window.cc7Degree = theDegree;
                CC7.populateRelativeArrays();
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
                PeopleTable.addPeopleTable(PeopleTable.tableCaption());
                $("#cc7Subset").prop("disabled", true);
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
        console.log(
            `Received ${profiles.length} degree ${theDegree - 1} to ${theDegree + 1} profiles for start:${start}`
        );
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
            console.log(
                `Retrieving getPeople result page ${callNr}. key:${wtId}, nuclear:${theDegree}, start:${start}, limit:${limit}`
            );
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
            console.log(
                `Received ${profiles.length} degree ${theDegree - 1} to ${theDegree + 1} profiles for start:${start}`
            );
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
        const userWTuserID = window.wtViewRegistry.session.lm.user.name;
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
                person.Parents = [person.Father, person.Mother];
                const personDegree = typeof person.Meta?.Degrees === "undefined" ? -1 : +person.Meta.Degrees;
                person.Hide = personDegree < minDegree || personDegree > maxDegree;
                // To be filled later
                person.Parent = [];
                person.Spouse = [];
                person.Sibling = [];
                person.Child = [];
                person.Marriage = {};

                if (Settings.current["biocheck_options_biocheckOn"]) {
                    const bioPerson = new BioCheckPerson();
                    if (bioPerson.canUse(person, false, true, userWTuserID)) {
                        const biography = new Biography(theSourceRules);
                        biography.parse(bioPerson.getBio(), bioPerson, "");
                        biography.validate();
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

            window.rootId = +resultByKey[wtId]?.Id;
            CC7.populateRelativeArrays();
            const root = window.people.get(window.rootId);
            let haveRoot = typeof root != "undefined";
            if (!haveRoot) {
                wtViewRegistry.showWarning(
                    `The requested profile (${wtId}) was not returned by WikiTree, so some functionality, ` +
                        "like the Hierarchy view and ancestor statistics, has been disabled and some filters " +
                        "will return unexpected results."
                );
            }
            const maxRequestedDeg = getExtra ? maxWantedDegree + 1 : maxWantedDegree;
            const [nrDirectAncestors, nrDuplicateAncestors] = CC7.categoriseProfiles(root, maxRequestedDeg);

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
            // Furthermore we subtract 1 from the total because we are talking about direct ancestors, so the root
            // is not counted.
            const maxDirectAncestors = 2 ** (maxRequestedDeg + 2) - 2;
            $(`#${CC7Utils.CC7_CONTAINER_ID}`).append(
                $(
                    "<table id='degreesTable'>" +
                        "<tr id='trDeg'><th>Degrees</th></tr>" +
                        "<tr id='trCon'><th>Connections</th></tr>" +
                        "<tr id='trTot'><th>Total</th></tr>" +
                        '</table><p id="ancReport">' +
                        (haveRoot && nrDirectAncestors > 0
                            ? `Out of ${maxDirectAncestors} possible direct ancestors in ${
                                  maxRequestedDeg + 2
                              } generations, ${nrDirectAncestors} (${(
                                  (nrDirectAncestors / maxDirectAncestors) *
                                  100
                              ).toFixed(2)}%) have WikiTree profiles and out of them, ${nrDuplicateAncestors} (${(
                                  (nrDuplicateAncestors / nrDirectAncestors) *
                                  100
                              ).toFixed(2)}%) occur more than once due to pedigree collapse.</p>`
                            : "</p>")
                )
            );
            CC7.buildDegreeTableData(degreeCounts, 1);
            // console.log(window.people);
            this.addRelationships();
            PeopleTable.addPeopleTable(PeopleTable.tableCaption());
        }

        $("#getPeopleButton").prop("disabled", false);
        $("#getDegreeButton").prop("disabled", false);
        $("#getExtraDegrees").prop("disabled", false);
        $("#cancelLoad").hide();
        CC7.setInfoPanelMessage();
        CC7.firstTimeLoad = false;
    }

    static addRelationships() {
        const rootName = $("#wt-id-text").val().trim();
        let rootId = null;
        const familyMapEntries = [];
        for (let [key, value] of window.people.entries()) {
            if (value.Name === rootName) {
                rootId = key;
                // break;
            }
            familyMapEntries.push([
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
                    Meta: value.Meta,
                },
            ]);
        }

        let rootPersonId = rootId;
        const loggedInUser = window.wtViewRegistry.session.lm.user.name;
        const loggedInUserId = window.wtViewRegistry.session.lm.user.id;

        const worker = new Worker(new URL("relationshipWorker.js", import.meta.url));

        const $this = this;
        worker.onmessage = function (event) {
            // console.log("Worker returned:", event.data);
            if (event.data.type === "completed") {
                if ($("#cc7PBFilter").data("select2")) {
                    $("#cc7PBFilter").select2("destroy");
                }
                const updatedTable = CC7.updateTableWithResults(
                    document.querySelector("#peopleTable"),
                    event.data.results
                );
                document
                    .getElementById("cc7Container")
                    .replaceChild(updatedTable, document.querySelector("#peopleTable"));
                CC7.initializeSelect2();

                if (loggedInUserId == rootPersonId) {
                    $this.storeDataInIndexedDB(event.data.dbEntries);
                }

                worker.terminate();
            } else if (event.data.type === "log") {
                console.log("Worker log:", event.data.message);
            } else if (event.data.type === "error") {
                console.error("Worker returned an error:", event.data.message);
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
        const $this = this;
        this.openDatabase(CC7.RELATIONSHIP_DB_NAME, CC7.RELATIONSHIP_DB_VERSION, CC7.RELATIONSHIP_STORE_NAME)
            .then((db) => {
                return $this.addDataToStore(db, CC7.RELATIONSHIP_STORE_NAME, dbEntries, true);
            })
            .then(() => {
                console.log("Data added to RelationshipFinderWTE.");
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
                db.onversionchange = function () {
                    db.close();
                    alert(`The ${dbName} database is outdated and needs a version upgrade. Please reload this page.`);
                };
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "theKey" });
                }
            };

            request.onsuccess = function (event) {
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

    static updateTableWithResults(table, results) {
        const clone = table.cloneNode(true); // Deep clone the table
        results.forEach((result) => {
            // window.people is an array of objects with the personId as the key
            // Add the relationship to the person object
            const person = window.people.get(result.personId);
            if (person) {
                person.Relationship = result.relationship;
            }
            const row = clone.querySelector(`tr[data-id="${result.personId}"]`);
            if (row) {
                row.setAttribute("data-relation", result?.relationship?.abbr || "");
                const relationCell = row.querySelector("td.relation");
                if (relationCell) {
                    relationCell.textContent = result.relationship.abbr;
                    relationCell.setAttribute("title", result?.relationship?.full);
                }
            }
        });
        return clone;
    }

    static initializeSelect2() {
        // Check if select2 is already initialized and destroy it if so
        if ($("#cc7PBFilter").data("select2")) {
            $("#cc7PBFilter").select2("destroy");
        }
        function formatOptions(option) {
            if (!option.id || option.id == "all") {
                return option.text;
            }
            return $(`<img class="privacyImage" src="./${option.text}"/>`);
        }
        $("#cc7PBFilter").select2({
            templateResult: formatOptions,
            templateSelection: formatOptions,
            dropdownParent: $("#cc7Container"),
            minimumResultsForSearch: Infinity,
            width: "100%",
        });
        $("#cc7PBFilter").off("select2:select").on("select2:select", PeopleTable.filterListener);
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

    static categoriseProfiles(theRoot, maxRequestedDegree) {
        if (!theRoot) return [-1, -1];
        const ABOVE = true;
        const BELOW = false;
        const collator = new Intl.Collator();
        CC7Utils.fixBirthDate(theRoot);
        theRoot.isAncestor = false;
        theRoot.isAbove = false;
        // Note: unlike the usual case, where the queue contains nodes still to be "visited" and processed,
        // the people on the queues here have already been categorised and it is their appropriate
        // relatives (depending on the queue) that needs to be categorised and then added to the queues
        const descendantQ = [+theRoot.Id];
        const belowQ = [+theRoot.Id];
        const ancestorQ = [[+theRoot.Id, 0]];
        const aboveQ = [+theRoot.Id];
        const directAncestors = new Set();
        const duplicates = new Set();
        let nrProfiles = 0;
        let firstIteration = true;
        while (belowQ.length > 0 || aboveQ.length > 0 || descendantQ.length > 0 || ancestorQ.length > 0) {
            if (descendantQ.length > 0) {
                const pId = descendantQ.shift();
                const person = window.people.get(pId);
                if (person) {
                    // Add this persons children to the queue
                    const rels = CC7.getIdsOfRelatives(person, ["Child"]);
                    for (const rId of rels) {
                        const relId = +rId;
                        const child = window.people.get(relId);
                        if (child) {
                            child.isAncestor = false;
                            descendantQ.push(relId);
                        }
                    }
                }
            }
            if (belowQ.length > 0) {
                const pId = belowQ.shift();
                const person = window.people.get(pId);
                if (person) {
                    if (typeof person.fixedBirthDate === "undefined") {
                        CC7Utils.fixBirthDate(person);
                    }
                    // Add this person's relatives to the queue
                    const rels = firstIteration
                        ? CC7.getIdsOfRelatives(person, ["Sibling", "Spouse", "Child"])
                        : CC7.getIdsOfRelatives(person, ["Parent", "Sibling", "Spouse", "Child"]);
                    for (const rId of rels) {
                        const relId = +rId;
                        if (setAndShouldAdd(relId, BELOW)) {
                            if (!belowQ.includes(relId)) {
                                belowQ.push(relId);
                            }
                        }
                    }
                }
            }
            if (ancestorQ.length > 0) {
                const [pId, degree] = ancestorQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    const parentDegree = degree + 1;
                    // Note that we're using the Parents array and not the Parent array here
                    // so that we can count profiles and duplicates to as high a degree as possible.
                    // The Parent array contains actual profiles that we have loaded, while
                    // Parents contain parent IDs and may be for profiles we have not loaded
                    // (but which actually exists in WikiTree).
                    for (const rId of person["Parents"]) {
                        const relId = +rId;

                        // Count profiles and duplicates
                        if (relId) {
                            ++nrProfiles;
                            if (directAncestors.has(relId)) {
                                duplicates.add(relId);
                            } else {
                                directAncestors.add(relId);
                            }
                        }

                        // Set ancestor relationship. We have requestd maxRequestedDegree from WT, so to set isAncestor
                        // we only check profiles up to and including that degree.
                        if (parentDegree <= maxRequestedDegree) {
                            const parent = window.people.get(relId);
                            if (parent) {
                                parent.isAncestor = true;
                                ancestorQ.push([rId, parentDegree]);
                            }
                        }
                    }
                }
            }
            if (aboveQ.length > 0) {
                const pId = aboveQ.shift();
                const person = window.people.get(pId);
                if (person) {
                    if (typeof person.fixedBirthDate === "undefined") {
                        CC7Utils.fixBirthDate(person);
                    }
                    // Add this person's relatives to the queue
                    const rels = firstIteration
                        ? CC7.getIdsOfRelatives(person, ["Parent"])
                        : CC7.getIdsOfRelatives(person, ["Parent", "Sibling", "Spouse", "Child"]);
                    for (const rId of rels) {
                        const relId = +rId;
                        if (setAndShouldAdd(relId, ABOVE)) {
                            if (!aboveQ.includes(relId)) {
                                aboveQ.push(relId);
                            }
                        }
                    }
                }
            }
            firstIteration = false;
        }
        console.log(`nr direct ancestor profiles=${directAncestors.size}, nr dups=${duplicates.size}`);
        return [nrProfiles, duplicates.size];

        function setAndShouldAdd(pId, where) {
            const p = window.people.get(pId);
            if (p) {
                if (
                    where == BELOW &&
                    // isAbove is not defined yet, or the person is above, but is the same age or younger
                    // than the root person
                    (typeof p.isAbove === "undefined" ||
                        (p.isAbove && collator.compare(theRoot.fixedBirthDate, p.fixedBirthDate) <= 0))
                ) {
                    p.isAbove = false;
                    return true;
                } else if (
                    where == ABOVE &&
                    // isAbove is not defined yet, or the person is below, but is older than the root person
                    (typeof p.isAbove === "undefined" ||
                        (!p.isAbove && collator.compare(theRoot.fixedBirthDate, p.fixedBirthDate) > 0))
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
        $("#cc7PBFilter").off("select2:select");

        $(
            [
                "#degreesTable",
                "#ancReport",
                "#hierarchyView",
                "#lanceTable",
                "#peopleTable",
                "#tooBig",
                ".viewButton",
                "#wideTableButton",
                "#clearTableFiltersButton",
                "#cc7Subset",
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
                        $(wtViewRegistry.WT_ID_TEXT).val(),
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
            for (const aPerson of window.people.values()) {
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
            isOneDegree ||= minDegree != 0;
            if (window.cc7Degree == 0) window.cc7Degree = Math.min(maxDegree - 1, CC7.MAX_DEGREE);
            // const theDegree = Math.min(window.cc7Degree, CC7.MAX_DEGREE);
            if (isOneDegree) {
                $(`#${CC7Utils.CC7_CONTAINER_ID}`).addClass("degreeView");
            } else {
                $(`#${CC7Utils.CC7_CONTAINER_ID}`).removeClass("degreeView");
            }
            Utils.hideShakingTree();
            CC7.addRelationships();
            PeopleTable.addPeopleTable(PeopleTable.tableCaption());
            $(`#${CC7Utils.CC7_CONTAINER_ID} #cc7Subset`).before(
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
    }
}
