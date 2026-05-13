window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "genealogieonline",
    label: "Genealogie Online",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://www.genealogieonline.nl/en/zoeken/";
        const params = {
            publication: "0"
        };

        // NOTE: original logic is intentionally swapped
        if (data.givenName) {
            params.q = data.familyName;
        }

        if (data.familyName) {
            params.vn = data.givenName;
        }

        if (data.spouseFamilyName) {
            params.pa = data.spouseFamilyName;
        }

        // place fallback: birth → death → marriage
        let place = "";
        if (data.birthPlace) {
            place = data.birthPlace;
        } else if (data.deathPlace) {
            place = data.deathPlace;
        } else if (data.marriagePlace) {
            place = data.marriagePlace;
        }

        if (place) {
            params.pn = place;
        }

        const birthYear = utils.getYearInt(data.birthDate);
        if (birthYear) {
            params.gv = birthYear - 5;
            params.gt = birthYear + 5;
        }

        const deathYear = utils.getYearInt(data.deathDate);
        if (deathYear) {
            params.ov = deathYear - 5;
            params.ot = deathYear + 5;
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});