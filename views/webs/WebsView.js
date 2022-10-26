/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Ancestor Webs uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 
* There is a Button Bar TABLE at the top of the container, 
 * then the SVG graphic is below that.
 * 
 * The FIRST chunk of code in the SVG graphic are the <line> objects for the connectors of the Ancestor Webs,
 * each with a unique ID of wedgeAnB, where A = generation #, and B = position # within that generation, counting from far left, clockwise
 * 
 * The SECOND chunk in the SVG graphic are the individual people in the Ancestor Webs, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class"person ancestor" transformed object with a translation from 0,0 ></g>
 * 
 * The Button Bar does not resize, but has clickable elements, which set global variables in the WebsView, then calls a redraw
 */
(function () {
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2,
        vertSpacing = 60;

    /**
     * Constructor
     */
    var WebsView = (window.WebsView = function () {
        Object.assign(this, this?.meta());
    });

    const PERSON_SILHOUETTE = "👤";
    const PRINTER_ICON = "&#x1F4BE;";
    const SETTINGS_GEAR = "&#x2699;";

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

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Ancestor Webs

    /** Primary Person */
    WebsView.primePerson = null;

    /** Static variable to hold unique ids for private persons **/
    WebsView.nextPrivateId = -1;

    // Static Variable to track when Repeat Ancestors begin (if at all)
    WebsView.repeatsStartAtGenNum = 99;

    /** Static variable to hold the y Direction variable (+1 for going downwards, -1 for going upwards) from Central person to Ancestors    **/
    WebsView.yDir = -1;

    /** Static variable to hold the current MODE  (Full / Unique / Indi / MultiUnique / MultiIndi )     **/
    WebsView.viewMode = "Full";

    /** Static variable to hold the current Central Person Number **/
    WebsView.currentPersonNum = 0;

    /** Static variable to hold the current Repeat Ancestor Number **/
    WebsView.repeatAncestorNum = -1;

    // Connection to thePeopleList you can use inside WebsView
    WebsView.PeopleList = thePeopleList;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    WebsView.numGens2Display = 3;
    WebsView.lastNumGens = 3;
    WebsView.numGensRetrieved = 3;
    WebsView.maxNumGens = 14;
    WebsView.workingMaxNumGens = 4;

    /** Object to hold the Ahnentafel table for the current primary individual   */
    WebsView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    WebsView.theAncestors = [];

    /** Array to hold the list of all Repeated Ancestors  */
    WebsView.listOfRepeatAncestors = [];

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    WebsView.currentSettings = {};

    
    WebsView.prototype.meta = function () {
        return {
            title: "Ancestor Webs",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    WebsView.prototype.init = function (selector, startId) {
        // console.log("WebsView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;


    WebsView.websSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
        viewClassName: "WebsView",
        tabs: [
            // {
            //     name: "general",
            //     label: "General",
            //     hideSelect: true,
            //     subsections: [{ name: "WebsGeneral", label: "General settings" }],
            //     comment: "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
            // },
            {
                name: "names",
                label: "Initials / Names",
                hideSelect: true,
                subsections: [{ name: "WebsNames", label: "NAMES format" }],
                // comment: "These options apply to how the names will be displayed in each chart.",
            },
            // {
            //     name: "dates",
            //     label: "Dates",
            //     hideSelect: true,
            //     subsections: [{ name: "WebsDates", label: "DATES of events     " }],
            //     comment: "These options apply to the Date format to use for birth, marriages, & deaths.",
            // },
            // {
            //     name: "places",
            //     label: "Places",
            //     hideSelect: true,
            //     subsections: [{ name: "WebsPlaces", label: "PLACES of events     " }],
            //     comment: "These options apply to the Places displayed for birth, marriages, & deaths.",
            // },
            {
                name: "paths",
                label: "Multi-Paths",
                hideSelect: true,
                subsections: [{ name: "WebsPaths", label: "Multi-Path" }],
                comment: "These options determine how the multi-paths to a SINGLE ancestor are displayed.",
            },
        ],
        optionsGroups: [
            // {
            //     tab: "general",
            //     subsection: "WebsGeneral",
            //     category: "general",
            //     subcategory: "options",
            //     options: [
            //         {
            //             optionName: "font",
            //             type: "radio",
            //             label: "Font",
            //             values: [
            //                 { value: "Arial", text: "Arial" },
            //                 { value: "Courier", text: "Courier" },
            //                 { value: "Times", text: "Times" },
            //                 { value: "Fantasy", text: "Fantasy" },
            //                 { value: "Script", text: "Script" },
            //             ],
            //             defaultValue: "Arial",
            //         },
            //     ],
            // },

            {
                tab: "names",
                subsection: "WebsNames",
                category: "name",
                subcategory: "options",
                options: [
                    { optionName: "sect1", comment: "Multi-Ancestor Views: [Full/Unique/Repeat/Common]", type: "br" },

                    {
                        optionName: "multiNameFormat",
                        type: "radio",
                        label: "",
                        values: [
                            { value: "F", text: "First Initial only" },
                            { value: "br" },
                            { value: "FL", text: "First Initial + LNAB Initial" },
                            { value: "br" },
                            { value: "FML", text: "First Initial(s) + Middle Initial(s) + LNAB Initial" },
                            { value: "br" },
                            { value: "FLname", text: "Short Name (First Name + LNAB, fniceirst initial if needed)" },
                            { value: "br" },
                            { value: "FnameLname", text: "Full Name (First Name + LNAB)" },
                        ],
                        defaultValue: "FL",
                    },

                    { optionName: "sect2", comment: "Single Ancestor Views:", type: "br" },

                    {
                        optionName: "indiNameFormat",
                        type: "radio",
                        label: "",
                        values: [
                            { value: "F", text: "First Initial only" },
                            { value: "br" },
                            { value: "FL", text: "First Initial + LNAB Initial" },
                            { value: "br" },
                            { value: "FML", text: "First Initial(s) + Middle Initial(s) + LNAB Initial" },
                            { value: "br" },
                            { value: "FLname", text: "Short Name (First Name + LNAB, first initial if needed)" },
                            { value: "br" },
                            { value: "FnameLname", text: "Full Name (First Name + LNAB)" },
                        ],
                        defaultValue: "FLname",
                    },
                ],
            },

            {
                tab: "paths",
                subsection: "WebsPaths",
                category: "path",
                subcategory: "options",
                options: [
                    {
                        optionName: "multiPathFormat",
                        type: "radio",
                        label: "",
                        values: [
                            { value: "jagged", text: "use jagged path, excerpt from Full Pedigree Tree route" },
                            { value: "br" },
                            { value: "smooth", text: "use smooth linear vertical path" },
                            { value: "br" },
                        ],
                        defaultValue: "smooth",
                    },

                    // {
                    //     optionName: "showCouple",
                    //     label: "Show the Ancestral Couple at the top, if descendant of both",
                    //     type: "checkbox",
                    //     defaultValue: false,
                    // },
                ],
            },
            //
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
            '<font size=+2><A onclick="WebsView.yDir = -1; WebsView.redraw();">&uarr;</A>' +
            ' <A onclick="WebsView.yDir = 1; WebsView.redraw();">&darr;</A></font>  &nbsp;&nbsp;&nbsp; ' +
            ` <A onclick="WebsView.viewMode='Full'; WebsView.redraw();">FULL</A> | ` +
            ` <A onclick="WebsView.viewMode='Unique'; WebsView.redraw();">UNIQUE</A> | ` +
            ` <A onclick="WebsView.viewMode='Repeats'; WebsView.redraw();">REPEAT</A> | ` +
            ` <A onclick="WebsView.viewMode='Indi'; WebsView.redraw();">SINGLE</A>  ` +
            //  ' <A onclick="WebsView.maxAngle = 180; WebsView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="center">' +
            ' <A onclick="WebsView.numGens2Display -=1; WebsView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>3</span> generations ]" +
            ' <A onclick="WebsView.numGens2Display +=1; WebsView.redraw();"> +1 </A> ' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="right"><A onclick="WebsView.comingSoon(1);"><B>+</B>' +
            PERSON_SILHOUETTE +
            "</A> &nbsp; " +
            '  <A onclick="WebsView.comingSoon(2);">COMMON</A> |  <A onclick="WebsView.comingSoon(3);">SINGLES</A> ' +
            "&nbsp;&nbsp;&nbsp;&nbsp;" +
            //  PRINTER_ICON +
            "  <font size=+2>" +
            // SETTINGS_GEAR + "</font>&nbsp;&nbsp;" +
            ' <A onclick="WebsView.toggleSettings();"><font size=+2>' +
            SETTINGS_GEAR +
            "</font></A>" +
            "&nbsp;&nbsp;</td>" +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Ancestor Webs is loading ...</DIV>' +
            '<DIV id=ModeTitleArea style="text-align:center;"><H3 align=center class=marginBottomZero>Full Ancestor Tree</H3></DIV>' +
            '<DIV id=SummaryMessageArea style="text-align:center;"></DIV>';

        var settingsHTML = "";
        
        settingsHTML += WebsView.websSettingsOptionsObject.createdSettingsDIV; // +

        
        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        container.innerHTML = btnBarHTML + settingsHTML;


        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        function settingsChanged(e) {
            if (WebsView.websSettingsOptionsObject.hasSettingsChanged(WebsView.currentSettings)) {
                console.log("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                console.log("NEW settings are:", WebsView.currentSettings);
                WebsView.myAncestorTree.draw();
            } else {
                console.log("NOTHING happened according to SETTINGS OBJ");
            }
        }


    WebsView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };

    WebsView.toggleSettings = function () {
        console.log("TIME to TOGGLE the SETTINGS NOW !!!", WebsView.websSettingsOptionsObject);
        console.log(WebsView.websSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("settingsDIV");
        console.log("SETTINGS ARE:", theDIV.style.display);
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    };


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
        // Setup controllers for the ancestor tree which will be displayed as the Ancestor Webs
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
            CREATE the Ancestor Webs Backdrop 
            * Made of Lines connecting two ancestors together
            
        */

        for (let index = 0; index < 2 ** WebsView.maxNumGens; index++) {
            // Create  Empty Lines, hidden, to be used later
            // One to the person's Pa (Father) and the other to their Ma (Mother)
            svg.append("line").attr({
                id: "lineForPerson" + index + "Pa",
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: black; stroke-width: 1;",
            });
            svg.append("line").attr({
                id: "lineForPerson" + index + "Ma",
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: black; stroke-width: 1;",
            });
        }

        self.load(startId);

        WebsView.websSettingsOptionsObject.buildPage();
        WebsView.websSettingsOptionsObject.setActiveTab("names");
        WebsView.currentSettings = WebsView.websSettingsOptionsObject.getDefaultOptions();
    };;

    function findMatchingNodeByAhnNum(ahnNum, theNodes) {
        for (let index = 0; index < theNodes.length; index++) {
            const element = theNodes[index];
            if (element.ahnNum == ahnNum) {
                return element;
            }
        }
        // console.log("WARNING - NO NODE FOUND !!!");
        return null;
    }

    WebsView.drawLines = function (theNodes) {
        // console.log("DRAWING LINES stuff should go here");
        let numSpotsMaxGen = 2 ** (WebsView.numGens2Display - 1);
        for (let thisGenNum = 0; thisGenNum < WebsView.numGens2Display - 1; thisGenNum++) {
            let numSpotsThisGen = 2 ** thisGenNum;
            let numSpotsNextGen = 2 * numSpotsThisGen;
            let nextGenNum = thisGenNum + 1;

            for (let thisPosNum = 0; thisPosNum < numSpotsThisGen; thisPosNum++) {
                let index = 2 ** thisGenNum + thisPosNum; // a.k.a. the Ahnentafel # for this PERP
                let theNode = findMatchingNodeByAhnNum(index, theNodes);
                let theNodePa = null;
                let theNodeMa = null;
                let useNodePa = true;
                let useNodeMa = true;
                let genNumForDisplay = thisGenNum;
                let genNumForDisplayMa = nextGenNum;
                let genNumForDisplayPa = nextGenNum;

                if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Repeats") {
                    if (theNode && theNode["useThis"] == true) {
                        let tempNodePa = findMatchingNodeByAhnNum(2 * index, theNodes);
                        if (tempNodePa && tempNodePa["useThis"] == true) {
                            // great we keep Pa
                        } else {
                            useNodePa = false;
                        }
                        let tempNodeMa = findMatchingNodeByAhnNum(2 * index + 1, theNodes);
                        if (tempNodeMa && tempNodeMa["useThis"] == true) {
                            // great we keep Ma
                        } else {
                            useNodeMa = false;
                        }
                        if (theNode["newY"] && theNode["newY"] > 0) {
                            // console.log("Found newY : ", theNode["newY"]);

                            if (WebsView.viewMode == "Indi") {
                                genNumForDisplay = theNode["newY"];
                            } else {
                                genNumForDisplay = 1 + 2 * theNode["newY"] - WebsView.repeatsStartAtGenNum;
                            }

                            genNumForDisplayPa = genNumForDisplay + 1;
                            genNumForDisplayMa = genNumForDisplay + 1;
                        }
                    } else if (theNode) {
                        console.log("Testing ", theNode["useThis"]);
                        useNodePa = false;
                        useNodeMa = false;
                    } else {
                        // console.log("Fail Testing ", theNode);
                        useNodePa = false;
                        useNodeMa = false;
                    }
                } else if (WebsView.viewMode == "Unique") {
                    if (theNode && theNode["newY"] > 0) {
                        genNumForDisplay = 1 + 2 * theNode["newY"] - WebsView.repeatsStartAtGenNum;
                    }
                }

                const elementPa = document.getElementById("lineForPerson" + index + "Pa");
                if (elementPa) {
                    if (
                        useNodePa &&
                        WebsView.myAhnentafel.list[2 * index] &&
                        thePeopleList[WebsView.myAhnentafel.list[2 * index]]
                    ) {
                        elementPa.setAttribute("display", "block");
                        theNodePa = findMatchingNodeByAhnNum(2 * index, theNodes);
                        if (theNodePa["newY"] && theNodePa["newY"] > 0) {
                            // console.log("Found newY : ", theNodePa["newY"]);
                            if (WebsView.viewMode == "Indi") {
                                genNumForDisplayPa = theNodePa["newY"];
                            } else {
                                genNumForDisplayPa = 1 + 2 * theNodePa["newY"] - WebsView.repeatsStartAtGenNum;
                            }
                        }
                    } else {
                        elementPa.setAttribute("display", "none");
                    }
                }

                const elementMa = document.getElementById("lineForPerson" + index + "Ma");
                if (elementMa) {
                    if (
                        useNodeMa &&
                        WebsView.myAhnentafel.list[2 * index + 1] &&
                        thePeopleList[WebsView.myAhnentafel.list[2 * index + 1]]
                    ) {
                        elementMa.setAttribute("display", "block");
                        theNodeMa = findMatchingNodeByAhnNum(2 * index + 1, theNodes);
                        if (theNodeMa["newY"] && theNodeMa["newY"] > 0) {
                            // console.log("Found newY : ", theNodeMa["newY"]);
                            if (WebsView.viewMode == "Indi") {
                                genNumForDisplayMa = theNodeMa["newY"];
                            } else {
                                genNumForDisplayMa = 1 + 2 * theNodeMa["newY"] - WebsView.repeatsStartAtGenNum;
                            }
                        }
                    } else {
                        elementMa.setAttribute("display", "none");
                    }
                }

                let X = 0 - numSpotsThisGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsThisGen;
                X = 0 - numSpotsMaxGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;
                let dX = (((numSpotsThisGen - 1) / numSpotsThisGen) * vertSpacing * numSpotsMaxGen) / 2;
                X = 0 - dX + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;

                if (theNode) {
                    X = theNode.newX;
                }

                let Y = WebsView.yDir * vertSpacing * genNumForDisplay;

                let dX2 = (((numSpotsNextGen - 1) / numSpotsNextGen) * vertSpacing * numSpotsMaxGen) / 2;
                let dX4 = vertSpacing * 2 ** (WebsView.numGens2Display - 2 - thisGenNum);
                let dX3 = 2 * dX4; //((numSpotsNextGen - 1) / numSpotsNextGen ) * vertSpacing * numSpotsMaxGen / 2;

                let Xpa =
                    0 - numSpotsNextGen * 20 + ((thisPosNum * 2) / numSpotsNextGen) * vertSpacing * numSpotsNextGen;
                Xpa = 0 - dX2 + thisPosNum * dX3;
                if (theNodePa) {
                    Xpa = theNodePa.newX;
                }
                let Ypa = WebsView.yDir * vertSpacing * genNumForDisplayPa;

                let Xma =
                    0 - numSpotsNextGen * 20 + ((thisPosNum * 2 + 1) / numSpotsNextGen) * vertSpacing * numSpotsNextGen;
                Xma = Xpa + dX4; //0 - dX +  ((thisPosNum * 2 + 1) / numSpotsNextGen ) * vertSpacing * numSpotsNextGen;
                if (theNodeMa) {
                    Xma = theNodeMa.newX;
                }
                let Yma = WebsView.yDir * vertSpacing * genNumForDisplayMa;

                elementPa.setAttribute("x1", X);
                elementPa.setAttribute("y1", Y);
                elementPa.setAttribute("x2", Xpa);
                elementPa.setAttribute("y2", Ypa);

                elementMa.setAttribute("x1", X);
                elementMa.setAttribute("y1", Y);
                elementMa.setAttribute("x2", Xma);
                elementMa.setAttribute("y2", Yma);
            }
        }
        for (let index = 2 ** (WebsView.numGens2Display - 1); index < 2 ** (WebsView.maxNumGens - 1); index++) {
            const elementPa = document.getElementById("lineForPerson" + index + "Pa");
            if (elementPa) {
                elementPa.setAttribute("display", "none");
            }
            const elementMa = document.getElementById("lineForPerson" + index + "Ma");
            if (elementMa) {
                elementMa.setAttribute("display", "none");
            }
        }
    };

    WebsView.comingSoon = function (num) {
        if (num == 1) {
            showTemporaryMessageBelowButtonBar("WHEN this feature is implemented,<BR>it will allow you to ADD additional starting WikiTree IDs<BR>with which to find and compare common ancestors.");
        } else if (num == 2) {
            showTemporaryMessageBelowButtonBar("WHEN this feature is implemented,<BR>it will show a Web of all the Ancestors<BR>that are COMMON to the people entered.");
        } else if (num == 3) {
            showTemporaryMessageBelowButtonBar("WHEN this feature is implemented,<BR>it will show the Multi-Path web from a specific Ancestor to each of the people descendant.");
        }
    }
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
        if (WebsView.numGens2Display < 1) {
            WebsView.numGens2Display = 1;
            showTemporaryMessageBelowButtonBar("1 is the minimum number of generations you can display.");
        } else if (WebsView.numGens2Display > WebsView.workingMaxNumGens) {
            WebsView.numGens2Display = WebsView.workingMaxNumGens;
            if (WebsView.workingMaxNumGens < WebsView.maxNumGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
                );
            } else {
                showTemporaryMessageBelowButtonBar(
                    WebsView.maxNumGens + " is the maximum number of generations you can display."
                );
            }
        }

        var numGensSpan = document.querySelector("#numGensInBBar");
        numGensSpan.textContent = WebsView.numGens2Display;
        // console.log("numGensSpan:", numGensSpan);
        if (WebsView.numGens2Display > WebsView.numGensRetrieved) {
            loadAncestorsAtLevel(WebsView.numGens2Display);
            WebsView.numGensRetrieved = WebsView.numGens2Display;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        console.log("Need to load MORE peeps from Generation ", newLevel);
        let theListOfIDs = WebsView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        // console.log(theListOfIDs);
        if (theListOfIDs.length == 0) {
            // console.log("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            WebsView.numGensRetrieved++;
            WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);
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
                    WebsView.theAncestors = result;
                    console.log("theAncestors:", WebsView.theAncestors);
                    // console.log("person with which to drawTree:", person);
                    for (let index = 0; index < WebsView.theAncestors.length; index++) {
                        thePeopleList.add(WebsView.theAncestors[index].person);
                    }
                    WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);

                    clearMessageBelowButtonBar();
                }
            });
        }
    }

    /** FUNCTION used to force a redraw of the Ancestor Webs, used when called from Button Bar after a parameter has been changed */

    WebsView.redraw = function () {
        // console.log("WebsView.redraw");
        // console.log("Now theAncestors = ", WebsView.theAncestors);
        // thePeopleList.listAll();
        // if (WebsView.viewMode == 0) {
        //     WebsView.viewMode = "Full";
        // } else if (WebsView.viewMode == 1) {
        //     WebsView.viewMode = "Unique";
        // } else if (WebsView.viewMode == 2) {
        //     WebsView.viewMode = "Indi";
        //     WebsView.repeatAncestorNum = 1;
        // }
        if (WebsView.repeatAncestorNum < 1) {
            WebsView.repeatAncestorNum = WebsView.listOfRepeatAncestors.length;
        } else if (WebsView.repeatAncestorNum > WebsView.listOfRepeatAncestors.length) {
            WebsView.repeatAncestorNum = 1;
        }
        if (WebsView.listOfRepeatAncestors.length == 0) {
            WebsView.repeatAncestorNum = 0;
        }

        if (WebsView.viewMode == "Full") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Full Ancestor Pedigree Tree</H3>";
        } else if (WebsView.viewMode == "Unique") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Unique Ancestors Web</H3>" +
                "Each ancestor appears exactly once, connected by multiple lines, if necessary.";
        } else if (WebsView.viewMode == "Repeats") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Repeat Ancestors Web</H3>" +
                "Only ancestors who appear more than once will be shown, connected by multiple lines to the web.";
        } else if (WebsView.viewMode == "Indi") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero'>Ancestor Multi-Path Web to <div style='display:inline-block' id=IndiRepeaterName>No One</div></H3>" +
                "<A onclick='WebsView.repeatAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                " [ <span id=IndiRepeaterNum>1 of 6</span> ] " +
                "<A onclick='WebsView.repeatAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
        }
        recalcAndDisplayNumGens();
        // redoWedgesForFanChart();
        WebsView.myAncestorTree.draw();
    };

    /**
     * Load and display a person
     */
    WebsView.prototype.load = function (id) {
        // console.log("WebsView.prototype.load");
        var self = this;
        self._load(id).then(function (person) {
            WebsView.primePerson = person;
            // console.log("WebsView.prototype.load : self._load(id) ");
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
                WebsView.theAncestors = result;
                console.log("theAncestors:", WebsView.theAncestors);
                console.log("person with which to drawTree:", person);
                for (let index = 0; index < WebsView.theAncestors.length; index++) {
                    const element = WebsView.theAncestors[index];
                    thePeopleList.add(WebsView.theAncestors[index]);
                }
                WebsView.myAhnentafel.update(person);
                self.drawTree(person);
                clearMessageBelowButtonBar();
            });
        });
    };

    /**
     * Load more ancestors. Update existing data in place
     */
    WebsView.prototype.loadMore = function (oldPerson) {
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
    WebsView.prototype._load = function (id) {
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
    WebsView.prototype.drawTree = function (data) {
        console.log("WebsView.prototype.drawTree");

        if (data) {
            // console.log("(WebsView.prototype.drawTree WITH data !)");
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
            var nodes = WebsView.myAhnentafel.listOfAncestorsForFanChart(WebsView.numGens2Display); // [];//this.tree.nodes(this.root);

            console.log("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);
            console.log(" NODES = ", nodes);

            WebsView.listOfRepeatAncestors = WebsView.myAhnentafel.listOfRepeatAncestors(WebsView.numGens2Display);
            console.log("REPEAT ANCESTORS:", WebsView.listOfRepeatAncestors);

            if (WebsView.viewMode == "Indi") {
                // SET UP the special sub-heading for Individual Ancestor web
                document.getElementById("IndiRepeaterName").textContent =
                    thePeopleList[WebsView.listOfRepeatAncestors[WebsView.repeatAncestorNum - 1].id].getDisplayName();
                document.getElementById("IndiRepeaterNum").textContent =
                    WebsView.repeatAncestorNum + " of " + WebsView.listOfRepeatAncestors.length;
            }
            if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Repeats") {
                // Go through all the NODES and pick out ONLY those peeps who are in between the lines of this Individual Repeat Ancestor and the Central Perp

                // First we set a flag to false for all nodes, then we'll turn it on for the ones we want later
                for (let index = 0; index < nodes.length; index++) {
                    const element = nodes[index];
                    element["useThis"] = false;
                }

                let startingRepeaterIndex = 0;
                let endingRepeaterIndex = WebsView.listOfRepeatAncestors.length - 1;

                if (WebsView.viewMode == "Indi") {
                    startingRepeaterIndex = WebsView.repeatAncestorNum - 1;
                    endingRepeaterIndex = WebsView.repeatAncestorNum - 1;
                }

                for (let repeaterIndex = startingRepeaterIndex; repeaterIndex <= endingRepeaterIndex; repeaterIndex++) {
                    for (let index = 0; index < WebsView.listOfRepeatAncestors[repeaterIndex].AhnNums.length; index++) {
                        const thisAhnNum = WebsView.listOfRepeatAncestors[repeaterIndex].AhnNums[index];
                        console.log("Need to find the peeps in between AhnNum 1 and AhnNum ", thisAhnNum);
                        setUseThisForNode(thisAhnNum, nodes);
                    }
                }

                let newNodes = [];
                for (let index = 0; index < nodes.length; index++) {
                    const element = nodes[index];
                    if (element["useThis"] == true) {
                        newNodes.push(element);
                    }
                }

                nodes = newNodes;
                console.log("AFter USE THIS loopage : ", nodes);
            }
            // Calculate the new NODE positions (skooch together / adjust if needed for repeat ancestors)
            calculateNodePositions(nodes);

            // Draw the lines connecting the new NODEs
            WebsView.drawLines(nodes);

            // Finally - draw the Nodes themselves!
            this.drawNodes(nodes);

            // Update the Summary Message based on how many repeat ancestors there are, etc..
            showSummaryMessage(
                "At " +
                    WebsView.numGens2Display +
                    " generations, " +
                    primaryPersonFirstName() +
                    " has " +
                    WebsView.listOfRepeatAncestors.length +
                    " repeat ancestors."
            );
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

                let thisFontSize = 14;
                if (ancestorObject.ahnNum == 1) { thisFontSize = 18; }

                return `
                <div  id=wedgeBoxFor${
                    ancestorObject.ahnNum
                } class="box" style="background-color: white ; border:1; padding: 0px;">
                <div id=nameDivFor${
                    ancestorObject.ahnNum
                } class="name" style="font-size: ${thisFontSize}px;" >${getNameAsPerSettings(person)}</div>
                </div>
                `;

                // if (WebsView.viewMode == "Indi") {
                // } else {
                //     if (ancestorObject.ahnNum == 1) {
                //         return `
                //         <div  id=wedgeBoxFor${
                //             ancestorObject.ahnNum
                //         } class="box" style="background-color: white ; border:1; padding: 0px;">
                //         <div id=nameDivFor${
                //             ancestorObject.ahnNum
                //         } class="name" style="font-size: 18px;" ><B>${getFirstName(person)}</B></div>
                //         </div>
                //         `;
                //     } else {
                //         return `
                //         <div  id=wedgeBoxFor${
                //             ancestorObject.ahnNum
                //         } class="box" style="background-color: white ; border:1; padding: 0px;">
                //         <div id=nameDivFor${
                //             ancestorObject.ahnNum
                //         } class="name" style="font-size: 14px;" ><B>${getFirstInitial(person)}${getLastInitial(
                //             person
                //         )}</B></div>
                //             </div>
                //             `;
                //     }
                // }
            });

        // Show info popup on click
        nodeEnter.on("click", function (ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            d3.event.stopPropagation();
            self.personPopup(person, d3.mouse(self.svg.node()));
        });

        WebsView.myAncestorTree = self;

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

            let thisNewX = ancestorObject.newX;
            // console.log("NEW x :", thisNewX);

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            // Calculate which position # (starting lower left and going clockwise around the Ancestor Webs) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;
            let numSpotsMaxGen = 2 ** (WebsView.numGens2Display - 1);

            let theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
            if (theInfoBox) {
                let theBounds = theInfoBox; //.getBBox();
                // console.log("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                // theInfoBox.style.width = "300px";
                // theInfoBox.style.x = "-190px";

                // CENTER the DIV and SET its width to 300px
                theInfoBox.parentNode.parentNode.setAttribute("y", -16);

                theInfoBox.parentNode.parentNode.setAttribute("x", -14);
                theInfoBox.parentNode.parentNode.setAttribute("width", 28);

                if (ancestorObject.ahnNum == 1) {
                    let ltrsNeeded = getFirstName(ancestorObject.person).length;
                    if (WebsView.viewMode == "Indi") {
                        document.getElementById("nameDivFor" + ancestorObject.ahnNum).innerHTML = getFirstLNAB(
                            ancestorObject.person
                        );
                    } else {
                        document.getElementById("nameDivFor" + ancestorObject.ahnNum).innerHTML = getFirstName(
                            ancestorObject.person
                        );
                    }
                    theInfoBox.parentNode.parentNode.setAttribute("x", -12 * ltrsNeeded);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 24 * ltrsNeeded);
                } else {
                    // console.log(WebsView.myAhnentafel.listByPerson[ancestorObject.person._data.Id]);
                    let thisNameNow = getNameAsPerSettings(ancestorObject.person);
                    document.getElementById("nameDivFor" + ancestorObject.ahnNum).innerHTML = thisNameNow;
                    let ltrsNeeded = thisNameNow.length;
                    theInfoBox.parentNode.parentNode.setAttribute("x", -8 * ltrsNeeded);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 16 * ltrsNeeded);
                     
                    if (WebsView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                        // document.getElementById("nameDivFor" + ancestorObject.ahnNum).innerHTML = getNameAsPerSettings(ancestorObject.person)/*  + " " + getLastInitial(ancestorObject.person) */;
                        let theClr = "Yellow";
                        theInfoBox.parentNode.parentNode.setAttribute("x", -9 * ltrsNeeded);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 18 * ltrsNeeded);

                        if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                            theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        } else {
                            numRepeatAncestors++;
                            theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                            repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                        }

                        theInfoBox.setAttribute("style", "background-color: " + theClr + ";");
                    }
                }

                // SET the OUTER DIV to also be white, with a rounded radius and solid border
                // theInfoBox.parentNode.setAttribute("style", "background-color: white; padding:15px; border: solid green; border-radius: 15px;") ;
            }

            // let X = 0 - numSpotsThisGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsThisGen;
            // let dX = (((numSpotsThisGen - 1) / numSpotsThisGen) * vertSpacing * numSpotsMaxGen) / 2;
            // X = 0 - dX + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;

            let X = thisNewX;
            if (ancestorObject.newY && ancestorObject.newY > 0) {
                if (WebsView.viewMode == "Indi") {
                    thisGenNum = ancestorObject.newY;
                } else {
                    thisGenNum = 1 + 2 * ancestorObject.newY - WebsView.repeatsStartAtGenNum;
                }
            }

            let Y = WebsView.yDir * vertSpacing * thisGenNum;

            let i = ancestorObject.ahnNum;

            // console.log(
            //     "Transforming:",
            //     i,
            //     thisGenNum,
            //     thisPosNum,
            //     numSpotsThisGen,
            //     numSpotsMaxGen,
            //     "(",
            //     X,
            //     Y,
            //     ")",
            //     dX
            // );

            let newX = X;
            let newY = Y;
            // console.log("Place",d._data.Name,"ahnNum:" + ancestorObject.ahnNum,"Gen:"+thisGenNum,"Pos:" + thisPosNum, WebsView.maxAngle);

            // FINALLY ... we return the transformation statement back - the translation based on our  calculations
            return "translate(" + newX + "," + newY + ")";

            // and if needed a rotation based on the nameAngle
            // return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
    };

    function findPercentileForAhnNum(anAhnNum, orderedNodes) {
        for (let index = 0; index < orderedNodes.length; index++) {
            const element = orderedNodes[index];
            if (element[1] == anAhnNum) {
                return element[0];
            }
        }
        return 0;
    }

    function assignPercentileForAhnNum(anAhnNum, orderedNodes, newPercentile, lastGenNum) {
        for (let index = 0; index < orderedNodes.length; index++) {
            const element = orderedNodes[index];
            if (element[1] == anAhnNum) {
                element[0] = newPercentile;
                element[5] = lastGenNum;
                return;
            }
        }
    }

    function setUseThisForNode(thisAhnNum, nodes) {
        for (let index = Math.min(thisAhnNum, nodes.length - 1); index >= 0; index--) {
            const element = nodes[index];
            if (element && element.ahnNum) {
                if (element.ahnNum == thisAhnNum) {
                    element["useThis"] = true;
                    if (thisAhnNum > 1) {
                        let newAhnNum = Math.floor(thisAhnNum / 2);
                        setUseThisForNode(newAhnNum, nodes);
                    }
                    return;
                }
            } else {
                console.log("Could not compute thisAhnNum:", thisAhnNum, "index:", index, "element:", element);
            }
        }
    }

    function calculateNodePositions(nodes) {
        console.log("BIG CALCULATIONS SHOULD GO HERE to do NODE POSITIONING PROPER");
        let orderedNodes = [];
        let minWidthApart = 20;
        let maxAhnNum = 2 ** WebsView.numGens2Display - 1;
        let usedPercentiles = []; // to keep track of percentiles that have been used already so we don't duplicate and send two people to the same location!

        for (let index = 0; index < nodes.length; index++) {
            const element = nodes[index];
            let thisAhnNum = element.ahnNum;
            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = 1 + Math.floor(Math.log2(thisAhnNum));
            // Calculate which position # (starting lower left and going clockwise around the Ancestor Webs) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = thisAhnNum - 2 ** (thisGenNum - 1);

            let thisPercentile = (1 + 2 * thisPosNum) / 2 ** thisGenNum;
            usedPercentiles.push(thisPercentile);

            console.log(
                thisAhnNum,
                thisGenNum,
                thisPosNum,
                ":",
                1 + 2 * thisPosNum,
                "/",
                2 ** thisGenNum,
                "=",
                thisPercentile
            );
            orderedNodes.push([thisPercentile, thisAhnNum, thisGenNum, thisPosNum, element, 0]);
        }

        console.log(WebsView.listOfRepeatAncestors);

        if (WebsView.viewMode == "Unique" || WebsView.viewMode == "Indi" || WebsView.viewMode == "Repeats") {
            let minGenNum = 999;
            for (let index = 0; index < WebsView.listOfRepeatAncestors.length; index++) {
                const element = WebsView.listOfRepeatAncestors[index];
                let sumOfX = 0;
                let sumOfY = 0;
                let numOfX = 0;
                //let lastAhnNum = 0;
                for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
                    const anAhnNum = element.AhnNums[innerIndex];
                    if (anAhnNum <= maxAhnNum) {
                        sumOfX += findPercentileForAhnNum(anAhnNum, orderedNodes);
                        let thisOnesGenNum = Math.floor(Math.log2(anAhnNum));
                        sumOfY += thisOnesGenNum;
                        minGenNum = Math.min(minGenNum, thisOnesGenNum);
                        numOfX++;
                        //lastAhnNum = anAhnNum;
                    }
                }
                let newPercentile = sumOfX / numOfX;
                let avgGenNum = sumOfY / numOfX;

                while (usedPercentiles.indexOf(newPercentile) > -1) {
                    newPercentile += 0.00001;
                }
                usedPercentiles.push(newPercentile);

                console.log("Final Percentile:", newPercentile, thePeopleList[element.id].getDisplayName(), avgGenNum);

                for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
                    const anAhnNum = element.AhnNums[innerIndex];
                    assignPercentileForAhnNum(anAhnNum, orderedNodes, newPercentile, avgGenNum);
                }
            }
            WebsView.repeatsStartAtGenNum = minGenNum;
        }
        let newOrder = orderedNodes.sort();
        console.log(newOrder);
        let maxWidth = (newOrder.length - 1) * minWidthApart;
        if (WebsView.viewMode == "Indi") {
            maxWidth *= 3;
        }

        let lastX = 0;
        let lastPercentile = -1;

        for (let index = 0; index < newOrder.length; index++) {
            const newElement = newOrder[index];
            let thisPercentile = newElement[0];
            // let newX = maxWidth * ( thisPercentile - 0.5);
            let newX = maxWidth * (index / (newOrder.length - 1) - 0.5);

            // force the original dog, the CENTRAL PERSON to be in the MIDDLE horizontally, despite how lopsided the rest of the tree is.
            if (newElement[1] == 1) {
                newX = 0;
            } else if (thisPercentile == lastPercentile) {
                newX = lastX;
            }
            lastPercentile = thisPercentile;
            lastX = newX;

            newElement[4]["newX"] = newX;
            newElement[4]["newY"] = newElement[5];
        }

        if (WebsView.viewMode == "Indi" && WebsView.currentSettings["path_options_multiPathFormat"] == "smooth") {
            let numsPerGen = [];
            let XsPerGen = [];
            let AhnsPerGen = [];
            let IndexPerGen = [];
            let maxNumsPerGen = 0;

            let theAncestorAtTop = WebsView.listOfRepeatAncestors[WebsView.repeatAncestorNum - 1];
            console.log("Ancestor AT TOP: ", getNameAsPerSettings(thePeopleList[theAncestorAtTop.id]));
            maxWidth = 24 * getNameAsPerSettings(thePeopleList[theAncestorAtTop.id]).length;
            for (let index = 0; index < newOrder.length; index++) {
                const newElement = newOrder[index];
                const thisEsGen = newElement[2];
                if (!numsPerGen[thisEsGen]) {
                    numsPerGen[thisEsGen] = 0;
                    XsPerGen[thisEsGen] = [];
                    AhnsPerGen[thisEsGen] = [];
                    IndexPerGen[thisEsGen] = [];
                }
                numsPerGen[thisEsGen] += 1;
                XsPerGen[thisEsGen].push(newElement[4]["newX"]);
                AhnsPerGen[thisEsGen].push(newElement[1]);
                IndexPerGen[thisEsGen].push(index);
                maxNumsPerGen = Math.max(maxNumsPerGen, numsPerGen[thisEsGen]);
            }
            console.log("Number per Generations is :", numsPerGen);
            console.log("Number of Xs per Generations is :", XsPerGen);
            console.log("Number of Ahns per Generations is :", AhnsPerGen);
            if (maxNumsPerGen > 2) {
                maxWidth = (maxWidth * maxNumsPerGen) / 2;
            }

            for (const key in numsPerGen) {
                if (Object.hasOwnProperty.call(numsPerGen, key)) {
                    const element = numsPerGen[key];
                    console.log(
                        "Number me this: PLACE ",
                        key,
                        "nums:",
                        element,
                        "Xs:",
                        XsPerGen[key],
                        "Ahns:",
                        AhnsPerGen[key],
                        "Index:",
                        IndexPerGen[key]
                    );

                    if (element == 1) {
                        newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                    } else if (element == 2) {
                        if (newOrder[IndexPerGen[key][0]][4]["newX"] == newOrder[IndexPerGen[key][1]][4]["newX"]) {
                            // IF both x coordinates are at the same location, then this is a repeat of the same person, so put them in the middle
                            newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                            newOrder[IndexPerGen[key][1]][4]["newX"] = 0;
                        } else {
                            // ELSE .. put them left and right, based on Ahnentafel # to line them up properly
                            if (AhnsPerGen[key][0] < AhnsPerGen[key][1]) {
                                newOrder[IndexPerGen[key][0]][4]["newX"] = 0 - maxWidth / 2;
                                newOrder[IndexPerGen[key][1]][4]["newX"] = 0 + maxWidth / 2;
                            } else {
                                newOrder[IndexPerGen[key][0]][4]["newX"] = 0 + maxWidth / 2;
                                newOrder[IndexPerGen[key][1]][4]["newX"] = 0 - maxWidth / 2;
                            }

                            // FINALLY .. double check to see if one of them is actually a duplicate of the "TOP DOG" single ancestor whose path we're leading to

                            if (theAncestorAtTop.AhnNums.indexOf(AhnsPerGen[key][0]) > -1) {
                                newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                            }
                            if (theAncestorAtTop.AhnNums.indexOf(AhnsPerGen[key][1]) > -1) {
                                newOrder[IndexPerGen[key][1]][4]["newX"] = 0;
                            }
                        }
                    } else if (element > 2) {
                        // OKAY - first thing we have to do is to figure out how many discrete newX values we have, (numDvalues)
                        let discreteXs = [];
                        let indexOfDiscretes = []

                        for (let miniIndex = 0; miniIndex < IndexPerGen[key].length; miniIndex++) {
                            const thisSubElement = IndexPerGen[key][miniIndex];
                            let whereThisFound = discreteXs.indexOf( newOrder[thisSubElement][4]["newX"] ) ;
                            if (whereThisFound == -1 ) {
                                discreteXs.push(newOrder[thisSubElement][4]["newX"] );
                                indexOfDiscretes.push( [miniIndex]);
                            } else {
                                indexOfDiscretes[whereThisFound].push(miniIndex);
                            }
                        }
                        console.log("There are ",discreteXs.length," discrete X-values out of ", element, " entries");

                        // THEN we need to sort them left to right by Ahnentafel # .... or .. at least we SHOULD do that...
                        // --> insert code here to do that to make sure ..... but ... going to skip this step for now and see what happens ... how bad could it be ???

                        // AND FINALLY ... then assign newX = maxWidth * (pos# - (1 +numDvalues)/2 ) * (2/ numDvalues) ; where pos# = 1 .. numDvalues
                        for (let iDiscrete = 0; iDiscrete < discreteXs.length; iDiscrete++) {
                            const thisDiscreteX = discreteXs[iDiscrete];
                            const thisNewX = maxWidth * (1 + iDiscrete  - (1 + discreteXs.length)/2 ) * (2/  discreteXs.length);
                            for (let jDiscrete = 0; jDiscrete < indexOfDiscretes[iDiscrete].length; jDiscrete++) {
                                const anOriginalIndexNum = indexOfDiscretes[iDiscrete][jDiscrete];
                             
                                newOrder[anOriginalIndexNum][4]["newX"] = thisNewX;    
                            }
                            
                        }
                        /**
                         * 0 - 2/2 ; 1 - 2/2 = -1/2 , 0/2
                         * 0 - 3/2 ; 1 - 3/2 ; 2 - 3/2 = -3/2 , -1/2 , +1/2
                         * 0 - 4/2 ; 1 - 4/2 ; 2 - 4/2 ; 3 - 4/2 , -2 , -1, 0, 1 ; -2/4 ...1/4
                         *
                         * 0 , 1 == 0 - 1/2 // 1 - 1/2
                         * 0 , 1, 2 == -2/3 , 0, +2/3
                         * 0 , 1 , 2 , 3 == -3/4 , -1/4 , +1/4 , +3/4
                         *
                         * 1 ,2 == 1  - 1.5 // 2  - 1.5  ALL * 2/2
                         * 1 ,2 , 3 == 1 - 2 // 2 - 2 // 3 - 2  ALL * 2/3
                         * 1 , 2 , 3 , 4 == 1 - 2.5 // 2 - 2.5 // 3 - 2.5 // 4 - 2.5  ALL * 2/4
                         */


                        // THEN ... when all THAT is said and done, we still have to cycle through them all, and check for an instance of the AncestorAtTheTop !
                        for (let index = 0; index < IndexPerGen[key].length; index++) {
                            const thisSubElement = IndexPerGen[key][index];
                            if (theAncestorAtTop.AhnNums.indexOf(AhnsPerGen[key][index]) > -1) {
                                newOrder[thisSubElement][4]["newX"] = 0;
                            }
                        }
                        

                    }
                }
            }
        } 
        
        console.log(nodes);
    }

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
						    <span class="tree-links"><a onClick="newTree('${person.getName()}');" href="#"><img style="width:30px; height:24px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></a></span>
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

        // RESET the initial parameters

        WebsView.primePerson = null;
        WebsView.nextPrivateId = -1;
        WebsView.repeatsStartAtGenNum = 99;

        if (WebsView.viewMode == "Repeats" || WebsView.viewMode == "Indi") {
            WebsView.viewMode = "Full";
        }

        WebsView.currentPersonNum = 0;
        WebsView.repeatAncestorNum = -1;

        WebsView.numGens2Display = 3;
        WebsView.lastNumGens = 3;
        WebsView.numGensRetrieved = 3;
        WebsView.workingMaxNumGens = 4;

        WebsView.myAhnentafel = new AhnenTafel.Ahnentafel();
        WebsView.listOfRepeatAncestors = [];

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

    function showSummaryMessage(msg) {
        document.getElementById("SummaryMessageArea").innerHTML = msg;
    }
    function clearSummaryMessage() {
        document.getElementById("SummaryMessageArea").innerHTML = "";
    }

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
     * Get the first initial of the first name only
     */
    function getFirstInitial(person) {
        return `${person._data.FirstName.substring(0, 1)}`;
    }    
    /**
    /**
     * Get the first initial of the Last Name at Birth
     */
    function getLastInitial(person) {
        return `${person._data.LastNameAtBirth.substring(0, 1)}`;
    }

    /**
     * Get ALL the initials from every name
     */
    function getAllInitials(person) {
        let allInits = "";
        if (person._data.FirstName) {
            allInits += getInitials(person._data.FirstName);
        }
        if (person._data.MiddleName) {
            allInits += getInitials(person._data.MiddleName);
        }
        if (person._data.LastNameAtBirth) {
            allInits += getInitials(person._data.LastNameAtBirth);
        }
        return allInits;
    }

    function getInitials(someName) {
        let namePieces = someName.split(" ");
        let inits = "";
        for (let index = 0; index < namePieces.length; index++) {
            inits += namePieces[index][0];
        }
        return inits;
    }
    /**
     * Get the full first name only
     */
    function getFirstName(person) {
        return `${person._data.FirstName}`;
    }
    /**
     * Get the full first name + LNAB
     */
    function getFirstLNAB(person) {
        return `${person._data.FirstName} ${person._data.LastNameAtBirth}`;
    }
    

    
    /**
     * Get the appropriate Name or set of Initials, based on the TYPE of viewMode AND the current Settings
     */
    function getNameAsPerSettings(person) {
        let thisNameSetting = "";
        let thisName = "";
        if (WebsView.viewMode == "Full" || WebsView.viewMode == "Unique" || WebsView.viewMode == "Repeats" || WebsView.viewMode == "Common" ) {
            thisNameSetting = WebsView.currentSettings["name_options_multiNameFormat"];
        } else  {
            thisNameSetting = WebsView.currentSettings["name_options_indiNameFormat"];
        }

        if (thisNameSetting == "F" || thisNameSetting == "FL" || thisNameSetting == "FML") {
            thisName = getFirstInitial(person);
        }
        if (  thisNameSetting == "FL"  ) {
            thisName += getLastInitial(person);
        }
        
        if (  thisNameSetting == "FML"  ) {
            thisName = getAllInitials(person);
        }
        if (thisNameSetting == "FLname") {
            thisName = getShortName(person);
        }
        if (thisNameSetting == "FnameLname") {
            thisName = getFirstLNAB(person);
        }
    
        return thisName;
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

    // Shortcut function to quickly retrieve the primary person's first name
    function primaryPersonFirstName() {
        return thePeopleList[WebsView.myAhnentafel.list[1]]._data.FirstName;
    }
})();
