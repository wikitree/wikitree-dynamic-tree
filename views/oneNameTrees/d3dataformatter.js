export class D3DataFormatter {
    constructor(statsByPeriod) {
        console.log("D3DataFormatter constructor called");
        console.log("statsByPeriod", statsByPeriod);
        this.clearExistingData();
        $("#locationsVisualization").remove();
        $("#lifespanGraph").remove();
        $("#peopleCountGraph").remove();
        $("#migrationSankey").remove();
        this.statsByPeriod = statsByPeriod;
        this.currentPeriodIndex = 0;
        this.currentMigrationPeriodIndex = 0;
        this.locationHierarchy = { name: "All Periods", children: [] };
        this.peopleArray = [];
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
        this.migrationEvolutionInterval = null;
        // console.log("Location Hierarchy:", JSON.parse(JSON.stringify(this.locationHierarchy)));
        // this.initVisualization();
    }

    clearExistingData() {
        // Remove existing SVG elements related to D3 visualizations

        d3.select("#migrationSankey svg").selectAll("*").data([]).exit().remove();
        d3.select("#locationsVisualization svg").selectAll("*").data([]).exit().remove();
        d3.select("#lifespanGraph svg").selectAll("*").data([]).exit().remove();
        d3.select("#peopleCountGraph svg").selectAll("*").data([]).exit().remove();
        d3.select("#migrationSankey svg").remove();
        d3.select("#locationsVisualization svg").remove();
        d3.select("#lifespanGraph svg").remove();
        d3.select("#peopleCountGraph svg").remove();

        // Reset any data structures that might hold old data
        this.peopleArray = [];
        this.locationHierarchy = { name: "All Periods", children: [] };
        this.currentPeriodIndex = 0;
        this.currentMigrationPeriodIndex = 0;

        // Clear intervals
        clearInterval(this.migrationInterval);
        clearInterval(this.periodInterval);
        clearInterval(this.migrationPeriodInterval);
        // etc. for other relevant properties

        // Optionally, reset UI elements or visual indicators
        // For example, clear out any existing tooltips or interactive elements
        $("#migrationSankey #personTooltip").empty();
        $("#locationsVisualization #locationTooltip").empty();

        // etc. for other UI elements
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

    formatPeriodData() {
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

    doDrawGraph(id) {
        let accessorFunction, title, formatType;

        switch (id) {
            case "lifespanGraph":
                accessorFunction = (d) => d.averageAgeAtDeath;
                title = "Average Lifespan";
                formatType = "float"; // Use floating-point numbers for lifespan
                break;
            case "peopleCountGraph":
                accessorFunction = (d) => d.peopleCount;
                title = "Number of Profiles";
                formatType = "int"; // Use integers for people count
                break;
            // Add more cases as needed
            default:
                console.error("Unsupported graph ID:", id);
                return; // Exit the function if id doesn't match
        }

        const formattedData = this.formatPeriodData();
        this.drawGraph(formattedData, accessorFunction, title, id, formatType);
    }

    drawGraph(data, accessorFunction, title, id, formatType) {
        const graphDiv = $(`<div id="${id}" class="graph popup"><x>x</x></div>`);
        $("body").append(graphDiv);
        graphDiv.draggable();

        const margin = { top: 30, right: 10, bottom: 30, left: 40 };
        const width = graphDiv.width() - margin.left - margin.right;
        const height = graphDiv.height() - margin.top - margin.bottom;

        const svg = d3
            .select(graphDiv[0])
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3
            .scaleBand()
            .range([0, width])
            .domain(data.map((d) => d.period));
        const y = d3
            .scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data, accessorFunction)]);

        const line = d3
            .line()
            .x((d) => x(d.period) + x.bandwidth() / 2)
            .y((d) => y(accessorFunction(d)));

        svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", line);

        svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

        svg.append("g").call(d3.axisLeft(y));

        svg.selectAll(".text")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", (d) => x(d.period) + x.bandwidth() / 2)
            .attr("y", (d) => y(accessorFunction(d)) - 10)
            .attr("text-anchor", "middle")
            .text((d) => {
                const value = accessorFunction(d);
                return formatType === "float" ? value.toFixed(2) : value.toString();
            });

        svg.selectAll(".point")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", (d) => x(d.period) + x.bandwidth() / 2)
            .attr("cy", (d) => y(accessorFunction(d)))
            .attr("r", 5)
            .attr("fill", "forestgreen");

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", 0 - margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "1em")
            .style("font-weight", "bold")
            .text(title);
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
        </div>
      `;

        /*
      <button id="startEvolution" class="active" title="Automatically move from one period to the next">▶️</button>
      <button id="stopEvolution" title="Stop automatic movement through the periods">⏹️</button>
     */

        locationsVisualisationDiv.append(controlButtons);

        $("#prevPeriod").on("click.oneNameTrees", () => this.showPreviousPeriod());
        $("#nextPeriod").on("click.oneNameTrees", () => this.showNextPeriod());

        this.visualizeDataWithD3();
    }

    updateVisualizationForPeriod() {
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

    // Migration data

    extractMigrationFlows() {
        const periodMigrations = {};

        // statsByPeriod is an object with period names as keys and period stats as values
        //this.statsByPeriod.forEach((period) => {
        Object.entries(this.statsByPeriod).forEach(([periodName, period]) => {
            const migrations = {};
            period.migrantIds.forEach((id) => {
                const person = period.locationStatistics.peopleArray.find((p) => p.Id === id);
                const birthLocation = person.BirthLocation;
                const deathLocation = person.DeathLocation;
                const birthLocationParts = birthLocation.split(/,\s?/);
                // Trim and reverse the array; then join the first two elements
                const birthRegion = birthLocationParts
                    .map((part) => part.trim())
                    .reverse()
                    .slice(0, 2)
                    .join(", ");
                const deathLocationParts = deathLocation.split(/,\s?/);
                const deathRegion = deathLocationParts
                    .map((part) => part.trim())
                    .reverse()
                    .slice(0, 2)
                    .join(", ");

                const key = `${birthRegion} -> ${deathRegion}`;
                if (!migrations[key]) {
                    migrations[key] = { source: birthRegion, target: deathRegion, volume: 0, people: [] };
                }
                migrations[key].volume += 1;
                migrations[key].people.push(person);
            });
            // Store migrations for the current period
            periodMigrations[periodName] = Object.values(migrations);
        });

        console.log("Period-specific migration flows:", periodMigrations);

        return periodMigrations;
    }

    // New method for processing migration data
    processMigrationData(migrationsData) {
        // Extract unique locations as nodes
        let locationsSet = new Set();
        migrationsData.forEach((migration) => {
            locationsSet.add(migration.source);
            locationsSet.add(migration.target);
        });
        let nodes = Array.from(locationsSet).map((location, index) => {
            return { id: index, name: location }; // Assign an ID for reference
        });

        // Transform migrations into links
        let links = migrationsData.map((migration) => {
            let sourceNode = nodes.find((node) => node.name === migration.source);
            let targetNode = nodes.find((node) => node.name === migration.target);
            return {
                source: sourceNode.id,
                target: targetNode.id,
                volume: migration.volume,
                // You can add more metadata here, like people array
                people: migration.people,
            };
        });

        // The method returns an object containing both nodes and links
        return { nodes, links };
    }

    prepareSankeyData(migrationsData) {
        // Initialize arrays for nodes and links
        let nodes = [],
            links = [];
        const sourceNodes = new Map();
        const targetNodes = new Map();

        // Function to add or get a node from a map, and return its index
        function addOrGetNode(map, name, isTarget = false) {
            if (!map.has(name)) {
                const node = { name, id: nodes.length, isTarget };
                nodes.push(node);
                map.set(name, node.id);
            }
            return map.get(name);
        }

        migrationsData.forEach((migration) => {
            const sourceId = addOrGetNode(sourceNodes, migration.source);
            const targetId = addOrGetNode(targetNodes, migration.target, true);

            // Collecting all people IDs for each migration
            const peopleIds = migration.people.map((person) => person.Id);

            links.push({
                source: sourceId,
                target: targetId,
                value: migration.volume,
                peopleIds: peopleIds, // Attach people IDs to each link
            });
        });

        return { nodes, links };
    }

    sanitizeId(id) {
        return id.replace(/[\s,']/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    }

    drawSankey(nodes, links) {
        const $this = this;

        // Unique, light shades of colours for each country

        const countryColors = {
            "Ireland": "#a6d7a4",
            "Canada": "#9bbedc",
            "Australia": "#ffbf80",
            "United States": "#f28c8e",
            "USA": "#f28c8e",
            "U.S.A.": "#f28c8e",
            "United States of America": "#f28c8e",
            "New Zealand": "#cca6d1",
            "United Kingdom": "#d2aa94",
            "UK": "#d2aa94",
            "South Africa": "#fbc0df",
            "India": "#cccccc",
            "Philippines": "#ffff99",
            "China": "#d2e6f1",
            "Netherlands": "#ffcc99",
            "Nederland": "#ffcc99",
            "Germany": "#d8efc4",
            "Deutschland": "#d8efc4",

            // Historical variants of Deutschland
            "German Empire": "#d8efc4",
            "Deutsches Reich": "#d8efc4",
            "Bundesrepublik Deutschland": "#d8efc4",
            "Prussia": "#d8efc4",
            "Bavaria": "#d8efc4",
            "Heiliges Römisches Reich": "#d8efc4",
            "Weimar Republic": "#d8efc4",
            "Duchy of Bavaria": "#d8efc4",
            "Deutscher Bund": "#d8efc4",
            "Rhinebund": "#d8efc4",
            "Frankreich": "#d8efc4",

            "DDR": "#d8efc4",
            "Italy": "#99d096",
            "France": "#fdcccc",
            "Spain": "#f18c8e",
            "Portugal": "#fedfb7",
            "Brazil": "#b0e0e6",
            "Argentina": "#e4d8ea",
            "Chile": "#b49ecc",
            "Mexico": "#ffffcc",
            "Russia": "#d8ac94",
            "Poland": "#fdc0b8",
            "Ukraine": "#f0e6c8",
            "Sweden": "#c0d8e9",
            "Norway": "#fedab0",
            "Finland": "#d9eeb4",
            "Denmark": "#fee6f2",
            "Belgium": "#ececec",
            "Switzerland": "#dec0de",
            "Austria": "#e6f5e2",
            "Czech Republic": "#fff6b7",
            "Slovakia": "#c6e9e3",
            "Hungary": "#ffffd9",
            "Romania": "#dedcec",
            "Bulgaria": "#f0e68c",
            "Greece": "#e0ffff",
            "Turkey": "#fafad2",
            "England": "#ffffff",
            "Scotland": "#ffb6c1",
            "Wales": "#ffa07a",
            "Northern Ireland": "#20b2aa",
            "Belarus": "#778899",
            "Lithuania": "#b0c4de",
            "Latvia": "#ffffe0",
            "Estonia": "#32cd32",
            "Moldova": "#f0fff0",
            "Japan": "#f0e68c",
            "South Korea": "#e0ffff",
            "Vietnam": "#fafad2",
            "Thailand": "#d3d3d3",
            "Malaysia": "#ffb6c1",
            "Singapore": "#ffa07a",
            "Indonesia": "#20b2aa",
            "Kenya": "#87cefa",
            "Nigeria": "#778899",
            "Egypt": "#b0c4de",
            "Morocco": "#ffffe0",
            "Ghana": "#32cd32",
            "Ethiopia": "#f0fff0",
            "Peru": "#ff69b4",
            "Venezuela": "#cd5c5c",
            "Colombia": "#4b0082",
            "Ecuador": "#fffff0",
            "Uruguay": "#f0e68c",
            "Saudi Arabia": "#e6e6fa",
            "Iran": "#fff0f5",
            "Iraq": "#7cfc00",
            "United Arab Emirates": "#fffacd",
            "Qatar": "#add8e6",
            "Kazakhstan": "#f08080",
            "Uzbekistan": "#e0ffff",
            "Turkmenistan": "#fafad2",
            "Kyrgyzstan": "#90ee90",
            "Tajikistan": "#d3d3d3",
            "Croatia": "#ffb6c1",
            "Slovenia": "#ffa07a",
            "Bosnia and Herzegovina": "#20b2aa",
            "Montenegro": "#87cefa",
            "Serbia": "#778899",
            "Macedonia": "#b0c4de",
            "Albania": "#ffffe0",
            "Israel": "#32cd32",
            "Jordan": "#f0fff0",
            "Lebanon": "#ff69b4",
            "Syria": "#cd5c5c",
            "Palestine": "#4b0082",
            "Ottoman Empire": "#fffff0",
            "Persian Empire": "#f0e68c",
            "Roman Empire": "#e6e6fa",
            "Byzantine Empire": "#fff0f5",
            "Austro-Hungarian Empire": "#b0e0e6",
            "Prussian Kingdom": "#f0e68c",
            "Soviet Union": "#e0ffff",
            "Yugoslavia": "#fafad2",
            "Czechoslovakia": "#d3d3d3",
            "East Germany": "#ffb6c1",
            "West Germany": "#ffa07a",
            "British Raj": "#20b2aa",
            "Zaire": "#87cefa",
            "Siam": "#778899",
            "Babylon": "#b0c4de",
            "Macedonian Empire": "#ffffe0",
            "Aztec Empire": "#32cd32",
            "Inca Empire": "#f0fff0",
            "Holy Roman Empire": "#ff69b4",
            "Ming Dynasty": "#cd5c5c",
        };

        // Calculate dynamic height
        const nodePadding = 40; // Adjust based on your styling
        const margin = { top: 10, right: 10, bottom: 10, left: 10 };
        let dynamicHeight = nodes.length * nodePadding + margin.top + margin.bottom;

        // Ensure there's a minimum height for smaller datasets
        const minHeight = 500; // Adjust as needed
        const height = Math.max(dynamicHeight, minHeight);

        //const width = 960 - margin.left - margin.right;
        const width = $("#migrationSankey").width() - margin.left - margin.right;

        // Select or append SVG container
        let svg = d3.select("#migrationSankey svg");
        if (svg.empty()) {
            svg = d3
                .select("#migrationSankey")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
        } else {
            // If SVG exists, clear its contents (optional)
            svg.selectAll("*").remove();
            // Adjust size if necessary
            svg.attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom);
            // Re-append the g element
            svg = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        }

        // Set the sankey diagram properties
        const sankey = d3
            .sankey()
            .nodeWidth(36)
            .nodePadding(nodePadding)
            .size([width, height - margin.top - margin.bottom]);

        const { nodes: graphNodes, links: graphLinks } = sankey({
            nodes: nodes.map((d) => ({ ...d })),
            links: links.map((d) => ({ ...d })),
        });

        function sortNodesByCountry(nodes) {
            // Example sorting function: split by comma, take the first part, and trim
            return nodes.sort((a, b) => {
                let aCountry = a.name.split(",")[0].trim();
                let bCountry = b.name.split(",")[0].trim();
                return aCountry.localeCompare(bCountry);
            });
        }

        // Usage
        sortNodesByCountry(nodes);

        // Step 1: Ensure a single <defs> section
        let defs = svg.select("defs");
        if (defs.empty()) {
            defs = svg.append("defs");
        }

        // Step 2: Bind data to existing gradient definitions
        let gradients = defs
            .selectAll("linearGradient")
            .data(graphLinks, (d) => `gradient-${this.sanitizeId(d.source.name)}-${this.sanitizeId(d.target.name)}`);

        // Step 3: Enter selection - Append new gradients
        let enterGradients = gradients
            .enter()
            .append("linearGradient")
            .attr("id", (d) => `gradient-${this.sanitizeId(d.source.name)}-${this.sanitizeId(d.target.name)}`)
            .attr("gradientUnits", "userSpaceOnUse")
            .attr("x1", (d) => d.source.x1)
            .attr("y1", (d) => (d.source.y1 + d.source.y0) / 2)
            .attr("x2", (d) => d.target.x0)
            .attr("y2", (d) => (d.target.y1 + d.target.y0) / 2);

        // Append stops to new gradients
        enterGradients
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", (d) => countryColors[d.source.name.split(/,\s?/).shift()] || "#cccccc");

        enterGradients
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", (d) => countryColors[d.target.name.split(/,\s?/).shift()] || "#cccccc");
        gradients.exit().remove();

        // First, select the links layer or create it if it doesn't exist
        let linksLayer = svg.select("g.linksLayer");
        if (linksLayer.empty()) {
            linksLayer = svg.append("g").classed("linksLayer", true);
        }

        // Bind the data to existing elements, creating a update selection
        const linkUpdate = linksLayer.selectAll(".link").data(graphLinks, (d) => d.source.name + "-" + d.target.name);

        // Remove any links that are no longer needed
        linkUpdate.exit().remove();

        // Enter any new links
        const linkEnter = linkUpdate.enter().append("path").attr("class", "link");

        // Merge the enter and update selections, then apply attributes to both
        linkEnter
            .merge(linkUpdate)
            .attr("d", d3.sankeyLinkHorizontal())
            .style(
                "stroke",
                (d) => `url(#gradient-${this.sanitizeId(d.source.name)}-${this.sanitizeId(d.target.name)})`
            )
            .style("stroke-width", (d) => Math.max(1, d.width));

        let nodesLayer = svg.select("g.nodesLayer");
        if (nodesLayer.empty()) {
            nodesLayer = svg.append("g").classed("nodesLayer", true);
        }
        // Bind the data to existing node groups, creating an update selection
        const nodeUpdate = nodesLayer.selectAll(".node").data(graphNodes, (d) => d.name);

        // Remove nodes that are no longer needed
        nodeUpdate.exit().remove();

        // Enter any new nodes
        const nodeEnter = nodeUpdate.enter().append("g").attr("class", "node");

        // Merge the enter and update selections, then apply shared attributes
        nodeEnter.merge(nodeUpdate).attr("transform", (d) => `translate(${d.x0},${d.y0})`);

        // Handling rectangles for both new and updated nodes
        nodeEnter
            .append("rect")
            .merge(nodeUpdate.select("rect")) // Select and merge existing rects to update them
            .attr("height", (d) => d.y1 - d.y0)
            .attr("width", sankey.nodeWidth())
            .style("fill", "#b3cde3")
            .style("stroke", (d) => d3.rgb(d.color).darker(2));

        // Handling text for both new and updated nodes
        nodeEnter
            .append("text")
            .merge(nodeUpdate.select("text")) // Select and merge existing texts to update them
            .attr("x", -6)
            .attr("y", (d) => (d.y1 - d.y0) / 2)
            .style("font-weight", "bold")
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text((d) => d.name)
            .filter((d) => d.x0 < width / 2)
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");

        let iconsLayer = svg.select("g.iconsLayer");
        if (iconsLayer.empty()) {
            iconsLayer = svg.append("g").classed("iconsLayer", true);
        }

        appendPersonIcons(iconsLayer, graphLinks, this.peopleArray);
        separateOverlappingCircles(iconsLayer);

        // Assume showTooltip and tooltipHTML are implemented elsewhere

        function appendPersonIcons(iconsLayer, graphLinks, peopleArray) {
            // Move the tooltip container inside the migrationSankey div for better control
            if ($("#migrationSankey #personTooltip").length === 0) {
                $("#migrationSankey").append(
                    "<div id='personTooltip' class='tooltip' style='position: absolute; display: none; z-index: 100000000'></div>"
                );
            }

            console.log("People array:", peopleArray);
            const tooltip = $("#migrationSankey #personTooltip");

            graphLinks.forEach((link) => {
                console.log("Link:", link);
                link.peopleIds.forEach((id, index) => {
                    const person = peopleArray.find((p) => p.Id === id);
                    console.log("Person:", person);
                    if (!person) return;

                    let personHTML = tooltipHTML(person);

                    // Calculating Y position based on the link's y0 and y1 positions
                    let birthCircleY = link.y0;
                    let deathCircleY = link.y1;

                    // Birth circle positioned +20 from the source x0
                    iconsLayer
                        .append("circle")
                        .attr("cx", link.source.x0 + 20)
                        .attr("cy", birthCircleY)
                        .attr("r", 5)
                        .attr("fill", "green")
                        .on("click", function () {
                            // Adjust the tooltip's position
                            showTooltip(tooltip, personHTML, $(this), "birth", person);
                        });

                    // Death circle positioned -20 from the target x1
                    iconsLayer
                        .append("circle")
                        .attr("cx", link.target.x1 - 20)
                        .attr("cy", deathCircleY)
                        .attr("r", 5)
                        .attr("fill", "red")
                        .on("click", function () {
                            // Adjust the tooltip's position
                            showTooltip(tooltip, personHTML, $(this), "death", person);
                        });
                });
            });

            // Optional: Hide the tooltip when clicking outside the circles
            $(document).on("click", function (e) {
                if (!$(e.target).closest("circle, #personTooltip").length) {
                    tooltip.hide();
                }
            });
        }

        function separateOverlappingCircles(iconsLayer) {
            const circleData = [];

            // Gather circle positions and data
            iconsLayer.selectAll("circle").each(function () {
                const circle = d3.select(this);
                const cx = parseFloat(circle.attr("cx"));
                const cy = parseFloat(circle.attr("cy"));
                circleData.push({ circle, cx, cy });
            });

            // Group by position
            const groupedByPosition = {};
            circleData.forEach((data) => {
                const positionKey = `${data.cx},${data.cy}`;
                if (!groupedByPosition[positionKey]) {
                    groupedByPosition[positionKey] = [];
                }
                groupedByPosition[positionKey].push(data);
            });

            // Adjust positions within each group
            Object.values(groupedByPosition).forEach((group) => {
                if (group.length > 1) {
                    // Only adjust if there are overlaps
                    const spacing = 25; // Vertical spacing between circles
                    const totalHeight = (group.length - 1) * spacing;
                    let startY = group[0].cy - totalHeight / 2;

                    group.forEach((data, index) => {
                        data.circle.attr("cy", startY + index * spacing);
                    });
                }
            });
        }

        /*
        function showTooltip(tooltip, personHTML, circle, type, person) {
            const circlePos = circle.position(); // Using position relative to the parent div
            const migrationSankey = $("#migrationSankey");

            // Adjusted offset values based on feedback
            const offsetX = type === "death" ? -430 : 0; // Increase for birth, decrease for death
            const offsetY = -30; // Increase upward shift
            const scrollY = migrationSankey.scrollTop(); // Vertical scroll position of the migrationSankey div

            tooltip
                .html(personHTML)
                .attr("class", `tooltip ${person.Gender}`)
                .css({
                    top: circlePos.top + offsetY + scrollY + "px", // Adjust for the scroll
                    left: circlePos.left + offsetX + "px",
                })
                .show();

            // Additional check and adjustment if needed
            adjustTooltipPosition(tooltip, migrationSankey, type);
        }
        */

        function showTooltip(tooltip, personHTML, circle, type, person) {
            const circleOffset = circle.offset();
            const migrationSankeyOffset = $("#migrationSankey").offset();
            const migrationSankeyHeight = $("#migrationSankey").height();

            // Adjust offsetX based on the type. For "death", set it to about 430px to the left.
            let offsetX = type === "death" ? -430 : 20; // Shift left for "death", right otherwise.
            let offsetY = 10; // Default offset to position tooltip below the circle, adjust as needed.

            // Calculate the proposed top and left positions for the tooltip.
            let proposedTop =
                circleOffset.top - migrationSankeyOffset.top + offsetY + $("#migrationSankey").scrollTop();
            let proposedLeft = circleOffset.left - migrationSankeyOffset.left + offsetX;

            tooltip
                .html(personHTML)
                .attr("class", `tooltip ${person.Gender}`)
                .css({
                    top: proposedTop + "px",
                    left: proposedLeft + "px",
                })
                .show();

            // After showing the tooltip, we can get its actual height and width to check for overflows.
            const tooltipHeight = tooltip.outerHeight(true);
            const tooltipWidth = tooltip.outerWidth(true);

            // Adjust if the tooltip goes beyond the bottom of the migrationSankey div.
            if (proposedTop + tooltipHeight > migrationSankeyHeight) {
                // Position it above the circle instead.
                proposedTop -= tooltipHeight + offsetY + 2 * circle.outerHeight(true); // Adjusted for the circle's height.
                tooltip.css("top", proposedTop + "px");
            }

            // Check for left side overflow for "death" tooltips.
            if (type === "death" && proposedLeft < 0) {
                // Adjust so it doesn't go outside the left boundary of the container.
                proposedLeft = 10; // Slight padding from the left edge of the container.
                tooltip.css("left", proposedLeft + "px");
            }

            // Check for right side overflow for non-"death" tooltips if needed.
            if (type !== "death" && proposedLeft + tooltipWidth > $("#migrationSankey").width()) {
                // Adjust so it doesn't go outside the right boundary of the container.
                proposedLeft -= tooltipWidth + offsetX - 20; // Adjust back by its width and offset.
                tooltip.css("left", proposedLeft + "px");
            }
        }
        /*
        function adjustTooltipPosition(tooltip, container, type) {
            // Get the bounding rectangle of the container
            const containerRect = container[0].getBoundingClientRect();
            const tooltipRect = tooltip[0].getBoundingClientRect();

            // Adjust so it's inside the container bounds
            if (type === "death" && tooltipRect.left < containerRect.left) {
                tooltip.css("left", containerRect.left + 10 + "px"); // Slight adjustment to avoid touching the edge
            } else if (type !== "death" && tooltipRect.right > containerRect.right) {
                tooltip.css("left", containerRect.right - tooltipRect.width - 10 + "px"); // Slight adjustment
            }

            if (tooltipRect.top < containerRect.top) {
                tooltip.css("top", containerRect.top + 10 + "px"); // Slight adjustment to avoid touching the edge
            } else if (tooltipRect.bottom > containerRect.bottom) {
                tooltip.css("top", containerRect.bottom - tooltipRect.height - 10 + "px"); // Slight adjustment
            }
        }
        */

        function tooltipHTML(person) {
            const fullName = new PersonName(person).withParts(["FullName"]);

            // Safely gets the status with a default fallback
            const getStatus = (status) => status || "";

            const formatDate = (date, status) => {
                if (!date || date === "0000-00-00" || date === "Unknown") return "";
                const dateStatusMap = { guess: "abt.", before: "bef.", after: "aft." };
                const statusPrefix = dateStatusMap[getStatus(status)] || "";
                return `${statusPrefix} ${date.replace(/\-00/g, "")}`;
            };

            const birthDateText = formatDate(
                person.BirthDate || person.BirthDateDecade,
                person.DataStatus ? person.DataStatus.BirthDate : ""
            );
            const deathDateText = formatDate(
                person.DeathDate || person.DeathDateDecade,
                person.DataStatus ? person.DataStatus.DeathDate : ""
            );

            const locationText = (location) => (location ? `in ${location}` : "");

            const detailText = (label, dateText, location) =>
                dateText ? `<p>${label}: <span class="date">${dateText}</span> ${locationText(location)}</p>` : "";

            return `
        <a href="https://www.wikitree.com/wiki/${person.Name}" target='_blank'>${fullName}</a>
        ${detailText("Born", birthDateText, person.BirthLocation)}
        ${detailText("Died", deathDateText, person.DeathLocation)}
    `;
        }
    }

    initMigration() {
        // Sort period keys once and store them for consistent ordered access
        this.sortedPeriodKeys = Object.keys(this.statsByPeriod).sort();

        // Set the initial current period index
        this.currentMigrationPeriodIndex = 0;

        // Prepare the initial UI and bind event listeners
        this.setupUI();

        // Draw the Sankey diagram for the first period immediately
        const firstPeriodKey = this.sortedPeriodKeys[this.currentMigrationPeriodIndex];
        this.drawMigrationSankeyForPeriod(firstPeriodKey);
        // this.startMigrationEvolution(10000, true);
    }

    setupUI() {
        // Check if the migrationSankey div exists, if not, create it
        if ($("#migrationSankey").length === 0) {
            $("body").append(`
                <div id='migrationSankey' class='popup graph'>
                    <h2>Migrants born <span id="h2MigrantPeriod"></span></h2>
                    <x>x</x>
                    <div id="migrationControls">
                        <button id="prevMigrationPeriod">⏪</button>
                        <button id="nextMigrationPeriod">⏩</button>
                        <button id="startMigrationEvolution" class="active">▶️</button>
                        <button id="stopMigrationEvolution">⏹️</button>
                    </div>
                </div>`);

            // Adjust the initial h2MigrantPeriod text
            $("#h2MigrantPeriod").text(this.sortedPeriodKeys[this.currentMigrationPeriodIndex]);
        }

        // Bind event listeners
        const $this = this;
        $("#prevMigrationPeriod").on("click", function () {
            $this.showPreviousMigrationPeriod();
        });

        $("#nextMigrationPeriod").on("click", function () {
            $this.showNextMigrationPeriod();
        });

        $("#startMigrationEvolution").on("click", function () {
            // Only start the evolution if it's not already running
            if (!$this.migrationEvolutionInterval) {
                $this.startMigrationEvolution(7000, true);
                $(this).addClass("active");
            }
        });

        $("#stopMigrationEvolution").on("click", function () {
            $this.stopMigrationEvolution();
            $("#startMigrationEvolution").removeClass("active");
        });

        // Ensure the stop button is initially disabled
        $("#stopMigrationEvolution").prop("disabled", true);

        // Make the migrationSankey div draggable if needed
        // $("#migrationSankey").draggable();
    }

    /*
    startMigrationEvolution(intervalMs, immediateStart = false) {
        if (this.migrationEvolutionInterval) {
            clearInterval(this.migrationEvolutionInterval);
        }

        const moveToNextPeriod = () => {
            // Increment and wrap the currentPeriodIndex
            this.currentMigrationPeriodIndex = (this.currentMigrationPeriodIndex + 1) % this.sortedPeriodKeys.length;

            const periodKey = this.sortedPeriodKeys[this.currentMigrationPeriodIndex];
            const migrationData = this.extractMigrationFlows()[periodKey];

            // Check if the current period has data; if not, move to the next one
            if (!migrationData || migrationData.length === 0) {
                moveToNextPeriod();
            } else {
                this.drawMigrationSankeyForPeriod(periodKey);
            }
        };

        // Immediately trigger the next migration period if requested
        if (immediateStart) {
            moveToNextPeriod();
        }

        // Set the interval
        this.migrationEvolutionInterval = setInterval(moveToNextPeriod, intervalMs);
        $("#startMigrationEvolution").prop("disabled", true);
        $("#stopMigrationEvolution").prop("disabled", false);
    }
*/

    startMigrationEvolution(intervalMs, immediateStart = false) {
        console.log("Starting migration evolution...");
        this.stopMigrationEvolution();
        if (this.migrationEvolutionInterval) {
            clearInterval(this.migrationEvolutionInterval);
        }

        // New parameter to track recursion depth, initialized here
        const attemptToMoveToNextPeriod = (attempts = 0) => {
            // Increment and wrap the currentPeriodIndex
            this.currentMigrationPeriodIndex = (this.currentMigrationPeriodIndex + 1) % this.sortedPeriodKeys.length;

            const periodKey = this.sortedPeriodKeys[this.currentMigrationPeriodIndex];
            const migrationData = this.extractMigrationFlows()[periodKey];

            // Check if the current period has data; if not, move to the next one
            // Also, ensure we don't loop infinitely by limiting attempts to the number of periods
            if ((!migrationData || migrationData.length === 0) && attempts < this.sortedPeriodKeys.length) {
                attemptToMoveToNextPeriod(attempts + 1); // Pass the incremented attempts
            } else if (attempts >= this.sortedPeriodKeys.length) {
                console.log("All periods are empty or attempted to check all periods."); // Optionally handle this case
                clearInterval(this.migrationEvolutionInterval); // Stop the interval as there's no valid data to display
                return; // Exit the function to prevent further execution
            } else {
                this.drawMigrationSankeyForPeriod(periodKey);
            }
        };

        // Immediately trigger the next migration period if requested
        if (immediateStart) {
            attemptToMoveToNextPeriod();
        }

        // Set the interval
        this.migrationEvolutionInterval = setInterval(() => {
            attemptToMoveToNextPeriod();
        }, intervalMs);
        $("#startMigrationEvolution").prop("disabled", true);
        $("#stopMigrationEvolution").prop("disabled", false);
    }

    stopMigrationEvolution() {
        // Clear the interval when stopping the evolution.
        console.log("Stopping migration evolution...");
        if (this.migrationEvolutionInterval) {
            clearInterval(this.migrationEvolutionInterval);
            this.migrationEvolutionInterval = null; // Clear the interval ID
        }
        console.log("Migration evolution stopped.");
        console.log("Migration evolution interval ID:", this.migrationEvolutionInterval);
        // Optionally, update the UI to reflect that the evolution has stopped.
        // For example, enable the start button and disable the stop button.
        $("#startMigrationEvolution").prop("disabled", false);
        $("#stopMigrationEvolution").prop("disabled", true);
    }

    showNextMigrationPeriod() {
        const periodKeys = this.sortedPeriodKeys; // Assuming this is already sorted
        let attempts = 0;

        const moveToNextPeriodWithData = () => {
            if (attempts >= periodKeys.length) {
                console.log("All periods are empty or checked.");
                return; // Avoid infinite loop
            }

            this.currentMigrationPeriodIndex = (this.currentMigrationPeriodIndex + 1) % periodKeys.length;
            const periodKey = periodKeys[this.currentMigrationPeriodIndex];
            const migrationData = this.extractMigrationFlows()[periodKey];

            // If there's no data, move to the next period
            if (!migrationData || migrationData.length === 0) {
                attempts++;
                moveToNextPeriodWithData();
            } else {
                this.drawMigrationSankeyForPeriod(periodKey);
            }
        };

        moveToNextPeriodWithData();
    }

    showPreviousMigrationPeriod() {
        const periodKeys = this.sortedPeriodKeys; // Assuming this is already sorted
        let attempts = 0;

        const moveToPreviousPeriodWithData = () => {
            if (attempts >= periodKeys.length) {
                console.log("All periods are empty or checked.");
                return; // Avoid infinite loop
            }

            this.currentMigrationPeriodIndex =
                (this.currentMigrationPeriodIndex - 1 + periodKeys.length) % periodKeys.length;
            const periodKey = periodKeys[this.currentMigrationPeriodIndex];
            const migrationData = this.extractMigrationFlows()[periodKey];

            // If there's no data, move to the previous period
            if (!migrationData || migrationData.length === 0) {
                attempts++;
                moveToPreviousPeriodWithData();
            } else {
                this.drawMigrationSankeyForPeriod(periodKey);
            }
        };

        moveToPreviousPeriodWithData();
    }

    drawMigrationSankeyForPeriod(periodKey, attemptedPeriods = []) {
        $("#migrationSankey #personTooltip").hide();
        this.peopleArray = this.statsByPeriod[periodKey]?.locationStatistics?.peopleArray;

        const migrationData = this.extractMigrationFlows()[periodKey];
        if (!migrationData) {
            console.log("No migration data for period:", periodKey);
            return this.attemptNextPeriod(periodKey, attemptedPeriods);
        }

        // Prepare data for Sankey diagram
        const { nodes, links } = this.prepareSankeyData(migrationData);

        if (nodes.length === 0 || links.length === 0) {
            console.log("No data available to draw the Sankey diagram for period:", periodKey);
            return this.attemptNextPeriod(periodKey, attemptedPeriods);
        }

        // Proceed with drawing the Sankey diagram for the period with data
        $("#h2MigrantPeriod").text(periodKey);
        this.drawSankey(nodes, links);
    }

    attemptNextPeriod(currentPeriodKey, attemptedPeriods) {
        attemptedPeriods.push(currentPeriodKey);

        // Stop if all periods have been attempted
        if (attemptedPeriods.length >= Object.keys(this.statsByPeriod).length) {
            console.log("All periods attempted, no data available for any period.");
            return;
        }

        // Find the next period that hasn't been attempted yet
        let nextPeriodKey = Object.keys(this.statsByPeriod).find((pk) => !attemptedPeriods.includes(pk));
        if (nextPeriodKey) {
            this.drawMigrationSankeyForPeriod(nextPeriodKey, attemptedPeriods);
        }
    }
}
