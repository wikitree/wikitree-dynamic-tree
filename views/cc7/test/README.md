`testRelationships.js` is a script that tests the logic of `relationshipWorker.js`. It takes a json input file, runs the relationship worker against it and prints out the resultant relationship descriptions. The `family*.json` files can be used as input files, or you can craete your own to test various combinations. It does not currently check against expected output (so lots of room for improvement :) )

You run it as:

`node testRelationships.mjs [root-person-id] [family-json-path]`
