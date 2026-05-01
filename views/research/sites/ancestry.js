window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "ancestry",
    label: "Ancestry.com",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://search.ancestry.com/cgi-bin/sse.dll";
        const params = {
            rank: "1"
        };

        const mappings = [
            ["gsfn", "givenName"],
            ["gsln", "familyName"],
            ["msbpn__ftp", "birthPlace"],
            ["msdpn__ftp", "deathPlace"],
            ["msfng0", "fatherGivenName"],
            ["msfns0", "fatherFamilyName"],
            ["msmng0", "motherGivenName"],
            ["msmns0", "motherFamilyName"],
            ["mssng0", "spouseGivenName"],
            ["mssns0", "spouseFamilyName"],
            ["msgpn__ftp", "marriagePlace"]
        ];

        mappings.forEach(([param, field]) => {
            if (data[field]) {
                params[param] = data[field];
            }
        });

        if (data.birthDate) {
            const year = utils.getYear(data.birthDate);
            if (year) params.msbdy = year;
        }

        if (data.deathDate) {
            const year = utils.getYear(data.deathDate);
            if (year) params.msddy = year;
        }

        if (data.marriageDate) {
            const year = utils.getYear(data.marriageDate);
            if (year) params.msgdy = year;
        }

        params.gl = "allgs";

        const query = utils.queryString(params);
        const searchUrl = query ? `${baseUrl}?${query}` : baseUrl;

        const affiliateParams = {
            id: "Xib7NfnK11s",
            mid: "50138",
            murl: searchUrl
        };

        return `https://click.linksynergy.com/deeplink?${utils.queryString(affiliateParams)}`;
    }
});