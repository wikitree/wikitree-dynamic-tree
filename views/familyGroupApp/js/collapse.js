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
                text: "▼",
                title: "Collapse or expand all items in this section",
                class: "sectionCollapseButton " + aClass,
            });
            button.insertBefore(sectionHeader);

            button.on("click", () => {
                const isCollapsing = button.text() === "▼";
                const tables = $(toggleSelector); // This now selects .personTable

                if (isTableSection) {
                    // Handle the table section
                    tables.each(function () {
                        const table = $(this);
                        const rowsToToggle = table.find("tr:not(.roleRow)");
                        rowsToToggle.toggle(!isCollapsing);

                        const tableButton = table.prev(".collapseButton");
                        tableButton.text(isCollapsing ? "▶" : "▼");
                    });
                } else {
                    // Handle other sections (Research Notes, Citation List)
                    $(toggleSelector).each(function () {
                        const itemContent = $(this).find(".researchNotesContent, .citationListContent");
                        const itemButton = $(this).prev(".collapseButton");

                        itemContent.toggle(!isCollapsing);
                        itemButton.text(isCollapsing ? "▶" : "▼");
                    });
                }

                button.text(isCollapsing ? "▶" : "▼");
                this.updateGlobalButtonState();
            });
        }
    }

    addGlobalToggle() {
        const globalButton = $("<button>", {
            text: "▼",
            title: "Collapse or expand all",
            class: "globalCollapseButton",
        });

        // Append the global button to a suitable location on your page
        $("#familySheetFormTable").before(globalButton);

        globalButton.on("click", () => {
            const isCollapsing = globalButton.text() === "▼";
            const allItems = $(".personTable, .researchNotes, .citationList");
            const allButtons = $(".collapseButton, .sectionCollapseButton");

            if (isCollapsing) {
                allItems.find("tr:not(.roleRow), .researchNotesContent, .citationListContent").hide();
                allButtons.text("▶");
                globalButton.text("▶");
            } else {
                allItems.find("tr, .researchNotesContent, .citationListContent").show();
                allButtons.text("▼");
                globalButton.text("▼");
            }
        });
    }

    createAndAddButton(element, contentSelector, aClass) {
        const $element = $(element);
        // if element is a table and it's empty, don't add a button
        if ($element.is("table") && $element.find("tr").length === 0) {
            return;
        }

        const button = $("<button>").text("▼");
        button.addClass("collapseButton " + aClass);

        if ($element.find(".roleRow").attr("data-role") == "1st Child") {
            button.addClass("firstChild");
        }
        $element.before(button);

        button.on("click", () => {
            const contentToToggle = $element.find(contentSelector);
            contentToToggle.toggle();
            button.text(button.text() === "▼" ? "▶" : "▼");

            // Find the associated section collapse button using the class
            const sectionCollapseButton = $("button.sectionCollapseButton." + aClass);
            this.updateSectionButtonState(sectionCollapseButton, aClass);

            // Update the global button
            this.updateGlobalButtonState();
        });
    }

    updateSectionButtonState(sectionCollapseButton, aClass) {
        const buttons = $(".collapseButton." + aClass);
        const allCollapsed =
            buttons.length > 0 &&
            buttons.filter(function () {
                return $(this).text() === "▼";
            }).length === 0;
        const allExpanded =
            buttons.length > 0 &&
            buttons.filter(function () {
                return $(this).text() === "▶";
            }).length === 0;

        sectionCollapseButton.text(allCollapsed ? "▶" : allExpanded ? "▼" : sectionCollapseButton.text());
    }

    updateGlobalButtonState() {
        const buttons = $(".collapseButton");
        const allCollapsed =
            buttons.length > 0 &&
            buttons.filter(function () {
                return $(this).text() === "▼";
            }).length === 0;
        const allExpanded =
            buttons.length > 0 &&
            buttons.filter(function () {
                return $(this).text() === "▶";
            }).length === 0;

        $(".globalCollapseButton").text(allCollapsed ? "▶" : allExpanded ? "▼" : $(".globalCollapseButton").text());
    }
}
