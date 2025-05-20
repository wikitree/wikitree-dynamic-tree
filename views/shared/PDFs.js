export class PDFs {
    // Base64 strings for GENDER Icons - to be used in the Fractal Tree (and other Tree Apps) when generating PDFs and other images are unloadable
    static maleGIFbase64string =
        "data:image/png;base64,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";
    static femaleGIFbase64string =
        "data:image/png;base64,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";
    static nogenderGIFbase64string =
        "data:image/png;base64,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";

    static thisPDFlinesArray = [];
    static thisPDFtextArray = [];
    static thisPDFrectArray = [];
    static thisPDFroundedRectArray = [];
    static thisPDFimageArray = [];

    static thisPDFminX = 0;
    static thisPDFminY = 0;
    static thisPDFmaxX = 0;
    static thisPDFmaxY = 0;
    static thisPDFwidth = 0;
    static thisPDFheight = 0;
    static thisPDFmargin = 20;

    static currentPDFsettings = {
        thisDX: 0,
        thisDY: 0,
        thisStroke: "black",
        thisStrokeRGB: [0, 0, 0],
        thisStrokeWidth: 1,
        thisFontSize: 18,
        thisFont: "helvetica", // helvetica, times, courier, symbol, zapfdingbats
        thisFontStyle: "normal", // normal , bold, italic, bolditalic
    };

    static hex2array(hexString) {
        let trans = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        let theRGBarray = [0, 0, 0];
        if (hexString.length == 7) {
            theRGBarray = [
                16 * trans.indexOf(hexString.substr(1, 1)) + trans.indexOf(hexString.substr(2, 1)),
                16 * trans.indexOf(hexString.substr(3, 1)) + trans.indexOf(hexString.substr(4, 1)),
                16 * trans.indexOf(hexString.substr(5, 1)) + trans.indexOf(hexString.substr(6, 1)),
            ];
        } else {
            if (hexString.length == 4) {
                theRGBarray = [
                    16 * trans.indexOf(hexString.substr(1, 1)) + trans.indexOf(hexString.substr(1, 1)),
                    16 * trans.indexOf(hexString.substr(2, 1)) + trans.indexOf(hexString.substr(2, 1)),
                    16 * trans.indexOf(hexString.substr(3, 1)) + trans.indexOf(hexString.substr(3, 1)),
                ];
            } else {
                console.error("hexString must be 7 characters long");
                return [0, 0, 0];
            }
        }
        return theRGBarray;
    }

    static convertColourNameToRGB(colourName) {
        let thisRGB = [0, 0, 0];
        if (colourName[0] == "#") {
            return this.hex2array(colourName);
        }

        if (colourName == "black") {
            thisRGB = [0, 0, 0];
        } else if (colourName == "red") {
            thisRGB = [255, 0, 0];
        } else if (colourName == "green") {
            thisRGB = [0, 255, 0];
        } else if (colourName == "blue") {
            thisRGB = [0, 0, 255];
        } else if (colourName == "yellow") {
            thisRGB = [255, 255, 0];
        } else if (colourName == "cyan") {
            thisRGB = [0, 255, 255];
        } else if (colourName == "magenta") {
            thisRGB = [255, 0, 255];
        } else if (colourName == "white") {
            thisRGB = [255, 255, 255];
        } else if (colourName == "grey") {
            thisRGB = [128, 128, 128];
        } else if (colourName == "gray") {
            thisRGB = [128, 128, 128];
        } else if (colourName == "darkgrey") {
            thisRGB = [169, 169, 169];
        } else if (colourName == "darkgray") {
            thisRGB = [169, 169, 169];
        } else if (colourName == "lightgrey") {
            thisRGB = [211, 211, 211];
        } else if (colourName == "lightgray") {
            thisRGB = [211, 211, 211];
        } else if (colourName == "darkblue") {
            thisRGB = [0, 0, 139];
        } else if (colourName == "darkred") {
            thisRGB = [139, 0, 0];
        } else if (colourName == "darkgreen") {
            thisRGB = [0, 100, 0];
        } else if (colourName == "darkcyan") {
            thisRGB = [0, 139, 139];
        } else if (colourName == "darkmagenta") {
            thisRGB = [139, 0, 139];
        } else if (colourName == "darkyellow") {
            thisRGB = [255, 215, 0];
        } else if (colourName == "darkorange") {
            thisRGB = [255, 140, 0];
        } else if (colourName == "darkviolet") {
            thisRGB = [148, 0, 211];
        } else if (colourName == "darkpink") {
            thisRGB = [255, 20, 147];
        } else if (colourName == "darkgoldenrod") {
            thisRGB = [184, 134, 11];
        }
        return thisRGB;
    }

    static getTranslationCoordinates(thisObject) {
        let thisTransform = thisObject.getAttribute("transform");
        let thisDX = 0;
        let thisDY = 0;
        if (thisTransform && thisTransform.indexOf("translate") > -1) {
            let thisDXDY = thisTransform
                .substring(
                    thisTransform.indexOf("translate(") + 10,
                    thisTransform.indexOf(")", thisTransform.indexOf("translate("))
                )
                .split(",");
            thisDX = parseInt(thisDXDY[0]);
            thisDY = parseInt(thisDXDY[1]);
        }
        return [thisDX, thisDY];
    }

    static getValueFromStyleString(style, styleName) {
        let styleString = "" + style;
        let thisValue = styleString.substring(
            styleString.indexOf(styleName + ":") + styleName.length + 1,
            styleString.indexOf(";", styleString.indexOf(styleName + ":"))
        );
        thisValue = thisValue.trim();
        return thisValue;
    }

    // function to parse a LineElement into its component pieces, then add it to the PDFlineArray
    static addLineToPDF(lineElement) {
        let thisDX = this.currentPDFsettings.thisDX;
        let thisDY = this.currentPDFsettings.thisDY;
        let thisX1 = parseInt(lineElement.getAttribute("x1"));
        let thisY1 = parseInt(lineElement.getAttribute("y1"));
        let thisX2 = parseInt(lineElement.getAttribute("x2"));
        let thisY2 = parseInt(lineElement.getAttribute("y2"));

        let thisStyle = lineElement.getAttribute("style");
        let thisStroke = thisStyle.substring(thisStyle.indexOf("stroke:") + 7, thisStyle.indexOf(";")).trim();
        let thisStrokeRGB = this.convertColourNameToRGB(thisStroke);
        let thisStrokeWidth = parseInt(
            thisStyle.substring(
                thisStyle.indexOf("stroke-width:") + 13,
                thisStyle.indexOf(";", thisStyle.indexOf("stroke-width:"))
            )
        );

        // console.log({thisStroke}, {thisStrokeWidth});
        if (thisStrokeWidth != this.currentPDFsettings.thisStrokeWidth) {
            // pdf.setLineWidth(thisStrokeWidth);
            this.currentPDFsettings.thisStrokeWidth = thisStrokeWidth;
        }
        if (thisStroke != this.currentPDFsettings.thisStroke) {
            this.currentPDFsettings.thisStroke = thisStroke;
            this.currentPDFsettings.thisStrokeRGB = thisStrokeRGB;
            // pdf.setDrawColor(
            //     this.currentPDFsettings.thisStrokeRGB[0],
            //     this.currentPDFsettings.thisStrokeRGB[1],
            //     this.currentPDFsettings.thisStrokeRGB[2]
            // );
        }

        this.thisPDFlinesArray.push([thisX1, thisY1, thisX2, thisY2, thisStrokeRGB, thisStrokeWidth, "S"]);
        // console.log(thisX1, thisY1, thisX2, thisY2);
    }

    static addLinesToPDF(pdf) {
        // console.log(this.currentPDFsettings);
        // console.log("this.thisPDFlinesArray", this.thisPDFlinesArray);
        for (let index = 0; index < this.thisPDFlinesArray.length; index++) {
            const element = this.thisPDFlinesArray[index];
            if (element[0] == 0 && element[1] == 0 && element[2] == 0 && element[3] == 0) {
                console.log("skipping line", element);
                continue;
            }
            // console.log({element});
            pdf.setDrawColor(element[4][0], element[4][1], element[4][2]);
            pdf.setLineWidth(element[5]);
            // console.log("pdf.line",this.currentPDFsettings.thisDX + element[0], this.currentPDFsettings.thisDY + element[1], this.currentPDFsettings.thisDX + element[2], this.currentPDFsettings.thisDY + element[3],  element[6] );
            pdf.line(
                1.0 * this.currentPDFsettings.thisDX + 1.0 * element[0],
                1.0 * this.currentPDFsettings.thisDY + 1.0 * element[1],
                1.0 * this.currentPDFsettings.thisDX + 1.0 * element[2],
                1.0 * this.currentPDFsettings.thisDY + 1.0 * element[3]
            );
        }
    }

    static addTextsToPDF(pdf) {
        for (let index = 0; index < this.thisPDFtextArray.length; index++) {
            const element = this.thisPDFtextArray[index];
            pdf.setFont(element[3], element[4]);
            pdf.setFontStyle(element[4]);
            pdf.setFontSize(element[5]);

            // console.log(element[6], ": TEXT COLOR", element[6].fill);
            if (element[6].fill && element[6].fillColor) {
                pdf.setTextColor(element[6].fillColor[0], element[6].fillColor[1], element[6].fillColor[2]);
            } else if (element[6].fill) {
                pdf.setTextColor(element[6].fill);
            }
            // console.log(element[0], ":", element[3], element[4]);
            // console.log(element[0], ":", pdf.getTextWidth(element[0]));
            // console.log({ index }, "text Y:", element[2]);
            pdf.text(
                element[0],
                this.currentPDFsettings.thisDX + element[1],
                this.currentPDFsettings.thisDY + element[2],
                element[6] // align  & maxWidth options
            );
        }
    }
    static addRectsToPDF(pdf) {
        for (let index = 0; index < this.thisPDFrectArray.length; index++) {
            const element = this.thisPDFrectArray[index];
            if (element[5].strokeColor) {
                pdf.setDrawColor(element[5].strokeColor);
            }
            if (element[5].fillColor) {
                pdf.setFillColor(element[5].fillColor);
            }
            if (element[5].lineWidth) {
                pdf.setLineWidth(element[5].lineWidth);
            }
            pdf.rect(
                this.currentPDFsettings.thisDX + element[0],
                this.currentPDFsettings.thisDY + element[1],
                element[2],
                element[3],
                element[4]
            );
        }
    }
    static addRoundedRectsToPDF(pdf) {
        for (let index = 0; index < this.thisPDFroundedRectArray.length; index++) {
            const element = this.thisPDFroundedRectArray[index];
            if (element[7].strokeColor) {
                pdf.setDrawColor(element[7].strokeColor);
            }
            if (element[7].fillColor) {
                pdf.setFillColor(element[7].fillColor);
            }
            if (element[7].lineWidth) {
                pdf.setLineWidth(element[7].lineWidth);
            }
            pdf.roundedRect(
                this.currentPDFsettings.thisDX + element[0],
                this.currentPDFsettings.thisDY + element[1],
                element[2],
                element[3],
                element[4],
                element[5],
                element[6]
            );
        }
    }

    static addImagesToPDF(pdf) {
        for (let index = 0; index < this.thisPDFimageArray.length; index++) {
            const element = this.thisPDFimageArray[index];
            // console.log({ index }, "image Y:", element[3]);
            pdf.addImage(
                element[0],
                element[1],
                this.currentPDFsettings.thisDX + element[2],
                this.currentPDFsettings.thisDY + element[3],
                element[4],
                element[5],
                element[6],
                element[7]
            );
        }
    }

    static setPDFfontBasedOnSetting(settingFont, isBold = false) {
        this.currentPDFsettings.thisFontStyle = "normal";
        if (isBold) {
            this.currentPDFsettings.thisFontStyle = "bold";
        }
        if (settingFont == "SansSerif") {
            this.currentPDFsettings.thisFont = "helvetica";
        } else if (settingFont == "Serif") {
            this.currentPDFsettings.thisFont = "times";
        } else if (settingFont == "Mono") {
            this.currentPDFsettings.thisFont = "courier";
        } else if (settingFont == "Fantasy") {
            this.currentPDFsettings.thisFont = "helvetica";
            if (this.currentPDFsettings.thisFontStyle == "bold") {
                this.currentPDFsettings.thisFontStyle = "bolditalic";
            } else {
                this.currentPDFsettings.thisFontStyle = "italic";
            }
        } else if (settingFont == "Script") {
            this.currentPDFsettings.thisFont = "times";
            if (this.currentPDFsettings.thisFontStyle == "bold") {
                this.currentPDFsettings.thisFontStyle = "bolditalic";
            } else {
                this.currentPDFsettings.thisFontStyle = "italic";
            }
        }
    }

    static setPDFsMaxMins(size) {
        // Every chart has at least one line, so start with the first line, and set the max/mins to that
        if (this.thisPDFlinesArray.length > 0) {
            this.thisPDFminX = this.thisPDFlinesArray[0][0];
            this.thisPDFmaxX = this.thisPDFlinesArray[0][0];
            this.thisPDFminY = this.thisPDFlinesArray[0][1];
            this.thisPDFmaxY = this.thisPDFlinesArray[0][1];
        } else if (this.thisPDFroundedRectArray.length > 0) {
            this.thisPDFminX = this.thisPDFroundedRectArray[0][0];
            this.thisPDFmaxX = this.thisPDFroundedRectArray[0][0];
            this.thisPDFminY = this.thisPDFroundedRectArray[0][1];
            this.thisPDFmaxY = this.thisPDFroundedRectArray[0][1];
        }

        for (let index = 0; index < this.thisPDFlinesArray.length; index++) {
            const element = this.thisPDFlinesArray[index];
            // console.log("PDF: line " + index, element[0], element[1], element[2], element[3]);
            this.thisPDFminX = Math.min(this.thisPDFminX, element[0], element[2]);
            this.thisPDFmaxX = Math.max(this.thisPDFmaxX, element[0], element[2]);
            this.thisPDFminY = Math.min(this.thisPDFminY, element[1], element[3]);
            this.thisPDFmaxY = Math.max(this.thisPDFmaxY, element[1], element[3]);
        }
        for (let index = 0; index < this.thisPDFrectArray.length; index++) {
            const element = this.thisPDFrectArray[index];
            // console.log("PDF: rect " + index, element[0], element[1], element[0] + element[2], element[1] + element[3]);
            this.thisPDFminX = Math.min(this.thisPDFminX, element[0]);
            this.thisPDFmaxX = Math.max(this.thisPDFmaxX, element[0] + element[2]);
            this.thisPDFminY = Math.min(this.thisPDFminY, element[1]);
            this.thisPDFmaxY = Math.max(this.thisPDFmaxY, element[1] + element[3]);
        }
        for (let index = 0; index < this.thisPDFroundedRectArray.length; index++) {
            const element = this.thisPDFroundedRectArray[index];
            // console.log("PDF: rrect " + index, element[0], element[1], element[0] + element[2], element[1] + element[3]);
            this.thisPDFminX = Math.min(this.thisPDFminX, element[0]);
            this.thisPDFmaxX = Math.max(this.thisPDFmaxX, element[0] + element[2]);
            this.thisPDFminY = Math.min(this.thisPDFminY, element[1]);
            this.thisPDFmaxY = Math.max(this.thisPDFmaxY, element[1] + element[3]);
        }

        for (let index = 0; index < this.thisPDFtextArray.length; index++) {
            const element = this.thisPDFtextArray[index];
            // console.log("PDF: text " + index, element[0], element[1], element[2], element[3]);
            // console.log("PDF: text " + index, element[1] - 150, element[2], element[1] + 150, element[2] + 21);
            this.thisPDFminX = Math.min(this.thisPDFminX, element[1]);
            this.thisPDFminY = Math.min(this.thisPDFminY, element[2]);
        }

        for (let index = 0; index < this.thisPDFimageArray.length; index++) {
            const element = this.thisPDFimageArray[index];
            // console.log(
            //     "PDF: img " + index,
            //     element[2] - element[4] / 2,
            //     element[3],
            //     element[2] + element[4] / 2,
            //     element[3] + element[5]
            // );
            this.thisPDFminX = Math.min(this.thisPDFminX, element[2] - element[4] / 2);
            this.thisPDFmaxX = Math.max(this.thisPDFmaxX, element[2] + element[4] / 2);
            this.thisPDFminY = Math.min(this.thisPDFminY, element[3]);
            this.thisPDFmaxY = Math.max(this.thisPDFmaxY, element[3] + element[5]);
        }
    }

    static setPDFsizes(tmpPDF) {
        this.setPDFsMaxMins();

        this.addHeaderFooterToPDF(tmpPDF);

        this.thisPDFwidth = this.thisPDFmaxX - this.thisPDFminX + 2 * this.thisPDFmargin;
        this.thisPDFheight = this.thisPDFmaxY - this.thisPDFminY + 2 * this.thisPDFmargin;

        this.currentPDFsettings.thisDX = 0 - (this.thisPDFminX - this.thisPDFmargin);
        this.currentPDFsettings.thisDY = 0 - (this.thisPDFminY - this.thisPDFmargin);
    }

    static addHeaderFooterToPDF(tmpPDF) {
        let thisTitle = document.getElementById("PDFtitleText").value;
        let thisFooter = document.getElementById("PDFfooterText").value;
        let thisURL = window.location.href; //            "https://www.wikitree.com/apps/#name=" + FractalView.myAhnentafel.primaryPerson.getName() + "&view=fractal";
        let thisShowTitle = document.getElementById("PDFshowTitleCheckbox").checked;
        let thisShowFooter = document.getElementById("PDFshowFooterCheckbox").checked;
        let thisShowURL = document.getElementById("PDFshowURLCheckbox").checked;

        if (thisShowTitle) {
            // this.thisPDFtextArray.push([thisTitle, 0, 0, this.currentPDFsettings.thisFont, this.currentPDFsettings.thisFontStyle, this.currentPDFsettings.thisFontSize * 1.5, "center"]);
            this.thisPDFminY -= 50;

            let thisFontSize = 24;
            tmpPDF.setFontSize(thisFontSize);
            while (tmpPDF.getTextWidth(thisTitle) + 4 >= this.thisPDFmaxX - this.thisPDFminX && thisFontSize > 5) {
                thisFontSize -= 1;
                tmpPDF.setFontSize(thisFontSize);
            }
            thisFontSize = Math.max(thisFontSize, 5);

            this.thisPDFtextArray.push([
                thisTitle,
                (this.thisPDFminX + this.thisPDFmaxX) / 2,
                this.thisPDFminY + 20,
                "helvetica",
                "bold",
                thisFontSize,
                { align: "center", fill: "black", fillColor: [0, 0, 0] },
            ]);
            console.log("PDF: text title", this.thisPDFminX, this.thisPDFminY + 20, { thisFontSize });
        }
        if (thisShowFooter) {
            this.thisPDFmaxY += 40;

            let thisFontSize = 12;
            tmpPDF.setFontSize(thisFontSize);
            while (tmpPDF.getTextWidth(thisFooter) + 4 >= this.thisPDFmaxX - this.thisPDFminX && thisFontSize > 5) {
                thisFontSize -= 1;
                tmpPDF.setFontSize(thisFontSize);
            }
            thisFontSize = Math.max(thisFontSize, 5);

            this.thisPDFtextArray.push([
                thisFooter,
                (this.thisPDFminX + this.thisPDFmaxX) / 2,
                this.thisPDFmaxY,
                "helvetica",
                "italic",
                thisFontSize,
                { align: "center", fill: "black" },
            ]);
            console.log(
                "PDF: text footer",
                this.thisPDFminX,
                this.thisPDFmaxY,
                this.thisPDFmaxX,
                this.thisPDFmaxY + 10 + 21,
                { thisFontSize }
            );
            this.thisPDFmaxY += 10;
        }
        if (thisShowURL) {
            // this.thisPDFtextArray.push([thisURL, 0, this.thisPDFheight - 20, this.currentPDFsettings.thisFont, this.currentPDFsettings.thisFontStyle, this.currentPDFsettings.thisFontSize * 1.5, {align:"center", fill:"black"},"}]);
            this.thisPDFmaxY += 5;

            let thisFontSize = 10;
            tmpPDF.setFontSize(thisFontSize);
            while (tmpPDF.getTextWidth(thisURL) + 4 >= this.thisPDFmaxX - this.thisPDFminX && thisFontSize > 4) {
                thisFontSize -= 1;
                tmpPDF.setFontSize(thisFontSize);
            }
            thisFontSize = Math.max(thisFontSize, 4);

            this.thisPDFtextArray.push([
                thisURL,
                (this.thisPDFminX + this.thisPDFmaxX) / 2,
                this.thisPDFmaxY,
                "helvetica",
                "normal",
                thisFontSize,
                { align: "center", fill: "black" },
            ]);
            console.log(
                "PDF: text URL",
                this.thisPDFminX,
                this.thisPDFmaxY,
                this.thisPDFmaxX,
                this.thisPDFmaxY + 10 + 21,
                { thisFontSize }
            );
            this.thisPDFmaxY += 10;
        }
    }

    static months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    static datetimestamp() {
        var d = new Date();
        var time = [this.pad(d.getHours()), this.pad(d.getMinutes()), this.pad(d.getSeconds())].join("");
        return [d.getFullYear(), this.months[d.getMonth()], d.getDate(), time].join("-");
    }

    static pad(n) {
        return n < 10 ? "0" + n.toString(10) : n.toString(10);
    }

    static async setupWaitForBase64Image(imageObj) {
        let thisImage;
        if (imageObj.src > "" && imageObj.width > 0 && imageObj.height > 0) {
            console.log("imageObj.src", imageObj.src, "WIDTH & HEIGHT");
            thisImage = new Image(imageObj.width, imageObj.height);
            thisImage.crossOrigin = "use-credentials";
            thisImage.src = imageObj.src;
        } else if (imageObj.src > "" && imageObj.width > 0) {
            thisImage = new Image(imageObj.width);
            thisImage.crossOrigin = "use-credentials";
            thisImage.src = imageObj.src;
        } else if (imageObj.src > "") {
            thisImage = new Image();
            thisImage.crossOrigin = "use-credentials";
            thisImage.src = imageObj.src;
        }

        if (imageObj.src > "") {
            return new Promise((resolve, reject) => {
                thisImage.onload = function () {
                    const base64String = PDFs.getBase64Image(thisImage);
                    // console.log(base64String);
                    resolve(base64String);
                };

                thisImage.onerror = function () {
                    // if (imageObj.index % 2 == 0) {
                    // reject(new Error("Failed to load this silly image"));
                    let thisGender = "unknown";
                    if (wtViewRegistry.currentView.id == "fractal") {
                        if (imageObj.ahnNum == 1) {
                            thisGender = FractalView.myAhnentafel.primaryPerson.getGender();
                        } else if (imageObj.ahnNum % 2 == 0) {
                            thisGender = "Male"; //resolve(this.maleGIFbase64string);
                        } else if (imageObj.ahnNum % 2 == 1) {
                            thisGender = "Female"; //resolve(this.femaleGIFbase64string);
                        } else {
                            thisGender = "unknown"; //resolve(this.nogenderGIFbase64string);
                        }
                    } else if (wtViewRegistry.currentView.id == "superbig") {
                        thisGender = SuperBigFamView.myAhnentafel.primaryPerson.getGender();
                    } else {
                        thisGender = rootPerson.Gender;
                    }

                    console.log("ON ERROR : thisGender", thisGender);
                    if (thisGender == "Male") {
                        // console.log("ON ERROR : maleGIFbase64string", maleGIFbase64string);
                        // console.log("ON ERROR : this.maleGIFbase64string", this.maleGIFbase64string);
                        console.log("ON ERROR : PDFs.maleGIFbase64string", PDFs.maleGIFbase64string);
                        resolve(PDFs.maleGIFbase64string);
                    } else if (thisGender == "Female") {
                        resolve(PDFs.femaleGIFbase64string);
                    } else {
                        resolve(PDFs.nogenderGIFbase64string);
                    }
                };
            });
        } else {
            return "NO IMG SRC";
        }
    }

    static getBase64Image(img) {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL("image/png");
        return dataURL;
    }
}
