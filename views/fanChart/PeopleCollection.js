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
            // condLog("Adding: ", newPerson.Id);
            this[newPerson.Id] = new WikiTreeAPI.Person(newPerson);
        } else {
            condLog("Can't add newPerson: ", newPerson);
        }
    }

    // OR ... we use the add method if it's a new person, else we update the person
    addOrUpdate(newPerson) {
        if (newPerson && newPerson.Id) {
            // condLog("Adding: ", newPerson.Id);
            if (!this[newPerson.Id]) {
                this.add(newPerson);
            } else {
                condLog("Need to UPDATE peeps ", newPerson, "in", this[newPerson.Id]);
                for (const key in newPerson) {
                    this[newPerson.Id]._data[key] = newPerson[key];
                }
            }
        } else {
            condLog("Can't add newPerson: ", newPerson);
        }
    }

    // OR ... we only use the add method if it's a new person, else we ignore the request
    addIfNeeded(newPerson) {
        if (newPerson && newPerson.Id) {
            // condLog("Adding: ", newPerson.Id);
            if (!this[newPerson.Id]) {
                this.add(newPerson);
            } else {
                condLog("Don't need to add new peeps ", newPerson, " - already there - ", this[newPerson.Id]);
            }
        } else {
            condLog("Can't add newPerson: ", newPerson);
        }
    }
    

    // A simple function to Count all the  people in the collection to the condLog (for debugging purposes)
    population() {
        let numPeeps = 0;

        for (const key in this) {
            if (Object.hasOwnProperty.call(this, key)) {
                numPeeps++;
            }
        }
        condLog("There are ", numPeeps, " in PeopleCollection");
        return numPeeps;
    }

    // A simple function to List All people in the collection to the condLog (for debugging purposes)
    listAll() {
        let numPeeps = 0;

        for (const key in this) {
            if (Object.hasOwnProperty.call(this, key)) {
                const element = this[key];
                // condLog(key );
                numPeeps++;
            }
        }
        condLog("There are ", numPeeps, " in PeopleCollection");
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
                // condLog("Add to list: ",key , element);
            }
        }
        // condLog("There are ",numPeeps," in PeopleCollection");
        return theListOfPersons;
    }
};

// CREATE the INSTANCE of the PeopleCollection, call it thePeopleList, and refer to it as such throughout the views that use this
var thePeopleList = new PeopleCollection.PeopleList();

// condLog(thePeopleList);
// thePeopleList.listAll();
