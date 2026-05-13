window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "google",
    label: "Google",
    group: "Web Search",

    buildUrl(data) {
        const baseUrl = "https://www.google.com/search";

        const parts = [];

        // exact name match
        if (data.givenName || data.familyName) {
            parts.push(`"${[data.givenName, data.familyName].filter(Boolean).join(" ")}"`);
        }

        if (data.birthPlace) {
            parts.push(data.birthPlace);
        }

        // optional keyword to bias results
        parts.push("genealogy");

        const query = parts.join(" ");
        return `${baseUrl}?q=${encodeURIComponent(query)}`;
    }
});