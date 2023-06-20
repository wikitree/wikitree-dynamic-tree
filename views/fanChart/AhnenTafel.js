/*
 * AhnenTafel.js
/*
// **************************************
// A Class to hold an Ahentafel (table of ancestors) in an Array
// **************************************
/
 * The basic AhnenTafel is an associative array (.list)
 *       index: Ahentafel Number , value: WikiTree ID for the corresponding ancestor
 * 
 * NOTE:  The actual Person object for that person can be found using thePeopleList (an instance of PeopleCollection)
 * 
 * e.g.  If you're looking for the grandfather of the primary person
 *      paternalGrandDad = thePeopleList[ myAhnenTafel.list[ 4 ]  ]
 */

window.AhnenTafel = window.AhnenTafel || {};

// Our basic constructor for a PeopleList. We expect the "person" data from the API returned result
// (see getPerson below). The basic fields are just stored in the internal _data array.
// We pull out the Parent and Child elements as their own Person objects.
AhnenTafel.Ahnentafel = class Ahnentafel {
    constructor(data) {
        this.list = new Array([0]); // LIST of person IDs:   this.list[ ahnentafelNumber ] = PersonID at that ahnentafelNumber
        this.listByPerson = new Array(); // LIST of ahentafel numbers ascribed to a person:   this.listByPerson[ personID ] = Array of ahnentafelNumbers that this personID has (will be multiple entries for repeat ancestors)
        this.primaryPerson = "";
    }

    // The update method takes a Person object as input
    // then makes that Person the Primary ID, Ahnentafel # 1, then
    // climbs through their ancestors to fill out the rest of the Ahnentafel
    update(newPerson) {
        // condLog("Update the Ahnentafel object", newPerson);

        if (newPerson && newPerson._data.Id) {
            this.primaryPerson = newPerson;
        }
        if (this.primaryPerson) {
            // this.PrimaryID = newPerson._data.Id
            this.list = [0, this.primaryPerson._data.Id]; // initialize the Array
            this.listByPerson = new Array(); // initialize the Array
            this.listByPerson[this.primaryPerson._data.Id] = 1; // add the primary person to the list

            if (this.primaryPerson._data.Father && this.primaryPerson._data.Father > 0) {
                this.addToAhnenTafel(this.primaryPerson._data.Father, 2);
            }
            if (this.primaryPerson._data.Mother && this.primaryPerson._data.Mother > 0) {
                this.addToAhnenTafel(this.primaryPerson._data.Mother, 3);
            }
            this.listAll(); // sends message to the condLog for validation - this could be commented out and not hurt anything
        }
    }

    // Stores the next person's WikiTree ID in position corresponding to their Ahnentafel number
    // THEN ... if they are a person in thePeopleList collection, check for THEIR parents, and recurse up the tree adding them!
    addToAhnenTafel(nextPersonID, ahnNum) {
        this.list[ahnNum] = nextPersonID;
        if (this.listByPerson[nextPersonID] && this.listByPerson[nextPersonID].length > 0) {
            if (this.listByPerson[nextPersonID].indexOf(ahnNum) > -1) {
                // THIS specific ahnNum (Ahnentafel #) is already in the list - so - we can ignore it - don't want duplicates if we can help it!
            } else {
                // this Ahnentafel # is not yet in the list - so let's add it!
                this.listByPerson[nextPersonID].push(ahnNum);
            }
        } else {
            this.listByPerson[nextPersonID] = [ahnNum];
        }

        let nextPerson = thePeopleList[nextPersonID];
        if (nextPerson && nextPerson._data.Father && nextPerson._data.Father > 0) {
            this.addToAhnenTafel(nextPerson._data.Father, 2 * ahnNum);
        }
        if (nextPerson && nextPerson._data.Mother && nextPerson._data.Mother > 0) {
            this.addToAhnenTafel(nextPerson._data.Mother, 2 * ahnNum + 1);
        }
    }

    // Returns an array of objects, each one holding the Ahnentafel #, and the WikiTree ID # for each ancestor
    listOfAncestors() {
        let theList = [];
        for (var i = 0; i < this.list.length; i++) {
            if (this.list[i] && this.list[i] > 0) {
                theList.push({ ahnNum: i, id: this.list[i] });
            }
        }
        return theList;
    }
    // Returns an array of objects, each one holding the WikiTree ID # and the list of Ahnentafel #s associated with them for each repeat ancestor
    listOfRepeatAncestors(numGens = 16) {
        let theList = [];
        let maxAhnNum = 2 ** numGens - 1;
        for (var id in this.listByPerson) {
            if (this.listByPerson[id] && this.listByPerson[id].length > 1) {
                if (this.hasTwoAncestorsInThisAhnenRange(this.listByPerson[id], maxAhnNum)) {
                    theList.push({ id: id, AhnNums: this.listByPerson[id] });
                }
            }
        }
        return theList;
    }

    // Wee function to quickly look through a list of AhnenNumbers and determine if there are at least 2 of them within a specific range (determined by max # of gens currently being displayed)
    hasTwoAncestorsInThisAhnenRange(listOfAhnNums, maxAhnNum) {
        let numInRange = 0;
        for (let index = 0; index < listOfAhnNums.length; index++) {
            if (listOfAhnNums[index] <= maxAhnNum) {
                numInRange++;
            }
        }

        return numInRange >= 2;
    }

    // Returns an array of objects for building the Fan Chart (and potentially other trees)
    // Each entry contains the Ahnentafel #, and the Person object for each ancestor
    // Instead of sending JUST the list of Person Objects, this structure is needed to avoid collapsing trees
    // i.e. - the d3 Tree will only display UNIQUE ID #s - so - in the case where Ancestors repeat, if you go far enough back
    //     the multiple versions will not show - only the last one to be mapped to the tree
    // THIS way - using an object with a unique Ahnentafel # for each occurence of an ancestor,
    //  you can have as many as you need in the resulting Tree / Chart

    listOfAncestorsForFanChart(numGens = 5, primePersonNum = 0) {
        let theList = [];
        let maxNum = this.list.length;
        let maxNumInGen = 2 ** numGens;
        let theMax = Math.min(maxNum, maxNumInGen);

        for (var i = 0; i < theMax; i++) {
            if (this.list[i] && this.list[i] > 0 && thePeopleList[this.list[i]]) {
                let thisAncestor = { ahnNum: i, person: thePeopleList[this.list[i]], p: primePersonNum };
                theList.push(thisAncestor);

                // condLog("--> PUSHED !",thisAncestor.ahnNum, thisAncestor.person._data.Id);
            }
        }
        condLog("listOfAncestorsForFanChart has ", theList.length, " ancestors.");
        return theList;
    }

    // A very BASIC tool to use for quick condLog relief
    listAll() {
        condLog("Ahnentafel:", this);
    }

    // This function will go through all people at generation (newLevel - 1) - and find all the IDs for their parents
    // IF that parent already exists in the thePeopleList - fine - no big whoop
    // IF that parent DOES NOT EXIST, then add their ID to the huge list we're going to send back
    listOfAncestorsToBeLoadedForLevel(numGens = 10) {
        let theList = [];
        let maxNum = this.list.length;
        let maxNumInGen = 2 ** numGens;
        let theMax = Math.min(maxNum, maxNumInGen);

        let minNum = 1;
        let minNumInGen = 2 ** (numGens - 1);
        let theMin = Math.max(minNum, minNumInGen);

        for (var i = theMin; i < theMax; i++) {
            if (this.list[i] && this.list[i] > 0 && thePeopleList[this.list[i]]) {
                let thePeep = thePeopleList[this.list[i]];
                if (thePeep._data.Father && thePeep._data.Father > 0 && theList.indexOf(thePeep._data.Father) == -1) {
                    if (thePeopleList[thePeep._data.Father]) {
                        // father already exists, so don't need to re-load him
                    } else {
                        theList.push(thePeep._data.Father);
                    }
                }
                if (thePeep._data.Mother && thePeep._data.Mother > 0 && theList.indexOf(thePeep._data.Mother) == -1) {
                    if (thePeopleList[thePeep._data.Mother]) {
                        // Mother already exists, so don't need to re-load her
                    } else {
                        theList.push(thePeep._data.Mother);
                    }
                }

                // condLog("--> PUSHED !",thisAncestor.ahnNum, thisAncestor.person._data.Id);
            }
        }
        condLog("listOfAncestorsToBeLoadedForLevel has ", theList.length, " ancestors.");
        return theList;
    }

    // This function will go through all people at generation (genNum) - and find all the IDs for those people
    // Duplicate IDs will be removed (or not added actually)

    listOfAncestorsAtLevel(genNum = 8) {
        let theList = [];
        let maxNumInGen = 2 ** genNum;
        let minNumInGen = 2 ** (genNum - 1);

        for (var i = minNumInGen; i < maxNumInGen; i++) {
            if (this.list[i] && this.list[i] > 0 && thePeopleList[this.list[i]]) {
                let thisID = thePeopleList[this.list[i]]._data.Id;
                if (theList.indexOf(thisID) == -1) {
                    theList.push(thisID);
                }
                // condLog("--> PUSHED !",thisAncestor.ahnNum, thisAncestor.person._data.Id);
            }
        }
        condLog("listOfAncestorsAtLevel ", genNum, "has ", theList.length, " ancestors.\n", theList);
        return theList;
    }
};
