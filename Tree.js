/*
 * Tree.js
 * 
 * This is the general JS run in index.html. This handles a couple of functions:
 * A) Logins to the WikiTree API.
 *    Some views (or views of particular profiles) will require the user be logged into the API.
 *    The view page (i.e. index.html) should have a form/button that posts to the clientLogin action of the API,
 *    with a returnURL back to the viewed page. The code here handles checking the auth code that comes back,
 *    and saving the API username and ID in cookies so that the page knows the user is logged in.
 * 
 * B) New Tree/Start-Profile selection
 *    Each Tree is a separate view, built into the id="treeViewerContainer" div. There's a selection element
 *    that lets the user select a new view. When the "Go" button there is clicked, newTree() is called. That
 *    pulls out the tree view id from the selected option and then switches the display to that view with launchTree().
 * 
 *    Similarly, a new starting profile can be selected by providing a new WikiTree ID and clicking the associated "Go" button.
 *    The same newTree() function is called, followed by launchTree() if we have a selected tree and profile.
 * 
 * To add a new view to the dynamic tree:
 *    - Add a new <option> to the selection field in index.html
 *    - Add the appropriate code to launch/display the view in launchTree(). 
 * 
 */

<<<<<<< HEAD
$(document).ready(function () {
=======
class View {
	constructor() {
		Object.assign(this, this?.meta())
	}

	meta(){
		return {
			'id': 'template',
			'title': "Template view",
			'description': 'Showcase of the views and their registration.',
			'docs': 'https://example.com'
		}
	}

	render(person_id){
		return `Template View for person with ID: ${person_id}`
	}
}

class TemplateView extends View {
}

class WTDynamicTree extends View {
	meta() {
		return {
			'id': 'wt-dynamic-tree',
			'title': "Dynamic Tree",
			'description': 'Click on the tree and use your mouse wheel to zoom. Click and drag to pan around.',
			'docs': 'https://www.WikiTree.com/wiki/Dynamic_Tree'
		}
	}

	render(person_id){
		return `Dynamic Tree View for person with ID: ${person_id}`
	}
}
class ViewsRegistry {
	VIEW_SELECT_ID = 'view-select'
	WT_ID_TEXT_ID = 'wt-id-text'
	SHOW_BTN = 'show-btn'
	VIEW_CONTAINER_ID = "view-container"
	VIEW_TITLE_ID = 'view-title'
	VIEW_DESCRIPTION_ID = 'view-description'
	NAME_PLACEHOLDER = 'name-placeholder'
	WT_ID_LINK = 'wt-id-link'
	VIEW_LOADER_ID = 'view-loader'
	PERSON_NOT_FOUND_ID = 'person-not-found'

	views = {}

	constructor(views, container_id) {
		views.forEach(view => this.views[view.id] = view);

		this.container = document.querySelector(`#${container_id}`)
	}

	render() {
		const options = "" //"<option>Select a View</option>"
			+ Object.keys(this.views).map(id => `<option value="${id}">${this.views[id].title}</option>`).join('')

		this.container.innerHTML = `
			<p>Select a View and a Starting Profile:</p>
			<select id="${this.VIEW_SELECT_ID}">${options}</select>
			<input id="${this.WT_ID_TEXT_ID}" type="text" value="Vašut-2">
			<input id="${this.SHOW_BTN}" type="button" value="GO" />
			<div id="${this.VIEW_LOADER_ID}" class="hidden">Loading...</div>
			<div id="${this.PERSON_NOT_FOUND_ID}" class="hidden">Person not found</div>
			<div class="hidden">
				<h2>
					<span id="${this.VIEW_TITLE_ID}"></span> for 
					<span id="${this.NAME_PLACEHOLDER}"></span>
				</h2>
				<p>WikiTree profile page: <a id="${this.WT_ID_LINK}" target="_blank"></a></p>
				<p id="${this.VIEW_DESCRIPTION_ID}"></p>
				<div id="${this.VIEW_CONTAINER_ID}"></div>
			</div>
			`

		document.querySelector(`#${this.SHOW_BTN}`).addEventListener('click', e => this.onSubmit(e))
	}

	onSubmit(e) {
		const wtID = document.querySelector(`#${this.WT_ID_TEXT_ID}`).value
		const view = this.views[document.querySelector(`#${this.VIEW_SELECT_ID}`).value]
		const parentContainer = document.querySelector(`#${this.NAME_PLACEHOLDER}`).closest('div')
		const viewLoader = document.querySelector(`#${this.VIEW_LOADER_ID}`)		
		const notFound = document.querySelector(`#${this.PERSON_NOT_FOUND_ID}`)
		const viewContainer = document.querySelector(`#${this.VIEW_CONTAINER_ID}`)

		if (view === undefined)
			return

		viewLoader.classList.remove('hidden')

		const basicFields = ["Id", "Name", "FirstName", "LastName", "Derived.BirthName", "Derived.BirthNamePrivate"]

		try {
			WikiTreeAPI.postToAPI({ 'action': 'getPerson', 'key': wtID, 'fileds': basicFields.join() }).then(data => {
				if (data[0]['person']) {
					this.fillData(view, data[0]['person'])
					
					viewContainer.innerHTML = view.render(data[0]['person']['Id'])

					notFound.classList.add('hidden')
					parentContainer.classList.remove('hidden')
				} else {
					parentContainer.classList.add('hidden')
					notFound.classList.remove('hidden')
				}
			})
		} finally {
			viewLoader.classList.add('hidden')
		}
	}

	fillData(view, person) {
		const wtLink = document.querySelector(`#${this.WT_ID_LINK}`)
		const viewTitle = document.querySelector(`#${this.VIEW_TITLE_ID}`)
		const viewDescription = document.querySelector(`#${this.VIEW_DESCRIPTION_ID}`)
		const name = document.querySelector(`#${this.NAME_PLACEHOLDER}`)

		wtLink.href = `https://www.WikiTree.com/wiki/${person.Name}`
		wtLink.innerHTML = person.Name

		viewTitle.innerHTML = view.title
		viewDescription.innerHTML = view.description
		name.innerHTML = person.BirthName ? person.BirthName : person.BirthNamePrivate
	}
}

$(document).ready(function () {

	const v = new ViewsRegistry([
		new TemplateView(),
		new WTDynamicTree()
	], 'views')
	v.render()

>>>>>>> 9a6aaff (Simplify views registration - basic draft)
	// In order to view non-public profiles, the user must be logged into the WikiTree API.
	// That's on a separate hostname, so while the credentials are the same for the user, the browser doesn't carry over a login from WikiTree.com.
	// If the user is not yet logged into the API, there's a button they can use to log in through API clientLogin().
	// When there's a successful login, we store this status in a cookie so future loads of this page don't have to repeat it.
	// See: https://github.com/wikitree/wikitree-api/blob/main/authentication.md

	// We want the API login process to return back where we started.
	$('#returnURL').val(window.location.href);

	// We store userName and userId of the logged-in user locally in a cookie, so we know on return that
	// the user is signed in (and so we can use it as a default starting point for tree views).
	var userName = WikiTreeAPI.cookie('WikiTreeAPI_userName');
	var userId = WikiTreeAPI.cookie('WikiTreeAPI_userId');

	// We also track the last treeId the user was viewing and the starting personId in case they return from elsewhere.
	var viewTreeId = WikiTreeAPI.cookie('viewTreeId');
	var viewTreePersonId = WikiTreeAPI.cookie('viewTreePersonId');
	var viewTreePersonName = WikiTreeAPI.cookie('viewTreePersonName');

	// If we've arrived with an "authcode", it's the redirect back from the API clientLogin(), and we should
	// verify the code and then redirect back to ourselves to clear out the parameter.
	var u = new URLSearchParams(window.location.search)
	var authcode = u.get('authcode');

	if ((typeof (userName) != 'undefined') && (userName != null) && (userName != '')) {
		// According to our saved cookie, we have a user that is logged into the API.
		// Update the login div with a status instead of the button.
		$('#getAPILogin').html("Logged into API: " + userName);

		// Display our tree. If we don't have one, use the wikitree-dynamic-tree as a default.
		// If we have a cookie-saved starting personId, use that, otherwise start with the logged-in user's id.
		if ((typeof (viewTreeId) == 'undefined') || !viewTreeId) {
			viewTreeId = 'wikitree-dynamic-tree';
		}
		if ((typeof (viewTreePersonId) == 'undefined') || !viewTreePersonId) {
			viewTreePersonId = userId;
			viewTreePersonName = userName;
		}

		// Launch our desired tree on page load.
		launchTree(viewTreeId, viewTreePersonId, viewTreePersonName);

	}
	else if ((typeof authcode != 'undefined') && (authcode != null) && (authcode != '')) {
		// We have an auth code to confirm. Show our interim message div while we do.
		// This is very brief; one the clientLogin() returns we redirect back to ourselves.
		$('#confirmAuth').show();
		WikiTreeAPI.postToAPI({ 'action': 'clientLogin', 'authcode': authcode })
			.then(function (data) {
				if (data.clientLogin.result == 'Success') {
					WikiTreeAPI.cookie('WikiTreeAPI_userName', data.clientLogin.username, { 'path': '/' });
					WikiTreeAPI.cookie('WikiTreeAPI_userId', data.clientLogin.userid, { 'path': '/' });
					var urlPieces = [location.protocol, '//', location.host, location.pathname]
					var url = urlPieces.join('');
					window.location = url;
				} else {
					// The login at the API failed. We should have a friendlier error here.
					alert('API login failure');
					$('#confirmAuth').hide();
				}
			});
	}
	else if (viewTreePersonId && viewTreePersonName && viewTreeId) {
		// If there's no auth code to process, and no user id to check, we can just try displaying the current view.
		launchTree(viewTreeId, viewTreePersonId, viewTreePersonName);
	}
	else {
		// No tree to launch!
	}
});

/*
 * Given a viewTreeId, we have different code to instantiate that particular view, using the
 * id or name (WikiTree ID) of the starting profile.
 * 
 */
function launchTree(viewTreeId, viewTreePersonId, viewTreePersonName) {
	// Grab the new view options - the id of the selected view and the starting profile. Save these in cookies,
	// so we can return to this view automatically when the page reloads.
	$('#viewTreeId').val(viewTreeId);
	$('#viewTreePersonId').val(viewTreePersonId);
	$('#viewTreePersonName').val(viewTreePersonName);
	WikiTreeAPI.cookie('viewTreeId', viewTreeId);
	WikiTreeAPI.cookie('viewTreePersonId', viewTreePersonId);
	WikiTreeAPI.cookie('viewTreePersonName', viewTreePersonName);

	// In case the container was hidden (e.g. during login/auth-code verification), display it.
	$('#treeViewerContainer').show();

	// Define the Person profile fields to retrieve, which we can use to fill the treeInfo selection
	// and some elements in the page.
	var infoFields = "Id,Name,FirstName,LastName,Derived.BirthName,Derived.BirthNamePrivate";

	// The base/core/default tree view
	if (viewTreeId == 'wikitree-dynamic-tree') {
		$('#treeInfo').load(
			'views/baseDynamicTree/treeInfo.html',
			function () {
				WikiTreeAPI.postToAPI({ 'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields })
					.then(function (data) {
						updateViewedPersonContent(data[0].person);
						var tree = new WikiTreeDynamicTreeViewer('#treeViewerContainer', viewTreePersonId);
					});
			}
		);
	}
	if (viewTreeId == 'restyled-base') {
		$('#treeInfo').load(
			'views/restyledBaseExample/treeInfo.html',
			function () {
				WikiTreeAPI.postToAPI({ 'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields })
					.then(function (data) {
						updateViewedPersonContent(data[0].person);
						var tree = new alternateViewExample('#treeViewerContainer', viewTreePersonId);
					});
			}
		);
	}
	// Basic timeline view
	if (viewTreeId == 'profile-timeline') {
		$('#treeInfo').load(
			'views/timeline/treeInfo.html',
			function () {
				WikiTreeAPI.postToAPI({ 'action': 'getPerson', 'key': viewTreePersonId, 'fields': 'Categories,Father,Mother,Derived.ShortName,Name,BirthDate,DeathDate,TrustedList,BirthLocation,DeathLocation,Parents,Children,Spouses,Siblings,Gender,Photo,PhotoData,Privacy,DataStatus,Bio' })
					.then(function (data) {
						updateViewedPersonContent(data[0].person);
						getTimeline(data[0].person, '#treeViewerContainer');
					});
			}
		);
	}

	// Fan Chart view
	if (viewTreeId == 'fan-chart') {
		$('#treeInfo').load(
			'views/fanChart/treeInfo.html',
			function() {
				WikiTreeAPI.postToAPI( {'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields } )
				.then(function(data) {
					updateViewedPersonContent(data[0].person);
					var tree = new FanChartView('#treeViewerContainer', viewTreePersonId);
				});		
			}
		);
	}
}

/* 
 * When a new tree or starting profile is desired, we look up the profile with the API. If one is found, we start a new tree.
 * This function is called when one of the "Go" buttons is clicked in index.html for either a new starting profile or a 
 * new view option.
 */
function newTree(k) {
	var key;
	if (k) { $('#viewTreePersonName').val(k); }
	var key = $('#viewTreePersonName').val();

	WikiTreeAPI.postToAPI({ 'action': 'getPerson', 'key': key })
		.then(function (data) {
			if (data.error) {
				alert("Error retrieving \"" + key + "\" from API.");
			} else {
				if (data[0].person.Id) {
					$('#treeViewerContainer').empty();
					viewTreePersonId = data[0].person.Id;
					viewTreePersonName = data[0].person.Name;
					viewTreeId = $('#viewTreeId').val();

					launchTree(viewTreeId, viewTreePersonId, viewTreePersonName);
					updateViewedPersonContent(data[0].person);
				} else {
					alert("Error retrieving \"" + key + "\" from API.");
				}
			}
		});
};

/*
 * Create navigation bar with the number ID of a profile, and update spans/links to have the person data.
 */
function updateViewedPersonContent(person) {
	// Stash the info into the web page.
	$('.viewTreePersonId').html(person.Id);
	$('.viewTreePersonName').html(person.Name);
	$('.viewTreePersonBirthName').html(person.BirthName ? person.BirthName : person.BirthNamePrivate);
	$('.viewTreePersonURL').html(person.Name);
	$('.viewTreePersonURL').attr("href", "https://www.WikiTree.com/wiki/" + person.Name);
}
