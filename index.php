<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html lang="en" dir="ltr" xml:lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="robots" content="noindex, nofollow" />
<title>WikiTree - Family Tree and Free Genealogy - Apps/Casey1 - Dynamic Family Tree</title>
<link rel="stylesheet" href="http://www.wikitree.com/css/main-new.css?2" type="text/css" />

<!-- For convenience, use JQuery for our Ajax interactions with the API. Use the cookie module to grab any existing user id. --> 
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
<script src="jquery.cookie.js"></script>

<!-- JS + CSS for the WikiTree API access methods -->
<script src="../wikitree-javascript-sdk/wikitree.js"></script>

<!-- D3JS library for drawing the tree. See http://d3js.org/ -->
<script src="d3.v3.min.js" chartset="utf-8"></script>
<script src="wikitree-dynamic-tree.js" chartset="utf-8"></script>

<!-- CSS styles to describe nodes, etc. --> 
<link rel="stylesheet" href="tree.css" type="text/css" />


<script type="text/javascript">
var wikitreeProfiles = [];


$(document).ready(function(){ 

	// When the DOM is ready, try to do a login on the user. When we get back, either from
	// a session check or an actual emaill/password login, show our users information instead of
	// the anonymous-user section.
	wikitree.init({});
	wikitree.session.checkLogin({})
		.then(function(data){
			var html = '';
			if (wikitree.session.loggedIn) { 
				$('#need_login').hide();
				$('#logged_in').show();
				go();
			} else { 
				$('#need_login').show();
				$('#logged_in').hide();
			}
		});

});

function tryLogin() { 
	wikitree.session.login( {email: $('#wpEmail').val(), password: $('#wpPassword2').val() })
		.then(function(data) {
			if (wikitree.session.loggedIn) { 
				$('#need_login').hide();
				$('#logged_in').show();
				go();
			} else { 
				alert("Login failed.");
			}
		});
}


function go() { 
	var treeDisplay = new TreeDisplay({ 
		'rootId': wikitree.session.user_id, 
		'paneId': '#window' ,
		'infoId': '#infoContainer' ,
		'margin': { top: 10, right: 10, bottom: 10, left: 10 }
	});
}
function appsLogout() { 
	wikitree.session.logout();
	document.location.href = 'http://apps.wikitree.com/apps/casey1/wikitree-dynamic-tree/';
}

function restartTree() { 
	var rootWikiTreeId = $('#rootWikiTreeId').val();
	var p = new wikitree.Person( { user_id: rootWikiTreeId } );
	p.load().then(function(data) { 
		if (p.user_id) { 
			var treeDisplay = new TreeDisplay({ 
				'rootId': p.user_id,
				'paneId': '#window' ,
				'margin': { top: 10, right: 10, bottom: 10, left: 10 }
			});
		} else { 
			alert('No profile found for '+rootWikiTreeId); 
		}
	});
	
}

</script>
</head>

<body class="mediawiki ns-0 ltr page-Main_Page">

<div id="HEADLINE">
	<h1>Dynamic Family Tree</h1>
</div>

<div id="CONTENT" class="MISC-PAGE">


<!-- This div is shown if the user is logged in. -->
<div id="logged_in">
	<p>
	You are logged in. <span style="cursor:pointer;color:blue;text-decoration:underline;" onClick="appsLogout();">Logout</span> or 
	<a href="http://apps.wikitree.com/apps/">Return to Apps</a>.
	</p>
</div>

<!-- This div is shown if the user is not logged in. -->
<div id="need_login">
	<p>
	You are not currently logged in to apps.wikitree.com. In order to access your WikiTree ancestry, please sign in with your WikiTree.com credentials.
	<form id="login" action="#" onSubmit='return false;'>
		E-mail Address: <input type=text id="wpEmail" name="wpEmail"><br />
		Password: <input type=password id="wpPassword2" name="wpPassword2"><br />
		<input type=button value="Login" onClick="tryLogin()"/>
	</form>
	</p>
</div>

<!-- We show this area with the dynamic tree regardless of whether the user is logged in. If they are not, they can only look at public trees. -->
<div style="clear: both;"></div>
<div id="treeContainer">
	<form id="restartForm" action="#" onSubmit='return false;'>
	New Tree starting with WikiTree ID: <input type=text id="rootWikiTreeId" name="rootWikiTreeId" value="" size=20 />
	<input type=button value="Restart Tree" onClick="restartTree();" />
	</form>

	<br clear=both>
	<div id="window" style='width:600px; height:600px; overflow:scroll; border: 1px solid black;'>
	<div id="nodeHover"></div>
	</div>
</div>
<div id="infoContainer">
</div>

<div style="clear: both;"></div>

</div><!-- eo CONTENT -->

</body>
</html>
