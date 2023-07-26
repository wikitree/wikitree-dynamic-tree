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
            "Id,Name,FirstName,LastNameAtBirth,LastNameCurrent,MiddleName,RealName,Nicknames,Suffix,BirthDate,DeathDate,BirthLocation,DeathLocation,Gender,DataStatus,Privacy,Father,Mother";

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
        let btnBarHTML =
            '<table border=0 style="background-color: #f8a51d80;" width="100%"><tr>' +
            '<td width="30%">' +
            "&nbsp;" +
            "<input type=radio name=appMode checked value=Probability onclick='XTreeView.changeMode(0);'>Probability Tree&nbsp;&nbsp; <input type=radio name=appMode value=Random onclick='XTreeView.changeMode(1);'>Random Simulation&nbsp;&nbsp; "+
            // "<input type=radio name=appMode value=Edit onclick='XTreeView.changeMode(2);'>Edit &nbsp;&nbsp;" +
            "</td>" +
            '<td width="5%">&nbsp;' +
            // '<span id=legendASCII style="display:inline;"><A style="cursor:pointer;" onclick="XTreeView.toggleLegend();"><font size=+2>' +
            // LEGEND_CLIPBOARD +
            // "</font></A></span>" +
            "</td>" +
            '<td width="30%" align="center">' +
            ' <A style="cursor:pointer;" onclick="XTreeView.numGens2Display -=1; XTreeView.redraw();"> -1 </A> ' +
            "[ <span id=numGensInBBar>5</span> generations ]" +
            ' <A style="cursor:pointer;" onclick="XTreeView.numGens2Display +=1; XTreeView.redraw();"> +1 </A> ' +
            "</td>" +
            '<td width="5%" id=loadingTD align="center" style="font-style:italic; color:blue">&nbsp;</td>' +
            '<td width="30%" align="right">' +
            ' <A style="cursor:pointer;" onclick="XTreeView.toggleSettings();"><font size=+2>' +
            // SETTINGS_GEAR +
            "</font></A>" +
            "&nbsp;&nbsp;</td>" +
            '</tr></table><DIV id=WarningMessageBelowButtonBar style="text-align:center; background-color:yellow;"></DIV>';

        // Now clear out our tree view and start filling it recursively with generations.
        // $(this.selector).html(btnBarHTML  );
        $(this.selector).html(
            btnBarHTML +
                `<div id="XTreeTitle"></div>` +
                `<div id="XTreeFamilyTree"></div>` +
                `<div id="XTreeAncestorList" style="text-align:center;"></div>`
        );

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
        // this.displayGeneration(people);
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
                    "<text id=FName" +
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
                    "</text>" +
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

    // This is a recursive function.
    // This adds a headline for the new Generation, runs through all of the given people to display them.
    // Along the way it gathers the father/mother for those people as the set for the next generation.
    // Finally, if we haven't maxed out our search, that new set of parents is used to build the next generation by re-calling this method.
    async displayGeneration(people) {
        $("#XTreeAncestorList").append(`<h2>Generation ${this.generation}` + this.generationTitle() + `</h2>\n`);

        let nextPeople = new Array();
        for (let i = 0; i < people.length; i++) {
            this.displayPerson(people[i]);
            this.ahnentafelNumber++;
            nextPeople.push(await this.nextPerson(people[i].Father));
            nextPeople.push(await this.nextPerson(people[i].Mother));
        }

        this.generation++;
        if (this.generation <= this.maxGeneration) {
            this.displayGeneration(nextPeople);
        } else {
            wtViewRegistry.clearStatus();
        }
    }

    // Grab a parent profile for the next generation. If we don't have an id, we use a place-holder instead, so the
    // display keeps going with an "Unknown" relative displayed.
    async nextPerson(id) {
        if (id > 0) {
            // We used to get each profile individually.
            // let data = await WikiTreeAPI.postToAPI({appId: XTreeView.APP_ID, action: "getPerson", key: id, fields: this.profileFields });
            // if (data.length != 1) {
            //     return this.blankPerson;
            // } else {
            //     return data[0].person;
            // }

            // Now, we gathered all of our ancestors in one swoop at init and stored them by id in this.ancestors.
            if (this.ancestors[id] !== undefined) {
                return this.ancestors[id];
            } else {
                return this.blankPerson;
            }
        }
        return this.blankPerson;
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

    // This code takes the WikiTree API person data and renders it into HTML for appending to the view display container.
    displayPerson(person) {
        let html = `<p class="ahnentafelPerson" id="person_${this.ahnentafelNumber}">${this.ahnentafelNumber}. `;

        if (person.Id == 0) {
            html += `[${this.unknownName()} Unknown]`;
        } else {
            if (!person.MiddleName) {
                person.MiddleName = "";
            }
            if (this.generation == 1) {
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
                html += "</b>";
            } else {
                html += `<a name="${this.ahnentafelNumber}"></a>`;
                html += `<a href="https://www.wikitree.com/wiki/${person.Name}">`;
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
                html += "</a>";
            }
            html += ": ";

            if (person.DataStatus.BirthDate != "blank" || person.DataStatus.BirthLocation != "blank") {
                html += "Born ";
            }
            if (person.BirthLocation && person.DataStatus.BirthLocation != "blank") {
                html += ` ${person.BirthLocation}`;
            }
            if (person.BirthDate != "" && person.BirthDate != "0000-00-00" && person.DataStatus.BirthDate != "blank") {
                if (person.DataStatus.BirthDate == "guess") {
                    html += " about ";
                }
                if (person.DataStatus.BirthDate == "before") {
                    html += " before ";
                }
                if (person.DataStatus.BirthDate == "after") {
                    html += " after ";
                }
                html += ` ${this.formatDate(person.BirthDate)}`;
            } else {
                if (person.DataStatus.BirthDate != "blank") {
                    html += " [date unknown]";
                }
            }
            if (person.DataStatus.BirthDate != "blank" || person.DataStatus.BirthLocation != "blank") {
                html += ". ";
            }

            if (
                person.DataStatus.DeathDate != "blank" &&
                ((person.DeathDate != "" && person.DeathDate != "0000-00-00") || person.DataStatus.DeathDate == "guess")
            ) {
                html += "Died ";
                if (person.DeathLocation && person.DataStatus.DeathLocation != "blank") {
                    html += ` ${person.DeathLocation}`;
                }
                if (person.DataStatus.DeathDate == "guess") {
                    html += " about ";
                }
                if (person.DataStatus.DeathDate == "before") {
                    html += " before ";
                }
                if (person.DataStatus.DeathDate == "after") {
                    html += " after ";
                }
                html += ` ${this.formatDate(person.DeathDate)}`;
                html += ".";
            }
        }

        if (this.generation > 1) {
            let childA = Math.floor(this.ahnentafelNumber / 2);
            html += ` ${this.genderAsParent(person.Gender)} of <a class="aLink" href="#${childA}">${childA}</a>.`;
        }
        if (this.generation < this.maxGeneration) {
            let fatherA = this.ahnentafelNumber * 2;
            let motherA = this.ahnentafelNumber * 2 + 1;

            html += ` ${this.genderAsChild(
                person.Gender
            )} of <a class="aLink" href="#${fatherA}">${fatherA}</a> and <a class="aLink" href="#${motherA}">${motherA}</a>.`;
        }

        html += "</p>\n";

        $("#XTreeAncestorList").append(html);
    }
};
