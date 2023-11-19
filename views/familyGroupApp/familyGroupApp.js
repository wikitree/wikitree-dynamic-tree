window.FamilyGroupAppView = class FamilyGroupAppView extends View {
    static APP_ID = "familyGroupApp";
    static setLinksToOpenInNewTab() {
        $("a").attr("target", "_blank");
    }

    constructor(container_selector, person_id) {
        super(); // If there is a constructor in the parent class, make sure to call it.
        this.container_selector = container_selector;
        this.person_id = person_id;
        this.initializeLocalStates(); // Call this method to set initial state
        this.$header = $("header");
        this.$body = $("body");
        this.colorRules = `#view-container.familyGroupApp #familySheetFormTable tr,
        #view-container.familyGroupApp #familySheetFormTable caption,
        .roleRow[data-gender],
        .roleRow[data-gender] th,
        #view-container.familyGroupApp tr.marriedRow  {
            background-color: #fff !important;
        } 
        `;
        this.showBaptismRules = `#view-container.familyGroupApp tr.baptismRow,
        #view-container.familyGroupApp #baptChrist {
            display: none;
        }
        `;
        this.showWTIDsRules = `#view-container.familyGroupApp #familySheetFormTable .fsWTID {
            display: none;
        }
        `;
        this.showOtherLastNamesRules = `#view-container.familyGroupApp #familySheetFormTable caption span.otherLastNames,
        #view-container.familyGroupApp span.otherLastNames {
            display: none;
        }
        `;
        this.showParentsSpousesDatesRules = `#view-container.familyGroupApp #familySheetFormTable span.parentDates,
        #view-container.familyGroupApp #familySheetFormTable span.spouseDates {
            display: none;
        }
        `;
        this.showNicknamesRules = `#view-container.familyGroupApp #familySheetFormTable caption span.nicknames,
        #view-container.familyGroupApp span.nicknames {
            display: none;
        }
        `;
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
        this.calledPeople = [this.person_id];
        //this.calledPeople = [];
        this.calls = 1;
        this.privates = 0;
        this.references = [];
        this.doneKids = [];
    }

    toggleStyle(styleId, styleContent, isChecked, optionalElement = null) {
        const headElement = $("head");

        if (!isChecked) {
            if ($(`#${styleId}Style`).length === 0) {
                headElement.append(`<style id='${styleId}Style'>${styleContent}</style>`);
            }
            if (optionalElement) {
                $(optionalElement).prop("disabled", true);
            }
        } else {
            // If the checkbox is checked, remove the style to show elements
            $(`#${styleId}Style`).remove();
            if (optionalElement) {
                $(optionalElement).prop("disabled", false);
            }
        }
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
        const bioFormat = "both";
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

                        // Check if the person is already in this.people
                        if (!this.people.some((p) => p.Id === mPerson.Id)) {
                            // Populate spouse, children, siblings, and parents
                            ["Spouse", "Child", "Sibling", "Parent"].forEach((relation) => {
                                let s = "s";
                                if (relation === "Child") s = "ren";
                                const relatives = this.getRels(mPerson[`${relation}${s}`], mPerson, relation);
                                mPerson[relation] = relatives;
                            });

                            this.people.push(mPerson);
                        }

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
                            //  this.configureRolesAndLayout();
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

        // Load the family group sheet HTML into the container
        this.loadFamilyGroupSheetHTML();

        // Setup event listeners
        this.setupEventListeners();

        this.startIt();

        // Initialize values
        this.setVals();
    }

    startIt() {
        this.keepSpouse = "";
        $("#familySheetFormTable,#tree,#notesAndSources,#privateQ").remove();
        $("<img id='tree' src='views/familyGroupApp/images/tree.gif'>").appendTo($(this.$container));
        this.getFamily(this.person_id);
    }

    setupEventListeners() {
        this.$body.off("click.fgs change.fgs");
        // Delegated event listeners for checkbox changes

        this.$container.on("change.fgs", "#dateFormatSelect", (e) => {
            const $this = $(e.currentTarget);
            const dateFormat = $this.val();
            this.storeVal($this);
        });

        this.$container.on("change.fgs", "#showBaptism", (e) => {
            // logging
            console.log("checkbox changed");
            console.log("this", this);
            const isChecked = $(e.target).prop("checked");

            this.toggleStyle("showBaptism", this.showBaptismRules, isChecked, "#baptChrist");
        });
        this.$container.on("change.fgs", "#showBurial", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showBurial", "#view-container.familyGroupApp tr.burialRow{display:none;}", isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fgs", "#showNicknames", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showNicknames", this.showNicknamesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fgs", "#showParentsSpousesDates", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showParentsSpousesDates", this.showParentsSpousesDatesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fgs", "#showOtherLastNames", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showOtherLastNames", this.showOtherLastNamesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fgs", "#useColour", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("useColour", this.colorRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fgs", "#showWTIDs", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showWTIDs", this.showWTIDsRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fgs", "#showBios", () => this.toggleBios());

        // Delegated event listeners for radio button changes
        this.$container.on("change.fgs", "input[type=radio][name=baptismChristening]", () => this.setBaptChrist());
        this.$container.on("change.fgs", "input[type=radio][name=statusChoice]", (e) => this.setStatusChoice(e));
        this.$container.on("change.fgs", "input[type=radio][name=showGender]", () => this.setShowGender());

        // Delegated click.fgs event listeners for options and information panels
        this.$body.on("click.fgs", "#fgsNotesButton", function () {
            $("#fgsInfo").toggle();
            $("#fgsNotesButton").toggleClass("active");
        });
        this.$body.on("click.fgs", "#fgsInfo", function () {
            $("#fgsInfo").slideUp();
            $("#fgsNotesButton").toggleClass("active");
        });
        this.$body.on("click.fgs", "#fgsOptionsButton", function () {
            $("#fgsOptions").toggle();
            $("#fgsOptionsButton").toggleClass("active");
        });
        this.$body.on("click.fgs", "#fgsOptions x", function () {
            $("#fgsOptions").slideUp();
            $("#fgsOptionsButton").toggleClass("active");
        });

        // Delegated change.fgs event listener for the long month display setting

        this.$container.on("click.fgs", ".fsName a, caption a", function (e) {
            e.preventDefault();
        });

        this.$container.on("click.fgs", "td[data-name],span[data-name]", (e) => {
            const $this = $(e.currentTarget);
            const dTR = $this.closest("tr");
            this.keepSpouse = dTR.attr("data-name") || "";
            localStorage.setItem("familyGroupApp_keepSpouse", this.keepSpouse);
            $("#wt-id-text").val($this.attr("data-name"));
            this.init(this.$container, $this.attr("data-name"));
        });

        this.$container.on("change.fgs", "#husbandFirst", (e) => {
            const $this = $(e.currentTarget);

            this.manageRoleOrder();

            this.storeVal($this);

            $(".theBio").find("tr.marriedRow").remove();
        });

        if ($(".nicknames").length == 0) {
            $(".showNicknamesSpan").hide();
        }

        this.$container.on("change.fgs", "#showOtherLastNames", (e) => {
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

        this.$container.on("change.fgs", "#showBios", (e) => {
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

        this.$container.on("change.fgs", "input[type=radio][name=baptismChristening]", (e) => {
            const $this = $(e.currentTarget);
            this.setBaptChrist();
            this.storeVal($this);
        });

        this.$container.on(
            "click.fgs",
            ".BaptismDate, .BaptismPlace, .buriedDate, .buriedPlace, caption, h1, .birthRow td, .deathRow td, .otherMarriagePlace, span.marriageDate, .marriedPlace, .editable, .marriedRow td",
            (e) => {
                const $this = $(e.currentTarget);
                let theEl = $this;
                // Check if an input already exists within the clicked element
                if ($this.find("input").length === 0) {
                    let inputBox;

                    // Determine if the clicked element is a CAPTION
                    const isCaption = $this.closest("caption").length;
                    if (isCaption) {
                        theEl = $this.closest("caption");
                    }
                    const initialValue = isCaption ? theEl.html() : theEl.text();

                    // Create the input box
                    inputBox = $("<input style='background:white;' type='text' class='edit'>").val(initialValue);

                    // Clear existing text and append input box
                    theEl.empty().append(inputBox);

                    // Focus on the input box
                    inputBox.focus();

                    // Event handlers for the input box
                    inputBox.keypress((e) => {
                        if (e.key === "Enter") {
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
        this.$container.on("click.fgs", "#notesNotes", (e) => {
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
        this.$container.on("click.fgs", ".bioHeading", (e) => {
            const $this = $(e.currentTarget);
            $this.next().find(".theBio").toggle();
        });
    }

    manageRoleOrder() {
        const $this = $("#husbandFirst");
        const husbandID = $("tr.roleRow[data-role='Husband']").attr("data-name");
        const husbandCitations = $("#citationList li[data-wtid='" + this.htmlEntities(husbandID) + "']");
        const husbandNameCaption = $("caption span.fsWTID:contains('" + this.htmlEntities(husbandID) + "')").parent();
        let wifeNameCaption;
        if (this.people[0].Name != husbandID) {
            wifeNameCaption = $(
                "caption span.fsWTID:contains('" + this.htmlEntities(this.people[0].Name) + "')"
            ).parent();
        }

        if ($this.prop("checked") == true) {
            $("table.wife").insertAfter($("table.husband"));
            $(".marriedRow").eq(0).appendTo($("table.husband tbody"));

            husbandCitations.prependTo($("#citationList"));
            husbandNameCaption.prependTo($("caption"));

            if (this.people[0].Name != husbandID) {
                wifeNameCaption.appendTo($("caption"));
            }
        } else if (this.people[0].Gender == "Female") {
            $("table.husband").insertAfter($("table.wife"));
            $(".marriedRow").eq(0).appendTo($("table.wife tbody"));
            $("#citationList li[data-wtid='" + this.htmlEntities(this.people[0].Name) + "']").prependTo(
                $("#citationList")
            );

            husbandNameCaption.appendTo($("caption"));

            if (this.people[0].Name != husbandID) {
                wifeNameCaption.prependTo($("caption"));
            }
        }
    }

    setStatusChoice(e) {
        const $this = $(e.currentTarget);
        this.storeVal($this);
        let isAbbr = false;
        if ($("input[name='statusChoice'][value='abbreviations']").prop("checked") == true) {
            isAbbr = true;
        }
        $(".date").each(function () {
            if (isAbbr) {
                $(this).text(
                    $(this).text().replaceAll(/~/g, "abt. ").replaceAll(/</g, "bef. ").replaceAll(/>/g, "aft. ")
                );
            } else {
                $(this).text(
                    $(this)
                        .text()
                        .replaceAll(/abt\.\s/g, "~")
                        .replaceAll(/bef\.\s/g, "<")
                        .replaceAll(/aft\.\s/g, ">")
                );
            }
        });
    }

    setShowGender() {
        // Get the value of the selected radio button for showGender
        const showGenderValue = this.$container.find('input[name="showGender"]:checked').val();
        this.updateGenderDisplay(showGenderValue);
    }

    updateGenderDisplay(genderDisplayOption) {
        this.$container.find(".fsGender").each(function () {
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
        const shouldShowBios = this.$container.find("#showBios").is(":checked");
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
        <x>&#10005;</x>
        <h2>Show:</h2> 
        <label id='showNicknamesLabel'><input type='checkbox' id='showNicknames'  checked value='1'><span id='showNicknamesSpan'>nicknames</span></label>
        <label id='husbandFirstLabel'><input type='checkbox' id='husbandFirst'  checked value='1'><span id='husbandFirstSpan'>husband first</span></label>
        <label id='showOtherLastNamesLabel'><input type='checkbox' id='showOtherLastNames'  checked value='1'><span id='showOtherLastNamesSpan'>other last names</span></label>
        <select id="dateFormatSelect">
            <option value="sMDY">MMM DD, YYYY (e.g., Nov 24, 1859)</option>
            <option value="DsMY">DD MMM YYYY (e.g., 24 Nov 1859)</option>
            <option value="MDY">Month DD, YYYY (e.g., November 24, 1859)</option>
            <option value="DMY">DD Month YYYY (e.g., 24 November 1859)</option>
            <option value="YMD">YYYY-MM-DD (e.g., 1859-11-24)</option>
        </select>    
        <label><input type='checkbox' id='showBaptism'  checked value='1'><span id='showBaptisedText'>${spell(
            "baptized"
        )}</span></label>
        <div id='baptChrist' class='radios'>
        <label><input type='radio' name='baptismChristening' checked value='${spell("Baptized")}'>'${spell(
            "Baptized"
        )}'</label><label><input type='radio' name='baptismChristening' value='Christened'>'Christened'</label></div>
        <label><input type='checkbox' id='showBurial'  checked value='1'>buried</label>
        <label id='showWTIDsLabel'><input type='checkbox' id='showWTIDs'><span>WikiTree IDs</span></label>
        <label id='showParentsSpousesDatesLabel'><input type='checkbox' checked id='showParentsSpousesDates'><span>parents' and spouses' dates</span></label>
        
        <div id='showGenderDiv' class='radios'><span>children's genders:</span> 
        <label><input type='radio' name='showGender' checked value='initial'>initial</label>
        <label><input type='radio' name='showGender' value='word'>word</label>
        <label><input type='radio' name='showGender' value='none'>none</label>
        </div>

        <label id='showTablesLabel'><input type='checkbox' id='showTables'  checked value='1'>tables in 'Sources'</label>
        <label id='showListsLabel'><input type='checkbox' id='showLists'  checked value='1'>lists in 'Sources'</label>
        <label><input type='checkbox' id='useColour' checked value='1'>${spell("color")}</label>
        <label id='toggleBios'><input type='checkbox' id='showBios'><span>all biographies</span></label>
        <label id='includeBiosWhenPrinting'><input type='checkbox' id='includeBios'><span>biographies when printing</span></label>
        <div id='statusChoice' class='radios'><span class='label'>status</span>:
        <label><input type='radio' name='statusChoice' checked value='symbols'>~, &lt;, &gt;</label><label><input type='radio' name='statusChoice' value='abbreviations'>abt., bef., aft.</label>
        </div>

        </div>
        
        <div id='fgsInfo'>
        <x>&#10005;</x>
        <span class='notesHeading'>Notes</span>
        <ul>
        <li id='bioInstructions'>Click 'Biography' (bottom left) to see each biography.</li>
        <li>The roles ('Husband', 'Wife', etc.) link to WikiTree profiles.</li>
        <li>Click a name to see that person's family group.</li>
        <li>Most of the page is editable for printing. If you see some HTML (e.g. &lt;span&gt;John Brown&lt;/span&gt;), just edit the text between the tags.</li>
        </ul>
        </div>`;
        this.$container.html(familyGroupSheetHTML);
        const fgsButtons = `<div id="fgsButtons"><button class="small" id="fgsOptionsButton">Options</button><button class="small" id="fgsNotesButton">Notes</button></div>`;
        if ($("#fgsButtons").length === 0) {
            $("header").append(fgsButtons);
        }
        if ($("#fgsOptionsButton").hasClass("active")) {
            $("#fgsOptions").show();
        }
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

        // Initialize the fullName with Prefix if it exists.
        let fullName = cleanName(fPerson.Prefix) ? `${fPerson.Prefix} ` : "";

        // Include FirstName or RealName (RealName takes precedence if no FirstName).
        fullName += cleanName(fPerson.FirstName)
            ? `${fPerson.FirstName} `
            : cleanName(fPerson.RealName)
            ? `${fPerson.RealName} `
            : "";

        // Add MiddleName and Nicknames if they exist.
        fullName += cleanName(fPerson.MiddleName) ? `${fPerson.MiddleName} ` : "";
        fullName += cleanName(fPerson.Nicknames)
            ? `${fPerson.Nicknames.split(/,\s?/)
                  .map((nick) => `“${nick}”`)
                  .join(" ")} `
            : "";

        // Handle last names, including the condition for LastNameAtBirth.
        if (cleanName(fPerson.LastNameAtBirth) && fPerson.LastNameAtBirth !== fPerson.LastNameCurrent) {
            fullName += `(${fPerson.LastNameAtBirth}) `;
        }
        if (cleanName(fPerson.LastNameCurrent)) {
            fullName += `${fPerson.LastNameCurrent} `;
        }

        // Append Suffix if it exists.
        fullName += cleanName(fPerson.Suffix) ? `${fPerson.Suffix} ` : "";

        // Determine the display and short names.
        const fName = getLongestName(longName, longNamePrivate, fullName).trim();
        const sName = cleanName(fPerson.ShortName) ? fPerson.ShortName.trim() : fName;

        return [fName, sName];
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
                    bioFormat: "html",
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
        const settings = this.getSettings();
        const dateFormat = settings.dateFormatSelect;
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

    getDateFormat(fbds) {
        let fullDateFormat = "j M Y";

        console.log("getDateFormat: ", fbds);

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
                categoryMatch.forEach(function (aCat) {
                    const dCat = aCat.split("Category:")[1].replace(/\]\]/, "");
                    if (
                        dCat.match(
                            /(Cemetery)|(Memorial)|(Cimetière)|(kyrkogård)|(temető)|(Grave)|(Churchyard)|(Burial)|(Crematorium)|(Erebegraafplaats)|(Cementerio)|(Cimitero)|(Friedhof)|(Burying)|(begravningsplats)|(Begraafplaats)|(Mausoleum)|(Chapelyard)/i
                        ) != null &&
                        dCat.match("Crawford-7109") == null
                    ) {
                        fsPerson.Cemetery = dCat.trim();
                    }
                });
            }
            const eventMatch = bioSplit[0].match(/\{\{Event[^]*?\}\}/gm);
            if (eventMatch != null) {
                eventMatch.forEach(function (anEvent) {
                    if (anEvent.match(/type=(Baptism|Christening)/i) != null) {
                        const eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                        eBits.forEach(function (anBit) {
                            anBit = anBit.replace(/<ref.*?>/, "");
                            const anBitBits = anBit.split("=");
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
        this.references.push([fsPerson.Name, myRefs, mSeeAlso]);

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
        const otherSpouses = [];
        let mainSpouse = "";
        let mainSpouseName = "";
        if (fsPerson.Name == this.people[0].Name) {
            mainPerson = true;

            if (localStorage.getItem("familyGroupApp_keepSpouse")) {
                this.keepSpouse = localStorage.getItem("familyGroupApp_keepSpouse");
                localStorage.removeItem("familyGroupApp_keepSpouse");
            }
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

        let marriageRow;

        const roleRow = this.renderRoleRow(fsPerson, role);
        const birthRow = this.renderBirthRow(BirthDate, BirthLocation, role, fsPerson?.DataStatus?.BirthDate);
        const deathRow = this.renderDeathRow(DeathDate, DeathLocation, role, fsPerson?.DataStatus?.DeathDate);
        const baptismRow = this.renderBaptismRow(baptismDate, baptismPlace, role);

        if (mainSpouse?.marriage_date || mainSpouse?.marriage_location) {
            marriageRow = this.renderMarriageRow(mainSpouse?.marriage_date, mainSpouse?.marriage_location, role) || "";
        }
        const burialRow = this.renderBurialRow(burialDate, burialPlace, role);
        const otherMarriageRow = this.renderOtherMarriageRow(fsPerson, mainSpouse, otherSpouses, role);
        const parentsRow = this.renderParentsRow(fsPerson, mainPerson, matchingPerson, role, showRole);
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
            <tr data-gender='${fsPerson.Gender}'
                data-name='${escapedName}'
                title='${escapedName}'
                data-role='${role}'
                class='roleRow'>
                <th class='role heading'>
                    <a href='https://www.wikiTree.com/wiki/${escapedName}'>${role}</a>:
                </th>
                <td class='fsName'  colspan='2'>
                    <span data-name='${escapedName}'>
                        ${this.displayName(fsPerson)[0]}
                    </span>
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

    formatDateAndCreateRow = (date, place, role, rowType, rowLabel, dateStatus = "") => {
        const settings = this.getSettings();
        const dateFormat = settings.dateFormatSelect;
        const formattedDate = this.isOK(date) ? convertDate(date, dateFormat, dateStatus) : "";

        const rowClass = `${role.toLowerCase()} ${rowType}`;
        const dateClass = `${rowType}Date date`;

        return `<tr data-role="${role}" class="${rowClass}">
                    <th class="${rowClass}">${rowLabel}:</th>
                    <td class="${dateClass}" data-date="${date}">${formattedDate}</td>
                    <td class="${rowType}Place">${place}</td>
                </tr>`;
    };

    renderBirthRow = (birthDate, birthPlace, role, birthDateStatus) => {
        return this.formatDateAndCreateRow(birthDate, birthPlace, role, "birthRow", "Born", birthDateStatus);
    };

    renderDeathRow = (deathDate, deathPlace, role, deathDateStatus) => {
        return this.formatDateAndCreateRow(deathDate, deathPlace, role, "deathRow", "Died", deathDateStatus);
    };

    renderBaptismRow = (baptismDate, baptismPlace, role) => {
        return this.formatDateAndCreateRow(baptismDate, baptismPlace, role, "baptismRow", spell("Baptized"));
    };

    renderMarriageRow = (marriageDate, marriagePlace, role) => {
        const formattedMarriageDate = this.isOK(marriageDate)
            ? convertDate(marriageDate, this.getSettings().dateFormatSelect)
            : "";
        const marriageRow =
            this.isOK(marriageDate) || this.isOK(marriagePlace)
                ? `<tr class='marriedRow'><th class="${role.toLowerCase()} marriage">Married:</th>
               <td class='date marriedDate' data-date="${marriageDate}">${formattedMarriageDate}</td><td>${marriagePlace}</td></tr>`
                : "";
        return marriageRow;
    };

    /*
    renderMarriageRow = (marriageDate, marriagePlace, role) => {
        if (this.isOK(marriageDate) || this.isOK(marriagePlace)) {
            return this.formatDateAndCreateRow(marriageDate, marriagePlace, role, "marriedRow", "Married");
        }
        return "";
    };
*/
    renderBurialRow = (burialDate, burialPlace, role) => {
        return this.formatDateAndCreateRow(burialDate, burialPlace, role, "burialRow", "Buried");
    };
    /*
    renderMarriageRow = (marriageDate, marriagePlace, role) => {
        //const formattedMarriageDate = this.isOK(marriageDate) ? this.getDateFormat(marriageDate.split("-")) : "";

        const settings = this.getSettings();
        const dateFormat = settings.dateFormatSelect;
        const formattedMarriageDate = this.isOK(marriageDate) ? convertDate(marriageDate, dateFormat) : "";

        const marriageRow =
            this.isOK(marriageDate) || this.isOK(marriagePlace)
                ? `<tr class='marriedRow'><th class="${role.toLowerCase()} marriage">Married:</th>
                <td  class='date marriedDate' data-date="${marriageDate}">${formattedMarriageDate}</td><td>${marriagePlace}</td></tr>`
                : "";
        return marriageRow;
    };
    */

    /*
    renderOtherMarriageRow = (fsPerson, mainSpouse, otherSpouses, role) => {
        let otherMarriageRow = "";

        // Check if value is OK (not null or undefined)
        const isOK = (value) => value !== null && value !== undefined;

        if (otherSpouses.length === 0 && fsPerson.Spouse && fsPerson.Spouse.length > 1) {
            // Log the condition being checked
            otherSpouses.push(
                ...fsPerson.Spouse.filter((anoSpouse) => {
                    const isDifferentSpouse =
                        anoSpouse.Name !== this.people[0].Name &&
                        anoSpouse.Name !== mainSpouse.Name &&
                        anoSpouse.Name !== this.keepSpouse;
                    return isDifferentSpouse;
                })
            );
        }

        if (otherSpouses.length > 0) {
            otherSpouses.forEach((oSpouse, index) => {
                const { marriage_date, marriage_end_date, marriage_location, Name } = oSpouse;

                const formattedMarriageDate = this.isOK(marriage_date)
                    ? this.getDateFormat(marriage_date.split("-"))
                    : "";
                let otherSpouseMarriageDate = this.isOK(marriage_date)
                    ? `<span class='marriageDate date' data-date="${marriage_date}">${formattedMarriageDate}</span>`
                    : "";

                const formattedMarriageEndDate = this.isOK(marriage_end_date)
                    ? this.getDateFormat(marriage_end_date.split("-"))
                    : "";
                let otherSpouseMarriageEndDate = this.isOK(marriage_end_date)
                    ? `<span class='marriageEndDate date' data-date="${marriage_end_date}">&nbsp;- ${formattedMarriageEndDate}</span>`
                    : "";
                let otherSpouseName = this.displayName(oSpouse)[0];
                let otherSpouseMarriageLocation = this.isOK(marriage_location) ? marriage_location : "";

                const oSpousesHeadingText =
                    index === 0 ? (otherSpouses.length > 1 ? "Other Marriages:" : "Other Marriage:") : "";

                otherMarriageRow += `
                <tr data-person='${htmlEntities(fsPerson.Name)}' data-role='${role}' class='otherMarriageRow'>
                    <th class='otherMarriageHeading heading'>${oSpousesHeadingText}</th>
                    <td class='otherMarriageDate'>
                        <span class='otherSpouseName' data-name='${this.htmlEntities(Name)}'>${otherSpouseName.replace(
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
                <td class='otherMarriageDate date editable empty' data-date=""></td>
                <td class='otherMarriagePlace empty editable'></td>
            </tr>`;
        }

        return otherMarriageRow;
    };
    */

    renderOtherMarriageRow = (fsPerson, mainSpouse, otherSpouses, role) => {
        let otherMarriageRow = "";

        if (otherSpouses.length === 0 && fsPerson.Spouse && fsPerson.Spouse.length > 1) {
            otherSpouses.push(
                ...fsPerson.Spouse.filter((anoSpouse) => {
                    return (
                        anoSpouse.Name !== this.people[0].Name &&
                        anoSpouse.Name !== mainSpouse.Name &&
                        anoSpouse.Name !== this.keepSpouse
                    );
                })
            );
        }

        if (otherSpouses.length > 0) {
            otherSpouses.forEach((oSpouse, index) => {
                const { marriage_date, marriage_end_date, marriage_location, Name } = oSpouse;
                const settings = this.getSettings();
                const dateFormat = settings.dateFormatSelect;

                const formattedMarriageDate = this.isOK(marriage_date) ? convertDate(marriage_date, dateFormat) : "";
                const formattedMarriageEndDate = this.isOK(marriage_end_date)
                    ? convertDate(marriage_end_date, dateFormat)
                    : "";
                const otherSpouseName = this.displayName(oSpouse)[0];
                const otherSpouseMarriageLocation = this.isOK(marriage_location) ? marriage_location : "";

                const oSpousesHeadingText =
                    index === 0 ? (otherSpouses.length > 1 ? "Other Marriages:" : "Other Marriage:") : "";

                otherMarriageRow += `
                <tr data-person='${htmlEntities(fsPerson.Name)}' data-role='${role}' class='otherMarriageRow'>
                    <th class='otherMarriageHeading heading'>${oSpousesHeadingText}</th>
                    <td class='otherMarriageDate'>
                        <span class='otherSpouseName' data-name='${this.htmlEntities(Name)}'>${otherSpouseName.replace(
                    /(“.+”)/,
                    "<span class='nicknames'>$1</span>"
                )}</span>,
                        ${formattedMarriageDate}${formattedMarriageEndDate && " - " + formattedMarriageEndDate}
                    </td>
                    <td class='otherMarriagePlace'>${otherSpouseMarriageLocation}</td>
                </tr>`;
            });
        } else {
            otherMarriageRow = `
            <tr data-role='${role}' class='otherMarriageRow'>
                <th class='otherMarriageHeading heading'>Other Marriage:</th>
                <td class='otherMarriageDate date editable empty' data-date=""></td>
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
                this.researchNotes.push({
                    name: fsPerson.Name,
                    displayName: this.displayName(fsPerson)[0],
                    researchNotes: rNotesSplit[1],
                });
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
        } else {
            console.log(`No bio HTML found for: ${fsPerson.Name}`);
        }

        return bioRow;
    };

    storeVal(jq) {
        const id = jq.attr("id");
        const tagName = jq.prop("tagName").toLowerCase();

        // Retrieve the storage object if it exists
        const settings = this.getSettings();

        if (tagName === "input") {
            const type = jq.attr("type");

            // Handle checkboxes
            if (type === "checkbox") {
                settings[id] = jq.prop("checked");
            }
            // Handle radio buttons
            else if (type === "radio") {
                settings[id] = jq.val();
            }
        }
        // Handle select boxes
        else if (tagName === "select") {
            settings[id] = jq.val();
        }

        this.setSettings(settings);
    }

    setVals() {
        // Retrieve the storage object from localStorage and parse it
        const settings = this.getSettings();

        // Handle checkboxes
        $("#fgsOptions input[type='checkbox']").each((index, element) => {
            const checkbox = $(element);
            const id = checkbox.attr("id");
            const negativeOnes = ["showWTIDs"];
            checkbox.prop("checked", settings[id]);

            // Apply styles based on checkbox ID
            if (settings.hasOwnProperty(id)) {
                switch (id) {
                    case "showBaptism":
                        this.toggleStyle(id, this.showBaptismRules, settings[id], "#baptChrist");
                        break;
                    case "showBurial":
                        this.toggleStyle(
                            id,
                            "#view-container.familyGroupApp tr.burialRow{display:none;}",
                            settings[id]
                        );
                        break;
                    case "showNicknames":
                        this.toggleStyle(id, this.showNicknamesRules, settings[id]);
                        break;
                    case "showParentsSpousesDates":
                        this.toggleStyle(id, this.showParentsSpousesDatesRules, settings[id]);
                        break;
                    case "showOtherLastNames":
                        this.toggleStyle(id, this.showOtherLastNamesRules, settings[id]);
                        break;
                    case "useColour":
                        this.toggleStyle(id, this.colorRules, settings[id]);
                        break;
                    case "showWTIDs":
                        this.toggleStyle(id, this.showWTIDsRules, settings[id]);
                        break;
                    // Add additional cases for other checkboxes as needed
                }
            } else if (negativeOnes.includes(id)) {
                switch (id) {
                    case "showWTIDs":
                        this.toggleStyle(id, this.showWTIDsRules, false);
                        break;
                }
            } else {
                settings[id] = true;
            }

            this.setSettings(settings);
        });

        // Handle radio buttons
        $("#fgsOptions input[type='radio']").each(function () {
            const radio = $(this);
            const name = radio.attr("name");

            // Check if the storage object has a value for this radio group and update it
            if (settings.hasOwnProperty(name) && settings[name] === radio.val()) {
                radio.prop("checked", true).change();
            }
        });

        // Handle select boxes
        $("#fgsOptions select").each(function () {
            const select = $(this);
            const id = select.attr("id");

            // Check if the storage object has a value for this select box and update it
            if (settings.hasOwnProperty(id)) {
                select.val(settings[id]);
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

    async checkAndAppendChildren(oChildren) {
        if (oChildren.length > 0) {
            // Wait for the main family sheet table to be available
            await waitForElement("#familySheetFormTable");
            const mainTable = $("#familySheetFormTable");

            // Get column widths from the main table
            const colWidths = mainTable
                .find("thead tr th")
                .map(function () {
                    return $(this).width();
                })
                .get();

            this.people[0].Child.forEach((aChild, index) => {
                const childTable = $("<table class='childTable personTable'></table>");
                const childTbody = $("<tbody></tbody>").appendTo(childTable);

                this.people.forEach((cPerson) => {
                    // Initialize husband and wife if undefined
                    this.husband = this.husband || 0;
                    this.wife = this.wife || 0;

                    if (
                        cPerson.Name === aChild.Name &&
                        ((cPerson.Father === this.husband && cPerson.Mother === this.wife) ||
                            (!this.husband && cPerson.Mother === this.wife) ||
                            (this.husband === cPerson.Father && !this.wife))
                    ) {
                        if (!this.doneKids.includes(aChild.Name)) {
                            const theChildRow = this.familySheetPerson(cPerson, this.ordinal(index + 1) + " Child");
                            childTbody.append(theChildRow); // Append the row jQuery object directly
                            this.doneKids.push(cPerson.Name);
                        }
                    }
                });

                // Apply column widths to the child table
                childTable.find("tr").each(function () {
                    $(this)
                        .find("td, th")
                        .each(function (i) {
                            // Apply width, considering colspan
                            const colspan = $(this).attr("colspan") || 1;
                            let totalWidth = 0;
                            for (let j = 0; j < colspan; j++) {
                                totalWidth += colWidths[i + j] || 0;
                            }
                            $(this).css("width", totalWidth + "px");
                        });
                });

                // Append the child table to the DOM
                if (childTbody.children().length > 0) {
                    this.$container.append(childTable);
                }
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
        const clone = $("tr[data-name='" + this.htmlEntities(anID) + "'] .fsName")
            .eq(0)
            .clone(true);
        clone.find(".fsWTID").remove();
        clone.find(".fsGender").remove();
        return clone.text().trim();
        /*
        return $("tr[data-name='" + this.htmlEntities(anID) + "'] .fsName")
            .eq(0)
            .text()
            .replace(/(Female)|(Male)\b/, "")
            .replace(/([a-z])(\)\s)?[MF]\b/, "$1$2");
            */
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

    setSettings(settings) {
        localStorage.setItem("familyGroupAppSettings", JSON.stringify(settings));
    }
    getSettings() {
        return JSON.parse(localStorage.getItem("familyGroupAppSettings")) || {};
    }

    initializePage() {
        // Show or hide 'Tables' label based on the presence of citation tables
        console.log("checking for citation tables", $(".citationTable"));
        this.toggleDisplay("#showTablesLabel", !!$(".citationTable").length);

        console.log("checking for sources", $(".sourceUL"));
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
        if ($("#fgsPrintIcon").length === 0) {
            $("<img id='fgsPrintIcon' src='views/familyGroupApp/images/print50.png'>").appendTo("header");
            $("#fgsPrintIcon").click(() => window.print());
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
        console.log(this.people);
        this.researchNotes = [];
        const isHusbandFirst = $("#husbandFirst").prop("checked");

        // Create separate containers for husband and wife
        const husbandTable = $("<table class='personTable husband'><tbody></tbody></table>");
        const wifeTable = $("<table class='personTable wife'><tbody></tbody></table>");

        const fsTable = $(
            "<table id='familySheetFormTable'><thead><tr><th></th><th>Name and/or Date</th><th>Place</th></tr></thead><tbody></tbody></table>"
        );

        if (this.people[0].Name == undefined) {
            this.privateQ();
        } else {
            $(this.$container).append(fsTable);
        }

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

        // Determine if the main person is husband or wife and append the row to the respective container
        if (this.people[0].Gender === "Male") {
            husbandTable.find("> tbody").append($(mainRow));
        } else {
            wifeTable.find("> tbody").append($(mainRow));
        }

        if (theSpouse) {
            const spouseRow = this.familySheetPerson(theSpouse, spouseRole);
            //    fsTable.find("> tbody").append($(spouseRow));
            if (spouseRole === "Husband") {
                husbandTable.find("> tbody").append($(spouseRow));
            } else {
                wifeTable.find("> tbody").append($(spouseRow));
            }
        } else {
            console.log("The spouse could not be found: ", matchPerson);
            setTimeout(() => {
                $("th.role.heading a").text("Name");
                $("tr.otherMarriageRow").remove();
                $("tr.HusbandParentsRow th, tr.WifeParentsRow th").each(function () {
                    $(this).text($(this).text().replace("Husband's ", "").replace("Wife's ", ""));
                });
            }, 500);
        }

        if (mainRole === "Husband" || isHusbandFirst) {
            fsTable.after(husbandTable, wifeTable);
            $("tr.marriedRow").appendTo($("table.husband tbody"));
        } else {
            fsTable.after(wifeTable, husbandTable);
            $("tr.marriedRow").appendTo($("table.wife tbody"));
        }

        const oChildren = this.people[0].Child;
        if (oChildren.length > 0) {
            oChildren.sort((a, b) =>
                a.BirthDate + "-".replaceAll(/\-/g, "") > b.BirthDate + "-".replaceAll(/\-/g, "") ? 1 : -1
            );
        }

        this.checkAndAppendChildren(oChildren).then(() => {
            this.appendNotesAndSources();
            this.initializePage();
        });

        $("#tree").slideUp();

        if (this.people[0].Name == undefined) {
            this.privateQ();
        } else {
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
            if (!isHusbandFirst) {
                this.manageRoleOrder();
            }

            const titleText = $("caption").text().replace(/\s+/, " ").trim();
            $("title").text("Family Group: " + titleText);

            this.setBaptChrist();

            /**
             * Toggles the visibility of citation tables based on the state of the "#showTables" checkbox.
             * If the checkbox is checked, citation tables are hidden.
             * Otherwise, citation tables are shown.
             */

            /**
             * Updates the state of tables based on checkbox state and stores the state.
             */
            $("#showTables").change((e) => {
                const $this = $(e.target);
                this.toggleTables();
                this.storeVal($this);
            });

            /**
             * Updates the state of lists based on checkbox state and stores the state.
             */
            $("#showLists").change((e) => {
                this.toggleLists();
                this.storeVal($this);
            });

            /**
             * Allows editing of citation list items.
             * Creates a textarea for editing when a list item is clicked.
             */
            $("#citationList li li").click((e) => {
                const $this = $(e.target);
                this.closeInputs();
                if ($this.find("textarea").length === 0) {
                    const newTextarea = $("<textarea class='citationEdit'>" + $this.html() + "</textarea>");
                    $this.html(newTextarea);
                    newTextarea.focus();
                    newTextarea.on("blur", (ev) => {
                        if ($this.val() === "") {
                            $this.parent().remove();
                        } else {
                            $this.parent().html($this.val());
                            $this.remove();
                        }
                    });
                }
            });

            /**
             * Handles the visibility of bio instructions and styles for print media based on the existence of ".bioRow" elements.
             */
            if ($(".bioRow").length) {
                $("#toggleBios,#includeBiosWhenPrinting").css("display", "inline-block");
                $("#includeBios").change((e) => {
                    const $this = $(e.target);
                    this.storeVal($this);
                    if ($this.prop("checked") === true) {
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
            $("input[name='showGender']").change((e) => {
                const $this = $(e.target);
                this.storeVal($this);
                const showGenderVal = $("input[name='showGender']:checked").val();

                $(".fsGender").each(function () {
                    const genderBit = $(this);
                    const theGender = genderBit.closest("tr").data("gender");
                    genderBit.text("");

                    if (showGenderVal === "initial") {
                        genderBit.text(theGender.substring(0, 1) || "");
                    }

                    if (showGenderVal === "word") {
                        genderBit.text(theGender);
                    }
                });
            });

            /**
             * Updates the status choice and modifies the date strings accordingly.
             */
            $("input[name='statusChoice']").change((e) => {
                const $this = $(e.target);
                this.storeVal($this);

                // Check if abbreviations are selected
                const isAbbr = $("input[name='statusChoice'][value='abbreviations']").prop("checked");

                // Update each date text based on the selected status
                $(".date").each((e) => {
                    const $this = $(e.target);
                    const currentText = $this.text();
                    if (isAbbr) {
                        const replacedText = currentText
                            .replaceAll(/~/g, "abt. ")
                            .replaceAll(/</g, "bef. ")
                            .replaceAll(/>/g, "aft. ");
                        $this.text(replacedText);
                    } else {
                        const replacedText = currentText
                            .replaceAll(/abt\.\s/g, "~")
                            .replaceAll(/bef\.\s/g, "<")
                            .replaceAll(/aft\.\s/g, ">");
                        $this.text(replacedText);
                    }
                });
            });
        }
    }

    appendNotesAndSources() {
        let setWidth = 0;
        if ($("#familySheetFormTable").length) {
            setWidth = $("#familySheetFormTable")[0].scrollWidth;
        } else if ($("table.husband").length) {
            setWidth = $("table.husband")[0].scrollWidth;
        } else {
            setWidth = $("table.wife")[0].scrollWidth;
        }
        const notesAndSources = $("<section id='notesAndSources'></section>");
        $("<div id='notes'><h2>Research Notes:</h2><div id='notesNotes'></div></div>").appendTo(notesAndSources);

        if (this.researchNotes.length > 0) {
            this.researchNotes.forEach((rNote) => {
                //	console.log(rNote);
                if (rNote.researchNotes.replace(/[\n\W\s]/, "") != "") {
                    notesAndSources
                        .find("#notesNotes")
                        .append(
                            $(
                                `<a class='sourcesName' href='https://www.wikitree.com/wiki/${rNote.name}'>${rNote.displayName} <span class='fsWTID'>(${rNote.name})</span></a>`
                            )
                        );
                    notesAndSources
                        .find("#notesNotes")
                        .append($(rNote.researchNotes.replaceAll(/<sup.*?<\/sup>/g, "")));
                }
            });
        }
        $("<div id='sources'><h2>Sources:</h2></div>").appendTo(notesAndSources);
        notesAndSources.appendTo($(this.$container));
        notesAndSources.css({ "max-width": setWidth, "width": setWidth });
        $("#familySheetFormTable").css({ "max-width": setWidth, "width": setWidth });
        const mList = $("<ul id='citationList'></ul>");

        this.citationTables = [];
        this.appendReferences(mList);

        $("#sources").append(mList);
        $("#sources li[data-wtid='" + this.husbandWTID + "']").prependTo($("#sources ul").eq(0));
    }

    closeInputs() {
        console.log("closeInputs called");

        // Set theClass = this to capture the class instance context
        const theClass = this;

        $(".edit").each(function () {
            const $this = $(this);
            const isTextarea = $this.prop("tagName") === "TEXTAREA";
            const isCaption = $this.parent().prop("tagName") === "CAPTION";

            console.log("Processing element:", $this, "Is Textarea:", isTextarea, "Is Caption:", isCaption);

            let newValue = $this.val();
            console.log("New value:", newValue);

            // Check for unsafe "script" tags
            if (!/script/i.test(newValue)) {
                console.log("Value is safe. Updating content.");
                if (isTextarea || isCaption) {
                    $this.parent().html(theClass.nl2br(newValue));
                } else {
                    $this.parent().text(newValue);
                }
            } else {
                console.log("Unsafe content detected. Not updating.");
            }

            $this.remove();
            console.log("Element removed.");
        });

        console.log("closeInputs completed");
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
                $("tr.baptismRow td.baptism").text(`${selectedValue}:`);
                $("#showBaptisedText").text(`${selectedValue}`);
            }
        });
    }

    // Function to toggle bios and update localStorage
    toggleBios() {
        const self = this; // Capture the class instance context
        return function () {
            if ($(this).prop("checked") === true) {
                $(".theBio").slideDown();
                setTimeout(() => {
                    $(`<style id='showBiosStyle'>.familySheetForm .bioRow div.theBio{display:block;}</style>`).appendTo(
                        self.$container // Use 'self' to refer to the class instance
                    );
                }, 1000);
            } else {
                $(".theBio").slideUp();
                setTimeout(() => {
                    $("#showBiosStyle").remove();
                }, 1000);
            }
            self.storeVal($(this)); // Use 'self' to call 'storeVal'
        };
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
                    bioFormat: "html",
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

// This function returns a promise that resolves when the specified element is added to the DOM
function waitForElement(selector) {
    return new Promise((resolve, reject) => {
        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                obs.disconnect();
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
}

function spell(text) {
    const americanToBritishSpelling = {
        // A
        acknowledgment: "acknowledgement",
        acknowledgments: "acknowledgements",
        aging: "ageing",
        analog: "analogue",
        analyze: "analyse",
        analyzed: "analysed",
        analyzes: "analyses",
        analyzing: "analysing",
        anglicize: "anglicise",
        anglicized: "anglicised",
        anglicizes: "anglicises",
        anglicizing: "anglicising",
        anonymize: "anonymise",
        anonymized: "anonymised",
        anonymizes: "anonymises",
        anonymizing: "anonymising",
        apologize: "apologise",
        apologized: "apologised",
        apologizes: "apologises",
        apologizing: "apologising",
        arbor: "arbour",
        arbors: "arbours",
        ax: "axe",

        // B
        baptize: "baptise",
        baptized: "baptised",
        baptizes: "baptises",
        baptizing: "baptising",
        behavior: "behaviour",
        behaviors: "behaviours",

        // C
        catalog: "catalogue",
        catalogs: "catalogues",
        center: "centre",
        centers: "centres",
        color: "colour",
        colored: "coloured",
        colorful: "colourful",
        colorfully: "colourfully",
        coloring: "colouring",
        colors: "colours",

        // D
        dialog: "dialogue",
        dialogs: "dialogues",
        draft: "draught",
        drafts: "draughts",
        defense: "defence",
        defenses: "defences",

        // E
        enroll: "enrol",
        enrolled: "enrolled",
        enrolling: "enrolling",
        enrollment: "enrolment",
        enrollments: "enrolments",
        encyclopedia: "encyclopaedia",
        encyclopedias: "encyclopaedias",
        esophagus: "oesophagus",
        esthetic: "aesthetic",

        // F
        favor: "favour",
        favored: "favoured",
        favoring: "favouring",
        favors: "favours",
        fiber: "fibre",
        fibers: "fibres",
        fulfill: "fulfil",
        fulfilled: "fulfilled",
        fulfilling: "fulfilling",
        fulfillment: "fulfilment",
        fulfillments: "fulfilments",

        // G
        gray: "grey",
        grays: "greys",

        // H
        honor: "honour",
        honored: "honoured",
        honoring: "honouring",
        honors: "honours",
        humor: "humour",
        humored: "humoured",
        humoring: "humouring",
        humors: "humours",

        // I-J
        inquiry: "enquiry",
        inquiries: "enquiries",
        jewelry: "jewellery",
        judgment: "judgement",
        judgments: "judgements",

        // L
        labor: "labour",
        labors: "labours",
        license: "licence",
        licenses: "licences",
        liter: "litre",
        liters: "litres",
        luster: "lustre",

        // M
        marveled: "marvelled",
        marveling: "marvelling",
        meager: "meagre",
        modeled: "modelled",
        modeling: "modelling",
        models: "models",
        mold: "mould",
        molds: "moulds",
        mom: "mum",
        moms: "mums",

        // N
        neighbor: "neighbour",
        neighboring: "neighbouring",
        neighbors: "neighbours",

        // O
        organization: "organisation",
        organizations: "organisations",
        organize: "organise",
        organized: "organised",
        organizes: "organises",
        organizing: "organising",

        // P
        personalize: "personalise",
        personalized: "personalised",
        personalizes: "personalises",
        personalizing: "personalising",
        plow: "plough",
        plows: "ploughs",
        practicing: "practising",
        privatize: "privatise",
        privatized: "privatised",
        privatizes: "privatises",
        privatizing: "privatising",

        // R
        realization: "realisation",
        realizations: "realisations",
        realize: "realise",
        realized: "realised",
        realizes: "realises",
        realizing: "realising",
        recognize: "recognise",
        recognized: "recognised",
        recognizes: "recognises",
        recognizing: "recognising",
        rumor: "rumour",
        rumors: "rumours",

        // S
        saber: "sabre",
        sabers: "sabres",
        skillful: "skilful",
        skillfully: "skilfully",
        somber: "sombre",
        sulfur: "sulphur",

        // T
        theater: "theatre",
        theaters: "theatres",

        // Traveling
        traveled: "travelled",
        traveler: "traveller",
        travelers: "travellers",
        traveling: "travelling",

        // V
        valor: "valour",
        vapor: "vapour",
        vapors: "vapours",

        // W
        willful: "wilful",
        willfully: "wilfully",

        // Add more as needed
    };

    const userLanguage = navigator.language || navigator.userLanguage;
    const useBritishEnglish = ["en-GB", "en-AU", "en-NZ", "en-ZA", "en-IE", "en-IN", "en-SG", "en-MT"].includes(
        userLanguage
    );

    function matchCase(original, transformed) {
        if (original === original.toUpperCase()) {
            return transformed.toUpperCase();
        }
        if (original[0] === original[0].toUpperCase()) {
            return transformed[0].toUpperCase() + transformed.slice(1);
        }
        return transformed;
    }

    return text
        .split(/\b/)
        .map((word) => {
            const lowerCaseWord = word.toLowerCase();

            if (americanToBritishSpelling.hasOwnProperty(lowerCaseWord)) {
                const converted = americanToBritishSpelling[lowerCaseWord];
                return useBritishEnglish ? matchCase(word, converted) : word;
            }

            return word;
        })
        .join("");
}

function convertDate(dateString, outputFormat, status = "") {
    console.log("convertDate called with:", dateString, outputFormat, status);

    dateString = dateString.replaceAll(/-00/g, "");
    // Split the input date string into components
    if (!dateString) {
        return "";
    }
    let components = dateString.split(/[\s,-]+/);

    // Determine the format of the input date string
    let inputFormat;
    if (components.length == 1 && /^\d{4}$/.test(components[0])) {
        // Year-only format (e.g. "2023")
        inputFormat = "Y";
    } else if (components.length == 2 && /^[A-Za-z]{3}$/.test(components[0]) && !/^[A-Za-z]{4,}$/.test(components[0])) {
        // Short month and year format (e.g. "Jul 2023")
        inputFormat = "MY";
    } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
        // Long month and year format (e.g. "July 2023")
        inputFormat = "MDY";
    } else if (components.length == 3 && /^[A-Za-z]+/.test(components[0])) {
        // Long month, day, and year format (e.g. "July 23, 2023")
        inputFormat = "MDY";
    } else if (components.length == 3 && /^[A-Za-z]{3}$/.test(components[1]) && !/^[A-Za-z]{4,}$/.test(components[1])) {
        // Short month, day, and year format (e.g. "23 Jul 2023")
        inputFormat = "DMY";
    } else if (components.length == 3 && /^[A-Za-z]+/.test(components[1])) {
        // Day, long month, and year format (e.g. "10 July 1936")
        inputFormat = "DMY";
    } else if (components.length == 3 && /^\d{2}$/.test(components[1]) && /^\d{2}$/.test(components[2])) {
        // ISO format with no day (e.g. "2023-07-23")
        inputFormat = "ISO";
    } else if (components.length == 2 && /^\d{4}$/.test(components[0]) && /^\d{2}$/.test(components[1])) {
        // NEW: Year and month format with no day (e.g. "1910-10")
        inputFormat = "ISO";
        components.push("00");
    } else {
        // Invalid input format
        return null;
    }

    // Convert the input date components to a standard format (YYYY-MM-DD)
    let year,
        month = 0,
        day = 0;
    try {
        if (inputFormat == "Y") {
            year = parseInt(components[0]);
            outputFormat = "Y";
        } else if (inputFormat == "MY") {
            year = parseInt(components[1]);
            month = convertMonth(components[0]);
            if (!outputFormat) {
                outputFormat = "MY";
            }
        } else if (inputFormat == "MDY") {
            year = parseInt(components[components.length - 1]);
            month = convertMonth(components[0]);
            day = parseInt(components[1]);
        } else if (inputFormat == "DMY") {
            year = parseInt(components[2]);
            month = convertMonth(components[1]);
            day = parseInt(components[0]);
        } else if (inputFormat == "ISO") {
            year = parseInt(components[0]);
            month = parseInt(components[1]);
            day = parseInt(components[2]);
        }
    } catch (err) {
        console.error("Error during conversion:", err);
        return null;
    }

    // Convert the date components to the output format
    let outputDate;

    const ISOdate = year.toString() + "-" + padNumberStart(month || 0) + "-" + padNumberStart(day || 0);

    if (outputFormat == "Y") {
        outputDate = year.toString();
    } else if (outputFormat == "MY") {
        outputDate = convertMonth(month) + " " + year.toString();
    } else if (outputFormat == "MDY") {
        outputDate = convertMonth(month, "long") + " " + day + ", " + year.toString();
    } else if (outputFormat == "DMY") {
        outputDate = day + " " + convertMonth(month, "long") + " " + year.toString();
    } else if (outputFormat == "sMDY") {
        outputDate = convertMonth(month, "short");
        if (day !== 0) {
            outputDate += " " + day + ",";
        }
        outputDate += " " + year.toString();
    } else if (outputFormat == "DsMY") {
        outputDate = "";
        if (day !== 0) {
            outputDate += day + " ";
        }
        outputDate += convertMonth(month).slice(0, 3) + " " + year.toString();
    } else if (outputFormat == "YMD" || outputFormat == "ISO") {
        outputDate = ISOdate;
    } else {
        // Invalid output format
        return null;
    }

    if (status) {
        let onlyYears = false;
        if (outputFormat == "Y") {
            onlyYears = true;
        }
        let statusOut = "";
        try {
            statusOut = dataStatusWord(status, ISOdate, { needInOn: true, onlyYears: onlyYears });
            // Check if the statusOut is a symbol, and if so, don't add space
        } catch (error) {
            console.log("dataStatusWord error:", error);
        }
        if (["<", ">", "~"].includes(statusOut.trim())) {
            outputDate = statusOut + outputDate.trim();
        } else {
            outputDate = statusOut + " " + outputDate;
        }
    }

    outputDate = outputDate.replace(/\s?\b00/, ""); // Remove 00 as a day or month
    outputDate = outputDate.replace(/(\w+),/, "$1"); // Remove comma if there's a month but no day
    //outputDate = outputDate.replace(/^,/, ""); // Remove random comma at the beginning

    return outputDate;
}

function convertMonth(monthString, outputFormat = "short") {
    // Convert a month string to a numeric month value
    var shortNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    var longNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
    ];
    let index;
    if (!isNaN(monthString)) {
        index = monthString - 1;
        let month = shortNames[index];
        if (outputFormat == "long") {
            month = longNames[index];
        }
        return capitalizeFirstLetter(month);
    } else {
        index = shortNames.indexOf(monthString?.toLowerCase());
        if (index == -1) {
            index = longNames.indexOf(monthString?.toLowerCase());
        }
        return index + 1;
    }
}

function padNumberStart(number) {
    // Add leading zeros to a single-digit number
    return (number < 10 ? "0" : "") + number.toString();
}

function capitalizeFirstLetter(string) {
    return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

function dataStatusWord(status, ISOdate, options = { needOnIn: false, onlyYears: false }) {
    const needOnIn = options.needOnIn;
    const onlyYears = options.onlyYears;
    let day = ISOdate.slice(8, 10);
    if (day == "00") {
        day = "";
    }
    let statusOut =
        status == "before"
            ? "before"
            : status == "after"
            ? "after"
            : status == "guess"
            ? "about"
            : status == "certain" || status == "on" || status == undefined || status == ""
            ? day
                ? "on"
                : "in"
            : "";

    const thisStatusFormat = onlyYears
        ? window.autoBioOptions?.yearsDateStatusFormat
        : window.autoBioOptions?.dateStatusFormat || "abbreviations";

    if (thisStatusFormat == "abbreviations") {
        statusOut = statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.");
    } else if (thisStatusFormat == "symbols") {
        statusOut = statusOut.replace("before", "<").replace("after", ">").replace("about", "~");
    }
    if (needOnIn == false && ["on", "in"].includes(statusOut)) {
        return "";
    } else {
        return statusOut;
    }
}
