window.ResearchSites = window.ResearchSites || [];

// shared builder
function buildFindMyPastUrl(data, utils, tld) {
    const baseUrl = `https://www.findmypast.${tld}/search/results`;
    const params = {};

    if (data.givenName) params.firstname = data.givenName;
    if (data.familyName) params.lastname = data.familyName;

    const birthYear = utils.getYearInt(data.birthDate);
    if (birthYear) {
        params.yearofbirth = birthYear;
        params.yearofbirth_offset = "2";
    }

    const deathYear = utils.getYearInt(data.deathDate);
    if (deathYear) {
        params.yearofdeath = deathYear;
        params.yearofdeath_offset = "2";
    }

    const query = utils.queryString(params);
    return query ? `${baseUrl}?${query}` : baseUrl;
}

// UK
window.ResearchSites.push({
    name: "findmypast_uk",
    label: "FindMyPast (UK)",
    group: "General",

    buildUrl(data, utils) {
        return buildFindMyPastUrl(data, utils, "co.uk");
    }
});

// US / Global
window.ResearchSites.push({
    name: "findmypast_com",
    label: "FindMyPast (US)",
    group: "General",
    
    buildUrl(data, utils) {
        return buildFindMyPastUrl(data, utils, "com");
    }
});