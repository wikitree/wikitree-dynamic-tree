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
 * 
 */


//===================================================================================
// Key parameters and data

const ttreeMaxGens = 8;
const ttreeDebug = true;

let ptsPerYear = 5
let gridGap = 25;

let headerHeight = 40;
let rowHeight = 16;

var currentYear;
var ttreePrimaryID;
var ttreePeople   = [];

var dispTextWidthShort;
var dispTextWidthLong;
var dispTextWidth;
var dispYearsWidth;
var dispTextHeight;

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

        let controlBlock = `
            <div id="controlBlock" class="ttree-not-printable" style="position:sticky; top:1;">
                <label title="The number of generations to show">Gens:&nbsp;</label>
                <select id="paramGens" title="Number of generations">
                  <option value="2">2</option>
                  <option value="3" selected>3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>&nbsp;&nbsp;
                <label title="The level of data to display for each person">Person data:&nbsp;</label>
                <select id="paramData" title="Level of data">
                  <option value="None">None</option>
                  <option value="Short" selected>Short</option>
                  <option value="Full">Full</option>
                </select>&nbsp;&nbsp;
                <label>Include siblings:&nbsp;</label><input type="checkbox" id="paramSiblings" checked>&nbsp;&nbsp;&nbsp;&nbsp;
                <label>Flip timeline:&nbsp;</label><input type="checkbox" id="paramFlip">&nbsp;&nbsp;&nbsp;&nbsp;
                <button id="help-button" class="btn btn-secondary btn-sm" title="About this application."><b>?</b></button>
            </div>`;

        wtViewRegistry.setInfoPanel(controlBlock);
        wtViewRegistry.showInfoPanel();
        const ttree = new TimelineTree(container_selector, person_id);
     }
};


//===================================================================================
// Class timelineTree

export class TimelineTree {

    constructor(selector, person_id) {

        this.selector = selector;
        ttreePrimaryID = person_id;

        let now = new Date();
        currentYear = now.getFullYear();

        // $(selector).attr("height,500")
        $(selector).html(`
            <div id="ttreeContainer" class="ttree-printable">
                <svg id="ttreeHeader" y="0" width="2000">
                    <rect x="0" y="0" width="500" height="40" class="headerRow"/>
                    <text x="10" y="20" font-size="20">Please wait ... Loading data</text>
                </svg>
                <svg id="ttreeMain" y="100" width="2000"></svg>
            </div>`);
        
        // Now build the tree and the display components
        TimelineTree.generateTree();

        // Generate a new tree when requested
        $("#paramGens").change(TimelineTree.refreshDisplay);
        $("#paramData").change(TimelineTree.updateDisplay);
        $("#paramFlip").change(TimelineTree.updateDisplay);
        $("#paramSiblings").change(TimelineTree.updateSiblingsDisplay);
    }

//===================================================================================
// Class TimelineTree: refresh the display of the tree

static refreshDisplay (event) {

    let gens = $("#paramGens").val();
    let sibs = $("#paramSiblings").prop("checked");

    // Determine who to show
    //   All people from gen 1 to gen n-1
    //   Only direct ancestors at gen    
    for (var i=0; i<ttreePeople.length; i++) {
        if (ttreePeople[i]["generation"] < gens)
            ttreePeople[i]["displayInfo"]["active"] = true;
        else if ((ttreePeople[i]["generation"] == gens) && (ttreePeople[i]["type"] ==    "ancestor"))
            ttreePeople[i]["displayInfo"]["active"] = true;
        else
            ttreePeople[i]["displayInfo"]["active"] = false;
    }

    TimelineTree.updateSiblingsDisplay(event);
}   


//===================================================================================
// Class TimelineTree: update display of tree

    static updateSiblingsDisplay (event) {

        let paramSiblings = $("#paramSiblings").prop("checked")

        // Turn on/off siblings
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
            const sibTypes = ["sibling", "halfSibling", "xxstepParent"];

            if (sibTypes.includes(person["type"])) {
                if (!paramSiblings)
                    person["displayInfo"]["active"] = false;
                else if ((person["Father"]["Row"]>=0) && (ttreePeople[person["Father"]["Row"]]["displayInfo"]["active"])) 
                    ttreePeople[i]["displayInfo"]["active"] = true;
                else if ((person["Mother"]["Row"]>=0) && (ttreePeople[person["Mother"]["Row"]]["displayInfo"]["active"])) 
                    person["displayInfo"]["active"] = true;
                else
                    person["displayInfo"]["active"] = false;
            }                
        }

        TimelineTree.updateDisplay(event);
    }   

//===================================================================================
// Class TimelineTree: update display of tree

    static updateDisplay (event) {

        // Determine the display row for each person
        var displayRow = 0;
        for (var i=0; i<ttreePeople.length; i++) {
            if (ttreePeople[i]["displayInfo"]["active"]) {
                ttreePeople[i]["displayInfo"]["row"] = displayRow;
                displayRow += 1;
            }
        }

        // For each person: show/hide and adjust location of their details
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];

            var show = person["displayInfo"]["active"] ? 'show' : 'hidden';
            var elem;

            // Show text info
            var y = (person["displayInfo"]["row"] * rowHeight) + 14;
            elem = document.getElementById(`personTextS-${i}`);  elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
            elem = document.getElementById(`personTextL-${i}`);  elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
            // Show bars
            elem = document.getElementById(`personBarF-${i}`);   elem.setAttribute('visibility', show);  elem.setAttribute('y', y);
            elem = document.getElementById(`personBarB-${i}`);   elem.setAttribute('visibility', show);  elem.setAttribute('y', y);

            // Show family lines
            var y1  = (person["displayInfo"]["row"] * rowHeight) + 23;
            let y2F = ((person["Father"]["Row"] >= 0) && ttreePeople[person["Father"]["Row"]]["displayInfo"]["active"]) ? (ttreePeople[person["Father"]["Row"]]["displayInfo"]["row"] * rowHeight + 26) : y1 - 3;
            let y2M = ((person["Mother"]["Row"] >= 0) && ttreePeople[person["Mother"]["Row"]]["displayInfo"]["active"]) ? (ttreePeople[person["Mother"]["Row"]]["displayInfo"]["row"] * rowHeight + 26) : y1 + 3;
     
            elem = document.getElementById(`familyLinesF-${i}`);  elem.setAttribute('visibility', show);
            elem = document.getElementById(`familyLinesFF-${i}`); elem.setAttribute('y1', y1); elem.setAttribute('y2', y2F);
            elem = document.getElementById(`familyLinesFM-${i}`); elem.setAttribute('y1', y1); elem.setAttribute('y2', y2M);
            elem = document.getElementById(`familyLinesB-${i}`);  elem.setAttribute('visibility', show);
            elem = document.getElementById(`familyLinesBF-${i}`); elem.setAttribute('y1', y1); elem.setAttribute('y2', y2F);
            elem = document.getElementById(`familyLinesBM-${i}`); elem.setAttribute('y1', y1); elem.setAttribute('y2', y2M);
        }

        // Retrieve dispay parameters
        let paramData     = $("#paramData").val()
        let paramFlip = $("#paramFlip").prop("checked")

        // Get display elements that can be displayed
        let elemAll = document.getElementById("ttreeContainer");
        let elemH   = document.getElementById("ttreeHeader");
        let elemM   = document.getElementById("ttreeMain");

        let elemHTL = document.getElementById("hdrTextLong");
        let elemHTS = document.getElementById("hdrTextShort");
        let elemHYF = document.getElementById("hdrYearsFwd");
        let elemHYB = document.getElementById("hdrYearsBwd");
        let elemMTL = document.getElementById("mainTextLong");
        let elemMTS = document.getElementById("mainTextShort");
        let elemMBF = document.getElementById("mainBarFwd");
        let elemMBB = document.getElementById("mainBarBwd");
        let elemFlinesF = document.getElementById("mainFamLinesFwd");
        let elemFlinesB = document.getElementById("mainFamLinesBwd");


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
        // Show relevant header years
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
        var totalWidth = Number(dispTextWidth + dispYearsWidth);
        var totalHeight = displayRow * 16 + 40;
        elemAll.setAttribute("width", totalWidth);
        elemH.setAttribute("width", totalWidth);
        elemM.setAttribute("width", totalWidth);
        elemM.style.height = totalHeight;

    }


//===================================================================================

    static async generateTree (event) {
    
        ttreePeople = [];
        var paramFlip = false;
 
        // ---------------------------------------------
        // Load and format data via API 
    
        var valid;
        valid = await ttreeBuildData();
        if (!valid) {
            document.getElementById("ttreeHeader").innerHTML = '<text x="10" y="20" font-size="20">No valid person</text>';
            // document.getElementById("ttreeMain").innerHTML   = '<text x="10" y="20" font-size="20">No valid person</text>';
            return;
        } 

        // ---------------------------------------------
        // Need to build the display components...

        // ---------------------------------------------
        // Placeholders for display elements
        var blocksHeader ="";
        var blocksMain = "";


        // ---------------------------------------------
        // Then find the earliest and latest years

        var yearEarliest = currentYear, yearLatest = 0;
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
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

        let locsShort = [0, 35, 135, 260, 360, 460];
        let labsShort = ["Gen", "Fam Name", "Given Name", "Birth date", "Death date", ""];
        let locsLong  = [0, 35, 95, 195, 320, 420, 750, 850, 1140];
        let labsLong  = ["Gen", "Sex", "Fam Name", "Given Name", "Birth date", "Birth location", "Death date", "Death Location", ""];

        // Short Header
        dispTextWidthShort = locsShort.at(-1);
        blocksHeader += `<svg id="hdrTextShort">`;
        blocksHeader += `<rect x="0" y="0" width="${dispTextWidthShort}" height="${headerHeight}" class="headerRow"/>`;
        for (var i=0; i<locsShort.length; i++)
            blocksHeader += `<text x="${+locsShort[i] + 5}" y="13" class="headerText1">${labsShort[i]}</text>`;
        blocksHeader += `</svg>`;

        // Long Header
        dispTextWidthLong = locsLong.at(-1);
        blocksHeader += `<svg id="hdrTextLong">`;
        blocksHeader += `<rect x="0" y="0" width="${dispTextWidthLong}" height="${headerHeight}" class="headerRow"/>`;
        for (var i=0; i<locsLong.length; i++)
            blocksHeader += `<text x="${+locsLong[i] + 5}" y="13" class="headerText1">${labsLong[i]}</text>`;
        blocksHeader += `</svg>`;

        // ---------------------------------------------
        // Build colored rows

        var rowY, rowClass, alternate = 0;
        blocksMain += `<svg id="mainRows">`;
        for (var i=0; i<ttreePeople.length; i++) {
            alternate = (alternate+1)%2;
            // Add in row background
            if (alternate==0) rowClass = "rowEven"; else rowClass = "rowOdd";
            rowY = (i * rowHeight)+15;
            blocksMain += `<rect x="0" y="${rowY}" width="10000" height="${rowHeight}" class="${rowClass}"/>`;
        }
        blocksMain += `</svg>`;

        // ---------------------------------------------
        // Build the Header Years

        var yearGrid;

        // Forward version (earliest year left)
        blocksHeader  += `<svg id="hdrYearsFwd">`;
        blocksHeader += `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
        blocksHeader += `<text x="5" y="13" class="headerText1">Timeline</text>`;
        yearGrid = yearEarliest+25;
        while (yearGrid < yearLatest) {
            blocksHeader += `<text x="${(yearGrid - yearEarliest)*ptsPerYear - 15}" y="33" class="headerText2">${yearGrid}</text>`;
            yearGrid += gridGap;
        }
        blocksHeader += `</svg>`;

        // Reverse version (latest year left)
        blocksHeader += `<svg id="hdrYearsBwd">`;
        blocksHeader += `<rect x="0" y="0" width="${dispYearsWidth}" height="${headerHeight}" class="headerRow"/>`;
        blocksHeader += `<text x="5" y="13" class="headerText1">Timeline</text>`;
        yearGrid = yearLatest-25;
        while (yearGrid > yearEarliest) {
            blocksHeader += `<text x="${(yearLatest - yearGrid)*ptsPerYear - 15}" y="33" class="headerText2">${yearGrid}</text>`;
            yearGrid -= gridGap;
        }
        blocksHeader += `</svg>`;

        // ---------------------------------------------
        // Build People Text (short version and long version)

        // Short version of text
        var rowY;
        blocksMain += `<svg id="mainTextShort">`;
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
            rowY = (i * rowHeight) + 14;
            blocksMain += `<svg id="personTextS-${i}" x="0" y="${rowY}">`;
            blocksMain +=   `<text x="${+locsShort[0] + +5}" y="13" class="gridText">${person["generation"]}</text>`;
            blocksMain +=   `<text x="${+locsShort[1] + +5}" y="13" class="gridText">${person["details"]["LastNameAtBirth"]}</text>`;
            blocksMain +=   `<text x="${+locsShort[2] + +5}" y="13" class="gridText">${person["FirstName"]}</text>`;
            blocksMain +=   `<text x="${+locsShort[3] + +5}" y="13" class="gridText">${person["details"]["BirthDate"]}</text>`;
            blocksMain +=   `<text x="${+locsShort[4] + +5}" y="13" class="gridText">${person["details"]["DeathDate"]}</text>`;
            blocksMain += `</svg>`;
        }
        blocksMain += `</svg>`;
        
        // Long version of text
        blocksMain += `<svg id="mainTextLong">`;
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
            rowY = (i * rowHeight) + 14;
            blocksMain += `<svg id="personTextL-${i}" x="0" y="${rowY}">`;
            blocksMain +=   `<text x="${+locsLong[0] + +5}" y="13" class="gridText">${person["generation"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[1] + +5}" y="13" class="gridText">${person["details"]["Gender"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[2] + +5}" y="13" class="gridText">${person["details"]["LastNameAtBirth"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[3] + +5}" y="13" class="gridText">${person["FirstName"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[4] + +5}" y="13" class="gridText">${person["details"]["BirthDate"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[5] + +5}" y="13" class="gridText">${person["details"]["BirthLocation"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[6] + +5}" y="13" class="gridText">${person["details"]["DeathDate"]}</text>`;
            blocksMain +=   `<text x="${+locsLong[7] + +5}" y="13" class="gridText">${person["details"]["DeathLocation"]}</text>`;
            blocksMain += `</svg>`;
        }
        blocksMain += `</svg>`;
    

        // ---------------------------------------------
        // Build People Timeline Bars (Fwd and Bwd version)

        // Add formatting info for the fade out on time timeline bars

        var barColourM0="#2222FF", barColourM1="#8888FF", barColourM2="#CCCCFF";
        var barColourF0="#FF2222", barColourF1="#FF8888", barColourF2="#FFCCCC";
        var barColourX0="#222222", barColourX1="#888888", barColourX2="#CCCCCC";
        
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

        var rowY;
        var blocksFwd = `<svg id="mainBarFwd">`;
        var blocksBwd = `<svg id="mainBarBwd">`;
        var yearGrid;

        // Gridlines - Forward version (earliest year left)
        blocksFwd += `<svg id="mainGridlinesFwd">`;
        yearGrid = yearEarliest+25;
        while (yearGrid < yearLatest) {
            if ((yearGrid%100)==0) blocksFwd += `<line x1="${(yearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(yearGrid - yearEarliest)*ptsPerYear}" y2="20000" class="gridLine2"/>`;
            else                   blocksFwd += `<line x1="${(yearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(yearGrid - yearEarliest)*ptsPerYear}" y2="20000" class="gridLine3"/>`;
            yearGrid += gridGap;
        }
        blocksFwd += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
        blocksFwd += `</svg>`;

        // Gridlines - Reverse version (latest year left)
        blocksBwd += `<svg id="mainGridlinesBwd">`;
        yearGrid = yearLatest-25;
        while (yearGrid > yearEarliest) {
            if ((yearGrid%100)==0) blocksBwd += `<line x1="${(yearLatest - yearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - yearGrid)*ptsPerYear}" y2="20000" class="gridLine2"/>`;
            else                   blocksBwd += `<line x1="${(yearLatest - yearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - yearGrid)*ptsPerYear}" y2="20000" class="gridLine3"/>`;
            yearGrid -= gridGap;
        }
        blocksBwd += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
        blocksBwd += `</svg>`;
        
        // Now create the bar for each person
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
            var barY = (i * rowHeight) + 14;
            var sn = person["details"]["LastNameAtBirth"]; if (sn == "Unknown") sn = "?";
            var gn = person["FirstName"]; if (gn == "Unknown") gn = "?";
            var by = person["Birth"]["Use"]; if (!person["Birth"]["Known"]) by = "?";
            var dy = person["Death"]["Use"]; if (!person["Death"]["Known"]) dy = "?";

            var barColour, barDef;
            if (person["type"] == "target") {
                switch (person["details"]["Gender"]) {
                    case "Male"   : barColour = barColourM0; barDef = "#gradM0"; break;
                    case "Female" : barColour = barColourF0; barDef = "#gradF0";  break;
                    default       : barColour = barColourX0; barDef = "#gradX0"; 
                }
            }
            else if ((person["type"] == "sibling") || (person["type"] == "ancestor")) {
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

            let xBF = (person["Birth"]["Use"] - yearEarliest) * ptsPerYear;
            let xDF = (person["Death"]["Use"] - yearEarliest) * ptsPerYear;
            let xUF = (person["Family"]["Use"] - yearEarliest) * ptsPerYear;
            blocksFwd += `<svg id="personBarF-${i}" x="0" y="${barY}">`;
            blocksFwd +=    `<rect x="${xBF}" y="4" width="${xDF-xBF}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
            if (!person["Birth"]["Known"]) blocksFwd += `<rect x="${xBF - 50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
            if (!person["Death"]["Known"]) blocksFwd += `<rect x="${xDF}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
            blocksFwd +=    `<line x1="${xUF}" y1="9" x2="${xBF}" y2="9" class="familyLine"/>`;
            // Add names+dates
            blocksFwd += `<text x="${xUF - 10}" y="13" class="barTextF">${gn} ${sn} (${by}-${dy})</text>`
            // Add marriage dots
            for (var j=0; j<person["Families"].length; j++) {
                if ((person["Families"][j]["PartnerRow"]<0) && (!person["Families"][j]["HasChildren"])) continue;
                let xPF = (person["Families"][j]["Use"] - yearEarliest) * ptsPerYear;
                blocksFwd += `<circle cx="${xPF}" cy="9" r="3" class="${person["Families"][j]["Married"] ? "famMarried" : "famNotMarried"}"/>`;
            }
            blocksFwd += `</svg>`;

            let xBB = (yearLatest - person["Birth"]["Use"]) * ptsPerYear;
            let xDB = (yearLatest - person["Death"]["Use"]) * ptsPerYear;
            let xUB = (yearLatest - person["Family"]["Use"]) * ptsPerYear;
            blocksBwd += `<svg id="personBarB-${i}" x="0" y="${barY}">`;
            blocksBwd +=    `<rect x="${xDB}" y="4" width="${xBB-xDB}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
            if (!person["Birth"]["Known"]) blocksBwd += `<rect x="${xBB}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
            if (!person["Death"]["Known"]) blocksBwd += `<rect x="${xDB-50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
            blocksBwd +=    `<line x1="${xBB}" y1="9" x2="${xUB}" y2="9" class="familyLine"/>`;
            // Add names+dates
            blocksBwd += `<text x="${xUB + 10}" y="13" class="barTextB">${gn} ${sn} (${by}-${dy})</text>`
            // Add marriage dots
            for (var j=0; j<person["Families"].length; j++) {
                if ((person["Families"][j]["PartnerRow"]<0) && (!person["Families"][j]["HasChildren"])) continue;
                let xPB = (yearLatest - person["Families"][j]["Use"]) * ptsPerYear;
                blocksBwd += `<circle cx="${xPB}" cy="9" r="3" class="${person["Families"][j]["Married"] ? "famMarried" : "famNotMarried"}"/>`;
            }
            blocksBwd += `</svg>`;
        }
        blocksFwd += `</svg>`;
        blocksBwd += `</svg>`;
        blocksMain += blocksFwd; 
        blocksMain += blocksBwd; 


        // And create the lines joining person to parents
        var blocksFwd = `<svg id="mainFamLinesFwd">`;
        var blocksBwd = `<svg id="mainFamLinesBwd">`;
        var yearGrid;

        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];

            let y1 = (i * rowHeight) + 23;
            let y2F = (person["Father"]["Row"] >= 0) ? (person["Father"]["Row"] * rowHeight + 26) : y1 - 3;
            let y2M = (person["Mother"]["Row"] >= 0) ? (person["Mother"]["Row"] * rowHeight + 20) : y1 + 3;

            // For Fwd version
            let xF = (person["Family"]["Use"] - yearEarliest) * ptsPerYear;
            blocksFwd += `<svg id="familyLinesF-${i}">`;
            blocksFwd +=    `<line x1="${xF}" y1="${y1}" x2="${xF}" y2="${y2F}" id="familyLinesFF-${i}" class="familyLine"/>`;
            blocksFwd +=    `<line x1="${xF}" y1="${y1}" x2="${xF}" y2="${y2M}" id="familyLinesFM-${i}" class="familyLine"/>`;
            blocksFwd += `</svg>`;
            // For Bwd version
            let xB = (yearLatest - person["Family"]["Use"]) * ptsPerYear;
            blocksBwd += `<svg id="familyLinesB-${i}">`;
            blocksBwd +=    `<line x1="${xB}" y1="${y1}" x2="${xB}" y2="${y2F}" id="familyLinesBF-${i}" class="familyLine"/>`;
            blocksBwd +=    `<line x1="${xB}" y1="${y1}" x2="${xB}" y2="${y2M}" id="familyLinesBM-${i}" class="familyLine"/>`;
            blocksBwd += `</svg>`;
        }

        blocksFwd += `</svg>`;
        blocksBwd += `</svg>`;
        blocksMain += blocksFwd; 
        blocksMain += blocksBwd; 
    
        // === MORE HERE ===


        // ---------------------------------------------
        // Add all the items to the DOM

        let svgHeader = document.getElementById("ttreeHeader");
        svgHeader.innerHTML = blocksHeader;

        let svgMain = document.getElementById("ttreeMain");
        svgMain.innerHTML = blocksMain;

        // Set all people to be initially visible
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
            person["displayInfo"] = {"row": i, "active":true}
        }

        // And finally, do an initial display   
        TimelineTree.refreshDisplay();
    }

}


//===================================================================================
// Load all people 

async function ttreeBuildData() {
    // Retrieve list of people
    console.log(`Retrieving relatives for person with ID=${ttreePrimaryID}`);
    let starttime = performance.now();

    // Begin by retrieving all ancestors for the primaryID person
    var fields=["Id","Name","Father","Mother"];
    const ancestors_json = await WikiTreeAPI.getAncestors("TimelineTree", ttreePrimaryID, ttreeMaxGens, fields);
    let ancestorsList = ancestors_json ? Object.values(ancestors_json) : [];
    console.log(`Retrieved ${ancestorsList.length} people in direct tree`);
    if (ancestorsList.length == 0) return false;

    // Then have to retrieve the relatives of each ancestor (spouse + children)
    let ancestorsIDs = ancestorsList.map(item => item["Id"]);  // Extract Ids of all ancestors
    var fields=["Id","PageId","Name","FirstName","MiddleName","LastNameAtBirth","LastNameCurrent",
                "BirthDate","DeathDate","BirthDateDecade", "DeathDateDecade", "BirthLocation","DeathLocation","Gender","IsLiving","Father","Mother",
                "Children","Spouses","Privacy"];
    const relatives_json = await WikiTreeAPI.getRelatives("TimelineTree", ancestorsIDs, fields, {getChildren: 1, getSpouses: true});
    let ancestorsDetails = relatives_json ? Object.values(relatives_json) : [];
    if (ttreeDebug) console.log(ancestorsDetails);

    
    // Then need to extract all people into a single list with suitable ordering
    extractRelatives(ttreePrimaryID, ancestorsDetails, 1);
    if (ttreeDebug) console.log(ttreePeople);

    // Mark the original target person
    let keyPerson = ttreePeople.find(item => item.id === ttreePrimaryID);
    keyPerson["type"]="target";
    
    // ----------------------------------------------------------
    // Then for each person, find all relevant details for display
    /*
            Birth: {Year, Known, Use}
			Death: {Year, Known, Use}
			Father: {Row, familyIdx}
			Mother: {MotherRow, familyIdx}
			Families: [{PartnerID, PartnerRow,Year,Married,HasChildren,FirstBirth,LastBirth,Use}]
    */

    // Step 1: For each person: extract core data (Birth and Death info)
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        // Determine birthYear and deathYear
        var by = Number(person["details"]["BirthDate"].substring(0,4));
        var bd = Number(person["details"]["BirthDateDecade"].substring(0,4));
        if (by > 0) person["Birth"] = {"Year":by, "Known":true};
        else if (bd > 0) person["Birth"] = {"Year":bd+10, "Known":false};
        else person["Birth"] = {"Year":null, "Known":false};

        var dy = Number(person["details"]["DeathDate"].substring(0,4));
        var dd = Number(person["details"]["DeathDateDecade"].substring(0,4));
        var dl = (person["details"]["IsLiving"] == 1);
        if (dy > 0) person["Death"] = {"Year":dy, "Known":true, "IsLiving":dl};
        else if (dd > 0) person["Death"] = {"Year":dd, "Known":false, "IsLiving":dl};
        else if (!dl) person["Death"] = {"Year":person["Birth"]["Year"] + 30, "Known":false, "IsLiving":dl};
        else person["Death"] = {"Year":null, "Known":false, "IsLiving":dl};
    }

    // Step 2: For each person: add parent details
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        person["Father"] = {"ID": person["details"]["Father"], "Row": ttreePeople.findIndex(item => item["id"] == person["details"]["Father"])};
        person["Mother"] = {"ID": person["details"]["Mother"], "Row": ttreePeople.findIndex(item => item["id"] == person["details"]["Mother"])};

        // Link the parents together
//        person["Father"]["familyIdx"] = person["Mother"]["Row"];
//        person["Mother"]["familyIdx"] = person["Father"]["Row"];
    }

    // Step 3: For each person: create a "family" for which they have spouse
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];
        if (!("Families" in person)) person["Families"]=[];

        // Add family involving no spouse
        var personInfo = {"PartnerID": null, "PartnerRow":-1, "Year":null, "Married":false, "HasChildren":false, "FirstBirth":null, "LastBirth":null};
        person["Families"].push(personInfo);

        // Add family associated with each spouse listed
        for (var spouseID in person["details"]["Spouses"]) {
            let partnerRow = ttreePeople.findIndex(item => item["id"] == spouseID);
            let partner = ttreePeople[partnerRow];
            let year = Number(person["details"]["Spouses"][spouseID]["marriage_date"].substring(0,4));
            var familyInfo = {"PartnerID": spouseID, "PartnerRow":partnerRow, "Year":year, "Married":true, "HasChildren":false, "FirstBirth":null, "LastBirth":null};
            person["Families"].push(familyInfo);

            // If a person was added via a spouse rather than directlu (i.e. is a stepparent), then they won't have spouses listed, so need to add now...
            if ((partnerRow >=0) && (partner["type"] == "stepParent")) {
                var personInfo = {"PartnerID": person["id"], "PartnerRow":i, "Year":year, "Married":true, "HasChildren":false, "FirstBirth":null, "LastBirth":null};
                if (!("Families" in partner)) partner["Families"] = [];
                partner["Families"].push(personInfo);
            }
        }
    }

    // Step 4: For each person: update info for each parents families re earliest/latest birth
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        // For each parent, indicate which family they belong to, and update earliest/latest birth for that family
        let fatherRow = person["Father"]["Row"]; 
        let motherRow = person["Mother"]["Row"]; 

        // Is there a father to update?
        if (fatherRow >= 0) {
            // Find the relevant partner record
            var familyIdx;
            for (familyIdx=0; familyIdx < ttreePeople[fatherRow]["Families"].length; familyIdx++) {
                if (ttreePeople[fatherRow]["Families"][familyIdx]["PartnerRow"] == motherRow) break;
            }
            // Check that there is a matching family, and if not, create one.
            if (familyIdx == ttreePeople[fatherRow]["Families"].length) {
                var familyInfo = {"PartnerID": person["Mother"]["ID"], "PartnerRow":motherRow, "Year":null, "Married":false, "HasChildren":true, "FirstBirth":null, "LastBirth":null};
                ttreePeople[fatherRow]["Families"].push(familyInfo);    
            }
            // Update the Father info to include which spouse is their mother
            person["Father"]["familyIdx"] = familyIdx;
            // And then update the existence of children and earliest/latest birth for the father
            var fatherFamily = ttreePeople[fatherRow]["Families"][familyIdx];
            fatherFamily["HasChildren"] = true; 
            // Was the current person born before the last-born in the family?
            if (fatherFamily["FirstBirth"] == null) fatherFamily["FirstBirth"] = person["Birth"]["Year"];
            else if (person["Birth"]["Year"] < fatherFamily["FirstBirth"]["FirstBirth"]) fatherFamily["FirstBirth"] = person["Birth"]["Year"];
            // Was the current person born after the last-born in the family?
            if (person["Birth"]["Year"] > fatherFamily["LastBirth"]) fatherFamily["LastBirth"] = person["Birth"]["Year"];
        }

        // Is there a mother to update?
        if (motherRow >= 0) {
            // Find the relevant partner record
            var familyIdx;
            for (familyIdx=0; familyIdx < ttreePeople[motherRow]["Families"].length; familyIdx++) {
                if (ttreePeople[motherRow]["Families"][familyIdx]["PartnerRow"] == fatherRow) break;
            }
            // Check that there is a matching family, and if not, create one.
            if (familyIdx == ttreePeople[motherRow]["Families"].length) {
                var familyInfo = {"PartnerID": person["Father"]["ID"], "PartnerRow":fatherRow, "Year":null, "Married":false, "HasChildren":true, "FirstBirth":null, "LastBirth":null};
                ttreePeople[motherRow]["Families"].push(familyInfo);    
            }
            // Update the Father info to include which spouse is their mother
            person["Mother"]["familyIdx"] = familyIdx;
            // And then update the existence of children and earliest/latest birth for the mother
            var motherFamily = ttreePeople[motherRow]["Families"][familyIdx];
            motherFamily["HasChildren"] = true; 
            // Was the current person born before the last-born in the family?
            if (motherFamily["FirstBirth"] == null) motherFamily["FirstBirth"] = person["Birth"]["Year"];
            else if (person["Birth"]["Year"] < motherFamily["FirstBirth"]["FirstBirth"]) motherFamily["FirstBirth"] = person["Birth"]["Year"];
            // Was the current person born after the last-born in the family?
            if (person["Birth"]["Year"] > motherFamily["LastBirth"]) motherFamily["LastBirth"] = person["Birth"]["Year"];
        }
    }

    // Step 5a: For all people update Partner Use dates
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        for (var j=0; j<person["Families"].length; j++) {
            if (person["Families"][j]["Year"] > 0) person["Families"][j]["Use"] = person["Families"][j]["Year"];
            else if (person["Families"][j]["FirstBirth"] > 0) person["Families"][j]["Use"] = person["Families"][j]["FirstBirth"] - 1;
            else if (person["Birth"]["Year"] > 0) person["Families"][j]["Use"] = person["Birth"]["Year"] + 20;
            else person["Families"][j]["Use"] = 0;
        }
    }

    // Step 5b: For all people update Birth and Death Use dates
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        person["Birth"]["Use"] = null;
        // Update Birth Use dates
        if (person["Birth"]["Year"] > 0) person["Birth"]["Use"] = person["Birth"]["Year"];
        // Else use marriage of father
        else if (("familyIdx" in person["Father"]) && (ttreePeople[person.Father.Row]["Families"][person.Father.familyIdx]["Use"] > 0))
            person["Birth"]["Use"] = ttreePeople[person.Father.Row]["Families"][person.Father.familyIdx]["Use"] + 10;
        // Else use marriage of mother
        else if (("familyIdx" in person["Mother"]) && (ttreePeople[person.Mother.Row]["Families"][person.Mother.familyIdx]["Use"] > 0))
            person["Birth"]["Use"] = ttreePeople[person.Mother.Row]["Families"][person.Mother.familyIdx]["Use"] + 10;
        // Else use birth of mother
        else if ((person["Mother"]["Row"] >= 0) && (ttreePeople[person.Mother.Row]["Birth"]["Use"] > 0))
            person["Birth"]["Use"] = ttreePeople[person.Mother.Row]["Birth"]["Use"] + 20;
        // Else use birth of father
        else if ((person["Father"]["Row"] >= 0) && (ttreePeople[person.Father.Row]["Birth"]["Use"] > 0))
            person["Birth"]["Use"] = ttreePeople[person.Father.Row]["Birth"]["Use"] + 20;

        // Update Death Use dates
        if (person["Death"]["Year"] > 0) person["Death"]["Use"] = person["Death"]["Year"];
        else if (person["Death"]["IsLiving"]) person["Death"]["Use"] = currentYear;
        else if (person["Birth"]["Use"] > 0) person["Death"]["Use"] = person["Birth"]["USe"] + 30;
        else person["Death"]["Use"] = null;

        // Check if the Death=Birth, and tweak0
        if (person["Death"]["Use"] == person["Birth"]["Use"]) person["Death"]["Use"] += 1;
    }

    // Step 5C: Update any missing Birth Use dates based on children
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];
        if (person["Birth"]["Use"] > 0) continue;
        var firstChildBirth = currentYear;
        for (var childID in person["details"]["Children"]) {
            var child = ttreePeople.find(item => item["id"] == childID);

            if ((child["Birth"]["Use"] > 0) && (child["Birth"]["Use"] < firstChildBirth))
                firstChildBirth = child["Birth"]["Use"];
        }
        if (firstChildBirth < currentYear) person["Birth"]["Use"] = firstChildBirth - 30;
    }

    // Step 5D: Calculate the date to use for family line
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];
        if (("Father" in person) && (person["Father"]["Row"] >= 0)) {
            person["Family"] = {"Use" : ttreePeople[person["Father"]["Row"]]["Families"][person["Father"]["familyIdx"]]["Use"]};
        }
        else if (("Mother" in person) && (person["Mother"]["Row"] >= 0)) {
            person["Family"] = {"Use" : ttreePeople[person["Mother"]["Row"]]["Families"][person["Mother"]["familyIdx"]]["Use"]};
        }
        else person["Family"] = {"Use" : person["Birth"]["Use"] - 5}; 
    }


    // Step 6: Check for Families with same "Use" date
    // ### TO BE ADDED (really only affects display)

    // Step 7: And finally, update details for "private" people
    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        if (Number(person["details"]["Privacy"])<50 && !("FirstName" in person["details"]))
            person["FirstName"] = "(private)";
        else
            person["FirstName"] = person["details"]["FirstName"];
    }

    // And finally, log the processing time
    let elapsedTime = performance.now() - starttime;
    console.log(`Retrieved ${ttreePeople.length} total people in tree`);
    console.log(`Total elapsed time : ${elapsedTime}ms.`);

    return true;
}


//===================================================================================
// Class TimelineTree: method to extact and order relatives

function extractRelatives(startID, ancestorsDetails, gen) {

    let keyPerson = ancestorsDetails.find(item => item.user_id === startID);
    if (typeof keyPerson === 'undefined') return [];

    let fathersID = keyPerson["person"]["Father"]
    let fatherPerson = ancestorsDetails.find(item => item.user_id === fathersID);
    let mothersID = keyPerson["person"]["Mother"]
    let motherPerson = ancestorsDetails.find(item => item.user_id === mothersID);
    if (TimelineTree.DEBUG) console.log("Checking tree for Person=" + startID + "; Father=" + fathersID + "; Mother=" + mothersID);

    // Add fathers relatives
    extractRelatives(fathersID, ancestorsDetails, gen+1);

    // Add other spouses of mother
    if (typeof motherPerson != 'undefined') {
        let mothersSpouses = motherPerson["person"]["Spouses"]
        var husbands = [];
        for (const spouseID in mothersSpouses) {
            if (spouseID != fathersID) {
                husbands.push({"id": mothersSpouses[spouseID]["Id"], "details": mothersSpouses[spouseID], "type": "stepParent", "generation": gen});
                if (TimelineTree.DEBUG) console.log("Added other husband=" + spouseID)
            }
        }
        ttreePeople.push(...husbands);
    }

    // Add all siblings including self (from each parent - then remove duplicates, then order)
    var siblings=[];
    var siblingsSorted=[];
    // add self
    var keyPersonDetails = keyPerson["person"];
    siblings.push({"id": startID, "details":keyPersonDetails, "generation": gen});

    // add siblings (via father)
    if (typeof fatherPerson != 'undefined') {
        let fathersChildren = fatherPerson["person"]["Children"]
        var children = [];
        for (const childID in fathersChildren) {
            children.push({"id": fathersChildren[childID]["Id"], "details": fathersChildren[childID], "generation": gen});
        }
        siblings.push(...children);
    }
    // add siblings (via mother)
    if (typeof motherPerson != 'undefined') {
        let mothersChildren = motherPerson["person"]["Children"]
        var children = [];
        for (const childID in mothersChildren) {
            children.push({"id": mothersChildren[childID]["Id"], "details": mothersChildren[childID], "generation": gen});
        }
        siblings.push(...children);
    }
    // check that each sibling has a DOB
    for (var i=0; i<siblings.length; i++) {
        if (!("BirthDate" in siblings[i]["details"])) siblings[i]["details"]["BirthDate"] = "0000";
        if (!("DeathDate" in siblings[i]["details"])) siblings[i]["details"]["DeathDate"] = "0000";
    }

    // sort and remove duplicates
    while (siblings.length > 0) {
        // Start by finding the oldest of all unsorted siblings
        var oldestSibling = 0;
        var iSibling;
        for (iSibling=1; iSibling<siblings.length; iSibling++) {
            if (siblings[iSibling]["details"]["BirthDate"].substring(0,4) < siblings[oldestSibling]["details"]["BirthDate"].substring(0,4)) oldestSibling = iSibling;
        }
        // Then remove this sibling from the unsorted list
        var siblingToMove = siblings[oldestSibling];
        siblings.splice(oldestSibling,1);
        // check that this isn't a duplicate, and if so then just dump this one.
        var isDuplicate = false;
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
        let fathersSpouses = fatherPerson["person"]["Spouses"]
        var wives = [];
        for (const spouseID in fathersSpouses) {
            if (spouseID != mothersID) {
                wives.push({"id": fathersSpouses[spouseID]["Id"], "details": fathersSpouses[spouseID], "type": "stepParent", "generation": gen});
                if (TimelineTree.DEBUG) console.log("Added other wife=" + spouseID)
            }
        }
        ttreePeople.push(...wives);
    }

    // Add mothers relatives
    extractRelatives(mothersID, ancestorsDetails, gen+1);
}
