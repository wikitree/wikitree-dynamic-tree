/*
 * TimelineTree
 *
 * This is a wikitree tree app, intended to display a hybrid family tree / timeline, showing thefamily relationships
 * between indivduals, but also showing when each person was alive.
 * 
 * It constructs the visualiation using SVG, and is based on an earlier standalone version that displayed data stored
 * in a JSON file extracted from RootMagic.
 *
 * (Note: Much of the structure of the app has been generated from the "Ancestor Lines Explorer" app. Thanks are due
 * to the developers of that app!)
 * 
 * Suggestion for further development are welcome.
 * David Lowe (davidblowe@gmail.com)
 * 
 * ==================================
 * Working version 2:
 * 
 * Changing the underlying data model to allow for simpler display
 * Added ability to dynamically change the number of generations etc.
 * 
 */


//===================================================================================
// Key parameters and data

let ttreeStartGens = 3;
let selector;

const ttreeDebug = true;

const ptsPerYear = 5
const gridGap = 25;
const headerHeight = 40;
const rowHeight = 16;
const maxRows = 2000;
const setOffsetF = 50;    // Positions each persons bar Set this far before the Family Use date (to leave room for name)
const setOffsetB = 150;   // Positions each persons bar Set this far before the Family Use date (to leave room for name)

let ttreeAncestors;
let ttreePeople;
let ttreeFamilies;
let ttreeQueue;

let currentYear, yearEarliest, yearLatest;
let ttreePrimaryID;
let ttreeCurrentFocusPerson;

let dispTextWidthShort;
let dispTextWidthLong;
let dispTextWidth;
let dispYearsWidth;
let dispTextHeight;

const barColourM0="#2222FF", barColourM1="#8888FF", barColourM2="#CCCCFF";
const barColourF0="#FF2222", barColourF1="#FF8888", barColourF2="#FFCCCC";
const barColourX0="#222222", barColourX1="#888888", barColourX2="#CCCCCC";

const locsShort = [0, 35, 200, 360];
const labsShort = ["Gen", "Name", "Birth/Death", ""];
const locsLong  = [0, 35, 250, 410, 700];
const labsLong  = ["Gen", "Full Name", "Birth/Death", "Birth location", ""];

const ttreeHelpText = `
    <xx>[ x ]</xx>
    <h2 style="text-align: center">About TimelineTree</h2>
    <p>Use this application to view a tree view of the ancestors of a specific individual, but formatted along a timeline.</p>
    <p><em><b>Warning</b>: This is a work in progress</p>
    <h3>Display and Interaction</h3>
    <img src="/apps/lowe6667/views/timelineTree/help-annot.png"/><br/>
    <ul>
        <li>More info to be provided.</li>
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
            title: "Timeline Tree v3",
            description: TimelineTreeView.#DESCRIPTION,
        };
    }

    async init(container_selector, person_id) {

        selector = container_selector;
        ttreePrimaryID = person_id;

        const controlBlock = `
            <div id="controlBlock" class="ttree-not-printable" style="position:sticky; top:1;">
                <label>Core info:&nbsp;</label>
                <select id="paramData" title="Level of data">
                  <option value="None">None</option>
                  <option value="Short" selected>Short</option>
                  <option value="Full">Full</option>
                </select>
                &nbsp;&nbsp;&nbsp;
                <label>Include siblings:&nbsp;</label><input type="checkbox" id="paramSibs" checked>&nbsp;&nbsp;&nbsp;&nbsp;
                <label>Flip timeline:&nbsp;</label><input type="checkbox" id="paramFlip">&nbsp;&nbsp;&nbsp;&nbsp;
                <button id="ttreeHelp" class="btn btn-secondary btn-sm" title="About this application."><b>?</b></button>
            </div>`;

        wtViewRegistry.setInfoPanel(controlBlock);
        wtViewRegistry.showInfoPanel();

        // Load and display the tree
        await loadTree();

        // Add click action to help button
        $("#ttreeHelp").off("click").on("click", function () {
            if (window.ttreeShowingInfo) {
                wtViewRegistry.hideInfoPanel();
                window.ttreeShowingInfo = false;
            }
            $("#help-text").slideToggle();
        });
        $("#help-text").draggable();
        $("#help-text").off("dblclick").on("dblclick", function () {
                $(this).slideToggle();
            });
        $("#help-text xx").off("click").on("click", function () {
                $(this).parent().slideUp();
        });

        // And set up the event handlers
        $("#paramData").off('change').on('change', updateDisplay);
        $("#paramFlip").off('change').on('change', updateDisplay);
        $("#paramSibs").off('change').on('change', showHideSibs);        
    }


     close() {
        // remove event listeners
        $("#paramData").off();
        $("#paramFlip").off();
        $("#paramSibs").off();

        // delete all data so it can be garbage collected
        ttreePeople = null;
        ttreeFamilies = null;
     }
};



//===================================================================================
// Load and display the tree

async function loadTree (event) {
    ttreePeople = null;
    ttreeQueue = [];

    // build the tree and the display components
    ttreeStartGens = 3;
    await generateTree();

    // Initialise current focus person
    let focusPersonIdx = ttreePeople.findIndex(item => item["Id"] == ttreePrimaryID);
    let focusPerson = ttreePeople[focusPersonIdx];
    let focusFamily = ttreeFamilies[focusPerson["ChildIn"]];

    // Select just the core family for initial display
    console.log(`Tree has been built - now to display core family`);
    for (let i=0; i<ttreePeople.length; i++) {
        ttreePeople[i]["Visible"] = false;
    }
    focusPerson["Visible"] = true;
    for (let i=0; i<focusFamily["Parents"].length; i++) ttreePeople[focusFamily["Parents"][i]["Row"]]["Visible"] = true;
    for (let i=0; i<focusFamily["Children"].length; i++) ttreePeople[focusFamily["Children"][i]["Row"]]["Visible"] = true;
    updateSibs(event);

    // And finally update the whole display
    updateDisplay(event);

    // And then move the display to centre on the key person
    const row = ttreePeople.findIndex(item => item["Id"] == ttreePrimaryID);
    const elemX = document.getElementById(`personSetF-${row}`);
    elemX.scrollIntoView({behavior: "smooth", block: "center"});
}


//===================================================================================
// Update display of tree to include/exclude a person's family

async function updateDisplayPerson (event) {

    let personRow = event.target.parentElement.id.substring(11);

    // Update the highlighting of the current selected person
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight")
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight")
    ttreeCurrentFocusPerson = personRow;
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight")
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight")


    // Check if there are parents, and if so then are they active (note: only need to check one parent?
    // If either parent is active, then should be contracting not expanding
    let person = ttreePeople[personRow];
    let family = ttreeFamilies[person["ChildIn"]];
    let expanding = true;
    if (family["Parents"] == 0) expanding = false;
    else if ((family["Parents"][0]["Row"] >= 0) && (ttreePeople[family["Parents"][0]["Row"]]["Visible"])) expanding = false;
    else if ((family["Parents"][1]["Row"] >= 0) && (ttreePeople[family["Parents"][1]["Row"]]["Visible"])) expanding = false;

    if (ttreeDebug) console.log(`Changing person ${personRow}: expanding=${expanding}`);

    // If expanding, load parents, then them (and all spouses) visible.
    if (expanding) {
        for (let j=0; j<family["Parents"].length; j++) {
            let parentIdx = family["Parents"][j]["Row"];
            if (parentIdx >= 0) ttreeQueue.push(parentIdx);
        }
        await loadQueuedPeople();
        for (let j=0; j<family["Parents"].length; j++) {
            let parentIdx = family["Parents"][j]["Row"];
            if (parentIdx < 0) continue;

            let parent = ttreePeople[parentIdx];
            // Update the display of the parent
            parent["Visible"] = true;
            // then activate their spouses
            let spouses = parent["Details"]["Spouses"];
            for (const spouseID in spouses) {
                const spouse = ttreePeople.find(item => item["Id"] == spouseID);
                if (spouse != null ) spouse["Visible"] = true;
            }
        }
    }

    // If not expanding, turn off this person, and all ancestors and their spouses
    else {
        // Hide each parent
        for (let j=0; j<family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            hidePerson(family["Parents"][j]["Row"]);
        }
    } 

    // Then update the display
    updateSibs(event);
    updateDisplay(event);

    // And update the highlighting of the current selected person
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight")
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight")
    ttreeCurrentFocusPerson = personRow;
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight")
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight")
    

    function hidePerson (row) {
        const person = ttreePeople[row];
        if (person == null ) return;
        const family = ttreeFamilies[person["ChildIn"]];
        
        //Hide person
        person["Visible"] = false;

        // Hide spouses
        let spouses = person["Details"]["Spouses"];
        for (const spouseID in spouses) {
            const spouse = ttreePeople.find(item => item["Id"] == spouseID);
            if (spouse != null ) spouse["Visible"] = false;
        }

        // Hide each parent
        for (let j=0; j<family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            hidePerson(family["Parents"][j]["Row"]);
        }
    }


}

//===================================================================================
// Update display of tree

async function loadQueuedPeople () {

    let retrievalList = []
    // Loop through each person in the queue to determine who needs to be loaded.
    for (var i=0; i<ttreeQueue.length; i++) {
        // If both parents are missing, then add to list to retrieve
        let retrieve = true;
        let family = ttreeFamilies[ttreePeople[ttreeQueue[i]]["ChildIn"]];
        for (var j=0; j<family["Parents"].length; j++) if (family["Parents"][j]["Row"] >= 0) retrieve = false;
        if (retrieve) retrievalList.push(ttreePeople[ttreeQueue[i]]["Id"]);
    }
    ttreeQueue = [];
    if (retrievalList.length == 0) return;
    if (ttreeDebug) console.log(`Loading ${retrievalList.length} new people`);

    // For each person, load their family
    const relsFields=["Id","PageId","Name","FirstName","MiddleName","LastNameAtBirth","LastNameCurrent",
        "BirthDate","DeathDate","BirthDateDecade", "DeathDateDecade", "BirthLocation","DeathLocation","Gender","IsLiving","Father","Mother",
        "Parents", "Children","Spouses","Siblings", "Privacy"];
    const people_json = await WikiTreeAPI.getRelatives("TimelineTree", retrievalList, relsFields, {getChildren: 1, getSpouses: true, getSiblings: true, getParents: true});
    let newPeople = people_json ? Object.values(people_json) : [];

    // Then add each person (and their parents, siblings etc.)
    for (let i=0; i<newPeople.length; i++) {
        // For each person, extract the person and add them
        let person = newPeople[i];
        addPerson(person["person"], "ancestor", true);
        // Then add each parent, sibling, spouse, and child
        for (let parent in person["person"]["Parents"]) addPerson(person["person"]["Parents"][parent], "ancestor", false);
        for (let sibling in person["person"]["Siblings"]) addPerson(person["person"]["Siblings"][sibling], "sibling", false);
        for (let spouse in person["person"]["Spouses"]) {
            addPerson(person["person"]["Spouses"][spouse], "stepParent", false);
        }
        for (let child in person["person"]["Children"]) {
            addPerson(person["person"]["Children"][child], "halfSibling", false);
        }
    }

    // Then update the data for people...
    updatePeople();
    // Show the results
    if (ttreeDebug) console.log(ttreeAncestors);
    if (ttreeDebug) console.log(ttreePeople);
    if (ttreeDebug) console.log(ttreeFamilies);

    // The generate the display elems
    buildDisplayElems();
    // And finally update the whole display
    updateSibs();
    updateDisplay();


}

//===================================================================================
// Determine which siblings need to be displayed

function showHideSibs (event) {
    updateSibs(event);
    updateDisplay(event);
}

function updateSibs (event) {

    const sibTypes = ["sibling", "halfSibling"];
    const paramSibs = $("#paramSibs").prop("checked")

    // Turn on/off siblings
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];

        // Check if they are a sibling?
        if (sibTypes.includes(person["Type"])) {

            // Turn off any sibling if setting is off
            if (!paramSibs) {
                ttreePeople[i]["Visible"] = false;
                continue;
            }
            
            // Then show if any parent is active
            let disp = false;
            const family = ttreeFamilies[person["ChildIn"]];
            for (let j = 0; j < family["Parents"].length; j++) {
                if (family["Parents"][j]["Row"] < 0) continue;
                if (ttreePeople[family["Parents"][j]["Row"]]["Visible"]) disp = true;
            }
            ttreePeople[i]["Visible"] = disp;
        }                
    }
}   

//===================================================================================
// Update display of tree

function updateDisplay (event) {

    // First step, rescale dispay based on displayed people.
    rescaleDisplay();

    // =============================================================================
    // Then determine the ordering of the active people!
    let maxRow = 0;

    // First step is to remove everyone
    for (let i=0; i<ttreePeople.length; i++) ttreePeople[i]["ShowRow"] = -1;

    // Then determine the display row for each visible person
    let primaryPersonIdx = ttreePeople.findIndex(item => item["Id"] == ttreePrimaryID);
    addToDisplayList(primaryPersonIdx);

    function addToDisplayList(personIdx) {
        if (personIdx < 0) return;
        if (ttreePeople[personIdx]["Visible"] == false) return;

        let family = ttreeFamilies[ttreePeople[personIdx]["ChildIn"]];

        const fatherIdx = (family["Parents"].length > 0) ? family["Parents"][0]["Row"] : -1;
        const motherIdx = (family["Parents"].length > 0) ? family["Parents"][1]["Row"] : -1;

        // Add fathers family
        addToDisplayList(fatherIdx);

        // Add mothers spouses
        if (motherIdx >= 0) {
            const mother = ttreePeople[motherIdx];
            for (const familyIdx of mother["ParentIn"]) {
                let spouseRow = ttreeFamilies[familyIdx]["Parents"][0]["Row"];
                if (spouseRow < 0) continue;
                if (ttreePeople[spouseRow]["Visible"] && (ttreePeople[spouseRow]["ShowRow"] == -1) && (spouseRow != fatherIdx)) {
                    ttreePeople[spouseRow]["ShowRow"] = maxRow;
                    maxRow++;
                }
            }
        }

        let siblings = [];
        // Identify self + visible siblings (Idx, Birth)
        siblings.push({"Row":personIdx, "Birth": ttreePeople[personIdx]["Birth"]["Use"]});
        if (fatherIdx >= 0) {
            const father = ttreePeople[fatherIdx];
            for (const familyIdx of father["ParentIn"]) {
                for (let i=0; i<ttreeFamilies[familyIdx]["Children"].length; i++) {
                    const childIdx = ttreeFamilies[familyIdx]["Children"][i]["Row"];
                    siblings.push({"Row":childIdx, "Birth": ttreePeople[childIdx]["Birth"]["Use"]});
                }
            }
        }
        if (motherIdx >= 0) {
            const mother = ttreePeople[motherIdx];
            for (const familyIdx of mother["ParentIn"]) {
                for (let i=0; i<ttreeFamilies[familyIdx]["Children"].length; i++) {
                    const childIdx = ttreeFamilies[familyIdx]["Children"][i]["Row"];
                    siblings.push({"Row":childIdx, "Birth": ttreePeople[childIdx]["Birth"]["Use"]});
                }
            }
        }
        // Remove duplicates
        siblings = siblings.filter((o, index, arr) => index === arr.findIndex((item) => (item["Row"] === o["Row"])));
        // Then sort by Birth
        siblings.sort((sib1,sib2) => sib1["Birth"] - sib2["Birth"]);
        // The add each visible sibling to a Row.
        for (let i=0; i<siblings.length; i++) {
            if (ttreePeople[siblings[i]["Row"]]["Visible"] && (ttreePeople[siblings[i]["Row"]]["ShowRow"] == -1)) {
                ttreePeople[siblings[i]["Row"]]["ShowRow"] = maxRow;
                maxRow++;
            }
        }

        // Add fathers spouses
        if (fatherIdx >= 0) {
            const father = ttreePeople[fatherIdx];
            for (const familyIdx of father["ParentIn"]) {
                let spouseRow = ttreeFamilies[familyIdx]["Parents"][1]["Row"];
                if (spouseRow < 0) continue;
                if (ttreePeople[spouseRow]["Visible"] && (ttreePeople[spouseRow]["ShowRow"] == -1) && (spouseRow != motherIdx)) {
                    ttreePeople[spouseRow]["ShowRow"] = maxRow;
                    maxRow++;
                }
            }
        }

        // Add mothers family
        addToDisplayList(motherIdx);
    }

    // For each person: show/hide and adjust location of their details
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];

        const show = person["Visible"] ? 'show' : 'hidden';
        let elem;

        // Show text info
        let y = (person["ShowRow"] * rowHeight) + 14;
        elem = document.getElementById(`personTextS-${i}`);  elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
        elem = document.getElementById(`personTextL-${i}`);  elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
        // Show bars
        elem = document.getElementById(`personSetF-${i}`);   elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
        elem = document.getElementById(`personSetB-${i}`);   elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
    }

    // Show family lines
    for (let i=0; i<ttreeFamilies.length; i++) {
        let elem;
        const family = ttreeFamilies[i];

        // Need to show the line if either parent is active
        let disp = false;
        for (let j = 0; j < family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            if (ttreePeople[family["Parents"][j]["Row"]]["Visible"]) disp = true;
        }
        const show = disp ? 'show' : 'hidden';
        elem = document.getElementById(`familyLinesF-${i}`);  elem.setAttribute('visibility', show);
        elem = document.getElementById(`familyLinesB-${i}`);  elem.setAttribute('visibility', show);

        // And then need to adjust line position based on each parent and each child
        let topRow = null, btmRow = null;
        for (let j = 0; j < family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            const parent = ttreePeople[family["Parents"][j]["Row"]];
            if (!(parent["Visible"])) continue
            if ((topRow == null) || (parent["ShowRow"] < topRow)) topRow = parent["ShowRow"];
            if ((btmRow == null) || (parent["ShowRow"] > btmRow)) btmRow = parent["ShowRow"];
        }
        for (let j = 0; j < family["Children"].length; j++) {
            if (family["Children"][j]["Row"] < 0) continue;
            const child = ttreePeople[family["Children"][j]["Row"]];
            if (!(child["Visible"])) continue
            if ((topRow == null) || (child["ShowRow"] < topRow)) topRow = child["ShowRow"];
            if ((btmRow == null) || (child["ShowRow"] > btmRow)) btmRow = child["ShowRow"];
        }
        const y1  = (topRow * rowHeight) + 23;
        const y2  = (btmRow * rowHeight) + 23;
        elem = document.getElementById(`familyLinesF-${i}`); elem.setAttribute('y1', y1); elem.setAttribute('y2', y2);
        elem = document.getElementById(`familyLinesB-${i}`); elem.setAttribute('y1', y1); elem.setAttribute('y2', y2);
    }          

    // Retrieve dispay parameters
    const paramData     = $("#paramData").val()
    const paramFlip = $("#paramFlip").prop("checked")

    // Get display elements that can be displayed
    const elemAll = document.getElementById("ttreeContainer");
    const elemH   = document.getElementById("ttreeHeader");
    const elemM   = document.getElementById("ttreeMain");

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
    }
    else if (paramData == "Full") {
        elemHTL.setAttribute("display", "1");
        elemMTL.setAttribute("display", "1");
        elemHTS.setAttribute("display", "none");
        elemMTS.setAttribute("display", "none");
        dispTextWidth = dispTextWidthLong;
    }
    else {
        elemHTL.setAttribute("display", "None");
        elemMTL.setAttribute("display", "None");
        elemHTS.setAttribute("display", "none");
        elemMTS.setAttribute("display", "none");
        dispTextWidth = 0;
    }

    // --------------------------------------------
    // Show relevant blocks
    if (paramFlip == false) { // Show Forward
        elemHYF.setAttribute("display", "1");
        elemMBF.setAttribute("display", "1");
        elemFlinesF.setAttribute("display", "1");
        elemHYB.setAttribute("display", "none");
        elemMBB.setAttribute("display", "none");
        elemFlinesB.setAttribute("display", "none");
        elemHYF.setAttribute("x", dispTextWidth);
        elemMBF.setAttribute("x", dispTextWidth);
        elemFlinesF.setAttribute("x", dispTextWidth);
    }
    else { // Show Backward
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
    // Adjust overall width
    const totalWidth = Number(dispTextWidth + dispYearsWidth);
    const totalHeight = maxRow * 16 + 40;
    elemAll.setAttribute("width", totalWidth);
    elemH.setAttribute("width", totalWidth);
    elemM.setAttribute("width", totalWidth);
    elemM.style.height = totalHeight;

    // And add event handlers for clicking on a bar
    for (let i=0; i<ttreePeople.length; i++) {
        if (ttreePeople[i]["Type"] == "ancestor") {
            $(`#personBarF-${i}`).off('click').on('click', updateDisplayPerson);
            $(`#personBarF-${i} > rect`).addClass("barHover")
            $(`#personBarB-${i}`).off('click').on('click', updateDisplayPerson);    
            $(`#personBarB-${i} > rect`).addClass("barHover")
        }
    }

}


//===========================================================================================
// Change the horizontal positioning of all elements

function rescaleDisplay() {

    let blocks, elem;
    
    // Determine earliest and latest year for display
    yearEarliest = currentYear;
    yearLatest = 0;
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (!person["Visible"]) continue;
        if (person["Birth"]["Use"] < yearEarliest) yearEarliest = Number(person["Birth"]["Use"]);
        if (person["Birth"]["Use"] > yearLatest)   yearLatest   = Number(person["Birth"]["Use"]);
        if (person["Death"]["Use"] < yearEarliest) yearEarliest = Number(person["Death"]["Use"]);
        if (person["Death"]["Use"] > yearLatest)   yearLatest   = Number(person["Death"]["Use"]);
    }
    if (yearEarliest > yearLatest) yearEarliest = yearLatest;
    yearEarliest = yearEarliest - 50;
    yearLatest = yearLatest + 40;
    // Then move to nearest 25 year boundary
    yearEarliest -= (yearEarliest % 25);
    yearLatest   -= (yearLatest % 25);
    dispYearsWidth = (yearLatest - yearEarliest) * ptsPerYear;
    if (ttreeDebug) console.log(`Year range: ${yearEarliest}-${yearLatest}`);

    // Then update the x coords for each persons bar
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const xSetF = (ttreeFamilies[person["ChildIn"]]["Status"]["Use"] - setOffsetF - yearEarliest) * ptsPerYear;
        const xSetB = (yearLatest - (ttreeFamilies[person["ChildIn"]]["Status"]["Use"] + setOffsetB)) * ptsPerYear;
        elem = document.getElementById(`personSetF-${i}`); elem.setAttribute('x', xSetF);
        elem = document.getElementById(`personSetB-${i}`); elem.setAttribute('x', xSetB);
    }

    // Then update the x coords for each family line
    for (let i=0; i<ttreeFamilies.length; i++) {
        const family = ttreeFamilies[i];
        const xF = (family["Status"]["Use"] - yearEarliest) * ptsPerYear;
        const xB = (yearLatest - family["Status"]["Use"]) * ptsPerYear;
        elem = document.getElementById(`familyLinesF-${i}`); elem.setAttribute('x1', xF); elem.setAttribute('x2', xF);
        elem = document.getElementById(`familyLinesB-${i}`); elem.setAttribute('x1', xB); elem.setAttribute('x2', xB);
    }

    // Then update the size of the main display box
    
    // ---------------------------------------------
    // Build the Header Years and the Main grid lines

    // Header - Forward version (earliest year left)
    blocks = `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
    blocks += `<text x="5" y="13" class="headerText1">Timeline</text>`;
    let hdrYearGrid = yearEarliest+25;
    while (hdrYearGrid < yearLatest) {
        blocks += `<text x="${(hdrYearGrid - yearEarliest)*ptsPerYear - 15}" y="33" class="headerText2">${hdrYearGrid}</text>`;
        hdrYearGrid += gridGap;
    }
    document.getElementById("hdrYearsFwd").innerHTML += blocks;

    // Header - Reverse version (latest year left)
    blocks = `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
    blocks += `<text x="5" y="13" class="headerText1">Timeline</text>`;
    hdrYearGrid = yearLatest-25;
    while (hdrYearGrid > yearEarliest) {
        blocks += `<text x="${(yearLatest - hdrYearGrid)*ptsPerYear - 15}" y="33" class="headerText2">${hdrYearGrid}</text>`;
        hdrYearGrid -= gridGap;
    }
    document.getElementById("hdrYearsBwd").innerHTML += blocks;

    // Gridlines - Forward version (earliest year left)
    blocks = "";
    let mainYearGrid = yearEarliest+25;
    while (mainYearGrid < yearLatest) {
        if ((mainYearGrid%100)==0) blocks += `<line x1="${(mainYearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(mainYearGrid - yearEarliest)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine2"/>`;
        else                       blocks += `<line x1="${(mainYearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(mainYearGrid - yearEarliest)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine3"/>`;
        mainYearGrid += gridGap;
    }
    blocks += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    document.getElementById("mainGridlinesFwd").innerHTML += blocks;

    // Gridlines - Reverse version (latest year left)
    blocks = "";
    mainYearGrid = yearLatest-25;
    while (mainYearGrid > yearEarliest) {
        if ((mainYearGrid%100)==0) blocks += `<line x1="${(yearLatest - mainYearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - mainYearGrid)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine2"/>`;
        else                       blocks += `<line x1="${(yearLatest - mainYearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - mainYearGrid)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine3"/>`;
        mainYearGrid -= gridGap;
    }
    blocks += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    document.getElementById("mainGridlinesBwd").innerHTML += blocks;
    
}


//===================================================================================
// Build the whole tree (extra and order data, and then build the display components)


async function generateTree () {
    
    ttreePeople   = [];

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
                <text id="hdrMsg" x="10" y="40" font-size="16">Building new tree for person with ID=${ttreePrimaryID}</text>
            </svg>
            <svg id="ttreeMain" y="100" width="2000"></svg>
        </div>
        <div id="help-text">${ttreeHelpText}</div>`);       
    console.log(`Building new tree for person with ID=${ttreePrimaryID}`);

    let paramFlip = false;
    
    // ---------------------------------------------
    // Load and format data 

    const starttime = performance.now();

    // Load people from wikitree
    let valid = await loadPeople();
    if (!valid) {
        document.getElementById("ttreeHeader").innerHTML = '<text x="10" y="20" font-size="20">No valid person</text>';
        return;
    } 

    // Then process everyone to update the details for each person and each family 
    updatePeople();

    // Show the results
    if (ttreeDebug) console.log(ttreeAncestors);
    if (ttreeDebug) console.log(ttreePeople);
    if (ttreeDebug) console.log(ttreeFamilies);

    // The generate the display elems
    buildDisplayElems();

    // And finally, log the processing time
   const elapsedTime = performance.now() - starttime;
   console.log(`Retrieved ${ttreePeople.length} total people in tree`);
   console.log(`Total elapsed time : ${elapsedTime}ms.`);
}


//===========================================================================================
// Build the display elements associated with each person and each family connection 

function buildDisplayElems() {

    // ---------------------------------------------
    // Build DOM structure

    let blocksHeader ="";
    let blocksMain = "";

    document.getElementById("ttreeHeader").innerHTML = `
        <svg id="hdrTextShort"></svg>
        <svg id="hdrTextLong"></svg>
        <svg id="hdrYearsFwd"></svg>
        <svg id="hdrYearsBwd"></svg>`;

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
    // Build the Header text

    // Short Header
    dispTextWidthShort = locsShort.at(-1);
    blocksHeader = `<rect x="0" y="0" width="${dispTextWidthShort}" height="${headerHeight}" class="headerRow"/>`;
    for (let i=0; i<locsShort.length; i++)
        blocksHeader += `<text x="${+locsShort[i] + 5}" y="13" class="headerText1">${labsShort[i]}</text>`;
    document.getElementById("hdrTextShort").innerHTML += blocksHeader;

    // Long Header
    dispTextWidthLong = locsLong.at(-1);
    blocksHeader = `<rect x="0" y="0" width="${dispTextWidthLong}" height="${headerHeight}" class="headerRow"/>`;
    for (let i=0; i<locsLong.length; i++)
        blocksHeader += `<text x="${+locsLong[i] + 5}" y="13" class="headerText1">${labsLong[i]}</text>`;
    document.getElementById("hdrTextLong").innerHTML += blocksHeader;
    
    // ---------------------------------------------
    // Build colored row backgrounds

    let alternate = 0;
    blocksMain = "";
    for (let i=0; i<maxRows; i++) {
        let rowY, rowClass;
        alternate = (alternate+1)%2;
        // Add in row background
        if (alternate==0) rowClass = "rowEven"; else rowClass = "rowOdd";
        rowY = (i * rowHeight)+15;
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
    let blocksTextS = '';
    let blocksTextL = '';
    let blocksFwd = '';
    let blocksBwd = '';

    for (let personIdx=0; personIdx<ttreePeople.length; personIdx++) {

        const person = ttreePeople[personIdx];
        const rowY = (personIdx * rowHeight) + 14;
        
        // Build People Text (short version)
        blocksTextS += `<svg id="personTextS-${personIdx}" x="0" y="${rowY}" visibility:"hidden">`;
        blocksTextS +=   `<text x="${+locsShort[0] + +5}" y="13" class="gridText">${ (person["Gen"] > 0) ? person["Gen"] : "-"}</text>`;
        blocksTextS +=   `<text x="${+locsShort[1] + +5}" y="13" class="gridText">${person["FirstName"]} ${person["Details"]["LastNameAtBirth"]}</text>`;
        blocksTextS +=   `<text x="${+locsShort[2] + +5}" y="13" class="gridText">${person["Details"]["BirthDate"]} - ${person["Details"]["DeathDate"]}</text>`;
        blocksTextS += `</svg>`;

        // Build People Text (long version)
        blocksTextL += `<svg id="personTextL-${personIdx}" x="0" y="${rowY}" visibility:"hidden">`;
        blocksTextL +=   `<text x="${+locsLong[0] + +5}" y="13" class="gridText">${ (person["Gen"] > 0) ? person["Gen"] : "-"}</text>`;
        blocksTextL +=   `<text x="${+locsLong[1] + +5}" y="13" class="gridText">${person["FirstName"]} ${person["Details"]["MiddleName"]} ${person["Details"]["LastNameAtBirth"]}</text>`;
        blocksTextL +=   `<text x="${+locsLong[2] + +5}" y="13" class="gridText">${person["Details"]["BirthDate"]} - ${person["Details"]["DeathDate"]}</text>`;
        blocksTextL +=   `<text x="${+locsLong[3] + +5}" y="13" class="gridText">${person["Details"]["BirthLocation"]}</text>`;
        blocksTextL += `</svg>`;

        // Now create the bar
        const sn = (person["Details"]["LastNameAtBirth"] == "Unknown") ? "?" : person["Details"]["LastNameAtBirth"];
        const gn = (person["FirstName"] == "Unknown") ? "?" : person["FirstName"];
        const by = person["Birth"]["Known"] ? person["Birth"]["Use"] : "?";
        const dy = person["Death"]["Known"] ? person["Death"]["Use"] : "?";

        // Determine colour of the bar (based on person gender and type)
        let barColour, barDef;
        if (person["Type"] == "ancestor") {
            switch (person["Details"]["Gender"]) {
                case "Male"   : barColour = barColourM0; barDef = "#gradM0"; break;
                case "Female" : barColour = barColourF0; barDef = "#gradF0";  break;
                default       : barColour = barColourX0; barDef = "#gradX0"; 
            }
        }
        else if (person["Type"] == "sibling") {
            switch (person["Details"]["Gender"]) {
                case "Male"   : barColour = barColourM1; barDef = "#gradM1"; break;
                case "Female" : barColour = barColourF1; barDef = "#gradF1";  break;
                default       : barColour = barColourX1; barDef = "#gradX1"; 
            }
        }
        else {
            switch (person["Details"]["Gender"]) {
                case "Male"   : barColour = barColourM2; barDef = "#gradM2"; break;
                case "Female" : barColour = barColourF2; barDef = "#gradF2";  break;
                default       : barColour = barColourX2; barDef = "#gradX2"; 
            }
        }

        // Create Forward Set (= name + family line + bar) when showing forward direction
        //    Note: Start the Set at year 'barOffset' before Family use date (updated each time the earliestYear is determined).
        //          Then all other components positioned within the Set.
        let setStart  = ttreeFamilies[person["ChildIn"]]["Status"]["Use"] - setOffsetF;
        let xSetInitial = (setStart - yearEarliest) * ptsPerYear;
        let xFamilyLine = setOffsetF * ptsPerYear;
        let xBarStart   = (person["Birth"]["Use"] - setStart) * ptsPerYear;
        let xBarEnd     = (person["Death"]["Use"] - setStart) * ptsPerYear;
        blocksFwd += `<svg id="personSetF-${personIdx}" x="${xSetInitial}" y="${rowY}" visibility:"hidden">`;

        blocksFwd += `<svg id="personBarF-${personIdx}" x="0" y="0"}>`;
        blocksFwd += `<rect x="${xBarStart}" y="4" width="${xBarEnd-xBarStart}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person["Birth"]["Known"]) blocksFwd += `<rect x="${xBarStart-50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        if (!person["Death"]["Known"]) blocksFwd += `<rect x="${xBarEnd}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        blocksFwd += `</svg>`

        // Add family line, marriage dots, and names/dates
        blocksFwd +=    `<line x1="${xFamilyLine}" y1="9" x2="${xBarStart + 2}" y2="9" class="familyLine"/>`;
        for (const famIdx of person["ParentIn"]) {
            const fData = ttreeFamilies[famIdx]["Status"];
            const xPF = (fData["Use"] - setStart) * ptsPerYear;
            const mdot = (fData["Married"]) ? ((fData["Known"]) ? "famDot1" : "famDot2" ) : "famDot3";
            blocksFwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        blocksFwd += `<a href="http://wikitree.com/wiki/${person["Details"]["Name"]}" class="abar" target="_blank"><text x="${xFamilyLine - 10}" y="13" class="barTextF">${gn} ${sn} (${by}-${dy})</text></a>`
        blocksFwd += `</svg>`;


        // Create Backward Set (= name + family line + bar) when showing backward direction
        //    Note: Start the Set 150 years after the Family use date (max age=120 + born 30 years after marriage)
        //          Then all other components positioned within the Set.
        setStart  = ttreeFamilies[person["ChildIn"]]["Status"]["Use"] + setOffsetB;
        xSetInitial = (yearLatest - setStart) * ptsPerYear;
        xFamilyLine = setOffsetB * ptsPerYear;
        xBarStart   = (setStart - person["Birth"]["Use"]) * ptsPerYear;
        xBarEnd     = (setStart - person["Death"]["Use"]) * ptsPerYear;

        blocksBwd += `<svg id="personSetB-${personIdx}" x="${xSetInitial}" y="${rowY}" visibility:"hidden">`;

        blocksBwd += `<svg id="personBarB-${personIdx}" x="0" y="0"}>`;
        blocksBwd += `<rect x="${xBarEnd}" y="4" width="${xBarStart-xBarEnd}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person["Birth"]["Known"]) blocksBwd += `<rect x="${xBarStart}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        if (!person["Death"]["Known"]) blocksBwd += `<rect x="${xBarEnd-50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        blocksBwd += `</svg>`

        // Add family line, marriage dots, and names/dates
        blocksBwd +=    `<line x1="${xBarStart - 2}" y1="9" x2="${xFamilyLine}" y2="9" class="familyLine"/>`;
        for (const famIdx of person["ParentIn"]) {
            const fData = ttreeFamilies[famIdx]["Status"];
            const xPF = (setStart - fData["Use"]) * ptsPerYear;
            const mdot = (fData["Married"]) ? ((fData["Known"]) ? "famDot1" : "famDot2" ) : "famDot3";
            blocksBwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        blocksBwd += `<a href="http://wikitree.com/wiki/${person["Details"]["Name"]}" class="abar" target="_blank"><text x="${xFamilyLine + 10}" y="13" class="barTextB">${gn} ${sn} (${by}-${dy})</text></a>`
        blocksBwd += `</svg>`;

    }
    document.getElementById("mainTextShort").innerHTML += blocksTextS;
    document.getElementById("mainTextLong").innerHTML += blocksTextL;
    document.getElementById("mainBarFwd").innerHTML += blocksFwd;
    document.getElementById("mainBarBwd").innerHTML += blocksBwd;


    // And the family connecting lines
    blocksFwd = "";
    blocksBwd = "";
    for (let familyIdx=0; familyIdx<ttreeFamilies.length; familyIdx++) {
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
    console.log(`Retrieving direct ancestors for person with ID=${ttreePrimaryID}`);

    // Begin by retrieving all ancestors for the primaryID person
    const ancFields=["Id","Name","Father","Mother"];
    const ancestors_json = await WikiTreeAPI.getAncestors("TimelineTree", ttreePrimaryID, ttreeStartGens, ancFields);
    let ancestorsList = ancestors_json ? Object.values(ancestors_json) : [];
    console.log(`Retrieved ${ancestorsList.length} people in direct tree`);
    hdrMsg.innerHTML = `Retrieved ${ancestorsList.length} direct ancestors (please wait whilst we get everyone else)`;
    if (ancestorsList.length == 0) return false;

    if (ttreeDebug) console.log(ancestorsList);
    
    // Then have to retrieve the relatives of each ancestor (parents + spouse + children + siblings)
    let ancestorsIDs = ancestorsList.map(item => item["Id"]);  // Extract Ids of all ancestors
    const relsFields=["Id","PageId","Name","FirstName","MiddleName","LastNameAtBirth","LastNameCurrent",
                "BirthDate","DeathDate","BirthDateDecade", "DeathDateDecade", "BirthLocation","DeathLocation","Gender","IsLiving","Father","Mother",
                "Parents", "Children","Spouses","Siblings", "Privacy"];
    const relatives_json = await WikiTreeAPI.getRelatives("TimelineTree", ancestorsIDs, relsFields, {getChildren: 1, getSpouses: true, getSiblings: true, getParents: true});
    ttreeAncestors = relatives_json ? Object.values(relatives_json) : [];

    
    // Then extract all people into a single list
    for (let i=0; i<ttreeAncestors.length; i++) {
        // For each ancestor, extract the person and add them
        let ancestor = ttreeAncestors[i];
        addPerson(ancestor["person"], "ancestor", true);
        // Then add each parent, sibling, spouse, and child
        for (let parent in ancestor["person"]["Parents"]) addPerson(ancestor["person"]["Parents"][parent], "ancestor", false);
        for (let sibling in ancestor["person"]["Siblings"]) addPerson(ancestor["person"]["Siblings"][sibling], "sibling", false);
        if (i>0) for (let spouse in ancestor["person"]["Spouses"]) addPerson(ancestor["person"]["Spouses"][spouse], "stepParent", false);        
        if (i>0) for (let child in ancestor["person"]["Children"]) addPerson(ancestor["person"]["Children"][child], "halfSibling", false);
    }
    hdrMsg.innerHTML = `Retrieved ${ttreePeople.length} total people `;

    return true;
}


//===========================================================================================
// Add the specified person to the list of current people

function addPerson(person, type, primary) {
    // Check if they already exist
    const personIdx = ttreePeople.findIndex(item => item["Id"] == person["Id"]);
    if (personIdx >= 0) {
        if (primary) { // replace existing (but retain their Visibility)
            const vis = ttreePeople[personIdx]["Visible"];
            ttreePeople.splice(personIdx,1,{"Id": person["Id"], "Details":person, "Generation": null, "Type": type, "ParentIn": new Set([]), "Visible": vis});
            return;
        }
        else {
            if ((type=="ancestor")||(ttreePeople[personIdx]["Type"]=="ancestor")) ttreePeople[personIdx]["Type"] = "ancestor";
            else if ((type=="sibling")||(ttreePeople[personIdx]["Type"]=="sibling")) ttreePeople[personIdx]["Type"] = "sibling";
            else if ((type=="halfSibling")||(ttreePeople[personIdx]["Type"]=="halfSibling")) ttreePeople[personIdx]["Type"] = "halfSibling";
            else ttreePeople[personIdx]["Type"] = "stepParent";
            return;
        }
    }
    // Add them to the list of people
    ttreePeople.push({"Id": person["Id"], "Details":person, "Generation": null, "Type": type, "ParentIn": new Set([]), "NewPerson": true});
}



//===========================================================================================
// Process the current list of people to update details for each person and each family

function updatePeople() {

    ttreeFamilies = [];

    // Step 0: Clear previous info on family links
    for (let i=0; i<ttreePeople.length; i++) {
        ttreePeople[i]["ChildIn"] = -1;
        ttreePeople[i]["ParentIn"] = new Set([]);
    }

    // Step 1: For each person: extract core data (Birth and Death info and parents)

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        
        person["Gen"] = -1;

        // Determine birthYear
        const by = Number(person["Details"]["BirthDate"].substring(0,4));
        const bd = Number(person["Details"]["BirthDateDecade"].substring(0,4));
        if (by > 0) person["Birth"] = {"Year":by, "Known":true};
        else if (bd > 0) person["Birth"] = {"Year":bd+10, "Known":false};
        else person["Birth"] = {"Year":null, "Known":false};

        // Determine deathYear
        const dy = Number(person["Details"]["DeathDate"].substring(0,4));
        const dd = Number(person["Details"]["DeathDateDecade"].substring(0,4));
        const dl = (person["Details"]["IsLiving"] == 1);
        if (dy > 0) person["Death"] = {"Year":dy, "Known":true, "IsLiving":dl};
        else if (dd > 0) person["Death"] = {"Year":dd, "Known":false, "IsLiving":dl};
        else person["Death"] = {"Year":null, "Known":false, "IsLiving":dl};
    }

    // Step 2: For each person: create a family entry / add details to an existing family

    function isParent(parents, ID) {
        for (let i = 0; i < parents.length; i++) {
            if (parents[i]["ID"] == ID) return true;
        }
        return false;
    }

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        let familyIdx = -1;
        let family;
        // If this person has no/null parents then they should have their own "family"
        if ((Number(person["Details"]["Father"]) == 0) && (Number(person["Details"]["Mother"]) == 0)) {
            family = {"Parents"  : [],
                      "Children" : [],
                      "Data"     : {"EarliestBirth": person["Birth"]["Year"], "LatestBirth": person["Birth"]["Year"]},
                      "Status"   : {"Married": false, "Date": null, "Known": false, "Use": null},
                      "NewItem"  : true};
            const child = {"ID": person["Id"], "Row": i};
            family["Children"].push(child);
            ttreeFamilies.push(family);
            familyIdx = ttreeFamilies.length - 1;
        }


        else {
            // Then search for an existing family
            for (let j=0; j<ttreeFamilies.length; j++) {
                const parents = ttreeFamilies[j]["Parents"];
                if (isParent(parents, person["Details"]["Father"]) && isParent(parents, person["Details"]["Mother"])) { familyIdx = j; break; }
            }
            // If no existing family then create a new one
            if (familyIdx == -1) {
                // Create a new family
                family = {"Parents"  : [{"ID": person["Details"]["Father"], "Row": ttreePeople.findIndex(item => item["Id"] == person["Details"]["Father"])},
                                        {"ID": person["Details"]["Mother"], "Row": ttreePeople.findIndex(item => item["Id"] == person["Details"]["Mother"])}],
                        "Children" : [],
                        "Data"     : {"EarliestBirth": person["Birth"]["Year"], "LatestBirth": person["Birth"]["Year"]},
                        "Status"   : {"Married": false, "Date": null, "Known": false, "Use": null},
                        "NewItem"  : true};
                ttreeFamilies.push(family);
                familyIdx = ttreeFamilies.length - 1;
            }
            family = ttreeFamilies[familyIdx];
        }

        // Add this person as a child of the family
        const child = {"ID": person["Id"], "Row": i};
        family["Children"].push(child);

        // Then update the family Data
        if (family["Data"]["EarliestBirth"] == null) family["Data"]["EarliestBirth"] = person["Birth"]["Year"];
        else if (person["Birth"]["Year"] < family["Data"]["EarliestBirth"]) family["Data"]["EarliestBirth"] = person["Birth"]["Year"];
        if (family["Data"]["LatestBirth"] == null) family["Data"]["LatestBirth"] = person["Birth"]["Year"];
        else if (person["Birth"]["Year"] > family["Data"]["LatestBirth"]) family["Data"]["LatestBirth"] = person["Birth"]["Year"];

        //Link person to family as a child
        person["ChildIn"] = familyIdx;

        // Link parents to family as parent
        const fatherIdx = ttreePeople.findIndex(item => (item["Id"]==person["Details"]["Father"]));
        if (fatherIdx >= 0) ttreePeople[fatherIdx]["ParentIn"].add(familyIdx);
        const motherIdx = ttreePeople.findIndex(item => (item["Id"]==person["Details"]["Mother"]));
        if (motherIdx >= 0) ttreePeople[motherIdx]["ParentIn"].add(familyIdx);
    }


    // Step 3: For each spouse of each person: create a family entry or add details to an existing family

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (!("Spouses" in person["Details"])) continue;  // no spouses
        for (let spouseID in person["Details"]["Spouses"]) {
            spouseID = Number(spouseID);
            const spouseIdx = ttreePeople.findIndex(item => item["Id"] == spouseID);
            if (spouseIdx < 0) continue;
            let familyIdx = -1;
            // Search for an existing family
            for (let j=0; j<ttreeFamilies.length; j++) {
                const parents = ttreeFamilies[j]["Parents"];
                if (isParent(parents, person["Id"]) && isParent(parents, spouseID)) { familyIdx = j; break; }
            }
    
            // Does not exist, so create a family
            if (familyIdx < 0) {
                const family = {"Parents"  : [{"ID": person["Id"], "Row": ttreePeople.findIndex(item => item["Id"] == person["Id"])},
                                              {"ID": spouseID,     "Row": ttreePeople.findIndex(item => item["Id"] == spouseID)}],
                              "Children" : [],
                              "Data"     : {"EarliestBirth": null, "LatestBirth": null},
                              "Status"   : {"Married": true, "Date": person["Details"]["Spouses"][spouseID]["marriage_date"], "Known": false, "Use": null}};
                ttreeFamilies.push(family);
                familyIdx = ttreeFamilies.length - 1;
                // Link couple to family as parent
                person["ParentIn"].add(familyIdx);
                ttreePeople[spouseIdx]["ParentIn"].add(familyIdx);
            }
            // Otherwise update the existing family
            else {
                ttreeFamilies[familyIdx]["Status"]["Married"] = true;
                ttreeFamilies[familyIdx]["Status"]["Date"] = person["Details"]["Spouses"][spouseID]["marriage_date"];
            }
        }
    }

    // Step 4: For each family, update the "Use" year.

    for (let i=0; i<ttreeFamilies.length; i++) {
        const family = ttreeFamilies[i];
        // Do we have an actual marriage date?
        if ((family["Status"]["Date"] != null) && (Number(family["Status"]["Date"].substring(0,4)) > 0)) {
            family["Status"]["Use"] = Number(family["Status"]["Date"].substring(0,4));
            family["Status"]["Known"] = true;
            continue;
        }
        // Need to check for the earlier of "EarliestBirth" and "Death" of either parent
        let possibleDate = null;
        if (family["Data"]["EarliestBirth"] > 0) possibleDate = family["Data"]["EarliestBirth"];
        for (let j=0; j>family["Parents"].length; j++) {
            if ((family["Parents"][j]["Row"] >= 0) && (ttreePeople[family["Parents"][j]["Row"]]["Death"]["Year"] > 0))
                if ((possibleDate == null) || (ttreePeople[family["Parents"][j]["Row"]]["Death"]["Year"] < possibleDate))
                    possibleDate = ttreePeople[family["Parents"][j]["Row"]]["Death"]["Year"];
        }
        if (possibleDate > 0) {
            family["Status"]["Use"] = possibleDate;
            continue;
        }

        // Else do we have a valid date for the birth of the first child?
        if (family["Data"]["EarliestBirth"] > 0) {
            family["Status"]["Use"] = Number(family["Data"]["EarliestBirth"]) - 1;
            continue;
        }

        // Else check for latest birth of a parent         
        let latestParentBirth = 0;
        for (let j=0; j>family["Parents"].length; j++) {
            if ((family["Parents"][j]["Row"] >= 0) && (ttreePeople[family["Parents"][j]["Row"]]["Birth"]["Year"] > 0))
                latestParentBirth = ttreePeople[family["Parents"][j]["Row"]]["Birth"]["Year"];
        }
        if (latestParentBirth > 0)
            family["Status"]["Use"] = latestParentBirth + 20;
    }


    // Step 5a: For each person, update the Birth "Use" years.

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const family = ttreeFamilies[person["ChildIn"]];

        // Does this person have a valid Birth date
        if (person["Birth"]["Year"] > 0)
            person["Birth"]["Use"] = person["Birth"]["Year"];
        // Otherwise does their family have a valid use date?
        else if (family["Status"]["Use"] > 0)
            person["Birth"]["Use"] = family["Status"]["Use"]+10;
        // Otherwise null
        else
            person["Birth"]["Use"] = 0;
    }
    

    // Step 5b: For each person, update the Death "Use" years.

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const family = ttreeFamilies[person["ChildIn"]];

        // Does this person have a valid Death date
        if (person["Death"]["Year"] > 0) {
            person["Death"]["Use"] = person["Death"]["Year"];
            continue;
        }
        // Else if living then use the current year
        if (person["Death"]["IsLiving"]) {
            person["Death"]["Use"] = currentYear;
            continue;
        }
        // Else use year of last marriage
        let lastMarriage = 0;
        for (const famIdx of person["ParentIn"]) {
            if (ttreeFamilies[famIdx]["Status"]["Use"] > lastMarriage) lastMarriage = ttreeFamilies[famIdx]["Status"]["Use"];
        }
        if (lastMarriage > 0) {
            person["Death"]["Use"] = lastMarriage;
            continue;
        }

        // else use birth + 30
        if (person["Birth"]["Use"] > 0)
            person["Death"]["Use"] = person["Birth"]["Use"] + 30;
        else
            person["Death"]["Use"] = 0;
    }
    // And just check if Death matches Birth (and so won't show)
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (person["Death"]["Use"] == person["Birth"]["Use"]) {
            person["Death"]["Use"] = person["Birth"]["Use"] + 1;
        }
    }
    

    // Step 5C: Update any missing Birth Use dates based on children

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (person["Birth"]["Use"] > 0) continue;
        let firstChildBirth = currentYear;
        for (let childID in person["Details"]["Children"]) {
            const child = ttreePeople.find(item => item["Id"] == childID);

            if ((child["Birth"]["Use"] > 0) && (child["Birth"]["Use"] < firstChildBirth))
                firstChildBirth = child["Birth"]["Use"];
        }
        if (firstChildBirth < currentYear) person["Birth"]["Use"] = firstChildBirth - 30;
    }

    // Step 6: For each person: determine their generation
    let gen=1;
    setGen(ttreePeople.findIndex(item => item["Id"] == ttreePrimaryID), 1);

    function setGen(personIdx, gen) {
        if (personIdx < 0) return;
        ttreePeople[personIdx]["Gen"] = gen;
        let family = ttreeFamilies[ttreePeople[personIdx]["ChildIn"]];
        for (let j=0; j<family["Parents"].length; j++) {
            setGen(family["Parents"][j]["Row"], gen+1);
        }
    }

    // Step 7: And finally, update details for "private" people
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];

        if (Number(person["Details"]["Privacy"])<50 && !("FirstName" in person["Details"]))
            person["FirstName"] = "(private)";
        else
            person["FirstName"] = person["Details"]["FirstName"];
    }

}


