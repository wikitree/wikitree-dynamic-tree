/*
        // *********
        // FUNCTIONS needed to create a person popup for any Tree App
        // *********

        Currently used in the Super Tree, Fan Chart, Fractal Tree, Ancestor Webs, X Family Tree, FanDoku
        
        To be added to CC7 Views in Bubble View

        */

// Put these functions into a "personPopup" namespace.
window.personPopup = window.personPopup || {};

let connectObject = {};
let currentPersonPopupID = 0;
let currentConnectionPopupID = 0;
let showOrangeArrows = true;
let showConfidenceImages = false;
let doAlternateColouring = false;
let embedProfileLinks = false;
let showBothParents = false;
let showPathDescriptions = false;
let getConnectionsObjects = {};
let pathDescriptionsHTML = [];
let currentPathNum = 0;
let directionFromTo = "From";
let foundLastPerson = null;
let fromAhnConnectionsResult = null;
let doOverRideConnectionType = -1;
let isHalfRelationship = false;

let copyPathDescriptionIcon = `<span id=copyConnectionDescriptionICON class="icon--copy" aria-label="Copy Connection Description" data-bs-toggle="tooltip" data-bs-title="Copy Connection Description" 
        style=" width: 30px; background-size: 35px 18px;" onclick=copyConnectionDescription();></span>`;

// Returns an array [x , y] that corresponds to the endpoint of rθ from (centreX,centreY)
personPopup.popupHTML = function (person, connectionObj = {}, appIcon = "", appView = "") {
    console.log("Popup for ", person, connectionObj);
    connectObject = connectionObj;

    let personData = person._data;
    if (!personData) {
        personData = person;
        condLog(thePeopleList);
    }

    if (!personData.LongName) {
        personData.LongName = personData.BirthNamePrivate;
    }

    let thisPopup = document.getElementById("popupDIV");
    // IF we have just clicked the cell to "display" the current popup, and it's already open, then we should shut it down
    if (thisPopup.style.display == "block" && currentPersonPopupID == personData.Id) {
        $("#popupDIV").slideUp("fast");
        currentPersonPopupID = 0;
        return;
    }
    // else ... make it visible by changing it to "block"
    thisPopup.style.display = "block";

    currentPersonPopupID = personData.Id;
    thisPopup.classList.add("popup");
    thisPopup.classList.add("pop-up");

    if (connectObject.appID == "SuperBigTree") {
        if (window.rootId == undefined) {
            if (
                connectObject &&
                connectObject.leafCollection &&
                connectObject.leafCollection["A0"] &&
                connectObject.leafCollection["A0"].Id
            ) {
                window.rootId = connectObject.leafCollection["A0"].Id;
                rootId = connectObject.leafCollection["A0"].Id;
            }
        }
        connectObject.personID = connectObject.person._data.Id;
    } else if (connectObject.type == "Ahn") {
        // Handle the case for another app ID if needed
        window.rootId = connectObject.primaryPerson._data.Id;
        rootId = connectObject.primaryPerson._data.Id;
        connectObject.personID = connectObject.primaryPerson._data.Id;
    }

    thisPopup.style.zIndex = 9998; // give a default zIndex, in case there is no SettingsObj defined ...
    if (connectObject.SettingsObj) {
        // but, if there IS one, then use it to assign a new zIndex.
        // condLog("FOUND Settings to get next z level", thisPopup.style.zIndex);
        thisPopup.style.zIndex = connectObject.SettingsObj.getNextZLevel();
        // condLog("CHANGED next z level", thisPopup.style.zIndex);
    }

    let displayName4Popup = person.getDisplayName();
    var photoUrl = person.getPhotoUrl(75),
        treeUrl = window.location.pathname + "?id=" + person.getName();

    // Use generic gender photos if there is not profile photo available
    if (!photoUrl || (SuperBigFamView.displayPrivatize == 1 && person._data.IsLiving == true)) {
        if (person.getGender() === "Male") {
            photoUrl = "images/icons/male.gif";
        } else if (person && person.getGender() === "Female") {
            photoUrl = "images/icons/female.gif";
        } else {
            photoUrl = "images/icons/no-gender.gif";
        }
    }

    const SVGbtnDESC = `<svg width="30" height="30" viewBox="0 0 30 30" stroke="#25422d" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M 4 5 L 10 5 L 10 9 L 24 9 M 16 9 L 16 13 L 24 13 M 10 9 L 10 19 L 24 19 M 16 19 L 16 23 L 24 23 M 16 23 L 16 27 L 24 27" fill="none" />
        </svg>`;

    let borderColor = "rgba(102, 204, 102, .5)";
    if (person.getGender() == "Male") {
        borderColor = "rgba(102, 102, 204, .5)";
    }
    if (person.getGender() == "Female") {
        borderColor = "rgba(204, 102, 102, .5)";
    }

    let extrasAtBottom =
        "WikiTree ID: " +
        personData.Name +
        `&nbsp;&nbsp;<button aria-label="Copy ID" class="copyWidget x-widget borderless" onclick='copyDataText(this);' data-copy-text="` +
        personData.Name +
        `" style="color:#8fc641; background:white; padding:2px; font-size:16px;" accesskey="i"><img src="https://wikitree.com/images/icons/scissors.png">ID</button>`;

    let bioCheckLink = `<A target=_blank href="https://apps.wikitree.com/apps/sands1865/biocheck/?action=checkProfile&numAncestorGen=0&numDescendantGen=0&checkStart=auto&profileId=${person.getName()}">Bio Check</A>`;

    let marriageInfo = "";

    if (personData.Spouses && personData.Spouses.length == 1) {
        if (personData.Spouses[0].NotMarried == 1) {
            marriageInfo = "";
        } else {
            if (personData.Spouses[0].DoNotDisplay == 1) {
                marriageInfo = "";
            } else {
                marriageInfo = "<br/><B>Spouse</B>";
            }
        }
    } else if (personData.Spouses && personData.Spouses.length > 1) {
        let numShowableMarriages = 0;
        for (let sp in personData.Spouses) {
            if (personData.Spouses[sp].DoNotDisplay == 0) {
                numShowableMarriages++;
            }
        }

        marriageInfo = "<br/><B>Spouse" + (numShowableMarriages > 1 ? "s" : "") + "</B>";
    }

    if (!personData.SpousesOrdered) {
        let orderedPartners = [];
        for (let sp in personData.Spouses) {
            const thisPartner = personData.Spouses[sp];
            orderedPartners.push(thisPartner.marriage_date + "|" + thisPartner.Id);
        }
        orderedPartners = orderedPartners.sort();
        if (thePeopleList && thePeopleList[personData.Id]) {
            thePeopleList[personData.Id]._data.SpousesOrdered = orderedPartners;
        }
        personData.SpousesOrdered = orderedPartners;
        condLog("SPOUSES ORDERED  - HERE !");
    }

    let numSpousesListed = 0;
    condLog(personData.SpousesOrdered);
    for (let ord = 0; ord < personData.SpousesOrdered.length; ord++) {
        const spouseOrdered = personData.SpousesOrdered[ord];
        let spID = spouseOrdered.substr(spouseOrdered.indexOf("|") + 1);
        let prepMarriageInfo = "";
        condLog("spID = ", spID);
        // condLog(window.people.get(1.0 * spID));

        let theSpouseData = null;
        if (spID > 0 && thePeopleList && thePeopleList[spID] && thePeopleList[spID]._data) {
            theSpouseData = thePeopleList[spID]._data;
        } else if (spID > 0 && theSpouseData == null && window.people) {
            theSpouseData = window.people.get(1.0 * spID);
        }

        condLog({ theSpouseData });

        if (spID > 0 && theSpouseData != null) {
            if (theSpouseData.FirstName == "Private" && theSpouseData.LastNameAtBirth == "") {
                // marriageInfo += "Private";
            } else {
                prepMarriageInfo +=
                    `<a href="https://www.wikitree.com/wiki/` +
                    theSpouseData.Name +
                    `" target="_blank">` +
                    theSpouseData.FirstName +
                    " " +
                    theSpouseData.LastNameAtBirth +
                    `</a>`;
            }

            condLog(" personData.Spouses:", personData.Spouses);
            for (let sp = 0; sp < personData.Spouses.length; sp++) {
                const marriage = personData.Spouses[sp];

                if (
                    marriage &&
                    marriage.Id > 0 &&
                    spID == marriage.Id &&
                    marriage.DoNotDisplay != 1 &&
                    marriage.NotMarried != 1
                ) {
                    let marriageDate = "";
                    let marriagePlace = "";
                    if (marriage.marriage_date > "0000-00-00") {
                        marriageDate = marriage.marriage_date;

                        /*  let thisDate = settingsStyleDate(
                            marriageDate,
                            SuperBigFamView.currentSettings["date_options_dateFormat"]
                        );
                        if (marriage.data_status && marriage.data_status["marriage_date"] && thisDate > "") {
                            if (marriage.data_status["marriage_date"] > "") {
                                let tmpUse =
                                    QualifiersArray[SuperBigFamView.currentSettings["date_options_qualifiers"]][
                                        marriage.data_status["marriage_date"]
                                    ];
                                thisDate = tmpUse + thisDate;
                                // condLog("USE a MARRIAGE Qualifier for popup: ", tmpUse);
                            }

                            // if (person._data.DataStatus.BirthDate == "before") {
                            //     thisDate = "< " + thisDate;
                            // } else if (person._data.DataStatus.BirthDate == "after") {
                            //     thisDate = "> " + thisDate;
                            // } else if (person._data.DataStatus.BirthDate == "guess") {
                            //     thisDate = "~ " + thisDate;
                            // }
                        }

                        marriageDate = thisDate; //marriageDate.replace(/-00/g, ""); */
                    }

                    if (marriage.marriage_location > "0000-00-00") {
                        marriagePlace = marriage.marriage_location;
                    }
                    if (marriageDate > "" || marriagePlace > "") {
                        // marriageInfo += "<br/>m. ";
                        if (marriageDate > "") {
                            prepMarriageInfo +=
                                ", <span class='marriage vital'>m. <strong>" + humanDate(marriageDate) + "</strong>";
                            if (marriagePlace > "") {
                                prepMarriageInfo += " in " + marriagePlace;
                            }
                            prepMarriageInfo += "</span>";
                        } else if (marriagePlace > "") {
                            prepMarriageInfo += ", <span class='marriage vital'>m. " + marriagePlace + "</span>";
                        }
                    }

                    // if (numSpousesListed > 0 && spID > 0) {
                    // marriageInfo += "<br/>m. ";
                    // }
                    marriageInfo += "<br/>" + prepMarriageInfo;
                    numSpousesListed++;
                }
            }
        }
    }

    if (marriageInfo > "") {
        marriageInfo += "<br/>";
    }

    let appIcon4Bottom = "";
    if (appIcon > "" && appView > "") {
        appIcon = appIcon.replace("20px", "30px");
        appIcon4Bottom =
            "<BR/><BR/>" + `<span ><a href="#name=${person.getName()}&view=${appView}">${appIcon}</a></span>`;
    }
    let connectionIcon = `<br/><br/><A onclick=popupConnectionDIV() title="View how this person is connected to the Primary Person in this Tree"><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-connect.svg"></A>`;

    if (connectObject.type == "Ahn") {
        if (connectObject.ahNum == 1 || connectObject.ahNum == [1]) {
            connectionIcon = `<br/><br/><A onclick=document.getElementById('customPathEntryDIV').style.display='block'; title="Open up form to show a custom connection path between two people."><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-connect.svg"><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-relationship.svg"></A>`;
        }
    } else if (rootId && rootId == connectObject.personID) {
        connectionIcon = `<br/><br/><A onclick=document.getElementById('customPathEntryDIV').style.display='block'; title="Open up form to show a custom connection path between two people."><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-connect.svg"><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-relationship.svg"></A>`;
    }

    if (connectObject && connectObject.extra && connectObject.extra.hideConnectionIcon == true) {
        connectionIcon = "";
    }
    if (connectObject && connectObject.extra && connectObject.extra.degree > "") {
        connectionIcon += "<br/><span class='vital'>" + connectObject.extra.degree + "</span><br/>";
    }

    if (connectObject.extra && connectObject.extra.hideSpouse == true) {
        marriageInfo = "";
    }

    let popupHTML =
        `
            <div class="popup-box" style="border-color: ${borderColor}">
            
                <div class="top-info">
                <span style="color:red; position:absolute; right:-0.2em; top:-0.2em; cursor:pointer;"><a onclick="SuperBigFamView.removePopup();">` +
        SVGbtnCLOSE +
        `</a></span>
                    <div class="image-box"><img src="https://www.wikitree.com/${photoUrl}">
                    ${connectionIcon}
                    </div>
                    <div class="vital-info">
                        <div class="name">
                        <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${displayName4Popup}</a>
                        <span class="tree-links"><a href="#name=${person.getName()}&view=fanchart" title="View this person's Ancestors in a Fan Chart"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
                        <span class="tree-links"><a href="#name=${person.getName()}&view=descendants" title="View this person's Descendants list">${SVGbtnDESC}</a></span>
                        <span class="tree-links"><a href="#name=${person.getName()}&view=superbig"  title="View this person's Super (big family) Tree"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/SuperBigFamTree.png" /></a></span>
                        </div>
                        <div class="birth vital">${birthString(person)}</div>
                        <div class="death vital">${deathString(person)}</div>						  
                        
                        ${marriageInfo}

                        <hr class="treeapp-personpopup"/>
                        ${extrasAtBottom}
                        <br/>${bioCheckLink}
                        ${appIcon4Bottom}
                    </div>

                    
                    </div>
                    
                    <div id="customPathEntryDIV" style="display:none;">
                        <hr><br>
                        <table>
                        <tr>
                        <td colspan=3>
                        Enter WikiTree ID to see Path to ${personData.LongName}<br>
                        </td>
                        </tr>
                        <tr>
                        <td>
                        <input id="pathID2" type="text">&nbsp;&nbsp;&nbsp;
                        </td>
                        <td align="center">
                        <A onclick=callPopupConnectionFromOverride(0) title="View how this person is connected to the Primary Person in this Tree"><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-connect.svg"></A>
                        <br>&nbsp;connection&nbsp;
                        </td>
                        <td align=center>
                        <A onclick=callPopupConnectionFromOverride(2) title="View how this person is related to the Primary Person in this Tree"><img style="height:24px; cursor:pointer; transform:rotate(270deg);" src="https://www.wikitree.com/images/icons/icon-relationship.svg"></A>
                        <br>&nbsp;relationship&nbsp;
                        </td>
                        </tr>
                        </table>
                    </div>
            </div>
        `;

    thisPopup.innerHTML = popupHTML;

    return "Pop!";
    // };
};

function breakDownCC7Code(longCode) {
    let CCcodes = [["A0", "A0"]]; // build up an array of arrays - for each person in the chain, made up of:
    let currIndiCode = "A0"; // individual code for next link in the chain (RM / RF / Sn / Pn / Kn)
    let currBuiltCode = "A0"; // unique full code identifier for this person in the chain (from A0 up to currIndiCode)
    // FIRST person will have currBuiltCode of A0 / LAST person (the one whose popup we're currently viewing) will have currBuiltCode == longCode
    // Others will have something in between those extremes

    let currPos = 0; // position in the longCode string

    if (longCode == "A0" || longCode.length < 2 || longCode.substr(0, 2) != "A0") {
        return CCcodes;
    }

    // OK - so - it appears that we are dealing with a LEGIT longCode, we can move onto position 2 of the string (0 positioning remember, so 3rd character, the one after A0 ...)
    currPos = 2;
    while (currPos < longCode.length) {
        if (longCode[currPos] == "R" || longCode[currPos] == "B") {
            // paRENTS and BIOparents
            currIndiCode = longCode.substr(currPos, 2);
            currBuiltCode += currIndiCode;
            currPos += 2;
        } else {
            // SIBlings and KIDS and PARTNERS
            currIndiCode = longCode.substr(currPos, 3);
            currBuiltCode += currIndiCode;
            currPos += 3;
        }
        CCcodes.push([currIndiCode, currBuiltCode]);
    }

    return CCcodes;
}

async function popupConnectionDIV(doReverse = "", pathNum = 0, overrideLastPersonID = "", doRelationship = -1) {
    if (doRelationship == -1) {
        doRelationship = 0;
        if (overrideLastPersonID != "") {
            doRelationship = doOverRideConnectionType;
        }
    } else {
        doOverRideConnectionType = doRelationship;
    }
    condLog(
        "POP UP - Connection SVG pod !",
        connectObject.appID,
        connectObject.type,
        { doReverse },
        { overrideLastPersonID },
        { doRelationship }
    );
    directionFromTo = "From";
    if (doReverse == "true" || doReverse == true) {
        directionFromTo = "To";
    }

    currentPathNum = pathNum;
    isHalfRelationship = false;

    if (FanChartView.currentSettings["popup_options_showOrangeArrows"] == false) {
        showOrangeArrows = false;
    } else {
        showOrangeArrows = true;
        FanChartView.currentSettings["popup_options_showOrangeArrows"] = true;
    }

    if (FanChartView.currentSettings["popup_options_showConfidenceImages"] == true) {
        showConfidenceImages = true;
    } else {
        FanChartView.currentSettings["popup_options_showConfidenceImages"] = false;
        showConfidenceImages = false;
    }

    if (FanChartView.currentSettings["popup_options_doAlternateColouring"] == true) {
        doAlternateColouring = true;
    } else {
        FanChartView.currentSettings["popup_options_doAlternateColouring"] = false;
        doAlternateColouring = false;
    }

    if (FanChartView.currentSettings["popup_options_embedProfileLinks"] == true) {
        embedProfileLinks = true;
    } else {
        FanChartView.currentSettings["popup_options_embedProfileLinks"] = false;
        embedProfileLinks = false;
    }

    if (FanChartView.currentSettings["popup_options_showBothParents"] == true) {
        showBothParents = true;
    } else {
        FanChartView.currentSettings["popup_options_showBothParents"] = false;
        showBothParents = false;
    }

    if (FanChartView.currentSettings["popup_options_showPathDescriptions"] == true) {
        showPathDescriptions = true;
    } else {
        FanChartView.currentSettings["popup_options_showPathDescriptions"] = false;
        showPathDescriptions = false;
    }

    let thisPopup = document.getElementById("connectionPodDIV");
    let getConnectionsPath = [];

    if (currentConnectionPopupID == currentPersonPopupID && doReverse === "") {
        $("#connectionPodDIV").slideUp("fast");
        currentConnectionPopupID = 0;
        return;
    }

    currentConnectionPopupID = currentPersonPopupID;

    thisPopup.style.display = "block";

    // thisPopup.classList.add("popup");
    thisPopup.classList.add("pop-up");
    thisPopup.style.zIndex = 9999;

    if (connectObject.SettingsObj) {
        // condLog("CONNECTIONS POD: FOUND Settings to get next z level", thisPopup.style.zIndex);
        thisPopup.style.zIndex = connectObject.SettingsObj.getNextZLevel();
        // condLog("CONNECTIONS POD: CHANGED next z level", thisPopup.style.zIndex);
    }

    condLog("See anything??", connectObject);

    let popupHTML =
        `
            <div class="popup-box" style="border-color: green">
            
                <div class="top-info">
                <span style="color:red; position:absolute; right:-0.2em; top:-0.2em; cursor:pointer;"><a onclick="SuperBigFamView.removePodDIV();">` +
        SVGbtnCLOSE +
        `</a></span>  `;

    let connectionHTML = "";

    let bkgdColours = ["lightgreen", "lightyellow"];
    let currentBkgdColour = "pink";
    let thisBkgdColourNum = 0;

    let bubbleWidth = 200;
    let bubbleHeight = 64;
    let bubbleHeightSpacer = 30;
    let bubbleWidthSpacer = 66;

    pathDescriptionsHTML = [];

    let currentFromDescription = "";
    let currentToDescription = "";
    let currentFromDescriptionColour = "";
    let currentToDescriptionColour = "";

    let currentFromExtender = "";
    let currentToExtender = "";
    let currentFromExtenderColour = "";
    let currentToExtenderColour = "";

    let MRCAperson = null;
    fromAhnConnectionsResult = null;

    if (connectObject.type == "Ahn") {
        thisBkgdColourNum = 0;
        // IF there are MULTIPLE paths to connect the popup person to the primary person, then we need an ARRAY for all the Ahnentafel Numbers
        let ahnNumArray = connectObject.ahNum;
        // IF there are MULTIPLE primary persons (like with the Ancestor Webs app), then we need an ARRAY for all the Ahnentafels - a LIST of them, so to speak
        let listArray = [];

        if (typeof connectObject.ahNum == "number") {
            ahnNumArray = [connectObject.ahNum];
        }

        let thisListNum = 0; // assuming only one list, default for all apps, and the initial part of Ancestor Webs as well in fact
        if (connectObject.whichList && connectObject.listOfAhnentafels && connectObject.whichList > 0) {
            // IF the person is from an Added person (in Ancestor Webs) and not the default list, find out its list number (whichList parameter)
            thisListNum = connectObject.whichList;
        }

        for (let aa = 0; aa < ahnNumArray.length; aa++) {
            // By default, we will only have the set of Ahnentafel numbers from one List, which might be the only list in most cases
            // So ... we need to assign that list number to all of them, by default
            listArray[aa] = thisListNum;
        }

        // IF there are multiple lists, then we need to check to see if this person shows up in multiple lists
        if (connectObject.listOfAhnentafels && connectObject.listOfAhnentafels.length > 1) {
            // Let's REBUILD the ahnNumArray and listArray from scratch, to be sure we've got every connection possible
            ahnNumArray = [];
            listArray = [];
            for (let l = 0; l < connectObject.listOfAhnentafels.length; l++) {
                // FIND the person in this new list
                if (
                    connectObject.listOfAhnentafels[l].listByPerson[currentConnectionPopupID] &&
                    connectObject.listOfAhnentafels[l].listByPerson[currentConnectionPopupID].length > 0
                ) {
                    // IF found, then find out the array of ahnen numbers (in case that person is a repeat ancestor)
                    let nextListAhnArray = connectObject.listOfAhnentafels[l].listByPerson[currentConnectionPopupID];
                    condLog("FOUND a SET !", { l }, nextListAhnArray);
                    // AND for each of those... add that Ahnen number AND the List number to the arrays we use in the loop below
                    for (let ll = 0; ll < nextListAhnArray.length; ll++) {
                        const listNahnum = nextListAhnArray[ll];
                        ahnNumArray.push(listNahnum);
                        listArray.push(l);
                    }
                    // By default, we will only have the set of Ahnentafel numbers from one List, which might be the only list in most cases
                    // So ... we need to assign that list number to all of them, by default
                }
            }
        }

        if (overrideLastPersonID > "") {
            thisPopup.innerHTML = "Please wait while I research this relationship ...";
            condLog("Override last person ID:", overrideLastPersonID);
            let theNamesToConnect = [connectObject.primaryPerson.getName(), overrideLastPersonID];
            let theNamesIndex =
                connectObject.primaryPerson.getName() + ":" + overrideLastPersonID + ":" + doOverRideConnectionType;
            if (doReverse == true) {
                theNamesToConnect = [overrideLastPersonID, connectObject.primaryPerson.getName()];
                theNamesIndex =
                    overrideLastPersonID + ":" + connectObject.primaryPerson.getName() + ":" + doOverRideConnectionType;
            }

            if (getConnectionsObjects && getConnectionsObjects[theNamesIndex]) {
                // Already been around this rodeo ... let's just retrieve what we did in the past
                condLog("Retrieving cached connections for:", theNamesIndex);
                fromAhnConnectionsResult = getConnectionsObjects[theNamesIndex];

                ahnNumArray = []; // Reset the array to the empty array so it doesn't go through the process of building the traditional Ahnentafel number path
                connectObject.type = "CC"; // change the connection type to "CC" for cousin connection, and re-use the code developed for CC7 and SuperTree cousin connections
                connectObject.appID = "fromAhn";
            } else {
                let theOptions = {};
                let theRelation = Math.max(0, doOverRideConnectionType);
                await WikiTreeAPI.getConnections(
                    "popupGetConnections",
                    theNamesToConnect,
                    [
                        "Id",
                        "Derived.BirthName",
                        "Derived.BirthNamePrivate",
                        "FirstName",
                        "RealName",
                        "Derived.LongName",
                        "MiddleInitial",
                        "LastNameAtBirth",
                        "LastNameCurrent",
                        "BirthDate",
                        "BirthLocation",
                        "DeathDate",
                        "DeathLocation",
                        "Mother",
                        "Father",
                        "BioMother",
                        "BioFather",
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
                    theOptions,
                    theRelation
                ).then(function (connResult) {
                    if (connResult) {
                        condLog("Found a connection result !", connResult);
                        fromAhnConnectionsResult = connResult;
                        if (connResult.path && connResult.path.length > 0) {
                            let connectionPath = "The path found: " + connResult.path[0].BirthNamePrivate;
                            let theCode = "A0";
                            usedGetConnections = true;
                            foundLastPerson = connResult.path[connResult.path.length - 1];
                            condLog({ foundLastPerson });
                            lastPersonName = foundLastPerson.LongName;
                            condLog({ lastPersonName }, foundLastPerson["LongName"]);
                            for (let p = 1; p < connResult.path.length; p++) {
                                let thisPerson = connResult.path[p];
                                condLog({ thisPerson });
                                lastPersonName = thisPerson.RealName + " " + thisPerson.LastNameAtBirth;
                                if (overrideLastPersonID > "") {
                                    if (doReverse == true) {
                                        lastPersonName = connectObject.lastPersonName;
                                    } else {
                                        connectObject.lastPersonName = lastPersonName;
                                    }
                                }
                                condLog({ lastPersonName }, thisPerson["LongName"]);
                                connectionPath +=
                                    " -> (" +
                                    thisPerson.pathType +
                                    " , " +
                                    thisPerson.pathStatus +
                                    ") " +
                                    thisPerson.BirthNamePrivate;
                                if (thisPerson.pathType == "parent") {
                                    if (thisPerson.Gender == "Male") {
                                        theCode += "RM";
                                    } else if (thisPerson.Gender == "Female") {
                                        theCode += "RF";
                                    } else {
                                        theCode += "RM";
                                    }
                                } else if (thisPerson.pathType == "bioparent") {
                                    if (thisPerson.Gender == "Male") {
                                        theCode += "BM";
                                    } else if (thisPerson.Gender == "Female") {
                                        theCode += "BF";
                                    } else {
                                        theCode += "BM";
                                    }
                                } else if (thisPerson.pathType == "child" || thisPerson.pathType == "biochild") {
                                    theCode += "K01";
                                } else if (thisPerson.pathType == "sibling" || thisPerson.pathType == "biosibling") {
                                    theCode += "S01";
                                } else if (thisPerson.pathType == "spouse") {
                                    theCode += "P01";
                                }
                            }
                            condLog({ lastPersonName }, foundLastPerson["LongName"]);
                            thisPopup.innerHTML = connectionPath;
                            condLog({ theCode });
                            codesList = [theCode];
                            getConnectionsPath = connResult.path;
                            connResult.codesList = codesList;
                            connResult.connectionPath = connectionPath;
                            getConnectionsObjects[theNamesIndex] = connResult;

                            ahnNumArray = []; // Reset the array to the empty array so it doesn't go through the process of building the traditional Ahnentafel number path
                            connectObject.type = "CC"; // change the connection type to "CC" for cousin connection, and re-use the code developed for CC7 and SuperTree cousin connections
                            connectObject.appID = "fromAhn";
                        } else {
                            console.log("No relationship path found !");
                            if (doOverRideConnectionType == 2) {
                                popupHTML =
                                    "Cannot draw this Relationship Path at this time.<BR><BR>Possible reasons:<BR> * " +
                                    overrideLastPersonID +
                                    " is not a direct relative <BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Invalid WikiTree ID";
                            } else {
                                popupHTML =
                                    "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                            }
                            thisPopup.innerHTML = popupHTML;
                            ahnNumArray = []; // Reset the array to the empty array so it doesn't go through the process of building the traditional Ahnentafel number path
                        }
                    } else {
                        console.log("Need to know there is NO getConnections RESULT !");
                        if (doOverRideConnectionType == 2) {
                            popupHTML =
                                "Cannot draw this Relationship Path at this time.<BR><BR>Possible reasons:<BR> * " +
                                overrideLastPersonID +
                                " is not a direct relative <BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Invalid WikiTree ID";
                        } else {
                            popupHTML =
                                "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                        }
                        thisPopup.innerHTML = popupHTML;
                        ahnNumArray = []; // Reset the array to the empty array so it doesn't go through the process of building the traditional Ahnentafel number path
                    }
                });
            }
        }
        condLog("Connect a thon:");
        condLog({ ahnNumArray });
        condLog({ listArray });

        let prevPerson = null;
        let pathsButtonsHTML = "Path: ";
        for (let aa = 0; aa < ahnNumArray.length; aa++) {
            thisBkgdColourNum = 0;
            pathsButtonsHTML +=
                "<button class='switchPathButton' id='switchPathButton" +
                aa +
                "' style='border-radius:30px; background-color:" +
                (aa == pathNum ? "orange" : "lightgray") +
                ";' onclick='switchPathDisplayed(" +
                aa +
                ")'>" +
                (aa + 1) +
                "</button> ";
            var ahnNum = ahnNumArray[aa];
            let listNum = listArray[aa];

            let SVGhtml = "";
            let ySVG = 10;
            let bubbleWidth = 200;
            let bubbleHeight = 64;

            currentFromExtender = ""; // start fresh for each iteration
            currentToExtender = ""; // start fresh for each iteration
            currentFromExtenderColour = ""; // start fresh for each iteration
            currentToExtenderColour = ""; // start fresh for each iteration

            thisPopup.innerHTML =
                "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                "Josh Azariah Ashley" +
                "</text></svg>";
            condLog("Width of ", "Josh Azariah Ashley", document.getElementById("testTextLength").clientWidth);
            condLog({ ahnNum }, typeof connectObject.ahNum);

            let maxWidth4NoSquishing = document.getElementById("testTextLength").clientWidth;

            let firstPerson = null;
            let lastPerson = null;

            if (connectObject.listOfAhnentafels && connectObject.listOfAhnentafels.length > 1) {
                firstPerson = thePeopleList[connectObject.listOfAhnentafels[listNum].list[1]];
                lastPerson = thePeopleList[connectObject.listOfAhnentafels[listNum].list[ahnNum]];
            } else {
                firstPerson = thePeopleList[connectObject.myAhnentafel.list[1]];
                lastPerson = thePeopleList[connectObject.myAhnentafel.list[ahnNum]];
            }

            MRCAperson = lastPerson;

            let firstPersonName = firstPerson.getDisplayName();
            let lastPersonName = lastPerson.getDisplayName();

            // pathDescriptionsHTML = [];
            // pathDescriptionsHTMLcolour = [];

            currentFromDescription = "<B>" + lastPersonName + "</B> is <B>" + firstPersonName + "</B>'s " + " ";
            currentToDescription = "<B>" + firstPersonName + "</B> is <B>" + lastPersonName + "</B>'s " + " ";

            currentFromDescriptionColour =
                "<B>" +
                lastPersonName +
                "</B> is <span style='background-color:lightgreen;'><B>" +
                firstPersonName +
                "</B></span>'s " +
                " <span style='background-color:lightgreen;'>";
            currentToDescriptionColour =
                "<B>" +
                firstPersonName +
                "</B> is <span style='background-color:lightgreen;'><B>" +
                lastPersonName +
                "</B></span>'s " +
                " <span style='background-color:lightgreen;'>";

            let howManyGens = 0;
            let isFirstPass = true;
            while (ahnNum >= 1) {
                howManyGens++; // count how many generations are in this path
                theBothParentsText = "";
                theBothParentsText2 = "";

                if (connectObject.listOfAhnentafels && connectObject.listOfAhnentafels.length > 1) {
                    person = thePeopleList[connectObject.listOfAhnentafels[listNum].list[ahnNum]];
                    personSpouse =
                        thePeopleList[
                            connectObject.listOfAhnentafels[listNum].list[ahnNum + (ahnNum % 2 == 0 ? 1 : -1)]
                        ];
                } else {
                    person = thePeopleList[connectObject.myAhnentafel.list[ahnNum]];
                    personSpouse = thePeopleList[connectObject.myAhnentafel.list[ahnNum + (ahnNum % 2 == 0 ? 1 : -1)]];
                }

                if (person && personSpouse) {
                    theBothParentsText = personSpouse.getDisplayName() || "";
                }

                let basicArrowWidth = 3;
                let shiftLeftUpDown = 15;
                let shiftLeftRight = bubbleWidth + 25;
                let shiftUp4UpDown = -15;
                let shiftUp4Right = 5;
                let initialOrangeArrowsDisplayMode = showOrangeArrows
                    ? "style='display:revert' "
                    : "style='display:none' ";
                displayOrangeArrowStyle = showOrangeArrows ? " display:revert;  " : " display:none;  ";
                let showTallConnectorsForOrangeArrowStyle = !showOrangeArrows
                    ? " display:revert;  "
                    : " display:none;  ";
                let initialConfidenceImagesDisplayMode = showConfidenceImages
                    ? "style='display:revert' "
                    : "style='display:none' ";
                let initialAlternateColouringDisplayMode = doAlternateColouring
                    ? "style='display:revert' "
                    : "style='display:none' ";
                let svgArrowUp =
                    "<polyline " +
                    initialOrangeArrowsDisplayMode +
                    "class=OrangeArrow fill='orange' stroke='orange' points='";
                let svgArrowDown = svgArrowUp;

                let basicArrowUp = [
                    [0, -4],
                    [3, 0],
                    [1, 0],
                    [1, 4],
                    [-1, 4],
                    [-1, 0],
                    [-3, 0],
                    [0, -4],
                ];
                let basicArrowDown = basicArrowUp.map((pt) => [pt[0], -pt[1]]);
                let xSVG = 10;
                for (var i = 0; i < basicArrowUp.length; i++) {
                    if (i > 0) {
                        svgArrowUp += ",";
                        svgArrowDown += ",";
                    }
                    ptUp = basicArrowUp[i];
                    ptDown = basicArrowDown[i];

                    svgArrowUp +=
                        1.0 * (shiftLeftUpDown + xSVG + ptUp[0] * basicArrowWidth) +
                        "," +
                        (shiftUp4UpDown + ySVG + ptUp[1] * basicArrowWidth);
                    svgArrowDown +=
                        1.0 * (shiftLeftUpDown + xSVG + ptDown[0] * basicArrowWidth) +
                        "," +
                        (shiftUp4UpDown + ySVG + ptDown[1] * basicArrowWidth);
                }
                svgArrowUp += "'></polyline>";
                svgArrowDown += "'></polyline>";

                let relType = "parent";

                theSVGarrow = svgArrowUp;
                if (directionFromTo == "From") {
                    if (prevPerson && prevPerson.getGender() === "Male") {
                        relType = "father";
                    } else if (prevPerson && prevPerson.getGender() === "Female") {
                        relType = "mother";
                    }
                } else if (directionFromTo == "To") {
                    theSVGarrow = svgArrowDown;
                    relType = "child";
                    if (person && person.getGender() === "Male") {
                        relType = "son";
                    } else if (person && person.getGender() === "Female") {
                        relType = "daughter";
                    }
                }

                let certaintyStatusImage = "";
                let certaintyWidth = 0;

                let certaintyStatusNum = 0;
                condLog("Cerainty status for ", person.getName(), person._data.DataStatus, "vs", prevPerson);

                if (prevPerson && prevPerson._data && person._data.DataStatus) {
                    let prevID = prevPerson._data.Id;
                    if (prevID == person._data.Father) {
                        certaintyStatusNum = person._data.DataStatus.Father;
                    } else if (prevID == person._data.Mother) {
                        certaintyStatusNum = person._data.DataStatus.Mother;
                    } else if (prevID == person._data.BioFather) {
                        certaintyStatusNum = person._data.DataStatus.BioFather;
                    } else if (prevID == person._data.BioMother) {
                        certaintyStatusNum = person._data.DataStatus.BioMother;
                    }
                }

                if (certaintyStatusNum == 5) {
                    // `<image  height="16" href="https://apps.wikitree.com/apps/clarke11007/pix/adopted.png" x=` +
                    certaintyStatusImage =
                        `<image ` +
                        initialConfidenceImagesDisplayMode +
                        `class=ConfidenceImage height="16" href="https://www.wikitree.com/images/icons/icon-dna-none.svg" `;
                    certaintyWidth = 25;
                    relType = "adopted " + relType;
                    thisBkgdColourNum++;
                    let thisBkgdColour = bkgdColours[thisBkgdColourNum % 2];
                    condLog(
                        "to status: currentFromExtender + currentToExtender > '' = ",
                        currentFromExtender + currentToExtender > "",
                        " : ",
                        howManyGens - 2 + (currentFromExtender + currentToExtender > "" ? 1 : 0)
                    );

                    let howManyGens4interpretRelationship =
                        howManyGens - 2 + (currentFromExtender + currentToExtender > "" ? 1 : 0);
                    let thisRelationship = interpretRelationship(
                        directionFromTo == "From" ? "parent" : "child",
                        howManyGens4interpretRelationship,
                        directionFromTo == "From" ? MRCAperson._data.Gender : prevPerson._data.Gender
                    );

                    let addS = "";
                    if (howManyGens4interpretRelationship > 0) {
                        addS = "'s ";
                    } else {
                        thisRelationship = "";
                    }

                    if (directionFromTo == "From") {
                        currentFromExtender = relType + "'s " + thisRelationship + addS + currentFromExtender;
                        currentToExtender += thisRelationship + addS + relType + "'s ";

                        currentFromExtenderColour =
                            "<span style='background-color:" +
                            thisBkgdColour +
                            ";'>" +
                            relType +
                            "'s " +
                            thisRelationship +
                            "</span>" +
                            addS +
                            currentFromExtenderColour;

                        currentToExtenderColour +=
                            thisRelationship +
                            "</span>" +
                            addS +
                            "<span style='background-color:" +
                            thisBkgdColour +
                            ";'>" +
                            relType +
                            "'s ";
                        condLog(
                            "FROM status 5: ",
                            "aa = " + aa,
                            "ahnNum = " + ahnNum,
                            "relType = " + relType,
                            "howManyGens = " + howManyGens,
                            "howManyGens4interpretRelationship = " + howManyGens4interpretRelationship,
                            "thisRelationship = " + thisRelationship,
                            "addS = " + addS,
                            "currentFromExtender = " + currentFromExtender,
                            "/",
                            person.getDisplayName(),
                            "/",
                            prevPerson.getDisplayName()
                        );
                    } else {
                        currentFromExtender += thisRelationship + addS + relType + "'s ";
                        currentToExtender += thisRelationship + addS + relType + "'s ";
                        currentFromExtenderColour +=
                            thisRelationship +
                            "</span>" +
                            addS +
                            "<span style='background-color:" +
                            thisBkgdColour +
                            ";'>" +
                            relType +
                            "'s ";
                        currentToExtenderColour +=
                            thisRelationship +
                            "</span>" +
                            addS +
                            "<span style='background-color:" +
                            thisBkgdColour +
                            ";'>" +
                            relType +
                            "'s ";

                        condLog(
                            "TO status 5: ",
                            "aa = " + aa,
                            "ahnNum = " + ahnNum,
                            "relType = " + relType,
                            "howManyGens = " + howManyGens,
                            "howManyGens4interpretRelationship = " + howManyGens4interpretRelationship,
                            "thisRelationship = " + thisRelationship,
                            "addS = " + addS,
                            "currentToExtender = " + currentToExtender,
                            "/",
                            person.getDisplayName(),
                            "/",
                            prevPerson.getDisplayName()
                        );
                    }

                    howManyGens = 0;
                    MRCAperson = person;
                } else if (certaintyStatusNum == 10) {
                    certaintyStatusImage =
                        `<image ` +
                        initialConfidenceImagesDisplayMode +
                        `class=ConfidenceImage height="14" href="https://www.wikitree.com/images/icons/icon-uncertain.svg" `;
                    certaintyWidth = 16;
                } else if (certaintyStatusNum == 20) {
                    certaintyStatusImage =
                        `<image ` +
                        initialConfidenceImagesDisplayMode +
                        `class=ConfidenceImage height="14" href="https://www.wikitree.com/images/icons/icon-confident.svg" `;
                    certaintyWidth = 16;
                } else if (certaintyStatusNum == 30) {
                    certaintyStatusImage =
                        `<image ` +
                        initialConfidenceImagesDisplayMode +
                        `class=ConfidenceImage height="16" href="https://www.wikitree.com/images/icons/icon-dna-checked.svg" `;
                    certaintyWidth = 40;
                }
                if (certaintyStatusNum != 5) {
                    if (directionFromTo == "From") {
                        condLog(
                            directionFromTo + " status " + certaintyStatusNum + ": ",
                            "aa = " + aa,
                            "ahnNum = " + ahnNum,
                            "relType = " + relType,
                            "howManyGens = " + howManyGens,
                            "currentFromExtender = " + currentFromExtender,
                            "/",
                            person.getDisplayName(),
                            "/",
                            prevPerson ? prevPerson.getDisplayName() : "no prevPerson"
                        );
                    } else {
                        condLog(
                            directionFromTo + " status " + certaintyStatusNum + ": ",
                            "aa = " + aa,
                            "ahnNum = " + ahnNum,
                            "relType = " + relType,
                            "howManyGens = " + howManyGens,
                            "currentToExtender = " + currentToExtender,
                            "/",
                            person.getDisplayName(),
                            "/",
                            prevPerson ? prevPerson.getDisplayName() : "no prevPerson"
                        );
                    }
                }

                if (isFirstPass) {
                    isFirstPass = false;
                    currentFromExtender = "";
                }

                var photoUrl = person.getPhotoUrl(75);

                // Use generic gender photos if there is not profile photo available
                if (!photoUrl || person._data.IsLiving == true) {
                    if (person.getGender() === "Male") {
                        photoUrl = "images/icons/male.gif";
                    } else if (person && person.getGender() === "Female") {
                        photoUrl = "images/icons/female.gif";
                    } else {
                        photoUrl = "images/icons/no-gender.gif";
                    }
                }

                // connectionHTML += `<img height=40px src="https://www.wikitree.com/${photoUrl}"> <BR>`;

                if (ahnNum < ahnNumArray[aa]) {
                    if (certaintyStatusImage > "") {
                        SVGhtml +=
                            certaintyStatusImage +
                            ` x=` +
                            (10 + bubbleWidth - certaintyWidth) +
                            ` y=${ySVG + 2 - bubbleHeightSpacer + (directionFromTo == "To" ? 10 : 0)} />`;
                    }

                    SVGhtml +=
                        theSVGarrow +
                        `<line class=OrangeArrow style="stroke:rgb(255,0,0);stroke-width:2;` +
                        initialOrangeArrowsDisplayMode +
                        ` " x1="` +
                        (10 + bubbleWidth / 2) +
                        `" y1="` +
                        (ySVG - 20 - (directionFromTo == "To" ? 10 : 0)) +
                        `" x2="` +
                        (10 + bubbleWidth / 2) +
                        `" y2="` +
                        (ySVG - (directionFromTo == "To" ? 12 : 0)) +
                        `"></line>` +
                        `<line class=OrangeArrowNot style="stroke:rgb(255,0,0);stroke-width:2;  ` +
                        showTallConnectorsForOrangeArrowStyle +
                        `" x1="` +
                        (10 + bubbleWidth / 2) +
                        `" y1="` +
                        (ySVG - bubbleHeightSpacer) +
                        `" x2="` +
                        (10 + bubbleWidth / 2) +
                        `" y2="` +
                        ySVG +
                        `"></line>`;

                    SVGhtml +=
                        `<text class=OrangeArrow style="font-size: .9rem; fill: orange; font-weight: bold; ` +
                        displayOrangeArrowStyle +
                        `" text-anchor="middle" x="` +
                        (xSVG + 20 + 10 + (bubbleWidth - 60) / 2) +
                        `" y="${ySVG - 2 - bubbleHeightSpacer / 2 + (directionFromTo == "To" ? 12 : 0) /* - 18 */}" >` +
                        relType +
                        `</text>`;
                }
                let thisBkgdColour = bkgdColours[thisBkgdColourNum % 2];
                if (doAlternateColouring) {
                    currentBkgdColour = thisBkgdColour;
                } else {
                    currentBkgdColour = "white";
                }

                condLog("GOING to PREPARE (692) the FAMILY BUBBLE for ", person._data.BirthNamePrivate);
                SVGhtml +=
                    `<rect  class=FamilyBubble bubbleColour="` +
                    thisBkgdColour +
                    `" x="10" y="${ySVG}" rx="10" ry="10" width="${bubbleWidth}" height="${bubbleHeight}" style="fill:` +
                    currentBkgdColour +
                    `;stroke:black;stroke-width:1;opacity:1"></rect>`;
                SVGhtml += `<image  height="40" href="https://www.wikitree.com/${photoUrl}" x=20 y=${ySVG + 2} />`;

                let thisDisplayName = person.getDisplayName();
                // condLog({thisDisplayName});
                if (thisDisplayName == undefined || thisDisplayName == "undefined") {
                    thisDisplayName = "Private";
                }
                thisPopup.innerHTML =
                    "<svg id=tempSVG width=400 height=40><text id=testTextLength>" + thisDisplayName + "</text></svg>";
                condLog("Width of ", thisDisplayName, document.getElementById("testTextLength").clientWidth);

                let extraLengthStuff = "";
                if (document.getElementById("testTextLength").clientWidth > maxWidth4NoSquishing) {
                    extraLengthStuff = ` textLength="${bubbleWidth - 60}" lengthAdjust="spacingAndGlyphs"`;
                }
                if (embedProfileLinks) {
                    thisDisplayName = `<a href="https://www.wikitree.com/wiki/${person._data.Name}" target="_blank">${thisDisplayName}</a>`;
                }

                SVGhtml +=
                    `<text class=FamilyBubbleNameText wtname="${person._data.Name}" id="textAhn${ahnNum}" text-anchor="middle" x="` +
                    (10 + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 18}"  ${extraLengthStuff}>` +
                    thisDisplayName +
                    `</text>`;

                SVGhtml +=
                    `<text text-anchor="middle" style="font-size:1rem;" x="` +
                    (10 + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 38}">` +
                    lifespan(person) +
                    `</text>`;

                if (theBothParentsText > "") {
                    thisPopup.innerHTML =
                        "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                        theBothParentsText +
                        "</text></svg>";
                    condLog("Width of ", theBothParentsText, document.getElementById("testTextLength").clientWidth);

                    let extraLengthStuff = "";
                    if (document.getElementById("testTextLength").clientWidth > (maxWidth4NoSquishing + 20) / 0.9) {
                        extraLengthStuff = ` textLength="${bubbleWidth - 24}" lengthAdjust="spacingAndGlyphs"`;
                    }

                    SVGhtml +=
                        `<text class="BothParentsElement" text-anchor="middle" style="font-size:0.9rem; font-style:normal; display:` +
                        (showBothParents ? "inline" : "none") +
                        `;" x="` +
                        (10 + 40 + (bubbleWidth - 60) / 2) +
                        `" y="${ySVG + 58}">` +
                        "& " +
                        theBothParentsText +
                        `</text>`;
                }

                ySVG += bubbleHeight + bubbleHeightSpacer;

                // let peepNames = person.getDisplayName().split(" ");
                // for (let i = 0; i < peepNames.length; i++) {
                //     // connectionHTML += peepNames[i] + "<br/>";
                // }
                // connectionHTML += "<br/>" + lifespan(person) + "<br/>";

                ahnNum = Math.floor(ahnNum / 2);
                prevPerson = person;
            } // END WHILE ... have just finished going through the whole path from the popup person to the primary person

            let thisRelationship = interpretRelationship(
                directionFromTo == "From" ? "parent" : "child",
                howManyGens - (currentFromExtender > "" || currentToExtender > "" ? 0 : 1),
                directionFromTo == "From" ? MRCAperson._data.Gender : firstPerson._data.Gender
            );
            condLog(
                "FROM END: from status / to status",
                { directionFromTo },
                { thisRelationship },
                { howManyGens },
                { currentFromExtender },
                { currentFromExtenderColour },
                { currentToExtender },
                { currentToExtenderColour }
            );

            // REMOVE the 's from the end of the currentFromExtender and currentToExtender, if they are there
            if (currentFromExtender.length > 2 && currentFromExtender.substr(currentFromExtender.length - 3) == "'s ") {
                currentFromExtender = currentFromExtender.substring(0, currentFromExtender.length - 3);
                currentFromExtenderColour =
                    currentFromExtenderColour.substring(0, currentFromExtenderColour.length - 10) + "</span>";
            }
            // SEARCH currentFromExtenderColour to find the first occurrence of lightgreen and the first occurrence of lightyellow, and if lightgreen occurs BEFORE lightyellow, then use .replaceAll to swap them, using indigo as a temporary colour
            if (currentFromExtenderColour.indexOf("lightgreen") > -1) {
                if (
                    currentFromExtenderColour.indexOf("lightgreen") <
                        currentFromExtenderColour.indexOf("lightyellow") ||
                    currentFromExtenderColour.indexOf("lightyellow") == -1
                ) {
                    currentFromExtenderColour = currentFromExtenderColour
                        .replaceAll("lightgreen", "indigo")
                        .replaceAll("lightyellow", "lightgreen")
                        .replaceAll("indigo", "lightyellow");
                }
            }

            // if (currentToExtender.length > 2 && currentToExtender.substr(currentToExtender.length - 3) == "'s ") {
            //     currentToExtender = currentToExtender.substring(0, currentToExtender.length - 3);
            //     currentToExtenderColour = currentToExtenderColour.substring(0, currentToExtenderColour.length - 3);
            // }

            if (thisRelationship.indexOf("?") > -1 || thisRelationship == "self") {
                condLog("IN ? or SELF mode: ");
                currentFromDescription += currentFromExtender;
                currentToDescription += currentToExtender;
                currentFromDescriptionColour += currentFromExtenderColour;
                currentToDescriptionColour += currentToExtenderColour;

                pathDescriptionsHTML[aa] = {
                    From: currentFromDescription + ".",
                    To: currentToDescription + ".",
                    FromColour: currentFromDescriptionColour + "</span>" + ".",
                    ToColour: currentToDescriptionColour + "</span>" + ".",
                };
            } else {
                condLog("IN ELSE  mode: ");
                pathDescriptionsHTML[aa] = {
                    From:
                        currentFromDescription +
                        thisRelationship +
                        (currentFromExtender > "" ? "'s " + currentFromExtender : "") +
                        ".",
                    To: currentToDescription + currentToExtender + thisRelationship + ".",
                    FromColour:
                        currentFromDescriptionColour +
                        thisRelationship +
                        (currentFromExtenderColour > "" ? "'s " + currentFromExtenderColour : "") +
                        "</span>" +
                        ".",
                    ToColour: currentToDescriptionColour + currentToExtenderColour + thisRelationship + "</span>" + ".",
                };
            }

            if (thisBkgdColourNum % 2 == 1 && directionFromTo == "From") {
                SVGhtml = SVGhtml.replaceAll("lightgreen", "indigo")
                    .replaceAll("lightyellow", "lightgreen")
                    .replaceAll("indigo", "lightyellow");
            }

            if (aa == pathNum) {
                svgDisplayStyle = ' style="display:revert" ';
            } else {
                svgDisplayStyle = ' style="display:none" ';
            }

            SVGhtml =
                "<svg id=connectionsDiagram" +
                aa +
                " width=" +
                (20 + bubbleWidth) +
                " height=" +
                ySVG +
                ` ${svgDisplayStyle}>` +
                SVGhtml +
                "</svg>";

            popupHTML += SVGhtml;
            popupHTML += connectionHTML;
        }
        if (ahnNumArray.length > 1) {
            popupHTML = pathsButtonsHTML + popupHTML;
        }
        condLog("PATH DESCRIPTIONS HTML", pathDescriptionsHTML, thisBkgdColourNum);
    }

    if (connectObject.type == "CC") {
        let codesList = [];
        let usedGetConnections = false;
        let cc7likeSuperTree = false;

        let firstPerson = null;
        let lastPerson = null;
        let firstPersonName = null;
        let lastPersonName = null;

        if (connectObject.appID == "SuperBigTree") {
            firstPerson = thePeopleList[connectObject.leafCollection["A0"].Id];
            lastPerson = connectObject.person;
            firstPersonName = firstPerson.getDisplayName();
            lastPersonName = lastPerson.getDisplayName();

            if (overrideLastPersonID > "") {
                lastPerson = thePeopleList[overrideLastPersonID];
                if (!lastPerson) {
                    lastPerson = overrideLastPersonID;
                }
                lastPersonName = overrideLastPersonID;
                connectObject.personName = overrideLastPersonID;
            }
        } else if (connectObject.appID == "fromAhn") {
            firstPersonName = connectObject.primaryPerson._data.BirthNamePrivate;
            lastPersonName = connectObject.lastPersonName;
            firstPerson = fromAhnConnectionsResult.path[0].BirthNamePrivate;
            lastPerson = fromAhnConnectionsResult.path[fromAhnConnectionsResult.pathLength - 1].BirthNamePrivate;
            condLog({ fromAhnConnectionsResult });
            condLog({ getConnectionsObjects });
            // condLog({ theNamesIndex });
        } else {
            firstPerson = connectObject.peopleList[connectObject.leafCollection["A0"].Id];
            firstPersonName = firstPerson.LongName;
            if (!firstPersonName || firstPersonName == "undefined" || firstPersonName == undefined) {
                firstPersonName = rootPerson.BirthNamePrivate;
            }

            if (overrideLastPersonID > "") {
                lastPerson = thePeopleList[overrideLastPersonID];
                if (!lastPerson) {
                    lastPerson = overrideLastPersonID;
                }
                lastPersonName = overrideLastPersonID;
                connectObject.personName = overrideLastPersonID;
            } else {
                lastPerson = connectObject.person;
                if (lastPerson) {
                    lastPersonName = lastPerson.LongName;
                }
            }
            condLog({ lastPerson }, { connectObject });
        }

        condLog("Getting the CodesList for ", firstPerson, " to ", lastPerson);

        if (connectObject.appID == "fromAhn") {
            // codesList already calculated for fromAhn connections
            codesList = fromAhnConnectionsResult.codesList;
            condLog({ codesList });
        } else if (!connectObject.person._data || overrideLastPersonID > "") {
            // condLog("NO DATA OBJECT !!!!");
            if (!window.rootPerson || overrideLastPersonID > "") {
                // window.rootPerson = window.person._data;
                if (connectObject.appID == "SuperBigTree") {
                    window.rootPerson = thePeopleList[connectObject.leafCollection["A0"].Id]._data;
                }
                if (overrideLastPersonID > "") {
                    connectObject.personName = overrideLastPersonID;
                }
            }
            console.log(
                "Let's try to use getConnections to go from " +
                    window.rootPerson.Name +
                    " to " +
                    connectObject.personName,
                { connectObject }
            );

            thisPopup.innerHTML = "Please wait while I assemble this ";

            let theNamesToConnect = [window.rootPerson.Name, connectObject.personName];
            let theNamesIndex =
                window.rootPerson.Name + ":" + connectObject.personName + ":" + doOverRideConnectionType;
            if (doReverse == "true" || doReverse == true) {
                theNamesToConnect = [connectObject.personName, window.rootPerson.Name];
                theNamesIndex =
                    connectObject.personName + ":" + window.rootPerson.Name + ":" + doOverRideConnectionType;
            }

            if (getConnectionsObjects[theNamesIndex]) {
                console.log("Already have a getConnections result for ", theNamesIndex);
                let connResult = getConnectionsObjects[theNamesIndex];
                condLog({ connResult });
                thisPopup.innerHTML = connResult.connectionPath;
                theCode = connResult.theCode;
                condLog({ theCode });
                codesList = connResult.codesList;
                getConnectionsPath = connResult.path;
            } else {
                let theOptions = {};
                let theRelation = Math.max(0, doOverRideConnectionType);
                await WikiTreeAPI.getConnections(
                    "popupGetConnections",
                    theNamesToConnect,
                    [
                        "Id",
                        "Derived.BirthName",
                        "Derived.BirthNamePrivate",
                        "FirstName",
                        "RealName",
                        "MiddleInitial",
                        "LastNameAtBirth",
                        "LastNameCurrent",
                        "Derived.LongName",
                        "BirthDate",
                        "BirthLocation",
                        "DeathDate",
                        "DeathLocation",
                        "Mother",
                        "Father",
                        "BioMother",
                        "BioFather",
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
                    theOptions,
                    theRelation
                ).then(function (connResult) {
                    if (connResult) {
                        condLog("Found a connection result !", connResult);

                        if (connResult.path && connResult.path.length > 0) {
                            let connectionPath = "The path found: " + connResult.path[0].BirthNamePrivate;
                            let theCode = "A0";
                            usedGetConnections = true;
                            foundLastPerson = connResult.path[connResult.path.length - 1];
                            condLog({ foundLastPerson });
                            lastPersonName = foundLastPerson.LongName;
                            condLog({ lastPersonName }, foundLastPerson["LongName"]);
                            for (let p = 1; p < connResult.path.length; p++) {
                                let thisPerson = connResult.path[p];
                                condLog({ thisPerson });
                                lastPersonName = thisPerson.RealName + " " + thisPerson.LastNameAtBirth;
                                if (overrideLastPersonID > "") {
                                    if (doReverse == true) {
                                        lastPersonName = connectObject.lastPersonName;
                                    } else {
                                        connectObject.lastPersonName = lastPersonName;
                                    }
                                }
                                condLog({ lastPersonName }, thisPerson["LongName"]);
                                connectionPath +=
                                    " -> (" +
                                    thisPerson.pathType +
                                    " , " +
                                    thisPerson.pathStatus +
                                    ") " +
                                    thisPerson.BirthNamePrivate;
                                if (thisPerson.pathType == "parent") {
                                    if (thisPerson.Gender == "Male") {
                                        theCode += "RM";
                                    } else if (thisPerson.Gender == "Female") {
                                        theCode += "RF";
                                    } else {
                                        theCode += "RM";
                                    }
                                } else if (thisPerson.pathType == "bioparent") {
                                    if (thisPerson.Gender == "Male") {
                                        theCode += "BM";
                                    } else if (thisPerson.Gender == "Female") {
                                        theCode += "BF";
                                    } else {
                                        theCode += "BM";
                                    }
                                } else if (thisPerson.pathType == "child" || thisPerson.pathType == "biochild") {
                                    theCode += "K01";
                                } else if (thisPerson.pathType == "sibling" || thisPerson.pathType == "biosibling") {
                                    theCode += "S01";
                                } else if (thisPerson.pathType == "spouse") {
                                    theCode += "P01";
                                }
                            }
                            condLog({ lastPersonName }, foundLastPerson["LongName"]);
                            thisPopup.innerHTML = connectionPath;
                            condLog({ theCode });
                            codesList = [theCode];
                            getConnectionsPath = connResult.path;
                            connResult.codesList = codesList;
                            connResult.connectionPath = connectionPath;
                            getConnectionsObjects[theNamesIndex] = connResult;
                        } else {
                            console.log("No connection path found !");
                            popupHTML =
                                "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                            thisPopup.innerHTML = popupHTML;
                        }
                    } else {
                        console.log("Need to know there is NO getConnections RESULT !");
                        popupHTML =
                            "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                        thisPopup.innerHTML = popupHTML;
                    }
                });
            }
        } else if (connectObject.appID == "SuperBigTree") {
            codesList = connectObject.person._data.CodesList;
            condLog({ codesList });
        } else if (connectObject.appID == "cc7") {
            // condLog(connectObject.person);
            if (!connectObject.person._data || overrideLastPersonID > "") {
                // condLog("NO DATA OBJECT !!!!");
                console.log(
                    "Let's try to use getConnections to go from " +
                        window.rootPerson.Name +
                        " to " +
                        connectObject.personName,
                    { connectObject }
                );

                thisPopup.innerHTML = "Please wait while I assemble this ";

                let theNamesToConnect = [window.rootPerson.Name, connectObject.personName];
                let theNamesIndex =
                    window.rootPerson.Name + ":" + connectObject.personName + ":" + doOverRideConnectionType;
                if (doReverse == "true" || doReverse == true) {
                    theNamesToConnect = [connectObject.personName, window.rootPerson.Name];
                    theNamesIndex =
                        connectObject.personName + ":" + window.rootPerson.Name + ":" + doOverRideConnectionType;
                }

                if (getConnectionsObjects[theNamesIndex]) {
                    console.log("Already have a getConnections result for ", theNamesIndex);
                    let connResult = getConnectionsObjects[theNamesIndex];
                    condLog({ connResult });
                    thisPopup.innerHTML = connResult.connectionPath;
                    theCode = connResult.theCode;
                    condLog({ theCode });
                    codesList = connResult.codesList;
                    getConnectionsPath = connResult.path;
                } else {
                    let theOptions = {};
                    let theRelation = Math.max(0, doOverRideConnectionType);
                    await WikiTreeAPI.getConnections(
                        "popupGetConnections",
                        theNamesToConnect,
                        [
                            "Id",
                            "Derived.BirthName",
                            "Derived.BirthNamePrivate",
                            "FirstName",
                            "RealName",
                            "MiddleInitial",
                            "LastNameAtBirth",
                            "LastNameCurrent",
                            "Derived.LongName",
                            "BirthDate",
                            "BirthLocation",
                            "DeathDate",
                            "DeathLocation",
                            "Mother",
                            "Father",
                            "BioMother",
                            "BioFather",
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
                        theOptions,
                        theRelation
                    ).then(function (connResult) {
                        if (connResult) {
                            condLog("Found a connection result !", connResult);

                            if (connResult.path && connResult.path.length > 0) {
                                let connectionPath = "The path found: " + connResult.path[0].BirthNamePrivate;
                                let theCode = "A0";
                                usedGetConnections = true;
                                foundLastPerson = connResult.path[connResult.path.length - 1];
                                condLog({ foundLastPerson });
                                lastPersonName = foundLastPerson.LongName;
                                condLog({ lastPersonName }, foundLastPerson["LongName"]);
                                for (let p = 1; p < connResult.path.length; p++) {
                                    let thisPerson = connResult.path[p];
                                    condLog({ thisPerson });
                                    lastPersonName = thisPerson.RealName + " " + thisPerson.LastNameAtBirth;
                                    if (overrideLastPersonID > "") {
                                        if (doReverse == true) {
                                            lastPersonName = connectObject.lastPersonName;
                                        } else {
                                            connectObject.lastPersonName = lastPersonName;
                                        }
                                    }
                                    condLog({ lastPersonName }, thisPerson["LongName"]);
                                    connectionPath +=
                                        " -> (" +
                                        thisPerson.pathType +
                                        " , " +
                                        thisPerson.pathStatus +
                                        ") " +
                                        thisPerson.BirthNamePrivate;
                                    if (thisPerson.pathType == "parent") {
                                        if (thisPerson.Gender == "Male") {
                                            theCode += "RM";
                                        } else if (thisPerson.Gender == "Female") {
                                            theCode += "RF";
                                        } else {
                                            theCode += "RM";
                                        }
                                    } else if (thisPerson.pathType == "bioparent") {
                                        if (thisPerson.Gender == "Male") {
                                            theCode += "BM";
                                        } else if (thisPerson.Gender == "Female") {
                                            theCode += "BF";
                                        } else {
                                            theCode += "BM";
                                        }
                                    } else if (thisPerson.pathType == "child" || thisPerson.pathType == "biochild") {
                                        theCode += "K01";
                                    } else if (
                                        thisPerson.pathType == "sibling" ||
                                        thisPerson.pathType == "biosibling"
                                    ) {
                                        theCode += "S01";
                                    } else if (thisPerson.pathType == "spouse") {
                                        theCode += "P01";
                                    }
                                }
                                condLog({ lastPersonName }, foundLastPerson["LongName"]);
                                thisPopup.innerHTML = connectionPath;
                                condLog({ theCode });
                                codesList = [theCode];
                                getConnectionsPath = connResult.path;
                                connResult.codesList = codesList;
                                connResult.connectionPath = connectionPath;
                                getConnectionsObjects[theNamesIndex] = connResult;
                            } else {
                                console.log("No connection path found !");
                                if (doOverRideConnectionType == 2) {
                                    popupHTML =
                                        "Cannot draw this Relationship Path at this time.<BR><BR>Possible reasons:<BR> * " +
                                        overrideLastPersonID +
                                        " is not a direct relative <BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Invalid WikiTree ID";
                                } else {
                                    popupHTML =
                                        "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                                }
                                thisPopup.innerHTML = popupHTML;
                            }
                        } else {
                            console.log("Need to know there is NO getConnections RESULT !");
                            if (doOverRideConnectionType == 2) {
                                popupHTML =
                                    "Cannot draw this Relationship Path at this time.<BR><BR>Possible reasons:<BR> * " +
                                    overrideLastPersonID +
                                    " is not a direct relative <BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Invalid WikiTree ID";
                            } else {
                                popupHTML =
                                    "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                            }
                            thisPopup.innerHTML = popupHTML;
                        }
                    });
                }
            } else if (!connectObject.person._data.CodesList) {
                // condLog("MISSING CODES LIST - ", connectObject.person);
                codesList = ["A0"];
            } else {
                codesList = connectObject.person._data.CodesList;
                condLog({ codesList }, "needs Reversing ??", doReverse);
                if (doReverse) {
                    cc7likeSuperTree = true;
                }
            }
        }

        condLog("CC7 connection codesList:", { codesList });

        let minX = 10;
        let minY = 10;
        let maxX = 10;
        let maxY = 10;

        let degreesCodesList = [];
        for (let aa = 0; aa < codesList.length; aa++) {
            var thisCode = codesList[aa];
            degreesCodesList[aa] = { degree: breakDownCC7Code(thisCode).length - 1, i: aa };
        }

        let codesByDegreesList = degreesCodesList.sort((a, b) => a.degree - b.degree);

        condLog({ degreesCodesList });

        let pathsButtonsHTML = "Path: ";
        for (let aaa = 0; aaa < codesList.length; aaa++) {
            let aa = codesByDegreesList[aaa].i;
            var thisCode = codesList[aa];
            thisBkgdColourNum = 0;

            let currentExtender = "";
            let miniExtender = "";
            let currentExtenderColour = "";

            if (codesByDegreesList[aaa].degree > 7 && overrideLastPersonID == "") {
                condLog("SKIPPING CODE # ", aa, thisCode, " TOO LONG @ ", codesByDegreesList[aaa].degree + " degrees");
                continue;
            }
            pathsButtonsHTML +=
                "<button class='switchPathButton' id='switchPathButton" +
                aaa +
                "' style='border-radius:30px; background-color:" +
                (aaa == pathNum ? "orange" : "lightgray") +
                ";' onclick='switchPathDisplayed(" +
                aaa +
                ")'>" +
                (aaa + 1) +
                "</button> ";

            condLog("CODE # ", aa, thisCode);
            var breakDownList = breakDownCC7Code(thisCode);
            condLog("breakDownList = ", breakDownList, " for code ", thisCode);
            if (
                (connectObject.appID == "SuperBigTree" || cc7likeSuperTree == true) &&
                directionFromTo == "To" &&
                usedGetConnections == false &&
                overrideLastPersonID == ""
            ) {
                breakDownList = reverseThisBreakDownCode(breakDownList);
                condLog("REVERSE breakDownList = ", breakDownList, " for code ", thisCode);
            }

            let SVGhtml = "";
            let xSVG = 10;
            let ySVG = 10;

            let previousPersonData = null;

            let halfPrefix = "½ ";

            thisPopup.innerHTML =
                "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                "Josh Azariah Ashley" +
                "</text></svg>";
            condLog("Width of ", "Josh Azariah Ashley", document.getElementById("testTextLength").clientWidth);
            condLog({ thisCode }, { breakDownList }); //typeof connectObject.ahNum);

            let maxWidth4NoSquishing = document.getElementById("testTextLength").clientWidth;
            if (lastPersonName > "" && !connectObject.lastPersonName) {
                connectObject.lastPersonName = lastPersonName;
                // connectionObj.lastPersonName = lastPersonName;
            } else if (connectObject.lastPersonName) {
                lastPersonName = connectObject.lastPersonName;
            }
            if (
                !lastPersonName &&
                connectObject.person &&
                connectObject.person._data &&
                connectObject.person._data.LongName
            ) {
                lastPersonName = connectObject.person._data.LongName;
                connectObject.lastPersonName = connectObject.person._data.LongName;
            }
            if (overrideLastPersonID > "" && foundLastPerson && foundLastPerson.LongName) {
                if (foundLastPerson.Id == rootId) {
                    // keep the connectObject.lastPersonName
                } else {
                    lastPersonName = foundLastPerson.LongName;
                }
            }
            condLog(
                "DESCRIPTION CREATION: ",
                connectObject.appID,
                { lastPersonName },
                { firstPersonName },
                { aaa },
                { directionFromTo },
                { usedGetConnections }
            );
            currentFromDescription = "<B>" + lastPersonName + "</B> is <B>" + firstPersonName + "</B>'s ";
            currentToDescription = "<B>" + firstPersonName + "</B> is <B>" + lastPersonName + "</B>'s  ";
            currentFromDescriptionColour =
                "<B>" +
                lastPersonName +
                "</B> is <span style='background-color:lightgreen;'><B>" +
                firstPersonName +
                "</B></span>'s ";
            currentToDescriptionColour =
                "<B>" +
                firstPersonName +
                "</B> is <span style='background-color:lightgreen;'><B>" +
                lastPersonName +
                "</B></span>'s ";

            pathDescriptionsHTML[aaa] = {
                From: currentFromDescription,
                To: currentToDescription,
                FromColour: "<font color=black>" + currentFromDescriptionColour + "</font>",
                ToColour: "<font color=black>" + currentToDescriptionColour + "</font>",
            };

            prevPeepCode = null;
            let growingCodes = "";
            let needToVmove = 0;
            for (let cc = 0; cc < breakDownList.length; cc++) {
                let thisPeepType = breakDownList[cc][0][0];
                let thisPeepCode = breakDownList[cc][1];
                let personData = null;
                let nextPersonData = null;

                let nextPeepType = "";
                let nextPeepCode = "";
                if (cc + 1 < breakDownList.length) {
                    nextPeepType = breakDownList[cc + 1][0][0];
                    nextPeepCode = breakDownList[cc + 1][1];
                }

                if (connectObject.appID == "SuperBigTree") {
                    condLog({ thisPeepCode });
                    if (getConnectionsPath.length > 0) {
                        personData = getConnectionsPath[cc];
                        person = { _data: personData };
                        if (cc + 1 < breakDownList.length) {
                            nextPersonData = getConnectionsPath[cc + 1];
                        }
                    } else {
                        person = thePeopleList[connectObject.leafCollection[thisPeepCode].Id];
                        personData = person._data;
                        if (cc + 1 < breakDownList.length) {
                            nextPersonData = thePeopleList[connectObject.leafCollection[nextPeepCode].Id]._data;
                        }
                    }
                } else if (connectObject.appID == "fromAhn") {
                    if (fromAhnConnectionsResult.path.length > 0) {
                        personData = fromAhnConnectionsResult.path[cc];
                        person = { _data: personData };
                        if (cc + 1 < breakDownList.length) {
                            nextPersonData = fromAhnConnectionsResult.path[cc + 1];
                        }
                    }
                } else if (connectObject.appID == "cc7") {
                    if (getConnectionsPath.length > 0) {
                        personData = getConnectionsPath[cc];
                        person = { _data: personData };
                        if (cc + 1 < breakDownList.length) {
                            nextPersonData = getConnectionsPath[cc + 1];
                        }
                    } else {
                        personData = connectObject.peopleList[connectObject.leafCollection[thisPeepCode].Id];
                        person = { _data: personData };
                        if (cc + 1 < breakDownList.length) {
                            nextPersonData = connectObject.peopleList[connectObject.leafCollection[nextPeepCode].Id];
                        }
                    }
                }

                // person = thePeopleList[connectObject.leafCollection[thisPeepCode].Id];
                condLog("B4 PhotoURL:", { person }, { personData }, "length:", getConnectionsPath.length);
                var photoUrl = null;
                if (connectObject.appID == "SuperBigTree") {
                    if (
                        personData &&
                        personData.PhotoData &&
                        personData.PhotoData.url &&
                        personData.PhotoData.url > ""
                    ) {
                        photoUrl = personData.PhotoData.url;
                    } else if (overrideLastPersonID == "") {
                        photoUrl = person.getPhotoUrl(75);
                    }
                } else if (connectObject.appID == "cc7") {
                    if (
                        personData &&
                        personData.PhotoData &&
                        personData.PhotoData.url &&
                        personData.PhotoData.url > ""
                    ) {
                        photoUrl = personData.PhotoData.url;
                    }
                }

                // Use generic gender photos if there is not profile photo available
                if (
                    !photoUrl ||
                    (personData.IsLiving == true &&
                        connectObject.appID == "SuperBigTree" &&
                        SuperBigFamView.displayPrivatize == 1)
                ) {
                    if (person && personData && personData.Gender === "Male") {
                        photoUrl = "images/icons/male.gif";
                    } else if (person && personData && personData.Gender === "Female") {
                        photoUrl = "images/icons/female.gif";
                    } else {
                        photoUrl = "images/icons/no-gender.gif";
                    }
                }

                // connectionHTML += `<img height=40px src="https://www.wikitree.com/${photoUrl}"> <BR>`;

                theBothParentsText = "";
                theBothParentsText2 = ""; // used only in the case where we have a parent married to two different spouses, so half siblings both in relationship V chart

                if (thisPeepCode != "A0" || cc > 0) {
                    growingCodes += thisPeepType;
                    if (
                        growingCodes.length > 1 &&
                        (growingCodes.substring(growingCodes.length - 2) === "KR" ||
                            growingCodes.substring(growingCodes.length - 2) === "RK")
                    ) {
                        needToVmove = 2;
                    } else {
                        let nextGrowingCodePair = thisPeepType + nextPeepType;
                        if (nextGrowingCodePair === "KR" || nextGrowingCodePair === "RK") {
                            needToVmove = 1;
                        } else {
                            needToVmove = 0;
                        }
                    }
                    condLog("Growing codes so far: ", growingCodes, needToVmove);
                    condLog(
                        "GOING to draw person for ",
                        cc,
                        " ",
                        personData.BirthNamePrivate,
                        " : ",
                        thisPeepCode,
                        " from ",
                        prevPeepCode
                    );
                    let basicArrowUp = [
                        [0, -4],
                        [3, 0],
                        [1, 0],
                        [1, 4],
                        [-1, 4],
                        [-1, 0],
                        [-3, 0],
                        [0, -4],
                    ];

                    let basicArrowRight = [
                        [4, 0],
                        [0, 3],
                        [0, 1],
                        [-4, 1],
                        [-4, -1],
                        [0, -1],
                        [0, -3],
                        [4, 0],
                    ];

                    let basicArrowWidth = 3;
                    let shiftLeftUpDown = 15;
                    if (needToVmove == 1) {
                        shiftLeftUpDown += bubbleWidth / 2 + bubbleWidthSpacer / 2 - basicArrowWidth;
                    } else if (needToVmove == 2) {
                        shiftLeftUpDown += bubbleWidth / 2 + bubbleWidthSpacer / 2;
                    }
                    let shiftLeftRight = bubbleWidth + 25;
                    let shiftUp4UpDown = -15;
                    let shiftUp4Right = 5;
                    let initialOrangeArrowsDisplayMode = showOrangeArrows
                        ? "style='display:revert' "
                        : "style='display:none' ";
                    displayOrangeArrowStyle = showOrangeArrows ? " display:revert;  " : " display:none;  ";
                    let showTallConnectorsForOrangeArrowStyle = !showOrangeArrows
                        ? " display:revert;  "
                        : " display:none;  ";
                    let initialConfidenceImagesDisplayMode = showConfidenceImages
                        ? "style='display:revert' "
                        : "style='display:none' ";
                    let initialAlternateColouringDisplayMode = doAlternateColouring
                        ? "style='display:revert' "
                        : "style='display:none' ";
                    let svgArrowUp =
                        "<polyline " +
                        initialOrangeArrowsDisplayMode +
                        "class=OrangeArrow fill='orange' stroke='orange' points='";
                    let svgArrowDown =
                        "<polyline " +
                        initialOrangeArrowsDisplayMode +
                        "class=OrangeArrow fill='orange' stroke='orange' points='";
                    let svgArrowRight =
                        "<polyline " +
                        initialOrangeArrowsDisplayMode +
                        "class=OrangeArrow fill='orange' stroke='orange' points='";

                    for (var i = 0; i < basicArrowUp.length; i++) {
                        if (i > 0) {
                            svgArrowUp += ",";
                            svgArrowRight += ",";
                            svgArrowDown += ",";
                        }
                        ptUp = basicArrowUp[i];
                        ptRt = basicArrowRight[i];

                        svgArrowUp +=
                            1.0 * (shiftLeftUpDown + xSVG + ptUp[0] * basicArrowWidth) +
                            "," +
                            (shiftUp4UpDown + ySVG + ptUp[1] * basicArrowWidth);
                        svgArrowDown +=
                            1.0 * (shiftLeftUpDown + xSVG + ptUp[0] * basicArrowWidth) +
                            "," +
                            (shiftUp4UpDown + ySVG - ptUp[1] * basicArrowWidth + bubbleHeight + bubbleHeightSpacer);
                        svgArrowRight +=
                            1.0 * (shiftLeftRight + xSVG + ptRt[0] * basicArrowWidth) +
                            "," +
                            (shiftUp4Right + ySVG + ptRt[1] * basicArrowWidth);
                    }
                    svgArrowUp += "'></polyline>";
                    svgArrowRight += "'></polyline>";
                    svgArrowDown += "'></polyline>";

                    let certaintyStatusImage = "";
                    let certaintyWidth = 0;
                    let certaintyHeight = 16;
                    let indiPeepCode = "";
                    if (connectObject.appID == "SuperBigTree" && prevPeepCode == null) {
                        // This is the first person in the path, so we don't have a previous person to compare to
                        previousPersonData = personData;
                        prevPeepCode = thisPeepCode;
                    } else if (connectObject.appID == "SuperBigTree") {
                        condLog("1137: ", { thisPeepCode }, { prevPeepCode });

                        let thisPathType = thisPeepCode.substr(prevPeepCode.length, 1);
                        indiPeepCode = thisPeepCode.substr(prevPeepCode.length);
                        condLog(
                            "No pathStatus for Super Big Tree ",
                            thisPeepCode,
                            " for ",
                            person,
                            personData.DataStatus,
                            "vs",
                            previousPersonData,
                            "indiPeepCode: ",
                            indiPeepCode
                        );
                        if (personData.DataStatus == undefined) {
                            personData.DataStatus = { Father: 0, Mother: 0, BioFather: 0, BioMother: 0 };
                        }
                        if (indiPeepCode == "RM") {
                            condLog("Handling indiPeepCode RM for Super Big Tree");
                            personData.pathStatus = previousPersonData.DataStatus.Father;
                            if (previousPersonData.Mother && previousPersonData.Mother > 0) {
                                let desiredSpouseId = previousPersonData.Mother;
                                if (personData.Spouses && personData.Spouses.length > 0) {
                                    for (let indexSpouse = 0; indexSpouse < personData.Spouses.length; indexSpouse++) {
                                        const element = personData.Spouses[indexSpouse];
                                        if (element.Id == previousPersonData.Mother) {
                                            if (element.BirthName) {
                                                theBothParentsText = element.BirthName;
                                            } else if (element.BirthNamePrivate) {
                                                theBothParentsText = element.BirthNamePrivate;
                                            } else {
                                                theBothParentsText = "Private";
                                            }
                                        }
                                    }
                                } else if (
                                    previousPersonData &&
                                    previousPersonData.Parents &&
                                    previousPersonData.Parents[desiredSpouseId]
                                ) {
                                    const element = previousPersonData.Parents[desiredSpouseId];
                                    if (element.Id == desiredSpouseId) {
                                        if (element.BirthName) {
                                            theBothParentsText = element.BirthName;
                                        } else if (element.BirthNamePrivate) {
                                            theBothParentsText = element.BirthNamePrivate;
                                        } else {
                                            theBothParentsText = "Private";
                                        }
                                    }
                                }
                            }
                        } else if (indiPeepCode == "RF") {
                            personData.pathStatus = previousPersonData.DataStatus.Mother;
                            if (previousPersonData.Father && previousPersonData.Father > 0) {
                                let desiredSpouseId = previousPersonData.Father;
                                if (personData.Spouses && personData.Spouses.length > 0) {
                                    for (let indexSpouse = 0; indexSpouse < personData.Spouses.length; indexSpouse++) {
                                        const element = personData.Spouses[indexSpouse];
                                        if (element.Id == previousPersonData.Father) {
                                            if (element.BirthName) {
                                                theBothParentsText = element.BirthName;
                                            } else if (element.BirthNamePrivate) {
                                                theBothParentsText = element.BirthNamePrivate;
                                            } else {
                                                theBothParentsText = "Private";
                                            }
                                        }
                                    }
                                } else if (
                                    previousPersonData &&
                                    previousPersonData.Parents &&
                                    previousPersonData.Parents[desiredSpouseId]
                                ) {
                                    const element = previousPersonData.Parents[desiredSpouseId];
                                    if (element.Id == desiredSpouseId) {
                                        if (element.BirthName) {
                                            theBothParentsText = element.BirthName;
                                        } else if (element.BirthNamePrivate) {
                                            theBothParentsText = element.BirthNamePrivate;
                                        } else {
                                            theBothParentsText = "Private";
                                        }
                                    }
                                }
                            }
                        } else if (indiPeepCode == "BM") {
                            personData.pathStatus = previousPersonData.DataStatus.BioFather;
                            if (previousPersonData.BioMother && previousPersonData.BioMother > 0) {
                                let desiredSpouseId = previousPersonData.BioMother;
                                if (personData.Spouses && personData.Spouses.length > 0) {
                                    for (let indexSpouse = 0; indexSpouse < personData.Spouses.length; indexSpouse++) {
                                        const element = personData.Spouses[indexSpouse];
                                        if (element.Id == previousPersonData.BioMother) {
                                            if (element.BirthName) {
                                                theBothParentsText = element.BirthName;
                                            } else if (element.BirthNamePrivate) {
                                                theBothParentsText = element.BirthNamePrivate;
                                            } else {
                                                theBothParentsText = "Private";
                                            }
                                        }
                                    }
                                } else if (
                                    previousPersonData &&
                                    previousPersonData.Parents &&
                                    previousPersonData.Parents[desiredSpouseId]
                                ) {
                                    const element = previousPersonData.Parents[desiredSpouseId];
                                    if (element.Id == desiredSpouseId) {
                                        if (element.BirthName) {
                                            theBothParentsText = element.BirthName;
                                        } else if (element.BirthNamePrivate) {
                                            theBothParentsText = element.BirthNamePrivate;
                                        } else {
                                            theBothParentsText = "Private";
                                        }
                                    }
                                }
                            }
                        } else if (indiPeepCode == "BF") {
                            personData.pathStatus = previousPersonData.DataStatus.BioMother;
                            let desiredSpouseId = previousPersonData.BioFather;
                            if (previousPersonData.BioFather && previousPersonData.BioFather > 0) {
                                if (personData.Spouses && personData.Spouses.length > 0) {
                                    for (let indexSpouse = 0; indexSpouse < personData.Spouses.length; indexSpouse++) {
                                        const element = personData.Spouses[indexSpouse];
                                        if (element.Id == previousPersonData.BioFather) {
                                            if (element.BirthName) {
                                                theBothParentsText = element.BirthName;
                                            } else if (element.BirthNamePrivate) {
                                                theBothParentsText = element.BirthNamePrivate;
                                            } else {
                                                theBothParentsText = "Private";
                                            }
                                        }
                                    }
                                } else if (
                                    previousPersonData &&
                                    previousPersonData.Parents &&
                                    previousPersonData.Parents[desiredSpouseId]
                                ) {
                                    const element = previousPersonData.Parents[desiredSpouseId];
                                    if (element.Id == desiredSpouseId) {
                                        if (element.BirthName) {
                                            theBothParentsText = element.BirthName;
                                        } else if (element.BirthNamePrivate) {
                                            theBothParentsText = element.BirthNamePrivate;
                                        } else {
                                            theBothParentsText = "Private";
                                        }
                                    }
                                }
                            }
                        } else if (thisPeepType == "K") {
                            if (personData.Father == previousPersonData.Id) {
                                personData.pathStatus = personData.DataStatus.Father;
                            } else if (personData.Mother == previousPersonData.Id) {
                                personData.pathStatus = personData.DataStatus.Mother;
                                condLog(
                                    "thisPeepType: K -> should be setting personData.pathStatus for Mother",
                                    personData.DataStatus.Mother
                                );
                            } else if (personData.BioFather == previousPersonData.Id) {
                                personData.pathStatus = personData.DataStatus.BioFather;
                            } else if (personData.BioMother == previousPersonData.Id) {
                                personData.pathStatus = personData.DataStatus.BioMother;
                            }
                            condLog(
                                "thisPeepType:",
                                thisPeepType,
                                "previousPersonData.Id : " + previousPersonData.Id,
                                "personData:",
                                personData
                            );
                        } else if (thisPeepType == "S") {
                            let shareFather = false;
                            let shareMother = false;
                            let fatherStatus = 0;
                            let motherStatus = 0;

                            if (
                                personData.Father &&
                                previousPersonData.Father &&
                                personData.Father == previousPersonData.Father
                            ) {
                                shareFather = true;
                                fatherStatus = personData.DataStatus.Father;
                            } else if (
                                personData.BioFather &&
                                previousPersonData.BioFather &&
                                personData.BioFather == previousPersonData.BioFather
                            ) {
                                shareFather = true;
                                fatherStatus = personData.DataStatus.BioFather;
                            } else if (
                                personData.Father &&
                                previousPersonData.BioFather &&
                                personData.Father == previousPersonData.BioFather
                            ) {
                                shareFather = true;
                                fatherStatus = personData.DataStatus.Father;
                            } else if (
                                personData.BioFather &&
                                previousPersonData.Father &&
                                personData.BioFather == previousPersonData.Father
                            ) {
                                shareFather = true;
                                fatherStatus = personData.DataStatus.BioFather;
                            }

                            if (
                                personData.Mother &&
                                previousPersonData.Mother &&
                                personData.Mother == previousPersonData.Mother
                            ) {
                                shareMother = true;
                                motherStatus = personData.DataStatus.Mother;
                            } else if (
                                personData.BioMother &&
                                previousPersonData.BioMother &&
                                personData.BioMother == previousPersonData.BioMother
                            ) {
                                shareMother = true;
                                motherStatus = personData.DataStatus.BioMother;
                            } else if (
                                personData.Mother &&
                                previousPersonData.BioMother &&
                                personData.Mother == previousPersonData.BioMother
                            ) {
                                shareMother = true;
                                motherStatus = personData.DataStatus.Mother;
                            } else if (
                                personData.BioMother &&
                                previousPersonData.Mother &&
                                personData.BioMother == previousPersonData.Mother
                            ) {
                                shareMother = true;
                                motherStatus = personData.DataStatus.BioMother;
                            }

                            if (shareFather && shareMother) {
                                personData.pathStatus = Math.min(fatherStatus, motherStatus);
                                if (fatherStatus == 5 && motherStatus == 5) {
                                    personData.pathStatus = 5;
                                    condLog(
                                        "Both parents are non-biological for siblings ",
                                        personData,
                                        previousPersonData
                                    );
                                } else if (fatherStatus == 5 && motherStatus > 5) {
                                    personData.pathStatus = motherStatus;
                                    condLog("Father is non-biological for siblings ", personData, previousPersonData);
                                } else if (fatherStatus > 5 && motherStatus == 5) {
                                    personData.pathStatus = fatherStatus;
                                    condLog("Mother is non-biological for siblings ", personData, previousPersonData);
                                }
                            } else if (shareFather) {
                                personData.pathStatus = fatherStatus;
                            } else if (shareMother) {
                                personData.pathStatus = motherStatus;
                            }
                        } else if (thisPeepType == "P") {
                            condLog(
                                "TRYING to figure out the Spouse pathStatus for Super Big Tree ",
                                thisPeepCode,
                                " for ",
                                person,
                                personData.Spouses,
                                "vs",
                                previousPersonData.Spouses
                            );

                            if (personData && personData.Spouses && personData.Spouses.length > 0) {
                                let foundSpouse = false;
                                for (let s = 0; s < personData.Spouses.length; s++) {
                                    if (personData.Spouses[s].Id == previousPersonData.Id) {
                                        if (personData.Spouses[s].data_status.certainty == "certain") {
                                            personData.pathStatus = 20;
                                        } else if (personData.Spouses[s].data_status.certainty == "uncertain") {
                                            personData.pathStatus = 10;
                                        } else {
                                            personData.pathStatus = 0;
                                        }
                                        foundSpouse = true;
                                        break;
                                    }
                                }
                            }
                        }

                        if (nextPeepType == "K") {
                            theBothParentsText2 = "Spouse";

                            let spouseType = "Spouse";
                            let desiredSpouseId = -1;
                            if (personData.Id == nextPersonData.Father) {
                                spouseType = "Mother";
                                desiredSpouseId = nextPersonData.Mother;
                            } else if (personData.Id == nextPersonData.Mother) {
                                spouseType = "Father";
                                desiredSpouseId = nextPersonData.Father;
                            } else if (personData.Id == nextPersonData.BioFather) {
                                spouseType = "BioMother";
                                desiredSpouseId = nextPersonData.BioMother;
                            } else if (personData.Id == nextPersonData.BioMother) {
                                spouseType = "BioFather";
                                desiredSpouseId = nextPersonData.BioFather;
                            }

                            if (personData.Spouses && personData.Spouses.length > 0) {
                                // Find what kind of Parent this person is to the NEXT PERSON / KID

                                for (let indexSpouse = 0; indexSpouse < personData.Spouses.length; indexSpouse++) {
                                    const element = personData.Spouses[indexSpouse];
                                    if (element.Id == desiredSpouseId) {
                                        if (element.BirthName) {
                                            theBothParentsText2 = element.BirthName;
                                        } else if (element.BirthNamePrivate) {
                                            theBothParentsText2 = element.BirthNamePrivate;
                                        } else {
                                            theBothParentsText2 = "Private";
                                        }
                                    }
                                }
                            } else {
                                if (
                                    nextPersonData &&
                                    nextPersonData.Parents &&
                                    nextPersonData.Parents[desiredSpouseId]
                                ) {
                                    const element = nextPersonData.Parents[desiredSpouseId];
                                    if (element.Id == desiredSpouseId) {
                                        if (element.BirthName) {
                                            theBothParentsText2 = element.BirthName;
                                        } else if (element.BirthNamePrivate) {
                                            theBothParentsText2 = element.BirthNamePrivate;
                                        } else {
                                            theBothParentsText2 = "Private";
                                        }
                                    }
                                }
                            }
                            if (theBothParentsText == "" && theBothParentsText2 > "") {
                                theBothParentsText = theBothParentsText2;
                                theBothParentsText2 = "";
                            }
                        }
                        condLog(
                            "Individual 2412 theBothParentsText:",
                            theBothParentsText,
                            { theBothParentsText2 },
                            { needToVmove }
                        );
                    } else {
                        condLog(
                            "No BOTH PARENTS TEXT calculated for appID: ",
                            connectObject.appID,
                            " with type: ",
                            connectObject.type,
                            { indiPeepCode },
                            { personData },
                            { previousPersonData },
                            { nextPersonData }
                        );
                        // BUT ... IF the current PERSON is the MOTHER or FATHER of the PREVIOUS PERSON,
                        // THEN ... BothParentsText should be the OTHER parent of the PREVIOUS PERSON.
                        if (previousPersonData && previousPersonData.Parents) {
                            for (const parentId in previousPersonData.Parents) {
                                const parent = previousPersonData.Parents[parentId];
                                if (parent.Id == personData.Id) {
                                    // Current person is a parent of the previous person
                                    for (const otherParentId in previousPersonData.Parents) {
                                        if (otherParentId != personData.Id) {
                                            const otherParent = previousPersonData.Parents[otherParentId];
                                            if (otherParent.BirthName) {
                                                theBothParentsText = otherParent.BirthName;
                                            } else if (otherParent.BirthNamePrivate) {
                                                theBothParentsText = otherParent.BirthNamePrivate;
                                            } else {
                                                theBothParentsText = "Private";
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // OR ... IF the NEXT PERSON is the CHILD of the CURRENT PERSON,
                        // THEN ... BothParentsText should be the OTHER parent of the NEXT PERSON.
                        if (nextPersonData && nextPersonData.Parents) {
                            for (const parentId in nextPersonData.Parents) {
                                const parent = nextPersonData.Parents[parentId];
                                if (parent.Id == personData.Id) {
                                    // Current person is a parent of the next person
                                    for (const otherParentId in nextPersonData.Parents) {
                                        if (otherParentId != personData.Id) {
                                            const otherParent = nextPersonData.Parents[otherParentId];
                                            if (otherParent.BirthName) {
                                                theBothParentsText2 = otherParent.BirthName;
                                            } else if (otherParent.BirthNamePrivate) {
                                                theBothParentsText2 = otherParent.BirthNamePrivate;
                                            } else {
                                                theBothParentsText2 = "Private";
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (theBothParentsText == "" && theBothParentsText2 > "") {
                            theBothParentsText = theBothParentsText2;
                            theBothParentsText2 = "";
                        }
                        condLog(
                            "Individual 2460 theBothParentsText:",
                            theBothParentsText,
                            { theBothParentsText2 },
                            { needToVmove }
                        );
                    }

                    // ENSURE that we have a PATH STATUS for the person before calculating the proper certainty images
                    if (personData && personData.pathStatus == 5) {
                        // `<image  height="16" href="https://apps.wikitree.com/apps/clarke11007/pix/adopted.png" x=` +
                        certaintyStatusImage =
                            `<image ` +
                            initialConfidenceImagesDisplayMode +
                            `class=ConfidenceImage height="16" href="https://www.wikitree.com/images/icons/icon-dna-none.svg" `;
                        certaintyWidth = 25;
                    } else if (personData && personData.pathStatus == 10) {
                        certaintyStatusImage =
                            `<image ` +
                            initialConfidenceImagesDisplayMode +
                            `class=ConfidenceImage height="14" href="https://www.wikitree.com/images/icons/icon-uncertain.svg" `;
                        certaintyWidth = 16;
                    } else if (personData && personData.pathStatus == 20) {
                        certaintyStatusImage =
                            `<image ` +
                            initialConfidenceImagesDisplayMode +
                            `class=ConfidenceImage height="14" href="https://www.wikitree.com/images/icons/icon-confident.svg" `;
                        certaintyWidth = 16;
                    } else if (personData && personData.pathStatus == 30) {
                        certaintyStatusImage =
                            `<image ` +
                            initialConfidenceImagesDisplayMode +
                            `class=ConfidenceImage height="16" href="https://www.wikitree.com/images/icons/icon-dna-checked.svg" `;
                        certaintyWidth = 40;
                    }

                    /*
                    Note on how to calculate the confidence status of a relationship between siblings:
                    "For siblings, the status should be the least confident of their relationships to the most confident shared parent."

                            With the statuses from most confident to least confident being:

                            DNA-confirmed
                            confident (aka certain)
                            uncertain (aka guess)
                            unknown (unmarked, null)
                            non-biological
                    */

                    // ===========================================
                    // Calculate the proper CERTAINTY STATUS IMAGE for the person based on their pathStatus, as well as ORANGE ARROWs
                    // AND ... for good measure, also update the CURRENT EXTENDER and/or MINI EXTENDER (for the relationship description at bottom of popup)
                    // ===========================================

                    if (thisPeepType == "K") {
                        ySVG += bubbleHeight + bubbleHeightSpacer;
                        if (needToVmove > 0) {
                            xSVG += (bubbleWidth + bubbleWidthSpacer) / 2;
                        }
                        if (certaintyStatusImage > "") {
                            SVGhtml +=
                                certaintyStatusImage +
                                ` x=` +
                                (xSVG + bubbleWidth - certaintyWidth - (needToVmove == 1 ? bubbleWidth : 0)) +
                                ` y=${ySVG - 2 - certaintyHeight + 0 * bubbleHeightSpacer} />`;
                        }
                        SVGhtml += svgArrowDown;
                        SVGhtml +=
                            `<line class=OrangeArrow style="stroke:rgb(10, 108, 24);stroke-width:2; ` +
                            displayOrangeArrowStyle +
                            `"" x1="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y1="` +
                            (ySVG - bubbleHeightSpacer) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y2="` +
                            (ySVG - 14) +
                            `"></line>`;

                        SVGhtml +=
                            `<line class=OrangeArrowNot style="stroke:rgb(10, 108, 24);stroke-width:2; ` +
                            showTallConnectorsForOrangeArrowStyle +
                            `"" x1="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y1="` +
                            (ySVG - bubbleHeightSpacer) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;

                        relType = "child";
                        if (personData && personData.Gender == "Male") {
                            relType = "son";
                        } else if (personData && personData.Gender == "Female") {
                            relType = "daughter";
                        }
                        if (personData && personData.pathStatus == 5) {
                            relType = "adopted " + relType;
                            currentExtender += "(" + miniExtender.replace("'s ", "") + ")'s " + relType + "'s ";
                            if (miniExtender > "") {
                                currentExtenderColour +=
                                    "<span style='background-color:" +
                                    bkgdColours[thisBkgdColourNum % 2] +
                                    ";'>" +
                                    "(" +
                                    miniExtender.replace("'s ", "") +
                                    ")</span>'s ";
                            } else {
                                currentExtenderColour += "'s ";
                            }
                            thisBkgdColourNum++;

                            currentExtenderColour +=
                                "<span style='background-color:" +
                                bkgdColours[thisBkgdColourNum % 2] +
                                ";'>" +
                                relType +
                                "</span>" +
                                "'s ";

                            miniExtender = "";
                        } else {
                            miniExtender += "'s " + relType;
                        }

                        SVGhtml +=
                            `<text class=OrangeArrow style="font-size: .9rem; fill: orange; font-weight: bold; ` +
                            displayOrangeArrowStyle +
                            `" text-anchor="middle" x="` +
                            (xSVG + 20 + 10 + (bubbleWidth - 60) / 2 - (needToVmove == 1 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y="${ySVG - 2 /* - 18 */}" >` +
                            relType +
                            `</text>`;
                    } else if (thisPeepType == "R") {
                        if (needToVmove > 0) {
                            xSVG += (bubbleWidth + bubbleWidthSpacer) / 2;
                        }
                        if (certaintyStatusImage > "") {
                            SVGhtml +=
                                certaintyStatusImage +
                                ` x=` +
                                (xSVG + bubbleWidth - certaintyWidth) +
                                ` y=${ySVG + 2 - bubbleHeightSpacer} />`;
                        }
                        SVGhtml += svgArrowUp;
                        condLog("GOING UP for thisPeepType R", { xSVG }, { ySVG }, { personData });
                        SVGhtml +=
                            `<line class=OrangeArrow style="stroke:rgb(10, 108, 24);stroke-width:2; ` +
                            displayOrangeArrowStyle +
                            `" x1="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y1="` +
                            (ySVG - bubbleHeightSpacer + 12) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;
                        SVGhtml +=
                            `<line class=OrangeArrowNot style="stroke:rgb(10, 108, 24);stroke-width:2; ` +
                            showTallConnectorsForOrangeArrowStyle +
                            `" x1="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y1="` +
                            (ySVG - bubbleHeightSpacer) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2 - (needToVmove > 0 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;
                        relType = "parent";
                        if (personData && personData.Gender == "Male") {
                            relType = "father";
                        } else if (personData && personData.Gender == "Female") {
                            relType = "mother";
                        }

                        if (personData && personData.pathStatus == 5) {
                            relType = "adopted " + relType;
                            currentExtender += "(" + miniExtender.replace("'s ", "") + ")'s " + relType + "'s ";
                            if (miniExtender > "") {
                                currentExtenderColour +=
                                    "<span style='background-color:" +
                                    bkgdColours[thisBkgdColourNum % 2] +
                                    ";'>" +
                                    "(" +
                                    miniExtender.replace("'s ", "") +
                                    ")</span>'s ";
                            } else {
                                currentExtenderColour += "'s ";
                            }

                            thisBkgdColourNum++;
                            currentExtenderColour +=
                                "<span style='background-color:" +
                                bkgdColours[thisBkgdColourNum % 2] +
                                ";'>" +
                                relType +
                                "</span>" +
                                "'s ";

                            miniExtender = "";
                        } else {
                            miniExtender += "'s " + relType;
                        }

                        SVGhtml +=
                            `<text class=OrangeArrow style="font-size: .9rem; fill: orange; font-weight: bold; ` +
                            displayOrangeArrowStyle +
                            `" text-anchor="middle" x="` +
                            (xSVG + 20 + 10 + (bubbleWidth - 60) / 2 - (needToVmove == 1 ? bubbleWidthSpacer / 2 : 0)) +
                            `" y="${ySVG - 18}" >` +
                            relType +
                            `</text>`;
                        ySVG -= bubbleHeight + bubbleHeightSpacer;
                    } else if (thisPeepType == "B") {
                        if (certaintyStatusImage > "") {
                            SVGhtml +=
                                certaintyStatusImage +
                                ` x=` +
                                (xSVG + bubbleWidth - certaintyWidth) +
                                ` y=${ySVG + 2 - bubbleHeightSpacer} />`;
                        }
                        SVGhtml += svgArrowUp;
                        condLog("GOING UP for thisPeepType B", { xSVG }, { ySVG }, { personData });
                        SVGhtml +=
                            `<line class=OrangeArrow style="stroke:rgb(10, 108, 24);stroke-width:2; ` +
                            displayOrangeArrowStyle +
                            `" x1="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y1="` +
                            (ySVG - bubbleHeightSpacer + 12) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;
                        SVGhtml +=
                            `<line class=OrangeArrowNot style="stroke:rgb(10, 108, 24);stroke-width:2; ` +
                            showTallConnectorsForOrangeArrowStyle +
                            `" x1="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y1="` +
                            (ySVG - bubbleHeightSpacer) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;
                        relType = "bio-parent";
                        if (personData && personData.Gender == "Male") {
                            relType = "bio-father";
                        } else if (personData && personData.Gender == "Female") {
                            relType = "bio-mother";
                        }
                        if (personData && personData.pathStatus == 5) {
                            relType = "adopted " + relType;
                            currentExtender += "(" + miniExtender.replace("'s ", "") + ") 's " + relType + "'s ";
                            if (miniExtender > "") {
                                currentExtenderColour +=
                                    "<span style='background-color:" +
                                    bkgdColours[thisBkgdColourNum % 2] +
                                    ";'>" +
                                    "(" +
                                    miniExtender.replace("'s ", "") +
                                    ")</span>" +
                                    "'s ";
                            } else {
                                currentExtenderColour += "'s ";
                            }

                            thisBkgdColourNum++;
                            currentExtenderColour +=
                                "<span style='background-color:" +
                                bkgdColours[thisBkgdColourNum % 2] +
                                ";'>" +
                                relType +
                                "</span>" +
                                "'s ";

                            miniExtender = "";
                        } else {
                            miniExtender += "'s " + relType;
                        }

                        SVGhtml +=
                            `<text class=OrangeArrow style="font-size: .9rem; fill: orange; font-weight: bold; ` +
                            displayOrangeArrowStyle +
                            `" text-anchor="middle" x="` +
                            (xSVG + 20 + 10 + (bubbleWidth - 60) / 2) +
                            `" y="${ySVG - 18}" >` +
                            relType +
                            `</text>`;
                        ySVG -= bubbleHeight + bubbleHeightSpacer;
                    } else if (thisPeepType == "S") {
                        if (certaintyStatusImage > "") {
                            SVGhtml +=
                                certaintyStatusImage +
                                ` x=` +
                                (xSVG + bubbleWidth + bubbleWidthSpacer - certaintyWidth - 2) +
                                ` y=${ySVG + 20 - bubbleHeightSpacer / 2 - 2} />`;
                        }

                        SVGhtml += svgArrowRight;
                        relType = "sibling";
                        if (personData && personData.Gender == "Male") {
                            relType = "brother";
                        } else if (personData && personData.Gender == "Female") {
                            relType = "sister";
                        }

                        if (
                            personData &&
                            previousPersonData &&
                            personData.Father &&
                            previousPersonData.Father &&
                            personData.Father != previousPersonData.Father
                        ) {
                            relType = halfPrefix + relType;
                        } else if (
                            personData &&
                            previousPersonData &&
                            personData.Mother &&
                            previousPersonData.Mother &&
                            personData.Mother != previousPersonData.Mother
                        ) {
                            relType = halfPrefix + relType;
                        }

                        miniExtender += "'s " + relType;

                        SVGhtml +=
                            `<text class=OrangeArrow style="font-size: .9rem; fill: orange; font-weight: bold; ` +
                            displayOrangeArrowStyle +
                            `" text-anchor="middle" x="` +
                            (xSVG + bubbleWidth + bubbleWidthSpacer / 2) /* + bubbleWidthSpacer */ +
                            `" y="${ySVG + bubbleHeight}" >` +
                            relType +
                            `</text>`;

                        SVGhtml +=
                            `<line style="stroke:rgb(0, 0, 255);stroke-width:2" x1="` +
                            (xSVG + bubbleWidth) +
                            `" y1="` +
                            (ySVG + bubbleHeight / 2) +
                            `" x2="` +
                            (xSVG + bubbleWidth + bubbleWidthSpacer) +
                            `" y2="` +
                            (ySVG + bubbleHeight / 2) +
                            `"></line>`;

                        xSVG += bubbleWidth + bubbleWidthSpacer;
                    } else if (thisPeepType == "P") {
                        if (certaintyStatusImage > "") {
                            SVGhtml +=
                                certaintyStatusImage +
                                ` x=` +
                                (xSVG + bubbleWidth + bubbleWidthSpacer - certaintyWidth - 2) +
                                ` y=${ySVG + 20 - bubbleHeightSpacer / 2 - 4} />`;
                        }

                        SVGhtml += svgArrowRight;
                        relType = "spouse";
                        if (personData && personData.Gender == "Male") {
                            relType = "husband";
                        } else if (personData && personData.Gender == "Female") {
                            relType = "wife";
                        }

                        currentExtender += "(" + miniExtender.replace("'s ", "") + ")'s " + relType + "'s ";
                        if (miniExtender > "") {
                            currentExtenderColour +=
                                "<span style='background-color:" +
                                bkgdColours[thisBkgdColourNum % 2] +
                                ";'>" +
                                "(" +
                                miniExtender.replace("'s ", "") +
                                ")</span>'s ";
                        } else {
                            currentExtenderColour += "'s ";
                        }
                        thisBkgdColourNum++;
                        currentExtenderColour +=
                            "<span style='background-color:" +
                            bkgdColours[thisBkgdColourNum % 2] +
                            ";'>" +
                            relType +
                            "</span>" +
                            "'s ";

                        miniExtender = "";

                        SVGhtml +=
                            `<text class=OrangeArrow style="font-size: .9rem; fill: orange; font-weight: bold; ` +
                            displayOrangeArrowStyle +
                            `" text-anchor="middle" x="` +
                            (xSVG + bubbleWidth + bubbleWidthSpacer / 2) /* + bubbleWidthSpacer */ +
                            `" y="${ySVG + bubbleHeight}" >` +
                            relType +
                            `</text>`;
                        SVGhtml +=
                            `<line style="stroke:rgb(255,0,0);stroke-width:3" x1="` +
                            (xSVG + bubbleWidth) +
                            `" y1="` +
                            (ySVG + bubbleHeight / 2 - 4) +
                            `" x2="` +
                            (xSVG + bubbleWidth + bubbleWidthSpacer) +
                            `" y2="` +
                            (ySVG + bubbleHeight / 2 - 4) +
                            `"></line>`;

                        SVGhtml +=
                            `<line style="stroke:rgb(255,0,0);stroke-width:3" x1="` +
                            (xSVG + bubbleWidth) +
                            `" y1="` +
                            (ySVG + bubbleHeight / 2 + 4) +
                            `" x2="` +
                            (xSVG + bubbleWidth + bubbleWidthSpacer) +
                            `" y2="` +
                            (ySVG + bubbleHeight / 2 + 4) +
                            `"></line>`;

                        xSVG += bubbleWidth + bubbleWidthSpacer;
                    } else {
                        console.log("ERROR - unknown thisPeepType: ", thisPeepType, { personData });
                    }
                } // END of IF (not A0, not first person in the list)

                // ===========================================
                // PREPARE the FAMILY BUBBLE for the person  || (for ALL persons, A0 and their followers)
                // ===========================================

                let thisBkgdColour = bkgdColours[thisBkgdColourNum % 2];
                if (doAlternateColouring) {
                    currentBkgdColour = thisBkgdColour;
                } else {
                    currentBkgdColour = "white";
                }
                condLog("GOING to PREPARE (1626) the FAMILY BUBBLE for ", { cc }, personData.BirthNamePrivate);
                SVGhtml +=
                    `<rect class=FamilyBubble bubbleColour="` +
                    thisBkgdColour +
                    `" x="${xSVG}" y="${ySVG}" rx="10" ry="10" width="${bubbleWidth}" height="${bubbleHeight}" style="fill:` +
                    currentBkgdColour +
                    `;stroke:black;stroke-width:1;opacity:1"></rect>`;
                thisBkgdColour + `;stroke:black;stroke-width:1;opacity:1"></rect>`;
                SVGhtml += `<image  height="40" href="https://www.wikitree.com/${photoUrl}" x=${xSVG + 10} y=${ySVG + 2} />`;

                if (!person || !personData) {
                    personData = { LongName: "Private" };
                } else if (person && personData && !personData.LongName) {
                    if (person.getDisplayName) {
                        personData.LongName = person.getDisplayName();
                    } else {
                        if (
                            personData.RealName &&
                            personData.RealName > "" &&
                            personData.LastNameAtBirth &&
                            personData.LastNameAtBirth > ""
                        ) {
                            personData.LongName = personData.RealName + " " + personData.LastNameAtBirth;
                        } else {
                            personData.LongName = "Private";
                        }
                    }
                }

                thisPopup.innerHTML =
                    "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                    personData.LongName +
                    "</text></svg>";
                condLog("Width of ", personData.LongName, document.getElementById("testTextLength").clientWidth);

                let extraLengthStuff = "";
                if (document.getElementById("testTextLength").clientWidth > maxWidth4NoSquishing) {
                    extraLengthStuff = ` textLength="${bubbleWidth - 60}" lengthAdjust="spacingAndGlyphs"`;
                }

                let thisDisplayName = personData.LongName;
                if (embedProfileLinks) {
                    thisDisplayName = `<a href="https://www.wikitree.com/wiki/${person._data.Name}" target="_blank">${personData.LongName}</a>`;
                }

                SVGhtml +=
                    `<text class=FamilyBubbleNameText wtname="${personData.Name}"  id="text${thisPeepCode}" text-anchor="middle" x="` +
                    (xSVG + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 18}"  ${extraLengthStuff}>` +
                    thisDisplayName +
                    `</text>`;

                SVGhtml +=
                    `<text text-anchor="middle" style="font-size:1rem;" x="` +
                    (xSVG + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 38}">` +
                    lifespan(person) +
                    `</text>`;

                if (theBothParentsText > "" && theBothParentsText2 > "" && theBothParentsText != theBothParentsText2) {
                    // console.log("Both parents texts:", theBothParentsText, theBothParentsText2);
                    // BOTH PARENTS TEXT # 1
                    thisPopup.innerHTML =
                        "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                        theBothParentsText +
                        "</text></svg>";
                    condLog("Width of ", theBothParentsText, document.getElementById("testTextLength").clientWidth);

                    let extraLengthStuff = "";
                    if (document.getElementById("testTextLength").clientWidth > (maxWidth4NoSquishing - 40) / 0.9) {
                        extraLengthStuff = ` textLength="${bubbleWidth / 2}" lengthAdjust="spacingAndGlyphs"`;
                    }

                    SVGhtml +=
                        `<text class="BothParentsElement" text-anchor="middle" style="font-size:0.9rem; font-style:normal; display:` +
                        (showBothParents ? "inline" : "none") +
                        `;" x="` +
                        (xSVG + 40 - bubbleWidth / 2) +
                        `" y="${ySVG + 58}"   ${extraLengthStuff}>` +
                        theBothParentsText +
                        " & " +
                        `</text>`;

                    // BOTH PARENTS TEXT # 2
                    thisPopup.innerHTML =
                        "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                        theBothParentsText2 +
                        "</text></svg>";
                    condLog("Width of ", theBothParentsText2, document.getElementById("testTextLength").clientWidth);

                    extraLengthStuff = "";
                    if (document.getElementById("testTextLength").clientWidth > (maxWidth4NoSquishing - 40) / 0.9) {
                        extraLengthStuff = ` textLength="${bubbleWidth / 2}" lengthAdjust="spacingAndGlyphs"`;
                    }

                    SVGhtml +=
                        `<text class="BothParentsElement" text-anchor="middle" style="font-size:0.9rem; font-style:normal; display:` +
                        (showBothParents ? "inline" : "none") +
                        `;" x="` +
                        (xSVG + 60 + (2 * bubbleWidth) / 2) +
                        `" y="${ySVG + 58}"   ${extraLengthStuff}>` +
                        "& " +
                        theBothParentsText2 +
                        `</text>`;

                    isHalfRelationship = true;
                } else if (theBothParentsText > "") {
                    thisPopup.innerHTML =
                        "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                        theBothParentsText +
                        "</text></svg>";
                    condLog("Width of ", theBothParentsText, document.getElementById("testTextLength").clientWidth);

                    let extraLengthStuff = "";
                    if (document.getElementById("testTextLength").clientWidth > (maxWidth4NoSquishing + 20) / 0.9) {
                        extraLengthStuff = ` textLength="${bubbleWidth - 24}" lengthAdjust="spacingAndGlyphs"`;
                    }

                    SVGhtml +=
                        `<text class="BothParentsElement" text-anchor="middle" style="font-size:0.9rem; font-style:normal; display:` +
                        (showBothParents ? "inline" : "none") +
                        `;" x="` +
                        (xSVG + 40 + (bubbleWidth - 60) / 2) +
                        `" y="${ySVG + 58}"   ${extraLengthStuff}>` +
                        "& " +
                        theBothParentsText +
                        `</text>`;
                }

                minX = Math.min(minX, xSVG);
                maxX = Math.max(maxX, xSVG);
                minY = Math.min(minY, ySVG);
                maxY = Math.max(maxY, ySVG);
                // let peepNames = person.getDisplayName().split(" ");
                // for (let i = 0; i < peepNames.length; i++) {
                //     // connectionHTML += peepNames[i] + "<br/>";
                // }
                // connectionHTML += "<br/>" + lifespan(person) + "<br/>";

                // ahnNum = Math.floor(ahnNum / 2);
                previousPersonData = personData;
                prevPeepCode = thisPeepCode;
            } // DONE FOR cc = 0 to breakdown list .length

            currentExtender += "'s (" + miniExtender.replace("'s ", "") + ")";
            currentExtender = currentExtender
                .replace(/\('s \)/g, "")
                .replace(/'s \(\)/g, "")
                .replace(/'s 's/g, "'s")
                .replace(/\(\)/g, "");
            condLog({ currentExtender });

            if (miniExtender > "") {
                currentExtenderColour +=
                    "'s <span style='background-color:" +
                    bkgdColours[thisBkgdColourNum % 2] +
                    ";'>" +
                    "(" +
                    miniExtender.replace("'s ", "") +
                    ")</span>";
            }
            currentExtenderColour = currentExtenderColour
                .replace(/\('s \)/g, "")
                .replace(/'s \(\)/g, "")
                .replace(/<span style='background-color:lightgreen;'><\/span>/g, "")
                .replace(/<span style='background-color:lightyellow;'><\/span>/g, "")
                .replace(/'s 's/g, "'s")
                .replace(/\(\)/g, "");
            condLog({ currentExtenderColour });

            currentExtender = simplifyFamilyRelationshipChains(currentExtender);
            currentExtenderColour = simplifyFamilyRelationshipChains(currentExtenderColour);

            if (directionFromTo == "From") {
                pathDescriptionsHTML[aaa].From =
                    (currentFromDescription + currentExtender).replace(/'s 's/g, "'s") + ".";
                pathDescriptionsHTML[aaa].FromColour =
                    (currentFromDescriptionColour + currentExtenderColour).replace(/'s 's/g, "'s") + ".";
                condLog(
                    "*" + currentFromDescriptionColour + "*" + currentExtenderColour + "*",
                    "$" + pathDescriptionsHTML[aaa].FromColour + "$"
                );
            } else {
                pathDescriptionsHTML[aaa].To = (currentToDescription + currentExtender).replace(/'s 's/g, "'s") + ".";
                pathDescriptionsHTML[aaa].ToColour =
                    (currentToDescriptionColour + currentExtenderColour).replace(/'s 's/g, "'s") + ".";
            }

            if (aaa > 0) {
                // popupHTML +=
                //     "<svg id=connectionsDiagramDivider" +
                //     aa +
                //     "  width=" +
                //     20 +
                //     " height=" +
                //     (maxY - minY + bubbleHeight + bubbleHeightSpacer) +
                //     ">" +
                //     `<line style="stroke:rgb(4, 53, 20);stroke-width:2" x1="` +
                //     10 +
                //     `" y1="` +
                //     0 +
                //     `" x2="` +
                //     10 +
                //     `" y2="` +
                //     (maxY - minY + bubbleHeight + bubbleHeightSpacer) +
                //     `"></line>` +
                //     "</svg>";
            }
            // viewbox : minX , minY , width , height

            if (aaa == pathNum) {
                svgDisplayStyle = ' style="display:revert" ';
            } else {
                svgDisplayStyle = ' style="display:none" ';
            }

            SVGhtml =
                "<svg id=connectionsDiagram" +
                aaa +
                "  width=" +
                (20 + bubbleWidth + (maxX - minX)) +
                " height=" +
                (maxY - minY + bubbleHeight + bubbleHeightSpacer) +
                " " +
                svgDisplayStyle +
                ` viewbox="` +
                (minX - 10) +
                " " +
                (minY - 10) +
                " " +
                (20 + bubbleWidth + (maxX - minX)) +
                "  " +
                (maxY - minY + bubbleHeight + bubbleHeightSpacer) +
                `" >` +
                SVGhtml +
                "</svg>";

            popupHTML += SVGhtml;
        }

        if (codesList.length > 1) {
            popupHTML = pathsButtonsHTML + popupHTML;
        }
        popupHTML += connectionHTML;

        // RESET if the type was originally 'Ahn'
        if (connectObject.appID == "fromAhn") {
            connectObject.type = "Ahn";
            connectObject.appID = "Ahn";
        }
    } else if (connectObject.type == "CC7") {
        connectObject.person.CodesList = ["A0"];
        let codesList = connectObject.person.CodesList;
        let minX = 10;
        let minY = 10;
        let maxX = 10;
        let maxY = 10;

        for (let aa = 0; aa < codesList.length; aa++) {
            var thisCode = codesList[aa];

            condLog("CODE # ", aa, thisCode);
            var breakDownList = breakDownCC7Code(thisCode);

            let SVGhtml = "";
            let xSVG = 10;
            let ySVG = 10;

            thisPopup.innerHTML =
                "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                "Josh Azariah Ashley" +
                "</text></svg>";
            condLog("Width of ", "Josh Azariah Ashley", document.getElementById("testTextLength").clientWidth);
            condLog({ thisCode }, connectObject.person.LongName);

            let maxWidth4NoSquishing = document.getElementById("testTextLength").clientWidth;

            for (let cc = 0; cc < breakDownList.length; cc++) {
                let thisPeepType = breakDownList[cc][0][0];
                let thisPeepCode = breakDownList[cc][1];

                person = connectObject.person; //thePeopleList[ connectObject.leafCollection[thisPeepCode].Id ];
                var photoUrl = person.getPhotoUrl(75);

                // Use generic gender photos if there is not profile photo available
                if (!photoUrl || person.IsLiving == true) {
                    if (person.getGender() === "Male") {
                        photoUrl = "images/icons/male.gif";
                    } else if (person && person.getGender() === "Female") {
                        photoUrl = "images/icons/female.gif";
                    } else {
                        photoUrl = "images/icons/no-gender.gif";
                    }
                }

                // connectionHTML += `<img height=40px src="https://www.wikitree.com/${photoUrl}"> <BR>`;

                if (thisPeepCode != "A0") {
                    let basicArrowUp = [
                        [0, 4],
                        [3, 0],
                        [1, 0],
                        [1, -4],
                        [-1, -4],
                        [-1, 0],
                        [-3, 0],
                        [0, 4],
                    ];

                    let basicArrowRight = [
                        [4, 0],
                        [0, 3],
                        [0, 1],
                        [-4, 1],
                        [-4, -1],
                        [0, -1],
                        [0, -3],
                        [4, 0],
                    ];

                    let basicArrowWidth = 3;
                    let svgArrowUp = "<polyline fill='orange' stroke='orange' points='";
                    let svgArrowRight = "<polyline fill='orange' stroke='orange' points='";

                    for (var i = 0; i < basicArrowUp.length; i++) {
                        if (i > 0) {
                            svgArrowUp += ",";
                            svgArrowRight += ",";
                        }
                        ptUp = basicArrowUp[i];
                        ptRt = basicArrowRight[i];

                        svgArrowUp += xSVG + ptUp[0] * basicArrowWidth + "," + (ySVG + ptUp[1] * basicArrowWidth);
                        svgArrowRight += xSVG + ptRt[0] * basicArrowWidth + "," + (ySVG + ptRt[1] * basicArrowWidth);
                    }
                    svgArrowUp += "'></polyline>";
                    svgArrowRight += "'></polyline>";

                    if (thisPeepType == "K") {
                        ySVG += bubbleHeight + bubbleHeightSpacer;
                        SVGhtml += svgArrowUp;
                        SVGhtml +=
                            `<line style="stroke:rgb(10, 108, 24);stroke-width:2" x1="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y1="` +
                            (ySVG - 20) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;
                    } else if (thisPeepType == "R") {
                        SVGhtml += svgArrowUp;
                        SVGhtml +=
                            `<line style="stroke:rgb(10, 108, 24);stroke-width:2" x1="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y1="` +
                            (ySVG - 20) +
                            `" x2="` +
                            (xSVG + bubbleWidth / 2) +
                            `" y2="` +
                            ySVG +
                            `"></line>`;
                        ySVG -= bubbleHeight + bubbleHeightSpacer;
                    } else if (thisPeepType == "S") {
                        SVGhtml += svgArrowRight;
                        SVGhtml +=
                            `<line style="stroke:rgb(0, 0, 255);stroke-width:2" x1="` +
                            (xSVG + bubbleWidth) +
                            `" y1="` +
                            (ySVG + bubbleHeight / 2) +
                            `" x2="` +
                            (xSVG + bubbleWidth + 20) +
                            `" y2="` +
                            (ySVG + bubbleHeight / 2) +
                            `"></line>`;

                        xSVG += bubbleWidth + bubbleWidthSpacer;
                    } else if (thisPeepType == "P") {
                        SVGhtml += svgArrowRight;
                        SVGhtml +=
                            `<line style="stroke:rgb(255,0,0);stroke-width:3" x1="` +
                            (xSVG + bubbleWidth) +
                            `" y1="` +
                            (ySVG + bubbleHeight / 2 - 5) +
                            `" x2="` +
                            (xSVG + bubbleWidth + 20) +
                            `" y2="` +
                            (ySVG + bubbleHeight / 2 - 5) +
                            `"></line>`;

                        SVGhtml +=
                            `<line style="stroke:rgb(255,0,0);stroke-width:3" x1="` +
                            (xSVG + bubbleWidth) +
                            `" y1="` +
                            (ySVG + bubbleHeight / 2 + 5) +
                            `" x2="` +
                            (xSVG + bubbleWidth + 20) +
                            `" y2="` +
                            (ySVG + bubbleHeight / 2 + 5) +
                            `"></line>`;

                        xSVG += bubbleWidth + bubbleWidthSpacer;
                    }
                }
                condLog("GOING to PREPARE (1918) the FAMILY BUBBLE for ", person._data.BirthNamePrivate);
                SVGhtml +=
                    `<rect x="${xSVG}" y="${ySVG}" rx="10" ry="10" width="${bubbleWidth}" height="${bubbleHeight}" style="fill:` +
                    thisBkgdColour +
                    `;stroke:black;stroke-width:1;opacity:1"></rect>`;
                SVGhtml += `<image  height="40" href="https://www.wikitree.com/${photoUrl}" x=${xSVG + 10} y=${ySVG + 2} />`;

                thisPopup.innerHTML =
                    "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                    person.getDisplayName() +
                    "</text></svg>";
                condLog("Width of ", person.getDisplayName(), document.getElementById("testTextLength").clientWidth);

                let extraLengthStuff = "";
                if (document.getElementById("testTextLength").clientWidth > maxWidth4NoSquishing) {
                    extraLengthStuff = ` textLength="${bubbleWidth - 60}" lengthAdjust="spacingAndGlyphs"`;
                }
                SVGhtml +=
                    `<text id="text${thisPeepCode}" text-anchor="middle" x="` +
                    (xSVG + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 18}"  ${extraLengthStuff}>` +
                    person.getDisplayName() +
                    `</text>`;

                // SVGhtml +=
                //     `<text id="zextAhn${ahnNum}" text-anchor="middle" x="` +
                //     (10 + 40 + 10 + (bubbleWidth - 60) / 2) +
                //     `" y="${ySVG + 38}"  >` +
                //     // person.getDisplayName() +
                //     "Josh Azariah Ashley" +
                //     `</text>`;

                SVGhtml +=
                    `<text text-anchor="middle" style="font-size:1rem;" x="` +
                    (xSVG + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 38}">* ` +
                    lifespan(person) +
                    `</text>`;

                minX = Math.min(minX, xSVG);
                maxX = Math.max(maxX, xSVG);
                minY = Math.min(minY, ySVG);
                maxY = Math.max(maxY, ySVG);
                // let peepNames = person.getDisplayName().split(" ");
                // for (let i = 0; i < peepNames.length; i++) {
                //     // connectionHTML += peepNames[i] + "<br/>";
                // }
                // connectionHTML += "<br/>" + lifespan(person) + "<br/>";

                // ahnNum = Math.floor(ahnNum / 2);
            }

            if (aa > 0) {
                popupHTML +=
                    "<svg id=connectionsDiagram width=" +
                    20 +
                    " height=" +
                    ySVG +
                    ">" +
                    `<line style="stroke:rgb(4, 53, 20);stroke-width:2" x1="` +
                    xSVG +
                    `" y1="` +
                    0 +
                    `" x2="` +
                    10 +
                    `" y2="` +
                    ySVG +
                    `"></line>` +
                    "</svg>";
            }
            // viewbox : minX , minY , width , height
            SVGhtml =
                "<svg id=connectionsDiagram width=" +
                (20 + bubbleWidth + (maxX - minX)) +
                " height=" +
                (maxY - minY + bubbleHeight + bubbleHeightSpacer) +
                ` viewbox="` +
                (minX - 10) +
                " " +
                (minY - 10) +
                " " +
                (20 + bubbleWidth + (maxX - minX)) +
                "  " +
                (maxY - minY + bubbleHeight + bubbleHeightSpacer) +
                `" >` +
                SVGhtml +
                "</svg>";
            popupHTML += SVGhtml;
        }
        let settings4pathHTML =
            "<input type=checkbox id=pathSettingsCheckbox checked> A " +
            "<input type=checkbox id=pathSettingsCheckbox > B " +
            "<input type=checkbox id=pathSettingsCheckbox > C ";
        popupHTML += connectionHTML + settings4pathHTML;
    }

    popupHTML += "</div></div>";

    let endPopupHTML =
        "<label><input type=checkbox onclick=hideShowOrangeArrows(); id=hideShowOrangeArrowsCheckbox " +
        (showOrangeArrows ? "checked" : "") +
        " > <svg height=30 width=30 viewBox='20 -20 30 40'><polyline fill='orange' stroke='orange' points='25,-17,34,-5,28,-5,28,7,22,7,22,-5,16,-5,25,-17'></polyline></svg></label> " +
        "<label><input type=checkbox onclick=hideShowConfidence(); id=hideShowConfidenceCheckbox  " +
        (showConfidenceImages ? "checked" : "") +
        " > <image  height='14' src='https://www.wikitree.com/images/icons/icon-confident.svg' /></label> &nbsp;&nbsp;&nbsp;" +
        "<label><input type=checkbox onclick=hideShowAlternateFamilyColours(); id=hideShowAlternateFamilyColoursCheckbox  " +
        (doAlternateColouring ? "checked" : "") +
        " > <svg height=25 width=50 viewBox='-45 0 80 20'>" +
        '<rect rx="10" ry="10" width="30" height="10" x="-40" style="fill:lightgreen;stroke:black;stroke-width:1;opacity:1"></rect> - <rect rx="10" ry="10" width="30" height="10" style="fill:lightyellow;stroke:black;stroke-width:1;opacity:1"></rect>' +
        "</svg></label> &nbsp;&nbsp;&nbsp;" +
        "<label><input type=checkbox onclick=doEmbedProfileLinks(); id=doEmbedProfileLinksCheckbox  " +
        (embedProfileLinks ? "checked" : "") +
        " > <U>URL</U> </label> &nbsp;&nbsp;&nbsp;" +
        "<label><input type=checkbox onclick=doShowBothParents(); id=doShowBothParentsCheckbox  " +
        (showBothParents ? "checked" : "") +
        " > <img src='https://www.wikitree.com/images/icons/male.gif' height=20px > + <img src='https://www.wikitree.com/images/icons/female.gif' height=20px > </label> &nbsp;&nbsp;&nbsp;" +
        "<label><input type=checkbox onclick=hideShowPathDescriptions(); id=hideShowPathDescriptionsCheckbox  " +
        (showPathDescriptions == true ? "checked" : "") +
        " > A is B's ... </label>  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" +
        "<button onclick='popupConnectionDIV(" +
        (directionFromTo == "From" ? "true," + pathNum : "false," + pathNum) +
        ', "' +
        overrideLastPersonID +
        '",' +
        doOverRideConnectionType +
        ")' class='button' name='doReverse' id='doReverseButton' type='submit' value='Reverse Order' style='border: solid thin orange;    border-radius: 30px;    fill: yellow;    stroke: red;'>" +
        "<img src='./views/cc7/images/reverse.svg' alt='Reverse Icon' width='24' height='24'> </button>" +
        "";

    let popUpPathDescription =
        "<DIV id=popupPathDescriptionDiv style='border: none; background-color: white; display: " +
        (showPathDescriptions == true ? "inherit" : "none") +
        ";'>" +
        pathDescriptionsHTML[pathNum][directionFromTo + (doAlternateColouring == true ? "Colour" : "")] +
        copyPathDescriptionIcon +
        `</DIV>`;

    thisPopup.innerHTML = popupHTML + popUpPathDescription + endPopupHTML;
}

function copyConnectionDescription() {
    condLog("copyConnectionDescription:", 3.1415926);
    let theDesc = document.getElementById("popupPathDescriptionDiv").innerText.trim();
    navigator.clipboard.writeText(theDesc).then(
        function () {
            condLog("Connection description copied to clipboard successfully!", theDesc);
        },
        function (err) {
            console.error("Could not copy text: ", err);
        }
    );
}

function reverseThisBreakDownCode(breakDownList) {
    let newBreakDownList = [];
    let thisPeepCode = "A0";
    for (let aa = breakDownList.length - 1; aa >= 0; aa--) {
        newBreakDownList.push([thisPeepCode, breakDownList[aa][1]]);
        thisPeepCode = breakDownList[aa][0];
        if (thisPeepCode == "RM" || thisPeepCode == "RF" || thisPeepCode == "BM" || thisPeepCode == "BF") {
            thisPeepCode = "K01";
        } else if (thisPeepCode[0] == "K") {
            thisPeepCode = "RM"; // + (parseInt(thisPeepCode.substring(1)) + 1).toString().padStart(2, "0");
        }
    }
    return newBreakDownList;
}

function switchPathDisplayed(a) {
    currentPathNum = a;

    let allDiagrams = document.querySelectorAll("[id^=connectionsDiagram]");
    allDiagrams.forEach((diagram, index) => {
        diagram.style.display = index === a ? "block" : "none";
    });

    let allSwitchButtons = document.querySelectorAll("[id^=switchPathButton]");
    allSwitchButtons.forEach((pathBtn, index) => {
        pathBtn.style.backgroundColor = index === a ? "orange" : "lightgray";
    });

    let doReverseBtn = document.getElementById("doReverseButton");
    if (doReverseBtn.onclick.toString().indexOf("true") > -1) {
        doReverseBtn.onclick = function onclick(event) {
            popupConnectionDIV(true, a);
        };
    } else {
        doReverseBtn.onclick = function onclick(event) {
            popupConnectionDIV(false, a);
        };
    }
    let popupPathDescriptionDiv = document.getElementById("popupPathDescriptionDiv");
    popupPathDescriptionDiv.innerHTML =
        pathDescriptionsHTML[currentPathNum][directionFromTo + (doAlternateColouring == true ? "Colour" : "")] +
        copyPathDescriptionIcon;
}

function hideShowPathDescriptions() {
    condLog("hideShowPathDescriptions - YO!");
    let theCheckbox = document.getElementById("hideShowPathDescriptionsCheckbox");
    let popupPathDescriptionDiv = document.getElementById("popupPathDescriptionDiv");
    showPathDescriptions = theCheckbox.checked;

    FanChartView.currentSettings["popup_options_showPathDescriptions"] = showPathDescriptions;
    if (theCheckbox.checked) {
        popupPathDescriptionDiv.style.display = "inherit";
    } else {
        popupPathDescriptionDiv.style.display = "none";
    }

    let theCheckboxInsideFanChartSettingsPathDescriptions = document.getElementById(
        "popup_options_showPathDescriptions"
    );
    if (theCheckboxInsideFanChartSettingsPathDescriptions) {
        theCheckboxInsideFanChartSettingsPathDescriptions.checked = theCheckbox.checked;
    }
}

function hideShowOrangeArrows() {
    condLog("hideShowOrangeArrows - YO!");
    let theCheckbox = document.getElementById("hideShowOrangeArrowsCheckbox");
    let theCheckboxInsideFanChartSettings = document.getElementById("popup_options_showOrangeArrows");
    let theArrows = document.getElementsByClassName("OrangeArrow");
    showOrangeArrows = theCheckbox.checked;
    FanChartView.currentSettings["popup_options_showOrangeArrows"] = showOrangeArrows;
    if (theCheckbox.checked) {
        for (let aa = 0; aa < theArrows.length; aa++) {
            theArrows[aa].style.display = "block";
        }
    } else {
        for (let aa = 0; aa < theArrows.length; aa++) {
            theArrows[aa].style.display = "none";
        }
    }

    let theTallConnectors = document.getElementsByClassName("OrangeArrowNot");

    if (!theCheckbox.checked) {
        for (let aa = 0; aa < theTallConnectors.length; aa++) {
            theTallConnectors[aa].style.display = "block";
        }
    } else {
        for (let aa = 0; aa < theTallConnectors.length; aa++) {
            theTallConnectors[aa].style.display = "none";
        }
    }
    if (theCheckboxInsideFanChartSettings) {
        theCheckboxInsideFanChartSettings.checked = theCheckbox.checked;
    }
}

function hideShowConfidence() {
    condLog("hideShowConfidence");
    let theCheckbox = document.getElementById("hideShowConfidenceCheckbox");
    let theCheckboxInsideFanChartSettings = document.getElementById("popup_options_showConfidenceImages");
    let theConfidenceImages = document.getElementsByClassName("ConfidenceImage");
    showConfidenceImages = theCheckbox.checked;
    FanChartView.currentSettings["popup_options_showConfidenceImages"] = showConfidenceImages;
    if (theCheckbox.checked) {
        for (let aa = 0; aa < theConfidenceImages.length; aa++) {
            theConfidenceImages[aa].style.display = "revert";
        }
    } else {
        for (let aa = 0; aa < theConfidenceImages.length; aa++) {
            theConfidenceImages[aa].style.display = "none";
        }
    }
    if (theCheckboxInsideFanChartSettings) {
        theCheckboxInsideFanChartSettings.checked = theCheckbox.checked;
    }
}
function doShowBothParents() {
    condLog("doShowBothParents");
    let theCheckbox = document.getElementById("doShowBothParentsCheckbox");
    let theCheckboxInsideFanChartSettings = document.getElementById("popup_options_showBothParents");
    let theBothParentsElements = document.getElementsByClassName("BothParentsElement");
    showBothParents = theCheckbox.checked;
    FanChartView.currentSettings["popup_options_showBothParents"] = showBothParents;
    if (theCheckbox.checked) {
        for (let aa = 0; aa < theBothParentsElements.length; aa++) {
            theBothParentsElements[aa].style.display = "revert";
        }
    } else {
        for (let aa = 0; aa < theBothParentsElements.length; aa++) {
            theBothParentsElements[aa].style.display = "none";
        }
    }
    if (theCheckboxInsideFanChartSettings) {
        theCheckboxInsideFanChartSettings.checked = theCheckbox.checked;
    }
}

function hideShowAlternateFamilyColours() {
    condLog("hideShowAlternateFamilyColours");
    let theCheckbox = document.getElementById("hideShowAlternateFamilyColoursCheckbox");
    let theCheckboxInsideFanChartSettings = document.getElementById("popup_options_doAlternateColouring");
    let theBubbles = document.getElementsByClassName("FamilyBubble");
    doAlternateColouring = theCheckbox.checked;
    FanChartView.currentSettings["popup_options_doAlternateColouring"] = doAlternateColouring;
    if (theCheckbox.checked) {
        for (let aa = 0; aa < theBubbles.length; aa++) {
            let bubba = theBubbles[aa];
            bubba.style.fill = bubba.getAttribute("bubblecolour");
        }
    } else {
        for (let aa = 0; aa < theBubbles.length; aa++) {
            let bubba = theBubbles[aa];
            bubba.style.fill = "white";
        }
    }
    if (theCheckboxInsideFanChartSettings) {
        theCheckboxInsideFanChartSettings.checked = theCheckbox.checked;
    }

    let popupPathDescriptionDiv = document.getElementById("popupPathDescriptionDiv");
    popupPathDescriptionDiv.innerHTML =
        pathDescriptionsHTML[currentPathNum][directionFromTo + (doAlternateColouring == true ? "Colour" : "")] +
        copyPathDescriptionIcon;
}

function doEmbedProfileLinks() {
    condLog("doEmbedProfileLinks");
    let theCheckbox = document.getElementById("doEmbedProfileLinksCheckbox");
    let theCheckboxInsideFanChartSettings = document.getElementById("popup_options_embedProfileLinks");
    let theBubbleNames = document.getElementsByClassName("FamilyBubbleNameText");
    embedProfileLinks = theCheckbox.checked;
    FanChartView.currentSettings["popup_options_embedProfileLinks"] = embedProfileLinks;
    if (theCheckbox.checked) {
        // use attribute wtname to create a link to the profile page of the person in the bubble and set the textfield's innerHTML to that link
        for (let aa = 0; aa < theBubbleNames.length; aa++) {
            let bubba = theBubbleNames[aa];
            bubba.innerHTML = `<a target="_blank" href="https://www.wikitree.com/wiki/${bubba.getAttribute("wtname")}">${bubba.textContent || bubba.innerText}</a>`;
        }
    } else {
        // remove the link from the textfield's innerHTML and set it back to just the name of the person using textContent or innerText
        for (let aa = 0; aa < theBubbleNames.length; aa++) {
            let bubba = theBubbleNames[aa];
            bubba.innerHTML = bubba.textContent || bubba.innerText;
        }
    }
    if (theCheckboxInsideFanChartSettings) {
        theCheckboxInsideFanChartSettings.checked = theCheckbox.checked;
    }
}

// function doReverseFamilyBubbles() {
//     condLog("doReverseFamilyBubbles");

//     // reverse the order of the family bubbles in the popup by reversing the order of the codes in the connectObject.person.CodesList array and then calling the function that generates the family bubbles again
//     connectObject.person.CodesList.reverse();
//     generateFamilyBubbles(connectObject);
// }

function lifespan(person) {
    // condLog(person);
    var birth = "",
        death = "",
        longBirthDate = "",
        longDeathDate = "";

    if (person.getBirthDate && person.getBirthDate()) {
        longBirthDate = person.getBirthDate();
    } else if (person._data && person._data.BirthDate) {
        longBirthDate = person._data.BirthDate;
    }

    if (person.getDeathDate && person.getDeathDate()) {
        longDeathDate = person.getDeathDate();
    } else if (person._data && person._data.DeathDate) {
        longDeathDate = person._data.DeathDate;
    }

    if (longBirthDate) {
        birth = longBirthDate.substring(0, 4);
    }
    if (longDeathDate) {
        death = longDeathDate.substring(0, 4);
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

    if (person.IsLiving || (person._data && person._data.IsLiving)) {
        if (person.BirthDateDecade) {
            date = person.BirthDateDecade;
        } else if (person._data.BirthDateDecade) {
            date = person._data.BirthDateDecade;
        }
        place = " ";
    }
    return `b. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
        place ? (place == " " ? `` : `in ${place}`) : "[location unknown]"
    }.`;
}

/**
 * Generate text that display when and where the person died
 */
function deathString(person) {
    if (person.IsLiving || (person._data && person._data.IsLiving)) {
        return "";
    }

    var string = "",
        date = humanDate(person.getDeathDate()),
        place = person.getDeathLocation();

    return `d. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
        place ? `in ${place}` : "[location unknown]"
    }.`;
}

/**
 * Interpret the relationship type, level, and gender to generate a human-readable relationship string.
 * including the prefix, base, and suffix for the relationship.
 * e.g., "grandfather", "great granduncle", "2nd cousin once removed", etc.
 */
function interpretRelationship(type, level, gender) {
    base = type;
    prefix = "";
    suffix = "";

    if (type == "parent") {
        if (level < 0) {
            base = "??";
        } else if (level == 0) {
            base = "self";
        } else if (gender == "Male") {
            base = "father";
        } else if (gender == "Female") {
            base = "mother";
            // } else {
            // 	base = type;
        }
    } else if (type == "child") {
        if (level < 0) {
            base = "???";
        } else if (level == 0) {
            base = "self";
        } else if (gender == "Male") {
            base = "son";
        } else if (gender == "Female") {
            base = "daughter";
            // } else {
            // 	base = type;
        }
    } else if (type == "biochild") {
        if (gender == "Male") {
            base = "son";
        } else if (gender == "Female") {
            base = "daughter";
            // } else {
            // 	base = type;
        }
        // prefix = "adopted ";
        type = "child";
    } else if (type == "bioparent") {
        if (gender == "Male") {
            base = "father";
        } else if (gender == "Female") {
            base = "mother";
            // } else {
            // 	base = type;
        }
        // prefix = "adopted ";
        type = "parent";
    } else if (type == "sibling") {
        if (gender == "Male") {
            base = "brother";
        } else if (gender == "Female") {
            base = "sister";
        } else {
            base = type;
        }
    } else if (type == "pibling") {
        if (gender == "Male") {
            base = "uncle";
        } else if (gender == "Female") {
            base = "aunt";
        } else {
            base = type;
        }
    } else if (type == "nibling") {
        if (gender == "Male") {
            base = "nephew";
        } else if (gender == "Female") {
            base = "niece";
        } else {
            base = type;
        }
    } else if (type == "spouse") {
        if (gender == "Male") {
            base = "husband";
        } else if (gender == "Female") {
            base = "wife";
            // } else {
            // 	base = type;
        }
    } else if (type == "cousin" || type == "Pcousin" || type == "Ncousin") {
        base = "cousin";
        gen1 = floor(level);
        gen2 = round((level - gen1) * 100);
        prefix = gen1;
        suffix = gen2;
        if (gen1 == gen2 + 1) {
            prefix = "" + gen1;
            if (gen1 == 1) {
                prefix += "st ";
            } else if (gen1 == 2) {
                prefix += "nd ";
            } else if (gen1 == 3) {
                prefix += "rd ";
            } else {
                prefix += "th ";
            }
            suffix = "";
        } else if (gen1 <= gen2) {
            prefix = "" + gen1;
            if (gen1 == 1) {
                prefix += "st ";
            } else if (gen1 == 2) {
                prefix += "nd ";
            } else if (gen1 == 3) {
                prefix += "rd ";
            } else {
                prefix += "th ";
            }

            if (gen1 == gen2) {
                suffix = " once removed";
            } else {
                suffix = " " + (gen2 + 1 - gen1) + "x removed";
            }
        } else if (gen1 > gen2 + 1) {
            prefix = "" + gen2 + 1;
            if (gen2 + 1 == 1) {
                prefix += "st ";
            } else if (gen2 + 1 == 2) {
                prefix += "nd ";
            } else if (gen2 + 1 == 3) {
                prefix += "rd ";
            } else {
                prefix += "th ";
            }

            if (gen1 == gen2 + 2) {
                suffix = " once removed";
            } else {
                suffix = " " + (gen1 - 1 - gen2) + "x removed";
            }
        }
    }

    if (type == "parent" || type == "child" || type == "pibling" || type == "nibling") {
        if (type == "nibling") {
            level++;
        }
        if (level == 2) {
            prefix = "grand";
        } else if (level == 3) {
            prefix = "great grand";
        } else if (level > 3) {
            prefix = level - 2 + "x great grand";
        }
    }

    return prefix + base + suffix;
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
 * Copy the text of a widget to the clipboard
 */
function copyDataText(widget) {
    navigator.clipboard.writeText(widget.getAttribute("data-copy-text"));
    // condLog("copyDataText:", widget, widget.getAttribute("data-copy-text"));
}

/**
 * simplifyFamilyRelationshipChains
 *
 * Simplify a family relationship chain string by removing redundant parts.
 */

function simplifyFamilyRelationshipChains(chain) {
    if (!chain) return "";

    // Remove redundant "'s " at the end of the chain
    chain = chain.replace(/'s $/, "");

    // Remove consecutive "'s " occurrences
    chain = chain.replace(/'s 's /g, "'s ");

    // get all (strings) of relationships
    var relationships = chain.match(/\(.*?\)/g);
    let halfPrefix = "½ ";

    // Go through them one by one, and convert them to simpler forms if possible
    for (let index = 0; relationships && index < relationships.length; index++) {
        const element = relationships[index];
        condLog(element);

        // CASE 1: No simplification possible, keep as is
        if (element.indexOf(" ") == -1) {
            let revisedElement = element.replace("(", "").replace(")", "");
            chain = chain.replace(element, revisedElement);
        } else {
            // SOME simplification possible, handle accordingly
            // FIRST .. remove brackets
            let revisedElement = element.replace("(", "").replace(")", "");

            // SECOND .. make the relation's pieces more generic
            revisedElement = revisedElement.replace(/bio-mother's/g, "parent's");
            revisedElement = revisedElement.replace(/bio-father's/g, "parent's");
            revisedElement = revisedElement.replace(/mother's/g, "parent's");
            revisedElement = revisedElement.replace(/father's/g, "parent's");
            revisedElement = revisedElement.replace(/brother's/g, "sibling's");
            revisedElement = revisedElement.replace(/sister's/g, "sibling's");
            revisedElement = revisedElement.replace(/son's/g, "child's");
            revisedElement = revisedElement.replace(/daughter's/g, "child's");
            revisedElement = revisedElement.replace(/husband's/g, "spouse's");
            revisedElement = revisedElement.replace(/wife's/g, "spouse's");
            let numParents = (revisedElement.match(/parent's/g) || []).length;
            let numSiblings = (revisedElement.match(/sibling's/g) || []).length;
            let numChildren = (revisedElement.match(/child's/g) || []).length;
            let numSpouses = (revisedElement.match(/spouse's/g) || []).length;
            let numSpaces = (revisedElement.match(/ /g) || []).length;
            condLog({ numParents });
            condLog({ numChildren });
            condLog({ numSiblings });
            condLog({ numSpouses });
            condLog({ numSpaces });

            condLog({ revisedElement });
            condLog("sibling:", revisedElement.indexOf("sibling"));
            // THIRD ... based on the counts of generic relationships, further simplify if possible

            if (revisedElement.indexOf(halfPrefix) !== -1 && numSpaces == 1) {
                chain = chain.replace(element, revisedElement);
            } else if (numParents > 0 && numSiblings + numChildren + numSpouses == 0) {
                // a DIRECT ANCESTOR (or Aunt/Uncle)
                revisedElement = revisedElement.replace(/parent's/g, "").trim();
                if (revisedElement == "mother" || revisedElement == "father") {
                    if (numParents == 1) {
                        revisedElement = "grand" + revisedElement;
                    } else if (numParents == 2) {
                        revisedElement = "great grand" + revisedElement;
                    } else {
                        revisedElement = numParents - 1 + "x great grand" + revisedElement;
                    }
                    chain = chain.replace(element, revisedElement);
                } else if (
                    revisedElement == "brother" ||
                    revisedElement == "sister" ||
                    revisedElement == halfPrefix + "brother" ||
                    revisedElement == halfPrefix + "sister"
                ) {
                    thisHalfPrefix = "";
                    if (revisedElement.includes(halfPrefix)) {
                        thisHalfPrefix = halfPrefix;
                    }
                    if (revisedElement.includes("brother")) {
                        revisedElement = "uncle";
                    } else if (revisedElement.includes("sister")) {
                        revisedElement = "aunt";
                    }

                    if (numParents == 1) {
                        // If the uncle/aunt, no additional prefix is needed.
                    } else if (numParents == 2) {
                        revisedElement = "grand" + revisedElement;
                    } else if (numParents == 3) {
                        revisedElement = "great grand" + revisedElement;
                    } else {
                        revisedElement = numParents - 2 + "x great grand" + revisedElement;
                    }
                    revisedElement = thisHalfPrefix + revisedElement;
                    chain = chain.replace(element, revisedElement);
                }
            } else if (numChildren > 0 && numParents + numSiblings + numSpouses == 0) {
                // a DIRECT DESCENDANT
                revisedElement = revisedElement.replace(/child's/g, "").trim();
                if (revisedElement == "son" || revisedElement == "daughter") {
                    if (numChildren == 1) {
                        revisedElement = "grand" + revisedElement;
                    } else if (numChildren == 2) {
                        revisedElement = "great grand" + revisedElement;
                    } else {
                        revisedElement = numChildren - 1 + "x great grand" + revisedElement;
                    }
                    chain = chain.replace(element, revisedElement);
                }
            } else if (
                (numChildren > 0 &&
                    numSiblings == 1 &&
                    numParents + numSpouses == 0 &&
                    revisedElement.indexOf("sibling") == 0) ||
                revisedElement.indexOf(halfPrefix + "sibling") == 0
            ) {
                thisHalfPrefix = "";
                if (revisedElement.includes(halfPrefix + "sibling")) {
                    thisHalfPrefix = halfPrefix;
                }

                // a NIECE OR NEPHEW
                revisedElement = revisedElement
                    .replace(/child's/g, "")
                    .replace(/sibling's/, "")
                    .replace(halfPrefix, "")
                    .trim();
                if (revisedElement == "son" || revisedElement == "daughter") {
                    if (revisedElement == "son") {
                        revisedElement = "nephew";
                    } else if (revisedElement == "daughter") {
                        revisedElement = "niece";
                    }
                    if (numChildren == 1) {
                        revisedElement = "grand" + revisedElement;
                    } else if (numChildren == 2) {
                        revisedElement = "great grand" + revisedElement;
                    } else {
                        revisedElement = numChildren - 1 + "x great grand" + revisedElement;
                    }
                    revisedElement = thisHalfPrefix + revisedElement;
                    chain = chain.replace(element, revisedElement);
                }
            } else if (revisedElement == "parent's brother") {
                revisedElement = "uncle";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "parent's sister") {
                revisedElement = "aunt";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "parent's ½ brother") {
                revisedElement = "½ uncle";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "parent's ½ sister") {
                revisedElement = "½ aunt";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "sibling's son") {
                revisedElement = "nephew";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "sibling's daughter") {
                revisedElement = "niece";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "½ sibling's son") {
                revisedElement = "nephew";
                chain = chain.replace(element, revisedElement);
            } else if (revisedElement == "½ sibling's daughter") {
                revisedElement = "½ niece";
                chain = chain.replace(element, revisedElement);
            } else {
                // handle other cases if necessary - mostly Cousins
                // simplify chain into clusters
                let clusterPattern = element.replace(/parent/g, "P");
                clusterPattern = clusterPattern.replace(/father/g, "P");
                clusterPattern = clusterPattern.replace(/mother/g, "P");
                clusterPattern = clusterPattern.replace(/sibling/g, "S");
                clusterPattern = clusterPattern.replace(/brother/g, "S");
                clusterPattern = clusterPattern.replace(/sister/g, "S");
                clusterPattern = clusterPattern.replace(/child/g, "C");
                clusterPattern = clusterPattern.replace(/daughter/g, "C");
                clusterPattern = clusterPattern.replace(/son/g, "C");
                clusterPattern = clusterPattern.replace(/ /g, "");
                clusterPattern = clusterPattern.replace(/\(/g, "");
                clusterPattern = clusterPattern.replace(/\)/g, "");
                clusterPattern = clusterPattern.replace(/'s/g, "");
                condLog("Cluster Pattern: ", clusterPattern);

                let prevLength = clusterPattern.length;
                let corePattern = clusterPattern.replace(/PP/g, "P").replace(/SS/g, "S").replace(/CC/g, "C");
                let currLength = corePattern.length;
                while (currLength < prevLength) {
                    prevLength = currLength;
                    corePattern = corePattern.replace(/PP/g, "P").replace(/SS/g, "S").replace(/CC/g, "C");
                    currLength = corePattern.length;
                }
                condLog("Core Pattern: ", corePattern);
                if (corePattern == "bio-PSC") {
                    corePattern = "PSC";
                } else if (corePattern == "bio-PC") {
                    corePattern = "PC";
                }
                let numParents = (clusterPattern.match(/P/g) || []).length;
                let numSiblings = (clusterPattern.match(/S/g) || []).length;
                let numChildren = (clusterPattern.match(/C/g) || []).length;

                if (corePattern === "PSC" || corePattern === "P½SC") {
                    condLog("Core Pattern #s: ", numParents, numSiblings, numChildren);
                    // parent(s) + sibling + child(ren) --> some form of cousin (or half cousin if the sibling is a 1/2 sibling)

                    thisHalfPrefix = "";
                    if (corePattern.includes("½")) {
                        thisHalfPrefix = halfPrefix;
                    }

                    if (numSiblings == 1) {
                        revisedElement = " cousin";
                        condLog("Identified as cousin based on core pattern.");
                        let cousinType = Math.min(numParents, numChildren);
                        condLog("Cousin Type: ", cousinType);
                        let numRemoved = Math.max(numParents, numChildren) - cousinType;
                        revisedElement =
                            (cousinType == 1
                                ? "1st"
                                : cousinType == 2
                                  ? "2nd"
                                  : cousinType == 3
                                    ? "3rd"
                                    : cousinType + "th") + " cousin";
                        if (numRemoved > 0) {
                            revisedElement += " " + (numRemoved == 1 ? "once" : numRemoved + "x") + " removed";
                        }
                        revisedElement = thisHalfPrefix + revisedElement;
                        chain = chain.replace(element, revisedElement);
                    }
                } else if (corePattern === "PC" && numParents > 1 && numChildren > 1) {
                    // parent child relationship, like you get from getConnections when restricting to descending from common ancestor
                    thisHalfPrefix = "";
                    if (isHalfRelationship == true) {
                        thisHalfPrefix = "½ ";
                    }
                    condLog("Core Pattern #s: ", numParents, numSiblings, numChildren);
                    let cousinType = Math.min(numParents, numChildren);
                    condLog("Cousin Type: ", cousinType);
                    let numRemoved = Math.max(numParents, numChildren) - cousinType;
                    revisedElement =
                        (cousinType == 2
                            ? "1st"
                            : cousinType == 3
                              ? "2nd"
                              : cousinType == 4
                                ? "3rd"
                                : cousinType - 1 + "th") + " cousin";
                    if (numRemoved > 0) {
                        revisedElement += " " + (numRemoved == 1 ? "once" : numRemoved + "x") + " removed";
                    }
                    revisedElement = thisHalfPrefix + revisedElement;
                    chain = chain.replace(element, revisedElement);
                } else if (corePattern === "S") {
                    // revisedElement = "sibling";
                } else if (corePattern === "C") {
                    // revisedElement = "child";
                }
            }
        }
    }

    // chain = chain.replace(/mother's brother/g, "uncle");
    // chain = chain.replace(/father's brother/g, "uncle");
    // chain = chain.replace(/mother's sister/g, "aunt");
    // chain = chain.replace(/father's sister/g, "aunt");

    return chain;
}

function callPopupConnectionFromOverride(type) {
    // Implementation for calling the popup connection using the overrideLastPersonID
    let overrideLastPersonID = document.getElementById("pathID2").value;
    if (overrideLastPersonID > "" && overrideLastPersonID.indexOf("-") > -1) {
        popupConnectionDIV(false, 0, overrideLastPersonID, type);
    }
}
