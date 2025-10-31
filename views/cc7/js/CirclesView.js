import { Settings } from "./Settings.js";
import { CC7 } from "./cc7.js";
import { Utils } from "../../shared/Utils.js";
import { PDFs } from "../../shared/PDFs.js";

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
    static firstDegreeCirclesToRevise = []; // Array of the first degree circles that need to be revised, as they are not yet colour coded by Relationships

    static buildView() {
        console.log("CIRCLES VIEW - buildView");
        const PRINTER_ICON = "&#x1F4BE;";

        // DEFINE PDF generation functions - One to create Popup, and one to generate the PDF
        CC7View.setupPDFgenerator = function () {
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            // console.log("G'Day mate!");
            // showPDFgenPopup();
            let PDFgenPopupDIV = document.getElementById("PDFgenPopupDIV");
            document.getElementById("PDFgenProgressBar").style.display = "none";
            document.getElementById("PDFgenButton").removeAttribute("disabled");
            document.getElementById("PDFgenButton").style.display = "revert";
            PDFgenPopupDIV.style.display = "block";

            if (!rootPerson.LongName) {
                if (rootPerson.LongNamePrivate) {
                    rootPerson.LongName = rootPerson.LongNamePrivate;
                }
            }
            // PDFgenPopupDIV.style.zIndex = Utils.getNextZLevel();
            document.getElementById("PDFtitleText").value =
                "CC" + cc7Degree + " Circles Chart for " + rootPerson.LongName;
            let thisDateObj = new Date();
            let thisDate = [thisDateObj.getDate(), months[thisDateObj.getMonth()], thisDateObj.getFullYear()].join("-");
            document.getElementById("PDFfooterText").value =
                "This " +
                // FractalView.numGens2Display +
                " CC" +
                cc7Degree +
                " Circles Chart was created " +
                thisDate +
                " using the CC7 VIEWS app in the Tree Apps collection on WikiTree.com.";
        };

        CC7View.doPrintPDF = function () {
            document.getElementById("PDFgenButton").style.display = "none";
            document.getElementById("PDFgenProgressBar").offsetHeight;
            document.getElementById("PDFgenProgressBar").style.display = "block"; //( "disabled", true);
            CC7View.printPDF();
        };

        CC7View.printPDF = async function () {
            console.log("printPDF NOW!");

            let tmpPDF = new jsPDF("l", "pt", [2595.28, 1841.89]);
            document.getElementById("PDFgenButton").setAttribute("disabled", true);
            document.getElementById("PDFgenProgressBar").style.display = "revert"; //( "disabled", true);

            PDFs.resetAll();

            PDFs.currentPDFsettings = {
                thisDX: 0,
                thisDY: 0,
                thisStroke: "black",
                thisStrokeRGB: [0, 0, 0],
                thisStrokeWidth: 1,
                thisFontSize: 12,
                thisFont: "helvetica",
                thisFontStyle: "normal",
            };

            // PDFs.thisPDFlinesArray = [];
            // PDFs.thisPDFtextArray = [];
            // PDFs.thisPDFrectArray = [];
            // PDFs.thisPDFroundedRectArray = [];
            // PDFs.thisPDFimageArray = [];

            // PDFs.thisPDFminX = 0;
            // PDFs.thisPDFminY = 0;
            // PDFs.thisPDFmaxX = 0;
            // PDFs.thisPDFmaxY = 0;
            // PDFs.thisPDFwidth = 0;
            // PDFs.thisPDFheight = 0;
            // PDFs.thisPDFmargin = 20;

            let thisSVG = document.getElementById("circlesDIV4SVG");
            let thisDXDY = PDFs.getTranslationCoordinates(thisSVG);
            PDFs.currentPDFsettings.thisDX = parseInt(thisDXDY[0]);
            PDFs.currentPDFsettings.thisDY = 100 + parseInt(thisDXDY[1]);

            tmpPDF.setFont(PDFs.currentPDFsettings.thisFont, PDFs.currentPDFsettings.thisFontStyle);
            tmpPDF.setFontSize(PDFs.currentPDFsettings.thisFontSize);

            let foundFirstEllipse = false;
            for (var i = 0; i < thisSVG.childElementCount; i++) {
                let thisKid = thisSVG.children[i];
                let thisID = thisKid.id;
                // console.log(thisID);
                let thisLeft = PDFs.getValueFromStyleString(thisKid.getAttribute("style"), "left");
                let thisTop = PDFs.getValueFromStyleString(thisKid.getAttribute("style"), "top");
                let thisRX = 10;
                let thisRY = 10;
                for (var j = 0; j < thisKid.childElementCount; j++) {
                    let thisGrandKid = thisKid.children[j];
                    if (thisGrandKid.tagName == "ellipse") {
                        let thisX = parseInt(thisGrandKid.getAttribute("cx")) + PDFs.currentPDFsettings.thisDX;
                        let thisY = parseInt(thisGrandKid.getAttribute("cy")) + PDFs.currentPDFsettings.thisDY;
                        thisRX = parseInt(thisGrandKid.getAttribute("rx"));
                        thisRY = parseInt(thisGrandKid.getAttribute("ry"));
                        let thisFill = thisGrandKid.getAttribute("fill");
                        let thisStroke = thisGrandKid.getAttribute("stroke");
                        let thisStrokeWidth = parseInt(thisGrandKid.getAttribute("stroke-width"));

                        thisX += parseInt(thisLeft);
                        thisY += parseInt(thisTop);

                        if (foundFirstEllipse == false) {
                            // console.log("FOUND an ellipse @ ", i, j, "with", PDFs.thisPDFimageArray.length + " images");
                            foundFirstEllipse = true;

                            if (PDFs.thisPDFimageArray.length == 1) {
                                PDFs.thisPDFimageArray[0][2] = thisX - PDFs.thisPDFimageArray[0][4] / 2 + thisRX;
                                PDFs.thisPDFimageArray[0][3] = thisY - PDFs.thisPDFimageArray[0][5] - 2;
                            }
                        }

                        // console.log(
                        //     "rrect",
                        //     thisX,
                        //     thisY,
                        //     thisRX,
                        //     thisFill,
                        //     thisStroke,
                        //     thisStrokeWidth,
                        //     PDFs.currentPDFsettings.thisDX,
                        //     PDFs.currentPDFsettings.thisDY
                        // );

                        PDFs.thisPDFroundedRectArray.push([
                            thisX, //- 0.5 * thisR,
                            thisY, // - 0.5 * thisR,
                            2 * thisRX,
                            2 * thisRY,
                            thisRX, // 2 * thisR,
                            thisRY, // 2 * thisR,
                            "DF",
                            { fillColor: thisFill, strokeColor: thisStroke, lineWidth: thisStrokeWidth },
                        ]);

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
                    } else if (
                        thisGrandKid &&
                        thisGrandKid.tagName == "text" &&
                        thisGrandKid.textContent &&
                        thisGrandKid.textContent > ""
                    ) {
                        let thisText = thisGrandKid.textContent;
                        let thisTextX = parseInt(thisGrandKid.getAttribute("x"));
                        let thisTextY = parseInt(thisGrandKid.getAttribute("y"));

                        let thisFontSize = PDFs.getValueFromStyleString(
                            thisGrandKid.getAttribute("style"),
                            "font-size"
                        );
                        let thisFill = PDFs.getValueFromStyleString(thisGrandKid.getAttribute("style"), "fill");

                        // let thisFont = thisGrandKid.getAttribute("font-family");
                        // let thisFontStyle = thisGrandKid.getAttribute("font-style");

                        thisTextX += parseInt(thisLeft);
                        thisTextY += parseInt(thisTop);
                        tmpPDF.setFontSize(thisFontSize);
                        while (tmpPDF.getTextWidth(thisText) + 4 >= 2 * thisRX && thisFontSize > 5) {
                            thisFontSize -= 1;
                            tmpPDF.setFontSize(thisFontSize);
                        }
                        thisFontSize = Math.max(thisFontSize, 5);
                        PDFs.currentPDFsettings.thisFontSize = thisFontSize;

                        // console.log(
                        //     thisText,
                        //     thisFontSize,
                        //     // thisFont,
                        //     // thisFontStyle,
                        //     thisTextX,
                        //     thisTextY,
                        //     thisLeft,
                        //     thisTop,
                        //     thisFill,
                        //     tmpPDF.getTextWidth(thisText)
                        // );

                        PDFs.thisPDFtextArray.push([
                            thisText,
                            thisTextX + thisRX + PDFs.currentPDFsettings.thisDX, //+ 150,
                            thisTextY + thisRY + PDFs.currentPDFsettings.thisDY,
                            PDFs.currentPDFsettings.thisFont,
                            PDFs.currentPDFsettings.thisFontStyle,
                            PDFs.currentPDFsettings.thisFontSize,
                            { align: "center", maxWidth: 2 * thisRX, fill: thisFill, strokeColor: thisFill },
                        ]);

                        // tmpPDF.setFont(thisFont, thisFontStyle);
                        // tmpPDF.setFontSize(thisFontSize);
                        // tmpPDF.text(thisText, thisTextX, thisTextY);
                    }
                }

                if (thisID == "theCentralPhoto") {
                    // thisID = "photoImgFor" + index;
                    let thisElement = document.getElementById("theCentralPhotoIMG");
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
                        });

                        // console.log("CirclesView.dotRadius", CirclesView.dotRadius);
                        let thisPhotoX = 0;
                        let thisPhotoY =
                            /* thisElement.height +  */ parseInt(thisTop) +
                            CirclesView.dotRadius / 2 +
                            PDFs.currentPDFsettings.thisDY; //thisElement.height - (0 * CirclesView.dotRadius) / 2;
                        //  if (thePeopleList[window.FractalView.myAhnentafel.list[index]].getGender() == "Male") {
                        //      thisBaseString = PDFs.maleGIFbase64string;
                        //  } else if (thePeopleList[window.FractalView.myAhnentafel.list[index]].getGender() == "Female") {
                        //      thisBaseString = PDFs.femaleGIFbase64string;
                        //  } else {
                        //      thisBaseString = PDFs.nogenderGIFbase64string;
                        //  }

                        PDFs.thisPDFimageArray.push([
                            thisBaseString,
                            // "/apps/clarke11007/images/icons/female.gif",
                            "",
                            0, // will be revised once the first circle is added
                            0, // will be revised once the first circle is added
                            thisElement.width,
                            thisElement.height,
                        ]);
                        // thisY += thisElement.height;
                    } else if (thisElement && thisElement.src > "" && thisElement.parentNode.style.display != "none") {
                        let thisBaseString = await PDFs.setupWaitForBase64Image({
                            width: thisElement.width,
                            height: thisElement.height,
                            src: thisElement.src,
                        });

                        PDFs.thisPDFimageArray.push([
                            thisBaseString, //thisElement.src,
                            "PNG",
                            0, // will be revised once the first circle is added
                            0, // will be revised once the first circle is added
                            thisElement.width,
                            thisElement.height,
                        ]);
                        // thisY += thisElement.height + 20;
                    }
                }
            }

            PDFs.setPDFsMaxMins();
            addDegreesTableToPDF();
            addLegendTableToPDF();

            // console.log(PDFs.thisPDFtextArray);
            // console.log(PDFs.thisPDFroundedRectArray);
            // console.log(PDFs.thisPDFimageArray);

            // ALL COMPONENTS HAVE BEEN ADDED TO THE PDF - NOW DO THE FINAL CALCULATIONS
            PDFs.setPDFsizes(tmpPDF);
            console.log("w,h:", PDFs.thisPDFwidth, PDFs.thisPDFheight);

            // Must set ORIENTATION based on the width and height of the PDF - doesn't like it otherwise.
            // let orientation = "l";
            // if (PDFs.thisPDFwidth < PDFs.thisPDFheight) {
            //     orientation = "p";
            // }

            // let realPDF = new jsPDF(orientation, "pt", [PDFs.thisPDFwidth, PDFs.thisPDFheight]);
            // console.log(PDFs.currentPDFsettings);

            // PDFs.addRoundedRectsToPDF(realPDF);
            // PDFs.addImagesToPDF(realPDF);
            // PDFs.addTextsToPDF(realPDF);

            let realPDF = PDFs.assemblePDF(["roundedRects", "images", "texts"]);

            let fileName4PDF =
                "CirclesChart_" +
                rootPerson.Name +
                // FractalView.myAhnentafel.primaryPerson.getName() +
                "_CC" +
                cc7Degree +
                PDFs.datetimestamp() +
                ".pdf";
            // FractalView.numGens2Display +
            // "gens_" +

            realPDF.save(fileName4PDF);

            let PDFgenPopupDIV = document.getElementById("PDFgenPopupDIV");
            PDFgenPopupDIV.style.display = "none";

            console.log("DONE printPDF !");
        };

        function addDegreesTableToPDF() {
            // console.log(
            //     "addDegreesTableToPDF",
            //     "minX: " + PDFs.thisPDFminX,
            //     "thisDX: " + PDFs.currentPDFsettings.thisDX
            // );

            if (document.getElementById("PDFshowDegreeTableNot").checked) {
                return;
            }

            let whereY = PDFs.thisPDFminY - 60;
            if (document.getElementById("PDFshowDegreeTableBelow").checked) {
                whereY = PDFs.thisPDFmaxY + 20;
            }

            PDFs.thisPDFtextArray.push([
                "Degrees",
                5 + PDFs.thisPDFminX, //+ 150,
                5 + whereY,
                "helvetica",
                "bold",
                14,
                { align: "left", fill: "black", strokeColor: "black" },
            ]);
            PDFs.thisPDFtextArray.push([
                "Connections",
                5 + PDFs.thisPDFminX, //+ 150,
                25 + whereY,
                "helvetica",
                "bold",
                14,
                { align: "left", fill: "black", strokeColor: "black" },
            ]);

            let dt = document.getElementById("degreesTable");
            let numCols = dt.rows[0].cells.length - 1;

            // Only show the TOTAL row if that exists (won't exist if you're showing a single Degree only, and not a range of Degrees)
            if (dt.rows[2]) {
                PDFs.thisPDFtextArray.push([
                    "Total",
                    5 + PDFs.thisPDFminX, //+ 150,
                    45 + whereY,
                    "helvetica",
                    "bold",
                    14,
                    { align: "left", fill: "black", strokeColor: "black" },
                ]);
            }

            for (let r = 0; r < 3; r++) {
                const thisRow = dt.rows[r];
                if (thisRow) {
                    for (let c = 0; c < numCols; c++) {
                        const thisCell = thisRow.cells[c + 1];
                        if (thisCell && thisCell.innerText) {
                            const thisEntry = thisRow.cells[c + 1].innerText;

                            PDFs.thisPDFtextArray.push([
                                thisEntry,
                                125 + c * 40 + PDFs.thisPDFminX, //+ 140,
                                5 + r * 20 + whereY,
                                "helvetica",
                                "normal",
                                14,
                                { align: "right", maxWidth: 40, fill: "black", strokeColor: "black" },
                            ]);
                        }
                    }
                }
            }

            if (document.getElementById("PDFshowDegreeTableBelow").checked) {
                // NEED to add a visual element at the bottom of the degree table so proper MAX Y is calculated
                PDFs.thisPDFlinesArray.push([
                    5,
                    5 + 2 * 20 + whereY,
                    125 + numCols * 40 + PDFs.thisPDFminX,
                    5 + 2 * 20 + whereY,
                    [0, 0, 0],
                    1,
                    "S",
                ]);
            }
        }

        function addLegendTableToPDF() {
            console.log("addLegendTableToPDF");
            if (document.getElementById("PDFshowLegendNot").checked) {
                return;
            }

            let useSmartLegend = document.getElementById("PDFuseSmartLegend").checked;

            if (document.getElementById("PDFshowLegendNot").checked) {
                return;
            }

            let whereY = PDFs.thisPDFminY - 60;
            if (document.getElementById("PDFshowLegendBelow").checked) {
                whereY = PDFs.thisPDFmaxY + 20;
            }

            let dt = document.getElementById("degreesTable");
            let numCols = dt.rows[0].cells.length - 1;
            let startingDeg = 1;
            let endingDeg = numCols;
            if (numCols == 1) {
                startingDeg = parseInt(dt.rows[0].cells[1].innerText);
                endingDeg = startingDeg;
            }
            if (!useSmartLegend) {
                startingDeg = 1;
                endingDeg = 7;
            }
            const blobColours = [
                "green",
                "lawngreen",
                "orange",
                "cyan",
                "magenta",
                "aquamarine",
                "gold",
                "deepskyblue",

                "green",
                "gray",
                "blue",
                "red",
                "lime",
            ];

            const CC1rels = ["Primary", "Parent", "Sibling", "Spouse", "Child"];

            let thisMaxX = PDFs.thisPDFmaxX - 7 * 28 - 12 * 2;

            PDFs.thisPDFtextArray.push([
                "Legend:",
                thisMaxX - 10, //+ 150,
                whereY + 15,
                "helvetica",
                "bold",
                14,
                { align: "left", fill: "black", strokeColor: "black" },
            ]);

            for (let cc = Math.max(2, startingDeg); cc <= Math.min(7, endingDeg); cc++) {
                PDFs.thisPDFroundedRectArray.push([
                    thisMaxX + cc * 28, //- 0.5 * thisR,
                    whereY, // - 0.5 * thisR,
                    2 * 12,
                    2 * 12,
                    12, // 2 * thisR,
                    12, // 2 * thisR,
                    "DF",
                    { fillColor: blobColours[cc], strokeColor: "black", lineWidth: 1 },
                ]);

                PDFs.thisPDFtextArray.push([
                    "CC" + cc,
                    thisMaxX + cc * 28 + 12,
                    whereY + 14,
                    "helvetica",
                    "normal",
                    9,
                    { align: "center", maxWidth: 24, fill: "black", strokeColor: "black" },
                ]);
            }

            startingDeg = 3;
            if (numCols == 1) {
                endingDeg = 3;
                if (!useSmartLegend) {
                    endingDeg = 7;
                }
            } else {
                endingDeg = 7;
            }

            for (let cc = startingDeg; cc <= endingDeg; cc++) {
                PDFs.thisPDFroundedRectArray.push([
                    thisMaxX + cc * 28, //- 0.5 * thisR,
                    whereY + 28, // - 0.5 * thisR,
                    2 * 12,
                    2 * 12,
                    12, // 2 * thisR,
                    12, // 2 * thisR,
                    "DF",
                    { fillColor: blobColours[5 + cc], strokeColor: "black", lineWidth: 1 },
                ]);

                PDFs.thisPDFtextArray.push([
                    CC1rels[cc - 3],
                    thisMaxX + cc * 28 + 12,
                    whereY + 42, //39 - (cc > 5 ? 0 : 3),
                    "helvetica",
                    "normal",
                    7, //cc == 6 ? 6 : 7,
                    { align: "center", maxWidth: 24, fill: cc == 7 ? "black" : "white", strokeColor: "white" },
                ]);

                // PDFs.thisPDFtextArray.push([
                //     CC1rels[cc - 2],
                //     thisMaxX + cc * 28 + 10,
                //     whereY + 38,
                //     "helvetica",
                //     "normal",
                //     9,
                //     { align: "center", maxWidth: 24, fill: "black", strokeColor: "black" },
                // ]);
            }

            if (numCols > 1) {
                PDFs.thisPDFtextArray.push([
                    "CC1:",
                    thisMaxX + 2 * 28 + 10,
                    whereY + 42,
                    "helvetica",
                    "bold",
                    9,
                    { align: "center", maxWidth: 28, fill: "black", strokeColor: "black" },
                ]);
            }

            if (document.getElementById("PDFshowLegendBelow").checked) {
                // NEED to add a visual element at the bottom of the degree table so proper MAX Y is calculated
                PDFs.thisPDFlinesArray.push([
                    PDFs.thisPDFminX,
                    5 + 2 * 20 + whereY,
                    PDFs.thisPDFmaxX,
                    5 + 2 * 20 + whereY,
                    [0, 0, 0],
                    1,
                    "S",
                ]);
            }
        }

        var popupDIV =
            '<div id=popupDIV class="pop-up" style="display:none; position:absolute; left:20px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left" title="close pop-up"><A onclick="SuperBigFamView.removePopup();">' +
            SVGbtnCLOSE +
            "</A></span></div>";
        var connectionPodDIV =
            '<div id=connectionPodDIV class="pop-up" style="display:none; width:fit-content; position:absolute; left:700px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; align:left" title="close pop-up"><A onclick="SuperBigFamView.removePodDIV();">' +
            SVGbtnCLOSE +
            "</A></span></div>";

        var innerLegendBits =
            `<P align="right">Legend: <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="orange"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">CC2</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="cyan"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">CC3</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="magenta"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">CC4</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="aquamarine"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">CC5</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="gold"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">CC6</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="deepskyblue"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">CC7</text></svg>` +
            `<BR/>CC1: <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="green "></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:white;" textLength="34" lengthAdjust="spacingAndGlyphs">Primary</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="gray"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:white;" textLength="34" lengthAdjust="spacingAndGlyphs">Parent</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="blue"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:white;" textLength="34" lengthAdjust="spacingAndGlyphs">Sibling</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="red"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:white;" textLength="34" lengthAdjust="spacingAndGlyphs">Spouse</text></svg>` +
            ` <svg id="circlePerson22554776" width="38" height="38"><ellipse cx="19" cy="19" rx="18" ry="18" stroke="black" stroke-width="1" fill="lime"></ellipse><text text-anchor="middle" x="19" y="22" style="font-size:14; fill:black;" textLength="34" lengthAdjust="spacingAndGlyphs">Child</text></svg>`;
        var legendDIV =
            '<div id=legendDIV class="pop-up" style="display:block; width:fit-content; position:absolute; left:700px; background-color:#EFEFEF; border: solid darkgrey 4px; border-radius: 15px; padding: 15px;}">' +
            "<span style=\"color:red; align:left\"><A onclick=\"document.getElementById('legendDIV').style.display = 'none'\">" +
            SVGbtnCLOSE +
            "</A></span>" +
            innerLegendBits +
            "</div>";

        let PDFgenPopupHTML =
            '<div id=PDFgenPopupDIV class="pop-up" style="display:none; position:absolute; right:80px; background-color:#EDEADE; border: solid darkgreen 4px; border-radius: 15px; padding: 15px; ; z-index:9999">' +
            `<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><a onclick='document.getElementById("PDFgenPopupDIV").style.display = "none";'>` +
            SVGbtnCLOSE +
            "</a></span>" +
            "<H3 align=center>PDF Generator</H3><div id=innerPDFgen>" +
            "<label><input type=checkbox id=PDFshowTitleCheckbox checked> Display Title at top of Circles Chart PDF</label><BR/><input style='margin-left: 20px;' type=text size=100 id=PDFtitleText value='Circles Chart for John Smith'>" +
            "<BR/><BR/>" +
            "Include Degree Table:<BR/> <label><input style='margin-left: 20px;' type=radio name=PDFshowDegreeTableCheckbox id=PDFshowDegreeTableNot > Not at all</label> <label><input type=radio name=PDFshowDegreeTableCheckbox id=PDFshowDegreeTableAbove checked > Above</label>   <label><input type=radio name=PDFshowDegreeTableCheckbox id=PDFshowDegreeTableBelow > Below</label>   " +
            "<BR/><BR/>" +
            "Include Legend:<BR/> <label><input style='margin-left: 20px;' type=radio name=PDFshowLegendCheckbox id=PDFshowLegendNot > Not at all</label> <label><input type=radio name=PDFshowLegendCheckbox id=PDFshowLegendAbove > Above</label>   <label><input type=radio name=PDFshowLegendCheckbox id=PDFshowLegendBelow checked> Below</label>   " +
            "&nbsp;&nbsp;&nbsp; <label><input style='margin-left: 20px;' type=checkbox name=PDFuseSmartLegend id=PDFuseSmartLegend > Use Smart Legend (only show CCs used)</label> " +
            "<BR/><BR/>" +
            "<label><input type=checkbox id=PDFshowFooterCheckbox checked> Display Citation at bottom of PDF</label><BR/><input style='margin-left: 20px;' type=text size=100 id=PDFfooterText value='Circles Chart created TODAY using CC7 VIEWS app in Tree Apps collection on WikiTree.com.'>" +
            "<BR/><BR/><label><input type=checkbox id=PDFshowURLCheckbox checked> Add URL to bottom of PDF</label>" +
            "<BR/><BR/>" +
            "<button id=PDFgenButton class='btn btn-primary'  onclick=CC7View.doPrintPDF()>Generate PDF now</button> " +
            "<span id=PDFgenProgressBar class='btn-secondary'  style='display:none;' >Processing PDF .... please hold ...</span> " +
            "</div></div>";

        popupDIV += connectionPodDIV + legendDIV + PDFgenPopupHTML;

        let toggleLegendFunctionCode = `if (document.getElementById("legendDIV").style.display == "none") {
                document.getElementById("legendDIV").style.display = "block";
            } else {
                document.getElementById("legendDIV").style.display = "none";
            }`;

        let showGenPDFpopupFunctionCode = `if (document.getElementById("PDFgenPopupDIV").style.display == "none") {
                document.getElementById("PDFgenPopupDIV").style.display = "block";
                console.log("showGenPDFpopupFunctionCode");
                CC7View.setupPDFgenerator();            
            }`;

        const circlesDisplay = $(
            `
        <div id="circlesDisplay" class="cc7ViewTab">
            <div id=circlesBtnBar style='background-color: #f8a51d80; align: center; width="100%"' >
            Display: 
                <label title='Display coloured dot for each person' style='cursor:pointer;'><input type=radio   name=circlesDisplayType id=displayType_dot value=dot > <font color=magenta>&#x2B24;</font></label> &nbsp;&nbsp;
                <label title='Display first initial for each person' style='cursor:pointer;'><input type=radio   name=circlesDisplayType id=displayType_ltr value=ltr> A</label> &nbsp;&nbsp;
                <label title='Display all initials for each person' style='cursor:pointer;'><input type=radio   name=circlesDisplayType id=displayType_inits value=inits checked> ABC</label> &nbsp;&nbsp;
                <label title='Display first name of each person' style='cursor:pointer;'><input type=radio   name=circlesDisplayType id=displayType_fName value=fName > FName </label> &nbsp;&nbsp;
                <label title='Display full name & lifespan of each person' style='cursor:pointer;'><input type=radio   name=circlesDisplayType id=displayType_all value=all > all  </label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label  title='Toggle between solid and hollow circles' style='cursor:pointer;' ><input type=checkbox id="displayType_filled" checked> Fill circles</label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label  title='Toggle between colour and B&W' style='cursor:pointer;' ><input type=checkbox id="displayType_BandW" > Black & White</label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label  title='For Direct Ancestors, toggle between CC colour or Gray' style='cursor:pointer;' ><input type=checkbox id="displayType_GrayAncs"  > Grayify Ancestors</label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <label  title='Show Photo of Central Person, or not' style='cursor:pointer;' ><input type=checkbox id="displayType_CentralPhoto"  > Central Photo</label>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  <button title='Hide / Show Legend' onclick='` +
                toggleLegendFunctionCode +
                `' class='btn btn-primary btn-sm'>Legend</button> ` +
                `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <A style="cursor:pointer;" title="Save as PDF"  onclick='` +
                showGenPDFpopupFunctionCode +
                `'>` +
                PRINTER_ICON +
                ` </A>
            </div>
                
            <div id=circlesDIV4SVG><svg id=CirclesBkgd><rect id=CirclesBkgdRect width=5000 height=5000 style='fill:aliceblue;stroke:aliceblue;stroke-width:1;opacity:1' /></svg></div>
            ${popupDIV}
        </div>`
        );
        circlesDisplay.insertBefore($("#peopleTable"));

        $("#popupDIV").draggable();
        $("#connectionPodDIV").draggable();
        $("#legendDIV").draggable();

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
        condLog("connectAllToPrimaryPerson", { currentRootID });
        condLog("window.people.size", window.people.size);
        condLog("window.people", window.people);
        let rootPeep = window.people.get(1.0 * currentRootID);
        condLog({ rootPeep });
        if (rootPeep) {
            CirclesView.updateFieldsInPersonCodesObject(currentRootID, "A0", "A0-" + currentRootID);
            CirclesView.addConnectionsToThisPerson(currentRootID, "A0");
        }
    }

    static updateFieldsInPersonCodesObject(currentID, code, codeLong) {
        condLog("updateFieldsInPersonCodesObject:", currentID, code, codeLong);
        let Peep = window.people.get(currentID);
        let currentIDstr = "" + currentID;
        if (Peep) {
            if (!CirclesView.PersonCodesObject[currentID]) {
                CirclesView.PersonCodesObject[currentID] = { CodesList: [code], CodesLongList: [codeLong] };
                CirclesView.theLeafCollection[code] = { Id: currentID };
            } else if (
                CirclesView.PersonCodesObject[currentID] &&
                CirclesView.PersonCodesObject[currentID].CodesList.indexOf(code) > -1
            ) {
                // do NOT duplicate the code .... just return
                return;
            } else if (codeLong.indexOf(currentIDstr) < codeLong.length - currentIDstr.length) {
                // do NOT duplicate if currentID is already in Long Code List .... just return
                return;
            } else if (code.length > 30) {
                // Too convoluted connection .... (temporary solution)
                return;
            } else if (CirclesView.PersonCodesObject[currentID]) {
                CirclesView.PersonCodesObject[currentID].CodesList.push(code);
                CirclesView.PersonCodesObject[currentID].CodesLongList.push(codeLong);
                CirclesView.theLeafCollection[code] = { Id: currentID };
            }
            let fieldsList = [
                "Name",
                "Id",
                "LongName",
                "FirstName",
                "RealName",
                "LastNameAtBirth",
                "Gender",
                "BirthDate",
                "BirthLocation",
                "DeathDate",
                "LongName",
                "DeathLocation",
                "IsLiving",
                "Spouse",
                "Child",
                "Sibling",
                "Spouses",
                "Mother",
                "Father",
                "PhotoData",
            ];
            for (let f = 0; f < fieldsList.length; f++) {
                let fldName = fieldsList[f];
                if (Peep[fldName]) {
                    CirclesView.PersonCodesObject[currentID][fldName] = Peep[fldName];
                }
            }
        }
    }

    static notAlreadyInCodeLong(newbie, codeLong) {
        if (!codeLong || codeLong == "") {
            return false;
        }

        return codeLong.indexOf(newbie) == -1;
    }

    static showPDFgenPopup() {
        let PDFgenPopupDIV = document.getElementById("PDFgenPopupDIV");
        document.getElementById("PDFgenProgressBar").style.display = "none";
        document.getElementById("PDFgenButton").removeAttribute("disabled");
        document.getElementById("PDFgenButton").style.display = "revert";
        PDFgenPopupDIV.style.display = "block";
        PDFgenPopupDIV.style.zIndex = Utils.getNextZLevel();
        document.getElementById("PDFtitleText").value =
            "CC Circles Chart for " + document.getElementById("nameDivFor1").innerText;
        let thisDateObj = new Date();
        let thisDate = [thisDateObj.getDate(), months[thisDateObj.getMonth()], thisDateObj.getFullYear()].join("-");
        document.getElementById("PDFfooterText").value =
            "This " +
            // FractalView.numGens2Display +
            " CC7 Circles Chart was created " +
            thisDate +
            " using the CC7 VIEWS app in the Tree Apps collection on WikiTree.com.";
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

        if (thisPeep && thisPeepEntry) {
            let thisPeepCodeLong = thisPeepEntry.CodesLongList[thisPeepEntry.CodesList.indexOf(thisPeepCode)];

            // paRENTS
            if (
                thisPeep.Father > 0 &&
                thisPeepCodeLong > "" &&
                CirclesView.notAlreadyInCodeLong(thisPeep.Father, thisPeepCodeLong)
            ) {
                if (fromWhere == "Sibling" && thisPeep.Father == p1) {
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
                if (fromWhere == "Sibling" && thisPeep.Mother == p2) {
                    // do not go any further
                } else if (fromWhere == "Kid" && (thisPeep.Mother == p1 || thisPeep.Mother == p2)) {
                    // do not go any further
                } else {
                    CirclesView.updateFieldsInPersonCodesObject(
                        thisPeep.Mother,
                        thisPeepCode + "RF",
                        thisPeepCodeLong + "|" + "RF-" + thisPeep.Mother
                    );
                    CirclesView.addConnectionsToThisPerson(
                        thisPeep.Mother,
                        thisPeepCode + "RF",
                        "Mother",
                        thisPeep.Father
                    );
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
                    if (
                        nextPeep.Id == p1 &&
                        (fromWhere == "Mother" || fromWhere == "Father" || fromWhere == "Partner")
                    ) {
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
            if (thisPeep.Child && thisPeep.Child.length > 0 && fromWhere != "Mother" && fromWhere != "Father") {
                for (let i = 0; i < thisPeep.Child.length; i++) {
                    const nextPeep = thisPeep.Child[i];
                    if (fromWhere == "Partner" && nextPeep.Mother == thisPeep.Id && nextPeep.Father == p1) {
                        continue;
                    } else if (fromWhere == "Partner" && nextPeep.Father == thisPeep.Id && nextPeep.Mother == p1) {
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
                                    otherParentId = SpouseArray[sp].Id;
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
        // console.log("mapArray:", mapArray);
        const sortedMap = new Map(mapArray);

        let SVGcode = "";
        CirclesView.degreeCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];

        CirclesView.currentSortedMap = sortedMap;

        for (let person of sortedMap.values()) {
            const degree = person.Meta.Degrees;
            CirclesView.degreeCount[degree]++;
        }

        condLog("CirclesView.degreeCount:", CirclesView.degreeCount);
        CirclesView.changeDisplayType();

        condLog({ sortedMap });
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

    // ====================================================================
    // Re: issue of sometimes Degree 1 colouring is not occurring
    // - this is because the person is not being added to the map with the correct relationship - OR - the relationship is in the process of being calculated and not done yet
    // SOLUTION ?
    // - add a check to see if the relationship is already calculated and if not, then do the calculation
    //  - USE: array to keep track of degree = 1 circles,
    // and check all of those who are NOT children once the first round has been done
    //  (add check when the WTE Connection finder and Relationship finder are done)
    // ====================================================================

    static doCircle(person, thisDegree, newX, newY) {
        condLog(CirclesView.displayType, person);
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
        condLog(first, last, degree, rel, newX, newY);

        let xDotRadius = CirclesView.dotRadius;
        if (CirclesView.displayType == "fName") {
            xDotRadius *= 2;
        }

        let thisClr = blobColours[degree]; // predominant colour for circles, specificially, circle FILL colour (turns white if fill is off or in B&W mode)
        let outlineClr = "black"; // outline of dot - will be black normally, but when filled and B&W modes are both turned off, it becomes the colour previously known as the fill colour (blobColour)
        let textClr = "black"; // colour of the text inside the circle (letter, initials or names & dates) - usually black unless filled is on and fill colour is too dark

        // CHECK for Degree 1 relationships
        if (degree == 1) {
            if (person && person.Relationship == undefined) {
                condLog("CirclesView.doCircle - degree 1 person:", person.Relationship, person.Id, person.LongName);
                this.firstDegreeCirclesToRevise.push(person.Id);
            } else if (person && this.firstDegreeCirclesToRevise.indexOf(person.Id) > -1) {
                condLog("FOUND a degree 1 person READY to revise:", person.Relationship, person.Id, person.LongName);
                this.firstDegreeCirclesToRevise.splice(this.firstDegreeCirclesToRevise.indexOf(person.Id), 1);
            }
        }

        if (degree == 0) {
            textClr = "white";
        } else if (
            person.Relationship &&
            person.Relationship.full &&
            (person.Relationship.full == "father" ||
                person.Relationship.full == "mother" ||
                person.Relationship.full == "parent")
        ) {
            thisClr = "gray";
            textClr = "white";
        } else if (
            person.Relationship &&
            person.Relationship.full &&
            CirclesView.circlesGrayAncs == true &&
            (person.Relationship.full.indexOf("father") > -1 ||
                person.Relationship.full.indexOf("mother") > -1 ||
                person.Relationship.full.indexOf("parent") > -1)
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
            " style='position: absolute; left: " +
            Math.round(newX) +
            "px; " +
            "top: " +
            Math.round(newY) +
            "px;' >";

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
                "<text text-anchor=middle x=10 y=15 style='font-size:14; fill:" + textClr + ";' >" + theLtr + "</text>";
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
            } else if (person.FirstName) {
                theName = person.FirstName;
            } else {
                console.log("Cannot find a first name for  ", person);
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
        console.log("CIRCLES VIEW - changeDisplayType");
        let SVGcode =
            "<svg id=CirclesBkgd><rect id=CirclesBkgdRect width=5000 height=5000 style='fill:aliceblue;stroke:aliceblue;stroke-width:1;opacity:1' /></svg>";
        let degreeCount = CirclesView.degreeCount;
        // let displayType = "dot";
        condLog({ degreeCount });
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
        CC7.updateURL();

        condLog("filled:", CirclesView.circleFilled);

        let numAtThisDegree = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        let fNameMultiplierFactor = CirclesView.displayType == "fName" ? 2 : 1;

        let radiusMultipler = fNameMultiplierFactor * 3 * CirclesView.dotRadius;
        // if (CirclesView.displayType == "fName") {
        //     radiusMultipler = 6 * CirclesView.dotRadius;
        // }
        for (let d = 1; d < 8; d++) {
            if (degreeCount[d] == 0) {
                condLog("At CC" + d + " there are " + degreeCount[d] + " people - NO POLYGON");
            } else {
                // FORMULA for the Radius of a Regular n-sided Polygon with sidelength s (from centre of polygon to a vertex)
                //      Radius = s / (2 * sin(180º / n))
                // rearranging the formula, in case you want to find the number of sides you can get from a polygon at a certain radius with a certain sidelength, you would get:
                //      n = 180º / sin -1 ( s / 2Radius )
                // Note Math.sin and Math.asin in JS use radians, so replace 180º with Math.PI
                let regPolyRadius = (2 * CirclesView.dotRadius) / (2 * Math.sin(Math.PI / degreeCount[d]));
                console.log(
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
        let centralPersonDotDY = 0;
        let extraRadiusForCentralPerson = 0;

        condLog("BEFORE PLACEMENT: dotRadius = " + CirclesView.dotRadius, { radiusMultipler });

        let theCentralPersonObject = CirclesView.PersonCodesObject[CirclesView.theLeafCollection["A0"].Id];
        let showPhotoChkBox = document.getElementById("displayType_CentralPhoto");
        if (
            showPhotoChkBox &&
            showPhotoChkBox.checked == true &&
            theCentralPersonObject &&
            theCentralPersonObject.PhotoData &&
            theCentralPersonObject.PhotoData["url"]
        ) {
            let photoDiv =
                `<g id=theCentralPhoto class="image-box" style="position:absolute; left: ` +
                (CirclesView.dotRadius - theCentralPersonObject.PhotoData["width"] / 2) +
                `px; top: ` +
                (0 - theCentralPersonObject.PhotoData["height"] / 2) +
                `px;"><div><img id=theCentralPhotoIMG src="https://www.wikitree.com` +
                theCentralPersonObject.PhotoData["url"] +
                `" ></img></div></g>`;

            // photoDiv = `<div  id=photoFor${ancestorObject.ahnNum} class="image-box" style="text-align: center; display:inline-block;"><img src="https://www.wikitree.com/${photoUrl}"></div>`;
            centralPersonDotDY = theCentralPersonObject.PhotoData["height"] / 2;
            extraRadiusForCentralPerson = Math.max(
                theCentralPersonObject.PhotoData["width"],
                theCentralPersonObject.PhotoData["height"] + CirclesView.dotRadius
            );
            SVGcode += photoDiv;
        }

        if (degreeCount[0] == 0) {
            SVGcode += CirclesView.doCircle(rootPerson, 0, 0, centralPersonDotDY); // degree = 0, x = 0, y = centralPersonDotDY (0 or a bit down underneath photo)
        }

        condLog({ extraRadiusForCentralPerson });

        for (let person of CirclesView.currentSortedMap.values()) {
            const degree = person.Meta.Degrees;
            if (degree == 0) {
                currentRadiusMultipler = 0;
            }
            // condLog("degree", degree, "currentDegree", currentDegree);
            if (degree > currentDegree) {
                currentRadiusMultipler += radiusMultipler;
                if (degree == 1) {
                    currentRadiusMultipler = Math.max(currentRadiusMultipler, extraRadiusForCentralPerson);
                    condLog("CC1 currentRadiusMultipler:", currentRadiusMultipler);
                }
                if (degree == 2 && degreeCount[1] == 0) {
                    currentRadiusMultipler = Math.max(currentRadiusMultipler, extraRadiusForCentralPerson);
                    condLog("CC2 may have some  people, but CC1 had NO BODY !!!!  YIKES !!!!");
                }
                // condLog("currentRadiusMultipler", currentRadiusMultipler);
                currentDegree = degree;
                let regPolyRadius =
                    (fNameMultiplierFactor * 2 * CirclesView.dotRadius) / (2 * Math.sin(Math.PI / degreeCount[degree]));
                condLog({ degree }, { regPolyRadius });
                if (regPolyRadius > currentRadiusMultipler) {
                    // this means that at this radius, the circles are going to be overcrowded, on top of each other
                    if (regPolyRadius - currentRadiusMultipler < CirclesView.dotRadius) {
                        // if the distance between the current radius, and the ideal regular Polygon radius is less than a dotRadius
                        // then ... just go with the slightly larger radius to fit everyone in
                        currentRadiusMultipler = regPolyRadius;
                        desiredNumThisRing = degreeCount[degree];
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
                            totalCirclesAndCounting[r] = totalCirclesAndCounting[r - 1] + nextMaxNumSides;
                        }
                        condLog({ maxCirclesPerRing });
                        condLog({ totalCirclesAndCounting });
                        condLog({ r });
                        if (totalCirclesAndCounting[r - 2] >= degreeCount[degree]) {
                            condLog(
                                "We can SCALE back a ring - don't need them all because the outer ones grow exponentially!!!!"
                            );
                        } else {
                            condLog("We need all " + r + " rings of power.");
                        }
                        // OK ... need to SCALE the maxCirclesPerRing to divide them equally by the same ratio so the crowding looks similar
                        let scaleFactor = degreeCount[degree] / totalCirclesAndCounting[r - 1];
                        numCirclesPerRing = [];
                        let totalNumCirclesCounted = 0;
                        for (r = 0; r < maxCirclesPerRing.length; r++) {
                            numCirclesPerRing[r] = Math.ceil(scaleFactor * maxCirclesPerRing[r]);
                            totalNumCirclesCounted += numCirclesPerRing[r];
                        }
                        condLog("WAS:", numCirclesPerRing[numCirclesPerRing.length - 1]);
                        condLog(
                            { numCirclesPerRing },
                            { totalNumCirclesCounted },
                            "DegreeCount: " + degreeCount[degree]
                        );
                        numCirclesPerRing[numCirclesPerRing.length - 1] += degreeCount[degree] - totalNumCirclesCounted;
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
            let rightAngle = 0 - Math.PI / 2; // forces each ring to start at 12:00 / due North
            let shiftRingStart = (thisRingNum % 2) / 2; // on every other ring, shift the starting node for each ring off half a radius, so that you get a staggered pattern
            // console.log({numInThisRing} ,{shiftRingStart}, {desiredNumThisRing});
            let newX =
                5 * 0 +
                currentRadiusMultipler *
                    Math.cos(((numInThisRing + shiftRingStart) / desiredNumThisRing) * 2 * Math.PI + rightAngle);
            let newY =
                5 * 0 +
                currentRadiusMultipler *
                    Math.sin(((numInThisRing + shiftRingStart) / desiredNumThisRing) * 2 * Math.PI + rightAngle);
            if (degree == 0) {
                newY += centralPersonDotDY;
            }
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
                if (desiredNumThisRing > 0) {
                    currentRadiusMultipler += radiusMultipler - CirclesView.dotRadius + 3;
                    // thisRingNum--;
                }
                condLog(
                    "RING " + currentRingNum + " for CC" + degree,
                    { currentRadiusMultipler },
                    { desiredNumThisRing }
                );
            }
        }

        let totalWidthAllCircles = 2 * (currentRadiusMultipler + radiusMultipler);
        let leftTopAdjustment = -2 * CirclesView.dotRadius;
        condLog(
            "RESIZING BACKGROUND RECT:  ",
            { currentRadiusMultipler },
            { radiusMultipler },
            { totalWidthAllCircles }
        );

        this.checkForDegree1CirclesToRevise();

        document.getElementById("circlesDIV4SVG").innerHTML = SVGcode;
        $("#circlesDIV4SVG").draggable();

        document.getElementById("CirclesBkgd").outerHTML = `<svg id="CirclesBkgd" width="${
            totalWidthAllCircles + leftTopAdjustment
        }" height="${totalWidthAllCircles + leftTopAdjustment}" style='position:absolute; left:${
            -totalWidthAllCircles / 2 - leftTopAdjustment
        }px;  top:${
            -totalWidthAllCircles / 2 - leftTopAdjustment
        }px;'><rect id="CirclesBkgdRect" width="${totalWidthAllCircles}" height="${totalWidthAllCircles}" style="fill:aliceblue;stroke:aliceblue;stroke-width:1;opacity:1"></rect></svg>`;

        document.getElementById("circlesDIV4SVG").style.left = totalWidthAllCircles / 2 + "px";
        document.getElementById("circlesDIV4SVG").style.top = totalWidthAllCircles / 2 + "px";

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

                console.log(CirclesView.PersonCodesObject);
                console.log(CirclesView.theLeafCollection["A0"]);
                console.log(CirclesView.PersonCodesObject[CirclesView.theLeafCollection["A0"].Id]);
            });
        });
    }

    static checkForDegree1CirclesToRevise() {
        condLog("firstDegreeCirclesToRevise", this.firstDegreeCirclesToRevise);
        if (this.firstDegreeCirclesToRevise.length > 0) {
            // REVISIT the degree 1 circles
            for (let f = 0; f < this.firstDegreeCirclesToRevise.length; f++) {
                const fID = this.firstDegreeCirclesToRevise[f];
                const person = CirclesView.currentSortedMap.get(fID);
                if (person) {
                    if (person.Relationship == undefined) {
                        // console.log(
                        //     "CirclesView.doCircle - degree 1 person STILL NOT ready for re-colouring:",
                        //     person.Relationship,
                        //     person.Id,
                        //     person.LongName
                        // );
                    } else {
                        // console.log(
                        //     "FOUND a degree 1 person READY to revise:",
                        //     person.Relationship,
                        //     person.Id,
                        //     person.LongName
                        // );

                        let personCircle = document.getElementById("circlePerson" + fID);
                        if (personCircle) {
                            let personObj = { ellipse: personCircle.children[0], text: personCircle.children[1] };
                            if (personCircle.children[0].tagName != "ellipse") {
                                for (let c = 0; c < personCircle.children.length; c++) {
                                    personObj[personCircle.children[c].tagName] = personCircle.children[c];
                                }
                            }
                            // console.log("Update ", personObj["ellipse"], personObj["text"]);

                            let thisClr = "lawngreen";
                            let textClr = "black";

                            if (
                                person.Relationship &&
                                person.Relationship.full &&
                                (person.Relationship.full == "father" ||
                                    person.Relationship.full == "mother" ||
                                    person.Relationship.full == "parent")
                            ) {
                                thisClr = "gray";
                                textClr = "white";
                            } else if (
                                person.Relationship &&
                                person.Relationship.full &&
                                CirclesView.circlesGrayAncs == true &&
                                (person.Relationship.full.indexOf("father") > -1 ||
                                    person.Relationship.full.indexOf("mother") > -1 ||
                                    person.Relationship.full.indexOf("parent") > -1)
                            ) {
                                thisClr = "gray";
                                textClr = "white";
                            } else if (
                                person.Relationship &&
                                person.Relationship.full &&
                                (person.Relationship.full.indexOf("husband") > -1 ||
                                    person.Relationship.full.indexOf("wife") > -1 ||
                                    person.Relationship.full.indexOf("spouse") > -1)
                            ) {
                                thisClr = "red";
                                textClr = "white";
                            } else if (person.Relationship == "") {
                                thisClr = "red";
                                textClr = "white";
                            } else if (
                                person.Relationship &&
                                person.Relationship.full &&
                                (person.Relationship.full.indexOf("brother") > -1 ||
                                    person.Relationship.full.indexOf("sister") > -1 ||
                                    person.Relationship.full.indexOf("sibling") > -1)
                            ) {
                                thisClr = "blue";
                                textClr = "white";
                            }

                            personObj["ellipse"].setAttribute("fill", thisClr);
                            personObj["text"].setAttribute("style", "font-size:14; fill:" + textClr);
                        } else {
                            console.log("Could not find the circle for this person:", person.Id);
                        }

                        this.firstDegreeCirclesToRevise.splice(f, 1);
                    }
                }
            }
        }
    }
}
