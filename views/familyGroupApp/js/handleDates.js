export class HandleDates {
    convertDate(dateString, outputFormat, status = "") {
        if (!outputFormat) {
            const settings = FamilyGroupAppView.getSettings();
            outputFormat = settings.dateFormatSelect;
        }
        if (!dateString) {
            return "";
        }
        dateString = dateString.replaceAll(/-00/g, "");
        // Split the input date string into components
        if (!dateString) {
            return "";
        }
        let components = dateString.split(/[\s,-]+/);

        // Determine the format of the input date string
        let inputFormat;
        if (components.length == 1 && /^\d{4}$/.test(components[0])) {
            // Year-only format (e.g. "2023")
            inputFormat = "Y";
        } else if (
            components.length == 2 &&
            /^[A-Za-z]{3}$/.test(components[0]) &&
            !/^[A-Za-z]{4,}$/.test(components[0])
        ) {
            // Short month and year format (e.g. "Jul 2023")
            inputFormat = "MY";
        } else if (components.length == 2 && /^[A-Za-z]+/.test(components[0])) {
            // Long month and year format (e.g. "July 2023")
            inputFormat = "MDY";
        } else if (components.length == 3 && /^[A-Za-z]+/.test(components[0])) {
            // Long month, day, and year format (e.g. "July 23, 2023")
            inputFormat = "MDY";
        } else if (
            components.length == 3 &&
            /^[A-Za-z]{3}$/.test(components[1]) &&
            !/^[A-Za-z]{4,}$/.test(components[1])
        ) {
            // Short month, day, and year format (e.g. "23 Jul 2023")
            inputFormat = "DMY";
        } else if (components.length == 3 && /^[A-Za-z]+/.test(components[1])) {
            // Day, long month, and year format (e.g. "10 July 1936")
            inputFormat = "DMY";
        } else if (components.length == 3 && /^\d{2}$/.test(components[1]) && /^\d{2}$/.test(components[2])) {
            // ISO format with no day (e.g. "2023-07-23")
            inputFormat = "ISO";
        } else if (components.length == 2 && /^\d{4}$/.test(components[0]) && /^\d{2}$/.test(components[1])) {
            // NEW: Year and month format with no day (e.g. "1910-10")
            inputFormat = "ISO";
            components.push("00");
        } else {
            // Invalid input format
            return null;
        }

        // Convert the input date components to a standard format (YYYY-MM-DD)
        let year,
            month = 0,
            day = 0;
        try {
            if (inputFormat == "Y") {
                year = parseInt(components[0]);
                outputFormat = "Y";
            } else if (inputFormat == "MY") {
                year = parseInt(components[1]);
                month = this.convertMonth(components[0]);
                if (!outputFormat) {
                    outputFormat = "MY";
                }
            } else if (inputFormat == "MDY") {
                year = parseInt(components[components.length - 1]);
                month = this.convertMonth(components[0]);
                day = parseInt(components[1]);
            } else if (inputFormat == "DMY") {
                year = parseInt(components[2]);
                month = this.convertMonth(components[1]);
                day = parseInt(components[0]);
            } else if (inputFormat == "ISO") {
                year = parseInt(components[0]);
                month = parseInt(components[1]);
                day = parseInt(components[2]);
            }
        } catch (err) {
            console.error("Error during conversion:", err);
            return null;
        }

        // Convert the date components to the output format
        let outputDate;

        const ISOdate = year.toString() + "-" + this.padNumberStart(month || 0) + "-" + this.padNumberStart(day || 0);

        if (outputFormat == "Y") {
            outputDate = year.toString();
        } else if (outputFormat == "MY") {
            outputDate = this.convertMonth(month) + " " + year.toString();
        } else if (outputFormat == "MDY") {
            if (day === 0) {
                // If day is 0, exclude the day and the comma from the output
                outputDate = this.convertMonth(month, "long") + " " + year.toString();
            } else {
                outputDate = this.convertMonth(month, "long") + " " + day + ", " + year.toString();
            }
        } else if (outputFormat == "DMY") {
            if (day === 0) {
                // If day is 0, exclude the day from the output
                outputDate = this.convertMonth(month, "long") + " " + year.toString();
            } else {
                outputDate = day + " " + this.convertMonth(month, "long") + " " + year.toString();
            }
        } else if (outputFormat == "sMDY") {
            outputDate = this.convertMonth(month, "short");
            if (day !== 0) {
                outputDate += " " + day + ",";
            }
            outputDate += " " + year.toString();
        } else if (outputFormat == "DsMY") {
            outputDate = "";
            if (day !== 0) {
                outputDate += day + " ";
            }
            outputDate += this.convertMonth(month).slice(0, 3) + " " + year.toString();
        } else if (outputFormat == "YMD" || outputFormat == "ISO") {
            if (day === 0) {
                // If day is 0, exclude the day and trailing hyphen from the output
                outputDate = year.toString() + "-" + this.padNumberStart(month || 0);
            } else {
                outputDate = ISOdate;
            }
        } else {
            // Invalid output format
            return null;
        }

        if (status) {
            let onlyYears = false;
            if (outputFormat == "Y") {
                onlyYears = true;
            }
            let statusOut = "";
            try {
                statusOut = FamilyGroupAppView.dataStatusWord(status, ISOdate, {
                    needOnIn: false,
                    onlyYears: onlyYears,
                });
            } catch (error) {
                console.log("dataStatusWord error:", error);
            }
            if (["<", ">", "~"].includes(statusOut.trim())) {
                outputDate = statusOut + outputDate.trim();
            } else {
                outputDate = statusOut + " " + outputDate;
            }
        }

        outputDate = outputDate.replace(/\s?\b00/, ""); // Remove 00 as a day or month
        outputDate = outputDate.replace(/([A-Za-z]+) (\d{4})/, "$1 $2"); // Remove comma if there's a month followed directly by a year

        return outputDate;
    }

    padNumberStart(number) {
        // Add leading zeros to a single-digit number
        return (number < 10 ? "0" : "") + number.toString();
    }

    capitalizeFirstLetter(string) {
        return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
    }

    dataStatusWord(status, ISOdate, options = { needOnIn: false, onlyYears: false }) {
        const needOnIn = options.needOnIn;
        const onlyYears = options.onlyYears;
        let day = ISOdate.slice(8, 10);
        if (day == "00") {
            day = "";
        }
        let statusOut =
            status == "before"
                ? "before"
                : status == "after"
                ? "after"
                : status == "guess"
                ? "about"
                : status == "certain" || status == "on" || status == undefined || status == ""
                ? day
                    ? "on"
                    : "in"
                : "";

        const settings = FamilyGroupAppView.getSettings();
        const thisStatusFormat = settings.dateStatusFormat || "symbols";

        if (thisStatusFormat == "abbreviations") {
            statusOut = statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.");
        } else if (thisStatusFormat == "symbols") {
            statusOut = statusOut.replace("before", "<").replace("after", ">").replace("about", "~");
        }
        if (needOnIn == false && ["on", "in"].includes(statusOut)) {
            return "";
        } else {
            return statusOut;
        }
    }

    convertMonth(monthString, outputFormat = "short") {
        // Convert a month string to a numeric month value
        var shortNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        var longNames = [
            "january",
            "february",
            "march",
            "april",
            "may",
            "june",
            "july",
            "august",
            "september",
            "october",
            "november",
            "december",
        ];
        let index;
        if (!isNaN(monthString)) {
            index = monthString - 1;
            let month = shortNames[index];
            if (outputFormat == "long") {
                month = longNames[index];
            }
            return this.capitalizeFirstLetter(month);
        } else {
            index = shortNames.indexOf(monthString?.toLowerCase());
            if (index == -1) {
                index = longNames.indexOf(monthString?.toLowerCase());
            }
            return index + 1;
        }
    }
}
