window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "findagrave",
    label: "Find a Grave",
    group: "Cemeteries",

    buildUrl(data, utils) {
        const baseUrl = "https://www.findagrave.com/cgi-bin/fg.cgi";

        const params = {
            page: "gsr",
            GScntry: "0",
            GSst: "0",
            GSgrid: "",
            df: "all",
            GSob: "n"
        };

        if (data.givenName) {
            params.GSfn = data.givenName;
        }

        if (data.familyName) {
            params.GSln = data.familyName;
        }

        if (data.birthDate) {
            const year = utils.getYear(data.birthDate);
            if (year) {
                params.GSbyrel = "in";
                params.GSby = year;
            }
        }

        if (data.deathDate) {
            const year = utils.getYear(data.deathDate);
            if (year) {
                params.GSdyrel = "in";
                params.GSdy = year;
            }
        }

        const query = utils.queryString(params);
        return query ? `${baseUrl}?${query}` : baseUrl;
    }
});