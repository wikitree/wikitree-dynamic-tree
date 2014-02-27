wikitree-dynamic-tree
=======================

Create a dynamically drawn, browsable family tree using data from WikiTree.

## Prerequisites
* wikitree-javascript-sdk (https://github.com/wikitree/wikitree-javascript-sdk)
** jQuery 1.10 or higher (may work with lower versions)
** jQuery Cookie Plugin 1.3.1 or later (https://github.com/carhartl/jquery-cookie)
* D3.js (http://d3js.org)

## Usage

````javascript

// Load scripts
<script src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
<script src="jquery.cookie.js"></script>
<script src="wikitree-javascript-sdk/wikitree.js"></script>
<script src="wikitree-dynamic_tree/wikitree-dynamic-tree.js"></script>

<script type="text/javascript">

	wikitree.init({});
	wikitree.session.checkLogin().then(function(data){ ... });

	wikitree.session.log( { email: 'xxx', password: 'yyyy' }).then(function(data) {
	});

	var p = new wikitree.Person( { user_id: #### } );
	p.load({}).then(function(data){ 
	});

</script>
````

Some necessary CSS:
````css
// Required to get pan/zoom functions to work 
svg { 
	porinter-events: all;
}
````

## Example

This is an early beta version of a tree. 

A hosted version is at: http://apps.wikitree.com/apps/casey1/wikitree-dynamic-tree/

