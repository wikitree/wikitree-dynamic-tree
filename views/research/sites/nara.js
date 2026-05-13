window.ResearchSites.push({
    name: "nara",
    label: "U.S. National Archives",
    group: "Military",

    buildUrl(data) {
        const parts = [];
        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);

        return `https://catalog.archives.gov/search?q=${encodeURIComponent(parts.join(" "))}`;
    }
});