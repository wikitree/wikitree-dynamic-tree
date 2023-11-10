window.CalendarView = class CalendarView extends View {
    static APP_ID = "Calendar";
    meta() {
        return {
            title: "Family Calendar",
            description: `Discover your ancestral legacy with the WikiTree Family Calendar, showcasing birth and death anniversaries of ten generations of your ancestors.`,
            docs: "",
        };
    }

    close() {
        // Another view is about to be activated, remove the display options
        $('#view-options').remove();
    }

    init(selector, person_id) {
        if ($('#view-options').length) {
            $('#view-options').remove();
        }
        const displayOptionsHTML = `
            <div id="view-options">
                <label for="display-mode">Display Mode:</label>
                <select id="display-mode" style="padding:none;">
                    <option value="list">Watchlist Anniversaries</option>
                    <option value="calendar">Modern Calendar</option>
                </select>
            </div>
        `;

        $('main').append(displayOptionsHTML);
        listAnniversaries(selector, person_id);

        $('#display-mode').on('change', function () {
            const selectedMode = $(this).val();

            if (selectedMode === 'calendar') {
                modernCalendar(selector, person_id);
                $('#watchCalendar').hide();
                $('#ancCalendar').show();
            } else if (selectedMode === 'list') {
                listAnniversaries(selector, person_id);
                $('#watchCalendar').show();
                $('#ancCalendar').hide();
            }
        });

        function listAnniversaries(selector, person_id) {
            // Family Anniversaries/Calendar works through profiles from the user's Watchlist.
            // We can't retrieve a watchlist unless the user is logged in.
            if (!wtViewRegistry?.session.lm.user.isLoggedIn()) {
                throw new ViewError(`You must be logged into the API to view your family anniversaries.`);
            }

            // Once the user is logged in, we can only display this View for the user's own profile.
            // You can't view anniversaries/watchlist for another user.
            if (person_id != wtViewRegistry.session.lm.user.id) {
                document.location = `#name=${wtViewRegistry.session.lm.user.name}&view=calendar`;
                return;
            }

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
                    <div id="watchCalendar" class="watchCalendar">
                        <div class="fourteen columns center">
                            ${MONTHS.map((month) => `<span id="month-${month.slice(0, 3)}">${month}&#8203</span>`).join("")}
                        </div>
                        <div class="loader">
                            <image class="loaderIMG" src="https://www.wikitree.com/photo.php/8/81/WikiTree_Images_New-7.png" />
                        </div>
                        <div class="calendar">
                            ${MONTHS.map((month) => `<div id="${month.slice(0, 3)}" class="content"><h2>${month}</h2></div>`).join("")}
                        </div>
                    </div>
                `);
            }

            WikiTreeAPI.getWatchlist('Calendar', 5000, 1, 0, [
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
                                    [<span class="small"><a href="https://www.wikitree.com/treewidget/${event.id
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

        }

        function modernCalendar(selector, person_id) {
            WikiTreeAPI.postToAPI({
                appId: CalendarView.APP_ID,
                action: "getPeople",
                keys: person_id,
                ancestors: 10,
                siblings: 1,
                fields: "Derived.ShortName,BirthDate,DeathDate,Name",
            }).then(function (data) {
                const ancCalendar = `<div id="ancCalendar"></div>`;

                $(selector).append(ancCalendar);

                $('#ancCalendar').fullCalendar().fullCalendar('destroy');
                // Define an error message for permission denial
                const errorMessage = "Ancestor/Descendant permission denied.";

                // Check if the API response contains the permission error
                if (
                    data[0].resultByKey &&
                    data[0].resultByKey[person_id] &&
                    data[0].resultByKey[person_id].status === errorMessage
                ) {
                    let err = `The starting profile data could not be retrieved.`;
                    if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                        err += ` You may need to be added to the starting profile's Trusted List.`;
                    } else {
                        err += ` Try the Apps login.`;
                    }
                    wtViewRegistry.showError(err);
                    wtViewRegistry.hideInfoPanel();
                } else {
                    const wtIdTextValue = $('#wt-id-text').val();
                    // Extract the people data from the API response
                    const peopleData = data[0].people;
                    // Create an array to store all events
                    const allEvents = [];

                    // Loop through the people data and create events for birth dates
                    for (const [id, person] of Object.entries(peopleData)) {
                        // Skip persons with missing birth date
                        if (!person.BirthDate || person.BirthDate === '0000-00-00') {
                            continue;
                        }

                        // Create an event object for birth date
                        var birthyear = new Date(person.BirthDate).getFullYear();
                        const eventBirth = {
                            title: `${person.ShortName} - Birth ${birthyear}`,
                            start: person.BirthDate,
                            url: `https://www.wikitree.com/index.php?title=Special:Relationship&action=calculate&person1Name=${wtIdTextValue}&person2Name=${person.Name}`
                        };

                        // Push the event object to the events array
                        allEvents.push(eventBirth);

                        // Check if DeathDate exists and is not "0000-00-00", then create event for death date
                        if (person.DeathDate && person.DeathDate !== '0000-00-00') {
                            var deathyear = new Date(person.DeathDate).getFullYear();
                            const eventDeath = {
                                title: `${person.ShortName} - Death ${deathyear}`,
                                start: person.DeathDate,
                                url: `https://www.wikitree.com/index.php?title=Special:Relationship&action=calculate&person1Name=${wtIdTextValue}&person2Name=${person.Name}`
                            };
                            allEvents.push(eventDeath);
                        }
                    }

                    // Now you have all events in the desired format
                    // You can use it here or pass it to another function, etc.
                    var currentMonth;
                    var currentYear;
                    // Initialize FullCalendar inside the .then() block
                    $('#ancCalendar').fullCalendar({
                        events: allEvents,
                        eventRender: function (event, element) {
                            element.on('mouseenter', function () {
                                $(this).css('background-color', '#25422d');
                            });
                            element.on('mouseleave', function () {
                                $(this).css('background-color', '');
                            });
                        },
                        showNonCurrentDates: false,
                        fixedWeekCount: false,
                        aspectRatio: 2,
                        eventTextColor: '#FFFFFF',
                        viewRender: function (view, element) {
                            // Get the current start and end dates being displayed in the current view
                            const startDate = view.start;
                            const endDate = view.end;
                            var currentDate = $('#ancCalendar').fullCalendar('getDate');
                            currentMonth = currentDate.format('MMM');
                            currentYear = currentDate.year();
                            // Create an array to store the events for the current view
                            const eventsToShow = [];

                            // Loop through all events and create events for every year in the current view's date range
                            for (const event of allEvents) {
                                const eventDate = moment(event.start);

                                // Create an event for every year between the start and end dates of the current view
                                for (let year = startDate.year(); year <= endDate.year(); year++) {
                                    const newEvent = {
                                        ...event,
                                        start: eventDate.year(year).format('YYYY-MM-DD')
                                    };
                                    eventsToShow.push(newEvent);
                                }
                            }

                            // Clear the existing events on the calendar
                            $('#ancCalendar').fullCalendar('removeEvents');

                            // Add the events for the current view to the calendar
                            $('#ancCalendar').fullCalendar('addEventSource', eventsToShow);

                            // Remove the active class from all buttons
                            $('.fc-customButton').removeClass('active-view-button');
                            // Add the active class to the default button (month view)
                            $('.fc-defaultView-button').addClass('active-view-button');
                        },
                        customButtons: {
                            printCalendar: {
                                text: 'Print Calendar',
                                click: function () {
                                    // Get the calendar container element
                                    var calendarContainer = document.getElementById('ancCalendar');

                                    // Hide the left and right header components
                                    var originalHeaderLeft = calendarContainer.getElementsByClassName('fc-left')[0];
                                    var originalHeaderRight = calendarContainer.getElementsByClassName('fc-right')[0];
                                    originalHeaderLeft.style.display = 'none';
                                    originalHeaderRight.style.display = 'none';

                                    // Create the image
                                    html2canvas(calendarContainer).then(function (canvas) {
                                        // Convert the canvas to a data URL and download it
                                        var link = document.createElement('a');
                                        link.download = `${currentMonth}_${currentYear}.png`;
                                        link.href = canvas.toDataURL();
                                        link.click();

                                        // Restore the original header components' display after printing
                                        originalHeaderLeft.style.display = '';
                                        originalHeaderRight.style.display = '';
                                    });
                                }
                            },
                            listDay: {
                                text: 'day',
                                click: function () {
                                    $('#ancCalendar').fullCalendar('changeView', 'listDay');
                                    $('.fc-customButton').removeClass('active-view-button');
                                    $('.fc-listDay-button').addClass('active-view-button');
                                }
                            },
                            listWeek: {
                                text: 'week',
                                click: function () {
                                    $('#ancCalendar').fullCalendar('changeView', 'listWeek');
                                    $('.fc-customButton').removeClass('active-view-button');
                                    $('.fc-listWeek-button').addClass('active-view-button');
                                }
                            },
                            defaultView: { // Add this new button
                                text: 'month',
                                click: function () {
                                    $('#ancCalendar').fullCalendar('changeView', 'month');
                                    $('.fc-customButton').removeClass('active-view-button');
                                    $('.fc-defaultView-button').addClass('active-view-button');
                                }
                            }
                        },
                        header: {
                            left: 'defaultView,listWeek,listDay',
                            center: 'title',
                            right: 'today prev,next printCalendar',
                        }
                    });

                    $(document).ready(function () {
                        $(".fc-day-number").css("font-size", "large");
                        $("a").css("text-decoration", "none");
                        $("td.fc-today").css("background-color", "#FFC");
                        $("body").css("background", "#FFF");
                    });
                }
            });
        }
    }
};