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

For local development, run `python3 scripts/dev_server.py` from the repository root and open `http://127.0.0.1:8000/`. This serves the app and proxies WikiTree API and Photon requests through the local server because those services do not permit browser requests from localhost origins. The API proxy keeps the WikiTree API session in the local server process; use the app login after opening the local page when accessing non-public profiles.

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

### Migration Map Tool

The Migration Map Tool is available as a native view in the Tree App selector. It loads ancestor birth-place data from the WikiTree API, then uses the external Photon geocoding service to plot locations on the included map backgrounds. Uncached place lookups run with a small concurrency limit, and results are cached in the browser to speed later loads. Two-letter US state abbreviations in birthplace values are expanded to their full state name and United States before geocoding to avoid ambiguous matches outside the US. Historical US colony/province labels are normalized to their present-day state (for example, Virginia Colony to Virginia, United States). Use the regional map buttons (World, Atlantic, US & Canada, and Europe), paternal/maternal and ancestor-line filters, and the birth-year slider or Play/Pause controls to explore the family migration. Cross-region migration trails continue to the edge of the current map, even when one birthplace is outside the selected region. Scroll or pinch to zoom, drag to pan, and use the map controls to reset the view. Geocoding uses the most specific available location (often a town or county; a state/region when the profile only gives that). Accuracy depends on Photon and the completeness/ambiguity of WikiTree place names; historical place-name matching can vary and unresolved places remain in the ancestor list. Apps login is required for non-public profiles.

## Example

A hosted version is at: http://apps.wikitree.com/apps/wikitree-dynamic-tree/
