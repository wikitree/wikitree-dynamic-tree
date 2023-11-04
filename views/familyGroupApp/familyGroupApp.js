window.FamilyGroupAppView = class FamilyGroupAppView extends View {
    static APP_ID = "familyGroupApp";
    static setLinksToOpenInNewTab() {
        $("a").attr("target", "_blank");
    }
    static USstatesObjArray = [
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
    constructor(container_selector, person_id) {
        super(); // If there is a constructor in the parent class, make sure to call it.
        this.container_selector = container_selector;
        this.person_id = person_id;

        // Initialize instance properties
        this.keepSpouse = "";
        this.people = [];
        this.husband = 0;
        this.husbandWTID = "";
        this.wife = 0;
        this.wifeWTID = "";
        this.calledPeople = [this.person_id];
        this.calls = 1;
        this.privates = 0;
        this.references = [];
        // Any other properties that need to be initialized.
    }

    meta() {
        return {
            title: "Family Group App",
            description: `Produce a printer-friendly Family Group Sheet with the Family Group App.`,
            docs: "",
        };
    }

    initializeLocalStates() {
        this.keepSpouse = "";
        this.people = [];
        this.husband = 0;
        this.husbandWTID = "";
        this.wife = 0;
        this.wifeWTID = "";
        // Ensure that this.person_id is already in the correct format before this point.
        this.calledPeople = [this.person_id];
        this.calls = 1;
        this.privates = 0;
        this.references = [];
    }

    getRels(rel, person, theRelation = false) {
        const peeps = [];
        // Check if 'rel' is undefined or null
        if (typeof rel === "undefined" || rel === null) {
            return false;
        }
        const pKeys = Object.keys(rel);
        pKeys.forEach((pKey) => {
            const aPerson = rel[pKey];
            // If 'theRelation' is provided, add it to the person object
            if (theRelation) {
                aPerson.Relation = theRelation;
            }
            peeps.push(aPerson);
        });
        return peeps;
    }

    getFamily(WTID) {
        let bioFormat = "text";
        if ($("#getBios").prop("checked")) {
            bioFormat = "both";
        }

        const apiUrl = "https://api.wikitree.com/api.php";
        const requestData = {
            action: "getRelatives",
            getSpouses: "1",
            getChildren: "1",
            getParents: "1",
            getSiblings: "1",
            keys: WTID,
            fields: "Spouse,NoChildren,IsLiving,BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Nicknames,Derived.LongName,Derived.LongNamePrivate,Derived.BirthName,Derived.BirthNamePrivate,Manager,MiddleName,MiddleInitial,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Bio,Privacy",
            bioFormat: bioFormat,
        };

        $.ajax({
            url: apiUrl,
            data: requestData,
            crossDomain: true,
            xhrFields: { withCredentials: true },
            type: "POST",
            dataType: "json",
            success: (data) => {
                const thePeople = data[0]?.items;
                if (thePeople) {
                    thePeople.forEach((aPerson) => {
                        const mPerson = aPerson.person;

                        // Populate spouse, children, siblings, and parents
                        ["Spouse", "Child", "Sibling", "Parent"].forEach((relation) => {
                            const relatives = this.getRels(mPerson[`${relation}s`], mPerson, relation);
                            mPerson[relation] = relatives;
                        });

                        this.people.push(mPerson);
                        console.log("this.people", this.people);

                        // Recursive call and makeFamilySheet() as in your original code
                        if (this.people[0].Spouse) {
                            this.people[0].Spouse.forEach((aSpouse) => {
                                if (!this.calledPeople.includes(aSpouse.Name)) {
                                    this.calledPeople.push(aSpouse.Name);
                                    this.getFamily(aSpouse.Name);
                                }
                            });
                        }
                        if (this.people[0].Child) {
                            this.people[0].Child.forEach((aChild) => {
                                if (!this.calledPeople.includes(aChild.Name)) {
                                    this.calledPeople.push(aChild.Name);
                                    this.getFamily(aChild.Name);
                                }
                            });
                        }
                        if (this.calledPeople.length === this.people.length) {
                            this.makeFamilySheet();
                        }
                    });
                } else {
                    this.privateQ();
                    $("#tree").slideUp();
                }
            },
        });
    }

    init(container_selector, person_id) {
        this.person_id = person_id;
        this.$container = $(container_selector); // Cache the jQuery object for the container
        $(this.$container).addClass(FamilyGroupAppView.APP_ID);

        // Initialize local variables and states
        this.initializeLocalStates();

        // Setup event listeners
        this.setupEventListeners();

        // Load the family group sheet HTML into the container
        this.loadFamilyGroupSheetHTML();

        this.startIt();
    }

    startIt() {
        this.keepSpouse = "";

        $("#familySheetFormTable,#tree,#notesAndSources,.tableContainer,#privateQ").remove();
        $("<img id='tree' src='views/familyGroupApp/images/tree.gif'>").appendTo($(this.$container));

        this.getFamily(this.person_id);

        if (localStorage.fgsInfoState == "removed") {
            $("#fgsInfo").addClass("removed");
        }
    }

    setupEventListeners() {
        // Delegated event listeners for checkbox changes
        this.$container.on("change", "#showBaptism", () =>
            this.toggleStyle("showBaptismStyle", "tr.baptismRow{display:none;}", "baptChrist input")
        );
        this.$container.on("change", "#showBurial", () =>
            this.toggleStyle("showBurialStyle", "tr.buriedRow{display:none;}")
        );
        this.$container.on("change", "#showNicknames", () =>
            this.toggleStyle(
                "showNicknamesStyle",
                ".familySheetForm caption span.nicknames,span.nicknames{display:none;}"
            )
        );
        this.$container.on("change", "#showParentsSpousesDates", () =>
            this.toggleStyle(
                "showParentsSpousesDatesStyle",
                ".familySheetForm span.parentDates,.familySheetForm span.spouseDates{display:none;}"
            )
        );
        this.$container.on("change", "#showOtherLastNames", () =>
            this.toggleStyle(
                "showOtherLastNamesStyle",
                ".familySheetForm caption span.otherLastNames,span.otherLastNames{display:none;}"
            )
        );
        this.$container.on("change", "#useColour", () =>
            this.toggleStyle(
                "useColourStyle",
                ".familySheetForm tr.marriedRow, .familySheetForm caption, .roleRow[data-gender],.roleRow[data-gender] th, #familySheetFormTable thead tr th:first-child{background-color: #fff; border-left:1px solid black;border-right:1px solid black;}"
            )
        );
        this.$container.on("change", "#showWTIDs", () =>
            this.toggleStyle("showWTIDsStyle", ".familySheetForm .fsWTID{display:inline-block;}")
        );
        this.$container.on("change", "#showBios", () => this.toggleBios());

        // Delegated event listeners for radio button changes
        this.$container.on("change", "input[type=radio][name=baptismChristening]", () => this.setBaptChrist());
        this.$container.on("change", "input[type=radio][name=statusChoice]", () => this.setStatusChoice());
        this.$container.on("change", "input[type=radio][name=showGender]", () => this.setShowGender());

        // Delegated click event listeners for options and information panels
        this.$container.on("click", "#fgsInfo", () => this.handleSlideToggle("#fgsInfo", "fgsInfoState"));
        this.$container.on("click", "#fgsOptions x, #fgsOptions .notesHeading", () =>
            this.handleSlideToggle("#fgsOptions", "fgsOptionsState")
        );

        // Delegated change event listener for the long month display setting
        this.$container.on("change", "#longMonth", (event) => {
            const isChecked = $(event.target).is(":checked");
            $(".date").each((index, element) => {
                $(element).text(this.monthFormat($(element).text(), isChecked ? "full" : "short"));
            });
        });

        // Listeners
        this.$container.on("click", ".fsName a, caption a", function (e) {
            e.preventDefault();
        });

        this.$container.on("click", "td[data-name],span[data-name]", (e) => {
            const $this = $(e.currentTarget);
            const dTR = $this.closest("tr");
            this.keepSpouse = dTR.attr("data-person") || "";

            $("#wtid").val($this.attr("data-name"));
            $("#familySheetGo").trigger("click");
        });

        this.$container.on("change", "#showBaptism", (e) => {
            const $this = $(e.currentTarget);
            if ($this.prop("checked") == false) {
                $("<style id='showBaptismStyle'>tr.baptismRow{display:none;}</style>").appendTo(this.$container);
                $("#baptChrist input").prop("disabled", true);
            } else {
                $("#showBaptismStyle").remove();
                $("#baptChrist input").prop("disabled", false);
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#showBurial", (e) => {
            const $this = $(e.currentTarget);
            if ($this.prop("checked") == false) {
                $("<style id='showBurialStyle'>tr.buriedRow{display:none;}</style>").appendTo(this.$container);
            } else {
                $("#showBurialStyle").remove();
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#showNicknames", (e) => {
            const $this = $(e.currentTarget);
            if ($this.prop("checked") == false) {
                $(
                    "<style id='showNicknamesStyle'>.familySheetForm caption span.nicknames,span.nicknames{display:none;}</style>"
                ).appendTo(this.$container);
            } else {
                $("#showNicknamesStyle").remove();
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#showParentsSpousesDates", (e) => {
            const $this = $(e.currentTarget);
            if ($this.prop("checked") == false) {
                $(
                    "<style id='showParentsSpousesDatesStyle'>.familySheetForm  span.parentDates,.familySheetForm span.spouseDates{display:none;}</style>"
                ).appendTo(this.$container);
            } else {
                $("#showParentsSpousesDatesStyle").remove();
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#husbandFirst", (e) => {
            const $this = $(e.currentTarget);
            const husbandID = $("tr.roleRow[data-role='Husband']").attr("data-name");
            const husbandCitations = $("#citationList li[data-wtid='" + this.htmlEntities(husbandID) + "']");
            const husbandNameCaption = $(
                "caption span.fsWTID:contains('" + this.htmlEntities(husbandID) + "')"
            ).parent();
            let wifeNameCaption;
            if (people[0].Name != husbandID) {
                wifeNameCaption = $(
                    "caption span.fsWTID:contains('" + this.htmlEntities(people[0].Name) + "')"
                ).parent();
            }

            const clonedMarriage = $(".marriedRow").eq(0);
            if ($this.prop("checked") == true) {
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
                $("#citationList li[data-wtid='" + this.htmlEntities(people[0].Name) + "']").prependTo(
                    $("#citationList")
                );

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

            this.storeVal($this);

            $(".theBio").find("tr.marriedRow").remove();
        });

        if ($(".nicknames").length == 0) {
            $(".showNicknamesSpan").hide();
        }

        this.$container.on("change", "#longMonth", (e) => {
            const $this = $(e.currentTarget);
            this.storeVal($this);
            let opt = "short";
            if ($this.prop("checked") == true) {
                opt = "full";
            }
            $(".date").each(() => {
                $this.text(this.monthFormat($this.text(), opt));
            });
        });

        this.$container.on("change", "#showOtherLastNames", (e) => {
            const $this = $(e.currentTarget);
            if ($this.prop("checked") == false) {
                $(
                    "<style id='showOtherLastNamesStyle'>.familySheetForm caption span.otherLastNames,span.otherLastNames{display:none;}</style>"
                ).appendTo(this.$container);
            } else {
                $("#showOtherLastNamesStyle").remove();
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#useColour", (e) => {
            if ($this.prop("checked") == false) {
                $(
                    "<style id='useColourStyle'>.familySheetForm tr.marriedRow, .familySheetForm caption, .roleRow[data-gender],.roleRow[data-gender] th, #familySheetFormTable thead tr th:first-child{background-color: #fff; border-left:1px solid black;border-right:1px solid black;}    </style>"
                ).appendTo(this.$container);
            } else {
                $("#useColourStyle").remove();
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#showBios", (e) => {
            const $this = $(e.currentTarget);
            if ($this.prop("checked") == true) {
                $(".theBio").slideDown();
                setTimeout(function () {
                    $("<style id='showBiosStyle'>.familySheetForm .bioRow div.theBio{display:block;}</style>").appendTo(
                        this.$container
                    );
                }, 1000);
            } else {
                $(".theBio").slideUp();
                setTimeout(function () {
                    $("#showBiosStyle").remove();
                }, 1000);
            }
            this.storeVal($this);
        });
        this.$container.on("change", "#showWTIDs", (e) => {
            const $this = $(e.currentTarget);
            if ($(this).prop("checked") == true) {
                $("<style id='showWTIDsStyle'>.familySheetForm .fsWTID{display:inline-block;}</style>").appendTo(
                    this.$container
                );
            } else {
                $("#showWTIDsStyle").remove();
            }
            this.storeVal($this);
        });

        this.$container.on("change", "input[type=radio][name=baptismChristening]", (e) => {
            const $this = $(e.currentTarget);
            this.setBaptChrist();
            this.storeVal($this);
        });

        this.$container.on("click", "#fgsInfo", (e) => {
            $this.slideUp("slow");
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
        this.$container.on("click", "#fgsOptions x,#fgsOptions .notesHeading", () => {
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

        this.$container.on(
            "click",
            ".BaptismDate, .BaptismPlace, .buriedDate, .buriedPlace, caption, h1, .birthRow td, .deathRow td, .otherMarriagePlace, span.marriageDate, .marriedPlace, .editable",
            (e) => {
                const $this = $(e.currentTarget);
                // Check if an input already exists within the clicked element
                if ($this.find("input").length === 0) {
                    let inputBox;

                    // Determine if the clicked element is a CAPTION
                    const isCaption = $this.prop("tagName") === "CAPTION";
                    const initialValue = isCaption ? $this.html() : $this.text();

                    // Create the input box
                    inputBox = $("<input style='background:white;' type='text' class='edit'>").val(initialValue);

                    // Clear existing text and append input box
                    $this.empty().append(inputBox);

                    // Focus on the input box
                    inputBox.focus();

                    // Event handlers for the input box
                    inputBox.keypress((e) => {
                        if (e.which === 13) {
                            // Enter key
                            this.closeInputs();
                        }
                    });

                    inputBox.focusout((e) => {
                        this.closeInputs();
                    });
                }
            }
        );
        this.$container.on("click", "#notesNotes", (e) => {
            const $this = $(e.currentTarget);
            if ($this.find("textarea").length == 0) {
                const textBox = $("<textarea class='edit'>" + this.br2nl($this.html()) + "</textarea>");
                $this.text("");
                $this.append(textBox);
                textBox.focus();

                textBox.focusout(() => {
                    this.closeInputs();
                });
            }
        });
    }

    setStatusChoice() {
        // Get the value of the selected radio button for statusChoice
        const statusChoiceValue = this.$container.find('input[name="statusChoice"]:checked').val();

        // Apply this value to change the status in your UI
        // For example, if you're using this to toggle classes or content, it might look like this:
        this.updateStatusDisplay(statusChoiceValue);
    }

    updateStatusDisplay(choice) {
        // Here, we'll use 'choice' to determine what to display or how to update the UI
        // This is just a placeholder - you would replace this with your actual logic
        if (choice === "symbols") {
            // Update the UI to show symbols
        } else if (choice === "abbreviations") {
            // Update the UI to show abbreviations
        }
    }

    setShowGender() {
        // Get the value of the selected radio button for showGender
        const showGenderValue = this.$container.find('input[name="showGender"]:checked').val();

        // Apply this value to change how genders are displayed in your UI
        // For example, if you're updating text or classes, it might look like this:
        this.updateGenderDisplay(showGenderValue);
    }

    updateGenderDisplay(genderDisplayOption) {
        // Here, you'll use 'genderDisplayOption' to determine how to display gender
        // This could involve changing text or classes on gender labels
        // For example:
        this.$container.find(".genderDisplay").each(function () {
            const $this = $(this);
            switch (genderDisplayOption) {
                case "initial":
                    // Display just the initial (e.g., 'M' or 'F')
                    $this.text($this.data("genderInitial"));
                    break;
                case "word":
                    // Display the full word (e.g., 'Male' or 'Female')
                    $this.text($this.data("genderWord"));
                    break;
                case "none":
                    // Don't display gender
                    $this.text("");
                    break;
            }
        });
    }

    toggleBios() {
        // Assuming you have a checkbox with id 'showBios' to control the visibility of bios
        const shouldShowBios = this.$container.find("#showBios").is(":checked");

        // Toggle the visibility based on the checkbox state
        // Assuming bios are marked with a specific class in your HTML, e.g., 'bio'
        this.$container.find(".bio").each(function () {
            if (shouldShowBios) {
                $(this).slideDown();
            } else {
                $(this).slideUp();
            }
        });
    }

    handleWTIDKeydown(event) {
        if (event.keyCode === 13) {
            this.handleFamilySheetGoClick();
        }
    }

    loadFamilyGroupSheetHTML() {
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
        </div>`;
        this.$container.html(familyGroupSheetHTML);
    }

    ancestorType(generation, gender) {
        let relType = "";
        if (generation > 0) {
            if (gender === "Female") {
                relType = "Mother";
            }
            if (gender === "Male") {
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
            relType = this.ordinal(generation - 2) + " " + relType;
        }
        return relType;
    }

    decimalToBinary(x) {
        let bin = 0;
        let rem,
            i = 1;
        while (x !== 0) {
            rem = x % 2;
            x = parseInt(x / 2);
            bin = bin + rem * i;
            i = i * 10;
        }
        return bin;
    }

    ahnenToMF(ahnen) {
        let bin = this.decimalToBinary(ahnen);
        bin = bin.toString().substring(1);
        return bin.replaceAll("1", "M").replaceAll("0", "F");
    }

    ahnenToMF2(ahnen) {
        let mf = this.ahnenToMF(ahnen);
        let mfTitle = "Your";
        for (let i = 0; i < mf.length; i++) {
            mfTitle += mf[i] === "M" ? " mother's" : " father's";
        }
        const mfTitleOut = mfTitle.substring(0, mfTitle.length - 9); // Adjusted from -7 to -9 to remove 's father' or 's mother'
        return [mf, mfTitleOut];
    }

    getAge(birth, death) {
        let age = death.getFullYear() - birth.getFullYear();
        const m = death.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    ageAtDeath(person, showStatus = true) {
        let about = "";
        let diedAged = "";
        if (person?.BirthDate) {
            if (
                person["BirthDate"].length === 10 &&
                person["BirthDate"] !== "0000-00-00" &&
                person["DeathDate"].length === 10 &&
                person["DeathDate"] !== "0000-00-00"
            ) {
                const obDateBits = person["BirthDate"].split("-");
                const odDateBits = person["DeathDate"].split("-");
                about = this.approximateDate(obDateBits) || this.approximateDate(odDateBits);

                diedAged = this.getAge(
                    new Date(obDateBits[0], obDateBits[1] - 1, obDateBits[2]),
                    new Date(odDateBits[0], odDateBits[1] - 1, odDateBits[2])
                );
            } else {
                diedAged = "";
            }
        }
        if (person?.DataStatus?.DeathDate && person.DataStatus.DeathDate === "after") {
            about = ">";
        }
        if (diedAged === "") {
            return false;
        } else if (!showStatus) {
            return diedAged;
        } else {
            return about + diedAged;
        }
    }

    // Helper method to handle approximate dates
    approximateDate(dateBits) {
        let about = "";
        if (dateBits[1] === "00") {
            dateBits[1] = "06"; // Mid-year if month is unknown
            dateBits[2] = "15"; // Mid-month if day is unknown
            about = "~";
        } else if (dateBits[2] === "00") {
            dateBits[2] = "15"; // Mid-month if day is unknown
            about = "~";
        }
        return about;
    }

    nl2br(str, replaceMode, isXhtml) {
        const breakTag = isXhtml ? "<br />" : "<br>";
        const replaceStr = replaceMode ? "$1" + breakTag : "$1" + breakTag + "$2";
        return (str + "").replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, replaceStr);
    }

    br2nl(str, replaceMode) {
        const replaceStr = replaceMode ? "\n" : "";
        // Includes <br>, <BR>, <br />, </br>
        return str.replace(/<\s*\/?br\s*[\/]?>/gi, replaceStr);
    }

    capitalizeFirstLetter(string, only = 0) {
        // only = only change the first letter
        if (only === 0) {
            string = string.toLowerCase();
        }
        const bits = string.split(" ");
        let out = "";
        bits.forEach(function (abit) {
            out += abit.charAt(0).toUpperCase() + abit.slice(1) + " ";
        });
        function replacer(match, p1) {
            return "-" + p1.toUpperCase();
        }
        out = out.replace(/\-([a-z])/, replacer);
        return out.trim();
    }

    htmlEntities(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }

    displayName(fPerson) {
        const getLongestName = (...names) =>
            names.reduce((longest, name) => (longest.length >= name.length ? longest : name), "");

        // Helper to clean and check string properties.
        const cleanName = (name) => typeof name === "string" && name.trim() !== "";

        // Select the longest name variant.
        const longName = cleanName(fPerson.LongName) ? fPerson.LongName.replace(/\s\s+/g, " ") : "";
        const longNamePrivate =
            cleanName(fPerson.MiddleName) && cleanName(fPerson.LongNamePrivate)
                ? fPerson.LongNamePrivate.replace(/\s\s+/g, " ")
                : "";

        // Construct the full name from components.
        let fullName = "";
        const nameComponents = [
            "Prefix",
            "FirstName",
            "RealName",
            "MiddleName",
            "Nicknames",
            "LastNameAtBirth",
            "LastNameCurrent",
            "Suffix",
        ];
        nameComponents.forEach((component) => {
            if (cleanName(fPerson[component])) {
                if (component === "LastNameAtBirth" && fPerson.LastNameAtBirth !== fPerson.LastNameCurrent) {
                    fullName += `(${fPerson.LastNameAtBirth}) `;
                } else if (component === "Nicknames") {
                    const nicknames = fPerson.Nicknames.split(/,\s?/)
                        .map((nick) => `“${nick}”`)
                        .join(" ");
                    fullName += `${nicknames} `;
                } else if (component !== "RealName" || !fPerson.FirstName) {
                    fullName += `${fPerson[component]} `;
                }
            }
        });

        // Determine the display and short names.
        const fName = getLongestName(longName, longNamePrivate, fullName);
        const sName = fPerson.ShortName || fName;

        return [fName.trim(), sName.trim()];
    }

    peopleToTable(kPeople) {
        let displayName = this.displayName(kPeople[0])[0];
        let rClass = "";
        let isDecades = false;
        let bDate = "";
        let dDate = "";
        let oName, oBDate, oDDate, linkName, aLine, marriageDeets, dMdate, spouseLine;

        // Check if we are in the app context and update the display name accordingly
        if ($(".app").length && kPeople[0].MiddleName) {
            displayName = displayName.replace(kPeople[0].MiddleName + " ", "");
        }

        // Create the table with jQuery
        const kTable = $("<div>", { class: "familySheet" })
            .append($("<w>").text("↔"), $("<x>").text("x"))
            .append(
                $("<table>")
                    .append(
                        $("<caption>").html(
                            $("<a>", {
                                href: "https://www.wikitree.com/wiki/" + this.htmlEntities(kPeople[0].Name),
                                text: displayName,
                            })
                        )
                    )
                    .append(
                        $("<thead>").append(
                            $("<tr>")
                                .append($("<th>").text("Relation"))
                                .append($("<th>").text("Name"))
                                .append($("<th>").text("Birth Date"))
                                .append($("<th>").text("Birth Place"))
                                .append($("<th>").text("Death Date"))
                                .append($("<th>").text("Death Place"))
                        )
                    )
                    .append($("<tbody>"))
            );

        // Loop through each person to populate the table
        kPeople.forEach((kPers) => {
            // Initialize display variables
            kPers.RelationShow = kPers.Relation || "";
            rClass = kPers.Active ? "self" : "";

            // Determine the birth date
            bDate = kPers.BirthDate || "";
            if (!bDate && kPers.BirthDateDecade) {
                bDate = kPers.BirthDateDecade.slice(0, -1) + "s";
                isDecades = true;
            }

            // Determine the death date
            dDate = kPers.DeathDate || "";
            if (!dDate && kPers.DeathDateDecade) {
                dDate = kPers.DeathDateDecade.slice(0, -1) + "s";
            }

            // Normalize null values to empty strings for locations
            kPers.BirthLocation = kPers.BirthLocation || "";
            kPers.DeathLocation = kPers.DeathLocation || "";

            // Generate the display name
            oName = this.displayName(kPers)[0];

            // Process the relation to display proper titles
            if (kPers.Relation) {
                kPers.Relation = kPers.Relation.replace(/s$/, "").replace(/ren$/, "");
                kPers.RelationShow = rClass !== "self" ? kPers.Relation : "";
            }

            // Prepare the data for a new row
            if (oName) {
                oBDate = this.ymdFix(bDate);
                oDDate = this.ymdFix(dDate);
                if (isDecades) {
                    oBDate = kPers.BirthDateDecade;
                    oDDate = kPers.DeathDateDecade || "";
                }
                linkName = this.htmlEntities(kPers.Name);
                aLine = $("<tr>")
                    .attr({
                        "data-name": kPers.Name,
                        "data-birthdate": bDate.replace(/-/g, ""),
                        "data-relation": kPers.Relation,
                        "class": `${rClass} ${kPers.Gender}`,
                    })
                    .append(
                        $("<td>").text(kPers.RelationShow),
                        $("<td>").html(
                            $("<a>", {
                                href: `https://www.wikitree.com/wiki/${linkName}`,
                                target: "_blank",
                                text: oName,
                            })
                        ),
                        $("<td>", { class: "aDate" }).text(oBDate),
                        $("<td>").text(kPers.BirthLocation),
                        $("<td>", { class: "aDate" }).text(oDDate),
                        $("<td>").text(kPers.DeathLocation)
                    );
                kTable.find("tbody").append(aLine);
            }

            // Check and populate spouse relation and marriage details
            if (kPers.Relation === "Spouse") {
                let marriageDetails = "m."; // start with the abbreviation for "married"

                // Format and add marriage date if available
                if (kPers.marriage_date) {
                    let formattedMarriageDate = ymdFix(kPers.marriage_date); // assuming ymdFix is a function to format the date
                    marriageDetails += " " + formattedMarriageDate;
                }

                // Add marriage location if available
                if (kPers.marriage_location) {
                    marriageDetails += " at " + kPers.marriage_location;
                }

                // Only add the details row if there are details beyond the initial "m."
                if (marriageDetails.length > 2) {
                    let spouseDetailsRow = $(
                        "<tr class='marriageRow " +
                            kPers.Gender +
                            "' data-spouse='" +
                            kPers.Name +
                            "'>" +
                            "<td>&nbsp;</td>" + // Empty cell under "Relation"
                            "<td colspan='5'>" +
                            marriageDetails +
                            "</td>" + // Merge cells for marriage details
                            "</tr>"
                    );
                    kTable.find("tbody").append(spouseDetailsRow);
                }
            }
        });

        // Sort rows and append them to the table
        this.sortAndAppendRows(kTable, ["Parent", "Sibling", "Spouse", "Child"]);

        return kTable;
    }

    sortAndAppendRows(kTable, familyOrder) {
        familyOrder.forEach((relWord) => {
            kTable.find(`tr[data-relation='${relWord}']`).appendTo(kTable.find("tbody"));
        });

        kTable.find(".marriageRow").each(function () {
            $(this).insertAfter(kTable.find(`tr[data-name='${$(this).data("spouse")}']`));
        });
    }

    getOffset(el) {
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
        };
    }

    getTheYear(theDate, ev, person) {
        if (!this.isOK(theDate)) {
            if (ev === "Birth" || ev === "Death") {
                theDate = person[ev + "DateDecade"];
            }
        }
        const theDateM = theDate.match(/[0-9]{4}/);
        if (this.isOK(theDateM)) {
            return parseInt(theDateM[0]);
        } else {
            return false;
        }
    }

    getAge(birth, death) {
        // Must be date objects
        let age = death.getFullYear() - birth.getFullYear();
        let m = death.getMonth() - birth.getMonth();

        if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
            age--;
        }

        return age;
    }

    dateToYMD(enteredDate) {
        let enteredD, eDMonth, eDYear, eDDate;

        if (enteredDate.match(/[0-9]{3,4}\-[0-9]{2}\-[0-9]{2}/)) {
            enteredD = enteredDate;
        } else {
            eDMonth = "00";
            eDYear = "00";

            eDYear = enteredDate.match(/[0-9]{3,4}/);
            if (eDYear !== null) {
                eDYear = eDYear[0];
            }

            eDDate = enteredDate.match(/\b[0-9]{1,2}\b/);
            if (eDDate !== null) {
                eDDate = eDDate[0].padStart(2, "0");
            }
            if (eDDate === null) {
                eDDate = "00";
            }

            // Map month names to numbers
            const monthMapping = [
                { regex: /jan/i, value: "01" },
                { regex: /feb/i, value: "02" },
                { regex: /mar/i, value: "03" },
                { regex: /apr/i, value: "04" },
                { regex: /may/i, value: "05" },
                { regex: /jun/i, value: "06" },
                { regex: /jul/i, value: "07" },
                { regex: /aug/i, value: "08" },
                { regex: /sep/i, value: "09" },
                { regex: /oct/i, value: "10" },
                { regex: /nov/i, value: "11" },
                { regex: /dec/i, value: "12" },
            ];

            monthMapping.forEach((month) => {
                if (enteredDate.match(month.regex) !== null) {
                    eDMonth = month.value;
                }
            });

            enteredD = `${eDYear}-${eDMonth}-${eDDate}`;
        }

        return enteredD;
    }

    timeline(jqClicked) {
        const window = this.getWindow(); // Assuming getWindow is a method that returns the window object
        const $ = this.getJQuery(); // Assuming getJQuery is a method that returns the jQuery object

        let tPerson = "";
        let fam = [];
        let familyFacts = [];
        const events = ["Birth", "Death", "marriage"];

        this.people.forEach((oPers) => {
            if (oPers.Name === jqClicked.attr("data-name")) {
                tPerson = oPers;
            }
        });

        fam = [tPerson].concat(tPerson.Parent, tPerson.Sibling, tPerson.Spouse, tPerson.Child);

        console.log(fam);

        const startDate = this.getTheYear(tPerson.BirthDate, "Birth", tPerson);

        fam.forEach((aPerson) => {
            events.forEach((ev) => {
                let evDate = "";
                let evLocation = "";

                if (aPerson[ev + "Date"]) {
                    evDate = aPerson[ev + "Date"];
                    evLocation = aPerson[ev + "Location"];
                } else if (aPerson[ev + "DateDecade"]) {
                    evDate = aPerson[ev + "DateDecade"];
                    evLocation = aPerson[ev + "Location"];
                }

                if (ev === "marriage" && aPerson[ev + "_date"]) {
                    evDate = aPerson[ev + "_date"];
                    evLocation = aPerson[ev + "_location"];
                }

                if (aPerson.Relation) {
                    aPerson.Relation = aPerson.Relation.replace(/s$/, "").replace(/ren$/, "");
                }

                if (evDate !== "" && evDate !== "0000" && this.isOK(evDate)) {
                    const fName = aPerson.FirstName || aPerson.RealName;
                    const bDate = aPerson.BirthDate || aPerson.BirthDateDecade;
                    const mBio = aPerson.bio || "";

                    if (evLocation === undefined) {
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
                const tlTemplates = aPerson.bio.match(/\{\{[^]*?\}\}/gm);
                if (tlTemplates !== null) {
                    const warTemplates = [
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

                    tlTemplates.forEach((aTemp) => {
                        let evDateStart = "";
                        let evDateEnd = "";
                        let evStart = "";
                        let evEnd = "";
                        const aTempClean = aTemp.replaceAll(/[{}]/g, "");
                        const bits = aTempClean.split("|");
                        const templateTitle = bits[0].trim();

                        bits.forEach((aBit) => {
                            const aBitBits = aBit.split("=");
                            const aBitField = aBitBits[0].trim();
                            if (aBitBits[1]) {
                                const aBitFact = aBitBits[1].trim().replaceAll(/\n/g, "");

                                if (warTemplates.includes(templateTitle) && this.isOK(aBitFact)) {
                                    if (aBitField === "startdate") {
                                        evDateStart = this.dateToYMD(aBitFact);
                                        evStart = `Joined ${templateTitle}`;
                                    } else if (aBitField === "enddate") {
                                        evDateEnd = this.dateToYMD(aBitFact);
                                        evEnd = `Left ${templateTitle}`;
                                    } else if (aBitField === "enlisted") {
                                        evDateStart = this.dateToYMD(aBitFact);
                                        evStart = `Enlisted for ${templateTitle.replace("american", "American")}`;
                                    } else if (aBitField === "discharged") {
                                        evDateEnd = this.dateToYMD(aBitFact);
                                        evEnd = `Discharged from ${templateTitle.replace("american", "American")}`;
                                    } else if (aBitField === "branch") {
                                        evLocation = aBitFact;
                                    }
                                }
                            }
                        });

                        if (this.isOK(evDateStart)) {
                            familyFacts.push([
                                evDateStart,
                                evLocation,
                                aPerson.FirstName,
                                aPerson.LastNameAtBirth,
                                aPerson.LastNameCurrent,
                                aPerson.BirthDate,
                                aPerson.Relation,
                                aPerson.bio,
                                evStart,
                                aPerson.Name,
                            ]);
                        }
                        if (this.isOK(evDateEnd)) {
                            familyFacts.push([
                                evDateEnd,
                                evLocation,
                                aPerson.FirstName,
                                aPerson.LastNameAtBirth,
                                aPerson.LastNameCurrent,
                                aPerson.BirthDate,
                                aPerson.Relation,
                                aPerson.bio,
                                evEnd,
                                aPerson.Name,
                            ]);
                        }
                    });
                }
            }
        });

        // Sorting family facts by date
        familyFacts.sort((a, b) => this.compareDates(a[0], b[0]));

        let tName = tPerson.FirstName || tPerson.RealName;
        if (tPerson.LastNameAtBirth !== tPerson.LastNameCurrent) {
            tName = `${tName} (${tPerson.LastNameAtBirth}) ${tPerson.LastNameCurrent}`;
        }

        // Create the timeline table
        const timelineTable = $(
            `<div class='wrap timeline' data-wtid='${tPerson.Name}'>
     <w>↔</w><x>x</x>
     <table class='timelineTable'>
       <caption>Events in the life of ${tName}'s family</caption>
       <thead>
         <th class='tlDate'>Date</th>
         <th class='tlBioAge'>Age (${tPerson.FirstName})</th>
         <th class='tlRelation'>Relation</th>
         <th class='tlName'>Name</th>
         <th class='tlAge'>Age</th>
         <th class='tlEventName'>Event</th>
         <th class='tlEventLocation'>Location</th>
       </thead>
     </table>
   </div>`
        );

        // Prepend the timeline table to the body
        timelineTable.prependTo($(this.$container));
        timelineTable.css({ top: window.pointerY - 30, left: 10 });

        let bpDead = false;
        let bpDeadAge = 0;

        // Process each fact and add it to the timeline
        familyFacts.forEach((aFact) => {
            const [evDate, evLocation, fName, lastNameAtBirth, lastNameCurrent, bDate, relation, bio, ev, personName] =
                aFact;
            const showDate = this.formatDateForDisplay(evDate);
            const tlDate = `<td class='tlDate'>${showDate}</td>`;

            const bioAge = this.calculateBioAge(tPerson, evDate);
            const tlBioAge = `<td class='tlBioAge'>${bioAge}</td>`;

            const tlRelation = `<td class='tlRelation'>${relation || ""}</td>`;
            const tlFirstName = `<td class='tlFirstName'><a target='_blank' href='https://www.wikitree.com/wiki/${personName}'>${fName}</a></td>`;

            const eventAge = this.calculateEventAge(aFact);
            const tlAge = `<td class='tlAge'>${eventAge}</td>`;

            const tlEventName = `<td class='tlEventName'>${this.capitalize(ev)}</td>`;
            const tlEventLocation = `<td class='tlEventLocation'>${evLocation}</td>`;

            const classText = personName === tPerson.Name ? "BioPerson " + ev : ev;
            const tlTR = $(
                `<tr class='${classText}'>${tlDate}${tlBioAge}${tlRelation}${tlFirstName}${tlAge}${tlEventName}${tlEventLocation}</tr>`
            );

            // Append the row to the timeline table
            timelineTable.find(".timelineTable").append(tlTR);

            if (ev === "Death" && personName === tPerson.Name) {
                bpDead = true;
                bpDeadAge = bioAge;
            }
        });

        // Add interaction functionality to the timeline table
        timelineTable.slideDown("slow");
        timelineTable.find("x").click(() => {
            timelineTable.slideUp();
        });
        timelineTable.find("w").click(() => {
            timelineTable.toggleClass("wrap");
        });

        // Make the timeline table draggable and collapsible
        timelineTable.draggable();
        timelineTable.dblclick(() => {
            timelineTable.slideUp("swing");
        });
    }

    // Helper methods for date comparison, formatting, age calculation, etc.
    compareDates(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1 - d2;
    }

    formatDateForDisplay(date) {
        if (date.includes("-00")) {
            date = date.replace("-00", "");
        }
        return date;
    }

    calculateBioAge(person, eventDate) {
        const birthDate = person.BirthDate || person.BirthDateDecade;
        if (!birthDate || birthDate.includes("0000")) return "";
        const birth = new Date(birthDate);
        const event = new Date(eventDate);
        let age = event.getFullYear() - birth.getFullYear();
        const m = event.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && event.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    calculateEventAge(fact) {
        const [eventDate, , , , , birthDate] = fact;
        if (!birthDate || birthDate.includes("0000")) return "";
        const birth = new Date(birthDate);
        const event = new Date(eventDate);
        let age = event.getFullYear() - birth.getFullYear();
        const m = event.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && event.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    capitalize(event) {
        return event.charAt(0).toUpperCase() + event.slice(1).toLowerCase();
    }

    doFamilySheet(fPerson) {
        let theClickedName = fPerson.Name;
        let hidIt = false;
        let thisFamily = [];
        let kkTable = "";
        let theLeft = 0;

        // Replace spaces with underscores for the id
        let familySheetId = theClickedName.replace(/ /g, "_") + "_family";

        // Toggle the family sheet if it already exists
        if ($("#" + familySheetId).length) {
            $("#" + familySheetId).fadeToggle();
            hidIt = true;
        }

        if (!hidIt) {
            // Concatenate the person with their relatives to form the family array
            thisFamily = [fPerson].concat(fPerson.Parent, fPerson.Sibling, fPerson.Spouse, fPerson.Child);

            // Generate the table from the family data
            kkTable = this.peopleToTable(thisFamily);
            kkTable.prependTo(this.$container);
            kkTable.attr("id", familySheetId);
            kkTable.draggable();

            // Fade out the table on double click
            kkTable.on("dblclick", function () {
                $(this).fadeOut();
            });

            // Adjust the table position
            theLeft = this.getOffset(fPerson.element).left;
            kkTable.css({ top: this.getOffset(fPerson.element).top + 50, left: theLeft });

            // Re-adjust on window resize
            $(window).resize(() => {
                if (kkTable.length) {
                    theLeft = this.getOffset(fPerson.element).left;
                    kkTable.css({ top: this.getOffset(fPerson.element).top + 50, left: theLeft });
                }
            });

            // Close button logic
            kkTable
                .find(".familySheet x")
                .off()
                .click(function () {
                    $(this).parent().fadeOut();
                });

            // Toggle wrap class on click
            kkTable
                .find(".familySheet w")
                .off()
                .click(function () {
                    $(this).parent().toggleClass("wrap");
                });
        }
    }

    showFamilySheet(jq) {
        let theClicked = jq;
        let hidIt = false; // Initialize hidIt to a default value
        let theClickedName = jq.closest("tr").attr("data-name");
        let fsReady = false; // Initialize fsReady to a default value

        if ($("body#missingParents").length) {
            theClickedName = jq.closest("li").attr("data-name");
        }
        if ($("body#missingParents.table").length) {
            theClickedName = jq.closest("tr").attr("data-name");
        }

        this.people.forEach((aPeo) => {
            if (aPeo.Name === theClickedName) {
                if (aPeo?.Parent?.length > 0 || aPeo?.Child?.length > 0) {
                    this.doFamilySheet(aPeo);
                    fsReady = true;
                }
            }
        });

        if (!fsReady) {
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
                success: (data) => {
                    //	console.log(data);
                    let thePeople = data[0].items;
                    thePeople.forEach((aPerson) => {
                        let mPerson = aPerson.person;
                        mPerson.Spouse = this.getRels(mPerson.Spouses, mPerson, "Spouse");
                        mPerson.Child = this.getRels(mPerson.Children, mPerson, "Child");
                        mPerson.Sibling = this.getRels(mPerson.Siblings, mPerson, "Sibling");
                        mPerson.Parent = this.getRels(mPerson.Parents, mPerson, "Parent");
                    });
                    this.people.forEach((aPeo) => {
                        if (aPeo.Name === theClickedName) {
                            aPeo = mPerson;
                        }
                    });
                    this.doFamilySheet(mPerson);
                },
            });
        }
    }

    getPeople(action = "getAncestors") {
        const WTID = $("#wtid").val().trim(); // Trimmed WikiTree ID
        let depth = $("#depth").val(); // Depth to fetch

        // If the action selected is "dec", change the action to "getDescendants" and limit the depth to 5
        if ($("#action").val() === "dec") {
            action = "getDescendants";
            if (depth > 5) {
                depth = 5;
            }
        }

        // Make an AJAX request to fetch the data
        $.ajax({
            url: "https://api.wikitree.com/api.php",
            crossDomain: true,
            xhrFields: { withCredentials: true },
            type: "POST",
            data: { action: action, key: WTID, depth: depth, fields: "*" },
            dataType: "json",
            success: (data) => {
                $(".peopleList").remove(); // Remove existing list

                const myList = $("<ol class='peopleList'></ol>");
                myList.appendTo($(this.$container));

                let myPeople = [];

                if (data[0]?.ancestors) {
                    myPeople = data[0].ancestors;
                } else if (data[0]?.descendants) {
                    myPeople = data[0].descendants;
                }

                // Append list items for each person
                if (myPeople.length) {
                    myPeople.forEach((aPerson) => {
                        const listItem = $(
                            `<li>
                                ${aPerson.Name}: ${aPerson?.LongName}<br>
                                B. ${aPerson?.BirthDate}, ${aPerson?.BirthLocation}<br>
                                D. ${aPerson?.DeathDate}, ${aPerson?.DeathLocation}
                            </li>`
                        );
                        listItem.appendTo(myList);
                    });
                }
            },
            error: (xhr, status, error) => {
                // Handle errors
                console.error("An error occurred fetching people: ", error);
            },
        });
    }

    monthFormat(aDate, opt) {
        // Short and long month names
        const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const lMonths = [
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

        // Decide which direction of conversion based on 'opt'
        const fromMonths = opt === "short" ? lMonths : sMonths;
        const toMonths = opt === "short" ? sMonths : lMonths;

        // Replace month name with corresponding short or long form
        for (let i = 0; i < fromMonths.length; i++) {
            const reg = new RegExp(fromMonths[i], "gi"); // Case-insensitive match
            if (reg.test(aDate)) {
                return aDate.replace(reg, toMonths[i]);
            }
        }

        // Return the original date if no conversion was made
        return aDate;
    }

    async getRelatives(id) {
        console.log(this.people.length, this.categoryProfiles.length);

        // If all people are fetched, simply return
        if (this.people.length === this.categoryProfiles.length) {
            return false;
        }

        try {
            const response = await $.ajax({
                url: "https://api.wikitree.com/api.php",
                data: {
                    action: "getRelatives",
                    getSpouses: "1",
                    getChildren: "1",
                    getParents: "1",
                    getSiblings: "1",
                    keys: id,
                    fields: "BirthDate,BirthLocation,BirthName,BirthDateDecade,DeathDate,DeathDateDecade,DeathLocation,IsLiving,Father,FirstName,Gender,Id,LastNameAtBirth,LastNameCurrent,Prefix,Suffix,LastNameOther,Derived.LongName,Derived.LongNamePrivate,Manager,MiddleName,Mother,Name,Photo,RealName,ShortName,Touched,DataStatus,Derived.BirthName,Bio,Privacy",
                },
                crossDomain: true,
                xhrFields: { withCredentials: true },
                type: "POST",
                dataType: "json",
            });

            const thePeople = response[0].items;
            thePeople.forEach((aPerson) => {
                const mPerson = aPerson.person;
                mPerson.Spouse = this.getRels(mPerson.Spouses, mPerson, "Spouse");
                mPerson.Child = this.getRels(mPerson.Children, mPerson, "Child");
                mPerson.Sibling = this.getRels(mPerson.Siblings, mPerson, "Sibling");
                mPerson.Parent = this.getRels(mPerson.Parents, mPerson, "Parent");

                // Add the person if they are not already in `this.people`
                if (!this.people.some((p) => p.Id === mPerson.Id)) {
                    this.people.push(mPerson);
                }
            });

            // Additional operations if needed
        } catch (err) {
            console.error(err); // Handle any errors that occur during the AJAX call
        }
    }

    getDateFormat(fbds) {
        let fullDateFormat, fbdsDate, fbd;

        // Retrieve date format from cookies, or use a default
        const dateFormat = Cookies.get("w_dateFormat") || 0;
        switch (dateFormat) {
            case "1":
                fullDateFormat = "j M Y";
                break;
            case "2":
                fullDateFormat = "F j, Y";
                break;
            case "3":
                fullDateFormat = "j F Y";
                break;
            default:
                fullDateFormat = "M j, Y";
        }

        // Format date based on the existence of year, month, and day
        if (fbds[0] !== "00") {
            fbdsDate = new Date(fbds[0], fbds[1] !== "00" ? parseInt(fbds[1]) - 1 : 0, fbds[2] !== "00" ? fbds[2] : 1);
            if (fbds[2] !== "00") {
                // Full date is available
                fbd = fbdsDate.format(fullDateFormat);
            } else if (fbds[1] !== "00") {
                // Only year and month are available
                fbd = fbdsDate.format(dateFormat > 1 ? "F Y" : "M Y");
            } else {
                // Only year is available
                fbd = fbdsDate.format("Y");
            }
        } else {
            // If year is "00", then default to an empty string or a placeholder
            fbd = ""; // or some placeholder like "Unknown Date"
        }

        return fbd;
    }

    bdDatesStatus(person, statusChoice = "symbols") {
        // Define a helper function to get the status
        const getStatus = (dateStatus, abbreviations) => {
            const statusTypes = {
                guess: abbreviations ? "abt. " : "~",
                before: abbreviations ? "bef. " : "<",
                after: abbreviations ? "aft. " : ">",
            };
            return statusTypes[dateStatus] || "";
        };

        // Determine whether to use abbreviations
        const useAbbreviations = statusChoice === "abbreviations";

        // Get birth and death date status
        const bdStatus = getStatus(person.DataStatus?.BirthDate, useAbbreviations);
        const ddStatus = getStatus(person.DataStatus?.DeathDate, useAbbreviations);

        return [bdStatus, ddStatus];
    }

    displayFullDates(fPerson, showStatus = true) {
        // Get the date status symbols or abbreviations for birth and death dates
        const [bdStatus, ddStatus] = this.bdDatesStatus(fPerson);
        let fbd = "";
        let fdd = "";
        const fDates = [];

        // Handle Birth Date
        if (fPerson["BirthDate"] && fPerson["BirthDate"] !== "0000-00-00") {
            const fbds = fPerson["BirthDate"].split("-");
            fbd = fbds[0] === "unkno5" ? "" : this.getDateFormat(fbds);
        } else if (fPerson["BirthDateDecade"]) {
            fbd = fPerson["BirthDateDecade"];
        }

        fDates.push(showStatus && fbd ? bdStatus + fbd : fbd);

        // Handle Death Date
        if (fPerson["IsLiving"] === 1) {
            fdd = "living";
        } else if (fPerson["DeathDate"] && fPerson["DeathDate"] !== "0000-00-00") {
            const fdds = fPerson["DeathDate"].split("-");
            fdd = fdds[0] === "unkno5" ? "" : this.getDateFormat(fdds);
        } else if (fPerson["DeathDateDecade"] && fPerson["DeathDateDecade"] !== "unknown") {
            fdd = fPerson["DeathDateDecade"];
        }

        fDates.push(showStatus && fdd ? ddStatus + fdd : fdd);

        return fDates;
    }

    monthFormat(aDate, opt) {
        // Short and long month names
        const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const lMonths = [
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

        let gotit = false; // Flag to indicate if a month name was found and replaced
        let theDate = aDate; // The final date string with the converted month name

        // Convert long month names to short
        if (opt === "short") {
            lMonths.forEach((aMonth, i) => {
                const reg = new RegExp(aMonth, "g");
                if (theDate.match(reg)) {
                    theDate = theDate.replace(reg, sMonths[i]);
                    gotit = true;
                }
            });
        }
        // Convert short month names to long
        else {
            sMonths.forEach((aMonth, i) => {
                const reg = new RegExp(`\\b${aMonth}\\b`, "i");
                if (theDate.match(reg)) {
                    theDate = theDate.replace(reg, lMonths[i]);
                    gotit = true;
                }
            });
        }

        // Return the converted date or the original date if no conversion was made
        return gotit ? theDate : aDate;
    }

    ymdFix(date) {
        if (!date) {
            return "";
        }

        const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let outDate = date;

        // Try to match the date format "DD Month YYYY"
        const dateParts = date.match(/(\b\d{1,2}\b) ([A-Za-z]+) (\b\d{4}\b)/);
        if (dateParts) {
            const day = dateParts[1].padStart(2, "0");
            const monthName = dateParts[2];
            const year = dateParts[3];
            const monthIndex = sMonths.findIndex((m) => monthName.toLowerCase().startsWith(m.toLowerCase()));
            if (monthIndex !== -1) {
                const month = (monthIndex + 1).toString().padStart(2, "0");
                return `${year}-${month}-${day}`;
            }
        } else {
            // Try to match the date format "YYYY-MM-DD"
            const dateBits = date.split("-");
            if (dateBits[1] === "00" && dateBits[2] === "00") {
                outDate = dateBits[0] === "0000" ? "" : dateBits[0];
            }
        }

        return outDate;
    }

    isOK(thing) {
        // List of values to be excluded
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
        ];

        // Check if the value is not in the excludeValues list
        if (!excludeValues.includes(thing)) {
            // Check if the value is numeric
            if (jQuery.isNumeric(thing)) {
                return true;
            } else {
                // Check if the value is a string
                if (jQuery.type(thing) === "string") {
                    // Check if the string contains 'NaN'
                    const nanMatch = thing.match(/NaN/);
                    if (nanMatch === null) {
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

    isNumeric(n) {
        // Check if the value is a finite number
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    location2ways(locationText) {
        // Split the location text by commas
        const alSplit = locationText.split(",");

        // Remove leading and trailing whitespaces from each part
        const alSplit2 = alSplit.map((string) => string.trim());

        // Join the trimmed parts back into a string
        const s2b = alSplit2.join(", ");

        // Reverse the order of parts and join them back into a string
        const b2s = alSplit2.reverse().join(", ");

        return [s2b, b2s];
    }

    ymdFix(date) {
        if (!date) {
            return "";
        }

        const sMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let outDate = date;

        // Try to match the date format "DD Month YYYY"
        const dateParts = date.match(/(\b\d{1,2}\b) ([A-Za-z]+) (\b\d{4}\b)/);
        if (dateParts) {
            const day = dateParts[1].padStart(2, "0");
            const monthName = dateParts[2];
            const year = dateParts[3];
            const monthIndex = sMonths.findIndex((m) => monthName.toLowerCase().startsWith(m.toLowerCase()));
            if (monthIndex !== -1) {
                const month = (monthIndex + 1).toString().padStart(2, "0");
                return `${year}-${month}-${day}`;
            }
        } else {
            // Try to match the date format "YYYY-MM-DD"
            const dateBits = date.split("-");
            if (dateBits[1] === "00" && dateBits[2] === "00") {
                outDate = dateBits[0] === "0000" ? "" : dateBits[0];
            }
        }

        return outDate;
    }

    isUSA(locationText, USstatesObjArray) {
        const oLocations = locationText.split(/, ?/);
        let isUS = false;

        oLocations.forEach((bit) => {
            USstatesObjArray.forEach((stateObj) => {
                if (bit === stateObj.name || bit === stateObj.abbreviation) {
                    isUS = true;
                    if (!oLocations.includes(stateObj.name)) oLocations.push(stateObj.name);
                    if (!oLocations.includes(stateObj.abbreviation)) oLocations.push(stateObj.abbreviation);
                }
            });
        });

        return isUS;
    }

    topKFrequent(nums, k) {
        const hash = {};

        for (const num of nums) {
            hash[num] = (hash[num] || 0) + 1;
        }

        const sortedArray = Object.entries(hash).sort((a, b) => b[1] - a[1]);
        const sortedElements = sortedArray.map((num) => parseInt(num[0]));

        return sortedElements.slice(0, k);
    }

    secondarySort2(dTable, dataThing1, dataThing2, isText = 0, reverse = 0) {
        let lastOne = "Me";
        let tempArr = [lastOne];
        let rows;

        const hasTbody = !!dTable.find("tbody").length;

        rows = hasTbody ? dTable.find("tbody tr") : dTable.find("tr");

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

    secondarySort3(aList, dataThing1, dataThing2, isText = 0, reverse = 0) {
        let lastOne = "Me";
        let tempArr = [lastOne];
        let rows;

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

    fillLocations(rows, order) {
        // Iterate over each row in the table.
        rows.each(function () {
            // Find the table cell with class 'birthlocation'
            // and fill its text with the value of the data attribute
            // 'data-birthlocation' followed by the specified order.
            $(this)
                .find("td.birthlocation")
                .text($(this).attr("data-birthlocation" + order));

            // Similar to above, but for 'deathlocation'.
            $(this)
                .find("td.deathlocation")
                .text($(this).attr("data-deathlocation" + order));
        });

        // Return the updated rows.
        return rows;
    }

    sortByThis(el) {
        el.click(() => {
            let sorter = el.attr("id");
            let rows = this.aTable.find("tbody tr");

            if (sorter === "birthlocation" || sorter === "deathlocation") {
                if (sorter === "birthlocation" || sorter === "deathlocation") {
                    this.toggleLocationOrder(el, sorter);
                }

                rows.sort((a, b) => {
                    if ($(b).data(sorter) === "") {
                        return true;
                    }
                    return $(a).data(sorter).localeCompare($(b).data(sorter));
                });
            } else {
                if (isNaN($(rows).data(sorter))) {
                    this.handleStringSorting(sorter, rows);
                } else {
                    this.handleNumericSorting(sorter, rows);
                }
            }

            this.aTable.find("tbody").append(rows);
            this.moveDefaultToBottom(rows);

            this.aTable.find("tr.main").prependTo(this.aTable.find("tbody"));
        });
    }

    // Method to toggle the sort order of location columns
    toggleLocationOrder(el, sorter, rows, locationType) {
        // Check the current sort order and toggle it
        if (el.attr("data-order") === "s2b") {
            // If sorting from smallest to biggest, set to reverse
            sorter = `${locationType}-reversed`;
            el.attr("data-order", "b2s");
            rows = this.fillLocations(rows, "-reversed");
        } else {
            // If sorting from biggest to smallest, set to normal
            el.attr("data-order", "s2b");
            rows = this.fillLocations(rows, "");
        }
    }

    handleStringSorting(el, sorter, rows) {
        if (el.attr("data-order") === "asc") {
            rows.sort(function (a, b) {
                if ($(a).data(sorter) === "") {
                    return true;
                }
                return $(b).data(sorter).localeCompare($(a).data(sorter));
            });
            el.attr("data-order", "desc");
        } else {
            rows.sort(function (a, b) {
                if ($(b).data(sorter) === "") {
                    return true;
                }
                return $(a).data(sorter).localeCompare($(b).data(sorter));
            });
            el.attr("data-order", "asc");
        }
    }

    handleNumericSorting(el, sorter, rows) {
        if (el.attr("data-order") === "asc") {
            rows.sort((a, b) => ($(b).data(sorter) > $(a).data(sorter) ? 1 : -1));
            el.attr("data-order", "desc");
        } else {
            rows.sort((a, b) => ($(a).data(sorter) > $(b).data(sorter) ? 1 : -1));
            el.attr("data-order", "asc");
        }
    }

    moveDefaultToBottom(el, rows, aTable) {
        const toBottom = ["", "00000000"];
        rows.each(function () {
            if (toBottom.includes($(this).data(sorter))) {
                aTable.find("tbody").append($(this));
            }
        });
    }

    makePrivateAncestor(ancestor, degree, gender, name, firstname, lnab, lnc) {
        // Create a new person object by copying properties from the ancestor
        const person = Object.assign({}, ancestor);
        person.Degree = degree;
        person.Gender = gender;
        person.Name = name;
        person.FirstName = firstname;
        person.LastNameAtBirth = lnab;
        person.LastNameCurrent = lnc;
        // Set DataStatus with default values
        person.DataStatus = { Spouse: "", Gender: "" };
        // Return the new person object
        return person;
    }
    addTableRow = (mPerson, aTable) => {
        const row = $("<tr></tr>");
        row.append($("<td></td>").text(mPerson.FirstName));
        row.append($("<td></td>").text(mPerson.LastNameAtBirth));
        row.append($("<td></td>").text(mPerson.LastNameCurrent));
        aTable.append(row);
    };
    initializePeopleTable = () => {
        const aTable = $("<table class='peopleTable'></table>");
        const header = $("<tr></tr>");
        header.append($("<th></th>").text("First Name"));
        header.append($("<th></th>").text("Last Name at Birth"));
        header.append($("<th></th>").text("Current Last Name"));
        aTable.append(header);
        return aTable;
    };
    addPeopleTable = async () => {
        // Show the save people button
        $("#savePeople").show();

        // Initialize the table
        const aTable = initializePeopleTable();

        // Replace or append the table in the DOM
        if ($(".peopleTable").length) {
            $(".peopleTable").eq(0).replaceWith(aTable);
        } else {
            $(this.$container).append(aTable);
        }

        // Assume this.people is the data source for the table
        for (const mPerson of this.people) {
            addTableRow(mPerson, aTable);
        }
    };
    averageMarriageAge() {
        let marriedPeople = 0;
        let marriedAtDays = 0;
        const countedMarriedPeople = [];
        let maleAge = 0;
        let femaleAge = 0;
        let countedCouples = 0;
        const marriageAgeArray = [];
        const marriageAgeYArray = [];

        const processPerson = (aPer) => {
            if (!aPer.Spouse) return;

            const marriage_date = aPer.Spouse[0]?.marriage_date;

            if (!isOK(marriage_date)) return;

            const marriageDate = ymdFix(marriage_date);
            const mYear = marriageDate.match(/[0-9]{4}/);

            if (!mYear) return;

            const marriageYear = mYear[0];
            const c_dDate = getApproxDate2(marriageDate);
            const dt2 = c_dDate.Date;

            if (!isOK(aPer.BirthDate)) return;

            const birthDate = ymdFix(aPer.BirthDate);
            const c_bDate = getApproxDate2(birthDate);
            const dt1 = c_bDate.Date;

            const marriedAt = getAge2(dt1, dt2);
            aPer.MarriedAt = marriedAt;

            if (!countedMarriedPeople.includes(aPer.Name)) {
                marriedAtDays += marriedAt[2];
                marriedPeople++;
                countedMarriedPeople.push(aPer.Name);
                marriageAgeArray.push(marriedAt[2]);
                marriageAgeYArray.push(marriedAt[0]);
            }
        };

        // Iterate through all people and process them
        this.people.forEach((aPer) => {
            processPerson(aPer);
        });

        const averageMarriedAt = Math.round(marriedAtDays / marriedPeople / 365.25);
        const averageAgeDiff = Math.round((maleAge - femaleAge) / countedCouples / 365.25);
        marriageAgeArray.sort((a, b) => a - b);
        const medianMarriedAt = Math.round(marriageAgeArray[Math.round(marriageAgeArray.length / 2)] / 365.25);
        const modeMarriedAt = topKFrequent(marriageAgeYArray, 1);

        return {
            AgeDifference: averageAgeDiff,
            MeanAge: averageMarriedAt,
            MedianAge: medianMarriedAt,
            ModeAge: modeMarriedAt,
        };
    }
    getApproxDate(theDate) {
        let approx = false;
        let aDate;

        // Check if the date ends with '0s', e.g., 1950s
        if (theDate.match(/0s$/) !== null) {
            aDate = theDate.replace(/0s/, "5");
            approx = true;
        } else {
            const bits = theDate.split("-");

            // Check if the date ends with 00-00, e.g., 1950-00-00
            if (theDate.match(/00-00$/) !== null) {
                aDate = `${bits[0]}-07-02`;
                approx = true;
            }
            // Check if the date ends with -00, e.g., 1950-07-00
            else if (theDate.match(/-00$/) !== null) {
                aDate = `${bits[0]}-${bits[1]}-16`;
                approx = true;
            }
            // Default case where the date doesn't need approximation
            else {
                aDate = theDate;
            }
        }

        return { Date: aDate, Approx: approx };
    }
    getApproxDate2(theDate) {
        let approx = false;
        let aDate;

        // Check if the date ends with '0s', e.g., 1950s
        if (theDate.match(/0s$/) !== null) {
            aDate = theDate.replace(/0s/, "5");
            approx = true;
        } else {
            const bits = theDate.split("-");

            // Check if the date ends with 00-00 or if the month is missing, e.g., 1950-00-00 or 1950
            if (theDate.match(/00-00$/) !== null || !bits[1]) {
                aDate = `${bits[0]}-07-02`;
                approx = true;
            }
            // Check if the date ends with -00, e.g., 1950-07-00
            else if (theDate.match(/-00$/) !== null) {
                aDate = `${bits[0]}-${bits[1]}-16`;
                approx = true;
            }
            // Default case where the date doesn't need approximation
            else {
                aDate = theDate;
            }
        }

        return { Date: aDate, Approx: approx };
    }
    isLeapYear(year) {
        return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
    }
    getDateFormat(fbds) {
        let fullDateFormat = "j M Y";

        // Retrieve date format setting from cookies
        const dateFormat = localStorage.getItem("w_dateFormat") || 0;
        if (dateFormat === 0) {
            fullDateFormat = "M j, Y";
        }

        // Update fullDateFormat based on user's setting
        if (dateFormat === 1) {
            fullDateFormat = "j M Y";
        } else if (dateFormat === 2) {
            fullDateFormat = "F j, Y";
        } else if (dateFormat === 3) {
            fullDateFormat = "j F Y";
        }

        let fbd; // Formatted date to be returned
        if (fbds[1] !== "00" && fbds[2] !== "00" && fbds[0] !== "00") {
            // Month is zero-indexed in JavaScript Date
            const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
            fbd = fbdsDate.format(fullDateFormat);
        } else if (fbds[1] !== "00" && fbds[2] === "00" && fbds[0] !== "00") {
            const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
            fbd = fbdsDate.format("M Y");
            if (dateFormat > 1) {
                fbd = fbdsDate.format("F Y");
            }
        } else if (fbds[1] !== "00" && fbds[2] === "00") {
            const fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
            fbd = fbdsDate.format("M Y");
            if (dateFormat > 1) {
                fbd = fbdsDate.format("F Y");
            }
        } else {
            const fbdsDate = new Date(fbds[0], 0, 1);
            fbd = fbdsDate.format("Y");
        }

        return fbd;
    }
    displayDates(fPerson) {
        const mbdDatesStatus = this.bdDatesStatus(fPerson);
        const bdStatus = mbdDatesStatus[0];
        const ddStatus = mbdDatesStatus[1];

        let fbd = ""; // Formatted Birth Date
        let fdd = ""; // Formatted Death Date

        // Handling Birth Date
        if (fPerson["BirthDate"] && fPerson["BirthDate"] !== "0000-00-00" && fPerson["BirthDate"] !== "unknown") {
            fbd = fPerson["BirthDate"].split("-")[0];
        } else if (fPerson["BirthDateDecade"] && fPerson["BirthDateDecade"] !== "unknown") {
            fbd = fPerson["BirthDateDecade"];
            const decadeMidpoint = fPerson["BirthDateDecade"].slice(0, -2) + 5;
        }

        // Handling Death Date
        if (fPerson["IsLiving"] !== undefined && fPerson["IsLiving"] === 1) {
            fdd = "living";
        } else if (fdd === "" && fPerson["DeathDate"] && fPerson["DeathDate"] !== "0000-00-00") {
            fdd = fPerson["DeathDate"].split("-")[0];
        } else if (fPerson["DeathDateDecade"] && fPerson["DeathDateDecade"] !== "unknown") {
            fdd = fPerson["DeathDateDecade"];
            const decadeMidpoint = fPerson["DeathDateDecade"].slice(0, -2) + 5;
        }

        const fDates = `(${bdStatus}${fbd} - ${ddStatus}${fdd})`;

        return fDates;
    }
    displayFullDates(fPerson, showStatus = true) {
        const mbdDatesStatus = this.bdDatesStatus(fPerson);
        const bdStatus = mbdDatesStatus[0];
        const ddStatus = mbdDatesStatus[1];

        let fbd = "";
        let fdd = "";

        const fDates = [];

        // Handle Birth Date
        if (fPerson["BirthDate"] && fPerson["BirthDate"] !== "0000-00-00") {
            const fbds = fPerson["BirthDate"].split("-");
            fbd = fbds[0] === "unkno5" ? "" : this.getDateFormat(fbds);
        } else if (fPerson["BirthDateDecade"]) {
            fbd = fPerson["BirthDateDecade"];
        }

        fDates.push(showStatus && fbd ? bdStatus + fbd : fbd);

        // Handle Death Date
        if (fPerson["IsLiving"] !== undefined && fPerson["IsLiving"] === 1) {
            fdd = "living";
        } else if (!fdd && fPerson["DeathDate"] && fPerson["DeathDate"] !== "0000-00-00") {
            const fdds = fPerson["DeathDate"].split("-");
            fdd = fdds[0] === "unkno5" ? "" : this.getDateFormat(fdds);
        } else if (fPerson["DeathDateDecade"] && fPerson["DeathDateDecade"] !== "unknown") {
            fdd = fPerson["DeathDateDecade"];
        }

        fDates.push(showStatus && fdd ? ddStatus + fdd : fdd);

        return fDates;
    }

    familySheetPerson = (fsPerson, role) => {
        // Initialize variables
        let baptismDate = "";
        let baptismPlace = "";
        let burialDate = "";
        let burialPlace = "";
        const myRefs = [];
        const mSeeAlso = [];
        const references = [];

        // Get the biography HTML and parse it
        const fsBio = fsPerson.bio;
        const bioDummy = document.createElement("html");
        bioDummy.innerHTML = fsBio;

        // Extract references from the biography
        bioDummy.querySelectorAll("ref").forEach((aRef) => {
            if (!$(aRef).find("references").length) {
                myRefs.push(aRef.textContent.replace(/^\*/, "").trim());
            }
        });

        // Further processing of the biography
        if (fsBio) {
            const bioSplit = fsBio.split("<references />");
            if (bioSplit[1]) {
                const removedAck = bioSplit[1].split(/=+\s?Acknowledge?ments?\s?=+/)[0];
                const seeAlsoSplit = removedAck.split(/See also:/i);
                if (seeAlsoSplit[1]) {
                    const seeAlsoSplit2 = seeAlsoSplit[1].split(/\*/g);
                    seeAlsoSplit2.forEach(function (aSeeAlso, ind) {
                        if (aSeeAlso != "\n" && aSeeAlso.trim() != "") {
                            mSeeAlso.push(aSeeAlso.replace(/^\*/, "").trim());
                        }
                    });
                }
                const citations = seeAlsoSplit[0].split(/\*/g);
                citations.forEach(function (aCit, index) {
                    if (aCit != "\n" && aCit.trim() != "") {
                        myRefs.push(aCit.replace(/^\*/, "").trim());
                    }
                });
            }
            const categoryMatch = bioSplit[0].match(/\[\[Category:.*?\]\]/g);
            if (categoryMatch != null) {
                //console.log(categoryMatch);
                categoryMatch.forEach(function (aCat) {
                    //console.log(fsPerson.Name,aCat);
                    const dCat = aCat.split("Category:")[1].replace(/\]\]/, "");
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
            const eventMatch = bioSplit[0].match(/\{\{Event[^]*?\}\}/gm);
            if (eventMatch != null) {
                //console.log(eventMatch);
                eventMatch.forEach(function (anEvent) {
                    //console.log(anEvent);
                    if (anEvent.match(/type=(Baptism|Christening)/i) != null) {
                        const eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                        eBits.forEach(function (anBit) {
                            anBit = anBit.replace(/<ref.*?>/, "");
                            const anBitBits = anBit.split("=");
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
                        const eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                        eBits.forEach(function (anBit) {
                            anBit = anBit.replace(/<ref.*?>/, "");
                            const anBitBits = anBit.split("=");
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

        // Store references
        references.push([fsPerson.Name, myRefs, mSeeAlso]);

        // Check if value is OK (not null or undefined)
        // const isOK = (value) => value !== null && value !== undefined;

        myRefs.forEach(function (anRef) {
            if (anRef.match(/(burial\b)|(Grave\b)/i) != null) {
                const burialDateMatch = anRef.match(/Burial Date.*(\b[0-9]+.*[0-9]{4})/);
                const burialPlaceMatch = anRef.match(/Burial Place.*?(\b[A-z,\s]+)/);
                const fagRx = new RegExp(
                    "Find a Grave.*?" + fsPerson.FirstName + ".*?" + fsPerson.LastNameCurrent + ".*?" + "citing",
                    "i"
                );
                const fagMatch = anRef.match(fagRx);
                if (fagMatch != null) {
                    const burialPlaceFagMatch = anRef.match(/citing (.*?) ;/);
                    if (burialPlaceFagMatch != null) {
                        if (burialPlaceFagMatch[1]) {
                            burialPlace = burialPlaceFagMatch[1];
                        }
                        const burialDatesMatch = anRef.match(/\([0-9A-z\s]+?\–.+?[12][0-9]+?\),/);
                        if (burialDatesMatch != null) {
                            const burialDate2 = burialDatesMatch[0];
                            const bdSplit = burialDate2.split("–");
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
                const baptismDateMatch = anRef.match(/(Baptism\b|Christening\b) Date.*/);
                const baptismPlaceMatch = anRef.match(/(Baptism\b|Christening\b) Place.*/);
                if (baptismDateMatch != null && baptismDate == "") {
                    baptismDate = baptismDateMatch[0].match(/([0-9]{1,2}\b)?\s([A-z]{3,}\b)\s[0-9]{4}/)[0];
                }
                if (baptismPlaceMatch != null && baptismPlace == "") {
                    const baptismPlaceBits = baptismPlaceMatch[0].split("|");
                    baptismPlaceBits.forEach(function (aBit) {
                        if (aBit.match(/Baptism|Christening/i) == null && aBit.match(/[0-9]/i) == null) {
                            baptismPlace = aBit + " ".trim();
                        }
                    });
                }
            }
        });
        if (this.isOK(fsPerson.Cemetery)) {
            burialPlace = fsPerson.Cemetery;
        }

        const bdDates = this.displayFullDates(fsPerson);
        let bDate = bdDates[0];
        let dDate = bdDates[1];
        if (!this.isOK(bDate)) {
            bDate = "";
        }
        if (!this.isOK(dDate)) {
            dDate = "";
        }
        let mainPerson = false;
        let otherSpouse = "";
        const otherSpouses = [];
        let mainSpouse = "";
        let mainSpouseName = "";
        if (fsPerson.Name == this.people[0].Name) {
            mainPerson = true;

            if (fsPerson.Spouse.length) {
                if (this.keepSpouse) {
                    mainSpouseName = this.keepSpouse;
                } else {
                    mainSpouse = fsPerson.Spouse[0];
                    mainSpouseName = mainSpouse.Name;
                }
                if (fsPerson.Spouse.length > 0) {
                    fsPerson.Spouse.forEach((fSpouse) => {
                        if (this.keepSpouse) {
                            if (fSpouse.Name == this.keepSpouse) {
                                mainSpouse = fSpouse;
                            }
                        }
                        if (fSpouse.Name != mainSpouseName) {
                            otherSpouses.push(fSpouse);
                        }
                    });
                }
            }
        }

        const showGenderVal = $("input[name='showGender']:checked").val();
        let dGender = "";
        if (fsPerson.Gender) {
            if (showGenderVal == "initial") {
                dGender = fsPerson.Gender.substring(0, 1);
            } else if (showGenderVal == "word") {
                dGender = fsPerson.Gender;
            }
        }

        let genderSpan = "";
        if (role != "Husband" && role != "Wife") {
            genderSpan = "<span data-gender='" + fsPerson.Gender + "' class='fsGender'>" + dGender + "</span>";
        }

        let roleName = "";
        if (fsPerson.Name != $("#wtid").val()) {
            roleName = "data-name='" + htmlEntities(fsPerson.Name) + "'";
        }
        dGender = "";
        if (fsPerson.Gender) {
            dGender = fsPerson.Gender;
        }

        let fsWTIDSpan = "";
        if (fsPerson.Name) {
            fsWTIDSpan = "<span class='fsWTID'>(" + this.htmlEntities(fsPerson.Name) + ")</span>";
        }

        let showName = htmlEntities(this.displayName(fsPerson)[0]);

        showName = showName.replace(/(“.+”)/, "<span class='nicknames'>$1</span>");
        let otherLastNames = "";
        let prefix = "";
        let suffix = "";
        if (fsPerson.LastNameOther) {
            otherLastNames = " <span class='otherLastNames'>(also " + fsPerson.LastNameOther + ")</span> ";
            $("#showOtherLastNamesLabel").css("display", "inline-block");
        }

        let showRole = role;
        if (dGender == "Female" && role == "Husband") {
            showRole = "Wife";
        }
        if (dGender == "Male" && role == "Wife") {
            showRole = "Husband";
        }

        // Extract data for rendering HTML
        const { BirthDate, BirthLocation, DeathDate, DeathLocation, marriage_date, marriage_location } = fsPerson;

        /* Park this here for now */
        let matchingPerson = "";
        if (this.keepSpouse) {
            matchingPerson = this.keepSpouse;
        } else if (this.people) {
            matchingPerson = this.people[0].Spouse[0]?.Name;
        }

        console.log("fsPerson:", fsPerson);
        let marriageRow;

        const roleRow = this.renderRoleRow(fsPerson, role);
        const birthRow = this.renderBirthRow(BirthDate, BirthLocation, role);
        const deathRow = this.renderDeathRow(DeathDate, DeathLocation, role);
        const baptismRow = this.renderBaptismRow(baptismDate, baptismPlace, role);
        if (marriage_date || marriage_location) {
            marriageRow = this.renderMarriageRow(marriage_date, marriage_location, role) || "";
        }
        const burialRow = this.renderBurialRow(burialDate, burialPlace, role);
        const otherMarriageRow = this.renderOtherMarriageRow(fsPerson, mainSpouse, otherSpouses, role);
        const parentsRow = this.renderParentsRow(fsPerson, role, mainPerson, matchingPerson);
        const spouseRow = this.renderSpouseRow(fsPerson, role);
        const bioRow = this.renderBioRow(fsPerson, role);
        // Return the final HTML based on the role
        if (role === "Husband" || role === "Wife") {
            return `${roleRow}${birthRow}${baptismRow}${marriageRow}${deathRow}${burialRow}${otherMarriageRow}${parentsRow}${bioRow}`;
        } else {
            return `${roleRow}${birthRow}${baptismRow}${deathRow}${burialRow}${spouseRow}${bioRow}`;
        }
    };
    renderRoleRow = (fsPerson, role) => {
        // Escape the Name for HTML entities
        const escapedName = this.htmlEntities(fsPerson.Name);

        // Determine the gender span and other last names display
        const showGenderVal = $("input[name='showGender']:checked").val();
        let dGender = fsPerson.Gender ? fsPerson.Gender.substring(0, 1) : "";
        if (showGenderVal === "word") {
            dGender = fsPerson.Gender;
        }
        const genderSpan =
            role !== "Husband" && role !== "Wife"
                ? `<span data-gender='${fsPerson.Gender}' class='fsGender'>${dGender}</span>`
                : "";
        let otherLastNames = "";
        if (fsPerson.LastNameOther) {
            otherLastNames = ` <span class='otherLastNames'>(also ${fsPerson.LastNameOther})</span>`;
        }

        // Construct the role row with the additional details
        const roleRow = `
            <tr data-gender='${dGender}'
                data-name='${escapedName}'
                title='${escapedName}'
                data-role='${role}'
                class='roleRow'>
                <th class='role heading'>
                    <a href='https://www.wikiTree.com/wiki/${escapedName}'>${role}</a>:
                </th>
                <td class='fsName' colspan='2'>
                    <a href='https://apps.wikitree.com/apps/beacall6/familySheet.php?id=${fsPerson.Name}'>
                        ${this.displayName(fsPerson)[0]}
                    </a>
                    ${otherLastNames}
                    ${genderSpan}
                    <span class='fsWTID'>(${escapedName})</span>
                </td>
            </tr>`;

        // Set global variables for Husband and Wife if necessary
        if (role === "Husband") {
            this.husband = fsPerson.Id;
            this.husbandWTID = fsPerson.Name;
        } else if (role === "Wife") {
            this.wife = fsPerson.Id;
            this.wifeWTID = fsPerson.Name;
        }

        return roleRow;
    };

    renderBirthRow = (birthDate, birthPlace, role) => {
        console.log("renderBirthRow called with:", { birthDate, birthPlace, role });
        const birthRow =
            this.isOK(birthDate) || this.isOK(birthPlace)
                ? `<tr><td class="${role.toLowerCase()} birth">Born:</td><td>${birthDate}, ${birthPlace}</td></tr>`
                : "";
        console.log("birthRow generated:", birthRow);
        return birthRow;
    };

    renderDeathRow = (deathDate, deathPlace, role) => {
        const deathRow =
            this.isOK(deathDate) || this.isOK(deathPlace)
                ? `<tr><td class="${role.toLowerCase()} death">Died:</td><td>${deathDate}, ${deathPlace}</td></tr>`
                : "";
        return deathRow;
    };

    renderBaptismRow = (baptismDate, baptismPlace, role) => {
        const baptismRow =
            this.isOK(baptismDate) || this.isOK(baptismPlace)
                ? `<tr><td class="${role.toLowerCase()} baptism">Baptized:</td><td>${baptismDate}, ${baptismPlace}</td></tr>`
                : "";
        return baptismRow;
    };

    renderMarriageRow = (marriageDate, marriagePlace, role) => {
        const marriageRow =
            this.isOK(marriageDate) || this.isOK(marriagePlace)
                ? `<tr><td class="${role.toLowerCase()} marriage">Married:</td><td>${marriageDate}, ${marriagePlace}</td></tr>`
                : "";
        return marriageRow;
    };

    renderBurialRow = (burialDate, burialPlace, role) => {
        const burialRow =
            this.isOK(burialDate) || this.isOK(burialPlace)
                ? `<tr><td class="${role.toLowerCase()} burial">Buried:</td><td>${burialDate}, ${burialPlace}</td></tr>`
                : "";
        return burialRow;
    };
    renderOtherMarriageRow = (fsPerson, otherSpouses, role) => {
        let otherMarriageRow = "";

        // Check if value is OK (not null or undefined)
        const isOK = (value) => value !== null && value !== undefined;

        if (otherSpouses.length === 0 && fsPerson.Spouse && fsPerson.Spouse.length > 1) {
            otherSpouses.push(
                ...fsPerson.Spouse.filter(
                    (anoSpouse) =>
                        anoSpouse.Name !== this.people[0].Name &&
                        anoSpouse.Name !== mainSpouse.Name &&
                        anoSpouse.Name !== this.keepSpouse
                )
            );
        }

        if (otherSpouses.length > 0) {
            otherSpouses.forEach((oSpouse, index) => {
                const { marriage_date, marriage_end_date, marriage_location, Name } = oSpouse;
                let otherSpouseMarriageDate = isOK(marriage_date)
                    ? `<span class='marriageDate'>${getDateFormat(marriage_date.split("-"))}</span>`
                    : "";
                let otherSpouseMarriageEndDate = isOK(marriage_end_date)
                    ? `<span class='marriageEndDate date'>&nbsp;- ${getDateFormat(marriage_end_date.split("-"))}</span>`
                    : "";
                let otherSpouseName = displayName(oSpouse)[0];
                let otherSpouseMarriageLocation = isOK(marriage_location) ? marriage_location : "";

                const oSpousesHeadingText =
                    index === 0 ? (otherSpouses.length > 1 ? "Other Marriages:" : "Other Marriage:") : "";

                otherMarriageRow += `
                <tr data-person='${htmlEntities(fsPerson.Name)}' data-role='${role}' class='otherMarriageRow'>
                    <th class='otherMarriageHeading heading'>${oSpousesHeadingText}</th>
                    <td class='otherMarriageDate'>
                        <span class='otherSpouseName' data-name='${htmlEntities(Name)}'>${otherSpouseName.replace(
                    /(“.+”)/,
                    "<span class='nicknames'>$1</span>"
                )}</span>,
                        <span class='marriageDate date'>${otherSpouseMarriageDate}</span>${otherSpouseMarriageEndDate}
                    </td>
                    <td class='otherMarriagePlace'>${otherSpouseMarriageLocation}</td>
                </tr>`;
            });
        } else {
            otherMarriageRow = `
            <tr data-role='${role}' class='otherMarriageRow'>
                <th class='otherMarriageHeading heading'>Other Marriage:</th>
                <td class='otherMarriageDate date editable empty'></td>
                <td class='otherMarriagePlace empty editable'></td>
            </tr>`;
        }

        return otherMarriageRow;
    };

    renderParentsRow = (fsPerson, mainPerson, matchingPerson, role, showRole) => {
        let parentsRow = "";

        if (mainPerson || fsPerson.Name === matchingPerson) {
            let fatherName = "";
            let motherName = "";
            let fsFather = null;
            let fsMother = null;

            if (fsPerson.Parent && fsPerson.Parent.length > 0) {
                fsPerson.Parent.forEach((parent) => {
                    const nameWithNicknames = this.displayName(parent)[0].replace(
                        /(“.+”)/,
                        "<span class='nicknames'>$1</span>"
                    );
                    if (parent.Gender === "Male") {
                        fatherName = nameWithNicknames;
                        fsFather = parent;
                    } else if (parent.Gender === "Female") {
                        motherName = nameWithNicknames;
                        fsMother = parent;
                    }
                });
            }

            const fsFatherName = fsFather ? `data-name='${this.htmlEntities(fsFather.Name)}'` : "";
            const fsMotherName = fsMother ? `data-name='${this.htmlEntities(fsMother.Name)}'` : "";

            const fsFatherLink = fsFather
                ? `<a href='https://www.wikitree.com/wiki/${this.htmlEntities(fsFather.Name)}'>${role}'s Father</a>`
                : `${showRole}'s Father`;
            const fsMotherLink = fsMother
                ? `<a href='https://www.wikitree.com/wiki/${this.htmlEntities(fsMother.Name)}'>${role}'s Mother</a>`
                : `${showRole}'s Mother`;

            const fsFatherWTID = fsFather ? `<span class='fsWTID'>(${this.htmlEntities(fsFather.Name)})</span>` : "";
            const fsMotherWTID = fsMother ? `<span class='fsWTID'>(${this.htmlEntities(fsMother.Name)})</span>` : "";

            const fsFatherDates = fsFather
                ? `<span class='parentDates date'>${this.displayDates(fsFather)}</span>`
                : "";
            const fsMotherDates = fsMother
                ? `<span class='parentDates date'>${this.displayDates(fsMother)}</span>`
                : "";

            parentsRow = `
            <tr data-role='${role}' class='${role}ParentsRow'>
                <th class='${role}FatherHeading heading'>${fsFatherLink}: </th>
                <td colspan='2' ${fsFatherName} class='${role}Father'>
                    <span class='parentName'>${fatherName}</span> ${fsFatherWTID} ${fsFatherDates}
                </td>
            </tr>
            <tr data-role='${role}' class='${role}ParentsRow'>
                <th class='${role}MotherHeading heading'>${fsMotherLink}: </th>
                <td colspan='2' ${fsMotherName} class='${role}Mother'>
                    <span class='parentName'>${motherName}</span> ${fsMotherWTID} ${fsMotherDates}
                </td>
            </tr>`;
        }

        return parentsRow;
    };
    renderSpouseRow = (fsPerson, role) => {
        let spouseRow = "";

        if (fsPerson.Spouse) {
            if (fsPerson.Spouse.length > 0) {
                fsPerson.Spouse.forEach((fsSp, index) => {
                    const theSpouse = this.displayName(fsSp)[0].replace(/(“.+”)/, "<span class='nicknames'>$1</span>");
                    let theMarriage = this.isOK(fsSp.marriage_date)
                        ? `<span class='marriageDate date'>${this.getDateFormat(fsSp.marriage_date.split("-"))}</span>`
                        : "";

                    let theMarriageEnd = this.isOK(fsSp.marriage_end_date)
                        ? `<span class='marriageDate date'> - ${this.getDateFormat(
                              fsSp.marriage_end_date.split("-")
                          )}</span>`
                        : "";

                    const theSpouseName = `data-name='${this.htmlEntities(fsSp.Name)}'`;

                    let spouseHeading = "";
                    let mClass = "hidden";
                    if (index === 0) {
                        mClass = "";
                        spouseHeading = fsPerson.Spouse.length > 1 ? "Spouses:" : "Spouse:";
                    }

                    spouseRow += `
                    <tr data-person='${htmlEntities(fsPerson.Name)}' data-role='${role}' class='spouseRow'>
                        <th class='spouseHeading heading'>${spouseHeading} </th>
                        <td class='spouseName' ${theSpouseName}>${theSpouse} 
                            <span class='spouseDates date'>${this.displayDates(fsSp)}</span>
                        </td>
                        <td class='dateOfMarriage'>
                            <span class='dateOfMarriageHeading heading ${mClass}'>Date of Marriage: </span>
                            <span class='marriageDate date'>${theMarriage}${theMarriageEnd}</span>
                        </td>
                    </tr>`;
                });
            } else {
                spouseRow += `
                <tr data-role='${role}' class='spouseRow'>
                    <th class='spouseHeading heading'>Spouse: </th>
                    <td class='spouseName'></td>
                    <td class='dateOfMarriage'>
                        <span class='dateOfMarriageHeading heading'>Date of Marriage: </span>
                        <span class='marriageDate date'></span>
                    </td>
                </tr>`;
            }
        }

        return spouseRow;
    };
    renderBioRow = (fsPerson, role) => {
        let bioRow = "";

        if (fsPerson.bioHTML) {
            // Split the bioHTML to separate out the main content and research notes
            let [mainBio, researchNotes] = fsPerson.bioHTML.split('<a name="Sources"></a>');

            // Handle research notes if they exist
            const rNotesSplit = mainBio.split(/<h2.*?research note.*?h2>/i);
            if (rNotesSplit[1]) {
                this.researchNotes.push([fsPerson.Name, this.displayName(fsPerson)[0], rNotesSplit[1]]);
            }
            mainBio = rNotesSplit[0];

            // Prepare the bio row HTML
            bioRow = `
            <tr data-role='${role}' class='bioRow'>
                <th class='bioHeading heading'>Biography: </th>
                <td colspan='2'>
                    <div class='theBio'>${mainBio
                        .replace(/<h2>.*?<\/h2>/, "")
                        .trim()
                        .replaceAll(/(src|href)="\//g, '$1="https://www.wikitree.com/')
                        .replaceAll(/href="#_/g, `href="https://www.wikitree.com/wiki/${fsPerson.Name}#_"`)}
                    </div>
                </td>
            </tr>`;
        }

        return bioRow;
    };
    storeVal(jq) {
        const id = jq.attr("id");
        const type = jq.attr("type");
        const name = jq.attr("name");

        // Handle checkboxes
        if (type === "checkbox") {
            const isChecked = jq.prop("checked");
            localStorage.setItem(id, isChecked ? 1 : 0);
        }
        // Handle radio buttons
        else if (type === "radio") {
            $("input[name='" + name + "']").each(function () {
                const radio = $(this);
                if (radio.prop("checked")) {
                    localStorage.setItem(name, radio.val());
                }
            });
        }
    }
    setVals() {
        // Handle checkboxes
        const checkboxes = $("#fgsOptions input[type='checkbox']");
        checkboxes.each(function () {
            const checkbox = $(this);
            const id = checkbox.attr("id");
            const originalState = checkbox.prop("checked");

            // Check if localStorage has a value for this checkbox
            if (localStorage[id] !== undefined) {
                const newState = localStorage[id] === "1";
                checkbox.prop("checked", newState);

                // Trigger change event if state changed
                if (newState !== originalState) {
                    checkbox.change();
                }
            }
        });

        // Handle radio buttons
        const radios = $("#fgsOptions input[type='radio']");
        radios.each(function () {
            const radio = $(this);
            const name = radio.attr("name");
            const originalState = radio.prop("checked");

            // Check if localStorage has a value for this radio group
            if (localStorage[name] !== undefined) {
                const newState = localStorage[name] === radio.val();
                radio.prop("checked", newState);

                // Trigger change event if state changed
                if (newState !== originalState) {
                    radio.change();
                }
            }
        });
    }

    privateQ() {
        $(this.$container).append(
            "<div id='privateQ'><p>Is this a private profile?</p><p>Maybe you need to log in?</p></div>"
        );
    }
    isLeapYear(year) {
        return year % 100 === 0 ? year % 400 === 0 : year % 4 === 0;
    }

    checkAndAppendChildren(oChildren) {
        if (oChildren.length > 0) {
            this.people[0].Child.forEach((aChild, index) => {
                this.people.forEach((cPerson) => {
                    // Initialize husband and wife if undefined
                    this.husband = this.husband || 0;
                    this.wife = this.wife || 0;

                    // Check for matching child and parent relationship
                    if (
                        cPerson.Name === aChild.Name &&
                        ((cPerson.Father === this.husband && cPerson.Mother === this.wife) ||
                            (!this.husband && cPerson.Mother === this.wife) ||
                            (this.husband === cPerson.Father && !this.wife))
                    ) {
                        // Check if child is already processed
                        if (!doneKids.includes(aChild.Name)) {
                            const theChildRow = this.familySheetPerson(cPerson, ordinal(index + 1) + " Child");
                            fsTable.find("> tbody").append($(theChildRow));
                            doneKids.push(cPerson.Name);
                        }
                    }
                });
            });
        }
    }

    fixCitation(citation) {
        // Find all tables and lists in the citation
        const tableMatches = Array.from(citation.matchAll(/\{\|[^]+?\|\}/gm));
        const listMatches = Array.from(citation.matchAll(/\n:+[A-z]+.*/gm));

        // Process lists
        let madeList = false;
        if (listMatches.length > 0) {
            let aList = "\n<ul class='sourceUL'>\n";
            for (const lMatch of listMatches) {
                aList += `<li>${lMatch[0].replace(/\n:+/, "")}</li>\n`;
                madeList = true;
            }
            aList += "</ul>\n";
            if (madeList) {
                citation += aList;
                citation = citation.replace(/\n:+[A-z]+.*/gm, "");
            }
        }

        // Process tables
        if (tableMatches.length > 0) {
            const newTables = [];
            for (const aMatch of tableMatches) {
                let aTable = `<table class='citationTable' id='citationTable_${this.citationTables.length}'>`;
                const lines = Array.from(
                    aMatch[0].matchAll(
                        /[|!](.*?)\|\|(.*?)(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?(\|\|.*?)?\n/g
                    )
                );

                for (const line of lines) {
                    let aTableRow = "<tr>";
                    for (let i = 1; i < 10; i++) {
                        if (line[i] !== undefined) {
                            aTableRow += `<td>${line[i].replace("||", "")}</td>`;
                        }
                    }
                    aTableRow += "</tr>\n";
                    aTable += aTableRow;
                }
                aTable += "</table>";
                newTables.push(aTable);
                const newMatch = aMatch[0].replace(/([!|{}()\-.\[\]])/g, "\\$1");
                citation = citation.replace(new RegExp(newMatch, "m"), aTable);
            }
            this.citationTables.push(...newTables);
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

        const eeMatch = citation.match(/\{\{EE source[\s\S]*?\}\}/gm);
        if (eeMatch != null) {
            const eeData = {};
            const dataBits = eeMatch[0].replaceAll(/[{}\n]/g, "").split("|");
            dataBits.forEach((aBit) => {
                const aBitBits = aBit.split("=");
                if (aBitBits[1]) {
                    eeData[aBitBits[0].replace("-", "_")] = aBitBits[1];
                }
            });

            let eeName = "";
            if (eeData.last) {
                let punc = "";
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

            const eeCitation =
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
            const reg = new RegExp(eeMatch[0].replaceAll(/([!|{}()\-.\[\]])/g, "\\$1"), "m");
            citation = citation.replace(reg, eeCitation);
        }

        return citation;
    }

    appendReferences(mList) {
        this.references.forEach((pRefs) => {
            const anID = pRefs[0];
            let thisName = this.getFormattedName(anID);
            const wtidSpan = this.getWtidSpan(thisName);
            thisName = thisName.replace(/\(\b[^\s]+\-[0-9]+\)/, "");

            const anLI = this.createListItem(anID, thisName, wtidSpan);
            const aUL = $("<ul></ul>");

            pRefs[1].forEach((aRef) => {
                aUL.append($("<li>" + this.fixCitation(aRef) + "</li>"));
            });

            this.appendSeeAlso(aUL, pRefs[2]);

            aUL.appendTo(anLI);
            anLI.appendTo(mList);
        });
    }

    getFormattedName(anID) {
        return $("tr[data-name='" + this.htmlEntities(anID) + "'] .fsName")
            .eq(0)
            .text()
            .replace(/(Female)|(Male)\b/, "")
            .replace(/([a-z])(\)\s)?[MF]\b/, "$1$2");
    }

    getWtidSpan(thisName) {
        const wtidMatch = thisName.match(/\(\b[^\s]+\-[0-9]+\)/);
        if (wtidMatch !== null) {
            return $("<span class='fsWTID'>" + this.htmlEntities(wtidMatch) + "</span>");
        }
        return "";
    }

    createListItem(anID, thisName, wtidSpan) {
        const anLI = $(
            `<li data-wtid='${anID}'><a class='sourcesName' href='https://www.wikitree.com/wiki/${anID}'>${thisName}</a></li>`
        );
        anLI.find("a").append(wtidSpan);
        return anLI;
    }

    appendSeeAlso(aUL, seeAlsoRefs) {
        if (seeAlsoRefs !== "") {
            const anLI2 = $("<li><span>See also:</span></li>");
            const aUL2 = $("<ul></ul>");
            seeAlsoRefs.forEach((aSA) => {
                aUL2.append($("<li>" + this.fixCitation(aSA) + "</li>"));
            });
            aUL2.appendTo(anLI2);
            anLI2.appendTo(aUL);
        }
    }

    manageRoleRows() {
        const husbandRow = $("tr.roleRow[data-role='Husband']");
        const wifeRow = $("tr.roleRow[data-role='Wife']");
        const husbandFirstLabel = $("#husbandFirstLabel");

        // Check for undefined Husband and Wife roles and hide labels accordingly
        if (husbandRow.attr("data-name") === "undefined") {
            husbandRow.remove();
            husbandFirstLabel.hide();
        } else if (wifeRow.attr("data-name") === "undefined") {
            wifeRow.remove();
            husbandFirstLabel.hide();
        } else if (people[0].Gender === "Male") {
            husbandFirstLabel.hide();
        } else {
            husbandFirstLabel.css("display", "inline-block");
        }

        // Update Wife labels if conditions are met
        if (wifeRow.attr("data-gender") === "" || husbandRow.length === 0) {
            updateLabels("Wife");
        }

        // Update Husband labels if conditions are met
        if (husbandRow.attr("data-gender") === "" || wifeRow.length === 0) {
            updateLabels("Husband");
        }
    }

    updateLabels(role) {
        const roleRow = $(`tr.roleRow[data-role='${role}']`);
        const fatherHeading = $(`tr.${role}ParentsRow[data-role='${role}'] th.${role}FatherHeading`);
        const motherHeading = $(`tr.${role}ParentsRow[data-role='${role}'] th.${role}MotherHeading`);

        roleRow.find("th a").text("Name");
        fatherHeading.find("a").text("Father");
        if (fatherHeading.find("a").length === 0) {
            fatherHeading.text("Father:");
        }
        motherHeading.find("a").text("Mother");
        if (motherHeading.find("a").length === 0) {
            motherHeading.text("Mother:");
        }
    }

    toggleTables() {
        // Get the checked state of the "#showTables" checkbox
        const isChecked = $("#showTables").prop("checked");

        // Show or hide all ".citationTable" elements based on the checkbox state
        isChecked ? $(".citationTable").hide() : $(".citationTable").show();

        // Iterate through each nested list item in "#citationList"
        $("#citationList li li").each(function () {
            // Retrieve all text nodes within the current list item
            const textNodes = $(this)
                .contents()
                .filter(function () {
                    return this.nodeType === Node.TEXT_NODE;
                });

            // If there's a visible ".citationTable" in this list item
            if ($(this).find(".citationTable:visible").length) {
                let lastNode = textNodes[textNodes.length - 1];

                // Remove trailing table headings from the text node if needed
                if (lastNode.textContent.match(/:(\W|\n)*/) && !this.removedTableHeading) {
                    lastNode.textContent = lastNode.textContent.replace(/[A-Z][a-z]+:[\W\n]*?$/m, "");
                    this.removedTableHeading = true;
                }

                // Hide the citation table
                $(this).find(".citationTable").hide();
            }
            // If there's a ".citationTable" but it's not visible
            else if ($(this).find(".citationTable").length) {
                // Show the citation table
                $(this).find(".citationTable").show();
            }
        });
    }

    configureRolesAndLayout() {
        let roles = ["Husband", "Wife"];

        // Check if the role should be swapped based on local storage and data attributes
        if (
            $("tr.roleRow[data-role='Wife']").attr("data-name") === $("#wtid").val() &&
            localStorage.husbandFirst !== "1"
        ) {
            roles = ["Wife", "Husband"];
        }

        // Hide the 'husbandFirstLabel' if the roles are non-traditional
        if ($("tr[data-gender='Female'][data-role='Husband'],tr[data-gender='Male'][data-role='Wife']").length) {
            localStorage.husbandFirst = 0;
            $("#husbandFirstLabel").hide();
        }

        // Add children roles
        for (let i = 1; i < 31; i++) {
            roles.push(ordinal(i) + " Child");
        }

        // Get table and column widths
        const divWidth = $("#familySheetFormTable")[0].scrollWidth;
        const th1Width = $("#familySheetFormTable > thead > tr > th")[0].scrollWidth;
        const th2Width = $("#familySheetFormTable > thead > tr > th:nth-child(2)")[0].scrollWidth;
        const th3Width = $("#familySheetFormTable > thead > tr > th:nth-child(3)")[0].scrollWidth;

        updateDOMAndOrganizeTable(divWidth, th2Width, th3Width, roles);
    }

    // Assume ordinal is a function that already exists to convert numbers to their ordinal form (1st, 2nd, etc.)
    updateDOMAndOrganizeTable(divWidth, th2Width, th3Width, roles) {
        // Append new styles to the body
        $(
            `<style id='newDivs'>
    #familySheetFormTable, .tableContainer, .tableContainer table { width: ${divWidth}px; margin: auto; }
    .birthHeading, .BirthDate, #familySheetFormTable > thead > tr > th:nth-child(2) { width: ${th2Width}px; max-width: ${th2Width}px; }
    .BirthPlace { width: ${th3Width - 3}px; }
</style>`
        ).appendTo(this.$container);

        // Loop through each role and organize the table accordingly
        roles.forEach((aRole) => {
            const newDiv = $(`<div class='tableContainer ${aRole}'></div>`);
            const newTable = $("<table></table>");
            const newTbody = $("<tbody></tbody>");
            $("#familySheetFormTable > tbody > tr[data-role='" + aRole + "']").appendTo(newTbody);

            if (newTbody.find("tr").length) {
                newTbody.appendTo(newTable);
                newTable.appendTo(newDiv);
                newDiv.insertBefore("#notesAndSources");
            }
        });
    }

    initializePage() {
        // Show or hide 'Tables' label based on the presence of citation tables
        this.toggleDisplay("#showTablesLabel", !!$(".citationTable").length);

        // Show or hide 'Lists' label based on the presence of source lists
        this.toggleDisplay("#showListsLabel", !!$(".sourceUL").length);

        // Show or hide 'Gender' div based on the presence of '1st Child'
        this.toggleDisplay("#showGenderDiv", !!$("tr[data-role='1st Child']").length);

        // Determine if there are uncertain dates and show/hide status choice accordingly
        let uncertain = Array.from($(".date")).some((el) =>
            $(el)
                .text()
                .match(/[~<>]|abt\.|bef.\|aft\./)
        );
        this.toggleDisplay("#statusChoice", uncertain);

        // Initialize values
        this.setVals();

        // Remove the second married row if it exists
        if ($(".marriedRow").eq(1)) {
            $(".marriedRow").eq(1).remove();
        }

        // Show or hide 'Nicknames' label based on the presence of nicknames
        this.toggleDisplay("#showNicknamesLabel", !!$(".nicknames").length);

        // Call toggleTables function
        this.toggleTables();

        // Handle query parameters
        const searchParams = new URLSearchParams(window.location.search);
        const testing = searchParams.get("test");
        if (testing === "1") {
            // Implement any testing logic here
        }

        // Add print icon if not already present
        if ($("#printIcon").length === 0) {
            $("<img id='printIcon' src='views/familyGroupApp/images/print50.png'>").appendTo("header");
            $("#printIcon").click(() => window.print());
        }
    }

    toggleDisplay(selector, condition) {
        if (condition) {
            $(selector).css("display", "inline-block");
        } else {
            $(selector).hide();
        }
    }

    toggleLists() {
        // Get the checked state of the "#showLists" checkbox
        const isChecked = $("#showLists").prop("checked");

        // Show or hide all ".sourceUL" elements based on the checkbox state
        isChecked ? $(".sourceUL").show() : $(".sourceUL").hide();
    }

    makeFamilySheet() {
        this.researchNotes = [];
        const fsTable = $(
            "<table id='familySheetFormTable'><thead><tr><th></th><th>Name and/or Date</th><th>Place</th></tr></thead><tbody></tbody></table>"
        );
        let mainRole = "Wife";
        let spouseRole = "Husband";
        if (this.people[0].Gender == "Male") {
            mainRole = "Husband";
            spouseRole = "Wife";
            fsTable.attr("data-husband", this.people[0].Name);
        } else {
            fsTable.attr("data-wife", this.people[0].Name);
        }
        const mainRow = this.familySheetPerson(this.people[0], mainRole);

        let matchPerson;
        let theSpouse;
        if (this.keepSpouse) {
            matchPerson = this.keepSpouse;
        } else {
            matchPerson = this.people[0]?.Spouse[0]?.Name;
        }
        this.people.forEach((aPerson) => {
            if (aPerson.Name == matchPerson) {
                theSpouse = aPerson;
            }
        });
        const spouseRow = this.familySheetPerson(theSpouse, spouseRole);

        fsTable.find("> tbody").append($(mainRow), $(spouseRow));

        const oChildren = this.people[0].Child;
        if (oChildren.length > 0) {
            oChildren.sort((a, b) =>
                a.BirthDate + "-".replaceAll(/\-/g, "") > b.BirthDate + "-".replaceAll(/\-/g, "") ? 1 : -1
            );
        }
        const doneKids = [];
        this.checkAndAppendChildren(oChildren);

        $("#tree").slideUp();

        if (this.people[0].Name == undefined) {
            this.privateQ();
        } else {
            // Everything's OK!
            if (localStorage.fgsOptionsState == "removed") {
                $("#fgsOptions").addClass("removed");
            }
            $("#fgsOptions").slideDown();
            $(this.$container).append(fsTable);
            if (localStorage.husbandFirst == "1") {
                $("tr[data-role='Husband']").prependTo($("#familySheetFormTable > tbody"));
            }

            let clonedRow = "";
            $(".marriedRow").each(function () {
                if ($(this).text() != "Married:") {
                    clonedRow = $(this); //.clone(true)
                }
            });
            if (clonedRow == "") {
                clonedRow = $(".marriedRow").eq(0); //.clone(true);
            }

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
            let husbandName = "";
            let wifeName = "";
            let andText = "";
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
                andText = "&nbsp;and&nbsp;";
            }
            const coupleText = husbandName + andText + wifeName;
            const husbandNameSpan = $("<span>" + husbandName + "</span>");
            const wifeNameSpan = $("<span>" + wifeName + "</span>");
            const andSpan = $("<span>" + andText + "</span>");

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

            const notesAndSources = $("<section id='notesAndSources'></section>");
            $("<div id='notes'><h2>Research Notes:</h2><div id='notesNotes'></div></div>").appendTo(notesAndSources);

            if (this.researchNotes.length > 0) {
                this.researchNotes.forEach((rNote) => {
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

            let setWidth = 0;
            if ($("#familySheetFormTable").length) {
                setWidth = $("#familySheetFormTable")[0].scrollWidth;
            } else if ($(".tablecontainer.husband table").length) {
                setWidth = $(".tablecontainer.husband table")[0].scrollWidth;
            } else {
                setWidth = $(".tablecontainer.wife table")[0].scrollWidth;
            }

            $("<div id='sources'><h2>Sources:</h2></div>").appendTo(notesAndSources);
            notesAndSources.appendTo($(this.$container));
            notesAndSources.css({ "max-width": setWidth, "width": setWidth });
            $("#familySheetFormTable").css({ "max-width": setWidth, "min-width": setWidth, "width": setWidth });
            const mList = $("<ul id='citationList'></ul>");

            this.citationTables = [];

            // Then call the refactored function
            this.appendReferences(mList);

            // Your existing code for appending to the DOM and other logic
            const params = new URLSearchParams(window.location.search);
            $("#sources").append(mList);
            $("#sources li[data-wtid='" + this.husbandWTID + "']").prependTo($("#sources ul").eq(0));

            // ... (rest of your code)

            this.setBaptChrist();

            $(".bioHeading").click(function () {
                $(this).next().find(".theBio").slideToggle();
            });

            /**
             * Toggles the visibility of citation tables based on the state of the "#showTables" checkbox.
             * If the checkbox is checked, citation tables are hidden.
             * Otherwise, citation tables are shown.
             */

            /**
             * Updates the state of tables based on checkbox state and stores the state.
             */
            $("#showTables").change(function () {
                toggleTables();
                storeVal($(this));
            });

            /**
             * Updates the state of lists based on checkbox state and stores the state.
             */
            $("#showLists").change(function () {
                toggleLists();
                storeVal($(this));
            });

            /**
             * Allows editing of citation list items.
             * Creates a textarea for editing when a list item is clicked.
             */
            $("#citationList li li").click(function () {
                closeInputs();
                if ($(this).find("textarea").length === 0) {
                    const newTextarea = $("<textarea class='citationEdit'>" + $(this).html() + "</textarea>");
                    $(this).html(newTextarea);
                    newTextarea.focus();
                    newTextarea.on("blur", function () {
                        if ($(this).val() === "") {
                            $(this).parent().remove();
                        } else {
                            $(this).parent().html($(this).val());
                            $(this).remove();
                        }
                    });
                }
            });

            /**
             * Handles the visibility of bio instructions and styles for print media based on the existence of ".bioRow" elements.
             */
            if ($(".bioRow").length) {
                $("#toggleBios,#includeBiosWhenPrinting").css("display", "inline-block");
                $("#includeBios").change(function () {
                    storeVal($(this));
                    if ($(this).prop("checked") === true) {
                        $(
                            "<style id='includeBiosStyle'>@media print {.familySheetForm .bioRow{display:table-row !important;} .familySheetForm .theBio {display:block !important}}</style>"
                        ).appendTo(this.$container);
                    } else {
                        $("#includeBiosStyle").remove();
                    }
                });
                $("#bioInstructions").show();
            } else {
                $("#bioInstructions").hide();
            }

            /**
             * Updates the display of gender based on radio button selection and stores the value.
             */
            $("input[name='showGender']").change(function () {
                storeVal($(this));
                const showGenderVal = $("input[name='showGender']:checked").val();

                $(".fsGender").each(function () {
                    $(this).text("");

                    if (showGenderVal === "initial") {
                        $(this).text($(this).attr("data-gender").substring(0, 1));
                    }

                    if (showGenderVal === "word") {
                        $(this).text($(this).attr("data-gender"));
                    }
                });
            });

            $("#fgsInfo").slideDown();

            /**
             * Hides or shows elements based on the presence and attributes of Husband and Wife roles.
             */

            /**
             * Updates the status choice and modifies the date strings accordingly.
             */
            $("input[name='statusChoice']").change(function () {
                storeVal($(this));

                // Check if abbreviations are selected
                const isAbbr = $("input[name='statusChoice'][value='abbreviations']").prop("checked");

                // Update each date text based on the selected status
                $(".date").each(function () {
                    const currentText = $(this).text();
                    if (isAbbr) {
                        const replacedText = currentText
                            .replaceAll(/~/g, "abt. ")
                            .replaceAll(/</g, "bef. ")
                            .replaceAll(/>/g, "aft. ");
                        $(this).text(replacedText);
                    } else {
                        const replacedText = currentText
                            .replaceAll(/abt\.\s/g, "~")
                            .replaceAll(/bef\.\s/g, "<")
                            .replaceAll(/aft\.\s/g, ">");
                        $(this).text(replacedText);
                    }
                });
            });

            // Initialize the page
            this.initializePage();
        }
    }

    closeInputs() {
        $(".edit").each(function () {
            const isTextarea = $(this).prop("tagName") === "TEXTAREA";
            const isCaption = $(this).parent().prop("tagName") === "CAPTION";

            let newValue = $(this).val();

            // Check for unsafe "script" tags
            if (!/script/i.test(newValue)) {
                if (isTextarea || isCaption) {
                    $(this).parent().html(this.nl2br(newValue));
                } else {
                    $(this).parent().text(newValue);
                }
            }

            $(this).remove();
        });
    }

    ordinal(i) {
        const j = i % 10;
        const k = i % 100;

        if (j === 1 && k !== 11) {
            return `${i}st`;
        }
        if (j === 2 && k !== 12) {
            return `${i}nd`;
        }
        if (j === 3 && k !== 13) {
            return `${i}rd`;
        }

        return `${i}th`;
    }

    setBaptChrist() {
        // Loop through each radio button to find the one that is checked
        $("input[type=radio][name=baptismChristening]").each(function () {
            // Check if the radio button is selected
            if ($(this).prop("checked")) {
                // Get the value of the selected radio button
                const selectedValue = $(this).val();

                // Update the column heading and label text based on the selected value
                $("th.baptismHeading").text(`${selectedValue}:`);
                $("#showBaptisedText").text(`Show ${selectedValue}`);
            }
        });
    }
    excelOut() {
        const today = new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        let fileName;

        // Determine the file name based on the context
        if ($("#missingParents").length) {
            fileName = `Missing Parents - ${$("#wtid").val()}`;
        }

        // Initialize workbook
        const wb = XLSX.utils.book_new();
        wb.Props = {
            Title: fileName,
            Subject: fileName,
            Author: "WikiTree",
            CreatedDate: new Date(),
        };

        wb.SheetNames.push(fileName);

        const ws_data = [];

        // Populate the worksheet data if the missingParents element is present
        if ($("#missingParents").length) {
            const thVals = [
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

            const rows = $("#peopleList tbody tr");
            rows.each(function () {
                if ($(this).css("display") !== "none") {
                    const rowValues = [
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
                    ws_data.push(rowValues);
                }
            });
        }

        // Create the worksheet and attach it to the workbook
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        wb.Sheets[fileName] = ws;

        // Convert string to array buffer
        function s2ab(s) {
            const buf = new ArrayBuffer(s.length);
            const view = new Uint8Array(buf);
            for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
            return buf;
        }

        $("#downloadLines, .downloadLines").unbind();
        $("#downloadLines, .downloadLines").click(function () {
            if ($("#missingParents").length) {
                const wscols = [
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

            const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
            saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), `${fileName}.xlsx`);
        });
    }

    toggleStyle(styleId, styleContent, optionalElement = null) {
        return function () {
            if ($(this).prop("checked") === false) {
                $(`<style id='${styleId}'>${styleContent}</style>`).appendTo(this.$container);
                if (optionalElement) {
                    $(`${optionalElement}`).prop("disabled", true);
                }
            } else {
                $(`#${styleId}`).remove();
                if (optionalElement) {
                    $(`${optionalElement}`).prop("disabled", false);
                }
            }
            storeVal($(this));
        };
    }

    // Function to toggle bios and update localStorage
    toggleBios() {
        if ($(this).prop("checked") === true) {
            $(".theBio").slideDown();
            setTimeout(() => {
                $(`<style id='showBiosStyle'>.familySheetForm .bioRow div.theBio{display:block;}</style>`).appendTo(
                    this.$container
                );
            }, 1000);
        } else {
            $(".theBio").slideUp();
            setTimeout(() => {
                $("#showBiosStyle").remove();
            }, 1000);
        }
        storeVal($(this));
    }

    handleSlideToggle(selector, localStorageKey, callback = null) {
        $(selector).slideUp("slow");
        setTimeout(function () {
            const elem = $(selector);
            elem.toggleClass("removed");
            elem.slideDown("slow");

            const isRemoved = elem.hasClass("removed");
            localStorage.setItem(localStorageKey, isRemoved ? "removed" : "center");

            if (callback) {
                callback(isRemoved);
            }
        }, 1000);
    }

    async getSomeRelatives(id, fields = "*") {
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
            // Consider additional error-handling logic here
        }
    }

    // Make the family member arrays easier to handle
    extractRelatives(rel, theRelation = false) {
        // Initialize an empty array to hold person objects.
        let people = [];

        // Check if rel is undefined or null and return false if it is.
        if (typeof rel === "undefined" || rel === null) {
            return false;
        }

        // Get keys from the rel object.
        const pKeys = Object.keys(rel);

        // Loop through each key to get person object and optionally add relation type.
        pKeys.forEach((pKey) => {
            let aPerson = rel[pKey];
            if (theRelation !== false) {
                aPerson.Relation = theRelation;
            }
            people.push(aPerson);
        });

        // Return the array of person objects.
        return people;
    }

    familyArray(person) {
        // Define the types of relationships to look for.
        const rels = ["Parents", "Siblings", "Spouses", "Children"];

        // Initialize the familyArr array with the main person.
        let familyArr = [person];

        // Loop through each type of relationship.
        rels.forEach((rel) => {
            // Remove trailing 's' or 'ren' to get the singular form of the relation.
            const relation = rel.replace(/s$/, "").replace(/ren$/, "");

            // Concatenate the relatives of the current type to the familyArr.
            familyArr = familyArr.concat(this.extractRelatives(person[rel], relation));
        });

        // Return the complete family array.
        return familyArr;
    }
};
