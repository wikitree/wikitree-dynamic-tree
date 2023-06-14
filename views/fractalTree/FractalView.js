/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Fractal Tree uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 *
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
    const APP_ID = "FractalTree";
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
    FractalView.currentScaleFactor = 1;

    /** Object to hold the Ahnentafel table for the current primary individual   */
    FractalView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    FractalView.theAncestors = [];

    // List to hold the AhnenTafel #s of all Ancestors that are X-Chromosome ancestors (or potential x-chromosome ancestors) of the primary person.
    FractalView.XAncestorList = [];

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    FractalView.currentSettings = {};

    var numRepeatAncestors = 0;
    var repeatAncestorTracker = new Object();
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
                {
                    name: "general",
                    label: "General",
                    hideSelect: true,
                    subsections: [{ name: "FractalGeneral", label: "General settings" }],
                    comment:
                        "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
                },
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
                {
                    name: "highlights",
                    label: "Highlights",
                    hideSelect: true,
                    subsections: [{ name: "FractalHighlights", label: "HIGHLIGHTING   " }],
                    comment:
                        "These options determine which, if any, cells should be highlighted (in order to stand out). ",
                },
            ],
            optionsGroups: [
                {
                    tab: "general",
                    subsection: "FractalGeneral",
                    category: "general",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "font4Names",
                            type: "radio",
                            label: "Font for Names",
                            values: [
                                { value: "SansSerif", text: "Arial" },
                                { value: "Mono", text: "Courier" },
                                { value: "Serif", text: "Times" },
                                { value: "Fantasy", text: "Fantasy" },
                                { value: "Script", text: "Script" },
                            ],
                            defaultValue: "SansSerif",
                        },
                        {
                            optionName: "font4Info",
                            type: "radio",
                            label: "Font for Info",
                            values: [
                                { value: "SansSerif", text: "Arial" },
                                { value: "Mono", text: "Courier" },
                                { value: "Serif", text: "Times" },
                                { value: "Fantasy", text: "Fantasy" },
                                { value: "Script", text: "Script" },
                            ],
                            defaultValue: "SansSerif",
                        },
                        { optionName: "break0", type: "br" },
                        // {
                        //     optionName: "showWikiID",
                        //     label: "Show WikiTree ID for each person",
                        //     type: "checkbox",
                        //     defaultValue: 0,
                        // },
                        // {
                        //     optionName: "showAhnNum",
                        //     label: "Show Ahnentafel number in each cell",
                        //     type: "checkbox",
                        //     defaultValue: 0,
                        // },
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
                                { value: "Pastels", text: "Pastel colours" },
                                { value: "Greys", text: "Shades of Grey" },
                                { value: "Reds", text: "Shades of Red" },
                                { value: "Greens", text: "Shades of Green" },
                                { value: "Blues", text: "Shades or Blue" },
                                { value: "AltGreys", text: "Alternating Greys" },
                                { value: "AltReds", text: "Alternating Reds" },
                                { value: "AltBlues", text: "Alternating Blues" },
                                { value: "AltGreens", text: "Alternating Greens" },
                                { value: "Rainbow", text: "Rainbow colours" },
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
                                { value: "DNAinheritance", text: "DNA inheritance" },
                                { value: "DNAconfirmed", text: "DNA confirmed ancestors" },
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
                updateFontsIfNeeded();
            } else {
                console.log("NOTHING happened according to SETTINGS OBJ");
            }
        }

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g");

        // Setup zoom and pan
        const zoom = d3
            .zoom()
            .scaleExtent([0.05, 1])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
                FractalView.currentScaleFactor = event.transform.k;
            });
        svg.call(zoom);
        svg.call(zoom.transform, d3.zoomIdentity.scale(0.75).translate(4/3*width / 2, height / 2));

        // console.log("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the Fractal Tree
        self.ancestorTree = new AncestorTree(g);

        // Listen to tree events --> NOT NEEDED ANYMORE without the PLUS SIGNS (holdover from original Dynamic Tree version)
        // self.ancestorTree.expand(function (person) {
        //     return self.loadMore(person);
        // });

        // Setup pattern
        svg.append("defs")
            .append("pattern")
            .attrs({
                id: "loader",
                width: 20,
                height: 20,
            })
            .append("image")
            .attrs({
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
            g.append("line").attrs({
                id: "lineForPerson" + index,
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: black; stroke-width: 2;",
            });
            g.append("line").attrs({
                id: "line1ForPerson" + index,
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: blue; stroke-width: 2;",
            });
            g.append("line").attrs({
                id: "line2ForPerson" + index,
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: red; stroke-width: 2;",
            });
            g.append("line").attrs({
                id: "line3ForPerson" + index,
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: green; stroke-width: 4;",
            });
        }

        // BEFORE we go further ... let's add the DNA objects we might need later
        for (let genIndex = FractalView.maxNumGens - 1; genIndex >= 0; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                g.append("g")
                    .attrs({
                        id: "imgDNA-x-" + genIndex + "i" + index,
                    })
                    .append("foreignObject")
                    .attrs({
                        id: "imgDNA-x-" + genIndex + "i" + index + "inner",
                        class: "centered",
                        width: "20px",
                        height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                        x: 25 * index,
                        y: 30 * genIndex,
                        //
                        style: "display:none;",
                    })

                    .style("overflow", "visible") // so the name will wrap
                    .append("xhtml:div")
                    .attrs({
                        id: "imgDNA-x-" + genIndex + "i" + index + "img",
                    })
                    .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/X.gif'/>");

                g.append("g")
                    .attrs({
                        id: "imgDNA-y-" + genIndex + "i" + index,
                    })
                    .append("foreignObject")
                    .attrs({
                        id: "imgDNA-y-" + genIndex + "i" + index + "inner",
                        class: "centered",
                        width: "20px",
                        height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                        x: 25 * index,
                        y: 30 * genIndex,
                        //
                        style: "display:none;",
                    })

                    .style("overflow", "visible") // so the name will wrap
                    .append("xhtml:div")
                    .attrs({
                        id: "imgDNA-y-" + genIndex + "i" + index + "img",
                    })
                    .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/Y.gif'/>");

                g.append("g")
                    .attrs({
                        id: "imgDNA-mt-" + genIndex + "i" + index,
                    })
                    .append("foreignObject")
                    .attrs({
                        id: "imgDNA-mt-" + genIndex + "i" + index + "inner",
                        class: "centered",
                        width: "20px",
                        height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                        x: 25 * index,
                        y: 30 * genIndex,
                        //
                        style: "display:none;",
                    })

                    .style("overflow", "visible") // so the name will wrap
                    .append("xhtml:div")
                    .attrs({
                        id: "imgDNA-mt-" + genIndex + "i" + index + "img",
                    })
                    .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/mt.gif'/>");

                g.append("g")
                    .attrs({
                        id: "imgDNA-Ds-" + genIndex + "i" + index,
                    })
                    .append("foreignObject")
                    .attrs({
                        id: "imgDNA-Ds-" + genIndex + "i" + index + "inner",
                        class: "centered",
                        width: "20px",
                        height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                        x: 25 * index,
                        y: 30 * genIndex,
                        //
                        style: "display:none;",
                    })

                    .style("overflow", "visible") // so the name will wrap
                    .append("xhtml:div")
                    .attrs({
                        id: "imgDNA-Ds-" + genIndex + "i" + index + "img",
                    })
                    .html("<img height=24px src='https://www.wikitree.com/images/icons/descendant-link.gif'/>");

                g.append("g")
                    .attrs({
                        id: "imgDNA-As-" + genIndex + "i" + index,
                    })
                    .append("foreignObject")
                    .attrs({
                        id: "imgDNA-As-" + genIndex + "i" + index + "inner",
                        class: "centered",
                        width: "20px",
                        height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                        x: 25 * index,
                        y: 30 * genIndex,
                        //
                        style: "display:none;",
                    })

                    .style("overflow", "visible") // so the name will wrap
                    .append("xhtml:div")
                    .attrs({
                        id: "imgDNA-As-" + genIndex + "i" + index + "img",
                    })
                    .html("<img height=24px src='https://www.wikitree.com/images/icons/pedigree.gif'/>");

                g.append("g")
                    .attrs({
                        id: "imgDNA-Confirmed-" + genIndex + "i" + index,
                    })
                    .append("foreignObject")
                    .attrs({
                        id: "imgDNA-Confirmed-" + genIndex + "i" + index + "inner",
                        class: "centered",
                        width: "20px",
                        height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                        x: 25 * index,
                        y: 30 * genIndex,
                        //
                        style: "display:none;",
                    })

                    .style("overflow", "visible") // so the name will wrap
                    .append("xhtml:div")
                    .attrs({
                        id: "imgDNA-Confirmed-" + genIndex + "i" + index + "img",
                    })
                    .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/DNA-confirmed.gif'/>");
            }
        }

        self.load(startId);

        FractalView.fractalSettingsOptionsObject.buildPage();
        FractalView.fractalSettingsOptionsObject.setActiveTab("names");
        FractalView.currentSettings = FractalView.fractalSettingsOptionsObject.getDefaultOptions();
    };

    FractalView.drawLines = function () {
        console.log("DRAWING LINES stuff should go here");
        for (let index = 0; index < 2 ** (FractalView.numGens2Display - 1); index++) {
            const element = document.getElementById("lineForPerson" + index);
            element.setAttribute("display", "block");
            element.style.display = "block";

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
                element.style.display = "none";
            }
            const element1 = document.getElementById("line1ForPerson" + index);
            if (element1) {
                element1.setAttribute("display", "none");
                element1.style.display = "none";
            }
            const element2 = document.getElementById("line2ForPerson" + index);
            if (element2) {
                element2.setAttribute("display", "none");
                element2.style.display = "none";
            }
            const element3 = document.getElementById("line3ForPerson" + index);
            if (element3) {
                element3.setAttribute("display", "none");
                element3.style.display = "none";
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
                APP_ID,
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
                    "DataStatus",
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
                    d3.select("#" + SVGcode.id).attrs({ d: SVGcode.d, display: "block" }); // CHANGE the drawing commands to adjust the wedge shape ("d"), and make sure the wedge is visible ("display:block")

                    let theWedge = d3.select("#" + SVGcode.id);
                    //  console.log( "theWedge:",theWedge[0][0] );
                }
            }
            // HIDE all the unused Wedges in the outer rims that we don't need yet
            for (let genIndex = FractalView.maxNumGens - 1; genIndex > FractalView.numGens2Display - 1; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attrs({ display: "none" });
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

            WikiTreeAPI.getAncestors(APP_ID, id, 3, [
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
                "DataStatus",
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
                populateXAncestorList(1);
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
        let thePersonObject = WikiTreeAPI.getPerson(APP_ID, id, [
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
            "DataStatus",
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
        this.getChildrenFn = null;
        this.selector = selector;
        this.direction = typeof direction === "undefined" ? 1 : direction;

        this._expand = function () {
            return $.Deferred().resolve().promise();
        };

        this.tree = d3
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
        this.getChildrenFn = fn;
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

            FractalView.drawLines();
            this.drawNodes(nodes);
        } else {
            throw new Error("Missing root");
        }
        return this;
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
            .attrs({
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

                let theClr = "white";
                // SETUP the repeatAncestorTracker
                if (FractalView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                    console.log(
                        "new repeat ancestor:",
                        FractalView.myAhnentafel.listByPerson[ancestorObject.person._data.Id]
                    );
                    if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                        theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                    } else {
                        numRepeatAncestors++;
                        theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                        repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                    }
                }

                if (FractalView.currentSettings["general_options_colourizeRepeats"] == false) {
                    theClr = "white";
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
                } style="background-color: ${theClr} ; padding:5, border-color:black; border:2;">
                     <div class="vital-info">
						<div class="image-box" id=photoDivFor${
                            ancestorObject.ahnNum
                        } style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>
						  <div class="name fontBold font${font4Name}" id=nameDivFor${ancestorObject.ahnNum}>
						    ${getSettingsName(person)}
						  </div>
						  <div class="birth vital font${font4Info}" id=birthDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(
                    person,
                    "B"
                )}</div>
						  <div class="death vital font${font4Info}" id=deathDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(
                    person,
                    "D"
                )}</div>
						</div>
					</div>
                    `;

                // }
            });

        // Show info popup on click
        nodeEnter.on("click", function (event, ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            event.stopPropagation();
            self.personPopup(person, d3.pointer(event, self.svg.node()));
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
        node = nodeEnter.merge(node);

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
                // CHECK to see if this is a Repeat Ancestor AND if ColourizeRepeats option is turned on
                if (
                    FractalView.currentSettings["general_options_colourizeRepeats"] == true &&
                    repeatAncestorTracker[ancestorObject.person._data.Id]
                ) {
                    thisDivsColour = repeatAncestorTracker[ancestorObject.person._data.Id];
                }
                theInfoBox.setAttribute("style", "background-color: " + thisDivsColour);

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
                    if (FractalView.currentSettings["photo_options_showCentralPic"] == true) {
                        if (!photoUrl && FractalView.currentSettings["photo_options_useSilhouette"] == false) {
                            thisDIVtoUpdate.style.display = "none";
                        } else {
                            thisDIVtoUpdate.style.display = "block";
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
                            if (
                                FractalView.currentSettings["photo_options_showPicsToN"] == true &&
                                thisGenNum >= FractalView.currentSettings["photo_options_showPicsToValue"]
                            ) {
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

            // OK - now that we know where the centre of the universe is ... let's throw those DNA symbols into play !
            setTimeout(function () {
                showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, 0); // nameAngle = 0 ... taken from FanChart ... leaving here JUST IN CASE we turn the boxes on their side
            }, 200);

            // FINALLY ... we return the transformation statement back - the translation based on our  calculations
            return "translate(" + newX + "," + newY + ")";

            // and if needed a rotation based on the nameAngle
            // return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
    };

    /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup = function (person, xy) {
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
            .attr("transform", "translate(" + xy[0] + "," + xy[1] + ")");

        let borderColor = "rgba(102, 204, 102, .5)";
        if (person.getGender() == "Male") {
            borderColor = "rgba(102, 102, 204, .5)";
        }
        if (person.getGender() == "Female") {
            borderColor = "rgba(204, 102, 102, .5)";
        }

        popup
            .append("foreignObject")
            .attrs({
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

    function safeName(inp) {
        return inp.replace(/ /g, "_");
    }

    function updateFontsIfNeeded() {
        if (
            FractalView.currentSettings["general_options_font4Names"] == font4Name &&
            FractalView.currentSettings["general_options_font4Info"] == font4Info
        ) {
            console.log("NOTHING to see HERE in UPDATE FONT land");
        } else {
            console.log(
                "Update Fonts:",
                FractalView.currentSettings["general_options_font4Names"],
                font4Name,
                FractalView.currentSettings["general_options_font4Info"],
                font4Info
            );
            console.log(FractalView.currentSettings);

            font4Name = FractalView.currentSettings["general_options_font4Names"];
            font4Info = FractalView.currentSettings["general_options_font4Info"];

            let nameElements = document.getElementsByClassName("name");
            for (let e = 0; e < nameElements.length; e++) {
                const element = nameElements[e];
                element.classList.remove("fontSerif");
                element.classList.remove("fontSansSerif");
                element.classList.remove("fontMono");
                element.classList.remove("fontFantasy");
                element.classList.remove("fontScript");
                element.classList.add("font" + font4Name);
            }
            let infoElements = document.getElementsByClassName("vital");
            for (let e = 0; e < infoElements.length; e++) {
                const element = infoElements[e];
                element.classList.remove("fontSerif");
                element.classList.remove("fontSansSerif");
                element.classList.remove("fontMono");
                element.classList.remove("fontFantasy");
                element.classList.remove("fontScript");
                element.classList.add("font" + font4Info);
            }
        }
    }
    function updateDNAlinks(nodes) {
        //{ ahnNum: i, person: thePeopleList[this.list[i]] }
        for (let index = 0; index < nodes.length; index++) {
            const element = nodes[index];
            let i = element.ahnNum;
            let peep = element.person;
            let peepNameID = safeName(peep._data.Name);
            console.log("Peep:", peepNameID);
        }
    }

    function showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle) {
        // console.log("showDNAiconsIfNeeded(" , newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle,")");

        // OK - now that we know where the centre of the universe is ... let's throw those DNA symbols into play !
        let dnaImgX = document.getElementById("imgDNA-x-" + thisGenNum + "i" + thisPosNum + "inner");
        let dnaImgXDiv = document.getElementById("imgDNA-x-" + thisGenNum + "i" + thisPosNum + "img");
        let dnaImgY = document.getElementById("imgDNA-y-" + thisGenNum + "i" + thisPosNum + "inner");
        let dnaImgYDiv = document.getElementById("imgDNA-y-" + thisGenNum + "i" + thisPosNum + "img");
        let dnaImgMT = document.getElementById("imgDNA-mt-" + thisGenNum + "i" + thisPosNum + "inner");
        let dnaImgMTDiv = document.getElementById("imgDNA-mt-" + thisGenNum + "i" + thisPosNum + "img");
        let dnaImgDs = document.getElementById("imgDNA-Ds-" + thisGenNum + "i" + thisPosNum + "inner");
        let dnaImgDsDiv = document.getElementById("imgDNA-Ds-" + thisGenNum + "i" + thisPosNum + "img");
        let dnaImgAs = document.getElementById("imgDNA-As-" + thisGenNum + "i" + thisPosNum + "inner");
        let dnaImgAsDiv = document.getElementById("imgDNA-As-" + thisGenNum + "i" + thisPosNum + "img");
        let dnaImgConfirmed = document.getElementById("imgDNA-Confirmed-" + thisGenNum + "i" + thisPosNum + "inner");
        let dnaImgConfirmedDiv = document.getElementById("imgDNA-Confirmed-" + thisGenNum + "i" + thisPosNum + "img");

        let dFraction =
            (thisGenNum * thisRadius - (thisGenNum < 5 ? 100 : 80)) / (Math.max(1, thisGenNum) * thisRadius);
        let dOrtho = 35 / (Math.max(1, thisGenNum) * thisRadius);
        let dOrtho2 = dOrtho;
        let newR = thisRadius;

        // START out by HIDING them all !
        if (dnaImgX) {
            dnaImgX.style.display = "none";
        }
        if (dnaImgY) {
            dnaImgY.style.display = "none";
        }
        if (dnaImgMT) {
            dnaImgMT.style.display = "none";
        }
        if (dnaImgAs) {
            dnaImgAs.style.display = "none";
        }
        if (dnaImgDs) {
            dnaImgDs.style.display = "none";
        }
        if (dnaImgConfirmed) {
            dnaImgConfirmed.style.display = "none";
        }

        let ahnNum = 2 ** thisGenNum + thisPosNum;
        let gen = thisGenNum;
        let pos = thisPosNum;
        let ext = "";
        let showAllAs = false;
        let showAllDs = false;
        let thisY = 100;

        let elem = document.getElementById("wedgeInfoFor" + ahnNum).parentNode;
        console.log(elem.parentNode);

        if (elem) {
            let rect = elem.getBoundingClientRect();
            let elemParent = elem.parentNode;
            let rectParent = elemParent.getBoundingClientRect();
            thisY = newY - 0 + 1 * rect.height - 0 + 1 * elemParent.getAttribute("y") + 10;
            thisY =
                newY - 0 + 1 * elemParent.getAttribute("y") + (1 * rect.height + 2) / FractalView.currentScaleFactor;
            console.log("SVG d3:", d3);
            console.log("SVG scale:", d3.scale, FractalView.currentScaleFactor);
            console.log("SVG behave:", d3.behavior);
            console.log(
                `ahnNum: ${ahnNum} , newY: ${newY} , height: ${rect.height} , heightElem: ${elem.getAttribute(
                    "height"
                )} , heightParent: ${rectParent.height} , ParentY: ${elemParent.getAttribute("y")} , thisY: ${thisY} ,`
            );
            console.log(rect);
            console.log(rectParent);
            const line1 = document.getElementById("line1ForPerson" + ahnNum);
            const line2 = document.getElementById("line2ForPerson" + ahnNum);
            if (line1) {
                // line1.style.display = "inline-block";
                line1.setAttribute("x1", newX - 200);
                line1.setAttribute("x2", newX + 200);
                line1.setAttribute("y1", thisY);
                line1.setAttribute("y2", thisY);
                console.log(line1);
                // line2.style.display = "inline-block";
                line2.setAttribute("x1", newX - 200);
                line2.setAttribute("x2", newX + 200);
                line2.setAttribute("y1", newY - 0 + 1 * elemParent.getAttribute("y"));
                line2.setAttribute("y2", newY - 0 + 1 * elemParent.getAttribute("y"));
                console.log(line2);
            }
        }

        if (FractalView.currentSettings["highlight_options_showHighlights"] == true) {
            if (FractalView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                ext = "Y";
                dOrtho = 0;
                if (pos == 0) {
                    if (ahnNum > 1) {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                        }
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                        }
                    } else if (ahnNum == 1 && thePeopleList[FractalView.myAhnentafel.list[1]]._data.Gender == "Male") {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                        }
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                        }
                    }
                }
                if (pos % 2 == 0) {
                    showAllAs = true;
                    showAllDs = true;
                }
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
                ext = "mt";
                dOrtho = 0;
                if (pos == 2 ** gen - 1) {
                    if (dnaImgMT) {
                        dnaImgMT.style.display = "block";
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                        }
                    }
                }
                showAllAs = true;
                if (pos % 2 == 1) {
                    showAllDs = true;
                }
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                ext = "X";
                dOrtho = 0;
                if (FractalView.XAncestorList.indexOf(ahnNum) > -1) {
                    if (dnaImgX) {
                        dnaImgX.style.display = "block";
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                        }
                    }
                }

                showAllAs = true;
                showAllDs = true;
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                if (FractalView.XAncestorList.indexOf(ahnNum) > -1) {
                    // HIGHLIGHT by X-chromosome inheritance
                    if (dnaImgX) {
                        dnaImgX.style.display = "block";
                    }
                }
                if (pos == 2 ** gen - 1) {
                    // AND/OR by mtDNA inheritance
                    if (dnaImgMT) {
                        dnaImgMT.style.display = "block";
                    }
                }
                if (pos == 0) {
                    // AND/OR by Y-DNA inheritance
                    if (ahnNum > 1) {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                        }
                    } else if (ahnNum == 1 && thePeopleList[FractalView.myAhnentafel.list[1]]._data.Gender == "Male") {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                        }
                    }
                }
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                if (ahnNum == 1) {
                    console.log(thePeopleList[FractalView.myAhnentafel.list[1]]._data);
                    if (dnaImgConfirmed) {
                        dnaImgConfirmed.style.display = "block";
                    }
                } else {
                    let childAhnNum = Math.floor(ahnNum / 2);
                    if (ahnNum % 2 == 0) {
                        // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                        if (thePeopleList[FractalView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30) {
                            if (dnaImgConfirmed) {
                                dnaImgConfirmed.style.display = "block";
                            }
                        }
                    } else {
                        // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                        if (thePeopleList[FractalView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30) {
                            if (dnaImgConfirmed) {
                                dnaImgConfirmed.style.display = "block";
                            }
                        }
                    }
                }
            }
        }

        if (dnaImgX) {
            // dnaImgX.setAttribute("x", newX * dFraction);
            // dnaImgX.setAttribute("y", newY * dFraction);
            // dnaImgXDiv.style.rotate = nameAngle + "deg";
            // if (thisGenNum == 0) {
            dnaImgX.setAttribute("x", newX);
            dnaImgX.setAttribute("y", thisY);
            // }
            if (ext > "" && FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgX.style.display = "none";
            } else if (
                FractalView.currentSettings["highlight_options_highlightBy"] == "XDNA" &&
                FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgX.style.display = "block";
            }
        }
        if (dnaImgY) {
            // dnaImgY.setAttribute("x", newX * dFraction + dOrtho * newY);
            // dnaImgY.setAttribute("y", newY * dFraction - dOrtho * newX);
            // dnaImgYDiv.style.rotate = nameAngle + "deg";
            // if (thisGenNum == 0) {
            dnaImgY.setAttribute("y", /* newY +  */ thisY);
            dnaImgY.setAttribute("x", newX - (35 * dOrtho) / 0.13);
            //     console.log("@GenNum == 0 ; dOrtho = ", dOrtho);
            // }
            if (ext > "" && FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgY.style.display = "none";
            } else if (
                FractalView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgY.style.display = "block";
            }
        }
        if (ext > "" && FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
            dnaImgY.style.display = "none";
        } else if (
            FractalView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
            FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
            showAllAs == true
        ) {
            dnaImgY.style.display = "block";
        }
        if (dnaImgMT) {
            // dnaImgMT.setAttribute("x", newX * dFraction - dOrtho * newY);
            // dnaImgMT.setAttribute("y", newY * dFraction + dOrtho * newX);
            // dnaImgMTDiv.style.rotate = nameAngle + "deg";
            // if (thisGenNum == 0) {
            dnaImgMT.setAttribute("y", /* newY +  */ thisY);
            dnaImgMT.setAttribute("x", newX + (35 * dOrtho) / 0.13);
            // }
            if (ext > "" && FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgMT.style.display = "none";
            } else if (
                FractalView.currentSettings["highlight_options_highlightBy"] == "mtDNA" &&
                FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgMT.style.display = "block";
            }
        }

        if (dnaImgDs) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/890#" +
                ext +
                '">' +
                "<img height=24px src='https://www.wikitree.com/images/icons/descendant-link.gif'/>" +
                "</A>";
            // console.log(theLink);
            dnaImgDsDiv.innerHTML = theLink;
            // dnaImgDs.setAttribute("x", newX * dFraction - dOrtho2 * newY);
            // dnaImgDs.setAttribute("y", newY * dFraction + dOrtho2 * newX);
            // dnaImgDsDiv.style.rotate = nameAngle + "deg";
            // if (thisGenNum == 0) {
            dnaImgDs.setAttribute("y", /* newY +  */ thisY);
            dnaImgDs.setAttribute("x", newX + 35);
            // }
            if (ext > "" && FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgDs.style.display = "none";
            } else if (
                ext > "" &&
                FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllDs == true
            ) {
                dnaImgDs.style.display = "block";
            }
        }

        if (dnaImgAs) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/89#" +
                ext +
                '">' +
                "<img height=24px src='https://www.wikitree.com/images/icons/pedigree.gif'/>" +
                "</A>";
            dnaImgAsDiv.innerHTML = theLink;
            // dnaImgAs.setAttribute("x", newX * dFraction + dOrtho2 * newY);
            // dnaImgAs.setAttribute("y", newY * dFraction - dOrtho2 * newX);
            // dnaImgAsDiv.style.rotate = nameAngle - 90 + "deg";
            // if (thisGenNum == 0) {
            dnaImgAs.setAttribute("y", /* newY +  */ thisY);
            dnaImgAs.setAttribute("x", newX - 35);
            // }
            if (ext > "" && FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgAs.style.display = "none";
            } else if (
                ext > "" &&
                FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgAs.style.display = "block";
            }
        }

        if (dnaImgConfirmed) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/899" +
                '">' +
                "<img height=30px src='https://www.wikitree.com/images/icons/dna/DNA-confirmed.gif'/>" +
                "</A>";
            dnaImgConfirmedDiv.innerHTML = theLink;
            // dnaImgConfirmed.setAttribute("x", newX * (gen > 5 ? (newR + 10) / newR : dFraction) + dOrtho * newY);
            // dnaImgConfirmed.setAttribute("y", newY * (gen > 5 ? (newR + 10) / newR : dFraction) - dOrtho * newX);
            // dnaImgConfirmedDiv.style.rotate = nameAngle + "deg";
            // if (thisGenNum == 0) {
            dnaImgConfirmed.setAttribute("y", /* newY +  */ thisY);
            dnaImgConfirmed.setAttribute("x", newX - 37.5);
            // }

            if (FractalView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgConfirmed.style.display = "none";
            } else if (
                FractalView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed" &&
                FractalView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll"
            ) {
                dnaImgConfirmed.style.display = "block";
            }
        }
    }

    function doHighlightFor(gen, pos, ahnNum) {
        if (FractalView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
            if (pos == 0) {
                if (ahnNum > 1) {
                    return true;
                } else if (ahnNum == 1 && thePeopleList[FractalView.myAhnentafel.list[1]]._data.Gender == "Male") {
                    return true;
                }
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
            if (pos == 2 ** gen - 1) {
                return true;
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
            if (FractalView.XAncestorList.indexOf(ahnNum) > -1) {
                return true;
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
            if (FractalView.XAncestorList.indexOf(ahnNum) > -1) {
                // HIGHLIGHT by X-chromosome inheritance
                return true;
            } else if (pos == 2 ** gen - 1) {
                // OR by mtDNA inheritance
                return true;
            } else if (pos == 0) {
                // OR by Y-DNA inheritance
                if (ahnNum > 1) {
                    return true;
                } else if (ahnNum == 1 && thePeopleList[FractalView.myAhnentafel.list[1]]._data.Gender == "Male") {
                    return true;
                }
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
            if (ahnNum == 1) {
                console.log(thePeopleList[FractalView.myAhnentafel.list[1]]._data);
                return true;
            } else {
                let childAhnNum = Math.floor(ahnNum / 2);
                if (ahnNum % 2 == 0) {
                    // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                    if (thePeopleList[FractalView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30) {
                        return true;
                    }
                } else {
                    // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                    if (thePeopleList[FractalView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
    function populateXAncestorList(ahnNum) {
        if (ahnNum == 1) {
            FractalView.XAncestorList = [1];
            if (thePeopleList[FractalView.myAhnentafel.list[1]]._data.Gender == "Female") {
                populateXAncestorList(2); // a woman inherits an X-chromosome from her father
                populateXAncestorList(3); // and her mother
            } else {
                populateXAncestorList(3); // whereas a man inherits an X-chromosome only from his mother
            }
        } else {
            FractalView.XAncestorList.push(ahnNum);
            if (ahnNum < 2 ** FractalView.maxNumGens) {
                if (ahnNum % 2 == 1) {
                    populateXAncestorList(2 * ahnNum); // a woman inherits an X-chromosome from her father
                    populateXAncestorList(2 * ahnNum + 1); // and her mother
                } else {
                    populateXAncestorList(2 * ahnNum + 1); // whereas a man inherits an X-chromosome only from his mother
                }
            }
        }
    }

    function getBackgroundColourForB4(gen, pos, ahnNum) {
        PastelsArray = [
            "#ECFFEF",
            "#CCEFEC",
            "#CCFFCC",
            "#FFFFCC",
            "#FFE5CC",
            "#FFCCCC",
            "#FFCCE5",
            "#FFCCFF",
            "#E5CCFF",
            "#C5ECCF",
            "#D5CCEF",
        ];
        RainbowArray = ["Red", "Orange", "Yellow", "Green", "Blue", "Indigo", "Violet"];
        GreysArray = [
            "#B8B8B8",
            "#D8D8D8",
            "#C0C0C0",
            "#E0E0E0",
            "#C8C8C8",
            "#E8E8E8",
            "#D0D0D0",
            "#F0F0F0",
            "#A8A8A8",
            "#C4C4C4",
            "#E4E4E4",
        ];
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

        let AllColoursArrays = [
            ColourArray,
            GreysArray,
            RedsArray,
            GreensArray,
            BluesArray,
            PastelsArray,
            RainbowArray,
        ];
        let KeyColoursMatches = {
            random: ColourArray,
            Greys: GreysArray,
            Reds: RedsArray,
            Greens: GreensArray,
            Blues: BluesArray,
            Pastels: PastelsArray,
            Rainbow: RainbowArray,
        };

        // start out with a random palette selected, so, if nothing else, at least there's something
        let thisColourArray = AllColoursArrays[Math.floor(Math.random() * AllColoursArrays.length)];

        // GET the settings that determine what the colouring should look like (if at all)
        let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];
        if (settingForColourBy == "None") {
            return "White";
        }

        let settingForPalette = FractalView.currentSettings["colour_options_palette"];
        if (KeyColoursMatches[settingForPalette]) {
            thisColourArray = KeyColoursMatches[settingForPalette];
        }

        let overRideByHighlight = false; //
        if (FractalView.currentSettings["highlight_options_showHighlights"] == true) {
            overRideByHighlight = doHighlightFor(gen, pos, ahnNum);
        }
        if (overRideByHighlight == true) {
            return "yellow";
        }

        if (ahnNum == 1) {
            return thisColourArray[0];
        }

        let numThisGen = 2 ** gen;

        if (settingForColourBy == "Gender") {
            return thisColourArray[1 + (ahnNum % 2)];
        } else if (settingForColourBy == "Generation") {
            return thisColourArray[1 + (gen % thisColourArray.length)];
        } else if (settingForColourBy == "Grand") {
            return thisColourArray[1 + (Math.floor((4 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "GGrand") {
            return thisColourArray[1 + (Math.floor((8 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "GGGrand") {
            return thisColourArray[1 + (Math.floor((16 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "GGGGrand") {
            return thisColourArray[1 + (Math.floor((32 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "Town") {
        } else if (settingForColourBy == "Region") {
        } else if (settingForColourBy == "Country") {
        } else if (settingForColourBy == "random") {
            return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
        }

        return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
    }

    function getBackgroundColourFor(gen, pos, ahnNum) {
        PastelsArray = [
            "#ECFFEF",
            "#CCEFEC",
            "#CCFFCC",
            "#FFFFCC",
            "#FFE5CC",
            "#FFCCCC",
            "#FFCCE5",
            "#FFCCFF",
            "#E5CCFF",
            "#D5CCEF",
            "#E6E6FA",
            "#FFB6C1",
            "#F5DEB3",
            "#FFFACD",
            "#C5ECCF",
            "#F0FFF0",
            "#FDF5E6",
            "#FFE4E1",
        ];
        RainbowArray = [
            "#FFFACD",
            "Red",
            "Orange",
            "Yellow",
            "SpringGreen",
            "SkyBlue",
            "Orchid",
            "Violet",
            "DeepPink",
            "Pink",
            "MistyRose",
            "OrangeRed",
            "Gold",
            "GreenYellow",
            "Cyan",
            "Plum",
            "Magenta",
            "#F83BB7",
            "#FF45A3",
            "PaleVioletRed",
            "Pink",
        ]; // replaced some colours
        RainbowArrayLong = [
            "#FFFACD",
            "Red",
            "OrangeRed",
            "Orange",
            "Gold",
            "Yellow",
            "GreenYellow",
            "SpringGreen",
            "Cyan",
            "SkyBlue",
            "#B898E0",
            "Orchid",
            "Magenta",
            "Violet",
            "#F83BB7",
            "DeepPink",
            "#FF45A3",
            "HotPink",
            "#FF45A3",
            "DeepPink",
            "Violet",
            "Magenta",
            "Orchid",
            "#B898E0",
            "SkyBlue",
            "Cyan",
            "SpringGreen",
            "GreenYellow",
            "Yellow",
            "Gold",
            "Orange",
            "OrangeRed",
            "Red",
        ]; // replaced some colours
        Rainbow8 = [
            "Red",
            "Orange",
            "Yellow",
            "SpringGreen",
            "SkyBlue",
            "Orchid",
            "Violet",
            "DeepPink",
            "HotPink",
            "MistyRose",
        ];
        RainbowTweens = ["OrangeRed", "Gold", "GreenYellow", "Cyan", "Plum", "Magenta", "PaleVioletRed", "Pink"];

        GreysArrayOrig = [
            "#ACACAC",
            "#B0B0B0",
            "#B4B4B4",
            "#B8B8B8",
            "#BCBCBC",
            "#C0C0C0",
            "#C4C4C4",
            "#C8C8C8",
            "#CCCCCC",
            "#D0D0D0",
            "#D4D4D4",
            "#D8D8D8",
            "#DCDCDC",
            "#E0E0E0",
            "#E4E4E4",
            "#E8E8E8",
            "#ECECEC",
            "#F0F0F0",
        ];
        AltGreysArray = [
            "#F0F0F0",
            "#C5C5C5",
            "#EAEAEA",
            "#C0C0C0",
            "#E5E5E5",
            "#BABABA",
            "#E0E0E0",
            "#B5B5B5",
            "#DADADA",
            "#B0B0B0",
            "#D5D5D5",
            "#AAAAAA",
            "#D0D0D0",
            "#A5A5A5",
            "#CACACA",
            "#A0A0A0",
            "#C5C5C5",
            "#9A9A9A",
            "#C5C5C5",
            "#A0A0A0",
            "#CACACA",
            "#A5A5A5",
            "#D0D0D0",
            "#AAAAAA",
            "#D5D5D5",
            "#B0B0B0",
            "#DADADA",
            "#B5B5B5",
            "#E0E0E0",
            "#BABABA",
            "#E5E5E5",
            "#C0C0C0",
            "#EAEAEA",
            "#C5C5C5",
            "#F0F0F0",
        ];
        GreysArray = [
            "#F0F0F0",
            "#EAEAEA",
            "#E5E5E5",
            "#E0E0E0",
            "#DADADA",
            "#D5D5D5",
            "#D0D0D0",
            "#CACACA",
            "#C5C5C5",
            "#C0C0C0",
            "#BABABA",
            "#B5B5B5",
            "#B0B0B0",
            "#AAAAAA",
            "#A5A5A5",
            "#A0A0A0",
            "#9A9A9A",
            "#A0A0A0",
            "#A5A5A5",
            "#AAAAAA",
            "#B0B0B0",
            "#B5B5B5",
            "#BABABA",
            "#C0C0C0",
            "#C5C5C5",
            "#CACACA",
            "#D0D0D0",
            "#D5D5D5",
            "#DADADA",
            "#E0E0E0",
            "#E5E5E5",
            "#EAEAEA",
            "#F0F0F0",
        ];
        RedsArray = [
            "#FFF8F0",
            "#FFF0F8",
            "#FFF4F4",
            "#FFF0F0",
            "#FFE8E0",
            "#FFE0E8",
            "#FFE4E4",
            "#FFE0E0",
            "#FFD8D0",
            "#FFD0D8",
            "#FFD4D4",
            "#FFD0D0",
            "#FFC8C0",
            "#FFC0C8",
            "#FFC4C4",
            "#FFC0C0",
            "#FFB0B0",
            "#FFA0A0",
            "#FFB0B0",
            "#FFC0C0",
            "#FFC4C4",
            "#FFC0C8",
            "#FFC8C0",
            "#FFD0D0",
            "#FFD4D4",
            "#FFD0D8",
            "#FFD8D0",
            "#FFE0E0",
            "#FFE4E4",
            "#FFE0E8",
            "#FFE8E0",
            "#FFF0F0",
            "#FFF4F4",
            "#FFF0F8",
            "#FFF8F0",
        ];
        BluesArray = [
            "#F8F0FF",
            "#F0F8FF",
            "#F4F4FF",
            "#F0F0FF",
            "#E8E0FF",
            "#E0E8FF",
            "#E4E4FF",
            "#E0E0FF",
            "#D8D0FF",
            "#D0D8FF",
            "#D4D4FF",
            "#D0D0FF",
            "#C8C0FF",
            "#C0C8FF",
            "#C4C4FF",
            "#C0C0FF",
            "#B0B0FF",
            "#A0A0FF",

            "#B0B0FF",
            "#C0C0FF",
            "#C4C4FF",
            "#C0C8FF",
            "#C8C0FF",
            "#D0D0FF",
            "#D4D4FF",
            "#D0D8FF",
            "#D8D0FF",
            "#E0E0FF",
            "#E4E4FF",
            "#E0E8FF",
            "#E8E0FF",
            "#F0F0FF",
            "#F4F4FF",
            "#F0F8FF",
            "#F8F0FF",
        ];
        GreensArray = [
            "#F8FFF0",
            "#F0FFF8",
            "#F4FFF4",
            "#F0FFF0",
            "#E8FFE0",
            "#E0FFE8",
            "#E4FFE4",
            "#E0FFE0",
            "#D8FFD0",
            "#D0FFD8",
            "#D4FFD4",
            "#D0FFD0",
            "#C8FFC0",
            "#C0FFC8",
            "#C4FFC4",
            "#C0FFC0",
            "#B0FFB0",
            "#A0FFA0",

            "#B0FFB0",
            "#C0FFC0",
            "#C4FFC4",
            "#C0FFC8",
            "#C8FFC0",
            "#D0FFD0",
            "#D4FFD4",
            "#D0FFD8",
            "#D8FFD0",
            "#E0FFE0",
            "#E4FFE4",
            "#E0FFE8",
            "#E8FFE0",
            "#F0FFF0",
            "#F4FFF4",
            "#F0FFF8",
            "#F8FFF0",
        ];
        let AltRedsArray = [
            "#FFF8F0",
            "#FFD8D0",
            "#FFF0F8",
            "#FFD0D8",
            "#FFF4F4",
            "#FFD4D4",
            "#FFF0F0",
            "#FFD0D0",
            "#FFE8E0",
            "#FFC8C0",
            "#FFE0E8",
            "#FFC0C8",
            "#FFE4E4",
            "#FFC4C4",
            "#FFE0E0",
            "#FFC0C0",
            "#FFEAEA",
            "#FFA0A0",

            "#FFEAEA",
            "#FFC0C0",
            "#FFE0E0",
            "#FFC4C4",
            "#FFE4E4",
            "#FFC0C8",
            "#FFE0E8",
            "#FFC8C0",
            "#FFE8E0",
            "#FFD0D0",
            "#FFF0F0",
            "#FFD4D4",
            "#FFF4F4",
            "#FFD0D8",
            "#FFF0F8",
            "#FFD8D0",
            "#F0F8FF",
        ];
        let AltGreensArray = [
            "#F8FFF0",
            "#D8FFD0",
            "#F0FFF8",
            "#D0FFD8",
            "#F4FFF4",
            "#D4FFD4",
            "#F0FFF0",
            "#D0FFD0",
            "#E8FFE0",
            "#C8FFC0",
            "#E0FFE8",
            "#C0FFC8",
            "#E4FFE4",
            "#C4FFC4",
            "#E0FFE0",
            "#C0FFC0",
            "#EAFFEA",
            "#A0FFA0",

            "#EAFFEA",
            "#C0FFC0",
            "#E0FFE0",
            "#C4FFC4",
            "#E4FFE4",
            "#C0FFC8",
            "#E0FFE8",
            "#C8FFC0",
            "#E8FFE0",
            "#D0FFD0",
            "#F0FFF0",
            "#D4FFD4",
            "#F4FFF4",
            "#D0FFD8",
            "#F0FFF8",
            "#D8FFD0",
            "#F8F0FF",
        ];
        let AltBluesArray = [
            "#F8F0FF",
            "#D8D0FF",
            "#F0F8FF",
            "#D0D8FF",
            "#F4F4FF",
            "#D4D4FF",
            "#F0F0FF",
            "#D0D0FF",
            "#E8E0FF",
            "#C8C0FF",
            "#E0E8FF",
            "#C0C8FF",
            "#E4E4FF",
            "#C4C4FF",
            "#E0E0FF",
            "#C0C0FF",
            "#EAEAFF",
            "#A0A0FF",

            "#EAEAFF",
            "#C0C0FF",
            "#E0E0FF",
            "#C4C4FF",
            "#E4E4FF",
            "#C0C8FF",
            "#E0E8FF",
            "#C8C0FF",
            "#E8E0FF",
            "#D0D0FF",
            "#F0F0FF",
            "#D4D4FF",
            "#F4F4FF",
            "#D0D8FF",
            "#F0F8FF",
            "#D8D0FF",
            "#F8FFFF",
        ];
        let AllColoursArrays = [
            ColourArray,
            GreysArray,
            RedsArray,
            GreensArray,
            BluesArray,
            PastelsArray,
            RainbowArray,
            AltGreysArray,
            AltGreensArray,
        ];
        let KeyColoursMatches = {
            random: ColourArray,
            Greys: GreysArray,
            Reds: RedsArray,
            Greens: GreensArray,
            Blues: BluesArray,
            AltGreys: AltGreysArray,
            AltGreens: AltGreensArray,
            AltReds: AltRedsArray,
            AltBlues: AltBluesArray,
            Pastels: PastelsArray,
            Rainbow: RainbowArray,
        };

        // start out with a random palette selected, so, if nothing else, at least there's something
        let thisColourArray = AllColoursArrays[Math.floor(Math.random() * AllColoursArrays.length)];

        // GET the settings that determine what the colouring should look like (if at all)
        let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];
        if (settingForColourBy == "None") {
            return "White";
        }

        let settingForPalette = FractalView.currentSettings["colour_options_palette"];
        if (KeyColoursMatches[settingForPalette]) {
            thisColourArray = KeyColoursMatches[settingForPalette];
        }

        let overRideByHighlight = false; //
        if (FractalView.currentSettings["highlight_options_showHighlights"] == true) {
            overRideByHighlight = doHighlightFor(gen, pos, ahnNum);
        }
        if (overRideByHighlight == true) {
            return "yellow";
        }

        if (ahnNum == 1) {
            return thisColourArray[0];
        }

        let numThisGen = 2 ** gen;

        if (settingForColourBy == "Gender") {
            return thisColourArray[1 + (ahnNum % 2)];
        } else if (settingForColourBy == "Generation") {
            if (settingForPalette == "Rainbow") {
                for (var i = 0; i < FractalView.numGens2Display; i++) {
                    thisColourArray[FractalView.numGens2Display - i] = Rainbow8[i];
                }
            }
            return thisColourArray[1 + (gen % thisColourArray.length)];
        } else if (settingForColourBy == "Grand") {
            return thisColourArray[1 + (Math.floor((4 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "GGrand") {
            return thisColourArray[1 + (Math.floor((8 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "GGGrand") {
            if (settingForPalette == "Rainbow") {
                thisColourArray = RainbowArrayLong;
            }
            return thisColourArray[1 + (Math.floor((16 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "GGGGrand") {
            if (settingForPalette == "Rainbow") {
                thisColourArray = RainbowArrayLong;
            }
            return thisColourArray[1 + (Math.floor((32 * pos) / numThisGen) % thisColourArray.length)];
        } else if (settingForColourBy == "Town") {
        } else if (settingForColourBy == "Region") {
        } else if (settingForColourBy == "Country") {
        } else if (settingForColourBy == "random") {
            return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
        }

        return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
    }
})();
