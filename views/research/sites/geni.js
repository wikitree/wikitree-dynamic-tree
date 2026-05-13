window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "geni",
    label: "Geni",
    group: "General",

    buildUrl(data) {
        const baseUrl = "https://www.geni.com/search";
        let name = "";

        if (data.givenName) {
            name += data.givenName;
        }

        if (data.familyName) {
            if (name) {
                name += " ";
            }
            name += data.familyName;
        }

        if (!name) {
            return `${baseUrl}?search_type=people`;
        }

        // Geni expects + instead of %20
        name = name.replace(/ /g, "+");

        return `${baseUrl}?search_type=people&names=${name}`;
    }
});