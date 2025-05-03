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
 */



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
        wtViewRegistry.setInfoPanel(TimelineTreeView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const ttree = new TimelineTree(container_selector, person_id);
     }
};

//===================================================================================
// Class timelineTree

export class TimelineTree {

    static DEBUG = true;
    static #helpText = `
        <xx>[ x ]</xx>
        <h2 style="text-align: center">About TimelineTree</h2>
        <p>Use this application to view a tree view of the ancestors of a specific individual, but formatted along a timeline.</p>
        <p><em><b>Warning</b>: This is a work in progress</p>
        <h3>Display and Interaction</h3>
        <ul>
            <li>More info to be provided.</li>
        </ul>
   `;

    static startID = "";

    constructor(selector, person_id) {

        this.selector = selector;
        TimelineTree.startID = person_id;

        $(selector).html(`
        <div id="ttreeContainer" class="ttree">
            <div id="controlBlock" class="ttree-not-printable">
              <div class="mb-1">
                <label for="generation"  title="The number of generations to fetch from WikiTree">Num Generations:&nbsp;</label
                ><select id="paramGens" title="The number of generations to fetch from WikiTree">
                  <option value="2">2</option>
                  <option value="3" selected>3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
                <label>Include siblings:&nbsp;</label><input type="checkbox" id="paramSiblings" checked>
                <label>Flip timeline:&nbsp;</label><input type="checkbox" id="paramFlip">
                <label>Show locations:&nbsp;</label><input type="checkbox" id="paramLocs">
                <button id="generateTree" class="btn btn-primary btn-sm" title="Generate a new tree using current parameters">
                  Generate Tree</button>
                <button id="help-button" class="btn btn-secondary btn-sm" title="About this application.">
                  <b>?</b></button
                ><input id="fileInput" type="file" style="display: none" />
              </div>
              <div id="help-text">${TimelineTree.#helpText}</div>
            </div>
            <div id="svgContainer" class="ttree-printable">
            </div>
        </div>`);

        $("#svgContainer").html("<p>Pending request</p>");

        // Generate a new tree when requested
        $("#generateTree").off("click").on("click", TimelineTree.generateTree);

        // Add click action to help button
        $("#help-button")
            .off("click")
            .on("click", function () {
                if (window.ttreeShowingInfo) {
                    wtViewRegistry.hideInfoPanel();
                    window.ttreeShowingInfo = false;
                }
                $("#help-text").slideToggle();
            });
        $("#help-text").draggable();

        // Add the help text as a pop-up
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
        
        TimelineTree.generateTree();

    }

    //===================================================================================
    // Class TimelineTree: method to create and display tree

    static async generateTree (event) {

        // Building message 
        const timelineSVG = `
            <svg id="svgheader" height="60" width="1000">
                <text x="400" y="40" style="fill:black; font-family:'Sofia', cursive, sans-serif; font-size:24px; font-weight:normal">~~ Family Timeline ~~</text>
            </svg></br>
            <svg id="svgtree" height="100" width="1000">
                <text x="100" y="35" style="fill:black; font-family:Arial, sans-serif; font-size:12px; font-weight:normal">Please wait - loading....</text>
                <defs id="svgdefs"></defs>
            </svg>
        `;
        $("#svgContainer").html(timelineSVG);

        var people = [];
        var families = [];

        // retrieve list of people and families
        await TimelineTree.retrievePeopleList(people, families, TimelineTree.startID,  $("#paramGens").val(), $("#paramSiblings").prop("checked"));
        if (people.length == 0) {
            var svgElem = document.getElementById("svgtree");
            svgElem.innerHTML = '<text x="100" y="35" style="fill:black; font-family:Arial, sans-serif; font-size:14px; font-weight:normal">ERROR - No people retrieved....</text>';
            return;
        }

        // then display...
        TimelineTree.showTree(people, families, TimelineTree.startID, $("#paramFlip").prop("checked"), $("#paramLocs").prop("checked"));
    }

    //===================================================================================
    // Class TimelineTree: method to retrieve all relevant people to be displayed

    static showTree(people, families, startID, paramFlip, paramLocs) {

        var svgText="";

        // Set key formatting parameters
        var labelLoc;
        if (paramLocs) labelLoc = [0, 35, 95, 195, 320, 420, 750, 850, 1140];
        else           labelLoc = [0, 35, 95, 195, 320, 420, 420, 520, 520];
        var labels = ["Gen", "Sex", "Fam Name", "Given Name", "Birth date", "Birth location", "Death date", "Death Location", "Timeline"];

        var barColourM0 = "#2222FF",  barColourF0 = "#FF2222",  barColourX0 = "#222222";
        var barColourM1 = "#8888FF",  barColourF1 = "#FF8888",  barColourX1 = "#888888";
        var barColourM2 = "#CCCCFF",  barColourF2 = "#FFCCCC",  barColourX2 = "#CCCCCC";
        var barBase = labelLoc[8];

        // Add formatting info for the fade out on time timeline bars
        var svgDefs = document.getElementById("svgdefs");
        svgDefs.innerHTML += "<linearGradient id='gradM0a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourM0 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourM0 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradM0b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourM0 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourM0 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradF0a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourF0 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourF0 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradF0b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourF0 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourF0 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradX0a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourX0 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourX0 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradX0b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourX0 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourX0 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradM1a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourM1 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourM1 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradM1b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourM1 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourM1 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradF1a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourF1 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourF1 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradF1b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourF1 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourF1 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradX1a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourX1 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourX1 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradX1b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourX1 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourX1 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradM2a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourM2 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourM2 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradM2b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourM2 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourM2 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradF2a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourF2 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourF2 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradF2b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourF2 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourF2 + ";stop-opacity:0.5' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradX2a' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourX2 + ";stop-opacity:0.5'/><stop offset='100%' style='stop-color:" + barColourX2 + ";stop-opacity:1' /></linearGradient>";
        svgDefs.innerHTML += "<linearGradient id='gradX2b' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:" + barColourX2 + ";stop-opacity:0'/><stop offset='100%' style='stop-color:" + barColourX2 + ";stop-opacity:0.5' /></linearGradient>";
        
        // === Timeline settings ===
        // First, find the earliest and latest years
        var yearCurrent = 2025; // ###
        var yearEarliest = yearCurrent, yearLatest = 0;
        for (var i=0; i<people.length; i++) {
            if ((people[i]["BirthYear"] != "0000") && (people[i]["BirthYear"] < yearEarliest)) yearEarliest = Number(people[i]["BirthYear"]);
            if ((people[i]["BirthYear"] != "0000") && (people[i]["BirthYear"] > yearLatest))   yearLatest   = Number(people[i]["BirthYear"]);
            if ((people[i]["DeathYear"] != "0000") && (people[i]["DeathYear"] < yearEarliest)) yearEarliest = Number(people[i]["DeathYear"]);
            if ((people[i]["DeathYear"] != "0000") && (people[i]["DeathYear"] > yearLatest))   yearLatest   = Number(people[i]["DeathYear"]);
        }
        if (yearEarliest > yearLatest) yearEarliest = yearLatest;
        yearEarliest = yearEarliest - 50;
        yearLatest = yearLatest + 35;
        // Then move to nearest 25 year boundary
        yearEarliest -= (yearEarliest % 25);
        yearLatest   -= (yearLatest % 25);

        var ptsPerYear = 5
        var yearStart = yearLatest;
        var yearEnd = yearEarliest
        
        var gridStart = yearCurrent;
        var gridGap = 25;
        
        var headerHeight = 40;
        var rowHeight = 16;
        var tableWidth = barBase + (yearStart - yearEnd)*ptsPerYear;
        var tableHeight = people.length * rowHeight + headerHeight + 20;

        var txtStyle = 'style="fill:black; font-family:Arial, sans-serif; font-size:11px; font-weight:normal"';

        var svgElem = document.getElementById("svgtree");
        var elemTxt;

        svgElem.setAttribute("height", tableHeight);
        svgElem.setAttribute("width", tableWidth);
        
        // Create header
        svgText += '<rect x="0" y="0" width="' + tableWidth + '" height="' + headerHeight + '" style="fill:#26ADEA;stroke-width:0"/>';
        for (var i=0; i<labelLoc.length; i++) {
            if (!paramLocs && (i==5 || i==7)) continue;
            var rowX = labelLoc[i] + 5;
            var elemTxt = '<text x="' + rowX + '" y="13" style="fill:white; font-family:Arial, sans-serif; font-size:14px; font-weight:normal">' + labels[i] + '</text>';
            svgText += elemTxt;
        }

        // Create marker rows
        var alternate = 0;
        var rowY, rowColour;
        elemTxt = "";
        for (var i=0; i<people.length; i++) {
            // Add in row background
            if (alternate==0) rowColour = "#FFFFFF"; else rowColour = "#EEEEFF";
            alternate = (alternate+1)%2;
            rowY = (i * rowHeight) + headerHeight;
            elemTxt += '<rect x="0" y="' + rowY + '" width="' + tableWidth + '" height="' + rowHeight + '" style="fill:' + rowColour + ';stroke-width:0"/>';
        }
        svgText += elemTxt;			

        // create grid lines
        var gridYear = gridStart, gridY1 = headerHeight, gridY2 = tableHeight;
        elemTxt = "";
        while (gridYear > yearEnd) {
            var gridX = barBase + (yearStart-gridYear)*ptsPerYear;
            if ((gridYear%100)==0) elemTxt += "<line x1='" + gridX + "' y1='" + gridY1 + "' x2='" + gridX + "' y2='" + gridY2 + "' style='stroke:#BBBBBB;stroke-width:1' stroke-dasharray='3,3'/>";
            else                   elemTxt += "<line x1='" + gridX + "' y1='" + gridY1 + "' x2='" + gridX + "' y2='" + gridY2 + "' style='stroke:#DDDDDD;stroke-width:1' stroke-dasharray='3,3'/>";
            var gridXtext = gridX - 15;
            elemTxt += '<text x="' + gridXtext + '" y="33" ' + txtStyle + '>' + gridYear + '</text>';
            gridYear -= gridGap;
        }
        gridX = barBase + (yearStart-yearCurrent)*ptsPerYear;
        elemTxt += '<line x1="' + gridX + '" y1="' + gridY1 + '" x2="' + gridX + '" y2="' + gridY2 + '" style="stroke:#222222;stroke-width:2"/>';
        svgText += elemTxt;

        // Add in people details and time bars
        elemTxt = "";
        for (i=0; i<people.length; i++) {
            var p = people[i];

            rowY = (i * rowHeight) + headerHeight;

            // Add in row text elements
            rowY = (i * rowHeight) + headerHeight + 13;
            rowX = labelLoc[0] + 5; if (p["generation"] != null)                   elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["generation"] + '</text>';
            rowX = labelLoc[1] + 5; if (p["details"]["Gender"] != null)            elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["Gender"] + '</text>';
            rowX = labelLoc[2] + 5; if (p["details"]["LastNameAtBirth"] != null)   elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["LastNameAtBirth"] + '</text>';
            rowX = labelLoc[3] + 5; if (p["details"]["FirstName"] != null)         elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["FirstName"] + '</text>';
            rowX = labelLoc[4] + 5; if (p["details"]["BirthDate"] != null)         elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["BirthDate"] + '</text>';
            if (paramLocs) { rowX = labelLoc[5] + 5; if (p["details"]["BirthLocation"] != null)     elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["BirthLocation"] + '</text>'; }
            rowX = labelLoc[6] + 5; if (p["details"]["DeathDate"] != null)         elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["DeathDate"] + '</text>';
            if (paramLocs) { rowX = labelLoc[7] + 5; if (p["details"]["DeathLocation"] != null)     elemTxt += '<text x="' + rowX + '" y="' + rowY + '" ' + txtStyle + '>' + p["details"]["DeathLocation"] + '</text>';	}

            // Add in timeline bar
            // extract year information
            var deathExt = false;
            if (p["DeathYear"] == null) deathExt = true;
            else if (p["DeathYear"]=="0000") deathExt = true;

            var barColour, barDef;
            if (p["type"] == "target") {
                switch (p["details"]["Gender"]) {
                    case "Male" : barColour = barColourM0; barDef = "#gradM0"; break;
                    case "Female" : barColour = barColourF0; barDef = "#gradF0";  break;
                    default  : barColour = barColourX0; barDef = "#gradX0"; 
                }
            }
            else if ((p["type"] == "sibling") || (p["type"] == "ancestor")) {
                switch (p["details"]["Gender"]) {
                    case "Male" : barColour = barColourM1; barDef = "#gradM1"; break;
                    case "Female" : barColour = barColourF1; barDef = "#gradF1";  break;
                    default  : barColour = barColourX1; barDef = "#gradX1"; 
                }
            }
            else {
                switch (p["details"]["Gender"]) {
                    case "Male" : barColour = barColourM2; barDef = "#gradM2"; break;
                    case "Female" : barColour = barColourF2; barDef = "#gradF2";  break;
                    default  : barColour = barColourX2; barDef = "#gradX2"; 
                }
            }


            //create main bar
            var barY1 = (i * rowHeight) + headerHeight + 2;
            var barX1;
            if (p["DeathYear"] == "0000") {
                if (p["details"]["IsLiving"] == 0) {
                    barX1 = barBase + (yearStart-p["BirthYear"]-30)*ptsPerYear;
                }
                else {
                    barX1 = barBase + (yearStart-yearCurrent)*ptsPerYear;
                }
            } else barX1 = barBase + (yearStart-p["DeathYear"])*ptsPerYear;
            var barX2 = barBase + (yearStart-p["BirthYear"])*ptsPerYear;
            var barWidth = barX2-barX1;
            if (barWidth==0) { barWidth=5; barX1 = barX1 - 5; }
            elemTxt += '<rect x="' + barX1 + '" y="' + barY1 + '" width="' + barWidth + '" height="10" style="fill:' + barColour + ';stroke-width:0;stroke:#000000"/>';

            // create uncertain death bar
            if (deathExt) {
                var barExt1X1 = barX1 - 30, barExt2X1 = barX1 - 60;
                elemTxt += '<rect x="' + barExt1X1 + '" y="' + barY1 + '" width="30" height="10" style="fill:url(' + barDef + 'a);stroke-width:0;stroke:#000000"/>';
                elemTxt += '<rect x="' + barExt2X1 + '" y="' + barY1 + '" width="30" height="10" style="fill:url(' + barDef + 'b);stroke-width:0;stroke:#000000"/>';
            }

        }
        svgText += elemTxt;

        // And now add in family grouping lines
        drawFamilyGroups(people, families, startID)

        // And finally, actually draw the tree
    	svgElem.innerHTML += svgText;

        //===========================================================

		function drawFamilyGroups(people, families, startID) {
			
            
		    // draw horizontal line for each person
			drawIndivLines(people, families);

			// draw marriage bars for parents
			drawMarriageLines(people, families);
			}

		//===========================================================

        function drawIndivLines(people, families) {
			
            /* draw horizontal line for each person */
            var elemTxt = "";
            for (var i=0; i<people.length; i++) {
                var lineY = (i * rowHeight) + headerHeight + 7;
                var textY = lineY + 5;

                var lineX1 = barBase + (yearStart-people[i]["BirthYear"])*ptsPerYear;
                var lineX2;
                // Is this person in a family?
                if (people[i]["family"] == null) lineX2 = lineX1;
                else lineX2 = barBase + (yearStart - families[people[i]["family"]]["useDate"]) * ptsPerYear;

                elemTxt += '<line x1="' + lineX1 + '" y1="' + lineY + '" x2="' + lineX2 + '" y2="' + lineY + '" style="stroke:#007700;stroke-width:1"/>';

                var textX = lineX2 + 10;
                var sn = people[i]["details"]["LastNameAtBirth"];   if (sn == "Unknown") sn = "?";
                var gn = people[i]["details"]["FirstName"]; if (gn == "Unknown") gn = "?";
                var by = people[i]["BirthYear"]; if (by == "0000") by = "?";
                var dy = people[i]["DeathYear"]; if (dy == "0000") dy = "?";
                elemTxt += '<text x="' + textX + '" y="' + textY + '" ' + txtStyle + '>' + sn + ', ' + gn + ' (' + by + '-' + dy + ')</text>';					
            }
            svgText += elemTxt;			
        }

		//===========================================================

        function drawMarriageLines(people, families) {

            var elemTxt = "";

            // for each marriage
            for (var i=0; i<families.length; i++) {
                var topIdx, btmIdx;

                // Is there a father?
                if (families[i]["Father"] != 0) {
                    topIdx = people.findIndex(item => item.id === families[i]["Father"]);
                    // Add bullet
                    var cY = (topIdx * rowHeight) + headerHeight + 7;
                    var cX = barBase + (yearStart-families[i]["useDate"])*ptsPerYear;
                    elemTxt += '<circle cx="' + cX + '" cy="' + cY + '" r="3" stroke-width="0" fill="black"/>';
            }
                else {
                    // find oldest child of family
                    for (var j=0; j<people.length; j++) {
                        if (people[j]["family"]==i) {
                            topIdx = j;
                            break;
                        }
                    }
                }
                // Is there a mother?
                if (families[i]["Mother"] != 0) {
                    btmIdx = people.findIndex(item => item.id === families[i]["Mother"]);
                    // Add bullet
                    var cY = (btmIdx * rowHeight) + headerHeight + 7;
                    var cX = barBase + (yearStart-families[i]["useDate"])*ptsPerYear;
                    elemTxt += '<circle cx="' + cX + '" cy="' + cY + '" r="3" stroke-width="0" fill="black"/>';
                }
                else {
                    // find youngest child of family
                    for (var j=people.length-1; j>=0; j--) {
                        if (people[j]["family"]==i) {
                            btmIdx = j;
                            break;
                        }
                    }
                }
                var lineY1 = (topIdx * rowHeight) + headerHeight + 7;
                var lineY2 = (btmIdx * rowHeight) + headerHeight + 7;
                var lineX = barBase + (yearStart-families[i]["useDate"])*ptsPerYear;
                elemTxt += '<line x1="' + lineX + '" y1="' + lineY1 + '" x2="' + lineX + '" y2="' + lineY2 + '" style="stroke:#007700;stroke-width:1"/>';
            }

            svgText += elemTxt;	
        }
    }

    //===================================================================================
    // Class TimelineTree: method to retrieve all relevant people to be displayed

    static async retrievePeopleList(people, families, startID, paramGens, paramSiblings) {
        // Retrieve list of people
        console.log(`Retrieving relatives for person with ID=${startID}`);
        let starttime = performance.now();

        // Begin by retrieving all ancestors for the startID person
        var fields=["Id","Name","Father","Mother"];
        const ancestors_json = await WikiTreeAPI.getAncestors("TimelineTree", startID, paramGens-1, fields);
        let ancestorsList = ancestors_json ? Object.values(ancestors_json) : [];
        console.log(`Retrieved ${ancestorsList.length} people in direct tree`);
        if (ancestorsList.length == 0) return;

        // Then have to retrieve the relatives of each ancestor (spouse + children)
        let ancestorsIDs = ancestorsList.map(item => item["Id"]);  // Extract Ids of all ancestors
        var fields=["Id","PageId","Name","FirstName","MiddleName","LastNameAtBirth","LastNameCurrent",
                    "BirthDate","DeathDate","BirthLocation","DeathLocation","Gender","IsLiving","Father","Mother",
                    "Children","Spouses"];
        const relatives_json = await WikiTreeAPI.getRelatives("TimelineTree", ancestorsIDs, fields, {getChildren: (paramSiblings?1:0), getSpouses: true});
        let ancestorsDetails = relatives_json ? Object.values(relatives_json) : [];

        let elapsedTime = performance.now() - starttime;
        console.log(`Elapsed time : ${elapsedTime}ms.`);
        if (TimelineTree.DEBUG) console.log(ancestorsDetails);

        // Then flatten into a single list of people with suitable ordering
        TimelineTree.extractRelatives(people, startID, ancestorsDetails, 1);
        if (TimelineTree.DEBUG) console.log(people);
        let keyPerson = people.find(item => item.id === startID);
        keyPerson["type"]="target";
        // Extract key info
        for (var i=0; i<people.length; i++) {
            people[i]["BirthYear"] = people[i]["details"]["BirthDate"].substr(0,4);
            people[i]["DeathYear"] = people[i]["details"]["DeathDate"].substr(0,4);
        }


        // And then identify families (so family lines can be drawn)
        TimelineTree.extractFamilies(people, families, startID, ancestorsDetails);
        if (TimelineTree.DEBUG)  console.log (families);
    }

    //===================================================================================
    // Class TimelineTree: method to extact and order relatives

    static extractRelatives(people, startID, ancestorsDetails, gen) {

        let keyPerson = ancestorsDetails.find(item => item.user_id === startID);
        if (typeof keyPerson === 'undefined') return [];

        let fathersID = keyPerson["person"]["Father"]
        let fatherPerson = ancestorsDetails.find(item => item.user_id === fathersID);
        let mothersID = keyPerson["person"]["Mother"]
        let motherPerson = ancestorsDetails.find(item => item.user_id === mothersID);
        if (TimelineTree.DEBUG) console.log("Checking tree for Person=" + startID + "; Father=" + fathersID + "; Mother=" + mothersID);


        // Add fathers relatives
        TimelineTree.extractRelatives(people, fathersID, ancestorsDetails, gen+1);

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
            people.push(...husbands);
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
        // sort and remove duplicates
        while (siblings.length > 0) {
            var oldestSibling = 0;
            var iSibling;
            for (iSibling=0; iSibling<siblings.length; iSibling++) {
                if (siblings[iSibling]["details"]["BirthDate"].substring(0,4) < siblings[oldestSibling]["details"]["BirthDate"].substring(0,4)) oldestSibling = iSibling;
            }
            var siblingToMove = siblings[oldestSibling];
            siblings.splice(oldestSibling,1);
            // check that this isn't a duplicate
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

            siblingsSorted.push(siblingToMove);
        }
        people.push(...siblingsSorted);
            

        // Add other spouses of father
        if (typeof fatherPerson != 'undefined') {
            let fathersSpouses = fatherPerson["person"]["Spouses"]
            // console.log(fathersSpouses);
            var wives = [];
            for (const spouseID in fathersSpouses) {
                if (spouseID != mothersID) {
                    wives.push({"id": fathersSpouses[spouseID]["Id"], "details": fathersSpouses[spouseID], "type": "stepParent", "generation": gen});
                    if (TimelineTree.DEBUG) console.log("Added other wife=" + spouseID)
                }
            }
            people.push(...wives);
        }

        // Add mothers relatives
        TimelineTree.extractRelatives(people, mothersID, ancestorsDetails, gen+1);
    }


    //===================================================================================
    // Class TimelineTree: method to extact families

    static extractFamilies(people, families, startID, ancestorDetails){

        // For each person
        for (var i=0; i<people.length; i++) {
            var person = people[i];
            
            // Is there a matching family? If yes, add link and check whether useDate needs updating
            var foundFamily = -1;
            for (var j=0; j<families.length; j++) {
                if ((person["details"]["Father"] == families[j]["Father"]) && (person["details"]["Mother"] == families[j]["Mother"])) foundFamily=j;
            }
            if (foundFamily>=0) {
                person["family"] = foundFamily;
                if (!(families[foundFamily]["married"]) && ((person["details"]["BirthDate"].substring(0,4) - 1) < families[foundFamily]["useDate"])) {
                    families[foundFamily]["useDate"] = person["details"]["BirthDate"].substring(0,4) - 1;
                }
                continue;
            }

            // No family yet, so is father in people array? If yes, add a family based on the father 
            var foundFather = -1;
            for (var j=0; j<people.length; j++) {
                if (person["details"]["Father"] == people[j]["id"]) foundFather=j;
            }
            if (foundFather >=0) {
                // Is mother in the list of fathers spouses?
                var foundMother = -1;
                var fathersSpouses = people[foundFather]["details"]["Spouses"];
                for (const spouseID in fathersSpouses) {
                    if (person["details"]["Mother"] == spouseID) foundMother = spouseID;
                }
                var useDate = 0;
                if (foundMother > 0) useDate = people[foundFather]["details"]["Spouses"][foundMother]["marriage_date"].substring(0,4)
                if (Number(useDate) == 0) useDate = person["details"]["BirthDate"].substring(0,4) - 1;
                var family = {
                    "Father": person["details"]["Father"],
                    "Mother": person["details"]["Mother"], 
                    "marriageDate": ((foundMother > 0) ? people[foundFather]["details"]["Spouses"][foundMother]["marriage_date"] : 0),
                    "useDate": useDate,
                    "married": ((foundMother > 0) ? true : false),
                    "marriageLocation": ((foundMother > 0) ? people[foundFather]["details"]["Spouses"][foundMother]["marriage_location"] : 0)
                };
                families.push(family);
                person["family"] = families.length-1;
                continue;
            }

            // So no family, and no father in list of people, so is mother in people array? If yes, add a family based on the mother 
            var foundMother = -1;
            for (var j=0; j<people.length; j++) {
                if (person["details"]["Mother"] == people[j]["id"]) foundMother=j;
            }
            if (foundMother >=0) {
                var family = {
                    "Father": person["details"]["Father"],
                    "Mother": person["details"]["Mother"], 
                    "marriageDate": 0,
                    "useDate": person["details"]["BirthDate"].substring(0,4) - 1,
                    "married": false,
                    "marriageLocation": 0
                };
                families.push(family);
                person["family"] = families.length-1;
                continue;
            }

            // So no family to be found
            person["family"] = null;
        }

        // Search through each ancestor and check for families with no children 
        for (const ancestor in ancestorDetails) {
            let person = ancestorDetails[ancestor]["person"];
            if (person["Id"]==startID) continue;
            let spouses = person["Spouses"];
            for (const spouse in spouses) {
                // check if already exists
                const matched = families.find(item => item.Father === person["Id"] && item.Mother === spouses[spouse]["Id"]) ||
                                families.find(item => item.Mother === person["Id"] && item.Father === spouses[spouse]["Id"]);
                // console.log(`P1=${person["Id"]}, P2=${spouses[spouse]["Id"]}, Matched=${matched}`);
                if (matched == undefined) {
                    let family = {"Father": person["Id"], "Mother": spouses[spouse]["Id"], 
                                  "marriageDate": spouses[spouse]["marriage_date"],
                                  "useDate": spouses[spouse]["marriage_date"].substring(0,4),
                                  "married": true,
                                  "marriageLocation": spouses[spouse]["marriage_location"]};
                    families.push(family);
                }
            }
        }
    }

}
