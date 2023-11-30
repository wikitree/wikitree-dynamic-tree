import { spell, waitForElement } from "../../lib/utilities.js";
import { PersonDataCache } from "./js/personDataCache.js";
import { Collapse } from "./js/collapse.js";
import { HandleLinks } from "./js/handleLinks.js";

const personDataCache = new PersonDataCache();
const collapse = new Collapse();
const handleLinks = new HandleLinks();

window.FamilyGroupAppView = class FamilyGroupAppView extends View {
    static APP_ID = "familyGroupApp";
    constructor(container_selector, person_id) {
        super(); // If there is a constructor in the parent class, make sure to call it.
        this.container_selector = container_selector;
        this.person_id = person_id;
        this.initializeLocalStates(); // Call this method to set initial state
        this.$header = $("header");
        this.$body = $("body");
        this.colorRules = `
        #view-container.familyGroupApp table.personTable tr,
        #view-container.familyGroupApp #familySheetFormTable caption,
        .roleRow[data-gender],
        .roleRow[data-gender] th,
        #view-container.familyGroupApp tr.marriedRow  {
            background-color: #fff !important;
        } 
        `;
        this.showBaptismRules = `
        #view-container.familyGroupApp tr.baptismRow,
        #view-container.familyGroupApp #baptChrist {
            display: none;
        }
        `;
        this.showWTIDsRules = `
        #view-container.familyGroupApp .fsWTID{
            display: none;
        }
        `;
        this.showOtherLastNamesRules = `
        #view-container.familyGroupApp table.personTable caption span.otherLastNames,
        #view-container.familyGroupApp span.otherLastNames {
            display: none;
        }
        `;
        this.showParentsSpousesDatesRules = `
        #view-container.familyGroupApp table.personTable span.parentDates,
        #view-container.familyGroupApp table.personTable span.spouseDates {
            display: none;
        }
        `;
        this.showNicknamesRules = `
        #view-container.familyGroupApp table.personTable caption span.nicknames,
        #view-container.familyGroupApp span.nicknames {
            display: none;
        }
        `;
        this.showBiosRules = `
        #view-container.familyGroupApp .bioRow div.theBio {
            display:block;
        }`;
        this.showResearchNotesRules = `
        #view-container.familyGroupApp #notes {
            display:none;
        }`;
        this.showListsRules = `
        #view-container.familyGroupApp .citationList dl {
            display:none;
        }`;
        this.showTablesRules = `
        #view-container.familyGroupApp .citationList table {
            display:none;
        }`;
    }

    meta() {
        return {
            title: "Family Group App",
            description: `Produce a printer-friendly Family Group Sheet with the Family Group App.`,
            docs: "",
        };
    }

    close() {
        $("#view-container").removeClass("familyGroupApp");
    }

    initializeLocalStates() {
        this.keepSpouse = "";
        this.people = [];
        this.husband = 0;
        this.husbandWTID = "";
        this.wife = 0;
        this.single = 0;
        this.wifeWTID = "";
        this.calledPeople = [this.person_id];
        this.calls = 1;
        this.privates = 0;
        this.references = [];
        this.htmlReferences = [];
        this.htmlResearchNotes = [];
        this.doneKids = [];
        this.researchNotes = [];
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

    stripScripts(html) {
        const div = document.createElement("div");
        div.innerHTML = html;
        const scripts = div.getElementsByTagName("script");
        let i = scripts.length;
        while (i--) {
            scripts[i].parentNode.removeChild(scripts[i]);
        }
        return div.innerHTML;
    }

    getFamily(WTID) {
        const data = personDataCache.getPersonData(this.person_id);
        //let data = null;
        if (!data) {
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

                                // Strip javascript from biography
                                mPerson.bioHTML = this.stripScripts(mPerson.bioHTML);

                                this.people.push(mPerson);
                            }

                            console.log("this.people", this.people);

                            // Recursive call and makeFamilySheet() as in your original code
                            if (this.people[0].Spouse) {
                                this.people[0].Spouse.forEach((aSpouse) => {
                                    if (aSpouse?.do_not_display != "1") {
                                        if (!this.calledPeople.includes(aSpouse.Name)) {
                                            this.calledPeople.push(aSpouse.Name);
                                            this.getFamily(aSpouse.Name);
                                        }
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
                                personDataCache.setPersonData(this.person_id, this.people);
                            }
                        });
                    } else {
                        this.privateQ();
                        $("#tree").slideUp();
                    }
                },
            });
        } else {
            this.people = data;
            personDataCache.logCacheState();

            this.makeFamilySheet();
        }
    }

    init(container_selector, person_id) {
        if (!localStorage.getItem("familyGroupAppSettings")) {
            this.setDefaults();
        }
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
        $(".collapseButton,.sectionCollapseButton,.globalCollapseButton").off().remove();
        $("#familySheetFormTable,#tree,#notesAndSources,#privateQ").remove();
        $("<img id='tree' src='views/familyGroupApp/images/tree.gif'>").appendTo($(this.$container));
        this.getFamily(this.person_id);
    }

    setupEventListeners() {
        this.$container.off("click.fga change.fga");
        this.$body.off("click.fga change.fga");

        // Delegated event listeners for checkbox changes

        this.$container.on("click.fga", "a[href^='#_ref']", (e) => {
            e.preventDefault();
            const $this = $(e.currentTarget);
            const targetId = $this.attr("href").replace("#", "");
            const target = $(`#${targetId}`);
            // If target is hidden in a hidden biography and/or collapsed section
            // show the biography and expand the section
            if (target.closest(".theBio").css("display") == "none") {
                target.closest(".theBio").slideDown();
            }
            if (target.closest(".personTable").find("tr.birthRow").css("display") == "none") {
                target.closest(".personTable").prev().trigger("click");
            }
            // Scroll to the target
            $("html, body").animate(
                {
                    scrollTop: target.offset().top - 100,
                },
                500
            );
        });

        this.$container.on("click.fga", "a[href^='#_note']", (e) => {
            e.preventDefault();
            const $this = $(e.currentTarget);
            const targetId = $this.attr("href").replace("#", "");
            const target = $(`#${targetId}`);
            // If target is hidden in a collapsed section expand the section
            if (target.closest(".citationListContent").css("display") == "none") {
                target.closest(".citationList").prev().trigger("click");
            }
            // Scroll to the target
            $("html, body").animate(
                {
                    scrollTop: target.offset().top - 100,
                },
                500
            );
        });

        this.$container.on("change.fga", "#dateFormatSelect", (e) => {
            const $this = $(e.currentTarget);
            const theClass = this;
            $("[data-date]").each(function () {
                const $thisThing = $(this);
                const theDate = $thisThing.attr("data-date");
                const dateStatus = $thisThing.attr("data-date-status");
                const newDate = theClass.convertDate(theDate, $this.val(), dateStatus);
                $thisThing.text(newDate);
            });
            this.storeVal($this);
        });

        this.$container.on("change.fga", "#showNotes", (event) => {
            const $this = $(event.currentTarget);
            const isChecked = $this.prop("checked");
            this.toggleStyle("showNotes", this.showResearchNotesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showTables", (event) => {
            const $this = $(event.currentTarget);
            const isChecked = $this.prop("checked");
            this.toggleStyle("showTables", this.showTablesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showLists", (event) => {
            const $this = $(event.currentTarget);
            const isChecked = $this.prop("checked");
            this.toggleStyle("showLists", this.showListsRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showBaptism", (e) => {
            const isChecked = $(e.target).prop("checked");
            this.toggleStyle("showBaptism", this.showBaptismRules, isChecked, "#baptChrist");
        });
        this.$container.on("change.fga", "#showBurial", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showBurial", "#view-container.familyGroupApp tr.burialRow{display:none;}", isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showNicknames", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showNicknames", this.showNicknamesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showParentsSpousesDates", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showParentsSpousesDates", this.showParentsSpousesDatesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showOtherLastNames", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showOtherLastNames", this.showOtherLastNamesRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#useColour", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("useColour", this.colorRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showWTIDs", (event) => {
            const isChecked = $(event.target).prop("checked");
            this.toggleStyle("showWTIDs", this.showWTIDsRules, isChecked);
            this.storeVal($(event.target));
        });

        this.$container.on("change.fga", "#showBios", (event) => {
            this.toggleStyle("showBios", this.showBiosRules, !$(event.target).prop("checked"));
            this.storeVal($(event.target));
        });

        // Delegated event listeners for radio button changes
        this.$container.on("change.fga", "input[type=radio][name=baptismChristening]", () => this.setBaptChrist());
        this.$container.on("change.fga", "input[type=radio][name=statusChoice]", (e) => this.setStatusChoice(e));
        this.$container.on("change.fga", "input[type=radio][name=showGender]", () => this.setShowGender());

        // Delegated click.fga event listeners for options and information panels
        this.$body.on("click.fga", "#fgaNotesButton", function () {
            $("#fgaInfo").toggle();
            $("#fgaNotesButton").toggleClass("active");
        });
        this.$body.on("click.fga", "#fgaInfo", function () {
            $("#fgaInfo").slideUp();
            $("#fgaNotesButton").toggleClass("active");
        });
        this.$body.on("click.fga", "#fgaOptionsButton", function () {
            $("#fgaOptions").toggle();
            $("#fgaOptionsButton").toggleClass("active");
        });
        this.$body.on("click.fga", "#fgaOptions x", function () {
            $("#fgaOptions").slideUp();
            $("#fgaOptionsButton").toggleClass("active");
        });

        this.$container.on("click.fga", ".fsName a, caption a", function (e) {
            e.preventDefault();
        });

        this.$container.on("click.fga", "td[data-name],span[data-name]", (e) => {
            const $this = $(e.currentTarget);
            const dTR = $this.closest("tr");
            this.keepSpouse = dTR.attr("data-name") || "";
            if (dTR.hasClass("roleRow")) {
                if (dTR.attr("data-role") == "Husband" && $("tr.roleRow[data-role='Wife']").length > 0) {
                    this.keepSpouse = $("tr.roleRow[data-role='Wife']").attr("data-name");
                } else if (dTR.attr("data-role") == "Wife") {
                    this.keepSpouse = $("tr.roleRow[data-role='Husband']").attr("data-name");
                } else {
                    this.keepSpouse = "";
                }
            }
            localStorage.setItem("familyGroupApp_keepSpouse", this.keepSpouse);
            $("#wt-id-text").val($this.attr("data-name"));

            // Initialize local variables and states
            this.initializeLocalStates();
            this.person_id = parseInt($this.attr("data-id"));
            $("table").remove();
            this.startIt();
            // Initialize values
            this.setVals();
        });

        this.$container.on("change.fga", "#husbandFirst", (e) => {
            const $this = $(e.currentTarget);

            this.manageRoleOrder();

            this.storeVal($this);

            $(".theBio").find("tr.marriedRow").remove();
        });

        if ($(".nicknames").length == 0) {
            $(".showNicknamesSpan").hide();
        }

        this.$container.on("change.fga", "#showOtherLastNames", (e) => {
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

        this.$container.on("change.fga", "input[type=radio][name=baptismChristening]", (e) => {
            const $this = $(e.currentTarget);
            this.setBaptChrist();
            this.storeVal($this);
        });

        this.$container.on(
            "click.fga",
            ".baptismRow td, .burialRow td, caption, h1, .birthRow td, .deathRow td, .otherMarriagePlace, span.marriageDate, .marriedPlace, .editable, .marriedRow td",
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
        this.$container.on("click.fga", ".researchNotesContent", (e) => {
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
        this.$container.on("click.fga", "#notesNotes", (e) => {
            const $this = $(e.currentTarget);
            if ($this.find(".researchNotesContent").length) {
                return;
            }
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
        this.$container.on("click.fga", ".bioHeading", (e) => {
            const $this = $(e.currentTarget);
            const theTH = $this.closest("th");
            const theBio = theTH.find(".theBio");
            const bioRow = theTH.closest("tr");
            theBio.toggle();
            if (theBio.css("display") == "block") {
                theTH.addClass("active");
                bioRow.addClass("active");
                $this.css("font-size", "1.7143em");
            } else {
                $this.css("font-size", "16px");
                bioRow.removeClass("active");
                theTH.removeClass("active");
            }
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
            $(".marriedRow").eq(0).appendTo($("table.husband > tbody"));

            husbandCitations.prependTo($("#citationList"));
            husbandNameCaption.prependTo($("caption"));

            if (this.people[0].Name != husbandID) {
                wifeNameCaption.appendTo($("caption"));
            }
        } else if (this.people[0].Gender == "Female") {
            $("table.husband").insertAfter($("table.wife"));
            $(".marriedRow").eq(0).appendTo($("table.wife > tbody"));
            $("#citationList li[data-wtid='" + this.htmlEntities(this.people[0].Name) + "']").prependTo(
                $("#citationList")
            );

            husbandNameCaption.appendTo($("caption"));

            if (this.people[0].Name != husbandID) {
                wifeNameCaption.prependTo($("caption"));
            }
        }
        if ($("tr.roleRow[data-role='Husband'],tr.roleRow[data-role='Wife']").length == 0) {
            const nameID = $("tr.roleRow[data-role='Name']").attr("data-name");
            const nameNameCaption = $("caption span.fsWTID:contains('" + this.htmlEntities(nameID) + "')").parent();
            $("#citationList li[data-wtid='" + this.htmlEntities(nameID) + "']").prependTo($("#citationList"));
            nameNameCaption.appendTo($("caption"));
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

    handleWTIDKeydown(event) {
        if (event.keyCode === 13) {
            this.handleFamilySheetGoClick();
        }
    }

    loadFamilyGroupSheetHTML() {
        const familyGroupSheetHTML = `
        <div id='fgaOptions'>
        <x>&#10005;</x>
        <h2>Show:</h2> 
        <label id='showNicknamesLabel'><input type='checkbox' id='showNicknames'  checked value='1'>
        <span id='showNicknamesSpan'>nicknames</span></label>
        <label id='husbandFirstLabel'><input type='checkbox' id='husbandFirst'  checked value='1'>
        <span id='husbandFirstSpan'>husband first</span></label>
        <label id='showOtherLastNamesLabel'><input type='checkbox' id='showOtherLastNames' checked value='1'>
        <span id='showOtherLastNamesSpan'>other last names</span></label>
 
        <label><input type='checkbox' id='showBaptism'  checked value='1'><span id='showBaptisedText'>${spell(
            "baptized"
        )}</span></label>
        <div id='baptChrist' class='radios'>
        <label><input type='radio' name='baptismChristening' checked value='${spell("Baptized")}'>'${spell(
            "Baptized"
        )}'</label>
        <label><input type='radio' name='baptismChristening' value='Christened'>'Christened'</label></div>
        <label><input type='checkbox' id='showBurial'  checked value='1'>Buried</label>
        <label id='showWTIDsLabel'><input type='checkbox' id='showWTIDs'><span>WikiTree IDs</span></label>
        <label id='showParentsSpousesDatesLabel'><input type='checkbox' checked id='showParentsSpousesDates'>
        <span>parents' and spouses' dates</span></label>
        <label id='showTablesLabel'><input type='checkbox' id='showTables' checked>tables in 'Sources'</label>
        <label id='showListsLabel'><input type='checkbox' id='showLists' checked>lists in 'Sources'</label>
        <label><input type='checkbox' id='useColour' checked value='1'>${spell("color")}</label>
        <label><input type='checkbox' id='showNotes' value='1'>Research Notes</label>
        <label id='toggleBios'><input type='checkbox' id='showBios'><span>all biographies</span></label>
        <!--<label id='includeBiosWhenPrintingLabel'><input type='checkbox' id='includeBiosWhenPrinting'>
        <span>biographies when printing</span></label>-->
        <select id="dateFormatSelect">
            <option value="sMDY">MMM DD, YYYY (e.g., Nov 24, 1859)</option>
            <option value="DsMY">DD MMM YYYY (e.g., 24 Nov 1859)</option>
            <option value="MDY">Month DD, YYYY (e.g., November 24, 1859)</option>
            <option value="DMY">DD Month YYYY (e.g., 24 November 1859)</option>
            <option value="YMD">YYYY-MM-DD (e.g., 1859-11-24)</option>
        </select>   
        <div id='statusChoice' class='radios'><span class='label'>Date status</span>:
        <label><input type='radio' name='statusChoice' checked value='symbols'>~, &lt;, &gt;</label><label>
        <input type='radio' name='statusChoice' value='abbreviations'>abt., bef., aft.</label>
        </div>
        <div id='showGenderDiv' class='radios'><span>children's genders:</span> 
        <label><input type='radio' name='showGender' checked value='initial'>initial</label>
        <label><input type='radio' name='showGender' value='word'>word</label>
        <label><input type='radio' name='showGender' value='none'>none</label>
        </div>

        </div>
        
        <div id='fgaInfo'>
        <x>&#10005;</x>
        <span class='notesHeading'>Notes</span>
        <ul>
        <li id='bioInstructions'>Click 'Biography' (bottom left) to see each biography.</li>
        <li>The roles ('Husband', 'Wife', etc.) link to WikiTree profiles.</li>
        <li>Click a name to see that person's family group.</li>
        <li>Most of the page is editable for printing. 
        If you see some HTML (e.g. &lt;span&gt;John Brown&lt;/span&gt;), 
        just edit the text inside the tags.
            <br>Note: Any edits here are only for tweaking the page for printing. 
            This will not change any actual profiles.</li>
        </ul>
        </div>
        `;
        this.$container.html(familyGroupSheetHTML);
        const fgaButtons = `<div id="fgaButtons"><button class="small" id="fgaOptionsButton">Options</button>
        <button class="small" id="fgaNotesButton">Notes</button></div>`;
        if ($("#fgaButtons").length === 0) {
            $("header").append(fgaButtons);
        }
        if ($("#fgaOptionsButton").hasClass("active")) {
            $("#fgaOptions").show();
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
                  .map((nick) => `<span class="nicknames">“${nick}”</span>`)
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

    parseWikiText(text) {
        const sectionRegex = /(={2,})\s*(.*?)\s*\1([\s\S]*?)(?=\n={2,}|$)/g;
        const sections = [];
        let match;

        while ((match = sectionRegex.exec(text)) !== null) {
            const [fullMatch, equalSigns, title, content] = match;
            const level = equalSigns.length - 1; // Level is based on the number of '=' signs
            const section = { level, title, content: content.trim() };

            // Organize sections and subsections
            if (level === 2) {
                sections.push(section);
            } else if (sections.length > 0 && level > 2) {
                const parentSection = sections[sections.length - 1];
                parentSection.subsections = parentSection.subsections || [];
                parentSection.subsections.push(section);
            }
        }

        return sections;
    }

    extractBaptismDetails(baptismSection) {
        const dateRegex = /^:Date: (.+?)<ref/m;
        const placeRegex = /^:Place: (.+?)<ref/m;

        let dateMatch = baptismSection.match(dateRegex);
        let placeMatch = baptismSection.match(placeRegex);

        let date = dateMatch ? dateMatch[1].trim() : "Unknown";
        let place = placeMatch ? placeMatch[1].trim() : "Unknown";

        return { date, place };
    }

    processSubSections(section) {
        const dummyDiv = $("<div></div>").html(section);

        // Function to create a div and return it
        function createDivWithClass(level) {
            return $("<div></div>").addClass(`level${level}_subsection`);
        }

        // Initialize an array to keep track of the current open divs for each level
        let openDivs = [];

        dummyDiv.contents().each(function () {
            const element = $(this);

            // Check if the element is a header
            if (element.is("h2, h3, h4, h5, h6")) {
                const level = parseInt(element.prop("tagName").substring(1));

                // Close any open divs at this level or higher
                while (openDivs.length && openDivs[openDivs.length - 1].level >= level) {
                    openDivs.pop(); // Remove the last div from the array
                }

                // Create a new div for this level
                const newDiv = createDivWithClass(level);

                // Append the new div to the appropriate parent
                if (level > 2 && openDivs.length) {
                    // Append the new div to the last open div of the previous level
                    openDivs[openDivs.length - 1].div.append(newDiv);
                } else {
                    // If this is a top-level section or no divs are open, append to dummyDiv
                    dummyDiv.append(newDiv);
                }

                // Add the new div to the open divs array with its level
                openDivs.push({ div: newDiv, level: level });
                newDiv.append(element);
            } else {
                // Append non-header elements to the last open div, if any
                if (openDivs.length) {
                    openDivs[openDivs.length - 1].div.append(element);
                }
            }
        });

        section = dummyDiv.html();
        return section;
    }

    splitBioSections(fsPerson) {
        const htmlContent = fsPerson.bioHTML;

        const sections = {
            Biography: "",
            ResearchNotes: "",
            Sources: "",
            Acknowledgements: "",
        };

        // Create a dummy div element and set its HTML content
        const dummyDiv = $("<div></div>").html(htmlContent);
        handleLinks.addIdToReferences(dummyDiv, fsPerson.Id);

        // Function to determine if the current h2 is the expected next section
        function isNextSection(headerText, currentSection) {
            const expectedNextSections = {
                Biography: ["Research Notes", "Sources"],
                ResearchNotes: ["Sources"],
                Sources: ["Acknowledgements"],
            };

            return expectedNextSections[currentSection].some((section) => headerText.includes(section));
        }

        let currentSection = "Biography"; // Start with Biography

        dummyDiv.find("h2").each(function () {
            const headerText = $(this).text().trim();

            // Remove preceding anchor tag
            $(this).prev("a").remove();

            if (isNextSection(headerText, currentSection)) {
                currentSection = headerText.replace(/ /g, ""); // Update current section key
            }

            let currentElement = $(this).next();

            while (currentElement.length > 0) {
                // Check if the next element is the start of a new section
                if (currentElement.is("h2") && isNextSection(currentElement.text().trim(), currentSection)) {
                    break; // Exit the loop if a new section begins
                }
                // Check if the element has already been processed
                if (!currentElement.data("processed")) {
                    sections[currentSection] += currentElement.prop("outerHTML");
                    currentElement.data("processed", true); // Mark as processed
                }
                currentElement = currentElement.next();
            }
        });

        // Process value of each section
        Object.keys(sections).forEach((section) => {
            sections[section] = this.processSubSections(sections[section]);
        });

        return sections;
    }

    familySheetPerson = (fsPerson, role) => {
        // Get Sources section from bioHTML
        fsPerson.Sections = this.splitBioSections(fsPerson);

        // Div to hold the references
        const refsContainer = $("<div class='citationList'></div>");
        const researchNotesContainer = $("<div class='researchNotes'></div>");

        refsContainer.append($(`<div class='citationListContent'>${fsPerson?.Sections?.Sources}</div>`));
        researchNotesContainer.append(
            $(`<div class='researchNotesContent'>${fsPerson?.Sections?.ResearchNotes}</div>`)
        );

        fsPerson.BioSections = this.parseWikiText(fsPerson.bio);

        // Initialize variables
        fsPerson.BaptismDate = "";
        fsPerson.BaptismPlace = "";
        fsPerson.BurialDate = "";
        fsPerson.BurialPlace = "";
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
                                fsPerson.BaptismDate = anBitBits[1] + " ".trim();
                            }
                            if (anBitBits[0] + " ".trim() == "location") {
                                fsPerson.BaptismPlace = anBitBits[1] + " ".trim();
                            }
                        });
                    }
                    if (anEvent.match(/type=Burial/i) != null) {
                        const eBits = anEvent.replaceAll(/\n/g, "").replaceAll(/[{}]/g, "").split("|");
                        eBits.forEach(function (anBit) {
                            anBit = anBit.replace(/<ref.*?>/, "");
                            const anBitBits = anBit.split("=");
                            if (anBitBits[0] + " ".trim() == "date") {
                                fsPerson.BurialDate = anBitBits[1] + " ".trim();
                            }
                            if (anBitBits[0] + " ".trim() == "location") {
                                fsPerson.BurialPlace = anBitBits[1] + " ".trim();
                            }
                        });
                    }
                });
            }
        }

        // Store references
        this.references.push([fsPerson.Name, myRefs, mSeeAlso]);
        this.htmlReferences.push({
            id: fsPerson.Name,
            displayName: this.displayName(fsPerson)[0],
            refs: refsContainer,
        });
        this.htmlResearchNotes.push({
            id: fsPerson.Name,
            displayName: this.displayName(fsPerson)[0],
            researchNotes: researchNotesContainer,
        });

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
                            fsPerson.BurialPlace = burialPlaceFagMatch[1];
                        }
                        const burialDatesMatch = anRef.match(/\([0-9A-z\s]+?\–.+?[12][0-9]+?\),/);
                        if (burialDatesMatch != null) {
                            const burialDate2 = burialDatesMatch[0];
                            const bdSplit = burialDate2.split("–");
                            if (bdSplit[1]) {
                                fsPerson.BurialDate = bdSplit[1].replace("),", "");
                            }
                        }
                    }
                }
                if (burialDateMatch != null) {
                    fsPerson.BurialDate = burialDateMatch[1];
                }
                if (burialPlaceMatch != null) {
                    fsPerson.BurialPlace = burialPlaceMatch[1];
                }
            }
            if (anRef.match(/(Baptism\b)|(Christening\b)/i) != null) {
                const baptismDateMatch = anRef.match(/(Baptism\b|Christening\b) Date.*/);
                const baptismPlaceMatch = anRef.match(/(Baptism\b|Christening\b) Place.*/);
                if (baptismDateMatch != null && fsPerson.BaptismDate == "") {
                    fsPerson.BaptismDate = baptismDateMatch[0].match(/([0-9]{1,2}\b)?\s([A-z]{3,}\b)\s[0-9]{4}/)[0];
                }
                if (baptismPlaceMatch != null && fsPerson.BaptismPlace == "") {
                    const baptismPlaceBits = baptismPlaceMatch[0].split("|");
                    baptismPlaceBits.forEach(function (aBit) {
                        if (aBit.match(/Baptism|Christening/i) == null && aBit.match(/[0-9]/i) == null) {
                            fsPerson.BaptismPlace = aBit + " ".trim();
                        }
                    });
                }
                if (!fsPerson.BaptismDate) {
                    const baptismDateMatch = anRef.match(/\bon (\d+ \w+ \d{4})/);
                    if (baptismDateMatch != null) {
                        fsPerson.BaptismDate = baptismDateMatch[1];
                    }
                }
                if (!fsPerson.BaptismPlace) {
                    const baptismPlaceMatch = anRef.match(/\bin (.*?)\./);
                    if (baptismPlaceMatch != null) {
                        fsPerson.BaptismPlace = baptismPlaceMatch[1];
                    }
                }
            }
        });
        if (this.isOK(fsPerson.Cemetery)) {
            fsPerson.BurialPlace = fsPerson.Cemetery;
        }

        if (!fsPerson.BaptismDate || !fsPerson.BaptismPlace) {
            const baptismSection = fsPerson.BioSections.find(
                (section) => section.title === "Baptism" || section.title === "Baptism Event"
            );
            if (baptismSection) {
                const { date, place } = this.extractBaptismDetails(baptismSection.content);
                if (!fsPerson.BaptismDate) {
                    fsPerson.BaptismDate = date;
                }
                if (!fsPerson.BaptismPlace) {
                    fsPerson.BaptismPlace = place;
                }
            }
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
            if (fsPerson.Spouse.length && fsPerson.Spouse?.[0]?.do_not_display != "1") {
                if (this.keepSpouse) {
                    mainSpouseName = this.keepSpouse;
                } else {
                    mainSpouse = fsPerson.Spouse[0];
                    mainSpouseName = mainSpouse.Name;
                }
                if (fsPerson.Spouse.length) {
                    fsPerson.Spouse.forEach((fSpouse) => {
                        if (fSpouse.Name == this.keepSpouse && fSpouse?.[0]?.do_not_display != "1") {
                            if (this.keepSpouse) {
                                mainSpouse = fSpouse;
                            }
                            if (fSpouse.Name != mainSpouseName) {
                                otherSpouses.push(fSpouse);
                            }
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

        if (!fsPerson.Gender) {
            fsPerson.Gender = "undefined";
        }
        let genderSpan = "";
        if (role != "Husband" && role != "Wife") {
            genderSpan = "<span data-gender='" + fsPerson.Gender + "' class='fsGender'>" + dGender + "</span>";
        }

        let roleName = "";
        if (fsPerson.Name != $("#wtid").val()) {
            roleName = `data-name="${htmlEntities(fsPerson.Name)}" data-id="${fsPerson.Id}"`;
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
        const baptismRow = this.renderBaptismRow(fsPerson.BaptismDate, fsPerson.BaptismPlace, role);

        if (mainSpouse?.marriage_date || mainSpouse?.marriage_location) {
            marriageRow = this.renderMarriageRow(mainSpouse?.marriage_date, mainSpouse?.marriage_location, role) || "";
        }
        const burialRow = this.renderBurialRow(fsPerson.BurialDate, fsPerson.BurialPlace, role);
        const otherMarriageRow = this.renderOtherMarriageRow(fsPerson, mainSpouse, otherSpouses, role);
        const parentsRow = this.renderParentsRow(fsPerson, mainPerson, matchingPerson, role, showRole);
        let spouseRow;
        if (fsPerson?.DataStatus?.Spouse != "blank") {
            spouseRow = this.renderSpouseRow(fsPerson, role);
        }
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
        let roleText = role;

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

        if (["Husband", "Wife"].includes(role)) {
            // Find if there is a spouse without do_not_display; if not, change the role to Name
            // Check that fsPerson.Spouse is not undefined
            let spouse = true;
            if (!fsPerson.Spouse) {
                spouse = false;
            } else if (fsPerson.Spouse.length === 0) {
                spouse = false;
            } else if (!Array.isArray(fsPerson.Spouse)) {
                spouse = false;
            } else {
                spouse = fsPerson?.Spouse.find((spouse) => spouse?.do_not_display != "1");
            }
            if (!spouse) {
                role = "Single";
                roleText = "Name";
            }
        }
        fsPerson.Role = role;

        // Construct the role row with the additional details
        const roleRow = `
            <tr data-gender='${fsPerson.Gender}'
                data-name="${escapedName}" 
                data-id="${fsPerson.Id}"
                title='${escapedName}'
                data-role='${role}'
                class='roleRow'>
                <th class='role heading'>
                    <a href='https://www.wikiTree.com/wiki/${escapedName}'>${roleText}</a>:
                </th>
                <td class='fsName'  colspan='2'>
                    <span data-name="${escapedName}" data-id='${fsPerson.Id}'>
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
        } else if (role === "Single") {
            this.single = fsPerson.Id;
            this.singleWTID = fsPerson.Name;
        }

        return roleRow;
    };

    formatDateAndCreateRow = (date, place, role, rowType, rowLabel, dateStatus = "") => {
        const settings = this.getSettings();
        let dateFormat = settings.dateFormatSelect;
        if (!dateFormat) {
            settings.dateFormatSelect = dateFormat = "MDY";
            this.setSettings(settings);
        }
        const formattedDate = this.isOK(date) ? this.convertDate(date, dateFormat, dateStatus) : "";
        const rowClass = `${role.toLowerCase()} ${rowType}`;
        const dateClass = `${rowType}Date date`;
        if (!this.isOK(date)) {
            date = "";
        }

        place = place !== undefined ? place : "";

        return `<tr data-role="${role}" class="${rowClass}">
                    <th class="${rowClass}">${rowLabel}:</th>
                    <td class="${dateClass}" data-date="${date}" data-date-status="${dateStatus}">${formattedDate}</td>
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
            ? this.convertDate(marriageDate, this.getSettings().dateFormatSelect)
            : "";
        const marriageRow =
            this.isOK(marriageDate) || this.isOK(marriagePlace)
                ? `<tr class='marriedRow'><th class="${role.toLowerCase()} marriage">Married:</th>
               <td class='date marriedDate' data-date="${marriageDate}">${formattedMarriageDate}</td>
               <td>${marriagePlace}</td></tr>`
                : "";
        return marriageRow;
    };

    renderBurialRow = (burialDate, burialPlace, role) => {
        return this.formatDateAndCreateRow(burialDate, burialPlace, role, "burialRow", "Buried");
    };

    renderOtherMarriageRow = (fsPerson, mainSpouse, otherSpouses, role) => {
        let otherMarriageRow = "";

        if (otherSpouses.length === 0 && fsPerson.Spouse && fsPerson.Spouse.length > 1) {
            otherSpouses.push(
                ...fsPerson.Spouse.filter((anoSpouse) => {
                    return (
                        anoSpouse.Name !== this.people[0].Name &&
                        anoSpouse.Name !== mainSpouse.Name &&
                        anoSpouse.Name !== this.keepSpouse &&
                        anoSpouse?.do_not_display != "1"
                    );
                })
            );
        }

        if (otherSpouses.length > 0) {
            otherSpouses.forEach((oSpouse, index) => {
                const { marriage_date, marriage_end_date, marriage_location, Name } = oSpouse;
                const settings = this.getSettings();
                const dateFormat = settings.dateFormatSelect;

                const formattedMarriageDate = this.isOK(marriage_date)
                    ? this.convertDate(marriage_date, dateFormat)
                    : "";
                const formattedMarriageEndDate = this.isOK(marriage_end_date)
                    ? this.convertDate(marriage_end_date, dateFormat)
                    : "";
                const otherSpouseName = this.displayName(oSpouse)[0];
                const otherSpouseMarriageLocation = this.isOK(marriage_location) ? marriage_location : "";

                const oSpousesHeadingText =
                    index === 0 ? (otherSpouses.length > 1 ? "Other Marriages:" : "Other Marriage:") : "";

                let dash = "";
                if (this.isOK(marriage_end_date)) {
                    dash = " &ndash; ";
                }
                let formattedMarriageDateSpan = "";
                if (this.isOK(marriage_date)) {
                    formattedMarriageDateSpan = `<span class="date" data-date="${marriage_date}">${formattedMarriageDate}</span>`;
                }

                let formattedMarriageEndDateSpan = "";
                if (this.isOK(marriage_end_date)) {
                    formattedMarriageEndDateSpan = `<span class="date" data-date="${marriage_end_date}">${formattedMarriageEndDate}</span>`;
                }

                otherMarriageRow += `
                <tr data-person='${htmlEntities(oSpouse.Name)}' data-role='${role}' class='otherMarriageRow'>
                    <th class='otherMarriageHeading heading'>${oSpousesHeadingText}</th>
                    <td class='otherMarriageDate'>
                        <span class='otherSpouseName' data-name="${this.htmlEntities(oSpouse.Name)}" data-id="${
                    oSpouse.Id
                }">${otherSpouseName}</span>,
                        ${formattedMarriageDateSpan}${dash}${formattedMarriageEndDateSpan}</span>
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
                    const nameWithNicknames = this.displayName(parent)[0];
                    if (parent.Gender === "Male") {
                        fatherName = nameWithNicknames;
                        fsFather = parent;
                    } else if (parent.Gender === "Female") {
                        motherName = nameWithNicknames;
                        fsMother = parent;
                    }
                });
            }

            const fsFatherName = fsFather
                ? `data-name="${this.htmlEntities(fsFather.Name)}" data-id="${fsFather.Id}"`
                : "";
            const fsMotherName = fsMother
                ? `data-name="${this.htmlEntities(fsMother.Name)}" data-id="${fsMother.Id}"`
                : "";

            let whose = `${role}'s `;
            if ((fsPerson.Role = "Single")) {
                whose = "";
            }

            const fsFatherLink = fsFather
                ? `<a href='https://www.wikitree.com/wiki/${this.htmlEntities(fsFather.Name)}'>${whose}Father</a>`
                : `${whose}Father`;
            const fsMotherLink = fsMother
                ? `<a href='https://www.wikitree.com/wiki/${this.htmlEntities(fsMother.Name)}'>${whose}Mother</a>`
                : `${whose}Mother`;

            const fsFatherWTID = fsFather ? `<span class='fsWTID'>(${this.htmlEntities(fsFather.Name)})</span>` : "";
            const fsMotherWTID = fsMother ? `<span class='fsWTID'>(${this.htmlEntities(fsMother.Name)})</span>` : "";

            const settings = this.getSettings();
            const dateFormat = settings.dateFormatSelect;

            const fsFatherDates = fsFather
                ? `<span class='parentDates date'>${this.formatParentDates(fsFather, dateFormat).trim()}</span>`
                : "";
            const fsMotherDates = fsMother
                ? `<span class='parentDates date'>${this.formatParentDates(fsMother, dateFormat).trim()}</span>`
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

    // Helper function to format parent dates
    formatParentDates(parent, dateFormat) {
        const birthDate = this.isOK(parent.BirthDate)
            ? this.convertDate(parent.BirthDate, dateFormat, parent?.DataStatus?.BirthDate)
            : "";
        const deathDate = this.isOK(parent.DeathDate)
            ? this.convertDate(parent.DeathDate, dateFormat, parent?.DataStatus?.DeathDate)
            : "";

        if (parent.BirthDate === "0000-00-00") {
            parent.BirthDate = "";
        }

        let birthDateSpan = "";
        if (birthDate) {
            birthDateSpan = `<span class="date" data-date="${parent.BirthDate}" data-date-status="${parent?.DataStatus?.BirthDate}">${birthDate}</span>`;
        }

        let deathDateSpan = "";
        if (deathDate) {
            deathDateSpan = `<span class="date" data-date="${parent.DeathDate}" data-date-status="${parent?.DataStatus?.DeathDate}">${deathDate}</span>`;
        }

        return `(${birthDateSpan}&nbsp;&ndash;&nbsp;${deathDateSpan})`;
    }

    renderSpouseRow = (fsPerson, role) => {
        let spouseRow = "";

        if (fsPerson.Spouse) {
            if (fsPerson.Spouse.length > 0) {
                fsPerson.Spouse.forEach((fsSp, index) => {
                    const theSpouse = this.displayName(fsSp)[0];

                    // Formatting the marriage and end-of-marriage dates
                    let theMarriage = this.isOK(fsSp.marriage_date)
                        ? `<span class='marriageDate date'>${this.convertDate(fsSp.marriage_date, "Y").trim()}</span>`
                        : "";

                    let theMarriageEnd = this.isOK(fsSp.marriage_end_date)
                        ? `<span class='marriageDate date'>&nbsp;&ndash; ${this.convertDate(
                              fsSp.marriage_end_date,
                              "Y"
                          ).trim()}</span>`
                        : "";

                    // Formatting the birth and death dates (only years)
                    let birthYear = "";
                    if (this.isOK(fsSp.BirthDate) || this.isOK(fsSp.BirthDateDecade)) {
                        birthYear = fsSp.BirthDate
                            ? this.convertDate(fsSp.BirthDate, "Y", fsSp?.DataStatus?.BirthDate)
                            : "";
                        if (!this.isOK(birthYear)) {
                            birthYear = fsSp.BirthDateDecade ? fsSp.BirthDateDecade : "";
                        }
                    }
                    let deathYear = "";
                    if (this.isOK(fsSp.DeathDate) || this.isOK(fsSp.DeathDateDecade)) {
                        deathYear = fsSp.DeathDate
                            ? this.convertDate(fsSp.DeathDate, "Y", fsSp?.DataStatus?.DeathDate)
                            : "";
                        if (!this.isOK(deathYear)) {
                            deathYear = fsSp.DeathDateDecade ? fsSp.DeathDateDecade : "";
                        }
                    }

                    let formattedDates = `(${birthYear.trim()} &ndash; ${deathYear.trim()})`;

                    const theSpouseName = `data-name="${this.htmlEntities(fsSp.Name)}" data-id="${fsSp.Id}"`;

                    let spouseHeading = "";
                    let mClass = "hidden";
                    if (index === 0) {
                        mClass = "";
                        spouseHeading = fsPerson.Spouse.length > 1 ? "Spouses:" : "Spouse:";
                    }

                    spouseRow += `
                    <tr data-person='${this.htmlEntities(fsPerson.Name)}' data-role='${role}' class='spouseRow'>
                        <th class='spouseHeading heading'>${spouseHeading} </th>
                        <td class='spouseName' ${theSpouseName}>${theSpouse} 
                            <span class='spouseDates date'>${formattedDates}</span>
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

        if (fsPerson?.Sections?.Biography) {
            bioRow = `
            <tr data-role='${role}' class='bioRow'>
                <th  colspan='3' class='heading'><span class='bioHeading'>Biography</span>: 
                    <div class='theBio'>${fsPerson?.Sections?.Biography}
                    </div>
                </th>
            </tr>
            `;
        }

        return bioRow;
    };

    storeVal(jq) {
        let id = jq.attr("id");
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
                id = jq.attr("name");
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
        $("#fgaOptions input[type='checkbox']").each((index, element) => {
            const checkbox = $(element);
            const id = checkbox.attr("id");
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
                    case "showLists":
                        this.toggleStyle(id, this.showListsRules, settings[id]);
                        break;
                    case "showTables":
                        this.toggleStyle(id, this.showTablesRules, settings[id]);
                        break;
                    case "showBios":
                        this.toggleStyle(id, this.showBiosRules, !settings[id]);
                        break;
                }
            } else {
                settings[id] = true;
                switch (id) {
                    case "showBios":
                        this.toggleStyle(id, this.showBiosRules, settings[id]);
                        settings[id] = false;
                        break;
                    case "showWTIDs":
                        this.toggleStyle(id, this.showWTIDsRules, !settings[id]);
                        settings[id] = false;
                        break;
                }
            }

            this.setSettings(settings);
        });

        // Handle radio buttons
        $("#fgaOptions input[type='radio']").each(function () {
            const radio = $(this);
            const name = radio.attr("name");

            // Check if the storage object has a value for this radio group and update it
            if (settings.hasOwnProperty(name) && settings[name] === radio.val()) {
                radio.prop("checked", true).change();
            }
        });

        // Handle select boxes
        $("#fgaOptions select").each(function () {
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

                // Initialize husband and wife if undefined
                this.husband = this.husband || 0;
                this.wife = this.wife || 0;
                this.single = this.single || 0;

                this.people.forEach((cPerson) => {
                    // Check if the current person is the child being processed
                    if (cPerson.Name !== aChild.Name || this.doneKids.includes(cPerson.Name)) {
                        return; // Skip to the next person if not the child being processed or already processed
                    }

                    let isChildOfCouple = cPerson.Father === this.husband && cPerson.Mother === this.wife;
                    let isChildOfSingleParent =
                        (!this.husband && cPerson.Mother === this.wife) ||
                        (this.husband === cPerson.Father && !this.wife);
                    let isChildOfSingle = this.single && [cPerson.Father, cPerson.Mother].includes(this.single);

                    if (isChildOfCouple || isChildOfSingleParent || isChildOfSingle) {
                        const theChildRow = this.familySheetPerson(cPerson, this.ordinal(index + 1) + " Child");
                        childTbody.append(theChildRow);
                        this.doneKids.push(cPerson.Name);
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

    appendReferences() {
        this.htmlReferences.forEach((pRefs) => {
            const nameHeading = $(
                `<a class='sourcesName' href='https://www.wikitree.com/wiki/${pRefs.id}'>${pRefs.displayName} <span class='fsWTID'>(${pRefs.id})</span></a>`
            );
            const refDiv = pRefs.refs;
            refDiv.prepend(nameHeading);
            $("#sources").append(refDiv);
        });
    }

    getFormattedName(anID) {
        const clone = $("tr[data-name='" + this.htmlEntities(anID) + "'] .fsName")
            .eq(0)
            .clone(true);
        clone.find(".fsWTID").remove();
        clone.find(".fsGender").remove();
        return clone.text().trim();
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

    setSettings(settings) {
        localStorage.setItem("familyGroupAppSettings", JSON.stringify(settings));
    }
    getSettings() {
        return JSON.parse(localStorage.getItem("familyGroupAppSettings")) || {};
    }

    initializePage() {
        // Show or hide 'Tables' label based on the presence of citation tables
        this.toggleDisplay("#showTablesLabel", !!$("#notesAndSources table").length);

        // Show or hide 'Lists' label based on the presence of source lists
        this.toggleDisplay("#showListsLabel", !!$(".citationListContent dl").length);

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
        $(".marriedRow").each(function (index) {
            if (index > 0) {
                $(this).remove();
            }
        });
        $("#sources .marriedRow, #theBio .marriedRow").remove();

        // Show or hide 'Nicknames' label based on the presence of nicknames
        this.toggleDisplay("#showNicknamesLabel", !!$(".nicknames").length);

        // Handle query parameters
        const searchParams = new URLSearchParams(window.location.search);
        const testing = searchParams.get("test");
        if (testing === "1") {
            // Implement any testing logic here
        }

        // Add print icon if not already present
        if ($("#fgaPrintIcon").length === 0) {
            $("<img id='fgaPrintIcon' src='views/familyGroupApp/images/print50.png'>").appendTo("header");
            $("#fgaPrintIcon").click(() => {
                if ($("#explainer").length === 0) {
                    this.addExplainer();
                }
                window.print();
            });
        }

        handleLinks.fixLinks();
        handleLinks.fixImageLinks();
        collapse.addCollapseButtons();
        collapse.addGlobalToggle();
        this.removeEmptyAnchors();
        handleLinks.openLinksInNewTab();
    }

    removeEmptyAnchors() {
        $("a").each(function () {
            const a = $(this);
            if (a.attr("href") === undefined && a.text().trim() === "" && a.find("img").length === 0) {
                a.remove();
            }
        });
    }

    toggleDisplay(selector, condition) {
        if (condition) {
            $(selector).css("display", "inline-block");
        } else {
            $(selector).hide();
        }
    }

    sortSpouses() {
        this.people.forEach((person) => {
            if (person.Spouse && Array.isArray(person.Spouse)) {
                person.Spouse.sort((a, b) => {
                    // Replace '00' parts with '01' for comparison
                    const dateA = (a.marriage_date || "").replace(/-00/g, "-01");
                    const dateB = (b.marriage_date || "").replace(/-00/g, "-01");

                    // Compare dates as strings
                    return dateA.localeCompare(dateB);
                });
            }
        });
    }

    makeFamilySheet() {
        // for each person in this.people, if .DataStatus.Gender == "blank", .Gender = "undefined"
        this.people.forEach((aPerson) => {
            if (aPerson?.DataStatus?.Gender == "blank") {
                aPerson.Gender = "undefined";
            }
        });

        this.sortSpouses();
        $("#notesAndSources").remove();
        this.references = [];
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
            if (spouseRole === "Husband") {
                husbandTable.find("> tbody").append($(spouseRow));
            } else {
                wifeTable.find("> tbody").append($(spouseRow));
            }
        } else {
            $("th.role.heading a").text("Name");
            $("tr.otherMarriageRow").remove();
            $("tr.HusbandParentsRow th, tr.WifeParentsRow th").each(function () {
                $(this).text($(this).text().replace("Husband's ", "").replace("Wife's ", ""));
            });
        }

        if (mainRole === "Husband" || isHusbandFirst) {
            fsTable.after(husbandTable, wifeTable);
            $("tr.marriedRow").appendTo($("table.husband > tbody"));
        } else {
            fsTable.after(wifeTable, husbandTable);
            $("tr.marriedRow").appendTo($("table.wife > tbody"));
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
            let singleText = "";

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
            if ($("tr.roleRow[data-role='Single'] td.fsName").length) {
                singleText = $("tr.roleRow[data-role='Single'] td.fsName").html();
                if ($("tr.roleRow[data-role='Single'] td.fsName").eq(0).text() + " ".trim() == "") {
                    singleText = "";
                }
            }
            if (husbandName != "" && wifeName.match(/^\W*?$/) == null) {
                andText = "&nbsp;and&nbsp;";
            }

            let husbandNameSpan, wifeNameSpan, andSpan, singleSpan;

            if (husbandName) {
                husbandNameSpan = $("<span id='husbandName'>" + husbandName + "</span>");
            }
            if (wifeName) {
                wifeNameSpan = $("<span id='wifeName'>" + wifeName + "</span>");
            }
            if (andText) {
                andSpan = $("<span id='and'>" + andText + "</span>");
            }
            if (singleText) {
                singleSpan = $("<span id='name'>" + singleText + "</span>");
            }

            if (husbandName.match(/^\W*$/) != null || wifeName.match(/^\W*$/) != null) {
                $("tr.marriedRow").remove();
            }

            if ($("#familySheetFormTable caption").length == 0) {
                $("#familySheetFormTable").prepend($("<caption></caption>"));
            }

            $("#familySheetFormTable caption").append(husbandNameSpan, andSpan, wifeNameSpan, singleSpan);
            if (!isHusbandFirst) {
                this.manageRoleOrder();
            }

            const titleText = $("caption").text().replace(/\s+/, " ").trim();
            $("title").text("Family Group: " + titleText);

            this.setBaptChrist();

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

    addExplainer() {
        let todaysDate = new Date().toISOString().split("T")[0];
        todaysDate = this.convertDate(todaysDate);
        const explainerText = `Generated by the WikiTree Family Group App from data on WikiTree on ${todaysDate}. Post-generation editing may have occurred.`;
        const explainer = $("<p id='explainer'>" + explainerText + "</p>");
        $(this.$container).append(explainer);
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
        $(`<div id='notes' class='empty'>
        <h2>Research Notes:</h2>
        <div id='notesNotes'></div>
        </div>`).appendTo(notesAndSources);

        if (this.htmlResearchNotes.length > 0) {
            $("#notes").removeClass("empty");

            this.htmlResearchNotes.forEach((rNote) => {
                const thisHeading = $(
                    `<a class='sourcesName' href='https://www.wikitree.com/wiki/${rNote.id}'>${rNote.displayName} <span class='fsWTID'>(${rNote.id})</span></a>`
                );
                if (rNote.researchNotes.text().trim() !== "") {
                    rNote.researchNotes.prepend(thisHeading);
                    notesAndSources.find("#notesNotes").append(rNote.researchNotes);
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

        $("#sources li[data-wtid='" + this.husbandWTID + "']").prependTo($("#sources ul").eq(0));
        handleLinks.openLinksInNewTab();
    }

    closeInputs() {
        const theClass = this;
        $(".edit").each(function () {
            const $this = $(this);
            const isTextarea = $this.prop("tagName") === "TEXTAREA";
            const isCaption = $this.parent().prop("tagName") === "CAPTION";

            let newValue = $this.val();

            // Check for unsafe "script" tags
            if (!/script/i.test(newValue)) {
                if (isTextarea || isCaption) {
                    $this.parent().html(theClass.nl2br(newValue));
                } else {
                    $this.parent().text(newValue);
                }
            } else {
                console.log("Unsafe content detected. Not updating.");
            }
            if ($("#notesNotes").text()) {
                $("#notes").removeClass("empty");
            }

            $this.remove();
        });
    }

    setBaptChrist() {
        // Loop through each radio button to find the one that is checked
        $("input[type=radio][name=baptismChristening]").each(function () {
            // Check if the radio button is selected
            if ($(this).prop("checked")) {
                // Get the value of the selected radio button
                const selectedValue = $(this).val();

                // Update the column heading and label text based on the selected value
                $("tr.baptismRow th.baptismRow").text(`${selectedValue}:`);
                $("#showBaptisedText").text(`${selectedValue}`);
            }
        });
    }
    convertDate(dateString, outputFormat, status = "") {
        if (!outputFormat) {
            const settings = this.getSettings();
            outputFormat = settings.dateFormatSelect;
        }
        if (!dateString) {
            return "";
        }
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
        } else if (
            components.length == 2 &&
            /^[A-Za-z]{3}$/.test(components[0]) &&
            !/^[A-Za-z]{4,}$/.test(components[0])
        ) {
            // Short month and year format (e.g. "Jul 2023")
            inputFormat = "MY";
        } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
            // Long month and year format (e.g. "July 2023")
            inputFormat = "MDY";
        } else if (components.length == 3 && /^[A-Za-z]+/.test(components[0])) {
            // Long month, day, and year format (e.g. "July 23, 2023")
            inputFormat = "MDY";
        } else if (
            components.length == 3 &&
            /^[A-Za-z]{3}$/.test(components[1]) &&
            !/^[A-Za-z]{4,}$/.test(components[1])
        ) {
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
                month = this.convertMonth(components[0]);
                if (!outputFormat) {
                    outputFormat = "MY";
                }
            } else if (inputFormat == "MDY") {
                year = parseInt(components[components.length - 1]);
                month = this.convertMonth(components[0]);
                day = parseInt(components[1]);
            } else if (inputFormat == "DMY") {
                year = parseInt(components[2]);
                month = this.convertMonth(components[1]);
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

        const ISOdate = year.toString() + "-" + this.padNumberStart(month || 0) + "-" + this.padNumberStart(day || 0);

        if (outputFormat == "Y") {
            outputDate = year.toString();
        } else if (outputFormat == "MY") {
            outputDate = this.convertMonth(month) + " " + year.toString();
        } else if (outputFormat == "MDY") {
            if (day === 0) {
                // If day is 0, exclude the day and the comma from the output
                outputDate = this.convertMonth(month, "long") + " " + year.toString();
            } else {
                outputDate = this.convertMonth(month, "long") + " " + day + ", " + year.toString();
            }
        } else if (outputFormat == "DMY") {
            if (day === 0) {
                // If day is 0, exclude the day from the output
                outputDate = this.convertMonth(month, "long") + " " + year.toString();
            } else {
                outputDate = day + " " + this.convertMonth(month, "long") + " " + year.toString();
            }
        } else if (outputFormat == "sMDY") {
            outputDate = this.convertMonth(month, "short");
            if (day !== 0) {
                outputDate += " " + day + ",";
            }
            outputDate += " " + year.toString();
        } else if (outputFormat == "DsMY") {
            outputDate = "";
            if (day !== 0) {
                outputDate += day + " ";
            }
            outputDate += this.convertMonth(month).slice(0, 3) + " " + year.toString();
        } else if (outputFormat == "YMD" || outputFormat == "ISO") {
            if (day === 0) {
                // If day is 0, exclude the day and trailing hyphen from the output
                outputDate = year.toString() + "-" + this.padNumberStart(month || 0);
            } else {
                outputDate = ISOdate;
            }
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
                statusOut = this.dataStatusWord(status, ISOdate, {
                    needOnIn: false,
                    onlyYears: onlyYears,
                });
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
        outputDate = outputDate.replace(/([A-Za-z]+) (\d{4})/, "$1 $2"); // Remove comma if there's a month followed directly by a year

        return outputDate;
    }

    padNumberStart(number) {
        // Add leading zeros to a single-digit number
        return (number < 10 ? "0" : "") + number.toString();
    }

    capitalizeFirstLetter(string) {
        return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
    }

    dataStatusWord(status, ISOdate, options = { needOnIn: false, onlyYears: false }) {
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

        const settings = this.getSettings();
        const thisStatusFormat = settings.dateStatusFormat || "symbols";

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

    convertMonth(monthString, outputFormat = "short") {
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
            return this.capitalizeFirstLetter(month);
        } else {
            index = shortNames.indexOf(monthString?.toLowerCase());
            if (index == -1) {
                index = longNames.indexOf(monthString?.toLowerCase());
            }
            return index + 1;
        }
    }
};
