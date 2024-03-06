import { LocationStatistics } from "./locationstatistics.js";

export class FamilyTreeStatistics {
    constructor(combinedResults) {
        this.combinedResults = combinedResults;
        this.peopleArray = Object.values(combinedResults);
        this.locationStats = new LocationStatistics(this.peopleArray);
        this.locationStats.processLocations();
        this.updatePeopleWithChildCounts();
        this.periodData = this.getStatsBy50YearPeriods();
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

    getStatsBy50YearPeriods() {
        const statsByPeriod = {};
        const childCounts = this.getChildCounts();
        const couples = {};

        this.peopleArray.forEach((person) => {
            const birthYear = this.getYear(person.BirthDate);
            if (birthYear) {
                const period = this.getPeriod(birthYear, 50);

                if (!statsByPeriod[period]) {
                    statsByPeriod[period] = {
                        peopleCount: 0,
                        totalChildren: 0,
                        totalAgeAtDeath: 0,
                        deathsCount: 0,
                        malesOver16Count: 0,
                        names: { Male: {}, Female: {}, Unknown: {} },
                        locationStatistics: new LocationStatistics([]), // Initialize LocationStatistics for the period
                    };
                }

                if (person.Gender === "Male") {
                    const ageAtDeath = this.calculateAgeAtDeath(person.BirthDate, person.DeathDate);
                    const isOver16 =
                        ageAtDeath >= 16 || (ageAtDeath === null && this.isAdultBasedOnYear(person.BirthDate));

                    //    console.log(`Person ID: ${person.Id}, Age: ${ageAtDeath}, Is Over 16: ${isOver16}, Period: ${period}`);

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
                periodData.names[gender] = Object.entries(names)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10);
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

        return statsByPeriod;
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
            // console.log(`Invalid or missing date: BirthDate = ${birthDate}, DeathDate = ${deathDate}`);
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
}
