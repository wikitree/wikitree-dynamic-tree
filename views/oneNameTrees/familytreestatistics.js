import { LocationStatistics } from "./locationstatistics.js";
import {
    usStatesDetails,
    EnglandCounties,
    ScotlandCounties,
    WalesCounties,
    IrelandCounties,
    countries,
    historicalCountries,
} from "./location_data.js";

export class FamilyTreeStatistics {
    constructor(combinedResults) {
        this.clearPreviousResults();
        this.combinedResults = combinedResults;
        this.peopleArray = Object.values(combinedResults);
        this.locationStats = new LocationStatistics(this.peopleArray);
        this.locationStats.processLocations();
        this.updatePeopleWithChildCounts();
        this.periodData = this.getStatsInPeriods();
    }

    clearPreviousResults() {
        this.peopleArray = [];
        this.locationStats = new LocationStatistics([]);
        this.periodData = {};
    }

    getSettings() {
        return JSON.parse(localStorage.getItem("oneNameTreesSettings"));
    }

    getUnsourced() {
        // Count people where any person.Categories or person.Templates includes an item with the word 'Unsourced'
        const unsourced = this.peopleArray.filter(
            (person) =>
                (Array.isArray(person.Categories) &&
                    person.Categories.some((category) => category?.includes("Unsourced"))) ||
                (Array.isArray(person.Templates) &&
                    person.Templates.some((template) => template.name?.includes("Unsourced")))
        );
        // Sort by birth date
        unsourced.sort((a, b) => {
            // Make sure they have a BirthDate
            if (!a.BirthDate) return 1;
            return a.BirthDate.localeCompare(b.BirthDate);
        });
        return unsourced;
    }

    getUnconnected() {
        // Get people where person.Connected != 1
        // Check for that person.Connected exists first
        const unconnected = this.peopleArray.filter((person) => person.Connected !== 1);
        // Sort by birth date
        unconnected.sort((a, b) => {
            // Make sure they have a BirthDate
            if (!a.BirthDate) return 1;
            return a.BirthDate.localeCompare(b.BirthDate);
        });
        return unconnected;
    }

    getNoRelations() {
        const noRelations = this.peopleArray.filter(
            (person) =>
                (!person.Father || person.Father === 0) &&
                (!person.Mother || person.Mother === 0) &&
                !person.HasChildren &&
                person.Privacy >= 40 &&
                this.isSpousesObjectEmpty(person.Spouses) &&
                person.Father != null &&
                person.Mother != null
        );
        // Proceed with sorting as before
        noRelations.sort((a, b) => {
            if (!a.BirthDate) return 1;
            if (!b.BirthDate) return -1;
            return a.BirthDate.localeCompare(b.BirthDate);
        });
        return noRelations;
    }

    // Helper function to determine if the Spouses object is empty
    isSpousesObjectEmpty(spouses) {
        // If spouses is not an object or is null, treat it as "empty"
        if (typeof spouses !== "object" || spouses === null) {
            return true;
        }
        // Check if the object has any own properties
        return Object.keys(spouses).length === 0;
    }

    getTotalPeople() {
        return this.peopleArray.length;
    }

    getAverageLifespan() {
        let totalLifespan = 0;
        let count = 0;
        this.peopleArray.forEach((person) => {
            const birthYear = this.getYear(person.BirthDate);
            const deathYear = this.getYear(person.DeathDate);
            if (birthYear && deathYear) {
                totalLifespan += deathYear - birthYear;
                count++;
            }
        });
        return count > 0 ? (totalLifespan / count).toFixed(1) : 0;
    }

    getBirthDecadeDistribution() {
        const decadeCounts = {};
        this.peopleArray.forEach((person) => {
            const year = this.getYear(person.BirthDate);
            if (year) {
                const decade = year - (year % 10);
                decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
            }
        });
        return decadeCounts;
    }

    getChildCounts() {
        const childCounts = {};
        this.peopleArray.forEach((child) => {
            const fatherId = child.Father;
            if (fatherId) {
                childCounts[fatherId] = (childCounts[fatherId] || 0) + 1;
            }
        });
        return childCounts;
    }

    updatePeopleWithChildCounts() {
        const childCounts = this.getChildCounts();
        this.peopleArray.forEach((person) => {
            if (person.Gender === "Male") {
                person.childrenCount = childCounts[person.Id] || 0;
            }
        });
    }

    getGenderDistribution() {
        const genderCounts = { Male: 0, Female: 0, Unknown: 0 };
        this.peopleArray.forEach((person) => {
            const gender = person.Gender || "Unknown";
            genderCounts[gender]++;
        });
        return genderCounts;
    }

    getNameStatistics() {
        const nameCounts = {
            Male: {},
            Female: {},
            unknown: {},
        };

        this.peopleArray.forEach((person) => {
            let gender = person.Gender;
            if (!["Male", "Female"].includes(gender)) {
                gender = "unknown"; // Default to 'unknown' if gender is not 'male' or 'female'
            }

            if (person.FirstName && typeof person.FirstName === "string") {
                const names = this.splitNames(person.FirstName);

                names.forEach((name) => {
                    if (name) {
                        if (!nameCounts[gender].hasOwnProperty(name)) {
                            nameCounts[gender][name] = 0;
                        }
                        nameCounts[gender][name]++;
                    }
                });
            }
        });

        return nameCounts;
    }

    splitNames(fullName) {
        return fullName
            .split(/\s+/)
            .map((name) => name.trim())
            .filter((name) => name);
    }

    getTopNamesByGender(gender, topN = 10) {
        const nameStatistics = this.getNameStatistics();
        const names = nameStatistics[gender] || {};

        // Convert the object to an array of [name, count] pairs
        const sortedNames = Object.entries(names).sort((a, b) => b[1] - a[1]);

        // Return the top N names
        return sortedNames.slice(0, topN).map((item) => ({ name: item[0], count: item[1] }));
    }

    getYear(dateString) {
        return dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? parseInt(dateString.substring(0, 4)) : null;
    }

    getMigrantsCount() {
        return this.getMigrants().length;
    }

    getMigrants() {
        // Helper function to map location to its broader region or country
        const getTopLocation = (locationParts) => {
            if (!locationParts || locationParts.length === 0) {
                return null;
            }

            let topLocation = locationParts[0];

            // Mapping for UK counties to "United Kingdom" and handling Ireland separately
            if (
                EnglandCounties.includes(topLocation) ||
                ScotlandCounties.includes(topLocation) ||
                WalesCounties.includes(topLocation)
            ) {
                return "United Kingdom";
            } else if (IrelandCounties.includes(topLocation)) {
                return "Ireland";
            }

            // Handling US states and their historical names
            const stateOrHistoricalName = usStatesDetails.find(
                (s) =>
                    s.name.toLowerCase() === topLocation.toLowerCase() ||
                    (s.former_names &&
                        Object.keys(s.former_names).some((fn) => fn.toLowerCase() === topLocation.toLowerCase()))
            );
            if (stateOrHistoricalName) return "United States";

            // Checking modern and historical countries
            const country = countries.find(
                (c) =>
                    c.name.toLowerCase() === topLocation.toLowerCase() ||
                    (c.aliases && c.aliases.some((alias) => alias.toLowerCase() === topLocation.toLowerCase())) ||
                    c.nativeName.toLowerCase() === topLocation.toLowerCase()
            );

            if (country) return country.name;

            const historicalCountry = historicalCountries.find((c) => c.toLowerCase() === topLocation.toLowerCase());
            if (historicalCountry) return historicalCountry.name;
            return null; // Return null if no match is found
        };

        // Function to determine if the migration is between different regions/countries
        const isDifferentMigration = (birthLocation, deathLocation, birthParts, deathParts) => {
            const birthCountry = getTopLocation(birthParts);
            const deathCountry = getTopLocation(deathParts);

            // Special handling for Ireland and Northern Ireland
            if (
                birthLocation &&
                birthLocation.includes("Ireland") &&
                deathLocation &&
                deathLocation.includes("Ireland")
            ) {
                return false; // Treat as same region migration
            }

            return birthCountry && deathCountry && birthCountry !== deathCountry;
        };

        const migrants = this.peopleArray.filter((person) => {
            const birthParts = this.getReverseLocationArray(person.BirthLocation);
            const deathParts = this.getReverseLocationArray(person.DeathLocation);
            return isDifferentMigration(person.BirthLocation, person.DeathLocation, birthParts, deathParts);
        });

        return migrants;
    }

    getReverseLocationArray(location) {
        if (!location) return null;
        let parts = location.split(",");
        // Trim and reverse the array
        for (let i = 0; i < parts.length; i++) {
            parts[i] = parts[i].trim();
        }
        // Remove any empty parts
        parts = parts.filter((part) => part);
        parts.reverse();
        // If parts[0] is England/Scotland/Wales/Northern Ireland, add "United Kingdom" to the start just for comparison's sake.
        if (
            parts[0] === "England" ||
            parts[0] === "Scotland" ||
            parts[0] === "Wales" ||
            parts[0] === "Northern Ireland"
        ) {
            parts.unshift("United Kingdom");
        }

        if (
            usStatesDetails.some((state) => {
                const parts0Normalized = parts[0].replace(/'/g, "").toLowerCase();
                const nameMatch =
                    state.name.toLowerCase() === parts0Normalized ||
                    state.abbreviation.toLowerCase() === parts0Normalized;
                let formerNameMatch = false;
                if (state.former_names) {
                    formerNameMatch = Object.keys(state.former_names).some(
                        (formerName) => formerName.replace(/'/g, "").toLowerCase() === parts0Normalized
                    );
                }
                return nameMatch || formerNameMatch;
            })
        ) {
            parts.unshift("United States");
        }

        if (parts[0].match(/^U\.?K\.?$/i)) {
            parts[0] = "United Kingdom";
        }
        if (parts[0].match(/^U\.?S\.?(A\.?)?$/i)) {
            parts[0] = "United States";
        }
        return parts;
    }

    getStatsInPeriods() {
        const statsByPeriod = {};
        const childCounts = this.getChildCounts();
        const couples = {};
        const periodLength = parseInt(this.getSettings()?.periodLength) || 50;
        this.peopleArray.forEach((person) => {
            const birthYear = this.getYear(person.BirthDate);
            if (birthYear) {
                const period = this.getPeriod(birthYear, periodLength);

                if (!statsByPeriod[period]) {
                    statsByPeriod[period] = {
                        peopleCount: 0,
                        totalChildren: 0,
                        totalAgeAtDeath: 0,
                        deathsCount: 0,
                        malesOver16Count: 0,
                        names: { Male: {}, Female: {}, Unknown: {} },
                        locationStatistics: new LocationStatistics([]), // Initialize LocationStatistics for the period
                        migrantIds: [],
                    };
                }

                if (person.Gender === "Male") {
                    const ageAtDeath = this.calculateAgeAtDeath(person.BirthDate, person.DeathDate);
                    const isOver16 =
                        ageAtDeath >= 16 || (ageAtDeath === null && this.isAdultBasedOnYear(person.BirthDate));

                    if (isOver16) {
                        statsByPeriod[period].malesOver16Count++;
                    }
                }

                statsByPeriod[period].peopleCount++;
                statsByPeriod[period].totalChildren += childCounts[person.Id] || 0;

                const deathYear = this.getYear(person.DeathDate);
                if (deathYear) {
                    statsByPeriod[period].totalAgeAtDeath += deathYear - birthYear;
                    statsByPeriod[period].deathsCount++;
                }

                const gender = person.Gender || "Unknown";
                this.splitNames(person.FirstName).forEach((name) => {
                    if (name) {
                        if (!statsByPeriod[period].names[gender][name]) {
                            statsByPeriod[period].names[gender][name] = 0;
                        }
                        statsByPeriod[period].names[gender][name]++;
                    }
                });

                const fatherId = person.Father;
                const motherId = person.Mother;
                if (fatherId && motherId) {
                    const coupleKey = `${fatherId}-${motherId}`;
                    couples[period] = couples[period] || {};
                    if (!couples[period][coupleKey]) {
                        couples[period][coupleKey] = { children: 0 };
                    }
                    if (!couples[period][coupleKey].hasOwnProperty(person.Id)) {
                        couples[period][coupleKey].children++;
                        couples[period][coupleKey][person.Id] = true;
                    }
                }

                // Add person to LocationStatistics for the period
                statsByPeriod[period].locationStatistics.peopleArray.push(person);
            }
        });

        Object.keys(statsByPeriod).forEach((period) => {
            const periodData = statsByPeriod[period];

            // Process location data for the period
            periodData.locationStatistics.processLocations();

            periodData.averageChildren =
                periodData.peopleCount > 0 ? (periodData.totalChildren / periodData.malesOver16Count).toFixed(2) : 0;
            periodData.averageAgeAtDeath =
                periodData.deathsCount > 0 ? (periodData.totalAgeAtDeath / periodData.deathsCount).toFixed(2) : 0;

            ["Male", "Female", "Unknown"].forEach((gender) => {
                const names = periodData.names[gender];
                // Convert back to an object after sorting and slicing
                const sortedSlicedNames = Object.entries(names)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .reduce((obj, [name, count]) => {
                        obj[name] = count; // Reconstruct the object
                        return obj;
                    }, {});

                periodData.names[gender] = sortedSlicedNames;
            });

            let totalCouples = 0;
            let totalChildrenForCouples = 0;
            if (couples[period]) {
                Object.values(couples[period]).forEach((couple) => {
                    totalCouples++;
                    totalChildrenForCouples += couple.children;
                });

                periodData.averageChildrenPerCouple =
                    totalCouples > 0 ? (totalChildrenForCouples / totalCouples).toFixed(2) : 0;
            } else {
                periodData.averageChildrenPerCouple = 0;
            }

            // Access processed location data
            periodData.countryCounts = periodData.locationStatistics.getCountryCounts();
            periodData.subdivisionCounts = periodData.locationStatistics.getSubdivisionCounts();
        });

        // Step just before finalizing your statsByPeriod data
        const migrants = this.getMigrants(); // Get all migrants

        migrants.forEach((migrant) => {
            const birthYear = this.getYear(migrant.BirthDate);
            if (birthYear) {
                const period = this.getPeriod(birthYear, periodLength);
                if (!statsByPeriod[period]) {
                    statsByPeriod[period] = 0;
                } // Initialize the statsByPeriod object
                // Check if the period exists in statsByPeriod
                if (statsByPeriod[period]) {
                    // Increment the migrant count
                    statsByPeriod[period].migrantCount++;

                    // Simplify to only include ID
                    statsByPeriod[period].migrantIds = statsByPeriod[period].migrantIds || []; // Ensure the array is initialized
                    statsByPeriod[period].migrantIds.push(migrant.Id);
                }
            }
        });

        // After populating statsByPeriod, create an ordered array of period keys
        const orderedPeriodKeys = Object.keys(statsByPeriod).sort((a, b) => {
            // Assuming period format is "YYYY-YYYY", split and parse to get the start year
            const startYearA = parseInt(a.split("-")[0]);
            const startYearB = parseInt(b.split("-")[0]);
            return startYearA - startYearB; // Sort by start year
        });

        // Now you can create a sorted version of statsByPeriod
        const sortedStatsByPeriod = {};
        orderedPeriodKeys.forEach((periodKey) => {
            sortedStatsByPeriod[periodKey] = statsByPeriod[periodKey];
        });

        // Calculate most common names and locations for each period
        Object.keys(statsByPeriod).forEach((periodKey) => {
            const periodData = statsByPeriod[periodKey];

            periodData.mostCommonNames = this.getMostCommonNamesForPeriod(periodData.names);

            periodData.mostCommonLocations = this.getTopNLocations(periodData.subdivisionCounts, 10);

            // Debug: Check if most common locations are calculated as expected
        });

        // Use sortedStatsByPeriod for further processing
        return sortedStatsByPeriod;

        // return statsByPeriod;
    }

    getPeriod(year, periodLength) {
        // 1-50, 51-00 periods
        const startYear = Math.floor((year - 1) / periodLength) * periodLength + 1;
        const endYear = startYear + periodLength - 1;
        return `${startYear}-${endYear}`;
    }

    getAverageChildrenPerCouple() {
        const couples = {}; // Stores couple keys to children count

        // Assuming peopleArray is an array of all people with their parents' IDs
        this.peopleArray.forEach((person) => {
            const coupleKey = person.Father + "-" + person.Mother;
            if (person.Father && person.Mother) {
                if (!couples[coupleKey]) {
                    couples[coupleKey] = 1;
                } else {
                    couples[coupleKey]++;
                }
            }
        });

        let totalChildren = 0;
        Object.keys(couples).forEach((key) => {
            totalChildren += couples[key];
        });

        const average = totalChildren / Object.keys(couples).length;
        return average.toFixed(2); // Adjusts the result to two decimal places
    }

    // New Method: Calculate the total number of children in the dataset
    getTotalChildren() {
        return Object.values(this.getChildCounts()).reduce((sum, count) => sum + count, 0);
    }

    getAverageChildrenPerPerson() {
        let totalChildren = 0;
        let totalAdults = 0;

        this.peopleArray.forEach((person) => {
            const ageAtDeath = this.calculateAgeAtDeath(person.BirthDate, person.DeathDate);

            // Consider only adults (over 16) for the calculation
            if (ageAtDeath >= 16 || (ageAtDeath === null && this.isAdultBasedOnYear(person.BirthDate))) {
                totalAdults++;
                totalChildren += person.childrenCount || 0;
            }
        });

        return totalAdults > 0 ? (totalChildren / totalAdults).toFixed(2) : 0;
    }

    getAverageChildrenPerMaleOver16() {
        let totalChildren = 0;
        let totalMalesOver16 = 0;

        this.peopleArray.forEach((person) => {
            const ageAtDeath = this.calculateAgeAtDeath(person.BirthDate, person.DeathDate);
            if (
                person.Gender === "Male" &&
                (ageAtDeath >= 16 || (ageAtDeath === null && this.isAdultBasedOnYear(person.BirthDate)))
            ) {
                totalMalesOver16++;
                totalChildren += person.childrenCount || 0;
            }
        });

        return totalMalesOver16 > 0 ? (totalChildren / totalMalesOver16).toFixed(2) : 0;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;

        let [year, month, day] = dateStr.split("-").map(Number);
        if (month === 0) month = 1; // Default to January if month is missing
        if (day === 0) day = 1; // Default to first of the month if day is missing

        const date = new Date(year, month - 1, day); // Month is 0-indexed in JavaScript
        return isNaN(date.getTime()) ? null : date;
    }

    calculateAgeAtDeath(birthDate, deathDate) {
        const birth = this.parseDate(birthDate);
        const death = this.parseDate(deathDate);

        if (!birth || !death || birthDate == "0000-00-00" || deathDate == "0000-00-00") {
            return -1;
        }

        let age = death.getFullYear() - birth.getFullYear();
        const m = death.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && death.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    // Additional helper method to check if a person is an adult based on their birth year
    isAdultBasedOnYear(birthDate) {
        const birthYear = new Date(birthDate).getFullYear();
        const currentYear = new Date().getFullYear();
        return birthYear <= currentYear - 16;
    }

    // New Method: Calculate the average number of children per couple for the whole dataset
    getAverageChildrenPerCoupleForDataset() {
        const couples = this.calculateCouples();
        let totalCouples = 0;
        let totalChildrenForCouples = 0;

        Object.values(couples).forEach((couple) => {
            totalCouples++;
            totalChildrenForCouples += couple.children;
        });

        return totalCouples > 0 ? (totalChildrenForCouples / totalCouples).toFixed(2) : 0;
    }

    // Helper Method: Calculate couples and their children
    calculateCouples() {
        const couples = {};

        // Assume getChildCounts gives a direct count of children for each individual
        this.peopleArray.forEach((person) => {
            const fatherId = person.Father;
            const motherId = person.Mother;

            if (fatherId && motherId) {
                const coupleKey = `${fatherId}-${motherId}`;

                if (!couples[coupleKey]) {
                    couples[coupleKey] = { children: 0 };
                }
                // Increment children count for this couple
                couples[coupleKey].children += 1;
            }
        });

        return couples;
    }

    getLocationStatistics() {
        return {
            countryCounts: this.locationStats.getCountryCounts(),
            subdivisionCounts: this.locationStats.getSubdivisionCounts(),
            locationCounts: this.locationStats.locationCounts,
        };
    }

    getCategoryCounts() {
        const dataset = this.peopleArray;
        const categoryCounts = {};

        dataset.forEach((person) => {
            if (person.Categories && Array.isArray(person.Categories)) {
                person.Categories.forEach((category) => {
                    if (categoryCounts[category]) {
                        categoryCounts[category]++;
                    } else {
                        categoryCounts[category] = 1;
                    }
                });
            }
        });

        return categoryCounts;
    }

    getMostCommonNames() {
        const nameStatistics = this.getNameStatistics();
        return {
            Male: this.getSortedNames(nameStatistics.Male, 10),
            Female: this.getSortedNames(nameStatistics.Female, 10),
        };
    }

    getMostCommonLocations() {
        // Sort locationCounts entries by count in descending order and slice the top 5
        const sortedLocations = Object.entries(this.locationStats.locationCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([name, data]) => ({ name, count: data.count }));
        return sortedLocations;
    }

    // Helper method to sort names and slice the top N
    getSortedNames(nameObject, topN) {
        return Object.entries(nameObject)
            .sort((a, b) => b[1] - a[1])
            .slice(0, topN)
            .map(([name, count]) => ({ name, count }));
    }

    // Helper method to get most common names for a period
    getMostCommonNamesForPeriod(namesObject) {
        return {
            Male: this.getSortedNames(namesObject.Male, 10),
            Female: this.getSortedNames(namesObject.Female, 10),
        };
    }

    // Helper method to get most common locations for a period
    getMostCommonLocationsForPeriod(locationCounts) {
        const sortedLocations = Object.entries(locationCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10)
            .map(([name, data]) => ({ name, count: data.count }));

        return sortedLocations;
    }

    flattenLocations(locationData, prefix = "") {
        let flatList = [];

        for (const [location, data] of Object.entries(locationData)) {
            const fullName = prefix ? `${prefix}, ${location}` : location;
            flatList.push({ name: fullName, count: data.count });

            // If there are nested locations, recurse
            const subLocations = { ...data };
            delete subLocations.count; // Remove the count property to avoid duplication in recursion
            flatList = flatList.concat(this.flattenLocations(subLocations, fullName));
        }

        return flatList;
    }

    getTopNLocations(subdivisionCounts, topN = 5) {
        const flattenedLocations = this.flattenLocations(subdivisionCounts);
        const sortedLocations = flattenedLocations.sort((a, b) => b.count - a.count).slice(0, topN);
        return sortedLocations;
    }
}
