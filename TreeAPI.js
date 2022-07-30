/*
 * TreeAPI.js
 *
 * Provide a "Person" object where data is gathered from the WikiTree API.
 * We use the WikiTree API action "getPerson" to retrieve the profile data and then store it in object fields.
 *
 */

// Set localTesting to true if you run this from your desktop. This would require that you have installed a browser
// extension to fiddle with CORS permissions, like the following one for Chrome
//     https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf
// Setting this to true also enables a lot of logging to the console.
const localTesting = false;
const logit = localTesting || false	// changing false to true allows one to turn on logging even if not local testing

// Put our functions into a "WikiTreeAPI" namespace.
window.WikiTreeAPI = window.WikiTreeAPI || {};

// Our basic constructor for a Person. We expect the "person" data from the API returned result
// (see getPersonViaAPI below). The basic fields are just stored in the internal _data array.
// We pull out the Parent and Child elements as their own Person objects.
WikiTreeAPI.Person = class Person {
	constructor(data) {
		this._data = data;
		let name = this.getDisplayName();
		condLog(`New person data: for ${this.getId()}: ${name} (${getRichness(data)})`, data)

		if (data.Parents) {
			condLog(`Setting parents for ${this.getId()}: ${name}...`)
			for (let p in data.Parents) {
				this._data.Parents[p] = WikiTreeAPI.makePerson(data.Parents[p]);
			}
		}

		this.setSpouses(data);

		if (data.Children) {
			condLog(`Setting children for ${this.getId()}: ${name}`)
			for (let c in data.Children) {
				this._data.Children[c] = WikiTreeAPI.makePerson(data.Children[c]);
			}
		}

		this._data.noMoreSpouses = data.DataStatus ? data.DataStatus.Spouse == 'blank' : false;
	};

	setSpouses(data) {
		this._data.FirstSpouseId = undefined
		if (data.Spouses) {
			condLog(`setSpouses for ${this.getId()}: ${this.getDisplayName()}: ${summaryOfPeople(data.Spouses)}`, data.Spouses)
			let list = [];
			for (let s in data.Spouses) {
				list.push(WikiTreeAPI.makePerson(data.Spouses[s]));
			}
			sortByMarriageDate(list);
			if (list.length > 0) {
				this._data.FirstSpouseId = list[0].getId();
				for (let spouse of list) {
					this._data.Spouses[spouse.getId()] = spouse;
				}
			}
		}
	}

	copySpouses(person) {
		this._data.FirstSpouseId = person._data.FirstSpouseId
		this._data.Spouses = person._data.Spouses
	}

	// Basic "getters" for the data elements.
	getId() { return this._data.Id; }
	getName() { return this._data.Name; }
	getGender() { return this._data.Gender; }
	isMale() { return this.getGender() == 'Male'; }
	isFemale() { return this.getGender() == 'Female'; }
	isEnriched() { return this._data.Parents && this._data.Spouses && this._data.Children; }
	getBirthDate() { return this._data.BirthDate; }
	getBirthLocation() { return this._data.BirthLocation; }
	getDeathDate() { return this._data.DeathDate; }
	getDeathLocation() { return this._data.DeathLocation; }
	getChildren() { return this._data.Children; }
	getFatherId() { return this._data.Father; }
	getMotherId() { return this._data.Mother; }
	hasAParent() { return this.getFatherId() || this.getMotherId(); }
	hasNoSpouse() { return this._data.Spouses && this._data.noMoreSpouses && this._data.Spouses.length == 0; }
	getDisplayName() { return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate; }
	getPhotoUrl() {
		if (this._data.PhotoData && this._data.PhotoData['url']) {
			return this._data.PhotoData['url'];
		}
	}
	// Getters for Mother and Father return the Person objects, if there is one.
	// The getMotherId and getFatherId functions above return the actual .Mother and .Father data elements (ids).
	getMother() {
		if (this._data.Mother && this._data.Parents) {
			return this._data.Parents[this._data.Mother];
		}
	};
	getFather() {
		if (this._data.Father && this._data.Parents) {
			return this._data.Parents[this._data.Father];
		}
	};
	hasSpouse() { return this._data.Spouses && this._data.FirstSpouseId; }
	getSpouses() { return this._data.Spouses; }
	getSpouse(id) {
		if (id) {
			if (this._data.Spouses) {
				return this._data.Spouses[id];
			}
			return undefined;
		}
		if (this.hasSpouse()) {
			return this._data.Spouses[this._data.FirstSpouseId];
		}
		if (this.hasNoSpouse()) {
			return NoSpouse;
		}
		return undefined;
	};
	getRichness() {
		return getRichness(this._data);
	}

	// We use a few "setters". For the parents, we want to update the Parents Person objects as well as the ids themselves.
	// For TreeViewer we only set the parents and children, so we don't need setters for all the _data elements.
	setMother(person) {
		let id = person.getId();
		let oldId = this._data.Mother;
		this._data.Mother = id;
		if (!this._data.Parents) { this._data.Parents = {}; }
		else if (oldId) { delete this._data.Parents[oldId]; }
		this._data.Parents[id] = person;
	};
	setFather(person) {
		let id = person.getId();
		let oldId = this._data.Father;
		this._data.Father = id;
		if (!this._data.Parents) { this._data.Parents = {}; }
		else if (oldId) { delete this._data.Parents[oldId]; }
		this._data.Parents[id] = person;
	};
	setChildren(children) {
		this._data.Children = children;
	}

	refreshFrom(newPerson) {
		if (this.isEnriched()) {
			console.error(`Suspect Person.refreshFrom called for already enriched ${this.toString()}`)
		}
		if (!isSameOrHigherRichness(newPerson._data, this._data)) {
			console.error(`Suspect Person.refreshFrom called on ${this.toString()} for less enriched ${newPerson.toString()}`)
		}
		let mother = newPerson.getMother();
		let father = newPerson.getFather();

		if (mother) {
			this.setMother(mother);
		}
		if (father) {
			this.setFather(father);
		}
		if (newPerson.hasSpouse()) {
			this.copySpouses(newPerson);
		}
		this.setChildren(newPerson.getChildren());
	}

	toString() {
		return `${this.getId()}: ${this.getDisplayName()} (${this.getRichness()})`;
	}
}

class NullPerson extends WikiTreeAPI.Person{
	constructor(){
		super({Id: '0000', Children: [], DataStatus: {Spouse: 'blank'}});
		this.isNoSpouse = true;
	}
	toString() { return 'No Spouse'; }
}

const NoSpouse = new NullPerson();
const peopleCache = new Map();
WikiTreeAPI.clearCache = function () {
	peopleCache.clear();
}

/**
 * Return a promise of a person object with the given id via an API call.
 * However, if an enriched person with the given id already exists in our cache,
 * rather return the cached value in the promise rather than making a new API call.
 */
WikiTreeAPI.getPerson = async function (id, fields) {
	let cachedPerson = peopleCache.get(id);
	if (cachedPerson && cachedPerson.isEnriched()) {
		condLog(`getPerson from cache ${cachedPerson.toString()}`)
		return new Promise((resolve, reject) => { resolve(cachedPerson); });
	}

	const newPerson = await WikiTreeAPI.getPersonViaAPI(id, fields);
	condLog(`getPerson caching ${newPerson.toString()}`);
	peopleCache.set(id, newPerson);
	return newPerson;
}

WikiTreeAPI.getWithoutChildren = async function (id) {
	return WikiTreeAPI.getPerson(id, REQUIRED_FIELDS_NO_CHILDREN);
};

WikiTreeAPI.getSpouseAndChildrenNames = async function (id) {
	let cachedPerson = peopleCache.get(id);
	if (cachedPerson && cachedPerson.getChildren() && cachedPerson.getSpouses()) {
		condLog(`getSpouseAndChildrenNames from cache ${cachedPerson.toString()}`)
		return new Promise((resolve, reject) => { resolve(cachedPerson); });
	}

	const result = await WikiTreeAPI.fetchViaAPI({
		'action': 'getRelatives',
		'keys': id,
		'fields': 'Id,Name,FirstName,LastName,Derived.BirthName,Derived.BirthNamePrivate,LastNameAtBirth,MiddleInitial,BirthDate,DeathDate',
		'getChildren': 1,
		'getSpouses': 1
	} );
	//condLog('>>>Creating new Person from getSpouseAndChildrenNames...')
	return new WikiTreeAPI.Person(result[0].items[0].person);
}

/**
 * Construct a person object from the given data object rerieved via an API call.
 * However, if an enriched person with the given id already exists in our cache,
 * rather return the cached value.
 */
WikiTreeAPI.makePerson = function (data) {
	let id = data.Id;
	let cachedPerson = peopleCache.get(id);
	if (cachedPerson && (cachedPerson.isEnriched() || isSameOrHigherRichness(cachedPerson._data, data))) {
		condLog(`makePerson from cache ${cachedPerson.toString()}`)
		return cachedPerson;
	}

	let newPerson = new WikiTreeAPI.Person(data);
	condLog(`makePerson caching ${newPerson.toString()}`)
	peopleCache.set(id, newPerson);
	return newPerson;
}

const REQUIRED_FIELDS = [
	'Id',
	'Derived.BirthName',
	'Derived.BirthNamePrivate',
	'FirstName',
	'MiddleInitial',
	'LastNameAtBirth',
	'BirthDate',
	'BirthLocation',
	'DeathDate',
	'DeathLocation',
	'Mother',
	'Father',
	'DataStatus',
	'Parents',
	'Spouses',
	'Children',
	'Photo',
	'Name',
	'Gender'
];
const REQUIRED_FIELDS_NO_CHILDREN = REQUIRED_FIELDS.filter(item => item != 'Children');

// To get a Person for a given id, we POST to the API's getPerson action. When we get a result back,
// we convert the returned JSON data into a Person object.
// Note that fetchViaAPI returns the Promise from JavaScript's fetch() call.
// That feeds our .then() here, which also returns a Promise, which gets resolved by the return inside the "then" function.
// So we can use this through our asynchronous actions with something like:
//    WikiTree.getPersonViaAPI.then(function(result) {
//       // the "result" here is that from our API call. The profile data is in result[0].person.
// 	  });
//
WikiTreeAPI.getPersonViaAPI = async function(id,fields=REQUIRED_FIELDS) {
	const result = await WikiTreeAPI.fetchViaAPI(
		{ 'action': 'getPerson', 'key': id, 'fields': fields.join(','), 'resolveRedirect': 1 });
	return new WikiTreeAPI.Person(result[0].person);
}


WikiTreeAPI.fetchViaAPI = async function (postData) {
	// condLog(`-----Fetch via API, key=${postData.key ? postData.key : postData.keys}`, postData.fields)
	let formData = new FormData();
	for (var key in postData) {
		formData.append(key, postData[key]);
	}
	let options = {
		method: 'POST',
		credentials: localTesting ? 'omit' : 'include',
		headers: {
		    'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams(formData)
	}
	const response = await fetch('https://api.wikitree.com/api.php', options)
	if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}: ${response.statusText}`);
	}
	return await response.json();
}

// Utility function to get/set cookie data.
// Adapated from https://github.com/carhartl/jquery-cookie which is obsolete and has been
// superceded by https://github.com/js-cookie/js-cookie. The latter is a much more complete cookie utility.
// Here we just want to get and set some simple values in limited circumstances to track an API login.
// So we'll use a stripped-down function here and eliminate a prerequisite. This function should not be used
// in complex circumstances.
//
// key     = The name of the cookie to set/read. If reading and no key, then array of all key/value pairs is returned.
// value   = The value to set the cookie to. If undefined, the value is instead returned. If null, cookie is deleted.
// options = Used when setting the cookie,
//           options.expires = Date or number of days in the future (converted to Date for cookie)
//           options.path, e.g. "/"
//           options.domain, e.g. "apps.wikitree.com"
//           options.secure, if true then cookie created with ";secure"
WikiTreeAPI.cookie = function (key, value, options) {
	if (options === undefined) { options = {}; }

	// If we have a value, we're writing/setting the cookie.
	if (value !== undefined) {
		if (value === null) { options.expires = -1; }
		if (typeof options.expires === 'number') {
			let days = options.expires;
			options.expires = new Date();
			options.expires.setDate(options.expires.getDate() + days);
		}
		value = String(value);
		return (document.cookie = [
			encodeURIComponent(key), '=', value,
			options.expires ? '; expires=' + options.expires.toUTCString() : '',
			options.path ? '; path=' + options.path : '',
			options.domain ? '; domain=' + options.domain : '',
			options.secure ? '; secure' : ''
		].join(''));
	}

	// We're not writing/setting the cookie, we're reading a value from it.
	let cookies = document.cookie.split('; ');

	let result = key ? null : {};
	for (let i = 0, l = cookies.length; i < l; i++) {
		let parts = cookies[i].split('=');
		let name = parts.shift();
		name = decodeURIComponent(name.replace(/\+/g, ' '));
		let value = parts.join('=');
		value = decodeURIComponent(value.replace(/\+/g, ' '));

		if (key && key === name) {
			result = value;
			break;
		}
		if (!key) {
			result[name] = value;
		}

	}
	return result;
}

/**
 * Sort a list of Person objects by their marriage date.
 * A person with no marriage date is placed at the end.
 */
function sortByMarriageDate(list) {
	list.sort((a, b) => {
		const aYear = a._data.marriage_date ? a._data.marriage_date.split('-')[0] : 9999;
		const bYear = b._data.marriage_date ? b._data.marriage_date.split('-')[0] : 9999;

		return aYear - bYear;
	});
}

function getRichness(data) {
	let r = 0;
	if (data.Parents) { r = r | 0b100 }
	if (data.Spouses) { r = r | 0b010 }
	if (data.Children) { r = r | 0b001 }
	return r;
}

function getRichnessCount(data) {
	let c = 0;
	if (data.Parents) { c += 1 }
	if (data.Spouses) { c += 1 }
	if (data.Children) { c += 1 }
	return c;
}

function isSameOrHigherRichness(a, b) {
	return (getRichness(a) ^ getRichness(b)) == 0 || (getRichnessCount(a) > getRichnessCount(b));
}

// ===================================================================
// Functions used in debug logging

function personSummary(data) {
	return `${data.Id}: ${data.BirthName} (${getRichness(data)})`
}

function summaryOfPeople(people) {
	let result = '';
	for (let i in people) {
		if (result.length > 0) { result = result.concat(','); }
		result = result.concat(personSummary(people[i]));
	}
	return result;
}

function condLog(...args) {
	if (logit) {
		console.log.apply(null, args)
	}
}
