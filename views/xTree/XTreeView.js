/*
 * XTreeView
 *
 * Extend the base View class from the WikiTree Dynamic Tree.
 */

window.XTreeView = class XTreeView extends View {
    static APP_ID = "XTree";
    meta() {
        return {
            title: "X Family Tree",

            // Note that we have some placeholder "#replaceme" text here. This gets filled with links and text built from the starting
            // profile data, after that data is loaded.
            description: `This basic ancestor view uses the <a href="http://en.wikipedia.org/wiki/Ahnentafel" target="_Help">ahnen numbering system</a>.
            See the <a id="familyListLink" href="#replaceme">Family List</a> for more generations and flexibility, the <a id="compactTreeLink" href="#replaceme">Compact Family Tree</a> for an alternative view with the numbers, or
            <a id="toolsLink" href="#replaceme">#replaceme</a> for a conventional pedigree chart and links to other views.`,

            docs: "",
        };
    }

    init(container_selector, person_id) {
        let xTree = new XTreeAncestorList(container_selector, person_id);
        xTree.displayAncestorList();
    }
};

const PRINTER_ICON = "&#x1F4BE;";
const SETTINGS_GEAR = "&#x2699;";
const LEGEND_CLIPBOARD = "&#x1F4CB;";

const FullAppName = "X Family Tree app";
const AboutPreamble =
    "The X Family Tree app is designed to show the inheritance of the X Chromosome through the generations.<br>It was created to live amongst the WikiTree family of Tree Apps in July 2023<br/>and is maintained by the original author plus other WikiTree developers.";
const AboutUpdateDate = "30 July 2023";
const AboutAppIcon = `<img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/XTree.png" />`;
const AboutOriginalAuthor = "<A target=_blank href=https://www.wikitree.com/wiki/Clarke-11007>Greg Clarke</A>";
const AboutAdditionalProgrammers ="";//    "<A target=_blank href=https://www.wikitree.com/wiki/Duke-5773>Jonathan Duke</A>";
const AboutAssistants = "Rob Pavey";
const AboutLatestG2G = "https://www.wikitree.com/g2g/1613057/new-app-x-family-tree";
const AboutHelpDoc = "";// "https://www.wikitree.com/wiki/Space:Fan_Chart_app";
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
            
/* Current Primary Individual */
XTreeView.PrimaryPerson = null;

/** Object to hold the Ahnentafel table for the current primary individual   */
XTreeView.myAhnentafel = new AhnenTafel.Ahnentafel();

/** Object to hold the Ancestors as they are returned from the getAncestors API call    */
XTreeView.theAncestors = [];

// List to hold the AhnenTafel #s of all Ancestors that are X-Chromosome ancestors (or potential x-chromosome ancestors) of the primary person.
XTreeView.XAncestorList = [];

XTreeView.ahnenNumList = {"Male":[], "Female":[]};

XTreeView.numGens2Display = 5;
XTreeView.currClrNum = 0;
XTreeView.clrs4AhnensArray = [];

XTreeView.modeNum = 0; // 0 = Probability / 1 = Random / 2 = Edit

XTreeView.currentScaleFactor = 1;

XTreeView.ChromoColoursArray = [
        [1, "AliceBlue", "#F0F8FF"],
        // [1, "AntiqueWhite", "#FAEBD7"],
        [1, "Aquamarine", "#7FFFD4"],
        /*[1,"Azure","#F0FFFF"],*/ [1, "Beige", "#F5F5DC"],
        /*[1,"Bisque","#FFE4C4"], [1,"BlanchedAlmond","#FFEBCD"], */ [1, "BurlyWood", "#DEB887"],
        [1, "CadetBlue", "#5F9EA0"],
        /* [1,"Chartreuse","#7FFF00"], [1,"Coral","#FF7F50"], */ [1, "CornflowerBlue", "#6495ED"],
        [1, "Cornsilk", "#FFF8DC"],
        [1, "Cyan", "#00FFFF"],
        [1, "DarkCyan", "#008B8B"],
        [1, "DarkGoldenRod", "#B8860B"],
        // [1, "DarkGray", "#A9A9A9"],
        [1, "DarkKhaki", "#BDB76B"],
        [1, "DarkOrange", "#FF8C00"],
        [1, "DarkSalmon", "#E9967A"],
        [1, "DarkSeaGreen", "#8FBC8F"],
        [1, "DarkTurquoise", "#00CED1"],
        [1, "DeepPink", "#FF1493"],
        [1, "DeepSkyBlue", "#00BFFF"],
        [1, "DodgerBlue", "#1E90FF"],
        // [1, "FloralWhite", "#FFFAF0"],
        // [1, "Gainsboro", "#DCDCDC"],
        // [1, "GhostWhite", "#F8F8FF"],
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
        // [1, "LightGray", "#D3D3D3"],
        [1, "LightGreen", "#90EE90"],
        [1, "LightPink", "#FFB6C1"],
        [1, "LightSalmon", "#FFA07A"],
        [1, "LightSeaGreen", "#20B2AA"],
        [1, "LightSkyBlue", "#87CEFA"],
        // [1, "LightSlateGray", "#778899"],
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
        // [1, "NavajoWhite", "#FFDEAD"],
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
        // [1, "White", "#FFFFFF"],
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
        // [0, "DarkSlateGray", "#2F4F4F"],
        [0, "DarkViolet", "#9400D3"],
        // [0, "DimGray", "#696969"],
        [0, "FireBrick", "#B22222"],
        [0, "ForestGreen", "#228B22"],
        // [0, "Gray", "#808080"],
        // [0, "Grey", "#808080"],
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
        // [0, "SlateGray", "#708090"],
        // [0, "SlateGrey", "#708090"],
        [0, "SteelBlue", "#4682B4"],
        [0, "Teal", "#008080"],
    ];

/*
 * Display a list of ancestors using the ahnen numbering system.
 */
window.XTreeAncestorList = class XTreeAncestorList {
    constructor(selector, startId) {
        this.startId = startId;
        this.selector = selector;

        // This increments each time we add a person to the display
        this.ahnentafelNumber = 1;

        // This increments each time we display a new group of parents of the previous group.
        this.generation = 1;

        // This is how deep to keep looking for more ancestors.
        // Note the original page (e.g. https://www.wikitree.com/treewidget/Adams-35/9) went to 7 generations.
        this.maxGeneration = 8;

        // Used in formatDate()
        this.monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Placeholder data when we don't have a particular ancestor.
        this.blankPerson = { Id: 0, FirstName: "Unknown" };

        // The data we want to retrieve for each profile. We need to get everything required to list the ancestor (in displayPerson())
        // as well as Mother and Father so we can go back more generations.
        this.profileFields =
            "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,MiddleName,RealName,Nicknames,Suffix,BirthDate,DeathDate,PhotoData,BirthLocation,DeathLocation,Gender,DataStatus,Privacy,Father,Mother,Derived.BirthName,Derived.BirthNamePrivate";


        // Store our ancestor profiles by ID, gathered in a group and then used to construct each generation.
        this.ancestors = new Object();

        // Add event listeners to highlight connected ancestors when the "Father of X" type links are hovered.
        $(this.selector).on("mouseover", ".aLink", function (e) {
            var id = $(e.target).attr("href").replace("#", "");
            $(`#person_${id}`).addClass("highlighted");
        });
        $(this.selector).on("mouseout", ".aLink", function (e) {
            var id = $(e.target).attr("href").replace("#", "");
            $(`#person_${id}`).removeClass("highlighted");
        });
    }

    // Generate the "Great-Great-...-Grandparents" headlines for each generation.
    generationTitle() {
        if (this.generation == 1) {
            return "";
        }
        if (this.generation == 2) {
            return ": Parents";
        }
        if (this.generation == 3) {
            return ": Grandparents";
        }
        let t = "Great-";
        t = t.repeat(this.generation - 3);
        t = ": " + t + "Grandparents";
        return t;
    }

    // When we have unknown ancestors (no mother/father), we display a placeholder name based on the generation.
    unknownName() {
        let prefix = "";
        if (this.generation == 1) {
            return "";
        }
        if (this.generation == 2) {
            if (this.ahnentafelNumber % 2 == 0) {
                return "Father";
            } else {
                return "Mother";
            }
        }
        if (this.ahnentafelNumber % 2 == 0) {
            prefix = "Grandfather";
        } else {
            prefix = "Grandmother";
        }
        if (this.generation == 3) {
            return prefix;
        }

        let t = "Great-";
        t = t.repeat(this.generation - 3);
        return t + prefix;
    }

    // For reference links, we want to say a particular profile is the mother/father or son/daughter of another one.
    genderAsParent(gender) {
        if (gender == "Male") {
            return "Father";
        }
        if (gender == "Female") {
            return "Mother";
        }
        return "Parent";
    }
    genderAsChild(gender) {
        if (gender == "Male") {
            return "Son";
        }
        if (gender == "Female") {
            return "Daughter";
        }
        return "Child";
    }

    // WikiTree BirthDate and DeathDate are YYYY-MM-DD. However, these are not always completely valid/complete dates.
    // They could be "fuzzy" and just have a month and year ("January 1960", returned as 1960-01-00) or as just a year (1960-00-00).
    // If we have a valid month, we want to replace the number with an abbreviation.
    formatDate(d) {
        if (!d) {
            return "";
        }
        if (d == "0000-00-00") {
            return "[date unknown]";
        }
        let ymd = d.split("-");
        let formattedDate = "";
        if (ymd[2] > 0) {
            formattedDate += `${ymd[2]} `;
        }
        if (ymd[1] > 0) {
            formattedDate += `${this.monthName[parseInt(ymd[1])]} `;
        }
        formattedDate += ymd[0];
        return formattedDate;
    }

    // This is the start of our view generation. We grab the starting profile by ID.
    // If that is valid, then we update the info in the View description and kick off the recursive gathering and display of ancestors.
    async displayAncestorList() {
        //$(this.selector).html("Working....");
        wtViewRegistry.showNotice(`Building the ancestor list to a max of ${this.maxGeneration} generations...`);

        let data = await WikiTreeAPI.postToAPI({
            appId: XTreeView.APP_ID,
            action: "getPerson",
            key: this.startId,
            fields: this.profileFields,
        });
        if (data.length != 1) {
            wtViewRegistry.showError(`There was an error starting with ${this.startId}.`);
            return;
        }

        // Yay, we have a valid starting person.
        // If the profile is private and the viewing user is not on the Trusted List, we still might not be able to continue.
        let p = data[0].person;
        XTreeView.PrimaryPerson = p;
        if (!p?.Name) {
            let err = `The starting profile data could not be retrieved.`;
            if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                err += ` You may need to be added to the starting profile's Trusted List.`;
            } else {
                err += ` Try the Apps Login.`;
            }
            wtViewRegistry.showError(err);
            wtViewRegistry.hideInfoPanel();
            return;
        }
        if (p.Privacy < 50 && !p.Gender) {
            wtViewRegistry.showError(
                `<p>Sorry, this profile is <a href="/wiki/Privacy">Private</a> and you are not on the profile's <a href="/wiki/Trusted_List">Trusted List</a>.</p>`
            );
            wtViewRegistry.hideInfoPanel();
            return;
        }

        // Fill in some custom links in the "description" with completed values.
        let x = p.Name.split("-");
        let count = x[x.length - 1];
        $("#familyListLink").attr("href", `https://www.wikitree.com/index.php?title=Special:FamilyList&p=${p.Id}`);
        $("#compactTreeLink").attr("href", `https://www.wikitree.com/treewidget/${p.Name}`);
        $("#toolsLink").attr("href", `https://www.wikitree.com/genealogy/${p.LastNameAtBirth}-Family-Tree-${count}`);
        $("#toolsLink").html(`${p.RealName}'s Tree &amp; Tools page`);

        // Display our "info" panel with a description of this view.
        wtViewRegistry.showInfoPanel();

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate

        var aboutHTML =
            '<div id=aboutDIV style="display:none; position:inherit; right:20px; background-color:aliceblue; border: solid blue 4px; border-radius: 15px; padding: 15px; width:fit-content;}">' +
            `<span style="color:red; position:relative; top:0.2em; right:0.6em; cursor:pointer;"><a onclick="XTreeView.toggleAbout();">` +
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
            
        let btnBarHTML =
            '<table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%">' +
            "&nbsp;" +
            "<input type=radio name=appMode checked value=Probability onclick='XTreeView.changeMode(0);'>Probability Tree&nbsp;&nbsp; <input type=radio name=appMode value=Random onclick='XTreeView.changeMode(1);'>Random Simulation&nbsp;&nbsp; " +
            // "<input type=radio name=appMode value=Edit onclick='XTreeView.changeMode(2);'>Edit &nbsp;&nbsp;" +
            "</td>" +
            '<td width="5%">&nbsp;' +
            // '<span id=legendASCII style="display:inline;"><A style="cursor:pointer;" onclick="XTreeView.toggleLegend();"><font size=+2>' +
            // LEGEND_CLIPBOARD +
            // "</font></A></span>" +
            "</td>" +
            '<td width="30%" align="center">' +
            ' <A style="cursor:pointer;" onclick="XTreeView.numGens2Display -=1; XTreeView.redraw();">' +
            SVGbtnDOWN +
            "</A> " +
            "[ <span id=numGensInBBar>5</span> generations ]" +
            ' <A style="cursor:pointer;" onclick="XTreeView.numGens2Display +=1; XTreeView.redraw();">' +
            SVGbtnUP +
            "</A> " +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="30%" align="right">' +
            ' <A style="cursor:pointer;" onclick="XTreeView.toggleSettings();"><font size=+2>' +
            // SVGbtnSETTINGS +
            "</font></A>" +
            "&nbsp;&nbsp;" +
            "<A onclick=XTreeView.toggleAbout();>" +
            SVGbtnINFO +
            "</A>" +
            (AboutHelpDoc > ""
                ? "&nbsp;&nbsp;<A target=helpPage href='" + AboutHelpDoc + "'>" + SVGbtnHELP + "</A>"
                : "") +
            "&nbsp;&nbsp;</td>" +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;"></DIV><DIV id="popupDIV" style="width:fit-content;" ></DIV>' + aboutHTML;

            

            
                
        // Now clear out our tree view and start filling it recursively with generations.
        // $(this.selector).html(btnBarHTML  );
        $(this.selector).html(
            btnBarHTML  +
                `<div id="XTreeTitle"></div>` +
                `<div id="XTreeFamilyTree"></div>` +
                `<div id="XTreeAncestorList" style="text-align:center;"></div>`
        );

        XTreeView.toggleAbout = function () {
            let aboutDIV = document.getElementById("aboutDIV");
            let settingsDIV = document.getElementById("settingsDIV");
            if (aboutDIV) {
                if (aboutDIV.style.display == "none") {
                    aboutDIV.style.display = "block";
                    if (settingsDIV) {settingsDIV.style.display = "none";}
                } else {
                    aboutDIV.style.display = "none";
                }
            }
        };
        
        let resultsData = await WikiTreeAPI.postToAPI({
            appId: XTreeView.APP_ID,
            action: "getPeople",
            keys: p.Id,
            fields: this.profileFields,
            ancestors: 8,
            // depth: this.maxGeneration,
        });

        condLog(resultsData);
        const ancestorData = resultsData[0].people;
        condLog(ancestorData);

        if (!ancestorData) {
            wtViewRegistry.showError(`Error: No ancestors found for ${p.Name}`);
            return;
        }

        for (const index in ancestorData) {
            thePeopleList.add(ancestorData[index]);
        }
        // if (!ancestorData || !ancestorData[0]["ancestors"] || ancestorData[0]["ancestors"].length <= 0) {
        //     wtViewRegistry.showError(`Error: No ancestors found for ${p.Name}`);
        //     return;
        // }

        // for (let i = 0; i < ancestorData[0]["ancestors"].length; i++) {
        //     this.ancestors[ancestorData[0]["ancestors"][i]["Id"]] = ancestorData[0]["ancestors"][i];
        //     thePeopleList.add(ancestorData[0]["ancestors"][i] );
        // }

        XTreeView.myAhnentafel.update(thePeopleList[p.Id]);
        // XTreeView.myAhnentafel.listOfAncestorsForFanChart();
        // Display each generation recursively, starting with our initial profile/person.
        // let people = new Array(p);
        
        document.getElementById("XTreeTitle").innerHTML = 
            `<H3 class='centered'>X-Chromosome Probability Tree<br>for<br/>` + this.displayPersonName(p) + `</H3>`;


        XTreeView.detailsProbabilityTree = `The Probability Tree demonstrates the percentage of X-Chromosome that could be passed along from ancestors to descendants, theoretically.<br/><br/>
        Since recombination occurs most of the time, though not all of the time, when a mother passes along her X-Chromosome to her children,<br/>
        the range that anyone can inherit from a single ancestor can be as low as 0%, or it could be higher than the average shown here.<br/><br/>
        In this Probability Tree, each bar represents that probability of a piece coming from a direct ancestor, with the assumption that<br/>
        at every point there IS a recombination, and that each Mother passes along to her children 50% of each of her X-Chromosomes.<br/><br/>
        Though mathematically aesthetically pleasing, this EXACT result is highly unlikely.  <br/>
        However, it should give an idea of which ancestors are more likely than others to have passed on some of their X-Chromosome.<br/>`;

        XTreeView.detailsRandomSimulation = `<button onclick="XTreeView.changeMode(1);" style="padding:2px;">Randomize</button><br/>This Random Simulation generates one possible X-Chromosome Family Tree.<br/> This Family Tree demonstrates how the X-Chromosome can be passed along from ancestors to descendants.<br/><br/>
        Since recombination occurs most of the time, though not all of the time, when a mother passes along her X-Chromosome to her children,<br/>
        the range that anyone can inherit from a single ancestor will vary. She can pass on one or the other of her X-chromosomes, or a combination of both.<br/><br/>
        In this Family Tree, there are red lines to indicate the recombination points, where the X-Chromosome being passed along switches from one to the other.<br/>
        Note that if the only recombination indicators are at the beginning or end of the line, that indicates one is being passed along fully, and the other one ignored.<br/><br/>
        Though visually pleasing, this EXACT result is highly unlikely.  <br/><br/>
        However, it should give an idea of which ancestors are more likely than others to have passed on some of their X-Chromosome,<br/>
        and make it obvious how random DNA inheritance really is.<br/><br/>
        Comparing your X-chromosome DNA with other relatives' DNA is the only way to confirm which ancestors truly passed on theirs to you.<br/>`;

        XTreeView.forMore = `<br/><hr/>For more details about the X-Chromosome inheritance pattern, check out the <a target=_blank href="https://youtu.be/ppO7tzxuik8?t=64">intro to this video</a>.<br/>
        You can display your own X-Chromosome ancestors in the <a target=_blank href="#view=fanchart">Fan Chart</a> &rarr; open the Settings, choose Highlights, then Highlight cells by <I>X-chromosome inheritance</I>.<br/>
        To investigate further and find other relatives that could share some of your ancestors X-Chromosomes, try the <a target=_blank href="https://apps.wikitree.com/apps/clarke11007/Xfriends.php">X-Friends app</a>.`;

        document.getElementById("XTreeAncestorList").innerHTML = XTreeView.detailsProbabilityTree + XTreeView.forMore; 
         

        condLog(XTreeView.myAhnentafel.listOfAncestorsForFanChart());

        // XTreeView.ahnenNumList.Male.push(2);
        // XTreeView.ahnenNumList.Female.push(3);

        this.seedAhnenNumList("Male", 3);
        this.seedAhnenNumList("Female", 2);
        this.seedAhnenNumList("Female", 3);

        XTreeView.flashWarningMessageBelowButtonBar = this.flashWarningMessageBelowButtonBar;
        XTreeView.showTemporaryMessageBelowButtonBar = this.showTemporaryMessageBelowButtonBar;
        XTreeView.clearMessageBelowButtonBar = this.clearMessageBelowButtonBar;
        XTreeView.displayPersonName = this.displayPersonName;
        XTreeView.redraw = this.setupXAhnentafel;
        XTreeView.changeMode = this.changeMode;
        XTreeView.personPopup = this.personPopup;
        XTreeView.removePopups = this.removePopups;
        XTreeView.birthString = this.birthString;
        XTreeView.deathString = this.deathString;
        XTreeView.humanDate = this.humanDate;

        XTreeView.calculateNewChromosome = this.calculateNewChromosome;

        this.setupXAhnentafel();

        wtViewRegistry.clearStatus();
    }

    changeMode( newMode ) {
        XTreeView.modeNum = newMode;
        let p = XTreeView.PrimaryPerson;
        if (newMode == 0) {
            document.getElementById("XTreeAncestorList").innerHTML =
                XTreeView.detailsProbabilityTree + XTreeView.forMore;
            document.getElementById("XTreeTitle").innerHTML =
                `<H3 class='centered'>X-Chromosome Probability Tree<br>for<br/>` +
                XTreeView.displayPersonName(p) +
                `</H3>`;

        } else {
            document.getElementById("XTreeAncestorList").innerHTML =
                XTreeView.detailsRandomSimulation + XTreeView.forMore; 
            document.getElementById("XTreeTitle").innerHTML =
            `<H3 class='centered'>X-Chromosome Family Tree<br>for<br/>` + XTreeView.displayPersonName(p) + `</H3>`;
        }

        XTreeView.redraw();
    }
    // Flash a message in the WarningMessageBelowButtonBar DIV
    flashWarningMessageBelowButtonBar(theMessage) {
        // condLog(theMessage);
        if (theMessage > "") {
            theMessage = "<P align=center>" + theMessage + "</P>";
        }
        document.getElementById("WarningMessageBelowButtonBar").innerHTML = theMessage;
    }

    showTemporaryMessageBelowButtonBar(theMessage, delay = 3000) {
        XTreeView.flashWarningMessageBelowButtonBar(theMessage);
        setTimeout(this.clearMessageBelowButtonBar, delay);
    }

    clearMessageBelowButtonBar() {
        document.getElementById("WarningMessageBelowButtonBar").innerHTML = "";
    }

    seedAhnenNumList(gender, ahnNum) {
        XTreeView.ahnenNumList[gender].push(ahnNum);

        if (ahnNum < 2 ** this.maxGeneration) {
            if (ahnNum % 2 == 1) {
                this.seedAhnenNumList(gender, 2 * ahnNum);
            }
            this.seedAhnenNumList(gender, 2 * ahnNum + 1);
        }
    }

    calculateNewChromosome(chromoSet) {
        condLog("chromoSet:", chromoSet);
        let chrHTML = "";
        let chrArray = [];
        let dividersHTML = "";

        if (XTreeView.modeNum == 0) {
            // Probability MODE ==> PERFECT PROBABILITIES MODE
            // EACH CHROMOSOME REPRESENTS THE PROBABILITY OF AN ANCESTOR, NOT ACTUAL POSITIONING
            for (let i = 0; chromoSet[1] && i < chromoSet[1].length; i++) {
                const SNP1 = chromoSet[1][i];
                let newSNP1 = { clr: SNP1.clr, end: SNP1.end / 2 };
                chrArray.push(newSNP1);
            }

            for (let i = 0; chromoSet[0] && i < chromoSet[0].length; i++) {
                const SNP0 = chromoSet[0][i];
                let newSNP0 = { clr: SNP0.clr, end: 0.5 + SNP0.end / 2 };
                chrArray.push(newSNP0);
            }
        } else if (XTreeView.modeNum == 1) {
            // RANDOM MODE --> Randomly assigns breakpoints (or lack thereof) and generates a Chromosome
            // EACH CHROMOSOME REPRESENTS ACTUAL POSITIONING, based on random parameters

            const PossibleRecPointsArray = [
                [1],  [0.5,1],  [0.25, 0.4, 0.7, 1], [0,1], [0.3,0.65,1], [.35, 1], [.75,1], [.2, .5, 1], [.5, .70,1], [.15,0.40,0.65, 1]
            ]
            const whichOne = Math.floor( PossibleRecPointsArray.length * Math.random() );
            let ReCoPointsArray = PossibleRecPointsArray[whichOne] ; // [1]; // [0.5,1];// [0.25, 0.4, 0.7, 1];

            // OR ....

            const whichType = 100 * Math.random();
            if (whichType > 93) {
                // use ALL of Momma's chromosome
                ReCoPointsArray = [1];
            } else if (whichType > 86) {
                // use ALL of Daddy's chromosome
                ReCoPointsArray = [0,1];
            } else {
                // Randomly pick bits and pieces from each
                if (Math.round(whichType) % 2 == 0) {
                    ReCoPointsArray = [0];
                } else {
                    ReCoPointsArray = [];
                }
                let currCoPoint = 0;
                let maxRandPart = 4 + Math.floor(whichType/10);
                // going to use "points" from 0 to 16 to represent full length of chromosome and possible recombination points
                // will not allow 1 or 15 as recombination points - too close to edge, so look for numbers between 2 and 14
                while (currCoPoint < 15) {
                    let thisPoint = currCoPoint + Math.round(2 + maxRandPart * Math.random());
                    if (thisPoint > 14) {
                        thisPoint = 16;
                    }
                    ReCoPointsArray.push(thisPoint / 16);
                    currCoPoint = thisPoint;
                }
                

            }


            // ReCoPointsArray = [0,1]
            condLog("ReCoPointsArray = ", ReCoPointsArray);
            let tmpArray0 = [];
            let tmpArray1 = [];

            let currStart = 0;
            let currReCoPointIndex = 0;
            let currReCoPoint = ReCoPointsArray[currReCoPointIndex];
            
            if (currReCoPoint == 0) {
                currReCoPointIndex = 1;
                currReCoPoint = ReCoPointsArray[currReCoPointIndex];
            }

            for (let i = 0; chromoSet[0] && i < chromoSet[0].length; i++) {
                const SNP = chromoSet[0][i];
                if (currReCoPointIndex < ReCoPointsArray.length) {
                    currReCoPoint = ReCoPointsArray[currReCoPointIndex];
                } else {
                    currReCoPoint = 1;
                }

                if (/* currStart == currReCoPoint || */ SNP.end == currReCoPoint) {
                    // nothing to do here
                    currStart = SNP.end;
                    tmpArray0.push(SNP);
                    condLog(" - - adding SNP ", SNP);
                    currReCoPointIndex++;
                } else if (SNP.end < currReCoPoint) {
                    // Again, nothing to do here, we'll deal with this ReCoPoint later
                    currStart = SNP.end;
                    tmpArray0.push(SNP);
                    condLog(" - - adding SNP ", SNP);
                } else if (currStart < currReCoPoint && currReCoPoint < SNP.end) {
                    // FINALLY - we get to do something fun!
                    // ADD a new way point in the temporary array
                    tmpArray0.push({ clr: SNP.clr, end: currReCoPoint });
                    condLog( "Adding NEW SNP into the mix: ", { clr: SNP.clr, end: currReCoPoint });
                    currStart = currReCoPoint;
                    i--; // WE have to DECREASE the counter, so it checks this again, to see if there are more ReCoPoints in between the second half of the SNP
                    currReCoPointIndex++;
                    
                } else {
                    condLog("IGNORING THIS SNP: ", currReCoPoint, SNP);
                }
            }
            currStart = 0;
            currReCoPointIndex = 0;
            currReCoPoint = ReCoPointsArray[currReCoPointIndex];
            if (currReCoPoint == 0) {
                currReCoPointIndex = 1;
                currReCoPoint = ReCoPointsArray[currReCoPointIndex];
            }

            for (let i = 0; chromoSet[1] && i < chromoSet[1].length; i++) {
                const SNP = chromoSet[1][i];
                if (currReCoPointIndex < ReCoPointsArray.length) {
                    currReCoPoint = ReCoPointsArray[currReCoPointIndex];
                } else {
                    currReCoPoint = 1;
                }

                if (/* currStart == currReCoPoint || */ SNP.end == currReCoPoint) {
                    // nothing to do here
                    currStart = SNP.end;
                    tmpArray1.push(SNP);
                    condLog(" - - adding SNP ", SNP);
                    currReCoPointIndex++;
                } else if (SNP.end < currReCoPoint) {
                    // Again, nothing to do here, we'll deal with this ReCoPoint later
                    currStart = SNP.end;
                    tmpArray1.push(SNP);
                    condLog(" - - adding SNP ", SNP);
                } else if (currStart < currReCoPoint && currReCoPoint < SNP.end) {
                    // FINALLY - we get to do something fun!
                    // ADD a new way point in the temporary array
                    tmpArray1.push({ clr: SNP.clr, end: currReCoPoint });
                    condLog("Adding NEW SNP into the mix: ", { clr: SNP.clr, end: currReCoPoint });
                    currStart = currReCoPoint;
                    i--; // WE have to DECREASE the counter, so it checks this again, to see if there are more ReCoPoints in between the second half of the SNP
                    currReCoPointIndex++;
                
                } else {
                    condLog("IGNORING THIS SNP: ", currReCoPoint, SNP);
                }
            }

            if (ReCoPointsArray.length == 2 && ReCoPointsArray [0] == 0) {
                tmpArray1 = chromoSet[1];
            }
            condLog("NEW TMP ARRAYS:");
            condLog(tmpArray0);
            condLog(tmpArray1);

            // let newSNP = { clr: SNP.clr, end: SNP.end / 2 };

            let currChrome = 0;

            let prevRecPoint = 0;

            

            for (let r = 0; r < ReCoPointsArray.length; r++) {
                currReCoPoint = ReCoPointsArray[r];
                condLog("Working on ReCoPoint # ",r, "@", currReCoPoint);
                let currPtX = Math.round(128 * currReCoPoint);
                dividersHTML +=
                    "<line class=ReCoDividingLine x1=" +
                    currPtX +
                    " y1=-20  x2=" +
                    currPtX +
                    " y2=20   style='stroke: red; stroke-width: 1;'/> ";
                if (currReCoPoint == 0) {
                    //currChrome = 1;
                } else {
                    let thisTmpArray = [];
                    if (r % 2 == 1) {
                        thisTmpArray = tmpArray1;
                        condLog(" ... presumably from side 1")
                    } else {
                        thisTmpArray = tmpArray0;
                        condLog(" ... presumably from side 0")
                    }
                    let currSNPstart = 0;
                    for (let t = 0; t < thisTmpArray.length; t++) {
                        const thisSNP = thisTmpArray[t];
                        let doPushSNP = false;
                        if (currSNPstart == prevRecPoint) {
                            doPushSNP = true;
                            // chrArray.push(thisSNP);
                            // currSNPstart = thisSNP.end;
                        } else if (thisSNP.end == currReCoPoint) {
                            doPushSNP = true;

                            // chrArray.push(thisSNP);
                            // currSNPstart = thisSNP.end;
                        } else if (currSNPstart > prevRecPoint && thisSNP.end < currReCoPoint) {
                            doPushSNP = true;
                            // chrArray.push(thisSNP);
                            // currSNPstart = thisSNP.end;
                        }
                        if (doPushSNP == true) {
                            chrArray.push(thisSNP);
                            condLog (" ...... pushing SNP ", t, thisSNP)
                        }
                        currSNPstart = thisSNP.end;
                    }
                }
                // currChrome = 1 - currChrome ; // toggle between 0 and 1
                prevRecPoint = currReCoPoint;
            }

            // for (let i = 0; chromoSet[1] && i < chromoSet[1].length; i++) {
            //      const SNP1 = chromoSet[1][i];
            //      let newSNP1 = { clr: SNP1.clr, end: SNP1.end / 2 };
            //      chrArray.push(newSNP1);
            // }

            // for (let i = 0; chromoSet[0] && i < chromoSet[0].length; i++) {
            //      const SNP0 = chromoSet[0][i];
            //      let newSNP0 = { clr: SNP0.clr, end: 0.5 + SNP0.end / 2 };
            //      chrArray.push(newSNP0);
            //  }
        }

        condLog(chrArray);

        let lastEnd = 0;
        for (let i = 0; chrArray && i < chrArray.length; i++) {
            const SNP = chrArray[i];
            const newX = lastEnd * 128;
            const newWidth = (SNP.end - lastEnd) * 128;
            const newClr = SNP.clr;
            chrHTML +=
                '<rect width="' +
                Math.round(newWidth) +
                '"  x="' +
                Math.round(newX) +
                '" height="8" style="fill:' +
                newClr +
                ';stroke:black;stroke-width:1;opacity:1"></rect>';
            lastEnd = SNP.end;
        }
        condLog(chrHTML.replace(/<rect/g,"\n<rect"));
        return { html: chrHTML, clrs: chrArray , divs:dividersHTML};
    }

    setupXAhnentafel() {
        // FIRST THING:  Let's make sure we have a valid # of generations to work with:
        condLog("XTreeView.numGens2Display = ", XTreeView.numGens2Display);
        XTreeView.numGens2Display = Math.max(1, Math.min(8, XTreeView.numGens2Display));
        document.getElementById("numGensInBBar").innerHTML = XTreeView.numGens2Display;

        // NOW - let's check on the GENDER of the primary person - that will make a difference with the X ahnentafel and family tree displayed
        let thisGender = "Male";
        if (
            thePeopleList[XTreeView.myAhnentafel.list[1]]._data.Gender &&
            thePeopleList[XTreeView.myAhnentafel.list[1]]._data.Gender == "Female"
        ) {
            thisGender = "Female";
        }

        const acceptableAhnenNums = XTreeView.ahnenNumList[thisGender]; // different ahnentafel #s accepted based on gender (women have more X ancestors)

        let theList = "<SVG id=ConnectingLines></SVG>";
        let thisClr = "orange";
        let thisClr2 = "tan";
        const grayClr = "lightgray";
        let genCollections = [];
        let maxGenWidth = 1;
        XTreeView.currClrNum = 1;//++;

        for (let ahnNum = 1; ahnNum < 2 ** XTreeView.numGens2Display; ahnNum++) {
            const thisAnc = XTreeView.myAhnentafel.list[ahnNum];
            const thisPerson = thePeopleList[thisAnc];
            const thisGenNum = Math.floor(Math.log2(ahnNum));
            if (ahnNum == 1 || (thisAnc && thisPerson && acceptableAhnenNums.indexOf(ahnNum) > -1)) {
                if (genCollections[thisGenNum]) {
                    genCollections[thisGenNum].push(ahnNum);
                } else {
                    genCollections[thisGenNum] = [ahnNum];
                }

                if (ahnNum > 1) {
                    XTreeView.currClrNum++;
                }
                thisClr = XTreeView.ChromoColoursArray[XTreeView.currClrNum % XTreeView.ChromoColoursArray.length][2];
                XTreeView.clrs4AhnensArray[ahnNum] = [[{ clr: thisClr, end: 1 }], []];
                maxGenWidth = Math.max(maxGenWidth, genCollections[thisGenNum].length);
                let theTextLengthParameter = "";
                if (thisPerson._data.FirstName.length > 20) {
                    theTextLengthParameter = " textLength=130";
                }
                theList +=
                    "<a onclick=XTreeView.personPopup(" +
                    ahnNum + 
                    ");><text id=FName" +
                    ahnNum +
                    theTextLengthParameter +
                    " font-weight=bold x=1 y=17 fill='black'> " +
                    thisPerson._data.FirstName +
                    "</text>" +
                    "<text id=LName" +
                    ahnNum +
                    " font-weight=bold x=1 y=27 fill='black'> " +
                    thisPerson._data.LastNameAtBirth +
                    // " (" +
                    // thisGenNum +
                    // "," +
                    // ahnNum +
                    // ")" +
                    "</text></a>" +
                    "<SVG  id=Chr1for" +
                    ahnNum +
                    " width=132 height=10>" +
                    "<rect width=128 height=8 style='fill:" +
                    thisClr +
                    ";stroke:black;stroke-width:1;opacity:1' />" +
                    "</SVG>";

                if (ahnNum == 1 && thePeopleList[XTreeView.myAhnentafel.list[1]]._data.Gender == "Female") {
                    XTreeView.currClrNum++;
                    thisClr2 =
                        XTreeView.ChromoColoursArray[XTreeView.currClrNum % XTreeView.ChromoColoursArray.length][2];
                    XTreeView.clrs4AhnensArray[ahnNum][1] = [{ clr: thisClr2, end: 1 }];

                    theList +=
                        // "<br/>" +
                        "<SVG   id=Chr2for" +
                        ahnNum +
                        " width=132 height=10><rect width=128 height=8 style='fill:" +
                        thisClr2 +
                        ";stroke:black;stroke-width:1;opacity:1' />" +
                        "</SVG>";
                } else if (ahnNum > 1 && ahnNum % 2 == 1) {
                    // XTreeView.currClrNum++;

                    const shiftHex = [
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9",
                        "A",
                        "B",
                        "C",
                        "D",
                        "E",
                        "F",
                        "0",
                        "1",
                    ];
                    let newClr =
                        "#" +
                        (thisClr.substring(1, 2) == "F"
                            ? "E" + thisClr.substring(2, 3)
                            : shiftHex[shiftHex.indexOf(thisClr.substring(1, 2)) + 1] + "F") +
                        (thisClr.substring(3, 4) == "F"
                            ? "E" + thisClr.substring(4, 5)
                            : shiftHex[shiftHex.indexOf(thisClr.substring(3, 4)) + 1] + "F") +
                        (thisClr.substring(5, 6) == "F"
                            ? "E" + thisClr.substring(6)
                            : shiftHex[shiftHex.indexOf(thisClr.substring(5, 6)) + 1] + "F");
                    // condLog(
                    //     "Calcuing new Clr from ",
                    //     thisClr,
                    //     "to",
                    //     newClr,
                    //     thisClr.substring(1, 1),
                    //     thisClr.substring(1, 2)
                    // );
                    thisClr2 = newClr; //XTreeView.ChromoColoursArray[XTreeView.currClrNum % XTreeView.ChromoColoursArray.length][2];
                    XTreeView.clrs4AhnensArray[ahnNum][1] = [{ clr: thisClr2, end: 1 }];

                    theList +=
                        // "<br/>" +
                        "<SVG   id=Chr2for" +
                        ahnNum +
                        " width=132 height=10><rect width=128 height=8 style='fill:" +
                        thisClr2 +
                        ";stroke:black;stroke-width:1;opacity:1' />" +
                        "</SVG>";
                }

                // theList +="</SVG>";
                // theList +="</person>";
            } else if (acceptableAhnenNums.indexOf(ahnNum) > -1) {
                condLog("VERY MISSING but ACCEPTABLE:", ahnNum, thisAnc);
                if (genCollections[thisGenNum]) {
                    genCollections[thisGenNum].push(ahnNum);
                } else {
                    genCollections[thisGenNum] = [ahnNum];
                }

                maxGenWidth = Math.max(maxGenWidth, genCollections[thisGenNum].length);

                theList +=
                    "<SVG  id=Chr1for" +
                    ahnNum +
                    " width=132 height=10>" +
                    "<rect width=128 height=8 style='fill:" +
                    grayClr +
                    ";stroke:black;stroke-width:1;opacity:1' />" +
                    "</SVG>";

                if (ahnNum > 1 && ahnNum % 2 == 1) {
                    theList +=
                        // "<br/>" +
                        "<SVG   id=Chr2for" +
                        ahnNum +
                        " width=132 height=10><rect width=128 height=8 style='fill:" +
                        grayClr +
                        ";stroke:black;stroke-width:1;opacity:1' />" +
                        "</SVG>";
                }
            }
        }

        document.getElementById("XTreeFamilyTree").innerHTML =
            // "INSERT SVG FOR FAMILY TREE HERE" +
            "<SVG id=outerSVG width=1000 height=1000 style='background-color:white;'>" + theList + "</SVG><br/>";

        condLog("Widest @ ", maxGenWidth, "\n", genCollections);

        if (genCollections.length < XTreeView.numGens2Display) {
            let nth = "th";
            if (genCollections.length == 1) {
                nth = "st";
            } else if (genCollections.length == 2) {
                nth = "nd";
            } else if (genCollections.length == 3) {
                nth = "rd";
            }
            condLog("There are no more ancestors beyond the " + genCollections.length + nth + " generation.");
            if (this.showTemporaryMessageBelowButtonBar) {
                this.showTemporaryMessageBelowButtonBar(
                    "There are no more ancestors beyond the " + genCollections.length + nth + " generation."
                );
                // } else {
                //     condLog("Can't find showTemporaryMessageBelowButtonBar");
                //     condLog("this = ", this);
                //     condLog(XTreeView.showTemporaryMessageBelowButtonBar);
                //     condLog(showTemporaryMessageBelowButtonBar);
                //     condLog(this.showTemporaryMessageBelowButtonBar);
            }
        }

        document.getElementById("outerSVG").setAttribute("height", genCollections.length * 100 - 20);
        document.getElementById("outerSVG").setAttribute("width", maxGenWidth * 140);

        if (window.innerWidth > maxGenWidth * 140) {
            condLog("WINDOW FITS", window.innerWidth);
            const dx4svg = Math.round((window.innerWidth - maxGenWidth * 140) / 2);
            document.getElementById("outerSVG").style.transform = "translate(" + dx4svg + "px, 0px)";
        } else {
            condLog("WINDOW IS TOO NARROW / SVG IS TOO WIDE", window.innerWidth, maxGenWidth * 140);
        }

        let linesDIV = document.getElementById("ConnectingLines");
        let linesHTML = "";
        for (let g = genCollections.length - 1; g >= 0; g--) {
            for (let i = 0; i < genCollections[g].length; i++) {
                const ahnNum = genCollections[g][i];
                const thisDIV = document.getElementById("Chr1for" + ahnNum);
                const thisDIVpa = document.getElementById("Chr1for" + 2 * ahnNum);
                const thisDIVma = document.getElementById("Chr1for" + (2 * ahnNum + 1));
                const thisDIV2 = document.getElementById("Chr2for" + ahnNum);
                const FNameDIV = document.getElementById("FName" + ahnNum);
                const LNameDIV = document.getElementById("LName" + ahnNum);
                // if (thisDIV) {
                //     thisDIV.style.transform = "translate(60px, " + 2 * ahnNum + "px)";
                // }
                // if (thisDIV2) {
                //     thisDIV2.style.transform = "translate(60px, " + (2 * ahnNum + 12) + "px)";
                // }
                // if (FNameDIV) {
                //     FNameDIV.style.transform = "translate(60px, " + (2 * ahnNum - 22) + "px)";
                // }
                // if (LNameDIV) {
                //     LNameDIV.style.transform = "translate(60px, " + (2 * ahnNum - 12) + "px)";
                // }

                if (thisDIV) {
                    let thisX = 140 * i;
                    let thisY = 100 * (genCollections.length - g) - 80;

                    if (ahnNum % 2 == 0 || (ahnNum == 1 && thisGender == "Male")) {
                        // a Male should have the same X coordinate as his mother - IF one exists in the Tree.
                        if (thisDIVma) {
                            thisX = thisDIVma.getAttribute("x");

                            linesHTML +=
                                "<line x1=" +
                                (thisX * 1 + 130 / 2) +
                                " y1=" +
                                (thisY - 20) +
                                " x2=" +
                                (thisX * 1 + 130 / 2) +
                                " y2=" +
                                (thisY - 50) +
                                " style='stroke: blue; stroke-width: 2;' />";
                        }
                        if (XTreeView.clrs4AhnensArray[ahnNum]) {
                            XTreeView.clrs4AhnensArray[ahnNum][1] = [];
                        } else {
                            XTreeView.clrs4AhnensArray[ahnNum] = [[{ clr: "lightgray", end: 1 }], []];
                        }
                    } else if (ahnNum % 2 == 1) {
                        // a Female should have the average X coordinate as her parents - IF they exist in the Tree.
                        if (thisDIVma && thisDIVpa) {
                            thisX = (thisDIVma.getAttribute("x") * 1 + thisDIVpa.getAttribute("x") * 1) / 2;
                            // condLog("thisX for ", ahnNum, " = avg(" , thisDIVma.getAttribute("x") , thisDIVpa.getAttribute("x"), ") = ",thisX);
                            linesHTML +=
                                "<line x1=" +
                                (thisX * 1 + 130 / 2) +
                                " y1=" +
                                (thisY - 20) +
                                " x2=" +
                                (thisDIVma.getAttribute("x") * 1 + 130 / 2) +
                                " y2=" +
                                (thisY - 50) +
                                " style='stroke: blue; stroke-width: 2;' />";
                            linesHTML +=
                                "<line x1=" +
                                (thisX * 1 + 130 / 2) +
                                " y1=" +
                                (thisY - 20) +
                                " x2=" +
                                (thisDIVpa.getAttribute("x") * 1 + 130 / 2) +
                                " y2=" +
                                (thisY - 50) +
                                " style='stroke: blue; stroke-width: 2;' />";
                        }

                        condLog(thisDIV.innerHTML);
                        if (!XTreeView.clrs4AhnensArray[ahnNum]) {
                            condLog("NO clrs4AhnensArray[ahnNum] ENTRY HERE!");
                        } else {
                            if (thisDIVpa && XTreeView.clrs4AhnensArray[2 * ahnNum ]) {
                                condLog(
                                    "Copying thisDIVpa.innerHTML for ",
                                    ahnNum,
                                    thisDIV2.innerHTML , thisDIVpa.innerHTML
                                );
                                if (thisDIVpa.innerHTML.indexOf("lightgray") > -1) {
                                    // let's not copy this one over
                                } else {

                                    thisDIV2.innerHTML = thisDIVpa.innerHTML;
                                    XTreeView.clrs4AhnensArray[ahnNum][1] = XTreeView.clrs4AhnensArray[2 * ahnNum][0];
                                }
                            }
                        }
                    }
                    if (thisDIVma && XTreeView.clrs4AhnensArray[2 * ahnNum + 1]) {
                        condLog("CALC CHROME for ", ahnNum);
                        const newClrMatrixAfterRecombination = XTreeView.calculateNewChromosome(
                            XTreeView.clrs4AhnensArray[2 * ahnNum + 1]
                        );
                        condLog("RESULT IS:\n", newClrMatrixAfterRecombination);
                        XTreeView.clrs4AhnensArray[ahnNum][0] = newClrMatrixAfterRecombination.clrs;
                        thisDIV.innerHTML = newClrMatrixAfterRecombination.html ;

                        linesHTML +=
                            "<SVG x=" +
                            thisDIVma.getAttribute("x") +
                            " y=" +
                            thisDIVma.getAttribute("y") +
                            " >" +
                            newClrMatrixAfterRecombination.divs +
                            "</SVG>";
                    }
                    condLog("thisDIV = \n", thisDIV);

                    if (acceptableAhnenNums.indexOf(ahnNum) > -1) {
                        // thisX -= acceptableAhnenNums.indexOf(ahnNum) * 30;
                    }

                    thisDIV.setAttribute("x", thisX);
                    thisDIV.setAttribute("y", thisY + 20);

                    if (thisDIV2) {
                        thisDIV2.setAttribute("x", thisX);
                        thisDIV2.setAttribute("y", thisY + 36);
                    }

                    if (FNameDIV) {
                        FNameDIV.style.transform = "translate(" + thisX + "px, " + (thisY - 22) + "px)";
                    }
                    if (LNameDIV) {
                        LNameDIV.style.transform = "translate(" + thisX + "px, " + (thisY - 12) + "px)";
                    }
                } else {
                    condLog("NO DIV found for ", ahnNum);
                }
            }
        }

        linesDIV.innerHTML = linesHTML;

        condLog(XTreeView.clrs4AhnensArray);
    }

    
     
    displayPersonName(person) {
        let html = "";

        if (person.Id == 0) {
            html += `[${this.unknownName()} Unknown]`;
        } else {
            if (!person.MiddleName) {
                person.MiddleName = "";
            }

            html += "<b>";
            html += `${person.FirstName} ${person.MiddleName} `;
            if (person.Nicknames) {
                html += `"${person.Nicknames}" `;
            }
            if (person.LastNameCurrent != person.LastNameAtBirth) {
                html += ` (${person.LastNameAtBirth}) `;
            }
            html += `${person.LastNameCurrent}`;
            if (person.Suffix) {
                html += ` ${person.Suffix}`;
            }
        }

        return html;
    }

   


    /**
     * Show a popup for the person.
     */
    personPopup(ahnNum) {
        XTreeView.removePopups();
        let person = null;
        if (ahnNum > 0) {
            person = thePeopleList[XTreeView.myAhnentafel.list[ahnNum]];
        }
        let thisPeep = thePeopleList[person._data.Id];
        console.log("POPUP",person);
        console.log("POPUP peep",thisPeep._data.Codes);
        var photoUrl = person.getPhotoUrl(75),
            treeUrl = window.location.pathname + "?id=" + person.getName();

        
        // Use generic gender photos if there is not profile photo available
        if (!photoUrl) {
            if (person._data.PhotoData && person._data.PhotoData["url"]) {
                photoUrl = person._data.PhotoData["url"];
            }
            if (!photoUrl) {
                if (person.getGender() === "Male") {
                    photoUrl = "images/icons/male.gif";
                } else {
                    photoUrl = "images/icons/female.gif";
                }
            }
        }

        let displayName = person._data.BirthName ? person._data.BirthName : person._data.BirthNamePrivate;
    

        console.log("Photo", photoUrl);

        let zoomFactor = Math.max(1, 1 / XTreeView.currentScaleFactor);

        var popupDIV = document.getElementById("popupDIV");
        let borderColor = 'green';
        let thePopupHTML = `
				<div class="popup-box" style="border-color: ${borderColor}">
					<div class="top-info">
						<div class="image-box"><img src="https://www.wikitree.com/${photoUrl}"></div>
						<div class="vital-info">
						  <div class="name">
						    <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${displayName}</a>
						    <span class="tree-links"><a href="#name=${person.getName()}"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
						  </div>
						  <div class="birth vital">${XTreeView.birthString(person)}</div>
						  <div class="death vital">${XTreeView.deathString(person)}</div>
						  
						</div>
					</div>

				</div>
			`;

        popupDIV.innerHTML = thePopupHTML;

        popupDIV.onclick =  function () {
            condLog("d3.select treeViewerContainer onclick - REMOVE POPUP");
             popupDIV.innerHTML = "";
        };
    };

    /**
     * Remove all popups. It will also remove
     * any popups displayed by other trees on the
     * page which is what we want. If later we
     * decide we don't want that then we can just
     * add the selector class to each popup and
     * select on it, like we do with nodes and links.
     */
    removePopups() {
        condLog("Tree.prototype - REMOVE POPUPS (plural) function");
        d3.selectAll(".popup").remove();
    };


     /**
     * Generate text that display when and where the person was born
     */
     birthString(person) {
        var string = "",
            date = XTreeView.humanDate(person.getBirthDate()),
            place = person.getBirthLocation();

        return `B. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    /**
     * Generate text that display when and where the person died
     */
     deathString(person) {
        var string = "",
            date = XTreeView.humanDate(person.getDeathDate()),
            place = person.getDeathLocation();

        return `D. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
            place ? `in ${place}` : "[location unknown]"
        }.`;
    }

    
    /**
     * Turn a wikitree formatted date into a humanreadable date
    */
   humanDate(dateString) {
         var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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


};
