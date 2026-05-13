window.ResearchSites.push({
    name: "bing",
    label: "Bing",
    group: "Web Search",

    buildUrl(data) {
        const parts = [];

        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);
        if (data.birthPlace) parts.push(data.birthPlace);

        return `https://www.bing.com/search?q=${encodeURIComponent(parts.join(" "))}`;
    }
});