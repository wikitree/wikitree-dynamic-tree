/*
 * TreeAPI.js
 *
 * Provide a "Person" object where data is gathered from the WikiTree API.
 * We use the WikiTree API action "getPerson" to retrieve the profile data and then store it in object fields.
 *
 */


// Put our functions into a "WikiTreeAPI" namespace.
window.WikiTreeAPI = window.WikiTreeAPI || {};

// Our basic constructor for a Person. We expect the "person" data from the API returned result
// (see getPersonViaAPI below). The basic fields are just stored in the internal _data array.
// We pull out the Parent and Child elements as their own Person objects.
WikiTreeAPI.Person = function(data){
	let self = this;
	this._data = data;
	let name = data.BirthName;
	//consLog(`New person data ${data.Id}: ${data.BirthName}`, data)
	condLog(`New person data: for ${name} (${getRichness(data)})`, data)

	if(data.Parents){
		condLog(`Setting parents for ${name}`)
		for(var p in data.Parents){
			self._data.Parents[p] = WikiTreeAPI.makePerson(data.Parents[p]);
		}
	}

	self.setSpouses(data);

	if(data.Children){
		condLog(`Setting children for ${name}`)
		for(var c in data.Children){
			self._data.Children[c] = WikiTreeAPI.makePerson(data.Children[c]);
		}
	}
	this._data.noMoreSpouses = data.DataStatus.Spouse == 'blank';
	// consLog('Person created:', this._data)
};

WikiTreeAPI.Person.prototype.setSpouses = function(data) {
	let self = this;
	self._data.FirstSpouseId = undefined
	if(data.Spouses) {
		condLog(`setSpouses for ${data.BirthName}: ${summaryOfPeople(data.Spouses)}`, data.Spouses)
		let list = [];
		for(let s in data.Spouses) {
			list.push(WikiTreeAPI.makePerson(data.Spouses[s]));
		}
		sortByMarriageDate(list);
		if (list.length > 0) {
			self._data.FirstSpouseId = list[0].getId();
			for (let i in list) {
				let spouse = list[i];
				self._data.Spouses[spouse.getId()] = spouse;
			}
		}
	}
}

WikiTreeAPI.Person.prototype.copySpouses = function(person) {
	this._data.FirstSpouseId = person._data.FirstSpouseId
	this._data.Spouses = person._data.Spouses
}

// Basic "getters" for the data elements.
WikiTreeAPI.Person.prototype.getId = function() { return this._data.Id; }
WikiTreeAPI.Person.prototype.getName = function() { return this._data.Name; }
WikiTreeAPI.Person.prototype.getGender = function() { return this._data.Gender; }
WikiTreeAPI.Person.prototype.isMale = function() { return this.getGender() == 'Male'; }
WikiTreeAPI.Person.prototype.isFemale = function() { return this.getGender() == 'Female'; }
WikiTreeAPI.Person.prototype.isEnriched = function() { return this._data.Parents && this._data.Spouses && this._data.Children; }
WikiTreeAPI.Person.prototype.getBirthDate = function() { return this._data.BirthDate; }
WikiTreeAPI.Person.prototype.getBirthLocation = function() { return this._data.BirthLocation; }
WikiTreeAPI.Person.prototype.getDeathDate = function() { return this._data.DeathDate; }
WikiTreeAPI.Person.prototype.getDeathLocation = function() { return this._data.DeathLocation; }
WikiTreeAPI.Person.prototype.getChildren = function() { return this._data.Children; }
WikiTreeAPI.Person.prototype.getFatherId = function() { return this._data.Father; }
WikiTreeAPI.Person.prototype.getMotherId = function() { return this._data.Mother; }
WikiTreeAPI.Person.prototype.hasAParent = function() { return this.getFatherId() || this.getMotherId(); }
WikiTreeAPI.Person.prototype.hasNoSpouse = function() { return this._data.Spouses && this._data.noMoreSpouses && this._data.Spouses.length == 0; }
WikiTreeAPI.Person.prototype.getDisplayName = function() { return this._data.BirthName ? this._data.BirthName : this._data.BirthNamePrivate; }
WikiTreeAPI.Person.prototype.getPhotoUrl = function() {
	if (this._data.PhotoData && this._data.PhotoData['url']) {
		return this._data.PhotoData['url'];
	}
}
// Getters for Mother and Father return the Person objects, if there is one.
// The getMotherId and getFatherId functions above return the actual .Mother and .Father data elements (ids).
WikiTreeAPI.Person.prototype.getMother = function() {
	if (this._data.Mother && this._data.Parents) {
		return this._data.Parents[this._data.Mother];
	}
};
WikiTreeAPI.Person.prototype.getFather = function() {
	if (this._data.Father && this._data.Parents) {
		return this._data.Parents[this._data.Father];
	}
};
WikiTreeAPI.Person.prototype.hasSpouse = function() { return this._data.Spouses && this._data.FirstSpouseId; }
WikiTreeAPI.Person.prototype.getSpouses = function() { return this._data.Spouses; }
WikiTreeAPI.Person.prototype.getSpouse = function() {
	var self = this;
	if (this.hasSpouse()) {
		return self._data.Spouses[self._data.FirstSpouseId];
	}
	if (this.hasNoSpouse()) {
		return NoSpouse;
	}
	return undefined;
};
WikiTreeAPI.Person.prototype.getRichness = function() {
	return getRichness(this._data);
}

// We use a few "setters". For the parents, we want to update the Parents Person objects as well as the ids themselves.
// For TreeViewer we only set the parents and children, so we don't need setters for all the _data elements.
WikiTreeAPI.Person.prototype.setMother = function(person) {
	var id = person.getId();
	var oldId = this._data.Mother;
	this._data.Mother = id;
	if (!this._data.Parents) { this._data.Parents = {}; }
	else if (oldId) { delete this._data.Parents[oldId]; }
	this._data.Parents[id] = person;
};
WikiTreeAPI.Person.prototype.setFather = function(person) {
	var id = person.getId();
	var oldId = this._data.Father;
	this._data.Father = id;
	if (!this._data.Parents) { this._data.Parents = {}; }
	else if (oldId) { delete this._data.Parents[oldId]; }
	this._data.Parents[id] = person;
};
WikiTreeAPI.Person.prototype.setChildren = function(children) { this._data.Children = children; }

WikiTreeAPI.Person.prototype.refreshFrom = function(newPerson){
	if (this.isEnriched()) {
		console.error(`Suspect refreshFrom called for already enriched ${this.toString()}`)
	}
	if (!newPerson.isEnriched()) {
		console.error(`Suspect refreshFrom called for from un-enriched ${this.toString()}`)
	}
	var mother = newPerson.getMother();
	var father = newPerson.getFather();

	if(mother){
		this.setMother(mother);
	}
	if(father){
		this.setFather(father);
	}
	if (newPerson.hasSpouse()) {
		this.copySpouses(newPerson);
	}
	this.setChildren(newPerson.getChildren());
}

WikiTreeAPI.Person.prototype.toString = function() {
	return `${this.getId()}: ${this._data.BirthName} (${this.isEnriched() ? '*' : this.getRichness()})`;
}

const NoSpouse = {
	isNoSpouse: true,
	getId: function() { return '0000';},
	isFemale: function() { return false;},
	isMale: function() { return false;},
}

const peopleCache = new Map();
WikiTreeAPI.clearCache = function() {
	peopleCache.clear();
}

/**
 * Return a promise of a person object with the given id via an API call.
 * However, if an enriched person with the given id already exists in our cache,
 * rather return the cached value in the promise rather than making a new API call.
 */
 WikiTreeAPI.getPerson = function(id, fields) {
	let cachedPerson = peopleCache.get(id);
	if (cachedPerson && cachedPerson.isEnriched()) {
		condLog(`getPerson from cache ${cachedPerson.toString()}`)
		return new Promise((resolve, reject) => {resolve(cachedPerson);});
	}

	return WikiTreeAPI.getPersonViaAPI(id, fields).then(function(newPerson){
		condLog(`getPerson caching ${newPerson.toString()}`)
		peopleCache.set(id, newPerson);
		return newPerson;
	});
}

/**
 * Construct a person object from the given data object rerieved via an API call.
 * However, if an enriched person with the given id already exists in our cache,
 * rather return the cached value.
 */
WikiTreeAPI.makePerson = function(data) {
	let id = data.Id;
	let cachedPerson = peopleCache.get(id);
	if (cachedPerson && (cachedPerson.isEnriched() || isSameRichness(cachedPerson._data, data))) {
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
	'LastNameCurrent',
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
	'Gender',
	'Privacy'
];

// To get a Person for a given id, we POST to the API's getPerson action. When we get a result back,
// we convert the returned JSON data into a Person object.
// Note that postToAPI returns the Promise from jquery's .ajax() call.
// That feeds our .then() here, which also returns a Promise, which gets resolved by the return inside the "then" function.
// So we can use this through our asynchronous actions with something like:
//    WikiTree.getPersonViaAPI.then(function(result) {
//       // the "result" here is that from our API call. The profile data is in result[0].person.
// 	  });
//
WikiTreeAPI.getPersonViaAPI = function(id,fields=REQUIRED_FIELDS) {
	return WikiTreeAPI.postToAPI( { 'action': 'getPerson', 'key': id, 'fields': fields.join(','), 'resolveRedirect': 1 } )
		.then(function(result) {
			//condLog('getPersonViaAPI return data', result[0].person)
			return new WikiTreeAPI.Person(result[0].person);
		});
}

// This is just a wrapper for the Ajax call, sending along necessary options for the WikiTree API.
WikiTreeAPI.postToAPI = function(postData) {
	var API_URL = 'https://api.wikitree.com/api.php';

	// let f = [];
	// if (postData.fields) {f = postData.fields.split(',')}
	// condLog(`postToAPI: ${postData.action} ${postData.key}`, f)
	var ajax = $.ajax({
		// The WikiTree API endpoint
		'url': API_URL,

		// We tell the browser to send any cookie credentials we might have (in case we authenticated).
		'xhrFields': { withCredentials: false },

		// We're POSTing the data so we don't worry about URL size limits and want JSON back.
		type: 'POST',
		dataType: 'json',
		data: postData
	});

	return ajax;
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
WikiTreeAPI.cookie = function(key, value, options) {
	if (options === undefined) { options = {}; }

	// If we have a value, we're writing/setting the cookie.
	if (value !== undefined) {
		if (value === null) { options.expires = -1; }
		if (typeof options.expires === 'number') {
			var days = options.expires;
			options.expires = new Date();
			options.expires.setDate(options.expires.getDate() + days);
		}
		value = String(value);
		return (document.cookie = [
			encodeURIComponent(key), '=', value,
			options.expires ? '; expires=' + options.expires.toUTCString() : '',
			options.path    ? '; path=' + options.path : '',
			options.domain  ? '; domain=' + options.domain : '',
			options.secure  ? '; secure' : ''
		].join(''));
	}

	// We're not writing/setting the cookie, we're reading a value from it.
	var cookies = document.cookie.split('; ');

	var result = key ? null : {};
	for (var i=0,l=cookies.length; i<l; i++) {
		var parts = cookies[i].split('=');
		var name = parts.shift();
		name = decodeURIComponent(name.replace(/\+/g, ' '));
		var value = parts.join('=');
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
 * Sort a list of Person objects by their marriage data.
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

function isSameRichness(a, b) {
	return (getRichness(a) ^ getRichness(b)) == 0;
}

// ===================================================================
// Functions used in debug logging

function personSummary(data) {
	return `${data.BirthName} (${getRichness(data)})`
}

function summaryOfPeople(collection) {
	let result = '';
	for (let i in collection) {
		if (result.length > 0) {result = result.concat(',');}
		result = result.concat(personSummary(collection[i]));
	}
	return result;
}

const logit = false;
function condLog(...args) {
	if (logit) {
		console.log.apply(null, args)
	}
}
