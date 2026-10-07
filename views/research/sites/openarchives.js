window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "openarch",
    label: "OpenArchives",
    group: "General",

    buildUrl(data) {
        const baseUrl = "https://www.openarch.nl/search.php";

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

        const params = {
            lang: "en"
        };

        if (name) {
            // OpenArch expects + instead of %20
            params.name = name.replace(/ /g, "+");
        }

        const query = new URLSearchParams(params).toString();
        return `${baseUrl}?${query}`;
    }
});