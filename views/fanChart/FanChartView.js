/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Fan Chart uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 
* There is a Button Bar TABLE at the top of the container, 
 * then the SVG graphic is below that.
 * 
 * The FIRST chunk of code in the SVG graphic are the <path> objects for the individual wedges of the Fan Chart,
 * each with a unique ID of wedgeAnB, where A = generation #, and B = position # within that generation, counting from far left, clockwise
 * 
 * The SECOND chunk in the SVG graphic are the individual people in the Fan Chart, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class"person ancestor" transformed object with a translation from 0,0 and a rotation></g>
 * 
 * The Button Bar does not resize, but has clickable elements, which set global variables in the FanChartView, then calls a redraw
 */
(function () {
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;

    /**
     * Constructor
     */
    var FanChartView = (window.FanChartView = function () {
        Object.assign(this, this?.meta());
    });

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
    var numRepeatAncestors = 0;
    var repeatAncestorTracker = new Object();

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Fan Chart

    /** Static variable to hold unique ids for private persons **/
    FanChartView.nextPrivateId = -1;

    /** Static variable to hold the Maximum Angle for the Fan Chart (360 full circle / 240 partial / 180 semicircle)   **/
    FanChartView.maxAngle = 240;
    FanChartView.lastAngle = 240;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    FanChartView.numGens2Display = 5;
    FanChartView.lastNumGens = 5;
    FanChartView.numGensRetrieved = 5;
    FanChartView.maxNumGens = 10;
    FanChartView.workingMaxNumGens = 6;

    /** Object to hold the Ahnentafel table for the current primary individual   */
    FanChartView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    FanChartView.currentSettings = {};

    FanChartView.mySettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
        tabs: [
            // {
            //     name: "general",
            //     label: "General",
            //     hideSelect: true,
            //     subsections: [{ name: "FanChartGeneral", label: "General settings" }],
            //     comment: "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
            // },
            {
                name: "names",
                label: "Names",
                hideSelect: true,
                subsections: [{ name: "FanChartNames", label: "NAMES format" }],
                comment: "These options apply to how the ancestor names will displayed in each Fan Chart cell.",
            },
            // {
            //     name: "dates",
            //     label: "Dates",
            //     hideSelect: true,
            //     subsections: [{ name: "FanChartDates", label: "DATES of events     " }],
            //     comment: "These options apply to the Date format to use for birth, marriages, & deaths.",
            // },
            // {
            //     name: "places",
            //     label: "Places",
            //     hideSelect: true,
            //     subsections: [{ name: "FanChartPlaces", label: "PLACES of events     " }],
            //     comment: "These options apply to the Places displayed for birth, marriages, & deaths.",
            // },
            {
                name: "photos",
                label: "Photos",
                hideSelect: true,
                subsections: [{ name: "FanChartPhotos", label: "PHOTOS    " }],
                comment: "These options determine if photos are displayed or not.",
            },
            // {
            //     name: "colours",
            //     label: "Colours",
            //     hideSelect: true,
            //     subsections: [{ name: "FanChartColours", label: "COLOURS   " }],
            //     comment: "These options apply to background colours in the Fan Chart cells.",
            // },
            // {
            //     name: "highlights",
            //     label: "Highlights",
            //     hideSelect: true,
            //     subsections: [{ name: "FanChartHighlights", label: "HIGHLIGHTING   " }],
            //     comment: "These options determine which, if any, cells should be highlighted (in order to stand out). ",
            // },
        ],
        optionsGroups: [
            {
                tab: "general",
                subsection: "FanChartGeneral",
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
                subsection: "FanChartNames",
                category: "name",
                subcategory: "options",
                options: [
                    { optionName: "prefix", label: "Show Prefix before full name", type: "checkbox", defaultValue: 0 },
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
                    { optionName: "middleInitial", label: "Show Middle Initial", type: "checkbox", defaultValue: 0 },
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
                    { optionName: "suffix", label: "Show Suffix after full name", type: "checkbox", defaultValue: 0 },
                ],
            },

            {
                tab: "dates",
                subsection: "FanChartDates",
                category: "date",
                subcategory: "options",
                options: [
                    { optionName: "showBirth", label: "Show Birth Date", type: "checkbox", defaultValue: true },
                    { optionName: "showDeath", label: "Show Death Date", type: "checkbox", defaultValue: true },
                    { optionName: "showLifeSpan", label: "Show LifeSpan", type: "checkbox", defaultValue: 0 },
                    { optionName: "break1", type: "br" },
                    { optionName: "showMarriage", label: "Show Marriage Date", type: "checkbox", defaultValue: 0 },
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
                subsection: "FanChartPlaces",
                category: "place",
                subcategory: "options",
                options: [
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
                            { value: "TownCountry", text: "TownCountry" },
                            { value: "RegionCountry", text: "Region, Country" },
                            { value: "TownRegion", text: "Town, Region" },
                        ],
                        defaultValue: "Full",
                    },
                    { optionName: "break1", type: "br" },
                    { optionName: "showMarriage", label: "Show Marriage Loactions", type: "checkbox", defaultValue: 0 },
                    { optionName: "break2", comment: "Marriage Location Format:", type: "br" },
                    {
                        optionName: "locationFormatM",
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
                ],
            },
            {
                tab: "photos",
                subsection: "FanChartPhotos",
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
                subsection: "FanChartColours",
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
                            { value: "Town", text: "by Place name" },
                            { value: "Region", text: "by Region (Province/State)" },
                            { value: "Country", text: "by Country" },
                        ],
                        defaultValue: "Generation",
                    },
                    {
                        optionName: "palette",
                        type: "select",
                        label: "Colour Palette",
                        values: [
                            { value: "Greys", text: "Shades of Grey" },
                            { value: "Reds", text: "Shades of Greens" },
                            { value: "Blues", text: "Shades or Blues" },
                            { value: "Pastels", text: "Pastel colours" },
                            { value: "Rainbow", text: "Traditional Rainbow of colours" },
                            { value: "Ancestry", text: "Ancestry type colours" },
                            { value: "MyHeritage", text: "My Heritage type colours" },
                        ],
                        defaultValue: "Pastels",
                    },
                ],
            },
            {
                tab: "highlights",
                subsection: "FanChartHighlights",
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

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    FanChartView.theAncestors = [];

    FanChartView.prototype.meta = function () {
        return {
            title: "Fan Chart",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    FanChartView.prototype.init = function (selector, startId) {
        // console.log("FanChartView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;

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
            '<div id=btnBarDIV><table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%" style="padding-left:10px;"><A onclick="FanChartView.maxAngle = 360; FanChartView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan360.png" /></A> |' +
            ' <A onclick="FanChartView.maxAngle = 240; FanChartView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></A> |' +
            ' <A onclick="FanChartView.maxAngle = 180; FanChartView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="center">' +
            ' <A onclick="FanChartView.numGens2Display -=1; FanChartView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>5</span> generations ]" +
            ' <A onclick="FanChartView.numGens2Display +=1; FanChartView.redraw();"> +1 </A> ' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="right"  style="padding-right:10px;"> &#x1F4BE; |' +
            ' <A onclick="FanChartView.toggleSettings();"><font size=+2>&#x2699;</font></A></td>' +
            '</tr></table></div><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Fan Chart is loading ...</DIV>';

        var settingsHTML = "";
        // '<div id=settingsDIV style="display:inline-block; position:absolute; right:20px; background-color:aliceblue; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">'+
        // '<span style="color:red; align:left"><A onclick="FanChartView.cancelSettings();">[ <B><font color=red>x</font></B> ]</A></span>' ;
        // '<H3 align=center>Fan Chart Settings</H3>' +

        settingsHTML += FanChartView.mySettingsOptionsObject.createdSettingsDIV; // +
        // console.log("SETTINGS:",settingsHTML);

        // '<ul class="profile-tabs">' +
        //     '<li id=general-tab>General</li>' +
        //     '<li id=names-tab>Names</li>' +
        //     '<li id=dates-tab>Dates</li>' +
        //     '<li id=places-tab>Places</li>' +
        //     '<li id=photos-tab>Photos</li>' +
        //     '<li id=colours-tab>Colours</li>' +
        //     '<li id=highlights-tab>Highlights</li>' +
        // '</ul>' +
        // '<div id=general-panel></div>' +
        // '<div id=names-panel></div>' +
        // '<div id=dates-panel></div>' +
        // '<div id=places-panel></div>' +
        // '<div id=photos-panel></div>' +
        // '<div id=colours-panel></div>' +
        // '<div id=highlights-panel></div>' +

        //     '<br />    <div align="center">      <div id="status"></div>      <button id="save" class="saveButton">Save changes (all tabs)</button>'
        // '</div>';

        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        container.innerHTML = btnBarHTML + settingsHTML;

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        function settingsChanged(e) {
            if (FanChartView.mySettingsOptionsObject.hasSettingsChanged(FanChartView.currentSettings)) {
                console.log("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                console.log("NEW settings are:", FanChartView.currentSettings);
                FanChartView.myAncestorTree.draw();
            } else {
                console.log("NOTHING happened according to SETTINGS OBJ");
            }
        }

        // NEXT STEPS : Assign thisVal to actual currentSetting object
        // NEXT STEPS : Transfer this function to SettingsObject class
        // NEXT STEPS : Return a True/False based on whether any changes were actually made --> THEN - call reDraw routine if needed

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
        // Setup controllers for the ancestor tree which will be displayed as the Fan Chart
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
            CREATE the FAN CHART Backdrop 
            * Made of mostly Wedges (starting with the outermost circle)
            * Ending with 2 Sectors for the penultimate pair  - the parents of the central circular superhero
        */

        for (let genIndex = FanChartView.maxNumGens - 1; genIndex >= 0; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                if (genIndex <= 1) {
                    // Use a SECTOR for the parents
                    svg.append("path").attr(
                        SVGfunctions.getSVGforSector(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                (index * FanChartView.maxAngle) / 2 ** genIndex,
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                ((index + 1) * FanChartView.maxAngle) / 2 ** genIndex,
                            "wedge" + 2 ** genIndex + "n" + index,
                            "black",
                            2,
                            "white"
                        )
                    );
                } else {
                    // Use a WEDGE for ancestors further out
                    svg.append("path").attr(
                        SVGfunctions.getSVGforWedge(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            270 * (genIndex - 0.5),
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                (index * FanChartView.maxAngle) / 2 ** genIndex,
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                ((index + 1) * FanChartView.maxAngle) / 2 ** genIndex,
                            "wedge" + 2 ** genIndex + "n" + index,
                            "black",
                            2,
                            "white"
                        )
                    );
                }
            }
        }
        // HIDE all the unused Wedges in the outer rims that we don't need yet
        for (let genIndex = FanChartView.maxNumGens - 1; genIndex > FanChartView.numGens2Display - 1; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attr({ display: "none" });
            }
        }

        // CREATE a CIRCLE for the Central Person to be drawn on top of
        svg.append("circle").attr({
            "cx": 0,
            "cy": 0,
            "r": 135,
            "id": "ctrCirc",
            "fill": "white",
            "stroke": "black",
            "stroke-width": "2",
        });

        self.load(startId);
        console.log(FanChartView.mySettingsOptionsObject.createdSettingsDIV);
        FanChartView.mySettingsOptionsObject.buildPage();
        FanChartView.mySettingsOptionsObject.setActiveTab("names");
        FanChartView.currentSettings = FanChartView.mySettingsOptionsObject.getDefaultOptions();
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
        if (FanChartView.numGens2Display < 3) {
            FanChartView.numGens2Display = 3;
            showTemporaryMessageBelowButtonBar("3 is the minimum number of generations you can display.");
        } else if (FanChartView.numGens2Display > FanChartView.workingMaxNumGens) {
            FanChartView.numGens2Display = FanChartView.workingMaxNumGens;
            if (FanChartView.workingMaxNumGens < FanChartView.maxNumGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
                );
            } else {
                showTemporaryMessageBelowButtonBar(
                    FanChartView.maxNumGens + " is the maximum number of generations you can display."
                );
            }
        }

        var numGensSpan = document.querySelector("#numGensInBBar");
        numGensSpan.textContent = FanChartView.numGens2Display;
        // console.log("numGensSpan:", numGensSpan);
        if (FanChartView.numGens2Display > FanChartView.numGensRetrieved) {
            loadAncestorsAtLevel(FanChartView.numGens2Display);
            FanChartView.numGensRetrieved = FanChartView.numGens2Display;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        console.log("Need to load MORE peeps from Generation ", newLevel);
        let theListOfIDs = FanChartView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        // console.log(theListOfIDs);
        if (theListOfIDs.length == 0) {
            // console.log("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            FanChartView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            FanChartView.numGensRetrieved++;
            FanChartView.workingMaxNumGens = Math.min(FanChartView.maxNumGens, FanChartView.numGensRetrieved + 1);
        } else {
            WikiTreeAPI.getRelatives(
                theListOfIDs,
                [
                    "Id",
                    "Derived.BirthName",
                    "Derived.BirthNamePrivate",
                    "FirstName",
                    "MiddleInitial",
                    "MiddleName",
                    "RealName",
                    "Nicknames",
                    "Prefix",
                    "Suffix",
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
                    FanChartView.theAncestors = result;
                    console.log("theAncestors:", FanChartView.theAncestors);
                    // console.log("person with which to drawTree:", person);
                    for (let index = 0; index < FanChartView.theAncestors.length; index++) {
                        thePeopleList.add(FanChartView.theAncestors[index].person);
                    }
                    FanChartView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    FanChartView.workingMaxNumGens = Math.min(
                        FanChartView.maxNumGens,
                        FanChartView.numGensRetrieved + 1
                    );

                    clearMessageBelowButtonBar();
                }
            });
        }
    }
    // Redraw the Wedges if needed for the Fan Chart
    function redoWedgesForFanChart() {
        // console.log("TIme to RE-WEDGIFY !", this, FanChartView);

        if (
            FanChartView.lastAngle != FanChartView.maxAngle ||
            FanChartView.lastNumGens != FanChartView.numGens2Display
        ) {
            // ONLY REDO the WEDGES IFF the maxAngle has changed (360 to 240 to 180 or some combo like that)
            for (let genIndex = FanChartView.numGens2Display - 1; genIndex >= 0; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    let SVGcode = "";
                    if (genIndex <= 1) {
                        SVGcode = SVGfunctions.getSVGforSector(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                (index * FanChartView.maxAngle) / 2 ** genIndex,
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                ((index + 1) * FanChartView.maxAngle) / 2 ** genIndex,
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
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                (index * FanChartView.maxAngle) / 2 ** genIndex,
                            (180 - FanChartView.maxAngle) / 2 +
                                90 +
                                90 +
                                ((index + 1) * FanChartView.maxAngle) / 2 ** genIndex,
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
            for (let genIndex = FanChartView.maxNumGens - 1; genIndex > FanChartView.numGens2Display - 1; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attr({ display: "none" });
                }
            }
            FanChartView.lastAngle = FanChartView.maxAngle;
            FanChartView.lastNumGens = FanChartView.numGens2Display;
        }
    }

    /** FUNCTION used to force a redraw of the Fan Chart, used when called from Button Bar after a parameter has been changed */

    FanChartView.redraw = function () {
        // console.log("FanChartView.redraw");
        // console.log("Now theAncestors = ", FanChartView.theAncestors);
        // thePeopleList.listAll();
        recalcAndDisplayNumGens();
        redoWedgesForFanChart();
        FanChartView.myAncestorTree.draw();
    };

    FanChartView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };

    FanChartView.toggleSettings = function () {
        console.log("TIME to TOGGLE the SETTINGS NOW !!!", FanChartView.mySettingsOptionsObject);
        console.log(FanChartView.mySettingsOptionsObject.getDefaultOptions());
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
    FanChartView.prototype.load = function (id) {
        // console.log("FanChartView.prototype.load");
        var self = this;
        self._load(id).then(function (person) {
            // console.log("FanChartView.prototype.load : self._load(id) ");
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

            WikiTreeAPI.getAncestors(id, 5, [
                "Id",
                "Derived.BirthName",
                "Derived.BirthNamePrivate",
                "FirstName",
                "MiddleInitial",
                "MiddleName",
                "RealName",
                "Nicknames",
                "Prefix",
                "Suffix",
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
                FanChartView.theAncestors = result;
                console.log("theAncestors:", FanChartView.theAncestors);
                console.log("person with which to drawTree:", person);
                for (let index = 0; index < FanChartView.theAncestors.length; index++) {
                    const element = FanChartView.theAncestors[index];
                    thePeopleList.add(FanChartView.theAncestors[index]);
                }
                FanChartView.myAhnentafel.update(person);
                self.drawTree(person);
                clearMessageBelowButtonBar();
            });
        });
    };

    /**
     * Load more ancestors. Update existing data in place
     */
    FanChartView.prototype.loadMore = function (oldPerson) {
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
    FanChartView.prototype._load = function (id) {
        // console.log("INITIAL _load - line:118", id) ;
        let thePersonObject = WikiTreeAPI.getPerson(id, [
            "Id",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "FirstName",
            "MiddleInitial",
            "MiddleName",
            "RealName",
            "Nicknames",
            "Prefix",
            "Suffix",
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
    FanChartView.prototype.drawTree = function (data) {
        // console.log("FanChartView.prototype.drawTree");

        if (data) {
            // console.log("(FanChartView.prototype.drawTree WITH data !)");
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
            var nodes = FanChartView.myAhnentafel.listOfAncestorsForFanChart(FanChartView.numGens2Display); // [];//this.tree.nodes(this.root);

            console.log("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);
            // links = this.tree.links(nodes);
            // this.drawLinks(links);
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
        console.log("Tree.prototpe.DRAW NODES", nodes);
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

        // *********************
        // ADD new nodes
        // *********************
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // console.log("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);

        // *********************
        // Draw the person boxes (part of the ADD routine)
        // *********************
        // * This happens ONCE when a node (person) is created for the first time
        // * It will happen again IF a node has been destroyed (with the exit - remove() command) and then recreated
        // * which happens if you decrease the # of generations (by two) then go back up again
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

                let theClr = "none";
                if (FanChartView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                    if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                        theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                    } else {
                        numRepeatAncestors++;
                        theClr = ColourArray[numRepeatAncestors];
                        repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                    }
                }

                // console.log(ancestorObject.ahnNum, ancestorObject.person._data.Id, repeatAncestorTracker[ancestorObject.person._data.Id], WebsView.myAhnentafel.listByPerson[ ancestorObject.person._data.Id ]);

                if (thisGenNum >= 9) {
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box" style="background-color: ${theClr} ; border:0; padding: 0px;">
                        <div class="name"    id=nameDivFor${
                            ancestorObject.ahnNum
                        } style="font-size: 10px;" ><B>${getShortName(person)}</B></div>
                        </div>
                    `;
                } else if (thisGenNum >= 8) {
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box" style="background-color: ${theClr} ; border:0; padding: 0px;">
                        <div class="name"   id=nameDivFor${
                            ancestorObject.ahnNum
                        }  style="font-size: 14px;" ><B>${getShortName(person)}</B></div>
                        </div>
                    `;
                } else if (thisGenNum >= 7) {
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box" style="background-color: ${theClr} ; border:0; padding: 3px;">
                        <div class="name"  id=nameDivFor${ancestorObject.ahnNum}><B>${getSettingsName(person)}</B></div>
                        </div>
                    `;
                } else if (thisGenNum >= 4) {
                    let photoUrl = person.getPhotoUrl(75),
                        treeUrl = window.location.pathname + "?id=" + person.getName();

                    // Use generic gender photos if there is not profile photo available
                    //console.log(
                    //     "FanChartView.currentSettings[photo_options_useSilhouette] : ",
                    //     FanChartView.currentSettings["photo_options_useSilhouette"]
                    // );
                    if (!photoUrl) {
                        if (person.getGender() === "Male") {
                            photoUrl = "images/icons/male.gif";
                        } else {
                            photoUrl = "images/icons/female.gif";
                        }
                    }
                    let photoDiv = "";
                    if (photoUrl) {
                        photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
                    }
                    return `
                    <div  id=wedgeBoxFor${
                        ancestorObject.ahnNum
                    } class="box" style="background-color: ${theClr} ; border:0; "> 
                    ${photoDiv}
                    <div class="name centered" id=nameDivFor${ancestorObject.ahnNum}><B>${getSettingsName(
                        person
                    )}</B></div>
                    <div class="lifespan">${lifespan(person)}</div>
                    </div>
                    `;
                } else {
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
                    let photoDiv = "";
                    if (photoUrl) {
                        photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
                    }

                    return `<div class="top-info" id=wedgeInfoFor${
                        ancestorObject.ahnNum
                    } style="background-color: ${theClr} ; border:0; ">
                     <div class="vital-info">
						${photoDiv}
						  <div class="name centered" id=nameDivFor${ancestorObject.ahnNum}>
						    <b>${getSettingsName(person)}</b>						    
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>
                    `;
                }
            });

        // Show info popup on click
        nodeEnter.on("click", function (ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            d3.event.stopPropagation();
            self.personPopup(person, d3.mouse(self.svg.node()));
        });

        // set this variable so that we can access this tree and redraw it at any time when needed - a scoping issue solution!
        FanChartView.myAncestorTree = self;

        // ****************
        // REMOVE old nodes
        // * Just works ....
        // ****************

        node.exit().remove();

        // *****************************
        // *
        // * TRANSFORM existing nodes based on new info
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

            d = ancestorObject.person; // == thePeopleList[ person.id ];

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            // Calculate which position # (starting lower left and going clockwise around the fan chart) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;

            let theInfoBox = document.getElementById("wedgeInfoFor" + ancestorObject.ahnNum);
            let theNameDIV = document.getElementById("nameDivFor" + ancestorObject.ahnNum);

            if (theInfoBox) {
                // let theBounds = theInfoBox; //.getBBox();
                // console.log("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                theNameDIV.innerHTML = "<B>" + getSettingsName(d) + "</B>";
                theInfoBox.parentNode.parentNode.setAttribute("y", -60);
                if (ancestorObject.ahnNum == 1) {
                    // console.log("BOUNDS for Central Perp: ", theInfoBox.getBoundingClientRect() );
                    theInfoBox.parentNode.parentNode.setAttribute("y", -120);
                    theInfoBox.parentNode.parentNode.setAttribute("x", -125);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 250);
                } else if (ancestorObject.ahnNum > 7 && FanChartView.maxAngle == 180) {
                    theInfoBox.parentNode.parentNode.setAttribute("x", -140);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 280);
                } else if (thisGenNum == 1 && FanChartView.maxAngle == 180) {
                    theInfoBox.parentNode.parentNode.setAttribute("x", -160);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 320);
                }
            } else {
                theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                theInfoBox.parentNode.parentNode.setAttribute("width", 266);
                theInfoBox.parentNode.parentNode.setAttribute("x", -133);

                if (thisGenNum == 4) {
                    theInfoBox.parentNode.parentNode.setAttribute("y", -80);
                    if (FanChartView.maxAngle == 180) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -70);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 140);
                    }
                }
            }

            // Placement Angle = the angle at which the person's name card should be placed. (in degrees, where 0 = facing due east, thus the starting point being 180, due west, with modifications)
            let placementAngle =
                180 +
                (180 - FanChartView.maxAngle) / 2 +
                (FanChartView.maxAngle / numSpotsThisGen) * (0.5 + thisPosNum);
            // Name Angle = the angle of rotation for the name card so that it is readable easily in the Fan Chart (intially, perpendicular to the spokes of the Fan Chart so that it appears horizontal-ish)
            let nameAngle = 90 + placementAngle;
            if (thisGenNum > 4) {
                // HOWEVER ... once we have Too Many cooks in the kitchen, we need to be more efficient with our space, so need to switch to a more vertical-ish approach, stand the name card on its end (now parallel to the spokes)
                nameAngle += 90;

                // AND ... if we go beyond the midpoint in this particular ring, we need to rotate it another 180 degrees so that we don't have to read upside down.  All name cards should be readable, facing inwards to the centre of the Fan Chart
                if (thisPosNum >= numSpotsThisGen / 2) {
                    nameAngle += 180;
                }

                // hide photos as well (for now at least)
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV) {
                    thePhotoDIV.style.display = "none";
                }

                // IF we are in the outer rims, then we need to adjust / tweak the angle since it uses the baseline of the text as its frame of reference
                if (thisGenNum > 6) {
                    let fontRadii = { 7: 9, 8: 13, 9: 15 };
                    let fontRadius = fontRadii[thisGenNum];
                    let tweakAngle = (Math.atan(fontRadius / (thisGenNum * thisRadius)) * 180) / Math.PI;
                    // console.log("Gen",thisGenNum, "TweakAngle = ",tweakAngle);
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        placementAngle += tweakAngle;
                    } else {
                        placementAngle -= tweakAngle;
                    }
                }
            }
            let photoUrl = d.getPhotoUrl(75);
            if (
                !photoUrl &&
                FanChartView.currentSettings["photo_options_useSilhouette"] == true &&
                FanChartView.currentSettings["photo_options_showAllPics"] == true &&
                (FanChartView.currentSettings["photo_options_showPicsToN"] == false ||
                    (FanChartView.currentSettings["photo_options_showPicsToN"] == true &&
                        thisGenNum < FanChartView.currentSettings["photo_options_showPicsToValue"]))
            ) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV) {
                    thePhotoDIV.style.display = "block";
                }
            } else if (
                (!photoUrl &&
                    (FanChartView.currentSettings["photo_options_useSilhouette"] == false ||
                        FanChartView.currentSettings["photo_options_showAllPics"] == false)) ||
                (FanChartView.currentSettings["photo_options_showPicsToN"] == true &&
                    thisGenNum >= FanChartView.currentSettings["photo_options_showPicsToValue"])
            ) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV) {
                    thePhotoDIV.style.display = "none";
                }
            } else if (ancestorObject.ahnNum == 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV && FanChartView.currentSettings["photo_options_showCentralPic"] == true) {
                    thePhotoDIV.style.display = "block";
                } else if (thePhotoDIV && FanChartView.currentSettings["photo_options_showCentralPic"] == false) {
                    thePhotoDIV.style.display = "none";
                    theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    console.log("ADJUSTING the CENTRAL PERSON INFO without PIC downwards, i hope");
                }
            } else if (ancestorObject.ahnNum > 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);

                if (thePhotoDIV && FanChartView.currentSettings["photo_options_showAllPics"] == true) {
                    // Check to see if there are restrictions
                    if (FanChartView.currentSettings["photo_options_showPicsToN"] == false) {
                        // show All Pics - no restrictions
                        thePhotoDIV.style.display = "block";
                    } else {
                        // ONLY show Pics up to a certain Generation #
                        if (thisGenNum < FanChartView.currentSettings["photo_options_showPicsToValue"]) {
                            thePhotoDIV.style.display = "block";
                        } else {
                            thePhotoDIV.style.display = "none";
                        }
                    }
                } else if (thePhotoDIV && FanChartView.currentSettings["photo_options_showAllPics"] == false) {
                    thePhotoDIV.style.display = "none";
                }
            }

            // HERE we get to use some COOL TRIGONOMETRY to place the X,Y position of the name card using basically ( rCOS(ø), rSIN(ø) )  --> see that grade 11 trig math class paid off after all!!!
            let newX = thisGenNum * thisRadius * Math.cos((placementAngle * Math.PI) / 180);
            let newY = thisGenNum * thisRadius * Math.sin((placementAngle * Math.PI) / 180);
            // console.log(
            //     "Place",
            //     d._data.Name,
            //     "ahnNum:" + ancestorObject.ahnNum,
            //     "Gen:" + thisGenNum,
            //     "Pos:" + thisPosNum,
            //     FanChartView.maxAngle
            // );

            // FINALLY ... we return the transformation statement back - the translation based on our Trig calculations, and the rotation based on the nameAngle
            return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
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
						    <span class="tree-links"><a onClick="newTree('${person.getName()}');" href="#"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
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
        FanChartView.numGens2Display = 5;
        FanChartView.lastNumGens = 5;
        FanChartView.numGensRetrieved = 5;
        FanChartView.maxNumGens = 10;

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
     * Return the name as required by the Settings options.
     */
    function getSettingsName(person) {
        const maxLength = 50;

        let theName = "";

        if (FanChartView.currentSettings["name_options_firstName"] == "FirstNameAtBirth") {
            theName = person._data.FirstName;
        } else {
            theName = person._data.RealName;
        }

        if (FanChartView.currentSettings["name_options_middleName"] == true) {
            if (person._data.MiddleName > "") {
                theName += " " + person._data.MiddleName;
            }
        } else if (FanChartView.currentSettings["name_options_middleInitial"] == true) {
            if (person._data.MiddleInitial > "") {
                theName += " " + person._data.MiddleInitial;
            }
        }

        if (FanChartView.currentSettings["name_options_nickName"] == true) {
            if (person._data.Nicknames > "") {
                theName += ' "' + person._data.Nicknames + '"';
            }
        }

        if (FanChartView.currentSettings["name_options_lastName"] == "LastNameAtBirth") {
            theName += " " + person._data.LastNameAtBirth;
        } else {
            theName += " " + person._data.LastNameCurrent;
        }

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

    function getAngleOfRotation(theElement) {
        console.log("getAngleOfRotation of ", theElement.parentNode.parentNode.parentNode);
        let theBigElement = theElement.parentNode.parentNode.parentNode;
        // let theTransform = theBigElement.getPropertyOf("transform");
        console.log("t:", theBigElement["transform"]);
        // let theTransform = theBigElement.transform.baseVal;
        console.log("theTransform:", theTransform);
        for (let t in theTransform) {
            const transformObj = theTransform[t];
            console.log("obj:", transformObj);
        }

        console.log("Count: " + theTransform.length);

        return 9;
    }
})();
