window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "genealogybank",
    label: "GenealogyBank",
    group: "Newspapers",

    buildUrl(data, utils) {
        const baseUrl = "https://www.genealogybank.com/gbnk/";
        const params = {
            dateType: "range"
        };

        if (data.givenName) {
            params.fname = data.givenName;
        }

        if (data.familyName) {
            params.lname = data.familyName;
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
            params.rgfromDate = birthYear;
            params.rgtoDate = deathYear;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});