window.ResearchSites.push({
    name: "dignity",
    label: "Dignity Memorial",
    group: "Obituaries",

    buildUrl(data) {
        const parts = [];

        if (data.givenName) parts.push(data.givenName);
        if (data.familyName) parts.push(data.familyName);

        return `https://www.dignitymemorial.com/obituaries/name/${encodeURIComponent(parts.join("-"))}`;
    }
});