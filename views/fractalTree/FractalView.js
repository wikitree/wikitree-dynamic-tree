const SVGbtnDOWN =
    '<SVG width=18 height=14 ><polyline points="0,0 18,0 9,14 0,0" fill="blue" stroke="blue"/><polyline points="5,7 13,7" fill="none" stroke="white" stroke-width=2 /></SVG>';
const SVGbtnUP =
    '<SVG width=18 height=14 ><polyline points="0,14 18,14 9,0 0,14" fill="red" stroke="red"/><polyline points="5,8 13,8" fill="none" stroke="white" stroke-width=2 /> <polyline points="9,3 9,13" fill="none" stroke="white" stroke-width=2 /> </SVG>';
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

import { theSourceRules } from "../../lib/biocheck-api/src/SourceRules.js";
import { BioCheckPerson } from "../../lib/biocheck-api/src/BioCheckPerson.js";
import { Biography } from "../../lib/biocheck-api/src/Biography.js";
import { WTapps_Utils } from "../fanChart/WTapps_Utils.js";
import { Utils } from "../shared/Utils.js";

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
    const LEGEND_CLIPBOARD = "&#x1F4CB;";

    const FullAppName = "Fractal Tree app";
    const AboutPreamble =
        "The Fractal Tree app was originally created as a standalone WikiTree app.<br>The current Tree App version was created for HacktoberFest 2022<br/>and is maintained by the original author plus other WikiTree developers.";
    const AboutUpdateDate = "04 February 2025";
    const AboutAppIcon = `<img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fractalTree.png" />`;
    const AboutOriginalAuthor = "<A target=_blank href=https://www.wikitree.com/wiki/Clarke-11007>Greg Clarke</A>";
    const AboutAdditionalProgrammers =
        "<A target=_blank href=https://www.wikitree.com/wiki/Duke-5773>Jonathan Duke</A>";
    const AboutAssistants = "Rob Pavey, Kay Knight, Riel Smit & Ian Beacall";
    const AboutLatestG2G =
        "https://www.wikitree.com/g2g/1716948/updates-safari-trails-settings-fanchart-fractal-supertree"; // "https://www.wikitree.com/g2g/1599363/recent-updates-to-the-fan-chart-tree-app-july-2023";
    const AboutHelpDoc = ""; // "https://www.wikitree.com/wiki/Space:Fan_Chart_app";
    const AboutOtherApps = "https://apps.wikitree.com/apps/clarke11007";

    const SVGbtnCLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="red"/>
        </svg>`;

    const SVGbtnDOWN =
        '<SVG width=18 height=14 ><polyline points="0,0 18,0 9,14 0,0" fill="blue" stroke="blue"/><polyline points="5,7 13,7" fill="none" stroke="white" stroke-width=2 /></SVG>';
    const SVGbtnUP =
        '<SVG width=18 height=14 ><polyline points="0,14 18,14 9,0 0,14" fill="red" stroke="red"/><polyline points="5,8 13,8" fill="none" stroke="white" stroke-width=2 /> <polyline points="9,3 9,13" fill="none" stroke="white" stroke-width=2 /> </SVG>';

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
    /**
     * Constructor
     */
    var FractalView = (window.FractalView = function () {
        Object.assign(this, this?.meta());
        // let theCookie = WTapps_Utils.getCookie("wtapps_fractal");
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

    var uniqueLocationsArray = [];
    var theSortedLocationsArray = [];

    var numRepeatAncestors = 0;
    var repeatAncestorTracker = new Object();

    let stickerClr = ["white", "red", "green", "blue", "orange"];
    var categoryList = [];
    var stickerList = [];
    var currentBadges = [];
    var currentHighlightCategory = "";
    var currentMaxHeight4Box = 180;

    let font4Name = "Arial";
    let font4Info = "SansSerif";

    // function sayHi() {
    //     console.log("Gday Mate");
    // }

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

    var FullColoursArray = [
        [1, "AliceBlue", "#F0F8FF"],
        [1, "AntiqueWhite", "#FAEBD7"],
        [1, "Aquamarine", "#7FFFD4"],
        /*[1,"Azure","#F0FFFF"],*/ [1, "Beige", "#F5F5DC"],
        /*[1,"Bisque","#FFE4C4"], [1,"BlanchedAlmond","#FFEBCD"], */ [1, "BurlyWood", "#DEB887"],
        [1, "CadetBlue", "#5F9EA0"],
        /* [1,"Chartreuse","#7FFF00"], [1,"Coral","#FF7F50"], */ [1, "CornflowerBlue", "#6495ED"],
        [1, "Cornsilk", "#FFF8DC"],
        [1, "Cyan", "#00FFFF"],
        [1, "DarkCyan", "#008B8B"],
        [1, "DarkGoldenRod", "#B8860B"],
        [1, "DarkGray", "#A9A9A9"],
        [1, "DarkKhaki", "#BDB76B"],
        [1, "DarkOrange", "#FF8C00"],
        [1, "DarkSalmon", "#E9967A"],
        [1, "DarkSeaGreen", "#8FBC8F"],
        [1, "DarkTurquoise", "#00CED1"],
        [1, "DeepPink", "#FF1493"],
        [1, "DeepSkyBlue", "#00BFFF"],
        [1, "DodgerBlue", "#1E90FF"],
        [1, "FloralWhite", "#FFFAF0"],
        [1, "Gainsboro", "#DCDCDC"],
        [1, "GhostWhite", "#F8F8FF"],
        [1, "Gold", "#FFD700"],
        [1, "GoldenRod", "#DAA520"],
        [1, "GreenYellow", "#ADFF2F"],
        [1, "HoneyDew", "#F0FFF0"],
        [1, "HotPink", "#FF69B4"],
        /*[1,"Ivory","#FFFFF0"],*/ [1, "Khaki", "#F0E68C"],
        [1, "Lavender", "#E6E6FA"],
        [1, "LavenderBlush", "#FFF0F5"],
        [1, "LawnGreen", "#7CFC00"],
        [1, "LemonChiffon", "#FFFACD"],
        [1, "LightBlue", "#ADD8E6"],
        [1, "LightCoral", "#F08080"],
        [1, "LightCyan", "#E0FFFF"],
        [1, "LightGoldenRodYellow", "#FAFAD2"],
        [1, "LightGray", "#D3D3D3"],
        [1, "LightGreen", "#90EE90"],
        [1, "LightPink", "#FFB6C1"],
        [1, "LightSalmon", "#FFA07A"],
        [1, "LightSeaGreen", "#20B2AA"],
        [1, "LightSkyBlue", "#87CEFA"],
        [1, "LightSlateGray", "#778899"],
        [1, "LightSteelBlue", "#B0C4DE"],
        [1, "LightYellow", "#FFFFE0"],
        [1, "Lime", "#00FF00"],
        [1, "LimeGreen", "#32CD32"],
        [1, "Linen", "#FAF0E6"],
        [1, "Magenta", "#FF00FF"],
        [1, "MediumAquaMarine", "#66CDAA"],
        [1, "MediumSpringGreen", "#00FA9A"],
        [1, "MediumTurquoise", "#48D1CC"],
        /*[1,"MintCream","#F5FFFA"],*/ [1, "MistyRose", "#FFE4E1"],
        [1, "Moccasin", "#FFE4B5"],
        [1, "NavajoWhite", "#FFDEAD"],
        [1, "OldLace", "#FDF5E6"],
        [1, "Orange", "#FFA500"],
        [1, "Orchid", "#DA70D6"],
        [1, "PaleGoldenRod", "#EEE8AA"],
        [1, "PaleGreen", "#98FB98"],
        [1, "PaleTurquoise", "#AFEEEE"],
        [1, "PaleVioletRed", "#DB7093"],
        /*[1,"PapayaWhip","#FFEFD5"],*/ [1, "PeachPuff", "#FFDAB9"],
        [1, "Pink", "#FFC0CB"],
        [1, "Plum", "#DDA0DD"],
        [1, "PowderBlue", "#B0E0E6"],
        [1, "RosyBrown", "#BC8F8F"],
        [1, "Salmon", "#FA8072"],
        [1, "SandyBrown", "#F4A460"],
        [1, "SeaShell", "#FFF5EE"],
        [1, "Silver", "#C0C0C0"],
        [1, "SkyBlue", "#87CEEB"],
        /*[1,"Snow","#FFFAFA"],*/ [1, "SpringGreen", "#00FF7F"],
        [1, "Tan", "#D2B48C"],
        [1, "Thistle", "#D8BFD8"],
        [1, "Tomato", "#FF6347"],
        [1, "Turquoise", "#40E0D0"],
        [1, "Violet", "#EE82EE"],
        [1, "Wheat", "#F5DEB3"],
        [1, "White", "#FFFFFF"],
        /*[1,"WhiteSmoke","#F5F5F5"],*/ [1, "Yellow", "#FFFF00"],
        [1, "YellowGreen", "#9ACD32"],
        /*[0,"Black","#000000"], */ [0, "Blue", "#0000FF"],
        [0, "BlueViolet", "#8A2BE2"],
        [0, "Brown", "#A52A2A"],
        [0, "Chocolate", "#D2691E"],
        [0, "Crimson", "#DC143C"],
        /*[0,"DarkBlue","#00008B"],*/ [0, "DarkGreen", "#006400"],
        [0, "DarkMagenta", "#8B008B"],
        [0, "DarkOliveGreen", "#556B2F"],
        /*[0,"DarkOrchid","#9932CC"],*/ [0, "DarkRed", "#8B0000"],
        [0, "DarkSlateBlue", "#483D8B"],
        [0, "DarkSlateGray", "#2F4F4F"],
        [0, "DarkViolet", "#9400D3"],
        [0, "DimGray", "#696969"],
        [0, "FireBrick", "#B22222"],
        [0, "ForestGreen", "#228B22"],
        [0, "Gray", "#808080"],
        [0, "Grey", "#808080"],
        [0, "Green", "#008000"],
        [0, "IndianRed", "#CD5C5C"],
        [0, "Indigo", "#4B0082"],
        [0, "Maroon", "#800000"],
        [0, "MediumBlue", "#0000CD"],
        [0, "MediumOrchid", "#BA55D3"],
        [0, "MediumPurple", "#9370DB"],
        [0, "MediumSeaGreen", "#3CB371"],
        [0, "MediumSlateBlue", "#7B68EE"],
        [0, "MediumVioletRed", "#C71585"],
        [0, "MidnightBlue", "#191970"],
        [0, "Navy", "#000080"],
        [0, "Olive", "#808000"],
        [0, "OliveDrab", "#6B8E23"],
        [0, "OrangeRed", "#FF4500"],
        [0, "Peru", "#CD853F"],
        [0, "Purple", "#800080"],
        [0, "RebeccaPurple", "#663399"],
        [0, "Red", "#FF0000"],
        [0, "RoyalBlue", "#4169E1"],
        [0, "SaddleBrown", "#8B4513"],
        [0, "SeaGreen", "#2E8B57"],
        [0, "Sienna", "#A0522D"],
        [0, "SlateBlue", "#6A5ACD"],
        [0, "SlateGray", "#708090"],
        [0, "SlateGrey", "#708090"],
        [0, "SteelBlue", "#4682B4"],
        [0, "Teal", "#008080"],
    ];
    var LightColoursArray = [
        [1, "AliceBlue", "#F0F8FF"],
        [1, "AntiqueWhite", "#FAEBD7"],
        [1, "Aquamarine", "#7FFFD4"],
        /*[1,"Azure","#F0FFFF"],*/ [1, "Beige", "#F5F5DC"],
        /*[1,"Bisque","#FFE4C4"], [1,"BlanchedAlmond","#FFEBCD"], */ [1, "BurlyWood", "#DEB887"],
        [1, "CadetBlue", "#5F9EA0"],
        /* [1,"Chartreuse","#7FFF00"], [1,"Coral","#FF7F50"], */ [1, "CornflowerBlue", "#6495ED"],
        [1, "Cornsilk", "#FFF8DC"],
        [1, "Cyan", "#00FFFF"],
        [1, "DarkCyan", "#008B8B"],
        [1, "DarkGoldenRod", "#B8860B"],
        [1, "DarkGray", "#A9A9A9"],
        [1, "DarkKhaki", "#BDB76B"],
        [1, "DarkOrange", "#FF8C00"],
        [1, "DarkSalmon", "#E9967A"],
        [1, "DarkSeaGreen", "#8FBC8F"],
        [1, "DarkTurquoise", "#00CED1"],
        [1, "DeepPink", "#FF1493"],
        [1, "DeepSkyBlue", "#00BFFF"],
        [1, "DodgerBlue", "#1E90FF"],
        [1, "FloralWhite", "#FFFAF0"],
        [1, "Gainsboro", "#DCDCDC"],
        [1, "GhostWhite", "#F8F8FF"],
        [1, "Gold", "#FFD700"],
        [1, "GoldenRod", "#DAA520"],
        [1, "GreenYellow", "#ADFF2F"],
        [1, "HoneyDew", "#F0FFF0"],
        [1, "HotPink", "#FF69B4"],
        /*[1,"Ivory","#FFFFF0"],*/ [1, "Khaki", "#F0E68C"],
        [1, "Lavender", "#E6E6FA"],
        [1, "LavenderBlush", "#FFF0F5"],
        [1, "LawnGreen", "#7CFC00"],
        [1, "LemonChiffon", "#FFFACD"],
        [1, "LightBlue", "#ADD8E6"],
        [1, "LightCoral", "#F08080"],
        /*[1,"LightCyan","#E0FFFF"],*/ [1, "LightGoldenRodYellow", "#FAFAD2"],
        [1, "LightGray", "#D3D3D3"],
        [1, "LightGreen", "#90EE90"],
        [1, "LightPink", "#FFB6C1"],
        [1, "LightSalmon", "#FFA07A"],
        [1, "LightSeaGreen", "#20B2AA"],
        [1, "LightSkyBlue", "#87CEFA"],
        [1, "LightSlateGray", "#778899"],
        [1, "LightSteelBlue", "#B0C4DE"],
        [1, "LightYellow", "#FFFFE0"],
        [1, "Lime", "#00FF00"],
        [1, "LimeGreen", "#32CD32"],
        [1, "Linen", "#FAF0E6"],
        [1, "Magenta", "#FF00FF"],
        [1, "MediumAquaMarine", "#66CDAA"],
        [1, "MediumSpringGreen", "#00FA9A"],
        [1, "MediumTurquoise", "#48D1CC"],
        /*[1,"MintCream","#F5FFFA"],*/ [1, "MistyRose", "#FFE4E1"],
        /*[1,"Moccasin","#FFE4B5"], */ [1, "NavajoWhite", "#FFDEAD"],
        [1, "OldLace", "#FDF5E6"],
        [1, "Orange", "#FFA500"],
        [1, "Orchid", "#DA70D6"],
        [1, "PaleGoldenRod", "#EEE8AA"],
        [1, "PaleGreen", "#98FB98"],
        [1, "PaleTurquoise", "#AFEEEE"],
        [1, "PaleVioletRed", "#DB7093"],
        /*[1,"PapayaWhip","#FFEFD5"],*/ [1, "PeachPuff", "#FFDAB9"],
        [1, "Pink", "#FFC0CB"],
        [1, "Plum", "#DDA0DD"],
        [1, "PowderBlue", "#B0E0E6"],
        [1, "RosyBrown", "#BC8F8F"],
        [1, "Salmon", "#FA8072"],
        [1, "SandyBrown", "#F4A460"],
        [1, "SeaShell", "#FFF5EE"],
        [1, "Silver", "#C0C0C0"],
        /*[1,"SkyBlue","#87CEEB"],*/ /*[1,"Snow","#FFFAFA"],*/ [1, "SpringGreen", "#00FF7F"],
        [1, "Tan", "#D2B48C"],
        [1, "Thistle", "#D8BFD8"],
        [1, "Tomato", "#FF6347"],
        [1, "Turquoise", "#40E0D0"],
        [1, "Violet", "#EE82EE"],
        [1, "Wheat", "#F5DEB3"],
        /*[1,"White","#FFFFFF"],*/ /*[1,"WhiteSmoke","#F5F5F5"],*/ /*[1,"Yellow","#FFFF00"],*/ [
            1,
            "YellowGreen",
            "#9ACD32",
        ],
    ];

    var PastelsArray = []; // to be defined shortly
    var RainbowArray = []; // to be defined shortly
    var RainbowArrayLong = []; // to be defined shortly
    var Rainbow8 = []; // to be defined shortly
    var RainbowTweens = []; // to be defined shortly

    // var AltBlues = []; // to be defined shortly
    var AltBluesArray = []; // to be defined shortly
    // var AltGreens = []; // to be defined shortly
    var AltGreensArray = []; // to be defined shortly
    var GreensArray = []; // to be defined shortly
    var GreysArray = []; // to be defined shortly
    var AltGreysArray = []; // to be defined shortly
    var GreysArrayOrig = []; // to be defined shortly
    var RedsArray = []; // to be defined shortly
    var AltRedsArray = []; // to be defined shortly
    var BluesArray = []; // to be defined shortly

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

    FractalView.prototype.meta = function () {
        return {
            title: "Fractal Tree",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    FractalView.resetSettingsDIVtoDefaults = function () {
        // console.log("Here you are inside FractalView.resetSettingsDIVtoDefaults");
        let theCookieString = JSON.stringify(FractalView.currentSettings);
        // console.log({ theCookieString });
        if (theCookieString) {
            FractalView.updateCurrentSettingsBasedOnCookieValues(theCookieString);
            FractalView.tweakSettingsToHideShowElements();
            FractalView.updateLegendTitle();
            FractalView.updateHighlightDescriptor();

            let showBadges = FractalView.currentSettings["general_options_showBadges"];
            if (!showBadges) {
                let stickerLegend = document.getElementById("stickerLegend");
                stickerLegend.style.display = "none";
                if (
                    FractalView.currentSettings["highlight_options_showHighlights"] == false &&
                    FractalView.currentSettings["colour_options_colourBy"] != "Location" &&
                    FractalView.currentSettings["colour_options_colourBy"] != "Family"
                ) {
                    let legendDIV = document.getElementById("legendDIV");
                    legendDIV.style.display = "none";
                }
            }

            WTapps_Utils.setCookie("wtapps_fractal", JSON.stringify(FractalView.currentSettings), {
                expires: 365,
            });

            FractalView.redraw();
        }
    };

    FractalView.redrawAfterLoadSettings = function () {
        // console.log("Here you are inside FractalView.redrawAfterLoadSettings");

        FractalView.tweakSettingsToHideShowElements();
        FractalView.updateLegendTitle();
        FractalView.updateHighlightDescriptor();

        let showBadges = FractalView.currentSettings["general_options_showBadges"];
        if (!showBadges) {
            let stickerLegend = document.getElementById("stickerLegend");
            stickerLegend.style.display = "none";
            if (
                FractalView.currentSettings["highlight_options_showHighlights"] == false &&
                FractalView.currentSettings["colour_options_colourBy"] != "Location" &&
                FractalView.currentSettings["colour_options_colourBy"] != "Family"
            ) {
                let legendDIV = document.getElementById("legendDIV");
                legendDIV.style.display = "none";
            }
        }

        WTapps_Utils.setCookie("wtapps_fractal", JSON.stringify(FractalView.currentSettings), {
            expires: 365,
        });

        FractalView.redraw();
    };

    FractalView.prototype.init = function (selector, startId) {
        // condLog("FractalView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;
        FractalView.fractalSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "FractalView",
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
                    subsections: [{ name: "FractalGeneral", label: "General settings" }],
                    comment:
                        "These options apply to the Fractal Tree overall, and don't fall in any other specific category.",
                },
                {
                    name: "names",
                    label: "Names",
                    hideSelect: true,
                    subsections: [{ name: "FractalNames", label: "NAMES format" }],
                    comment: "These options apply to how the ancestor names will displayed in each Person box.",
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
                    comment: "These options apply to background colours in the Person boxes.",
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
                        {
                            optionName: "boxWidth",
                            type: "radio",
                            label: "Box Width",
                            values: [
                                { value: "340", text: "narrow" },
                                { value: "400", text: "default" },
                                { value: "500", text: "large" },
                                { value: "600", text: "extra large" },
                                { value: "800", text: "double wide" },
                            ],
                            defaultValue: "400",
                        },
                        {
                            optionName: "tightness",
                            type: "radio",
                            label: "Horizontal Spacing",
                            values: [
                                { value: "0", text: "tight" },
                                { value: "1", text: "normal" },
                            ],
                            defaultValue: "1",
                        },
                        {
                            optionName: "vBoxHeight",
                            type: "radio",
                            label: "Vertical Spacing",
                            values: [
                                { value: "0", text: "auto" },
                                { value: "1", text: "fixed spacing:" },
                                // { value: "80", text: "80" },
                                // { value: "120", text: "120" },
                                // { value: "160", text: "160" },
                                // { value: "200", text: "200" },
                                // { value: "240", text: "240" },
                            ],
                            defaultValue: "0",
                        },
                        { optionName: "vSpacing", label: "Adjust ∆y (from 1 to 10)", type: "number", defaultValue: 7 },
                        { optionName: "break0.5", type: "br" },
                        {
                            optionName: "extraInfo",
                            type: "radio",
                            label: "Extras on top",
                            values: [
                                { value: "none", text: "none" },
                                { value: "ahnNum", text: "Ahnentafel number" },
                                { value: "WikiTreeID", text: "WikiTree ID" },
                                { value: "both", text: "both" },
                            ],
                            defaultValue: "none",
                        },
                        { optionName: "break1", type: "br" },
                        {
                            optionName: "colourizeRepeats",
                            label: "Colourize Repeat Ancestors",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        { optionName: "break2", type: "br" },
                        {
                            optionName: "showBadges",
                            label: "Add Badges to Ancestors",
                            type: "checkbox",
                            defaultValue: false,
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
                        {
                            optionName: "middleName",
                            label: "Show Middle Name",
                            type: "checkbox",
                            defaultValue: 0,
                        },
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
                        {
                            optionName: "showBirth",
                            label: "Show Birth Date",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "showDeath",
                            label: "Show Death Date",
                            type: "checkbox",
                            defaultValue: true,
                        },
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
                        {
                            optionName: "showBirth",
                            label: "Show Birth Location",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "showDeath",
                            label: "Show Death Location",
                            type: "checkbox",
                            defaultValue: true,
                        },
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
                            label: "Background Colour cells by",
                            values: [
                                { value: "None", text: "OFF - All White, all the time WHITE" },
                                { value: "Gender", text: "Gender" },
                                { value: "Generation", text: "Generation" },
                                { value: "Grand", text: "Grandparent" },
                                { value: "GGrand", text: "Great-Grandparent" },
                                { value: "GGGrand", text: "2x Great Grandparent" },
                                { value: "GGGGrand", text: "3x Great Grandparent" },
                                { value: "Family", text: "Family Stats" },
                                { value: "Location", text: "Location" },

                                // { value: "Town", text: "by Place name" },
                                // { value: "Region", text: "by Region (Province/State)" },
                                // { value: "Country", text: "by Country" },
                                { value: "random", text: "random chaos" },
                            ],
                            defaultValue: "Generation",
                        },
                        {
                            optionName: "specifyByFamily",
                            type: "select",
                            label: "Specifically by",
                            values: [
                                { value: "age", text: "age" },
                                // { value: "numChildren", text: "number of children" },
                                // { value: "numSiblings", text: "number of all siblings" },
                                // { value: "numFullSiblings", text: "number of full siblings only" },
                                // { value: "numSpouses", text: "number of spouses" },
                            ],
                            defaultValue: "age",
                        },
                        {
                            optionName: "specifyByLocation",
                            type: "select",
                            label: "Specifically by",
                            values: [
                                { value: "BirthCountry", text: "Birth Country" },
                                { value: "BirthRegion", text: "Birth Region, Country" },
                                { value: "BirthTown", text: "Birth Town (only)" },
                                { value: "BirthTownFull", text: "Birth Town (full Town,Region,Country)" },
                                { value: "DeathCountry", text: "Country of Death" },
                                { value: "DeathRegion", text: "Region of Death " },
                                { value: "DeathTown", text: "Town of Death (short)" },
                                { value: "DeathTownFull", text: "Town of Death (full)" },
                                { value: "BirthDeathCountry", text: "Birth & Death Country" },
                                { value: "DeathBirthCountry", text: "Death & Birth Country" },
                            ],
                            defaultValue: "BirthCountry",
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
                        { optionName: "break", comment: "Text in cells:", type: "br" },
                        {
                            optionName: "textColour",
                            type: "radio",
                            label: "",
                            values: [
                                { value: "black", text: "Always Black" },
                                { value: "B&W", text: "Black or White" },
                                { value: "alt", text: "Alternating Colours" },
                            ],
                            defaultValue: "black",
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
                                { value: "-", text: "-" },
                                { value: "aliveDay", text: "Alive on this Day" },
                                { value: "bioCheckOK", text: "BioCheck  ✔" },
                                { value: "bioCheckFail", text: "BioCheck  X" },
                                { value: "bioText", text: "Biography Text" },
                                { value: "cat", text: "Category or Sticker" },
                            ],
                            defaultValue: "DNAinheritance",
                        },

                        { optionName: "break4DNA", comment: "For WikiTree DNA pages:", type: "br" },
                        {
                            optionName: "aliveYYYY",
                            type: "text",
                            label: "Year",
                            defaultValue: "1950",
                        },
                        {
                            optionName: "aliveMMM",
                            type: "select",
                            label: "Month",
                            values: [
                                // { value: "00", text: "MMM" },
                                { value: "01", text: "Jan" },
                                { value: "02", text: "Feb" },
                                { value: "03", text: "Mar" },
                                { value: "04", text: "Apr" },
                                { value: "05", text: "May" },
                                { value: "06", text: "Jun" },
                                { value: "07", text: "Jul" },
                                { value: "08", text: "Aug" },
                                { value: "09", text: "Sep" },
                                { value: "10", text: "Oct" },
                                { value: "11", text: "Nov" },
                                { value: "12", text: "Dec" },

                                // { value: "review", text: "Profiles needing review" },
                            ],
                            defaultValue: "01",
                        },

                        {
                            optionName: "aliveDD",
                            type: "select",
                            label: "Day ",
                            values: [
                                // { value: "00", text: "DD" },
                                { value: "01", text: "01" },
                                { value: "02", text: "02" },
                                { value: "03", text: "03" },
                                { value: "04", text: "04" },
                                { value: "05", text: "05" },
                                { value: "06", text: "06" },
                                { value: "07", text: "07" },
                                { value: "08", text: "08" },
                                { value: "09", text: "09" },
                                { value: "10", text: "10" },
                                { value: "11", text: "11" },
                                { value: "12", text: "12" },
                                { value: "13", text: "13" },
                                { value: "14", text: "14" },
                                { value: "15", text: "15" },
                                { value: "16", text: "16" },
                                { value: "17", text: "17" },
                                { value: "18", text: "18" },
                                { value: "19", text: "19" },
                                { value: "20", text: "20" },
                                { value: "21", text: "21" },
                                { value: "22", text: "22" },
                                { value: "23", text: "23" },
                                { value: "24", text: "24" },
                                { value: "25", text: "25" },
                                { value: "26", text: "26" },
                                { value: "27", text: "27" },
                                { value: "28", text: "28" },
                                { value: "29", text: "29" },
                                { value: "30", text: "30" },
                                { value: "31", text: "31" },

                                // { value: "review", text: "Profiles needing review" },
                            ],
                            defaultValue: "01",
                        },

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
                        {
                            optionName: "catName",
                            type: "select",
                            label: "Choose Category",
                            values: [
                                { value: "Unsourced", text: "Unsourced" },
                                // { value: "numChildren", text: "number of children" },
                                // { value: "numSiblings", text: "number of all siblings" },
                                // { value: "numFullSiblings", text: "number of full siblings only" },
                                // { value: "numSpouses", text: "number of spouses" },
                            ],
                            defaultValue: "Unsourced",
                        },

                        {
                            optionName: "bioText",
                            type: "text",
                            label: "Search text",
                            defaultValue: "",
                        },
                    ],
                },
            ],
        });

        // Setup the LegendHTML for when we need the Legend (for multiple locations colouring legend, for example)
        var legendHTML =
            '<div id=legendDIV style="display:none; position:absolute; left:20px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left"><A style="cursor:pointer;" onclick="FractalView.hideLegend();">[ <B><font color=red>x</font></B> ]</A></span>' +
            "<H3 align=center>Legend</H3><div id=refreshLegend style='display:none; cursor:pointer;'><A onclick='FractalView.refreshTheLegend();'>Click to Update Legend</A></DIV><div id=innerLegend></div></div>";

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%">' +
            "&nbsp;" +
            "</td>" +
            '<td width="5%">&nbsp;' +
            '<span id=legendASCII style="display:inline;"><A style="cursor:pointer;" onclick="FractalView.toggleLegend();"><font size=+2>' +
            LEGEND_CLIPBOARD +
            "</font></A></span>" +
            "</td>" +
            '<td width="30%" align="center">' +
            ' <A style="cursor:pointer;" onclick="FractalView.numGens2Display -=1; FractalView.redraw();">' +
            SVGbtnDOWN +
            "</A> " +
            "[ <span id=numGensInBBar>3</span> generations ]" +
            ' <A style="cursor:pointer;" onclick="FractalView.numGens2Display +=1; FractalView.redraw();">' +
            SVGbtnUP +
            "</A> " +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="30%" align="right">' +
            ' <A style="cursor:pointer;" onclick="FractalView.toggleSettings();"><font size=+2>' +
            SVGbtnSETTINGS +
            "</font></A>" +
            "&nbsp;&nbsp;" +
            "<A onclick=FractalView.toggleAbout();>" +
            SVGbtnINFO +
            "</A>" +
            (AboutHelpDoc > ""
                ? "&nbsp;&nbsp;<A target=helpPage href='" + AboutHelpDoc + "'>" + SVGbtnHELP + "</A>"
                : "") +
            "&nbsp;&nbsp;</td>" +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Fractal Tree is loading ...</DIV>';

        var aboutHTML =
            '<div id=aboutDIV class="pop-up" style="display:none; position:absolute; right:20px; background-color:aliceblue; border: solid blue 4px; border-radius: 15px; padding: 15px; zIndex:9999}">' +
            `<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><a onclick="FractalView.toggleAbout();">` +
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

        settingsHTML += FractalView.fractalSettingsOptionsObject.createdSettingsDIV; // +

        var badgesHTML =
            "<div id=BRbetweenLegendAndStickers><br/></div><div id=stickerLegend><H3 class=quarterEmBottomMargin>Badges</H3>";
        var stickerCatNameSelectorHTML =
            "<select id='stickerCategoryDropDownList1' class='optionSelect selectSimpleDropDown' onchange='FractalView.updateBadgesToShow(1);'><option value=-999>Do not use Badge 1</option></select><br/>";
        for (let i = 1; i <= 4; i++) {
            badgesHTML +=
                "<svg width=24 height=24><rect width=24 height=24 rx=12 ry=12 style='fill:" +
                stickerClr[i] +
                ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=7 y=17 fill='white'>" +
                i +
                "</text></svg>" +
                stickerCatNameSelectorHTML.replace(/1/g, i);
        }

        badgesHTML += "</div>";
        let highlightHTML =
            "<div id=highlightDescriptor><br/><span class='fontBold selectedMenuBarOption'>HIGHLIGHT people</span> = <span id=highlightPeepsDescriptor>Thirty-somethings...</span><br/><br/></div>";

        var legendHTML =
            '<div id=legendDIV style="display:none; position:absolute; left:20px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">' +
            `<span style="color:red; position:absolute; top:0.2em; left:0.6em; cursor:pointer;"><a onclick="FractalView.hideLegend();">` +
            SVGbtnCLOSE +
            "</a></span>" +
            highlightHTML +
            "<H3 class=quarterEmBottomMargin id=LegendTitleH3><span id=LegendTitle></span></H3><div id=refreshLegend style='display:none'><A onclick='FractalView.refreshTheLegend();'>Click to Update Legend</A></DIV><div id=innerLegend></div>" +
            badgesHTML +
            "</div>";

        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        let infoPanel = document.getElementById("info-panel");

        infoPanel.classList.remove("hidden");
        infoPanel.parentNode.classList.add("stickyDIV");
        infoPanel.parentNode.style.padding = "0px";

        infoPanel.innerHTML = btnBarHTML + legendHTML + aboutHTML + settingsHTML + popupDIV;
        container.innerHTML = "";
        
        $("#popupDIV").draggable();
        $("#connectionPodDIV").draggable();

        // container.innerHTML = btnBarHTML + legendHTML + aboutHTML + settingsHTML;

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        FractalView.toggleAbout = function () {
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

        function settingsChanged(e) {
            if (FractalView.fractalSettingsOptionsObject.hasSettingsChanged(FractalView.currentSettings)) {
                condLog("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                WTapps_Utils.setCookie("wtapps_fractal", JSON.stringify(FractalView.currentSettings), {
                    expires: 365,
                });
                console.log("NEW settings are:", FractalView.currentSettings);

                FractalView.tweakSettingsToHideShowElements();

                // if (!showBadges) {
                //     FractalView.removeBadges();
                // }

                FractalView.updateHighlightDescriptor();

                FractalView.myAncestorTree.draw();
                // updateFontsIfNeeded();
                adjustHeightsIfNeeded();
            } else {
                condLog("NOTHING happened according to SETTINGS OBJ");
            }
        }

        FractalView.updateLegendTitle = function () {
            let colourBy = FractalView.currentSettings["colour_options_colourBy"];
            let colour_options_specifyByFamily = FractalView.currentSettings["colour_options_specifyByFamily"];
            let colour_options_specifyByLocation = FractalView.currentSettings["colour_options_specifyByLocation"];

            let legendDIV = document.getElementById("legendDIV");
            let LegendTitle = document.getElementById("LegendTitle");
            let LegendTitleH3 = document.getElementById("LegendTitleH3");

            BRbetweenLegendAndStickers.style.display = "block";
            LegendTitleH3.style.display = "block";
            condLog(
                "NEW UPDATE SETTINGS: ",
                colourBy,
                colour_options_specifyByFamily,
                colour_options_specifyByLocation
            );

            if (colourBy == "Family" && colour_options_specifyByFamily == "age") {
                LegendTitle.textContent = "Age at death";
            } else if (colourBy == "Location" && colour_options_specifyByLocation == "BirthCountry") {
                LegendTitle.textContent = "Birth Country";
            } else if (colourBy == "Location" && colour_options_specifyByLocation == "BirthRegion") {
                LegendTitle.textContent = "Birth Region";
            } else if (colourBy == "Location" && colour_options_specifyByLocation.indexOf("BirthTown") > -1) {
                LegendTitle.textContent = "Birth Town";
            } else if (colourBy == "Location" && colour_options_specifyByLocation == "DeathCountry") {
                LegendTitle.textContent = "Country of Death";
            } else if (colourBy == "Location" && colour_options_specifyByLocation == "DeathRegion") {
                LegendTitle.textContent = "Region of Death";
            } else if (colourBy == "Location" && colour_options_specifyByLocation.indexOf("DeathTown") > -1) {
                LegendTitle.textContent = "Town of Death";
            } else if (colourBy == "Location" && colour_options_specifyByLocation == "BirthDeathCountry") {
                LegendTitle.textContent = "Birth Country (inner)\nDeath Country (outer)";
            } else if (colourBy == "Location" && colour_options_specifyByLocation == "DeathBirthCountry") {
                LegendTitle.textContent = "Death Country (inner)\nBirth Country (outer)";
            }
        };

        FractalView.updateHighlightDescriptor = function () {
            let legendDIV = document.getElementById("legendDIV");
            let legendToggle = document.getElementById("legendASCII");
            let innerLegend = document.getElementById("innerLegend");

            legendDIV.style.display = "block";
            legendToggle.style.display = "inline-block";

            document.getElementById("highlightDescriptor").style.display = "block";
            if (FractalView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                document.getElementById("highlightPeepsDescriptor").textContent = "Y DNA ancestors";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
                document.getElementById("highlightPeepsDescriptor").textContent = "mitochondrial DNA (mtDNA) ancestors";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                document.getElementById("highlightPeepsDescriptor").textContent = "X Chromosome inheritance path";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                document.getElementById("highlightPeepsDescriptor").textContent = "X, Y, mitochondrial DNA ancestors";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                document.getElementById("highlightPeepsDescriptor").textContent = "Relationships confirmed by DNA";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "bioCheckOK") {
                document.getElementById("highlightPeepsDescriptor").textContent = "Profiles that pass the BioCheck";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "bioCheckFail") {
                document.getElementById("highlightPeepsDescriptor").textContent = "Profiles that fail the BioCheck";
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "cat") {
                let catNameSelector = document.getElementById("highlight_options_catName");
                let rawValue = catNameSelector.value.trim();
                document.getElementById("highlightPeepsDescriptor").textContent = rawValue;
                currentHighlightCategory = rawValue;
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
                let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
                let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
                let aliveDDSelector = document.getElementById("highlight_options_aliveDD");
                if (aliveYYYYSelector.value > 1) {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "Alive on " +
                        aliveDDSelector.value +
                        " " +
                        monthNames[aliveMMMSelector.value - 1] +
                        " " +
                        aliveYYYYSelector.value;
                } else {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "Alive on " + aliveDDSelector.value + " " + monthNames[aliveMMMSelector.value - 1] + " " + 1950;
                }
            } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "bioText") {
                let bioTextSelector = document.getElementById("highlight_options_bioText");
                document.getElementById("highlightPeepsDescriptor").textContent =
                    'Biographies that contain the word: "' + bioTextSelector.value.trim() + '"';
            } else {
                document.getElementById("highlightPeepsDescriptor").textContent = "Something else ...";
            }

            if (FractalView.currentSettings["highlight_options_showHighlights"] != true) {
                document.getElementById("highlightDescriptor").style.display = "none";
            }
        };

        FractalView.updateCurrentSettingsBasedOnCookieValues = function (theCookieString) {
            // console.log("function: updateCurrentSettingsBasedOnCookieValues");
            // console.log(theCookieString);
            const theCookieSettings = JSON.parse(theCookieString);
            // console.log("JSON version of the settings are:", theCookieSettings);
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
                            // console.log("Looks like there might be some RADIO BUTTONS here !", theRadioButtons.length);
                            theType = "radio x " + theRadioButtons.length;
                            for (let i = 0; i < theRadioButtons.length; i++) {
                                const btn = theRadioButtons[i];
                                if (btn.value == element) {
                                    btn.checked = true;
                                }
                            }
                        }
                    }
                    // console.log(key, element, theType);
                    if (Object.hasOwnProperty.call(FractalView.currentSettings, key)) {
                        FractalView.currentSettings[key] = element;
                    }
                }
            }

            // ADD SPECIAL SETTING THAT GETS MISSED OTHERWISE:
            // FractalView.currentSettings["general_options_badgeLabels_otherValue"] =
            //     theCookieSettings["general_options_badgeLabels_otherValue"];
        };

        FractalView.tweakSettingsToHideShowElements = function () {
            let showBadges = FractalView.currentSettings["general_options_showBadges"];
            let newBoxWidth = FractalView.currentSettings["general_options_boxWidth"];
            let colourBy = FractalView.currentSettings["colour_options_colourBy"];
            let colour_options_specifyByFamily = FractalView.currentSettings["colour_options_specifyByFamily"];
            let colour_options_specifyByLocation = FractalView.currentSettings["colour_options_specifyByLocation"];

            let legendDIV = document.getElementById("legendDIV");
            let LegendTitle = document.getElementById("LegendTitle");
            let LegendTitleH3 = document.getElementById("LegendTitleH3");
            let stickerLegend = document.getElementById("stickerLegend");
            let legendToggle = document.getElementById("legendASCII");
            let innerLegend = document.getElementById("innerLegend");
            let BRbetweenLegendAndStickers = document.getElementById("BRbetweenLegendAndStickers");

            // console.log("BOX WIDTH - ", newBoxWidth, "vs", boxWidth);
            if (newBoxWidth && newBoxWidth > 0 && newBoxWidth != boxWidth) {
                boxWidth = newBoxWidth;
                nodeWidth = boxWidth * 1.5;
            }

            if (FractalView.currentSettings["general_options_vBoxHeight"] != 1) {
                document.getElementById("general_options_vSpacing_label").style.display = "none";
                document.getElementById("general_options_vSpacing").style.display = "none";
            } else {
                document.getElementById("general_options_vSpacing_label").style.display = "inline-block";
                document.getElementById("general_options_vSpacing").style.display = "inline-block";
            }

            let specFamSelector = document.getElementById("colour_options_specifyByFamily");
            let specLocSelector = document.getElementById("colour_options_specifyByLocation");
            let specFamSelectorLabel = document.getElementById("colour_options_specifyByFamily_label");
            let specLocSelectorLabel = document.getElementById("colour_options_specifyByLocation_label");
            let specFamSelectorBR = document.getElementById("colour_options_specifyByFamily_BR");
            let specLocSelectorBR = document.getElementById("colour_options_specifyByLocation_BR");

            if (FractalView.currentSettings["colour_options_colourBy"] != "Family") {
                specFamSelector.style.display = "none";
                specFamSelectorLabel.style.display = "none";
                specFamSelectorBR.style.display = "none";
            } else {
                specFamSelector.style.display = "inline-block";
                specFamSelectorLabel.style.display = "inline-block";
                specFamSelectorBR.style.display = "inline-block";
            }

            if (FractalView.currentSettings["colour_options_colourBy"] != "Location") {
                specLocSelector.style.display = "none";
                specLocSelectorLabel.style.display = "none";
                specLocSelectorBR.style.display = "none";
            } else if (FractalView.currentSettings["colour_options_colourBy"] == "Location") {
                document.getElementById("colour_options_palette").style.display = "none";
                document.getElementById("colour_options_palette_label").style.display = "none";
                document.getElementById("colour_options_palette_BR").style.display = "none";
                specLocSelector.style.display = "inline-block";
                specLocSelectorLabel.style.display = "inline-block";
                specLocSelectorBR.style.display = "inline-block";
            }

            let break4DNASelector = document.getElementById("highlight_options_break4DNA");
            let howDNAlinksSelectorBR = document.getElementById("highlight_options_howDNAlinks_BR");
            if (FractalView.currentSettings["highlight_options_highlightBy"].indexOf("DNA") == -1) {
                break4DNASelector.parentNode.style.display = "none";
                howDNAlinksSelectorBR.parentNode.style.display = "none";
            } else {
                break4DNASelector.parentNode.style.display = "block";
                howDNAlinksSelectorBR.parentNode.style.display = "block";
            }

            let catNameSelector = document.getElementById("highlight_options_catName");
            let catNameSelectorLabel = document.getElementById("highlight_options_catName_label");
            if (FractalView.currentSettings["highlight_options_highlightBy"] != "cat") {
                catNameSelector.style.display = "none";
                catNameSelectorLabel.style.display = "none";
            } else {
                catNameSelector.style.display = "inline-block";
                catNameSelectorLabel.style.display = "inline-block";
            }

            let bioTextSelector = document.getElementById("highlight_options_bioText");
            let bioTextSelectorLabel = document.getElementById("highlight_options_bioText_label");
            if (FractalView.currentSettings["highlight_options_highlightBy"] != "bioText") {
                bioTextSelector.style.display = "none";
                bioTextSelectorLabel.style.display = "none";
            } else {
                bioTextSelector.style.display = "inline-block";
                bioTextSelectorLabel.style.display = "inline-block";
            }

            let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
            let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
            let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

            if (FractalView.currentSettings["highlight_options_highlightBy"] != "aliveDay") {
                aliveYYYYSelector.parentNode.parentNode.style.display = "none";
                aliveMMMSelector.parentNode.style.display = "none";
                aliveDDSelector.parentNode.style.display = "none";
            } else {
                aliveYYYYSelector.parentNode.parentNode.style.display = "block";
                aliveMMMSelector.parentNode.style.display = "block";
                aliveDDSelector.parentNode.style.display = "block";
            }

            if (showBadges || colourBy == "Family" || colourBy == "Location") {
                legendDIV.style.display = "block";
                stickerLegend.style.display = "block";
                legendToggle.style.display = "inline-block";
                if (colourBy == "Family" || colourBy == "Location") {
                    FractalView.updateLegendTitle();
                } else {
                    BRbetweenLegendAndStickers.style.display = "none";
                    LegendTitleH3.style.display = "none";
                    innerLegend.innerHTML = "";
                }

                if (!showBadges) {
                    stickerLegend.style.display = "none";
                }
            } else {
                // if (colourBy == "Family" || colourBy == "Location") {
                // } else {
                // }
                legendDIV.style.display = "none";
                stickerLegend.style.display = "none";
                legendToggle.style.display = "none";
            }

            // if (FractalView.currentSettings["highlight_options_showHighlights"] == true) {
            //     FractalView.updateHighlightDescriptor();
            // } else {
            //     document.getElementById("highlightDescriptor").style.display = "none";
            // }

            // if (FractalView.myAncestorTree) {
            //     FractalView.myAncestorTree.draw();
            // }
            // updateFontsIfNeeded();
            // adjustHeightsIfNeeded();
        };

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("id", "SVGgraphics");

        condLog("ADDING THE SVG BIG DADDY TAZ");

        // Setup zoom and pan
        const zoom = d3
            .zoom()
            .scaleExtent([0.05, 1])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
                FractalView.currentScaleFactor = event.transform.k;
            });
        svg.call(zoom);
        svg.call(zoom.transform, d3.zoomIdentity.scale(0.75).translate(((4 / 3) * width) / 2, height / 2));

        // condLog("creating SVG object and setting up ancestor tree object")
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

        // ADDING the lineAtBottomOfSVG to force Safari to render (and re-render) the full SVG when being dragged

        g.append("line").attrs({
            id: "lineAtBottomOfSVG",
            display: "inline-block",
            x1: -20,
            y1: 700,
            x2: 20,
            y2: 700,
            style: "stroke: #eee; stroke-width: 8;",
        });

        condLog("ADDING THE PIECES FROM 0 to 2 ** FRACTAL VIEW maxNumGens", 2 ** FractalView.maxNumGens);
        for (let index = 0; index < 2 ** FractalView.maxNumGens; index++) {
            condLog("ADDING THE PIECES FOR ", index);
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
                condLog("ADDING THE BADGES RIGHT NOW TO THE SVG . g Model");
                for (let badgeCounter = 1; badgeCounter <= 4; badgeCounter++) {
                    const stickerPrefix = "badge" + badgeCounter + "-";
                    const ahnNum = index;

                    g.append("g")
                        .attrs({
                            id: stickerPrefix + ahnNum,
                            class: "floatAbove",
                            style: "display:none;",
                        })
                        .append("foreignObject")
                        .attrs({
                            id: stickerPrefix + ahnNum + "inner",
                            class: "centered",
                            width: "20px",
                            height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                            x: 30 * badgeCounter,
                            y: -200,
                            //
                        })

                        .style("overflow", "visible") // so the name will wrap
                        .append("xhtml:div")
                        .attrs({
                            id: stickerPrefix + ahnNum + "svg",
                        })
                        .html(
                            "<svg width=24 height=24><rect width=24 height=24 rx=12 ry=12 style='fill:" +
                                stickerClr[badgeCounter] +
                                ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=7 y=17 fill='white'>" +
                                badgeCounter +
                                "</text></svg>"
                        );
                }
            }
        }

        self.load(startId);

        FractalView.fractalSettingsOptionsObject.buildPage();
        FractalView.fractalSettingsOptionsObject.setActiveTab("names");
        FractalView.defaultSettings = FractalView.fractalSettingsOptionsObject.getDefaultOptions();
        FractalView.currentSettings = FractalView.defaultSettings;

        let theCookieString = WTapps_Utils.getCookie("wtapps_fractal");
        if (theCookieString) {
            FractalView.updateCurrentSettingsBasedOnCookieValues(theCookieString);
        }

        FractalView.tweakSettingsToHideShowElements();

        // SOME minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let bkgdClrSelector = document.getElementById("colour_options_colourBy");

        let vBoxHeightSelector1 = document.getElementById("general_options_vBoxHeight_radio1");
        let vBoxHeightSelector2 = document.getElementById("general_options_vBoxHeight_radio2");

        if (FractalView.currentSettings["general_options_vBoxHeight"] != 1) {
            document.getElementById("general_options_vSpacing_label").style.display = "none";
            document.getElementById("general_options_vSpacing").style.display = "none";
        }

        // condLog("bkgdClrSelector", bkgdClrSelector);

        bkgdClrSelector.setAttribute("onchange", "FractalView.optionElementJustChanged();");
        vBoxHeightSelector1.setAttribute("onchange", "FractalView.optionElementJustChanged();");
        vBoxHeightSelector2.setAttribute("onchange", "FractalView.optionElementJustChanged();");
        let specFamSelector = document.getElementById("colour_options_specifyByFamily");
        let specLocSelector = document.getElementById("colour_options_specifyByLocation");
        let specFamSelectorLabel = document.getElementById("colour_options_specifyByFamily_label");
        let specLocSelectorLabel = document.getElementById("colour_options_specifyByLocation_label");
        let specFamSelectorBR = document.getElementById("colour_options_specifyByFamily_BR");
        let specLocSelectorBR = document.getElementById("colour_options_specifyByLocation_BR");

        if (FractalView.currentSettings["colour_options_colourBy"] != "Family") {
            specFamSelector.style.display = "none";
            specFamSelectorLabel.style.display = "none";
            specFamSelectorBR.style.display = "none";
        }
        if (FractalView.currentSettings["colour_options_colourBy"] != "Location") {
            specLocSelector.style.display = "none";
            specLocSelectorLabel.style.display = "none";
            specLocSelectorBR.style.display = "none";
        } else if (FractalView.currentSettings["colour_options_colourBy"] == "Location") {
            document.getElementById("colour_options_palette").style.display = "none";
            document.getElementById("colour_options_palette_label").style.display = "none";
            document.getElementById("colour_options_palette_BR").style.display = "none";
        }

        // SOME minor tweaking needed in the HIGHLIGHT tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let highlightSelector = document.getElementById("highlight_options_highlightBy");
        highlightSelector.setAttribute("onchange", "FractalView.optionElementJustChanged();");
        let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        let howDNAlinksSelectorBR = document.getElementById("highlight_options_howDNAlinks_BR");

        if (FractalView.currentSettings["highlight_options_highlightBy"].indexOf("DNA") == -1) {
            break4DNASelector.parentNode.style.display = "none";
            howDNAlinksSelectorBR.parentNode.style.display = "none";
        }

        let catNameSelector = document.getElementById("highlight_options_catName");
        let catNameSelectorLabel = document.getElementById("highlight_options_catName_label");
        if (FractalView.currentSettings["highlight_options_highlightBy"] != "cat") {
            catNameSelector.style.display = "none";
            catNameSelectorLabel.style.display = "none";
        }

        let bioTextSelector = document.getElementById("highlight_options_bioText");
        let bioTextSelectorLabel = document.getElementById("highlight_options_bioText_label");
        if (FractalView.currentSettings["highlight_options_highlightBy"] != "bioText") {
            bioTextSelector.style.display = "none";
            bioTextSelectorLabel.style.display = "none";
        }

        let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
        let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
        let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

        if (FractalView.currentSettings["highlight_options_highlightBy"] != "aliveDay") {
            aliveYYYYSelector.parentNode.parentNode.style.display = "none";
            aliveMMMSelector.parentNode.style.display = "none";
            aliveDDSelector.parentNode.style.display = "none";
        }

        FractalView.updateHighlightDescriptor();
        FractalView.updateLegendTitle();

        // updateFontsIfNeeded();

        let showBadges = FractalView.currentSettings["general_options_showBadges"];
        if (!showBadges) {
            let stickerLegend = document.getElementById("stickerLegend");
            stickerLegend.style.display = "none";
            if (
                FractalView.currentSettings["highlight_options_showHighlights"] == false &&
                FractalView.currentSettings["colour_options_colourBy"] != "Location" &&
                FractalView.currentSettings["colour_options_colourBy"] != "Family"
            ) {
                let legendDIV = document.getElementById("legendDIV");
                legendDIV.style.display = "none";
            }
        }

        //  console.log("SELF LOAD end values of legendDIV:", legendDIV.style.display, showBadges,FractalView.currentSettings["highlight_options_showHighlights"]);
    };

    function showRefreshInLegend() {
        let refreshLegendDIV = document.getElementById("refreshLegend");
        refreshLegendDIV.style.display = "block";
    }

    FractalView.refreshTheLegend = function () {
        condLog("NOW IS THE TIME FOR ALL GOOD CHUMPS TO REFRESH THE LEGEND");
        let refreshLegendDIV = document.getElementById("refreshLegend");
        refreshLegendDIV.style.display = "none";
        updateLegendIfNeeded();
        FractalView.redraw();
    };

    // and here's that Function that does the minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
    FractalView.optionElementJustChanged = function () {
        condLog("optionElementJustChanged !!!!!");
        let bkgdClrSelector = document.getElementById("colour_options_colourBy");
        let clrPaletteSelector = document.getElementById("colour_options_palette");
        let clrPaletteSelectorLabel = document.getElementById("colour_options_palette_label");
        let specFamSelector = document.getElementById("colour_options_specifyByFamily");
        let specLocSelector = document.getElementById("colour_options_specifyByLocation");
        let specFamSelectorLabel = document.getElementById("colour_options_specifyByFamily_label");
        let specLocSelectorLabel = document.getElementById("colour_options_specifyByLocation_label");
        let specFamSelectorBR = document.getElementById("colour_options_specifyByFamily_BR");
        let specLocSelectorBR = document.getElementById("colour_options_specifyByLocation_BR");
        let legendASCIIspan = document.getElementById("legendASCII");
        let showBadges = FractalView.currentSettings["general_options_showBadges"];
        let vBoxHeightUseVSpacing = document.getElementById("general_options_vBoxHeight_radio2").checked;
        let vSpacingSelector = document.getElementById("general_options_vSpacing");
        let vSpacingSelectorLabel = document.getElementById("general_options_vSpacing_label");

        // SOME minor tweaking needed in the HIGHLIGHT tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let highlightSelector = document.getElementById("highlight_options_highlightBy");
        let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        let howDNAlinksRadiosBR = document.getElementById("highlight_options_howDNAlinks_BR");
        let catNameSelector = document.getElementById("highlight_options_catName");
        let catNameSelectorLabel = document.getElementById("highlight_options_catName_label");

        let bioTextSelector = document.getElementById("highlight_options_bioText");
        let bioTextSelectorLabel = document.getElementById("highlight_options_bioText_label");

        let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
        let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
        let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

        aliveYYYYSelector.parentNode.parentNode.style.display = "none";
        aliveMMMSelector.parentNode.style.display = "none";
        aliveDDSelector.parentNode.style.display = "none";

        condLog("VALUE:", bkgdClrSelector.value);
        condLog("vBoxHeight VALUE:", vBoxHeightUseVSpacing, vSpacingSelector, vSpacingSelectorLabel);

        if (vBoxHeightUseVSpacing === true) {
            vSpacingSelector.style.display = "inline-block";
            vSpacingSelectorLabel.style.display = "inline-block";
        } else {
            vSpacingSelector.style.display = "none";
            vSpacingSelectorLabel.style.display = "none";
        }

        if (bkgdClrSelector.value == "Family") {
            specFamSelector.style.display = "inline-block";
            legendASCIIspan.style.display = "inline-block";
            specLocSelector.style.display = "none";
            specFamSelectorLabel.style.display = "inline-block";
            specLocSelectorLabel.style.display = "none";
            specFamSelectorBR.style.display = "inline-block";
            specLocSelectorBR.style.display = "none";
            clrPaletteSelector.style.display = "inline-block";
            clrPaletteSelectorLabel.style.display = "inline-block";
        } else if (bkgdClrSelector.value == "Location") {
            specLocSelector.style.display = "inline-block";
            legendASCIIspan.style.display = "inline-block";
            specFamSelector.style.display = "none";
            specLocSelectorLabel.style.display = "inline-block";
            specFamSelectorLabel.style.display = "none";
            specLocSelectorBR.style.display = "inline-block";
            specFamSelectorBR.style.display = "none";
            clrPaletteSelector.style.display = "none";
            clrPaletteSelectorLabel.style.display = "none";
        } else {
            specLocSelector.style.display = "none";
            specFamSelector.style.display = "none";
            specLocSelectorLabel.style.display = "none";
            specFamSelectorLabel.style.display = "none";
            specLocSelectorBR.style.display = "none";
            specFamSelectorBR.style.display = "none";
            legendASCIIspan.style.display = "none";
            clrPaletteSelector.style.display = "inline-block";
            clrPaletteSelectorLabel.style.display = "inline-block";

            let theDIV = document.getElementById("legendDIV");
            theDIV.style.display = "none";
        }

        break4DNASelector.parentNode.style.display = "none";
        howDNAlinksRadiosBR.parentNode.style.display = "none";
        bioTextSelector.style.display = "none";
        bioTextSelectorLabel.style.display = "none";
        catNameSelector.style.display = "none";
        catNameSelectorLabel.style.display = "none";

        if (highlightSelector.value == "cat") {
            catNameSelector.style.display = "inline-block";
            catNameSelectorLabel.style.display = "inline-block";
        } else if (highlightSelector.value == "aliveDay") {
            aliveYYYYSelector.parentNode.parentNode.style.display = "block";
            aliveMMMSelector.parentNode.style.display = "block";
            aliveDDSelector.parentNode.style.display = "block";
        } else if (highlightSelector.value == "bioText") {
            bioTextSelector.style.display = "inline-block";
            bioTextSelectorLabel.style.display = "inline-block";
        } else {
            break4DNASelector.parentNode.style.display = "block";
            howDNAlinksRadiosBR.parentNode.style.display = "inline-block";
        }

        if (highlightSelector.value.indexOf("DNA") == -1) {
            break4DNASelector.parentNode.style.display = "none";
            howDNAlinksRadiosBR.parentNode.style.display = "none";
        }
    };

    FractalView.drawLines = function () {
        condLog("DRAWING LINES stuff should go here");

        const lineAtBottomOfSVG = document.getElementById("lineAtBottomOfSVG");
        let bottomFeederY = 2 ** (Math.ceil(FractalView.numGens2Display / 2) - 1) - 1;
        lineAtBottomOfSVG.setAttribute("y1", 500 * bottomFeederY + 300);
        lineAtBottomOfSVG.setAttribute("y2", 500 * bottomFeederY + 300);

        for (let index = 0; index < 2 ** (FractalView.numGens2Display - 1); index++) {
            const element = document.getElementById("lineForPerson" + index);
            const vitalDIV = document.getElementById("vital" + index);
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

            let theBoxTightness = FractalView.currentSettings["general_options_tightness"];
            let vBoxHeight = FractalView.currentSettings["general_options_vBoxHeight"];
            let xScaleFactor = boxWidth / (580 - theBoxTightness * 180);
            // let yScaleFactor = (currentMaxHeight4Box * 1 + 84.0 + theBoxTightness * 80) / 200;
            let yScaleFactor = (currentMaxHeight4Box - 80 + theBoxTightness * 80) / 200;

            let vSpacing = FractalView.currentSettings["general_options_vSpacing"];

            if (vBoxHeight > 0) {
                vSpacing = Math.max(1, Math.min(10, vSpacing));
                currentMaxHeight4Box = 20 + vSpacing * 20;
            }

            yScaleFactor = currentMaxHeight4Box / 153;
            condLog("currentMaxHeight4Box = ", currentMaxHeight4Box, "(drawlines)");
            // let yScaleFactor = (currentMaxHeight4Box + 80 + theBoxTightness * 80)  / 200  ;
            for (let g = 1; g <= thisGenNum; g++) {
                if (g % 2 == 1) {
                    X +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            xScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * xScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "X",X);
                } else {
                    Y +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            yScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * yScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "Y",Y);
                }
            }

            condLog(index, thisGenNum, "X,Y (initially) = ", X, Y);

            for (let g = 1; g <= thisGenNum + 1; g++) {
                // if (vBoxHeight > 0) {
                //     yScaleFactor = vBoxHeight / FractalView.maxDiamPerGen[g];
                // }
                if (g % 2 == 1) {
                    if (g <= thisGenNum) {
                        X +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                                2 *
                                FractalView.maxDiamPerGen[g] *
                                xScaleFactor -
                            1 * FractalView.maxDiamPerGen[g] * xScaleFactor;
                    }

                    Xj +=
                        0 +
                        ((j & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            xScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * xScaleFactor;
                    Xk +=
                        0 +
                        ((k & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            xScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * xScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "X",X);
                } else {
                    if (g <= thisGenNum) {
                        Y +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                                2 *
                                FractalView.maxDiamPerGen[g] *
                                yScaleFactor -
                            1 * FractalView.maxDiamPerGen[g] * yScaleFactor;
                    }
                    Yj +=
                        0 +
                        ((j & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            yScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * yScaleFactor;
                    Yk +=
                        0 +
                        ((k & (2 ** (thisGenNum + 1 - g))) / 2 ** (thisGenNum + 1 - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            yScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * yScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "Y",Y);
                }
            }
            if (
                vitalDIV &&
                vitalDIV.parentNode &&
                vitalDIV.parentNode.parentNode &&
                vitalDIV.parentNode.parentNode.parentNode
            ) {
                const vital_Y = vitalDIV.parentNode.parentNode.parentNode.getAttribute("y");
                const vitalDY = 0 - vital_Y - vitalDIV.offsetHeight / 2 - 15; // extra 15 is for margin buffer fudge factor
                if (vitalDY > 0 || vitalDY < 0) {
                    Yj -= vitalDY;
                    Yk -= vitalDY;
                    Y -= vitalDY;
                }
                condLog(
                    "New Y values = Y, Yj, Yk = { ",
                    Y,
                    Yj,
                    Yk,
                    "}",
                    " vital.y = ",
                    vital_Y,
                    "offsetHt:",
                    vitalDIV.offsetHeight,
                    "DY:",
                    vitalDY
                );
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
        // condLog("numGensSpan:", numGensSpan);
        if (FractalView.numGens2Display > FractalView.numGensRetrieved) {
            loadAncestorsAtLevel(FractalView.numGens2Display);
            FractalView.numGensRetrieved = FractalView.numGens2Display;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        condLog("Need to load MORE peeps from Generation ", newLevel);
        let theListOfIDs = FractalView.myAhnentafel.list[1]; //OfAncestorsToBeLoadedForLevel(newLevel);
        // condLog(theListOfIDs);
        if (theListOfIDs.length == 0) {
            // condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            FractalView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            FractalView.numGensRetrieved++;
            FractalView.workingMaxNumGens = Math.min(FractalView.maxNumGens, FractalView.numGensRetrieved + 1);
        } else {
            // WikiTreeAPI.getRelatives(
            let loadingTD = document.getElementById("loadingTD");
            loadingTD.innerHTML = "loading";
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
                    "MiddleName",
                    "RealName",
                    "IsLiving",
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
                    "DataStatus",
                    "Manager",
                    "BirthDateDecade",
                    "DeathDateDecade",
                    "Bio",
                ],
                { ancestors: newLevel, minGeneration: newLevel }
            ).then(function (result) {
                if (result) {
                    // need to put in the test ... in case we get a null result, which we will eventually at the end of the line
                    FractalView.theAncestors = result[2];
                    // condLog("theAncestors:", FractalView.theAncestors);
                    // condLog("person with which to drawTree:", person);
                    for (const index in FractalView.theAncestors) {
                        thePeopleList.add(FractalView.theAncestors[index]);

                        let thePerson = new BioCheckPerson();
                        let canUseThis = thePerson.canUse(FractalView.theAncestors[index], false, true, "Clarke-11007");
                        let biography = new Biography(theSourceRules);
                        biography.parse(thePerson.getBio(), thePerson, "");
                        let hasSources = biography.validate();
                        thePeopleList[thePerson.getProfileId()]["biocheck"] = biography;
                        thePeopleList[thePerson.getProfileId()]["bioHasSources"] = hasSources;

                        // console.log(
                        //     "async adding ",
                        //     thePerson.getReportName(),
                        //     canUseThis,
                        //     hasSources,
                        //     biography.getInlineRefCount(),
                        //     biography.getPossibleSourcesLineCount(),
                        //     biography.hasStyleIssues(),
                        //     biography.isMissingSourcesHeading(),
                        //     thePeopleList[thePerson.getProfileId()].biocheck
                        // );
                    }
                    FractalView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    FractalView.workingMaxNumGens = Math.min(FractalView.maxNumGens, FractalView.numGensRetrieved + 1);

                    clearMessageBelowButtonBar();
                    loadingTD.innerHTML = "&nbsp;";
                    // loadBiosNow(theListOfIDs, newLevel);
                    findCategoriesOfAncestors();
                }
            });
        }
    }
    // Redraw the Wedges if needed for the Fractal Tree
    function redoWedgesForFractal() {
        // condLog("TIme to RE-WEDGIFY !", this, FractalView);

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

                    //  condLog(SVGcode.id);
                    d3.select("#" + SVGcode.id).attrs({ d: SVGcode.d, display: "block" }); // CHANGE the drawing commands to adjust the wedge shape ("d"), and make sure the wedge is visible ("display:block")

                    let theWedge = d3.select("#" + SVGcode.id);
                    //  condLog( "theWedge:",theWedge[0][0] );
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

    // CYCLE through all the Person Boxes in the Fractal Tree to find a Max Height, and then reposition if needed
    function adjustHeightsIfNeeded() {
        let maxHt = 0;
        let maxVitalHt = 0;
        let originalMaxHt = currentMaxHeight4Box;
        for (let ahnNum = 1; ahnNum < 2 ** FractalView.numGens2Display; ahnNum++) {
            const elem = document.getElementById("wedgeInfoFor" + ahnNum);
            const vital = document.getElementById("vital" + ahnNum);
            if (elem) {
                const rect = elem.getBoundingClientRect();
                if (elem) {
                    condLog("ELEM Ht = ", rect.height);
                    maxHt = Math.max(maxHt, rect.height);
                }
            }
            if (vital) {
                condLog("vital Ht = ", vital.offsetHeight);
                maxVitalHt = Math.max(maxVitalHt, vital.offsetHeight);
            }
        }
        condLog("TALLEST Box = ", maxHt);
        condLog("TALLEST VITAL Box = ", maxVitalHt);

        const primePerp = document.getElementById("vital1");
        condLog(primePerp);
        for (const prop in primePerp) {
            // if (Object.hasOwnProperty.call(primePerp, prop)) {
            const val = primePerp[prop];
            // condLog(prop, val);
            // }
        }

        let theBoxTightness = FractalView.currentSettings["general_options_tightness"];

        let vBoxHeight = FractalView.currentSettings["general_options_vBoxHeight"];
        let vSpacing = FractalView.currentSettings["general_options_vSpacing"];

        let prevCurrentMax = currentMaxHeight4Box;
        let doAdjust = false;
        if (vBoxHeight > 0) {
            vSpacing = Math.max(1, Math.min(10, vSpacing));
            doAdjust = 20 + vSpacing * 20 != currentMaxHeight4Box;
            currentMaxHeight4Box = 20 + vSpacing * 20;
            doAdjust = true;
        } else {
            currentMaxHeight4Box = Math.max(60, maxVitalHt - 70) + theBoxTightness * 20;
            doAdjust = prevCurrentMax != currentMaxHeight4Box;
        }
        let yScaleFactor = currentMaxHeight4Box / 153;
        condLog("currentMaxHeight4Box = ", currentMaxHeight4Box, "(adjustHeightsIfNeeded)");
        condLog("vBoxHeight", vBoxHeight);
        condLog("FractalView.maxDiamPerGen", FractalView.maxDiamPerGen);

        for (let ahnNum = 1; doAdjust && ahnNum < 2 ** FractalView.numGens2Display; ahnNum++) {
            const elem = document.getElementById("wedgeInfoFor" + ahnNum);
            if (elem) {
                let X = 0;
                let Y = 0;
                let i = ahnNum;
                let thisGenNum = Math.floor(Math.log2(ahnNum));
                let xScaleFactor = boxWidth / (580 - theBoxTightness * 180);
                // let yScaleFactor = (currentMaxHeight4Box * 1 + 84.0 + theBoxTightness * 80) / 200;
                // let yScaleFactor = (maxVitalHt - 80 + theBoxTightness * 80) / 200;
                // let yScaleFactor = (currentMaxHeight4Box - 80 + theBoxTightness * 80) / 200;
                // if (vBoxHeight > 0) {
                //     yScaleFactor = currentMaxHeight4Box / 153;
                // }
                for (let g = 1; g <= thisGenNum; g++) {
                    if (g % 2 == 1) {
                        X +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                                2 *
                                FractalView.maxDiamPerGen[g] *
                                xScaleFactor -
                            1 * FractalView.maxDiamPerGen[g] * xScaleFactor;
                        // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "X",X);
                    } else {
                        Y +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                                2 *
                                FractalView.maxDiamPerGen[g] *
                                yScaleFactor -
                            1 * FractalView.maxDiamPerGen[g] * yScaleFactor;
                        // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "Y",Y);
                    }
                }
                condLog(ahnNum, "translate(" + X + "," + Y + ")");
                if (elem.parentNode.parentNode.parentNode) {
                    elem.parentNode.parentNode.parentNode.setAttribute("transform", "translate(" + X + "," + Y + ")");
                }
            }
        }

        if (doAdjust) {
            FractalView.drawLines();
        }

        // condLog( ancestorObject.ahnNum, thisGenNum, thisPosNum, ancestorObject.person._data.FirstName, ancestorObject.person._data.Name , X , Y);
    }

    /** FUNCTION used to force a redraw of the Fractal Tree, used when called from Button Bar after a parameter has been changed */

    FractalView.redraw = function () {
        // condLog("FractalView.redraw");
        // condLog("Now theAncestors = ", FractalView.theAncestors);
        // thePeopleList.listAll();
        recalcAndDisplayNumGens();
        redoWedgesForFractal();
        FractalView.myAncestorTree.draw();
        findCategoriesOfAncestors();
        adjustHeightsIfNeeded();
    };

    FractalView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };

    FractalView.toggleSettings = function () {
        condLog("TIME to TOGGLE the SETTINGS NOW !!!", FractalView.fractalSettingsOptionsObject);
        condLog(FractalView.fractalSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("settingsDIV");
        condLog("SETTINGS ARE:", theDIV.style.display);
        if (!Utils.firstTreeAppPopUpPopped) {
            $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
            Utils.firstTreeAppPopUpPopped = true;
        }
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
            let aboutDIV = document.getElementById("aboutDIV");
            aboutDIV.style.display = "none";
            theDIV.style.zIndex = Utils.getNextZLevel();
        } else {
            theDIV.style.display = "none";
        }
    };

    FractalView.toggleLegend = function () {
        // condLog("TIME to TOGGLE the SETTINGS NOW !!!", FractalView.fanchartSettingsOptionsObject);
        // condLog(FractalView.fanchartSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("legendDIV");
        // condLog("SETTINGS ARE:", theDIV.style.display);
        if (!Utils.firstTreeAppPopUpPopped) {
            $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
            Utils.firstTreeAppPopUpPopped = true;
        }
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    };

    FractalView.hideLegend = function () {
        let theDIV = document.getElementById("legendDIV");
        theDIV.style.display = "none";
    };

    /**
     * Load and display a person
     */
    FractalView.prototype.load = function (id) {
        // condLog("FractalView.prototype.load");
        var self = this;
        self._load(id).then(function (person) {
            // condLog("FractalView.prototype.load : self._load(id) ");
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

            // WikiTreeAPI.getAncestors(APP_ID, id, 3,
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
                    "MiddleName",
                    "RealName",
                    "IsLiving",
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
                    "DataStatus",
                    "Manager",
                    "BirthDateDecade",
                    "DeathDateDecade",
                    "Bio",
                ],
                { ancestors: 3 }
            ).then(function (result) {
                FractalView.theAncestors = result[2];
                condLog("theAncestors:", FractalView.theAncestors);
                condLog("person with which to drawTree:", person);
                for (const ancNum in FractalView.theAncestors) {
                    let thePerson = FractalView.theAncestors[ancNum];
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

                    let theBioPerson = new BioCheckPerson();
                    let canUseThis = theBioPerson.canUse(thePerson, false, true, "Clarke-11007");
                    let biography = new Biography(theSourceRules);
                    biography.parse(theBioPerson.getBio(), theBioPerson, "");
                    let hasSources = biography.validate();
                    thePeopleList[theBioPerson.getProfileId()]["biocheck"] = biography;
                    thePeopleList[theBioPerson.getProfileId()]["bioHasSources"] = hasSources;
                    // console.log(
                    //     "async adding ",
                    //     theBioPerson.getReportName(),
                    //     canUseThis,
                    //     hasSources,
                    //     biography.getInlineRefCount(),
                    //     biography.getPossibleSourcesLineCount(),
                    //     biography.hasStyleIssues(),
                    //     biography.isMissingSourcesHeading(),
                    //     thePeopleList[theBioPerson.getProfileId()].biocheck
                    // );
                }

                person._data.Father = FractalView.theAncestors[id].Father;
                person._data.Mother = FractalView.theAncestors[id].Mother;

                FractalView.myAhnentafel.update(person);

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
                    let thisPeep = thePeopleList[FractalView.myAhnentafel.list[a]];
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
                populateXAncestorList(1);
                fillOutFamilyStatsLocsForAncestors();

                // loadBiosNow(id);
                findCategoriesOfAncestors();
            });
        });
    };

    // This function will load Bios in the background
    function loadBiosNow(id, whichGen = 5) {
        let options = { ancestors: 5 };
        if (whichGen > 5) {
            options = { ancestors: whichGen, minGeneration: whichGen };
        }

        WikiTreeAPI.getPeople(
            // (appId, IDs, fields, options = {})
            APP_ID,
            id,

            ["Bio"],
            options
        ).then(function (result) {
            FractalView.theAncestors = result[2];
            condLog("theAncestors:", FractalView.theAncestors);

            for (const ancNum in FractalView.theAncestors) {
                let thePerson = FractalView.theAncestors[ancNum];
                if (thePeopleList[ancNum] && thePeopleList[ancNum]._data && thePerson.bio && thePerson.bio > "") {
                    thePeopleList[ancNum]._data["bio"] = thePerson.bio;
                }
            }
            condLog("DONE loading BIOS for ", whichGen, "generations from", id);
            findCategoriesOfAncestors();
        });
    }

    /**
     * Load more ancestors. Update existing data in place
     */
    FractalView.prototype.loadMore = function (oldPerson) {
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
    FractalView.prototype._load = function (id) {
        // condLog("INITIAL _load - line:118", id) ;
        let thePersonObject = WikiTreeAPI.getPerson(APP_ID, id, [
            "Id",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "FirstName",
            "MiddleInitial",
            "MiddleName",
            "RealName",
            "IsLiving",
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
            "DataStatus",
        ]);
        // condLog("_load PersonObj:",thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    FractalView.prototype.drawTree = function (data) {
        condLog("FractalView.prototype.drawTree");

        if (data) {
            // condLog("(FractalView.prototype.drawTree WITH data !)");
            this.ancestorTree.data(data);
            // this.descendantTree.data(data);
        }
        this.ancestorTree.draw();
        updateFontsIfNeeded();
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

    /**
     * Draw/redraw the tree
     */
    Tree.prototype.draw = function () {
        condLog("Tree.prototype.draw");
        if (this.root) {
            // var nodes = thePeopleList.listAllPersons();// [];//this.tree.nodes(this.root);
            var nodes = FractalView.myAhnentafel.listOfAncestorsForFanChart(FractalView.numGens2Display); // [];//this.tree.nodes(this.root);
            condLog("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);

            FractalView.maxDiamPerGen = [];
            let widestBox = 200;
            let theBlobBuffer = 20;

            for (let i = 0; i <= FractalView.numGens2Display; i++) {
                FractalView.maxDiamPerGen[i] =
                    2 ** Math.ceil((FractalView.numGens2Display - i) / 2) *
                    (((2 + (i % 2)) * widestBox) / 3 + theBlobBuffer);
            }

            condLog("maxDiamPerGen", FractalView.maxDiamPerGen);

            updateLegendIfNeeded();

            FractalView.drawLines();
            this.drawNodes(nodes);
            updateFontsIfNeeded();
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

        // condLog("this.selector = ", this.selector);

        // Get a list of existing nodes
        var node = this.svg.selectAll("g.person." + this.selector).data(nodes, function (ancestorObject) {
            let person = ancestorObject.person;
            // condLog("var node: function person ? " , person.getId(), ancestorObject.ahnNum);
            // return person;
            return ancestorObject.ahnNum; //getId();
        });

        // condLog("Tree.prototpe.DRAW NODES - SINGULAR node:", node);

        // Add new nodes
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // condLog("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);
        condLog("Adding new node with boxWidth = ", boxWidth);
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

                // EXTRA INFO  (ahnNum or WikiTreeID or nothing)
                let extraInfoForThisAnc = "";
                let extraBR = "";
                condLog("extraInfo setting:", FractalView.currentSettings["general_options_extraInfo"]);
                if (FractalView.currentSettings["general_options_extraInfo"] == "ahnNum") {
                    //FractalView.currentSettings["general_options_colourizeRepeats"] == false) {
                    extraInfoForThisAnc = "[ " + ancestorObject.ahnNum + " ]";
                    extraBR = "<br/>";
                } else if (FractalView.currentSettings["general_options_extraInfo"] == "WikiTreeID") {
                    extraInfoForThisAnc = ancestorObject.Name;
                    extraBR = "<br/>";
                } else if (FractalView.currentSettings["general_options_extraInfo"] == "both") {
                    extraInfoForThisAnc = "[ " + ancestorObject.ahnNum + " ]<br/>" + ancestorObject.Name;
                    extraBR = "<br/>";
                }

                let theClr = "white";
                // SETUP the repeatAncestorTracker
                if (FractalView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                    condLog(
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
                <div class="vital-info"  id=vital${ancestorObject.ahnNum}>
                <span  id=extraInfoFor${ancestorObject.ahnNum}>${extraInfoForThisAnc}${extraBR}</span>
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

        // condLog("line:397 - self just before the DRAW PLUS command: ", self);
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

            let d = ancestorObject.person; //thePeopleList[ person.id ];
            condLog("node.attr.transform  - line:1989 (x,y) = ", d.x, d.y, d._data.Name);

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            // Calculate which position # (starting lower left and going clockwise around the Fractal Tree) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;

            let theInfoBox = document.getElementById("wedgeInfoFor" + ancestorObject.ahnNum);
            let theVitalDIV = document.getElementById("vital" + ancestorObject.ahnNum);

            // COLOUR the div appropriately
            let thisDivsColour = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
            let theInfoBoxParentDIV = null;
            let settingForSpecifyByLocation = FractalView.currentSettings["colour_options_specifyByLocation"];
            let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];

            if (theInfoBox) {
                let theBounds = theInfoBox; //.getBBox();
                let theOutsideClr = "";

                theInfoBoxParentDIV = theInfoBox.parentNode;
                // condLog("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                // theInfoBox.style.width = "300px";
                // theInfoBox.style.x = "-190px";

                // CENTER the DIV and SET its width to 300px
                theInfoBox.parentNode.parentNode.setAttribute("y", -100);
                theInfoBox.parentNode.parentNode.setAttribute("x", 0 - (boxWidth * 3) / 8); // was initially hardcoded as -150, when default boxWidth = 400
                theInfoBox.parentNode.parentNode.setAttribute("width", (boxWidth * 3) / 4); //// was initially hardcoded as 300

                // CHECK for LOCATION SPECIFIC DOUBLE-COLOURS SETTINGS
                if (settingForColourBy == "Location" && settingForSpecifyByLocation == "BirthDeathCountry") {
                    let locString = ancestorObject.person._data["BirthCountry"];
                    let clrIndex = theSortedLocationsArray.indexOf(locString);
                    theOutsideClr = getColourFromSortedLocationsIndex(clrIndex);
                    // condLog("PICK ME PICK ME:", theClr, theInfoBoxParentDIV);
                    // // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                    // theInfoBoxParentDIV.style.backgroundColor = "yellow";

                    // condLog(
                    //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                    //     theClr
                    // );
                } else if (settingForColourBy == "Location" && settingForSpecifyByLocation == "DeathBirthCountry") {
                    let locString = ancestorObject.person._data["DeathCountry"];
                    let clrIndex = theSortedLocationsArray.indexOf(locString);
                    theOutsideClr = getColourFromSortedLocationsIndex(clrIndex);

                    // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                    // theInfoBoxParentDIV.style.backgroundColor = "yellow";
                    //  condLog("PICKER ME PICKER ME:", theClr, theInfoBoxParentDIV);
                    // condLog(
                    //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                    //     theClr
                    // );
                }
                // CHECK to see if this is a Repeat Ancestor AND if ColourizeRepeats option is turned on
                else if (
                    FractalView.currentSettings["general_options_colourizeRepeats"] == true &&
                    repeatAncestorTracker[ancestorObject.person._data.Id]
                ) {
                    thisDivsColour = repeatAncestorTracker[ancestorObject.person._data.Id];
                }
                theInfoBox.setAttribute("style", "background-color: " + thisDivsColour);

                // SET the OUTER DIV to also be white, with a rounded radius and solid border
                if (theOutsideClr == "") {
                    theOutsideClr = thisDivsColour;
                }
                theInfoBox.parentNode.setAttribute(
                    "style",
                    "background-color: " + theOutsideClr + "; padding:15px; border: solid green; border-radius: 15px;"
                );
            }

            // LET'S UPDATE THE NAME !
            let thisDIVtoUpdate = document.getElementById("nameDivFor" + ancestorObject.ahnNum);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.textContent = getSettingsName(d); // REMEMBER that d = ancestorObject.person;
            }
            // let thisNameDIV = thisDIVtoUpdate;
            // LET'S UPDATE THE BIRTH INFO !
            thisDIVtoUpdate = document.getElementById("birthDivFor" + ancestorObject.ahnNum);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.innerHTML = getSettingsDateAndPlace(d, "B");
            }
            // let thisBirthIV = thisDIVtoUpdate;

            // LET'S UPDATE THE DEATH INFO !
            thisDIVtoUpdate = document.getElementById("deathDivFor" + ancestorObject.ahnNum);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.innerHTML = getSettingsDateAndPlace(d, "D");
            }
            // let thisDeathDIV = thisDIVtoUpdate;

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

            let theBoxTightness = FractalView.currentSettings["general_options_tightness"];
            let X = 0;
            let Y = 0;
            let i = ancestorObject.ahnNum;
            let xScaleFactor = boxWidth / (580 - theBoxTightness * 180);
            let yScaleFactor = 1; //(currentMaxHeight4Box - 80 + theBoxTightness * 80) / 200;
            // let yScaleFactor = (currentMaxHeight4Box * 1 + 84.0 + theBoxTightness * 80) / 200;
            if (currentMaxHeight4Box == 0) {
                xScaleFactor = 1;
                yScaleFactor = 1;
            } else {
                yScaleFactor = currentMaxHeight4Box / 153;
            }

            condLog("currentMaxHeight4Box = ", currentMaxHeight4Box, "(transform)");

            // let vBoxHeight = FractalView.currentSettings["general_options_vBoxHeight"];
            // if (vBoxHeight > 0) {
            //     yScaleFactor = currentMaxHeight4Box / 153;
            // }

            // let yScaleFactor = (currentMaxHeight4Box + 80 + theBoxTightness * 80)  / 200  ;
            for (let g = 1; g <= thisGenNum; g++) {
                if (g % 2 == 1) {
                    X +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            xScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * xScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "X",X);
                } else {
                    Y +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                            2 *
                            FractalView.maxDiamPerGen[g] *
                            yScaleFactor -
                        1 * FractalView.maxDiamPerGen[g] * yScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , FractalView.maxDiamPerGen[g] , "Y",Y);
                }
            }
            // condLog( ancestorObject.ahnNum, thisGenNum, thisPosNum, ancestorObject.person._data.FirstName, ancestorObject.person._data.Name , X , Y);

            let newX = X;
            let newY = Y;
            // condLog("Place",d._data.Name,"ahnNum:" + ancestorObject.ahnNum,"Gen:"+thisGenNum,"Pos:" + thisPosNum, FractalView.maxAngle);

            let fontList = [
                "fontBlack",
                "fontDarkGreen",
                "fontDarkRed",
                "fontDarkBlue",
                "fontBrown",
                "fontWhite",
                "fontYellow",
                "fontLime",
                "fontPink",
                "fontCyan",
            ];

            let luminance = 0.501;
            let thisBkgdClr = thisDivsColour; //"white";

            let txtClrSetting = FractalView.currentSettings["colour_options_textColour"];
            condLog("TextClrSetting = ", txtClrSetting);
            let theTextFontClr = "fontBlack";
            if (txtClrSetting == "B&W") {
                luminance = calcLuminance(thisBkgdClr);
                condLog("font for B&W : line 2438  : ", thisBkgdClr, luminance);
                theTextFontClr = luminance > 0.179 ? "fontBlack" : "fontWhite";
                if (thisBkgdClr.indexOf("rgb") > -1) {
                    thisBkgdClr = hexify(thisBkgdClr);
                    if (
                        (thisTextColourArray[thisBkgdClr.toUpperCase()] &&
                            thisTextColourArray[thisBkgdClr.toUpperCase()] == "BLACK") ||
                        thisTextColourArray[thisBkgdClr.toUpperCase()] == "WHITE"
                    ) {
                        theTextFontClr = "font" + thisTextColourArray[thisBkgdClr.toUpperCase()];
                    }
                } else if (
                    (thisTextColourArray[thisBkgdClr.toUpperCase()] &&
                        thisTextColourArray[thisBkgdClr.toUpperCase()] == "BLACK") ||
                    thisTextColourArray[thisBkgdClr.toUpperCase()] == "WHITE"
                ) {
                    theTextFontClr = "font" + thisTextColourArray[thisBkgdClr.toUpperCase()];
                }
            } else if (txtClrSetting == "alt") {
                // theTextFontClr = fontList[ (luminance > 0.179 ? 0 : 5) +
                // Math.max(0, Math.min(4, Math.round(5 * Math.random()))  ) ];
                if (thisBkgdClr.indexOf("rgb") > -1) {
                    thisBkgdClr = hexify(thisBkgdClr);
                }
                theTextFontClr = "font" + thisTextColourArray[thisBkgdClr.toUpperCase()];
                // if (theTextFontClr == undefined) {
                condLog("FONT : ", thisBkgdClr, theTextFontClr, thisTextColourArray);
                // }
            } else {
                theTextFontClr = "fontBlack"; // not really needed ... but for completeness sake, and to make sure there's a legit value
            }

            for (let f = 0; f < fontList.length; f++) {
                const thisFont = fontList[f];
                theVitalDIV.classList.remove(thisFont);
            }

            if (theVitalDIV) {
                theVitalDIV.classList.add(theTextFontClr);
                condLog("theTextFontClr:", theTextFontClr);
                // theVitalDIV.classList.add("fontYellow");
            } else {
                theVitalDIV.classList.add("fontBlack");
            }

            // OK - now that we know where the centre of the universe is ... let's throw those DNA symbols into play !
            // setTimeout(function () {
            showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, 0); // nameAngle = 0 ... taken from FanChart ... leaving here JUST IN CASE we turn the boxes on their side
            showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, 0);
            // }, 200);

            // LET'S UPDATE THOSE EXTRAS TOO ... OK ?
            let theExtraDIV = document.getElementById("extraInfoFor" + ancestorObject.ahnNum);
            let extraInfoForThisAnc = "";
            let extraBR = "";
            condLog("extraInfo setting:", FractalView.currentSettings["general_options_extraInfo"]);
            if (FractalView.currentSettings["general_options_extraInfo"] == "ahnNum") {
                //FractalView.currentSettings["general_options_colourizeRepeats"] == false) {
                extraInfoForThisAnc = "[ " + ancestorObject.ahnNum + " ]";
                extraBR = "<br/>";
            } else if (FractalView.currentSettings["general_options_extraInfo"] == "WikiTreeID") {
                extraInfoForThisAnc = d._data.Name;
                extraBR = "<br/>";
            } else if (FractalView.currentSettings["general_options_extraInfo"] == "both") {
                extraInfoForThisAnc = "[ " + ancestorObject.ahnNum + " ]<br/>" + d._data.Name;
                extraBR = "<br/>";
            }

            if (theExtraDIV) {
                theExtraDIV.innerHTML = extraInfoForThisAnc + extraBR;
            }

            // FINALLY ... we return the transformation statement back - the translation based on our  calculations
            return "translate(" + newX + "," + newY + ")";

            // and if needed a rotation based on the nameAngle
            // return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
    };

     /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup  = function (person) {
        if (!Utils.firstTreeAppPopUpPopped) {
            $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
            Utils.firstTreeAppPopUpPopped = true;
        }

            personPopup.popupHTML(
                person,
                {
                    type: "Ahn",
                    ahNum: FractalView.myAhnentafel.listByPerson[person._data.Id],
                    primaryPerson: thePeopleList[FractalView.myAhnentafel.list[1]],
                    myAhnentafel: FractalView.myAhnentafel,
                    SettingsObj : Utils
                },
                AboutAppIcon,
                "fractal"
            );
        // console.log("FractalView.personPopup");
    };
    
    
    function placeHolder4PersonPopup (person, xy) {
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

        let zoomFactor = Math.max(1, 1 / FractalView.currentScaleFactor);

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
						    <span class="tree-links"><a href="#name=${person.getName()}"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
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
        condLog("Tree.prototype - REMOVE POPUPS (plural) function");
        d3.selectAll(".popup").remove();
    };

    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        condLog("new var ANCESTOR TREE");

        // RESET  the # of Gens parameters
        FractalView.numGens2Display = 3;
        FractalView.lastNumGens = 3;
        FractalView.numGensRetrieved = 3;
        FractalView.maxNumGens = 10;

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

    /**
     * Generate a string representing this person's lifespan 0000 - 0000
     */
    function theAge(person) {
        let BirthDate = person.getBirthDate();
        let age = -2;
        if (person._data.IsLiving) {
            age = -1;
        }
        if (BirthDate && /\d{4}-\d{2}-\d{2}/.test(BirthDate)) {
            var partsBirth = BirthDate.split("-"),
                yearBirth = parseInt(partsBirth[0], 10),
                monthBirth = parseInt(partsBirth[1], 10),
                dayBirth = parseInt(partsBirth[2], 10);
        }

        let DeathDate = person.getDeathDate();
        if (DeathDate && /\d{4}-\d{2}-\d{2}/.test(DeathDate)) {
            var partsDeath = DeathDate.split("-"),
                yearDeath = parseInt(partsDeath[0], 10),
                monthDeath = parseInt(partsDeath[1], 10),
                dayDeath = parseInt(partsDeath[2], 10);
        }

        if (yearBirth > 0 && yearDeath > 0) {
            age = yearDeath - yearBirth;
            if (monthBirth > 0 && monthDeath > 0 && monthBirth > monthDeath) {
                condLog("died before birthday in final year");
                age -= 1;
            } else if (
                monthBirth > 0 &&
                monthDeath > 0 &&
                monthBirth == monthDeath &&
                dayBirth > 0 &&
                dayDeath > 0 &&
                dayBirth > dayDeath
            ) {
                condLog("died before birthday in FINAL MONTH");
                age -= 1;
            }
        }

        return age;
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

    function findCategoriesOfAncestors() {
        condLog("findCategoriesOfAncestors");
        categoryList = [];
        stickerList = [];
        let stickerInnerHTML =
            '<option selected value="-999">Do not use Badge #666#</option><option>CATEGORIES</option>';
        for (let index = 1; index < 2 ** FractalView.numGens2Display; index++) {
            const thisPerp = thePeopleList[FractalView.myAhnentafel.list[index]];
            if (thisPerp) {
                if (thisPerp._data.bio) {
                    parseThisBio(thisPerp._data.bio);
                }
            }
        }
        condLog("ALL CATEGORIES:\n", categoryList);
        condLog("ALL STICKERS:\n", stickerList);
        categoryList.sort();
        stickerList.sort();

        let catNameSelector = document.getElementById("highlight_options_catName");
        let innerCatHTML = '<option selected value="">Pick one:</option>';
        for (let i = 0; i < categoryList.length; i++) {
            const cat = categoryList[i];
            let selectedText = "";
            condLog("FINDING ...  compare:", cat, "vs", currentHighlightCategory);
            if (currentHighlightCategory > "" && cat.indexOf(currentHighlightCategory) > -1) {
                selectedText = " selected ";
                condLog("SELECTED !!!");
            }
            innerCatHTML += '<option value="' + cat + '" ' + selectedText + ">" + cat + "</option>";
            stickerInnerHTML += '<option value="' + i + '">' + cat + "</option>";
        }
        condLog("UPDATING & REDOING the BADGES DROP DOWNS @ 5854");
        if (stickerList.length > 0) {
            stickerInnerHTML += "<option>STICKERS:</option>";
            innerCatHTML += '<option value="Sticker">STICKERS:</option>';
            for (let i = 0; i < stickerList.length; i++) {
                const cat = stickerList[i];
                innerCatHTML += '<option value="' + cat + '">' + cat + "</option>";
                stickerInnerHTML += '<option value="' + (i + categoryList.length) + '">' + cat + "</option>";
            }
        }
        catNameSelector.innerHTML = innerCatHTML;
        for (let i = 1; i <= 4; i++) {
            document.getElementById("stickerCategoryDropDownList" + i).innerHTML = stickerInnerHTML.replace("#666#", i);
            condLog("Updating and checking : Badge # ", i, ":", currentBadges[i]);
            if (currentBadges[i]) {
                condLog(
                    "updating and finding index:",
                    categoryList.indexOf(currentBadges[i]),
                    stickerList.indexOf(currentBadges[i])
                );

                if (categoryList.indexOf(currentBadges[i]) > -1) {
                    document.getElementById("stickerCategoryDropDownList" + i).value = categoryList.indexOf(
                        currentBadges[i]
                    );
                    FractalView.updateBadgesToShow(i);
                } else if (stickerList.indexOf(currentBadges[i]) > -1) {
                    document.getElementById("stickerCategoryDropDownList" + i).value =
                        categoryList.length + stickerList.indexOf(currentBadges[i]);
                    FractalView.updateBadgesToShow(i);
                }
            } else {
                FractalView.updateBadgesToShow(i);
            }
        }

        // HIDE BADGES beyond the numGens2Display
        for (let ahnNum = 2 ** FractalView.numGens2Display; ahnNum < 2 ** FractalView.maxNumGens; ahnNum++) {
            for (let i = 1; i <= 4; i++) {
                const thisDIVid = "badge" + i + "-" + ahnNum + "svg";
                let stickerDIV = document.getElementById(thisDIVid);
                if (stickerDIV) {
                    stickerDIV.parentNode.parentNode.style.display = "none";
                }
            }
        }

        // Look again to see if the current outer ring needs its peeps highlighted or not
        if (FractalView.currentSettings["highlight_options_showHighlights"] == true) {
            for (let pos = 0; pos < 2 ** (FractalView.numGens2Display - 1); pos++) {
                let ahnNum = 2 ** (FractalView.numGens2Display - 1) + pos;
                let doIt = doHighlightFor(FractalView.numGens2Display, pos, ahnNum);
                if (doIt == true) {
                    let theInfoBox = document.getElementById("wedgeInfoFor" + ahnNum);
                    theInfoBox.setAttribute("style", "background-color: " + "yellow");
                }
            }
        }
    }

    function parseThisBio(bio) {
        let searchPrefix = "[[Category:";
        let catBeginBrackets = bio.indexOf(searchPrefix);
        while (catBeginBrackets > -1) {
            let catEndBrackets = bio.indexOf("]]", catBeginBrackets);
            if (catEndBrackets > -1) {
                condLog(bio.substring(catBeginBrackets, catEndBrackets));
                let thisCatName = bio.substring(catBeginBrackets + 11, catEndBrackets).trim();
                if (categoryList.indexOf(thisCatName) == -1) {
                    categoryList.push(thisCatName);
                }
                catBeginBrackets = bio.indexOf(searchPrefix, catEndBrackets);
            } else {
                catBeginBrackets = -2;
            }
        }

        let stickBeginBrackets = bio.indexOf("{{");
        let acceptedStickers = [
            "Sticker",
            "Adopted Child",
            "Died Young",
            "Multiple Births",
            "Estimated Date",
            "Unsourced",
        ];
        while (stickBeginBrackets > -1) {
            let stickEndBrackets = bio.indexOf("}}", stickBeginBrackets);
            let stickPipe = bio.indexOf("|", stickBeginBrackets);
            if (stickEndBrackets > -1) {
                if (stickPipe > stickBeginBrackets && stickPipe < stickEndBrackets) {
                    stickEndBrackets = stickPipe;
                }
                condLog(bio.substring(stickBeginBrackets, stickEndBrackets));
                let thisStickName = bio.substring(stickBeginBrackets + 2, stickEndBrackets).trim();
                if (stickerList.indexOf(thisStickName) == -1) {
                    let OK2UseThisSticker = false;
                    for (let index = 0; index < acceptedStickers.length && !OK2UseThisSticker; index++) {
                        const element = acceptedStickers[index];
                        if (thisStickName.indexOf(element) > -1) {
                            OK2UseThisSticker = true;
                            if (element == "Adopted Child") {
                                thisStickName = element;
                            }
                        }
                    }
                    if (OK2UseThisSticker) {
                        stickerList.push(thisStickName);
                    }
                }
                stickBeginBrackets = bio.indexOf("{{", stickEndBrackets);
            } else {
                stickBeginBrackets = -2;
            }
        }
    }

    // GET and SET LOCATION info for Ancestors and PERP in question

    function fillOutFamilyStatsLocsForAncestors() {
        for (let index = 1; index < 2 ** FractalView.maxNumGens; index++) {
            const thisPerp = thePeopleList[FractalView.myAhnentafel.list[index]];
            if (thisPerp) {
                thisPerp._data["age"] = theAge(thisPerp);
                thisPerp._data["BirthCountry"] = getLocationFromString(thisPerp._data.BirthLocation, "C");
                thisPerp._data["DeathCountry"] = getLocationFromString(thisPerp._data.DeathLocation, "C");
                thisPerp._data["BirthRegion"] = getLocationFromString(thisPerp._data.BirthLocation, "R");
                thisPerp._data["DeathRegion"] = getLocationFromString(thisPerp._data.DeathLocation, "R");
                thisPerp._data["BirthTown"] = getLocationFromString(thisPerp._data.BirthLocation, "T");
                thisPerp._data["DeathTown"] = getLocationFromString(thisPerp._data.DeathLocation, "T");
                thisPerp._data["BirthTownFull"] = thisPerp._data.BirthLocation;
                thisPerp._data["DeathTownFull"] = thisPerp._data.DeathLocation;
                condLog(
                    thisPerp._data.FirstName,
                    thisPerp._data.age,
                    "*" + thisPerp._data.BirthRegion + "*",
                    "#" + thisPerp._data.DeathRegion + "#"
                );
            }
        }
    }
    function fillOutFamilyStatsLocsForPerp(thisPerp) {
        if (thisPerp) {
            thisPerp._data["age"] = theAge(thisPerp);
            thisPerp._data["BirthCountry"] = getLocationFromString(thisPerp._data.BirthLocation, "C");
            thisPerp._data["DeathCountry"] = getLocationFromString(thisPerp._data.DeathLocation, "C");
            thisPerp._data["BirthRegion"] = getLocationFromString(thisPerp._data.BirthLocation, "R");
            thisPerp._data["DeathRegion"] = getLocationFromString(thisPerp._data.DeathLocation, "R");
            thisPerp._data["BirthTown"] = getLocationFromString(thisPerp._data.BirthLocation, "T");
            thisPerp._data["DeathTown"] = getLocationFromString(thisPerp._data.DeathLocation, "T");
            thisPerp._data["BirthTownFull"] = thisPerp._data.BirthLocation;
            thisPerp._data["DeathTownFull"] = thisPerp._data.DeathLocation;
            condLog(
                thisPerp._data.FirstName,
                thisPerp._data.age,
                "*" + thisPerp._data.BirthRegion + "*",
                "#" + thisPerp._data.DeathRegion + "#"
            );
        }
        return "done";
    }

    function getLocationFromString(locString, locType) {
        if (!locString || locString == "") {
            return "";
        }
        if (locType == "C") {
            if (locString.indexOf(",") > -1) {
                let lastCommaAt = locString.indexOf(",");
                let nextCommaAt = lastCommaAt;
                while (nextCommaAt > -1) {
                    nextCommaAt = locString.indexOf(",", lastCommaAt + 1);
                    if (nextCommaAt > -1) {
                        lastCommaAt = nextCommaAt;
                    }
                }

                return locString.substr(lastCommaAt + 1).trim();
            } else {
                return locString;
            }
        } else if (locType == "R") {
            if (locString.indexOf(",") > -1) {
                let lastCommaAt = locString.indexOf(",");
                let penultimateCommaAt = -1;
                let nextCommaAt = lastCommaAt;
                while (nextCommaAt > -1) {
                    nextCommaAt = locString.indexOf(",", lastCommaAt + 1);
                    if (nextCommaAt > -1) {
                        penultimateCommaAt = lastCommaAt;
                        lastCommaAt = nextCommaAt;
                    }
                }
                if (penultimateCommaAt > -1) {
                    return locString.substr(penultimateCommaAt + 1).trim();
                } else {
                    return locString.substr(lastCommaAt + 1).trim();
                }
            } else {
                return locString;
            }
        } else {
            if (locString.indexOf(",") > -1) {
                return locString.substr(0, locString.indexOf(",")).trim();
            } else {
                return locString.trim();
            }
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
     * Turn a wikitree formatted date into a date as per format string
     */
    function settingsStyleDate(dateString, formatString) {
        // condLog("settingsStyleDate:", dateString, formatString);
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
                    let month2digits = month;
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
                    thisPlace = Utils.settingsStyleLocation(
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
                    thisPlace = Utils.settingsStyleLocation(
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
                datePlaceString += "<br/>";
            }
            if (thisPlace > "") {
                datePlaceString += thisPlace;
            }
        }
        // condLog("SENDING getSettingsDate: ", datePlaceString);
        return datePlaceString;
    }

    /**
     * Return the name as required by the Settings options.
     */
    function getSettingsName(person) {
        const maxLength = 50;
        condLog("IXes : ", person._data.Prefix, person._data.Suffix);
        let theName = "";
        // condLog(
        //     "Prefix check: ",
        //     FractalView.currentSettings["name_options_prefix"], person._data
        // );
        if (
            FractalView.currentSettings["name_options_prefix"] == true &&
            person._data.Prefix &&
            person._data.Prefix > ""
        ) {
            theName = person._data.Prefix + " ";
            // theName = "PRE ";
        }

        if (FractalView.currentSettings["name_options_firstName"] == "FirstNameAtBirth") {
            if (person._data.FirstName) {
                theName += person._data.FirstName;
            } else if (person._data.RealName) {
                theName += person._data.RealName;
            } else {
                theName += "Private";
            }
        } else {
            if (person._data.RealName) {
                theName += person._data.RealName;
            } else {
                theName += "Private";
            }
        }

        if (FractalView.currentSettings["name_options_middleName"] == true) {
            if (person._data.MiddleName > "") {
                theName += " " + person._data.MiddleName;
            }
        } else if (FractalView.currentSettings["name_options_middleInitial"] == true) {
            if (person._data.MiddleInitial > "" && person._data.MiddleInitial != ".") {
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

        if (
            FractalView.currentSettings["name_options_suffix"] == true &&
            person._data.Suffix &&
            person._data.Suffix > ""
        ) {
            theName += " " + person._data.Suffix;
            // theName += " Suf";
        }

        return theName;

        // const birthName = person.getDisplayName();
        // const middleInitialName = `${person._data.FirstName} ${person._data.MiddleInitial} ${person._data.LastNameAtBirth}`;
        // const noMiddleInitialName = `${person._data.FirstName} ${person._data.LastNameAtBirth}`;
        // const fullMealDeallName = `${person._data.Prefix} ${person._data.FirstName} ${person._data.MiddleName} ${person._data.LastNameCurrent} ${person._data.Suffix} `;

        // condLog("FULL: " , fullMealDeallName);

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

    var thisTextColourArray = {};
    function updateLegendIfNeeded() {
        condLog("DOING updateLegendIfNeeded");
        let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];
        let settingForSpecifyByFamily = FractalView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = FractalView.currentSettings["colour_options_specifyByLocation"];
        let legendDIV = document.getElementById("legendDIV");
        let innerLegendDIV = document.getElementById("innerLegend");
        condLog("settingForSpecifyByLocation:", settingForSpecifyByLocation);
        let fontList = [
            "Black",
            "DarkGreen",
            "DarkRed",
            "DarkBlue",
            "Brown",
            "White",
            "Yellow",
            "Lime",
            "Pink",
            "Cyan",
        ];
        let txtClrSetting = FractalView.currentSettings["colour_options_textColour"];

        thisTextColourArray = {};
        let thisColourArray = getColourArray();

        if (settingForColourBy == "Family") {
            // condLog("TextClrSetting = ", txtClrSetting);

            let innerCode = "";
            let clrSwatchArray = [];
            for (let index = 0; index < 12; index++) {
                let theTextFontClr = "Black";
                let luminance = calcLuminance(thisColourArray[index]);
                if (txtClrSetting == "B&W") {
                    theTextFontClr = luminance > 0.179 ? "Black" : "White";
                } else if (txtClrSetting == "alt") {
                    theTextFontClr = fontList[(luminance > 0.179 ? 0 : 5) + (index % 5)]; // Math.max(0, Math.min(4, Math.round(5 * Math.random())))];
                } else {
                    theTextFontClr = "Black"; // not really needed ... but for completeness sake, and to make sure there's a legit value
                }
                condLog("FamTxtClr: Bkgd:", thisColourArray[index], "lum:", luminance, "txt:", theTextFontClr);
                thisTextColourArray[thisColourArray[index].toUpperCase()] = theTextFontClr;

                clrSwatchArray.push(
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                        thisColourArray[index] +
                        ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15 fill='" +
                        theTextFontClr +
                        "'>A</text></svg>"
                );
            }

            if (settingForSpecifyByFamily == "age") {
                let clrSwatchUNK =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "white" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";
                let clrSwatchLIVING =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "lime" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";
                innerCode = clrSwatchUNK + " age unknown <br/>" + clrSwatchLIVING + " still living";
                for (let index = 0; index < 10; index++) {
                    innerCode += "<br/>" + clrSwatchArray[index + 1] + " " + index * 10 + " - " + (index * 10 + 9);
                }
                innerCode += "<br/>" + clrSwatchArray[11] + " over 100";
            }
            //  condLog("thisTextColourArray", thisTextColourArray);
            innerLegendDIV.innerHTML = innerCode;
            legendDIV.style.display = "block";
        } else if (settingForColourBy == "Location") {
            // thisTextColourArray = {};
            // let thisColourArray = getColourArray();
            let innerCode = "";
            // LET's FIRST setup the ARRAY of UNIQUE LOCATIONS
            uniqueLocationsArray = [];
            for (let index = 1; index < 2 ** FractalView.maxNumGens; index++) {
                const thisPerp = thePeopleList[FractalView.myAhnentafel.list[index]];
                if (thisPerp) {
                    if (
                        settingForSpecifyByLocation == "BirthDeathCountry" ||
                        settingForSpecifyByLocation == "DeathBirthCountry"
                    ) {
                        let thisLoc = thisPerp._data["BirthCountry"];
                        if (thisLoc && uniqueLocationsArray.indexOf(thisLoc) == -1) {
                            uniqueLocationsArray.push(thisLoc);
                        }
                        thisLoc = thisPerp._data["DeathCountry"];
                        if (thisLoc && uniqueLocationsArray.indexOf(thisLoc) == -1) {
                            uniqueLocationsArray.push(thisLoc);
                        }
                    } else {
                        let thisLoc = thisPerp._data[settingForSpecifyByLocation];
                        if (thisLoc && uniqueLocationsArray.indexOf(thisLoc) == -1) {
                            uniqueLocationsArray.push(thisLoc);
                        }
                    }
                }
            }
            let revLocArray = reverseCommaArray(uniqueLocationsArray, true);
            condLog(revLocArray);
            revLocArray.sort();
            uniqueLocationsArray = reverseCommaArray(revLocArray, false);

            let clrSwatchUNK =
                "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                "white" +
                ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";

            //     let rgbArray = hslToRgb(255, 1, 0.5);
            // condLog("hslToRgb:", rgbArray );
            // condLog("RGB = ", fractionToHexChar(rgbArray[0]) );
            // condLog("RGB = ", fractionToHexChar(rgbArray[1]) );
            // condLog("RGB = ", fractionToHexChar(rgbArray[2]) );

            innerCode += "<br/>" + clrSwatchUNK + " unknown";

            for (let index = 0; index < uniqueLocationsArray.length; index++) {
                let hue = Math.round((360 * index) / uniqueLocationsArray.length);
                let sat = 1 - (index % 2) * -0.15;
                let lit = 0.5 + ((index % 7) - 3) * 0.05;
                let thisClr = hslToRGBhex(hue, sat, lit);
                let theTextFontClr = "Black";
                //  condLog("Compare CLRS: ", thisClr, " vs ", thisColourArray[index]);
                let luminance = calcLuminance(thisColourArray[index]);
                if (txtClrSetting == "B&W") {
                    theTextFontClr = luminance > 0.179 ? "Black" : "White";
                    if (lit < 0.4) {
                        theTextFontClr = "White";
                    } else if (lit >= 0.6) {
                        theTextFontClr = "Black";
                    }
                    if (hue < 20 || (hue > 200 && hue < 300) || hue > 340) {
                        theTextFontClr = "White";
                    } else if (hue > 60 && hue < 170) {
                        theTextFontClr = "Black";
                    }
                } else if (txtClrSetting == "alt") {
                    let darkLight = luminance > 0.179 ? 0 : 5;
                    if (lit < 0.4) {
                        darkLight = 5;
                    } else if (lit >= 0.6) {
                        darkLight = 0;
                    }
                    if (hue < 20 || (hue > 200 && hue < 295) || hue > 340) {
                        darkLight = 5;
                    } else if (hue > 305 && hue < 330) {
                        if (lit <= 0.4) {
                            darkLight = 5;
                        } else {
                            darkLight = 0;
                        }
                    } else if (hue > 60 && hue < 170) {
                        darkLight = 0;
                    }
                    theTextFontClr = fontList[darkLight + (index % 5)]; // //Math.max(0, Math.min(4, Math.round(5 * Math.random())))
                } else {
                    theTextFontClr = "Black"; // not really needed ... but for completeness sake, and to make sure there's a legit value
                }
                //  condLog("CLR:", hue, sat, lit, thisClr, luminance, theTextFontClr);
                thisTextColourArray[thisClr.toUpperCase()] = theTextFontClr;
                let clrSwatch =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    thisClr +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15 fill='" +
                    theTextFontClr +
                    "'>A</text></svg>";
                // let clrSwatch =
                //     "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                //     thisColourArray[index % thisColourArray.length] +
                //     ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";
                innerCode += "<br/>" + clrSwatch + " " + uniqueLocationsArray[index];
                //  +
                // " H:" +
                // Math.round(hue) +
                // " lit:" +
                // lit +
                // " L:" +
                // luminance;
            }

            theSortedLocationsArray = uniqueLocationsArray;
            //  condLog(theSortedLocationsArray);
            // condLog("LOCS not sorted we think ...");
            // condLog(uniqueLocationsArray);

            // condLog("LOCS yes SORTED we think ...");
            // condLog(sortedLocs);
            innerLegendDIV.innerHTML = innerCode;
            legendDIV.style.display = "block";
        } else {
            for (let index = 0; index < thisColourArray.length; index++) {
                let theTextFontClr = "Black";
                let luminance = calcLuminance(thisColourArray[index]);
                if (txtClrSetting == "B&W") {
                    theTextFontClr = luminance > 0.179 ? "Black" : "White";
                } else if (txtClrSetting == "alt") {
                    theTextFontClr = fontList[(luminance > 0.179 ? 0 : 5) + (index % 5)]; // Math.max(0, Math.min(4, Math.round(5 * Math.random())))];
                } else {
                    theTextFontClr = "Black"; // not really needed ... but for completeness sake, and to make sure there's a legit value
                }
                //  condLog("FamTxtClr: Bkgd:", thisColourArray[index], "lum:", luminance, "txt:", theTextFontClr);
                thisTextColourArray[thisColourArray[index].toUpperCase()] = theTextFontClr;

                // clrSwatchArray.push(
                //     "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                //         thisColourArray[index] +
                //         ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15 fill='" +
                //         theTextFontClr +
                //         "'>A</text></svg>"
                // );
            }
        }
    }

    function reverseCommaArray(arr, addSpace = false) {
        let newArr = [];
        for (var i = 0; i < arr.length; i++) {
            let aPieces = arr[i].split(",");
            let elem = "";
            for (var j = aPieces.length - 1; j >= 0; j--) {
                if (elem > "") {
                    elem += ",";
                }
                elem += aPieces[j];
            }
            if (addSpace == true && aPieces.length == 1) {
                elem = " " + elem;
            } else if (addSpace == false && aPieces.length == 1) {
                elem = elem.trim();
            }
            newArr.push(elem);
        }
        return newArr;
    }

    function hslToRGBhex(hue, sat, lum) {
        let rgbArray = hslToRgb(hue, sat, lum);
        let hexClr =
            "#" + fractionToHexChar(rgbArray[0]) + fractionToHexChar(rgbArray[1]) + fractionToHexChar(rgbArray[2]);
        return hexClr;
    }

    function fractionToHexChar(p) {
        let hx = Math.min(255, Math.max(0, Math.round(p * 256)));
        // condLog("convert ", p, " to ", hx , " to ", hx.toString(16));
        hx = hx.toString(16);
        if (hx.length < 2) {
            hx = "0" + hx;
        }
        return hx;
    }

    function hslToRgb(h, s, l) {
        const C = (1 - Math.abs(2 * l - 1)) * s;
        const hPrime = h / 60;
        const X = C * (1 - Math.abs((hPrime % 2) - 1));
        const m = l - C / 2;
        const withLight = (r, g, b) => [r + m, g + m, b + m];
        if (hPrime <= 1) {
            return withLight(C, X, 0);
        } else if (hPrime <= 2) {
            return withLight(X, C, 0);
        } else if (hPrime <= 3) {
            return withLight(0, C, X);
        } else if (hPrime <= 4) {
            return withLight(0, X, C);
        } else if (hPrime <= 5) {
            return withLight(X, 0, C);
        } else if (hPrime <= 6) {
            return withLight(C, 0, X);
        }
    }

    function clrComponentValue(rgbValue) {
        let sRGB = rgbValue / 255;
        if (sRGB <= 0.04045) {
            return sRGB / 12.92;
        } else {
            return ((sRGB + 0.055) / 1.055) ** 2.4;
        }
    }

    function hex2array(hexString) {
        let trans = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        let theRGBarray = [
            16 * trans.indexOf(hexString.substr(1, 1)) + trans.indexOf(hexString.substr(2, 1)),
            16 * trans.indexOf(hexString.substr(3, 1)) + trans.indexOf(hexString.substr(4, 1)),
            16 * trans.indexOf(hexString.substr(5, 1)) + trans.indexOf(hexString.substr(6, 1)),
        ];
        return theRGBarray;
    }

    function hexify(clr) {
        let hex = "#";
        let trans = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        if (clr.indexOf("rgb") > -1) {
            clr = clr.replace("rgb(", "").replace(")", "");
            rgbClrs = clr.split(",");
        }
        for (let i = 0; i < rgbClrs.length; i++) {
            const comp = rgbClrs[i];
            let sixteens = Math.floor(comp / 16);
            let ones = comp - 16 * sixteens;
            hex += trans[sixteens] + trans[ones];
        }
        return hex;
    }
    function calcLuminance(initBkgdClr) {
        let rgbClrs = [80, 80, 80];
        if (initBkgdClr.indexOf("rgb") > -1) {
            initBkgdClr = initBkgdClr.replace("rgb(", "").replace(")", "");
            rgbClrs = initBkgdClr.split(",");
        } else if (initBkgdClr.indexOf("#") > -1) {
            rgbClrs = hex2array(initBkgdClr.toUpperCase());
        } else {
            let wasFound = false;
            for (let index = 0; index < FullColoursArray.length; index++) {
                const element = FullColoursArray[index];
                if (element[1].toUpperCase() == initBkgdClr.toUpperCase()) {
                    //  condLog("FOUND ", element);
                    wasFound = true;
                    rgbClrs = hex2array(element[2]);
                    break;
                }
            }
            if (!wasFound) {
                //  condLog("FOUND - COULD NOT FIND COLOUR:", initBkgdClr);
                rgbClrs = [40, 40, 40];
            }
        }
        let luminance =
            0.2126 * clrComponentValue(1.0 * rgbClrs[0]) +
            0.7152 * clrComponentValue(1.0 * rgbClrs[1]) +
            0.0722 * clrComponentValue(1.0 * rgbClrs[2]);

        return luminance;
    }

    function switchFontColour(element, newClr) {
        let fontList = [
            "fontBlack",
            "fontDarkGreen",
            "fontDarkRed",
            "fontDarkBlue",
            "fontBrown",
            "fontWhite",
            "fontYellow",
            "fontLime",
            "fontPink",
            "fontCyan",
        ];
        if (fontList.indexOf(newClr) == -1) {
            condLog("Invalid colour sent to switchFontColour:", newClr);
            return; // don't change anything - an invalid font has been entered
        }
        // let newClr  = fontList[ Math.max(0, Math.min(fontList.length - 1, Math.round(fontList.length * Math.random() )) )];
        element.classList.remove("fontBlack");
        element.classList.remove("fontDarkGreen");
        element.classList.remove("fontDarkRed");
        element.classList.remove("fontDarkBlue");
        element.classList.remove("fontBrown");
        element.classList.remove("fontWhite");
        element.classList.remove("fontYellow");
        element.classList.remove("fontLime");
        element.classList.remove("fontPink");
        element.classList.remove("fontCyan");
        element.classList.add(newClr);
    }

    function updateFontsIfNeeded() {
        if (
            FractalView.currentSettings["general_options_font4Names"] == font4Name &&
            FractalView.currentSettings["general_options_font4Info"] == font4Info
        ) {
            // console.log("NOTHING to see HERE in UPDATE FONT land");
        } else {
            condLog(
                "Update Fonts:",
                FractalView.currentSettings["general_options_font4Names"],
                font4Name,
                FractalView.currentSettings["general_options_font4Info"],
                font4Info
            );
            condLog(FractalView.currentSettings);

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
            condLog("Peep:", peepNameID);
        }
    }

    FractalView.updateBadgesToShow = function (num = 1) {
        condLog("UPDATING BADGES NOW !!!!", num);
        let showBadges = FractalView.currentSettings["general_options_showBadges"];
        let theDropDown = document.getElementById("stickerCategoryDropDownList" + num);
        let searchText = "Clarke";
        let searchPrefix = "[[Category:";
        if (theDropDown.value > -1) {
            if (theDropDown.value && theDropDown.value < categoryList.length) {
                searchText = categoryList[theDropDown.value];
            } else {
                searchText = stickerList[theDropDown.value - categoryList.length];
                searchPrefix = "{{";
            }
        } else {
            showBadges = false;
        }
        condLog("UPDATING the STICKERS to show # ", num, theDropDown.value, searchText);

        let rawValue = searchText.trim();
        let spacelessValue = searchText.trim().replace(/ /g, "_");

        currentBadges[num] = rawValue;

        for (let ahnNum = 1; ahnNum < 2 ** FractalView.numGens2Display; ahnNum++) {
            const thisDIVid = "badge" + num + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);

            let wedgeInfoDIV = document.getElementById("wedgeInfoFor" + ahnNum);
            let wedgeDIV = null;
            if (wedgeInfoDIV) {
                wedgeDIV = wedgeInfoDIV.parentNode;
            }
            if (stickerDIV) {
                stickerDIV.parentNode.parentNode.style.display = "none";
            }
            // condLog(
            //     "updating's wedge:",
            //     ahnNum,
            //     // wedgeDIV.parentNode,
            //     showBadges,
            //     stickerDIV,
            //     stickerDIV.parentNode.parentNode.style.display
            // );

            if (
                showBadges &&
                stickerDIV &&
                wedgeDIV &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + spacelessValue
                    ) > -1)
            ) {
                //  SHOW THIS STICKER
                let SVGgraphicsDIV = document.getElementById("SVGgraphics");
                //  SVGgraphicsDIV.append(stickerDIV.parentNode.parentNode);
                //  stickerDIV.parentNode.parentNode.style.display = "block";

                condLog(
                    "Xs : ",
                    wedgeDIV.getAttribute("x"),
                    wedgeDIV.parentNode.getAttribute("x"),
                    wedgeDIV.parentNode.parentNode.getAttribute("transform"),
                    "||",
                    stickerDIV.getAttribute("x"),
                    stickerDIV.parentNode.getAttribute("x"),
                    stickerDIV.parentNode.parentNode.getAttribute("x")
                );

                if (wedgeDIV.parentNode.parentNode.getAttribute("transform").indexOf("translate") > -1) {
                    condLog("FOUND a TRANSLATION:");
                    const theTransform = wedgeDIV.parentNode.parentNode.getAttribute("transform");
                    let startX = theTransform.indexOf("(");
                    let endX = theTransform.indexOf(",");
                    let endY = theTransform.indexOf(")");
                    condLog(
                        "Translation is : ",
                        theTransform.substring(startX + 1, endX),
                        " , ",
                        theTransform.substring(endX + 1, endY)
                    );

                    stickerDIV.parentNode.setAttribute(
                        "x",
                        1.0 * wedgeDIV.parentNode.getAttribute("x") +
                            30.0 * num +
                            1.0 * theTransform.substring(startX + 1, endX)
                    );
                    stickerDIV.parentNode.setAttribute(
                        "y",
                        wedgeDIV.parentNode.getAttribute("y") * 1 + 1.0 * theTransform.substring(endX + 1, endY) - 25
                    );

                    if (stickerDIV) {
                        stickerDIV.parentNode.parentNode.style.display = "block";
                    } else {
                        condLog("Can't BLOCK this stickerDIV ", thisDIVid);
                    }
                    //  let resultDIV = SVGgraphicsDIV.append(stickerDIV.parentNode.parentNode);
                    //  condLog("resultDIV = ", resultDIV);
                    //  stickerDIV.parentNode.parentNode.style.display = "none";
                }
                //  stickerDIV.parentNode.setAttribute("transform", wedgeDIV.parentNode.getAttribute("transform") );
            } else {
                if (stickerDIV) {
                    stickerDIV.parentNode.parentNode.style.display = "none";
                }
            }
        }

        for (let ahnNum = 2 ** FractalView.numGens2Display; ahnNum < 2 ** FractalView.maxNumGens; ahnNum++) {
            const thisDIVid = "badge" + num + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);
            if (stickerDIV) {
                stickerDIV.parentNode.parentNode.style.display = "none";
            }
        }
    };

    function showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle = 0) {
        const ahnNum = 2 ** thisGenNum + thisPosNum;
        if (ahnNum == 1) {
            condLog("SHOW BADGES FOR # 1 - NUMERO UNO !!!!");
        } else {
            condLog("SHOW BADGES FOR # ", ahnNum);
        }
        let SVGgraphicsDIV = document.getElementById("SVGgraphics");
        let showBadgesSetting = FractalView.currentSettings["general_options_showBadges"];
        let elem = document.getElementById("wedgeInfoFor" + ahnNum).parentNode;
        condLog("show:", elem.parentNode);

        //  let dCompensation = 0;
        //  if (nameAngle > 550) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 540) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 530) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 520) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 510) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 500) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 490) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 480) {
        //      dCompensation = -34;
        //  } else if (nameAngle > 470) {
        //      dCompensation = -34;
        //  } else if (nameAngle > 450) {
        //      dCompensation = -32;
        //  } else if (nameAngle > 435) {
        //      dCompensation = -26;
        //  } else if (nameAngle > 420) {
        //      dCompensation = -24;
        //  } else if (nameAngle > 400) {
        //      dCompensation = -14;
        //  } else if (nameAngle > 380) {
        //      dCompensation = -10;
        //  } else if (nameAngle > 360) {
        //      dCompensation = -6;
        //  } else if (nameAngle > 320) {
        //      dCompensation = 0;
        //  } else if (nameAngle > 270) {
        //      dCompensation = -6;
        //  } else if (nameAngle > 240) {
        //      dCompensation = -18;
        //  } else if (nameAngle > 220) {
        //      dCompensation = -24;
        //  } else if (nameAngle > 200) {
        //      dCompensation = -32;
        //  } else if (nameAngle > 190) {
        //      dCompensation = -36;
        //  } else if (nameAngle > 170) {
        //      dCompensation = -36;
        //  }
        //  let dFraction =
        //      ((thisGenNum + 1 / 2) * thisRadius - 2 * 0 - 0 * (thisGenNum < 5 ? 100 : 80) + dCompensation) /
        //      (Math.max(1, thisGenNum) * thisRadius);
        //  let dOrtho = 35 / (Math.max(1, thisGenNum) * thisRadius);
        //  let dOrtho2 = dOrtho;
        //  let newR = thisRadius;

        condLog("UPDATING the BADGES DROP DOWN here on line 5196");
        // stickerPrefix + ahnNum + "svg",
        for (let i = 1; i <= 4; i++) {
            const thisDIVid = "badge" + i + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);

            // dnaImgY.setAttribute("x", newX * dFraction + dOrtho * newY);
            // dnaImgY.setAttribute("y", newY * dFraction - dOrtho * newX);

            //  if (ahnNum == 1) {
            //      newX = -20;
            //      newY = 0 - thisRadius + Math.abs(i - 2.5) * 10 * 2;
            //      stickerDIV.parentNode.setAttribute("x", newX * dFraction + (2.5 - i) * dOrtho * newY);
            //      stickerDIV.parentNode.setAttribute("y", newY * dFraction - dOrtho * newX);
            //  } else {
            //      stickerDIV.parentNode.setAttribute("x", newX * dFraction + (2.5 - i) * dOrtho * newY);
            //      stickerDIV.parentNode.setAttribute("y", newY * dFraction - (2.5 - i) * dOrtho * newX);
            //  }

            //  stickerDIV.style.rotate = nameAngle + "deg";

            let theDropDown = document.getElementById("stickerCategoryDropDownList" + i);
            let searchText = "Clarke";
            let showBadges = showBadgesSetting;
            let searchPrefix = "[[Category:";
            if (showBadges && theDropDown.value > -1) {
                if (theDropDown.value && theDropDown.value < categoryList.length) {
                    searchText = categoryList[theDropDown.value];
                } else {
                    searchText = stickerList[theDropDown.value - categoryList.length];
                    searchPrefix = "{{";
                }
            } else {
                showBadges = false;
            }

            let rawValue = searchText.trim();
            let spacelessValue = searchText.trim().replace(/ /g, "_");

            //  if (i == 1 || ahnNum == 1) {
            //      condLog(
            //          "Sticker me this: i=",
            //          i,
            //          thisGenNum,
            //          thisPosNum,
            //          ahnNum,
            //          nameAngle,
            //          "deg",
            //          dCompensation,
            //          newX,
            //          newY,
            //          dOrtho,
            //          (Math.atan(-18 / 12) * 180) / Math.PI
            //      );
            //  }

            if (
                showBadges &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + spacelessValue
                    ) > -1)
            ) {
                //  SHOW THIS STICKER
                if (stickerDIV && stickerDIV.parentNode.parentNode) {
                    stickerDIV.parentNode.parentNode.style.display = "block";
                }
                //  SVGgraphicsDIV.append(stickerDIV.parentNode.parentNode);
                //  stickerDIV.parentNode.parentNode.style.display = "none";
            } else {
                if (stickerDIV && stickerDIV.parentNode.parentNode) {
                    stickerDIV.parentNode.parentNode.style.display = "none";
                }
            }
        }

        // condLog(
        //     "Sticker me THAT: ",
        //     6 * Math.sqrt(13) * Math.cos(((nameAngle - 56) * Math.PI) / 180),
        //     6 * Math.sqrt(13) * Math.sin(((nameAngle - 56) * Math.PI) / 180)
        // );
    }

    function showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle) {
        // condLog("showDNAiconsIfNeeded(" , newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle,")");

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
        condLog(elem.parentNode);

        if (elem) {
            let rect = elem.getBoundingClientRect();
            let elemParent = elem.parentNode;
            let rectParent = elemParent.getBoundingClientRect();
            thisY = newY - 0 + 1 * rect.height - 0 + 1 * elemParent.getAttribute("y") + 10;
            thisY =
                newY - 0 + 1 * elemParent.getAttribute("y") + (1 * rect.height + 2) / FractalView.currentScaleFactor;
            // condLog("SVG d3:", d3);
            // condLog("SVG scale:", d3.scale, FractalView.currentScaleFactor);
            // condLog("SVG behave:", d3.behavior);
            // condLog(
            //     `ahnNum: ${ahnNum} , newY: ${newY} , height: ${rect.height} , heightElem: ${elem.getAttribute(
            //         "height"
            //     )} , heightParent: ${rectParent.height} , ParentY: ${elemParent.getAttribute("y")} , thisY: ${thisY} ,`
            // );
            // condLog(rect);
            // condLog("rectParent", rectParent, rect);
            const line1 = document.getElementById("line1ForPerson" + ahnNum);
            const line2 = document.getElementById("line2ForPerson" + ahnNum);
            if (line1) {
                // line1.style.display = "inline-block";
                line1.setAttribute("x1", newX - 200);
                line1.setAttribute("x2", newX + 200);
                line1.setAttribute("y1", thisY);
                line1.setAttribute("y2", thisY);
                // condLog(line1);
                // line2.style.display = "inline-block";
                line2.setAttribute("x1", newX - 200);
                line2.setAttribute("x2", newX + 200);
                line2.setAttribute("y1", newY - 0 + 1 * elemParent.getAttribute("y"));
                line2.setAttribute("y2", newY - 0 + 1 * elemParent.getAttribute("y"));
                // condLog(line2);
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
                    condLog(thePeopleList[FractalView.myAhnentafel.list[1]]._data);
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
            //     condLog("@GenNum == 0 ; dOrtho = ", dOrtho);
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
            // condLog(theLink);
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
                condLog(thePeopleList[FractalView.myAhnentafel.list[1]]._data);
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
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "bioText") {
            let bioTextSelector = document.getElementById("highlight_options_bioText");
            condLog("Looking for BIOs that Have the following: ", bioTextSelector.value);
            condLog(thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio);
            if (
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio
                    .toUpperCase()
                    .indexOf(bioTextSelector.value.toUpperCase()) > -1
            ) {
                return true;
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "bioCheckOK") {
            // console.log("Check Bio:", ahnNum, thePeopleList[FractalView.myAhnentafel.list[ahnNum]].bioHasSources);
            if (
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]].biocheck &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]].bioHasSources == true
            ) {
                return true;
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "bioCheckFail") {
            // console.log("Check Bio:", ahnNum, thePeopleList[FractalView.myAhnentafel.list[ahnNum]].bioHasSources);
            if (
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]].biocheck &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]].bioHasSources == false
            ) {
                return true;
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "cat") {
            let catNameSelector = document.getElementById("highlight_options_catName");
            let rawValue = catNameSelector.value.trim();
            let spacelessValue = catNameSelector.value.trim().replace(/ /g, "_");
            let searchPrefix = "[[Category:";
            condLog(
                "Looking for BIOs that Have the following: ",
                rawValue,
                rawValue.length,
                "or",
                spacelessValue,
                ahnNum
            );
            if (rawValue.length == 0) {
                return false;
            }
            if (
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + spacelessValue
                    ) > -1)
            ) {
                return true;
            }

            let acceptedStickers = [
                "Sticker",
                "Adopted Child",
                "Died Young",
                "Multiple Births",
                "Estimated Date",
                "Unsourced",
            ];
            for (let index = 0; index < acceptedStickers.length; index++) {
                const element = acceptedStickers[index];
                if (catNameSelector.value.indexOf(element) > -1) {
                    if (
                        thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                        thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio &&
                        (thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                            "{{" + catNameSelector.value
                        ) > -1 ||
                            thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                                "{{ " + catNameSelector.value
                            ) > -1)
                    ) {
                        return true;
                    }
                }
            }
        } else if (FractalView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
            let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
            let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
            let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

            let bornByDate = "";
            let deadByDate = "";

            let inputDate = 1950 + "-" + aliveMMMSelector.value + "-" + aliveDDSelector;
            if (aliveYYYYSelector.value > 1) {
                inputDate = aliveYYYYSelector.value + "-" + aliveMMMSelector.value + "-" + aliveDDSelector;
            }

            if (
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.BirthDate &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.BirthDate <= inputDate &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.IsLiving == false &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.DeathDate &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.DeathDate > inputDate
            ) {
                return true;
            } else if (
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.BirthDate &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.BirthDate <= inputDate &&
                thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.IsLiving == true
            ) {
                return true;
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

    function getColourArray() {
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

        let settingForPalette = FractalView.currentSettings["colour_options_palette"];
        let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];

        if (KeyColoursMatches[settingForPalette]) {
            thisColourArray = KeyColoursMatches[settingForPalette];
        }
        if (settingForColourBy == "Location") {
            thisColourArray = [];
            for (let c = 0; c <= 6; c++) {
                for (let i = 0; i < AllColoursArrays[c].length; i++) {
                    const element = AllColoursArrays[c][i];
                    if (thisColourArray.indexOf(element) == -1) {
                        thisColourArray.push(element);
                    }
                }
            }
            // thisColourArray.sort();
        }

        return thisColourArray;
    }

    function getBackgroundColourFor(gen, pos, ahnNum) {
        // GET the settings that determine what the colouring should look like (if at all)
        let settingForColourBy = FractalView.currentSettings["colour_options_colourBy"];
        // WHILE we're here, might as well get the sub-settings if Family or Location colouring is being used ...
        let settingForSpecifyByFamily = FractalView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = FractalView.currentSettings["colour_options_specifyByLocation"];

        let settingForPalette = FractalView.currentSettings["colour_options_palette"];

        let thisColourArray = getColourArray();

        let overRideByHighlight = false; //
        if (FractalView.currentSettings["highlight_options_showHighlights"] == true) {
            overRideByHighlight = doHighlightFor(gen, pos, ahnNum);
        }
        if (overRideByHighlight == true) {
            return "yellow";
        }

        if (settingForColourBy == "None") {
            return "White";
        }

        if (ahnNum == 1 && settingForColourBy != "Location" && settingForColourBy != "Family") {
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
        } else if (settingForColourBy == "Family") {
            if (settingForSpecifyByFamily == "age") {
                let thisAge = thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data.age;
                if (thisAge == undefined) {
                    let thePerp = thePeopleList[FractalView.myAhnentafel.list[ahnNum]];
                    thisAge = theAge(thePerp);
                    thePerp._data["age"] = thisAge;
                    condLog("thisAge - WAS undefined - now is:", thisAge);
                } else {
                    condLog("thisAge:", thisAge);
                }

                if (thisAge == -2) {
                    return "white"; //thisColourArray[0];
                } else if (thisAge == -1) {
                    return "lime"; //thisColourArray[0];
                } else {
                    let thisDecade = 1 + Math.max(0, Math.floor((thisAge + 0.5) / 10));
                    condLog("Age " + thisAge + " in Decade # " + thisDecade);
                    return thisColourArray[thisDecade];
                }
            } else if (settingForSpecifyByFamily == "spouses") {
            } else if (settingForSpecifyByFamily == "siblings") {
            }
        } else if (settingForColourBy == "Location") {
            let locString = thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data[settingForSpecifyByLocation];
            if (settingForSpecifyByLocation == "BirthDeathCountry") {
                locString = thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data["DeathCountry"];
            } else if (settingForSpecifyByLocation == "DeathBirthCountry") {
                locString = thePeopleList[FractalView.myAhnentafel.list[ahnNum]]._data["BirthCountry"];
            }

            if (locString == undefined) {
                let thisPerp = thePeopleList[FractalView.myAhnentafel.list[ahnNum]];
                let res = fillOutFamilyStatsLocsForPerp(thisPerp);
                locString = thisPerp._data[settingForSpecifyByLocation];
                condLog(
                    "NEW location for " + thisPerp._data.FirstName + " " + thisPerp._data.LastNameAtBirth,
                    locString
                );
            }
            let index = theSortedLocationsArray.indexOf(locString);
            if (index == -1) {
                if (locString > "") {
                    showRefreshInLegend();
                }
                return "white";
            }
            //   let hue = Math.round((360 * index) / theSortedLocationsArray.length);
            //     let sat = 1 - ((index % 2)) * - 0.15;
            //     let lit = 0.5 + ((index % 7) - 3) *  0.05;
            //     let   = hslToRGBhex(hue,sat,lit);
            let hue = Math.round((360 * index) / theSortedLocationsArray.length);
            let sat = 1 - (index % 2) * -0.15;
            let lit = 0.5 + ((index % 7) - 3) * 0.05;
            let thisClr = hslToRGBhex(hue, sat, lit);
            return thisClr;

            //     condLog("CLR:", hue, sat, lit, thisClr);
            //     let clrSwatch =
            //         "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
            //         thisClr +
            //         ";stroke:black;stroke-width:1;opacity:1' /></svg>";
            //     // let clrSwatch =
            //     //     "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
            //     //     thisColourArray[index % thisColourArray.length] +
            //     //     ";stroke:black;stroke-width:1;opacity:1' /></svg>";
            //     innerCode += "<br/>" + clrSwatch + " " + sortedLocs[index] ;
            // }

            // let clrIndex = uniqueLocationsArray.indexOf(locString);
            // return thisColourArray[clrIndex];
        } else if (settingForColourBy == "random") {
            return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
        }

        return thisColourArray[Math.floor(Math.random() * thisColourArray.length)];
    }

    function getColourFromSortedLocationsIndex(index) {
        // let index = theSortedLocationsArray.indexOf(locString);
        if (index == -1) {
            return "white";
        }

        //   let hue = Math.round((360 * index) / theSortedLocationsArray.length);
        //     let sat = 1 - ((index % 2)) * - 0.15;
        //     let lit = 0.5 + ((index % 7) - 3) *  0.05;
        //     let   = hslToRGBhex(hue,sat,lit);
        let hue = Math.round((360 * index) / theSortedLocationsArray.length);
        let sat = 1 - (index % 2) * -0.15;
        let lit = 0.5 + ((index % 7) - 3) * 0.05;
        let thisClr = hslToRGBhex(hue, sat, lit);
        return thisClr;
    }
})();
