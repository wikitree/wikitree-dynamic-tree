window.StatsView = class StatsView extends View {
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

    init(container_selector, person_id) {
        // do whathever you want there
        // to showcase your awesome view, e.g.

        let genNames = [];
        let GENERATIONS = 5; // New default value
        var familyMembers = {};
        let mode = "ancestor";

        document.querySelector(container_selector).innerHTML = `
            <div id="statsContainer" class="stats">
                <div id="controlBlock" class="stats-not-printable">
                    <label for="generations"  title="The number of generations to fetch from WikiTree">Max Generations:</label>
                    <select id="generations" title="The number of generations to fetch from WikiTree">
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5" selected>5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                    </select>
                    <button id="getStatsButton" class="small button" title="Get generational stats">Get generational stats</button>
                    <span id="help-button" title="About this">?</span>
                    <div id="help-text">${window.StatsView.#helpText}</div><br>
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

        $("#getStatsButton").on("click", function () {
            gatherStats(person_id);
        });

        // Add click action to help button
        const helpButton = document.getElementById("help-button");
        helpButton.addEventListener("click", function () {
            $("#help-text").slideToggle();
        });
        $("#help-text").draggable();

        // Add the help text as a pop-up
        const help = document.getElementById("help-text");
        help.addEventListener("dblclick", function () {
            $(this).slideToggle();
        });
        document.querySelector("#help-text xx").addEventListener("click", function () {
            $(this).parent().slideUp();
        });

        gatherStats(person_id);

        async function gatherStats(id) {
            window.StatsView.showShakingTree();

            GENERATIONS = $("#generations").val();
            if ($("#ancestor").is(":checked")) {
                mode = "ancestor";
            }
            if ($("#descendant").is(":checked")) {
                mode = "descendant";
            }
            const gender = $("#gender").val();

            let results = document.getElementById("results-container");
            results.innerHTML = ""; // Clear away any previous results
            let table = document.querySelector("#stats-table > tbody");
            table.innerHTML = ""; // Clear away any previous results

            fillGenNames();

            await getFamilyMembers(id, gender);

            calculateAvgAgeEachGen(gender);
        }

        function fillGenNames() {
            genNames[0] = "Self";
            let modifier = ""; // Either parents or children
            if (mode == "ancestor") {
                genNames[1] = "Parents";
                modifier = "parents";
            } else if (mode == "descendant") {
                genNames[1] = "Children";
                modifier = "children";
            }
            genNames[2] = "Grand" + modifier;
            genNames[3] = "Great-Grand" + modifier;
            if (GENERATIONS > 3) {
                for (let i = 4; i <= GENERATIONS; i++) {
                    let greats = i - 2;
                    genNames[i] = greats + "x Great-Grand" + modifier;
                }
            }
        }

        async function getFamilyMembers(id, gender) {
            // get ancestors / descendants of given ID with getPeople
            const options = {};
            if (mode == "ancestor") {
                options["ancestors"] = GENERATIONS;
            }
            if (mode == "descendant") {
                options["descendants"] = GENERATIONS;
            }
            const results = await WikiTreeAPI.getPeople(
                "stats",
                id,
                ["BirthDate, DeathDate, Name, Derived.BirthName, Gender, Spouses, Meta"],
                options
            );
            // save the list of familyMembers
            familyMembers = results[2];

            if (gender) {
                for (const profile in familyMembers) {
                    if (familyMembers[profile].Gender != gender) {
                        delete familyMembers[profile];
                    }
                }
            }
        }

        async function calculateAvgAgeEachGen(gender) {
            let oldestAge = 0;
            let oldestPerson = "";

            let oldestMaleAge = 0;
            let oldestMalePerson = "";

            let oldestFemaleAge = 0;
            let oldestFemalePerson = "";

            // fill array with the birth and death years of all family members in each generation

            // setup birth and death year storage with an array for each generation
            const profileCounts = {};
            const birthYears = {};
            const deathAges = {};
            const marriageAges = {};
            const childrenCounts = {};
            const siblingsCounts = {};
            for (let i = 0; i <= GENERATIONS; i++) {
                profileCounts[i] = 0;
                birthYears[i] = [];
                deathAges[i] = [];
                marriageAges[i] = [];
                childrenCounts[i] = [];
                siblingsCounts[i] = [];
            }

            // for each family member
            for (const person in familyMembers) {
                const familyMember = familyMembers[person];

                let generation = familyMember["Meta"]["Degrees"];
                let gender = familyMember["Gender"];
                let birthYear;
                let deathYear;
                let marriageYear;
                if (familyMember.hasOwnProperty("BirthDate")) {
                    birthYear = parseInt(familyMember["BirthDate"].substring(0, 4));
                }
                if (familyMember.hasOwnProperty("DeathDate")) {
                    deathYear = parseInt(familyMember["DeathDate"].substring(0, 4));
                }
                if (familyMember.hasOwnProperty("Spouses")) {
                    if (familyMember.Spouses.length > 1) {
                        // Check for multiple marriages
                        familyMember.Spouses = familyMember.Spouses.filter(function (value) {
                            return value.MarriageDate != "0000-00-00"; // Remove marriages without a date
                        });
                        // Ensure the 1st marriage element is the earliest one
                        familyMember.Spouses.sort(function (a, b) {
                            return parseInt(a.MarriageDate.substring(0, 4)) - parseInt(b.MarriageDate.substring(0, 4));
                        });
                    }
                    if (familyMember.Spouses[0]) {
                        marriageYear = parseInt(familyMember.Spouses[0]["MarriageDate"].substring(0, 4));
                    }
                }

                // increase the profile count of the proper generation
                profileCounts[generation]++;

                // add the birth year to the proper generation
                let birthGeneration = birthYears[generation];
                if (birthYear > 0) {
                    birthGeneration.push(birthYear);
                }

                // add the marriage age to the proper generation
                let ageAtMarriage;
                if (marriageYear && birthYear > 0) {
                    ageAtMarriage = getAgeAtEvent(familyMember["BirthDate"], familyMember.Spouses[0]["MarriageDate"]);
                }
                let marriageAgeGeneration = marriageAges[generation];
                if (ageAtMarriage != null) {
                    marriageAgeGeneration.push(ageAtMarriage);
                }

                // add the death age to the proper generation
                let ageAtDeath;
                if (familyMember.hasOwnProperty("BirthDate") && familyMember.hasOwnProperty("DeathDate")) {
                    ageAtDeath = getAgeAtEvent(familyMember["BirthDate"], familyMember["DeathDate"]);
                }
                let deathAgeGeneration = deathAges[generation];
                if (ageAtDeath != null) {
                    deathAgeGeneration.push(ageAtDeath);
                }

                // check if this family member is the oldest one so far
                if (ageAtDeath > oldestAge) {
                    oldestAge = ageAtDeath;
                    oldestPerson = `
                    <a href="https://www.wikitree.com/wiki/${familyMember["Name"]}" target="_blank">${familyMember["BirthName"]}</a>`;
                }

                if ((gender == "Male") & (ageAtDeath > oldestMaleAge)) {
                    oldestMaleAge = ageAtDeath;
                    oldestMalePerson = `
                    <a href="https://www.wikitree.com/wiki/${familyMember["Name"]}" target="_blank">${familyMember["BirthName"]}</a>`;
                }

                if (gender == "Female" && ageAtDeath > oldestFemaleAge) {
                    oldestFemaleAge = ageAtDeath;
                    oldestFemalePerson = `
                    <a href="https://www.wikitree.com/wiki/${familyMember["Name"]}" target="_blank">${familyMember["BirthName"]}</a>`;
                }
            }

            // Look up the number of siblings / children
            let profileIDs = [];
            for (const person in familyMembers) {
                profileIDs.push(person);
            }
            WikiTreeAPI.getRelatives("stats", profileIDs, ["Id"], {
                getChildren: 1,
                getSiblings: 1,
            }).then(calculateChildrenSiblings);

            function calculateChildrenSiblings(relatives) {
                for (const relative in relatives) {
                    let generation = familyMembers[relatives[relative].key]["Meta"]["Degrees"];

                    let person = relatives[relative].person;
                    childrenCounts[generation].push(Object.keys(person.Children).length);
                    siblingsCounts[generation].push(Object.keys(person.Siblings).length);
                }

                // calculate the average number of children for each generation
                const avgChildrenCounts = [];
                for (const generation in childrenCounts) {
                    let avgChildrenCount;
                    let sumOfChildrenCounts = 0;
                    let countOfChildrenCounts = childrenCounts[generation].length;
                    for (const count in childrenCounts[generation]) {
                        sumOfChildrenCounts += childrenCounts[generation][count];
                    }
                    avgChildrenCount = Math.round(sumOfChildrenCounts / countOfChildrenCounts);
                    if (isNaN(avgChildrenCount)) {
                        avgChildrenCount = "-";
                    }
                    avgChildrenCounts.push(avgChildrenCount);
                }

                // calculate the average number of siblings for each generation
                const avgSiblingsCounts = [];
                for (const generation in siblingsCounts) {
                    let avgSiblingsCount;
                    let sumOfSiblingsCounts = 0;
                    let countOfSiblingsCounts = siblingsCounts[generation].length;
                    for (const count in siblingsCounts[generation]) {
                        sumOfSiblingsCounts += siblingsCounts[generation][count];
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

                window.StatsView.hideShakingTree();
            }

            // sort birth years by earliest to latest
            for (const generation in birthYears) {
                birthYears[generation].sort(sortByYear);
            }

            // calculate the earliest birth year for each generation
            const earliestBirthYears = [];
            for (const generation in birthYears) {
                let earliestBirthYear;
                if (birthYears[generation][0] != undefined) {
                    earliestBirthYear = birthYears[generation][0];
                } else {
                    earliestBirthYear = "-";
                }
                earliestBirthYears.push(earliestBirthYear);
            }

            // calculate the latest birth year for each generation
            const latestBirthYears = [];
            for (const generation in birthYears) {
                let latestBirthYear;
                if (birthYears[generation][birthYears[generation].length - 1] != undefined) {
                    latestBirthYear = birthYears[generation][birthYears[generation].length - 1];
                } else {
                    latestBirthYear = "-";
                }
                latestBirthYears.push(latestBirthYear);
            }

            // calculate the average birth year for each generation
            const avgBirthYears = [];
            for (const generation in birthYears) {
                let avgBirthYear;
                let sumOfBirthYears = 0;
                let countOfBirthYears = birthYears[generation].length;
                for (const year in birthYears[generation]) {
                    sumOfBirthYears += birthYears[generation][year];
                }
                avgBirthYear = Math.round(sumOfBirthYears / countOfBirthYears);
                if (isNaN(avgBirthYear)) {
                    avgBirthYear = "-";
                }
                avgBirthYears.push(avgBirthYear);
            }

            // calculate the average marriage age for each generation
            const avgMarriageAges = [];
            for (const generation in marriageAges) {
                let avgMarriageAge;
                let sumOfMarriageAges = 0;
                let countOfMarriageAges = marriageAges[generation].length;
                for (const age in marriageAges[generation]) {
                    sumOfMarriageAges += marriageAges[generation][age];
                }
                avgMarriageAge = Math.round(sumOfMarriageAges / countOfMarriageAges);
                if (isNaN(avgMarriageAge)) {
                    avgMarriageAge = "-";
                }
                avgMarriageAges.push(avgMarriageAge);
            }

            // calculate the generation length for each generation -- average age of giving birth to your family members
            const avgGenLengths = [];
            for (const generation in birthYears) {
                let genLength = 0;
                if (mode == "ancestor") {
                    genLength = avgBirthYears[generation - 1] - avgBirthYears[generation];
                } else if (mode == "descendant") {
                    genLength = avgBirthYears[generation] - avgBirthYears[generation - 1];
                }

                if (isNaN(genLength) || genLength == 0) {
                    genLength = "-";
                }

                avgGenLengths.push(genLength);
            }

            // calculate the average lifespan for each generation
            const avgLifeSpans = [];
            for (const generation in deathAges) {
                let avgLifeSpan;
                let deathAgeSum = 0;
                let deathAgeCount = deathAges[generation].length;
                for (const age in deathAges[generation]) {
                    deathAgeSum += deathAges[generation][age];
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
            avgLifeSpanDiv.innerHTML = `Average lifespan: ${overallAvgLifeSpan}`;
            results.appendChild(avgLifeSpanDiv);

            // show oldest family member
            let oldestRelativeDiv = document.createElement("div");
            oldestRelativeDiv.innerHTML = `Oldest ${mode}: ${oldestPerson}, ${oldestAge} years old.`;
            results.appendChild(oldestRelativeDiv);

            if (!gender) {
                let oldestMaleRelativeDiv = document.createElement("div");
                oldestMaleRelativeDiv.innerHTML = `Oldest male ${mode}: ${oldestMalePerson}, ${oldestMaleAge} years old.`;
                results.appendChild(oldestMaleRelativeDiv);

                let oldestFemaleRelativeDiv = document.createElement("div");
                oldestFemaleRelativeDiv.innerHTML = `Oldest female ${mode}: ${oldestFemalePerson}, ${oldestFemaleAge} years old.`;
                results.appendChild(oldestFemaleRelativeDiv);
            }

            fillTable({
                profileCounts: profileCounts,
                birthYears: birthYears,
                earliestBirthYears: earliestBirthYears,
                latestBirthYears: latestBirthYears,
                avgBirthYears: avgBirthYears,
                avgMarriageAges: avgMarriageAges,
                avgGenLengths: avgGenLengths,
                avgLifeSpans: avgLifeSpans,
            });
        }

        function fillTable(stats) {
            let table = document.querySelector("#stats-table > tbody");

            for (let generation = 0; generation < GENERATIONS; generation++) {
                let maxAncestorsForGen = Math.pow(2, generation);

                let row = table.insertRow(-1);
                row.id = "stats-row" + generation;
                row.insertCell(0).innerHTML = generation + 1;
                row.insertCell(1).innerHTML = genNames[generation];
                if (mode == "ancestor") {
                    row.insertCell(2).innerHTML = `${stats.profileCounts[generation]}/${maxAncestorsForGen}`;
                } else {
                    row.insertCell(2).innerHTML = `${stats.profileCounts[generation]}`;
                }
                row.insertCell(
                    3
                ).innerHTML = `${stats.birthYears[generation].length}/${stats.profileCounts[generation]}`;
                row.insertCell(4).innerHTML = stats.earliestBirthYears[generation];
                row.insertCell(5).innerHTML = stats.latestBirthYears[generation];
                row.insertCell(6).innerHTML = stats.avgBirthYears[generation];
                row.insertCell(7).innerHTML = stats.avgMarriageAges[generation];
                row.insertCell(8).innerHTML = stats.avgGenLengths[generation];
                row.insertCell(9).innerHTML = stats.avgLifeSpans[generation];
                row.insertCell(10).innerHTML = "<i>loading</i>";
                row.insertCell(11).innerHTML = "<i>loading</i>";
            }
        }

        function updateTable(stats) {
            let table = document.querySelector("#stats-table > tbody");
            for (let generation = 0; generation < GENERATIONS; generation++) {
                let row = table.querySelector("#stats-row" + generation);
                row.cells[10].innerHTML = stats.avgChildrenCounts[generation];
                row.cells[11].innerHTML = stats.avgSiblingsCounts[generation];
            }
        }

        function getAgeAtEvent(birth, event) {
            let birthDate;
            let eventDate;

            if (getMonth(birth) != "00" && getDay(birth) != "00") {
                birthDate = new Date(birth);
            } else if (getYear(birth) == "0000") {
                birthDate = new Date(birth);
            } else {
                birthDate = new Date(getYear(birth));
            }

            if (getMonth(event) != "00" && getDay(event) != "00") {
                eventDate = new Date(event);
            } else if (getYear(event) == "0000") {
                eventDate = new Date(event);
            } else {
                eventDate = new Date(getYear(event));
            }

            if (birthDate != "Invalid Date" && eventDate != "Invalid Date") {
                let age = Math.floor((eventDate - birthDate) / 31536000000);
                if (age > 0) {
                    return age;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }

        function getYear(date) {
            return date.substring(0, 4);
        }

        function getMonth(date) {
            return date.substring(5, 7);
        }

        function getDay(date) {
            return date.substring(8, 10);
        }

        function sortByYear(a, b) {
            return a - b;
        }
    }

    static showShakingTree(callback) {
        if ($("#tree").length) {
            $("#tree").slideDown("fast", "swing", callback);
        } else {
            const treeGIF = $("<img id='tree' src='./views/cc7/images/tree.gif'>");
            treeGIF.appendTo("#statsContainer");
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "50px",
                "width": "50px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
        }
    }

    static hideShakingTree() {
        $("#tree").slideUp("fast");
    }
};
