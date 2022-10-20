window.calendarView = class calendarView extends View {
    meta() {
        return {
            title: "Anniversary Calendar",
            description: "Here are birthday and death date anniversaries from your ancestors, or watchlist.",
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields: "Parents,Siblings,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,Name,BirthDate,DeathDate,Children,Spouses,Father,Mother",
        }).then(function (data) {
            var AllMonths = {
                January: [],
                February: [],
                March: [],
                April: [],
                May: [],
                June: [],
                July: [],
                August: [],
                September: [],
                October: [],
                November: [],
                December: [],
            };

            getTenGenAncestors();

            function getWatchlistAncestors() {
                $(".ancCalendar").remove();
                $(selector).append(`
                    <div class="watchCalendar">
                        <div class="loader">
                            <image width="200px" src="views/calendar/wtloadericon.png" />
                        </div>
                        <div class="calendar">
                            <button type="button" class="collapsible">January</button><div id="January" class="content"></div>
                            <button type="button" class="collapsible">February</button><div id="February" class="content"></div>
                            <button type="button" class="collapsible">March</button><div id="March" class="content"></div>
                            <button type="button" class="collapsible">April</button><div id="April" class="content"></div>
                            <button type="button" class="collapsible">May</button><div id="May" class="content"></div>
                            <button type="button" class="collapsible">June</button><div id="June" class="content"></div>
                            <button type="button" class="collapsible">July</button><div id="July" class="content"></div>
                            <button type="button" class="collapsible">August</button><div id="August" class="content"></div>
                            <button type="button" class="collapsible">September</button><div id="September" class="content"></div>
                            <button type="button" class="collapsible">October</button><div id="October" class="content"></div>
                            <button type="button" class="collapsible">November</button><div id="November" class="content"></div>
                            <button type="button" class="collapsible">December</button><div id="December" class="content"></div>
                        </div>
                    </div>
                `);
            }

            /* The default view for the Calendar is a vertical display of birth and death Events
             * for ancestors out to 10 generations, dervied on the original Special:Anniversaries
             * view.
             */
            function getTenGenAncestors() {
                $(".watchCalendar").remove();
                $(selector).append(`
                    <div class="ancCalendar">
                        <div class="loader">
                            <image width="200px" src="views/calendar/wtloadericon.png" />
                        </div>
                        <div class="calendar">
                            <button type="button" class="collapsible">January</button><div id="January" class="content"></div>
                            <button type="button" class="collapsible">February</button><div id="February" class="content"></div>
                            <button type="button" class="collapsible">March</button><div id="March" class="content"></div>
                            <button type="button" class="collapsible">April</button><div id="April" class="content"></div>
                            <button type="button" class="collapsible">May</button><div id="May" class="content"></div>
                            <button type="button" class="collapsible">June</button><div id="June" class="content"></div>
                            <button type="button" class="collapsible">July</button><div id="July" class="content"></div>
                            <button type="button" class="collapsible">August</button><div id="August" class="content"></div>
                            <button type="button" class="collapsible">September</button><div id="September" class="content"></div>
                            <button type="button" class="collapsible">October</button><div id="October" class="content"></div>
                            <button type="button" class="collapsible">November</button><div id="November" class="content"></div>
                            <button type="button" class="collapsible">December</button><div id="December" class="content"></div>
                        </div>
                    </div>
                `);
                WikiTreeAPI.getAncestors(data[0].person.Name, 10, [
                    "Id",
                    "Derived.ShortName",
                    "LastNameAtBirth",
                    "LastNameCurrent",
                    "BirthDate",
                    "BirthLocation",
                    "DeathDate",
                    "DeathLocation",
                    "Name",
                ]).then(function (data) {
                    processData(data);
                });
            }

            function processData(ancestor) {
                // For each ancestor
                for (var i = 0; i < ancestor.length; i++) {
                    // Log the Birth Event
                    if (getMonth(ancestor[i].BirthDate) != undefined) {
                        pushEvents(ancestor[i], ancestor[i].BirthDate, " was born");
                    }
                    // Log the Death Event
                    if (getMonth(ancestor[i].DeathDate) != undefined) {
                        pushEvents(ancestor[i], ancestor[i].DeathDate, " died");
                    }
                    // Hide Loader when finished iterating through ancestors
                    if (i == ancestor.length - 1) {
                        $(".loader").hide();
                        $(".calendar").css("display", "block");
                    }
                }
                // Now we can sort our content for the calendar, by day and then by year.
                for (var i = 0; i < Object.keys(AllMonths).length; i++) {
                    var array = Object.keys(AllMonths)[i];
                    AllMonths[array].sort((a, b) => {
                        if (a.day === b.day) {
                            return a.year < b.year ? -1 : 1;
                        } else {
                            return a.day < b.day ? -1 : 1;
                        }
                    });
                    // Then we insert the content into the correct month
                    // This could be simplified...
                    try {
                        $(`#January`).append(`
                        <p>${AllMonths.January[i].day} ${getMonth(AllMonths.January[i].date)}
                        ${AllMonths.January[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.January[i].id}">
                        ${AllMonths.January[i].name}</a> ${AllMonths.January[i].text}
                        </p>
                    `);
                        $(`#February`).append(`
                        <p>${AllMonths.February[i].day} ${getMonth(AllMonths.February[i].date)}
                        ${AllMonths.February[i].year} <a href="https://www.wikitree.com/wiki/${
                            AllMonths.February[i].id
                        }">
                        ${AllMonths.February[i].name}</a> ${AllMonths.February[i].text}
                        </p>
                    `);
                        $(`#March`).append(`
                        <p>${AllMonths.March[i].day} ${getMonth(AllMonths.March[i].date)}
                        ${AllMonths.March[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.March[i].id}">
                        ${AllMonths.March[i].name}</a> ${AllMonths.March[i].text}
                        </p>
                    `);
                        $(`#April`).append(`
                        <p>${AllMonths.April[i].day} ${getMonth(AllMonths.April[i].date)}
                        ${AllMonths.April[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.April[i].id}">
                        ${AllMonths.April[i].name}</a> ${AllMonths.April[i].text}
                        </p>
                    `);
                        $(`#May`).append(`
                        <p>${AllMonths.May[i].day} ${getMonth(AllMonths.May[i].date)}
                        ${AllMonths.May[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.May[i].id}">
                        ${AllMonths.May[i].name}</a> ${AllMonths.May[i].text}
                        </p>
                    `);
                        $(`#June`).append(`
                        <p>${AllMonths.June[i].day} ${getMonth(AllMonths.June[i].date)}
                        ${AllMonths.June[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.June[i].id}">
                        ${AllMonths.June[i].name}</a> ${AllMonths.June[i].text}
                        </p>
                    `);
                        $(`#July`).append(`
                        <p>${AllMonths.July[i].day} ${getMonth(AllMonths.July[i].date)}
                        ${AllMonths.July[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.July[i].id}">
                        ${AllMonths.July[i].name}</a> ${AllMonths.July[i].text}
                        </p>
                    `);
                        $(`#August`).append(`
                        <p>${AllMonths.August[i].day} ${getMonth(AllMonths.August[i].date)}
                        ${AllMonths.August[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.August[i].id}">
                        ${AllMonths.August[i].name}</a> ${AllMonths.August[i].text}
                        </p>
                    `);
                        $(`#September`).append(`
                        <p>${AllMonths.September[i].day} ${getMonth(AllMonths.September[i].date)}
                        ${AllMonths.September[i].year} <a href="https://www.wikitree.com/wiki/${
                            AllMonths.September[i].id
                        }">
                        ${AllMonths.September[i].name}</a> ${AllMonths.September[i].text}
                        </p>
                    `);
                        $(`#October`).append(`
                        <p>${AllMonths.October[i].day} ${getMonth(AllMonths.October[i].date)}
                        ${AllMonths.October[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.October[i].id}">
                        ${AllMonths.October[i].name}</a> ${AllMonths.October[i].text}
                        </p>
                    `);
                        $(`#November`).append(`
                        <p>${AllMonths.November[i].day} ${getMonth(AllMonths.November[i].date)}
                        ${AllMonths.November[i].year} <a href="https://www.wikitree.com/wiki/${
                            AllMonths.November[i].id
                        }">
                        ${AllMonths.November[i].name}</a> ${AllMonths.November[i].text}
                        </p>
                    `);
                        $(`#December`).append(`
                        <p>${AllMonths.December[i].day} ${getMonth(AllMonths.December[i].date)}
                        ${AllMonths.December[i].year} <a href="https://www.wikitree.com/wiki/${
                            AllMonths.December[i].id
                        }">
                        ${AllMonths.December[i].name}</a> ${AllMonths.December[i].text}
                        </p>
                    `);
                    } catch {}
                }
            }
            // And here is just a bunch of random helpers.
            // This could use some cleanup and simplification.
            var months = [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
            ];
            function getMonth(date) {
                if (date.split("-")[0] != "0000" && date.split("-")[1] != "00") {
                    return months[date.split("-")[1] - 1];
                } else {
                    return undefined;
                }
            }

            $(`#${months[new Date().getMonth()]}`).prev().addClass("collapsible active");
            $(`#${months[new Date().getMonth()]}`).css("display", "block");

            for (var i = 0; i < $(".collapsible").length; i++) {
                $(".collapsible")[i].addEventListener("click", function () {
                    this.classList.toggle("active");
                    var content = this.nextElementSibling;
                    if (content.style.display === "block") {
                        content.style.display = "none";
                    } else {
                        content.style.display = "block";
                    }
                });
            }

            function pushEvents(person, date, text) {
                if (getMonth(date) == "January") {
                    AllMonths.January.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "February") {
                    AllMonths.February.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "March") {
                    AllMonths.March.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "April") {
                    AllMonths.April.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "May") {
                    AllMonths.May.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "June") {
                    AllMonths.June.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "July") {
                    AllMonths.July.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "August") {
                    AllMonths.August.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "September") {
                    AllMonths.September.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "October") {
                    AllMonths.October.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "November") {
                    AllMonths.November.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                } else if (getMonth(date) == "December") {
                    AllMonths.December.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                    });
                }
            }
        });
    }
};
