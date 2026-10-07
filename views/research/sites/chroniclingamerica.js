window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "chroniclingamerica",
    label: "Chronicling America",
    group: "Newspapers",

    buildUrl(data, utils) {
        const baseUrl = "https://www.loc.gov/collections/chronicling-america/";

        const params = {
            dl: "page",
            ops: "AND",
            searchType: "advanced"
        };

        const nameParts = [];
        if (data.givenName) nameParts.push(data.givenName);
        if (data.familyName) nameParts.push(data.familyName);

        if (nameParts.length) {
            params.qs = nameParts.join(" ");
        }

        const birthYear = utils.getYear(data.birthDate);
        const deathYear = utils.getYear(data.deathDate);

        if (birthYear) {
            params.start_date = `${birthYear}-01-01`;
        }

        if (deathYear) {
            params.end_date = `${deathYear}-12-31`;
        } else if (birthYear) {
            params.end_date = `${birthYear}-12-31`;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});