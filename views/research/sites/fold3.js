window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "fold3",
    label: "Fold3",
    group: "Military",

    buildUrl(data) {
        const baseUrl = "https://www.fold3.com/search";

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
            return baseUrl;
        }

        // Fold3 expects + for spaces
        const encodedName = name.replace(/ /g, "+");

        const docQuery = `(fieldedKeywords:!((texts:!(${encodedName}),type:full-name)))`;

        return `${baseUrl}?docQuery=${encodeURIComponent(docQuery)}`;
    }
});