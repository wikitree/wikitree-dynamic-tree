# Contributing to the WikiTree Dynamic Tree Application

## Introduction

The WikiTree Dynamic Tree viewer is an application for viewing trees, charts, ancestor lists, etc. from the world [single family tree](https://www.wikitree.com/wiki/Help:Collaborative_Family_Tree). The goal is to have many different views, where each view is created and maintained by one or a few individual volunteers, but they are connected through the dynamic tree for easy switching between views. This project, and the views it contains, are open source on [GitHub](https://github.com/wikitree/wikitree-dynamic-tree) so that they can live on past their original creators, and in case anyone else can help improve on them.

The WikiTree team has created a base/core view, which is a forked family tree graph that can be scrolled, zoomed, and expanded dynamically. You can see this in action on the [Apps server](https://apps.wikitree.com/apps/wikitree-dynamic-tree/). The code for that view can be copied to use as a starting point for a new one, or an entirely new view can be created and integrated into the view selection.

There are several places to share ideas and questions with other developers:

* The WikiTree [G2G forum](https://www.wikitree.com/g2g/)
* The WikiTree Apps [Google Group](https://groups.google.com/g/WikiTreeApps/)
* The WikiTree [GitHub](https://github.com/wikitree/wikitree-dynamic-tree/)
* The WikiTree [Discord](https://discord.gg/9EMSdccnn3)


## Getting started

### Sign up

If you haven't already, the first thing you should do is sign up at [WikiTree](https://wikitree.com/). Registration is free, and will enable you to start contributing your family tree content. 

We're using [GitHub](https://github.com/wikitree/wikitree-dynamic-tree/) to collaborate on the dynamic tree viewer application. In order to create your own fork and submit pull requests to merge your contributions into the shared application, you'll need to create an account.

You may also want to request a login for the WikiTree Apps server. This provides hosted space on apps.wikitree.com for your application, whether it's a new view for the dynamic tree viewer, or something completely new. We have a copy of the [dynamic tree](https://apps.wikitree.com/apps/wikitree-dynamic-tree]) running on Apps, as well as examples of the [WikiTree API](https://apps.wikitree.com/apps/wikitree-api-examples/) (which we use to gather data for the dynamic tree viewer). You can develop your code locally or in your own hosted space, but you'll have to deal with [CORS issues](#dealing-with-cors). 

### Get the code

Once you have your accounts, it's time to grab the [code](https://github.com/wikitree/wikitree-dynamic-tree/). You can download the code (via zip or git clone) to experiment with locally. But if you want to contribute back to the collaborative WikiTree project, you'll want to create your own [fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo). Then you can check out that repo locally for work:

````git clone https://github.com/<your github id>/wikitree-dynamic-tree.git````

This will give you a copy of the current WikiTree Dynamic Tree project. The index.html is the page to view the tree(s). The file Tree.js contains the launcher that switches between the different views. Individual views are stored in subdirectories inside the "views/" directory.

## Create a new view

### Consider making a branch

To create your new view, you may want to start with a separate GitHub branch. This lets you proceed with making your changes without any impact on other work. You'll be able to switch back to "main" to see the current set of unmodified views (and pull down any updates since you cloned the repository). For a "newView" branch, you can use:

````git checkout -b newView````

### Create some new files for your project

* Create a new subdirectory (e.g. "views/newView/") inside "views/" to hold the new code
* Create "views/newView/newView.js". This will typically be a function that accepts a Person to start of its display.
* Optionally create "views/newView/treeInfo.html" to hold the "info" as plain HTML. If you have a very basic description, you can just put it directly into the launchTree() code instead.

### Update index.html 

The "index.html" page is what gets viewed in the browser. To add your view you need to:

* Near the end of the ````<head>```` container, add the script for your new view: ````<script src="views/newView/newView.js"></script>````
* Add a new option to the view selection (````<select id="viewTreeId">````): ````<option value="newView">My New View</option>````


### Add code to kick off your new view to the ````launchTree()```` function in Tree.js

When the "Go" button is clicked, the launchTree() will get called with the value of the selected ````<option>```, and the Id and WikiTree ID/Name of the starting profile. You should add a section that matches the ````viewTreeId``` to the value you used in your added ````<option>```` to launch your code. This usually involves filling the div '#treeInfo' with content describing your view, posting to the WikiTree API to get the Person to view, and then calling the code you added in newView.js. For example:

````
	if (viewTreeId == 'newView') {

        // Pull the description from a static HTML file rather than including it all here in the JavaScript.
        // The jquery.load() function is asynchronous, so we put the rest of our launch in the "complete" function.
		$('#treeInfo').load(
			'views/newView/treeInfo.html',
			function() {
                // Post to the API to gather the data for the desired start Person.
				WikiTreeAPI.postToAPI( {'action': 'getPerson', 'key': viewTreePersonId, 'fields': infoFields } )
				.then(function(data) {
                    // Update content in the page with data from the start person (e.g. in treeInfo.html).
					updateViewedPersonContent(data[0].person);

                    // Launch our tree, telling it what div id we're using for the view display, and the id).
					var tree = new alternateViewExample('#treeViewerContainer', viewTreePersonId);
				});		
			}
		);
	}
````

Then inside your newView.js add your code to create your great new display, filling it into the '#viewTreeContainer' div.

## Share your view

When your new view is ready to share, you can announce it on G2G, Discord, or the Apps email group. You can upload it to your account at apps.wikitree.com for everyone to check out. And you can submit a pull request from your fork into the main project to get it incorporated into code for everyone to share.


## Dealing with CORS

Cross-origin resource sharing ([CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)) is a security feature of web browsers, to restrict what code can be executed. By default, Ajax requests for data to a hostname other than the one on which the page is viewed are denied. CORS provides a way for the browser to know whether these requests should be allowed. Because the WikiTree API uses credentials (to provide access to privacy-limited content), it does not have an "allow all" wildcard for the Access-Control-Allow-Origin header. This basically means that if you run the dynamic tree viewer on your local computer or in your own hosted space, you'll get errors when it tries to get data from the API.

````
Access to XMLHttpRequest at 'https://api.wikitree.com/api.php' from origin 'null' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
````

One way to deal with this is to put your work up at apps.wikitree.com. Requests from the Apps hostname are permitted at the API, so CORS restrictions are satisfied. IDEs like Visual Studio Code and Sublime (and Notepad++) have features or plugins to facilitate easy or automatic upload of saved content, which lets you work locally but view through apps.wikitree.com.

Other workarounds include:

* A Chrome extension like [Moesif CORS](https://chrome.google.com/webstore/detail/moesif-origin-cors-change/digfbfaphojjndkpccljibejjbppifbc)
* CORS Anywhere Proxy: [Public demo](https://cors-anywhere.herokuapp.com/corsdemo) / [Example usage](https://stackblitz.com/edit/wikitree-getperson2?file=index.ts)


## Other potentially useful tools
* [WikiTree API](https://github.com/wikitree/wikitree-api) - documentation of available API functions
* [WikiTree JS](https://github.com/PeWu/wikitree-js) - JavaScript to access the API
* [Markdown viewer](https://chrome.google.com/webstore/detail/markdown-viewer/ckkdlimhmcjmikdlpkmbgfkaikojcbjk) - Chrome extension to view Markdown (.md files in project documentation)
* [JSON viewer](https://chrome.google.com/webstore/detail/json-viewer/gbmdgpbipfallnflgajpaliibnhdgobh) - Chrome extension to view JSON, like the output from the WikiTree API
* [WikiTree Styles](https://www.wikitree.com/css/examples.html) - Some examples of CSS styles/colors/etc. for wikitree.com
