/*
 * TimelineTree
 *
 * This is a wikitree tree app, intended to display a hybrid family tree / timeline, showing thefamily relationships
 * between indivduals, but also showing when each person was alive.
 * 
 * It constructs the visualiation using SVG, and is based on an earlier standalone version that displayed data stored
 * in a JSON file extracted from RootMagic.
 *
 * (Note: Much of the structure of the app has been generated from the "Ancestor Lines Explorer" app. Thanks are due
 * to the developers of that app!)
 * 
 * Suggestion for further development are welcome.
 * David Lowe (davidblowe@gmail.com)
 * 
 * ==================================
 * Working version 2:
 * 
 * Changing the underlying data model to allow for simpler display
 * 
 */


//===================================================================================
// Key parameters and data

const ttreeMaxGens = 3;
const ttreeDebug = true;

var currentYear;
var ttreePrimaryID;
var ttreePeople   = [];



//===================================================================================
// Main view constructor 

window.TimelineTreeView2 = class TimelineTreeView2 extends View {
    static #DESCRIPTION = "Shows a tree structure in a timeline format.";
    meta() {
        return {
            title: "Timeline Tree 2",
            description: TimelineTreeView2.#DESCRIPTION,
        };
    }

    async init(container_selector, person_id) {

        let controlBlock = `
            <div id="controlBlock" class="ttree-not-printable" style="position:sticky; top:1;">
                <label>Flip timeline:&nbsp;</label><input type="checkbox" id="paramFlip">&nbsp;&nbsp;&nbsp;&nbsp;
                <label>Show locations:&nbsp;</label><input type="checkbox" id="paramLocs">&nbsp;&nbsp;&nbsp;&nbsp;
                <button id="help-button" class="btn btn-secondary btn-sm" title="About this application."><b>?</b></button>
            </div>`;

        wtViewRegistry.setInfoPanel(controlBlock);
        wtViewRegistry.showInfoPanel();
        const ttree = new TimelineTree(container_selector, person_id);
     }
};


//===================================================================================
// Class timelineTree

export class TimelineTree {

    constructor(selector, person_id) {

        this.selector = selector;
        ttreePrimaryID = person_id;

        let now = new Date();
        currentYear = now.getFullYear();

        // $(selector).attr("height,500")
        $(selector).html(`
            <div id="ttreeContainer" class="ttree-printable">
            </div>`);
        
        // Now build the tree
        TimelineTree.generateTree();

    }

//===================================================================================
// Class timelineTree: Method GenerateTree

    static async generateTree (event) {

        // Building message 
        const timelineSVG = `
            <svg id="ttreeHeader">
                <text x="10" y="20" font-size="20">Loading ...</text>
            </svg>
            <svg id="ttreeMain"></svg>
        `;
        $("#ttreeContainer").html(timelineSVG);
    
        ttreePeople = [];
   
 
        // Load data
        var valid;
        valid = await ttreeGetPeople();
        if (!valid) {
            document.getElementById("ttreeMain").innerHTML = '<text x="10" y="20" font-size="20">No valid person</text>';
            return;
        } 
        document.getElementById("ttreeMain").innerHTML = '<text x="10" y="20" font-size="20">Checking</text>';
/*                
        // Temp display
        $("#ttreeMain").attr("height", 100);
        var svgText = "";
        for (var i=0; i<this.people.length; i++) {
            svgText += `<text x="10" y=` + (20+(i*20)) + `" font-size="20">Person ` + i + `</text>`;
        }
                
        document.getElementById("ttreeMain").innerHTML = "Testing";
        
        // $("#ttreeMain").html(svgText);
        // $("#ttreeMain").html("This");
*/                
    }

}

//===================================================================================
// Load all people 

async function ttreeGetPeople() {
    // Retrieve list of people
    console.log(`Retrieving relatives for person with ID=${ttreePrimaryID}`);
    let starttime = performance.now();

    // Begin by retrieving all ancestors for the primaryID person
    var fields=["Id","Name","Father","Mother"];
    const ancestors_json = await WikiTreeAPI.getAncestors("TimelineTree", ttreePrimaryID, ttreeMaxGens, fields);
    let ancestorsList = ancestors_json ? Object.values(ancestors_json) : [];
    console.log(`Retrieved ${ancestorsList.length} people in direct tree`);
    if (ancestorsList.length == 0) return false;

    // Then have to retrieve the relatives of each ancestor (spouse + children)
    let ancestorsIDs = ancestorsList.map(item => item["Id"]);  // Extract Ids of all ancestors
    var fields=["Id","PageId","Name","FirstName","MiddleName","LastNameAtBirth","LastNameCurrent",
                "BirthDate","DeathDate","BirthDateDecade", "DeathDateDecade", "BirthLocation","DeathLocation","Gender","IsLiving","Father","Mother",
                "Children","Spouses","Privacy"];
    const relatives_json = await WikiTreeAPI.getRelatives("TimelineTree", ancestorsIDs, fields, {getChildren: 1, getSpouses: true});
    let ancestorsDetails = relatives_json ? Object.values(relatives_json) : [];
    if (ttreeDebug) console.log(ancestorsDetails);

    
    // Then need to extract all people into a single list with suitable ordering
    extractRelatives(ttreePrimaryID, ancestorsDetails, 1);
    if (ttreeDebug) console.log(ttreePeople);

    // Mark the original target person
    let keyPerson = ttreePeople.find(item => item.id === ttreePrimaryID);
    keyPerson["type"]="target";
    
    // ----------------------------------------------------------
    // For each person, extract initial info

    var families = [];  // for recording details of each family (couple, child-parent, or both)

    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];

        // Find father, mother rows
        person["FatherRow"] = ttreePeople.findIndex(item => item["id"] == person["details"]["Father"]);
        person["MotherRow"] = ttreePeople.findIndex(item => item["id"] == person["details"]["Mother"]);

        // Determine initial version of birthYear and deathYear
        var by = Number(person["details"]["BirthDate"].substring(0,4));
        var bd = Number(person["details"]["BirthDateDecade"].substring(0,4));
        if (by > 0) { person["BirthYear"] = by; person["BirthKnown"] = true; }
        else if (bd > 0) { person["BirthYear"] = bd+10; person["BirthKnown"] = false; }
        else { person["BirthYear"] = null; person["BirthKnown"] = false; }

        var dy = Number(person["details"]["DeathDate"].substring(0,4));
        var dd = Number(person["details"]["DeathDateDecade"].substring(0,4));
        var dl = (person["details"]["IsLiving"] == 1);
        if (dy > 0) { person["DeathYear"] = by; person["DeathKnown"] = true; }
        else if (dd > 0) { person["DeathYear"] = dd; person["DeathKnown"] = false; }
        else if (!dl) { person["DeathYear"] = person["BirthYear"] + 20;  person["DeathKnown"] = false;}
        else { person["DeathYear"] = null; person["DeathKnown"] = false; }

        // Now add/update any relevant families for this person: (1) Check if this person's parents are an existing couple
        var idx = families.findIndex(item => ((item["father"]==person["details"]["Father"])&&(item["mother"]==person["details"]["Mother"])));
        if (idx == -1) { // need new family
            var newfamily = {"Father": person["details"]["Father"], "Mother": person["details"]["Mother"], "Year": null; "Married": null, "FirstChild": i; "LastChild": i});
            families.push(newfamily);
        }
        else { // update the existing family
            if (person["BirthYear"] > 0) {
                // Was the current person born before the first-born in the family?
                if ((ttreePeople[families[idx]["Firstchild"]]["BirthYear"] == 0)
                    families[idx]["FirstChild"] = i;
                else if (person["BirthYear"] < ttreePeople[families[idx]["Firstchild"]]["BirthYear"])
                    families[idx]["FirstChild"] = i;
                // Was the current person born after the last-born in the family?
                if (person["BirthYear"] > ttreePeople[families[idx]["Lastchild"]]["BirthYear"])
                    families[idx]["LastChild"] = i;
            }
        }

        // Now add/update any relevant families for this person: (2) Check if this person's spouses are an existing couple
            // Note: Because male partner will also be first, can assume that couple will always be found through male...
        for (var spouseID in person["details"]["Spouses"]) {
            var idx = families.findIndex(item => ((item["father"]==person["id"])&&(item["mother"]==spouseID)));
            if (idx == -1) { // need new family
                var newfamily = {"Father": person["id"], "Mother": person["details"]["Mother"], "Year": null; "Married": null, "FirstChild": i; "LastChild": i});
                ## Update year
                families.push(newfamily);
            }
                
        }
        


/*
        // Check if this person is the oldest child found for their parents
        if (person["BirthYear"] > 0) {
            var idx = couples.findIndex(item => ((item["father"]==person["details"]["Father"])&&(item["mother"]==person["details"]["Mother"])));
            if (idx == -1) {
                couples.push({"father": person["details"]["Father"], "mother": person["details"]["Mother"], "year": person["BirthYear"]});
            }
            else if (person["BirthYear"] < couples[idx]["year"]) couples[idx]["year"] = person["BirthYear"];
*/
        }
    }

/*
    // ----------------------------------------------------------
    // For each person, find the info on each partner

    for (var i=0; i<ttreePeople.length; i++) {
        var person = ttreePeople[i];
        person["PartnersYears"] = [];

        // Determine the "Partner" years for each person (i.e. spouses,etc.)
        for (var spouseID in person["details"]["Spouses"]) {
            var partner = {};
            partner["married"] = true;
            partner["id"] = spouseID;
            partner["row"] = ttreePeople.findIndex(item => item["id"] == spouseID);
            
            var spouse = person["details"]["Spouses"][spouseID];
            var year = Number(spouse["marriage_date"].substring(0,4));
            if (year==0) {
                // find this couple and see if they have a child date of birth
                var idx = couples.findIndex(item => ((item["father"]==person["id"])&&(item["mother"]==spouseID)));
                if (idx >= 0) if (couples[idx]["year"] > 0) year = couples[idx]["year"];
                var idx = couples.findIndex(item => ((item["mother"]==person["id"])&&(item["father"]==spouseID)));
                if (idx >= 0) if (couples[idx]["year"] > 0) year = couples[idx]["year"];
            }
            if (year==0) year = Number(person["BirthYear"]) + 20 
            partner["year"] = year;
console.log(partner);
            person["PartnersYears"].push(partner);
        }

        // And add a partnerYear for this person with no spouse
        var partner = {};
        partner["married"] = false;
        partner["id"] = null;
        partner["row"] = null;     
        var idx = couples.findIndex(item => ((item["father"]==person["id"])&&(item["mother"]==0)));
        if (idx >= 0) {
            partner["year"] = couples[idx]["year"];
            person["PartnersYears"].push(partner);
        }
        var idx = couples.findIndex(item => ((item["mother"]==person["id"])&&(item["father"]==0)));
        if (idx >= 0) {
            partner["year"] = couples[idx]["year"];
            person["PartnersYears"].push(partner);
        }
*/
        /*
        // determine birthYear to use
        ttreePeople[i]["BirthYear"] = Number(ttreePeople[i]["details"]["BirthDate"].substr(0,4));
        ttreePeople[i]["DeathYear"] = Number(ttreePeople[i]["details"]["DeathDate"].substr(0,4));

        ttreePeople[i]["useBirth"] = Number(ttreePeople[i]["BirthYear"]);
        ttreePeople[i]["useDeath"] = Number(ttreePeople[i]["DeathYear"]);

        ttreePeople[i]["useBirthExt"] = false;
        ttreePeople[i]["useDeathExt"] = false;
        if (ttreePeople[i]["useBirth"] == 0) {
            ttreePeople[i]["useBirthExt"]=true;
            // OK what date do we use for the birth? Is there a marriage date?
            if (Number(families[ttreePeople[i]["family"]]["useDate"]) > 0) {
                ttreePeople[i]["useBirth"] = Number(families[ttreePeople[i]["family"]]["useDate"])+20 + 1;
            }
            // OK, use the fathers "useDate" +40 years
            else {
                var fatherIdx = ttreePeople.findIndex(item => item.id == ttreePeople[i]["details"]["Father"]);
                ttreePeople[i]["useBirth"] = Number(ttreePeople[fatherIdx]["useBirth"]) + 40;
                families[ttreePeople[i]["family"]]["useDate"] = Number(ttreePeople[fatherIdx]["useBirth"]) + 20;
            }
        }
        if (ttreePeople[i]["useDeath"] == 0) {
            ttreePeople[i]["useDeathExt"]=true;
            if (ttreePeople[i]["details"]["IsLiving"] == 0) ttreePeople[i]["useDeath"] = ttreePeople[i]["useBirth"] + 20;
            else ttreePeople[i]["useDeath"] = yearCurrent;
        }

*/
    }

    console.log(couples);

    // ### MORE HERE

/* ### IS THE FOLLOWING NEEDED AT THIS POINT? Maybe just check for a missing date of birth, and set to 0000.
    if (Number(keyPersonDetails["Privacy"])<50 && !("FirstName" in keyPersonDetails)) {
        keyPersonDetails["FirstName"] = "(private)";
        keyPersonDetails["BirthDate"] = "0000";
        keyPersonDetails["BirthLocation"] = "";
        keyPersonDetails["DeathDate"] = "0000";
        keyPersonDetails["DeathLocation"] = "";
        }
*/

    let elapsedTime = performance.now() - starttime;
    console.log(`Retrieved ${ttreePeople.length} total people in tree`);
    console.log(`Total elapsed time : ${elapsedTime}ms.`);



/*
    for (var i=0; i<ttreePeople.length; i++) {
        ttreePeople[i]["BirthYear"] = Number(ttreePeople[i]["details"]["BirthDate"].substr(0,4));
        ttreePeople[i]["DeathYear"] = Number(ttreePeople[i]["details"]["DeathDate"].substr(0,4));
    }
    // And then identify families (so family lines can be drawn)
    TimelineTree.extractFamilies(people, families, primaryID, ancestorsDetails);
    if (TimelineTree.DEBUG)  console.log (families);
*/
    return true;
}


//===================================================================================
// Class TimelineTree: method to extact and order relatives

function extractRelatives(startID, ancestorsDetails, gen) {

    let keyPerson = ancestorsDetails.find(item => item.user_id === startID);
    if (typeof keyPerson === 'undefined') return [];

    let fathersID = keyPerson["person"]["Father"]
    let fatherPerson = ancestorsDetails.find(item => item.user_id === fathersID);
    let mothersID = keyPerson["person"]["Mother"]
    let motherPerson = ancestorsDetails.find(item => item.user_id === mothersID);
    if (TimelineTree.DEBUG) console.log("Checking tree for Person=" + startID + "; Father=" + fathersID + "; Mother=" + mothersID);

    // Add fathers relatives
    extractRelatives(fathersID, ancestorsDetails, gen+1);

    // Add other spouses of mother
    if (typeof motherPerson != 'undefined') {
        let mothersSpouses = motherPerson["person"]["Spouses"]
        var husbands = [];
        for (const spouseID in mothersSpouses) {
            if (spouseID != fathersID) {
                husbands.push({"id": mothersSpouses[spouseID]["Id"], "details": mothersSpouses[spouseID], "type": "stepParent", "generation": gen});
                if (TimelineTree.DEBUG) console.log("Added other husband=" + spouseID)
            }
        }
        ttreePeople.push(...husbands);
    }

    // Add all siblings including self (from each parent - then remove duplicates, then order)
    var siblings=[];
    var siblingsSorted=[];
    // add self
    var keyPersonDetails = keyPerson["person"];
    siblings.push({"id": startID, "details":keyPersonDetails, "generation": gen});

    // add siblings (via father)
    if (typeof fatherPerson != 'undefined') {
        let fathersChildren = fatherPerson["person"]["Children"]
        var children = [];
        for (const childID in fathersChildren) {
            children.push({"id": fathersChildren[childID]["Id"], "details": fathersChildren[childID], "generation": gen});
        }
        siblings.push(...children);
    }
    // add siblings (via mother)
    if (typeof motherPerson != 'undefined') {
        let mothersChildren = motherPerson["person"]["Children"]
        var children = [];
        for (const childID in mothersChildren) {
            children.push({"id": mothersChildren[childID]["Id"], "details": mothersChildren[childID], "generation": gen});
        }
        siblings.push(...children);
    }
    // check that each sibling has a DOB
    for (var i=0; i<siblings.length; i++) {
        if (!("BirthDate" in siblings[i]["details"])) siblings[i]["details"]["BirthDate"] = "0000";
        if (!("DeathDate" in siblings[i]["details"])) siblings[i]["details"]["DeathDate"] = "0000";
    }

    // sort and remove duplicates
    while (siblings.length > 0) {
        // Start by finding the oldest of all unsorted siblings
        var oldestSibling = 0;
        var iSibling;
        for (iSibling=1; iSibling<siblings.length; iSibling++) {
            if (siblings[iSibling]["details"]["BirthDate"].substring(0,4) < siblings[oldestSibling]["details"]["BirthDate"].substring(0,4)) oldestSibling = iSibling;
        }
        // Then remove this sibling from the unsorted list
        var siblingToMove = siblings[oldestSibling];
        siblings.splice(oldestSibling,1);
        // check that this isn't a duplicate, and if so then just dump this one.
        var isDuplicate = false;
        for (iSibling=0; iSibling<siblingsSorted.length; iSibling++) if (siblingsSorted[iSibling]["id"] == siblingToMove["id"]) isDuplicate=true;
        if (isDuplicate) continue;
        // then check type
        if (siblingToMove["id"] == startID)
            siblingToMove["type"]="ancestor";
        else if ((siblingToMove["details"]["Father"]== keyPersonDetails["Father"]) && (siblingToMove["details"]["Mother"]== keyPersonDetails["Mother"]))
            siblingToMove["type"]="sibling";
        else
            siblingToMove["type"]="halfSibling";
        // And finally add them to the sorted list
        siblingsSorted.push(siblingToMove);
    }
    ttreePeople.push(...siblingsSorted);
        

    // Add other spouses of father
    if (typeof fatherPerson != 'undefined') {
        let fathersSpouses = fatherPerson["person"]["Spouses"]
        var wives = [];
        for (const spouseID in fathersSpouses) {
            if (spouseID != mothersID) {
                wives.push({"id": fathersSpouses[spouseID]["Id"], "details": fathersSpouses[spouseID], "type": "stepParent", "generation": gen});
                if (TimelineTree.DEBUG) console.log("Added other wife=" + spouseID)
            }
        }
        ttreePeople.push(...wives);
    }

    // Add mothers relatives
    extractRelatives(mothersID, ancestorsDetails, gen+1);
}

