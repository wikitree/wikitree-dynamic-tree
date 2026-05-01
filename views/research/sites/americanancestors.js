window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "americanancestors",
    label: "American Ancestors",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://www.americanancestors.org/search/database-search";
        const params = {};

        if (data.givenName) {
            params.firstname = data.givenName;
        }

        if (data.familyName) {
            params.lastname = data.familyName;
        }

        if (data.birthDate) {
            params.fromyear = utils.getYear(data.birthDate);
        }

        if (data.deathDate) {
            params.toyear = utils.getYear(data.deathDate);
        }

        if (data.birthPlace) {
            params.location = data.birthPlace;
        } else if (data.deathPlace) {
            params.location = data.deathPlace;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});