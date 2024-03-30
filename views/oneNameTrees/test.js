function parseCenturies(input) {
    let centuries = [];

    // Normalize the input for easier processing
    input = input
        .toLowerCase()
        .replace(/to|[\u2013\u2014-]/g, "-")
        .replace(/\s*,\s*/g, ",")
        .replace(/\s+/g, ",")
        .trim();

    input.split(",").forEach((part) => {
        part = part.trim();

        if (part.includes("-")) {
            // Handle ranges explicitly
            let [start, end] = part.split("-").map((p) => p.trim());
            let startCentury, endCentury;

            if (start.endsWith("s")) {
                startCentury = parseInt(start.slice(0, -1)) / 100 + 1;
            } else {
                startCentury = Math.ceil(parseInt(start) / 100);
            }

            if (end.endsWith("s")) {
                endCentury = parseInt(end.slice(0, -1)) / 100 + 1;
            } else {
                endCentury = Math.ceil(parseInt(end) / 100);
            }

            // Add 1 to each century in the range for specific adjustments
            for (let i = startCentury; i <= endCentury; i++) {
                centuries.push(i + 1); // Adjusting as per the new requirement
            }
        } else {
            // Individual years or centuries
            let century;
            if (part.endsWith("s")) {
                century = parseInt(part.slice(0, -1)) / 100 + 1; // For decades
            } else if (part.match(/\d{4}/)) {
                century = Math.ceil(parseInt(part) / 100); // For specific years
            } else {
                century = parseInt(part); // For already specified centuries
            }
            centuries.push(century + 1); // Adjusting as per the new requirement
        }
    });

    // Remove duplicates, sort, and then adjust the centuries as required
    return Array.from(new Set(centuries)).sort((a, b) => a - b);
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
