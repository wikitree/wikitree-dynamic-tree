/*
 * TimelineTree
 *
 * This is a wikitree tree app, intended to display a hybrid family tree / timeline, showing thefamily relationships
 * between indivduals, but also showing when each person was alive.
 *
 * It constructs the visualiation using SVG, and is based on an earlier standalone version that displayed data stored
 * in a JSON file extracted from RootMagic.
 *
 * ==================================
 * Ackowledgements:
 * Much of the structure of the app has been generated from the "Ancestor Lines Explorer" app. Thanks are due
 * to the developers of that app!
 *
 *
 * Suggestion for further development are welcome.
 * David Lowe (davidblowe@gmail.com)
 *
 */

//===================================================================================
// Key parameters and data

let ttreeShowGens = 2;
let selector;

const ttreeDebug = true;
const apiBatchSize = 1000;

const ptsPerYear = 5;
const gridGap = 25;
const headerHeight = 40;
const rowHeight = 16;
const maxRows = 2000;
let setOffsetF = 50; // Positions each persons bar Set this far before the Family Use date (to leave room for name)
const setOffsetB = 150; // Positions each persons bar Set this far before the Family Use date (to leave room for name)

let ttreePeople; // List of people downloaded
//   Each will be: "type" (primary, ancestor, descendent, sibling, halfSibling, stepParent)
let ttreeFamilies; // List of families geerated from the people data
let ttreeShow; // Ordered list of people to show

let currentYear, yearEarliest, yearLatest;
let ttreeOrigin;
let ttreeCurrentFocusPerson;

let dispTextWidthShort;
let dispTextWidthLong;
let dispTextWidth;
let dispYearsWidth;
let dispTextHeight;

const barColourM0 = "#2222FF",
    barColourM1 = "#8888FF",
    barColourM2 = "#CCCCFF";
const barColourF0 = "#FF2222",
    barColourF1 = "#FF8888",
    barColourF2 = "#FFCCCC";
const barColourX0 = "#222222",
    barColourX1 = "#888888",
    barColourX2 = "#CCCCCC";

let hdrSizesShort = [35, 165, 160];
const hdrLabsShort = ["Gen", "Name", "Birth/Death"];
let hdrSizesLong = [35, 215, 160, 290];
const hdrLabsLong = ["Gen", "Full Name", "Birth/Death", "Birth location"];
let hdrNameLenS, hdrNameLenL, hdrNameLenB;

const ttreeHelpText = `
    <xx>[ x ]</xx>
    <h2 style="text-align: center">About TimelineTree</h2>
    <p>Use this application to view a tree view of the ancestors of a specific individual, but formatted along a timeline.</p>
    <p><em><b>Please note</b>: This is a work in progress</b></em></p>
    <h3>Display and Interaction</h3>
    <img src="./views/timelineTree/help-annot.png"/><br/>
    <ul>
        <li>Click on a persons name to show their wikitree page in a new tab
        <li>Click on a primary ancestors bar (shown in darker colours): (a) if parents are already shown then that branch will contract; (b) if that branch is not shown, then it will appear (and load from the server if needed)</li>
        <li>Shift-clicking the bar will replace the current tree by one based on the selected person.
        <li> If you want to show the entire tree up to a specified generation, then change the "Show generations" value and click "Go" again.
    </ul>
    <h3>Feedback</h3>
    <p>If you have any suggestions for improvements, or find bugs that need fixing, please email: davidblowe@gmail.com</p>
    `;

//===================================================================================
// Main view constructor

window.TimelineTreeView = class TimelineTreeView extends View {
    static #DESCRIPTION = "Shows a tree structure in a timeline format.";
    meta() {
        return {
            title: "Timeline Tree",
            description: TimelineTreeView.#DESCRIPTION,
        };
    }

    async init(container_selector, person_id) {
        selector = container_selector;
        ttreeOrigin = person_id;

        const controlBlock = `
            <div id="controlBlock" class="ttree-not-printable" style="position:sticky; top:1;">
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <button id="ttreeHelp" class="btn btn-secondary btn-sm" title="About this application."><b>?</b></button>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <label>Core info:&nbsp;</label>
                <select id="paramData" title="Level of data">
                  <option value="None">None</option>
                  <option value="Short" selected>Short</option>
                  <option value="Full">Full</option>
                </select>
                &nbsp;&nbsp;&nbsp;
                <label>Include siblings:&nbsp;</label><input type="checkbox" id="paramSibs" checked>&nbsp;&nbsp;&nbsp;&nbsp;
                <label>Flip timeline:&nbsp;</label><input type="checkbox" id="paramFlip">&nbsp;&nbsp;&nbsp;&nbsp;
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <label>Show generations: </label>
                <select id="paramLoad" title="Number of generations">
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>
            </div>`;

        wtViewRegistry.setInfoPanel(controlBlock);
        wtViewRegistry.showInfoPanel();

        const elem = document.getElementById("paramLoad");
        elem.value = ttreeShowGens;
        // Load and display the tree
        const status = await loadTree();

        // Add click action to help button
        $("#ttreeHelp")
            .off("click")
            .on("click", function () {
                if (window.ttreeShowingInfo) {
                    wtViewRegistry.hideInfoPanel();
                    window.ttreeShowingInfo = false;
                }
                $("#help-text").slideToggle();
            });
        $("#help-text").draggable();
        $("#help-text")
            .off("dblclick")
            .on("dblclick", function () {
                $(this).slideToggle();
            });
        $("#help-text xx")
            .off("click")
            .on("click", function () {
                $(this).parent().slideUp();
            });
        $(document).off("keyup", closePopup).on("keyup", closePopup);

        if (!status) return status;

        // And set up the event handlers
        $("#paramLoad").off("change").on("change", updateLoadGens);
        $("#paramData").off("change").on("change", updateDisplay);
        $("#paramFlip").off("change").on("change", updateDisplay);
        $("#paramSibs").off("change").on("change", showHideSibs);
    }

    close() {
        // remove event listeners
        $("#paramLoad").off();
        $("#paramData").off();
        $("#paramFlip").off();
        $("#paramSibs").off();

        // delete all data so it can be garbage collected
        ttreePeople = null;
        ttreeFamilies = null;
    }
};

//===================================================================================
// Detect the ESC key and close help...

function closePopup(e) {
    if (e.key === "Escape") {
        // Find the popup with the highest z-index
        let highestZIndex = 0;
        let lastPopup = null;
        $("#help-text:visible").each(function () {
            const zIndex = parseInt($(this).css("z-index"), 10);
            if (zIndex > highestZIndex) {
                highestZIndex = zIndex;
                lastPopup = $(this);
            }
        });

        // Close the popup with the highest z-index
        if (lastPopup) {
            // AncestorLinesExplorer.nextZLevel = highestZIndex;
            lastPopup.slideUp();
        }
    }
}

//===================================================================================
// Load and display the tree

function updateLoadGens(event) {
    ttreeShowGens = $("#paramLoad").val();
}

//===================================================================================
// Load and display the tree

async function loadTree(event) {
    // How many gens to show
    ttreeShowGens = $("#paramLoad").val();

    // build the tree and the display components
    ttreePeople = [];
    const status = await generateTree();
    if (!status) return status;

    // Initialise current focus person
    let focusPersonIdx = ttreePeople.findIndex((item) => item.Id == ttreeOrigin);
    let focusPerson = ttreePeople[focusPersonIdx];
    ttreeCurrentFocusPerson = focusPersonIdx;

    // Select just the core family for initial display
    // Start with key person, and iterate through parents for ttreeShowGens generation
    console.log(`Tree has been built - now to select core family for display`);
    for (let i = 0; i < ttreePeople.length; i++) ttreePeople[i].Visible = false;
    makeVisible(focusPerson.Id, 0);

    function makeVisible(personId, gen) {
        // Stop if gone too deep or not in people list
        if (gen > ttreeShowGens) return;
        if (ttreePeople.findIndex((item) => item.Id == personId) < 0) return;
        // Make this person visible
        let person = ttreePeople.find((item) => item.Id == personId);
        person.Visible = true;
        // then activate parents
        let family = ttreeFamilies[person.ChildIn];
        for (let i = 0; i < family.Parents.length; i++) makeVisible(family.Parents[i].ID, gen + 1);
        // then activate their spouses (but not for original person)
        if (personId == ttreeOrigin) return;
        for (const famIdx of person.ParentIn) {
            for (let i = 0; i < ttreeFamilies[famIdx].Parents.length; i++) {
                if (ttreeFamilies[famIdx].Parents[i].Idx < 0) continue;
                if (ttreePeople[ttreeFamilies[famIdx].Parents[i].Idx].Birth.Use == 0) continue;
                ttreePeople[ttreeFamilies[famIdx].Parents[i].Idx].Visible = true;
            }
        }
    }

    // Make core persons spouses and children visible
    for (const famIdx of focusPerson.ParentIn) {
        for (let i = 0; i < ttreeFamilies[famIdx].Parents.length; i++) {
            if (ttreeFamilies[famIdx].Parents[i].Idx < 0) continue;
            ttreePeople[ttreeFamilies[famIdx].Parents[i].Idx].Visible = true;
        }
        for (let i = 0; i < ttreeFamilies[famIdx].Children.length; i++) {
            if (ttreeFamilies[famIdx].Children[i].Idx < 0) continue;
            ttreePeople[ttreeFamilies[famIdx].Children[i].Idx].Visible = true;
        }
    }

    // And finally update the whole display
    updateSibs(event);
    updateDisplay(event);

    // Show the results
    if (ttreeDebug) console.log(ttreePeople);
    if (ttreeDebug) console.log(ttreeFamilies);
    if (ttreeDebug) console.log(ttreeShow);

    return true;
}

//===================================================================================
// Update display of tree to include/exclude a person's family

async function updateDisplayPerson(event) {
    let personIdx = event.target.parentElement.id.substring(11);
    let person = ttreePeople[personIdx];

    // Was this a "shift-click"?
    if (event.shiftKey) {
        // Open a new page!
        window.open(`./#name=${person.IdName}&view=timelineTree`, `_self`);
        return;
    }

    const elemSpinner = document.getElementById("spinner");
    elemSpinner.style.display = "block";

    // Check if there are parents, and if so then are they active (note: only need to check one parent?
    // If either parent is active, then should be contracting not expanding
    let family = ttreeFamilies[person.ChildIn];
    let expanding = true;
    if (family.Parents == 0) expanding = false;
    else if (family.Parents[0].Idx >= 0 && ttreePeople[family.Parents[0].Idx].Visible) expanding = false;
    else if (family.Parents[1].Idx >= 0 && ttreePeople[family.Parents[1].Idx].Visible) expanding = false;

    console.log(`Changing person ${personIdx}: expanding=${expanding}`);

    // If expanding, load parents, then make them (and all spouses) visible.
    if (expanding) {
        // Load the parents of the specified person
        const allPeopleFields = [
            "Id",
            "PageId",
            "Name",
            "FirstName",
            "MiddleName",
            "LastNameAtBirth",
            "LastNameCurrent",
            "BirthDate",
            "DeathDate",
            "BirthDateDecade",
            "DeathDateDecade",
            "BirthLocation",
            "DeathLocation",
            "Gender",
            "IsLiving",
            "Father",
            "Mother",
            "Spouses",
            "Privacy",
        ];
        const allPeopleOptions = { nuclear: 1 };
        const allPeopleResult = await WikiTreeAPI.getPeople(
            "TimelineTree",
            person.Id,
            allPeopleFields,
            allPeopleOptions
        );
        console.log(allPeopleResult);
        for (const person of Object.values(allPeopleResult[2])) {
            addPerson(person);
        }

        // Then update the data for people...
        updatePeople();
        buildDisplayElems();

        // And finally update the Visible status for the expanded people..
        person.Visible = true;
        // then activate parents
        let family = ttreeFamilies[person.ChildIn];
        for (let i = 0; i < family.Parents.length; i++) {
            if (family.Parents[i].Idx >= 0) ttreePeople[family.Parents[i].Idx].Visible = true;
        }
        // then activate their spouses (but not for original person)
        if (person.Id != ttreeOrigin) {
            // Check each family that this person is a "ParentIn" - and make the other parent visible
            for (const famIdx of person.ParentIn) {
                for (let i = 0; i < ttreeFamilies[famIdx].Parents.length; i++) {
                    if (ttreeFamilies[famIdx].Parents[i].Idx < 0) continue;
                    ttreePeople[ttreeFamilies[famIdx].Parents[i].Idx].Visible = true;
                }
            }
        }
    }

    // If not expanding, turn off this person, and all ancestors and their spouses
    else {
        // Hide each parent
        for (let j = 0; j < family.Parents.length; j++) {
            if (family.Parents[j].Idx < 0) continue;
            hidePerson(family.Parents[j].Idx);
        }
    }

    // Remove highlighting of the current selected person
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight");
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight");
    ttreeCurrentFocusPerson = personIdx;

    // Then update the display
    updateSibs(event);
    updateDisplay(event);

    elemSpinner.style.display = "none";

    function hidePerson(row) {
        const person = ttreePeople[row];
        if (person == null) return;

        //Hide person
        person.Visible = false;

        // Hide each spouse
        for (const famIdx of person.ParentIn) {
            const family = ttreeFamilies[famIdx];
            for (let i = 0; i < family.Parents.length; i++) {
                const parentIdx = family.Parents[i].Idx;
                if (parentIdx >= 0) ttreePeople[parentIdx].Visible = false;
            }
        }

        // Hide each parent
        const family = ttreeFamilies[person.ChildIn];
        for (let j = 0; j < family.Parents.length; j++) {
            if (family.Parents[j].Idx < 0) continue;
            hidePerson(family.Parents[j].Idx);
        }
    }
}

//===================================================================================
// Determine which siblings need to be displayed

function showHideSibs(event) {
    updateSibs(event);
    updateDisplay(event);
}

function updateSibs(event) {
    const sibTypes = ["sibling", "halfSibling"];
    const paramSibs = $("#paramSibs").prop("checked");

    // Turn on/off siblings
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];

        // Check if they are a sibling?
        if (sibTypes.includes(person.Type)) {
            // Turn off any sibling if setting is off
            if (!paramSibs) {
                ttreePeople[i].Visible = false;
                continue;
            }

            // Then show if any parent is active with a gen>0
            let disp = false;
            const family = ttreeFamilies[person.ChildIn];
            for (let j = 0; j < family.Parents.length; j++) {
                if (family.Parents[j].Idx < 0 || ttreePeople[family.Parents[j].Idx].Generation < 0) continue;
                if (ttreePeople[family.Parents[j].Idx].Visible) disp = true;
            }
            ttreePeople[i].Visible = disp;
        }
    }
}

//===================================================================================
// Update display of tree

function updateDisplay(event) {
    // First step, rescale display based on displayed people.
    rescaleDisplay();

    // =============================================================================
    // Then determine the ordering of the active people!
    ttreeShow = [];
    let primaryPersonIdx = ttreePeople.findIndex((item) => item.Id == ttreeOrigin);
    addToDisplayList(primaryPersonIdx);

    function addToDisplayList(personIdx) {
        if (personIdx < 0) return;
        if (ttreePeople[personIdx].Visible == false) return;

        let family = ttreeFamilies[ttreePeople[personIdx].ChildIn];

        const fatherIdx = family.Parents.length > 0 ? family.Parents[0].Idx : -1;
        const motherIdx = family.Parents.length > 0 ? family.Parents[1].Idx : -1;

        // Add fathers family
        addToDisplayList(fatherIdx);

        // Add mothers spouses
        if (motherIdx >= 0) {
            const mother = ttreePeople[motherIdx];
            for (const familyIdx of mother.ParentIn) {
                let spouseIdx = ttreeFamilies[familyIdx].Parents[0].Idx;
                if (spouseIdx < 0) continue;
                if (ttreePeople[spouseIdx].Type != "stepParent") continue;
                if (ttreePeople[spouseIdx].Visible && !ttreeShow.includes(spouseIdx) && spouseIdx != fatherIdx) {
                    ttreeShow.push(spouseIdx);
                }
            }
        }

        let siblings = [];
        // Identify self + visible siblings (Idx, Birth)
        siblings.push({ Idx: personIdx, Birth: ttreePeople[personIdx].Birth.Use });
        if (fatherIdx >= 0) {
            const father = ttreePeople[fatherIdx];
            for (const familyIdx of father.ParentIn) {
                for (let i = 0; i < ttreeFamilies[familyIdx].Children.length; i++) {
                    const childIdx = ttreeFamilies[familyIdx].Children[i].Idx;
                    siblings.push({ Idx: childIdx, Birth: ttreePeople[childIdx].Birth.Use });
                }
            }
        }
        if (motherIdx >= 0) {
            const mother = ttreePeople[motherIdx];
            for (const familyIdx of mother.ParentIn) {
                for (let i = 0; i < ttreeFamilies[familyIdx].Children.length; i++) {
                    const childIdx = ttreeFamilies[familyIdx].Children[i].Idx;
                    siblings.push({ Idx: childIdx, Birth: ttreePeople[childIdx].Birth.Use });
                }
            }
        }
        // Remove duplicates
        siblings = siblings.filter((o, index, arr) => index === arr.findIndex((item) => item.Idx === o.Idx));
        // Then sort by Birth
        siblings.sort((sib1, sib2) => sib1.Birth - sib2.Birth);
        // Then add each visible sibling to a Row.
        for (let i = 0; i < siblings.length; i++) {
            if (ttreePeople[siblings[i].Idx].Visible && !ttreeShow.includes(siblings[i].Idx)) {
                ttreeShow.push(siblings[i].Idx);
            }
        }

        // Add fathers spouses
        if (fatherIdx >= 0) {
            const father = ttreePeople[fatherIdx];
            for (const familyIdx of father.ParentIn) {
                let spouseIdx = ttreeFamilies[familyIdx].Parents[1].Idx;
                if (spouseIdx < 0) continue;
                if (ttreePeople[spouseIdx].Type != "stepParent") continue;
                if (ttreePeople[spouseIdx].Visible && !ttreeShow.includes(spouseIdx) && spouseIdx != motherIdx) {
                    ttreeShow.push(spouseIdx);
                }
            }
        }

        // Add mothers family
        addToDisplayList(motherIdx);
    }

    // Add core persons spouses and children
    let corePersonIdx = ttreePeople.findIndex((item) => item.Id == ttreeOrigin);
    const corePersonRow = ttreeShow.indexOf(corePersonIdx);
    const spliceInc = ttreePeople[corePersonIdx].Gender == "Male" ? 1 : 0;
    let spliceLoc = corePersonRow + spliceInc;
    let children = [];
    for (const famIdx of ttreePeople[corePersonIdx].ParentIn) {
        for (let i = 0; i < ttreeFamilies[famIdx].Children.length; i++) {
            if (ttreeFamilies[famIdx].Children[i].Idx < 0) continue;
            if (ttreePeople[ttreeFamilies[famIdx].Children[i].Idx].Visible) {
                children.push(ttreeFamilies[famIdx].Children[i].Idx);
            }
        }
    }
    children.sort((sib1, sib2) => ttreePeople[sib1].Birth.Use - ttreePeople[sib2].Birth.Use);
    ttreeShow.splice(spliceLoc, 0, ...children);
    spliceLoc += spliceInc * children.length;

    for (const famIdx of ttreePeople[corePersonIdx].ParentIn) {
        for (let i = 0; i < ttreeFamilies[famIdx].Parents.length; i++) {
            if (ttreeFamilies[famIdx].Parents[i].Idx < 0) continue;
            if (ttreeFamilies[famIdx].Parents[i].Idx == corePersonIdx) continue;
            if (ttreePeople[ttreeFamilies[famIdx].Parents[i].Idx].Visible) {
                ttreeShow.splice(spliceLoc, 0, ttreeFamilies[famIdx].Parents[i].Idx);
                spliceLoc += spliceInc;
            }
        }
    }

    // For each person: show/hide and adjust location of their details
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];

        const show = person.Visible ? "show" : "hidden";
        let elem;

        // Show text info
        const row = ttreeShow.indexOf(i);
        let y = row * rowHeight + 14;
        elem = document.getElementById(`personTextS-${i}`);
        elem.setAttribute("visibility", show);
        elem.setAttribute("y", y);
        elem = document.getElementById(`personTextL-${i}`);
        elem.setAttribute("visibility", show);
        elem.setAttribute("y", y);
        // Show bars
        elem = document.getElementById(`personSetF-${i}`);
        elem.setAttribute("visibility", show);
        elem.setAttribute("y", y);
        elem = document.getElementById(`personSetB-${i}`);
        elem.setAttribute("visibility", show);
        elem.setAttribute("y", y);
    }

    // Show family lines
    for (let i = 0; i < ttreeFamilies.length; i++) {
        let elem;
        const family = ttreeFamilies[i];

        // Need to show the line if either parent is active
        let disp = false;
        for (let j = 0; j < family.Parents.length; j++) {
            if (family.Parents[j].Idx < 0) continue;
            if (ttreePeople[family.Parents[j].Idx].Visible) disp = true;
        }
        const show = disp ? "show" : "hidden";
        elem = document.getElementById(`familyLinesF-${i}`);
        elem.setAttribute("visibility", show);
        elem = document.getElementById(`familyLinesB-${i}`);
        elem.setAttribute("visibility", show);

        // And then need to adjust line position based on each parent and each child
        let topRow = null,
            btmRow = null;
        for (let j = 0; j < family.Parents.length; j++) {
            if (family.Parents[j].Idx < 0) continue;
            const parent = ttreePeople[family.Parents[j].Idx];
            if (!parent.Visible) continue;
            const row = ttreeShow.indexOf(family.Parents[j].Idx);
            if (topRow == null || row < topRow) topRow = row;
            if (btmRow == null || row > btmRow) btmRow = row;
        }
        for (let j = 0; j < family.Children.length; j++) {
            if (family.Children[j].Idx < 0) continue;
            const child = ttreePeople[family.Children[j].Idx];
            if (!child.Visible) continue;
            const row = ttreeShow.indexOf(family.Children[j].Idx);
            if (topRow == null || row < topRow) topRow = row;
            if (btmRow == null || row > btmRow) btmRow = row;
        }
        const y1 = topRow * rowHeight + 23;
        const y2 = btmRow * rowHeight + 23;
        elem = document.getElementById(`familyLinesF-${i}`);
        elem.setAttribute("y1", y1);
        elem.setAttribute("y2", y2);
        elem = document.getElementById(`familyLinesB-${i}`);
        elem.setAttribute("y1", y1);
        elem.setAttribute("y2", y2);
    }

    // Retrieve dispay parameters
    const paramData = $("#paramData").val();
    const paramFlip = $("#paramFlip").prop("checked");

    // Get display elements that can be displayed
    const elemAll = document.getElementById("ttreeContainer");
    const elemH = document.getElementById("ttreeHeader");
    const elemM = document.getElementById("ttreeMain");

    const elemHTL = document.getElementById("hdrTextLong");
    const elemHTS = document.getElementById("hdrTextShort");
    const elemHYF = document.getElementById("hdrYearsFwd");
    const elemHYB = document.getElementById("hdrYearsBwd");
    const elemMTL = document.getElementById("mainTextLong");
    const elemMTS = document.getElementById("mainTextShort");
    const elemMBF = document.getElementById("mainBarFwd");
    const elemMBB = document.getElementById("mainBarBwd");
    const elemFlinesF = document.getElementById("mainFamLinesFwd");
    const elemFlinesB = document.getElementById("mainFamLinesBwd");

    // --------------------------------------------
    // Show relevant header text + people text
    if (paramData == "Short") {
        elemHTL.setAttribute("display", "none");
        elemMTL.setAttribute("display", "none");
        elemHTS.setAttribute("display", "1");
        elemMTS.setAttribute("display", "1");
        dispTextWidth = dispTextWidthShort;
    } else if (paramData == "Full") {
        elemHTL.setAttribute("display", "1");
        elemMTL.setAttribute("display", "1");
        elemHTS.setAttribute("display", "none");
        elemMTS.setAttribute("display", "none");
        dispTextWidth = dispTextWidthLong;
    } else {
        elemHTL.setAttribute("display", "None");
        elemMTL.setAttribute("display", "None");
        elemHTS.setAttribute("display", "none");
        elemMTS.setAttribute("display", "none");
        dispTextWidth = 0;
    }

    // --------------------------------------------
    // Show relevant blocks
    if (paramFlip == false) {
        // Show Forward
        elemHYF.setAttribute("display", "1");
        elemMBF.setAttribute("display", "1");
        elemFlinesF.setAttribute("display", "1");
        elemHYB.setAttribute("display", "none");
        elemMBB.setAttribute("display", "none");
        elemFlinesB.setAttribute("display", "none");
        elemHYF.setAttribute("x", dispTextWidth);
        elemMBF.setAttribute("x", dispTextWidth);
        elemFlinesF.setAttribute("x", dispTextWidth);
    } else {
        // Show Backward
        elemHYF.setAttribute("display", "none");
        elemMBF.setAttribute("display", "none");
        elemFlinesF.setAttribute("display", "none");
        elemHYB.setAttribute("display", "1");
        elemMBB.setAttribute("display", "1");
        elemFlinesB.setAttribute("display", "1");
        elemHYB.setAttribute("x", dispTextWidth);
        elemMBB.setAttribute("x", dispTextWidth);
        elemFlinesB.setAttribute("x", dispTextWidth);
    }

    // --------------------------------------------
    // Adjust overall size
    const totalWidth = Number(dispTextWidth + dispYearsWidth);
    const totalHeight = ttreeShow.length * 16 + 40;
    elemAll.setAttribute("width", totalWidth);
    elemH.setAttribute("width", totalWidth);
    elemM.setAttribute("width", totalWidth);
    elemM.style.height = `${totalHeight}px`;

    // And add event handlers for clicking on a bar
    const clickableTypes = ["primary", "ancestor", "descendent"];
    for (let i = 0; i < ttreePeople.length; i++) {
        if (clickableTypes.includes(ttreePeople[i].Type)) {
            $(`#personBarF-${i}`).off("click").on("click", updateDisplayPerson);
            $(`#personBarF-${i} > rect`).addClass("barHover");
            $(`#personBarB-${i}`).off("click").on("click", updateDisplayPerson);
            $(`#personBarB-${i} > rect`).addClass("barHover");
        }
    }

    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight");
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight");
}

//===========================================================================================
// Change the horizontal positioning of all elements

function rescaleDisplay() {
    let blocks, elem;

    // Determine earliest and latest year for display
    yearEarliest = currentYear;
    yearLatest = 0;
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (!person.Visible) continue;
        if (person.Birth.Use < yearEarliest) yearEarliest = Number(person.Birth.Use);
        if (person.Birth.Use > yearLatest) yearLatest = Number(person.Birth.Use);
        if (person.Death.Use < yearEarliest) yearEarliest = Number(person.Death.Use);
        if (person.Death.Use > yearLatest) yearLatest = Number(person.Death.Use);
    }
    if (yearEarliest > yearLatest) yearEarliest = yearLatest;
    yearEarliest = yearEarliest - setOffsetF;
    yearLatest = yearLatest + 40;
    // Then move to nearest 25 year boundary
    yearEarliest -= yearEarliest % 25;
    yearLatest -= yearLatest % 25;
    dispYearsWidth = (yearLatest - yearEarliest) * ptsPerYear;
    console.log(`Updated year range: ${yearEarliest}-${yearLatest}`);

    // Then update the x coords for each persons bar
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const xSetF = (ttreeFamilies[person.ChildIn].Status.Use - setOffsetF - yearEarliest) * ptsPerYear;
        const xSetB = (yearLatest - (ttreeFamilies[person.ChildIn].Status.Use + setOffsetB)) * ptsPerYear;
        elem = document.getElementById(`personSetF-${i}`);
        elem.setAttribute("x", xSetF);
        elem = document.getElementById(`personSetB-${i}`);
        elem.setAttribute("x", xSetB);
    }

    // Then update the x coords for each family line
    for (let i = 0; i < ttreeFamilies.length; i++) {
        const family = ttreeFamilies[i];
        const xF = (family.Status.Use - yearEarliest) * ptsPerYear;
        const xB = (yearLatest - family.Status.Use) * ptsPerYear;
        elem = document.getElementById(`familyLinesF-${i}`);
        elem.setAttribute("x1", xF);
        elem.setAttribute("x2", xF);
        elem = document.getElementById(`familyLinesB-${i}`);
        elem.setAttribute("x1", xB);
        elem.setAttribute("x2", xB);
    }

    // ---------------------------------------------
    // Build the Header Years and the Main grid lines

    // Header - Forward version (earliest year left)
    blocks = `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
    blocks += `<text x="5" y="13" class="headerText1">Timeline</text>`;
    let hdrYearGrid = yearEarliest + 25;
    while (hdrYearGrid < yearLatest) {
        blocks += `<text x="${
            (hdrYearGrid - yearEarliest) * ptsPerYear - 15
        }" y="33" class="headerText2">${hdrYearGrid}</text>`;
        hdrYearGrid += gridGap;
    }
    document.getElementById("hdrYearsFwd").innerHTML += blocks;

    // Header - Reverse version (latest year left)
    blocks = `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
    blocks += `<text x="5" y="13" class="headerText1">Timeline</text>`;
    hdrYearGrid = yearLatest - 25;
    while (hdrYearGrid > yearEarliest) {
        blocks += `<text x="${
            (yearLatest - hdrYearGrid) * ptsPerYear - 15
        }" y="33" class="headerText2">${hdrYearGrid}</text>`;
        hdrYearGrid -= gridGap;
    }
    document.getElementById("hdrYearsBwd").innerHTML += blocks;

    // Gridlines - Forward version (earliest year left)
    blocks = "";
    let mainYearGrid = yearEarliest + 25;
    while (mainYearGrid < yearLatest) {
        if (mainYearGrid % 100 == 0)
            blocks += `<line x1="${(mainYearGrid - yearEarliest) * ptsPerYear}" y1="0" x2="${
                (mainYearGrid - yearEarliest) * ptsPerYear
            }" y2="${maxRows * rowHeight}" class="gridLine2"/>`;
        else
            blocks += `<line x1="${(mainYearGrid - yearEarliest) * ptsPerYear}" y1="0" x2="${
                (mainYearGrid - yearEarliest) * ptsPerYear
            }" y2="${maxRows * rowHeight}" class="gridLine3"/>`;
        mainYearGrid += gridGap;
    }
    blocks += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    document.getElementById("mainGridlinesFwd").innerHTML += blocks;

    // Gridlines - Reverse version (latest year left)
    blocks = "";
    mainYearGrid = yearLatest - 25;
    while (mainYearGrid > yearEarliest) {
        if (mainYearGrid % 100 == 0)
            blocks += `<line x1="${(yearLatest - mainYearGrid) * ptsPerYear}" y1="0" x2="${
                (yearLatest - mainYearGrid) * ptsPerYear
            }" y2="${maxRows * rowHeight}" class="gridLine2"/>`;
        else
            blocks += `<line x1="${(yearLatest - mainYearGrid) * ptsPerYear}" y1="0" x2="${
                (yearLatest - mainYearGrid) * ptsPerYear
            }" y2="${maxRows * rowHeight}" class="gridLine3"/>`;
        mainYearGrid -= gridGap;
    }
    blocks += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    document.getElementById("mainGridlinesBwd").innerHTML += blocks;
}

//===================================================================================
// Build the whole tree (extra and order data, and then build the display components)

async function generateTree() {
    const now = new Date();
    currentYear = now.getFullYear();
    // Set an initial provisional positioning
    yearEarliest = 0;
    yearLatest = currentYear;

    // ---------------------------------------------
    // Provide initial message to user

    $(selector).html(`
        <div id="ttreeContainer" class="ttree-printable">
            <svg id="ttreeHeader" y="0" width="2000">
                <rect x="0" y="0" width="800" height="80" class="headerRow"/>
                <text x="10" y="20" font-size="20">Please be patient ... building tree</text>
                <text id="hdrMsg" x="10" y="40" font-size="16">Building new tree for person with ID=${ttreeOrigin}</text>
            </svg>
            <svg id="ttreeMain" y="100" width="2000"></svg>
        </div>
        <div id="spinner"><img src="./views/timelineTree/spinner.gif"/></div>
        <div id="help-text">${ttreeHelpText}</div>`);
    $(ttreeHeader).parents().css("overflow", "visible");
    console.log(`Building new tree for person with ID=${ttreeOrigin}`);

    const elemSpinner = document.getElementById("spinner");
    elemSpinner.style.display = "block";

    let paramFlip = false;

    // ---------------------------------------------
    // Load and format data

    const starttime = performance.now();

    // Load people from wikitree
    let [valid, status] = await loadPeople();
    if (!valid) {
        document.getElementById("ttreeHeader").innerHTML =
            '<text x="10" y="20" font-size="20">Error: Could not retrive people</text>';
        elemSpinner.style.display = "none";
        return false;
    }

    // Then process everyone to update the details for each person and each family
    updatePeople();

    // Check is core person is usable
    let person = ttreePeople.find((item) => item.Id == ttreeOrigin);
    if ((person.Privacy == undefined || person.Privacy < 50) && person?.Birth.Use == 0) {
        document.getElementById("ttreeHeader").innerHTML =
            '<text x="10" y="20" font-size="20">Error: Core person is private. (Try logging in?)</text>';
        elemSpinner.style.display = "none";
        return false;
    }
    if (person.Birth.Use == 0) {
        document.getElementById("ttreeHeader").innerHTML =
            '<text x="10" y="20" font-size="20">Error: Cannot determine birth year for Core person.</text>';
        elemSpinner.style.display = "none";
        return false;
    }

    // The generate the display elems
    buildDisplayElems();

    // And finally, log the processing time
    const elapsedTime = performance.now() - starttime;
    console.log(`Retrieved ${ttreePeople.length} total people in tree`);
    console.log(`Total elapsed time : ${elapsedTime}ms.`);

    elemSpinner.style.display = "none";
    return true;
}

//===========================================================================================
// Build the display elements associated with each person and each family connection

function buildDisplayElems() {
    // ---------------------------------------------
    // Build DOM structure

    let blocksHeader = "";
    let blocksMain = "";

    document.getElementById("ttreeHeader").innerHTML = `
        <svg id="hdrTextShort"></svg>
        <svg id="hdrTextLong"></svg>
        <svg id="hdrYearsFwd"></svg>
        <svg id="hdrYearsBwd"></svg>
        <svg id="hdrTemp" visibility:"hidden"><text x="0" y="0" id="hdrTempTxt" class="gridText"></text></svg>`;

    document.getElementById("ttreeMain").innerHTML = `
        <defs id="svgdefs"></defs>
        <svg id="mainRows"></svg>
        <svg id="mainTextShort"></svg>
        <svg id="mainTextLong"></svg>
        <svg id="mainBarFwd">
            <svg id="mainGridlinesFwd"></svg>
        </svg>
        <svg id="mainBarBwd">
            <svg id="mainGridlinesBwd"></svg>
        </svg>
        <svg id="mainFamLinesFwd"></svg>
        <svg id="mainFamLinesBwd"></svg>`;

    // ---------------------------------------------
    // Determine the longest name (in length, not chars - so requires a temporary rendering!)
    hdrNameLenS = 0;
    hdrNameLenL = 0;
    hdrNameLenB = 0;
    const textElem = document.getElementById("hdrTempTxt");
    let textLength;
    for (let i = 0; i < ttreePeople.length; i++) {
        let person = ttreePeople[i];
        const sn = person.Name.LNAB == "Unknown" ? "?" : person.Name.LNAB;
        const mn = person.Name.Middle == "Unknown" ? "?" : person.Name.Middle;
        const gn = person.Name.First == "Unknown" ? "?" : person.Name.First;
        const by = person.Birth.Known ? person.Birth.Use : "?";
        const dy = person.Death.Known ? person.Death.Use : "?";

        textElem.innerHTML = `${gn} ${sn}`;
        textLength = textElem.getComputedTextLength();
        if (textLength > hdrNameLenS) hdrNameLenS = textLength;
        textElem.innerHTML = `${gn} ${mn} ${sn}`;
        textLength = textElem.getComputedTextLength();
        if (textLength > hdrNameLenL) hdrNameLenL = textLength;
        textElem.innerHTML = `${gn} ${sn} (${by}-${dy})`;
        textLength = textElem.getComputedTextLength();
        if (textLength > hdrNameLenB) hdrNameLenB = textLength;
    }
    textElem.innerHTML = " ";
    hdrNameLenS = Math.ceil((hdrNameLenS + 20) / 25) * 25;
    hdrSizesShort[1] = hdrNameLenS;
    hdrNameLenL = Math.ceil((hdrNameLenL + 20) / 25) * 25;
    hdrSizesLong[1] = hdrNameLenL;

    setOffsetF = 20 + Math.ceil(hdrNameLenB / ptsPerYear / 5) * 5;

    // ---------------------------------------------
    // Build the Header text

    // Short Header
    let loc = 0;
    let labels = "";
    for (let i = 0; i < hdrLabsShort.length; i++) {
        labels += `<text x="${+loc + 5}" y="13" class="headerText1">${hdrLabsShort[i]}</text>`;
        loc += hdrSizesShort[i];
    }
    dispTextWidthShort = loc;
    blocksHeader = `<rect x="0" y="0" width="${dispTextWidthShort}" height="${headerHeight}" class="headerRow"/>`;
    blocksHeader += labels;
    document.getElementById("hdrTextShort").innerHTML += blocksHeader;

    // Long Header
    loc = 0;
    labels = "";
    for (let i = 0; i < hdrLabsLong.length; i++) {
        labels += `<text x="${+loc + 5}" y="13" class="headerText1">${hdrLabsLong[i]}</text>`;
        loc += hdrSizesLong[i];
    }
    dispTextWidthLong = loc;
    blocksHeader = `<rect x="0" y="0" width="${dispTextWidthLong}" height="${headerHeight}" class="headerRow"/>`;
    blocksHeader += labels;
    document.getElementById("hdrTextLong").innerHTML += blocksHeader;

    // ---------------------------------------------
    // Build colored row backgrounds

    let alternate = 0;
    blocksMain = "";
    for (let i = 0; i < maxRows; i++) {
        let rowY, rowClass;
        alternate = (alternate + 1) % 2;
        // Add in row background
        if (alternate == 0) rowClass = "rowEven";
        else rowClass = "rowOdd";
        rowY = i * rowHeight + 15;
        blocksMain += `<rect x="0" y="${rowY}" width="10000" height="${rowHeight}" class="${rowClass}"/>`;
    }
    document.getElementById("mainRows").innerHTML += blocksMain;

    // ---------------------------------------------
    // Build People Timeline Bars (Fwd and Bwd version)

    // Add formatting info for the fade out on time timeline bars

    blocksMain = "";
    blocksMain += `<linearGradient id='gradM0R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourM0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM0L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourM0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM1R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourM1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM1L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourM1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM2R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourM2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM2L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourM2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF0R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourF0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF0L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourF0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF1R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourF1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF1L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourF1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF2R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourF2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF2L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourF2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX0R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourX0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX0L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourX0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX1R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourX1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX1L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourX1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX2R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourX2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX2L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourX2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX2};stop-opacity:1' /></linearGradient>`;
    document.getElementById("svgdefs").innerHTML += blocksMain;

    // Now create the bar for each person
    let blocksTextS = "";
    let blocksTextL = "";
    let blocksFwd = "";
    let blocksBwd = "";

    for (let personIdx = 0; personIdx < ttreePeople.length; personIdx++) {
        const person = ttreePeople[personIdx];
        const rowY = personIdx * rowHeight + 14;

        // Build People Text (short version)
        let loc = 0;
        blocksTextS += `<svg id="personTextS-${personIdx}" x="0" y="${rowY}" visibility:"hidden">`;
        blocksTextS += `<text x="${+loc + 5}" y="13" class="gridText">${
            person.Generation >= 0 ? person.Generation : "-"
        }</text>`;
        loc += hdrSizesShort[0];
        blocksTextS += `<text x="${+loc + 5}" y="13" class="gridText">${person.Name.First} ${person.Name.LNAB}</text>`;
        loc += hdrSizesShort[1];
        blocksTextS += `<text x="${+loc + 5}" y="13" class="gridText">${person.Birth.Date} - ${
            person.Death.Date
        }</text>`;
        blocksTextS += `</svg>`;

        // Build People Text (long version)
        loc = 0;
        blocksTextL += `<svg id="personTextL-${personIdx}" x="0" y="${rowY}" visibility:"hidden">`;
        blocksTextL += `<text x="${+loc + 5}" y="13" class="gridText">${
            person.Generation >= 0 ? person.Generation : "-"
        }</text>`;
        loc += hdrSizesLong[0];
        blocksTextL += `<text x="${+loc + 5}" y="13" class="gridText">${person.Name.First} ${person.Name.Middle} ${
            person.Name.LNAB
        }</text>`;
        loc += hdrSizesLong[1];
        blocksTextL += `<text x="${+loc + 5}" y="13" class="gridText">${person.Birth.Date} - ${
            person.Death.Date
        }</text>`;
        loc += hdrSizesLong[2];
        blocksTextL += `<text x="${+loc + 5}" y="13" class="gridText">${person.Birth.Location}</text>`;
        blocksTextL += `</svg>`;

        // Now create the bar
        const sn = person.Name.LNAB == "Unknown" ? "?" : person.Name.LNAB;
        const gn = person.Name.First == "Unknown" ? "?" : person.Name.First;
        const by = person.Birth.Known ? person.Birth.Use : "?";
        const dy = person.Death.Known ? person.Death.Use : "?";

        // Determine colour of the bar (based on person gender and type)
        let barColour, barDef;
        if (person.Type == "primary" || person.Type == "ancestor" || person.Type == "descendent") {
            switch (person.Gender) {
                case "Male":
                    barColour = barColourM0;
                    barDef = "#gradM0";
                    break;
                case "Female":
                    barColour = barColourF0;
                    barDef = "#gradF0";
                    break;
                default:
                    barColour = barColourX0;
                    barDef = "#gradX0";
            }
        } else if (person.Type == "sibling" || person.Type == "siblingStep") {
            switch (person.Gender) {
                case "Male":
                    barColour = barColourM1;
                    barDef = "#gradM1";
                    break;
                case "Female":
                    barColour = barColourF1;
                    barDef = "#gradF1";
                    break;
                default:
                    barColour = barColourX1;
                    barDef = "#gradX1";
            }
        } else {
            switch (person.Gender) {
                case "Male":
                    barColour = barColourM2;
                    barDef = "#gradM2";
                    break;
                case "Female":
                    barColour = barColourF2;
                    barDef = "#gradF2";
                    break;
                default:
                    barColour = barColourX2;
                    barDef = "#gradX2";
            }
        }

        // Create Forward Set (= name + family line + bar) when showing forward direction
        //    Note: Start the Set at year 'barOffset' before Family use date (updated each time the earliestYear is determined).
        //          Then all other components positioned within the Set.
        let setStart = ttreeFamilies[person.ChildIn].Status.Use - setOffsetF;
        let xSetInitial = (setStart - yearEarliest) * ptsPerYear;
        let xFamilyLine = setOffsetF * ptsPerYear;
        let xBarStart = (person.Birth.Use - setStart) * ptsPerYear;
        let xBarEnd = (person.Death.Use - setStart) * ptsPerYear;
        if (xBarEnd == xBarStart) xBarEnd += ptsPerYear;
        blocksFwd += `<svg id="personSetF-${personIdx}" x="${xSetInitial}" y="${rowY}" visibility:"hidden">`;

        blocksFwd += `<svg id="personBarF-${personIdx}" x="0" y="0"}>`;
        blocksFwd += `<rect x="${xBarStart}" y="4" width="${
            xBarEnd - xBarStart
        }" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person.Birth.Known)
            blocksFwd += `<rect x="${
                xBarStart - 50
            }" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        if (!person.Death.Known)
            blocksFwd += `<rect x="${xBarEnd}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        blocksFwd += `</svg>`;

        // Add terminating marker
        if (ttreeFamilies[person.ChildIn].Parents.length == 0) {
            // blocksFwd += `<polygon points="${xBarStart-5},7 ${xBarStart-2},4 ${xBarStart+2},4 ${xBarStart+5},7 ${xBarStart+5},11 ${xBarStart+2},14 ${xBarStart-2},14 ${xBarStart-5},11" class="barTerminate"/>`;
            blocksFwd += `<polyline points="${xBarStart},9 ${xBarStart - 5},9 ${xBarStart - 5},2 ${
                xBarStart - 5
            },16" class="barTerminate2"/>`;
        }
        // Add family line
        blocksFwd += `<line x1="${xFamilyLine}" y1="9" x2="${xBarStart + 2}" y2="9" class="familyLine"/>`;
        // Add marriage dots
        for (const famIdx of person.ParentIn) {
            const fData = ttreeFamilies[famIdx].Status;
            const xPF = (fData.Use - setStart) * ptsPerYear;
            const mdot = fData.Married ? (fData.Known ? "famDot1" : "famDot2") : "famDot3";
            blocksFwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        // Add names/dates
        blocksFwd += `<a href="http://wikitree.com/wiki/${person.IdName}" class="abar" target="_blank"><text x="${
            xFamilyLine - 20
        }" y="13" class="barTextF">${gn} ${sn} (${by}-${dy})</text></a>`;
        blocksFwd += `</svg>`;

        // Create Backward Set (= name + family line + bar) when showing backward direction
        //    Note: Start the Set 150 years after the Family use date (max age=120 + born 30 years after marriage)
        //          Then all other components positioned within the Set.
        setStart = ttreeFamilies[person.ChildIn].Status.Use + setOffsetB;
        xSetInitial = (yearLatest - setStart) * ptsPerYear;
        xFamilyLine = setOffsetB * ptsPerYear;
        xBarStart = (setStart - person.Birth.Use) * ptsPerYear;
        xBarEnd = (setStart - person.Death.Use) * ptsPerYear;
        if (xBarEnd == xBarStart) xBarEnd -= ptsPerYear;

        blocksBwd += `<svg id="personSetB-${personIdx}" x="${xSetInitial}" y="${rowY}" visibility:"hidden">`;

        blocksBwd += `<svg id="personBarB-${personIdx}" x="0" y="0"}>`;
        blocksBwd += `<rect x="${xBarEnd}" y="4" width="${
            xBarStart - xBarEnd
        }" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person.Birth.Known)
            blocksBwd += `<rect x="${xBarStart}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        if (!person.Death.Known)
            blocksBwd += `<rect x="${
                xBarEnd - 50
            }" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        blocksBwd += `</svg>`;

        // Add terminating marker
        if (ttreeFamilies[person.ChildIn].Parents.length == 0) {
            blocksBwd += `<polyline points="${xBarStart},9 ${xBarStart + 5},9 ${xBarStart + 5},2 ${
                xBarStart + 5
            },16" class="barTerminate2"/>`;
        }
        // Add family line
        blocksBwd += `<line x1="${xBarStart - 2}" y1="9" x2="${xFamilyLine}" y2="9" class="familyLine"/>`;
        // Add marriage dots
        for (const famIdx of person.ParentIn) {
            const fData = ttreeFamilies[famIdx].Status;
            const xPF = (setStart - fData.Use) * ptsPerYear;
            const mdot = fData.Married ? (fData.Known ? "famDot1" : "famDot2") : "famDot3";
            blocksBwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        // Add names/dates
        blocksBwd += `<a href="http://wikitree.com/wiki/${person.IdName}" class="abar" target="_blank"><text x="${
            xFamilyLine + 20
        }" y="13" class="barTextB">${gn} ${sn} (${by}-${dy})</text></a>`;
        blocksBwd += `</svg>`;
    }
    document.getElementById("mainTextShort").innerHTML += blocksTextS;
    document.getElementById("mainTextLong").innerHTML += blocksTextL;
    document.getElementById("mainBarFwd").innerHTML += blocksFwd;
    document.getElementById("mainBarBwd").innerHTML += blocksBwd;

    // And the family connecting lines
    blocksFwd = "";
    blocksBwd = "";
    for (let familyIdx = 0; familyIdx < ttreeFamilies.length; familyIdx++) {
        blocksFwd += `<line x1="0" y1="0" x2="0" y2="0" id="familyLinesF-${familyIdx}" class="familyLine"/>`;
        blocksBwd += `<line x1="0" y1="0" x2="0" y2="0" id="familyLinesB-${familyIdx}" class="familyLine"/>`;
    }
    document.getElementById("mainFamLinesFwd").innerHTML += blocksFwd;
    document.getElementById("mainFamLinesBwd").innerHTML += blocksBwd;
}

//===========================================================================================
// Load all people from wikiTree

async function loadPeople() {
    const hdrMsg = document.getElementById("hdrMsg");

    // Retrieve list of people
    console.log(`Retrieving direct ancestors (up to gen=${ttreeShowGens}) for person with ID=${ttreeOrigin}`);

    // Retrieve all people from WikiTree
    let apiGetMore = true;
    let apiStart = 0;
    let callNum = 1;
    let allPeopleResult;
    const allPeopleFields = [
        "Id",
        "PageId",
        "Name",
        "FirstName",
        "MiddleName",
        "LastNameAtBirth",
        "LastNameCurrent",
        "BirthDate",
        "DeathDate",
        "BirthDateDecade",
        "DeathDateDecade",
        "BirthLocation",
        "DeathLocation",
        "Gender",
        "IsLiving",
        "Father",
        "Mother",
        "Spouses",
        "Privacy",
    ];
    let allPeopleOptions = { ancestors: ttreeShowGens, nuclear: 1, limit: apiBatchSize, start: apiStart };
    while (apiGetMore) {
        allPeopleResult = await WikiTreeAPI.getPeople("TimelineTree", ttreeOrigin, allPeopleFields, allPeopleOptions);
        //  Check for errors
        if (allPeopleResult[0].startsWith("aborted")) {
            console.log(`Error: getPeople API call aborted`);
            return [false, allPeopleResult[0]];
        }
        const profiles = allPeopleResult[2] ? Object.values(allPeopleResult[2]) : [];
        if (profiles.length == 0) {
            return [false, "Empty"];
        }
        // Add results
        for (const person of Object.values(allPeopleResult[2])) addPerson(person);
        // And then check status
        apiGetMore = allPeopleResult[0].startsWith("Maximum number of profiles");
        callNum += 1;
        apiStart += apiBatchSize;
        allPeopleOptions.start = apiStart;
        hdrMsg.innerHTML = `Retrieval underway: ${apiStart} people retrieved `;
    }

    hdrMsg.innerHTML = `Retrieved ${ttreePeople.length} total people `;
    return [true, ""];
}

//===========================================================================================
// Add the specified person to the list of current people

function addPerson(person) {
    // Check if they already exist
    const personIdx = ttreePeople.findIndex((item) => item.Id == person.Id);
    if (personIdx >= 0) return;
    // Otherwise add them to the list of people
    let spouses = [];
    for (let spouse in person.Spouses)
        spouses.push({ Id: person.Spouses[spouse].Id, Date: person.Spouses[spouse].marriage_date });
    ttreePeople.push({
        Id: person.Id,
        IdName: person.Name,
        Name: { First: person.FirstName, Middle: person.MiddleName, LNAB: person.LastNameAtBirth },
        Birth: {
            Date: person.BirthDate,
            Decade: person.BirthDateDecade,
            Location: person.BirthLocation,
            Year: null,
            Known: null,
            Use: null,
        },
        Death: {
            Date: person.DeathDate,
            Decade: person.DeathDateDecade,
            Location: person.DeathLocation,
            Year: null,
            Known: null,
            IsLiving: person.IsLiving,
            Use: null,
        },
        Parents: { Father: person.Father, Mother: person.Mother },
        Spouses: spouses,
        ChildIn: -1,
        ParentIn: new Set([]),
        Gender: person.Gender,
        Generation: null,
        Type: null,
        Visible: null,
        Privacy: person.Privacy,
    });
}

//===========================================================================================
// Process the current list of people to update details for each person and each family

function updatePeople() {
    ttreeFamilies = [];

    // Step 0: Clear previous info on family links
    for (let i = 0; i < ttreePeople.length; i++) {
        ttreePeople[i].ChildIn = -1;
        ttreePeople[i].ParentIn = new Set([]);
    }

    // Step 1a: For each person: determine their "type" (primary, ancestor, descendent, sibling, halfSibling, stepParent)
    setAncestor(ttreeOrigin);
    function setAncestor(ancID) {
        let idx = ttreePeople.findIndex((item) => item.Id == ancID);
        if (idx < 0) return;
        ttreePeople[idx].Type = "ancestor";
        setAncestor(ttreePeople[idx].Parents.Father);
        setAncestor(ttreePeople[idx].Parents.Mother);
    }
    let primaryPerson = ttreePeople.find((item) => item.Id == ttreeOrigin);
    primaryPerson.Type = "primary";
    for (let i = 0; i < ttreePeople.length; i++) {
        let person = ttreePeople[i];
        let father = ttreePeople.find((item) => item.Id == person.Parents.Father);
        let mother = ttreePeople.find((item) => item.Id == person.Parents.Mother);
        let fatherType = father == undefined ? "null" : father.Type;
        let motherType = mother == undefined ? "null" : mother.Type;
        if (person.Type == "primary" || person.Type == "ancestor") {
        } else if (fatherType == "primary" || motherType == "primary") person.Type = "descendent";
        else if (fatherType == "ancestor" && motherType == "ancestor") person.Type = "sibling";
        else if (fatherType == "ancestor" || motherType == "ancestor") person.Type = "halfSibling";
        else {
            let pType = "null";
            for (let i = 0; i < person.Spouses.length; i++) {
                let spouse = ttreePeople.find((item) => item.Id == person.Spouses[i].Id);
                if (spouse != undefined && spouse.Type == "ancestor") pType = "stepParent";
            }
            person.Type = pType;
        }
    }

    // Step 1b: For each person: create ShortName, LongName, and extract core data data (Birth and Death info and parents)
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];

        person.Generation = -1;

        // Determine birthYear
        const by = Number(("" + person.Birth.Date).substring(0, 4));
        const bd = Number(("" + person.Birth.Decade).substring(0, 4));
        if (by > 0) {
            person.Birth.Year = by;
            person.Birth.Known = true;
        } else if (bd > 0) {
            person.Birth.Year = bd + 10;
            person.Birth.Known = false;
        } else {
            person.Birth.Year = null;
            person.Birth.Known = false;
        }

        // Determine deathYear
        const dy = Number(("" + person.Death.Date).substring(0, 4));
        const dd = Number(("" + person.Death.Decade).substring(0, 4));
        if (dy > 0) {
            person.Death.Year = dy;
            person.Death.Known = true;
        } else if (dd > 0) {
            person.Death.Year = dd;
            person.Death.Known = false;
        } else {
            person.Death.Year = null;
            person.Death.Known = false;
        }
    }

    // Step 2: For each person: create a family entry / add details to an existing family

    function isParent(parents, ID) {
        for (let i = 0; i < parents.length; i++) {
            if (parents[i].ID == ID) return true;
        }
        return false;
    }

    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        let familyIdx = -1;
        let family;
        // If this person has no/null parents then they should have their own "family"
        if (Number(person.Parents.Father) == 0 && Number(person.Parents.Mother) == 0) {
            family = {
                Parents: [],
                Children: [],
                Data: { EarliestBirth: person.Birth.Year, LatestBirth: person.Birth.Year },
                Status: { Married: false, Date: null, Known: false, Use: null },
                NewItem: true,
            };
            ttreeFamilies.push(family);
            familyIdx = ttreeFamilies.length - 1;
        } else {
            // Then search for an existing family
            for (let j = 0; j < ttreeFamilies.length; j++) {
                const parents = ttreeFamilies[j].Parents;
                if (isParent(parents, person.Parents.Father) && isParent(parents, person.Parents.Mother)) {
                    familyIdx = j;
                    break;
                }
            }
            // If no existing family then create a new one
            if (familyIdx == -1) {
                // Create a new family
                family = {
                    Parents: [
                        {
                            ID: person.Parents.Father,
                            Idx: ttreePeople.findIndex((item) => item.Id == person.Parents.Father),
                        },
                        {
                            ID: person.Parents.Mother,
                            Idx: ttreePeople.findIndex((item) => item.Id == person.Parents.Mother),
                        },
                    ],
                    Children: [],
                    Data: { EarliestBirth: person.Birth.Year, LatestBirth: person.Birth.Year },
                    Status: { Married: false, Date: null, Known: false, Use: null },
                    NewItem: true,
                };
                ttreeFamilies.push(family);
                familyIdx = ttreeFamilies.length - 1;
            }
            family = ttreeFamilies[familyIdx];
        }

        // Add this person as a child of the family
        const child = { ID: person.Id, Idx: i };
        family.Children.push(child);

        // Then update the family Data
        if (family.Data.EarliestBirth == null) family.Data.EarliestBirth = person.Birth.Year;
        else if ((person.Birth.Year != null) && (person.Birth.Year < family.Data.EarliestBirth)) family.Data.EarliestBirth = person.Birth.Year;
        if (family.Data.LatestBirth == null) family.Data.LatestBirth = person.Birth.Year;
        else if ((person.Birth.Year != null) && (person.Birth.Year > family.Data.LatestBirth)) family.Data.LatestBirth = person.Birth.Year;

        //Link person to family as a child
        person.ChildIn = familyIdx;

        // Link parents to family as parent
        const fatherIdx = ttreePeople.findIndex((item) => item.Id == person.Parents.Father);
        if (fatherIdx >= 0) ttreePeople[fatherIdx].ParentIn.add(familyIdx);
        const motherIdx = ttreePeople.findIndex((item) => item.Id == person.Parents.Mother);
        if (motherIdx >= 0) ttreePeople[motherIdx].ParentIn.add(familyIdx);
    }

    // Step 3: For each spouse of each person: create a family entry or add details to an existing family
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (person.Spouses.length == 0) continue; // no spouses
        for (let j = 0; j < person.Spouses.length; j++) {
            let spouseID = person.Spouses[j].Id;
            const spouseIdx = ttreePeople.findIndex((item) => item.Id == spouseID);
            if (spouseIdx < 0) continue;
            let familyIdx = -1;
            // Search for an existing family
            for (let k = 0; k < ttreeFamilies.length; k++) {
                const parents = ttreeFamilies[k].Parents;
                if (isParent(parents, person.Id) && isParent(parents, spouseID)) {
                    familyIdx = k;
                    break;
                }
            }

            // Does not exist, so create a family
            if (familyIdx < 0) {
                let parent1 = { ID: person.Id, Idx: ttreePeople.findIndex((item) => item.Id == person.Id) };
                let parent2 = { ID: spouseID, Idx: ttreePeople.findIndex((item) => item.Id == spouseID) };
                let parents = person.Gender == "Female" ? [parent2, parent1] : [parent1, parent2];
                const family = {
                    Parents: parents,
                    Children: [],
                    Data: { EarliestBirth: null, LatestBirth: null },
                    Status: { Married: true, Date: person.Spouses[j].Date, Known: false, Use: null },
                };
                ttreeFamilies.push(family);
                familyIdx = ttreeFamilies.length - 1;
                // Link couple to family as parent
                person.ParentIn.add(familyIdx);
                ttreePeople[spouseIdx].ParentIn.add(familyIdx);
            }
            // Otherwise update the existing family
            else {
                ttreeFamilies[familyIdx].Status.Married = true;
                ttreeFamilies[familyIdx].Status.Date = person.Spouses[j].Date;
            }
        }
    }

    // Step 4: For each family, update the "Use" year.

    for (let i = 0; i < ttreeFamilies.length; i++) {
        const family = ttreeFamilies[i];
        // Do we have an actual marriage date?
        if (family.Status.Date != null && Number(family.Status.Date.substring(0, 4)) > 0) {
            family.Status.Use = Number(family.Status.Date.substring(0, 4));
            family.Status.Known = true;
            continue;
        }
        // Need to check for the earlier of "EarliestBirth" and "Death" of either parent
        let possibleDate = null;
        if (family.Data.EarliestBirth > 0) possibleDate = family.Data.EarliestBirth;
        for (let j = 0; j > family.Parents.length; j++) {
            if (family.Parents[j].Idx >= 0 && ttreePeople[family.Parents[j].Idx].Death.Year > 0)
                if (possibleDate == null || ttreePeople[family.Parents[j].Idx].Death.Year < possibleDate)
                    possibleDate = ttreePeople[family.Parents[j].Idx].Death.Year;
        }
        if (possibleDate > 0) {
            family.Status.Use = possibleDate;
            continue;
        }

        // Else do we have a valid date for the birth of the first child?
        if (family.Data.EarliestBirth > 0) {
            family.Status.Use = Number(family.Data.EarliestBirth) - 1;
            continue;
        }

        // Else check for latest birth of a parent
        let latestParentBirth = 0;
        for (let j = 0; j > family.Parents.length; j++) {
            if (family.Parents[j].Idx >= 0 && ttreePeople[family.Parents[j].Idx].Birth.Year > 0)
                latestParentBirth = ttreePeople[family.Parents[j].Idx].Birth.Year;
        }
        if (latestParentBirth > 0) family.Status.Use = latestParentBirth + 20;
    }

    // Step 5a: For each person, update the Birth "Use" years.

    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const family = ttreeFamilies[person.ChildIn];

        // Does this person have a valid Birth date
        if (person.Birth.Year > 0) person.Birth.Use = person.Birth.Year;
        // Otherwise does their family have a valid use date?
        else if (family.Status.Use > 0) person.Birth.Use = family.Status.Use + 10;
        // Otherwise null
        else person.Birth.Use = 0;
    }

    // Step 5b: For each person, update the Death "Use" years.

    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const family = ttreeFamilies[person.ChildIn];

        // Does this person have a valid Death date
        if (person.Death.Year > 0) {
            person.Death.Use = person.Death.Year;
            continue;
        }
        // Else if living then use the current year
        if (person.Death.IsLiving) {
            person.Death.Use = currentYear;
            continue;
        }
        // Else use year of last marriage
        let lastMarriage = 0;
        for (const famIdx of person.ParentIn) {
            if (ttreeFamilies[famIdx].Status.Use > lastMarriage) lastMarriage = ttreeFamilies[famIdx].Status.Use;
        }
        if (lastMarriage > 0) {
            person.Death.Use = lastMarriage;
            continue;
        }

        // else use birth + 30
        if (person.Birth.Use > 0) person.Death.Use = person.Birth.Use + 30;
        else person.Death.Use = 0;
    }

    // Step 5C: Update any missing Birth Use dates based on children, and check parent family..

    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (person.Birth.Use > 0) continue;
        let firstChildBirth = currentYear;

        for (const familyIdx of person.ParentIn) {
            for (let j = 0; j < ttreeFamilies[familyIdx].Children.length; j++) {
                const childIdx = ttreeFamilies[familyIdx].Children[j].Idx;
                if (ttreePeople[childIdx].Birth.Use > 0 && ttreePeople[childIdx].Birth.Use < firstChildBirth)
                    firstChildBirth = ttreePeople[childIdx].Birth.Use;
            }
        }

        if (firstChildBirth < currentYear) person.Birth.Use = firstChildBirth - 30;
        // And finally, if still no birth date, just use 50 years prior to Death-USe
        if (person.Birth.Use == 0 && person.Death.Use > 0) person.Birth.Use = person.Death.Use - 50;

        const family = ttreeFamilies[person.ChildIn];
        if (person.Birth.Use > 0 && family.Status.Use <= 0) family.Status.Use = person.Birth.Use - 10;
    }

    // Step 6: For each person: determine their generation
    let gen = 1;
    setGen(
        ttreePeople.findIndex((item) => item.Id == ttreeOrigin),
        0
    );

    function setGen(personIdx, gen) {
        if (personIdx < 0) return;
        ttreePeople[personIdx].Generation = gen;
        let family = ttreeFamilies[ttreePeople[personIdx].ChildIn];
        for (let j = 0; j < family.Parents.length; j++) {
            setGen(family.Parents[j].Idx, gen + 1);
        }
    }

    // Step 7: And finally, update details for "private" people
    for (let i = 0; i < ttreePeople.length; i++) {
        const person = ttreePeople[i];

        if (Number(person.Privacy) < 50 && person.Name.First == undefined) person.Name.First = "(private)";
    }
}
