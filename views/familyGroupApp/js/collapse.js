export class Collapse {
    addCollapseButtons() {
        // Add buttons for .personTable
        const personTables = document.querySelectorAll(".personTable");
        personTables.forEach((table) => {
            this.createAndAddButton(table, "tr:not(.roleRow)", "table");
        });

        // Add buttons for .researchNotes
        const researchNotesElements = document.querySelectorAll(".researchNotes");
        researchNotesElements.forEach((element) => {
            this.createAndAddButton(element, ".researchNotesContent", "researchNotes");
        });

        // Add buttons for .citationList
        const citationListElements = document.querySelectorAll(".citationList");
        citationListElements.forEach((element) => {
            const $this = $(element);
            if ($this.find("div.citationListContent").text().trim() != "") {
                this.createAndAddButton(element, ".citationListContent", "sources");
            }
        });

        // Add section-level collapse buttons
        this.addSectionCollapseButton("#familySheetFormTable", ".personTable", "table", true); // True for table section
        if ($("#notesNotes div.researchNotes").length) {
            this.addSectionCollapseButton("#notes > h2", ".researchNotes", "researchNotes");
        }
        this.addSectionCollapseButton("#sources > h2", ".citationList", "sources");
    }

    addSectionCollapseButton(selector, toggleSelector, aClass, isTableSection = false) {
        const sectionHeader = $(selector);
        if (sectionHeader.length) {
            const button = $("<button>", {
                title: "Collapse or expand all items in this section",
                class: "sectionCollapseButton " + aClass,
            });
            const icon = $("<span>").addClass("triangle");
            button.append(icon);
            button.insertBefore(sectionHeader);

            button.on("click", () => {
                const wasCollapsed = icon.hasClass("rotated");
                const items = $(toggleSelector);

                items.each(function () {
                    const item = $(this);
                    const itemButtonIcon = item.prev(".collapseButton").find(".triangle");
                    const contentToToggle = isTableSection
                        ? item.find("tr:not(.roleRow)")
                        : item.find(".researchNotesContent, .citationListContent");
                    if (wasCollapsed) {
                        contentToToggle.show();
                        itemButtonIcon.removeClass("rotated");
                    } else {
                        contentToToggle.hide();
                        itemButtonIcon.addClass("rotated");
                    }
                });

                icon.toggleClass("rotated");
                this.updateGlobalButtonState();
            });
        }
    }

    addGlobalToggle() {
        const globalButton = $("<button>", {
            title: "Collapse or expand all",
            class: "globalCollapseButton",
        });
        const globalIcon = $("<span>").addClass("triangle");
        globalButton.append(globalIcon);
        $("#familySheetFormTable").before(globalButton);

        globalButton.on("click", () => {
            // Determine the desired state based on the current state of the global button icon
            const shouldCollapse = !globalIcon.hasClass("rotated");
            globalIcon.toggleClass("rotated");

            $(".personTable, .researchNotes, .citationList").each(function () {
                const section = $(this);
                const items = section.find("tr:not(.roleRow), .researchNotesContent, .citationListContent");

                if (shouldCollapse) {
                    items.hide();
                    $(".sectionCollapseButton .triangle").addClass("rotated");
                } else {
                    items.show();
                    $(".sectionCollapseButton .triangle").removeClass("rotated");
                }
            });

            $(".collapseButton").each(function () {
                const buttonIcon = $(this).find(".triangle");
                if (shouldCollapse) {
                    buttonIcon.addClass("rotated");
                } else {
                    buttonIcon.removeClass("rotated");
                }
            });
        });
    }

    createAndAddButton(element, contentSelector, aClass) {
        const $element = $(element);
        // if element is a table and it's empty, don't add a button
        if ($element.is("table") && $element.find("tr").length === 0) {
            return;
        }

        const button = $("<button>");
        const icon = $("<span>").addClass("triangle");
        button.append(icon);
        button.addClass("collapseButton " + aClass);

        if ($element.find(".roleRow").attr("data-role") == "1st Child") {
            button.addClass("firstChild");
        }
        $element.before(button);

        button.on("click", () => {
            icon.toggleClass("rotated");

            const contentToToggle = $element.find(contentSelector);
            contentToToggle.toggle();
            if ($("#showBaptism").prop("checked") == false) {
                $("tr.baptismRow").hide();
            }
            if ($("#showBurial").prop("checked") == false) {
                $("tr.burialRow").hide();
            }
            //            button.text(button.text() === "▼" ? "▶" : "▼");

            // Find the associated section collapse button using the class
            const sectionCollapseButton = $("button.sectionCollapseButton." + aClass);
            this.updateSectionButtonState(sectionCollapseButton, aClass);

            // Update the global button
            this.updateGlobalButtonState();
        });
    }

    updateSectionButtonState(sectionCollapseButton, aClass) {
        const buttons = $(".collapseButton." + aClass);
        const allExpanded =
            buttons.length > 0 &&
            buttons.filter(function () {
                return $(this).find(".triangle").hasClass("rotated");
            }).length === 0;
        const allCollapsed =
            buttons.length > 0 &&
            buttons.filter(function () {
                return !$(this).find(".triangle").hasClass("rotated");
            }).length === 0;

        const icon = sectionCollapseButton.find(".triangle");
        if (allCollapsed) {
            icon.addClass("rotated");
        } else if (allExpanded) {
            icon.removeClass("rotated");
        }
    }

    updateGlobalButtonState() {
        const buttons = $(".sectionCollapseButton");

        const allExpanded =
            buttons.length > 0 &&
            buttons.filter(function () {
                return $(this).find(".triangle").hasClass("rotated");
            }).length === 0;

        const allCollapsed =
            buttons.length > 0 &&
            buttons.filter(function () {
                return !$(this).find(".triangle").hasClass("rotated");
            }).length === 0;

        const globalButtonIcon = $(".globalCollapseButton").find(".triangle");

        if (allCollapsed) {
            globalButtonIcon.addClass("rotated");
        } else if (allExpanded) {
            globalButtonIcon.removeClass("rotated");
        }
    }
}
