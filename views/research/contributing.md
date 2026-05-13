# Contributing to the Tree App's Research View

The Tree App's Research View creates search links to external genealogy websites using data from a WikiTree profile.

## Project Structure

```text
views/research/
    research.css
    research.js
    sites.js
    sites/
        ancestry.js
        familysearch.js
        findagrave.js
        ...
```

## Adding a New Site

Create a new file in:

```text
views/research/sites/
```

Example:

```text
views/research/sites/mysite.js
```

Each site file should register itself like this:

```js
window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "mysite",
    label: "My Site",
    group: "Something",

    buildUrl(data, utils) {
        const baseUrl = "https://example.com/search";
        const params = {};

        if (data.givenName) {
            params.first = data.givenName;
        }

        if (data.familyName) {
            params.last = data.familyName;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});
```

Then add the file name to:

```text
views/research/sites.js
```

Example:

```js
[
    "ancestry.js",
    "familysearch.js",
    "findagrave.js",
    "mysite.js" // Add your file here
].forEach((file) => {
    const script = document.createElement("script");
    script.src = `views/research/sites/${file}`;
    script.async = false;
    document.head.appendChild(script);
});
```

## Available Data Fields

The `data` object may contain:

```text
givenName
familyName
birthDate
birthPlace
deathDate
deathPlace
fatherGivenName
fatherFamilyName
motherGivenName
motherFamilyName
spouseGivenName
spouseFamilyName
marriageDate
marriagePlace
```

## Available Utility Functions

The `utils` object provides:

```js
utils.getYear("1925-07-28"); // "1925"
utils.getYearInt("1925-07-28"); // 1925
utils.queryString({ first: "John", last: "Smith" }); // "first=John&last=Smith"
```