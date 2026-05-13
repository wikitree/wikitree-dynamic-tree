window.ResearchSites.push({
    name: "legacy",
    label: "Legacy.com",
    group: "Obituaries",

    buildUrl(data) {
        const parts = [];

        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);

        return `https://www.legacy.com/search?keyword=${encodeURIComponent(parts.join(" "))}`;
    }
});