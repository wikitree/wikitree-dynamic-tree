window.NameTestView = class NameTestView extends View {
    static APP_ID = "NameTest";
    static #RECOMMENDED_FIELDS =
        "FirstName,LastNameAtBirth,LastNameCurrent,LastNameOther,MiddleName,Nicknames,Prefix,RealName,Suffix," +
        "Derived.BirthName,Derived.BirthNamePrivate";
    static #DESCRIPTION =
        "<p>This page is used to test the PersonName class available in the " +
        '<a href="https://github.com/wikitree/wikitree-dynamic-tree/blob/main/person_name.js"> WikiTree Dynamic Tree code</a>. ' +
        "A PersonName object is created from profile data obtained via an API call. " +
        "For the best results it is recommended that the following name fields always be requested in the API call:" +
        `<blockquote>${NameTestView.#RECOMMENDED_FIELDS}</blockquote>` +
        "<p>Two functions are then available on the object " +
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
        "<li>FullName - Prefix FirstName MiddleNames (LastNameAtBirth) LastNameCurrent Suffix.</br>" +
        "<li>ShortName - PreferredName LastName" +
        "<li>ColloquialName - 'NickNames LastName' if Nicknames is present, else ShortName" +
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
        'where <i>template</i> is a string with placeholders, e.g.: "He is [FullName], better known as [PreferredName], but ' +
        'also as [Nicknames]."<br>' +
        "<p>This page shows the result of calling the above functions with the indicated name parts parameter for the person " +
        "specified above, as well as a few calls to <b>.withFormat</b>. This is repeated for the same profile obtained with " +
        "different combinations of requested fields in the API</p>" +
        "<p>But first it allows you to experiment with name construction for this person by supplying your own list of wanted parts.</p>";

    meta() {
        return {
            title: "Test name construction",
            description: NameTestView.#DESCRIPTION,
            docs: "",
            disabled: 1,
        };
    }

    async init(container_selector, person_id) {
        wtViewRegistry.setInfoPanel(NameTestView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const nameTest = new NameTest(container_selector, person_id);
        window.nameTest = nameTest;
        nameTest
            .displayNames("Name,Id,LastNameAtBirth,FirstName,MiddleName,LastNameCurrent")
            .then(nameTest.displayNames("Id,Name," + NameTestView.#RECOMMENDED_FIELDS));
    }
};

window.nameTest = null;

window.NameTest = class NameTest {
    // 2 Cookie names
    C_WT_PROFILE_FIELDS = "WikiTree_NameTest_fields";
    C_WT_WANTED_PARTS = "WikiTree_NameTest_parts";
    userSuppliedProfileFields;
    lastProfileFieldsRetrieved;
    lastWantedPartsUsed;
    lastNameObjectUsed;

    constructor(selector, startId) {
        this.startId = startId;
        this.loadCookies();
        $(selector).html(`<div id="doitself">
        <h2>Self Test</h2>
            <blockquote>
            <form name="fieldForm" action="" method="GET">
            Enter the comma-delimeted field names to retrieve via the API and click the button.<br>
            <input type="text" id="profileFields" name="inputbox" size=100 value="">
            <input type="button" name="button" class=small value="Retrieve via API and run Test" onClick="window.nameTest.getProfileWithFields(this.form)">
            </form>
            <form name="wantedForm" action="" method="GET">
            Enter the comma-delimeted name parts you want below and click the button to see the result for <b>.withParts</b>: <br>
            <input type="text" id="wantedParts" name="inputbox" size=100 value="">
            <input type="button" name="button" class=small value="Construct Name" onClick="window.nameTest.getNameWithNameParts(this.form)">
            </form>
            <p>Profile fields retrieved: <span id=theFields></span></p>
            <p>Name constructed <b>withParts</b>: <span id=theParts>(fill in above and click the botton)</span>:</p>
            <ul><li id="userWithParts"></li></ul>
            <p>Parts returned with <b>getParts</b> using the same part names as above:
            <ul><li id="userGetParts"></li></ul>
        </blockquote>
        </div>
        <h2 id="resultHeading">Built-in Test Results</h2>
        <div id="nameTestResults"></div>`);
        document.getElementById("profileFields").defaultValue = this.userSuppliedProfileFields || "";
        document.getElementById("wantedParts").defaultValue = this.lastWantedPartsUsed || "";
    }

    loadCookies() {
        this.userSuppliedProfileFields = WikiTreeAPI.cookie(this.C_WT_PROFILE_FIELDS) || "";
        this.lastWantedPartsUsed = WikiTreeAPI.cookie(this.C_WT_WANTED_PARTS) || "";
    }

    saveCookies() {
        WikiTreeAPI.cookie(this.C_WT_PROFILE_FIELDS, this.userSuppliedProfileFields, { path: "/" });
        WikiTreeAPI.cookie(this.C_WT_WANTED_PARTS, this.lastWantedPartsUsed, { path: "/" });
    }

    getProfileWithFields(form) {
        const input = this.stripSpacesAndQuotes(form.inputbox.value);
        this.userSuppliedProfileFields = input;
        document.getElementById("profileFields").defaultValue = input;
        this.saveCookies();
        $("#resultHeading").html("Self Test Result");
        $("#nameTestResults").html("");
        this.displayNames(input);
    }

    getNameWithNameParts(form) {
        const input = this.stripSpacesAndQuotes(form.inputbox.value);
        const wanted = input.split(",");
        this.lastWantedPartsUsed = input;
        document.getElementById("wantedParts").defaultValue = input;
        this.saveCookies();
        $("#theParts").html(wanted.join(", "));
        $("#userWithParts").html(this.lastNameObjectUsed.withParts(wanted));
        const parts = this.lastNameObjectUsed.getParts(wanted);
        $("#userGetParts").html(`${typeof parts === "string" ? parts : JSON.stringify([...parts])}`);
    }

    stripSpacesAndQuotes(str) {
        const re = /[\s"']+/g;
        return str.replaceAll(re, "");
    }

    async displayNames(profileFields) {
        const data = await WikiTreeAPI.postToAPI({
            appId: NameTestView.APP_ID,
            action: "getPerson",
            key: this.startId,
            fields: profileFields,
        });
        this.lastProfileFieldsRetrieved = profileFields;
        $("#theFields").html(profileFields.split(",").join(", "));
        $("#nameTestResults").append(`<h3>Requested fields:</h3>\n<blockquote>${profileFields}</blockquote>`);
        if (data.length != 1) {
            wtViewRegistry.showError(`There was an error retrieving the profile for ${this.startId}.`);
            return;
        }
        const profileData = data[0].person;
        const name = new PersonName(profileData);
        this.lastNameObjectUsed = name;
        const partsTestResults = new Array(
            this.doPartsTest(name, ["PedigreeName"]),
            this.doPartsTest(name, [
                "Prefix",
                "FirstName",
                "MiddleNames",
                "PreferredName",
                "Nicknames",
                "LastNameAtBirth",
                "LastNameCurrent",
                "Suffix",
                "LastNameOther",
            ]),
            this.doPartsTest(name, ["FullName"]),
            this.doPartsTest(name, [
                "Prefix",
                "FirstName",
                "MiddleNames",
                "LastNameAtBirth",
                "LastNameCurrent",
                "Suffix",
            ]),
            this.doPartsTest(name, ["FullName", "PreferredName", "Nicknames"]),
            this.doPartsTest(name, ["ShortName"]),
            this.doPartsTest(name, ["ShortName", "FirstName", "MiddleName", "Nicknames"]),
            this.doPartsTest(name, ["ColloquialName"]),
            this.doPartsTest(name, ["ColloquialName", "FirstName", "MiddleName", "Nicknames"]),
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
            this.doFormatTest(name, "Prefix='[Prefix]', [LastName], [FirstName] ([MiddleNames]) Suffix=[[Suffix]]")
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
        $("#nameTestResults").append(
            `<blockquote><pre>${JSON.stringify(profileData, undefined, 4)}</pre></blockquote>`
        );
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
            `<b>withParts returns</b>: ${partsTestResult.withParts}<br>\n` +
            `<b>getParts returns</b>: ${
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
