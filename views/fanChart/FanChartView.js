/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Fan Chart uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 *
 * There is a Button Bar TABLE at the top of the container,
 * then the SVG graphic is below that.
 *
 * The FIRST chunk of code in the SVG graphic are the <path> objects for the individual wedges of the Fan Chart,
 * each with a unique ID of wedgeAnB, where A = generation #, and B = position # within that generation, counting from far left, clockwise
 *
 * The SECOND chunk in the SVG graphic are the individual people in the Fan Chart, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class"person ancestor" highlight_options_showHighlights
 *
 * The Button Bar does not resize, but has clickable elements, which set global variables in the FanChartView, then calls a redraw
 *
 * Some SVG button icons from SVG Repo - open-licencesed SVG Vector and Icons website:  https://www.svgrepo.com/
 *
 */

import { theSourceRules } from "../../lib/biocheck-api/src/SourceRules.js";
import { BioCheckPerson } from "../../lib/biocheck-api/src/BioCheckPerson.js";
import { Biography } from "../../lib/biocheck-api/src/Biography.js";
import { WTapps_Utils } from "./WTapps_Utils.js";
import { Utils } from "../shared/Utils.js";
import { PDFs } from "../shared/PDFs.js";

(function () {
    const APP_ID = "FanChart";
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;
    let font4Name = "SansSerif";
    let font4Info = "SansSerif";
    let font4Extras = "Mono";

    var fontMetrics = {
        SansSerif: { mDateWidth: 140, height: 25 },
        Mono: { mDateWidth: 140, height: 25 },
        Serif: { mDateWidth: 140, height: 25 },
        Fantasy: { mDateWidth: 140, height: 25 },
        Script: { mDateWidth: 140, height: 25 },
    };

    var numLinesHeights = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180];
    var numLinesInRings = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    const numOfBadges = 5;

    /**
     * Constructor
     */
    var FanChartView = (window.FanChartView = function () {
        Object.assign(this, this?.meta());
        // let theCookie = WTapps_Utils.getCookie("wtapps_fanchart");
        // console.log(theCookie);
    });

    var firstFanChartPopUpPopped = false;

    const PRINTER_ICON = "&#x1F4BE;";
    const SETTINGS_GEAR = "&#x2699;";
    const LEGEND_CLIPBOARD = "&#x1F4CB;";

    var minimumRingRadius = 140;

    const FullAppName = "Fan Chart tree app";
    const AboutPreamble =
        "The Fan Chart was originally created as a standalone WikiTree app.<br>The current Tree App version was created for HacktoberFest 2022<br/>and is maintained by the original author plus other WikiTree developers.";
    const AboutUpdateDate = "28 May 2025";
    const AboutAppIcon = `<img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" />`;
    const AboutOriginalAuthor = "<A target=_blank href=https://www.wikitree.com/wiki/Clarke-11007>Greg Clarke</A>";
    const AboutAdditionalProgrammers =
        "<A target=_blank href=https://www.wikitree.com/wiki/Duke-5773>Jonathan Duke</A>";
    const AboutAssistants = "Rob Pavey, Kay Knight, Riel Smit & Ian Beacall";
    const AboutLatestG2G =
        "https://www.wikitree.com/g2g/1716948/updates-safari-trails-settings-fanchart-fractal-supertree"; //"https://www.wikitree.com/g2g/1621138/fan-chart-update-august-2023-chocolate-peanut-butter"; // "https://www.wikitree.com/g2g/1599363/recent-updates-to-the-fan-chart-tree-app-july-2023";
    const AboutHelpDoc = "https://www.wikitree.com/wiki/Space:Fan_Chart_app";
    const AboutOtherApps = "https://apps.wikitree.com/apps/clarke11007";

    const SVGbtnCLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="red"/>
        </svg>`;
    // ORIGINAL FILL COLOUR AT END OF PATH:  #292D32

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

    const SVGbtnRESIZE2 = `<svg width="16" height="16" viewBox="0 -0.5 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
            class="si-glyph si-glyph-arrow-fullscreen-2">
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <path d="M14.988,6.979 C15.547,6.979 16,6.527 16,5.97 L16,1.008 C16,0.45 15.547,-0.000999999989 14.988,-0.000999999989 L10.011,-0.000999999989 C9.452,-0.000999999989 8.999,0.45 8.999,1.008 L10.579,2.583 L8.009,5.153 L5.439,2.583 L7.019,1.008 C7.019,0.45 6.566,-0.000999999989 6.007,-0.000999999989 L1.03,-0.000999999989 C0.471,-0.000999999989 0.0179999999,0.45 0.0179999999,1.008 L0.0179999999,5.97 C0.0179999999,6.527 0.471,6.979 1.03,6.979 L2.62,5.394 L5.194,7.968 L2.598,10.565 L1.028,9 C0.471,9 0.0189999999,9.45 0.0189999999,10.006 L0.0189999999,14.952 C0.0189999999,15.507 0.471,15.958 1.028,15.958 L5.99,15.958 C6.548,15.958 6.999,15.507 6.999,14.952 L5.417,13.375 L8.009,10.783 L10.601,13.375 L9.019,14.952 C9.019,15.507 9.47,15.958 10.028,15.958 L14.99,15.958 C15.547,15.958 15.999,15.507 15.999,14.952 L15.999,10.006 C15.999,9.45 15.547,9 14.99,9 L13.42,10.565 L10.824,7.968 L13.398,5.394 L14.988,6.979 L14.988,6.979 Z" fill="#434343" class="si-glyph-fill">
                </path>
            </g>
        </svg>`;

    var uniqueLocationsArray = [];
    var theSortedLocationsArray = [];
    var thisTextColourArray = {};

    var fanGenRadii = [220, 275, 300, 325, 350, 375, 400, 320, 320, 320, 320, 320, 320, 320, 320, 320];
    var fanGenCrossSpan = [220, 275, 300, 325, 350, 375, 400, 320, 320, 320, 320, 320, 320, 320, 320, 320];
    var cumulativeGenRadii = [135, 270, 270, 270, 270, 270, 270, 270, 270, 270, 270, 270, 270, 270, 270, 270];
    var extraRoomNeededForBadges = false;

    // calculateFontMetrics();
    updateCumulativeWidths();
    condLog({ cumulativeGenRadii });
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

    let badgeClr = ["white", "red", "teal", "blue", "orange", "magenta"];

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

    var numRepeatAncestors = 0;
    var repeatAncestorTracker = new Object();

    var categoryList = [];
    var stickerList = [];
    var currentBadges = [];
    var currentHighlightCategory = "";

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

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Fan Chart

    /** Static variable to hold unique ids for private persons **/
    FanChartView.nextPrivateId = -1;

    FanChartView.badgeCharacters = " 12345";
    FanChartView.theBadgeTracker = [];

    /** Static variable to hold the Maximum Angle for the Fan Chart (360 full circle / 240 partial / 180 semicircle)   **/
    FanChartView.maxAngle = 180;
    FanChartView.lastAngle = 180;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    FanChartView.numGens2Display = 5;
    FanChartView.lastNumGens = 5;
    FanChartView.numGensRetrieved = 5;
    FanChartView.maxNumGens = 10;
    FanChartView.workingMaxNumGens = 6;

    FanChartView.currentScaleFactor = 1;
    FanChartView.lastCustomScaleFactor = 0.9;
    FanChartView.zoomCounter = 0;

    // FanChartView.showFandokuLink = "No";

    /** Object to hold the Ahnentafel table for the current primary individual   */
    FanChartView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    FanChartView.currentSettings = {};

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    FanChartView.theAncestors = [];

    // List to hold the AhnenTafel #s of all Ancestors that are X-Chromosome ancestors (or potential x-chromosome ancestors) of the primary person.
    FanChartView.XAncestorList = [];

    FanChartView.prototype.meta = function () {
        return {
            title: "Fan Chart",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    FanChartView.resetSettingsDIVtoDefaults = function () {
        // console.log("Here you are inside FanChartView.resetSettingsDIVtoDefaults");
        let theCookieString = JSON.stringify(FanChartView.currentSettings);
        // console.log({ theCookieString });
        if (theCookieString) {
            FanChartView.updateCurrentSettingsBasedOnCookieValues(theCookieString);
            FanChartView.tweakSettingsToHideShowElements();
            FanChartView.updateLegendTitle();
            FanChartView.updateHighlightDescriptor();

            let showBadges = FanChartView.currentSettings["general_options_showBadges"];
            if (!showBadges) {
                let stickerLegend = document.getElementById("stickerLegend");
                stickerLegend.style.display = "none";
                if (
                    FanChartView.currentSettings["highlight_options_showHighlights"] == false &&
                    FanChartView.currentSettings["colour_options_colourBy"] != "Location" &&
                    FanChartView.currentSettings["colour_options_colourBy"] != "Family"
                ) {
                    let legendDIV = document.getElementById("legendDIV");
                    legendDIV.style.display = "none";
                }
            }

            WTapps_Utils.setCookie("wtapps_fanchart", JSON.stringify(FanChartView.currentSettings), {
                expires: 365,
            });

            FanChartView.redraw();
        }
    };

    FanChartView.redrawAfterLoadSettings = function () {
        // console.log("Here you are inside FanChartView.redrawAfterLoadSettings");

        FanChartView.tweakSettingsToHideShowElements();
        FanChartView.updateLegendTitle();
        FanChartView.updateHighlightDescriptor();

        let showBadges = FanChartView.currentSettings["general_options_showBadges"];
        if (!showBadges) {
            let stickerLegend = document.getElementById("stickerLegend");
            stickerLegend.style.display = "none";
            if (
                FanChartView.currentSettings["highlight_options_showHighlights"] == false &&
                FanChartView.currentSettings["colour_options_colourBy"] != "Location" &&
                FanChartView.currentSettings["colour_options_colourBy"] != "Family"
            ) {
                let legendDIV = document.getElementById("legendDIV");
                legendDIV.style.display = "none";
            }
        }

        WTapps_Utils.setCookie("wtapps_fanchart", JSON.stringify(FanChartView.currentSettings), {
            expires: 365,
        });

        FanChartView.redraw();
    };

    FanChartView.updateCurrentSettingsBasedOnCookieValues = function (theCookieString) {
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
                if (Object.hasOwnProperty.call(FanChartView.currentSettings, key)) {
                    FanChartView.currentSettings[key] = element;
                }
            }
        }

        // ADD SPECIAL SETTING THAT GETS MISSED OTHERWISE:
        // FanChartView.currentSettings["general_options_badgeLabels_otherValue"] =
        //     theCookieSettings["general_options_badgeLabels_otherValue"];
    };

    FanChartView.theSVG = null; // to be assigned shortly

    FanChartView.prototype.init = function (selector, startId) {
        // condLog("FanChartView.js - line:18", selector) ;
        // let theCheckIn =  FanChartView.getCheckIn();
        // // condLog("theCheckIN:", theCheckIn);
        // FanChartView.showFandokuLink = theCheckIn;

        var container = document.querySelector(selector);

        var self = this;
        FanChartView.fanchartSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "FanChartView",
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
                    subsections: [{ name: "FanChartGeneral", label: "General settings" }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#General",
                    comment:
                        "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
                },
                {
                    name: "names",
                    label: "Names",
                    hideSelect: true,
                    subsections: [{ name: "FanChartNames", label: "NAMES format" }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#Names",
                    comment: "These options apply to how the ancestor names will displayed in each Fan Chart cell.",
                },
                {
                    name: "dates",
                    label: "Dates",
                    hideSelect: true,
                    subsections: [{ name: "FanChartDates", label: "DATES of events     " }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#Dates",
                    comment: "These options apply to the Date format to use for birth, marriages, & deaths.",
                },
                {
                    name: "places",
                    label: "Places",
                    hideSelect: true,
                    subsections: [{ name: "FanChartPlaces", label: "PLACES of events     " }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#Places",
                    comment: "These options apply to the Places displayed for birth, marriages, & deaths.",
                },
                {
                    name: "photos",
                    label: "Photos",
                    hideSelect: true,
                    subsections: [{ name: "FanChartPhotos", label: "PHOTOS    " }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#Photos",
                    comment: "These options determine if photos are displayed or not.",
                },
                {
                    name: "colours",
                    label: "Colours",
                    hideSelect: true,
                    subsections: [{ name: "FanChartColours", label: "COLOURS   " }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#Colours",
                    comment: "These options apply to the colours in the Fan Chart cells.",
                },
                {
                    name: "highlights",
                    label: "Highlights",
                    hideSelect: true,
                    subsections: [{ name: "FanChartHighlights", label: "HIGHLIGHTING   " }],
                    help: "https://www.wikitree.com/wiki/Space:Fan_Chart_app#Highlights",
                    comment:
                        "These options determine which, if any, cells should be highlighted (in order to stand out). ",
                },
            ],
            optionsGroups: [
                {
                    tab: "general",
                    subsection: "FanChartGeneral",
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
                            optionName: "extraInfo",
                            type: "radio",
                            label: "Extras",
                            values: [
                                { value: "none", text: "none" },
                                { value: "ahnNum", text: "Ahnentafel number" },
                                { value: "WikiTreeID", text: "WikiTree ID" },
                            ],
                            defaultValue: "WikiTreeID", // GPC - Changed for AZURE  / "none"
                        },
                        {
                            optionName: "font4Extras",
                            type: "radio",
                            label: "Font for Extras",
                            values: [
                                { value: "SansSerif", text: "Arial" },
                                { value: "Mono", text: "Courier" },
                                { value: "Serif", text: "Times" },
                                { value: "Fantasy", text: "Fantasy" },
                                { value: "Script", text: "Script" },
                            ],
                            defaultValue: "Mono",
                        },

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
                        { optionName: "break2", type: "br" },
                        {
                            optionName: "showBadges",
                            label: "Add badges to ancestors",
                            type: "checkbox",
                            defaultValue: false,
                        },
                        {
                            optionName: "badgeLabels",
                            label: "Label badges",
                            type: "radio",
                            values: [
                                { value: "12345", text: "1 - 5   " },
                                { value: "ABCDE", text: "A - E   " },
                                {
                                    value: "custom",
                                    text: "Custom label:",
                                    addOtherTextField: true,
                                    maxLength: 5,
                                    // otherValue: "A2B*!",
                                },
                            ],
                            defaultValue: "12345",
                            defaultOtherValue: "WT15!",
                        },
                        // {
                        //     optionName: "customBadgeLabels",
                        //     type: "text",
                        //     label: "Custom label",
                        //     defaultValue: "*!@#^",
                        //     maxLength : 5
                        // },
                    ],
                },

                {
                    tab: "names",
                    subsection: "FanChartNames",
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
                    subsection: "FanChartDates",
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
                        {
                            optionName: "showMarriage",
                            label: "Show Marriage Date",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "marriageBlend",
                            label: "Blend in Marriage Date box (use background colour of husband)",
                            type: "checkbox",
                            defaultValue: true, // GPC - Changed for AZURE  / "false"
                            indent: 3,
                        },
                        {
                            optionName: "marriageAtTopEarlyGens",
                            label: "Slide Marriage Date box to top (for first 5 generations)",
                            type: "checkbox",
                            defaultValue: true,
                            indent: 3,
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
                    subsection: "FanChartPlaces",
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
                            defaultValue: "Region", // GPC - Changed for AZURE  / "Full"
                        },
                        { optionName: "break1", type: "br" },
                        {
                            optionName: "simplifyOuter",
                            label: "Simplify or Hide Places in Outer Rings (to save space):",
                            type: "checkbox",
                            defaultValue: true,
                        },
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
                            optionName: "colourizeRepeats",
                            label: "Colourize Repeat Ancestors",
                            type: "checkbox",
                            defaultValue: true,
                            comment: "(will supersede background colouring for repeat ancestors)",
                        },
                        { optionName: "break1", type: "br" },
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
                                { value: "BioCheck", text: "Bio Check status" },
                                { value: "Family", text: "Family Stats" },
                                { value: "Location", text: "Location" },
                                // { value: "Town", text: "Place name" },
                                // { value: "Region", text: "Region (Province/State)" },
                                // { value: "Country", text: "Country" },
                                { value: "DNAstatus", text: "Parental status" },
                                { value: "random", text: "random chaos" },
                            ],
                            defaultValue: "Grand", // GPC - Changed for AZURE  / "Generation"
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
                                { value: "numSpouses", text: "number of spouses" },
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
                    subsection: "FanChartHighlights",
                    category: "highlight",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "colourizeRepeats",
                            label: "Colourize Repeat Ancestors",
                            type: "checkbox",
                            defaultValue: true,
                            comment: "(will supersede highlight colouring)",
                        },
                        { optionName: "break1", type: "br" },
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
                                { value: "DNAinheritance", text: "X/Y/mt DNA inheritance" },
                                { value: "DNAconfirmed", text: "DNA confirmed ancestors" },
                                { value: "-", text: "-" },
                                { value: "aliveDay", text: "Alive on this Day" },
                                // { value: "bioCheckOK", text: "Bio Check ✔ - has sources" },
                                { value: "bioCheckFail", text: "Bio Check - no sources" },
                                { value: "bioCheckStyle", text: "Bio Check - style issues" },
                                { value: "bioText", text: "Biography Text" },
                                { value: "cat", text: "Category or Sticker" },
                                // { value: "review", text: "Profiles needing review" },
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

        var PDFgenPopupHTML =
            '<div id=PDFgenPopupDIV class="pop-up" style="display:none; position:absolute; right:80px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px; ; z-index:9999">' +
            '<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><a onclick="FanChartView.closePDFpopup();">' +
            SVGbtnCLOSE +
            "</a></span>" +
            "<H3 align=center>PDF Generator</H3>" +
            "NOTE: This <B>Save as PDF</B> feature is still in development. It is currently limited to 4 generations. <br/>Some options on the Fan Chart may not be saved on the PDF.<BR>Thank you for patience as other features and additional generations are added to the PDF programming.<BR/><BR/>" +
            "<div id=innerPDFgen>" +
            "<label><input type=checkbox id=PDFshowTitleCheckbox checked> Display Title at top of Fan Chart PDF</label><BR/><input style='margin-left: 20px;' type=text size=100 id=PDFtitleText value='Fan Chart for John Smith'>" +
            "<BR/><BR/>" +
            "<label><input type=checkbox id=PDFshowFooterCheckbox checked> Display Citation at bottom of PDF</label><BR/><input style='margin-left: 20px;' type=text size=100 id=PDFfooterText value='Fan Chart created TODAY using Fan Chart app in Tree Apps collection on WikiTree.com.'>" +
            "<BR/><BR/><label><input type=checkbox id=PDFshowURLCheckbox checked> Add URL to bottom of PDF</label>" +
            "<BR/><BR/>" +
            "<button id=PDFgenButton class='btn btn-primary'  onclick=FanChartView.doPrintPDF()>Generate PDF now</button> " +
            "<span id=PDFgenProgressBar class='btn-secondary'  style='display:none;' >Processing PDF .... please hold ...</span> " +
            "</div></div>";

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<div id=btnBarDIV><table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%" style="padding-left:10px;"><A title="Display Circle Chart (360º)" onclick="FanChartView.maxAngle = 360; FanChartView.redraw();"><img style="height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan360.png" /></A> |' +
            ' <A title="Display Traditional Fan Chart (240º)" onclick="FanChartView.maxAngle = 240; FanChartView.redraw();"><img style="height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></A> |' +
            ' <A title="Display Semi-Circle Fan Chart (180º)" onclick="FanChartView.maxAngle = 180; FanChartView.redraw();"><img style="height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            '<td width="5%">&nbsp;' +
            '<span id=legendASCII style="display:inline-block;"><A title="Hide/Show Legend" onclick="FanChartView.toggleLegend();"><font size=+2>' +
            LEGEND_CLIPBOARD +
            "</font></A></span>" +
            "</td>" +
            '<td width="30%" align="center">' +
            ' <A title="Decrease # of generations displayed" onclick="FanChartView.numGens2Display -=1; FanChartView.redraw();">' +
            SVGbtnDOWN +
            "</A> " +
            "[ <span id=numGensInBBar>5</span> generations ]" +
            ' <A title="Increase # of generations displayed" onclick="FanChartView.numGens2Display +=1; FanChartView.redraw();">' +
            SVGbtnUP +
            "</A> " +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="30%" align="right"  style="padding-right:10px;">' +
            '<A title="Change Zoom level - 3 settings" onclick="FanChartView.reZoom();">' +
            SVGbtnRESIZE2 +
            "</A>" +
            "&nbsp;&nbsp;" +
            ' <A style="cursor:pointer;" title="Save as PDF"  onclick="FanChartView.showPDFgenPopup();">' +
            PRINTER_ICON +
            "&nbsp;&nbsp;" +
            ' <A title="Adjust Settings"  onclick="FanChartView.toggleSettings();"><font size=+2>' +
            SVGbtnSETTINGS +
            "</font></A>&nbsp;&nbsp;" +
            "<A title='About this app' onclick=FanChartView.toggleAbout();>" +
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
            '</tr></table></div><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Fan Chart is loading ...</DIV>';

        var settingsHTML = "";
        settingsHTML += FanChartView.fanchartSettingsOptionsObject.createdSettingsDIV; // +

        var badgesHTML =
            "<div id=BRbetweenLegendAndStickers><br/></div><div id=stickerLegend><H3 class=quarterEmBottomMargin>Badges</H3>";
        var stickerCatNameSelectorHTML =
            "<select id='stickerCategoryDropDownList1' class='optionSelect selectSimpleDropDown' onchange='FanChartView.updateBadgesToShow(1);'><option value=-999>Do not use Badge 1</option></select><br/>";
        for (let i = 1; i <= numOfBadges; i++) {
            badgesHTML +=
                "<svg width=24 height=24><rect width=24 height=24 rx=8 ry=8 style='fill:" +
                badgeClr[i] +
                ";stroke:black;stroke-width:2;opacity:1' />" +
                "<text id=badgeCharacter" +
                i +
                " font-weight=bold x=8 y=17 fill='white'>" +
                FanChartView.badgeCharacters[i] +
                "</text></svg>" +
                stickerCatNameSelectorHTML.replace(/1/g, i);
        }

        badgesHTML += "</div>";
        let highlightHTML =
            "<div id=highlightDescriptor><br/><span class='fontBold selectedMenuBarOption'>HIGHLIGHT people</span> = <span id=highlightPeepsDescriptor>Thirty-somethings...</span><br/><br/></div>";

        var legendHTML =
            '<div id=legendDIV class="pop-up" style="display:none; position:absolute; left:20px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px; z-index:9999">' +
            `<span style="color:red; position:absolute; top:-0.2em; left:0em; cursor:pointer;"><a onclick="FanChartView.hideLegend();">` +
            SVGbtnCLOSE +
            "</a></span>" +
            highlightHTML +
            "<H3 class=quarterEmBottomMargin id=LegendTitleH3><span id=LegendTitle></span></H3><div id=refreshLegend style='display:none'><A onclick='FanChartView.refreshTheLegend();'>Click to Update Legend</A></DIV><div id=innerLegend></div>" +
            badgesHTML +
            "</div>";

        var aboutHTML =
            '<div id=aboutDIV class="pop-up" style="display:none; position:absolute; right:20px; background-color:aliceblue; border: solid blue 4px; border-radius: 15px; padding: 15px; zIndex:9999}">' +
            `<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><a onclick="FanChartView.toggleAbout();">` +
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

        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        let infoPanel = document.getElementById("info-panel");

        infoPanel.classList.remove("hidden");
        infoPanel.parentNode.classList.add("stickyDIV");
        infoPanel.parentNode.style.padding = "0px";

        infoPanel.innerHTML = btnBarHTML + legendHTML + PDFgenPopupHTML + aboutHTML + settingsHTML + popupDIV;
        container.innerHTML = "";

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        FanChartView.closePDFpopup = function () {
            let PDFgenPopupDIV = document.getElementById("PDFgenPopupDIV");
            PDFgenPopupDIV.style.display = "none";
        };

        FanChartView.showPDFgenPopup = function () {
            let numGens2PDF = FanChartView.numGens2Display;
            // ***** TEMPORARY DRAFT VERSION *******
            numGens2PDF = Math.min(4, numGens2PDF);

            let PDFgenPopupDIV = document.getElementById("PDFgenPopupDIV");
            document.getElementById("PDFgenProgressBar").style.display = "none";
            document.getElementById("PDFgenButton").removeAttribute("disabled");
            document.getElementById("PDFgenButton").style.display = "revert";
            PDFgenPopupDIV.style.display = "block";
            PDFgenPopupDIV.style.zIndex = Utils.getNextZLevel();
            document.getElementById("PDFtitleText").value =
                "Fan Chart for " + document.getElementById("nameDivFor1").innerText;
            let thisDateObj = new Date();
            let thisDate = [thisDateObj.getDate(), PDFs.months[thisDateObj.getMonth()], thisDateObj.getFullYear()].join(
                "-"
            );
            document.getElementById("PDFfooterText").value =
                "This " +
                numGens2PDF +
                " generation Fan Chart was created " +
                thisDate +
                " using the FAN CHART app in the Tree Apps collection on WikiTree.com.";
        };

        FanChartView.doPrintPDF = function () {
            document.getElementById("PDFgenButton").style.display = "none";
            document.getElementById("PDFgenProgressBar").offsetHeight;
            document.getElementById("PDFgenProgressBar").style.display = "block"; //( "disabled", true);
            FanChartView.printPDF();
        };

        FanChartView.printPDF = async function () {
            let numGens2PDF = FanChartView.numGens2Display;
            // ***** TEMPORARY DRAFT VERSION *******
            numGens2PDF = Math.min(4, numGens2PDF);
            let thisCrossRadius = 150;

            let tmpPDF = new jsPDF("l", "pt", [2595.28, 1841.89]);
            document.getElementById("PDFgenButton").setAttribute("disabled", true);
            document.getElementById("PDFgenProgressBar").style.display = "revert"; //( "disabled", true);

            PDFs.resetAll();

            let thisSVG = document.getElementById("SVGgraphics");
            let thisDXDY = PDFs.getTranslationCoordinates(thisSVG);
            PDFs.currentPDFsettings.thisDX = parseInt(thisDXDY[0]);
            PDFs.currentPDFsettings.thisDY = 100 + parseInt(thisDXDY[1]);

            tmpPDF.setFont(PDFs.currentPDFsettings.thisFont, PDFs.currentPDFsettings.thisFontStyle);
            tmpPDF.setFontSize(PDFs.currentPDFsettings.thisFontSize);

            // ADD PRIMARY PERSON CIRCLE
            let ctrCircle = document.getElementById("ctrCirc");
            let theCircleFillColour = "#FFFF00";
            let ctrCircleFill = PDFs.getValueFromStyleString(ctrCircle.getAttribute("style"), "fill");
            if (ctrCircle && ctrCircleFill && ctrCircleFill.indexOf("rgb") > -1) {
                theCircleFillColour = Utils.rgbToHex(ctrCircleFill); // "#F0FFF0"
            } else {
                theCircleFillColour = ctrCircleFill;
            }

            PDFs.thisPDFellipseArray.push([
                0,
                0,
                1.0 * ctrCircle.getAttribute("r"),
                1.0 * ctrCircle.getAttribute("r"),
                "DF",
                { fillColor: theCircleFillColour, strokeColor: "#000000", lineWidth: 2, phase: 1 },
            ]);

            // for (let index = 1; index <= 2 ** FanChartView.numGens2Display; index++) {
            for (let index = 1; index < 2 ** numGens2PDF; index++) {
                // PDFs.thisPDFlinesArray.push([-900, 0 - index * 50, 900, 0 - index * 50, [0, 0, 255], 1, 0]);
                // PDFs.thisPDFlinesArray.push([
                //     -900,
                //     0 - (index + 15) * 50,
                //     900,
                //     0 - (index + 15) * 50,
                //     [0, 0, 255],
                //     1,
                //     0,
                // ]);

                let thisWedgeName = "wedgeInfoFor" + index;
                let altWedgeName = "wedgeBoxFor" + index;
                let thisWedgeElement = document.getElementById(thisWedgeName);
                if (!thisWedgeElement) {
                    thisWedgeElement = document.getElementById(altWedgeName);
                }
                let thisRRectBkgdClr = "#FFFF00";
                let thisWedgeBkgdClr = "#FF00FF";

                if (thisWedgeElement) {
                    let thisWedgeParent = thisWedgeElement.parentNode;
                    let thisWedgeStyle = thisWedgeElement.getAttribute("style");
                    if (thisWedgeStyle) {
                        thisWedgeBkgdClr = thisWedgeStyle
                            .substring(thisWedgeStyle.indexOf("background-color:") + 17)
                            .trim(); // , thisWedgeStyle.indexOf(";", thisWedgeStyle.indexOf("background-color:"))).trim();
                    }
                    if (thisWedgeParent) {
                        let thisWedgeParentStyle = thisWedgeParent.getAttribute("style");
                        if (thisWedgeParentStyle) {
                            thisRRectBkgdClr = thisWedgeParentStyle
                                .substring(
                                    thisWedgeParentStyle.indexOf("background-color:") + 17,
                                    thisWedgeParentStyle.indexOf(";", thisWedgeParentStyle.indexOf("background-color:"))
                                )
                                .trim();
                        }
                    }
                }

                let thisID = "nameDivFor" + index;
                let thisElement = document.getElementById(thisID);
                let thisX = PDFs.currentPDFsettings.thisDX;
                let thisY = PDFs.currentPDFsettings.thisDY;
                let thisTheta = 0;
                if (
                    thisWedgeElement &&
                    thisWedgeElement.parentNode &&
                    thisWedgeElement.parentNode.parentNode &&
                    thisWedgeElement.parentNode.parentNode.parentNode
                ) {
                    thisTheta = PDFs.getRotationAngle(thisWedgeElement.parentNode.parentNode.parentNode);
                }

                let thisYdy = Math.sin(((thisTheta + 90) * Math.PI) / 180);
                let thisYdx = 0 - Math.cos(((thisTheta + 90) * Math.PI) / 180);
                let thisXdy = 0 - Math.sin(((thisTheta + 0) * Math.PI) / 180);
                let thisXdx = 0 + Math.cos(((thisTheta + 0) * Math.PI) / 180);

                if (thisElement) {
                    let thisPersonObject = thisElement.parentNode.parentNode.parentNode.parentNode.parentNode;
                    if (thisPersonObject) {
                        let thisDXDY = PDFs.getTranslationCoordinates(thisPersonObject);
                        PDFs.currentPDFsettings.thisDX = parseInt(thisDXDY[0]);
                        PDFs.currentPDFsettings.thisDY = parseInt(thisDXDY[1]);

                        thisX = parseInt(thisDXDY[0]);
                        thisY = parseInt(thisDXDY[1]);

                        if (index == 1) {
                            thisY = 0;
                        }
                    }

                    let thisR = Math.sqrt(thisX * thisX + thisY * thisY);
                    let thisGenNum = Math.floor(Math.log2(index));
                    let thisGenAngle = FanChartView.maxAngle / 2 ** thisGenNum;
                    thisCrossRadius = thisR * 2 * Math.PI * (thisGenAngle / 360);

                    // CENTRAL DOT (ellipse) - to mark CENTRE of the SECTOR - for alignment purposes and debugging

                    // PDFs.thisPDFellipseArray.push([
                    //     thisX,
                    //     thisY,
                    //     5,
                    //     5,
                    //     "DF",
                    //     { fillColor: "blue", strokeColor: "yellow", lineWidth: 2, phase: 2 },
                    // ]);

                    // HORIZONTAL LINE at TOP of each Cell - for alignment purposes and debugging

                    // PDFs.thisPDFlinesArray.push([
                    //     thisX - (thisCrossRadius / 2) * thisXdx - 100 * thisYdx,
                    //     thisY - 100 * thisYdy - (thisCrossRadius / 2) * thisXdy,
                    //     thisX + (thisCrossRadius / 2) * thisXdx - 100 * thisYdx,
                    //     thisY - 100 * thisYdy + (thisCrossRadius / 2) * thisXdy,
                    //     [255, 0, 0],
                    //     1,
                    //     0,
                    // ]);

                    // PDFs.thisPDFellipseArray.push([
                    //     thisX - 150 * thisXdx - 100 * thisYdx,
                    //     thisY - 100 * thisYdy - 150 * thisXdy,
                    //     10,
                    //     10,
                    //     "DF",
                    //     { fillColor: "blue", strokeColor: "red", lineWidth: 4, phase: 2 },
                    // ]);

                    // PDFs.thisPDFroundedRectArray.push([
                    //     thisX,
                    //     thisY,
                    //     300,
                    //     200,
                    //     15,
                    //     15,
                    //     "DF",
                    //     { fillColor: thisRRectBkgdClr, strokeColor: "#000000", lineWidth: 2 },
                    // ]);
                    // // pdf.setFillColor(thisWedgeBkgdClr);
                    // PDFs.thisPDFrectArray.push([
                    //     thisX + 15,
                    //     thisY + 15,
                    //     270,
                    //     170,
                    //     "F",
                    //     { fillColor: thisWedgeBkgdClr, strokeColor: thisWedgeBkgdClr, lineWidth: 0 },
                    // ]);

                    thisY -= 100 * thisYdy;
                    thisX -= 100 * thisYdx;
                } else {
                    continue;
                }

                thisID = "extraInfoFor" + index;
                thisElement = document.getElementById(thisID);
                PDFs.setPDFfontBasedOnSetting(FanChartView.currentSettings.general_options_font4Extras, false);
                tmpPDF.setFont(PDFs.currentPDFsettings.thisFont, PDFs.currentPDFsettings.thisFontStyle);
                tmpPDF.setFontStyle(PDFs.currentPDFsettings.thisFontStyle);

                if (thisElement) {
                    // thisY += 5;
                    let thisTextArray = thisElement.innerHTML.split("<br>");
                    // console.log({ thisText }, { thisX }, { thisY });
                    // pdf.setDrawColor("#000000");
                    for (let textIndex = 0; textIndex < thisTextArray.length; textIndex++) {
                        const textLine = thisTextArray[textIndex];
                        let thisTextsTextWidth = tmpPDF.getTextWidth(textLine);

                        //thisX  - 150 * thisXdx - 100 * thisYdx,
                        // thisY - 100 * thisYdy - 150 * thisXdy,

                        PDFs.thisPDFtextArray.push([
                            textLine,
                            thisX - (thisTextsTextWidth / 2) * thisXdx,
                            thisY - (thisTextsTextWidth / 2) * thisXdy,
                            PDFs.currentPDFsettings.thisFont,
                            PDFs.currentPDFsettings.thisFontStyle,
                            PDFs.currentPDFsettings.thisFontSize,
                            { /* align: "center", maxWidth: 300, */ rotationDirection: 1, angle: thisTheta },
                        ]);

                        if (textIndex == 0) {
                            // PDFs.thisPDFellipseArray.push([
                            //     thisX - (thisTextsTextWidth / 2) * thisXdx,
                            //     thisY - (thisTextsTextWidth / 2) * thisXdy,
                            //     5,
                            //     5,
                            //     "DF",
                            //     { fillColor: "blue", strokeColor: "yellow", lineWidth: 2, phase: 2 },
                            // ]);
                            // PDFs.thisPDFellipseArray.push([
                            //     thisX,
                            //     thisY,
                            //     5,
                            //     5,
                            //     "DF",
                            //     { fillColor: "yellow", strokeColor: "blue", lineWidth: 2, phase: 2 },
                            // ]);
                        }

                        thisY += 10 * thisYdy;
                        thisX += 10 * thisYdx;

                        // if (pdf.getTextWidth(textLine) > 300) {
                        // thisY += 8;
                        // }
                    }
                }

                thisID = "photoFor" + index;
                let thisPhotoDIV = document.getElementById(thisID);
                thisElement = null;
                if (thisPhotoDIV) {
                    thisElement = thisPhotoDIV.children[0];
                }
                // thisElement = document.getElementById(thisID);
                if (
                    thisElement &&
                    thisElement.src > "" &&
                    document.location.host.indexOf("apps.wikitree.com") > -1 &&
                    thisElement.src.indexOf("www.wikitree.com") > -1 &&
                    thisElement.parentNode.style.display != "none"
                ) {
                    //  let thisBaseString = theBaseString;

                    let thisBaseString = await PDFs.setupWaitForBase64Image({
                        width: thisElement.width,
                        height: thisElement.height,
                        src: thisElement.src,
                        ahnNum: index,
                    });

                    PDFs.thisPDFimageArray.push([
                        thisBaseString,
                        // "/apps/clarke11007/images/icons/female.gif",
                        "",
                        thisX + thisElement.height * thisYdx - (thisElement.width / 2) * thisXdx,
                        thisY - thisElement.height + thisElement.height * thisYdy - (thisElement.width / 2) * thisXdy,

                        thisElement.width,
                        thisElement.height,
                        "",
                        "",
                        thisTheta,
                    ]);

                    thisY += (thisElement.height + 20) * thisYdy;
                    thisX += (thisElement.height + 20) * thisYdx;
                } else if (thisElement && thisElement.src > "" && thisElement.parentNode.style.display != "none") {
                    let thisBaseString = await PDFs.setupWaitForBase64Image({
                        width: thisElement.width,
                        height: thisElement.height,
                        src: thisElement.src,
                        ahnNum: index,
                    });

                    PDFs.thisPDFimageArray.push([
                        thisBaseString, //thisElement.src,
                        "PNG",
                        thisX + thisElement.height * thisYdx - (thisElement.width / 2) * thisXdx,
                        thisY - thisElement.height + thisElement.height * thisYdy - (thisElement.width / 2) * thisXdy,
                        thisElement.width,
                        thisElement.height,
                        "",
                        "",
                        thisTheta,
                    ]);
                    thisY += (thisElement.height + 20) * thisYdy;
                    thisX += (thisElement.height + 20) * thisYdx;
                }

                thisID = "nameDivFor" + index;
                thisElement = document.getElementById(thisID);
                //  PDFs.currentPDFsettings.thisFont =
                PDFs.setPDFfontBasedOnSetting(FanChartView.currentSettings.general_options_font4Names, true);
                //  PDFs.currentPDFsettings.thisFontStyle = "bold";
                tmpPDF.setFont(PDFs.currentPDFsettings.thisFont, PDFs.currentPDFsettings.thisFontStyle);
                tmpPDF.setFontStyle(PDFs.currentPDFsettings.thisFontStyle);

                if (thisElement) {
                    // PDFs.thisPDFellipseArray.push([
                    //     thisX,
                    //     thisY,
                    //     10,
                    //     10,
                    //     "DF",
                    //     { fillColor: "black", strokeColor: "red", lineWidth: 2, phase: 2 },
                    // ]);

                    let thisText = thisElement.textContent;

                    let thisTextsTextWidth = tmpPDF.getTextWidth(thisText);

                    //  console.log({ thisText }, { thisX }, { thisY });
                    // pdf.setDrawColor("#000000");
                    // pdf.setLineWidth(2);
                    // pdf.setFillColor(thisRRectBkgdClr);

                    // PDFs.thisPDFlinesArray.push([thisX - 150, thisY, thisX + 150, thisY, [0, 0, 255], 1, 0]);
                    // pdf.setFillColor("#FFFFFF");

                    PDFs.thisPDFtextArray.push([
                        thisText,
                        thisX - (thisTextsTextWidth / 2) * thisXdx,
                        thisY - (thisTextsTextWidth / 2) * thisXdy,
                        PDFs.currentPDFsettings.thisFont,
                        PDFs.currentPDFsettings.thisFontStyle,
                        PDFs.currentPDFsettings.thisFontSize,
                        {
                            rotationDirection: 1,
                            angle: thisTheta,
                        },
                    ]);

                    if (tmpPDF.getTextWidth(thisText) > 300) {
                        thisY += 19 * thisYdy;
                        thisX += 19 * thisYdx;
                    }
                }

                if (1 == 1) {
                    // continue;
                }

                //  PDFs.currentPDFsettings.thisFontStyle = "normal";
                PDFs.setPDFfontBasedOnSetting(FanChartView.currentSettings.general_options_font4Info, false);
                tmpPDF.setFont(PDFs.currentPDFsettings.thisFont, PDFs.currentPDFsettings.thisFontStyle);

                thisID = "birthDivFor" + index;
                thisElement = document.getElementById(thisID);
                if (thisElement) {
                    thisY += 5 * thisYdy;
                    thisX += 5 * thisYdx;
                    let thisTextArray = thisElement.innerHTML.split("<br>");

                    if (thisTextArray.length > 1) {
                        let thisTextsTextWidth = tmpPDF.getTextWidth(thisTextArray[1]);
                        if (thisTextsTextWidth > thisCrossRadius) {
                            let splitIndex = thisTextArray[1].indexOf(" ", thisTextArray[1].length / 2);
                            thisTextArray[2] = thisTextArray[1].substring(splitIndex).trim();
                            thisTextArray[1] = thisTextArray[1].substring(0, splitIndex).trim();
                        }
                    }
                    // console.log({ thisText }, { thisX }, { thisY });
                    // pdf.setDrawColor("#000000");
                    for (let textIndex = 0; textIndex < thisTextArray.length; textIndex++) {
                        const textLine = thisTextArray[textIndex];
                        thisY += 19 * thisYdy;
                        thisX += 19 * thisYdx;
                        let thisTextsTextWidth = tmpPDF.getTextWidth(textLine);
                        PDFs.thisPDFtextArray.push([
                            textLine,
                            thisX - (thisTextsTextWidth / 2) * thisXdx,
                            thisY - (thisTextsTextWidth / 2) * thisXdy,
                            PDFs.currentPDFsettings.thisFont,
                            PDFs.currentPDFsettings.thisFontStyle,
                            PDFs.currentPDFsettings.thisFontSize,
                            { rotationDirection: 1, angle: thisTheta },
                        ]);
                        // if (tmpPDF.getTextWidth(textLine) > 300) {
                        //     thisY += 19 * thisYdy;
                        //     thisX += 19 * thisYdx;
                        // }
                    }
                }

                thisID = "deathDivFor" + index;
                thisElement = document.getElementById(thisID);
                if (thisElement) {
                    thisY += 5 * thisYdy;
                    thisX += 5 * thisYdx;
                    let thisTextArray = thisElement.innerHTML.split("<br>");

                    if (thisTextArray.length > 1) {
                        let thisTextsTextWidth = tmpPDF.getTextWidth(thisTextArray[1]);
                        if (thisTextsTextWidth > thisCrossRadius) {
                            let splitIndex = thisTextArray[1].indexOf(" ", thisTextArray[1].length / 2);
                            thisTextArray[2] = thisTextArray[1].substring(splitIndex).trim();
                            thisTextArray[1] = thisTextArray[1].substring(0, splitIndex).trim();
                        }
                    }

                    // console.log({ thisText }, { thisX }, { thisY });
                    // pdf.setDrawColor("#000000");
                    for (let textIndex = 0; textIndex < thisTextArray.length; textIndex++) {
                        const textLine = thisTextArray[textIndex];
                        thisY += 19 * thisYdy;
                        thisX += 19 * thisYdx;
                        let thisTextsTextWidth = tmpPDF.getTextWidth(textLine);
                        PDFs.thisPDFtextArray.push([
                            textLine,
                            thisX - (thisTextsTextWidth / 2) * thisXdx,
                            thisY - (thisTextsTextWidth / 2) * thisXdy,
                            PDFs.currentPDFsettings.thisFont,
                            PDFs.currentPDFsettings.thisFontStyle,
                            PDFs.currentPDFsettings.thisFontSize,
                            { rotationDirection: 1, angle: thisTheta },
                        ]);
                        if (tmpPDF.getTextWidth(textLine) > 300) {
                            thisY += 19 * thisYdy;
                            thisX += 19 * thisYdx;
                        }
                    }
                }
                thisY += 40 * thisYdy; // have to take into consideration the height of the text - since thisY is the top of the text
                thisX += 40 * thisYdx; // have to take into consideration the height of the text - since thisY is the top of the text

                // let latestRRect = PDFs.thisPDFroundedRectArray[PDFs.thisPDFroundedRectArray.length - 1];
                // let latestRect = PDFs.thisPDFrectArray[PDFs.thisPDFrectArray.length - 1];
                // //  console.log("End RRect info:", index, { latestRRect }, { thisY });
                // if (latestRRect[3] < thisY - latestRRect[1]) {
                //     latestRRect[3] = thisY - latestRRect[1];
                //     latestRect[3] = latestRRect[3] - 30;
                // }
            }

            let fanChartDegreeSpan = FanChartView.maxAngle;
            let fanChartDegree2Begin = 180 - (fanChartDegreeSpan - 180) / 2;

            for (let index = 2 ** numGens2PDF - 1; index > 1; index--) {
                let thisGenNum = Math.floor(Math.log2(index));
                let bkgdWedgeName = "wedge" + 2 ** thisGenNum + "n" + (index - 2 ** thisGenNum);
                let bkgdWedgeElement = document.getElementById(bkgdWedgeName);
                if (bkgdWedgeElement) {
                    let thisWedgeStyle = bkgdWedgeElement.getAttribute("style");
                    let thisSVGpathD = bkgdWedgeElement.getAttribute("d");
                    let thisWedgeFillColour = "#0000FF"; // "#F0FFF0";
                    if (thisWedgeStyle > "") {
                        let thisWedgeStyleFill = PDFs.getValueFromStyleString(thisWedgeStyle, "fill");
                        if (thisWedgeStyleFill.indexOf("rgb") > -1) {
                            thisWedgeFillColour = Utils.rgbToHex(thisWedgeStyleFill); // "#F0FFF0"
                        } else {
                            thisWedgeFillColour = thisWedgeStyleFill;
                        }
                        // console.log("Wedge fill colour:", thisWedgeFillColour);
                    }
                    if (thisSVGpathD > "") {
                        let Acoords = thisSVGpathD
                            .substring(thisSVGpathD.indexOf("A"), thisSVGpathD.indexOf("L"))
                            .trim()
                            .split(" ");
                        if (Acoords && Acoords.length > 1) {
                            let maxAbsVal = 0;
                            for (let aIndex = 1; aIndex < Acoords.length; aIndex++) {
                                maxAbsVal = Math.max(maxAbsVal, Math.abs(1.0 * Acoords[aIndex]));
                            }

                            // console.log(
                            //     "ADD Wedge with  fill colour:",
                            //     thisWedgeFillColour,
                            //     "radius:",
                            //     maxAbsVal,
                            //     Acoords
                            // );

                            if (maxAbsVal > 0) {
                                PDFs.addArcToPDF(
                                    0,
                                    0,
                                    maxAbsVal,
                                    fanChartDegree2Begin +
                                        (index - 2 ** thisGenNum) * (fanChartDegreeSpan / 2 ** thisGenNum),
                                    fanChartDegreeSpan / 2 ** thisGenNum,
                                    "DF",
                                    {
                                        fillColor: thisWedgeFillColour,
                                        strokeColor: "#000000",
                                        lineWidth: 2,
                                    }
                                );
                            }
                        }
                    }
                }
            }

            // ADD SOME ARC SECTORS
            // cx, cy, r, startAngle, endAngle, style, options

            // ALL COMPONENTS HAVE BEEN ADDED TO THE PDF - NOW DO THE FINAL CALCULATIONS
            PDFs.setPDFsMaxMins();
            // console.log("thisPDFmaxY", PDFs.thisPDFmaxY);
            let thisMaxY = PDFs.thisPDFmaxY;
            if (FanChartView.maxAngle == 180) {
                thisMaxY = 1.0 * ctrCircle.getAttribute("r");
            } else if (FanChartView.maxAngle == 240) {
                thisMaxY = (5 / 9) * thisMaxY;
            }

            PDFs.setPDFsizes(tmpPDF, { maxY: thisMaxY });

            console.log("w,h:", PDFs.thisPDFwidth, PDFs.thisPDFheight);
            // console.log(PDFs.thisPDFarcsArray);

            // Must set ORIENTATION based on the width and height of the PDF - doesn't like it otherwise.
            // let orientation = "l";
            // if (PDFs.thisPDFwidth < PDFs.thisPDFheight) {
            //     orientation = "p";
            // }

            // console.log(PDFs.thisPDFtextArray);
            // let realPDF = new jsPDF(orientation, "pt", [PDFs.thisPDFwidth, PDFs.thisPDFheight]);
            // console.log(PDFs.currentPDFsettings);

            // TOTALLY MADE UP LINES Drawing

            // PDFs.addArcsToPDF(realPDF);
            // PDFs.addEllipsesToPDF(realPDF, 1);
            // PDFs.addLinesToPDF(realPDF);
            // PDFs.addRectsToPDF(realPDF);
            // PDFs.addRoundedRectsToPDF(realPDF);
            // PDFs.addImagesToPDF(realPDF);
            // PDFs.addTextsToPDF(realPDF);
            // PDFs.addEllipsesToPDF(realPDF, 2);

            let realPDF = PDFs.assemblePDF([
                "arcs",
                "ellipses:1",
                "lines",
                "rects",
                "roundedRects",
                "images",
                "texts",
                "ellipses:2",
            ]);

            // var ctx = realPDF.context2d;

            // realPDF.setFillColor(0, 255, 0);
            // realPDF.setDrawColor(0, 0, 255);
            // realPDF.setLineWidth(14);
            // // ctx.save();
            // ctx.fillStyle = "#ff0000";
            // ctx.strokeStyle = "#ff0000";
            // ctx.arc(400, 800, 200, 1, 2);
            // ctx.arc(400, 800, 100, 1, 2);
            // ctx.lineTo(300, 300);
            // ctx.stroke();
            // // ctx.restore();

            // // ctx.restore();
            // realPDF.setFillColor(0, 128, 255);
            // realPDF.setDrawColor(255, 0, 0);
            // realPDF.setLineWidth(5);
            // ctx.fillStyle = "#ff0000";
            // ctx.strokeStyle = "#00ff00";

            // ctx.arc(400, 640, 100, 0, Math.PI / 2);
            // // ctx.lineTo(400, 640);
            // // ctx.lineTo(500, 640);
            // ctx.stroke();
            // ctx.save();

            // // ctx.fill();

            // ctx.save();
            // realPDF.setFillColor(0, 255, 0);
            // realPDF.setDrawColor(0, 255, 0);
            // realPDF.setLineWidth(40);
            // ctx.fillStyle = "#0000ff";
            // ctx.strokeStyle = "#0000ff";
            // ctx.arc(400, 640, 50, 0, Math.PI / 2);
            // ctx.rotate(Math.PI / 4);
            // ctx.stroke();
            // ctx.fill();
            // ctx.restore();

            // realPDF.lines(
            //     [
            //         [20, 20],
            //         [-20, 20],
            //         [10, 10, 20, 20, 30, 25],
            //         [45, 10, 70, 0, 30, 15],
            //         [20, 10],
            //     ],
            //     412,
            //     510,
            //     [2, 2],
            //     "F",
            //     false
            // );

            // realPDF.setFont("courier", "normal");
            // realPDF.setFontSize(40);
            // realPDF.setTextColor(0, 0, 255);
            // realPDF.text("Testing on an Angle", 300, 300, {
            //     angle: 45,
            //     align: "center",
            //     maxWidth: 300,
            //     baseline: "middle",
            // });

            let fileName4PDF =
                "FanChart_" +
                FanChartView.myAhnentafel.primaryPerson.getName() +
                "_" +
                FanChartView.numGens2Display +
                "gens_" +
                PDFs.datetimestamp() +
                ".pdf";

            realPDF.save(fileName4PDF);

            FanChartView.closePDFpopup();
        };

        $("#popupDIV").draggable();
        $("#connectionPodDIV").draggable();
        $("#legendDIV").draggable();
        document.getElementById("legendDIV").style.zIndex = Utils.getNextZLevel();

        //   $("#popupDIV").keyup(function (e) {
        //       if (e.keyCode == 13) {
        //         console.log("POPUP DIV  / KEY CODE 13 !!!")
        //         //   $("#drawTreeButton").click();
        //       }
        //   });

        $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);

        FanChartView.closeTopPopup = function (e) {
            // console.log("closeTopPopUp");
            if (e.key === "Escape") {
                // Find the popup with the highest z-index
                // console.log("ESCAPE KEY in FanChartView / document");
                const [lastPopup, highestZIndex] = FanChartView.findTopPopup();

                // Close the popup with the highest z-index
                if (lastPopup) {
                    // FanChartView.closePopup(lastPopup);
                    // console.log("GOING to SLIDE UP the Fan Chart lastPopup")
                    lastPopup.slideUp("fast");
                    Utils.setNextZLevel(highestZIndex);
                }
            }
        };

        FanChartView.findTopPopup = function () {
            // console.log("findTopPopup");
            // Find the popup with the highest z-index
            let highestZIndex = 0;
            let lastPopup = null;
            $(".pop-up:visible").each(function () {
                const zIndex = parseInt($(this).css("z-index"), 10);
                if (zIndex > highestZIndex) {
                    highestZIndex = zIndex;
                    lastPopup = $(this);
                }
            });
            return [lastPopup, highestZIndex];
        };

        FanChartView.toggleAbout = function () {
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

        FanChartView.reZoom = function () {
            condLog("TIME to RE ZOOM now !", FanChartView.currentScaleFactor);
            let newScaleFactor = 0.8;

            let svg = document.getElementById("fanChartSVG");
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
                //     FanChartView.currentScaleFactor,
                //     FanChartView.lastCustomScaleFactor,
                //     0.8 * makeFitZoomFactor,

                // );

                if (
                    FanChartView.currentScaleFactor != 0.8 * makeFitZoomFactor &&
                    FanChartView.currentScaleFactor != 1.0 * makeFitZoomFactor &&
                    FanChartView.lastCustomScaleFactor != FanChartView.currentScaleFactor
                ) {
                    FanChartView.lastCustomScaleFactor = FanChartView.currentScaleFactor;
                    FanChartView.zoomCounter = 2;
                }

                FanChartView.zoomCounter = (FanChartView.zoomCounter + 1) % 3;

                if (FanChartView.zoomCounter == 0) {
                    newScaleFactor = 0.8 * makeFitZoomFactor;
                } else if (FanChartView.zoomCounter == 1) {
                    newScaleFactor = 1.0 * makeFitZoomFactor;
                } else if (FanChartView.zoomCounter == 2) {
                    newScaleFactor = FanChartView.lastCustomScaleFactor;
                }

                let overHead = 0;
                if ((newScaleFactor * window.innerWidth * h) / boundingBox.width < window.innerHeight) {
                    overHead = Math.max(0, window.innerHeight - newScaleFactor * window.innerHeight);
                }
                condLog(
                    "z",
                    FanChartView.zoomCounter,
                    "overHead:",
                    overHead,
                    "newScaleFactor:",
                    newScaleFactor,
                    "bounding:",
                    boundingBox.width + " x " + boundingBox.height,
                    "in app:",

                    newScaleFactor * window.innerWidth + " x " + newScaleFactor * window.innerHeight
                );

                d3.select(svg).call(
                    FanChartView.zoom.transform,
                    d3.zoomIdentity.translate(0, 0 - overHead).scale(newScaleFactor) /// translation used to be -h * 0.08
                );
                condLog("RESETscale factor to ", newScaleFactor);
            }
        };

        function updateBadgeLabels() {
            condLog("Update Badge Labels");
            for (let b = 1; b <= numOfBadges; b++) {
                let badgeCharTxt = document.getElementById("badgeCharacter" + b);
                badgeCharTxt.textContent = FanChartView.badgeCharacters[b];
            }
        }

        function settingsChanged(e) {
            if (FanChartView.fanchartSettingsOptionsObject.hasSettingsChanged(FanChartView.currentSettings)) {
                console.log("Settings Changed:", FanChartView.currentSettings);
                WTapps_Utils.setCookie("wtapps_fanchart", JSON.stringify(FanChartView.currentSettings), {
                    expires: 365,
                });
                // condLog("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                // condLog("NEW settings are:", FanChartView.currentSettings);

                let showBadges = FanChartView.currentSettings["general_options_showBadges"];
                let colourBy = FanChartView.currentSettings["colour_options_colourBy"];
                let colour_options_specifyByFamily = FanChartView.currentSettings["colour_options_specifyByFamily"];
                let colour_options_specifyByLocation = FanChartView.currentSettings["colour_options_specifyByLocation"];

                let legendDIV = document.getElementById("legendDIV");
                let LegendTitle = document.getElementById("LegendTitle");
                let LegendTitleH3 = document.getElementById("LegendTitleH3");
                let stickerLegend = document.getElementById("stickerLegend");
                let legendToggle = document.getElementById("legendASCII");
                let innerLegend = document.getElementById("innerLegend");
                let BRbetweenLegendAndStickers = document.getElementById("BRbetweenLegendAndStickers");

                // showBadges;
                // badgeLabels;
                // customBadgeLabels;

                FanChartView.removeBadges("DNA");

                if (
                    showBadges ||
                    colourBy == "Family" ||
                    colourBy == "Location" ||
                    colourBy == "BioCheck" ||
                    colourBy == "DNAstatus"
                ) {
                    let badgeLabels = FanChartView.currentSettings["general_options_badgeLabels"];
                    if (badgeLabels == "12345") {
                        FanChartView.badgeCharacters = " 12345";
                    } else if (badgeLabels == "ABCDE") {
                        FanChartView.badgeCharacters = " ABCDE";
                    } else if (badgeLabels == "custom") {
                        FanChartView.badgeCharacters =
                            " " +
                            FanChartView.currentSettings["general_options_badgeLabels_otherValue"].trim() +
                            "*!@#^";
                    }
                    if (showBadges) {
                        updateBadgeLabels();
                        for (let b = 1; b <= numOfBadges; b++) {
                            FanChartView.updateBadgesToShow(b);
                        }
                    } else {
                        FanChartView.removeBadges();
                    }

                    legendDIV.style.display = "block";
                    stickerLegend.style.display = "block";
                    legendToggle.style.display = "inline-block";
                    if (
                        colourBy == "Family" ||
                        colourBy == "Location" ||
                        colourBy == "BioCheck" ||
                        colourBy == "DNAstatus"
                    ) {
                        BRbetweenLegendAndStickers.style.display = "block";
                        LegendTitleH3.style.display = "block";
                        condLog(
                            "NEW UPDATE SETTINGS: ",
                            colourBy,
                            colour_options_specifyByFamily,
                            colour_options_specifyByLocation
                        );
                        FanChartView.updateLegendTitle();
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

                if (!showBadges) {
                    FanChartView.removeBadges();
                }

                FanChartView.updateHighlightDescriptor();

                // IF we're using adjustable wedges for each ring of the Fan Chart, then we will want to add a condition about
                // the sizing of the wedge having to be recalculated, which would happen if:
                // 1. the format for Places has changed (longer / shorter / hidden completely or shown suddenly)
                // 2. the setting for Dates changes from Hide / Show to Show / Hide
                // 3. the setting for when to give up on showing full details changes
                //  * DATES:  Hide Dates (*) Never ( ) After Ring 5 ( ) After Ring 10 ( ) After Ring 15 ( ) After Ring 20 ( ) Always
                //  * PLACES: Hide/Shorten Places (*) Never ( ) After Ring 5 ( ) After Ring 10 ( ) After Ring 15 ( ) After Ring 20 ( ) Always

                FanChartView.myAncestorTree.draw();

                if (recalculateMaxWidthsForCells() == true) {
                    condLog("DOING REDRAW again!");
                    redoWedgesForFanChart(true);
                    FanChartView.myAncestorTree.draw();
                    // let's check one more time ...
                    // if (recalculateMaxWidthsForCells() == true) {
                    //     condLog("DOING REDRAW again!");
                    //     redoWedgesForFanChart(true);
                    //     FanChartView.myAncestorTree.draw();
                    // }
                }
            } else {
                // condLog("NOTHING happened according to SETTINGS OBJ");
            }
        }

        FanChartView.updateLegendTitle = function () {
            let colourBy = FanChartView.currentSettings["colour_options_colourBy"];
            let colour_options_specifyByFamily = FanChartView.currentSettings["colour_options_specifyByFamily"];
            let colour_options_specifyByLocation = FanChartView.currentSettings["colour_options_specifyByLocation"];

            let legendDIV = document.getElementById("legendDIV");
            let LegendTitle = document.getElementById("LegendTitle");

            if (colourBy == "Family" && colour_options_specifyByFamily == "age") {
                LegendTitle.textContent = "Age at death";
            } else if (colourBy == "Family" && colour_options_specifyByFamily == "numSpouses") {
                LegendTitle.textContent = "Number of spouses";
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
            } else if (colourBy == "BioCheck") {
                LegendTitle.textContent = "Bio Check status";
            } else if (colourBy == "DNAstatus") {
                LegendTitle.textContent = "Parental status";
            } else {
                LegendTitle.textContent = "";
            }
        };

        FanChartView.updateHighlightDescriptor = function () {
            let legendToggle = document.getElementById("legendASCII");
            let innerLegend = document.getElementById("innerLegend");

            if (FanChartView.currentSettings["highlight_options_showHighlights"] == true) {
                legendDIV.style.display = "block";
                legendToggle.style.display = "inline-block";

                document.getElementById("highlightDescriptor").style.display = "block";
                if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                    document.getElementById("highlightPeepsDescriptor").textContent = "Y DNA ancestors";
                    if (
                        thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female"
                    ) {
                        document.getElementById("highlightPeepsDescriptor").innerHTML =
                            "Y DNA ancestors<br><i>Y DNA inherited and passed on by male ancestors only</i>";
                    }
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "mitochondrial DNA (mtDNA) ancestors";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                    document.getElementById("highlightPeepsDescriptor").textContent = "X Chromosome inheritance path";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "X, Y, mitochondrial DNA ancestors";
                    if (
                        thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female"
                    ) {
                        document.getElementById("highlightPeepsDescriptor").innerHTML =
                            "X, Y, mitochondrial DNA ancestors<br><i>Y DNA inherited and passed on by male ancestors only</i>";
                    }
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                    document.getElementById("highlightPeepsDescriptor").textContent = "Relationships confirmed by DNA";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "cat") {
                    let catNameSelector = document.getElementById("highlight_options_catName");
                    let rawValue = catNameSelector.value.trim();
                    currentHighlightCategory = rawValue;
                    document.getElementById("highlightPeepsDescriptor").textContent = rawValue;
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioCheckOK") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "Profiles that pass the Bio Check : have sources";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioCheckFail") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "Profiles that fail the Bio Check : no sources";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioCheckStyle") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "Profiles that the Bio Check app flagged : style issues";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
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
                            "Alive on " +
                            aliveDDSelector.value +
                            " " +
                            monthNames[aliveMMMSelector.value - 1] +
                            " " +
                            1950;
                    }
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioText") {
                    let bioTextSelector = document.getElementById("highlight_options_bioText");
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        'Biographies that contain the word: "' + bioTextSelector.value.trim() + '"';
                } else {
                    document.getElementById("highlightPeepsDescriptor").textContent = "Something else ...";
                }
            } else {
                document.getElementById("highlightDescriptor").style.display = "none";
            }
        };

        // NEXT STEPS : Assign thisVal to actual currentSetting object
        // NEXT STEPS : Transfer this function to SettingsObject class
        // NEXT STEPS : Return a True/False based on whether any changes were actually made --> THEN - call reDraw routine if needed

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3
            .select(container)
            .append("svg")
            .attr("id", "fanChartSVG") //
            .style("visibility", "hidden");
        const g = svg.append("g").attr("id", "SVGgraphics");
        const gPaths = g.append("div").attr("id", "gPaths");
        const gMDates = g.append("div").attr("id", "gMDates");
        const gPersons = g.append("div").attr("id", "gPersons");

        FanChartView.theSVG = svg;

        // Setup zoom and pan
        FanChartView.zoom = d3
            .zoom()
            .scaleExtent([0.1, 3.0])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
                FanChartView.currentScaleFactor = event.transform.k;
                // console.log("JUST zoomed to ", FanChartView.currentScaleFactor);
            });
        svg.call(FanChartView.zoom);
        // initialization of the viewport will be handled in resetView, which is called by drawWedgesForFanChart

        // condLog("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the Fan Chart
        self.ancestorTree = new AncestorTree(g);
        condLog("2. d3.scale = ", d3.scale);

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
            CREATE the FAN CHART Backdrop
            * Made of mostly Wedges (starting with the outermost circle)
            * Ending with 2 Sectors for the penultimate pair  - the parents of the central circular superhero
        */

        drawWedgesForFanChart(g); //gPaths
        svg.style("visibility", null);
        self.load(startId);
        // condLog(FanChartView.fanchartSettingsOptionsObject.createdSettingsDIV);
        FanChartView.fanchartSettingsOptionsObject.buildPage();
        FanChartView.fanchartSettingsOptionsObject.setActiveTab("names");
        FanChartView.currentSettings = FanChartView.fanchartSettingsOptionsObject.getDefaultOptions();

        let theCookieString = WTapps_Utils.getCookie("wtapps_fanchart");
        if (theCookieString) {
            FanChartView.updateCurrentSettingsBasedOnCookieValues(theCookieString);
        }

        // SETUP some ON CHANGE events so that changing options INSIDE the Settings Panel
        // will immediately HIDE / SHOW other elements, as necessary

        let bkgdClrSelector = document.getElementById("colour_options_colourBy");
        let showMarriageSelector = document.getElementById("date_options_showMarriage");
        bkgdClrSelector.setAttribute("onchange", "FanChartView.optionElementJustChanged();");
        showMarriageSelector.setAttribute("onchange", "FanChartView.optionElementJustChanged();");

        let colourizeColoursTab = document.getElementById("colour_options_colourizeRepeats");
        let colourizeGeneralTab = document.getElementById("general_options_colourizeRepeats");
        let colourizeHighlightTab = document.getElementById("highlight_options_colourizeRepeats");
        colourizeColoursTab.setAttribute("onchange", "FanChartView.colourizeJustChanged('colour');");
        colourizeGeneralTab.setAttribute("onchange", "FanChartView.colourizeJustChanged('general');");
        colourizeHighlightTab.setAttribute("onchange", "FanChartView.colourizeJustChanged('highlight');");

        let highlightSelector = document.getElementById("highlight_options_highlightBy");
        highlightSelector.setAttribute("onchange", "FanChartView.optionElementJustChanged();");

        // CALL this FUNCTION to do the necessary tweaking to HIDE or SHOW elements
        // from inside the Settings panel, based on options chosen
        FanChartView.tweakSettingsToHideShowElements();

        FanChartView.updateHighlightDescriptor();
        FanChartView.updateLegendTitle();

        let showBadges = FanChartView.currentSettings["general_options_showBadges"];
        let stickerLegend = document.getElementById("stickerLegend");

        if (showBadges == false) {
            FanChartView.removeBadges();
            stickerLegend.style.display = "none";
        } else {
            let badgeLabels = FanChartView.currentSettings["general_options_badgeLabels"];
            if (badgeLabels == "12345") {
                FanChartView.badgeCharacters = " 12345";
            } else if (badgeLabels == "ABCDE") {
                FanChartView.badgeCharacters = " ABCDE";
            } else if (badgeLabels == "custom") {
                FanChartView.badgeCharacters =
                    " " + FanChartView.currentSettings["general_options_badgeLabels_otherValue"] + "*!@#^";
            }

            updateBadgeLabels();
            // console.log(
            //     "SHOW BADGES:",
            //     showBadges,
            //     stickerLegend,
            //     badgeLabels,
            //     FanChartView.badgeCharacters,
            //     FanChartView.currentSettings
            // );
        }

        // if (bkgdClrSelector.value == "Location") {
        //     console.log("BKGD CLR ",bkgdClrSelector);
        //     fillOutFamilyStatsLocsForAncestors();
        // updateLegendIfNeeded();
        // }

        condLog("TWEAKED the Highlights tab - how many categories I wonder ...", categoryList);
        // FanChartView.showFandokuLink = theCheckIn;

        // BEFORE we go further ... let's add the DNA objects, Stickers, and MarriageDateDIVs we might need later

        for (let genIndex = FanChartView.maxNumGens - 1; genIndex >= 0; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                let ahnNum = index + 2 ** genIndex;

                if (ahnNum % 2 == 0 && (ahnNum <= 32 || (ahnNum <= 64 && FanChartView.maxAngle == 360))) {
                    //             // "Portrait-ish" if you're looking at it from the spokes from the centre perspective
                    gMDates
                        .append("g")
                        .attrs({
                            id: "mDateFor-" + ahnNum,
                            class: "floatAbove",
                        })
                        .append("foreignObject")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "inner",
                            class: "centered mDateBox",
                            width: "20px",
                            height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                            // x: 25 * index,
                            // y: 30 * genIndex + 5 * 300,
                            //
                            style: "display:none;", //  // CHANGED FOR BADGE TESTING
                        })

                        .style("overflow", "visible") // so the name will wrap
                        .append("xhtml:div")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "-date",
                            class: "centered mDateBox",
                        })
                        .html("m.<br/>28 Aug<br/>1987");

                    //             // condLog("Created ", document.getElementById("mDateFor-" + ahnNum));
                } else if (ahnNum % 2 == 0 && (ahnNum >= 64 || (ahnNum >= 32 && FanChartView.maxAngle < 360))) {
                    //             // "Landscape-ish" if you're looking at it from the spokes from the centre perspective, ie, text is sideways
                    gMDates
                        .append("g")
                        .attrs({
                            id: "mDateFor-" + ahnNum,
                            class: "floatAbove",
                        })
                        .append("foreignObject")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "inner",
                            class: "centered",
                            width: "20px",
                            height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                            // x: 25 * index,
                            // y: 30 * genIndex + 5 * 300,
                            //
                            style: "display:none;", //  // CHANGED FOR BADGE TESTING
                        })

                        .style("overflow", "visible") // so the name will wrap
                        .append("xhtml:div")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "-date",
                            class: "centered mDateBox2",
                        })
                        .html("m. 28 Aug 1987");

                    //             condLog("Created ", document.getElementById("mDateFor-" + ahnNum));
                }
            }
        }
    };

    function showRefreshInLegend() {
        let refreshLegendDIV = document.getElementById("refreshLegend");
        refreshLegendDIV.style.display = "block";
    }

    FanChartView.refreshTheLegend = function () {
        condLog("NOW IS THE TIME FOR ALL GOOD CHUMPS TO REFRESH THE LEGEND");
        let refreshLegendDIV = document.getElementById("refreshLegend");
        refreshLegendDIV.style.display = "none";
        FanChartView.updateLegendIfNeeded();
        FanChartView.redraw();
    };

    // this function will keep the two COLOURIZE REPEATS settings in sync - ideally!
    FanChartView.colourizeJustChanged = function (which) {
        let colourizeColoursTab = document.getElementById("colour_options_colourizeRepeats");
        let colourizeGeneralTab = document.getElementById("general_options_colourizeRepeats");
        let colourizeHighlightTab = document.getElementById("highlight_options_colourizeRepeats");
        let newSetting = document.getElementById(which + "_options_colourizeRepeats").checked;
        // condLog("COLOURIZE REPEATS - just changed in Tab: ", which, newSetting);
        colourizeColoursTab.checked = newSetting;
        colourizeGeneralTab.checked = newSetting;
        colourizeHighlightTab.checked = newSetting;
    };

    FanChartView.tweakSettingsToHideShowElements = function () {
        // SOME minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let specFamSelector = document.getElementById("colour_options_specifyByFamily");
        let specLocSelector = document.getElementById("colour_options_specifyByLocation");
        let specFamSelectorLabel = document.getElementById("colour_options_specifyByFamily_label");
        let specLocSelectorLabel = document.getElementById("colour_options_specifyByLocation_label");
        let specFamSelectorBR = document.getElementById("colour_options_specifyByFamily_BR");
        let specLocSelectorBR = document.getElementById("colour_options_specifyByLocation_BR");

        if (FanChartView.currentSettings["colour_options_colourBy"] != "Family") {
            specFamSelector.style.display = "none";
            specFamSelectorLabel.style.display = "none";
            specFamSelectorBR.style.display = "none";
        } else {
            specFamSelector.style.display = "inline-block";
            specFamSelectorLabel.style.display = "inline-block";
            specFamSelectorBR.style.display = "inline-block";
        }

        if (FanChartView.currentSettings["colour_options_colourBy"] != "Location") {
            specLocSelector.style.display = "none";
            specLocSelectorLabel.style.display = "none";
            specLocSelectorBR.style.display = "none";
        } else {
            specLocSelector.style.display = "inline-block";
            specLocSelectorLabel.style.display = "inline-block";
            specLocSelectorBR.style.display = "inline-block";
        }

        // SOME minor tweaking needed in the HIGHLIGHT tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        let howDNAlinksRadiosBR = document.getElementById("highlight_options_howDNAlinks_BR");
        let catNameSelector = document.getElementById("highlight_options_catName");
        let catNameSelectorLabel = document.getElementById("highlight_options_catName_label");

        if (FanChartView.currentSettings["highlight_options_highlightBy"].indexOf("DNA") == -1) {
            break4DNASelector.parentNode.style.display = "none";
            howDNAlinksRadiosBR.parentNode.style.display = "none";
        } else {
            break4DNASelector.parentNode.style.display = "block";
            howDNAlinksRadiosBR.parentNode.style.display = "block";
        }

        if (FanChartView.currentSettings["highlight_options_highlightBy"] != "cat") {
            catNameSelector.style.display = "none";
            catNameSelectorLabel.style.display = "none";
        } else {
            catNameSelector.style.display = "inline-block";
            catNameSelectorLabel.style.display = "inline-block";
        }

        let bioTextSelector = document.getElementById("highlight_options_bioText");
        let bioTextSelectorLabel = document.getElementById("highlight_options_bioText_label");
        if (FanChartView.currentSettings["highlight_options_highlightBy"] != "bioText") {
            bioTextSelector.style.display = "none";
            bioTextSelectorLabel.style.display = "none";
        } else {
            bioTextSelector.style.display = "inline-block";
            bioTextSelectorLabel.style.display = "inline-block";
        }

        let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
        let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
        let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

        if (FanChartView.currentSettings["highlight_options_highlightBy"] != "aliveDay") {
            aliveYYYYSelector.parentNode.parentNode.style.display = "none";
            aliveMMMSelector.parentNode.style.display = "none";
            aliveDDSelector.parentNode.style.display = "none";
        } else {
            aliveYYYYSelector.parentNode.parentNode.style.display = "block";
            aliveMMMSelector.parentNode.style.display = "block";
            aliveDDSelector.parentNode.style.display = "block";
        }

        if (document.getElementById("date_options_showMarriage").checked == true) {
            document.getElementById("date_options_marriageBlend").parentNode.style.display = "inline-block";
            document.getElementById("date_options_marriageAtTopEarlyGens").parentNode.style.display = "inline-block";
        } else {
            document.getElementById("date_options_marriageBlend").parentNode.style.display = "none";
            document.getElementById("date_options_marriageAtTopEarlyGens").parentNode.style.display = "none";
        }
    };

    // and here's that Function that does the minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
    FanChartView.optionElementJustChanged = function () {
        condLog("optionElementJustChanged !!!!!");

        // A SIMILAR FUNCTION to this one, but called initially when the app is loaded is this:
        //  tweakSettingsToHideShowElements();

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
        let showBadges = FanChartView.currentSettings["general_options_showBadges"];
        let showMarriage = document.getElementById("date_options_showMarriage").checked;

        // SOME minor tweaking needed in the HIGHLIGHT tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let highlightSelector = document.getElementById("highlight_options_highlightBy");
        let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        let howDNAlinksRadiosBR = document.getElementById("highlight_options_howDNAlinks_BR");
        let catNameSelector = document.getElementById("highlight_options_catName");
        let catNameSelectorLabel = document.getElementById("highlight_options_catName_label");

        let bioTextSelector = document.getElementById("highlight_options_bioText");
        let bioTextSelectorLabel = document.getElementById("highlight_options_bioText_label");

        let marriageBlendSelector = document.getElementById("date_options_marriageBlend");
        let marriageAtTopEarlyGensSelector = document.getElementById("date_options_marriageAtTopEarlyGens");
        let marriageBlendSelectorLabel = document.getElementById("date_options_marriageBlend_label");
        let marriageAtTopEarlyGensSelectorLabel = document.getElementById("date_options_marriageAtTopEarlyGens_label");
        marriageBlendSelector.parentNode.style.display = "none";
        marriageAtTopEarlyGensSelector.parentNode.style.display = "none";

        let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
        let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
        let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

        aliveYYYYSelector.parentNode.parentNode.style.display = "none";
        aliveMMMSelector.parentNode.style.display = "none";
        aliveDDSelector.parentNode.style.display = "none";

        condLog("VALUES:", bkgdClrSelector.value, highlightSelector.value, "showMarriage", showMarriage);
        if (showMarriage) {
            marriageBlendSelector.parentNode.style.display = "inline-block";
            marriageAtTopEarlyGensSelector.parentNode.style.display = "inline-block";
        }

        if (bkgdClrSelector.value == "Family") {
            specFamSelector.style.display = "inline-block";
            // legendASCIIspan.style.display = "inline-block";
            specLocSelector.style.display = "none";
            specLocSelectorLabel.style.display = "none";
            specLocSelectorBR.style.display = "none";
            specFamSelectorLabel.style.display = "inline-block";
            specFamSelectorBR.style.display = "inline-block";
            clrPaletteSelector.style.display = "inline-block";
            clrPaletteSelectorLabel.style.display = "inline-block";
        } else if (bkgdClrSelector.value == "Location") {
            specLocSelector.style.display = "inline-block";
            // legendASCIIspan.style.display = "inline-block";
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
            // legendASCIIspan.style.display = "none";
            clrPaletteSelector.style.display = "inline-block";
            clrPaletteSelectorLabel.style.display = "inline-block";

            let theDIV = document.getElementById("legendDIV");
            let LegendTitle = document.getElementById("LegendTitle");
            let LegendTitleH3 = document.getElementById("LegendTitleH3");

            if (showBadges == false) {
                // theDIV.style.display = "none";
                // legendASCIIspan.style.display = "none";
            } else {
                // theDIV.style.display = "block";
                // legendASCIIspan.style.display = "inline-block";
            }
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
        } else if (highlightSelector.value == "bioCheckStyle" || highlightSelector.value == "bioCheckFail") {
            // show nothing
        } else {
            break4DNASelector.parentNode.style.display = "block";
            howDNAlinksRadiosBR.parentNode.style.display = "inline-block";
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

    function showTemporaryMessageBelowButtonBar(theMessage, delay = 3000) {
        flashWarningMessageBelowButtonBar(theMessage);
        setTimeout(clearMessageBelowButtonBar, delay);
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
        // condLog("numGensSpan:", numGensSpan);
        if (FanChartView.numGens2Display > FanChartView.numGensRetrieved) {
            loadAncestorsAtLevel(FanChartView.numGens2Display);
            FanChartView.numGensRetrieved = FanChartView.numGens2Display;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        condLog("Need to load MORE peeps from Generation ", newLevel);
        // let theListOfIDs = FanChartView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        let loadingTD = document.getElementById("loadingTD");
        let id = FanChartView.myAhnentafel.list[1];
        // condLog(theListOfIDs);
        // if (theListOfIDs.length == 0) {
        if (1 == 0) {
            // condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            FanChartView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            updateMyAhentafelMarriages();
            FanChartView.numGensRetrieved++;
            FanChartView.workingMaxNumGens = Math.min(FanChartView.maxNumGens, FanChartView.numGensRetrieved + 1);
        } else {
            loadingTD.innerHTML = "loading";
            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                id,
                // WikiTreeAPI.getRelatives(
                //     APP_ID,
                //     theListOfIDs,
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
                    "DataStatus",

                    "Manager",
                    "Creator",
                    "IsMember",
                    "Created",
                    "BirthDateDecade",
                    "DeathDateDecade",
                    "Bio",
                ],
                {
                    ancestors: newLevel,
                    minGeneration: newLevel,
                }
            ).then(function (result) {
                if (result) {
                    // need to put in the test ... in case we get a null result, which we will eventually at the end of the line
                    FanChartView.theAncestors = result[2];
                    condLog("theAncestors:", FanChartView.theAncestors);
                    // condLog("person with which to drawTree:", person);
                    // for (let index = 0; index < FanChartView.theAncestors.length; index++) {
                    let myWTuserID = window.wtViewRegistry.session.lm.user.name;
                    for (const index in FanChartView.theAncestors) {
                        thePeopleList.add(FanChartView.theAncestors[index]);

                        let thePerson = new BioCheckPerson();
                        let canUseThis = thePerson.canUse(FanChartView.theAncestors[index], false, true, myWTuserID);
                        let biography = new Biography(theSourceRules);
                        biography.parse(thePerson.getBio(), thePerson, "");
                        let hasSources = biography.validate();
                        thePeopleList[thePerson.getProfileId()]["biocheck"] = biography;
                        thePeopleList[thePerson.getProfileId()]["bioHasSources"] = hasSources;
                    }

                    FanChartView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    updateMyAhentafelMarriages();
                    FanChartView.workingMaxNumGens = Math.min(
                        FanChartView.maxNumGens,
                        FanChartView.numGensRetrieved + 1
                    );

                    clearMessageBelowButtonBar();
                    loadingTD.innerHTML = "&nbsp;";
                    // loadBiosNow(id, newLevel);
                    findCategoriesOfAncestors();
                }
            });
        }
    }

    function updateCumulativeWidths() {
        let currCumulativeRadius = 0;
        for (let g = 0; g < fanGenRadii.length; g++) {
            if (fanGenRadii[g] < minimumRingRadius) {
                fanGenRadii[g] = minimumRingRadius;
            }
            if (g <= 4 || (g == 5 && FanChartView.maxAngle == 360)) {
                condLog("CUMUL CALC:", g, currCumulativeRadius, "+ radius", fanGenRadii[g]);
                currCumulativeRadius += fanGenRadii[g];
            } else {
                condLog("CUMUL CALC:", g, currCumulativeRadius, "+ cross span", fanGenCrossSpan[g]);
                // currCumulativeRadius += fanGenCrossSpan[g];
                currCumulativeRadius += fanGenRadii[g];
            }
            cumulativeGenRadii[g] = currCumulativeRadius;
        }
        // console.log("FINAL CUMUL CALC:", currCumulativeRadius, "based on", fanGenRadii);

        if (FanChartView.currentSettings) {
            updateOuterRimNeeds();
        }
    }

    function updateNumLinesInRings() {
        for (let r = 1; r <= 10; r++) {
            let numSpotsThisGen = 2 ** r;
            let prevCumulativeRadius = cumulativeGenRadii[r - 1];
            let maxBoxWidthForThisGen =
                ((FanChartView.maxAngle / 360) * 2 * Math.PI * prevCumulativeRadius) / numSpotsThisGen;
            // console.log("MAX BOX WIDTH FOR GEN", r, "is", maxBoxWidthForThisGen);
            for (let l = 6; l >= 0; l--) {
                if (numLinesHeights[l] < maxBoxWidthForThisGen) {
                    numLinesInRings[r] = l;
                    break;
                }
            }
        }
        // console.log({ numLinesInRings });
    }

    function updateOuterRimNeeds() {
        let font4Names = FanChartView.currentSettings["general_options_font4Names"];
        let font4Info = FanChartView.currentSettings["general_options_font4Info"];
        let font4Extras = FanChartView.currentSettings["general_options_font4Extras"];
        let maxLineHeight = Math.max(
            fontMetrics[font4Names]["height"],
            fontMetrics[font4Info]["height"],
            fontMetrics[font4Extras]["height"]
        );
        let extraBufferForMarriageText = 0;
        if (FanChartView.currentSettings["date_options_showMarriage"]) {
            extraBufferForMarriageText = fontMetrics[font4Info]["height"] / 2;
        }
        numLinesHeights[0] = 0;
        numLinesHeights[1] = maxLineHeight + extraBufferForMarriageText;
        numLinesHeights[2] = numLinesHeights[1] + maxLineHeight;
        for (let l = 3; l <= 6; l++) {
            numLinesHeights[l] = numLinesHeights[l - 1] + fontMetrics[font4Info]["height"];
        }

        // console.log({ numLinesHeights });
        updateNumLinesInRings();
    }

    FanChartView.updateOuterRimNeeds = updateOuterRimNeeds;

    function calculateFontMetrics() {
        // Create a canvas element
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        var fontNames = {
            SansSerif: "Arial",
            Mono: "Courier New",
            Serif: "Times New Roman",
            Fantasy: "fantasy",
            Script: "cursive",
        };
        const nameDIV = document.getElementById("nameDivFor1");
        let prevFont = FanChartView.currentSettings["general_options_font4Names"];
        const origFont = prevFont;
        for (let font in fontNames) {
            context.font = "18px " + fontNames[font];
            // Measure the text width
            let metrics = context.measureText("m. 28 Aug 1987");
            fontMetrics[font]["mDateWidth"] = Math.ceil(metrics.width);
            if (nameDIV) {
                nameDIV.classList = nameDIV.classList.value.replace(prevFont, font);
                fontMetrics[font]["height"] = nameDIV.clientHeight; //context.measureText("M").actualBoundingBoxAscent;
            }
            //condLog(font, metrics.width, metrics.actualBoundingBoxAscent);
            prevFont = font;
        }
        if (nameDIV) {
            nameDIV.classList = nameDIV.classList.value.replace(prevFont, origFont);
        }
        // Set the font to the context
        // console.log({ fontMetrics }, { context });
        //condLog("Does NAME DIV 1 exist yet?", nameDIV);
    }

    FanChartView.calculateFontMetrics = calculateFontMetrics;

    function getTextWidth(text, font = "16px Arial") {
        // Create a canvas element
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        // Set the font to the context
        context.font = font;

        // Measure the text width
        const metrics = context.measureText(text);
        return metrics.width;
    }

    FanChartView.getTextWidth = getTextWidth;

    function recalculateMaxWidthsForCellsTest() {
        // Need to run this AFTER the wedges have been drawn, so that the widths of the cells are accurate
        condLog(
            "Time to recalculate the max widths for the cells in the Fan Chart",
            "FanChartView.currentScaleFactor;:",
            FanChartView.currentScaleFactor
        );

        let updateNeeded = false;
        // let svg = document.getElementById("fanChartSVG");
        // d3.select(svg).call(FanChartView.zoom.transform, d3.zoomIdentity.scale(1/0.8));
        for (let gen = 0; gen < FanChartView.numGens2Display; gen++) {
            // console.log("GEN " + gen);
            let maxCross = 0;
            let maxRad = 0;
            for (let i = 0; i < 2 ** gen; i++) {
                let ahnNum = 2 ** gen + i;
                let wi = document.getElementById("wedgeInfoFor" + ahnNum);
                if (!wi) {
                    let wb = document.getElementById("wedgeBoxFor" + ahnNum);
                    if (!wb) {
                        // console.log("NO WEDGE BOX FOR: wedgeBoxFor" + ahnNum);
                        continue;
                    }
                    wi = wb;
                }

                let pa = wi.parentNode.parentNode.parentNode;

                // console.log({wi}, {pa});
                let oldTrans = pa.getAttribute("transform");
                let newTrans = oldTrans.replace(/rotat.*/, "");
                pa.setAttribute("transform", newTrans + " rotate(0)");
                let bbox = wi.getBoundingClientRect();
                // let width = wi.clientWidth;// * FanChartView.currentScaleFactor; //bbox.width;
                let width = bbox.width / FanChartView.currentScaleFactor + 20; //bbox.width;
                wi.style.backgroundColor = "Yellow";
                wi.parentNode.parentNode.setAttribute("width", width);
                let height = wi.clientHeight; // * FanChartView.currentScaleFactor; // bbox.height;
                // height = wi.clientHeight;
                if (gen < 5 || (gen == 5 && FanChartView.maxAngle == 360)) {
                    maxCross = Math.max(maxCross, width);
                    maxRad = Math.max(maxRad, height);
                } else {
                    maxCross = Math.max(maxCross, height);
                    maxRad = Math.max(maxRad, width);
                }

                const person = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]];
                if (person) {
                    condLog(ahnNum + " : " + person.getDisplayName(), width, "x", height);
                } else {
                    condLog(ahnNum + " : NO PERSON");
                }
                // pa.setAttribute("transform", oldTrans);
            }
            // maxCross /= FanChartView.currentScaleFactor;
            // maxRad /= FanChartView.currentScaleFactor;
            //condLog("Max Dimensions (NOT adjusted for scaling) for GEN " + gen + " : " + maxCross + " x " + maxRad);
            let newRadius4ThisGen = Math.max(Math.ceil(maxRad), 140) + 20;
            let newCrossSpan4ThisGen = Math.ceil(maxCross) + 10;
            extraRoomNeededForBadges = false;
            if (FanChartView.currentSettings) {
                if (
                    FanChartView.currentSettings["general_options_showBadges"] == true ||
                    (FanChartView.currentSettings["highlight_options_showHighlights"] == true &&
                        (FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" ||
                            FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Highlights") &&
                        FanChartView.currentSettings["highlight_options_highlightBy"].indexOf("DNA") > -1)
                ) {
                    extraRoomNeededForBadges = true;
                    newRadius4ThisGen += 70;
                    maxRad += 35;
                }
            }

            // if (newRadius4ThisGen > fanGenRadii[gen] || Math.abs(newRadius4ThisGen - fanGenRadii[gen]) > 20) {
            //     updateNeeded = true;
            // }
            fanGenRadii[gen] = newRadius4ThisGen;
            if (gen == 0) {
                fanGenRadii[gen] = 0.6 * Math.max(maxCross, maxRad);
            }
            fanGenCrossSpan[gen] = newCrossSpan4ThisGen;
        }
        updateCumulativeWidths();
        // console.log("NEW suggested Radii, CrossSpans: ", { fanGenRadii }, { fanGenCrossSpan }, { cumulativeGenRadii });
        return updateNeeded;
    }

    FanChartView.recalculateTest = recalculateMaxWidthsForCellsTest;

    function recalculateMaxWidthsForCells() {
        // Need to run this AFTER the wedges have been drawn, so that the widths of the cells are accurate
        condLog(
            "Time to recalculate the max widths for the cells in the Fan Chart",
            "FanChartView.currentScaleFactor;:",
            FanChartView.currentScaleFactor
        );
        var fontNames = {
            SansSerif: "Arial",
            Mono: "Courier New",
            Serif: "Times New Roman",
            Fantasy: "fantasy",
            Script: "cursive",
        };
        let font4Names = fontNames[FanChartView.currentSettings["general_options_font4Names"]];
        let font4Info = fontNames[FanChartView.currentSettings["general_options_font4Info"]];

        let updateNeeded = false;
        // let svg = document.getElementById("fanChartSVG");
        // d3.select(svg).call(FanChartView.zoom.transform, d3.zoomIdentity.scale(1/0.8));
        for (let gen = 0; gen < FanChartView.numGens2Display; gen++) {
            // console.log("GEN " + gen);
            let maxCross = 0;
            let maxRad = 0;
            for (let i = 0; i < 2 ** gen; i++) {
                let ahnNum = 2 ** gen + i;
                let wi = document.getElementById("wedgeInfoFor" + ahnNum);
                if (!wi) {
                    let wb = document.getElementById("wedgeBoxFor" + ahnNum);
                    if (!wb) {
                        // console.log("NO WEDGE BOX FOR: wedgeBoxFor" + ahnNum);
                        continue;
                    }
                    wi = wb;
                }

                let pa = wi.parentNode.parentNode.parentNode;

                // console.log({wi}, {pa});
                let oldTrans = pa.getAttribute("transform");
                let newTrans = oldTrans.replace(/rotat.*/, "");
                pa.setAttribute("transform", newTrans + " rotate(0)");
                let bbox = wi.getBoundingClientRect();
                // let width = wi.clientWidth * FanChartView.currentScaleFactor;//bbox.width;
                // let width = bbox.width * FanChartView.currentScaleFactor;//bbox.width;
                let width = bbox.width / FanChartView.currentScaleFactor + 20; //bbox.width;
                let thisNameDiv = document.getElementById("nameDivFor" + ahnNum);
                let thisBDiv = document.getElementById("birthDivFor" + ahnNum);
                let thisDDiv = document.getElementById("deathDivFor" + ahnNum);
                if (thisNameDiv) {
                    width = FanChartView.getTextWidth(thisNameDiv.innerText, "19px " + font4Names);

                    if (thisBDiv) {
                        width = Math.max(width, FanChartView.getTextWidth(thisBDiv.innerText, "18px " + font4Info));
                    }
                    if (thisDDiv) {
                        width = Math.max(width, FanChartView.getTextWidth(thisDDiv.innerText, "18px " + font4Info));
                    }
                }

                // wi.parentNode.parentNode.style.width = width ;
                let height = wi.clientHeight; // * FanChartView.currentScaleFactor; // bbox.height;
                // height = wi.clientHeight;
                if (gen < 5 || (gen == 5 && FanChartView.maxAngle == 360)) {
                    maxCross = Math.max(maxCross, width);
                    maxRad = Math.max(maxRad, height);
                } else {
                    maxCross = Math.max(maxCross, height);
                    maxRad = Math.max(maxRad, width);
                }

                const person = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]];
                if (person) {
                    condLog(ahnNum + " : " + person.getDisplayName(), width, "x", height);
                } else {
                    // console.log(ahnNum + " : NO PERSON");
                }
                pa.setAttribute("transform", oldTrans);
            }
            // maxCross /= FanChartView.currentScaleFactor;
            // maxRad /= FanChartView.currentScaleFactor;
            condLog("Max Dimensions (adjusted for scaling) for GEN " + gen + " : " + maxCross + " x " + maxRad);
            let newRadius4ThisGen = Math.ceil(maxRad) + 20;
            let newCrossSpan4ThisGen = Math.ceil(maxCross) + 10;

            if (
                (gen > 5 || (gen == 5 && FanChartView.maxAngle < 360)) &&
                FanChartView.currentSettings["photo_options_showAllPics"] == true &&
                FanChartView.currentSettings["photo_options_showPicsToN"] == true &&
                gen < FanChartView.currentSettings["photo_options_showPicsToValue"]
            ) {
                newRadius4ThisGen += 50;
            }

            // if (FanChartView.currentSettings) {
            //     if (
            //         FanChartView.currentSettings["general_options_showBadges"] == true ||
            //         (FanChartView.currentSettings["general_options_showBadges"] == true &&
            //             (FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" ||
            //                 FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Highlights"))
            //     ) {
            //         newRadius4ThisGen += 70;
            //         maxRad += 35;
            //     }
            // }

            extraRoomNeededForBadges = false;
            if (FanChartView.currentSettings) {
                if (
                    FanChartView.currentSettings["general_options_showBadges"] == true ||
                    (FanChartView.currentSettings["highlight_options_showHighlights"] == true &&
                        (FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" ||
                            FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Highlights") &&
                        FanChartView.currentSettings["highlight_options_highlightBy"].indexOf("DNA") > -1)
                ) {
                    extraRoomNeededForBadges = true;
                    newRadius4ThisGen += 70;
                    maxRad += 35;
                }
            }

            if (newRadius4ThisGen > fanGenRadii[gen] || Math.abs(newRadius4ThisGen - fanGenRadii[gen]) > 20) {
                updateNeeded = true;
            }
            fanGenRadii[gen] = newRadius4ThisGen;
            if (gen == 0) {
                fanGenRadii[gen] = 0.6 * Math.max(maxCross, maxRad);
            }
            fanGenCrossSpan[gen] = newCrossSpan4ThisGen;
        }
        updateCumulativeWidths();
        // console.log("NEW suggested Radii, CrossSpans: ", { fanGenRadii }, { fanGenCrossSpan }, { cumulativeGenRadii });
        return updateNeeded;
    }

    function recalculateMaxWidthsForCells_AI() {
        // Need to run this AFTER the wedges have been drawn, so that the widths of the cells are accurate
        //condLog(
        //     "Time to recalculate the max widths for the cells in the Fan Chart",
        //     "FanChartView.currentScaleFactor;:",
        //     FanChartView.currentScaleFactor
        // );

        let updateNeeded = false;
        let svg = document.getElementById("fanChartSVG");
        let svgRect = svg.getBoundingClientRect();
        let scaleFactor = FanChartView.currentScaleFactor;

        for (let gen = 0; gen < FanChartView.numGens2Display; gen++) {
            let maxCross = 0;
            let maxRad = 0;
            for (let i = 0; i < 2 ** gen; i++) {
                let ahnNum = 2 ** gen + i;
                let wi = document.getElementById("wedgeInfoFor" + ahnNum);
                if (!wi) {
                    let wb = document.getElementById("wedgeBoxFor" + ahnNum);
                    if (!wb) {
                        continue;
                    }
                    wi = wb;
                }

                let pa = wi.parentNode.parentNode.parentNode;
                let oldTrans = pa.getAttribute("transform");
                let newTrans = oldTrans.replace(/rotat.*/, "");
                pa.setAttribute("transform", newTrans + " rotate(0)");

                let wiRect = wi.getBoundingClientRect();
                let width = ((wiRect.width / svgRect.width) * svg.clientWidth) / scaleFactor;
                let height = ((wiRect.height / svgRect.height) * svg.clientHeight) / scaleFactor;

                if (gen < 5 || (gen == 5 && FanChartView.maxAngle == 360)) {
                    maxCross = Math.max(maxCross, width);
                    maxRad = Math.max(maxRad, height);
                } else {
                    maxCross = Math.max(maxCross, height);
                    maxRad = Math.max(maxRad, width);
                }

                pa.setAttribute("transform", oldTrans);
            }

            condLog("Max Dimensions (adjusted for scaling) for GEN " + gen + " : " + maxCross + " x " + maxRad);
            let newRadius4ThisGen = Math.ceil(maxRad) + 20;
            let newCrossSpan4ThisGen = Math.ceil(maxCross) + 10;

            if (newRadius4ThisGen > fanGenRadii[gen] || Math.abs(newRadius4ThisGen - fanGenRadii[gen]) > 20) {
                updateNeeded = true;
            }
            fanGenRadii[gen] = newRadius4ThisGen;
            if (gen == 0) {
                fanGenRadii[gen] = 0.6 * Math.max(maxCross, maxRad);
            }
            fanGenCrossSpan[gen] = newCrossSpan4ThisGen;
        }
        updateCumulativeWidths();
        condLog("NEW suggested Radii: ", { fanGenRadii });
        return updateNeeded;
    }

    FanChartView.recalcWidsNow = recalculateMaxWidthsForCells;

    FanChartView.showWidsNow = function () {
        console.log("Time to SHOW the WIDS");
        updateCumulativeWidths();
        console.log({ fanGenRadii });
        console.log({ cumulativeGenRadii });
    };

    // Redraw the Wedges if needed for the Fan Chart
    function redoWedgesForFanChart(forceReDoWedges = false) {
        // console.log("TIme to RE-WEDGIFY !", FanChartView.currentSettings);

        minimumRingRadius = fontMetrics[FanChartView.currentSettings["general_options_font4Info"]]["mDateWidth"] + 10;
        //condLog("Minimum Ring Radius:", minimumRingRadius);

        updateCumulativeWidths();
        document.getElementById("ctrCirc").setAttribute("r", fanGenRadii[0]);

        // IF we're using adjustable wedges for each ring of the Fan Chart, then we will want to add a condition about
        // the sizing of the wedge having to be recalculated, which would happen if:
        // 1. the format for Places has changed (longer / shorter / hidden completely or shown suddenly)
        // 2. the setting for Dates changes from Hide / Show to Show / Hide
        // 3. the setting for when to give up on showing full details changes
        //  * DATES:  Hide Dates (*) Never ( ) After Ring 5 ( ) After Ring 10 ( ) After Ring 15 ( ) After Ring 20 ( ) Always
        //  * PLACES: Hide/Shorten Places (*) Never ( ) After Ring 5 ( ) After Ring 10 ( ) After Ring 15 ( ) After Ring 20 ( ) Always

        // MAYBE - since these are all settings based conditions, then these checks should be done in the SettingsChanged function, and then send a forceReDoWedges parameter to this function

        if (
            FanChartView.lastAngle != FanChartView.maxAngle ||
            FanChartView.lastNumGens != FanChartView.numGens2Display ||
            forceReDoWedges == true
        ) {
            // ONLY REDO the WEDGES IFF the maxAngle has changed (360 to 240 to 180 or some combo like that) - OR - if being forced to!
            drawWedgesForFanChart();
        }
    }

    // Draw the wedges for the fan chart
    function drawWedgesForFanChart(g) {
        for (
            let genIndex = (g ? FanChartView.maxNumGens : FanChartView.numGens2Display) - 1;
            genIndex >= 0;
            genIndex--
        ) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                let SVGcode = "";
                if (genIndex <= 1) {
                    // Use a SECTOR for the parents
                    // 3rd parameter is radius of Sector (pointy triangle with curved side opposite centre of circle)
                    // To make Cells more fluid to adjust to size of content, replace calculation of 270 * genIndex with some other calculation

                    // if (index==0){console.log("Gen:", genIndex, "SECTOR (pointy triangle)", index, "R:", cumulativeGenRadii[genIndex]);}
                    SVGcode = SVGfunctions.getSVGforSector(
                        0,
                        0,
                        cumulativeGenRadii[genIndex], // 270 * (genIndex + 0.5),
                        (180 - FanChartView.maxAngle) / 2 + //
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
                    // Use a WEDGE for ancestors further out
                    // 3rd parameter is outer radius of Wedge (more of a curvey sided trapezoid)
                    // 4th paramter is inner radius of Wedge (closer to centre of circle)
                    // like above, replace 270 * genIndex calculations with something else for more fluid FanChart cell sizes
                    if (index == 0) {
                        condLog(
                            "Gen:",
                            genIndex,
                            "WEDGE (trapezoidy)",
                            index,
                            "R1:",
                            cumulativeGenRadii[genIndex - 1],
                            "R2:",
                            cumulativeGenRadii[genIndex],
                            "r:",
                            fanGenRadii[genIndex]
                        );
                    }
                    SVGcode = SVGfunctions.getSVGforWedge(
                        0,
                        0,
                        cumulativeGenRadii[genIndex], //270 * (genIndex + 0.5),
                        cumulativeGenRadii[genIndex - 1], //270 * (genIndex - 0.5),
                        (180 - FanChartView.maxAngle) / 2 + //
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

                if (g) {
                    g.append("path").attrs(SVGcode);
                    // console.log({g});
                    // console.log(g.gPaths);
                    // document.getElementById("gPaths").innerHTML = SVGcode;
                } else {
                    //  condLog(SVGcode.id);
                    d3.select("#" + SVGcode.id).attrs({ d: SVGcode.d, display: "block" }); // CHANGE the drawing commands to adjust the wedge shape ("d"), and make sure the wedge is visible ("display:block")

                    let theWedge = d3.select("#" + SVGcode.id);
                    //  condLog( "theWedge:",theWedge[0][0] );
                }
            }
        }

        // HIDE all the unused Wedges in the outer rims that we don't need yet
        for (let genIndex = FanChartView.maxNumGens - 1; genIndex > FanChartView.numGens2Display - 1; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attrs({ display: "none" });
                let dnaImgX = document.getElementById("imgDNA-x-" + genIndex + "i" + index + "inner");
                let dnaImgY = document.getElementById("imgDNA-y-" + genIndex + "i" + index + "inner");
                let dnaImgMT = document.getElementById("imgDNA-mt-" + genIndex + "i" + index + "inner");
                let dnaImgDs = document.getElementById("imgDNA-Ds-" + genIndex + "i" + index + "inner");
                let dnaImgAs = document.getElementById("imgDNA-As-" + genIndex + "i" + index + "inner");

                if (!g) {
                    // START out by HIDING them all !
                    if (dnaImgX) {
                        showX = false;
                    }
                    if (dnaImgY) {
                        showY = false;
                    }
                    if (dnaImgMT) {
                        showMT = false;
                    }
                    if (dnaImgAs) {
                        showAs = false;
                    }
                    if (dnaImgDs) {
                        showDs = false;
                    }
                }
            }
        }

        if (g) {
            // CREATE a CIRCLE for the Central Person to be drawn on top of
            g.append("circle").attrs({
                "cx": 0,
                "cy": 0,
                "r": fanGenRadii[0],
                "id": "ctrCirc",
                "fill": "white",
                "stroke": "black",
                "stroke-width": "2",
            });
        }

        FanChartView.lastAngle = FanChartView.maxAngle;
        FanChartView.lastNumGens = FanChartView.numGens2Display;
        window.setTimeout(FanChartView.resetView, 0); // use setTimeout to run in async mode so that the browser finishes rendering before calculating the bounding box
    }

    FanChartView.updateLegendIfNeeded = function () {
        // console.log("DOING updateLegendIfNeeded - now", APP_ID);
        let settingForColourBy = FanChartView.currentSettings["colour_options_colourBy"];
        let settingForSpecifyByFamily = FanChartView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = FanChartView.currentSettings["colour_options_specifyByLocation"];
        let legendDIV = document.getElementById("legendDIV");
        let LegendTitle = document.getElementById("LegendTitle");
        let LegendTitleH3 = document.getElementById("LegendTitleH3");
        let innerLegendDIV = document.getElementById("innerLegend");
        let clrSwatchUNK = "";
        let clrSwatchLIVING = "";
        let innerCode = "";
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
        let txtClrSetting = FanChartView.currentSettings["colour_options_textColour"];
        let clrSwatchArray = [];

        let thisTextColourArray = {};
        let thisColourArray = getColourArray();
        // condLog("settingForColourBy", settingForColourBy);
        if (settingForColourBy == "Family" || settingForColourBy == "BioCheck" || settingForColourBy == "DNAstatus") {
            // condLog("TextClrSetting = ", txtClrSetting);
            condLog(thisColourArray.length, thisColourArray);
            let innerCode = "";

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

            //push one more swatch - bright lime - to be used for BioCheck Pass
            clrSwatchArray.push(
                "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "#00FF00" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15 fill='" +
                    "#000000" +
                    "'>A</text></svg>"
            );

            if (settingForColourBy == "Family" && settingForSpecifyByFamily == "age") {
                clrSwatchUNK =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "white" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";
                clrSwatchLIVING =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "lime" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";
                innerCode = clrSwatchUNK + " age unknown <br/>" + clrSwatchLIVING + " still living";
                for (let index = 0; index < 10; index++) {
                    innerCode += "<br/>";
                    innerCode += clrSwatchArray[index + 1] + " " + index * 10 + " - " + (index * 10 + 9);
                }
                innerCode += "<br/>" + clrSwatchArray[11] + " over 100";
            } else if (settingForColourBy == "Family" && settingForSpecifyByFamily == "numSpouses") {
                clrSwatchUNK =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "white" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";
                innerCode = clrSwatchUNK + " unknown <br/>";
                for (let index = 0; index < 5; index++) {
                    innerCode += "<br/>";
                    innerCode += clrSwatchArray[index] + " " + index;
                }
                innerCode += "<br/>" + clrSwatchArray[7] + " over 4";
            } else if (settingForColourBy == "BioCheck") {
                clrSwatchUNK =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "white" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";

                innerCode = clrSwatchUNK + " Bio Check status unknown"; // <br/>" +  clrSwatchLIVING + " still living";

                let BioStatuses = [
                    "No birth nor death dates",
                    "Unsourced",
                    "Style issues",
                    "Bio Check Pass: has sources",
                ];

                for (let index = 0; index < BioStatuses.length; index++) {
                    innerCode += "<br/>";
                    if (index == BioStatuses.length - 1) {
                        innerCode += clrSwatchArray[clrSwatchArray.length - 1] + " " + BioStatuses[index];
                    } else {
                        innerCode += clrSwatchArray[3 * index + 2] + " " + BioStatuses[index];
                    }
                }
                condLog("innerCode:", innerCode);
            } else if (settingForColourBy == "DNAstatus") {
                clrSwatchUNK =
                    "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                    "white" +
                    ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";

                innerCode = clrSwatchUNK + " status unknown"; // <br/>" +  clrSwatchLIVING + " still living";

                let DNAStatuses = ["Confirmed with DNA", "Confident", "Uncertain", "Non-biological"];

                for (let index = 0; index < DNAStatuses.length; index++) {
                    innerCode += "<br/>";
                    // if (index == DNAStatuses.length - 1) {
                    //     innerCode += clrSwatchArray[clrSwatchArray.length - 1] + " " + DNAStatuses[index];
                    // } else {
                    innerCode += clrSwatchArray[3 * index + 1] + " " + DNAStatuses[index];
                    // }
                }
                condLog("innerCode:", innerCode);
            }

            condLog("thisTextColourArray", thisTextColourArray);
            innerLegendDIV.innerHTML = innerCode;
            legendDIV.style.display = "block";
        } else if (settingForColourBy == "Location") {
            // console.log("INSIDE Location IF");
            // thisTextColourArray = {};
            // let thisColourArray = getColourArray();
            let innerCode = "";
            // LET's FIRST setup the ARRAY of UNIQUE LOCATIONS
            uniqueLocationsArray = [];
            for (let index = 1; index < 2 ** FanChartView.numGens2Display; index++) {
                const thisPerp = thePeopleList[FanChartView.myAhnentafel.list[index]];
                // console.log(index, thisPerp, settingForSpecifyByLocation);
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
                        // console.log(thisLoc);
                    }
                }
            }
            let revLocArray = reverseCommaArray(uniqueLocationsArray, true);
            condLog(revLocArray);
            revLocArray.sort();
            uniqueLocationsArray = reverseCommaArray(revLocArray, false);

            clrSwatchUNK =
                "<svg width=20 height=20><rect width=20 height=20 style='fill:" +
                "white" +
                ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=5 y=15>A</text></svg>";

            //     let rgbArray = hslToRgb(255, 1, 0.5);
            // condLog("hslToRgb:", rgbArray );
            // condLog("RGB = ", fractionToHexChar(rgbArray[0]) );
            // condLog("RGB = ", fractionToHexChar(rgbArray[1]) );
            // condLog("RGB = ", fractionToHexChar(rgbArray[2]) );

            innerCode += /* "<br/>" + */ clrSwatchUNK + " unknown";

            for (let index = 0; index < uniqueLocationsArray.length; index++) {
                let hue = Math.round((360 * index) / uniqueLocationsArray.length);
                let sat = 1 - (index % 2) * -0.15;
                let lit = 0.5 + ((index % 7) - 3) * 0.05;
                let thisClr = hslToRGBhex(hue, sat, lit);
                let theTextFontClr = "Black";
                condLog("Compare CLRS: ", thisClr, " vs ", thisColourArray[index]);
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
                condLog("CLR:", hue, sat, lit, thisClr, luminance, theTextFontClr);
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
            condLog(theSortedLocationsArray);
            // condLog("LOCS not sorted we think ...");
            // condLog(uniqueLocationsArray);

            // condLog("LOCS yes SORTED we think ...");
            // condLog(sortedLocs);
            innerLegendDIV.innerHTML = innerCode;
            legendDIV.style.display = "block";
        } else {
            // console.log("NO INNER CODE NEEDED ????");
            innerLegendDIV.innerHTML = "";
            LegendTitle.textContent = "";

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
                condLog("FamTxtClr: Bkgd:", thisColourArray[index], "lum:", luminance, "txt:", theTextFontClr);
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
        if (document.getElementById("legendDIV").style.display == "block") {
            document.getElementById("legendASCII").style.display = "inline-block";
            if (!Utils.firstTreeAppPopUpPopped) {
                $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
                Utils.firstTreeAppPopUpPopped = true;
            }
        }
    };

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
            FanChartView.currentSettings["general_options_font4Names"] == font4Name &&
            FanChartView.currentSettings["general_options_font4Info"] == font4Info &&
            FanChartView.currentSettings["general_options_font4Extras"] == font4Extras
        ) {
            condLog("NOTHING to see HERE in UPDATE FONT land");
        } else {
            condLog(
                "Update Fonts:",
                FanChartView.currentSettings["general_options_font4Names"],
                font4Name,
                FanChartView.currentSettings["general_options_font4Info"],
                font4Info
            );
            condLog(FanChartView.currentSettings);

            font4Name = FanChartView.currentSettings["general_options_font4Names"];
            font4Info = FanChartView.currentSettings["general_options_font4Info"];
            font4Extras = FanChartView.currentSettings["general_options_font4Extras"];

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
            let mDateElements = document.getElementsByClassName("mDateBox");
            for (let e = 0; e < mDateElements.length; e++) {
                const element = mDateElements[e];
                element.classList.remove("fontSerif");
                element.classList.remove("fontSansSerif");
                element.classList.remove("fontMono");
                element.classList.remove("fontFantasy");
                element.classList.remove("fontScript");
                element.classList.add("font" + font4Info);
            }

            let mDate2Elements = document.getElementsByClassName("mDateBox2");
            for (let e = 0; e < mDate2Elements.length; e++) {
                const element = mDate2Elements[e];
                element.classList.remove("fontSerif");
                element.classList.remove("fontSansSerif");
                element.classList.remove("fontMono");
                element.classList.remove("fontFantasy");
                element.classList.remove("fontScript");
                element.classList.add("font" + font4Info);
            }

            let extraElements = document.getElementsByClassName("extraInfoBox");
            for (let e = 0; e < extraElements.length; e++) {
                const element = extraElements[e];
                element.classList.remove("fontSerif");
                element.classList.remove("fontSansSerif");
                element.classList.remove("fontMono");
                element.classList.remove("fontFantasy");
                element.classList.remove("fontScript");
                element.classList.add("font" + font4Extras);
            }
        }
    }

    function updateMyAhentafelMarriages() {
        if (FanChartView.myAhnentafel.marriageList) {
            // OK - no problem - this exists!
        } else {
            FanChartView.myAhnentafel.marriageList = [];
        }

        for (let index in FanChartView.myAhnentafel.list) {
            if (index % 2 == 0 && index > 0) {
                const GuyIndex = index * 1.0;
                const GalIndex = GuyIndex + 1;
                const Guy = FanChartView.myAhnentafel.list[GuyIndex];
                const Gal = FanChartView.myAhnentafel.list[GalIndex];
                let stillLookingForMarriage = true;
                let thisMarriage = "";
                if (Guy && Gal && thePeopleList[Guy] && thePeopleList[Gal] && thePeopleList[Guy]._data.Spouses) {
                    for (
                        let mNum = 0;
                        mNum < thePeopleList[Guy]._data.Spouses.length && stillLookingForMarriage;
                        mNum++
                    ) {
                        thisMarriage = thePeopleList[Guy]._data.Spouses[mNum];
                        if (thisMarriage.Id == Gal) {
                            // HURRAY  - we found it!!!
                            FanChartView.myAhnentafel.marriageList[GuyIndex] = thisMarriage;
                            FanChartView.myAhnentafel.marriageList[GalIndex] = thisMarriage;
                            stillLookingForMarriage = false;
                        }
                    }
                    // thePeopleList[Guy]._data.Spouses;
                }
                condLog(
                    "Marriage from updateMyAhentafelMarriages: #",
                    index,
                    "has",
                    Guy,
                    Gal,
                    thisMarriage.MarriageDate,
                    thisMarriage.MarriageLocation
                );
            }
        }
    }

    /**
     * Update the SVG viewBox based on the content bounding box.
     */
    FanChartView.resetView = function () {
        let svg = document.getElementById("fanChartSVG");
        // return;
        if (svg) {
            let g = svg.firstElementChild;
            let h = 0;
            if (g && g.getBBox) {
                let boundingBox = g.getBBox();
                h = boundingBox.height;
                condLog(boundingBox);
                if (boundingBox) {
                    svg.setAttribute(
                        "viewBox",
                        `${boundingBox.x} ${boundingBox.y} ${boundingBox.width} ${boundingBox.height}`
                    );
                }
            }
            d3.select(svg).call(FanChartView.zoom.transform, d3.zoomIdentity.translate(0, -h * 0.08).scale(0.8));
            condLog("RESETscale factor to ", 0.8);
        }
    };

    /** FUNCTION used to force a redraw of the Fan Chart, used when called from Button Bar after a parameter has been changed */
    FanChartView.redraw = function () {
        condLog("FanChartView.redraw");
        // listStyleRules();
        // condLog(document.styleSheets[0].cssRules);
        // condLog("Now theAncestors = ", FanChartView.theAncestors);
        // thePeopleList.listAll();
        FanChartView.removeBadges();
        FanChartView.removeBadges("DNA");
        recalcAndDisplayNumGens();
        redoWedgesForFanChart();
        FanChartView.myAncestorTree.draw();
        findCategoriesOfAncestors();
        if (recalculateMaxWidthsForCells() == true) {
            condLog("DOING REDRAW again!");
            redoWedgesForFanChart(true);
            FanChartView.myAncestorTree.draw();
            // let's check one more time
            // if (recalculateMaxWidthsForCells() == true) {
            //     condLog("DOING REDRAW again!");
            //     redoWedgesForFanChart(true);
            //     FanChartView.myAncestorTree.draw();
            // }
        }
    };

    FanChartView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };
    FanChartView.hideLegend = function () {
        let theDIV = document.getElementById("legendDIV");
        theDIV.style.display = "none";
    };

    FanChartView.toggleSettings = function () {
        // condLog("TIME to TOGGLE the SETTINGS NOW !!!", FanChartView.fanchartSettingsOptionsObject);
        // condLog(FanChartView.fanchartSettingsOptionsObject.getDefaultOptions());
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
    FanChartView.toggleLegend = function () {
        // condLog("TIME to TOGGLE the SETTINGS NOW !!!", FanChartView.fanchartSettingsOptionsObject);
        // condLog(FanChartView.fanchartSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("legendDIV");
        condLog("SETTINGS ARE:", theDIV.style.display);
        if (!Utils.firstTreeAppPopUpPopped) {
            $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
            Utils.firstTreeAppPopUpPopped = true;
        }
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
            theDIV.style.zIndex = Utils.getNextZLevel();
        } else {
            theDIV.style.display = "none";
        }
    };

    /**
     * Load and display a person
     */
    FanChartView.prototype.load = function (id) {
        condLog("FanChartView.prototype.load - 3175", id);
        var self = this;

        condLog(
            "Total width/height: " +
                screen.width +
                "/" +
                screen.height +
                ", " +
                "Available width/height: " +
                screen.availWidth +
                "/" +
                screen.availHeight +
                ", " +
                "Inner width/height: " +
                window.innerWidth +
                "/" +
                window.innerHeight +
                "\n" +
                "Color depth: " +
                screen.colorDepth +
                ", " +
                "Color resolution: " +
                screen.pixelDepth
        );

        self._load(id).then(function (person) {
            // condLog("FanChartView.prototype.load : self._load(id) ");
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
                    "Creator",
                    "IsMember",
                    "Created",
                    "BirthDateDecade",
                    "DeathDateDecade",
                    "Bio",
                ],
                {
                    ancestors: 5,
                }
            ).then(function (result) {
                FanChartView.theAncestors = result[2];
                let resultByKey = result[1];
                let loadFather = -1;
                let loadMother = -1;

                condLog("ORIGINAL Ancestors:", FanChartView.theAncestors);
                // condLog(result);
                // condLog(resultByKey[id]);
                // condLog(resultByKey[id].Id);
                // condLog(FanChartView.theAncestors[ resultByKey[id].Id ]);

                // condLog("person with which to drawTree:", person);

                // ROUTINE DESIGNED TO LEAPFROG PRIVATE PARENTS AND GRANDPARENTS

                let myUserID = window.wtViewRegistry.session.lm.user.name;

                // for (var ancNum = 0; ancNum < FanChartView.theAncestors.length; ancNum++) {
                for (const ancNum in FanChartView.theAncestors) {
                    let thePerson = FanChartView.theAncestors[ancNum];
                    // condLog("ADDING ", thePerson);
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
                    let canUseThis = theBioPerson.canUse(FanChartView.theAncestors[ancNum], false, true, myUserID);
                    let biography = new Biography(theSourceRules);
                    biography.parse(theBioPerson.getBio(), theBioPerson, "");
                    let hasSources = biography.validate();
                    thePeopleList[theBioPerson.getProfileId()]["biocheck"] = biography;
                    thePeopleList[theBioPerson.getProfileId()]["bioHasSources"] = hasSources;

                    // condLog("ADDED ", thePerson);
                }

                condLog("person:", person);

                if (FanChartView.theAncestors[resultByKey[id].Id] == undefined) {
                    //   condLog("DANGER DANGER, MR. WILLIAM ROBINSON - WE HAVE A VERY PRIVATE ISSUE HERE ...", id);
                    let privatePerson = FanChartView.theAncestors[-1];
                    //   condLog(privatePerson);
                    //   condLog(privatePerson.Id, privatePerson.Mother, privatePerson.Father);
                    //   condLog(document.getElementById("wt-id-text").value);
                    privatePerson["Name"] = document.getElementById("wt-id-text").value;
                    privatePerson["FirstName"] = "Private";
                    privatePerson["LastNameAtBirth"] = "Person";
                    //   privatePerson["Id"] = id;
                    privatePerson["Gender"] = "";

                    if (privatePerson["Father"] && privatePerson["Father"] > 0) {
                        // excellent - a father already exists!
                        loadFather = privatePerson["Father"];
                    } else {
                        privatePerson["Father"] = 102;
                        thePeopleList.add({
                            Id: 102,
                            FirstName: "Private",
                            Name: "Private-102",
                            Gender: "Male",
                            LastNameAtBirth: "Father",
                        });
                    }

                    if (privatePerson["Mother"] && privatePerson["Mother"] > 0) {
                        // excellent - a Mother already exists!
                        loadMother = privatePerson["Mother"];
                    } else {
                        privatePerson["Mother"] = 103;

                        thePeopleList.add({
                            Id: 103,
                            FirstName: "Private",
                            Name: "Private-103",
                            Gender: "Female",
                            LastNameAtBirth: "Mother",
                        });
                    }

                    person._data = privatePerson;
                } else {
                    person._data.Father = FanChartView.theAncestors[id].Father;
                    person._data.Mother = FanChartView.theAncestors[id].Mother;
                }

                // PUT everyone into the Ahnentafel order ... which will include the private TBD! peeps if any
                FanChartView.myAhnentafel.update(person);

                let relativeName = [
                    "kid",
                    "Person",
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
                    let thisPeep = thePeopleList[FanChartView.myAhnentafel.list[a]];
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

                // condLog("ALL PEOPLES WHO ON EARTH DO DWELL:");
                // condLog(thePeopleList);

                updateMyAhentafelMarriages();
                self.drawTree(person);
                calculateFontMetrics();
                clearMessageBelowButtonBar();
                populateXAncestorList(1);
                fillOutFamilyStatsLocsForAncestors();
                if (FanChartView.theAncestors[resultByKey[id].Id] == undefined) {
                    if (document.getElementById("wt-api-login").textContent.indexOf("Logged in") == -1) {
                        showTemporaryMessageBelowButtonBar(
                            "This is a private profile, with private parents. <br/>Log into the APPS server and try again.",
                            8000
                        );
                    } else {
                        showTemporaryMessageBelowButtonBar("This is a private profile, with private parents.", 5000);
                    }

                    if (loadFather > -1 || loadMother > -1) {
                        // condLog("LOADING SOME PARENTS STUFF NOW!");
                        let listOfIDs = [];
                        if (loadFather > -1) {
                            listOfIDs.push(loadFather);
                        }
                        if (loadMother > -1) {
                            listOfIDs.push(loadMother);
                        }

                        WikiTreeAPI.getPeople(
                            // (appId, IDs, fields, options = {})
                            APP_ID,
                            listOfIDs,

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
                                "Creator",
                                "IsMember",
                                "Created",
                                "BirthDateDecade",
                                "DeathDateDecade",
                                "Bio",
                            ],
                            {
                                ancestors: 4,
                            }
                        ).then(function (result2) {
                            FanChartView.theAncestors = result2[2];
                            let resultByKey = result2[1];

                            // condLog(result2);

                            for (const ancNum in FanChartView.theAncestors) {
                                let thePerson = FanChartView.theAncestors[ancNum];
                                // condLog("ADDING ", thePerson);
                                if (thePerson.Id < 0) {
                                    thePerson.Id = 110 - thePerson.Id;
                                    thePerson["Name"] = "Private-" + thePerson.Id;
                                    thePerson["FirstName"] = "Private";
                                    thePerson["LastNameAtBirth"] = "TBD!";
                                }
                                if (thePerson.Mother < 0) {
                                    thePerson.Mother = 110 - thePerson.Mother;
                                }
                                if (thePerson.Father < 0) {
                                    thePerson.Father = 110 - thePerson.Father;
                                }
                                thePeopleList.add(thePerson);
                                // condLog("ADDED ", thePerson);
                            }

                            FanChartView.myAhnentafel.update(person);
                            updateMyAhentafelMarriages();
                            // GO through the first chunk  (up to great-grandparents) - and swap out TBD! for their relaionship names
                            for (var a = 1; a < 16; a++) {
                                let thisPeep = thePeopleList[FanChartView.myAhnentafel.list[a]];
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
                            FanChartView.refreshTheLegend();
                            populateXAncestorList(1);
                            fillOutFamilyStatsLocsForAncestors();

                            // loadBiosNow(listOfIDs);
                            findCategoriesOfAncestors();

                            showTemporaryMessageBelowButtonBar("The central person has a private profile.", 5000);
                        });
                    }
                } else {
                    // loadBiosNow(id);
                    findCategoriesOfAncestors();
                }
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
            FanChartView.theAncestors = result[2];
            condLog("theAncestors:", FanChartView.theAncestors);

            for (const ancNum in FanChartView.theAncestors) {
                let thePerson = FanChartView.theAncestors[ancNum];
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
    FanChartView.prototype.loadMore = function (oldPerson) {
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
    FanChartView.prototype._load = function (id) {
        condLog("INITIAL _load - line:3598", id);
        let thePersonObject = WikiTreeAPI.getPerson(APP_ID, id, [
            "Id",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "FirstName",
            "MiddleInitial",
            "MiddleName",
            "RealName",
            // "Bio",
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
        condLog("_load PersonObj:", thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    FanChartView.prototype.drawTree = function (data) {
        condLog("FanChartView.prototype.drawTree - Good Morning Salt Lake City!");

        if (data) {
            // condLog("(FanChartView.prototype.drawTree WITH data !)");
            this.ancestorTree.data(data);
            // this.descendantTree.data(data);
        }
        this.ancestorTree.draw();
        // this.descendantTree.draw();
        if (recalculateMaxWidthsForCells() == true) {
            condLog("DOING REDRAW again!");
            redoWedgesForFanChart(true);
            FanChartView.myAncestorTree.draw();
            if (recalculateMaxWidthsForCells() == true) {
                condLog("DOING REDRAW again!");
                redoWedgesForFanChart(true);
                FanChartView.myAncestorTree.draw();
            }
        }
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
        // condLog("Tree.prototype.draw");
        if (this.root) {
            // var nodes = thePeopleList.listAllPersons();// [];//this.tree.nodes(this.root);
            var nodes = FanChartView.myAhnentafel.listOfAncestorsForFanChart(FanChartView.numGens2Display); // [];//this.tree.nodes(this.root);

            condLog("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);
            // links = this.tree.links(nodes);
            // this.drawLinks(links);
            FanChartView.updateLegendIfNeeded();
            this.drawNodes(nodes);
            updateDNAlinks(nodes);
            hideMDateDIVs();
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
     * Draw the person boxes.  NodeMagic happens here.
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

        // *********************
        // ADD new nodes
        // *********************
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // condLog("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);

        // *********************
        // Draw the person boxes (part of the ADD routine)
        // *********************
        // * This happens ONCE when a node (person) is created for the first time
        // * It will happen again IF a node has been destroyed (with the exit - remove() command) and then recreated
        // * which happens if you decrease the # of generations (by two) then go back up again
        nodeEnter
            .append("foreignObject")
            .attrs({
                // id: "foreignObj" + ancestorObject.ahnNum,
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
                // Calculate which position # (starting lower left and going clockwise around the fan chart) (0 is father's father's line, largest number is mother's mother's line)
                let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
                // Calculate how many positions there are in this current Ring of Relatives
                let numSpotsThisGen = 2 ** thisGenNum;

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
                condLog("extraInfo setting:", FanChartView.currentSettings["general_options_extraInfo"]);
                if (FanChartView.currentSettings["general_options_extraInfo"] == "ahnNum") {
                    //FanChartView.currentSettings["general_options_colourizeRepeats"] == false) {
                    extraInfoForThisAnc = "[ " + ancestorObject.ahnNum + " ]";
                    extraBR = "<br/>";
                } else if (FanChartView.currentSettings["general_options_extraInfo"] == "WikiTreeID") {
                    extraInfoForThisAnc = ancestorObject.Name;
                    extraBR = "<br/>";
                }
                // DEFAULT STYLE used to be style="background-color: ${borderColor} ;"

                let theClr = "none";

                // SETUP the repeatAncestorTracker
                if (FanChartView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                    condLog(
                        "new repeat ancestor:",
                        FanChartView.myAhnentafel.listByPerson[ancestorObject.person._data.Id]
                    );
                    if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                        theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                    } else {
                        numRepeatAncestors++;
                        theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                        theClr = LightColoursArray[numRepeatAncestors % LightColoursArray.length][1];
                        repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                    }
                }
                // BUT ... if we have colourizeRepeats turned off - ignore theClr ...
                if (FanChartView.currentSettings["general_options_colourizeRepeats"] == false) {
                    theClr = "none";
                }

                // theClr = "orange";

                // condLog(ancestorObject.ahnNum, ancestorObject.person._data.Id, repeatAncestorTracker[ancestorObject.person._data.Id], WebsView.myAhnentafel.listByPerson[ ancestorObject.person._data.Id ]);

                if (thisGenNum >= 9) {
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box staticPosition" style="background-color: ${theClr} ; border:0; padding: 0px;">
                        <div class="name fontBold font${font4Name}"    id=nameDivFor${
                        ancestorObject.ahnNum
                    } style="font-size: 10px;" >${getSettingsName(person)}</div>
                        </div>
                    `;
                } else if (thisGenNum == 8) {
                    let floatDirection = "left";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        floatDirection = "right";
                    }

                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box staticPosition" style="background-color: ${theClr} ; border:0; padding: 0px;">
                        <div class="extraInfoBox  font${font4Extras}"  id=extraInfoFor${
                        ancestorObject.ahnNum
                    }  style="text-align:${floatDirection}; line-height:10px;">${extraInfoForThisAnc}</div>
                        <div class="name fontBold font${font4Name}"   id=nameDivFor${
                        ancestorObject.ahnNum
                    }  style="font-size: 14px;" >${getSettingsName(person)}</div>
                    <div class="birth vital centered font${font4Info}" id=birthDivFor${ancestorObject.ahnNum}></div>
                        </div>
                    `;
                } else if (thisGenNum == 7) {
                    let floatDirection = "left";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        floatDirection = "right";
                    }

                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box staticPosition" style="background-color: ${theClr} ; border:0; padding: 3px;">
                        <div class="extraInfoBox  font${font4Extras}"  id=extraInfoFor${
                        ancestorObject.ahnNum
                    }  style="text-align:${floatDirection}; line-height:10px;">${extraInfoForThisAnc}${extraBR}</div>
                        <div class="name fontBold font${font4Name}"  id=nameDivFor${
                        ancestorObject.ahnNum
                    }>${getSettingsName(person)}</div>
                    <div class="birth vital centered font${font4Info}" id=birthDivFor${
                        ancestorObject.ahnNum
                    }>${lifespanFull(person)}</div>
                    <div class="death vital centered font${font4Info}" id=deathDivFor${ancestorObject.ahnNum}></div>
                        </div>
                    `;
                } else if (thisGenNum == 6) {
                    // console.log("SHOULD be in GEN 6", {thisGenNum},ancestorObject.ahnNum ,  FanChartView.maxAngle);
                    // genNum 6 --> Full dates only + first location field (before ,)
                    let photoUrl = person.getPhotoUrl(75),
                        treeUrl = window.location.pathname + "?id=" + person.getName();

                    // Use generic gender photos if there is not profile photo available
                    //condLog(
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
                    let floatDirection = "left";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        floatDirection = "right";
                    }
                    if (photoUrl) {
                        photoDiv = `<img id=photoFor${ancestorObject.ahnNum} class="image-box" src="https://www.wikitree.com/${photoUrl}" style="float:${floatDirection}; line-height:10px;" />`;
                        // photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center; display:inline-block;"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
                    }

                    let containerClass = "staticPosition photoInfoContainer";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        containerClass += "End";
                    }
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="${containerClass} box" style="background-color: ${theClr} ; border:0;   ">
                        <div class="extraInfoBox  font${font4Extras}"  id=extraInfoFor${
                        ancestorObject.ahnNum
                    } style="text-align:${floatDirection};">${extraInfoForThisAnc}${extraBR}</div>
                        <div class="item">${photoDiv}</div>
                        <div class="item flexGrow1">
                            <div class="name centered fontBold font${font4Name}" id=nameDivFor${ancestorObject.ahnNum}>
                                ${getSettingsName(person)}
                            </div>
                        <div class="birth vital centered font${font4Info}" id=birthDivFor${
                        ancestorObject.ahnNum
                    }>${lifespanFull(person)}</div>
						<div class="death vital centered font${font4Info}" id=deathDivFor${ancestorObject.ahnNum}></div>
                    </div>
                    </div>
                    `;
                } else if (thisGenNum == 5 && FanChartView.maxAngle < 360) {
                    condLog(
                        "SHOULD be in GEN 5 ONLY if < 360º",
                        { thisGenNum },
                        ancestorObject.ahnNum,
                        FanChartView.maxAngle
                    );
                    // genNum 5 ==> Full details (last ring that can hold it, with tweaks needed for 180º)

                    let photoUrl = person.getPhotoUrl(75),
                        treeUrl = window.location.pathname + "?id=" + person.getName();

                    // Use generic gender photos if there is not profile photo available
                    //condLog(
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
                    let floatDirection = "left";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        floatDirection = "right";
                    }
                    let photoDiv = "";
                    if (photoUrl) {
                        photoDiv = `<img id=photoFor${ancestorObject.ahnNum} class="image-box" src="https://www.wikitree.com/${photoUrl}" style="float:${floatDirection}; line-height:10px;" />`;

                        // photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center; display:inline-block;"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
                    }

                    let containerClass = "staticPosition photoInfoContainer";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        containerClass += "End";
                    }
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="${containerClass} box" style="background-color: ${theClr} ; border:0;   ">
                        <div class="extraInfoBox  font${font4Extras}"  id=extraInfoFor${
                        ancestorObject.ahnNum
                    }  style="text-align:${floatDirection};">${extraInfoForThisAnc}${extraBR}</div>
                        <div class="item">${photoDiv}</div>
                        <div class="item flexGrow1">
                            <div class="name centered fontBold font${font4Name}" id=nameDivFor${
                        ancestorObject.ahnNum
                    }>${getSettingsName(person)}</div>
                        <div class="birth vital centered font${font4Info}" id=birthDivFor${
                        ancestorObject.ahnNum
                    }>${getSettingsDateAndPlace(person, "B", thisGenNum)}</div>
						<div class="death vital centered font${font4Info}" id=deathDivFor${ancestorObject.ahnNum}>
                        ${getSettingsDateAndPlace(person, "D", thisGenNum)}</div>
                    </div>
                    </div>
                    `;
                } else if (thisGenNum == 4 || (thisGenNum == 5 && FanChartView.maxAngle == 360)) {
                    condLog(
                        "SHOULD be in GEN 4 - OR - in GEN 5 ONLY if == 360º",
                        { thisGenNum },
                        ancestorObject.ahnNum,
                        FanChartView.maxAngle
                    );
                    let photoUrl = person.getPhotoUrl(75),
                        treeUrl = window.location.pathname + "?id=" + person.getName();

                    // Use generic gender photos if there is not profile photo available
                    //condLog(
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
                    } class="box staticPosition" style="background-color: ${theClr} ; border:0; ">
                    <div class="extraInfoBox  font${font4Extras}"  id=extraInfoFor${
                        ancestorObject.ahnNum
                    }>${extraInfoForThisAnc}${extraBR}</div>
                    ${photoDiv}
                    <div class="name centered fontBold font${font4Name}" id=nameDivFor${
                        ancestorObject.ahnNum
                    }>${getSettingsName(person)}</div>
                        <div class="birth vital centered font${font4Info}" id=birthDivFor${
                        ancestorObject.ahnNum
                    }>${getSettingsDateAndPlace(person, "B")}</div>
						<div class="death vital centered font${font4Info}" id=deathDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(
                        person,
                        "D"
                    )}</div>
                    </div>
                    `;
                } else {
                    let photoUrl = person.getPhotoUrl(75),
                        treeUrl = window.location.pathname + "?id=" + person.getName();

                    let mDateDIV = "";
                    // if (ancestorObject.ahnNum % 2 == 0) {
                    //     mDateDIV =  '<div class="centered mDateBox" id=mDateFor${ancestorObject.ahnNum}>m.<br/>28 Aug<br/>1987</div>';
                    // }
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
                    if (theClr == "none") {
                        theClr = "#00000000";
                    }
                    return `<div class="box staticPosition centered" id=wedgeInfoFor${
                        ancestorObject.ahnNum
                    } style="background-color: ${theClr} ; border:0; ">
                     <div class="extraInfoBox  font${font4Extras}"  id=extraInfoFor${
                        ancestorObject.ahnNum
                    }>${extraInfoForThisAnc}${extraBR}</div>
                     <div class="vital-info">
						${photoDiv}
						  <div class="name centered fontBold font${font4Name}" id=nameDivFor${ancestorObject.ahnNum}>
						    ${getSettingsName(person)}
						  </div>
						  <div class="birth vital centered font${font4Info}" id=birthDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(
                        person,
                        "B"
                    )}</div>
						  <div class="death vital centered font${font4Info}" id=deathDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(
                        person,
                        "D"
                    )}</div>
						</div>
					</div>${mDateDIV}
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
        FanChartView.myAncestorTree = self;

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

            let thisRadius = 270; // default value - NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            thisRadius = fanGenRadii[thisGenNum];
            let thisCrossSpan = fanGenCrossSpan[thisGenNum];
            let thisCumulativeRadius = cumulativeGenRadii[thisGenNum];
            let prevCumulativeRadius = cumulativeGenRadii[thisGenNum - 1];
            if (!prevCumulativeRadius) {
                prevCumulativeRadius = 0;
            }
            // Calculate which position # (starting lower left and going clockwise around the fan chart) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;

            let luminance = 0.501;
            let thisBkgdClr = "white";
            let settingForSpecifyByLocation = FanChartView.currentSettings["colour_options_specifyByLocation"];
            let settingForColourBy = FanChartView.currentSettings["colour_options_colourBy"];
            let theMDateDIV = false; // the marriage date DIV for in between spouses
            let SVGgraphicsDIV = document.getElementById("SVGgraphics");
            let theClr = "";

            // LET'S START WITH COLOURIZING THE WEDGES - IF NEEDED
            if (ancestorObject.ahnNum == 1) {
                let thisPersonsWedge = document.getElementById("ctrCirc");
                if (thisPersonsWedge) {
                    thisPersonsWedge.style.fill = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
                    luminance = calcLuminance(thisPersonsWedge.style.fill);
                    thisBkgdClr = thisPersonsWedge.style.fill;
                }
            } else {
                let thisPersonsWedge = document.getElementById("wedge" + 2 ** thisGenNum + "n" + thisPosNum);
                let theWedgeBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                let theWedgeInfoForBox = document.getElementById("wedgeInfoFor" + ancestorObject.ahnNum);

                // marriage date calc
                if (thisPosNum % 2 == 0) {
                    let mdateIDstarter = "mDateFor-" + ancestorObject.ahnNum;
                    let mdateID = mdateIDstarter + "-date";
                    theMDateDIV = document.getElementById(mdateID);
                    if (theMDateDIV) {
                        condLog("theMDateDIV:", theMDateDIV);
                    } else {
                        let theG = document.getElementById("SVGgraphics");
                        // let theMDateCode = `<g id="${mdateIDstarter}" class="floatAbove"><foreignObject id="${mdateIDstarter + "inner"}" class="centered mDateBox" width:"20px" height:"20px" style="overflow:visible; display:block;"><div id="${mdateIDstarter + "-date"}" class="centered mDateBox">m. 28 Aug 1987</div></foreignObject></g>`;
                        let theMDateCode = `<foreignObject id="${
                            mdateIDstarter + "inner"
                        }" class="centered mDateBox" width:"20px" height:"20px" style="overflow:visible; display:block;"><div id="${
                            mdateIDstarter + "-date"
                        }" class="centered mDateBox">m. 28 Aug 1987</div></foreignObject>`;
                        condLog(theMDateCode);
                        if (theG) {
                            // theG.innerHTML += theMDateCode;
                            // theMDateDIV = document.getElementById(mdateID);
                            // console.log(theG);
                        }
                    }
                }
                if (thisPersonsWedge) {
                    thisPersonsWedge.style.fill = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
                    thisBkgdClr = thisPersonsWedge.style.fill;
                    // console.log({thisBkgdClr});
                    // if (thisGenNum % 2 == 0) {
                    //     if (thisPosNum % 2 == 0) {
                    //         thisBkgdClr = "orange";
                    //     } else {
                    //         thisBkgdClr = "lime";
                    //     }
                    // } else {
                    //        if (thisPosNum % 2 == 0) {
                    //            thisBkgdClr = "magenta";
                    //        } else {
                    //            thisBkgdClr = "cyan";
                    //        }
                    // }
                    // // thisBkgdClr = "#FFFFFF00";
                    // thisPersonsWedge.style.fill = thisBkgdClr;
                } else {
                    condLog("Can't find: ", "wedge" + 2 ** thisGenNum + "n" + thisPosNum);
                }
                if (theWedgeBox) {
                    if (settingForColourBy == "Location" && settingForSpecifyByLocation == "BirthDeathCountry") {
                        let locString = ancestorObject.person._data["BirthCountry"];
                        let clrIndex = theSortedLocationsArray.indexOf(locString);
                        theClr = getColourFromSortedLocationsIndex(clrIndex);

                        // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        theWedgeBox.style.backgroundColor = theClr;

                        // condLog(
                        //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                        //     theClr
                        // );
                    } else if (settingForColourBy == "Location" && settingForSpecifyByLocation == "DeathBirthCountry") {
                        let locString = ancestorObject.person._data["DeathCountry"];
                        let clrIndex = theSortedLocationsArray.indexOf(locString);
                        theClr = getColourFromSortedLocationsIndex(clrIndex);

                        // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        theWedgeBox.style.backgroundColor = theClr;

                        // condLog(
                        //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                        //     theClr
                        // );
                    } else if (
                        FanChartView.currentSettings["general_options_colourizeRepeats"] == true &&
                        repeatAncestorTracker[ancestorObject.person._data.Id]
                    ) {
                        theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        theWedgeBox.style.backgroundColor = theClr;

                        // condLog(
                        //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                        //     theClr
                        // );
                    } else {
                        theWedgeBox.style.backgroundColor = getBackgroundColourFor(
                            thisGenNum,
                            thisPosNum,
                            ancestorObject.ahnNum
                        );
                        // condLog(
                        //     "in Transform -> NO COLOUR for ancestor ",
                        //     ancestorObject.ahnNum,
                        //     theWedgeBox.style.background
                        // );
                    }
                    thisBkgdClr = theWedgeBox.style.backgroundColor;
                    condLog("theWedgeBox.style.backgroundColor = ", theWedgeBox.style.backgroundColor);
                    luminance = calcLuminance(theWedgeBox.style.backgroundColor);

                    condLog("LUMINANCE:", luminance);
                    //  theWedgeBox.style.background = 'orange'; // TEMPORARY ONLY WHILE DOING SOME PLACEMENT RECON
                    // theWedgeBox.style.backgroundColor = "yellow";
                } else if (theWedgeInfoForBox) {
                    if (settingForColourBy == "Location" && settingForSpecifyByLocation == "BirthDeathCountry") {
                        let locString = ancestorObject.person._data["BirthCountry"];
                        let clrIndex = theSortedLocationsArray.indexOf(locString);
                        theClr = getColourFromSortedLocationsIndex(clrIndex);

                        // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        theWedgeInfoForBox.style.backgroundColor = theClr;

                        // condLog(
                        //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                        //     theClr
                        // );
                        thisBkgdClr - theClr;
                    } else if (settingForColourBy == "Location" && settingForSpecifyByLocation == "DeathBirthCountry") {
                        let locString = ancestorObject.person._data["DeathCountry"];
                        let clrIndex = theSortedLocationsArray.indexOf(locString);
                        theClr = getColourFromSortedLocationsIndex(clrIndex);

                        // theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        theWedgeInfoForBox.style.backgroundColor = theClr;

                        // condLog(
                        //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                        //     theClr
                        // );
                        thisBkgdClr - theClr;
                    } else if (
                        FanChartView.currentSettings["general_options_colourizeRepeats"] == true &&
                        repeatAncestorTracker[ancestorObject.person._data.Id]
                    ) {
                        theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        theWedgeInfoForBox.style.backgroundColor = theClr;

                        // condLog(
                        //     "in Transform -> theClr for repeat ancestor " + ancestorObject.ahnNum + ":",
                        //     theClr
                        // );
                        thisBkgdClr - theClr;
                    } else {
                        thisBkgdClr = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
                        // condLog(
                        //     "in Transform -> NO COLOUR for ancestor ",
                        //     ancestorObject.ahnNum,
                        //     theWedgeBox.style.background
                        // );
                        theWedgeInfoForBox.style.backgroundColor = "#00000000"; // make it invisible - will not mess up the Print to PDF - AND - will avoid the overlapping edges you get in the inner portions
                    }
                    luminance = calcLuminance(thisBkgdClr);
                    condLog("We are in WEDGE INFO FOR box territory - font for ???", thisBkgdClr, luminance);
                    // condLog("theWedgeBox.style.backgroundColor = ", theWedgeBox.style.backgroundColor);
                }
            }

            // NEXT - LET'S DO SOME POSITIONING TO GET EVERYONE IN PLACE !
            let theInfoBox = document.getElementById("wedgeInfoFor" + ancestorObject.ahnNum);
            let theNameDIV = document.getElementById("nameDivFor" + ancestorObject.ahnNum);

            let doDebug = false;
            if (ancestorObject.ahnNum == 40) {
                doDebug = true;
            }
            if (doDebug) {
                console.log(
                    "POSITION node ",
                    ancestorObject.ahnNum,
                    { thisGenNum },
                    { thisRadius },
                    { prevCumulativeRadius },
                    { thisCumulativeRadius },
                    { fanGenRadii },
                    { cumulativeGenRadii }
                );
            }
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
            let txtClrSetting = FanChartView.currentSettings["colour_options_textColour"];
            condLog("TextClrSetting = ", txtClrSetting);
            let theTextFontClr = "fontBlack";
            if (txtClrSetting == "B&W") {
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
            condLog(
                "theTextFontClr:",
                theTextFontClr,
                "for",
                ancestorObject.person._data["FirstName"],
                "thisBkgdClr",
                thisBkgdClr
            );
            switchFontColour(theNameDIV, theTextFontClr);

            if (theInfoBox) {
                // let theBounds = theInfoBox; //.getBBox();
                // condLog("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                theNameDIV.innerHTML = getSettingsName(d);
                theInfoBox.parentNode.parentNode.setAttribute("y", 15 - thisRadius / 2); // - 100);

                let maxBoxWidthForThisGen = 250;
                let crossSpanToUse = maxBoxWidthForThisGen;
                if (thisGenNum > 0) {
                    maxBoxWidthForThisGen =
                        ((FanChartView.maxAngle / 360) * 2 * Math.PI * prevCumulativeRadius) / numSpotsThisGen;
                    if (thisGenNum > 5) {
                        maxBoxWidthForThisGen = thisRadius;
                        crossSpanToUse = thisCrossSpan;
                    } else {
                        crossSpanToUse = maxBoxWidthForThisGen;
                    }
                }

                theInfoBox.parentNode.parentNode.setAttribute("x", 0 - crossSpanToUse / 2);
                theInfoBox.parentNode.parentNode.setAttribute("width", maxBoxWidthForThisGen);

                // console.log("Set ", ancestorObject.ahnNum, " to ", maxBoxWidthForThisGen, {thisGenNum}, {prevCumulativeRadius}, {numSpotsThisGen});
                /* if (ancestorObject.ahnNum == 1) {
                    // condLog("BOUNDS for Central Perp: ", theInfoBox.getBoundingClientRect() );
                    // theInfoBox.parentNode.parentNode.setAttribute("y", -120);
                    theInfoBox.parentNode.parentNode.setAttribute("x", -125);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 250);
                } else if (ancestorObject.ahnNum > 7) {
                    // condLog(FanChartView.maxAngle,"º - G3 - ahnNum #", ancestorObject.ahnNum, FanChartView.maxAngle);

                    if (FanChartView.maxAngle == 180) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -140);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 280);
                    } else if (FanChartView.maxAngle == 240) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -160);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 320);
                    } else if (FanChartView.maxAngle == 360) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -180);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 360);
                    }
                } else if (thisGenNum == 1 && FanChartView.maxAngle == 180) {
                    theInfoBox.parentNode.parentNode.setAttribute("x", -160);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 320);
                } */
                //  theInfoBox.style.backgroundColor = "orange";
            } else {
                theNameDIV.innerHTML = getSettingsName(d); //getShortName(d);
                theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);

                let maxBoxWidthForThisGen = 250;
                let crossSpanToUse = maxBoxWidthForThisGen;

                if (thisGenNum > 0) {
                    maxBoxWidthForThisGen =
                        ((FanChartView.maxAngle / 360) * 2 * Math.PI * prevCumulativeRadius) / numSpotsThisGen;
                    if (thisGenNum > 5 || (thisGenNum == 5 && FanChartView.maxAngle < 360)) {
                        maxBoxWidthForThisGen = thisRadius - 10;
                        crossSpanToUse = thisRadius - 10; //thisCrossSpan;
                    } else {
                        crossSpanToUse = maxBoxWidthForThisGen;
                    }
                }

                theInfoBox.parentNode.parentNode.setAttribute("x", 0 - crossSpanToUse / 2);
                theInfoBox.parentNode.parentNode.setAttribute("width", maxBoxWidthForThisGen);

                if (doDebug) {
                    console.log(
                        "ADJUST node ",

                        { maxBoxWidthForThisGen },
                        { crossSpanToUse }
                    );
                }

                // theInfoBox.parentNode.parentNode.setAttribute("width", 266);
                // theInfoBox.parentNode.parentNode.setAttribute("x", -133);

                let mDateDIVdate = null; // document.getElementById("mDateFor-" + ancestorObject.ahnNum + "-date");
                let mDateDIVinner = null; // document.getElementById("mDateFor-" + ancestorObject.ahnNum + "-date");

                if (thisGenNum >= 5 && ancestorObject.ahnNum % 2 == 0) {
                    // condLog("mDateDIVdate:", mDateDIVdate);
                    mDateDIVdate = document.getElementById("mDateFor-" + ancestorObject.ahnNum + "-date");
                    mDateDIVinner = document.getElementById("mDateFor-" + ancestorObject.ahnNum + "inner");
                }
                if (thisGenNum == 5 && FanChartView.maxAngle == 360) {
                    theInfoBox.classList.remove("photoInfoContainer");
                    theInfoBox.classList.remove("photoInfoContainerEnd");

                    if (mDateDIVdate) {
                        mDateDIVdate.classList.remove("mDateBox2");
                        mDateDIVdate.classList.add("mDateBox");
                        mDateDIVinner.classList.remove("mDateBox2");
                        mDateDIVinner.classList.add("mDateBox");
                        mDateDIVdate.style.width = "55px";
                    }
                    // console.log("Removed ?", {thisGenNum}, ancestorObject.ahnNum,FanChartView.maxAngle ,  theInfoBox.classList.value);
                } else if (thisGenNum == 5 && FanChartView.maxAngle < 360) {
                    theInfoBox.style.backgroundColor = "#FFFFFF00";
                    theInfoBox.classList.add("photoInfoContainer");
                    if (mDateDIVdate) {
                        mDateDIVdate.classList.remove("mDateBox");
                        mDateDIVdate.classList.add("mDateBox2");
                        mDateDIVinner.classList.remove("mDateBox");
                        mDateDIVdate.style.width = minimumRingRadius - 5 + "px";
                        // mDateDIVinner.classList.add("mDateBox2"); // don't want to really add mDateBox2 to foreignObject (mDateDIVinner) - because it leaves a double line
                    }
                    // console.log("Added ?", {thisGenNum}, ancestorObject.ahnNum, FanChartView.maxAngle , theInfoBox.classList.value);
                } else if (thisGenNum > 5) {
                    theInfoBox.style.backgroundColor = "#FFFFFF00";
                    if (mDateDIVdate) {
                        mDateDIVdate.style.width = minimumRingRadius - 5 + "px";
                    }
                }

                theInfoBox.classList.remove("photoInfoContainer");
                theInfoBox.classList.remove("photoInfoContainerEnd");

                if (thisGenNum == 4 || (thisGenNum == 5 && FanChartView.maxAngle == 360)) {
                    // ORIENTATION for this rim is still "regular" - horizontal-ish

                    theInfoBox.parentNode.parentNode.setAttribute("y", 15 - thisRadius / 2); // - 100);
                    // condLog(FanChartView.maxAngle, "º - G4 - ahnNum #", ancestorObject.ahnNum, FanChartView.maxAngle);
                    /* if (FanChartView.maxAngle == 180) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -85);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 170);
                    } else if (FanChartView.maxAngle == 240) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -120);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 240);
                    } else if (FanChartView.maxAngle == 360) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -170);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 340);
                    } */
                } else {
                    // ORIENTATION for this rim is still "sideways" - vertical-ish, so width of box == radius
                    theInfoBox.parentNode.parentNode.setAttribute("y", 0 - theInfoBox.clientHeight / 2); // - 100);
                    // theInfoBox.parentNode.parentNode.setAttribute("x", 0 - fanGenCrossSpan[thisGenNum] / 2);
                    // theInfoBox.parentNode.parentNode.setAttribute("width", fanGenCrossSpan[thisGenNum] - 6);
                    if (theInfoBox.clientHeight > fanGenCrossSpan[thisGenNum]) {
                        theInfoBox.style.backgroundColor = "yellow";
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
            if (thisGenNum > 5 || (thisGenNum > 4 && FanChartView.maxAngle < 360)) {
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
                if (thisGenNum >= 6) {
                    // let fontRadii = { 6: 25, 7: 9, 8: 14, 9: 17 };
                    // let fontRadius = fontRadii[thisGenNum];
                    // if (thisGenNum == 6 && FanChartView.maxAngle == 360) {
                    //     fontRadius = 0;
                    // } else if (thisGenNum == 7 && FanChartView.maxAngle == 240) {
                    //     fontRadius = 0;
                    // } else if (thisGenNum == 7 && FanChartView.maxAngle == 360) {
                    //     fontRadius = -10;
                    // } else if (thisGenNum == 8 && FanChartView.maxAngle == 360) {
                    //     fontRadius = 0;
                    // }
                    let fontRadius =
                        0 * 1.5 * fontMetrics[FanChartView.currentSettings["general_options_font4Extras"]]["height"];
                    let tweakAngle = (Math.atan(fontRadius / thisCumulativeRadius) * 180) / Math.PI;
                    //condLog("Gen",thisGenNum, "TweakAngle = ",tweakAngle);
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
                !photoUrl &&
                FanChartView.currentSettings["photo_options_useSilhouette"] == true &&
                FanChartView.currentSettings["photo_options_showAllPics"] == true &&
                (FanChartView.currentSettings["photo_options_showPicsToN"] == false ||
                    (FanChartView.currentSettings["photo_options_showPicsToN"] == true &&
                        thisGenNum < FanChartView.currentSettings["photo_options_showPicsToValue"]))
            ) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV) {
                    thePhotoDIV.style.display = "inline-block";
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
            } else if (ancestorObject.ahnNum > 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);

                if (thePhotoDIV && FanChartView.currentSettings["photo_options_showAllPics"] == true) {
                    // Check to see if there are restrictions
                    if (FanChartView.currentSettings["photo_options_showPicsToN"] == false) {
                        // show All Pics - no restrictions
                        thePhotoDIV.style.display = "inline-block";
                    } else {
                        // ONLY show Pics up to a certain Generation #
                        if (thisGenNum < FanChartView.currentSettings["photo_options_showPicsToValue"]) {
                            thePhotoDIV.style.display = "inline-block";
                        } else {
                            thePhotoDIV.style.display = "none";
                        }
                    }
                } else if (thePhotoDIV && FanChartView.currentSettings["photo_options_showAllPics"] == false) {
                    thePhotoDIV.style.display = "none";
                }
            }

            let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
            if (thePhotoDIV && thePhotoDIV.style.display == "inline-block") {
                let theWedgeBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                if (theWedgeBox) {
                    theWedgeBox.style["vertical-align"] = "top";
                }
                if (thisGenNum == 6 && FanChartView.maxAngle < 360) {
                    if (FanChartView.maxAngle == 180) {
                        thePhotoDIV.style.height = "50px";
                    } else {
                        thePhotoDIV.style.height = "60px";
                    }
                } else if (thisGenNum == 5 || (thisGenNum == 6 && FanChartView.maxAngle == 360)) {
                    // let theWedgeBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                    // theWedgeBox.style["vertical-align"] = "top";
                    thePhotoDIV.style.height = "65px";
                } else if (thisGenNum == 4) {
                    if (FanChartView.maxAngle == 180) {
                        thePhotoDIV.style.height = "70px";
                    } else {
                        thePhotoDIV.style.height = "80px";
                    }
                } else if (thisGenNum == 3) {
                    if (FanChartView.maxAngle == 180) {
                        thePhotoDIV.style.height = "80px";
                    } else {
                        thePhotoDIV.style.height = "85px";
                    }
                } else if (thisGenNum == 2) {
                    thePhotoDIV.style.height = "95px";
                }

                if (thisGenNum == 5 && FanChartView.maxAngle == 360) {
                    thePhotoDIV.style.float = "";
                } else if (thisGenNum == 5 && FanChartView.maxAngle < 360) {
                    if (thisPosNum < numSpotsThisGen / 2) {
                        thePhotoDIV.style.float = "left";
                    } else {
                        thePhotoDIV.style.float = "right";
                    }
                }
            }

            if (ancestorObject.ahnNum == 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV && FanChartView.currentSettings["photo_options_showCentralPic"] == true) {
                    if (!photoUrl && FanChartView.currentSettings["photo_options_useSilhouette"] == false) {
                        thePhotoDIV.style.display = "none";
                        theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    } else if (
                        !photoUrl &&
                        FanChartView.currentSettings["photo_options_useSilhouette"] == true &&
                        d._data.Gender == ""
                    ) {
                        thePhotoDIV.style.display = "none";
                        theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    } else {
                        thePhotoDIV.style.display = "inline-block";
                    }
                } else if (thePhotoDIV && FanChartView.currentSettings["photo_options_showCentralPic"] == false) {
                    thePhotoDIV.style.display = "none";
                    // theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    // condLog("ADJUSTING the CENTRAL PERSON INFO without PIC downwards, i hope");
                }
            } else if (thePhotoDIV && thePhotoDIV.style.display == "none" && theInfoBox) {
                // theInfoBox.parentNode.parentNode.setAttribute("y", -60);
            }

            // AND ... FINALLY, LET'S TALK DATES & PLACES:
            // e.g.  <div class="birth vital centered" id=birthDivFor${ancestorObject.ahnNum}>${getSettingsDateAndPlace(person, "B")}</div>
            let theBirthDIV = document.getElementById("birthDivFor" + ancestorObject.ahnNum);
            if (theBirthDIV) {
                theBirthDIV.innerHTML = getSettingsDateAndPlace(d, "B", thisGenNum); // remember that d = ancestorObject.person
                switchFontColour(theBirthDIV, theTextFontClr);
            }
            let theDeathDIV = document.getElementById("deathDivFor" + ancestorObject.ahnNum);
            if (theDeathDIV) {
                theDeathDIV.innerHTML = getSettingsDateAndPlace(d, "D", thisGenNum); // remember that d = ancestorObject.person
                switchFontColour(theDeathDIV, theTextFontClr);
            }

            // HERE we get to use some COOL TRIGONOMETRY to place the X,Y position of the name card using basically ( rCOS(ø), rSIN(ø) )  --> see that grade 11 trig math class paid off after all!!!
            let newX =
                ((thisCumulativeRadius + prevCumulativeRadius) / 2 - (extraRoomNeededForBadges ? 35 : 0)) *
                Math.cos((placementAngle * Math.PI) / 180);
            let newY =
                ((thisCumulativeRadius + prevCumulativeRadius) / 2 - (extraRoomNeededForBadges ? 35 : 0)) *
                Math.sin((placementAngle * Math.PI) / 180);

            // OK - now that we know where the centre of the universe is ... let's throw those DNA symbols into play !
            showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle);
            // AND the stickers !
            showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle);
            // FanChartView.addNewBadge(newX, newY, thisGenNum,  nameAngle);

            // LET'S UPDATE THOSE EXTRAS TOO ... OK ?
            let theExtraDIV = document.getElementById("extraInfoFor" + ancestorObject.ahnNum);
            let extraInfoForThisAnc = "";
            let extraBR = "";
            condLog("extraInfo setting:", FanChartView.currentSettings["general_options_extraInfo"]);
            if (FanChartView.currentSettings["general_options_extraInfo"] == "ahnNum") {
                //FanChartView.currentSettings["general_options_colourizeRepeats"] == false) {
                extraInfoForThisAnc = "[ " + ancestorObject.ahnNum + " ]";
                extraBR = "<br/>";
            } else if (FanChartView.currentSettings["general_options_extraInfo"] == "WikiTreeID") {
                extraInfoForThisAnc = d._data.Name;
                extraBR = "<br/>";
            }
            if (theExtraDIV) {
                theExtraDIV.innerHTML = extraInfoForThisAnc + extraBR;
                theExtraDIV.className = "extraInfoBox font" + font4Extras;
            }

            if (thisGenNum == 5 && FanChartView.maxAngle == 360) {
                theExtraDIV.style.textAlign = "center";
            } else if (thisGenNum == 5 && FanChartView.maxAngle < 360) {
                if (thisPosNum < numSpotsThisGen / 2) {
                    theExtraDIV.style.textAlign = "left";
                } else {
                    theExtraDIV.style.textAlign = "right";
                }
            }

            if (theMDateDIV) {
                // condLog("Marriage", d._data.Spouses);
                let mDateAngle = nameAngle + FanChartView.maxAngle / 2 / numSpotsThisGen;

                let dGenNum = 0; // variable that should be 0 if marriage date is in the middle of the cell, but a percentage if it's shifted to the top (for gens <= 5)

                const dateScaleFactor = 1.0;
                let mDateRadius = (thisCumulativeRadius + prevCumulativeRadius) / 2 + 25;
                if (FanChartView.currentSettings["date_options_marriageAtTopEarlyGens"] == true) {
                    mDateRadius = thisCumulativeRadius - 10;
                }
                let tweakAngle = (Math.atan(30 / mDateRadius) * 180) / Math.PI;

                let mDateX = dateScaleFactor * mDateRadius * Math.cos(((mDateAngle - tweakAngle - 90) * Math.PI) / 180);
                let mDateY = dateScaleFactor * mDateRadius * Math.sin(((mDateAngle - tweakAngle - 90) * Math.PI) / 180);
                if (ancestorObject.ahnNum >= 64 || (ancestorObject.ahnNum >= 32 && FanChartView.maxAngle < 360)) {
                    tweakAngle = (Math.atan(10 / (thisGenNum * thisRadius)) * 180) / Math.PI;
                    let mDateRadius = (thisCumulativeRadius + prevCumulativeRadius) / 2 + 70;
                    if (thisPosNum < numSpotsThisGen / 2) {
                        mDateX =
                            dateScaleFactor *
                            // (thisGenNum * thisRadius + 60) *
                            mDateRadius *
                            Math.cos(((mDateAngle - 180 + tweakAngle) * Math.PI) / 180);
                        mDateY =
                            dateScaleFactor *
                            // (thisGenNum * thisRadius + 60) *
                            mDateRadius *
                            Math.sin(((mDateAngle - 180 + tweakAngle) * Math.PI) / 180);
                    } else {
                        mDateX =
                            dateScaleFactor *
                            (mDateRadius - 140) *
                            // (thisGenNum * thisRadius - 60) *
                            Math.cos(((mDateAngle - tweakAngle - 0) * Math.PI) / 180);
                        mDateY =
                            dateScaleFactor *
                            (mDateRadius - 140) *
                            // (thisGenNum * thisRadius - 60) *
                            Math.sin(((mDateAngle - tweakAngle - 0) * Math.PI) / 180);
                    }
                } else {
                    // console.log( ancestorObject.ahnNum, "mDateAngle", { tweakAngle }, mDateAngle);
                }
                let dateStyle = "Full";
                if (
                    FanChartView.currentSettings["date_options_showMarriage"] == false ||
                    FanChartView.currentSettings["date_options_dateTypes"] == "none" ||
                    thisGenNum >= 8 ||
                    (FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum] &&
                        FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate &&
                        FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate == "0000-00-00")
                ) {
                    theMDateDIV.parentNode.style.display = "none";
                } else {
                    if (
                        FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum] &&
                        FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate
                    ) {
                        condLog(
                            "mDateDIV display:",
                            theMDateDIV.parentNode.style.display,
                            FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate
                        );
                        theMDateDIV.parentNode.style.display = "block";

                        if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan") {
                            dateStyle = "YYYY";
                        }
                        let mDotBreak = "m.<br/>";
                        if (
                            ancestorObject.ahnNum >= 64 ||
                            (ancestorObject.ahnNum >= 32 && FanChartView.maxAngle < 360)
                        ) {
                            mDotBreak = " m. ";
                            // if (thisPosNum < numSpotsThisGen / 2) {
                            //     mDateAngle == 90;
                            // } else {
                            //     mDateAngle += 90;
                            // }
                        }
                        theMDateDIV.innerHTML =
                            mDotBreak +
                            getCleanDateString(
                                FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate,
                                dateStyle
                            ).replace(",", " ") +
                            (ancestorObject.ahnNum >= 64 || (ancestorObject.ahnNum >= 32 && FanChartView.maxAngle < 360)
                                ? " "
                                : "");
                        // .replace(/\-/g, " "); // On second thought - leave the dashes in, if that's the format chosen

                        theMDateDIV.parentNode.parentNode.style.transform =
                            "translate(" + mDateX + "px," + mDateY + "px)" + " " + "rotate(" + mDateAngle + "deg)";
                        if (FanChartView.currentSettings["date_options_marriageBlend"] == true) {
                            theMDateDIV.style.backgroundColor = thisBkgdClr;
                        } else {
                            theMDateDIV.style.backgroundColor = "White";
                        }

                        // theMDateDIV.parentNode.style.display = "none";

                        SVGgraphicsDIV.append(theMDateDIV.parentNode.parentNode); // move the MDateDiv to the end of the line  - basically putting it on the top of the stack to be most visible by everybody!
                    } else {
                        theMDateDIV.parentNode.style.display = "none";
                    }
                }
            }
            // FINALLY ... we return the transformation statement back - the translation based on our Trig calculations, and the rotation based on the nameAngle
            return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
    };

    FanChartView.extraRoomNeededForBadgesDisplay = function () {
        console.log({ extraRoomNeededForBadges });
    };

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
        let rgbClrs = [80, 80, 80];
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
        // condLog("calcLuminance: ", initBkgdClr);
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
                    condLog("FOUND ", element);
                    wasFound = true;
                    rgbClrs = hex2array(element[2]);
                    break;
                }
            }
            if (!wasFound) {
                condLog("FOUND - COULD NOT FIND COLOUR:", initBkgdClr);
                rgbClrs = [40, 40, 40];
            }
        }
        let luminance =
            0.2126 * clrComponentValue(1.0 * rgbClrs[0]) +
            0.7152 * clrComponentValue(1.0 * rgbClrs[1]) +
            0.0722 * clrComponentValue(1.0 * rgbClrs[2]);

        return luminance;
    }

    /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup = function (person) {
        // console.log("POP UP : person = ",person);
        // console.log({ firstFanChartPopUpPopped });
        // console.log("Utils.firstTreeAppPopUpPopped", Utils.firstTreeAppPopUpPopped);
        if (!Utils.firstTreeAppPopUpPopped) {
            $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
            Utils.firstTreeAppPopUpPopped = true;
        }
        personPopup.popupHTML(person, {
            type: "Ahn",
            ahNum: FanChartView.myAhnentafel.listByPerson[person._data.Id],
            primaryPerson: thePeopleList[FanChartView.myAhnentafel.list[1]],
            myAhnentafel: FanChartView.myAhnentafel,
            SettingsObj: Utils,
        });
        // console.log("FanChartView.personPopup");
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

        let fandokuLink = "";

        if (person._data.Id == FanChartView.myAhnentafel.list[1]) {
            // condLog("FOUND THE PRIMARY PERP!");
            // if (FanChartView.showFandokuLink == "YES"){
            fandokuLink = `<span class="tree-links"><button onclick=location.assign("https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/#name=${person.getName()}&view=fandoku"); style="padding:2px;">Play FanDoku</button></span>`;
            // }
        } else {
            // condLog("Popup a poopy peep");
        }

        let bioCheckLink = `<A target=_blank href="https://apps.wikitree.com/apps/sands1865/biocheck/?action=checkProfile&numAncestorGen=0&numDescendantGen=0&checkStart=auto&profileId=${person.getName()}">Bio Check</A>`;

        let bbWidth = screen.innerWidth;
        let SVGx = 0;
        let svg = document.getElementById("fanChartSVG");
        let boundingBox = { width: 100, height: 100, x: 0, y: 0 };
        // return;
        if (svg) {
            let g = svg.firstElementChild;
            if (g && g.getBBox) {
                boundingBox = g.getBBox();
                bbWidth = boundingBox.width;
                condLog(boundingBox, g, svg);
                condLog(g.transform.animVal[0].matrix.e);
                SVGx = g.transform.animVal[0].matrix.e;
            }
        }

        let Zfactor = bbWidth / window.innerWidth; // scale factor based on View Port restrictions compared to actual inner width of browser window

        let zoomFactor = Math.max(1, (1 / FanChartView.currentScaleFactor) * Zfactor); // Using current Scale Factor of entire SVG in combination with the ViewPort scale factor to come up with the ACTUAL zoom factor
        // but ... cap it at 1 because .... ???

        // condLog("THIS.SVG = ", this.svg);
        condLog(
            "FanChartView.currentScaleFactor = ",
            FanChartView.currentScaleFactor,
            "Width available / boundingBox = ",
            screen.availWidth,
            "/",
            bbWidth,
            "innerWidth = ",
            window.innerWidth,
            "Zfactor:" + Zfactor,
            "zoomFactor:" + zoomFactor,
            "actual width 1",
            400 * FanChartView.currentScaleFactor * zoomFactor,
            "actual width 2",
            (400 / FanChartView.currentScaleFactor) * zoomFactor,
            "translate(" + xy[0] + "," + xy[1] + ")"
        );

        if (400 > Math.min(window.innerWidth, window.innerHeight)) {
            zoomFactor *= Math.min(window.innerWidth, window.innerHeight) / 400;
            condLog("Had to adjust zoomFactor to", zoomFactor, "(inner dimension > 400)");
        }

        condLog(
            "PP from ",
            SVGx + xy[0],
            " - ",
            SVGx + xy[0] + 400,
            ":",
            SVGx + xy[0] + 400 / FanChartView.currentScaleFactor < boundingBox.width / 2 ? "IN" : "OUT"
        );

        let translateX = xy[0];

        let maxX = 0 - SVGx + boundingBox.width / 2 - 400 * zoomFactor * FanChartView.currentScaleFactor;
        let dX = 0;
        if (SVGx + xy[0] + 400 / FanChartView.currentScaleFactor > boundingBox.width / 2) {
            let W = boundingBox.width / 2 - (SVGx + xy[0]);
            dX = 0 - (400 - W) * Zfactor;
            condLog("dX to adjust is ", dX, "W = ", W);
            condLog("New translation for popup SHOULD be : ", xy[0] * 1 + dX);
        }

        condLog("MAXX should be ", maxX, " compared to ", xy[0]);
        if (maxX < xy[0]) {
            translateX = maxX;
        }
        // if (400 * zoomFactor > window.innerHeight) {
        //     // zoomFactor = window.innerHeight / 400;
        //     condLog("Had to adjust zoomFactor to", window.innerHeight / 400, zoomFactor, "(too high)");
        // }

        var popup = this.svg
            .append("g")
            .attr("class", "popup")
            .attr("transform", "translate(" + translateX + "," + xy[1] + ") scale(" + zoomFactor + ") ");

        let borderColor = "rgba(102, 204, 102, .5)";
        if (person.getGender() == "Male") {
            borderColor = "rgba(102, 102, 204, .5)";
        }
        if (person.getGender() == "Female") {
            borderColor = "rgba(204, 102, 102, .5)";
        }

        const SVGbtnDESC = `<svg width="30" height="30" viewBox="0 0 30 30" stroke="#25422d" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 4 5 L 10 5 L 10 9 L 24 9 M 16 9 L 16 13 L 24 13 M 10 9 L 10 19 L 24 19 M 16 19 L 16 23 L 24 23 M 16 23 L 16 27 L 24 27" fill="none" />
        </svg>`;

        // condLog("popup  = ", popup);
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
						    <span class="tree-links"><a href="#name=${person.getName()}&view=descendants">${SVGbtnDESC}</a></span>

                            </div>
                            <div class="birth vital">${birthString(person)}</div>
                            <div class="death vital">${deathString(person)}</div>
                            ${fandokuLink} <br/>
                            ${bioCheckLink}
						</div>
					</div>

				</div>
			`);

        d3.select("#view-container").on("click", function () {
            // condLog("d3.select treeViewerContainer onclick - REMOVE POPUP");
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
        // condLog("Tree.prototype - REMOVE POPUPS (plural) function");
        d3.selectAll(".popup").remove();
    };

    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        condLog("new var ANCESTOR TREE");

        // RESET  the # of Gens parameters
        FanChartView.numGens2Display = 5;
        FanChartView.lastNumGens = 5;
        FanChartView.numGensRetrieved = 5;
        FanChartView.maxNumGens = 10;
        numRepeatAncestors = 0;
        repeatAncestorTracker = new Object();

        Tree.call(this, svg, "ancestor", 1);
        this.children(function (person) {
            // condLog("Defining the CHILDREN for ", person._data.Name);
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

    function getCleanDateString(dateString, type = "YYYY") {
        let theCleanDateString = "";
        if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
            var parts = dateString.split("-"),
                year = parseInt(parts[0], 10);
            if (year && type == "YYYY") {
                theCleanDateString += year;
            } else if (type == "Full") {
                theCleanDateString += settingsStyleDate(
                    dateString,
                    FanChartView.currentSettings["date_options_dateFormat"]
                );
            } else {
                theCleanDateString += "?";
            }
        } else {
            theCleanDateString += "?";
        }
        return theCleanDateString;
    }
    /**
     * Extract the LifeSpan BBBB - DDDD from a person
     */
    function getLifeSpan(person, type = "YYYY") {
        let theLifeSpan = "";
        let theBirth = "";
        let theDeath = "";
        let dateString = person._data.BirthDate;
        theBirth = getCleanDateString(dateString, type);
        // if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
        //     var parts = dateString.split("-"),
        //         year = parseInt(parts[0], 10);
        //     if (year && type == "YYYY") {
        //         theBirth += year;
        //     } else if (type == "Full") {
        //         theBirth += settingsStyleDate(dateString, FanChartView.currentSettings["date_options_dateFormat"]);
        //     } else {
        //         theBirth += "?";
        //     }
        // } else {
        //     theBirth += "?";
        // }

        theLifeSpan += " - ";

        dateString = person._data.DeathDate;
        theDeath = getCleanDateString(dateString, type);
        // if (dateString == "0000-00-00") {
        //     // nothing to see here - person's still alive !  YAY!
        // } else if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
        //     var parts = dateString.split("-"),
        //         year = parseInt(parts[0], 10);
        //     if (year && type=="YYYY") {
        //         theDeath += year;

        //     } else if (type == "Full") {
        //         theDeath += settingsStyleDate(dateString, FanChartView.currentSettings["date_options_dateFormat"]);
        //     } else {
        //         theDeath += "?";
        //     }
        // } else {
        //     theDeath += "?";
        // }

        if (theBirth > "" && theBirth != "?" && theDeath > "" && theDeath != "?") {
            theLifeSpan = theBirth + " - " + theDeath;
        } else if (theBirth > "" && theBirth != "?") {
            theLifeSpan = "b. " + theBirth;
        } else if (theDeath > "" && theDeath != "?") {
            theLifeSpan = "d. " + theDeath;
        } else {
            theLifeSpan = "?";
        }

        return theLifeSpan;
    }

    /**
     * Generate a string representing this person's lifespan 0000 - 0000
     */
    function lifespanFull(person) {
        var lifespan = "";

        if (FanChartView.currentSettings["date_options_dateTypes"] == "none") {
            lifespan = "";
        } else if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan") {
            lifespan = getLifeSpan(person, "YYYY") + "<br/>";
        } else {
            // let type="Full";
            if (
                FanChartView.currentSettings["date_options_showBirth"] &&
                FanChartView.currentSettings["date_options_showDeath"]
            ) {
                lifespan = getLifeSpan(person, "Full") + "<br/>";
            } else if (FanChartView.currentSettings["date_options_showBirth"]) {
                let dateString = person._data.BirthDate;
                lifespan = getCleanDateString(dateString, "Full");
                if (lifespan > "" && lifespan != "?") {
                    lifespan = "b. " + lifespan;
                }
            } else if (FanChartView.currentSettings["date_options_showDeath"]) {
                let dateString = person._data.DeathDate;
                lifespan = getCleanDateString(dateString, "Full");
                if (lifespan > "" && lifespan != "?") {
                    lifespan = "d. " + lifespan;
                }
            }
        }

        return lifespan;
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
                            let day2digits = day;
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
    function getSettingsDateAndPlace(person, dateType, genNum = 0) {
        let datePlaceString = "";
        let thisDate = "";
        let thisPlaceSimple = "";
        let thisPlaceMulti = "";
        let thisLifespan = "";
        let thisPlace = "";

        let simplifyOuterPlaces = false;
        if (FanChartView.currentSettings["place_options_simplifyOuter"] == true) {
            simplifyOuterPlaces = true;
        }

        let numLinesArrayObj = {
            180: [6, 6, 6, 6, 6, 3, 3, 2, 1, 1],
            240: [6, 6, 6, 6, 6, 5, 3, 3, 2, 1, 1],
            360: [6, 6, 6, 6, 6, 6, 5, 3, 3, 2, 1, 1],
        };
        let numLinesMax = numLinesArrayObj[FanChartView.maxAngle][genNum];

        // let the max # of rings be based on the function already in place, calculateNumLinesInRings();
        numLinesMax = numLinesInRings[genNum];

        // console.log(genNum, FanChartView.maxAngle, numLinesMax );
        // numLinesMax = 6; // changed to this to force all lines to be shown, now that we have the space to do so with rings being allowed to expand.

        if (numLinesMax == 1) {
            return "";
        }

        let hasDeathDate = false;
        if (person._data.DeathDate) {
            if (person._data.DeathDate == "0000-00-00") {
                hasDeathDate = false;
            } else {
                hasDeathDate = true;
            }
        }

        let hasDeathPlace = false;
        if (person._data.DeathLocation) {
            if (person._data.DeathLocation == "") {
                hasDeathPlace = false;
            } else {
                hasDeathPlace = true;
            }
        }

        let hasBirthDate = false;
        if (person._data.BirthDate) {
            if (person._data.BirthDate == "0000-00-00") {
                hasBirthDate = false;
            } else {
                hasBirthDate = true;
            }
        }

        let hasBirthPlace = false;
        if (person._data.BirthLocation) {
            if (person._data.BirthLocation == "") {
                hasBirthPlace = false;
            } else {
                hasBirthPlace = true;
            }
        }

        if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan" && dateType == "B") {
            thisLifespan = getLifeSpan(person);
        } else {
            thisLifespan = lifespanFull(person);
        }
        if (numLinesMax == 2 && thisLifespan > "" && dateType == "B") {
            return thisLifespan;
        }

        if (dateType == "B") {
            if (FanChartView.currentSettings["date_options_showBirth"] == true) {
                thisDate = settingsStyleDate(
                    person._data.BirthDate,
                    FanChartView.currentSettings["date_options_dateFormat"]
                );
                if (FanChartView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }
            }

            if (
                FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                FanChartView.currentSettings["place_options_showBirth"] == true
            ) {
                thisPlace = Utils.settingsStyleLocation(
                    person.getBirthLocation(),
                    FanChartView.currentSettings["place_options_locationFormatBD"]
                );
            } else {
                thisPlace = "";
            }
        } else if (dateType == "D") {
            if (person._data.DeathDate == "0000-00-00") {
                thisDate = "";
            }
            if (FanChartView.currentSettings["date_options_showDeath"] == true) {
                thisDate = settingsStyleDate(
                    person._data.DeathDate,
                    FanChartView.currentSettings["date_options_dateFormat"]
                );
                if (FanChartView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }
            }
            if (
                FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                FanChartView.currentSettings["place_options_showDeath"] == true
            ) {
                thisPlace = Utils.settingsStyleLocation(
                    person.getDeathLocation(),
                    FanChartView.currentSettings["place_options_locationFormatBD"]
                );
            } else {
                thisPlace = "";
            }
        }

        if (thisPlace > "") {
            thisPlaceMulti = thisPlace;

            if (thisPlace.indexOf(",") > -1) {
                // we're looking at a compound location, so the simple location is the first part (before the first comma)
                thisPlaceSimple = thisPlace.substring(0, thisPlace.indexOf(","));
            } else {
                thisPlaceSimple = thisPlace;
            }
        }

        if (thisDate > "" || thisPlace > "") {
            if (thisDate > "") {
                datePlaceString += thisDate;
            }
            // if (thisDate > "" && thisPlace > "") {
            //     datePlaceString += ", ";  // now handled inside ifs above
            // }
            if (thisPlace > "" && (genNum < 5 || simplifyOuterPlaces == false)) {
                datePlaceString += thisPlace;
            } else if (thisPlace > "" && genNum == 5) {
                if (FanChartView.maxAngle == 180) {
                    // nothing to add here - we're too cramped to add a place to the date
                } else if (FanChartView.maxAngle == 360) {
                    // use the full meal deal, as per the settings
                    datePlaceString += thisPlace;
                } else if (thisPlace.indexOf(",") > 2) {
                    datePlaceString += thisPlace.substring(0, thisPlace.indexOf(",", 2));
                } else {
                    datePlaceString += thisPlace;
                }
            }
        }

        if (numLinesMax == 2 && dateType == "B") {
            // LifeSpan or Single Date only
            if (thisLifespan > "") {
                return thisLifespan;
            } else if (thisPlaceSimple > "") {
                return "b. " + thisPlaceSimple;
            } else if (hasDeathPlace == true) {
                if (
                    FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                    FanChartView.currentSettings["place_options_showDeath"] == true
                ) {
                    thisPlace = Utils.settingsStyleLocation(
                        person.getDeathLocation(),
                        FanChartView.currentSettings["place_options_locationFormatBD"]
                    );
                    if (thisPlace > "") {
                        if (thisPlace.indexOf(",") > -1) {
                            return "d. " + thisPlace.substring(0, thisPlace.indexOf(","));
                        } else {
                            return "d. " + thisPlace;
                        }
                    }
                }
                return "";
            }
        } else if (numLinesMax == 3) {
            // 2 Dates, or 1 Date + 1 Simple Loc , or 2 Simple Locs
            let numLocSpotsAvailable = 0;

            if (FanChartView.currentSettings["date_options_dateTypes"] == "none") {
                numLocSpotsAvailable = 2;
                if (simplifyOuterPlaces && thisPlaceSimple > "") {
                    return dateType.toLowerCase() + ". " + thisPlaceSimple;
                } else if (simplifyOuterPlaces == false && thisPlace > "") {
                    return dateType.toLowerCase() + ". " + thisPlace;
                } else {
                    return "";
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan" && dateType == "B") {
                numLocSpotsAvailable = 1;
                if (thisLifespan > "") {
                    datePlaceString = thisLifespan + "<br/>";
                } else {
                    datePlaceString = "";
                }

                if (simplifyOuterPlaces && thisPlaceSimple > "") {
                    datePlaceString += "b. " + thisPlaceSimple;
                } else if (simplifyOuterPlaces == false && thisPlace > "") {
                    datePlaceString += "b. " + thisPlace;
                } else if (hasDeathPlace == true) {
                    if (
                        FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                        FanChartView.currentSettings["place_options_showDeath"] == true
                    ) {
                        thisPlace = Utils.settingsStyleLocation(
                            person.getDeathLocation(),
                            FanChartView.currentSettings["place_options_locationFormatBD"]
                        );
                        if (thisPlace > "") {
                            if (thisPlace.indexOf(",") > -1) {
                                datePlaceString += "d. " + thisPlace.substring(0, thisPlace.indexOf(","));
                            } else {
                                datePlaceString += "d. " + thisPlace;
                            }
                        }
                    }
                }
                return datePlaceString;
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "detailed" && dateType == "B") {
                hasBirthDate = hasBirthDate && FanChartView.currentSettings["date_options_showBirth"];
                hasDeathDate = hasDeathDate && FanChartView.currentSettings["date_options_showDeath"];
                numLocSpotsAvailable = 0;
                datePlaceString = "";
                /* condLog(
                    "DatePlaceString: numLocsSPots = 3 / Detailed BIRTH : ",
                    "thisDate:" + thisDate,
                    "hasDeathDate:" + hasDeathDate,
                    "thisPlaceSimple:" + thisPlaceSimple,
                    "thisPlaceSimple:" + thisPlaceSimple,
                        "locationTypes:" + FanChartView.currentSettings["place_options_locationTypes"],
                        "showDeath:" + FanChartView.currentSettings["place_options_showDeath"],
                        person._data.FirstName
                ); */
                if (
                    FanChartView.currentSettings["date_options_showBirth"] == false &&
                    hasDeathDate == true &&
                    hasDeathPlace == true
                ) {
                    return "";
                } else if (thisDate > "" && hasDeathDate && simplifyOuterPlaces) {
                    return "b. " + thisDate;
                } else if (thisDate > "" && hasDeathDate && simplifyOuterPlaces == false) {
                    return "b. " + thisDate + ", " + thisPlace;
                } else if (thisDate > "" && hasDeathDate == false && simplifyOuterPlaces) {
                    return "b. " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (thisDate > "" && hasDeathDate == false && simplifyOuterPlaces == false) {
                    return "b. " + thisDate + "<br/>" + thisPlace;
                } else if (
                    thisDate > "" &&
                    (FanChartView.currentSettings["place_options_locationTypes"] == "none" ||
                        FanChartView.currentSettings["place_options_showDeath"] == false)
                ) {
                    return "b. " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (thisDate == "" && thisPlaceSimple > "" && simplifyOuterPlaces) {
                    return "b. " + thisPlaceSimple;
                } else if (thisDate == "" && thisPlace > "" && simplifyOuterPlaces == false) {
                    return "b. " + thisPlace;
                } else {
                    return "";
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "detailed" && dateType == "D") {
                hasBirthDate = hasBirthDate && FanChartView.currentSettings["date_options_showBirth"];
                hasDeathDate = hasDeathDate && FanChartView.currentSettings["date_options_showDeath"];
                numLocSpotsAvailable = 0;
                datePlaceString = "";
                if (FanChartView.currentSettings["date_options_showDeath"] == false) {
                    return "";
                } else if (thisDate > "" && FanChartView.currentSettings["date_options_showBirth"] == false) {
                    if (simplifyOuterPlaces) {
                        return "d. " + thisDate + "<br/>" + thisPlaceSimple;
                    } else {
                        return "d. " + thisDate + "<br/>" + thisPlace;
                    }
                } else if (thisDate > "" && hasBirthDate) {
                    if (simplifyOuterPlaces || thisPlace == "") {
                        return "d. " + thisDate;
                    } else {
                        return "d. " + thisDate + ", " + thisPlace;
                    }
                } else if (thisDate > "" && hasBirthDate == false && hasBirthPlace == false) {
                    if (simplifyOuterPlaces) {
                        return "d. " + thisDate + "<br/>" + thisPlaceSimple;
                    } else {
                        return "d. " + thisDate + "<br/>" + thisPlace;
                    }
                } else if (thisDate > "") {
                    if (simplifyOuterPlaces || thisPlace == "") {
                        return "d. " + thisDate;
                    } else {
                        return "d. " + thisDate + ", " + thisPlace;
                    }
                } else if (thisDate == "" && thisPlaceSimple > "" && simplifyOuterPlaces) {
                    return "d. " + thisPlaceSimple;
                } else if (thisDate == "" && thisPlace > "" && simplifyOuterPlaces == false) {
                    return "d. " + thisPlace;
                } else {
                    return "";
                }
            }
        } else if (numLinesMax == 4) {
            // 1 LifeSpan + 2 Locations

            datePlaceString = "";
            if (
                FanChartView.currentSettings["date_options_dateTypes"] != "none" &&
                dateType == "B" &&
                thisLifespan > ""
            ) {
                datePlaceString = thisLifespan;
            }

            if (thisPlace > "") {
                if (
                    (FanChartView.currentSettings["place_options_showBirth"] && dateType == "B") ||
                    (FanChartView.currentSettings["place_options_showDeath"] && dateType == "D")
                ) {
                    if (thisPlace > "" && simplifyOuterPlaces == false) {
                        datePlaceString += dateType.toLowerCase() + ". " + thisPlace;
                    } else if (thisPlaceSimple > "" && simplifyOuterPlaces == true) {
                        datePlaceString += dateType.toLowerCase() + ". " + thisPlaceSimple;
                    }
                }
            }
            return datePlaceString;
        } else if (numLinesMax == 5) {
            // 2 Dates + 2 Locations
            datePlaceString = "";
            if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan") {
                if (dateType == "B" && thisLifespan > "") {
                    datePlaceString = thisLifespan + "<br/>";
                }
                if (thisPlace > "") {
                    if (
                        (FanChartView.currentSettings["place_options_showBirth"] && dateType == "B") ||
                        (FanChartView.currentSettings["place_options_showDeath"] && dateType == "D")
                    ) {
                        if (thisPlace > "" && simplifyOuterPlaces == false) {
                            datePlaceString += dateType.toLowerCase() + ". " + thisPlace;
                        } else if (thisPlaceSimple > "" && simplifyOuterPlaces == true) {
                            datePlaceString += dateType.toLowerCase() + ". " + thisPlaceSimple;
                        }
                    }
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "detailed") {
                if (thisDate > "") {
                    datePlaceString = dateType.toLowerCase() + ". " + thisDate + "<br/>";
                    if (thisPlace > "" && simplifyOuterPlaces == false) {
                        datePlaceString += thisPlace;
                    } else if (thisPlaceSimple > "" && simplifyOuterPlaces == true) {
                        datePlaceString += thisPlaceSimple;
                    }
                } else if (thisPlace > "") {
                    if (
                        (FanChartView.currentSettings["place_options_showBirth"] && dateType == "B") ||
                        (FanChartView.currentSettings["place_options_showDeath"] && dateType == "D")
                    ) {
                        if (thisPlace > "" && simplifyOuterPlaces == false) {
                            datePlaceString += dateType.toLowerCase() + ". " + thisPlace;
                        } else if (thisPlaceSimple > "" && simplifyOuterPlaces == true) {
                            datePlaceString += dateType.toLowerCase() + ". " + thisPlaceSimple;
                        }
                    }
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "none") {
                if (
                    (FanChartView.currentSettings["place_options_showBirth"] && dateType == "B") ||
                    (FanChartView.currentSettings["place_options_showDeath"] && dateType == "D")
                ) {
                    if (thisPlace > "" && simplifyOuterPlaces == false) {
                        datePlaceString += dateType.toLowerCase() + ". " + thisPlace;
                    } else if (thisPlaceSimple > "" && simplifyOuterPlaces == true) {
                        datePlaceString += dateType.toLowerCase() + ". " + thisPlaceSimple;
                    }
                }
            }
            return datePlaceString;
        } else if (numLinesMax == 6) {
            // Full Meal Deal
            datePlaceString = "";
            if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan") {
                if (dateType == "B" && thisLifespan > "") {
                    datePlaceString = thisLifespan + "<br/>";
                }
                if (thisPlaceMulti > "") {
                    datePlaceString += dateType.toLowerCase() + ". " + thisPlaceMulti;
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "detailed") {
                if (thisDate > "") {
                    datePlaceString = dateType.toLowerCase() + ". " + thisDate + "<br/>" + thisPlaceMulti;
                } else if (thisPlaceMulti > "") {
                    datePlaceString += dateType.toLowerCase() + ". " + thisPlaceMulti;
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "none") {
                if (thisPlaceMulti > "") {
                    datePlaceString += dateType.toLowerCase() + ". " + thisPlaceMulti;
                }
            }
            return datePlaceString;
        } else {
            return "";
        }

        condLog("WARNING WARNING WILL ROBINSON ... RETURN DATE PLACE STRING HAS GONE PAST!");

        // remove leading commas (when it's locations only)
        let origString = datePlaceString;
        datePlaceString = datePlaceString
            .replace("b. ,", "b. ")
            .replace("d. ,", "d. ")
            .replace("b. <br/>", "b. ")
            .replace("d. <br/>", "d. ");
        if (origString != datePlaceString) {
            // condLog("REPLACED ", origString," with ", datePlaceString);
        }
        // check for empty b. or d. entries
        if (
            datePlaceString == "b. " ||
            datePlaceString == "b." ||
            datePlaceString == "b. <br/>" ||
            datePlaceString == "d. " ||
            datePlaceString == "d."
        ) {
            datePlaceString = "";
        } else if (
            datePlaceString.indexOf("<br/>b.") > 1 &&
            datePlaceString.length - datePlaceString.indexOf("<br/>b.") < 10
        ) {
            datePlaceString = datePlaceString.replace("<br/>b.", "");
        }
        return datePlaceString;
    }
    function getSettingsDateAndPlaceWorking(person, dateType, genNum = 0) {
        let datePlaceString = "";
        let thisDate = "";
        let thisPlace = "";
        if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan" && dateType == "B") {
            datePlaceString = getLifeSpan(person) + "<br/>";
        }

        if (dateType == "B") {
            if (FanChartView.currentSettings["date_options_showBirth"] == true) {
                thisDate = settingsStyleDate(
                    person._data.BirthDate,
                    FanChartView.currentSettings["date_options_dateFormat"]
                );
                if (FanChartView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }
            }

            if (
                FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                FanChartView.currentSettings["place_options_showBirth"] == true
            ) {
                thisPlace = Utils.settingsStyleLocation(
                    person.getBirthLocation(),
                    FanChartView.currentSettings["place_options_locationFormatBD"]
                );
            } else {
                thisPlace = "";
            }

            if (thisDate > "" || thisPlace > "") {
                datePlaceString += "b. ";

                if (thisPlace.indexOf(",") > -1) {
                    // we're looking at a compound location, and an actual date, so let's break it up and put the location on its own line.
                    thisPlace = "<br/>" + thisPlace;
                } else {
                    thisPlace = ", " + thisPlace;
                }
            }
        } else if (dateType == "D") {
            if (person._data.DeathDate == "0000-00-00") {
                return "";
            }
            if (FanChartView.currentSettings["date_options_showDeath"] == true) {
                thisDate = settingsStyleDate(
                    person._data.DeathDate,
                    FanChartView.currentSettings["date_options_dateFormat"]
                );
                if (FanChartView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }
            }
            if (
                FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                FanChartView.currentSettings["place_options_showDeath"] == true
            ) {
                thisPlace = Utils.settingsStyleLocation(
                    person.getDeathLocation(),
                    FanChartView.currentSettings["place_options_locationFormatBD"]
                );
            } else {
                thisPlace = "";
            }
            if (thisDate > "" || thisPlace > "") {
                datePlaceString += "d. ";
                if (thisPlace.indexOf(",") > -1) {
                    // we're looking at a compound location, and an actual date, so let's break it up and put the location on its own line.
                    thisPlace = "<br/>" + thisPlace;
                } else {
                    thisPlace = ", " + thisPlace;
                }
            }
        }
        if (thisDate > "" || thisPlace > "") {
            if (thisDate > "") {
                datePlaceString += thisDate;
            }
            // if (thisDate > "" && thisPlace > "") {
            //     datePlaceString += ", ";  // now handled inside ifs above
            // }
            if (thisPlace > "" && genNum < 5) {
                datePlaceString += thisPlace;
            } else if (thisPlace > "" && genNum == 5) {
                if (FanChartView.maxAngle == 180) {
                    // nothing to add here - we're too cramped to add a place to the date
                } else if (FanChartView.maxAngle == 360) {
                    // use the full meal deal, as per the settings
                    datePlaceString += thisPlace;
                } else if (thisPlace.indexOf(",") > 2) {
                    datePlaceString += thisPlace.substring(0, thisPlace.indexOf(",", 2));
                } else {
                    datePlaceString += thisPlace;
                }
            }
        }

        if (genNum == 6) {
            if (FanChartView.maxAngle == 180) {
                if (dateType == "D") {
                    datePlaceString = "";
                } else if (dateType == "B") {
                    datePlaceString = lifespanFull(person);
                }
                // nothing to add here - we're too cramped to add a place to the date
            } else if (FanChartView.maxAngle == 360) {
                if (thisPlace.indexOf(",") > 2) {
                    datePlaceString += thisPlace.substring(0, thisPlace.indexOf(",", 2));
                } else {
                    datePlaceString += thisPlace;
                }
            }
        } else if (genNum == 7) {
            if (FanChartView.maxAngle == 180) {
                datePlaceString = "";
                // nothing to add here - we're too cramped to add a place to the date
            } else if (FanChartView.maxAngle == 240) {
                if (dateType == "D") {
                    datePlaceString = "";
                } else if (dateType == "B") {
                    datePlaceString = lifespanFull(person);
                }
            } else if (FanChartView.maxAngle == 360) {
                // datePlaceString = lifespanFull(person);
            }
        } else if (genNum == 8) {
            if (FanChartView.maxAngle < 360) {
                datePlaceString = "";

                // nothing to add here - we're too cramped to add a place to the date
            } else {
                datePlaceString = lifespanFull(person);
            }
        }

        // remove leading commas (when it's locations only)
        let origString = datePlaceString;
        datePlaceString = datePlaceString
            .replace("b. ,", "b. ")
            .replace("d. ,", "d. ")
            .replace("b. <br/>", "b. ")
            .replace("d. <br/>", "d. ");
        if (origString != datePlaceString) {
            // condLog("REPLACED ", origString," with ", datePlaceString);
        }
        // check for empty b. or d. entries
        if (
            datePlaceString == "b. " ||
            datePlaceString == "b." ||
            datePlaceString == "b. <br/>" ||
            datePlaceString == "d. " ||
            datePlaceString == "d."
        ) {
            datePlaceString = "";
        } else if (
            datePlaceString.indexOf("<br/>b.") > 1 &&
            datePlaceString.length - datePlaceString.indexOf("<br/>b.") < 10
        ) {
            datePlaceString = datePlaceString.replace("<br/>b.", "");
        }
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
        //     FanChartView.currentSettings["name_options_prefix"], person._data
        // );
        if (
            FanChartView.currentSettings["name_options_prefix"] == true &&
            person._data.Prefix &&
            person._data.Prefix > ""
        ) {
            theName = person._data.Prefix + " ";
            // theName = "PRE ";
        }

        if (FanChartView.currentSettings["name_options_firstName"] == "FirstNameAtBirth") {
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

        if (FanChartView.currentSettings["name_options_middleName"] == true) {
            if (person._data.MiddleName > "") {
                theName += " " + person._data.MiddleName;
            }
        } else if (FanChartView.currentSettings["name_options_middleInitial"] == true) {
            if (person._data.MiddleInitial > "" && person._data.MiddleInitial != ".") {
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

        if (
            FanChartView.currentSettings["name_options_suffix"] == true &&
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
        // condLog("birthName = ", birthName);
        let thePrefix = "";
        let theSuffix = "";

        if (!birthName) {
            return "Private Person";
        }

        if (
            FanChartView.currentSettings["name_options_prefix"] == true &&
            person._data.Prefix &&
            person._data.Prefix > ""
        ) {
            thePrefix = person._data.Prefix + " ";
        }

        if (
            FanChartView.currentSettings["name_options_suffix"] == true &&
            person._data.Suffix &&
            person._data.Suffix > ""
        ) {
            theSuffix = " " + person._data.Suffix;
        }

        condLog("IXes : ", person._data.Prefix, person._data.Suffix);

        if (birthName.length < maxLength) {
            return thePrefix + birthName + theSuffix;
        } else if (middleInitialName.length < maxLength) {
            return thePrefix + middleInitialName + theSuffix;
        } else if (noMiddleInitialName.length < maxLength) {
            return thePrefix + noMiddleInitialName + theSuffix;
        } else {
            return thePrefix + `${person._data.FirstName.substring(0, 1)}. ${person._data.LastNameAtBirth}` + theSuffix;
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
        // condLog("getAngleOfRotation of ", theElement.parentNode.parentNode.parentNode);
        let theBigElement = theElement.parentNode.parentNode.parentNode;
        // let theTransform = theBigElement.getPropertyOf("transform");
        // condLog("t:", theBigElement["transform"]);
        // let theTransform = theBigElement.transform.baseVal;
        // condLog("theTransform:", theTransform);
        for (let t in theTransform) {
            const transformObj = theTransform[t];
            // condLog("obj:", transformObj);
        }

        // condLog("Count: " + theTransform.length);

        return 9;
    }

    function safeName(inp) {
        return inp.replace(/ /g, "_");
    }

    function updateDNAlinks(nodes) {
        //{ ahnNum: i, person: thePeopleList[this.list[i]] }
        for (let index = 0; index < nodes.length; index++) {
            const element = nodes[index];
            let i = element.ahnNum;
            let peep = element.person;
            let peepNameID = safeName(peep._data.Name);
            // condLog("Peep:", peepNameID);
        }
    }

    function hideMDateDIVs() {
        for (let ahnNum = 2 ** FanChartView.numGens2Display; ahnNum < 2 ** FanChartView.maxNumGens; ahnNum++) {
            const mDateDIV = document.getElementById("mDateFor-" + ahnNum + "inner");
            if (mDateDIV) {
                mDateDIV.style.display = "none";
            }
            // for (let b = 1; b <= numOfBadges; b++) {
            //     const badgeDIVid = "badge" + b + "-" + ahnNum + "svg";
            //     let badgeDIV = document.getElementById(badgeDIVid);

            //     badgeDIV.parentNode.style.display = "block"; // CHANGED FOR BADGE TESTING
            // }
        }
    }

    //  let catNameSelector = document.getElementById("highlight_options_catName");
    //         let rawValue = catNameSelector.value.trim();
    //         let spacelessValue = catNameSelector.value.trim().replace(/ /g, "_");
    //         condLog("Looking for BIOs that Have the following: ", rawValue, "or", spacelessValue);
    //          if (
    //              thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
    //              thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio &&
    //              (
    //                 thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) > -1 ||
    //                 thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + " " + rawValue) > -1 ||
    //                 thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + spacelessValue) > -1 ||
    //                 thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + " " + spacelessValue) > -1
    //              )
    //          ) {
    //              return true;

    FanChartView.updateBadgesToShow = function (num = 1) {
        condLog("UPDATING BADGES NOW !!!!", num);
        let showBadges = FanChartView.currentSettings["general_options_showBadges"];
        let theDropDown = document.getElementById("stickerCategoryDropDownList" + num);
        let searchText = "nada";
        let searchPrefix = "[[Category:";
        let specialDecoderRing = {
            "-5": "DNA confirmed",
            "-10": "Created by me",
            "-15": "Managed by me",
            "-20": "Bio Check: style issues",
            "-25": "Bio Check: no sources",
        };
        let otherBadgeType = "";
        // condLog("Initial drop down value:", theDropDown.value);
        if (theDropDown.value > -1) {
            if (theDropDown.value && theDropDown.value < categoryList.length) {
                searchText = categoryList[theDropDown.value];
            } else if (theDropDown.value && theDropDown.value < categoryList.length + stickerList.length) {
                searchText = stickerList[theDropDown.value - categoryList.length];
                searchPrefix = "{{";
            }
        } else if (theDropDown.value < -1) {
            // condLog("SPECIAL CASE HERE: ", specialDecoderRing[theDropDown.value]);
            if (specialDecoderRing[theDropDown.value] && specialDecoderRing[theDropDown.value] > "") {
                // great
                otherBadgeType = specialDecoderRing[theDropDown.value];

                searchText = "" + otherBadgeType;
            } else {
                showBadges = false;
            }
        } else {
            showBadges = false;
        }
        FanChartView.removeBadges(num);
        // condLog("UPDATING the STICKERS to show # ", num, theDropDown.value, searchText, "Other:" + otherBadgeType);
        // condLog("searchText = ", searchText);
        let rawValue = searchText.trim();
        let spacelessValue = searchText.trim().replace(/ /g, "_");

        currentBadges[num] = rawValue;

        for (let ahnNum = 1; ahnNum < 2 ** FanChartView.numGens2Display; ahnNum++) {
            // const thisDIVid = "badge" + num + "-" + ahnNum + "svg";
            // let stickerDIV = document.getElementById(thisDIVid);

            if (
                showBadges &&
                // stickerDIV &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) >
                    -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + spacelessValue
                    ) > -1)
            ) {
                //  SHOW THIS STICKER
                // let SVGgraphicsDIV = document.getElementById("SVGgraphics");
                // stickerDIV.parentNode.style.display = "block";
                // SVGgraphicsDIV.append(stickerDIV.parentNode);

                // FanChartView.theBadgeTracker[ahnNum][i] = { x: theBadgeX, y: theBadgeY, angle: nameAngle };
                let badgeVars = FanChartView.theBadgeTracker[ahnNum][num];
                FanChartView.addNewBadge(badgeVars.x, badgeVars.y, num, badgeVars.angle);
            } else if (showBadges && otherBadgeType > "") {
                //  SHOW THIS STICKER
                // let SVGgraphicsDIV = document.getElementById("SVGgraphics");
                // stickerDIV.parentNode.style.display = "block";
                // SVGgraphicsDIV.append(stickerDIV.parentNode);

                // FanChartView.theBadgeTracker[ahnNum][i] = { x: theBadgeX, y: theBadgeY, angle: nameAngle };
                // condLog(window.WTUser.id);
                // condLog(document.getElementById("wt-api-login").textContent.indexOf(":"));
                // condLog(window.wtViewRegistry.session.lm.user);
                condLog("IF ...", otherBadgeType, ahnNum);
                let myUserID = window.wtViewRegistry.session.lm.user.id; // WikiTree userID (#) for the person logged in
                if (
                    (otherBadgeType == "Managed by me" &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Manager == myUserID) ||
                    (otherBadgeType == "Created by me" &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Creator == myUserID) ||
                    (otherBadgeType == "Bio Check: style issues" &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]["biocheck"] &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]["biocheck"].hasStyleIssues()) ||
                    (otherBadgeType == "Bio Check: no sources" &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]["biocheck"] &&
                        (thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]["bioHasSources"] == false ||
                            thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]["biocheck"].isMarkedUnsourced()))
                ) {
                    let badgeVars = FanChartView.theBadgeTracker[ahnNum][num];
                    FanChartView.addNewBadge(badgeVars.x, badgeVars.y, num, badgeVars.angle);
                } else if (otherBadgeType == "DNA confirmed") {
                    let childAhnNum = Math.floor(ahnNum / 2);
                    let showDNAconf = false;
                    if (ahnNum % 2 == 0) {
                        // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                        if (
                            thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]] &&
                            thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30
                        ) {
                            showDNAconf = true;
                        }
                    } else if (ahnNum > 1) {
                        // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                        if (
                            thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]] &&
                            thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30
                        ) {
                            showDNAconf = true;
                        }
                    } else if (ahnNum == 1) {
                        // this primary person is confirmed by their own DNA to be themselves (a bit of a circuitous rationalization to make a nice neat pattern)
                        showDNAconf = true;
                    }

                    if (showDNAconf == true) {
                        let badgeVars = FanChartView.theBadgeTracker[ahnNum][num];
                        FanChartView.addNewBadge(badgeVars.x, badgeVars.y, num, badgeVars.angle);
                    }
                }
            } else {
                // stickerDIV.parentNode.style.display = "none";
            }

            // stickerDIV.parentNode.style.display = "block"; // ADDED FOR BADGE TESTING
        }
    };

    function showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle) {
        const ahnNum = 2 ** thisGenNum + thisPosNum;
        // condLog("SHOW BADGES FOR #  ",ahnNum);
        if (ahnNum == 1) {
        }
        let SVGgraphicsDIV = document.getElementById("SVGgraphics");
        let showBadgesSetting = FanChartView.currentSettings["general_options_showBadges"];

        // let dCompensation = 0;
        // if (1 == 1) {
        //     if (nameAngle > 550) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 540) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 530) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 520) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 510) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 500) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 490) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 480) {
        //         dCompensation = -34;
        //     } else if (nameAngle > 470) {
        //         dCompensation = -34;
        //     } else if (nameAngle > 450) {
        //         dCompensation = -32;
        //     } else if (nameAngle > 435) {
        //         dCompensation = -26;
        //     } else if (nameAngle > 420) {
        //         dCompensation = -24;
        //     } else if (nameAngle > 400) {
        //         dCompensation = -14;
        //     } else if (nameAngle > 380) {
        //         dCompensation = -10;
        //     } else if (nameAngle > 360) {
        //         dCompensation = -6;
        //     } else if (nameAngle > 320) {
        //         dCompensation = 0;
        //     } else if (nameAngle > 270) {
        //         dCompensation = -6;
        //     } else if (nameAngle > 240) {
        //         dCompensation = -18;
        //     } else if (nameAngle > 220) {
        //         dCompensation = -24;
        //     } else if (nameAngle > 200) {
        //         dCompensation = -32;
        //     } else if (nameAngle > 190) {
        //         dCompensation = -36;
        //     } else if (nameAngle > 170) {
        //         dCompensation = -36;
        //     }
        // }

        // let dFraction =
        //     ((thisGenNum + 1 / 2) * thisRadius - 2 * 0 - 0 * (thisGenNum < 5 ? 100 : 80) + dCompensation) /
        //     (Math.max(1, thisGenNum) * thisRadius);

        let dCompensation = -5;
        if (thisGenNum == 1) {
            //  dCompensation = 0;
        } else if (thisGenNum > 5 || (thisGenNum == 5 && FanChartView.maxAngle < 360)) {
            if (thisPosNum < 2 ** (thisGenNum - 1)) {
                dCompensation = -5;
            } else {
                dCompensation = -30;
            }
        }
        //  dCompensation = -5;

        dCompensation += 35.0;

        let dFraction =
            (cumulativeGenRadii[thisGenNum] + 1.0 * dCompensation) /
            (cumulativeGenRadii[thisGenNum - 1] + thisRadius / 2);
        let dFraction2 =
            (cumulativeGenRadii[thisGenNum] + 1.0 * dCompensation - 35) /
            (cumulativeGenRadii[thisGenNum - 1] + thisRadius / 2);

        let dFraction3 =
            (cumulativeGenRadii[thisGenNum] + 1.0 * dCompensation - 70) /
            (cumulativeGenRadii[thisGenNum - 1] + thisRadius / 2);

        let tooNarrowFor5inRow = false;
        let tooNarrowFor3and2Row = false;
        let minWidthNeeded =
            (2 * Math.PI * (FanChartView.maxAngle / 360) * (cumulativeGenRadii[thisGenNum] + dCompensation)) /
            2 ** thisGenNum;
        if (minWidthNeeded < 160) {
            tooNarrowFor5inRow = true;
        }

        if (minWidthNeeded < 105) {
            tooNarrowFor5inRow = true;
            tooNarrowFor3and2Row = true;
        }

        //  console.log("minWidthNeeded = ", minWidthNeeded, { tooNarrowFor5inRow }, {tooNarrowFor3and2Row});

        // console.log("dFraction = ", dFraction, cumulativeGenRadii[thisGenNum + 1], cumulativeGenRadii[thisGenNum], {thisRadius}, {thisGenNum}, {newX}, {newY}, {dCompensation}, {nameAngle});

        let dOrthoNudge = 30 / (cumulativeGenRadii[thisGenNum] + dCompensation);
        let dOrtho = 30 / (cumulativeGenRadii[thisGenNum] + dCompensation);
        let dOrtho2 = dOrtho;
        let newR = thisRadius;

        condLog("UPDATING the BADGES DROP DOWN here on line 5196");
        // stickerPrefix + ahnNum + "svg",
        for (let i = 1; i <= numOfBadges; i++) {
            const thisDIVid = "badge" + i + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);

            // dnaImgY.setAttribute("x", newX * dFraction + dOrtho * newY);
            // dnaImgY.setAttribute("y", newY * dFraction - dOrtho * newX);

            let halfNumBadgesCenteringOffset = 3.5; // i - 3; // = 1.5 * 0.5 + numOfBadges / 2;
            let theBadgeX = 0;
            let theBadgeY = 0;

            if (ahnNum == 1) {
                halfNumBadgesCenteringOffset = 1 * 0.5 + numOfBadges / 2;
                newX = -30;
                newY = 0 - thisRadius + Math.abs(i - halfNumBadgesCenteringOffset) * 10 * 2;

                theBadgeX = newX * dFraction + (halfNumBadgesCenteringOffset - i) * dOrtho * newY;
                theBadgeY = newY * dFraction - dOrtho * newX;
            } else {
                let nudgeMultiplier = 1;
                if (thisGenNum < 5 || (thisGenNum == 5 && FanChartView.maxAngle == 360)) {
                    nudgeMultiplier = 0;
                } else if (thisPosNum < 2 ** (thisGenNum - 1)) {
                    nudgeMultiplier = -1;
                } else if (thisGenNum == 5 && FanChartView.maxAngle < 360) {
                    nudgeMultiplier = 0;
                }

                theBadgeX =
                    newX * dFraction +
                    (halfNumBadgesCenteringOffset - i) * dOrtho * newY +
                    nudgeMultiplier * dOrthoNudge * newY;
                theBadgeY =
                    newY * dFraction -
                    (halfNumBadgesCenteringOffset - i) * dOrtho * newX -
                    nudgeMultiplier * dOrthoNudge * newX;

                if (tooNarrowFor5inRow) {
                    if (thisPosNum < 2 ** (thisGenNum - 1)) {
                        nudgeMultiplier = -1;
                    } else {
                        nudgeMultiplier = 0;
                    }
                    if (i % 2 == 1) {
                        // ODD Badges go at edge
                        theBadgeX =
                            newX * dFraction +
                            (halfNumBadgesCenteringOffset - (3 + (i - 3) / 2)) * dOrtho * newY +
                            nudgeMultiplier * dOrthoNudge * newY;
                        theBadgeY =
                            newY * dFraction -
                            (halfNumBadgesCenteringOffset - (3 + (i - 3) / 2)) * dOrtho * newX -
                            nudgeMultiplier * dOrthoNudge * newX;
                    } else {
                        // EVEN Badges go inside
                        theBadgeX =
                            newX * dFraction2 +
                            (halfNumBadgesCenteringOffset - i + (i - 3) / 2) * dOrtho * newY +
                            nudgeMultiplier * dOrthoNudge * newY;
                        theBadgeY =
                            newY * dFraction2 -
                            (halfNumBadgesCenteringOffset - i + (i - 3) / 2) * dOrtho * newX -
                            nudgeMultiplier * dOrthoNudge * newX;
                    }
                }
                if (tooNarrowFor3and2Row) {
                    if (thisPosNum < 2 ** (thisGenNum - 1)) {
                        nudgeMultiplier = -1;
                    } else {
                        nudgeMultiplier = 0;
                    }

                    if (i == 1 || i == 5) {
                        // A/ E Badges go at edge
                        theBadgeX =
                            newX * dFraction +
                            (halfNumBadgesCenteringOffset - (3 + (i - 3) / 4)) * dOrtho * newY +
                            nudgeMultiplier * dOrthoNudge * newY;
                        theBadgeY =
                            newY * dFraction -
                            (halfNumBadgesCenteringOffset - (3 + (i - 3) / 4)) * dOrtho * newX -
                            nudgeMultiplier * dOrthoNudge * newX;
                    } else if (i % 2 == 0) {
                        // B / D Badges go at edge
                        theBadgeX =
                            newX * dFraction2 +
                            (halfNumBadgesCenteringOffset - i + (i - 3) / 2) * dOrtho * newY +
                            nudgeMultiplier * dOrthoNudge * newY;
                        theBadgeY =
                            newY * dFraction2 -
                            (halfNumBadgesCenteringOffset - i + (i - 3) / 2) * dOrtho * newX -
                            nudgeMultiplier * dOrthoNudge * newX;
                    } else {
                        // C Badge goes deep inside
                        theBadgeX =
                            newX * dFraction3 +
                            (halfNumBadgesCenteringOffset - i) * dOrtho * newY +
                            nudgeMultiplier * dOrthoNudge * newY;
                        theBadgeY =
                            newY * dFraction3 -
                            (halfNumBadgesCenteringOffset - i) * dOrtho * newX -
                            nudgeMultiplier * dOrthoNudge * newX;
                    }
                }
            }

            // stickerDIV.style.rotate = nameAngle + "deg";

            let theDropDown = document.getElementById("stickerCategoryDropDownList" + i);
            let searchText = "nada";
            let showBadges = showBadgesSetting;
            let searchPrefix = "[[Category:";
            let specialDecoderRing = {
                "-5": "DNA confirmed",
                "-10": "Created by me",
                "-15": "Managed by me",
                "-20": "Bio Check: style issues",
                "-25": "Bio Check: no sources",
            };
            // condLog("Looking for ", i, " theDropDown.value ", theDropDown.value);

            if (theDropDown.value > -1) {
                if (theDropDown.value && theDropDown.value < categoryList.length) {
                    searchText = categoryList[theDropDown.value];
                } else if (theDropDown.value && theDropDown.value < categoryList.length + stickerList.length) {
                    searchText = stickerList[theDropDown.value - categoryList.length];
                    searchPrefix = "{{";

                    // } else if (theDropDown.value && theDropDown.value < categoryList.length + stickerList.length) {
                    //     searchText = otherList +  stickerList[theDropDown.value - categoryList.length];
                    //     searchPrefix = "";
                }
            } else if (theDropDown.value < -1) {
                // condLog("SPECIAL CASE HERE: ", specialDecoderRing[theDropDown.value]);
                if (specialDecoderRing[theDropDown.value] && specialDecoderRing[theDropDown.value] > "") {
                    // great
                    searchText = specialDecoderRing[theDropDown.value];
                    // searchText = "" +  otherBadgeType;
                } else {
                    showBadges = false;
                }
            } else {
                showBadges = false;
            }
            // condLog("searchText = ", searchText);
            let rawValue = searchText.trim();
            let spacelessValue = searchText.trim().replace(/ /g, "_");

            if (i == 1 || ahnNum == 1) {
                condLog(
                    "Sticker me this: i=",
                    i,
                    thisGenNum,
                    thisPosNum,
                    ahnNum,
                    nameAngle,
                    "deg",
                    dCompensation,
                    newX,
                    newY,
                    dOrtho,
                    (Math.atan(-18 / 12) * 180) / Math.PI
                );
            }

            if (FanChartView.theBadgeTracker[ahnNum]) {
                FanChartView.theBadgeTracker[ahnNum][i] = { x: theBadgeX, y: theBadgeY, angle: nameAngle };
            } else {
                FanChartView.theBadgeTracker[ahnNum] = [{}, {}, {}, {}, {}, {}];
                FanChartView.theBadgeTracker[ahnNum][i] = { x: theBadgeX, y: theBadgeY, angle: nameAngle };
            }

            if (
                showBadges &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) >
                    -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    // theDropDown.value < -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + spacelessValue
                    ) > -1)
            ) {
                //  SHOW THIS STICKER
                condLog(" ---> Add new badge ", i, ahnNum);
                FanChartView.addNewBadge(theBadgeX, theBadgeY, i, nameAngle);
            } else {
                // stickerDIV.parentNode.style.display = "none";
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
        let SVGgraphicsDIV = document.getElementById("SVGgraphics");

        let showX = false,
            showY = false,
            showMT = false,
            showDNAconf = false,
            showAs = false,
            showDs = false;

        let dCompensation = 35;
        if (thisGenNum == 1) {
            // dCompensation = -45;
        } else if (thisGenNum > 5 || (thisGenNum == 5 && FanChartView.maxAngle < 360)) {
            if (thisPosNum < 2 ** (thisGenNum - 1)) {
                dCompensation = 35;
            } else {
                dCompensation = 5;
            }
        }

        dCompensation += 35;

        let tooNarrowForAsandDs = false;
        let minWidthNeeded =
            (2 * Math.PI * (FanChartView.maxAngle / 360) * (cumulativeGenRadii[thisGenNum - 1] + dCompensation)) /
            2 ** thisGenNum;
        if (minWidthNeeded < 105) {
            tooNarrowForAsandDs = true;
        }
        // console.log("minWidthNeeded = ", minWidthNeeded, {tooNarrowForAsandDs});

        let dFraction =
            (cumulativeGenRadii[thisGenNum - 1] + dCompensation) /
            (cumulativeGenRadii[thisGenNum - 1] + thisRadius / 2);
        // (thisGenNum * thisRadius - (thisGenNum < 5 ? 100 : 80)) / (Math.max(1, thisGenNum) * thisRadius);
        // let dOrtho = 35 / (Math.max(1, thisGenNum) * thisRadius);
        let dOrtho = 35 / (cumulativeGenRadii[thisGenNum - 1] + dCompensation);
        let dOrthoNudge = 15 / (cumulativeGenRadii[thisGenNum - 1] + dCompensation);
        let dOrtho2 = dOrtho;
        let newR = thisRadius;

        let ahnNum = 2 ** thisGenNum + thisPosNum;
        let gen = thisGenNum;
        let pos = thisPosNum;
        let ext = ""; // IF the type of DNA being highlighted is exclusively one type (X, Y, MT), then do show EXTRA icons (for As and Ds) - and store the type in variable "ext"
        let showAllAs = false;
        let showAllDs = false;

        if (FanChartView.currentSettings["highlight_options_showHighlights"] == true) {
            if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                ext = "Y";
                dOrtho = 0;
                if (pos == 0) {
                    if (ahnNum > 1) {
                        showY = true;
                        showDs = true && !tooNarrowForAsandDs;
                        showAs = true && !tooNarrowForAsandDs;
                    } else if (
                        ahnNum == 1 &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male"
                    ) {
                        showY = true;
                        showDs = true && !tooNarrowForAsandDs;
                        showAs = true && !tooNarrowForAsandDs;
                    }
                }
                if (pos % 2 == 0) {
                    showAllAs = true;
                    showAllDs = true;
                }
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
                ext = "mt";
                dOrtho = 0;
                if (pos == 2 ** gen - 1) {
                    showMT = true;
                    showDs = true && !tooNarrowForAsandDs;
                    showAs = true && !tooNarrowForAsandDs;
                }
                showAllAs = true;
                if (pos % 2 == 1) {
                    showAllDs = true;
                }
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                ext = "X";
                dOrtho = 0;
                if (FanChartView.XAncestorList.indexOf(ahnNum) > -1) {
                    showX = true;
                    showDs = true && !tooNarrowForAsandDs;
                    showAs = true && !tooNarrowForAsandDs;
                }

                showAllAs = true;
                showAllDs = true;
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                if (FanChartView.XAncestorList.indexOf(ahnNum) > -1) {
                    // HIGHLIGHT by X-chromosome inheritance
                    showX = true;
                }
                if (pos == 2 ** gen - 1) {
                    // AND/OR by mtDNA inheritance
                    showMT = true;
                }
                if (pos == 0) {
                    // AND/OR by Y-DNA inheritance
                    if (ahnNum > 1) {
                        showY = true;
                    } else if (
                        ahnNum == 1 &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                        thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male"
                    ) {
                        showY = true;
                    }
                }
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                if (ahnNum == 1) {
                    condLog(thePeopleList[FanChartView.myAhnentafel.list[1]]._data);
                    showDNAconf = true;
                } else {
                    let childAhnNum = Math.floor(ahnNum / 2);
                    if (ahnNum % 2 == 0) {
                        // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                        if (thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30) {
                            showDNAconf = true;
                        }
                    } else {
                        // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                        if (thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30) {
                            showDNAconf = true;
                        }
                    }
                }
            }
        }

        // OK - so by now we have all the showXXX variables set to TRUE or FALSE
        // and also the ext variable may or may not have a specific type of DNA type as its value (used in IDs / Class names for created objects later on ... trust me ...)
        // AND ... if the current genNum / ahnNum person warrants display when the ALL LINKS is selected, then the showAllDs / showAllAs variables should also set to TRUE

        // GENERIC Image Variables that will be sent into the addDNAbadge function
        let imgX = 0;
        let imgY = 0;
        let imgAngle = 0;

        // EACH area used to be started with a complex IF statement -- leaving the structure because it chunks the code nicely visually, and for no other good reason

        // SHOW THE X DNA BADGE (gray with X)
        // ---- --- - --- -----  ---- ---- -
        if (1 == 1) {
            imgX = newX * dFraction + dOrthoNudge * newY;
            imgY = newY * dFraction - dOrthoNudge * newX;
            imgAngle = nameAngle;

            if (thisGenNum == 0) {
                imgY = 100;
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                showX = false;
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                showX = true;
            }

            if (showX) {
                // condLog("SHOW THE [ X ] image for DNA highlights");
                FanChartView.addNewDNAbadge(imgX, imgY, "X", imgAngle, "", ahnNum);
            }
        }

        // SHOW THE Y DNA BADGE (blue with Y)
        // ---- --- - --- -----  ---- ---- -
        if (1 == 1) {
            imgX = newX * dFraction + dOrtho * newY + dOrthoNudge * newY;
            imgY = newY * dFraction - dOrtho * newX - dOrthoNudge * newX;
            imgAngle = nameAngle;
            if (thisGenNum == 0) {
                imgY = 100;
                imgX = 0 - (35 * dOrtho) / 0.13;
                condLog("@GenNum == 0 ; dOrtho = ", dOrtho);
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                showY = false;
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                showY = true;
            }
        }
        if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
            showY = false;
        } else if (
            FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
            FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
            showAllAs == true
        ) {
            showY = true;
        }

        if (
            thePeopleList[FanChartView.myAhnentafel.list[1]] &&
            thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
            thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female"
        ) {
            showY = false;
            if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                showDs = false;
                showAs = false;
            }

            if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true &&
                thisGenNum > 0
            ) {
                showY = true;
            }
        }

        if (showY) {
            // condLog("SHOW THE [ Y ] image for DNA highlights");
            FanChartView.addNewDNAbadge(imgX, imgY, "Y", imgAngle, "", ahnNum);
        }

        // SHOW THE mt DNA BADGE (pink with red mt)
        // ---- --- -- --- -----  ---- ---- --- --
        if (1 == 1) {
            imgX = newX * dFraction - dOrtho * newY + dOrthoNudge * newY;
            imgY = newY * dFraction + dOrtho * newX - dOrthoNudge * newX;
            imgAngle = nameAngle;
            if (thisGenNum == 0) {
                imgY = 100;
                imgX = (35 * dOrtho) / 0.13;
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                showMT = false;
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "mtDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                showMT = true;
            }

            if (showMT) {
                // condLog("SHOW THE [ MT ] image for DNA highlights");
                FanChartView.addNewDNAbadge(imgX, imgY, "MT", imgAngle, "", ahnNum);
            }
        }

        // SHOW THE Descendants Link icon  BADGE (green)
        // ---- --- ----------- ---- ----  -----  -----
        if (1 == 1) {
            let theLink =
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/890#" +
                ext;
            // condLog(theLink);
            imgX = newX * dFraction - dOrtho2 * newY + dOrthoNudge * newY;
            imgY = newY * dFraction + dOrtho2 * newX - dOrthoNudge * newX;
            imgAngle = nameAngle;
            if (thisGenNum == 0) {
                imgY = 100;
                imgX = 35;
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                showDs = false;
            } else if (
                ext > "" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllDs == true
            ) {
                showDs = !tooNarrowForAsandDs;

                if (
                    FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female" &&
                    thisGenNum == 0
                ) {
                    showDs = false;
                    showAs = false;
                }
            }

            if (showDs) {
                // condLog("SHOW THE [ Ds ] image for DNA highlights");
                FanChartView.addNewDNAbadge(imgX, imgY, "Ds", imgAngle, theLink, ahnNum);
            }
        }

        // SHOW THE Ancestors Link icon  BADGE (green)
        // ---- --- ----------- ---- ----  -----  -----
        if (1 == 1) {
            let theLink =
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/89#" +
                ext;
            imgX = newX * dFraction + dOrtho2 * newY + dOrthoNudge * newY;
            imgY = newY * dFraction - dOrtho2 * newX - dOrthoNudge * newX;
            imgAngle = nameAngle; //- 90;
            if (thisGenNum == 0) {
                imgY = 100;
                imgX = -35;
            }

            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                showAs = false;
            } else if (
                ext > "" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                showAs = !tooNarrowForAsandDs;
                if (
                    FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female" &&
                    thisGenNum == 0
                ) {
                    showDs = false;
                    showAs = false;
                }
            }

            if (showAs) {
                // condLog("SHOW THE [ As ] image for DNA highlights");
                FanChartView.addNewDNAbadge(imgX, imgY, "As", imgAngle, theLink, ahnNum);
            }
        }

        // SHOW THE DNA Confirmation BADGE (orange)
        // ---- --- ---------------- -----  ------
        if (1 == 1) {
            let theLink =
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/899";
            imgX = newX * (gen > 5 ? (newR + 10) / newR : dFraction) + dOrtho * newY;
            imgY = newY * (gen > 5 ? (newR + 10) / newR : dFraction) - dOrtho * newX;
            imgAngle = nameAngle;
            if (thisGenNum == 0) {
                imgY = 100;
                imgX = 0 - 37.5;
            }

            if (FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                showDNAconf = false;
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll"
            ) {
                showDNAconf = true;
            }

            if (showDNAconf) {
                // condLog("SHOW THE [ DNAconf ] image for DNA highlights");
                FanChartView.addNewDNAbadge(imgX, imgY, "DNAconf", imgAngle, theLink, ahnNum);
            }
        }
    }

    function doHighlightFor(gen, pos, ahnNum) {
        if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
            if (
                thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female"
            ) {
                return false;
            }
            if (pos == 0) {
                if (ahnNum > 1) {
                    return true;
                } else if (
                    ahnNum == 1 &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male"
                ) {
                    return true;
                }
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
            if (pos == 2 ** gen - 1) {
                return true;
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
            if (FanChartView.XAncestorList.indexOf(ahnNum) > -1) {
                return true;
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
            if (FanChartView.XAncestorList.indexOf(ahnNum) > -1) {
                // HIGHLIGHT by X-chromosome inheritance
                return true;
            } else if (pos == 2 ** gen - 1) {
                // OR by mtDNA inheritance
                return true;
            } else if (pos == 0) {
                // OR by Y-DNA inheritance
                if (
                    thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female"
                ) {
                    return false;
                }
                if (ahnNum > 1) {
                    return true;
                } else if (
                    ahnNum == 1 &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                    thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male"
                ) {
                    return true;
                }
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
            if (ahnNum == 1) {
                condLog(thePeopleList[FanChartView.myAhnentafel.list[1]]._data);
                return true;
            } else {
                let childAhnNum = Math.floor(ahnNum / 2);
                if (ahnNum % 2 == 0) {
                    // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                    if (thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30) {
                        return true;
                    }
                } else {
                    // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                    if (thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30) {
                        return true;
                    }
                }
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "cat") {
            let catNameSelector = document.getElementById("highlight_options_catName");
            let rawValue = catNameSelector.value.trim();
            let spacelessValue = catNameSelector.value.trim().replace(/ /g, "_");
            let searchPrefix = "[[Category:";
            condLog("Looking for BIOs that Have the following: ", rawValue, "or", spacelessValue);
            if (rawValue.length == 0) {
                return false;
            }
            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) >
                    -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
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
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                        thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio &&
                        (thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                            "{{" + catNameSelector.value
                        ) > -1 ||
                            thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                                "{{ " + catNameSelector.value
                            ) > -1)
                    ) {
                        return true;
                    }
                }
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioText") {
            let bioTextSelector = document.getElementById("highlight_options_bioText");
            condLog("Looking for BIOs that Have the following: ", bioTextSelector.value);
            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio
                    .toUpperCase()
                    .indexOf(bioTextSelector.value.toUpperCase()) > -1
            ) {
                return true;
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioCheckOK") {
            // condLog("Check Bio:", ahnNum, thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].bioHasSources);
            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].bioHasSources == true
            ) {
                return true;
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioCheckFail") {
            // condLog("Check Bio:", ahnNum, thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].bioHasSources);

            let theBioCheck = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck;
            // isMarkedUnsourced;
            // hasStyleIssues;

            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck &&
                (thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].bioHasSources == false ||
                    theBioCheck.isMarkedUnsourced())
            ) {
                return true;
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "bioCheckStyle") {
            // condLog("Check Bio:", ahnNum, thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].bioHasSources);
            let theBioCheck = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck;

            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck &&
                theBioCheck.hasStyleIssues()
            ) {
                return true;
            }
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
            let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
            let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
            let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

            let bornByDate = "";
            let deadByDate = "";

            let inputDate = 1950 + "-" + aliveMMMSelector.value + "-" + aliveDDSelector;
            if (aliveYYYYSelector.value > 1) {
                inputDate = aliveYYYYSelector.value + "-" + aliveMMMSelector.value + "-" + aliveDDSelector.value;
            }

            if (ahnNum > 64 && thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]) {
                condLog(
                    "Looking for alive by ",
                    inputDate,
                    { ahnNum },
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.BirthDate,
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.DeathDate,
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]
                );
            }

            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data &&
                !thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.IsLiving
            ) {
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.IsLiving = !(
                    thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.DeathDate > "0000"
                );
            }
            if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.BirthDate &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.BirthDate <= inputDate &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.IsLiving == false &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.DeathDate &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.DeathDate > inputDate
            ) {
                return true;
            } else if (
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.BirthDate &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.BirthDate <= inputDate &&
                thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.IsLiving == true
            ) {
                return true;
            }
        }

        return false;
    }
    function populateXAncestorList(ahnNum) {
        if (ahnNum == 1) {
            FanChartView.XAncestorList = [1];
            if (
                thePeopleList[FanChartView.myAhnentafel.list[1]] &&
                thePeopleList[FanChartView.myAhnentafel.list[1]]._data &&
                thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female"
            ) {
                populateXAncestorList(2); // a woman inherits an X-chromosome from her father
                populateXAncestorList(3); // and her mother
            } else {
                populateXAncestorList(3); // whereas a man inherits an X-chromosome only from his mother
            }
        } else {
            FanChartView.XAncestorList.push(ahnNum);
            if (ahnNum < 2 ** FanChartView.maxNumGens) {
                if (ahnNum % 2 == 1) {
                    populateXAncestorList(2 * ahnNum); // a woman inherits an X-chromosome from her father
                    populateXAncestorList(2 * ahnNum + 1); // and her mother
                } else {
                    populateXAncestorList(2 * ahnNum + 1); // whereas a man inherits an X-chromosome only from his mother
                }
            }
        }
    }

    function fillOutFamilyStatsLocsForAncestors() {
        condLog("fillOutFamilyStatsLocsForAncestors");
        categoryList = [];
        stickerList = [];
        for (let index = 1; index < 2 ** FanChartView.maxNumGens; index++) {
            const thisPerp = thePeopleList[FanChartView.myAhnentafel.list[index]];
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
                    // thisPerp._data.bio
                );
            }
        }
    }

    function findCategoriesOfAncestors() {
        // condLog("function findCategoriesOfAncestors");
        categoryList = [];
        stickerList = [];
        let stickerInnerHTML =
            '<option selected value="-999">Do not use Badge #666#</option><option>CATEGORIES</option>';
        for (let index = 1; index < 2 ** FanChartView.numGens2Display; index++) {
            const thisPerp = thePeopleList[FanChartView.myAhnentafel.list[index]];
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

        let otherList = [
            "DNA confirmed",
            "Created by me",
            "Managed by me",
            "Bio Check: style issues",
            "Bio Check: no sources",
        ];
        stickerInnerHTML += "<option>OTHERS:</option>";
        // innerCatHTML += '<option value="Other">OTHERS:</option>';
        for (let i = 0; i < otherList.length; i++) {
            const cat = otherList[i];
            // innerCatHTML += '<option value="' + cat + '">' + cat + "</option>";
            stickerInnerHTML += '<option value="' + (0 - 5 - 5 * i) + '">' + cat + "</option>";
        }

        catNameSelector.innerHTML = innerCatHTML;
        for (i = 1; i <= numOfBadges; i++) {
            document.getElementById("stickerCategoryDropDownList" + i).innerHTML = stickerInnerHTML.replace("#666#", i);
            // condLog("Updating and checking : Badge # ", i, ":", currentBadges[i]);
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
                    FanChartView.updateBadgesToShow(i);
                } else if (stickerList.indexOf(currentBadges[i]) > -1) {
                    document.getElementById("stickerCategoryDropDownList" + i).value =
                        categoryList.length + stickerList.indexOf(currentBadges[i]);
                    FanChartView.updateBadgesToShow(i);
                } else if (otherList.indexOf(currentBadges[i]) > -1) {
                    document.getElementById("stickerCategoryDropDownList" + i).value =
                        0 - 5 - 5 * otherList.indexOf(currentBadges[i]);
                    FanChartView.updateBadgesToShow(i);
                }
            }
        }

        // Look again to see if the current outer ring needs its peeps highlighted or not
        if (FanChartView.currentSettings["highlight_options_showHighlights"] == true) {
            for (let pos = 0; pos < 2 ** (FanChartView.numGens2Display - 1); pos++) {
                let ahnNum = 2 ** (FanChartView.numGens2Display - 1) + pos;
                let doIt = doHighlightFor(FanChartView.numGens2Display, pos, ahnNum);
                if (doIt == true) {
                    let theInfoBox = document.getElementById("wedgeBoxFor" + ahnNum);
                    if (theInfoBox) {
                        theInfoBox.setAttribute("style", "background-color: " + "yellow");
                    }
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

    function fillOutFamilyStatsLocsForPerp(thisPerp) {
        condLog("fillOutFamilyStatsLocsForPerp");
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
            if (thisPerp._data["Bio"]) {
                condLog(thisPerp._data.FirstName, "has a BIO !");
            }
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

        let settingForPalette = FanChartView.currentSettings["colour_options_palette"];
        let settingForColourBy = FanChartView.currentSettings["colour_options_colourBy"];

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
        let settingForColourBy = FanChartView.currentSettings["colour_options_colourBy"];
        // WHILE we're here, might as well get the sub-settings if Family or Location colouring is being used ...
        let settingForSpecifyByFamily = FanChartView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = FanChartView.currentSettings["colour_options_specifyByLocation"];

        let settingForPalette = FanChartView.currentSettings["colour_options_palette"];

        let thisColourArray = getColourArray();

        let overRideByHighlight = false; //
        if (FanChartView.currentSettings["highlight_options_showHighlights"] == true) {
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
                for (var i = 0; i < FanChartView.numGens2Display; i++) {
                    thisColourArray[FanChartView.numGens2Display - i] = Rainbow8[i];
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
                let thisAge = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.age;
                if (thisAge == undefined) {
                    let thePerp = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]];
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
            } else if (settingForSpecifyByFamily == "numSpouses") {
                let thePerp = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]];
                if (thePerp && thePerp._data.Spouses && thePerp._data.Spouses.length >= 0) {
                    return thisColourArray[thePerp._data.Spouses.length];
                } else {
                    return "white";
                }
            } else if (settingForSpecifyByFamily == "siblings") {
            }
        } else if (settingForColourBy == "Location") {
            let locString = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data[settingForSpecifyByLocation];
            if (settingForSpecifyByLocation == "BirthDeathCountry") {
                locString = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data["DeathCountry"];
            } else if (settingForSpecifyByLocation == "DeathBirthCountry") {
                locString = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data["BirthCountry"];
            }

            if (locString == undefined) {
                let thisPerp = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]];
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
        } else if (settingForColourBy == "BioCheck") {
            let BioStatuses = [
                "No birth nor death dates",
                "Marked Unsourced",
                "==Sources== or &lt;references/> ?",
                "No sources found",
                "Style issues",
                "Bio Check Pass: has sources",
            ];
            if (!thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck) {
                return thisColourArray[0];
            }
            let theBioCheck = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck;
            // let theStyles = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].biocheck.styles;
            let hasSources = thePeopleList[FanChartView.myAhnentafel.list[ahnNum]].bioHasSources;
            condLog(theBioCheck);

            // if (theBioCheck.isEmpty() ) {
            //     return thisColourArray[1];
            // } else
            if (theBioCheck.isUndated()) {
                return thisColourArray[2];
            } else if (theBioCheck.isMarkedUnsourced()) {
                return thisColourArray[5];
            } else if (hasSources == false) {
                return thisColourArray[5];
            } else if (theBioCheck.isMissingReferencesTag()) {
                return thisColourArray[8];
            } else if (theBioCheck.isMissingSourcesHeading()) {
                return thisColourArray[8];
            } else if (theBioCheck.hasStyleIssues()) {
                return thisColourArray[8];
            } else if (hasSources == true) {
                return "lime";
            } else {
                return thisColourArray[0];
            }
        } else if (settingForColourBy == "DNAstatus") {
            let DNAStatuses = ["unknown", "Confirmed by DNA", "Confident", "Uncertain", "Non-biological"];

            if (ahnNum == 1) {
                return "white";
            }
            let childAhnNum = Math.floor(ahnNum / 2);
            let theStatusNum = 0;

            if (ahnNum % 2 == 0) {
                // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                if (
                    thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father
                ) {
                    theStatusNum = thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father;
                } else {
                    return "white";
                }
            } else if (ahnNum > 1) {
                // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                if (
                    thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]] &&
                    thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother
                ) {
                    theStatusNum = thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother;
                } else {
                    return "white";
                }
            }

            //    console.log("Status For ", ahnNum, " is ", theStatusNum) ;

            if (theStatusNum == 30) {
                return thisColourArray[1];
            } else if (theStatusNum == 20) {
                return thisColourArray[4];
            } else if (theStatusNum == 10) {
                return thisColourArray[7];
            } else if (theStatusNum == 5) {
                return thisColourArray[10];
            } else {
                return "white";
            }
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

    // Used this function to conditionally turn on / off the FanDoku link - but - now we want it on all the time
    // FanChartView.getCheckIn = function () {
    //     var API_URL = "https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/views/fandoku/ok.php";
    //     fetch(API_URL)
    //         .then((response) => response.text())
    //         .then((data) => {
    //             // condLog("GOT THE DATA:", data);
    //             FanChartView.showFandokuLink = data;
    //             return data;
    //         });
    // }

    function test4ColourMatches() {
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

        let allArrays = [
            PastelsArray,
            RainbowArray,
            RainbowArrayLong,
            Rainbow8,
            RainbowTweens,
            GreysArrayOrig,
            AltGreysArray,
            GreysArray,
            RedsArray,
            BluesArray,
            GreensArray,
            AltRedsArray,
            AltBluesArray,
            AltGreensArray,
            ColourArray,
        ];

        for (let a = 0; a < allArrays.length; a++) {
            const element = allArrays[a];
            for (let b = 0; b < element.length; b++) {
                const clr = element[b];
                if (clr.indexOf("#") == -1) {
                    condLog("TEST the clr:", clr);
                    let wasFound = false;
                    for (let c = 0; c < FullColoursArray.length; c++) {
                        const fc = FullColoursArray[c];
                        if (fc[1].toUpperCase() == clr.toUpperCase()) {
                            condLog("FOUND ", fc);
                            wasFound = true;
                            break;
                        }
                    }
                    if (!wasFound) {
                        condLog("TEST - COULD NOT FIND COLOUR:", clr);
                    }
                }
            }
        }
    }

    function appendSVGChild(elementType, target, attributes = {}, text = "") {
        // console.log("appending SVG Child", attributes);
        const element = document.createElementNS("http://www.w3.org/2000/svg", elementType);
        Object.entries(attributes).map((a) => element.setAttribute(a[0], a[1]));
        if (text) {
            const textNode = document.createTextNode(text);
            element.appendChild(textNode);
        }
        // condLog("element:", element);
        target.appendChild(element);
        return element;
    }

    FanChartView.addNewBadge = function (newX, newY, badgeNum, nameAngle) {
        let theSVG = FanChartView.theSVG;
        if (isNaN(newX)) {
            newX = 0;
        }
        if (isNaN(newY)) {
            newY = 0;
        }
        // condLog(theSVG, newX, newY);
        // for (key in theSVG) {
        //     // condLog(": ", key, theSVG[key]);
        // }
        // condLog(theSVG.nodes());
        // condLog(theSVG.nodes()[0]);
        // condLog(theSVG.nodes()[0].firstChild);
        // condLog(theGobj);
        // condLog("ADD NEW BADGE !", theSVG);
        // this.removePopups();

        let theSVG2 = theSVG.nodes()[0].firstChild;

        // condLog("theSVG2 = ", theSVG2);

        // var popup = theSVG2.append("<g><rect width=240 height=240></rect></g>").attr("class", "popup");

        var thisBadge = appendSVGChild("g", theSVG2, {
            class: "badge badge" + badgeNum,
            transform: "translate(" + newX + "," + newY + ") rotate( " + nameAngle + " ) scale(" + 1 + ")",
        });
        let thisRect = appendSVGChild("rect", thisBadge, { width: 30, height: 30, rx: 10, ry: 10 });
        thisRect.style.fill = badgeClr[badgeNum];
        thisRect.style.stroke = "black";
        thisRect.style["stroke-width"] = 2;

        let thisLabel = appendSVGChild(
            "text",
            thisBadge,
            { "font-weight": "bold", "fill": "white", "x": 10, "y": 22, "font-size": 20 },
            FanChartView.badgeCharacters[badgeNum]
        );

        // condLog("thisBadge:", thisRect, thisLabel,  thisBadge);
    };

    FanChartView.removeBadges = function (badgeNum = "") {
        // condLog("Tree.prototype - REMOVE POPUPS (plural) function");
        // condLog("Remove Badges # ", badgeNum);
        d3.selectAll(".badge" + badgeNum).remove();
    };

    FanChartView.addNewDNAbadge = function (newX, newY, badgeType, nameAngle, link, ahnNum) {
        let theSVG = FanChartView.theSVG;
        let theSVG2 = theSVG.nodes()[0].firstChild;
        if (isNaN(newX)) {
            newX = 0;
        }
        if (isNaN(newY)) {
            newY = 0;
        }
        let DNAbadgeClr = { X: "green", Y: "blue", MT: "red", As: "white", Ds: "white", DNAconf: "orange" };
        let DNAbadgeFill = {
            X: "lightgray",
            Y: "lightblue",
            MT: "pink",
            As: "white",
            Ds: "white",
            DNAconf: "#e9f1d1",
        };
        let DNAbadgeStroke = {
            X: "#111111",
            Y: "blue",
            MT: "red",
            As: "darkgreen",
            Ds: "darkgreen",
            DNAconf: "orange",
        };
        let DNAbadgeStrokeWidth = { X: 5, Y: 5, MT: 3, As: 2, Ds: 2, DNAconf: 4 };

        let thisBadgeID = "badgeDNA-" + badgeType + "-" + ahnNum;

        if (document.getElementById(thisBadgeID)) {
            //condLog("Already have this badge:", thisBadgeID);
            document
                .getElementById(thisBadgeID)
                .setAttribute(
                    "transform",
                    "translate(" + newX + "," + newY + ") rotate( " + nameAngle + " ) scale(" + 1 + ")"
                );
            return;
        }

        let DNAbadgeSVG = {
            X: "M 8 5 L 22 25 M 22 5 L 8 25",
            Y: "M 8 5 L 15 15 L 15 25 M 15 15 L 22 5",
            MT: "M 5 23 L 5 18 L 7 17 L 9 17 L 11 18 L 11 23 M 5 18 L 5 16 M 11 18 L 13 17 L 15 17 L 17 18 L 17 23 M 22 8 L 22 23 L 25 24 M 18 13 L 26 13",
            As: "M 3 15 L 12 15 M 26 5 L 19 5 L 19 13 L 26 13  M 26 17 L 19 17 L 19 25 L 26 25  M 19 9 L 12 9 L 12 21 L 19 21",
            Ds: "M 4 5 L 10 5 L 10 9 L 24 9 M 16 9 L 16 13 L 24 13 M 10 9 L 10 19 L 24 19 M 16 19 L 16 23 L 24 23 M 16 23 L 16 27 L 24 27",
            DNAconf:
                "M 5 4 L 5 25 L 15 25 L 19 21 L 21 18 L 21 12 L 19 9 L 15 5 L 5 5  M 30 25 L 30 5 L 46 25 L 46 5 M 55 25 L 63 5 L 71 25 M 59 19 L 67 19",
        };
        // condLog("theSVG2 = ", theSVG2);
        let checkmarkSVG = "M 72 12 L 77 20 L 87 0";

        var thisBadge = appendSVGChild("g", theSVG2, {
            class: "badgeDNA badgeDNA-" + badgeType,
            id: thisBadgeID,
            transform: "translate(" + newX + "," + newY + ") rotate( " + nameAngle + " ) scale(" + 1 + ")",
        });
        let thisRect = appendSVGChild("rect", thisBadge, {
            width: badgeType == "DNAconf" ? 92 : 30,
            height: 30,
            rx: 10,
            ry: 10,
        });
        thisRect.style.fill = DNAbadgeFill[badgeType];
        thisRect.style.stroke = DNAbadgeStroke[badgeType];
        thisRect.style["stroke-width"] = 1;

        let thisPath = appendSVGChild("path", thisBadge, {
            "fill": "none",
            "stroke": DNAbadgeStroke[badgeType],
            "stroke-width": DNAbadgeStrokeWidth[badgeType],
            "d": DNAbadgeSVG[badgeType],
        });

        if (badgeType == "DNAconf") {
            let checkmarkSVG = "M 72 12 L 77 20 L 87 0";
            appendSVGChild("path", thisBadge, {
                "fill": "none",
                "stroke": "#07db07",
                "stroke-width": DNAbadgeStrokeWidth[badgeType],
                "d": checkmarkSVG,
            });
        }

        if (link > "") {
            // condLog("Adding link:", link);
            thisRect.setAttribute("onclick", "location.assign('" + link + "')");
            thisRect.setAttribute("cursor", "pointer");
            thisPath.setAttribute("onclick", "location.assign('" + link + "')");
            thisPath.setAttribute("cursor", "pointer");
        }

        // let thisImgHolder = appendSVGChild("foreignObject", thisBadge, { class:"centered imgHolder" , width:"40px", height:"40px" });
        // let thisImgDIV = appendSVGChild("div", thisImgHolder, { class:"imgDIV" });

        // let thisBadgeImg = appendSVGChild(
        //     "img",
        //     thisImgDIV,
        //     { height:24, "src": "https://www.wikitree.com/images/icons/dna/X.gif" }
        // );

        // condLog("thisBadge:",  thisBadge);
    };

    // FanChartView.removeBadges = function (badgeType = "") {
    //     // condLog("FanChartView.removeBadges function : ", badgeType);
    //     d3.selectAll(".badge" + badgeType).remove();
    // };

    $(document).off("keyup", Utils.closeTopPopup).on("keyup", Utils.closeTopPopup);
})();
