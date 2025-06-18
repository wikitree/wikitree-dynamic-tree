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

// Returns an array [x , y] that corresponds to the endpoint of rθ from (centreX,centreY)
personPopup.popupHTML = function (person, connectionObj = {}, appIcon = "", appView = "") {
    console.log("Popup for ", person, connectionObj);
    connectObject = connectionObj;

    let personData = person._data;
    if (!personData) {
        personData = person;
        condLog(thePeopleList);
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
    condLog (personData.SpousesOrdered);
    for (let ord = 0; ord < personData.SpousesOrdered.length; ord++) {
        const spouseOrdered = personData.SpousesOrdered[ord];
        let spID = spouseOrdered.substr(spouseOrdered.indexOf("|") + 1);
        let prepMarriageInfo = "";
        condLog("spID = ", spID);
        // condLog(window.people.get(1.0 * spID));

        let theSpouseData = null; 
        if ( spID > 0 &&  thePeopleList &&  thePeopleList[spID] &&  thePeopleList[spID]._data ) {
            theSpouseData = thePeopleList[spID]._data;
        } else if ( spID > 0 && theSpouseData == null && window.people ) {
            theSpouseData = window.people.get(1.0 * spID);
        }

        condLog({theSpouseData});

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
            "<BR/><BR/>" +
            `<span ><a href="#name=${person.getName()}&view=${appView}">${appIcon}</a></span>`;
    }
    let connectionIcon = `<br/><br/><A onclick=popupConnectionDIV() title="View how this person is connected to the Primary Person in this Tree"><img style="height:24px; cursor:pointer;" src="https://www.wikitree.com/images/icons/icon-connect.svg"></A>`;
    if (connectObject && connectObject.extra && connectObject.extra.hideConnectionIcon == true){
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

            </div>
        `;



    thisPopup.innerHTML = popupHTML;

    return "Pop!"; 
    // };
};

function breakDownCC7Code(longCode) {
    let CCcodes = [[ "A0", "A0"]]; // build up an array of arrays - for each person in the chain, made up of:
    let currIndiCode = "A0"; // individual code for next link in the chain (RM / RF / Sn / Pn / Kn)
    let currBuiltCode = "A0"; // unique full code identifier for this person in the chain (from A0 up to currIndiCode)
    // FIRST person will have currBuiltCode of A0 / LAST person (the one whose popup we're currently viewing) will have currBuiltCode == longCode
    // Others will have something in between those extremes

    let currPos = 0; // position in the longCode string

    if (longCode == "A0" || longCode.length < 2 || longCode.substr(0,2) != "A0") {
        return CCcodes;
    }

    // OK - so - it appears that we are dealing with a LEGIT longCode, we can move onto position 2 of the string (0 positioning remember, so 3rd character)
    currPos = 2;
    while (currPos < longCode.length) {
        if (longCode[currPos] == "R" || longCode[currPos] == "P") {
            // paRENTS and PARTNERS
            currIndiCode = longCode.substr(currPos,2);
            currBuiltCode += currIndiCode;
            currPos += 2;
        } else {
            // SIBlings and KIDS
            currIndiCode = longCode.substr(currPos, 3);
            currBuiltCode += currIndiCode;
            currPos += 3;
        }   
        CCcodes.push([currIndiCode, currBuiltCode]);
    }

    return CCcodes;
}

function popupConnectionDIV() {
    condLog("POP UP - Connection SVG pod !");

    let thisPopup = document.getElementById("connectionPodDIV");

    if (currentConnectionPopupID == currentPersonPopupID) {
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
                <span style="color:red; position:absolute; right:-0.2em; top:-0.2em; cursor:pointer;"><a onclick="SuperBigFamView.removePodDIV();">` + SVGbtnCLOSE +  `</a></span>  `;

    let connectionHTML = "";
    if (connectObject.type == "Ahn") {
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
                    connectObject.listOfAhnentafels[l].listByPerson[currentConnectionPopupID].length > 0){
                        // IF found, then find out the array of ahnen numbers (in case that person is a repeat ancestor)
                        let nextListAhnArray =
                            connectObject.listOfAhnentafels[l].listByPerson[currentConnectionPopupID];
                        console.log(
                            "FOUND a SET !",
                            { l },
                            nextListAhnArray
                        );
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

        console.log("Connect a thon:");
        console.log( {ahnNumArray});
        console.log(  {listArray});

        for (let aa = 0; aa < ahnNumArray.length; aa++) {
            var ahnNum = ahnNumArray[aa];
            let listNum = listArray[aa];

            let SVGhtml = "";
            let ySVG = 10;
            let bubbleWidth = 200;
            let bubbleHeight = 44;

            thisPopup.innerHTML =
                "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                "Josh Azariah Ashley" +
                "</text></svg>";
            condLog("Width of ", "Josh Azariah Ashley", document.getElementById("testTextLength").clientWidth);
            condLog({ ahnNum }, typeof connectObject.ahNum);

            let maxWidth4NoSquishing = document.getElementById("testTextLength").clientWidth;

            while (ahnNum >= 1) {
                if (connectObject.listOfAhnentafels && connectObject.listOfAhnentafels.length > 1) {
                    person = thePeopleList[connectObject.listOfAhnentafels[listNum].list[ahnNum]];
                } else {                
                     person = thePeopleList[connectObject.myAhnentafel.list[ahnNum]];
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
                    SVGhtml +=
                        `<line style="stroke:rgb(255,0,0);stroke-width:2" x1="` +
                        (10 + bubbleWidth / 2) +
                        `" y1="` +
                        (ySVG - 20) +
                        `" x2="` +
                        (10 + bubbleWidth / 2) +
                        `" y2="` +
                        ySVG +
                        `"></line>`;
                }
                SVGhtml += `<rect x="10" y="${ySVG}" rx="10" ry="10" width="${bubbleWidth}" height="${bubbleHeight}" style="fill:white;stroke:black;stroke-width:1;opacity:1"></rect>`;
                SVGhtml += `<image  height="40" href="https://www.wikitree.com/${photoUrl}" x=20 y=${ySVG + 2} />`;

                let thisDisplayName = person.getDisplayName();
                // console.log({thisDisplayName});
                if (thisDisplayName == undefined || thisDisplayName == "undefined") {
                    thisDisplayName = "Private";
                }
                thisPopup.innerHTML =
                    "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                    thisDisplayName +
                    "</text></svg>";
                condLog(
                    "Width of ",
                    thisDisplayName,
                    document.getElementById("testTextLength").clientWidth
                );

                let extraLengthStuff = "";
                if (document.getElementById("testTextLength").clientWidth > maxWidth4NoSquishing) {
                    extraLengthStuff = ` textLength="${bubbleWidth - 60}" lengthAdjust="spacingAndGlyphs"`;
                }
                SVGhtml +=
                    `<text id="textAhn${ahnNum}" text-anchor="middle" x="` +
                    (10 + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 18}"  ${extraLengthStuff}>` +
                    thisDisplayName +
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
                    (10 + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 38}">` +
                    lifespan(person) +
                    `</text>`;

                ySVG += bubbleHeight + 20;

                // let peepNames = person.getDisplayName().split(" ");
                // for (let i = 0; i < peepNames.length; i++) {
                //     // connectionHTML += peepNames[i] + "<br/>";
                // }
                // connectionHTML += "<br/>" + lifespan(person) + "<br/>";

                ahnNum = Math.floor(ahnNum / 2);
            }

            if (aa > 0) {
                popupHTML +=
                    "<svg id=connectionsDiagram width=" +
                    20 +
                    " height=" +
                    ySVG +
                    ">" +
                    `<line style="stroke:rgb(4, 53, 20);stroke-width:2" x1="` +
                    10 +
                    `" y1="` +
                    0 +
                    `" x2="` +
                    10 +
                    `" y2="` +
                    ySVG +
                    `"></line>` +
                    "</svg>";
            }
            SVGhtml =
                "<svg id=connectionsDiagram width=" + (20 + bubbleWidth) + " height=" + ySVG + ">" + SVGhtml + "</svg>";
            popupHTML += SVGhtml;
        }
        popupHTML += connectionHTML;
    } else if (connectObject.type == "CC") {
        let codesList = [];
        if (connectObject.appID == "SuperBigTree") {
            codesList = connectObject.person._data.CodesList;
        } else if (connectObject.appID == "cc7") {
            // condLog(connectObject.person);
            if (!connectObject.person._data) {
                // condLog("NO DATA OBJECT !!!!");
                popupHTML +=
                    "Cannot draw this Connection Path at this time.<BR><BR>Possible reasons:<BR> * Private profile in between start and end of path<BR> * Not logged into the Apps Server<BR> * Displaying Degree Only";
                thisPopup.innerHTML = popupHTML;

            } else if (!connectObject.person._data.CodesList) {
                // condLog("MISSING CODES LIST - ", connectObject.person);
                codesList = ["A0"]
            } else {
                codesList = connectObject.person._data.CodesList;
            }
        }
        
        
        let minX = 10;
        let minY = 10;
        let maxX = 10;
        let maxY = 10;

        let degreesCodesList = [];
        for (let aa = 0; aa < codesList.length; aa++) {
            var thisCode = codesList[aa];            
            degreesCodesList[aa] = {degree:breakDownCC7Code(thisCode).length - 1, i:aa};
        }

        let codesByDegreesList = degreesCodesList.sort((a, b) => a.degree - b.degree);

        condLog({ degreesCodesList });

        for (let aaa = 0; aaa < codesList.length; aaa++) {
            let aa = codesByDegreesList[aaa].i;
            var thisCode = codesList[aa];

            if (codesByDegreesList[aaa].degree > 7) {
                condLog("SKIPPING CODE # ", aa, thisCode, " TOO LONG @ ", codesByDegreesList[aaa].degree + " degrees");
                continue;

            } 
            condLog("CODE # ", aa, thisCode);
            var breakDownList = breakDownCC7Code(thisCode);
            
            
            let SVGhtml = "";
            let xSVG = 10;
            let ySVG = 10;
            

            let bubbleWidth = 200;
            let bubbleHeight = 44;

            thisPopup.innerHTML =
                "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                "Josh Azariah Ashley" +
                "</text></svg>";
            condLog("Width of ", "Josh Azariah Ashley", document.getElementById("testTextLength").clientWidth);
            condLog({ thisCode }, {breakDownList} ); //typeof connectObject.ahNum);

            let maxWidth4NoSquishing = document.getElementById("testTextLength").clientWidth;

            for (let cc = 0; cc < breakDownList.length; cc++) {
                let thisPeepType = breakDownList[cc][0][0];
                let thisPeepCode = breakDownList[cc][1];
                let personData = null;
                
                

                if (connectObject.appID == "SuperBigTree") {
                    person = thePeopleList[connectObject.leafCollection[thisPeepCode].Id];
                    personData = person._data;
                } else if (connectObject.appID == "cc7") {
                    personData = connectObject.peopleList[connectObject.leafCollection[thisPeepCode].Id];
                    person = {_data:personData};
                }

                // person = thePeopleList[connectObject.leafCollection[thisPeepCode].Id];
                condLog("B4 PhotoURL:",{person});
                var photoUrl = null;
                if (connectObject.appID == "SuperBigTree") {
                    photoUrl = person.getPhotoUrl(75);
                } else if (connectObject.appID == "cc7") {
                    if (personData.PhotoData && personData.PhotoData.url > ""){
                        photoUrl = personData.PhotoData.url;
                    }
                }

                // Use generic gender photos if there is not profile photo available
                if (!photoUrl || (personData.IsLiving == true && connectObject.appID == "SuperBigTree" && SuperBigFamView.displayPrivatize == 1)) {
                    if (personData.Gender === "Male") {
                        photoUrl = "images/icons/male.gif";
                    } else if (person && personData.Gender === "Female") {
                        photoUrl = "images/icons/female.gif";
                    } else {
                        photoUrl = "images/icons/no-gender.gif";
                    }
                }

                // connectionHTML += `<img height=40px src="https://www.wikitree.com/${photoUrl}"> <BR>`;

                if (thisPeepCode != "A0") {
                    if (thisPeepType == "K") {
                        ySVG += bubbleHeight + 20;
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
                        ySVG -= bubbleHeight + 20;
                    } else if (thisPeepType == "S") {
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

                        xSVG += bubbleWidth + 20;
                    } else if (thisPeepType == "P") {
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

                        xSVG += bubbleWidth + 20;
                    }
                }
                SVGhtml += `<rect x="${xSVG}" y="${ySVG}" rx="10" ry="10" width="${bubbleWidth}" height="${bubbleHeight}" style="fill:white;stroke:black;stroke-width:1;opacity:1"></rect>`;
                SVGhtml += `<image  height="40" href="https://www.wikitree.com/${photoUrl}" x=${xSVG + 10} y=${ySVG + 2} />`;

                if (!(personData.LongName)) {
                    if (person.getDisplayName) {
                        personData.LongName = person.getDisplayName();
                    } else {
                        personData.LongName = personData.RealName + " " + personData.LastNameAtBirth;
                    }
                }

                thisPopup.innerHTML =
                    "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                    personData.LongName +
                    "</text></svg>";
                condLog(
                    "Width of ",
                    personData.LongName,
                    document.getElementById("testTextLength").clientWidth
                );

                let extraLengthStuff = "";
                if (document.getElementById("testTextLength").clientWidth > maxWidth4NoSquishing) {
                    extraLengthStuff = ` textLength="${bubbleWidth - 60}" lengthAdjust="spacingAndGlyphs"`;
                }
                SVGhtml +=
                    `<text id="text${thisPeepCode}" text-anchor="middle" x="` +
                    (xSVG + 40 + 10 + (bubbleWidth - 60) / 2) +
                    `" y="${ySVG + 18}"  ${extraLengthStuff}>` +
                    personData.LongName +
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
                    `" y="${ySVG + 38}">` +
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

            if (aaa > 0) {
                popupHTML +=
                    "<svg id=connectionsDiagramDivider" + aa + "  width=" +
                    20 +
                    " height=" +
                    (maxY - minY + bubbleHeight + 20) +
                    ">" +
                    `<line style="stroke:rgb(4, 53, 20);stroke-width:2" x1="` +
                    10 +
                    `" y1="` +
                    0 +
                    `" x2="` +
                    10 +
                    `" y2="` +
                    (maxY - minY + bubbleHeight + 20) +
                    `"></line>` +
                    "</svg>";
            }
            // viewbox : minX , minY , width , height
            SVGhtml =
                "<svg id=connectionsDiagram" +
                aa +
                "  width=" +
                (20 + bubbleWidth + (maxX - minX)) +
                " height=" +
                (maxY - minY + bubbleHeight + 20) +
                ` viewbox="` +
                (minX - 10) +
                " " +
                (minY - 10) +
                " " +
                (20 + bubbleWidth + (maxX - minX)) +
                "  " +
                (maxY - minY + bubbleHeight + 20) +
                `" >` +
                SVGhtml +
                "</svg>";
            popupHTML += SVGhtml;
        }
        popupHTML += connectionHTML;
    } else if (connectObject.type == "CC7") {
        connectObject.person.CodesList = ["A0"];
        let codesList = connectObject.person.CodesList;
        let minX = 10;
        let minY = 10;
        let maxX = 10;
        let maxY = 10;

        for (let aa = 0; aa < codesList.length; aa++) {
            var thisCode = codesList[aa];

            condLog("CODE # ",aa,  thisCode);
            var breakDownList = breakDownCC7Code(thisCode);
            
            
            let SVGhtml = "";
            let xSVG = 10;
            let ySVG = 10;
            

            let bubbleWidth = 200;
            let bubbleHeight = 44;

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

                person = connectObject.person;//thePeopleList[ connectObject.leafCollection[thisPeepCode].Id ];
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
                    if (thisPeepType == "K") {
                        ySVG += bubbleHeight + 20;
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
                        ySVG -= bubbleHeight + 20;
                    } else if (thisPeepType == "S") {
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

                        xSVG += bubbleWidth + 20;
                    } else if (thisPeepType == "P") {
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

                        xSVG += bubbleWidth + 20;
                    }
                }
                SVGhtml += `<rect x="${xSVG}" y="${ySVG}" rx="10" ry="10" width="${bubbleWidth}" height="${bubbleHeight}" style="fill:white;stroke:black;stroke-width:1;opacity:1"></rect>`;
                SVGhtml += `<image  height="40" href="https://www.wikitree.com/${photoUrl}" x=${xSVG + 10} y=${ySVG + 2} />`;

                thisPopup.innerHTML =
                    "<svg id=tempSVG width=400 height=40><text id=testTextLength>" +
                    person.getDisplayName() +
                    "</text></svg>";
                condLog(
                    "Width of ",
                    person.getDisplayName(),
                    document.getElementById("testTextLength").clientWidth
                );

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
                (maxY - minY + bubbleHeight + 20) +
                ` viewbox="` +
                (minX - 10) +
                " " +
                (minY - 10) +
                " " +
                (20 + bubbleWidth + (maxX - minX)) +
                "  " +
                (maxY - minY + bubbleHeight + 20) +
                `" >` +
                SVGhtml +
                "</svg>";
            popupHTML += SVGhtml;
        }
        popupHTML += connectionHTML;
    }                
       

    thisPopup.innerHTML = popupHTML;
    
}

 function lifespan(person) {
    // console.log(person);
     var birth = "",
         death = "", longBirthDate = "", longDeathDate = "";
        
         
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
 };

