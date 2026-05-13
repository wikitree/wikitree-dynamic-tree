window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "archives",
    label: "Archives.com",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://www.archives.com/GA.aspx";

        const params = {
            _act: "registerAS_org",
            Location: "US"
        };

        if (data.givenName) {
            params.FirstName = data.givenName;
        }

        if (data.familyName) {
            params.LastName = data.familyName;
        }

        if (data.birthDate) {
            const year = utils.getYear(data.birthDate);
            if (year) {
                params.BirthYear = year;
                params.BirthYearSpan = "2";
            }
        }

        if (data.deathDate) {
            const year = utils.getYear(data.deathDate);
            if (year) {
                params.DeathYear = year;
                params.DeathYearSpan = "2";
            }
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});