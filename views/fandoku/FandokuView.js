/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * FanDoku game uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.

* There is a Button Bar TABLE at the top of the container,
 * then the SVG graphic is below that.
 *
 * The FIRST chunk of code in the SVG graphic are the <path> objects for the individual wedges of the FanDoku game,
 * each with a unique ID of wedgeAnB, where A = generation #, and B = position # within that generation, counting from far left, clockwise
 *
 * The SECOND chunk in the SVG graphic are the individual people in the FanDoku game, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class"person ancestor" transformed object with a translation from 0,0 and a rotation></g>
 *
 * The Button Bar does not resize, but has clickable elements, which set global variables in the FandokuView, then calls a redraw
 */
(function () {
    const APP_ID = "Fandoku";
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;

    /**
     * Constructor
     */
    var FandokuView = (window.FandokuView = function () {
        Object.assign(this, this?.meta());
    });

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

    var fandokuDing = new Audio(
        "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/ding-idea-40142.mp3"
    );
    if (!fandokuDing.canPlayType("audio/mpeg")) {
        fandokuDing.setAttribute(
            "src",
            "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/ding-idea-40142.ogg"
        );
    }
    fandokuDing.loop = false;

    var fandokuClap = new Audio(
        "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/small-applause-6695.mp3"
    );
    if (!fandokuClap.canPlayType("audio/mpeg")) {
        fandokuClap.setAttribute(
            "src",
            "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/small-applause-6695.ogg"
        );
    }
    fandokuClap.loop = false;

    var fandokuCheer = new Audio(
        "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/crowdyayapplause25ppllong-6948.mp3"
    );
    if (!fandokuCheer.canPlayType("audio/mpeg")) {
        fandokuCheer.setAttribute(
            "src",
            "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/crowdyayapplause25ppllong-6948.ogg"
        );
    }
    fandokuCheer.loop = false;

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the FanDoku game

    /** Static variable to hold unique ids for private persons **/
    FandokuView.nextPrivateId = -1;

    /** Static variable to hold the Maximum Angle for the FanDoku game (360 full circle / 240 partial / 180 semicircle)   **/
    FandokuView.maxAngle = 180;
    FandokuView.lastAngle = 180;

    /** Keep track of WHICH name has been selected (number == ahnenTafel number for highlighted ancestor) */
    FandokuView.selectedNameNum = -1;

    /** Keep track of WHICH cell has been selected (number == ahnenTafel number for cell in Fan Chart) */
    FandokuView.selectedFanCell = -1;
    FandokuView.selectedFanColour = "";

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    FandokuView.numGens2Display = 4;
    FandokuView.lastNumGens = 4;
    FandokuView.numGensRetrieved = 4;
    FandokuView.maxNumGens = 7;
    FandokuView.workingMaxNumGens = 5;

    FandokuView.numSecondsElapsed = 0;
    FandokuView.numAncestorsPlaced = 0;
    FandokuView.numMisses = 0;
    FandokuView.totalNumAncestors = 0;
    FandokuView.gameStatus = "Pre";

    /** Object to hold the Ahnentafel table for the current primary individual   */
    FandokuView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    FandokuView.currentSettings = {};

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    FandokuView.theAncestors = [];
    FandokuView.foundAncestors = [];
    FandokuView.newOrder = [];
    FandokuView.genMForder = [];
    FandokuView.ahnNumCellNumArray = [];

    FandokuView.prototype.meta = function () {
        return {
            title: "FanDoku game",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    FandokuView.encouragingArray = [
        "Correct",
        "Correctamundo",
        "Fantastic",
        "Good",
        "Good stuff",
        "Got it!",
        "Great",
        "Great work",
        "Nailed it",
        "Nice",
        "Nice work",
        "Right!",
        "Right on",
        "Super",
        "Super dooper!",
        "That's right",
        "Way to go",
        "Wonderful",
        "Yay",
        "Yep",
        "Yes",
        "You got it",
        "Yup",
    ];

    FandokuView.discouragingArray = [
        "Sorry",
        "Nope",
        "Not quite",
        "Try again",
        "Oops",
        "Wrong",
        "Not",
        "Nyet",
        "Nicht",
        "Nein",
        "Zut alors",
        "Yikes",
        "Hmmm",
        "Almost",
        "No",
        "No-no",
        "Oh oh",
        "Next?",
        "Eek",
        "Whoa",
        "Non",
        "Sorry",
        "Woops",
        "Next time",
        "Close",
        "Close-ish",
        "Another?",
        "Pardon?",
        "Disculpe?",
        "Lo siento",
    ];

    function checkTabPress(e) {
        "use strict";
        // pick passed event or global event object if passed one is empty
        e = e || event;
        // var activeElement;
        if (
            (e.keyCode == 88 ||
                e.keyCode == 90 ||
                e.keyCode == 68 ||
                e.keyCode == 65 ||
                e.keyCode == 83 ||
                e.keyCode == 87) &&
            FandokuView.gameStatus == "Live"
        ) {
            let dDirect = 1; // if key code == 88 (X) or 68 (D)
            if (e.keyCode == 90 || e.keyCode == 65) {
                dDirect = -1; // key code == 90 (Z) or 65 (A)
            } else if (e.keyCode == 87 || e.keyCode == 83) {
                // 87 == W ; 83 == S
                if (FandokuView.newOrder[FandokuView.selectedNameNum - 2] > FandokuView.newOrder.length / 2) {
                    // we are currently in the second half, so W (up) will take us BACK and S (down) will take us FORWARD
                    if (e.keyCode == 87) {
                        //W
                        dDirect = -1;
                    } else {
                        dDirect = 1; //S
                    }
                } else {
                    // we are currently in the first half, so W (up) will take us FORWARD and S (down) will take us BACK
                    if (e.keyCode == 83) {
                        // S
                        dDirect = -1;
                    } else {
                        dDirect = 1; // W
                    }
                }
            }

            console.log("A TAB KEY has  been pressed", FandokuView.newOrder);
            let lookingFor = FandokuView.newOrder[FandokuView.selectedNameNum - 2] + dDirect;
            if (lookingFor >= FandokuView.newOrder.length + 2 || FandokuView.selectedNameNum == -1) {
                lookingFor = 2;
            } else if (lookingFor < 2) {
                lookingFor = FandokuView.newOrder.length + 1;
            }
            console.log("lookingFor", lookingFor, "FandokuView.selectedNameNum:", FandokuView.selectedNameNum);

            for (let tryNum = 0; tryNum <= FandokuView.newOrder.length; tryNum++) {
                // put this loop within a loop, so if we don’t find a match that is displayed (‘block’)
                // we can continue on to find the next one available … until one is, and it can be highlighted.
                // unless there are none left to highlight

                for (let index = 0; index < FandokuView.newOrder.length; index++) {
                    if (FandokuView.newOrder[index] == lookingFor) {
                        // let nextIndex = (index + 1) % FandokuView.newOrder.length;
                        let nextNum = index + 2;
                        console.log(
                            "floatingName" + nextNum,
                            document.getElementById("floatingNameHolder" + nextNum).style.display
                        );
                        if (document.getElementById("floatingNameHolder" + nextNum).style.display == "block") {
                            toggleFloatingName("floatingName" + nextNum, nextNum);
                            return;
                        }
                    }
                }
                // OK - if we get here, that means the one we found previously must be already selected, and in the fan chart, so it’s display style is ‘none’
                // We therefore have to pick the next one in the list
                lookingFor += dDirect;
                if (lookingFor >= FandokuView.newOrder.length + 2) {
                    lookingFor = 2;
                } else if (lookingFor < 2) {
                    lookingFor = FandokuView.newOrder.length + 1;
                }
            }
        } else if (e.keyCode >= 73 && e.keyCode <= 76 && FandokuView.gameStatus == "Live") {
            console.log("You have clicked on I J K L and want to highlight a cell of the Fan Chart!  Go for it !");

            let dDirect = 1; // if key code == 76 (L) --> go RIGHT
            if (e.keyCode == 74) {
                dDirect = -1; // key code == 74 (J) --> go LEFT
            } else if (e.keyCode == 73) {
                dDirect = 2; // key code == 73 (I) --> go UP
            } else if (e.keyCode == 75) {
                dDirect = 1 / 2; // key code == 75 (K) --> go DOWN
            }

            if (FandokuView.selectedFanCell < 2) {
                FandokuView.selectedFanCell = 2;
            } else {
                let thisGenNum = Math.floor(Math.log2(FandokuView.selectedFanCell));
                let thisPosNum = FandokuView.selectedFanCell - 2 ** thisGenNum;
                let thisWedge = document.getElementById("wedge" + 2 ** thisGenNum + "n" + thisPosNum);
                if (thisWedge && FandokuView.selectedFanColour > "") {
                    thisWedge.style.fill = FandokuView.selectedFanColour;
                }
            }

            if (e.keyCode % 2 == 0) {
                // if e.keyCode is EVEN, then going LEFT or RIGHT,
                FandokuView.selectedFanCell += dDirect; // advance / retreat
            } else {
                // ELSE ... going UP / DOWN - which means doubling or halving
                FandokuView.selectedFanCell *= dDirect; // advance / retreat
            }
            FandokuView.selectedFanCell = Math.min(
                Math.max(2, Math.floor(FandokuView.selectedFanCell)),
                2 ** FandokuView.numGens2Display - 1
            );

            console.log("YOU SHOULD now be LIGHTING UP CELL # ", FandokuView.selectedFanCell);
            let thisGenNum = Math.floor(Math.log2(FandokuView.selectedFanCell));
            let thisPosNum = FandokuView.selectedFanCell - 2 ** thisGenNum;
            let thisWedge = document.getElementById("wedge" + 2 ** thisGenNum + "n" + thisPosNum);
            if (thisWedge) {
                FandokuView.selectedFanColour = thisWedge.style.fill;
                console.log("COLOUR was:", thisWedge.style.fill);
                thisWedge.style.fill = "lime";
            }
        } else if (
            e.keyCode == 13 &&
            FandokuView.gameStatus == "Live" &&
            FandokuView.selectedFanCell > 1 &&
            FandokuView.selectedNameNum > 1
        ) {
            console.log("ENTER has been hit - let's see if there is a YELLOW and a GREEN that match up !");

            let thisGenNum = Math.floor(Math.log2(FandokuView.selectedFanCell));
            let thisPosNum = FandokuView.selectedFanCell - 2 ** thisGenNum;
            let thisWedgeID = "wedge" + 2 ** thisGenNum + "n" + thisPosNum;
            let thisWedge = document.getElementById(thisWedgeID);
            let ahnNum = FandokuView.selectedFanCell;
            if (thisWedge.style.fill == "lime") {
                recolourWedge(thisWedgeID, thisGenNum, thisPosNum, ahnNum);
                let parts = [2 ** thisGenNum, thisPosNum];
                if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                    let realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(ahnNum);
                    console.log("REAL ahnNum : ", realAhnNum);
                    ahnNum = realAhnNum;
                }
                repositionWedge(ahnNum, thisGenNum, parts); // NEEDS TWEAKING HERE !
            }
        } else {
            console.log("nada : ", e.keyCode);
        }
    }

    FandokuView.prototype.init = function (selector, startId) {
        // console.log("FandokuView.js - line:18", selector) ;

        var body = document.querySelector("body");
        body.addEventListener("keyup", checkTabPress);

        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;
        FandokuView.fanchartSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "FandokuView",
            tabs: [
                {
                    name: "rules",
                    label: "Rules",
                    hideSelect: true,
                    subsections: [{ name: "Rules", label: "Rules" }],
                },
                {
                    name: "options",
                    label: "Feedback Options",
                    hideSelect: true,
                    subsections: [{ name: "Options", label: "FanDoku settings" }],
                    comment: "These options apply to the feedback within the FanDoku game.",
                },
            ],
            optionsGroups: [
                {
                    tab: "rules",
                    subsection: "Rules",
                    category: "rules",
                    subcategory: "options",
                    options: [
                        { optionName: "h0", type: "br", label: "GOAL:" },
                        {
                            optionName: "p0",
                            type: "br",
                            label: "The goal of FanDoku is to place all of the ancestors in their proper spot in the Fan Chart.",
                        },
                        { optionName: "h1", type: "br" },
                        { optionName: "h1", type: "br", label: "HOW TO PLAY:" },
                        {
                            optionName: "p2",
                            type: "br",
                            label: "Mouse/Touch device: Click on an Ancestor, then click the appropriate cell in the FanChart.",
                        },
                        {
                            optionName: "p2b",
                            type: "br",
                            label: "Keyboard: Use the W,A,S,D keys to cycle through Ancestor names.",
                        },
                        {
                            optionName: "p2b",
                            type: "br",
                            label: "Use the I,J,K,L keys to select Fan Chart cells, then [ENTER] to place.",
                        },
                        {
                            optionName: "p2b",
                            type: "br",
                            label: "",
                        },
                        {
                            optionName: "p2b",
                            type: "br",
                            label: "You WIN when you've filled all the slots with all the names!",
                        },
                        // { optionName: "p2b", type: "br",  },
                        // { optionName: "p2b", type: "br", label:"You can customize the game using the settings below, then press PLAY GAME." },
                        { optionName: "p2b", type: "br" },
                        {
                            optionName: "gameType",
                            type: "radio",
                            label: "GAME TYPE",
                            values: [
                                { value: "br" },
                                {
                                    value: "FanChart",
                                    text: "Traditional Fan Chart",
                                },
                                { value: "br", label: "(ancestors always in Father/Mother order)" },
                                { value: "br" },
                                {
                                    value: "FanDoku",
                                    text: "FanDoku style",
                                },
                                { value: "br", label: "(random parent order, but consistent within generation)" },
                            ],
                            defaultValue: "FanChart",
                        },
                        { optionName: "break0", type: "br", label: "HINTS:" },
                        {
                            optionName: "genderHinting",
                            label: "Show Gender colours in cells",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        // { optionName: "break0", type: "br" },
                        {
                            optionName: "showLifeSpan",
                            label: "Show LifeSpan (YYYY - YYYY)",
                            type: "checkbox",
                            defaultValue: 0,
                        },
                        // { optionName: "break0", type: "br" },
                        // {
                        //     optionName: "sortByName",
                        //     label: "Sort by Name",
                        //     type: "checkbox",
                        //     defaultValue: 0,
                        // },

                        { optionName: "break0", type: "br" },
                        {
                            optionName: "numHints",
                            type: "radio",
                            label: "Number of Pre-filled Ancestors",
                            values: [
                                { value: "br" },
                                { value: "0", text: "0" },
                                { value: "1", text: "1" },
                                { value: "2", text: "2" },
                                // { value: "3", text: "3" },
                                // { value: "4", text: "4" },
                            ],
                            defaultValue: "1",
                        },
                    ],
                },
                {
                    tab: "options",
                    subsection: "Options",
                    category: "options",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "playDings",
                            label: "Play Ding after each person correct",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "playApplause",
                            label: "Play Applause after each generation completed",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "playCheers",
                            label: "Play Cheers after puzzle finished",
                            type: "checkbox",
                            defaultValue: true,
                        },

                        { optionName: "break1", type: "br" },

                        {
                            optionName: "doFeedback",
                            label: "Give positive feedback words of encouragement",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "doRedFlash",
                            label: "Show red flash & sorry message after a miss",
                            type: "checkbox",
                            defaultValue: true,
                        },
                    ],
                },
            ],
        });

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<div id=btnBarDIV><table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%" style="padding-left:10px;">' +
            "<button id=startGameButton style='padding: 5px' onclick='FandokuView.startGame();'>Start Game</button>" +
            "<span id=preGameFans>" +
            '<A onclick="FandokuView.maxAngle = 360; FandokuView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan360.png" /></A> |' +
            ' <A onclick="FandokuView.maxAngle = 240; FandokuView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></A> |' +
            ' <A onclick="FandokuView.maxAngle = 180; FandokuView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A>' +
            "</span>" +
            "<span id=gameTimer style='display:none'>0:00</span>" +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="center">' +
            "<span id=preGameGens>" +
            ' <A onclick="FandokuView.numGens2Display -=1; FandokuView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>4</span> generations ]" +
            ' <A onclick="FandokuView.numGens2Display +=1; FandokuView.redraw();"> +1 </A> ' +
            "</span>" +
            "<span id=gameStats  style='display:none'>0 / 31</span>" +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="right"  style="padding-right:10px;">' +
            "<button id=resetGameButton style='padding: 5px; display:none;'  onclick='FandokuView.resetGame();'>Play Again</button>" +
            "<button id=endGameButton style='padding: 5px; display:none;'  onclick='FandokuView.endGame();'>End Game</button>" +
            ' <A onclick="FandokuView.toggleSettings();"><font size=+2>' +
            SETTINGS_GEAR +
            "</font></A>&nbsp;&nbsp;</td>" +
            '</tr></table></div><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial FanDoku game is loading ...</DIV>' +
            '<DIV id=FeedbackArea style="text-align:center; background-color:papayawhip;">Feedback and Directions and Encouragement will go here</DIV>';

        var settingsHTML = "";
        // '<div id=settingsDIV style="display:inline-block; position:absolute; right:20px; background-color:aliceblue; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">'+
        // '<span style="color:red; align:left"><A onclick="FandokuView.cancelSettings();">[ <B><font color=red>x</font></B> ]</A></span>' ;
        // '<H3 align=center>FanDoku game Settings</H3>' +

        settingsHTML += FandokuView.fanchartSettingsOptionsObject.createdSettingsDIV; // +
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
        saveSettingsChangesButton.textContent = "START GAME";

        function settingsChanged(e) {
            // if (FandokuView.fanchartSettingsOptionsObject.hasSettingsChanged(FandokuView.currentSettings)) {
            //     // console.log("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
            //     console.log("NEW settings are:", FandokuView.currentSettings);
            //     FandokuView.myAncestorTree.draw();
            // } else {
            //     // console.log("NOTHING happened according to SETTINGS OBJ");
            // }
            FandokuView.startGame();
        }

        // NEXT STEPS : Assign thisVal to actual currentSetting object
        // NEXT STEPS : Transfer this function to SettingsObject class
        // NEXT STEPS : Return a True/False based on whether any changes were actually made --> THEN - call reDraw routine if needed

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g");

        // Setup zoom and pan
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 1])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
            });
        svg.call(zoom);
        // svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height * 0.6).scale(0.45));

        // console.log("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the FanDoku game
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
            CREATE the FanDoku game Backdrop
            * Made of mostly Wedges (starting with the outermost circle)
            * Ending with 2 Sectors for the penultimate pair  - the parents of the central circular superhero
        */

        //<div class="name centered" onclick="FandokuView.pickMe(14)"
        // id="nameFloatingFor14"
        // style="background-color: yellow ; border: blue 2px; padding:5px; display:inline-block;">
        //             <b>Donat Cloutier</b>
        //         </div>

        // FIRST OFF - Let's add FLOATING NAMES around the Chart
        for (let index = 2; index < 2 ** FandokuView.maxNumGens; index++) {
            g.append("g")
                .attrs({
                    id: "floatingNameHolder" + index,
                })
                .append("foreignObject")
                .attrs({
                    "id": "floatingNameObject" + index,
                    "class": "centered",
                    "width": "400px",
                    "height": "60px", // the foreignObject won't display in Firefox if it is 0 height
                    "x": -1400,
                    "y": -1200 + 70 * index,
                    "font-size": "32px",
                    "style": "border: gray 5px double; background-color:white;",
                })

                .style("overflow", "visible") // so the name will wrap
                .append("xhtml:div")
                .attrs({
                    id: "floatingName" + index,
                })
                .html(" <b>Random Ancestor</b>")
                .on("click", function () {
                    let ahnNum = this.id.substring(12);
                    console.log("NAME CLICK - ", this.id, ahnNum);
                    toggleFloatingName(this.id, ahnNum);
                });
        }

        for (let genIndex = FandokuView.maxNumGens - 1; genIndex >= 0; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                if (genIndex <= 1) {
                    // Use a SECTOR for the parents
                    g.append("path")
                        .attrs(
                            SVGfunctions.getSVGforSector(
                                0,
                                0,
                                270 * (genIndex + 0.5),
                                (180 - FandokuView.maxAngle) / 2 +
                                    90 +
                                    90 +
                                    (index * FandokuView.maxAngle) / 2 ** genIndex,
                                (180 - FandokuView.maxAngle) / 2 +
                                    90 +
                                    90 +
                                    ((index + 1) * FandokuView.maxAngle) / 2 ** genIndex,
                                "wedge" + 2 ** genIndex + "n" + index,
                                "black",
                                2,
                                "white"
                            )
                        )
                        .on("click", function () {
                            console.log("CLICKITY CLICK - ", this.id);
                            let thisCode = this.id.substring(5);
                            let parts = thisCode.split("n");
                            let ahnNum = 1 * parts[0] - 0 + 1 * parts[1];
                            let gen = Math.floor(Math.log2(parts[0]));
                            console.log(thisCode, ahnNum, gen);
                            if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                                let realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(ahnNum);
                                console.log("REAL ahnNum : ", realAhnNum);
                                ahnNum = realAhnNum;
                            }
                            recolourWedge(this.id, gen /* parts[0] */, parts[1], ahnNum);
                            repositionWedge(ahnNum, gen, parts);
                        });
                } else {
                    // Use a WEDGE for ancestors further out
                    g.append("path")
                        .attrs(
                            SVGfunctions.getSVGforWedge(
                                0,
                                0,
                                270 * (genIndex + 0.5),
                                270 * (genIndex - 0.5),
                                (180 - FandokuView.maxAngle) / 2 +
                                    90 +
                                    90 +
                                    (index * FandokuView.maxAngle) / 2 ** genIndex,
                                (180 - FandokuView.maxAngle) / 2 +
                                    90 +
                                    90 +
                                    ((index + 1) * FandokuView.maxAngle) / 2 ** genIndex,
                                "wedge" + 2 ** genIndex + "n" + index,
                                "black",
                                2,
                                "white"
                            )
                        )
                        .on("click", function () {
                            console.log("CLICK CLICK - ", this.id);
                            let thisCode = this.id.substring(5);
                            let parts = thisCode.split("n");
                            let ahnNum = 1 * parts[0] - 0 + 1 * parts[1];
                            let gen = Math.floor(Math.log2(parts[0]));
                            console.log(thisCode, ahnNum, gen);
                            if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                                let realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(ahnNum);
                                console.log("REAL ahnNum : ", realAhnNum);
                                ahnNum = realAhnNum;
                            }
                            recolourWedge(this.id, gen /* parts[0] */, parts[1], ahnNum);
                            repositionWedge(ahnNum, gen, parts);
                            // let thisWedge = document.getElementById("wedgeInfoFor" + ahnNum);
                            // console.log("CLICK:", thisWedge.parentNode.parentNode.parentNode);
                            // let thisGparentNode =   thisWedge.parentNode.parentNode.parentNode;
                            // let numSpotsThisGen = parts[0];
                            // let pos = 1*parts[1];

                            // let thisRadius = 270;
                            // let placementAngle =
                            //     180 +
                            //     (180 - FandokuView.maxAngle) / 2 +
                            //     (FandokuView.maxAngle / numSpotsThisGen) * (0.5 + pos);
                            // let nameAngle = 90 + placementAngle;
                            // let newX = gen * thisRadius * Math.cos((placementAngle * Math.PI) / 180);
                            // let newY = gen * thisRadius * Math.sin((placementAngle * Math.PI) / 180);

                            // let theTransform =  "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
                            // console.log(thisGparentNode.getAttribute("transform") , theTransform);
                            // thisGparentNode.setAttribute("transform" , theTransform);
                        });
                }
            }
        }
        // HIDE all the unused Wedges in the outer rims that we don't need yet
        for (let genIndex = FandokuView.maxNumGens - 1; genIndex > FandokuView.numGens2Display - 1; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attrs({ display: "none" });
            }
        }

        // CREATE a CIRCLE for the Central Person to be drawn on top of
        g.append("circle").attrs({
            "cx": 0,
            "cy": 0,
            "r": 135,
            "id": "ctrCirc",
            "fill": "white",
            "stroke": "black",
            "stroke-width": "2",
        });

        // FINALLY ... let's add ONE MORE text object - for the NOPE text
        g.append("g")
            .attrs({
                id: "nopeText",
            })
            .append("foreignObject")
            .attrs({
                "id": "nopeTextObject",
                "class": "centered",
                "width": "140px",
                "height": "60px", // the foreignObject won't display in Firefox if it is 0 height
                "x": 300,
                "y": 300,
                "font-size": "32px",
                "font-color": "yellow",
                "style": "background-color:red; display:none;",
            })

            .style("overflow", "visible") // so the name will wrap
            .append("xhtml:div")
            .attrs({
                id: "nopeTextInner",
            })
            .html("<B style='color:yellow;'>NOPE!!!</B>");

        self.load(startId);
        // console.log(FandokuView.fanchartSettingsOptionsObject.createdSettingsDIV);
        FandokuView.fanchartSettingsOptionsObject.buildPage();
        FandokuView.fanchartSettingsOptionsObject.setActiveTab("rules");
        FandokuView.currentSettings = FandokuView.fanchartSettingsOptionsObject.getDefaultOptions();
        FandokuView.showSettings();
        // IDs for PARTS of the BUTTON BAR to HIDE / SHOW
        // startGameButton;
        // preGameFans;
        // gameTimer;
        // preGameGens;
        // numGensInBBar;
        // gameStats;
        // endGameButton;
    };

    function repositionWedge(ahnNum, gen, parts) {
        console.log("repositionWedge : ", ahnNum, gen, parts);
        let thisWedge = document.getElementById("wedgeInfoFor" + ahnNum);
        if (!thisWedge) {
            console.log("WARNING: No Wedge found for ", ahnNum, "at", "wedgeInfoFor" + ahnNum);
            return;
        }
        if (FandokuView.gameStatus == "Live" || FandokuView.gameStatus == "Post") {
            console.log("CLICK:", thisWedge.parentNode.parentNode.parentNode);
            let thisGparentNode = thisWedge.parentNode.parentNode.parentNode;
            let numSpotsThisGen = parts[0];
            let pos = 1 * parts[1];

            let thisRadius = 270;
            let placementAngle =
                180 + (180 - FandokuView.maxAngle) / 2 + (FandokuView.maxAngle / numSpotsThisGen) * (0.5 + pos);
            let nameAngle = 90 + placementAngle;
            let newX = gen * thisRadius * Math.cos((placementAngle * Math.PI) / 180);
            let newY = gen * thisRadius * Math.sin((placementAngle * Math.PI) / 180);

            let theTransform = "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
            console.log(thisGparentNode.getAttribute("transform"), theTransform);
            thisGparentNode.setAttribute("transform", theTransform);
        } else {
            console.log("MIGHT have been a match - but the game is NOT LIVE !!!");
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

    function clearFeedbackArea() {
        document.getElementById("FeedbackArea").innerHTML = "";
    }

    function doQuickFlashRed(theWedge) {
        // FIRST ... check to see if the option to DO the RED FLASH is enabled
        if (FandokuView.currentSettings["options_options_doRedFlash"] == false) {
            // if NOT, then get the heck out of Dodge!
            return;
        }
        console.log("DOquick Flash RED !!!");
        let randomIndex = Math.floor(Math.random() * FandokuView.discouragingArray.length);

        let origClr = theWedge.style.fill;
        theWedge.style.fill = "red";
        console.log(theWedge);
        console.log(theWedge.getAttribute("d"));
        let theDstring = theWedge.getAttribute("d");
        let theDarray = theDstring.split(" ");
        let midX = (1 * theDarray[1] - 0 + 1 * theDarray[9]) / 2 - 70;
        let midY = (1 * theDarray[2] - 0 + 1 * theDarray[10]) / 2 - 30;
        let theR = Math.sqrt(midX * midX + midY * midY);
        let theDR = (theR - 100) / theR;
        let newX = theDR * midX;
        let newY = theDR * midY;
        console.log("theDarray:", theDarray);
        console.log("midX, midY, theR, theDR , newX, newY:", midX, midY, theR, theDR, newX, newY);
        console.log(document.getElementById("nopeTextObject"));
        document.getElementById("nopeTextObject").style.display = "block";
        document.getElementById("nopeTextInner").innerHTML =
            '<b style="color:yellow;">' + FandokuView.discouragingArray[randomIndex] + "</b>";

        document.getElementById("nopeTextObject").setAttribute("x", newX);
        document.getElementById("nopeTextObject").setAttribute("y", newY);
        setTimeout(function () {
            theWedge.style.fill = origClr;
            document.getElementById("nopeTextObject").style.display = "none";
        }, 1000);
    }

    function updateFeedbackArea(theMessage) {
        if (theMessage == "+") {
            let randomIndex = Math.floor(Math.random() * FandokuView.encouragingArray.length);
            theMessage = FandokuView.encouragingArray[randomIndex];
        } else if (theMessage == "-") {
            if (FandokuView.numMisses % 2 == 0) {
                theMessage = "Sorry, not a match.  Please try again.";
            } else {
                theMessage = "Please try again, that is not a match.";
            }
        }
        document.getElementById("FeedbackArea").innerHTML = theMessage;
    }

    // Make sure that the Button Bar displays the proper number of generations - and - adjust the max / min if needed because of over-zealous clicking
    function recalcAndDisplayNumGens() {
        if (FandokuView.numGens2Display < 3) {
            FandokuView.numGens2Display = 3;
            showTemporaryMessageBelowButtonBar(
                "3 is the minimum number of generations you can use for this FanDoku game.."
            );
        } else if (FandokuView.numGens2Display > FandokuView.workingMaxNumGens) {
            console.log("NUMS:", FandokuView.numGens2Display, FandokuView.workingMaxNumGens, FandokuView.maxNumGens);
            FandokuView.numGens2Display = FandokuView.workingMaxNumGens;
            if (FandokuView.workingMaxNumGens < FandokuView.maxNumGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
                );
            } else {
                showTemporaryMessageBelowButtonBar(
                    FandokuView.maxNumGens + " is the maximum number of generations you can use for this FanDoku game.."
                );
            }
        }

        var numGensSpan = document.querySelector("#numGensInBBar");
        numGensSpan.textContent = FandokuView.numGens2Display;
        // console.log("numGensSpan:", numGensSpan);
        if (FandokuView.numGens2Display > FandokuView.numGensRetrieved) {
            loadAncestorsAtLevel(FandokuView.numGens2Display);
            FandokuView.numGensRetrieved = FandokuView.numGens2Display;
        }
        if (FandokuView.numGens2Display == 6) {
            FandokuView.maxAngle = Math.max(240, FandokuView.maxAngle);
        } else if (FandokuView.numGens2Display == 7) {
            FandokuView.maxAngle = 360;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        console.log("Need to load MORE peeps from Generation ", newLevel);
        let theListOfIDs = FandokuView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        // console.log(theListOfIDs);
        if (theListOfIDs.length == 0) {
            // console.log("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            FandokuView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            FandokuView.numGensRetrieved++;
            FandokuView.workingMaxNumGens = Math.min(FandokuView.maxNumGens, FandokuView.numGensRetrieved + 1);
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
                    FandokuView.theAncestors = result;
                    console.log("theAncestors:", FandokuView.theAncestors);
                    // console.log("person with which to drawTree:", person);
                    for (let index = 0; index < FandokuView.theAncestors.length; index++) {
                        thePeopleList.add(FandokuView.theAncestors[index].person);
                    }
                    FandokuView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    FandokuView.workingMaxNumGens = Math.min(FandokuView.maxNumGens, FandokuView.numGensRetrieved + 41);

                    clearMessageBelowButtonBar();
                }
            });
        }
    }
    // Redraw the Wedges if needed for the FanDoku game
    function redoWedgesForFanChart() {
        // console.log("TIme to RE-WEDGIFY !", this, FandokuView);

        // FandokuView.maxAngle = 240; // ADDED THIS FOR FANDOKU !!!
        // FandokuView.lastAngle = 180; // ADDED THIS FOR FANDOKU !!!

        if (FandokuView.lastAngle != FandokuView.maxAngle || FandokuView.lastNumGens != FandokuView.numGens2Display) {
            // ONLY REDO the WEDGES IFF the maxAngle has changed (360 to 240 to 180 or some combo like that)
            for (let genIndex = FandokuView.numGens2Display - 1; genIndex >= 0; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    let SVGcode = "";
                    if (genIndex <= 1) {
                        SVGcode = SVGfunctions.getSVGforSector(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            (180 - FandokuView.maxAngle) / 2 + 90 + 90 + (index * FandokuView.maxAngle) / 2 ** genIndex,
                            (180 - FandokuView.maxAngle) / 2 +
                                90 +
                                90 +
                                ((index + 1) * FandokuView.maxAngle) / 2 ** genIndex,
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
                            (180 - FandokuView.maxAngle) / 2 + 90 + 90 + (index * FandokuView.maxAngle) / 2 ** genIndex,
                            (180 - FandokuView.maxAngle) / 2 +
                                90 +
                                90 +
                                ((index + 1) * FandokuView.maxAngle) / 2 ** genIndex,
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
            for (let genIndex = FandokuView.maxNumGens - 1; genIndex > FandokuView.numGens2Display - 1; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attrs({ display: "none" });
                }
            }
            FandokuView.lastAngle = FandokuView.maxAngle;
            FandokuView.lastNumGens = FandokuView.numGens2Display;
        }
    }

    function toggleFloatingName(id, ahnNum) {
        console.log("toggleFloatingName", id, ahnNum);
        for (let index = 2; index < 2 ** FandokuView.maxNumGens; index++) {
            let thisID = "floatingName" + index;
            let thisNameDIV = document.getElementById(thisID);
            if (thisNameDIV) {
                if (thisID == id) {
                    console.log("Floating Name background was already: ", thisNameDIV.style.background);
                    if (thisNameDIV.style.background == "yellow") {
                        thisNameDIV.style.background = "white";
                        FandokuView.selectedNameNum = -1;
                    } else {
                        thisNameDIV.style.background = "yellow";
                        FandokuView.selectedNameNum = index;
                    }
                } else {
                    thisNameDIV.style.background = "white";
                }
            }
        }
    }

    function recolourWedge(id, gen, pos, ahnNum) {
        console.log("recolourWedge:", id, gen, pos, ahnNum);
        console.log("recolourWedge B4 version of FandokuView.foundAncestors:", FandokuView.foundAncestors);
        let thisPersonsWedge = document.getElementById(id);
        let theWedgeBox = document.getElementById("wedgeBoxFor" + ahnNum);
        let theWedgeInfo = document.getElementById("wedgeInfoFor" + ahnNum);

        let isAmatch = FandokuView.selectedNameNum == ahnNum;
        if (!isAmatch) {
            let selectedPersonFullName = getSettingsName(
                thePeopleList[FandokuView.myAhnentafel.list[FandokuView.selectedNameNum]]
            );
            let ahnNumFullName = getSettingsName(thePeopleList[FandokuView.myAhnentafel.list[ahnNum]]);
            isAmatch = selectedPersonFullName == ahnNumFullName;
        }

        if (isAmatch) {
            let theClr = getBackgroundColourFor(gen, pos, ahnNum);
            console.log("re wedge clr:", gen, pos, ahnNum, theClr);
            if (
                FandokuView.currentSettings["rules_options_genderHinting"] == true &&
                FandokuView.gameStatus == "Live"
            ) {
                if (ahnNum % 2 == 0) {
                    theClr = "azure";
                } else {
                    theClr = "seashell";
                }
            }

            if (FandokuView.gameStatus == "Live" || FandokuView.gameStatus == "Post") {
                if (thisPersonsWedge) {
                    thisPersonsWedge.style.fill = theClr;
                } else {
                    console.log("Can't find: ", id);
                }
                let thisID = "floatingNameHolder" + ahnNum;
                let thisNameDIV = document.getElementById(thisID);

                if (theWedgeBox) {
                    theWedgeBox.style.background = theClr;
                }
                if (theWedgeInfo) {
                    theWedgeInfo.style.display = "block";
                }
                thisNameDIV.style.display = "none";
                if (FandokuView.gameStatus == "Live") {
                    updateAncestorsPlaced(true);
                    fandokuDing.pause();
                    fandokuClap.pause();
                    fandokuDing.currentTime = 0;
                    if (FandokuView.currentSettings["options_options_playDings"] == true) {
                        fandokuDing.play();
                    }
                }
                FandokuView.foundAncestors[ahnNum] = true;
                let foundFalse = false;
                console.log("ahnNum:", ahnNum, gen, pos, "FandokuView.foundAncestors", FandokuView.foundAncestors);
                for (let index = 2 ** gen; index < 2 ** (gen + 1) && foundFalse == false; index++) {
                    if (FandokuView.foundAncestors[index] == false) {
                        foundFalse = true;
                    }
                }
                if (foundFalse == false) {
                    // must have completed this generation after all ! Yay!
                    fandokuDing.pause();
                    if (FandokuView.currentSettings["options_options_playApplause"] == true) {
                        fandokuClap.play();
                    }
                    let specificGen = "parents";
                    if (gen == 4) {
                        specificGen = "grandparents";
                    } else if (gen == 8) {
                        specificGen = "great grandparents";
                    } else if (gen == 16) {
                        specificGen = "great great grandparents";
                    } else if (gen == 32) {
                        specificGen = "3x great grandparents";
                    } else if (gen == 64) {
                        specificGen = "4x great grandparents";
                    } else if (gen == 128) {
                        specificGen = "5x great grandparents";
                    }
                    console.log("status:", FandokuView.gameStatus, "calling updateFeedbackArea from ", 852);
                    if (FandokuView.gameStatus == "Live") {
                        updateFeedbackArea("Congratulations - you just cleared the " + specificGen + " generation");
                    }
                } else {
                    console.log("status:", FandokuView.gameStatus, "calling updateFeedbackArea from ", 855);
                    if (FandokuView.currentSettings["options_options_doFeedback"] == true) {
                        updateFeedbackArea("+");
                    }
                }
                console.log("recolourWedge AFT version of FandokuView.foundAncestors:", FandokuView.foundAncestors);
            } else {
                console.log("WOULD have been a match if the game had been LIVE !");
            }
        } else {
            if (FandokuView.gameStatus == "Live") {
                if (
                    FandokuView.selectedNameNum > 1 &&
                    document.getElementById("floatingNameHolder" + FandokuView.selectedNameNum).style.display == "block"
                ) {
                    updateAncestorsPlaced(false);
                    doQuickFlashRed(thisPersonsWedge);

                    console.log(
                        "SORRY BUDDY - please try again",
                        FandokuView.selectedNameNum,
                        document.getElementById("floatingNameHolder" + FandokuView.selectedNameNum)
                    );
                } else {
                    console.log("Maybe you were just moving things around a bit ...");
                }
            }
        }
    }

    function hideWedge(ahnNum) {
        let theWedgeBox = document.getElementById("wedgeBoxFor" + ahnNum);
        let theWedgeInfo = document.getElementById("wedgeInfoFor" + ahnNum);
        let gen = Math.floor(Math.log2(ahnNum));
        let id = "wedge" + 2 ** gen + "n" + (ahnNum - 2 ** gen);
        let thisPersonsWedge = document.getElementById(id);

        if (theWedgeInfo) {
            theWedgeInfo.style.display = "none";
        }
        if (theWedgeBox) {
            theWedgeBox.style.background = "white";
        }
        if (thisPersonsWedge) {
            thisPersonsWedge.style.fill = "white";
        }

        let thisID = "floatingNameHolder" + ahnNum;
        let thisObj = "floatingNameObject" + ahnNum;
        let thisNameOnlyObj = document.getElementById("floatingName" + ahnNum);
        thisNameOnlyObj.innerHTML = "<B>Random Ancestor" + "</B>";

        let thisNameDIV = document.getElementById(thisID);
        thisNameDIV.style.display = "block";
        let dThetaNudge = 0;
        if (FandokuView.numGens2Display == 6) {
            dThetaNudge = 0.25;
        } else if (FandokuView.numGens2Display == 7) {
            dThetaNudge = 0.45;
        }

        let thisNameOBJ = document.getElementById(thisObj);
        let newR = 270 * (1.25 + FandokuView.numGens2Display);
        if (FandokuView.currentSettings["rules_options_showLifeSpan"] == true && ahnNum % 2 == 1) {
            newR += 400;
        }
        let newTheta = ((1 + dThetaNudge) * (ahnNum - 1)) / (2 ** FandokuView.numGens2Display - 1) - dThetaNudge / 2; // basically your amount in radians!
        let newX = newR * Math.cos((1 + newTheta) * Math.PI) - 270;
        let newY = newR * Math.sin((1 + newTheta) * Math.PI) + 100;

        if (FandokuView.numGens2Display == 4 && ahnNum == 9) {
            newX = -250;
            newY += 120;
        } else if (FandokuView.numGens2Display == 4 && ahnNum == 8) {
            newX = -250;
            newY -= 60;
        } else if (FandokuView.numGens2Display == 5 && ahnNum > 12 && ahnNum <= 20) {
            newY = 0 - newR + 90 * (1 - (ahnNum % 3));
        } else if (FandokuView.numGens2Display == 6 && ahnNum > 24 && ahnNum <= 40) {
            newY = 0 - newR + 90 * (3 - (ahnNum % 5));
        } else if (FandokuView.numGens2Display == 7 && ahnNum > 34 && ahnNum <= 69) {
            newY += 0 - 90 * (ahnNum % 7);
        } else if (FandokuView.numGens2Display == 7 && ahnNum > 69 && ahnNum <= 92) {
            newY += 0 - 90 * (6 - (ahnNum % 7));
            if (ahnNum < 72) {
                newX += 350;
            }
        }
        // let newX = thisGenNum * thisRadius * Math.cos((placementAngle * Math.PI) / 180);
        // let newX = thisGenNum * thisRadius * Math.cos((placementAngle * Math.PI) / 180);
        // let newY = thisGenNum * thisRadius * Math.sin((placementAngle * Math.PI) / 180);

        thisNameOBJ.setAttribute("x", newX);
        thisNameOBJ.setAttribute("y", newY);
    }

    /** FUNCTION used to force a redraw of the FanDoku game, used when called from Button Bar after a parameter has been changed */

    FandokuView.endGame = function () {
        console.log("FandokuView.endGame");
        clearInterval(FandokuView.gameTimerInterval);
        FandokuView.gameStatus = "Post";
        let ahnNum = 1;
        for (let gen = 1; gen < FandokuView.numGens2Display; gen++) {
            let base = 2 ** gen;
            for (let pos = 0; pos < base; pos++) {
                ahnNum = base + pos;
                FandokuView.selectedNameNum = ahnNum;
                recolourWedge("wedge" + base + "n" + pos, gen, pos, ahnNum);
                let parts = [base, pos];
                if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                    let realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(ahnNum);
                    console.log("REAL ahnNum : ", realAhnNum);
                    ahnNum = realAhnNum;
                }
                repositionWedge(ahnNum, gen, parts); // NEEDS TWEAKING HERE !
            }
        }
        // console.log("Now theAncestors = ", FandokuView.theAncestors);
        // thePeopleList.listAll();
        //  recalcAndDisplayNumGens();
        //  redoWedgesForFanChart();
        //  FandokuView.myAncestorTree.draw();
        document.getElementById("endGameButton").style.display = "none";
        document.getElementById("resetGameButton").style.display = "inline-block";
        if (FandokuView.totalNumAncestors != FandokuView.numAncestorsPlaced) {
            console.log("status:", FandokuView.gameStatus, "calling updateFeedbackArea from ", 938);
            let theGameName = "Fan Chart";
            if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                theGameName = "FanDoku";
            }
            updateFeedbackArea(
                "You ended the game before the " +
                    theGameName +
                    " was completely assembled.<BR>Hope you try again soon!<BR><BR>GAME OVER"
            );
        }
    };

    FandokuView.resetGame = function () {
        document.getElementById("resetGameButton").style.display = "none";

        // IDs for PARTS of the BUTTON BAR to HIDE / SHOW
        document.getElementById("startGameButton").style.display = "inline-block";
        document.getElementById("preGameFans").style.display = "inline-block";
        document.getElementById("gameTimer").style.display = "none";
        // startGameButton;
        // preGameFans;
        // gameTimer;
        // preGameGens;
        document.getElementById("preGameGens").style.display = "inline-block";
        // numGensInBBar;
        // gameStats;
        document.getElementById("gameStats").style.display = "none";
        // endGameButton;
        document.getElementById("endGameButton").style.display = "none";

        FandokuView.showSettings();
        document.getElementById("saveSettingsChanges").style.display = "inline-block";
        FandokuView.setupGame();
    };

    FandokuView.setupGame = function () {
        console.log("FandokuView.setupGame");
        console.log(fandokuDing);
        FandokuView.gameStatus = "Pre";
        // fandokuDing.play();
        // HIDE ALL the NAMES (especially ones for generations we're not using)
        for (let ahnNum = 2; ahnNum < 2 ** FandokuView.maxNumGens; ahnNum++) {
            let thisID = "floatingNameHolder" + ahnNum;
            let thisNameDIV = document.getElementById(thisID);
            if (thisNameDIV) {
                thisNameDIV.style.display = "none";
            }
        }
        //HIDE the Peeps! & Track their locations
        let HolderCoords = [];
        for (let ahnNum = 2; ahnNum < 2 ** FandokuView.numGens2Display; ahnNum++) {
            hideWedge(ahnNum);
            let thisNameObj = document.getElementById("floatingNameObject" + ahnNum);
            // console.log(thisNameObj);
            // console.log("x",thisNameObj.x, "attr",thisNameObj.getAttribute("x"));
            HolderCoords.push([Math.random(), thisNameObj.getAttribute("x"), thisNameObj.getAttribute("y"), ahnNum]);
        }
        console.log(HolderCoords);
        HolderCoords.sort();
        FandokuView.newOrder = [];

        for (let ahnNum = 2; ahnNum < 2 ** FandokuView.numGens2Display; ahnNum++) {
            let thisNameObj = document.getElementById("floatingNameObject" + ahnNum);
            thisNameObj.setAttribute("x", HolderCoords[ahnNum - 2][1]);
            thisNameObj.setAttribute("y", HolderCoords[ahnNum - 2][2]);
            FandokuView.newOrder.push(HolderCoords[ahnNum - 2][3]);
        }

        updateFeedbackArea("Choose game type, then click START GAME");
        // console.log("Now theAncestors = ", FandokuView.theAncestors);
        // thePeopleList.listAll();
        //  recalcAndDisplayNumGens();
        //  redoWedgesForFanChart();
        //  FandokuView.myAncestorTree.draw();
    };

    function updateAhnCellArray(ahnNumChild, posNumChild, parentGenNum) {
        // FandokuView.ahnNumCellNumArray = [0, 1];
        let paAhnNum = 2 * ahnNumChild;
        let maAhnNum = 2 * ahnNumChild + 1;
        let paPosNum = 2 * posNumChild + 0.5 - 0.5 * FandokuView.genMForder[parentGenNum];
        let maPosNum = 2 * posNumChild + 0.5 + 0.5 * FandokuView.genMForder[parentGenNum];
        FandokuView.ahnNumCellNumArray[paAhnNum] = paPosNum;
        FandokuView.ahnNumCellNumArray[maAhnNum] = maPosNum;
        if (parentGenNum < FandokuView.numGens2Display) {
            updateAhnCellArray(paAhnNum, paPosNum, parentGenNum + 1);
            updateAhnCellArray(maAhnNum, maPosNum, parentGenNum + 1);
        }
    }

    FandokuView.startGame = function () {
        console.log("FandokuView.startGame");
        updateFeedbackArea(
            "Click on Ancestor name for yellow highlight, then click on matching cell inside Fan Chart."
        );
        let settingsHaveChanged = FandokuView.fanchartSettingsOptionsObject.hasSettingsChanged(
            FandokuView.currentSettings
        );
        console.log(FandokuView.myAhnentafel);
        console.log("Settings Changed:", settingsHaveChanged, FandokuView.currentSettings);

        // SETUP the genMForder array  based on whether we're doing a FAN CHART or a FANDOKU type of game
        // 1 is normal order Father then Mother (going clockwise), -1 is Mother / Father order for that generation
        FandokuView.genMForder = [1, 1];
        FandokuView.ahnNumCellNumArray = [0, 1];
        FandokuView.selectedFanCell = 2;

        let oppoOrderGen = Math.max(
            2,
            Math.min(FandokuView.numGens2Display, Math.ceil(Math.random() * FandokuView.numGens2Display))
        );
        for (let genNum = 2; genNum <= FandokuView.numGens2Display; genNum++) {
            if (FandokuView.currentSettings["rules_options_gameType"] == "FanChart") {
                FandokuView.genMForder[genNum] = 1;
            } else {
                if (genNum == oppoOrderGen || Math.random() < 0.5) {
                    FandokuView.genMForder[genNum] = -1;
                } else {
                    FandokuView.genMForder[genNum] = 1;
                }
            }
        }

        console.log("mfORDER : ", FandokuView.genMForder);
        FandokuView.ahnNumCellNumArray = [0, 1];
        updateAhnCellArray(1, 1, 2); // ahnNumChild , posNumChild , parentGenNum
        console.log("mf ahnCellArray: ", FandokuView.ahnNumCellNumArray);

        // CHECK for gen 6 or gen 7, and if so - then change maxAngle appropriately (min 240, min 360)
        if (FandokuView.numGens2Display == 6) {
            FandokuView.maxAngle = Math.max(240, FandokuView.maxAngle);
            FandokuView.redraw();
        } else if (FandokuView.numGens2Display == 7) {
            FandokuView.maxAngle = 360;
            FandokuView.redraw();
        }

        // DO THE GENDER HINTING (bkgd colour of blue or pink) - IF CHECKED
        if (FandokuView.currentSettings["rules_options_genderHinting"] == true) {
            // console.log("GENDER PAINTING BEGIN!");
            for (let genNum = 1; genNum < FandokuView.numGens2Display; genNum++) {
                for (let posNum = 0; posNum < 2 ** genNum; posNum++) {
                    let thisWedge = document.getElementById("wedge" + 2 ** genNum + "n" + posNum);
                    if (thisWedge) {
                        let thisClr = "azure"; // a light blue - lighter than "lightskyblue";
                        let thisAdjustedPosNum = FandokuView.ahnNumCellNumArray[2 ** genNum + posNum];
                        if (thisAdjustedPosNum % 2 == 1) {
                            thisClr = "seashell"; // a light pink
                        }
                        thisWedge.style.fill = thisClr;
                    }
                }
            }
        }

        // NOW - ONE LAST GO THROUGH AGAIN, to GRAY OUT any cells that do NOT contain any ancestors at all
        for (let genNum = 1; genNum < FandokuView.numGens2Display; genNum++) {
            for (let posNum = 0; posNum < 2 ** genNum; posNum++) {
                let thisWedge = document.getElementById("wedge" + 2 ** genNum + "n" + posNum);
                let thisAdjustedPosNum = FandokuView.ahnNumCellNumArray[2 ** genNum + posNum];

                if (thisWedge && FandokuView.myAhnentafel.list[thisAdjustedPosNum] == undefined) {
                    console.log("num:", thisAdjustedPosNum, FandokuView.myAhnentafel.list[thisAdjustedPosNum]);
                    let thisClr = "#F0F0F0"; // a light blue - lighter than "lightskyblue";
                    thisWedge.style.fill = thisClr;
                }
            }
        }

        FandokuView.totalNumAncestors = 0;
        FandokuView.numAncestorsPlaced = -1;
        FandokuView.numMisses = 0;
        FandokuView.gameStatus = "Live";
        // FandokuView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors

        //NAME the Peeps!
        FandokuView.foundAncestors = [];

        for (let ahnNum = 2; ahnNum < 2 ** FandokuView.numGens2Display; ahnNum++) {
            let thisNameObj = document.getElementById("floatingName" + ahnNum);
            console.log("FandokuView.myAhnentafel.list[ ahnNum ] : ", FandokuView.myAhnentafel.list[ahnNum]);
            let thePeep = thePeopleList[FandokuView.myAhnentafel.list[ahnNum]];
            if (thePeep) {
                theNameDIVhtml = "<B>" + getFullName(thePeep) + "</B>";
                if (FandokuView.currentSettings["rules_options_showLifeSpan"] == true) {
                    theNameDIVhtml += "<br/>(" + getLifeSpan(thePeep) + ")";
                }
                thisNameObj.innerHTML = theNameDIVhtml;
                FandokuView.totalNumAncestors++;
                FandokuView.foundAncestors[ahnNum] = false;
            } else {
                thisNameObj.style.display = "none";
                let thisID = "floatingNameHolder" + ahnNum;
                let thisNameDIV = document.getElementById(thisID);
                if (thisNameDIV) {
                    thisNameDIV.style.display = "none";
                }
                FandokuView.foundAncestors[ahnNum] = true; // this ancestor doesn't exist - so - let's pretend they're already found, so it doesn't throw a wrench in the "complete generation"  calculation
            }
        }
        FandokuView.gameStatus = "Live";
        updateAncestorsPlaced(true);

        // IDs for PARTS of the BUTTON BAR to HIDE / SHOW
        document.getElementById("startGameButton").style.display = "none";
        document.getElementById("preGameFans").style.display = "none";
        document.getElementById("gameTimer").style.display = "inline-block";

        document.getElementById("preGameGens").style.display = "none";

        document.getElementById("gameStats").style.display = "inline-block";

        document.getElementById("endGameButton").style.display = "inline-block";

        FandokuView.cancelSettings();
        document.getElementById("saveSettingsChanges").style.display = "none";

        FandokuView.numSecondsElapsed = 0;
        updateGameTime();
        FandokuView.numAncestorsPlaced = 0;
        FandokuView.gameTimerInterval = setInterval(() => {
            updateGameTime();
        }, 1000);

        // HIGHLIGHT a  NAME to start things off
        let nextNum = FandokuView.newOrder[0]; // ahnenTafel # for Name to be initially HIGHLIGHTED
        toggleFloatingName("floatingName" + nextNum, nextNum);

        // CHECK TO SEE if WE NEED TO REVEAL A FEW PRE-FILLED ANCESTORS (hints)
        if (FandokuView.currentSettings["rules_options_numHints"] > 0) {
            let showNum = nextNum; // ahnenTafel # for person in outer ring to be given out as an initial hint
            let base = 2 ** (FandokuView.numGens2Display - 1);
            let pos = 0;
            for (let ii = 0; showNum == nextNum; ii++) {
                showNum = base + Math.floor(Math.random() * base);
            }
            pos = showNum - base;
            let id = "wedge" + base + "n" + pos;
            FandokuView.selectedNameNum = showNum;
            let parts = [base, pos];
            let realAhnNum = showNum;

            if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(showNum);
                console.log("REAL ahnNum : ", realAhnNum);
                // ahnNum = realAhnNum;
                parts[1] = realAhnNum - base;
                id = "wedge" + base + "n" + parts[1];
            }
            let thisShowNumWedge = document.getElementById("wedgeInfoFor" + showNum);
            let numTries = 0;
            while (!thisShowNumWedge && numTries < 100) {
                console.log("DANGER DANGER WILL ROBINSON - this WEDGE does not exist !!!!");

                showNum = base + Math.floor(Math.random() * base);

                pos = showNum - base;
                id = "wedge" + base + "n" + pos;
                FandokuView.selectedNameNum = showNum;
                parts = [base, pos];
                realAhnNum = showNum;

                if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                    realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(showNum);
                    console.log("REAL ahnNum : ", realAhnNum);
                    // ahnNum = realAhnNum;
                    parts[1] = realAhnNum - base;
                    id = "wedge" + base + "n" + parts[1];
                }
                thisShowNumWedge = document.getElementById("wedgeInfoFor" + showNum);
                numTries++;
            }
            // TO DO STILL:
            // ADD CODE HERE TO CHOOSE A DIFFERENT RANDOM PERSON IF STILL !thisShowNumWedge --> for those instances where the outer ring has NO ancestors in it

            recolourWedge(id, FandokuView.numGens2Display - 1, parts[1], showNum);
            repositionWedge(showNum, FandokuView.numGens2Display - 1, parts);

            if (FandokuView.currentSettings["rules_options_numHints"] > 1 && FandokuView.numGens2Display > 3) {
                let showNum2 = showNum; // ahnenTafel # for person in penultimate ring to be given out as an initial hint
                let base = 2 ** (FandokuView.numGens2Display - 2);
                let pos = 0;
                for (
                    let ii = 0;
                    showNum2 == showNum || showNum2 == nextNum || showNum2 == Math.floor(showNum / 2);
                    ii++
                ) {
                    showNum2 = base + Math.floor(Math.random() * base);
                }
                pos = showNum2 - base;
                let id = "wedge" + base + "n" + pos;
                FandokuView.selectedNameNum = showNum2;
                let parts = [base, pos];
                let realAhnNum = showNum2;
                if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                    realAhnNum = FandokuView.ahnNumCellNumArray.indexOf(showNum2);
                    console.log("REAL ahnNum : ", realAhnNum);
                    // ahnNum = realAhnNum;
                    parts[1] = realAhnNum - base;
                    id = "wedge" + base + "n" + parts[1];
                }
                recolourWedge(id, FandokuView.numGens2Display - 2, parts[1], showNum2);
                repositionWedge(showNum2, FandokuView.numGens2Display - 2, parts);
            }
        }

        FandokuView.selectedNameNum = nextNum;
    };

    function updateGameTime() {
        FandokuView.numSecondsElapsed++;
        let numMins = Math.floor(FandokuView.numSecondsElapsed / 60);
        let numSecs = FandokuView.numSecondsElapsed - 60 * numMins;
        let displayTimeMinSecs = "Time: " + numMins + ":" + (numSecs < 10 ? "0" : "") + numSecs;
        let gameTimerDIV = document.getElementById("gameTimer");
        if (gameTimerDIV) {
            gameTimerDIV.textContent = displayTimeMinSecs;
        } else {
            console.log("STOPPING the GAME TIMER now");
            clearInterval(FandokuView.gameTimerInterval);
        }
    }

    function updateAncestorsPlaced(didPlace) {
        if (FandokuView.gameStatus == "Live") {
            if (didPlace == true) {
                FandokuView.numAncestorsPlaced++;
            } else {
                FandokuView.numMisses++;
                updateFeedbackArea("-");
            }
        }

        let displayScore = "Placed: " + FandokuView.numAncestorsPlaced + "/" + FandokuView.totalNumAncestors;
        displayScore += "            " + "Missed: " + FandokuView.numMisses;

        document.getElementById("gameStats").textContent = displayScore;

        if (didPlace == true && FandokuView.numAncestorsPlaced == FandokuView.totalNumAncestors) {
            fandokuDing.pause();
            fandokuClap.pause();
            if (FandokuView.currentSettings["options_options_playCheers"] == true) {
                fandokuCheer.play();
            }
            FandokuView.endGame();
            console.log("status:", FandokuView.gameStatus, "calling updateFeedbackArea from ", 1097);
            let theGameName = "Fan Chart";
            if (FandokuView.currentSettings["rules_options_gameType"] == "FanDoku") {
                theGameName = "FanDoku game";
            }
            let finalScore = "<B></B>CONGRATULATIONS!  You just FINISHED the " + theGameName + " !!! Woohoo!!!</b>";
            let numMins = Math.floor(FandokuView.numSecondsElapsed / 60);
            let numSecs = FandokuView.numSecondsElapsed - 60 * numMins;
            let displayTimeMinSecs = numMins + ":" + (numSecs < 10 ? "0" : "") + numSecs;
            finalScore +=
                "<BR><BR>GAME OVER<BR><B>YOU WON!!!</B><BR><BR>Time<BR>" +
                displayTimeMinSecs +
                "<BR><BR>Ancestors Placed<BR>" +
                FandokuView.numAncestorsPlaced +
                "<BR><BR>Misses<BR>" +
                FandokuView.numMisses;
            updateFeedbackArea(finalScore);
        }
    }

    FandokuView.redraw = function () {
        // console.log("FandokuView.redraw");
        // console.log("Now theAncestors = ", FandokuView.theAncestors);
        // thePeopleList.listAll();
        recalcAndDisplayNumGens();
        redoWedgesForFanChart();
        FandokuView.myAncestorTree.draw();
        FandokuView.setupGame();
    };

    FandokuView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };
    FandokuView.showSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "block";
    };

    FandokuView.toggleSettings = function () {
        console.log("TIME to TOGGLE the SETTINGS NOW !!!", FandokuView.fanchartSettingsOptionsObject);
        console.log(FandokuView.fanchartSettingsOptionsObject.getDefaultOptions());
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
    FandokuView.prototype.load = function (id) {
        // console.log("FandokuView.prototype.load");
        var self = this;
        // FandokuView.maxAngle = 240;
        self._load(id).then(function (person) {
            // console.log("FandokuView.prototype.load : self._load(id) ");
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

            WikiTreeAPI.getAncestors(APP_ID, id, 5, [
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
                FandokuView.theAncestors = result;
                console.log("theAncestors:", FandokuView.theAncestors);
                console.log("person with which to drawTree:", person);
                for (let index = 0; index < FandokuView.theAncestors.length; index++) {
                    const element = FandokuView.theAncestors[index];
                    thePeopleList.add(FandokuView.theAncestors[index]);
                }
                FandokuView.myAhnentafel.update(person);
                self.drawTree(person);
                clearMessageBelowButtonBar();
                FandokuView.setupGame();
            });
        });
    };

    /**
     * Load more ancestors. Update existing data in place
     */
    FandokuView.prototype.loadMore = function (oldPerson) {
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
    FandokuView.prototype._load = function (id) {
        // console.log("INITIAL _load - line:118", id) ;
        let thePersonObject = WikiTreeAPI.getPerson(APP_ID, id, [
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
    FandokuView.prototype.drawTree = function (data) {
        // console.log("FandokuView.prototype.drawTree");

        if (data) {
            // console.log("(FandokuView.prototype.drawTree WITH data !)");
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
            var nodes = FandokuView.myAhnentafel.listOfAncestorsForFanChart(FandokuView.numGens2Display); // [];//this.tree.nodes(this.root);

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

        // *********************
        // ADD new nodes
        // *********************
        var nodeEnter = node
            .enter()
            .append("g")
            .attrs({
                class: "person " + this.selector,
                // id : "personG" + ancestorObject.ahnNum
            });

        // console.log("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);

        // *********************
        // Draw the person boxes (part of the ADD routine)
        // *********************
        // * This happens ONCE when a node (person) is created for the first time
        // * It will happen again IF a node has been destroyed (with the exit - remove() command) and then recreated
        // * which happens if you decrease the # of generations (by two) then go back up again
        nodeEnter
            .append("foreignObject")
            .attrs({
                id: "foreignObj4",
                width: boxWidth,
                height: 0.01, // the foreignObject won't display in Firefox if it is 0 height
                x: -boxWidth / 2,
                y: (-3 * boxHeight) / 4,
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
                if (FandokuView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                    if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                        theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                    } else {
                        numRepeatAncestors++;
                        theClr = ColourArray[numRepeatAncestors];
                        repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                    }
                }

                // console.log(ancestorObject.ahnNum, ancestorObject.person._data.Id, repeatAncestorTracker[ancestorObject.person._data.Id], WebsView.myAhnentafel.listByPerson[ ancestorObject.person._data.Id ]);

                if (thisGenNum >= 14) {
                    let photoUrl = person.getPhotoUrl(75),
                        treeUrl = window.location.pathname + "?id=" + person.getName();

                    // Use generic gender photos if there is not profile photo available
                    //console.log(
                    //     "FandokuView.currentSettings[photo_options_useSilhouette] : ",
                    //     FandokuView.currentSettings["photo_options_useSilhouette"]
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

                    let thisDisplaySetting = "none";
                    if (thisGenNum == 0) {
                        thisDisplaySetting = "block";
                    }
                    return `<div class="top-info centered" id=wedgeInfoFor${
                        ancestorObject.ahnNum
                    } style="background-color: ${theClr} ; border:0; display:${thisDisplaySetting};">
                     <div class="vital-info">
						${photoDiv}
						  <div class="name centered" id=nameDivFor${ancestorObject.ahnNum}>
						    <b>${getSettingsName(person)}</b>
						  </div>
						  <div class="birth vital centered" id=birthDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(person, "B")}</div>
						  <div class="death vital centered" id=deathDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(person, "D")}</div>
						</div>
					</div>

                    `;
                }
            });

        // Show info popup on click
        nodeEnter.on("click", function (event, ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            event.stopPropagation();
            self.personPopup(person, d3.pointer(event, self.svg.node()));
        });

        // set this variable so that we can access this tree and redraw it at any time when needed - a scoping issue solution!
        FandokuView.myAncestorTree = self;

        // ****************
        // REMOVE old nodes
        // * Just works ....
        // ****************

        node.exit().remove();
        node = nodeEnter.merge(node);

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
            // Calculate which position # (starting lower left and going clockwise around the FanDoku game) (0 is father's father's line, largest number is mother's mother's line)
            let oldPosNum = ancestorObject.ahnNum - 2 ** thisGenNum; // ORIGINAL CALCULATION - when everything was PURE FANCHART
            let thisPosNum = FandokuView.ahnNumCellNumArray[ancestorObject.ahnNum] - 2 ** thisGenNum; // REVISED CALCULATION - using Array to translate pure Ahnentafel #s to Position Numbers, in case of FanDoku mode !
            console.log("ahnNum, Array:", ancestorObject.ahnNum, FandokuView.ahnNumCellNumArray);
            console.log("value of ahnNum in Array:", FandokuView.ahnNumCellNumArray[ancestorObject.ahnNum]);
            console.log("PosNums:", oldPosNum, thisPosNum);
            thisPosNum = oldPosNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;

            // LET'S START WITH COLOURIZING THE WEDGES - IF NEEDED
            if (ancestorObject.ahnNum == 1) {
                let thisPersonsWedge = document.getElementById("ctrCirc");
                if (thisPersonsWedge) {
                    thisPersonsWedge.style.fill = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
                }
            } else {
                let thisPersonsWedge = document.getElementById("wedge" + 2 ** thisGenNum + "n" + thisPosNum);
                let theWedgeBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                if (thisPersonsWedge) {
                    thisPersonsWedge.style.fill = "white"; // getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
                } else {
                    console.log("Can't find: ", "wedge" + 2 ** thisGenNum + "n" + thisPosNum);
                }
                if (theWedgeBox) {
                    theWedgeBox.style.background = "white";
                    // getBackgroundColourFor(
                    //     thisGenNum,
                    //     thisPosNum,
                    //     ancestorObject.ahnNum
                    // );
                }
            }

            // NEXT - LET'S DO SOME POSITIONING TO GET EVERYONE IN PLACE !
            let theInfoBox = document.getElementById("wedgeInfoFor" + ancestorObject.ahnNum);
            let theNameDIV = document.getElementById("nameDivFor" + ancestorObject.ahnNum);

            if (theInfoBox) {
                // let theBounds = theInfoBox; //.getBBox();
                // console.log("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                let theNameDIVhtml = "<B>" + getFullName(d) + "</B>";
                if (FandokuView.currentSettings["showLifeSpan"] == true) {
                    theNameDIVhtml += "<br/>(" + getLifeSpan(d) + ")";
                }
                theNameDIV.innerHTML = theNameDIVhtml;

                theInfoBox.parentNode.parentNode.setAttribute("y", -100);
                if (ancestorObject.ahnNum == 1) {
                    // console.log("BOUNDS for Central Perp: ", theInfoBox.getBoundingClientRect() );
                    theInfoBox.parentNode.parentNode.setAttribute("y", -120);
                    theInfoBox.parentNode.parentNode.setAttribute("x", -125);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 250);
                } else if (ancestorObject.ahnNum > 15) {
                    theInfoBox.parentNode.parentNode.setAttribute("x", -100);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 200);
                    theInfoBox.parentNode.parentNode.setAttribute("y", -120);
                } else if (ancestorObject.ahnNum > 7) {
                    theInfoBox.parentNode.parentNode.setAttribute("x", -170);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 340);
                    theInfoBox.parentNode.parentNode.setAttribute("y", -110);
                } else if (thisGenNum == 1 && FandokuView.maxAngle == 180) {
                    theInfoBox.parentNode.parentNode.setAttribute("x", -160);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 320);
                }
            } else {
                theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                theInfoBox.parentNode.parentNode.setAttribute("width", 266);
                theInfoBox.parentNode.parentNode.setAttribute("x", -133);

                if (thisGenNum == 4) {
                    theInfoBox.parentNode.parentNode.setAttribute("y", -80);
                    if (FandokuView.maxAngle == 180) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -70);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 140);
                    }
                }
            }

            // =================================================
            // FANDOKU MODE CALCULATION HERE FOR POS NUM REVISED
            // =================================================

            // Placement Angle = the angle at which the person's name card should be placed. (in degrees, where 0 = facing due east, thus the starting point being 180, due west, with modifications)
            let placementAngle =
                180 + (180 - FandokuView.maxAngle) / 2 + (FandokuView.maxAngle / numSpotsThisGen) * (0.5 + thisPosNum);
            // Name Angle = the angle of rotation for the name card so that it is readable easily in the FanDoku game (intially, perpendicular to the spokes of the FanDoku game so that it appears horizontal-ish)
            let nameAngle = 90 + placementAngle;
            if (thisGenNum > 4) {
                // HOWEVER ... once we have Too Many cooks in the kitchen, we need to be more efficient with our space, so need to switch to a more vertical-ish approach, stand the name card on its end (now parallel to the spokes)
                nameAngle += 90;

                // AND ... if we go beyond the midpoint in this particular ring, we need to rotate it another 180 degrees so that we don't have to read upside down.  All name cards should be readable, facing inwards to the centre of the FanDoku game
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

            // OK - now that the POSITION ISSUES have been dealt with - LET'S TALK FAMILY PHOTOS !
            let photoUrl = d.getPhotoUrl(75);
            if (
                !photoUrl /*  &&
                FandokuView.currentSettings["photo_options_useSilhouette"] == true &&
                FandokuView.currentSettings["photo_options_showAllPics"] == true &&
                (FandokuView.currentSettings["photo_options_showPicsToN"] == false ||
                    (FandokuView.currentSettings["photo_options_showPicsToN"] == true &&
                        thisGenNum < FandokuView.currentSettings["photo_options_showPicsToValue"]) ) */
            ) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV) {
                    thePhotoDIV.style.display = "block";
                }
                /*  } else if (
                (!photoUrl &&
                    (FandokuView.currentSettings["photo_options_useSilhouette"] == false ||
                        FandokuView.currentSettings["photo_options_showAllPics"] == false)) ||
                (FandokuView.currentSettings["photo_options_showPicsToN"] == true &&
                    thisGenNum >= FandokuView.currentSettings["photo_options_showPicsToValue"])
            ) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV) {
                    thePhotoDIV.style.display = "none";
                } */
            } else if (ancestorObject.ahnNum > 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);

                if (thePhotoDIV /* && FandokuView.currentSettings["photo_options_showAllPics"] == true */) {
                    // Check to see if there are restrictions
                    // if (FandokuView.currentSettings["photo_options_showPicsToN"] == false) {
                    //     // show All Pics - no restrictions
                    thePhotoDIV.style.display = "block";
                    // } else {
                    //     // ONLY show Pics up to a certain Generation #
                    //     if (thisGenNum < FandokuView.currentSettings["photo_options_showPicsToValue"]) {
                    //         thePhotoDIV.style.display = "block";
                    //     } else {
                    //         thePhotoDIV.style.display = "none";
                    //     }
                    // }
                    // } else if (thePhotoDIV && FandokuView.currentSettings["photo_options_showAllPics"] == false) {
                    //     thePhotoDIV.style.display = "none";
                }
            }
            if (ancestorObject.ahnNum == 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV /*  && FandokuView.currentSettings["photo_options_showCentralPic"] == true */) {
                    // if (!photoUrl && FandokuView.currentSettings["photo_options_useSilhouette"] == false) {
                    //     thePhotoDIV.style.display = "none";
                    //     theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    // } else {
                    thePhotoDIV.style.display = "block";
                    // }
                    // } else if (thePhotoDIV && FandokuView.currentSettings["photo_options_showCentralPic"] == false) {
                    //     thePhotoDIV.style.display = "none";
                    //     theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    //     console.log("ADJUSTING the CENTRAL PERSON INFO without PIC downwards, i hope");
                }
            }

            // AND ... FINALLY, LET'S TALK DATES & PLACES:
            // e.g.  <div class="birth vital centered" id=birthDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(person, "B")}</div>
            let theBirthDIV = document.getElementById("birthDivFor" + ancestorObject.ahnNum);
            if (theBirthDIV) {
                theBirthDIV.innerHTML = getSettingsDateAndPlace(d, "B"); // remember that d = ancestorObject.person
            }
            let theDeathDIV = document.getElementById("deathDivFor" + ancestorObject.ahnNum);
            if (theDeathDIV) {
                theDeathDIV.innerHTML = getSettingsDateAndPlace(d, "D"); // remember that d = ancestorObject.person
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
            //     FandokuView.maxAngle
            // );

            // FINALLY ... we return the transformation statement back - the translation based on our Trig calculations, and the rotation based on the nameAngle
            return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
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
						    <span class="tree-links"><a href="#name=${person.getName()}&view=fanchart"><img style="width:30px; height:24px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></a></span>
						    <span class="tree-links"><a href="#name=${person.getName()}"><img style="width:45px; height:33px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fandokuTransparent.png" /></a></span>
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
        FandokuView.numGens2Display = 4;
        FandokuView.lastNumGens = 4;
        FandokuView.numGensRetrieved = 4;
        FandokuView.maxNumGens = 7;

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
        // if (FandokuView.currentSettings["date_options_dateTypes"] == "lifespan" && dateType == "B") {
        //     datePlaceString = getLifeSpan(person) + "<br/>";
        // }

        if (dateType == "B") {
            // if (FandokuView.currentSettings["date_options_showBirth"] == true) {
            thisDate = settingsStyleDate(
                person._data.BirthDate,
                "DDMMMYYYY" // FandokuView.currentSettings["date_options_dateFormat"]
            );
            if (FandokuView.currentSettings["date_options_dateTypes"] != "detailed") {
                thisDate = "";
            }

            // if (
            //     FandokuView.currentSettings["place_options_locationTypes"] == "detailed" &&
            //     FandokuView.currentSettings["place_options_showBirth"] == true
            // ) {
            thisPlace = settingsStyleLocation(
                person.getBirthLocation(),
                "Full"
                // FandokuView.currentSettings["place_options_locationFormatBD"]
            );
            // } else {
            //     thisPlace = "";
            // }

            if (thisDate > "" || thisPlace > "") {
                datePlaceString += "b. ";
            }
            // }
        } else if (dateType == "D") {
            if (person._data.DeathDate == "0000-00-00") {
                return "";
            }
            // if (FandokuView.currentSettings["date_options_showDeath"] == true) {
            thisDate = settingsStyleDate(
                person._data.DeathDate,
                "DDMMMYYYY" // FandokuView.currentSettings["date_options_dateFormat"]
            );
            // if (FandokuView.currentSettings["date_options_dateTypes"] != "detailed") {
            //     thisDate = "";
            // }
            // if (
            //     FandokuView.currentSettings["place_options_locationTypes"] == "detailed" &&
            //     FandokuView.currentSettings["place_options_showDeath"] == true
            // ) {
            thisPlace = settingsStyleLocation(
                person.getDeathLocation(),
                "Full"
                // FandokuView.currentSettings["place_options_locationFormatBD"]
            );
            // } else {
            //     thisPlace = "";
            // }
            if (thisDate > "" || thisPlace > "") {
                datePlaceString += "d. ";
            }
            // }
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

        return datePlaceString;
    }

    /**
     * Return the name as required by the Settings options.
     */
    function getSettingsName(person) {
        const maxLength = 50;

        let theName = "";

        if (FandokuView.currentSettings["name_options_firstName"] == "FirstNameAtBirth") {
            theName = person._data.FirstName;
        } else {
            theName = person._data.RealName;
        }

        if (FandokuView.currentSettings["name_options_middleName"] == true) {
            if (person._data.MiddleName > "") {
                theName += " " + person._data.MiddleName;
            }
        } else if (FandokuView.currentSettings["name_options_middleInitial"] == true) {
            if (person._data.MiddleInitial > "") {
                theName += " " + person._data.MiddleInitial;
            }
        }

        if (FandokuView.currentSettings["name_options_nickName"] == true) {
            if (person._data.Nicknames > "") {
                theName += ' "' + person._data.Nicknames + '"';
            }
        }

        if (FandokuView.currentSettings["name_options_lastName"] == "LastNameAtBirth") {
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
     * Full First Name + LNAB
     */
    function getFullName(person) {
        let FullName = "";
        if (person._data.FirstName) {
            FullName += person._data.FirstName;
            // } else if (person._data.BirthNamePrivate) {
            //     FullName += person._data.BirthNamePrivate;
        } else if (person._data.RealName) {
            FullName += person._data.RealName;
        }

        FullName += " ";

        if (person._data.MiddleName) {
            FullName += person._data.MiddleName + " ";
        } else if (person._data.MiddleInitial && person._data.MiddleInitial > "" && person._data.MiddleInitial != ".") {
            FullName += person._data.MiddleInitial + " ";
        }

        if (person._data.LastNameAtBirth) {
            FullName += person._data.LastNameAtBirth;
        }

        return FullName;
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
        // console.log("getAngleOfRotation of ", theElement.parentNode.parentNode.parentNode);
        let theBigElement = theElement.parentNode.parentNode.parentNode;
        // let theTransform = theBigElement.getPropertyOf("transform");
        // console.log("t:", theBigElement["transform"]);
        // let theTransform = theBigElement.transform.baseVal;
        // console.log("theTransform:", theTransform);
        for (let t in theTransform) {
            const transformObj = theTransform[t];
            // console.log("obj:", transformObj);
        }

        // console.log("Count: " + theTransform.length);

        return 9;
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

        // HARD CODED FOR FANDOKU
        thisColourArray = PastelsArray;

        // GET the settings that determine what the colouring should look like (if at all)
        let settingForColourBy = FandokuView.currentSettings["colour_options_colourBy"];
        if (settingForColourBy == "None") {
            return "White";
        }

        // HARD CODED FOR FANDOKU
        settingForColourBy = "Generation";

        let settingForPalette = FandokuView.currentSettings["colour_options_palette"];
        if (KeyColoursMatches[settingForPalette]) {
            thisColourArray = KeyColoursMatches[settingForPalette];
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

    FandokuView.pickMe = function (num) {
        console.log("PICK ME, PICK ME !!!!", num);
    };

    // SOUND EFFECTS
    // Sound Effect from <a href="https://pixabay.com/sound-effects/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=music&amp;utm_content=40142">Pixabay</a>
})();
