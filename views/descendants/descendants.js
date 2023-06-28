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
        <button class='small on' id='toggleBios'>Hide Bios</button>
        </div>`).appendTo($(container_selector));
        // Attach click event listener to 'li' elements
        $(container_selector).on("click", "li", function (e) {
            e.stopImmediatePropagation(); // Stop the event from bubbling up to parent 'li' elements
            var $childrenUl = $(this).children("ul");
            if ($childrenUl.children().length == 0 && $(this).children(".load-more").length == 0) {
                return;
            }
            var $arrow = $(this).children(".arrow");
            $childrenUl.toggleClass("expanded");
            $arrow.toggleClass("rotated");
            if ($(this).children(".load-more").length > 0) {
                $(this).children(".load-more").trigger("click");
            }
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
            loadMore(e);
        });
        $(container_selector).on("change", "#generationSelect", function (e) {
            showUpToGeneration();
        });
        $(container_selector).on("click", "#seeUpTo", function (e) {
            showUpToGeneration();
        });
        $(container_selector).on("click", ".moreDetailsEye", function (e) {
            e.stopImmediatePropagation();
            if ($(this).parent().children(".biography").length > 0) {
                $(this).parent().children(".biography").slideToggle();
            } else {
                addBio($(this).data("name"));
            }
        });
        $(container_selector).on("click", ".biography h2:contains('Biography')", function (e) {
            e.stopImmediatePropagation();
            $(this).closest("div.biography").slideUp();
        });
        $(container_selector).on("click", ".biography", function (e) {
            e.stopImmediatePropagation();
        });
        $(container_selector).on("click", "#toggleBios", function (e) {
            e.preventDefault();
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
                $(".biography").slideUp();
                $(this).text("Show Bios");
            } else {
                $(this).addClass("on");
                $(".biography").slideDown();
                $(this).text("Hide Bios");
            }
        });
    }
}

function loadMore(e) {
    e.stopPropagation(); // Prevent the click from triggering the li click event
    const target = $(e.target);
    target.fadeOut();
    const theLI = target.closest("li");
    if (theLI.children(".rotated").length == 0) {
        target.closest("li").trigger("click");
    }
    let person_id = target.parent().data("id");
    let generation = target.parent().children("ul").data("generation");
    fetchDescendants(person_id, generation);
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

const fields = [
    "BirthDate",
    "BirthDateDecade",
    "BirthLocation",
    "DataStatus",
    "DeathDate",
    "DeathDateDecade",
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

async function fetchDescendants(person_id, generation) {
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
            $("#descendants").toggleClass("hide-" + genderToRemove);
            //$("#descendants li." + genderToRemove).toggle();

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
        console.log(currentId, people, currentGeneration);
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
        if (person.BirthDate && !["0000-00-00", "unknown"].includes(person.BirthDate)) {
            birthYear = person.BirthDate.split("-")[0];
        } else if (person.BirthDateDecade && person.BirthDateDecade != "unknown") {
            birthYear = person.BirthDateDecade;
        }
        let deathYear = "";
        if (person.DeathDate && !["0000-00-00", "unknown"].includes(person.DeathDate)) {
            deathYear = person.DeathDate.split("-")[0];
        } else if (person.DeathDateDecade && person.DeathDateDecade != "unknown") {
            deathYear = person.DeathDateDecade;
        }
        const theGender = person.Gender;
        let nameLink = `<a class='profileLink' href="https://www.wikitree.com/wiki/${person.Id}" target='_blank'>${fullName}</a>`;
        if (person.Id < 0) {
            nameLink = `<a class="profileLink">Private</a>`;
        }
        const numberOfChildren = Object.values(people).filter(
            (child) => child.Father == id || child.Mother == id
        ).length;
        const hasUnloadedChildren = person.HasChildren && numberOfChildren === 0;
        const loadMoreButton = hasUnloadedChildren
            ? "<button class='load-more small'><img src='https://www.wikitree.com/images/icons/descendant-link.gif'></button>"
            : "";
        const moreDetailsEye = '<span data-name="' + person.Name + '" class="moreDetailsEye">👁</span>';
        const listItemContent = `${nameLink} ${moreDetailsEye} (${birthYear} ${
            person.BirthLocation || ""
        } – ${deathYear} ${person.DeathLocation || ""}) ${loadMoreButton}`;
        const parent = $("li[data-id='" + person.Father + "'], li[data-id='" + person.Mother + "']");
        let childIndicator = person.HasChildren ? "<span class='arrow'>▶</span>" : "";
        let ulState = "";
        if ($("#generationSelect").val() >= generation) {
            ulState = "expanded";
            if (childIndicator) {
                childIndicator = "<span class='arrow rotated'>▶</span>";
            }
        }
        const newItem = $(
            `<li data-id='${person.Id}' data-birth-year="${birthYear}" data-gender='${person.Gender}' class='${theGender}'>${childIndicator} ${listItemContent}<ul data-generation='${generation}' class='${ulState}'></ul></li>`
        );

        console.log(newItem);

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

async function getMoreDetails(wtid) {
    try {
        const result = await $.ajax({
            url: API_URL,
            type: "POST",
            crossDomain: true,
            xhrFields: {
                withCredentials: true,
            },
            dataType: "json",
            data: {
                action: "getRelatives",
                keys: wtid,
                getSpouses: 1,
                format: "json",
                fields: `${fields.join(",")},Bio`,
                bioFormat: "html",
            },
            success: function (data) {
                console.log(data);
            },
        });
        return result;
    } catch (error) {
        console.error(error);
    }
}

window.gotBios = [];
async function addBio(id) {
    if (!window.gotBios.includes(id)) {
        window.gotBios.push(id);
        const data = await getMoreDetails(id);
        if (!data) {
            return;
        }
        const bioDiv = $("<div class='biography'></div>");
        const person = data?.[0]?.["items"]?.[0]?.person;
        console.log(data);
        console.log(person);
        if (!person) {
            return;
        }
        $('li[data-id="' + person.Id + '"]')
            .children("ul")
            .before(bioDiv);
        bioDiv.append($(person.bioHTML)).addClass("fullBiography");
        let sections = [];
        count = 1;
        if (bioDiv.find("section").length == 0) {
            let aSection = $("<section></section>");
            bioDiv.children().each(function (index, element) {
                if (element.tagName == "H2") {
                    if (
                        $(element).children(
                            ".mw-headline:contains(Biography),.mw-headline:contains(Research),.mw-headline:contains(Sources),.mw-headline:contains(Acknowledg)"
                        ).length ||
                        $(element).text() == "Contents"
                    ) {
                        if (aSection.children().length) {
                            addClassToSection(aSection);
                            sections.push(aSection);
                            aSection = $("<section></section>");
                        }
                    }
                }
                aSection.append(element);
            });
            addClassToSection(aSection);
            sections.push(aSection);
            bioDiv.append(sections);
            bioDiv.find("a:link").each(function () {
                if ($(this).attr("href").match("http") == null) {
                    $(this).attr("href", "https://www.wikitree.com" + $(this).attr("href"));
                }
                $(this).attr("target", "_blank");
            });
            bioDiv.find("img").each(function () {
                if (
                    $(this).attr("src").match("https://www.") == null &&
                    $(this).closest(".bdDatesLocations").length == 0
                ) {
                    $(this).attr("src", "https://www.wikitree.com" + $(this).attr("src"));
                }
            });
            bioDiv.find("a[name]").remove();
        }

        if ($("#toggleBios.on").length == 0) {
            bioDiv.find(".aBiography").addClass("hidden");
        }

        /*
      if ($("#toggleSources.on").length == 0) {
        bioDiv.find(".aSources,sup.reference").addClass("hidden");
      }
      if ($("#toggleResearchNotes.on").length == 0) {
        bioDiv.find(".aResearchNotes").addClass("hidden");
      }
      if ($("#toggleAcknowledgements.on").length == 0) {
        bioDiv.find(".aAcknowledgements").addClass("hidden");
      }
      */

        bioDiv.find("div.status").addClass("hidden");
        bioDiv.find("p:contains( is empty. What can you add?)").remove();
        bioDiv
            .find(
                "i:contains(This is a retired sticker),i:contains(This profile is a collaborative work-in-progress. Can you contribute information or sources)"
            )
            .remove();
        bioDiv.find("div.SMALL").each(function () {
            if ($(this).parent().css("width") == "250px") {
                $(this).parent().addClass("sticker");
                $("#toggleStickers").removeClass("hidden");
            }
        });
        bioDiv.find("a[href$='gif'].external.free").each(function () {
            if (
                $(this)
                    .text()
                    .match(/^http.*gif$/) &&
                !$(this).hasClass("hidden")
            ) {
                let gif = $("<img src='" + $(this).text() + "' class='gif'>");
                $(this).after(gif);
                $(this).addClass("hidden");
            }
        });
        addSpouses(person);
    }
}

function addClassToSection(aSection) {
    if (aSection.find("h2").eq(0).text() == "Contents") {
        aSection.addClass("aContents");
    } else if (aSection.find(".mw-headline:contains(Biography)").length) {
        aSection.addClass("aBiography");
        $("#toggleBioText").show();
    } else if (aSection.find(".mw-headline:contains(Research)").length) {
        aSection.addClass("aResearchNotes");
        $("#toggleResearchNotes").show();
    } else if (aSection.find(".mw-headline:contains(Sources)").length) {
        aSection.addClass("aSources");
    } else if (aSection.find(".mw-headline:contains(Acknowledg)").length) {
        aSection.addClass("aAcknowledgements");
        $("#toggleAcknowledgements").show();
    }
    $("#toggleBios").show();
}

function addSpouses(mPerson) {
    if (mPerson.Spouses) {
        if (mPerson.Spouses.length == undefined) {
            const spouseKeys = Object.keys(mPerson.Spouses);
            spouseKeys.forEach(function (aKey, index) {
                const aSpouse = mPerson.Spouses[aKey];
                const bdDatesTable = $('<dl class="bdDatesLocations"></dl>');
                $("li[data-id='" + mPerson.Id + "']")
                    .children("div.biography")
                    .before(bdDatesTable);
                const aSpouseDates = displayDates(aSpouse);
                const marriageDate = aSpouse.marriage_date.split("-");
                const marriageLocation = aSpouse.marriage_location;
                let marriageDate8 = "";
                if (aSpouse.marriage_date) {
                    marriageDate8 = aSpouse.marriage_date.replaceAll(/\-/g, "");
                }
                let spouseNum = "";
                if (spouseKeys.length > 1) {
                    spouseNum = "spouse_" + parseInt(index + 1);
                }
                let spouseMiddleName = aSpouse.MiddleName;
                if (!spouseMiddleName) {
                    spouseMiddleName = "";
                }
                const thisSpouseInfo = $(
                    "<dt class='marriageDate' data-marriage-date='" +
                        marriageDate8 +
                        "'>" +
                        getDateFormat(marriageDate, 1) +
                        "</dt><dd data-id='" +
                        aSpouse.Id +
                        "' class='spouse " +
                        spouseNum +
                        "'>m. <a data-gender='" +
                        aSpouse.Gender +
                        "' href='https://www.wikitree.com/wiki/" +
                        htmlEntities(aSpouse.Name).replaceAll(/\s/g, "_") +
                        "'>" +
                        (aSpouse.FirstName + " " + spouseMiddleName + " " + aSpouse.LastNameAtBirth).trim() +
                        "</a> " +
                        aSpouseDates +
                        "</dd>"
                );
                let placed = false;
                if (bdDatesTable.find("dt.marriageDate").length) {
                    bdDatesTable.find("dt.marriageDate").each(function () {
                        let thisMD = $(this).data("marriage-date");
                        if (thisMD && thisMD != "0000-00-00") {
                            thisMD = "";
                        } else {
                            thisMD = $(this).data("marriage-date").toString().replaceAll(/\-/g, "");
                        }
                        if (placed == false && parseInt(thisMD) > parseInt(marriageDate8)) {
                            $(this).before(thisSpouseInfo);
                            placed = true;
                        }
                    });
                }
                if (placed == false) {
                    bdDatesTable.append(thisSpouseInfo);
                }
            });
            if (spouseKeys.length > 1) {
                let oChildren = $('li[data-name="' + mPerson.Name + '"]')
                    .children("ol.children")
                    .children("li");
                oChildren.each(function () {
                    let thisChild = $(this);
                    let oChild = window.allPeople[$(this).data("id")];
                    spouseKeys.forEach(function (key, index) {
                        if (window.allPeople[key].Id == oChild.Mother && oChild.Mother != 0) {
                            thisChild.addClass("child_of_spouse_" + parseInt(index + 1));
                        }
                    });
                });
            }
        }
    }
}

function getDateFormat(fbds) {
    // dateFormat is an integer that indicates the level of detail of the date.
    // 0: Day, Month, Year
    // 1: Month, Year
    // 2: Year
    let dateFormat = 0;
    const fullDateFormat = "M j, Y";
    // Get the date from the fbds
    let fbdsDate = "";
    let fbd = "";
    if (fbds[1] != "00" && fbds[2] != "00" && fbds[0] != "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, fbds[2]);
        fbd = fbdsDate.format("j M Y");
        if (dateFormat > 0) {
            fbd = fbdsDate.format(fullDateFormat);
        }
    } else if (fbds[1] != "00" && fbds[2] == "00" && fbds[0] != "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else if (fbds[1] != "00" && fbds[2] == "00") {
        fbdsDate = new Date(fbds[0], parseInt(fbds[1]) - 1, 1);
        fbd = fbdsDate.format("M Y");
        if (dateFormat > 1) {
            fbd = fbdsDate.format("F Y");
        }
    } else {
        fbdsDate = new Date(fbds[0], 0, 1);
        fbd = fbdsDate.format("Y");
    }
    return fbd;
}

function htmlEntities(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function displayDates(fPerson) {
    var birthDateStatus = dateStatus(fPerson["BirthDate"], fPerson["BirthDateDecade"], "BirthDate");
    var deathDateStatus = dateStatus(fPerson["DeathDate"], fPerson["DeathDateDecade"], "DeathDate");

    var birthDate = "";
    var deathDate = "";

    if (birthDateStatus == "unknown") {
        birthDate = "";
    } else if (birthDateStatus == "living") {
        birthDate = "living";
    } else {
        birthDate = birthDateStatus;
    }

    if (deathDateStatus == "unknown") {
        deathDate = "";
    } else if (deathDateStatus == "living") {
        deathDate = "living";
    } else {
        deathDate = deathDateStatus;
    }

    var dates = "(" + birthDate + " - " + deathDate + ")";

    return dates;
}

function dateStatus(date, decade, type) {
    var dateStatus;

    if (date != "" && date != "0000-00-00" && typeof date != "undefined" && date != "unknown") {
        dateStatus = date.split("-")[0];
    } else if (typeof decade != "undefined" && decade != "unknown") {
        dateStatus = decade;
    } else {
        dateStatus = "unknown";
    }

    return dateStatus;
}
