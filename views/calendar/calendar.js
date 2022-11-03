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
        // Family Anniversaries/Calendar works through profiles from the user's Watchlist.
        // We can't retrieve a watchlist unless the user is logged in.
        if (!wtViewRegistry?.session.lm.user.isLoggedIn()) {
            wtViewRegistry.showError(`You must be logged into the API to view your family anniversaries.`);
            wtViewRegistry.hideInfoPanel();
            return;
        }

        // Once the user is logged in, we can only display this View for the user's own profile.
        // You can't view anniversaries/watchlist for another user.
        if (person_id != wtViewRegistry.session.lm.user.id) {
            document.location = `#name=${wtViewRegistry.session.lm.user.name}&view=calendar`;
            return;
        }

        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields: "Name",
        }).then(function (data) {
            const MONTHS = [
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

            const AllMonths = {
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
             * To add a new view later, we need to destroy the current view $(".watchCalendar").remove();
             */
            if ($(selector).find(".watchCalendar").length == 0) {
                $(selector).append(`
                    <div class="watchCalendar">
                        <div class="fourteen columns center">
                            ${MONTHS.map((month) => `<span id="month-${month.slice(0, 3)}">${month}&#8203</span>`).join(
                                ""
                            )}
                        </div>
                        <div class="loader">
                            <image class="loaderIMG" src="https://www.wikitree.com/photo.php/8/81/WikiTree_Images_New-7.png" />
                        </div>
                        <div class="calendar">
                            ${MONTHS.map(
                                (month) => `<div id="${month.slice(0, 3)}" class="content"><h2>${month}</h2></div>`
                            ).join("")}
                        </div>
                    </div>
                `);
            }
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
                    }
                    if (i == x.length - 1) {
                        // Hide Loader when finished iterating through profile
                        $(".loader").hide();
                        $(".calendar").css("display", "block");
                        $(".calendarMenu").css("display", "block");
                        // Open the Current Month
                        $(`#${getMonth(new Date().toISOString().split("T")[0]).slice(0, 3)}`)
                            .addClass("box rounded orange")
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
                for (const monthName of MONTHS) {
                    // loop over all months
                    const shortName = monthName.slice(0, 3);
                    let events = AllMonths[shortName];
                    $(`#${shortName}`).append(
                        events
                            .map(
                                (event) => `
                                    <div>
                                        ${event.day} ${getMonth(event.date)} ${event.year}
                                        <a href="https://www.wikitree.com/wiki/${event.id}">${event.name}</a>
                                        ${event.text} ${event.marriage} 
                                        [<span class="small"><a href="https://www.wikitree.com/treewidget/${
                                            event.id
                                        }/6">share tree image</a>
                                        </span>]
                                    </div>`
                            )
                            .join("")
                    );
                }
            }
            // Set our view handler
            $("span[id^='month-']").click(function (e) {
                $(".calendar").children().removeClass("box rounded orange").css("display", "none").hide();
                $(`#${e.target.id.replace("month-", "")}`)
                    .addClass("box rounded orange")
                    .css("display", "block");
            });

            // And here is our helpers.
            function getMonth(date) {
                if (date.split("-")[0] != "0000" && date.split("-")[1] != "00" && date.split("-")[2] != "00") {
                    return MONTHS[date.split("-")[1] - 1];
                } else {
                    return undefined;
                }
            }

            function pushEvents(person, date, text, link, spouse) {
                const [year, month, day] = date.split("-").map((item) => parseInt(item));
                if (year == 0 || month === 0 || day === 0) return; // we don't know full date -> we don't want this
                AllMonths[MONTHS[month - 1].slice(0, 3)].push({
                    id: person.Name,
                    name: person.ShortName,
                    text: text,
                    date: date,
                    year: year,
                    month: month,
                    day: day,
                    marriage: `<a href="https://www.wikitree.com/wiki/${link}">${spouse}</a>`,
                });
            }
        });
    }
};
