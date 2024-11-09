export class Utils {
    /**
     * @returns The WikiTree ID of the profile entered in the field next to the Tree APP id.
     *          Leading and trailing spaces are removed all remaining spaces are replaced
     *          with underscores and the first letter capitalised to ensure that the result
     *          will match the profile.Name field returned for that id by the APIs.
     */
    static getTreeAppWtId() {
        const id = $(wtViewRegistry.WT_ID_TEXT).val().trim().replaceAll(" ", "_");
        return id ? id.charAt(0).toUpperCase() + id.slice(1) : id;
    }

    static getCookie(name) {
        return WikiTreeAPI.cookie(name) || null;
    }

    static setCookie(name, value, options) {
        return WikiTreeAPI.cookie(name, value, options);
    }

    static hideShakingTree() {
        $("#tree").slideUp("fast");
    }

    /**
     * Append a gif of a shaking tree as an image with id 'tree' to the HTML element with the id given in containerId
     * if 'tree' element does not exist. Otherwise, show the image using the jQuery slieDown() method.
     * @param {*} containerId (Optional, default="view-container") The element to which the image should
     *            be appended if it does not already exist.
     *            time this method is called
     * @param {*} callback optional: the method to call once the slideDown is complete.
     *            This is useful if the action to be performed while showing the tree,
     *            can sometimes be very short and mey complete before the slideDown completes.
     */
    static showShakingTree(containerId, callback) {
        if ($("#tree").length) {
            $("#tree").slideDown("fast", "swing", callback);
        } else {
            const treeGIF = $("<img id='tree' src='./views/cc7/images/tree.gif'>");
            if (typeof containerId == "undefined") containerId = "view-container";
            treeGIF.appendTo(`#${containerId}`);
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "50px",
                "width": "50px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
            $("#tree").slideDown("fast", "swing", callback);
        }
    }

    /**
     * Do the best effort possible to obtain the requested date of a profile, even if it is approximate and
     * returns {date:, annotation:, display:}.
     * It is assumed the date fields of the person profile are in the standard form returned by the WT API,
     * namely 'YYYY-MMM-DD' or YYY0s if a decade field is used.
     * A YYYY-MMM-00 date is adjusted to YYYY-MM-15, a YYYY-00-00 date to YYYY-07-02 and YYY0s to YYY5-01-01,
     * i.e. more or less to the middle of each period.
     * @param {*} person a person record retrieved from the API
     * @param {*} whichDate One of "Birth", "Death", or "Marriage". Any other value will return a date of 0000-00-00.
     *                      "Marriage" will return the oldest valid marriage date (if any).
     * @returns an object {date: , annotation: , display: } where:
     *          date - The requested date or '0000-00-00' if no date could be determined.
     *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the date is uncertain (~),
     *                or is at most the given date (<), or at least the given date (>) or is accurate (empty string).
     *          display - a string to display, excuding the annotation and excluding any adjustments that were made.
     *
     *          For birth and death dates, if they are not available, but ...DateDecade is, the latter will be taken and
     *          converted to the middle of the decade. e.g. 1960s will be converted to 1965-01-01, but display will be 1960s.
     *
     *          Similarly any partial date like 1961-00-00 or 1962-02-00 will be converted to 1961-07-02 and 1962-02-15
     *          respectively, with displays 1961 and 1962-02.
     */
    static getTheDate(person, whichDate) {
        if (!["Birth", "Death", "Marriage"].includes(whichDate))
            return { date: "0000-00-00", annotation: "", display: "" };
        const dateName = whichDate + "Date";
        let theDate = "0000-00-00";
        let decade = "";
        let dataStatus = "";

        if (whichDate == "Marriage") {
            if (person.hasOwnProperty("Spouses")) {
                // find the oldest non-zero marriage date
                let firstSpouseIdx = -1;
                let firstMDateObj = Utils.dateObject(); // 9999-12-31
                for (const [spouseId, spouseData] of Object.entries(person.Spouses)) {
                    const mDate = spouseData.MarriageDate || "0000-00-00";
                    const mDateObj = Utils.dateObject(mDate);
                    if (mDateObj - firstMDateObj < 0) {
                        firstMDateObj = mDateObj;
                        firstSpouseIdx = spouseId;
                    }
                }
                if (firstSpouseIdx >= 0) {
                    const mData = person.Spouses.at(firstSpouseIdx);
                    theDate = mData.MarriageDate || "0000-00-00";
                    dataStatus = mData.DataStatus;
                }
            }
        } else {
            theDate = person[dateName] || "0000-00-00";
            if (theDate == "0000-00-00" || theDate.length != 10) {
                theDate = "0000-00-00";
                decade = person[`${dateName}Decade`];
            }
            dataStatus = person.DataStatus;
        }

        return Utils.formAdjustedDate(theDate, decade, dataStatus ? dataStatus[dateName] : "");
    }

    /**
     *
     * @param {*} date A date string in the form YYYY-MM-DD where any of the parts might be 0
     *            (as might be returned from the API)
     * @param {*} decade a decade field returnrd by the API in the form YYY0s, or the empty string
     * @param {*} status an associated DataStatus field for the date as returned by the API
     * @returns an object {date: , annotation: , display: } where:
     *          date - The input date date or '0000-00-00' if empty or invalid
     *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the date is uncertain (~),
     *                or is at most the given date (<), or at least the given date (>) or is accurate (empty string).
     *          display - a string to display, excuding the annotation and excluding any adjustments that were made.
     *
     *          For birth and death dates, if they are not available, but ...DateDecade is, the latter will be taken and
     *          converted to the middle of the decade. e.g. 1960s will be converted to 1965-01-01, but display will be 1960s.
     *
     *          Similarly any partial date like 1961-00-00 or 1962-02-00 will be converted to 1961-07-02 and 1962-02-15
     *          respectively, with displays 1961 and 1962-02.
     */
    static formAdjustedDate(date, decade = "", status = "") {
        let theDate = date || "0000-00-00";
        let annotation = "";
        let display = theDate;
        if (theDate == "0000-00-00" || theDate.length != 10) {
            if (decade && decade != "unknown") {
                theDate = decade.replace(/0s/, "5-01-01");
                annotation = "~";
                display = decade;
            } else {
                theDate = "0000-00-00";
                display = "";
            }
        }

        if (theDate != "0000-00-00") {
            // Adjust partial dates to the middle of the period they span,
            // force annotation to ~, but keep the partial value for display
            const dateBits = theDate.split("-");
            if (dateBits[1] == "00") {
                theDate = `${dateBits[0]}-07-02`;
                annotation = "~";
                display = dateBits[0];
            } else if (dateBits[2] == "00") {
                theDate = `${dateBits[0]}-${dateBits[1]}-15`;
                annotation = "~";
                display = dateBits[0] + "-" + dateBits[1];
            }

            // Adjust annotation based on the data status
            if (status) {
                if ((status == "certain" || status == "") && annotation != "~") annotation = "";
                else if (status == "guess") annotation = "~";
                else if (status == "before") annotation = `<${annotation}`;
                else if (status == "after") annotation = `>${annotation}`;
                else annotation = "~";
            }
        }
        return { date: theDate, annotation: annotation, display: display };
    }

    /**
     * Returns an "annotated age" with 3 values associated with a person's age at an event, namely
     * {age: , annotation: , annotatedAge: }. The age may be negative.
     * @param {*} birth an annotated birth date as returned by getTheDate(), i.e. {date: , annotation: }
     *            where date is a string in the form YYYY-MM-DD where any of the parts might be 0
     *            (as might be returned from the API) and annotation is one of ("", <, ~, >).
     * @param {*} event An annotated event date object similar to the above.
     * @returns {age: , annotation: , annotatedAge: } where:
     *          age - "" if no age could be determined, otherwise the calculated decimal age at the event.
     *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the age is uncertain (~),
     *                is at most the given number (<), at least the given number (>), or is accurate (empty string).
     *          annotatedAge - the concatenation of annotation and age, but with the fraction truncated.
     */
    static ageAtEvent(birth, event) {
        let about = "";
        let age = "";
        let wholeYearAge = "";

        if (birth.date != "0000-00-00" && event.date != "0000-00-00") {
            age = Utils.calculateDecimalAge(birth.date, event.date);
            if (age < 0) {
                wholeYearAge = -Math.floor(Math.abs(age));
            } else {
                wholeYearAge = Math.floor(age);
            }
        }

        if (age !== "") {
            about = Utils.statusOfDiff(birth.annotation, event.annotation);
        }

        return { age: age, annotation: about, annotatedAge: `${about}${wholeYearAge}` };
    }

    static DIFF_ANNOTATION = [
        // Annotation of
        // start \ end
        //        \  .   <    >    ~    <~    >~
        //         +---+----+----+----+-----+---------
        /*    . */ ["", "<", ">", "~", "<~", ">~"],
        /*    < */ [">", "~", ">", ">~", "~", ">~"],
        /*    > */ ["<", "<", "~", "<~", "<~", "~"],
        /*    ~ */ ["~", "<~", ">~", "~", "<~", ">~"],
        /*   <~ */ [">~", "~", ">~", ">~", "~", ">~"],
        /*   >~ */ ["<~", "<~", "~", "<~", "<~", "~"],
    ];
    static ANNOTATIONS = ["", "<", ">", "~", "<~", ">~"];
    static ANNOTATION_ORDER = ["<~", "<", "", "~", ">", ">~"];
    static SORT_FACTOR = [-0.2, -0.1, 0.0, 0.1, 0.2, 0.3];

    /**
     *
     * @param {*} startAnnotation An annotated associated with an age as returned by (@link Utils.ageAtEvent}
     * @param {*} endAnnotation An annotated associated with an age as returned by (@link Utils.ageAtEvent}
     * @returns The annotation of the difference between the start and end (i.e. end - start).
     */
    static statusOfDiff(startAnnotation, endAnnotation) {
        const sIdx = Utils.ANNOTATIONS.indexOf(startAnnotation);
        const eIdx = Utils.ANNOTATIONS.indexOf(endAnnotation);
        if (sIdx >= 0 && eIdx >= 0) {
            return Utils.DIFF_ANNOTATION.at(sIdx).at(eIdx);
        } else {
            return "?";
        }
    }

    /**
     * Given an annotated age as returned by {@link Utils.getTheAge()}, return a number that can be used
     * to sort annotated ages in a consistent fashion
     * @param {*} annotatedAge
     * @returns
     */
    static ageForSort(annotatedAge) {
        let age = annotatedAge.age;
        if (age === "") {
            age = -9999;
        } else {
            const i = Utils.ANNOTATION_ORDER.indexOf(annotatedAge.annotation);
            if (i >= 0) age += Utils.SORT_FACTOR.at(i);
        }
        return age;
    }

    /**
     * Returns an "annotated age" with 3 values associated with a person's age at death, namely
     * {age: , annotation: , annotatedAge: }. It is similar to calling
     *   {@link Utils.ageAtEvent(Utils.getTheDate(person, "Birth"), Utils.getTheDate(person, "Death"))}
     * except that the returned age will never be negative.
     * @param {*} person a person record retrieved from the API
     * @returns {age: , annotation: , annotatedAge: } where:
     *          age - "" if no age could be determined, otherwise the calculated decimal age at at death.
     *                If the calculated age would be negative due to incomplete or bad dates, e.g. birth = 1871-07-03 and
     *                death = 1971, 0 is returned.
     *          annotation - one of the symbols \~, <, >, or the empty string depending on whether the age is uncertain (~),
     *                is at most the given number (<), at least the given number (>), or is accurate (empty string).
     *          annotatedAge - the concatenation of annotation and age, but with the fraction truncated.
     */
    static ageAtDeath(person) {
        let diedAged = "";
        let about = "";
        let wholeYearAge = "";
        const birth = person.hasOwnProperty("adjustedBirth") ? person.adjustedBirth : Utils.getTheDate(person, "Birth");
        const death = person.hasOwnProperty("adjustedDeath") ? person.adjustedDeath : Utils.getTheDate(person, "Death");

        if (birth.date != "0000-00-00" && death.date != "0000-00-00") {
            diedAged = Utils.calculateDecimalAge(birth.date, death.date);
            if (diedAged < 0) {
                // Make provision for e.g. birth = 1871-07-03 and death = 1971
                // (or just plain bad dates)
                diedAged = 0;
            }
            wholeYearAge = Math.floor(diedAged);
        }

        if (diedAged !== "") {
            about = Utils.statusOfDiff(birth.annotation, death.annotation);
        }

        return { age: diedAged, annotation: about, annotatedAge: `${about}${wholeYearAge}` };
    }

    /**
     * Calculate age given start and end date strings in the form YYYY-MM-DD
     * @param {*} startDateStr e.g. birth date in the form YYYY-MM-DD
     * @param {*} endDateStr  e.g. death date in the form YYYY-MM-DD
     * @returns the age. This may be negative.
     */
    static getAgeInWholeYearsFromStrings(startDateStr, endDateStr) {
        // must be valid date strings in the form YYYY-MM-DD
        if (startDateStr == endDateStr) return 0;

        const startDBits = startDateStr.split("-");
        const endDBits = endDateStr.split("-");
        let age = endDBits[0] - startDBits[0];
        let monthDiff = endDBits[1] - startDBits[1];
        if (monthDiff < 0 || (monthDiff === 0 && endDBits[2] < startDBits[2])) {
            --age;
        }
        return age;
    }

    static borrowDays = [0, 31, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30];
    static calculateDecimalAge(fromDateString, toDateString) {
        let from,
            to,
            isNegative = 0;
        if (toDateString < fromDateString) {
            from = toDateString.split("-");
            to = fromDateString.split("-");
            isNegative = 1;
        } else {
            from = fromDateString.split("-");
            to = toDateString.split("-");
        }
        const fYear = +from[0];
        const fMonth = +from[1];
        const fDay = +from[2];
        let tYear = +to[0];
        let tMonth = +to[1];
        let tDay = +to[2];
        const toIsLeap = Utils.isLeapYear(tYear);

        if (tDay < fDay) {
            let borrow = Utils.borrowDays[tMonth];
            if (toIsLeap && tMonth == 3) borrow = 29;
            tDay += borrow;
            tMonth -= 1;
        }
        if (tMonth < tYear) {
            tMonth += 12;
            tYear -= 1;
        }

        const years = tYear - fYear;
        const months = tMonth - fMonth;
        const days = tDay - fDay;

        // Adjust the years with the fractional part for months
        let age = years + months / 12 + days / (toIsLeap ? 366 : 365);
        if (isNegative) age = -age;

        return age;
    }

    static isLeapYear(year) {
        // A year is a leap year if it is divisible by 4,
        // except for years that are divisible by 100, unless they are also divisible by 400.
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    /**
     * Add adjusteBirth and adjustedDeath as birth and and death date fields to the given person record
     * retrieved from the API. The fields are constructed as described in {@link Utils.getTheDate()}.
     * @param {*} person A profile record as retrieved from the API
     */
    static setAdjustedDates(person) {
        person.adjustedBirth = Utils.getTheDate(person, "Birth");
        person.adjustedDeath = Utils.getTheDate(person, "Death");
    }

    /**
     * Convert a (numeric) date string of the form 'YYYY-MM-DD' into a JS Date object.
     * @param {*} dateStr A numeric string in the form 'YYYY-MM-DD', 'YYYY-MM', 'YYYY', or 'YYYYs'
     * @returns A corresponding Date object, except that 0000-00-00 will be converted to 9999-12-31
     *          so that unknown dates, when sorted, will be last.
     */
    static dateObject(dateStr) {
        const parts = (dateStr || "9999-12-31").split("-");
        // Unknown year goes last
        if (parts[0] && parts[0] == 0) parts[0] = 9999;
        if (parts[1] && parts[1] > 0) parts[1] -= 1;
        if (parts.length == 1) {
            parts[1] = 0;
        }
        return new Date(Date.UTC(...parts));
    }

    /**
     * Turn a wikitree Place into a location as per format string
     */
    static settingsStyleLocation(locString, formatString) {
        // take the locString as input, and break it up into parts, separated by commas
        // In an IDEAL world, the place name would be entered thusly:
        // TOWN , (optional COUNTY), PROVINCE or STATE or REGION NAME , COUNTRY
        // So we want the parts at locations 0 , N - 1, and N for Town, Region, Country respectively
        // IF there are < 3 parts, then we have to do some assumptions and rejiggering to supply the formatString with a plausible result

        if (formatString == "Full") {
            // there's no need for doing any parsing --> just return the whole kit and caboodle
            return locString;
        }
        if (!locString) {
            return "";
        }
        var parts = locString.split(",");
        if (parts.length == 1) {
            // there's no way to reformat/parse a single item location
            return locString;
        }

        let town = parts[0].trim();
        let country = parts[parts.length - 1].trim();
        let region = "";
        if (parts.length > 2) {
            region = parts[parts.length - 2].trim();
        }

        if (formatString == "Country") {
            // Specifically ignore United Kingdom and return the constituent country
            if (country == "United Kingdom" || country == "Great Britain") {
                return region ? region : town;
            }
            return country;
        } else if (formatString == "Region") {
            if (region > "") {
                return region;
            } else {
                return country;
            }
        } else if (formatString == "Town") {
            return town;
        } else if (formatString == "TownCountry") {
            return town + ", " + country;
        } else if (formatString == "RegionCountry") {
            if (region > "") {
                return region + ", " + country;
            } else {
                return town + ", " + country;
            }
        } else if (formatString == "TownRegion") {
            if (region > "") {
                return town + ", " + region;
            } else {
                return town + ", " + country;
            }
        }
        return "";
    }

    static chooseForeground(backgroundColour) {
        let backgroundHex = this.rgbToHex(backgroundColour);
        let relativeLuminance = this.getLuminance(backgroundHex);
        let chooseBlack = (relativeLuminance + 0.05) / 0.05;
        let chooseWhite = 1.05 / (relativeLuminance + 0.05);
        return chooseBlack > chooseWhite ? "#000000" : "#ffffff";
    }

    static getLuminance(colour) {
        colour = colour.replace(/#/, "").match(/.{1,2}/g);
        for (let x = 0; x < colour.length; x++) {
            colour[x] = parseInt(colour[x], 16) / 255;
            colour[x] = colour[x] <= 0.03928 ? colour[x] / 12.92 : ((colour[x] + 0.055) / 1.055) ** 2.4;
        }
        return 0.2126 * colour[0] + 0.7152 * colour[1] + 0.0722 * colour[2];
    }

    static componentToHex(c) {
        // This expects `c` to be a number:
        const hex = c.toString(16);

        return hex.length === 1 ? `0${hex}` : hex;
    }

    static rgbToHex(rgb) {
        // .map(Number) will convert each string to number:
        const [r, g, b] = rgb.replace("rgb(", "").replace(")", "").split(",").map(Number);

        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }
}
