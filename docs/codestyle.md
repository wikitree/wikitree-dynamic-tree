# WikiTree code style

## Code style

we aim for consistency, generality, readability and reduction of git diffs. Similar language constructs are formatted with similar rules. Style configuration options are deliberately limited and rarely added. Previous formatting is taken into account as little as possible.

## Basic rules

| Rule | Value | Note |
| ---  | :---: | --- |
| Line length | 120 characters |  |
| Indentation | 4 spaces |  |
| Semicolons at the end of the line| yes |  |
| Quote type | Double quotes | e.g. `myObj["propA"]` |
| Trailing comma | optional | *If you want to add a new property, you can add a new line without modifying the previously last line if that line already uses a trailing comma. This makes version-control diffs cleaner and editing code might be less troublesome.* [[source](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Trailing_commas)] |
| Bracket spacing | yes | e.g. `function xyz(arg1){ console.log(arg1) }` |
| Bracket line | yes | Put the > of a multi-line HTML (HTML, JSX, Vue, Angular) element at the end of the last line instead of being alone on the next line (does not apply to self closing elements). |
| Arrow Function Parentheses | yes | Arrow functions can omit parentheses when they have exactly one parameter. In all other cases the parameter(s) must be wrapped in parentheses. This rule enforces the consistent use of parentheses in arrow functions. [[source](https://eslint.org/docs/latest/rules/arrow-parens)] |
| Single Attribute Per Line | no | Enforce single attribute per line in HTML |

### Formatters

| Formatter | configuration file | Homepage | Editor integration |
| --- | --- | --- | --- |
| Prettier | [`.prettierrc`](../.prettierrc) | [https://prettier.io/](https://prettier.io/) | [VSCode](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode), [WebStorm](https://plugins.jetbrains.com/plugin/10456-prettier), [Sublime Text](https://packagecontrol.io/packages/JsPrettier) and lot of others... check the [official website](https://prettier.io/docs/en/editors.html)|

## Naming conventions

| Object | Convention |
| --- | --- |
| Variables |  `camel case` with lowercase first letter, e.g. `familyName`  |
| Booleans | We should use `is` or `has` as prefixes, e.g. `isDead`, `hasWife` |
| Functions | Same as with variables + should use descriptive nouns and verbs as prefixes, e.g. `getName()`, `generateReport` |
| Constants | Should be written in `upper snake case`, e.g. `DEFAULT_COUNT_OF_GENERATIONS` |
| Classes | Should be written in `Pascal case`, e.g. `WikiTreePerson` |
| Methods | Same as functions |
| Files | File names must be all lowercase and may include underscores (_) or dashes (-), but no additional punctuation. Follow the convention that your project uses. [[source](https://google.github.io/styleguide/jsguide.html#file-name)] - most Unix-based servers are case sensitives, but this doesn't apply for windows servers.|

### Legend

* `camel case` - a way to separate the words in a phrase by making the first letter of each word capitalized and not using spaces, e.g. `familyName`, `LastName`, ...
* `upper snake case` - words are written in uppercase and separated with underscores, e.g. `DEFAULT_COUNT_OF_GENERATIONS`
* `Pascal case` - same as `camel case`, but the first letter is capitalized, e.g. `WikiTreePerson`

### Conflicting names

#### Problem

> I noticed that both the FanChart view and the Ahnentafal view had an "Ahnentafel" class. I was concerned about there being more than one window.Ahnentafel. Both views seemed to work, but I was seeing some odd problems during integration into WikiTree.com and thought it wouldn't hurt to change this. I modified the class name in the Ahnentafel view (to be "AhnentafelAncestorList").

#### Solutions
1. Agree on some naming conventintions that would prevent this, e.g. use of prefix
1. use `javascript modules` ([docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) & [Can I Use page](https://caniuse.com/?search=modules)) and expose to outer world only what is needed.

### Useful reading

* inspired by: [10 JavaScript Naming Conventions Every Developer Should Know](https://www.syncfusion.com/blogs/post/10-javascript-naming-conventions-every-developer-should-know.aspx)

