window.NameTestView = class NameTestView extends View {
    meta() {
        return {
            title: "Test name construction",
            description:
                "<p>A ProfileName object is created from profile data. Two functions are then available on the object " +
                "with which to construct a name from profile data:<br>" +
                "&nbsp;&nbsp;&nbsp;&nbsp;<b>.withParts(wantedParts)</b> that constructs a name with the requested parts, and<br>" +
                "&nbsp;&nbsp;&nbsp;&nbsp;<b>.getParts(wantedParts)</b> that returns the requested name parts as a map.<br>" +
                "<i>wantedParts</i> is an array of the names (strings) of the parts to be used in the construction of the " +
                "name. Possible part values are below. Only the parts marked with (*) map directly to a " +
                "single API field and will be used unadultered. " +
                "In <b>.withParts</b>: if a part is part of other parts specified in <i>wantedParts</i>, it will be ignored. " +
                "Or put differently, if it is a combination of other parts in <i>wantedParts</i>, those other parts will be ignored. " +
                "The order of the parts in the list is not important since their order in the name construction for " +
                "<b>.withParts</b> is predetermined.</p>" +
                '<ul><li>PedigreeName - Prefix FirstName MiddleNames (PreferredName) "Nicknames" (LastNameAtBirth) LastNameCurrent Suffix aka LastNameOther</br>' +
                "<font color=red>Question: Should PreferredName perhaps only be present if it differs from FirstName?</font><br>" +
                "<li>FullName - Prefix FirstName MiddleNames (LastNameAtBirth) LastNameCurrent Suffix.</br>" +
                "<li>LastName - LastNameCurrent if it exists, else LastNameAtBirth;</br>" +
                "<li>LastNameCurrent - if present and different from LastNameAtBirth, otherwise LastNameAtBirth</br>" +
                "<li>LastNameAtBirth - if present and different from LastNameCurrent, otherwise LastNameCurrent</br>" +
                "<li>LastNameOther(*) - the LastNameOther API field</br>" +
                "<li>FirstName - the first name in the FirstName API field if present, otherwise the first name in BirthNamePrivate</br>" +
                "<li>FirstNames - FirstName plus MiddleNames</br>" +
                "<li>FullFirstName(*) - the FirstName API field</br>" +
                "<li>PreferredName - the first name in the RealName API field if present, else the first name in the FirstName API field</br>" +
                "<li>FirstInitial - The first letter, capitalised, of FirstName above</br>" +
                "<li>MiddleName(*) - the MiddleName API field</br>" +
                "<li>MiddleNames - all names other than any last name and the first name in FirstName</br>" +
                "<li>MiddleInitials - The first letters, capitalised, space separated, of MiddleNames</br>" +
                "<li>Nicknames(*) - the Nicknames API field</br>" +
                "<li>Prefix(*) - the Prefix API field</br>" +
                "<li>Suffix(*) - the Suffix API field</br></ul>" +
                "<p>This page shows the result of calling the two functions with the given name parts parameter for the person specified above. ",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        const nameTest = new NameTest(container_selector, person_id);
        nameTest.displayNames();
    }
};

window.NameTest = class NameTest {
    constructor(selector, startId) {
        this.startId = startId;
        this.selector = selector;
        this.profileFields =
            "Id,Name,FirstName,LastNameCurrent,LastNameAtBirth,LastNameOther,Suffix,Prefix,Derived.BirthName," +
            "Derived.BirthNamePrivate,MiddleName,MiddleInitial,RealName,Nicknames";
    }

    async displayNames() {
        const data = await WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: this.startId,
            fields: this.profileFields,
        });
        if (data.length != 1) {
            wtViewRegistry.showError(`There was an error retrieving the profile for ${this.startId}.`);
            return;
        }
        const profileData = data[0].person;
        const name = new PersonName(profileData);
        $(this.selector).html(`<div id="nameTestResults"></div>`);
        let names = new Array(
            this.doTest(name, ["PedigreeName"]),
            this.doTest(name, [
                "PedigreeName",
                "Prefix",
                "FirstName",
                "MiddleNames",
                "PreferredName",
                "Nicknames",
                "LastName",
                "LastNameAtBirth",
                "LastNameCurrent",
                "Suffix",
                "LastNameOther",
            ]),
            this.doTest(name, ["FullName"]),
            this.doTest(name, [
                "FullName",
                "PedigreeName",
                "Prefix",
                "FirstName",
                "MiddleNames",
                "PreferredName",
                "Nicknames",
                "LastName",
                "LastNameAtBirth",
                "LastNameCurrent",
                "Suffix",
                "LastNameOther",
            ]),
            this.doTest(name, ["LastName"]),
            this.doTest(name, ["LastNameCurrent"]),
            this.doTest(name, ["LastNameAtBirth"]),
            this.doTest(name, ["LastNameOther"]),
            this.doTest(name, ["FirstName"]),
            this.doTest(name, ["FirstNames"]),
            this.doTest(name, ["FullFirstName"]),
            this.doTest(name, ["PreferredName"]),
            this.doTest(name, ["FirstInitial"]),
            this.doTest(name, ["MiddleName"]),
            this.doTest(name, ["MiddleNames"]),
            this.doTest(name, ["MiddleInitials"]),
            this.doTest(name, ["Nicknames"]),
            this.doTest(name, ["Prefix"]),
            this.doTest(name, ["Suffix"]),
            this.doTest(name, ["FirstNames", "LastNameAtBirth", "LastNameOther"]),
            this.doTest(name, ["MiddleNames", "PreferredName", "LastNameOther"]),
            this.doTest(name, ["FirstInitial", "MiddleInitials", "LastNameAtBirth"]),
            this.doTest(name, ["PreferredName", "LastNameCurrent"]),
            this.doTest(name, ["SomeUnknownPart"])
        );
        this.displayResults(profileData, names);
    }

    doTest(name, wanted) {
        return {
            request: wanted,
            name: name.withParts(wanted),
            parts: name.getParts(wanted),
        };
    }

    displayResults(profileData, nameTests) {
        $("#nameTestResults").append("<h3>Profile data:</h3>\n");
        $("#nameTestResults").append(`<pre>${JSON.stringify(profileData, undefined, 4)}</pre>`);
        $("#nameTestResults").append("<h3>Test Results</h3>");
        let html = "<ol>";
        for (const i in nameTests) {
            html += this.displayResult(nameTests[i]);
        }
        html += "</ol>";
        $("#nameTestResults").append(html);
    }

    displayResult(nameTest) {
        return (
            `<li class="testResult"><b>wantedParts</b>: ${nameTest.request}<br>\n` +
            `<b>withParts:</b> ${nameTest.name}<br>\n` +
            `<b>getParts</b>: ${
                typeof nameTest.parts === "string" ? nameTest.parts : JSON.stringify([...nameTest.parts.entries()])
            }</p></li>`
        );
    }
};
