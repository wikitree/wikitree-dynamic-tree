# wikitree-dynamic-tree

This app displays a family tree starting from one person profile at WikiTree. The display can be panned and zoomed, as well as expanded to include more ancestors or decendants. The [WikiTree API](https://github.com/wikitree/wikitree-api) is used to gather the profile data. The [D3.js](https://d3js.org/) library is used to draw the graph.

## Prerequisites
* [WikiTree API](https://github.com/wikitree/wikitree-api)
* [D3.js](https://d3js.org/)
* [jQuery](https://jquery.com/)

## Usage

The index page sets up a basic control container where the user can provide a starting WikiTree Person ID and select a tree view to use. There is also a button the user can click to sign into the API (required to view content on non-public profiles).

Once there is a starting profile id (either provided in the form or taken from the API login) and a view is selected (defaulting to the WikiTree Dynamic Tree), the view is drawn in a container.

The dynamic tree can be zoomed and panned with the mouse. Clicking on a plus-sign expands the tree by loading additional ancestors or descendants. Clicking on a minus-sign prunes the relevant ancestor or descendant subtree. Clicking a node displays a pop-up with additional profile information.

A new tree can be displayed by entering a new WikiTree ID in the form and clicking "go".


## Notes

### [Tree.js](Tree.js)
This is the scaffolding code to set things up on page load and launch the appropriate tree view when a new one is selected or a new starting profile is provided.

Cookies are used to store the API login id (if there is one), the starting profile id, and the selected view. Those are used as defaults when the page reloads.

### [WikiTreeDynamicTree.js](WikiTreeDynamicTree.js)
This contains the code specific to drawing the WikiTree Dynamic Tree. It uses D3.js for the rendering and code from TreeAPI.js to pull data from the API.

### [TreeAPI.js](TreeAPI.js)
Utility functions for getting Person data from the WikiTree API.

### [Tree.css](Tree.css)
Style elements for the scaffolding and the dynamic-tree nodes.

## New Views

The tree viewer can be extended with additional views. The selection drop-down in index.html should be given a new option. The value of that option should be identified in launchTree() in Tree.js. The appropriate code should then be called to do the rendering (probably in its own JS file).

When building a view, it should be placed in the div with id "treeViewerContainer". In addition the div with id "treeInfo" can be updated with descriptive information about the view.

An example of expanding to a new view is done with a dummy/placeholder view. That simply displays some JSON of person data for the starting profile.

## Example

A hosted version is at: http://apps.wikitree.com/apps/wikitree-dynamic-tree/

