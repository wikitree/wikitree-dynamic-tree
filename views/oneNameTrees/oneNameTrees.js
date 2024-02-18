import { FamilyTreeStatistics } from "./familytreestatistics.js";
import { categoryMappings } from "./category_mappings.js";

window.OneNameTrees = class OneNameTrees extends View {
    static APP_ID = "OneNameTrees";
    constructor(container_selector, person_id) {
        super(container_selector, person_id);
        this.cancelling = false;
        this.container = $(container_selector);
        this.personId = person_id;
        this.wtid = $("#wt-id-text").val();
        this.surname = this.wtid ? this.wtid.replaceAll("_", " ").replace(/\-\d+/, "").trim() : "";
        this.header = $("header");
        this.displayedIndividuals = new Set();
        this.displayedSpouses = new Set(); // New set to keep track of displayed spouses
        this.combinedResults = {};
        this.parentToChildrenMap = {};
        this.peopleById = {};
        this.familyTreeStats;
        this.monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        this.familyTreeStatistics = new FamilyTreeStatistics(this.combinedResults);
        this.nameVariants = new Map();
        this.surnameVariants = this.findSurnameVariants(this.surname);
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
        <label id="nameLabel">Name:
            <input type="text" id="surname" placeholder="Surname" value="${this.surname}" />
            <input type="text" id="location" placeholder="Location (Optional)" />
            <input type="submit" id="submit" name="submit" value="GO" />
        </label>
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

        <button id="tableViewButton" title="View the data in a table">Table</button>
        <button id="toggleGeneralStats" title="Show/hide statistics">Statistics</button>
        <button id="helpButton" title="About this">?</button>

        <div id="treesButtons">
          <div id="toggleButtons">
            <button class="toggleAll" id="showAll" title="show all descendants">+</button
            ><button class="toggleAll" id="hideAll" title="hide all descendants">−</button>
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
      <div id="help">
      <h2>About This</h2>
      <button id="closeHelp">×</button>
      <ol>
        <li>Put a surname (and optional location) in the box and hit 'Go'.</li>
        <li>
          The IDs of all public profiles with the surname (as Last Name at Birth, Current Last Name, or Other Name),
          plus any with variants of the surname as entered in the Google Sheet (click 'Variants'), are fetched from
          WikiTree+. This list is stored for the next time you enter the same surname. To refresh this list (to get the
          most up-to-date list available on WikiTree+), hit the 'Refresh' button.
        </li>
        <li>
          The data of all of the profiles is fetched from the WikiTree apps server. This may take a very long time (see
          #8).
        </li>
        <li>
          As all of the IDs returned by WikiTree+ are for open public profiles, if you are logged into the apps server,
          you may be able to retrieve the data of more profiles. A check is made of post-19th century profiles for any
          parents whose data is not among the retrieved data. If you are on the trusted list of a person with missing
          parents, another database call is made for these people.
        </li>
        <li>
          The profiles are sorted by birth date. (For profiles with only a death date, the death date is used for
          comparison.)
        </li>
        <li>
          Spouses with the target surname are added as spouses (below the first person's name, with "m." for "married").
        </li>
        <li>
          Offspring are added to offspring lists below their parents, creating many expandable/collapsible descendant
          trees. (The + and − at the top will expand and collapse all lists.)
        </li>
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
        <li>The numbers in green after a person's dates and categories and stickers are
          the number of descendants that the person has in this data set.</li>
        <li>
          Click the Statistics button to see statistics about the people in the data set.
          <ul>
            <li>
              The general statistics:
              <ul>
                <li>show the top few most common names and most common birth places for the whole set.</li>
              </ul>
            </li>
            <li>
              The period statistics:
              <ul>
                <li>show more detail on the people born in that period.</li>
              </ul>
            </li>
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
            <li>
              has filters in the footer of each column. The filters:
              <ul>
                <li>will work when you hit 'enter' or leave the input box.</li>
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
            <li>can be dismissed (to return to the Trees view) by clicking the 'Table' button.</li>
          </ul>
        </li>
        <li>
          The Location dropdown lets you filter the table my a location item: a town, state, country, etc. The default
          box shows the number of profiles that include that location part in the birth location. The toggle button next
          to it turns the list alphabetical.
        </li>
        <li>Have I missed anything?</li>
      </ol>
    </div>
    <section id="results"></section>
    <section id="table"></section>`;
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

        this.container.on("click", "#results .dates", function () {
            $this.showMoreDetails($(this));
        });

        this.header.on("click", "#addNameVariants", function (e) {
            e.preventDefault();
            window.open(
                "https://docs.google.com/spreadsheets/d/1VwYnlDVIw8MH4mKDQeRfJAW_2u2kSHyiGcQUw5yBepw/edit#gid=0",
                "_blank"
            );
        });

        // Event listener for the search button
        this.header.on("click", "#searchButton", function () {
            $this.handleSearch();
        });

        // Also allow searching by pressing the enter key in the search input
        this.header.on("keyup", "#searchInput", function (event) {
            if (event.keyCode === 13) {
                $this.handleSearch();
            }
        });

        this.header.on("click", "#refreshData", async function () {
            const surname = $("#surname").val();
            const location = $("#location").val();
            $("#refreshData").fadeOut();
            if (surname) {
                $this.showLoadingBar();
                $this.shakingTree.show();
                wtViewRegistry.clearStatus();
                $this.reset();
                $this.clearONSidsCache(surname); // Clear the cache for this surname
                $this.startTheFetching(surname, location);
            }
        });

        this.container.on("mouseover", ".person:not(.spouse,.notSpouse,.level_0) > a:first-of-type", function () {
            $this.showAncestralLineToRoot($(this));
        });

        this.container.on("mouseout", ".person", function () {
            $("#ancestralLinePopup").remove();
        });

        this.header.on("click", ".commonLocations .locationCount", function (e) {
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
        this.header.on("click", ".commonLocations .locationPart", function (event) {
            //event.stopPropagation(); // Prevent event bubbling
            const $subItem = $(this).closest("li").toggleClass("expanded");
            $subItem.children("ul").toggle(); // Toggle visibility of the nested list
        });

        this.header.on("dblclick", "#statisticsContainer,#periodStatisticsContainer", function () {
            $("#toggleGeneralStats").trigger("click");
        });

        $("#downloadData").on("click", function () {
            if (Object.keys($this.combinedResults).length > 0) {
                const surname = $("#surname").val();
                const fileName = "ONT_" + surname + "_" + new Date().toISOString().substring(0, 16) + ".json";
                const treeHtml = $("section#results").html(); // Get the HTML of the tree
                $this.downloadResults($this.combinedResults, treeHtml, fileName);
            } else {
                alert("No data to download.");
            }
        });

        this.header.on("change", "#fileInput", function (event) {
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

                    let sortedPeople = $this.sortPeopleByBirthDate($this.combinedResults);
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

        this.header.on("click", "#loadButton", function () {
            $("#fileInput").click(); // Triggers the hidden file input
        });

        this.header.on("click", "#cancelFetch", function () {
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
        $("#show-btn").on("click", function () {
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

        this.container.on("click", ".duplicateLink", function (e) {
            e.preventDefault();
            $this.handleSearch($(this).data("wtid"));
        });
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

    findSurnameVariants(surname) {
        if (!this.nameVariants.size) {
            this.nameVariants = this.retrieveData();
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
        const prefix = `ONTids_${surname}`;

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

                while (accessOrder.length > 0 && error.name === "QuotaExceededError") {
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
        $("#refreshData").prop("disabled", false);
    }

    async getONSids(surname, location) {
        wtViewRegistry.clearStatus();
        this.setNewTitle();
        let cacheKey = `ONTids_${surname.toLowerCase()}`;
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
        const surnameVariants = this.findSurnameVariants(surname);
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
        console.log(url);
        this.cancelFetchController = new AbortController();
        const response = await fetch(url, { signal: this.cancelFetchController.signal });
        let data;
        try {
            data = await response.json();
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error when fetching from WT+:", error);
            } else {
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

        console.log(data);
        return [false, data];
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
            const [aborted, people] = await this.getPeople(ids, start, limit, options);
            if (aborted) {
                return [true, 0];
            }
            const callTime = performance.now() - starttime;
            // const nrProfiles = Object.keys(people).length;
            const nrProfiles = !people
                ? 0
                : Array.isArray(people)
                ? people.length
                : typeof people === "object"
                ? Object.keys(people).length
                : 0;
            console.log(`Received ${nrProfiles} profiles for call ${callNr} (start:${start}) in ${callTime}ms`);
            if (nrProfiles === 0) {
                // An empty result means we've got all the results.
                // Checking for an empty object above, as opposed to an arrya is just belts and braces
                // because we're supposed to get an object, but it seems we get an array if there is nothing
                return [false, profiles];
            }
            if (people && typeof people === "object") {
                Object.assign(profiles, people);
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
            //"Privacy",
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
                    appId: "ONS",
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
            return [false, result[0].people];
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error("Error in getPeople:", error);
                return [false, []]; // Return an empty array in case of error
            } else {
                return [true, []];
            }
        }
    }

    async processBatches(ids, surname) {
        const $this = this;
        const userId = Cookies.get("wikidb_wtb_UserID") || Cookies.get("loggedInID");
        console.log("Starting processBatches", { userId, idsLength: ids ? ids.length : 0, surname });

        if (!ids || ids.length === 0) {
            console.error("No IDs provided for processing.");
            $("#results").html("<p id='noResults'>No results found.</p>");
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

        let missingParents = [];

        const starttime = performance.now();
        for (let i = 0; i < ids.length && !$this.cancelling; i += 1000) {
            const batchIds = ids.slice(i, i + 1000);
            // console.log(`Processing batch ${i / 1000 + 1}: IDs ${i} to ${i + 999}`);
            console.log(`Calling getPeople with ${batchIds.length} keys (of ${ids.length - i} still to fetch)`);
            const callStart = performance.now();
            // We don't do paging calls here because we're not expecting profiles other than the ids we've requested
            // and the API spec says "The initial set of profiles are returned in the results unpaginated by the
            // start/limit values".
            const [aborted, people] = await this.getPeople(batchIds);
            const callTime = performance.now() - callStart;
            if (aborted || $this.cancelling) {
                cancelIt();
                return;
            }
            const nrProfiles = !people
                ? 0
                : Array.isArray(people)
                ? people.length
                : typeof people === "object"
                ? Object.keys(people).length
                : 0;
            console.log(`Received ${nrProfiles} profiles in ${callTime}ms`);
            // console.log("People in batch:", people);
            // Combine the 'people' object with 'combinedResults'
            // console.log("Combined results before:", this.combinedResults);
            if (people && typeof people === "object") {
                Object.assign(this.combinedResults, people);
            }
            // console.log("Combined results after:", this.combinedResults);
            processed += batchIds.length;
            // We arbitrarily regard fetching the intial profiles as half of the work,
            // and fetching missing parents as the other half
            let percentage = (processed / total) * 50;
            this.updateLoadingBar(percentage);
            // console.log(`Batch processed: ${processed}/${total} (${percentage}%)`);
        }

        //  console.log("Initial processing complete. Checking for missing parents...");
        if (userId && !$this.cancelling) {
            Object.values(this.combinedResults).forEach((person) => {
                if (person?.BirthDateDecade?.replace(/s/, "") > 1890) {
                    if (person?.Father > 0 && !this.combinedResults[person.Father]) {
                        missingParents.push(person.Father);
                    }
                    if (person?.Mother > 0 && !this.combinedResults[person.Mother]) {
                        missingParents.push(person.Mother);
                    }
                }
            });
        }
        //   console.log(`Missing parents identified: ${missingParents.length}`);

        // this.hideLoadingBar(); // Reset the loading bar for processing missing parents
        // this.showLoadingBar();
        let processedParents = 0;
        let totalParents = missingParents.length;

        if (missingParents.length > 0) {
            console.log(`Fetching ${missingParents.length} missing parents and their children`);
            for (let i = 0; i < missingParents.length && !$this.cancelling; i += 100) {
                const batchIds = missingParents.slice(i, i + 100);
                const [aborted, people] = await this.getPeopleViaPagedCalls(batchIds, {
                    ancestors: 1,
                    descendants: 1,
                });
                if (aborted || $this.cancelling) {
                    cancelIt();
                    return;
                }
                if (people && typeof people === "object") {
                    Object.assign(this.combinedResults, people);
                }
                processedParents += batchIds.length;
                // We claim fethcing missing parents is the 2nd half of the work
                let percentage = (processedParents / totalParents) * 50 + 50;
                this.updateLoadingBar(percentage);
                // console.log(`Processed missing parents: ${processedParents}/${totalParents} (${percentage}%)`);
            }
        } else {
            this.updateLoadingBar(100);
        }
        const fetchTime = performance.now() - starttime;

        this.hideLoadingBar();
        //  console.log("Processing complete.");

        const profileCount = Object.keys(this.combinedResults).length;
        console.log(`Fetched profiles count: ${profileCount}`);
        console.log(`Total fetch time: ${fetchTime}ms`);

        // Now 'combinedResults' contains the combined data from all batches
        console.log(this.combinedResults);
        // If the surname is not LNAB, LNC, or LNO, filter out
        let filteredResults = {};
        // Get all variants for the surname
        this.surname = $("#surname").val();
        const surnameVariants = this.findSurnameVariants(this.surname);
        if (surnameVariants.length == 0) {
            // If no variants are found, use the surname as-is
            surnameVariants.push(this.surname);
        }
        console.log("Surname variants:", surnameVariants);

        if ($this.cancelling) {
            cancelIt();
            return;
        }
        $this.disableCancel();
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
                filteredResults[person.Id] = person;
                //  console.log("Added to filtered results:", person);
                // console.log("Filtered results:", filteredResults);
            }
        });
        // console.log("Filtered results:", filteredResults);

        // After batch processing, update the progress bar for additional steps
        processed = ids.length;
        this.updateLoadingBar((processed / extendedTotal) * 100);

        // Sort and map children to parents
        let sortedPeople = this.sortPeopleByBirthDate(filteredResults);
        console.log("sortedPeople", sortedPeople);
        this.prioritizeTargetName(sortedPeople);
        let parentToChildrenMap = this.createParentToChildrenMap(sortedPeople);
        this.peopleById = this.createPeopleByIdMap(sortedPeople);

        // Update progress bar after sorting and mapping
        processed += (extendedTotal - total) * 0.5; // Assuming these take about half of the remaining 20%
        this.updateLoadingBar((processed / extendedTotal) * 100);

        this.displayDescendantsTree(this.peopleById, parentToChildrenMap);

        // Update progress bar to complete
        this.updateLoadingBar(100);

        // After processing is complete
        this.hideLoadingBar();

        $("#downloadData").show();

        return;
    }

    prioritizeTargetName(sortedPeople) {
        for (let i = 0; i < sortedPeople.length; i++) {
            let person = sortedPeople[i];
            if (person.Spouses && person.Spouses.length > 0) {
                // Get spouse Ids from array of objects, each with a key for the spouse's Id
                const spouseIds = person.Spouses.map((spouse) => spouse.Id);
                spouseIds.forEach((spouseId) => {
                    // console.log("Spouse ID:", spouseId, typeof spouseId);
                    //sortedPeople.forEach((p) => console.log("Person ID in sortedPeople:", p.Id, typeof p.Id));
                    let spouse = sortedPeople.find((p) => p.Id == spouseId);
                    let stegen = false;
                    if (["Stegen-189", "Ostermann-148"].includes(person.Name)) {
                        console.log("Spouse:", spouse);
                        stegen = true;
                        console.log("Name:", person.Name);
                        console.log("Spouse:", spouse);
                        console.log(this.shouldPrioritize(spouse, person));
                    }

                    if (spouse && this.shouldPrioritize(spouse, person)) {
                        spouse.shouldBeRoot = false;
                        //    console.log("Prioritizing spouse:", spouse, "over person:", person);
                        // Remove the spouse from their current position
                        sortedPeople = sortedPeople.filter((p) => p.Id !== spouse.Id);
                        // Find the new index of the person since the array has been modified
                        let newPersonIndex = sortedPeople.findIndex((p) => p.Id == person.Id);
                        // Insert the spouse after the person
                        sortedPeople.splice(newPersonIndex + 1, 0, spouse);
                        if (stegen) {
                            console.log("Sorted people after prioritizing:", sortedPeople);
                            console.log("New person index:", newPersonIndex);
                        }
                    }
                });
            }
        }
    }

    shouldPrioritize(spouse, person) {
        // Convert the target surname and its variants into standardized forms for comparison
        const standardizedVariants = this.surnameVariants.map((variant) => this.standardizeString(variant));

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
            if (spouseCurrentLN === personLNAB || spouseCurrentLN === personCurrentLN) {
                return true; // Prioritize the person over the spouse
            }
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

        console.log("Root Individuals:", rootIndividuals); // Debugging statement
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
        if (person.Name == "Ostermann-506") {
            console.log(html);
        }
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

        ancestralPopup.find(".ancestor").click(function () {
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
        switchButton.on("click", () => {
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
        // displayedIndividuals has the IDs.  We need to get the Names from combinedResults.
        let names = [];
        for (let id of this.displayedIndividuals) {
            names.push(this.combinedResults[id].Name);
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
            if (this.combinedResults[id] && this.combinedResults[id].LastNameAtBirth) {
                let person = this.combinedResults[id];
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
        console.log("Root individuals IDs:", rootIndividualsIds);
        let rootIndividuals = rootIndividualsIds
            .map((id) => peopleById[id])
            .filter((root) => root.shouldBeRoot !== false)
            .sort((a, b) => this.getComparableDate(a).localeCompare(this.getComparableDate(b)));

        // !this.displayedIndividuals.has(String(root.Id)) &&

        rootIndividuals = this.adjustSortingForDeathDates(rootIndividuals);

        console.log("Root individuals:", rootIndividuals);

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
            "#searchContainer,#toggleDetails,#toggleWTIDs,#toggleGeneralStats,#tableViewButton,#treesButtons,#locationSelects"
        ).show();
        this.createNameSelectBoxes();
        this.showStatistics();

        this.hideLoadingBar();
        this.shakingTree.hide();
        $("#refreshData").prop("disabled", false);
    }

    async arrangeTreeElements() {
        const allChildrenElements = $("ul.children");
        const totalElements = allChildrenElements.length;
        let processedElements = 0;

        for (const childrenElement of allChildrenElements) {
            const thisParent = $(childrenElement).data("parent-id");
            $("li.person[data-id='" + thisParent + "']").append($(childrenElement));

            processedElements++;
            let percentage = (processedElements / totalElements) * 100;
            this.updateLoadingBar(percentage);

            // Yield control back to the browser
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

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
                if (parentId == "41246055") {
                    console.log("Child:", child);
                }
                const thisPersonHTML = this.personHtml(child, level);
                html += thisPersonHTML; // Use personHtml for each child
                // Recursively display children of this child, sorted
                if (!thisPersonHTML.includes("duplicate")) {
                    html += this.displayChildren(parentToChildrenMap, child.Id, peopleById, level + 1);
                }
            });
            html += "</ul>";
            if (parentId == "41246055") {
                console.log("HTML:", html);
            }
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
        $("div.message").remove();

        $("#toggleDetails,#toggleWTIDs").removeClass("on");
        $("#searchContainer,#toggleDetails,#toggleWTIDs,#tableViewButton").hide();
        $("#tableViewButton").removeClass("on");
        $(
            ".duplicateLink,#wideTableButton,#noResults,#statisticsContainer,#periodButtonsContainer,#tableView,#clearFilters,#tableView_wrapper,#filtersButton,#flipLocationsButton,#nameSelectsSwitchButton,#nameSelects"
        )
            .off()
            .remove();
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
        this.parentToChildrenMap = {};
        $("section#results").empty();
        $("#statsDisplay #periodStatisticsContainer").empty();
        $("#treesButtons").hide();
        $("#toggleGeneralStats").removeClass("on").hide();
        $("#locationSelects").hide();
    }

    generateStatsHTML(stats) {
        $("#statisticsContainer li").off();
        $("#statisticsContainer").remove(); // Remove any existing statistics container

        let $statsContainer = $("<div>", { id: "statisticsContainer" });

        // Total People
        $statsContainer.append(this.createStatItem("Total People: ", stats.getTotalPeople()));

        // Average Lifespan
        $statsContainer.append(this.createStatItem("Average Lifespan: ", stats.getAverageLifespan() + " years"));

        // Average Children Per Person
        $statsContainer.append(
            this.createStatItem("Average Children Per Male (over 16): ", stats.getAverageChildrenPerMaleOver16(), {
                title: `This is per male over 16 because the dataset will include their children, but not those of many of the women, whose children would tend to take their father's surname (due to this being a name study, mostly based on last name at birth).`,
            })
        );

        // Average Children Per Couple
        $statsContainer.append(
            this.createStatItem("Average Children Per Couple: ", stats.getAverageChildrenPerCoupleForDataset(), {
                title: "Average number of children per couple for the entire dataset.",
            })
        );

        // Most Common Names
        const topMaleNames = stats.getTopNamesByGender("Male", 100);
        const topFemaleNames = stats.getTopNamesByGender("Female", 100);
        const $commonNamesDiv = this.generateNamesHTML(topMaleNames, topFemaleNames);
        $statsContainer.append(this.createStatItem("Most Common Names: ", $commonNamesDiv));

        // Most Common Locations
        const locationStats = stats.getLocationStatistics();
        const $locationDiv = this.generateLocationHTML(locationStats);
        $statsContainer.append(this.createStatItem("Most Common Birth Places: ", $locationDiv));

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

    /*
    generateLocationHTML(locationStats) {
        console.log("generateLocationHTML", locationStats);

        let $locationDiv = $("<div class='commonLocations'>");
        const maxCountries = 3; // Maximum countries to show initially
        const maxLocations = 5; // Maximum locations to show initially within each country

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
                let subdivisionEntries = Object.entries(subdivisions)
                    .filter(([key, _]) => key !== "count" && key !== "")
                    .sort((a, b) => b[1].count - a[1].count);

                let $subdivisionList = $("<ul class='locationSubdivision'>");
                subdivisionEntries.forEach(([subdivision, subData], index) => {
                    const isVisible = index < maxLocations;
                    const countButton = this.locationCountButton(subdivision, subData.count);
                    let $subItem = $("<li>")
                        .append(`<span class="locationPart">${subdivision}</span> (${countButton})`)
                        .toggle(isVisible);

                    if (Object.keys(subData).length > 1) {
                        $subItem.addClass("expandable");
                        let $nestedList = this.generateNestedSubdivisionList(subData);
                        $subItem.append($nestedList.hide());
                    }
                    $subdivisionList.append($subItem);
                });

                if (subdivisionEntries.length > maxLocations) {
                    this.addToggleMoreLessButton($subdivisionList, maxLocations);
                }

                $countryDiv.append($subdivisionList);
            }

            $locationDiv.append($countryDiv);
        });

        if (countriesSorted.length > maxCountries) {
            this.addToggleMoreCountriesButton($locationDiv, maxCountries);
        }

        return $locationDiv;
    }
*/

    addToggleMoreLessButton($list, maxItems) {
        let $showMore = $("<li class='showMore locationToggler'>")
            .text("▶")
            .click(function () {
                this.toggleItemsVisibility($list, maxItems, this);
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
            .click(function () {
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
                let $toggleButton = $("<span class='toggleMoreNames'>▶</span>").click(function () {
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
        $statsContainer.append(this.createStatItem("Average Lifespan: ", periodStats.averageAgeAtDeath + " years"));

        // Average Children Per Person
        $statsContainer.append(
            this.createStatItem("Average Children Per Male (over 16): ", periodStats.averageChildren, {
                title: `Average number of children for each male born in this period and thought to have reached the age of 16. This is excludes females as the dataset will not include the children of many of the women, whose children would tend to take their father's surname (due to this being a name study, mostly based on last name at birth).`,
            })
        );

        // Average Children Per Couple
        $statsContainer.append(
            this.createStatItem("Average Children Per Couple: ", periodStats.averageChildrenPerCouple)
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
                        .click(function () {
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
        return $("<div>", { class: "stat-item", id: id, title: title }).append(
            $("<label>").text(label),
            value instanceof jQuery ? value : $("<span>").text(value)
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
                .on("click", function () {
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
        $("#toggleGeneralStats").after($locationSelects);

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
        }).on("click", function () {
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
        this.familyTreeStats = new FamilyTreeStatistics(this.combinedResults);
        console.log("Total People: ", this.familyTreeStats.getTotalPeople());
        console.log("Average Lifespan: ", this.familyTreeStats.getAverageLifespan(), "years");
        console.log("Birth Decade Distribution: ", this.familyTreeStats.getBirthDecadeDistribution());
        console.log("Child Counts: ", this.familyTreeStats.getChildCounts());
        console.log("Gender Distribution: ", this.familyTreeStats.getGenderDistribution());
        console.log("Common Names: ", this.familyTreeStats.getNameStatistics());

        // Get top 10 male names
        const topMaleNames = this.familyTreeStats.getTopNamesByGender("Male");
        console.log("Top 10 Male Names:", topMaleNames);

        // Get top 10 female names
        const topFemaleNames = this.familyTreeStats.getTopNamesByGender("Female");
        console.log("Top 10 Female Names:", topFemaleNames);

        // Get stats for each 50-year period
        const periodStats = this.familyTreeStats.getStatsBy50YearPeriods();
        console.log("Stats by 50-Year Periods:", periodStats);

        // Accessing location statistics
        const locationStats = this.familyTreeStats.getLocationStatistics();
        console.log("Country Counts: ", locationStats.countryCounts);
        console.log("Subdivision Counts: ", locationStats.subdivisionCounts);
        console.log("Location Counts: ", locationStats.locationCounts);
        // Show number of keys in locationStats.locationCounts
        console.log("Number of Location Parts: ", Object.keys(locationStats.locationCounts).length);

        // Category count
        const categoryCount = this.familyTreeStats.getCategoryCounts();
        console.log("Category Count: ", categoryCount);

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
        console.log("combinedResults", this.combinedResults);
        Object.keys(this.combinedResults).forEach(function (key) {
            const person = $this.combinedResults[key];
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

        // Apply the filter
        table.columns().every(function () {
            var column = this;

            $("input", this.footer()).on("change", function () {
                column.search(this.value).draw();
            });
            $("input", this.footer()).on("keyup", function (e) {
                if (e.keyCode === 13) {
                    column.search(this.value).draw();
                }
            });
        });

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

                let minYear, maxYear;

                // Interpret filterValue
                if (filterValue.includes("-")) {
                    [minYear, maxYear] = filterValue.split("-").map(Number);
                } else if (filterValue.startsWith("<")) {
                    maxYear = parseInt(filterValue.substring(1), 10);
                } else if (filterValue.startsWith(">")) {
                    minYear = parseInt(filterValue.substring(1), 10) + 1; // +1 to make it exclusive
                }

                // Apply filter logic
                if ((minYear && year < minYear) || (maxYear && year > maxYear)) {
                    isValid = false; // If any condition fails, set isValid to false
                }
            });

            // Custom location-based filtering logic
            if (locationFilterValue && !correctedLocation.toLowerCase().includes(locationFilterValue)) {
                isValid = false;
            }

            return isValid; // Only include rows where isValid remains true
        });

        const wideTableButton = $("<button>", { id: "wideTableButton" }).text("Wide");
        $("#tableView_wrapper #tableView_length").after(wideTableButton);
        wideTableButton.on("click", function () {
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
        flipLocationsButton.on("click", function () {
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

        $("#toggleGeneralStats").on("click", function () {
            setTimeout($this.setStickyHeader, 300); // Adjust the timeout based on actual delay
        });

        // Initial call to ensure the sticky header is correctly positioned on page load
        this.setStickyHeader();

        $(".dateFilter").off(); // Remove any existing event listeners

        $(".dateFilter").on("change", function () {
            table.draw();
        });
        $(".dateFilter").on("keyup", function (e) {
            if (e.keyCode === 13) {
                table.draw();
            }
        });

        $(".filter").on("keyup", function () {
            this.clearFiltersButton();
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
        $("#clearFilters").on("click", function () {
            $this.shakingTree.show();
            setTimeout(function () {
                $(".filter").val("");
                $this.clearAllFilters();
                $("#clearFilters").off();
                $("#clearFilters").remove();
            }, 0);
        });
    }

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
            const errorHtml = `<div class='error'>No results found.</div>`;
            $("section#results").prepend(errorHtml);
            $this.triggerError();
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
        $this.processBatches(ids, surname).then(() => $this.disableCancel());
    }

    documentReady() {
        this.addCategoryKeyToHelp();
        const $this = this;
        $("#submit").on("click", async function () {
            $("#refreshData").prop("disabled", true);
            console.log("Submit clicked");
            $this.shakingTree.show();
            $("div.error").remove(); // Remove any existing error messages

            // There is a comma, the name is before the first comma. Anything after the first comma is a location.
            let surname = $("#surname").val();
            let location = $("#location").val().trim(); // Get the location from the new input field

            if (surname.includes(",")) {
                surname = surname.split(",")[0].trim();
                location = $("#surname").val().split(",").slice(1).join(",").trim();
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
        $("#helpButton,#closeHelp").on("click", function (e) {
            e.preventDefault();
            // Calculate the position of the helpButton
            const helpButtonOffset = $("#helpButton").offset();
            const helpButtonHeight = $("#helpButton").outerHeight();

            // Position the help modal below the helpButton and align it based on your design needs
            helpModal.css({
                position: "fixed",
                top: helpButtonOffset.top + helpButtonHeight + 10, // 10px for a little spacing from the button
                zIndex: 1000, // Ensure the modal is above other content; adjust as necessary
            });

            helpModal.slideToggle();
        });
        helpModal.on("dblclick", function (e) {
            e.preventDefault();
            helpModal.slideUp();
        });
        // Escape key closes the modal
        $(document).keyup(function (e) {
            if (e.key === "Escape") {
                helpModal.slideUp();
            }
        });

        $("#toggleDetails").on("click", function () {
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

        $("#toggleWTIDs").on("click", function () {
            if ($(this).hasClass("off")) {
                $(this).removeClass("off").addClass("on");
                $(".wtid").show();
            } else {
                $(this).removeClass("on").addClass("off");
                $(".wtid").hide();
            }
        });

        $("#toggleGeneralStats").on("click", function () {
            if ($(this).hasClass("on") == false) {
                $(this).removeClass("off").addClass("on");
                $("#statsDisplay").slideDown();
            } else {
                $(this).removeClass("on").addClass("off");
                $("#statsDisplay").slideUp();
            }
        });

        $("#tableViewButton").click(function () {
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
                $("#toggleButtons,#nameSelects,#toggleDetails,#toggleWTIDs").hide();
            } else {
                $treeViewContainer.show();
                $tableViewContainer.hide();
                $(this).removeClass("on").attr("title", "Show table view");
                $("#clearFilters").off().remove();
                $("#toggleButtons,#nameSelects,#toggleDetails,#toggleWTIDs").show();
            }
            if ($("#periodButtonsContainer button.on").length) {
                $("#birthDateFilter").val($("#periodButtonsContainer button.on").text());
                $("#birthDateFilter").trigger("change");
            }

            $this.clearFiltersButton();
        });

        $this.loadFromURL();
    }
};
