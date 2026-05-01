window.ResearchSites = window.ResearchSites || [];

window.ResearchSites.push({
    name: "myheritage",
    label: "MyHeritage",
    group: "General",

    buildUrl(data, utils) {
        const baseUrl = "https://www.myheritage.com/research";

        let query = "?formId=master&formMode=1&action=query&catId=1";

        let name = "";
        if (data.givenName) {
            name += "+fn." + fixSpace(data.givenName);
        }
        if (data.familyName) {
            name += "+ln." + fixSpace(data.familyName);
        }
        if (name) {
            query += "&qname=Name" + name;
        }

        let birth = "";
        if (data.birthDate) {
            const year = utils.getYear(data.birthDate);
            if (year) {
                birth += "+ey." + year;
            }
        }
        if (data.birthPlace) {
            birth += "+ep." + fixSpace(data.birthPlace);
        }
        if (birth) {
            query += "&qevents-event1=Event+et.birth" + birth + "+epmo.similar";
        }

        let death = "";
        if (data.deathDate) {
            const year = utils.getYear(data.deathDate);
            if (year) {
                death += "+ey." + year;
            }
        }
        if (data.deathPlace) {
            death += "+ep." + fixSpace(data.deathPlace);
        }
        if (death) {
            query += "&qevents-any%2F1event_1=Event+et.death" + death + "+epmo.similar";
        }

        let marriage = "";
        if (data.marriageDate) {
            const year = utils.getYear(data.marriageDate);
            if (year) {
                marriage += "+ey." + year;
            }
        }
        if (data.marriagePlace) {
            marriage += "+ep." + fixSpace(data.marriagePlace);
        }
        if (marriage) {
            query += "&qevents-any%2F1event_2=Event+et.marriage" + marriage + "+epmo.similar";
        }

        query += "&qevents=List";

        let father = "";
        if (data.fatherGivenName) {
            father += "+fn." + fixSpace(data.fatherGivenName);
        }
        if (data.fatherFamilyName) {
            father += "+ln." + fixSpace(data.fatherFamilyName);
        }
        if (father) {
            query +=
                "&qrelative_relativeName=Name" +
                father +
                "+lnmsrs.false&qrelatives-relative=Relative+rt.father+rn.*qrelative_relativeName";
        }

        let mother = "";
        if (data.motherGivenName) {
            mother += "+fn." + fixSpace(data.motherGivenName);
        }
        if (data.motherFamilyName) {
            mother += "+ln." + fixSpace(data.motherFamilyName);
        }
        if (mother) {
            query +=
                "&qaddRelative_1_addRelativeName=Name" +
                mother +
                "+lnmsrs.false&qrelatives-addRelative_1=Relative+rt.mother+rn.*qaddRelative_1_addRelativeName";
        }

        let spouse = "";
        if (data.spouseGivenName) {
            spouse += "+fn." + fixSpace(data.spouseGivenName);
        }
        if (data.spouseFamilyName) {
            spouse += "+ln." + fixSpace(data.spouseFamilyName);
        }
        if (spouse) {
            query +=
                "&qaddRelative_2_addRelativeName=Name" +
                spouse +
                "+lnmsrs.false&qrelatives-addRelative_2=Relative+rt.spouse+rn.*qaddRelative_2_addRelativeName";
        }

        query += "&qrelatives=List";

        return baseUrl + query;
    }
});

function fixSpace(str) {
    return String(str || "").replace(/ /g, "%2F3");
}