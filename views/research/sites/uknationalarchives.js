window.ResearchSites.push({
    name: "uknationalarchives",
    label: "UK National Archives",
    group: "Military",

    buildUrl(data) {
        const parts = [];
        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);

        return `https://discovery.nationalarchives.gov.uk/results/r?_q=${encodeURIComponent(parts.join(" "))}`;
    }
});