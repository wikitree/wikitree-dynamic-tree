/*
 * AhnentafelView
 *
 * Extend the base View class from the WikiTree Dynamic Tree.
 */

let incrementingNumber = 1;

window.AhnentafelView = class AhnentafelView extends View {
    static APP_ID = "Ahnentafel";

    meta() {
        return {
            title: "Ahnentafel Ancestor List",

            // Note that we have some placeholder "#replaceme" text here. This gets filled with links and text built from the starting
            // profile data, after that data is loaded.
            description: `This basic ancestor view uses the <a href="http://en.wikipedia.org/wiki/Ahnentafel" target="_Help">ahnen numbering system</a>.
            See the <a id="familyListLink" href="#replaceme">Family List</a> for more generations and flexibility, the <a id="compactTreeLink" href="#replaceme">Compact Family Tree</a> for an alternative view with the numbers, or
            <a id="toolsLink" href="#replaceme">#replaceme</a> for a conventional pedigree chart and links to other views.`,

            docs: "",
        };
    }

    init(container_selector, person_id) {
        this.close();
        $("#view-container").css("min-height", "0").addClass("ahnentafelView");
        let ahnen = new AhnentafelAncestorList(container_selector, person_id);
        ahnen.clearData(); // Clear existing data
        ahnen.displayAncestorList();
    }

    close() {
        $("#moreGenerationsButton").off("click").remove();
        $("header #ahnentafelHeaderBox").remove();
        $("#ahnentafelOptions").remove();
        $("#view-container").css({ "min-height": "", "overflow": "" });
        $("#view-container").removeClass("ahnentafelView");
        $(document).off("keydown.AhnentafelView");
        $("#view-container").off();
    }
};

/*
 * AhnentafelAncestorList
 * Display a list of ancestors using the ahnen numbering system.
 */
window.AhnentafelAncestorList = class AhnentafelAncestorList {
    static WANTED_NAME_PARTS = [
        "Prefix",
        "FirstNames",
        "PreferredName",
        "Nicknames",
        "LastNameAtBirth",
        "LastNameCurrent",
        "Suffix",
        "LastNameOther",
    ];

    static REPORT_LIMITS = {
        batchSize: 50,
        batchDelayMs: 100,
        perBioChars: 150000,
        totalChars: 10000000, // Increased to 10MB
    };

    static REPORT_FIELDS = [
        "Id",
        "Name",
        "FirstName",
        "LastNameAtBirth",
        "LastNameCurrent",
        "MiddleName",
        "RealName",
        "Nicknames",
        "Suffix",
        "BirthDate",
        "DeathDate",
        "BirthLocation",
        "DeathLocation",
        "Gender",
        "DataStatus",
        "Privacy",
        "Father",
        "Mother",
        "Photo",
        "PhotoData",
        "Spouses",
        "Bio",
        "bioHTML",
    ];

    static makeVisible(targetElement) {
        // Check and reveal the target person if hidden
        if (targetElement.is(":hidden")) {
            targetElement.slideDown();
        }

        // Check and reveal the generation of the target person if hidden
        const generationContainer = targetElement.closest(".generationContainer");
        if (generationContainer.is(":hidden")) {
            generationContainer.slideDown();
            generationContainer.prev("h2").find(".toggleButton").removeClass("collapsed");
        }
    }

    constructor(selector, startId) {
        this.changeStack = []; // Initialize the change stack
        this.currentStackIndex = -1; // Current position in the stack
        this.settings = this.loadSettings();
        this.displayedIds = new Set(); // A global set to track displayed individuals
        this.startId = startId;
        this.selector = selector;
        this.ahnentafelNumber = 1;
        this.generation = 1;
        this.maxGeneration = 10;

        const sharedFormatId = window.DateFormatOptions ? window.DateFormatOptions.getStoredFormatId() : null;
        this.dateFormat = window.DateFormatOptions
            ? window.DateFormatOptions.getFormatValue(sharedFormatId, "wtDate") || "D MMM YYYY"
            : "D MMM YYYY";
        this.dateStatusFormat = window.DateFormatOptions
            ? window.DateFormatOptions.getStoredStatusFormat()
            : "abbreviations";

        this.monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        this.blankPerson = { Id: 0, FirstName: "Unknown" };
        this.profileFields =
            "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,MiddleName,RealName,Nicknames,Suffix,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,DataStatus,Privacy,Father,Mother,Derived.BirthName,Derived.BirthNamePrivate,Photo,PhotoData";
        this.profileFieldsArray = this.profileFields.split(",");
        this.ancestors = [];

        this.reportState = {
            running: false,
            cancel: false,
            total: 0,
            done: 0,
            skipped: 0,
            errors: 0,
            bytes: 0,
            currentGeneration: 0,
            reportNumberMap: new Map(),
            lastReportNumber: 0,
        };
        window.ahnentafelReportCache = window.ahnentafelReportCache || {};

        // Add event listeners to highlight connected ancestors when the "Father of X" type links are hovered.
        $(this.selector).on("mouseover", ".parentOf,.childOf", function (e) {
            const id = $(this).data("id");
            $(`#person_${id}`).addClass("highlighted");
        });
        $(this.selector).on("mouseout", ".parentOf,.childOf", function (e) {
            const id = $(this).data("id");
            $(`#person_${id}`).removeClass("highlighted");
        });
        // Open the profile in a new window when the name is clicked.
        $(this.selector).on("click", ".profileLink", function (e) {
            e.preventDefault();
            window.open($(this).attr("href"), "_blank");
        });
        $(this.selector).on("click", ".ahnentafelLink,.parentOf,.childOf", function (e) {
            e.preventDefault();
            $(".highlightedClick").removeClass("highlightedClick");
            const ahnentafelNumber = $(this).data("ahnentafel-number");
            let targetElement;
            if (!ahnentafelNumber) {
                targetElement = $(`#person_${$(this).data("id")}`);
            } else {
                targetElement = $(`div[data-ahnentafel-number="${ahnentafelNumber}"]`);
            }
            targetElement.addClass("highlightedClick");

            // Ensure the target person and their generation are visible
            AhnentafelAncestorList.makeVisible(targetElement);

            if (targetElement.length) {
                $("html, body").animate(
                    {
                        scrollTop: targetElement.offset().top - 50,
                    },
                    700
                );
            }
        });
        $(this.selector).on("click", ".descendantButton", (e) => {
            // Toggle active class on the clicked button
            const clickedButton = $(e.target);
            const isActive = clickedButton.hasClass("active");
            $(".active").removeClass("active");
            $(".highlightedClick").removeClass("highlightedClick");

            if (isActive) {
                $(".ahnentafelPerson, .ahnentafelPersonShort").show();
                this.navigateChange(-1); // Undo the last change
            } else {
                $(".generationContainer").show();
                $(".toggleButton").removeClass("collapsed");
                const ahnentafelNumber = clickedButton.data("ahnentafel");
                clickedButton.addClass("active");
                clickedButton.parent().addClass("highlightedClick");
                this.showDescendantsAndAncestorsOnly(ahnentafelNumber);
            }
        });
        this.headerBox = $(`<div id="ahnentafelHeaderBox"><span id="help-button" title="About this">?</span></div>`);
        this.helpText = $(`
        <div id="ahnentafelHelpText">
            <h2>About Ahnentafel Ancestor List</h2>
            <x>×</x>
            <ul>
                <li><strong>Highlight Connections</strong>: Hover over links to highlight ancestors.</li>
                <li><strong>Descendant & Ancestor Focus</strong>: Click ↕ next to names to focus on direct lines. Click again to reveal hidden people.</li>
                <li><strong>Undo / Redo</strong>: After clicking buttons, you can use the buttons at the top to return to a previous state. You can also use Ctrl + Shift + Arrow (Opt + Shift + Arrow on Mac) for this.</li>
                <li><strong>Expand/Collapse Generations</strong>: Use ▼ to manage generations' visibility. The top-left master toggle button
                 toggles all generations.</li>
                <li><strong>Additional Generations</strong>: Add more generations by selecting a number (1-5)
                in the box and clicking the 'More Genreation(s)' button.</li>
                <li><strong>Customizable View</strong>: Click the 'Format' button to cycle through four layout options for the birth and death details.</li>
                <li><strong>Profile Links</strong>: Click an underlined link to go the WikiTree profile page for that person.</li>
                <li><strong>In-app Links</strong>: Click on a non-underlined link to go to the person in the list.</li>
                <li><strong>Duplicates</strong>: Each generation shows the number of duplicates in each generation as "Num1 (Num2) duplicates".
                    <ul>
                        <li><strong>"Num1"</strong> shows the number of entries in the Ahnentafel that are additional appearances of an ancestor who has previously appeared on the list.</li>
                        <li><strong>"Num2"</strong> shows the number of slots in each generation filled by individuals with more than one entry in the Ahnentafel.</li>
                    </ul>
                </li>
            </ul>
        </div>
    `);
    }

    addHelpText() {
        if ($("#ahnentafelHelpText").length === 0) {
            $("#view-container").append(this.helpText);
            $("#ahnentafelHelpText").draggable();
            $("#help-button").on("click", () => {
                $("#ahnentafelHelpText").slideToggle();
            });
            $("#ahnentafelHelpText x").on("click", () => {
                $("#ahnentafelHelpText").slideUp();
            });
            $("#ahnentafelHelpText").on("dblclick", () => {
                $("#ahnentafelHelpText").slideUp();
            });
            // Event listener for the Escape key
            $(document).on("keydown", (e) => {
                if (e.key === "Escape") {
                    $("#ahnentafelHelpText").slideUp();
                }
            });
        }
    }

    clearData() {
        this.ancestors = [];
        this.displayedIds.clear();
        $(this.selector).empty(); // Clears the HTML content
    }

    // Inside the AhnentafelAncestorList class

    addMoreGenerationsButton() {
        if ($("#moreGenerationsButton").length === 0) {
            let container = $("<div>", { class: "more-generations-container" });
            let numberInput = $("<input>", {
                id: "generationsToAdd",
                type: "number",
                min: 1,
                max: 5,
                value: 1,
            });
            let moreGenerationsButton = $("<button>", {
                id: "moreGenerationsButton",
                text: "1 More Generation",
                class: "small",
            }).on("click", () => {
                const generationsToAdd = parseInt(numberInput.val());
                this.maxGeneration += generationsToAdd;
                this.loadMoreGenerations(generationsToAdd);
                moreGenerationsButton.text(
                    generationsToAdd === 1 ? `1 More Generation` : `${generationsToAdd} More Generations`
                );
            });

            container.append(numberInput, moreGenerationsButton);
            numberInput.on("change", () => {
                let generationsToAdd = parseInt(numberInput.val());
                if (generationsToAdd < 1) {
                    generationsToAdd = 1;
                } else if (generationsToAdd > 5) {
                    generationsToAdd = 5;
                }
                numberInput.val(generationsToAdd);
                moreGenerationsButton.text(
                    generationsToAdd === 1 ? `1 More Generation` : `${generationsToAdd} More Generations`
                );
            });
            $("#ahnentafelHeaderBox #help-button").before(container);
        }
    }

    assignGenerationAndAhnentafel(person, generation, ahnentafelNumber, processedAncestors = new Set()) {
        const lineageKey = `${person.Id}-${generation}`;

        // Check if the person has already been processed for this lineage
        if (processedAncestors.has(lineageKey)) {
            return;
        }
        processedAncestors.add(lineageKey);

        // Assign generation and Ahnentafel number
        if (!person.Generation.includes(generation)) {
            person.Generation.push(generation);
        }
        if (!person.AhnentafelNumber.includes(ahnentafelNumber)) {
            person.AhnentafelNumber.push(ahnentafelNumber);
        }

        // Recursively process parents with correct Ahnentafel numbers, considering the maxGeneration limit
        if (generation < this.maxGeneration) {
            if (person.Father) {
                const father = this.ancestors.find((p) => p.Id === person.Father);
                if (father) {
                    this.assignGenerationAndAhnentafel(
                        father,
                        generation + 1,
                        ahnentafelNumber * 2,
                        new Set(processedAncestors)
                    );
                }
            }
            if (person.Mother) {
                const mother = this.ancestors.find((p) => p.Id === person.Mother);
                if (mother) {
                    this.assignGenerationAndAhnentafel(
                        mother,
                        generation + 1,
                        ahnentafelNumber * 2 + 1,
                        new Set(processedAncestors)
                    );
                }
            }
        }
    }

    // Helper method to process a parent
    processParent(parentId, generation, ahnentafelNumber, processedAncestors) {
        if (parentId) {
            const parent = this.ancestors.find((p) => p.Id === parentId);
            if (parent) {
                this.assignGenerationAndAhnentafel(parent, generation + 1, ahnentafelNumber, processedAncestors);
            }
        }
    }

    processAdditionalAncestors(newAncestors) {
        newAncestors.forEach((newAncestor, index) => {
            if (!this.ancestors.some((a) => a.Id === newAncestor.Id)) {
                let child = this.ancestors.find((c) => c.Father === newAncestor.Id || c.Mother === newAncestor.Id);
                if (child) {
                    let childAhnentafelNumbers = child.AhnentafelNumber;
                    let newAhnentafelNumbers = childAhnentafelNumbers.map((n) =>
                        child.Father === newAncestor.Id ? n * 2 : n * 2 + 1
                    );
                    let generation = Math.floor(Math.log2(Math.min(...newAhnentafelNumbers))) + 1;

                    newAncestor.Generation = [generation];
                    newAncestor.AhnentafelNumber = newAhnentafelNumbers;
                    this.ancestors.push(newAncestor);
                } else {
                    console.log(`No child found for new ancestor ID ${newAncestor.Id}`);
                }
            } else {
                console.log(`Ancestor ID ${newAncestor.Id} already exists in the list`);
            }
        });

        this.refreshAncestorList();
    }

    // Add debugging to track the refresh process
    refreshAncestorList() {
        if (this.settings.reportMode) {
            $("#ahnentafelAncestorList").hide();
            $("#ahnentafelReportWrapper").removeClass("hidden");
            if ($("#ahnentafelReport").is(":empty")) {
                this.startReportBuild();
            }
        } else {
            $("#ahnentafelAncestorList").show();
            $("#ahnentafelReportWrapper").addClass("hidden");
            this.displayedIds = new Set();
            $(this.selector).html(`<div id="ahnentafelAncestorList"></div>`);
            this.displayGeneration(1);
        }
    }

    generationTitle(generation) {
        let title;
        switch (generation) {
            case 1:
                title = "";
                break;
            case 2:
                title = "Parents";
                break;
            case 3:
                title = "Grandparents";
                break;
            default:
                let greatsCount = generation - 3;
                let greatsLabel = greatsCount === 1 ? "Great" : `${greatsCount}x Great`;
                title = `${greatsLabel}-Grandparents`;
                break;
        }

        // Convert to lowercase if required
        return title;
    }

    getOrdinalSuffix(number) {
        let j = number % 10,
            k = number % 100;
        if (j == 1 && k != 11) {
            return "st";
        }
        if (j == 2 && k != 12) {
            return "nd";
        }
        if (j == 3 && k != 13) {
            return "rd";
        }
        return "th";
    }

    unknownName(generation, ahnentafelNumber) {
        if (generation == 1) {
            return "Self";
        } else if (generation == 2) {
            return ahnentafelNumber % 2 == 0 ? "Father" : "Mother";
        } else {
            let prefix = ahnentafelNumber % 2 == 0 ? "Grandfather" : "Grandmother";
            return "Great-".repeat(generation - 3) + prefix;
        }
    }

    async displayAncestorList() {
        wtViewRegistry.showNotice(`Building the ancestor list to ${this.maxGeneration} generations...`);

        let data = await WikiTreeAPI.postToAPI({
            appId: AhnentafelView.APP_ID,
            action: "getPerson",
            key: this.startId,
            fields: this.profileFields,
        });

        if (data.length != 1) {
            wtViewRegistry.showError(`There was an error starting with ${this.startId}.`);
            return;
        }

        // Yay, we have a valid starting person.
        // If the profile is private and the viewing user is not on the Trusted List, we still might not be able to continue.
        let p = data[0].person;
        if (!p?.Name) {
            let err = `The starting profile data could not be retrieved.`;
            if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                err += ` You may need to be added to the starting profile's Trusted List.`;
            } else {
                err += ` Is it a private profile?`;
            }
            wtViewRegistry.showError(err);
            wtViewRegistry.hideInfoPanel();
            return;
        }

        // Fill in some custom links in the "description" with completed values.
        let x = p.Name.split("-");
        let count = x[x.length - 1];
        $("#familyListLink").attr("href", `https://www.wikitree.com/index.php?title=Special:FamilyList&p=${p.Id}`);
        $("#compactTreeLink").attr("href", `https://www.wikitree.com/treewidget/${p.Name}`);
        $("#toolsLink").attr("href", `https://www.wikitree.com/genealogy/${p.LastNameAtBirth}-Family-Tree-${count}`);
        $("#toolsLink").html(`${p.RealName}'s Tree &amp; Tools page`);

        // Display our "info" panel with a description of this view.
        wtViewRegistry.showInfoPanel();

        // Now clear out our tree view and start filling it recursively with generations.
        $(this.selector).html(`<div id="ahnentafelAncestorList"></div>`);

        try {
            this.ancestors = [];
            const limit = 1000;
            let start = 0;
            let theresMore = true;
            while (theresMore) {
                let ancestorData = await WikiTreeAPI.getPeople(AhnentafelView.APP_ID, p.Id, this.profileFieldsArray, {
                    ancestors: this.maxGeneration,
                    start: start,
                    limit: limit,
                });
                if (!ancestorData && this.ancestors.length == 0) {
                    wtViewRegistry.showError(`Error: No ancestors found for ${p.Name}`);
                    return;
                }
                this.ancestors = this.ancestors.concat(this.processReceivedAncestors(ancestorData));
                theresMore = ancestorData[0]?.startsWith("Maximum number of profiles");
                start += limit;
            }

            // Start with the root person
            const rootPerson = this.ancestors.find((person) => person.Id === p.Id);
            this.assignGenerationAndAhnentafel(rootPerson, 1, 1);
            this.displayGeneration(1);

            // Remove the notice once the list is built
            wtViewRegistry.clearStatus();

            this.afterLoading();
        } catch (err) {
            wtViewRegistry.showError(`Error: ${err}`);
            return;
        }
    }

    addHeaderBox() {
        if ($("#ahnentafelHeaderBox").length === 0) {
            $("header").append(this.headerBox);
        }
    }

    addAccessKeys() {
        $(document)
            .off("keydown.AhnentafelView")
            .on("keydown.AhnentafelView", function (event) {
                // Check if the user is on a Mac
                const isMac = /Mac|iPod|iPhone|iPad/.test(window.navigator.userAgent);

                // Define the key combinations for previous and next actions
                const isPrevShortcut =
                    (isMac ? event.altKey : event.ctrlKey) && event.shiftKey && event.key === "ArrowLeft";
                const isNextShortcut =
                    (isMac ? event.altKey : event.ctrlKey) && event.shiftKey && event.key === "ArrowRight";

                // Trigger the respective button click based on the key combination
                if (isPrevShortcut) {
                    $("#prevChange").trigger("click");
                } else if (isNextShortcut) {
                    $("#nextChange").trigger("click");
                }
            });
    }

    afterLoading() {
        this.addHeaderBox();
        this.addViewSwitcher();
        this.renderOptions();
        this.addMoreGenerationsButton();
        this.addToggleButtons();
        this.applySettings();
        //this.addTidyCheckbox();
        this.addFormatButton();
        // this.showFillRates();
        this.setupNavigationButtons(); // Setup navigation buttons
        this.trackChanges(); // Start tracking changes
        this.captureState(); // Capture the initial state
        this.addAccessKeys(); // Add access keys
        this.updateReportGenerationSelect(true);
        this.applyViewMode(this.settings.reportMode);
    }

    renderOptions(container = document.getElementById("ahnentafelAncestorList")) {
        if (!container) return;

        const existing = document.getElementById("ahnentafelOptions");
        if (existing) existing.remove();

        const optionsContainer = document.createElement("div");
        optionsContainer.id = "ahnentafelOptions";
        optionsContainer.className = "familyViewOptions";

        const selectedFormatId = window.DateFormatOptions ? window.DateFormatOptions.getStoredFormatId() : null;
        const selectedStatusId = window.DateFormatOptions
            ? window.DateFormatOptions.getStoredStatusFormat()
            : this.dateStatusFormat;

        if (window.DateFormatOptions) {
            window.DateFormatOptions.setStoredFormatId(selectedFormatId);
            window.DateFormatOptions.setStoredStatusFormat(selectedStatusId);
        }

        const dateOptionsHtml = window.DateFormatOptions
            ? window.DateFormatOptions.buildFormatOptionsHtml(selectedFormatId)
            : "";
        const statusOptionsHtml = window.DateFormatOptions
            ? window.DateFormatOptions.buildStatusOptionsHtml(selectedStatusId)
            : "";

        optionsContainer.innerHTML = `
            <span class="printer-option"><label for="ahnentafelDateFormat">Date Format:</label>
                <select id="ahnentafelDateFormat">
                    ${dateOptionsHtml}
                </select>
            </span>
            <span class="printer-option"><label for="ahnentafelDateStatus">Date Status:</label>
                <select id="ahnentafelDateStatus">
                    ${statusOptionsHtml}
                </select>
            </span>
            <span class="printer-option"><label><input type="checkbox" id="ahnentafelShowWtId" ${
                this.settings.showWtId ? "checked" : ""
            }> WikiTree IDs</label></span>
            <span class="printer-option"><label><input type="checkbox" id="ahnentafelShowGenderColors" ${
                this.settings.showGenderColors ? "checked" : ""
            }> Gender colors</label></span>
        `;

        container.parentNode.insertBefore(optionsContainer, container);

        // Report Wrapper
        let $reportWrapper = $("#ahnentafelReportWrapper");
        if ($reportWrapper.length === 0) {
            $reportWrapper = $(
                `<div id='ahnentafelReportWrapper' class='hidden'><div id='ahnentafelReportStatus'></div><div id='ahnentafelReport'></div></div>`
            );
            $reportWrapper.insertAfter(optionsContainer);
        }

        $("#ahnentafelDateFormat").on("change", (e) => {
            const selectedId = e.target.value;
            if (window.DateFormatOptions) {
                this.dateFormat = window.DateFormatOptions.getFormatValue(selectedId, "wtDate") || this.dateFormat;
                window.DateFormatOptions.setStoredFormatId(selectedId);
            }
            if (this.settings.reportMode) {
                this.updateReportDisplay();
            } else {
                this.reformatAll();
            }
        });

        $("#ahnentafelDateStatus").on("change", (e) => {
            this.dateStatusFormat = e.target.value;
            if (window.DateFormatOptions) {
                window.DateFormatOptions.setStoredStatusFormat(this.dateStatusFormat);
            }
            if (this.settings.reportMode) {
                this.updateReportDisplay();
            } else {
                this.reformatAll();
            }
        });

        $("#ahnentafelShowWtId").on("change", (e) => {
            this.settings.showWtId = e.target.checked;
            this.saveSettings();
            this.applySettings();
            if (this.settings.reportMode) {
                this.updateReportDisplay();
            }
        });

        $("#ahnentafelShowGenderColors").on("change", (e) => {
            this.settings.showGenderColors = e.target.checked;
            this.saveSettings();
            this.applySettings();
        });
    }

    addViewSwitcher() {
        if ($("#viewSwitcher").length === 0) {
            const switcherHTML = `
                <span id="viewSwitcher" class="ahn-header-controls">
                    <button class='small ${!this.settings.reportMode ? "active" : ""}' id='viewList' title="Switch to List View">List View</button>
                    <button class='small ${this.settings.reportMode ? "active" : ""}' id='viewReport' title="Switch to Report View">Report View</button>
                </span>`;
            $("#ahnentafelHeaderBox #help-button").before(switcherHTML);

            $("#viewList").on("click", (e) => {
                e.preventDefault();
                this.applyViewMode(false);
            });

            $("#viewReport").on("click", (e) => {
                e.preventDefault();
                this.applyViewMode(true);
            });
        }
    }

    applyViewMode(isReportMode) {
        this.settings.reportMode = isReportMode;
        this.saveSettings();

        if (isReportMode) {
            $("#viewReport").addClass("active");
            $("#viewList").removeClass("active");
            $("#ahnentafelOptions").show();
            $("#ahnentafelAncestorList").hide();
            $("#ahnentafelReportWrapper").removeClass("hidden");
            $("body").addClass("report-mode");
            $(".more-generations-container").show();
            $("#formatButton").hide();

            if ($("#ahnentafelReport").is(":empty")) {
                this.startReportBuild();
            }
        } else {
            $("#viewList").addClass("active");
            $("#viewReport").removeClass("active");
            $("#ahnentafelOptions").show();
            $("#ahnentafelAncestorList").show();
            $("#ahnentafelReportWrapper").addClass("hidden");
            $("body").removeClass("report-mode");
            $(".more-generations-container").show();
            $("#formatButton").show();
        }

        this.applySettings();
    }

    updateReportGenerationSelect(selectMax = false) {
        const $reportGenSelect = $("#reportGenerationSelect");
        if ($reportGenSelect.length === 0) return;

        const currentValue = parseInt($reportGenSelect.val(), 10);
        $reportGenSelect.empty();
        for (let i = 1; i <= this.maxGeneration; i++) {
            $reportGenSelect.append(`<option value="${i}">${i} Generation${i === 1 ? "" : "s"}</option>`);
        }

        let nextValue = currentValue;
        if (selectMax || Number.isNaN(currentValue) || currentValue > this.maxGeneration) {
            nextValue = this.maxGeneration;
        }
        $reportGenSelect.val(String(nextValue));
    }

    processReceivedAncestors(ancestorData) {
        let ancestors = [];
        if (ancestorData && ancestorData[2] && typeof ancestorData[2] === "object") {
            // Process each ancestor in ancestorData[2]
            ancestors = Object.keys(ancestorData[2]).map((key) => {
                const ancestor = ancestorData[2][key];

                // Initialize properties for each ancestor
                ancestor.Generation = [];
                ancestor.AhnentafelNumber = [];

                return ancestor;
            });
        } else {
            console.error("Invalid ancestor data format", ancestorData);
        }
        return ancestors;
    }

    isValidAncestor(ancestor) {
        return (
            typeof ancestor === "object" &&
            ancestor !== null &&
            typeof ancestor.Id !== "undefined" &&
            ancestor.Id !== null
        );
    }

    initializeAncestor(ancestor) {
        ancestor.Generation = [];
        ancestor.AhnentafelNumber = [];
        return ancestor;
    }

    createIdGroupsForApiCall(ancestors, generationsToAdd) {
        let idGroups = [];
        let currentGroup = [];
        let maxResultsPerCall = 1000; // Fixed maximum
        let maxAncestorsPerCall = Math.min(100, Math.floor(maxResultsPerCall / Math.pow(2, generationsToAdd)));

        for (let ancestor of ancestors) {
            if (currentGroup.length < maxAncestorsPerCall) {
                currentGroup.push(ancestor.Id);
            } else {
                idGroups.push(currentGroup);
                currentGroup = [ancestor.Id];
            }
        }
        if (currentGroup.length > 0) {
            idGroups.push(currentGroup);
        }

        return idGroups;
    }

    async loadMoreGenerations(generationsToAdd) {
        wtViewRegistry.showNotice(`Loading more generations...`);
        this.displayedIds = new Set();
        const previousMaxGeneration = this.maxGeneration - generationsToAdd;

        // Add progress bar to a specific container (e.g., "#myContainer")
        this.addProgressBar("#myContainer");

        // Fetch new ancestors and add to this.ancestors, checking for duplicates
        let completedCalls = 0;
        let idGroups = this.createIdGroupsForApiCall(this.ancestors, generationsToAdd);
        let totalCalls = idGroups.length;

        for (let group of idGroups) {
            let ids = group.join(",");
            const limit = 1000;
            let start = 0;
            let theresMore = true;
            while (theresMore) {
                let additionalData = await WikiTreeAPI.getPeople(AhnentafelView.APP_ID, ids, this.profileFieldsArray, {
                    ancestors: generationsToAdd,
                    start: start,
                    limit: limit,
                });

                if (additionalData[2]) {
                    Object.values(additionalData[2]).forEach((newAncestor) => {
                        let existingAncestor = this.ancestors.find((a) => a.Id === newAncestor.Id);
                        if (!existingAncestor) {
                            this.initializeAncestor(newAncestor);
                            this.ancestors.push(newAncestor);
                        } else {
                            // Update existing ancestor's data
                            // This ensures that any new information from additionalData is integrated
                            for (let key in newAncestor) {
                                if (newAncestor.hasOwnProperty(key)) {
                                    existingAncestor[key] = newAncestor[key];
                                }
                            }
                        }
                    });
                }
                theresMore = additionalData[0]?.startsWith("Maximum number of profiles");
                start += limit;
            }
            completedCalls++;
            this.updateProgressBar(completedCalls, totalCalls);
        }

        // Reassign Ahnentafel numbers and generations to all ancestors
        const rootPerson = this.ancestors.find((person) => person.Id === this.startId);
        if (rootPerson) {
            this.assignGenerationAndAhnentafel(rootPerson, 1, 1, new Set());
        }

        wtViewRegistry.clearStatus();
        this.refreshAncestorList();
        this.addToggleButtons();
        const reportGenSelectValue = parseInt($("#reportGenerationSelect").val(), 10);
        const shouldSelectMax = reportGenSelectValue === previousMaxGeneration || Number.isNaN(reportGenSelectValue);
        this.updateReportGenerationSelect(shouldSelectMax);
        if (this.settings.reportMode) {
            this.startReportBuild();
        }
        this.applySettings();
        //this.showFillRates();
    }

    checkDataConsistency() {
        this.ancestors.forEach((p) => {
            if (p.Generation.length === 0 || p.AhnentafelNumber.length === 0) {
                console.error(`Inconsistency found in ancestor ID ${p.Id}`);
                // Implement logic to fix the inconsistency, if possible
            }
        });
    }

    processNewAncestors(newAncestors, generation) {
        newAncestors.forEach((newAncestor) => {
            const uniqueId = `${newAncestor.Id}-${generation}`;
            if (!this.ancestors.some((a) => `${a.Id}-${a.Generation}` === uniqueId)) {
                let child = this.ancestors.find((c) => c.Father === newAncestor.Id || c.Mother === newAncestor.Id);
                if (child) {
                    let childAhnentafelNumbers = child.AhnentafelNumber;
                    let newAhnentafelNumbers = childAhnentafelNumbers.map((n) =>
                        child.Father === newAncestor.Id ? n * 2 : n * 2 + 1
                    );

                    newAncestor.Generation = [generation];
                    newAncestor.AhnentafelNumber = newAhnentafelNumbers;

                    this.ancestors.push(newAncestor);
                }
            }
        });

        this.refreshAncestorList();
    }

    displayGeneration(generationNumber) {
        const startAhnentafel = Math.pow(2, generationNumber - 1);
        const endAhnentafel = Math.pow(2, generationNumber) - 1;
        const totalSlots = endAhnentafel - startAhnentafel + 1;

        let html = "";
        let duplicateCount = 0; // Initialize duplicate count
        let multiAhnentafelSlotCount = 0; // Count of slots filled by people with multiple Ahnentafel numbers
        let filledSlots = 0; // Initialize filled slots count

        for (let number = startAhnentafel; number <= endAhnentafel; number++) {
            let person = this.findPersonByAhnentafelNumber(number);
            if (person) {
                let duplicate = this.displayedIds.has(person.Id);
                if (!duplicate) {
                    this.displayedIds.add(person.Id);
                } else {
                    duplicateCount++;
                }
                // Count slots for people with multiple Ahnentafel numbers
                if (person.AhnentafelNumber.length > 1) {
                    multiAhnentafelSlotCount++;
                }

                filledSlots++; // Increment filled slots count
                html += this.displayPerson(person, number, duplicate);
            }
        }

        let multiAhnentafelText =
            multiAhnentafelSlotCount > 0
                ? ` <span title="${multiAhnentafelSlotCount} slots filled by multi-number individuals." class="multiAhnentafelSlotCount">(${multiAhnentafelSlotCount})</span>`
                : "";
        //multiAhnentafelText = "";

        // Calculate the fill rate
        const fillRate = (filledSlots / totalSlots) * 100;
        let fillRateText = `<span title="Of the ${totalSlots} ancestors in this generation, ${filledSlots} (${fillRate.toFixed(
            2
        )}%) have WikiTree profiles." class="fillRate">${filledSlots}/${totalSlots} (${fillRate.toFixed(2)}%)</span>`;
        if (generationNumber === 1) {
            fillRateText = "";
        }

        if (html) {
            let range = ` <span class="range">(${startAhnentafel}–${endAhnentafel})</span>`;
            let duplicateText =
                duplicateCount > 0
                    ? ` <span title="${duplicateCount} of the ancestors in this generation ${
                          duplicateCount == 1
                              ? "is an additional appearance of an ancestor"
                              : "are additional appearances of ancestors"
                      } already listed in the Ahnentafel." class="duplicateCount">
                    ${duplicateCount}${multiAhnentafelText} duplicate${duplicateCount == 1 ? "" : "s"}</span>`
                    : "";
            let genTitle = this.generationTitle(generationNumber);
            if (generationNumber === 1) {
                range = "";
                const rootPerson = this.findPersonByAhnentafelNumber(1);
                if (rootPerson) {
                    const theName = this.getName(rootPerson).theName;
                    const birthYear =
                        rootPerson.BirthDate && rootPerson.BirthDate !== "0000-00-00"
                            ? rootPerson.BirthDate.split("-")[0]
                            : "";
                    const deathYear =
                        rootPerson.DeathDate && rootPerson.DeathDate !== "0000-00-00"
                            ? rootPerson.DeathDate.split("-")[0]
                            : "";
                    genTitle = `${theName} (${birthYear}–${deathYear})`;
                }
            }
            $("#ahnentafelAncestorList").append(
                `<section id="generation_${generationNumber}">
                    <h2><span title='Generation ${generationNumber}'>${generationNumber}</span>: ` +
                    genTitle +
                    `${range} ${duplicateText}${fillRateText}</h2>
                    <div class="generationContainer" data-collapsed="${this.incrementedNumber()}">
                    ${html}
                    </div>
                </section>`
            );
        }

        if (generationNumber < this.maxGeneration) {
            this.displayGeneration(generationNumber + 1);
        } else {
            this.addMoreGenerationsButton();
            wtViewRegistry.hideInfoPanel();
        }
    }

    findPersonByAhnentafelNumber(ahnentafelNumber) {
        return this.ancestors.find((p) => p.AhnentafelNumber.includes(ahnentafelNumber));
    }

    incrementedNumber() {
        return incrementingNumber++;
    }

    getName(person) {
        const aName = new PersonName(person);
        const theName = aName.withParts(AhnentafelAncestorList.WANTED_NAME_PARTS);
        const theParts = aName.getParts(AhnentafelAncestorList.WANTED_NAME_PARTS);

        // Safety check: if getParts returned an error string, return it as theName
        if (typeof theParts === "string") {
            return { theName: theParts };
        }

        const theLNAB = theParts.get("LastNameAtBirth");
        const theFirstNames = theParts.get("FirstNames");
        const theSuffix = theParts.get("Suffix");
        const theNicknames = theParts.get("Nicknames");
        const thePrefix = theParts.get("Prefix");
        const theLastName = theParts.get("LastNameCurrent");
        const theLastNameOther = theParts.get("LastNameOther");
        const thePreferredName = theParts.get("PreferredName");
        const theRealName = person.RealName || "";
        return {
            theName,
            theParts,
            theLNAB,
            theFirstNames,
            theSuffix,
            theNicknames,
            thePrefix,
            theLastName,
            theLastNameOther,
            thePreferredName,
            theRealName,
        };
    }

    displayPerson(person, ahnentafelNumber) {
        const additionalNumbers = person.AhnentafelNumber.filter((num) => num !== ahnentafelNumber)
            .sort((a, b) => a - b) // Sorts the numbers in ascending order
            .map(
                (num) =>
                    `<a class="ahnentafelLink" data-highlighted="${this.incrementedNumber()}" data-ahnentafel-number="${num}">${num}</a>`
            )
            .join(", ");

        const theName = this.getName(person);
        if (person.Id === 0) {
            return `<div data-highlighted="${this.incrementedNumber()}" class="ahnentafelPerson" id="person_${
                person.Id
            }">
                        [${this.unknownName(this.generation, ahnentafelNumber)}]
                    </div>`;
        } else {
            // Add data attributes to the person's div for birth-date, etc. for dynamic formatting

            if (person.DeathDate === "0000-00-00") {
                person.DeathDate = "";
            }
            if (person.BirthDate === "0000-00-00") {
                person.BirthDate = "";
            }

            // Get gender from Ahnentafel number, but use actual gender for the root person (#1)
            const gender = ahnentafelNumber === 1 ? person.Gender : ahnentafelNumber % 2 === 0 ? "Male" : "Female";
            const genderClass = this.settings.showGenderColors ? gender : "";
            const coupleClass =
                ahnentafelNumber === 1 ? "" : ahnentafelNumber % 2 === 0 ? "ahnentafel-father" : "ahnentafel-mother";

            const dataAttributes = {
                "data-birth-date": person.BirthDate || "",
                "data-birth-location": person.BirthLocation || "",
                "data-death-date": person.DeathDate || "",
                "data-death-location": person.DeathLocation || "",
                "data-birth-date-status": person?.DataStatus?.BirthDate || "",
                "data-death-date-status": person?.DataStatus?.DeathDate || "",
                "data-gender": gender,
            };
            const dataAttributeString = Object.entries(dataAttributes)
                .map(([key, value]) => `${key}="${value}"`)
                .join(" ");

            let profileLink = `<a class="profileLink" href="https://www.wikitree.com/wiki/${person.Name}">
            ${theName.theFirstNames}
            ${person.Nicknames ? `"${person.Nicknames}" ` : ""}
            ${person.LastNameCurrent !== person.LastNameAtBirth ? ` (${person.LastNameAtBirth}) ` : ""}
            ${person.LastNameCurrent}</a>${person.Suffix ? ` ${person.Suffix}` : ""}`;

            const wtIdInline = ` <span class="wt-id">(${person.Name})</span>`;

            if (additionalNumbers) {
                profileLink += ` (Also ${additionalNumbers})`;
            }

            if (!theName.theFirstNames) {
                profileLink = "Private";
            }

            return `<div data-highlighted="${this.incrementedNumber()}" class="ahnentafelPerson ${genderClass} ${coupleClass}" id="person_${
                person.Id
            }" data-ahnentafel-number="${ahnentafelNumber}" ${dataAttributeString}>
                        <span class="ahnentafelNumber">${ahnentafelNumber}.</span>
                        <span class="personText">
                            ${profileLink}${wtIdInline}:
                            <span class="birthAndDeathDetails">${this.formatBirthDeathDetails(person)}</span>
                            <span class="relativeDetails"><span class="parentOfDetails dataItem">${this.formatParentOfLinks(
                                person,
                                ahnentafelNumber
                            )}</span>
                             <span class="childOfDetails dataItem">${this.formatParentLinks(
                                 person,
                                 ahnentafelNumber
                             )}</span></span>
                        </span>
                        <button class="descendantButton" data-ahnentafel="${ahnentafelNumber}" title="See only ${
                            person.FirstName
                        }'s descendants and ancestors">↕</button>
            </div>`;
        }
    }

    formatParentOfLinks(person, ahnentafelNumber) {
        // Calculate the child's Ahnentafel number (half of the parent's number)
        const childAhnentafelNumber = Math.floor(ahnentafelNumber / 2);

        // Find the direct child based on the Ahnentafel number
        let child = this.ancestors.find((c) => c.AhnentafelNumber.includes(childAhnentafelNumber));
        if (!child) {
            return ""; // No direct child found
        }

        // Generate the child's name
        const theName = this.getName(child);
        const wtIdInline = ` <span class="wt-id">(${child.Name})</span>`;

        // Create the link for the direct child
        let name = theName.theFirstNames + " " + child.LastNameAtBirth;
        if (!theName.theFirstNames) {
            name = "Private";
        }
        let childLink = `<a data-id="${
            child.Id
        }" class="parentOf" data-highlighted="${this.incrementedNumber()}">${name}</a>${wtIdInline}`;

        // Determine the relationship label based on Ahnen numbers
        let relationshipLabel = ahnentafelNumber % 2 === 0 ? "Father" : "Mother";

        return ` ${relationshipLabel} of (${childAhnentafelNumber}) ${childLink}.`;
    }

    formatParentLinks(person, ahnentafelNumber) {
        let links = "";

        // Calculate the Ahnentafel numbers for the father and mother
        let fatherAhnentafelNumber = ahnentafelNumber * 2;
        let motherAhnentafelNumber = ahnentafelNumber * 2 + 1;

        // Create links for the father and mother
        let fatherLink = this.createParentLink(person.Father, fatherAhnentafelNumber);
        let motherLink = this.createParentLink(person.Mother, motherAhnentafelNumber);

        // Concatenate the links appropriately
        if (fatherLink && motherLink) {
            links = ` ${this.genderAsChild(person.Gender)} of ${fatherLink} and ${motherLink}.`;
        } else if (fatherLink) {
            links = ` ${this.genderAsChild(person.Gender)} of ${fatherLink}.`;
        } else if (motherLink) {
            links = ` ${this.genderAsChild(person.Gender)} of ${motherLink}.`;
        }

        return links;
    }

    createParentLink(parentId, ahnentafelNumber) {
        let parent = this.ancestors.find((p) => p.Id === parentId);
        if (parent) {
            const theName = this.getName(parent);
            const wtIdInline = ` <span class="wt-id">(${parent.Name})</span>`;

            let name = `${theName.theFirstNames} ${parent.LastNameAtBirth}`;
            if (!theName.theFirstNames) {
                name = "Private";
            }
            return `(${ahnentafelNumber}) <a data-id="${parentId}" class="childOf" data-highlighted="${this.incrementedNumber()}">${name}</a>${wtIdInline}`;
        } else {
            return "";
        }
    }

    genderAsChild(gender) {
        return gender === "Male" ? "Son" : gender === "Female" ? "Daughter" : "Child";
    }

    formatBirthDeathDetails(person) {
        const formatSetting = this.settings.format || 1;
        const formatLocation = (location) => (location ? ` in ${location}` : "");

        const birthDate = this.formatDate(person.BirthDate, person, "BirthDate");
        const deathDate = this.formatDate(person.DeathDate, person, "DeathDate");
        const birthLocation = formatLocation(person.BirthLocation || "");
        const deathLocation = formatLocation(person.DeathLocation || "");

        let content = "";
        switch (formatSetting) {
            case 1: // Original narrative style
            case 2: // Tidy table style, narrative
                const birthStr = `${birthDate}${birthLocation}`.trim();
                const deathStr = `${deathDate}${deathLocation}`.trim();

                const birthDetails = birthStr ? `<span class='birthDetails'>Born ${birthStr}.</span>` : "";
                const deathDetails = deathStr ? `<span class='deathDetails'>Died ${deathStr}.</span>` : "";

                content = `${birthDetails} ${deathDetails}`.trim();
                break;

            case 3: // Table with 'Born:' and 'Died:', using words
            case 4: // Table with 'b.' and 'd.', using symbols
                const birthPrefix = formatSetting === 4 ? "b." : "Born:";
                const deathPrefix = formatSetting === 4 ? "d." : "Died:";

                let birthRow = `<tr><td>${birthPrefix}</td><td>${birthDate}</td><td>${
                    person.BirthLocation || ""
                }</td></tr>`;
                if (!person.BirthDate && !person.BirthLocation) {
                    birthRow = "";
                }
                let deathRow = `<tr><td>${deathPrefix}</td><td>${deathDate}</td><td>${
                    person.DeathLocation || ""
                }</td></tr>`;
                if (!person.DeathDate && !person.DeathLocation) {
                    deathRow = "";
                }
                content = `<table class='detailsTable'><tbody>${birthRow}${deathRow}</tbody></table>`;
                break;
        }

        return content;
    }

    reformatAll() {
        const $list = $("#ahnentafelAncestorList");
        if ($list.length === 0) return;

        if (this.settings.tidy) {
            $list.addClass("tidy");
        } else {
            $list.removeClass("tidy");
        }

        $(".ahnentafelPerson").each((_, element) => {
            const $person = $(element);
            const personData = {
                BirthDate: $person.attr("data-birth-date") || "",
                BirthLocation: $person.attr("data-birth-location") || "",
                DeathDate: $person.attr("data-death-date") || "",
                DeathLocation: $person.attr("data-death-location") || "",
                DataStatus: {
                    BirthDate: $person.attr("data-birth-date-status") || "",
                    DeathDate: $person.attr("data-death-date-status") || "",
                },
            };

            $person.find(".birthAndDeathDetails").html(this.formatBirthDeathDetails(personData));
        });
    }

    updateReportDisplay() {
        const $report = $("#ahnentafelReport");
        if ($report.length === 0 || $report.children().length === 0) return;

        $(".report-person").each((_, element) => {
            const $person = $(element);
            const personId = parseInt($person.data("person-id"), 10);
            const personData = this.ancestors.find((p) => p.Id === personId);
            if (!personData) return;

            const name = this.getName(personData).theName.toUpperCase();
            const wtIdInline = ` <span class="wt-id">(${personData.Name})</span>`;
            $person.find(".report-name").html(`${name}${wtIdInline}`);

            const birthDateFormatted = this.formatDate(personData.BirthDate, personData, "BirthDate");
            const birthPlace = personData.BirthLocation || "";
            const deathDateFormatted = this.formatDate(personData.DeathDate, personData, "DeathDate");
            const deathPlace = personData.DeathLocation || "";

            let birthHtml = "";
            if (birthDateFormatted || birthPlace) {
                birthHtml = `<div class="report-vital-line">b. ${birthDateFormatted}${
                    birthDateFormatted && birthPlace ? ", " : ""
                }${birthPlace}</div>`;
            }

            let deathHtml = "";
            if (deathDateFormatted || deathPlace) {
                deathHtml = `<div class="report-vital-line">d. ${deathDateFormatted}${
                    deathDateFormatted && deathPlace ? ", " : ""
                }${deathPlace}</div>`;
            }

            $person.find(".report-vitals").html(`${birthHtml}${deathHtml}`);
            $person.attr("data-gender", personData.Gender || "Unknown");
        });

        this.applySettings();
    }

    getNameById(id) {
        const person = this.ancestors.find((p) => p.Id === id);
        return person ? `${person.FirstName} ${person.LastNameAtBirth}` : "Unknown";
    }

    formatDate(date, person, fieldName) {
        if (window.wtDate) {
            const formatted = window.wtDate(person, fieldName, {
                formatString: this.dateFormat,
                withCertainty: false,
            });
            if (!formatted || formatted === "[unknown]" || formatted === "0000-00-00") return "";

            const status = person?.DataStatus?.[fieldName] || "";
            const statusPrefix = window.DateFormatOptions
                ? window.DateFormatOptions.formatStatus(status, this.dateStatusFormat)
                : "";
            if (!statusPrefix) return formatted;
            if (["<", ">", "~"].includes(statusPrefix.trim())) return `${statusPrefix}${formatted}`;
            return `${statusPrefix} ${formatted}`;
        }

        // Fallback to original logic if wtDate or DateFormatOptions is not available
        if (!date || date === "0000-00-00") return "";
        let [year, month, day] = date.split("-");
        month = parseInt(month, 10);
        day = parseInt(day, 10);
        let formattedDate = `${year}`;
        if (month > 0) formattedDate = `${this.monthName[month]} ` + formattedDate;
        if (day > 0) formattedDate = `${day} ` + formattedDate;
        return formattedDate;
    }

    addProgressBar() {
        const progressBarHTML = `
            <div id="progressContainer" style="width: 100%; background-color: #ddd;">
                <div id="progressBar" style="width: 0%; height: 30px; background-color: #4CAF50; text-align: center; line-height: 30px; color: white;">0%</div>
            </div>`;
        $("#wt-status").append(progressBarHTML);
    }

    updateProgressBar(completedCalls, totalCalls) {
        const progressPercentage = (completedCalls / totalCalls) * 100;
        $("#progressBar").width(progressPercentage + "%");
        $("#progressBar").text(Math.round(progressPercentage) + "%");
    }
    showDescendantsAndAncestorsOnly(ahnentafelNumber) {
        // Hide all ancestors not in the direct line of the selected person
        const $this = this;
        $(".ahnentafelPerson, .ahnentafelPersonShort").each(function () {
            const currentAhnentafel = $(this).data("ahnentafel-number");
            if (
                !$this.isDescendantOf(currentAhnentafel, ahnentafelNumber) &&
                !$this.isAncestorOf(currentAhnentafel, ahnentafelNumber)
            ) {
                $(this).slideUp();
            } else {
                $(this).slideDown();
            }
        });

        // Find the target element
        const targetElement = $(`p[data-ahnentafel-number='${ahnentafelNumber}']`);

        // Scroll to the target person
        if (targetElement.length) {
            const targetOffset = targetElement.offset().top;
            const windowHeight = $(window).height();
            const scrollTarget = targetOffset - windowHeight / 2 + targetElement.outerHeight() / 2;

            $("html, body").animate(
                {
                    scrollTop: scrollTarget,
                },
                700
            );
        }
    }

    // Helper function to determine if a person is a descendant of another based on Ahnentafel numbers
    isDescendantOf(currentNumber, ancestorNumber) {
        while (currentNumber > 1) {
            currentNumber = Math.floor(currentNumber / 2);
            if (currentNumber === ancestorNumber) {
                return true;
            }
        }
        return false;
    }

    // Helper function to determine if a person is an ancestor of another based on Ahnentafel numbers
    isAncestorOf(currentNumber, descendantNumber) {
        while (descendantNumber > currentNumber) {
            descendantNumber = Math.floor(descendantNumber / 2);
        }
        return descendantNumber === currentNumber;
    }

    addToggleButtons() {
        const listContainer = $("#ahnentafelAncestorList");

        // Remove any existing toggle buttons to avoid duplicates on refresh.
        listContainer.find(".toggleButton").remove();
        $("#masterToggle").remove();

        // Add master toggle button
        listContainer.prepend("<span id='masterToggle' data-toggle='master' class='toggleButton'>▼</span>");

        // Function to update the state of the master toggle based on individual section toggles
        const updateMasterToggleState = () => {
            const allToggles = $("#ahnentafelAncestorList").find("section .toggleButton");
            if (allToggles.length === allToggles.filter(".collapsed").length) {
                // All are collapsed
                $("#masterToggle").addClass("collapsed");
            } else if (allToggles.filter(".collapsed").length === 0) {
                // All are expanded
                $("#masterToggle").removeClass("collapsed");
            }
        };

        // Add toggle buttons for each generation and handle click events
        listContainer.find("section").each(function () {
            const index = $(this).index();
            const header = $(this).find("h2");
            header.prepend(`<span data-toggle='${index}' class='toggleButton'>▼</span>`);

            header.off("click.ahnentafelToggle").on("click.ahnentafelToggle", function () {
                const toggleButton = $(this).find(".toggleButton");
                toggleButton.toggleClass("collapsed");
                $(this).closest("section").find(".generationContainer").slideToggle();

                // Update the master toggle state after a section is toggled
                updateMasterToggleState();
            });
        });

        // Handle the master toggle button
        $("#masterToggle")
            .off("click.ahnentafelToggle")
            .on("click.ahnentafelToggle", function () {
                $(this).toggleClass("collapsed");
                const isCollapsed = $(this).hasClass("collapsed");
                const allPeople = listContainer.find("section .generationContainer");
                if (isCollapsed) {
                    allPeople.slideUp();
                    $(".toggleButton").addClass("collapsed");
                } else {
                    allPeople.slideDown();
                    $(".toggleButton").removeClass("collapsed");
                }
            });

        updateMasterToggleState();
    }

    // Add Tidy Checkbox and handle its changes
    addTidyCheckbox() {
        const checkboxHTML = `<label><input type="checkbox" id="tidyCheckbox">Tidy</label>`;
        if ($("#tidyCheckbox").length === 0) {
            $("#ahnentafelHeaderBox #help-button").before(checkboxHTML);
            $("#tidyCheckbox").prop("checked", this.settings.tidy);

            $("#tidyCheckbox").change(() => {
                this.settings.tidy = $("#tidyCheckbox").is(":checked");
                this.saveSettings();
                this.applySettings();
            });
        }
    }

    addFormatButton() {
        if ($("#formatButton").length === 0) {
            const buttonHTML = `
                <button class="small" id="formatButton" title="Change the format of the birth and death details. Cycle through four options." style="${
                    this.settings.reportMode ? "display:none" : ""
                }">Format</button>
                <span id="reportImageToggle" class="ahn-header-controls" style="${
                    this.settings.reportMode ? "" : "display:none"
                }">
                    <label style="font-size: 0.9em; margin-left: 0.5em;"><input type="checkbox" id="ahnentafelShowPhotos" ${
                        this.settings.showPhotos ? "checked" : ""
                    }> Images</label>
                    <label style="font-size: 0.9em; margin-left: 0.5em;"><input type="checkbox" id="ahnentafelWideReport" ${
                        this.settings.wide ? "checked" : ""
                    }> Wide</label>
                    <label style="font-size: 0.9em; margin-left: 0.5em;"><input type="checkbox" id="ahnentafelShowChildren" ${
                        this.settings.showChildren ? "checked" : ""
                    }> Children</label>
                </span>`;
            $("#ahnentafelHeaderBox #help-button").before(buttonHTML);
            const formatButton = $("#formatButton");
            const $this = this;

            formatButton.on("click", function () {
                $this.settings.format++;
                if ($this.settings.format > 4) {
                    $this.settings.format = 1;
                }
                $this.saveSettings();
                $this.applySettings();
            });

            $("#ahnentafelShowPhotos").on("change", (e) => {
                this.settings.showPhotos = e.target.checked;
                this.saveSettings();
                this.applySettings();
            });

            $("#ahnentafelWideReport").on("change", (e) => {
                this.settings.wide = e.target.checked;
                this.saveSettings();
                this.applySettings();
            });

            $("#ahnentafelShowChildren").on("change", (e) => {
                this.settings.showChildren = e.target.checked;
                this.saveSettings();
                if (this.settings.reportMode && $("#ahnentafelReport").children().length > 0) {
                    this.startReportBuild(); // Rebuild report to fetch/render children
                }
            });
        }
    }

    // Load settings from localStorage
    loadSettings() {
        const defaultSettings = {
            tidy: false,
            format: 1,
            showWtId: false,
            showGenderColors: true,
            reportMode: false,
            showPhotos: true,
            wide: false,
            showChildren: true,
        };
        const storedSettingsString = localStorage.getItem("ahnentafelSettings");
        let storedSettings = storedSettingsString ? JSON.parse(storedSettingsString) : null;

        // If storedSettings is not null, merge with defaultSettings to ensure all properties exist
        if (storedSettings) {
            return { ...defaultSettings, ...storedSettings };
        } else {
            // If there are no storedSettings, return the defaultSettings
            return defaultSettings;
        }
    }

    // Save settings to localStorage
    saveSettings() {
        localStorage.setItem("ahnentafelSettings", JSON.stringify(this.settings));
    }

    setUniformDateColumnWidth() {
        let maxWidth = 0;
        // Find all second columns
        $(".detailsTable tr td:nth-child(2)").each(function () {
            const width = $(this).outerWidth();
            if (width > maxWidth) {
                maxWidth = width;
            }
        });

        // Set all second columns to the maximum width found
        $(".detailsTable tr td:nth-child(2)").css("width", maxWidth);
    }

    // Apply settings to the UI
    applySettings() {
        this.reformatAll();
        const $this = this;
        $(".ahnentafelPerson").each(function () {
            const $person = $(this);
            const gender = $person.data("gender");
            if ($this.settings.showGenderColors) {
                if (gender) {
                    $person.addClass(gender);
                }
            } else {
                $person.removeClass("Male Female Unknown");
            }
        });

        $(".report-person").each(function () {
            const $person = $(this);
            const gender = $person.data("gender") || "Unknown";
            const $header = $person.find(".report-person-header");
            if ($this.settings.showGenderColors) {
                $header.addClass(gender);
            } else {
                $header.removeClass("Male Female Unknown");
            }
        });

        if (this.settings.showWtId) {
            $(".wt-id").show();
        } else {
            $(".wt-id").hide();
        }
        if (this.settings.format > 2) {
            this.setUniformDateColumnWidth();
        }

        // Apply photo visibility and toggle UI visibility
        const $reportWrapper = $("#ahnentafelReportWrapper");
        if (this.settings.showPhotos) {
            $reportWrapper.addClass("show-photos");
        } else {
            $reportWrapper.removeClass("show-photos");
        }

        if (this.settings.wide) {
            $reportWrapper.addClass("wide");
        } else {
            $reportWrapper.removeClass("wide");
        }

        if (this.settings.reportMode) {
            $("#reportImageToggle").show();
            $("#formatButton").hide();
        } else {
            $("#reportImageToggle").hide();
            $("#formatButton").show();
        }
    }

    // Inside the AhnentafelAncestorList class

    calculateGenerationFillRate() {
        const fillRates = {};
        for (let gen = 1; gen <= this.maxGeneration; gen++) {
            // Calculate the range of Ahnentafel numbers for this generation
            const startNumber = Math.pow(2, gen - 1);
            const endNumber = Math.pow(2, gen) - 1;
            const totalSlots = endNumber - startNumber + 1;

            // Count the number of filled slots in this generation
            let filledSlots = 0;
            for (let num = startNumber; num <= endNumber; num++) {
                if (this.findPersonByAhnentafelNumber(num)) {
                    filledSlots++;
                }
            }

            // Calculate the fill rate
            const fillRate = (filledSlots / totalSlots) * 100;
            fillRates[gen] = {
                filledSlots,
                totalSlots,
                fillRate: fillRate.toFixed(2) + "%", // Round to two decimal places
            };
        }
        return fillRates;
    }
    showFillRates() {
        // e.g. 3/4 (75%)
        // Add fill rates to each generation's h2
        const fillRates = this.calculateGenerationFillRate();
        for (let gen = 2; gen <= this.maxGeneration; gen++) {
            const fillRate = fillRates[gen];
            $(`#generation_${gen} h2`).append(
                ` <span class="fillRate">${fillRate.filledSlots}/${fillRate.totalSlots} (${fillRate.fillRate})</span>`
            );
        }
    }

    // Setup navigation buttons
    setupNavigationButtons() {
        if ($("#ahnentafelAncestorListNavButtons").length == 0) {
            const navButtonsHTML = `
        <div id="ahnentafelAncestorListNavButtons">
            <button id="prevChange">◀</button>
            <button id="nextChange">▶</button>
        </div>`;
            $("#ahnentafelHeaderBox #help-button").before(navButtonsHTML);

            $("#prevChange").click(() => this.navigateChange(-1));
            $("#nextChange").click(() => this.navigateChange(1));
        }
    }

    // Capture the current state and add it to the change stack
    captureState() {
        const state = {
            collapsed: $(".toggleButton.collapsed")
                .map(function () {
                    return $(this).closest("[data-toggle]").data("toggle");
                })
                .get(),
            active: $(".descendantButton.active")
                .map(function () {
                    return $(this).data("ahnentafel");
                })
                .get(),

            highlightedClick: $(".highlightedClick")
                .map(function () {
                    return {
                        id:
                            $(this).data("ahnentafel-number") ||
                            $(this).closest(".ahnentafelPerson, .ahnentafelPersonShort").data("ahnentafel-number"),
                    };
                })
                .get(),
            persons: $(".ahnentafelPerson, .ahnentafelPersonShort")
                .map(function () {
                    return {
                        id: $(this).data("ahnentafel-number"),
                        isVisible: $(this).css("display") !== "none",
                    };
                })
                .get(),
            generationContainers: $(".generationContainer")
                .map(function () {
                    return {
                        id: $(this).closest("section").attr("id"),
                        isCollapsed: $(this).css("display") === "none",
                    };
                })
                .get(),
        };
        this.changeStack.push(state);
        this.currentStackIndex++;
        this.updateNavButtons();
    }

    // Update navigation buttons based on the stack index
    updateNavButtons() {
        const stackEmpty = this.changeStack.length <= 1;
        const atStartOfStack = this.currentStackIndex <= 0;
        const atEndOfStack = this.currentStackIndex >= this.changeStack.length - 1;

        // Hide the buttons if the stack is empty or has only the initial state
        if (stackEmpty) {
            $("#ahnentafelAncestorListNavButtons").hide();
        } else {
            $("#ahnentafelAncestorListNavButtons").show();
            $("#prevChange").prop("disabled", atStartOfStack);
            $("#nextChange").prop("disabled", atEndOfStack);
        }
    }

    // Navigate through the change stack
    navigateChange(direction) {
        this.currentStackIndex += direction;
        if (this.currentStackIndex < 0 || this.currentStackIndex >= this.changeStack.length) {
            return; // Out of range
        }
        const state = this.changeStack[this.currentStackIndex];

        $(".toggleButton").removeClass("collapsed");
        $(".descendantButton").removeClass("active");
        $(".ahnentafelPerson, .ahnentafelPersonShort").removeClass("highlightedClick");

        state.collapsed.forEach((dataAttr) => {
            $(`[data-toggle='${dataAttr}']`).addClass("collapsed");
        });

        state.active.forEach((ahnentafelNumber) => {
            $(`button.descendantButton[data-ahnentafel='${ahnentafelNumber}']`).addClass("active");
        });

        state.highlightedClick.forEach((highlighted) => {
            const selector = `.ahnentafelPerson[data-ahnentafel-number='${highlighted.id}'], .ahnentafelPersonShort[data-ahnentafel-number='${highlighted.id}']`;
            $(selector).addClass("highlightedClick");
        });

        state.persons.forEach((person) => {
            const selector = `.ahnentafelPerson[data-ahnentafel-number='${person.id}'], .ahnentafelPersonShort[data-ahnentafel-number='${person.id}']`;
            if (person.isVisible) {
                $(selector).slideDown();
            } else {
                $(selector).slideUp();
            }
        });

        // Restore the visibility of generation containers
        state.generationContainers.forEach((container) => {
            const selector = `#${container.id} .generationContainer`;
            if (container.isCollapsed) {
                $(selector).slideUp();
            } else {
                $(selector).slideDown();
            }
        });

        this.updateNavButtons();
    }

    trackChanges() {
        $(this.selector)
            .off("click.ahnentafelTrack")
            .on("click.ahnentafelTrack", ".toggleButton,.descendantButton,.childOf,.parentOf", () => {
                // Using setTimeout to ensure the state is captured after it changes
                setTimeout(() => {
                    this.captureState();
                }, 500);
            });
    }

    resetReportState() {
        this.reportState = {
            ...this.reportState,
            running: false,
            cancel: false,
            done: 0,
            skipped: 0,
            errors: 0,
            bytes: 0,
            currentGeneration: 0,
            reportNumberMap: new Map(),
            lastReportNumber: 0,
        };
    }

    updateReportStatus(msg) {
        const text = msg || "";
        const $status = $("#ahnentafelReportStatus");
        if (this.reportState?.running) {
            if ($status.find("#ahnentafelReportTree").length === 0) {
                $status
                    .empty()
                    .append(
                        "<img id='ahnentafelReportTree' src='./views/cc7/images/tree.gif' alt='Loading' title='Working'>"
                    );
                $("#ahnentafelReportTree").css({
                    display: "block",
                    margin: "6px auto",
                    height: "100px",
                    width: "100px",
                    borderRadius: "50%",
                    border: "4px solid forestgreen",
                });
            }
        } else {
            $status.find("#ahnentafelReportTree").remove();
            $status.text(text);
        }
    }

    setReportUiState({ busy }) {
        $("#buildReport").prop("disabled", busy);
        $("#cancelReport").prop("disabled", !busy);
        $("#reportGenerationSelect").prop("disabled", busy);
    }

    async startReportBuild() {
        if (this.reportState.running) {
            return;
        }

        const maxGeneration = parseInt($("#reportGenerationSelect").val() || this.maxGeneration);
        const people = this.collectReportAncestors(maxGeneration);
        if (people.length === 0) {
            this.updateReportStatus("No ancestors found for the selected generations.");
            return;
        }

        $("#ahnentafelReport").empty();
        this.resetReportState();
        this.reportState.running = true;
        this.reportState.total = people.length;
        this.updateReportStatus(`Initializing report for ${people.length} ancestors...`);
        this.setReportUiState({ busy: true });

        this.buildReportShell(people[0]);
        try {
            await this.processReportQueue(people);
        } catch (error) {
            console.error("Report build failed", error);
            this.updateReportStatus("Report build failed. See console for details.");
            this.finishReportBuild();
        }
    }

    cancelReportBuild() {
        if (!this.reportState.running) {
            return;
        }
        this.reportState.cancel = true;
        this.updateReportStatus("Cancelling...");
    }

    finishReportBuild(reason = "") {
        this.setReportUiState({ busy: false });
        this.reportState.running = false;

        const maxGeneration = parseInt($("#reportGenerationSelect").val() || this.maxGeneration, 10);
        const generationLabel = Number.isNaN(maxGeneration)
            ? ""
            : ` (${maxGeneration} generation${maxGeneration === 1 ? "" : "s"})`;
        let doneMsg = `Report ready: ${this.reportState.done}/${this.reportState.total} profiles${generationLabel}`;
        if (reason) {
            doneMsg = `Report stopped: ${this.reportState.done}/${this.reportState.total} profiles${generationLabel} (${reason})`;
        } else if (this.reportState.cancel) {
            doneMsg = `Report cancelled: ${this.reportState.done} profiles ready${generationLabel}`;
        }

        const skippedMsg = this.reportState.skipped ? `, skipped ${this.reportState.skipped}` : "";
        const errorMsg = this.reportState.errors ? `, errors ${this.reportState.errors}` : "";
        this.updateReportStatus(doneMsg + skippedMsg + errorMsg);

        $("#printReport").prop("disabled", false);
        this.applySettings();
    }

    collectReportAncestors(maxGeneration) {
        const people = [];
        // Use a Set to avoid duplicates if someone appears multiple times in tree
        const seenIds = new Set();

        // Sort ancestors by generation and then Ahnentafel number to ensure correct report order
        const sortedAncestors = [...this.ancestors].sort((a, b) => {
            const genA = Math.min(...a.Generation);
            const genB = Math.min(...b.Generation);
            if (genA !== genB) return genA - genB;
            return a.AhnentafelNumber[0] - b.AhnentafelNumber[0];
        });

        sortedAncestors.forEach((person) => {
            if (seenIds.has(person.Id)) return;
            const generation = Math.min(...person.Generation);
            if (generation <= maxGeneration) {
                seenIds.add(person.Id);
                people.push({
                    id: person.Id,
                    wtid: person.Name,
                    ahnentafel: person.AhnentafelNumber[0],
                    generation: generation,
                });
            }
        });
        return people;
    }

    buildReportShell(rootPerson) {
        const $report = $("#ahnentafelReport");
        $report.empty();

        if (rootPerson) {
            const person = this.ancestors.find((a) => a.Id === rootPerson.id);
            if (person) {
                const name = this.getName(person).theName;
                const birthYear =
                    person.BirthDate && person.BirthDate !== "0000-00-00" ? person.BirthDate.split("-")[0] : "";
                const deathYear =
                    person.DeathDate && person.DeathDate !== "0000-00-00" ? person.DeathDate.split("-")[0] : "";
                const birthYearDisplay = birthYear || " ";
                const deathYearDisplay = deathYear || " ";
                const yearSpan = birthYear || deathYear ? ` (${birthYearDisplay} – ${deathYearDisplay})` : "";
                $report.append(`<h1 class="report-main-title">Ancestors of ${name}${yearSpan}</h1>`);
            }
        }
    }

    async processReportQueue(queue) {
        while (queue.length && !this.reportState.cancel) {
            const batch = queue.splice(0, AhnentafelAncestorList.REPORT_LIMITS.batchSize);

            const cachedPeople = batch.filter(
                (p) => window.ahnentafelReportCache[p.id] || window.ahnentafelReportCache[p.wtid]
            );
            const toFetch = batch.filter((p) => !cachedPeople.includes(p));

            cachedPeople.forEach((person) => {
                if (this.reportState.cancel) return;
                const data = this.processReportPersonData(null, person, {});
                this.renderReportAncestor(person, data);
            });

            if (!toFetch.length) {
                continue;
            }

            const wtidList = toFetch.map((p) => p.wtid).join(", ");
            this.updateReportStatus(`Fetching bios for: ${wtidList}...`);

            const batchMap = await this.fetchReportBatch(toFetch);

            // Fetch spouses for this batch (skip IDs we already have in the batch).
            const spouseIds = new Set();
            Object.values(batchMap).forEach((p) => {
                if (p.Spouses) {
                    Object.values(p.Spouses).forEach((s) => {
                        if (s.Id) spouseIds.add(String(s.Id));
                    });
                }
            });

            let spouseMap = {};
            const missingSpouseIds = [];
            spouseIds.forEach((id) => {
                if (batchMap[id]) {
                    spouseMap[id] = batchMap[id];
                } else {
                    missingSpouseIds.push(id);
                }
            });

            if (missingSpouseIds.length > 0) {
                this.updateReportStatus(`Fetching spouse details for: ${wtidList}...`);
                const spouseIdList = missingSpouseIds.join(",");
                const [, , spouses] =
                    (await this.callWithRetry(() =>
                        WikiTreeAPI.getPeople(
                            "TA_AhnReportSpouses",
                            spouseIdList,
                            AhnentafelAncestorList.REPORT_FIELDS,
                            { resolveRedirect: 1 }
                        )
                    )) || [];
                spouseMap = { ...spouseMap, ...(spouses || {}) };
            }

            toFetch.forEach((person) => {
                if (this.reportState.cancel) return;
                const apiPerson = batchMap[person.id] || batchMap[String(person.id)] || batchMap[person.wtid];
                const data = this.processReportPersonData(apiPerson, person, spouseMap, batchMap);
                this.renderReportAncestor(person, data);
            });

            if (!this.reportState.cancel && AhnentafelAncestorList.REPORT_LIMITS.batchDelayMs > 0 && queue.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, AhnentafelAncestorList.REPORT_LIMITS.batchDelayMs));
            }

            if (this.reportState.bytes >= AhnentafelAncestorList.REPORT_LIMITS.totalChars) {
                this.finishReportBuild(`Reached size limit (${Math.round(this.reportState.bytes / 1024)} KB)`);
                return;
            }
        }

        this.finishReportBuild();
    }

    async fetchReportBatch(batch) {
        const keys = batch.map((p) => p.id).filter(Boolean);
        if (!keys.length) {
            return {};
        }
        try {
            const [, , people] =
                (await this.callWithRetry(() =>
                    WikiTreeAPI.getPeople("TA_AhnReport", keys, AhnentafelAncestorList.REPORT_FIELDS, {
                        bioFormat: "both",
                        resolveRedirect: 1,
                        descendants: this.settings.showChildren ? 1 : 0,
                    })
                )) || [];
            return people || {};
        } catch (error) {
            console.error("getPeople batch failed", error);
            this.reportState.errors += batch.length;
            return {};
        }
    }

    processReportPersonData(apiPerson, person, spouseMap, batchMap = null) {
        if (!apiPerson) {
            return window.ahnentafelReportCache[person.id] || window.ahnentafelReportCache[person.wtid];
        }

        const bioRaw = apiPerson.bioHTML || apiPerson.bio_html || apiPerson.bioHtml || apiPerson.Bio || "";
        this.reportState.bytes += bioRaw.length;

        const { bioHtml, endnotes } = this.extractEndnotesFromBio(this.sanitizeBioHtml(bioRaw), person.id);

        const processed = {
            id: apiPerson.Id,
            bioHtml,
            endnotes,
            photoUrl: this.getPhotoUrl(apiPerson.PhotoData?.url, apiPerson.Photo),
            spouses: [],
            children: [],
        };

        if (this.settings.showChildren && batchMap) {
            const pid = String(apiPerson.Id);
            // Scan batchMap for anyone whose Father or Mother is this person
            const childrenList = Object.values(batchMap).filter(
                (p) => String(p.Father) === pid || String(p.Mother) === pid
            );

            childrenList.forEach((childObj) => {
                if (!childObj) return;
                processed.children.push({
                    name: this.getName(childObj).theName,
                    birth: childObj.BirthDate,
                    death: childObj.DeathDate,
                    wtid: childObj.Name,
                });
            });
            processed.children.sort((a, b) => (a.birth || "9999").localeCompare(b.birth || "9999"));
        } else if (this.settings.showChildren && apiPerson.Children) {
            // Fallback to direct Children property if batchMap scan fails or not provided
            Object.values(apiPerson.Children).forEach((child) => {
                const childObj = typeof child === "object" ? child : null;
                if (!childObj) return;
                processed.children.push({
                    name: this.getName(childObj).theName,
                    birth: childObj.BirthDate,
                    death: childObj.DeathDate,
                    wtid: childObj.Name,
                });
            });
            processed.children.sort((a, b) => (a.birth || "9999").localeCompare(b.birth || "9999"));
        }

        if (apiPerson.Spouses) {
            Object.values(apiPerson.Spouses).forEach((s) => {
                const sDetail = spouseMap[String(s.Id)];
                if (sDetail) {
                    processed.spouses.push(sDetail);
                } else {
                    processed.spouses.push(s);
                }
            });
        }

        window.ahnentafelReportCache[person.id] = processed;
        return processed;
    }

    sanitizeBioHtml(bioHtml) {
        const $wrapper = $("<div></div>").append(bioHtml);
        $wrapper.find("script,style").remove();
        $wrapper.find(".aContents,.status,.sticker,.toc").remove();
        $wrapper.find("div.status, div.sticker, #toc").remove();

        $wrapper.find("a").each(function () {
            const $a = $(this);
            const href = $a.attr("href") || "";
            if (href && !href.startsWith("#") && !/^[a-z]+:/i.test(href)) {
                $a.attr("href", "https://www.wikitree.com" + (href.startsWith("/") ? "" : "/") + href);
            }
            if (href && !href.startsWith("#")) {
                $a.attr("target", "_blank");
            }
        });

        $wrapper.find("img").each(function () {
            const $img = $(this);
            const src = $img.attr("src") || "";
            if (src && !/^https?:\/\//i.test(src) && !src.startsWith("data:")) {
                $img.attr("src", "https://www.wikitree.com" + (src.startsWith("/") ? "" : "/") + src);
            }
            $img.addClass("report-bio-image");
        });

        $wrapper.find("p").each(function () {
            const text = $(this).text().trim();
            const hasBr = $(this).find("br").length > 0;
            const hasOtherStuff = $(this).children().not("br").length > 0;
            if (!text && !hasOtherStuff) {
                $(this).remove();
            }
        });

        $wrapper.children("br").remove();

        $wrapper
            .contents()
            .filter(function () {
                return this.nodeType === 3 && this.textContent.trim().length > 0;
            })
            .each(function () {
                const $p = $("<p></p>").text(this.textContent);
                $(this).replaceWith($p);
            });
        return $wrapper;
    }

    extractEndnotesFromBio($wrapper, personId) {
        const notes = [];
        const seenRefs = new Map();

        $wrapper.find("sup.reference").each(function () {
            const $sup = $(this);
            const href = $sup.find("a").attr("href") || "";

            let num;
            if (href && seenRefs.has(href)) {
                num = seenRefs.get(href);
            } else {
                num = notes.length + 1;
                let noteHtml = "";
                if (href.startsWith("#")) {
                    const target = $wrapper.find(href);
                    if (target.length) {
                        noteHtml = target.html();
                        target.remove();
                    }
                }
                if (!noteHtml) {
                    noteHtml = $sup.text() || "Citation";
                }
                notes.push(noteHtml);
                if (href) {
                    seenRefs.set(href, num);
                }
            }
            $sup.replaceWith(`<sup class="report-citation">[${num}]</sup>`);
        });

        return { bioHtml: $wrapper.html(), endnotes: notes };
    }

    renderReportAncestor(person, data) {
        const personData = this.ancestors.find((a) => a.Id === person.id);
        const name = this.getName(personData).theName;
        const wtIdInline = ` <span class="wt-id">(${personData.Name})</span>`;
        const gender = personData.Gender;
        const generation = person.generation;

        // Generation Header
        if (generation > this.reportState.currentGeneration) {
            this.reportState.currentGeneration = generation;
            $("#ahnentafelReport").append(`<h2 class="report-generation-header">Generation No. ${generation}</h2>`);
        }

        const spousesNarrative = this.formatSpouseNarrative(data.spouses, name);

        let childrenNarrative = "";
        if (this.settings.showChildren && data.children && data.children.length > 0) {
            const childrenList = data.children
                .map((child) => {
                    let vitals = "";
                    if (child.birth && child.birth !== "0000-00-00") {
                        vitals += `b. ${child.birth.split("-")[0]}`;
                    }
                    if (child.death && child.death !== "0000-00-00") {
                        vitals += (vitals ? ", " : "") + `d. ${child.death.split("-")[0]}`;
                    }
                    return `${child.name}${vitals ? ` (${vitals})` : ""}`;
                })
                .join("; ");
            childrenNarrative = `<div class="report-children">Children of ${name}: ${childrenList}.</div>`;
        }

        const endnoteList = data?.endnotes?.length
            ? `<ol class="report-endnotes">${data.endnotes.map((n) => `<li>${n}</li>`).join("")}</ol>`
            : "";

        const bioHtml = data?.bioHtml ? data.bioHtml : "<em>Biography not loaded or skipped for this profile.</em>";

        let photoHtml = "";
        if (this.settings.showPhotos && data?.photoUrl) {
            photoHtml = `<img class="report-photo" src="${data.photoUrl}" alt="${name}">`;
        }

        const birthDateFormatted = this.formatDate(personData.BirthDate, personData, "BirthDate");
        const birthPlace = personData.BirthLocation || "";
        const deathDateFormatted = this.formatDate(personData.DeathDate, personData, "DeathDate");
        const deathPlace = personData.DeathLocation || "";

        let birthHtml = "";
        if (birthDateFormatted || birthPlace) {
            birthHtml = `<div class="report-vital-line">b. ${birthDateFormatted}${
                birthDateFormatted && birthPlace ? ", " : ""
            }${birthPlace}</div>`;
        }

        let deathHtml = "";
        if (deathDateFormatted || deathPlace) {
            deathHtml = `<div class="report-vital-line">d. ${deathDateFormatted}${
                deathDateFormatted && deathPlace ? ", " : ""
            }${deathPlace}</div>`;
        }

        const html = `
            <div class="report-person" id="report_person_${person.id}" data-person-id="${person.id}" data-gender="${
                gender || "Unknown"
            }">
                ${photoHtml}
                <div class="report-person-header">
                    <span class="report-person-title">
                        <span class="report-ahnentafel">${person.ahnentafel}.</span>
                        <span class="report-name">${name.toUpperCase()}${wtIdInline}</span>
                    </span>
                    <div class="report-vitals">
                        ${birthHtml}
                        ${deathHtml}
                    </div>
                </div>
                <div class="report-bio">
                    <div class="family-summary">
                        <p class="report-spouse-narrative">${spousesNarrative}</p>
                        ${childrenNarrative}
                    </div>
                    ${bioHtml}
                    ${endnoteList}
                </div>
            </div>
        `;

        $("#ahnentafelReport").append(html);
        this.reportState.done++;
        this.updateReportStatus(`Building report: ${this.reportState.done}/${this.reportState.total}...`);
    }

    formatSpouseNarrative(spouses, personFirstName) {
        if (!spouses || spouses.length === 0) return "";
        // extract just the first name if a full name is passed
        const firstName = personFirstName.split(" ")[0];

        const results = spouses.map((s) => {
            const name = this.getName(s).theName.toUpperCase();
            const mDate = this.formatDate(s.MarriageDate, s, "MarriageDate");
            const mLoc = s.MarriageLocation || "";
            const bDate = this.formatDate(s.BirthDate, s, "BirthDate");
            const bLoc = s.BirthLocation || "";
            const dDate = this.formatDate(s.DeathDate, s, "DeathDate");
            const dLoc = s.DeathLocation || "";

            let parentStr = "";
            const father = s.Father ? s.Father.FullName || s.Father.Name : "";
            const mother = s.Mother ? s.Mother.FullName || s.Mother.Name : "";
            if (father || mother) {
                const rel = s.Gender === "Male" ? "son" : s.Gender === "Female" ? "daughter" : "child";
                parentStr = `, ${rel} of ${father || "unknown"}${father && mother ? " and " : ""}${mother || ""}`;
            }

            let vitalsStr = "";
            if (bDate || bLoc || dDate || dLoc) {
                vitalsStr = `, born ${bDate || ""}${bLoc ? " in " + bLoc : ""}${
                    dDate ? " and died " + dDate + (dLoc ? " in " + dLoc : "") : ""
                }.`;
            }

            return `${firstName} married ${name}${mDate ? " " + mDate : ""}${
                mLoc ? " in " + mLoc : ""
            }${parentStr}${vitalsStr}`;
        });

        return results.join(" ");
    }

    getPhotoUrl(url, photo) {
        let candidate = url;
        if (typeof url === "object" && url !== null) {
            candidate = url.url;
        }
        if (!candidate) candidate = photo;

        if (candidate) {
            if (/^https?:\/\//i.test(candidate)) return candidate;
            if (candidate.startsWith("//")) return "https:" + candidate;
            if (candidate.includes("/")) {
                return "https://www.wikitree.com" + (candidate.startsWith("/") ? "" : "/") + candidate;
            }
        }
        return null;
    }

    joinWithAnd(parts) {
        if (!parts || parts.length === 0) return "";
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
        return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
    }

    async wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async callWithRetry(fn) {
        let lastError;
        for (let i = 0; i < 3; i++) {
            try {
                return await fn();
            } catch (err) {
                lastError = err;
                await this.wait(1000 * (i + 1));
            }
        }
        throw lastError;
    }
};
