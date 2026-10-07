window.ResearchSites.push({
    name: "duckduckgo",
    label: "DuckDuckGo",
    group: "Web Search",

    buildUrl(data) {
        const parts = ["genealogy"];

        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);
        if (data.birthPlace) parts.push(data.birthPlace);

        return `https://duckduckgo.com/?q=${encodeURIComponent(parts.join(" "))}`;
    }
});