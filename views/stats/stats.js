import { Utils } from "../shared/Utils.js";

window.StatsView = class StatsView extends View {
    static APP_ID = "stats";
    static REQUESTED_GENERATIONS = 5; // default value
    static maxDegreeFetched = -1;

    static #helpText = `
    <xx>[ x ]</xx>
    <h2 style="text-align: center">About Generational Statistics</h2>
    <p>
        The app show statistics about the ancestors or descendants of a profile. Each of the 10 generations are shown as
        a separate row with some overall stats shown below the table.
    </p>
    <p>
        Table columns explained:
        <ul>
            <li>
                <b>Total Profiles</b> shows how many profiles exist in this generation. For ancestors, the total number
                expected for that generation is given.
            </li><li>
                <b>Profiles w/ Birth Year</b> shows how many of the profiles have a valid birth year for that
                generation.
            </li><li>
                <b>Average Marriage Age</b> is based on the age at the time of a first marriage. Any subsequent
                marriages are ignored.
            </li><li>
                <b>Gen Length</b> is worked out as the difference between the average birth year of this generation
                and the more recent one.
            </li><li>
                <b>Average Children</b> shows the average number of children per person in this generation.
            </li><li>
                <b>Average Siblings</b> shows the average number of siblings per person in this generation.
            </li>
        </ul>
    </p>
    <p>
        If you find problems with this app or have suggestions for improvements, please
        post a comment on <a href="https://www.wikitree.com/g2g/842589" target="_blank">the G2G post</a>.
    </p>
    <p>You can double click in this box, or click the X in the top right corner to remove this About text.</p>
    `;

    meta() {
        return {
            // short title - will be in select control
            title: "Generational Statistics",
            // some longer description or usage
            description: "",
            // link pointing at some webpage with documentation
            docs: "",
        };
    }

    static cancelLoadController;
    close() {
        // Another view is about to be activated, make sure we abort any outstnding api calls
        if (StatsView.cancelLoadController) StatsView.cancelLoadController.abort();
    }

    init(container_selector, person_id) {
        const genNames = [];
        const familyMembers = new Map();
        let rootPerson = null;
        let mode = "ancestor";

        document.querySelector(container_selector).innerHTML = `
            <div id="statsContainer" class="stats">
                <div id="controlBlock" class="stats-not-printable">
                    <label for="generations"  title="The number of generations to fetch from WikiTree">Max Generations:</label>
                    <select id="generations" title="The number of generations to fetch from WikiTree">
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                    </select>
                    <button id="getStatsButton" class="small button" title="Get generational stats">Get generational stats</button>
                    <button id="cancelLoad" class="small button" title="Cancel the current loading of profiles.">Cancel</button>
                    <span id="help-button" title="About this">?</span>
                    <div id="help-text">${StatsView.#helpText}</div><br>
                    <fieldset id="statsFieldset">
                        <legend id="aleOptions" title="Click to Close/Open the options">Options:</legend>
                        <table id="optionsTbl">
                            <tr>
                                <td>Mode:
                                    <input type="radio" id="ancestor" name="mode" value="ancestor" checked="checked">
                                    <label for="ancestor" title="Ancestor">Ancestors</label>
                                    <input type="radio" id="descendant" name="mode" value="descendant">
                                    <label for="descendant" title="Descendant">Descendants</label>
                                </td>
                            </tr><tr>
                                <td>
                                    <label for="gender" title="The genders to search and report on">Genders to search</label>
                                    <select id="gender" title="The genders to search and report on">
                                        <option value="" selected>all</option>
                                        <option value="Male">males only</option>
                                        <option value="Female">females only</option>
                                    </select>
                                </td>
                            </tr>
                        </table>
                    </fieldset>
                </div>
                <table id="stats-table">
                    <thead>
                        <tr>
                            <th>Generation</th>
                            <th>Relation</th>
                            <th>Total Profiles</th>
                            <th>Profiles w/ Birth Year</th>
                            <th>Earliest Birth Year</th>
                            <th>Latest Birth Year</th>
                            <th>Average Birth Year</th>
                            <th>Average Marriage Age</th>
                            <th>Gen Length</th>
                            <th>Average Lifespan</th>
                            <th>Average Children</th>
                            <th>Average Siblings</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <div id="results-container"></div>
            </div>
            <div id="g2g">If you have suggestions for this app, please post a comment on
                <a href="https://www.wikitree.com/g2g/842589" target="_blank">the G2G post</a>.</div>
        `;

        $("#generations").val(StatsView.REQUESTED_GENERATIONS);
        $("#cancelLoad")
            .off("click")
            .on("click", function () {
                if (StatsView.cancelLoadController) {
                    wtViewRegistry.showWarning("Cancelling generational stats profile retrieval...");
                    // clearStats();
                    StatsView.cancelLoadController.abort();
                }
                enableCalls();
            });
        enableCalls();

        $("#getStatsButton")
            .off("click")
            .on("click", function (event) {
                if (event.altKey) {
                    // Provide a way to examine the data records
                    console.log("familyMembers", [...familyMembers.values()]);
                } else {
                    clearAndGatherStats();
                }
            });

        $('input[name="mode"]').on("change", function () {
            if (this.checked) {
                clearAndGatherStats();
            }
        });

        $("#gender")
            .off("change")
            .on("change", function () {
                clearStats();
                calculateAvgAgeEachGen($(this).val(), false);
            });

        // Add click action to help button
        const helpButton = document.getElementById("help-button");
        helpButton.addEventListener("click", function () {
            $("#help-text").slideToggle();
        });
        $("#help-text").draggable();
        $(document).off("keyup", closeHelp).on("keyup", closeHelp);

        // Add the help text as a pop-up
        const help = document.getElementById("help-text");
        help.addEventListener("dblclick", function () {
            $(this).slideToggle();
        });
        document.querySelector("#help-text xx").addEventListener("click", function () {
            $(this).parent().slideUp();
        });

        gatherStats();

        function clearAndGatherStats() {
            wtViewRegistry.clearStatus();
            familyMembers.clear();
            rootPerson = null;
            gatherStats();
        }

        function disableCalls() {
            $("#cancelLoad").show();
            $('input[name="mode"]').prop("disabled", true);
            $("#gender").prop("disabled", true);
            $("#getStatsButton").prop("disabled", true);
        }

        function enableCalls() {
            $("#cancelLoad").hide();
            $('input[name="mode"]').prop("disabled", false);
            $("#gender").prop("disabled", false);
            $("#getStatsButton").prop("disabled", false);
        }

        function closeHelp() {
            const helpPopup = $("#help-text:visible");
            if (helpPopup) {
                helpPopup.slideUp("fast");
            }
        }

        async function gatherStats() {
            Utils.showShakingTree();

            StatsView.REQUESTED_GENERATIONS = $("#generations").val();
            if ($("#ancestor").is(":checked")) {
                mode = "ancestor";
            }
            if ($("#descendant").is(":checked")) {
                mode = "descendant";
            }
            const gender = $("#gender").val();

            clearStats();

            const wtId = wtViewRegistry.getCurrentWtId();
            // Update the 'name' parameter in the URL
            const url = new URL(window.location.href);
            url.hash = url.hash.replace(/name=[^&]+/, `name=${wtId}`);
            // Rewrite the URL without reloading the page
            window.history.replaceState(null, "", url);

            disableCalls();
            StatsView.maxDegreeFetched = await getFamilyMembers(wtId);
            enableCalls();
            if (StatsView.maxDegreeFetched >= 0) {
                calculateAvgAgeEachGen(gender);
            } else {
                wtViewRegistry.showWarning("No profiles were retrieved.");
                Utils.hideShakingTree();
            }
        }

        function clearStats() {
            $("#stats-table caption").remove();
            // Clear away any previous results
            const results = document.getElementById("results-container");
            results.innerHTML = "";
            const table = document.querySelector("#stats-table > tbody");
            table.innerHTML = "";

            fillGenNames();
        }

        function fillGenNames() {
            genNames[0] = "Self";
            let modifier = ""; // Either parents or children
            if (mode == "ancestor") {
                genNames[1] = "Parents";
                modifier = "parents";
            } else {
                genNames[1] = "Children";
                modifier = "children";
            }
            genNames[2] = "Grand" + modifier;
            genNames[3] = "Great-Grand" + modifier;
            if (StatsView.REQUESTED_GENERATIONS > 3) {
                for (let i = 4; i <= StatsView.REQUESTED_GENERATIONS; i++) {
                    let greats = i - 2;
                    genNames[i] = greats + "x Great-Grand" + modifier;
                }
            }
        }

        async function getFamilyMembers(wtId) {
            // get ancestors / descendants of given ID with getPeople
            const [status, isPartial, maxDegree] = await getPeopleViaPagedCalls(
                wtId,
                StatsView.REQUESTED_GENERATIONS - 1
            );
            if (status == "aborted") {
                wtViewRegistry.showWarning("Generational stats profile retrieval cancelled.");
                Utils.hideShakingTree();
            } else if (isPartial) {
                wtViewRegistry.showWarning(
                    "Limits imposed by the API is preventing us from retrieving all the requested data," +
                        "The results may therefore not be accurate."
                );
            } else if (status !== "") {
                console.log("Error reported", status);
                return 0;
            }
            // We only populateRelativeArrays if mode == descendant because for ancestors we do not
            // have all people's children yet and have to fetch them and siblins via gtRelatives later.
            // For descendants we have all the children, except for the highest requested degree people,
            // (whose children will be fetched later via getRelatives), but in the mean time we create
            // the Child and Sibling arrays for the rest here.
            if (mode == "descendant") populateRelativeArrays(familyMembers);
            return maxDegree;
        }

        // Populates familyMembers and returns [status, isPartial] where
        //   familyMembers is a Map
        //   status is "" if success otherwise either "aborted", or an error object
        //   isPartial == true if the API did not return all (or any) results
        async function getPeopleViaPagedCalls(reqId, degree) {
            let start = 0;
            let callNr = 0;
            const limit = 1000;
            let maxDegree = -1;
            let isPartial = false;
            let privateIdOffset = 0;
            let totalAdded = 0;
            let rootId = 0;

            StatsView.cancelLoadController = new AbortController();

            const starttime = performance.now();
            let getMore = true;
            while (getMore) {
                callNr += 1;
                if (callNr == 1) {
                    console.log(
                        `Calling getPeople with key:${reqId}, ${mode}s=${degree}, start:${start}, limit:${limit}`
                    );
                } else {
                    console.log(
                        `Retrieving getPeople result page ${callNr}. key:${reqId}, ${mode}s=${degree}, start:${start}, limit:${limit}`
                    );
                }
                const starttime = performance.now();
                const [status, keysResult, peopleData] = await getPeople(reqId, degree, start, limit);
                if (status == "aborted") {
                    return [status, true, 0];
                }
                const callTime = performance.now() - starttime;
                getMore = status.startsWith("Maximum number of profiles");
                if (status != "" && peopleData && peopleData.length > 0 && !getMore) {
                    isPartial = true;
                }
                const profiles = peopleData ? Object.values(peopleData) : [];
                if (profiles.length == 0) {
                    const reason = keysResult?.[reqId]?.status || status;
                    wtViewRegistry.showError(`Could not retrieve ${mode}s for ${reqId}. Reason: ${reason}`);
                }
                console.log(`Received ${profiles.length} ${mode}s for start:${start}, limit:${limit} in ${callTime}ms`);
                if (callNr == 1 && keysResult?.[reqId]) {
                    rootId = keysResult?.[reqId].Id;
                }

                const [nrAdded, largestDegree, nrPrivateProfiles] = addPeople(profiles, privateIdOffset);
                maxDegree = Math.max(maxDegree, largestDegree);
                privateIdOffset += nrPrivateProfiles;
                totalAdded += nrAdded;

                start += limit;
            }
            console.log(
                `Retrieved ${totalAdded} unique ${mode}s with ${callNr} API call(s) in ${
                    performance.now() - starttime
                }ms`
            );
            if (rootId) {
                rootPerson = familyMembers.get(rootId);
            }
            return ["", isPartial, maxDegree];
        }

        async function getPeople(reqId, degree, start = 0, limit = 1000) {
            try {
                const params = {
                    appId: StatsView.APP_ID,
                    action: "getPeople",
                    keys: reqId,
                    start: start,
                    limit: limit,
                    fields:
                        "BirthDate,BirthDateDecade,DeathDate,DeathDateDecade,Father,Mother,Name,Derived.BirthName," +
                        "Derived.BirthNamePrivate,Gender,Id,Spouses,Meta",
                };
                if (mode == "ancestor") {
                    params["ancestors"] = degree;
                } else {
                    params["descendants"] = degree;
                }
                const result = await WikiTreeAPI.postToAPI(params, StatsView.cancelLoadController.signal);
                return [result[0]["status"], result[0]["resultByKey"], result[0]["people"]];
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.warn(`Could not retrieve ${mode}s up to degree ${degree} for ${ids}: ${error}`);
                    return [`${error}`, [], []];
                } else {
                    return ["aborted", [], []];
                }
            }
        }

        function addPeople(profiles, privateIdOffset) {
            let nrAdded = 0;
            let maxDegreeFound = -1;
            let nrPrivateIds = 0;
            for (const person of profiles) {
                let id = +person.Id;
                if (id < 0) {
                    // This is a private profile
                    // WT returns negative ids for private profiles, but they seem to be unique only
                    // within the result returned by the call (i.e. per page). However, since they are
                    // different people, we give them unique ids.
                    if (familyMembers.has(id)) {
                        id += -privateIdOffset;
                        ++nrPrivateIds;
                    }
                    person.Id = id;
                    person.Name = `Private${id}`;
                    person.DataStatus = { Spouse: "", Gender: "" };
                } else if (!person.Name) {
                    // WT seems not to return Name for some private profiles, even though they do
                    // return a positive id for them, so we just set Name to Id since WT URLs work for both.
                    person.Name = `${id}`;
                }
                if (!familyMembers.has(id)) {
                    if (id < 0) {
                        window.genStatsMinPrivateId = Math.min(id, window.genStatsMinPrivateId);
                    }
                    // This is a new person, add them to the tree
                    Utils.setAdjustedDates(person);
                    person.Parents = [person.Father, person.Mother];
                    // To be filled later
                    person.Sibling = new Set();
                    person.Child = new Set();

                    familyMembers.set(id, person);
                    ++nrAdded;
                    const degree = typeof person.Meta?.Degrees == "undefined" ? -1 : person.Meta?.Degrees;
                    maxDegreeFound = Math.max(degree, maxDegreeFound);
                } else {
                    console.log(`${person.Name} (${id}) not added since they are already present`);
                }
            }
            console.log(`Added ${nrAdded} relatives`);
            return [nrAdded, maxDegreeFound, nrPrivateIds];
        }

        function populateRelativeArrays(people) {
            const offDegreeParents = new Map();

            for (const pers of people.values()) {
                // Add Child arrays
                for (const pId of pers.Parents) {
                    if (pId) {
                        let parent = familyMembers.get(+pId);
                        if (parent) {
                            parent.Child.add(pers.Id);
                        } else {
                            parent = offDegreeParents.get(+pId);
                            if (parent) {
                                parent.Child.add(pers.Id);
                            } else {
                                offDegreeParents.set(+pId, { Id: pId, Child: new Set([pers.Id]) });
                            }
                        }
                    }
                }
            }
            // Now that all child arrays are complete, add Sibling arrays
            for (const pers of [...people.values(), ...offDegreeParents.values()]) {
                if (pers.Child.size) {
                    // Add this person's children as siblings to each of his/her children
                    for (const chId of pers.Child) {
                        const child = people.get(chId);
                        // Exclude this child from the sibling list
                        const siblings = new Set(pers.Child);
                        siblings.delete(chId);
                        // Add each one unless it already is there (mothers and fathers may have
                        // same and different children)
                        // We could use child.Sibling.union(siblings), but it is not yet universally
                        // available
                        for (const sibId of siblings) {
                            if (!child.Sibling.has(sibId)) {
                                child.Sibling.add(sibId);
                            }
                        }
                    }
                }
            }
        }

        async function getRelatives(ids) {
            try {
                let params = {
                    appId: StatsView.APP_ID,
                    action: "getRelatives",
                    keys: ids.join(","),
                    fields: "Id",
                    resolveRedirect: 1,
                };
                if (mode == "ancestor") {
                    // for ancestors we have the correct children counts, but sibling counts of the outer ring are incomplete
                    params["getSiblings"] = 1;
                    params["getChildren"] = 1;
                } else {
                    // for descendant we have the correct sibling counts, but we don't have children counts for the outer ring
                    params["getChildren"] = 1;
                }
                const result = await WikiTreeAPI.postToAPI(params, StatsView.cancelLoadController.signal);

                return [result[0]["status"], result[0]["items"]];
                // WikiTreeAPI.getRelatives("stats", chunk, ["Id"], options).then(updateChildrenSiblings);
            } catch (error) {
                if (error.name !== "AbortError") {
                    console.warn(
                        `Could not retrieve ${mode == "ancestor" ? "children and siblings" : "children"}` +
                            ` for ${ids.length} ${mode}s : ${error}`,
                        error
                    );
                } else {
                    wtViewRegistry.showWarning("Profile retrieval cancelled.");
                    Utils.hideShakingTree();
                }
                throw error;
            }
        }

        async function calculateAvgAgeEachGen(requestedGender, getChildren = true) {
            let sortingOldestAge = -9999;
            let oldestAnnotatedAge;
            let oldestPerson = "";

            let sortingOldestMaleAge = -9999;
            let oldestMaleAnnotatedAge = 0;
            let oldestMalePerson = "";

            let sortingOldestFemaleAge = -9999;
            let oldestFemaleAnnotatedAge = 0;
            let oldestFemalePerson = "";
            const findMissingRelatives = new Set();

            // fill array with the birth and death years of all family members in each generation

            // setup birth and death year storage with an array for each generation
            const profileCounts = {};
            const birthYears = {};
            const deathAges = {};
            const marriageAges = {};
            const childrenCounts = {};
            const siblingsCounts = {};
            for (let i = 0; i <= StatsView.maxDegreeFetched; i++) {
                profileCounts[i] = 0;
                birthYears[i] = [];
                deathAges[i] = [];
                marriageAges[i] = [];
                childrenCounts[i] = [];
                siblingsCounts[i] = [];
            }
            console.log("Calculating birth, marriage, and lifespan statistics");

            // for each family member
            for (const familyMember of familyMembers.values()) {
                const gender = familyMember["Gender"];
                if (requestedGender && gender !== requestedGender && familyMember["Name"] != rootPerson?.Name) continue;

                const degree = familyMember["Meta"]["Degrees"];
                const birthYear = parseInt(familyMember.adjustedBirth.date.substring(0, 4));
                const annotatedAgeAtDeath = Utils.ageAtDeath(familyMember);
                const adjustedMarriage = Utils.getTheDate(familyMember, "Marriage");
                const marriageYear = parseInt(adjustedMarriage.date.substring(0, 4));
                if (getChildren) {
                    // getChildren will be false if we've already collected children and siblings for the data set
                    // and we're just re-calculating stats for a different gender
                    if (mode == "ancestor") {
                        // We need to collect children and siblings for all direct ancestors
                        if (familyMember.Id > 0) findMissingRelatives.add(familyMember.Id);
                    } else if (degree == StatsView.REQUESTED_GENERATIONS - 1 && familyMember.Id > 0) {
                        // This is a non-private profile on the ""outer ring" od descendants, so we'll need to collect
                        // children counts for them
                        findMissingRelatives.add(familyMember.Id);
                    }
                }

                // increase the profile count of the proper degree
                ++profileCounts[degree];

                // add the birth year to the proper degree
                if (birthYear > 0) {
                    const birthGeneration = birthYears[degree];
                    birthGeneration.push(birthYear);
                }

                // add the marriage age to the proper degree
                let ageAtMarriage;
                if (marriageYear && birthYear > 0) {
                    ageAtMarriage = Utils.ageAtEvent(familyMember.adjustedBirth, adjustedMarriage);
                    const marriageAgeGeneration = marriageAges[degree];
                    marriageAgeGeneration.push(ageAtMarriage.age);
                }

                // add the death age to the proper degree and find the oldest people
                if (birthYear > 0 && annotatedAgeAtDeath.age != "") {
                    // Calculate an age with decimal value
                    const deathAgeGeneration = deathAges[degree];
                    deathAgeGeneration.push(annotatedAgeAtDeath.age);

                    // Check if this family member is the oldest one so far. We compare ages with decimal values
                    // taking their certainty indicators into account
                    const sortingAge = Utils.ageForSort(annotatedAgeAtDeath);
                    const displayName = familyMember.BirthName || familyMember.BirthNamePrivate || "Private";
                    const personRef = `<a href="https://www.wikitree.com/wiki/${familyMember["Name"]}" target="_blank">${displayName}</a>`;
                    if (sortingAge > sortingOldestAge) {
                        sortingOldestAge = sortingAge;
                        oldestAnnotatedAge = annotatedAgeAtDeath;
                        oldestPerson = personRef;
                    }

                    if ((gender == "Male") & (sortingAge > sortingOldestMaleAge)) {
                        sortingOldestMaleAge = sortingAge;
                        oldestMaleAnnotatedAge = annotatedAgeAtDeath;
                        oldestMalePerson = personRef;
                    }

                    if (gender == "Female" && sortingAge > sortingOldestFemaleAge) {
                        sortingOldestFemaleAge = sortingAge;
                        oldestFemaleAnnotatedAge = annotatedAgeAtDeath;
                        oldestFemalePerson = personRef;
                    }
                }
            }

            //
            // Look up the number of siblings / children of the people at the greatest degree that we requested
            //
            if (getChildren && findMissingRelatives.size > 0) {
                const chunkSize = 500;
                const idsToGet = [...findMissingRelatives];
                const chunks = [];
                for (let i = 0; i < idsToGet.length; i += chunkSize) {
                    chunks.push(idsToGet.slice(i, i + chunkSize));
                }
                console.log(
                    `Making ${chunks.length} async getRelatives call${chunks.length == 1 ? "" : "s"} to retrieve ${
                        mode == "ancestor" ? "children and siblings" : "children"
                    }` + ` of ${findMissingRelatives.size} ${mode}s`
                );
                // Asynchronously update either the Child or Sibling arrays of the outer ring
                StatsView.cancelLoadController = new AbortController();
                disableCalls();
                const promises = chunks.map((chunk) => getRelatives(chunk).then(updateChildrenSiblings));

                function updateChildrenSiblings(results) {
                    const [status, items] = results;
                    if (status !== 0) {
                        return;
                    }
                    for (const idx in items) {
                        const person = items[idx].person;
                        const familyMember = familyMembers.get(+person.Id);
                        if (familyMember) {
                            if (mode == "ancestor") {
                                if (person.Siblings) {
                                    familyMember.Sibling = new Set(
                                        Object.values(person.Siblings).map((sibling) => sibling.Id)
                                    );
                                }
                                if (person.Children) {
                                    familyMember.Child = new Set(
                                        Object.values(person.Children).map((child) => child.Id)
                                    );
                                }
                            } else {
                                if (person.Children) {
                                    familyMember.Child = new Set(
                                        Object.values(person.Children).map((child) => child.Id)
                                    );
                                }
                            }
                        }
                    }
                }

                // Once we have all the counts, calculate the average counts and update the stats table
                Promise.all(promises).then(calculateAvgChildrenSiblings);
            }

            function calculateAvgChildrenSiblings() {
                console.log("Calculating average number of children and siblings");
                enableCalls();
                for (const person of familyMembers.values()) {
                    const gender = person["Gender"];
                    if (requestedGender && gender !== requestedGender && person["Name"] != rootPerson?.Name) continue;

                    const degree = person.Meta.Degrees;
                    if (degree < 0) {
                        console.log(`Could not determine degree`, person);
                        continue;
                    }
                    const nrChildren = person.Child?.size || 0;
                    const nrSiblings = person.Sibling?.size || 0;
                    childrenCounts[degree].push(nrChildren);
                    siblingsCounts[degree].push(nrSiblings);
                }

                // calculate the average number of children for each degree
                const avgChildrenCounts = [];
                for (const degree in childrenCounts) {
                    let avgChildrenCount;
                    let sumOfChildrenCounts = 0;
                    let countOfChildrenCounts = childrenCounts[degree].length;
                    for (const count in childrenCounts[degree]) {
                        sumOfChildrenCounts += childrenCounts[degree][count];
                    }
                    avgChildrenCount = Math.round(sumOfChildrenCounts / countOfChildrenCounts);
                    if (isNaN(avgChildrenCount)) {
                        avgChildrenCount = "-";
                    }
                    avgChildrenCounts.push(avgChildrenCount);
                }

                // calculate the average number of siblings for each degree
                const avgSiblingsCounts = [];
                for (const degree in siblingsCounts) {
                    let avgSiblingsCount;
                    let sumOfSiblingsCounts = 0;
                    let countOfSiblingsCounts = siblingsCounts[degree].length;
                    for (const count in siblingsCounts[degree]) {
                        sumOfSiblingsCounts += siblingsCounts[degree][count];
                    }
                    avgSiblingsCount = Math.round(sumOfSiblingsCounts / countOfSiblingsCounts);
                    if (isNaN(avgSiblingsCount)) {
                        avgSiblingsCount = "-";
                    }
                    avgSiblingsCounts.push(avgSiblingsCount);
                }

                updateTable({
                    avgChildrenCounts: avgChildrenCounts,
                    avgSiblingsCounts: avgSiblingsCounts,
                });

                Utils.hideShakingTree();
            }

            // While the above is happening...
            // sort birth years by earliest to latest
            for (const degree in birthYears) {
                birthYears[degree].sort(sortByYear);
            }

            // calculate the earliest birth year for each degree
            const earliestBirthYears = [];
            for (const degree in birthYears) {
                let earliestBirthYear;
                if (birthYears[degree][0] != undefined) {
                    earliestBirthYear = birthYears[degree][0];
                } else {
                    earliestBirthYear = "-";
                }
                earliestBirthYears.push(earliestBirthYear);
            }

            // calculate the latest birth year for each degree
            const latestBirthYears = [];
            for (const degree in birthYears) {
                let latestBirthYear;
                if (birthYears[degree][birthYears[degree].length - 1] != undefined) {
                    latestBirthYear = birthYears[degree][birthYears[degree].length - 1];
                } else {
                    latestBirthYear = "-";
                }
                latestBirthYears.push(latestBirthYear);
            }

            // calculate the average birth year for each degree
            const avgBirthYears = [];
            for (const degree in birthYears) {
                let avgBirthYear;
                let sumOfBirthYears = 0;
                let countOfBirthYears = birthYears[degree].length;
                for (const year in birthYears[degree]) {
                    sumOfBirthYears += birthYears[degree][year];
                }
                avgBirthYear = Math.round(sumOfBirthYears / countOfBirthYears);
                if (isNaN(avgBirthYear)) {
                    avgBirthYear = "-";
                }
                avgBirthYears.push(avgBirthYear);
            }

            // calculate the average marriage age for each degree
            const avgMarriageAges = [];
            for (const degree in marriageAges) {
                let avgMarriageAge;
                let sumOfMarriageAges = 0;
                let countOfMarriageAges = marriageAges[degree].length;
                for (const age in marriageAges[degree]) {
                    sumOfMarriageAges += marriageAges[degree][age];
                }
                avgMarriageAge = Math.round(sumOfMarriageAges / countOfMarriageAges);
                if (isNaN(avgMarriageAge)) {
                    avgMarriageAge = "-";
                }
                avgMarriageAges.push(avgMarriageAge);
            }

            // calculate the generation length for each degree -- average age of giving birth to your family members
            const avgGenLengths = [];
            for (const degree in birthYears) {
                let genLength = 0;
                if (mode == "ancestor") {
                    genLength = avgBirthYears[degree - 1] - avgBirthYears[degree];
                } else {
                    genLength = avgBirthYears[degree] - avgBirthYears[degree - 1];
                }

                if (isNaN(genLength) || genLength == 0) {
                    genLength = "-";
                }

                avgGenLengths.push(genLength);
            }

            // calculate the average lifespan for each generation
            const avgLifeSpans = [];
            for (const degree in deathAges) {
                let avgLifeSpan;
                let deathAgeSum = 0;
                let deathAgeCount = deathAges[degree].length;
                for (const age in deathAges[degree]) {
                    deathAgeSum += deathAges[degree][age];
                }
                avgLifeSpan = Math.round(deathAgeSum / deathAgeCount);
                if (isNaN(avgLifeSpan)) {
                    avgLifeSpan = "-";
                }
                avgLifeSpans.push(avgLifeSpan);
            }

            // calculate the average generation length overall
            let overallAvgGenLength = 0;
            let genLengthSum = 0;
            let totalGenLengths = 0;

            for (const genLength in avgGenLengths) {
                if (avgGenLengths[genLength] != "-") {
                    genLengthSum += avgGenLengths[genLength];
                    totalGenLengths++;
                }
            }
            overallAvgGenLength = Math.round(genLengthSum / totalGenLengths);

            let results = document.getElementById("results-container");

            let avgGenLengthDiv = document.createElement("div");
            avgGenLengthDiv.innerHTML = `Average generation length: ${overallAvgGenLength}`;
            results.appendChild(avgGenLengthDiv);

            // calculate the average lifespan overall
            let overallAvgLifeSpan = 0;
            let lifeSpanSum = 0;
            let totalLifeSpans = 0;

            for (const lifeSpan in avgLifeSpans) {
                if (avgLifeSpans[lifeSpan] != "-") {
                    lifeSpanSum += avgLifeSpans[lifeSpan];
                    totalLifeSpans++;
                }
            }
            overallAvgLifeSpan = Math.round(lifeSpanSum / totalLifeSpans);
            let avgLifeSpanDiv = document.createElement("div");
            avgLifeSpanDiv.innerHTML = `Average lifespan: ${isNaN(overallAvgLifeSpan) ? "-" : overallAvgLifeSpan}`;
            results.appendChild(avgLifeSpanDiv);

            // show oldest family member
            let oldestRelativeDiv = document.createElement("div");
            oldestRelativeDiv.innerHTML =
                `Oldest ${mode}: ` +
                (oldestPerson ? `${oldestPerson}, ${oldestAnnotatedAge.annotatedAge} years old.` : "-");
            results.appendChild(oldestRelativeDiv);

            if (!requestedGender) {
                let oldestMaleRelativeDiv = document.createElement("div");
                oldestMaleRelativeDiv.innerHTML =
                    `Oldest male ${mode}: ` +
                    (oldestMalePerson ? `${oldestMalePerson}, ${oldestMaleAnnotatedAge.annotatedAge} years old.` : "-");
                results.appendChild(oldestMaleRelativeDiv);

                let oldestFemaleRelativeDiv = document.createElement("div");
                oldestFemaleRelativeDiv.innerHTML =
                    `Oldest female ${mode}: ` +
                    (oldestFemalePerson
                        ? `${oldestFemalePerson}, ${oldestFemaleAnnotatedAge.annotatedAge} years old.`
                        : "-");
                results.appendChild(oldestFemaleRelativeDiv);
            }

            fillTable(requestedGender, {
                profileCounts: profileCounts,
                birthYears: birthYears,
                earliestBirthYears: earliestBirthYears,
                latestBirthYears: latestBirthYears,
                avgBirthYears: avgBirthYears,
                avgMarriageAges: avgMarriageAges,
                avgGenLengths: avgGenLengths,
                avgLifeSpans: avgLifeSpans,
            });

            if (!getChildren || findMissingRelatives.size == 0) {
                calculateAvgChildrenSiblings();
            }
        }

        function fillTable(gender, stats) {
            const personName = rootPerson?.BirthName || rootPerson?.BirthNamePrivate || wtViewRegistry.getCurrentWtId();
            const genderWord = gender == "" ? "" : `${gender.toLowerCase()} `;
            $("#stats-table").prepend(`<caption>Statistics for ${personName} and ${genderWord}${mode}s`);
            const table = document.querySelector("#stats-table > tbody");

            for (let degree = 0; degree <= StatsView.maxDegreeFetched; degree++) {
                const maxAncestorsForGen = Math.pow(2, degree);

                const row = table.insertRow(-1);
                row.id = "stats-row" + degree;
                row.insertCell(0).innerHTML = degree + 1;
                row.insertCell(1).innerHTML = genNames[degree];
                if (mode == "ancestor") {
                    row.insertCell(2).innerHTML = `${stats.profileCounts[degree]}/${maxAncestorsForGen}`;
                } else {
                    row.insertCell(2).innerHTML = `${stats.profileCounts[degree]}`;
                }
                row.insertCell(3).innerHTML = `${stats.birthYears[degree].length}/${stats.profileCounts[degree]}`;
                row.insertCell(4).innerHTML = stats.earliestBirthYears[degree];
                row.insertCell(5).innerHTML = stats.latestBirthYears[degree];
                row.insertCell(6).innerHTML = stats.avgBirthYears[degree];
                row.insertCell(7).innerHTML = stats.avgMarriageAges[degree];
                row.insertCell(8).innerHTML = stats.avgGenLengths[degree];
                row.insertCell(9).innerHTML = stats.avgLifeSpans[degree];
                row.insertCell(10).innerHTML = "<i>loading</i>";
                row.insertCell(11).innerHTML = "<i>loading</i>";
            }
        }

        function updateTable(stats) {
            let table = document.querySelector("#stats-table > tbody");
            for (let degree = 0; degree <= StatsView.maxDegreeFetched; degree++) {
                let row = table.querySelector("#stats-row" + degree);
                row.cells[10].innerHTML = stats.avgChildrenCounts[degree];
                row.cells[11].innerHTML = stats.avgSiblingsCounts[degree];
            }
        }

        function sortByYear(a, b) {
            return a - b;
        }
    }
};
