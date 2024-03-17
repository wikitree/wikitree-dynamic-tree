function parseCenturies(input) {
    let centuries = [];

    if (!input) return centuries;

    input = input.toLowerCase().trim();
    input = input.replace(/\s+to\s+|[\u2013\u2014-]/g, "-"); // Handle "to" and different dash types
    input = input.replace(/\s*,\s*/g, ","); // Normalize comma spacing
    input = input.replace(/\s+/g, " "); // Normalize spaces

    // Helper function to convert year or century to the correct century number
    const yearOrCenturyToCentury = (value) => {
        // Handle ordinal indicators by removing them
        value = value.replace(/(st|nd|rd|th)/g, "");
        if (value.endsWith("s")) value = value.slice(0, -1); // Handle decades (1500s)
        let year = parseInt(value, 10);
        // Convert year to century if necessary
        if (year < 100) return year; // Assume values < 100 are already centuries
        return Math.ceil(year / 100);
    };

    // Split input by comma or space to handle lists and ranges separately
    input.split(/[\s,]+/).forEach((part) => {
        if (part.includes("-")) {
            // Handle ranges
            let [start, end] = part.split("-").map((part) => yearOrCenturyToCentury(part.trim()));
            centuries.push(...Array.from({ length: end - start + 1 }, (_, i) => start + i));
            // Increase each by 1 as 1500 should be the 16th century, not the 15th
            centuries = centuries.map((century) => century + 1);
            if (input.match(/\-\d+00$/)) {
                centuries.pop();
            }
        } else {
            // Handle single values
            centuries.push(yearOrCenturyToCentury((parseInt(part) + 1).toString()));
            //centuries = centuries.map((century) => century + 1);
        }
    });

    // Ensure unique centuries, sorted in ascending order
    centuries = Array.from(new Set(centuries)).sort((a, b) => a - b);

    //console.log("Centuries:", centuries);
    return centuries;
}

// Example usage
console.log("15", parseCenturies("15")); // [15]
console.log("15,16", parseCenturies("15,16")); // [15,16]
console.log("15 16", parseCenturies("15 16")); // [15,16]
console.log("15th, 16th", parseCenturies("15th, 16th")); // [15,16]
console.log("1500", parseCenturies("1500")); // [16]
console.log("1500s, 1600s", parseCenturies("1500s, 1600s")); // [15,16]
console.log("1500-1800", parseCenturies("1500-1800")); // [16,17,18]
console.log("1500s-2000s", parseCenturies("1500s-2000s")); // [16,17,18,19,20,21]
console.log("15th-17th", parseCenturies("15th-17th")); // [15,16,17]
