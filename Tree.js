/*
 * Tree.js
 * 
 * This is the general JS run in index.html. This handles a couple of functions:
 * A) Logins to the WikiTree API.
 *    Some views (or views of particular profiles) will require the user be logged into the API.
 *    The view page (i.e. index.html) should have a form/button that posts to the clientLogin action of the API,
 *    with a returnURL back to the viewed page. The code here handles checking the auth code that comes back,
 *    and saving the API user name and Id in cookies so that the page knows the user is logged in.
 * 
 * B) New Tree/Start-Profile selection
 *    Each Tree is a separate view, built into the id="treeViewerContainer" div. There's a selection element
 *    that let's the user select a new view. When the "Go" button there is clicked, newTree() is called. That
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

$(document).ready(function() {
	// In order to view non-public profiles, the user must be logged into the WikiTree API.
	// That's on a separate hostname, so while the credentials are the same for the user, the browser doesn't carry over a login from WikiTree.com.
	// If the user is not yet logged into the API, there's a button they can use to login through API clientLogin().
	// When there's a successful login, we store this status in a cookie so future loads of this page don't have to repeat it.
	// See: https://github.com/wikitree/wikitree-api/blob/main/authentication.md

	// We want the API login process to return back where we started.
	$('#returnURL').val( window.location.href );

	// We store userName and userId of the logged-in user locally in a cookie so we know on return that
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

	if ((typeof(userName) != 'undefined') && (userName != null) && (userName != '')) {
		// According to our saved cookie, we have a user that is logged into the API.
		// Update the login div with a status instead of the button.
		$('#getAPILogin').html("Logged into API: "+userName);
		
		// Display our tree. If we don't have one, use the wikitree-dynamic-tree as a default.
		// If we have a cookie-saved starting personId, use that, otherwise start with the logged-in user's id.
		if ((typeof(viewTreeId) == 'undefined') || !viewTreeId) {
			viewTreeId = 'wikitree-dynamic-tree';
		}
		if ((typeof(viewTreePersonId) == 'undefined') || !viewTreePersonId) {
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
		WikiTreeAPI.postToAPI( { 'action':'clientLogin', 'authcode': authcode } )
		.then(function(data) {
			if (data.clientLogin.result == 'Success') {
				WikiTreeAPI.cookie('WikiTreeAPI_userName', data.clientLogin.username, { 'path': '/'} );
				WikiTreeAPI.cookie('WikiTreeAPI_userId', data.clientLogin.userid, { 'path': '/'} );
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
		// If there's no auth code to process, and no user id to check, we can just trying displaying the current view.
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
	// Grab the new view options - the id of the selected view and the starting profile. Save these in cookies
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
		$('#treeInfo').html(`
			<h2>Dynamic Tree for <span class="viewTreePersonBirthName"></span></h2> 
			WikiTree Profile Page: <a class="viewTreePersonURL" href="" target="_new"></a><br />
		
			Click on the tree and use your mouse wheel to zoom. Click and drag to pan around. 
			<a href="https://www.WikiTree.com/wiki/Dynamic_Tree" target="_Help">More info</a>
			<a href="https://www.WikiTree.com/wiki/Dynamic_Tree" target="_Help"><img src="https://www.WikiTree.com/images/icons/help.gif" border="0" width="11" height="11" alt="Help" title="Help using the dynamic tree"></a></span><br /><br />
		`);

		WikiTreeAPI.postToAPI( {'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields } )
		.then(function(data) {
			updateViewedPersonContent(data[0].person);
			var tree = new WikiTreeDynamicTreeViewer('#treeViewerContainer', viewTreePersonId);
		});

	}
	if (viewTreeId == 'restyled-base') {
		$('#treeInfo').html(`
			<h2>Dynamic Tree Alternate View Example for <span class="viewTreePersonBirthName"></span></h2> 
			WikiTree Profile Page: <a class="viewTreePersonURL" href="" target="_new"></a><br />
		
			Click on the tree and use your mouse wheel to zoom. Click and drag to pan around. 
			<a href="https://www.WikiTree.com/wiki/Dynamic_Tree" target="_Help">More info</a>
			<a href="https://www.WikiTree.com/wiki/Dynamic_Tree" target="_Help"><img src="https://www.WikiTree.com/images/icons/help.gif" border="0" width="11" height="11" alt="Help" title="Help using the dynamic tree"></a></span><br /><br />
		`);

		WikiTreeAPI.postToAPI( {'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields } )
		.then(function(data) {
			updateViewedPersonContent(data[0].person);
			var tree = new alternateViewExample('#treeViewerContainer', viewTreePersonId);
		});

	}


	// An example alternative view.
	else if (viewTreeId == 'dummy') {
		$('#treeInfo').html(`
			<h2>Dummy/Placeholder View</h2>

			Anything with class "viewTreePersonBirthName" gets the name of the starting profile filled:
			<span class="viewTreePersonBirthName"></span>
			<br><br>
			Anything a-href with class "viewTreePersonURL" gets the URL of the starting profile filled:
			<a class="viewTreePersonURL"></a>
		`);

		$('#treeViewerContainer').html(`
			<h3>Displaying a "view" for <span class="viewTreePersonURL"></span></h3>
			<div id="treeViewerContainerInner"></div>
		`);

		WikiTreeAPI.postToAPI( {'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields} )
		.then(function(data) {
			updateViewedPersonContent(data[0].person);
			$('#treeViewerContainerInner').html("<xmp>"+JSON.stringify(data,null,3)+"</xmp>");
		});

	}

}


/* 
 * When a new tree or starting profile is desired, we lookup the profile with the API. If one is found, we start a new tree.
 * This function is called when one of the "Go" buttons is clicked in index.html for either a new starting profile or a 
 * new view option.
 */
function newTree(k) {
	var key;
	if (k) { $('#viewTreePersonName').val(k); }
	var key = $('#viewTreePersonName').val();

	WikiTreeAPI.postToAPI( {'action':'getPerson', 'key':key } )
	.then(function(data) {
		if (data.error) {
			alert("Error retrieiving \""+key+"\" from API.");
		} else {
			if (data[0].person.Id) {
				$('#treeViewerContainer').empty();
				viewTreePersonId = data[0].person.Id;
				viewTreePersonName = data[0].person.Name;
				viewTreeId = $('#viewTreeId').val();

				launchTree(viewTreeId, viewTreePersonId, viewTreePersonName);
				updateViewedPersonContent(data[0].person);
			} else {
				alert("Error retrieiving \""+key+"\" from API.");
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
	$('.viewTreePersonURL').attr("href", "https://www.WikiTree.com/wiki/"+person.Name);
}
