window.ResearchSites.push({
    name: "cwgc",
    label: "Commonwealth War Graves",
    group: "Military",

    buildUrl(data) {
        const baseUrl = "https://www.cwgc.org/find-records/find-war-dead/search-results/";

        const params = {};

        if (data.familyName) {
            params.Surname = data.familyName;
        }

        if (data.givenName) {
            params.Forename = data.givenName;
        }

        return `${baseUrl}?${new URLSearchParams(params).toString()}`;
    }
});