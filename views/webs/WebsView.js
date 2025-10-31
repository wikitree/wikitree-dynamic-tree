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
 * 
 * ============================
 * KEY VARIABLES AND FUNCTIONS:
 * ============================
 * 
 * WebsView.viewMode = the current mode that Ancestor Webs is in:  
 *      FULL / UNIQUE / REPEATS / INDI (Single) --> for viewing the Web of a single individual
 *      COMMON / SINGLES --> for viewing the web of multiple individuals
 * 
 * (Check out list of Static Variables below for other key variables and arrays used for tracking people and current state)
 * 
 * 
 * Tree.prototype.draw --> will DRAW the tree, and create the nodes necessary for the current viewMode
 * --> once the nodes are calculated, based on the Ahnentafel(s) of the primary person(s), then it will call ...
 * 
    * function calculateNodePositions --> which will place the nodes correctly based on 
    *      yDir (up or down from primary person(s) )
    *      generation Number
    *      ahnentafel #  
    *      Repeat or Common ancestors are positioned at the "average" x coordinate of their multiple locations, as long as they don't overlap 
    *          (except in FULL mode, where they appear as many times as needed, in regular pedigree formation)
    *      newX , newY values are assigneed to each node (newY = 0 if node is in default position based on genNum, given a natural number if needs to be explicitly placed)
    * 
    * WebsView.drawLines --> will draw / reposition  all the connecting lines between the nodes
    * 
    * Tree.prototype.drawNodes --> will draw the nodes themselves that are needed
    * 
    * Summary message is created at top, describing the viewMode, and # of repeat or common ancestors found at this # of generations
    * 
*  
* WebsView.redraw  --> will REDRAW the Ancestor Web, and is called by clicking a link in the Button Bar, but can be triggered within another function if needed
*
* node.attr("transform", function (ancestorObject)   
*       --> the _REAL_MAGIC_ happens here
*       --> when something happens (setting change for example) to change the layout, but not change the actual # of nodes
*       --> (e.g. changing display from initials to first name, or full name)
*       --> node positions are recalculated here and transformed, then drawLines redone
*
 */

import { WTapps_Utils } from "../fanChart/WTapps_Utils.js";
import { Utils } from "../shared/Utils.js";

(function () {
    const APP_ID = "AncestorWebs";
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
        // let theCookie = WTapps_Utils.getCookie("wtapps_webs");
        // condLog(theCookie);
    });

    let font4Name = "Arial";

    const PERSON_SILHOUETTE = "👤";
    const PRINTER_ICON = "&#x1F4BE;";
    const SETTINGS_GEAR = "&#x2699;";

    const FullAppName = "Ancestor Webs tree app";
    const AboutPreamble =
        "The Spider Webs app, originally created as a standalone WikiTree app, is the basis for this app.<br>The current Tree App version was renamed and created for HacktoberFest 2022<br/>and is maintained by the original author plus other WikiTree developers.";
    const AboutUpdateDate = "26 February 2025";
    const AboutAppIcon = `<img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/ancWebs.png" />`;
    const AboutOriginalAuthor = "<A target=_blank href=https://www.wikitree.com/wiki/Clarke-11007>Greg Clarke</A>";
    const AboutAdditionalProgrammers = ""; //        "<A target=_blank href=https://www.wikitree.com/wiki/Duke-5773>Jonathan Duke</A>";
    const AboutAssistants = "Rob Pavey, Riel Smit & Ian Beacall";
    const AboutLatestG2G =
        "https://www.wikitree.com/g2g/1716948/updates-safari-trails-settings-fanchart-fractal-supertree"; //"https://www.wikitree.com/g2g/1599363/recent-updates-to-the-fan-chart-tree-app-july-2023";
    const AboutHelpDoc = "https://www.wikitree.com/wiki/Space:Ancestor_Webs_app";
    const AboutOtherApps = "https://apps.wikitree.com/apps/clarke11007";

    const SVGbtnCLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="red"/>
        </svg>`;

    const SVGbtnDOWN =
        '<SVG width=18 height=14 ><polyline points="0,0 18,0 9,14 0,0" fill="blue" stroke="blue"/><polyline points="5,7 13,7" fill="none" stroke="white" stroke-width=2 /></SVG>';
    const SVGbtnUP =
        '<SVG width=18 height=14 ><polyline points="0,14 18,14 9,0 0,14" fill="red" stroke="red"/><polyline points="5,8 13,8" fill="none" stroke="white" stroke-width=2 /> <polyline points="9,3 9,13" fill="none" stroke="white" stroke-width=2 /> </SVG>';

    const SVGbtnRESIZE2 = `<svg width="16" height="16" viewBox="0 -0.5 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            class="si-glyph si-glyph-arrow-fullscreen-2">    
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <path d="M14.988,6.979 C15.547,6.979 16,6.527 16,5.97 L16,1.008 C16,0.45 15.547,-0.000999999989 14.988,-0.000999999989 L10.011,-0.000999999989 C9.452,-0.000999999989 8.999,0.45 8.999,1.008 L10.579,2.583 L8.009,5.153 L5.439,2.583 L7.019,1.008 C7.019,0.45 6.566,-0.000999999989 6.007,-0.000999999989 L1.03,-0.000999999989 C0.471,-0.000999999989 0.0179999999,0.45 0.0179999999,1.008 L0.0179999999,5.97 C0.0179999999,6.527 0.471,6.979 1.03,6.979 L2.62,5.394 L5.194,7.968 L2.598,10.565 L1.028,9 C0.471,9 0.0189999999,9.45 0.0189999999,10.006 L0.0189999999,14.952 C0.0189999999,15.507 0.471,15.958 1.028,15.958 L5.99,15.958 C6.548,15.958 6.999,15.507 6.999,14.952 L5.417,13.375 L8.009,10.783 L10.601,13.375 L9.019,14.952 C9.019,15.507 9.47,15.958 10.028,15.958 L14.99,15.958 C15.547,15.958 15.999,15.507 15.999,14.952 L15.999,10.006 C15.999,9.45 15.547,9 14.99,9 L13.42,10.565 L10.824,7.968 L13.398,5.394 L14.988,6.979 L14.988,6.979 Z" fill="#434343" class="si-glyph-fill">
                </path>
            </g>
        </svg>`;

    const SVGbtnSETTINGS = `<svg height="16" width="16" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            viewBox="0 0 512 512"  xml:space="preserve">
        <style type="text/css">
            .st0{fill:#000000;}
        </style>
        <g>
            <path class="st0" d="M499.453,210.004l-55.851-2.58c-5.102-0.23-9.608-3.395-11.546-8.103l-11.508-27.695
                c-1.937-4.728-0.997-10.145,2.455-13.914l37.668-41.332c4.718-5.188,4.546-13.205-0.421-18.182l-46.434-46.443
                c-4.986-4.967-13.003-5.159-18.2-0.412l-41.312,37.668c-3.778,3.443-9.206,4.402-13.924,2.436l-27.694-11.488
                c-4.718-1.946-7.864-6.454-8.094-11.565l-2.589-55.831C301.675,5.534,295.883,0,288.864,0h-65.708
                c-7.02,0-12.831,5.534-13.156,12.562l-2.571,55.831c-0.23,5.111-3.376,9.618-8.094,11.565L171.64,91.447
                c-4.737,1.966-10.165,1.007-13.924-2.436l-41.331-37.668c-5.198-4.746-13.215-4.564-18.201,0.412L51.769,98.198
                c-4.986,4.977-5.158,12.994-0.422,18.182l37.668,41.332c3.452,3.769,4.373,9.186,2.416,13.914l-11.469,27.695
                c-1.956,4.708-6.444,7.873-11.564,8.103l-55.832,2.58c-7.019,0.316-12.562,6.118-12.562,13.147v65.699
                c0,7.019,5.543,12.83,12.562,13.148l55.832,2.579c5.12,0.229,9.608,3.394,11.564,8.103l11.469,27.694
                c1.957,4.728,1.036,10.146-2.416,13.914l-37.668,41.313c-4.756,5.217-4.564,13.224,0.403,18.201l46.471,46.443
                c4.967,4.977,12.965,5.15,18.182,0.422l41.312-37.677c3.759-3.443,9.207-4.392,13.924-2.435l27.694,11.478
                c4.719,1.956,7.864,6.464,8.094,11.575l2.571,55.831c0.325,7.02,6.136,12.562,13.156,12.562h65.708
                c7.02,0,12.812-5.542,13.138-12.562l2.589-55.831c0.23-5.111,3.376-9.619,8.094-11.575l27.694-11.478
                c4.718-1.957,10.146-1.008,13.924,2.435l41.312,37.677c5.198,4.728,13.215,4.555,18.2-0.422l46.434-46.443
                c4.967-4.977,5.139-12.984,0.421-18.201l-37.668-41.313c-3.452-3.768-4.412-9.186-2.455-13.914l11.508-27.694
                c1.937-4.709,6.444-7.874,11.546-8.103l55.851-2.579c7.019-0.318,12.542-6.129,12.542-13.148v-65.699
                C511.995,216.122,506.472,210.32,499.453,210.004z M256.01,339.618c-46.164,0-83.622-37.438-83.622-83.612
                c0-46.184,37.458-83.622,83.622-83.622s83.602,37.438,83.602,83.622C339.612,302.179,302.174,339.618,256.01,339.618z"/>
        </g>
        </svg>`;

    const SVGbtnINFO = `<svg fill="#0000FF" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            width="16" height="16" viewBox="0 0 45.818 45.818"
            xml:space="preserve">
        <g>
            <path d="M22.909,0C10.258,0,0,10.257,0,22.908c0,12.652,10.258,22.91,22.909,22.91s22.909-10.258,22.909-22.91
                C45.818,10.257,35.561,0,22.909,0z M26.411,35.417c0,1.921-1.573,3.478-3.492,3.478c-1.92,0-3.492-1.557-3.492-3.478V20.201
                c0-1.92,1.572-3.477,3.492-3.477c1.919,0,3.492,1.556,3.492,3.477V35.417z M22.909,13.851c-2.119,0-3.837-1.718-3.837-3.836
                c0-2.12,1.718-3.836,3.837-3.836c2.118,0,3.837,1.716,3.837,3.836C26.746,12.133,25.027,13.851,22.909,13.851z"/>
        </g>
        </svg>`;
    const SVGbtnHELP = `<svg fill="#006600" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            width="16" height="16" viewBox="0 0 95.334 95.334"
            xml:space="preserve">
        <g>
            <path d="M47.667,0C21.341,0,0.001,21.341,0.001,47.667s21.34,47.667,47.666,47.667s47.666-21.341,47.666-47.667S73.993,0,47.667,0z
                M53.015,83.251c0,0.854-0.693,1.548-1.549,1.548h-7.611c-0.855,0-1.549-0.693-1.549-1.548v-6.838c0-0.854,0.693-1.548,1.549-1.548
                h7.611c0.855,0,1.549,0.693,1.549,1.548V83.251z M61.342,50.376c-4.519,3.867-8.085,6.919-8.256,16.878
                c-0.015,0.846-0.704,1.521-1.548,1.521h-7.742c-0.415,0-0.813-0.166-1.104-0.461c-0.291-0.297-0.451-0.696-0.445-1.11
                c0.229-14.946,7.059-20.792,12.046-25.06c3.817-3.269,5.366-4.755,5.366-8.772c0-6.617-5.383-12-11.999-12
                c-6.358,0-11.62,4.969-11.979,11.313c-0.047,0.819-0.726,1.46-1.546,1.46h-7.75c-0.421,0-0.822-0.17-1.114-0.473
                c-0.292-0.303-0.448-0.71-0.434-1.13c0.444-12.341,10.47-22.008,22.823-22.008c12.593,0,22.837,10.245,22.837,22.837
                C70.497,42.54,65.421,46.885,61.342,50.376z"/>
        </g>
        </svg>`;

    var ColourArray = [
        // "White",
        "#FDF5E6",
        "Gold",
        "HotPink",
        "LightCyan",
        "Yellow",
        "AntiqueWhite",
        "MediumSpringGreen",
        "Orange",
        "PaleGoldenRod",
        "Lime",
        "Moccasin",
        "PowderBlue",
        "Aquamarine",
        "Bisque",
        "Chartreuse",
        "Cornsilk",
        "DarkSalmon",
        "DeepSkyBlue",
        "Lavender",
        "LavenderBlush",
        "LightGreen",
        "LightPink",
        "LightSalmon",
        "LightSeaGreen",
        "LightSkyBlue",
        "LightSteelBlue",
        "MistyRose",
        "Red",
        "Tomato",
        "Turquoise",
        "Wheat",
        "YellowGreen",
        "DarkOrange",
        "DarkGoldenRod",
        "Pink",
        "Khaki",
        "LemonChiffon",
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
        "#C5ECCF",
        "#F0FFF0",
    ];

    var LineColourArray = [
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
        "HotPink",
        "MidnightBlue",
        "Orange",
        "BlueViolet",
        "Crimson",
        "DarkBlue",
        "DarkCyan",
        "DarkOliveGreen",
        "DarkRed",
        "DarkViolet",
        "ForestGreen",
        "Fuchsia",
        "MediumBlue",
        "RebeccaPurple",
        "SeaGreen",
        "Sienna",
        "Teal",
        "Tomato",
        "#0044CC",
        "#00B4CC",
        "#337799",
        "#5020CC",
        "#72A040",
        "#784488",
        "#8B33AA",
        "#ABCDEF",
        "#B44444",
        // "#ED3477",
    ];
    var numRepeatAncestors = 0;
    var repeatAncestorTracker = new Object();
    var repeatAncestorLineTracker = [];
    var repeatAncestorCounter = [0];

    var popupDIV =
        '<div id=popupDIV style="display:none; position:absolute; left:20px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
        '<span style="color:red; align:left"><A onclick="SuperBigFamView.removePopup();">' +
        SVGbtnCLOSE +
        "</A></span></div>";
    var connectionPodDIV =
        '<div id=connectionPodDIV style="display:none; width:fit-content; position:absolute; left:50px; top:225px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
        '<span style="color:red; align:left"><A onclick="SuperBigFamView.removePodDIV();">' +
        SVGbtnCLOSE +
        "</A></span></div>";

    popupDIV += connectionPodDIV;

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Ancestor Webs

    /** Primary Person */
    WebsView.primePerson = null;

    /** Static variable to hold unique ids for private persons **/
    WebsView.nextPrivateId = -1;

    // Static Variable to track when Repeat Ancestors begin (if at all)
    WebsView.repeatsStartAtGenNum = 99;

    /** Static variable to hold the y Direction variable (+1 for going downwards, -1 for going upwards) from Central person to Ancestors    **/
    WebsView.yDir = -1;

    /** Static variable to hold the current MODE  (Full / Unique / Repeats / Indi / MultiUnique / MultiIndi )     **/
    WebsView.viewMode = "Full";

    /** Static variable to hold the current Central Person Number **/
    WebsView.currentPrimeNum = 0;

    /** Static variable to hold the current Repeat Ancestor Number **/
    WebsView.repeatAncestorNum = -1;

    // Connection to thePeopleList you can use inside WebsView
    WebsView.PeopleList = thePeopleList;

    // Zoom variables
    WebsView.currentScaleFactor = 1;
    WebsView.lastCustomScaleFactor = 0.9;
    WebsView.zoomCounter = 0;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    WebsView.numGens2Display = 5;
    WebsView.lastNumGens = 5;
    WebsView.numGensRetrieved = 5;
    WebsView.maxNumGens = 14;
    WebsView.maxNumPrimes = 3; // maximum # of Primary Persons - i.e. - limit on # of people to add to compare Common Ancestors with each other
    WebsView.workingMaxNumGens = 4;

    /** Object to hold the Ahnentafel table for the current primary individual   */
    WebsView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    WebsView.theAncestors = [];

    /** Array to hold the list of all Prime Persons  */
    WebsView.listOfPrimePersons = [];

    /** Array to hold the list of all Repeated Ancestors  */
    WebsView.listOfRepeatAncestors = [];

    /** Array to hold the list of all the lists of all Repeated Ancestors  */
    WebsView.listOfRepeatAncestors4PrimePersons = [];

    /** Array to hold the list of all the Ahnentafel tables of all the Prime Persons  */
    WebsView.listOfAhnentafels = [];

    /** Array to hold the list of all COMMON Ancestors  */
    WebsView.listOfCommonAncestors = [];
    WebsView.listOfLegitCommonAncestors = [];
    WebsView.listOfLegitCommonIDs = [];
    WebsView.listOfLegitCommonRepeatIDs = [];
    WebsView.numOfLegitCommonAncs = -1;

    // Track which Common Ancestor to descend from in SINGLES view (multiple primaries)
    WebsView.commonAncestorNum = 0;
    // Track which Primaries to use in COMMON and SINGLES view to reach Common Ancestor(s)  (multiple primaries)
    WebsView.multiViewPrimaries = "12";

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    WebsView.currentSettings = {};

    WebsView.prototype.meta = function () {
        return {
            title: "Ancestor Webs",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    WebsView.resetSettingsDIVtoDefaults = function () {
        // condLog("Here you are inside WebsView.resetSettingsDIVtoDefaults");
        let theCookieString = JSON.stringify(WebsView.currentSettings);
        // condLog({ theCookieString });
        if (theCookieString) {
            WebsView.updateCurrentSettingsBasedOnCookieValues(theCookieString);
            //   WebsView.tweakSettingsToHideShowElements();
            //   WebsView.updateLegendTitle();
            //   WebsView.updateHighlightDescriptor();

            //   let showBadges = WebsView.currentSettings["general_options_showBadges"];
            //   if (!showBadges) {
            //       let stickerLegend = document.getElementById("stickerLegend");
            //       stickerLegend.style.display = "none";
            //       if (
            //           WebsView.currentSettings["highlight_options_showHighlights"] == false &&
            //           WebsView.currentSettings["colour_options_colourBy"] != "Location" &&
            //           WebsView.currentSettings["colour_options_colourBy"] != "Family"
            //       ) {
            //           let legendDIV = document.getElementById("legendDIV");
            //           legendDIV.style.display = "none";
            //       }
            //   }

            WTapps_Utils.setCookie("wtapps_webs", JSON.stringify(WebsView.currentSettings), {
                expires: 365,
            });
            WebsView.redraw();
        }
    };

    WebsView.redrawAfterLoadSettings = function () {
        // condLog("Here you are inside WebsView.redrawAfterLoadSettings");

        //   WebsView.tweakSettingsToHideShowElements();
        //   WebsView.updateLegendTitle();
        //   WebsView.updateHighlightDescriptor();

        //   let showBadges = WebsView.currentSettings["general_options_showBadges"];
        //   if (!showBadges) {
        //       let stickerLegend = document.getElementById("stickerLegend");
        //       stickerLegend.style.display = "none";
        //       if (
        //           WebsView.currentSettings["highlight_options_showHighlights"] == false &&
        //           WebsView.currentSettings["colour_options_colourBy"] != "Location" &&
        //           WebsView.currentSettings["colour_options_colourBy"] != "Family"
        //       ) {
        //           let legendDIV = document.getElementById("legendDIV");
        //           legendDIV.style.display = "none";
        //       }
        //   }

        WTapps_Utils.setCookie("wtapps_webs", JSON.stringify(WebsView.currentSettings), {
            expires: 365,
        });

        WebsView.redraw();
    };

    WebsView.updateCurrentSettingsBasedOnCookieValues = function (theCookieString) {
        // condLog("function: updateCurrentSettingsBasedOnCookieValues");
        // condLog(theCookieString);
        const theCookieSettings = JSON.parse(theCookieString);
        // condLog("JSON version of the settings are:", theCookieSettings);
        for (const key in theCookieSettings) {
            if (Object.hasOwnProperty.call(theCookieSettings, key)) {
                const element = theCookieSettings[key];
                let theType = "";
                if (document.getElementById(key)) {
                    theType = document.getElementById(key).type;
                    if (theType == "checkbox") {
                        document.getElementById(key).checked = element;
                    } else if (theType == "number" || theType == "text") {
                        document.getElementById(key).value = element;
                    } else if (document.getElementById(key).classList.length > 0) {
                        document.getElementById(key).value = element;
                        theType = "optionSelect";
                    } else {
                        theType = document.getElementById(key);
                    }
                } else {
                    theType = "NO HTML OBJECT";
                    let theRadioButtons = document.getElementsByName(key + "_radio");
                    if (theRadioButtons) {
                        // condLog("Looks like there might be some RADIO BUTTONS here !", theRadioButtons.length);
                        theType = "radio x " + theRadioButtons.length;
                        for (let i = 0; i < theRadioButtons.length; i++) {
                            const btn = theRadioButtons[i];
                            if (btn.value == element) {
                                btn.checked = true;
                            }
                        }
                    }
                }
                // condLog(key, element, theType);
                if (Object.hasOwnProperty.call(WebsView.currentSettings, key)) {
                    WebsView.currentSettings[key] = element;
                }
            }
        }

        // ADD SPECIAL SETTING THAT GETS MISSED OTHERWISE:
        // WebsView.currentSettings["general_options_badgeLabels_otherValue"] =
        //     theCookieSettings["general_options_badgeLabels_otherValue"];
    };

    WebsView.prototype.init = function (selector, startId) {
        // condLog("WebsView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;

        WebsView.websSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "WebsView",
            saveSettingsToCookie: true,
            /*
                IF this saveSettingsToCookie is set to TRUE, then additional functions are needed in this app

                NEEDED:  The Tree App that uses this saveSettingsToCookie MUST have these functions defined:
                        appObject.resetSettingsDIVtoDefaults
                        appObject.redrawAfterLoadSettings
                        appObject.updateCurrentSettingsBasedOnCookieValues
                        
                */
            tabs: [
                {
                    name: "general",
                    label: "General",
                    hideSelect: true,
                    subsections: [{ name: "WebsGeneral", label: "General settings" }],
                    comment: "These options apply to the Ancestor Webs overall.",
                },
                {
                    name: "names",
                    label: "Initials / Names",
                    hideSelect: true,
                    subsections: [{ name: "WebsNames", label: "NAMES format" }],
                    // comment: "These options apply to how the names will be displayed in each chart.",
                },
                {
                    name: "colours",
                    label: "Colours",
                    hideSelect: true,
                    subsections: [{ name: "Colours", label: "Colour options for repeat ancestors     " }],
                    comment: "These options apply to the colours applied to Repeat or Common Ancestors.",
                },
                {
                    name: "lines",
                    label: "Lines",
                    hideSelect: true,
                    subsections: [{ name: "Lines", label: "Connecting lines" }],
                    comment: "These options apply to the Lines connecting repeat ancestors to their descendants.",
                },
                {
                    name: "paths",
                    label: "Multi-Paths",
                    hideSelect: true,
                    subsections: [{ name: "WebsPaths", label: "Multi-Path" }],
                    comment: "These options determine how the multi-paths to a SINGLE ancestor are displayed.",
                },
            ],
            optionsGroups: [
                {
                    tab: "general",
                    subsection: "WebsGeneral",
                    category: "general",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "font",
                            type: "radio",
                            label: "Font",
                            values: [
                                { value: "Arial", text: "Arial" },
                                { value: "Mono", text: "Courier" },
                                { value: "Serif", text: "Times" },
                                { value: "Fantasy", text: "Fantasy" },
                                { value: "Script", text: "Script" },
                            ],
                            defaultValue: "Arial",
                        },
                    ],
                },

                {
                    tab: "names",
                    subsection: "WebsNames",
                    category: "name",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "sect1",
                            comment: "Multi-Ancestor Views: [Full/Unique/Repeat/Common]",
                            type: "br",
                        },

                        {
                            optionName: "multiNameFormat",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "F", text: "First Initial only" },
                                { value: "br" },
                                { value: "FL", text: "First Initial(s) + LNAB Initial" },
                                { value: "br" },
                                { value: "FML", text: "First Initial(s) + Middle Initial(s) + LNAB Initial" },
                                { value: "br" },
                                { value: "FName", text: "First Name" },
                                { value: "br" },
                                {
                                    value: "FLname",
                                    text: "Short Name (First Name + LNAB, first initial if needed)",
                                },
                                { value: "br" },
                                { value: "FnameLname", text: "Full Name (First Name + LNAB)" },
                            ],
                            defaultValue: "FML",
                        },

                        { optionName: "sect2", comment: "Single Ancestor Views:", type: "br" },

                        {
                            optionName: "indiNameFormat",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "F", text: "First Initial only" },
                                { value: "br" },
                                { value: "FL", text: "First Initial(s) + LNAB Initial" },
                                { value: "br" },
                                { value: "FML", text: "First Initial(s) + Middle Initial(s) + LNAB Initial" },
                                { value: "br" },
                                { value: "FName", text: "First Name" },
                                { value: "br" },
                                { value: "FLname", text: "Short Name (First Name + LNAB, first initial if needed)" },
                                { value: "br" },
                                { value: "FnameLname", text: "Full Name (First Name + LNAB)" },
                            ],
                            defaultValue: "FnameLname",
                        },
                    ],
                },

                {
                    tab: "colours",
                    subsection: "Colours",
                    category: "colour",
                    subcategory: "options",
                    options: [
                        { optionName: "sect1", comment: "Background Colours:", type: "br" },
                        {
                            optionName: "background",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "light", text: "light colours only" },
                                { value: "br" },
                                { value: "dark", text: "dark colours only" },
                                { value: "br" },
                                { value: "both", text: "use both light and dark" },
                                // { value: "br" },
                            ],
                            defaultValue: "light",
                        },
                        { optionName: "sect2", comment: "Font Colour(s):", type: "br" },
                        {
                            optionName: "numColours",
                            type: "radio",
                            label: "",
                            values: [
                                {
                                    value: "single",
                                    text: "use single font colour only (black on light / white on dark)",
                                },
                                { value: "br" },
                                {
                                    value: "multi",
                                    text: "use multiple colours (black, blue, brown, green / white, yellow, cyan, lime)",
                                },
                            ],
                            defaultValue: "single",
                        },

                        // {
                        //     optionName: "showCouple",
                        //     label: "Show the Ancestral Couple at the top, if descendant of both",
                        //     type: "checkbox",
                        //     defaultValue: false,
                        // },
                    ],
                },

                {
                    tab: "lines",
                    subsection: "Lines",
                    category: "line",
                    subcategory: "options",
                    options: [
                        { optionName: "sect1", comment: "Line Thickness:", type: "br" },
                        {
                            optionName: "thickness",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "1", text: "thin" },
                                // { value: "br" },
                                { value: "2", text: "medium" },
                                // { value: "br" },
                                { value: "3", text: "thick" },
                                { value: "br", text: "SVG" },
                            ],
                            defaultValue: "2",
                        },
                        { optionName: "sect2", comment: "Connecting lines to a single ancestor:", type: "br" },
                        {
                            optionName: "singleMRCA",
                            type: "radio",
                            label: "",
                            values: [
                                // { value: "br" },
                                {
                                    value: "T",
                                    text: "IMG:views/webs/websSingleMRCA-T.png",
                                    width: 100,
                                    // text: "use 90 degree vertical-horizontal lines (to minimize criss-crossing lines)",
                                },
                                {
                                    value: "V",
                                    text: "IMG:views/webs/websSingleMRCA-V.png",
                                    // text: "use direct connection (will create lines on an angle from Single Ancestor to Children)",
                                    width: 100,
                                },
                            ],
                            defaultValue: "T",
                        },

                        // {
                        //     optionName: "showCouple",
                        //     label: "Show the Ancestral Couple at the top, if descendant of both",
                        //     type: "checkbox",
                        //     defaultValue: false,
                        // },
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

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%">' +
            "&nbsp;" +
            '<font size=+2><A style="cursor:pointer;" title="Display from Primary at bottom UP towards Ancestors" onclick="WebsView.yDir = -1; WebsView.redraw();">&uarr;</A>' +
            ' <A style="cursor:pointer;"  title="Display from Primary at top DOWN to Ancestors" onclick="WebsView.yDir = 1; WebsView.redraw();">&darr;</A></font>  &nbsp;&nbsp;&nbsp; ' +
            ` <A id=menuBarOptionFull title="Display FULL Ancestor Tree of Primary" class=selectedMenuBarOption style="cursor:pointer;" onclick="WebsView.viewMode='Full'; WebsView.redraw();">FULL</A> | ` +
            ` <A id=menuBarOptionUnique  title="Display UNIQUE Ancestor Web of Primary - ancestors only appear once"  style="cursor:pointer;" onclick="WebsView.viewMode='Unique'; WebsView.redraw();">UNIQUE</A> | ` +
            ` <A id=menuBarOptionRepeats  title="Display REPEAT Ancestor Web - only repeated ancestors displayed and their connections to Primary"  style="cursor:pointer;" onclick="WebsView.viewMode='Repeats'; WebsView.redraw();">REPEAT</A> | ` +
            ` <A id=menuBarOptionIndi  title="Display SINGLE Ancestor Multi-Path Web to Primary"  style="cursor:pointer;" onclick="WebsView.viewMode='Indi'; WebsView.redraw();">SINGLE</A>  ` +
            //  ' <A onclick="WebsView.maxAngle = 180; WebsView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="center">' +
            ' <A style="cursor:pointer;"  title="Decrease # of generations displayed" onclick="WebsView.numGens2Display -=1; WebsView.redraw();">' +
            SVGbtnDOWN +
            "</A> " +
            "[ <span id=numGensInBBar>5</span> generations ]" +
            ' <A style="cursor:pointer;" title="Increase # of generations displayed" onclick="WebsView.numGens2Display +=1; WebsView.redraw();">' +
            SVGbtnUP +
            "</A> " +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="30%" align="right"><A style="cursor:pointer;" title="Add/Remove Primary individuals - up to a max of 3 primaries" onclick="WebsView.comingSoon(1);"><B>+</B>' +
            PERSON_SILHOUETTE +
            "</A> &nbsp; " +
            '  <A id="menuBarOptionCommon" title="Display COMMON Ancestors Web for multiple Primaries" style="cursor:pointer;" onclick="WebsView.comingSoon(2);">COMMON</A> |  <A id="menuBarOptionSingles" title="Display SINGLES Ancestor-in-Common Web to multiple Primaries" style="cursor:pointer;" onclick="WebsView.comingSoon(3);">SINGLES</A> ' +
            "&nbsp;&nbsp;&nbsp;&nbsp;" +
            '<A style="cursor:pointer;" title="Change Zoom level - 3 settings" onclick="WebsView.reZoom();">' +
            SVGbtnRESIZE2 +
            "</A>&nbsp;&nbsp;&nbsp;&nbsp;" +
            "  <font size=+2>" +
            ' <A style="cursor:pointer;" title="Adjust Settings"  onclick="WebsView.toggleSettings();"><font size=+2>' +
            SVGbtnSETTINGS +
            "</font></A>" +
            "&nbsp;&nbsp;" +
            "<A title='About this app' onclick=WebsView.toggleAbout();>" +
            SVGbtnINFO +
            "</A>" +
            (AboutHelpDoc > ""
                ? "&nbsp;&nbsp;<A target=helpPage title='Open up Help (free space page) for this app' href='" +
                  AboutHelpDoc +
                  "'>" +
                  SVGbtnHELP +
                  "</A>"
                : "") +
            "&nbsp;&nbsp;</td>" +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Ancestor Webs is loading ...</DIV>' +
            '<DIV id=AddNewPersonDIV class="pop-up" style="display: none;position: absolute;right: 20px;background-color: white;border: 4px solid darkgreen;border-radius: 15px;padding: 15px; text-align:center; zIndex:9999">loading ...</DIV>' +
            '<DIV id=ModeTitleArea style="text-align:center;"><H3 align=center class=marginBottomZero>Full Ancestor Tree</H3></DIV>' +
            '<DIV id=SummaryMessageArea style="text-align:center;"></DIV>';

        var aboutHTML =
            '<div id=aboutDIV class="pop-up" style="display:none; position:absolute; right:20px; background-color:aliceblue; border: solid blue 4px; border-radius: 15px; padding: 15px; zIndex:9999}">' +
            `<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><a onclick="WebsView.toggleAbout();">` +
            SVGbtnCLOSE +
            "</a></span>" +
            "<H3>About the " +
            FullAppName +
            "</H3>" +
            AboutPreamble +
            "<br>" +
            "<br>Last updated: " +
            AboutUpdateDate +
            "<br>App Icon: " +
            AboutAppIcon +
            "<br>Original Author: " +
            AboutOriginalAuthor +
            (AboutAdditionalProgrammers > "" ? "<br>Additional Programming by: " + AboutAdditionalProgrammers : "") +
            "<br>Assistance and Code borrowed from: " +
            AboutAssistants +
            "<br/>" +
            (AboutLatestG2G > "" ? "<br><A target=_blank href='" + AboutLatestG2G + "'>Latest G2G post</A>" : "") +
            (AboutHelpDoc > "" ? "<br><A target=helpPage href='" + AboutHelpDoc + "'>Free Space help page</A>" : "") +
            (AboutOtherApps > ""
                ? "<br><br><A target=helpPage href='" + AboutOtherApps + "'>Other Apps by Greg</A>"
                : "") +
            "</div>";

        var settingsHTML = "";

        settingsHTML += WebsView.websSettingsOptionsObject.createdSettingsDIV; // +

        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        let infoPanel = document.getElementById("info-panel");

        infoPanel.classList.remove("hidden");
        infoPanel.parentNode.classList.add("stickyDIV");
        infoPanel.parentNode.style.padding = "0px";

        infoPanel.innerHTML = btnBarHTML + aboutHTML + settingsHTML + popupDIV;
        container.innerHTML = "";

        $("#popupDIV").draggable();
        $("#connectionPodDIV").draggable();

        // container.innerHTML = btnBarHTML + aboutHTML + settingsHTML;

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        WebsView.toggleAbout = function () {
            let aboutDIV = document.getElementById("aboutDIV");
            let settingsDIV = document.getElementById("settingsDIV");
            if (!Utils.firstTreeAppPopUpPopped) {
                $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
                Utils.firstTreeAppPopUpPopped = true;
            }
            if (aboutDIV) {
                if (aboutDIV.style.display == "none") {
                    aboutDIV.style.display = "block";
                    aboutDIV.style.zIndex = Utils.getNextZLevel();
                    settingsDIV.style.display = "none";
                } else {
                    aboutDIV.style.display = "none";
                }
            }
        };

        WebsView.reZoom = function () {
            condLog("TIME to RE ZOOM now !", WebsView.currentScaleFactor);
            let newScaleFactor = 0.8;

            let svg = document.getElementById("websViewSVG");
            let makeFitZoomFactor = 1;
            // return;

            if (svg) {
                let g = svg.firstElementChild;
                let h = 0;
                let boundingBox = {};
                if (g && g.getBBox) {
                    boundingBox = g.getBBox();
                    h = boundingBox.height;
                    if (boundingBox) {
                        // svg.setAttribute(
                        //     "width",
                        //     `${boundingBox.width}`
                        // );
                        // svg.setAttribute(
                        //     "height",
                        //     `${boundingBox.height}`
                        // );
                        svg.setAttribute(
                            "viewBox",
                            `${boundingBox.x} ${boundingBox.y} ${boundingBox.width} ${boundingBox.height}`
                        );

                        if ((window.innerWidth * h) / boundingBox.width > window.innerHeight - 30) {
                            makeFitZoomFactor =
                                (window.innerHeight - 30) / ((window.innerWidth * h) / boundingBox.width);
                        }
                    }
                }
                // condLog(
                //     makeFitZoomFactor,
                //     SuperBigFamView.currentScaleFactor,
                //     SuperBigFamView.lastCustomScaleFactor,
                //     0.8 * makeFitZoomFactor,

                // );

                if (
                    WebsView.currentScaleFactor != 0.8 * makeFitZoomFactor &&
                    WebsView.currentScaleFactor != 1.0 * makeFitZoomFactor &&
                    WebsView.lastCustomScaleFactor != WebsView.currentScaleFactor
                ) {
                    WebsView.lastCustomScaleFactor = WebsView.currentScaleFactor;
                    WebsView.zoomCounter = 2;
                }

                WebsView.zoomCounter = (WebsView.zoomCounter + 1) % 3;

                if (WebsView.zoomCounter == 0) {
                    newScaleFactor = 0.8 * makeFitZoomFactor;
                } else if (WebsView.zoomCounter == 1) {
                    newScaleFactor = 1.0 * makeFitZoomFactor;
                } else if (WebsView.zoomCounter == 2) {
                    newScaleFactor = WebsView.lastCustomScaleFactor;
                }

                let overHead = 0;
                if ((newScaleFactor * window.innerWidth * h) / boundingBox.width < window.innerHeight) {
                    overHead = Math.max(0, window.innerHeight - newScaleFactor * window.innerHeight);
                }
                // condLog(
                //     "z",
                //     WebsView.zoomCounter,
                //     "overHead:",
                //     overHead,
                //     "newScaleFactor:",
                //     newScaleFactor,
                //     "bounding:",
                //     boundingBox.width + " x " + boundingBox.height,
                //     "in app:",

                //     newScaleFactor  * window.innerWidth +
                //         " x " +
                //         newScaleFactor * window.innerHeight
                // );

                d3.select(svg).call(
                    zoom.transform,
                    d3.zoomIdentity.translate(0, 0 - overHead).scale(newScaleFactor) /// translation used to be -h * 0.08
                );
            }
        };

        function settingsChanged(e) {
            if (WebsView.websSettingsOptionsObject.hasSettingsChanged(WebsView.currentSettings)) {
                condLog("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                condLog("NEW settings are:", WebsView.currentSettings);
                WTapps_Utils.setCookie("wtapps_webs", JSON.stringify(WebsView.currentSettings), {
                    expires: 365,
                });
                repeatAncestorTracker = new Object();
                repeatAncestorCounter = [0];
                numRepeatAncestors = 0;
                //WebsView.PeopleList = thePeopleList;
                condLog("PeopleList:", WebsView.PeopleList);
                for (const key in WebsView.PeopleList) {
                    //     if (Object.hasOwnProperty.call(object, key)) {
                    //         const element = object[key];
                    //     }
                    // }
                    // for (let index = 0; index < WebsView.PeopleList.length; index++) {
                    let element = WebsView.PeopleList[key];
                    if (element._data.theClr > "") {
                        element._data.theClr = "";
                        condLog("found and wiped out Clr for # ", key);
                    } else {
                        condLog("did NOT find theClr", element);
                    }
                    if (element._data.fontClr > "") {
                        element._data.fontClr = "";
                        condLog("found and wiped out FONT Clr for # ", key);
                    }
                }
                WebsView.myAncestorTree.draw();
            } else {
                condLog("NOTHING happened according to SETTINGS OBJ");
            }
        }

        WebsView.reallyAddPerson = function () {
            let newWikiTreeID = document.getElementById("newWikiTreeID").value;
            condLog("REALLY adding PERSON ", newWikiTreeID);
            WebsView.cancelAddNewPopup();
            loadNewPrimaryPerson(newWikiTreeID);
        };

        WebsView.reallyRemovePerson = function (num) {
            condLog("REALLY removing PERSON # num ");
            WebsView.cancelAddNewPopup();

            if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
                WebsView.viewMode = "Full";
            }
            WebsView.primePerson = thePeopleList[WebsView.listOfPrimePersons[0]];
            WebsView.myAhnentafel = WebsView.listOfAhnentafels[0];
            WebsView.currentPrimeNum = 0;

            WebsView.listOfPrimePersons.splice(num, 1);
            WebsView.listOfAhnentafels.splice(num, 1);
            WebsView.multiViewPrimaries = "01";

            // PROBABLY ALSO NEED TO REMOVE ANY LINES DRAWN FOR LAST PERSON  !!!
            const pp = WebsView.listOfPrimePersons.length;
            condLog("SHOULD HIDE PRIME PERSON # ", pp, " and ALL THEIR LINES");
            for (let index = 0; index < 2 ** (WebsView.numGens2Display - 1); index++) {
                const elementPa = document.getElementById("lineForPerson" + index + "p" + pp + "Pa");
                if (elementPa) {
                    elementPa.setAttribute("display", "none");
                }
                const elementMa = document.getElementById("lineForPerson" + index + "p" + pp + "Ma");
                if (elementMa) {
                    elementMa.setAttribute("display", "none");
                }
            }

            // WebsView.changePrimePerson(0);
            WebsView.redraw();
        };

        WebsView.addNewPersonStart = function () {
            WebsView.cancelSettings();

            let theDIV = document.getElementById("AddNewPersonDIV");
            let theX =
                '<span style="color:red; position:absolute; top:-0.2em; right:0.6em; cursor:pointer;"><a onclick="WebsView.cancelAddNewPopup();">' +
                SVGbtnCLOSE +
                "</a></span>";
            let theHTML =
                theX +
                "<H3>Enter WikiTree ID for New Person</H3><input id=newWikiTreeID>&nbsp;&nbsp;&nbsp;&nbsp;<button class='btn small btn-primary' onclick='WebsView.reallyAddPerson();'>Add New Person</button><br>";

            if (WebsView.listOfPrimePersons.length == 2) {
                theHTML +=
                    "OR<br>Swap out one primary person for another.<BR><button class='btn small btn-secondary' onclick='WebsView.reallyRemovePerson(1);'>Remove " +
                    getFirstLNAB(thePeopleList[WebsView.listOfPrimePersons[1]]) +
                    "</button><BR";
            }
            condLog("WebsView.listOfPrimePersons", WebsView.listOfPrimePersons);
            condLog("WebsView.currentPrimeNum", WebsView.currentPrimeNum);
            condLog("WebsView.primePerson", WebsView.primePerson);
            condLog("same primer person?", thePeopleList[WebsView.listOfPrimePersons[0]]);

            condLog(getFirstLNAB(thePeopleList[WebsView.listOfPrimePersons[0]]));

            if (WebsView.listOfPrimePersons.length > 2) {
                theHTML =
                    theX +
                    "<H3>Remove Person</H3>Currently this app only supports THREE primary persons.<BR><BR>Use the REMOVE PERSON button to swap out one primary person for another.<BR><button class='btn small btn-secondary' onclick='WebsView.reallyRemovePerson(1);'>Remove " +
                    getFirstLNAB(thePeopleList[WebsView.listOfPrimePersons[1]]) +
                    "</button><BR><BR><button class='btn small btn-secondary' onclick='WebsView.reallyRemovePerson(2);'>Remove " +
                    getFirstLNAB(thePeopleList[WebsView.listOfPrimePersons[2]]) +
                    "</button><br>";
                theHTML +=
                    "<BR><I>Note: To remove " +
                    getFirstLNAB(thePeopleList[WebsView.listOfPrimePersons[0]]) +
                    ",<BR>enter a new ID up top and click GO to generate a new Ancestor Webs app</I>";
            }
            if (theDIV.style.display == "block") {
                theDIV.style.display = "none";
            } else {
                theDIV.style.display = "block";
            }
            theDIV.innerHTML = theHTML;

            if (!Utils.firstTreeAppPopUpPopped) {
                $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
                Utils.firstTreeAppPopUpPopped = true;
            }
            theDIV.style.zIndex = Utils.getNextZLevel();
        };

        WebsView.cancelAddNewPopup = function () {
            // condLog("Hiding PopUp " );
            let theDIV = document.getElementById("AddNewPersonDIV");
            theDIV.style.display = "none";
        };

        WebsView.cancelSettings = function () {
            let theDIV = document.getElementById("settingsDIV");
            theDIV.style.display = "none";
        };

        WebsView.toggleSettings = function () {
            condLog("TIME to TOGGLE the SETTINGS NOW !!!", WebsView.websSettingsOptionsObject);
            condLog(WebsView.websSettingsOptionsObject.getDefaultOptions());
            let theDIV = document.getElementById("settingsDIV");
            condLog("SETTINGS ARE:", theDIV.style.display);
            if (!Utils.firstTreeAppPopUpPopped) {
                $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
                Utils.firstTreeAppPopUpPopped = true;
            }
            if (theDIV.style.display == "none") {
                theDIV.style.display = "block";
                theDIV.style.zIndex = Utils.getNextZLevel();
                let aboutDIV = document.getElementById("aboutDIV");
                aboutDIV.style.display = "none";
            } else {
                theDIV.style.display = "none";
            }
        };

        //   function updateCurrentSettingsBasedOnCookieValues(theCookieString) {
        //       const theCookieSettings = JSON.parse(theCookieString);
        //       for (const key in theCookieSettings) {
        //           if (Object.hasOwnProperty.call(theCookieSettings, key)) {
        //               const element = theCookieSettings[key];
        //               let theType = "";
        //               if (document.getElementById(key)) {
        //                   theType = document.getElementById(key).type;
        //                   if (theType == "checkbox") {
        //                       document.getElementById(key).checked = element;
        //                   } else if (theType == "number" || theType == "text") {
        //                       document.getElementById(key).value = element;
        //                   } else if (document.getElementById(key).classList.length > 0) {
        //                       document.getElementById(key).value = element;
        //                       theType = "optionSelect";
        //                   } else {
        //                       theType = document.getElementById(key);
        //                   }
        //               } else {
        //                   theType = "NO HTML OBJECT";
        //                   let theRadioButtons = document.getElementsByName(key + "_radio");
        //                   if (theRadioButtons) {
        //                       // condLog("Looks like there might be some RADIO BUTTONS here !", theRadioButtons.length);
        //                       theType = "radio x " + theRadioButtons.length;
        //                       for (let i = 0; i < theRadioButtons.length; i++) {
        //                           const btn = theRadioButtons[i];
        //                           if (btn.value == element) {
        //                               btn.checked = true;
        //                           }
        //                       }
        //                   }
        //               }
        //               // condLog(key, element, theType);
        //               if (Object.hasOwnProperty.call(WebsView.currentSettings, key)) {
        //                   WebsView.currentSettings[key] = element;
        //               }
        //           }
        //       }

        //     //   // ADD SPECIAL SETTING THAT GETS MISSED OTHERWISE:
        //     //   WebsView.currentSettings["general_options_badgeLabels_otherValue"] =
        //     //       theCookieSettings["general_options_badgeLabels_otherValue"];
        //   }

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3
            .select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("id", "websViewSVG");
        const g = svg.append("g").attrs({ id: "svgG" });
        // const linesDIV = g.append("span").attrs({id : "linesDIV"});

        // Setup zoom and pan
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 2])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
                WebsView.currentScaleFactor = event.transform.k;
            });
        svg.call(zoom);
        svg.call(zoom.transform, d3.zoomIdentity.scale(1).translate(width / 2, height / 2));

        // condLog("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the Ancestor Webs
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
            CREATE the Ancestor Webs Backdrop
            * Made of Lines connecting two ancestors together

        */

        // for (let pp = 0; pp < WebsView.maxNumPrimes; pp++) {
        //     for (let index = 0; index < 2 ** WebsView.maxNumGens; index++) {
        //         // Create  Empty Lines, hidden, to be used later
        //         // One to the person's Pa (Father) and the other to their Ma (Mother)
        //         g.append("polyline").attrs({
        //             id: "lineForPerson" + index + "p" + pp + "Pa",
        //             display: "none",
        //             points: "0,0 0,0",
        //             style: "fill:none; stroke: black; stroke-width: 1;",
        //         });
        //         g.append("polyline").attrs({
        //             id: "lineForPerson" + index + "p" + pp + "Ma",
        //             display: "none",
        //             points: "0,0 0,0",
        //             style: "fill:none; stroke: black; stroke-width: 1;",
        //         });
        //     }
        // }

        self.load(startId);

        WebsView.websSettingsOptionsObject.buildPage();
        WebsView.websSettingsOptionsObject.setActiveTab("names");
        WebsView.currentSettings = WebsView.websSettingsOptionsObject.getDefaultOptions();

        let theCookieString = WTapps_Utils.getCookie("wtapps_webs");
        if (theCookieString) {
            WebsView.updateCurrentSettingsBasedOnCookieValues(theCookieString);
        }

        // SOME minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        // let SVG4MRCAoption1 = document.getElementById("line_options_singleMRCA_SVG1");
        // let SVG4MRCAoption2 = document.getElementById("line_options_singleMRCA_SVG2");
        // // let strokeWidthSetting = WebsView.currentSettings["line_options_thickness"];
        // // condLog("bkgdClrSelector", bkgdClrSelector);

        // document.getElementById("line_options_thickness_radio1").setAttribute("onchange", "WebsView.optionElementJustChanged();");
        // document.getElementById("line_options_thickness_radio2").setAttribute("onchange", "WebsView.optionElementJustChanged();");
        // document.getElementById("line_options_thickness_radio3").setAttribute("onchange", "WebsView.optionElementJustChanged();");

        // SVG4MRCAoption1.setAttribute("width", "50px");
        // SVG4MRCAoption1.setAttribute("height", "50px");
        // SVG4MRCAoption1.style.display = "inline-block";
        // SVG4MRCAoption2.setAttribute("width", "50px");
        // SVG4MRCAoption2.setAttribute("height", "50px");
        // SVG4MRCAoption2.style.display = "inline-block";

        // SVG4MRCAoption1.innerHTML = "<rect width=20px height=20px rx=4px ry=4px x=10 y=10  />";
        // SVG4MRCAoption2.innerHTML =
        //     "<rect width=20 height=20  rx=4px ry=4px x=10 y=10 style='fill:pink;stroke:black;stroke-width:1;opacity:1' />";
    };
    // and here's that Function that does the minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
    WebsView.optionElementJustChanged = function () {
        // let strokeWidthSelector1 = document.getElementById("line_options_thickness_radio1");
        // let strokeWidthSelector2 = document.getElementById("line_options_thickness_radio2");
        // let strokeWidthSelector3 = document.getElementById("line_options_thickness_radio3");
        // let strokeWidthSetting = (strokeWidthSelector1.checked ? 1 : strokeWidthSelector3.checked ? 3 : 2);
        // let SVG4MRCAoption1 = document.getElementById("line_options_singleMRCA_SVG1");
        // let SVG4MRCAoption2 = document.getElementById("line_options_singleMRCA_SVG2");
        // condLog("optionElementJustChanged !!!!!", SVG4MRCAoption1.innerHTML, strokeWidthSetting);
        // //line_options_singleMRCA_radio1
        //   SVG4MRCAoption1.setAttribute("width", "50px");
        //   SVG4MRCAoption1.setAttribute("height", "50px");
        //   SVG4MRCAoption1.style.display = "inline-block";
        //   SVG4MRCAoption2.setAttribute("width", "50px");
        //   SVG4MRCAoption2.setAttribute("height", "50px");
        //   SVG4MRCAoption2.style.display = "inline-block";
        // //   SVG4MRCAoption1.innerHTML = "<rect width=20px height=20px rx=4px ry=4px x=10 y=10  />";
        //   SVG4MRCAoption1.innerHTML = "<img src='views/webs/tree.gif'  />";
        //   SVG4MRCAoption2.innerHTML =
        //       "<rect width=20 height=20  rx=4px ry=4px x=10 y=10 style='fill:pink;stroke:black;stroke-width:1;opacity:1' />";
    };

    function findMatchingNodeByAhnNum(ahnNum, theNodes, primeNum = 0) {
        for (let index = 0; index < theNodes.length; index++) {
            const element = theNodes[index];
            if (element.ahnNum == ahnNum && element.p == primeNum) {
                return element;
            }
        }
        // condLog("WARNING - NO NODE FOUND !!!");
        return null;
    }

    function acceptableDarkLineClr(initClr) {
        if (initClr == "LightSkyBlue" || initClr == "HotPink") {
            return initClr;
        }
        let theClr = initClr;
        const clrIdx0 = LineColourArray.indexOf(initClr);
        if (clrIdx0 > -1) {
            return initClr;
        }
        const clrIdx = ColourArray.indexOf(initClr);
        if (clrIdx > -1) {
            theClr = LineColourArray[clrIdx];
        }
        return theClr;
    }

    function isNotOnlyChild(theNode, theParentObj) {
        // let useStepsNow = false;
        // condLog("Compare",theNode, theParentObj) ;
        let theChildID = theNode.person._data.Id;
        for (let index = 0; index < theParentObj.AhnNums.length; index++) {
            const parentAhnNum = theParentObj.AhnNums[index];
            const thisChildsAhnNum = Math.floor(parentAhnNum / 2);
            const thisChildsID = WebsView.myAhnentafel.list[thisChildsAhnNum];
            if (theChildID != thisChildsID) {
                // as soon as we find one mismatch, then we know the theParentObj has a DIFFERENT child, not matching theNode person in question
                // condLog("Compare", theChildID, "vs", thisChildsID, "@", thisChildsAhnNum);
                return true; // Immediately return value of true (it is TRUE that this Node is NOT the only child of theParentObj)
            }
        }
        return false; // ELSE - if we've made it all the way through the for loop without triggering the IF condition, then it's the same person as the only child, possibly showing up multiple times in the family tree.
    }

    WebsView.logLines = function (theNodes) {
        condLog("FUNCTION: logLines() : LOG LINES:");
        for (let i = 0; i < 32; i++) {
            let p = 0;
            let elementPa = document.getElementById("lineForPerson" + i + "p" + p + "Pa");
            if (elementPa) {
                condLog(elementPa.getAttribute("id"), elementPa.getAttribute("points"));
            } else {
                condLog("NO : lineForPerson" + i + "p" + p + "Pa");
            }
        }
    };

    WebsView.drawLines = function (theNodes) {
        condLog("FUNCTION: drawLines() : DRAWING LINES stuff should go here", WebsView.listOfPrimePersons);
        condLog({ theNodes });
        let numSpotsMaxGen = 2 ** (WebsView.numGens2Display - 1);
        let processThisPrime = true;
        let alreadyConnected = [];
        let connectorsArray = [];

        let theXmultiplier = 1;
        let nameSettings = WebsView.currentSettings["name_options_multiNameFormat"];
        let bkgdColourSetting = WebsView.currentSettings["colour_options_background"];
        let fontColourSetting = WebsView.currentSettings["colour_options_numColours"];
        let strokeWidthSetting = WebsView.currentSettings["line_options_thickness"];
        let singleMRCASetting = WebsView.currentSettings["line_options_singleMRCA"];

        let strokeWidthStyle = "stroke-width: " + strokeWidthSetting + "px;";
        let defaultUseStepsValue = false;
        if (singleMRCASetting == "T") {
            defaultUseStepsValue = true;
        }

        if (WebsView.viewMode == "Singles") {
            nameSettings = WebsView.currentSettings["name_options_indiNameFormat"];
        }

        if (nameSettings == "FName") {
            theXmultiplier = 3;
        } else if (nameSettings == "FName" || nameSettings == "FLname" || nameSettings == "FnameLname") {
            theXmultiplier = 4;
        } else if (nameSettings == "FML") {
            theXmultiplier = 1.25;
        }

        if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Singles") {
            theXmultiplier = 1;
        }

        const theSVGg = document.getElementById("svgG");
        theSVGg.innerHTML = "";

        // FOR ALL VIEW MODES !!!!
        for (let pp = 0; pp < WebsView.listOfPrimePersons.length; pp++) {
            // IF dealing with a SINGLE PESON MODE - HIDE the OTHER PRIME PERSONS LINES
            if (
                WebsView.viewMode == "Full" ||
                WebsView.viewMode == "Unique" ||
                WebsView.viewMode == "Repeats" ||
                WebsView.viewMode == "Indi"
            ) {
                if (WebsView.currentPrimeNum == pp) {
                    processThisPrime = true;
                } else {
                    processThisPrime = false;
                    condLog("SHOULD HIDE PRIME PERSON # ", pp, " and ALL THEIR LINES");
                    for (let index = 0; index < 2 ** (WebsView.numGens2Display - 1); index++) {
                        const elementPa = document.getElementById("lineForPerson" + index + "p" + pp + "Pa");
                        if (elementPa) {
                            elementPa.setAttribute("display", "none");
                        }
                        const elementMa = document.getElementById("lineForPerson" + index + "p" + pp + "Ma");
                        if (elementMa) {
                            elementMa.setAttribute("display", "none");
                        }
                    }
                }
            }

            // FOR ALL VIEW MODES !!!!
            for (let thisGenNum = 0; thisGenNum < WebsView.numGens2Display - 1 && processThisPrime; thisGenNum++) {
                let numSpotsThisGen = 2 ** thisGenNum;
                let numSpotsNextGen = 2 * numSpotsThisGen;
                let nextGenNum = thisGenNum + 1;

                for (let thisPosNum = 0; thisPosNum < numSpotsThisGen; thisPosNum++) {
                    let index = 2 ** thisGenNum + thisPosNum; // a.k.a. the Ahnentafel # for this PERP
                    let theNode = findMatchingNodeByAhnNum(index, theNodes, pp);
                    let theNodePa = null;
                    let theNodeMa = null;
                    let useNodePa = true;
                    let useNodeMa = true;
                    let genNumForDisplay = thisGenNum;
                    let genNumForDisplayMa = nextGenNum;
                    let genNumForDisplayPa = nextGenNum;
                    // condLog("WE HAVE A PRIMARY PERSON: ", index)
                    if (WebsView.viewMode == "Repeats" || WebsView.viewMode == "Common") {
                        if (theNode && theNode["useThis"] == true) {
                            let tempNodePa = findMatchingNodeByAhnNum(2 * index, theNodes, pp);
                            if (tempNodePa && tempNodePa["useThis"] == true) {
                                // great we keep Pa
                            } else {
                                useNodePa = false;
                            }
                            let tempNodeMa = findMatchingNodeByAhnNum(2 * index + 1, theNodes, pp);
                            if (tempNodeMa && tempNodeMa["useThis"] == true) {
                                // great we keep Ma
                            } else {
                                useNodeMa = false;
                            }
                            if (theNode["newY"] && theNode["newY"] > 0) {
                                // condLog("Found newY : ", theNode["newY"]);

                                if (
                                    WebsView.viewMode == "Indi" ||
                                    WebsView.viewMode == "Common" ||
                                    WebsView.viewMode == "Singles"
                                ) {
                                    genNumForDisplay = theNode["newY"];
                                } else {
                                    // Unique // Repeats
                                    genNumForDisplay = 1 + 2 * theNode["newY"] - WebsView.repeatsStartAtGenNum;
                                }

                                genNumForDisplayPa = genNumForDisplay + 1;
                                genNumForDisplayMa = genNumForDisplay + 1;
                            }
                        } else if (theNode) {
                            condLog("Testing ", theNode["useThis"]);
                            useNodePa = false;
                            useNodeMa = false;
                        } else {
                            // condLog("Fail Testing ", theNode);
                            useNodePa = false;
                            useNodeMa = false;
                        }
                    } else if (
                        // WebsView.viewMode == "Indi" ||

                        WebsView.viewMode == "Unique"
                    ) {
                        if (theNode && theNode["newY"] > 0) {
                            genNumForDisplay = 1 + 2 * theNode["newY"] - WebsView.repeatsStartAtGenNum;
                        }
                    } else if (WebsView.viewMode == "Singles" || WebsView.viewMode == "Indi") {
                        if (theNode && theNode["newY"] > 0) {
                            genNumForDisplay = theNode["newY"]; //1 + 2 * theNode["newY"] - WebsView.repeatsStartAtGenNum;
                        }
                    } else if (WebsView.viewMode == "Common") {
                        condLog(
                            "WARNING: Attempted access to viewMode COMMON - but - don't think the logic should end up here ever !!!"
                        );
                        genNumForDisplay = theNode["newY"];
                    }

                    var elementPa = document.getElementById("lineForPerson" + index + "p" + pp + "Pa");
                    var elementMa = document.getElementById("lineForPerson" + index + "p" + pp + "Ma");
                    var tempSVGhtml = document.getElementById("svgG").innerHTML;
                    let needToUpdateSVGhtml = false;
                    if (!elementPa) {
                        condLog("RESET : lineForPerson" + index + "p" + pp + "Pa");
                        // WebsView.logLines();
                        tempSVGhtml +=
                            `<polyline id="` +
                            "lineForPerson" +
                            index +
                            "p" +
                            pp +
                            "Pa" +
                            `" display="block" points="0,0 200.00000000000003,-60" style="fill:none;stroke-width: 2px; stroke:Blue" />`;
                        needToUpdateSVGhtml = true;
                    }
                    if (!elementMa) {
                        tempSVGhtml +=
                            `<polyline id="` +
                            "lineForPerson" +
                            index +
                            "p" +
                            pp +
                            "Ma" +
                            `" display="block" points="0,0 200.00000000000003,-60" style="fill:none;stroke-width: 2px; stroke:HotPink" />`;
                        needToUpdateSVGhtml = true;
                    }
                    if (needToUpdateSVGhtml == true) {
                        document.getElementById("svgG").innerHTML = tempSVGhtml;
                    }

                    elementPa = document.getElementById("lineForPerson" + index + "p" + pp + "Pa");
                    elementMa = document.getElementById("lineForPerson" + index + "p" + pp + "Ma");

                    let useSteps = defaultUseStepsValue; // flag to determine whether to use STEPS to get from child to Pa  (or Ma) - versus a straight (diagonal) line to connect them
                    let useSteps4Pa = false;
                    let useSteps4Ma = false;

                    let thePaObjInRepeatList = false;
                    if (theNode && theNode.person && theNode.person._data.Father) {
                        thePaObjInRepeatList = findElementInRepeatAncestorsListByID(theNode.person._data.Father);
                    }
                    let theMaObjInRepeatList = false;
                    if (theNode && theNode.person && theNode.person._data.Mother) {
                        theMaObjInRepeatList = findElementInRepeatAncestorsListByID(theNode.person._data.Mother);
                    }
                    if (elementPa) {
                        theNodePa = findMatchingNodeByAhnNum(2 * index, theNodes, pp);
                        if (
                            useNodePa &&
                            theNodePa
                            // &&
                            // // WebsView.myAhnentafel.list[2 * index] &&
                            // thePeopleList[ tempNodePa.person._data.Id ]
                        ) {
                            elementPa.setAttribute("display", "block");
                            // condLog("WA ... PA !!!")
                            let theClr = "LightSkyBlue";

                            if (theNodePa) {
                                let thisNameNow = getNameAsPerSettings(theNodePa.person);
                                if (theNodePa.person._data.theClr > "") {
                                    condLog("theNodePa DOES EXIST", thisNameNow, theNodePa.person._data.theClr);
                                    theClr = theNodePa.person._data.theClr;
                                    // useSteps = true;
                                } else {
                                    // condLog(
                                    //     "theNodePa EXISTS - but - CAN'T FIND A CLR HERE !",
                                    //     thisNameNow
                                    // );
                                }

                                if (
                                    thePaObjInRepeatList &&
                                    thePaObjInRepeatList.AhnNums &&
                                    thePaObjInRepeatList.AhnNums.length > 1
                                ) {
                                    if (repeatAncestorLineTracker.indexOf(theNodePa.person._data.Id) == -1) {
                                        repeatAncestorLineTracker.push(theNodePa.person._data.Id);
                                    }
                                    let theLineClr =
                                        LineColourArray[
                                            repeatAncestorLineTracker.indexOf(theNodePa.person._data.Id) %
                                                LineColourArray.length
                                        ];
                                    theClr = theLineClr;
                                    //  elementPa.setAttribute("style", "fill:none;stroke:" + theLineClr);
                                } else if (
                                    theClr != "LightSkyBlue" &&
                                    theClr != "#B0B0B0" &&
                                    ColourArray.indexOf(theClr) > -1
                                ) {
                                    condLog(
                                        "NOT BLUE COLOUR: ",
                                        theClr,
                                        ColourArray.indexOf(theClr),
                                        ColourArray.length,
                                        LineColourArray.length
                                    );
                                    theClr = LineColourArray[ColourArray.indexOf(theClr)];
                                }
                            } else {
                                condLog("theNodePa.person._data.theClr DOES NOT EXIST");
                            }
                            elementPa.setAttribute(
                                "style",
                                "fill:none;" + strokeWidthStyle + " stroke:" + acceptableDarkLineClr(theClr)
                            );
                            // if (repeatAncestorTracker && )
                            // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                            if (theNodePa && theNodePa["newY"] && theNodePa["newY"] > 0) {
                                condLog("Found newY for Pa : ", theNodePa["newY"]);
                                if (
                                    WebsView.viewMode == "Indi" ||
                                    WebsView.viewMode == "Common" ||
                                    WebsView.viewMode == "Singles"
                                ) {
                                    genNumForDisplayPa = theNodePa["newY"];
                                } else {
                                    genNumForDisplayPa = 1 + 2 * theNodePa["newY"] - WebsView.repeatsStartAtGenNum;
                                }
                            }
                        } else {
                            // elementPa.setAttribute("display", "none");
                            elementPa.remove();
                        }
                    }
                    // console.log(
                    //     "After SET Attributes for " + elementPa.getAttribute("id"),
                    //     elementPa.getAttribute("points")
                    // );

                    if (elementMa) {
                        theNodeMa = findMatchingNodeByAhnNum(2 * index + 1, theNodes, pp);
                        if (
                            useNodeMa &&
                            theNodeMa
                            // WebsView.myAhnentafel.list[2 * index + 1] &&
                            // thePeopleList[WebsView.myAhnentafel.list[2 * index + 1]]
                        ) {
                            elementMa.setAttribute("display", "block");
                            let theClr = "HotPink";
                            if (theNodeMa) {
                                if (theNodeMa.person._data.theClr && theNodeMa.person._data.theClr > "") {
                                    let thisNameNow = getNameAsPerSettings(theNodeMa.person);
                                    condLog("theNodeMa DOES EXIST", thisNameNow, theNodeMa.person._data.theClr);
                                    theClr = theNodeMa.person._data.theClr;
                                    // useSteps = true;
                                }

                                if (
                                    theMaObjInRepeatList &&
                                    theMaObjInRepeatList.AhnNums &&
                                    theMaObjInRepeatList.AhnNums.length > 1
                                ) {
                                    if (repeatAncestorLineTracker.indexOf(theNodeMa.person._data.Id) == -1) {
                                        repeatAncestorLineTracker.push(theNodeMa.person._data.Id);
                                    }
                                    let theLineClr =
                                        LineColourArray[
                                            repeatAncestorLineTracker.indexOf(theNodeMa.person._data.Id) %
                                                LineColourArray.length
                                        ];
                                    theClr = theLineClr;
                                    //  elementPa.setAttribute("style", "fill:none;stroke:" + theLineClr);
                                }
                            }
                            elementMa.setAttribute(
                                "style",
                                "fill:none;" + strokeWidthStyle + " stroke:" + acceptableDarkLineClr(theClr)
                            );
                            if (theNodeMa && theNodeMa["newY"] && theNodeMa["newY"] > 0) {
                                condLog("Found newY for Ma: ", theNodeMa["newY"]);
                                if (
                                    WebsView.viewMode == "Indi" ||
                                    WebsView.viewMode == "Common" ||
                                    WebsView.viewMode == "Singles"
                                ) {
                                    genNumForDisplayMa = theNodeMa["newY"];
                                } else {
                                    genNumForDisplayMa = 1 + 2 * theNodeMa["newY"] - WebsView.repeatsStartAtGenNum;
                                }
                            }
                        } else {
                            // elementMa.setAttribute("display", "none");
                            elementMa.remove();
                        }
                    }

                    let X = 0 - numSpotsThisGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsThisGen;
                    X = 0 - numSpotsMaxGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;
                    let dX = (((numSpotsThisGen - 1) / numSpotsThisGen) * vertSpacing * numSpotsMaxGen) / 2;
                    X = 0 - dX + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;

                    if (theNode) {
                        X = theNode.newX;
                        // condLog("newX --> X  = ",X);
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
                        0 -
                        numSpotsNextGen * 20 +
                        ((thisPosNum * 2 + 1) / numSpotsNextGen) * vertSpacing * numSpotsNextGen;
                    Xma = Xpa + dX4; //0 - dX +  ((thisPosNum * 2 + 1) / numSpotsNextGen ) * vertSpacing * numSpotsNextGen;
                    if (theNodeMa) {
                        Xma = theNodeMa.newX;
                    }
                    let Yma = WebsView.yDir * vertSpacing * genNumForDisplayMa;

                    if (WebsView.viewMode == "Full" || WebsView.viewMode == "Indi" || WebsView.viewMode == "Singles") {
                        useSteps = false;
                    } else {
                        if (useNodePa && theNodePa && useNodeMa && theNodeMa) {
                            condLog(
                                "theNode - both parents using",
                                theNode,
                                useSteps,
                                defaultUseStepsValue,
                                thePaObjInRepeatList,
                                theMaObjInRepeatList
                            );
                            if (
                                theNode &&
                                theNode.person &&
                                theNode.person._data.theSiblings &&
                                theNode.person._data.theSiblings.length > 1
                            ) {
                                useSteps = true;
                            } else {
                                if (thePaObjInRepeatList.id > 0 || theMaObjInRepeatList.id > 0) {
                                    useSteps = false; // &&  defaultUseStepsValue;
                                    useSteps4Pa = isNotOnlyChild(theNode, thePaObjInRepeatList);
                                    useSteps4Ma = isNotOnlyChild(theNode, theMaObjInRepeatList);
                                } else {
                                    useSteps = false;
                                }
                            }
                            condLog("theNode - parent -->", useSteps);
                        } else if (
                            defaultUseStepsValue == true &&
                            ((useNodePa && theNodePa) || (useNodeMa && theNodeMa))
                        ) {
                            condLog(
                                "theNode - only one parent using",
                                theNode,
                                useSteps,
                                defaultUseStepsValue,
                                "pa",
                                useNodePa,
                                thePaObjInRepeatList,
                                "ma",
                                useNodeMa,
                                theMaObjInRepeatList
                            );
                            if (
                                theNode &&
                                theNode.person &&
                                theNode.person._data.theSiblings &&
                                theNode.person._data.theSiblings.length > 1
                            ) {
                                useSteps = true;
                            } else {
                                if (useNodePa && theNodePa && thePaObjInRepeatList.id > 0) {
                                    useSteps4Pa = defaultUseStepsValue;
                                    useSteps = false;
                                } else if (useNodeMa && theNodeMa && theMaObjInRepeatList.id > 0) {
                                    useSteps4Ma = defaultUseStepsValue;
                                    useSteps = false;
                                } else {
                                    useSteps = false;
                                }
                            }
                            condLog("theNode - parent -->", useSteps, useSteps4Pa, useSteps4Ma);
                        } else {
                            // condLog("theNode - NO STEPS EVER", theNode, useSteps, defaultUseStepsValue);
                            useSteps = false;
                        }
                    }

                    let isAlreadyConnected = false;
                    let thisNodesID = 0;
                    let theParentIDs = "";
                    if (theNode && theNode.person && theNode.person._data.Id) {
                        thisNodesID = theNode.person._data.Id;
                        if (
                            thePeopleList[thisNodesID]._data.Father &&
                            thePeopleList[thisNodesID]._data.Father > 0 &&
                            thePeopleList[thisNodesID]._data.Mother &&
                            thePeopleList[thisNodesID]._data.Mother > 0
                        ) {
                            theParentIDs =
                                thePeopleList[thisNodesID]._data.Father + "|" + thePeopleList[thisNodesID]._data.Mother;
                        } else if (
                            thePeopleList[thisNodesID]._data.Father &&
                            thePeopleList[thisNodesID]._data.Father > 0
                        ) {
                            theParentIDs = thePeopleList[thisNodesID]._data.Father;
                        } else if (
                            thePeopleList[thisNodesID]._data.Mother &&
                            thePeopleList[thisNodesID]._data.Mother > 0
                        ) {
                            theParentIDs = thePeopleList[thisNodesID]._data.Mother;
                        }
                    }

                    if (thisNodesID > 0 && alreadyConnected.indexOf(thisNodesID) > -1) {
                        isAlreadyConnected = true;
                    } else if (thisNodesID > 0) {
                        alreadyConnected.push(thisNodesID);
                    }

                    // condLog("Compare useSteps:", useSteps, useSteps4Pa, useSteps4Ma);
                    if (elementPa) {
                        elementPa.setAttribute(
                            "points",
                            theXmultiplier * X + "," + Y + " " + theXmultiplier * Xpa + "," + Ypa
                        );
                    }
                    // console.log( elementPa.getAttribute("id"), elementPa.getAttribute("points"));

                    if ((useSteps == true || useSteps4Pa == true) && elementPa.getAttribute("display") == "block") {
                        // NOTE:  Can't get closer than Ypa + 25

                        // THIS IS THE PLACE WHERE I THINK WE NEED TO CHECK FOR ELEMENT PA + ELEMENT MA BEING VISIBLE / USEABLE
                        // AND THEN DRAW THE CONNECTING LINE BETWEEN THEM, AND THEN DOWN TO AN ACCEPTABLE ALTITUDE, AND THEN CONNECT TO BUDDY BELOW

                        // THOUGHTS ABOUT CLR:
                        // IF Ma & Pa both exist, then colour them (interiorally at least) the same, and make the connecting lines to their child(ren) in that CLR
                        // should be a T in between them and then going down to whatever Y level - then out to the child(ren) - if a single child, ideally directly below
                        // IF Ma only or Pa only or one parent with a different non-contiguous spouse, then use the OUTLINE CLR for the CLR of their line connectingn to child(ren)

                        // For every person :  parentsIDs = PaID + | + MaID (or just PaID or just MaID)
                        // For every child of a person (in an array) [ parentsIDofChild1 , parentsIDofChild2, ...]
                        let theLineClr =
                            LineColourArray[
                                repeatAncestorLineTracker.indexOf(thePeopleList[thisNodesID]._data.thePs) %
                                    LineColourArray.length
                            ];
                        condLog(
                            "Connecting something with Ps ?? : ",
                            thisNodesID,
                            thePeopleList[thisNodesID]._data.thePs,
                            theLineClr
                        );

                        if (theLineClr == undefined) {
                            theLineClr = LineColourArray[thisNodesID % LineColourArray.length];
                        }
                        condLog(elementPa.getAttribute("id"), elementPa.getAttribute("points"));
                        if (isAlreadyConnected) {
                            // do NOTHING
                            elementPa.setAttribute(
                                "points",
                                theXmultiplier * X + "," + Y + " " + theXmultiplier * X + "," + Y
                            );
                        } else {
                            // DO ADD THE POINTS AND CONNECTOR
                            if (elementMa.getAttribute("display") == "block" && useSteps == true) {
                                // CREATE PARENTAL CONNECTOR TO JOIN BOTH
                                // NOTE:  WILL HAVE TO ADD LOGIC HERE TO ONLY DO THIS IF FIRST SIDE_BY_EACH COUPLE IN CASE OF MULTIPLE MARRIAGES
                                // theLineClr = acceptableDarkLineClr(theLineClr);
                                elementPa.setAttribute(
                                    "style",
                                    "fill:none;" + strokeWidthStyle + " stroke:" + theLineClr
                                );
                                elementMa.setAttribute(
                                    "style",
                                    "fill:none;" + strokeWidthStyle + " stroke:" + theLineClr
                                );

                                elementPa.setAttribute(
                                    "points",
                                    theXmultiplier * X +
                                        "," +
                                        Y +
                                        " " +
                                        theXmultiplier * X +
                                        "," +
                                        (Y - 20) +
                                        " " +
                                        (theXmultiplier * (Xpa + Xma)) / 2 +
                                        "," +
                                        (Y - 20) +
                                        " " +
                                        (theXmultiplier * (Xpa + Xma)) / 2 +
                                        "," +
                                        (Ypa + Yma) / 2
                                );

                                connectorsArray.push({
                                    genNum: genNumForDisplay,
                                    a: Math.min(theXmultiplier * X, (theXmultiplier * (Xpa + Xma)) / 2 + 1 / 2),
                                    b: Math.max(theXmultiplier * X, (theXmultiplier * (Xpa + Xma)) / 2 - 1 / 2),
                                    y1: Y,
                                    y2: (Ypa + Yma) / 2,
                                    dir: X - (Xpa + Xma) / 2,
                                    elem: elementPa,
                                    parentsIDs: theParentIDs,
                                    theLineClr: theLineClr,
                                });
                            } else {
                                // theLineClr = acceptableDarkLineClr(theLineClr);
                                elementPa.setAttribute(
                                    "points",
                                    theXmultiplier * X -
                                        3 +
                                        "," +
                                        Y +
                                        " " +
                                        theXmultiplier * (X - 3) +
                                        "," +
                                        (Y - 20) +
                                        " " +
                                        theXmultiplier * Xpa +
                                        "," +
                                        (Y - 20) +
                                        " " +
                                        theXmultiplier * Xpa +
                                        "," +
                                        Ypa
                                );

                                connectorsArray.push({
                                    genNum: genNumForDisplay,
                                    a: Math.min(theXmultiplier * X - 3, theXmultiplier * Xpa + 1 / 2),
                                    b: Math.max(theXmultiplier * X - 3, theXmultiplier * Xpa - 1 / 2),
                                    y1: Y,
                                    y2: Ypa,
                                    dir: X - 3 - Xpa,
                                    elem: elementPa,
                                    parentsIDs: theParentIDs,
                                    theLineClr: theLineClr,
                                });

                                if (theNodePa.person._data.Id) {
                                    if (repeatAncestorLineTracker.indexOf(theNodePa.person._data.Id) == -1) {
                                        repeatAncestorLineTracker.push(theNodePa.person._data.Id);
                                    }
                                    // let theLineClr =
                                    //     LineColourArray[
                                    //         repeatAncestorLineTracker.indexOf(theNodePa.person._data.Id) %
                                    //             LineColourArray.length
                                    //     ];
                                    // theClr = theLineClr;
                                    elementPa.setAttribute(
                                        "style",
                                        "fill:none;" + strokeWidthStyle + " stroke:" + acceptableDarkLineClr(theLineClr)
                                    );
                                }
                            }
                        }
                    }
                    // elementPa.setAttribute("y1", Y);
                    // elementPa.setAttribute("x2", Xpa);
                    // elementPa.setAttribute("y2", Ypa);
                    // console.log(elementPa.getAttribute("id"), elementPa.getAttribute("points"));

                    if (elementMa) {
                        elementMa.setAttribute(
                            "points",
                            theXmultiplier * X + "," + Y + " " + theXmultiplier * Xma + "," + Yma
                        );
                    }
                    if ((useSteps == true || useSteps4Ma == true) && elementMa.getAttribute("display") == "block") {
                        let theLineClr = "White";
                        // if (!theLineClr) {
                        theLineClr =
                            LineColourArray[
                                repeatAncestorLineTracker.indexOf(thePeopleList[thisNodesID]._data.thePs) %
                                    LineColourArray.length
                            ];
                        // }
                        // NOTE:  Can't get closer than Yma + 25
                        if (elementPa.getAttribute("display") == "block" && useSteps == true) {
                            // DO NOTHING about CONNECTORS
                            // BUT ... add the link between Ma and Pa
                            elementMa.setAttribute(
                                "points",
                                theXmultiplier * Xpa + "," + Ypa + " " + theXmultiplier * Xma + "," + Yma
                            );
                            elementMa.setAttribute("style", "fill:none;" + strokeWidthStyle + " stroke:" + theLineClr);
                        } else {
                            elementMa.setAttribute(
                                "points",
                                theXmultiplier * X +
                                    3 +
                                    "," +
                                    Y +
                                    " " +
                                    theXmultiplier * (X + 3) +
                                    "," +
                                    (Y - 20) +
                                    " " +
                                    theXmultiplier * Xma +
                                    "," +
                                    (Y - 20) +
                                    " " +
                                    Xma +
                                    "," +
                                    Yma
                            );
                            connectorsArray.push({
                                genNum: genNumForDisplay,
                                a: Math.min(theXmultiplier * X + 3, theXmultiplier * Xma + 1 / 2),
                                b: Math.max(theXmultiplier * X + 3, theXmultiplier * Xma - 1 / 2),
                                y1: Y,
                                y2: Yma,
                                dir: X + 3 - Xma,
                                elem: elementMa,
                                parentsIDs: theParentIDs,
                                theLineClr: theLineClr,
                            });
                        }
                    }
                    // elementMa.setAttribute("y1", Y);
                    // elementMa.setAttribute("x2", Xma);
                    // elementMa.setAttribute("y2", Yma);
                    // console.log(elementPa.getAttribute("id"), elementPa.getAttribute("points"));
                }
            }
        }

        condLog("in the middle of DRAWING LINES");
        WebsView.logLines();

        // NOW ... LET's SEE IF THERE ARE SOME CONNECTORS that WE NEED TO RE-DO

        if (connectorsArray.length > 0) {
            condLog("LUCY - WE HAVE SOME CONNECTING TO DO !!!!");
            connectorsArray.sort(function (c1, c2) {
                if (c1.genNum != c2.genNum) {
                    return c1.genNum - c2.genNum;
                } else if (c1.a < c2.a) {
                    return c1.a - c2.a;
                } else {
                    return c1.y1 - c2.y1;
                }
            });
            condLog({ connectorsArray });

            let yAvailableSlots = [];
            let yParentGenSlotsUsed = [];
            let thisGenNum = connectorsArray[0].genNum - 1;

            for (let c = 0; c < connectorsArray.length; c++) {
                const conn = connectorsArray[c];
                let thisParentIDsPlusGenNum = conn.parentsIDs + "|" + thisGenNum;
                condLog("FOR c=", c, " thisParentIDsPlusGenNum = ", thisParentIDsPlusGenNum);
                if (conn.genNum > thisGenNum) {
                    // start a new generation - so restart all the ySlots
                    yAvailableSlots = [conn.b];
                    thisGenNum = conn.genNum;
                    thisParentIDsPlusGenNum = conn.parentsIDs + "|" + thisGenNum;
                    condLog("FOR c=", c, " thisParentIDsPlusGenNum (recalc) = ", thisParentIDsPlusGenNum);
                    yParentGenSlotsUsed[thisParentIDsPlusGenNum] = 0;
                    condLog("yParentGenSlotsUsed:", yParentGenSlotsUsed);
                    // nothing need be changed with this connector - it's the first, so there is no conflict with it
                } else {
                    // OK - this is NOT the first connector - so - we have to see if there is room for it at its current default height
                    let availableSlotFound = -1;
                    if (yParentGenSlotsUsed[thisParentIDsPlusGenNum] > -1) {
                        availableSlotFound = yParentGenSlotsUsed[thisParentIDsPlusGenNum];
                        yAvailableSlots[availableSlotFound] = conn.b;
                        condLog(c, "USING ASSIGNED availableSlotFound = ", availableSlotFound, thisParentIDsPlusGenNum);
                    }
                    for (let ys = 0; ys < yAvailableSlots.length && availableSlotFound == -1; ys++) {
                        if (conn.a > yAvailableSlots[ys]) {
                            // this slot is now open - YAY !
                            yAvailableSlots[ys] = conn.b;
                            availableSlotFound = ys;
                            yParentGenSlotsUsed[thisParentIDsPlusGenNum] = ys;
                            condLog(c, "Found OPEN availableSlotFound = ", availableSlotFound, thisParentIDsPlusGenNum);
                        }
                    }
                    if (availableSlotFound == -1) {
                        // need to add a new slot
                        yAvailableSlots.push(conn.b);
                        availableSlotFound = yAvailableSlots.length - 1;
                        yParentGenSlotsUsed[thisParentIDsPlusGenNum] = availableSlotFound;
                        condLog(c, "NEEDS NEW availableSlotFound = ", availableSlotFound, thisParentIDsPlusGenNum);
                    }

                    condLog(
                        "Connector ",
                        c,
                        conn.theLineClr,
                        "genNum:",
                        thisGenNum,
                        " @ height : ",
                        availableSlotFound,
                        "y = ",
                        conn.y1 - 20 - 10 * availableSlotFound,
                        "x = [",
                        conn.a,
                        " .. ",
                        conn.b,
                        "]"
                    );

                    let X1 = conn.a;
                    let X2 = conn.b;

                    if (conn.dir > 0) {
                        X1 = conn.b;
                        X2 = conn.a;
                    }

                    conn.elem.setAttribute(
                        "points",
                        X1 +
                            "," +
                            conn.y1 +
                            " " +
                            X1 +
                            "," +
                            (conn.y1 - 20 - 10 * availableSlotFound) +
                            " " +
                            X2 +
                            "," +
                            (conn.y1 - 20 - 10 * availableSlotFound) +
                            " " +
                            X2 +
                            "," +
                            conn.y2
                    );
                }
            }
            condLog("yParentGenSlotsUsed:", yParentGenSlotsUsed);
        }

        // HIDE ALL THE OTHER LINES WE DON'T NEED (because they are too high / too many generations above us)
        for (let pp = 0; pp < WebsView.listOfPrimePersons.length; pp++) {
            for (let index = 2 ** (WebsView.numGens2Display - 1); index < 2 ** (WebsView.maxNumGens - 1); index++) {
                const elementPa = document.getElementById("lineForPerson" + index + "p" + pp + "Pa");
                if (elementPa) {
                    // elementPa.setAttribute("display", "none");
                    elementPa.remove();
                }
                const elementMa = document.getElementById("lineForPerson" + index + "p" + pp + "Ma");
                if (elementMa) {
                    // elementMa.setAttribute("display", "none");
                    elementMa.remove();
                }
            }
        }

        condLog("done DRAWING LINES");
        WebsView.logLines();
    };

    WebsView.comingSoon = function (num) {
        if (num == 1) {
            WebsView.addNewPersonStart();
            // showTemporaryMessageBelowButtonBar(
            //     "WHEN this feature is implemented,<BR>it will allow you to ADD additional starting WikiTree IDs<BR>with which to find and compare common ancestors."
            // );
        } else if (num == 2) {
            if (WebsView.listOfPrimePersons.length < 2) {
                showTemporaryMessageBelowButtonBar(
                    "WHEN there is more than one Starting Person, this feature will be active,<BR> and it will show a Web of all the Ancestors<BR>that are COMMON to the people entered."
                );
            } else {
                showTemporaryMessageBelowButtonBar("Please be patient while searching for COMMON Ancestors ...");
                // showTemporaryMessageBelowButtonBar("DISPLAY COMMON NOW");
                WebsView.viewMode = "Common";
                WebsView.redraw();
            }
        } else if (num == 3) {
            if (WebsView.listOfPrimePersons.length < 2) {
                showTemporaryMessageBelowButtonBar(
                    "WHEN there is more than one Starting Person, this feature will be active,<BR>and it will show the Multi-Path web from a specific Ancestor to each of the people descendant."
                );
            } else {
                showTemporaryMessageBelowButtonBar("DISPLAY SINGLES NOW");
                WebsView.viewMode = "Singles";
                WebsView.redraw();
            }
        }
    };
    // Flash a message in the WarningMessageBelowButtonBar DIV
    function flashWarningMessageBelowButtonBar(theMessage) {
        // condLog(theMessage);
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
        // condLog("numGensSpan:", numGensSpan);
        if (WebsView.numGens2Display > WebsView.numGensRetrieved) {
            loadAncestorsAtLevel(WebsView.numGens2Display);
            WebsView.numGensRetrieved = WebsView.numGens2Display;
        } else {
            condLog(
                "Did NOT NEED TO go to loadAncestorsAt Level",
                WebsView.numGens2Display,
                WebsView.numGensRetrieved,
                WebsView.numGens2Display > WebsView.numGensRetrieved
            );
        }
    }

    /*  OK - HERE'S THE SCOOP
         - IF NEWLEVEL < 10, (AND WE ACTUALLY NEED TO LOAD NEWLEVEL)
         --> USE PRIMENUM , GETPEOPLE, ANCESTORS=NEWLEVEL, MINGENERATION=NEWLEVEL

         ELSE - IF - NEWLEVEL >= 10 (AND WE NEED IT ..)
         -- FIND ALL PEEPS @ LEVEL 9
         --> USE GETPEOPLE USING LEVEL9PEEPSLIST , ANCESTORS = NEWLEVEL - 9; MINGENERATION=NEWLEVEL - 9


         ADD LOGIC TO REDO QUERY IF NEEDEED BECAUSE OF 1000 LIMIT

    // END OF SCOOP
   */

    function loadAncestorsAtLevel(newLevel, startingNum = 0) {
        condLog("Need to load MORE peeps from Generation ", newLevel, "numGensRetrieved", WebsView.numGensRetrieved);
        // let theListOfIDs = WebsView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        let theListOfIDs = [WebsView.myAhnentafel.list[1]];
        let loadingTD = document.getElementById("loadingTD");
        if (newLevel > 8) {
            theListOfIDs = WebsView.myAhnentafel.listOfAncestorsAtLevel(6);
        }

        // WebsView.myAhnentafel.listOfAncestorsAtLevel(newLevel);

        if (WebsView.listOfAhnentafels.length > 1) {
            for (let aa = 0; aa < WebsView.listOfAhnentafels.length; aa++) {
                if (aa == WebsView.currentPrimeNum) {
                    // do nothing - the list of IDs is already in theListOfIDs
                } else {
                    const thisAhnentafel = WebsView.listOfAhnentafels[aa];
                    if (newLevel > 8) {
                        let thisList = thisAhnentafel.listOfAncestorsAtLevel(6);
                        theListOfIDs = theListOfIDs.concat(thisList);
                    } else {
                        theListOfIDs.push(thisAhnentafel.list[1]);
                    }
                }
            }
            // theListOfIDs.sort();
        }
        // let prevItem = "";
        // for (let li = theListOfIDs.length - 1; li >= 0 ; li--) {
        //     const thisItem = theListOfIDs[li];
        //     if (thisItem == prevItem) {
        //         theListOfIDs.splice(li, 1);
        //     } else {
        //         prevItem = thisItem;
        //     }
        // }
        let theOptions = {
            ancestors: newLevel,
            minGeneration: newLevel,
            start: startingNum,
        };
        if (newLevel > 8) {
            theOptions = {
                ancestors: newLevel - 6,
                minGeneration: newLevel - 6,
                start: startingNum,
                // limit: theListOfIDs.length * (2 ** (newLevel - 6))
            };
        }

        condLog("theListOfIDs", theListOfIDs, "theOptions:", theOptions);
        if (theListOfIDs.length == 0) {
            condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS: theListOfIDs.length == 0");
            clearMessageBelowButtonBar();
            WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            WebsView.numGensRetrieved++;
            WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);
            condLog("IF list.length == 0, Need to adjust WebsView.workingMaxNumGens -> ", WebsView.workingMaxNumGens);
        } else {
            condLog("Need to start call to GetPeople", theOptions, theListOfIDs.length + " peeps");
            loadingTD.innerHTML = "loading";
            WikiTreeAPI.getPeople(
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
                ],
                theOptions
            ).then(function (result) {
                if (result) {
                    WebsView.theAncestors = result[2];

                    condLog("theAncestors:", WebsView.theAncestors, Object.keys(result).length);
                    // condLog("person with which to drawTree:", person);
                    let numPeepsAdded = 0;
                    for (const index in WebsView.theAncestors) {
                        numPeepsAdded++;
                        thePeopleList.add(WebsView.theAncestors[index]);
                    }
                    // console.log("ADDED ", numPeepsAdded, "PEEPS added inside loadAncestorsAtLevel", newLevel);
                    // console.log(result[0]);//.status, result[0].status.startsWith("Maximum number of profiles"));

                    WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors

                    if (numPeepsAdded >= 1000) {
                        // we have likely hit our limit - or - been right bang on  - but who would know, so we'll have to assume we need to do this again!
                        loadAncestorsAtLevel(newLevel, startingNum + numPeepsAdded);
                    } else {
                        WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);
                        condLog(
                            "IF .THEN ... Need to adjust WebsView.workingMaxNumGens -> ",
                            WebsView.workingMaxNumGens
                        );
                        clearMessageBelowButtonBar();
                        loadingTD.innerHTML = "&nbsp;";
                    }
                } else {
                    condLog("Need to know there is NO RESULT !");
                }
            });
        }
    }

    WebsView.changePrimePerson = function (forcePrime = -1) {
        let rootPersonSelector = document.getElementById("rootPersonSelector");
        let newPersonNum = 0;
        if (rootPersonSelector) {
            newPersonNum = rootPersonSelector.value;
        }
        if (forcePrime > -1) {
            newPersonNum = forcePrime;
        }
        condLog("CHANGE THE PRIME PERSON HERE!", newPersonNum);
        WebsView.currentPrimeNum = newPersonNum;

        // for (let index = 0; index < WebsView.theAncestors.length; index++) {
        //     thePeopleList.add(WebsView.theAncestors[index]);
        // }

        let thisNewID = WebsView.listOfPrimePersons[newPersonNum];
        let thePerson = thePeopleList[thisNewID];
        WebsView.listOfRepeatAncestors = WebsView.listOfAhnentafels[newPersonNum].listOfRepeatAncestors(
            WebsView.numGens2Display
        );
        WebsView.repeatAncestorNum = Math.max(WebsView.repeatAncestorNum, WebsView.listOfRepeatAncestors.length - 1);
        WebsView.myAhnentafel.update(thePerson);
        WebsView.primePerson = thePerson;
        WebsView.myAncestorTree.draw();
    };

    function redoRootSelector() {
        condLog("REDO THE ROOT SELECTOR !!!", WebsView.primePerson);
        let rootPersonName = getFLname(WebsView.primePerson);

        let rootPersonSelector =
            "<select id=rootPersonSelector  style='cursor:pointer;' onchange='WebsView.changePrimePerson();' class=selectSimpleDropDown id=rootPersonSelector>";
        for (let pp = 0; pp < WebsView.listOfPrimePersons.length; pp++) {
            const ppID = WebsView.listOfPrimePersons[pp];
            let isSelected = "";
            if (pp == WebsView.currentPrimeNum) {
                isSelected = " selected ";
            }
            rootPersonSelector +=
                "<option value=" + pp + isSelected + ">" + getFirstLNAB(thePeopleList[ppID]) + "</option>";
        }
        rootPersonSelector += "</select>";

        if (WebsView.viewMode == "Full") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Full Ancestor Pedigree Tree for " +
                rootPersonSelector +
                "</div></H3>";
        } else if (WebsView.viewMode == "Unique") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Unique Ancestors Web for " +
                rootPersonSelector +
                "</div></H3>" +
                "Each ancestor appears exactly once, connected by multiple lines, if necessary.";
        } else if (WebsView.viewMode == "Repeats") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Repeat Ancestors Web for  " +
                rootPersonSelector +
                "</div></H3>" +
                "Only ancestors who appear more than once will be shown, connected by multiple lines to the web.";
        } else if (WebsView.viewMode == "Common") {
            let allNames = "";
            let allNamesSelector = "";
            for (let n = 0; n < WebsView.listOfPrimePersons.length; n++) {
                if (allNames > "") {
                    allNames += " & ";
                }
                allNames += WebsView.PeopleList[WebsView.listOfPrimePersons[n]].getDisplayName();
            }

            allNamesSelector = allNames;

            if (WebsView.listOfPrimePersons.length == 3) {
                allNamesSelector =
                    '<select id=MultiAncestorSelectorCommon onchange="WebsView.switchCommonsFor(2);"> ' +
                    "<option " +
                    (WebsView.multiViewPrimaries == "012" ? "selected" : "") +
                    " value='012'>" +
                    allNames +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "01" ? "selected" : "") +
                    " value='01'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "12" ? "selected" : "") +
                    " value='12'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "02" ? "selected" : "") +
                    " value='02'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "</select>";
            } else {
                WebsView.multiViewPrimaries = "01";
            }

            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Common Ancestors Web for<br/>" +
                allNamesSelector +
                "</H3>" +
                "Only ancestors who appear in the family trees of all starting individuals will be shown, connected by multiple lines to the web.";
        } else if (WebsView.viewMode == "Singles") {
            let allNames = "";
            let allNamesSelector = "";
            for (let n = 0; n < WebsView.listOfPrimePersons.length; n++) {
                if (allNames > "") {
                    allNames += " & ";
                }
                allNames += WebsView.PeopleList[WebsView.listOfPrimePersons[n]].getDisplayName();
            }

            allNamesSelector = allNames;

            if (WebsView.listOfPrimePersons.length == 3) {
                allNamesSelector =
                    '<select id=MultiAncestorSelectorSingles onchange="WebsView.switchCommonAnc(1);">' +
                    "<option " +
                    (WebsView.multiViewPrimaries == "012" ? "selected" : "") +
                    " value='012'>" +
                    allNames +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "01" ? "selected" : "") +
                    " value='01'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "12" ? "selected" : "") +
                    " value='12'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "02" ? "selected" : "") +
                    " value='02'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "</select>";
            } else {
                WebsView.multiViewPrimaries = "01";
            }

            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Ancestor-in-Common Web of<br/>" +
                allNamesSelector +
                "</H3>" +
                "Only ancestors who appear in the family trees of all starting individuals will be shown, connected by multiple lines to the web.";

            if (WebsView.yDir == 1) {
                condLog("ADDING CommonAncNum yDIR == 1");
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor-in-Common Web<br/>to <div style='display:inline-block' id=IndiSingleName>" +
                    allNamesSelector +
                    "</div><BR/>from <div style='display:inline-block' id=CommonAncName>No One</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=CommonAncNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            } else {
                condLog("ADDING CommonAncNum yDIR != 1");
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor-in-Common Web " +
                    "<br/>from <div style='display:inline-block' id=CommonAncName>No One</div>" +
                    "<BR>to <div style='display:inline-block' id=IndiSingleName>" +
                    allNamesSelector +
                    "</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=CommonAncNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            }
        } else if (WebsView.viewMode == "Indi") {
            if (WebsView.yDir == 1) {
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor Multi-Path Web to <div style='display:inline-block' id=IndiSingleName>" +
                    rootPersonSelector +
                    "</div><BR>from <div style='display:inline-block' id=IndiRepeaterName>No One</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=IndiRepeaterNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            } else {
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor Multi-Path Web " +
                    "from <div style='display:inline-block' id=IndiRepeaterName>No One</div>" +
                    "<BR>to <div style='display:inline-block' id=IndiSingleName>" +
                    rootPersonSelector +
                    "</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=IndiRepeaterNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            }
        }
    }

    /** FUNCTION used to force a redraw of the Ancestor Webs, used when called from Button Bar after a parameter has been changed */

    WebsView.clearAll = function () {
        condLog("FUNCTION: clearAll()");
        WebsView.myAncestorTree.drawNodes([]);
        condLog("calling drawLines from clearAll() ");
        WebsView.drawLines([]);
        WebsView.logLines();
    };

    WebsView.redraw = function () {
        condLog("WebsView.multiViewPrimaries = ", WebsView.multiViewPrimaries);
        condLog("WebsView.redraw");
        // condLog("Now theAncestors = ", WebsView.theAncestors);
        // thePeopleList.listAll();
        // if (WebsView.viewMode == 0) {
        //     WebsView.viewMode = "Full";
        // } else if (WebsView.viewMode == 1) {
        //     WebsView.viewMode = "Unique";
        // } else if (WebsView.viewMode == 2) {
        //     WebsView.viewMode = "Indi";
        //     WebsView.repeatAncestorNum = 1;
        // }

        // ADJUST the option that has the selectedMenuBarOption class attached to it (yellow highlight):
        let allOptionIDs = [
            "menuBarOptionFull",
            "menuBarOptionUnique",
            "menuBarOptionRepeats",
            "menuBarOptionIndi",
            "menuBarOptionCommon",
            "menuBarOptionSingles",
        ];

        for (let index = 0; index < allOptionIDs.length; index++) {
            const element = allOptionIDs[index];
            document.getElementById(element).classList.remove("selectedMenuBarOption");
        }
        let toBeSelectedID = document.getElementById("menuBarOption" + WebsView.viewMode);
        if (toBeSelectedID) {
            toBeSelectedID.classList.add("selectedMenuBarOption");
        }

        if (WebsView.repeatAncestorNum < 1) {
            WebsView.repeatAncestorNum = WebsView.listOfRepeatAncestors.length;
        } else if (WebsView.repeatAncestorNum > WebsView.listOfRepeatAncestors.length) {
            WebsView.repeatAncestorNum = 1;
        }
        if (WebsView.listOfRepeatAncestors.length == 0) {
            WebsView.repeatAncestorNum = 0;
        }

        if (WebsView.commonAncestorNum < 1) {
            WebsView.commonAncestorNum = WebsView.listOfLegitCommonAncestors.length;
        } else if (WebsView.commonAncestorNum > WebsView.listOfLegitCommonAncestors.length) {
            WebsView.commonAncestorNum = 1;
        }
        if (WebsView.listOfLegitCommonAncestors.length == 0) {
            WebsView.commonAncestorNum = 0;
        }

        let rootPersonName = getFLname(WebsView.primePerson);
        condLog(
            "IN the redraw: rootPersonName = ",
            rootPersonName,
            "currentPrimeNum = ",
            WebsView.currentPrimeNum,
            "from",
            WebsView.listOfPrimePersons,
            WebsView.myAhnentafel
        );

        // DOUBLE CHECK that MY AHNENTAFEL IS CORRECT - and if not so - CORRECT IT !!!
        if (WebsView.listOfPrimePersons[WebsView.currentPrimeNum] != WebsView.myAhnentafel.list[1]) {
            condLog("REALLY NEED TO CHANGE THE MY AHNENTAFEL !!!");
            WebsView.myAhnentafel = WebsView.listOfAhnentafels[WebsView.currentPrimeNum];
        }
        let rootPersonSelector =
            "<select id=rootPersonSelector  style='cursor:pointer;' onchange='WebsView.changePrimePerson();' class=selectSimpleDropDown id=rootPersonSelector>";
        for (let pp = 0; pp < WebsView.listOfPrimePersons.length; pp++) {
            const ppID = WebsView.listOfPrimePersons[pp];
            let isSelected = "";
            if (pp == WebsView.currentPrimeNum) {
                isSelected = " selected ";
            }
            rootPersonSelector +=
                "<option value=" + pp + isSelected + ">" + getFirstLNAB(thePeopleList[ppID]) + "</option>";
        }
        rootPersonSelector += "</select>";

        if (WebsView.viewMode == "Full") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Full Ancestor Pedigree Tree for " +
                rootPersonSelector +
                "</div></H3>";
        } else if (WebsView.viewMode == "Unique") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Unique Ancestors Web for " +
                rootPersonSelector +
                "</div></H3>" +
                "Each ancestor appears exactly once, connected by multiple lines, if necessary.";
        } else if (WebsView.viewMode == "Repeats") {
            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Repeat Ancestors Web for  " +
                rootPersonSelector +
                "</div></H3>" +
                "Only ancestors who appear more than once will be shown, connected by multiple lines to the web.";
        } else if (WebsView.viewMode == "Common") {
            let allNames = "";
            for (let n = 0; n < WebsView.listOfPrimePersons.length; n++) {
                if (allNames > "") {
                    allNames += " & ";
                }
                allNames += WebsView.PeopleList[WebsView.listOfPrimePersons[n]].getDisplayName();
            }

            let allNamesSelector = allNames;

            if (WebsView.listOfPrimePersons.length == 3) {
                allNamesSelector =
                    '<select id=MultiAncestorSelectorCommon onchange="WebsView.switchCommonsFor(2);">' +
                    "<option " +
                    (WebsView.multiViewPrimaries == "012" ? "selected" : "") +
                    " value='012'>" +
                    allNames +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "01" ? "selected" : "") +
                    " value='01'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "12" ? "selected" : "") +
                    " value='12'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "02" ? "selected" : "") +
                    " value='02'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "</select>";
            } else {
                WebsView.multiViewPrimaries = "01";
            }

            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Common Ancestors Web for<br/>" +
                allNamesSelector +
                "</H3>" +
                "Only ancestors who appear in the family trees of all starting individuals will be shown, connected by multiple lines to the web.";
        } else if (WebsView.viewMode == "Singles") {
            let allNames = "";
            for (let n = 0; n < WebsView.listOfPrimePersons.length; n++) {
                if (allNames > "") {
                    allNames += " & ";
                }
                allNames += WebsView.PeopleList[WebsView.listOfPrimePersons[n]].getDisplayName();
            }

            let allNamesSelector = allNames;

            if (WebsView.listOfPrimePersons.length == 3) {
                allNamesSelector =
                    '<select id=MultiAncestorSelectorSingles onchange="WebsView.switchCommonAnc(1);">' +
                    "<option " +
                    (WebsView.multiViewPrimaries == "012" ? "selected" : "") +
                    " value='012'>" +
                    allNames +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "01" ? "selected" : "") +
                    " value='01'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "12" ? "selected" : "") +
                    " value='12'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[1]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "<option " +
                    (WebsView.multiViewPrimaries == "02" ? "selected" : "") +
                    " value='02'>" +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[0]].getDisplayName() +
                    " & " +
                    WebsView.PeopleList[WebsView.listOfPrimePersons[2]].getDisplayName() +
                    "</option>" +
                    "</select>";
            } else {
                WebsView.multiViewPrimaries = "01";
            }

            document.getElementById("ModeTitleArea").innerHTML =
                "<H3 class='marginBottomZero' align=center>Ancestor-in-Common Web of<br/>" +
                allNames +
                "</div></H3>" +
                "Only ancestors who appear in the family trees of all starting individuals will be shown, connected by multiple lines to the web.";

            if (WebsView.yDir == 1) {
                condLog("ADDING CommonAncNum yDIR == 1");
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor-in-Common Web<br/>to <div style='display:inline-block' id=IndiSingleName>" +
                    allNamesSelector +
                    "</div><BR/>from <div style='display:inline-block' id=CommonAncName>No One</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=CommonAncNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            } else {
                condLog("ADDING CommonAncNum yDIR != 1");
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor-in-Common Web " +
                    "<br/>from <div style='display:inline-block' id=CommonAncName>No One</div>" +
                    "<BR>to <div style='display:inline-block' id=IndiSingleName>" +
                    allNamesSelector +
                    "</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=CommonAncNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.commonAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            }
        } else if (WebsView.viewMode == "Indi") {
            if (WebsView.yDir == 1) {
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor Multi-Path Web to <div style='display:inline-block' id=IndiSingleName>" +
                    rootPersonSelector +
                    "</div><BR>from <div style='display:inline-block' id=IndiRepeaterName>No One</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=IndiRepeaterNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            } else {
                document.getElementById("ModeTitleArea").innerHTML =
                    "<H3 class='marginBottomZero'>Ancestor Multi-Path Web " +
                    "from <div style='display:inline-block' id=IndiRepeaterName>No One</div>" +
                    "<BR>to <div style='display:inline-block' id=IndiSingleName>" +
                    rootPersonSelector +
                    "</div></H3>" +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum--; WebsView.redraw();'><font size=+2>&larr;</font></A>" +
                    " [ <span id=IndiRepeaterNum>1 of 6</span> ] " +
                    "<A style='cursor:pointer;' onclick='WebsView.repeatAncestorNum++; WebsView.redraw();'><font size=+2>&rarr;</font></A>";
            }
        }
        recalcAndDisplayNumGens();
        // redoWedgesForFanChart();
        WebsView.myAncestorTree.draw();
    };

    /**
     * Load and display a person
     */
    WebsView.prototype.load = function (id) {
        // condLog("WebsView.prototype.load");
        var self = this;
        self._load(id).then(function (person) {
            WebsView.primePerson = person;
            WebsView.listOfPrimePersons = [person._data.Id];
            // condLog("WebsView.prototype.load : self._load(id) ");
            person._data.AhnNum = 1;
            thePeopleList.add(person);
            thePeopleList.listAll();

            if (person.children && person.children.length > 0) {
                for (let index = 0; index < person.children.length; index++) {
                    // condLog(".load person Child # " + index, person.children[index]);
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
                // condLog("Did not go through KIDS loop: ", person, person.depth);
            }
            // condLog(".load person:",person);

            // WikiTreeAPI.getAncestors(APP_ID ,id, 5, [
            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                id,
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
                { ancestors: 5 }
            ).then(function (result) {
                WebsView.theAncestors = result[2];
                condLog("getPeople RESULT:", result);
                condLog("FOUND id = ", result[1][id].Id);
                condLog("person with which to drawTree:", person);
                // for (let index = 0; index < WebsView.theAncestors.length; index++) {
                for (const ancID in WebsView.theAncestors) {
                    let thePerson = WebsView.theAncestors[ancID];
                    if (thePerson.Id < 0) {
                        thePerson.Id = 100 - thePerson.Id;
                        thePerson["Name"] = "Private-" + thePerson.Id;
                        thePerson["FirstName"] = "Private";
                        thePerson["LastNameAtBirth"] = "TBD!";
                    }
                    if (thePerson.Mother < 0) {
                        thePerson.Mother = 100 - thePerson.Mother;
                    }
                    if (thePerson.Father < 0) {
                        thePerson.Father = 100 - thePerson.Father;
                    }
                    thePeopleList.add(thePerson);
                }

                person._data.Father = WebsView.theAncestors[id].Father;
                person._data.Mother = WebsView.theAncestors[id].Mother;

                // PUT everyone into the Ahnentafel order ... which will include the private TBD! peeps if any
                WebsView.myAhnentafel.update(person);

                let relativeName = [
                    "kid",
                    "self",
                    "Father",
                    "Mother",
                    "Grandfather",
                    "Grandmother",
                    "Grandfather",
                    "Grandmother",
                    "Great-Grandfather",
                    "Great-Grandmother",
                    "Great-Grandfather",
                    "Great-Grandmother",
                    "Great-Grandfather",
                    "Great-Grandmother",
                    "Great-Grandfather",
                    "Great-Grandmother",
                ];

                // GO through the first chunk  (up to great-grandparents) - and swap out TBD! for their relaionship names
                for (var a = 1; a < 16; a++) {
                    let thisPeep = thePeopleList[WebsView.myAhnentafel.list[a]];
                    // condLog("Peep ",a, thisPeep);
                    if (thisPeep && thisPeep._data["LastNameAtBirth"] == "TBD!") {
                        thisPeep._data["LastNameAtBirth"] = relativeName[a];
                        if (a % 2 == 0) {
                            thisPeep._data["Gender"] = "Male";
                        } else {
                            thisPeep._data["Gender"] = "Female";
                        }
                        // condLog("FOUND a TBD!", thisPeep);
                    }
                }

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
        // condLog("loadMore - line:94", oldPerson) ;
        return self._load(oldPerson.getId()).then(function (newPerson) {
            var mother = newPerson.getMother(),
                father = newPerson.getFather();

            if (mother) {
                // condLog("mother:", mother);
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
        // condLog("INITIAL _load - line:118", id) ;
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
        ]);
        // condLog("_load PersonObj:",thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    WebsView.prototype.drawTree = function (data) {
        condLog("WebsView.prototype.drawTree");

        if (data) {
            // condLog("(WebsView.prototype.drawTree WITH data !)");
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
        // condLog("Create TREE var");
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

    WebsView.switchRepeatAnc = function () {
        let newRepeatNum = 1.0 * document.getElementById("selectRepeatAnc4IndiSELECT").value + 1;
        condLog("SWITCHING to ", newRepeatNum);
        WebsView.repeatAncestorNum = newRepeatNum;
        WebsView.redraw();
    };

    WebsView.switchCommonAnc = function (whichType = 1) {
        condLog("WebsView.switchCommonAnc", WebsView.listOfPrimePersons.length);
        // commonAncestorNum;
        // numOfLegitCommonAncs;

        let newRepeatNum = 1.0 * document.getElementById("selectRepeatAnc4IndiSELECT").value + 1;
        condLog("SWITCHING to ", newRepeatNum);
        WebsView.commonAncestorNum = newRepeatNum;

        if (WebsView.listOfPrimePersons.length == 3) {
            let newPrimes = "12";
            if (whichType == 1) {
                newPrimes = document.getElementById("MultiAncestorSelectorSingles").value;
            } else if (whichType == 2) {
                newPrimes = document.getElementById("MultiAncestorSelectorCommon").value;
            }
            condLog("SWITCHING to ", newPrimes);
            WebsView.multiViewPrimaries = newPrimes;
        } else {
            WebsView.multiViewPrimaries = "12";
        }

        WebsView.redraw();
    };

    WebsView.switchCommonsFor = function (whichType = 1) {
        condLog("WebsView.switchCommonsFor", WebsView.listOfPrimePersons.length);
        // commonAncestorNum;
        // numOfLegitCommonAncs;

        if (WebsView.listOfPrimePersons.length == 3) {
            let newPrimes = "12";
            if (whichType == 1) {
                newPrimes = document.getElementById("MultiAncestorSelectorSingles").value;
            } else if (whichType == 2) {
                newPrimes = document.getElementById("MultiAncestorSelectorCommon").value;
            }
            condLog("SWITCHING to ", newPrimes);
            WebsView.multiViewPrimaries = newPrimes;
        } else {
            WebsView.multiViewPrimaries = "12";
        }

        WebsView.redraw();
    };

    function getNameToSortBy(id) {
        let sortName = "";
        if (thePeopleList[id] && thePeopleList[id]._data.LastNameAtBirth) {
            sortName = thePeopleList[id]._data.LastNameAtBirth + ", ";
        }
        if (thePeopleList[id] && thePeopleList[id]._data.FirstName) {
            sortName += thePeopleList[id]._data.FirstName;
        } else {
            sortName += thePeopleList[id]._data.RealName;
        }
        return sortName;
    }

    function getSuffixNoteForDropDown(ahnNums = [], ahnNums2 = [], ahnNums3 = []) {
        let suffix = "";
        let gens = [];
        let kidID = -1;
        let addSTAR = "";

        let thisAhnentafel = WebsView.myAhnentafel;
        if (ahnNums && ahnNums.length > 0) {
            let thisSuffix = "";
            for (let index = 0; index < ahnNums.length; index++) {
                const thisGen = Math.floor(Math.log2(ahnNums[index]));
                if (thisGen >= WebsView.numGens2Display) {
                    addSTAR = "*";
                } else {
                    if (thisSuffix > "") {
                        thisSuffix += ",";
                    }
                    thisSuffix += "" + thisGen;
                }
            }
            suffix = "" + thisSuffix;
        }

        if (ahnNums2 && ahnNums2.length > 0) {
            thisAhnentafel = WebsView.listOfAhnentafels[1];
            let thisSuffix = "";

            for (let index = 0; index < ahnNums2.length; index++) {
                const thisGen = Math.floor(Math.log2(ahnNums2[index]));
                if (thisGen >= WebsView.numGens2Display) {
                    addSTAR = "*";
                } else {
                    if (thisSuffix > "") {
                        thisSuffix += ",";
                    }
                    thisSuffix += "" + thisGen;
                }
            }
            if (suffix > "") {
                suffix += " / ";
            }
            suffix += thisSuffix;
        }

        if (ahnNums3 && ahnNums3.length > 0) {
            thisAhnentafel = WebsView.listOfAhnentafels[1];
            let thisSuffix = "";

            for (let index = 0; index < ahnNums3.length; index++) {
                const thisGen = Math.floor(Math.log2(ahnNums3[index]));
                if (thisGen >= WebsView.numGens2Display) {
                    addSTAR = "*";
                } else {
                    if (thisSuffix > "") {
                        thisSuffix += ",";
                    }
                    thisSuffix += "" + thisGen;
                }
            }
            if (suffix > "") {
                suffix += " / ";
            }
            suffix += thisSuffix;
        }

        return "(" + suffix + ")" + addSTAR;
    }

    /**
     * Draw/redraw the tree
     */
    Tree.prototype.draw = function () {
        condLog("FUNCTION : Tree.prototype.draw");
        if (this.root) {
            // var nodes = thePeopleList.listAllPersons();// [];//this.tree.nodes(this.root);
            condLog(
                "calling listOfAncestorsForFanChart(",
                WebsView.numGens2Display,
                WebsView.currentPrimeNum,
                ")",
                WebsView.myAhnentafel
            );
            var nodes = WebsView.myAhnentafel.listOfAncestorsForFanChart(
                WebsView.numGens2Display,
                WebsView.currentPrimeNum
            ); // [];//this.tree.nodes(this.root);

            if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
                recalculateCommonNames();
                condLog("COMMON ANCESTORS:");
                condLog(WebsView.listOfCommonAncestors);
                // }
                // if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
                condLog("WE ARE IN THE COMMON MODE HERE !!!!");
                nodes = [];
                for (let a = 0; a < WebsView.listOfAhnentafels.length; a++) {
                    WebsView.listOfAhnentafels[a].update();
                    let tmpNodes = WebsView.listOfAhnentafels[a].listOfAncestorsForFanChart(WebsView.numGens2Display);
                    for (let n = 0; n < tmpNodes.length; n++) {
                        tmpNodes[n]["p"] = a; // record the prime num for each node
                        tmpNodes[n]["newX"] += a * 500;
                    }
                    nodes = nodes.concat(tmpNodes);
                }

                // nodes = WebsView.listOfAhnentafels[0]
                //     .listOfAncestorsForFanChart()
                //     .concat(WebsView.listOfAhnentafels[1].listOfAncestorsForFanChart() );

                condLog(" WebsView.listOfAhnentafels", WebsView.listOfAhnentafels);
            }

            condLog("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);
            condLog(" NODES in Tree.prototype.draw function = ", nodes);

            WebsView.listOfRepeatAncestors = WebsView.myAhnentafel.listOfRepeatAncestors(WebsView.numGens2Display);
            condLog("REPEAT ANCESTORS:", WebsView.listOfRepeatAncestors);

            if (WebsView.viewMode == "Indi") {
                // SET UP the special sub-heading for Individual Ancestor web
                let allOptions = [];
                let repeatSelector =
                    "<select style='cursor:pointer;' class=selectSimpleDropDown  id=selectRepeatAnc4IndiSELECT  onchange='WebsView.switchRepeatAnc();'>";
                for (let r = 0; r < WebsView.listOfRepeatAncestors.length; r++) {
                    const element = WebsView.listOfRepeatAncestors[r];
                    condLog("Select:", element);
                    let isSelected = "";
                    if (WebsView.repeatAncestorNum - 1 == r) {
                        isSelected = " selected ";
                    }
                    if (element.id && thePeopleList[element.id]) {
                        let thisOption = "<option value=" + r + isSelected + ">";
                        // repeatSelector += thePeopleList[element.id].getDisplayName();
                        let thisOptionEntry =
                            getNameToSortBy(element.id) + " " + getSuffixNoteForDropDown(element.AhnNums);
                        thisOption += thisOptionEntry;
                        thisOption += "</option>";
                        allOptions.push([thisOptionEntry, thisOption]);
                    }
                }
                allOptions.sort();
                for (let index = 0; index < allOptions.length; index++) {
                    repeatSelector += allOptions[index][1];
                }

                repeatSelector += "</select>";
                document.getElementById("IndiRepeaterName").innerHTML = repeatSelector;
                // document.getElementById("IndiRepeaterName").textContent =
                //     thePeopleList[WebsView.listOfRepeatAncestors[WebsView.repeatAncestorNum - 1].id].getDisplayName();
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
                    if (
                        WebsView.listOfRepeatAncestors[repeaterIndex] &&
                        WebsView.listOfRepeatAncestors[repeaterIndex].AhnNums
                    ) {
                        for (
                            let index = 0;
                            index < WebsView.listOfRepeatAncestors[repeaterIndex].AhnNums.length;
                            index++
                        ) {
                            const thisAhnNum = WebsView.listOfRepeatAncestors[repeaterIndex].AhnNums[index];
                            // condLog("Need to find the peeps in between AhnNum 1 and AhnNum ", thisAhnNum);
                            setUseThisForNode(thisAhnNum, nodes);
                        }
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
                condLog("AFter USE THIS loopage : ", nodes);
                // for (let n = 0; n < nodes.length; n++) {
                //     const element = nodes[n];
                //     if (element){
                //         // condLog(element.p, element.ahnNum, element._data);
                //     }
                // }
            }

            if (WebsView.viewMode == "Singles" || WebsView.viewMode == "Common") {
                // SET UP the special sub-heading for Individual Ancestor web
                condLog("WebsView.listOfCommonAncestors:", WebsView.listOfCommonAncestors);
                let numOfLegitCommonAncs = 0;
                WebsView.listOfLegitCommonAncestors = [];
                WebsView.listOfLegitCommonIDs = [];
                let index1 = WebsView.multiViewPrimaries[0];
                let index2 = WebsView.multiViewPrimaries[1];
                let index3 = "";
                if (WebsView.multiViewPrimaries == "012") {
                    index3 = "2";
                }

                let allOptions = [];
                let repeatSelector =
                    "<select style='cursor:pointer;' class=selectSimpleDropDown  id=selectRepeatAnc4IndiSELECT  onchange='WebsView.switchCommonAnc();'>";
                for (let r = 0; r < WebsView.listOfCommonAncestors.length; r++) {
                    const element = WebsView.listOfCommonAncestors[r];
                    condLog(element);

                    if (element.max <= 2 ** WebsView.numGens2Display) {
                        if (WebsView.listOfLegitCommonIDs.indexOf(element.Id) == -1) {
                            numOfLegitCommonAncs++;
                            WebsView.listOfLegitCommonAncestors.push(element);
                            WebsView.listOfLegitCommonIDs.push(element.Id);
                            let isSelected = "";
                            if (WebsView.commonAncestorNum == numOfLegitCommonAncs) {
                                isSelected = " selected ";
                            }

                            // repeatSelector += "<option value=" + (numOfLegitCommonAncs - 1) + isSelected + ">";
                            // repeatSelector += thePeopleList[element.Id].getDisplayName();
                            // repeatSelector += "</option>";

                            let thisOption = "<option value=" + (numOfLegitCommonAncs - 1) + isSelected + ">";
                            // repeatSelector += thePeopleList[element.id].getDisplayName();
                            let thisOptionEntry =
                                getNameToSortBy(element.Id) +
                                " " +
                                getSuffixNoteForDropDown(element.Ahns0, element.Ahns1, element.Ahns2);
                            thisOption += thisOptionEntry;
                            thisOption += "</option>";

                            allOptions.push([thisOptionEntry, thisOption]);
                        }
                    }
                }

                allOptions.sort();
                for (let index = 0; index < allOptions.length; index++) {
                    repeatSelector += allOptions[index][1];
                }

                repeatSelector += "</select>";
                WebsView.commonAncestorNum = Math.min(Math.max(1, WebsView.commonAncestorNum), numOfLegitCommonAncs);
                WebsView.numOfLegitCommonAncs = numOfLegitCommonAncs;

                if (WebsView.viewMode == "Singles") {
                    document.getElementById("CommonAncName").innerHTML = repeatSelector;
                    // document.getElementById("CommonAncName").textContent =
                    //     thePeopleList[WebsView.listOfRepeatAncestors[WebsView.repeatAncestorNum - 1].id].getDisplayName();
                    document.getElementById("CommonAncNum").textContent =
                        WebsView.commonAncestorNum + " of " + WebsView.listOfLegitCommonAncestors.length;
                }
            }

            if (WebsView.viewMode == "Singles" || WebsView.viewMode == "Common") {
                // Go through all the NODES and pick out ONLY those peeps who are in between the lines of this Individual Repeat Ancestor and the Central Perp
                let index1 = WebsView.multiViewPrimaries[0];
                let index2 = WebsView.multiViewPrimaries[1];
                let index3 = "";
                if (WebsView.multiViewPrimaries == "012") {
                    index3 = "2";
                }

                // First we set a flag to false for all nodes, then we'll turn it on for the ones we want later
                for (let index = 0; index < nodes.length; index++) {
                    const element = nodes[index];
                    element["useThis"] = false;
                }
                condLog(
                    "WebsView.listOfCommonAncestors",
                    WebsView.listOfCommonAncestors,
                    "WebsView.listOfLegitCommonAncestors",
                    WebsView.listOfLegitCommonAncestors,
                    WebsView.numGens2Display,
                    2 ** WebsView.numGens2Display
                );
                let startingRepeaterIndex = 0;
                let endingRepeaterIndex = WebsView.listOfLegitCommonAncestors.length - 1;

                if (WebsView.viewMode == "Singles") {
                    startingRepeaterIndex = WebsView.commonAncestorNum - 1;
                    endingRepeaterIndex = WebsView.commonAncestorNum - 1;
                }

                if (WebsView.listOfLegitCommonAncestors.length == 0) {
                    condLog("NO COMMON ANNCESTORS for the COMMON / SINGLES !!!!");
                    document.getElementById("SummaryMessageArea").innerText =
                        "At " + WebsView.numGens2Display + " generations, there are 0 common ancestors.";
                    WebsView.clearAll();
                    return;
                }

                for (let repeaterIndex = startingRepeaterIndex; repeaterIndex <= endingRepeaterIndex; repeaterIndex++) {
                    condLog(
                        "Need to find Peeps belonging to Common Ancestor # ",
                        { repeaterIndex },
                        WebsView.listOfLegitCommonAncestors[repeaterIndex],
                        { index3 },
                        WebsView.multiViewPrimaries
                    );
                    if (WebsView.listOfLegitCommonAncestors[repeaterIndex].min > 2 ** WebsView.numGens2Display) {
                        // nothing to see here ... THIS particular Common Ancestor is above your PAY GRADE ! (ie - too many generations removed for the current gens to be displayed!)
                    } else {
                        for (
                            let index = 0;
                            index < WebsView.listOfLegitCommonAncestors[repeaterIndex].Ahns0.length;
                            index++
                        ) {
                            const thisAhnNum = WebsView.listOfLegitCommonAncestors[repeaterIndex].Ahns0[index];
                            condLog("Need to find the peeps in between AhnNum 1 and COMMON AhnNum ", thisAhnNum);
                            setUseThisForNode(thisAhnNum, nodes, index1);
                        }
                        for (
                            let index = 0;
                            index < WebsView.listOfLegitCommonAncestors[repeaterIndex].Ahns1.length;
                            index++
                        ) {
                            const thisAhnNum = WebsView.listOfLegitCommonAncestors[repeaterIndex].Ahns1[index];
                            condLog("Need to find the peeps in between AhnNum 1 and COMMON#2 AhnNum ", thisAhnNum);
                            setUseThisForNode(thisAhnNum, nodes, index2);
                        }

                        if (index3 > "" && WebsView.multiViewPrimaries == "012") {
                            for (
                                let index = 0;
                                index < WebsView.listOfLegitCommonAncestors[repeaterIndex].Ahns2.length;
                                index++
                            ) {
                                const thisAhnNum = WebsView.listOfLegitCommonAncestors[repeaterIndex].Ahns2[index];
                                condLog("Need to find the peeps in between AhnNum 1 and COMMON#3 AhnNum ", thisAhnNum);
                                setUseThisForNode(thisAhnNum, nodes, index3);
                            }
                        }
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
                condLog("AFter USE THIS loopage : ", nodes);
                for (let n = 0; n < nodes.length; n++) {
                    const element = nodes[n];
                    if (element) {
                        condLog(element.p, element.ahnNum, element.person._data.BirthNamePrivate);
                    }
                }
            }
            // Calculate the new NODE positions (skooch together / adjust if needed for repeat ancestors)
            calculateNodePositions(nodes);

            // Draw the lines connecting the new NODEs
            condLog("calling drawLines from prototype.draw() ");
            WebsView.drawLines(nodes);
            WebsView.logLines;

            // Finally - draw the Nodes themselves!
            condLog("calling drawNodes from prototype.draw() ");
            this.drawNodes(nodes);
            WebsView.logLines;

            // Update the Summary Message based on how many repeat ancestors there are, etc..
            if (WebsView.viewMode == "Singles" || WebsView.viewMode == "Common") {
                condLog("Summary Msg Area Calc: ", WebsView.listOfLegitCommonAncestors);
                const setLegitIDs = new Set(WebsView.listOfLegitCommonIDs);
                const numLegitCommonAncestors = setLegitIDs.size;
                showSummaryMessage(
                    "At " +
                        WebsView.numGens2Display +
                        " generations, " +
                        primaryPeopleFirstNames() +
                        " have " +
                        numLegitCommonAncestors +
                        " common ancestor" +
                        (numLegitCommonAncestors != 1 ? "s" : "") +
                        "."
                );
            } else {
                showSummaryMessage(
                    "At " +
                        WebsView.numGens2Display +
                        " generations, " +
                        primaryPersonFirstName() +
                        " has " +
                        WebsView.listOfRepeatAncestors.length +
                        " repeat ancestor" +
                        (WebsView.listOfRepeatAncestors.length != 1 ? "s" : "") +
                        "."
                );
            }

            WebsView.updateFontsIfNeeded();
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
        // condLog("Tree.prototpe.DRAW NODES", nodes);
        var self = this;

        WebsView.logLines();
        // condLog("this.selector = ", this.selector);

        // Get a list of existing nodes
        var node = this.svg.selectAll("g.person." + this.selector).data(nodes, function (ancestorObject) {
            let person = ancestorObject.person;
            // condLog("var node: function person ? " , person.getId(), ancestorObject.ahnNum);
            // return person;
            return ancestorObject.ahnNum + "p" + ancestorObject.p; //getId();
        });

        // condLog("Tree.prototpe.DRAW NODES - SINGULAR node:", node);

        // Add new nodes
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // condLog("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);

        // Draw the person boxes
        nodeEnter
            .append("foreignObject")
            .attrs({
                id: "foreignObj4",
                width: boxWidth,
                height: boxHeight, // the foreignObject won't display in Firefox if it is 0 height
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
                if (ancestorObject.ahnNum == 1) {
                    thisFontSize = 18;
                }

                return `
                <div  id=wedgeBoxFor${ancestorObject.ahnNum}p${
                    ancestorObject.p
                } class="box staticPosition" style="background-color: white ; border:1; cursor:pointer; padding: 0px;" title="Click to show/hide Person Pop-up">
                <div id=nameDivFor${ancestorObject.ahnNum}p${
                    ancestorObject.p
                } class="name" style="font-size: ${thisFontSize}px;" >${getNameAsPerSettings(person)}</div>
                </div>
                `;
            });

        // Show info popup on click
        nodeEnter.on("click", function (event, ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            event.stopPropagation();
            self.personPopup(person, d3.pointer(event, self.svg.node()));
        });

        WebsView.myAncestorTree = self;

        // Remove old nodes
        node.exit().remove();
        node = nodeEnter.merge(node);

        WebsView.updateFontsIfNeeded = function () {
            // if (
            //     WebsView.currentSettings["general_options_font"] == font4Name

            // ) {
            //     condLog("NOTHING to see HERE in UPDATE FONT land");
            // } else {
            condLog("WELCOME to  UPDATE FONT land");
            condLog("Update Fonts:", WebsView.currentSettings["general_options_font"], font4Name);
            condLog(WebsView.currentSettings);

            font4Name = WebsView.currentSettings["general_options_font"];

            let nameElements = document.getElementsByClassName("name");
            for (let e = 0; e < nameElements.length; e++) {
                const element = nameElements[e];
                element.classList.remove("fontSerif");
                element.classList.remove("fontSansSerif"); // Arial ???
                element.classList.remove("fontMono");
                element.classList.remove("fontFantasy");
                element.classList.remove("fontScript");
                element.classList.add("font" + font4Name);
            }
            // }
        };

        // *****************************
        // *
        // * REAL MAGIC HAPPENS HERE !!! --> By adjusting the Position, we can use the underlying logic of the d3.js Tree to handle the icky stuff, and we just position the boxes using some logic and a generalized formula
        // *
        // *****************************

        // Position

        node.attr("transform", function (ancestorObject) {
            // NOTE:  This "transform" function is being cycled through by EVERY data point in the Tree
            //          SO ... the logic has to work for not only the central dude(tte), but also anyone on the outer rim and all those in between
            //          The KEY behind ALL of these calculations is the Ahnentafel numbers for each person in the Tree
            //          Each person in the data collection has an .AhnNum numeric property assigned, which uniquely determines where their name plate should be displayed.

            // condLog("node.attr.transform  - line:324 (x,y) = ",d.x, d.y, d._data.Name);
            let d = ancestorObject.person; //thePeopleList[ person.id ];
            // condLog(ancestorObject);
            let theAncestorAtTop = WebsView.listOfRepeatAncestors[WebsView.repeatAncestorNum - 1];
            // condLog("theAncestorAtTop", theAncestorAtTop);
            if (WebsView.viewMode == "Singles") {
                theAncestorAtTop = WebsView.listOfLegitCommonAncestors[WebsView.commonAncestorNum - 1];
                theAncestorAtTop.id = theAncestorAtTop.Id;
            }

            let thisNewX = ancestorObject.newX;
            // condLog("NEW x :", thisNewX, ancestorObject.ahnNum, ancestorObject.p);

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            // Calculate which position # (starting lower left and going clockwise around the Ancestor Webs) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;
            let numSpotsMaxGen = 2 ** (WebsView.numGens2Display - 1);

            let bkgdColourSetting = WebsView.currentSettings["colour_options_background"];
            let fontColourSetting = WebsView.currentSettings["colour_options_numColours"];

            let theXmultiplier = 1;
            let nameSettings = WebsView.currentSettings["name_options_multiNameFormat"];

            if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Singles") {
                nameSettings = WebsView.currentSettings["name_options_indiNameFormat"];
                // if (WebsView.viewMode == "Indi") {
                //     theXmultiplier = 3;
                // }
            } else {
            }
            if (nameSettings == "FName") {
                theXmultiplier = 3;
            } else if (nameSettings == "FName" || nameSettings == "FLname" || nameSettings == "FnameLname") {
                theXmultiplier = 4;
            } else if (nameSettings == "FML") {
                theXmultiplier = 1.25;
            }

            let theMaxWidthPerName = 40 * theXmultiplier;
            // condLog("theMaxWidthPerName", theMaxWidthPerName);

            let theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum + "p" + ancestorObject.p);
            if (theInfoBox) {
                // condLog(theInfoBox);
                let theBounds = theInfoBox; //.getBBox();

                // CENTER the DIV and SET its width to 300px
                theInfoBox.parentNode.parentNode.setAttribute("y", -16);

                theInfoBox.parentNode.parentNode.setAttribute("x", -14);
                theInfoBox.parentNode.parentNode.setAttribute("width", 28);

                if (ancestorObject.ahnNum == 1) {
                    let ltrsNeeded = getFirstName(ancestorObject.person).length;
                    if (
                        WebsView.viewMode == "Indi" ||
                        WebsView.viewMode == "Common" ||
                        WebsView.viewMode == "Singles"
                    ) {
                        document.getElementById(
                            "nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p
                        ).innerHTML = getFirstLNAB(ancestorObject.person);
                        ltrsNeeded = getFirstLNAB(ancestorObject.person).length;
                        if (WebsView.viewMode == "Common") {
                            // let nameSettings = WebsView.currentSettings["name_options_multiNameFormat"];
                            if (nameSettings == "FName" || nameSettings == "FLname" || nameSettings == "FnameLname") {
                                if (nameSettings == "FName") {
                                    thisNewX = thisNewX * 3;
                                } else {
                                    thisNewX = thisNewX * 4;
                                }
                            } else if (nameSettings == "FML") {
                                thisNewX = thisNewX * 1.25;
                            }
                            // thisNewX = thisNewX * 4;
                        }
                    } else {
                        document.getElementById(
                            "nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p
                        ).innerHTML = getFirstLNAB(ancestorObject.person);
                        ltrsNeeded = getFirstLNAB(ancestorObject.person).length;
                    }
                    let workingWidth = Math.min(150, 10 * ltrsNeeded); // PRIMARY PEOPLE need room for their FULL NAME
                    theInfoBox.parentNode.parentNode.setAttribute("x", 0 - workingWidth / 2);
                    theInfoBox.parentNode.parentNode.setAttribute("width", workingWidth);
                    // condLog("workingWidth = ", workingWidth);
                } else {
                    // condLog(WebsView.myAhnentafel.listByPerson[ancestorObject.person._data.Id]);
                    let thisNameNow = getNameAsPerSettings(ancestorObject.person);
                    // let nameSettings = WebsView.currentSettings["name_options_multiNameFormat"];

                    if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Singles") {
                        nameSettings = WebsView.currentSettings["name_options_indiNameFormat"];
                    }
                    if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Singles") {
                        condLog(
                            "IF: ",
                            d,
                            theAncestorAtTop,
                            d._data.Id,
                            theAncestorAtTop.id,
                            d._data.Id == theAncestorAtTop.id
                        );
                        if (d._data.Id == theAncestorAtTop.id) {
                            condLog("MAKE IT RAIN !!!!!");
                            nameSettings = "FnameLname";
                            thisNameNow = getFirstLNAB(ancestorObject.person);
                            theMaxWidthPerName = 300;
                        }
                    }

                    let baseWidth4Lettrs = 8.5;
                    if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Singles") {
                        // do nothing with thisNewX
                        if (nameSettings == "FName" || nameSettings == "FLname" || nameSettings == "FnameLname") {
                            baseWidth4Lettrs = 5;
                        }
                    } else {
                        if (nameSettings == "FName" || nameSettings == "FLname" || nameSettings == "FnameLname") {
                            baseWidth4Lettrs = 5;
                            if (nameSettings == "FName") {
                                thisNewX = thisNewX * 3;
                            } else {
                                thisNewX = thisNewX * 4;
                            }
                        } else if (nameSettings == "FML") {
                            thisNewX = thisNewX * 1.25;
                        } else if (thisNameNow == "MM") {
                            //  baseWidth4Lettrs = 15;
                        }
                    }

                    document.getElementById("nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p).innerHTML =
                        thisNameNow;

                    // TEST the TEXT COLOUR EFFECT
                    // document.getElementById(
                    //     "nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p
                    // ).style.color = "Yellow";

                    let ltrsNeeded = thisNameNow.length;
                    let fontClr = "Black";
                    if (bkgdColourSetting == "dark") {
                        fontClr = "White";
                    }
                    let workingWidth = Math.min(theMaxWidthPerName, 2 * baseWidth4Lettrs * ltrsNeeded);
                    theInfoBox.parentNode.parentNode.setAttribute("x", 0 - workingWidth / 2);
                    theInfoBox.parentNode.parentNode.setAttribute("width", workingWidth);
                    // condLog("workingWidth = ", workingWidth);
                    if (
                        WebsView.viewMode != "Common" &&
                        WebsView.viewMode != "Singles" &&
                        WebsView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1
                    ) {
                        let theClr = "Yellow";
                        baseWidth4Lettrs += 1;
                        let calcedWidth = theXmultiplier * baseWidth4Lettrs * ltrsNeeded + 20; // add another 10px for each extra margin (on each side) added around for coloured repeating ancestors
                        let workingWidth = Math.min(theMaxWidthPerName, calcedWidth);
                        theInfoBox.parentNode.parentNode.setAttribute("x", 0 - workingWidth / 2);
                        theInfoBox.parentNode.parentNode.setAttribute("width", workingWidth);
                        // condLog("workingWidth = ", workingWidth);

                        // theInfoBox.parentNode.parentNode.setAttribute("x", 0 - baseWidth4Lettrs * ltrsNeeded);
                        // theInfoBox.parentNode.parentNode.setAttribute("width", 2 * baseWidth4Lettrs * ltrsNeeded);

                        // NOTE:  THIS IS MAYBE ???? THE LOCATION WHERE IN WE NEED TO RE-DO THE LOGIC FOR COLOURIZING ANCESTORS OF REPEATS
                        if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                            theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                            if (ancestorObject.person._data.theClr > "") {
                                theClr = ancestorObject.person._data.theClr;
                                // condLog("HAS THEIR OWN COLOUR (in transform loop)", theClr);
                            }
                            if (ancestorObject.person._data.fontClr > "") {
                                fontClr = ancestorObject.person._data.fontClr;
                                // condLog("HAS THEIR OWN FONT COLOUR", fontClr);
                            }

                            // theClr = "Pink";
                        } else {
                            numRepeatAncestors++;
                            if (bkgdColourSetting == "light") {
                                theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                                if (fontColourSetting == "multi") {
                                    let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                    let fontClrNum = numRepeatAncestors % 4;
                                    fontClr = fontClrsArray[fontClrNum];
                                    ancestorObject.person._data.fontClr = fontClr;
                                    // condLog("CHOSE fontClr:", fontClr);
                                }
                            } else if (bkgdColourSetting == "dark") {
                                theClr = LineColourArray[numRepeatAncestors % LineColourArray.length];
                                fontClr = "White";
                                if (fontColourSetting == "multi") {
                                    let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                    let fontClrNum = numRepeatAncestors % 4;
                                    fontClr = fontClrsArray[fontClrNum];
                                    // ancestorObject.person._data.fontClr = fontClr;
                                    // condLog("CHOSE fontClr:", fontClr);
                                }
                            } else if (bkgdColourSetting == "both") {
                                let theClrNum = numRepeatAncestors % (ColourArray.length + LineColourArray.length);
                                if (theClrNum < ColourArray.length) {
                                    theClr = ColourArray[theClrNum];
                                    if (fontColourSetting == "multi") {
                                        let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                        let fontClrNum = numRepeatAncestors % 4;
                                        fontClr = fontClrsArray[fontClrNum];
                                        ancestorObject.person._data.fontClr = fontClr;
                                        // condLog("CHOSE fontClr:", fontClr);
                                    }
                                } else {
                                    theClr = LineColourArray[theClrNum - ColourArray.length];
                                    fontClr = "White";
                                    if (fontColourSetting == "multi") {
                                        let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                        let fontClrNum = numRepeatAncestors % 4;
                                        fontClr = fontClrsArray[fontClrNum];
                                        // ancestorObject.person._data.fontClr = fontClr;
                                        // condLog("CHOSE fontClr:", fontClr);
                                    }
                                }
                            } else {
                                theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                            }

                            // let bkgdColourSetting = WebsView.currentSettings["colour_options_background"];
                            // let fontColourSetting = WebsView.currentSettings["colour_options_numColours"];

                            // theClr = "Blue";
                            repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                            repeatAncestorCounter.push(ancestorObject.person._data.Id);
                            if (ancestorObject.person._data.theClr > "") {
                                theClr = ancestorObject.person._data.theClr;
                                // condLog("HAS THEIR OWN COLOUR (end of transform) ", theClr);
                            }
                            if (ancestorObject.person._data.fontClr > "") {
                                fontClr = ancestorObject.person._data.fontClr;
                                // condLog("HAS THEIR OWN FONT COLOUR", fontClr);
                            }
                        }
                        // temporarily used to test out all the colours of the rainbow ...
                        // theClr = LineColourArray[thisPosNum % LineColourArray.length];

                        // condLog(
                        //     "Use ",
                        //     theClr,
                        //     fontClr,
                        //     ancestorObject.person._data.fontClr,
                        //     fontColourSetting,
                        //     " for ",
                        //     thisNameNow,
                        //     "repeat #",
                        //     numRepeatAncestors,
                        //     repeatAncestorCounter.indexOf(ancestorObject.person._data.Id),
                        //     bkgdColourSetting
                        // );
                        theInfoBox.setAttribute("style", "background-color: " + theClr + "; cursor:pointer;");

                        if (bkgdColourSetting != "light" || fontColourSetting == "multi") {
                            let repeatIndex = repeatAncestorCounter.indexOf(ancestorObject.person._data.Id);
                            condLog("Redefine Font Colour for repeat # ", repeatIndex, ancestorObject.person._data.Id);
                            let theClrNum = repeatIndex % (ColourArray.length + LineColourArray.length);
                            if (bkgdColourSetting == "light") {
                                theClrNum = repeatIndex % ColourArray.length;
                            } else if (bkgdColourSetting == "dark") {
                                theClrNum = repeatIndex % LineColourArray.length;
                            }

                            if (bkgdColourSetting == "light" && fontColourSetting == "multi") {
                                let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                fontClr = fontClrsArray[repeatIndex % 4];
                            } else if (bkgdColourSetting == "light" && fontColourSetting == "single") {
                                condLog(
                                    "WARNING WARNING - THIS COMBO SHOULD NOT EVER HAPPEN !!!! CHECK OUT LINE 2259 or thereabouts!"
                                );
                                fontClr = "Black";
                            } else if (bkgdColourSetting == "dark" && fontColourSetting == "single") {
                                fontClr = "White";
                            } else if (bkgdColourSetting == "dark" && fontColourSetting == "multi") {
                                let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                fontClr = fontClrsArray[repeatIndex % 4];
                            } else if (bkgdColourSetting == "both" && fontColourSetting == "single") {
                                if (ColourArray.indexOf(theClr) > -1) {
                                    // we have a LIGHT background colour - so - we're fine with default black
                                    // which should only happen here if the bkgdColourSetting is actually "both",
                                    fontClr = "Black";
                                } else {
                                    // we must have a dark background colour, in which case, let's go with default of white
                                    fontClr = "White";
                                }
                            } else if (bkgdColourSetting == "both" && fontColourSetting == "multi") {
                                if (theClrNum < ColourArray.length) {
                                    let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                    fontClr = fontClrsArray[repeatIndex % 4];
                                } else {
                                    let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                    fontClr = fontClrsArray[repeatIndex % 4];
                                    // fontClr = fontClrsArray[(theClrNum - ColourArray.length) % 4];
                                }
                            }
                        }

                        if (fontClr > "") {
                            document.getElementById(
                                "nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p
                            ).style.color = fontClr;
                        }
                    } else if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
                        // WebsView.listOfLegitCommonAncestors // was listOfCommonAncestors
                        for (let ca = 0; ca < WebsView.listOfLegitCommonAncestors.length; ca++) {
                            const thisCommonAnc = WebsView.listOfLegitCommonAncestors[ca];
                            // if (thisCommonAnc) {
                            //     condLog("THISCOMMONANC:", thisCommonAnc);
                            // }
                            if (thisCommonAnc && thisCommonAnc.Id == ancestorObject.person._data.Id) {
                                // condLog("THISCOMMONANC:", thisCommonAnc);
                                let theClr = "Yellow";

                                if (ancestorObject.person._data.theClr) {
                                    theClr = ancestorObject.person._data.theClr;
                                }
                                if (ancestorObject.person._data.fontClr > "") {
                                    fontClr = ancestorObject.person._data.fontClr;
                                    // condLog("HAS THEIR OWN FONT COLOUR", fontClr);
                                    document.getElementById(
                                        "nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p
                                    ).style.color = fontClr;
                                } else {
                                    if (fontColourSetting == "single") {
                                        if (bkgdColourSetting == "light") {
                                            fontClr = "Black";
                                        } else if (bkgdColourSetting == "dark") {
                                            fontClr = "White";
                                        } else if (bkgdColourSetting == "both") {
                                            if (ColourArray.indexOf(theClr) == -1) {
                                                // bkgd is not in Colour Array which means it must be a DARK colour, so then ...
                                                fontClr = "White";
                                            } else {
                                                // bkgd is IN Colour Array which means it must be a light colour, so then ...
                                                fontClr = "Black";
                                            }
                                        }
                                    } else {
                                        if (bkgdColourSetting == "light") {
                                            let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                            fontClr = fontClrsArray[ca % 4];
                                        } else if (bkgdColourSetting == "dark") {
                                            let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                            fontClr = fontClrsArray[ca % 4];
                                        } else if (bkgdColourSetting == "both") {
                                            let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                            if (ColourArray.indexOf(theClr) == -1) {
                                                // bkgd is not in Colour Array which means it must be a DARK colour, so then ...
                                                fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                            } /* else {
                                                // bkgd is IN Colour Array which means it must be a light colour, so then ...
                                                
                                            } */
                                            fontClr = fontClrsArray[ca % 4];
                                        }
                                    }
                                }

                                //  else {
                                //     numRepeatAncestors++;
                                //     theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                                //     repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                                // }

                                // let calcedWidth = theXmultiplier * baseWidth4Lettrs * ltrsNeeded + 20; // add another 10px for each extra margin (on each side) added around for coloured repeating ancestors
                                let calcedWidth = 18 * ltrsNeeded + 20; // add another 10px for each extra margin (on each side) added around for coloured repeating ancestors
                                // let workingWidth = Math.min(theMaxWidthPerName, 18 * ltrsNeeded);
                                let workingWidth = Math.min(theMaxWidthPerName, calcedWidth);
                                theInfoBox.parentNode.parentNode.setAttribute("x", 0 - workingWidth / 2);
                                theInfoBox.parentNode.parentNode.setAttribute("width", workingWidth);
                                theInfoBox.setAttribute("style", "background-color: " + theClr + ";");
                                // condLog("workingWidth = ", workingWidth);
                                // if (fontClr > "") {
                                //     document.getElementById(
                                //         "nameDivFor" + ancestorObject.ahnNum + "p" + ancestorObject.p
                                //     ).style.color = fontClr;
                                // }
                                condLog("CLR for ", thisNameNow, " : ", theClr);
                            } else {
                                // condLog("thisCommonAnc:", thisCommonAnc);
                            }
                        }
                        // if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                        //     theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        // } else {
                        //     numRepeatAncestors++;
                        //     theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                        //     repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                        // }
                    } else {
                        // temporarily used to test out all the colours of the rainbow ...
                        // theClr = LineColourArray[thisPosNum % LineColourArray.length];
                        // theInfoBox.setAttribute("style", "background-color: " + theClr + ";");
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
                if (WebsView.viewMode == "Indi" || WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
                    thisGenNum = ancestorObject.newY;
                } else {
                    thisGenNum = 1 + 2 * ancestorObject.newY - WebsView.repeatsStartAtGenNum;
                }
            }

            let Y = WebsView.yDir * vertSpacing * thisGenNum;

            // let i = ancestorObject.ahnNum;

            // condLog(
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
            // condLog("Place",d._data.Name,"ahnNum:" + ancestorObject.ahnNum,"Gen:"+thisGenNum,"Pos:" + thisPosNum, WebsView.maxAngle);
            // condLog("->placing @ (",X," , "  , Y , ")");
            // FINALLY ... we return the transformation statement back - the translation based on our  calculations
            return "translate(" + newX + "," + newY + ")";

            // and if needed a rotation based on the nameAngle
            // return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });

        WebsView.logLines();
    };

    function findPercentileForAhnNum(anAhnNum, orderedNodes, primeNum = 0) {
        for (let index = 0; index < orderedNodes.length; index++) {
            const element = orderedNodes[index];
            if (element[1] == anAhnNum && element[6] == primeNum) {
                return element[0];
            }
        }
        return 0;
    }

    function findGenNumForAhnNumChild(anAhnNum, orderedNodes, primeNum = 0) {
        for (let index = 0; index < orderedNodes.length; index++) {
            const element = orderedNodes[index];
            if (element[1] == anAhnNum && element[6] == primeNum) {
                return element[5];
            }
        }
        return 0;
    }

    function assignPercentileForAhnNum(anAhnNum, orderedNodes, newPercentile, lastGenNum, primeNum = 0) {
        for (let index = 0; index < orderedNodes.length; index++) {
            const element = orderedNodes[index];
            if (element[1] == anAhnNum && element[6] == primeNum) {
                element[0] = newPercentile;
                element[5] = lastGenNum;
                return;
            }
        }
    }

    function autoPromoteParentsOf(anAhnNum, orderedNodes, primeNum = 0) {
        let returnArray = [];
        for (let index = 0; index < orderedNodes.length; index++) {
            const element = orderedNodes[index];
            if (element[1] == anAhnNum && element[6] == primeNum) {
                let childPercentile = element[0]; // = newPercentile;
                let childGenNum = element[5]; // = lastGenNum;

                let dadAhnNum = anAhnNum * 2;
                let momAhnNum = dadAhnNum + 1;
                let foundDad = false;
                let foundMom = false;

                for (
                    let parentIndex = 0;
                    parentIndex < orderedNodes.length && (foundDad == false || foundMom == false);
                    parentIndex++
                ) {
                    const parentElement = orderedNodes[parentIndex];
                    let parentPercentile = parentElement[0]; // = newPercentile;
                    let parentGenNum = parentElement[5]; // = lastGenNum;

                    if (parentElement[1] == dadAhnNum && parentElement[6] == primeNum) {
                        if (parentGenNum == 0 || true) {
                            // if parent Gen Num == 0, that means it only appears once - so - instead of leaving it in original position - reposition above child
                            orderedNodes[parentIndex][0] = childPercentile - 0.0001;
                            returnArray.push(parentIndex);
                        }
                        orderedNodes[parentIndex][5] = Math.max(parentGenNum, childGenNum + 1);
                        foundDad = true;
                    } else if (parentElement[1] == momAhnNum && parentElement[6] == primeNum) {
                        if (parentGenNum == 0 || true) {
                            // if parent Gen Num == 0, that means it only appears once - so - instead of leaving it in original position - reposition above child
                            orderedNodes[parentIndex][0] = childPercentile + 0.0001;
                            returnArray.push(parentIndex);
                        }
                        orderedNodes[parentIndex][5] = Math.max(parentGenNum, childGenNum + 1);
                        foundMom = true;
                    }
                }
                return returnArray;
            }
        }
    }

    function setUseThisForNode(thisAhnNum, nodes, whichPrime = -1) {
        // let startingIndex =  nodes.length - 1;
        // Math.min(thisAhnNum, nodes.length - 1);
        // if(whichPrime >= 0) {
        for (let index = nodes.length - 1; index >= 0; index--) {
            const element = nodes[index];
            if (element && element.ahnNum) {
                if (element.ahnNum == thisAhnNum) {
                    condLog("setUseThisForNode: thisAhnNum, whichPrime, element=", thisAhnNum, whichPrime, element);
                    if (whichPrime >= 0 && element.p != whichPrime) {
                        // do nothing
                        // condLog("do NOthing ", whichPrime, element.p, element.ahnNum);
                    } else {
                        // condLog("do SOMEthing ", whichPrime, element.p, element.ahnNum);
                        element["useThis"] = true;
                        // if (element.p == 2) { console.log("SET element p2:", element);}
                        // condLog("USE THIS:", element);
                        if (thisAhnNum > 1) {
                            let newAhnNum = Math.floor(thisAhnNum / 2);
                            setUseThisForNode(newAhnNum, nodes, whichPrime);
                        }
                        return;
                    }
                }
            } else {
                condLog("Could not compute thisAhnNum:", thisAhnNum, "index:", index, "element:", element);
            }
        }
    }

    function maxArrayValue(arr) {
        let maxVal = -9999999999;
        // arr.forEach((element) => {
        for (const INDEX in arr) {
            const element = arr[INDEX];
            maxVal = Math.max(maxVal, element);
        }
        return maxVal;
    }

    function avgArrayValue(arr, arrAhns, maxAhnNum) {
        let sumVal = 0;
        let numVal = 0;
        for (let i = 0; i < arr.length; i++) {
            const thisArrVal = arr[i];
            if (arrAhns[i] <= maxAhnNum) {
                sumVal += thisArrVal;
                numVal++;
            }
        }

        if (numVal > 0) {
            return sumVal / numVal;
        } else {
            return 0;
        }
    }

    function numValuesInRange(arrAhns, maxAhnNum) {
        let numVal = 0;
        for (let i = 0; i < arrAhns.length; i++) {
            if (arrAhns[i] <= maxAhnNum) {
                numVal++;
            }
        }

        return numVal;
    }

    function reAssignPercentilesForParents(anAhnNum, nodes, orderedNodes, basePercentile, baseGenNum, basePrime) {
        // return;

        // let dadNode = findMatchingNodeByAhnNum(anAhnNum * 2, nodes, basePrime);
        let dadNode = findElementInRepeatAncestorsList(anAhnNum * 2);
        condLog("Dad Node: ", dadNode);
        // let momNode = findMatchingNodeByAhnNum(anAhnNum * 2 + 1, nodes, basePrime);
        let momNode = findElementInRepeatAncestorsList(anAhnNum * 2 + 1);
        condLog("mom Node: ", momNode);
        let dadUniqueKidsIDs = [];
        if (dadNode) {
            dadUniqueKidsIDs = findListOfUniqueKidsIDs(dadNode, nodes, basePrime);
        }
        let momUniqueKidsIDs = [];
        if (momNode) {
            momUniqueKidsIDs = findListOfUniqueKidsIDs(momNode, nodes, basePrime);
        }

        // reassign Dad
        if (dadUniqueKidsIDs.length == 1) {
            let theActualNode = findMatchingNodeByAhnNum(anAhnNum * 2, nodes, basePrime);
            if (theActualNode) {
                condLog("theActualNODE:", theActualNode);
                theActualNode.person._data.theClr = "#B0B0B0";
            }
            assignPercentileForAhnNum(
                anAhnNum * 2,
                orderedNodes,
                basePercentile - 1 / 2 ** (baseGenNum + WebsView.numGens2Display),
                baseGenNum + 1,
                basePrime
            );
            if (baseGenNum < WebsView.numGens2Display) {
                reAssignPercentilesForParents(
                    anAhnNum * 2,
                    nodes,
                    orderedNodes,
                    basePercentile - 1 / 2 ** (baseGenNum + WebsView.numGens2Display),
                    baseGenNum + 1,
                    basePrime
                );
            }
        }
        // reassign Mom
        if (momUniqueKidsIDs.length == 1) {
            let theActualNode = findMatchingNodeByAhnNum(anAhnNum * 2 + 1, nodes, basePrime);
            if (theActualNode) {
                theActualNode.person._data.theClr = "#B0B0B0";
            }
            assignPercentileForAhnNum(
                anAhnNum * 2 + 1,
                orderedNodes,
                basePercentile + 1 / 2 ** (baseGenNum + WebsView.numGens2Display),
                baseGenNum + 1,
                basePrime
            );
            if (baseGenNum < WebsView.numGens2Display) {
                reAssignPercentilesForParents(
                    anAhnNum * 2 + 1,
                    nodes,
                    orderedNodes,
                    basePercentile + 1 / 2 ** (baseGenNum + WebsView.numGens2Display),
                    baseGenNum + 1,
                    basePrime
                );
            }
        }
    }

    function findListOfUniqueKidsIDs(element, nodes, primeNum) {
        let listOfUniqueKids = [];
        for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
            const anAhnNum = element.AhnNums[innerIndex];
            const childAhnNum = Math.floor(anAhnNum / 2);
            let childNode = findMatchingNodeByAhnNum(childAhnNum, nodes, primeNum);
            if (childNode) {
                let kidID = childNode.person._data.Id;
                condLog("child:", kidID);
                if (listOfUniqueKids.indexOf(kidID) == -1) {
                    listOfUniqueKids.push(kidID);
                }
            }
        }
        return listOfUniqueKids;
    }

    function findElementInRepeatAncestorsList(anAhnNum) {
        for (let index = 0; index < WebsView.listOfRepeatAncestors.length; index++) {
            const element = WebsView.listOfRepeatAncestors[index];
            if (element && element.AhnNums && element.AhnNums.length > 0 && element.AhnNums.indexOf(anAhnNum) > -1) {
                return element;
            }
        }
        return { id: -1, AhnNums: [] };
    }

    function findElementInRepeatAncestorsListByID(Id) {
        for (let index = 0; index < WebsView.listOfRepeatAncestors.length; index++) {
            const element = WebsView.listOfRepeatAncestors[index];
            if (element && element.id && element.id == Id) {
                return element;
            }
        }
        return { id: -1, AhnNums: [] };
    }

    function calculateNodePositions(nodes) {
        condLog("BIG CALCULATIONS SHOULD GO HERE to do NODE POSITIONING PROPER", { nodes });
        for (let index = 0; index < nodes.length; index++) {
            const element = nodes[index];
            if (element.ahnNum == 1) {
                condLog("Node for p ", element.p, " @ ", element.newX);
            }
        }
        let orderedNodes = [];
        let minWidthApart = 20;
        let maxAhnNum = 2 ** WebsView.numGens2Display - 1;
        let usedPercentiles = []; // to keep track of percentiles that have been used already so we don't duplicate and send two people to the same location!
        let uniqueListById = {};
        let uniqueParentsByID = {};
        let bkgdColourSetting = WebsView.currentSettings["colour_options_background"];
        let fontColourSetting = WebsView.currentSettings["colour_options_numColours"];
        let closestPosNumArray = [];

        for (let index = 0; index < nodes.length; index++) {
            const element = nodes[index];
            let thisAhnNum = element.ahnNum;
            let pNum = 0; // person number -> for use with MultiPrimePerson layouts like COMMON and SINGLES
            if (element.p && element.p >= 0) {
                pNum = element.p;
            }
            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = 1 + Math.floor(Math.log2(thisAhnNum));
            // Calculate which position # (starting lower left and going clockwise around the Ancestor Webs) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = thisAhnNum - 2 ** (thisGenNum - 1);

            let thisPercentile = (1 + 2 * thisPosNum) / 2 ** thisGenNum + 1.0 * pNum;
            usedPercentiles.push(thisPercentile);

            let thisID = element.person._data.Id;

            condLog(
                thisAhnNum,
                thisGenNum,
                thisPosNum,
                ":",
                thisID,
                ":",
                1 + 2 * thisPosNum,
                "/",
                2 ** thisGenNum,
                "=",
                thisPercentile
            );
            orderedNodes.push([thisPercentile, thisAhnNum, thisGenNum, thisPosNum, element, 0, pNum]);
            let theClr = "blue";
            let fontClr = "Black";

            let theParentIDs = "";
            if (
                thePeopleList[thisID]._data.Father &&
                thePeopleList[thisID]._data.Father > 0 &&
                thePeopleList[thisID]._data.Mother &&
                thePeopleList[thisID]._data.Mother > 0
            ) {
                theParentIDs = thePeopleList[thisID]._data.Father + "|" + thePeopleList[thisID]._data.Mother;
            } else if (thePeopleList[thisID]._data.Father && thePeopleList[thisID]._data.Father > 0) {
                theParentIDs = thePeopleList[thisID]._data.Father;
            } else if (thePeopleList[thisID]._data.Mother && thePeopleList[thisID]._data.Mother > 0) {
                theParentIDs = thePeopleList[thisID]._data.Mother;
            }

            if (uniqueListById[thisID]) {
                // add to arrays for thisID, since this means it exists already, so this is AT LEAST its second appearance of thisID
                uniqueListById[thisID].pNums.push(pNum);
                uniqueListById[thisID].ahnNums.push(thisAhnNum);
                uniqueListById[thisID].genNums.push(thisGenNum);
                uniqueListById[thisID].percentiles.push(thisPercentile);

                if (repeatAncestorTracker[thisID]) {
                    theClr = repeatAncestorTracker[thisID];
                    fontClr = uniqueListById[thisID].fontClr;
                } else {
                    numRepeatAncestors++;
                    if (bkgdColourSetting == "light") {
                        theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                        if (fontColourSetting == "multi") {
                            let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                            let fontClrNum = numRepeatAncestors % 4;
                            fontClr = fontClrsArray[fontClrNum];
                            // ancestorObject.person._data.fontClr = fontClr;
                            // condLog("CHOSE fontClr:", fontClr);
                        }
                    } else if (bkgdColourSetting == "dark") {
                        theClr = LineColourArray[numRepeatAncestors % LineColourArray.length];
                        fontClr = "White";
                        if (fontColourSetting == "multi") {
                            let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                            let fontClrNum = numRepeatAncestors % 4;
                            fontClr = fontClrsArray[fontClrNum];
                            // ancestorObject.person._data.fontClr = fontClr;
                            // condLog("CHOSE fontClr:", fontClr);
                        }
                    } else if (bkgdColourSetting == "both") {
                        let theClrNum = numRepeatAncestors % (ColourArray.length + LineColourArray.length);
                        if (theClrNum < ColourArray.length) {
                            theClr = ColourArray[theClrNum];
                            fontClr = "Black";
                            if (fontColourSetting == "multi") {
                                let fontClrsArray = ["Black", "Blue", "Brown", "DarkGreen"];
                                let fontClrNum = numRepeatAncestors % 4;
                                fontClr = fontClrsArray[fontClrNum];
                                // ancestorObject.person._data.fontClr = fontClr;
                                //  condLog("CHOSE fontClr:", fontClr);
                            }
                        } else {
                            theClr = LineColourArray[theClrNum - ColourArray.length];
                            fontClr = "White";
                            if (fontColourSetting == "multi") {
                                let fontClrsArray = ["White", "Yellow", "Cyan", "Lime"];
                                let fontClrNum = numRepeatAncestors % 4;
                                fontClr = fontClrsArray[fontClrNum];
                                // ancestorObject.person._data.fontClr = fontClr;
                                // condLog("CHOSE fontClr:", fontClr);
                            }
                        }
                    } else {
                        theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                    }
                    repeatAncestorTracker[thisID] = theClr;
                    repeatAncestorCounter.push(thisID);

                    uniqueListById[thisID].theClr = theClr;
                    uniqueListById[thisID].fontClr = fontClr;
                    condLog("Adding new Repeat Ancestor to the Tracker: ", thisID, theClr, fontClr);
                }
                thePeopleList[thisID]._data["theClr"] = theClr;
                thePeopleList[thisID]._data["fontClr"] = fontClr;
            } else {
                // create new entry for new ID
                if (thisAhnNum % 2 == 1) {
                    theClr = "red";
                }

                uniqueListById[thisID] = {
                    Id: thisID,
                    pNums: [pNum],
                    ahnNums: [thisAhnNum],
                    genNums: [thisGenNum],
                    percentiles: [thisPercentile],
                    theClr: theClr,
                    parentIDs: theParentIDs,
                    siblingsList: [],
                };
            }

            if (uniqueParentsByID[theParentIDs]) {
                if (thisID > "" && uniqueParentsByID[theParentIDs].indexOf(thisID) == -1) {
                    uniqueParentsByID[theParentIDs].push(thisID);
                }
            } else {
                uniqueParentsByID[theParentIDs] = [thisID];
            }
        }
        // At this point, every ancestor has either a BLUE or RED theClr assigned to them

        condLog(WebsView.listOfRepeatAncestors);
        condLog("UNIQUE LIST BY ID:", uniqueListById);
        condLog("UNIQUE Parents BY ID:", uniqueParentsByID);

        for (const Ps in uniqueParentsByID) {
            if (Ps > "" && uniqueParentsByID[Ps].length > 1) {
                condLog("MULTI KID: ", uniqueParentsByID[Ps], Ps);
                for (const KidNum in uniqueParentsByID[Ps]) {
                    let KidID = uniqueParentsByID[Ps][KidNum];
                    condLog("Kid:", KidID);
                    if (KidID && thePeopleList[KidID]) {
                        thePeopleList[KidID]._data["theSiblings"] = uniqueParentsByID[Ps];
                        thePeopleList[KidID]._data["thePs"] = Ps;
                    }
                }

                let theIDs = Ps.split("|");

                repeatAncestorLineTracker.push(Ps);

                if (
                    theIDs.length == 2 &&
                    theIDs[0] &&
                    theIDs[1] &&
                    thePeopleList[theIDs[0]] &&
                    thePeopleList[theIDs[1]] &&
                    thePeopleList[theIDs[0]]._data["theClr"] &&
                    repeatAncestorTracker[theIDs[1]]
                ) {
                    thePeopleList[theIDs[1]]._data["theClr"] = thePeopleList[theIDs[0]]._data["theClr"];
                    thePeopleList[theIDs[1]]._data["fontClr"] = thePeopleList[theIDs[0]]._data["fontClr"];
                    repeatAncestorTracker[theIDs[1]] = thePeopleList[theIDs[0]]._data["theClr"];
                    if (uniqueListById[theIDs[1]]) {
                        uniqueListById[theIDs[1]]["fontClr"] = thePeopleList[theIDs[0]]._data["fontClr"];
                    }
                }
            }
        }

        if (WebsView.viewMode == "Unique" || WebsView.viewMode == "Indi" || WebsView.viewMode == "Repeats") {
            let minGenNum = 999;
            let maxGenNum = -1;
            let shortListOfRepeatAncs = [];
            for (let index = 0; index < WebsView.listOfRepeatAncestors.length; index++) {
                const element = WebsView.listOfRepeatAncestors[index];
                condLog("ELEMENT IN LOOP:", element);
                let sumOfX = 0;
                let sumOfY = 0;
                let numOfX = 0;
                let maxGenNum4This = 0;
                //let lastAhnNum = 0;
                for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
                    const anAhnNum = element.AhnNums[innerIndex];
                    if (anAhnNum <= maxAhnNum) {
                        sumOfX += findPercentileForAhnNum(anAhnNum, orderedNodes, WebsView.currentPrimeNum);
                        let thisOnesGenNum = Math.floor(Math.log2(anAhnNum));
                        maxGenNum4This = thisOnesGenNum;
                        sumOfY += thisOnesGenNum;
                        minGenNum = Math.min(minGenNum, thisOnesGenNum);
                        maxGenNum = Math.max(maxGenNum, thisOnesGenNum);
                        numOfX++;
                        //lastAhnNum = anAhnNum;
                    }
                }
                let newPercentile = sumOfX / numOfX;
                let avgGenNum = maxGenNum4This; // sumOfY / numOfX;

                // LET's ENSURE THAT THE NEW PERCENTILE IS BETWEEN COUPLES and NOT in the MIDDLE of a COUPLE (at the highest GEN)
                let closestPosNum = Math.ceil(
                    (2 ** (maxGenNum + 2) * (newPercentile - 1.0 * WebsView.currentPrimeNum) - 1) / 2
                );
                // condLog("CLOSEST POS NUM @ gen ", maxGenNum, " is ", closestPosNum);
                // ROUND to nearest multiple of 8 (to make it directly above an empty space from below)
                closestPosNum = 8 * Math.max(1, Math.round(closestPosNum / 8));
                // while (closestPosNumArray.length > 0 && closestPosNumArray.indexOf(closestPosNum) > -1) {
                //     closestPosNum += 2;
                // }
                closestPosNumArray.push(closestPosNum);
                // condLog("==> ", closestPosNum + " / " + (2 ** (maxGenNum + 1) ));
                if (element.AhnNums[0] % 2 == 0) {
                    closestPosNum -= 0.5;
                    if (WebsView.viewMode == "Indi") {
                    } else {
                        shortListOfRepeatAncs.push(index); /// add the INDEX from the LIST OF REPEAT ANCESTORS to this SHORT LIST - then - we will come back to him
                    }
                } else if (WebsView.viewMode == "Indi") {
                    // shortListOfRepeatAncs.push(index); /// add the INDEX from the LIST OF REPEAT ANCESTORS to this SHORT LIST - then - we will come back to him
                } else {
                    closestPosNum += 0.5;
                }

                newPercentile = closestPosNum / 2 ** (maxGenNum + 1) + 1.0 * WebsView.currentPrimeNum;
                // (1 + 2 * closestPosNum) / 2 ** (maxGenNum + 1) + 1.0 * WebsView.currentPrimeNum + 0.00001;

                // newPercentile = (1 + 2 * closestPosNum) / 2 ** (maxGenNum + 1) + 1.0 * WebsView.currentPrimeNum + 0.00001;

                while (usedPercentiles.indexOf(newPercentile) > -1) {
                    newPercentile += 0.00001;
                }
                usedPercentiles.push(newPercentile);

                // condLog("Final Percentile:", newPercentile, thePeopleList[element.id].getDisplayName(), avgGenNum);

                for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
                    const anAhnNum = element.AhnNums[innerIndex];
                    assignPercentileForAhnNum(
                        anAhnNum,
                        orderedNodes,
                        newPercentile,
                        avgGenNum,
                        // maxGenNum,
                        WebsView.currentPrimeNum
                    );
                }
            }
            WebsView.repeatsStartAtGenNum = minGenNum;
            condLog("shortListOfRepeatAncs", shortListOfRepeatAncs);
            // OK - now LET'S REVISIT some of those REPEAT ANCESTORS and RELOCATE THEIR LOVED ONES (WIVES & ANCESTORS OF THEM AND THEIR WIVES)
            for (let ii = 0; ii < shortListOfRepeatAncs.length; ii++) {
                let index = shortListOfRepeatAncs[ii];
                const element = WebsView.listOfRepeatAncestors[index];
                // condLog("LET'S CHECK FOR # OF UNIQUE KIDS, THEN SHOULD  TRY AND RELOCATE THE WIFE AND PARENTS OF ", index, element);
                let listOfUniqueKids = findListOfUniqueKidsIDs(element, nodes, WebsView.currentPrimeNum);
                condLog("ELEMENT IN LOOP / listOfUniqueKids:", element, listOfUniqueKids, thePeopleList[element.id]);

                // for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
                //     const anAhnNum = element.AhnNums[innerIndex];
                //     const childAhnNum = Math.floor(anAhnNum / 2);
                //     let childNode = findMatchingNodeByAhnNum(childAhnNum, nodes, WebsView.currentPrimeNum);
                //     if (childNode){
                //         let kidID = childNode.person._data.Id;
                //         condLog("child:", kidID);
                //         if (listOfUniqueKids.indexOf(kidID) == -1) {
                //             listOfUniqueKids.push(kidID);
                //         }
                //     }
                // }
                if (listOfUniqueKids.length > 1) {
                    let keeperPercentile = findPercentileForAhnNum(
                        element.AhnNums[0],
                        orderedNodes,
                        WebsView.currentPrimeNum
                    );
                    if (keeperPercentile == 0 && element.AhnNums.length > 1) {
                        keeperPercentile = findPercentileForAhnNum(
                            element.AhnNums[1],
                            orderedNodes,
                            WebsView.currentPrimeNum
                        );
                    }
                    let keeperGenNum = findGenNumForAhnNumChild(
                        element.AhnNums[0],
                        orderedNodes,
                        WebsView.currentPrimeNum
                    );
                    if (keeperGenNum == 0 && element.AhnNums.length > 1) {
                        keeperGenNum = findGenNumForAhnNumChild(
                            element.AhnNums[1],
                            orderedNodes,
                            WebsView.currentPrimeNum
                        );
                    }
                    condLog(
                        "MAX GENS: WebsView.numGens2Display = ",
                        WebsView.numGens2Display,
                        "WebsView.maxNumGens",
                        WebsView.maxNumGens
                    );
                    condLog(
                        "THIS IS A KEEPER - newY - I MEAN _ SOMEONE WE NEED TO FIND WIFE AND PARENTS FOR",
                        keeperPercentile,
                        keeperGenNum,
                        element,
                        thePeopleList[element.id]
                    );
                    for (let innerIndex = 0; innerIndex < element.AhnNums.length; innerIndex++) {
                        const anAhnNum = element.AhnNums[innerIndex];

                        // reassign the Parents
                        let d1 = reAssignPercentilesForParents(
                            anAhnNum,
                            nodes,
                            orderedNodes,
                            keeperPercentile,
                            keeperGenNum, //WebsView.numGens2Display,
                            WebsView.currentPrimeNum
                        );

                        let wifeNode = findElementInRepeatAncestorsList(anAhnNum + 1);

                        let wifeUniqueKidsIDs = [];
                        if (wifeNode) {
                            wifeUniqueKidsIDs = findListOfUniqueKidsIDs(wifeNode, nodes, WebsView.currentPrimeNum);
                        }
                        // if (thePeopleList[element.id]._data.BirthNamePrivate == "Henri Perrin") {
                        //     condLog("HENRI HENRI ... " ,wifeNode, wifeUniqueKidsIDs,keeperPercentile);
                        // }

                        if (wifeUniqueKidsIDs.length > 1) {
                            // reassign the Wife
                            assignPercentileForAhnNum(
                                anAhnNum + 1,
                                orderedNodes,
                                keeperPercentile + 1 / 2 ** (WebsView.numGens2Display + 2),
                                keeperGenNum,
                                WebsView.currentPrimeNum
                            );

                            // reassign the In-Laws
                            let d2 = reAssignPercentilesForParents(
                                anAhnNum + 1,
                                nodes,
                                orderedNodes,
                                keeperPercentile + 1 / 2 ** (WebsView.numGens2Display + 2),
                                keeperGenNum, //WebsView.numGens2Display,
                                WebsView.currentPrimeNum
                            );
                        } else {
                            let theActualNode = findMatchingNodeByAhnNum(anAhnNum + 1, nodes, WebsView.currentPrimeNum);
                            if (theActualNode) {
                                theActualNode.person._data.theClr = "#B0B0B0";
                            }
                        }
                    }
                } else {
                    let theDudPerson = thePeopleList[element.id];
                    if (theDudPerson) {
                        theDudPerson._data.theClr = "#B0B0B0";
                        // condLog("dud", theDudPerson);
                    }

                    // for (let d = 0; d < element.AhnNums.length; d++) {

                    //     let theDudBox = document.getElementById(
                    //         "wedgeBoxFor" + element.AhnNums[d] + "p" + WebsView.currentPrimeNum
                    //     );
                    //     if (theDudBox){
                    //         theDudBox.setAttribute("style", "background-color: " + theDudPerson._data.theClr + ";");
                    //         condLog("dudBox", theDudBox);
                    //     } else {
                    //         condLog(
                    //             "Can't find: ",
                    //             "wedgeBoxFor" + element.AhnNums[d] + "p" + WebsView.currentPrimeNum
                    //         );
                    //     }
                    // }
                }
            }

            condLog("All Ordered Nodes:", orderedNodes);
        } else if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
            let minGenNum = 999;
            let listOfKids2AutoPromoteParents = [];

            // uniqueListById.forEach((element) =>
            for (const ID in uniqueListById) {
                let element = uniqueListById[ID];
                condLog("forEach : ", element.Id, element.genNums, element.ahnNums, element.pNums);
                let thisPercentile = 0;
                let thisGenNum = 0;
                if (element.pNums.length == 1) {
                    thisPercentile = element.percentiles[0];
                    thisGenNum = element.genNums[0];
                } else {
                    thisPercentile = avgArrayValue(element.percentiles, element.ahnNums, maxAhnNum);
                    thisGenNum = maxArrayValue(element.genNums);
                    let doAutoPromoteParents = false;
                    for (let uNum = 0; uNum < element.pNums.length; uNum++) {
                        const anAhnNum = element.ahnNums[uNum];
                        const thisPNum = element.pNums[uNum];
                        if (element.genNums[uNum] < WebsView.numGens2Display) {
                            doAutoPromoteParents = true;
                        }
                        assignPercentileForAhnNum(anAhnNum, orderedNodes, thisPercentile, thisGenNum, thisPNum);
                    }
                    if (doAutoPromoteParents == true) {
                        listOfKids2AutoPromoteParents.push(element.Id);
                    }
                }
                element.maxGenNum = thisGenNum;
                element.thisPercentile = thisPercentile;
            }

            condLog("listOfKids2AutoPromoteParents (line 1947)  = ", listOfKids2AutoPromoteParents);

            let numReps = 0;
            for (let i = 0; i < listOfKids2AutoPromoteParents.length && numReps < 1000; i++) {
                numReps++;
                const thisID = listOfKids2AutoPromoteParents[i];
                let thisUniqueKid = uniqueListById[thisID];
                let thisPerson = thePeopleList[thisID];
                let doGrayifyParents = false;

                condLog("listOfKids2AutoPromoteParents : ", thisID, thisUniqueKid.maxGenNum, thisUniqueKid, thisPerson);

                if (thisUniqueKid.siblingsList.length == 0) {
                    condLog("GRAYIFY THE PARENTS");
                    doGrayifyParents = true;
                }

                if (
                    thisPerson &&
                    thisPerson._data &&
                    thisPerson._data.Mother &&
                    uniqueListById[thisPerson._data.Mother]
                ) {
                    let thisParent = uniqueListById[thisPerson._data.Mother];
                    let thisGenNum = Math.max(thisParent.maxGenNum, 1.0 * thisUniqueKid.maxGenNum + 1.0);
                    let thisPercentile = thisParent.thisPercentile;

                    if (doGrayifyParents && thePeopleList[thisPerson._data.Mother]) {
                        // CHECK TO SEE IF MOTHER (and later FATHER) are IN THE LEGIT LIST OF COMMON ANCESTORS - IF NOT ... then GRAYIFY, ELSE LEAVE COLOURED
                        // WRONG:  WE ALSO REALLY NEED HERE  to CHECK IF THEY are in a LIST of those with MULTIPLE CHILDREN - IF not, then GRAYIFY
                        // OR .. MAYBE IT'S JUST THAT THE UNIQUE KIDS SIBLING LIST IS NOT BEING PROPERLY UPDATED ????
                        if (
                            thePeopleList[thisPerson._data.Mother] &&
                            thePeopleList[thisPerson._data.Mother].allSameKid &&
                            thePeopleList[thisPerson._data.Mother].allSameKid == true
                        ) {
                            thePeopleList[thisPerson._data.Mother]._data.theClr = "#B0B0B0";
                        } else if (WebsView.listOfLegitCommonIDs.indexOf(thisPerson._data.Mother) == -1) {
                            // thePeopleList[thisPerson._data.Mother]._data.theClr = "#FFFF00";
                        }
                    }

                    //  if (thisParent.pNums.length == 1) {
                    if (numValuesInRange(thisParent.ahnNums, maxAhnNum) == 1) {
                        thisPercentile = thisUniqueKid.thisPercentile + 0.000001;
                        assignPercentileForAhnNum(
                            thisParent.ahnNums[0],
                            orderedNodes,
                            thisPercentile,
                            thisGenNum,
                            thisParent.pNums[0]
                        );
                    } else {
                        let doAutoPromoteParents = false;

                        let sumPercentile = 0;
                        let numSums = 0;
                        for (let uNum = 0; uNum < thisParent.pNums.length; uNum++) {
                            const kidAhnNum = Math.floor(thisParent.ahnNums[uNum] / 2);
                            const thisPNum = thisParent.pNums[uNum];
                            const theChild = WebsView.listOfAhnentafels[thisPNum].list[kidAhnNum];
                            if (theChild && uniqueListById[theChild] && uniqueListById[theChild].thisPercentile) {
                                sumPercentile += uniqueListById[theChild].thisPercentile;
                                numSums++;
                                condLog("listOfKids : Ma -> kid @ ", uniqueListById[theChild].thisPercentile);
                            } else {
                                condLog(
                                    "listOfKids : Ma -> DOES NOT COMPUTE ",
                                    kidAhnNum,
                                    thisPNum,
                                    WebsView.listOfAhnentafels[thisPNum],
                                    theChild,
                                    uniqueListById[theChild]
                                );
                            }
                            // assignPercentileForAhnNum(anAhnNum, orderedNodes, thisPercentile, thisGenNum, thisPNum);
                        }
                        if (numSums > 0) {
                            thisPercentile = sumPercentile / numSums + 0.000001;
                        }

                        for (let uNum = 0; uNum < thisParent.pNums.length; uNum++) {
                            const anAhnNum = thisParent.ahnNums[uNum];
                            const thisPNum = thisParent.pNums[uNum];
                            //  if (thisParent.genNums[uNum] < WebsView.numGens2Display) {
                            doAutoPromoteParents = true;
                            //  }
                            assignPercentileForAhnNum(anAhnNum, orderedNodes, thisPercentile, thisGenNum, thisPNum);
                        }
                        if (doAutoPromoteParents == true) {
                            listOfKids2AutoPromoteParents.push(thisParent.Id);
                        }
                    }
                }

                if (
                    thisPerson &&
                    thisPerson._data &&
                    thisPerson._data.Father &&
                    uniqueListById[thisPerson._data.Father]
                ) {
                    let thisParent = uniqueListById[thisPerson._data.Father];
                    let thisGenNum = Math.max(thisParent.maxGenNum, 1.0 * thisUniqueKid.maxGenNum + 1.0);
                    let thisPercentile = thisParent.thisPercentile;

                    if (doGrayifyParents && thePeopleList[thisPerson._data.Father]) {
                        if (
                            thePeopleList[thisPerson._data.Father] &&
                            thePeopleList[thisPerson._data.Father].allSameKid &&
                            thePeopleList[thisPerson._data.Father].allSameKid == true
                        ) {
                            thePeopleList[thisPerson._data.Father]._data.theClr = "#B0B0B0";
                        } else if (WebsView.listOfLegitCommonIDs.indexOf(thisPerson._data.Father) == -1) {
                            // thePeopleList[thisPerson._data.Father]._data.theClr = "#FFFF00";
                        }

                        // if (WebsView.listOfLegitCommonIDs.indexOf(thisPerson._data.Father) == -1) {
                        //     thePeopleList[thisPerson._data.Father]._data.theClr = "#00FF00";
                        //     condLog("thisParent just gone Gray:", thisParent);
                        // }
                    }

                    // if (thisParent.pNums.length == 1) {
                    if (numValuesInRange(thisParent.ahnNums, maxAhnNum) == 1) {
                        thisPercentile = thisUniqueKid.thisPercentile - 0.000001;
                        assignPercentileForAhnNum(
                            thisParent.ahnNums[0],
                            orderedNodes,
                            thisPercentile,
                            thisGenNum,
                            thisParent.pNums[0]
                        );
                    } else {
                        let doAutoPromoteParents = false;
                        // re-calculate thisPercentile based on thisPercentile of the CHILDREN (since they themselves may have shifted position! Ha - did you ever think of that ??) //
                        let sumPercentile = 0;
                        let numSums = 0;
                        for (let uNum = 0; uNum < thisParent.pNums.length; uNum++) {
                            const kidAhnNum = Math.floor(thisParent.ahnNums[uNum] / 2);
                            const thisPNum = thisParent.pNums[uNum];
                            const theChild = WebsView.listOfAhnentafels[thisPNum].list[kidAhnNum];
                            if (theChild && uniqueListById[theChild] && uniqueListById[theChild].thisPercentile) {
                                condLog("listOfKids : Pa -> kid @ ", uniqueListById[theChild].thisPercentile);
                                sumPercentile += uniqueListById[theChild].thisPercentile;
                                numSums++;
                            } else {
                                condLog("listOfKids : Pa - DOES NOT COMPUTE");
                            }
                            // assignPercentileForAhnNum(anAhnNum, orderedNodes, thisPercentile, thisGenNum, thisPNum);
                        }
                        if (numSums > 0) {
                            thisPercentile = sumPercentile / numSums - 0.000001;
                        }

                        for (let uNum = 0; uNum < thisParent.pNums.length; uNum++) {
                            const anAhnNum = thisParent.ahnNums[uNum];
                            const thisPNum = thisParent.pNums[uNum];
                            // if (thisParent.genNums[uNum] < WebsView.numGens2Display) {
                            doAutoPromoteParents = true;
                            // }
                            assignPercentileForAhnNum(anAhnNum, orderedNodes, thisPercentile, thisGenNum, thisPNum);
                        }
                        if (doAutoPromoteParents == true) {
                            listOfKids2AutoPromoteParents.push(thisParent.Id);
                        }
                    }
                }
            }

            if (numReps >= 1000) {
                condLog("WARNING ::: !!!! - NUM REPS = ", numReps);
            } else {
                condLog("NUM REPS = ", numReps);
            }
            condLog("listOfKids2AutoPromoteParents : ", listOfKids2AutoPromoteParents);
        } // END of if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles" ) //

        let newOrder = orderedNodes.sort();
        condLog("newOrder:\n", newOrder);
        condLog("minWidthApart:\n", minWidthApart);
        let maxWidth = (newOrder.length - 1) * minWidthApart;
        if (WebsView.viewMode == "Indi") {
            maxWidth *= 3;
        }

        let lastX = 0;
        let lastPercentile = -1;
        let xBuffer = 0;
        let lastY = -1;

        let avgWidthApart = maxWidth / (newOrder.length - 1);
        condLog("avgWidthApart:\n", avgWidthApart);
        for (let index = 0; index < newOrder.length; index++) {
            const newElement = newOrder[index];
            let thisNameAsPerSettings = newElement[4].person._data.Id;
            if (newElement[4].person) {
                thisNameAsPerSettings = getNameAsPerSettings(newElement[4].person);
            }
            let thisPercentile = newElement[0];
            // let newX = maxWidth * ( thisPercentile - 0.5);
            let newX = maxWidth * ((index + xBuffer) / (newOrder.length - 1) - 0.5);
            if (thisNameAsPerSettings == "JM") {
                condLog("Calculating for JM:", newX, maxWidth, index, xBuffer, newOrder.length, thisPercentile);
            }
            // force the original dog, the CENTRAL PERSON to be in the MIDDLE horizontally, despite how lopsided the rest of the tree is.
            if (newElement[1] == 1) {
                // AhnenTafel #
                if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
                    // do something different probably
                    if (newElement[6] == 0) {
                        // prime #
                        newX = maxWidth * (0 - 0.5);
                    } else if (newElement[6] == 1) {
                        // prime #
                        newX = maxWidth * (0 + 0.5);
                    }
                    condLog("PRIME Xs : ", newX, newElement);
                } else {
                    newX = 0;
                }
            } else if (thisPercentile == lastPercentile) {
                newX = lastX;
            } else if (newElement[5] == lastY && newElement[5] > 0 && lastY > 0) {
                xBuffer++;
                newX = maxWidth * ((index + xBuffer) / (newOrder.length - 1) - 0.5);
            }

            lastPercentile = thisPercentile;
            lastX = newX;
            lastY = newElement[5];

            newElement[4]["newX"] = newX;
            newElement[4]["newY"] = newElement[5];

            // condLog("Element # " + index, "newY = " + newElement[4]["newY"],thisNameAsPerSettings ,newElement[4]);
        }

        if (WebsView.viewMode == "Indi" && WebsView.currentSettings["path_options_multiPathFormat"] == "smooth") {
            condLog("SMOOTHING things out ..");
            let numsPerGen = [];
            let XsPerGen = [];
            let AhnsPerGen = [];
            let IndexPerGen = [];
            let maxNumsPerGen = 0;

            if (WebsView.listOfRepeatAncestors.length == 0) {
                WebsView.clearAll();
                showSummaryMessage("At " + WebsView.numGens2Display + " generations, there are 0 repeat ancestors.");
                return;
            }
            let theAncestorAtTop = WebsView.listOfRepeatAncestors[WebsView.repeatAncestorNum - 1];
            condLog("Ancestor AT TOP: ", getNameAsPerSettings(thePeopleList[theAncestorAtTop.id]));
            condLog("ahn #s", uniqueListById[theAncestorAtTop.id].ahnNums);
            // FIND  THE ANCESTOR AT TOP'S AHNENNUMS  ... then ... COMPARE THEM LATER ON in the THIS ES GEN section and increase to +1 more than # of GensToBeDisplayed
            condLog(
                "CurrentPrime: ",
                getNameAsPerSettings(thePeopleList[WebsView.listOfPrimePersons[WebsView.currentPrimeNum]])
            );
            condLog("NewOrder inside SMOOTH if stmt:", newOrder);
            maxWidth =
                24 *
                Math.max(
                    getNameAsPerSettings(thePeopleList[theAncestorAtTop.id]).length,
                    getNameAsPerSettings(thePeopleList[WebsView.listOfPrimePersons[WebsView.currentPrimeNum]]).length
                );
            for (let index = 0; index < newOrder.length; index++) {
                const newElement = newOrder[index];
                let thisEsGen = newElement[5];
                if (thisEsGen == 0) {
                    thisEsGen = Math.floor(Math.log2(newElement[1]));
                } else if (uniqueListById[theAncestorAtTop.id].ahnNums.indexOf(newElement[1]) > -1) {
                    condLog("Found a Boss @ #", newElement[1]);
                    newElement[5]++;
                    thisEsGen++;
                }

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
            condLog("Number per Generations is :", numsPerGen);
            condLog("Number of Xs per Generations is :", XsPerGen);
            condLog("Number of Ahns per Generations is :", AhnsPerGen);
            if (maxNumsPerGen > 2) {
                maxWidth = (maxWidth * maxNumsPerGen) / 2;
            }

            for (const key in numsPerGen) {
                if (Object.hasOwnProperty.call(numsPerGen, key)) {
                    const numPerGenRow = numsPerGen[key];
                    condLog(
                        "Number me this: PLACE ",
                        key,
                        "nums:",
                        numPerGenRow,
                        "Xs:",
                        XsPerGen[key],
                        "Ahns:",
                        AhnsPerGen[key],
                        "Index:",
                        IndexPerGen[key]
                    );

                    if (numPerGenRow == 1) {
                        newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                    } else if (numPerGenRow == 2) {
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
                    } else if (numPerGenRow > 2) {
                        // OKAY - first thing we have to do is to figure out how many discrete newX values we have, (numDvalues)
                        let discreteXs = [];
                        let indexOfDiscretes = [];

                        for (let miniIndex = 0; miniIndex < IndexPerGen[key].length; miniIndex++) {
                            const thisSubElement = IndexPerGen[key][miniIndex];
                            let whereThisFound = discreteXs.indexOf(newOrder[thisSubElement][4]["newX"]);
                            if (whereThisFound == -1) {
                                discreteXs.push(newOrder[thisSubElement][4]["newX"]);
                                indexOfDiscretes.push([miniIndex]);
                            } else {
                                indexOfDiscretes[whereThisFound].push(miniIndex);
                            }
                        }
                        let numDiscrete = discreteXs.length;
                        condLog(
                            "There are ",
                            numDiscrete,
                            " discrete X-values out of ",
                            numPerGenRow,
                            " entries",
                            discreteXs,
                            indexOfDiscretes
                        );

                        // THEN we need to sort them left to right by Ahnentafel # .... or .. at least we SHOULD do that...
                        // --> insert code here to do that to make sure ..... but ... going to skip this step for now and see what happens ... how bad could it be ???

                        // AND FINALLY ... then assign newX = maxWidth * (pos# - (1 +numDvalues)/2 ) * (2/ numDvalues) ; where pos# = 1 .. numDvalues
                        for (let iDiscrete = 0; iDiscrete < numDiscrete; iDiscrete++) {
                            const thisDiscreteX = discreteXs[iDiscrete];

                            // let thisNewX = thisDiscreteX;
                            // if (numDiscrete % 2 == 0) {
                            // even # of bins
                            let num = 0 - (numDiscrete - 1) + iDiscrete * 2;
                            let den = numDiscrete;
                            let thisNewX = (maxWidth * num) / den;
                            condLog("->", iDiscrete, "@", thisNewX);
                            // } else {
                            //     // odd # of bins
                            //     let num = 0 - (numDiscrete - 1) + iDiscrete * 2;
                            //     let den = numDiscrete;
                            //     thisNewX = (maxWidth * num) / den;
                            // }
                            // maxWidth * (1 + iDiscrete - (1 + discreteXs.length) / 2) * (2 / discreteXs.length);
                            for (let jDiscrete = 0; jDiscrete < indexOfDiscretes[iDiscrete].length; jDiscrete++) {
                                const anOriginalIndexNum = indexOfDiscretes[iDiscrete][jDiscrete];
                                newOrder[IndexPerGen[key][anOriginalIndexNum]][4]["newX"] = thisNewX;
                                // newOrder[anOriginalIndexNum][4]["newX"] = thisNewX;
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
                                newOrder[thisSubElement][4]["newY"] = newOrder[thisSubElement][5];
                            }
                        }
                    }
                    condLog("key = ", IndexPerGen[key]);
                }
            }
        } else if (
            (WebsView.viewMode == "Singles" || WebsView.viewMode == "Common") &&
            WebsView.currentSettings["path_options_multiPathFormat"] == "smooth"
        ) {
            let numsPerGen = [];
            let XsPerGen = [];
            let AhnsPerGen = [];
            let IndexPerGen = [];
            let uniqueList = [];
            let uniqueInfo = [];
            let maxNumsPerGen = 0;
            let maxGenNum = 0;

            if (WebsView.listOfLegitCommonAncestors.length == 0) {
                // NO COMMON ANCESTORS ... need to give that message loud and clear !

                condLog("NO COMMON ANCESTORS AT THIS LEVEL !!!!");
                return;
            }
            let theAncestorAtTop = WebsView.listOfLegitCommonAncestors[WebsView.commonAncestorNum - 1];
            theAncestorAtTop.id = theAncestorAtTop.Id;
            condLog("Ancestor AT TOP: ", getNameAsPerSettings(thePeopleList[theAncestorAtTop.Id]));
            condLog(
                "CurrentPrime: ",
                getNameAsPerSettings(thePeopleList[WebsView.listOfPrimePersons[WebsView.currentPrimeNum]])
            );

            let maxWidthMultplier = 24;
            if (
                WebsView.viewMode == "Common" &&
                (WebsView.currentSettings["name_options_multiNameFormat"] == "FName" ||
                    WebsView.currentSettings["name_options_multiNameFormat"] == "FLname" ||
                    WebsView.currentSettings["name_options_multiNameFormat"] == "FnameLname")
            ) {
                maxWidthMultplier = 2;
            }

            maxWidth =
                maxWidthMultplier *
                Math.max(
                    getNameAsPerSettings(thePeopleList[theAncestorAtTop.id]).length,
                    getNameAsPerSettings(thePeopleList[WebsView.listOfPrimePersons[WebsView.currentPrimeNum]]).length
                );

            condLog({ maxWidth });
            condLog({ newOrder });

            for (let index = 0; index < newOrder.length; index++) {
                const newElement = newOrder[index][4];
                if (newElement.ahnNum == 1) {
                    newElement.newX = newElement.p;
                }
            }

            for (let index = 0; index < newOrder.length; index++) {
                const newElement = newOrder[index];
                condLog(index, newElement);
                const thisEsGen = newElement[2]; // was 2 ... but should be 5, adjusted Y value
                const thisElementID = newElement[4].person._data.Id;
                if (!numsPerGen[thisEsGen]) {
                    numsPerGen[thisEsGen] = 0;
                    XsPerGen[thisEsGen] = [];
                    AhnsPerGen[thisEsGen] = [];
                    IndexPerGen[thisEsGen] = [];
                    maxGenNum = Math.max(maxGenNum, thisEsGen);
                }
                if (uniqueList.indexOf(thisElementID) > -1) {
                    // this person already exists in the unique list - so - must be a repeater - better update data on them
                    uniqueInfo[thisElementID].list.push(thisElementID);
                    if (newElement[1] > uniqueInfo[thisElementID].maxAhnenNum) {
                        uniqueInfo[thisElementID].maxAhnenNum = newElement[1];
                        uniqueInfo[thisElementID].maxIndex = index;
                    }
                } else {
                    // a unique person - let's add them to the array, and start an info file on them
                    uniqueList.push(thisElementID);
                    uniqueInfo[thisElementID] = { list: [thisElementID], maxAhnenNum: newElement[1], maxIndex: index };
                }
                numsPerGen[thisEsGen] += 1;
                XsPerGen[thisEsGen].push(newElement[4]["newX"]);
                AhnsPerGen[thisEsGen].push(newElement[1]);
                IndexPerGen[thisEsGen].push(index);
                maxNumsPerGen = Math.max(maxNumsPerGen, numsPerGen[thisEsGen]);
            }

            condLog("Number per Generations is :", numsPerGen);
            condLog("Number of Xs per Generations is :", XsPerGen);
            condLog("Number of Ahns per Generations is :", AhnsPerGen);
            if (maxNumsPerGen > 2) {
                maxWidth = (maxWidth * maxNumsPerGen) / 2;
            }
            condLog("ACTUAL MaxWidth used: ", maxWidth, "based on " + maxNumsPerGen + " peeps at busiest generation");
            for (const key in numsPerGen) {
                if (Object.hasOwnProperty.call(numsPerGen, key)) {
                    const numThisGen = numsPerGen[key];
                    condLog(
                        "Number me this: PLACE ",
                        key,
                        "nums:",
                        numThisGen,
                        "Xs:",
                        XsPerGen[key],
                        "Ahns:",
                        AhnsPerGen[key],
                        "Index:",
                        IndexPerGen[key]
                    );

                    // if (key == 1) {
                    //     // // With SINGLES - there will be MULTIPLE people at the LEVEL 1 - so - let's not bunch them together
                    // } else
                    if (numThisGen == 1) {
                        newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                    } else if (numThisGen == 2) {
                        let thisMaxWidth = maxWidth;
                        if (newOrder[IndexPerGen[key][0]][4]["ahnNum"] == 1) {
                            thisMaxWidth = Math.max(maxWidth, 250);
                        }
                        if (
                            newOrder[IndexPerGen[key][0]][4]["newX"] == newOrder[IndexPerGen[key][1]][4]["newX"] &&
                            newOrder[IndexPerGen[key][0]][4]["p"] == newOrder[IndexPerGen[key][1]][4]["p"]
                        ) {
                            // IF both x coordinates AND Prime Person #s are at the same location, then this is a repeat of the same person, so put them in the middle
                            newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                            newOrder[IndexPerGen[key][1]][4]["newX"] = 0;
                        } else if (newOrder[IndexPerGen[key][0]][4]["p"] < newOrder[IndexPerGen[key][1]][4]["p"]) {
                            // different primes, so let's put them in prime order
                            newOrder[IndexPerGen[key][0]][4]["newX"] = 0 - thisMaxWidth / 2;
                            newOrder[IndexPerGen[key][1]][4]["newX"] = 0 + thisMaxWidth / 2;
                        } else if (newOrder[IndexPerGen[key][0]][4]["p"] > newOrder[IndexPerGen[key][1]][4]["p"]) {
                            // different primes, so let's put them in prime order
                            newOrder[IndexPerGen[key][0]][4]["newX"] = 0 + thisMaxWidth / 2;
                            newOrder[IndexPerGen[key][1]][4]["newX"] = 0 - thisMaxWidth / 2;
                        } else {
                            // ELSE .. put them left and right, based on Ahnentafel # to line them up properly
                            if (AhnsPerGen[key][0] < AhnsPerGen[key][1]) {
                                newOrder[IndexPerGen[key][0]][4]["newX"] = 0 - thisMaxWidth / 2;
                                newOrder[IndexPerGen[key][1]][4]["newX"] = 0 + thisMaxWidth / 2;
                            } else {
                                newOrder[IndexPerGen[key][0]][4]["newX"] = 0 + thisMaxWidth / 2;
                                newOrder[IndexPerGen[key][1]][4]["newX"] = 0 - thisMaxWidth / 2;
                            }

                            // FINALLY .. double check to see if one of them is actually a duplicate of the "TOP DOG" single ancestor whose path we're leading to

                            // if (theAncestorAtTop.AhnNums.indexOf(AhnsPerGen[key][0]) > -1) {
                            //     newOrder[IndexPerGen[key][0]][4]["newX"] = 0;
                            // }
                            // if (theAncestorAtTop.AhnNums.indexOf(AhnsPerGen[key][1]) > -1) {
                            //     newOrder[IndexPerGen[key][1]][4]["newX"] = 0;
                            // }
                        }
                    } else if (numThisGen > 2) {
                        // OKAY - first thing we have to do is to figure out how many discrete newX values we have, (numDvalues)
                        let discreteXs = [];
                        let indexOfDiscretes = [];

                        let thisMaxWidth = maxWidth;
                        if (newOrder[IndexPerGen[key][0]][4]["ahnNum"] == 1) {
                            thisMaxWidth = Math.max(maxWidth, 250);
                        }

                        for (let miniIndex = 0; miniIndex < IndexPerGen[key].length; miniIndex++) {
                            const thisSubElement = IndexPerGen[key][miniIndex];
                            let whereThisFound = discreteXs.indexOf(newOrder[thisSubElement][4]["newX"]);
                            if (whereThisFound == -1) {
                                discreteXs.push(newOrder[thisSubElement][4]["newX"]);
                                indexOfDiscretes.push([miniIndex]);
                            } else {
                                indexOfDiscretes[whereThisFound].push(miniIndex);
                            }
                        }
                        let numDiscrete = discreteXs.length;
                        condLog(
                            "There are ",
                            numDiscrete,
                            " discrete X-values out of ",
                            numThisGen,
                            " entries",
                            discreteXs,
                            indexOfDiscretes
                        );

                        // THEN we need to sort them left to right by Ahnentafel # .... or .. at least we SHOULD do that...
                        // --> insert code here to do that to make sure ..... but ... going to skip this step for now and see what happens ... how bad could it be ???

                        // AND FINALLY ... then assign newX = maxWidth * (pos# - (1 +numDvalues)/2 ) * (2/ numDvalues) ; where pos# = 1 .. numDvalues
                        for (let iDiscrete = 0; iDiscrete < numDiscrete; iDiscrete++) {
                            const thisDiscreteX = discreteXs[iDiscrete];

                            // let thisNewX = thisDiscreteX;
                            // if (numDiscrete % 2 == 0) {
                            // even # of bins
                            let num = 0 - (numDiscrete - 1) + iDiscrete * 2;
                            let den = numDiscrete;
                            let thisNewX = (thisMaxWidth * num) / den;
                            condLog("->", iDiscrete, "@", thisNewX);
                            // } else {
                            //     // odd # of bins
                            //     let num = 0 - (numDiscrete - 1) + iDiscrete * 2;
                            //     let den = numDiscrete;
                            //     thisNewX = (maxWidth * num) / den;
                            // }
                            // maxWidth * (1 + iDiscrete - (1 + discreteXs.length) / 2) * (2 / discreteXs.length);
                            for (let jDiscrete = 0; jDiscrete < indexOfDiscretes[iDiscrete].length; jDiscrete++) {
                                const anOriginalIndexNum = indexOfDiscretes[iDiscrete][jDiscrete];
                                newOrder[IndexPerGen[key][anOriginalIndexNum]][4]["newX"] = thisNewX;
                                // newOrder[anOriginalIndexNum][4]["newX"] = thisNewX;
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
                            // if (theAncestorAtTop.AhnNums.indexOf(AhnsPerGen[key][index]) > -1) {
                            //     newOrder[thisSubElement][4]["newX"] = 0;
                            // }
                        }
                    }
                    condLog("key = ", IndexPerGen[key]);
                }
            }

            condLog("UNIQUE INFO:\n", uniqueInfo);

            // now - let's just revisit the nodes to ensure all the top ancestors are really at newX = 0
            // AND ... that other Unique ancestors share the same x and y coords as the Top Dog in that list
            for (let index = 0; index < newOrder.length; index++) {
                const newElement = newOrder[index];
                const thisElementID = newElement[4].person._data.Id;
                if (thisElementID == theAncestorAtTop.Id) {
                    newElement[4]["newX"] = 0;
                } else if (uniqueInfo[thisElementID].list.length > 1) {
                    // we have a repeater here !
                    if (uniqueInfo[thisElementID].maxIndex != index) {
                        // no need to do anything if this buddy is already the top dog
                        // BUT ... if NOT == maxIndex ... then let's update buddy
                        const topElement = newOrder[uniqueInfo[thisElementID].maxIndex];
                        condLog("Going to update ", newElement, " with ", topElement);
                        newOrder[index][4]["newX"] = topElement[4]["newX"];
                        newOrder[index][4]["newY"] = topElement[4]["newY"];
                    }
                }
            }
        }

        condLog(nodes);
        for (let index = 0; index < nodes.length; index++) {
            const element = nodes[index];
            if (element.ahnNum == 1) {
                condLog("Finally, Node for p ", element.p, " @ ", element.newX);
            }
        }
    }

    /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup = function (person) {
        if (!Utils.firstTreeAppPopUpPopped) {
            $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
            Utils.firstTreeAppPopUpPopped = true;
        }
        let whichList = 0;
        let whichAhnum = WebsView.myAhnentafel.listByPerson[person._data.Id];
        let listOfAhnsToUse = []; // by default, if the WebsView.viewMode is in Single Person view, no need for Lists of Ahnentatfels, but, if in Multi Person mode (MultiUnique or MultiSingle), then need the lists
        if (WebsView.listOfAhnentafels.length > 1 && whichAhnum == undefined) {
            for (let l = 1; l < WebsView.listOfAhnentafels.length && whichAhnum == undefined; l++) {
                whichList = l;
                whichAhnum = WebsView.listOfAhnentafels[l].listByPerson[person._data.Id];
            }
            listOfAhnsToUse = WebsView.listOfAhnentafels;
        }
        condLog("WebsView.viewMode:", WebsView.viewMode, WebsView.viewMode.indexOf("Multi"));
        if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
            listOfAhnsToUse = WebsView.listOfAhnentafels;
        }

        personPopup.popupHTML(
            person,
            {
                type: "Ahn",
                ahNum: whichAhnum, // WebsView.myAhnentafel.listByPerson[person._data.Id],
                whichList: whichList,
                primaryPerson: thePeopleList[WebsView.myAhnentafel.list[1]],
                myAhnentafel: WebsView.myAhnentafel,
                listOfAhnentafels: listOfAhnsToUse,
                SettingsObj: Utils,
            },
            AboutAppIcon,
            "webs"
        );

        // console.log("WebsView.personPopup");
    };

    function placeHolder4PersonPopup(person, xy) {
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

        let zoomFactor = Math.max(1, 1 / WebsView.currentScaleFactor);

        var popup = this.svg
            .append("g")
            .attr("class", "popup")
            .attr("transform", "translate(" + xy[0] + "," + xy[1] + ") scale(" + zoomFactor + ") ");

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
						    <span class="tree-links"><a onClick="newTree('${person.getName()}');" href="#"><img style="width:30px; height:24px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></a></span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>

				</div>
			`);

        d3.select("#view-container").on("click", function () {
            condLog("d3.select treeViewerContainer onclick - REMOVE POPUP");
            popup.remove();
        });
    }

    /**
     * Remove all popups. It will also remove
     * any popups displayed by other trees on the
     * page which is what we want. If later we
     * decide we don't want that then we can just
     * add the selector class to each popup and
     * select on it, like we do with nodes and links.
     */
    Tree.prototype.removePopups = function () {
        condLog("Tree.prototype - REMOVE POPUPS (plural) function");
        d3.selectAll(".popup").remove();
    };

    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        condLog("new var ANCESTOR TREE");

        // RESET the initial parameters

        WebsView.primePerson = null;
        WebsView.nextPrivateId = -1;
        WebsView.repeatsStartAtGenNum = 99;

        if (WebsView.viewMode == "Repeats" || WebsView.viewMode == "Indi") {
            WebsView.viewMode = "Full";
        }

        WebsView.currentPrimeNum = 0;
        WebsView.repeatAncestorNum = -1;
        WebsView.commonAncestorNum = -1;

        WebsView.numGens2Display = 5;
        WebsView.lastNumGens = 5;
        WebsView.numGensRetrieved = 5;
        WebsView.workingMaxNumGens = 6;
        condLog("Need to adjust WebsView.workingMaxNumGens -> ", WebsView.workingMaxNumGens);

        WebsView.myAhnentafel = new AhnenTafel.Ahnentafel();
        WebsView.listOfRepeatAncestors = [];

        Tree.call(this, svg, "ancestor", 1);
        this.children(function (person) {
            condLog("Defining the CHILDREN for ", person._data.Name);
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
     * Construct <first name>
     */
    function getFName(person) {
        // MiddleInitial is sometimes just ".", so we ignore it for now. We can fix/add it when
        // we factor name construction out into the person object
        return getFirstName(person);

        // //const middleInitialName = `${person.getFirstName()} ${person._data.MiddleInitial} ${person._data.LastNameAtBirth}`;
        // const noMiddleInitialName = `${getFirstName(person)} ${person._data.LastNameAtBirth}`;

        // if (birthName.length < maxLength) {
        //     return birthName;
        //     // } else if (middleInitialName.length < maxLength) {
        //     //     return middleInitialName;
        // } else if (noMiddleInitialName.length < maxLength) {
        //     return noMiddleInitialName;
        // } else {
        //     return `${getFirstInitial(person)}. ${person._data.LastNameAtBirth}`;
        // }
    }

    /**
     * Construct <first name> <last name> (first initial if needed)
     */
    function getFLname(person) {
        const maxLength = 20;

        // MiddleInitial is sometimes just ".", so we ignore it for now. We can fix/add it when
        // we factor name construction out into the person object
        const birthName = person.getDisplayName();
        //const middleInitialName = `${person.getFirstName()} ${person._data.MiddleInitial} ${person._data.LastNameAtBirth}`;
        const noMiddleInitialName = `${getFirstName(person)} ${person._data.LastNameAtBirth}`;

        if (birthName.length < maxLength) {
            return birthName;
            // } else if (middleInitialName.length < maxLength) {
            //     return middleInitialName;
        } else if (noMiddleInitialName.length < maxLength) {
            return noMiddleInitialName;
        } else {
            return `${getFirstInitial(person)}. ${person._data.LastNameAtBirth}`;
        }
    }
    /**
     * Get the first initial of the first name only
     */
    function getFirstInitial(person) {
        return getFirstName(person).substring(0, 1);
    }
    /**
     * Get the first initial of the Last Name at Birth
     */
    function getLastInitial(person) {
        if (person._data.LastNameAtBirth) {
            return `${person._data.LastNameAtBirth.substring(0, 1)}`;
        } else {
            return "?";
        }
    }

    /**
     * Get ALL the initials from every name
     */
    function getAllInitials(person) {
        let allInits = "";
        allInits += getInitials(getFirstName(person));
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
     * @returns The first name of the profile, or "?" if none could be found
     */
    function getFirstName(person) {
        // A non-trusted private profile does not have a FirstName or BirthName field, so we better check
        if (person._data.FirstName) {
            return person._data.FirstName;
        } else if (person._data.BirthNamePrivate) {
            return person._data.BirthNamePrivate.split(" ")[0];
        } else {
            return "?";
        }
    }
    /**
     * Get the full first name + LNAB
     */
    function getFirstLNAB(person) {
        return `${getFirstName(person)} ${person._data.LastNameAtBirth}`;
    }

    /**
     * Get the appropriate Name or set of Initials, based on the TYPE of viewMode AND the current Settings
     */
    function getNameAsPerSettings(person) {
        let thisNameSetting = "";
        let thisName = "";
        if (
            WebsView.viewMode == "Full" ||
            WebsView.viewMode == "Unique" ||
            WebsView.viewMode == "Repeats" ||
            WebsView.viewMode == "Common"
        ) {
            thisNameSetting = WebsView.currentSettings["name_options_multiNameFormat"];
        } else {
            thisNameSetting = WebsView.currentSettings["name_options_indiNameFormat"];
        }

        if (thisNameSetting == "F" || thisNameSetting == "FL" || thisNameSetting == "FML") {
            thisName = getFirstInitial(person);
        }
        if (thisNameSetting == "FL") {
            thisName += getLastInitial(person);
        }

        if (thisNameSetting == "FML") {
            thisName = getAllInitials(person);
        }
        if (thisNameSetting == "FName") {
            thisName = getFName(person);
        }
        if (thisNameSetting == "FLname") {
            thisName = getFLname(person);
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
        return getFirstName(thePeopleList[WebsView.myAhnentafel.list[1]]);
    }

    // Shortcut function to quickly retrieve the primary people's first names
    function primaryPeopleFirstNames() {
        let allFirsts = "";
        if (WebsView.viewMode == "Common" || WebsView.viewMode == "Singles") {
            for (let index = 0; index < WebsView.multiViewPrimaries.length; index++) {
                const listI = WebsView.multiViewPrimaries[index];
                const thisAhn = WebsView.listOfAhnentafels[listI];
                if (index > 0) {
                    allFirsts += " & ";
                }
                allFirsts += getFirstName(thePeopleList[thisAhn.list[1]]);
            }
        } else {
            for (let index = 0; index < WebsView.listOfAhnentafels.length; index++) {
                const thisAhn = WebsView.listOfAhnentafels[index];
                if (index > 0) {
                    allFirsts += " & ";
                }
                allFirsts += getFirstName(thePeopleList[thisAhn.list[1]]);
            }
        }
        return allFirsts;
    }

    // NEW FUNCTIONS HERE to DEAL WITH MULTIPLE ROOT PEOPLE

    function loadNewPrimaryPerson(newPrimeID, passNum = 1) {
        let loadingTD = document.getElementById("loadingTD");

        condLog("Need to load a NEW PRIMARY ", newPrimeID, WebsView.numGensRetrieved + " generations");
        flashWarningMessageBelowButtonBar("Please be patient while new family tree is being loaded ...");
        if (passNum > 1) {
            flashWarningMessageBelowButtonBar(
                "Thank you for your patience - need to retrieve a few more family members ..."
            );
        }
        //  let theListOfIDs = WebsView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        // condLog(theListOfIDs);
        if (newPrimeID.length == 0) {
            condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS - EMPTY STRING SENT !");
            //  clearMessageBelowButtonBar();
            //  WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            //  WebsView.numGensRetrieved++;
            //  WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);
        } else {
            // WikiTreeAPI.getAncestors(
            //     APP_ID,
            //     newPrimeID,
            let theListOfIDs = [newPrimeID];
            let theOptions = {};

            loadingTD.innerHTML = "loading";
            if (passNum == 1) {
                theOptions = { ancestors: Math.min(9, WebsView.numGensRetrieved) };
            } else if (passNum > 1 && WebsView.numGensRetrieved > 9) {
                theListOfIDs = WebsView.myAhnentafel.listOfAncestorsAtLevel(6);

                theOptions = { ancestors: WebsView.numGensRetrieved - 6, minGeneration: 3 };
            }
            // WikiTreeAPI.getAncestors(APP_ID ,id, 5, [
            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
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
                ],
                theOptions
            ).then(function (result) {
                if (result) {
                    WebsView.theAncestors = result[2];
                    condLog("getPeople RESULT:", result);

                    condLog("theAncestors:", WebsView.theAncestors);
                    condLog("WebsView.primePerson:", WebsView.primePerson);
                    condLog("B4 loop - thePeopleList had ", thePeopleList.population());
                    condLog("WebsView.theAncestors.length", Object.keys(result).length);

                    let thisNewID = newPrimeID; //WebsView.theAncestors[0].Id;
                    // condLog("FOUND id = ", result[1][newPrimeID].Id);
                    if (passNum == 1) {
                        thisNewID = result[1][newPrimeID].Id;
                        condLog("FOUND id = ", result[1][newPrimeID].Id);
                        WebsView.listOfPrimePersons.push(thisNewID);
                        WebsView.currentPrimeNum = WebsView.listOfPrimePersons.length - 1;
                    }

                    // WebsView.listOfPrimePersons.push(thisNewID);
                    // WebsView.currentPrimeNum = WebsView.listOfPrimePersons.length - 1;
                    let thisPrimeNum = WebsView.listOfPrimePersons.length;

                    condLog(
                        "passNum,thisPrimeNum,newPrimeID,WebsView.primePerson",
                        passNum,
                        thisPrimeNum,
                        newPrimeID,
                        WebsView.primePerson
                    );
                    // for (let index = 0; index < WebsView.theAncestors.length; index++) {
                    for (const ancID in WebsView.theAncestors) {
                        let thePerson = WebsView.theAncestors[ancID];
                        if (passNum == 1) {
                            if (thePerson.Id < 0) {
                                thePerson.Id = thisPrimeNum * 100 - thePerson.Id;
                                thePerson["Name"] = "Private-" + thePerson.Id;
                                thePerson["FirstName"] = "Private";
                                thePerson["LastNameAtBirth"] = "TBD!";
                            }
                            if (thePerson.Mother < 0) {
                                thePerson.Mother = thisPrimeNum * 100 - thePerson.Mother;
                            }
                            if (thePerson.Father < 0) {
                                thePerson.Father = thisPrimeNum * 100 - thePerson.Father;
                            }
                        }
                        thePeopleList.add(WebsView.theAncestors[ancID]);
                    }

                    let theNewPrimePerson = thePeopleList[thisNewID];
                    if (passNum == 1) {
                        theNewPrimePerson._data.Father = WebsView.theAncestors[thisNewID].Father;
                        theNewPrimePerson._data.Mother = WebsView.theAncestors[thisNewID].Mother;
                    }

                    condLog("theNewPrimePerson", thisNewID, theNewPrimePerson);

                    // PUT everyone into the Ahnentafel order ... which will include the private TBD! peeps if any
                    WebsView.myAhnentafel.update(theNewPrimePerson);

                    let relativeName = [
                        "kid",
                        "self",
                        "Father",
                        "Mother",
                        "Grandfather",
                        "Grandmother",
                        "Grandfather",
                        "Grandmother",
                        "Great-Grandfather",
                        "Great-Grandmother",
                        "Great-Grandfather",
                        "Great-Grandmother",
                        "Great-Grandfather",
                        "Great-Grandmother",
                        "Great-Grandfather",
                        "Great-Grandmother",
                    ];

                    // GO through the first chunk  (up to great-grandparents) - and swap out TBD! for their relaionship names
                    for (var a = 1; a < 16 && passNum == 1; a++) {
                        let thisPeep = thePeopleList[WebsView.myAhnentafel.list[a]];
                        // condLog("Peep ",a, thisPeep);
                        if (thisPeep && thisPeep._data["LastNameAtBirth"] == "TBD!") {
                            thisPeep._data["LastNameAtBirth"] = relativeName[a];
                            if (a % 2 == 0) {
                                thisPeep._data["Gender"] = "Male";
                            } else {
                                thisPeep._data["Gender"] = "Female";
                            }
                            // condLog("FOUND a TBD!", thisPeep);
                        }
                    }

                    if (passNum == 1 && WebsView.numGensRetrieved > 9) {
                        // NEED to PREP FOR PASS 2

                        loadNewPrimaryPerson(thisNewID, 2);
                    } else {
                        // FINALLY - set the PRIME PERSON, and the DRAW the Ancestor Tree
                        condLog("theNewPrimePerson:", theNewPrimePerson);
                        WebsView.primePerson = theNewPrimePerson;
                        WebsView.myAncestorTree.draw();
                        // self.drawTree(thePerson);
                        clearMessageBelowButtonBar();
                        condLog(
                            "AFT loop - thePeopleList had ",
                            thePeopleList.population(),
                            "people",
                            WebsView.listOfAhnentafels.length,
                            "Ahnentafels",
                            WebsView.listOfPrimePersons.length,
                            "primer persons",
                            "currentPrimeNum:",
                            WebsView.currentPrimeNum,
                            WebsView.myAhnentafel
                        );

                        while (WebsView.listOfAhnentafels.length < WebsView.listOfPrimePersons.length) {
                            WebsView.listOfAhnentafels.push(new AhnenTafel.Ahnentafel());
                        }

                        for (let index = 0; index < WebsView.listOfPrimePersons.length; index++) {
                            WebsView.listOfAhnentafels[index].update(
                                WebsView.PeopleList[WebsView.listOfPrimePersons[index]]
                            );
                        }
                        condLog("LIST of AHNENTAFELS:");
                        for (let index = 0; index < WebsView.listOfPrimePersons.length; index++) {
                            condLog(WebsView.listOfAhnentafels[index]);
                        }

                        if (WebsView.listOfAhnentafels.length == 3) {
                            WebsView.multiViewPrimaries = "012";
                        } else if (WebsView.listOfAhnentafels.length == 2) {
                            WebsView.multiViewPrimaries = "01";
                        }

                        recalculateCommonNames();
                        redoRootSelector();
                        loadingTD.innerHTML = "&nbsp;";
                        WebsView.redraw();
                    }
                    // }
                    condLog("thePeopleList:", thePeopleList);
                }
            });
        }
    }

    function minMin(arrayOfThings) {
        let theMinMin = 9999999999999;
        for (let index = 0; index < arrayOfThings.length; index++) {
            const element = arrayOfThings[index];
            if (typeof element == "object") {
                condLog("We have an array here");
                let thisMin = 9999999999999;
                for (let i = 0; i < element.length; i++) {
                    theMinMin = Math.min(thisMin, element[i]);
                }
                theMinMin = Math.min(theMinMin, thisMin);
            } else {
                theMinMin = Math.min(theMinMin, element);
            }
        }

        return theMinMin;
    }

    /* 
        Finds common elements between two arrays
         - from ChatOP.ai - 20 Feb 2025
        Prompt: I would like a JavaScript function that takes as input two arrays of integers, and then returns an array of integers that are in both the original arrays.
        To achieve the goal of finding common integers between two arrays in JavaScript, you can create a function that iterates through both arrays and identifies elements that are present in both. 

        Steps to Implement the Function
        Function Signature: Define a function that takes two arrays as parameters.
        Use a Set for Efficiency: Utilize JavaScript's Set to store elements from one of the arrays. This allows for efficient lookup operations.
        Filter Common Elements: Iterate through the second array and check if each element is present in the set created from the first array. If it is, include it in the result.
        Return the Result: The function should return an array containing the common elements.
    */
    function findCommonElements(array1, array2) {
        // Create a set from the first array
        const set1 = new Set(array1);

        // Filter the second array, keeping only elements that are in set1
        const commonElements = array2.filter((element) => set1.has(element));

        // Return the array of common elements
        return commonElements;
    }

    function recalculateCommonNames() {
        condLog("RECALCULATING COMMMON PEEPS NOW", WebsView.multiViewPrimaries);
        WebsView.listOfCommonAncestors = [];

        // IF there are ancestors in common - we only have to start with Ahnentafel 0 because they HAVE to be in that one at the very least to be in common with all
        // THEN ... we compare to see if they are in EACH of the other Ahnentafels
        // IF we find one in both - then they are in.
        // WE should probably calculate their joint MIN and their joint MAX ,,, and maybe consider only displaying them on the common chart if they are in max

        // OLD SCHOOL - very wasteful - for loop goes from 0 to highest ID #
        // for (let p = 0; p < WebsView.listOfAhnentafels[0].listByPerson.length; p++) {

        // NEW SCHOOL - much more efficient - only cycles through actual ID #s

        // NEWEST SCHOOL - use findCommonElements function to use Set / array.filter with set.has (element) (thanks, ChatGPT)

        let index1 = WebsView.multiViewPrimaries[0];
        let index2 = WebsView.multiViewPrimaries[1];
        let index3 = "";
        if (!index2 || !WebsView.listOfAhnentafels[index2] || !WebsView.listOfAhnentafels[index2].list) {
            condLog("It's TOO SOON .... there isn't a fully formed WebsView.listOfAhnentafels[index2].list YET !");
            return;
        }
        let commonElements = findCommonElements(
            WebsView.listOfAhnentafels[index1].list,
            WebsView.listOfAhnentafels[index2].list
        );
        if (WebsView.multiViewPrimaries == "012") {
            index3 = "2";
            commonElements = findCommonElements(commonElements, WebsView.listOfAhnentafels[index3].list);
        }
        condLog({ commonElements }, index1, index2, WebsView.multiViewPrimaries, WebsView.listOfAhnentafels);

        // for (const p in WebsView.listOfAhnentafels[0].listByPerson) {
        for (const pp in commonElements) {
            let p = commonElements[pp];
            if (p == 0) {
                continue;
            }
            condLog("for p = ", p, index1, index2, index3);
            const element1 = WebsView.listOfAhnentafels[index1].listByPerson[p];
            const element2 = WebsView.listOfAhnentafels[index2].listByPerson[p];
            let element3 = null;
            if (index3 > "") {
                element3 = WebsView.listOfAhnentafels[index3].listByPerson[p];
            }

            // if (element && element.length > 0 && element1 && element1.length > 0 && WebsView.PeopleList[p]) {
            if (WebsView.PeopleList[p]) {
                let jointMin = Math.min(minMin(element2), minMin(element1)); //minMin(element, element1);
                let maxOfMins = Math.max(minMin(element2), minMin(element1));

                if (index3 > "") {
                    jointMin = Math.min(minMin(element3), jointMin); //minMin(element, element1);
                    maxOfMins = Math.max(minMin(element3), maxOfMins);
                }
                //  if ( element2 && element2.length > 0 && WebsView.PeopleList[p]) {
                //    condLog("A TRIPLICATE value here");
                // }

                let allSame = true;
                let firstKid = -1;

                for (let a1 = 0; a1 < element1.length && allSame == true; a1++) {
                    const a1Kid = Math.floor(element1[a1] / 2);
                    const kidID = WebsView.listOfAhnentafels[index1].list[a1Kid];
                    if (a1 == 0) {
                        firstKid = kidID;
                    }
                    condLog("kid1 @ ", a1Kid, kidID);
                    if (firstKid != kidID) {
                        allSame = false;
                    }
                }
                for (let a2 = 0; a2 < element2.length && allSame == true; a2++) {
                    const a2Kid = Math.floor(element2[a2] / 2);
                    const kidID = WebsView.listOfAhnentafels[index2].list[a2Kid];
                    condLog("kid2 @ ", a2Kid, kidID);
                    if (firstKid != kidID) {
                        allSame = false;
                    }
                }

                if (index3 > "") {
                    for (let a3 = 0; a3 < element3.length && allSame == true; a3++) {
                        const a3Kid = Math.floor(element3[a3] / 2);
                        const kidID = WebsView.listOfAhnentafels[index3].list[a3Kid];
                        condLog("kid3 @ ", a3Kid, kidID);
                        if (firstKid != kidID) {
                            allSame = false;
                        }
                    }
                }

                condLog(
                    "Common ?? ",
                    p,
                    element1,
                    element2,
                    element3,
                    WebsView.PeopleList[p],
                    jointMin,
                    maxOfMins,
                    "Same kid, diff path:",
                    allSame
                );
                WebsView.listOfCommonAncestors.push({
                    Id: p,
                    Ahns0: element1,
                    Ahns1: element2,
                    Ahns2: element3,
                    min: jointMin,
                    max: maxOfMins,
                    allSameKid: allSame,
                });
                thePeopleList[p]["allSameKid"] = allSame;
            }
        }

        condLog("AFTER that ... WebsView.listOfCommonAncestors = ", WebsView.listOfCommonAncestors);
        // for (const p in WebsView.listOfAhnentafels[0].listByPerson) {

        // }
        // WebsView.listOfAhnentafels[0].listByPerson.forEach((p) => {
        //     condLog("foreach P = ", p);
        // });
    }
})();
