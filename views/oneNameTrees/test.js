function parseCenturies(input) {
    let centuries = [];

    // Splitting the input on commas and spaces for processing
    input = input
        .toLowerCase()
        .replace(/ to /g, "-")
        .replace(/[\u2013\u2014]/g, "-")
        .trim();
    let parts = input.split(/[\s,]+/);

    parts.forEach((part) => {
        if (part.includes("-")) {
            // Handling ranges
            let [start, end] = part.split("-").map((p) => p.trim());
            let startCentury, endCentury;

            // Adjust for start of range
            startCentury = start.match(/\d{4}s?$/) ? Math.ceil(parseInt(start) / 100) : parseInt(start);
            if (start.match(/\d{4}s$/)) startCentury++; // Increment for decades '1500s'

            // Adjust for end of range
            endCentury = end.match(/\d{4}s?$/) ? Math.ceil(parseInt(end) / 100) : parseInt(end);
            if (end.match(/\d{4}s$/)) endCentury++; // Increment for decades '2000s'

            // For cases like '1500-1800' where start is a year without 's'
            if (start.match(/\d{4}$/) && !start.endsWith("s")) startCentury++;

            // Populate range
            for (let i = startCentury; i <= endCentury; i++) {
                centuries.push(i);
            }
        } else {
            // Handling individual years, centuries, and decades
            let century = part.match(/\d{4}s?$/) ? Math.ceil(parseInt(part) / 100) : parseInt(part);
            if (part.match(/\d{4}s$/)) century++; // Increment for decades '1500s'
            centuries.push(century);
        }
    });

    // Adjust for specific years like '1500' directly
    centuries = centuries.map((c) => {
        if (input.match(/\d{4}(?!s)/) && !input.includes("-")) {
            return c + 1;
        }
        return c;
    });

    // Deduplicate and sort
    centuries = Array.from(new Set(centuries)).sort((a, b) => a - b);

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
console.log("15th to 18th", parseCenturies("15th to 18th")); // [15,16,17,18]
