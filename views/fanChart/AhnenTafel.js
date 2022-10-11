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
		this.list = new Array([0]);   
        this.primaryPerson = "";     
    }
	
    // The update method takes a Person object as input
    // then makes that Person the Primary ID, Ahnentafel # 1, then
    // climbs through their ancestors to fill out the rest of the Ahnentafel
    update( newPerson ) {
        // console.log("Update the Ahnentafel object", newPerson);

       if (newPerson && newPerson._data.Id) {
            this.primaryPerson = newPerson;
       }
       if (this.primaryPerson) {
            // this.PrimaryID = newPerson._data.Id
            this.list = [0 , this.primaryPerson._data.Id]; // initialize the Array

            if (this.primaryPerson._data.Father && this.primaryPerson._data.Father  > 0) {
                this.addToAhnenTafel(this.primaryPerson._data.Father, 2);
            }
            if (this.primaryPerson._data.Mother && this.primaryPerson._data.Mother  > 0) {
                this.addToAhnenTafel(this.primaryPerson._data.Mother, 3);
            }
        	this.listAll(); // sends message to the console.log for validation - this could be commented out and not hurt anything
       } 
    }

    // Stores the next person's WikiTree ID in position corresponding to their Ahnentafel number
    // THEN ... if they are a person in thePeopleList collection, check for THEIR parents, and recurse up the tree adding them!
    addToAhnenTafel(nextPersonID, ahnNum) {
        this.list[ahnNum] = nextPersonID;
		let nextPerson = thePeopleList[nextPersonID];
         if (nextPerson && nextPerson._data.Father && nextPerson._data.Father  > 0) {
            this.addToAhnenTafel(nextPerson._data.Father, 2*ahnNum);
        }
        if (nextPerson && nextPerson._data.Mother && nextPerson._data.Mother > 0) {
            this.addToAhnenTafel(nextPerson._data.Mother, 2*ahnNum + 1);
        }
    }

    // Returns an array of objects, each one holding the Ahnentafel #, and the WikiTree ID # for each ancestor
	listOfAncestors(){
		let theList = [];
		for (var i = 0; i < this.list.length; i++) {
			if(this.list[i] && this.list[i] > 0){
				theList.push( {ahnNum:i, id:this.list[i]});
			}
		}
		return theList;
	}
	
    // Returns an array of objects for building the Fan Chart (and potentially other trees)
    // Each entry contains the Ahnentafel #, and the Person object for each ancestor
    // Instead of sending JUST the list of Person Objects, this structure is needed to avoid collapsing trees
    // i.e. - the d3 Tree will only display UNIQUE ID #s - so - in the case where Ancestors repeat, if you go far enough back
    //     the multiple versions will not show - only the last one to be mapped to the tree
    // THIS way - using an object with a unique Ahnentafel # for each occurence of an ancestor,
    //  you can have as many as you need in the resulting Tree / Chart

	listOfAncestorsForFanChart( numGens = 5 ){
		let theList = [];
        let maxNum = this.list.length;
        let maxNumInGen = 2**numGens;
        let theMax = Math.min(maxNum, maxNumInGen);

		for (var i = 0; i < theMax; i++) {
			if(this.list[i] && this.list[i] > 0 &&  thePeopleList[ this.list[i] ] ){

                let thisAncestor = {ahnNum:i , person: thePeopleList[ this.list[i] ] };
                theList.push(  thisAncestor );

                    // console.log("--> PUSHED !",thisAncestor.ahnNum, thisAncestor.person._data.Id);                
			}
		}
        console.log("listOfAncestorsForFanChart has " , theList.length , " ancestors.");
		return theList;
	}
	
    // A very BASIC tool to use for quick console.log relief
    listAll() {
        console.log("Ahnentafel:", this);
    }

    // This function will go through all people at generation (newLevel - 1) - and find all the IDs for their parents
    // IF that parent already exists in the thePeopleList - fine - no big whoop
    // IF that parent DOES NOT EXIST, then add their ID to the huge list we're going to send back
    listOfAncestorsToBeLoadedForLevel(numGens) {
        let theList = [];
        let maxNum = this.list.length;
        let maxNumInGen = 2**numGens;
        let theMax = Math.min(maxNum, maxNumInGen);

        let minNum = 1;
        let minNumInGen = 2**(numGens-1);
        let theMin = Math.max(minNum, minNumInGen);

		for (var i = theMin; i < theMax; i++) {
			if(this.list[i] && this.list[i] > 0 &&  thePeopleList[ this.list[i] ] ){

                let thePeep = thePeopleList[ this.list[i] ];
                if (thePeep._data.Father && thePeep._data.Father > 0 && theList.indexOf(thePeep._data.Father) == -1 ) {
                    if (thePeopleList[thePeep._data.Father ]) {
                        // father already exists, so don't need to re-load him
                    } else {
                        theList.push(  thePeep._data.Father );
                    }

                }
                if (thePeep._data.Mother && thePeep._data.Mother > 0 && theList.indexOf(thePeep._data.Mother) == -1) {
                    if (thePeopleList[thePeep._data.Mother ]) {
                        // Mother already exists, so don't need to re-load her
                    } else {
                        theList.push(  thePeep._data.Mother );
                    }
                }


                    // console.log("--> PUSHED !",thisAncestor.ahnNum, thisAncestor.person._data.Id);                
			}
		}
        console.log("listOfAncestorsToBeLoadedForLevel has " , theList.length , " ancestors.");
		return theList;

    }
}
