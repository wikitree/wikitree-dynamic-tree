# wikitree-dynamic-tree


This app is for viewing trees, charts, ancestor lists, etc. from the world [single family
tree](https://www.wikitree.com/wiki/Help:Collaborative_Family_Tree), starting from one person profile at WikiTree. The
user can switch between different views, most of which can be panned and zoomed, as well as expanded to include more
ancestors or descendants. The [WikiTree API](https://github.com/wikitree/wikitree-api) is used to gather the profile
data. The [D3.js](https://d3js.org/) library is used to draw graphics.

## Dependencies

-   [WikiTree API](https://github.com/wikitree/wikitree-api)
-   [D3.js](https://d3js.org/)
-   [jQuery](https://jquery.com/)

## Usage

The index page sets up a basic control container where the user can provide a starting WikiTree Person ID and select a tree view to use. There is also a button the user can click to sign in to the API (required to view content on non-public profiles).

Once there is a starting profile id (either provided via the input form or taken from the API login) and a view is selected, the view is drawn in a container.

A view starting from a different person can be displayed by entering a new WikiTree ID in the form and clicking "GO".

A different view can be displayed by selecting the view from the Tree App pulldown menu and clicking "GO".

The WikiTree Dynamic Tree is the default view. The Dynamic Tree view can be zoomed and panned with the mouse. Clicking on a plus-sign expands the tree by loading
additional ancestors or descendants. Clicking a node displays a pop-up with additional profile information. Other views
may also support zoom and pan, additional ancestors or descendants, and other view manipulation.


## Components

### [tree.js](tree.js)

This is the scaffolding code to set things up on page load and launch the appropriate tree view when a new one is
selected or a new starting profile is provided. It contains the View base class that can be extended.

Cookies are used to store the API login id (if there is one), the starting profile id, and the selected view. Those are used as defaults when the page reloads.

### [index.html](index.html) and [index.js](index.js) 

Include the script(s) for a view and register the view in the ViewRegistry.

### [lib](lib)

Code that may be used across multiple views can be found in lib.

### [WikiTreeDynamicTree.js](views/baseDynamicTree/WikiTreeDynamicTreeViewer.js)

Refer to this example code specific to drawing the WikiTree Dynamic Tree. It uses D3.js for the rendering and code from TreeAPI.js to pull data from the API. 

### [WikiTreeAPI.js](WikiTreeAPI.js)

Utility functions for getting Person data from the WikiTree API.

### [tree.css](tree.css)

Style elements for the scaffolding and the dynamic-tree nodes.

## Views

If you wouuld like to contribute see [documentation](docs/contributing.md) and the [tutorial](docs/tutorial.md).

## Example

A hosted version is at: http://apps.wikitree.com/apps/wikitree-dynamic-tree/
