/*
 * PeopleCollection.js
/*
// **************************************
// A Class to hold a collection of PEOPLE (a collection of the Person objects)
// **************************************
/
 * The basic PeopleCollection is an associative array 
 *       key: Id , value: Person object corresponding to that WikiTree ID #
 * 
 * 
 */

window.PeopleCollection = window.PeopleCollection || {};

// Our basic constructor for a PeopleList. We expect the "person" data from the API returned result
// (see getPerson below). The basic fields are just stored in the internal _data array.
// We pull out the Parent and Child elements as their own Person objects.
PeopleCollection.PeopleList = class PeopleList {
    constructor(data) {
        // Nothing needed for this very simple class, starts off as an empty object
    }

    // THEN ... we use the add method to add one person to it, using the WikiTree ID as the key
    add(newPerson) {
        if (newPerson && newPerson.Id) {
            this[newPerson.Id] = new WikiTreeAPI.Person(newPerson);
        }
    }

    // A simple function to List All people in the collection to the console.log (for debugging purposes)
    listAll() {
        let numPeeps = 0;

        for (const key in this) {
            if (Object.hasOwnProperty.call(this, key)) {
                const element = this[key];
                // console.log(key );
                numPeeps++;
            }
        }
        console.log("There are ", numPeeps, " in PeopleCollection");
    }

    // A similar List function to create an Array of Person objects to feed to the d3 Tree function
    listAllPersons() {
        let numPeeps = 0;
        let theListOfPersons = [];
        for (const key in this) {
            if (Object.hasOwnProperty.call(this, key)) {
                const element = this[key];
                numPeeps++;
                element._data.ahnNum = numPeeps;
                theListOfPersons.push(element);
                // console.log("Add to list: ",key , element);
            }
        }
        // console.log("There are ",numPeeps," in PeopleCollection");
        return theListOfPersons;
    }
};

// CREATE the INSTANCE of the PeopleCollection, call it thePeopleList, and refer to it as such throughout the views that use this
var thePeopleList = new PeopleCollection.PeopleList();

// console.log(thePeopleList);
// thePeopleList.listAll();
