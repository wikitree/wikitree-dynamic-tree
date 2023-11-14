/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Super Big Family Tree uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 *
 * There is a Button Bar TABLE at the top of the container,
 * then the SVG graphic is below that.
 *
 * The FIRST chunk of code in the SVG graphic are the <line> objects for the connectors in the Super Big Family Tree joining children to parents and siblings.
 * 
 * The SECOND chunk of code in the SVG graphic are the <leaf> objects representing individual people in the Super Big Family Tree,
 * each with a unique ID, starting with how they are related to the Primary person (A0) 
 * -> then the ChunkID concatenates the path via closest relationships
 *       _Pn: for Partner (for non-direct ancestor partners)
 *       _Kn: for Kids
 *       _Sn: for Siblings
 *       _RM: / _RF: for (pa)Rents (male/female) 
 * 
 *  (NOTE that there may be multiple <leaf>s for some unique individuals if they are related to the primary person in multiple ways>, each would have a unique ChunkID)
 * 
 * The individual people in the Super Big Family Tree, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class="person" transformed object with a translation from 0,0 ></g>
 *
 * The Button Bar does not resize, but has clickable elements, which set global variables in the SuperBigFamView, then calls a redraw
 * 
 * DATA STRUCTURES:
 * 
 * thePeopleList ==> is a collection of unique individuals, each person has ONE entry in thePeopleList, using the WikiTree ID number as their key
 *      Additional Fields to be added to thePeopleList for this app:
 *          * Siblings -> howSibling ("Full", "Paternal", "Maternal","Adoptive")
 *          * Children -> coParent (wikiTree ID number)
 *          * Children -> orderNum (birth order number within nuclear family sharing same coParent)
 *          * AdoptiveMother / AdoptiveFather for Primary Person only (for now at least)
 *          * LeafCodes [ ] -> array of theLeafCollection Codes where this individual appears or could appear, based on ButtonBar settings
 * 
 * theLeafCollection --> is a collection for every leaf on the Super Big Family Tree
 *      * FullCode -> contains Type of Relationship Step + WikiTree ID number at each point
 *      * Code -> contains string of Types of Relationship (FullCode without WikiTree ID #s) - used as key for theLeafCollection
 *      * Id -> WikiTree ID # for person (so direct connection can be made with thePeopleList record)
 *      * Chunk -> identifier to use with which larger chunk of the Big Family Tree this belongs in, so it can appear / disappear based on settings in Button Bar.
 * 
 * theChunkCollection --> is a collection for each SET of leaves that all appear or disappear based on changes in the Button Bar settings based on combination of Ancestors / Descendants / Cousins / In-Laws
 *      * Chunk -> identifier to use to group similar leaves together 
 *              e.g. A2C1 = first cousins generated from grandparents' siblings
 *              breakdown of A2 levels:
 *                      A2 = grandparents only (needed for strict pedigree view)
 *                      A2C0 = aunts/uncles from grandparents generation (i.e. grandparents' siblings - and only full siblings)
 *                      A2C1 = first cousins generated from grandparents' siblings (i.e. includes partners + children of grandparents' siblings (those that were part of A2C0) )
 *                      A2C1IL = in-law ofs the partners of grandparents' siblings  [ Note : at A2C0 - no partners included, so therefor no IL possible either ]
 *                      A2C2 = second cousins level --> partners + children of A2C1 level 
 *                      ... and so on ....
 *      * CurrentDisplay -> current Display Settings based on Names, Dates, Extras settings
 *              to be used to determine if a change in a settings option requires a recalculation of the size of the Leaf Box or not
 * 
 *      * CodesList -> array of all Codes for every Leaf that belongs to that chunk
 
 * 
 * 
 * APP LOGIC (big picture overview)
 *  - display initial loading message, brief descriptor of app to buy us wait time from impatient WikiTreers
 *  - initially (eventually) load enough data for 3 ancestors / 3 descendants / 3rd cousins / with in-laws to be displayed
 *  - BUT ... to get the ball rolling, start with the minimum data request to satisfy default settings of 2 ancestors / 1 descendant / cousins 0 (aunts & uncles) / no in-laws
 *       * getPeople --> PRIMARY , Nuclear = 2 (CC2 basically), Siblings = 1, include Spouses in the list of fields
 
 *  - process data to fill out thePeopleList structure completely
 * 
 *  - create leaf nodes for all people at this level
 *      - add leaf node HTML to appropriate Chunk collection
 * 
 *  - actually display 2 ancestors / 1 descendant / cousins 0 (aunts & uncles) / no in-laws
 *    --> hide All / show qualifying Nodes & update leaf as per Settings (names, dates, extras)
 *    --> calcPositions (use recursive functions to do this efficiently)
 *    --> drawLines
 *  
 *    --> save current display Settings, and update related Chunks (ChunkInnerHTML)
 * 
 *  - AFTER initial SBF tree is displayed, then quietly, asynchronously, start working through adding more peeps
 *      enough to satisfy for 3 ancestors / 2 descendants / 3rd cousins / with in-laws to be displayed
 * 
 *      * To ADD ANCESTORS @ Gen N
 *          -> getPeople keys: A(N) direct ancestors + their Siblings, ancestors:1, descendants:3, siblings:0, incl. Spouses in fields list
 *              * --> collect all the SPOUSES from the above getPeople, and then do a second API run:
 *          -> getPeople keys: SpousesOf A(N) call just done , ancestors:1 , siblings:0, incl. Spouses  (if ONLY doing parents-in-law, then ancestors:1 is better, if doing siblings too, then nuclear:1)
 * 
 *      * To ADD DESCENDANTS @ Gen N
 *          -> getPeople keys: PRIMARY + Primary's Siblings, descendants:N, minGenerations:N, siblings:0, incl. Spouses in fields list
 *              * --> collect all the SPOUSES from the above getPeople, and then do a second API run:
 *          -> getPeople keys: SpousesOf A(N) call just done , ancestors:1 , siblings:0, incl. Spouses  (if ONLY doing parents-in-law, then ancestors:1 is better, if doing siblings too, then nuclear:1)
 * 
 *      * process data --> thePeopleList
 *      * create leaf nodes --> theLeafCollection , 
 *      * add new entries into theChunkCollection, and update existing chunks as needed
 * 
 *  - IF BUTTON BAR SETTING IS CHANGED:
 *      * Check if this requires a redraw of leaves (Planning mode checkbox) & set flag if so
 *      * Hide/Show appropriate chunks of leaves
 *      * updateLeaves if needed
 *      * calcPositions
 *      * drawLines
 *      * saveSettings & update Chunks
 * 
 *  - IF SETTINGS PANEL SETTING IS CHANGED:
 *      * Check if this requires a redraw of leaves (based on what changed) & set flag if so
 *      * Hide/Show appropriate chunks of leaves if that is affected
 *      * updateLeaves if needed
 *      * calcPositions if needed
 *      * drawLines if needed
 *      * saveSettings & update Chunks
 * 
 * // DRAW FUNCTION - which drives everything on screen
 *      * has these 3 primary function calls :
 *          * getAllLeafNodes() --> returns all the Leaf Nodes that will be needed based on the current settings from the Button Bar
 *          * repositionLeaves() --> will calculate the appropriate x,y for EACH of those leaves using some voodoo recursive logic
 *          * drawLines() --> will draw all the connecting lines based on those x,y values of the family members  
 *                  IN DEVELOPMENT:  CURRENT THINKING - 
 *                          ONE SVG object to rewrite each time, and use multiple polylines 
 *                              - one poly line per family grouping from equals signs joining the happy couple and then connecting to each bouncing baby, 
 *                                  perhaps colour coded so families are easy distinguishable
 *          * drawNodes() --> does the ACTUAL drawing of the nodes, 
 *                          relies on the node.enter to create the initial SVG / HTML <g class person ancestor> </g> objects
 *                          and on node.transform to revise
 * 
 */

(function () {
    const APP_ID = "SuperBigTree";
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2;

    const PRINTER_ICON = "&#x1F4BE;";
    const SETTINGS_GEAR = "&#x2699;";
    const LEGEND_CLIPBOARD = "&#x1F4CB;";

    let font4Name = "Arial";
    let font4Info = "Arial";

    const FullAppName = "Super Big Family Tree app";
    const AboutPreamble =
        "The Super Big Family Tree app was originally created to be a member of the WikiTree Tree Apps.<br>It is maintained by the original author plus other WikiTree developers.";
    const AboutUpdateDate = "18 October 2023";
    const AboutAppIcon = `<img height=30px src="https://apps.wikitree.com/apps/clarke11007/pix/SuperBigFamTree.png" />`;
    const AboutOriginalAuthor = "<A target=_blank href=https://www.wikitree.com/wiki/Clarke-11007>Greg Clarke</A>";
    const AboutAdditionalProgrammers = "Steve Adey";
    const AboutAssistants =
        "Rob Pavey, <A target=_blank href=https://www.wikitree.com/wiki/Duke-5773>Jonathan Duke</A>";
    const AboutLatestG2G = ""; //"https://www.wikitree.com/g2g/1599363/recent-updates-to-the-fan-chart-tree-app-july-2023";
    const AboutHelpDoc = "https://www.wikitree.com/wiki/Space:Super_Big_Family_Tree_app";
    const AboutOtherApps = "https://apps.wikitree.com/apps/clarke11007";

    const SVGbtnCLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="red"/>
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
    const SVGbtnRESIZE2 = `<svg width="16" height="16" viewBox="0 -0.5 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
            class="si-glyph si-glyph-arrow-fullscreen-2">    
            <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <path d="M14.988,6.979 C15.547,6.979 16,6.527 16,5.97 L16,1.008 C16,0.45 15.547,-0.000999999989 14.988,-0.000999999989 L10.011,-0.000999999989 C9.452,-0.000999999989 8.999,0.45 8.999,1.008 L10.579,2.583 L8.009,5.153 L5.439,2.583 L7.019,1.008 C7.019,0.45 6.566,-0.000999999989 6.007,-0.000999999989 L1.03,-0.000999999989 C0.471,-0.000999999989 0.0179999999,0.45 0.0179999999,1.008 L0.0179999999,5.97 C0.0179999999,6.527 0.471,6.979 1.03,6.979 L2.62,5.394 L5.194,7.968 L2.598,10.565 L1.028,9 C0.471,9 0.0189999999,9.45 0.0189999999,10.006 L0.0189999999,14.952 C0.0189999999,15.507 0.471,15.958 1.028,15.958 L5.99,15.958 C6.548,15.958 6.999,15.507 6.999,14.952 L5.417,13.375 L8.009,10.783 L10.601,13.375 L9.019,14.952 C9.019,15.507 9.47,15.958 10.028,15.958 L14.99,15.958 C15.547,15.958 15.999,15.507 15.999,14.952 L15.999,10.006 C15.999,9.45 15.547,9 14.99,9 L13.42,10.565 L10.824,7.968 L13.398,5.394 L14.988,6.979 L14.988,6.979 Z" fill="#434343" class="si-glyph-fill">
                </path>
            </g>
        </svg>`;

    /**
     * Constructor
     */
    var SuperBigFamView = (window.SuperBigFamView = function () {
        Object.assign(this, this?.meta());
    });

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Super Big Family Tree

    /** Static variable to hold unique ids for private persons **/
    SuperBigFamView.nextPrivateId = -1;

    /** Static variable to hold the Maximum Angle for the Super Big Family Tree (360 full circle / 240 partial / 180 semicircle)   **/
    SuperBigFamView.maxAngle = 240;
    SuperBigFamView.lastAngle = 240;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    SuperBigFamView.numGens2Display = 3;

    SuperBigFamView.numAncGens2Display = 2;
    SuperBigFamView.numDescGens2Display = 1;
    SuperBigFamView.numCuzGens2Display = 0;
    SuperBigFamView.displayINLAWS = 0;
    SuperBigFamView.displayPrivatize = 0;

    SuperBigFamView.lastNumGens = 3;
    SuperBigFamView.numGensRetrieved = 3;
    SuperBigFamView.numAncGensRetrieved = 0;
    SuperBigFamView.numDescGensRetrieved = 1;
    SuperBigFamView.numCuzGensRetrieved = 0;
    
    SuperBigFamView.maxNumAncGens = 7;
    SuperBigFamView.maxNumDescGens = 7;
    SuperBigFamView.maxNumCuzGens = 4;
    
    SuperBigFamView.workingMaxNumAncGens = 3;
    SuperBigFamView.workingMaxNumDescGens = 2;
    SuperBigFamView.workingMaxNumCuzGens = 1;

    SuperBigFamView.maxDiamPerGen = []; // used to store the diameter of the spokes for the Super Big Family Tree
    SuperBigFamView.currentScaleFactor = 1;
    SuperBigFamView.lastCustomScaleFactor = 0.9;
    SuperBigFamView.zoomCounter = 0;

    SuperBigFamView.loadedLevels = ["A1", "A2", "D1"];
    SuperBigFamView.linesATC = []; // the Lines (connectors) Air Traffic Controller

    SuperBigFamView.currentPopupID = -1;

    // holding spot for current list of IDs being used for keys to the getPeople API
    SuperBigFamView.currentListOfIDs = [];

    // parking spot for Lists of IDs that were inputs and outputs of various getPeople API calls
    SuperBigFamView.ListsOfIDs = {
        A1inp: [],
        A1out: [],
        A1sp: [],
        A2inp: [],
        A2out: [],
        A2sp: [],
        A3inp: [],
        A3out: [],
        D1inp: [],
        D1out: [],
        D1sp: [],
        D2inp: [],
        D2out: [],
        C1inp: [],
        C1out: [],
        C1sp: [],
        C2inp: [],
        C2out: [],
    };

    /** List of Field Names when using getPeople API */
    SuperBigFamView.fieldNamesArray = [
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
        "Spouses",
        "Photo",
        "Name",
        "Gender",
        "Privacy",
        "DataStatus",
        "Manager",
        "BirthDateDecade",
        "DeathDateDecade",
        "Bio",
    ];
    /** Object to hold the Ahnentafel table for the current primary individual   */
    SuperBigFamView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    SuperBigFamView.theAncestors = [];

    // List to hold the AhnenTafel #s of all Ancestors that are X-Chromosome ancestors (or potential x-chromosome ancestors) of the primary person.
    SuperBigFamView.XAncestorList = [];

    /** Object in which to store the CURRENT settings (to be updated after clicking on SAVE CHANGES (all Tabs) inside Settings <DIV> ) */
    SuperBigFamView.currentSettings = {};

    /** theLeafCollection --> is a collection for every leaf on the Super Big Family Tree */
    SuperBigFamView.theLeafCollection = {};

    /** temporary holding place for dontSaveIDs arrays needed to setup proper propagation of IDs and Chunks */
    SuperBigFamView.dontSaveCollection = {};

    /** theChunkCollection --> is a collection for each SET of leaves that all appear or disappear based on changes in the Button Bar settings based on combination of Ancestors / Descendants / Cousins / In-Laws */
    SuperBigFamView.theChunkCollection = {};

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

    SuperBigFamView.prototype.meta = function () {
        return {
            title: "Super Big Family Tree",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    SuperBigFamView.prototype.init = function (selector, startId) {
        // condLog("SuperBigFamView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;
        SuperBigFamView.SBFtreeSettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
            viewClassName: "SuperBigFamView",
            tabs: [
                {
                    name: "general",
                    label: "General",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreeGeneral", label: "General settings" }],
                    comment:
                        "These options apply to the Fan Chart overall, and don't fall in any other specific category.",
                },
                {
                    name: "names",
                    label: "Names",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreeNames", label: "NAMES format" }],
                    comment: "These options apply to how the ancestor names will displayed in each Fan Chart cell.",
                },
                {
                    name: "dates",
                    label: "Dates",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreeDates", label: "DATES of events     " }],
                    comment: "These options apply to the Date format to use for birth, marriages, & deaths.",
                },
                {
                    name: "places",
                    label: "Places",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreePlaces", label: "PLACES of events     " }],
                    comment: "These options apply to the Places displayed for birth, marriages, & deaths.",
                },
                {
                    name: "photos",
                    label: "Photos",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreePhotos", label: "PHOTOS    " }],
                    comment: "These options determine if photos are displayed or not.",
                },
                {
                    name: "colours",
                    label: "Colours",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreeColours", label: "COLOURS   " }],
                    comment: "These options apply to background colours in the Fan Chart cells.",
                },
                {
                    name: "highlights",
                    label: "Highlights",
                    hideSelect: true,
                    subsections: [{ name: "SBFtreeHighlights", label: "HIGHLIGHTING   " }],
                    comment:
                        "These options determine which, if any, cells should be highlighted (in order to stand out). ",
                },
            ],
            optionsGroups: [
                {
                    tab: "general",
                    subsection: "SBFtreeGeneral",
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
                            ],
                            defaultValue: "400",
                        },

                        {
                            optionName: "vSpacing",
                            label: "Vertical Spacing (from 1 to 10)",
                            type: "number",
                            defaultValue: 7,
                        },
                        { optionName: "break0.5", type: "br" },
                        {
                            optionName: "extraInfo",
                            type: "radio",
                            label: "Extras on top",
                            values: [
                                { value: "none", text: "none" },
                                { value: "ahnNum", text: "Leaf Code" },
                                { value: "WikiTreeID", text: "WikiTree ID" },
                                { value: "WikiTreeNum", text: "WikiTree #" },
                                { value: "both", text: "all" },
                            ],
                            defaultValue: "both",
                        },
                        { optionName: "break1", type: "br" },
                        {
                            optionName: "showBoxesAroundAncFamilies",
                            label: "Show Coloured Boxes around Ancestor Families",
                            type: "checkbox",
                            defaultValue: false,
                        },
                        // {
                        //     optionName: "colourizeRepeats",
                        //     label: "!* Colourize Repeat Ancestors",
                        //     type: "checkbox",
                        //     defaultValue: true,
                        // },
                        // { optionName: "break2", type: "br" },
                        // {
                        //     optionName: "showBadges",
                        //     label: "!* Add Badges to Ancestors",
                        //     type: "checkbox",
                        //     defaultValue: false,
                        // },
                    ],
                },

                {
                    tab: "names",
                    subsection: "SBFtreeNames",
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
                        // { optionName: "nickName", label: "Show NickName", type: "checkbox", defaultValue: 0 },
                        {
                            optionName: "lastName",
                            type: "radio",
                            // label: "!* ",
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
                    subsection: "SBFtreeDates",
                    category: "date",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "dateTypes",
                            type: "radio",

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
                        //     label: "!* Show LifeSpan (replaces birth & death dates)",
                        //     type: "checkbox",
                        //     defaultValue: 0,
                        // },
                        // { optionName: "break1", type: "br" },
                        // { optionName: "showMarriage", label: "!* Show Marriage Date", type: "checkbox", defaultValue: 0 },
                        { optionName: "break2", comment: "Date Format:", type: "br" },
                        {
                            optionName: "dateFormat",
                            type: "radio",

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
                    subsection: "SBFtreePlaces",
                    category: "place",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "locationTypes",
                            type: "radio",

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
                    subsection: "SBFtreePhotos",
                    category: "photo",
                    subcategory: "options",
                    options: [
                        // {
                        //     optionName: "showCentralPic",
                        //     label: "Show the Central Person Photo",
                        //     type: "checkbox",
                        //     defaultValue: true,
                        // },
                        {
                            optionName: "showAllPics",
                            label: "Show Photos",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "useSilhouette",
                            label: "Use Silhouette when no photo available",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        // { optionName: "break1", type: "br" },
                        // {
                        //     optionName: "showPicsToN",
                        //     label: "Limit Photos to first N generations",
                        //     type: "checkbox",
                        //     defaultValue: true,
                        // },
                        // { optionName: "showPicsToValue", label: "N", type: "number", defaultValue: 5 },
                    ],
                },
                {
                    tab: "colours",
                    subsection: "SBFtreeColours",
                    category: "colour",
                    subcategory: "options",
                    options: [
                        {
                            optionName: "primarySiblings",
                            label: "Colour Primary's Siblings as Primaries",
                            type: "checkbox",
                            defaultValue: true,
                        },
                        {
                            optionName: "colourBy",
                            type: "select",
                            label: "Background Colour cells by",
                            values: [
                                { value: "None", text: "OFF - All White, all the time WHITE" },
                                { value: "Distance", text: "Distance from Primary" },
                                { value: "Generation", text: "Generation" },
                                { value: "Gender", text: "Gender" },
                                { value: "Ancestor", text: "Ancestor family" },

                                { value: "Family", text: "!* Family Stats" },
                                // { value: "Location", text: "!* Location" },

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
                    subsection: "SBFtreeHighlights",
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
                                // { value: "YDNA", text: "Y-DNA" },
                                // { value: "mtDNA", text: "Mitonchondrial DNA (mtDNA)" },
                                // { value: "XDNA", text: "X-chromosome inheritance" },
                                // { value: "DNAinheritance", text: "DNA inheritance" },
                                // { value: "DNAconfirmed", text: "DNA confirmed ancestors" },
                                { value: "none", text: "Pick one below:" },
                                { value: "aliveDay", text: "Alive on this Day" },
                                { value: "bioText", text: "Biography Text" },
                                // { value: "cat", text: "Category or Sticker" },
                            ],
                            defaultValue: "none",
                        },

                        // { optionName: "break4DNA", comment: "For WikiTree DNA pages:", type: "br" },
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

                        // {
                        //     optionName: "howDNAlinks",
                        //     type: "radio",
                        //     label: "",
                        //     values: [
                        //         { value: "Hide", text: "Hide Links" },
                        //         { value: "Highlights", text: "Show Links for highlighted cells only" },
                        //         { value: "ShowAll", text: "Show All Links" },
                        //     ],
                        //     defaultValue: "Highlights",
                        // },
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

        const SVGbtnDOWN =
            '<SVG width=18 height=14 ><polyline points="0,0 18,0 9,14 0,0" fill="blue" stroke="blue"/><polyline points="5,7 13,7" fill="none" stroke="white" stroke-width=2 /></SVG>';
        const SVGbtnUP =
            '<SVG width=18 height=14 ><polyline points="0,14 18,14 9,0 0,14" fill="red" stroke="red"/><polyline points="5,8 13,8" fill="none" stroke="white" stroke-width=2 /> <polyline points="9,3 9,13" fill="none" stroke="white" stroke-width=2 /> </SVG>';

        // Setup the LegendHTML for when we need the Legend (for multiple locations colouring legend, for example)
        var legendHTML =
            '<div id=legendDIV style="display:none; position:absolute; left:20px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left"><A style="cursor:pointer;" onclick="SuperBigFamView.hideLegend();">[ <B><font color=red>x</font></B> ]</A></span>' +
            "<H3 align=center>Legend</H3><div id=refreshLegend style='display:none; cursor:pointer;'><A onclick='SuperBigFamView.refreshTheLegend();'>Update Legend</A></DIV><div id=innerLegend></div></div>";

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<div id="btnBarDIV" class="stickyDIV"><table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="60%">' +
            "&nbsp;" +
            '<span class="fontDarkGreen fontBold">ANCESTORS:</span> <button class="btnSVG" onclick="SuperBigFamView.numAncGens2Display -=1; SuperBigFamView.redrawAncs();">' +
            SVGbtnDOWN +
            "</button> " +
            "[ <span id=numAncGensInBBar>2 generations</span> ]" +
            ' <button class="btnSVG" onclick="SuperBigFamView.numAncGens2Display +=1; SuperBigFamView.redrawAncs();">' +
            SVGbtnUP +
            "</button> " +
            '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fontDarkGreen fontBold">DESCENDANTS:</span> <button class="btnSVG" onclick="SuperBigFamView.numDescGens2Display -=1; SuperBigFamView.redrawDescs();">' +
            SVGbtnDOWN +
            "</button> " +
            "[ <span id=numDescGensInBBar>1 generation</span> ]" +
            ' <button class="btnSVG" onclick="SuperBigFamView.numDescGens2Display +=1; SuperBigFamView.redrawDescs();">' +
            SVGbtnUP +
            "</button> " +
            '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fontDarkGreen fontBold">COUSINS:</span> <button class="btnSVG" onclick="SuperBigFamView.numCuzGens2Display -=1; SuperBigFamView.redrawCuz();">' +
            SVGbtnDOWN +
            "</button> " +
            "[ <span id=numCuzGensInBBar>none</span> ]" +
            ' <button class="btnSVG" onclick="SuperBigFamView.numCuzGens2Display +=1; SuperBigFamView.redrawCuz();">' +
            SVGbtnUP +
            "</button> " +
            '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fontDarkGreen fontBold">IN-LAWS:</span> <input  class="btnSVG" type=checkbox style="cursor:pointer;" onclick="SuperBigFamView.displayINLAWS = 1 - SuperBigFamView.displayINLAWS; SuperBigFamView.redraw();">  ' +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="5%">&nbsp;' +
            "</td>" +
            '<td width="30%" align="right">' +
            '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fontDarkGreen fontBold">Privatize:</span> <input type=checkbox style="cursor:pointer;" onclick="SuperBigFamView.displayPrivatize = 1 - SuperBigFamView.displayPrivatize; SuperBigFamView.redraw();">&nbsp;&nbsp;&nbsp;&nbsp;  ' +
            '<A onclick="SuperBigFamView.reZoom();">' +
            SVGbtnRESIZE2 +
            "</A>&nbsp;&nbsp;" +
            '<span id=legendASCII style="display:none;"><A style="cursor:pointer;" onclick="SuperBigFamView.toggleLegend();"><font size=+2>&nbsp;&nbsp;&nbsp;&nbsp;' +
            LEGEND_CLIPBOARD +
            "</font></A></span> &nbsp;&nbsp;&nbsp;&nbsp;" +
            ' <A style="cursor:pointer;" onclick="SuperBigFamView.toggleSettings();"><font size=+2>' +
            SVGbtnSETTINGS +
            "</font></A>" +
            "&nbsp;&nbsp;" +
            "<A onclick=SuperBigFamView.toggleAbout();>" +
            SVGbtnINFO +
            "</A>" +
            (AboutHelpDoc > ""
                ? "&nbsp;&nbsp;<A target=helpPage href='" + AboutHelpDoc + "'>" + SVGbtnHELP + "</A>"
                : "") +
            "&nbsp;&nbsp;</td>" +
            '</tr></table></div><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Super Big Family Tree is loading ...</DIV>';

        var aboutHTML =
            '<div id=aboutDIV style="display:none; position:absolute; right:20px; background-color:aliceblue; border: solid blue 4px; border-radius: 15px; padding: 15px;}">' +
            `<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><a onclick="SuperBigFamView.toggleAbout();">` +
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

        settingsHTML += SuperBigFamView.SBFtreeSettingsOptionsObject.createdSettingsDIV; // +

        var badgesHTML =
            "<div id=BRbetweenLegendAndStickers><br/></div><div id=stickerLegend><H3 class=quarterEmBottomMargin>Badges</H3>";
        var stickerCatNameSelectorHTML =
            "<select id='stickerCategoryDropDownList1' class='optionSelect selectSimpleDropDown' onchange='SuperBigFamView.updateBadgesToShow(1);'><option value=-999>Do not use Badge 1</option></select><br/>";
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
            '<span style="color:red; align:left"><A onclick="SuperBigFamView.hideLegend();">[ <B><font color=red>x</font></B> ]</A></span>' +
            highlightHTML +
            "<H3 class=quarterEmBottomMargin id=LegendTitleH3><span id=LegendTitle></span></H3><div id=refreshLegend style='display:none'><A onclick='SuperBigFamView.refreshTheLegend();'>Update Legend</A></DIV><div id=innerLegend></div>" +
            badgesHTML +
            "</div>";

        var popupDIV = "<DIV id=popupDIV width=200px height=500px style='float:top; background-color:blue;'></DIV>";
        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        let infoPanel = document.getElementById("info-panel");
        // let mainDIV = document.getElementsByTagName("main");
        infoPanel.innerHTML = btnBarHTML + legendHTML + aboutHTML + settingsHTML + popupDIV;
        infoPanel.classList.remove("hidden");
        infoPanel.parentNode.classList.add("stickyDIV");

        var saveSettingsChangesButton = document.getElementById("saveSettingsChanges");
        saveSettingsChangesButton.addEventListener("click", (e) => settingsChanged(e));

        SuperBigFamView.toggleAbout = function () {
            let aboutDIV = document.getElementById("aboutDIV");
            let settingsDIV = document.getElementById("settingsDIV");
            if (aboutDIV) {
                if (aboutDIV.style.display == "none") {
                    aboutDIV.style.display = "block";
                    settingsDIV.style.display = "none";
                } else {
                    aboutDIV.style.display = "none";
                }
            }
        };

        function settingsChanged(e) {
            if (SuperBigFamView.SBFtreeSettingsOptionsObject.hasSettingsChanged(SuperBigFamView.currentSettings)) {
                condLog("the SETTINGS HAVE CHANGED - the CALL TO SETTINGS OBJ  told me so !");
                condLog("NEW settings are:", SuperBigFamView.currentSettings);
                let showBadges = SuperBigFamView.currentSettings["general_options_showBadges"];
                let newBoxWidth = SuperBigFamView.currentSettings["general_options_boxWidth"];
                let colourBy = SuperBigFamView.currentSettings["colour_options_colourBy"];
                let colour_options_specifyByFamily = SuperBigFamView.currentSettings["colour_options_specifyByFamily"];
                let colour_options_specifyByLocation =
                    SuperBigFamView.currentSettings["colour_options_specifyByLocation"];

                let legendDIV = document.getElementById("legendDIV");
                let LegendTitle = document.getElementById("LegendTitle");
                let LegendTitleH3 = document.getElementById("LegendTitleH3");
                let stickerLegend = document.getElementById("stickerLegend");
                let legendToggle = document.getElementById("legendASCII");
                let innerLegend = document.getElementById("innerLegend");
                let BRbetweenLegendAndStickers = document.getElementById("BRbetweenLegendAndStickers");

                condLog("BOX WIDTH - ", newBoxWidth, "vs", boxWidth);
                if (newBoxWidth != boxWidth) {
                    boxWidth = newBoxWidth;
                    nodeWidth = boxWidth * 1.5;
                }

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
                        } else if (
                            colourBy == "Location" &&
                            colour_options_specifyByLocation.indexOf("BirthTown") > -1
                        ) {
                            LegendTitle.textContent = "Birth Town";
                        } else if (colourBy == "Location" && colour_options_specifyByLocation == "DeathCountry") {
                            LegendTitle.textContent = "Country of Death";
                        } else if (colourBy == "Location" && colour_options_specifyByLocation == "DeathRegion") {
                            LegendTitle.textContent = "Region of Death";
                        } else if (
                            colourBy == "Location" &&
                            colour_options_specifyByLocation.indexOf("DeathTown") > -1
                        ) {
                            LegendTitle.textContent = "Town of Death";
                        } else if (colourBy == "Location" && colour_options_specifyByLocation == "BirthDeathCountry") {
                            LegendTitle.textContent = "Birth Country (inner)\nDeath Country (outer)";
                        } else if (colourBy == "Location" && colour_options_specifyByLocation == "DeathBirthCountry") {
                            LegendTitle.textContent = "Death Country (inner)\nBirth Country (outer)";
                        }
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

                if (SuperBigFamView.currentSettings["highlight_options_showHighlights"] == true) {
                    legendDIV.style.display = "block";
                    legendToggle.style.display = "inline-block";

                    document.getElementById("highlightDescriptor").style.display = "block";
                    if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
                        document.getElementById("highlightPeepsDescriptor").textContent = "Y DNA ancestors";
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
                        document.getElementById("highlightPeepsDescriptor").textContent =
                            "mitochondrial DNA (mtDNA) ancestors";
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                        document.getElementById("highlightPeepsDescriptor").textContent =
                            "X Chromosome inheritance path";
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                        document.getElementById("highlightPeepsDescriptor").textContent =
                            "X, Y, mitochondrial DNA ancestors";
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                        document.getElementById("highlightPeepsDescriptor").textContent =
                            "Relationships confirmed by DNA";
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "cat") {
                        let catNameSelector = document.getElementById("highlight_options_catName");
                        let rawValue = catNameSelector.value.trim();
                        document.getElementById("highlightPeepsDescriptor").textContent = rawValue;
                        currentHighlightCategory = rawValue;
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
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
                    } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "bioText") {
                        let bioTextSelector = document.getElementById("highlight_options_bioText");
                        document.getElementById("highlightPeepsDescriptor").textContent =
                            'Biographies that contain the word: "' + bioTextSelector.value.trim() + '"';
                    } else {
                        document.getElementById("highlightPeepsDescriptor").textContent = "Something else ...";
                    }
                } else {
                    document.getElementById("highlightDescriptor").style.display = "none";
                }

                SuperBigFamView.myAncestorTree.draw();
                updateFontsIfNeeded();
                adjustHeightsIfNeeded();
            } else {
                condLog("NOTHING happened according to SETTINGS OBJ");
            }
        }

        // CREATE the SVG object (which will be placed immediately under the button bar)
        const svg = d3
            .select(container)
            .append("svg")
            .attr("id", "superbigChartSVG")
            .attr("width", width)
            .attr("height", height);
        const g = svg.append("g").attr("id", "SVGgraphics");
        const lines = g.append("g").attr("id", "theConnectors");

        condLog("ADDING THE SVG BIG DADDY TAZ");

        // Setup zoom and pan
        SuperBigFamView.zoom = d3
            .zoom()
            .scaleExtent([0.02, 3.0])
            .on("zoom", function (event) {
                g.attr("transform", event.transform);
                SuperBigFamView.currentScaleFactor = event.transform.k;
            });
        svg.call(SuperBigFamView.zoom);
        svg.call(
            SuperBigFamView.zoom.transform,
            d3.zoomIdentity.scale(0.75).translate(((4 / 3) * width) / 2, height / 2)
        );

        // // Setup zoom and pan
        // FanChartView.zoom = d3
        //     .zoom()
        //     .scaleExtent([0.1, 3.0])
        //     .on("zoom", function (event) {
        //         g.attr("transform", event.transform);
        //         FanChartView.currentScaleFactor = event.transform.k;
        //     });
        // svg.call(FanChartView.zoom);

        // condLog("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the Super Big Family Tree
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
            CREATE the Super Big Family Tree Backdrop
            * Made of Lines connecting two ancestors together

        */

        // condLog("ADDING THE PIECES FROM 0 to 2 ** SBFtree VIEW maxNumGens", 2 ** SuperBigFamView.maxNumGens);
        // for (let index = 0; index < 2 ** SuperBigFamView.maxNumGens; index++) {
        //     condLog("ADDING THE PIECES FOR ", index);
        //     // Create an Empty Line, hidden, to be used later
        //     g.append("line").attrs({
        //         id: "lineForPerson" + index,
        //         display: "none",
        //         x1: 0,
        //         y1: 0,
        //         x2: 0,
        //         y2: 0,
        //         style: "stroke: black; stroke-width: 2;",
        //     });
        //     g.append("line").attrs({
        //         id: "line1ForPerson" + index,
        //         display: "none",
        //         x1: 0,
        //         y1: 0,
        //         x2: 0,
        //         y2: 0,
        //         style: "stroke: blue; stroke-width: 2;",
        //     });
        //     g.append("line").attrs({
        //         id: "line2ForPerson" + index,
        //         display: "none",
        //         x1: 0,
        //         y1: 0,
        //         x2: 0,
        //         y2: 0,
        //         style: "stroke: red; stroke-width: 2;",
        //     });
        //     g.append("line").attrs({
        //         id: "line3ForPerson" + index,
        //         display: "none",
        //         x1: 0,
        //         y1: 0,
        //         x2: 0,
        //         y2: 0,
        //         style: "stroke: green; stroke-width: 4;",
        //     });
        // }

        // BEFORE we go further ... let's add the DNA objects we might need later
        // for (let genIndex = SuperBigFamView.maxNumGens - 1; genIndex >= 0; genIndex--) {
        //     for (let index = 0; index < 2 ** genIndex; index++) {
        //         g.append("g")
        //             .attrs({
        //                 id: "imgDNA-x-" + genIndex + "i" + index,
        //             })
        //             .append("foreignObject")
        //             .attrs({
        //                 id: "imgDNA-x-" + genIndex + "i" + index + "inner",
        //                 class: "centered",
        //                 width: "20px",
        //                 height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                 x: 25 * index,
        //                 y: 30 * genIndex,
        //                 //
        //                 style: "display:none;",
        //             })

        //             .style("overflow", "visible") // so the name will wrap
        //             .append("xhtml:div")
        //             .attrs({
        //                 id: "imgDNA-x-" + genIndex + "i" + index + "img",
        //             })
        //             .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/X.gif'/>");

        //         g.append("g")
        //             .attrs({
        //                 id: "imgDNA-y-" + genIndex + "i" + index,
        //             })
        //             .append("foreignObject")
        //             .attrs({
        //                 id: "imgDNA-y-" + genIndex + "i" + index + "inner",
        //                 class: "centered",
        //                 width: "20px",
        //                 height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                 x: 25 * index,
        //                 y: 30 * genIndex,
        //                 //
        //                 style: "display:none;",
        //             })

        //             .style("overflow", "visible") // so the name will wrap
        //             .append("xhtml:div")
        //             .attrs({
        //                 id: "imgDNA-y-" + genIndex + "i" + index + "img",
        //             })
        //             .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/Y.gif'/>");

        //         g.append("g")
        //             .attrs({
        //                 id: "imgDNA-mt-" + genIndex + "i" + index,
        //             })
        //             .append("foreignObject")
        //             .attrs({
        //                 id: "imgDNA-mt-" + genIndex + "i" + index + "inner",
        //                 class: "centered",
        //                 width: "20px",
        //                 height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                 x: 25 * index,
        //                 y: 30 * genIndex,
        //                 //
        //                 style: "display:none;",
        //             })

        //             .style("overflow", "visible") // so the name will wrap
        //             .append("xhtml:div")
        //             .attrs({
        //                 id: "imgDNA-mt-" + genIndex + "i" + index + "img",
        //             })
        //             .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/mt.gif'/>");

        //         g.append("g")
        //             .attrs({
        //                 id: "imgDNA-Ds-" + genIndex + "i" + index,
        //             })
        //             .append("foreignObject")
        //             .attrs({
        //                 id: "imgDNA-Ds-" + genIndex + "i" + index + "inner",
        //                 class: "centered",
        //                 width: "20px",
        //                 height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                 x: 25 * index,
        //                 y: 30 * genIndex,
        //                 //
        //                 style: "display:none;",
        //             })

        //             .style("overflow", "visible") // so the name will wrap
        //             .append("xhtml:div")
        //             .attrs({
        //                 id: "imgDNA-Ds-" + genIndex + "i" + index + "img",
        //             })
        //             .html("<img height=24px src='https://www.wikitree.com/images/icons/descendant-link.gif'/>");

        //         g.append("g")
        //             .attrs({
        //                 id: "imgDNA-As-" + genIndex + "i" + index,
        //             })
        //             .append("foreignObject")
        //             .attrs({
        //                 id: "imgDNA-As-" + genIndex + "i" + index + "inner",
        //                 class: "centered",
        //                 width: "20px",
        //                 height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                 x: 25 * index,
        //                 y: 30 * genIndex,
        //                 //
        //                 style: "display:none;",
        //             })

        //             .style("overflow", "visible") // so the name will wrap
        //             .append("xhtml:div")
        //             .attrs({
        //                 id: "imgDNA-As-" + genIndex + "i" + index + "img",
        //             })
        //             .html("<img height=24px src='https://www.wikitree.com/images/icons/pedigree.gif'/>");

        //         g.append("g")
        //             .attrs({
        //                 id: "imgDNA-Confirmed-" + genIndex + "i" + index,
        //             })
        //             .append("foreignObject")
        //             .attrs({
        //                 id: "imgDNA-Confirmed-" + genIndex + "i" + index + "inner",
        //                 class: "centered",
        //                 width: "20px",
        //                 height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                 x: 25 * index,
        //                 y: 30 * genIndex,
        //                 //
        //                 style: "display:none;",
        //             })

        //             .style("overflow", "visible") // so the name will wrap
        //             .append("xhtml:div")
        //             .attrs({
        //                 id: "imgDNA-Confirmed-" + genIndex + "i" + index + "img",
        //             })
        //             .html("<img height=24px src='https://www.wikitree.com/images/icons/dna/DNA-confirmed.gif'/>");
        //         condLog("ADDING THE BADGES RIGHT NOW TO THE SVG . g Model");
        //         for (let badgeCounter = 1; badgeCounter <= 4; badgeCounter++) {
        //             const stickerPrefix = "badge" + badgeCounter + "-";
        //             const ahnNum = index;

        //             g.append("g")
        //                 .attrs({
        //                     id: stickerPrefix + ahnNum,
        //                     class: "floatAbove",
        //                     style: "display:none;",
        //                 })
        //                 .append("foreignObject")
        //                 .attrs({
        //                     id: stickerPrefix + ahnNum + "inner",
        //                     class: "centered",
        //                     width: "20px",
        //                     height: "20px", // the foreignObject won't display in Firefox if it is 0 height
        //                     x: 30 * badgeCounter,
        //                     y: -200,
        //                     //
        //                 })

        //                 .style("overflow", "visible") // so the name will wrap
        //                 .append("xhtml:div")
        //                 .attrs({
        //                     id: stickerPrefix + ahnNum + "svg",
        //                 })
        //                 .html(
        //                     "<svg width=24 height=24><rect width=24 height=24 rx=12 ry=12 style='fill:" +
        //                         stickerClr[badgeCounter] +
        //                         ";stroke:black;stroke-width:1;opacity:1' /><text font-weight=bold x=7 y=17 fill='white'>" +
        //                         badgeCounter +
        //                         "</text></svg>"
        //                 );
        //         }
        //     }
        // }

        self.load(startId);

        SuperBigFamView.SBFtreeSettingsOptionsObject.buildPage();
        SuperBigFamView.SBFtreeSettingsOptionsObject.setActiveTab("names");
        SuperBigFamView.currentSettings = SuperBigFamView.SBFtreeSettingsOptionsObject.getDefaultOptions();

        SuperBigFamView.Adimensions = [];

        // SOME minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let bkgdClrSelector = document.getElementById("colour_options_colourBy");

        // let vBoxHeightSelector1 = document.getElementById("general_options_vBoxHeight_radio1");
        // let vBoxHeightSelector2 = document.getElementById("general_options_vBoxHeight_radio2");
        // document.getElementById("general_options_vSpacing_label").style.display = "none";
        // document.getElementById("general_options_vSpacing").style.display = "none";
        // condLog("bkgdClrSelector", bkgdClrSelector);

        bkgdClrSelector.setAttribute("onchange", "SuperBigFamView.optionElementJustChanged();");
        // vBoxHeightSelector1.setAttribute("onchange", "SuperBigFamView.optionElementJustChanged();");
        // vBoxHeightSelector2.setAttribute("onchange", "SuperBigFamView.optionElementJustChanged();");
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
        highlightSelector.setAttribute("onchange", "SuperBigFamView.optionElementJustChanged();");
        // let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        // let howDNAlinksSelector = document.getElementById("highlight_options_howDNAlinks");
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
    };

    function showRefreshInLegend() {
        let refreshLegendDIV = document.getElementById("refreshLegend");
        refreshLegendDIV.style.display = "block";
    }

    SuperBigFamView.refreshTheLegend = function () {
        condLog("NOW IS THE TIME FOR ALL GOOD CHUMPS TO REFRESH THE LEGEND");
        let refreshLegendDIV = document.getElementById("refreshLegend");
        refreshLegendDIV.style.display = "none";
        updateLegendIfNeeded();
        // SuperBigFamView.redraw();
        SuperBigFamView.myAncestorTree.draw();
    };

    // and here's that Function that does the minor tweaking needed in the COLOURS tab of the Settings object since some drop-downs are contingent upon which original option was chosen
    SuperBigFamView.optionElementJustChanged = function () {
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
        let showBadges = SuperBigFamView.currentSettings["general_options_showBadges"];
        // let vBoxHeightUseVSpacing = document.getElementById("general_options_vBoxHeight_radio2").checked;
        // let vSpacingSelector = document.getElementById("general_options_vSpacing");
        // let vSpacingSelectorLabel = document.getElementById("general_options_vSpacing_label");

        // SOME minor tweaking needed in the HIGHLIGHT tab of the Settings object since some drop-downs are contingent upon which original option was chosen
        let highlightSelector = document.getElementById("highlight_options_highlightBy");
        // let break4DNASelector = document.getElementById("highlight_options_break4DNA");
        // let howDNAlinksRadiosBR = document.getElementById("highlight_options_howDNAlinks_BR");
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
        // condLog("vBoxHeight VALUE:", vBoxHeightUseVSpacing, vSpacingSelector, vSpacingSelectorLabel);

        // if (vBoxHeightUseVSpacing === true) {
        //     vSpacingSelector.style.display = "inline-block";
        //     vSpacingSelectorLabel.style.display = "inline-block";
        // } else {
        //     vSpacingSelector.style.display = "none";
        //     vSpacingSelectorLabel.style.display = "none";
        // }

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

        // break4DNASelector.parentNode.style.display = "none";
        // howDNAlinksRadiosBR.parentNode.style.display = "none";
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
            // break4DNASelector.parentNode.style.display = "block";
            // howDNAlinksRadiosBR.parentNode.style.display = "inline-block";
        }
    };

    SuperBigFamView.drawLines = function () {
        // console.log("DRAWING LINES stuff should go here");

        let linesDIV = document.getElementById("theConnectors");

        linesDIV.innerHTML =
           (SuperBigFamView.currentSettings["general_options_showBoxesAroundAncFamilies"] == true ? drawBoxesAround() : "" )+
            drawLinesForFamilyOf("A0") +
            drawLinesForDirectAncestors() +
            drawLinesForDescendants("A0") +
            drawLinesForSiblings("S0") +
            drawLinesForInLaws() 
            ;

        // console.log(drawLinesForFamilyOf("A0") );
        // console.log(drawLinesForDirectAncestors());
        // console.log(drawLinesForDescendants("A0"));
        // console.log(drawLinesForSiblings("S0"));
        endisableButtons(true);
    };

    function drawBoxesAround() {
        let numA = SuperBigFamView.numAncGens2Display; // num Ancestors - going up
        let boxesCode = "";
        let drawColours = ["red", "blue", "darkgreen", "magenta"];
        let fillColours = ["#FEFEFE", "#DFDFDF", "#FFDFDF", "#DFFFDF", "#DFDFFF", "#FFFFDF", "#FFDFFF", "#DFFFFF" ];
        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; //330 ; //currentMaxHeight4Box;//SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        let thisBoxWidth = 1.0 * SuperBigFamView.currentSettings["general_options_boxWidth"];
        

        for (let ahNum = 2; ahNum < 2 ** (numA + 1); ahNum++) {
            let minX = SuperBigFamView.Adimensions[ahNum].X - thisBoxWidth / 2;
            let minY = SuperBigFamView.Adimensions[ahNum].Y - 300 / 2;
            let drawClr = drawColours[ahNum % 4];
            let fillClr = fillColours[(ahNum - 2) % 8];

            if (ahNum % 2 == 0) {
                minX += thisBoxWidth - SuperBigFamView.Adimensions[ahNum].width - 10;
            } else {
                minX += 10;
            }
            drawClr = "none";
            let thisBox =
                `<polyline points="` +
                minX +
                "," +
                minY +
                " " +
                (minX + SuperBigFamView.Adimensions[ahNum].width) +
                "," +
                minY +
                " " +
                (minX + SuperBigFamView.Adimensions[ahNum].width) +
                "," +
                (minY + SuperBigFamView.Adimensions[ahNum].height - 10) +
                " " +
                minX +
                "," +
                (minY + SuperBigFamView.Adimensions[ahNum].height - 10) +
                " " +
                minX +
                "," +
                minY +
                `" fill="` +
                fillClr +
                `" stroke="` +
                drawClr +
                `" stroke-width="5" />`;
            boxesCode += thisBox;
            // "[ " + Adimensions[ahNum].width + " x " + Adimensions[ahNum].height + " ]";
        }
        return boxesCode;
    }

    function drawLinesForInLaws() {
        let numA = SuperBigFamView.numAncGens2Display; // num Ancestors - going up
        let numD = SuperBigFamView.numDescGens2Display; // num Descendants - going down
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide
        let showInLaws = SuperBigFamView.displayINLAWS > 0;
        if (!showInLaws) {
            return "";
        }

        if (numD < 1 && numA < 1) {
            return "";
        } else if (numD < 1 && numC < 1) {
            return "";
        }

        let descLinesSVG = "";
        // console.log("drawLinesForInLaws:");
        for (var leafID in SuperBigFamView.theLeafCollection) {
            let leaf = SuperBigFamView.theLeafCollection[leafID];
            if (leaf && leaf.Code) {
                if (leaf.Code.substr(-2).indexOf("P") > -1) {
                    // console.log(leafID, leaf.Code, "*" + leaf.Code.substr(-2) + "*");

                    if (
                        SuperBigFamView.theLeafCollection[leaf.Code + "RM"] &&
                        SuperBigFamView.theLeafCollection[leaf.Code + "RF"] &&
                        SuperBigFamView.theLeafCollection[leaf.Code + "RM"]["x"] &&
                        SuperBigFamView.theLeafCollection[leaf.Code + "RF"]["x"]
                    ) {
                        let minX = SuperBigFamView.theLeafCollection[leaf.Code + "RM"]["x"];
                        let minY = SuperBigFamView.theLeafCollection[leaf.Code + "RM"]["y"];
                        let maxX = SuperBigFamView.theLeafCollection[leaf.Code + "RF"]["x"];
                        let avgX = SuperBigFamView.theLeafCollection[leaf.Code]["x"];
                        let avgY = SuperBigFamView.theLeafCollection[leaf.Code]["y"];
                        let drawColour = "#434343";
                        let equalsLine =
                            `<polyline points="` +
                            (minX + 20) +
                            "," +
                            (minY + 30) +
                            " " +
                            (maxX - 20) +
                            "," +
                            (minY + 30) +
                            `" fill="none" stroke="` +
                            drawColour +
                            `" stroke-width="1"/>` +
                            `<polyline points="` +
                            (minX + 20) +
                            "," +
                            (minY + 45) +
                            " " +
                            (maxX - 20) +
                            "," +
                            (minY + 45) +
                            `" fill="none" stroke="` +
                            drawColour +
                            `" stroke-width="1" />` +
                            `<polyline points="` +
                            avgX +
                            "," +
                            (minY + 45) +
                            " " +
                            avgX +
                            "," +
                            avgY +
                            `" fill="none" stroke="` +
                            drawColour +
                            `" stroke-width="1" />`;
                        descLinesSVG += equalsLine;
                    } else if (
                        SuperBigFamView.theLeafCollection[leaf.Code + "RM"] &&
                        SuperBigFamView.theLeafCollection[leaf.Code + "RM"]["x"]
                    ) {
                        let minX = SuperBigFamView.theLeafCollection[leaf.Code + "RM"]["x"];
                        let minY = SuperBigFamView.theLeafCollection[leaf.Code + "RM"]["y"];

                        let avgX = SuperBigFamView.theLeafCollection[leaf.Code]["x"];
                        let avgY = SuperBigFamView.theLeafCollection[leaf.Code]["y"];
                        let drawColour = "#434343";
                        let equalsLine =
                            `<polyline points="` +
                            (minX + 20) +
                            "," +
                            (minY + 65) +
                            " " +
                            avgX +
                            "," +
                            (minY + 65) +
                            `" fill="none" stroke="` +
                            drawColour +
                            `" stroke-width="1" />` +
                            `<polyline points="` +
                            avgX +
                            "," +
                            (minY + 45) +
                            " " +
                            avgX +
                            "," +
                            avgY +
                            `" fill="none" stroke="` +
                            drawColour +
                            `" stroke-width="1" />`;
                        descLinesSVG += equalsLine;
                    }
                }
            } else {
                // console.log("no Code for ", leaf);
            }
        }

        return descLinesSVG;
    }

    function drawLinesForDescendants(code) {
        let numA = SuperBigFamView.numAncGens2Display; // num Ancestors - going up
        let numD = SuperBigFamView.numDescGens2Display; // num Descendants - going down
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide

        if (numD < 1) {
            return "";
        }

        let descLinesSVG = "";
        let thisLeaf = SuperBigFamView.theLeafCollection[code];
        if (!thisLeaf) {
            return "";
        }
        let thisLeafDIV = document.getElementById("wedgeInfo-" + thisLeaf.Code);
        if (!thisLeafDIV) {
            return "";
        } else if (thisLeafDIV.parentNode.parentNode.style.display == "none") {
            return "";
        }

        let thisLeafPerson = thePeopleList[thisLeaf.Id];
        if (!thisLeafPerson) {
            return "";
        }
        let primaryChildren = thisLeafPerson._data.Children;

        if (primaryChildren.length == 0) {
            return "";
        } else {
            for (let k = 0; k < primaryChildren.length; k++) {
                // const kid = primaryChildren[k];
                descLinesSVG += drawLinesForFamilyOf(code + "K" + make2Digit(k + 1));
                descLinesSVG += drawLinesForDescendants(code + "K" + make2Digit(k + 1));
            }
        }

        return descLinesSVG;
    }

    function drawLinesForSiblings(code) {
        let numD = SuperBigFamView.numDescGens2Display; // num Descendants - going down
        let sibLinesSVG = "";

        if (
            numD > 0 &&
            SuperBigFamView.theChunkCollection[code] &&
            SuperBigFamView.theChunkCollection[code].CodesList
        ) {
            for (let s = 0; s < SuperBigFamView.theChunkCollection[code].CodesList.length; s++) {
                const element = SuperBigFamView.theChunkCollection[code].CodesList[s];
                // console.log("drawLinesForSiblings", element);
                sibLinesSVG += drawLinesForFamilyOf(element, element + "K", 0);
                sibLinesSVG += drawLinesForDescendants(element, element + "K", 0);
            }
            return sibLinesSVG;
        } else {
            return "";
        }
    }

    function drawLinesForDirectAncestors() {
        let numA = SuperBigFamView.numAncGens2Display; // num Ancestors - going up
        let numD = SuperBigFamView.numDescGens2Display; // num Descendants - going down
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide

        if (numA < 1) {
            return "";
        }

        SuperBigFamView.linesATC = [];

        let ancLinesSVG = drawLinesForFamilyOf("A0", "R", 0); // nuclear family around A0
        ancLinesSVG += drawLinesForFamilyOf("A0RM", "A0S", 1); // plus paternal half siblings if applicable
        ancLinesSVG += drawLinesForFamilyOf("A0RF", "A0S", 2); // plus maternal half siblings if applicable

        for (let a = 1; a < numA; a++) {
            let begNum = 2 ** a;
            for (let ahNum = 1.5 * begNum; ahNum < 2 * begNum; ahNum++) {
                // converts the ahnenNum into a Binary number (0s and 1s), where the first digit = Primary person, and the subsequent 0s are RM ('rent males = fathers) and 1s are RF ('rent females = mothers)
                let bits = (ahNum >>> 0).toString(2);
                // Now replace the 0s for RM and the 1s for RF, and the initial first digit for A0
                let newCode = bits.replace("1", "A").replace(/0/g, "RM").replace(/1/g, "RF").replace("A", "A0");

                // Finally - take that newCode and use it as the parameter to generate the lines SVG from the drawLinesForFamily function
                ancLinesSVG += drawLinesForFamilyOf(newCode, "R", 0);
            }
            for (let ahNum = 1.5 * begNum - 1; ahNum >= begNum; ahNum--) {
                // converts the ahnenNum into a Binary number (0s and 1s), where the first digit = Primary person, and the subsequent 0s are RM ('rent males = fathers) and 1s are RF ('rent females = mothers)
                let bits = (ahNum >>> 0).toString(2);
                // Now replace the 0s for RM and the 1s for RF, and the initial first digit for A0
                let newCode = bits.replace("1", "A").replace(/0/g, "RM").replace(/1/g, "RF").replace("A", "A0");

                // Finally - take that newCode and use it as the parameter to generate the lines SVG from the drawLinesForFamily function
                ancLinesSVG += drawLinesForFamilyOf(newCode, "R", 0); // want to connect parents & siblings to this ancestor
            }
        }

        for (let a = 1; a < numA; a++) {
            for (let ahNum = 2 ** a; ahNum < 2 ** (a + 1); ahNum++) {
                // converts the ahnenNum into a Binary number (0s and 1s), where the first digit = Primary person, and the subsequent 0s are RM ('rent males = fathers) and 1s are RF ('rent females = mothers)
                let bits = (ahNum >>> 0).toString(2);
                // Now replace the 0s for RM and the 1s for RF, and the initial first digit for A0
                let newCode = bits.replace("1", "A").replace(/0/g, "RM").replace(/1/g, "RF").replace("A", "A0");

                // Finally - take that newCode and use it as the parameter to generate the lines SVG from the drawLinesForFamily function
                //  ancLinesSVG += drawLinesForFamilyOf(newCode, "R", 0);
                if (numC > 0) {
                    ancLinesSVG += drawLinesForFamilyOf(newCode + "RM", newCode + "S", 1); // aunts & uncles on father's side
                    ancLinesSVG += drawLinesForFamilyOf(newCode + "RF", newCode + "S", 2); // aunts & uncles on mother's side

                    if (numC > 1) {
                        ancLinesSVG += drawLinesForCousins(newCode + "S", 2);
                        // for (let k = 0; k < 25; k++) {
                        //     ancLinesSVG += drawLinesForFamilyOf(newCode + "S" + k, "", k+1); // first cousins
                        // }

                        // ancLinesSVG += drawLinesForFamilyOf(newCode + "RF", newCode + "S", 2); // first cousins on mother's side
                    }
                }
            }
        }

        return ancLinesSVG;
    }

    function drawLinesForCousins(code, Cnum) {
        let maxNumOfKids = 25;
        let cuzLinesSVG = "";
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide

        for (let k = 1; k <= maxNumOfKids; k++) {
            if (SuperBigFamView.theLeafCollection[code + make2Digit(k)]) {
                cuzLinesSVG += drawLinesForFamilyOf(code + make2Digit(k), "", 0, k + 2); // first cousins

                if (Cnum < numC) {
                    cuzLinesSVG += drawLinesForCousins(code + make2Digit(k) + "K", Cnum + 1);
                }
            }
        }
        return cuzLinesSVG;
    }

    function checkCrossBarYwithATC(theY, minX, maxX) {
        let doLoop = true;
        let loopCounter = 0;
        let thisY = theY;

        // console.log("checkCrossBarYwithATC", theY, minX, maxX);
        while (doLoop && loopCounter < 8) {
            doLoop = false; // start off assuming there will be no collisions
            loopCounter++;
            // console.log("testing Y = ", thisY);
            if (SuperBigFamView.linesATC[thisY]) {
                // do the check now
                for (let c = 0; doLoop == false && c < SuperBigFamView.linesATC[thisY].length; c++) {
                    const pts = SuperBigFamView.linesATC[thisY][c];
                    if (pts.min < minX && minX < pts.max) {
                        doLoop = true;
                        // console.log("Conflict with [", pts.min, pts.max, "] and ", minX);
                    } else if (pts.min < maxX && maxX < pts.max) {
                        doLoop = true;
                        // console.log("Conflict with [", pts.min, pts.max, "] and ", maxX);
                    } else if (minX < pts.min && maxX > pts.max) {
                        // console.log("Conflict with [", pts.min, pts.max, "] and ", minX, maxX);
                        doLoop = true;
                    } else if (minX == pts.max) {
                        // console.log("Conflict bprder with [", pts.min, pts.max, "] and ", minX);
                        doLoop = true;
                        thisY += 50;
                    } else if (maxX == pts.min) {
                        // console.log("Conflict bprder with [", pts.min, pts.max, "] and ", minX);
                        doLoop = true;
                        thisY += 50;
                    }
                }
                if (doLoop == true) {
                    // we need to go another round ... .so let's adjust thisY value up a level
                    thisY -= 40;
                } else {
                    // yay - we're out of this endless loop ... so let's record where we ended up into the Air Traffic Controller, and move on
                    SuperBigFamView.linesATC[thisY].push({ min: minX, max: maxX });
                }
            } else {
                SuperBigFamView.linesATC[thisY] = [{ min: minX, max: maxX }];
            }
        }
        // console.log("OK with ", thisY);
        return thisY;
    }

    function drawLinesForFamilyOf(code, kidPrefix = "", levelNum = 0, clrNum = -1) {
        // console.log("drawLinesForFamilyOf", code);
        let primaryLeaf = SuperBigFamView.theLeafCollection[code];
        if (!primaryLeaf) {
            return;
        }
        let primaryLeafPerson = thePeopleList[primaryLeaf.Id];
        let primaryChildren = primaryLeafPerson._data.Children;
        let childPrefix = code + "K";
        let doingDirectAncestorCode = "";
        let numPrimaryChildren = primaryChildren.length;
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide
        if (clrNum == -1) {
            clrNum = levelNum;
        }

        if (kidPrefix > "") {
            // console.log("LAST CHAR: ", kidPrefix.charAt(-1), kidPrefix.substring(kidPrefix.length - 1));
            childPrefix = kidPrefix;
            if (kidPrefix.substring(kidPrefix.length - 1) == "S") {
                // console.log("SWAPPED SIBLINGS for CHILDREN");
                let tempLeaf = SuperBigFamView.theLeafCollection[kidPrefix.substring(0, kidPrefix.length - 1)];
                let tempLeafPerson = thePeopleList[tempLeaf.Id];
                primaryChildren = tempLeafPerson._data.Siblings;
                numPrimaryChildren = primaryChildren.length + 1;
            } else if (kidPrefix.substring(kidPrefix.length - 1) == "R") {
                // console.log("WANT TO CONNECT PARENTS & SIBLINGS TO THIS ANCESTOR: ", code);
                let extraChildren = 0;
                let origPrimaryLeafPerson = primaryLeafPerson;

                // FIRST ... we need to redefine the parent in this scenario - it will be the Father of the primary - or - if no Father, then the Mother
                if (
                    origPrimaryLeafPerson._data.Father &&
                    origPrimaryLeafPerson._data.Father > 0 &&
                    thePeopleList[origPrimaryLeafPerson._data.Father]
                ) {
                    primaryLeaf = SuperBigFamView.theLeafCollection[code + "RM"];
                    primaryLeafPerson = thePeopleList[origPrimaryLeafPerson._data.Father];
                    doingDirectAncestorCode = code + "RF"; // code for SPOUSE (that's why the reverse in polarity  RM to RF)

                    // and ... let's find out how many kids the spouse has, and add those on for good measure ...
                    let primesMother = thePeopleList[origPrimaryLeafPerson._data.Mother];
                    if (primesMother && primesMother._data.Children) {
                        extraChildren = primesMother._data.Children.length;
                    }
                } else if (
                    origPrimaryLeafPerson._data.Mother &&
                    origPrimaryLeafPerson._data.Mother > 0 &&
                    thePeopleList[origPrimaryLeafPerson._data.Mother]
                ) {
                    primaryLeaf = SuperBigFamView.theLeafCollection[code + "RF"];
                    primaryLeafPerson = thePeopleList[origPrimaryLeafPerson._data.Mother];
                    doingDirectAncestorCode = code + "RM";
                } else {
                    // no valid parents ... so ...
                    return "";
                }

                // SECOND  ... the Children in this family unit are actually the Children of the Ancestor's parents whose code is the first parameter
                // will have to redefine these later
                // primaryChildren = primaryLeafPerson._data.Siblings; /// NOT just the siblings - must include the "code" Ancestor
                primaryChildren = primaryLeafPerson._data.Children;
                numPrimaryChildren = primaryChildren.length + extraChildren;

                // THIRD - revise the kidPrefix:
                // if (numC > -1 || code == "A0") {
                // console.log("CHILD PREFIX check: ", numC, code, childPrefix);
                if (numC < 1 && code == "A0") {
                    childPrefix = code + "S";
                } else if (numC > 0) {
                    childPrefix = code + "S";
                }
            }
        }

        if (!primaryLeafPerson) {
            // console.log("drawLinesForFamilyOf return 1");
            return "";
        } else if (primaryLeafPerson && primaryLeafPerson._data && !primaryLeafPerson._data.Spouses) {
            // console.log("drawLinesForFamilyOf return 2");
            return "";
        } else if (primaryLeafPerson && primaryLeafPerson._data && primaryLeafPerson._data.Spouses.length == 0) {
            // console.log("drawLinesForFamilyOf return 3");
            return "";
        }

        let thisLeafDIV = document.getElementById("wedgeInfo-" + primaryLeaf.Code);
        if (!thisLeafDIV) {
            return "";
        } else if (thisLeafDIV.parentNode.parentNode.style.display == "none") {
            return "";
        }

        let allLinesPolySVG = "";
        let spouseColours = ["blue", "red", "darkgreen", "chocolate", "indigo", "darkorange", "navy"];

        // console.log(
        //     "drawLinesForFamilyOf : GO TIME (Spouses, Siblings, Children) ...\n",
        //     primaryLeafPerson._data.Spouses,
        //     "\n",
        //     primaryLeafPerson._data.Siblings,
        //     "\n",
        //     primaryChildren
        // );
        for (let sp = 0; sp < primaryLeafPerson._data.Spouses.length; sp++) {
            // const thisSpouse = primaryLeafPerson._data.Spouses[sp];

            let primarySpouse = SuperBigFamView.theLeafCollection[code + "P" + (sp + 1)];
            let thisSpouseDIV = document.getElementById("wedgeInfo-" + code + "P" + (sp + 1));

            if (doingDirectAncestorCode > "") {
                primarySpouse = SuperBigFamView.theLeafCollection[doingDirectAncestorCode];
                thisSpouseDIV = document.getElementById("wedgeInfo-" + doingDirectAncestorCode);
                if (sp > 0) {
                    break;
                }
            } else if (!primarySpouse) {
                continue; /// go back to the next value of sp
            }
            let primarySpouseID = primarySpouse.Id;

            if (!thisSpouseDIV) {
                continue;
            } else if (thisSpouseDIV.parentNode.parentNode.style.display == "none") {
                continue;
            }

            let minX = Math.min(primaryLeaf.x, primarySpouse.x);
            let maxX = Math.max(primaryLeaf.x, primarySpouse.x);
            let minY = Math.min(primaryLeaf.y, primarySpouse.y);
            let drawColour = spouseColours[(sp + clrNum) % spouseColours.length];
            if (doingDirectAncestorCode > "") {
                drawColour = "black";
            }
            let childrenXs = [];
            let childrenY = 0;
            let childrenMinX = 0;
            let childrenMaxX = 0;
            let defaultChildX = (primaryLeaf.x + primarySpouse.x) / 2;
            // console.log("PRIMARY CHILDREN : ", primaryChildren);
            // for (let ch = 0; ch < primaryChildren.length; ch++) {
            for (let ch = 0; ch < numPrimaryChildren; ch++) {
                let kidLeaf = SuperBigFamView.theLeafCollection[childPrefix + make2Digit(ch + 1)];
                if (kidLeaf) {
                    if (!kidLeaf["x"]) {
                        continue;
                        // kidLeaf['x'] = defaultChildX;
                    }

                    const kid = thePeopleList[kidLeaf.Id];
                    // console.log("kid " + ch, kid._data.Father, kid._data.Mother, primarySpouseID, kid);

                    if (
                        kid &&
                        ((kid._data.Father && kid._data.Father == primarySpouseID) ||
                            (kid._data.Mother && kid._data.Mother == primarySpouseID)) &&
                        ((kid._data.Father && kid._data.Father == primaryLeaf.Id) ||
                            (kid._data.Mother && kid._data.Mother == primaryLeaf.Id))
                    ) {
                        // let kidLeaf = SuperBigFamView.theLeafCollection[childPrefix + (ch + 1)];
                        // console.log("kidLeaf:", childPrefix + (ch + 1), kidLeaf, childrenMinX, kidLeaf.x, childrenMaxX);
                        if (childrenXs.length == 0) {
                            childrenMinX = kidLeaf.x;
                            childrenMaxX = kidLeaf.x;
                        } else {
                            childrenMinX = Math.min(childrenMinX, kidLeaf.x);
                            childrenMaxX = Math.max(childrenMaxX, kidLeaf.x);
                        }
                        childrenY = kidLeaf.y;
                        childrenXs.push(kidLeaf.x);
                    }
                }
            }
            // console.log(
            //     "After reg loop - FOUND ",
            //     childrenXs.length,
            //     "children to connect",
            //     childrenMinX,
            //     childrenMaxX
            // );
            if (doingDirectAncestorCode > "") {
                let kidLeaf = SuperBigFamView.theLeafCollection[code];
                if (kidLeaf) {
                    if (childrenXs.length == 0) {
                        childrenMinX = kidLeaf.x;
                        childrenMaxX = kidLeaf.x;
                    } else {
                        childrenMinX = Math.min(childrenMinX, kidLeaf.x);
                        childrenMaxX = Math.max(childrenMaxX, kidLeaf.x);
                    }
                    childrenY = kidLeaf.y;
                    childrenXs.push(kidLeaf.x);
                }
            }

            // console.log(
            //     "FOUND actually ",
            //     childrenXs.length,
            //     "children to connect",
            //     childrenMinX,
            //     childrenMaxX,
            //     primaryLeaf.Code
            // );
            let equalsLine =
                `<polyline points="` +
                (minX + 20) +
                "," +
                (minY + 30 - sp * 60) +
                " " +
                (maxX - 20) +
                "," +
                (minY + 30 - sp * 60) +
                `" fill="none" stroke="` +
                drawColour +
                `" stroke-width="3"/>` +
                `<polyline points="` +
                (minX + 20) +
                "," +
                (minY + 45 - sp * 60) +
                " " +
                (maxX - 20) +
                "," +
                (minY + 45 - sp * 60) +
                `" fill="none" stroke="` +
                drawColour +
                `" stroke-width="3" />`;

            // console.log(equalsLine);
            // REMEMBER:  The x,y coordinates of any Leaf is shifted 150, 100 from the top left corner, and each Leaf is 300 wide (by default - but if you use a different Width Setting from the Settings, then that will change!!!!)
            let centreX = (minX + maxX) / 2;
            if (sp > 0 && primarySpouse.x > primaryLeaf.x) {
                centreX = primarySpouse.x - 150 - 50;
            }

            childrenMinX = Math.min(childrenMinX, centreX);
            childrenMaxX = Math.max(childrenMaxX, centreX);
            let crossBarY = checkCrossBarYwithATC(childrenY - 130 - (sp + levelNum) * 30, childrenMinX, childrenMaxX);

            let tBarVertLine =
                `<polyline points="` +
                centreX +
                "," +
                (minY + 45 - sp * 60) +
                " " +
                centreX +
                "," +
                crossBarY +
                `" fill="none" stroke="` +
                drawColour +
                `" stroke-width="3"/>` +
                `<polyline points="` +
                childrenMinX +
                "," +
                crossBarY +
                " " +
                childrenMaxX +
                "," +
                crossBarY +
                `" fill="none" stroke="` +
                drawColour +
                `" stroke-width="3"/>`;

            // console.log(tBarVertLine);

            let dropLines = "";
            for (let ch = 0; ch < childrenXs.length; ch++) {
                dropLines +=
                    `<polyline points="` +
                    childrenXs[ch] +
                    "," +
                    crossBarY +
                    " " +
                    childrenXs[ch] +
                    "," +
                    (childrenY - 80) +
                    `" fill="none" stroke="` +
                    drawColour +
                    `" stroke-width="3"/>`;
            }
            // console.log(dropLines);
            if (childrenXs.length > 0) {
                allLinesPolySVG += equalsLine + tBarVertLine + dropLines;
            } else {
                allLinesPolySVG += equalsLine;
            }
        }

        return allLinesPolySVG;
    }

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
    function recalcAndDisplayNumGensORIG() {
        if (thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children) {
            console.log(
                "function recalcAndDisplayNumGens -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                " Children"
            );
        } else {
            console.log(
                "function recalcAndDisplayNumGens -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data,
                " unknown Children"
            );
        }
        let OKtoAddAncs = true;
        let OKtoAddDescs = true;
        let OKtoAddCuzs = true;

        if (SuperBigFamView.numAncGens2Display < 0) {
            SuperBigFamView.numAncGens2Display = 0;
            showTemporaryMessageBelowButtonBar("You cannot display fewer than zero ancestors.");
        } else if (SuperBigFamView.numAncGens2Display > SuperBigFamView.workingMaxNumAncGens) {
            SuperBigFamView.numAncGens2Display = SuperBigFamView.workingMaxNumAncGens;
            if (SuperBigFamView.workingMaxNumAncGens < SuperBigFamView.maxNumAncGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation of ancestors until the current one is fully processed. <BR>Please wait until this message disappears." +
                        " / " +
                        SuperBigFamView.numAncGens2Display +
                        " / " +
                        SuperBigFamView.workingMaxNumAncGens +
                        " / " +
                        SuperBigFamView.numAncGens2Display
                );
                OKtoAddAncs = false;
            } else {
                showTemporaryMessageBelowButtonBar(
                    SuperBigFamView.maxNumAncGens +
                        " is the maximum number of ancestor generations you can display." +
                        " / " +
                        SuperBigFamView.numAncGens2Display +
                        " / " +
                        SuperBigFamView.workingMaxNumAncGens +
                        " / " +
                        SuperBigFamView.numAncGens2Display
                );
                OKtoAddAncs = false;
            }
        }

        if (SuperBigFamView.numDescGens2Display < 0) {
            SuperBigFamView.numDescGens2Display = 0;
            showTemporaryMessageBelowButtonBar("0 is the minimum number of descendants you can display.");
        } else if (SuperBigFamView.numDescGens2Display > SuperBigFamView.workingMaxNumDescGens) {
            SuperBigFamView.numDescGens2Display = SuperBigFamView.workingMaxNumDescGens;
            if (SuperBigFamView.workingMaxNumDescGens < SuperBigFamView.maxNumDescGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
                );
                OKtoAddDescs = false;
            } else {
                showTemporaryMessageBelowButtonBar(
                    SuperBigFamView.maxNumDescGens + " is the maximum number of descendant generations you can display."
                );
                OKtoAddDescs = false;
            }
        }

        if (SuperBigFamView.numCuzGens2Display < 0) {
            SuperBigFamView.numCuzGens2Display = 0;
            showTemporaryMessageBelowButtonBar("You can't display less than nothing.");
        } else if (SuperBigFamView.numCuzGens2Display > SuperBigFamView.maxNumCuzGens) {
            SuperBigFamView.numCuzGens2Display = SuperBigFamView.maxNumCuzGens;
            // if (SuperBigFamView.workingMaxNumGens < SuperBigFamView.maxNumGens) {
            //     flashWarningMessageBelowButtonBar(
            //         "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
            //     );
            // } else {

            showTemporaryMessageBelowButtonBar(
                "3rd cousins is the maximum depth in generations you can display."
            );

            // }
        }

        var numGensSpan = document.querySelector("#numAncGensInBBar");
        if (SuperBigFamView.numAncGens2Display == 0) {
            numGensSpan.textContent = "none";
        } else {
            numGensSpan.textContent =
                SuperBigFamView.numAncGens2Display +
                " generation" +
                (SuperBigFamView.numAncGens2Display != 1 ? "s" : "");
        }
        numGensSpan = document.querySelector("#numDescGensInBBar");
        if (SuperBigFamView.numDescGens2Display == 0) {
            numGensSpan.textContent = "none";
        } else {
            numGensSpan.textContent =
                SuperBigFamView.numDescGens2Display +
                " generation" +
                (SuperBigFamView.numDescGens2Display != 1 ? "s" : "");
        }

        numGensSpan = document.querySelector("#numCuzGensInBBar");
        let cuzQuips = ["none", "aunts/uncles", "1st cousins", "2nd cousins", "3rd cousins"];
        if (SuperBigFamView.numCuzGens2Display < cuzQuips.length) {
            numGensSpan.textContent = cuzQuips[SuperBigFamView.numCuzGens2Display];
        } else {
            numGensSpan.textContent = SuperBigFamView.numCuzGens2Display - 1 + "th cousins";
        }

        if (SuperBigFamView.numAncGens2Display > Math.max(0, SuperBigFamView.numAncGensRetrieved) && OKtoAddAncs) {
            // SuperBigFamView.numAncGensRetrieved = SuperBigFamView.numAncGens2Display;
            console.log(
                "** Calling function loadAncestorsAtLevel " +
                    SuperBigFamView.numAncGens2Display +
                    " from recalcAndDisplayNumGens"
            );
            loadAncestorsAtLevel(SuperBigFamView.numAncGens2Display);
            // SuperBigFamView.workingMaxNumAncGens = Math.min(
            //     SuperBigFamView.maxNumAncGens,
            //     Math.max(SuperBigFamView.workingMaxNumAncGens, SuperBigFamView.numAncGens2Display + 1)
            // );
        }

        if (SuperBigFamView.numDescGens2Display > SuperBigFamView.numDescGensRetrieved && OKtoAddDescs) {
            SuperBigFamView.numDescGensRetrieved = SuperBigFamView.numDescGens2Display;
            loadDescendantsAtLevel(SuperBigFamView.numDescGens2Display);
            SuperBigFamView.workingMaxNumDescGens = Math.min(
                SuperBigFamView.maxNumDescGens,
                Math.max(SuperBigFamView.workingMaxNumDescGens, SuperBigFamView.numDescGens2Display + 1)
            );
        }

        if (SuperBigFamView.numCuzGens2Display > SuperBigFamView.numCuzGensRetrieved && OKtoAddCuzs) {
            SuperBigFamView.numCuzGensRetrieved = SuperBigFamView.numCuzGens2Display;
            loadCousinsAtLevel(SuperBigFamView.numCuzGens2Display);
            SuperBigFamView.workingMaxNumCuzGens = Math.min(
                SuperBigFamView.maxNumCuzGens,
                Math.max(SuperBigFamView.workingMaxNumCuzGens, SuperBigFamView.numCuzGens2Display + 1)
            );
        }
    }

    function recalcAndDisplayNumGensAncs() {
        if (thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children) {
            console.log(
                "function recalcAndDisplayNumGensAncs -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                " Children"
            );
        } else {
            console.log(
                "function recalcAndDisplayNumGensAncs -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data,
                " unknown Children"
            );
        }
        let OKtoAddAncs = true;
        let OKtoAddDescs = true;
        let OKtoAddCuzs = true;

        if (SuperBigFamView.numAncGens2Display < 0) {
            SuperBigFamView.numAncGens2Display = 0;
            showTemporaryMessageBelowButtonBar("You cannot display fewer than zero ancestors.");
        } else if (SuperBigFamView.numAncGens2Display >= SuperBigFamView.maxNumAncGens) {
            // SuperBigFamView.numAncGens2Display = SuperBigFamView.workingMaxNumAncGens;
            // if (SuperBigFamView.numAncGens2Display >= SuperBigFamView.maxNumAncGens) {
                //     flashWarningMessageBelowButtonBar(
                //         "Cannot load next generation of ancestors until the current one is fully processed. <BR>Please wait until this message disappears." +
                //             " / " +
                //             SuperBigFamView.numAncGens2Display +
                //             " / " +
                //             SuperBigFamView.workingMaxNumAncGens +
                //             " / " +
                //             SuperBigFamView.numAncGens2Display
                //     );
                //     OKtoAddAncs = false;
                // } else {
                showTemporaryMessageBelowButtonBar(
                    SuperBigFamView.maxNumAncGens +
                        " is the maximum number of ancestor generations you can display." +
                        " / " +
                        SuperBigFamView.numAncGens2Display +
                        " / " +
                        SuperBigFamView.workingMaxNumAncGens +
                        " / " +
                        SuperBigFamView.numAncGens2Display
                );
                OKtoAddAncs = false;
            // }
        }

        var numGensSpan = document.querySelector("#numAncGensInBBar");
        if (SuperBigFamView.numAncGens2Display == 0) {
            numGensSpan.textContent = "none";
        } else {
            numGensSpan.textContent =
                SuperBigFamView.numAncGens2Display +
                " generation" +
                (SuperBigFamView.numAncGens2Display != 1 ? "s" : "");
        }

        if (SuperBigFamView.numAncGens2Display > Math.max(0, SuperBigFamView.numAncGensRetrieved) && OKtoAddAncs) {
            // SuperBigFamView.numAncGensRetrieved = SuperBigFamView.numAncGens2Display;
            console.log(
                "** Calling function loadAncestorsAtLevel " +
                    SuperBigFamView.numAncGens2Display +
                    " from recalcAndDisplayNumGens"
            );
            loadAncestorsAtLevel(SuperBigFamView.numAncGens2Display);
            // SuperBigFamView.workingMaxNumAncGens = Math.min(
            //     SuperBigFamView.maxNumAncGens,
            //     Math.max(SuperBigFamView.workingMaxNumAncGens, SuperBigFamView.numAncGens2Display + 1)
            // );
        } else {
            SuperBigFamView.refreshTheLegend();
        }
    }

    function recalcAndDisplayNumGensDescs() {
        if (thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children) {
            console.log(
                "function recalcAndDisplayNumGensDescs -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                " Children"
            );
        } else {
            console.log(
                "function recalcAndDisplayNumGensDescs -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data,
                " unknown Children"
            );
        }
        let OKtoAddDescs = true;

        if (SuperBigFamView.numDescGens2Display < 0) {
            SuperBigFamView.numDescGens2Display = 0;
            showTemporaryMessageBelowButtonBar("0 is the minimum number of descendants you can display.");
        } else if (SuperBigFamView.numDescGens2Display > SuperBigFamView.maxNumDescGens) {
            SuperBigFamView.numDescGens2Display = SuperBigFamView.maxNumDescGens;
            // if (SuperBigFamView.workingMaxNumDescGens < SuperBigFamView.maxNumDescGens) {
            //     flashWarningMessageBelowButtonBar(
            //         "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
            //     );
            //     OKtoAddDescs = false;
            // } else {
                showTemporaryMessageBelowButtonBar(
                    SuperBigFamView.maxNumDescGens + " is the maximum number of descendant generations you can display."
                );
                OKtoAddDescs = false;
            // }
        }

        let numGensSpan = document.querySelector("#numDescGensInBBar");
        if (SuperBigFamView.numDescGens2Display == 0) {
            numGensSpan.textContent = "none";
        } else {
            numGensSpan.textContent =
                SuperBigFamView.numDescGens2Display +
                " generation" +
                (SuperBigFamView.numDescGens2Display != 1 ? "s" : "");
        }

        if (SuperBigFamView.numDescGens2Display > SuperBigFamView.numDescGensRetrieved && OKtoAddDescs) {
            SuperBigFamView.numDescGensRetrieved = SuperBigFamView.numDescGens2Display;
            loadDescendantsAtLevel(SuperBigFamView.numDescGens2Display);
            SuperBigFamView.workingMaxNumDescGens = Math.min(
                SuperBigFamView.maxNumDescGens,
                Math.max(SuperBigFamView.workingMaxNumDescGens, SuperBigFamView.numDescGens2Display + 1)
            );
        } else {
            SuperBigFamView.refreshTheLegend();
        }
    }

    function recalcAndDisplayNumGensCuz() {
        if (thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children) {
            console.log(
                "function recalcAndDisplayNumGensCuz -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                " Children"
            );
        } else {
            console.log(
                "function recalcAndDisplayNumGensCuz -> let's begin - At beginning of - primary has ",
                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data,
                " unknown Children"
            );
        }

        console.log("numCuzGens2Display , MaxCuz",SuperBigFamView.numCuzGens2Display , SuperBigFamView.maxNumCuzGens)
        let OKtoAddAncs = true;
        let OKtoAddDescs = true;
        let OKtoAddCuzs = true;

        if (SuperBigFamView.numCuzGens2Display < 0) {
            SuperBigFamView.numCuzGens2Display = 0;
            showTemporaryMessageBelowButtonBar("You can't display less than nothing.");
        } else if (SuperBigFamView.numCuzGens2Display > SuperBigFamView.maxNumCuzGens) {
            SuperBigFamView.numCuzGens2Display = SuperBigFamView.maxNumCuzGens;
            // if (SuperBigFamView.workingMaxNumGens < SuperBigFamView.maxNumGens) {
            //     flashWarningMessageBelowButtonBar(
            //         "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
            //     );
            // } else {

            showTemporaryMessageBelowButtonBar(
                "3rd cousins is the maximum depth in generations you can display."
            );
            OKtoAddCuzs = false;
            // }
        }

        var numGensSpan = document.querySelector("#numCuzGensInBBar");
        let cuzQuips = ["none", "aunts/uncles", "1st cousins", "2nd cousins", "3rd cousins"];
        if (SuperBigFamView.numCuzGens2Display < cuzQuips.length) {
            numGensSpan.textContent = cuzQuips[SuperBigFamView.numCuzGens2Display];
        } else {
            numGensSpan.textContent = SuperBigFamView.numCuzGens2Display - 1 + "th cousins";
        }

        if (SuperBigFamView.numCuzGens2Display > SuperBigFamView.numCuzGensRetrieved && OKtoAddCuzs) {
            SuperBigFamView.numCuzGensRetrieved = SuperBigFamView.numCuzGens2Display;
            loadCousinsAtLevel(SuperBigFamView.numCuzGens2Display);
            SuperBigFamView.workingMaxNumCuzGens = Math.min(
                SuperBigFamView.maxNumCuzGens,
                Math.max(SuperBigFamView.workingMaxNumCuzGens, SuperBigFamView.numCuzGens2Display + 1)
            );
        } else {
            SuperBigFamView.refreshTheLegend();
        }
    }

    /*
        * GENERAL GETPEOPLE function - used to generalize the call to getPeople API, and handle repeated calls if needed

        parameters: 
            (APP_ID is a constant - so doesn't need to be sent as a paramter to this function)
            KeysIDsArray - array of IDs to use as keys for the getPeople call
            (SuperBigFamView.fieldNamesArray, also a constant - so doesn't need to be sent as a parameter to this function )
            getCode - a code used to determine which type & number of input you're looking for 
                (A / D / C = Ancestor / Descendant / Cousin), 
                (1 / 2 / 3 = Phase 1 / 2 / 3 for multi-step requests)
            startAt = 0 - in the case where a getPeople query returns the 1000 person limit, then re-do the query with a different startAt value

        ALSO:
            SuperBigFamView.currentListOfIDs = full list of KeysIDsArray that are still waiting to be used (does not include this call's KeysIDsArray values)
             - in the case where a query (like for spouses) has more keys than can fit in a legit getPeople query (max of 100 keys per request)

        LOGIC:
            * do the getPeople call
            * IF the # of profiles returned == 1000 (or more?)
            *      re-do the call with an increased startAt value
            * ELSE
            *       IF SuperBigFamView.currentListOfIDs.length > 0 
            *           re-do the call with a new KeysIDsArray set of values (up to 100 of them) - and revised SuperBigFamView.currentListOfIDs array
            * 
            *       ELSE
            *   
            *           IF getCode has another Phase left to do
            *               do call for next phase
            *           ELSE
            *               ALL DONE
            * 
            * 

    */

    function getPeopleCall(KeysIDsArray, getCode = "A1", startKeyAt = 0, startResultAt = 0, NextKeysIDsArray = []) {
        let newDescLevel = SuperBigFamView.numDescGens2Display;
        let newAncLevel = SuperBigFamView.numAncGens2Display;
        let numDescendants = Math.max(1, SuperBigFamView.numCuzGens2Display, newDescLevel);
        let numCousinDescendants = Math.max(1, SuperBigFamView.numCuzGens2Display);
        let getPeopleParametersArray = {
            A1: { params: { descendants: numCousinDescendants }, aboveMsg: "descendants of top ancestors" },
            A2: { params: { ancestors: 1, siblings: 1 }, aboveMsg: "parents and siblings of top ancestors" },
            A3: { params: { ancestors: 1 }, aboveMsg: "descendants' spouses and in-laws" },
            A4: { params: { ancestors: 1 }, aboveMsg: "ancestors' spouses and in-laws" },

            D1: {
                params: { descendants: newDescLevel, minGeneration: newDescLevel },
                aboveMsg: "descendants of primary and siblings",
            },
            D2: { params: { ancestors: 1 }, aboveMsg: "spouses and in-laws" },

            C1: {
                params: { descendants: numCousinDescendants, minGeneration: numCousinDescendants - 1 },
                aboveMsg: "descendants of ancestors",
            },
            C2: { params: { ancestors: 1 }, aboveMsg: "spouses and in-laws" },
        };

        let thisGetPeopleOptions = getPeopleParametersArray[getCode].params;
        if (startResultAt > 0) {
            thisGetPeopleOptions.start = startResultAt;
        }

        let cuzQuips = ["none", "aunts/uncles", "1st cousins", "2nd cousins", "3rd cousins"];
        let messagePrefixes = {
            A: "Loading Ancestors - generation " + newAncLevel + " : phase ",
            D: "Loading Descendants - generation " + newDescLevel + " : phase ",
            C: "Loading Cousins - " + cuzQuips[numCousinDescendants] + " : phase ",
        };

        loadingTD.innerHTML = "loading...";
        

        let thisKeysIDsArray = KeysIDsArray;
        if (KeysIDsArray.length > 100) {
            console.log("--> getPeopleCall - BIG INPUT :", KeysIDsArray.length, "startAt = " + startKeyAt);
        }
        
        if (KeysIDsArray.length <= 100) {
            // the default value is fine - no problem
        } else if (KeysIDsArray.length > startKeyAt + 100) {
            thisKeysIDsArray = KeysIDsArray.slice(startKeyAt + 0, startKeyAt + 100);
        } else {
            // full length is > 100, so need to use a slice to send a manageable amount of keys into the getPeople API request
            // BUT ... the full length isn't 100 MORE than the current starting position,
            // which means, we're in the last group of 100 or less keys
            thisKeysIDsArray = KeysIDsArray.slice(startKeyAt);
        }
            if (startKeyAt == 0 && startResultAt == 0) {
                // we must be at the beginning of a phase, so we can then populate the ListOfIds
                SuperBigFamView.ListsOfIDs[getCode + "inp"] = KeysIDsArray;
                SuperBigFamView.ListsOfIDs[getCode + "out"] = [];
                SuperBigFamView.ListsOfIDs[getCode + "sp"] = [];
            }

        console.log(
            "getPeopleCall : ",
            thisKeysIDsArray.length + " of " + KeysIDsArray.length,
            getCode ,
            startKeyAt ,
            startResultAt ,
            thisGetPeopleOptions,
            "A:" + newAncLevel + " D:" + newDescLevel + " C:" + numCousinDescendants
        );
        if (KeysIDsArray.length > 100) {
            getPeopleParametersArray[getCode].aboveMsg +=
                " (" + (startKeyAt + 1) + " - " + (startKeyAt + thisKeysIDsArray.length) + " of " + KeysIDsArray.length + ")";
        }
        
        flashWarningMessageBelowButtonBar(
            messagePrefixes[getCode[0]] + getCode + " : Retrieving: " + getPeopleParametersArray[getCode].aboveMsg
        );

            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                thisKeysIDsArray,
                SuperBigFamView.fieldNamesArray,
                thisGetPeopleOptions
            ).then(function (result) {
                if (result) {
                    flashWarningMessageBelowButtonBar(
                        getCode + " : PROCESSING: " + getPeopleParametersArray[getCode].aboveMsg
                    );
                    console.log("getPeopleCall (result): ", result);

                    // need to put in the test ... in case we get a null result, which we will eventually at the end of the line
                    let theNewProfiles = result[2];
                    console.log("New Profiles Found:", theNewProfiles, result);

                    let numNewPeeps = 0;
                    let numNewSpouses = 0;

                    for (const index in theNewProfiles) {
                        numNewPeeps++;
                        thePeopleList.addIfNeeded(theNewProfiles[index]);
                        SuperBigFamView.ListsOfIDs[getCode + "out"].push(index);

                        if (theNewProfiles[index].Spouses && theNewProfiles[index].Spouses.length > 0) {
                            for (let s = 0; s < theNewProfiles[index].Spouses.length; s++) {
                                const sp = theNewProfiles[index].Spouses[s];
                                SuperBigFamView.ListsOfIDs[getCode + "sp"].push(sp.Id);
                                numNewSpouses++;
                            }
                        }
                    }
                    console.log("ADDED ", numNewPeeps, " new peeps!");

                    if (numNewPeeps >= 1000) {
                        // WE NEED TO DO THE EXACT SAME CALL AGAIN, AND START 1000 higher (exact same keys, parameters)
                        getPeopleCall(KeysIDsArray, getCode, startKeyAt, startResultAt + 1000, NextKeysIDsArray);
                    } else if (KeysIDsArray.length > startKeyAt + 100) {
                        // WE NEED TO DO THE SAME CALL AGAIN, BUT START WITH THE NEXT 100 KEYS (diff keys, same parameters)
                        getPeopleCall(KeysIDsArray, getCode, startKeyAt + 100, startResultAt, NextKeysIDsArray);
                    } else {
                        // READY TO GO ONTO THE NEXT PHASE - OR - CALL IT QUITS AND REDRAW THE SUPER BIG FAM TREE

                        if (getCode == "C1") {
                            getPeopleCall(SuperBigFamView.ListsOfIDs["C1sp"], "C2", 0);
                        } else if (getCode == "C2") {
                            postGetPeopleProcessing(getCode[0], numCousinDescendants);
                        } else if (getCode == "D1") {
                            getPeopleCall(SuperBigFamView.ListsOfIDs["D1sp"], "D2", 0);
                        } else if (getCode == "D2") {
                            postGetPeopleProcessing(getCode[0], newDescLevel);
                        } else if (getCode == "A1") {
                            getPeopleCall(NextKeysIDsArray, "A2", 0);
                        } else if (getCode == "A2") {
                            getPeopleCall(SuperBigFamView.ListsOfIDs["A1sp"], "A3", 0);
                        } else if (getCode == "A3") {
                            getPeopleCall(SuperBigFamView.ListsOfIDs["A2sp"], "A4", 0);
                        } else if (getCode == "A4") {
                            postGetPeopleProcessing(getCode[0], newAncLevel);
                        }
                    }
                }
            });
    }

    /* 
        POST GET PEOPLE PROCESSING:

        --> linkParentsToChildren function for all new descendants (or children of new ancestors)
        --> assembleSiblings where appropriate
        --> addLeafToCollection [ selectedIDs ]

    */

    function postGetPeopleProcessing(codeLetter, newLevel) {
        for (let peepID in thePeopleList) {
            let thisPeep = thePeopleList[peepID];

            if (!thisPeep) {
                console.log(" - in postGetPeopleProcessing: can't find ", peepID, " in thePeopleList");
            } else {
                console.log("need to draw out Children and Siblings for ", thisPeep._data.BirthNamePrivate);
                if (!thisPeep._data.Children) {
                    thisPeep._data.Children = [];
                    thisPeep._data.Siblings = [];
                }
                if (thisPeep._data.Mother > 0 && thePeopleList[thisPeep._data.Mother]) {
                    linkParentAndChild(peepID, thisPeep._data.Mother, "F");
                }
                if (thisPeep._data.Father > 0 && thePeopleList[thisPeep._data.Father]) {
                    linkParentAndChild(peepID, thisPeep._data.Father, "M");
                }
            }
        }

        for (let NL = newLevel; NL <= newLevel + 1; NL++) {
            addToLeafCollectionAtLevel(NL);
        }

        // SuperBigFamView.numGensRetrieved = newLevel;
        // SuperBigFamView.workingMaxNumCuzGens = Math.min(
        //     SuperBigFamView.maxNumCuzGens,
        //     SuperBigFamView.numGensRetrieved + 1
        // );

        // ============================================
        // ANCESTORS version of GET PEOPLE PROCESSING
        // ============================================
        if (codeLetter == "A") {
            const thinkChunk = "A" + newLevel;
            const theCodesList = SuperBigFamView.theChunkCollection[thinkChunk].CodesList;
            let theAncsOnlyIDs = [];

            for (let c = 0; c < theCodesList.length; c++) {
                const code = theCodesList[c];
                const ancID = SuperBigFamView.theLeafCollection[code].Id;
                theAncsOnlyIDs.push(ancID);
                
                if (thePeopleList[ancID] && thePeopleList[ancID].Father && thePeopleList[ancID].Father > 0) {
                    theAncsOnlyIDs.push(thePeopleList[ancID].Father);
                }
                if (thePeopleList[ancID] && thePeopleList[ancID].Mother && thePeopleList[ancID].Mother > 0) {
                    theAncsOnlyIDs.push(thePeopleList[ancID].Mother);
                }                
            }

            assembleSiblingsFor(theAncsOnlyIDs);
        }
        

        // ============================================
        // DESCENDANTS version of GET PEOPLE PROCESSING
        // ============================================

        //assembleSiblingsFor(theAncsOnlyIDs);

        // ============================================
        // COUSINS version of GET PEOPLE PROCESSING
        // ============================================

        // ====================
        // THE END
        // ====================

        clearMessageBelowButtonBar();
        loadingTD.innerHTML = "&nbsp;";
        SuperBigFamView.refreshTheLegend();
    }

    /*
     *      * To ADD DESCENDANTS @ Gen N
     *          -> getPeople keys: PRIMARY + Primary's Siblings, descendants:N, minGenerations:N, siblings:0, incl. Spouses in fields list
     *              * --> collect all the SPOUSES from the above getPeople, and then do a second API run:
     *          -> getPeople keys: SpousesOf A(N) call just done , nuclear:1 , incl. Spouses (or initially - just ancestors:1)
     *
     *        CHECK FOR OVER-WRITING PRIMARY RECORD (and obliterating the Children array)
     */
    function loadDescendantsAtLevel(newLevel) {
        let newDescLevel = SuperBigFamView.numDescGens2Display;
        console.log("Need to load MORE DESCENDANT peeps from Generation ", newLevel,newDescLevel);
        if (SuperBigFamView.loadedLevels.indexOf("D" + newLevel) > -1) {
            // already loaded this level ... so let's just return and forget about it - no need to repeat the past
            SuperBigFamView.refreshTheLegend();
            return;
        } else {
            SuperBigFamView.loadedLevels.push("D" + newLevel);
        }
        console.log("--> ENGAGE - Need to load really");
        console.log(
            "At beginning of function loadDescendantsAtLevel - primary peeps has ",
            thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
            " Children"
        );

        let theListOfIDs = [];
        let theListOfNames = [];
        let theAncsOnlyIDs = [];

        const code = "A0";
        const ancID = SuperBigFamView.theLeafCollection[code].Id;
        theListOfIDs.push(ancID);
        theListOfNames.push(thePeopleList[ancID]);

        theAncsOnlyIDs.push(ancID);
        const theSiblings = thePeopleList[ancID]._data.Siblings;
        console.log("Descendant Peeps - looking for primary's siblings here:", theSiblings, thePeopleList[ancID]);
        if (theSiblings) {
            for (let s = 0; s < theSiblings.length; s++) {
                const sib = theSiblings[s];
                theListOfIDs.push(sib.Id);
                theListOfNames.push(thePeopleList[sib.Id]);
            }
        }

        getPeopleCall(theListOfIDs,  "D1");

        return;

        if (theListOfIDs.length == 0) {
            // condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            
        } else {
            // WikiTreeAPI.getRelatives(
            let loadingTD = document.getElementById("loadingTD");
            loadingTD.innerHTML = "loading...";
            // loadingTD.innerHTML = "loading Descendants gen" + newLevel + " - (step 1 of 4)";
            console.log(
                "(loadDescendantsAtLevel:" + newLevel + " - 1) GETPEOPLE",
                APP_ID,
                theListOfIDs,
                ["Id", "Bio"],
                { descendants: newLevel, minGeneration: newLevel }
            );
            let namesList = [];
            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                theListOfIDs,
                SuperBigFamView.fieldNamesArray,
                { descendants: newLevel, minGeneration: newLevel }
            ).then(function (result1) {
                if (result1) {
                    // need to put in the test ... in case we get a null result1, which we will eventually at the end of the line
                    const theDescsFound = result1[2];
                    condLog("the Descendants needed:", theDescsFound);
                    // condLog("person with which to drawTree:", person);
                    console.log(
                        "At line 3717 of function loadDescendantsAtLevel - primary peeps has ",
                        thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                        " Children"
                    );

                    let numPeepsAdded = 0;
                    let spouseIDsArray = [];
                    for (const index in theDescsFound) {
                        numPeepsAdded++;
                        thePeopleList.addIfNeeded(theDescsFound[index]);
                        namesList.push(theDescsFound[index].BirthName);
                        if (theDescsFound[index].Spouses && theDescsFound[index].Spouses.length > 0) {
                            for (let s = 0; s < theDescsFound[index].Spouses.length; s++) {
                                const sp = theDescsFound[index].Spouses[s];
                                spouseIDsArray.push(sp.Id);
                            }
                        }
                    }
                    console.log(
                        "ADDED ",
                        numPeepsAdded,
                        "Descendant peeps!",
                        namesList,
                        "from",
                        theListOfIDs,
                        theListOfNames,
                        "at descendants: " + newLevel
                    );
                    // SuperBigFamView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors

                    // console.log("SPOUSES peeps NEXT: ", spouseIDsArray.length, spouseIDsArray);
                    loadingTD.innerHTML = "loading Descendants gen" + newLevel + " - (step 2 of 4)";

                    // console.log(
                    //     "(loadDescendantsAtLevel:" + newLevel + " - 2) GETPEOPLE",
                    //     APP_ID,
                    //     spouseIDsArray,
                    //     ["Id"],
                    //     { ancestors: 1, siblings: 0 }
                    // );

                    // console.log(
                    //     "At line 3759 of function loadDescendantsAtLevel - primary peeps has ",
                    //     thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                    //     " Children"
                    // );
                    WikiTreeAPI.getPeople(
                        // (appId, IDs, fields, options = {})
                        APP_ID,
                        spouseIDsArray,
                        SuperBigFamView.fieldNamesArray,
                        { ancestors: 1, siblings: 0 }
                        // { nuclear: newLevel, minGeneration: newLevel }
                    ).then(function (result2) {
                        if (result2) {
                            // need to put in the test ... in case we get a null result2, which we will eventually at the end of the line
                            let theSpouseResults = result2[2];
                            condLog("Spouses Nuclear Family Found:", theSpouseResults);
                            
                            let numSpousePeepsAdded = 0;
                            for (const index in theSpouseResults) {
                                numSpousePeepsAdded++;
                                thePeopleList.addOrUpdate(theSpouseResults[index]);
                                namesList.push(theSpouseResults[index].BirthNamePrivate);
                            }
                             
                            for (let peepID in thePeopleList) {
                                let thisPeep = thePeopleList[peepID];
                             
                                if (!thisPeep._data.Children) {
                                    thisPeep._data.Children = [];
                                    thisPeep._data.Siblings = [];
                                    if (thisPeep._data.Mother > 0 && thePeopleList[thisPeep._data.Mother]) {
                                        linkParentAndChild(peepID, thisPeep._data.Mother, "F");
                                    }
                                    if (thisPeep._data.Father > 0 && thePeopleList[thisPeep._data.Father]) {
                                        linkParentAndChild(peepID, thisPeep._data.Father, "M");
                                    }
                                }
                            }

                            
                            // assembleSiblingsFor(theAncsOnlyIDs);

                            // console.log(
                            //     "At line 3845 of function loadDescendantsAtLevel - primary peeps has ",
                            //     thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                            //     " Children"
                            // );

                            addToLeafCollectionAtLevel(newLevel);

                            SuperBigFamView.numGensRetrieved = newLevel;
                            SuperBigFamView.workingMaxNumDesccGens = Math.min(
                                SuperBigFamView.maxNumDesccGens,
                                SuperBigFamView.numGensRetrieved + 1
                            );

                            clearMessageBelowButtonBar();
                            loadingTD.innerHTML = "&nbsp;";
                            // loadBiosNow(theListOfIDs, newLevel);
                            fillOutFamilyStatsLocsForAncestors();
                            findCategoriesOfAncestors();
                            // repositionLeaves();
                            SuperBigFamView.refreshTheLegend();
                        } else {
                            // console.log("WARNING: Found no extra SPOUSES");
                        }
                    });
                }
            });
        }
    }

    /* 
    *      * To ADD COUSINS @ Gen N
                get numCUZ from ButtonBarPanel
    *          -> getPeople keys: ALL A(N) direct ancestors' Siblings,  descendants:numCUZ, minGeneration: numCUZ -1,  incl. Spouses in fields list
    *              * --> collect all the SPOUSES from the above getPeople, and then do a second API run:
    * 
    * 
    *          -> getPeople keys: SpousesOf A(N) call just done , ancestors:1 , siblings:0, incl. Spouses
     
    * 
 */
    function loadCousinsAtLevel(newLevel) {
        const d = new Date();
        let ms = d.getUTCMinutes() + " : " + d.getUTCSeconds() + " : " + d.getUTCMilliseconds();
        console.log("== function loadCousinsAtLevel --> Need to load MORE COUSINS peeps at LEVEL ", newLevel, ms);
        console.log(
            "At beginning of function loadCousinsAtLevel - primary has ",
            thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
            " Children"
        );
        if (SuperBigFamView.loadedLevels.indexOf("A1C" + newLevel) > -1) {
            // already loaded this level ... so let's just return and forget about it - no need to repeat the past
            console.log(
                "xx False alarm ... returning right away from function loadCousinsAtLevel ... nothing to see here (already loaded level)"
            );
            SuperBigFamView.refreshTheLegend();
            return;
        } else {
            SuperBigFamView.loadedLevels.push("A1C" + newLevel);
        }
        console.log("--> ENGAGE - Need to load really");

        let theListOfIDs = [];
        let theAncsOnlyIDs = [];
        let theAncsParentsIDs = [];
        let theSibsOnlyIDs = [];
        let theSpousesOnlyIDs = [];
        let numDescendants = Math.max(1, SuperBigFamView.numCuzGens2Display, newLevel);
        let numAncestors = Math.max(1, SuperBigFamView.numAncGensRetrieved);

        // condLog(theListOfIDs);

        for (let a = 1; a <= newLevel; a++) {
            const thinkChunk = "A" + a;
            const theCodesList = SuperBigFamView.theChunkCollection[thinkChunk].CodesList;
            for (let c = 0; c < theCodesList.length; c++) {
                const code = theCodesList[c];
                const ancID = SuperBigFamView.theLeafCollection[code].Id;
                // theListOfIDs.push(ancID);
                 
                theAncsOnlyIDs.push(ancID);

                if (!thePeopleList[ancID]) {
                    continue;
                }

                const theSiblings = thePeopleList[ancID]._data.Siblings;
                if (theSiblings) {
                    for (let s = 0; s < theSiblings.length; s++) {
                        const sib = theSiblings[s];
                        theListOfIDs.push(sib.Id);
                        theSibsOnlyIDs.push(sib.Id);
                    }
                }
                const theSpouses = thePeopleList[ancID]._data.Spouses;
                if (theSpouses) {
                    for (let s = 0; s < theSpouses.length; s++) {
                        const sp = theSpouses[s];
                        theSpousesOnlyIDs.push(sp.Id);
                    }
                }
            }
            for (let sp = 0; sp < theSpousesOnlyIDs.length; sp++) {
                if ( theCodesList.indexOf(theSpousesOnlyIDs[sp]) > -1) {
                    // this spouse is also a direct ancestor ... no need to add his/her offspring to the list
                } else {
                    // BUT ... if this spouse is NOT among those in the CodeList - we have a second or third (or later) husband/wife
                    // and if we don't add them to the list of Siblings, their offspring (half-brothers/sisters of direct ancestors, half-aunts/uncles to primary) would be lost
                    theSibsOnlyIDs.push(theSpousesOnlyIDs[sp]);
                }
            }
            
        }

        //  (1)    -> getPeople keys: A(N) direct ancestors'  Siblings, and descendants based on num Cousins level,  descendants:1 + numCousins, incl. Spouses in fields list

        if (theListOfIDs.length == 0) {
            // condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            SuperBigFamView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            SuperBigFamView.numGensRetrieved = newLevel;
            SuperBigFamView.workingMaxNumCuzGens = Math.min(
                SuperBigFamView.maxNumCuzGens,
                SuperBigFamView.numGensRetrieved + 1
            );
        } else {
            let loadingTD = document.getElementById("loadingTD");
            loadingTD.innerHTML = "loading";

            getPeopleCall(theSibsOnlyIDs,  "C1");
            return;

            loadingTD.innerHTML = "loading Cousins " + newLevel + " - (1 of 4)";
            let theListOfID2Use = theSibsOnlyIDs;

            if (theListOfID2Use.length == 0) {
                theListOfID2Use = [theListOfIDs[0]];
            } else if (theListOfID2Use.length <= 100) {
                SuperBigFamView.currentListOfIDs = [];
            } else {
                SuperBigFamView.currentListOfIDs = theListOfID2Use.slice(100);
                theListOfID2Use = theSibsOnlyIDs.slice(0, 100);
                console.log("TOO MANY PEEPS !!!!!", theSibsOnlyIDs, theListOfID2Use, SuperBigFamView.currentListOfIDs);
            }

            console.log("(loadCousinsAtLevel:" + newLevel + " - 1) GETPEOPLE", APP_ID, theListOfID2Use, {
                descendants: numDescendants,
                minGeneration: numDescendants - 1,
            });

            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                theListOfID2Use,
                SuperBigFamView.fieldNamesArray,
                { descendants: numDescendants, minGeneration: numDescendants }
                // { nuclear: newLevel, minGeneration: newLevel }
            ).then(function (result1) {
                if (result1) {
                    // need to put in the test ... in case we get a null result1, which we will eventually at the end of the line
                    let theSiblingsDescendants = result1[2];
                    condLog("theAncestors needed:", theSiblingsDescendants);
                    // condLog("person with which to drawTree:", person);
                    let numPeepsAdded = 0;
                    let spouseIDsArray = [];
                    for (const index in theSiblingsDescendants) {
                        numPeepsAdded++;
                        thePeopleList.addIfNeeded(theSiblingsDescendants[index]);
                        theListOfIDs.push(index);
                        if (theSiblingsDescendants[index].Spouses && theSiblingsDescendants[index].Spouses.length > 0) {
                            for (let s = 0; s < theSiblingsDescendants[index].Spouses.length; s++) {
                                const sp = theSiblingsDescendants[index].Spouses[s];
                                spouseIDsArray.push(sp.Id);
                            }
                        }
                    }
                    console.log(
                        "ADDED ",
                        numPeepsAdded,
                        " Ancestors' Siblings' Descendants for Cousins peeps! - ",
                        numDescendants,
                        "generations down",
                        ", taken from ",
                        numAncestors,
                        " generations of Ancestors above"
                    );
                    // SuperBigFamView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors

                    // console.log("SPOUSES from Siblings Descendants for Cousins: ", spouseIDsArray.length);

                    loadingTD.innerHTML = "loading Cousins " + newLevel + " - (2 of 4)";
                    console.log("(loadCousinsAtLevel:" + newLevel + " - 2) GETPEOPLE", APP_ID, spouseIDsArray, {
                        ancestors: 1,
                    });

                    if (spouseIDsArray.length == 0) {
                        spouseIDsArray = [theListOfIDs[0]];
                    } else if (spouseIDsArray.length <= 100) {
                        SuperBigFamView.currentListOfIDs = [];
                    } else {
                        let ORIGspouseIDsArray = spouseIDsArray;
                        SuperBigFamView.currentListOfIDs = spouseIDsArray.slice(100);
                        spouseIDsArray = ORIGspouseIDsArray.slice(0, 100);
                        console.log(
                            "TOO MANY PEEPS !!!!!",
                            ORIGspouseIDsArray,
                            spouseIDsArray,
                            SuperBigFamView.currentListOfIDs
                        );
                    }

                    WikiTreeAPI.getPeople(
                        // (appId, IDs, fields, options = {})
                        APP_ID,
                        spouseIDsArray,
                        SuperBigFamView.fieldNamesArray,
                        { ancestors: 1 }
                        // changed to ancestors:1 to only get spouses parents - switch back to nuclear:1 if you want their siblings and children and other spouses as well
                        // { nuclear: newLevel, minGeneration: newLevel }
                    ).then(function (result2) {
                        if (result2) {
                            // need to put in the test ... in case we get a null result2, which we will eventually at the end of the line
                            let allTheSpouses = result2[2];
                            condLog("All THe Cousin Spouses Found:", allTheSpouses);
                            loadingTD.innerHTML = "loading Cousins " + newLevel + " - (step 3 of 4)";

                            let numNexteepsAdded = 0;
                            for (const index in allTheSpouses) {
                                numNexteepsAdded++;
                                loadingTD.innerHTML =
                                    "loading Cousins " + newLevel + " - (step 3 of 4) - spouse " + numNexteepsAdded;
                                thePeopleList.addOrUpdate(allTheSpouses[index]);
                                theListOfIDs.push(index);
                            }
                            console.log("ADDED ", numNexteepsAdded, " Cousin SPOUSES peeps of all types!");
                            console.log("After 2nd getPeople of loadCousins - listOfIDs = ", theListOfIDs);

                            // for (let x in theListOfIDs) {
                            //     const peepID = theListOfIDs[x];
                            //     let thisPeep = thePeopleList[peepID];
                            loadingTD.innerHTML = "loading Cousins " + newLevel + " - (step 4 of 4)";
                            let numPeeps = 0;
                            for (let peepID in thePeopleList) {
                                let thisPeep = thePeopleList[peepID];
                                numPeeps++;
                                loadingTD.innerHTML =
                                    "loading Cousins " + newLevel + " - (step 4 of 4) - spouse peep " + numPeeps;

                                if (!thisPeep) {
                                    console.log(" - in loadCousins: can't find ", peepID, " in thePeopleList");
                                } else {
                                    console.log(
                                        "need to draw out Children and Siblings for Cousin ",
                                        thisPeep._data.BirthNamePrivate
                                    );
                                    if (!thisPeep._data.Children) {
                                        thisPeep._data.Children = [];
                                        thisPeep._data.Siblings = [];
                                    }
                                    if (thisPeep._data.Mother > 0 && thePeopleList[thisPeep._data.Mother]) {
                                        linkParentAndChild(peepID, thisPeep._data.Mother, "F");
                                    }
                                    if (thisPeep._data.Father > 0 && thePeopleList[thisPeep._data.Father]) {
                                        linkParentAndChild(peepID, thisPeep._data.Father, "M");
                                    }
                                }
                            }
                            loadingTD.innerHTML = "loading Cousins " + newLevel + " - (step 5 of 4)";

                            //assembleSiblingsFor(theAncsParentsIDs);

                            for (let NL = newLevel; NL <= newLevel + 3; NL++) {
                                addToLeafCollectionAtLevel(NL);
                            }

                            SuperBigFamView.numGensRetrieved = newLevel;
                            SuperBigFamView.workingMaxNumCuzGens = Math.min(
                                SuperBigFamView.maxNumCuzGens,
                                SuperBigFamView.numGensRetrieved + 1
                            );

                            clearMessageBelowButtonBar();
                            loadingTD.innerHTML = "&nbsp;";
                            // loadBiosNow(theListOfIDs, newLevel);
                            // fillOutFamilyStatsLocsForAncestors();
                            // findCategoriesOfAncestors();

                            console.log(
                                "At end of function loadCousinsAtLevel - " + newLevel + " - primary has ",
                                thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                                " Children"
                            );
                            SuperBigFamView.refreshTheLegend();
                        } else {
                            // console.log("WARNING: Found no extra SPOUSES");
                        }
                    });
                }
            });
        }
    }

    /* 
    *      * To ADD ANCESTORS @ Gen N
    *          -> getPeople keys: A(N) direct ancestors + their Siblings, ancestors:0, descendants:3, siblings:0, incl. Spouses in fields list
    *              * --> collect all the SPOUSES from the above getPeople, and then do a second API run:
    *          -> getPeople keys: SpousesOf A(N) call just done , nuclear:1 , siblings:0, incl. Spouses
    *          -> getPeople keys: A(N) direct ancestors;  Next level of Ancestors + Siblings  : ancestors:1, siblings:1, incl. Spouses
    * 
    *           OR .... how about this:
    
    *          -> getPeople keys: A(N) direct ancestors'  Siblings, and descendants based on num Cousins level,  descendants:1 + numCousins, incl. Spouses in fields list
    *              * --> collect all the SPOUSES from the above getPeople,
    *          -> getPeople keys: A(N) direct ancestors;  Next level of Ancestors + Siblings  : ancestors:1, siblings:1, incl. Spouses
    *              * --> collect all the SPOUSES from the above getPeople,
    *          -> getPeople keys: SpousesOf all above , nuclear:1 , siblings:0, incl. Spouses (or initially, simpler just ancestors:1 to get in-laws + spouses themselves)
    
    * 
 */
    function loadAncestorsAtLevel(newLevel) {
        const d = new Date();
        let ms = d.getUTCMinutes() + " : " + d.getUTCSeconds() + " : " + d.getUTCMilliseconds();
        console.log(
            "== function loadAncestorsAtLevel --> Need to load MORE ANCESTOR peeps from Generation ",
            newLevel,
            ms,
            SuperBigFamView.loadedLevels
        );
        console.log(
            "At beginning of function loadAncestorsAtLevel - primary has ",
            thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
            " Children"
        );
        if (SuperBigFamView.loadedLevels.indexOf("A" + newLevel) > -1) {
            // already loaded this level ... so let's just return and forget about it - no need to repeat the past
            console.log(
                "xx False alarm ... returning right away from function loadAncestorsAtLevel ... nothing to see here (already loaded level)"
            );
            SuperBigFamView.refreshTheLegend();
            return;
        } else {
            SuperBigFamView.loadedLevels.push("A" + newLevel);
        }
        console.log("--> ENGAGE - Need to load really");

        let theListOfIDs = [];
        let theAncsOnlyIDs = [];
        let theAncsParentsIDs = [];
        let theSibsOnlyIDs = [];
        let theSpousesOnlyIDs = [];
        let numDescendants = Math.max(1, SuperBigFamView.numCuzGens2Display);

        // condLog(theListOfIDs);
        const thinkChunk = "A" + newLevel;
        const theCodesList = SuperBigFamView.theChunkCollection[thinkChunk].CodesList;
        for (let c = 0; c < theCodesList.length; c++) {
            const code = theCodesList[c];
            const ancID = SuperBigFamView.theLeafCollection[code].Id;
            theListOfIDs.push(ancID);
            theAncsOnlyIDs.push(ancID);
            if (thePeopleList[ancID] && thePeopleList[ancID].Father && thePeopleList[ancID].Father > 0) {
                theAncsParentsIDs.push(thePeopleList[ancID].Father);
            }
            if (thePeopleList[ancID] && thePeopleList[ancID].Mother && thePeopleList[ancID].Mother > 0) {
                theAncsParentsIDs.push(thePeopleList[ancID].Mother);
            }

            const theSiblings = thePeopleList[ancID]._data.Siblings;
            if (theSiblings) {
                for (let s = 0; s < theSiblings.length; s++) {
                    const sib = theSiblings[s];
                    theListOfIDs.push(sib.Id);
                    theSibsOnlyIDs.push(sib.Id);
                }
            }
            const theSpouses = thePeopleList[ancID]._data.Spouses;
            if (theSpouses) {
                for (let s = 0; s < theSpouses.length; s++) {
                    const sp = theSpouses[s];
                    theSpousesOnlyIDs.push(sp.Id);
                }
            }
        }
        for (let sp = 0; sp < theSpousesOnlyIDs.length; sp++) {
            if (theCodesList.indexOf(theSpousesOnlyIDs[sp]) > -1) {
                // this spouse is also a direct ancestor ... no need to add his/her offspring to the list
            } else {
                // BUT ... if this spouse is NOT among those in the CodeList - we have a second or third (or later) husband/wife
                // and if we don't add them to the list of Siblings, their offspring (half-brothers/sisters of direct ancestors, half-aunts/uncles to primary) would be lost
                theSibsOnlyIDs.push(theSpousesOnlyIDs[sp]);
            }
        }

        //  (1)    -> getPeople keys: A(N) direct ancestors'  Siblings, and descendants based on num Cousins level,  descendants:1 + numCousins, incl. Spouses in fields list

        if (theListOfIDs.length == 0) {
            // condLog("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            SuperBigFamView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            SuperBigFamView.numGensRetrieved = newLevel;
            SuperBigFamView.workingMaxNumAncGens = Math.min(
                SuperBigFamView.maxNumAncGens,
                SuperBigFamView.numGensRetrieved + 1
            );
        } else {
            let loadingTD = document.getElementById("loadingTD");
            loadingTD.innerHTML = "loading Ancestors - gen" + newLevel + " - (step 1 of 4)";
            let theListOfID2Use = theSibsOnlyIDs;

            if (theListOfID2Use.length == 0) {
                theListOfID2Use = [theListOfIDs[0]];
            } else if (theListOfID2Use.length <= 100) {
                SuperBigFamView.currentListOfIDs = [];
            } else {
                SuperBigFamView.currentListOfIDs = theListOfID2Use.slice(100);
                theListOfID2Use = theSibsOnlyIDs.slice(0, 100);
                console.log("TOO MANY PEEPS !!!!!", theSibsOnlyIDs, theListOfID2Use, SuperBigFamView.currentListOfIDs);
            }

            console.log("(loadAncestorsAtLevel:" + newLevel + " - 1) GETPEOPLE", APP_ID, theListOfID2Use, {
                descendants: numDescendants,
            });

            getPeopleCall(theSibsOnlyIDs, "A1", 0, 0, theAncsOnlyIDs);
            return;

            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                theListOfID2Use,
                SuperBigFamView.fieldNamesArray,
                { descendants: numDescendants }
                // { nuclear: newLevel, minGeneration: newLevel }
            ).then(function (result1) {
                if (result1) {
                    // need to put in the test ... in case we get a null result1, which we will eventually at the end of the line
                    let theSiblingsDescendants = result1[2];
                    condLog("theAncestors needed:", theSiblingsDescendants);
                    // condLog("person with which to drawTree:", person);
                    let numPeepsAdded = 0;
                    let spouseIDsArray = [];
                    for (const index in theSiblingsDescendants) {
                        numPeepsAdded++;
                        thePeopleList.addIfNeeded(theSiblingsDescendants[index]);
                        theListOfIDs.push(index);
                        if (theSiblingsDescendants[index].Spouses && theSiblingsDescendants[index].Spouses.length > 0) {
                            for (let s = 0; s < theSiblingsDescendants[index].Spouses.length; s++) {
                                const sp = theSiblingsDescendants[index].Spouses[s];
                                spouseIDsArray.push(sp.Id);
                            }
                        }
                    }
                    console.log(
                        "ADDED ",
                        numPeepsAdded,
                        " Top Ancestors' Siblings' Descendant peeps for ",
                        numDescendants,
                        " generations"
                    );
                    // SuperBigFamView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors

                    console.log("# SPOUSES from Siblings Descendants peeps: ", spouseIDsArray.length);
                    loadingTD.innerHTML = "loading Ancestors gen" + newLevel + " - (step 2 of 4)";
                    // (2) -> getPeople keys: A(N) direct ancestors;  Next level of Ancestors + their Siblings  : ancestors:1, siblings:1, incl. Spouses

                    console.log("(loadAncestorsAtLevel:" + newLevel + " - 2) GETPEOPLE", APP_ID, theAncsOnlyIDs, {
                        ancestors: 1,
                        siblings: 1,
                    });

                    if (theAncsOnlyIDs.length == 0) {
                        theAncsOnlyIDs = [theAncsOnlyIDs[0]];
                    } else if (theAncsOnlyIDs.length <= 100) {
                        SuperBigFamView.currentListOfIDs = [];
                    } else {
                        let ORIGtheAncsOnlyIDs = theAncsOnlyIDs;
                        SuperBigFamView.currentListOfIDs = theAncsOnlyIDs.slice(100);
                        theAncsOnlyIDs = ORIGtheAncsOnlyIDs.slice(0, 100);
                        console.log(
                            "TOO MANY PEEPS !!!!!",
                            ORIGtheAncsOnlyIDs,
                            theAncsOnlyIDs,
                            SuperBigFamView.currentListOfIDs
                        );
                    }

                    WikiTreeAPI.getPeople(
                        // (appId, IDs, fields, options = {})
                        APP_ID,
                        theAncsOnlyIDs,
                        SuperBigFamView.fieldNamesArray,
                        { ancestors: 1, siblings: 1 }
                        // { nuclear: newLevel, minGeneration: newLevel }
                    ).then(function (result2) {
                        if (result2) {
                            // need to put in the test ... in case we get a null result2, which we will eventually at the end of the line
                            let theNextAncestorsAndSiblings = result2[2];
                            condLog("Next Ancestors and Siblings Found:", theNextAncestorsAndSiblings);

                            let numNextAncsAndSibs = 0;
                            let numDirectAncestorSpouses = 0;
                            for (const index in theNextAncestorsAndSiblings) {
                                numNextAncsAndSibs++;
                                thePeopleList.addIfNeeded(theNextAncestorsAndSiblings[index]);
                                theListOfIDs.push(index);

                                if (
                                    theNextAncestorsAndSiblings[index].Spouses &&
                                    theNextAncestorsAndSiblings[index].Spouses.length > 0
                                    // && theAncsOnlyIDs.indexOf(theNextAncestorsAndSiblings[index].Id) > -1
                                ) {
                                    for (let s = 0; s < theNextAncestorsAndSiblings[index].Spouses.length; s++) {
                                        const sp = theNextAncestorsAndSiblings[index].Spouses[s];
                                        spouseIDsArray.push(sp.Id);
                                        numDirectAncestorSpouses++;
                                    }
                                }
                            }
                            console.log("ADDED ", numNextAncsAndSibs, " next level Ancestors + Sibling peeps!");
                            console.log(
                                "GOING to ADD ",
                                numDirectAncestorSpouses,
                                " next level Ancestors' Spouses peeps!"
                            );
                            console.log(
                                "ALL SPOUSES from Siblings Descendants + New Ancestors peeps: ",
                                spouseIDsArray.length
                            );
                            loadingTD.innerHTML = "loading Ancestors gen" + newLevel + " - (step 3 of 4)";

                            console.log(
                                "(loadAncestorsAtLevel:" + newLevel + " - 3) GETPEOPLE",
                                APP_ID,
                                spouseIDsArray,
                                ["Id", "Bio"],
                                { ancestors: 1 }
                            );

                            if (spouseIDsArray.length == 0) {
                                spouseIDsArray = [];
                            } else if (spouseIDsArray.length <= 100) {
                                SuperBigFamView.currentListOfIDs = [];
                            } else {
                                let ORIGspouseIDsArray = spouseIDsArray;
                                SuperBigFamView.currentListOfIDs = spouseIDsArray.slice(100);
                                spouseIDsArray = ORIGspouseIDsArray.slice(0, 100);
                                console.log(
                                    "TOO MANY PEEPS !!!!!",
                                    ORIGspouseIDsArray,
                                    spouseIDsArray,
                                    SuperBigFamView.currentListOfIDs
                                );
                            }

                            WikiTreeAPI.getPeople(
                                // (appId, IDs, fields, options = {})
                                APP_ID,
                                spouseIDsArray,
                                SuperBigFamView.fieldNamesArray,
                                { ancestors: 1 }
                                // { nuclear: newLevel, minGeneration: newLevel }
                            ).then(function (result3) {
                                if (result3) {
                                    // need to put in the test ... in case we get a null result3, which we will eventually at the end of the line
                                    let allTheSpouses = result3[2];
                                    console.log("All THe Spouses peeps Found:", allTheSpouses, result3);

                                    let numNexteepsAdded = 0;
                                    for (const index in allTheSpouses) {
                                        numNexteepsAdded++;
                                        thePeopleList.addOrUpdate(allTheSpouses[index]);
                                        theListOfIDs.push(index);
                                    }
                                    console.log("ADDED ", numNexteepsAdded, " SPOUSES peeps of all types!");
                                    console.log("After 3rd getPeople of loadAncestors - listOfIDs = ", theListOfIDs);

                                    // for (let x in theListOfIDs) {
                                    //     const peepID = theListOfIDs[x];
                                    //     let thisPeep = thePeopleList[peepID];

                                    loadingTD.innerHTML = "loading Ancestors gen" + newLevel + " - (step 4 of 4)";
                                    for (let peepID in thePeopleList) {
                                        let thisPeep = thePeopleList[peepID];

                                        if (!thisPeep) {
                                            console.log(
                                                " - in loadAncestors: can't find ",
                                                peepID,
                                                " in thePeopleList"
                                            );
                                        } else {
                                            console.log(
                                                "need to draw out Children and Siblings for ",
                                                thisPeep._data.BirthNamePrivate
                                            );
                                            if (!thisPeep._data.Children) {
                                                thisPeep._data.Children = [];
                                                thisPeep._data.Siblings = [];
                                            }
                                            if (thisPeep._data.Mother > 0 && thePeopleList[thisPeep._data.Mother]) {
                                                linkParentAndChild(peepID, thisPeep._data.Mother, "F");
                                            }
                                            if (thisPeep._data.Father > 0 && thePeopleList[thisPeep._data.Father]) {
                                                linkParentAndChild(peepID, thisPeep._data.Father, "M");
                                            }
                                        }
                                    }

                                    assembleSiblingsFor(theAncsParentsIDs);
                                    assembleSiblingsFor(theAncsOnlyIDs);
                                    loadingTD.innerHTML = "loading Ancestors gen" + newLevel + " - (step 5 of 4)";
                                    for (let NL = newLevel; NL <= newLevel + 3; NL++) {
                                        addToLeafCollectionAtLevel(NL);
                                    }

                                    SuperBigFamView.numGensRetrieved = newLevel;
                                    SuperBigFamView.workingMaxNumAncGens = Math.min(
                                        SuperBigFamView.maxNumAncGens,
                                        SuperBigFamView.numGensRetrieved + 1
                                    );

                                    clearMessageBelowButtonBar();
                                    loadingTD.innerHTML = "&nbsp;";
                                    // loadBiosNow(theListOfIDs, newLevel);
                                    // fillOutFamilyStatsLocsForAncestors();
                                    // findCategoriesOfAncestors();

                                    console.log(
                                        "At end of function loadAncestorsAtLevel - " + newLevel + " - primary has ",
                                        thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
                                        " Children"
                                    );

                                    SuperBigFamView.refreshTheLegend();
                                    // if (newLevel == 1) {
                                    //     console.log(
                                    //         "** Calling function loadAncestorsAtLevel - " +
                                    //             2 +
                                    //             " - from inside loadAncestorsAtLevel ( 1 ) function "
                                    //     );
                                    //     loadAncestorsAtLevel(2);
                                    // } else if (newLevel == 2) {
                                    //     updateAllLeafCodesInPeopleList();
                                    // }
                                } else {
                                    // console.log("WARNING: Found no extra ANCESTORS");
                                }
                            });
                        } else {
                            // console.log("WARNING: Found no extra SPOUSES");
                        }
                    });
                }
            });
        }
    }

    function updateAllLeafCodesInPeopleList() {
        console.log(
            "At beginning of function updateAllLeafCodesInPeopleList - primary has ",
            thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
            " Children"
        );
        for (let l in SuperBigFamView.theLeafCollection) {
            let leaf = SuperBigFamView.theLeafCollection[l];
            addLeafCodeToPeopleListObject(leaf);
        }
        console.log(
            "At end of function updateAllLeafCodesInPeopleList - primary has ",
            thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
            " Children"
        );
    }

    function addToLeafCollectionAtLevel(newLevel) {
        for (let l in SuperBigFamView.theLeafCollection) {
            let leaf = SuperBigFamView.theLeafCollection[l];
            if (leaf.degree == newLevel - 1) {
                console.log("Should add / re-add the Leaf for :", leaf.Who);
                addToLeafCollection(leaf);
            }
        }
        // let thisPersonsLeaf = {
        //     Id: id,
        //     Code: "A0",
        //     FullCode: "A0:" + id + "-",
        //     degree: 0,
        //     Chunk: "A0",
        //     Who: person._data.BirthNamePrivate,
        // };
    }

    // Reposition all of the People Boxes (Leaves) for the Super Big Family Tree
    function repositionLeaves() {
        console.log("TIme to repositionLeaves of these peeps !");
        console.log(
            "At beginning of THIS function - primary peeps has ",
            thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data.Children.length,
            " Children"
        );
        // console.trace("Here");
        let theLeaves = getAllLeafNodes();
        let numA = SuperBigFamView.numAncGens2Display; // num Ancestors - going up
        let numD = SuperBigFamView.numDescGens2Display; // num Descendants - going down
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide
        // no setting here for showing IN LAWS or not .... yet ...

        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; //330 ; //currentMaxHeight4Box;//SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        let thisBoxWidth = 1.0 * SuperBigFamView.currentSettings["general_options_boxWidth"];

        // TEMPORARILY --> SHAKE IT UP A BIT and MOVE EVERYONE to a RANDOM LOCATION (just so you know that the x,y coordinates actually DO something!)
        let tmpCount = 0;

        for (let l in theLeaves) {
            let thisLeaf = theLeaves[l];
            thisLeaf["x"] = Math.round(350 * (tmpCount % 20)) - 3500; //Math.round(2000 * Math.random()) - 1000;
            thisLeaf["y"] = Math.round(350 * Math.floor(tmpCount / 20)) - 3500; //Math.round(2000 * Math.random()) - 1000;
            tmpCount++;
            console.log(
                "Here leafy leafy: ",
                thisLeaf["Chunk"],
                thisLeaf["Code"],
                thisLeaf["Id"],
                thePeopleList[thisLeaf["Id"]]
            );
        }

        let A0dimensions = {};

        //            =======================
        // A0 logic - POSITION PRIMARY PERSON ... AND THEIR DESCENDANTS, IF D > 0 according to NumDs stepper value
        //            =======================
        if (numD > 0 /*  && SuperBigFamView.theLeafCollection['A0P1'] */) {
            console.log(
                "Calling the repositionThisPersonAndTheirDescendants peeps from repositionLeaves function if numD > 0 to find A0dimensions "
            );
            A0dimensions = repositionThisPersonAndTheirDescendants("A0", 1, 1, "C");
            console.log("A0dimensions in function", A0dimensions);
        } else {
            SuperBigFamView.theLeafCollection["A0"]["x"] = 1;
            SuperBigFamView.theLeafCollection["A0"]["y"] = 1;
            A0dimensions = { width: thisBoxWidth, height: vBoxHeight, genDims: [0] };
        }

        //             ===========================
        // SIB logic - POSITION PRIMARY's SIBLINGS ... AND THEIR DESCENDANTS, IF D > 0 according to NumDs stepper value
        //             ===========================
        if (numA > 0) {
            let thePrimarySiblings = thePeopleList[SuperBigFamView.theLeafCollection["A0"].Id]._data["Siblings"];
            if (thePrimarySiblings && thePrimarySiblings.length > 0) {
                // do nothing, the Siblings have already been assembled ...
            } else {
                // but ... just in case the Primary person forgot who they were .. we might need to re-assemble the sibling gang
                assembleSiblingsFor([SuperBigFamView.theLeafCollection["A0"].Id]);
            }

            repositionThisPersonsSiblingsAndTheirDescendants("A0", 1, 1, "C", A0dimensions);
        }

        //             ============================
        // ANC logic - POSITION PRIMARY's ANCESTORS ... AND THEIR SIBLINGS & SIBLINGS FAMILIES, IF  A > 0 according to NumAs stepper value, and C >= 0 for Cousins stepper
        //             ============================
        let Adimensions = [{ width: 0, height: 0, genDims: [0] }, A0dimensions]; // one entry per Ahnentafel Ancestor's cluster
        let AmaxHeights = [A0dimensions.height]; // one entry per numA generation
        if (numA > 0) {
            // STEP 1 : Position each Ancestor Cluster unto itself (all will have default starting x,y of 1,1 ) - based on Ahnentafel # for each Ancestor to keep them straight
            for (let a = 1; a <= numA; a++) {
                // a = Ancestor Generation number (not to be confused with ahNum later on ...)
                let thisMaxHeight = 0;
                for (let ahNum = 2 ** a; ahNum < 2 ** (a + 1); ahNum++) {
                    let theseDimensions = repositionThisAncestorAndTheirSiblingsFamily(ahNum);
                    // console.log("Repositioning this anc: ", ahNum, "Dimensions:", theseDimensions);
                    thisMaxHeight = Math.max(thisMaxHeight, theseDimensions.height);
                    Adimensions[ahNum] = theseDimensions;
                }
                AmaxHeights[a] = thisMaxHeight;
            }

            // STEP 2 : Position each cluster along the primary axis, left or right of it based on paternal vs maternal lines
            let thisY = 0;
            let cuzHeight = 0;
            if (numC > 1) {
                cuzHeight = vBoxHeight * numC;
            }
            for (let a = 1; a <= numA; a++) {
                // for each Ancestor Generation ...
                let thisMaxHeight = Math.max(vBoxHeight, AmaxHeights[a], cuzHeight);
                if (a == numA) {
                    thisMaxHeight = vBoxHeight;
                }
                if (SuperBigFamView.displayINLAWS > 0) {
                    thisMaxHeight += vBoxHeight;
                }
                thisY -= thisMaxHeight;
                let thisMidWayANum = 2 ** a * 1.5;

                // Maternal Ancestors at this Generation level go RIGHT +ve ly
                let thisX = SuperBigFamView.theLeafCollection["A0"]["x"] + thisBoxWidth / 2;
                if (a > 1) {
                    thisX += thisBoxWidth / 4;
                }
                for (let ahNum = thisMidWayANum; ahNum < 2 ** (a + 1); ahNum++) {
                    if (ahNum % 2 == 0) {
                        thisX += Adimensions[ahNum].width - thisBoxWidth;
                        if (a == numA) {
                            // we're at the top level, in which case, we want to be centred above the family below
                            thisX = Math.max(
                                thisX,
                                Adimensions[ahNum / 2].X +
                                    (((ahNum / 2) % 2 == 1 ? 1 : -1) * Adimensions[ahNum / 2].width) / 2
                            );
                        }
                    }
                    repositionThisAncestorsCluster(ahNum, thisX, thisY);
                    Adimensions[ahNum].X = thisX;
                    Adimensions[ahNum].Y = thisY;
                    // console.log(
                    //     "REPOSITIONING ANCESTOR AhnenNum #" + ahNum + " @ (" + thisX + " , " + thisY + ")",
                    //     "[ " + Adimensions[ahNum].width + " x " + Adimensions[ahNum].height + " ]"
                    // );
                    if (ahNum % 2 == 0) {
                        thisX += thisBoxWidth;
                    } else {
                        thisX += Adimensions[ahNum].width + thisBoxWidth / 2;
                    }
                }

                // Paternal Ancestors at this Generation level go LEFT -ve ly
                thisX = SuperBigFamView.theLeafCollection["A0"]["x"] + 0 - thisBoxWidth / 2;
                if (a > 1) {
                    thisX -= thisBoxWidth / 4;
                }
                for (let ahNum = thisMidWayANum - 1; ahNum >= 2 ** a; ahNum--) {
                    if (ahNum % 2 == 1) {
                        thisX -= Adimensions[ahNum].width - thisBoxWidth;
                        if (a == numA) {
                            // we're at the top level, in which case, we want to be centred above the family below
                            thisX = Math.min(
                                thisX,
                                Adimensions[(ahNum - 1) / 2].X +
                                    ((((ahNum - 1) / 2) % 2 == 1 ? 1 : -1) * Adimensions[(ahNum - 1) / 2].width) / 2
                            );
                        }
                    }
                    repositionThisAncestorsCluster(ahNum, thisX, thisY);
                    Adimensions[ahNum].X = thisX;
                    Adimensions[ahNum].Y = thisY;
                    // console.log(
                    //     "REPOSITIONING ANCESTOR AhnenNum #" + ahNum + " @ (" + thisX + " , " + thisY + ")",
                    //     "[ " + Adimensions[ahNum].width + " x " + Adimensions[ahNum].height + " ]"
                    // );

                    if (ahNum % 2 == 1) {
                        thisX -= thisBoxWidth;
                    } else {
                        thisX -= Adimensions[ahNum].width + thisBoxWidth / 2;
                    }
                }
            }
        }

        // HIDE THE CHUNKS THAT ARE NOT NEEDED

        // Extraneous A levels above the numA
        for (let a = numA + 1; a < 10; a++) {
            hideThisChunk("A" + a, theLeaves);
        }

        // Extraneous C levels above the numC
        for (let a = numC; a < 10; a++) {
            hideThisChunk("C" + a, theLeaves);
        }

        // Extraneous D levels below the numD
        for (let a = numD + 1; a < 10; a++) {
            hideThisChunk("D" + a, theLeaves);
        }

        // Just Kidding chunks, where people who had no where else to go were thrown
        hideThisChunk("JK", theLeaves);

        // SIBLINGS, if no Ancestors (ie - no parents to hang them on)
        if (numA == 0) {
            hideThisChunk("S", theLeaves);
        }

        // Extraneous In-Laws
        for (let a = 1; a < 10; a++) {
            // Parents in law - need an IF around this one because there is a CHECKBOX that should determine whether they should be shown or hidden
            if (SuperBigFamView.displayINLAWS == 0) {
                hideThisCode("P" + a + "R", theLeaves);
            }

            // Partners of Partners - oust 'em, unless we add a Setting for this to make the Super Big even Super Bigger
            hideThisCode("P" + a + "P", theLeaves);

            // Siblings of Partners - oust 'em, unless we add a Setting for this to make the Super Big even Super Bigger
            hideThisCode("P" + a + "S", theLeaves);

            // Kids of Partners - oust 'em, unless we add a Setting for this to make the Super Big even Super Bigger - these would be kids from OTHER marriages
            hideThisCode("P" + a + "K", theLeaves);
        }

        SuperBigFamView.Adimensions = Adimensions;
    }

    function hideThisChunk(chunkPrefix, theLeaves) {
        // console.log("HIDING THE CHUNK with ", chunkPrefix);
        for (let l in theLeaves) {
            let thisLeaf = theLeaves[l];
            if (thisLeaf.Chunk.indexOf(chunkPrefix) > -1) {
                let thisLeafDIV = document.getElementById("wedgeInfo-" + thisLeaf.Code);
                if (thisLeafDIV && thisLeafDIV.parentNode && thisLeafDIV.parentNode.parentNode) {
                    thisLeafDIV.parentNode.parentNode.style.display = "none";
                } else {
                    console.log("Cannot HIDE the leaf:", chunkPrefix, thisLeaf.Code);
                }
            }
        }
    }

    function hideThisCode(codeString, theLeaves) {
        // console.log("HIDING THE CODES that match ", codeString);
        for (let l in theLeaves) {
            let thisLeaf = theLeaves[l];
            if (thisLeaf.Code.indexOf(codeString) > -1) {
                let thisLeafDIV = document.getElementById("wedgeInfo-" + thisLeaf.Code);
                if (thisLeafDIV && thisLeafDIV.parentNode && thisLeafDIV.parentNode.parentNode) {
                    thisLeafDIV.parentNode.parentNode.style.display = "none";
                } else {
                    console.log("Cannot HIDE the leaf:", codeString, thisLeaf.Code);
                }
            }
        }
    }

    function repositionThisAncestorsCluster(ahnenNum, thisX, thisY) {
        // let align = ahNum % 2 == 0 ? "R" : "L";
        // let numA = SuperBigFamView.numAncGens2Display;
        // let numD = SuperBigFamView.numDescGens2Display;

        let bits = (ahnenNum >>> 0).toString(2); // converts the ahnenNum into a Binary number (0s and 1s), where the first digit = Primary person, and the subsequent 0s are RM ('rent males = fathers) and 1s are RF ('rent females = mothers)
        let newCode = bits.replace("1", "A").replace(/0/g, "RM").replace(/1/g, "RF").replace("A", "A0");
        let thisLeaf = SuperBigFamView.theLeafCollection[newCode];

        if (!thisLeaf) {
            return;
        }
        // console.log("REPOSITIONING this Ancestor # ", ahnenNum, newCode, "to", thisX, thisY);
        let dx = thisX - thisLeaf.x;
        let dy = thisY - thisLeaf.y;
        thisLeaf.x = thisX;
        thisLeaf.y = thisY;

        for (let l in SuperBigFamView.theLeafCollection) {
            let leaf = SuperBigFamView.theLeafCollection[l];
            if (leaf && leaf.x && leaf.Code != newCode && leaf.Code.indexOf(newCode) > -1) {
                // console.log("--> (B4 ", l, leaf.Code, " @ ", leaf.x, ",", leaf.y, ")");
                leaf.x += dx;
                leaf.y += dy;
                // console.log("--> NOW: ", l, leaf.Code, " @ ", leaf.x, ",", leaf.y);
            }
        }
    }

    function repositionThisPersonsCluster(newCode, thisX, thisY) {
        // let align = ahNum % 2 == 0 ? "R" : "L";
        // let numA = SuperBigFamView.numAncGens2Display;
        // let numD = SuperBigFamView.numDescGens2Display;

        let thisLeaf = SuperBigFamView.theLeafCollection[newCode];

        if (!thisLeaf) {
            return;
        }
        // console.log("REPOSITIONING this Person # ", newCode, "to", thisX, thisY);
        let dx = thisX - thisLeaf.x;
        let dy = thisY - thisLeaf.y;
        thisLeaf.x = thisX;
        thisLeaf.y = thisY;

        for (let l in SuperBigFamView.theLeafCollection) {
            let leaf = SuperBigFamView.theLeafCollection[l];
            if (leaf && leaf.x && leaf.Code != newCode && leaf.Code.indexOf(newCode) > -1) {
                leaf.x += dx;
                leaf.y += dy;
                if (leaf.x == 0) {
                    leaf.x = 1;
                }
                console.log("--> ", l, leaf.Code, " @ ", leaf.x, ",", leaf.y);
            }
        }
    }

    function repositionThisAncestorAndTheirSiblingsFamily(ahnenNum) {
        let x = 1;
        let y = 1;
        let align = ahnenNum % 2 == 0 ? "R" : "L";
        let numA = SuperBigFamView.numAncGens2Display;
        let numD = SuperBigFamView.numDescGens2Display;
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide

        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; // 440 ; //currentMaxHeight4Box;//SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        let thisBoxWidth = 1.0 * SuperBigFamView.currentSettings["general_options_boxWidth"]; // 400

        let bits = (ahnenNum >>> 0).toString(2); // converts the ahnenNum into a Binary number (0s and 1s), where the first digit = Primary person, and the subsequent 0s are RM ('rent males = fathers) and 1s are RF ('rent females = mothers)
        let newCode = bits.replace("1", "A").replace(/0/g, "RM").replace(/1/g, "RF").replace("A", "A0");
        let thisLeaf = SuperBigFamView.theLeafCollection[newCode];
        let thisWidth = thisBoxWidth; // start with the width of the ancestor by themself
        let thisHeight = vBoxHeight; // likewise the height

        if (thisLeaf) {
            thisLeaf.y = 0 - vBoxHeight;
            thisLeaf.x = thisBoxWidth * ahnenNum;

            let thisLeafPerson = thePeopleList[thisLeaf.Id];

            if (thisLeafPerson) {
                // let's look to see if we have extra partners
                if (thisLeafPerson._data.Spouses && thisLeafPerson._data.Spouses.length > 1 /*  && ahnenNum < 4 */) {
                    for (let i = 0; i < thisLeafPerson._data.Spouses.length; i++) {
                        let thisLeafExtraPartnerCode = newCode + "P" + (i + 1);
                        let thisLeafExtraPartner = SuperBigFamView.theLeafCollection[thisLeafExtraPartnerCode];
                        if (thisLeafExtraPartner) {
                            let thisLeafExtraPartnerDIV = document.getElementById(
                                "wedgeInfo-" + thisLeafExtraPartnerCode
                            );
                            let thisLeafExtraPartnerPerson = thePeopleList[thisLeafExtraPartner.Id];
                            if (
                                thisLeafExtraPartnerPerson &&
                                thisLeafExtraPartnerPerson._data.Children &&
                                thisLeafExtraPartnerPerson._data.Children.length > 0
                            ) {
                                // OK ... we need to investigate more here to make sure they are the Ancestor's children too !

                                // BUT ... assuming it's a go - then we can give them some (x,y) coords and move along
                                thisLeafExtraPartner.x = thisLeaf.x + thisBoxWidth * (2 * (ahnenNum % 2) - 1);
                                thisLeafExtraPartner.y = thisLeaf.y;
                                thisWidth += thisBoxWidth;
                                repositionThisSpousesFamily(thisLeafExtraPartner, thisLeafExtraPartnerCode);
                            } else {
                                // No children - then - no show (unless we're into Cousin mode of some flavour)

                                if (
                                    thisLeafExtraPartnerDIV &&
                                    thisLeafExtraPartnerDIV.parentNode &&
                                    thisLeafExtraPartnerDIV.parentNode.parentNode
                                ) {
                                    thisLeafExtraPartnerDIV.parentNode.parentNode.style.display = "none";
                                }
                            }
                        }
                    }
                }

                // OK .... so now let's add their Siblings
                if (numC > 0) {
                    let newDims = repositionThisPersonsSiblingsAndTheirDescendants(
                        newCode,
                        thisLeaf.x,
                        thisLeaf.y,
                        ahnenNum % 2 == 0 ? "L" : "R"
                    );
                    thisWidth = newDims.width - thisBoxWidth; // full width - MINUS the width for the ancestor themself (already counted above)
                }
            }
        } else {
            console.log("WARNING - NO LEAF PERSON or THIS LEAF - ahnenNumber ", ahnenNum);
            return { width: 0, height: 0, genDims: [0] };
        }

        console.log("Bit: ", ahnenNum, bits, newCode);
        return { width: thisWidth, height: thisHeight, genDims: [0] };
    }

    function repositionThisSpousesFamily(thisLeaf, thisCode) {
        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; //330 ; //currentMaxHeight4Box;//SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        let thisBoxWidth = 1.0 * SuperBigFamView.currentSettings["general_options_boxWidth"];

        if (SuperBigFamView.theLeafCollection[thisCode + "RM"]) {
            SuperBigFamView.theLeafCollection[thisCode + "RM"].x = thisLeaf.x - thisBoxWidth / 2;
            SuperBigFamView.theLeafCollection[thisCode + "RM"].y = thisLeaf.y - vBoxHeight;
        }
        if (SuperBigFamView.theLeafCollection[thisCode + "RF"]) {
            SuperBigFamView.theLeafCollection[thisCode + "RF"].x = thisLeaf.x + thisBoxWidth / 2;
            SuperBigFamView.theLeafCollection[thisCode + "RF"].y = thisLeaf.y - vBoxHeight;
        }
    }

    function repositionThisPersonsSiblingsAndTheirDescendants(code, x, y, align = "C", primarysDims = []) {
        console.log("repositionThisPersonsSiblingsAndTheirDescendants : ", code, x, y, align, primarysDims);
        let numA = SuperBigFamView.numAncGens2Display;
        let numD = SuperBigFamView.numDescGens2Display;
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide
        let thisDnum = 0;
        let thisCnum = 0;
        let thisAnum = 0;
        let thisLeaf = null;
        let shortListPs = []; // used to temporarily hold collections of codes
        let shortListKs = []; // used to temporarily hold collections of codes
        let thePsByID = {}; // hold the Partners by ID # for quick access
        let theKsByID = {}; // hold the Kids by ID # for quick access
        let thisLeafPerson = null;
        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; //330 ; //currentMaxHeight4Box;//SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        let thisBoxWidth = 1.0 * SuperBigFamView.currentSettings["general_options_boxWidth"];
        let doSiblings = true;
        let thisChunkType = "0";
        let commentPreFix = " ".repeat(2 * code.length) + "repoPSs+Ds : ";

        
        if (y == 0) {
            y = 1;
        }

        if (code == "A0") {
            thisLeaf = SuperBigFamView.theLeafCollection["A0"];
        } else {
            thisLeaf = SuperBigFamView.theLeafCollection[code];

            if (thisLeaf.Chunk.indexOf("D") > -1) {
                thisDnum = thisLeaf.Chunk.substring(thisLeaf.Chunk.indexOf("D") + 1);
            }
            if (thisLeaf.Chunk.indexOf("C") > -1) {
                thisCnum = thisLeaf.Chunk.substring(thisLeaf.Chunk.indexOf("C") + 1);
            }
            if (thisLeaf.Chunk.indexOf("A") > -1) {
                thisAnum = thisLeaf.Chunk.substring(thisLeaf.Chunk.indexOf("A") + 1);
                if (thisAnum >= numA) {
                    doSiblings = false;
                }
            }
        }

        console.log(commentPreFix + code + " : " + thisLeaf.Chunk, x, y, align);
        thisChunkType = thisLeaf.Chunk.substring(1);
        console.log(
            "THIS: ",
            code,
            "chunk:",
            thisLeaf.Chunk,
            "thisChunkType",
            thisChunkType,
            "A:",
            thisAnum,
            "C:",
            thisCnum,
            "D:",
            thisDnum,
            "Settings:A / D / C = ",
            numA,
            numD,
            numC
        );

        if (thisChunkType == "0") {
            // this means that it's either an A0 or an S0 (Primary Person or one of their Siblings)
            // therefore - don't care about the Cousins level - we only care about Descendants
            numC = 0;
        } else {
            // conversely ... we ONLY care about Cousins (Aunts/Uncles, 1st C, 2ndC, etc...) and does not matter a hoot what the Descendants # is
            numD = 0;
        }

        if (thisLeaf) {
            thisLeafPerson = thePeopleList[thisLeaf.Id];
        } else {
            console.log("WARNING - NO LEAF PERSON or THIS LEAF");
        }

        console.log("The current location of " + code + " is ", thisLeaf.x, thisLeaf.y);

        let theSibs = thePeopleList[thisLeaf.Id]._data.Siblings;
        if (!theSibs || theSibs.length == 0) {
            assembleSiblingsFor([thisLeaf.Id]);
        }
        let thisBirthOrder = thePeopleList[thisLeaf.Id]._data.birthOrder;
        console.log("theSibs = ", thisBirthOrder, theSibs, thisLeafPerson);

        // IF D = 0 THEN SHOW SIBS NEXT TO PRIME
        // IF D > 0 THEN SHOW SIBS BEFORE AND AFTER LARGE A0 WIDE BERTH (.width in A0dimensions object)

        // FIND the Partner's .x coordinate so we can space the other half of siblings past him/her
        // console.log("NEED to check for Spouses: ", thisLeafPerson._data.Spouses);
        let rightSideMaxX = thisLeaf.x;
        let leftSideMinX = thisLeaf.x;
        let minX = thisLeaf.x;
        let maxX = thisLeaf.x;

        for (let s = 0; numD > 0 && s < thisLeafPerson._data.Spouses.length; s++) {
            let thisLeafPartner = SuperBigFamView.theLeafCollection[code + "P" + (s + 1)];
            if (thisLeafPartner && thisLeafPartner.x) {
                rightSideMaxX = Math.max(rightSideMaxX, thisLeafPartner.x);
                leftSideMinX = Math.min(leftSideMinX, thisLeafPartner.x);
                repositionThisSpousesFamily(thisLeafPartner, code + "P" + (s + 1));
            }
        }
        maxX = Math.max(maxX, rightSideMaxX);
        minX = Math.min(minX, leftSideMinX);

        // let SpousesMarriageArray = [];
        // let thisSpouseObj = thisLeafPerson._data.Spouses[s];
        // SpousesMarriageArray.push(thisSpouseObj.MarriageDate + "|" + s + "|" + thisSpouseObj.Id);

        // NOTE:  To-DO --> RE=DO this LOOP so that it goes through BIRTH ORDER - starting from Primary and working out both ways from the centre outwards
        // and taking into account the width of each siblings full tree underneath each time.
        // BONUS POINTS if you can get it to only care about the specific depth each sibling gets to in relation to the previous one's ...

        let sibBOrderArray = [];
        for (let s = 0; doSiblings == true && s < theSibs.length; s++) {
            let thisBOrder = "000" + theSibs[s].birthOrder;

            sibBOrderArray.push(thisBOrder.substring(thisBOrder.length - 3) + "|" + s);
        }
        sibBOrderArray = sibBOrderArray.sort();
        console.log("sibBOrderArray", sibBOrderArray);

        // PASS 1: Going through the Birth Sibling Order (bs) going forward in time from youngest to oldest
        // --> this will be used for ALL siblings if the alignment is RIGHT - OR for those who are born AFTER the primary if alignment is CENTRE (no LEFTIES allowed)
        if (numD > 0) {
            // minX -= thisBoxWidth;
            // maxX += thisBoxWidth;
            maxX = primarysDims.maxX - thisBoxWidth;
            if (code == "A0") {maxX = primarysDims.maxX - thisBoxWidth / 2;  }
            minX = primarysDims.minX - thisBoxWidth / 2;
        } else if (numC > 0) {
            minX -= thisBoxWidth / 2;
            maxX += thisBoxWidth / 2;
        }
        for (let bs = 0; doSiblings == true && align != "L" && bs < theSibs.length; bs++) {
            const s = 1 * sibBOrderArray[bs].substring(sibBOrderArray[bs].indexOf("|") + 1);
            console.log("bs, element , s:", bs, sibBOrderArray[bs], s);
            const thisSib = thePeopleList[theSibs[s].Id];
            let thisSibCode = code + "S" + make2Digit(s + 1);
            let thisLeafSib = SuperBigFamView.theLeafCollection[thisSibCode];
            if (thisLeafSib) {
                // console.log(
                //     "LEAF SIB x @ ",
                //     theSibs[s].birthOrder,
                //     ":",
                //     thisLeafSib["x"],
                //     " =",
                //     thisLeaf.x,
                //     " -",
                //     thisBoxWidth,
                //     " * ( ",
                //     thisBirthOrder,
                //     " -",
                //     theSibs[s].birthOrder,
                //     ")"
                // );

                let dxBirthOrder = thisBirthOrder < theSibs[s].birthOrder ? 1 : 0;

                if (align == "C") {
                    if (theSibs[s].birthOrder < thisBirthOrder) {
                        continue; // skip ahead to the next value
                    } else {
                        // USE # OF SPOUSES / AND FIND X OF FURTHEST SPOUSE TO ADD EXTRA X IF NEEDED
                        thisLeafSib["x"] = maxX + thisBoxWidth /* * (theSibs[s].birthOrder - thisBirthOrder) */;
                    }
                } else if (align == "L") {
                    console.log("You should NOT be seeing this message!");
                } else if (align == "R") {
                    thisLeafSib["x"] = maxX + thisBoxWidth /* * (theSibs[s].birthOrder - dxBirthOrder) */;
                }
                thisLeafSib["y"] = thisLeaf.y;

                if (numD > 0 || numC > 0) {
                    let sibFamDim = repositionThisPersonAndTheirDescendants(
                        thisSibCode,
                        thisLeafSib["x"],
                        thisLeafSib["y"],
                        "C"
                    );
                    console.log("sibFamDim: ", sibFamDim);
                    maxX += sibFamDim.width;
                    // if (numD > 0) {maxX +=  thisBoxWidth / 2;}
                }
                maxX = Math.max(maxX, thisLeafSib["x"]);
                minX = Math.min(minX, thisLeafSib["x"]);
                console.log(thisSibCode, "@", thisLeafSib["x"]);
            }
        }

        // PASS 2: Going through the Birth Sibling Order (bs) going backwards in time from oldest to youngest
        // --> this will be used for ALL siblings if the alignment is LEFT - OR for those who are born BEFORE the primary if alignment is CENTRE (no RIGHTIES)
        if (numD == 0 && thisCnum == 0) {
            minX -= thisBoxWidth / 2;
        }

        for (let bs = theSibs.length - 1; doSiblings == true && align != "R" && bs >= 0; bs--) {
            const s = 1 * sibBOrderArray[bs].substring(sibBOrderArray[bs].indexOf("|") + 1);
            console.log("bs, element , s:", bs, sibBOrderArray[bs], s);
            const thisSib = thePeopleList[theSibs[s].Id];
            let thisSibCode = code + "S" + make2Digit(s + 1);
            let thisLeafSib = SuperBigFamView.theLeafCollection[thisSibCode];
            if (thisLeafSib) {
                // console.log(
                //     "LEAF SIB x @ ",
                //     theSibs[s].birthOrder,
                //     ":",
                //     thisLeafSib["x"],
                //     " =",
                //     thisLeaf.x,
                //     " -",
                //     thisBoxWidth,
                //     " * ( ",
                //     thisBirthOrder,
                //     " -",
                //     theSibs[s].birthOrder,
                //     ")"
                // );

                let dxBirthOrder = thisBirthOrder < theSibs[s].birthOrder ? 1 : 0;

                if (align == "C") {
                    if (theSibs[s].birthOrder < thisBirthOrder) {
                        thisLeafSib["x"] = minX - thisBoxWidth / 2 /* * (thisBirthOrder - theSibs[s].birthOrder) */;                        
                    } else {
                        continue; // skip along
                    }
                } else if (align == "L") {
                    if(bs == theSibs.length - 1) {minX += thisBoxWidth / 2;}
                    thisLeafSib["x"] = minX; /* * (theSibs.length + 1 - theSibs[s].birthOrder + dxBirthOrder) */
                    if (thisLeafSib["x"] == 200) {
                        thisLeafSib["x"] = 201;
                    } 
                    console.log(commentPreFix + code + " : " + thisSibCode, minX);
                } else if (align == "R") {
                    // USE # OF SPOUSES / AND FIND X OF FURTHEST SPOUSE TO ADD EXTRA X IF NEEDED
                    console.log("YOu should NOT be SEEING this buddy!");
                }

                thisLeafSib["y"] = thisLeaf.y;

                if (numD > 0 || numC > 0) {
                    let origSibX = thisLeafSib["x"];
                    let sibFamDim = repositionThisPersonAndTheirDescendants(
                        thisSibCode,
                        thisLeafSib["x"],
                        thisLeafSib["y"],
                        "C"
                    );
                    console.log("sibFamDim: ", sibFamDim);
                    // minX = minX - sibFamDim.width - thisBoxWidth;
                    console.log(commentPreFix + code + " : " + thisSibCode, sibFamDim);
                    minX = Math.min(sibFamDim.minX, thisLeafSib["x"]);
                    if (sibFamDim.maxX > origSibX + thisBoxWidth) {
                        console.log(
                            "I THINK you should reposition this Persons Cluster ",
                            thisSibCode,
                            origSibX,
                            thisLeafSib["x"],
                            sibFamDim
                        );
                        console.log(
                            commentPreFix + code + " : " + thisSibCode,
                            "adjusted to:",
                            thisLeafSib["x"] - (sibFamDim.maxX - (origSibX + thisBoxWidth / 2))
                        );
                        repositionThisPersonsCluster(
                            thisSibCode,
                            thisLeafSib["x"] - (sibFamDim.maxX - (origSibX + thisBoxWidth / 2)),
                            thisLeafSib["y"]
                        );
                        minX -= (sibFamDim.maxX - (origSibX + thisBoxWidth / 2));//origSibX + thisBoxWidth / 2;
                    }
                }

                if (numC > 0) {
                    // minX -= thisBoxWidth / 2;
                } else if (numD == 0) {
                    minX -= thisBoxWidth;                    
                }
                

                maxX = Math.max(maxX, thisLeafSib["x"]);
                if (code == "A0") {
                    minX = Math.min(minX, thisLeafSib["x"]) ;
                } else {
                    minX = Math.min(minX, thisLeafSib["x"]) - thisBoxWidth / 2;
                }
                
                console.log(thisSibCode, "@", thisLeafSib["x"], thisLeafSib["y"]);
            }
        }

        // console.log("Repositioning this anc ", code, "from", minX, "-", maxX);
        return {
            width: maxX - minX + thisBoxWidth,
            height: vBoxHeight,
            genDims: [0],
            minX: minX,
            maxX: maxX + thisBoxWidth,
        };
    }

    function repositionThisPersonAndTheirDescendants(code, x, y, align = "C") {
        let numD = SuperBigFamView.numDescGens2Display;
        let numC = SuperBigFamView.numCuzGens2Display; // num Cousins - going wide

        let thisDnum = -1;
        let thisCnum = -1;
        let thisLeaf = null;
        let shortListPs = []; // used to temporarily hold collections of codes
        let shortListKs = []; // used to temporarily hold collections of codes
        let thePsByID = {}; // hold the Partners by ID # for quick access
        let theKsByID = {}; // hold the Kids by ID # for quick access
        let thisLeafPerson = null;
        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; //330 ; //currentMaxHeight4Box;//SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        let thisBoxWidth = 1.0 * SuperBigFamView.currentSettings["general_options_boxWidth"];
        if (y == 0) {
            y = 1;
        }
        let commentPreFix = " ".repeat(2 * code.length) + "repoP+Ds : ";
        if (code == "A0") {
            thisLeaf = SuperBigFamView.theLeafCollection["A0"];
        } else {
            thisLeaf = SuperBigFamView.theLeafCollection[code];
            if (thisLeaf.Chunk.indexOf("D") > -1) {
                thisDnum = thisLeaf.Chunk.substring(thisLeaf.Chunk.indexOf("D") + 1);
            }
            if (thisLeaf.Chunk.indexOf("C") > -1) {
                thisCnum = thisLeaf.Chunk.substring(thisLeaf.Chunk.indexOf("C") + 1);
                console.log(
                    "line 3692 : chunk:",
                    thisLeaf.Chunk,
                    "cNum:",
                    thisCnum,
                    "index:",
                    thisLeaf.Chunk.indexOf("C")
                );
            }
        }
        console.log(commentPreFix + code + " : " + thisLeaf.Chunk,x,y);
        // ASSIGN Y coordinate for THIS PERSON ...  the X coordinate will come later, after spouses and kids have been added
        thisLeaf["y"] = y;

        let dims = { width: thisBoxWidth, height: vBoxHeight, genDims: [0], minX: x, maxX: x };

        // FLIGHT PRE-CHECK : IF we are at the END OF THE LINE for DESCENDANTS, then JUST RETURN NOW and BE DONE WITH IT
        if (thisDnum >= numD || (thisCnum > -1 && thisCnum >= numC - 1)) {
            // we are already at the maximum level for Descendants - so - we just need to send back the default dimensions for a single person box
            // otherwise, you need the rest of the function to figure out how wide and high the person + spouse(s) + kid(s) will be

            thisLeaf["x"] = x - thisBoxWidth / 2;
            thisLeaf["y"] = y;

            // console.log(
            //     "returning (no repositioning) ",
            //     code,
            //     " with Chunk ",
            //     thisLeaf.Chunk,

            //     "numD",
            //     numD,
            //     "thisDnum",
            //     thisDnum,
            //     "numC",
            //     numC,
            //     "thisCnum",
            //     thisCnum,
            //     "x = " + x,
            //     "thisLeaf @ ",
            //     thisLeaf["x"],
            //     thisLeaf["y"],
            //     thisLeaf
            // );
            
            console.log(
                commentPreFix + code + " : " + thisLeaf.Chunk,
                "( " + thisLeaf.x + " , " + thisLeaf.y + " )",
                dims
            );
            return dims;
        }

        // STEP 0 : LET'S ZERO IN on the PARTNERS and KIDS of THIS PERSON & create some SHORT LISTS

        // OK - let's build the shortlist of Partners and Kids for ThisPerson
        let nextDChunkCode = "A0D1";
        if (thisLeaf.Chunk == "S0") {
            nextDChunkCode = "S0D1";
        } else if (code != "A0") {
            if (thisDnum > 0) {
                nextDChunkCode =
                    thisLeaf.Chunk.substring(0, thisLeaf.Chunk.indexOf("D")) + "D" + (thisDnum * 1.0 + 1.0);
            } else if (thisCnum >= 0) {
                nextDChunkCode =
                    thisLeaf.Chunk.substring(0, thisLeaf.Chunk.indexOf("C")) + "C" + (thisCnum * 1.0 + 1.0);
            }
        }
        // console.log(
        //     "repositioning ",
        //     code,
        //     " with Chunk ",
        //     thisLeaf.Chunk,
        //     "nextChunk:",
        //     nextDChunkCode,
        //     "numD",
        //     numD,
        //     "thisDnum",
        //     thisDnum,
        //     "numC",
        //     numC,
        //     "thisCnum",
        //     thisCnum,

        //     "orig x = " + x,
        //     "using width x height of ",
        //     thisBoxWidth,
        //     "x",
        //     vBoxHeight
        // );
        thePsByID[0] = {
            code: code + "P0",
            Id: 0,
            order: 0,
            mDate: "0000-00-00",
            bDate: "0000-00-00",
            bOrderMax: 0,
            kidsList: [],
        };
        if (
            SuperBigFamView.theChunkCollection[nextDChunkCode] &&
            SuperBigFamView.theChunkCollection[nextDChunkCode].CodesList
        ) {
            for (let c = 0; c < SuperBigFamView.theChunkCollection[nextDChunkCode].CodesList.length; c++) {
                let thisLeafCode = SuperBigFamView.theChunkCollection[nextDChunkCode].CodesList[c];
                if (thisLeafCode.indexOf(code + "P") > -1) {
                    shortListPs.push(thisLeafCode);
                    let thisPid = SuperBigFamView.theLeafCollection[thisLeafCode].Id;
                    let thisPobj = {
                        code: thisLeafCode,
                        Id: thisPid,
                        order: 0,
                        mDate: "9999-00-00",
                        bDate: "0000-00-00",
                        bOrderMax: 0,
                        kidsList: [],
                    };
                    thePsByID[thisPid] = thisPobj;
                    // Assign the Partner's Y COORDINATE to be the same as THIS PERSON
                    SuperBigFamView.theLeafCollection[thisLeafCode]["y"] = y;
                } else if (thisLeafCode.indexOf(code + "K") > -1) {
                    shortListKs.push(thisLeafCode);
                    let thisKid = SuperBigFamView.theLeafCollection[thisLeafCode].Id;
                    let thisKobj = {
                        code: thisLeafCode,
                        Id: thisKid,
                        order: 0,
                        bDate: "9999-00-00",
                    };

                    theKsByID[thisKid] = thisKobj;
                }
            }
            // console.log("Looking for PARTNERS: ", shortListPs, " and KIDS: ", shortListKs);
        }

        // Define Kids VBoxHeight (based on whether we need to add an extra vBoxHeight to account for in-laws)
        let kidsVBoxHeight = vBoxHeight * (1.0 + 1.0 * SuperBigFamView.displayINLAWS);
        if (thisDnum == numD - 1) {
            kidsVBoxHeight = vBoxHeight;
        }

        if (thisCnum > -1 && thisCnum == numC - 2) {
            kidsVBoxHeight = vBoxHeight;
        }
        // PLAN TO COMPLETELY POSITION the person represented by CODE, plus all their spouses and descendants,

        // (STEP 1) ORDER Spouses by marriage date, undated marriages go at the end - if multiple undated marriages, optionally order by birth order of children, and leave slot for no-spouse (to left)

        // FIND the full details on the PERSON here (thisLeaf) whose partners and kids we're about to explore
        if (thisLeaf) {
            thisLeafPerson = thePeopleList[thisLeaf.Id];
        } else {
            console.log("WARNING - NO LEAF PERSON or THIS LEAF");
        }

        // GO through the PARTNERS and add the MARRIAGE DATES
        for (let sp = 0; sp < thisLeafPerson._data.Spouses.length; sp++) {
            const thisSpouse = thisLeafPerson._data.Spouses[sp];
            // console.log("FOUND marriage for ", thisSpouse.Id, "on", thisSpouse.MarriageDate);
            if (thisSpouse.Id && thePsByID[thisSpouse.Id]) {
                if (thisSpouse.MarriageDate == "0000-00-00") {
                    thePsByID[thisSpouse.Id].mDate = "9999-99-99";
                } else {
                    thePsByID[thisSpouse.Id].mDate = thisSpouse.MarriageDate;
                }
            }
        }

        // GO through the KIDS and add the BIRTH DATES and TIE them to a specific PARTNER for ordering later
        for (let ch = 0; ch < thisLeafPerson._data.Children.length; ch++) {
            const thisChild = thisLeafPerson._data.Children[ch];
            // console.log("FOUND birth for ", thisChild.Id, "on", thisChild.bDate);
            if (thisChild.Id && theKsByID[thisChild.Id]) {
                theKsByID[thisChild.Id].bDate = thisChild.bDate;
                let thisChildsCoParentID = 0; // default  - if the child doesn't have a co-parent, then use the "null" co-parent, the Spouse 0 previously added
                if (thisChild.coParent && thePsByID[thisChild.coParent]) {
                    thisChildsCoParentID = thisChild.coParent;
                }
                if (thePsByID[thisChildsCoParentID].bDate == "0000-00-00") {
                    thePsByID[thisChildsCoParentID].bDate = thisChild.bDate;
                }
                thePsByID[thisChildsCoParentID].bOrderMax = Math.max(
                    thePsByID[thisChildsCoParentID].bOrderMax,
                    thisChild.birthOrder
                );
                thePsByID[thisChildsCoParentID].kidsList.push(thisChild.Id);
            }
        }

        // USE a simple  SORT to order by MARRIAGE DATES
        let orderedPartners = []; // concatenate their Marriage Date + BirthDate of first Child , then for undated marriages, the birth date will sort them
        let orderedKids = [];

        // also + tack on their ID at the end, not part of sort, but way to link back to original record afterwards

        for (let sp in thePsByID) {
            const thisPartner = thePsByID[sp];
            orderedPartners.push(thisPartner.mDate + "-" + thisPartner.bDate + "|" + thisPartner.Id);
        }
        orderedPartners = orderedPartners.sort();

        let currKidNum = 0;
        for (let op = 0; op < orderedPartners.length; op++) {
            const opString = orderedPartners[op];
            let opID = opString.substring(opString.indexOf("|") + 1);
            // console.log("FOUND opID = ", opID);
            thePsByID[opID].order = op;

            console.log(
                "Pre-STEP 3 - repositioning prep - Partners Kids as input into ordered Kids:",
                thePsByID[opID].kidsList
            );
            // WHILE we are already HERE ... let's SORT the kids per Spouse,
            // (STEP 2) ORDER Children based on Spouses order and in BirthOrder within that (children with no co-parents go first, then dated marriage spouses' kids, then undated's)
            let tempOrderedKids = [];
            for (let k = 0; k < thePsByID[opID].kidsList.length; k++) {
                const kID = thePsByID[opID].kidsList[k];
                tempOrderedKids.push(theKsByID[kID].bDate + "|" + kID);
            }
            tempOrderedKids = tempOrderedKids.sort();
            for (let ok = 0; ok < tempOrderedKids.length; ok++) {
                const okString = tempOrderedKids[ok];
                let okID = okString.substring(okString.indexOf("|") + 1);
                // console.log("FOUND okID = ", okString, okID);
                currKidNum++;
                theKsByID[okID].order = currKidNum;
                orderedKids.push(okString);
            }
        }

        // (STEP 3) For EACH Child - if numD is greater than current D level of code, call this function recursively and get Dimensions for each child
        // Note:  Based on IF statement and return above, this WILL BE the case if we've made it this far
        dims = { width: 0, height: vBoxHeight, genDims: [0], minX: x, maxX: x };
        let currentKidX = x;
        let theMinX = x;
        let theMaxX = x + thisBoxWidth;

        console.log("STEP 3 - repositioning calls: orderedKids:", orderedKids);
        for (let ok = 0; ok < orderedKids.length; ok++) {
            const okString = orderedKids[ok];
            let okID = okString.substring(okString.indexOf("|") + 1);
            console.log(
                "Calling the repositionThisPersonAndTheirDescendants from inside for loop of Step 3 - rep # ",
                ok,
                theKsByID[okID].code,
                "assign y=",
                y + vBoxHeight,
                "=",
                y,
                "+",
                vBoxHeight
            );
            theKsByID[okID]["dims"] = repositionThisPersonAndTheirDescendants(
                theKsByID[okID].code,
                currentKidX,
                y + kidsVBoxHeight,
                "C"
            );
            SuperBigFamView.theLeafCollection[theKsByID[okID].code].y = y + kidsVBoxHeight;
            console.log("returned: ", theKsByID[okID]["dims"]);
            currentKidX = currentKidX * 1.0 + theKsByID[okID]["dims"].width + 1*0 * 20;
        }
        theMaxX = currentKidX;

        // (STEP 4) Fit together each child like a jigsaw puzzle based on their dimensions

        dims.width = currentKidX - x;

        // (STEP 5) Place ThisPerson and their Spouses above children, based on jigsaw puzzle results
        thisLeaf.x = x + (dims.width - 20) / 2 - thisBoxWidth / 2; // WILL CENTRE THIS PERSON ABOVE KIDS (if alone and without a spouse)
        let spouseWidth = 0;
        let lastPartnerX = x;

        // NOTE: orderedPartners includes a default PsByID[0] for children with NO other parent
        //  - so - if there ARE partner spouses, then the orderedPartners.length > 1   !!!!
        if (orderedPartners.length > 1) {
            spouseWidth =
                (orderedPartners.length - 1) * (1.0 * thisBoxWidth + 20) +
                (orderedPartners.length - 1 - 1) * 50 +
                thisBoxWidth;
            console.log("0. thisLeaf.x:", thisLeaf.x, thisLeaf.Who, dims.width, spouseWidth);
            if (dims.width > spouseWidth) {
                thisLeaf.x = Math.max(x, thisLeaf.x - spouseWidth / 2);
                console.log(
                    commentPreFix + code + " : " + thisLeaf.Chunk,
                    "children wider than self + spouse ",
                    dims.width + " > " + spouseWidth,
                    "new X: " + thisLeaf.x
                );
            } else if (dims.width > 0) {
                thisLeaf.x = Math.max(x - thisBoxWidth / 2, thisLeaf.x - dims.width / 2);

                console.log(
                    commentPreFix + code + " : " + thisLeaf.Chunk,
                    "children slimmer than self + spouse ",
                    dims.width + " <= " + spouseWidth,
                    "new X: " + thisLeaf.x
                );

                if (orderedKids.length == 1) {
                    const okString = orderedKids[0];
                    let okID = okString.substring(okString.indexOf("|") + 1);
                    console.log(
                        "Calling the repositionThisPersonAndTheirDescendants from inside if stmt of Step 5 - 1 orderedKid "
                    );

                    // CHANGE TO REPOSITION THIS PERSONS CLUSTER - 2023-10-19 - GPC - Lot less calculation heavy than recalling the whole repositionThisPersonAndTheirDescendants again - assuming it did it's job in the first place properly!
                    // let tmpDims = repositionThisPersonAndTheirDescendants(
                    
                    console.log(
                        commentPreFix + code + " : " + thisLeaf.Chunk,
                        "repositionThisPersonsCluster ",
                        thisLeaf.x + thisBoxWidth / 2 + 10
                    );
                    repositionThisPersonsCluster(
                        theKsByID[okID].code,
                        thisLeaf.x + thisBoxWidth / 2 + 10, // changed x + to thisLeaf.x +
                        y + kidsVBoxHeight,
                        "C"
                    );
                }
            
            }
            console.log("orderedPartners:", orderedPartners);
            console.log("1. thisLeaf.x:", thisLeaf.x, "|", orderedPartners.length, thisBoxWidth);
            let thePartnerNum = 0;
            lastPartnerX = thisLeaf.x;
            for (let op = 0; op < orderedPartners.length; op++) {
                const opString = orderedPartners[op];
                let opID = opString.substring(opString.indexOf("|") + 1);
                if (opID > 0) {
                    thePartnerNum++;
                    let thisPcode = thePsByID[opID].code;
                    let thisPartner = SuperBigFamView.theLeafCollection[thisPcode];
                    // console.log("Howdy Pardner:", op, opString);
                    // console.log("Howdy :", opID);
                    // console.log("Pardner:", thisPcode);
                    thisPartner["x"] = thisLeaf.x + thePartnerNum * (1.0 * thisBoxWidth + 20) + (thePartnerNum - 1) * 50;                   
                    if (thisPartner["x"] == 0) {thisPartner["x"] = 1;}
                    console.log("Gday mate:", thisPartner, thePsByID);
                    // console.log("thisPartner.x", thisPartner["x"]);
                    lastPartnerX = thisPartner["x"];
                    repositionThisSpousesFamily(thisPartner, thisPcode);
                }
            }
        }
        // (STEP 6) Calculate and Return overall Dimensions of entire package
        dims.width = Math.max(thisBoxWidth, dims.width, spouseWidth);
        dims.maxX = Math.max(x + thisBoxWidth, theMaxX, lastPartnerX + thisBoxWidth);
        console.log(
            commentPreFix + code + " : " + thisLeaf.Chunk,
            "( " + thisLeaf.x + " , " + thisLeaf.y + " )",
            orderedPartners.length,
            orderedKids.length,
            dims
        );
        return dims;
    }

    // CYCLE through all the Person Boxes in the Super Big Family Tree to find a Max Height, and then reposition if needed
    function adjustHeightsIfNeeded() {
        let maxHt = 0;
        let maxVitalHt = 0;
        let originalMaxHt = currentMaxHeight4Box;
        return;
        for (let ahnNum = 1; ahnNum < 2 ** SuperBigFamView.numGens2Display; ahnNum++) {
            const elem = document.getElementById("wedgeInfo-" + ahnNum);
            const vital = document.getElementById("vital-" + ahnNum);
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

        let theBoxTightness = SuperBigFamView.currentSettings["general_options_tightness"];

        let vBoxHeight = 300 + 20 * SuperBigFamView.currentSettings["general_options_vSpacing"]; //SuperBigFamView.currentSettings["general_options_vBoxHeight"];
        // let vSpacing = SuperBigFamView.currentSettings["general_options_vSpacing"];

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
        condLog("SuperBigFamView.maxDiamPerGen", SuperBigFamView.maxDiamPerGen);

        for (let ahnNum = 1; doAdjust && ahnNum < 2 ** SuperBigFamView.numGens2Display; ahnNum++) {
            const elem = document.getElementById("wedgeInfo-" + ahnNum);
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
                                SuperBigFamView.maxDiamPerGen[g] *
                                xScaleFactor -
                            1 * SuperBigFamView.maxDiamPerGen[g] * xScaleFactor;
                        // condLog(i, g, Math.floor(g/2) , SuperBigFamView.maxDiamPerGen[g] , "X",X);
                    } else {
                        Y +=
                            0 +
                            ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                                2 *
                                SuperBigFamView.maxDiamPerGen[g] *
                                yScaleFactor -
                            1 * SuperBigFamView.maxDiamPerGen[g] * yScaleFactor;
                        // condLog(i, g, Math.floor(g/2) , SuperBigFamView.maxDiamPerGen[g] , "Y",Y);
                    }
                }
                condLog(ahnNum, "translate(" + X + "," + Y + ")");
                if (elem.parentNode.parentNode.parentNode) {
                    elem.parentNode.parentNode.parentNode.setAttribute("transform", "translate(" + X + "," + Y + ")");
                }
            }
        }

        if (doAdjust) {
            SuperBigFamView.drawLines();
        }

        // condLog( ancestorObject.ahnNum, thisGenNum, thisPosNum, ancestorObject.person._data.FirstName, ancestorObject.person._data.Name , X , Y);
    }

    /** FUNCTION used to force a redraw of the Super Big Family Tree, used when called from Button Bar after a parameter has been changed */
    function endisableButtons(makeActive) {
        let nameElements = document.getElementsByClassName("btnSVG");
        for (let e = 0; e < nameElements.length; e++) {
            const element = nameElements[e];
            if (makeActive == false) {
                element.classList.add("disabled");
                document.getElementById("saveSettingsChanges").classList.add("disabled");;
                
            } else {
                element.classList.remove("disabled");
                document.getElementById("saveSettingsChanges").classList.remove("disabled");
            }
        }
    }
    
    

    SuperBigFamView.redraw = function () {
        console.log("function SuperBigFamView.redraw");
        // condLog("Now theAncestors = ", SuperBigFamView.theAncestors);
        // thePeopleList.listAll();
        let id = SuperBigFamView.theLeafCollection["A0"].Id;
        endisableButtons(false);
        // console.log("Calling recalcAndDisplayNumGens from inside  SuperBigFamView.redraw function  - primary has ",
        //             thePeopleList[id]._data.Children.length,
        //             " Children");
        // recalcAndDisplayNumGens();
        repositionLeaves();
        SuperBigFamView.myAncestorTree.draw();
        findCategoriesOfAncestors();
        adjustHeightsIfNeeded();
    };

    SuperBigFamView.redrawAncs = function () {
        console.log("function SuperBigFamView.redrawAncs");
        // condLog("Now theAncestors = ", SuperBigFamView.theAncestors);
        // thePeopleList.listAll();
        let id = SuperBigFamView.theLeafCollection["A0"].Id;
        // console.log("Calling recalcAndDisplayNumGens from inside  SuperBigFamView.redraw function  - primary has ",
        //             thePeopleList[id]._data.Children.length,
        //             " Children");
        endisableButtons(false);
        recalcAndDisplayNumGensAncs();
        // repositionLeaves();
        // SuperBigFamView.myAncestorTree.draw();
        findCategoriesOfAncestors();
        adjustHeightsIfNeeded();
    };
    SuperBigFamView.redrawDescs = function () {
        console.log("function SuperBigFamView.redrawDescs");
        // condLog("Now theAncestors = ", SuperBigFamView.theAncestors);
        // thePeopleList.listAll();
        let id = SuperBigFamView.theLeafCollection["A0"].Id;
        endisableButtons(false);
        // console.log("Calling recalcAndDisplayNumGens from inside  SuperBigFamView.redraw function  - primary has ",
        //             thePeopleList[id]._data.Children.length,
        //             " Children");
        recalcAndDisplayNumGensDescs();
        // repositionLeaves();
        // SuperBigFamView.myAncestorTree.draw();
        findCategoriesOfAncestors();
        adjustHeightsIfNeeded();
    };
    SuperBigFamView.redrawCuz = function () {
        console.log("function SuperBigFamView.redrawCuz");
        // condLog("Now theAncestors = ", SuperBigFamView.theAncestors);
        // thePeopleList.listAll();
        let id = SuperBigFamView.theLeafCollection["A0"].Id;
        endisableButtons(false);
        // console.log("Calling recalcAndDisplayNumGens from inside  SuperBigFamView.redraw function  - primary has ",
        //             thePeopleList[id]._data.Children.length,
        //             " Children");
        recalcAndDisplayNumGensCuz();
        // repositionLeaves();
        // SuperBigFamView.myAncestorTree.draw();
        findCategoriesOfAncestors();
        adjustHeightsIfNeeded();
    };

    SuperBigFamView.cancelSettings = function () {
        let theDIV = document.getElementById("settingsDIV");
        theDIV.style.display = "none";
    };

    SuperBigFamView.toggleSettings = function () {
        condLog("TIME to TOGGLE the SETTINGS NOW !!!", SuperBigFamView.SBFtreeSettingsOptionsObject);
        condLog(SuperBigFamView.SBFtreeSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("settingsDIV");
        condLog("SETTINGS ARE:", theDIV.style.display);
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
            let aboutDIV = document.getElementById("aboutDIV");
            aboutDIV.style.display = "none";
        } else {
            theDIV.style.display = "none";
        }
    };

    SuperBigFamView.toggleLegend = function () {
        // condLog("TIME to TOGGLE the SETTINGS NOW !!!", SuperBigFamView.fanchartSettingsOptionsObject);
        // condLog(SuperBigFamView.fanchartSettingsOptionsObject.getDefaultOptions());
        let theDIV = document.getElementById("legendDIV");
        // condLog("SETTINGS ARE:", theDIV.style.display);
        if (theDIV.style.display == "none") {
            theDIV.style.display = "block";
        } else {
            theDIV.style.display = "none";
        }
    };

    SuperBigFamView.hideLegend = function () {
        let theDIV = document.getElementById("legendDIV");
        theDIV.style.display = "none";
    };

    SuperBigFamView.reZoom = function () {
        // condLog("TIME to RE ZOOM now !", SuperBigFamView.currentScaleFactor);
        let newScaleFactor = 0.8;

        let svg = document.getElementById("superbigChartSVG");
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
                        makeFitZoomFactor = (window.innerHeight - 30) / ((window.innerWidth * h) / boundingBox.width);
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
                SuperBigFamView.currentScaleFactor != 0.8 * makeFitZoomFactor &&
                SuperBigFamView.currentScaleFactor != 1.0 * makeFitZoomFactor &&
                SuperBigFamView.lastCustomScaleFactor != SuperBigFamView.currentScaleFactor
            ) {
                SuperBigFamView.lastCustomScaleFactor = SuperBigFamView.currentScaleFactor;
                SuperBigFamView.zoomCounter = 2;
            }

            SuperBigFamView.zoomCounter = (SuperBigFamView.zoomCounter + 1) % 3;

            if (SuperBigFamView.zoomCounter == 0) {
                newScaleFactor = 0.8 * makeFitZoomFactor;
            } else if (SuperBigFamView.zoomCounter == 1) {
                newScaleFactor = 1.0 * makeFitZoomFactor;
            } else if (SuperBigFamView.zoomCounter == 2) {
                newScaleFactor = SuperBigFamView.lastCustomScaleFactor;
            }

            let overHead = 0;
            if ((newScaleFactor * window.innerWidth * h) / boundingBox.width < window.innerHeight) {
                overHead = Math.max(0, window.innerHeight - newScaleFactor * window.innerHeight);
            }
            // condLog(
            //     "z",
            //     SuperBigFamView.zoomCounter,
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
                SuperBigFamView.zoom.transform,
                d3.zoomIdentity.translate(0, 0 - overHead).scale(newScaleFactor) /// translation used to be -h * 0.08
            );
        }
    };

    /**
     * Load and display a person
     *
     * FIRST GET PEOPLE - DATA LOAD FOR APP - STARTS HERE !!!
     *
     */
    SuperBigFamView.prototype.load = function (id) {
        console.log("function SuperBigFamView.prototype.load");
        var self = this;    

        // RESET some defaults
        SuperBigFamView.loadedLevels = ["A1", "A2", "D1"];
        SuperBigFamView.linesATC = []; // the Lines (connectors) Air Traffic Controller
        // SuperBigFamView.myAhnentafel = new AhnenTafel.Ahnentafel();
        // SuperBigFamView.theAncestors = [];
        // SuperBigFamView.XAncestorList = [];
        // SuperBigFamView.currentSettings = {};
        SuperBigFamView.theLeafCollection = {};
        SuperBigFamView.dontSaveCollection = {};
        SuperBigFamView.theChunkCollection = {};

        SuperBigFamView.numAncGens2Display = 2;
        SuperBigFamView.numDescGens2Display = 1;
        SuperBigFamView.numCuzGens2Display = 0;
        SuperBigFamView.displayINLAWS = 0;
        SuperBigFamView.displayPrivatize = 0;

        SuperBigFamView.maxNumAncGens = 7;
        SuperBigFamView.maxNumDescGens = 7;
        SuperBigFamView.maxNumCuzGens = 4;

        SuperBigFamView.workingMaxNumAncGens = 3;
        SuperBigFamView.workingMaxNumDescGens = 2;
        SuperBigFamView.workingMaxNumCuzGens = 1;



        self._load(id).then(function (person) {
            // condLog("SuperBigFamView.prototype.load : self._load(id) ");
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
            console.log("(load:" + id + " ) GETPEOPLE", APP_ID, id, ["Id"], { nuclear: 2 });
            WikiTreeAPI.getPeople(
                // (appId, IDs, fields, options = {})
                APP_ID,
                id,
                SuperBigFamView.fieldNamesArray,
                { nuclear: 4 }
            ).then(function (result) {
                SuperBigFamView.theAncestors = result[2];
                condLog("theAncestors:", SuperBigFamView.theAncestors);
                console.log("load function : person with which to drawTree:", person);
                let numPeeps = 0;
                for (const ancNum in SuperBigFamView.theAncestors) {
                    let thePerson = SuperBigFamView.theAncestors[ancNum];
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
                    numPeeps++;
                }

                console.log("INITIALLY loaded ", numPeeps, "peeps");

                person._data.Father = SuperBigFamView.theAncestors[id].Father;
                person._data.Mother = SuperBigFamView.theAncestors[id].Mother;

                SuperBigFamView.myAhnentafel.update(person);

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
                    let thisPeep = thePeopleList[SuperBigFamView.myAhnentafel.list[a]];
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

                // ===================
                // LOAD the SIBLINGS of the grandparents (2nd gen) ancestors for completeness
                // ===================

                WikiTreeAPI.getPeople(
                    // (appId, IDs, fields, options = {})
                    APP_ID,
                    id,
                    SuperBigFamView.fieldNamesArray,
                    { ancestors: 3, siblings: 1 }
                ).then(function (result2) {
                    let GGGparentSiblings = result2[2];
                    condLog("theAncestors:", GGGparentSiblings);
                    // console.log("load function : person with which to drawTree:", person);
                    let numPeeps2 = 0;
                    for (const ancNum2 in GGGparentSiblings) {
                        let thePerson = GGGparentSiblings[ancNum2];
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
                        thePeopleList.addIfNeeded(thePerson);
                        numPeeps2++;
                    }

                    console.log("SUBSEQUENTLY loaded ", numPeeps2, " GGGparent Sibling peeps");

                    // ===================

                    for (let peepID in thePeopleList) {
                        let thisPeep = thePeopleList[peepID];
                        // console.log("need to draw out Children and Siblings for ", thisPeep._data.BirthNamePrivate);

                        // start off by adding arrays to hold potential Sibs and Kids
                        if (!thisPeep._data["Children"]) {
                            thisPeep._data["Children"] = [];
                        }
                        if (!thisPeep._data["Siblings"]) {
                            thisPeep._data["Siblings"] = [];
                        }

                        if (thisPeep._data.Mother > 0 && thePeopleList[thisPeep._data.Mother]) {
                            linkParentAndChild(peepID, thisPeep._data.Mother, "F");
                        }
                        if (thisPeep._data.Father > 0 && thePeopleList[thisPeep._data.Father]) {
                            linkParentAndChild(peepID, thisPeep._data.Father, "M");
                        }
                    }

                    let thisPersonsLeaf = {
                        Id: id,
                        Code: "A0",
                        FullCode: "A0:" + id + "-",
                        degree: 0,
                        Chunk: "A0",
                        Who: person._data.BirthNamePrivate,
                    };

                    assembleSiblingsFor([id]);
                    if (person._data.Father) {
                        assembleSiblingsFor([person._data.Father]);
                    }
                    if (person._data.Mother) {
                        assembleSiblingsFor([person._data.Mother]);
                    }

                    // console.log("CAN WE FIND Spouses to ASSEMBLE  here ?", thePeopleList[id]._data.Spouses);

                    for (var a = 0; a < thePeopleList[id]._data.Spouses.length; a++) {
                        let spObj = thePeopleList[id]._data.Spouses[a];
                        assembleSiblingsFor([spObj.Id]);
                    }

                    // ASSEMBLE SIBLINGS for GRANDPARENTS
                    for (var a = 4; a < 16; a++) {
                        if (SuperBigFamView.myAhnentafel.list[a] && SuperBigFamView.myAhnentafel.list[a] > 0) {
                            let GGidnum = SuperBigFamView.myAhnentafel.list[a];
                            let spObj = thePeopleList[GGidnum]._data;
                            assembleSiblingsFor([spObj.Id]);
                        }
                    }

                    addToLeafCollection(thisPersonsLeaf);

                    self.drawTree(person);
                    clearMessageBelowButtonBar();
                    // populateXAncestorList(1);
                    // fillOutFamilyStatsLocsForAncestors();
                    // findCategoriesOfAncestors();
                    console.log(
                        "** Almost at end of load function - primary has ",
                        thePeopleList[id]._data.Children.length,
                        " Children"
                    );
                    // loadAncestorsAtLevel(1);
                    // loadAncestorsAtLevel(2);
                    // loadBiosNow(id);
                });
            });
        });
    };

    // ASSEMBLE the SIBLINGS object for one of the A direct ancestor objects (or A0 = Primary Person themself !)
    function assembleSiblingsFor(IDsArray) {
        console.log("ASSEMBLING SIBLINGS FOR:", IDsArray);
        for (let nl = 0; nl < IDsArray.length; nl++) {
            const newID = IDsArray[nl];

            let thisPeep = thePeopleList[newID];
            let thisDad = null;
            let thisMom = null;
            // console.log("B4 : ", thisPeep._data["Siblings"]);
            if (!thisPeep._data.Siblings) {
                thisPeep._data["Siblings"] = [];
            }
            // console.log("B5 : ", thisPeep._data["Siblings"]);

            if (thisPeep._data.Siblings.length > 0) {
                continue; // skip this iteration of the IDsArray and go back to the for stmt and continue with the next vallue of nl
            }

            if (
                thisPeep &&
                thisPeep._data.Father &&
                thisPeep._data.Father > 0 &&
                thePeopleList[thisPeep._data.Father]
            ) {
                thisDad = thePeopleList[thisPeep._data.Father];
                for (let ch = 0; ch < thisDad._data.Children.length; ch++) {
                    let thisSib = thisDad._data.Children[ch];
                    if (thisSib.Id == thisPeep._data.Id) {
                        continue; // skip this iteration of the loop, and continue back at the top of this FOR stmt with the next value of ch
                    }
                    thisSib["siblingType"] = "Paternal";
                    thisPeep._data["Siblings"].push(thisSib);
                }
            }

            if (
                thisPeep &&
                thisPeep._data.Mother &&
                thisPeep._data.Mother > 0 &&
                thePeopleList[thisPeep._data.Mother]
            ) {
                thisMom = thePeopleList[thisPeep._data.Mother];
                for (let ch = 0; ch < thisMom._data.Children.length; ch++) {
                    let thisSib = thisMom._data.Children[ch];
                    if (thisSib.Id == thisPeep._data.Id) {
                        continue; // skip this iteration of the loop, and continue back at the top of this FOR stmt with the next value of ch
                    }
                    if (thisPeep._data.Father && thisSib.coParent == thisPeep._data.Father) {
                        for (let s = 0; s < thisPeep._data.Siblings.length; s++) {
                            let thisExistingSib = thisPeep._data.Siblings[s];
                            if (thisExistingSib.Id == thisSib.Id) {
                                thisExistingSib["siblingType"] = "Full";
                            }
                        }
                    } else {
                        thisSib["siblingType"] = "Maternal";
                        thisPeep._data["Siblings"].push(thisSib);
                    }
                }

                adjustBirthOrderForSiblings(thisPeep);
            }

            // console.log("ASSEMBLING the SIBLINGS for ", newID);
            if (
                thisDad &&
                thisDad._data &&
                thisDad._data.Children &&
                thisMom &&
                thisMom._data &&
                thisMom._data.Children
            ) {
                // console.log(
                //     "ASSEMBLING the SIBLINGS for ",
                //     newID,
                //     "from",
                //     thisDad._data.Children,
                //     "&",
                //     thisMom._data.Children
                // );
            } else {
                // console.log("no Children array for at least one of Dad or Mom");
            }
            if (thisPeep && thisPeep._data && thisPeep._data.Siblings) {
                // console.log("ASSEMBLED SIBLINGS: ", thisPeep._data.Siblings);
            } else {
                // console.log("ASSEMBLED SIBLINGS --> nada !! ");
            }
            // console.log("B6 : ", thisPeep._data["Siblings"]);
        }
    }
    // This function will determine the birth order of a person, when compared to their siblings, and add or update the appropriate Sibling entries
    function adjustBirthOrderForSiblings(thisPeep) {
        // let thisPeep = thePeopleList[peepID];

        // console.log("Should be adjusting birth order now for ", thisPeep._data.BirthNamePrivate);
        let array2Sort = [thisPeep._data.BirthDate + "|411"];
        for (let i = 0; i < thisPeep._data.Siblings.length; i++) {
            const sibObj = thisPeep._data.Siblings[i];
            // console.log("should compare :", sibObj.bDate);
            array2Sort.push(sibObj.bDate + "|" + i);
        }

        array2Sort.sort();
        // console.log("should have:", array2Sort);

        for (let i = 0; i < array2Sort.length; i++) {
            let thisEntry = array2Sort[i];
            let thisPlace = thisEntry.substring(thisEntry.indexOf("|") + 1);
            // console.log("should thisPlace = ", thisPlace);

            if (thisPlace == 411) {
                thisPeep._data["birthOrder"] = i + 1;
            } else {
                thisPeep._data.Siblings[thisPlace].birthOrder = i + 1;
            }
        }

        // console.log("FINAL SIBLINGS:", thisPeep._data.Siblings);
        // console.log("DIRECT peep @ ", thisPeep._data.birthOrder, thisPeep._data.BirthDate);
    }

    // UPDATE LEAF with UPDATED VALUES
    function updateThisLeaf(newLeaf) {
        SuperBigFamView.theLeafCollection[newLeaf.Code] = newLeaf;
    }

    // THIS Function will ADD a NEW LEAF to the Leaf Collection, assuming it's not already in there
    // AND ... will then recursively call itself adding more leaves until it runs out
    function addToLeafCollection(newLeaf, dontAddIDsList = []) {
        console.log(
            " --> ADDING LEAF: ",
            newLeaf.Code,
            newLeaf.Who,
            newLeaf.Chunk,
            "with DO NOT list of:",
            dontAddIDsList
        );

        // CHUNKS are used to GROUP together people who are the same distance from the Primary Person
        // and whose appearance or disappearance can be turned on or off by adjusting one of the -1 / +1 steppers in the button bar
        // There are A level groupings and Cousin groupings from within those ABOVE the Primary Person (Ancestors, controlled by Ancestors + Cousins steppers)
        // and there is A0 for the Primary Person, A0D1 for Direct Descendants, A0Dn ... for future descendant generations of primary person (controlled by Descendants stepper)
        // and then finally S0 for the Siblings of the Primary Person, and D sub groups for Descendants of Siblings, e.g. S0D1, ... S0Dn .. (controlled by Descendants stepper and showing if Ancestors >= 1 generation)
        let newChunk4Rents = "JK";
        let newChunk4Sibs = "JK";
        let newChunk4Partners = "JK"; // PARTNERS and KIDS
        let newChunk4Kids = "JK"; // PARTNERS and KIDS

        let doNotAddRents = false;
        let doNotAddSiblings = false;
        let doNotAddPartners = false;
        let doNotAddKids = false;

        if (newLeaf.Chunk.length == 2 && newLeaf.Chunk[0] == "A") {
            newChunk4Rents = "A" + (newLeaf.Chunk[1] * 1 + 1.0);
            if (newLeaf.Chunk == "A0") {
                newChunk4Sibs = "S0";
                newChunk4Partners = "A0D1";
                newChunk4Kids = "A0D1";
                // } else if (newLeaf.Chunk == "A0RF" || newLeaf.Chunk == "A0RM") {
                //     newChunk4Kids = "S0";
                //
            } else {
                newChunk4Sibs = newLeaf.Chunk + "C0";
                newChunk4Partners = newLeaf.Chunk + "C0";
                if (newLeaf.Chunk == "A1") {
                    newChunk4Partners = "A1";
                }
                newChunk4Kids = newLeaf.Chunk + "C0";
                if (newLeaf.Chunk == "A1") {
                    newChunk4Kids = "S0";
                    doNotAddKids = true;
                }
            }
        } else if (newLeaf.Chunk.length == 2 && newLeaf.Chunk[0] == "S") {
            newChunk4Rents = "S?";
            newChunk4Sibs = "S!";
            newChunk4Partners = newLeaf.Chunk + "D1";
            newChunk4Kids = newLeaf.Chunk + "D1";
        } else {
            let lastCoupleCode = newLeaf.Chunk.substr(-2);
            let firstPart = newLeaf.Chunk.substring(0, 2);
            console.log("lastCoupleCode:", lastCoupleCode);

            if (lastCoupleCode[0] == "C" || lastCoupleCode[0] == "D") {
                newChunk4Rents = firstPart + lastCoupleCode[0] + (1 * lastCoupleCode[1] + 1);
                newChunk4Sibs = firstPart + lastCoupleCode[0] + (1 * lastCoupleCode[1] + 1);
                newChunk4Partners = firstPart + lastCoupleCode[0] + (1 * lastCoupleCode[1] + 1);
                newChunk4Kids = firstPart + lastCoupleCode[0] + (1 * lastCoupleCode[1] + 1);
            }
        }

        let currentCodeType = newLeaf.Code.substr(-2)[0]; // e.g.  xxxxRF  = R, xxxxP2 = P
        if (currentCodeType >= "0" && currentCodeType <= "9") {
            currentCodeType = newLeaf.Code.substr(-3)[0]; // e.g. xxxxxS03 = S, xxxxxK12 = K
        }
        let currentCodeTypePrev = "A";
        if (newLeaf.Code.length > 4) {
            currentCodeTypePrev = newLeaf.Code.substr(-4)[0]; // e.g. xxxxP1RM = P , xxxxRFRM = R
            if (
                (currentCodeTypePrev >= "0" && currentCodeTypePrev <= "9") ||
                currentCodeTypePrev == "M" ||
                currentCodeTypePrev == "F"
            ) {
                currentCodeTypePrev = newLeaf.Code.substr(-5)[0]; // e.g. xxxxK07P2 = K
                if (
                    (currentCodeTypePrev >= "0" && currentCodeTypePrev <= "9") ||
                    currentCodeTypePrev == "M" ||
                    currentCodeTypePrev == "F"
                ) {
                    currentCodeTypePrev = newLeaf.Code.substr(-6)[0]; // e.g. xxxxS03K02 = S
                    if (
                        (currentCodeTypePrev >= "0" && currentCodeTypePrev <= "9") ||
                        currentCodeTypePrev == "M" ||
                        currentCodeTypePrev == "F"
                    ) {
                        currentCodeTypePrev = "Q"; // should NEVER happen!
                    }
                }
            }
        }
        console.log("CurrentCodeTypes Prev & Curr: ", currentCodeTypePrev, currentCodeType, newLeaf.Code);

        if (currentCodeType == "K" || currentCodeType == "S") {
            doNotAddRents = true;
            doNotAddSiblings = true;
        } else if (currentCodeType == "P" && currentCodeTypePrev != "P") {
            doNotAddKids = false;
            doNotAddSiblings = false;
            if (currentCodeTypePrev == "R") {
                console.log(
                    "HERE IS WHERE WE DOUBLE CHECK WHETHER THIS SHOULD BE CHUNK C0 or C1 : ",
                    newLeaf.Who,
                    newLeaf.Code,
                    newLeaf.Chunk
                );
                let tmpPartner = thePeopleList[newLeaf.Id];
                if (tmpPartner && tmpPartner._data.Children && tmpPartner._data.Children.length > 0) {
                    let tmpAncID =
                        SuperBigFamView.theLeafCollection[newLeaf.Code.substring(0, newLeaf.Code.length - 2)].Id;
                    console.log("HERE IS WHERE WE Compare tmpPartner & tmpAnc :", tmpPartner, tmpAncID);
                    let foundKidInCommon = false;
                    for (
                        let tmpKidNum = 0;
                        !foundKidInCommon && tmpKidNum < tmpPartner._data.Children.length;
                        tmpKidNum++
                    ) {
                        const tmpKid = tmpPartner._data.Children[tmpKidNum];
                        if (tmpKid.coParent == tmpAncID) {
                            foundKidInCommon = true;
                        }
                    }
                    if (!foundKidInCommon) {
                        newLeaf.Chunk = newLeaf.Chunk.replace("C0", "C1");
                    }
                } else {
                    console.log("HERE IS WHERE WE See tmpPartner  w No Kids :", tmpPartner);
                    newLeaf.Chunk = newLeaf.Chunk.replace("C0", "C1");
                }
                console.log("HERE IS WHERE AFTERWARDS ....  : ", newLeaf.Who, newLeaf.Code, newLeaf.Chunk);
            }

            newChunk4Rents = newLeaf.Chunk + "IL";
            newChunk4Sibs = newLeaf.Chunk + "ILS";
            newChunk4Partners = newLeaf.Chunk + "ILP";
            newChunk4Kids = newLeaf.Chunk + "ILK";
        } else if (currentCodeType == "R") {
            doNotAddKids = true;
            doNotAddSiblings = false;
        }

        if (currentCodeTypePrev == "P") {
            doNotAddRents = true;
            doNotAddSiblings = true;
            doNotAddPartners = true;
            doNotAddKids = true;
        }
        console.log(
            "FOR the leaf",
            newLeaf.Code,
            " it is a ",
            currentCodeType,
            "that came from a ",
            currentCodeTypePrev
        );
        // console.log(
        //     "DO NOT permissions for Rent, Partner, Siblings, Kids : ",
        //     doNotAddRents,
        //     doNotAddPartners,
        //     doNotAddPartners,
        //     doNotAddKids
        // );
        if (currentCodeType == "K") {
            console.log("Adding Leaf checkpoint: Should we check that this is not a duplicate chlid?");
        }

        if (SuperBigFamView.theLeafCollection[newLeaf.Code]) {
            console.log(
                "CANNOT ADD LEAF:",
                newLeaf.Code,
                "ALREADY EXISTS:",
                SuperBigFamView.theLeafCollection[newLeaf.Code]
                // , thePeopleList[newLeaf.Id].data.BirthNamePrivate
            );

            if (SuperBigFamView.theLeafCollection[newLeaf.Code].Chunk != newLeaf.Chunk) {
                let oldChunk = SuperBigFamView.theLeafCollection[newLeaf.Code].Chunk;
                SuperBigFamView.theLeafCollection[newLeaf.Code].Chunk = newLeaf.Chunk;
                if (!SuperBigFamView.theChunkCollection[newLeaf.Chunk]) {
                    SuperBigFamView.theChunkCollection[newLeaf.Chunk] = {
                        Chunk: newLeaf.Chunk,
                        CodesList: [newLeaf.Code],
                        Settings: "",
                    };
                } else if (!SuperBigFamView.theChunkCollection[newLeaf.Chunk].CodesList) {
                    SuperBigFamView.theChunkCollection[newLeaf.Chunk].CodesList = [newLeaf.Code];
                } else {
                    SuperBigFamView.theChunkCollection[newLeaf.Chunk].CodesList.push(newLeaf.Code);
                }

                let whereThisCodeInOldChunk = SuperBigFamView.theChunkCollection[oldChunk].CodesList.indexOf(
                    newLeaf.Code
                );
                if (whereThisCodeInOldChunk > -1) {
                    SuperBigFamView.theChunkCollection[oldChunk].CodesList.splice(whereThisCodeInOldChunk, 1);
                    console.log(
                        "REMOVED the code ",
                        newLeaf.Code,
                        " from the old CHUNK:",
                        oldChunk,
                        " at position ",
                        whereThisCodeInOldChunk
                    );
                }
            }

            if (dontAddIDsList.length > 0) {
                // do nothing rash - this was sent in with a valid do not list --> allow this to continue on
                updateThisLeaf(newLeaf);
                SuperBigFamView.dontSaveCollection[newLeaf.Code] = dontAddIDsList; // Save this dontADD LIST if we come around to this again at the next level, and need to update the leaf
            } else if (SuperBigFamView.dontSaveCollection[newLeaf.Code]) {
                // definitely continue on, and use the dontAdd list from previous round of leaf collecting ...
                dontAddIDsList = SuperBigFamView.dontSaveCollection[newLeaf.Code];
                updateThisLeaf(newLeaf);
            } else {
                // Leaf is ALREADY added ... AND ... looks like there is no special case (donAddIDs list), so no need to update this leaf
                // therefore .. just return to regularly scheduled programming
                return;
            }
        } else {
            // ADD LEAF now !!
            SuperBigFamView.theLeafCollection[newLeaf.Code] = newLeaf;

            SuperBigFamView.dontSaveCollection[newLeaf.Code] = dontAddIDsList; // Save this dontADD LIST if we come around to this again at the next level, and need to update the leaf

            // Add this leaf to its appropriate Chunk ...
            if (SuperBigFamView.theChunkCollection[newLeaf.Chunk]) {
                // Chunk already exists, so just push this one onto the CodesList
                SuperBigFamView.theChunkCollection[newLeaf.Chunk].CodesList.push(newLeaf.Code);
            } else {
                // OR ... create a brand new Chunk, and, add this Leaf, first of its name, king beyond the wall ...
                SuperBigFamView.theChunkCollection[newLeaf.Chunk] = {
                    Chunk: newLeaf.Chunk,
                    CodesList: [newLeaf.Code],
                    Settings: "",
                };
            }
        }

        let thisPeep = thePeopleList[newLeaf.Id];
        if (!thisPeep) {
            return;
        }

        console.log("This Peep = ", thisPeep);

        // ADD MOTHER
        if (doNotAddRents) {
            // do nothing ... just ignore it
            // console.log(
            //     "Did NOT add mother ",
            //     thisPeep._data.Mother,
            //     "this was a ",
            //     currentCodeType,
            //     "that came from a ",
            //     currentCodeTypePrev
            // );
        } else if (
            thisPeep._data.Mother &&
            dontAddIDsList.length > 0 &&
            doNOTaddThisObjectToThatLeafCollection(thisPeep._data.Mother, dontAddIDsList)
        ) {
            // do nothing ... just ignore it
            // console.log("Did NOT add mother", thisPeep._data.Mother, "from do not ADD list");
        } else if (thisPeep._data.Mother && isOKtoAddLeaf(thisPeep._data.Mother, newLeaf)) {
            let MaName = "Mother of " + thisPeep._data.BirthNamePrivate;
            if (thePeopleList[thisPeep._data.Mother]) {
                MaName = thePeopleList[thisPeep._data.Mother]._data.BirthNamePrivate;
            }
            addToLeafCollection(
                {
                    Id: thisPeep._data.Mother,
                    Code: newLeaf.Code + "RF",
                    FullCode: newLeaf.FullCode + "RF:" + thisPeep._data.Mother + "-",
                    degree: newLeaf.degree + 1,
                    Chunk: newChunk4Rents,
                    Who: MaName,
                },
                [thisPeep._data.Father, thisPeep._data.Siblings]
            );
        }
        // ADD FATHER
        if (doNotAddRents) {
            // do nothing ... just ignore it
            // console.log(
            //     "Did NOT add father ",
            //     thisPeep._data.Father,
            //     "this was a ",
            //     currentCodeType,
            //     "that came from a ",
            //     currentCodeTypePrev
            // );
        } else if (
            thisPeep._data.Father &&
            dontAddIDsList.length > 0 &&
            doNOTaddThisObjectToThatLeafCollection(thisPeep._data.Father, dontAddIDsList)
        ) {
            // do nothing ... just ignore it
            // console.log("Did NOT add father", thisPeep._data.Father, "from do not ADD list");
        } else if (thisPeep._data.Father && isOKtoAddLeaf(thisPeep._data.Father, newLeaf)) {
            let PaName = "Father of " + thisPeep._data.BirthNamePrivate;
            if (thePeopleList[thisPeep._data.Father]) {
                PaName = thePeopleList[thisPeep._data.Father]._data.BirthNamePrivate;
            }
            addToLeafCollection(
                {
                    Id: thisPeep._data.Father,
                    Code: newLeaf.Code + "RM",
                    FullCode: newLeaf.FullCode + "RM:" + thisPeep._data.Father + "-",
                    degree: newLeaf.degree + 1,
                    Chunk: newChunk4Rents,
                    Who: PaName,
                },
                [thisPeep._data.Mother, thisPeep._data.Siblings]
            );
        }

        // PARTNERS
        let theNum = 0;
        for (let num = 0; thisPeep._data.Spouses && num < thisPeep._data.Spouses.length; num++) {
            const theObj = thisPeep._data.Spouses[num];
            if (doNotAddPartners) {
                // do nothing ... just ignore it
                // console.log(
                //     "Did NOT add partner ",
                //     theObj.Id,
                //     "this was a ",
                //     currentCodeType,
                //     "that came from a ",
                //     currentCodeTypePrev
                // );
            } else if (dontAddIDsList.length > 0 && doNOTaddThisObjectToThatLeafCollection(theObj.Id, dontAddIDsList)) {
                // do nothing ... just ignore it
                // console.log("Did NOT add partner", theObj, "from do not ADD list");
            } else if (theObj.Id && isOKtoAddLeaf(theObj.Id, newLeaf)) {
                theNum++;
                // console.log("GOING to ADD Partner:", newLeaf.FullCode + "P" + theNum + ":" + theObj.Id + "-");

                let thisName = "Partner of " + thisPeep._data.BirthNamePrivate;
                if (thePeopleList[theObj.Id]) {
                    thisName = thePeopleList[theObj.Id]._data.BirthNamePrivate;
                }

                addToLeafCollection(
                    {
                        Id: theObj.Id * 1.0,
                        Code: newLeaf.Code + "P" + theNum,
                        FullCode: newLeaf.FullCode + "P" + theNum + ":" + theObj.Id + "-",
                        degree: newLeaf.degree + 1,
                        Chunk: newChunk4Partners,
                        Who: thisName,
                    },
                    [newLeaf.Id, thisPeep._data.Children]
                );
            }
        }

        // CHILDREN
        theNum = 0;
        console.log("Looking through all the CHILDREN: ", thisPeep._data.Children);
        for (let num = 0; num < thisPeep._data.Children.length; num++) {
            const theObj = thisPeep._data.Children[num];
            if (doNotAddKids) {
                // do nothing ... just ignore it
                // console.log(
                //     "Did NOT add child ",
                //     theObj,
                //     "this was a ",
                //     currentCodeType,
                //     "that came from a ",
                //     currentCodeTypePrev
                // );
            } else if (dontAddIDsList.length > 0 && doNOTaddThisObjectToThatLeafCollection(theObj.Id, dontAddIDsList)) {
                // do nothing ... just ignore it
                // console.log("Did NOT add child of ", thisPeep._data.RealName, theObj);
            } else if (newLeaf.FullCode.indexOf(theObj.coParent) > -1) {
                // do nothing ... means that both child's parents are already here, and the child will show up somewhere else - don't need duplicates
            } else if (theObj.Id && isOKtoAddLeaf(theObj.Id, newLeaf)) {
                theNum++;
                let thisName = "Child of " + thisPeep._data.BirthNamePrivate;
                if (thePeopleList[theObj.Id]) {
                    thisName = thePeopleList[theObj.Id]._data.BirthNamePrivate;
                }
                // console.log(
                //     "GOING to ADD Child:",
                //     newLeaf.FullCode + "K" + make2Digit(theNum) + ":" + theObj.Id + "-",
                //     thisName,
                //     newLeaf.Chunk,
                //     newChunk4Kids,
                //     "coParent:" + theObj.coParent,
                //     newLeaf.FullCode.indexOf(theObj.coParent)
                // );

                // let newChunk4Kids = newChunk4Others;
                let thisFullCode4Kid = newLeaf.FullCode + "K" + make2Digit(theNum) + ":" + theObj.Id + "-";
                if (newChunk4Kids == "A0C0") {
                    newChunk4Kids = "S0";
                    thisFullCode4Kid =
                        newLeaf.FullCode.substring(0, newLeaf.FullCode.indexOf("-")) +
                        "S" +
                        make2Digit(theNum) +
                        ":" +
                        theObj.Id +
                        "-";
                }

                addToLeafCollection(
                    {
                        Id: theObj.Id * 1.0,
                        Code: newLeaf.Code + "K" + make2Digit(theNum),
                        FullCode: thisFullCode4Kid,
                        degree: newLeaf.degree + 1,
                        Chunk: newChunk4Kids,
                        Who: thisName,
                    },
                    [thisPeep._data.Children, newLeaf.Id, theObj.coParent]
                );
            } else {
                console.log(
                    "Not sure what's happening to Child of " + thisPeep._data.BirthNamePrivate,
                    "# " + num,
                    theObj
                );
            }
        }

        // SIBLINGS
        theNum = 0;
        for (let num = 0; num < thisPeep._data.Siblings.length; num++) {
            const theObj = thisPeep._data.Siblings[num];
            if (doNotAddSiblings) {
                // do nothing ... just ignore it
                // console.log("Did NOT add sibling ", theObj.Id, "this was a ", currentCodeType);
            } else if (dontAddIDsList.length > 0 && doNOTaddThisObjectToThatLeafCollection(theObj.Id, dontAddIDsList)) {
                // do nothing ... just ignore it
                // console.log("Did NOT add sibling", theObj);
            } else if (theObj.Id && isOKtoAddLeaf(theObj.Id, newLeaf)) {
                theNum++;
                let thisName = "Sibling of " + thisPeep._data.BirthNamePrivate;
                if (thePeopleList[theObj.Id]) {
                    thisName = thePeopleList[theObj.Id]._data.BirthNamePrivate;
                }
                // console.log("GOING to ADD Sibling:", newLeaf.FullCode + "S" + make2Digit(theNum) + ":" + theObj.Id + "-", thisName);
                addToLeafCollection(
                    {
                        Id: theObj.Id * 1.0,
                        Code: newLeaf.Code + "S" + make2Digit(theNum),
                        FullCode: newLeaf.FullCode + "S" + make2Digit(theNum) + ":" + theObj.Id + "-",
                        degree: newLeaf.degree + 1,
                        Chunk: newChunk4Sibs,
                        Who: thisName,
                    },
                    [newLeaf.Id, thisPeep._data.Siblings, thisPeep._data.Father, thisPeep._data.Mother]
                );
            }
        }
    }

    // This function will add the current Leaf Code to thePeopleList object  ( key: Id ) - so - we can use it in the PopUps - AND - display the direct line from the Primary Person - AND - identify those with multiple relationships
    function addLeafCodeToPeopleListObject(newLeaf) {
        if (thePeopleList[newLeaf.Id]) {
            if (thePeopleList[newLeaf.Id]._data.Codes && thePeopleList[newLeaf.Id]._data.Codes.length > 0) {
                if (thePeopleList[newLeaf.Id]._data.Codes.indexOf(newLeaf.Code) == -1) {
                    thePeopleList[newLeaf.Id]._data.Codes.push(newLeaf.Code);
                    // console.log(
                    //     "ADDED ANOTHER CODE !",
                    //     thePeopleList[newLeaf.Id]._data.BirthNamePrivate,
                    //     thePeopleList[newLeaf.Id]._data
                    // );
                } // else ... Code already exists in pre-existing Codes array
            } else {
                // Codes array does not exist in thePeopleList object
                // Let's start it off with this leaf code
                thePeopleList[newLeaf.Id]._data["Codes"] = [];
                thePeopleList[newLeaf.Id]._data["Codes"].push(newLeaf.Code);
                // console.log(
                //     "ADDED A CODE !",
                //     thePeopleList[newLeaf.Id]._data.BirthNamePrivate,
                //     thePeopleList[newLeaf.Id]._data
                // );
            }
        } else {
            // else .. no corresponding thePeopleList object to speak of ... so .. nothing to see here
            // console.log("Cannot find a corresponding thePeopleList object for newLeaf", newLeaf);
        }
    }

    // will return TRUE if we do NOT want to add this new Object to the current LEAF COLLECTION
    // (don't add it if it's already existing in the shortlist of those offered)
    function doNOTaddThisObjectToThatLeafCollection(theObjId, dontAddIDsList) {
        // console.log("type of dontAddIDsList is:", typeof dontAddIDsList);
        for (let dont = 0; dont < dontAddIDsList.length; dont++) {
            const element = dontAddIDsList[dont];
            if (typeof element === "object") {
                for (let index = 0; index < element.length; index++) {
                    const item = element[index];
                    if (theObjId == item) {
                        return true;
                    } else if (item.Id && theObjId == item.Id) {
                        return true;
                    }
                }
            } else {
                if (theObjId == element) {
                    return true;
                } else if (element.Id && theObjId == element.Id) {
                    return true;
                }
            }
        }
        return false;
    }

    // will return TRUE if the newID is NOT already in the list of the FullCode
    function isOKtoAddLeaf(newID, oldLeaf) {
        if (newID > 0 && oldLeaf.FullCode.indexOf(":" + newID + "-") > -1) {
            return false;
        } else {
            return true;
        }
    }

    // This function will add CHILDREN objects and SIBLING objects to thePeopleList objects, as needed
    function linkParentAndChild(peepID, parentID, parentType) {
        let thisPeep = thePeopleList[peepID];
        let thisRent = thePeopleList[parentID]; // Parent = RENT (using P for Partners)
        // console.log(
        //     thisRent._data.BirthNamePrivate,
        //     " is the ",
        //     parentType == "F" ? "mother" : "father",
        //     " of ",
        //     thisPeep._data.BirthNamePrivate
        // );
        // start off by adding arrays to hold potential Sibs and Kids
        if (!thisRent._data["Children"]) {
            thisRent._data["Children"] = [];
        }
        if (!thisRent._data["Siblings"]) {
            thisRent._data["Siblings"] = [];
        }

        let thisBDate = "9999-99-99";
        if (thisPeep._data.BirthDate) {
            thisBDate = thisPeep._data.BirthDate;
        } else if (thisPeep._data.BirthDateDecade) {
            thisBDate = thisPeep._data.BirthDateDecade.substring(0, 4);
        }

        let otherParentID = parentType == "F" ? thisPeep._data.Father : thisPeep._data.Mother;

        let birthOrder = 0;
        // if (thisRent._data.Children.length == 0) {
        //     birthOrder = 1;
        // }
        let thisChildObj = { Id: peepID, coParent: otherParentID, birthOrder: birthOrder, bDate: thisBDate };

        if (thisChildAlreadyInChildrenList(peepID, thisRent._data.Children)) {
            // can't do it!!!!
        } else {
            thisRent._data.Children.push(thisChildObj);
        }

        if (birthOrder == 0) {
            // adjustBirthOrderAndAddSiblings(peepID, otherParentID, thisRent._data.Children, parentType);
        }
    }

    function thisChildAlreadyInChildrenList(kidID, kidList) {
        for (let C = 0; C < kidList.length; C++) {
            const kidObj = kidList[C];
            if (kidID == kidObj.Id) {
                return true;
            }
        }

        return false;
    }

    // // This function will determine the birth order of a person, when compared to their siblings, and add or update the appropriate Sibling entries
    // function adjustBirthOrderAndAddSiblings(peepID, otherParentID, childrenArray, parentType) {
    //     let thisPeep = thePeopleList[peepID];
    //     let halfType = parentType == "M" ? "Paternal" :"Maternal";

    //     console.log("Should be adjusting birth order now for ", thisPeep._data.BirthNamePrivate);
    //     let array2Sort = [];
    //     for (let i = 0; i < childrenArray.length; i++) {
    //         const kidObj = childrenArray[i];
    //         if (kidObj.coParent == otherParentID) {
    //             let kidPeep = thePeopleList[kidObj.Id];
    //             console.log("should compare :", kidPeep._data.BirthDate);
    //             array2Sort.push(kidPeep._data.BirthDate + "|" + i);
    //         }
    //     }
    //     array2Sort.sort();
    //     console.log("should have:", array2Sort);

    //     let thisPeepAsSibObject = { Id: peepID, siblingType: "Full", birthOrder: 0 };
    //     for (let i = 0; i < array2Sort.length; i++) {
    //         let thisEntry = array2Sort[i];
    //         let thisPlace = thisEntry.substring(thisEntry.indexOf("|") + 1);
    //         console.log("should thisPlace = ", thisPlace);
    //         let thisSibID = childrenArray[thisPlace].Id;
    //         let thisSib = thePeopleList[thisSibID];

    //         // start off by adding arrays to hold potential Sibs and Kids
    //         if (!thisSib._data["Children"]) {
    //             thisSib._data["Children"] = [];
    //         }
    //         if (!thisSib._data["Siblings"]) {
    //             thisSib._data["Siblings"] = [];
    //         }

    //         thisSib._data["birthOrder"] = i * 1 + 1.0;
    //         childrenArray[thisPlace].birthOrder = i * 1 + 1.0;

    //         if (thisSibID == peepID) {
    //             thisPeepAsSibObject.birthOrder = i * 1 + 1.0;
    //             for (let j = 0; j < i; j++) {
    //                 let thisEntry2 = array2Sort[j];
    //                 let thisPlace2 = thisEntry2.substring(thisEntry2.indexOf("|") + 1);
    //                 let thisSibID2 = childrenArray[thisPlace2].Id;
    //                 let thisSib2 = thePeopleList[thisSibID2];
    //                 pushOrUpdateSiblings(thisSib2._data.Siblings, thisPeepAsSibObject);
    //             }
    //         } else {
    //             let thisSibObject = { Id: thisSibID, siblingType: "Full", birthOrder: i * 1 + 1.0 };
    //             pushOrUpdateSiblings(thisPeep._data.Siblings, thisSibObject);
    //             pushOrUpdateSiblings(thisSib._data.Siblings, thisPeepAsSibObject);
    //         }
    //     }

    //     // NOW go through the full Childrens object all over again, and add half siblings, if any found
    //     thisPeepAsSibObject = { Id: peepID, siblingType: halfType, birthOrder: 0 };
    //     for (let i = 0; i < childrenArray.length; i++) {
    //         const kidObj = childrenArray[i];
    //         if (kidObj.coParent == otherParentID) {
    //             // Full Sibling here - ignore it
    //         } else {
    //             let kidPeep = thePeopleList[kidObj.Id];
    //             let thisSibObject = { Id: kidObj.Id, siblingType: halfType, birthOrder: 0 };
    //             // console.log("should compare :", kidPeep._data.BirthDate);
    //             pushOrUpdateSiblings(thisPeep._data.Siblings, thisSibObject);
    //             pushOrUpdateSiblings(kidPeep._data.Siblings, thisPeepAsSibObject);
    //         }
    //     }
    // }

    // // This function will Push or Update the Siblings object for a person
    // function pushOrUpdateSiblings(theSiblingsObj , incomingSibObj) {
    //     let foundSib = false;
    //     for (let i = 0; i < theSiblingsObj.length; i++) {
    //         const thisSibObj = theSiblingsObj[i];
    //         if (thisSibObj.Id == incomingSibObj.Id) {
    //             foundSib = true;
    //             theSiblingsObj[i].siblingType = incomingSibObj.siblingType;
    //             theSiblingsObj[i].birthOrder = incomingSibObj.birthOrder;
    //             break;
    //         }
    //     }
    //     if (foundSib == false) {
    //         theSiblingsObj.push(incomingSibObj);
    //     }
    // }

    // This function will load Bios in the background
    function loadBiosNow(id, whichGen = 5) {
        let options = { ancestors: 5 };
        if (whichGen > 5) {
            options = { ancestors: whichGen, minGeneration: whichGen };
        }
        console.log(
            "(loadBiosNow) GETPEOPLE",
            APP_ID,
            id,

            ["Bio"],
            options
        );
        WikiTreeAPI.getPeople(
            // (appId, IDs, fields, options = {})
            APP_ID,
            id,

            ["Bio"],
            options
        ).then(function (result) {
            SuperBigFamView.theAncestors = result[2];
            condLog("theAncestors:", SuperBigFamView.theAncestors);

            for (const ancNum in SuperBigFamView.theAncestors) {
                let thePerson = SuperBigFamView.theAncestors[ancNum];
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
    SuperBigFamView.prototype.loadMore = function (oldPerson) {
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
    SuperBigFamView.prototype._load = function (id) {
        // condLog("INITIAL _load - line:118", id) ;
        let thePersonObject = WikiTreeAPI.getPerson(APP_ID, id, SuperBigFamView.fieldNamesArray);
        // condLog("_load PersonObj:",thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    SuperBigFamView.prototype.drawTree = function (data) {
        condLog("SuperBigFamView.prototype.drawTree");

        if (data) {
            // condLog("(SuperBigFamView.prototype.drawTree WITH data !)");
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

    function getAllLeafNodes() {
        console.log(
            "GOING to get all LEAFY NODES right now!!!",
            SuperBigFamView.numAncGens2Display,
            SuperBigFamView.numDescGens2Display,
            SuperBigFamView.numCuzGens2Display,
            SuperBigFamView.displayINLAWS
        );

        let goodChunks = ["A0"];
        let theNodes = [];
        for (let aNum = 1; aNum <= SuperBigFamView.numAncGens2Display; aNum++) {
            // get all direct ancestor chunks at this A level
            goodChunks.push("A" + aNum);

            // get all the cousin levels with this direct ancestor - unless the top A level
            for (
                let cNum = 1;
                aNum < SuperBigFamView.numAncGens2Display && cNum <= SuperBigFamView.numCuzGens2Display;
                cNum++
            ) {
                goodChunks.push("A" + aNum + "C" + (cNum - 1));
            }
        }
        if (SuperBigFamView.numAncGens2Display > 0) {
            goodChunks.push("S0");
        }
        for (let dNum = 1; dNum <= SuperBigFamView.numDescGens2Display; dNum++) {
            goodChunks.push("A0" + "D" + dNum);
            if (SuperBigFamView.numAncGens2Display > 0) {
                goodChunks.push("S0" + "D" + dNum);
            }
        }

        if (SuperBigFamView.displayINLAWS > 0) {
            let currChunkLength = goodChunks.length;
            for (let ch = currChunkLength - 1; ch >= 0; ch--) {
                goodChunks.push(goodChunks[ch] + "IL");
            }
        }

        //console.log("LeafyChunks : ", goodChunks);
        for (let ch = 0; ch < goodChunks.length; ch++) {
            let chunkCode = goodChunks[ch];
            if (SuperBigFamView.theChunkCollection[chunkCode]) {
                for (let c = 0; c < SuperBigFamView.theChunkCollection[chunkCode].CodesList.length; c++) {
                    theNodes.push(
                        SuperBigFamView.theLeafCollection[SuperBigFamView.theChunkCollection[chunkCode].CodesList[c]]
                    );
                }
            }
        }

        // Last bit ... take the TOP row of Ancestors- and IF we have any Cousin levels at all (incl. showing Aunts & Uncles)
        // ... THEN ... find all R?C0 peeps and display them as well.
        if (SuperBigFamView.numCuzGens2Display > 0) {
            let lastChunkCode = "A" + SuperBigFamView.numAncGens2Display + "C0";
            if (SuperBigFamView.theChunkCollection[lastChunkCode]) {
                for (let c = 0; c < SuperBigFamView.theChunkCollection[lastChunkCode].CodesList.length; c++) {
                    let thisExtraSp =
                        SuperBigFamView.theLeafCollection[
                            SuperBigFamView.theChunkCollection[lastChunkCode].CodesList[c]
                        ];
                    let thisExtraSpCode = thisExtraSp.Code;
                    // console.log("Node check: ", thisExtraSpCode);
                    let thisExMinus2 = thisExtraSpCode.substr(-2, 1);
                    let thisExMinus4 = thisExtraSpCode.substr(-4, 1);
                    // console.log("Node check @ top level: ", thisExtraSpCode, thisExMinus4, thisExMinus2);
                    if (thisExMinus4 == "R" && thisExMinus2 == "P") {
                        theNodes.push(thisExtraSp);
                    }
                }
            }
        }

        console.log("All the Leafy Bits of Nodes:", theNodes);
        return theNodes;
    }

    /**
     * Draw/redraw the tree
     */
    Tree.prototype.draw = function () {
        condLog("Tree.prototype.draw - line2632");
        if (this.root) {
            // var nodes = thePeopleList.listAllPersons();// [];//this.tree.nodes(this.root);
            // getAllLeafNodes();

            // var nodes = SuperBigFamView.myAhnentafel.listOfAncestorsForFanChart(SuperBigFamView.numAncGens2Display + 1); // [];//this.tree.nodes(this.root);
            var nodes = getAllLeafNodes();
            condLog(
                "Tree.prototype.draw -> ready the Leafy NODES , count = ",
                nodes.length,
                "@",
                SuperBigFamView.numAncGens2Display,
                SuperBigFamView.numDescGens2Display,
                SuperBigFamView.numCuzGens2Display
            );

            SuperBigFamView.maxDiamPerGen = [];
            let widestBox = 200;
            let theBlobBuffer = 20;

            for (let i = 0; i <= SuperBigFamView.numGens2Display; i++) {
                SuperBigFamView.maxDiamPerGen[i] =
                    2 ** Math.ceil((SuperBigFamView.numGens2Display - i) / 2) *
                    (((2 + (i % 2)) * widestBox) / 3 + theBlobBuffer);
            }

            condLog("maxDiamPerGen", SuperBigFamView.maxDiamPerGen);

            updateLegendIfNeeded();
            repositionLeaves();
            this.drawNodes(nodes);
            SuperBigFamView.drawLines();
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

        condLog("this.selector = ", this.selector);

        // Get a list of existing nodes
        var node = this.svg.selectAll("g.person." + this.selector).data(nodes, function (leafObject) {
            // console.log("leafy node leafObject = ", leafObject);
            let person = thePeopleList[leafObject.Id];
            // condLog("var node: function person ? " , person.getId(), leafObject.Code);
            // return person;
            return leafObject.Code; //getId();
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
            .html((leafObject) => {
                let person = thePeopleList[leafObject.Id]; //thePeopleList[ person.id ];
                // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
                let thisGenNum = 2; // Math.floor(Math.log2(ancestorObject.ahnNum));

                let borderColor = "rgba(102, 204, 102, .5)";
                // if (person.getGender() == "Male") {
                //     // borderColor = "rgba(102, 102, 204, .5)";
                // }
                // if (person.getGender() == "Female") {
                //     // borderColor = "rgba(204, 102, 102, .5)";
                // }

                // EXTRA INFO  (ahnNum or WikiTreeID or nothing)
                let extraInfoForThisAnc = "";
                let extraBR = "";
                condLog("extraInfo setting:", SuperBigFamView.currentSettings["general_options_extraInfo"]);
                if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "ahnNum") {
                    //SuperBigFamView.currentSettings["general_options_colourizeRepeats"] == false) {
                    extraInfoForThisAnc = "[ " + 0 + " ]";
                    extraBR = "<br/>";
                } else if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "WikiTreeID") {
                    extraInfoForThisAnc = person._data.Name;
                    extraBR = "<br/>";
                } else if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "WikiTreeNum") {
                    extraInfoForThisAnc = person._data.Id;
                    extraBR = "<br/>";
                } else if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "both") {
                    if (person && person._data) {
                        extraInfoForThisAnc = "[ " + 0 + " ] " + person._data.Id + "<br/>" + person._data.Name;
                        extraBR = "<br/>";
                    }
                }

                let theClr = "white";
                // SETUP the repeatAncestorTracker
                // if (SuperBigFamView.myAhnentafel.listByPerson[person._data.Id].length > 1) {
                //     condLog(
                //         "new repeat ancestor:",
                //         SuperBigFamView.myAhnentafel.listByPerson[person._data.Id]
                //     );
                //     if (repeatAncestorTracker[person._data.Id]) {
                //         theClr = repeatAncestorTracker[person._data.Id];
                //     } else {
                //         numRepeatAncestors++;
                //         theClr = ColourArray[numRepeatAncestors % ColourArray.length];
                //         repeatAncestorTracker[person._data.Id] = theClr;
                //     }
                // }

                if (SuperBigFamView.currentSettings["general_options_colourizeRepeats"] == false) {
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
                let photoUrl = null,
                    treeUrl = window.location.pathname;

                if (person && person._data && person._data.Name) {
                    treeUrl = window.location.pathname + "?id=" + person._data.Name;
                }

                if (person && person._data.PhotoData && person._data.PhotoData && person._data.PhotoData) {
                    photoUrl = person._data.PhotoData.url;
                }

                // Use generic gender photos if there is not profile photo available
                if (!photoUrl) {
                    if (person && person.getGender() === "Male") {
                        photoUrl = "images/icons/male.gif";
                    } else {
                        photoUrl = "images/icons/female.gif";
                    }
                }

                return `<div class="top-info centered" id=wedgeInfo-${
                    leafObject.Code
                } style="background-color: ${theClr} ; padding:5, border-color:black; border:2;">
                <div class="vital-info"  id=vital-${leafObject.Code}>
                <span  id=extraInfo-${leafObject.Code}>${extraInfoForThisAnc}${extraBR}</span>
						<div class="image-box" id=photoDiv-${
                            leafObject.Code
                        } style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>
						  <div class="name fontBold font${font4Name}" id=nameDiv-${leafObject.Code}>
						    ${getSettingsName(leafObject.Code)}
						  </div>
						  <div class="birth vital font${font4Info}" id=birthDiv-${leafObject.Code}>${getSettingsDateAndPlace(person, "B")}</div>
						  <div class="death vital font${font4Info}" id=deathDiv-${leafObject.Code}>${getSettingsDateAndPlace(person, "D")}</div>
						</div>
					</div>
                    `;

                // }
            });

        // Show info popup on click
        nodeEnter.on("click", function (event, leafObject) {
            let person = thePeopleList[leafObject.Id]; //thePeopleList[ person.id ];
            event.stopPropagation();
            self.personPopup(person, d3.pointer(event, self.svg.node()), leafObject.Code);
        });

        // // Draw the plus icons
        // var expandable = node.filter(function (person) {
        //     return !person.getChildren() && (person.getFatherId() || person.getMotherId());
        // });

        // condLog("line:397 - self just before the DRAW PLUS command: ", self);
        // self.drawPlus(expandable.data());
        SuperBigFamView.myAncestorTree = self;

        // Remove old nodes
        node.exit().remove();
        node = nodeEnter.merge(node);

        // *****************************
        // *
        // * REAL MAGIC HAPPENS HERE !!! --> By adjusting the Position, we can use the underlying logic of the d3.js Tree to handle the icky stuff, and we just position the boxes using some logic and a generalized formula
        // *
        // *****************************

        // Position
        node.attr("transform", function (leafObject) {
            // NOTE:  This "transform" function is being cycled through by EVERY data point in the Tree
            // 			SO ... the logic has to work for not only the central dude(tte), but also anyone on the outer rim and all those in between
            //			The KEY behind ALL of these calculations is the Ahnentafel numbers for each person in the Tree
            //			Each person in the data collection has an .AhnNum numeric property assigned, which uniquely determines where their name plate should be displayed.

            // let d = person; //thePeopleList[ person.id ];
            // console.log("transforming with Real Magic here : ", leafObject);
            let person = thePeopleList[leafObject.Id]; //thePeopleList[ person.id ];
            let d = person;
            if (!person) {
                return;
            }
            // condLog("node.attr.transform  - line:1989 (x,y) = ", d.x, d.y, d._data.Name);

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(leafObject.Code));
            // Calculate which position # (starting lower left and going clockwise around the Super Big Family Tree) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = leafObject.Code - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;

            let theInfoBox = document.getElementById("wedgeInfo-" + leafObject.Code);
            let theVitalDIV = document.getElementById("vital-" + leafObject.Code);

            // COLOUR the div appropriately
            let thisDivsColour = getBackgroundColourFor(
                leafObject.degree,
                leafObject.Chunk,
                leafObject.Id,
                leafObject.Code
            );
            let theInfoBoxParentDIV = null;
            let settingForSpecifyByLocation = SuperBigFamView.currentSettings["colour_options_specifyByLocation"];
            let settingForColourBy = SuperBigFamView.currentSettings["colour_options_colourBy"];

            if (theInfoBox) {
                let theBounds = theInfoBox; //.getBBox();
                let theOutsideClr = "";

                theInfoBoxParentDIV = theInfoBox.parentNode;
                // condLog("POSITION node ", leafObject.Code , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                // theInfoBox.style.width = "300px";
                // theInfoBox.style.x = "-190px";

                // CENTER the DIV and SET its width to 300px
                theInfoBox.parentNode.parentNode.setAttribute("y", -100);
                theInfoBox.parentNode.parentNode.setAttribute("x", 0 - (boxWidth * 3) / 8); // was initially hardcoded as -150, when default boxWidth = 400
                theInfoBox.parentNode.parentNode.setAttribute("width", (boxWidth * 3) / 4); //// was initially hardcoded as 300

                // CHECK for LOCATION SPECIFIC DOUBLE-COLOURS SETTINGS
                if (settingForColourBy == "Location" && settingForSpecifyByLocation == "BirthDeathCountry") {
                    let locString = person._data["BirthCountry"];
                    let clrIndex = theSortedLocationsArray.indexOf(locString);
                    theOutsideClr = getColourFromSortedLocationsIndex(clrIndex);
                    // condLog("PICK ME PICK ME:", theClr, theInfoBoxParentDIV);
                    // // theClr = repeatAncestorTracker[person._data.Id];
                    // theInfoBoxParentDIV.style.backgroundColor = "yellow";

                    // condLog(
                    //     "in Transform -> theClr for repeat ancestor " + leafObject.Code + ":",
                    //     theClr
                    // );
                } else if (settingForColourBy == "Location" && settingForSpecifyByLocation == "DeathBirthCountry") {
                    let locString = person._data["DeathCountry"];
                    let clrIndex = theSortedLocationsArray.indexOf(locString);
                    theOutsideClr = getColourFromSortedLocationsIndex(clrIndex);

                    // theClr = repeatAncestorTracker[person._data.Id];
                    // theInfoBoxParentDIV.style.backgroundColor = "yellow";
                    //  condLog("PICKER ME PICKER ME:", theClr, theInfoBoxParentDIV);
                    // condLog(
                    //     "in Transform -> theClr for repeat ancestor " + leafObject.Code + ":",
                    //     theClr
                    // );
                }
                // CHECK to see if this is a Repeat Ancestor AND if ColourizeRepeats option is turned on
                else if (
                    SuperBigFamView.currentSettings["general_options_colourizeRepeats"] == true &&
                    repeatAncestorTracker[person._data.Id]
                ) {
                    thisDivsColour = repeatAncestorTracker[person._data.Id];
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
            let thisDIVtoUpdate = document.getElementById("nameDiv-" + leafObject.Code);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.textContent = getSettingsName(leafObject.Code); // REMEMBER that d = person;
            }
            // let thisNameDIV = thisDIVtoUpdate;
            // LET'S UPDATE THE BIRTH INFO !
            thisDIVtoUpdate = document.getElementById("birthDiv-" + leafObject.Code);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.innerHTML = getSettingsDateAndPlace(d, "B");
            }
            // let thisBirthIV = thisDIVtoUpdate;

            // LET'S UPDATE THE DEATH INFO !
            thisDIVtoUpdate = document.getElementById("deathDiv-" + leafObject.Code);
            if (thisDIVtoUpdate) {
                thisDIVtoUpdate.innerHTML = getSettingsDateAndPlace(d, "D");
            }
            // let thisDeathDIV = thisDIVtoUpdate;

            // LET'S UPDATE THE PHOTO !
            let photoUrl = d.getPhotoUrl(75); // will exist if there is a unique photo for this person, if not - then we can show silhouette if option says that's ok
            thisDIVtoUpdate = document.getElementById("photoDiv-" + leafObject.Code);

            if (thisDIVtoUpdate) {
                // FIRST ... let's deal with the CENTRAL PERP
                if (leafObject.Code == 1) {
                    // null case --> IF we REALLY wanted to institute the showCentralPic, then the code to check is "A0"

                    // if (SuperBigFamView.currentSettings["photo_options_showCentralPic"] == true) {
                    //     if (!photoUrl && SuperBigFamView.currentSettings["photo_options_useSilhouette"] == false) {
                    //         thisDIVtoUpdate.style.display = "none";
                    //     } else {
                    //         thisDIVtoUpdate.style.display = "block";
                    //     }
                    // } else {
                    //     thisDIVtoUpdate.style.display = "none";
                    // }
                } else {
                    // NOW DEAL with ALL THE REST
                    if (SuperBigFamView.currentSettings["photo_options_showAllPics"] == true) {
                        if (!photoUrl && SuperBigFamView.currentSettings["photo_options_useSilhouette"] == false) {
                            thisDIVtoUpdate.style.display = "none";
                        } else if (SuperBigFamView.displayPrivatize == 1 && person._data.IsLiving == true) {
                            thisDIVtoUpdate.style.display = "none";
                        } else {
                            if (
                                SuperBigFamView.currentSettings["photo_options_showPicsToN"] == true &&
                                thisGenNum >= SuperBigFamView.currentSettings["photo_options_showPicsToValue"]
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

            let theBoxTightness = SuperBigFamView.currentSettings["general_options_tightness"];
            let X = 0;
            let Y = 0;
            let i = leafObject.Code;
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

            // let vBoxHeight = SuperBigFamView.currentSettings["general_options_vBoxHeight"];
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
                            SuperBigFamView.maxDiamPerGen[g] *
                            xScaleFactor -
                        1 * SuperBigFamView.maxDiamPerGen[g] * xScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , SuperBigFamView.maxDiamPerGen[g] , "X",X);
                } else {
                    Y +=
                        0 +
                        ((i & (2 ** (thisGenNum - g))) / 2 ** (thisGenNum - g)) *
                            2 *
                            SuperBigFamView.maxDiamPerGen[g] *
                            yScaleFactor -
                        1 * SuperBigFamView.maxDiamPerGen[g] * yScaleFactor;
                    // condLog(i, g, Math.floor(g/2) , SuperBigFamView.maxDiamPerGen[g] , "Y",Y);
                }
            }
            // condLog( leafObject.Code, thisGenNum, thisPosNum, person._data.FirstName, person._data.Name , X , Y);

            let newX = X;
            let newY = Y;
            // condLog("Place",d._data.Name,"ahnNum:" + leafObject.Code,"Gen:"+thisGenNum,"Pos:" + thisPosNum, SuperBigFamView.maxAngle);

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

            let txtClrSetting = SuperBigFamView.currentSettings["colour_options_textColour"];
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
                if (theVitalDIV) {
                    theVitalDIV.classList.remove(thisFont);
                }
            }

            if (theVitalDIV) {
                theVitalDIV.classList.add(theTextFontClr);
                condLog("theTextFontClr:", theTextFontClr);
                // theVitalDIV.classList.add("fontYellow");
            } else {
                // if (theVitalDIV) {theVitalDIV.classList.add("fontBlack");}
            }

            // OK - now that we know where the centre of the universe is ... let's throw those DNA symbols into play !
            // setTimeout(function () {
            showDNAiconsIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, 0); // nameAngle = 0 ... taken from FanChart ... leaving here JUST IN CASE we turn the boxes on their side
            showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, 0);
            // }, 200);

            // LET'S UPDATE THOSE EXTRAS TOO ... OK ?
            let theExtraDIV = document.getElementById("extraInfo-" + leafObject.Code);
            let extraInfoForThisAnc = "";
            let extraBR = "";
            condLog("extraInfo setting:", SuperBigFamView.currentSettings["general_options_extraInfo"]);
            if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "ahnNum") {
                //SuperBigFamView.currentSettings["general_options_colourizeRepeats"] == false) {
                extraInfoForThisAnc = "[ " + leafObject.Code + " ]";
                extraBR = "<br/>";
            } else if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "WikiTreeID") {
                extraInfoForThisAnc = d._data.Name;
                extraBR = "<br/>";
            } else if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "WikiTreeNum") {
                extraInfoForThisAnc = d._data.Id;
                extraBR = "<br/>";
            } else if (SuperBigFamView.currentSettings["general_options_extraInfo"] == "both") {
                extraInfoForThisAnc =
                    "[ " +
                    leafObject.Code +
                    " ] " +
                    d._data.Id +
                    "<br/>" +
                    "* " +
                    leafObject.Chunk +
                    " * " +
                    d._data.Name;
                extraBR = "<br/>";
            }

            if (theExtraDIV) {
                theExtraDIV.innerHTML = extraInfoForThisAnc + extraBR;
            }

            if (leafObject.x || leafObject.x == 0) {
                newX = leafObject.x;
            } else {
                newX = Math.round(2000 * Math.random()) - 1000;
            }
            if (leafObject.y || leafObject.y == 0) {
                newY = leafObject.y;
            } else {
                newY = Math.round(2000 * Math.random()) - 1000;
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
    Tree.prototype.personPopup = function (person, xy, Code) {
        this.removePopups();
        let thisPeep = thePeopleList[person._data.Id];

        console.log("PERSON POPUP : ", SuperBigFamView.currentPopupID , person._data.Id);
        if (SuperBigFamView.currentPopupID == person._data.Id) {
            SuperBigFamView.removePopup();
            return;
        } else {
            SuperBigFamView.currentPopupID = person._data.Id;
        }
    
        console.log("PERSON POPUP : ", SuperBigFamView.currentPopupID, person._data.Id);
        // console.log("POPUP", person);
        // console.log("POPUP peep", thisPeep._data.Codes);
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

        let zoomFactor = Math.max(1, 1 / SuperBigFamView.currentScaleFactor);
        let thisPopup = document.getElementById("popupDIV");
        // console.log("IN PERSON POPUP:",thisPopup);
        // console.log("IN PERSON POPUP - this::",this);
        // console.log("IN PERSON POPUP - document::",document);
        // console.log("IN PERSON POPUP - person::",person);

        
        // var popup = this.svg
        //     .append("g")
        //     .attr("class", "popup")
        //     .attr("transform", "translate(" + xy[0] + "," + xy[1] + ")  scale(" + zoomFactor + ") ");
        
        
        
        // console.log("IN PERSON POPUP - popup::", thisPopup);

            thisPopup.classList.add("popup");
            // .attr("transform", "translate(" + xy[0] + "," + xy[1] + ")  scale(" + zoomFactor + ") ");

        let borderColor = "rgba(102, 204, 102, .5)";
        if (person.getGender() == "Male") {
            borderColor = "rgba(102, 102, 204, .5)";
        }
        if (person.getGender() == "Female") {
            borderColor = "rgba(204, 102, 102, .5)";
        }

        // console.log("IN PERSON POPUP - popup::", thisPopup);

        let popupHTML =
            `
				<div class="popup-box" style="border-color: ${borderColor}">
                
					<div class="top-info">
                    <span style="color:red; position:absolute; right:1.2em; cursor:pointer;"><a onclick="SuperBigFamView.removePopup();">` +
            SVGbtnCLOSE +
            `</a></span>
						<div class="image-box"><img src="https://www.wikitree.com/${photoUrl}"></div>
						<div class="vital-info">
						  <div class="name">
						    <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${person.getDisplayName()}</a>
						    <span class="tree-links"><a href="#name=${person.getName()}&view=fanchart"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
						    <span class="tree-links"><a href="#name=${person.getName()}&view=superbig"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/SuperBigFamTree.png" /></a></span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						  <div class="death vital">${Code}  in ${SuperBigFamView.theLeafCollection[Code].Chunk}  : ${person._data.Id} : ${
                SuperBigFamView.currentScaleFactor
            }</div>
						</div>
					</div>

				</div>
			`;
        // console.log(popupHTML);
        thisPopup.innerHTML = popupHTML;

        d3.select("#view-container").on("click", function () {
            condLog("d3.select treeViewerContainer onclick - REMOVE POPUP");
            // popup.remove();
            document.getElementById("popupDIV").innerHTML = "";
            SuperBigFamView.currentPopupID = -1;
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
        d3.selectAll(".popup").innerHTML = "";
        console.log("REMOVE POPUP SSSS");
        // SuperBigFamView.currentPopupID = -1;
    };

    SuperBigFamView.removePopup = function () {
        document.getElementById("popupDIV").innerHTML = "";
        SuperBigFamView.currentPopupID = -1;
        // console.log("REMOVE POPUP");
    }
    
    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        condLog("new var ANCESTOR TREE");

        // RESET  the # of Gens parameters
        SuperBigFamView.numAncGens2Display = 2;
        SuperBigFamView.numDescGens2Display = 1;
        SuperBigFamView.numCuzGens2Display = 0;
        SuperBigFamView.displayINLAWS = 0;
        SuperBigFamView.displayPrivatize = 0;

        SuperBigFamView.maxNumAncGens = 7;
        SuperBigFamView.maxNumDescGens = 7;
        SuperBigFamView.maxNumCuzGens = 3;

        SuperBigFamView.workingMaxNumAncGens = 3;
        SuperBigFamView.workingMaxNumDescGens = 2;
        SuperBigFamView.workingMaxNumCuzGens = 1;        

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
        for (let index = 1; index < 2 ** SuperBigFamView.numGens2Display; index++) {
            const thisPerp = thePeopleList[SuperBigFamView.myAhnentafel.list[index]];
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
                    SuperBigFamView.updateBadgesToShow(i);
                } else if (stickerList.indexOf(currentBadges[i]) > -1) {
                    document.getElementById("stickerCategoryDropDownList" + i).value =
                        categoryList.length + stickerList.indexOf(currentBadges[i]);
                    SuperBigFamView.updateBadgesToShow(i);
                }
            } else {
                SuperBigFamView.updateBadgesToShow(i);
            }
        }

        // HIDE BADGES beyond the numGens2Display
        for (let ahnNum = 2 ** SuperBigFamView.numGens2Display; ahnNum < 2 ** SuperBigFamView.maxNumGens; ahnNum++) {
            // for (let i = 1; i <= 4; i++) {
            //     const thisDIVid = "badge" + i + "-" + ahnNum + "svg";
            //     let stickerDIV = document.getElementById(thisDIVid);
            //     if (stickerDIV) {
            //         stickerDIV.parentNode.parentNode.style.display = "none";
            //     }
            // }
        }

        // Look again to see if the current outer ring needs its peeps highlighted or not
        if (SuperBigFamView.currentSettings["highlight_options_showHighlights"] == true) {
            // for (let pos = 0; pos < 2 ** (SuperBigFamView.numGens2Display - 1); pos++) {
            //     let ahnNum = 2 ** (SuperBigFamView.numGens2Display - 1) + pos;
            //     let doIt = doHighlightFor(SuperBigFamView.numGens2Display, pos, ahnNum);
            //     if (doIt == true) {
            //         let theInfoBox = document.getElementById("wedgeInfo-" + ahnNum);
            //         theInfoBox.setAttribute("style", "background-color: " + "yellow");
            //     }
            // }
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
        for (let index = 1; index < 2 ** SuperBigFamView.maxNumGens; index++) {
            const thisPerp = thePeopleList[SuperBigFamView.myAhnentafel.list[index]];
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
    function getSettingsDateAndPlace(person, dateType) {
        let datePlaceString = "";
        let thisDate = "";
        let thisPlace = "";
        if (!person || !person._data) {
            return "Unknown";
        }

        if (SuperBigFamView.displayPrivatize == 1 && person._data.IsLiving == true) {
            return "";
        }

        if (SuperBigFamView.currentSettings["date_options_dateTypes"] == "lifespan" && dateType == "B") {
            datePlaceString = getLifeSpan(person) + "<br/>";
        }

        if (dateType == "B") {
            if (SuperBigFamView.currentSettings["date_options_showBirth"] == true) {
                thisDate = settingsStyleDate(
                    person._data.BirthDate,
                    SuperBigFamView.currentSettings["date_options_dateFormat"]
                );
                if (SuperBigFamView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }

                if (
                    SuperBigFamView.currentSettings["place_options_locationTypes"] == "detailed" &&
                    SuperBigFamView.currentSettings["place_options_showBirth"] == true
                ) {
                    thisPlace = settingsStyleLocation(
                        person.getBirthLocation(),
                        SuperBigFamView.currentSettings["place_options_locationFormatBD"]
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
            if (SuperBigFamView.currentSettings["date_options_showDeath"] == true) {
                thisDate = settingsStyleDate(
                    person._data.DeathDate,
                    SuperBigFamView.currentSettings["date_options_dateFormat"]
                );
                if (SuperBigFamView.currentSettings["date_options_dateTypes"] != "detailed") {
                    thisDate = "";
                }
                if (
                    SuperBigFamView.currentSettings["place_options_locationTypes"] == "detailed" &&
                    SuperBigFamView.currentSettings["place_options_showDeath"] == true
                ) {
                    thisPlace = settingsStyleLocation(
                        person.getDeathLocation(),
                        SuperBigFamView.currentSettings["place_options_locationFormatBD"]
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
    function getSettingsName(code) {

        if (code && SuperBigFamView.theLeafCollection[code]) {
            // console.log("Person: exists ")
        } else {
            console.log("NO PERSON EXISTS for ",code);
            return "Unknown";
        }

        const person = thePeopleList[SuperBigFamView.theLeafCollection[code].Id];
        const maxLength = 50;
        // condLog("IXes : ", person._data.Prefix, person._data.Suffix);
        let theName = "";
        // condLog(
        //     "Prefix check: ",
        //     SuperBigFamView.currentSettings["name_options_prefix"], person._data
        // );
        if (!person || !person._data) {
            return "Unknown";
        }

        if (SuperBigFamView.displayPrivatize == 1 &&  person._data.IsLiving == true) {
            return "Living";
        }

        if (
            SuperBigFamView.currentSettings["name_options_prefix"] == true &&
            person._data.Prefix &&
            person._data.Prefix > ""
        ) {
            theName = person._data.Prefix + " ";
            // theName = "PRE ";
        }

        if (SuperBigFamView.currentSettings["name_options_firstName"] == "FirstNameAtBirth") {
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

        if (SuperBigFamView.currentSettings["name_options_middleName"] == true) {
            if (person._data.MiddleName > "") {
                theName += " " + person._data.MiddleName;
            }
        } else if (SuperBigFamView.currentSettings["name_options_middleInitial"] == true) {
            if (person._data.MiddleInitial > "" && person._data.MiddleInitial != ".") {
                theName += " " + person._data.MiddleInitial;
            }
        }

        if (SuperBigFamView.currentSettings["name_options_nickName"] == true) {
            if (person._data.Nicknames > "") {
                theName += ' "' + person._data.Nicknames + '"';
            }
        }

        if (SuperBigFamView.currentSettings["name_options_lastName"] == "LastNameAtBirth") {
            theName += " " + person._data.LastNameAtBirth;
        } else {
            theName += " " + person._data.LastNameCurrent;
        }

        if (
            SuperBigFamView.currentSettings["name_options_suffix"] == true &&
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
        let settingForColourBy = SuperBigFamView.currentSettings["colour_options_colourBy"];
        let settingForSpecifyByFamily = SuperBigFamView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = SuperBigFamView.currentSettings["colour_options_specifyByLocation"];
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
        let txtClrSetting = SuperBigFamView.currentSettings["colour_options_textColour"];

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
            for (let index = 1; index < 2 ** SuperBigFamView.maxNumGens; index++) {
                const thisPerp = thePeopleList[SuperBigFamView.myAhnentafel.list[index]];
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
            SuperBigFamView.currentSettings["general_options_font4Names"] == font4Name &&
            SuperBigFamView.currentSettings["general_options_font4Info"] == font4Info
        ) {
            condLog("NOTHING to see HERE in UPDATE FONT land");
        } else {
            condLog(
                "Update Fonts:",
                SuperBigFamView.currentSettings["general_options_font4Names"],
                font4Name,
                SuperBigFamView.currentSettings["general_options_font4Info"],
                font4Info
            );
            condLog(SuperBigFamView.currentSettings);

            font4Name = SuperBigFamView.currentSettings["general_options_font4Names"];
            font4Info = SuperBigFamView.currentSettings["general_options_font4Info"];

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

    SuperBigFamView.updateBadgesToShow = function (num = 1) {
        condLog("NOT !!!! UPDATING BADGES NOW !!!!", num);
        return;
        let showBadges = SuperBigFamView.currentSettings["general_options_showBadges"];
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

        for (let ahnNum = 1; ahnNum < 2 ** SuperBigFamView.numGens2Display; ahnNum++) {
            const thisDIVid = "badge" + num + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);

            let wedgeInfoDIV = document.getElementById("wedgeInfo-" + ahnNum);
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
                thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) >
                    -1 ||
                    thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
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

        for (let ahnNum = 2 ** SuperBigFamView.numGens2Display; ahnNum < 2 ** SuperBigFamView.maxNumGens; ahnNum++) {
            const thisDIVid = "badge" + num + "-" + ahnNum + "svg";
            let stickerDIV = document.getElementById(thisDIVid);
            if (stickerDIV) {
                stickerDIV.parentNode.parentNode.style.display = "none";
            }
        }
    };

    function showBadgesIfNeeded(newX, newY, thisGenNum, thisPosNum, thisRadius, nameAngle = 0) {
        return;
        const ahnNum = 2 ** thisGenNum + thisPosNum;
        if (ahnNum == 1) {
            condLog("SHOW BADGES FOR # 1 - NUMERO UNO !!!!");
        } else {
            condLog("SHOW BADGES FOR # ", ahnNum);
        }
        let SVGgraphicsDIV = document.getElementById("SVGgraphics");
        let showBadgesSetting = SuperBigFamView.currentSettings["general_options_showBadges"];
        let elem = document.getElementById("wedgeInfo-" + ahnNum).parentNode;
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
                thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]] &&
                thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio &&
                (thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(searchPrefix + rawValue) >
                    -1 ||
                    thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.bio.indexOf(
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
        return;
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

        let elem = document.getElementById("wedgeInfo-" + ahnNum).parentNode;
        condLog(elem.parentNode);

        if (elem) {
            let rect = elem.getBoundingClientRect();
            let elemParent = elem.parentNode;
            let rectParent = elemParent.getBoundingClientRect();
            thisY = newY - 0 + 1 * rect.height - 0 + 1 * elemParent.getAttribute("y") + 10;
            thisY =
                newY -
                0 +
                1 * elemParent.getAttribute("y") +
                (1 * rect.height + 2) / SuperBigFamView.currentScaleFactor;
            // condLog("SVG d3:", d3);
            // condLog("SVG scale:", d3.scale, SuperBigFamView.currentScaleFactor);
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

        if (SuperBigFamView.currentSettings["highlight_options_showHighlights"] == true) {
            if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
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
                    } else if (
                        ahnNum == 1 &&
                        thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data.Gender == "Male"
                    ) {
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
            } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
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
            } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
                ext = "X";
                dOrtho = 0;
                if (SuperBigFamView.XAncestorList.indexOf(ahnNum) > -1) {
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
            } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
                if (SuperBigFamView.XAncestorList.indexOf(ahnNum) > -1) {
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
                    } else if (
                        ahnNum == 1 &&
                        thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data.Gender == "Male"
                    ) {
                        if (dnaImgY) {
                            dnaImgY.style.display = "block";
                        }
                    }
                }
            } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
                if (ahnNum == 1) {
                    condLog(thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data);
                    if (dnaImgConfirmed) {
                        dnaImgConfirmed.style.display = "block";
                    }
                } else {
                    let childAhnNum = Math.floor(ahnNum / 2);
                    if (ahnNum % 2 == 0) {
                        // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
                        if (
                            thePeopleList[SuperBigFamView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30
                        ) {
                            if (dnaImgConfirmed) {
                                dnaImgConfirmed.style.display = "block";
                            }
                        }
                    } else {
                        // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
                        if (
                            thePeopleList[SuperBigFamView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30
                        ) {
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
            if (ext > "" && SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgX.style.display = "none";
            } else if (
                SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "XDNA" &&
                SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
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
            if (ext > "" && SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgY.style.display = "none";
            } else if (
                SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
                SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgY.style.display = "block";
            }
        }
        if (ext > "" && SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
            dnaImgY.style.display = "none";
        } else if (
            SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "YDNA" &&
            SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
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
            if (ext > "" && SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgMT.style.display = "none";
            } else if (
                SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "mtDNA" &&
                SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgMT.style.display = "block";
            }
        }

        if (dnaImgDs) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.Name) +
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
            if (ext > "" && SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgDs.style.display = "none";
            } else if (
                ext > "" &&
                SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllDs == true
            ) {
                dnaImgDs.style.display = "block";
            }
        }

        if (dnaImgAs) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.Name) +
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
            if (ext > "" && SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgAs.style.display = "none";
            } else if (
                ext > "" &&
                SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll" &&
                showAllAs == true
            ) {
                dnaImgAs.style.display = "block";
            }
        }

        if (dnaImgConfirmed) {
            let theLink =
                '<A target=_blank href="' +
                "https://www.wikitree.com/treewidget/" +
                safeName(thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.Name) +
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

            if (SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "Hide") {
                dnaImgConfirmed.style.display = "none";
            } else if (
                SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed" &&
                SuperBigFamView.currentSettings["highlight_options_howDNAlinks"] == "ShowAll"
            ) {
                dnaImgConfirmed.style.display = "block";
            }
        }
    }

    function doHighlightFor(theDegree, theChunk, theId, theCode) {
        let person = null;
        if (!thePeopleList[theId]) {
            return false;
        } else {    
            person = thePeopleList[theId];
        }
        // if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "YDNA") {
        //     if (pos == 0) {
        //         if (ahnNum > 1) {
        //             return true;
        //         } else if (ahnNum == 1 && thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data.Gender == "Male") {
        //             return true;
        //         }
        //     }
        // } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "mtDNA") {
        //     if (pos == 2 ** gen - 1) {
        //         return true;
        //     }
        // } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "XDNA") {
        //     if (SuperBigFamView.XAncestorList.indexOf(ahnNum) > -1) {
        //         return true;
        //     }
        // } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAinheritance") {
        //     if (SuperBigFamView.XAncestorList.indexOf(ahnNum) > -1) {
        //         // HIGHLIGHT by X-chromosome inheritance
        //         return true;
        //     } else if (pos == 2 ** gen - 1) {
        //         // OR by mtDNA inheritance
        //         return true;
        //     } else if (pos == 0) {
        //         // OR by Y-DNA inheritance
        //         if (ahnNum > 1) {
        //             return true;
        //         } else if (ahnNum == 1 && thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data.Gender == "Male") {
        //             return true;
        //         }
        //     }
        // } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "DNAconfirmed") {
        //     if (ahnNum == 1) {
        //         condLog(thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data);
        //         return true;
        //     } else {
        //         let childAhnNum = Math.floor(ahnNum / 2);
        //         if (ahnNum % 2 == 0) {
        //             // this person is male, so need to look at child's DataStatus.Father setting - if it's 30, then the Father is confirmed by DNA
        //             if (thePeopleList[SuperBigFamView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Father == 30) {
        //                 return true;
        //             }
        //         } else {
        //             // this person is female, so need to look at child's DataStatus.Mother setting - if it's 30, then the Mother is confirmed by DNA
        //             if (thePeopleList[SuperBigFamView.myAhnentafel.list[childAhnNum]]._data.DataStatus.Mother == 30) {
        //                 return true;
        //             }
        //         }
        //     }
        // } else
        if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "bioText") {
            let bioTextSelector = document.getElementById("highlight_options_bioText");
            condLog("Looking for BIOs that Have the following: ", bioTextSelector.value);
            condLog(person._data.bio);
            if (
                person &&
                person._data.bio &&
                person._data.bio
                    .toUpperCase()
                    .indexOf(bioTextSelector.value.toUpperCase()) > -1
            ) {
                return true;
            }
        } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "cat") {
            let catNameSelector = document.getElementById("highlight_options_catName");
            let rawValue = catNameSelector.value.trim();
            let spacelessValue = catNameSelector.value.trim().replace(/ /g, "_");
            let searchPrefix = "[[Category:";
            
            if (rawValue.length == 0) {
                return false;
            }
            if (
                person &&
                person._data.bio &&
                (person._data.bio.indexOf(searchPrefix + rawValue) >
                    -1 ||
                    person._data.bio.indexOf(
                        searchPrefix + " " + rawValue
                    ) > -1 ||
                    person._data.bio.indexOf(
                        searchPrefix + spacelessValue
                    ) > -1 ||
                    person._data.bio.indexOf(
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
                        person &&
                        person._data.bio &&
                        (person._data.bio.indexOf(
                            "{{" + catNameSelector.value
                        ) > -1 ||
                            person._data.bio.indexOf(
                                "{{ " + catNameSelector.value
                            ) > -1)
                    ) {
                        return true;
                    }
                }
            }
        } else if (SuperBigFamView.currentSettings["highlight_options_highlightBy"] == "aliveDay") {
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
                person &&
                person._data.BirthDate &&
                person._data.BirthDate <= inputDate &&
                person._data.IsLiving == false &&
                person._data.DeathDate &&
                person._data.DeathDate > inputDate
            ) {
                return true;
            } else if (
                person &&
                person._data.BirthDate &&
                person._data.BirthDate <= inputDate &&
                person._data.IsLiving == true
            ) {
                return true;
            }
        }

        return false;
    }
    function populateXAncestorList(ahnNum) {
        if (ahnNum == 1) {
            SuperBigFamView.XAncestorList = [1];
            if (thePeopleList[SuperBigFamView.myAhnentafel.list[1]]._data.Gender == "Female") {
                populateXAncestorList(2); // a woman inherits an X-chromosome from her father
                populateXAncestorList(3); // and her mother
            } else {
                populateXAncestorList(3); // whereas a man inherits an X-chromosome only from his mother
            }
        } else {
            SuperBigFamView.XAncestorList.push(ahnNum);
            if (ahnNum < 2 ** SuperBigFamView.maxNumGens) {
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

        let settingForPalette = SuperBigFamView.currentSettings["colour_options_palette"];
        let settingForColourBy = SuperBigFamView.currentSettings["colour_options_colourBy"];

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

    function getDecimalNumFromBinaryString( inp ) {
        let num = 0;
        for (let index = 0; index < inp.length; index++) {
            const element = inp[index];
            if (element == "0") {
                num = num * 2;
            } else if (element == "1") {
                num = num * 2 + 1;
            } else {
                break;
            }
        }
        return num;
    }
    function getBackgroundColourFor(theDegree, theChunk, theId, theCode) {
        // e.g.  getBackgroundColourFor(2, "A0C1", 23683923, "A0RMS07")

        // GET the settings that determine what the colouring should look like (if at all)
        let settingForColourBy = SuperBigFamView.currentSettings["colour_options_colourBy"];
        // WHILE we're here, might as well get the sub-settings if Family or Location colouring is being used ...
        let settingForSpecifyByFamily = SuperBigFamView.currentSettings["colour_options_specifyByFamily"];
        let settingForSpecifyByLocation = SuperBigFamView.currentSettings["colour_options_specifyByLocation"];
        let settingForPalette = SuperBigFamView.currentSettings["colour_options_palette"];

        let gen = theDegree;
        let pos = 1;
        let ahnNum = 2;

        const person = thePeopleList[theId];

        let thisColourArray = getColourArray();

        let overRideByHighlight = false; //
        if (SuperBigFamView.currentSettings["highlight_options_showHighlights"] == true) {
            overRideByHighlight = doHighlightFor(theDegree, theChunk, theId, theCode);
        }
        if (overRideByHighlight == true) {
            return "yellow";
        }

        if (settingForColourBy == "None") {
            return "White";
        }

        // if (ahnNum == 1 && settingForColourBy != "Location" && settingForColourBy != "Family") {
        //     return thisColourArray[0];
        // }

        let numThisGen = 2 ** theDegree;

        if (theChunk.indexOf("IL") > -1) {
            return "#E5E4E2";
        } else if (settingForColourBy == "Distance") {
            if (
                SuperBigFamView.currentSettings["colour_options_primarySiblings"] == true &&
                theCode.indexOf("A0S") > -1
            ) {
                return thisColourArray[theDegree - 1];
            } else {
                return thisColourArray[theDegree];
            }
        }

        // if (SuperBigFamView.theLeafCollection[theDegree] && SuperBigFamView.theLeafCollection[theDegree].degree > -1) {
        //     return thisColourArray[SuperBigFamView.theLeafCollection[theDegree].degree];
        // }

        if (settingForColourBy == "Gender") {
            if (person._data.Gender == "Male") {
                return thisColourArray[1];
            } else if (person._data.Gender == "Female") {
                return thisColourArray[2];
            } else {
                return thisColourArray[10];
            }
        } else if (settingForColourBy == "Generation") {
            let thisGen = 0;
            if (theChunk == "A0" || theChunk == "S0") {
                thisGen = 8;
            } else if (theChunk.indexOf("A0D") > -1 || theChunk.indexOf("S0D") > -1) {
                // down as many generations as there are Ds
                thisGen = 8 - 1 * theChunk.substr(3, 1);
                if (theCode.substr(-2, 1).indexOf("P") > -1) {
                    thisGen += 1; // partner, not a kid, so up one generation
                }
            } else if (theChunk.indexOf("A") > -1) {
                thisGen = 8 + 1 * theChunk.substr(1, 1);

                if (theChunk.indexOf("C") > -1) {
                    thisGen -= 1 * theChunk.substr(3, 1);
                    if (theCode.substr(-2, 1).indexOf("P") > -1) {
                        thisGen += 1; // partner, not a kid, so up one generation
                    }
                }
            }
            return thisColourArray[1 + (thisGen % thisColourArray.length)];
        } else if (settingForColourBy == "Ancestor") {
            if (theCode.indexOf("A0") > -1) {
                let thisNum = theCode.replace("A0", "").replace(/RM/g, "1").replace(/RF/g, "0");
                console.log("thisNum in getColourBackground : ", thisNum);

                if (thisNum.substr(0, 1) == "S") {
                    return thisColourArray[2];
                } else if (theCode == "A0" || thisNum.substr(0, 1) == "P" || thisNum.substr(0, 1) == "K") {
                    return thisColourArray[1];
                } else if (thisNum.substr(0, 1) >= "0" && thisNum.substr(0, 1) <= "9") {
                    //    if (thisNum > 1 && thisNum < 1000) {
                    thisNum = getDecimalNumFromBinaryString("1" + thisNum);
                    console.log("newNum : ", thisNum);
                    return thisColourArray[thisNum % thisColourArray.length];
                }

                return thisColourArray[0];
            } else {
                return thisColourArray[1];
            }
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
                let thisAge = thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data.age;
                if (thisAge == undefined) {
                    let thePerp = thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]];
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
            let locString = thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data[settingForSpecifyByLocation];
            if (settingForSpecifyByLocation == "BirthDeathCountry") {
                locString = thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data["DeathCountry"];
            } else if (settingForSpecifyByLocation == "DeathBirthCountry") {
                locString = thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]]._data["BirthCountry"];
            }

            if (locString == undefined) {
                let thisPerp = thePeopleList[SuperBigFamView.myAhnentafel.list[ahnNum]];
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

    function make2Digit(num) {
        if (num > 9) {
            return num;
        } else {
            return "0" + num;
        }
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
