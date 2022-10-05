function getLocationTimeline(f, selector) {
    var list = [];

    var trace = {
        x: [],
        y: [],
        text: [],
        type: 'scatter'
    };

    // Focus Dates & Locations
    if (f.BirthDate.split('-')[0] != '0000') {
        list.push({
            x: f.BirthDate.split('-')[0],
            y: f.BirthLocation,
            text: `Birth of ${f.ShortName}`
        });
    }
    if (f.DeathDate.split('-')[0] != '0000') {
        list.push({
            x: f.DeathDate.split('-')[0],
            y: f.DeathLocation,
            text: `Death of ${f.ShortName}`
        });
    }

    // Children Birth Dates & Locations
    var childrenIDs = Object.keys(f.Children);
    for (var i = 0; i < Object.keys(f.Children).length; i++) {
        if (f.Children[childrenIDs[i]].BirthDate) {
            if (f.Children[childrenIDs[i]].BirthDate.split('-')[0] >= f.BirthDate.split('-')[0]
                && f.Children[childrenIDs[i]].BirthDate.split('-')[0] <= f.DeathDate.split('-')[0]) {
                if (f.Children[childrenIDs[i]].BirthDate.split('-')[0] != '0000') {
                    list.push({
                        x: f.Children[childrenIDs[i]].BirthDate.split('-')[0],
                        y: f.Children[childrenIDs[i]].BirthLocation,
                        text: `Birth of ${f.Children[childrenIDs[i]].ShortName}`
                    });
                }
            }
        }
    }

    // Marriage Dates & Locations
    var spouseIDs = Object.keys(f.Spouses);
    for (var i = 0; i < Object.keys(f.Spouses).length; i++) {
        if (f.Spouses[spouseIDs[i]].marriage_date) {
            if (f.Spouses[spouseIDs[i]].marriage_date.split('-')[0] != '0000') {
                list.push({
                    x: f.Spouses[spouseIDs[i]].marriage_date.split('-')[0],
                    y: f.Spouses[spouseIDs[i]].marriage_location,
                    text: `Marriage to ${f.Spouses[spouseIDs[i]].ShortName}`
                });
            }
        }
    }

    // Sort our list by dates
    list.sort(function (a, b) {
        return ((b.x < a.x) ? -1 : ((b.x == a.x) ? 0 : 1));
    });

    for (var i = 0; i < list.length; i++) {
        trace.x.push(list[i].x);
        trace.y.push(list[i].y);
        trace.text.push(list[i].text);
    }

    // Build the Line Graph
    var chrono = [trace]; // allows us to add additional traces
    var options = {
        showlegend: false,
        xaxis: {
            autotick: true
        },
        yaxis: {
            automargin: true,
        }
    };
    var config = { displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['toggleSpikelines', 'hoverClosestCartesian', 'hoverCompareCartesian', 'toggleHover', 'lasso2d', 'select2d'] }
    Plotly.newPlot(selector, chrono, options, config);
}
