wikitree-dynamic-tree
=======================

Create a dynamically drawn, browsable family tree using data from WikiTree.

## Prerequisites
* wikitree-javascript-sdk (https://github.com/wikitree/wikitree-javascript-sdk)
* D3.js (http://d3js.org)

Required by wikitree-javascript-sdk...
* jQuery 1.10 or higher (may work with lower versions)
* jQuery Cookie Plugin 1.3.1 or later (https://github.com/carhartl/jquery-cookie)

## Usage

````javascript

// Load scripts
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
<script src="jquery.cookie.js"></script>
<script src="wikitree-javascript-sdk/wikitree.js"></script>
<script src="d3.v3.min.js" chartset="utf-8"></script>
<script src="wikitree-dynamic_tree/wikitree-dynamic-tree.js"></script>

<script type="text/javascript">

	// Optionally do something for login

	var treeDisplay = new TreeDisplay({
		'rootId': wikitree.session.user_id, 
		'paneId': '#window' ,
		'infoId': '#infoContainer' ,
		'margin': { top: 10, right: 10, bottom: 10, left: 10 }
	});


</script>
````

Some necessary CSS:
````css
// Required to get pan/zoom functions to work 
svg { 
	pointer-events: all;
}

````

## Example

This is an early beta version of a tree. 

A hosted version is at: http://apps.wikitree.com/apps/casey1/wikitree-dynamic-tree/

