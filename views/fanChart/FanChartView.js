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
 */
(function () {
    const APP_ID = "FanChart";
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;
    font4Name = "SansSerif";
    font4Info = "SansSerif";

    /**
     * Constructor
     */
    var FanChartView = (window.FanChartView = function () {
        Object.assign(this, this?.meta());
    });

    const PRINTER_ICON = "&#x1F4BE;";
    const SETTINGS_GEAR = "&#x2699;";
    const LEGEND_CLIPBOARD = "&#x1F4CB;";

    var uniqueLocationsArray = [];
    var theSortedLocationsArray = [];

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

    let stickerClr = ["white", "red", "green", "blue", "orange"];

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

    FanChartView.prototype.init = function (selector, startId) {
        // condLog("FanChartView.js - line:18", selector) ;
        // let theCheckIn =  FanChartView.getCheckIn();
        // // condLog("theCheckIN:", theCheckIn);
        // FanChartView.showFandokuLink = theCheckIn;

        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;
        FanChartView.fanchartSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "FanChartView",
            tabs: [
                {
                    name: "general",
                    label: "General",
                    hideSelect: true,
                    subsections: [{ name: "FanChartGeneral", label: "General settings" }],
                    comment:
                        "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
                },
                {
                    name: "names",
                    label: "Names",
                    hideSelect: true,
                    subsections: [{ name: "FanChartNames", label: "NAMES format" }],
                    comment: "These options apply to how the ancestor names will displayed in each Fan Chart cell.",
                },
                {
                    name: "dates",
                    label: "Dates",
                    hideSelect: true,
                    subsections: [{ name: "FanChartDates", label: "DATES of events     " }],
                    comment: "These options apply to the Date format to use for birth, marriages, & deaths.",
                },
                {
                    name: "places",
                    label: "Places",
                    hideSelect: true,
                    subsections: [{ name: "FanChartPlaces", label: "PLACES of events     " }],
                    comment: "These options apply to the Places displayed for birth, marriages, & deaths.",
                },
                {
                    name: "photos",
                    label: "Photos",
                    hideSelect: true,
                    subsections: [{ name: "FanChartPhotos", label: "PHOTOS    " }],
                    comment: "These options determine if photos are displayed or not.",
                },
                {
                    name: "colours",
                    label: "Colours",
                    hideSelect: true,
                    subsections: [{ name: "FanChartColours", label: "COLOURS   " }],
                    comment: "These options apply to the colours in the Fan Chart cells.",
                },
                {
                    name: "highlights",
                    label: "Highlights",
                    hideSelect: true,
                    subsections: [{ name: "FanChartHighlights", label: "HIGHLIGHTING   " }],
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
                            defaultValue: "none",
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
                            label: "Add Badges to ancestors",
                            type: "checkbox",
                            defaultValue: false,
                        },
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
                            defaultValue: false,
                            indent: 3,
                        },
                        {
                            optionName: "marriageAtTopEarlyGens",
                            label: "Slide Marriage Date box to top (for first 5 generations)",
                            type: "checkbox",
                            defaultValue: false,
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
                                // { value: "Town", text: "Place name" },
                                // { value: "Region", text: "Region (Province/State)" },
                                // { value: "Country", text: "Country" },
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
                                { value: "DNAinheritance", text: "X/Y/mt DNA inheritance" },
                                { value: "DNAconfirmed", text: "DNA confirmed ancestors" },
                                { value: "-", text: "-" },
                                { value: "aliveDay", text: "Alive on this Day" },
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

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<div id=btnBarDIV><table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%" style="padding-left:10px;"><A onclick="FanChartView.maxAngle = 360; FanChartView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan360.png" /></A> |' +
            ' <A onclick="FanChartView.maxAngle = 240; FanChartView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></A> |' +
            ' <A onclick="FanChartView.maxAngle = 180; FanChartView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            '<td width="5%">&nbsp;' +
            '<span id=legendASCII style="display:none;"><A onclick="FanChartView.toggleLegend();"><font size=+2>' +
            LEGEND_CLIPBOARD +
            "</font></A></span>" +
            "</td>" +
            '<td width="30%" align="center">' +
            ' <A onclick="FanChartView.numGens2Display -=1; FanChartView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>5</span> generations ]" +
            ' <A onclick="FanChartView.numGens2Display +=1; FanChartView.redraw();"> +1 </A> ' +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="30%" align="right"  style="padding-right:10px;">' +
            ' <A onclick="FanChartView.toggleSettings();"><font size=+2>' +
            SETTINGS_GEAR +
            "</font></A>&nbsp;&nbsp;</td>" +
            '</tr></table></div><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Fan Chart is loading ...</DIV>';

        var settingsHTML = "";
        settingsHTML += FanChartView.fanchartSettingsOptionsObject.createdSettingsDIV; // +

        var badgesHTML =
            "<div id=BRbetweenLegendAndStickers><br/></div><div id=stickerLegend><H3 class=quarterEmBottomMargin>Badges</H3>";
        var stickerCatNameSelectorHTML =
            "<select id='stickerCategoryDropDownList1' class='optionSelect selectSimpleDropDown' onchange='FanChartView.updateBadgesToShow(1);'><option value=-999>Do not use Badge 1</option></select><br/>";
        for (let i = 1; i <= 4; i++) {
            
            badgesHTML +=
                "<svg width=24 height=24><rect width=24 height=24 rx=12 ry=12 style='fill:" +
                stickerClr[i] +
                ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=7 y=17 fill='white'>" +
                i +
                "</text></svg>" +
                stickerCatNameSelectorHTML.replace(/1/g,i);
        }
        
        badgesHTML +=  "</div>";
        let highlightHTML =
            "<div id=highlightDescriptor><br/><span class='fontBold selectedMenuBarOption'>HIGHLIGHT people</span> = <span id=highlightPeepsDescriptor>Thirty-somethings...</span><br/><br/></div>";

        var legendHTML =
            '<div id=legendDIV style="display:none; position:absolute; left:20px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left"><A onclick="FanChartView.hideLegend();">[ <B><font color=red>x</font></B> ]</A></span>' + highlightHTML +
            "<H3 class=quarterEmBottomMargin id=LegendTitleH3><span id=LegendTitle></span></H3><div id=refreshLegend style='display:none'><A onclick='FanChartView.refreshTheLegend();'>Update Legend</A></DIV><div id=innerLegend></div>" +
            badgesHTML +
            "</div>";

        // condLog("SETTINGS:",settingsHTML);

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
        container.innerHTML = btnBarHTML + legendHTML + settingsHTML;

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));
        
        function settingsChanged(e) {
            if (FanChartView.fanchartSettingsOptionsObject.hasSettingsChanged(FanChartView.currentSettings)) {
                // condLog("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                condLog("NEW settings are:", FanChartView.currentSettings);

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

                if (showBadges || colourBy == "Family" || colourBy == "Location") {
                    legendDIV.style.display = "block";
                    stickerLegend.style.display = "block";
                    legendToggle.style.display = "inline-block";
                    if (colourBy == "Family" || colourBy == "Location") {
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
                        };
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


            if (FanChartView.currentSettings["highlight_options_showHighlights"] == true) {
                legendDIV.style.display = "block";
                legendToggle.style.display = "inline-block";

                document.getElementById("highlightDescriptor").style.display = "block";
                if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                    document.getElementById("highlightPeepsDescriptor").textContent = "Y DNA ancestors";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "mitochondrial DNA (mtDNA) ancestors";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                    document.getElementById("highlightPeepsDescriptor").textContent = "X Chromosome inheritance path";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                    document.getElementById("highlightPeepsDescriptor").textContent =
                        "X, Y, mitochondrial DNA ancestors";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                    document.getElementById("highlightPeepsDescriptor").textContent = "Relationships confirmed by DNA";
                } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "cat") {
                    let catNameSelector = document.getElementById("highlight_options_catName");
                    let rawValue = catNameSelector.value.trim();
                    document.getElementById("highlightPeepsDescriptor").textContent = rawValue;
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

                FanChartView.myAncestorTree.draw();
            } else {
                // condLog("NOTHING happened according to SETTINGS OBJ");
            }


        }

        // NEXT STEPS : Assign thisVal to actual currentSetting object
        // NEXT STEPS : Transfer this function to SettingsObject class
        // NEXT STEPS : Return a True/False based on whether any changes were actually made --> THEN - call reDraw routine if needed

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
        const g = svg.append("g").attr("id","SVGgraphics");

        // Setup zoom and pan
        const zoom = d3
            .zoom()
            .scaleExtent([0.1, 1.5])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
            });
        svg.call(zoom);
        // svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));
        svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, 560).scale(0.45));

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

        for (let genIndex = FanChartView.maxNumGens - 1; genIndex >= 0; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                if (genIndex <= 1) {
                    // Use a SECTOR for the parents
                    g.append("path").attrs(
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
                    g.append("path").attrs(
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

        self.load(startId);
        // condLog(FanChartView.fanchartSettingsOptionsObject.createdSettingsDIV);
        FanChartView.fanchartSettingsOptionsObject.buildPage();
        FanChartView.fanchartSettingsOptionsObject.setActiveTab("names");
        FanChartView.currentSettings = FanChartView.fanchartSettingsOptionsObject.getDefaultOptions();

        // SOME minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let bkgdClrSelector = document.getElementById("colour_options_colourBy");
        let showMarriageSelector = document.getElementById("date_options_showMarriage");

        // condLog("bkgdClrSelector", bkgdClrSelector);
        bkgdClrSelector.setAttribute("onchange", "FanChartView.optionElementJustChanged();");
        showMarriageSelector.setAttribute("onchange", "FanChartView.optionElementJustChanged();");
        let specFamSelector = document.getElementById("colour_options_specifyByFamily");
        let specLocSelector = document.getElementById("colour_options_specifyByLocation");
        let specFamSelectorLabel = document.getElementById("colour_options_specifyByFamily_label");
        let specLocSelectorLabel = document.getElementById("colour_options_specifyByLocation_label");
        let specFamSelectorBR = document.getElementById("colour_options_specifyByFamily_BR");
        let specLocSelectorBR = document.getElementById("colour_options_specifyByLocation_BR");
        specLocSelector.style.display = "none";
        specFamSelector.style.display = "none";
        specLocSelectorLabel.style.display = "none";
        specFamSelectorLabel.style.display = "none";
        specLocSelectorBR.style.display = "none";
        specFamSelectorBR.style.display = "none";

        // SOME minor tweaking needed in the HIGHLIGHT tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let highlightSelector = document.getElementById("highlight_options_highlightBy");
        highlightSelector.setAttribute("onchange", "FanChartView.optionElementJustChanged();");
        let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        let howDNAlinksSelector = document.getElementById("highlight_options_howDNAlinks");
        let catNameSelector = document.getElementById("highlight_options_catName");
        let catNameSelectorLabel = document.getElementById("highlight_options_catName_label");
        catNameSelector.style.display = "none";
        catNameSelectorLabel.style.display = "none";

        let bioTextSelector = document.getElementById("highlight_options_bioText");
        let bioTextSelectorLabel = document.getElementById("highlight_options_bioText_label");
        bioTextSelector.style.display = "none";
        bioTextSelectorLabel.style.display = "none";

        let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
        let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
        let aliveDDSelector = document.getElementById("highlight_options_aliveDD");
        
        aliveYYYYSelector.parentNode.parentNode.style.display = "none";
        aliveMMMSelector.parentNode.style.display = "none";
        aliveDDSelector.parentNode.style.display = "none";
        

        condLog("TWEAKED the Highlights tab - how many categories I wonder ...", categoryList);
        // FanChartView.showFandokuLink = theCheckIn;

        // BEFORE we go further ... let's add the DNA objects, Stickers, and MarriageDateDIVs we might need later
        for (let genIndex = FanChartView.maxNumGens - 1; genIndex >= 0; genIndex--) {
            for (let index = 0; index < 2 ** genIndex; index++) {
                let ahnNum = index + 2 ** genIndex;
                g.append("g")
                    .attrs({
                        id: "imgDNA-x-" + genIndex + "i" + index,
                        class : "floatAbove"
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
                        class: "floatAbove",
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
                        class: "floatAbove",
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
                        class: "floatAbove",
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
                        class: "floatAbove",
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
                        class: "floatAbove",
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
                
                for (let stickerCounter = 1; stickerCounter <= 4; stickerCounter++) {
                    const stickerPrefix = "badge" + stickerCounter + "-";

                    g.append("g")
                        .attrs({
                            id: stickerPrefix + ahnNum,
                            class: "floatAbove",
                        })
                        .append("foreignObject")
                        .attrs({
                            id: stickerPrefix + ahnNum + "inner",
                            class: "centered",
                            width: "20px",
                            height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                            x: 25 * index,
                            y: 30 * genIndex + stickerCounter * 300,
                            //
                            style: "display:none;",
                        })

                        .style("overflow", "visible") // so the name will wrap
                        .append("xhtml:div")
                        .attrs({
                            id: stickerPrefix + ahnNum + "svg",
                        })
                        .html(
                            "<svg width=24 height=24><rect width=24 height=24 rx=12 ry=12 style='fill:" +
                                stickerClr[stickerCounter] +
                                ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=7 y=17 fill='white'>" +
                                stickerCounter +
                                "</text></svg>"
                        );
                }

                if (ahnNum % 2 == 0 && ahnNum < 32) {
                    // "Portrait-ish" if you're looking at it from the spokes from the centre perspective
                    g.append("g")
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
                            style: "display:none;",
                        })

                        .style("overflow", "visible") // so the name will wrap
                        .append("xhtml:div")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "-date",
                            class: "centered mDateBox",
                        })
                        .html("m.<br/>28 Aug<br/>1987");

                    // condLog("Created ", document.getElementById("mDateFor-" + ahnNum));

                } else if (ahnNum % 2 == 0 && ahnNum >= 32) {
                    // "Landscape-ish" if you're looking at it from the spokes from the centre perspective, ie, text is sideways
                    g.append("g")
                        .attrs({
                            id: "mDateFor-" + ahnNum,
                            class: "floatAbove",
                        })
                        .append("foreignObject")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "inner",
                            class: "centered mDateBox2",
                            width: "20px",
                            height: "20px", // the foreignObject won't display in Firefox if it is 0 height
                            // x: 25 * index,
                            // y: 30 * genIndex + 5 * 300,
                            //
                            style: "display:none;",
                        })

                        .style("overflow", "visible") // so the name will wrap
                        .append("xhtml:div")
                        .attrs({
                            id: "mDateFor-" + ahnNum + "-date",
                            class: "centered mDateBox2",
                        })
                        .html("m. 28 Aug 1987");

                    condLog("Created ", document.getElementById("mDateFor-" + ahnNum));
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
        updateLegendIfNeeded();
        FanChartView.redraw();
    };

    // and here's that Function that does the minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
    FanChartView.optionElementJustChanged = function () {
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
            // break4DNASelector.parentNode.style.display = "none";
            // howDNAlinksRadiosBR.parentNode.style.display = "none";
            // bioTextSelector.style.display = "none";
            // bioTextSelectorLabel.style.display = "none";
            catNameSelector.style.display = "inline-block";
            catNameSelectorLabel.style.display = "inline-block";
        } else if (highlightSelector.value == "aliveDay") {
            aliveYYYYSelector.parentNode.parentNode.style.display = "block";
            aliveMMMSelector.parentNode.style.display = "block";
            aliveDDSelector.parentNode.style.display = "block";
        

        } else if (highlightSelector.value == "bioText") {
            // break4DNASelector.parentNode.style.display = "none";
            // howDNAlinksRadiosBR.parentNode.style.display = "none";
            bioTextSelector.style.display = "inline-block";
            bioTextSelectorLabel.style.display = "inline-block";
            // catNameSelector.style.display = "none";
            // catNameSelectorLabel.style.display = "none";

        } else {
            break4DNASelector.parentNode.style.display = "block";
            howDNAlinksRadiosBR.parentNode.style.display = "inline-block";
            // catNameSelector.style.display = "none";
            // catNameSelectorLabel.style.display = "none";
            // bioTextSelector.style.display = "none";
            // bioTextSelectorLabel.style.display = "none";
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

    function showTemporaryMessageBelowButtonBar(theMessage, delay=3000) {
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
                APP_ID , id,
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
                    // "Bio",
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
                ],
                { 
                    ancestors: newLevel,
                    minGeneration: newLevel 
                }
            ).then(function (result) {
                if (result) {
                    // need to put in the test ... in case we get a null result, which we will eventually at the end of the line
                    FanChartView.theAncestors = result[2];
                    condLog("theAncestors:", FanChartView.theAncestors);
                    // condLog("person with which to drawTree:", person);
                    // for (let index = 0; index < FanChartView.theAncestors.length; index++) {
                    for (const index in  FanChartView.theAncestors) {
                        thePeopleList.add(FanChartView.theAncestors[index]);
                    }
                    FanChartView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    updateMyAhentafelMarriages();
                    FanChartView.workingMaxNumGens = Math.min(
                        FanChartView.maxNumGens,
                        FanChartView.numGensRetrieved + 1
                    );

                    clearMessageBelowButtonBar();
                    loadingTD.innerHTML = "&nbsp;";
                    loadBiosNow(id, newLevel);
                }
            });
        }
    }
    // Redraw the Wedges if needed for the Fan Chart
    function redoWedgesForFanChart() {
        // condLog("TIme to RE-WEDGIFY !", this, FanChartView);

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

                    //  condLog(SVGcode.id);
                    d3.select("#" + SVGcode.id).attrs({ d: SVGcode.d, display: "block" }); // CHANGE the drawing commands to adjust the wedge shape ("d"), and make sure the wedge is visible ("display:block")

                    let theWedge = d3.select("#" + SVGcode.id);
                    //  condLog( "theWedge:",theWedge[0][0] );
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
                }
            }
            FanChartView.lastAngle = FanChartView.maxAngle;
            FanChartView.lastNumGens = FanChartView.numGens2Display;
        }
    }

    var thisTextColourArray = {};
    function updateLegendIfNeeded() {
        condLog("DOING updateLegendIfNeeded");
        let settingForColourBy = FanChartView.currentSettings["colour_options_colourBy"];
        let settingForSpecifyByFamily = FanChartView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = FanChartView.currentSettings["colour_options_specifyByLocation"];
        let legendDIV = document.getElementById("legendDIV");
        let LegendTitle = document.getElementById("LegendTitle");
        let LegendTitleH3 = document.getElementById("LegendTitleH3");
        let innerLegendDIV = document.getElementById("innerLegend");

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
                    if (index > 0) { innerCode += "<br/>"}
                    innerCode +=  clrSwatchArray[index + 1] + " " + index * 10 + " - " + (index * 10 + 9);
                }
                innerCode += "<br/>" + clrSwatchArray[11] + " over 100";
            }
            condLog("thisTextColourArray", thisTextColourArray);
            innerLegendDIV.innerHTML = innerCode;
            legendDIV.style.display = "block";
        } else if (settingForColourBy == "Location") {
            // thisTextColourArray = {};
            // let thisColourArray = getColourArray();
            let innerCode = "";
            // LET's FIRST setup the ARRAY of UNIQUE LOCATIONS
            uniqueLocationsArray = [];
            for (let index = 1; index < 2 ** FanChartView.numGens2Display; index++) {
                const thisPerp = thePeopleList[FanChartView.myAhnentafel.list[index]];
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
            FanChartView.currentSettings["general_options_font4Info"] == font4Info
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
    // function getStyleRule(ruleClass, property, cssFile) {
    //     for (var s = 0; s < document.styleSheets.length; s++) {
    //         var sheet = document.styleSheets[s];
    //         if (sheet.href.endsWith(cssFile)) {
    //             var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
    //             if (rules == null) return null;
    //             for (var i = 0; i < rules.length; i++) {
    //                 if (rules[i].selectorText == ruleClass) {
    //                     // condLog("r:", rules[i].style[property] );
    //                     return rules[i].style[property];
    //                     //or rules[i].style["border"]="2px solid red";
    //                     //or rules[i].style["boxShadow"]="4px 4px 4px -2px rgba(0,0,0,0.5)";
    //                 }
    //             }
    //         }
    //     }
    //     return null;
    // }

    // function listStyleRules(ruleClass, property, cssFile) {
    //     for (var s = 0; s < document.styleSheets.length; s++) {
    //         var sheet = document.styleSheets[s];
    //         condLog("SS" + s, sheet);
    //         if (sheet) {
    //         //     if ( !sheet.cssRules) {
    //         //         // nothing to see here

    //         //     } else {

    //         //         var rules = sheet.cssRules ? sheet.cssRules : sheet.rules;
    //         //         if (rules == null) {
    //         //             // nothing to see here
    //         //         } else {
    //         //             // go through the rules
    //         //             for (var i = 0; i < rules.length; i++) {
    //         //                 condLog("ss" + s, "r" + i, rules[i].selectorText, rules[i].style);
    //         //                 // if (rules[i].selectorText == ruleClass) {
    //         //                     // condLog("r:", rules[i].style[property] );
    //         //                     // return rules[i].style[property];
    //         //                     //or rules[i].style["border"]="2px solid red";
    //         //                     //or rules[i].style["boxShadow"]="4px 4px 4px -2px rgba(0,0,0,0.5)";
    //         //                     // }
    //         //                 // }
    //         //             }
    //         //         }
    //         //     }
    //         }
    //     }
    //     return null;
    // }

    function updateMyAhentafelMarriages() {
        if (FanChartView.myAhnentafel.marriageList) {
            // OK - no problem - this exists!
        } else {
            FanChartView.myAhnentafel.marriageList = [];
        }

        for (index in FanChartView.myAhnentafel.list) {
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
                condLog("Marriage from updateMyAhentafelMarriages: #", index, "has", Guy, Gal, thisMarriage.MarriageDate, thisMarriage.MarriageLocation);
            }
        }
    }
    /** FUNCTION used to force a redraw of the Fan Chart, used when called from Button Bar after a parameter has been changed */
    FanChartView.redraw = function () {
        condLog("FanChartView.redraw");
        // listStyleRules();
        // condLog(document.styleSheets[0].cssRules);
        // condLog("Now theAncestors = ", FanChartView.theAncestors);
        // thePeopleList.listAll();
        recalcAndDisplayNumGens();
        redoWedgesForFanChart();
        FanChartView.myAncestorTree.draw();
        findCategoriesOfAncestors();
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
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    };
    FanChartView.toggleLegend = function () {
        // condLog("TIME to TOGGLE the SETTINGS NOW !!!", FanChartView.fanchartSettingsOptionsObject);
        // condLog(FanChartView.fanchartSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("legendDIV");
        condLog("SETTINGS ARE:", theDIV.style.display);
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
        condLog("FanChartView.prototype.load - 1958", id);
        var self = this;
        
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
                APP_ID , id,
            
                [
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
                    "DataStatus"
                ],
                {
                    ancestors:5
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
                        // condLog("ADDED ", thePerson);
                    }
                
                condLog("person:", person);

                  if (FanChartView.theAncestors[resultByKey[id].Id] == undefined) {
                    //   condLog("DANGER DANGER, MR. WILLIAM ROBINSON - WE HAVE A VERY PRIVATE ISSUE HERE ...", id);
                      let privatePerson = FanChartView.theAncestors[-1];
                    //   condLog(privatePerson);
                    //   condLog(privatePerson.Id, privatePerson.Mother, privatePerson.Father);
                    //   condLog(document.getElementById("wt-id-text").value);
                      privatePerson["Name"] = document.getElementById("wt-id-text").value
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
                            Id:102 , FirstName:"Private", Name:"Private-102", Gender:"Male", LastNameAtBirth:"Father"
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
                          Gender: "Female", LastNameAtBirth:"Mother"
                        
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
                clearMessageBelowButtonBar();
                populateXAncestorList(1);
                fillOutFamilyStatsLocsForAncestors();
                if (FanChartView.theAncestors[resultByKey[id].Id] == undefined) {
                    if (document.getElementById("wt-api-login").textContent.indexOf("Logged in") == -1) {
                        showTemporaryMessageBelowButtonBar("This is a private profile, with private parents. <br/>Log into the APPS server and try again.", 8000);
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
                        APP_ID , listOfIDs,
                    
                        [
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
                            "DataStatus"
                        ],
                        {
                            ancestors:4
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
                        populateXAncestorList(1);
                        fillOutFamilyStatsLocsForAncestors();

                        loadBiosNow(listOfIDs);

                        
                        showTemporaryMessageBelowButtonBar("The central person has a private profile.", 5000);
                    });
                }
                     
                } else {
                    loadBiosNow(id);
                }

                

            });
        });
    };

    // This function will load Bios in the background
    function loadBiosNow(id, whichGen = 5) {
        let options = { ancestors:5 };
        if (whichGen > 5) {
            options = { ancestors:whichGen, minGeneration:whichGen };
        }

        WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {}) 
                APP_ID , id,
            
                [
                    "Bio",
                ],
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
                condLog("DONE loading BIOS for ",whichGen, "generations from",id);
                findCategoriesOfAncestors();
            }
            );
        
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
        condLog("INITIAL _load - line:118", id) ;
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
        condLog("_load PersonObj:",thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    FanChartView.prototype.drawTree = function (data) {
        // condLog("FanChartView.prototype.drawTree");

        if (data) {
            // condLog("(FanChartView.prototype.drawTree WITH data !)");
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
            updateLegendIfNeeded();
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
                condLog("extraInfo setting:", FanChartView.currentSettings["general_options_extraInfo"] );
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
                        } class="box" style="background-color: ${theClr} ; border:0; padding: 0px;">
                        <div class="name fontBold font${font4Name}"    id=nameDivFor${
                        ancestorObject.ahnNum
                    } style="font-size: 10px;" >${getShortName(person)}</div>
                        </div>
                    `;
                } else if (thisGenNum == 8) {
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box" style="background-color: ${theClr} ; border:0; padding: 0px;">
                        <div class="name fontBold font${font4Name}"   id=nameDivFor${
                        ancestorObject.ahnNum
                    }  style="font-size: 14px;" >${getShortName(person)}</div>
                    <div class="birth vital centered font${font4Info}" id=birthDivFor${ancestorObject.ahnNum}></div>
                        </div>
                    `;
                } else if (thisGenNum == 7) {
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="box" style="background-color: ${theClr} ; border:0; padding: 3px;">
                        <span  id=extraInfoFor${
                            ancestorObject.ahnNum
                        }>${extraInfoForThisAnc}${extraBR}</span>
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
                    if (photoUrl) {
                        photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center; display:inline-block;"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
                    }

                    let containerClass = "photoInfoContainer";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        containerClass += "End";
                    }
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="${containerClass} box" style="background-color: ${theClr} ; border:0;   ">
                        <span  id=extraInfoFor${ancestorObject.ahnNum}>${extraInfoForThisAnc}${extraBR}</span>
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
                } else if (thisGenNum == 5) {
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
                    let photoDiv = "";
                    if (photoUrl) {
                        photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center; display:inline-block;"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
                    }

                    let containerClass = "photoInfoContainer";
                    if (thisPosNum >= numSpotsThisGen / 2) {
                        containerClass += "End";
                    }
                    return `
                        <div  id=wedgeBoxFor${
                            ancestorObject.ahnNum
                        } class="${containerClass} box" style="background-color: ${theClr} ; border:0;   ">
                        <span  id=extraInfoFor${ancestorObject.ahnNum}>${extraInfoForThisAnc}${extraBR}</span>
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
                } else if (thisGenNum == 4) {
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
                    } class="box" style="background-color: ${theClr} ; border:0; ">
                    <span  id=extraInfoFor${ancestorObject.ahnNum}>${extraInfoForThisAnc}${extraBR}</span>
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

                    let mDateDIV = '';
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
                    return `<div class="box centered" id=wedgeInfoFor${
                        ancestorObject.ahnNum
                    } style="background-color: ${theClr} ; border:0; ">
                     <span  id=extraInfoFor${ancestorObject.ahnNum}>${extraInfoForThisAnc}${extraBR}</span>
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

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
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
                
                if (thisPosNum % 2 == 0) {
                    theMDateDIV = document.getElementById("mDateFor-" + ancestorObject.ahnNum + "-date");
                    if (theMDateDIV) {
                        condLog("theMDateDIV:", theMDateDIV);
                    }
                }
                if (thisPersonsWedge) {
                    thisPersonsWedge.style.fill = getBackgroundColourFor(thisGenNum, thisPosNum, ancestorObject.ahnNum);
                    thisBkgdClr = thisPersonsWedge.style.fill;
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
                theInfoBox.parentNode.parentNode.setAttribute("y", -100);
                if (ancestorObject.ahnNum == 1) {
                    // condLog("BOUNDS for Central Perp: ", theInfoBox.getBoundingClientRect() );
                    theInfoBox.parentNode.parentNode.setAttribute("y", -120);
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
                }
                //  theInfoBox.style.backgroundColor = "orange";
            } else {
                theNameDIV.innerHTML = getShortName(d);
                theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
                theInfoBox.parentNode.parentNode.setAttribute("width", 266);
                theInfoBox.parentNode.parentNode.setAttribute("x", -133);

                if (thisGenNum == 4) {
                    theInfoBox.parentNode.parentNode.setAttribute("y", -100);
                    // condLog(FanChartView.maxAngle, "º - G4 - ahnNum #", ancestorObject.ahnNum, FanChartView.maxAngle);
                    if (FanChartView.maxAngle == 180) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -85);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 170);
                    } else if (FanChartView.maxAngle == 240) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -120);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 240);
                    } else if (FanChartView.maxAngle == 360) {
                        theInfoBox.parentNode.parentNode.setAttribute("x", -170);
                        theInfoBox.parentNode.parentNode.setAttribute("width", 340);
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
                if (thisGenNum >= 6) {
                    let fontRadii = { 6: 25, 7: 9, 8: 14, 9: 17 };
                    let fontRadius = fontRadii[thisGenNum];
                    if (thisGenNum == 6 && FanChartView.maxAngle == 360) {
                        fontRadius = 0;
                    } else if (thisGenNum == 7 && FanChartView.maxAngle == 240) {
                        fontRadius = 0;
                    } else if (thisGenNum == 7 && FanChartView.maxAngle == 360) {
                        fontRadius = -10;
                    } else if (thisGenNum == 8 && FanChartView.maxAngle == 360) {
                        fontRadius = 0;
                    }
                    let tweakAngle = (Math.atan(fontRadius / (thisGenNum * thisRadius)) * 180) / Math.PI;
                    // condLog("Gen",thisGenNum, "TweakAngle = ",tweakAngle);
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
                if (thisGenNum == 6) {
                    if (FanChartView.maxAngle == 180) {
                        thePhotoDIV.style.height = "50px";
                    } else {
                        thePhotoDIV.style.height = "60px";
                    }
                } else if (thisGenNum == 5) {
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
            }

            if (ancestorObject.ahnNum == 1) {
                let thePhotoDIV = document.getElementById("photoFor" + ancestorObject.ahnNum);
                if (thePhotoDIV && FanChartView.currentSettings["photo_options_showCentralPic"] == true) {
                    if (!photoUrl && FanChartView.currentSettings["photo_options_useSilhouette"] == false) {
                        thePhotoDIV.style.display = "none";
                        theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    } else if (!photoUrl && FanChartView.currentSettings["photo_options_useSilhouette"] == true && d._data.Gender == "") {
                        thePhotoDIV.style.display = "none";
                        theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    } else {

                        thePhotoDIV.style.display = "inline-block";
                    }
                } else if (thePhotoDIV && FanChartView.currentSettings["photo_options_showCentralPic"] == false) {
                    thePhotoDIV.style.display = "none";
                    theInfoBox.parentNode.parentNode.setAttribute("y", -60); // adjust down the contents of the InfoBox
                    // condLog("ADJUSTING the CENTRAL PERSON INFO without PIC downwards, i hope");
                }
            } else if (thePhotoDIV && thePhotoDIV.style.display == "none" && theInfoBox) {
                theInfoBox.parentNode.parentNode.setAttribute("y", -60);
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
            let newX = thisGenNum * thisRadius * Math.cos((placementAngle * Math.PI) / 180);
            let newY = thisGenNum * thisRadius * Math.sin((placementAngle * Math.PI) / 180);

            // OK - now that we know where the centre of the universe is ... let's throw those DNA symbols into play !
            showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle);
            // AND the stickers !
            showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle);

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
            if (theExtraDIV) {theExtraDIV.innerHTML = extraInfoForThisAnc + extraBR;}
            if (theMDateDIV) {
                // condLog("Marriage", d._data.Spouses);
                let mDateAngle = nameAngle + (FanChartView.maxAngle / 2) / numSpotsThisGen;
                let tweakAngle = (Math.atan(30 / (thisGenNum * thisRadius)) * 180) / Math.PI;
                let dGenNum = 0; // variable that should be 0 if marriage date is in the middle of the cell, but a percentage if it's shifted to the top (for gens <= 5)
                if (FanChartView.currentSettings["date_options_marriageAtTopEarlyGens"] == true) {
                    dGenNum = 0.35;
                }
                let mDateX = (thisGenNum + dGenNum) * thisRadius * Math.cos(((mDateAngle - tweakAngle - 90) * Math.PI) / 180);
                let mDateY = (thisGenNum + dGenNum) * thisRadius * Math.sin(((mDateAngle - tweakAngle - 90) * Math.PI) / 180);
                if (ancestorObject.ahnNum >= 32) {
                    tweakAngle = (Math.atan(10 / (thisGenNum * thisRadius)) * 180) / Math.PI;
                    if (thisPosNum < numSpotsThisGen / 2) {
                        mDateX = (thisGenNum * thisRadius + 60) * Math.cos(((mDateAngle - 180 + tweakAngle) * Math.PI) / 180) ;
                        mDateY =
                            (thisGenNum * thisRadius + 60) *
                            Math.sin(((mDateAngle - 180 + tweakAngle) * Math.PI) / 180);
                    } else {
                        mDateX = (thisGenNum * thisRadius - 60) * Math.cos(((mDateAngle - tweakAngle - 0) * Math.PI) / 180);
                        mDateY = (thisGenNum * thisRadius - 60) * Math.sin(((mDateAngle - tweakAngle - 0) * Math.PI) / 180);
                    }
                }                
                let dateStyle = "Full";
                if (
                    FanChartView.currentSettings["date_options_showMarriage"] == false ||
                    FanChartView.currentSettings["date_options_dateTypes"] == "none" || thisGenNum >= 8 || 
                    
                    (FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum] &&
                        FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate && FanChartView
                            .myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate == "0000-00-00")
                ) {
                    theMDateDIV.parentNode.style.display = "none";
                } else {
                    if (FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum] && FanChartView.myAhnentafel.marriageList[ancestorObject.ahnNum].MarriageDate){
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
                        if (ancestorObject.ahnNum >= 32) {
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
                            ).replace(",", " ") + (ancestorObject.ahnNum >= 32 ? " ":"");
                        // .replace(/\-/g, " "); // On second thought - leave the dashes in, if that's the format chosen

                        theMDateDIV.parentNode.style.transform =
                            "translate(" + mDateX + "px," + mDateY + "px)" + " " + "rotate(" + mDateAngle + "deg)";
                        if (FanChartView.currentSettings["date_options_marriageBlend"] == true){
                            theMDateDIV.style.backgroundColor = thisBkgdClr;                            
                        } else {
                            theMDateDIV.style.backgroundColor = "White";                           
                        }
                        
                        // theMDateDIV.parentNode.style.display = "none";

                        SVGgraphicsDIV.append(theMDateDIV.parentNode); // move the MDateDiv to the end of the line  - basically putting it on the top of the stack to be most visible by everybody!
                    } else {
                        theMDateDIV.parentNode.style.display = "none";
                    }
                }
            };
            // FINALLY ... we return the transformation statement back - the translation based on our Trig calculations, and the rotation based on the nameAngle
            return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
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

        let fandokuLink = "";

        if (person._data.Id == FanChartView.myAhnentafel.list[1]) {
            // condLog("FOUND THE PRIMARY PERP!");
            // if (FanChartView.showFandokuLink == "YES"){
            fandokuLink = `<span class="tree-links"><button onclick=location.assign("https://apps.wikitree.com/apps/clarke11007/WTdynamicTree/#name=${person.getName()}&view=fandoku"); style="padding:2px;">Play FanDoku</button></span>`;
            // }
        } else {
            // condLog("Popup a poopy peep");
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
						    <span class="tree-links"><a href="#name=${person.getName()}"><img style="width:30px; height:24px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></a></span>

                            </div>
                            <div class="birth vital">${birthString(person)}</div>
                            <div class="death vital">${deathString(person)}</div>
                            ${fandokuLink}
						</div>
					</div>

				</div>
			`);

        d3.select("#view-container").on("click", function () {
            // condLog("d3.select treeViewerContainer onclick - REMOVE POPUP");
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
    function getSettingsDateAndPlace(person, dateType, genNum = 0) {
        let datePlaceString = "";
        let thisDate = "";
        let thisPlaceSimple = "";
        let thisPlaceMulti = "";
        let thisLifespan = "";

        let numLinesArrayObj = {
            180: [6, 6, 6, 6, 5, 3, 2, 1, 1, 1],
            240: [6, 6, 6, 6, 6, 5, 3, 2, 1, 1, 1],
            360: [6, 6, 6, 6, 6, 6, 5, 3, 2, 1, 1, 1],
        };
        let numLinesMax = numLinesArrayObj[FanChartView.maxAngle][genNum];

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
                thisPlace = settingsStyleLocation(
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
                thisPlace = settingsStyleLocation(
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
                // we're looking at a compound location, and an actual date, so let's break it up and put the location on its own line.
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
                    thisPlace = settingsStyleLocation(
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
                if (thisPlaceSimple > "") {
                    return dateType.toLowerCase() + ". " + thisPlaceSimple;
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

                if (thisPlaceSimple > "") {
                    datePlaceString += "b. " + thisPlaceSimple;
                } else if (hasDeathPlace == true) {
                    if (
                        FanChartView.currentSettings["place_options_locationTypes"] == "detailed" &&
                        FanChartView.currentSettings["place_options_showDeath"] == true
                    ) {
                        thisPlace = settingsStyleLocation(
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
                } else if (thisDate > "" && hasDeathDate) {
                    return "b. " + thisDate;
                } else if (thisDate > "" && hasDeathDate == false) {
                    return "b. " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (
                    thisDate > "" &&
                    (FanChartView.currentSettings["place_options_locationTypes"] == "none" ||
                        FanChartView.currentSettings["place_options_showDeath"] == false)
                ) {
                    return "b. " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (thisDate == "" && thisPlaceSimple > "") {
                    return "b. " + thisPlaceSimple;
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
                    return "d. " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (thisDate > "" && hasBirthDate) {
                    return "d. " + thisDate;
                } else if (thisDate > "" && hasBirthDate == false && hasBirthPlace == false) {
                    return "d. " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (thisDate > "") {
                    return "d. " + thisDate;
                } else if (thisDate == "" && thisPlaceSimple > "") {
                    return "d. " + thisPlaceSimple;
                } else {
                    return "";
                }
            }
        } else if (numLinesMax == 5) {
            // 2 Dates + 2 Simple Locs, or 1 Date + 1 Multi Loc
            datePlaceString = "";
            if (FanChartView.currentSettings["date_options_dateTypes"] == "lifespan") {
                if (dateType == "B" && thisLifespan > "") {
                    datePlaceString = thisLifespan + "<br/>";
                }
                if (!hasBirthDate && !hasDeathDate) {
                    datePlaceString += dateType.toLowerCase() + ". " + thisPlaceMulti;
                } else if (thisPlaceSimple > "") {
                    datePlaceString += dateType.toLowerCase() + ". " + thisPlaceSimple;
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "detailed") {
                if (thisDate > "") {
                    datePlaceString = dateType.toLowerCase() + ". " + thisDate + "<br/>" + thisPlaceSimple;
                } else if (thisPlaceSimple > "") {
                    datePlaceString = dateType.toLowerCase() + ". " + thisPlaceSimple;
                }
            } else if (FanChartView.currentSettings["date_options_dateTypes"] == "none") {
                if (thisPlaceMulti > "") {
                    datePlaceString += dateType.toLowerCase() + ". " + thisPlaceMulti;
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

        // if (genNum == 6) {
        //     if (FanChartView.maxAngle == 180) {
        //         if (dateType == "D") {
        //             datePlaceString = "";
        //         } else if (dateType == "B") {
        //             datePlaceString = lifespanFull(person);
        //         }
        //         // nothing to add here - we're too cramped to add a place to the date
        //     } else if (FanChartView.maxAngle == 360) {
        //         if (thisPlace.indexOf(",") > 2) {
        //             datePlaceString += thisPlace.substring(0, thisPlace.indexOf(",", 2));
        //         } else {
        //             datePlaceString += thisPlace;
        //         }
        //     }
        // } else if (genNum == 7) {
        //     if (FanChartView.maxAngle == 180) {
        //         datePlaceString = "";
        //         // nothing to add here - we're too cramped to add a place to the date
        //     } else if (FanChartView.maxAngle == 240) {
        //         if (dateType == "D") {
        //             datePlaceString = "";
        //         } else if (dateType == "B") {
        //             datePlaceString = lifespanFull(person);
        //         }
        //     } else if (FanChartView.maxAngle == 360) {
        //         // datePlaceString = lifespanFull(person);
        //     }
        // } else if (genNum == 8) {
        //     if (FanChartView.maxAngle < 360) {
        //         datePlaceString = "";

        //         // nothing to add here - we're too cramped to add a place to the date
        //     } else  {
        //         datePlaceString = lifespanFull(person);

        //     }
        // }

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
                thisPlace = settingsStyleLocation(
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
                thisPlace = settingsStyleLocation(
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
            FanChartView.currentSettings["name_options_prefix"] == true 
            && person._data.Prefix && person._data.Prefix > ""
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
            theName += " " + person._data.Suffix ;
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

        let thePrefix = "";
        let theSuffix = "";

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
            return thePrefix +  birthName + theSuffix;
        } else if (middleInitialName.length < maxLength) {
            return thePrefix +  middleInitialName + theSuffix;
        } else if (noMiddleInitialName.length < maxLength) {
            return thePrefix +  noMiddleInitialName + theSuffix;
        } else {
            return thePrefix +  `${person._data.FirstName.substring(0, 1)}. ${person._data.LastNameAtBirth}` + theSuffix;
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
            for (let b = 1; b <= 4; b++) {
                const badgeDIVid = "badge" + b + "-" + ahnNum + "svg";
                let badgeDIV = document.getElementById(badgeDIVid);

                badgeDIV.parentNode.style.display = "none";
                
            }
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
        condLog("UPDATING BADGES NOW !!!!");
         let showBadges = FanChartView.currentSettings["general_options_showBadges"];
         let theDropDown = document.getElementById("stickerCategoryDropDownList" + num);
         let searchText = "Clarke";
         let searchPrefix = "[[Category:";
         if ( theDropDown.value  > -1 ) {

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

        for (let ahnNum = 1; ahnNum < 2 ** FanChartView.numGens2Display; ahnNum++) {
             const thisDIVid = "badge" + num + "-" + ahnNum + "svg";
             let stickerDIV = document.getElementById(thisDIVid);

             if (
                 showBadges &&
                 stickerDIV &&
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
                 let SVGgraphicsDIV = document.getElementById("SVGgraphics");
                 stickerDIV.parentNode.style.display = "block";
                 SVGgraphicsDIV.append(stickerDIV.parentNode);
             } else {
                 stickerDIV.parentNode.style.display = "none";
             }
         }
     };

    function showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle) {
        const ahnNum = 2**thisGenNum + thisPosNum;
        if (ahnNum == 1) { condLog("SHOW BADGES FOR # 1 - NUMERO UNO !!!!")}
        let SVGgraphicsDIV = document.getElementById("SVGgraphics");
        let showBadgesSetting = FanChartView.currentSettings["general_options_showBadges"];
        

        let dCompensation = 0;
        if (nameAngle > 550) {
            dCompensation = -36;
        } else if (nameAngle > 540) {
            dCompensation = -36;
        } else if (nameAngle > 530) {
            dCompensation = -36;
        } else if (nameAngle > 520) {
            dCompensation = -36;
        } else if (nameAngle > 510) {
            dCompensation = -36;
        } else if (nameAngle > 500) {
            dCompensation = -36;
        } else if (nameAngle > 490) {
            dCompensation = -36;
        } else if (nameAngle > 480) {
            dCompensation = -34;
        } else if (nameAngle > 470) {
            dCompensation = -34;
        } else if (nameAngle > 450) {
            dCompensation = -32;
        } else if (nameAngle > 435) {
            dCompensation = -26;
        } else if (nameAngle > 420) {
            dCompensation = -24;
        } else if (nameAngle > 400) {
            dCompensation = -14;
        } else if (nameAngle > 380) {
            dCompensation = -10;
        } else if (nameAngle > 360) {
            dCompensation = -6;
        } else if (nameAngle > 320) {
            dCompensation = 0;
        } else if (nameAngle > 270) {
            dCompensation = -6;
        } else if (nameAngle > 240) {
            dCompensation = -18;
        } else if (nameAngle > 220) {
            dCompensation = -24;
        } else if (nameAngle > 200) {
            dCompensation = -32;
        } else if (nameAngle > 190) {
            dCompensation = -36;
        } else if (nameAngle > 170) {
            dCompensation = -36;
        }
        let dFraction =
            ((thisGenNum + 1 / 2) * thisRadius - 2 * 0  - 0 * (thisGenNum < 5 ? 100 : 80) + dCompensation) /
            (Math.max(1, thisGenNum) * thisRadius);
        let dOrtho = 35 / (Math.max(1, thisGenNum) * thisRadius);
        let dOrtho2 = dOrtho;
        let newR = thisRadius;

        condLog("UPDATING the BADGES DROP DOWN here on line 5196");
        // stickerPrefix + ahnNum + "svg",
        for (let i = 1; i <= 4; i++) {
           
            const thisDIVid = "badge" + i + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);

            // dnaImgY.setAttribute("x", newX * dFraction + dOrtho * newY);
            // dnaImgY.setAttribute("y", newY * dFraction - dOrtho * newX);
            
             if (ahnNum == 1) {
                 newX = -20;
                 newY = 0 - thisRadius + Math.abs(i - 2.5) * 10 * 2;
                 stickerDIV.parentNode.setAttribute("x", newX * dFraction + (2.5 - i) * dOrtho * newY);
                 stickerDIV.parentNode.setAttribute("y", newY * dFraction -  dOrtho * newX);
             } else {
                 stickerDIV.parentNode.setAttribute("x", newX * dFraction + (2.5 - i)  * dOrtho * newY);
                 stickerDIV.parentNode.setAttribute("y", newY * dFraction - (2.5 - i)  * dOrtho * newX);
             }

            stickerDIV.style.rotate = nameAngle + "deg";

            let theDropDown = document.getElementById("stickerCategoryDropDownList" + i);
            let searchText = "Clarke";
            let showBadges = showBadgesSetting;
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
           
            let rawValue = searchText.trim();
            let spacelessValue = searchText.trim().replace(/ /g, "_");

            
            if (i==1 || ahnNum == 1) {
                condLog(
                    "Sticker me this: i=",i,
                    thisGenNum,
                    thisPosNum,ahnNum,
                    nameAngle,
                    "deg",
                    dCompensation,
                    newX,
                    newY,
                    dOrtho,
                    (Math.atan(-18 / 12) * 180) / Math.PI
                );
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
                     thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                         searchPrefix + " " + spacelessValue
                     ) > -1)
             ) {
                 //  SHOW THIS STICKER
                 stickerDIV.parentNode.style.display = "block";
                 SVGgraphicsDIV.append(stickerDIV.parentNode);
             } else {
                 stickerDIV.parentNode.style.display = "none";
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

        if (FanChartView.currentSettings["highlight_options_showHighlights"] == true) {
            if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                ext = "Y";
                dOrtho = 0;
                if (pos == 0) {
                    if (ahnNum > 1) {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgY.parentNode);
                        }
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgDs.parentNode);
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgAs.parentNode);
                        }
                    } else if (ahnNum == 1 && thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male") {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgY.parentNode);
                        }
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgDs.parentNode);
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgAs.parentNode);
                        }
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
                    if (dnaImgMT) {
                        dnaImgMT.style.display = "block";
                        SVGgraphicsDIV.append(dnaImgMT.parentNode);
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgDs.parentNode);
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgAs.parentNode);
                        }
                    }
                }
                showAllAs = true;
                if (pos % 2 == 1) {
                    showAllDs = true;
                }
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                ext = "X";
                dOrtho = 0;
                if (FanChartView.XAncestorList.indexOf(ahnNum) > -1) {
                    if (dnaImgX) {
                        dnaImgX.style.display = "block";
                        SVGgraphicsDIV.append(dnaImgX.parentNode);
                        if (dnaImgDs) {
                            dnaImgDs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgDs.parentNode);
                        }
                        if (dnaImgAs) {
                            dnaImgAs.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgAs.parentNode);
                        }
                    }
                }

                showAllAs = true;
                showAllDs = true;
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                if (FanChartView.XAncestorList.indexOf(ahnNum) > -1) {
                    // HIGHLIGHT by X-chromosome inheritance
                    if (dnaImgX) {
                        dnaImgX.style.display = "block";
                        SVGgraphicsDIV.append(dnaImgX.parentNode);
                    }
                }
                if (pos == 2 ** gen - 1) {
                    // AND/OR by mtDNA inheritance
                    if (dnaImgMT) {
                        dnaImgMT.style.display = "block";
                        SVGgraphicsDIV.append(dnaImgMT.parentNode);
                    }
                }
                if (pos == 0) {
                    // AND/OR by Y-DNA inheritance
                    if (ahnNum > 1) {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgY.parentNode);
                        }
                    } else if (ahnNum == 1 && thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male") {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                            SVGgraphicsDIV.append(dnaImgY.parentNode);
                        }
                    }
                }
            } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                if (ahnNum == 1) {
                    condLog(thePeopleList[FanChartView.myAhnentafel.list[1]]._data);
                    if (dnaImgConfirmed) {
                        dnaImgConfirmed.style.display = "block";
                        SVGgraphicsDIV.append(dnaImgConfirmed.parentNode);
                    }
                } else {
                    let childAhnNum = Math.floor(ahnNum / 2);
                    if (ahnNum % 2 == 0) {
                        // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                        if (thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30) {
                            if (dnaImgConfirmed) {
                                dnaImgConfirmed.style.display = "block";
                                SVGgraphicsDIV.append(dnaImgConfirmed.parentNode);
                            }
                        }
                    } else {
                        // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                        if (thePeopleList[FanChartView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30) {
                            if (dnaImgConfirmed) {
                                dnaImgConfirmed.style.display = "block";
                                SVGgraphicsDIV.append(dnaImgConfirmed.parentNode);
                            }
                        }
                    }
                }
            }
        }

        if (dnaImgX) {
            dnaImgX.setAttribute("x", newX * dFraction);
            dnaImgX.setAttribute("y", newY * dFraction);
            dnaImgXDiv.style.rotate = nameAngle + "deg";
            if (thisGenNum == 0) {
                dnaImgX.setAttribute("y", 100);
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgX.style.display = "none";
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "XDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgX.style.display = "block";
                SVGgraphicsDIV.append(dnaImgX.parentNode);
            }
        }
        if (dnaImgY) {
            dnaImgY.setAttribute("x", newX * dFraction + dOrtho * newY);
            dnaImgY.setAttribute("y", newY * dFraction - dOrtho * newX);
            dnaImgYDiv.style.rotate = nameAngle + "deg";
            if (thisGenNum == 0) {
                dnaImgY.setAttribute("y", 100);
                dnaImgY.setAttribute("x", 0 - (35 * dOrtho) / 0.13);
                condLog("@GenNum == 0 ; dOrtho = ", dOrtho);
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgY.style.display = "none";
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgY.style.display = "block";
                SVGgraphicsDIV.append(dnaImgY.parentNode);
            }
        }
        if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
            dnaImgY.style.display = "none";
        } else if (
            FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
            FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
            showAllAs == true
        ) {
            dnaImgY.style.display = "block";
            SVGgraphicsDIV.append(dnaImgY.parentNode);
        }
        if (dnaImgMT) {
            dnaImgMT.setAttribute("x", newX * dFraction - dOrtho * newY);
            dnaImgMT.setAttribute("y", newY * dFraction + dOrtho * newX);
            dnaImgMTDiv.style.rotate = nameAngle + "deg";
            if (thisGenNum == 0) {
                dnaImgMT.setAttribute("y", 100);
                dnaImgMT.setAttribute("x", (35 * dOrtho) / 0.13);
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgMT.style.display = "none";
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "mtDNA" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgMT.style.display = "block";
                SVGgraphicsDIV.append(dnaImgMT.parentNode);
            }
        }

        if (dnaImgDs) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/890#" +
                ext +
                '">' +
                "<img height=24px src='https://www.wikitree.com/images/icons/descendant-link.gif'/>" +
                "</A>";
            // condLog(theLink);
            dnaImgDs.setAttribute("x", newX * dFraction - dOrtho2 * newY);
            dnaImgDs.setAttribute("y", newY * dFraction + dOrtho2 * newX);
            dnaImgDsDiv.innerHTML = theLink;
            dnaImgDsDiv.style.rotate = nameAngle + "deg";
            if (thisGenNum == 0) {
                dnaImgDs.setAttribute("y", 100);
                dnaImgDs.setAttribute("x", 35);
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgDs.style.display = "none";
            } else if (
                ext > "" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllDs == true
            ) {
                dnaImgDs.style.display = "block";
                SVGgraphicsDIV.append(dnaImgDs.parentNode);
            }
        }

        if (dnaImgAs) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/89#" +
                ext +
                '">' +
                "<img height=24px src='https://www.wikitree.com/images/icons/pedigree.gif'/>" +
                "</A>";
            dnaImgAs.setAttribute("x", newX * dFraction + dOrtho2 * newY);
            dnaImgAs.setAttribute("y", newY * dFraction - dOrtho2 * newX);
            dnaImgAsDiv.innerHTML = theLink;
            dnaImgAsDiv.style.rotate = nameAngle - 90 + "deg";
            if (thisGenNum == 0) {
                dnaImgAs.setAttribute("y", 100);
                dnaImgAs.setAttribute("x", -35);
            }
            if (ext > "" && FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgAs.style.display = "none";
            } else if (
                ext > "" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgAs.style.display = "block";
                SVGgraphicsDIV.append(dnaImgAs.parentNode);
            }
        }

        if (dnaImgConfirmed) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[FanChartView.myAhnentafel.list[ahnNum]]._data.Name) +
                "/899" +
                '">' +
                "<img height=30px src='https://www.wikitree.com/images/icons/dna/DNA-confirmed.gif'/>" +
                "</A>";
            dnaImgConfirmed.setAttribute("x", newX * (gen > 5 ? (newR + 10) / newR : dFraction) + dOrtho * newY);
            dnaImgConfirmed.setAttribute("y", newY * (gen > 5 ? (newR + 10) / newR : dFraction) - dOrtho * newX);
            dnaImgConfirmedDiv.innerHTML = theLink;
            dnaImgConfirmedDiv.style.rotate = nameAngle + "deg";
            if (thisGenNum == 0) {
                dnaImgConfirmed.setAttribute("y", 100);
                dnaImgConfirmed.setAttribute("x", 0 - 37.5);
            }

            if (FanChartView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgConfirmed.style.display = "none";
            } else if (
                FanChartView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed" &&
                FanChartView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll"
            ) {
                dnaImgConfirmed.style.display = "block";
                SVGgraphicsDIV.append(dnaImgConfirmed.parentNode);
            }
        }
    }

    function doHighlightFor(gen, pos, ahnNum) {
        if (FanChartView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
            if (pos == 0) {
                if (ahnNum > 1) {
                    return true;
                } else if (ahnNum == 1 && thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male") {
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
                if (ahnNum > 1) {
                    return true;
                } else if (ahnNum == 1 && thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Male") {
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
        } else if (FanChartView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
            let aliveYYYYSelector = document.getElementById("highlight_options_aliveYYYY");
            let aliveMMMSelector = document.getElementById("highlight_options_aliveMMM");
            let aliveDDSelector = document.getElementById("highlight_options_aliveDD");

            let bornByDate = "";
            let deadByDate = "";

            let inputDate = 1950 + "-" + aliveMMMSelector.value + "-" + aliveDDSelector;
            if (aliveYYYYSelector.value > 1){
                inputDate = aliveYYYYSelector.value + "-" + aliveMMMSelector.value + "-" + aliveDDSelector;
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
            if (thePeopleList[FanChartView.myAhnentafel.list[1]]._data.Gender == "Female") {
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
                    "#" + thisPerp._data.DeathRegion + "#",
                    // thisPerp._data.bio
                );
                 
            }
        }
    }
    
    function findCategoriesOfAncestors() {
        condLog("findCategoriesOfAncestors");
        categoryList = [];
        stickerList = [];
        stickerInnerHTML = '<option selected value="-999">Do not use Badge #666#</option><option>CATEGORIES</option>';
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
            innerCatHTML += '<option value="' + cat + '">' + cat + "</option>";
            stickerInnerHTML += '<option value="' + i + '">' + cat + "</option>";
        }
        condLog("UPDATING & REDOING the BADGES DROP DOWNS @ 5854")
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
        for (i = 1; i <= 4; i++){
            document.getElementById("stickerCategoryDropDownList" + i).innerHTML = stickerInnerHTML.replace("#666#", i);
            condLog("Updating and checking : Badge # " , i , ":", currentBadges[i]);
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
                    document.getElementById("stickerCategoryDropDownList" + i).value = categoryList.length + stickerList.indexOf(
                        currentBadges[i]
                    );
                    FanChartView.updateBadgesToShow(i);
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
                if (categoryList.indexOf(thisCatName) == -1){
                    categoryList.push(thisCatName);
                }
                catBeginBrackets = bio.indexOf(searchPrefix, catEndBrackets);
            } else {
                catBeginBrackets = -2;
            }
        }
        
        let stickBeginBrackets = bio.indexOf("{{");
        let acceptedStickers = ["Sticker", "Adopted Child", "Died Young", "Multiple Births", "Estimated Date", "Unsourced"];
        while (stickBeginBrackets > -1) {
            let stickEndBrackets = bio.indexOf("}}", stickBeginBrackets);
            let stickPipe = bio.indexOf("|", stickBeginBrackets);
            if (stickEndBrackets > -1) {
                if (stickPipe > stickBeginBrackets && stickPipe < stickEndBrackets) {
                    stickEndBrackets = stickPipe;
                }
                condLog(bio.substring(stickBeginBrackets, stickEndBrackets));
                let thisStickName = bio.substring(stickBeginBrackets + 2, stickEndBrackets).trim();
                if (stickerList.indexOf(thisStickName) == -1){
                    let OK2UseThisSticker = false;
                    for (let index = 0; index < acceptedStickers.length && !OK2UseThisSticker; index++) {
                        const element = acceptedStickers[index];
                        if (thisStickName.indexOf(element) > -1) {
                            OK2UseThisSticker = true;
                            if (element == "Adopted Child") {  thisStickName = element; }
                        }
                    }
                    if (OK2UseThisSticker){ stickerList.push(thisStickName); }
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
            } else if (settingForSpecifyByFamily == "spouses") {
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
})();
