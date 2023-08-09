window.CalendarView = class CalendarView extends View {
    static APP_ID = "Calendar";
    meta() {
        return {
            title: "Family Calendar",
            description: `Discover your ancestral legacy with the Wikitree Family Calendar, showcasing birth and death anniversaries of ten generations of your ancestors.`,
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            appId: CalendarView.APP_ID,
            action: "getPeople",
            keys: person_id,
            ancestors: 10,
            siblings: 1,
            fields: "Derived.LongName,BirthDate,DeathDate,Name",
        }).then(function (data) {
            console.log(data)
            // Define an error message for permission denial
            const errorMessage = "Ancestor/Descendant permission denied.";

            // Check if the API response contains the permission error
            if (
                data[0].resultByKey &&
                data[0].resultByKey[person_id] &&
                data[0].resultByKey[person_id].status === errorMessage
            ) {
                // Display the error message in the container
                $("#view-container").html(`
                    <div style="text-align: center;">
                        <h3>Private Profile: ${errorMessage}</h3>
                        <p>
                            Tech Details: The <a href="https://github.com/wikitree/wikitree-api/blob/main/getPeople.md" target="_blank">getPeople()</a> action currently doesn't permit utilizing a private individual as the starting point for generating the tree of ancestors or descendants.
                        </p>
                    </div>
                `);

            } else {
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
                    const eventBirth = {
                        title: `${person.LongName} - Birth`,
                        start: person.BirthDate,
                        url: `https://www.wikitree.com/wiki/${person.Name}`
                    };

                    // Push the event object to the events array
                    allEvents.push(eventBirth);

                    // Check if DeathDate exists and is not "0000-00-00", then create event for death date
                    if (person.DeathDate && person.DeathDate !== '0000-00-00') {
                        const eventDeath = {
                            title: `${person.LongName} - Death`,
                            start: person.DeathDate,
                            url: `https://www.wikitree.com/wiki/${person.Name}`,
                            color: '#000000'
                        };
                        allEvents.push(eventDeath);
                    }
                }

                // Now you have all events in the desired format
                // You can use it here or pass it to another function, etc.
                var currentMonth;
                var currentYear;
                // Initialize FullCalendar inside the .then() block
                $('#view-container').fullCalendar({
                    events: allEvents,
                    eventClick: function (info) {
                        if (info.event.url) {
                            window.open(info.event.url);
                            return false;
                        }
                    },
                    showNonCurrentDates: false,
                    fixedWeekCount: false,
                    aspectRatio: 2,
                    eventTextColor: '#FFFFFF',
                    viewRender: function (view, element) {
                        // Get the current start and end dates being displayed in the current view
                        const startDate = view.start;
                        const endDate = view.end;
                        var currentDate = $('#view-container').fullCalendar('getDate');
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
                        $('#view-container').fullCalendar('removeEvents');

                        // Add the events for the current view to the calendar
                        $('#view-container').fullCalendar('addEventSource', eventsToShow);
                    },
                    customButtons: {
                        printCalendar: {
                            text: 'Print Calendar',
                            click: function () {
                                // Get the calendar container element
                                var calendarContainer = document.getElementById('view-container');

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
                        }
                    },
                    header: {
                        left: 'printCalendar',
                        center: 'title',
                        right: 'today prev,next'
                    }
                });

            }
            $(document).ready(function () {
                $(".fc-day-number").css("font-size", "large");
            });
        });
    }
};
