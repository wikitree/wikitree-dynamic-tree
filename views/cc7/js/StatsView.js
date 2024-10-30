import { CC7Utils } from "./CC7Utils.js";

export class StatsView {
    static async build(gender = "") {
        $("#peopleTable").hide();
        if (["missing-links", "complete"].includes($("#cc7Subset").val())) {
            $("#cc7Subset").val("all").prop("selected", true).trigger("change");
        }
        $("#cc7Subset option[value='missing-links']").prop("disabled", true);
        $("#cc7Subset option[value='complete']").prop("disabled", true);
        const subset = $("#cc7Subset").val();
        let subsetWord = CC7Utils.subsetWord();
        if (subsetWord !== "") subsetWord = subsetWord + " ";
        const caption = "Statistics for " + CC7Utils.tableCaptionWithSubset();
        const genNames = fillGenNames(subset);
        const statsView = $(`
            <div id='statsView' class="subsetable ${subset}">
                <fieldset id="statsFieldset">
                    <legend>Options:</legend>
                    <label for="gender"
                        title="The genders to search and report on">Genders to search
                        <select id="gender" title="The genders to search and report on">
                            <option value="">all</option>
                            <option value="Male">males only</option>
                            <option value="Female">females only</option>
                        </select>
                    </label>
                </fieldset>
                <table id="statsTable">
                    <caption>${caption}</caption>
                    <thead>
                        <tr>
                            <th>Degree</th>
                            <th title='The relationship with the person whose profile ID was entered at the top of this form.'>
                                Relation</th>
                            <th title='How many ${subsetWord}profiles exist per degree. For ancestors, the total number expected for that generation is also given.'>
                                Total Profiles</th>
                            <th title='How many ${subsetWord}profiles per degree have a valid birth year.'>
                                Profiles w/ Birth Year</th>
                            <th title='The earliest birth year for ${subsetWord}profiles per degree.'>
                                Earliest Birth Year</th>
                            <th title='The latest birth year for ${subsetWord}profiles per degree.'>
                                Latest Birth Year</th>
                            <th title='The average birth year for ${subsetWord}profiles per degree.'>
                                Average Birth Year</th>
                            <th title='Average Marriage Age is based on the age at the time of a first marriage. Any subsequent marriages are ignored.'>
                                Average Marriage Age</th>
                            <th title='Gen Length is the difference between the average birth year of ${subsetWord}profiles per degree and the next lower degree. This is only a sensible stat for direct ancestors and descendants.'>
                                Gen Length</th>
                            <th title='The average age at death of ${subsetWord}profiles per degree.'>
                                Average Lifespan</th>
                            <th title='The average number of children of ${subsetWord}profiles per degree.'>
                                Average Children</th>
                            <th title='The average number of siblings of ${subsetWord}profiles per degree. This will be inaccurate at the highest degree unless "Improve count accuracy" is checked.'>
                                Average Siblings</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <div id="resultsContainer"></div>
            </div>`);
        if ($("#statsView").length) {
            $("#statsView").eq(0).replaceWith(statsView);
        } else {
            $("#tableButtons").after(statsView);
        }
        $("#statsTable > tbody").html(""); // Clear away any previous stats
        $("#resultsContainer").html(""); // Clear away any previous results
        $("#gender").val(gender);
        $("#gender")
            .off("change")
            .on("change", function () {
                StatsView.build($(this).val());
            });
        const familyMembers = getSubset();

        function getSubset() {
            const theSubset = new Map();
            for (let aPerson of window.people.values()) {
                if (CC7Utils.profileIsInSubset(aPerson, subset, gender)) {
                    theSubset.set(+aPerson.Id, aPerson);
                }
            }
            if (!["missing-links", "complete"].includes(subset)) {
                const root = window.people.get(window.rootId);
                if (root) theSubset.set(+root.Id, root);
            }
            return theSubset;
        }
        calculateStatistics(subset, gender);

        $("#peopleTable").removeClass("active");
        $("#statsView").addClass("active");

        function calculateStatistics(subset, gender) {
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
            for (let i = 0; i <= window.cc7Degree; i++) {
                profileCounts[i] = 0;
                birthYears[i] = [];
                deathAges[i] = [];
                marriageAges[i] = [];
                childrenCounts[i] = [];
                siblingsCounts[i] = [];
            }

            // for each family member
            for (const familyMember of familyMembers.values()) {
                // const familyMember = familyMembers[person];

                const generation = familyMember["Meta"]["Degrees"];
                const gender = familyMember["Gender"];
                let birthYear;
                let marriageYear;
                if (familyMember.hasOwnProperty("BirthDate")) {
                    birthYear = parseInt(familyMember["BirthDate"].substring(0, 4));
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
                const deathAgeGeneration = deathAges[generation];
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
                const countOfBirthYears = birthYears[generation].length;
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
                const countOfMarriageAges = marriageAges[generation].length;
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
                if (subset == "ancestors") {
                    genLength = avgBirthYears[generation - 1] - avgBirthYears[generation];
                } else if (subset == "descendants") {
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

            let results = document.getElementById("resultsContainer");

            let avgGenLengthDiv = document.createElement("div");
            avgGenLengthDiv.innerHTML = `Average generation length: ${
                isNaN(overallAvgGenLength) ? "-" : overallAvgGenLength
            }`;
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

            function getSubsetName() {
                switch (subset) {
                    case "above":
                        return ' person "Above"';

                    case "below":
                        return ' person "Below"';

                    case "ancestors":
                        return " ancestor";

                    case "descendants":
                        return " descendant";

                    case "missing-links":
                        return " person with missing family";

                    case "complete":
                        return " person with complete profile";

                    default:
                        return " person";
                }
            }

            // show oldest family member
            let subsetName = getSubsetName();
            let oldestRelativeDiv = document.createElement("div");
            oldestRelativeDiv.innerHTML = `Oldest${subsetName}: ${oldestPerson}, ${oldestAge} years old.`;
            results.appendChild(oldestRelativeDiv);

            if (!gender) {
                subsetName = subsetName.replace(/^ person/, "");
                let oldestMaleRelativeDiv = document.createElement("div");
                oldestMaleRelativeDiv.innerHTML = `Oldest male${subsetName}: ${oldestMalePerson}, ${oldestMaleAge} years old.`;
                results.appendChild(oldestMaleRelativeDiv);

                let oldestFemaleRelativeDiv = document.createElement("div");
                oldestFemaleRelativeDiv.innerHTML = `Oldest female${subsetName}: ${oldestFemalePerson}, ${oldestFemaleAge} years old.`;
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

            calculateChildrenSiblings();
            function calculateChildrenSiblings() {
                for (const person of familyMembers.values()) {
                    const generation = person.Meta.Degrees;

                    // const person = relatives[relative].person;
                    childrenCounts[generation].push(person.Child.length);
                    siblingsCounts[generation].push(person.Sibling.length);
                }

                // calculate the average number of children for each generation
                const avgChildrenCounts = [];
                for (const generation in childrenCounts) {
                    let avgChildrenCount;
                    let sumOfChildrenCounts = 0;
                    const countOfChildrenCounts = childrenCounts[generation].length;
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
                    const countOfSiblingsCounts = siblingsCounts[generation].length;
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
            }
        }

        function fillTable(stats) {
            let table = document.querySelector("#statsTable > tbody");

            for (let generation = 0; generation <= window.cc7Degree; ++generation) {
                let maxAncestorsForGen = Math.pow(2, generation);

                let row = table.insertRow(-1);
                row.id = "stats-row" + generation;
                row.insertCell(0).innerHTML = generation;
                row.insertCell(1).innerHTML = genNames[generation];
                if (subset == "ancestors") {
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
            let table = document.querySelector("#statsTable > tbody");
            for (let generation = 0; generation <= window.cc7Degree; ++generation) {
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

        function fillGenNames(subset) {
            const names = [];
            if (subset == "ancestors" || subset == "descendants") {
                names[0] = "Self";
                let modifier = ""; // Either parents or children
                if (subset == "ancestors") {
                    names[1] = "Parents";
                    modifier = "parents";
                } else if (subset == "descendants") {
                    names[1] = "Children";
                    modifier = "children";
                }
                names[2] = "Grand" + modifier;
                names[3] = "Great-Grand" + modifier;
                if (window.cc7Degree > 3) {
                    for (let i = 4; i <= window.cc7Degree; ++i) {
                        let greats = i - 2;
                        names[i] = greats + "x Great-Grand" + modifier;
                    }
                }
            } else {
                for (let i = 0; i <= window.cc7Degree; ++i) {
                    names[i] = getCCName(i, subset);
                }
            }
            return names;

            function getCCName(degree, subset) {
                if (degree == 0) return "Self";
                switch (subset) {
                    case "above":
                        return `CC${degree} "Above"`;

                    case "below":
                        return `CC${degree} "Below"`;

                    case "missing-links":
                        return `CC${degree} missing family`;

                    case "complete":
                        return `CC${degree} complete`;

                    default:
                        return `CC${degree}`;
                }
            }
        }
    }
}
