/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Fractal Tree uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 
* There is a Button Bar TABLE at the top of the container, 
 * then the SVG graphic is below that.
 * 
 * The FIRST chunk of code in the SVG graphic are the <path> objects for the individual wedges of the Fractal Tree,
 * each with a unique ID of wedgeAnB, where A = generation #, and B = position # within that generation, counting from far left, clockwise
 * 
 * The SECOND chunk in the SVG graphic are the individual people in the Fractal Tree, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class"person ancestor" transformed object with a translation from 0,0 and a rotation></g>
 * 
 * The Button Bar does not resize, but has clickable elements, which set global variables in the FractalView, then calls a redraw
 */
(function () {
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;

    const PRINTER_ICON = "&#x1F4BE;";
    const SETTINGS_GEAR = "&#x2699;";

    /**
     * Constructor
     */
    var FractalView = (window.FractalView = function () {
        Object.assign(this, this?.meta());
    });

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Fractal Tree

    /** Static variable to hold unique ids for private persons **/
    FractalView.nextPrivateId = -1;

    /** Static variable to hold the Maximum Angle for the Fractal Tree (360 full circle / 240 partial / 180 semicircle)   **/
    FractalView.maxAngle = 240;
    FractalView.lastAngle = 240;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    FractalView.numGens2Display = 3;
    FractalView.lastNumGens = 3;
    FractalView.numGensRetrieved = 3;
    FractalView.maxNumGens = 10;
    FractalView.workingMaxNumGens = 4;
    FractalView.maxDiamPerGen = []; // used to store the diameter of the spokes for the Fractal Tree

    /** Object to hold the Ahnentafel table for the current primary individual   */
    FractalView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    FractalView.theAncestors = [];

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    FractalView.currentSettings = {};

    FractalView.prototype.meta = function () {
        return {
            title: "Fractal Tree",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    FractalView.prototype.init = function (selector, startId) {
        // console.log("FractalView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;
        FractalView.fractalSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "FractalView",
            tabs: [
                // {
                //     name: "general",
                //     label: "General",
                //     hideSelect: true,
                //     subsections: [{ name: "FractalGeneral", label: "General settings" }],
                //     comment: "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
                // },
                {
                    name: "names",
                    label: "Names",
                    hideSelect: true,
                    subsections: [{ name: "FractalNames", label: "NAMES format" }],
                    comment: "These options apply to how the ancestor names will displayed in each Fan Chart cell.",
                },
                {
                    name: "dates",
                    label: "Dates",
                    hideSelect: true,
                    subsections: [{ name: "FractalDates", label: "DATES of events     " }],
                    comment: "These options apply to the Date format to use for birth, marriages, & deaths.",
                },
                {
                    name: "places",
                    label: "Places",
                    hideSelect: true,
                    subsections: [{ name: "FractalPlaces", label: "PLACES of events     " }],
                    comment: "These options apply to the Places displayed for birth, marriages, & deaths.",
                },
                {
                    name: "photos",
                    label: "Photos",
                    hideSelect: true,
                    subsections: [{ name: "FractalPhotos", label: "PHOTOS    " }],
                    comment: "These options determine if photos are displayed or not.",
                },
                {
                    name: "colours",
                    label: "Colours",
                    hideSelect: true,
                    subsections: [{ name: "FractalColours", label: "COLOURS   " }],
                    comment: "These options apply to background colours in the Fan Chart cells.",
                },
                // {
                //     name: "highlights",
                //     label: "Highlights",
                //     hideSelect: true,
                //     subsections: [{ name: "FractalHighlights", label: "HIGHLIGHTING   " }],
                //     comment: "These options determine which, if any, cells should be highlighted (in order to stand out). ",
                // },
            ],
            optionsGroups: [
                {
                    tab: "general",
                    subsection: "FractalGeneral",
                    category: "general",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "font",
                            type: "radio",
                            label: "Font",
                            values: [
                                { value: "Arial", text: "Arial" },
                                { value: "Courier", text: "Courier" },
                                { value: "Times", text: "Times" },
                                { value: "Fantasy", text: "Fantasy" },
                                { value: "Script", text: "Script" },
                            ],
                            defaultValue: "Arial",
                        },
                        { optionName: "break0", type: "br" },
                        {
                            optionName: "showWikiID",
                            label: "Show WikiTree ID for each person",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        {
                            optionName: "showAhnNum",
                            label: "Show Ahnentafel number in each cell",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        { optionName: "break1", type: "br" },
                        {
                            optionName: "colourizeRepeats",
                            label: "Colourize Repeat Ancestors",
                            type: "checkbox",
                            defaultValue: true,
                        },
                    ],
                },

                {
                    tab: "names",
                    subsection: "FractalNames",
                    category: "name",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "prefix",
                            label: "Show Prefix before full name",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        {
                            optionName: "firstName",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "FirstNameAtBirth", text: "First Name at Birth" },
                                { value: "UsualName", text: "Usual Name" },
                            ],
                            defaultValue: "FirstNameAtBirth",
                        },
                        { optionName: "middleName", label: "Show Middle Name", type: "checkbox", defaultValue: 0 },
                        {
                            optionName: "middleInitial",
                            label: "Show Middle Initial",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        { optionName: "nickName", label: "Show NickName", type: "checkbox", defaultValue: 0 },
                        {
                            optionName: "lastName",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "LastNameAtBirth", text: "Last Name at Birth" },
                                { value: "CurrentLastName", text: "Current Last Name" },
                            ],
                            defaultValue: "LastNameAtBirth",
                        },
                        {
                            optionName: "suffix",
                            label: "Show Suffix after full name",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                    ],
                },

                {
                    tab: "dates",
                    subsection: "FractalDates",
                    category: "date",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "dateTypes",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "none", text: "No Dates" },
                                { value: "br" },
                                { value: "lifespan", text: "Show Lifespan only, in years" },
                                { value: "br" },
                                { value: "detailed", text: "Show Full Dates for life events" },
                            ],
                            defaultValue: "detailed",
                        },
                        { optionName: "break0", comment: "Full Dates details:", type: "br" },
                        { optionName: "showBirth", label: "Show Birth Date", type: "checkbox", defaultValue: true },
                        { optionName: "showDeath", label: "Show Death Date", type: "checkbox", defaultValue: true },
                        // {
                        //     optionName: "showLifeSpan",
                        //     label: "Show LifeSpan (replaces birth & death dates)",
                        //     type: "checkbox",
                        //     defaultValue: 0,
                        // },
                        // { optionName: "break1", type: "br" },
                        // { optionName: "showMarriage", label: "Show Marriage Date", type: "checkbox", defaultValue: 0 },
                        { optionName: "break2", comment: "Date Format:", type: "br" },
                        {
                            optionName: "dateFormat",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "YYYY", text: "1964" },
                                { value: "YYYYMMDD", text: "1964-01-16" },
                                { value: "DDMMMYYYY", text: "16 Jan 1964" },
                                { value: "MMMDDYYYY", text: "Jan 16, 1964" },
                            ],
                            defaultValue: "DDMMMYYYY",
                        },
                    ],
                },
                {
                    tab: "places",
                    subsection: "FractalPlaces",
                    category: "place",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "locationTypes",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "none", text: "No Locations" },
                                { value: "br" },
                                { value: "detailed", text: "Show Locations for life events" },
                            ],
                            defaultValue: "detailed",
                        },
                        { optionName: "break0", comment: "Location details:", type: "br" },
                        { optionName: "showBirth", label: "Show Birth Location", type: "checkbox", defaultValue: true },
                        { optionName: "showDeath", label: "Show Death Location", type: "checkbox", defaultValue: true },
                        { optionName: "break0", comment: "Birth/Death Location Format:", type: "br" },
                        {
                            optionName: "locationFormatBD",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "Full", text: "Full Location as entered" },
                                { value: "br" },
                                { value: "Country", text: "Country only" },
                                { value: "Region", text: "Region only (Province/State)" },
                                { value: "Town", text: "Town only" },
                                { value: "br" },
                                { value: "TownCountry", text: "Town, Country" },
                                { value: "RegionCountry", text: "Region, Country" },
                                { value: "TownRegion", text: "Town, Region" },
                            ],
                            defaultValue: "Full",
                        },
                        // { optionName: "break1", type: "br" },
                        // { optionName: "showMarriage", label: "Show Marriage Locations", type: "checkbox", defaultValue: 0 },
                        // { optionName: "break2", comment: "Marriage Location Format:", type: "br" },
                        // {
                        //     optionName: "locationFormatM",
                        //     type: "radio",
                        //     label: "",
                        //     values: [
                        //         { value: "Full", text: "Full Location as entered" },
                        //         { value: "br" },
                        //         { value: "Country", text: "Country only" },
                        //         { value: "Region", text: "Region only (Province/State)" },
                        //         { value: "Town", text: "Town only" },
                        //         { value: "br" },
                        //         { value: "TownCountry", text: "Town, Country" },
                        //         { value: "RegionCountry", text: "Region, Country" },
                        //         { value: "TownRegion", text: "Town, Region" },
                        //     ],
                        //     defaultValue: "Full",
                        // },
                    ],
                },
                {
                    tab: "photos",
                    subsection: "FractalPhotos",
                    category: "photo",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "showCentralPic",
                            label: "Show the Central Person Photo",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "showAllPics",
                            label: "Show Photos of Ancestors",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "useSilhouette",
                            label: "Use Silhouette when no photo available",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        { optionName: "break1", type: "br" },
                        {
                            optionName: "showPicsToN",
                            label: "Limit Photos to first N generations",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        { optionName: "showPicsToValue", label: "N", type: "number", defaultValue: 5 },
                    ],
                },
                {
                    tab: "colours",
                    subsection: "FractalColours",
                    category: "colour",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "colourBy",
                            type: "select",
                            label: "Background Colour cells",
                            values: [
                                { value: "None", text: "OFF - All White, all the time WHITE" },
                                { value: "Gender", text: "by Gender" },
                                { value: "Generation", text: "by Generation" },
                                { value: "Grand", text: "by Grandparent" },
                                { value: "GGrand", text: "by Great-Grandparent" },
                                { value: "GGGrand", text: "by 2x Great Grandparent" },
                                { value: "GGGGrand", text: "by 3x Great Grandparent" },
                                // { value: "Town", text: "by Place name" },
                                // { value: "Region", text: "by Region (Province/State)" },
                                // { value: "Country", text: "by Country" },
                                { value: "random", text: "totally randomly" },
                            ],
                            defaultValue: "Generation",
                        },
                        {
                            optionName: "palette",
                            type: "select",
                            label: "Colour Palette",
                            values: [
                                { value: "Greys", text: "Shades of Grey" },
                                { value: "Reds", text: "Shades of Reds" },
                                { value: "Greens", text: "Shades of Greens" },
                                { value: "Blues", text: "Shades or Blues" },
                                { value: "Pastels", text: "Pastel colours" },
                                { value: "Rainbow", text: "Traditional Rainbow of colours" },
                                // { value: "Ancestry", text: "Ancestry type colours" },
                                // { value: "MyHeritage", text: "My Heritage type colours" },
                                { value: "random", text: "Psychadelic" },
                            ],
                            defaultValue: "Pastels",
                        },
                    ],
                },
                {
                    tab: "highlights",
                    subsection: "FractalHighlights",
                    category: "highlight",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "showHighlights",
                            label: "Highlight cells based on option chosen below",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        {
                            optionName: "highlightBy",
                            type: "select",
                            label: "Highlight by",
                            values: [
                                { value: "YDNA", text: "Y-DNA" },
                                { value: "mtDNA", text: "Mitonchondrial DNA (mtDNA)" },
                                { value: "XDNA", text: "X-chromosome inheritance" },
                                { value: "DNAconfirmed", text: "DNA confirmed ancestors" },
                                { value: "DNAinheritance", text: "DNA inheritance" },
                            ],
                            defaultValue: "DNAinheritance",
                        },
                        { optionName: "break", comment: "For WikiTree DNA pages:", type: "br" },
                        {
                            optionName: "howDNAlinks",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "Hide", text: "Hide Links" },
                                { value: "Highlights", text: "Show Links for highlighted cells only" },
                                { value: "ShowAll", text: "Show All Links" },
                            ],
                            defaultValue: "Highlights",
                        },
                    ],
                },
            ],
        });
        // Setup zoom and pan
        var zoom = d3.behavior
            .zoom()
            .scaleExtent([0.1, 1])
            .on("zoom", function () {
                svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
            })
            // Offset so that first pan and zoom does not jump back to the origin
            // .translate([originOffsetX, originOffsetY]); // SWITCHING to trying half the width and height to centre it better
            .translate([width / 2, height / 2]);

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%">' +
            "&nbsp;" +
            //  '<A onclick="FractalView.maxAngle = 360; FractalView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan360.png" /></A> |' +
            //  ' <A onclick="FractalView.maxAngle = 240; FractalView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></A> |' +
            //  ' <A onclick="FractalView.maxAngle = 180; FractalView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="center">' +
            ' <A onclick="FractalView.numGens2Display -=1; FractalView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>3</span> generations ]" +
            ' <A onclick="FractalView.numGens2Display +=1; FractalView.redraw();"> +1 </A> ' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="right">' +
            ' <A onclick="FractalView.toggleSettings();"><font size=+2>' +
            SETTINGS_GEAR +
            "</font></A>" +
            "&nbsp;&nbsp;</td>" +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Fractal Tree is loading ...</DIV>';

        var settingsHTML = "";

        settingsHTML += FractalView.fractalSettingsOptionsObject.createdSettingsDIV; // +

        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        container.innerHTML = btnBarHTML + settingsHTML;

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        function settingsChanged(e) {
            if (FractalView.fractalSettingsOptionsObject.hasSettingsChanged(FractalView.currentSettings)) {
                console.log("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                console.log("NEW settings are:", FractalView.currentSettings);
                FractalView.myAncestorTree.draw();
            } else {
                console.log("NOTHING happened according to SETTINGS OBJ");
            }
        }

        // CREATE the SVG object (which will be placed immediately under the button bar)
        var svg = d3
            .select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(zoom)
            .append("g")
            // Left padding of tree; TODO: find a better way
            // .attr("transform", "translate(" + originOffsetX + "," + originOffsetY + ")");
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        // console.log("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the Fractal Tree
        self.ancestorTree = new AncestorTree(svg);

        // Listen to tree events --> NOT NEEDED ANYMORE without the PLUS SIGNS (holdover from original Dynamic Tree version)
        // self.ancestorTree.expand(function (person) {
        //     return self.loadMore(person);
        // });

        // Setup pattern
        svg.append("defs")
            .append("pattern")
            .attr({
                id: "loader",
                width: 20,
                height: 20,
            })
            .append("image")
            .attr({
                width: 20,
                height: 20,
                //'xlink:href': 'ringLoader.svg'
            });

        /*
            CREATE the Fractal Tree Backdrop 
            * Made of Lines connecting two ancestors together
            
        */

        for (let index = 0; index < 2 ** FractalView.maxNumGens; index++) {
            // Create an Empty Line, hidden, to be used later
            svg.append("line").attr({
                id: "lineForPerson" + index,
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: black; stroke-width: 2;",
            });
        }

        self.load(startId);

        FractalView.fractalSettingsOptionsObject.buildPage();
        FractalView.fractalSettingsOptionsObject.setActiveTab("names");
        FractalView.currentSettings = FractalView.fractalSettingsOptionsObject.getDefaultOptions();
    };

    FractalView.drawLines = function () {
        // console.log("DRAWING LINES stuff should go here");
        for (let index = 0; index < 2 ** (FractalView.numGens2Display - 1); index++) {
            const element = document.getElementById("lineForPerson" + index);
            element.setAttribute("display", "block");

            let thisGenNum = Math.floor(Math.log2(index));
            let X = 0; // CENTRE PERSON's coordinates
            let Y = 0;
            let Xj = 0; // Pa's coordinates
            let Yj = 0;
            let Xk = 0; // Ma's coordinates
            let Yk = 0;

            let i = index;
            let j = i * 2;
            let k = i * 2 + 1;

            for (let g = 1; g <= thisGenNum + 1; g++) {
                if (g % 2 == 1) {
                    if (g <= thisGenNum) {
                        X +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) * 2 * FractalView.maxDiamPerGen[g] -
                            1 * FractalView.maxDiamPerGen[g];
                    }

                    Xj +=
                        0 +
                        ((j & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] -
                        1 * FractalView.maxDiamPerGen[g];
                    Xk +=
                        0 +
                        ((k & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] -
                        1 * FractalView.maxDiamPerGen[g];
                    // console.log(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "X",X);
                } else {
                    if (g <= thisGenNum) {
                        Y +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) * 2 * FractalView.maxDiamPerGen[g] -
                            1 * FractalView.maxDiamPerGen[g];
                    }
                    Yj +=
                        0 +
                        ((j & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] -
                        1 * FractalView.maxDiamPerGen[g];
                    Yk +=
                        0 +
                        ((k & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] -
                        1 * FractalView.maxDiamPerGen[g];
                    // console.log(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "Y",Y);
                }

                if (!FractalView.myAhnentafel.list[j]) {
                    Xj = X;
                    Yj = Y;
                }
                if (!FractalView.myAhnentafel.list[k]) {
                    Xk = X;
                    Yk = Y;
                }
                element.setAttribute("x1", Xj);
                element.setAttribute("y1", Yj);
                element.setAttribute("x2", Xk);
                element.setAttribute("y2", Yk);
            }
        }
        for (let index = 2 ** (FractalView.numGens2Display - 1); index < 2 ** (FractalView.maxNumGens - 1); index++) {
            const element = document.getElementById("lineForPerson" + index);
            if (element) {
                element.setAttribute("display", "none");
            }
        }
    };

    // Flash a message in the WarningMessageBelowButtonBar DIV
    function flashWarningMessageBelowButtonBar(theMessage) {
        // console.log(theMessage);
        if (theMessage > "") {
            theMessage = "<P align=center>" + theMessage + "</P>";
        }
        document.getElementById("WarningMessageBelowButtonBar").innerHTML = theMessage;
    }

    function showTemporaryMessageBelowButtonBar(theMessage) {
        flashWarningMessageBelowButtonBar(theMessage);
        setTimeout(clearMessageBelowButtonBar, 3000);
    }

    function clearMessageBelowButtonBar() {
        document.getElementById("WarningMessageBelowButtonBar").innerHTML = "";
    }
    // Make sure that the Button Bar displays the proper number of generations - and - adjust the max / min if needed because of over-zealous clicking
    function recalcAndDisplayNumGens() {
        if (FractalView.numGens2Display < 1) {
            FractalView.numGens2Display = 1;
            showTemporaryMessageBelowButtonBar("1 is the minimum number of generations you can display.");
        } else if (FractalView.numGens2Display > FractalView.workingMaxNumGens) {
            FractalView.numGens2Display = FractalView.workingMaxNumGens;
            if (FractalView.workingMaxNumGens < FractalView.maxNumGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
                );
            } else {
                showTemporaryMessageBelowButtonBar(
                    FractalView.maxNumGens + " is the maximum number of generations you can display."
                );
            }
        }

        var numGensSpan = document.querySelector("#numGensInBBar");
        numGensSpan.textContent = FractalView.numGens2Display;
        // console.log("numGensSpan:", numGensSpan);
        if (FractalView.numGens2Display > FractalView.numGensRetrieved) {
            loadAncestorsAtLevel(FractalView.numGens2Display);
            FractalView.numGensRetrieved = FractalView.numGens2Display;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        console.log("Need to load MORE peeps from Generation ", newLevel);
        let theListOfIDs = FractalView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        // console.log(theListOfIDs);
        if (theListOfIDs.length == 0) {
            // console.log("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            FractalView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            FractalView.numGensRetrieved++;
            FractalView.workingMaxNumGens = Math.min(FractalView.maxNumGens, FractalView.numGensRetrieved + 1);
        } else {
            WikiTreeAPI.getRelatives(
                theListOfIDs,
                [
                    "Id",
                    "Derived.BirthName",
                    "Derived.BirthNamePrivate",
                    "FirstName",
                    "MiddleInitial",
                    "LastNameAtBirth",
                    "LastNameCurrent",
                    "BirthDate",
                    "BirthLocation",
                    "DeathDate",
                    "DeathLocation",
                    "Mother",
                    "Father",
                    "Children",
                    "Parents",
                    "Spouses",
                    "Siblings",
                    "Photo",
                    "Name",
                    "Gender",
                    "Privacy",
                ],
                { getParents: true }
            ).then(function (result) {
                if (result) {
                    // need to put in the test ... in case we get a null result, which we will eventually at the end of the line
                    FractalView.theAncestors = result;
                    console.log("theAncestors:", FractalView.theAncestors);
                    // console.log("person with which to drawTree:", person);
                    for (let index = 0; index < FractalView.theAncestors.length; index++) {
                        thePeopleList.add(FractalView.theAncestors[index].person);
                    }
                    FractalView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    FractalView.workingMaxNumGens = Math.min(FractalView.maxNumGens, FractalView.numGensRetrieved + 1);

                    clearMessageBelowButtonBar();
                }
            });
        }
    }
    // Redraw the Wedges if needed for the Fractal Tree
    function redoWedgesForFractal() {
        // console.log("TIme to RE-WEDGIFY !", this, FractalView);

        if (FractalView.lastAngle != FractalView.maxAngle || FractalView.lastNumGens != FractalView.numGens2Display) {
            // ONLY REDO the WEDGES IFF the maxAngle has changed (360 to 240 to 180 or some combo like that)
            for (let genIndex = FractalView.numGens2Display - 1; genIndex >= 0; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    let SVGcode = "";
                    if (genIndex <= 1) {
                        SVGcode = SVGfunctions.getSVGforSector(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            (180 - FractalView.maxAngle) / 2 + 180 + (index * FractalView.maxAngle) / 2 ** genIndex,
                            (180 - FractalView.maxAngle) / 2 +
                                180 +
                                ((index + 1) * FractalView.maxAngle) / 2 ** genIndex,
                            "wedge" + 2 ** genIndex + "n" + index,
                            "black",
                            2,
                            "white"
                        );
                    } else {
                        SVGcode = SVGfunctions.getSVGforWedge(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            270 * (genIndex - 0.5),
                            (180 - FractalView.maxAngle) / 2 + 180 + (index * FractalView.maxAngle) / 2 ** genIndex,
                            (180 - FractalView.maxAngle) / 2 +
                                180 +
                                ((index + 1) * FractalView.maxAngle) / 2 ** genIndex,
                            "wedge" + 2 ** genIndex + "n" + index,
                            "black",
                            2,
                            "white"
                        );
                    }

                    //  console.log(SVGcode.id);
                    d3.select("#" + SVGcode.id).attr({ d: SVGcode.d, display: "block" }); // CHANGE the drawing commands to adjust the wedge shape ("d"), and make sure the wedge is visible ("display:block")

                    let theWedge = d3.select("#" + SVGcode.id);
                    //  console.log( "theWedge:",theWedge[0][0] );
                }
            }
            // HIDE all the unused Wedges in the outer rims that we don't need yet
            for (let genIndex = FractalView.maxNumGens - 1; genIndex > FractalView.numGens2Display - 1; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attr({ display: "none" });
                }
            }
            FractalView.lastAngle = FractalView.maxAngle;
            FractalView.lastNumGens = FractalView.numGens2Display;
        }
    }

    /** FUNCTION used to force a redraw of the Fractal Tree, used when called from Button Bar after a parameter has been changed */

    FractalView.redraw = function () {
        // console.log("FractalView.redraw");
        // console.log("Now theAncestors = ", FractalView.theAncestors);
        // thePeopleList.listAll();
        recalcAndDisplayNumGens();
        redoWedgesForFractal();
        FractalView.myAncestorTree.draw();
    };

    FractalView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };

    FractalView.toggleSettings = function () {
        console.log("TIME to TOGGLE the SETTINGS NOW !!!", FractalView.fractalSettingsOptionsObject);
        console.log(FractalView.fractalSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("settingsDIV");
        console.log("SETTINGS ARE:", theDIV.style.display);
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    };

    /**
     * Load and display a person
     */
    FractalView.prototype.load = function (id) {
        // console.log("FractalView.prototype.load");
        var self = this;
        self._load(id).then(function (person) {
            // console.log("FractalView.prototype.load : self._load(id) ");
            person._data.AhnNum = 1;
            thePeopleList.add(person);
            thePeopleList.listAll();

            if (person.children && person.children.length > 0) {
                for (let index = 0; index < person.children.length; index++) {
                    // console.log(".load person Child # " + index, person.children[index]);
                    if (person.children[index]) {
                        // Assign Ahnentafel #s to initial Father and Mother
                        if (person.children[index]._data.Gender == "Male") {
                            person.children[index]._data.AhnNum = 2;
                        } else {
                            person.children[index]._data.AhnNum = 3;
                        }
                    }
                }
            } else {
                // console.log("Did not go through KIDS loop: ", person, person.depth);
            }
            // console.log(".load person:",person);

            WikiTreeAPI.getAncestors(id, 3, [
                "Id",
                "Derived.BirthName",
                "Derived.BirthNamePrivate",
                "FirstName",
                "MiddleInitial",
                "LastNameAtBirth",
                "LastNameCurrent",
                "BirthDate",
                "BirthLocation",
                "DeathDate",
                "DeathLocation",
                "Mother",
                "Father",
                "Children",
                "Parents",
                "Spouses",
                "Siblings",
                "Photo",
                "Name",
                "Gender",
                "Privacy",
            ]).then(function (result) {
                FractalView.theAncestors = result;
                console.log("theAncestors:", FractalView.theAncestors);
                console.log("person with which to drawTree:", person);
                for (let index = 0; index < FractalView.theAncestors.length; index++) {
                    const element = FractalView.theAncestors[index];
                    thePeopleList.add(FractalView.theAncestors[index]);
                }
                FractalView.myAhnentafel.update(person);
                self.drawTree(person);
                clearMessageBelowButtonBar();
            });
        });
    };

    /**
     * Load more ancestors. Update existing data in place
     */
    FractalView.prototype.loadMore = function (oldPerson) {
        var self = this;
        // console.log("loadMore - line:94", oldPerson) ;
        return self._load(oldPerson.getId()).then(function (newPerson) {
            var mother = newPerson.getMother(),
                father = newPerson.getFather();

            if (mother) {
                // console.log("mother:", mother);
                oldPerson.setMother(mother);
            }
            if (father) {
                oldPerson.setFather(father);
            }
            oldPerson.setChildren(newPerson.getChildren());
            self.drawTree();
        });
    };

    /**
     * Main WikiTree API call
     * Uses a getPerson call initially, but, a getAncestors call would be more efficient - will switch to that shortly
     * Testing username change ...
     */
    FractalView.prototype._load = function (id) {
        // console.log("INITIAL _load - line:118", id) ;
        let thePersonObject = WikiTreeAPI.getPerson(id, [
            "Id",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "FirstName",
            "MiddleInitial",
            "LastNameAtBirth",
            "LastNameCurrent",
            "BirthDate",
            "BirthLocation",
            "DeathDate",
            "DeathLocation",
            "Mother",
            "Father",
            "Children",
            "Parents",
            "Spouses",
            "Siblings",
            "Photo",
            "Name",
            "Gender",
            "Privacy",
        ]);
        // console.log("_load PersonObj:",thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    FractalView.prototype.drawTree = function (data) {
        console.log("FractalView.prototype.drawTree");

        if (data) {
            // console.log("(FractalView.prototype.drawTree WITH data !)");
            this.ancestorTree.data(data);
            // this.descendantTree.data(data);
        }
        this.ancestorTree.draw();
        // this.descendantTree.draw();
    };

    /**
     * Shared code for drawing ancestors or descendants.
     * `selector` is a class that will be applied to links
     * and nodes so that they can be queried later when
     * the tree is redrawn.
     * `direction` is either 1 (forward) or -1 (backward).
     */
    var Tree = function (svg, selector, direction) {
        // console.log("Create TREE var");
        this.svg = svg;
        this.root = null;
        this.selector = selector;
        this.direction = typeof direction === "undefined" ? 1 : direction;

        this._expand = function () {
            return $.Deferred().resolve().promise();
        };

        this.tree = d3.layout
            .tree()
            .nodeSize([nodeHeight, nodeWidth])
            .separation(function () {
                return 1;
            });
    };

    /**
     * Set the `children` function for the tree
     */
    Tree.prototype.children = function (fn) {
        this.tree.children(fn);
        return this;
    };

    /**
     * Set the root of the tree
     */
    Tree.prototype.data = function (data) {
        this.root = data;
        return this;
    };

    /**
     * Set a function to be called when the tree is expanded.
     * The function will be passed a person representing whose
     * line needs to be expanded. The registered function
     * should return a promise. When it's resolved the state
     * will be updated.
     */
    Tree.prototype.expand = function (fn) {
        this._expand = fn;
        return this;
    };

    /**
     * Draw/redraw the tree
     */
    Tree.prototype.draw = function () {
        console.log("Tree.prototype.draw");
        if (this.root) {
            // var nodes = thePeopleList.listAllPersons();// [];//this.tree.nodes(this.root);
            var nodes = FractalView.myAhnentafel.listOfAncestorsForFanChart(FractalView.numGens2Display); // [];//this.tree.nodes(this.root);
            var links = this.tree.links(nodes);
            console.log("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);

            FractalView.maxDiamPerGen = [];
            let widestBox = 200;
            let theBlobBuffer = 20;

            for (let i = 0; i <= FractalView.numGens2Display; i++) {
                FractalView.maxDiamPerGen[i] =
                    2 ** Math.ceil((FractalView.numGens2Display - i) / 2) *
                    (((2 + (i % 2)) * widestBox) / 3 + theBlobBuffer);
            }

            console.log("maxDiamPerGen", FractalView.maxDiamPerGen);
            // links = this.tree.links(nodes);

            FractalView.drawLines();
            // this.drawLinks(links);
            this.drawNodes(nodes);
        } else {
            throw new Error("Missing root");
        }
        return this;
    };

    /**
     * Draw/redraw the connecting lines
     */
    Tree.prototype.drawLinks = function (links) {
        var self = this;
        console.log("DRAWING links for ", links);
        // Get a list of existing links
        var link = this.svg.selectAll("path.link." + this.selector).data(links, function (link) {
            return link.target.getId();
        });

        // Add new links
        link.enter()
            .append("path")
            .attr("class", "link " + this.selector);

        // Remove old links
        link.exit().remove();

        // Update the paths
        link.attr("d", function (d) {
            return self.elbow(d);
        });
    };

    /**
     * Helper function for drawing straight connecting lines
     * http://stackoverflow.com/a/10249720/879121
     */
    Tree.prototype.elbow = function (d) {
        var dir = this.direction,
            sourceX = d.source.x,
            sourceY = dir * (d.source.y + boxWidth / 2),
            targetX = d.target.x,
            targetY = dir * (d.target.y - boxWidth / 2);

        return (
            "M" + sourceY + "," + sourceX + "H" + (sourceY + (targetY - sourceY) / 2) + "V" + targetX + "H" + targetY
        );
    };

    /**
     * Draw the person boxes.
     */
    Tree.prototype.drawNodes = function (nodes) {
        // console.log("Tree.prototpe.DRAW NODES", nodes);
        var self = this;

        // console.log("this.selector = ", this.selector);

        // Get a list of existing nodes
        var node = this.svg.selectAll("g.person." + this.selector).data(nodes, function (ancestorObject) {
            let person = ancestorObject.person;
            // console.log("var node: function person ? " , person.getId(), ancestorObject.ahnNum);
            // return person;
            return ancestorObject.ahnNum; //getId();
        });

        // console.log("Tree.prototpe.DRAW NODES - SINGULAR node:", node);

        // Add new nodes
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // console.log("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);

        // Draw the person boxes
        nodeEnter
            .append("foreignObject")
            .attr({
                id: "foreignObj4",
                width: boxWidth,
                height: 0.01, // the foreignObject won't display in Firefox if it is 0 height
                x: -boxWidth / 2,
                y: -boxHeight / 2,
            })
            .style("overflow", "visible") // so the name will wrap
            .append("xhtml:div")
            .html((ancestorObject) => {
                let person = ancestorObject.person; //thePeopleList[ person.id ];
                // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
                let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));

                let borderColor = "rgba(102, 204, 102, .5)";
                if (person.getGender() == "Male") {
                    // borderColor = "rgba(102, 102, 204, .5)";
                }
                if (person.getGender() == "Female") {
                    // borderColor = "rgba(204, 102, 102, .5)";
                }

                // DEFAULT STYLE used to be style="background-color: ${borderColor} ;"

                // if (thisGenNum >= 9) {
                //     return `
                //         <div  id=wedgeBoxFor${ancestorObject.ahnNum} class="box" style="background-color: none ; border:0; padding: 0px;">
                //         <div class="name" style="font-size: 10px;" ><B>${getShortName(person)}</B></div>
                //         </div>
                //     `;

                // } else if (thisGenNum >= 8) {
                //     return `
                //         <div  id=wedgeBoxFor${ancestorObject.ahnNum} class="box" style="background-color: none ; border:0; padding: 0px;">
                //         <div class="name" style="font-size: 14px;" ><B>${getShortName(person)}</B></div>
                //         </div>
                //     `;

                // } else if (thisGenNum >= 7) {
                //     return `
                //         <div  id=wedgeBoxFor${ancestorObject.ahnNum} class="box" style="background-color: none ; border:0; padding: 3px;">
                //         <div class="name"><B>${getShortName(person)}</B></div>
                //         </div>
                //     `;

                // }  else if (thisGenNum >= 4) {
                //     let photoUrl = person.getPhotoUrl(75),
                //     treeUrl = window.location.pathname + "?id=" + person.getName();

                //     // Use generic gender photos if there is not profile photo available
                //     if (!photoUrl) {
                //         if (person.getGender() === "Male") {
                //             photoUrl = "images/icons/male.gif";
                //         } else {
                //             photoUrl = "images/icons/female.gif";
                //         }
                //     }
                //     return `
                //     <div  id=wedgeBoxFor${ancestorObject.ahnNum} class="box" style="background-color: none ; border:0; ">
                //     <div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>
                //     <div class="name"><B>${getShortName(person)}</B></div>
                //     <div class="lifespan">${lifespan(person)}</div>
                //     </div>
                //     `;

                // }  else {
                let photoUrl = person.getPhotoUrl(75),
                    treeUrl = window.location.pathname + "?id=" + person.getName();

                // Use generic gender photos if there is not profile photo available
                if (!photoUrl) {
                    if (person.getGender() === "Male") {
                        photoUrl = "images/icons/male.gif";
                    } else {
                        photoUrl = "images/icons/female.gif";
                    }
                }

                return `<div class="top-info centered" id=wedgeInfoFor${
                    ancestorObject.ahnNum
                } style="background-color: white ; padding:5, border-color:black; border:2;">
                     <div class="vital-info">
						<div class="image-box" id=photoDivFor${
                            ancestorObject.ahnNum
                        } style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>
						  <div class="name" id=nameDivFor${ancestorObject.ahnNum}>
						    <b>${getSettingsName(person)}</b>						    
						  </div>
						  <div class="birth vital" id=birthDivFor${
                            ancestorObject.ahnNum
                        }>${getSettingsDateAndPlace(person, "B")}</div>
						  <div class="death vital" id=deathDivFor${
                            ancestorObject.ahnNum
                        }>${getSettingsDateAndPlace(person, "D")}</div>
						</div>
					</div>
                    `;

                // }
            });

        // Show info popup on click
        nodeEnter.on("click", function (ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            d3.event.stopPropagation();
            self.personPopup(person, d3.mouse(self.svg.node()));
        });

        // // Draw the plus icons
        // var expandable = node.filter(function (person) {
        //     return !person.getChildren() && (person.getFatherId() || person.getMotherId());
        // });

        // console.log("line:397 - self just before the DRAW PLUS command: ", self);
        // self.drawPlus(expandable.data());
        FractalView.myAncestorTree = self;

        // Remove old nodes
        node.exit().remove();

        // *****************************
        // *
        // * REAL MAGIC HAPPENS HERE !!! --> By adjusting the Position, we can use the underlying logic of the d3.js Tree to handle the icky stuff, and we just position the boxes using some logic and a generalized formula
        // *
        // *****************************

        // Position
        node.attr("transform", function (ancestorObject) {
            // NOTE:  This "transform" function is being cycled through by EVERY data point in the Tree
            // 			SO ... the logic has to work for not only the central dude(tte), but also anyone on the outer rim and all those in between
            //			The KEY behind ALL of these calculations is the Ahnentafel numbers for each person in the Tree
            //			Each person in the data collection has an .AhnNum numeric property assigned, which uniquely determines where their name plate should be displayed.

            // console.log("node.attr.transform  - line:324 (x,y) = ",d.x, d.y, d._data.Name);
            d = ancestorObject.person; //thePeopleList[ person.id ];

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            // Calculate which position # (starting lower left and going clockwise around the Fractal Tree) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;

            let theInfoBox = document.getElementById("wedgeInfoFor" + ancestorObject.ahnNum);
            if (theInfoBox) {
                let theBounds = theInfoBox; //.getBBox();
                // console.log("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                // theInfoBox.style.width = "300px";
                // theInfoBox.style.x = "-190px";

                // CENTER the DIV and SET its width to 300px
                theInfoBox.parentNode.parentNode.setAttribute("y", -100);
                theInfoBox.parentNode.parentNode.setAttribute("x", -150);
                theInfoBox.parentNode.parentNode.setAttribute("width", 300);
				
				// COLOUR the div appropriately
				let thisDivsColour = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
				theInfoBox.setAttribute(
                    "style",
                    "background-color: " + thisDivsColour
					);

                // SET the OUTER DIV to also be white, with a rounded radius and solid border
                theInfoBox.parentNode.setAttribute(
                    "style",
                    "background-color: " + thisDivsColour + "; padding:15px; border: solid green; border-radius: 15px;"
                );
            }

            // LET'S UPDATE THE NAME !
            let thisDIVtoUpdate = document.getElementById("nameDivFor" + ancestorObject.ahnNum);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.textContent = getSettingsName(d); // REMEMBER that d = ancestorObject.person; 
            }
            // LET'S UPDATE THE BIRTH INFO !
            thisDIVtoUpdate = document.getElementById("birthDivFor" + ancestorObject.ahnNum);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.innerHTML = getSettingsDateAndPlace(d, "B");
            }
            // LET'S UPDATE THE DEATH INFO !
            thisDIVtoUpdate = document.getElementById("deathDivFor" + ancestorObject.ahnNum);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.innerHTML = getSettingsDateAndPlace(d, "D");
            }
            // LET'S UPDATE THE PHOTO !
            let photoUrl = d.getPhotoUrl(75); // will exist if there is a unique photo for this person, if not - then we can show silhouette if option says that's ok            
            thisDIVtoUpdate = document.getElementById("photoDivFor" + ancestorObject.ahnNum);

            if (thisDIVtoUpdate) {
                // FIRST ... let's deal with the CENTRAL PERP
                if (ancestorObject.ahnNum == 1) {
                    if ( FractalView.currentSettings["photo_options_showCentralPic"] == true) {
                        if (!photoUrl && FractalView.currentSettings["photo_options_useSilhouette"] == false) {
                            thisDIVtoUpdate.style.display = 'none';
                        } else {
                            thisDIVtoUpdate.style.display = 'block';
                        }
                    } else {
                        thisDIVtoUpdate.style.display = "none";
                    }
                } else {
                    // NOW DEAL with ALL THE REST 
                    if (FractalView.currentSettings["photo_options_showAllPics"] == true) {
                        if (!photoUrl && FractalView.currentSettings["photo_options_useSilhouette"] == false) {
                            thisDIVtoUpdate.style.display = "none";
                        } else {
                            if (FractalView.currentSettings["photo_options_showPicsToN"] == true &&
                                thisGenNum >= FractalView.currentSettings["photo_options_showPicsToValue"]) {
                                    thisDIVtoUpdate.style.display = "none";
                                } else {
                                    thisDIVtoUpdate.style.display = "block";
                                }

                        }
                    } else {
                        thisDIVtoUpdate.style.display = "none";
                    }
                }
            }

            let X = 0;
            let Y = 0;
            let i = ancestorObject.ahnNum;
            for (g = 1; g <= thisGenNum; g++) {
                if (g % 2 == 1) {
                    X +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) * 2 * FractalView.maxDiamPerGen[g] -
                        1 * FractalView.maxDiamPerGen[g];
                    // console.log(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "X",X);
                } else {
                    Y +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) * 2 * FractalView.maxDiamPerGen[g] -
                        1 * FractalView.maxDiamPerGen[g];
                    // console.log(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "Y",Y);
                }
            }
            // console.log( ancestorObject.ahnNum, thisGenNum, thisPosNum, ancestorObject.person._data.FirstName, ancestorObject.person._data.Name , X , Y);

            let newX = X;
            let newY = Y;
            // console.log("Place",d._data.Name,"ahnNum:" + ancestorObject.ahnNum,"Gen:"+thisGenNum,"Pos:" + thisPosNum, FractalView.maxAngle);

            // FINALLY ... we return the transformation statement back - the translation based on our  calculations
            return "translate(" + newX + "," + newY + ")";

            // and if needed a rotation based on the nameAngle
            // return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
    };

    /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup = function (person, event) {
        this.removePopups();

        var photoUrl = person.getPhotoUrl(75),
            treeUrl = window.location.pathname + "?id=" + person.getName();

        // Use generic gender photos if there is not profile photo available
        if (!photoUrl) {
            if (person.getGender() === "Male") {
                photoUrl = "images/icons/male.gif";
            } else {
                photoUrl = "images/icons/female.gif";
            }
        }

        var popup = this.svg
            .append("g")
            .attr("class", "popup")
            .attr("transform", "translate(" + event[0] + "," + event[1] + ")");

        let borderColor = "rgba(102, 204, 102, .5)";
        if (person.getGender() == "Male") {
            borderColor = "rgba(102, 102, 204, .5)";
        }
        if (person.getGender() == "Female") {
            borderColor = "rgba(204, 102, 102, .5)";
        }

        popup
            .append("foreignObject")
            .attr({
                width: 400,
                height: 300,
            })
            .style("overflow", "visible")
            .append("xhtml:div").html(`
				<div class="popup-box" style="border-color: ${borderColor}">
					<div class="top-info">
						<div class="image-box"><img src="https://www.wikitree.com/${photoUrl}"></div>
						<div class="vital-info">
						  <div class="name">
						    <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${person.getDisplayName()}</a>
						    <span class="tree-links"><a href="#name=${person.getName()}"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>

				</div>
			`);

        d3.select("#view-container").on("click", function () {
            console.log("d3.select treeViewerContainer onclick - REMOVE POPUP");
            popup.remove();
        });
    };

    /**
     * Remove all popups. It will also remove
     * any popups displayed by other trees on the
     * page which is what we want. If later we
     * decide we don't want that then we can just
     * add the selector class to each popup and
     * select on it, like we do with nodes and links.
     */
    Tree.prototype.removePopups = function () {
        console.log("Tree.prototype - REMOVE POPUPS (plural) function");
        d3.selectAll(".popup").remove();
    };

    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        console.log("new var ANCESTOR TREE");

        // RESET  the # of Gens parameters
        FractalView.numGens2Display = 3;
        FractalView.lastNumGens = 3;
        FractalView.numGensRetrieved = 3;
        FractalView.maxNumGens = 10;

        Tree.call(this, svg, "ancestor", 1);
        this.children(function (person) {
            console.log("Defining the CHILDREN for ", person._data.Name);
            var children = [],
                mother = person.getMother(),
                father = person.getFather();

            if (father) {
                // Calculate the father's Ahnentafel Number and assign it to the AhnNum variable (a new property being added manually to each person in the data set)
                // A father's Ahnentafel number is 2 times the original person's Ahnentafel number
                father._data.AhnNum = 2 * person._data.AhnNum;
                children.push(father);
            }
            if (mother) {
                // Calculate the mother's Ahnentafel Number and assign it to the AhnNum variable
                // A mother's Ahnentafel number is 1 more than the father's Ahnentafel number
                mother._data.AhnNum = 2 * person._data.AhnNum + 1;
                children.push(mother);
            }
            return children;
        });
    };

    // Inheritance
    AncestorTree.prototype = Object.create(Tree.prototype);

    /**
     * Generate a string representing this person's lifespan 0000 - 0000
     */
    function lifespan(person) {
        var birth = "",
            death = "";
        if (person.getBirthDate()) {
            birth = person.getBirthDate().substr(0, 4);
        }
        if (person.getDeathDate()) {
            death = person.getDeathDate().substr(0, 4);
        }

        var lifespan = "";
        if (birth && birth != "0000") {
            lifespan += birth;
        }
        lifespan += " - ";
        if (death && death != "0000") {
            lifespan += death;
        }

        return lifespan;
    }

    /**
     * Generate text that display when and where the person was born
     */
    function birthString(person) {
        var string = "",
            date = humanDate(person.getBirthDate()),
            place = person.getBirthLocation();

        return `B. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    /**
     * Generate text that display when and where the person died
     */
    function deathString(person) {
        var string = "",
            date = humanDate(person.getDeathDate()),
            place = person.getDeathLocation();

        return `D. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    /**
     * Turn a wikitree formatted date into a humanreadable date
     */
    function humanDate(dateString) {
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            var parts = dateString.split("-"),
                year = parseInt(parts[0], 10),
                month = parseInt(parts[1], 10),
                day = parseInt(parts[2], 10);
            if (year) {
                if (month) {
                    if (day) {
                        return `${day} ${monthNames[month - 1]} ${year}`;
                    } else {
                        return `${monthNames[month - 1]} ${year}`;
                    }
                } else {
                    return year;
                }
            }
        } else {
            return dateString;
        }
    }

    /**
     * Extract the LifeSpan BBBB - DDDD from a person
     */
    function getLifeSpan(person) {
        let theLifeSpan = "";
        let dateString = person._data.BirthDate;
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            var parts = dateString.split("-"),
                year = parseInt(parts[0], 10);
            if (year) {
                theLifeSpan += year;
            } else {
                theLifeSpan += "?";
            }
        } else {
            theLifeSpan += "?";
        }

        theLifeSpan += " - ";

        dateString = person._data.DeathDate;
        if (dateString == "0000-00-00") {
            // nothing to see here - person's still alive !  YAY!
        } else if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            var parts = dateString.split("-"),
                year = parseInt(parts[0], 10);
            if (year) {
                theLifeSpan += year;
            } else {
                theLifeSpan += "?";
            }
        } else {
            theLifeSpan += "?";
        }

        return theLifeSpan;
    }

    /**
     * Turn a wikitree Place into a location as per format string
     */
    function settingsStyleLocation(locString, formatString) {
        // take the locString as input, and break it up into parts, separated by commas
        // In an IDEAL world, the place name would be entered thusly:
        // TOWN , (optional COUNTY), PROVINCE or STATE or REGION NAME , COUNTRY
        // So we want the parts at locations 0 , N - 1, and N for Town, Region, Country respectively
        // IF there are < 3 parts, then we have to do some assumptions and rejiggering to supply the formatString with a plausible result

        if (!locString || locString == "") {
            // if we get a dud location as input - return an emptry string
            return "";
        }
        if (formatString == "Full") {
            // there's no need for doing any parsing --> just return the whole kit and caboodle
            return locString;
        }

        var parts = locString.split(",");
        if (parts.length == 1) {
            // there's no way to reformat/parse a single item location
            return locString;
        }

        let town = parts[0];
        let country = parts[parts.length - 1];
        let region = "";
        if (parts.length > 2) {
            region = parts[parts.length - 2];
        }

        if (formatString == "Country") {
            return country;
        } else if (formatString == "Region") {
            if (region > "") {
                return region;
            } else {
                return country;
            }
        } else if (formatString == "Town") {
            return town;
        } else if (formatString == "TownCountry") {
            return town + ", " + country;
        } else if (formatString == "RegionCountry") {
            if (region > "") {
                return region + ", " + country;
            } else {
                return town + ", " + country;
            }
        } else if (formatString == "TownRegion") {
            if (region > "") {
                return town + ", " + region;
            } else {
                return town + ", " + country;
            }
        }
        return "";
    }

    /**
     * Turn a wikitree formatted date into a date as per format string
     */
    function settingsStyleDate(dateString, formatString) {
        // console.log("settingsStyleDate:", dateString, formatString);
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            var parts = dateString.split("-"),
                year = parseInt(parts[0], 10),
                month = parseInt(parts[1], 10),
                day = parseInt(parts[2], 10);
            if (year) {
                if (formatString == "YYYY") {
                    return year;
                }
                if (month) {
                    month2digits = month;
                    if (month < 10) {
                        month2digits = "0" + month;
                    }
                    if (day) {
                        if (formatString == "YYYYMMDD") {
                            day2digits = day;
                            if (day < 10) {
                                day2digits = "0" + day;
                            }
                            return `${year}-${month2digits}-${day2digits}`;
                        } else if (formatString == "DDMMMYYYY") {
                            return `${day} ${monthNames[month - 1]} ${year}`;
                        } else if (formatString == "MMMDDYYYY") {
                            return `${monthNames[month - 1]} ${day}, ${year}`;
                        }
                        return `${day} ${monthNames[month - 1]} ${year}`;
                    } else {
                        if (formatString == "YYYYMMDD") {
                            return `${year}-${month2digits}`;
                        } else if (formatString == "DDMMMYYYY") {
                            return `${monthNames[month - 1]} ${year}`;
                        } else if (formatString == "MMMDDYYYY") {
                            return `${monthNames[month - 1]}, ${year}`;
                        }
                        return `${monthNames[month - 1]} ${year}`;
                    }
                } else {
                    return year;
                }
            }
        } else {
            return dateString;
        }
        return "";
    }

    /**
     * Return the date as required by the Settings options.
     */
    function getSettingsDateAndPlace(person, dateType) {
        let datePlaceString = "";
        let thisDate = "";
        let thisPlace = "";
        if (FractalView.currentSettings["date_options_dateTypes"] == "lifespan" && dateType == "B") {
            datePlaceString = getLifeSpan(person) + "<br/>";
        }

        if (dateType == "B") {
            if (FractalView.currentSettings["date_options_showBirth"] == true) {
                thisDate = settingsStyleDate(
                    person._data.BirthDate,
                    FractalView.currentSettings["date_options_dateFormat"]
                );
                if (FractalView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }

                if (
                    FractalView.currentSettings["place_options_locationTypes"] == "detailed" &&
                    FractalView.currentSettings["place_options_showBirth"] == true
                ) {
                    thisPlace = settingsStyleLocation(
                        person.getBirthLocation(),
                        FractalView.currentSettings["place_options_locationFormatBD"]
                    );
                } else {
                    thisPlace = "";
                }

                if (thisDate > "" || thisPlace > "") {
                    datePlaceString += "b. ";
                }
            }
        } else if (dateType == "D") {
            if (person._data.DeathDate == "0000-00-00") {
                return "";
            }
            if (FractalView.currentSettings["date_options_showDeath"] == true) {
                thisDate = settingsStyleDate(
                    person._data.DeathDate,
                    FractalView.currentSettings["date_options_dateFormat"]
                );
                if (FractalView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }
                if (
                    FractalView.currentSettings["place_options_locationTypes"] == "detailed" &&
                    FractalView.currentSettings["place_options_showDeath"] == true
                ) {
                    thisPlace = settingsStyleLocation(
                        person.getDeathLocation(),
                        FractalView.currentSettings["place_options_locationFormatBD"]
                    );
                } else {
                    thisPlace = "";
                }
                if (thisDate > "" || thisPlace > "") {
                    datePlaceString += "d. ";
                }
            }
        }
        if (thisDate > "" || thisPlace > "") {
            if (thisDate > "") {
                datePlaceString += thisDate;
            }
            if (thisDate > "" && thisPlace > "") {
                datePlaceString += ", ";
            }
            if (thisPlace > "") {
                datePlaceString += thisPlace;
            }
        }
        // console.log("SENDING getSettingsDate: ", datePlaceString);
        return datePlaceString;
    }

    /**
     * Return the name as required by the Settings options.
     */
    function getSettingsName(person) {
        const maxLength = 50;

        let theName = "";

        if (FractalView.currentSettings["name_options_firstName"] == "FirstNameAtBirth") {
            theName = person._data.FirstName;
        } else {
            theName = person._data.RealName;
        }

        if (FractalView.currentSettings["name_options_middleName"] == true) {
            if (person._data.MiddleName > "") {
                theName += " " + person._data.MiddleName;
            }
        } else if (FractalView.currentSettings["name_options_middleInitial"] == true) {
            if (person._data.MiddleInitial > "") {
                theName += " " + person._data.MiddleInitial;
            }
        }

        if (FractalView.currentSettings["name_options_nickName"] == true) {
            if (person._data.Nicknames > "") {
                theName += ' "' + person._data.Nicknames + '"';
            }
        }

        if (FractalView.currentSettings["name_options_lastName"] == "LastNameAtBirth") {
            theName += " " + person._data.LastNameAtBirth;
        } else {
            theName += " " + person._data.LastNameCurrent;
        }

        // console.log("SENDING getSettingsName: " , theName);
        return theName;

        // const birthName = person.getDisplayName();
        // const middleInitialName = `${person._data.FirstName} ${person._data.MiddleInitial} ${person._data.LastNameAtBirth}`;
        // const noMiddleInitialName = `${person._data.FirstName} ${person._data.LastNameAtBirth}`;
        // const fullMealDeallName = `${person._data.Prefix} ${person._data.FirstName} ${person._data.MiddleName} ${person._data.LastNameCurrent} ${person._data.Suffix} `;

        // console.log("FULL: " , fullMealDeallName);

        // return fullMealDeallName;

        // if (birthName.length < maxLength) {
        //     return birthName;
        // } else if (middleInitialName.length < maxLength) {
        //     return middleInitialName;
        // } else if (noMiddleInitialName.length < maxLength) {
        //     return noMiddleInitialName;
        // } else {
        //     return `${person._data.FirstName.substring(0, 1)}. ${person._data.LastNameAtBirth}`;
        // }
    }

    /**
     * Shorten the name if it will be too long to display in full.
     */
    function getShortName(person) {
        const maxLength = 20;

        const birthName = person.getDisplayName();
        const middleInitialName = `${person._data.FirstName} ${person._data.MiddleInitial} ${person._data.LastNameAtBirth}`;
        const noMiddleInitialName = `${person._data.FirstName} ${person._data.LastNameAtBirth}`;

        if (birthName.length < maxLength) {
            return birthName;
        } else if (middleInitialName.length < maxLength) {
            return middleInitialName;
        } else if (noMiddleInitialName.length < maxLength) {
            return noMiddleInitialName;
        } else {
            return `${person._data.FirstName.substring(0, 1)}. ${person._data.LastNameAtBirth}`;
        }
    }

    /**
     * Sort by the birth year from earliest to latest.
     */
    function sortByBirthDate(list) {
        list.sort((a, b) => {
            const aBirthYear = a._data.BirthDate.split("-")[0];
            const bBirthYear = b._data.BirthDate.split("-")[0];

            return aBirthYear - bBirthYear;
        });
    }
	
	function getBackgroundColourFor(gen, pos, ahnNum) {
         PastelsArray = ["#CCFFFF", "#CCFFCC", "#FFFFCC", "#FFE5CC", "#FFCCCC", "#FFCCE5", "#FFCCFF", "#E5CCFF"];
         RainbowArray = ["Red", "Orange", "Yellow", "Green", "Blue", "Indigo", "Violet"];
         GreysArray = ["#B8B8B8", "#D8D8D8", "#C0C0C0", "#E0E0E0", "#C8C8C8", "#E8E8E8", "#D0D0D0", "#F0F0F0"];
         RedsArray = [
            "#FFA0A0",
            "#FFB0B0",
            "#FFC0C0",
            "#FFD0D0",
            "#FFE0E0",
            "#FFF0F0",
            "#FFC0C8",
            "#FFD0D8",
            "#FFE0E8",
            "#FFF0F8",
            "#FFC0C0",
            "#FFD0D0",
            "#FFE0E0",
            "#FFF0F0",
            "#FFC8C0",
            "#FFD8D0",
            "#FFE8E0",
            "#FFF8F0",
        ];
         BluesArray = [
            "#A0A0FF",
            "#B0B0FF",
            "#C0C0FF",
            "#D0D0FF",
            "#E0E0FF",
            "#F0F0FF",
            "#C0C0FF",
            "#D0D0FF",
            "#E0E0FF",
            "#F0F0FF",
            "#C8C0FF",
            "#D8D0FF",
            "#E8E0FF",
            "#F8F0FF",
            "#C0C8FF",
            "#D0D8FF",
            "#E0E8FF",
            "#F0F8FF",
        ];
         GreensArray = ["#00B400", "#33FF33", "#00CD00", "#55FF55", "#00E600", "#77FF77", "#00FF00", "#99FF99"];
    var ColourArray = [
        "White",
        "Gold",
        "HotPink",
        "LightCyan",
        "Yellow",
        "AntiqueWhite",
        "MediumSpringGreen",
        "Orange",
        "DeepSkyBlue",
        "PaleGoldenRod",
        "Lime",
        "Moccasin",
        "PowderBlue",
        "DarkGreen",
        "Maroon",
        "Navy",
        "Brown",
        "Indigo",
        "RoyalBlue",
        "FireBrick",
        "Blue",
        "SlateGrey",
        "DarkMagenta",
        "Red",
        "DarkOrange",
        "DarkGoldenRod",
        "Green",
        "MediumVioletRed",
        "SteelBlue",
        "Grey",
        "MediumPurple",
        "OliveDrab",
        "Purple",
        "DarkSlateBlue",
        "SaddleBrown",
        "Pink",
        "Khaki",
        "LemonChiffon",
        "LightCyan",
        "HotPink",
        "Gold",
        "Yellow",
        "AntiqueWhite",
        "MediumSpringGreen",
        "Orange",
    ];
        let AllColoursArrays = [ColourArray ,  GreysArray, RedsArray, GreensArray, BluesArray, PastelsArray, RainbowArray];
        let KeyColoursMatches = {"random":ColourArray ,  "Greys":GreysArray, "Reds":RedsArray, "Greens":GreensArray, "Blues":BluesArray, "Pastels":PastelsArray, "Rainbow":RainbowArray};

        // start out with a random palette selected, so, if nothing else, at least there's something
        let thisColourArray = AllColoursArrays[Math.floor(Math.random() * AllColoursArrays.length)];

        // GET the settings that determine what the colouring should look like (if at all)
        let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];
        if (settingForColourBy == "None") {
            return "White";
        } 


        let settingForPalette = FractalView.currentSettings["colour_options_palette"];
        if (KeyColoursMatches[settingForPalette]) {
            thisColourArray = KeyColoursMatches[settingForPalette] ;
        }
        // console.log("COLOUR Settings are:" , settingForColourBy , settingForPalette);

        if (ahnNum == 1) {
            return thisColourArray[0];
        }
		
		let numThisGen = 2 ** gen;
		
        if (settingForColourBy == "Gender") {
            return thisColourArray[1 + ahnNum % 2];
            
            
        } else if (settingForColourBy == "Generation") {
            return thisColourArray[1 + (gen) % thisColourArray.length ];

        } else if (settingForColourBy == "Grand") {		
            return thisColourArray[1 + Math.floor(4*pos/numThisGen) % thisColourArray.length ];
			
        } else if (settingForColourBy == "GGrand") {
            return thisColourArray[1 + Math.floor(8*pos/numThisGen) % thisColourArray.length ];
			
        } else if (settingForColourBy == "GGGrand") {
            return thisColourArray[1 + Math.floor(16*pos/numThisGen) % thisColourArray.length ];
			
        } else if (settingForColourBy == "GGGGrand") {
            return thisColourArray[1 + Math.floor(32*pos/numThisGen) % thisColourArray.length ];
			
        } else if (settingForColourBy == "Town") {

        } else if (settingForColourBy == "Region") {

        } else if (settingForColourBy == "Country") {

        } else if (settingForColourBy == "random") {
            return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
        }


        return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
		}
	
	
})();
