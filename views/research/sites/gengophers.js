window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "gengophers",
    label: "GenGophers",
    group: "Obituaries",

    buildUrl(data, utils) {
        const baseUrl = "https://www.gengophers.com/#/search";

        const params = {
            page: "1"
        };

        if (data.givenName) {
            params.given = data.givenName;
        }

        if (data.familyName) {
            params.surname = data.familyName;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});