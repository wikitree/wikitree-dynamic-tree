window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "usgwarchives",
    label: "USGenWeb Archives",
    group: "General",

    buildUrl(data) {
        const baseUrl = "https://www.usgwarchives.net/search/search.cgi/search.htm";

        const params = {
            cmd: "Search!",
            form: "extended"
        };

        const nameParts = [];
        if (data.givenName) {
            nameParts.push(data.givenName);
        }
        if (data.familyName) {
            nameParts.push(data.familyName);
        }

        if (nameParts.length) {
            params.q = nameParts.join(" ");
        }

        const query = new URLSearchParams(params).toString();
        return `${baseUrl}?${query}`;
    }
});