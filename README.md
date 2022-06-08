# wikitree-dynamic-tree

This app displays a family tree starting from one person profile at WikiTree. The display can be panned and zoomed, as well as expanded to include more ancestors or decendants. The [WikiTree API](https://github.com/wikitree/wikitree-api) is used to gather the profile data. The [D3.js](https://d3js.org/) library is used to draw the graph.

## Prerequisites
* [WikiTree API](https://github.com/wikitree/wikitree-api)
* [D3.js](https://d3js.org/)
* [jQuery](https://jquery.com/)
* [jquery-cookie](https://github.com/carhartl/jquery-cookie)

## Usage

The viewing user must be signed into the WikiTree API in order to view their tree. The index.html page follows the example from [API Authentication](https://github.com/wikitree/wikitree-api/blob/main/authentication.md) to do this. 

Once signed in, a new tree is created with

````
 var tree = new TreeViewer('#treeViewerCanvasContainer',viewTreePersonId);
````

where "treeViewerCanvasContainer" is a div on the page where the SVG canvas is built, and viewTreePersonId is set to the Id of the viewed profile.

## Notes

### [Tree.js](Tree.js) 
The "on document ready" code that confirms a sign-in to the WikiTree API, then creates the initial TreeViewer. This file also contains the Tree Viewer code itself, using D3.js for the rendering.

### [TreeAPI.js](TreeAPI.js)
Utility functions for getting Person data from the WikiTree API.

### [Tree.css](Tree.css)
Style elements for the tree nodes.

## Example

A hosted version is at: http://apps.wikitree.com/apps/wikitree-dynamic-tree/

