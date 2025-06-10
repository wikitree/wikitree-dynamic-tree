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

let ttreeMaxGens = 5;
let selector;
let personId;

const ttreeDebug = true;

const ptsPerYear = 5
const gridGap = 25;
const headerHeight = 40;
const rowHeight = 16;

let ttreePeople;
let ttreeFamilies;

let currentYear;
let ttreePrimaryID;
let ttreeCurrentFocusPerson;

let dispTextWidthShort;
let dispTextWidthLong;
let dispTextWidth;
let dispYearsWidth;
let dispTextHeight;

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

window.TimelineTreeView2 = class TimelineTreeView2 extends View {

    static #DESCRIPTION = "Shows a tree structure in a timeline format.";
    meta() {
        return {
            title: "Timeline Tree 2",
            description: TimelineTreeView2.#DESCRIPTION,
        };
    }

    async init(container_selector, person_id) {

        selector = container_selector;
        personId = person_id;

        const controlBlock = `
            <div id="controlBlock" class="ttree-not-printable" style="position:sticky; top:1;">
                <button id="reloadData" class="btn btn-primary btn-sm" title="Reload specified number of gens">Load</button>&nbsp;
                <select id="paramLoad" title="Number of generations">
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5" selected>5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                  <option value="11">11</option>
                  <option value="12">12</option>
                </select>
                <label>Gens</label>
                &nbsp;&nbsp;&nbsp;
                <label>Show&nbsp;</label>
                <select id="paramGens" title="Number of generations">
                  <option value="2" selected>2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
                <label>Gens</label>
                &nbsp;&nbsp;&nbsp;
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
        $("#reloadData").off("click").on("click", loadTree);
        $("#paramData").off('change').on('change', updateDisplay);
        $("#paramFlip").off('change').on('change', updateDisplay);
        $("#paramSibs").off('change').on('change', updateDisplaySibs);        
        $("#paramGens").off('change').on('change', updateDisplayGens);
    }


     close() {
        // remove event listeners
        $("#reloadData").off();
        $("#paramGens").off();
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
    ttreeFamilies = null;

    // Retrieve the current currently entered primary person ID
    personId = $("#wt-id-text").val();
    
    // build the tree and the display components
    ttreeMaxGens = $("#paramLoad").val();
    await generateTree();

    // Initialise current focus person
    ttreeCurrentFocusPerson = ttreePeople.findIndex(item => item["id"] == personId);

    // Event handlers for clicking on a bar
    for (let i=0; i<ttreePeople.length; i++) {
        if (ttreePeople[i]["type"] == "ancestor") {
            $(`#personBarF-${i}`).off('click').on('click', updateDisplayPerson);
            $(`#personBarF-${i} > rect`).addClass("barHover")
            $(`#personBarB-${i}`).off('click').on('click', updateDisplayPerson);    
            $(`#personBarB-${i} > rect`).addClass("barHover")
        }
    }

    // Do an initial display
    console.log(`Tree has been built - now to display it`);
    updateDisplayGens();

    // And then move the display to centre on the key person
    const row = ttreePeople.findIndex(item => item["id"] == ttreePrimaryID);
    const elemX = document.getElementById(`personBarF-${row}`);
    elemX.scrollIntoView({behavior: "smooth", block: "center"});
}

//===================================================================================
// Refresh the display of the tree

function updateDisplayGens (event) {

    const gens = $("#paramGens").val();

    // Update the control panel
    const elem = document.getElementById(`paramGens`);
    let newForm = "";
    for (let i=2; i<=ttreeMaxGens; i++) newForm += `<option value="${i}" ${i==gens ? "selected":""}>${i}</option>`;
    elem.innerHTML = newForm;

    // Determine who to show
    //   All people from gen 1 to gen n-1
    //   Only direct ancestors and their spouses at gen    
    for (let i=0; i<ttreePeople.length; i++) {
        if (ttreePeople[i]["generation"] < gens)
            ttreePeople[i]["displayInfo"]["active"] = true;
        else if ((ttreePeople[i]["generation"] == gens) && ((ttreePeople[i]["type"] == "ancestor") || (ttreePeople[i]["type"] == "stepParent")))
            ttreePeople[i]["displayInfo"]["active"] = true;
        else
            ttreePeople[i]["displayInfo"]["active"] = false;
    }

    updateDisplaySibs(event);
}   


//===================================================================================
// Update display of tree

function updateDisplayPerson (event) {



    // Check if there are parents, and if so then are they active (note: only need to check one parent?
    let personRow = event.target.parentElement.id.substring(11);
    let person = ttreePeople[personRow];
    let family = ttreeFamilies[person["ChildIn"]];
    let expanding = true;

    // Update the current selected person
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight")
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).removeClass("barHighlight")
    ttreeCurrentFocusPerson = personRow;
    $(`#personBarF-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight")
    $(`#personBarB-${ttreeCurrentFocusPerson} > rect`).addClass("barHighlight")


    // If either parent is active, then should be contracting not expanding
    if (family["Parents"] == 0) expanding = false;
    else if ((family["Parents"][0]["Row"] >= 0) && (ttreePeople[family["Parents"][0]["Row"]]["displayInfo"]["active"])) expanding = false;
    else if ((family["Parents"][1]["Row"] >= 0) && (ttreePeople[family["Parents"][1]["Row"]]["displayInfo"]["active"])) expanding = false;

    if (ttreeDebug) console.log(`Changing person ${personRow}: expanding=${expanding}`);

    // If expanding, turn on the parents, and all of their spouses
    if (expanding) {
        for (let j=0; j<family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            let parent = ttreePeople[family["Parents"][j]["Row"]];
            parent["displayInfo"]["active"] = true;
            // then activate their spouses
            let spouses = parent["details"]["Spouses"];
            for (const spouseID in spouses) {
                const spouse = ttreePeople.find(item => item.id == spouseID);
                if (spouse != null ) spouse["displayInfo"]["active"] = true;
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

    // The update the display
    updateDisplaySibs(event);


    function hidePerson (row) {
        const person = ttreePeople[row];
        if (person == null ) return;
        const family = ttreeFamilies[person["ChildIn"]];
        
        //Hide person
        person["displayInfo"]["active"] = false;

        // Hide spouses
        let spouses = person["details"]["Spouses"];
        for (const spouseID in spouses) {
            const spouse = ttreePeople.find(item => item.id == spouseID);
            if (spouse != null ) spouse["displayInfo"]["active"] = false;
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

function updateDisplaySibs (event) {

    const paramSibs = $("#paramSibs").prop("checked")

    // Turn on/off siblings
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const sibTypes = ["sibling", "halfSibling"];

        // Check if they are a sibling?
        if (sibTypes.includes(person["type"])) {

            // Turn off any sibling if setting is off
            if (!paramSibs) {
                person["displayInfo"]["active"] = false;
                continue;
            }
            
            // Then show if any parent is active
            let disp = false;
            const family = ttreeFamilies[person["ChildIn"]];
            for (let j = 0; j < family["Parents"].length; j++) {
                if (family["Parents"][j]["Row"] < 0) continue;
                if (ttreePeople[family["Parents"][j]["Row"]]["displayInfo"]["active"]) disp = true;
            }
            person["displayInfo"]["active"] = disp;
        }                
    }

    updateDisplay(event);
}   

//===================================================================================
// Update display of tree

function updateDisplay (event) {

    // Determine the display row for each person
    let displayRow = 0;
    for (let i=0; i<ttreePeople.length; i++) {
        if (ttreePeople[i]["displayInfo"]["active"]) {
            ttreePeople[i]["displayInfo"]["row"] = displayRow;
            displayRow += 1;
        }
    }

    // For each person: show/hide and adjust location of their details
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];

        const show = person["displayInfo"]["active"] ? 'show' : 'hidden';
        let elem;

        // Show text info
        let y = (person["displayInfo"]["row"] * rowHeight) + 14;
        elem = document.getElementById(`personTextS-${i}`);  elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
        elem = document.getElementById(`personTextL-${i}`);  elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
        // Show bars
        elem = document.getElementById(`personBarF-${i}`);   elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
        elem = document.getElementById(`personBarB-${i}`);   elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
    }

    // Show family lines
    for (let i=0; i<ttreeFamilies.length; i++) {
        let elem;
        const family = ttreeFamilies[i];

        // Need to show the line if either parent is active
        let disp = false;
        for (let j = 0; j < family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            if (ttreePeople[family["Parents"][j]["Row"]]["displayInfo"]["active"]) disp = true;
        }
        const show = disp ? 'show' : 'hidden';
        elem = document.getElementById(`familyLinesF-${i}`);  elem.setAttribute('visibility', show);
        elem = document.getElementById(`familyLinesB-${i}`);  elem.setAttribute('visibility', show);

        // And then need to adjust line position based on each parent and each child
        let topRow = null, btmRow = null;
        for (let j = 0; j < family["Parents"].length; j++) {
            if (family["Parents"][j]["Row"] < 0) continue;
            const parent = ttreePeople[family["Parents"][j]["Row"]];
            if (!(parent["displayInfo"]["active"])) continue
            if ((topRow == null) || (parent["displayInfo"]["row"] < topRow)) topRow = parent["displayInfo"]["row"];
            if ((btmRow == null) || (parent["displayInfo"]["row"] > btmRow)) btmRow = parent["displayInfo"]["row"];
        }
        for (let j = 0; j < family["Children"].length; j++) {
            if (family["Children"][j]["Row"] < 0) continue;
            const child = ttreePeople[family["Children"][j]["Row"]];
            if (!(child["displayInfo"]["active"])) continue
            if ((topRow == null) || (child["displayInfo"]["row"] < topRow)) topRow = child["displayInfo"]["row"];
            if ((btmRow == null) || (child["displayInfo"]["row"] > btmRow)) btmRow = child["displayInfo"]["row"];
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
    const totalHeight = displayRow * 16 + 40;
    elemAll.setAttribute("width", totalWidth);
    elemH.setAttribute("width", totalWidth);
    elemM.setAttribute("width", totalWidth);
    elemM.style.height = totalHeight;
}


//===================================================================================
// Build the whole tree (extra and order data, and then build the display components)


async function generateTree () {
    
    ttreePeople   = [];
    ttreeFamilies = [];

    const now = new Date();
    currentYear = now.getFullYear();

    // ---------------------------------------------
    // Provide initial message to user

    $(selector).html(`
        <div id="ttreeContainer" class="ttree-printable">
            <svg id="ttreeHeader" y="0" width="2000">
                <rect x="0" y="0" width="800" height="80" class="headerRow"/>
                <text x="10" y="20" font-size="20">Please be patient ... building tree</text>
                <text id="hdrMsg" x="10" y="40" font-size="16">Building new tree for person with ID=${personId}</text>
            </svg>
            <svg id="ttreeMain" y="100" width="2000"></svg>
        </div>
        <div id="help-text">${ttreeHelpText}</div>`);       
    console.log(`Building new tree for person with ID=${personId}`);

    let paramFlip = false;
    
    // ---------------------------------------------
    // Load and format data via API 

    let valid = await ttreeBuildData();
    if (!valid) {
        document.getElementById("ttreeHeader").innerHTML = '<text x="10" y="20" font-size="20">No valid person</text>';
        return;
    } 

    // ---------------------------------------------
    // Need to build the display components...

    // ---------------------------------------------
    // Placeholders for display elements
    let blocksHeader ="";
    let blocksMain = "";


    // ---------------------------------------------
    // Then find the earliest and latest years

    let yearEarliest = currentYear, yearLatest = 0;
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (person["Birth"]["Use"] < yearEarliest) yearEarliest = Number(person["Birth"]["Use"]);
        if (person["Birth"]["Use"] > yearLatest)   yearLatest   = Number(person["Birth"]["Use"]);
        if (person["Death"]["Use"] < yearEarliest) yearEarliest = Number(person["Death"]["Use"]);
        if (person["Death"]["Use"] > yearLatest)   yearLatest   = Number(person["Death"]["Use"]);
    }
    if (yearEarliest > yearLatest) yearEarliest = yearLatest;
    yearEarliest = yearEarliest - 25;
    yearLatest = yearLatest + 40;
    // Then move to nearest 25 year boundary
    yearEarliest -= (yearEarliest % 25);
    yearLatest   -= (yearLatest % 25);
    dispYearsWidth = (yearLatest - yearEarliest) * ptsPerYear;
    if (ttreeDebug) console.log(`Year range: ${yearEarliest}-${yearLatest}`);


    // ---------------------------------------------
    // Build the Header text

    const locsShort = [0, 35, 200, 360];
    const labsShort = ["Gen", "Name", "Birth/Death", ""];
    const locsLong  = [0, 35, 250, 410, 700];
    const labsLong  = ["Gen", "Full Name", "Birth/Death", "Birth location", ""];

    // Short Header
    dispTextWidthShort = locsShort.at(-1);
    blocksHeader += `<svg id="hdrTextShort">`;
    blocksHeader += `<rect x="0" y="0" width="${dispTextWidthShort}" height="${headerHeight}" class="headerRow"/>`;
    for (let i=0; i<locsShort.length; i++)
        blocksHeader += `<text x="${+locsShort[i] + 5}" y="13" class="headerText1">${labsShort[i]}</text>`;
    blocksHeader += `</svg>`;

    // Long Header
    dispTextWidthLong = locsLong.at(-1);
    blocksHeader += `<svg id="hdrTextLong">`;
    blocksHeader += `<rect x="0" y="0" width="${dispTextWidthLong}" height="${headerHeight}" class="headerRow"/>`;
    for (let i=0; i<locsLong.length; i++)
        blocksHeader += `<text x="${+locsLong[i] + 5}" y="13" class="headerText1">${labsLong[i]}</text>`;
    blocksHeader += `</svg>`;
/*
    const locsShort = [0, 35, 135, 260, 360, 460];
    const labsShort = ["Gen", "Fam Name", "Given Name", "Birth date", "Death date", ""];
    const locsLong  = [0, 35, 95, 195, 320, 420, 750, 850, 1140];
    const labsLong  = ["Gen", "Sex", "Fam Name", "Given Name", "Birth date", "Birth location", "Death date", "Death Location", ""];
*/
    // ---------------------------------------------
    // Build colored rows

    let alternate = 0;
    blocksMain += `<svg id="mainRows">`;
    for (let i=0; i<ttreePeople.length; i++) {
        let rowY, rowClass;
        alternate = (alternate+1)%2;
        // Add in row background
        if (alternate==0) rowClass = "rowEven"; else rowClass = "rowOdd";
        rowY = (i * rowHeight)+15;
        blocksMain += `<rect x="0" y="${rowY}" width="10000" height="${rowHeight}" class="${rowClass}"/>`;
    }
    blocksMain += `</svg>`;

    // ---------------------------------------------
    // Build the Header Years

    // Forward version (earliest year left)
    blocksHeader  += `<svg id="hdrYearsFwd">`;
    blocksHeader += `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
    blocksHeader += `<text x="5" y="13" class="headerText1">Timeline</text>`;
    let hdrYearGrid = yearEarliest+25;
    while (hdrYearGrid < yearLatest) {
        blocksHeader += `<text x="${(hdrYearGrid - yearEarliest)*ptsPerYear - 15}" y="33" class="headerText2">${hdrYearGrid}</text>`;
        hdrYearGrid += gridGap;
    }
    blocksHeader += `</svg>`;

    // Reverse version (latest year left)
    blocksHeader += `<svg id="hdrYearsBwd">`;
    blocksHeader += `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
    blocksHeader += `<text x="5" y="13" class="headerText1">Timeline</text>`;
    hdrYearGrid = yearLatest-25;
    while (hdrYearGrid > yearEarliest) {
        blocksHeader += `<text x="${(yearLatest - hdrYearGrid)*ptsPerYear - 15}" y="33" class="headerText2">${hdrYearGrid}</text>`;
        hdrYearGrid -= gridGap;
    }
    blocksHeader += `</svg>`;

    // ---------------------------------------------
    // Build People Text (short version and long version)

    // Short version of text
    blocksMain += `<svg id="mainTextShort">`;
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const rowY = (i * rowHeight) + 14;
        blocksMain += `<svg id="personTextS-${i}" x="0" y="${rowY}">`;
        blocksMain +=   `<text x="${+locsShort[0] + +5}" y="13" class="gridText">${person["generation"]}</text>`;
        blocksMain +=   `<text x="${+locsShort[1] + +5}" y="13" class="gridText">${person["FirstName"]} ${person["details"]["LastNameAtBirth"]}</text>`;
        blocksMain +=   `<text x="${+locsShort[2] + +5}" y="13" class="gridText">${person["details"]["BirthDate"]} - ${person["details"]["DeathDate"]}</text>`;
        blocksMain += `</svg>`;
    }
    blocksMain += `</svg>`;
    
    // Long version of text
    blocksMain += `<svg id="mainTextLong">`;
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const rowY = (i * rowHeight) + 14;
        blocksMain += `<svg id="personTextL-${i}" x="0" y="${rowY}">`;
        blocksMain +=   `<text x="${+locsLong[0] + +5}" y="13" class="gridText">${person["generation"]}</text>`;
        blocksMain +=   `<text x="${+locsLong[1] + +5}" y="13" class="gridText">${person["FirstName"]} ${person["details"]["MiddleName"]} ${person["details"]["LastNameAtBirth"]}</text>`;
        blocksMain +=   `<text x="${+locsLong[2] + +5}" y="13" class="gridText">${person["details"]["BirthDate"]} - ${person["details"]["DeathDate"]}</text>`;
        blocksMain +=   `<text x="${+locsLong[3] + +5}" y="13" class="gridText">${person["details"]["BirthLocation"]}</text>`;
        blocksMain += `</svg>`;
    }
    blocksMain += `</svg>`;


    // ---------------------------------------------
    // Build People Timeline Bars (Fwd and Bwd version)

    // Add formatting info for the fade out on time timeline bars

    const barColourM0="#2222FF", barColourM1="#8888FF", barColourM2="#CCCCFF";
    const barColourF0="#FF2222", barColourF1="#FF8888", barColourF2="#FFCCCC";
    const barColourX0="#222222", barColourX1="#888888", barColourX2="#CCCCCC";
    
    blocksMain += `<defs id="svgdefs">`;
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
    blocksMain += `</defs>`;

    // Create Main timelines

    let rowY;
    let blocksFwd = `<svg id="mainBarFwd">`;
    let blocksBwd = `<svg id="mainBarBwd">`;

    // Gridlines - Forward version (earliest year left)
    blocksFwd += `<svg id="mainGridlinesFwd">`;
    let mainYearGrid = yearEarliest+25;
    while (mainYearGrid < yearLatest) {
        if ((mainYearGrid%100)==0) blocksFwd += `<line x1="${(mainYearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(mainYearGrid - yearEarliest)*ptsPerYear}" y2="20000" class="gridLine2"/>`;
        else                       blocksFwd += `<line x1="${(mainYearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(mainYearGrid - yearEarliest)*ptsPerYear}" y2="20000" class="gridLine3"/>`;
        mainYearGrid += gridGap;
    }
    blocksFwd += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    blocksFwd += `</svg>`;

    // Gridlines - Reverse version (latest year left)
    blocksBwd += `<svg id="mainGridlinesBwd">`;
    mainYearGrid = yearLatest-25;
    while (mainYearGrid > yearEarliest) {
        if ((mainYearGrid%100)==0) blocksBwd += `<line x1="${(yearLatest - mainYearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - mainYearGrid)*ptsPerYear}" y2="20000" class="gridLine2"/>`;
        else                       blocksBwd += `<line x1="${(yearLatest - mainYearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - mainYearGrid)*ptsPerYear}" y2="20000" class="gridLine3"/>`;
        mainYearGrid -= gridGap;
    }
    blocksBwd += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    blocksBwd += `</svg>`;
    
    // Now create the bar for each person
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const barY = (i * rowHeight) + 14;
        const sn = (person["details"]["LastNameAtBirth"] == "Unknown") ? "?" : person["details"]["LastNameAtBirth"];
        const gn = (person["FirstName"] == "Unknown") ? "?" : person["FirstName"];
        const by = person["Birth"]["Known"] ? person["Birth"]["Use"] : "?";
        const dy = person["Death"]["Known"] ? person["Death"]["Use"] : "?";

        let barColour, barDef;
        if ((person["type"] == "target") || (person["type"] == "ancestor")) {
            switch (person["details"]["Gender"]) {
                case "Male"   : barColour = barColourM0; barDef = "#gradM0"; break;
                case "Female" : barColour = barColourF0; barDef = "#gradF0";  break;
                default       : barColour = barColourX0; barDef = "#gradX0"; 
            }
        }
        else if (person["type"] == "sibling") {
            switch (person["details"]["Gender"]) {
                case "Male"   : barColour = barColourM1; barDef = "#gradM1"; break;
                case "Female" : barColour = barColourF1; barDef = "#gradF1";  break;
                default       : barColour = barColourX1; barDef = "#gradX1"; 
            }
        }
        else {
            switch (person["details"]["Gender"]) {
                case "Male"   : barColour = barColourM2; barDef = "#gradM2"; break;
                case "Female" : barColour = barColourF2; barDef = "#gradF2";  break;
                default       : barColour = barColourX2; barDef = "#gradX2"; 
            }
        }

        // Bar when showing forward direction
        const xBF = (person["Birth"]["Use"] - yearEarliest) * ptsPerYear;
        const xDF = (person["Death"]["Use"] - yearEarliest) * ptsPerYear;
        const xUF = (ttreeFamilies[person["ChildIn"]]["Status"]["Use"] - yearEarliest) * ptsPerYear;
        blocksFwd += `<svg id="personBarF-${i}" x="0" y="${barY}">`;
        blocksFwd +=    `<rect x="${xBF}" y="4" width="${xDF-xBF}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person["Birth"]["Known"]) blocksFwd += `<rect x="${xBF - 50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        if (!person["Death"]["Known"]) blocksFwd += `<rect x="${xDF}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        blocksFwd +=    `<line x1="${xUF}" y1="9" x2="${xBF+2}" y2="9" class="familyLine"/>`;
        // Add names+dates
        blocksFwd += `<a href="http://wikitree.com/wiki/${person["details"]["Name"]}" class="abar" target="_blank"><text x="${xUF - 10}" y="13" class="barTextF">${gn} ${sn} (${by}-${dy})</text></a>`
        // Add marriage dots
        for (const famIdx of person["ParentIn"]) {
            const fData = ttreeFamilies[famIdx]["Status"];
            const xPF = (fData["Use"] - yearEarliest) * ptsPerYear;
            const mdot = (fData["Married"]) ? ((fData["Known"]) ? "famDot1" : "famDot2" ) : "famDot3";
            blocksFwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        blocksFwd += `</svg>`;

        // Bar when showing backward direction
        const xBB = (yearLatest - person["Birth"]["Use"]) * ptsPerYear;
        const xDB = (yearLatest - person["Death"]["Use"]) * ptsPerYear;
        const xUB = (yearLatest - ttreeFamilies[person["ChildIn"]]["Status"]["Use"]) * ptsPerYear;
        blocksBwd += `<svg id="personBarB-${i}" x="0" y="${barY}">`;
        blocksBwd +=    `<rect x="${xDB}" y="4" width="${xBB-xDB}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person["Birth"]["Known"]) blocksBwd += `<rect x="${xBB}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        if (!person["Death"]["Known"]) blocksBwd += `<rect x="${xDB-50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        blocksBwd +=    `<line x1="${xBB-2}" y1="9" x2="${xUB}" y2="9" class="familyLine"/>`;
        // Add names+dates
        blocksBwd += `<a href="http://wikitree.com/wiki/${person["details"]["Name"]}" class="abar" target="_blank"><text x="${xUB + 10}" y="13" class="barTextB">${gn} ${sn} (${by}-${dy})</text></a>`
        // Add marriage dots
        for (const famIdx of person["ParentIn"]) {
            const fData = ttreeFamilies[famIdx]["Status"];
            const xPF = (yearLatest - fData["Use"]) * ptsPerYear;
            const mdot = (fData["Married"]) ? ((fData["Known"]) ? "famDot1" : "famDot3" ) : "famDot3";
            blocksBwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        blocksBwd += `</svg>`;
    }
    blocksFwd += `</svg>`;
    blocksBwd += `</svg>`;
    blocksMain += blocksFwd; 
    blocksMain += blocksBwd; 


    // Create the vertical family lines
    blocksFwd = `<svg id="mainFamLinesFwd">`;
    blocksBwd = `<svg id="mainFamLinesBwd">`;

    for (let i=0; i<ttreeFamilies.length; i++) {
        const family = ttreeFamilies[i];
        // Create line, but leave Y dimensions until it is displayed
        const xF = (family["Status"]["Use"] - yearEarliest) * ptsPerYear;
        blocksFwd += `<line x1="${xF}" y1="0" x2="${xF}" y2="0" id="familyLinesF-${i}" class="familyLine"/>`;
        // For Bwd version
        const xB = (yearLatest - family["Status"]["Use"]) * ptsPerYear;
        blocksBwd += `<line x1="${xB}" y1="0" x2="${xB}" y2="0" id="familyLinesB-${i}" class="familyLine"/>`;
    }
    blocksFwd += `</svg>`;
    blocksBwd += `</svg>`;
    blocksMain += blocksFwd; 
    blocksMain += blocksBwd; 

    // ---------------------------------------------
    // Add all the items to the DOM

    const svgHeader = document.getElementById("ttreeHeader");
    svgHeader.innerHTML = blocksHeader;

    const svgMain = document.getElementById("ttreeMain");
    svgMain.innerHTML = blocksMain;

    // Set all people to be initially visible
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        person["displayInfo"] = {"row": i, "active":true}
    }
}


//===========================================================================================
// Load all people from wikiTree and sort into relevant order


async function ttreeBuildData() {

    const hdrMsg = document.getElementById("hdrMsg");

    // Retrieve list of people
    console.log(`Retrieving relatives for person with ID=${personId}`);
    const starttime = performance.now();

    // Begin by retrieving all ancestors for the primaryID person
    const ancFields=["Id","Name","Father","Mother"];
    const ancestors_json = await WikiTreeAPI.getAncestors("TimelineTree", personId, ttreeMaxGens, ancFields);
    let ancestorsList = ancestors_json ? Object.values(ancestors_json) : [];
    console.log(`Retrieved ${ancestorsList.length} people in direct tree`);
    hdrMsg.innerHTML = `Retrieved ${ancestorsList.length} direct ancestors (please wait whilst we get everyone else)`;
    if (ancestorsList.length == 0) return false;

    // Find ID of the primary person
    ttreePrimaryID = ancestorsList[0]["Id"];
    // ttreePrimaryID = personId;
    console.log(`Person ${personId} has ID=${ttreePrimaryID}`);
    console.log(ancestorsList[0]);
    
    // Then have to retrieve the relatives of each ancestor (spouse + children)
    let ancestorsIDs = ancestorsList.map(item => item["Id"]);  // Extract Ids of all ancestors
    const relsFields=["Id","PageId","Name","FirstName","MiddleName","LastNameAtBirth","LastNameCurrent",
                "BirthDate","DeathDate","BirthDateDecade", "DeathDateDecade", "BirthLocation","DeathLocation","Gender","IsLiving","Father","Mother",
                "Children","Spouses","Privacy"];
    const relatives_json = await WikiTreeAPI.getRelatives("TimelineTree", ancestorsIDs, relsFields, {getChildren: 1, getSpouses: true});
    let ancestorsDetails = relatives_json ? Object.values(relatives_json) : [];

    
    // Then need to extract all people into a single list with suitable ordering
    extractRelatives(ttreePrimaryID, ancestorsDetails, 0);

    hdrMsg.innerHTML = `Retrieved ${ttreePeople.length} total people (now to sort them)`;

    // Remove any duplicates!
    for (let i=0; i<ttreePeople.length; i++) {
        // Check if there is a match
        for (let j=0; j<ttreePeople.length; j++) {
            if (i==j) continue;
            if (ttreePeople[i]["id"] == ttreePeople[j]["id"]) {
                // If one is a stepParent remove that, otherwise if halfsibling remove, otherwise if sibling remove, other 2nd one.
                let removeID = (j>i) ? j : i;
                if (ttreePeople[j]["type"] == "stepParent") removeID = j;
                else if (ttreePeople[i]["type"] == "stepParent") removeID = i;
                else if (ttreePeople[j]["type"] == "halfSibling") removeID = i;
                else if (ttreePeople[i]["type"] == "halfSibling") removeID = i;
                else if (ttreePeople[j]["type"] == "sibling") removeID = i;
                else if (ttreePeople[i]["type"] == "sibling") removeID = i;
                ttreePeople.splice(removeID,1)
                // And then restart the check
                i=0; j=-1;
            }
        }
    }

    // Mark the original target person
    const keyPerson = ttreePeople.find(item => item.id === ttreePrimaryID);
    keyPerson["type"]="target";


    // ----------------------------------------------------------
    // Then for each person, find all relevant details for display

    // Step 1: For each person: extract core data (Birth and Death info and parents)
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];

        // Determine birthYear
        const by = Number(person["details"]["BirthDate"].substring(0,4));
        const bd = Number(person["details"]["BirthDateDecade"].substring(0,4));
        if (by > 0) person["Birth"] = {"Year":by, "Known":true};
        else if (bd > 0) person["Birth"] = {"Year":bd+10, "Known":false};
        else person["Birth"] = {"Year":null, "Known":false};

        // Determine deathYear
        const dy = Number(person["details"]["DeathDate"].substring(0,4));
        const dd = Number(person["details"]["DeathDateDecade"].substring(0,4));
        const dl = (person["details"]["IsLiving"] == 1);
        if (dy > 0) person["Death"] = {"Year":dy, "Known":true, "IsLiving":dl};
        else if (dd > 0) person["Death"] = {"Year":dd, "Known":false, "IsLiving":dl};
        else person["Death"] = {"Year":null, "Known":false, "IsLiving":dl};
    }
    if (ttreeDebug) console.log(ancestorsDetails);
    if (ttreeDebug) console.log(ttreePeople);


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
        if ((Number(person["details"]["Father"]) == 0) && (Number(person["details"]["Mother"]) == 0)) {
            family = {"Parents"  : [],
                      "Children" : [],
                      "Data"     : {"EarliestBirth": person["Birth"]["Year"], "LatestBirth": person["Birth"]["Year"]},
                      "Status"   : {"Married": false, "Date": null, "Known": false, "Use": null}};
            ttreeFamilies.push(family);
            familyIdx = ttreeFamilies.length - 1;
        }
        else {
            // Then search for an existing family
            for (let j=0; j<ttreeFamilies.length; j++) {
                const parents = ttreeFamilies[j]["Parents"];
                if (isParent(parents, person["details"]["Father"]) && isParent(parents, person["details"]["Mother"])) { familyIdx = j; break; }
            }
            // If no existing family then create a new one
            if (familyIdx == -1) {
                // Create a new family
                family = {"Parents"  : [{"ID": person["details"]["Father"], "Row": ttreePeople.findIndex(item => item["id"] == person["details"]["Father"])},
                                        {"ID": person["details"]["Mother"], "Row": ttreePeople.findIndex(item => item["id"] == person["details"]["Mother"])}],
                        "Children" : [],
                        "Data"     : {"EarliestBirth": person["Birth"]["Year"], "LatestBirth": person["Birth"]["Year"]},
                        "Status"   : {"Married": false, "Date": null, "Known": false, "Use": null}};
                ttreeFamilies.push(family);
                familyIdx = ttreeFamilies.length - 1;
            }
            family = ttreeFamilies[familyIdx];
        }

        // Add this person as a child of the family
        const child = {"ID": person["id"], "Row": i};
        family["Children"].push(child);

        // Then update the family Data
        if (family["Data"]["EarliestBirth"] == null) family["Data"]["EarliestBirth"] = person["Birth"]["Year"];
        else if (person["Birth"]["Year"] < family["Data"]["EarliestBirth"]) family["Data"]["EarliestBirth"] = person["Birth"]["Year"];
        if (family["Data"]["LatestBirth"] == null) family["Data"]["LatestBirth"] = person["Birth"]["Year"];
        else if (person["Birth"]["Year"] > family["Data"]["LatestBirth"]) family["Data"]["LatestBirth"] = person["Birth"]["Year"];

        //Link person to family as a child
        person["ChildIn"] = familyIdx;

        // Link parents to family as parent
        const fatherIdx = ttreePeople.findIndex(item => (item["id"]==person["details"]["Father"]));
        if (fatherIdx >= 0) ttreePeople[fatherIdx]["ParentIn"].add(familyIdx);
        const motherIdx = ttreePeople.findIndex(item => (item["id"]==person["details"]["Mother"]));
        if (motherIdx >= 0) ttreePeople[motherIdx]["ParentIn"].add(familyIdx);
    }


    // Step 3: For each spouse of each person: create a family entry or add details to an existing family

    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        if (!("Spouses" in person["details"])) continue;  // no spouses
        for (let spouseID in person["details"]["Spouses"]) {
            const spouse = ttreePeople.find(item => item["id"] == spouseID);
            if (spouse == undefined) continue;

            let familyIdx = -1;
            // Search for an existing family
            for (let j=0; j<ttreeFamilies.length; j++) {
                const parents = ttreeFamilies[j]["Parents"];
                if (isParent(parents, person["id"]) && isParent(parents, spouseID)) { familyIdx = j; break; }
            }
    
            // Does not exist, so create a family
            if (familyIdx < 0) {
                const family = {"Parents"  : [{"ID": person["id"], "Row": ttreePeople.findIndex(item => item["id"] == person["id"])},
                                            {"ID": spouseID,     "Row": ttreePeople.findIndex(item => item["id"] == spouseID)}],
                              "Children" : [],
                              "Data"     : {"EarliestBirth": null, "LatestBirth": null},
                              "Status"   : {"Married": true, "Date": person["details"]["Spouses"][spouseID]["marriage_date"], "Known": false, "Use": null}};
                ttreeFamilies.push(family);
                familyIdx = ttreeFamilies.length - 1;
                // Link couple to family as parent
                person["ParentIn"].add(familyIdx);
                spouse["ParentIn"].add(familyIdx);
            }
            // Otherwise update the existing family
            else {
                ttreeFamilies[familyIdx]["Status"]["Married"] = true;
                ttreeFamilies[familyIdx]["Status"]["Date"] = person["details"]["Spouses"][spouseID]["marriage_date"];
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
        for (let childID in person["details"]["Children"]) {
            const child = ttreePeople.find(item => item["id"] == childID);

            if ((child["Birth"]["Use"] > 0) && (child["Birth"]["Use"] < firstChildBirth))
                firstChildBirth = child["Birth"]["Use"];
        }
        if (firstChildBirth < currentYear) person["Birth"]["Use"] = firstChildBirth - 30;
    }


    // Step 6: Check for Families with same "Use" date
    // ### TO BE ADDED (really only affects display)

    if (ttreeDebug) console.log(ttreeFamilies);


    // Step 7: And finally, update details for "private" people
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];

        if (Number(person["details"]["Privacy"])<50 && !("FirstName" in person["details"]))
            person["FirstName"] = "(private)";
        else
            person["FirstName"] = person["details"]["FirstName"];
    }

    // And finally, log the processing time
    const elapsedTime = performance.now() - starttime;
    console.log(`Retrieved ${ttreePeople.length} total people in tree`);
    console.log(`Total elapsed time : ${elapsedTime}ms.`);
    hdrMsg.innerHTML = `OK, all done (${elapsedTime} mSec)`;

    return true;
}


//===================================================================================
// Extract and order relatives


function extractRelatives(startID, ancestorsDetails, gen) {

    const keyPerson = ancestorsDetails.find(item => item.user_id === startID);
    if (typeof keyPerson === 'undefined') return [];

    const fathersID = keyPerson["person"]["Father"]
    const fatherPerson = ancestorsDetails.find(item => item.user_id === fathersID);
    const mothersID = keyPerson["person"]["Mother"]
    const motherPerson = ancestorsDetails.find(item => item.user_id === mothersID);

    // Add fathers relatives
    extractRelatives(fathersID, ancestorsDetails, gen+1);

    // Add other spouses of mother
    if (typeof motherPerson != 'undefined') {
        const mothersSpouses = motherPerson["person"]["Spouses"]
        let husbands = [];
        for (const spouseID in mothersSpouses) {
            if (spouseID != fathersID) {
                husbands.push({"id": mothersSpouses[spouseID]["Id"], "details": mothersSpouses[spouseID], "type": "stepParent", "generation": gen+1, "ParentIn": new Set([])});
                // if (ttreeDEBUG) console.log("Added other husband=" + spouseID)
            }
        }
        ttreePeople.push(...husbands);
    }

    // Add all siblings including self (from each parent - then remove duplicates, then order)
    let siblings=[];
    let siblingsSorted=[];
    // add self
    const keyPersonDetails = keyPerson["person"];
    siblings.push({"id": startID, "details":keyPersonDetails, "generation": gen, "ParentIn": new Set([])});

    // add siblings (via father)
    if (typeof fatherPerson != 'undefined') {
        const fathersChildren = fatherPerson["person"]["Children"]
        let children = [];
        for (const childID in fathersChildren) {
            children.push({"id": fathersChildren[childID]["Id"], "details": fathersChildren[childID], "generation": gen, "ParentIn": new Set([])});
        }
        siblings.push(...children);
    }
    // add siblings (via mother)
    if (typeof motherPerson != 'undefined') {
        const mothersChildren = motherPerson["person"]["Children"]
        let children = [];
        for (const childID in mothersChildren) {
            children.push({"id": mothersChildren[childID]["Id"], "details": mothersChildren[childID], "generation": gen, "ParentIn": new Set([])});
        }
        siblings.push(...children);
    }
    // check that each sibling has a DOB
    for (let i=0; i<siblings.length; i++) {
        if (!("BirthDate" in siblings[i]["details"])) siblings[i]["details"]["BirthDate"] = "0000";
        if (!("DeathDate" in siblings[i]["details"])) siblings[i]["details"]["DeathDate"] = "0000";
    }

    // sort and remove duplicates
    while (siblings.length > 0) {
        // Start by finding the oldest of all unsorted siblings
        let oldestSibling = 0;
        let iSibling;
        for (iSibling=1; iSibling<siblings.length; iSibling++) {
            if (siblings[iSibling]["details"]["BirthDate"].substring(0,4) < siblings[oldestSibling]["details"]["BirthDate"].substring(0,4)) oldestSibling = iSibling;
        }
        // Then remove this sibling from the unsorted list
        const siblingToMove = siblings[oldestSibling];
        siblings.splice(oldestSibling,1);
        // check that this isn't a duplicate, and if so then just dump this one.
        let isDuplicate = false;
        for (iSibling=0; iSibling<siblingsSorted.length; iSibling++) if (siblingsSorted[iSibling]["id"] == siblingToMove["id"]) isDuplicate=true;
        if (isDuplicate) continue;
        // then check type
        if (siblingToMove["id"] == startID)
            siblingToMove["type"]="ancestor";
        else if ((siblingToMove["details"]["Father"]== keyPersonDetails["Father"]) && (siblingToMove["details"]["Mother"]== keyPersonDetails["Mother"]))
            siblingToMove["type"]="sibling";
        else
            siblingToMove["type"]="halfSibling";
        // And finally add them to the sorted list
        siblingsSorted.push(siblingToMove);
    }
    ttreePeople.push(...siblingsSorted);
        

    // Add other spouses of father
    if (typeof fatherPerson != 'undefined') {
        const fathersSpouses = fatherPerson["person"]["Spouses"]
        let wives = [];
        for (const spouseID in fathersSpouses) {
            if (spouseID != mothersID) {
                wives.push({"id": fathersSpouses[spouseID]["Id"], "details": fathersSpouses[spouseID], "type": "stepParent", "generation": gen+1, "ParentIn": new Set([])});
                // if (ttreeDebug) console.log("Added other wife=" + spouseID)
            }
        }
        ttreePeople.push(...wives);
    }

    // Add mothers relatives
    extractRelatives(mothersID, ancestorsDetails, gen+1);
}
