function getChronology(f, selector) {
    var container = document.getElementById(selector);
    var list = [];

    // Focus
    if (f.DeathDate.split('-')[0] != '0000') {
        list.push({
            id: f.Name,
            content: `<b>${f.ShortName}</b>`,
            start: checkBirth(f.BirthDate),
            end: checkDeath(f.DeathDate)
        });
    } else {
        list.push({
            id: f.Name,
            content: `<b>${f.ShortName}</b>`,
            start: checkBirth(f.BirthDate),
            end: new Date().toISOString().split('T')[0]
        });
    }

    // Parents
    var parentIDs = Object.keys(f.Parents);
    for (var i = 0; i < Object.keys(f.Parents).length; i++) {
        if (f.Parents[parentIDs[i]].DeathDate) {
            if (f.Parents[parentIDs[i]].DeathDate.split('-')[0] != '0000') {
                list.push({
                    id: f.Parents[parentIDs[i]].Name,
                    content: `<b>Parent:</b> ${f.Parents[parentIDs[i]].ShortName} <i>(${f.Parents[parentIDs[i]].Name})</i>`,
                    start: checkBirth(f.Parents[parentIDs[i]].BirthDate),
                    end: checkDeath(f.Parents[parentIDs[i]].DeathDate)
                });
            } else {
                list.push({
                    id: f.Parents[parentIDs[i]].Name,
                    content: `<b>Parent:</b> ${f.Parents[parentIDs[i]].ShortName} <i>(${f.Parents[parentIDs[i]].Name})</i>`,
                    start: checkBirth(f.Parents[parentIDs[i]].BirthDate),
                    end: new Date().toISOString().split('T')[0]
                });
            }
        }
    }

    // Spouses
    var spouseIDs = Object.keys(f.Spouses);
    for (var i = 0; i < Object.keys(f.Spouses).length; i++) {
        if (f.Spouses[spouseIDs[i]].DeathDate) {
            if (f.Spouses[spouseIDs[i]].DeathDate.split('-')[0] != '0000') {
                list.push({
                    id: f.Spouses[spouseIDs[i]].Name,
                    content: `<b>Spouse:</b> ${f.Spouses[spouseIDs[i]].ShortName} <i>(${f.Spouses[spouseIDs[i]].Name})</i>`,
                    start: checkBirth(f.Spouses[spouseIDs[i]].BirthDate),
                    end: checkDeath(f.Spouses[spouseIDs[i]].DeathDate)
                });
            } else {
                list.push({
                    id: f.Spouses[spouseIDs[i]].Name,
                    content: `<b>Spouse:</b> ${f.Spouses[spouseIDs[i]].ShortName} <i>(${f.Spouses[spouseIDs[i]].Name})</i>`,
                    start: checkBirth(f.Spouses[spouseIDs[i]].BirthDate),
                    end: new Date().toISOString().split('T')[0]
                });
            }
        }
    }

    // Siblings
    var siblingIDs = Object.keys(f.Siblings);
    for (var i = 0; i < Object.keys(f.Siblings).length; i++) {
        if (f.Siblings[siblingIDs[i]].DeathDate) {
            if (f.Siblings[siblingIDs[i]].DeathDate.split('-')[0] != '0000') {
                list.push({
                    id: f.Siblings[siblingIDs[i]].Name,
                    content: `<b>Sibling:</b> ${f.Siblings[siblingIDs[i]].ShortName} <i>(${f.Siblings[siblingIDs[i]].Name})</i>`,
                    start: checkBirth(f.Siblings[siblingIDs[i]].BirthDate),
                    end: checkDeath(f.Siblings[siblingIDs[i]].DeathDate)
                });
            } else {
                list.push({
                    id: f.Siblings[siblingIDs[i]].Name,
                    content: `<b>Sibling:</b> ${f.Siblings[siblingIDs[i]].ShortName} <i>(${f.Siblings[siblingIDs[i]].Name})</i>`,
                    start: checkBirth(f.Siblings[siblingIDs[i]].BirthDate),
                    end: new Date().toISOString().split('T')[0]
                });
            }
        }
    }

    // Children
    var childrenIDs = Object.keys(f.Children);
    for (var i = 0; i < Object.keys(f.Children).length; i++) {
        if (f.Children[childrenIDs[i]].DeathDate) {
            if (f.Children[childrenIDs[i]].DeathDate.split('-')[0] != '0000') {
                list.push({
                    id: f.Children[childrenIDs[i]].Name,
                    content: `<b>Child:</b> ${f.Children[childrenIDs[i]].ShortName} <i>(${f.Children[childrenIDs[i]].Name})</i>`,
                    start: checkBirth(f.Children[childrenIDs[i]].BirthDate),
                    end: checkDeath(f.Children[childrenIDs[i]].DeathDate)
                });
            } else {
                list.push({
                    id: f.Children[childrenIDs[i]].Name,
                    content: `<b>Child:</b> ${f.Children[childrenIDs[i]].ShortName} <i>(${f.Children[childrenIDs[i]].Name})</i>`,
                    start: checkBirth(f.Children[childrenIDs[i]].BirthDate),
                    end: new Date().toISOString().split('T')[0]
                });
            }
        }
    }

    // Dates need to be specific.
    function checkBirth(x) {
        // If month and day are not known, assume Jan 1st
        if (x.split('-')[1] == '00' && x.split('-')[2] == '00') {
            return `${x.split('-')[0]}-01-01`
            // If only the day is unknown, assume the 1st
        } else if (x.split('-')[2] == '00') {
            return `${x.split('-')[0]}-${x.split('-')[1]}-01`
        } else {
            return x
        }
    }
    function checkDeath(x) {
        // If month and day are not known, assume Dec 31st
        if (x.split('-')[1] == '00' && x.split('-')[2] == '00') {
            return `${x.split('-')[0]}-12-31`
            // If only the day is unknown, assume the 28th
        } else if (x.split('-')[2] == '00') {
            return `${x.split('-')[0]}-${x.split('-')[1]}-28`
        } else {
            return x
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
}
