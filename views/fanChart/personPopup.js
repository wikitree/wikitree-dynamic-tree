/*
        // *********
        // FUNCTIONS needed to create a person popup for any Tree App
        // *********

        Currently used in the Super Tree, Fan Chart, Fractal Tree, Ancestor Webs, X Family Tree, FanDoku
        
        To be added to CC7 Views in Bubble View

        */

// Put these functions into a "personPopup" namespace.
window.personPopup = window.personPopup || {};

// Returns an array [x , y] that corresponds to the endpoint of rθ from (centreX,centreY)
personPopup.popupHTML = function (person, appIcon = "", appView = "") {
    console.log("Popup for ", person);

    let thisPopup = document.getElementById("popupDIV");
    thisPopup.style.display = "block";

    thisPopup.classList.add("popup");

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
         person._data.Name +
         `&nbsp;&nbsp;<button aria-label="Copy ID" class="copyWidget x-widget" onclick='SuperBigFamView.copyDataText(this);' data-copy-text="` +
         person._data.Name +
         `" style="color:#8fc641; background:white; padding:2px; font-size:16px;" accesskey="i"><img src="https://wikitree.com/images/icons/scissors.png">ID</button>`;
      
    let bioCheckLink = `<A target=_blank href="https://apps.wikitree.com/apps/sands1865/biocheck/?action=checkProfile&numAncestorGen=0&numDescendantGen=0&checkStart=auto&profileId=${person.getName()}">Bio Check</A>`;

    let marriageInfo = "";

    if (person._data.Spouses.length == 1) {
        if (person._data.Spouses[0].NotMarried == 1) {
            marriageInfo = "";
        } else {
            if (person._data.Spouses[0].DoNotDisplay == 1) {
                marriageInfo = "";
            } else {
                marriageInfo = "<br/><B>Spouse</B>";
            }
        }
    } else if (person._data.Spouses.length > 1) {
        let numShowableMarriages = 0;
        for (let sp in person._data.Spouses) {
            if (person._data.Spouses[sp].DoNotDisplay == 0) {
                numShowableMarriages++;
            }
        }

        marriageInfo = "<br/><B>Spouse" + (numShowableMarriages > 1 ? "s" : "") + "</B>";
    }

    if (!person._data.SpousesOrdered) {
        let orderedPartners = [];
        for (let sp in person._data.Spouses) {
            const thisPartner = person._data.Spouses[sp];
            orderedPartners.push(thisPartner.marriage_date + "|" + thisPartner.Id);
        }
        orderedPartners = orderedPartners.sort();
        thePeopleList[person._data.Id]._data.SpousesOrdered = orderedPartners;
        person._data.SpousesOrdered = orderedPartners;
        condLog("SPOUSES ORDERED  - HERE !");
    }

    let numSpousesListed = 0;
    for (let ord = 0; ord < person._data.SpousesOrdered.length; ord++) {
        const spouseOrdered = person._data.SpousesOrdered[ord];
        let spID = spouseOrdered.substr(spouseOrdered.indexOf("|") + 1);
        let prepMarriageInfo = "";
        condLog("spID = ", spID);

        if (spID > 0 && thePeopleList[spID]) {
            if (thePeopleList[spID]._data.FirstName == "Private" && thePeopleList[spID]._data.LastNameAtBirth == "") {
                // marriageInfo += "Private";
            } else {
                prepMarriageInfo +=
                    `<a href="https://www.wikitree.com/wiki/` +
                    thePeopleList[spID].getName() +
                    `" target="_blank">` +
                    thePeopleList[spID].getDisplayName() +
                    `</a>`;
            }

            for (let sp = 0; sp < person._data.Spouses.length; sp++) {
                const marriage = person._data.Spouses[sp];

                if (
                    marriage &&
                    marriage.Id > 0 &&
                    spID == marriage.Id &&
                    marriage.DoNotDisplay != 1 &&
                    marriage.NotMarried != 1 &&
                    thePeopleList[marriage.Id]
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
                            prepMarriageInfo += ", " + marriageDate;
                        }
                        // if (marriageDate > "" && marriagePlace > "") {
                        //     prepMarriageInfo += ", ";
                        // }
                        if (marriagePlace > "") {
                            prepMarriageInfo += ", " + marriagePlace;
                        }
                    }

                    // if (numSpousesListed > 0 && spID > 0) {
                    marriageInfo += "<br/>m. ";
                    // }
                    marriageInfo += prepMarriageInfo;
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
    let popupHTML =
        `
            <div class="popup-box" style="border-color: ${borderColor}">
            
                <div class="top-info">
                <span style="color:red; position:absolute; right:0.2em; top:0.2em; cursor:pointer;"><a onclick="SuperBigFamView.removePopup();">` +
        SVGbtnCLOSE +
        `</a></span>
                    <div class="image-box"><img src="https://www.wikitree.com/${photoUrl}"></div>
                    <div class="vital-info">
                        <div class="name">
                        <a href="https://www.wikitree.com/wiki/${person.getName()}" target="_blank">${displayName4Popup}</a>
                        <span class="tree-links"><a href="#name=${person.getName()}&view=fanchart"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/fan180.png" /></a></span>
                        <span class="tree-links"><a href="#name=${person.getName()}&view=descendants">${SVGbtnDESC}</a></span>
                        <span class="tree-links"><a href="#name=${person.getName()}&view=superbig"><img style="width:45px; height:30px;" src="https://apps.wikitree.com/apps/clarke11007/pix/SuperBigFamTree.png" /></a></span>
                        </div>
                        <div class="birth vital">${birthString(person)}</div>
                        <div class="death vital">${deathString(person)}</div>						  
                        
                        ${marriageInfo}

                        <hr/>
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

     return `b. ${date ? `<strong>${date}</strong>` : "[date unknown]"} ${
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
