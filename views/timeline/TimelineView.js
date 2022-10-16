window.TimelineView = class TimelineView extends View {
    meta() {
        return {
            title: "Family Timeline",
            description: `The Timeline view is an interactive visualization chart that allows zooming and panning through
                a family chronology. Click on a person to create a new timeline.`,
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields: "Privacy,IsLiving,BirthDateDecade,DeathDateDecade,Parents,Siblings,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,Name,BirthDate,DeathDate,Children,Spouses,Father,Mother",
        }).then(function (data) {
            // Let's hide our container to start because grouping causes strange animations
            $("#view-container").css("width", "0%");
            var focus = data[0].person;
            var container = document.getElementById(selector.replace("#", ""));
            var list = [];
            var groups = [
                { id: 1, content: "&#8203;" },
                { id: 2, content: "&#8203;" },
                { id: 3, content: "&#8203;" },
                { id: 4, content: "&#8203;" },
            ];

            /* Here we will call each person to process.
             * We start with our focus profile, and move on to Parents,
             * Siblings, Spouses, and then Children if available.
             */
            buildEvents(focus, "", 2);
            if (focus.Parents) {
                var parentIDs = Object.keys(focus.Parents);
                for (var i = 0; i < Object.keys(focus.Parents).length; i++) {
                    if (focus.Parents[parentIDs[i]].BirthDate) {
                        buildEvents(focus.Parents[parentIDs[i]], "Parent", 1);
                    }
                }
            }
            if (focus.Siblings) {
                var siblingIDs = Object.keys(focus.Siblings);
                for (var i = 0; i < Object.keys(focus.Siblings).length; i++) {
                    if (focus.Siblings[siblingIDs[i]].BirthDate) {
                        buildEvents(focus.Siblings[siblingIDs[i]], "Sibling", 2);
                    }
                }
            }
            if (focus.Spouses) {
                var spouseIDs = Object.keys(focus.Spouses);
                for (var i = 0; i < Object.keys(focus.Spouses).length; i++) {
                    if (focus.Spouses[spouseIDs[i]].BirthDate) {
                        buildEvents(focus.Spouses[spouseIDs[i]], "Spouse", 3);
                    }
                }
            }
            if (focus.Children) {
                var childIDs = Object.keys(focus.Children);
                for (var i = 0; i < Object.keys(focus.Children).length; i++) {
                    if (focus.Children[childIDs[i]].BirthDate) {
                        buildEvents(focus.Children[childIDs[i]], "Child", 4);
                    }
                }
            }

            /* This is a function to check dates and decide on markers (start only) and
             * timespans (both start and end). For each person passed to it, we evaluate
             * the dates, build our content labels, and push to the timeline list.
             */
            function buildEvents(x, y, z) {
                if (y == "") {
                    var relation = "";
                    var color = "green";
                } else {
                    var relation = `${y}: `;
                    var color = "blue";
                }

                if (x.Privacy >= 50) {
                    // Person is at least Public. Dates are shown.
                    if (x.IsLiving == 0) {
                        // Person is considered deceased.
                        if (x.BirthDate == "0000-00-00" && x.DeathDate == "0000-00-00") {
                            // Birth and Death both unknown. We could estimate the dates
                            // but let's skip it for now and not display anything.
                        } else if (x.BirthDate != "0000-00-00" && x.DeathDate == "0000-00-00") {
                            // Birth is known, Death is unknown - marker only
                            if (x.BirthDate.split("-")[1] == "00") {
                                // Birth Month and Day not known
                                var birth = `${x.BirthDate.split("-")[0]}-01-01`;
                            } else if (x.BirthDate.split("-")[2] == "00") {
                                // Birth Day is not known
                                var birth = `${x.BirthDate.split("-")[0]}-${x.BirthDate.split("-")[0]}-01`;
                            } else {
                                // Birth Year, Month, and Day are known
                                var birth = x.BirthDate;
                            }
                            list.push({
                                id: x.Name,
                                content: `${relation}${x.ShortName} (b. ${birth.split("-")[0]}; d. unknown)`,
                                start: `${birth}`,
                                className: color,
                                group: z,
                            });
                        } else if (x.BirthDate == "0000-00-00" && x.DeathDate != "0000-00-00") {
                            // Birth is unknown, Death is known - marker only
                            if (x.DeathDate.split("-")[1] == "00") {
                                // Death Month and Day not known
                                var death = `${x.DeathDate.split("-")[0]}-01-01`;
                            } else if (x.DeathDate.split("-")[2] == "00") {
                                // Death Day is not known
                                var death = `${x.DeathDate.split("-")[0]}-${x.DeathDate.split("-")[0]}-01`;
                            } else {
                                //  Death Year, Month, and Day are known
                                var death = x.DeathDate;
                            }
                            list.push({
                                id: x.Name,
                                content: `${relation}${x.ShortName} (b. unknown; d. ${death.split("-")[0]})`,
                                start: `${death}`,
                                className: "red",
                                group: z,
                            });
                        } else {
                            if (x.BirthDate.split("-")[1] == "00") {
                                // Death Month and Day not known
                                var birth = `${x.BirthDate.split("-")[0]}-01-01`;
                            } else if (x.DeathDate.split("-")[2] == "00") {
                                // Death Day is not known
                                var birth = `${x.BirthDate.split("-")[0]}-${x.BirthDate.split("-")[1]}-01`;
                            } else {
                                //  Death Year, Month, and Day are known
                                var birth = x.BirthDate;
                            }
                            if (x.DeathDate.split("-")[1] == "00") {
                                // Death Month and Day not known
                                var death = `${x.DeathDate.split("-")[0]}-01-01`;
                            } else if (x.DeathDate.split("-")[2] == "00") {
                                // Death Day is not known
                                var death = `${x.DeathDate.split("-")[0]}-${x.DeathDate.split("-")[1]}-01`;
                            } else {
                                //  Death Year, Month, and Day are known
                                var death = x.DeathDate;
                            }
                            if (birth == death) {
                                list.push({
                                    id: x.Name,
                                    content: `${relation}${x.ShortName} (b. ${birth.split("-")[0]}; d. ${
                                        death.split("-")[0]
                                    })`,
                                    start: birth,
                                    className: "red",
                                    group: z,
                                });
                            } else {
                                list.push({
                                    id: x.Name,
                                    content: `${relation}${x.ShortName} (b. ${birth.split("-")[0]}; d. ${
                                        death.split("-")[0]
                                    })`,
                                    start: birth,
                                    end: death,
                                    className: color,
                                    group: z,
                                });
                            }
                        }
                    } else {
                        /* Person is alive, DeathDate will be "0000-00-00" and we will
                         * reformat this to be "today" on the timeline to show a full
                         * timespan instead of a simple marker.
                         */
                        var death = new Date().toISOString().split("T")[0];
                        var birth = x.BirthDate;
                        list.push({
                            id: x.Name,
                            content: `${relation}${x.ShortName} (b. ${birth})`,
                            start: birth,
                            end: death,
                            className: color,
                            group: z,
                        });
                    }
                } else {
                    // Person has restricted information. No dates are shown, only decades.
                    if (x.IsLiving == 0) {
                        // Person is private and considered deceased.
                        if (x.BirthDateDecade == "unknown" && x.DeathDateDecade == "unknown") {
                            // Birth and Death both unknown. We could estimate the dates
                            // but let's skip it for now and not display anything.
                        } else if (x.BirthDateDecade != "unknown" && x.DeathDateDecade == "unknown") {
                            // Birth is known, Death is unknown - marker only
                            var birth = parseInt(x.BirthDateDecade.replace("s"));
                            list.push({
                                id: x.Name,
                                content: `${relation}${x.ShortName} (b. ${birth}; d. unknown)`,
                                start: `${birth}-01-01`,
                                className: "red",
                                group: z,
                            });
                        } else if (x.BirthDateDecade == "unknown" && x.DeathDateDecade != "unknown") {
                            // Birth is unknown, Death is known
                            var death = parseInt(x.DeathDateDecade.replace("s"));
                            list.push({
                                id: x.Name,
                                content: `${relation}${x.ShortName} (b. unknown; d. ${death})`,
                                start: `${death}-01-01`,
                                className: "red",
                                group: z,
                            });
                        } else {
                            var birth = x.BirthDate;
                            var death = x.DeathDate;
                            list.push({
                                id: x.Name,
                                content: `${relation}${x.ShortName} (b. ${birth.split("-")[0]}; d. ${
                                    death.split("-")[0]
                                })`,
                                start: birth,
                                end: death,
                                className: color,
                                group: z,
                            });
                        }
                    } else {
                        /* Person is alive, DeathDate will be "0000-00-00" and we will
                         * reformat this to be "today" on the timeline.
                         * BirthDate needs to be checked.
                         */
                        var death = new Date().toISOString().split("T")[0];
                        var birth = x.BirthDate;
                        list.push({
                            id: x.Name,
                            content: `${relation}${x.ShortName} (b. ${birth.split("-")[0]})`,
                            start: birth,
                            end: death,
                            className: color,
                            group: z,
                        });
                    }
                }
            }

            // Setup the Timeline items from our list
            var items = new vis.DataSet(list);
            // Set the general Timeline options
            var options = {
                order: function (a, b) {
                    return b.start - a.start;
                },
                zoomMin: 986399999,
                stack: true,
            };
            // Create the Timeline
            var timeline = new vis.Timeline(container, items, groups, options);
            // Once the timeline is drawn and items grouped, we can reshow our container
            timeline.on("currentTimeTick", function () {
                $("#view-container").css("width", "99.9%");
            });
            timeline.on("select", function (properties) {
                if (properties.items[0] != undefined) {
                    $("#wt-id-text").val(properties.items[0]);
                    $("#show-btn").click();
                }
            });
        });
    }
};
