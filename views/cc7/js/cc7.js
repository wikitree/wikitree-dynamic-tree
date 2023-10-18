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

export class CC7 {
    static APP_ID = "CC7";
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
            This guide explains how to use it.
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
            <li>Load only one degree at a time, but be aware that, in order to provide the correct relative
                counts, we have to load degree N-1 and N+1 when loading degree N.</li>
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
            <li>
                Sort by Created/Modified to see new additions.
            </li>
            <li>
                The location column sort toggles between sorting Town &rarr; Country or Country &rarr; Town on each click
                on location header.
            </li>
        </ul>
        <h4>Scrolling the Wide Table</h4>
        <ul>
            <li>Click and drag the table left/right or two-finger drag on a trackpad.</li>
        </ul>
        <h4>Selecting Subsets</h4>
        <ul>
            <li>Use the select option to the left of the HIERARCHY button to select which subset of the loaded profiles
                should be displayed. This selection is also valid for the List View, but not for the Hierarchy View. You
                have 6 choices:
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
                    <li><b>Missing Family</b> – Anyone who is missing a parent or does not have the "no more children" 
                        or "no more spouses" boxes checked.
                    </li>
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
                The Died Young images, <img src="./views/cc7/images/47px-RTC_-_Pictures.jpeg" /> and
                <img src="./views/cc7/images/50px-Remember_the_Children-26.png" /> by default, are used to flag people
                (in their Children column) who died under age 5 and under age 16, respectively, provided they had
                no children. You can change the image by clicking on the settings gear,
                <img width=16px src="./views/cc7/images/setting-icon.png" />
                at the top right, and selecting the images you want to use.
            </li>
            <li>Click the images <img height=15px src="./views/cc7/images/Home_icon.png" /> and
                <img height=15px src="./views/cc7/images/timeline.png" /> to see a family sheet and timeline, respectively,
                of the given person.</li>
            <li> Some cells may be colour-coded as follows:
        </ul>
        <ul id="cc7ImgKey" class="cc7ImgKey">
            <li><span class="bioIssue">&nbsp;&nbsp;&nbsp;</span> Bio Check issue</li>
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
    static HIDE = true;
    static EXCEL = "xlsx";
    static CSV = "csv";

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

    // These images were obtained from either https://www.wikitree.com/wiki/Space:RTC_-_Resources
    // or https://uxwing.com/. The latter states: "Exclusive collection of free icons download for
    // commercial projects without attribution"
    static dyIcons = [
        {
            value: "47px-RTC_-_Pictures.jpeg",
            text: "IMG:views/cc7/images/47px-RTC_-_Pictures.jpeg",
            width: 30,
        },
        {
            value: "diedYoung.png",
            text: "IMG:views/cc7/images/diedYoung.png",
            width: 30,
        },
        {
            value: "RTC_-_Pictures-6.png",
            text: "IMG:views/cc7/images/RTC_-_Pictures-6.png",
            width: 30,
        },
        { value: "br" },
        {
            value: "50px-Remember_the_Children-26.png",
            text: "IMG:views/cc7/images/50px-Remember_the_Children-26.png",
            width: 30,
        },
        {
            value: "Remember_the_Children-21.png",
            text: "IMG:views/cc7/images/Remember_the_Children-21.png",
            width: 30,
        },
        {
            value: "Remember_the_Children-27.png",
            text: "IMG:views/cc7/images/Remember_the_Children-27.png",
            width: 30,
        },
        { value: "br" },
        {
            value: "butterfly-icon.png",
            text: "IMG:views/cc7/images/butterfly-icon.png",
            width: 30,
        },
        {
            value: "flower-plant-icon.png",
            text: "IMG:views/cc7/images/flower-plant-icon.png",
            width: 30,
        },
        {
            value: "candle-light-icon.png",
            text: "IMG:views/cc7/images/candle-light-icon.png",
            width: 15,
        },
        { value: "br" },
        {
            value: "flower-rose-icon.png",
            text: "IMG:views/cc7/images/flower-rose-icon.png",
            width: 30,
        },
        {
            value: "aids-ribbon-icon.png",
            text: "IMG:views/cc7/images/aids-ribbon-icon.png",
            width: 30,
        },
        {
            value: "candle-light-color-icon.png",
            text: "IMG:views/cc7/images/candle-light-color-icon.png",
            width: 15,
        },
    ];

    static optionsDef = {
        viewClassName: "CC7View",
        tabs: [
            {
                name: "icons",
                label: "Died Young Icons",
                hideSelect: true,
                subsections: [{ name: "DiedYoungIcons", label: "Died young icons" }],
                // comment: "",
            },
            {
                name: "biocheck",
                label: "Bio Check",
                hideSelect: true,
                subsections: [{ name: "BioCheckOptions", label: "Bio Check Options" }],
                // comment: "",
            },
        ],
        optionsGroups: [
            {
                tab: "icons",
                subsection: "DiedYoungIcons",
                category: "icons",
                subcategory: "options",
                options: [
                    {
                        optionName: "sect1",
                        comment: "Icon to use for a child that died before age 5:",
                        type: "br",
                    },
                    {
                        optionName: "veryYoung",
                        type: "radio",
                        label: "",
                        values: CC7.dyIcons,
                        defaultValue: "47px-RTC_-_Pictures.jpeg",
                    },
                    {
                        optionName: "sect2",
                        comment: "Icon to use for a child that died before age 16:",
                        type: "br",
                    },
                    {
                        optionName: "young",
                        type: "radio",
                        label: "",
                        values: CC7.dyIcons,
                        defaultValue: "50px-Remember_the_Children-26.png",
                    },
                ],
            },
            {
                tab: "biocheck",
                subsection: "BioCheckOptions",
                category: "biocheck",
                subcategory: "options",
                options: [
                    {
                        optionName: "bioComment",
                        comment: "Enabling Bio Check only comes into effect at subsequent GET button clicks.",
                        type: "br",
                    },
                    {
                        optionName: "biocheckOn",
                        type: "checkbox",
                        label: "Enable Bio Check on all profiles",
                        defaultValue: 0,
                    },
                ],
            },
        ],
    };
    static settingOptionsObj;
    static currentSettings = {};
    static cancelLoadController;
    static nextZLevel = 10000;

    constructor(selector, startId) {
        this.selector = selector;
        const optionsJson = CC7.getCookie("w_diedYoung");
        // console.log(`Retrieved options ${optionsJson}`);
        if (optionsJson) {
            const opt = JSON.parse(optionsJson);
            CC7.optionsDef.optionsGroups[0].options[1].defaultValue = opt["icons_options_veryYoung"];
            CC7.optionsDef.optionsGroups[0].options[3].defaultValue = opt["icons_options_young"];
            CC7.optionsDef.optionsGroups[1].options[1].defaultValue = opt["biocheck_options_biocheckOn"] || 0;
        }
        CC7.settingOptionsObj = new SettingsOptions.SettingsOptionsObject(CC7.optionsDef);
        $(selector).html(
            `<div id="cc7Container" class="cc7Table">
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
            ><input type="file" id="fileInput" style="display: none"/>
            <span id="adminButtons">
            <span id="settingsButton" title="Settings"><img src="./views/cc7/images/setting-icon.png" /></span>
            <span id="help" title="About this">?</span>
            </span>
            ${CC7.settingOptionsObj.createdSettingsDIV}
            <div id="explanation">${CC7.#helpText}</div>
            </div>`
        );

        const cc7Degree = CC7.getCookie("w_cc7Degree");
        if (cc7Degree && cc7Degree > 0 && cc7Degree <= CC7.MAX_DEGREE) {
            CC7.handleDegreeChange(cc7Degree);
        }
        $("#cc7Degree")
            .off("change")
            .on("change", function () {
                const theDegree = $("#cc7Degree").val();
                CC7.handleDegreeChange(theDegree);
            });
        $("#fileInput").off("change").on("change", CC7.handleFileUpload);
        $("#getPeopleButton").off("click").on("click", CC7.getConnectionsAction);

        $("#help")
            .off("click")
            .on("click", function () {
                $("#explanation").css("z-index", `${CC7.nextZLevel++}`).slideToggle();
            });
        $("#explanation")
            .off("dblclick")
            .on("dblclick", function () {
                $(this).slideToggle();
            });
        $("#cc7Container #explanation x")
            .off("click")
            .on("click", function () {
                $(this).parent().slideUp();
            });
        $("#explanation").draggable();

        $("#settingsButton").off("click").on("click", CC7.toggleSettings);
        $("#saveSettingsChanges").html("Apply Changes").addClass("small button").click(CC7.settingsChanged);
        $("#settingsDIV")
            .css("width", "285")
            .dblclick(function () {
                CC7.toggleSettings();
            });
        $("#settingsDIV").draggable();

        CC7.settingOptionsObj.buildPage();
        CC7.settingOptionsObj.setActiveTab("icons");
        CC7.currentSettings = CC7.settingOptionsObj.getDefaultOptions();
        CC7.setInfoPanelMessage();

        $("#cancelLoad").off("click").on("click", CC7.cancelLoad);
        $("#getDegreeButton").off("click").on("click", CC7.getDegreeAction);

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
                $("#fileInput").click();
            });
        $("#getPeopleButton").click();
        $(document).off("keyup", CC7.closePopup).on("keyup", CC7.closePopUp);
    }

    static setInfoPanelMessage() {
        const loadWarning = CC7.firstTimeLoad ? CC7.LONG_LOAD_WARNING : "";
        wtViewRegistry.setInfoPanel(
            loadWarning +
                `Bio Check is ${
                    CC7.currentSettings["biocheck_options_biocheckOn"] ? "ENABLED" : "DISABLED"
                } in settings.`
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
            theDIV.style.zIndex = `${CC7.nextZLevel++}`;
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    }

    static settingsChanged(e) {
        // console.log("current settings:", CC7.currentSettings);
        if (CC7.settingOptionsObj.hasSettingsChanged(CC7.currentSettings)) {
            // console.log(`new settings: ${String(CC7.currentSettings)}`, CC7.currentSettings);
            const veryYoungImg = CC7.imagePath(CC7.currentSettings["icons_options_veryYoung"]);
            const youngImg = CC7.imagePath(CC7.currentSettings["icons_options_young"]);
            $("img.diedVeryYoungImg").each(function () {
                const it = $(this);
                it.attr("src", veryYoungImg);
            });
            $("img.diedYoungImg").each(function () {
                $(this).attr("src", youngImg);
            });
            if (!CC7.currentSettings["biocheck_options_biocheckOn"]) {
                $("td.bioIssue").each(function () {
                    $(this).off("click");
                    $(this).removeClass("bioIssue");
                });
            }
            CC7.setInfoPanelMessage();
            CC7.setCookie("w_diedYoung", JSON.stringify(CC7.currentSettings), { expires: 365 });
        }
        CC7View.cancelSettings();
    }

    static imagePath(fileName) {
        return `./views/cc7/images/${fileName}`;
    }

    static handleDegreeChange(wantedDegree) {
        const newDegree = Math.min(CC7.MAX_DEGREE, wantedDegree);
        $("#getPeopleButton").text(`Get CC${newDegree}`);
        $("#getDegreeButton").text(`Get Degree ${newDegree} Only`);
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
        theDegree = CC7.getCookie("w_cc7Degree");
        if (newDegree != theDegree) {
            CC7.setCookie("w_cc7Degree", newDegree, { expires: 365 });
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
                CC7.nextZLevel = highestZIndex;
                lastPopup.slideUp();
            }
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

        if ($("#wideTableButton").length == 0) {
            const pTable = $(".peopleTable");
            const wideTableButton = $("<button class='button small' id='wideTableButton'>Wide Table</button>");
            wideTableButton.insertBefore(pTable);

            $("#wideTableButton")
                .off("click")
                .on("click", function (e) {
                    e.preventDefault();

                    const dTable = $(".peopleTable").eq(0);
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
        const theClickedRow = jqClicked.closest("tr");
        const id = +theClickedRow.attr("data-id");
        let tPerson = window.people.get(id);
        const theClickedName = tPerson.Name;
        const familyId = theClickedName.replace(" ", "_") + "_timeLine";
        if ($(`#${familyId}`).length) {
            $(`#${familyId}`).css("z-index", `${CC7.nextZLevel++}`).slideToggle();
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
        timelineTable.attr("id", familyId);
        CC7.showTable(jqClicked, timelineTable, 30, 30);
    }

    static showTable(jqClicked, theTable, lOffset, tOffset) {
        // Attach the table to the container div
        theTable.prependTo($("#cc7Container"));
        theTable.draggable();
        theTable.off("dblclick").on("dblclick", function () {
            $(this).slideUp();
        });

        CC7.setOffset(jqClicked, theTable, lOffset, tOffset);
        $(window).resize(function () {
            if (theTable.length) {
                CC7.setOffset(jqClicked, theTable, lOffset, tOffset);
            }
        });

        theTable.css("z-index", `${CC7.nextZLevel++}`);
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

    static setOffset(theClicked, elem, lOffset, tOffset) {
        const theLeft = CC7.getOffset(theClicked[0]).left + lOffset;
        elem.css({ top: CC7.getOffset(theClicked[0]).top + tOffset, left: theLeft });
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
        if ($(`#${familyId}`).length) {
            $(`#${familyId}`).css("z-index", `${CC7.nextZLevel++}`).slideToggle();
            return;
        }

        const bioReportTable = CC7.getBioCheckReportTable(person);
        bioReportTable.attr("id", familyId);
        CC7.showTable(jqClicked, bioReportTable, 30, 30);
    }

    static getBioCheckReportTable(person) {
        const issueWord = person.bioCheckReport.length == 1 ? "issue" : "issues";
        const bioCheckTable = $(
            `<div class='bioReport' data-wtid='${person.Name}'><w>↔</w><x>[ x ]</x><table class="bioReportTable">` +
                `<caption>Bio Check found the following ${issueWord} with the biography of ${person.FirstName}</caption>` +
                "<tbody></tbody></table></div>"
        );

        for (const msg of person.bioCheckReport) {
            const msgTR = $("<tr></tr>").append($("<td></td>").text(msg));
            bioCheckTable.find("tbody").append(msgTR);
        }
        return bioCheckTable;
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
            $(`#${familyId}`).css("z-index", `${CC7.nextZLevel++}`).slideToggle();
            return;
        }

        CC7.assignRelationshipsFor(fPerson);
        const thisFamily = [fPerson].concat(fPerson.Parent, fPerson.Sibling, fPerson.Spouse, fPerson.Child);

        const kkTable = CC7.peopleToTable(thisFamily);
        kkTable.attr("id", familyId);
        CC7.showTable(theClicked, kkTable, 30, 30);
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

    static showFamilySheet(jqClicked) {
        const theClickedRow = jqClicked.closest("tr");
        const theClickedName = theClickedRow.attr("data-name");
        const theClickedId = +theClickedRow.attr("data-id");

        const aPeo = window.people.get(theClickedId);
        if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
            CC7.doFamilySheet(aPeo, jqClicked);
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
                CC7.doFamilySheet(mPerson, jqClicked);
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
        el.off("click").on("click", function () {
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

    static changesLink(wtRef, text) {
        return wtRef.startsWith("Private")
            ? text
            : `<a target='_blank' href='https://www.wikitree.com/index.php?title=Special:NetworkFeed&who=${wtRef}'>${text}</a>`;
    }

    static ONE_DEGREE = true;
    static tableCaption(id, theDegree, isOneDegree) {
        let caption = "";
        if (isOneDegree) {
            caption = `Degree ${theDegree} connected people for ${id}`;
        } else {
            const person = window.people.get(id);
            caption = person ? `CC${theDegree} for ${new PersonName(person).withParts(CC7.WANTED_NAME_PARTS)}` : "";
        }
        return caption;
    }

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
        const bioCheck = CC7.currentSettings["biocheck_options_biocheckOn"];

        const aTable = $(
            "<table id='peopleTable' class='peopleTable'>" +
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
                        CC7.fixBirthDate(mPerson);
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

        const subset = $("#cc7Subset").val();
        for (let [id, , birthDate] of sortIdsByDegreeAndBirthDate(window.people.keys())) {
            const mPerson = window.people.get(id);
            if (mPerson.Hide) continue;
            switch (subset) {
                case "above":
                    if (!mPerson.isAbove) continue;
                    break;

                case "below":
                    if (mPerson.isAbove) continue;
                    break;

                case "ancestors":
                    if (mPerson.isAncestor) break;
                    continue;

                case "descendants":
                    if (typeof mPerson.isAncestor != "undefined" && !mPerson.isAncestor) break;
                    continue;

                case "missing-links":
                    console.log(mPerson);
                    // if someone doesn't have "No Spouses" or "No Children" checked, or is
                    // missing one or more parents
                    if (
                        mPerson.LastNameAtBirth != "Private" &&
                        (mPerson.DataStatus.Spouse != "blank" ||
                            mPerson.NoChildren != 1 ||
                            mPerson.Father == 0 ||
                            mPerson.Mother == 0)
                    ) {
                        break;
                    }
                    continue; // else hide

                default:
                    break;
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

            const privacyLevel = +mPerson.Privacy;
            const privacyDetail = CC7.PRIVACY_LEVELS.get(privacyLevel);
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
                const mgrWtId = mPerson.Managers?.find((m) => m.Id == mPerson.Manager)?.Name || mPerson.Manager;
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

                let mAgeAtDeath = CC7.ageAtDeath(mPerson);
                let mAgeAtDeathNum = CC7.ageAtDeath(mPerson, false);

                if (mAgeAtDeath === false && mAgeAtDeath !== "0") {
                    mAgeAtDeath = "";
                }
                if (mAgeAtDeathNum < 0) {
                    mAgeAtDeath = 0;
                }
                if (mAgeAtDeathNum < 5 && (mAgeAtDeath != false || mAgeAtDeathNum === 0)) {
                    diedYoung = true;
                    diedVeryYoung = true;
                    diedYoungIcon = CC7.currentSettings["icons_options_veryYoung"];
                    diedYoungTitle = "Died before age 5";
                } else if (mAgeAtDeathNum < 16 && mAgeAtDeath != false) {
                    diedYoung = true;
                    diedYoungIcon = CC7.currentSettings["icons_options_young"];
                    diedYoungTitle = "Died before age 16";
                }

                ageAtDeathCell = "<td class='age-at-death'>" + mAgeAtDeath + "</td>";
                dAgeAtDeath = "data-age-at-death='" + mAgeAtDeathNum + "'";

                if (mPerson.Touched) {
                    touched =
                        "<td class='touched aDate'>" +
                        CC7.changesLink(
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
                            relNums[aR] = `<img class="${imgClass}" src="${CC7.imagePath(diedYoungIcon)}" />`;
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
                    `'><td ${
                        mPerson.hasBioIssues
                            ? "class='privBio bioIssue' title='Click to see Bio Check Report'"
                            : "class='privBio'"
                    }>` +
                    (privacyImg
                        ? "<img class='privacyImage' src='" + privacyImg + "' title='" + privacyTitle + "'>"
                        : "") +
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

        // Provide a way to examine the data record of a specific person
        $("img.privacyImage, .bioIssue")
            .off("click")
            .on("click", function (event) {
                event.stopImmediatePropagation();
                const id = $(this).closest("tr").attr("data-id");
                const p = window.people.get(+id);
                if (event.altKey) {
                    console.log(`${p.Name}, ${p.BirthNamePrivate}`, p);
                } else if (p.hasBioIssues) {
                    CC7.showBioCheckReport($(this));
                }
            });
        $("img.familyHome")
            .off("click")
            .on("click", function () {
                CC7.showFamilySheet($(this));
            });
        $("img.timelineButton")
            .off("click")
            .on("click", function (event) {
                CC7.showTimeline($(this));
            });

        aTable.find("th[id]").each(function () {
            CC7.sortByThis($(this));
        });
        CC7.addWideTableButton();
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
                    CC7.lanceView();
                } else if (curTableId == "peopleTable") {
                    drawPeopleTable();
                }
            });

        function drawPeopleTable() {
            const subset = $("#cc7Subset").val();
            const caption = CC7.tableCaption(window.rootId, $("#cc7Degree").val(), !CC7.ONE_DEGREE); // cc7Subset is disabled for single degrees
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
            CC7.addPeopleTable(caption + subsetWord);
        }

        $("#listViewButton")
            .off("click")
            .on("click", function () {
                $(".viewButton").removeClass("active");
                $(this).addClass("active");
                $("#peopleTable,#hierarchyView").hide();
                if ($("#lanceTable").length == 0 || !$("#lanceTable").hasClass($("#cc7Subset").val())) {
                    CC7.lanceView();
                } else {
                    $("#lanceTable").show().addClass("active");
                    $("#wideTableButton").hide();
                }
                $("#cc7Subset").show();
            });
        $("#hierarchyViewButton")
            .off("click")
            .on("click", function () {
                $(".viewButton").removeClass("active");
                $(this).addClass("active");
                $("#peopleTable,#lanceTable").hide().removeClass("active");
                if ($("#hierarchyView").length == 0) {
                    CC7.showShakingTree(function () {
                        // We only call hierarchyCC7 after a timeout in order to give the shaking tree
                        // animation a change to complete first
                        setTimeout(() => CC7.hierarchyCC7(), 10);
                    });
                    $("#wideTableButton").hide();
                } else {
                    $("#hierarchyView").show();
                }
                $("#cc7Subset").hide();
            });
        $("#tableViewButton")
            .off("click")
            .on("click", function () {
                $(".viewButton").removeClass("active");
                $(this).addClass("active");
                $("#hierarchyView,#lanceTable").hide().removeClass("active");
                $("#cc7Subset").show();
                if (!$("#peopleTable").hasClass($("#cc7Subset").val())) {
                    $("#peopleTable").show().addClass("active");
                    $("#wideTableButton").show();
                } else {
                    drawPeopleTable();
                }
            });

        CC7.hideShakingTree();

        CC7.addFiltersToPeopleTable();
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
                    CC7.cc7excelOut(CC7.EXCEL);
                });
        }
        if ($("#cc7csv").length == 0) {
            $(
                '<button id="cc7csv" title="Export a CSV file." class="small button" style="display: inline-block;">CSV</button>'
            ).insertAfter($("#loadButton"));
            $("#cc7csv")
                .off("click")
                .on("click", function () {
                    CC7.cc7excelOut(CC7.CSV);
                });
        }
        $("#lanceTable").removeClass("active");
        aTable.addClass("active");
        aTable.floatingScroll();
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
                if (CC7.currentSettings["biocheck_options_biocheckOn"]) {
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
                for (const privLevel of CC7.PRIVACY_LEVELS.keys()) {
                    const privacy = CC7.PRIVACY_LEVELS.get(privLevel);
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
                    filterInput.addEventListener("input", CC7.stripLtGt);
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
            input.addEventListener("input", CC7.filterListener);
        });
        $("#cc7PBFilter").off("select2:select").on("select2:select", CC7.filterListener);

        // Add Clear Filters button
        $("#clearTableFiltersButton").remove();
        const clearFiltersButton = document.createElement("button");
        clearFiltersButton.textContent = "X";
        clearFiltersButton.title = "Clear Filters";
        clearFiltersButton.id = "clearTableFiltersButton";
        //  clearFiltersButton.style.position = "absolute";
        clearFiltersButton.addEventListener("click", CC7.clearFilterClickListener);

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
        CC7.filterFunction();
        CC7.updateClearFiltersButtonVisibility();
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

    static updateClearFiltersButtonVisibility() {
        let anyFilterHasText = Array.from(document.querySelectorAll(".filter-input")).some(
            (input) => input.value.trim() !== ""
        );
        if ($("#cc7PBFilter").select2("data")[0].id != "all") anyFilterHasText = true;
        const clearFiltersButton = document.querySelector("#clearTableFiltersButton");
        clearFiltersButton.style.display = anyFilterHasText ? "inline-block" : "none";
    }

    static stripLtGt() {
        if (this.value == ">" || this.value == "<") {
            this.value = "";
        }
    }

    static filterListener() {
        CC7.filterFunction();
        CC7.updateClearFiltersButtonVisibility();
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
        const lanceTable = $(
            `<table id='lanceTable' class="${subset}">` +
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
            if (aPerson.Hide) continue;
            switch (subset) {
                case "above":
                    if (!aPerson.isAbove) continue;
                    break;

                case "below":
                    if (aPerson.isAbove) continue;
                    break;

                case "ancestors":
                    if (aPerson.isAncestor) break;
                    continue;

                case "descendants":
                    if (typeof aPerson.isAncestor != "undefined" && !aPerson.isAncestor) break;
                    continue;

                default:
                    break;
            }
            if (!aPerson.Missing) {
                CC7.addMissingBits(aPerson);
            }
            const theDegree = aPerson.Meta.Degrees;
            const aName = new PersonName(aPerson);
            const theName = CC7.formDisplayName(aPerson, aName);
            const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
            const theLNAB = theParts.get("LastNameAtBirth");
            const theFirstName = theParts.get("FirstName");

            if (CC7.isOK(theDegree) && theDegree <= CC7.MAX_DEGREE) {
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
        $("#peopleTable").removeClass("active");
        $("#lanceTable").addClass("active");
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
                        const theDegree = aMember.Meta.Degrees;
                        if (theDegree > aPerson.Meta.Degrees) {
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
                                    `${missingBit} data-lnab='${theLNAB}' data-degree='${aMember.Meta.Degrees}' ` +
                                    `data-name=\"${aMember.Name}\" data-first-name='${theFirstName}'>${aMember.Meta.Degrees}° ` +
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
            `<li data-lnab='${theLNAB}' data-id='${aPerson.Id}' data-degree='${aPerson.Meta.Degrees}' ` +
                `data-name=\"${aPerson.Name}\" data-first-name='${theFirstName}'>${aPerson.Meta.Degrees}° ` +
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
        $("#cc7Subset").hide();
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

    static async getDegreeAction(event) {
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
            $("#cancelLoad").show();
            CC7.cancelLoadController = new AbortController();
            CC7.clearDisplay();
            CC7.showShakingTree();
            $("#cc7Container").addClass("degreeView");
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
                CC7.hideShakingTree();
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
                    CC7.hideShakingTree();
                    return;
                }
                window.rootId = +resultByKeyAtD[wtId].Id;
                CC7.populateRelativeArrays();
                CC7.hideShakingTree();
                $("#degreesTable").remove();
                $("#cc7Container").append(
                    $("<table id='degreesTable'><tr><th>Degree</th></tr><tr><th>Connections</th></tr></table>")
                );
                CC7.buildDegreeTableData(degreeCounts, theDegree, theDegree);
                CC7.addPeopleTable(CC7.tableCaption(wtId, theDegree, CC7.ONE_DEGREE));
                $("#cc7Subset").prop("disabled", true);
            }
            $("#getPeopleButton").prop("disabled", false);
            $("#getDegreeButton").prop("disabled", false);
            $("#cancelLoad").hide();
            CC7.setInfoPanelMessage();
        }
    }

    // Not only get people at degree 'theDegree' from 'wtid', but also those at degree (theDegree - 1) and
    // (theDgree + 1), but flag the additional people as hidden. We get the extra degrees so that we can calculate
    // the relatives counts correctly for the theDegree people.
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
        if (status != "" && peopleData && peopleData.length > 0) {
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
            if (profiles.length < limit) break;

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
            if (sstatus != "") {
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
        // correctly.
        try {
            const result = await WikiTreeAPI.postToAPI(
                {
                    appId: CC7.APP_ID,
                    action: "getPeople",
                    keys: key,
                    nuclear: degree + 1,
                    minGeneration: degree - 1,
                    start: start,
                    limit: limit,
                    fields: CC7.currentSettings["biocheck_options_biocheckOn"]
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

                if (CC7.currentSettings["biocheck_options_biocheckOn"]) {
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
                        profileReportLines.push("Profile may be unsourced");
                    }
                    const invalidSources = biography.getInvalidSources();
                    const nrInvalidSources = invalidSources.length;
                    if (nrInvalidSources > 0) {
                        let msg = "Bio Check found sources that are not ";
                        if (isPre1700) {
                            msg += "reliable or ";
                        }
                        msg += "clearly identified: \u00A0\u00A0";
                        profileReportLines.push(msg);
                        for (const invalidSource of invalidSources) {
                            profileReportLines.push("\xa0\xa0\xa0" + invalidSource);
                        }
                    }
                    for (const sectMsg of biography.getSectionMessages()) {
                        profileReportLines.push(sectMsg);
                    }
                    for (const styleMsg of biography.getStyleMessages()) {
                        profileReportLines.push(styleMsg);
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
        $("#getPeopleButton").prop("disabled", true);
        $("#getDegreeButton").prop("disabled", true);
        $("#cancelLoad").show();
        CC7.cancelLoadController = new AbortController();
        CC7.showShakingTree();
        const wtId = wtViewRegistry.getCurrentWtId();
        const degreeCounts = {};
        const [resultByKey, isPartial, actualMaxDegree] = await CC7.makePagedCallAndAddPeople(
            wtId,
            maxWantedDegree,
            degreeCounts
        );
        if (resultByKey == "aborted") {
            wtViewRegistry.showWarning("Profile retrieval cancelled.");
            CC7.hideShakingTree();
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
            CC7.categoriseProfiles(root);

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
            CC7.buildDegreeTableData(degreeCounts, 1, window.cc7Degree);
            CC7.addPeopleTable(CC7.tableCaption(window.rootId, window.cc7Degree, !CC7.ONE_DEGREE));
        }
        $("#getPeopleButton").prop("disabled", false);
        $("#getDegreeButton").prop("disabled", false);
        $("#cancelLoad").hide();
        CC7.setInfoPanelMessage();
        CC7.firstTimeLoad = false;
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

    static async makePagedCallAndAddPeople(reqId, upToDegree, degreeCounts) {
        // We get one more degree than necessary to ensure we can calculate the relative counts
        // correctly.
        const upToDegreeToGet = upToDegree + 1;
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
            if (status != "" && peopleData && peopleData.length > 0) {
                isPartial = true;
            }
            const profiles = peopleData ? Object.values(peopleData) : [];
            if (profiles.length == 0) {
                const reason = keysResult[reqId]?.status || status;
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
            getMore = profiles.length == limit;
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
                    appId: CC7.APP_ID,
                    action: "getPeople",
                    keys: ids.join(","),
                    start: start,
                    limit: limit,
                    nuclear: depth,
                    fields: CC7.currentSettings["biocheck_options_biocheckOn"]
                        ? CC7.GET_PEOPLE_FIELDS + ",Bio"
                        : CC7.GET_PEOPLE_FIELDS,
                },
                CC7.cancelLoadController.signal
            );
            return [result[0]["status"], result[0]["resultByKey"], result[0]["people"]];
        } catch (error) {
            if (error.name !== "AbortError") {
                console.warn(`Could not retrieve relatives up to degree ${depth} for ${key}: ${error}`);
                return [`${error}`, [], []];
            } else {
                return ["aborted", [], []];
            }
        }
    }

    static categoriseProfiles(theRoot) {
        if (!theRoot) return;
        const ABOVE = true;
        const BELOW = false;
        const collator = new Intl.Collator();
        CC7.fixBirthDate(theRoot);
        theRoot.isAncestor = false;
        theRoot.isAbove = false;
        const descendantQ = [theRoot.Id];
        const belowQ = [theRoot.Id];
        const ancestorQ = [theRoot.Id];
        const aboveQ = [theRoot.Id];
        let firstIteration = true;
        while (belowQ.length > 0 || aboveQ.length > 0 || descendantQ.length > 0 || ancestorQ.length > 0) {
            // console.log("Queues", descendantQ, belowQ, ancestorQ, aboveQ);
            if (descendantQ.length > 0) {
                const pId = descendantQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add this persons children to the queue
                    const rels = CC7.getIdsOfRelatives(person, ["Child"]);
                    for (const relId of rels) {
                        const child = window.people.get(+relId);
                        if (child) {
                            // console.log(
                            //     `Adding child for ${person.Id} (${person.Name}): ${child.Id} (${child.Name}) ${child.BirthNamePrivate}`
                            // );
                            child.isAncestor = false;
                            descendantQ.push(relId);
                        }
                    }
                }
            }
            if (belowQ.length > 0) {
                const pId = belowQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    if (typeof person.fixedBirthDate === "undefined") {
                        CC7.fixBirthDate(person);
                    }
                    // Add this person's relatives to the queue
                    const rels = firstIteration
                        ? CC7.getIdsOfRelatives(person, ["Sibling", "Spouse", "Child"])
                        : CC7.getIdsOfRelatives(person, ["Parent", "Sibling", "Spouse", "Child"]);
                    // console.log(
                    //     `Inspecting below for ${person.Id} (${person.Name}) ${person.BirthNamePrivate}`,
                    //     belowQ,
                    //     rels
                    // );
                    for (const relId of rels) {
                        if (setAndShouldAdd(relId, BELOW)) {
                            if (!belowQ.includes(relId)) {
                                // const p = window.people.get(+relId);
                                // console.log(`Adding below: ${p.Id} (${p.Name}) ${p.BirthNamePrivate}`);
                                belowQ.push(relId);
                            }
                        }
                    }
                }
            }
            if (ancestorQ.length > 0) {
                const pId = ancestorQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    // Add this person's parents to the queue
                    const rels = CC7.getIdsOfRelatives(person, ["Parent"]);
                    // console.log(`Adding parents for ${person.Id} (${person.Name})`, rels);
                    for (const relId of rels) {
                        // Set ancestor relationship
                        const parent = window.people.get(+relId);
                        if (parent) {
                            // console.log(
                            //     `Adding parent for ${person.Id} (${person.Name}): ${parent.Id} (${parent.Name}) ${parent.BirthNamePrivate}`
                            // );
                            parent.isAncestor = true;
                            ancestorQ.push(relId);
                        }
                    }
                }
            }
            if (aboveQ.length > 0) {
                const pId = aboveQ.shift();
                const person = window.people.get(+pId);
                if (person) {
                    if (typeof person.fixedBirthDate === "undefined") {
                        CC7.fixBirthDate(person);
                    }
                    // Add this person's relatives to the queue
                    const rels = firstIteration
                        ? CC7.getIdsOfRelatives(person, ["Parent"])
                        : CC7.getIdsOfRelatives(person, ["Parent", "Sibling", "Spouse", "Child"]);
                    // console.log(
                    //     `Inspecting above for ${person.Id} (${person.Name}) ${person.BirthNamePrivate}`,
                    //     aboveQ,
                    //     rels
                    // );
                    for (const relId of rels) {
                        if (setAndShouldAdd(relId, ABOVE)) {
                            if (!aboveQ.includes(relId)) {
                                // const p = window.people.get(+relId);
                                // console.log(`Adding above: ${p.Id} (${p.Name}) ${p.BirthNamePrivate}`);
                                aboveQ.push(relId);
                            }
                        }
                    }
                }
            }
            firstIteration = false;
        }

        function setAndShouldAdd(pId, where) {
            const p = window.people.get(+pId);
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

    static fixBirthDate(person) {
        let birthDate = CC7.ymdFix(person.BirthDate);
        if (birthDate == "" && person.BirthDateDecade) {
            birthDate = person.BirthDateDecade || "";
        }
        person.fixedBirthDate = birthDate;
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
        // Remove the filter event listeners
        document
            .querySelector("#peopleTable")
            ?.querySelectorAll(".filter-input")
            .forEach((input, inputIndex) => {
                input.removeEventListener("input", CC7.stripLtGt);
                input.removeEventListener("input", CC7.filterListener);
                input.removeEventListener("click", CC7.clearFilterClickListener);
            });
        $("#cc7PBFilter").off("select2:select");

        $(
            [
                "#degreesTable",
                "#hierarchyView",
                "#lanceTable",
                "#peopleTable",
                "#tooBig",
                ".viewButton",
                "#wideTableButton",
                "#clearTableFiltersButton",
                "#cc7Subset",
            ].join(",")
        ).remove();
    }

    static handleFileDownload() {
        try {
            CC7.collapsePeople();
            const fileName = CC7.makeFilename();
            CC7.downloadArray([[window.rootId, window.cc7Degree], ...window.people.entries()], fileName);
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

        const reader = new FileReader();
        reader.onload = async function (e) {
            const contents = e.target.result;
            try {
                let oldFormat = false;
                const peeps = JSON.parse(contents);
                const [r, x] = peeps.shift();
                [window.people, oldFormat] = CC7.expandPeople(new Map(peeps));
                window.rootId = r;
                window.cc7Degree = Number.isFinite(x) ? (window.cc7Degree = x) : 0;
                if (oldFormat) {
                    wtViewRegistry.showNotice(
                        "This file is still in an old format. It is recommended that you regenerate it " +
                            "after reloading profiles from WikiTree."
                    );
                }
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
                if (degreeCounts[aPerson.Meta.Degrees]) {
                    degreeCounts[aPerson.Meta.Degrees] = degreeCounts[aPerson.Meta.Degrees] + 1;
                } else {
                    degreeCounts[aPerson.Meta.Degrees] = 1;
                }
                if (aPerson.Meta.Degrees > maxDegree) {
                    maxDegree = aPerson.Meta.Degrees;
                }
            }
            if (window.cc7Degree == 0) window.cc7Degree = maxDegree;
            const theDegree = Math.min(window.cc7Degree, CC7.MAX_DEGREE);
            CC7.hideShakingTree();
            CC7.addPeopleTable(CC7.tableCaption(window.rootId, theDegree, !CC7.ONE_DEGREE));
            $("#cc7Container #cc7Subset").before(
                $(
                    "<table id='degreesTable'><tr><th>Degrees</th></tr><tr><th>Connections</th></tr><tr><th>Total</th></tr></table>"
                )
            );
            CC7.buildDegreeTableData(degreeCounts, 1, theDegree);
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

    static buildDegreeTableData(degreeCounts, fromDegree, toDegree) {
        function addTableCol(i, degreeSum) {
            $("#degreesTable tr")
                .eq(0)
                .append($(`<td>${i}</td>`));
            $("#degreesTable tr")
                .eq(1)
                .append($(`<td>${degreeCounts[i]}</td>`));
            if (fromDegree == 1) {
                $("#degreesTable tr")
                    .eq(2)
                    .append($(`<td>${degreeSum}</td>`));
            }
        }
        let degreeSum = 0;
        for (let i = fromDegree; i <= toDegree; ++i) {
            degreeSum = degreeSum + degreeCounts[i];
            addTableCol(i, degreeSum);
        }
        if (degreeCounts[-1]) {
            degreeSum = degreeSum + degreeCounts[-1];
            addTableCol(-1, degreeSum);
        }
    }

    static cc7excelOut(fileType) {
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
            "Manager",
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
                row.data("manager"),
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

        const wbout = XLSX.write(wb, { bookType: fileType, type: "binary" });
        saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), CC7.makeFilename() + "." + fileType);
    }

    static getCookie(name) {
        return WikiTreeAPI.cookie(name) || null;
    }

    static setCookie(name, value, options) {
        return WikiTreeAPI.cookie(name, value, options);
    }
}
