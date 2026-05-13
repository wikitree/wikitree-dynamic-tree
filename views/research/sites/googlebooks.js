window.ResearchSites.push({
    name: "googlebooks",
    label: "Google Books",
    group: "Web Search",

    buildUrl(data) {
        const parts = [];

        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);

        return `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(parts.join(" "))}`;
    }
});