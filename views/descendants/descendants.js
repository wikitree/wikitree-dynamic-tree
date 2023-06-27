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
        <button class='small' id='showHideAll'>Expand All</button>
        <button class='small' id="seeUpTo">Show to Generation:</button>
        <select id="generationSelect"></select>
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
        fetchDescendants(person_id, 1);
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
            let generation = $(this).parent().children("ul").data("generation");
            fetchDescendants(person_id, generation);
        });
        $(container_selector).on("change", "#generationSelect", function (e) {
            showUpToGeneration();
        });
        $(container_selector).on("click", "#seeUpTo", function (e) {
            showUpToGeneration();
        });
    }
}

function showUpToGeneration() {
    // Show all generations up to the selected generation and hide the rest
    var selectedGeneration = $("#generationSelect").val();
    $("#descendants ul").each(function () {
        var generation = $(this).data("generation");
        if (generation <= selectedGeneration) {
            $(this).addClass("expanded");
            $(this).closest("li").children(".arrow").addClass("rotated");
        } else {
            $(this).removeClass("expanded");
            $(this).closest("li").children(".arrow").removeClass("rotated");
        }
    });
}

async function fetchDescendants(person_id, generation) {
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
    breadthFirstDescent(person_id, people[2], generation);
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
            if (btn.text() == "Expand All") {
                $("#descendants li ul").addClass("expanded");
                $("#descendants li .arrow").addClass("rotated");
                btn.text("Collapse All");
            } else {
                $("#descendants li ul").removeClass("expanded");
                $("#descendants li .arrow").removeClass("rotated");
                btn.text("Expand All");
            }
        });

        // Expand the root person's children and rotate the arrow on page load
        $("#descendants > li > ul").addClass("expanded");
        $("#descendants > li > .arrow").addClass("rotated");
    }
}

function breadthFirstDescent(rootId, people, generation) {
    // Add a generation property for each item in the toProcess queue
    let toProcess = [{ id: rootId, generation: generation }];
    while (toProcess.length > 0) {
        let currentItem = toProcess.shift();
        let currentId = currentItem.id;
        let currentGeneration = currentItem.generation;
        let person = people[currentId];
        if (person.HasChildren) {
            let children = Object.values(people).filter(
                (child) => child.Father == currentId || child.Mother == currentId
            );
            for (let child of children) {
                // Add child to the queue with generation increased by 1
                toProcess.push({ id: child.Id, generation: currentGeneration + 1 });
            }
        }
        displayPerson(currentId, people, currentGeneration);
    }
}

function displayPerson(id, people, generation) {
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
        const nameLink = `<a class='profileLink' href="https://www.wikitree.com/wiki/${person.Id}" target='_blank'>${fullName}</a>`;
        const numberOfChildren = Object.values(people).filter(
            (child) => child.Father == id || child.Mother == id
        ).length;
        const hasUnloadedChildren = person.HasChildren && numberOfChildren === 0;
        const loadMoreButton = hasUnloadedChildren ? "<button class='load-more small'>More</button>" : "";
        const listItemContent = `${nameLink} (${birthYear} ${person.BirthLocation} - ${deathYear} ${person.DeathLocation}) ${loadMoreButton}`;
        const parent = $("li[data-id='" + person.Father + "'], li[data-id='" + person.Mother + "']");
        const childIndicator = person.HasChildren ? "<span class='arrow'>▶</span>" : "";
        const newItem = $(
            `<li data-id='${person.Id}' data-birth-year="${birthYear}" data-gender='${person.Gender}' class='${theGender}'>${childIndicator} ${listItemContent}<ul data-generation='${generation}' class='collapsed'></ul></li>`
        );

        if (parent.length == 0) {
            $("#descendants").append(newItem);
            setUpRemoveButton();
        } else if (parent.children("ul").length == 0) {
            parent.append($("<ul></ul>").append(newItem));
        } else {
            let siblings = parent.children("ul").children("li");
            let inserted = false;
            for (let i = 0; i < siblings.length; i++) {
                let siblingBirthYear = $(siblings[i]).data("birth-year");
                siblingBirthYear = siblingBirthYear.toString().endsWith("s")
                    ? parseInt(siblingBirthYear.replace("s", "")) + 5
                    : parseInt(siblingBirthYear);

                let comparisonBirthYear = birthYear.toString().endsWith("s")
                    ? parseInt(birthYear.replace("s", "")) + 5
                    : parseInt(birthYear);

                if (siblingBirthYear > comparisonBirthYear) {
                    newItem.insertBefore(siblings[i]);
                    inserted = true;
                    break;
                }
            }

            if (!inserted) {
                parent.children("ul").append(newItem);
            }
        }
    }
    fillUpToGenerationSelect();
}

function findHighestGeneration() {
    let highestGeneration = 0;
    $("#descendants ul").each(function () {
        let generation = parseInt($(this).attr("data-generation"));
        if (generation > highestGeneration) {
            highestGeneration = generation;
        }
    });
    return highestGeneration - 1;
}

function fillUpToGenerationSelect() {
    const highestGeneration = findHighestGeneration();
    // Fill up to generation select
    // If an option is in the box, don't add it again
    const generationSelect = $("#generationSelect");
    for (let i = 1; i <= highestGeneration; i++) {
        if (generationSelect.find(`option[value='${i}']`).length == 0) {
            generationSelect.append(`<option value='${i}'>${i}</option>`);
        }
    }
    // Remove any that are higher than the highest generation
    generationSelect.find("option").each(function () {
        if (parseInt($(this).val()) > highestGeneration) {
            $(this).remove();
        }
    });
}
