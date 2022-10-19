window.calendarView = class calendarView extends View {
    meta() {
        return {
            title: "Ancestral Calendar",
            description: `The Ancestral Calendar is a categorized listing of events from 10 generations of ancestors, organized by month.`,
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            action: "getPerson",
            key: person_id,
            fields: "Parents,Siblings,Derived.ShortName,FirstName,LastNameAtBirth,LastNameCurrent,Name,BirthDate,DeathDate,Children,Spouses,Father,Mother",
        }).then(function (data) {
            $(selector).append(`<div class="calendar">
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
                "Photo",
                "Name",
            ]).then(function (result) {
                for (var i = 0; i < result.length; i++) {
                    if (getMonth(result[i].BirthDate) != undefined) {
                        $(`#${getMonth(result[i].BirthDate)}`).append(`
                            <p>${result[i].ShortName} born ${result[i].BirthDate}</p>
                        `);
                    }
                    if (getMonth(result[i].DeathDate) != undefined) {
                        $(`#${getMonth(result[i].DeathDate)}`).append(`
                            <p>${result[i].ShortName} died ${result[i].DeathDate}</p>
                        `);
                    }
                }
            });

            function getMonth(date) {
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
                if (date.split("-")[0] != "0000" && date.split("-")[1] != "00") {
                    return months[date.split("-")[1] - 1];
                } else {
                    return undefined;
                }
            }

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
        });
    }
};
