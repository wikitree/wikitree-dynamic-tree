window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "trove",
    label: "Trove",
    group: "Newspapers",

    buildUrl(data) {
        const baseUrl = "https://trove.nla.gov.au/newspaper/result";

        const parts = [];
        if (data.givenName) {
            parts.push(data.givenName);
        }
        if (data.familyName) {
            parts.push(data.familyName);
        }

        if (!parts.length) {
            return baseUrl;
        }

        const query = encodeURIComponent(parts.join(" "));
        return `${baseUrl}?q=${query}`;
    }
});