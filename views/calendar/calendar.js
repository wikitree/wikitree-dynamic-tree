window.calendarView = class calendarView extends View {
    meta() {
        return {
            title: "Family Anniversaries",
            description: `Here are birthdays, wedding dates, and death date anniversaries from your Watchlist. For non-living ancestors,
                some members like to honor a special day by sharing the person's profile or a photo <a href="https://www.wikitree.com/wiki/Help:Shareable_Images">
                or family tree or relationship image</a> on Facebook or another social network. For living family members, some like to
                send an <a href="https://www.wikitree.com/wiki/Category:E-Cards">e-card</a>.`,
            docs: "",
        };
    }
    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields: "Name",
        }).then(function (data) {
            var AllMonths = {
                Jan: [],
                Feb: [],
                Mar: [],
                Apr: [],
                May: [],
                Jun: [],
                Jul: [],
                Aug: [],
                Sep: [],
                Oct: [],
                Nov: [],
                Dec: [],
            };

            /* The default view for the Calendar is a vertical display of events from the logged in
             * user's watchlist. This is based on the original Special:Anniversaries view.
             */
            $(".ancCalendar").remove();
            $(selector).append(`
                <div class="watchCalendar">
                    <div class="fourteen columns center">
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Jan">January</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Feb">February</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Mar">March</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Apr">April</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-May">May</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Jun">June</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Jul">July</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Aug">August</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Sep">September</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Oct">October</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Nov">November</span>&nbsp;
                        &nbsp;<span style="text-decoration:underline;cursor:pointer;" id="month-Dec">December</span>&nbsp;
                    </div><br>
                    <div class="loader">
                        <image width="200px" src="views/calendar/wtloadericon.png" />
                    </div>
                    <div class="calendar">
                        <div id="Jan" class="content"><h2>January</h2></div>
                        <div id="Feb" class="content"><h2>February</h2></div>
                        <div id="Mar" class="content"><h2>March</h2></div>
                        <div id="Apr" class="content"><h2>April</h2></div>
                        <div id="May" class="content"><h2>May</h2></div>
                        <div id="Jun" class="content"><h2>June</h2></div>
                        <div id="Jul" class="content"><h2>July</h2></div>
                        <div id="Aug" class="content"><h2>August</h2></div>
                        <div id="Sep" class="content"><h2>September</h2></div>
                        <div id="Oct" class="content"><h2>October</h2></div>
                        <div id="Nov" class="content"><h2>November</h2></div>
                        <div id="Dec" class="content"><h2>December</h2></div>
                    </div>
                </div>
            `);

            WikiTreeAPI.getWatchlist(5000, 1, 0, [
                "Derived.ShortName",
                "BirthDate",
                "DeathDate",
                "Name",
                "Spouses",
            ]).then(function (watchlist) {
                processData(watchlist);
            });

            function processData(x) {
                // For each profile
                for (var i = 0; i < x.length; i++) {
                    // Log the Birth Event
                    if (getMonth(x[i].BirthDate) != undefined) {
                        pushEvents(x[i], x[i].BirthDate, " was born", "", "");
                    }
                    // Log the Death Event
                    if (getMonth(x[i].DeathDate) != undefined) {
                        pushEvents(x[i], x[i].DeathDate, " died", "", "");
                    }
                    // Log Marriage Events
                    if (x[i].Spouses.length != 0) {
                        var spouseIDs = Object.keys(x[i].Spouses);
                        for (var j = 0; j < spouseIDs.length; j++) {
                            if (getMonth(x[i].Spouses[spouseIDs[j]].marriage_date) != undefined) {
                                pushEvents(
                                    x[i],
                                    x[i].Spouses[spouseIDs[j]].marriage_date,
                                    " marriage to ",
                                    x[i].Spouses[spouseIDs[j]].Name,
                                    x[i].Spouses[spouseIDs[j]].ShortName
                                );
                            }
                        }
                        //if (getMonth(x[i].Spouses[i].marriage_date) != undefined) {
                        //spanushEvents(x[i], x[i].Spouses.marriage_date, "  married ", );
                    }
                    if (i == x.length - 1) {
                        // Hide Loader when finished iterating through profile
                        $(".loader").hide();
                        $(".calendar").css("display", "block");
                        $(".calendarMenu").css("display", "block");
                        // Open the Current Month
                        $(`#${months[new Date().getMonth()]}`)
                            .addClass("active box rounded orange")
                            .css("display", "block");
                    }
                }
                // Now we can sort our content for the calendar, by day and then by year.
                for (var i = 0; i < 12; i++) {
                    var array = Object.keys(AllMonths)[i];
                    AllMonths[array].sort((a, b) => {
                        if (a.day === b.day) {
                            return a.year < b.year ? -1 : 1;
                        } else {
                            return a.day < b.day ? -1 : 1;
                        }
                    });
                }
                // Then we insert the content into the correct month
                // This could be simplified...
                for (var i = 0; i < x.length; i++) {
                    try {
                        $(`#Jan`).append(`
                        <span>${AllMonths.Jan[i].day} ${getMonth(AllMonths.Jan[i].date)}
                        ${AllMonths.Jan[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Jan[i].id}">
                        ${AllMonths.Jan[i].name}</a> ${AllMonths.Jan[i].text} ${
                            AllMonths.Jan[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Jan[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Feb`).append(`
                        <span>${AllMonths.Feb[i].day} ${getMonth(AllMonths.Feb[i].date)}
                        ${AllMonths.Feb[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Feb[i].id}">
                        ${AllMonths.Feb[i].name}</a> ${AllMonths.Feb[i].text} ${
                            AllMonths.Feb[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Feb[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Mar`).append(`
                        <span>${AllMonths.Mar[i].day} ${getMonth(AllMonths.Mar[i].date)}
                        ${AllMonths.Mar[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Mar[i].id}">
                        ${AllMonths.Mar[i].name}</a> ${AllMonths.Mar[i].text} ${
                            AllMonths.Mar[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Mar[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Apr`).append(`
                        <span>${AllMonths.Apr[i].day} ${getMonth(AllMonths.Apr[i].date)}
                        ${AllMonths.Apr[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Apr[i].id}">
                        ${AllMonths.Apr[i].name}</a> ${AllMonths.Apr[i].text} ${
                            AllMonths.Apr[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Apr[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#May`).append(`
                        <span>${AllMonths.May[i].day} ${getMonth(AllMonths.May[i].date)}
                        ${AllMonths.May[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.May[i].id}">
                        ${AllMonths.May[i].name}</a> ${AllMonths.May[i].text} ${
                            AllMonths.May[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.May[i].id
                        }/6">share tree image</a>]

                        </span><br>
                    `);
                        $(`#Jun`).append(`
                        <span>${AllMonths.Jun[i].day} ${getMonth(AllMonths.Jun[i].date)}
                        ${AllMonths.Jun[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Jun[i].id}">
                        ${AllMonths.Jun[i].name}</a> ${AllMonths.Jun[i].text} ${
                            AllMonths.Jun[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Jun[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Jul`).append(`
                        <span>${AllMonths.Jul[i].day} ${getMonth(AllMonths.Jul[i].date)}
                        ${AllMonths.Jul[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Jul[i].id}">
                        ${AllMonths.Jul[i].name}</a> ${AllMonths.Jul[i].text} ${
                            AllMonths.Jul[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Jul[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Aug`).append(`
                        <span>${AllMonths.Aug[i].day} ${getMonth(AllMonths.Aug[i].date)}
                        ${AllMonths.Aug[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Aug[i].id}">
                        ${AllMonths.Aug[i].name}</a> ${AllMonths.Aug[i].text} ${
                            AllMonths.Aug[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Aug[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Sep`).append(`
                        <span>${AllMonths.Sep[i].day} ${getMonth(AllMonths.Sep[i].date)}
                        ${AllMonths.Sep[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Sep[i].id}">
                        ${AllMonths.Sep[i].name}</a> ${AllMonths.Sep[i].text} ${
                            AllMonths.Sep[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Sep[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Oct`).append(`
                            <span>${AllMonths.Oct[i].day} ${getMonth(AllMonths.Oct[i].date)}
                            ${AllMonths.Oct[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Oct[i].id}">
                            ${AllMonths.Oct[i].name}</a> ${AllMonths.Oct[i].text} ${
                            AllMonths.Oct[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Oct[i].id
                        }/6">share tree image</a>]
                        </span><br>
                            `);
                        $(`#Nov`).append(`
                        <span>${AllMonths.Nov[i].day} ${getMonth(AllMonths.Nov[i].date)}
                        ${AllMonths.Nov[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Nov[i].id}">
                        ${AllMonths.Nov[i].name}</a> ${AllMonths.Nov[i].text} ${
                            AllMonths.Nov[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Nov[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                        $(`#Dec`).append(`
                        <span>${AllMonths.Dec[i].day} ${getMonth(AllMonths.Dec[i].date)}
                        ${AllMonths.Dec[i].year} <a href="https://www.wikitree.com/wiki/${AllMonths.Dec[i].id}">
                        ${AllMonths.Dec[i].name}</a> ${AllMonths.Dec[i].text} ${
                            AllMonths.Dec[i].marriage
                        } [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                            AllMonths.Dec[i].id
                        }/6">share tree image</a>]
                        </span><br>
                    `);
                    } catch {}
                }
            }
            // And here is just a bunch of random helpers.
            // This could use some cleanup and simplification.
            var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            function getMonth(date) {
                if (date.split("-")[0] != "0000" && date.split("-")[1] != "00" && date.split("-")[2] != "00") {
                    return months[date.split("-")[1] - 1];
                } else {
                    return undefined;
                }
            }

            $("span[id^='month-']").click(function (e) {
                $(".calendar").children().removeClass("active box rounded orange").css("display", "none").hide();
                $(`#${e.target.id.replace("month-", "")}`)
                    .addClass("active box rounded orange")
                    .css("display", "block");
            });

            function pushEvents(person, date, text, link, spouse) {
                if (getMonth(date) == "Jan" && getMonth(date) != undefined) {
                    AllMonths.Jan.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Feb" && getMonth(date) != undefined) {
                    AllMonths.Feb.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Mar" && getMonth(date) != undefined) {
                    AllMonths.Mar.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Apr" && getMonth(date) != undefined) {
                    AllMonths.Apr.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "May" && getMonth(date) != undefined) {
                    AllMonths.May.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Jun" && getMonth(date) != undefined) {
                    AllMonths.Jun.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Jul" && getMonth(date) != undefined) {
                    AllMonths.Jul.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Aug" && getMonth(date) != undefined) {
                    AllMonths.Aug.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Sep" && getMonth(date) != undefined) {
                    AllMonths.Sep.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Oct" && getMonth(date) != undefined) {
                    AllMonths.Oct.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Nov" && getMonth(date) != undefined) {
                    AllMonths.Nov.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                } else if (getMonth(date) == "Dec" && getMonth(date) != undefined) {
                    AllMonths.Dec.push({
                        id: person.Name,
                        name: person.ShortName,
                        text: text,
                        date: date,
                        year: date.split("-")[0],
                        month: date.split("-")[1],
                        day: date.split("-")[2],
                        marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                    });
                }
            }
        });
    }
};
