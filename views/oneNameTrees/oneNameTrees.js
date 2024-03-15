import { FamilyTreeStatistics } from "./familytreestatistics.js";
import { categoryMappings } from "./category_mappings.js";

window.OneNameTrees = class OneNameTrees extends View {
    static APP_ID = "ONS";
    static VERBOSE = false;
    constructor(container_selector, person_id) {
        super(container_selector, person_id);
        this.defaultSettings = { periodLength: 50 };
        this.settings = JSON.parse(localStorage.getItem("oneNameTreesSettings")) || this.defaultSettings;
        this.popupZindex = 1000;
        this.cancelling = false;
        this.container = $(container_selector);
        this.personId = person_id;
        this.wtid = $("#wt-id-text").val();
        this.surname = $("#surname").val()
            ? $("#surname").val().replaceAll("_", " ").replace(/\-\d+/, "").trim()
            : this.wtid
            ? this.wtid.replaceAll("_", " ").replace(/\-\d+/, "").trim()
            : "";
        this.header = $("header");
        this.displayedIndividuals = new Set();
        this.displayedSpouses = new Set(); // New set to keep track of displayed spouses
        this.combinedResults = {};
        this.filteredResults = {};
        this.sortedPeople = [];
        this.parentToChildrenMap = {};
        this.peopleById = {};
        this.peopleByIdKeys = [];
        this.familyTreeStats;
        this.monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        this.familyTreeStatistics = {};
        this.locationStats = {};
        this.nameVariants = new Map();
        this.surnameVariants = this.findSurnameVariants(this.surname);
        this.surnames = [];
        this.shakingTree = $(
            `<img src="views/oneNameTrees/images/tree.gif" alt="Shaking Tree" title="Working" id="dancingTree">`
        );
        this.shownCats = new Set();
        this.colours = [
            "forestgreen",
            "#F5A9A9",
            "#D0F5A9",
            "#A9F5F2",
            "#D0A9F5",
            "#F2F5A9",
            "#F78181",
            "#BEF781",
            "#81F7F3",
            "#BE81F7",
            "#F3F781",
            "#FA5858",
            "#ACFA58",
            "#58FAF4",
            "#AC58FA",
            "#F4FA58",
            "#FE2E2E",
            "#9AFE2E",
            "#2EFEF7",
            "#9A2EFE",
            "#F7FE2E",
            "#FF0000",
            "#00FFFF",
            "#80FF00",
            "#8000FF",
            "#FFFF00",
            "#DF0101",
            "#74DF00",
            "#01DFD7",
            "#7401DF",
            "#D7DF01",
            "#B40404",
            "#5FB404",
            "#04B4AE",
            "#5F04B4",
            "#AEB404",
            "#8A0808",
            "#243B0B",
            "#088A85",
            "#4B088A",
            "#868A08",
        ];

        this.headerHTML = `
      <div id="controls">
        <div id="nameLabel" class="controlGroup">Name:
            <input type="text" id="surname" placeholder="Surname" value="${this.surname}" />
            <input type="text" id="location" placeholder="Location (Optional)" />
            <input type="submit" id="submit" name="submit" value="GO" />
        </div>
        <div id="otherControls" class="controlGroup">
            <button id="cancelFetch" title="Cancel the current fetching of profiles.">Cancel</button>
            <button id="addNameVariants" title="See and/or edit variants of names in One Name Studies">Variants</button>
            <button
            id="refreshData"
            title="Each set of results from WikiTree+ is stored in your browser and re-used next time in order to reduce the number of calls to WikiTree+.  Click this to refresh the list of IDs."
            >
            Refresh
            </button>
            <button id="downloadData">Save</button>
            <button id="loadButton" class="custom-file-upload" title="Load a previously saved One Name Trees file">
            Load
            </button>
            <input type="file" id="fileInput" style="display: none" />

            <button id="toggleGeneralStats" title="Show/hide statistics">Statistics</button>
            <button id="sheetButton" title="Download a spreadsheet file">Sheet</button>
            <button id="helpButton" title="About this">?</button>
        </div>

        <div id="tableLabel" class="controlGroup">Table:
            <button id="tableViewButton" title="View the data in a table">Table</button>
        </div>
        <div id="treesButtons" class="controlGroup">Trees:
          <div id="toggleButtons">
            <button class="toggleAll" id="showAll" title="show all descendants">+</button>
            <button class="toggleAll" id="hideAll" title="hide all descendants">−</button>
          </div>
          <button id="toggleDetails" class="off" title="Show/hide birth and death details">Details</button>
          <button id="toggleWTIDs" class="off" title="Show/hide WikiTree IDs">WT IDs</button>
        </div>
        <img src="views/cc7/images/setting-icon.png" id="setting-icon" title="Settings" />
        <div id="loadingBarContainer">
            <div id="loadingBar"></div>
        </div>
        <!-- Placeholder for statistics -->
        <div id="statsDisplay">
          <div id="periodStatisticsContainer" style="display: none"></div>
        </div>
      </div>`;

        this.bodyHTML = `
      <div id="help">
      <h2>About This</h2>
      <button id="closeHelp">×</button>
      <ol>
        <li>Put a surname (and optional location) in the box and hit 'Go'.</li>
        <li>
          The IDs of all public profiles with the surname (as Last Name at Birth, Current Last Name, or Other Name),
          plus any with variants of the surname as entered in the Google Sheet (click 'Variants')*, are fetched from
          WikiTree+**. This list is stored for the next time you enter the same surname. To refresh this list (to get the
          most up-to-date list available on WikiTree+), hit the 'Refresh' button.<br>
          * Alternatively, you can enter a list of surnames separated by commas in the Name box.<br>
          ** Note that WikiTree+ is updated once a week, so new profiles may be missing from the results.
        </li>
        <li>
          The data of all of the profiles is fetched from the WikiTree apps server. This may take a very long time (see
          #8).
        </li>
        <li>
          As all of the IDs returned by WikiTree+ are for open public profiles, if you are logged into the apps server,
          you may be able to retrieve the data of more profiles. A check is made of post-19th century profiles for any
          parents whose data is not among the retrieved data and for children of those at the end of the lines 
          (if they do not have the No Children flag set). If any are found, the data of those profiles is fetched.
        </li>
        <li>
          The people are sorted by birth date. (For profiles with only a death date, the death date is used for
          comparison.)
        </li>
        <li>
          Spouses with a target surname are added as spouses (below the first person's name, with "m." for "married").
        </li>
        <li>
          Offspring are added to offspring lists below their parents, creating many expandable/collapsible descendant
          trees. (The + and − at the top will expand and collapse all lists.)
        </li>
        <li>When there is more than one spouse, coloured left borders will be added to the spouses and the children to 
        show which children belong to which spouse.</li>
        <li>
          As the data can take a long time to load, it's a good idea to hit the 'Save' button. This will save the
          returned data to your desktop in a file. To return to this list in future, click the 'Load' button to load the
          saved file fairly quickly.
        </li>
        <li>
          If a query has over 10,000 results, you'll receive a warning that it could take a long time to load and a
          suggestion to add a location.
        </li>
        <li>If a query has over 40,000 results (too many), you'll be asked to add a location and go again.</li>
        <li>Birth and death details of each person can be seen by clicking their birth and death years.</li>
        <li>Categories and stickers on a profile are shown after the birth and death dates.
          A key to the symbols can be found below (on this About page). One key one to know about it the red badge
          symbol, which represents a One Name Study category/sticker. If it has a green circle around it, it has a
          One Name Study sticker for this page's target surname.</li>
        <li>The numbers in green to the left of the person's name are
          the number of descendants that the person has in this dataset. Click the + button to see their children.</li>
        <li> 
          Click the Statistics button to see statistics about the people in the dataset.
          <ul>
            <li>
              The general statistics:
              <ul id="generalStatsHelp">
                <li><label>Total People</label>: The total number of people in the loaded dataset. The number in parentheses is the number with the target name (or name variant) 
                as last name at birth.</li>
                <li><label>Average Lifespan</label>: The average lifespan of the people in the dataset. 
                Click the button to see a graph.</li>
                <li><label>Average Children per Male over 16</label>: This is per male over 16 
                because the dataset will include their children but not those of many of the women, 
                whose children would tend to take their father's surname 
                (due to this being a name study, mostly based on last name at birth).</li>
                <li><label>Average Children per Couple</label>: This is the average number of children per couple.</li>
                <li><label>Unsourced</label>: The number of profiles without sources. Click the button to see a list of the profiles.</li>
                <li><label>Unconnected</label>: The number of profiles not connected to the big trees. Click the button to see a list of the profiles.</li>
                <li><label>No Connections</label>: The number of profiles with no relations/connections in the WikTree database. Click the button to see a list of the profiles.</li>
                <li><label>Most Common Names</label>: This is the first names in the dataset by frequency. Click the triangle to see the whole list.</li>
                <li><label>Most Common Birth Places</label>: This is the birth places in the dataset by frequency. Click the triangle(s) to see the whole list.  
                Click the numbers to see a table filtered to show only people from those places. Click the button to see an interesting visualisation. 
                On the visualisation, there are buttons to stop/start the automatic 'play'. There are also buttons to step from one period to the next.
                 You can move the location balls around by (clicking and dragging), zoom in and out, and drag the display to see more.</li>
              </ul> 
            </li>
            <li>
              The period statistics:
              <ul>
                <li>show more detail on the people born in that period.</li>
              </ul>
            </li>
            <li>In the Table View, the period buttons will not only show the statistics of the period, but also add 
            the period as a table filter.</li>
            <li>
              The statistics can be dismissed by clicking the 'Statistics' button or double-clicking the statistics
              section.
            </li>
            <li>
              The most common birth places:
              <ul>
                <li>
                  are presented hierarchically according to the commas in the location. If no country is entered in the
                  profile's birth place field, it will appear as though the final part of the location were a country.
                  Some effort has been made to standardise locations for (at the moment) US and UK locations, so
                  profiles with 'Pa' as the country (for example), should be counted in the United States hierarchical
                  figures as Pennsylvania (if the birth date is after the date when Pennsylvania joined the Union).
                </li>
                <li>have count numbers. Clicking these should show the relevant profiles in the table.</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>
          The table:
          <ul>
            <li>can be seen by clicking the 'Table' button or by choosing a place from the 'Birth Place' dropdown list.</li>
            <li>
              has filters in the footer of each column. The filters:
              <ul>
                <li>will work when you hit 'enter' or leave the input box.</li>
                <li>accept negative filters, using a '!' at the start of the filter (e.g. !England).</li>
                <li>
                  work in special ways for date columns:
                  <ul>
                    <li><span class="symbol">-</span> for a range of years (e.g. 1870-1885).</li>
                    <li><span class="symbol">&lt;</span> for before a certain year (e.g. &lt;1776).</li>
                    <li><span class="symbol">&gt;</span> for after a certain year. (e.g. &gt;1776).</li>
                  </ul>
                </li> 
                <li>can be cleared by pressing the Clear Filters button at the top.</li>
              </ul>
            </li>
            <li>can be filtered with the period buttons in the statistics section and the location count numbers.</li>
            <li>can be sorted by clicking on the column headers.</li>
            <li>has a 'Reverse Locations' button to let you order sort people by the last part of their birth 
            place (usually the country).</li>
            <li>has a 'Wide' button to make the table wider (so that the text does not wrap and the table maybe be easier to scan).</li>
            <li>can be dismissed (to return to the Trees view) by clicking the 'Table' button.</li>
          </ul>
        </li>
        <li>
          The Birth Place dropdown lets you filter the table by a location item: a town, state, country, etc. The default
          box shows the number of profiles that include that location part in the birth location. The toggle button next
          to it turns the list alphabetical.
        </li>
        <li>Have I missed anything?</li>
      </ol>
    </div>
    <section id="results"></section>
    <section id="table"></section>`;

        this.settingsBox = $(`<div id="oneNameTreesSettings" class="popup">
            <x>x</x>
            <h2>Settings</h2>
            <div id="settings-content">
                <label for="periodLength">Period Length:</label>
                <input type="number" min="10" max="200" step="5" id="periodLength" title="Period length (in years) for the Statistics" value="${this.settings.periodLength}" />
            </div>
        </div>`);
    }
    init(container_selector, person_id) {
        const view = new window.OneNameTrees(container_selector, person_id);
        view.start();
    }
    start() {
        $("#wt-id-text,#show-btn").prop("disabled", true).css("background-color", "lightgrey");
        // console.log(this.personId);
        $("body").addClass("oneNameTrees");
        if ($("#controls").length == 0) {
            $(this.headerHTML).appendTo($("header"));
        }
        $("#cancelFetch").hide();
        //$("#helpButton").appendTo($("main")).css("float", "right").css("margin", "0.2em");

        if ($("#help").length == 0) {
            $(this.bodyHTML).appendTo($("#view-container"));
        }
        this.shakingTree.hide().appendTo($("body"));
        // Call fetchData to fetch and store data on initial load
        this.fetchData();
        this.addListeners();
        this.documentReady();
        $("#submit").trigger("click");
    }
    meta() {
        return {
            title: "One Name Trees",
            description: `See descendants trees for one surname (and its variants).`,
            docs: "",
        };
    }

    close() {
        this.reset();
        $("#wt-id-text,#show-btn").prop("disabled", false).css("background-color", "white");
        $("#show-btn").css("background-color", "#25422d");
        $("#view-select").off("change.oneNameTrees");
        $("body").removeClass("oneNameTrees");
        $("#controls,#dancingTree").remove();
    }

    addListeners() {
        const $this = this;
        // Event listener for the search button
        this.container.on("click", "#searchButton", function () {
            $this.handleSearch();
        });

        // Also allow searching by pressing the enter key in the search input
        this.container.on("keyup", "#searchInput", function (event) {
            if (event.keyCode === 13) {
                $this.handleSearch();
            }
        });

        // Enter key submits the form
        this.header.on("keyup", "#surname", function (event) {
            const value = $(this).val().toLowerCase();
            // If we have saved data for this surname, show the refresh button
            if (value && localStorage.getItem(`ONTids_${value}`)) {
                $("#refreshData").show();
                // Make the refresh button stand out a little, briefly
                $("#refreshData").fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
            } else {
                $("#refreshData").hide();
            }
            if (event.keyCode === 13) {
                $("#submit").click();
            }
        });

        this.header.on("keyup", "location", function (event) {
            if (event.keyCode === 13 && $("#surname").val()) {
                $("#submit").click();
            }
        });

        this.container.on("click.oneNameTrees", "#results .dates", function () {
            $this.showMoreDetails($(this));
        });

        this.header.on("click.oneNameTrees", "#addNameVariants", function (e) {
            e.preventDefault();
            window.open(
                "https://docs.google.com/spreadsheets/d/1VwYnlDVIw8MH4mKDQeRfJAW_2u2kSHyiGcQUw5yBepw/edit#gid=0",
                "_blank"
            );
        });

        // Event listener for the search button
        this.header.on("click.oneNameTrees", "#searchButton", function () {
            $this.handleSearch();
        });

        // Also allow searching by pressing the enter key in the search input
        this.header.on("keyup.oneNameTrees", "#searchInput", function (event) {
            if (event.keyCode === 13) {
                $this.handleSearch();
            }
        });

        this.header.on("click.oneNameTrees", "#refreshData", async function () {
            const surname = $("#surname").val();
            const location = $("#location").val();
            $("#cancelFetch").trigger("click");
            $("#refreshData").fadeOut();
            if (surname) {
                $this.showLoadingBar();
                $this.shakingTree.show();
                setTimeout(function () {
                    wtViewRegistry.clearStatus();
                    wtViewRegistry.showWarning("Refreshing data...");
                }, 100);
                $this.reset();
                $this.clearONSidsCache(surname); // Clear the cache for this surname
                $this.startTheFetching(surname, location);
            }
        });

        this.container.on(
            "mouseover.oneNameTrees",
            ".person:not(.spouse,.notSpouse,.level_0) > a:first-of-type",
            function () {
                $this.showAncestralLineToRoot($(this));
            }
        );

        this.container.on("mouseout.oneNameTrees", ".person", function () {
            $("#ancestralLinePopup").remove();
        });

        this.header.on("click.oneNameTrees", ".commonLocations .locationCount", function (e) {
            e.preventDefault();
            // e.stopPropagation();
            const location = $(this).data("location") || $(this).attr("data-location");

            let locationParts = [];
            let currentElement = $(this);

            // Include the clicked location itself if it's distinct from its parent's locationPart
            let directLocation = currentElement.data("location");
            let parentLocationPart = currentElement.closest("li").children(".locationPart").text();

            // If the direct location is different from the parent's locationPart, add it; this check prevents immediate duplication
            if (directLocation && directLocation !== parentLocationPart) {
                locationParts.push(directLocation);
            }

            // Traverse upwards from the clicked element to capture the hierarchical locations
            currentElement.parents("li, .country").each(function () {
                let locationPart = $(this).children(".locationPart").first().text();
                if (locationPart && !locationParts.includes(locationPart)) {
                    locationParts.push(locationPart);
                }
            });

            // Reverse the collected parts to order them from the most specific to the most general
            locationParts.reverse();

            // Construct the full location string
            const fullLocation = locationParts.reverse().join(", ");

            if ($("#tableView").length == 0) {
                $this.shakingTree.show();
            }
            setTimeout(function () {
                $this.loadTableWithFilter(fullLocation, "birthPlace");
                // console.log("fullLocation", fullLocation);
            }, 0);
        });

        // Delegate from .commonLocations for .locationPart click events
        this.header.on("click.oneNameTrees", ".commonLocations .locationPart", function (event) {
            //event.stopPropagation(); // Prevent event bubbling
            const $subItem = $(this).closest("li").toggleClass("expanded");
            $subItem.children("ul").toggle(); // Toggle visibility of the nested list
        });

        this.header.on("dblclick.oneNameTrees", "#statisticsContainer,#periodStatisticsContainer", function () {
            $("#toggleGeneralStats").trigger("click");
        });

        $("#downloadData").on("click.oneNameTrees", function () {
            if (Object.keys($this.combinedResults).length > 0) {
                const surname = $("#surname").val();
                const fileName = "ONT_" + surname + "_" + new Date().toISOString().substring(0, 16) + ".json";
                const treeHtml = $("section#results").html(); // Get the HTML of the tree
                $this.downloadResults($this.combinedResults, treeHtml, fileName);
            } else {
                alert("No data to download.");
            }
        });

        this.header.on("change.oneNameTrees", "#fileInput", function (event) {
            const file = event.target.files[0];
            if (file) {
                $this.reset();
                // Extract the surname from the file name
                const fileNameParts = file.name.split("_");
                if (fileNameParts.length > 1) {
                    const surname = fileNameParts[1]; // The second part is the surname
                    $("#surname").val(surname); // Set the surname in the input field
                    $this.setNewTitle(); // Update the title
                }

                // Show the loading bar
                $this.showLoadingBar();

                const reader = new FileReader();
                reader.onload = function (e) {
                    const storageObject = JSON.parse(e.target.result);
                    $this.combinedResults = storageObject.data;
                    const treeHtml = storageObject.html;
                    $("section#results").empty().html(treeHtml); // Load the HTML
                    $this.setupToggleButtons(); // Reinitialize any event listeners

                    $this.displayedIndividuals.clear();
                    $this.displayedSpouses.clear();
                    $this.parentToChildrenMap = {};

                    $this.filterResults();
                    let sortedPeople = $this.sortPeopleByBirthDate($this.filteredResults);
                    $this.parentToChildrenMap = $this.createParentToChildrenMap(sortedPeople);
                    $this.peopleById = $this.createPeopleByIdMap(sortedPeople);
                    $this.displayDescendantsTree($this.peopleById, $this.parentToChildrenMap);
                };

                reader.onprogress = function (e) {
                    if (e.lengthComputable) {
                        const percentage = (e.loaded / e.total) * 100;
                        $this.updateLoadingBar(percentage);
                    }
                };

                reader.readAsText(file);

                $("#tableViewButton").removeClass("on");
            }
        });

        this.header.on("click.oneNameTrees", "#loadButton", function () {
            $("#cancelFetch").trigger("click");
            wtViewRegistry.clearStatus();
            $("#fileInput").click(); // Triggers the hidden file input
        });

        this.header.on("click.oneNameTrees", "#cancelFetch", function () {
            $this.cancelFetch();
        });

        $("#wt-id-text").on("keyup", function (e) {
            // If enter key is pressed, strip the hyphen and number from it,
            // replace underscores with spaces,
            // put the value in the surname box and #submit.
            if (e.keyCode === 13) {
                const wtid = $(this).val();
                const surname = wtid.replaceAll("_", " ").replace(/\-\d+/, "").trim();
                $("#surname").val(surname);
                $("#submit").click();
            }
        });
        $("#show-btn").on("click.oneNameTrees", function () {
            $("#surname").val($("#wt-id-text").val().replaceAll("_", " ").replace(/\-\d+/, "").trim());
            $("#submit").click();
        });
        $("#view-select").on("change.oneNameTrees", function () {
            const view = $(this).val();
            if (view !== "oneNameTrees") {
                $("#wt-id-text,#show-btn").prop("disabled", false).css("background-color", "white");
                $("#show-btn").css("background-color", "#25422d");
            } else {
                $("#wt-id-text,#show-btn").prop("disabled", true).css("background-color", "lightgrey");
            }
        });

        this.container.on("click.oneNameTrees", ".duplicateLink", function (e) {
            e.preventDefault();
            $this.handleSearch($(this).data("wtid"));
        });

        this.header.on("click.oneNameTrees", "label", function () {
            // Determine which graph to toggle based on the clicked label's class
            let graphId;
            if ($(this).closest(".averageLifespan").length > 0) {
                graphId = "#lifespanGraph";
            } else if ($(this).closest(".mostCommonNames").length > 0) {
                graphId = "#namesTable";
            } else if ($(this).closest(".unsourced").length > 0) {
                graphId = "#unsourcedProfiles";
            } else if ($(this).closest(".unconnected").length > 0) {
                graphId = "#unconnectedProfiles";
            } else if ($(this).closest(".noRelations").length > 0) {
                graphId = "#noRelationsProfiles";
            } else if ($(this).closest(".mostCommonLocations").length > 0) {
                graphId = "#locationsVisualisation";
            }

            // Proceed if a matching graphId was found
            if (graphId) {
                const graph = $(graphId);
                graph.toggle();
                if (graph.is(":visible")) {
                    graph.css("display", "inline-block");
                    if (!["#locationsVisualisation", "#namesTable"].includes(graphId)) {
                        graph.css("top", $(this).position().top + $(this).outerHeight() + 20 + "px");
                    }
                    $this.popupZindex++;
                    graph.css("z-index", $this.popupZindex);
                    $(this).addClass("on");
                } else {
                    $(this).removeClass("on");
                }
            }
        });

        // Esc to close the highest (z-index) open popup
        // Add Esc to close family sheet
        $(document).on("keyup.oneNameTrees", function (e) {
            if (e.key === "Escape") {
                // Find the .familySheet with the highest z-index
                let highestZIndex = 0;
                let lastPopup = null;

                $(".popup:visible").each(function () {
                    const zIndex = parseInt($(this).css("z-index"), 10);
                    if (zIndex > highestZIndex) {
                        highestZIndex = zIndex;
                        lastPopup = $(this);
                    }
                });

                if (lastPopup) {
                    closePopup(lastPopup);
                    lastPopup.fadeOut();
                }
            }
        });

        function closePopup(el) {
            el.slideUp();
            const idToLabelMap = {
                lifespanGraph: ".averageLifespan label",
                namesTable: ".mostCommonNames label",
                unsourcedProfiles: ".unsourced label",
                unconnectedProfiles: ".unconnected label",
                noRelationsProfiles: ".noRelations label",
                locationsVisualisation: ".mostCommonLocations label",
            };

            const labelSelector = idToLabelMap[el.prop("id")];
            if (labelSelector) {
                $(labelSelector).removeClass("on");
            }
        }

        $(document).on("click.oneNameTrees", ".popup x", function () {
            closePopup($(this).closest("div"));
        });
        $(document).on("dblclick.oneNameTrees", ".popup", function (e) {
            // If the double-clicked element is not, and is not within, #oneNameTreesSettings, close the popup
            if (!$(e.target).closest("#oneNameTreesSettings").length) {
                closePopup($(this));
            }
        });

        $(document).on("click.oneNameTrees", "#sheetButton", function () {
            $this.exportTableToExcel();
        });

        this.header.on("click.oneNameTrees", "#setting-icon", function () {
            if ($("#oneNameTreesSettings").length == 0) {
                $this.settingsBox.appendTo($("body"));
            }
            // Get position of the settings icon and show the settings box below it.
            const position = $(this).position();
            $this.settingsBox.css("top", position.top + 30 + "px");
            $this.settingsBox.css("left", position.left - 200 + "px");
            $this.settingsBox.fadeToggle();
        });

        this.settingsBox.on("click.oneNameTrees", "x", function () {
            $this.updateSettings();
        });
    }

    updateSettings() {
        // Get all the settings from the settings box and update the settings object.
        // Keys are IDs of the input elements in the settings box.
        // Get all inputs.  Get their IDs and values and update the settings object.
        const $this = this;
        const inputs = this.settingsBox.find("input");
        inputs.each(function () {
            const id = $(this).attr("id");
            const value = $(this).val();
            $this.settings[id] = value;
        });
        localStorage.setItem("oneNameTreesSettings", JSON.stringify(this.settings));
    }

    updateAccessOrder(key) {
        let accessOrder = localStorage.getItem("accessOrder");
        accessOrder = accessOrder ? JSON.parse(accessOrder) : [];

        // Remove the key if it already exists to update its position
        const index = accessOrder.indexOf(key);
        if (index !== -1) {
            accessOrder.splice(index, 1);
        }

        // Push the key to the end to mark it as the most recently used
        accessOrder.push(key);

        // Save the updated access order
        localStorage.setItem("accessOrder", JSON.stringify(accessOrder));
    }

    async fetchData() {
        try {
            const response = await fetch(
                "https://docs.google.com/spreadsheets/d/e/2PACX-1vSL1WDK4-ReqYPjJ3L-ynxwGgAQOLsNdBcI7gKFCxzU3jLd5L_-YiiCz77faR9L362jjVpP-38JjSEa/pub?output=csv"
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const csvData = await response.text();
            this.parseAndStoreCSV(csvData);
        } catch (error) {
            console.error("Error fetching the spreadsheet:", error);
        }
    }

    parseAndStoreCSV(csvData) {
        this.nameVariants = this.parseCSV(csvData);
        this.storeData(this.nameVariants);
        console.log(this.nameVariants);
    }

    parseCSV(csvData) {
        const lines = csvData.split("\n");
        const result = new Map();

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

                if (fields) {
                    const surname = fields[0];
                    const variants = fields[1] ? fields[1].split(",").map((s) => s.trim().replace(/\"/g, "")) : [];
                    const namesArray = [surname.replace(/\"/g, ""), ...variants];

                    namesArray.forEach((name) => {
                        result.set(name, namesArray);
                    });
                }
            }
        }

        return result;
    }

    storeData(data) {
        const objectData = Object.fromEntries(data);
        localStorage.setItem("surnameData", JSON.stringify(objectData));
    }

    retrieveData() {
        const storedData = localStorage.getItem("surnameData");
        return storedData ? new Map(Object.entries(JSON.parse(storedData))) : new Map();
    }

    standardizeString(str) {
        if (!str) {
            return "";
        }
        // Normalize the string to NFD (Normalization Form Decomposition)
        // then replace non-spacing marks (accents) with an empty string
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    getSurnameVariants() {
        const surname = $("#surname").val();
        return this.findSurnameVariants(surname);
    }

    findSurnameVariants(surname) {
        if (!surname) {
            return [];
        }
        if (!this.nameVariants.size) {
            this.nameVariants = this.retrieveData();
        }
        if (surname.includes(",")) {
            this.surnames = surname.split(/,\s*/);
            return this.surnames;
        }
        return this.nameVariants.get(surname) || [surname];
    }

    showLoadingBar() {
        $("#loadingBarContainer").show();
        $("#loadingBar").css("width", "0%");
        $("#loadingBarContainer").css("display", "block");
    }

    updateLoadingBar(percentage) {
        $("#loadingBar").css("width", percentage + "%");
    }

    hideLoadingBar() {
        $("#loadingBarContainer").hide();
    }

    clearONSidsCache(surname) {
        // Construct the key prefix to match
        const prefix = `ONTids_${surname.replace(" ", "_").toLowerCase()}`;

        // Iterate over all keys in localStorage
        for (const key in localStorage) {
            // Check if the key starts with the specified prefix
            if (key.startsWith(prefix)) {
                // Remove the item from localStorage
                localStorage.removeItem(key);
                console.log(`Cleared cached data for key: ${key}`);
            }
        }
    }

    saveWithLRUStrategy(key, value) {
        try {
            // Attempt to save the item
            localStorage.setItem(key, value);
            this.updateAccessOrder(key); // Update access order upon successful save
        } catch (error) {
            if (error.name === "QuotaExceededError") {
                // When storage is full, remove the least recently used item
                let accessOrder = localStorage.getItem("accessOrder");
                accessOrder = accessOrder ? JSON.parse(accessOrder) : [];

                while (accessOrder.length > 0 && error?.name === "QuotaExceededError") {
                    const oldestKey = accessOrder.shift(); // Remove the oldest accessed key
                    localStorage.removeItem(oldestKey); // Remove the oldest item
                    localStorage.setItem("accessOrder", JSON.stringify(accessOrder)); // Update the access order in storage

                    try {
                        localStorage.setItem(key, value); // Try to save again
                        this.updateAccessOrder(key); // Update access order upon successful save
                        error = null; // Clear error if save is successful
                    } catch (e) {
                        error = e; // Update error if still failing
                    }
                }

                if (error) {
                    console.error("Unable to free up enough space in localStorage.");
                }
            } else {
                // Handle other errors
                console.error("Error saving to localStorage:", error);
            }
        }
    }

    activateCancel() {
        $("#cancelFetch").show();
        this.cancelling = false;
    }

    disableCancel() {
        $("#cancelFetch").hide();
        this.cancelling = false;
    }

    cancelFetch() {
        wtViewRegistry.showWarning("Cancelling data retrieval...");
        this.cancelling = true;
        if (this.cancelFetchController) {
            this.cancelFetchController.abort();
        }
        /*
        $("#refreshData").prop("disabled", false);
        $("#loadButton").prop("disabled", false);
        */
    }

    async getONSids(surname, location) {
        wtViewRegistry.clearStatus();
        this.setNewTitle();
        let cacheKey = `ONTids_${surname.replace(" ", "_").toLowerCase()}`;
        if (location) {
            cacheKey += `_${location}`;
        }
        this.activateCancel();

        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            console.log("Returning cached data for ONTids from localStorage");
            $("#refreshData").show();
            return [false, JSON.parse(cachedData)];
        }

        // Fetch all variants for the surname
        let locationBit = "";
        if (location) {
            locationBit = `Location%3D"${location.trim().replace(/,/, "%2C").replace(" ", "+")}"+`;
        }
        let surnameVariants = this.findSurnameVariants(surname);
        if (surname.includes(",")) {
            this.surnames = surname.split(/,\s*/);
            surnameVariants = this.surnames;
            surname = this.surnames[0];
        }
        if (this.surnames) {
            this.surnameVariants = this.surnames;
            surname = this.surnames[0];
        }
        let query = `${locationBit}LastNameatBirth%3D"${surname}"+OR+${locationBit}CurrentLastName%3D"${surname}"+OR+${locationBit}LastNameOther%3D"${surname}"`;
        if (surnameVariants.length != 0) {
            // Construct the query part for each variant
            query = surnameVariants
                .map(
                    (variant) =>
                        `${locationBit}LastNameatBirth%3D"${variant}"+OR+${locationBit}CurrentLastName%3D"${variant}"+OR+${locationBit}LastNameOther%3D"${variant}"`
                )
                .join("+OR+");
        }

        const url = `https://plus.wikitree.com/function/WTWebProfileSearch/Profiles.json?Query=${query}&MaxProfiles=100000&Format=JSON`;
        // console.log(url);
        let data;
        try {
            this.cancelFetchController = new AbortController();
            const response = await fetch(url, { signal: this.cancelFetchController.signal });

            // Check if the response is ok (status in the range 200-299)
            if (!response.ok) {
                // Throw an error with response status and statusText
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }

            data = await response.json();
            console.log("Data fetched from WT+:", data);
            // Handle your data here
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error when fetching from WT+:", error);
                $("#dancingTree").fadeOut();
                wtViewRegistry.showWarning("No response from WikiTree +. Please try again later.");
                return;
            } else {
                // Handle fetch abortion as a special case
                return [true, null];
            }
        }

        // After fetching data, instead of directly using localStorage.setItem, use saveWithLRUStrategy

        try {
            const dataString = JSON.stringify(data); // Ensure data is serialized before saving
            this.saveWithLRUStrategy(cacheKey, dataString);
            console.log("Data saved with LRU strategy");
        } catch (error) {
            console.error("Error saving data with LRU strategy:", error);
        }

        // console.log(data);
        return [false, data];
    }

    numberOfProfiles(resultObj) {
        return !resultObj
            ? 0
            : Array.isArray(resultObj)
            ? resultObj.length
            : typeof resultObj === "object"
            ? Object.keys(resultObj).length
            : 0;
    }

    async getPeopleViaPagedCalls(ids, options = {}) {
        let start = 0;
        let limit = 1000;
        let callNr = 0;
        let profiles = {};
        while (true) {
            callNr += 1;
            if (callNr == 1) {
                console.log(
                    `Calling getPeople with ${ids.length} keys, start:${start}, limit:${limit}, options:`,
                    options
                );
            } else {
                console.log(
                    `Retrieving getPeople result page ${callNr}. ${ids.length} keys, start:${start}, limit:${limit}`,
                    options
                );
            }
            const starttime = performance.now();
            const [aborted, theresMore, people] = await this.getPeople(ids, start, limit, options);
            if (aborted) {
                return [true, 0];
            }
            // console.log("People", people);
            const callTime = performance.now() - starttime;
            const nrProfiles = this.numberOfProfiles(people);
            console.log(`Page ${callNr}: Received ${nrProfiles} profiles (start:${start}) in ${callTime}ms`);
            if (nrProfiles === 0) {
                // An empty result means we've got all the results.
                // Checking for an empty object above, as opposed to an arrya is just belts and braces
                // because we're supposed to get an object, but it seems we get an array if there is nothing
                return [false, profiles];
            }
            if (nrProfiles > 0 && typeof people === "object") {
                const beforeCnt = Object.keys(profiles).length;
                Object.assign(profiles, people);
                const afterCnt = Object.keys(profiles).length;
                console.log(
                    `Page ${callNr}: Collected ${
                        afterCnt - beforeCnt
                    } of ${nrProfiles} new profiles. We now have ${afterCnt}.`
                );
                // return if there is no more data
                if (!theresMore) return [false, profiles];
            } else {
                console.log(`WTF? people=${people}`, people);
            }
            start += limit;
        }
    }

    async getPeople(ids, start = 0, limit = 1000, options = {}) {
        const ancestors = options.ancestors || 0;
        const descendants = options.descendants || 0;
        const fields = [
            "BirthDate",
            "BirthDateDecade",
            "BirthLocation",
            "Categories",
            "Connected",
            "Created",
            "DataStatus",
            "DeathDate",
            "DeathDateDecade",
            "DeathLocation",
            "Derived.BirthName",
            "Derived.BirthNamePrivate",
            "Derived.LongName",
            "Derived.LongNamePrivate",
            "Father",
            "FirstName",
            "Gender",
            "HasChildren",
            "Id",
            //"IsLiving",
            "LastNameAtBirth",
            "LastNameCurrent",
            "LastNameOther",
            "Manager",
            "Managers",
            "MiddleName",
            "Mother",
            "Name",
            "Nicknames",
            "NoChildren",
            "Prefix",
            "Privacy",
            "RealName",
            "ShortName",
            "Spouses",
            "Suffix",
            "Touched",
            "Templates",
        ];
        try {
            this.cancelFetchController = new AbortController();
            const result = await WikiTreeAPI.postToAPI(
                {
                    appId: OneNameTrees.APP_ID,
                    action: "getPeople",
                    keys: ids.join(","),
                    start: start,
                    limit: limit,
                    ancestors: ancestors,
                    descendants: descendants,
                    fields: fields,
                },
                this.cancelFetchController.signal
            );
            const theresMore = result[0].status?.startsWith("Maximum number of profiles");
            return [false, theresMore, result[0].people];
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error in getPeople:", error);
                return [false, false, []]; // Return an empty array in case of error
            } else {
                return [true, false, []];
            }
        }
    }

    filterResults() {
        // Get all variants for the surname
        this.surname = $("#surname").val();
        const surnameVariants = this.findSurnameVariants(this.surname);
        if (surnameVariants.length == 0) {
            // If no variants are found, use the surname as-is
            surnameVariants.push(this.surname);
        }
        console.log("Surname variants:", surnameVariants);
        const $this = this;
        Object.values(this.combinedResults).forEach((person) => {
            //  console.log(person);

            // Standardize the person's surnames for comparison
            const standardizedLastNameAtBirth = $this.standardizeString(person?.LastNameAtBirth) || "";
            const standardizedLastNameCurrent = $this.standardizeString(person?.LastNameCurrent) || "";
            const standardizedLastNameOther = $this.standardizeString(person?.LastNameOther) || "";

            // Check if any standardized surname variants include the standardized person's surnames
            const isMatch = surnameVariants.some(
                (variant) =>
                    $this.standardizeString(variant) === standardizedLastNameAtBirth ||
                    $this.standardizeString(variant) === standardizedLastNameCurrent ||
                    $this.standardizeString(variant) === standardizedLastNameOther
            );

            // console.log("Is match:", isMatch);
            if (isMatch) {
                $this.filteredResults[person.Id] = person;
                // console.log("Added to filtered results:", person);
                // console.log("Filtered results:", filteredResults);
            }
        });
    }

    async processBatches(ids, surname) {
        const $this = this;
        // console.log("All accessible cookies:", document.cookie);

        const userId =
            Cookies.get("wikidb_wtb_UserID") || Cookies.get("loggedInID") || Cookies.get("WikiTreeAPI_userId");
        console.log("Starting processBatches", { userId, idsLength: ids ? ids.length : 0, surname });

        if (!ids || ids.length === 0) {
            console.error("No IDs provided for processing.");
            wtViewRegistry.showWarning("No results found");
            $("#refreshData").prop("disabled", false);
            return;
        }

        function cancelIt() {
            wtViewRegistry.showWarning("Data retrieval cancelled.");
            $this.disableCancel();
            $this.shakingTree.hide();
            // TODO: do whatever other cleanup should be done
            return;
        }

        if ($this.cancelling) {
            cancelIt();
            return;
        }

        this.showLoadingBar();
        this.updateLoadingBar(1); // we've done some work... :)
        let processed = 0;
        let total = ids.length;
        let extendedTotal = total * 1.2;

        const secondCall = new Set();

        const starttime = performance.now();
        for (let i = 0; i < ids.length && !$this.cancelling; i += 1000) {
            const batchIds = ids.slice(i, i + 1000);
            // console.log(`Processing batch ${i / 1000 + 1}: IDs ${i} to ${i + 999}`);
            console.log(`Calling getPeople with ${batchIds.length} keys (of ${ids.length - i} still to fetch)`);
            const callStart = performance.now();
            // We don't do paging calls here because we're not expecting profiles other than the ids we've requested
            // and the API spec says "The initial set of profiles are returned in the results unpaginated by the
            // start/limit values".
            const [aborted, theresmore, people] = await this.getPeople(batchIds);
            const callTime = performance.now() - callStart;
            if (aborted || $this.cancelling) {
                cancelIt();
                return;
            }
            const nrProfiles = this.numberOfProfiles(people);
            console.log(`Received ${nrProfiles} profiles in ${callTime}ms`);
            // console.log("People in batch:", people);
            // Combine the 'people' object with 'combinedResults'
            // console.log("Combined results before:", this.combinedResults);
            //  console.log("length", Object.keys(this.combinedResults).length);
            if (people && typeof people === "object") {
                Object.assign(this.combinedResults, people);
            }
            console.log("Combined results after:", this.combinedResults);
            //  console.log("length", Object.keys(this.combinedResults).length);
            processed += batchIds.length;
            // We arbitrarily regard fetching the intial profiles as 45% of the work,
            // fetching missing parents as a further 45% and port-processing the last 10%
            let percentage = (processed / total) * 45;
            this.updateLoadingBar(percentage);
            // console.log(`Batch processed: ${processed}/${total} (${percentage}%)`);
        }

        console.log("Initial processing complete. Checking for missing parents...");
        // We do the below because the IDs we get from WT+ would be for public profiles only.
        // So here, since the user might be logged in and may have access to some of the
        // private profiles that should be part of the set, we try and collect some of those
        // private profiles via the WT getPeople api.
        const hasMissing = new Set();
        if (userId && !$this.cancelling) {
            Object.values(this.combinedResults).forEach((person) => {
                if (person?.BirthDateDecade?.replace(/s/, "") > 1890) {
                    // console.log(person.Name, " may connect to missing people.");
                    if (person?.Father > 0 && !this.combinedResults[person.Father]) {
                        secondCall.add(person.Father);
                        if (OneNameTrees.VERBOSE) hasMissing.add(person.Name || person.Id);
                    }
                    if (person?.Mother > 0 && !this.combinedResults[person.Mother]) {
                        secondCall.add(person.Mother);
                        if (OneNameTrees.VERBOSE) hasMissing.add(person.Name || person.Id);
                    }
                    // Add possible missing children to the list of missing parents
                    // If NoChildren is not set on a profile, we add that profile to possibleMissingPeople
                    // so we gan get their children.
                    if (!person.NoChildren) {
                        secondCall.add(person.Id);
                        // console.log(person.Name, " may connect to missing people.");
                        if (OneNameTrees.VERBOSE) hasMissing.add(person.Name || person.Id);
                    }
                }
            });
        }
        console.log(`Number of ids to use in retrieving of missing relatives: ${secondCall.size}`);
        if (OneNameTrees.VERBOSE) console.log(`These are the profiles triggering the extra search:`, [...hasMissing]);
        hasMissing.clear();

        // this.hideLoadingBar(); // Reset the loading bar for processing missing parents
        // this.showLoadingBar();
        let processedParents = 0;
        let totalSecondCall = secondCall.size;

        function setDifference(a, b) {
            return new Set([...a].filter((x) => !b.has(x)));
        }
        function setUnion(a, b) {
            return new Set([...a, ...b]);
        }
        function setIntersection(a, b) {
            return new Set([...a].filter((x) => b.has(x)));
        }

        let currentIds = new Set(OneNameTrees.VERBOSE ? Object.keys(this.combinedResults) : []);
        let additionalIds = new Set();
        if (secondCall.size > 0) {
            const secondCallIds = [...secondCall];
            for (let i = 0; i < secondCallIds.length && !$this.cancelling; i += 100) {
                const batchIds = secondCallIds.slice(i, i + 100);
                const [aborted, people] = await this.getPeopleViaPagedCalls(batchIds, {
                    ancestors: 1,
                    descendants: 2,
                });
                if (aborted || $this.cancelling) {
                    cancelIt();
                    return;
                }
                const nrProfiles = this.numberOfProfiles(people);
                if (nrProfiles > 0) {
                    if (OneNameTrees.VERBOSE) {
                        const fetchedIdsSet = new Set(Object.keys(people));
                        const newIds = setDifference(fetchedIdsSet, currentIds);
                        const dups = setIntersection(fetchedIdsSet, currentIds);
                        console.log(`Adding ${newIds.size} new people from ${nrProfiles} received`, [...newIds]);
                        console.log("Duplicates not added", [...dups]);
                        currentIds = setUnion(currentIds, newIds);
                        additionalIds = setUnion(additionalIds, newIds);
                    }
                    // console.log("People in batch:", people);
                    // console.log("Combined results before:", this.combinedResults);
                    Object.assign(this.combinedResults, people);
                }
                processedParents += batchIds.length;
                // We claim fetching missing parents is the 2nd 45% of the work
                let percentage = 45 + (processedParents / totalSecondCall) * 45;
                this.updateLoadingBar(percentage);
                // console.log(`Processed missing parents: ${processedParents}/${totalParents} (${percentage}%)`);
            }
        } else {
            this.updateLoadingBar(90);
        }
        const fetchTime = performance.now() - starttime;

        // this.hideLoadingBar();
        // console.log("Processing complete.");

        const profileCount = Object.keys(this.combinedResults).length;
        console.log(`Fetched profiles count: ${profileCount}`);
        console.log(`Total fetch time: ${fetchTime}ms`);

        // Now 'combinedResults' contains the combined data from all batches
        // console.log(this.combinedResults);
        // If the surname is not LNAB, LNC, or LNO, filter out

        // Get all variants for the surname
        this.surname = $("#surname").val();
        const surnameVariants = this.findSurnameVariants(this.surname);
        if (surnameVariants.length == 0) {
            // If no variants are found, use the surname as-is
            surnameVariants.push(this.surname);
        }
        //  console.log("Surname variants:", surnameVariants);

        if ($this.cancelling) {
            cancelIt();
            return;
        }
        $this.disableCancel();

        this.filterResults();
        const filteredCount = Object.keys($this.filteredResults).length || 0;
        if (OneNameTrees.VERBOSE) {
            const removedNew = setDifference(additionalIds, new Set(Object.keys($this.filteredResults)));
            console.log(
                `Last name filtering removed ${currentIds.size - filteredCount} profiles (${removedNew.size} of ${
                    additionalIds.size
                } additionally retrieved profiles) from ${currentIds.size} leaving ${filteredCount} profiles.`
            );
        } else {
            // console.log("Filtered results:", filteredResults);
            console.log(`Last name filtering left ${filteredCount} profiles.`);
        }

        // After batch processing, update the progress bar for additional steps (the last 10% of the work)
        processed = ids.length;
        this.updateLoadingBar(90 + (processed / extendedTotal) * 10);

        // Sort and map children to parents
        this.sortedPeople = this.sortPeopleByBirthDate(this.filteredResults);
        if (OneNameTrees.VERBOSE) console.log("sortedPeople", this.sortedPeople);
        this.prioritizeTargetName(this.sortedPeople);
        console.log("sortedPeople after prioritizing:", JSON.parse(JSON.stringify(this.sortedPeople)));
        let parentToChildrenMap = this.createParentToChildrenMap(this.sortedPeople);
        console.log("parentToChildrenMap", parentToChildrenMap);
        this.peopleById = this.createPeopleByIdMap(this.sortedPeople);

        // Update progress bar after sorting and mapping
        processed += (extendedTotal - total) * 0.5; // Assuming these take about half of the remaining 20%
        this.updateLoadingBar(90 + (processed / extendedTotal) * 10);

        console.log("People by ID:", this.peopleById);
        this.peopleByIdKeys = Object.keys(this.peopleById);
        this.displayDescendantsTree(this.peopleById, parentToChildrenMap);

        // Update progress bar to complete
        this.updateLoadingBar(100);

        // After processing is complete
        this.hideLoadingBar();

        $("#downloadData").show();

        return;
    }

    prioritizeTargetName(sortedPeople) {
        console.log("in prioritizeTargetName");
        let updatedPeople = [...sortedPeople]; // Clone the array to avoid direct modifications

        for (let i = 0; i < updatedPeople.length; i++) {
            let person = updatedPeople[i];
            let personShouldLog = this.shouldLog(person.Id);

            if (personShouldLog) {
                console.log("Person:", person);
            }

            if (person.Spouses && person.Spouses.length > 0) {
                const spouseIds = person.Spouses.map((spouse) => spouse.Id);

                if (personShouldLog) {
                    console.log("Spouse IDs:", spouseIds);
                }

                spouseIds.forEach((spouseId) => {
                    // Find the spouse in sortedPeople by comparing Id values after type conversion
                    let spouseIndex = sortedPeople.findIndex((p) => String(p.Id) === String(spouseId));

                    if (spouseIndex !== -1) {
                        let spouse = sortedPeople[spouseIndex];
                        let spouseShouldLog = this.shouldLog(spouse.Id);

                        if (personShouldLog || spouseShouldLog) {
                            console.log(`Person: ${person.Id} Spouse: (${spouse.Id})`);
                        }

                        if (this.shouldPrioritize(spouse, person)) {
                            if (personShouldLog || spouseShouldLog) {
                                console.log(`Prioritizing spouse of ${person.Id} (${spouse.Id}) over ${person.Id}`);
                            }

                            spouse.shouldBeRoot = false;
                            // Remove the spouse from their original position in the updated list
                            updatedPeople = updatedPeople.filter((p) => String(p.Id) !== String(spouse.Id));
                            // Recalculate person's index in the updated list
                            let newPersonIndex = updatedPeople.findIndex((p) => String(p.Id) === String(person.Id));
                            // Insert the spouse after the person in the updated list
                            updatedPeople.splice(newPersonIndex + 1, 0, spouse);
                        }
                    }
                });
            }
        }

        this.sortedPeople = updatedPeople; // Update the original array reference if needed

        console.log("sortedPeople after prioritizing:", this.sortedPeople.map((p) => p.Id).join(", "));
    }

    shouldLog(id) {
        return id == 20988918 || id == 20330545;
    }

    shouldPrioritize(spouse, person) {
        // Convert the target surname and its variants into standardized forms for comparison

        const shouldLog = this.shouldLog(spouse.Id) || this.shouldLog(person.Id);
        const standardizedVariants = this.getSurnameVariants().map((variant) => this.standardizeString(variant));

        // Standardize the spouse and person's last names for comparison
        const spouseLNAB = this.standardizeString(spouse.LastNameAtBirth);
        const spouseCurrentLN = this.standardizeString(spouse.LastNameCurrent);
        const personLNAB = this.standardizeString(person.LastNameAtBirth);
        const personCurrentLN = this.standardizeString(person.LastNameCurrent);

        // Check if the person's LNAB is among the target surname or its variants
        const personHasTargetLNAB = standardizedVariants.includes(personLNAB);

        if (shouldLog) {
            console.log("Spouse:", spouse);
            console.log("Person:", person);
            console.log("Standardized Variants:", standardizedVariants);
            console.log("Spouse LNAB:", spouseLNAB);
            console.log("Spouse Current LN:", spouseCurrentLN);
            console.log("Person LNAB:", personLNAB);
            console.log("Person Current LN:", personCurrentLN);
            console.log("Person has target LNAB:", personHasTargetLNAB);
        }

        // Priority is given if the person has the target LNAB directly, and the spouse does not
        if (personHasTargetLNAB && !standardizedVariants.includes(spouseLNAB)) {
            // Further check if spouse's current last name matches the person's to handle cases of marriage where names are changed
            // if (spouseCurrentLN === personLNAB || spouseCurrentLN === personCurrentLN) {
            return true; // Prioritize the person over the spouse
            // }
        }

        // Default to not prioritizing the spouse over the person if conditions are not met
        return false;
    }

    findRootIndividuals(parentToChildrenMap, peopleById) {
        let childIds = new Set();
        Object.values(parentToChildrenMap).forEach((children) => {
            children.forEach((childId) => childIds.add(String(childId)));
        });

        /*
        let rootIndividuals = Object.keys(peopleById).filter((id) => {
            //console.log("Checking individual:", id); // Debugging statement
            return !childIds.has(id);
        });
        */
        let rootIndividuals = Object.keys(peopleById).filter((id) => {
            return !childIds.has(String(id)); // Ensure `id` is treated as a string
        });

        // console.log("Root Individuals:", rootIndividuals); // Debugging statement
        return rootIndividuals;
    }

    displayDates(person) {
        let birthDate = person.BirthDate || person.BirthDateDecade || "";
        birthDate = birthDate.replace(/-.*/g, "");
        if (birthDate == "0000" || birthDate == "unknown") {
            birthDate = "";
        }
        let deathDate = person.DeathDate || person.DeathDateDecade || "";
        deathDate = deathDate.replace(/-.*/g, "");
        if (deathDate == "0000" || deathDate == "unknown") {
            deathDate = "";
        }

        const birthDateStatus = this.getDateStatus(person, "birth", "abbr");
        const deathDateStatus = this.getDateStatus(person, "death", "abbr");

        return `(${birthDateStatus}${birthDate}–${deathDateStatus}${deathDate})`;
    }

    countDescendants(personId, parentToChildrenMap) {
        let count = 0;

        const countRecursive = (currentId) => {
            if (parentToChildrenMap[currentId]) {
                // Now each entry in parentToChildrenMap[currentId] is an object { Id, BirthDate, BirthDateDecade }
                count += parentToChildrenMap[currentId].length; // Increment count by number of children

                parentToChildrenMap[currentId].forEach((child) => {
                    countRecursive(child.Id); // Recursively count grandchildren, etc.
                });
            }
        };

        countRecursive(personId);
        return count;
    }

    personHtml(person, level = 0) {
        const personIdStr = String(person.Id);

        if (!person) {
            return ""; // Skip if undefined or already displayed
        }

        //  || this.displayedIndividuals.has(personIdStr)
        let duplicateLink = "";
        let duplicateClass = "";
        let isDuplicate = false;
        if (this.displayedIndividuals.has(personIdStr)) {
            isDuplicate = true;
            duplicateClass = "duplicate";
            duplicateLink = `<span data-wtid="${person.Name}" class="duplicateLink" title='See ${person?.FirstName} in another tree'>🠉</span>`;
        }

        let descendantsCount = "";
        if (this.parentToChildrenMap[person.Id] && this.parentToChildrenMap[person.Id].length > 0) {
            //const count = this.countDescendants(person.Id, this.parentToChildrenMap);
            const count = this.countDescendants(person.Id, this.parentToChildrenMap);
            descendantsCount = ` <span class="descendantsCount" title="${count} descendants"><span class='descendantsCountText'>[${count}]</span></span>`;
            if (count == 0) {
                descendantsCount = "";
            }
        }

        this.displayedIndividuals.add(personIdStr); // Mark as displayed

        const aName = new PersonName(person);
        const fullName = aName.withParts(["FullName"]);

        if (!fullName) {
            //  console.log("No name found for person:", person);
            return ""; // Skip if no name found
        }

        let toggleButton = "";
        if (this.parentToChildrenMap[person.Id] && this.parentToChildrenMap[person.Id].length > 0) {
            toggleButton = `<button class='toggle-children' data-parent-id='${person.Id}'>−</button> `;
        }
        let gender = person.Gender;
        if (person?.DataStatus?.Gender === "blank" || !gender) {
            gender = "blank";
        }

        const categoryHTML = this.createCategoryHTML(person);
        const dates = this.displayDates(person);

        let html = `<li class='level_${level} person ${duplicateClass}' data-id='${personIdStr}' data-name='${
            person.Name
        }' data-father='${person?.Father}' data-mother='${
            person?.Mother
        }' data-gender='${gender}' data-full-name='${fullName}' data-dates='${dates}'> ${toggleButton}${descendantsCount}<a href="https://www.wikitree.com/wiki/${
            person.Name
        }" target="_blank">${fullName}</a> <span class="wtid">(${
            person.Name || ""
        })</span> ${duplicateLink} <span class='dates'>${dates}</span> ${categoryHTML} `;

        // Add Spouses
        html += this.displaySpouses(person, level);

        html += "</li>";

        return html;
    }

    showAncestralLineToRoot(element) {
        let ancestralLine = [];
        let thisElement = element.closest("li.person");
        while (thisElement.length) {
            let personData = {
                id: thisElement.data("id"),
                fullName: thisElement.data("full-name"),
                dates: thisElement.data("dates"),
                wtid: thisElement.data("wtid"),
                gender: thisElement.data("gender"),
                isTarget: ancestralLine.length === 0, // Mark the first element as the target
            };
            ancestralLine.push(personData);
            thisElement = thisElement.parents("li.person").first(); // Move up to the next ancestor
        }

        ancestralLine.reverse();
        let ancestralLineHtml = $("<ul></ul>").append(
            ancestralLine
                .map(
                    (ancestor, index) =>
                        `<li class='ancestor person ${ancestor.isTarget ? "highlighted" : ""}' data-id='${
                            ancestor.id
                        }' data-name='${ancestor.fullName}' data-wtid='${ancestor.wtid}' data-gender='${
                            ancestor.gender
                        }'>
            ${ancestor.fullName} <span class='dates'>${ancestor.dates}</span> <span class='wtid'>(${
                            ancestor.wtid
                        })</span>
          </li>`
                )
                .join("")
        );

        const ancestralPopup = $("<div id='ancestralLinePopup'></div>").html(ancestralLineHtml);
        $("body").append(ancestralPopup);
        ancestralPopup
            .css({
                top: element.offset().top + element.height() + 5,
                left: element.offset().left,
                position: "absolute",
                backgroundColor: "#fff",
                border: "1px solid #ddd",
                padding: "10px",
                borderRadius: "5px",
                boxShadow: "0 2px 4px rgba(0,0,0,.2)",
            })
            .show();

        ancestralPopup.find(".ancestor").on("click.oneNameTrees", function () {
            handleSearch($(this).data("wtid"));
        });
    }

    createJQueryObjects(tags) {
        return tags.map((html) => $(html)); // Convert each HTML string into a jQuery object
    }

    filterAndPrioritizeCategories(tags) {
        const categoryMap = {};

        tags.forEach(($tag) => {
            const title = $tag.attr("title");
            const isLink = $tag.is("a");
            const current = categoryMap[title];

            if (!current) {
                categoryMap[title] = $tag;
            } else {
                // Prioritize links over spans
                if (isLink && !current.is("a")) {
                    categoryMap[title] = $tag;
                }
                // If both are links, prioritize the more specific one based on URL length
                else if (isLink && current.is("a") && $tag.attr("href").length > current.attr("href").length) {
                    categoryMap[title] = $tag;
                }
                // Additional logic could go here for other prioritization as needed
            }
        });

        // Extract the most specific categories, considering hierarchical relationships
        const titles = Object.keys(categoryMap);
        titles.forEach((title) => {
            titles.forEach((otherTitle) => {
                if (title !== otherTitle && title.includes(otherTitle)) {
                    // If one title includes another, it's more specific; keep the more specific one
                    if (categoryMap[title].toString().length > categoryMap[otherTitle].toString().length) {
                        delete categoryMap[otherTitle];
                    }
                }
            });
        });

        return Object.values(categoryMap).map(($obj) => $obj.prop("outerHTML")); // Convert jQuery objects back to HTML strings
    }

    createCategoryHTML(person) {
        let categoryHTML = ``;
        const tags = [];
        if (person.Categories && person.Categories.length > 0) {
            categoryHTML += this.processNameStudies(person);

            categoryMappings.forEach(({ pattern, symbol, not }) => {
                tags.push(this.processCategories(person, pattern, symbol, { not }));
            });
        }

        // Convert HTML strings to jQuery objects for filtering
        const jqueryTags = this.createJQueryObjects(tags);
        const filteredTags = this.filterAndPrioritizeCategories(jqueryTags);

        if (filteredTags.length > 0) {
            categoryHTML += filteredTags.join("");
        }
        return categoryHTML;
    }

    addCategoryKeyToHelp() {
        let categoryKey = `<div id='categoryKey'><h3>Category and Sticker Key</h3>`;
        categoryMappings.forEach(({ pattern, symbol, not }) => {
            categoryKey += `<div class='categoryKeyItem'><span class="symbol">${symbol}</span> <span>${pattern.source.replace(
                /[\/()]/g,
                ""
            )}</span></div>`;
        });
        categoryKey += `</div>`;
        $("#help").append(categoryKey);
    }

    processNameStudies(person) {
        let html = "";
        const nameStudies = person.Categories.filter((category) => category.match(/Name_Study/));
        if (nameStudies.length > 0) {
            const nameStudiesDone = [];
            const thisSurnameVariants = this.findSurnameVariants($("#surname").val());
            nameStudies.forEach((nameStudy) => {
                const linkEndMatch = nameStudy.match(/[^,_]+_Name_Study/);
                if (linkEndMatch) {
                    const linkEnd = linkEndMatch[0];
                    const isThisStudy = thisSurnameVariants.includes(
                        linkEnd.replace(/^.*,_/, "").replace(/_Name_Study/, "")
                    );
                    const link = `Space:${linkEnd}`;
                    if (!nameStudiesDone.includes(linkEnd)) {
                        nameStudiesDone.push(linkEnd);
                        html += this.createCategoryLink(
                            link,
                            nameStudy,
                            "&#x1F4DB;",
                            isThisStudy ? { class: "thisNameStudy" } : {}
                        );
                    }
                }
            });
        }
        return html;
    }

    processCategories(person, pattern, symbol, options = {}) {
        // Extract the 'name' values from person.Templates
        const templateNames = person.Templates.map((template) => template.name);

        // Combine person.Categories and templateNames into a single array
        const categoriesAndTemplates = person.Categories.concat(templateNames);

        if (categoriesAndTemplates.length > 2 && !this.shownCats.has(person.Id)) {
            // console.log(categoriesAndTemplates);
            this.shownCats.add(person.Id);
        }

        return categoriesAndTemplates
            .filter((category) => {
                // Check if pattern matches the category or template name
                const matchesPattern = pattern?.test(category);

                // Ensure options.not is a RegExp before calling test on it
                const isExcluded = options?.not instanceof RegExp ? options.not.test(category) : false;

                // Include category if it matches pattern and does not match exclusion pattern
                return matchesPattern && !isExcluded;
            })
            .map((category) => {
                // Check if the category is actually a template (sticker) by seeing if it was originally in person.Templates
                const isSticker = templateNames.includes(category);
                // If it's a sticker, return without a link. Otherwise, return with a link.
                if (isSticker) {
                    // For stickers, simply return the symbol or some representation without a link
                    return `<span class='category' title='${category}'>${symbol}</span>`;
                } else {
                    // Categories continue to have links
                    return this.createCategoryLink(`Category:${category}`, category, symbol);
                }
            })
            .join("");
    }

    createCategoryLink(link, category, symbol, options = {}) {
        const theClass = options.class ? ` ${options.class}` : "";
        return `<a href="https://www.wikitree.com/wiki/${link}" target='_blank' class="category${theClass}" title="${category}" data-category="${category}">${symbol}</a>`;
    }

    showMoreDetails(datesElement, showOrHide = "toggle") {
        const theLI = datesElement.closest("li");
        let Id;
        if (datesElement.parent().hasClass("person")) {
            Id = datesElement.parent().data("id");
        } else {
            Id = theLI.data("id");
        }
        if ($(`div.details[data-id='${Id}']`).length > 0) {
            if (showOrHide == "show") {
                $(`div.details[data-id='${Id}']`).show();
            } else if (showOrHide == "hide") {
                $(`div.details[data-id='${Id}']`).hide();
            } else {
                $(`div.details[data-id='${Id}']`).toggle();
            }
            return;
        }

        const person = this.combinedResults[Id];

        const { birth, death } = this.formatBirthDeathDetails(person);

        const detailsHtml = $(`
      <div class='details' data-id='${Id}'>
        <div class='row'>${birth}</div>
        <div class='row'>${death}</div>
      </div>`);
        if (datesElement.parent().hasClass("spouse")) {
            datesElement.parent().append(detailsHtml);
        } else if (theLI.children(".spouse").length > 0) {
            theLI.children(".spouse").first().before(detailsHtml);
        } else {
            datesElement.closest("li").append(detailsHtml);
        }
    }

    getDateStatus(person, event, length = "abbr") {
        let status = "";
        if (event === "birth") {
            if (!person.BirthDate || person.BirthDate === "0000-00-00") {
                return "";
            }
            status = person?.DataStatus?.BirthDate;
        } else if (event === "death") {
            if (!person.DeathDate || person.DeathDate === "0000-00-00") {
                return "";
            }
            status = person?.DataStatus?.DeathDate;
        }
        if (length == "abbr") {
            if (status == "guess") {
                return "abt.";
            } else if (status == "before") {
                return "bef.";
            } else if (status == "after") {
                return "aft.";
            } else {
                return "";
            }
        } else {
            if (status == "guess") {
                return "about";
            } else if (status == "before") {
                return "before";
            } else if (status == "after") {
                return "after";
            } else {
                return "";
            }
        }
    }

    datePreposition(person, event, length = "abbr") {
        let eventDate;
        if (event === "birth") {
            eventDate = person?.BirthDate;
        } else if (event === "death") {
            eventDate = person?.DeathDate;
        }
        const dateStatus = this.getDateStatus(person, "birth", length);
        const inOn = eventDate.match(/\-00$/) ? "in" : "on"; // If only a year is present, use 'in'

        let preposition = inOn;
        if (dateStatus) {
            preposition = dateStatus;
        }
        return preposition;
    }

    formatBirthDeathDetails(person) {
        let birthDetails = "";
        let deathDetails = "";

        // Birth details
        if (person.BirthDate || person.BirthLocation) {
            const birthDate = person.BirthDate ? this.formatDate(person.BirthDate) : "";

            const preposition = this.datePreposition(person, "birth", "full");

            birthDetails = `<span class='birthDetails dataItem'>Born ${
                person.BirthLocation ? `in ${person.BirthLocation}` : ""
            }${birthDate ? ` ${preposition} ${birthDate}` : ""}.</span>`;
        }

        // Death details
        if ((person.DeathDate && person.DeathDate !== "0000-00-00") || person.DeathLocation) {
            const deathDate =
                person.DeathDate && person.DeathDate !== "0000-00-00" ? this.formatDate(person.DeathDate) : "";
            const preposition = this.datePreposition(person, "death", "full");
            deathDetails = `<span class='deathDetails dataItem'>Died ${
                person.DeathLocation ? `in ${person.DeathLocation}` : ""
            }${deathDate ? ` ${preposition} ${deathDate}` : ""}.</span>`;
        }

        return { birth: birthDetails, death: deathDetails };
    }

    formatDate(date) {
        if (!date || date === "0000-00-00") return "[date unknown]";
        let [year, month, day] = date.split("-");
        month = parseInt(month, 10);
        day = parseInt(day, 10);
        let formattedDate = `${year}`;
        if (month > 0) formattedDate = `${this.monthName[month]} ` + formattedDate;
        if (day > 0) formattedDate = `${day} ` + formattedDate;
        return formattedDate;
    }

    displaySpouses(person, level) {
        if (!person.Spouses || !Array.isArray(person.Spouses)) {
            return ""; // Return empty if no spouses
        }

        // Collecting all spouse data
        let spousesData = person.Spouses.map((spouse) => {
            if (this.combinedResults[spouse.Id]) {
                let spouseInfo = this.combinedResults[spouse.Id];
                let married = spouse.MarriageDate || "";
                let marriageDate = married.replace(/-/g, "");
                // Normalize the date for sorting
                if (marriageDate.match(/^\d{4}$/)) {
                    marriageDate += "0000"; // Append for year-only dates
                }
                return { spouseInfo, married, marriageDate };
            }
        }).filter((spouse) => spouse); // Filter out undefined entries

        // Sorting spouses by MarriageDate
        spousesData.sort((a, b) => a.marriageDate.localeCompare(b.marriageDate));

        // Generating HTML for sorted spouses
        let spouseHtml = "";
        spousesData.forEach(({ spouseInfo, married, marriageDate }) => {
            const spouseIdStr = String(spouseInfo.Id);
            if (!this.displayedSpouses.has(spouseIdStr)) {
                //  && !this.displayedIndividuals.has(spouseIdStr)
                this.displayedSpouses.add(spouseIdStr);
                this.displayedIndividuals.add(spouseIdStr);

                let gender = spouseInfo.Gender;
                if (!gender || spouseInfo?.DataStatus?.Gender === "blank") {
                    gender = "blank";
                }

                const spouseName = new PersonName(spouseInfo).withParts(["FullName"]);
                if (married && married !== "0000-00-00") {
                    married = ` (Married: ${married})`;
                } else {
                    married = "";
                }

                // Check if the spouse is already displayed
                let duplicateClass = "";
                let duplicateLink = "";
                if ($(`li.person[data-id='${spouseIdStr}']`).length > 0) {
                    duplicateClass = " duplicate";
                    duplicateLink = `<span data-wtid="${spouseInfo.Name}" class="duplicateLink" title='See ${spouseInfo?.FirstName} in another tree'>🠉</span>`;
                }

                spouseHtml += `<span class='spouse person${duplicateClass}' data-name='${spouseInfo.Name}' data-id='${
                    spouseInfo.Id
                }' data-gender='${gender}' data-marriage-date='${marriageDate}'>m. <a href="https://www.wikitree.com/wiki/${
                    spouseInfo.Name
                }" target="_blank">${spouseName}</a> <span class='wtid'>(${
                    spouseInfo.Name || ""
                })</span>${duplicateLink} <span class='dates'>${this.displayDates(
                    spouseInfo
                )}</span> ${married}</span>`;
            }
        });

        return spouseHtml;
    }

    /*
    createParentToChildrenMap(peopleArray) {
        peopleArray.forEach((person) => {
            if (person.Father) {
                if (!this.parentToChildrenMap[person.Father]) {
                    this.parentToChildrenMap[person.Father] = [];
                }
                this.parentToChildrenMap[person.Father].push(person.Id);
            }
            if (person.Mother) {
                if (!this.parentToChildrenMap[person.Mother]) {
                    this.parentToChildrenMap[person.Mother] = [];
                }
                this.parentToChildrenMap[person.Mother].push(person.Id);
            }
        });
        return this.parentToChildrenMap;
    }
    */

    createParentToChildrenMap(peopleArray) {
        this.parentToChildrenMap = {}; // Assuming initialization elsewhere

        peopleArray.forEach((person) => {
            ["Father", "Mother"].forEach((parentType) => {
                if (person[parentType]) {
                    if (!this.parentToChildrenMap[person[parentType]]) {
                        this.parentToChildrenMap[person[parentType]] = [];
                    }
                    this.parentToChildrenMap[person[parentType]].push({
                        Id: person.Id,
                        BirthDate: person.BirthDate,
                        BirthDateDecade: person.BirthDateDecade,
                    });
                }
            });
        });

        Object.keys(this.parentToChildrenMap).forEach((parent) => {
            this.parentToChildrenMap[parent].sort((a, b) => {
                // Extract year for comparison from BirthDate or BirthDateDecade
                const getYear = (entry) => {
                    if (entry.BirthDate) {
                        return parseInt(entry.BirthDate.substring(0, 4), 10); // Assumes format YYYY-MM-DD
                    } else if (entry.BirthDateDecade) {
                        return parseInt(entry.BirthDateDecade.substring(0, 4), 10); // Assumes format "YYYYs"
                    }
                    return Infinity; // No date info places item at the end
                };

                const yearA = getYear(a);
                const yearB = getYear(b);

                return yearA - yearB;
            });
        });

        return this.parentToChildrenMap;
    }

    createPeopleByIdMap(peopleArray) {
        let map = {};
        peopleArray.forEach((person) => {
            map[person.Id] = person;
        });
        return map;
    }

    naturalSort(a, b) {
        let ax = [],
            bx = [];

        a.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
            ax.push([$1 || Infinity, $2 || ""]);
        });
        b.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
            bx.push([$1 || Infinity, $2 || ""]);
        });

        while (ax.length && bx.length) {
            let an = ax.shift();
            let bn = bx.shift();
            let nn = an[0] - bn[0] || an[1].localeCompare(bn[1]);
            if (nn) return nn;
        }

        return ax.length - bx.length;
    }

    createNameSelectBoxes() {
        const switchButton = $(`<button id="nameSelectsSwitchButton"
        title="Switch between WT ID search and name search">⇆</button>`);
        const nameSelects = $("<div id='nameSelects'></div>").append(switchButton);
        nameSelects.insertBefore($("#toggleDetails"));
        this.createWTIDSelectBox();
        this.createNameSelectBox();
        $("#wtidGo").hide();
        switchButton.on("click.oneNameTrees", () => {
            $("#wtidGo").toggle();
            $("#nameSelect").toggle();
        });
    }

    createWTIDSelectBox() {
        const $this = this;
        $("#wtidGo").off().remove();
        let selectBox = $(`<select id='wtidGo'>`);
        // Add a title dummy option
        selectBox.append(`<option value=''>WT ID</option>`);
        // Get all of the Names (WT IDs) from the array of displayed people, sort them, and add them to the select box
        // displayedIndividuals has the IDs.  We need to get the Names from filteredResults.
        let names = [];
        for (let id of this.displayedIndividuals) {
            const name = this.filteredResults?.[id]?.Name;
            if (name) {
                names.push(name);
            }
        }
        names.sort(this.naturalSort);

        // Filter out "undefined".
        names = names.filter((name) => name);
        for (let name of names) {
            selectBox.append(`<option value='${name}'>${name}</option>`);
        }
        // Add this to #controls (before #helpButton) and set it to work like the search input.
        // This is to replace the searchInput.
        selectBox.prependTo($("#nameSelects"));
        selectBox.change(function () {
            if (this.value) {
                $this.handleSearch(this.value);
            }
        });
    }

    createNameSelectBox() {
        const $this = this;
        $("#nameSelect").off().remove();
        let selectBoxName = $('<select id="nameSelect">');
        selectBoxName.append('<option value="">Person</option>');

        let individuals = [];
        for (let id of this.displayedIndividuals) {
            if (this.filteredResults[id] && this.filteredResults[id].LastNameAtBirth) {
                let person = this.filteredResults[id];
                let dates = this.displayDates(person); // Using displayDates function
                individuals.push({
                    id: id,
                    name: `${person.LastNameAtBirth}, ${person.FirstName || person.RealName} ${
                        person.MiddleName || ""
                    }`.trim(),
                    wtid: person.Name,
                    dates: dates,
                });
            }
        }

        // Sorting by name and then by dates for better organization
        individuals.sort((a, b) => {
            let nameComparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
            if (nameComparison !== 0) return nameComparison;
            return a.dates.localeCompare(b.dates);
        });

        individuals.forEach((individual) => {
            selectBoxName.append(`<option value='${individual.wtid}'>${individual.name} ${individual.dates}</option>`);
        });

        selectBoxName.prependTo($("#nameSelects"));
        selectBoxName.change(function () {
            if (this.value) {
                $this.handleSearch(this.value);
            }
        });
    }

    async displayDescendantsTree(peopleById, parentToChildrenMap) {
        console.log("Displaying descendants tree");

        let totalIndividuals = Object.keys(peopleById).length;
        let processedIndividuals = 0;

        let rootIndividualsIds = this.findRootIndividuals(parentToChildrenMap, peopleById);
        if (OneNameTrees.VERBOSE) console.log("Root individuals IDs:", rootIndividualsIds);
        let rootIndividuals = rootIndividualsIds
            .map((id) => peopleById[id])
            .filter((root) => root.shouldBeRoot !== false)
            .sort((a, b) => this.getComparableDate(a).localeCompare(this.getComparableDate(b)));

        rootIndividuals = this.adjustSortingForDeathDates(rootIndividuals);

        if (OneNameTrees.VERBOSE) console.log("Root individuals:", rootIndividuals);

        let resultsContainer = $("section#results");
        resultsContainer.hide().empty();
        let ulElement = $("<ul>");
        resultsContainer.append(ulElement);

        this.showLoadingBar();

        const batchSize = 50;

        for (let i = 0; i < rootIndividuals.length; i += batchSize) {
            let batch = rootIndividuals.slice(i, i + batchSize);

            for (let root of batch) {
                let rootIdStr = String(root.Id);
                if (!this.displayedIndividuals.has(rootIdStr)) {
                    let liElement = $(this.personHtml(root, 0));
                    ulElement.append(liElement);
                    liElement.append(this.displayChildren(parentToChildrenMap, root.Id, this.peopleById, 1));
                }
            }

            processedIndividuals += batch.length;
            let percentage = (processedIndividuals / totalIndividuals) * 100;
            this.updateLoadingBar(percentage);

            // Yield control back to the browser to update UI
            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        await this.arrangeTreeElements();
        this.setupToggleButtons();

        resultsContainer.fadeIn();

        $(
            "#searchContainer,#toggleDetails,#toggleWTIDs,#toggleGeneralStats,#tableViewButton,#locationSelects,#sheetButton"
        ).show();
        $("#tableLabel,#treesButtons").addClass("visible");

        this.showStatistics();
        this.createNameSelectBoxes();
        this.hideLoadingBar();
        this.shakingTree.hide();
        $("#refreshData").prop("disabled", false);
        $("#loadButton").prop("disabled", false);
        wtViewRegistry.clearStatus();
    }

    async arrangeTreeElements() {
        const allChildrenElements = $("ul.children");
        const totalElements = allChildrenElements.length;
        let processedElements = 0;

        for (const childrenElement of allChildrenElements) {
            const $childrenElement = $(childrenElement);
            const thisParent = $childrenElement.data("parent-id");
            $("li.person[data-id='" + thisParent + "']").append($childrenElement);

            processedElements++;
            let percentage = (processedElements / totalElements) * 100;
            this.updateLoadingBar(percentage);

            if ($childrenElement.parent().hasClass("children")) {
                console.log("Error: Parent not found for children element", $childrenElement);
            }
            // Yield control back to the browser
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        this.identifyChildrensParents();
    }

    identifyChildrensParents() {
        const persons = $("li.person");
        persons.each((index, person) => {
            const $person = $(person); // Wrap the person element in jQuery to ensure it's a jQuery object
            if ($person.children(".spouse").length > 0) {
                const personData = $person.data();
                const personProfile = this.combinedResults[personData.id];
                if (personProfile?.Spouses && personProfile.Spouses.length > 1) {
                    const spouses = personProfile.Spouses;
                    const spouseIds = spouses.map((spouse) => spouse.Id);
                    const spouseElements = $person.children(".spouse");
                    // Add a coloured border-left to the spouse elements and the same coloured border
                    // to their children's elements (in $person.children(".children"))
                    spouseElements.each((index, spouseElement) => {
                        const $spouseElement = $(spouseElement); // Ensure spouseElement is a jQuery object
                        const spouseData = $spouseElement.data();
                        const className = `parent-child-${index}`;
                        const className2 = `parent-child`;
                        $spouseElement.addClass(className).addClass(className2);
                        const childrenElement = $(
                            `li[data-father='${spouseData.id}'],li[data-mother='${spouseData.id}']`
                        );
                        childrenElement.addClass(className).addClass(className2);
                    });
                }
            }
        });
    }

    /*
    displayChildren(parentToChildrenMap, parentId, peopleById, level) {
        let html = "";
        if (parentToChildrenMap[parentId]) {
            // Sort the children of the current parent
            let sortedChildren = parentToChildrenMap[parentId]
                .map((childId) => peopleById[childId])
                //.filter((child) => !this.displayedIndividuals.has(child.Id)) // Filter out already displayed
                .sort((a, b) => this.getComparableDate(a).localeCompare(this.getComparableDate(b)));

            html += `<ul class='children' data-parent-id='${parentId}'>`;
            sortedChildren.forEach((child) => {
                const thisPersonHTML = this.personHtml(child, level);
                html += thisPersonHTML; // Use personHtml for each child
                // Recursively display children of this child, sorted
                if (!thisPersonHTML.includes("duplicate")) {
                    html += this.displayChildren(parentToChildrenMap, child.Id, peopleById, level + 1);
                }
            });
            html += "</ul>";
        }
        return html;
    }
    */

    displayChildren(parentToChildrenMap, parentId, peopleById, level) {
        let html = "";
        if (parentToChildrenMap[parentId]) {
            // Now we map to the full person object using the Id from each child entry in the map
            let sortedChildren = parentToChildrenMap[parentId]
                .map((childEntry) => peopleById[childEntry.Id])
                // Assuming getComparableDate can handle cases where a person might not have a direct BirthDate
                .sort((a, b) => {
                    // Compare using getComparableDate, which needs to handle both BirthDate and BirthDateDecade
                    let dateA = this.getComparableDate(a) || "9999"; // Defaulting to a high value for missing dates
                    let dateB = this.getComparableDate(b) || "9999";
                    return dateA.localeCompare(dateB);
                });

            html += `<ul class='children' data-parent-id='${parentId}'>`;
            sortedChildren.forEach((child) => {
                if (child) {
                    // Ensure child is not undefined
                    const thisPersonHTML = this.personHtml(child, level);
                    html += thisPersonHTML; // Use personHtml for each child
                    // Recursively display children of this child, sorted
                    if (!thisPersonHTML.includes("duplicate")) {
                        html += this.displayChildren(parentToChildrenMap, child.Id, peopleById, level + 1);
                    }
                }
            });
            html += "</ul>";
        }
        return html;
    }

    sortPeopleByBirthDate(peopleObject) {
        let peopleArray = Object.values(peopleObject);

        // Primary Sorting
        peopleArray.sort((a, b) => {
            let dateA = this.getComparableDate(a, "BirthDate");
            let dateB = this.getComparableDate(b, "BirthDate");
            return dateA.localeCompare(dateB);
        });

        // Secondary Sorting (Adjustment)
        for (let i = 0; i < peopleArray.length; i++) {
            if (peopleArray[i].BirthDate === "0000-00-00" && peopleArray[i].BirthDateDecade === "") {
                // This individual is sorted by DeathDate
                let deathDate = this.getComparableDate(peopleArray[i], "DeathDate");
                if (deathDate !== "9999-12-31") {
                    // Check if DeathDate is valid
                    for (let j = i + 1; j < peopleArray.length; j++) {
                        if (this.getComparableDate(peopleArray[j], "BirthDate") > deathDate) {
                            // Move the individual with only DeathDate to a position before the first individual with a later BirthDate
                            peopleArray.splice(j, 0, peopleArray.splice(i, 1)[0]);
                            break;
                        }
                    }
                }
            }
        }

        // Adjust positions of parents without dates
        peopleArray.forEach((person, index) => {
            if (!this.isValidDate(person.BirthDate) && this.parentToChildrenMap[person.Id]) {
                let earliestChildDate = this.findEarliestChildDate(
                    this.parentToChildrenMap[person.Id],
                    this.peopleById
                );
                if (earliestChildDate !== "9999-12-31") {
                    // Move the parent before the earliest child
                    for (let j = 0; j < peopleArray.length; j++) {
                        if (
                            this.getComparableDate(peopleArray[j], "BirthDate") > earliestChildDate ||
                            !peopleArray[j]?.BirthDate
                        ) {
                            peopleArray.splice(j, 0, peopleArray.splice(index, 1)[0]);
                            break;
                        }
                    }
                }
            }
        });

        return peopleArray;
    }

    findEarliestChildDate(childIds, peopleById) {
        return (
            childIds
                .map((childId) => this.getComparableDate(peopleById[childId], "BirthDate"))
                .sort()
                .shift() || "9999-12-31"
        );
    }

    getComparableDate(person, primaryDateType = "BirthDate") {
        // If both BirthDate and DeathDate are unknown, set the lowest priority
        if (
            (person.BirthDate === "0000-00-00" || person.BirthDate === "unknown" || !person.BirthDate) &&
            person.BirthDateDecade === "unknown" &&
            (person.DeathDate === "0000-00-00" || person.DeathDate === "unknown" || !person.DeathDate) &&
            person.DeathDateDecade === "unknown"
        ) {
            return "9999-12-31";
        }

        // Handle DeathDate when BirthDate is unavailable or invalid
        if ((person.BirthDate === "0000-00-00" || person.BirthDateDecade === "unknown") && person.DeathDate) {
            // Convert year-only DeathDates to mid-year (July 2nd)
            if (person.DeathDate.match(/^\d{4}-00-00$/)) {
                return person.DeathDate.substring(0, 4) + "-07-02";
            }
            // Handle valid full DeathDates
            else if (this.isValidDate(person.DeathDate)) {
                return person.DeathDate;
            }
            // Handle decade DeathDates
            else if (person.DeathDateDecade && person.DeathDateDecade.match(/^\d{4}s$/)) {
                return this.transformDecadeToDate(person.DeathDateDecade);
            }
        }

        // Handle valid BirthDates
        if (this.isValidDate(person.BirthDate)) {
            return person.BirthDate;
        }

        // Convert year-only BirthDates to mid-year (July 2nd)
        if (person.BirthDate && person.BirthDate.match(/^\d{4}-00-00$/)) {
            return this.convertYearOnlyDate(person.BirthDate);
        }

        // Handle decades (e.g., "1950s") - mid-point of the decade
        if (person.BirthDateDecade && person.BirthDateDecade.match(/^\d{4}s$/)) {
            return this.transformDecadeToDate(person.BirthDateDecade);
        }

        // Use DeathDate as a fallback for sorting if BirthDate is invalid
        if (this.isValidDate(person.DeathDate)) {
            return this.convertYearOnlyDate(person.DeathDate);
        }
        if (person.DeathDateDecade && person.DeathDateDecade.match(/^\d{4}s$/)) {
            return this.transformDecadeToDate(person.DeathDateDecade);
        }

        // Default for unknown or invalid dates
        return "9999-12-31";
    }

    convertYearOnlyDate(dateString) {
        // Convert year-only dates (e.g., "1565-00-00") to mid-year (July 2nd)
        if (dateString.match(/^\d{4}-00-00$/)) {
            return dateString.substring(0, 4) + "-07-02";
        }
        return dateString;
    }

    isValidDate(dateString) {
        // Check for valid dates, excluding placeholders and dates with '00' for month or day
        return dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !dateString.includes("-00");
    }

    transformDecadeToDate(decade) {
        // Transform "1950s" to "1955-07-02" for comparison
        return decade ? decade.replace(/0s$/, "5") + "-01-01" : "9999-12-31";
    }

    adjustSortingForDeathDates(sortedPeople) {
        let adjustedList = [];
        let onlyDeathDateIndividuals = [];

        // Separate individuals with only death dates
        sortedPeople.forEach((person) => {
            if (
                this.isValidDate(person.DeathDate) &&
                !this.isValidDate(person.BirthDate) &&
                person.BirthDateDecade === ""
            ) {
                onlyDeathDateIndividuals.push(person);
            } else {
                adjustedList.push(person);
            }
        });

        // Sort only-death-date individuals by their death dates
        onlyDeathDateIndividuals.sort((a, b) => a.DeathDate.localeCompare(b.DeathDate));

        // Insert them into the main list at appropriate positions
        onlyDeathDateIndividuals.forEach((deceased) => {
            let inserted = false;
            for (let i = 0; i < adjustedList.length; i++) {
                if (this.isValidDate(adjustedList[i].BirthDate) && deceased.DeathDate < adjustedList[i].BirthDate) {
                    adjustedList.splice(i, 0, deceased);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                adjustedList.push(deceased);
            }
        });

        return adjustedList;
    }

    generateCSSForNestedLists() {
        let styleRules = "";
        const colours = this.colours;
        for (let i = 0; i < colours.length; i++) {
            // Generating the selector for each level
            let selector = "ul " + "ul ".repeat(i);

            // Generating the CSS rule for each level
            styleRules += `${selector} { border-left: 2px solid ${colours[i]}; }\n`;
        }

        return styleRules;
    }

    addStylesToHead() {
        const styleElement = document.createElement("style");
        styleElement.appendChild(document.createTextNode(this.generateCSSForNestedLists()));
        document.head.appendChild(styleElement);
    }

    setupToggleButtons() {
        // Remove previous click handlers to avoid duplicate bindings
        $(document).off("click.showAll").off("click.toggle-children").off("click.hideAll");

        $(".toggle-children").each(function () {
            const person = $(this).parent();
            if (person.find("> ul.children li").length === 0) {
                $(this).remove();
                person.find("> ul.children").remove();
                const personId = person.data("id");
                const child = $(
                    "li.person[data-father='" + personId + "'],li.person[data-mother='" + personId + "']"
                ).first();
                if (child.length > 0) {
                    const childsParent = child.parent().closest("li.person");
                    const personsHtml = person.html();
                    let gender = person.data("gender");
                    const notSpouseSpan = $(
                        `<span data-id='${personId}' data-gender='${gender}' class='not-spouse spouse'> ${personsHtml}</span>`
                    ); // Check if the extra parent is already listed as a spouse
                    const isSpouseListed = childsParent.find(`.spouse[data-id='${personId}']`).length > 0;

                    if (
                        !isSpouseListed &&
                        childsParent.children(`span.not-spouse[data-id='${personId}']`).length == 0
                    ) {
                        notSpouseSpan.insertBefore(childsParent.find("> ul.children").first());
                        person.remove();
                    }
                }
            }
        });

        $(document).on("click.toggle-children", ".toggle-children", function () {
            const parentId = $(this).data("parent-id");
            $(`li.person[data-id='${parentId}']`).find("> ul.children").toggle();

            // Change the button text (+/-)
            $(this).text($(this).text() === "−" ? "+" : "−");
        });

        $(".toggle-children").trigger("click");
        $(".toggleAll").show();

        $(document).on("click.showAll", "#showAll", function () {
            $(".toggle-children").text("−");
            $("ul.children").slideDown();
        });

        $(document).on("click.hideAll", "#hideAll", function () {
            $(".toggle-children").text("+");
            $("ul.children").slideUp();
        });

        this.hideLoadingBar();
    }

    downloadResults(data, htmlContent, filename = "data.json") {
        const storageObject = {
            data: data,
            html: htmlContent,
        };
        const blob = new Blob([JSON.stringify(storageObject, null, 2)], { type: "application/json" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    }

    triggerError() {
        const errorMessage = $("div.error");
        errorMessage.addClass("shake");

        // Optional: Remove the class after the animation ends
        errorMessage.on("animationend", function () {
            errorMessage.removeClass("shake");
        });
    }

    setNewTitle() {
        const newTitle = "One Name Trees: " + $("#surname").val();
        $("h1").text(newTitle);
        $("title").text(newTitle);
    }

    handleSearch(searchId) {
        if (!searchId) {
            alert("Please enter a WikiTree ID.");
            return;
        }

        const foundElement = $(`li.person[data-name='${searchId}'],span.person[data-name='${searchId}']`);
        if (foundElement.length === 0) {
            alert("No match found for the entered WikiTree ID.");
            return;
        }

        // Highlight the found element
        $(".person").removeClass("highlight");
        foundElement.addClass("highlight");

        // Collapse all lists
        $("ul.children").slideUp();
        $(".toggle-children").text("+"); // Set all toggle buttons to collapsed state

        // Expand all ancestor lists of the found element
        foundElement.parents("ul.children").slideDown();
        foundElement.parents("li.person").find("> .toggle-children").text("−"); // Set toggle buttons to expanded state for ancestor lists
        if (foundElement.hasClass("spouse")) {
            foundElement.next("ul.children").slideDown();
        }

        // Calculate the height of the sticky header
        const headerHeight = $("header").outerHeight(true);

        // Scroll to the found element
        setTimeout(function () {
            $("html, body").animate(
                {
                    scrollTop: foundElement.offset().top - headerHeight - 10, // Subtract the header height and a bit more for padding
                },
                500
            );
        }, 500);
        // Set the value of this back to the first (header) option
        $("#wtidGo,#nameSelect").val("").trigger("change");
    }

    reset() {
        clearInterval(D3DataFormatter.evolutionInterval);
        $("#stopEvolution").trigger("click");
        $("div.message,.popup").remove();
        $("#toggleDetails,#toggleWTIDs").removeClass("on");
        $("#searchContainer,#toggleDetails,#toggleWTIDs,#tableViewButton").hide();
        $("#tableViewButton").removeClass("on");
        $(
            "#locationsVisualisation,.duplicateLink,#wideTableButton,#noResults,#statisticsContainer,#periodButtonsContainer,#tableView,#clearFilters,#tableView_wrapper,#filtersButton,#flipLocationsButton,#nameSelectsSwitchButton,#nameSelects"
        ).off();

        $(
            "#locationsVisualisation,.duplicateLink,#wideTableButton,#noResults,#statisticsContainer,#periodButtonsContainer,#tableView,#clearFilters,#tableView_wrapper,#filtersButton,#flipLocationsButton,#nameSelectsSwitchButton,#nameSelects"
        ).remove();
        $("#wtidGo,#nameSelect,.toggle-children,.descendantsCount").each(
            function () {
                $(this).off();
                $(this).remove();
            } // Remove the select boxes
        );
        $("#refreshData").hide();
        this.displayedIndividuals = new Set();
        this.displayedSpouses = new Set();
        this.combinedResults = {};
        this.filteredResults = {};
        this.sortedPeople = [];
        this.peopleById = {};
        this.peopleByIdKeys = [];
        this.locationStats = {};
        this.familyTreeStatistics = {};
        this.parentToChildrenMap = {};
        this.surname = $("#surname").val().replaceAll("_", " ").replace(/\-\d+/, "").trim();
        this.surnameVariants = this.findSurnameVariants(this.surname);
        $("section#results").empty();
        $("#statsDisplay #periodStatisticsContainer").empty();
        $("#treesButtons,#tableLabel").removeClass("visible");
        $("#toggleGeneralStats").removeClass("on").hide();
        $("#locationSelects").hide();
    }

    getTotalWithTargetLNABs() {
        this.surnameVariants = this.findSurnameVariants(this.surname);
        const surnameVariants = this.surnameVariants.map((variant) => this.standardizeString(variant));
        let totalWithTargetLNABs = 0;
        for (let person of Object.values(this.combinedResults)) {
            const standardizedLastName = this.standardizeString(person.LastNameAtBirth);
            if (standardizedLastName && surnameVariants.includes(standardizedLastName)) {
                totalWithTargetLNABs++;
            }
        }
        return totalWithTargetLNABs;
    }

    generateStatsHTML(stats) {
        $("#statisticsContainer li").off();
        $("#statisticsContainer").remove(); // Remove any existing statistics container

        let $statsContainer = $("<div>", { id: "statisticsContainer" });

        // Total People

        const totalWithTargetLNABs = this.getTotalWithTargetLNABs();
        const totalPeopleText = `${stats.getTotalPeople()} (<span title="${totalWithTargetLNABs} of the total have the target surname (or variants) as the last name at birth">${totalWithTargetLNABs}</span>)`;
        $statsContainer.append(
            this.createStatItem("Total People: ", totalPeopleText, { title: "Total people in the dataset." })
        );

        // Average Lifespan
        $statsContainer.append(
            this.createStatItem("Average Lifespan: ", stats.getAverageLifespan() + " years", {
                classes: "averageLifespan clicker",
            })
        );

        // Average Children Per Person
        $statsContainer.append(
            this.createStatItem("Average Children per Male (over 16): ", stats.getAverageChildrenPerMaleOver16(), {
                title: `This is per male over 16 because the dataset will include their children, but not those of many of the women, whose children would tend to take their father's surname (due to this being a name study, mostly based on last name at birth).`,
            })
        );

        // Average Children Per Couple
        $statsContainer.append(
            this.createStatItem("Average Children Per Couple: ", stats.getAverageChildrenPerCoupleForDataset(), {
                title: "Average number of children per couple for the entire dataset.",
            })
        );

        function addStatsAndList($this, statType, title, statsMethod, divId, extraClass = "") {
            const statItems = stats[statsMethod]();
            $statsContainer.append(
                $this.createStatItem(`${title}: `, statItems.length, {
                    classes: `${statType} clicker ${extraClass}`,
                    title: `Click to display a list of profiles with ${title.toLowerCase()}.`,
                    heading: title,
                })
            );

            if (statItems.length > 0) {
                const $div = createPopupDiv(divId, title);
                populateDivWithProfiles($this, $div, statItems);
            }
        }

        function createPopupDiv(divId, title) {
            const $div = $(`
            <div id='${divId}' class='popup'><x>x</x>
            <h2>${title}</h2>
            </div>`);
            $("body").append($div);
            $div.draggable();
            return $div;
        }

        function populateDivWithProfiles($this, $div, profiles) {
            profiles.forEach((person) => {
                const aName = new PersonName(person);
                let fullName = aName.withParts(["FullName"]);
                const dates = $this.displayDates(person);
                let id = person.Name;
                let link = `<a href="https://www.wikitree.com/wiki/${id}" target="_blank" class="${
                    person.Gender || ""
                }">${fullName} ${dates}</a>`;
                if (!person.Name) {
                    link = `<a>Private ${dates}</a>`;
                }
                $div.append(link);
            });
        }

        // Using the functions
        addStatsAndList(this, "unsourced", "Unsourced Profiles", "getUnsourced", "unsourcedProfiles");
        addStatsAndList(this, "unconnected", "Unconnected Profiles", "getUnconnected", "unconnectedProfiles");
        addStatsAndList(this, "noRelations", "No Connections", "getNoRelations", "noRelationsProfiles");

        // Most Common Names
        const topMaleNames = stats.getTopNamesByGender("Male", 100);
        const topFemaleNames = stats.getTopNamesByGender("Female", 100);
        const $commonNamesDiv = this.generateNamesHTML(topMaleNames, topFemaleNames);
        $statsContainer.append(
            this.createStatItem("Most Common Names: ", $commonNamesDiv, { classes: "mostCommonNames clicker" })
        );

        // Most Common Locations
        const locationStats = stats.getLocationStatistics();
        const $locationDiv = this.generateLocationHTML(locationStats);
        $statsContainer.append(
            this.createStatItem("Most Common Birth Places: ", $locationDiv, { classes: "mostCommonLocations clicker" })
        );

        return $statsContainer;
    }

    locationCountButton(key, value) {
        return `<a class="locationCount button small" data-location="${key}">${value}</a>`;
    }

    generateLocationHTML(locationStats) {
        console.log("generateLocationHTML", locationStats);

        let $locationDiv = $("<div class='commonLocations'>");
        const maxCountries = 3; // Maximum countries to show initially
        const maxLocations = 5; // Maximum locations to show initially within each country

        // Recursive function to generate HTML for subdivisions and any nested subdivisions
        const generateSubdivisionsHTML = (subdivisions, isVisibleLimit) => {
            let $subdivisionList = $("<ul class='locationSubdivision'>");
            subdivisions
                .filter(([key, _]) => key !== "count" && key !== "")
                .sort((a, b) => b[1].count - a[1].count)
                .forEach(([subdivision, subData], index) => {
                    const isVisible = index < isVisibleLimit;
                    const countButton = this.locationCountButton(subdivision, subData.count);
                    let $subItem = $("<li>")
                        .append(`<span class="locationPart">${subdivision}</span> (${countButton})`)
                        .toggle(isVisible);

                    // Check if there are further nested subdivisions
                    let nestedSubdivisions = Object.entries(subData).filter(([key, _]) => !["count", ""].includes(key));
                    if (nestedSubdivisions.length > 0) {
                        $subItem.addClass("expandable");
                        let $nestedList = generateSubdivisionsHTML(nestedSubdivisions, isVisibleLimit); // Recursive call
                        $subItem.append($nestedList.hide());
                    }
                    $subdivisionList.append($subItem);
                });

            if (subdivisions.length > isVisibleLimit) {
                this.addToggleMoreLessButton($subdivisionList, isVisibleLimit);
            }

            return $subdivisionList;
        };

        let countriesSorted = Object.entries(locationStats.countryCounts)
            .sort((a, b) => b[1] - a[1])
            .filter(([country, _]) => country !== "");

        countriesSorted.forEach(([country, countryCount], countryIndex) => {
            const isCountryVisible = countryIndex < maxCountries;
            const countButton = this.locationCountButton(country, countryCount);
            let $countryDiv = $("<div class='country'>")
                .html(`<span class="locationPart">${country}</span> (${countButton})`)
                .toggle(isCountryVisible);

            let subdivisions = locationStats.subdivisionCounts[country];
            if (subdivisions) {
                let subdivisionEntries = Object.entries(subdivisions);
                let $subdivisionList = generateSubdivisionsHTML(subdivisionEntries, maxLocations);
                $countryDiv.append($subdivisionList);
            }

            $locationDiv.append($countryDiv);
        });

        if (countriesSorted.length > maxCountries) {
            this.addToggleMoreCountriesButton($locationDiv, maxCountries);
        }

        return $locationDiv;
    }

    addToggleMoreLessButton($list, maxItems) {
        const $this = this;
        let $showMore = $("<li class='showMore locationToggler'>")
            .text("▶")
            .on("click.oneNameTrees", function () {
                $this.toggleItemsVisibility($list, maxItems, this);
            });
        $list.append($showMore);
    }

    toggleItemsVisibility($list, maxItems, toggleButton) {
        let $items = $list.children("li:not(.showMore)");
        let isExpanded = $(toggleButton).text().includes("▼");
        $items.slice(maxItems).toggle(!isExpanded);
        $(toggleButton).text(isExpanded ? "▶" : "▼");
    }

    addToggleMoreCountriesButton($div, maxCountries) {
        let $countries = $div.children(".country");
        $countries.slice(maxCountries).hide(); // Hide countries beyond the max limit initially

        let $showMoreCountries = $("<div class='showMoreCountries locationToggler'>")
            .text("▶")
            .on("click.oneNameTrees", function () {
                let isExpanded = $(this).text().includes("▼");
                $countries.slice(maxCountries).toggle(!isExpanded);
                $(this).text(isExpanded ? "▶" : "▼");
            });
        if ($countries.length > maxCountries) {
            // Only add if there are more countries than the max limit
            $div.append($showMoreCountries);
        }
    }

    doFilters(value, filter) {
        if ($("#periodButtonsContainer button.on").length) {
            const period = $("#periodButtonsContainer button.on").text();
            $("#birthDateFilter").val(period);
        }
        $(`#${filter}Filter`).val(value).trigger("change");
        this.clearFiltersButton();
    }

    loadTableWithFilter(value, filter) {
        const $this = this;
        const tableViewButton = $("#tableViewButton");
        if (tableViewButton.hasClass("on") == false) {
            tableViewButton.trigger("click");
            setTimeout(function () {
                $this.doFilters(value, filter);
                $this.shakingTree.hide();
                if ($("#toggleGeneralStats.on").length) {
                    $("#toggleGeneralStats").trigger("click");
                }
            }, 1000);
        } else {
            $this.doFilters(value, filter);
        }
        $("#locationSelect").val("");
    }

    generateNestedSubdivisionList(subdivisionData) {
        let $nestedList = $("<ul class='nestedSubdivision'>");

        Object.entries(subdivisionData).forEach(([key, value]) => {
            if (key !== "count" && typeof value === "object") {
                // Adjusted to generate button HTML string
                const buttonHTML = this.locationCountButton(key, value.count); // Assuming value.count is the count you want to show
                let $nestedItem = $("<li>");

                // Creating a span with class .locationPart as the clickable part
                let $clickablePart = $(`<span class="locationPart">${key}</span>`);

                // Set the content of the list item, injecting the button HTML directly
                $nestedItem.append($clickablePart).append(` (${buttonHTML})`);

                if (Object.keys(value).length > 1) {
                    // Recursively generate nested lists
                    let $subNestedList = this.generateNestedSubdivisionList(value);
                    $nestedItem.append($subNestedList.hide());
                    $nestedItem.addClass("expandable");
                }
                $nestedList.append($nestedItem);
            }
        });
        return $nestedList;
    }

    generateNamesHTML(topMaleNames, topFemaleNames) {
        const maxVisibleNames = 5; // Maximum number of names to show initially

        // Utility function to create a list of names with a toggle for more names
        const createListWithToggle = (names) => {
            let $list = $("<ul class='commonNameList'>");
            names.forEach((name, index) => {
                let $item = $("<li>").text(`${name.name}: ${name.count}`);
                $list.append($item);
                // Hide names exceeding the maxVisibleNames threshold
                if (index >= maxVisibleNames) {
                    $item.addClass("hiddenName").hide();
                }
            });

            // Add toggle button if there are more names than maxVisibleNames
            if (names.length > maxVisibleNames) {
                let $toggleButton = $("<span class='toggleMoreNames'>▶</span>").on("click.oneNameTrees", function () {
                    $(this).siblings(".hiddenName").slideToggle();
                    // Update button text based on visibility of hidden names
                    let isExpanded = $(this).text().trim() === "▼";
                    $(this).text(isExpanded ? "▶" : "▼");
                });
                $list.append($toggleButton);
            }

            return $list;
        };

        let $namesContainer = $("<div>", { id: "namesContainer" });
        // Append male names list
        $namesContainer.append(
            $("<div class='genderNameList'>")
                .text("Male: ")
                .css("font-weight", "bold")
                .append(createListWithToggle(topMaleNames))
        );

        // Append female names list
        $namesContainer.append(
            $("<div class='genderNameList'>")
                .text("Female: ")
                .css("font-weight", "bold")
                .append(createListWithToggle(topFemaleNames))
        );

        return $namesContainer;
    }

    generatePeriodStatsHTML(periodStats) {
        const $this = this;
        console.log("generatePeriodStatsHTML", periodStats);

        let $statsContainer = $("<div>", { class: "period-stats-container" });

        // Total People
        $statsContainer.append(this.createStatItem("Total People: ", periodStats.peopleCount));

        // Average Lifespan
        $statsContainer.append(
            this.createStatItem("Average Lifespan: ", periodStats.averageAgeAtDeath + " years", {
                classes: "averageLifespan clicker",
            })
        );

        // Average Children Per Person
        $statsContainer.append(
            this.createStatItem("Average Children per Male (over 16): ", periodStats.averageChildren, {
                title: `Average number of children for each male born in this period and thought to have reached the age of 16. This is excludes females as the dataset will not include the children of many of the women, whose children would tend to take their father's surname (due to this being a name study, mostly based on last name at birth).`,
            })
        );

        // Average Children Per Couple
        $statsContainer.append(
            this.createStatItem("Average Children per Couple: ", periodStats.averageChildrenPerCouple)
        );

        // Most Common Names
        const $namesDiv = this.generateNamesHTMLForPeriod(periodStats.names);
        $statsContainer.append($this.createStatItem("Names: ", $namesDiv, { id: "commonNames" }));

        // Most Common Locations
        const $locationDiv = this.generateLocationHTMLForPeriod(
            periodStats.countryCounts,
            periodStats.subdivisionCounts
        );
        $statsContainer.append(this.createStatItem("Most Common Birth Places: ", $locationDiv));

        return $statsContainer;
    }

    generateNamesHTMLForPeriod(namesData) {
        let $namesContainer = $("<div>");

        Object.entries(namesData).forEach(([gender, names]) => {
            if (["Male", "Female"].includes(gender) && names.length > 0) {
                let $genderContainer = $("<div>").appendTo($namesContainer);
                $genderContainer.append(
                    $("<span class='genderNameList'>")
                        .text(gender + ": ")
                        .css("font-weight", "bold")
                );
                let $list = $("<ul class='commonNameList'>").appendTo($genderContainer);

                names.forEach(([name, count], index) => {
                    const $item = $("<li>").text(`${name}: ${count}`);
                    $list.append($item);
                    if (index >= 5) {
                        $item.addClass("hiddenName").hide();
                    }
                });

                if (names.length > 5) {
                    const $toggleIcon = $("<span class='toggleIcon' title='See more names'>")
                        .html("&#9654;")
                        .on("click.oneNameTrees", function () {
                            $genderContainer.find(".hiddenName").slideToggle("fast", function () {
                                const anyVisible = $genderContainer.find(".hiddenName:visible").length > 0;
                                $toggleIcon.html(anyVisible ? "&#9660;" : "&#9654;");
                                $toggleIcon.attr("title", anyVisible ? "See fewer names" : "See more names");
                            });
                        });
                    $genderContainer.append($toggleIcon);
                }
            }
        });

        return $namesContainer;
    }

    generateLocationHTMLForPeriod(countryCounts, subdivisionCounts) {
        const $this = this;
        let $locationDiv = $("<div class='commonLocations'>");

        // Process and display top countries and subdivisions
        Object.entries(countryCounts)
            .filter(([country, _]) => country !== "" && country !== "count") // Filter out 'count' and empty strings
            .sort((a, b) => b[1] - a[1]) // Sort countries by count in descending order
            .forEach(([country, count]) => {
                const countButton = this.locationCountButton(country, count);
                let $countryDiv = $("<div class='country'>").html(
                    `<span class="locationPart">${country}</span> (${countButton})`
                );
                let subdivisions = subdivisionCounts[country];

                if (subdivisions) {
                    let $subdivisionList = $("<ul class='locationSubdivision'>");
                    Object.entries(subdivisions)
                        .filter(([subdivision, _]) => subdivision !== "count" && subdivision !== "") // Filter out 'count' and empty strings
                        .sort((a, b) => b[1].count - a[1].count) // Assuming 'count' is a property of the object
                        .forEach(([subdivision, subData]) => {
                            const countButton = $this.locationCountButton(subdivision, subData.count);
                            let $subItem = $("<li>").html(
                                `<span class="locationPart">${subdivision}</span> (${countButton})`
                            );
                            if (Object.keys(subData).length > 1) {
                                // Check if there are nested subdivisions
                                $subItem.addClass("expandable");
                                let $nestedList = $this.generateNestedSubdivisionList(subData);
                                $subItem.append($nestedList.hide()); // Hide nested list initially
                            }
                            $subdivisionList.append($subItem);
                        });

                    $countryDiv.append($subdivisionList);
                }

                $locationDiv.append($countryDiv);
            });

        return $locationDiv;
    }

    createStatItem(label, value, options = {}) {
        // Utility function to create a stat item
        const id = options.id || "";
        const title = options.title || "";
        const classes = options.classes || "";
        return $("<div>", { class: "stat-item " + classes, id: id, title: title }).append(
            $("<label>").html(label),
            value instanceof jQuery ? value : $("<span>").html(value)
        );
    }

    generatePeriodButtons(periodStats) {
        const $this = this;
        const sortedPeriods = Object.keys(periodStats).sort(
            (a, b) => parseInt(a.split("-")[0]) - parseInt(b.split("-")[0])
        );

        sortedPeriods.forEach((period) => {
            let $button = $("<button>")
                .text(period)
                .on("click.oneNameTrees", function () {
                    $button = $(this);
                    $this.togglePeriodStats(this, periodStats[period]);
                    if ($("#tableViewButton").hasClass("on")) {
                        if ($("#tableView").length == 0) {
                            $this.shakingTree.show();
                        }
                        setTimeout(function () {
                            if ($button.hasClass("on")) {
                                $this.loadTableWithFilter(period, "birthDate");
                            } else {
                                $("#birthDateFilter").val("").trigger("change");
                            }
                        }, 0);
                    }
                });

            $("#periodButtonsContainer").append($button);
        });
    }

    togglePeriodStats(button, periodData) {
        const $button = $(button);
        const $generalStatsContainer = $("#statisticsContainer");
        const $periodStatsContainer = $("#periodStatisticsContainer");

        if ($button.hasClass("on")) {
            // Button was already 'on', so turn it 'off' and show general stats
            $button.removeClass("on");
            $generalStatsContainer.show();
            $periodStatsContainer.hide();
        } else {
            // Turn 'on' this button and turn 'off' all other buttons
            $("#periodButtonsContainer button").removeClass("on");
            $button.addClass("on");

            // Hide general stats and show period-specific stats
            $generalStatsContainer.hide();
            $periodStatsContainer.html(this.generatePeriodStatsHTML(periodData)).show();
        }
    }

    addLocationSelectBoxes(locationStats) {
        const $this = this;
        // Ensure removal of existing elements to avoid duplicates.
        $("#locationSelects").remove();

        // Create the container for the select box and the switch button.
        const $locationSelects = $("<div>", { id: "locationSelects" });
        $("#tableLabel").append($locationSelects);

        // Extract and prepare the location data.
        const locations = locationStats.locationCounts;
        const sortedLocationsByCount = Object.entries(locations)
            .sort((a, b) => b[1].count - a[1].count) // Make sure to access the count correctly for sorting.
            .map(([location, data]) => ({ location, count: data.count })); // Ensure data.count is correctly accessed.
        const sortedLocationsAlphabetically = [...sortedLocationsByCount].sort((a, b) =>
            a.location.localeCompare(b.location)
        );

        // Initialize the select box with an id.
        const $locationSelect = $("<select>", { id: "locationSelect" });
        $locationSelects.append($locationSelect);

        // Function to populate the select box.
        function populateSelectBox(locationsArray, order) {
            let orderText = "";
            if (order === "a-z") {
                orderText = " (A-Z)";
            }

            $locationSelect.empty(); // Clear existing options.
            $locationSelect.append($("<option>").text(`Birth Place${orderText}`).val("")); // Default option.
            locationsArray.forEach(({ location, count }) => {
                $locationSelect.append($("<option>").text(`${location} (${count})`).val(location));
            });
        }

        // Populate initially with locations sorted by count.
        populateSelectBox(sortedLocationsByCount);

        // Create the switch button for toggling the sort order.
        const $switchButton = $("<button>", {
            id: "locationSelectsSwitchButton",
            text: "⇆",
            title: "Switch between sort orders (count and alphabetical).",
        }).on("click.oneNameTrees", function () {
            // Determine the current sorting order to toggle.
            const isSortedByCount = $locationSelect
                .find("option:nth-child(2)")
                .text()
                .includes("(" + sortedLocationsByCount[0].count + ")");
            if (isSortedByCount) {
                populateSelectBox(sortedLocationsAlphabetically, "a-z");
            } else {
                populateSelectBox(sortedLocationsByCount, "count");
            }
        });
        $locationSelects.append($switchButton);

        // Event listener for the select box.
        $locationSelect.on("change", function () {
            let selectedValue = $(this).val();
            if (selectedValue && !selectedValue.match(/^Location/)) {
                const strippedValue = selectedValue.replace(/ \(\d+\)/, "");
                if ($("#tableView").length == 0) {
                    $this.shakingTree.show();
                }
                setTimeout(function () {
                    $this.loadTableWithFilter(strippedValue, "birthPlace");
                }, 0);
            }
        });
    }

    showStatistics() {
        this.familyTreeStats = new FamilyTreeStatistics(this.filteredResults);
        //  console.log("Total People: ", this.familyTreeStats.getTotalPeople());
        //  console.log("Average Lifespan: ", this.familyTreeStats.getAverageLifespan(), "years");
        //  console.log("Gender Distribution: ", this.familyTreeStats.getGenderDistribution());
        if (OneNameTrees.VERBOSE) {
            console.log("Birth Decade Distribution: ", this.familyTreeStats.getBirthDecadeDistribution());
            console.log("Child Counts: ", this.familyTreeStats.getChildCounts());
            console.log("Common Names: ", this.familyTreeStats.getNameStatistics());
            const unsourced = this.familyTreeStats.getUnsourced();
            console.log("Unsourced Profiles: ", unsourced.length);
            console.log("Unsourced Profiles: ", unsourced);
        }

        // Get top 10 male names
        const topMaleNames = this.familyTreeStats.getTopNamesByGender("Male");
        console.log("Top 10 Male Names:", topMaleNames);

        // Get top 10 female names
        const topFemaleNames = this.familyTreeStats.getTopNamesByGender("Female");
        console.log("Top 10 Female Names:", topFemaleNames);

        // Get stats for each 50-year period
        const periodStats = this.familyTreeStats.getStatsBy50YearPeriods();
        console.log("Stats by 50-Year Periods:", periodStats);

        const d3DataFormatter = new D3DataFormatter(periodStats);
        d3DataFormatter.lifespanGraph();

        d3DataFormatter.formatNamesData();

        d3DataFormatter.initVisualization();

        // Accessing location statistics
        const locationStats = this.familyTreeStats.getLocationStatistics();
        // console.log("Country Counts: ", locationStats.countryCounts);
        // console.log("Subdivision Counts: ", locationStats.subdivisionCounts);
        // console.log("Location Counts: ", locationStats.locationCounts);
        // Show number of keys in locationStats.locationCounts
        // console.log("Number of Location Parts: ", Object.keys(locationStats.locationCounts).length);

        // Category count
        const categoryCount = this.familyTreeStats.getCategoryCounts();
        // console.log("Category Count: ", categoryCount);

        // Actually display the statistics
        $("#statsDisplay").append(this.generateStatsHTML(this.familyTreeStats));

        $("#periodButtonsContainer button").off();
        $("#periodButtonsContainer").remove();
        // Create a container for period buttons
        let $periodButtonsContainer = $("<div>", { id: "periodButtonsContainer" });

        // Append period buttons container to the DOM
        $("#statsDisplay").prepend($periodButtonsContainer);

        // Generate buttons for each period
        this.generatePeriodButtons(periodStats);

        // Add location select boxes
        this.addLocationSelectBoxes(locationStats);
    }

    birthAndDeathDates(person) {
        let birthDate = person.BirthDate;
        let deathDate = person.DeathDate;
        let birthDateDecade = person.BirthDateDecade;
        let deathDateDecade = person.DeathDateDecade;
        if (!birthDate && birthDateDecade) {
            birthDate = birthDateDecade.replace(/s$/, "-00-00");
        }
        if (birthDate == "unknown") {
            birthDate = "";
        }
        if (!deathDate && deathDateDecade) {
            deathDate = deathDateDecade.replace(/s$/, "-00-00");
        }
        if (deathDate == "unknown") {
            deathDate = "";
        }
        // DisplayDate is the date to display in the table (remove -00 and -00-00)
        let displayBirthDate = birthDate?.replace(/-00/g, "")?.replace(/-00/g, "");
        let displayDeathDate = deathDate?.replace(/-00/g, "")?.replace(/-00/g, "");
        if (displayBirthDate === "0000") {
            displayBirthDate = "";
        }
        if (displayDeathDate === "0000") {
            displayDeathDate = "";
        }
        // SortDate is the date to use for sorting (replace -00-00 with -07-02; replace -00 with -15)
        let sortBirthDate = birthDate?.replace(/-00-00/g, "-07-02")?.replace(/-00/g, "-15");
        let sortDeathDate = deathDate?.replace(/-00-00/g, "-07-02")?.replace(/-00/g, "-15");

        return {
            Birth: { DisplayDate: displayBirthDate, SortDate: sortBirthDate, Date: person.BirthDate },
            Death: { DisplayDate: displayDeathDate, SortDate: sortDeathDate, Date: person.DeathDate },
        };
    }

    // Function to update the sticky header position
    setStickyHeader() {
        const headerHeight = parseInt($("header").height() + 15) + "px";
        $("thead").css({
            position: "sticky",
            top: headerHeight,
        });
    }

    buildTable() {
        const $this = this;
        if ($("#tableView").length) {
            $("#tableView").remove();
        }
        this.shakingTree.show();
        const $table = $("<table>").prop("id", "tableView");
        const $thead = $("<thead>");
        const $tbody = $("<tbody>");
        const $tfoot = $("<tfoot>");

        // Define your headers
        const headers = {
            givenNames: "First",
            lastNameAtBirth: "LNAB",
            lastNameCurrent: "Current",
            birthDate: "Birth Date",
            birthPlace: "Birth Place",
            deathDate: "Death Date",
            deathPlace: "Death Place",
            age: "Age",
            categoryHTML: "Cats. & Stickers",
            managers: "Managers",
            created: "Created",
            modified: "Modified",
        };

        const $tr = $("<tr>");
        const $tr2 = $("<tr id='filterRow'>");
        Object.keys(headers).forEach(function (key) {
            const header = headers[key];
            const $th = $("<th>").text(header).addClass(key);
            $tr.append($th);
            const filterElement = $(`<input type="text" class="filter" />`).attr("id", key + "Filter");
            if (["birthDate", "deathDate", "created", "touched"].includes(key)) {
                filterElement.addClass("dateFilter");
            }
            $tr2.append($("<th>").append(filterElement));
        });
        $thead.append($tr);
        $tfoot.append($tr2);

        // Add rows for data
        console.log("filteredResults", this.filteredResults);
        Object.keys(this.filteredResults).forEach(function (key) {
            const person = $this.filteredResults[key];
            if (!person.Name) {
                return;
            }
            const aName = new PersonName(person);
            let givenNames = aName.withParts(["FirstNames"]);
            givenNames = person.Name
                ? `<a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${givenNames}</a>`
                : givenNames;
            const lastNameAtBirth = aName.withParts(["LastNameAtBirth"]);
            const lastNameCurrent = aName.withParts(["LastNameCurrent"]);
            const birthDeathDates = $this.birthAndDeathDates(person);
            const birthDate = birthDeathDates.Birth.DisplayDate;
            const birthPlace = person.BirthLocation;
            const deathDate = birthDeathDates.Death.DisplayDate;
            const deathPlace = person.DeathLocation;
            const age =
                person.BirthDate &&
                person.BirthDate != "0000-00-00" &&
                person.DeathDate &&
                person.DeathDate != "0000-00-00"
                    ? $this.familyTreeStats.calculateAgeAtDeath(person.BirthDate, person.DeathDate)
                    : "";
            let managers = person.Managers
                ? person.Managers.map((manager) => {
                      return `<a href="https://www.wikitree.com/wiki/${manager.Name}" target="_blank">${manager.Name}</a>`;
                  }).join(",")
                : "";
            if (!managers && person.Manager) {
                managers = `<a href="https://www.wikitree.com/wiki/${person.Manager}" target="_blank">${person.Manager}</a>`;
            }
            // Created and Touched are in this format: 20100705150300	20100705150300
            // Convert to a simple ISO date
            const formatCreatedModifiedDates = (date) => {
                return date ? date.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3") : "";
            };

            const created = person.Created ? formatCreatedModifiedDates(person.Created) : "";
            const touched = person.Touched ? formatCreatedModifiedDates(person.Touched) : "";
            const $row = $("<tr>");
            // Add data to the row: data-name, data-id, data-father, data-mother, data-gender
            $row.attr("data-name", person.Name);
            $row.attr("data-id", person.Id);
            $row.attr("data-father", person.Father);
            $row.attr("data-mother", person.Mother);
            $row.attr("data-gender", person.Gender);
            $row.attr("data-corrected-location", person.CorrectedBirthLocation);
            const categoryHTML = $this.createCategoryHTML(person);
            const rowData = {
                givenNames: givenNames,
                lastNameAtBirth: lastNameAtBirth,
                lastNameCurrent: lastNameCurrent,
                birthDate: birthDate,
                birthPlace: birthPlace,
                deathDate: deathDate,
                deathPlace: deathPlace,
                age: age,
                categoryHTML: categoryHTML,
                managers: managers,
                created: created,
                touched: touched,
            };
            Object.keys(rowData).forEach(function (key) {
                const cellData = rowData[key];
                const $cell = $("<td>").html(cellData).addClass(key);
                if (["birthDate", "deathDate", "created", "touched"].includes(key)) {
                    $cell.addClass("date");
                }
                $row.append($cell);
            });
            $tbody.append($row);
        });

        $table.append($thead, $tbody, $tfoot);
        $("section#table").append($table);
        const table = $("#tableView").DataTable({
            lengthMenu: [50, 100, 200, 500, 1000],
        });

        /*

          search: {
                smart: true,
                regex: true,
            },

            */

        // Apply the filter
        table.columns().every(function () {
            var column = this;

            $("input", this.footer()).on("change", function () {
                column.search(this.value).draw();
            });
            $("input", this.footer()).on("keyup", function (e) {
                if (e.key === "Enter") {
                    column.search(this.value).draw();
                }
            });
        });
        /*
        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            // Access the DataTable instance and the row element
            const table = $(settings.nTable).DataTable();
            const row = table.row(dataIndex).node();
            const correctedLocation = $(row).data("corrected-location") || "";
            const locationFilterValue = $("#birthPlaceFilter").val().toLowerCase();

            let isValid = true; // Initialize as true and set to false if any condition fails
            $(".dateFilter").each(function () {
                const columnIndex = $(this).closest("th").index(); // Get column index based on the position of the input
                const filterValue = $(this).val();
                const cellValue = data[columnIndex] || ""; // Get the value from the cell in the current column
                let year = cellValue.split("-")[0]; // Assuming the date is in YYYY-MM-DD format

                let minYear, maxYear, excludeYear, exactYear;

                // Interpret filterValue
                if (filterValue.startsWith("!")) {
                    excludeYear = parseInt(filterValue.substring(1), 10);
                } else if (filterValue.includes("-")) {
                    [minYear, maxYear] = filterValue.split("-").map(Number);
                } else if (filterValue.startsWith("<")) {
                    maxYear = parseInt(filterValue.substring(1), 10);
                } else if (filterValue.startsWith(">")) {
                    minYear = parseInt(filterValue.substring(1), 10) + 1; // +1 to make it exclusive
                } else if (filterValue.length === 4 && /^\d+$/.test(filterValue)) {
                    // Check for an exact year match
                    exactYear = parseInt(filterValue, 10);
                }

                // Apply filter logic
                if (
                    (minYear && year < minYear) ||
                    (maxYear && year > maxYear) ||
                    (excludeYear && year == excludeYear) ||
                    (exactYear !== undefined && year !== exactYear)
                ) {
                    isValid = false; // If any condition fails, set isValid to false
                }
            });

            // Standard location filtering
            if (locationFilterValue && !correctedLocation.toLowerCase().includes(locationFilterValue)) {
                isValid = false;
            }

            return isValid; // Only include rows where isValid remains true
        });
*/

        function escapeRegExp(string) {
            return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        }

        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            let isValid = true; // Initialize as true and set to false if any condition fails

            // Access the DataTable instance and the row element
            const table = $(settings.nTable).DataTable();
            const row = table.row(dataIndex).node();
            const correctedLocation = $(row).data("corrected-location") || "";
            const locationFilterValue = $("#birthPlaceFilter").val().toLowerCase();

            $(".dateFilter").each(function () {
                const columnIndex = $(this).closest("th").index(); // Get column index based on the position of the input
                const filterValue = $(this).val().trim(); // Trim whitespace from the filter value
                const cellValue = data[columnIndex] || ""; // Get the value from the cell in the current column
                let year = parseInt(cellValue.split("-")[0], 10); // Extract year as an integer

                let minYear, maxYear, excludeYear, exactYear;

                // Interpret filterValue
                if (filterValue.startsWith("!")) {
                    excludeYear = parseInt(filterValue.substring(1), 10);
                    if (year === excludeYear) {
                        isValid = false; // Exclude rows where the year matches the excludeYear
                    }
                } else if (filterValue.includes("-")) {
                    [minYear, maxYear] = filterValue.split("-").map(Number);
                    if (year < minYear || year > maxYear) {
                        isValid = false; // Exclude rows outside the specified range
                    }
                } else if (filterValue.startsWith("<")) {
                    maxYear = parseInt(filterValue.substring(1), 10);
                    if (year >= maxYear) {
                        isValid = false; // Exclude rows with a year greater than or equal to maxYear
                    }
                } else if (filterValue.startsWith(">")) {
                    minYear = parseInt(filterValue.substring(1), 10);
                    if (year <= minYear) {
                        isValid = false; // Exclude rows with a year less than or equal to minYear
                    }
                } else if (/^\d{4}$/.test(filterValue)) {
                    // Enhanced check for an exact year match
                    exactYear = parseInt(filterValue, 10);
                    if (year !== exactYear) {
                        isValid = false; // Exclude rows that do not match the exact year
                    }
                }
            });
            // Standard location filtering
            if (locationFilterValue && !correctedLocation.toLowerCase().includes(locationFilterValue)) {
                isValid = false;
            }
            // Handling other filters that are not date filters
            $(".filter:not(.dateFilter)").each(function () {
                if (!isValid) return; // Skip if already invalid

                const filterElement = $(this);
                const filterValue = filterElement.val().trim().toLowerCase(); // Trim and lowercase the filter value
                const columnIndex = $(this).closest("th").index(); // Assuming filter is placed within a column header or related structure
                const cellData = data[columnIndex]?.toString().toLowerCase() || ""; // Cell data in lowercase for case-insensitive comparison

                if (filterValue.startsWith("!")) {
                    // Handling NOT condition for non-date fields
                    const excludeValue = filterValue.slice(1);

                    if (cellData.includes(excludeValue)) {
                        isValid = false; // Exclude row if it contains the excluded value
                    }
                } else {
                    // Regular condition for textual and numerical fields
                    if (!cellData.includes(filterValue)) {
                        isValid = false; // Exclude row if it does not contain the filter value
                    }
                }
            });

            return isValid; // Only include rows where isValid remains true
        });

        const wideTableButton = $("<button>", { id: "wideTableButton" }).text("Wide");
        $("#tableView_wrapper #tableView_length").after(wideTableButton);
        wideTableButton.on("click.oneNameTrees", function () {
            $("section#table").toggleClass("wide");
            $(this).toggleClass("on");
        });

        function flipLocationOrder() {
            const table = $("#tableView").DataTable();
            // Flip the text of each cell in the birthPlace and deathPlace columns
            table.cells(".birthPlace, .deathPlace").every(function () {
                const cell = this.node();
                const cellData = this.data();
                this.data(cellData.split(", ").reverse().join(", ")); // Update the data for DataTables to recognize
            });

            table.draw(false); // Redraw the table without resetting the paging
        }

        const flipLocationsButton = $("<button>", { id: "flipLocationsButton" }).text("Reverse locations");
        $("#tableView_wrapper #tableView_length").after(flipLocationsButton);
        flipLocationsButton.on("click.oneNameTrees", function () {
            flipLocationOrder();
        });

        // Use ResizeObserver to handle dynamic changes in the header's size
        const header = document.querySelector("header");
        if (header) {
            const resizeObserver = new ResizeObserver((entries) => {
                $this.setStickyHeader(); // Update the sticky header position whenever the header size changes
            });
            resizeObserver.observe(header);
        }

        $("#toggleGeneralStats").on("click.oneNameTrees", function () {
            setTimeout($this.setStickyHeader, 300); // Adjust the timeout based on actual delay
        });

        // Initial call to ensure the sticky header is correctly positioned on page load
        this.setStickyHeader();

        $(".filter").off(); // Remove any existing event listeners

        $(".filter").on("change", function () {
            table.draw();
        });
        $(".filter").on("keyup", function (e) {
            if (e.keyCode === 13) {
                table.draw();
            }
        });

        $(".filter").on("keyup", function () {
            $this.clearFiltersButton();
        });

        // Check for #periodButtonsContainer button.on and load the period filter if it is on
        if ($("#periodButtonsContainer button.on").length) {
            const period = $("#periodButtonsContainer button.on").text();
            $("#birthDateFilter").val(period);
            table.draw();
        }

        this.shakingTree.hide();
    }

    clearAllFilters() {
        const $this = this;
        const table = $("#tableView").DataTable();

        // Clear global filter
        table.search("").draw();

        // Clear column filters
        table.columns().every(function () {
            const column = this;
            column.search("");
        });
        setTimeout(function () {
            table.draw(); // Redraw the table with all filters cleared
            $this.shakingTree.hide();
        }, 100);
    }

    clearFiltersButton() {
        // If any filter has text in it then show the clear filters button else hide it
        if (
            $(".filter").filter(function () {
                return this.value;
            }).length
        ) {
            this.addClearFiltersButton();
        } else {
            $("#clearFilters").off();
            $("#clearFilters").remove();
        }
    }
    addClearFiltersButton() {
        const $this = this;
        if ($("#clearFilters").length) {
            return;
        }
        const $clearButton = $("<button>", { id: "clearFilters" }).text("Clear Filters");
        if ($("#tableViewButton").hasClass("on")) {
            $("#tableView_filter").before($clearButton);
            //           $("#controls").append($clearButton);
        }
        $("#clearFilters").on("click.oneNameTrees", function () {
            $this.shakingTree.show();
            setTimeout(function () {
                $(".filter").val("");
                $this.clearAllFilters();
                $("#clearFilters").off();
                $("#clearFilters").remove();
            }, 0);
        });
    }

    /*
    countDescendants(personId, parentToChildrenMap) {
        let count = 0;
        if (parentToChildrenMap[personId]) {
            const children = parentToChildrenMap[personId];
            count += children.length; // Add direct children
            children.forEach((childId) => {
                count += this.countDescendants(childId, parentToChildrenMap); // Recursively add the count of descendants
            });
        }
        return count;
    }
    */

    loadFromURL() {
        // Check name parameter of URL
        const urlParams = new URLSearchParams(window.location.search);
        const surname = urlParams.get("name");
        const place = urlParams.get("place");
        if (surname) {
            $("#surname").val(surname);
            if (place) {
                $("#location").val(place);
            }
            $("#submit").click();
            this.setNewTitle();
        }
    }

    async startTheFetching(surname, location) {
        const $this = this;
        $this.reset();
        const [aborted, data] = await $this.getONSids(surname, location);
        if (aborted) {
            wtViewRegistry.showWarning("Data retrieval cancelled.");
            $this.disableCancel();
            $this.shakingTree.hide();
            // TODO: do whatever other cleanup should be done
            return;
        }
        const ids = data.response.profiles;
        const found = data.response.found;
        if (found === 0) {
            $this.disableCancel();
            $this.shakingTree.hide();
            wtViewRegistry.showWarning("No results found.");
            $("#refreshData").prop("disabled", false);
            return;
        } else if (found > 10000) {
            // Number to the nearest 1000 (rounding down)
            let roundedFound = Math.floor(found / 1000) * 1000;
            function formatNumber(number, locales, options) {
                return new Intl.NumberFormat(locales, options).format(number);
            }
            const formattedRoundedFound = formatNumber(roundedFound, "en-US");
            let message;
            let moreSpecific = "";
            if ($("#location").val().trim() !== "") {
                moreSpecific = "more specific ";
            }

            if (found < 40000) {
                const howLong = Math.floor(roundedFound / 4000);
                message = `<p>There are over ${formattedRoundedFound} results.</p>
                                   <p>This may take over ${howLong} minutes to load.</p>
                                   <p>You could cancel and try adding a ${moreSpecific}location.</p>`;
            } else {
                message = `<p>There are over ${formattedRoundedFound} results.</p>
                                   <p>This is too many for the app to handle.</p>
                                   <p>Please add a location and go again.</p>`;
                wtViewRegistry.showWarning(message);
                $this.disableCancel();
                $this.shakingTree.hide();
                return;
            }
            wtViewRegistry.showWarning(message);
        }
        $("#cancelFetch").show();

        $this.processBatches(ids, surname).then(() => $this.disableCancel());
    }

    documentReady() {
        this.addCategoryKeyToHelp();
        const $this = this;
        $("#submit").on("click.oneNameTrees", async function () {
            $this.shakingTree.show();
            $("div.error").remove(); // Remove any existing error messages
            wtViewRegistry.clearStatus();

            let surname = $("#surname").val();
            let location = $("#location").val().trim(); // Get the location from the new input field

            // If surname includes a comma, it's a list of surnames.
            this.surnames = surname.split(",");
            if (this.surnames.length > 1) {
                this.surnames = this.surnames.map((name) => name.trim());
                // Make this.surnames an array of surnames
                console.log("this.surnames", this.surnames);
            }

            // If surname is blank or includes a number, show an error message and return
            if (surname === "" || surname.match(/\d/)) {
                // alert("Please enter a valid surname."); Better to show a message on the page
                const errorHtml = `<div class='error'>Please enter a valid surname.</div>`;
                $("section#results").prepend(errorHtml);
                $this.triggerError();
                return;
            }

            if (surname) {
                $this.startTheFetching(surname, location);
            }
        });

        // Call the function to add the styles
        this.addStylesToHead();

        const helpModal = $("#help");
        // #helpButton: on click, show the help text in the modal and draggable
        helpModal.draggable();
        $("#helpButton,#closeHelp").on("click.oneNameTrees", function (e) {
            e.preventDefault();
            // Calculate the position of the helpButton
            const helpButtonOffset = $("#helpButton").offset();
            const helpButtonHeight = $("#helpButton").outerHeight();

            // Position the help modal below the helpButton and align it based on your design needs
            helpModal.css({
                position: "fixed",
                top: helpButtonOffset.top + helpButtonHeight + 10, // 10px for a little spacing from the button
                zIndex: 100000, // Ensure the modal is above other content; adjust as necessary
            });

            helpModal.slideToggle();
        });
        helpModal.on("dblclick.oneNameTrees", function (e) {
            e.preventDefault();
            helpModal.slideUp();
        });
        // Escape key closes the modal
        $(document).keyup(function (e) {
            if (e.key === "Escape") {
                helpModal.slideUp();
            }
        });

        $("#toggleDetails").on("click.oneNameTrees", function () {
            if ($(this).hasClass("off")) {
                $(this).removeClass("off").addClass("on");
                $(".dates").each(function () {
                    $this.showMoreDetails($(this), "show");
                });
            } else {
                $(this).removeClass("on").addClass("off");
                $(".dates").each(function () {
                    $this.showMoreDetails($(this), "hide");
                });
            }
        });

        $("#toggleWTIDs").on("click.oneNameTrees", function () {
            if ($(this).hasClass("off")) {
                $(this).removeClass("off").addClass("on");
                $(".wtid").show();
            } else {
                $(this).removeClass("on").addClass("off");
                $(".wtid").hide();
            }
        });

        $("#toggleGeneralStats").on("click.oneNameTrees", function () {
            if ($(this).hasClass("on") == false) {
                $(this).removeClass("off").addClass("on");
                $("#statsDisplay").slideDown();
            } else {
                $(this).removeClass("on").addClass("off");
                $("#statsDisplay").slideUp();
            }
        });

        $("#tableViewButton").on("click.oneNameTrees", function () {
            const $tableViewContainer = $("section#table");
            const $treeViewContainer = $("section#results");

            // Toggle visibility
            if ($treeViewContainer.is(":visible")) {
                $treeViewContainer.hide();
                $tableViewContainer.show();
                $(this).addClass("on").attr("title", "Click to return to trees view");
                // Check if the table needs to be built
                if ($tableViewContainer.find("table").length === 0) {
                    $this.shakingTree.show();
                    setTimeout(function () {
                        $this.buildTable(); // Function to dynamically build the table
                        $this.shakingTree.hide();
                    }, 0);
                }
                $("#treesButtons").removeClass("visible");
            } else {
                $treeViewContainer.show();
                $tableViewContainer.hide();
                $(this).removeClass("on").attr("title", "Show table view");
                $("#clearFilters").off().remove();
                $("#treesButtons").addClass("visible");
            }
            if ($("#periodButtonsContainer button.on").length) {
                $("#birthDateFilter").val($("#periodButtonsContainer button.on").text());
                $("#birthDateFilter").trigger("change");
            }

            $this.clearFiltersButton();
        });

        $this.loadFromURL();
    }

    exportTableToExcel() {
        const $this = this;

        const fileName =
            $("#surname").val() + "_" + new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19);

        const wb = XLSX.utils.book_new(); // Create a new workbook
        const ws_name = "TableData";

        // Prepare data for Excel
        let dataForExcel = [
            [
                "First",
                "LNAB",
                "Current",
                "Birth Date",
                "Birth Place",
                "Death Date",
                "Death Place",
                "Age",
                "Categories",
                "Templates",
                "Managers",
                "Created",
                "Modified",
            ],
        ];

        // Process each person for the table
        Object.keys(this.filteredResults).forEach(function (key) {
            const person = $this.filteredResults[key];
            const aName = new PersonName(person); // Assuming PersonName is a function you've defined elsewhere
            let givenNames = aName.withParts(["FirstNames"]); // Modify based on your actual method

            // Calculate age
            const age =
                person.BirthDate &&
                person.BirthDate !== "0000-00-00" &&
                person.DeathDate &&
                person.DeathDate !== "0000-00-00"
                    ? $this.familyTreeStats.calculateAgeAtDeath(person.BirthDate, person.DeathDate)
                    : "";

            function formatDate(dateString) {
                // Parse the string
                const year = dateString.substring(0, 4);
                const month = dateString.substring(4, 6);
                const day = dateString.substring(6, 8);

                // Format to YYYY-MM-DD
                return `${year}-${month}-${day}`;
            }

            // Process managers
            let managers = person.Managers ? person.Managers.map((manager) => manager.Name).join(", ") : "";

            // Process categories
            let categories = person.Categories ? person.Categories.join(", ") : "";

            // Process templates
            let templates = person.Templates
                ? person.Templates.map((template) => {
                      const params = Object.values(template.params).join("|");
                      return `{{${template.name}${params ? "|" + params : ""}}}`;
                  }).join(", ")
                : "";

            const created = person.Created ? formatDate(person.Created) : "";
            const modified = person.Touched ? formatDate(person.Touched) : "";

            dataForExcel.push([
                givenNames,
                person.LastNameAtBirth,
                person.LastNameCurrent,
                person.BirthDate,
                person.BirthLocation,
                person.DeathDate,
                person.DeathLocation,
                age,
                categories,
                templates,
                managers,
                created,
                modified,
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(dataForExcel);

        ws["!cols"] = [
            { wch: 20 }, // Adjust column widths as needed
            { wch: 15 },
            { wch: 15 },
            { wch: 12 },
            { wch: 25 },
            { wch: 12 },
            { wch: 25 },
            { wch: 5 },
            { wch: 30 },
            { wch: 50 }, // Templates might need more space
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, ws_name);

        const familyTreeStats = this.familyTreeStats;

        // General Statistics
        const generalStatsData = [
            ["General Statistic", "Value"],
            ["Total Individuals", familyTreeStats.getTotalPeople()],
            ["Average Lifespan", familyTreeStats.getAverageLifespan()],
            ["Total Children", familyTreeStats.getTotalChildren()],
            ["Average Children per Person", familyTreeStats.getAverageChildrenPerPerson()],
            ["Average Children per Male Over 16", familyTreeStats.getAverageChildrenPerMaleOver16()],
            // ... add other general statistics you need ...
        ];

        // Generate most common names and locations for the general statistics
        const mostCommonNames = this.familyTreeStats.getMostCommonNames();
        const mostCommonLocations = this.familyTreeStats.getMostCommonLocations();

        // Add most common names and locations to the general statistics data
        generalStatsData.push(
            ["Most Common Male Names", mostCommonNames.Male.map((n) => `${n.name} (${n.count})`).join(", ")],
            ["Most Common Female Names", mostCommonNames.Female.map((n) => `${n.name} (${n.count})`).join(", ")],
            ["Most Common Locations", mostCommonLocations.map((l) => `${l.name} (${l.count})`).join(", ")]
        );

        // Create a worksheet for general statistics
        const wsGeneralStats = XLSX.utils.aoa_to_sheet(generalStatsData);
        wsGeneralStats["!cols"] = [
            { wch: 30 }, // "Statistic" column width
            { wch: 20 }, // "Value" column width
        ];
        XLSX.utils.book_append_sheet(wb, wsGeneralStats, "General Statistics");

        // Prepare sheets for each period with most common names and locations
        const periodData = $this.familyTreeStats.getStatsBy50YearPeriods();

        Object.keys(periodData).forEach((periodKey) => {
            const periodStats = periodData[periodKey];
            const periodSheetData = [
                ["Statistic", "Value"],
                ["People", periodStats.peopleCount],
                ["Average Age at Death", periodStats.averageAgeAtDeath],
                [
                    "Most Common Male Names",
                    periodStats.mostCommonNames.Male.map((n) => `${n.name} (${n.count})`).join(", "),
                ],
                [
                    "Most Common Female Names",
                    periodStats.mostCommonNames.Female.map((n) => `${n.name} (${n.count})`).join(", "),
                ],
                [
                    "Most Common Locations",
                    periodStats.mostCommonLocations.map((l) => `${l.name} (${l.count})`).join(", "),
                ],
                // Include additional period-specific statistics as needed
            ];

            // Create a worksheet for this period's statistics
            const wsPeriod = XLSX.utils.aoa_to_sheet(periodSheetData);

            // Set column widths for the period worksheet
            wsPeriod["!cols"] = [
                { wch: 30 }, // For "Statistic" column
                { wch: 100 }, // For "Value" column, adjust width as needed based on content
            ];

            XLSX.utils.book_append_sheet(wb, wsPeriod, `${periodKey}`);
        });

        // Write the workbook to a file
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    }
};

class D3DataFormatter {
    constructor(statsByPeriod) {
        $("#locationsVisualization").remove();
        this.statsByPeriod = statsByPeriod;
        this.currentPeriodIndex = 0;
        this.locationHierarchy = { name: "All Periods", children: [] };
        this.nameBackgroundColours = [
            "#FFCCCB", // Light Red
            "#CCFFCC", // Light Green
            "#CCCCFF", // Light Blue
            "#FFFFCC", // Light Yellow
            "#FFCCFF", // Light Pink
            "#CCFFFF", // Light Cyan
            "#F0E68C", // Khaki
            "#E6E6FA", // Lavender
            "#FFFACD", // Lemon Chiffon
            "#FFE4E1", // Misty Rose
            "#FFEFD5", // Papaya Whip
            "#FFF0F5", // Lavender Blush
            "#F0FFF0", // Honeydew
            "#F5FFFA", // Mint Cream
            "#F0FFFF", // Azure
            "#FAEBD7", // Antique White
            "#FAF0E6", // Linen
            "#FFF5EE", // Seashell
            "#F5F5F5", // White Smoke
            "#F5F5DC", // Beige
        ];

        this.nameBorderColours = [
            "#20B2AA", // Light Sea Green
            "#9370DB", // Medium Purple
            "#FF4500", // Orange Red
            "#2E8B57", // Sea Green
            "#8B0000", // Dark Red
            "#483D8B", // Dark Slate Blue
            "#006400", // Dark Green
            "#4B0082", // Indigo
            "#FF8C00", // Dark Orange
            "#2F4F4F", // Dark Slate Gray
            "#8B008B", // Dark Magenta
            "#556B2F", // Dark Olive Green
            "#FFD700", // Gold
            "#800080", // Purple
            "#008080", // Teal
            "#DC143C", // Crimson
            "#00008B", // Dark Blue
            "#B8860B", // Dark Goldenrod
        ];
        this.createLocationHierarchy(statsByPeriod);
        this.sortLocationHierarchy();
        this.aggregateCounts(this.locationHierarchy);
        // console.log("Location Hierarchy:", JSON.parse(JSON.stringify(this.locationHierarchy)));
        // this.initVisualization();
    }

    aggregateCounts(node) {
        if (!node.children || node.children.length === 0) {
            return node.value || 0;
        }
        let total = 0;
        for (const child of node.children) {
            total += this.aggregateCounts(child); // Make sure to use this.aggregateCounts when calling recursively
        }
        node.count = total;
        return total;
    }

    formatLifespanData() {
        const sortedData = Object.entries(this.statsByPeriod)
            .sort(([periodA], [periodB]) => {
                // Assuming period format is "YYYY-YYYY", split and parse to get the start year
                const startYearA = parseInt(periodA.split("-")[0]);
                const startYearB = parseInt(periodB.split("-")[0]);
                return startYearA - startYearB; // Sort by start year
            })
            .map(([period, data]) => {
                const averageAgeAtDeath = data.deathsCount > 0 ? data.totalAgeAtDeath / data.deathsCount : 0;
                return {
                    period: period,
                    averageAgeAtDeath: parseFloat(averageAgeAtDeath.toFixed(2)),
                    peopleCount: data.peopleCount,
                };
            });
        return sortedData;
    }

    lifespanGraph() {
        const lifespanGraphDiv = $('<div id="lifespanGraph" class="graph popup"><x>x</x></div>');
        $("body").append(lifespanGraphDiv);
        lifespanGraphDiv.draggable();

        const margin = { top: 30, right: 10, bottom: 30, left: 40 };
        const width = $("#lifespanGraph").width() - margin.left - margin.right;
        const height = $("#lifespanGraph").height() - margin.top - margin.bottom;
        //            width = 600 - margin.left - margin.right,
        //            height = 400 - margin.top - margin.bottom;

        const svg = d3
            .select("#lifespanGraph")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const data = this.formatLifespanData().sort((a, b) => d3.ascending(a.period, b.period));

        const x = d3
            .scaleBand()
            .range([0, width])
            .domain(data.map((d) => d.period));
        const y = d3
            .scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data, (d) => d.averageAgeAtDeath)]);

        const line = d3
            .line()
            .x((d) => x(d.period) + x.bandwidth() / 2) // Center the line in the band
            .y((d) => y(d.averageAgeAtDeath));

        svg.append("path")
            .datum(data) // Bind data to the line
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line); // Use line generator to set "d"

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

        svg.append("g").call(d3.axisLeft(y));

        // Add rectangles for background color
        data.forEach((d) => {
            const textWidth = 40; // Adjust based on your actual text width
            const textHeight = 25; // Adjust based on your actual text height
            svg.append("rect")
                .attr("x", x(d.period) + x.bandwidth() / 2 - textWidth / 2)
                .attr("y", y(d.averageAgeAtDeath) - textHeight - 3)
                .attr("width", textWidth)
                .attr("height", textHeight)
                .attr("fill", "white") // Background color
                .attr("rx", 5); // Rounded corners
        });

        // Add numbers above each point
        svg.selectAll(".text")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", (d) => x(d.period) + x.bandwidth() / 2) // Center the text above the point
            .attr("y", (d) => y(d.averageAgeAtDeath) - 10) // Adjust position to be above the point
            .attr("text-anchor", "middle") // Center the text horizontally
            .text((d) => d.averageAgeAtDeath);

        // Add circles for each data point
        svg.selectAll(".point")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", (d) => x(d.period) + x.bandwidth() / 2)
            .attr("cy", (d) => y(d.averageAgeAtDeath))
            .attr("r", 5) // Size of the circle
            .attr("fill", "forestgreen"); // Color of the circle

        // Add a title to the graph
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 0 - margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "1em")
            .style("font-weight", "bold")
            .text("Average Lifespan");
    }

    formatNameDataForD3() {
        const sortedData = Object.entries(this.statsByPeriod)
            .sort(([periodA], [periodB]) => {
                // Sort by the start year of each period
                const startYearA = parseInt(periodA.split("-")[0]);
                const startYearB = parseInt(periodB.split("-")[0]);
                return startYearA - startYearB;
            })
            .map(([period, data]) => ({
                period: period,
                Male: data.Male,
                Female: data.Female,
            }));

        return sortedData;
    }

    formatNamesData() {
        // Sort periods in ascending order
        const topNamesByPeriod = this.getTopNamesByPeriod();

        // Now, create a table to display the data
        const tableDiv = $('<div id="namesTable" class="popup"><x>&times;</x></div>');
        $("body").append(tableDiv);
        tableDiv.draggable();
        const table = d3.select("#namesTable").append("table");
        table.append("caption").text("Most Common Names");

        table
            .append("thead")
            .append("tr")
            .selectAll("th")
            .data(["Period", "Male Names", "Female Names"])
            .enter()
            .append("th")
            .text((d) => d);

        const tbody = table.append("tbody");

        topNamesByPeriod.forEach((item) => {
            const row = tbody.append("tr");
            row.append("td").text(item.period); // Access the period directly
            row.append("td").html(this.formatNameList(item.Male)); // Access Male directly
            row.append("td").html(this.formatNameList(item.Female)); // Access Female directly
        });

        $(".name-span").click(function () {
            const clickedName = $(this).data("name");
            highlightName(clickedName);
        });

        function highlightName(nameToHighlight) {
            let anyHighlighted = false;

            // Check if any names are currently highlighted
            $(".name-span").each(function () {
                if ($(this).hasClass("highlighted")) {
                    anyHighlighted = true;
                }
            });

            // If any names are highlighted, reset all before proceeding
            if (anyHighlighted) {
                resetHighlighting();
                return;
            }

            // Apply new highlighting
            $(".name-span").each(function () {
                if ($(this).data("name") === nameToHighlight) {
                    $(this).css("opacity", "1").addClass("highlighted");
                } else {
                    $(this).css("opacity", "0.2").removeClass("highlighted");
                }
            });
        }

        // Function to reset highlighting
        function resetHighlighting() {
            $(".name-span").css("opacity", "1").removeClass("highlighted");
        }
    }

    // Helper function to format names list into HTML
    formatNameList(namesObject) {
        if (!namesObject) {
            return "";
        }
        return Object.entries(namesObject)
            .map(([name, count]) => {
                const { backgroundColour, borderColour } = this.getColorsForName(name); // Get colors for the name
                return `<span class="name-span" data-name="${name}" style="background-color: ${backgroundColour}; border: 2px solid ${borderColour}; padding: 2px; margin: 2px; display: inline-block;">${name} (${count})</span>`;
            })
            .join(" ");
    }

    // Method to get background and border color for a name
    getColorsForName(name) {
        const backgroundIndex = this.hashNameToIndex(name, this.nameBackgroundColours.length);
        const borderIndex = this.hashNameToIndex(name, this.nameBorderColours.length);
        return {
            backgroundColour: this.nameBackgroundColours[backgroundIndex],
            borderColour: this.nameBorderColours[borderIndex],
        };
    }

    // Hash function for name to index mapping
    hashNameToIndex(name, arrayLength) {
        let sum = 0;
        for (let i = 0; i < name.length; i++) {
            sum += name.charCodeAt(i);
        }
        return sum % arrayLength; // Ensure index is within the array bounds
    }

    // Method to get the top 10 names for each period, for both genders
    getTopNamesByPeriod() {
        const periods = Object.keys(this.statsByPeriod); // Get all the periods
        const topNamesByPeriod = periods.map((period) => {
            const periodData = this.statsByPeriod[period];
            const names = periodData.names;

            // Convert the names object for each gender into a sorted array and slice the top 10
            const topMaleNames = Object.entries(names.Male || {})
                .sort((a, b) => b[1] - a[1]) // Sort by count, descending
                .slice(0, 10)
                .reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {}); // Convert back to object

            const topFemaleNames = Object.entries(names.Female || {})
                .sort((a, b) => b[1] - a[1]) // Sort by count, descending
                .slice(0, 10)
                .reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {}); // Convert back to object

            return {
                period: period,
                Male: topMaleNames,
                Female: topFemaleNames,
            };
        });

        // Sort the periods in ascending order
        topNamesByPeriod.sort((a, b) => {
            const startYearA = parseInt(a.period.split("-")[0], 10);
            const startYearB = parseInt(b.period.split("-")[0], 10);
            return startYearA - startYearB;
        });

        return topNamesByPeriod;
    }

    // Locations bit

    createLocationHierarchy() {
        Object.entries(this.statsByPeriod).forEach(([periodName, stats]) => {
            let periodObj = { name: periodName, children: [], count: 0, id: periodName };
            Object.entries(stats.subdivisionCounts).forEach(([country, subdivisions]) => {
                let countryObj = { name: country, children: [], count: 0, id: `country-${country}` };
                Object.entries(subdivisions).forEach(([subdivisionName, details]) => {
                    if (subdivisionName !== "count") {
                        let subdivisionObj = {
                            name: subdivisionName,
                            children: [],
                            count: details.count,
                            id: `subdivision-${country}-${subdivisionName}`,
                        };
                        Object.entries(details).forEach(([locationName, locationDetails]) => {
                            if (locationDetails !== null && locationName !== "count") {
                                let locationObj = {
                                    name: locationName,
                                    value: locationDetails.count,
                                    id: `location-${country}-${subdivisionName}-${locationName}`,
                                };
                                subdivisionObj.children.push(locationObj);
                                subdivisionObj.count += locationDetails.count; // Aggregate count for the subdivision
                            }
                        });
                        countryObj.children.push(subdivisionObj);
                        countryObj.count += subdivisionObj.count; // Aggregate count for the country
                    }
                });
                periodObj.children.push(countryObj);
                periodObj.count += countryObj.count; // Aggregate count for the period
            });
            this.locationHierarchy.children.push(periodObj);
        });
    }

    sortLocationHierarchy() {
        this.locationHierarchy.children.sort((a, b) => a.name.localeCompare(b.name));
    }

    flattenLocationData(periodData) {
        let nodes = [],
            links = [],
            index = 0;
        const addNodesAndLinks = (node, parentId) => {
            const nodeId = index++;
            if (node.id !== periodData.id) {
                // Check to exclude the period node
                nodes.push({
                    ...node,
                    id: nodeId,
                    name: node.name,
                    value: node.value || node.count,
                    parentId,
                });

                if (parentId !== undefined) {
                    links.push({ source: parentId, target: nodeId });
                }
            }
            if (node.children) {
                node.children.forEach((child) =>
                    addNodesAndLinks(child, node.id === periodData.id ? undefined : nodeId)
                ); // Adjust parentId for children of the period node
            }
        };
        // Start adding nodes and links from the children of the period node, skipping the period node itself
        periodData.children.forEach((child) => addNodesAndLinks(child));
        return { nodes, links };
    }

    prepareDataForForceSimulation() {
        const { nodes, links } = this.flattenLocationData();
        return { nodes, links };
    }

    visualizeDataWithD3() {
        function updateVisualizationTitle(periodName) {
            $("#locationsVisualisation h2").text(periodName);
        }

        const periodData = this.locationHierarchy.children[this.currentPeriodIndex];
        const { nodes, links } = this.flattenLocationData(periodData);

        const divWidth = $("#locationsVisualisation").width();
        const divHeight = $("#locationsVisualisation").height() - 30;
        const width = 2000; // Adjustable dimensions for the canvas
        const height = 2000;

        // Ensure SVG container is initialized
        d3.select("#locationsVisualisation svg").remove(); // Clear previous SVG to prevent duplication
        const svg = d3.select("#locationsVisualisation").append("svg");

        // Create a 'g' element for zooming and panning
        const g = svg.append("g");

        svg.attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${divWidth} ${divHeight}`) // Initial viewable area, adjust as needed
            .call(
                d3.zoom().on("zoom", (event) => {
                    g.attr("transform", event.transform);
                })
            );

        // Initialize or update the main title
        updateVisualizationTitle(periodData.name);

        // Initialize layers
        const linkLayer = g.append("g").attr("class", "link-layer");
        const nodeLayer = g.append("g").attr("class", "node-layer");
        const labelLayer = g.append("g").attr("class", "label-layer");

        // Create links (lines)
        const link = linkLayer.selectAll("line").data(links).enter().append("line").style("stroke", "#aaa");

        // Define node size and color
        const nodeSize = (d) => Math.sqrt(d.count || 1) * 3 + 5;
        const nodeColor = (d) => (d.parentId === undefined ? "#ff4136" : "#69b3a2");
        const baseRadius = 5; // Base radius for other nodes
        const scaleFactor = 3; // Scaling factor for dynamic radius calculation

        // Create nodes (circles)
        const node = nodeLayer
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", nodeSize)
            .style("fill", nodeColor)
            .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

        // Create labels
        const label = labelLayer
            .selectAll("text")
            .data(nodes)
            .enter()
            .append("text")
            .attr("class", "label")
            .text((d) => d.name)
            .style("text-anchor", "middle")
            .style("fill", "#000")
            .style("font-size", "10px");

        // Modify the simulation setup to include a radial force
        const simulation = d3
            .forceSimulation(nodes)
            .force(
                "link",
                d3
                    .forceLink(links)
                    .id((d) => d.id)
                    .distance(50)
            )
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(divWidth / 2, divHeight / 2))
            .force(
                "collision",
                d3.forceCollide().radius((d) => Math.sqrt(d.count || 1) * scaleFactor + baseRadius)
            )
            .force(
                "radial",
                d3
                    .forceRadial((d) => (d.isLargest ? 0 : divWidth / 4), divWidth / 2, height / 2)
                    .strength((d) => (d.isLargest ? 0.1 : 0))
            )
            .force("x", d3.forceX(divWidth / 2).strength(0.1)) // Force towards center (X-axis)
            .force("y", d3.forceY(divHeight / 2).strength(0.1)) // Force towards center (Y-axis)

            .on("tick", ticked);

        simulation.on("tick", () => {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

            label.attr("x", (d) => d.x).attr("y", (d) => d.y - nodeSize(d) - 3);
        });

        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        function ticked() {
            // Apply bounding box constraints with epsilon buffer
            const epsilon = 5; // Adjust epsilon value as needed
            nodes.forEach((d) => {
                const radius = nodeSize(d);
                d.x = Math.max(radius + epsilon, Math.min(divWidth - radius - epsilon, d.x));
                d.y = Math.max(radius + epsilon, Math.min(divHeight - radius - epsilon, d.y));
            });

            // Update link and label positions
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y);

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

            label.attr("x", (d) => d.x).attr("y", (d) => d.y + radius + 3);
        }
    }

    initVisualization() {
        d3.select("#locationsVisualisation").remove();
        const locationsVisualisationDiv = $(
            "<div id='locationsVisualisation' class='popup visualisationContainer'><h2></h2><x>x</x></div>"
        );
        $("body").append(locationsVisualisationDiv);
        locationsVisualisationDiv.draggable(
            {
                containment: "window",
                scroll: false,
            },
            {
                stop: function (event, ui) {
                    // Save the new position
                    const position = ui.position;
                    //  console.log("New position:", position);
                },
            }
        );
        const controlButtons = `
        <div id="controlButtons">
            <button id="prevPeriod" title="See birth locations in the previous period">⏪</button>
            <button id="nextPeriod" title="See birth locations in the next period">⏩</button>
            <button id="startEvolution" class="active" title="Automatically move from one period to the next">▶️</button>
            <button id="stopEvolution" title="Stop automatic movement through the periods">⏹️</button>
        </div>
      `;

        locationsVisualisationDiv.append(controlButtons);

        $("#prevPeriod").on("click.oneNameTrees", () => this.showPreviousPeriod());
        $("#nextPeriod").on("click.oneNameTrees", () => this.showNextPeriod());
        $("#stopEvolution").on("click.oneNameTrees", () => this.stopEvolution());
        const $this = this;
        $("#controlButtons button").on("click.oneNameTrees", function () {
            $("#controlButtons button").removeClass("active");
            $this.stopEvolution();
            if ($(this).prop("id") === "startEvolution") {
                $(this).addClass("active");
                $this.startEvolution(7000);
            }
        });

        this.visualizeDataWithD3();
        this.startEvolution(7000);
    }

    updateVisualizationForPeriod() {
        // this.currentPeriodIndex = (this.currentPeriodIndex + 1) % this.locationHierarchy.children.length;
        this.visualizeDataWithD3();
    }

    prepareDataForPeriod(periodKey) {
        const periodData = this.locationHierarchy.children.find((p) => p.name === periodKey);
        if (!periodData) {
            console.error("No data for period:", periodKey);
            return { nodes: [], links: [] };
        }

        let nodes = [],
            links = [],
            nodeId = 0;
        const addNode = (node, parentId = null) => {
            const newNode = { id: nodeId++, name: node.name, value: node.value || node.count, group: parentId };
            nodes.push(newNode);
            if (parentId !== null) {
                links.push({ source: parentId, target: newNode.id });
            }
            if (node.children) {
                node.children.forEach((child) => addNode(child, newNode.id));
            }
        };

        addNode(periodData); // Initialize with the period's root node
        return { nodes, links };
    }

    showNextPeriod() {
        // Use the length of locationHierarchy.children for cycling through periods
        this.currentPeriodIndex = (this.currentPeriodIndex + 1) % this.locationHierarchy.children.length;
        this.updateVisualizationForPeriod();
    }

    showPreviousPeriod() {
        if (this.currentPeriodIndex === 0) {
            this.currentPeriodIndex = this.locationHierarchy.children.length - 1;
        } else {
            this.currentPeriodIndex -= 1;
        }
        this.updateVisualizationForPeriod();
    }

    startEvolution(intervalMs) {
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval); // Clear existing interval if it's already running
        }
        this.evolutionInterval = setInterval(() => {
            this.showNextPeriod();
        }, intervalMs);
    }

    stopEvolution() {
        if (this.evolutionInterval) {
            clearInterval(this.evolutionInterval);
            this.evolutionInterval = null; // Clear the interval ID
        }
    }
}
