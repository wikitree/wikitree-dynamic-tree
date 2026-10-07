window.ResearchSites.push({
    name: "interment",
    label: "Interment.net",
    group: "Cemeteries",

    buildUrl(data) {
        const baseUrl = "https://www.interment.net/data/search-general.htm";

        const parts = [];

        if (data.familyName && data.givenName) {
            parts.push(`${data.familyName}, ${data.givenName}`);
        } else {
            if (data.givenName) parts.push(data.givenName);
            if (data.familyName) parts.push(data.familyName);
        }

        const params = {
            cx: "partner-pub-1928517298809652:6045987309",
            cof: "FORID:10",
            ie: "UTF-8",
            q: parts.join(" "),
            sa: "Search"
        };

        return `${baseUrl}?${new URLSearchParams(params).toString()}`;
    }
});