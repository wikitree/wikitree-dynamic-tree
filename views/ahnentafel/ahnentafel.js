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
        $("#view-container").css("min-height", "0").addClass("ahnentafelView");
        let ahnen = new AhnentafelAncestorList(container_selector, person_id);
        ahnen.clearData(); // Clear existing data
        ahnen.displayAncestorList();
    }

    close() {
        $("#moreGenerationsButton").off("click").remove();
        $("header #ahnentafelHeaderBox").remove();
        $("#view-container").css({ "min-height": "1000px", "overflow": "visible" });
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
        "FirstName",
        "MiddleNames",
        "PreferredName",
        "Nicknames",
        "LastNameAtBirth",
        "LastNameCurrent",
        "Suffix",
        "LastNameOther",
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
        this.monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        this.blankPerson = { Id: 0, FirstName: "Unknown" };
        this.profileFields =
            "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,MiddleName,RealName,Nicknames,Suffix,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,DataStatus,Privacy,Father,Mother,Derived.BirthName,Derived.BirthNamePrivate";
        this.profileFieldsArray = this.profileFields.split(",");
        this.ancestors = [];
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
                targetElement = $(`p[data-ahnentafel-number="${ahnentafelNumber}"]`);
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
        $(this.selector).html(`<div id="ahnentafelAncestorList"></div>`);
        this.displayGeneration(1);
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
                err += ` Try the Apps Login.`;
            }
            wtViewRegistry.showError(err);
            wtViewRegistry.hideInfoPanel();
            return;
        }
        if (p.Privacy < 50 && !p.Gender) {
            wtViewRegistry.showError(
                `<p>Sorry, this profile is <a href="https://www.wikitree.com/wiki/Privacy">Private</a> and you are not on the profile's <a href="https://www.wikitree.com/wiki/Trusted_List">Trusted List</a>.</p>`
            );
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
            let ancestorData = await WikiTreeAPI.getPeople(AhnentafelView.APP_ID, p.Id, this.profileFieldsArray, {
                ancestors: this.maxGeneration,
            });
            this.processInitialAncestors(ancestorData);

            if (!ancestorData) {
                wtViewRegistry.showError(`Error: No ancestors found for ${p.Name}`);
                return;
            }

            // Assuming ancestorData[2] is an object of objects, keyed by Id
            const ancestorObject = ancestorData[2];
            this.ancestors = Object.keys(ancestorObject).map((key) => {
                ancestorObject[key].Generation = [];
                ancestorObject[key].AhnentafelNumber = [];
                return ancestorObject[key];
            });

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
        this.addHelpText(); // Add help text
    }

    processInitialAncestors(ancestorData) {
        if (ancestorData && ancestorData[2] && typeof ancestorData[2] === "object") {
            // Process each ancestor in ancestorData[2]
            this.ancestors = Object.keys(ancestorData[2]).map((key) => {
                const ancestor = ancestorData[2][key];

                // Initialize properties for each ancestor
                ancestor.Generation = [];
                ancestor.AhnentafelNumber = [];

                return ancestor;
            });
        } else {
            console.error("Invalid ancestor data format", ancestorData);
        }
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

        // Add progress bar to a specific container (e.g., "#myContainer")
        this.addProgressBar("#myContainer");

        // Fetch new ancestors and add to this.ancestors, checking for duplicates
        let completedCalls = 0;
        let idGroups = this.createIdGroupsForApiCall(this.ancestors, generationsToAdd);
        let totalCalls = idGroups.length;

        for (let group of idGroups) {
            let ids = group.join(",");
            let additionalData = await WikiTreeAPI.getPeople(AhnentafelView.APP_ID, ids, this.profileFieldsArray, {
                ancestors: generationsToAdd,
            });
            completedCalls++;
            this.updateProgressBar(completedCalls, totalCalls);

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
        }

        // Reassign Ahnentafel numbers and generations to all ancestors
        const rootPerson = this.ancestors.find((person) => person.Id === this.startId);
        if (rootPerson) {
            this.assignGenerationAndAhnentafel(rootPerson, 1, 1, new Set());
        }

        wtViewRegistry.clearStatus();
        this.refreshAncestorList();
        this.addToggleButtons();
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
            if (generationNumber === 1) {
                range = "";
            }
            $("#ahnentafelAncestorList").append(
                `<section id="generation_${generationNumber}">
                    <h2><span title='Generation ${generationNumber}'>${generationNumber}</span>${
                    generationNumber != 1 ? ":" : ""
                } ` +
                    this.generationTitle(generationNumber) +
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

    displayShortPersonEntry(person, ahnentafelNumber) {
        const additionalNumbers = person.AhnentafelNumber.filter((num) => num !== ahnentafelNumber)
            .sort((a, b) => a - b) // Sorts the numbers in ascending order
            .map(
                (num) =>
                    `<a class="ahnentafelLink" data-highlighted="${this.incrementedNumber()}" data-ahnentafel-number="${num}">${num}</a>`
            )
            .join(", ");

        return `
            <p data-highlighted="${this.incrementedNumber()}" class="ahnentafelPersonShort short ${
            person.Gender
        }" id="person_${ahnentafelNumber}" data-ahnentafel-number="${ahnentafelNumber}">
            <span class="ahnentafelNumber">${ahnentafelNumber}.</span>
            <span class="personText"> 
                <a data-id="${person.Id}" class="profileLink" href="#person_${person.Id}">${person.FirstName} ${
            person.LastNameAtBirth
        }</a>
                ${additionalNumbers ? ` (Also ${additionalNumbers})` : ""}
                <span class="relativeDetails"><span class="parentOfDetails dataItem">${this.formatParentOfLinks(
                    person,
                    ahnentafelNumber
                )}</span></span>
            </span>
            <button class="descendantButton" data-active='${ahnentafelNumber}' data-ahnentafel="${ahnentafelNumber}" title="See only ${
            person.FirstName
        }'s descendants and ancestors">↕</button> 
        </p>
        `;
    }

    getName(person) {
        const aName = new PersonName(person);
        const theName = aName.withParts(this.WANTED_NAME_PARTS);
        const theParts = aName.getParts(["LastNameAtBirth", "FirstName"]);
        const theLNAB = theParts.get("LastNameAtBirth");
        const theFirstName = theParts.get("FirstName");
        const theMiddleName = theParts.get("MiddleName");
        const theSuffix = theParts.get("Suffix");
        const theNicknames = theParts.get("Nicknames");
        const thePrefix = theParts.get("Prefix");
        const theLastName = theParts.get("LastNameCurrent");
        const theLastNameOther = theParts.get("LastNameOther");
        const thePreferredName = theParts.get("PreferredName");
        const theRealName = theParts.get("RealName");
        return {
            theName,
            theParts,
            theLNAB,
            theFirstName,
            theMiddleName,
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

            const dataAttributes = {
                "data-birth-date": person.BirthDate || "",
                "data-birth-location": person.BirthLocation || "",
                "data-death-date": person.DeathDate || "",
                "data-death-location": person.DeathLocation || "",
                "data-birth-date-status": person?.DataStatus?.BirthDate || "",
                "data-death-date-status": person?.DataStatus?.DeathDate || "",
            };
            const dataAttributeString = Object.entries(dataAttributes)
                .map(([key, value]) => `${key}="${value}"`)
                .join(" ");

            let profileLink = `<a class="profileLink" href="https://www.wikitree.com/wiki/${person.Name}">
            ${theName.theFirstName} ${person.MiddleName || ""} 
            ${person.Nicknames ? `"${person.Nicknames}" ` : ""}
            ${person.LastNameCurrent !== person.LastNameAtBirth ? ` (${person.LastNameAtBirth}) ` : ""}
            ${person.LastNameCurrent}</a>${person.Suffix ? ` ${person.Suffix}` : ""}${
                additionalNumbers ? ` (Also ${additionalNumbers})` : ""
            }`;
            if (!theName.theFirstName) {
                profileLink = "Private";
            }

            // Get gender from Ahnnetafel number
            const gender = ahnentafelNumber % 2 === 0 ? "Male" : "Female";

            return `<div data-highlighted="${this.incrementedNumber()}" class="ahnentafelPerson ${gender}" id="person_${
                person.Id
            }" data-ahnentafel-number="${ahnentafelNumber}" ${dataAttributeString}>
                        <span class="ahnentafelNumber">${ahnentafelNumber}.</span>
                        <span class="personText">
                            ${profileLink}: 
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

        // Create the link for the direct child
        let name = theName.theFirstName + " " + child.LastNameAtBirth;
        if (!theName.theFirstName) {
            name = "Private";
        }
        let childLink = `<a data-id="${
            child.Id
        }" class="parentOf" data-highlighted="${this.incrementedNumber()}">${name}</a>`;

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

            let name = `${theName.theFirstName} ${parent.LastNameAtBirth}`;
            if (!theName.theFirstName) {
                name = "Private";
            }
            return `(${ahnentafelNumber}) <a data-id="${parentId}" class="childOf" data-highlighted="${this.incrementedNumber()}">${name}</a>`;
        } else {
            return "";
        }
    }

    genderAsChild(gender) {
        return gender === "Male" ? "Son" : gender === "Female" ? "Daughter" : "Child";
    }

    reformatAll() {
        if (this.settings.format === 2) {
            // add tidy class
            $("#ahnentafelAncestorList").addClass("tidy");
        } else {
            $("#ahnentafelAncestorList").removeClass("tidy");
        }
        const $this = this;
        $(".ahnentafelPerson").each(function () {
            const $personElement = $(this);
            // Construct a temporary 'person' object from data attributes
            const person = {
                BirthDate: $personElement.data("birth-date"),
                DeathDate: $personElement.data("death-date"),
                BirthLocation: $personElement.data("birth-location"),
                DeathLocation: $personElement.data("death-location"),
                DataStatus: {
                    BirthDate: $personElement.data("birth-date-status"),
                    DeathDate: $personElement.data("death-date-status"),
                },
            };

            // Call formatBirthDeathDetails with this temporary person object
            const newContent = $this.formatBirthDeathDetails(person);

            // Update the .birthAndDeathDetails container within the current .ahnentafelPerson element
            $personElement.find(".birthAndDeathDetails").html(newContent);
        });
    }

    formatBirthDeathDetails(person) {
        // Extract the format setting
        const formatSetting = this.settings.format || 1;

        // Utility to format dates, assumed to be defined elsewhere
        const formatDate = (date) => (date ? this.formatDate(date) : "");

        // Function to format location string, only adding "in" if location exists
        const formatLocation = (location) => (location ? ` in ${location}` : "");

        // Function to determine date status prefix based on formatSetting and date status
        const formatDateStatus = (status, isTableFormat = false) => {
            if (isTableFormat) {
                if (formatSetting === 3) {
                    // Table format with words
                    switch (status) {
                        case "guess":
                            return "abt.";
                        case "before":
                            return "bef.";
                        case "after":
                            return "aft.";
                        default:
                            return "";
                    }
                } else if (formatSetting === 4) {
                    // Table format with symbols
                    switch (status) {
                        case "guess":
                            return "~";
                        case "before":
                            return "<";
                        case "after":
                            return ">";
                        default:
                            return "";
                    }
                }
            } else {
                // Narrative style with words
                switch (status) {
                    case "guess":
                        return "about";
                    case "before":
                        return "before";
                    case "after":
                        return "after";
                    default:
                        return "";
                }
            }
            return "";
        };

        let content = "";

        switch (formatSetting) {
            case 1: // Original narrative style
            case 2: // Tidy table style, narrative
                const birthStatusWord = formatDateStatus(person.DataStatus?.BirthDate);
                const deathStatusWord = formatDateStatus(person.DataStatus?.DeathDate);

                let formattedBirthDate = formatDate(person.BirthDate);
                if (!formattedBirthDate || person.BirthDate === "0000-00-00" || !person.BirthDate) {
                    formattedBirthDate = "";
                } else {
                    formattedBirthDate = `${birthStatusWord} ${formattedBirthDate}`;
                }

                let formattedDeathDate = formatDate(person.DeathDate);
                if (!formattedDeathDate || person.DeathDate === "0000-00-00" || !person.DeathDate) {
                    formattedDeathDate = "";
                } else {
                    formattedDeathDate = `${deathStatusWord} ${formattedDeathDate}`;
                }

                let formattedBirthLocation = formatLocation(person.BirthLocation) || "";
                if (!person.BirthLocation) {
                    formattedBirthLocation = "";
                }

                let formattedDeathLocation = formatLocation(person.DeathLocation) || "";
                if (!person.DeathLocation) {
                    formattedDeathLocation = "";
                }

                let birthDetails =
                    person.BirthDate || person.BirthLocation
                        ? `<span class='birthDetails'>Born ${formattedBirthDate} ${formattedBirthLocation}.</span>`
                        : "";
                let deathDetails =
                    person.DeathDate || person.DeathLocation
                        ? `<span class='deathDetails'>Died ${formattedDeathDate} ${formattedDeathLocation}.</span>`
                        : "";

                content = `${birthDetails} ${deathDetails}`;
                break;

            case 3: // Table with 'Born:' and 'Died:', using words
            case 4: // Table with 'b.' and 'd.', using symbols
                const birthPrefix = formatSetting === 4 ? "b." : "Born:";
                const deathPrefix = formatSetting === 4 ? "d." : "Died:";
                const birthStatus = formatDateStatus(person.DataStatus?.BirthDate, true);
                const deathStatus = formatDateStatus(person.DataStatus?.DeathDate, true);

                let theBirthDate = formatDate(person.BirthDate);
                if (!theBirthDate || person.BirthDate === "0000-00-00" || !person.BirthDate) {
                    theBirthDate = "";
                }
                let theDeathDate = formatDate(person.DeathDate);
                if (!theDeathDate || person.DeathDate === "0000-00-00" || !person.DeathDate) {
                    theDeathDate = "";
                }

                let birthRow = `<tr><td>${birthPrefix}</td><td>${birthStatus} ${formatDate(person.BirthDate)}</td><td>${
                    person.BirthLocation || ""
                }</td></tr>`;
                if (!person.BirthDate && !person.BirthLocation) {
                    birthRow = "";
                }
                let deathRow = `<tr><td>${deathPrefix}</td><td>${deathStatus} ${formatDate(person.DeathDate)}</td><td>${
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

    getNameById(id) {
        const person = this.ancestors.find((p) => p.Id === id);
        return person ? `${person.FirstName} ${person.LastNameAtBirth}` : "Unknown";
    }

    formatDate(date) {
        if (!date || date === "0000-00-00") return "[date unknown]";
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
        // Add master toggle button
        $("#ahnentafelAncestorList").prepend(
            "<span id='masterToggle' data-toggle='master' class='toggleButton'>▼</span>"
        );

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
        $("#ahnentafelAncestorList")
            .find("section")
            .each(function () {
                const index = $(this).index();
                const header = $(this).find("h2");
                header.prepend(`<span data-toggle='${index}' class='toggleButton'>▼</span>`);

                header.click(function () {
                    const toggleButton = $(this).find(".toggleButton");
                    toggleButton.toggleClass("collapsed");
                    $(this).closest("section").find(".generationContainer").slideToggle();

                    // Update the master toggle state after a section is toggled
                    updateMasterToggleState();
                });
            });

        // Handle the master toggle button
        $("#masterToggle").click(function () {
            $(this).toggleClass("collapsed");
            const isCollapsed = $(this).hasClass("collapsed");
            const allPeople = $("#ahnentafelAncestorList").find("section .generationContainer");
            if (isCollapsed) {
                allPeople.slideUp();
                $(".toggleButton").addClass("collapsed");
            } else {
                allPeople.slideDown();
                $(".toggleButton").removeClass("collapsed");
            }
        });
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
        const buttonHTML = `<button class="small" id="formatButton" 
        title="Change the format of the birth and death details.  Cycle through four options."
        >Format</label>`;
        if ($("#formatButton").length === 0) {
            $("#ahnentafelHeaderBox #help-button").before(buttonHTML);
            const formatButton = $("#formatButton");
            formatButton.prop("checked", this.settings.tidy);
            const $this = this;
            formatButton.on("click", function () {
                $this.settings.format++;
                if ($this.settings.format > 4) {
                    $this.settings.format = 1;
                }
                $this.saveSettings();
                $this.applySettings();
            });
        }
    }

    // Load settings from localStorage
    loadSettings() {
        const defaultSettings = { tidy: false, format: 1 };
        const storedSettingsString = localStorage.getItem("ahnentafelSettings");
        let storedSettings = storedSettingsString ? JSON.parse(storedSettingsString) : null;

        // If storedSettings is not null, check for the 'format' property
        if (storedSettings) {
            // If 'format' is not present in storedSettings, set it to 1
            if (storedSettings.format === undefined) {
                storedSettings.format = 1;
            }
            return storedSettings;
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
        if (this.settings.format > 2) {
            this.setUniformDateColumnWidth();
        }
        /*
        if (this.settings.tidy) {
            $("#ahnentafelAncestorList").addClass("tidy");
        } else {
            $("#ahnentafelAncestorList").removeClass("tidy");
        }
        */
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
        $(".toggleButton,.descendantButton,.childOf,.parentOf").click(() => {
            // Using setTimeout to ensure the state is captured after it changes
            setTimeout(() => {
                this.captureState();
            }, 500);
        });
    }
};
