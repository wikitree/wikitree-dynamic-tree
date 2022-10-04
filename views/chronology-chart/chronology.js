function getChronology(f, selector) {
    console.log(f);

    var list = [];
    var trace = {
        type: 'bar',
        x: [],
        base: [],
        text: [],
        textposition: 'auto',
        hoverinfo: 'none',
        marker: {
            color: 'rgb(142,198,65)',
            opacity: 0.3,
        }
    };

    // Focus line
    if (f.DeathDate.split('-')[0] != '0000') {
        list.push({
            x: f.DeathDate.split('-')[0] - f.BirthDate.split('-')[0],
            base: f.BirthDate.split('-')[0],
            text: f.ShortName
        });
    } else {
        list.push({
            x: new Date().getFullYear() - f.BirthDate.split('-')[0],
            base: f.BirthDate.split('-')[0],
            text: f.ShortName
        });
    }

    // Children lines
    var childrenIDs = Object.keys(f.Children);
    for (var i = 0; i < Object.keys(f.Children).length; i++) {
        if (f.Children[childrenIDs[i]].DeathDate.split('-')[0] != '0000') {
            if (f.Children[childrenIDs[i]].DeathDate.split('-')[0] - f.Children[childrenIDs[i]].BirthDate.split('-')[0] != 0) {
                list.push({
                    x: f.Children[childrenIDs[i]].DeathDate.split('-')[0] - f.Children[childrenIDs[i]].BirthDate.split('-')[0],
                    base: f.Children[childrenIDs[i]].BirthDate.split('-')[0],
                    text: f.Children[childrenIDs[i]].ShortName
                });
            }
        } else {
            list.push({
                x: new Date().getFullYear() - f.Children[childrenIDs[i]].BirthDate.split('-')[0],
                base: f.Children[childrenIDs[i]].BirthDate.split('-')[0],
                text: f.Children[childrenIDs[i]].ShortName
            });
        }
    }

    // Parent lines
    var parentIDs = Object.keys(f.Parents);
    for (var i = 0; i < Object.keys(f.Parents).length; i++) {
        if (f.Parents[parentIDs[i]].DeathDate.split('-')[0] != '0000') {
            list.push({
                x: f.Parents[parentIDs[i]].DeathDate.split('-')[0] - f.Parents[parentIDs[i]].BirthDate.split('-')[0],
                base: f.Parents[parentIDs[i]].BirthDate.split('-')[0],
                text: f.Parents[parentIDs[i]].ShortName
            });
        } else {
            list.push({
                x: new Date().getFullYear() - f.Parents[parentIDs[i]].BirthDate.split('-')[0],
                base: f.Parents[parentIDs[i]].BirthDate.split('-')[0],
                text: f.Parents[parentIDs[i]].ShortName
            });
        }
    }

    // Spouse lines
    var spouseIDs = Object.keys(f.Spouses);
    for (var i = 0; i < Object.keys(f.Spouses).length; i++) {
        if (f.Spouses[spouseIDs[i]].DeathDate.split('-')[0] != '0000') {
            list.push({
                x: f.Spouses[spouseIDs[i]].DeathDate.split('-')[0] - f.Spouses[spouseIDs[i]].BirthDate.split('-')[0],
                base: f.Spouses[spouseIDs[i]].BirthDate.split('-')[0],
                text: f.Spouses[spouseIDs[i]].ShortName
            });
        } else {
            list.push({
                x: new Date().getFullYear() - f.Spouses[spouseIDs[i]].BirthDate.split('-')[0],
                base: f.Spouses[spouseIDs[i]].BirthDate.split('-')[0],
                text: f.Spouses[spouseIDs[i]].ShortName
            });
        }
    }

    // Spouse lines
    var siblingIDs = Object.keys(f.Siblings);
    for (var i = 0; i < Object.keys(f.Siblings).length; i++) {
        if (f.Siblings[siblingIDs[i]].DeathDate.split('-')[0] != '0000') {
            list.push({
                x: f.Siblings[siblingIDs[i]].DeathDate.split('-')[0] - f.Siblings[siblingIDs[i]].BirthDate.split('-')[0],
                base: f.Siblings[siblingIDs[i]].BirthDate.split('-')[0],
                text: f.Siblings[siblingIDs[i]].ShortName
            });
        } else {
            list.push({
                x: new Date().getFullYear() - f.Siblings[siblingIDs[i]].BirthDate.split('-')[0],
                base: f.Siblings[siblingIDs[i]].BirthDate.split('-')[0],
                text: f.Siblings[siblingIDs[i]].ShortName
            });
        }
    }

    console.log(list)

    // Sort our list by dates
    list.sort(function (a, b) {
        return ((a.base < b.base) ? -1 : ((a.base == b.base) ? 0 : 1));
    });

    for (var i = 0; i < list.length; i++) {
        trace.x.push(list[i].x);
        trace.base.push(list[i].base);
        trace.text.push(list[i].text);
    }
    var chrono = [trace]; // allows us to add additional traces

    Plotly.newPlot(selector, chrono,
        {
            yaxis: {
                autorange: 'reversed',
                showticklabels: false
            }
        },
        {
            displayModeBar: false
        }
    )
}