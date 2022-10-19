/*
 * The WikiTree Dynamic Tree Viewer itself uses the D3.js library to render the graph.
 * Ancestor Webs uses the D3 function for zooming and panning, but customizes the positioning of each leaf in the tree.
 
* There is a Button Bar TABLE at the top of the container, 
 * then the SVG graphic is below that.
 * 
 * The FIRST chunk of code in the SVG graphic are the <line> objects for the connectors of the Ancestor Webs,
 * each with a unique ID of wedgeAnB, where A = generation #, and B = position # within that generation, counting from far left, clockwise
 * 
 * The SECOND chunk in the SVG graphic are the individual people in the Ancestor Webs, created by the Nodes and the d3 deep magic
 * they are each basically at the end of the day a <g class"person ancestor" transformed object with a translation from 0,0 ></g>
 * 
 * The Button Bar does not resize, but has clickable elements, which set global variables in the WebsView, then calls a redraw
 */
(function () {
    var originOffsetX = 500,
        originOffsetY = 300,
        boxWidth = 200 * 2,
        boxHeight = 50,
        nodeWidth = boxWidth * 1.5,
        nodeHeight = boxHeight * 2,
        vertSpacing = 60;

    /**
     * Constructor
     */
    var WebsView = (window.WebsView = function () {
        Object.assign(this, this?.meta());
    });

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
    var numRepeatAncestors = 0;
    var repeatAncestorTracker = new Object();

    // STATIC VARIABLES --> USED to store variables used to customize the current display of the Ancestor Webs

    /** Static variable to hold unique ids for private persons **/
    WebsView.nextPrivateId = -1;

    /** Static variable to hold the Maximum Angle for the Ancestor Webs (360 full circle / 240 partial / 180 semicircle)   **/
    WebsView.maxAngle = 240;
    WebsView.lastAngle = 240;

    /** Static variables to hold the state of the Number of Generations to be displayed, currently and previously  **/
    WebsView.numGens2Display = 3;
    WebsView.lastNumGens = 3;
    WebsView.numGensRetrieved = 3;
    WebsView.maxNumGens = 10;
    WebsView.workingMaxNumGens = 4;
    WebsView.maxDiamPerGen = []; // used to store the diameter of the spokes for the Ancestor Webs

    /** Object to hold the Ahnentafel table for the current primary individual   */
    WebsView.myAhnentafel = new AhnenTafel.Ahnentafel();

    /** Object to hold the Ancestors as they are returned from the getAncestors API call    */
    WebsView.theAncestors = [];

    WebsView.prototype.meta = function () {
        return {
            title: "Ancestor Webs",
            description: "Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.",
            docs: "https://www.WikiTree.com/wiki/Dynamic_Tree",
        };
    };

    WebsView.prototype.init = function (selector, startId) {
        // console.log("WebsView.js - line:18", selector) ;
        var container = document.querySelector(selector),
            width = container.offsetWidth,
            height = container.offsetHeight;

        var self = this;

        // Setup zoom and pan
        var zoom = d3.behavior
            .zoom()
            .scaleExtent([0.1, 1])
            .on("zoom", function () {
                svg.attr("transform", "translate(" + d3.event.translate + ") scale(" + d3.event.scale + ")");
            })
            // Offset so that first pan and zoom does not jump back to the origin
            // .translate([originOffsetX, originOffsetY]); // SWITCHING to trying half the width and height to centre it better
            .translate([width / 2, height / 2]);

        // Setup the Button Bar --> Initial version will use mostly text links, but should be replaced with icons - ideally images that have a highlighted / unhighlighted version, where appropriate
        var btnBarHTML =
            '<table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%">' +
            "&nbsp;" +
            //  '<A onclick="WebsView.maxAngle = 360; WebsView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan360.png" /></A> |' +
            //  ' <A onclick="WebsView.maxAngle = 240; WebsView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan240.png" /></A> |' +
            //  ' <A onclick="WebsView.maxAngle = 180; WebsView.redraw();"><img height=20px src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></A></td>' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="center">' +
            ' <A onclick="WebsView.numGens2Display -=1; WebsView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>3</span> generations ]" +
            ' <A onclick="WebsView.numGens2Display +=1; WebsView.redraw();"> +1 </A> ' +
            "</td>" +
            '<td width="5%">&nbsp;</td>' +
            '<td width="30%" align="right"> &#x1F4BE; | <font size=+2>&#x2699;</font></td>' +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;">Please wait while initial Ancestor Webs is loading ...</DIV>';

        // Before doing ANYTHING ELSE --> populate the container DIV with the Button Bar HTML code so that it will always be at the top of the window and non-changing in size / location
        container.innerHTML = btnBarHTML;

        // CREATE the SVG object (which will be placed immediately under the button bar)
        var svg = d3
            .select(container)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .call(zoom)
            .append("g")
            // Left padding of tree; TODO: find a better way
            // .attr("transform", "translate(" + originOffsetX + "," + originOffsetY + ")");
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        // console.log("creating SVG object and setting up ancestor tree object")
        // Setup controllers for the ancestor tree which will be displayed as the Ancestor Webs
        self.ancestorTree = new AncestorTree(svg);

        // Listen to tree events --> NOT NEEDED ANYMORE without the PLUS SIGNS (holdover from original Dynamic Tree version)
        // self.ancestorTree.expand(function (person) {
        //     return self.loadMore(person);
        // });

        // Setup pattern
        svg.append("defs")
            .append("pattern")
            .attr({
                id: "loader",
                width: 20,
                height: 20,
            })
            .append("image")
            .attr({
                width: 20,
                height: 20,
                //'xlink:href': 'ringLoader.svg'
            });

        /*
            CREATE the Ancestor Webs Backdrop 
            * Made of Lines connecting two ancestors together
            
        */

        for (let index = 0; index < 2 ** WebsView.maxNumGens; index++) {
            // Create  Empty Lines, hidden, to be used later
            // One to the person's Pa (Father) and the other to their Ma (Mother)
            svg.append("line").attr({
                id: "lineForPerson" + index + "Pa",
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: black; stroke-width: 1;",
            });
            svg.append("line").attr({
                id: "lineForPerson" + index + "Ma",
                display: "none",
                x1: 0,
                y1: 0,
                x2: 0,
                y2: 0,
                style: "stroke: black; stroke-width: 1;",
            });
        }

        self.load(startId);
    };

    WebsView.drawLines = function () {
        // console.log("DRAWING LINES stuff should go here");
        let numSpotsMaxGen = 2 ** (WebsView.numGens2Display - 1);
        for (let thisGenNum = 0; thisGenNum < WebsView.numGens2Display - 1; thisGenNum++) {
            let numSpotsThisGen = 2 ** thisGenNum;
            let numSpotsNextGen = 2 * numSpotsThisGen;
            let nextGenNum = thisGenNum + 1;

            for (let thisPosNum = 0; thisPosNum < numSpotsThisGen; thisPosNum++) {
                let index = 2 ** thisGenNum + thisPosNum;
                const elementPa = document.getElementById("lineForPerson" + index + "Pa");
                if (elementPa) {
                    if (WebsView.myAhnentafel.list[2 * index] && thePeopleList[WebsView.myAhnentafel.list[2 * index]]) {
                        elementPa.setAttribute("display", "block");
                    } else {
                        elementPa.setAttribute("display", "none");
                    }
                }

                const elementMa = document.getElementById("lineForPerson" + index + "Ma");
                if (elementMa) {
                    if (
                        WebsView.myAhnentafel.list[2 * index + 1] &&
                        thePeopleList[WebsView.myAhnentafel.list[2 * index + 1]]
                    ) {
                        elementMa.setAttribute("display", "block");
                    } else {
                        elementMa.setAttribute("display", "none");
                    }
                }

                let X = 0 - numSpotsThisGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsThisGen;
                X = 0 - numSpotsMaxGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;

                let dX = (((numSpotsThisGen - 1) / numSpotsThisGen) * vertSpacing * numSpotsMaxGen) / 2;
                X = 0 - dX + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;

                let Y = vertSpacing * thisGenNum;

                let dX2 = (((numSpotsNextGen - 1) / numSpotsNextGen) * vertSpacing * numSpotsMaxGen) / 2;
                let dX4 = vertSpacing * 2 ** (WebsView.numGens2Display - 2 - thisGenNum);
                let dX3 = 2 * dX4; //((numSpotsNextGen - 1) / numSpotsNextGen ) * vertSpacing * numSpotsMaxGen / 2;

                let Xpa =
                    0 - numSpotsNextGen * 20 + ((thisPosNum * 2) / numSpotsNextGen) * vertSpacing * numSpotsNextGen;
                Xpa = 0 - dX2 + thisPosNum * dX3;
                let Ypa = vertSpacing * nextGenNum;

                let Xma =
                    0 - numSpotsNextGen * 20 + ((thisPosNum * 2 + 1) / numSpotsNextGen) * vertSpacing * numSpotsNextGen;
                Xma = Xpa + dX4; //0 - dX +  ((thisPosNum * 2 + 1) / numSpotsNextGen ) * vertSpacing * numSpotsNextGen;
                let Yma = vertSpacing * nextGenNum;

                elementPa.setAttribute("x1", X);
                elementPa.setAttribute("y1", Y);
                elementPa.setAttribute("x2", Xpa);
                elementPa.setAttribute("y2", Ypa);

                elementMa.setAttribute("x1", X);
                elementMa.setAttribute("y1", Y);
                elementMa.setAttribute("x2", Xma);
                elementMa.setAttribute("y2", Yma);

                // let i = index;
                // let j = i*2;
                // let k = i*2 + 1;

                // for (let g = 1; g <= thisGenNum + 1; g++ ) {
                // 	if (g % 2 == 1) {
                //         if (g <= thisGenNum) {
                //             X += 0 + (i & (2**(thisGenNum - g)) )/((2**(thisGenNum - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
                //         }

                // 		Xj += 0 + (j & (2**(thisGenNum + 1 - g)) )/((2**(thisGenNum + 1 - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
                // 		Xk += 0 + (k & (2**(thisGenNum + 1 - g)) )/((2**(thisGenNum + 1 - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
                // 		// console.log(i, g, Math.floor(g/2) , WebsView.maxDiamPerGen[g] , "X",X);

                // 	} else   {
                //         if (g <= thisGenNum) {
                // 		    Y += 0 + (i & (2**(thisGenNum - g)) )/((2**(thisGenNum - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
                //         }
                // 		Yj += 0 + (j & (2**(thisGenNum + 1 - g)) )/((2**(thisGenNum + 1 - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
                // 		Yk += 0 + (k & (2**(thisGenNum + 1 - g)) )/((2**(thisGenNum + 1 - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
                // 		// console.log(i, g, Math.floor(g/2) , WebsView.maxDiamPerGen[g] , "Y",Y);
                // 	}
            }
        }
        for (let index = 2 ** (WebsView.numGens2Display - 1); index < 2 ** (WebsView.maxNumGens - 1); index++) {
            const elementPa = document.getElementById("lineForPerson" + index + "Pa");
            if (elementPa) {
                elementPa.setAttribute("display", "none");
            }
            const elementMa = document.getElementById("lineForPerson" + index + "Ma");
            if (elementMa) {
                elementMa.setAttribute("display", "none");
            }
        }
    };

    // Flash a message in the WarningMessageBelowButtonBar DIV
    function flashWarningMessageBelowButtonBar(theMessage) {
        // console.log(theMessage);
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
        if (WebsView.numGens2Display < 1) {
            WebsView.numGens2Display = 1;
            showTemporaryMessageBelowButtonBar("1 is the minimum number of generations you can display.");
        } else if (WebsView.numGens2Display > WebsView.workingMaxNumGens) {
            WebsView.numGens2Display = WebsView.workingMaxNumGens;
            if (WebsView.workingMaxNumGens < WebsView.maxNumGens) {
                flashWarningMessageBelowButtonBar(
                    "Cannot load next generation until the current one is fully processed. <BR>Please wait until this message disappears."
                );
            } else {
                showTemporaryMessageBelowButtonBar(
                    WebsView.maxNumGens + " is the maximum number of generations you can display."
                );
            }
        }

        var numGensSpan = document.querySelector("#numGensInBBar");
        numGensSpan.textContent = WebsView.numGens2Display;
        // console.log("numGensSpan:", numGensSpan);
        if (WebsView.numGens2Display > WebsView.numGensRetrieved) {
            loadAncestorsAtLevel(WebsView.numGens2Display);
            WebsView.numGensRetrieved = WebsView.numGens2Display;
        }
    }

    function loadAncestorsAtLevel(newLevel) {
        console.log("Need to load MORE peeps from Generation ", newLevel);
        let theListOfIDs = WebsView.myAhnentafel.listOfAncestorsToBeLoadedForLevel(newLevel);
        // console.log(theListOfIDs);
        if (theListOfIDs.length == 0) {
            // console.log("WARNING WARNING - DANGER DANGER WILL ROBINSONS")
            clearMessageBelowButtonBar();
            WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
            WebsView.numGensRetrieved++;
            WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);
        } else {
            WikiTreeAPI.getRelatives(
                theListOfIDs,
                [
                    "Id",
                    "Derived.BirthName",
                    "Derived.BirthNamePrivate",
                    "FirstName",
                    "MiddleInitial",
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
                ],
                { getParents: true }
            ).then(function (result) {
                if (result) {
                    // need to put in the test ... in case we get a null result, which we will eventually at the end of the line
                    WebsView.theAncestors = result;
                    console.log("theAncestors:", WebsView.theAncestors);
                    // console.log("person with which to drawTree:", person);
                    for (let index = 0; index < WebsView.theAncestors.length; index++) {
                        thePeopleList.add(WebsView.theAncestors[index].person);
                    }
                    WebsView.myAhnentafel.update(); // update the AhnenTafel with the latest ancestors
                    WebsView.workingMaxNumGens = Math.min(WebsView.maxNumGens, WebsView.numGensRetrieved + 1);

                    clearMessageBelowButtonBar();
                }
            });
        }
    }
    // Redraw the Wedges if needed for the Ancestor Webs
    function redoWedgesForFanChart() {
        // console.log("TIme to RE-WEDGIFY !", this, WebsView);

        if (WebsView.lastAngle != WebsView.maxAngle || WebsView.lastNumGens != WebsView.numGens2Display) {
            // ONLY REDO the WEDGES IFF the maxAngle has changed (360 to 240 to 180 or some combo like that)
            for (let genIndex = WebsView.numGens2Display - 1; genIndex >= 0; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    let SVGcode = "";
                    if (genIndex <= 1) {
                        SVGcode = SVGfunctions.getSVGforSector(
                            0,
                            0,
                            270 * (genIndex + 0.5),
                            (180 - WebsView.maxAngle) / 2 + 90 + 90 + (index * WebsView.maxAngle) / 2 ** genIndex,
                            (180 - WebsView.maxAngle) / 2 + 90 + 90 + ((index + 1) * WebsView.maxAngle) / 2 ** genIndex,
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
                            (180 - WebsView.maxAngle) / 2 + 90 + 90 + (index * WebsView.maxAngle) / 2 ** genIndex,
                            (180 - WebsView.maxAngle) / 2 + 90 + 90 + ((index + 1) * WebsView.maxAngle) / 2 ** genIndex,
                            "wedge" + 2 ** genIndex + "n" + index,
                            "black",
                            2,
                            "white"
                        );
                    }

                    //  console.log(SVGcode.id);
                    d3.select("#" + SVGcode.id).attr({ d: SVGcode.d, display: "block" }); // CHANGE the drawing commands to adjust the wedge shape ("d"), and make sure the wedge is visible ("display:block")

                    let theWedge = d3.select("#" + SVGcode.id);
                    //  console.log( "theWedge:",theWedge[0][0] );
                }
            }
            // HIDE all the unused Wedges in the outer rims that we don't need yet
            for (let genIndex = WebsView.maxNumGens - 1; genIndex > WebsView.numGens2Display - 1; genIndex--) {
                for (let index = 0; index < 2 ** genIndex; index++) {
                    d3.select("#" + "wedge" + 2 ** genIndex + "n" + index).attr({ display: "none" });
                }
            }
            WebsView.lastAngle = WebsView.maxAngle;
            WebsView.lastNumGens = WebsView.numGens2Display;
        }
    }

    /** FUNCTION used to force a redraw of the Ancestor Webs, used when called from Button Bar after a parameter has been changed */

    WebsView.redraw = function () {
        // console.log("WebsView.redraw");
        // console.log("Now theAncestors = ", WebsView.theAncestors);
        // thePeopleList.listAll();
        recalcAndDisplayNumGens();
        redoWedgesForFanChart();
        WebsView.myAncestorTree.draw();
    };

    /**
     * Load and display a person
     */
    WebsView.prototype.load = function (id) {
        // console.log("WebsView.prototype.load");
        var self = this;
        self._load(id).then(function (person) {
            // console.log("WebsView.prototype.load : self._load(id) ");
            person._data.AhnNum = 1;
            thePeopleList.add(person);
            thePeopleList.listAll();

            if (person.children && person.children.length > 0) {
                for (let index = 0; index < person.children.length; index++) {
                    // console.log(".load person Child # " + index, person.children[index]);
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
                // console.log("Did not go through KIDS loop: ", person, person.depth);
            }
            // console.log(".load person:",person);

            WikiTreeAPI.getAncestors(id, 3, [
                "Id",
                "Derived.BirthName",
                "Derived.BirthNamePrivate",
                "FirstName",
                "MiddleInitial",
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
            ]).then(function (result) {
                WebsView.theAncestors = result;
                console.log("theAncestors:", WebsView.theAncestors);
                console.log("person with which to drawTree:", person);
                for (let index = 0; index < WebsView.theAncestors.length; index++) {
                    const element = WebsView.theAncestors[index];
                    thePeopleList.add(WebsView.theAncestors[index]);
                }
                WebsView.myAhnentafel.update(person);
                self.drawTree(person);
                clearMessageBelowButtonBar();
            });
        });
    };

    /**
     * Load more ancestors. Update existing data in place
     */
    WebsView.prototype.loadMore = function (oldPerson) {
        var self = this;
        // console.log("loadMore - line:94", oldPerson) ;
        return self._load(oldPerson.getId()).then(function (newPerson) {
            var mother = newPerson.getMother(),
                father = newPerson.getFather();

            if (mother) {
                // console.log("mother:", mother);
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
    WebsView.prototype._load = function (id) {
        // console.log("INITIAL _load - line:118", id) ;
        let thePersonObject = WikiTreeAPI.getPerson(id, [
            "Id",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "FirstName",
            "MiddleInitial",
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
        ]);
        // console.log("_load PersonObj:",thePersonObject);
        return thePersonObject;
    };

    /**
     * Draw/redraw the tree
     */
    WebsView.prototype.drawTree = function (data) {
        console.log("WebsView.prototype.drawTree");

        if (data) {
            // console.log("(WebsView.prototype.drawTree WITH data !)");
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
        // console.log("Create TREE var");
        this.svg = svg;
        this.root = null;
        this.selector = selector;
        this.direction = typeof direction === "undefined" ? 1 : direction;

        this._expand = function () {
            return $.Deferred().resolve().promise();
        };

        this.tree = d3.layout
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
        this.tree.children(fn);
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
        console.log("Tree.prototype.draw");
        if (this.root) {
            // var nodes = thePeopleList.listAllPersons();// [];//this.tree.nodes(this.root);
            var nodes = WebsView.myAhnentafel.listOfAncestorsForFanChart(WebsView.numGens2Display); // [];//this.tree.nodes(this.root);
            var links = this.tree.links(nodes);
            console.log("Tree.prototype.draw -> ready the NODES , count = ", nodes.length);

            WebsView.maxDiamPerGen = [];
            let widestBox = 200;
            let theBlobBuffer = 20;

            for (let i = 0; i <= WebsView.numGens2Display; i++) {
                WebsView.maxDiamPerGen[i] =
                    2 ** Math.ceil((WebsView.numGens2Display - i) / 2) *
                    (((2 + (i % 2)) * widestBox) / 3 + theBlobBuffer);
            }

            console.log("maxDiamPerGen", WebsView.maxDiamPerGen);
            // links = this.tree.links(nodes);

            WebsView.drawLines();
            // this.drawLinks(links);
            this.drawNodes(nodes);
        } else {
            throw new Error("Missing root");
        }
        return this;
    };

    /**
     * Draw/redraw the connecting lines
     */
    Tree.prototype.drawLinks = function (links) {
        var self = this;
        console.log("DRAWING links for ", links);
        // Get a list of existing links
        var link = this.svg.selectAll("path.link." + this.selector).data(links, function (link) {
            return link.target.getId();
        });

        // Add new links
        link.enter()
            .append("path")
            .attr("class", "link " + this.selector);

        // Remove old links
        link.exit().remove();

        // Update the paths
        link.attr("d", function (d) {
            return self.elbow(d);
        });
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
        // console.log("Tree.prototpe.DRAW NODES", nodes);
        var self = this;

        // console.log("this.selector = ", this.selector);

        // Get a list of existing nodes
        var node = this.svg.selectAll("g.person." + this.selector).data(nodes, function (ancestorObject) {
            let person = ancestorObject.person;
            // console.log("var node: function person ? " , person.getId(), ancestorObject.ahnNum);
            // return person;
            return ancestorObject.ahnNum; //getId();
        });

        // console.log("Tree.prototpe.DRAW NODES - SINGULAR node:", node);

        // Add new nodes
        var nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "person " + this.selector);

        // console.log("line:579 in prototype.drawNodes ","node:", node, "nodeEnter:", nodeEnter);

        // Draw the person boxes
        nodeEnter
            .append("foreignObject")
            .attr({
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

                // DEFAULT STYLE used to be style="background-color: ${borderColor} ;"

                if (ancestorObject.ahnNum == 1) {
                    return `
                    <div  id=wedgeBoxFor${
                        ancestorObject.ahnNum
                    } class="box" style="background-color: white ; border:1; padding: 0px;">
                    <div class="name" style="font-size: 18px;" ><B>${getFirstName(person)}</B></div>
                    </div>
                    `;
                } else {
                    return `
                    <div  id=wedgeBoxFor${
                        ancestorObject.ahnNum
                    } class="box" style="background-color: white ; border:1; padding: 0px;">
                    <div class="name" style="font-size: 18px;" ><B>${getFirstInitial(person)}</B></div>
                    </div>
                    `;
                }

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
                // let photoUrl = person.getPhotoUrl(75),
                // treeUrl = window.location.pathname + "?id=" + person.getName();

                // // Use generic gender photos if there is not profile photo available
                // if (!photoUrl) {
                //     if (person.getGender() === "Male") {
                //         photoUrl = "images/icons/male.gif";
                //     } else {
                //         photoUrl = "images/icons/female.gif";
                //     }
                // }

                //  return   `<div class="top-info" id=wedgeInfoFor${ancestorObject.ahnNum} style="background-color: white ; padding:5, border-color:black; border:2;">
                //  <div class="vital-info">
                // 	<div class="image-box" style="text-align: center"><img src="https://www.wikitree.com/${photoUrl}"></div>
                // 	  <div class="name">
                // 	    <b>${person.getDisplayName()}</b>
                // 	  </div>
                // 	  <div class="birth vital">${birthString(person)}</div>
                // 	  <div class="death vital">${deathString(person)}</div>
                // 	</div>
                // </div>
                // `;

                // }
            });

        // Show info popup on click
        nodeEnter.on("click", function (ancestorObject) {
            let person = ancestorObject.person; //thePeopleList[ person.id ];
            d3.event.stopPropagation();
            self.personPopup(person, d3.mouse(self.svg.node()));
        });

        // // Draw the plus icons
        // var expandable = node.filter(function (person) {
        //     return !person.getChildren() && (person.getFatherId() || person.getMotherId());
        // });

        // console.log("line:397 - self just before the DRAW PLUS command: ", self);
        // self.drawPlus(expandable.data());
        WebsView.myAncestorTree = self;

        // Remove old nodes
        node.exit().remove();

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

            // console.log("node.attr.transform  - line:324 (x,y) = ",d.x, d.y, d._data.Name);
            d = ancestorObject.person; //thePeopleList[ person.id ];

            let thisRadius = 270; // NEED TO CHANGE THIS FROM BEING HARD CODED EVENTUALLY

            // Calculate which Generation Number THIS node belongs to (0 = central person, 1 = parents, etc..)
            let thisGenNum = Math.floor(Math.log2(ancestorObject.ahnNum));
            // Calculate which position # (starting lower left and going clockwise around the Ancestor Webs) (0 is father's father's line, largest number is mother's mother's line)
            let thisPosNum = ancestorObject.ahnNum - 2 ** thisGenNum;
            // Calculate how many positions there are in this current Ring of Relatives
            let numSpotsThisGen = 2 ** thisGenNum;
            let numSpotsMaxGen = 2 ** (WebsView.numGens2Display - 1);

            let theInfoBox = document.getElementById("wedgeBoxFor" + ancestorObject.ahnNum);
            if (theInfoBox) {
                let theBounds = theInfoBox; //.getBBox();
                // console.log("POSITION node ", ancestorObject.ahnNum , theInfoBox, theInfoBox.parentNode, theInfoBox.parentNode.parentNode, theInfoBox.parentNode.parentNode.getAttribute('y'));
                // theInfoBox.style.width = "300px";
                // theInfoBox.style.x = "-190px";

                // CENTER the DIV and SET its width to 300px
                theInfoBox.parentNode.parentNode.setAttribute("y", -16);

                theInfoBox.parentNode.parentNode.setAttribute("x", -12);
                theInfoBox.parentNode.parentNode.setAttribute("width", 24);

                if (ancestorObject.ahnNum == 1) {
                    let ltrsNeeded = getFirstName(ancestorObject.person).length;
                    theInfoBox.parentNode.parentNode.setAttribute("x", -12 * ltrsNeeded);
                    theInfoBox.parentNode.parentNode.setAttribute("width", 24 * ltrsNeeded);
                } else {
                    console.log(WebsView.myAhnentafel.listByPerson[ancestorObject.person._data.Id]);
                    if (WebsView.myAhnentafel.listByPerson[ancestorObject.person._data.Id].length > 1) {
                        let theClr = "Yellow";
                        if (repeatAncestorTracker[ancestorObject.person._data.Id]) {
                            theClr = repeatAncestorTracker[ancestorObject.person._data.Id];
                        } else {
                            numRepeatAncestors++;
                            theClr = ColourArray[numRepeatAncestors];
                            repeatAncestorTracker[ancestorObject.person._data.Id] = theClr;
                        }

                        theInfoBox.setAttribute("style", "background-color: " + theClr + ";");
                    }
                }

                // SET the OUTER DIV to also be white, with a rounded radius and solid border
                // theInfoBox.parentNode.setAttribute("style", "background-color: white; padding:15px; border: solid green; border-radius: 15px;") ;
            }

            let X = 0 - numSpotsThisGen * 20 + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsThisGen;
            let dX = (((numSpotsThisGen - 1) / numSpotsThisGen) * vertSpacing * numSpotsMaxGen) / 2;
            X = 0 - dX + (thisPosNum / numSpotsThisGen) * vertSpacing * numSpotsMaxGen;
            let Y = vertSpacing * thisGenNum;

            let i = ancestorObject.ahnNum;

            console.log(
                "Transforming:",
                i,
                thisGenNum,
                thisPosNum,
                numSpotsThisGen,
                numSpotsMaxGen,
                "(",
                X,
                Y,
                ")",
                dX
            );
            // for (g = 1; g <= thisGenNum; g++ ) {
            // 	if (g % 2 == 1) {
            // 		X += 0 + (i & (2**(thisGenNum - g)) )/((2**(thisGenNum - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
            // 		// console.log(i, g, Math.floor(g/2) , WebsView.maxDiamPerGen[g] , "X",X);

            // 	} else   {
            // 		Y += 0 + (i & (2**(thisGenNum - g)) )/((2**(thisGenNum - g)) ) * 2*WebsView.maxDiamPerGen[g] - 1*WebsView.maxDiamPerGen[g];
            // 		// console.log(i, g, Math.floor(g/2) , WebsView.maxDiamPerGen[g] , "Y",Y);
            // 	}
            // }
            // // console.log( ancestorObject.ahnNum, thisGenNum, thisPosNum, ancestorObject.person._data.FirstName, ancestorObject.person._data.Name , X , Y);

            let newX = X;
            let newY = Y;
            // console.log("Place",d._data.Name,"ahnNum:" + ancestorObject.ahnNum,"Gen:"+thisGenNum,"Pos:" + thisPosNum, WebsView.maxAngle);

            // FINALLY ... we return the transformation statement back - the translation based on our  calculations
            return "translate(" + newX + "," + newY + ")";

            // and if needed a rotation based on the nameAngle
            // return "translate(" + newX + "," + newY + ")" + " " + "rotate(" + nameAngle + ")";
        });
    };

    /**
     * Show a popup for the person.
     */
    Tree.prototype.personPopup = function (person, event) {
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

        var popup = this.svg
            .append("g")
            .attr("class", "popup")
            .attr("transform", "translate(" + event[0] + "," + event[1] + ")");

        let borderColor = "rgba(102, 204, 102, .5)";
        if (person.getGender() == "Male") {
            borderColor = "rgba(102, 102, 204, .5)";
        }
        if (person.getGender() == "Female") {
            borderColor = "rgba(204, 102, 102, .5)";
        }

        popup
            .append("foreignObject")
            .attr({
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
						    <span class="tree-links"><a onClick="newTree('${person.getName()}');" href="#"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
						  </div>
						  <div class="birth vital">${birthString(person)}</div>
						  <div class="death vital">${deathString(person)}</div>
						</div>
					</div>

				</div>
			`);

        d3.select("#view-container").on("click", function () {
            console.log("d3.select treeViewerContainer onclick - REMOVE POPUP");
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
        console.log("Tree.prototype - REMOVE POPUPS (plural) function");
        d3.selectAll(".popup").remove();
    };

    /**
     * Manage the ancestors tree
     */
    var AncestorTree = function (svg) {
        console.log("new var ANCESTOR TREE");

        // RESET  the # of Gens parameters
        WebsView.numGens2Display = 3;
        WebsView.lastNumGens = 3;
        WebsView.numGensRetrieved = 3;
        WebsView.maxNumGens = 10;

        Tree.call(this, svg, "ancestor", 1);
        this.children(function (person) {
            console.log("Defining the CHILDREN for ", person._data.Name);
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
     * Get the first initial of the first name only
     */
    function getFirstInitial(person) {
        return `${person._data.FirstName.substring(0, 1)}`;
    }
    /**
     * Get the full first name only
     */
    function getFirstName(person) {
        return `${person._data.FirstName}`;
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
})();
