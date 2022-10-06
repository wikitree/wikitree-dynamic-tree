window.TimelineView = class TimelineView extends View {
    meta() {
        return {
            title: "Timeline",
            description:
                "The Timeline view is an interactive visualization chart that allows zooming and panning through a family's chronology.",
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields: "Parents,Siblings,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,Name,BirthDate,DeathDate,Children,Spouses,Father,Mother",
        }).then(function (data) {
            var focus = data[0].person;
            var container = document.getElementById(selector.replace("#", ""));
            var list = [];
            var parentIDs = Object.keys(focus.Parents);
            var siblingIDs = Object.keys(focus.Siblings);
            var spouseIDs = Object.keys(focus.Spouses);
            var childIDs = Object.keys(focus.Children);

            /* Here we will call each person to process.
             * We start with our focus profile, and move on to
             * Parents, Siblings, Spouses, and then Children
             */
            buildEvents(focus);
            for (var i = 0; i < Object.keys(focus.Parents).length; i++) {
                if (focus.Parents[parentIDs[i]].BirthDate) {
                    buildEvents(focus.Parents[parentIDs[i]]);
                }
            }
            for (var i = 0; i < Object.keys(focus.Siblings).length; i++) {
                if (focus.Siblings[siblingIDs[i]].BirthDate) {
                    buildEvents(focus.Siblings[siblingIDs[i]]);
                }
            }
            for (var i = 0; i < Object.keys(focus.Spouses).length; i++) {
                if (focus.Spouses[spouseIDs[i]].BirthDate) {
                    buildEvents(focus.Spouses[spouseIDs[i]]);
                }
            }
            for (var i = 0; i < Object.keys(focus.Children).length; i++) {
                if (focus.Children[childIDs[i]].BirthDate) {
                    buildEvents(focus.Children[childIDs[i]]);
                }
            }

            /* This is global function to build our markers and timespans. For each
             * person passed to it, we evaluate the dates and build our content labels.
             *
             * WikiTree stores falsy values when no data is entered, so we have to
             * start with date processing and filtering out those automatic falsy values.
             * This could be a lot simpler, but my brain is not working right now...
             */
            function buildEvents(x) {
                if (x.BirthDate.split("-")[0] != "0000") {
                    var bY = x.BirthDate.split("-")[0];
                    if (x.BirthDate.split("-")[1] != "00") {
                        var bM = `-${x.BirthDate.split("-")[1]}`;
                        if (x.BirthDate.split("-")[2] != "00") {
                            var bD = `-${x.BirthDate.split("-")[2]}`;
                        }
                    }
                }

                if (bM == undefined && bD == undefined) {
                    var birth = bY;
                } else if (bD == undefined) {
                    var birth = `${bY}${bM}`;
                } else {
                    var birth = `${bY}${bM}${bD}`;
                }

                if (x.DeathDate.split("-")[0] != "0000") {
                    var dY = x.DeathDate.split("-")[0];
                    if (x.DeathDate.split("-")[1] != "00") {
                        var dM = `-${x.DeathDate.split("-")[1]}`;
                        if (x.DeathDate.split("-")[2] != "00") {
                            var dD = `-${x.DeathDate.split("-")[2]}`;
                        }
                    }
                } else {
                    var dY = new Date().toISOString().split("T")[0];
                }

                if (dM == undefined && dD == undefined) {
                    var death = dY;
                } else if (dD == undefined) {
                    var death = `${dY}${dM}`;
                } else {
                    var death = `${dY}${dM}${dD}`;
                }

                // Check to make sure birth and death were not the same day
                // if they are, we need to add a marker instead of timespan
                if (birth == death) {
                    list.push({
                        id: x.Name,
                        content: `${x.ShortName} <i>(${birth.split("-")[0]}-${death.split("-")[0]})</i>
                            <div>${x.Name}</div>`,
                        start: birth,
                    });
                } else {
                    if (death == new Date().toISOString().split("T")[0]) {
                        var deathLabel = "Living";
                    } else {
                        var deathLabel = death.split("-")[0];
                    }
                    list.push({
                        id: x.Name,
                        content: `${x.ShortName} <i>(${birth.split("-")[0]}-${deathLabel})</i>
                            <div>${x.Name}</div>`,
                        start: birth,
                        end: death,
                    });
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
            };
            // Create the Timeline
            var timeline = new vis.Timeline(container, items, options);
        });
    }
};
