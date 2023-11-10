window.StatsView = class StatsView extends View {
    static #helpText = `
    <xx>[ x ]</xx>
    <h2 style="text-align: center">About Ancestor Statistics</h2>
    <p>
        The app show statistics about the ancestors of a profile. Each of the 10 generations of
        ancestors are shown as a separate row with some overall stats shown below the table.
    </p>
    <p>
        Table columns explained:
        <ul>
            <li>
                <b>Total Profiles</b> shows how many profiles exist in this generation versus the total expected for 
                that generation.
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
            title: "Ancestor Statistics",
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
        let GENERATIONS = 10;
        var ancestors = {};

        document.querySelector(container_selector).innerHTML = `
            <div id="statsContainer" class="stats">
                <div id="controlBlock" class="stats-not-printable">
                    <label for="gender" title="The genders to search and report on">Genders to search</label>
                    <select id="gender" title="The genders to search and report on">
                        <option value="" selected>all</option>
                        <option value="Male">males only</option>
                        <option value="Female">females only</option>
                    </select>
                    <button id="getStatsButton" class="small button" title="Get ancestor stats">Get ancestor stats</button>
                    <span id="help-button" title="About this">?</span>
                    <div id="help-text">${window.StatsView.#helpText}</div>
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
            const selectedGender = $("#gender").val();
            gatherStats(person_id, selectedGender);
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

        const selectedGender = $("#gender").val();
        gatherStats(person_id, selectedGender);

        async function gatherStats(id, gender) {
            window.StatsView.showShakingTree();

            let results = document.getElementById("results-container");
            results.innerHTML = ""; // Clear away any previous results
            let table = document.querySelector("#stats-table > tbody");
            table.innerHTML = ""; // Clear away any previous results

            fillGenNames();

            await getAncestors(id, gender);

            calculateAvgAgeEachGen(gender);
        }

        function fillGenNames() {
            genNames[0] = "Self";
            genNames[1] = "Parents";
            genNames[2] = "Grandparents";
            genNames[3] = "Great-Grandparents";
            if (GENERATIONS > 3) {
                for (let i = 4; i <= GENERATIONS; i++) {
                    let greats = i - 2;
                    genNames[i] = greats + "x Great-Grandparents";
                }
            }
        }

        async function getAncestors(id, gender) {
            // get ancestors of given ID with getPeople
            const results = await WikiTreeAPI.getPeople(
                "stats",
                id,
                ["BirthDate, DeathDate, Name, Derived.BirthName, Gender, Spouses, Meta"],
                {
                    ancestors: GENERATIONS,
                }
            );
            // save the list of ancestors
            ancestors = results[2];

            if (gender) {
                for (const profile in ancestors) {
                    if (ancestors[profile].Gender != gender) {
                        delete ancestors[profile];
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

            // fill array with the birth years of all ancestors in each generation and death years

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

            // for each ancestor
            for (const person in ancestors) {
                const ancestor = ancestors[person];

                //console.log(ancestor);

                let ancestorGeneration = ancestor["Meta"]["Degrees"];
                let ancestorGender = ancestor["Gender"];
                let ancestorBirthYear;
                let ancestorDeathYear;
                let ancestorMarriageYear;
                if (ancestor.hasOwnProperty("BirthDate")) {
                    ancestorBirthYear = parseInt(ancestor["BirthDate"].substring(0, 4));
                }
                if (ancestor.hasOwnProperty("DeathDate")) {
                    ancestorDeathYear = parseInt(ancestor["DeathDate"].substring(0, 4));
                }
                if (ancestor.hasOwnProperty("Spouses")) {
                    if (ancestor.Spouses.length > 1) {
                        // Check for multiple marriages
                        ancestor.Spouses = ancestor.Spouses.filter(function (value) {
                            return value.MarriageDate != "0000-00-00"; // Remove marriages without a date
                        });
                        // Ensure the 1st marriage element is the earliest one
                        ancestor.Spouses.sort(function (a, b) {
                            return parseInt(a.MarriageDate.substring(0, 4)) - parseInt(b.MarriageDate.substring(0, 4));
                        });
                    }
                    if (ancestor.Spouses[0]) {
                        ancestorMarriageYear = parseInt(ancestor.Spouses[0]["MarriageDate"].substring(0, 4));
                    }
                }

                // increase the profile count of the proper generation
                profileCounts[ancestorGeneration]++;

                // add the birth year to the proper generation
                let birthGeneration = birthYears[ancestorGeneration];
                if (ancestorBirthYear > 0) {
                    birthGeneration.push(ancestorBirthYear);
                }

                // add the marriage age to the proper generation
                let ancestorAgeAtMarriage;
                if (ancestorMarriageYear && ancestorBirthYear > 0) {
                    ancestorAgeAtMarriage = getAgeAtEvent(ancestor["BirthDate"], ancestor.Spouses[0]["MarriageDate"]);
                }
                let marriageAgeGeneration = marriageAges[ancestorGeneration];
                if (ancestorAgeAtMarriage != null) {
                    marriageAgeGeneration.push(ancestorAgeAtMarriage);
                }

                // add the death age to the proper generation
                let ancestorAgeAtDeath;
                if (ancestor.hasOwnProperty("BirthDate") && ancestor.hasOwnProperty("DeathDate")) {
                    ancestorAgeAtDeath = getAgeAtEvent(ancestor["BirthDate"], ancestor["DeathDate"]);
                }
                let deathAgeGeneration = deathAges[ancestorGeneration];
                if (ancestorAgeAtDeath != null) {
                    deathAgeGeneration.push(ancestorAgeAtDeath);
                }

                // check if this ancestor is the oldest one so far
                if (ancestorAgeAtDeath > oldestAge) {
                    oldestAge = ancestorAgeAtDeath;
                    oldestPerson = `
                    <a href="https://www.wikitree.com/wiki/${ancestor["Name"]}" target="_blank">${ancestor["BirthName"]}</a>`;
                }

                if ((ancestorGender == "Male") & (ancestorAgeAtDeath > oldestMaleAge)) {
                    oldestMaleAge = ancestorAgeAtDeath;
                    oldestMalePerson = `
                    <a href="https://www.wikitree.com/wiki/${ancestor["Name"]}" target="_blank">${ancestor["BirthName"]}</a>`;
                }

                if (ancestorGender == "Female" && ancestorAgeAtDeath > oldestFemaleAge) {
                    oldestFemaleAge = ancestorAgeAtDeath;
                    oldestFemalePerson = `
                    <a href="https://www.wikitree.com/wiki/${ancestor["Name"]}" target="_blank">${ancestor["BirthName"]}</a>`;
                }
            }

            // Look up the number of siblings / children
            let profileIDs = [];
            for (const person in ancestors) {
                profileIDs.push(person);
            }
            WikiTreeAPI.getRelatives("stats", profileIDs, ["Id"], {
                getChildren: 1,
                getSiblings: 1,
            }).then(calculateChildrenSiblings);

            function calculateChildrenSiblings(relatives) {
                for (const relative in relatives) {
                    let generation = ancestors[relatives[relative].key]["Meta"]["Degrees"];

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

            // calculate the generation length for each generation -- average age of giving birth to your ancestor
            const avgGenLengths = [];
            for (const generation in birthYears) {
                let genLength = avgBirthYears[generation - 1] - avgBirthYears[generation];

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

            // show oldest ancestor
            let oldestAncestorDiv = document.createElement("div");
            oldestAncestorDiv.innerHTML = `Oldest ancestor: ${oldestPerson}, ${oldestAge} years old.`;
            results.appendChild(oldestAncestorDiv);

            if (!gender) {
                let oldestMaleAncestorDiv = document.createElement("div");
                oldestMaleAncestorDiv.innerHTML = `Oldest male ancestor: ${oldestMalePerson}, ${oldestMaleAge} years old.`;
                results.appendChild(oldestMaleAncestorDiv);

                let oldestFemaleAncestorDiv = document.createElement("div");
                oldestFemaleAncestorDiv.innerHTML = `Oldest female ancestor: ${oldestFemalePerson}, ${oldestFemaleAge} years old.`;
                results.appendChild(oldestFemaleAncestorDiv);
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
                row.insertCell(2).innerHTML = `${stats.profileCounts[generation]}/${maxAncestorsForGen}`;
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
