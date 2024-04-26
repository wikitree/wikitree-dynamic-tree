import { FamilyTreeStatistics } from "./familytreestatistics.js";
import { D3DataFormatter } from "./d3dataformatter.js";
import { categoryMappings } from "./category_mappings.js";
import {
    usStatesDetails,
    EnglandCounties,
    ScotlandCounties,
    WalesCounties,
    IrelandCounties,
    canadaProvincesDetails,
    englandCountyAbbreviations,
} from "./location_data.js";

window.OneNameTrees = class OneNameTrees extends View {
    static APP_ID = "ONS";
    static VERBOSE = false;
    static PRIVACY_LEVELS = new Map([
        [60, { title: "Privacy: Open", img: "./views/cc7/images/privacy_open.png" }],
        [50, { title: "Public", img: "./views/cc7/images/privacy_public.png" }],
        [40, { title: "Private with Public Bio and Tree", img: "./views/cc7/images/privacy_public-tree.png" }],
        [35, { title: "Private with Public Tree", img: "./views/cc7/images/privacy_privacy35.png" }],
        [30, { title: "Public Bio", img: "./views/cc7/images/privacy_public-bio.png" }],
        [20, { title: "Private", img: "./views/cc7/images/privacy_private.png" }],
        [10, { title: "Unlisted", img: "./views/cc7/images/privacy_unlisted.png" }],
    ]);
    constructor(container_selector, person_id) {
        super(container_selector, person_id);

        this.shouldLogIds = [9202358, 9202367];

        this.userId =
            Cookies.get("wikidb_wtb_UserID") || Cookies.get("loggedInID") || Cookies.get("WikiTreeAPI_userId");
        this.defaultSettings = { periodLength: 50, onlyLastNameAtBirth: false };
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
        this.surnameWatchlistIds = null;
        this.watchlistIds = [];
        this.watchlist = JSON.parse(localStorage.getItem(`${this.userId}_watchlist`)) || null;
        this.watchlistPromise = null;
        this.centuries = this.parseCenturies($("#centuries").val());
        this.header = $("header");
        this.displayedIndividuals = new Set();
        this.displayedSpouses = new Set(); // New set to keep track of displayed spouses
        this.combinedResults = {};
        this.filteredResults = {};
        this.onlyLastNameAtBirth = {};
        this.sortedPeople = [];
        this.parentToChildrenMap = {};
        this.peopleById = {};
        this.peopleByIdKeys = [];
        this.familyTreeStats = {};
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
        this.storageManager = new LocalStorageManager();
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
            <input type="text" id="centuries" placeholder="Centuries (Optional)" /> 
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
            <img src="views/cc7/images/setting-icon.png" id="setting-icon" title="Settings" />
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
        
        <div id="loadingBarContainer">
            <div id="loadingBar"></div>
        </div>
        <!-- Placeholder for statistics -->
        <div id="statsDisplay">
          <div id="periodStatisticsContainer" style="display: none"></div>
        </div>
      </div>`;

        this.bodyHTML = `
      <div id="help" class="modal">
      <h2>About This</h2> 
      <button id="closeHelp">×</button>
      <button id="print">⎙</button>
      <ol>
        <li>Put a surname in the box and hit 'Go'. If you're likely to get too many results, you can enter a location and/or
         a century or centuries, too.  (The century box accepts a variety of input including a single number ("16"), 
         a list of numbers ("16,17" or "16 17"), a range of numbers ("16-19"), and a range of years (1500-1900).)</li>
        <li>
          The IDs of all public profiles with the surname (as Last Name at Birth, Current Last Name, or Other Name),
          plus any with variants of the surname as entered in the Google Sheet (click 'Variants')*, are fetched from
          WikiTree+**. This list is stored for the next time you enter the same surname. To refresh this list (to get the
          most up-to-date list available on WikiTree+), hit the 'Refresh' button.<br>
          * Alternatively, you can enter a list of surnames separated by commas in the Name box. If you want one name without
           the variants, just put the name and a comma in the box.<br> 
          ** Note that WikiTree+ is updated once a week, so new profiles may be missing from the results.
        </li>
        <li>
        As all of the IDs returned by WikiTree+ are for open public profiles, if you are logged into the apps server,
        you may be able to retrieve the data of more profiles. The app gets your watchlist to find any people who are 
        missing from the WikiTree+ results.
      </li>
        <li>
          The data of all of the profiles is fetched from the WikiTree apps server. This may take a very long time (see
          #8).
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
          suggestion to add a location or a century (or centuries).
        </li>
        <li>If a query has over 40,000 results (too many), you'll be asked to add a location or a century (or centuries) and go again.</li>
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
                as last name at birth. Click the button to see a graph.</li>
                <li><label>Average Lifespan</label>: The average lifespan of the people in the dataset. 
                Click the button to see a graph.</li>
                <li><label>Average Children per Male over 16</label>: This is per male over 16 
                because the dataset will include their children but not those of many of the women, 
                whose children would tend to take their father's surname 
                (due to this being a name study, mostly based on last name at birth).</li>
                <li><label>Average Children per Couple</label>: This is the average number of children per couple.</li>
                <li><label>Migrants</label>: The number of profiles with a birth place that is not the same as the death place. Click the button for a graph of migrations.</li>
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
                <li>are shown in 50 year periods by default, but the period length can be changed in the settings.</li>
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
        <li>Settings: The period length can be changed. The 'Only Last Name at Birth' checkbox will show only profiles with the target surname(s) as Last Name at Birth.
         The settings popup also has buttons to clear your cached data.</li>
        <li>Have I missed anything?</li>
      </ol>
    </div>
    <section id="results"></section>
    <section id="table"></section>`;

        this.settingsBox = $(`<div id="oneNameTreesSettings" class="popup">
            <x>x</x>
            <h2>Settings</h2>
            <div id="settings-content">
                <label for="periodLength">Period Length:
                <input type="number" min="10" max="200" step="5" id="periodLength" title="Period length (in years) for the Statistics" value="${
                    this.settings.periodLength
                }" />
                </label>
                <label for="onlyLastNameAtBirth">Only Last Name at Birth:
                <input type = "checkbox" id="onlyLastNameAtBirth" title="Show only profiles with the target surname(s) as Last Name at Birth" ${
                    this.settings.onlyLastNameAtBirth ? "checked" : ""
                } /> 
                </label>
                <button id="clearCache" title="Clear the cache of stored data for this surname">Clear cached ${
                    this.surname
                } items</button>
                <button id="clearCachedWatchlist" title="Clear the cache of stored data for the watchlist">Clear cached watchlist</button>
                <button id="clearCacheAll" title="Clear the cache of all stored data">Clear all cached items</button>
            </div>
        </div>`);
    }
    init(container_selector, person_id) {
        const view = new window.OneNameTrees(container_selector, person_id);
        view.start();
    }
    start() {
        $("#wt-id-text,#show-btn").prop("disabled", true).css("background-color", "lightgrey");
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
        this.header.on("keyup", "#surname,#location,#centuries", function (event) {
            const value = $("#surname").val().toLowerCase();
            const location = $("#location").val().toLowerCase();
            const centuries = $this.parseCenturies($("#centuries").val());
            // If we have saved data for this surname, show the refresh button
            const cacheKey = $this.buildCacheKey(value, location, centuries);
            if (value && localStorage.getItem(cacheKey)) {
                $("#refreshData").show();
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
            const centuries = $this.parseCenturies($("#centuries").val());
            this.centuries = centuries;

            $("#cancelFetch").trigger("click");
            $("#refreshData").fadeOut();
            if (surname) {
                $this.showLoadingBar();
                $this.shakingTree.show();
                setTimeout(function () {
                    wtViewRegistry.clearStatus();
                    wtViewRegistry.showNotice("Refreshing data...");
                }, 100);
                $this.reset();
                $this.clearONSidsCache(surname); // Clear the cache for this surname
                $this.startTheFetching(surname, location, centuries);
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
                const location = $("#location").val();
                const centuries = $("#centuries").val();

                // Prepare the file name with surname, location, and centuries
                // Replace spaces with underscores and remove characters that might be problematic in file names

                const safeSurname = surname.replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "");
                const safeLocation = location.replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "");
                const safeCenturies = centuries.replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "");

                // Conditionally add location and centuries to the file name if they are provided
                let fileNameParts = [`ONT_${safeSurname}`];
                if (safeLocation) fileNameParts.push(safeLocation);
                if (safeCenturies) fileNameParts.push(safeCenturies);

                const fileName = fileNameParts.join("_") + "_" + new Date().toISOString().substring(0, 16) + ".json";
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
                    wtViewRegistry.showNotice("Loading data...");
                    const storageObject = JSON.parse(e.target.result);
                    $this.combinedResults = storageObject.data;
                    const treeHtml = storageObject.html;
                    $("#surname").val(storageObject.surname);
                    $("#location").val(storageObject.location);
                    $("#centuries").val(storageObject.centuries);
                    $("section#results").empty().html(treeHtml); // Load the HTML
                    $this.setupToggleButtons(); // Reinitialize any event listeners

                    $this.displayedIndividuals.clear();
                    $this.displayedSpouses.clear();
                    $this.parentToChildrenMap = {};

                    $this.filterResults();

                    $this.filterFilteredResultsByLNAB();

                    const theSet =
                        $this.settings.onlyLastNameAtBirth == true ? $this.onlyLastNameAtBirth : $this.filteredResults;
                    let sortedPeople = $this.sortPeopleByBirthDate(theSet);

                    $this.parentToChildrenMap = $this.createParentToChildrenMap(sortedPeople);

                    $this.peopleById = $this.createPeopleByIdMap(sortedPeople);

                    $this.completeDisplay();
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

            // Define a mapping of class names to graph IDs
            const classToGraphId = {
                ".averageLifespan": "#lifespanGraph",
                ".totalPeople": "#peopleCountGraph",
                ".mostCommonNames": "#namesTable",
                ".unsourced": "#unsourcedProfiles",
                ".unconnected": "#unconnectedProfiles",
                ".noRelations": "#noRelationsProfiles",
                ".mostCommonLocations": "#locationsVisualisation",
                ".migrants": "#migrationSankey",
                ".periodMigrants": "#periodMigrants",
            };

            // Find the graph ID based on the closest matching class
            Object.keys(classToGraphId).forEach((className) => {
                if ($(this).closest(className).length > 0) {
                    graphId = classToGraphId[className];
                }
            });

            // Proceed if a matching graphId was found
            if (graphId) {
                const graph = $(graphId);
                graph.toggle();
                if (graph.is(":visible")) {
                    graph.css("display", "inline-block");

                    if (!["#locationsVisualisation", "#namesTable", "#migrationSankey"].includes(graphId)) {
                        graph.css("top", $(this).position().top + $(this).outerHeight() + 20 + "px");
                        // Make sure it's not off the right side of the screen
                        const windowWidth = $(window).width();
                        const graphWidth = graph.outerWidth();
                        let leftPosition = $(this).position().left + $(this).outerWidth() / 2 - graphWidth / 2;

                        // Adjust if off the right side of the screen
                        if (leftPosition + graphWidth > windowWidth) {
                            leftPosition = windowWidth - graphWidth - 20;
                        }
                        // Adjust if off the left side of the screen
                        if (leftPosition < 0) {
                            leftPosition = 20;
                        }

                        graph.css("left", leftPosition + "px");
                    }
                    /*
                    const graphZindex = graph.css("z-index");
                    if (graphZindex < $this.popupZindex) {
                        graph.css("z-index", $this.popupZindex);
                    } else {
                        $this.popupZindex++;
                        graph.css("z-index", parseInt(graphZindex) + 1);
                    }
                    */
                    $this.setHighestZIndex(graph);
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
                const highestZIndex = $this.getElementWithHighestZIndex(".popup,.modal");

                if (highestZIndex) {
                    closePopup(highestZIndex);
                    highestZIndex.fadeOut();
                }
            }
        });

        function closePopup(el) {
            el.slideUp();
            const idToLabelMap = {
                lifespanGraph: ".averageLifespan label",
                peopleCountGraph: ".totalPeople label",
                namesTable: ".mostCommonNames label",
                unsourcedProfiles: ".unsourced label",
                unconnectedProfiles: ".unconnected label",
                noRelationsProfiles: ".noRelations label",
                locationsVisualisation: ".mostCommonLocations label",
                migrationSankey: ".migrants label",
                periodMigrants: ".periodMigrants label",
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
            $("#clearCache").text(`Clear cached ${$this.surname} items`);

            // Place the settings box in the centre of the screen and make it draggable.
            $this.centerAndMakeDraggable($this.settingsBox);
            $this.settingsBox.fadeToggle();
        });

        $(document).on("click.oneNameTrees", "#oneNameTreesSettings x", function () {
            $this.updateSettings();
        });

        $(document).on("click.oneNameTrees", "#help #print", function () {
            // Check if the new window can be opened
            const printWindow = window.open("", "_blank");
            if (printWindow) {
                // Function to create HTML content for printing
                const createPrintContent = (content) => {
                    return `<html>
                                <head>
                                    <title>One Name Trees Help</title>
                                    <style>
                                        body {
                                            font-family: Arial, sans-serif;
                                        }
                                        h2, h3 {
                                            font-size: large;
                                            text-align: center;
                                            background-color: #f7f6f0;
                                        }
                                        h3{
                                            font-size: medium;
                                        }
                                        ol {
                                            margin: 1em;
                                            list-style: decimal outside;
                                        }
                                        li {
                                            margin: 0.3em;
                                        }
                                        span.symbol img{
                                            width: 1em;
                                        }
                                        button {
                                            display:none;
                                        }
                                    </style>
                                </head>
                                <body>
                                    ${content} 
                                </body>
                            </html>`;
                };

                // Retrieve the content from the help section
                const helpContent = $("#help").html();

                // Write the content to the new window
                printWindow.document.write(createPrintContent(helpContent));
                printWindow.document.close(); // Close the document stream

                // Trigger the print dialog
                printWindow.print();
            } else {
                alert("Unable to open the print window. Please check your popup blocker settings.");
            }
        });

        $(document).on("click.oneNameTrees", ".popup,.modal", function (e) {
            $this.setHighestZIndex($(this));
        });

        $(document).on("click.oneNameTrees", ".DNA", async function () {
            $this.shakingTree.show();

            const wtid = $(this).parent().data("name") || $(this).closest("tr").data("name");

            let existingModal = $(`.dnaTestModal[data-id="${wtid}"]`);
            if (existingModal.length) {
                $this.setHighestZIndex(existingModal);
                existingModal.show();
                $this.shakingTree.hide();

                return;
            }

            try {
                this.cancelFetchController = new AbortController();
                const signal = this.cancelFetchController.signal;

                // First API call: Get DNA Tests by Test Taker

                const dNATestsResult = await WikiTreeAPI.postToAPI(
                    {
                        appId: OneNameTrees.APP_ID,
                        action: "getDNATestsByTestTaker",
                        key: wtid,
                    },
                    signal
                );

                // Conditional second API call

                const connectedDNATestsResult = await WikiTreeAPI.postToAPI(
                    {
                        appId: OneNameTrees.APP_ID,
                        action: "getConnectedDNATestsByProfile",
                        key: wtid,
                    },
                    signal
                );

                // Further processing if connected DNA tests are found
                if (connectedDNATestsResult && connectedDNATestsResult.length > 0) {
                    const connectedProfilesPromises = connectedDNATestsResult[0].dnaTests.map((test) => {
                        return WikiTreeAPI.postToAPI(
                            {
                                appId: OneNameTrees.APP_ID,
                                action: "getConnectedProfilesByDNATest",
                                key: wtid, // Adjust key if necessary
                                dna_id: test.dna_id,
                            },
                            signal
                        );
                    });

                    const connectedProfilesResults = await Promise.all(connectedProfilesPromises);

                    let dataThing = $(this).parent();
                    if (!dataThing.data("name")) {
                        dataThing = $(this).closest("tr");
                    }

                    // Display results
                    $this.showDNATestResults(
                        dNATestsResult,
                        connectedDNATestsResult,
                        connectedProfilesResults,
                        dataThing
                    );
                } else {
                }
            } catch (error) {
                console.error("An error occurred:", error);
                console.log("Error handling DNA data fetching or processing.");
            }
            $this.shakingTree.hide();
        });

        $(document).on("click.oneNameTrees", "#clearCache", function () {
            const surname = $("#surname").val();
            $this.storageManager.clearCachedItems(surname);
        });
        $(document).on("click.oneNameTrees", "#clearCacheAll", function () {
            $this.storageManager.clearCachedItems();
        });
        $(document).on("click.oneNameTrees", "#clearCachedWatchlist", function () {
            $this.storageManager.clearCachedWatchlist();
        });

        $(document).on("click.oneNameTrees", ".dnaTestModal .close-button", function () {
            $(this).closest(".dnaTestModal").fadeOut();
        });
    }

    centerAndMakeDraggable(thing, options = {}) {
        // Function to center the settings box
        function center(thing) {
            const winWidth = $(window).width();
            const winHeight = $(window).height();
            const boxWidth = thing.outerWidth();
            const boxHeight = thing.outerHeight();

            // Calculate positions
            const leftPosition = (winWidth - boxWidth) / 2;
            const topPosition = (winHeight - boxHeight) / 2;

            // Apply positions
            thing.css({
                left: `${leftPosition}px`,
                top: `${topPosition}px`,
            });
        }

        // Center the settings box initially
        center(thing);

        // Make the settings box draggable
        if (options.handle) {
            thing.draggable({ handle: options.handle });
        } else {
            thing.draggable();
        }

        // Optional: Recenter the settings box on window resize
        $(window).resize(center(thing));
    }

    setHighestZIndex(jq) {
        // find the highest z-index of all elements on the page
        this.popupZindex = Math.max.apply(
            null,
            $.map($("*"), function (e) {
                if ($(e).css("position") == "absolute" || $(e).css("position") == "fixed")
                    return parseInt($(e).css("z-index")) || 1;
            })
        );

        this.popupZindex++;

        jq.css("z-index", this.popupZindex);
    }

    getElementWithHighestZIndex(classes) {
        let highestZIndex = 0;
        let elementWithHighestZIndex = null;

        // Iterate over each element that matches the classes
        $(classes).each(function () {
            // Get the current z-index of the element
            const currentZIndex = parseInt($(this).css("z-index"), 10);

            // Check if the current z-index is higher than what we've seen so far
            if (currentZIndex > highestZIndex) {
                highestZIndex = currentZIndex; // Update the highest known z-index
                elementWithHighestZIndex = $(this); // Keep a reference to the element with this z-index
            }
        });

        return elementWithHighestZIndex; // Return the element with the highest z-index
    }

    async showDNATestResults(dnaTests, connectedDNATests, connectedProfiles, parent) {
        // Ensure only one modal instance
        if ($("#dnaTestModal").length) {
            $("#dnaTestModal").remove();
        }

        const data = parent.data();
        const popup = $(`
            <div class="modal dnaTestModal" data-id="${data.name}" style="display:none;">
                <div class="modal-content">
                    <span class="close-button">×</span>
                    <h2>${data.fullName}: DNA Test Results</h2>
                    <div class="dnaTestResults" class="results-container"><h3>DNA Tests</h3></div>
                </div>
            </div>
        `);
        // find the highest z-index of all elements on the page
        this.popupZindex = Math.max.apply(
            null,
            $.map($("*"), function (e) {
                if ($(e).css("position") == "absolute") return parseInt($(e).css("z-index")) || 1;
            })
        );
        this.popupZindex++;
        popup.css("z-index", this.popupZindex);

        $("body").append(popup);
        this.centerAndMakeDraggable(popup, { handle: "h2" });
        popup.off("dblclick.oneNameTrees").on("dblclick.oneNameTrees", function (e) {
            $(this).fadeOut();
        });

        // Method to populate DNA Test results, modified to handle the provided data structure.
        const selector = popup.find(".dnaTestResults");
        await this.populateTestResults(selector, connectedDNATests, connectedProfiles);

        const parentTop = parent.offset().top - $(window).scrollTop();
        const modalTop = parentTop + parent.outerHeight() + 20;
        popup.css("top", modalTop + "px");

        // Adjust if the popup goes off the bottom of the screen
        const windowHeight = $(window).height();
        const modalHeight = popup.outerHeight(true);
        const bottomOverlap = modalTop + modalHeight - windowHeight;
        if (bottomOverlap > 0) {
            popup.css("top", modalTop - bottomOverlap - 20 + "px"); // Extra 20px for margin
        }

        popup.fadeIn();
    }

    async populateTestResults(containerSelector, connectedDNATests, connectedProfiles) {
        const container = $(containerSelector);
        container.empty(); // Clear previous content

        // Prepare an array to hold all promises created by the async operations
        const promises = [];

        connectedDNATests.forEach((testGroup) => {
            testGroup.dnaTests.forEach((test) => {
                // Attempt to find connected profiles for this test
                const connectedTestProfiles = this.findConnectedProfiles(test.dna_id, connectedProfiles);

                // Add the promise returned by buildTestCardHtml to our array
                const promise = this.buildTestCardHtml(test, connectedTestProfiles).then((testHtml) => {
                    container.append(testHtml);
                });
                promises.push(promise);
            });
        });

        // Wait for all promises to resolve
        await Promise.all(promises);
    }

    findConnectedProfiles(dnaTestId, connectedProfiles) {
        // Flattening the nested array structure of connectedProfiles to search for the dnaTestId
        const flatProfiles = connectedProfiles.flat();
        return flatProfiles.find((profile) => profile.dnaTest?.dna_id === dnaTestId)?.connections || [];
    }

    makeWikiTreeLink(wtid, person = null) {
        let fullName;
        if (person) {
            const aName = new PersonName(person);
            fullName = aName.withParts(["FullName"]);
        }
        return `<a href="https://www.wikitree.com/wiki/${wtid}" target="_blank">${fullName ? fullName : wtid}</a>`;
    }

    async getDNAConnections(connectedProfiles) {
        const $this = this;
        let missingProfileIds = connectedProfiles
            .filter((profile) => !$this.combinedResults[profile.Id])
            .map((profile) => profile.Id);

        // Check if there are any missing profiles to fetch
        if (missingProfileIds.length > 0) {
            try {
                // Construct your API call to fetch missing profiles. The specifics of this call
                // depend on the API you're using (e.g., batch requests or individual gets)
                const fetchedProfiles = await this.getPeople(missingProfileIds, 0, 1000);

                const theProfiles = fetchedProfiles?.[2];
                // These are objects with the profile ID as the key.  Need an array of the profiles.
                if (!theProfiles) {
                    console.error("No profiles found for the provided IDs.");
                    return;
                }
                const people = Object.keys(theProfiles).map((key) => theProfiles[key]);
                // Process and integrate fetched profiles into $this.combinedResults
                people.forEach((profile) => {
                    // Assume the API returns an array of profile objects
                    // This assumes you have a method to process or directly use the profile data
                    $this.combinedResults[profile.Id] = profile;
                });
                return;
            } catch (error) {
                console.error("Failed to fetch data for missing profiles:", error);
            }
        }
    }

    async buildTestCardHtml(test, connectedProfiles) {
        const $this = this;
        await this.getDNAConnections(connectedProfiles);
        let connectionsHtml = "<ul class='dnaConnections'>";
        if (connectedProfiles.length > 0) {
            connectedProfiles.forEach((profile) => {
                const person = $this.combinedResults[profile.Id];

                // use PersonName to get the name of the person
                if (person) {
                    connectionsHtml += `<li class='${person.Gender}'>${$this.makeWikiTreeLink(
                        profile.Name,
                        person
                    )} (${this.formatDate(person.BirthDate)}–${this.formatDate(person.DeathDate)})</li>`;
                } else {
                    connectionsHtml += `<li>${$this.makeWikiTreeLink(profile.Name)}</li>`;
                }
            });
        } else {
            connectionsHtml = "<li>No connections available.</li>";
        }
        connectionsHtml += "</ul>";

        return `
            <div class="dna-test-card">
                <h4>${test.dna_name} (${test.dna_type})</h4>
                <p>Assigned by: ${test.assignedBy || "N/A"}</p>
                <p>Date Assigned: ${test.assigned ? new Date(test.assigned).toLocaleDateString() : "N/A"}</p>
                ${test.markers ? `<p>Markers: ${test.markers}</p>` : ""}
                ${test.haplo ? `<p>Haplogroup: ${test.haplo}</p>` : ""}
                ${test.mttype ? `<p>MT Type: ${test.mttype}</p>` : ""}
                ${test.ysearch ? `<p>YSearch ID: ${test.ysearch}</p>` : ""}
                ${test.mitosearch ? `<p>MitoSearch ID: ${test.mitosearch}</p>` : ""}
                ${test.ancestry ? `<p>Ancestry: ${test.ancestry}</p>` : ""}
                ${test.ftdna ? `<p>FTDNA: ${test.ftdna}</p>` : ""}
                ${test.gedmatch ? `<p>Gedmatch ID: ${test.gedmatch}</p>` : ""}
                ${test.haplom ? `<p>Maternal Haplogroup: ${test.haplom}</p>` : ""}
                ${test.mitoydna ? `<p>MITO YDNA: ${test.mitoydna}</p>` : ""}
                ${test.yourDNAportal ? `<p>Your DNA Portal: ${test.yourDNAportal}</p>` : ""}
                ${connectedProfiles.length > 0 ? `<div>Connections: ${connectionsHtml}</div>` : ""}
            </div>
        `;
    }

    parseCenturies(input) {
        let centuries = [];
        if (!input) return centuries;

        // Splitting the input on commas and spaces for processing
        input = input
            .toLowerCase()
            .replace(/ to /g, "-")
            .replace(/[\u2013\u2014]/g, "-")
            .trim();
        let parts = input.split(/[\s,]+/);

        parts.forEach((part) => {
            if (part.includes("-")) {
                // Handling ranges
                let [start, end] = part.split("-").map((p) => p.trim());
                let startCentury, endCentury;

                // Adjust for start of range
                startCentury = start.match(/\d{4}s?$/) ? Math.ceil(parseInt(start) / 100) : parseInt(start);
                if (start.match(/\d{4}s$/)) startCentury++; // Increment for decades '1500s'

                // Adjust for end of range
                endCentury = end.match(/\d{4}s?$/) ? Math.ceil(parseInt(end) / 100) : parseInt(end);
                if (end.match(/\d{4}s$/)) endCentury++; // Increment for decades '2000s'

                // For cases like '1500-1800' where start is a year without 's'
                if (start.match(/\d{4}$/) && !start.endsWith("s")) startCentury++;

                // Populate range
                for (let i = startCentury; i <= endCentury; i++) {
                    centuries.push(i);
                }
            } else {
                // Handling individual years, centuries, and decades
                let century = part.match(/\d{4}s?$/) ? Math.ceil(parseInt(part) / 100) : parseInt(part);
                if (part.match(/\d{4}s$/)) century++; // Increment for decades '1500s'
                centuries.push(century);
            }
        });

        // Adjust for specific years like '1500' directly
        centuries = centuries.map((c) => {
            if (input.match(/\d{4}(?!s)/) && !input.includes("-")) {
                return c + 1;
            }
            return c;
        });

        // Deduplicate and sort
        centuries = Array.from(new Set(centuries)).sort((a, b) => a - b);

        return centuries;
    }

    updateSettings() {
        // Get all the settings from the settings box and update the settings object.
        // Keys are IDs of the input elements in the settings box.
        // Get all inputs.  Get their IDs and values and update the settings object.
        const $this = this;
        const beforeSettings = JSON.parse(JSON.stringify(this.settings));
        const inputs = this.settingsBox.find("input");
        inputs.each(function () {
            const id = $(this).attr("id");
            // If the input is a checkbox, use the checked property, otherwise use the value property.
            const value = $(this).attr("type") === "checkbox" ? $(this).prop("checked") : $(this).val();
            $this.settings[id] = value;
        });
        localStorage.setItem("oneNameTreesSettings", JSON.stringify(this.settings));

        if (beforeSettings.onlyLastNameAtBirth !== this.settings.onlyLastNameAtBirth) {
            this.reload();
        } else if (beforeSettings.periodLength !== this.settings.periodLength) {
            this.updateStatistics();
        }
    }

    reload() {
        const $this = this;
        const tempOnlyLNAB = this.onlyLastNameAtBirth;
        const tempFiltered = this.filteredResults;
        const tempCombined = this.combinedResults;
        this.reset();
        this.onlyLastNameAtBirth = tempOnlyLNAB;
        this.filteredResults = tempFiltered;
        this.combinedResults = tempCombined;
        const theSet = $this.settings.onlyLastNameAtBirth == true ? $this.onlyLastNameAtBirth : $this.filteredResults;
        let sortedPeople = $this.sortPeopleByBirthDate(theSet);
        $this.parentToChildrenMap = $this.createParentToChildrenMap(sortedPeople);
        $this.peopleById = $this.createPeopleByIdMap(sortedPeople);
        wtViewRegistry.showNotice("Rebuilding trees...");
        $this.displayDescendantsTree($this.peopleById, $this.parentToChildrenMap);
    }

    filterFilteredResultsByLNAB() {
        const surnameVariants = this.getSurnameVariants();
        const filteredResults = this.filteredResults;

        // Convert the object to an array of [key, value] pairs, filter, then convert back
        const filteredResultsByLNAB = Object.fromEntries(
            Object.entries(filteredResults).filter(([id, person]) => {
                return surnameVariants.includes(person.LastNameAtBirth);
            })
        );

        this.onlyLastNameAtBirth = filteredResultsByLNAB;
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
        } catch (error) {}
    }

    parseAndStoreCSV(csvData) {
        this.nameVariants = this.parseCSV(csvData);
        this.storeData(this.nameVariants);
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
            // Trim and remove any blank surnames
            this.surnames = this.surnames.map((name) => name.trim()).filter((name) => name);
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
        wtViewRegistry.showNotice("Cancelling data retrieval...");
        this.cancelling = true;
        if (this.cancelFetchController) {
            this.cancelFetchController.abort();
            this.updateLoadingBar(0);
            this.hideLoadingBar();
        }
        /*
        $("#refreshData").prop("disabled", false);
        $("#loadButton").prop("disabled", false);
        */
    }

    buildQuery(centuries, locationBit, surname, dna = "") {
        const surnameVariants = this.getSurnameVariants();
        // Helper function to create query parts for a single century
        const dnaBit = dna ? ` DNA%3D"${dna}"` : "";
        const queryPartForCentury = (century, locationBit, variant) => {
            const centuryBit = century ? `${century}Cen+` : "";
            return (
                `${centuryBit}${locationBit}LastNameatBirth%3D"${variant}"${dnaBit}` +
                `+OR+${centuryBit}${locationBit}CurrentLastName%3D"${variant}"${dnaBit}` +
                `+OR+${centuryBit}${locationBit}LastNameOther%3D"${variant}"${dnaBit}`
            );
        };

        // Ensure we have an array for centuries
        centuries = centuries || [];

        // Construct the base query parts
        let queries = [];
        const variants = surnameVariants.length > 0 ? surnameVariants : [surname];
        variants.forEach((variant) => {
            if (centuries.length === 0) {
                // If no centuries are provided, just use the location and variant
                queries.push(queryPartForCentury(null, locationBit, variant));
            } else {
                // For each century, add a query part
                centuries.forEach((century) => {
                    queries.push(queryPartForCentury(century, locationBit, variant));
                });
            }
        });

        // Combine all query parts with "OR"
        let query = queries.join("+OR+");

        return query;
    }

    buildCacheKey(surname, location, centuries) {
        // Normalize surname: lowercase and replace spaces with underscores
        let cacheKey = `ONTids_${surname.replace(/\s+/g, "_").toLowerCase()}`;

        // Normalize location: lowercase, trim, replace spaces with underscores, and encode URI components
        if (location) {
            let normalizedLocation = location.trim().replace(/\s+/g, "_").toLowerCase();
            normalizedLocation = encodeURIComponent(normalizedLocation);
            cacheKey += `_${normalizedLocation}`;
        } else {
            cacheKey += "_";
        }

        // Ensure centuries is an array and sort it to avoid duplicate keys for the same set of centuries in different orders
        if (!Array.isArray(centuries)) {
            centuries = this.parseCenturies(centuries);
        }
        centuries.sort((a, b) => a - b); // Sort centuries in ascending order

        // Append centuries to the key, joined with a consistent delimiter
        if (centuries.length) {
            cacheKey += `_${centuries.join("-")}`; // Use a hyphen to separate centuries for readability
        } else {
            cacheKey += "_";
        }

        return cacheKey;
    }

    async getONTids(surname, location, centuries) {
        this.storageManager.clearONSidsCache();

        wtViewRegistry.clearStatus();
        this.setNewTitle();

        // Generate a cache key that includes the surname, location, and centuries
        const cacheKey = this.buildCacheKey(surname, location, centuries);
        this.activateCancel();

        // Attempt to retrieve cached data using the generated cache key
        const cachedDataString = localStorage.getItem(cacheKey);
        if (cachedDataString) {
            const cachedData = JSON.parse(cachedDataString);

            $("#refreshData").show();

            this.yDNAdata = cachedData.yDNA;
            this.auDNAdata = cachedData.auDNA;

            return [false, cachedData]; // Return cached data if available
        }

        // Prepare queries for data fetching
        const queries = [
            { name: "main", query: this.buildQuery(centuries, location, surname) },
            { name: "auDNA", query: this.buildQuery(centuries, location, surname, "auDNA") },
            { name: "yDNA", query: this.buildQuery(centuries, location, surname, "yDNA") },
        ];

        try {
            this.cancelFetchController = new AbortController();

            const data = await Promise.all(
                queries.map(async ({ name, query }) => {
                    const url = `https://plus.wikitree.com/function/WTWebProfileSearch/Profiles.json?Query=${query}&MaxProfiles=100000&Format=JSON`;
                    const response = await fetch(url, { signal: this.cancelFetchController.signal });
                    wtViewRegistry.showNotice(`Fetching ${name} IDs from WikiTree+...`);

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                    }

                    return { [name]: await response.json() };
                })
            ).then((results) => Object.assign({}, ...results));

            // Cache the fetched data
            localStorage.setItem(cacheKey, JSON.stringify(data));

            this.yDNAdata = data.yDNA;
            this.auDNAdata = data.auDNA;

            return [false, data];
        } catch (error) {
            console.error("Error when fetching from WT+ or saving data:", error);
            if (error.name !== "AbortError") {
                $("#dancingTree").fadeOut();
                wtViewRegistry.showWarning("No response from WikiTree +. Please try again later.");
            }
            return [true, null];
        }
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
            const starttime = performance.now();
            const [aborted, theresMore, people] = await this.getPeople(ids, start, limit, options);
            if (aborted) {
                return [true, 0];
            }

            const callTime = performance.now() - starttime;
            const nrProfiles = this.numberOfProfiles(people);
            //log(`Page ${callNr}: Received ${nrProfiles} profiles (start:${start}) in ${callTime}ms`);
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
    isCorrectLocationMatch(location, input, exclusionMap) {
        const lowerLocation = this.standardizeString(location);
        const lowerInput = this.standardizeString(input);

        if (lowerLocation.includes(lowerInput)) {
            const exclusion = exclusionMap[lowerInput];
            if (exclusion && lowerLocation.includes(this.standardizeString(exclusion))) {
                return false; // Exclude because the long name is present which should not be
            }
            return true; // Valid match found
        }
        return false; // No match found
    }

    // Helper function for location matching
    isLocationMatch(person, locationInput) {
        if (!locationInput) {
            return true;
        }
        const standardizedLocationInput = this.standardizeString(locationInput);
        const birthLocation = this.standardizeString(person.BirthLocation);
        const deathLocation = this.standardizeString(person.DeathLocation);

        // Evaluate each location against potential confusion
        let matchBirthLocation =
            birthLocation.includes(standardizedLocationInput) &&
            !this.isConfusingLocation(locationInput, birthLocation);
        let matchDeathLocation =
            deathLocation.includes(standardizedLocationInput) &&
            !this.isConfusingLocation(locationInput, deathLocation);

        // Check for US location match
        if (
            ["united states", "u.s.a.", "united states of america"].some((term) =>
                standardizedLocationInput.includes(term)
            )
        ) {
            if (
                usStatesDetails.some(
                    (state) =>
                        (matchBirthLocation &&
                            (birthLocation.includes(this.standardizeString(state.name)) ||
                                birthLocation.includes(state.abbreviation.toLowerCase()))) ||
                        (matchDeathLocation &&
                            (deathLocation.includes(this.standardizeString(state.name)) ||
                                deathLocation.includes(state.abbreviation.toLowerCase())))
                )
            ) {
                return true;
            }
        }

        // Check for Canada location match
        if (standardizedLocationInput.includes("canada")) {
            if (
                canadaProvincesDetails.some(
                    (province) =>
                        (matchBirthLocation &&
                            (birthLocation.includes(this.standardizeString(province.name)) ||
                                birthLocation.includes(province.abbreviation.toLowerCase()))) ||
                        (matchDeathLocation &&
                            (deathLocation.includes(this.standardizeString(province.name)) ||
                                deathLocation.includes(province.abbreviation.toLowerCase())))
                )
            ) {
                return true;
            }
        }

        // Check for UK location match
        if (["united kingdom", "uk"].some((term) => standardizedLocationInput.includes(term))) {
            const allUKCounties = [...EnglandCounties, ...ScotlandCounties, ...WalesCounties, ...IrelandCounties];
            if (
                allUKCounties.some(
                    (county) =>
                        (matchBirthLocation && birthLocation.includes(this.standardizeString(county))) ||
                        (matchDeathLocation && deathLocation.includes(this.standardizeString(county)))
                ) ||
                Object.keys(englandCountyAbbreviations).some(
                    (abb) =>
                        (matchBirthLocation && birthLocation.endsWith(abb.toLowerCase())) ||
                        (matchDeathLocation && deathLocation.endsWith(abb.toLowerCase()))
                )
            ) {
                return true;
            }
        }

        // General location match for any other country
        return matchBirthLocation || matchDeathLocation;
    }

    // Helper function to check for directional prefixes in location names
    isConfusingLocation(input, locationField) {
        const locationNormalized = this.standardizeString(locationField).toLowerCase();
        const inputNormalized = this.standardizeString(input).toLowerCase();

        // Define the list of directional prefixes
        const prefixes = ["new ", "north ", "south ", "east ", "west "];

        // Check if locationNormalized starts with any prefix followed by the inputNormalized
        return prefixes.some((prefix) => locationNormalized.includes(prefix + inputNormalized));
    }

    filterResults() {
        // Get all variants for the surname
        this.surname = $("#surname").val();
        const surnameVariants = this.findSurnameVariants(this.surname);
        if (surnameVariants.length == 0) {
            // If no variants are found, use the surname as-is
            surnameVariants.push(this.surname);
        }

        // Retrieve the century filter and parse it into an array of centuries
        const centuries = this.parseCenturies($("#centuries").val());
        const firstCentury = centuries.length > 0 ? Math.min(...centuries) : null;
        const locationInput = $("#location").val()?.trim();

        const $this = this;
        Object.values(this.combinedResults).forEach((person) => {
            // Standardize the person's surnames for comparison
            const standardizedLastNameAtBirth = $this.standardizeString(person?.LastNameAtBirth) || "";
            const standardizedLastNameCurrent = $this.standardizeString(person?.LastNameCurrent) || "";
            const standardizedLastNameOther = $this.standardizeString(person?.LastNameOther) || "";

            // Check if any standardized surname variants include the standardized person's surnames
            const isSurnameMatch = surnameVariants.some(
                (variant) =>
                    $this.standardizeString(variant) === standardizedLastNameAtBirth ||
                    $this.standardizeString(variant) === standardizedLastNameCurrent ||
                    $this.standardizeString(variant) === standardizedLastNameOther
            );

            // Determine the person's birth century for filtering
            const birthYear = parseInt(person?.BirthDate?.substring(0, 4));
            const birthCentury = birthYear ? Math.ceil(birthYear / 100) : null;

            // Check if the person's birth century matches the filter
            const isCenturyMatch =
                !firstCentury ||
                (birthCentury && birthCentury >= firstCentury) ||
                !person.BirthDate ||
                person.BirthDate == "0000-00-00";

            if (isSurnameMatch && isCenturyMatch && this.isLocationMatch(person, locationInput)) {
                $this.filteredResults[person.Id] = person;
            }
        });
    }

    async processBatches(ids, surname) {
        const $this = this;

        if (!ids || ids.length === 0) {
            console.error("No IDs provided for processing.");
            wtViewRegistry.showNotice("No results found");
            $("#refreshData").prop("disabled", false);
            return;
        }

        function cancelIt() {
            wtViewRegistry.showNotice("Data retrieval cancelled");
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
        this.updateLoadingBar(5); // we've done some work... :)
        let processed = 0;
        let total = ids.length;
        let extendedTotal = total * 1.2;

        const starttime = performance.now();
        for (let i = 0; i < ids.length && !$this.cancelling; i += 1000) {
            const batchIds = ids.slice(i, i + 1000);

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

            // Combine the 'people' object with 'combinedResults'

            if (people && typeof people === "object") {
                Object.assign(this.combinedResults, people);
            }

            //
            processed += batchIds.length;
            let percentage = (processed / total) * 100 + 20;
            this.updateLoadingBar(percentage);
        }

        this.updateLoadingBar(100);

        // If the surname is not LNAB, LNC, or LNO, filter out

        // Get all variants for the surname
        this.surname = $("#surname").val();
        const surnameVariants = this.findSurnameVariants(this.surname);
        if (surnameVariants.length == 0) {
            // If no variants are found, use the surname as-is
            surnameVariants.push(this.surname);
        }
        //

        if ($this.cancelling) {
            cancelIt();
            return;
        }
        $this.disableCancel();

        this.filterResults();

        // After batch processing, update the progress bar for additional steps (the last 10% of the work)
        processed = ids.length;
        this.updateLoadingBar(90 + (processed / extendedTotal) * 10);

        // Sort and map children to parents
        this.filterFilteredResultsByLNAB();
        const dataset = this.settings.onlyLastNameAtBirth ? this.onlyLastNameAtBirth : this.filteredResults;
        this.sortedPeople = this.sortPeopleByBirthDate(dataset);
        this.prioritizeTargetName(this.sortedPeople);

        let parentToChildrenMap = this.createParentToChildrenMap(this.sortedPeople);

        this.peopleById = this.createPeopleByIdMap(this.sortedPeople);

        // Update progress bar after sorting and mapping
        processed += (extendedTotal - total) * 0.5;
        this.updateLoadingBar(90 + (processed / extendedTotal) * 10);

        this.peopleByIdKeys = Object.keys(this.peopleById);
        wtViewRegistry.showNotice("Building trees...");
        this.displayDescendantsTree(this.peopleById, parentToChildrenMap);

        // Update progress bar to complete
        this.updateLoadingBar(100);

        // After processing is complete
        this.hideLoadingBar();

        $("#downloadData").show();

        return;
    }

    /*
    prioritizeTargetName(sortedPeople) {
        let updatedPeople = [...sortedPeople]; // Clone the array to avoid direct modifications

        for (let i = 0; i < updatedPeople.length; i++) {
            let person = updatedPeople[i];
            let personShouldLog = this.shouldLog(person.Id);

            if (personShouldLog) {
            }

            if (person.Spouses && person.Spouses.length > 0) {
                const spouseIds = person.Spouses.map((spouse) => spouse.Id);

                spouseIds.forEach((spouseId) => {
                    // Find the spouse in sortedPeople by comparing Id values after type conversion
                    let spouseIndex = sortedPeople.findIndex((p) => String(p.Id) === String(spouseId));

                    if (spouseIndex !== -1) {
                        let spouse = sortedPeople[spouseIndex];
                        let spouseShouldLog = this.shouldLog(spouse.Id);

                        if (personShouldLog || spouseShouldLog) {
                        }

                        if (this.shouldPrioritize(spouse, person)) {
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
    }
    */

    prioritizeTargetName(sortedPeople) {
        let updatedPeople = [...sortedPeople]; // Clone the array to avoid direct modifications

        for (let i = 0; i < updatedPeople.length; i++) {
            let person = updatedPeople[i];

            if (person.Spouses && person.Spouses.length > 0) {
                const spouseIds = person.Spouses.map((spouse) => spouse.Id);

                spouseIds.forEach((spouseId) => {
                    let spouseIndex = sortedPeople.findIndex((p) => String(p.Id) === String(spouseId));
                    if (spouseIndex !== -1) {
                        let spouse = sortedPeople[spouseIndex];

                        // Prioritize LNAB status directly
                        if (this.shouldPrioritize(spouse, person)) {
                            // Mark spouses who should not be roots
                            spouse.shouldBeRoot = false;
                            updatedPeople = updatedPeople.filter((p) => String(p.Id) !== String(spouse.Id));
                            let newPersonIndex = updatedPeople.findIndex((p) => String(p.Id) === String(person.Id));
                            updatedPeople.splice(newPersonIndex + 1, 0, spouse);
                        }
                    }
                });
            }
        }

        this.sortedPeople = updatedPeople; // Update the original array reference if needed
    }

    shouldLog(id) {
        return this.shouldLogIds.includes(id);
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

    hasTargetLNAB(person) {
        // Assuming you have a method to get the list of target LNAB variants
        const targetLNABs = this.getSurnameVariants(); // Make sure this function exists and returns the correct data
        const standardizedPersonLNAB = this.standardizeString(person.LastNameAtBirth); // Assuming this method standardizes the string

        return targetLNABs.includes(standardizedPersonLNAB);
    }

    shouldBeRoot(person, peopleById) {
        if (this.hasTargetLNAB(person)) {
            return true; // Direct LNAB match
        }

        // For non-LNAB persons, check if any spouse qualifies them as a non-root
        let isRoot = person.Spouses.every((spouse) => {
            let spouseInDataset = peopleById[spouse.Id];
            if (!spouseInDataset) {
                return true; // Treat as root if spouse is not in dataset, no other qualifying information
            }
            let spouseHasLNAB = this.hasTargetLNAB(spouse);
            return !spouseHasLNAB; // Spouse does not have LNAB, therefore person can be root
        });
        return isRoot;
    }

    // Assuming this function is called when constructing the tree
    findRootIndividuals(parentToChildrenMap, peopleById) {
        let rootIndividuals = Object.keys(peopleById).filter((id) => {
            let person = peopleById[id];
            return !this.isChild(id, parentToChildrenMap) && this.shouldBeRoot(person, peopleById);
        });

        return rootIndividuals;
    }

    // Helper to determine if an ID represents a child in any relationship
    isChild(id, parentToChildrenMap) {
        return Object.values(parentToChildrenMap).flat().includes(id);
    }

    verifyRoots(peopleById, rootIndividuals) {
        let verifiedRoots = rootIndividuals.filter((rootId) => {
            let person = peopleById[rootId];
            // Additional logic to handle special cases or inconsistencies
            return this.hasAllRequiredInfo(person);
        });
        return verifiedRoots;
    }

    hasAllRequiredInfo(person) {
        // Implement checks based on your specific requirements, e.g., check for missing data
        return person.LastNameAtBirth && person.FirstName; // Example check
    }

    // Adjustments in arrangeTreeElements might be necessary to ensure proper placement based on these new rules

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
        let privacySticker = this.getPrivacySticker(person);
        if (person.Privacy >= 50) {
            privacySticker = "";
        }

        let html = `<li class='level_${level} person ${duplicateClass}' data-id='${personIdStr}' data-name='${
            person.Name
        }' data-father='${person?.Father}' data-mother='${
            person?.Mother
        }' data-gender='${gender}' data-full-name='${fullName}' data-dates='${dates}'> ${toggleButton}${descendantsCount}<a href="https://www.wikitree.com/wiki/${
            person.Name
        }" target="_blank">${fullName}</a> <span class="wtid">(${
            person.Name || ""
        })</span> ${duplicateLink} <span class='dates'>${dates}</span> ${categoryHTML} ${privacySticker}`;

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
                else if (isLink && current.is("a") && $tag.attr("href")?.length > current.attr("href")?.length) {
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

        if (person?.Categories?.length > 0 || person?.Templates?.length > 0) {
            if (person?.Categories?.length > 0) {
                categoryHTML += this.processNameStudies(person);
            }
            categoryMappings.forEach(({ pattern, symbol, not }) => {
                tags.push(this.processCategories(person, pattern, symbol, { not }));
            });
        }

        const hasDNA =
            this.combinedResults[person.Id].auDNA ||
            this.combinedResults[person.Id].yDNA ||
            this.yDNAdata?.response?.profiles?.includes(person.Id) ||
            this.auDNAdata?.response?.profiles?.includes(person.Id);

        if (hasDNA) {
            const dnaTags = this.processDNA(person);
            // if dnaTags.length > 0, add each one to the tags array
            dnaTags.length > 0
                ? dnaTags.forEach((tag) => {
                      tags.push(tag);
                  })
                : null;
        }
        //
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
                if (nameStudy.match(/Beardsley-Beardslee/)) {
                    nameStudy = nameStudy.replace("Beardsley-", "Beardsley/");
                }
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
        const templateNames = person?.Templates?.map((template) => template.name);

        // Combine person.Categories and templateNames into a single array
        const categoriesAndTemplates = person?.Categories?.concat(templateNames);
        //categoriesAndTemplates

        if (categoriesAndTemplates?.length > 2 && !this.shownCats.has(person.Id)) {
            this.shownCats.add(person.Id);
        }

        let out = categoriesAndTemplates
            ?.filter((category) => {
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
        return out;
    }

    processDNA(person) {
        let dnaOut = [];
        if (this.auDNAdata?.response?.profiles?.includes(person.Id) || this.combinedResults[person.Id].auDNA) {
            this.combinedResults[person.Id].auDNA = true;
            dnaOut.push(
                "<img class='auDNA DNA' title='Click for autosomal DNA details' src='https://www.wikitree.com/images/icons/dna/au.gif'>"
            );
        }
        if (this.yDNAdata?.response?.profiles?.includes(person.Id) || this.combinedResults[person.Id].yDNA) {
            this.combinedResults[person.Id].yDNA = true;
            dnaOut.push(
                "<img class='yDNA DNA' title='Click for Y DNA details' src='https://www.wikitree.com/images/icons/dna/Y.gif'>"
            );
        }
        return dnaOut;
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
        if (!date || date === "0000-00-00") return "";
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
                    married = this.formatDate(married);
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

    createParentToChildrenMap(peopleArray) {
        this.parentToChildrenMap = {};

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
        let totalIndividuals = Object.keys(peopleById).length;
        let processedIndividuals = 0;

        let rootIndividualsIds = this.findRootIndividuals(parentToChildrenMap, peopleById);
        let rootIndividuals = rootIndividualsIds
            .map((id) => peopleById[id])
            .filter((root) => root.shouldBeRoot !== false)
            .sort((a, b) => this.getComparableDate(a).localeCompare(this.getComparableDate(b)));

        rootIndividuals = this.adjustSortingForDeathDates(rootIndividuals);
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
        this.completeDisplay();
    }

    completeDisplay() {
        // If this.displayedIndividuals (set) is empty, create it by getting all the IDs from the HTML
        if (this.displayedIndividuals.size === 0) {
            $("li.person").each((index, person) => {
                const $person = $(person);
                const id = $person.data("id");
                this.displayedIndividuals.add(id);
            });
        }

        this.setupToggleButtons();
        let resultsContainer = $("section#results");
        resultsContainer.fadeIn();

        $(
            "#searchContainer,#toggleDetails,#toggleWTIDs,#toggleGeneralStats,#tableViewButton,#locationSelects,#sheetButton"
        ).show();
        $("#tableLabel,#treesButtons").addClass("visible");

        // Temporary fix (Maybe)
        // Remove any ul.children whose parent is not a li.person
        $("ul.children").each((index, child) => {
            const $child = $(child);
            if (!$child.parent().hasClass("person")) {
                console.log("Removing orphaned children element", $child);
                $child.remove();
            }
        });
        wtViewRegistry.showNotice("Building statistics...");

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

            // Append children to their respective parent
            let parentElement = $("li.person[data-id='" + thisParent + "']");
            if (parentElement.length > 0) {
                parentElement.append($childrenElement);
            } else {
                // Handle cases where the parent is supposed to be a root but is not present
                // This might happen if the parent is a non-LNAB root due to missing LNAB spouse
                this.handleMissingParent(thisParent, $childrenElement);
            }

            processedElements++;
            let percentage = (processedElements / totalElements) * 100;
            this.updateLoadingBar(percentage);

            // Check for errors where the parent is still missing after attempts to handle it
            if ($childrenElement.parents("li.person").length === 0) {
                console.log("Error: Parent not found for children element", $childrenElement);
            }

            // Yield control back to the browser
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
        this.identifyChildrensParents();
    }

    // A method to handle cases where a supposed parent is missing from the DOM
    handleMissingParent(parentId, childrenElement) {
        // Create a new parent element if it doesn't exist and mark it visually or logistically as a root
        let newParentElement = $('<li class="person" data-id="' + parentId + '">');
        newParentElement.append(childrenElement);
        $("ul.tree").append(newParentElement); // Assuming 'ul.tree' is your main tree container
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

    displayChildren(parentToChildrenMap, parentId, peopleById, level) {
        let html = "";
        if (parentToChildrenMap[parentId]) {
            // Now we map to the full person object using the Id from each child entry in the map
            let sortedChildren = parentToChildrenMap[parentId]
                .map((childEntry) => peopleById[childEntry.Id])
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
            !person ||
            ((person.BirthDate === "0000-00-00" || person.BirthDate === "unknown" || !person.BirthDate) &&
                person.BirthDateDecade === "unknown" &&
                (person.DeathDate === "0000-00-00" || person.DeathDate === "unknown" || !person.DeathDate) &&
                person.DeathDateDecade === "unknown")
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
            surname: this.surname,
            location: $("#location").val().trim(),
            centuries: this.parseCenturies($("#centuries").val().trim()).join(","),
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
        clearInterval(D3DataFormatter.migrationEvolutionInterval);
        $("#stopEvolution").trigger("click");
        $("div.message,.popup").remove();
        $("#toggleDetails,#toggleWTIDs").removeClass("on");
        $("#searchContainer,#toggleDetails,#toggleWTIDs,#tableViewButton").hide();
        $("#tableViewButton").removeClass("on");
        $("#migrationSankey *").off();
        $("#migrationSankey").empty().remove();
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
        this.onlyLastNameAtBirth = {};
        this.sortedPeople = [];
        this.peopleById = {};
        this.peopleByIdKeys = [];
        this.locationStats = {};
        this.familyTreeStatistics = {};
        this.familyTreeStats = {};
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

    createPopupDiv(divId, title) {
        const $div = $(`
        <div id='${divId}' class='popup'><x>x</x>
        <h2>${title}</h2>
        </div>`);
        $("body").append($div);
        $div.draggable();
        return $div;
    }

    populateDivWithProfiles($this, $div, profiles) {
        // Ensure the container has a <ul> element
        const $ul = $("<ul class='profile-list'></ul>").appendTo($div); // Add class for styling

        profiles.forEach((person) => {
            const aName = new PersonName(person);
            let fullName = aName.withParts(["FullName"]);
            const dates = $this.displayDates(person);

            let id = person.Name;
            let profileLink = `<a href="https://www.wikitree.com/wiki/${id}" target="_blank" class="${
                person.Gender || ""
            }">${fullName} ${dates}</a>`;

            if (!person.Name) {
                profileLink = `<a>Private ${dates}</a>`;
            }

            // Construct list item with profile link and location data
            const $li = $("<li class='profile-item'></li>");
            const $link = $(profileLink).appendTo($li);

            // Add birth and death location if available, on new lines
            if (person.BirthLocation) {
                $li.append(`<div class="location-info">b. ${person.BirthLocation}</div>`);
            }
            if (person.DeathLocation) {
                $li.append(`<div class="location-info">d. ${person.DeathLocation}</div>`);
            }

            $ul.append($li);
        });
    }

    generateStatsHTML(stats) {
        $("#statisticsContainer li").off();
        $("#statisticsContainer").remove(); // Remove any existing statistics container

        let $statsContainer = $("<div>", { id: "statisticsContainer" });

        // Total People

        const totalWithTargetLNABs = this.getTotalWithTargetLNABs();
        const totalPeopleText = `${stats.getTotalPeople()} (<span title="${totalWithTargetLNABs} of the total have the target surname (or variants) as the last name at birth">${totalWithTargetLNABs}</span>)`;
        $statsContainer.append(
            this.createStatItem("Total People: ", totalPeopleText, {
                title: "Total people in the dataset.",
                classes: "totalPeople clicker",
            })
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

        // Migrants
        $statsContainer.append(
            this.createStatItem("Migrants: ", stats.getMigrantsCount(), {
                title: "People who were born in a different location to where they died.",
                classes: "migrants clicker",
            })
        );

        function addStatsAndList($this, statType, title, titleText, statsMethod, divId, extraClass = "") {
            const statItems = stats[statsMethod]();
            $statsContainer.append(
                $this.createStatItem(`${title}: `, statItems.length, {
                    classes: `${statType} clicker ${extraClass}`,
                    title: `Click to display a list of ${titleText}.`,
                    heading: title,
                })
            );

            if (statItems.length > 0) {
                const $div = $this.createPopupDiv(divId, title);
                $this.populateDivWithProfiles($this, $div, statItems);
            }
        }

        // Using the functions
        addStatsAndList(
            this,
            "unsourced",
            "Unsourced Profiles",
            "profiles with 'Unsourced' templates or categories",
            "getUnsourced",
            "unsourcedProfiles"
        );
        addStatsAndList(
            this,
            "unconnected",
            "Unconnected Profiles",
            "unconnected profiles",
            "getUnconnected",
            "unconnectedProfiles"
        );
        addStatsAndList(
            this,
            "noRelations",
            "No Connections",
            "profiles with no connections",
            "getNoRelations",
            "noRelationsProfiles"
        );

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
                const buttonHTML = this.locationCountButton(key, value.count);
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

        // Migrants
        $statsContainer.append(
            this.createStatItem("Migrants: ", periodStats.migrantIds.length || "0", {
                classes: "periodMigrants clicker",
            })
        );

        let $periodMigrants = $("#periodMigrants");
        $periodMigrants.find("ul").remove();
        if ($("#periodMigrants").length === 0) {
            $periodMigrants = this.createPopupDiv("periodMigrants", "Migrants").hide();
        }
        $periodMigrants.find("a").remove();
        const $migrantList = Object.values($this.filteredResults).filter((person) =>
            periodStats.migrantIds.includes(person.Id)
        );
        this.populateDivWithProfiles($this, $periodMigrants, $migrantList);

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
        Object.entries(namesData).forEach(([gender, namesObj]) => {
            // Convert object of names to array of [name, count] pairs
            let names = Object.entries(namesObj);
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
                        .sort((a, b) => b[1].count - a[1].count)
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
        wtViewRegistry.showNotice("Building statistics...");
        const dataset = this.settings.onlyLastNameAtBirth ? this.onlyLastNameAtBirth : this.filteredResults;
        // Clear any existing statistics by unbinding event listeners and removing elements
        this.familyTreeStatistics = {};
        this.familyTreeStats = {};

        this.familyTreeStats = new FamilyTreeStatistics(dataset);

        // Get stats for each 50-year period
        const periodStats = this.familyTreeStats.getStatsInPeriods();

        clearD3DataFormatterEffects();

        const d3DataFormatter = new D3DataFormatter(periodStats);

        function clearD3DataFormatterEffects() {
            // Remove visual elements
            d3.select("#lifespanGraph").remove();
            d3.select("#peopleCountGraph").remove();
            d3.select("#migrationSankey").remove();
            $("#locationsVisualization").remove();
            // Clear any popups
            $(".popup:not(.message,#oneNameTreesSettings)").remove();

            // Detach event listeners
            $("#prevPeriod").off("click.oneNameTrees");
            $("#nextPeriod").off("click.oneNameTrees");
        }
        // d3DataFormatter.lifespanGraph();
        d3DataFormatter.doDrawGraph("lifespanGraph");
        d3DataFormatter.doDrawGraph("peopleCountGraph");

        d3DataFormatter.formatNamesData();
        d3DataFormatter.initVisualization();
        d3DataFormatter.initMigration();

        // Accessing location statistics
        const locationStats = this.familyTreeStats.getLocationStatistics();

        // Category count
        const categoryCount = this.familyTreeStats.getCategoryCounts();

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

    updateStatistics() {
        $("#statsDisplay *").off();
        $("#statsDisplay").empty();
        clearInterval(D3DataFormatter.evolutionInterval);
        $(".popup:not(.message,#oneNameTreesSettings) *").off();
        $(".popup:not(.message,#oneNameTreesSettings)").remove();
        this.showStatistics();
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

    getPrivacySticker(person) {
        const privacyLevel = OneNameTrees.PRIVACY_LEVELS.get(person.Privacy);
        const privacyImg = privacyLevel ? privacyLevel.img : "";
        const privacyTitle = privacyLevel ? privacyLevel.title : "";
        const privacy = privacyImg ? `<img src="${privacyImg}" class="privacySticker" title="${privacyTitle}" />` : "";
        return privacy;
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

        // Define your headers with custom hover titles
        const headers = {
            givenNames: { text: "First", title: "First Names" },
            lastNameAtBirth: { text: "LNAB", title: "Last Name at Birth" },
            lastNameCurrent: { text: "Current", title: "Current Last Name" },
            birthDate: { text: "Birth Date", title: "Date of Birth" },
            birthPlace: { text: "Birth Place", title: "Place of Birth" },
            deathDate: { text: "Death Date", title: "Date of Death" },
            deathPlace: { text: "Death Place", title: "Place of Death" },
            age: { text: "Age", title: "Age at Death" },
            categoryHTML: { text: "Cats. & Stickers", title: "Categories, Stickers, and DNA Tags" },
            managers: { text: "Managers", title: "Profile Managers" },
            created: { text: "Created", title: "Creation Date" },
            modified: { text: "Modified", title: "Last Modified Date" },
            privacy: { text: "P", title: "Privacy Level" },
        };

        const $tr = $("<tr>");
        const $tr2 = $("<tr id='filterRow'>");

        // Iterate over each header to create table headers and filter inputs
        Object.keys(headers).forEach(function (key) {
            const header = headers[key];
            const $th = $("<th>").text(header.text).attr("title", header.title).addClass(key);
            $tr.append($th);
            const filterElement = $(`<input type="text" class="filter" />`).attr("id", key + "Filter");

            if (["birthDate", "deathDate", "created", "modified"].includes(key)) {
                filterElement.addClass("dateFilter");
            }
            $tr2.append($("<th>").append(filterElement));
        });

        $thead.append($tr);
        $tfoot.append($tr2);

        // Add rows for data

        const dataset = this.settings.onlyLastNameAtBirth ? this.onlyLastNameAtBirth : this.filteredResults;
        Object.keys(dataset).forEach(function (key) {
            const person = dataset[key];
            if (!person.Name) {
                return;
            }
            const aName = new PersonName(person);
            let givenNames = aName.withParts(["FirstNames"]);
            let aFullName = aName.withParts(["FullName"]);
            givenNames = person.Name
                ? `<a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${givenNames}</a>`
                : givenNames;
            const lastNameAtBirth = aName.withParts(["LastNameAtBirth"]);
            const lastNameCurrent = aName.withParts(["LastNameCurrent"]);
            const fullName = aFullName;
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
            const privacy = $this.getPrivacySticker(person);

            const $row = $("<tr>");
            // Add data to the row: data-name, data-id, data-father, data-mother, data-gender
            $row.attr("data-name", person.Name);
            $row.attr("data-id", person.Id);
            $row.attr("data-fullname", fullName);
            $row.attr("data-father", person.Father);
            $row.attr("data-mother", person.Mother);
            $row.attr("data-gender", person.Gender);
            $row.attr("data-corrected-birthplace", person.CorrectedBirthLocation);
            $row.attr("data-corrected-deathplace", person.CorrectedDeathLocation);
            $row.attr("data-birthplace", birthPlace);
            $row.attr("data-deathplace", deathPlace);
            $row.attr("data-privacy", person.Privacy);
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
                privacy: privacy,
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

        // Apply the filter
        table.columns().every(function () {
            const column = this;

            $("input", this.footer()).on("change", function () {
                column.search(this.value).draw();
            });
            $("input", this.footer()).on("keyup", function (e) {
                if (e.key === "Enter") {
                    column.search(this.value).draw();
                }
            });
        });

        $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
            let isValid = true; // Initialize as true and set to false if any condition fails

            // Access the DataTable instance and the row element
            const table = $(settings.nTable).DataTable();
            const row = table.row(dataIndex).node();
            const correctedBirthPlace = $(row).data("corrected-birthplace") || "";
            const birthLocationFilterValue = $("#birthPlaceFilter").val().toLowerCase();
            const correctedDeathPlace = $(row).data("corrected-deathplace") || "";
            const deathLocationFilterValue = $("#deathPlaceFilter").val().toLowerCase();

            // Apply and log privacy filter result
            const privacyFilterBox = $("#privacyFilter");
            const privacyFilterValue = privacyFilterBox.val().toLowerCase();
            const privacyColumnIndex = 12;
            const privacyTitleElement = $(row).find("td").eq(privacyColumnIndex).find("img");

            if (privacyTitleElement.length > 0 && privacyTitleElement.attr("title")) {
                const privacyTitle = privacyTitleElement.attr("title").toLowerCase();
                if (privacyFilterValue && !privacyTitle.includes(privacyFilterValue)) {
                    isValid = false;
                }
            }

            // Cats and stickers filtering
            const categoryFilterValue = $("#categoryHTMLFilter").val().toLowerCase();
            const categoryColumnIndex = 8;
            const categoryElement = $(row).find("td").eq(categoryColumnIndex);

            // Initially assume the category does not match
            let categoryMatchFound = false;

            // Check if the category filter value is in the text of the cell
            if (categoryElement.text().toLowerCase().includes(categoryFilterValue)) {
                categoryMatchFound = true; // The main cell text contains the filter
            }

            // If not found in the main text, check within link titles and image titles
            if (!categoryMatchFound) {
                const categoryLinks = categoryElement.find("a");
                categoryMatchFound = categoryLinks.toArray().some((link) => {
                    const title = $(link).attr("title");
                    return title ? title.toLowerCase().includes(categoryFilterValue) : false;
                });

                // Check image titles only if no link titles matched
                if (!categoryMatchFound) {
                    const categoryImages = categoryElement.find("img");
                    categoryMatchFound = categoryImages.toArray().some((img) => {
                        const imgTitle = $(img).attr("title");
                        return imgTitle ? imgTitle.toLowerCase().includes(categoryFilterValue) : false;
                    });
                }
            }

            // If no matches were found in either text or link/image titles, set isValid to false
            if (categoryFilterValue && !categoryMatchFound) {
                isValid = false;
            }

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
            const correctedLocationFilter = correctedBirthPlace
                ? String(correctedBirthPlace).toLowerCase().includes(birthLocationFilterValue)
                : false;
            if (birthLocationFilterValue && !correctedLocationFilter) {
                isValid = false;
            }
            // Handling other filters that are not date filters
            $(".filter:not(.dateFilter,#privacyFilter,#categoryHTMLFilter)").each(function () {
                if (!isValid) return; // Skip if already invalid

                const filterElement = $(this);
                const filterValue = filterElement.val().trim().toLowerCase(); // Trim and lowercase the filter value
                const columnIndex = $(this).closest("th").index();
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
        const checkLocationsButton = $("<button>", { id: "checkLocationsButton" }).text("Check Locations");
        checkLocationsButton.attr("title", "Highlight locations with possible errors");
        wideTableButton.after(checkLocationsButton);
        checkLocationsButton.on("click.oneNameTrees", function () {
            // Find all people in the table who's .birthPlace is different from tr data-corrected-birthplace
            const table = $("#tableView").DataTable();

            table.rows().every(function () {
                const row = this.node();

                // Handling birth locations
                const correctedBirthLocation = $(row).data("corrected-birthplace") || "";
                const birthPlaceCell = $(row).find(".birthPlace");
                const birthPlace = $(row).data("birthplace");
                if (birthPlace && birthPlace.toLowerCase() !== correctedBirthLocation.toLowerCase()) {
                    $(row).addClass("birthLocationIssue");
                    birthPlaceCell.attr("title", `${correctedBirthLocation}?`);
                } else {
                    $(row).removeClass("birthLocationIssue");
                }

                // Handling death locations
                const correctedDeathLocation = $(row).data("corrected-deathplace") || "";
                const deathPlaceCell = $(row).find(".deathPlace");
                const deathPlace = $(row).data("deathplace");
                if (deathPlace && deathPlace.toLowerCase() !== correctedDeathLocation.toLowerCase()) {
                    $(row).addClass("deathLocationIssue");
                    deathPlaceCell.attr("title", `${correctedDeathLocation}?`);
                } else {
                    $(row).removeClass("deathLocationIssue");
                }
            });
        });

        $(document).on("click.oneNameTrees", ".birthLocationIssue .birthPlace", function () {
            // Briefly show the title attribute
            const birthPlace = $(this).text();
            const title = $(this).attr("title");
            $(this).text(title);
            setTimeout(() => {
                $(this).text(birthPlace);
            }, 2000);
        });

        $(document).on("click.oneNameTrees", ".deathLocationIssue .deathPlace", function () {
            // Briefly show the title attribute
            const deathPlace = $(this).text();
            const title = $(this).attr("title");
            $(this).text(title);
            setTimeout(() => {
                $(this).text(deathPlace);
            }, 2000);
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

    async startTheFetching(surname, location, centuries) {
        if (this.userId) {
            if (!this.surnameWatchlistNames) {
                this.watchlistPromise = WikiTreeAPI.getWatchlist("One Name Trees", 5000, 1, 0, [
                    "Id",
                    "LastNameAtBirth",
                    "LastNameCurrent",
                    "LastNameOther",
                ]);
            }
        }
        const $this = this;
        $this.reset();
        const [aborted, data] = await $this.getONTids(surname, location, centuries);
        if (aborted) {
            wtViewRegistry.showNotice("Data retrieval cancelled.");
            $this.disableCancel();
            $this.shakingTree.hide();
            // TODO: do whatever other cleanup should be done
            return;
        }
        const ids = data.main.response.profiles;
        const found = data.main.response.found;
        if (found === 0) {
            $this.disableCancel();
            $this.shakingTree.hide();
            wtViewRegistry.showNotice("No results found.");
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
                                   <p>Please add a location or a century (or centuries) and go again.</p>`;
                wtViewRegistry.showNotice(message);
                $this.disableCancel();
                $this.shakingTree.hide();
                return;
            }
            wtViewRegistry.showNotice(message);
        }
        $("#cancelFetch").show();

        let watchlistFetched = false;
        if (!this.watchlist && this.userId) {
            this.showLoadingBar();
            this.updateLoadingBar(2);
            wtViewRegistry.showNotice("Fetching your watchlist...");
            const watchlist = await this.watchlistPromise;
            watchlistFetched = true;
            wtViewRegistry.showNotice("Watchlist retrieved...");
            this.updateLoadingBar(5);
            // Store the watchlist in localStorage with a timestamp and the user's ID and LRU strategy
            const watchlistData = {
                timestamp: Date.now(),
                userId: this.userId,
                watchlist: watchlist,
            };
            this.saveWithLRUStrategy(`${this.userId}_watchlist`, JSON.stringify(watchlistData));
            this.watchlist = watchlistData;
            wtViewRegistry.showNotice("Watchlist saved...");
        }
        const surnameVariants = this.getSurnameVariants(surname);
        if (this.watchlist) {
            if (!watchlistFetched) {
                wtViewRegistry.showNotice("Using stored watchlist...");
            }
            // Get Ids of all people whose Name is a variant of the surname.
            this.surnameWatchlistIds = [];
            this.watchlist.watchlist.forEach((person) => {
                if (person.Name) {
                    if (
                        (surnameVariants.includes(person.LastNameAtBirth) ||
                            surnameVariants.includes(person.LastNameCurrent) ||
                            surnameVariants.includes(person.LastNameOther)) &&
                        !ids.includes(person.Id)
                    ) {
                        this.surnameWatchlistIds.push(person.Id);
                        ids.push(person.Id);
                    }
                }
            });
        }

        wtViewRegistry.showNotice("Fetching profiles...");
        $this.processBatches(ids, surname).then(() => $this.disableCancel());
    }

    documentReady() {
        this.addCategoryKeyToHelp();
        const $this = this;
        $("#submit").on("click.oneNameTrees", async function () {
            $this.reset();
            $this.shakingTree.show();
            $("div.error").remove(); // Remove any existing error messages
            wtViewRegistry.clearStatus();

            let surname = $("#surname").val();
            $this.surname = surname;
            $("#clearCache").text(`Clear cached ${surname} items`);
            let location = $("#location").val().trim() + " "; // Get the location from the new input field
            const centuries = $this.parseCenturies($("#centuries").val());

            // If surname includes a comma, it's a list of surnames.
            this.surnames = surname.split(",");
            if (this.surnames.length > 1) {
                this.surnames = this.surnames.map((name) => name.trim());
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
                $this.startTheFetching(surname, location, centuries);
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

        $("#toggleDetails")
            .off()
            .on("click.oneNameTrees", function () {
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

        $("#toggleWTIDs")
            .off()
            .on("click.oneNameTrees", function () {
                if ($(this).hasClass("off")) {
                    $(this).removeClass("off").addClass("on");
                    $(".wtid").show();
                } else {
                    $(this).removeClass("on").addClass("off");
                    $(".wtid").hide();
                }
            });

        $("#toggleGeneralStats")
            .off()
            .on("click.oneNameTrees", function () {
                if ($(this).hasClass("on") == false) {
                    $(this).removeClass("off").addClass("on");
                } else {
                    $(this).removeClass("on").addClass("off");
                }
                $("#statsDisplay").slideToggle();
            });

        $("#tableViewButton")
            .off()
            .on("click.oneNameTrees", function () {
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
        const locationBit = $("#location").val() ? "_" + $("#location").val().replace(/ /g, "_") : "";
        const centuryBit = this.centuries && this.centuries.length > 0 ? "C_" + this.centuries.join("_") : "";
        const fileName =
            $("#surname").val() +
            locationBit +
            centuryBit +
            "_" +
            new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19);

        const wb = XLSX.utils.book_new(); // Create a new workbook
        const ws_name = "TableData";

        // Prepare data for Excel
        let dataForExcel = [
            [
                "WT ID",
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

        const dataset = this.settings.onlyLastNameAtBirth ? this.onlyLastNameAtBirth : this.filteredResults;

        Object.keys(dataset).forEach(function (key) {
            const person = dataset[key];
            const aName = new PersonName(person);
            let givenNames = aName.withParts(["FirstNames"]);

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
                person.Name,
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
        const periodData = $this.familyTreeStats.getStatsInPeriods();

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

class LocalStorageManager {
    constructor() {
        this.accessOrder = [];
        this.maxCapacity = 5 * 1024 * 1024; // 5MB, adjust as needed
        this.threshold = this.maxCapacity * 0.7; // Cleanup when 70% full
        // Attempt to read the accessOrder from localStorage or initialize it
        const storedOrder = localStorage.getItem("accessOrder");
        if (storedOrder) {
            this.accessOrder = JSON.parse(storedOrder);
        }
        this.checkAndRebuildAccessOrderIfNeeded(); // Ensure accessOrder is accurate on initialization
    }

    clearONSidsCache() {
        const prefix = "ONSids_";
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(prefix)) {
                localStorage.removeItem(key);
            }
        }
    }

    clearCachedItems(surname = null) {
        const prefix = "ONTids_";
        // Prepare two patterns: one for exact matches and another for prefixed matches
        let pattern;

        if (surname) {
            // Normalize surname as it's done in key generation
            const normalizedSurname = surname.replace(/\s+/g, "_").toLowerCase();
            // Exact match pattern: matches exactly "ONTids_surname" (end of string)
            const exactMatchPattern = new RegExp(`^${prefix}${normalizedSurname}$`);
            // Prefix match pattern: matches "ONTids_surname_" with anything following the underscore
            const prefixMatchPattern = new RegExp(`^${prefix}${normalizedSurname}_`);

            pattern = (key) => exactMatchPattern.test(key) || prefixMatchPattern.test(key);
        } else {
            // If no surname is provided, use a simpler check for the base prefix
            pattern = (key) => key.startsWith(prefix);
        }

        for (const key of Object.keys(localStorage)) {
            // Use the pattern to check the key
            if (pattern(key)) {
                localStorage.removeItem(key);
            }
        }

        // Show a temporary message instead of an alert
        this.showTempMessage("Clearing cached data...");
    }

    clearCachedWatchlist() {
        const suffix = "_watchlist";
        for (const key of Object.keys(localStorage)) {
            if (key.endsWith(suffix)) {
                localStorage.removeItem(key);
                this.showTempMessage("Clearing cached watchlist...");
            }
        }
    }

    showTempMessage(message) {
        // Check if the message element already exists
        let messageElement = document.getElementById("tempMessage");

        // If it doesn't exist, create it
        if (!messageElement) {
            messageElement = document.createElement("div");
            messageElement.setAttribute("id", "tempMessage");
            messageElement.classList.add("temp-message");
            document.body.appendChild(messageElement);
        }

        // Set the message and show the element
        messageElement.textContent = message;
        messageElement.style.display = "block";

        // Hide the message after 3 seconds
        setTimeout(() => {
            messageElement.style.display = "none";
        }, 3000);
    }

    checkAndRebuildAccessOrderIfNeeded() {
        let ontidsItemCount = 0;
        // Count ONTids items in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            if (localStorage.key(i).startsWith("ONTids_")) {
                ontidsItemCount++;
            }
        }
        // Log the counts for debugging

        // If accessOrder is too short compared to the number of ONTids items, rebuild it
        if (this.accessOrder.length < ontidsItemCount) {
            this.rebuildAccessOrderFromDataDate();
        }
    }

    rebuildAccessOrderFromDataDate() {
        const itemDates = [];
        // Loop through localStorage items to find ONTids items and extract their dataDate
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith("ONTids_")) {
                const item = JSON.parse(localStorage.getItem(key));
                const dataDate = item.debug && item.debug.dataDate;
                if (dataDate) {
                    itemDates.push({ key, dataDate });
                }
            }
        }
        // Sort items by dataDate to rebuild access order
        itemDates.sort((a, b) => new Date(a.dataDate) - new Date(b.dataDate));
        // Update accessOrder with sorted keys
        this.accessOrder = itemDates.map((item) => item.key);
        // Persist the updated access order
        this.updateLocalStorageAccessOrder();
    }

    removeItems(criteria) {
        // Remove items based on a criteria and update access order accordingly
        this.accessOrder = this.accessOrder.filter((key) => {
            if (key.includes(criteria)) {
                localStorage.removeItem(key);

                return false; // Exclude from new accessOrder
            }
            return true; // Include in new accessOrder
        });
        this.updateLocalStorageAccessOrder();
    }

    getItemAndUpdateAccessOrder(key) {
        // Retrieve an item and update its position in the accessOrder
        const value = localStorage.getItem(key);
        if (value) {
            this.updateAccessOrder(key);
        }
        return value;
    }

    saveWithLRUStrategy(key, value) {
        // Save an item with LRU strategy, invoking proactive cleanup if necessary
        const newItemSize = new Blob([value]).size;
        if (this.proactiveCleanup(newItemSize)) {
            try {
                localStorage.setItem(key, value);
                this.updateAccessOrder(key);
            } catch (error) {
                console.error("Error saving to localStorage:", error);
            }
        }
    }

    checkStorageUsage() {
        // Check the current usage of the localStorage
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage.getItem(key).length;
            }
        }
        return total;
    }

    proactiveCleanup(newItemSize) {
        this.checkAndRebuildAccessOrderIfNeeded(); // Ensure accessOrder is accurate before cleanup
        let currentUsage = this.checkStorageUsage();
        let index = 0;
        while (currentUsage + newItemSize > this.threshold && index < this.accessOrder.length) {
            const key = this.accessOrder[index];
            if (key.startsWith("ONT") || key.startsWith("ONSids") || key.includes("watchlist")) {
                const itemSize = localStorage.getItem(key)?.length || 0;
                localStorage.removeItem(key);
                currentUsage -= itemSize;
                this.accessOrder.splice(index, 1); // Adjust index accordingly
            } else {
                index++;
            }
        }

        // General LRU cleanup if necessary
        while (currentUsage + newItemSize > this.threshold && this.accessOrder.length > 0) {
            const oldestKey = this.accessOrder.shift(); // Remove the oldest accessed item
            const itemSize = localStorage.getItem(oldestKey)?.length || 0;
            localStorage.removeItem(oldestKey);
            currentUsage -= itemSize;
        }

        this.updateLocalStorageAccessOrder();

        return currentUsage + newItemSize <= this.maxCapacity;
    }

    updateAccessOrder(key) {
        // Update the access order, ensuring no duplicates and the most recent access is at the end
        this.accessOrder = this.accessOrder.filter((item) => item !== key);
        this.accessOrder.push(key);
        this.updateLocalStorageAccessOrder();
    }

    updateLocalStorageAccessOrder() {
        // Update the localStorage with the current access order
        localStorage.setItem("accessOrder", JSON.stringify(this.accessOrder));
    }
}
