import {
    EnglandCounties,
    WalesCounties,
    ScotlandCounties,
    IrelandCounties,
    usStates,
    usStatesDetails,
    ukCounties,
    countries,
    englandCountyAbbreviations,
    countriesWithPrecedingPhrases,
    historicalCountries,
} from "./location_data.js";

export class LocationStatistics {
    constructor(peopleArray) {
        this.peopleArray = peopleArray;
        this.countryCounts = {};
        this.subdivisionCounts = {};
        this.correctLocations();
        this.locationCounts = {};
        this.countLocations();
    }

    correctLocations() {
        this.peopleArray.forEach((person) => {
            // Correcting birth location
            const birthLocation = person.BirthLocation;
            const birthDate = person.BirthDate;
            const correctedBirthPlace = this.correctLocation(birthLocation, birthDate);
            person.CorrectedBirthLocation = correctedBirthPlace;

            // Correcting death location
            const deathLocation = person.DeathLocation;
            const deathDate = person.DeathDate;
            const correctedDeathPlace = this.correctLocation(deathLocation, deathDate);
            person.CorrectedDeathLocation = correctedDeathPlace;

            // Logging corrections and checking for specific patterns
            this.logCorrectionsAndCheckPatterns(
                person,
                birthLocation,
                correctedBirthPlace,
                deathLocation,
                correctedDeathPlace
            );
        });
    }

    logCorrectionsAndCheckPatterns(
        person,
        originalBirthLocation,
        correctedBirthPlace,
        originalDeathLocation,
        correctedDeathPlace
    ) {
        if (correctedBirthPlace !== originalBirthLocation || correctedDeathPlace !== originalDeathLocation) {
        } else {
            const regex = /USA|U.S.A.|U.S.|US|United States of America|U.K.|UK/g;
            const regex2 =
                /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/g;
            const regex3 =
                /\b(Beds|Berks|Bucks|Cambs|Ches|Derbys|Gloucs|Hants|Heref|Herts|Lancs|Leics|Lincs|Middx|Northants|Northumb|Notts|Oxon|Salop|Shrops|Som|Staffs|Warks|Wilts|Worcs|Yorks)\b/g;

            if (
                correctedBirthPlace.match(regex) ||
                correctedBirthPlace.match(regex2) ||
                correctedBirthPlace.match(regex3)
            ) {
            }
            if (
                correctedDeathPlace.match(regex) ||
                correctedDeathPlace.match(regex2) ||
                correctedDeathPlace.match(regex3)
            ) {
            }
        }
    }

    correctLocation(location, date) {
        if (!location) {
            return "";
        }

        // Replace "United States of America" with "United States" at the start
        let normalizedLocation = location.replace("United States of America", "United States");

        let correctedLocation = this.normalizeLocationString(normalizedLocation);
        let parts = correctedLocation.split(",").map((part) => {
            part = part.trim(); // Trim whitespace
            if (part.indexOf(" ") === -1) {
                // Check if the part is a single word
                if (!["US", "USA", "U.S.A.", "U.K.", "UK"].includes(part)) {
                    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(); // Capitalize the first letter
                } else return part; // Return the part unchanged if it's a known abbreviation
            }
            return part; // Return the part unchanged if it's not a single word
        });

        // Expand abbreviations in each part
        parts = parts.map((part) => this.expandAbbreviations(part, correctedLocation));

        // Separate processing for the last part
        let lastPart = parts.pop();
        lastPart = this.needsCountryAtEnd(lastPart, location, date);
        let processedLastPart = this.processLastPart(lastPart, date, parts);

        // Reassemble the location string
        let finalLocationParts = parts.length > 0 ? [...parts, processedLastPart] : [processedLastPart];
        correctedLocation = finalLocationParts.join(", ");

        return correctedLocation.replace(/,\s?,/g, ",");
    }

    needsCountryAtEnd(lastPart, birthLocation, birthDate) {
        // Check each part for UK and US historical context
        // Check for UK context
        if (
            ["England", "Scotland", "Wales", "Ireland"].includes(lastPart) &&
            !birthLocation.includes("United Kingdom") &&
            new Date(birthDate) >= new Date("1801-01-01")
        ) {
            lastPart += ", United Kingdom";
        }
        // Check for US context
        const usAliasRegex = /\b(USA|U.S.A.|U.S.|US|United States of America)\b/gi;
        if (
            this.isUSState(lastPart) &&
            this.isStatePartOfUSAtBirth(lastPart, birthDate) &&
            !birthLocation.includes("United States") &&
            !birthLocation.match(usAliasRegex)
        ) {
            lastPart += ", United States";
        }
        return lastPart;
    }

    processLastPart(lastPart, birthDate, precedingParts) {
        let lastParts = lastPart.split(/\s+/).reverse(); // Reverse the array to start from the end
        let longestKnownPlace = "";
        let indexForLongestKnownPlace = -1;

        if (this.isUSAlias(lastParts[0])) {
            lastParts[0] = "United States";
        } else if (this.isUSAlias(lastPart)) {
            lastPart = "United States";
        }

        // Iterate through combinations to find the longest known place, starting from the end
        for (let i = 0; i < lastParts.length; i++) {
            let combinedPart = lastParts
                .slice(0, i + 1)
                .reverse()
                .join(" "); // Reverse again to get the correct order

            if (this.isKnownPlace(combinedPart) && combinedPart.length > longestKnownPlace.length) {
                longestKnownPlace = combinedPart;
                indexForLongestKnownPlace = i;
            }
        }

        // Reconstruct the location with the correct comma placement
        if (indexForLongestKnownPlace >= 0) {
            let partsBeforeKnownPlace = lastParts
                .slice(indexForLongestKnownPlace + 1)
                .reverse()
                .join(" ");
            let reconstructedLocation = partsBeforeKnownPlace
                ? partsBeforeKnownPlace + ", " + longestKnownPlace
                : longestKnownPlace;

            return this.normalizeLocationString(reconstructedLocation);
        }

        // If no known place is found, join parts as originally
        return lastParts.reverse().join(" ");
    }

    normalizeLocationString(location) {
        return location
            .replace(/\s*,\s*/g, ",")
            .replace(/,+/g, ",")
            .replace(/^,|,$/g, "")
            .replace(/\.\s*$/, "")
            .replace(/,/g, ", ");
    }

    needsCommaBeforeLastPart(lastPart, precedingParts) {
        // Check if the last part is a country/state/county name
        return this.isCountryName(lastPart) || this.isUSState(lastPart) || this.isUKCounty(lastPart);
    }

    extractLocationDetails(location, birthDate) {
        let parts = location.split(",").map((part) => part.trim());
        let country, subdivisions;

        if (parts.length === 1) {
            country = this.normalizeCountryName(parts[0]);
            subdivisions = [];
        } else {
            country = this.normalizeCountryName(parts.pop()); // Pop the last element as the country
            subdivisions = parts.map((part) => this.normalizeSubdivisionName(part));
        }

        return [country, ...subdivisions];
    }

    determineCountryAndSubdivision(subdivision, country, birthDate) {
        if (this.isUSState(subdivision) || this.isUKCounty(subdivision)) {
            let adjustedCountry = this.adjustCountryBasedOnSubdivision(subdivision, country, birthDate);
            if (adjustedCountry) {
                return [adjustedCountry, subdivision];
            }
        }
        return [country, subdivision];
    }

    processLocations() {
        this.peopleArray.forEach((person) => {
            let location = person.CorrectedBirthLocation || "";
            let birthDate = person.BirthDate;
            let locationDetails = this.extractLocationDetails(location, birthDate);

            this.updateLocationCounts(locationDetails[0], locationDetails.slice(1));
        });
    }

    updateLocationCounts(country, locationParts) {
        this.countryCounts[country] = (this.countryCounts[country] || 0) + 1;

        if (locationParts.length > 0) {
            this.subdivisionCounts[country] = this.subdivisionCounts[country] || {};
            this.updateNestedCounts(this.subdivisionCounts[country], [...locationParts]); // Ensure it's an array
        }
    }

    updateNestedCounts(currentLevel, remainingParts) {
        if (remainingParts.length === 0) return;

        const part = remainingParts.pop(); // Process from the end

        // Ensure current level has a count property
        currentLevel.count = (currentLevel.count || 0) + 1;

        if (remainingParts.length === 0) {
            // If there are no more parts, increment the count for this part
            if (!currentLevel[part]) {
                currentLevel[part] = { count: 0 };
            }
            currentLevel[part].count += 1;
        } else {
            // Otherwise, create or update the nested structure
            if (!currentLevel[part]) {
                currentLevel[part] = {};
            }
            this.updateNestedCounts(currentLevel[part], [...remainingParts]); // Use a copy of the remaining parts
        }
    }

    shouldInsertComma(subPart, index, lastParts, fullLocation, birthDate) {
        // Ensure all necessary arguments are defined and valid
        if (
            typeof subPart !== "string" ||
            typeof index !== "number" ||
            !Array.isArray(lastParts) ||
            typeof fullLocation !== "string"
        ) {
            console.warn("Invalid arguments passed to shouldInsertComma");
            return false;
        }

        // No comma needed at the end of the list
        if (index === lastParts.length - 1) return false;

        // Check if the current part is a standalone name
        if (this.isStandaloneLocationName(subPart)) return true;

        // Check if the current part is part of a larger name
        if (this.isPartOfLargerName(subPart, fullLocation)) return false;

        return false; // Default to no comma
    }

    normalizeCountryName(country) {
        const countryAliases = {
            "United States of America": "United States",
            "USA": "United States",
            "United States": "United States",
            "U.S.A.": "United States",
            "U.S.": "United States",
            "US": "United States",
            "UK": "United Kingdom",
            "U.K.": "United Kingdom",
        };
        return countryAliases[country] || country;
    }

    // Helper function to check if a combined part is a known place
    isKnownPlace(combinedPart) {
        let isKnown =
            this.isCountryName(combinedPart) ||
            this.isUSState(combinedPart) ||
            this.isUKCounty(combinedPart) ||
            this.expandUSStateAbbreviation(combinedPart) !== combinedPart ||
            this.expandEnglandCounty(combinedPart) !== combinedPart ||
            historicalCountries.includes(combinedPart); // Added to check historical countries

        return isKnown;
    }

    processSubPart(subPart, index, lastParts, fullLocation, birthDate) {
        // Check if a comma should be inserted before this subpart
        if (this.shouldInsertComma(subPart, index, lastParts, fullLocation, birthDate)) {
            return ", " + subPart;
        }

        return subPart;
    }

    // Method to check if a part is part of a larger historical or geographical name
    isPartOfLargerName(part, fullLocation) {
        if (!fullLocation || !part) {
            console.warn("Invalid parameters passed to isPartOfLargerName");
            return false;
        }

        const fullLocationParts = fullLocation.split(" ");
        const partIndex = fullLocationParts.indexOf(part);

        // Iterate over the historical phrases to see if 'part' is a substring of a larger name
        for (let country in countriesWithPrecedingPhrases) {
            for (let phrase of countriesWithPrecedingPhrases[country]) {
                const phraseParts = (phrase + " " + country).split(" ");
                const phraseLength = phraseParts.length;

                // Check if the part and its subsequent elements match a historical phrase
                if (fullLocationParts.slice(partIndex, partIndex + phraseLength).join(" ") === phraseParts.join(" ")) {
                    return true;
                }
            }
        }

        // Check if the part is part of a historicalCountries name
        for (let historicalCountry of historicalCountries) {
            if (fullLocationParts.slice(partIndex, partIndex + 2).join(" ") === historicalCountry) {
                return true;
            }
        }

        return false;
    }

    isStatePartOfUSAtBirth(state, birthDate) {
        const stateDetail = usStatesDetails.find((detail) => detail.name === state);
        return stateDetail && new Date(birthDate) >= new Date(stateDetail.admissionDate);
    }

    // Helper function to check if a part is a standalone location name (e.g., state, country)
    isStandaloneLocationName(part) {
        return (
            this.isCountryName(part) || this.isUSState(part) || this.isUKCounty(part) || this.isHistoricalCountry(part)
        );
    }

    isHistoricalLocation(locationPart) {
        // Check if the location part matches any historical location
        return historicalCountries.includes(locationPart);
    }

    expandAbbreviations(part, fullLocation) {
        const targetWord = "Staffs";
        const isTarget = fullLocation.includes(targetWord);

        // Split the part into sub-elements
        let elements = part.split(" ");
        let lastIndex = elements.length - 1;

        const locationParts = fullLocation ? fullLocation.split(",").map((p) => p.trim()) : [];
        const isLastPart = locationParts.indexOf(part) === locationParts.length - 1;

        // Process each element in the part
        for (let i = 0; i < elements.length; i++) {
            if (this.isUSAlias(elements[i])) {
                // Expand any US alias to "United States"
                elements[i] = "United States";
            } else if (i === lastIndex) {
                // Expand the last element if it's an abbreviation
                elements[i] = this.expandElement(elements[i]);
            } else if (elements[i].toLowerCase() === "co") {
                // Special handling for "Co" to avoid incorrect expansion to "Colorado"
                const nextPart = locationParts[locationParts.indexOf(part) + 1];
                if (!nextPart || (!this.isUSState(nextPart) && !this.isUSAlias(nextPart))) {
                    elements[i] = "County";
                }
            } else if (["de", "De", "In", "in", "La", "la"].includes(elements[i])) {
                // Expand "de", "in", "la" to lowercase
            } else {
                // Expand other abbreviations
                elements[i] = this.expandElement(elements[i]);
            }
        }

        return elements.join(" ");
    }

    expandElement(element) {
        // Check if the element matches a known UK county abbreviation
        if (englandCountyAbbreviations[element]) {
            return ", " + this.expandEnglandCounty(element);
        }

        // Check if the element matches a known US state abbreviation
        const uppercaseElement = element.toUpperCase();
        if (usStatesDetails.some((state) => state.abbreviation === uppercaseElement)) {
            return this.expandUSStateAbbreviation(element);
        }

        // Return the original element if no match is found
        return element;
    }

    // Existing isUSAlias, isUSStateAbbreviation, isUSState, etc., methods remain unchanged

    isUSAlias(name) {
        const aliases = ["USA", "U.S.A.", "U.S.", "US", "United States of America"];
        return aliases.includes(name);
    }

    isUSState(name) {
        // Add logic here to determine if 'name' is a US state name or abbreviation
        // You can use your existing usStates or usStatesDetails array for this
        // For example:
        return usStates.includes(name) || usStatesDetails.some((state) => state.abbreviation === name.toUpperCase());
    }

    isUSStateAbbreviation(subdivision) {
        // Check if subdivision is a string
        if (typeof subdivision !== "string") {
            console.warn("Expected string for subdivision, received:", subdivision);
            return false; // or handle this scenario appropriately
        }

        const subdivisionUpper = subdivision.toUpperCase();
        return usStatesDetails.some((stateDetail) => stateDetail.abbreviation.toUpperCase() === subdivisionUpper);
    }

    isUKCounty(subdivision) {
        return ukCounties.includes(subdivision);
    }

    getCountryCounts() {
        return this.countryCounts;
    }

    getSubdivisionCounts() {
        return this.subdivisionCounts;
    }

    expandUSStateAbbreviation(abbreviation) {
        const abbreviationUpper = abbreviation.toUpperCase();
        const stateDetail = usStatesDetails.find((state) => state.abbreviation.toUpperCase() === abbreviationUpper);
        return stateDetail ? stateDetail.name : abbreviation;
    }

    expandEnglandCounty(county) {
        return englandCountyAbbreviations[county] || county;
    }

    isCountryName(name) {
        return countries.some((country) => country.name === name);
    }

    isUSState(subdivision) {
        return usStates.includes(subdivision);
    }

    normalizeSubdivisionName(subdivision) {
        // Check if the subdivision is a US state abbreviation and return the full name
        for (let stateDetail of usStatesDetails) {
            if (stateDetail.abbreviation === subdivision) {
                return stateDetail.name;
            }
        }

        // Check if the subdivision is an English county abbreviation and return the full name
        if (englandCountyAbbreviations[subdivision]) {
            return englandCountyAbbreviations[subdivision];
        }

        // If no match is found, return the original subdivision
        return subdivision;
    }

    isSubdivisionPartOfCountryAtDate(subdivision, country, birthDate) {
        // Example: U.S. state check
        if (country === "United States") {
            for (let stateDetail of usStatesDetails) {
                if (stateDetail.name === subdivision) {
                    const admissionDate = new Date(stateDetail.admissionDate);
                    const birth = new Date(birthDate);
                    if (birth >= admissionDate) {
                        return true;
                    } else {
                        return false;
                    }
                }
            }
        }

        // UK check
        if (country === "United Kingdom") {
            const birth = new Date(birthDate);
            if (birth >= new Date("1801-01-01")) {
                if (
                    EnglandCounties.includes(subdivision) ||
                    ScotlandCounties.includes(subdivision) ||
                    WalesCounties.includes(subdivision)
                ) {
                    return true;
                }
            }
        }

        // You can add similar checks for other countries or specific historical conditions
        return true; // Default to true if specific checks are not required
    }

    getUKCountryForCounty(county) {
        if (EnglandCounties.includes(county)) {
            return "England";
        } else if (ScotlandCounties.includes(county)) {
            return "Scotland";
        } else if (WalesCounties.includes(county)) {
            return "Wales";
        }
        return ""; // Return an empty string if no match is found
    }

    isUKCounty(subdivision) {
        return (
            EnglandCounties.includes(subdivision) ||
            ScotlandCounties.includes(subdivision) ||
            WalesCounties.includes(subdivision)
        );
    }

    adjustCountryBasedOnSubdivision(subdivision, country, birthDate) {
        if (this.isSubdivisionPartOfCountryAtDate(subdivision, country, birthDate)) {
            return this.isUKCounty(subdivision) && new Date(birthDate) >= new Date("1801-01-01")
                ? "United Kingdom"
                : "United States";
        }
        return null;
    }

    countLocations() {
        this.peopleArray.forEach((person, index) => {
            const location = person.CorrectedBirthLocation;
            if (location) {
                const locationParts = location.split(",").map((part) => part.trim());
                locationParts.forEach((part, partIndex) => {
                    if (!this.locationCounts[part]) {
                        this.locationCounts[part] = { count: 0, Ids: [] };
                    }
                    this.locationCounts[part].count += 1;
                    this.locationCounts[part].Ids.push(person.Id);
                });
            } else {
            }
        });
    }
}
