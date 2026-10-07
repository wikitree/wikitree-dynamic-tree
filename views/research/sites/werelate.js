window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "werelate",
    label: "WeRelate",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://www.werelate.org/wiki/Special:Search";

        const params = {
            sort: "score",
            ns: "Person",
            rows: "20",
            ecp: "p"
        };

        const mappings = [
            ["g", "givenName"],
            ["s", "familyName"],
            ["bp", "birthPlace"],
            ["dp", "deathPlace"],
            ["fg", "fatherGivenName"],
            ["fs", "fatherFamilyName"],
            ["mg", "motherGivenName"],
            ["ms", "motherFamilyName"],
            ["sg", "spouseGivenName"],
            ["ss", "spouseFamilyName"]
        ];

        mappings.forEach(([param, field]) => {
            if (data[field]) {
                params[param] = data[field];
            }
        });

        if (data.birthDate) {
            const year = utils.getYear(data.birthDate);
            if (year) {
                params.bd = year;
                params.br = "2";
            }
        }

        if (data.deathDate) {
            const year = utils.getYear(data.deathDate);
            if (year) {
                params.dd = year;
                params.dr = "2";
            }
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});