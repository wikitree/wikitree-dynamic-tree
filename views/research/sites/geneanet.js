window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "geneanet",
    label: "Geneanet",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://en.geneanet.org/fonds/individus/";
        const params = {
            prenom_operateur: "and",
            type_periode: "between",
            go: "1"
        };

        if (data.familyName) {
            params.nom = data.familyName;
        }

        if (data.givenName) {
            params.prenom = data.givenName;
        }

        const birthYear = utils.getYear(data.birthDate);
        const deathYear = utils.getYear(data.deathDate);

        if (birthYear) {
            params.from = birthYear;
        }

        if (deathYear) {
            params.to = deathYear;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});