# Bio Check
Code to check a WikiTree biography

## Shared Code
The following are **identical** classes found in the Bio Check app, in the 
WikiTree Browser Extension, and in the WikiTree Dynamic Tree.
* Biography.js
* BioCheckPerson.js
* SourceRules.js
The Bio Check app and WikiTree Dynamic Tree make use of
* BioCheckTemplateManager

Example use:
```
import { BioCheckTemplateManager } from "./BioCheckTemplateManager";
import { theSourceRules } from "./SourceRules.js";
import { BioCheckPerson } from "./BioCheckPerson.js";
import { Biography } from "./Biography.js";

  // initialization - just once
  let bioCheckTemplateManager = new BioCheckTemplateManager();
  bioCheckTemplateManager.load();

  // For each person. Get the bio text and dates to test
  let thePerson = new BioCheckPerson();
  let canUseThis = thePerson.canUse(profileObj, openOnly, ignorePre1500, userId);
  let biography = new Biography(theSourceRules);
  biography.parse(bioString, thePerson, searchString);
  let isValid = biography.validate(); 

  // now report from biography (use getters) as desired or just the boolean return 
  // you might want to report any biography that is not valid from the validate()
  // method as well as any any biography that hasStyleIssues()
```
## API 
