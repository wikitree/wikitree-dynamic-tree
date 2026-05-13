window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "billiongraves",
    label: "BillionGraves",
    group: "Cemeteries",

    buildUrl(data, utils) {
        const baseUrl = "https://billiongraves.com/pages/search/index.php";

        const params = {
            year_range: "2",
            lim: "0",
            action: "search",
            exact: "false",
            country: "0",
            state: "0",
            county: "0"
        };

        if (data.givenName) {
            params.given_names = data.givenName;
        }

        if (data.familyName) {
            params.family_names = data.familyName;
        }

        if (data.birthDate) {
            const year = utils.getYear(data.birthDate);
            if (year) {
                params.birth_year = year;
            }
        }

        if (data.deathDate) {
            const year = utils.getYear(data.deathDate);
            if (year) {
                params.death_year = year;
            }
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}#${query}` : baseUrl;
    }
});