window.ResearchSites.push({
    name: "tributes",
    label: "Tributes.com",
    group: "Obituaries",

    buildUrl(data) {
        const parts = [];

        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);

        return `https://www.tributes.com/search/obituaries?keyword=${encodeURIComponent(parts.join(" "))}`;
    }
});