window.ResearchSites = window.ResearchSites || [];

[
    "ancestry.js",
    "americanancestors.js",
    "archives.js",
    "billiongraves.js",
    "bing.js",
    "chroniclingamerica.js",
    "cwgc.js",
    "duckduckgo.js",
    "familysearch.js",
    "findagrave.js",
    "findmypast.js",
    "fold3.js",
    "genealogieonline.js",
    "genealogybank.js",
    "geneanet.js",
    "gengophers.js",
    "geni.js",
    "google.js",
    "googlebooks.js",
    "interment.js",
    "legacy.js",
    "myheritage.js",
    "nara.js",
    "newspapers.js",
    "nlatrove.js",
    "openarchives.js",
    "tributes.js",
    "uknationalarchives.js",
    "usgenweb.js",
    "werelate.js",
].forEach((file) => {
    const script = document.createElement("script");
    script.src = `views/research/sites/${file}`;
    script.async = false;
    document.head.appendChild(script);
});