class DescendantsView extends View {
    meta() {
        return {
            title: "Descendants",
            description: "Show descendants.",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        $(`<div id='descendantsButtons'>
        <button class='small' id='remove'></button>
        <button class='small' id='showHideAll'>Show All</button>
        </div>`).appendTo($(container_selector));
        // Attach click event listener to 'li' elements
        $(container_selector).on("click", "li", function (e) {
            e.stopImmediatePropagation(); // Stop the event from bubbling up to parent 'li' elements
            var $childrenUl = $(this).children("ul");
            var $arrow = $(this).children(".arrow");
            $childrenUl.toggleClass("expanded");
            $arrow.toggleClass("rotated");
        });
        $(container_selector).append(
            $("<img src='https://apps.wikitree.com/apps/beacall6/images/tree.gif' id='shakyTree'>")
        );
        fetchDescendants(person_id);
        $("#shakyTree").show();

        $(document).on("click", ".profileLink", function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.open($(this).attr("href"), "_blank");
        });
        $(container_selector).on("click", ".load-more", function (e) {
            e.stopPropagation(); // Prevent the click from triggering the li click event
            $(this).fadeOut();
            const theLI = $(this).closest("li");
            if (theLI.children(".rotated").length == 0) {
                $(this).closest("li").trigger("click");
            }
            let person_id = $(this).parent().data("id");
            fetchDescendants(person_id);
        });
    }
}

async function fetchDescendants(person_id) {
    const fields = [
        "BirthDate",
        "BirthLocation",
        "DataStatus",
        "DeathDate",
        "DeathLocation",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "Father",
        "FirstName",
        "Gender",
        "HasChildren",
        "Id",
        "LastNameAtBirth",
        "LastNameCurrent",
        "LastNameOther",
        "MiddleName",
        "Mother",
        "Name",
        "Nicknames",
        "Prefix",
        "RealName",
        "Suffix",
    ];
    const people = await WikiTreeAPI.getPeople("test", person_id, fields, {
        descendants: 4,
    });
    console.log(people);
    //log the number of keys in people[2]
    console.log(Object.keys(people[2]).length);
    $("#shakyTree").hide();
    //getLinesOfDescent(person_id, people[2]);
    breadthFirstDescent(person_id, people[2]);
    const rootPerson = people[2][Object.keys(people[1])[0]];
}

function setUpRemoveButton() {
    const rootPersonGender = $("#descendants li:first-child").data("gender");
    if (rootPersonGender) {
        if (rootPersonGender == "Male") {
            $("#remove").text("Hide Females").data("gender", "Female");
        } else if (rootPersonGender == "Female") {
            $("#remove").text("Hide Males").data("gender", "Male");
        }
        $("#descendantsButtons").show();
        $("#remove").on("click", function () {
            var genderToRemove = $(this).data("gender");
            $("#descendants li." + genderToRemove).toggle();

            // Toggle arrow visibility
            $("#descendants li").each(function () {
                var $arrow = $(this).children(".arrow");
                const thisGender = $(this).data("gender");
                const childUL = $(this).children("ul");
                $arrow.hide();
                childUL.children("li").each(function () {
                    if ($(this).hasClass(thisGender)) {
                        $arrow.show();
                    }
                });
            });

            // Toggle button text
            var btn = $(this);
            btn.text() == "Hide Females"
                ? btn.text("Show Females")
                : btn.text() == "Show Females"
                ? btn.text("Hide Females")
                : btn.text() == "Hide Males"
                ? btn.text("Show Males")
                : btn.text("Hide Males");
        });
        $("#showHideAll").on("click", function () {
            var btn = $(this);
            if (btn.text() == "Show All") {
                $("#descendants li ul").addClass("expanded");
                $("#descendants li .arrow").addClass("rotated");
                btn.text("Hide All");
            } else {
                $("#descendants li ul").removeClass("expanded");
                $("#descendants li .arrow").removeClass("rotated");
                btn.text("Show All");
            }
        });

        // Expand the root person's children and rotate the arrow on page load
        $("#descendants > li > ul").addClass("expanded");
        $("#descendants > li > .arrow").addClass("rotated");
    }
}

function breadthFirstDescent(rootId, people) {
    let toProcess = [rootId];
    while (toProcess.length > 0) {
        let currentId = toProcess.shift();
        let person = people[currentId];
        if (person.HasChildren) {
            let children = Object.values(people).filter(
                (child) => child.Father == currentId || child.Mother == currentId
            );
            for (let child of children) {
                toProcess.push(child.Id);
            }
        }
        displayPerson(currentId, people);
    }
}

function displayPerson(id, people) {
    const person = people[id];
    if (!person) {
        return;
    }
    if ($("#descendants").length == 0) {
        $("#view-container").append("<ul id='descendants'></ul>");
    }
    if ($("li[data-id='" + person.Id + "']").length == 0) {
        const personName = new PersonName(person);
        const fullName = personName.withParts(["FullName"]);
        let birthYear = "";
        if (person.BirthDate && person.BirthDate != "0000-00-00") {
            birthYear = person.BirthDate.split("-")[0];
        } else if (person.BirthDateDecade) {
            birthYear = person.BirthDateDecade;
        }
        let deathYear = "";
        if (person.DeathDate && person.DeathDate != "0000-00-00") {
            deathYear = person.DeathDate.split("-")[0];
        } else if (person.DeathDateDecade) {
            deathYear = person.DeathDateDecade;
        }
        const theGender = person.Gender;
        const nameLink = `<a class='profileLink' href='https://www.wikitree.com/wiki/${person.Id}' target='_blank'>${fullName}</a>`;
        // Count the number of children in the current API results
        const numberOfChildren = Object.values(people).filter(
            (child) => child.Father == id || child.Mother == id
        ).length;

        const hasUnloadedChildren = person.HasChildren && numberOfChildren === 0;

        const loadMoreButton = hasUnloadedChildren ? "<button class='load-more small'>More</button>" : "";
        const listItemContent = `${nameLink} (${birthYear} ${person.BirthLocation} - ${deathYear} ${person.DeathLocation}) ${loadMoreButton}`;
        const parent = $("li[data-id='" + person.Father + "'], li[data-id='" + person.Mother + "']");
        const childIndicator = person.HasChildren ? "<span class='arrow'>▶</span>" : "";

        if (parent.length == 0) {
            $("#descendants").append(
                `<li data-id='${person.Id}' data-gender='${person.Gender}' class='${theGender}'>${childIndicator} ${listItemContent}<ul class='collapsed'></ul></li>`
            );
            setUpRemoveButton();
        } else if (parent.children("ul").length == 0) {
            parent.append(
                `<ul><li data-id='${person.Id}' data-gender='${person.Gender}' class='${theGender}'>${childIndicator} ${listItemContent}<ul class='collapsed'></ul></li></ul>`
            );
        } else {
            parent
                .children("ul")
                .append(
                    `<li data-id='${person.Id}' data-gender='${person.Gender}' class='${theGender}'>${childIndicator} ${listItemContent}<ul class='collapsed'></ul></li>`
                );
        }
    }
}
