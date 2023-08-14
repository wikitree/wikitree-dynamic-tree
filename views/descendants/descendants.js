class DescendantsView extends View {
    meta() {
        return {
            title: "Descendants",
            description: "Show descendants.",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        window.descendantsSettings = {
            dateFormat: localStorage.getItem("descendantsDateFormat") || "ISO",
            dateDataStatusFormat: localStorage.getItem("descendantsDateDataStatusFormat") || "abbreviations",
            showWTID:
                localStorage.getItem("descendantsShowWTID") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowWTID"))
                    : false,
            showPlaces:
                localStorage.getItem("descendantsShowPlaces") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowPlaces"))
                    : true,
            showAboville:
                localStorage.getItem("descendantsShowAboville") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowAboville"))
                    : false,
            showDates:
                localStorage.getItem("descendantsShowDates") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowDates"))
                    : true,
            showSpouses:
                localStorage.getItem("descendantsShowSpouses") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowSpouses"))
                    : false,
            showChildless:
                localStorage.getItem("descendantsShowChildless") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowChildless"))
                    : true,
            showBios:
                localStorage.getItem("descendantsShowBios") !== null
                    ? JSON.parse(localStorage.getItem("descendantsShowBios"))
                    : true,
        };

        console.log(window.descendantsSettings);

        $("body").addClass("descendants");
        const help = $(
            `<div id='descendantsHelp'>
            <h2>Descendants</h2><button class="x small" id="closeHelp">x</button>
                <ul>
                    <li>Descendants are loaded 4 generations at a time.</li>
                    <li>Click on the profile link to open the profile in a new tab.</li>
                    <li>Click on the arrow (▶) (or most of the rest of the box) to expand or collapse a person's child list.  
                        No arrow means no children and therefore no descendants.</li>   
                    <li>The "Show to Generation [x]" box shows all the descendants who have been loaded up to that generation. 
                        You may need to expand a lot more lines to see all the descendants. 
                        Clicking the box shows up to the current number of generations; changing it changes it.</li>
                    <li><span class='button small'>X</span> shows only the descendants who may have an X chromosome from the primary person.</li>
                    <li id="yExplanation"><span class='button small'>Y</span> shows only the descendants who may have a Y chromosome from the primary person.</li>
                    <li id="mtExplanation"><span class='button small'>MT</span> shows only the descendants who may have mitochondrial DNA from the primary person. 
                        Clicking MT twice removes all deceased males.</li>
                    <li><label><input type="checkbox">Spouses</label> shows or hides all spouses.</li>
                    <li><label><input type="checkbox">Childless</label> Shows or hides any descendants who have/had no children.</li>
                    <li><label><input type="checkbox">Dates:</label> shows or hides dates.</li>
                    <li>The two dropdown boxes after the Dates checkbox control the date format.</li>
                    <li><label><input type="checkbox">Places</label> shows or hides birth and death places.</li>
                    <li><label><input type="checkbox">WT ID</label> shows or hides WikiTree IDs.</li>
                    <li><label><input type="checkbox">Aboville #</label> shows or hides Aboville numbers. <br>
                    e.g. 1.3.4 = primary person's 1st child's 3rd child's 4th child.</li>
                    <li><span class='button small'>CSV</span> downloads a CSV file of the descendants. This is formatted in a special way.</li>
                    <li><span class='button small'>Excel</span> downloads an Excel file of the descendants. 
                    This lists each of the currently loaded descendants in the order shown on this page, 
                    with their Aboville number and spouse data (if the spouse has been loaded).</li>
                    <li>📝 shows the person's biography and sources. It also fetches the person's spouse data.
                    This reveals the <label><input type="checkbox">Biographies</label> checkbox. This can show or hide all bios which have been loaded.</li>
                    <li>The small checkbox after the biography button highlights the person. 
                    This is useful when you're looking up and down the page and you're likely to forget which Jean or Marie you were looking at.</li>
                    <li>The small button in the top right of each person's box hides or shows that person and their line.</li>
                    <li>The colour on the left border of each person shows which of their parent's spouses was their other parent.  
                    1st: Green; 2nd: Red; 3rd: Gold; etc.</li>
                </ul>
            </div>`
        );

        $(container_selector).append(help);

        const $descendantsHelp = $("#descendantsHelp");

        $descendantsHelp.draggable();

        $(`<div id='descendantsButtons'>
        <fieldset id="helpEtc">
        <button class='small download' id='downloadCSV' title="Download data as CSV">CSV</button>
        <button class='small download' id='excelOut' title="Download data as Excel">Excel</button>
        <button class='small' id='showHelp' title="Show help">?</button>
        </fieldset>

        <button class='small' id='remove' style='display:none' title="Remove selected item"></button>
        <button class='small dna off' id='xButton' title="Toggle people with a possible X chromosome from the primary person">X</button>
        <button class='small dna off' id='yButton' title="Toggle people with a Y chromosome from the primary person">Y</button>
        <button class='small dna off' id='mtButton' title="Click to show only descendants with mtDNA from the primary person">MT</button>
        <select id="generationSelect" title="Select generation"></select>
        <label title="Show spouses"><input type="checkbox" id="showSpouses">Spouses</label>
        <label title="Show childless"><input type="checkbox" id="showChildless">Childless</label>

        <fieldset id="dateFormat">
        <label><input type="checkbox" id="showDates" title="Show dates">Dates:</label>
            <select id="dateDataStatusSelect" title="Select date data status format">
                <option value="abbreviations">bef., aft., abt.</option>
                <option value="words">before, after, about</option>
            </select>
            <select id="dateFormatSelect" title="Select date format">
                <option value="ISO">1859-11-24</option>
                <option value="MDY">November 24, 1859</option>
                <option value="sMDY">Nov 24, 1859</option>
                <option value="DMY">24 November 1859</option>
                <option value="DsMY">24 Nov 1859</option>
                <option value="Y">1859</option>
            </select>
        </fieldset>

        <fieldset id="showHide">
            <label title="Show birth and death places"><input type="checkbox" id="showPlaces">Places</label>
            <label title="Show WikiTree IDs"><input type="checkbox" id="showWTID">WT ID</label>
            <label title="Show Aboville numbers"><input type="checkbox" id="showAboville">Aboville #</label>
            <label title="Show biographies" id="showBiosLabel"><input type="checkbox" id="showBios"><span id="checkboxIndicator"></span>Biographies</label>
        </fieldset>
        </div>`).appendTo($(container_selector));

        //Set up the checkboxes
        const settings = [
            {
                key: "Childless",
                style: "hideChildlessStyle",
                selector: '[data-haschildren="0"]',
                variable: window.descendantsSettings.showChildless,
            },
            {
                key: "WTID",
                style: "hideWTIDStyle",
                selector: " .wtid",
                variable: window.descendantsSettings.showWTID,
            },
            {
                key: "Aboville",
                style: "hideAbovilleStyle",
                selector: " .aboville",
                variable: window.descendantsSettings.showAboville,
            },
            {
                key: "Dates",
                style: "hideDatesStyle",
                selector: " .datesOnly, #descendants li.person .birthDeathDate, #descendants li.person .spouseDates",
                variable: window.descendantsSettings.showDates,
            },
            {
                key: "Spouses",
                style: "hideSpousesStyle",
                selector: " .spouse",
                variable: window.descendantsSettings.showSpouses,
            },
        ];

        settings.forEach(({ key, style, selector, variable }) => {
            // Initialize visibility toggle
            if (variable == true) {
                $(`#show${key}`).prop("checked", true).addClass("on");
            }
            toggleVisibility(style, selector, `show${key}`);

            // Register click handler
            $(container_selector).off("click", `#show${key}`);
            $(container_selector).on("click", `#show${key}`, function (e) {
                const isChecked = $(this).prop("checked");
                toggleVisibility(style, selector, `show${key}`);
                window.descendantsSettings[`show${key}`] = isChecked; // Update the actual variable value
                localStorage.setItem(`descendantsShow${key}`, isChecked); // Store the value in local storage
                if ($(this).prop("id") == "showDates") {
                    toggleDateVisibility();
                }
            });
        });

        // Initialize visibility toggle for biographies
        if (window.descendantsSettings.showBios == true) {
            $("#showBios").prop("checked", true);
        } else {
            $("#showBios").prop("checked", false);
        }

        $(container_selector).off("click", "#showBios");
        $(container_selector).on("click", "#showBios", function (e) {
            // If this is checked, show all bios; if unchecked, hide all bios
            if ($(this).prop("checked")) {
                $(".biography").addClass("visible");
            } else {
                $(".biography").removeClass("visible");
            }
            $(this).removeClass("half-checked");
            window.descendantsSettings.showBios = isChecked; // Update the actual variable value
            localStorage.setItem("descendantsShowBios", isChecked); // Store the value in local storage
        });

        $(container_selector).off("click", "#checkboxIndicator");
        // Initialize visibility toggle for biographies
        $(container_selector).on("click", "#checkboxIndicator", function (e) {
            const $checkbox = $(this).prev("#showBios");
            const isChecked = $checkbox.prop("checked");
            const isHalfChecked = $checkbox.hasClass("half-checked");

            if (isHalfChecked || isChecked) {
                $checkbox.prop("checked", false);
            } else {
                $checkbox.prop("checked", true);
            }

            $checkbox.removeClass("half-checked");

            // Trigger the original checkbox's click event
            $checkbox.click();
        });

        if (window.descendantsSettings.showPlaces == true) {
            $("#showPlaces").prop("checked", true).addClass("on");
        }
        toggleDateVisibility();

        $(container_selector).off("click", "#showHelp,#closeHelp");
        $(container_selector).on("click", "#showHelp,#closeHelp", function (e) {
            $("#descendantsHelp").toggle();
        });

        // Attach click event listener to 'li' elements
        $(container_selector).off("click", "li");
        $(container_selector).on("click", "li", function (e) {
            e.stopImmediatePropagation(); // Stop the event from bubbling up to parent 'li' elements
            const $childrenUl = $(this).children("ul.personList");
            if ($childrenUl.children().length == 0 && $(this).children(".load-more").length == 0) {
                return;
            }
            const $arrow = $(this).children(".arrow");
            $childrenUl.toggleClass("expanded");
            $arrow.toggleClass("rotated");
            if ($(this).children(".load-more").length > 0) {
                $(this).children(".load-more").trigger("click");
            }
        });
        $(container_selector).append(
            $("<img src='https://apps.wikitree.com/apps/beacall6/images/tree.gif' id='shakyTree'>")
        );
        fetchDescendants(person_id, 1);
        $("#shakyTree").show();

        $(document).off("click", ".profileLink");
        $(document).on("click", ".profileLink", function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.open($(this).attr("href"), "_blank");
        });

        $(container_selector).off("click", ".load-more");
        $(container_selector).on("click", ".load-more", function (e) {
            loadMore(e);
        });

        $(container_selector).off("change click", "#generationSelect");
        $(container_selector).on("change click", "#generationSelect", function (e) {
            showUpToGeneration();
        });

        $(container_selector).off("click", "#excelOut");
        $(container_selector).on("click", "#excelOut", function (e) {
            descendantsExcelOut();
        });

        $(container_selector).off("click", "#showPlaces");
        $(container_selector).on("click", "#showPlaces", function (e) {
            localStorage.setItem("descendantsShowPlaces", $(this).prop("checked"));
            toggleDateVisibility();
        });

        $(container_selector).off("click", ".collapse");
        $(container_selector).on("click", ".collapse", function (e) {
            e.preventDefault();
            e.stopPropagation();
            collapseThis(e);
        });

        $(container_selector).off("click", "a.switch");
        $(container_selector).on("click", "a.switch", function (e) {
            e.preventDefault();
            e.stopPropagation();
            // Open the link in a new tab
            // The link is window.location.href with #name=[wtid] changed to #name=${$this).data("name")}
            const link = window.location.href.replace(/#name=.*?&/, `#name=${$(this).data("name")}&`);
            window.open(link, "_blank");
        });

        $(container_selector).off("click", "#xButton");
        $(container_selector).on("click", "#xButton", function (e) {
            if ($(this).hasClass("off")) {
                turnOffOtherButtons();
                $("li.person").addClass("hidden");

                // Initialize and store the initial state of li.person elements
                var initialXState = {};
                $("li.person").each(function (i, el) {
                    initialXState[i] = $(el).is(":visible");
                });

                $("[data-x='1']").show();
                $("[data-x='0']").hide();
                $(this).toggleClass("off");
                $(this).toggleClass("on");

                // Store the initial state in the button's data attribute
                $(this).data("initialXState", initialXState);
            } else {
                // Retrieve the initial state from the button's data attribute
                var initialXState = $(this).data("initialXState");

                // Restore the initial state of li.person elements
                $("li.person").each(function (i, el) {
                    if (initialXState[i]) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                });

                $("[data-x='1']").show();
                $("[data-x='0']").show();
                $(this).toggleClass("off");
                $(this).toggleClass("on");
                showUpToGeneration();
            }
        });

        $(container_selector).off("click", "#yButton");
        $(container_selector).on("click", "#yButton", function (e) {
            if ($(this).hasClass("off")) {
                turnOffOtherButtons();
                $("li.person").addClass("hidden");

                // Initialize and store the initial state of li.person elements
                var initialYState = {};
                $("li.person").each(function (i, el) {
                    initialYState[i] = $(el).is(":visible");
                });

                $("[data-ydna='1']").show();
                $("[data-ydna='0']").hide();
                $(this).toggleClass("off");
                $(this).toggleClass("on");

                // Store the initial state in the button's data attribute
                $(this).data("initialYState", initialYState);
            } else {
                // Retrieve the initial state from the button's data attribute
                var initialYState = $(this).data("initialYState");

                // Restore the initial state of li.person elements
                $("li.person").each(function (i, el) {
                    if (initialYState[i]) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                });

                $("[data-ydna='1']").show();
                $("[data-ydna='0']").show();
                $(this).toggleClass("off");
                $(this).toggleClass("on");
                showUpToGeneration();
            }
        });

        $("#dateFormatSelect option[value='" + window.descendantsSettings.dateFormat + "']").prop("selected", true);
        $("#dateDataStatusSelect option[value='" + window.descendantsSettings.dateDataStatusFormat + "']").prop(
            "selected",
            true
        );

        // Variable to keep track of the initial state of ul.personList elements
        let initialPersonListState = {};

        $(container_selector).off("click", "#mtButton");
        $(container_selector).on("click", "#mtButton", function () {
            $("#shakyTree").show();
            if ($(this).hasClass("off")) {
                turnOffOtherButtons();
                $("li.person").addClass("hidden");

                // Store the initial state of ul.personList elements
                initialPersonListState = {};
                $("ul.personList").each(function (i, el) {
                    initialPersonListState[i] = $(el).hasClass("expanded");
                });

                $("[data-mtdna='1']").each((i, el) => {
                    $(el).show();
                    const parent_li = $(el).parents("li").first();
                    const parent_ul = parent_li.find("ul.personList");
                    if (!parent_ul.hasClass("expanded")) {
                        // Only click if the ul.personList is hidden
                        parent_li.click();
                    }
                });

                $("#mtButton").removeClass("off");
                $("#mtButton").addClass("on");
                $("#mtButton").attr("title", "Click again to remove deceased males");
            } else if ($(this).hasClass("on")) {
                // hide dead males
                $("[data-mtdna='1']").each((i, el) => {
                    if ($(el).attr("data-gender") == "Male" && !isAlive($(el))) {
                        $(el).hide();
                    } else {
                        $(el).show();
                    }
                });
                $("#mtButton").addClass("hideMales");
                $("#mtButton").removeClass("on");
                $("#mtButton").attr("title", "Click again to return to the former state");
            } else {
                $("li.person").removeClass("hidden");
                $("[data-mtdna='1']").show();
                $("[data-mtdna='0']").show();

                // Restore the initial state of ul.personList elements
                $("ul.personList").each(function (i, el) {
                    if (initialPersonListState[i]) {
                        $(el).show().addClass("expanded");
                    } else {
                        $(el).hide().removeClass("expanded");
                    }
                });

                $("#mtButton").addClass("off");
                $("#mtButton").removeClass("hideMales");
                showUpToGeneration();
                $("#mtButton").attr("title", "Click to show only descendants with mtDNA from the primary person");
            }
            $("#shakyTree").hide();
        });

        $(container_selector).off("click", ".moreDetailsEye");
        $(container_selector).on("click", ".moreDetailsEye", function (e) {
            e.stopImmediatePropagation();
            const $biography = $(this).closest("li").children(".biography");
            if ($biography.length > 0) {
                $biography.toggleClass("visible");
                updateShowBiosState();
            } else {
                addBio($(this).data("name")).then(() => {
                    updateShowBiosState();
                });
            }
        });

        $(container_selector).off("click", "#downloadCSV");
        $(container_selector).on("click", "#downloadCSV", function (e) {
            e.stopImmediatePropagation();
            makeCSVFile();
        });

        $(container_selector).off("click", ".highlightCheckbox");
        $(container_selector).on("click", ".highlightCheckbox", function (e) {
            e.stopImmediatePropagation();
            if ($(this).is(":checked")) {
                $(this).closest("li").addClass("highlighted");
            } else {
                $(this).closest("li").removeClass("highlighted");
            }
        });

        $(container_selector).off("change", "#dateFormatSelect,#dateDataStatusSelect");
        $(container_selector).on("change", "#dateFormatSelect,#dateDataStatusSelect", function (e) {
            e.stopImmediatePropagation();
            localStorage.setItem("descendantsDateFormat", $("#dateFormatSelect").val());
            localStorage.setItem("descendantsDateDataStatusFormat", $("#dateDataStatusSelect").val());
            window.descendantsSettings.dateDataStatusFormat = $("#dateDataStatusSelect").val();
            window.descendantsSettings.dateFormat = $("#dateFormatSelect").val();
            changeDateFormat(window.descendantsSettings.dateFormat);
        });

        $("#view-container").css("overflow", "inherit");

        $(container_selector).off("change", "#view-select");
        $("#view-select").on("change", function (e) {
            $("#view-container").css("overflow", "auto");
        });
    }
}

function turnOffOtherButtons() {
    $("#xButton").addClass("off");
    $("#xButton").removeClass("on");
    $("#yButton").addClass("off");
    $("#yButton").removeClass("on");
    $("#mtButton").addClass("off");
    $("#mtButton").removeClass("on");
}

function isAlive(person) {
    const currentYear = new Date().getFullYear();

    if (person.data("death-year")) {
        return false;
    }

    if (person.data("birth-year")) {
        const birthYear = parseInt(person.data("birth-year"));
        if (birthYear < currentYear - 100) {
            return false;
        }
    }
}

function assignGenerationAndAboville() {
    rows = [];
    visited = new Set();
    // Initial call on root li
    const rootLi = document.querySelector("li#primaryPerson");
    processLi(rootLi, 0);
    const uls = $("ul.personList");
    uls.each(function () {
        $(this)
            .children()
            .each(function (index) {
                $(this).attr("data-birth-order", parseInt(index + 1));
            });
    });
    $("li.person").each(function () {
        if ($(this).data("aboville") == undefined && $(this).prop("id") !== "primaryPerson") {
            let el = $(this);
            let aboville = el.data("birth-order") || "1"; // Start with current element's birth-order

            // Find the closest ancestor that's a 'li.person' or '#primaryPerson'
            let parentPerson = el.closest("ul.personList").closest("li.person");

            while (parentPerson.length > 0 && parentPerson.prop("id") !== "primaryPerson") {
                let newNum = parentPerson.data("birth-order");
                if (typeof newNum === "undefined") {
                    newNum = 1;
                }
                aboville = newNum + "." + aboville;

                // Move to the next ancestor
                parentPerson = parentPerson.closest("ul.personList").closest("li.person");
            }

            el.data("aboville", aboville).attr("data-aboville", aboville);
            el.find(".nameAndBio").children(".aboville").text(aboville);
        }
    });

    $("#primaryPerson").data("aboville", 0).children(".aboville").text("0");
}

function changeDateFormat(format) {
    $("span.birthDeathDetails,span.datesOnly,dl.spouse").each(function () {
        const theLi = $(this).closest("li");

        const birthDateSpan = $(this).children("span.birthDate");
        const birthStatus = theLi.data("birth-date-status") || "";
        const birthDate = theLi.data("birth-date") || "";
        let newBirthDate = convertDate(birthDate, format, birthStatus);
        if (newBirthDate) {
            newBirthDate = newBirthDate.trim();
        }
        if (newBirthDate == 0) {
            newBirthDate = "";
        }
        birthDateSpan.text(newBirthDate);

        // marriage date
        const marriageDateSpan = $(this).children("dt.marriageDate");
        marriageDateSpan.each(function () {
            let marriageDate = $(this).data("marriage-date") || "";
            if (marriageDate) {
                console.log(marriageDate);
                marriageDate = marriageDate.toString().replace(/^(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
                let newMarriageDate = convertDate(marriageDate, format, "");
                if (newMarriageDate) {
                    newMarriageDate = newMarriageDate.trim();
                }
                if (newMarriageDate == 0) {
                    newMarriageDate = "";
                }
                $(this).text(newMarriageDate);
            }
        });
        // death date
        const deathDateSpan = $(this).children("span.deathDate");
        const deathStatus = theLi.data("death-date-status") || "";
        const deathDate = theLi.data("death-date") || "";
        let newDeathDate = convertDate(deathDate, format, deathStatus);
        if (newDeathDate) {
            newDeathDate = newDeathDate.trim();
        }
        if (newDeathDate == 0) {
            newDeathDate = "";
        }
        deathDateSpan.text(newDeathDate);
    });
}

function loadMore(e) {
    e.stopPropagation(); // Prevent the click from triggering the li click event
    let target = $(e.target);
    // if e.target is an img, then target is the parent button tag
    if (target.is("img")) {
        target = $(target).parent();
    }
    target.fadeOut();
    // timeout and remove
    setTimeout(function () {
        target.remove();
    }, 1000);
    const theLI = target.closest("li");
    if (theLI.children(".rotated").length == 0) {
        target.closest("li").trigger("click");
    }
    let person_id = target.parent().data("id");
    let generation = target.parent().children("ul.personList").data("generation");
    fetchDescendants(person_id, generation);
}

function showUpToGeneration() {
    // Show all generations up to the selected generation and hide the rest
    const selectedGeneration = $("#generationSelect").val();
    $("#descendants ul.personList").each(function () {
        var generation = $(this).data("generation");
        if (generation <= selectedGeneration) {
            $(this).addClass("expanded");
            $(this).closest("li").children(".arrow").addClass("rotated");
        } else {
            $(this).removeClass("expanded");
            $(this).closest("li").children(".arrow").removeClass("rotated");
        }
    });
}

const fields = [
    "BirthDate",
    "BirthDateDecade",
    "BirthLocation",
    "DataStatus",
    "DeathDate",
    "DeathDateDecade",
    "DeathLocation",
    "Derived.BirthName",
    "Derived.BirthNamePrivate",
    "Father",
    "FirstName",
    "Gender",
    "HasChildren",
    "Id",
    "IsRedirect",
    "LastNameAtBirth",
    "LastNameCurrent",
    "LastNameOther",
    "MiddleName",
    "Mother",
    "Name",
    "Nicknames",
    "Prefix",
    "RealName",
    "Suffix",
    "Spouses",
];

// Parent template
function createParentTemplate(parentData) {
    let marriageDate = convertDate(parentData.marriage_date, window.descendantsSettings.dateFormat) || "";
    return `
    <dt class='marriageDate'>${marriageDate}</dt>
    <dd data-id='${parentData.Id}' data-name="${parentData.Name}" data-fullname="${parentData.FullName}" data-dates="${parentData.Dates}">
      m. <a data-gender="${parentData.Gender}" href="https://www.wikitree.com/wiki/${parentData.Name}">${parentData.FullName}</a>
      ${parentData.Dates}
      <a class='switch' title="Switch to ${parentData.FullName}" data-name="${parentData.Name}">
        ↔️
      </a>
    </dd>  
  `;
}

function addParentToDOM(parent) {
    const $childLi = $(`li[data-father='${parent.Id}'],li[data-mother='${parent.Id}']`);

    const $childUl = $childLi.closest("ul.personList");

    // Create DL
    const $dl = $('<dl class="bdDatesLocations spouse"></dl>');

    parent.FullName = new PersonName(parent).withParts(["FullName"]);
    // Generate HTML from template
    parent.Dates = getDatesString(parent);
    const parentHtml = createParentTemplate(parent);

    $dl.append(parentHtml);

    // Insert before UL
    if ($childUl.prop("id") != "descendants") {
        $childUl.before($dl);
    }
}

function getDataStatus(person) {
    if (person.DataStatus) {
        keys = Object.keys(person.DataStatus);
        for (var i = 0; i < keys.length; i++) {
            if (person.DataStatus[keys[i]] == "uncertain" || person.DataStatus[keys[i]] == "guess") {
                person.DataStatus[keys[i]] = "~";
            } else if (person.DataStatus[keys[i]] == "certain") {
                person.DataStatus[keys[i]] = "";
            } else if (person.DataStatus[keys[i]] == "before") {
                person.DataStatus[keys[i]] = "<";
            } else if (person.DataStatus[keys[i]] == "after") {
                person.DataStatus[keys[i]] = ">";
            }
        }
    }
    return person.DataStatus;
}

function getDatesString(person) {
    let datesStr = "";
    const birthDate = getDatePart(person, "BirthDate");
    const deathDate = getDatePart(person, "DeathDate");
    if (birthDate) {
        datesStr += `(${birthDate}`;
    }
    if (deathDate) {
        datesStr += `–${deathDate})`;
    }
    return datesStr;
}

function getDatePart(person, part) {
    if (person[part]) {
        return person[part].split("-")[0];
    } else if (person[part + "Decade"]) {
        return person[part + "Decade"];
    }

    return "";
}

function getLineage($li) {
    let lineage = "";

    if ($li.parent().is("li")) {
        // Recursively get parent lineage
        lineage = getLineage($li.parent("li"));

        // Add gender of direct parent
        const gender = $li.parent().data("gender");
        let spouseGender = "x";
        if ($li.parent().children("dl").length) {
            spouseGender = $li.parent().children("dl").find("dd a").data("gender");
        }
        lineage += "; " + gender + ";" + spouseGender;
    }

    return lineage;
}

function makeCSVFile() {
    const rows = [];

    $("#descendants > li").each(function () {
        processLi($(this), "", false);
    });

    function processLi($li, lineage, isSpouse) {
        const id = $li.data("id");
        const name = $li.data("name");
        const fullName = $li.find("a.profileLink").first().text().trim();
        const dates = "(" + $li.data("birth-year") + "–" + $li.data("death-year") + ")";
        let generation = parseInt($li.closest("ul.personList").data("generation"));
        if ($li.closest("ul.personList").prop("id") == "descendants") {
            generation = 0;
        }

        const separator = "; ";
        const lineageSpaces = separator.repeat(generation * 2);
        generation += ":";

        let row = generation + "; " + lineageSpaces + ` [${name}|${fullName} ${dates}]`;

        // Check for spouse
        // console.log($li);
        const $spouse = $li.children("dl").children("dd").first();
        //  console.log($spouse);
        if ($spouse.length) {
            const spouseId = $spouse.data("id");
            const spouseName = $spouse.data("name");
            const spouseFullName = $spouse.data("fullname");
            const spouseDates = $spouse.data("dates");
            if (spouseId && spouseName && spouseFullName) {
                row += `; [${spouseName}|${spouseFullName} ${spouseDates}]`;
            }
        }

        rows.push(row);

        // Process children
        $li.children("ul.personList")
            .children("li")
            .each(function () {
                const gender = $li.data("gender").toLowerCase().startsWith("m") ? "m" : "f";
                processLi($(this), lineage ? `${lineage}; ${gender}` : gender, false);
            });
    }

    const csv = rows.join("\n");
    downloadCsv(csv);
}

function downloadCsv(csv) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "data.csv";
    link.click();
}

async function mergeSpouseDetails(people, fields) {
    const spouseIds = [];
    const obj = people[2];
    const obj1 = obj;

    // Extracting spouse Ids and building a lookup object for easy merging later
    const spouseDetailsLookup = Object.entries(obj1).reduce((lookup, [personId, personData]) => {
        if (personData.Spouses) {
            // Changing the Spouses array into an object
            const spouseObj = {};
            personData.Spouses.forEach((spouse) => {
                const spouseId = spouse.Id ? String(spouse.Id) : null;
                if (spouseId) {
                    spouseIds.push(spouseId);
                    spouseObj[spouseId] = spouse;
                    lookup[spouseId] = { personId, spouse };
                }
            });
            personData.Spouses = spouseObj;
        }
        return lookup;
    }, {});

    if (spouseIds.length > 0) {
        $("#shakyTree").show();
        const spouses = await WikiTreeAPI.getPeople("TA_Descendants", spouseIds.join(","), fields, {
            resolveRedirect: 1,
        });
        const obj2 = spouses;

        // Merging spouse details in obj1 with corresponding details from obj2
        obj2.forEach((item) => {
            if (typeof item === "object") {
                Object.entries(item).forEach(([spouseId, spouseData]) => {
                    const lookupItem = spouseDetailsLookup[spouseId];
                    if (lookupItem) {
                        // Merging the existing spouse data with the new data from obj2
                        Object.assign(lookupItem.spouse, spouseData);
                    }
                });
            }
        });
        $("#shakyTree").hide();
    }

    return obj1; // Returning the merged object
}

async function fetchDescendants(person_id, generation) {
    const people = await WikiTreeAPI.getPeople("test", person_id, fields, {
        descendants: 4,
        resolveRedirect: 1,
    });

    console.log(people);
    /* If a person has a negative key, store their negative key temporarily.
     Replace the key and Id with person_id+_${negativeId} so that the negative keys/Ids are unique.
     Find any Father or Mother Ids that match the negative Ids and replace them with the new Ids.
     */
    const negativeKeys = [];
    const negativeIds = [];
    for (const key in people[2]) {
        if (key < 0) {
            negativeKeys.push(key);
            negativeIds.push(people[2][key].Id);
            people[2][person_id + "_" + key] = people[2][key];
            people[2][person_id + "_" + key].Id = person_id + "_" + key;
            delete people[2][key];
        }
    }
    for (const key in people[2]) {
        if (people[2][key].Father) {
            if (negativeIds.includes(people[2][key].Father)) {
                people[2][key].Father = person_id + "_" + people[2][key].Father;
            }
        }
        if (people[2][key].Mother) {
            if (negativeIds.includes(people[2][key].Mother)) {
                people[2][key].Mother = person_id + "_" + people[2][key].Mother;
            }
        }
    }

    //log the number of keys in people[2]
    console.log(Object.keys(people[2]).length);
    $("#shakyTree").hide();

    // Usage example

    obj = await mergeSpouseDetails(people, fields);
    breadthFirstDescent(person_id, obj, generation);
}

function setUpRemoveButton() {
    const rootPersonGender = $("#descendants li:first-child").data("gender");
    if (rootPersonGender) {
        if (rootPersonGender == "Male") {
            $("#remove").text("Hide Females");
            $("#remove").data("gender", "Female");
            $("#remove").addClass("Female");
        } else if (rootPersonGender == "Female") {
            $("#remove").text("Hide Males");
            $("#remove").data("gender", "Male");
            $("#remove").addClass("Male");
        }
        $("#descendantsButtons").show();
        $("#remove").on("click", function () {
            var genderToRemove = $(this).data("gender");
            if ($(this).hasClass("Male")) {
                genderToRemove = "Male";
            } else {
                genderToRemove = "Female";
            }
            $("#descendants").toggleClass("hide-" + genderToRemove);
            //$("#descendants li." + genderToRemove).toggle();

            // Toggle arrow visibility
            $("#descendants li").each(function () {
                var $arrow = $(this).children(".arrow");
                const thisGender = $(this).data("gender");
                const childUL = $(this).children("ul.personList");
                $arrow.hide();
                childUL.children("li").each(function () {
                    if ($(this).hasClass(thisGender)) {
                        $arrow.show();
                    }
                });
            });

            // Toggle button text
            var btn = $(this);
            btn.text() == "Hide Females"
                ? btn.text("Show Females")
                : btn.text() == "Show Females"
                ? btn.text("Hide Females")
                : btn.text() == "Hide Males"
                ? btn.text("Show Males")
                : btn.text("Hide Males");
        });

        // Expand the root person's children and rotate the arrow on page load
        $("#descendants > li > ul.personList").addClass("expanded");
        $("#descendants > li > .arrow").addClass("rotated");
    }
}

function breadthFirstDescent(rootId, people, generation) {
    // Add a generation property for each item in the toProcess queue
    let toProcess = [{ id: rootId, generation: generation }];
    while (toProcess.length > 0) {
        let currentItem = toProcess.shift();
        let currentId = currentItem.id;
        let currentGeneration = currentItem.generation;
        let person = people[currentId];

        if (person) {
            let children = Object.values(people).filter(
                (child) => child.Father == currentId || child.Mother == currentId
            );
            if (children.length > 0 && !person.HasChildren) {
                person.HasChildren = true;
            }
            for (let child of children) {
                // Add child to the queue with generation increased by 1
                toProcess.push({ id: child.Id, generation: currentGeneration + 1 });
            }
            displayPerson(currentId, people, currentGeneration);
        }
    }
    assignGenerationAndAboville();
}

function displayPerson(id, people, generation) {
    const person = people[id];
    if (!person) {
        return;
    }
    if ($("#descendants").length == 0) {
        $("#view-container").append("<ul id='descendants'></ul>");
    }

    if ($(`li[data-id="${person.Id}"]`).length == 0) {
        const personName = new PersonName(person);
        const fullName = personName.withParts(["FullName"]);
        let birthYear = "";
        if (person.BirthDate && !["0000-00-00", "unknown"].includes(person.BirthDate)) {
            birthYear = person.BirthDate.split("-")[0];
        } else if (person.BirthDateDecade && person.BirthDateDecade != "unknown") {
            birthYear = person.BirthDateDecade;
        }
        let deathYear = "";
        if (person.DeathDate && !["0000-00-00", "unknown"].includes(person.DeathDate)) {
            deathYear = person.DeathDate.split("-")[0];
        } else if (person.DeathDateDecade && person.DeathDateDecade != "unknown") {
            deathYear = person.DeathDateDecade;
        }
        const theGender = person.Gender;
        let nameLink = `<a class='profileLink' href="https://www.wikitree.com/wiki/${person.Name}" target='_blank'>${fullName}</a>`;

        const numberOfChildren = Object.values(people).filter(
            (child) => child.Father == id || child.Mother == id
        ).length;
        const hasUnloadedChildren = person.HasChildren && numberOfChildren === 0;
        const loadMoreButton = hasUnloadedChildren
            ? "<button class='load-more small'><img src='https://www.wikitree.com/images/icons/descendant-link.gif'></button>"
            : "";
        let moreDetailsEye =
            '<span data-name="' + person.Name + '" title="Show/hide biography" class="moreDetailsEye">📝</span>';
        // if person.Id is nan, it's a private profile
        if (isNaN(person.Id)) {
            nameLink = `<a class="profileLink">Private</a>`;
            moreDetailsEye = "";
        }
        let deathLocation = "";
        if (person.DeathLocation) {
            deathLocation = " " + person.DeathLocation;
        }

        let birthDate = "";
        if (person.BirthDate) {
            birthDate =
                convertDate(person.BirthDate, window.descendantsSettings.dateFormat, person?.DataStatus?.BirthDate) ||
                "";
            if (birthDate) {
                birthDate = birthDate.trim();
            }
        } else if (person.BirthDateDecade) {
            birthDate = person.BirthDateDecade;
        }
        let deathDate = "";
        if (person.DeathDate) {
            deathDate =
                convertDate(person.DeathDate, window.descendantsSettings.dateFormat, person?.DataStatus?.DeathDate) ||
                "";
            if (deathDate) {
                deathDate = deathDate.trim();
            }
        } else if (person.deathDateDecade) {
            deathDate = person.DeathDateDecade;
        }
        const wtidSpan = person.Name ? `<span class='wtid'>(${person.Name})</span>` : "";
        const datesOnly = `<span class='datesOnly'>(<span class="birthDeathDate birthDate">${birthDate}</span> – <span class="birthDeathDate deathDate">${deathDate}</span>)</span>`;
        const highlightCheckbox = `<input type='checkbox' class='highlightCheckbox' data-id='${person.Id}' title='Highlight this person' />`;
        const abovilleSpan = `<span class='aboville'></span>`;
        // <a href="https://maps.google.com/maps?q=Hodnet, Shropshire, England" target="_map" title="Google Maps"><img src="/images/icons/map.gif.pagespeed.ce.dRGS_qcAFb.gif" border="0" width="12" height="11" alt="map"></a>
        const birthPin = person.BirthLocation
            ? `<a href="https://maps.google.com/maps?q=${person.BirthLocation}" class="mapsLink" target="_map" title="Google Maps"><img src="https://www.wikitree.com/images/icons/map.gif" alt="map"></a>`
            : "";
        const deathPin = person.DeathLocation
            ? `<a href="https://maps.google.com/maps?q=${person.DeathLocation}" class="mapsLink" target="_map" title="Google Maps"><img src="https://www.wikitree.com/images/icons/map.gif" alt="map"></a>`
            : "";

        // New item
        const listItemContent = `<span class="nameAndBio">${nameLink} ${wtidSpan} 
        ${datesOnly} ${moreDetailsEye} ${highlightCheckbox} ${abovilleSpan}</span><span class='birthDeathDetails'><span class='birthDeathDate birthDate'>${birthDate}</span><span class='birthDeathPlace birthPlace'>${
            person.BirthLocation || ""
        } ${birthPin}</span><span class='birthDeathDate deathDate'>${deathDate}</span><span class='birthDeathPlace deathPlace'>${deathLocation} ${deathPin}</span></span> ${loadMoreButton}`;
        const parent = $("li[data-id='" + person.Father + "'], li[data-id='" + person.Mother + "']");
        let childIndicator = person.HasChildren ? "<span class='arrow'>▶</span>" : "";
        let ulState = "";
        if ($("#generationSelect").val() >= generation) {
            ulState = "expanded";
            if (childIndicator) {
                childIndicator = "<span class='arrow rotated'>▶</span>";
            }
        }

        const collapseButton = `<button class='collapse small'></button>`;
        const newItem = $(
            `<li data-id='${person.Id}' data-father="${person.Father}" data-mother="${person.Mother}" data-name="${person.Name}" 
            data-birth-year="${birthYear}"  data-death-year="${deathYear}" data-birth-date="${person.BirthDate}" 
            data-birth-date-status="${person?.DataStatus?.BirthDate}" data-death-date="${person.DeathDate}" 
            data-death-date-status="${person?.DataStatus?.DeathDate}" data-gender='${person.Gender}' 
            data-x='0' data-ydna='0' data-mtdna='0' class='${theGender} person' data-haschildren="${person.HasChildren}">
            ${childIndicator} ${listItemContent}<ul data-generation='${generation}' class='${ulState} personList'>
            </ul>${collapseButton}</li>`
        );

        const ydnaImage = $("<img class='ydna dna' src='https://www.wikitree.com/images/icons/dna/Y.gif'>");
        if (
            (parent.data("ydna") == 1 ||
                parent.attr("ydna") == 1 ||
                parent.length == 0 ||
                $("li.person[data-id='" + person.Father + "']").data("ydna") == 1) &&
            person.Gender == "Male"
        ) {
            newItem.data("ydna", 1).attr("data-ydna", 1);
            newItem.find(".datesOnly").after(ydnaImage);
        }

        const mtdnaImage = $("<img class='mtdna dna' src='https://www.wikitree.com/images/icons/dna/mt.gif'>");
        if (
            ((parent.data("gender") == "Female" || parent.attr("data-gender") == "Female") &&
                (parent.data("mtdna") == 1 || parent.attr("data-mtdna") == 1)) ||
            (parent.length == 0 && person.Gender == "Female") ||
            // Find mother
            $("li.person[data-id='" + person.Mother + "']").data("mtdna") == 1
        ) {
            newItem.data("mtdna", 1).attr("data-mtdna", 1);
            newItem.find(".datesOnly").after(mtdnaImage);
        }

        const xImage = $("<img class='x dna' src='https://www.wikitree.com/images/icons/dna/X.gif'>");
        if (
            ((parent.data("x") == 1 || parent.attr("data-x") == 1) &&
                (parent.data("gender") == "Female" ||
                    parent.attr("data-gender") == "Female" ||
                    ((parent.data("gender") == "Male" || parent.attr("data-gender") == "Male") &&
                        person.Gender == "Female"))) ||
            parent.length == 0 ||
            $("li.person[data-id='" + person.Mother + "']").data("x") == 1
        ) {
            newItem.data("x", 1).attr("data-x", 1);
            newItem.find(".datesOnly").after(xImage);
        }

        if (parent.length == 0) {
            $("#descendants").append(newItem);
            newItem.prop("id", "primaryPerson");
            setUpRemoveButton();
            if (person.Gender == "Male") {
                $("#mtButton,#mtExplanation").remove();
            } else {
                $("#yButton,#yExplanation").remove();
            }
        } else {
            parent.each(function () {
                const aParent = $(this);
                const newItemClone = newItem.clone();
                if (aParent.children("ul.personList").length == 0) {
                    aParent.append($("<ul class='personList'></ul>").append(newItemClone));
                } else {
                    let siblings = aParent.children("ul.personList").children("li");
                    let inserted = false;
                    for (let i = 0; i < siblings.length; i++) {
                        let siblingBirthYear = $(siblings[i]).data("birth-year");
                        siblingBirthYear = siblingBirthYear.toString().endsWith("s")
                            ? parseInt(siblingBirthYear.replace("s", "")) + 5
                            : parseInt(siblingBirthYear);

                        let comparisonBirthYear = birthYear.toString().endsWith("s")
                            ? parseInt(birthYear.replace("s", "")) + 5
                            : parseInt(birthYear);

                        if (siblingBirthYear > comparisonBirthYear) {
                            newItemClone.insertBefore(siblings[i]);
                            inserted = true;
                            break;
                        }
                    }

                    if (!inserted) {
                        aParent.children("ul.personList").append(newItemClone);
                    }
                }
            });
        }

        addSpouses(person);
    }

    // Add child of class
    $(`li[data-id="${person.Id}"]`).each(function () {
        thisPerson = $(this);
        const parentSpouses = thisPerson.parent().closest("li").children("dl.spouse");
        parentSpouses.children("dd").each(function (index) {
            const thisSpouse = $(this);
            if ([thisPerson.data("father"), thisPerson.data("mother")].includes(thisSpouse.data("id"))) {
                thisPerson.addClass("childOfSpouse_" + index);
            }
        });
    });

    fillUpToGenerationSelect();
}

function findHighestGeneration() {
    let highestGeneration = 0;
    $("#descendants ul.personList").each(function () {
        let generation = parseInt($(this).attr("data-generation"));
        if (generation > highestGeneration) {
            highestGeneration = generation;
        }
    });
    return highestGeneration - 1;
}

function fillUpToGenerationSelect() {
    const highestGeneration = findHighestGeneration();
    // Fill up to generation select
    // If an option is in the box, don't add it again
    const generationSelect = $("#generationSelect");
    for (let i = 1; i <= highestGeneration; i++) {
        if (generationSelect.find(`option[value='${i}']`).length == 0) {
            generationSelect.append(`<option value='${i}'>Show up to Generation ${i}</option>`);
        }
    }
    // Remove any that are higher than the highest generation
    generationSelect.find("option").each(function () {
        if (parseInt($(this).val()) > highestGeneration) {
            $(this).remove();
        }
    });
}

async function getMoreDetails(wtid) {
    try {
        const result = await $.ajax({
            url: API_URL,
            type: "POST",
            crossDomain: true,
            xhrFields: {
                withCredentials: true,
            },
            dataType: "json",
            data: {
                action: "getRelatives",
                keys: wtid,
                getSpouses: 1,
                format: "json",
                fields: `${fields.join(",")},Bio,PhotoData,Photo`,
                bioFormat: "html",
            },
            success: function (data) {
                console.log(data);
            },
        });
        return result;
    } catch (error) {
        console.error(error);
    }
}

async function addBio(id) {
    const data = await getMoreDetails(id);
    if (!data) {
        return;
    }

    const person = data?.[0]?.["items"]?.[0]?.person;
    if (!person) {
        return;
    }

    // Find all instances of the person on the page
    const personElements = $('li[data-id="' + person.Id + '"]');

    personElements.each(function () {
        const currentPersonElement = $(this);

        // Ensure we don't add the biography multiple times to the same instance
        if (currentPersonElement.children(".biography").length) {
            return true; // Continue to the next iteration
        }

        const bioDiv = $("<div class='biography visible'></div>");
        currentPersonElement.children("ul.personList").before(bioDiv);
        bioDiv.append($(person.bioHTML)).addClass("biography");

        let aPhoto = "";
        if (person.PhotoData?.url) {
            aPhoto = '<img class="profilePicture" src="https://www.wikitree.com' + person.PhotoData.url + '">';
        }
        bioDiv.prepend(aPhoto);

        // Rest of the code
        let sections = [];
        count = 1;
        if (bioDiv.find("section").length == 0) {
            let aSection = $("<section></section>");
            bioDiv.children().each(function (index, element) {
                if (element.tagName == "H2") {
                    if (
                        $(element).children(
                            ".mw-headline:contains(Biography),.mw-headline:contains(Research),.mw-headline:contains(Sources),.mw-headline:contains(Acknowledg)"
                        ).length ||
                        $(element).text() == "Contents"
                    ) {
                        if (aSection.children().length) {
                            addClassToSection(aSection);
                            sections.push(aSection);
                            aSection = $("<section></section>");
                        }
                    }
                }
                aSection.append(element);
            });
            addClassToSection(aSection);
            sections.push(aSection);
            bioDiv.append(sections);
            bioDiv.find("a:link").each(function () {
                if ($(this).attr("href").match("http") == null) {
                    if ($(this).parent().hasClass("reference")) {
                        $(this).attr(
                            "href",
                            $(this)
                                .attr("href")
                                .replace("#", "#_" + person.Id + "_")
                        );
                        $(this)
                            .parent()
                            .prop("id", "_" + person.Id + "_" + $(this).parent().prop("id"));
                        $(this).on("click", function (e) {
                            e.preventDefault();
                            const element = document.querySelector($(this).attr("href"));
                            element.scrollIntoView({ behavior: "smooth" });
                        });
                    } else if ($(this).attr("href").match("#_ref")) {
                        $(this).attr(
                            "href",
                            $(this)
                                .attr("href")
                                .replace("#", "#_" + person.Id + "_")
                        );
                        $(this)
                            .parent()
                            .prop("id", "_" + person.Id + "_" + $(this).parent().prop("id"));
                        $(this).on("click", function (e) {
                            e.preventDefault();
                            const element = document.querySelector($(this).attr("href"));
                            element.scrollIntoView({ behavior: "smooth" });
                        });
                    } else {
                        $(this).attr("href", "https://www.wikitree.com" + $(this).attr("href"));
                    }
                }
                $(this).attr("target", "_blank");
            });
            bioDiv.find("img").each(function () {
                if (
                    $(this).attr("src").match("https://www.") == null &&
                    $(this).closest(".bdDatesLocations").length == 0
                ) {
                    $(this).attr("src", "https://www.wikitree.com" + $(this).attr("src"));
                }
            });
            bioDiv.find("a[name]").remove();
        }

        bioDiv.find("div.status").addClass("hidden");
        bioDiv.find("p:contains( is empty. What can you add?)").remove();
        bioDiv
            .find(
                "i:contains(This is a retired sticker),i:contains(This profile is a collaborative work-in-progress. Can you contribute information or sources)"
            )
            .remove();
        bioDiv.find("div.SMALL").each(function () {
            if ($(this).parent().css("width") == "250px") {
                $(this).parent().addClass("sticker");
                $("#toggleStickers").removeClass("hidden");
            }
        });
        bioDiv.find("a[href$='gif'].external.free").each(function () {
            if (
                $(this)
                    .text()
                    .match(/^http.*gif$/) &&
                !$(this).hasClass("hidden")
            ) {
                let gif = $("<img src='" + $(this).text() + "' class='gif'>");
                $(this).after(gif);
                $(this).addClass("hidden");
            }
        });
        bioDiv.find(".aSources h2").on("click", function () {
            $(this).attr("title", "Click to show/hide sources");
            $(this).siblings().toggleClass("hidden");
        });
        //bioDiv.show();
    });
    $("#showBiosLabel").css("visibility", "visible");
}

function addClassToSection(aSection) {
    if (aSection.find("h2").eq(0).text() == "Contents") {
        aSection.addClass("aContents");
    } else if (aSection.find(".mw-headline:contains(Biography)").length) {
        aSection.addClass("aBiography");
        $("#toggleBioText").show();
    } else if (aSection.find(".mw-headline:contains(Research)").length) {
        aSection.addClass("aResearchNotes");
        $("#toggleResearchNotes").show();
    } else if (aSection.find(".mw-headline:contains(Sources)").length) {
        aSection.addClass("aSources");
    } else if (aSection.find(".mw-headline:contains(Acknowledg)").length) {
        aSection.addClass("aAcknowledgements");
        $("#toggleAcknowledgements").show();
    }
    $("#showBios").show();
}

function addSpouses(mPerson) {
    if (!mPerson.Spouses) return; // If no spouses, exit early

    const spouseKeys = Object.keys(mPerson.Spouses);
    if (!spouseKeys.length) return; // If no spouse keys, exit early

    // Find all instances of the person on the page
    const personElements = $("li[data-id='" + mPerson.Id + "']");

    personElements.each(function () {
        const personElement = $(this);
        let bdDatesTable = personElement.find("dl.bdDatesLocations.spouse");

        if (bdDatesTable.length === 0) {
            personElement
                .children(".birthDeathDetails")
                .after($(`<dl class="bdDatesLocations spouse" data-id="${mPerson.Id}"></dl>`));
            bdDatesTable = personElement.find("dl.bdDatesLocations.spouse");
        }

        const spousesInfo = spouseKeys.map(function (aKey, index) {
            const aSpouse = mPerson.Spouses[aKey];
            aSpouse.FullName = new PersonName(aSpouse).withParts(["FullName"]);
            aSpouse.Dates = displayDates(aSpouse);

            const marriageDate = convertDate(aSpouse.marriage_date, window.descendantsSettings.dateFormat, "") || "";
            const marriageLocation = aSpouse.marriage_location;
            let marriageDate8 = aSpouse.marriage_date ? aSpouse.marriage_date.replaceAll(/\-/g, "") : "";
            // let spouseNum = spouseKeys.length > 1 ? "spouse_" + index : "";
            const title = "Married " + marriageDate + (marriageLocation ? " in " + marriageLocation : "");
            const marriageLocationSpan = marriageLocation
                ? `<span class="marriageLocation">in ${marriageLocation}</span>`
                : "";

            return {
                date: marriageDate8,
                info: $(
                    `<dt class='marriageDate birthDeathDate' title="${title}" data-marriage-location="${marriageLocation}" data-marriage-date='${marriageDate8}'>${marriageDate}</dt>
                    <dd data-dates="${aSpouse.Dates}"  data-fullname="${aSpouse.FullName}" data-id='${
                        aSpouse.Id
                    }' data-name='${aSpouse.Name}'>m. <a class="spouseProfileLink" data-gender='${
                        aSpouse.Gender
                    }' href="https://www.wikitree.com/wiki/${htmlEntities(aSpouse.Name).replaceAll(
                        /\s/g,
                        "_"
                    )}">${aSpouse.FullName.trim()}</a> <span class="spouseDates">${
                        aSpouse.Dates
                    }</span> ${marriageLocationSpan} <a class='switch' title='Switch to ${
                        aSpouse.FirstName
                    }' data-name="${aSpouse.Name}">↔️</a></dd>`
                ),
            };
        });

        // Sort by date
        spousesInfo.sort((a, b) => parseInt(a.date) - parseInt(b.date));

        // Append to bdDatesTable and assign classes
        spousesInfo.forEach((spouse, index) => {
            // Assign class "spouse_0", "spouse_1", etc.
            spouse.info.filter("dt").addClass(`spouse_${index}`);
            bdDatesTable.append(spouse.info);
        });
    });
}

function htmlEntities(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function displayDates(fPerson) {
    var birthDateStatus = dateStatus(fPerson["BirthDate"], fPerson["BirthDateDecade"], "BirthDate");
    var deathDateStatus = dateStatus(fPerson["DeathDate"], fPerson["DeathDateDecade"], "DeathDate");

    var birthDate = "";
    var deathDate = "";

    if (birthDateStatus == "unknown") {
        birthDate = "";
    } else if (birthDateStatus == "living") {
        birthDate = "living";
    } else {
        birthDate = birthDateStatus;
    }

    if (deathDateStatus == "unknown") {
        deathDate = "";
    } else if (deathDateStatus == "living") {
        deathDate = "living";
    } else {
        deathDate = deathDateStatus;
    }

    var dates = "(" + birthDate + " - " + deathDate + ")";

    return dates;
}

function dateStatus(date, decade, type) {
    var dateStatus;

    if (date != "" && date != "0000-00-00" && typeof date != "undefined" && date != "unknown") {
        dateStatus = date.split("-")[0];
    } else if (typeof decade != "undefined" && decade != "unknown") {
        dateStatus = decade;
    } else {
        dateStatus = "unknown";
    }

    return dateStatus;
}

function padNumberStart(number) {
    // Add leading zeros to a single-digit number
    return (number < 10 ? "0" : "") + number.toString();
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
        index = shortNames.indexOf(monthString.toLowerCase());
        if (index == -1) {
            index = longNames.indexOf(monthString.toLowerCase());
        }
        return index + 1;
    }
}

function capitalizeFirstLetter(string) {
    return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
}

/**
 * Converts a date string from various formats to the specified output format.
 *
 * @param {string} dateString - The date string to be converted. Supported formats include year-only (e.g. "2023"), short month and year (e.g. "Jul 2023"), long month and year (e.g. "July 2023"), long month, day, and year (e.g. "July 23, 2023"), and more.
 * @param {string} outputFormat - The desired output format. Supported values include: "Y", "MY", "MDY", "DMY", "sMDY", "DsMY", "YMD", and "ISO".
 * @param {string} [status=""] - An optional status that provides context to the date (e.g. "before", "after", "guess", "certain", etc.).
 *
 * @returns {string|null} The converted date string in the specified output format or null if there's an error or invalid format.
 *
 * @throws Will log an error if there's an issue during the conversion process.
 */
function convertDate(dateString, outputFormat, status = "") {
    // Split the input date string into components
    if (!dateString) {
        return "";
    }
    dateString = dateString.replaceAll(/-00/g, "");
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
            month = convertMonth(components[0]) || "";
            day = parseInt(components[1]);
        } else if (inputFormat == "DMY") {
            year = parseInt(components[2]);
            month = convertMonth(components[1]) || "";
            day = parseInt(components[0]);
        } else if (inputFormat == "ISO") {
            year = parseInt(components[0]);
            month = parseInt(components[1]) || "";
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
        outputDate = day + " " + convertMonth(month).slice(0, 3) + " " + year.toString();
    } else if (outputFormat == "YMD" || outputFormat == "ISO") {
        outputDate = ISOdate;
    } else {
        // Invalid output format
        return null;
    }

    if (!outputDate || outputDate == "0") {
        return null;
    }

    if (status) {
        let onlyYears = false;
        if (outputFormat == "Y") {
            onlyYears = true;
        }
        let statusOut = "";
        try {
            statusOut = dataStatusWord(status, ISOdate, { needInOn: false, onlyYears: onlyYears });
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

    function processDate(outputDate) {
        return outputDate.includes(",") && !/\b\d{1,2}\b/.test(outputDate) ? outputDate.replace(",", "") : outputDate;
    }

    outputDate = outputDate.replace(/\s?\b-?00?\b/, ""); // Remove 00 or 0 as a day or month
    outputDate = processDate(outputDate);

    return outputDate;
}

function dataStatusWord(status, ISOdate) {
    const day = ISOdate.slice(8, 10);

    let statusOut = "";
    switch (status) {
        case "before":
            statusOut = "before";
            break;
        case "after":
            statusOut = "after";
            break;
        case "guess":
            statusOut = "about";
            break;
        case "certain":
        case "on":
        case undefined:
        case "":
            statusOut = day !== "00" ? "" : ""; // If you want a default value when status is "certain", "on", undefined, or "", you can set it here.
            break;
    }

    const statusFormat = window.descendantsSettings.dateDataStatusFormat || "abbreviations";

    if (statusFormat === "abbreviations") {
        statusOut = statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.");
    } else if (statusFormat === "symbols") {
        statusOut = statusOut.replace("before", "<").replace("after", ">").replace("about", "~");
    }

    return statusOut;
}

// Recursively process li and descendants
let rows = [];
let visited = new Set();

// This function processes a person's information in a list item (li), and their descendants
function processLi(li, generation = 0, visited = new Set()) {
    // If this person has already been processed, return
    if (visited.has(li)) return;

    visited.add(li);

    // Get data for this person
    try {
        let personData = extractPersonData(li);
        personData.generation = generation;
        li.dataset.generation = generation;

        // Add row for this person
        rows.push(personData);

        // Process children
        processChildren(li, generation, visited);
    } catch (error) {
        console.error(`Failed to process person: ${error}`);
    }
}

// This function extracts a person's information from a list item (li)
function extractPersonData(li) {
    const id = li.getAttribute("data-id");
    const wtid = li.getAttribute("data-name");
    const aboville = li.dataset.aboville;
    const name = li.querySelector("a.profileLink")?.textContent;
    let birthDate = formatBirthOrDeathDate(li.querySelector("span.birthDate")?.textContent);
    let deathDate = formatBirthOrDeathDate(li.querySelector("span.deathDate")?.textContent);
    const birthPlace = li.querySelector("span.birthPlace")?.textContent.trim();
    const deathPlace = li.querySelector("span.deathPlace")?.textContent.trim();
    let spouseDLs = li.querySelectorAll(":scope > dl.spouse");
    const spouseText = extractSpouseData(spouseDLs);

    return { id, wtid, aboville, name, birthDate, deathDate, birthPlace, deathPlace, spouseText };
}

// This function formats a birth or death date
function formatBirthOrDeathDate(date) {
    return date?.match(/^\d{4}-\d{2}$/) ? date + "-00" : date;
}

// This function extracts a person's spouse information from a list item (li)
function extractSpouseData(spouses) {
    if (spouses.length > 0) {
        let spouseText = ``;
        spouses?.forEach((spouse) => {
            let name = spouse.querySelector("dd")?.dataset.fullname;
            let wtid = spouse.querySelector("dd")?.dataset.name;
            let dates = spouse.querySelector("dd")?.dataset.dates;
            let marriageDate = spouse.querySelector("dt.marriageDate")?.textContent.trim() || "";
            spouseText += `${name} (${wtid}) ${dates}` + (marriageDate ? `, (m. ${marriageDate})` : ``) + `; `;
        });
        return spouseText;
    } else {
        return "";
    }
}

// This function processes the children of a person
function processChildren(li, generation, visited) {
    const children = li.querySelector("ul.personList");
    if (children) {
        generation++; // Increment generation
        const childLis = children.querySelectorAll("li.person");
        childLis.forEach((childLi) => {
            processLi(childLi, generation, visited);
        });
    }
}

function descendantsExcelOut() {
    rows = [];
    visited = new Set();
    // Initial call on root li
    const rootLi = document.querySelector("li#primaryPerson");
    processLi(rootLi, 0);

    function makeFilename() {
        return makeSheetname() + "_" + new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19);
    }

    function makeSheetname() {
        const person_id = $("#wt-id-text").val();
        let sheetName = `Descendants_of_${person_id}`;
        return sheetName;
    }

    const sheetName = makeSheetname();

    const wb = XLSX.utils.book_new();
    wb.Props = {
        Title: sheetName,
        Subject: sheetName,
        Author: "WikiTree",
        CreatedDate: new Date(),
    };
    wb.SheetNames.push(sheetName);
    const ws_data = [];
    // id, wtid, name, birthDate, deathDate, birthPlace, deathPlace, spouseText
    const headings = ["Aboville", "ID", "Name", "Birth Date", "Birth Place", "Death Date", "Death Place", "Spouses"];
    ws_data.push(headings, []);
    rows.forEach((row) => {
        let data = [
            row.aboville,
            row.wtid,
            row.name,
            row.birthDate,
            row.birthPlace,
            row.deathDate,
            row.deathPlace,
            row.spouseText,
        ];
        ws_data.push(data);
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
        { wch: 8 },
        { wch: 20 },
        { wch: 30 },
        { wch: 20 },
        { wch: 60 },
        { wch: 20 },
        { wch: 60 },
        { wch: 70 },
    ];

    ws["!cols"] = wscols;

    var wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });
    saveAs(new Blob([s2ab(wbout)], { type: "application/octet-stream" }), makeFilename() + ".xlsx");
}

function toggleVisibility(styleId, cssSelector, toggleClassId) {
    const style = document.createElement("style");
    if ($("#" + styleId).length == 0) {
        style.id = styleId;
        document.head.appendChild(style);
    }
    if ($("#" + toggleClassId).prop("checked") == false || $("#" + toggleClassId).hasClass("on") == false) {
        style.innerHTML = `
    #descendants li.person${cssSelector} {
        display: none;
    }
    `;

        $("#" + toggleClassId).addClass("on");
    } else {
        $("#" + styleId).remove();
        $("#" + toggleClassId).removeClass("on");
    }
}

function collapseThis(e) {
    // console.log(e);
    $(e.target).parent().toggleClass("collapsed");
}

function toggleDateVisibility() {
    const isShowPlacesChecked = $("#showPlaces").is(":checked");
    const isShowDatesChecked = $("#showDates").is(":checked");
    const toggleElement = $("#toggleDateVisibility");
    let rules;

    let bdDatesLocationsRule = "";
    if (!isShowDatesChecked) {
        bdDatesLocationsRule = `
            #descendants dl.bdDatesLocations.spouse {
             display:block; 
            }`;
    }

    if (isShowPlacesChecked) {
        let birthDeathDetailsStyle = "grid-template-columns: 17em 1fr 17em 1fr; display: grid;";
        let hideDates = ``;

        // If #showPlaces is checked but #showDates isn't, change the CSS
        if (!isShowDatesChecked) {
            birthDeathDetailsStyle = "grid-template-columns: 1fr 1fr; display: grid;";
            hideDates = `#descendants li.person span.birthDate,
            #descendants li.person span.deathDate{
                display:none;
            }
            #descendants .birthPlace:not(:empty, .datesOnly .birthDate)::before {
                content: "b. ";
            }
            #descendants .deathPlace:not(:empty, .datesOnly .deathDate)::before {
                content: "d. ";
            }
            `;
        }

        rules = `
        #descendants li.person span.datesOnly {
            display: none;
        }
        #descendants li.person span.birthDeathDetails {
            ${birthDeathDetailsStyle}
        }
        ${bdDatesLocationsRule}
        ${hideDates}
    `;

        // If #showPlaces is checked, hide 'datesOnly' and show 'birthDeathDetails'
        if ($("#toggleDateVisibilityStyle").length === 0) {
            const style = document.createElement("style");
            style.id = "toggleDateVisibilityStyle";
            style.innerHTML = rules;
            document.head.appendChild(style);
        } else {
            $("#toggleDateVisibilityStyle").html(rules);
        }
        toggleElement.addClass("on");
    } else {
        // If #showPlaces is not checked, hide 'birthDeathDetails' and show 'datesOnly'

        rules = `
        #descendants li.person span.birthDeathDetails, 
        #descendants li.person span.marriageLocation {
            display: none;
        }
        #descendants li.person span.datesOnly {
            display: inline;
        }
        ${bdDatesLocationsRule}
    `;

        if ($("#toggleDateVisibilityStyle").length === 0) {
            const style = document.createElement("style");
            style.id = "toggleDateVisibilityStyle";
            style.innerHTML = rules;
            document.head.appendChild(style);
        } else {
            $("#toggleDateVisibilityStyle").html(rules);
        }

        toggleElement.removeClass("on");
    }
}

function updateShowBiosState() {
    // setTimeout(function () {
    const $biographies = $(".biography");
    const visibleCount = $biographies.filter(".visible").length;

    // logging
    console.log("visibleCount: " + visibleCount);
    console.log("$biographies.length: " + $biographies.length);

    const $mainCheckbox = $("#showBios");

    if (visibleCount === 0) {
        if ($mainCheckbox.prop("checked")) {
            $mainCheckbox.addClass("half-checked");
        } else {
            $mainCheckbox.removeClass("half-checked");
        }
    } else if (visibleCount === $biographies.length) {
        if (!$mainCheckbox.prop("checked")) {
            $mainCheckbox.addClass("half-checked");
        } else {
            $mainCheckbox.removeClass("half-checked");
        }
    } else {
        // $mainCheckbox.prop("checked", false);
        $mainCheckbox.addClass("half-checked");
    }
    //}, 500);
}
