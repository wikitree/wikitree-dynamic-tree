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
                "<p>A third function is:<br>" +
                "&nbsp;&nbsp;&nbsp;&nbsp;<b>.withFormat(template)</b> that returns a string constructed according to <i>template</i>, " +
                'where <i>template</i> is a string with placeholders, e.g.: "He is [FullName], better known as [PreferredName], but also as [Nicknames]."<br>' +
                "<p>This page shows the result of calling the above functions with the indicated name parts parameter for the person specified above. " +
                "as well as a few calls to <b>.withFormat</b>",
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
        const partsTestResults = new Array(
            this.doPartsTest(name, ["PedigreeName"]),
            this.doPartsTest(name, [
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
            this.doPartsTest(name, ["FullName"]),
            this.doPartsTest(name, [
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
            this.doPartsTest(name, ["LastName"]),
            this.doPartsTest(name, ["LastNameCurrent"]),
            this.doPartsTest(name, ["LastNameAtBirth"]),
            this.doPartsTest(name, ["LastNameOther"]),
            this.doPartsTest(name, ["FirstName"]),
            this.doPartsTest(name, ["FirstNames"]),
            this.doPartsTest(name, ["FullFirstName"]),
            this.doPartsTest(name, ["PreferredName"]),
            this.doPartsTest(name, ["FirstInitial"]),
            this.doPartsTest(name, ["MiddleName"]),
            this.doPartsTest(name, ["MiddleNames"]),
            this.doPartsTest(name, ["MiddleInitials"]),
            this.doPartsTest(name, ["Nicknames"]),
            this.doPartsTest(name, ["Prefix"]),
            this.doPartsTest(name, ["Suffix"]),
            this.doPartsTest(name, ["FirstNames", "LastNameAtBirth", "LastNameOther"]),
            this.doPartsTest(name, ["MiddleNames", "PreferredName", "LastNameOther"]),
            this.doPartsTest(name, ["FirstInitial", "MiddleInitials", "LastNameAtBirth"]),
            this.doPartsTest(name, ["PreferredName", "LastNameCurrent"]),
            this.doPartsTest(name, ["SomeUnknownPart"])
        );
        this.displayPartsResults(profileData, partsTestResults);

        const formatTestResults = new Array(
            this.doFormatTest(name, "They are [FullName], better known as [PreferredName], but also as [Nicknames]."),
            this.doFormatTest(
                name,
                "This is an invalid [Placeholder], but this is fine: [FirstInitial] [MiddleInitials]"
            ),
            this.doFormatTest(name, "Prefix='[Prefix]', [LastName], [FirstName] ([MiddleNames]) Suffux=[[Suffix]]")
        );
        this.displayFormatResults(formatTestResults);
    }

    doPartsTest(name, wanted) {
        return {
            request: wanted,
            withParts: name.withParts(wanted),
            getParts: name.getParts(wanted),
        };
    }

    doFormatTest(name, template) {
        return {
            template: template,
            name: name.withFormat(template),
        };
    }

    displayPartsResults(profileData, partsTestResults) {
        $("#nameTestResults").append("<h3>Profile data:</h3>\n");
        $("#nameTestResults").append(`<pre>${JSON.stringify(profileData, undefined, 4)}</pre>`);
        $("#nameTestResults").append("<h3>Test Results</h3>");
        $("#nameTestResults").append("<h4>.withParts</b> and .getParts</h4>");
        let html = "<ol>";
        for (const i in partsTestResults) {
            html += this.displayPartsResult(partsTestResults[i]);
        }
        html += "</ol>";
        $("#nameTestResults").append(html);
    }

    displayPartsResult(partsTestResult) {
        return (
            `<li class="testResult"><b>wantedParts</b>: ${partsTestResult.request}<br>\n` +
            `<b>withParts:</b> ${partsTestResult.withParts}<br>\n` +
            `<b>getParts</b>: ${
                typeof partsTestResult.getParts === "string"
                    ? partsTestResult.getParts
                    : JSON.stringify([...partsTestResult.getParts.entries()])
            }</li>`
        );
    }

    displayFormatResults(formatTestResults) {
        $("#nameTestResults").append("<h4>.withFormat</h4>");
        let html = "<ol>";
        for (const i in formatTestResults) {
            html += this.displayFormatResult(formatTestResults[i]);
        }
        html += "</ol>";
        $("#nameTestResults").append(html);
    }
    displayFormatResult(formatTestResult) {
        return (
            `<li class="testResult"><b>Template</b>: ${formatTestResult.template}<br>\n` +
            `<b>Result:</b> ${formatTestResult.name}<br></li>\n`
        );
    }
};
