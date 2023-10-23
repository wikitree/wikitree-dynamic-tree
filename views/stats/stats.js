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
                <b>Gen Length</b> is worked out as the difference between the average birth year of this generation
                and the more recent one.
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
                            <th>Gen Length</th>
                            <th>Average Lifespan</th>
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
                ["BirthDate, DeathDate, Name, Derived.BirthName, Gender, Meta"],
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

        function calculateAvgAgeEachGen(gender) {
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
            for (let i = 0; i <= GENERATIONS; i++) {
                profileCounts[i] = 0;
                birthYears[i] = [];
                deathAges[i] = [];
            }

            // for each ancestor
            for (const person in ancestors) {
                const ancestor = ancestors[person];

                //console.log(ancestor);

                let ancestorGeneration = ancestor["Meta"]["Degrees"];
                let ancestorGender = ancestor["Gender"];
                let ancestorBirthYear;
                let ancestorDeathYear;
                if (ancestor.hasOwnProperty("BirthDate")) {
                    ancestorBirthYear = parseInt(ancestor["BirthDate"].substring(0, 4));
                }
                if (ancestor.hasOwnProperty("DeathDate")) {
                    ancestorDeathYear = parseInt(ancestor["DeathDate"].substring(0, 4));
                }

                // increase the profile count of the proper generation
                profileCounts[ancestorGeneration]++;

                // add the birth year to the proper generation
                let birthGeneration = birthYears[ancestorGeneration];
                if (ancestorBirthYear > 0) {
                    birthGeneration.push(ancestorBirthYear);
                }

                // add the death age to the proper generation
                let ancestorAgeAtDeath;
                if (ancestor.hasOwnProperty("BirthDate") && ancestor.hasOwnProperty("DeathDate")) {
                    ancestorAgeAtDeath = getAgeAtDeath(ancestor["BirthDate"], ancestor["DeathDate"]);
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
                avgGenLengths: avgGenLengths,
                avgLifeSpans: avgLifeSpans,
            });
        }

        function fillTable(stats) {
            let table = document.querySelector("#stats-table > tbody");

            for (let generation = 0; generation < GENERATIONS; generation++) {
                let maxAncestorsForGen = Math.pow(2, generation);

                let row = table.insertRow(-1);
                row.insertCell(0).innerHTML = generation + 1;
                row.insertCell(1).innerHTML = genNames[generation];
                row.insertCell(2).innerHTML = `${stats.profileCounts[generation]}/${maxAncestorsForGen}`;
                row.insertCell(
                    3
                ).innerHTML = `${stats.birthYears[generation].length}/${stats.profileCounts[generation]}`;
                row.insertCell(4).innerHTML = stats.earliestBirthYears[generation];
                row.insertCell(5).innerHTML = stats.latestBirthYears[generation];
                row.insertCell(6).innerHTML = stats.avgBirthYears[generation];
                row.insertCell(7).innerHTML = stats.avgGenLengths[generation];
                row.insertCell(8).innerHTML = stats.avgLifeSpans[generation];
            }
        }

        function getAgeAtDeath(birth, death) {
            let birthDate;
            let deathDate;

            if (getMonth(birth) != "00" && getDay(birth) != "00") {
                birthDate = new Date(birth);
            } else if (getYear(birth) == "0000") {
                birthDate = new Date(birth);
            } else {
                birthDate = new Date(getYear(birth));
            }

            if (getMonth(death) != "00" && getDay(death) != "00") {
                deathDate = new Date(death);
            } else if (getYear(death) == "0000") {
                deathDate = new Date(death);
            } else {
                deathDate = new Date(getYear(death));
            }

            if (birthDate != "Invalid Date" && deathDate != "Invalid Date") {
                let age = Math.floor((deathDate - birthDate) / 31536000000);
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
};
