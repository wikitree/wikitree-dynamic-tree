import { Settings } from "./Settings.js";

export class CirclesView {
    static currentSortedMap;
    static dotRadius = 4;
    static displayType = "dot";
    static circleFilled = true;
    static circlesBandW = false;
    static degreeCount = [0, 0, 0, 0, 0, 0, 0, 0, 0]; // keeps track of the current CC7 view, and how many people are at each degree

    static PersonCodesObject = {}; // Object that keeps track of ALL the people in the CC7 that have been retrieved to date , starting with the opening CCn that was loaded, then ideally, added to if additional peeps are added.
        /*
            Associated Array
                key :  WikiTree ID # for person.
                fields :
                    Name
                    Id
                    LongName
                    FirstName
                    RealName
                    LastNameAtBirth
                    Gender
                    IsLiving
                    BirthDate
                    BirthLocation
                    DeathDate
                    DeathLocation
                    Spouse
                    Child
                    Sibling                    
                    Spouses
                    Mother
                    Father
                    PhotoData

                    CodesList : [ code ] // "A0RMP01"
                    CodesLongList : [ codeLong ] // "A0-19066309|RM-1253623|P01-3512633"


        */

    static theLeafCollection = {}; // Object that tracks each of the unique CODES generated (for connections) and maps them to the corresponding WikiTree ID #s (unique people)
    
    static buildView() {
        console.log("CIRCLES VIEW - buildView");

        var popupDIV =
            '<div id=popupDIV class="pop-up" style="display:none; position:absolute; left:20px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left"><A onclick="SuperBigFamView.removePopup();">' +
            SVGbtnCLOSE +
            "</A></span></div>";
        var connectionPodDIV =
            '<div id=connectionPodDIV class="pop-up" style="display:none; width:fit-content; position:absolute; left:700px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left"><A onclick="SuperBigFamView.removePodDIV();">' +
            SVGbtnCLOSE +
            "</A></span></div>";

        popupDIV += connectionPodDIV;

        const circlesDisplay = $(`
        <div id="circlesDisplay">
            <div id=circlesBtnBar style='background-color: #f8a51d80; align: center; width="100%"' >
            Display: 
                <label><input type=radio   name=circlesDisplayType id=displayType_dot value=dot > <font color=magenta>&#x2B24;</font></label> &nbsp;&nbsp;
                <label><input type=radio   name=circlesDisplayType id=displayType_ltr value=ltr> A</label> &nbsp;&nbsp;
                <label><input type=radio   name=circlesDisplayType id=displayType_inits value=inits checked> ABC</label> &nbsp;&nbsp;
                <label><input type=radio   name=circlesDisplayType id=displayType_fName value=fName > FName </label> &nbsp;&nbsp;
                <label><input type=radio   name=circlesDisplayType id=displayType_all value=all > all  </label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label id=fillCirclesLabel><input type=checkbox id="displayType_filled" checked> Fill circles</label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label id=fillCirclesLabel><input type=checkbox id="displayType_BandW" > Black & White</label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label id=fillCirclesLabel><input type=checkbox id="displayType_GrayAncs"  > Grayify Ancestors</label>
            </div>
                
            <div id=circlesDIV4SVG><svg id=CirclesBkgd><rect id=CirclesBkgdRect width=5000 height=5000 style='fill:aliceblue;stroke:aliceblue;stroke-width:1;opacity:1' /></svg></div>
            ${popupDIV}
        </div>`);
        circlesDisplay.insertBefore($("#peopleTable"));

        $("#popupDIV").draggable();
        $("#connectionPodDIV").draggable();

        this.updateView();

        // $("#displayType_ltr")
        //     .off("change")
        //     .on("change", function () {
        //         CirclesView.changeDisplayType();
        //     });

        $("#circlesBtnBar input").each(function () {
            const $inp = $(this);
            $inp.off("change").on("change", function () {
                CirclesView.changeDisplayType();
            });
        });
    }
    static connectAllToPrimaryPerson(currentRootID) {
        console.log({ currentRootID });
        let rootPeep = window.people.get(currentRootID);
        if (rootPeep) {
            CirclesView.updateFieldsInPersonCodesObject(currentRootID,"A0","A0-" + currentRootID);
            CirclesView.addConnectionsToThisPerson(currentRootID, "A0");
        }
    }

    static updateFieldsInPersonCodesObject ( currentID, code, codeLong ) {
        let Peep = window.people.get(currentID);
        if (Peep) {
            if (!CirclesView.PersonCodesObject[currentID]) {
                CirclesView.PersonCodesObject[currentID] = { CodesList: [code], CodesLongList: [codeLong] };
                CirclesView.theLeafCollection[code] = { Id: currentID };
            } else if (CirclesView.PersonCodesObject[currentID] && CirclesView.PersonCodesObject[currentID].CodesList.indexOf(code) > -1) {
                // do NOT duplicate the code .... just return
                return;
            } else if (CirclesView.PersonCodesObject[currentID]) {
                CirclesView.PersonCodesObject[currentID].CodesList.push(code);
                CirclesView.PersonCodesObject[currentID].CodesLongList.push(codeLong);            
                CirclesView.theLeafCollection[code] = { Id: currentID };
            } 
            let fieldsList = ["Name","Id","LongName","FirstName","RealName","LastNameAtBirth","Gender","BirthDate","BirthLocation","DeathDate","LongName", "DeathLocation","IsLiving","Spouse","Child","Sibling","Spouses","Mother","Father","PhotoData"];
            for (let f = 0; f < fieldsList.length; f++) {
                let fldName = fieldsList[f];
                if (Peep[fldName]) {
                     CirclesView.PersonCodesObject[currentID][fldName] = Peep[fldName];
                }
                
            }
        }

    }

    static notAlreadyInCodeLong(newbie,codeLong) {
        return  (codeLong.indexOf(newbie) == -1) ;
            
    }

    static addConnectionsToThisPerson(thisID, code, fromWhere = "root", p1 = 0, p2 = 0) {
        // thisID = WikiTree ID # for person who we are adding connections for
        // fromWhere = the type of connection that prompted this call to expand the network
        /*
             - root - Original request to make all connections from Primary Root person
             - sibling - request to make connections to a sibling  : p1 & p2 are father & mother of original sibling
                - ONLY add new Sibling connections if NOT same mother nor same father (i.e. half siblings of half siblings OK to add)
                - ONLY add new parent if NOT p1 or p2
             - father/mother - request to make connections to a parent : p1 is the other parent of the requestor
                - ONLY add new Partners if NOT the same as p1
                - do NOT add new Kid (since all full and half siblings will already have been connected to original requestor)
             - kids - request to make connections to a child (from a parent) : p1 is parent, p2 is other parent if a spouse of p1
                - ONLY add a Parent if not p1 or p2 (e.g. a biological parent not married or registered as a spouse of parent 1)
                - do NOT add a new Sibling (since all full siblings will be already from p1, and half siblings from p2 will be connected from their partner request)
            - partners - request to make connection to a spouse - p1 is requestor
                - ONLY add a new Partner if not the same as p1
                - ONLY add a new Kid if NOT co-parent with p1
        */
        // console.log({ thisID }, {code}, {fromWhere});
        // CirclesView.updateFieldsInPersonCodesObject(thisID);
        let thisPeep = window.people.get(thisID);
        let thisPeepEntry = CirclesView.PersonCodesObject[thisID];
        let thisPeepCode = code;

        if (thisPeep && thisPeepEntry){
            let thisPeepCodeLong = thisPeepEntry.CodesLongList[ thisPeepEntry.CodesList.indexOf(thisPeepCode)];
         
            // paRENTS
            if (thisPeep.Father > 0 && CirclesView.notAlreadyInCodeLong(thisPeep.Father, thisPeepCodeLong)) {
                if ( fromWhere == "Sibling" && ( thisPeep.Father == p1 )) {
                    // do not go any further
                } else if (fromWhere == "Kid" && (thisPeep.Father == p1 || thisPeep.Father == p2)) {
                    // do not go any further
                } else {
                    CirclesView.updateFieldsInPersonCodesObject(
                        thisPeep.Father,
                        thisPeepCode + "RM",
                        thisPeepCodeLong + "|" + "RM-" + thisPeep.Father
                    );
                    CirclesView.addConnectionsToThisPerson(
                        thisPeep.Father,
                        thisPeepCode + "RM",
                        "Father",
                        thisPeep.Mother
                    );
                }
            }
            if (thisPeep.Mother > 0 && CirclesView.notAlreadyInCodeLong(thisPeep.Mother, thisPeepCodeLong)) {
                if ( fromWhere == "Sibling" && (thisPeep.Mother == p2 )) {
                    // do not go any further
                } else if (fromWhere == "Kid" && (thisPeep.Mother == p1 || thisPeep.Mother == p2)) {
                    // do not go any further
                }  else {
                    CirclesView.updateFieldsInPersonCodesObject(
                        thisPeep.Mother,
                        thisPeepCode + "RF",
                        thisPeepCodeLong + "|" + "RF-" + thisPeep.Mother
                    );
                    CirclesView.addConnectionsToThisPerson(thisPeep.Mother, thisPeepCode + "RF", "Mother", thisPeep.Father);
                }
            }

            // SIBLINGS
            if (thisPeep.Sibling && thisPeep.Sibling.length > 0 && fromWhere != "Kid") {
                for (let i = 0; i < thisPeep.Sibling.length; i++) {
                    const nextPeep = thisPeep.Sibling[i];
                    if (fromWhere == "Sibling" && (nextPeep.Father == p1 || nextPeep.Mother == p2)) {
                        continue;
                    }
                    if (nextPeep.Id > 0 && CirclesView.notAlreadyInCodeLong(nextPeep.Id, thisPeepCodeLong)) {
                        CirclesView.updateFieldsInPersonCodesObject(
                            nextPeep.Id,
                            thisPeepCode + "S" + make2Digit(i + 1),
                            thisPeepCodeLong + "|" + "S" + make2Digit(i + 1) + "-" + nextPeep.Id
                        );
                        CirclesView.addConnectionsToThisPerson(
                            nextPeep.Id,
                            thisPeepCode + "S" + make2Digit(i + 1),
                            "Sibling",
                            thisPeep.Father,
                            thisPeep.Mother
                        );
                    }
                }
            }
            // PARTNERS
            if (thisPeep.Spouse && thisPeep.Spouse.length > 0) {
                for (let i = 0; i < thisPeep.Spouse.length; i++) {
                    const nextPeep = thisPeep.Spouse[i];
                    if (nextPeep.Id == p1 && (fromWhere == "Mother" || fromWhere == "Father" || fromWhere == "Partner")) {
                        continue;
                    }
                    if (nextPeep.Id > 0 && CirclesView.notAlreadyInCodeLong(nextPeep.Id, thisPeepCodeLong)) {
                        CirclesView.updateFieldsInPersonCodesObject(
                            nextPeep.Id,
                            thisPeepCode + "P" + /* make2Digit */ (i + 1),
                            thisPeepCodeLong + "|" + "P" + /* make2Digit */ (i + 1) + "-" + nextPeep.Id
                        );
                        CirclesView.addConnectionsToThisPerson(
                            nextPeep.Id,
                            thisPeepCode + "P" + /* make2Digit */ (i + 1),
                            "Partner",
                            thisPeep.Id
                        );
                    }
                }
            }

            // KIDS
            if (thisPeep.Child && thisPeep.Child.length > 0 && (fromWhere != "Mother" && fromWhere != "Father")) {
                for (let i = 0; i < thisPeep.Child.length; i++) {
                    const nextPeep = thisPeep.Child[i];
                    if (fromWhere == "Partner" && (nextPeep.Mother == thisPeep.Id && nextPeep.Father == p1 ) ) {
                        continue;
                    } else if (fromWhere == "Partner" && (nextPeep.Father == thisPeep.Id && nextPeep.Mother == p1 ) ) {
                        continue;
                    }
                    if (nextPeep.Id > 0 && CirclesView.notAlreadyInCodeLong(nextPeep.Id, thisPeepCodeLong)) {
                        CirclesView.updateFieldsInPersonCodesObject(
                            nextPeep.Id,
                            thisPeepCode + "K" + make2Digit(i + 1),
                            thisPeepCodeLong + "|" + "K" + make2Digit(i + 1) + "-" + nextPeep.Id
                        );
                        let otherParentId = 0;
                        let SpouseArray = thisPeep.Spouse;
                        if (SpouseArray && SpouseArray.length > 0) {
                            for (let sp = 0; sp < SpouseArray.length; sp++) {
                                if (SpouseArray[sp].Id == nextPeep.Father || SpouseArray[sp].Id == nextPeep.Mother) {
                                    otherParentId = SpouseArray[sp].Id ;
                                    // break;
                                }
                                
                            }
                        }
                        
                        CirclesView.addConnectionsToThisPerson(
                            nextPeep.Id,
                            thisPeepCode + "K" + make2Digit(i + 1),
                            "Kid",
                            thisPeep.Id,
                            otherParentId
                        );
                    }
                }
            }
        }
        // console.log(CirclesView.PersonCodesObject);

        function make2Digit(num) {
            if (num > 9) {
                return num;
            } else {
                return "0" + num;
            }
        }
    }

    static updateView() {
        console.log("CIRCLES VIEW - updateView");
        // sort the people by degree
        // TODO also sort by birthdate
        // console.log("window.rootId:", window.rootId);
        CirclesView.connectAllToPrimaryPerson(window.rootId);
        const mapArray = Array.from(window.people);
        mapArray.sort((a, b) => a[1]["Meta"]["Degrees"] - b[1]["Meta"]["Degrees"]);
        const sortedMap = new Map(mapArray);

        let SVGcode = "";
        CirclesView.degreeCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];

        CirclesView.currentSortedMap = sortedMap;

        for (let person of sortedMap.values()) {
            const degree = person.Meta.Degrees;
            CirclesView.degreeCount[degree]++;
        }

        CirclesView.changeDisplayType();

        console.log({ sortedMap });
        function getLtrInitsName(person) {
            let theLIN = ".";

            if (PeopleCollection[theKey]) {
                if (displayType == "ltr") {
                    if (person.FirstName) {
                        return person.FirstName.substring(0, 1);
                    } else if (person.LastNameAtBirth) {
                        return person.LastNameAtBirth.substring(0, 1);
                    }
                } else if (displayType == "inits") {
                    let Inits = "";
                    if (person.FirstName) {
                        Inits += person.FirstName.substring(0, 1);
                    }
                    if (person.LastNameAtBirth) {
                        Inits += person.LastNameAtBirth.substring(0, 1);
                    }
                    if (Inits == "") {
                        return "??";
                    } else {
                        return Inits;
                    }
                } else if (displayType == "fName") {
                    if (person.RealName) {
                        return person.RealName;
                    } else if (person.FirstName) {
                        return person.FirstName;
                    } else if (person.LastNameAtBirth) {
                        return person.LastNameAtBirth;
                    } else {
                        return "Private";
                    }
                } else {
                    return "Private";
                }
            }

            return theLIN;
        }
    }

    static doCircle(person, thisDegree, newX, newY) {
        console.log(CirclesView.displayType, person);
        const blobColours = [
            "green",
            "lawngreen",
            "orange",
            "cyan",
            "magenta",
            "aquamarine",
            "gold",
            "deepskyblue",
            "chocolate",
            "violet",
            "pink",
            "lime",
            "goldenrod",
        ];

        // const blobColoursD1 = ["gray", "lawngreen", "red", "blue"];

        const privacy = person.Privacy;
        const degree = person.Meta.Degrees;
        const first = person.RealName;
        const last = person.LastNameAtBirth;
        const birthDate = person.BirthDate;
        const birthPlace = person.BirthLocation;
        const children = person.Child.length;
        const spouses = person.Spouses.length;
        const wikiTreeId = person.Name;
        let rel = person.Relationship;
        if (typeof rel == "object" && rel.full) {
            rel = rel.full;
        }
        // console.log(first, last, degree, degreeCount[degree], rel);

        let xDotRadius = CirclesView.dotRadius;
        if (CirclesView.displayType == "fName") {
            xDotRadius *= 2;
        }

        let thisClr = blobColours[degree]; // predominant colour for circles, specificially, circle FILL colour (turns white if fill is off or in B&W mode)
        let outlineClr = "black"; // outline of dot - will be black normally, but when filled and B&W modes are both turned off, it becomes the colour previously known as the fill colour (blobColour)
        let textClr = "black"; // colour of the text inside the circle (letter, initials or names & dates) - usually black unless filled is on and fill colour is too dark

        if (degree == 0) {
            textClr = "white";
        } else if (
            person.Relationship &&
            person.Relationship.full &&
            (person.Relationship.full == "father"  ||
                person.Relationship.full == "mother"  ||
                person.Relationship.full == "parent" )
        ) {
            thisClr = "gray";
            textClr = "white";
        } else if (
            person.Relationship &&
            person.Relationship.full &&
            CirclesView.circlesGrayAncs == true && 
            (person.Relationship.full.indexOf("father") > -1 ||
                    person.Relationship.full.indexOf("mother") > -1 ||
                    person.Relationship.full.indexOf("parent") > -1
            )
        ) {
            thisClr = "gray";
            textClr = "white";
        } else if (
            degree == 1 &&
            person.Relationship &&
            person.Relationship.full &&
            (person.Relationship.full.indexOf("husband") > -1 ||
                person.Relationship.full.indexOf("wife") > -1 ||
                person.Relationship.full.indexOf("spouse") > -1)
        ) {
            thisClr = "red";
            textClr = "white";
        } else if (degree == 1 && person.Relationship == "") {
            thisClr = "red";
            textClr = "white";
        } else if (
            degree == 1 &&
            person.Relationship &&
            person.Relationship.full &&
            (person.Relationship.full.indexOf("brother") > -1 ||
                person.Relationship.full.indexOf("sister") > -1 ||
                person.Relationship.full.indexOf("sibling") > -1)
        ) {
            thisClr = "blue";
            textClr = "white";
        }

        // DO we need to SWAP Colours around ?
        let outlineThickness = 1; // unless we're talking hollow circles with coloured outsides, 1 pixel border is all we need
        if (CirclesView.circleFilled == false && CirclesView.circlesBandW == false) {
            outlineClr = thisClr; // the regularly calculated fill colour of the button now becomes the exterior of the hollow circles
            thisClr = "white"; // fill colour of circles becomes white / transparent
            textClr = "black"; // all text is now black - no contrasting colours requiring white text anymore
            outlineThickness = 3; /// like right now ... we need it thick so that the colour can be shown off to weary eyes
        } else if (CirclesView.circleFilled == false && CirclesView.circlesBandW == true) {
            outlineClr = "black"; // no colour anywhere - white filled circles with black outlines and black text - better for printing and those with vision challenges, especially colour discernment challenges
            thisClr = "white"; // fill colour of circles
            textClr = "black";
        } else if (CirclesView.circleFilled == true && CirclesView.circlesBandW == true) {
            outlineClr = "black"; // no colour anywhere - black filled circles with black outlines and white text - dark mode anyone ?
            thisClr = "black"; // fill colour of circles
            textClr = "white";
        }
        let thisSVGstarter =
            "<SVG id=circlePerson" +
            person.Id +
            "  width=" +
            (xDotRadius + 1) * 2 +
            " height=" +
            (CirclesView.dotRadius + 1) * 2 +
            " style='position: absolute; left: " +Math.round(newX) + "px; " +
            "top: " + Math.round(newY) + "px;' >";

        let thisSVGend = "</SVG>";

        let thisSVGcircle =
            "<ellipse cx=" +
            (xDotRadius + 1) +
            " cy=" +
            (CirclesView.dotRadius + 1) +
            " rx=" +
            xDotRadius +
            " ry=" +
            CirclesView.dotRadius +
            " stroke=" +
            outlineClr +
            " stroke-width=" +
            outlineThickness +
            " fill=" +
            thisClr +
            " />";

        let thisSVGtext = "";
        if (CirclesView.displayType == "ltr") {
            let theLtr = "?";
            if (person.RealName) {
                theLtr = person.RealName[0];
            } else if (person.FirstName) {
                theLtr = person.FirstName[0];
            } else {
                console.log("Cannot find a first name for  ", person);
            }
            thisSVGtext =
                "<text text-anchor=middle x=10 y=15 style='font-size:14; fill:" +
                textClr +
                ";' >" +
                theLtr +
                "</text>";
        } else if (CirclesView.displayType == "inits") {
            let theInits = theInitialsFrom(person);
            let textLengthParam = "";
            if (theInits.length > 3) {
                textLengthParam = " textLength=" + (2 * CirclesView.dotRadius - 2) + " lengthAdjust=spacingAndGlyphs ";
            }
            thisSVGtext =
                "<text text-anchor=middle x=19 y=22 style='font-size:14; fill:" +
                textClr +
                ";'" +
                textLengthParam +
                " >" +
                theInits +
                "</text>";
        } else if (CirclesView.displayType == "fName") {
            
             let theFName = "Private";
             if (person.RealName) {
                 theFName = person.RealName;
             } else if (person.FirstName) {
                 theFName = person.FirstName;
             } else {
                 console.log("Cannot find a first name for  ", person);
             }
            let textLengthParam = "";
            if (theFName.length > 8) {
                textLengthParam = " textLength=" + (2 * xDotRadius - 2) + " lengthAdjust=spacingAndGlyphs ";
            }
            thisSVGtext =
                "<text text-anchor=middle x=37 y=22 style='font-size:14; fill:" +
                textClr +
                ";'" +
                textLengthParam +
                " >" +
                theFName +
                "</text>";
        } else if (CirclesView.displayType == "all") {
            let theName = "Private";
            if (person.RealName) {
                 theName = person.RealName;
            } else  if (person.FirstName) {
                 theName = person.FirstName;
            } else {
                console.log("Cannot find a first name for  ",person);
            }
            
            let textLengthParam = "";
            if (theName.length > 7) {
                textLengthParam = " textLength=50 lengthAdjust=spacingAndGlyphs ";
            }
            thisSVGtext =
                "<text text-anchor=middle x=32 y=22 style='font-size:14; fill:" +
                textClr +
                ";'" +
                textLengthParam +
                " >" +
                theName +
                "</text>";
            theName = person.LastNameAtBirth;
            textLengthParam = "";
            if (theName.length > 8) {
                textLengthParam = " textLength=58 lengthAdjust=spacingAndGlyphs ";
            }
            thisSVGtext +=
                "<text text-anchor=middle x=32 y=35 style='font-size:14; fill:" +
                textClr +
                ";'" +
                textLengthParam +
                " >" +
                theName +
                "</text>";

            if (person.BirthDate && person.BirthDate.length >= 4) {
                let bYear = person.BirthDate.substring(0, 4);
                if (bYear != "0000") {
                    thisSVGtext +=
                        "<text text-anchor=middle x=32 y=48 style='font-size:12; fill:" +
                        textClr +
                        ";'" +
                        " >" +
                        "b. " +
                        bYear +
                        "</text>";
                }
            } else if (person.BirthDateDecade && person.BirthDateDecade.length >= 4) {
                let bYear = person.BirthDateDecade;
                if (bYear != "0000") {
                    thisSVGtext +=
                        "<text text-anchor=middle x=32 y=48 style='font-size:12; fill:" +
                        textClr +
                        ";'" +
                        " >" +
                        "b. " +
                        bYear +
                        "</text>";
                }
            }
            if (person.DeathDate && person.DeathDate.length >= 4) {
                let dYear = person.DeathDate.substring(0, 4);
                if (dYear != "0000") {
                    thisSVGtext +=
                        "<text text-anchor=middle x=32 y=58 style='font-size:12; fill:" +
                        textClr +
                        ";'" +
                        " >" +
                        "d. " +
                        dYear +
                        "</text>";
                }
            }
        }
        return (
            // "<font color=" +
            // blobColours[degree] +
            // ">" +
            // first +
            // last +
            // ":" +
            // degree +
            // "</font> " +
            thisSVGstarter + thisSVGcircle + thisSVGtext + thisSVGend + " "
        );

        function theInitialsFrom(person) {
            let aString = "";
            if (person && person.LongName && person.LongName > "") {
                aString = person.LongName;
            } else if (person && person.RealName && person.LastNameAtBirth) {
                aString = person.RealName + " " + person.LastNameAtBirth;
            } else if (person && person.FirstNameName && person.LastNameAtBirth) {
                aString = person.FirstNameName + " " + person.LastNameAtBirth;
            }
            if (aString == "") {
                return "";
            }

            var theInits = "";
            var theWords = aString.split(" ");
            for (var i = 0; i < theWords.length; i++) {
                if (theWords[i][0] == "(") {
                    theInits += theWords[i][1];
                    return theInits;
                }
                if (theWords[i][0] == '"') {
                    // ignore nickname
                } else {
                    theInits += theWords[i][0];
                }
            }

            return theInits;
        }

        function showMe() {
            console.log("Hi there buddy!");
        }
    }

    static changeDisplayType() {
        let SVGcode =
            "<svg id=CirclesBkgd><rect id=CirclesBkgdRect width=5000 height=5000 style='fill:aliceblue;stroke:aliceblue;stroke-width:1;opacity:1' /></svg>";
        let degreeCount = CirclesView.degreeCount;
        // let displayType = "dot";
        console.log({ degreeCount });
        let circleTypeVariables = {
            dot: { dotRadius: 9 },
            ltr: { dotRadius: 9 },
            inits: { dotRadius: 18 },
            fName: { dotRadius: 18 },
            all: { dotRadius: 32 },
        };
        CirclesView.displayType = document.querySelector('input[name="circlesDisplayType"]:checked').value;
        CirclesView.dotRadius = circleTypeVariables[CirclesView.displayType].dotRadius;
        CirclesView.circleFilled = document.getElementById("displayType_filled").checked;
        CirclesView.circlesBandW = document.getElementById("displayType_BandW").checked;
        CirclesView.circlesGrayAncs = document.getElementById("displayType_GrayAncs").checked;

        condLog("filled:", CirclesView.circleFilled);

        let numAtThisDegree = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        let fNameMultiplierFactor = CirclesView.displayType == "fName" ? 2 : 1;

        let radiusMultipler = fNameMultiplierFactor * 3 * CirclesView.dotRadius;
        // if (CirclesView.displayType == "fName") {
        //     radiusMultipler = 6 * CirclesView.dotRadius;
        // }
        for (let d = 1; d < 8; d++) {
            if (degreeCount[d] == 0) {
                console.log("At CC" + d + " there are " + degreeCount[d] + " people - NO POLYGON");
            } else {
                // FORMULA for the Radius of a Regular n-sided Polygon with sidelength s (from centre of polygon to a vertex)
                //      Radius = s / (2 * sin(180º / n))
                // rearranging the formula, in case you want to find the number of sides you can get from a polygon at a certain radius with a certain sidelength, you would get:
                //      n = 180º / sin -1 ( s / 2Radius )
                // Note Math.sin and Math.asin in JS use radians, so replace 180º with Math.PI
                let regPolyRadius = (2 * CirclesView.dotRadius) / (2 * Math.sin(Math.PI / degreeCount[d]));
                condLog(
                    "At CC" +
                        d +
                        " there are " +
                        degreeCount[d] +
                        " people - Regular Polygon should have Radius of " +
                        regPolyRadius,
                    "| Compared to current one of " + radiusMultipler * d
                );
            }
        }

        // radiusMultiplier is the standard extra radius to add between CC levels (called a multiplier because you multiply the radius by sine or cosine to get the x, y coordinates)
        // currentRadiusMultipler is the current radius, which gets incremented as we add more levels, and even more if multiple rings per level are needed
        let currentRadiusMultipler = radiusMultipler;
        let currentDegree = 0;

        let numInThisRing = 0;
        let desiredNumThisRing = 1;
        let currentRingNum = 1;
        let numCirclesPerRing = [];
        let thisRingNum = 0;
        
        condLog("BEFORE PLACEMENT: dotRadius = " + CirclesView.dotRadius, {radiusMultipler});
        for (let person of CirclesView.currentSortedMap.values()) {
            const degree = person.Meta.Degrees;
            if (degree == 0) {
                currentRadiusMultipler = 0;
            }
            if (degree > currentDegree) {
                currentRadiusMultipler += radiusMultipler;
                currentDegree = degree;
                let regPolyRadius =
                    (fNameMultiplierFactor * 2 * CirclesView.dotRadius) / (2 * Math.sin(Math.PI / degreeCount[degree]));
                if (regPolyRadius > currentRadiusMultipler) {
                    // this means that at this radius, the circles are going to be overcrowded, on top of each other
                    if (regPolyRadius - currentRadiusMultipler < CirclesView.dotRadius) {
                        // if the distance between the current radius, and the ideal regular Polygon radius is less than a dotRadius
                        // then ... just go with the slightly larger radius to fit everyone in
                        currentRadiusMultipler = regPolyRadius;
                    } else {
                        // otherwise, we have too many to fit, so we'll need to figure out how to do multiple rings for this degree level
                        let currentMaxNumSides = Math.floor(
                            Math.PI /
                                Math.asin(
                                    (fNameMultiplierFactor * 2 * CirclesView.dotRadius) / (2 * currentRadiusMultipler)
                                )
                        );
                        let maxNumRingsNeeded = Math.ceil(degreeCount[degree] / currentMaxNumSides);
                        let maxCirclesPerRing = [currentMaxNumSides];
                        let totalCirclesAndCounting = [currentMaxNumSides];
                        for (var r = 1; r < maxNumRingsNeeded; r++) {
                            let nextMaxNumSides = Math.floor(
                                Math.PI /
                                    Math.asin(
                                        (fNameMultiplierFactor * 2 * CirclesView.dotRadius) /
                                            (2 * currentRadiusMultipler + r * (radiusMultipler - CirclesView.dotRadius))
                                    )
                            );
                            maxCirclesPerRing.push(nextMaxNumSides);
                            totalCirclesAndCounting[r] = totalCirclesAndCounting[r-1] + nextMaxNumSides;
                        }
                        condLog({maxCirclesPerRing});
                        condLog({ totalCirclesAndCounting });
                        condLog({r});
                        if (totalCirclesAndCounting[r-2] >= degreeCount[degree]) {
                            condLog("We can SCALE back a ring - don't need them all because the outer ones grow exponentially!!!!");
                        } else {
                            condLog("We need all " + r + " rings of power.");
                        }
                        // OK ... need to SCALE the maxCirclesPerRing to divide them equally by the same ratio so the crowding looks similar
                        let scaleFactor =  degreeCount[degree] / totalCirclesAndCounting[r-1] ;
                        numCirclesPerRing = [];
                        let totalNumCirclesCounted = 0;
                        for (r = 0; r < maxCirclesPerRing.length; r++) {
                            numCirclesPerRing[r] = Math.ceil(scaleFactor * maxCirclesPerRing[r]);
                            totalNumCirclesCounted += numCirclesPerRing[r]; 
                        }
                        condLog("WAS:", numCirclesPerRing[numCirclesPerRing.length - 1]);
                        condLog({ numCirclesPerRing }, {totalNumCirclesCounted}, "DegreeCount: " + degreeCount[degree]);
                        numCirclesPerRing[ numCirclesPerRing.length - 1] += (degreeCount[degree] - totalNumCirclesCounted);
                        condLog("IS NOW:", numCirclesPerRing[numCirclesPerRing.length - 1]);

                        numInThisRing = 0;
                        desiredNumThisRing = numCirclesPerRing[0];
                        currentRingNum = 0;
                        thisRingNum++;
                    }
                } else {
                    // ELSE ... the current radius is within or less than the ideal regular polygon radius, so we can use this,
                    // and no one is overcrowded ... so ... no extra calculations are necessary..  just setup the default variables
                    numInThisRing = 0;
                    desiredNumThisRing = degreeCount[degree];
                    currentRingNum = 0;
                    thisRingNum++;
                }

                condLog("DEGREE START for CC" + degree, { currentRadiusMultipler });
            }
            let rightAngle = 0 - Math.PI/2; // forces each ring to start at 12:00 / due North
            let shiftRingStart =  (thisRingNum % 2) / 2;  // on every other ring, shift the starting node for each ring off half a radius, so that you get a staggered pattern

            let newX =
                5 * 0 + currentRadiusMultipler * Math.cos(((numInThisRing + shiftRingStart) / desiredNumThisRing) * 2 * Math.PI + rightAngle);
            let newY =
                5 * 0 + currentRadiusMultipler * Math.sin(((numInThisRing + shiftRingStart) / desiredNumThisRing) * 2 * Math.PI + rightAngle);
            SVGcode += CirclesView.doCircle(person, degree, newX, newY); //500 * Math.random(), 500 * Math.random());

            // console.log(
            //     "Circle @ ",
            //     newX,
            //     newY,
            //     { currentRingNum },
            //     { thisRingNum },
            //     { desiredNumThisRing },
            //     { shiftRingStart }
            // );

            numInThisRing++;

            if (numInThisRing == desiredNumThisRing && numCirclesPerRing.length > 1) {
                currentRingNum++;
                thisRingNum++;
                numInThisRing = 0;
                desiredNumThisRing = numCirclesPerRing[currentRingNum];
                if (desiredNumThisRing > 0){ 
                    currentRadiusMultipler += radiusMultipler - CirclesView.dotRadius + 3;
                    // thisRingNum--;
                }
                condLog("RING " + currentRingNum + " for CC" + degree, { currentRadiusMultipler }, {desiredNumThisRing});
            }
        }

        let totalWidthAllCircles = 2 * (currentRadiusMultipler + radiusMultipler);
        let leftTopAdjustment = -2 * CirclesView.dotRadius;
        condLog("RESIZING BACKGROUND RECT:  ", {currentRadiusMultipler}, {radiusMultipler}, {totalWidthAllCircles});               
        document.getElementById("circlesDIV4SVG").innerHTML = SVGcode;
        $("#circlesDIV4SVG").draggable();

        document.getElementById(
            "CirclesBkgd"
        ).outerHTML = `<svg id="CirclesBkgd" width="${totalWidthAllCircles + leftTopAdjustment}" height="${totalWidthAllCircles + leftTopAdjustment}" style='position:absolute; left:${
             - totalWidthAllCircles / 2 - leftTopAdjustment
        }px;  top:${
             - totalWidthAllCircles / 2 - leftTopAdjustment
        }px;'><rect id="CirclesBkgdRect" width="${totalWidthAllCircles}" height="${totalWidthAllCircles}" style="fill:aliceblue;stroke:aliceblue;stroke-width:1;opacity:1"></rect></svg>`;
        
        document.getElementById("circlesDIV4SVG").style.left = (totalWidthAllCircles/2) + "px";
        document.getElementById("circlesDIV4SVG").style.top = (totalWidthAllCircles/2) + "px";

        $("#circlesDIV4SVG svg").each(function () {
            const $inp = $(this);
            $inp.on("click", function () {
                if (this["id"] == "CirclesBkgd") {
                    condLog("BACKGROUND CLICKED");
                    return;
                }

                let thisID = this["id"].replace("circlePerson", "");
                let person = window.people.get(1.0 * thisID);

                condLog(window.people.get(1.0 * thisID));
                person.getDisplayName = function () {
                    if (person.LongName) {
                        return person.LongName;
                    } else if (person.RealName) {
                        return person.RealName + " " + person.LastNameAtBirth;
                    } else {
                        return "Private";
                    }
                };
                person.getGender = function () {
                    return person.Gender;
                };
                person.getName = function () {
                    return person.Name;
                };
                person.getBirthDate = function () {
                    return person.BirthDate;
                };
                person.getDeathDate = function () {
                    return person.DeathDate;
                };
                person.getBirthLocation = function () {
                    return person.BirthLocation;
                };
                person.getDeathLocation = function () {
                    return person.DeathLocation;
                };
                person.getPhotoUrl = function () {
                    if (person.PhotoData && person.PhotoData["url"]) {
                        return person.PhotoData["url"];
                    }
                };

                // CirclesView.PersonCodesObject[person.Id].getPhotoUrl = function (person) {

                //     if (person.PhotoData && person.PhotoData["url"]) {
                //         return person.PhotoData["url"];
                //     } else {
                //         return "";
                //     }
                // };

                let numDegreesForPopup = person.Meta.Degrees + " " + "degrees";
                if (person.Meta.Degrees == 1) {
                    numDegreesForPopup = "1 degree";
                }
                if (person.Meta.Degrees == 0) {
                    numDegreesForPopup = "Primary";
                }
                // console.log("Does this person have META degrees ??", person);
                // CirclesView.PersonCodesObject[person.Id]._data.CodesLongList[0].CirclesView.PersonCodesObject[person.Id];

                window.personPopup.popupHTML(person, {
                    type: "CC",
                    person: { _data: CirclesView.PersonCodesObject[person.Id] },
                    leafCollection: CirclesView.theLeafCollection,
                    peopleList: CirclesView.PersonCodesObject,
                    appID: "cc7",
                    SettingsObj: Settings,
                    extra: { degree: numDegreesForPopup },
                });

                console.log("CirclesView.personPopup");
            });
        });
    }
}
