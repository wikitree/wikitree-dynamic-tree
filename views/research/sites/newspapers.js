window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "newspapers",
    label: "Newspapers.com",
    group: "Newspapers",

    buildUrl(data, utils) {
        const baseUrl = "https://www.newspapers.com/search/results/";

        const params = {};

        const nameParts = [];
        if (data.givenName) {
            nameParts.push(data.givenName);
        }
        if (data.familyName) {
            nameParts.push(data.familyName);
        }

        if (nameParts.length) {
            params.query = nameParts.join(" ");
        }

        let birthYear = utils.getYearInt(data.birthDate);
        let deathYear = utils.getYearInt(data.deathDate);

        if (birthYear) {
            if (deathYear) {
                deathYear += 5;
            } else {
                deathYear = birthYear + 90;
            }

            birthYear -= 5;
        } else if (deathYear) {
            birthYear = deathYear - 90;
            deathYear += 5;
        }

        if (birthYear && deathYear) {
            params["year-start"] = birthYear;
            params["year-end"] = deathYear;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});