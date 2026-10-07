window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "familysearch",
    label: "FamilySearch",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://www.familysearch.org/search/record/results";

        const params = {};

        const simpleMappings = [
            ["q.givenName", "givenName"],
            ["q.surname", "familyName"],
            ["q.birthLikePlace", "birthPlace"],
            ["q.deathLikePlace", "deathPlace"],
            ["q.fatherGivenName", "fatherGivenName"],
            ["q.fatherSurname", "fatherFamilyName"],
            ["q.motherGivenName", "motherGivenName"],
            ["q.motherSurname", "motherFamilyName"],
            ["q.spouseGivenName", "spouseGivenName"],
            ["q.spouseSurname", "spouseFamilyName"],
            ["q.marriageLikePlace", "marriagePlace"]
        ];

        simpleMappings.forEach(([param, field]) => {
            if (data[field]) {
                params[param] = data[field];
            }
        });

        const birthYear = utils.getYearInt(data.birthDate);
        if (birthYear) {
            params["q.birthLikeDate.from"] = birthYear - 2;
            params["q.birthLikeDate.to"] = birthYear + 2;
        }

        const deathYear = utils.getYearInt(data.deathDate);
        if (deathYear) {
            params["q.deathLikeDate.from"] = deathYear - 2;
            params["q.deathLikeDate.to"] = deathYear + 2;
        }

        const marriageYear = utils.getYearInt(data.marriageDate);
        if (marriageYear) {
            params["q.marriageLikeDate.from"] = marriageYear - 2;
            params["q.marriageLikeDate.to"] = marriageYear + 2;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});