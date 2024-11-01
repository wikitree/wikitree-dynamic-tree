import { Utils } from "../shared/Utils.js";

window.HeritageView = class HeritageView extends View {
    static #helpText = `
    <xx>[ x ]</xx>
    <h2 style="text-align: center">About Heritage Charts</h2>
    <p>
        This app shows the heritage of a profile based on the birth countries of that profile's ancestors or descendants.
        The birth country is the right most part of the birth location field. The number of generations to analyse can
        be changed. Hover over any pie section to display the country name and percentage.  
    </p>
    <h3>Overview Mode</h3>
    <p>
        In overview mode, the output is a single pie chart representing the overall distribution of birth countries for
        the selected generations of ancestors. Each slice of the chart corresponds to a country, sized by the cumulative
        "heritage value" from that country across all generations. This provides a high-level view of the person’s heritage.
    </p>
    <h3>Details Mode</h3>
    <p>
        In details mode, one pie is shown per generations. These can either be ancestors or descendants, depending on
        the direction. At each generation, if the birth location value is not recorded, or unavailable due to privacy,
        the country is shown as 'Unknown'.
    </p>
    <p>
        For full instructions and details about the app, <a href="https://www.wikitree.com/wiki/Space:Tree_Apps_-_Heritage_Charts"
        target="_blank">click here</a>
        <br/>
        If you find problems with this app or have suggestions for improvements, please
        post a comment on <a href="https://www.wikitree.com/g2g/1808677" target="_blank">the G2G post</a>.
    </p>
    <p>You can double click in this box, or click the X in the top right corner to remove this About text.</p>
    `;

    meta() {
        return {
            // short title - will be in select control
            title: "Heritage Charts",
            // some longer description or usage
            description: "For each generation show a chart of the birth countries",
            // link pointing at some webpage with documentation
            docs: "",
        };
    }

    init(container_selector, person_id) {
        // do whathever you want there
        // to showcase your awesome view, e.g.

        let genNames = [];
        let GENERATIONS = 5; // default value
        let familyMembers = {};
        let direction = "ancestor"; // default value

        document.querySelector(container_selector).innerHTML = `
            <div id="heritageContainer" class="heritage">
                <div id="controlBlock" class="heritage-not-printable">
                    <label for="generations" title="The number of generations to fetch from WikiTree">Max Generations:</label>
                    <select id="generations" title="The number of generations to fetch from WikiTree">
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5" selected>5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                    </select>
                    <button id="getHeritageButton" class="small button" title="Show heritage">Show heritage</button>
                    <span id="help-button" title="About this">?</span>
                    <div id="help-text">${window.HeritageView.#helpText}</div><br>
                    <fieldset id="heritageFieldset">
                        <legend id="aleOptions" title="Click to Close/Open the options">Options:</legend>
                        <table id="optionsTbl">
                            <tr>
                                <td>Mode:
                                    <input type="radio" id="overview" name="mode" value="overview" checked="checked">
                                    <label for="overview" title="Single overview chart">Overview</label>
                                    <input type="radio" id="details" name="mode" value="details">
                                    <label for="details" title="Table of details per generation">Details</label>
                                </td>
                            </tr>
                            <tr id="details_options">
                                <td>Direction:
                                    <input type="radio" id="ancestor" name="direction" value="ancestor" checked="checked">
                                    <label for="ancestor" title="Ancestor">Ancestors</label>
                                    <input type="radio" id="descendant" name="direction" value="descendant">
                                    <label for="descendant" title="Descendant">Descendants</label>
                                </td>
                            </tr>
                            <tr id="ancestors_options">
                                <td>Missing Ancestors:
                                    <input type="checkbox" id="missingAsUnknown" name="missingAsUnknown" value="missingAsUnknown">
                                    <label for="missingAsUnknown" title="Show missing ancestors as 'Unknown' country">Show missing ancestors as 'Unknown' country</label>
                                </td>
                            </tr>
                        </table>
                    </fieldset>
                </div>
                <table id="heritage-table">
                    <thead>
                        <tr>
                            <th>Generation</th>
                            <th>Relation</th>
                            <th>Total Profiles</th>
                            <th class="center">Birth Heritage</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
                <div id="results-container"></div>
            </div>
            <div id="g2g">If you have suggestions for this app, please post a comment on
                <a href="https://www.wikitree.com/g2g/1808677" target="_blank">the G2G post</a>.</div>
        `;

        $("#getHeritageButton").on("click", function () {
            gatherHeritage(person_id);
        });

        // Add click action to help button
        const helpButton = document.getElementById("help-button");
        helpButton.addEventListener("click", function () {
            $("#help-text").slideToggle();
        });
        $("#help-text").draggable();

        // Add the help text as a pop-up
        const help = document.getElementById("help-text");
        help.addEventListener("dblclick", function () {
            $(this).slideToggle();
        });
        document.querySelector("#help-text xx").addEventListener("click", function () {
            $(this).parent().slideUp();
        });

        $(document).on("keyup", function (e) {
            if (e.key === "Escape" || e.keyCode === 27) {
                $("#help-text").slideUp();
            }
        });

        document.querySelector("#overview").addEventListener("change", optionsEventListner);
        document.querySelector("#details").addEventListener("change", optionsEventListner);
        document.querySelector("#ancestor").addEventListener("change", optionsEventListner);
        document.querySelector("#descendant").addEventListener("change", optionsEventListner);

        function optionsEventListner() {
            if ($("#details").is(":checked")) {
                document.querySelector("#details_options").style.display = "block";
                if ($("#ancestor").is(":checked")) {
                    document.querySelector("#ancestors_options").style.display = "block";
                } else {
                    document.querySelector("#ancestors_options").style.display = "none";
                }
            } else {
                document.querySelector("#details_options").style.display = "none";
                document.querySelector("#ancestors_options").style.display = "none";
            }
        }

        gatherHeritage(person_id);

        async function gatherHeritage(id) {
            $("#getHeritageButton").prop("disabled", true);
            Utils.showShakingTree();

            familyMembers = {};

            GENERATIONS = $("#generations").val();
            let outputMode = "overview"; // default value
            let missingAsUnknown = false;
            if ($("#overview").is(":checked")) {
                outputMode = "overview";
                direction = "ancestor";
            }
            if ($("#details").is(":checked")) {
                outputMode = "details";
                if ($("#ancestor").is(":checked")) {
                    direction = "ancestor";
                    if ($("#missingAsUnknown").is(":checked")) {
                        missingAsUnknown = true;
                    }
                }
                if ($("#descendant").is(":checked")) {
                    direction = "descendant";
                }
            }
            // toggle heritage-table visibility
            let table = document.getElementById("heritage-table");
            table.hidden = outputMode == "overview";

            let results = document.getElementById("results-container");
            results.innerHTML = ""; // Clear away any previous results
            let tableBody = document.querySelector("#heritage-table > tbody");
            tableBody.innerHTML = ""; // Clear away any previous results

            await getFamilyMembers(id);

            if (Object.keys(familyMembers).length == 1) {
                alert("Only one result. Have you used a private or unlisted profile?");
                Utils.hideShakingTree;
            } else {
                if (outputMode == "overview") {
                    findOverallHeritage(id);
                } else {
                    fillGenNames();
                    findCountryCountByGeneration(missingAsUnknown);
                }
            }
        }

        async function getFamilyMembers(id) {
            // get ancestors / descendants of given ID with getPeople

            let status,
                resultByKey,
                ancestor_json = {};

            const options = {};
            if (direction == "ancestor") {
                options["ancestors"] = GENERATIONS;
            }
            if (direction == "descendant") {
                options["descendants"] = GENERATIONS;
            }

            let getMore = false;
            do {
                let startProfile = Object.keys(familyMembers).length;
                options["start"] = startProfile;
                [status, resultByKey, ancestor_json] = await WikiTreeAPI.getPeople(
                    "heritage",
                    id,
                    ["BirthLocation, BirthLocation, Name, Derived.BirthName, Father, Mother, Meta"],
                    options
                );
                // save the list of familyMembers
                familyMembers = { ...familyMembers, ...ancestor_json };

                getMore = status.startsWith("Maximum number of profiles");
            } while (getMore);
        }

        function findOverallHeritage(id) {
            let countries = []; // The data for the chart

            let processingList = [];
            // Add starting profile to the list to be processed
            processingList.push(id);

            let index = 0;
            // Process the list
            while (index < processingList.length) {
                let familyMember = familyMembers[processingList[index]];
                let generation = familyMember["Meta"]["Degrees"];
                // Check father
                checkParent(familyMember, familyMember.Father, generation);

                // Check mother
                checkParent(familyMember, familyMember.Mother, generation);

                index++;
            }

            let colorFunction = generateColorMapFunction(countries);
            countries.sort(sortByPercentageDesc);
            let chart = generateChart(countries, colorFunction);
            let legend = getLengend(countries, colorFunction);
            let results = document.getElementById("results-container");
            results.appendChild(legend);
            results.appendChild(chart);

            Utils.hideShakingTree();
            $("#getHeritageButton").prop("disabled", false);

            function checkParent(familyMember, parent, generation) {
                let birthLocation = "";
                if (parent && generation < GENERATIONS) {
                    familyMembers[parent];
                    if (familyMembers[parent].hasOwnProperty("BirthLocation")) {
                        birthLocation = familyMembers[parent]["BirthLocation"];
                    }
                }
                if (birthLocation) {
                    processingList.push(parent);
                } else {
                    let heritageFraction = 0.5 / Math.pow(2, Number(generation));

                    let birthCountry;
                    if (familyMember.hasOwnProperty("BirthLocation")) {
                        birthCountry = Utils.settingsStyleLocation(familyMember["BirthLocation"], "Country");
                    }
                    if (!birthCountry) {
                        birthCountry = "Unknown";
                    }

                    // check if country is already in the list
                    let item = countries.find((element) => element.name == birthCountry);
                    if (item) {
                        // increase the percentage
                        item.percentage += heritageFraction;
                    } else {
                        countries.push({ name: birthCountry, percentage: heritageFraction });
                    }
                }
            }
        }

        function fillGenNames() {
            let modifier = ""; // Either parents or children
            if (direction == "ancestor") {
                genNames[0] = "Parents";
                modifier = "parents";
            } else if (direction == "descendant") {
                genNames[0] = "Children";
                modifier = "children";
            }
            genNames[1] = "Grand" + modifier;
            genNames[2] = "Great-Grand" + modifier;
            if (GENERATIONS > 2) {
                for (let i = 3; i <= GENERATIONS; i++) {
                    let greats = i - 1;
                    genNames[i] = greats + "x Great-Grand" + modifier;
                }
            }
        }

        async function findCountryCountByGeneration(missingAsUnknown) {
            // setup birth and death country storage with an array for each generation
            const profileCounts = {};
            const birthCountries = {};
            const deathCountries = {};
            for (let i = 0; i < GENERATIONS; i++) {
                profileCounts[i] = 0;
                birthCountries[i] = [];
                deathCountries[i] = [];
            }

            // for each family member
            for (const person in familyMembers) {
                const familyMember = familyMembers[person];

                let generation = familyMember["Meta"]["Degrees"] - 1;
                // Ignore starting profile as their heritage is derived from their parents
                if (generation >= 0) {
                    let birthCountry;
                    let deathCountry;
                    if (familyMember.hasOwnProperty("BirthLocation")) {
                        birthCountry = Utils.settingsStyleLocation(familyMember["BirthLocation"], "Country");
                    }
                    if (familyMember.hasOwnProperty("DeathLocation")) {
                        deathCountry = Utils.settingsStyleLocation(familyMember["DeathLocation"], "Country");
                    }

                    // increase the profile count of the proper generation
                    profileCounts[generation]++;

                    // add the birth country to the proper generation
                    let birthGeneration = birthCountries[generation];
                    if (birthCountry) {
                        birthGeneration.push(birthCountry);
                    } else {
                        birthGeneration.push("Unknown");
                    }

                    // add the death country to the proper generation
                    let deathGeneration = deathCountries[generation];
                    if (deathCountry) {
                        deathGeneration.push(deathCountry);
                    } else {
                        deathGeneration.push("Unknown");
                    }
                }
            }

            // calculate country profile count for each generation
            const displayBirthCountries = [];
            const colorFunctions = [];
            const chartSVGs = [];
            for (const generation in birthCountries) {
                let countries = [];
                birthCountries[generation].forEach((country) => {
                    // check if country is already in the list
                    let item = countries.find((element) => element.name == country);
                    if (item) {
                        // increment the profile count
                        item.count++;
                    } else {
                        countries.push({ name: country, count: 1 });
                    }
                });

                let totalForGeneration = missingAsUnknown
                    ? Math.pow(2, Number(generation) + 1)
                    : profileCounts[generation];

                if (missingAsUnknown) {
                    // Find the unknown country entry and increase it if there are any missing profiles
                    let missingProfiles = totalForGeneration - profileCounts[generation];
                    if (missingProfiles > 0) {
                        let item = countries.find((element) => element.name == "Unknown");
                        if (item) {
                            // increment the profile count
                            item.count += missingProfiles;
                        } else {
                            countries.push({ name: "Unknown", count: missingProfiles });
                        }
                    }
                }

                let colorFunction = generateColorMapFunction(countries);
                colorFunctions.push(colorFunction);

                countries.sort(sortByCountDesc);
                countries.forEach((entry) => {
                    entry.percentage = entry.count / totalForGeneration;
                });

                displayBirthCountries.push(countries);

                let chart = generateChart(countries, colorFunction);
                chartSVGs.push(chart);
            }

            const displayDeathCountries = [];

            // Show a list of all countries across all generations
            let results = document.getElementById("results-container");

            // let avgGenLengthDiv = document.createElement("div");
            // avgGenLengthDiv.innerHTML = `Average generation length: ${overallAvgGenLength}`;
            // results.appendChild(avgGenLengthDiv);

            // // calculate the average lifespan overall
            // let overallAvgLifeSpan = 0;
            // let lifeSpanSum = 0;
            // let totalLifeSpans = 0;

            // for (const lifeSpan in avgLifeSpans) {
            //     if (avgLifeSpans[lifeSpan] != "-") {
            //         lifeSpanSum += avgLifeSpans[lifeSpan];
            //         totalLifeSpans++;
            //     }
            // }
            // overallAvgLifeSpan = Math.round(lifeSpanSum / totalLifeSpans);
            // let avgLifeSpanDiv = document.createElement("div");
            // avgLifeSpanDiv.innerHTML = `Average lifespan: ${overallAvgLifeSpan}`;
            // results.appendChild(avgLifeSpanDiv);

            fillTable({
                profileCounts: profileCounts,
                displayBirthCountries: displayBirthCountries,
                displayDeathCountries: displayDeathCountries,
                colorFunctions: colorFunctions,
                chartSVGs: chartSVGs,
            });
        }

        function fillTable(values) {
            let table = document.querySelector("#heritage-table > tbody");

            for (let generation = 0; generation < GENERATIONS; generation++) {
                let maxAncestorsForGen = Math.pow(2, generation + 1);

                let row = table.insertRow(-1);
                row.id = "heritage-row" + generation;
                row.insertCell(0).innerHTML = generation + 1;
                row.insertCell(1).innerHTML = genNames[generation];
                if (direction == "ancestor") {
                    row.insertCell(2).innerHTML = `${values.profileCounts[generation]}/${maxAncestorsForGen}`;
                } else {
                    row.insertCell(2).innerHTML = `${values.profileCounts[generation]}`;
                }
                let cell3 = row.insertCell(3);
                cell3.setAttribute("rowspan", 2);
                cell3.appendChild(values.chartSVGs[generation]);

                let legendRow = table.insertRow(-1);
                legendRow.id = "legend-row" + generation;
                let legendDiv = getLengend(values.displayBirthCountries[generation], values.colorFunctions[generation]);
                let legendCell = legendRow.insertCell();
                legendCell.setAttribute("colspan", 3);
                legendCell.appendChild(legendDiv);

                // row.insertCell(5).innerHTML = values.latestBirthCountries[generation];
                // row.insertCell(6).innerHTML = values.avgBirthCountries[generation];
                // row.insertCell(7).innerHTML = values.avgGenLengths[generation];
                // row.insertCell(8).innerHTML = values.avgLifeSpans[generation];
                // row.insertCell(9).innerHTML = "<i>loading</i>";
                // row.insertCell(10).innerHTML = "<i>loading</i>";
            }

            Utils.hideShakingTree();
            $("#getHeritageButton").prop("disabled", false);
        }

        function getLengend(countries, colorFunction) {
            let legendHTML = "";
            countries.forEach((item) => {
                legendHTML +=
                    "<span class='legend-bullet' style='background-color:" +
                    colorFunction(item.name) +
                    "'></span>" +
                    "&nbsp" +
                    "<span class='legend-label'>" +
                    item.name +
                    "&nbsp" +
                    item.percentage.toLocaleString(undefined, {
                        style: "percent",
                        maximumSignificantDigits: 2,
                    }) +
                    "</span>" +
                    "<br>";
            });
            let div = document.createElement("div");
            div.setAttribute("id", "legend");
            div.innerHTML = legendHTML;

            return div;
        }

        function generateColorMapFunction(data) {
            // Create the color scale.
            const color = d3
                .scaleOrdinal()
                .domain(data.map((d) => d.name))
                .range(
                    d3
                        .quantize(
                            (t) => d3.interpolateSpectral(t * 0.8 + 0.1),
                            data.length == 1 ? data.length + 1 : data.length
                        )
                        .reverse()
                );
            return color;
        }

        function generateChart(data, color) {
            // Specify the chart’s dimensions.
            const width = 750;
            const height = Math.min(width, 600);

            // Create the pie layout and arc generator.
            const pie = d3
                .pie()
                .sort(null)
                .value((d) => d.percentage);

            const arc = d3
                .arc()
                .innerRadius(0)
                .outerRadius(Math.min(width, height) / 2 - 1)
                .startAngle((d) => d.startAngle + Math.PI / 2)
                .endAngle((d) => d.endAngle + Math.PI / 2);

            const labelRadius = arc.outerRadius()() * 0.8;

            // A separate arc generator for labels.
            const arcLabel = d3
                .arc()
                .innerRadius(labelRadius)
                .outerRadius(labelRadius)
                .startAngle((d) => d.startAngle + Math.PI / 2)
                .endAngle((d) => d.endAngle + Math.PI / 2);

            const arcs = pie(data);

            // Create the SVG container.
            const svg = d3
                .create("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", [-width / 2, -height / 2, width, height])
                .attr("style", "max-width: 100%; height: auto;"); // font: 14px sans-serif;");

            // Add a sector path for each value.
            svg.append("g")
                .attr("stroke", "grey")
                .selectAll()
                .data(arcs)
                .join("path")
                .attr("fill", (d) => color(d.data.name))
                .attr("d", arc)
                .append("title")
                .text(
                    (d) =>
                        d.data.name +
                        ": (" +
                        d.data.percentage.toLocaleString(undefined, {
                            style: "percent",
                            maximumSignificantDigits: 2,
                        }) +
                        ")"
                );

            // Create a new arc generator to place a label close to the edge.
            // The label shows the value if there is enough room.
            svg.append("g")
                .attr("text-anchor", "middle")
                .selectAll()
                .data(arcs)
                .join("text")
                .call((text) =>
                    text
                        .filter((d) => d.endAngle - d.startAngle > 0.05 && d.endAngle - d.startAngle <= 0.2)
                        .attr(
                            "transform",
                            (d) =>
                                `translate(${arcLabel.centroid(d)}) rotate(${
                                    ((d.startAngle + d.endAngle) / 2 / (2 * Math.PI)) * 360 - 360
                                })`
                        )
                        .attr("text-anchor", "middle")
                        .append("tspan")
                        .attr("fill", (d) => Utils.chooseForeground(color(d.data.name)))
                        .text((d) => d.data.name)
                )
                .call((text) =>
                    text
                        .filter((d) => d.endAngle - d.startAngle > 0.2)
                        .attr("transform", (d) => `translate(${arcLabel.centroid(d)})`)
                        .append("tspan")
                        .attr("y", "-0.4em")
                        .attr("fill", (d) => Utils.chooseForeground(color(d.data.name)))
                        .text((d) => d.data.name)
                )
                .call((text) =>
                    text
                        .filter((d) => d.endAngle - d.startAngle > 0.2)
                        .attr("transform", (d) => `translate(${arcLabel.centroid(d)})`)
                        .append("tspan")
                        .attr("x", 0)
                        .attr("y", "0.7em")
                        .attr("fill", (d) => Utils.chooseForeground(color(d.data.name)))
                        .attr("fill-opacity", 0.7)
                        .attr("style", "font-size: 12px")
                        .text(
                            (d) =>
                                // d.data.count.toLocaleString() +
                                "(" +
                                d.data.percentage.toLocaleString(undefined, {
                                    style: "percent",
                                    maximumSignificantDigits: 2,
                                }) +
                                ")"
                        )
                );

            return svg.node();
        }

        function sortByCount(a, b) {
            if (a.count == b.count) {
                return a.name < b.name ? -1 : 1;
            }
            return a.count - b.count;
        }
        function sortByCountDesc(a, b) {
            if (a.count == b.count) {
                return a.name < b.name ? -1 : 1;
            }
            return sortByCount(b, a);
        }
        function sortByPercentageDesc(a, b) {
            if (a.percentage == b.percentage) {
                return a.name < b.name ? -1 : 1;
            }
            return b.percentage - a.percentage;
        }
    }
};
