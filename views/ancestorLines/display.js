// Thank you to to Malcolm Maclean for the tree drawing code:
//       https://gist.github.com/d3noob/1a96af738c89b88723eb63456beb6510
// Also thank you Ian Beacall (https://www.wikitree.com/wiki/Beacall-641, https://github.com/shogenapps) for all
// the code I "stole" from you to make this app better.
//
import { AncestorTree } from "./ancestor_tree.js";
import { AncestorLinesExplorer } from "./ancestor_lines_explorer.js";
import { D3Node } from "./D3Node.js";

export function showTree(
    theTree,
    loiNodes, // lines of interest nodes
    loiLinks, // lines of interest links
    loiEndpoints, // lines of inbterest endpoiints
    genCountsInLOI, // heneration counts in lines of interest
    maxGenToShow,
    expandLOIs,
    showOnlyLOIs,
    connectors,
    hideTreeHeader,
    labelsLeftOnly
) {
    const NODE_RADIUS = 5;
    const PARENT_ICON = {
        width: 20,
        height: 10,
        stackedHeight: 16,
    };
    const DUP_MARK_HEIGHT = NODE_RADIUS * 2;
    const LABEL_OFFSET = 13; // distance from node to label

    const theRoot = theTree.root;
    const duplicates = theTree.duplicates;
    const markedNodes = new Set(); // All the marked (highlighted duplicate) nodes in the tree, represented by their ids
    // All the highlighted paths with key=node id of destination node and value = the set of paths to the node
    const markedPaths = new Map();

    // Set the dimensions and margins of the diagram
    const margin = { top: 10, right: 10, bottom: 10, left: theRoot.getDisplayName().length * 8 };
    const edgeFactor = +$("#edgeFactor").val() || 180;
    const heightFactor = +$("#tHFactor").val() || 34;
    const brickWallColour = $("#aleBrickWallColour").val() || "#ff0000";
    var currentMaxShowDepth = initialMaxShowDepth();

    function initialMaxShowDepth() {
        return Math.max(Math.min(theTree.maxGeneration, maxGenToShow), expandLOIs ? genCountsInLOI.length : 0);
    }

    function calculateWidths() {
        const tWith = calculateTreeWidth();
        return [tWith, calculateSvgWidth(tWith)];
    }

    function calculateTreeWidth() {
        const result = currentMaxShowDepth * edgeFactor + (labelsLeftOnly ? 0 : 2 * edgeFactor);
        // console.log(
        //     `treeWidth: currentMaxShowDepth:${currentMaxShowDepth} * eF:${edgeFactor} + ${
        //         labelsLeftOnly ? 0 : edgeFactor * 2
        //     } = ${result}`
        // );
        return result;
    }

    function calculateSvgWidth(tWidth) {
        const w = tWidth + margin.right + margin.left;
        return w;
    }

    function calculateTreeHeight(theGenerationCounts) {
        const hf = showOnlyLOIs ? heightFactor * 1.75 : heightFactor;
        const [largestGeneration] = maxAndIndex(theGenerationCounts);
        // console.log(`theGenCounts=${theGenerationCounts}`);
        // console.log(`largestGeneration = ${largestGeneration}`);
        return largestGeneration * hf - margin.top - margin.bottom;
    }

    function maxAndIndex(arr) {
        let idx = 0;
        let maxSize = 0;
        for (let i = 1; i < arr.length; ++i) {
            if (arr[i] > maxSize) {
                idx = i;
                maxSize = arr[i];
            }
        }
        return [maxSize, idx];
    }

    const treeHeight = calculateTreeHeight(showOnlyLOIs ? genCountsInLOI : theTree.genCounts);
    const [treeWidth, svgWidth] = calculateWidths();

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3
        .select("#theSvg")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", treeHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    if (!hideTreeHeader) {
        const tbl = d3
            .select("#theSvg")
            .insert("table", ":first-child")
            .attr("class", "treeHeader table-borderless")
            .attr("width", edgeFactor * (currentMaxShowDepth - 1))
            .style("margin-left", `${margin.left}px`);
        const tr = tbl.append("tr");
        for (let lvl = 2; lvl <= currentMaxShowDepth; ++lvl) {
            tr.append("td").style("width", `${edgeFactor}px`).attr("align", "right").text(genHeader(lvl));
        }
        // console.log(
        //     `tbl width = edgeFactor:${edgeFactor} * (currentMaxShowDepth:${currentMaxShowDepth}-1) = ${
        //         edgeFactor * (currentMaxShowDepth - 1)
        //     }`
        // );
    }

    const duration = 750;

    // declares a tree layout and assigns the size
    var treemap = d3.tree().size([treeHeight, treeWidth]);

    const inTree = connectors ? new Set() : undefined;
    // Assigns parent, children, height, depth
    let d3Root = d3.hierarchy(theRoot, function (d3node) {
        return AncestorTree.getD3Children(d3node, inTree);
    });
    d3Root.x0 = treeHeight / 2;
    d3Root.y0 = 0;
    // console.log("d3Root", d3Root);
    // collapseAfterMaxGen();
    update(d3Root);

    function genHeader(level) {
        let relType = "";
        if (level == 1) {
            return level;
        }
        const [parents, grand, great] = edgeFactor >= 120 ? ["Parents", "Grand", "Great-"] : ["P", "G", "G-"];
        if (level > 1) {
            relType = parents;
        }
        if (level > 2) {
            relType = grand + relType.toLowerCase();
        }
        if (level > 3) {
            relType = great + relType;
        }
        if (level > 4) {
            relType = `${level - 3}x ${relType}`; // 3x Great-Grandparents
        }
        return `${relType} (${level})`;
    }

    function ordinal(n) {
        if (n >= 10 && n <= 20) {
            return `${n}th`;
        }
        const m = n % 10;
        switch (m) {
            case 1:
                return `${n}st`;
            case 2:
                return `${n}nd`;
            case 3:
                return `${n}rd`;
            default:
                return `${n}th`;
        }
    }

    // Collapse after the maxGen level
    function collapseAfterMaxGen() {
        const q = [d3Root];
        while (q.length > 0) {
            const n = q.shift();
            const wtId = n.data.getWtId();

            if (showOnlyLOIs) {
                if (loiNodes.has(wtId) && !loiEndpoints.includes(wtId) && (expandLOIs || n.depth < maxGenToShow - 1)) {
                    if (n.children) {
                        for (const c of n.children) {
                            q.push(c);
                        }
                    }
                } else {
                    collapseSubtree(n);
                }
            } else {
                if (n.depth < maxGenToShow - 1 || (expandLOIs && loiNodes.has(wtId) && !loiEndpoints.includes(wtId))) {
                    if (n.children) {
                        for (const c of n.children) {
                            q.push(c);
                        }
                    }
                } else {
                    collapseSubtree(n);
                }
            }
        }
    }

    // Collapse the node and all it's children while adding depth numbers
    function collapseSubtree(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach((c) => {
                collapseSubtree(c);
            });
            d.children = null;
        }
    }

    function expandSubtree(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach((c) => {
                expandSubtree(c);
            });
            d._children = null;
        }
    }

    function generationOf(d) {
        return d.depth + 1;
    }

    function getDisplayableGenerationCounts(d, counts) {
        const gen = generationOf(d);
        if (counts[gen]) {
            counts[gen] += 1;
        } else {
            counts[gen] = 1;
        }
        if (d.children) {
            d.children.forEach((c) => {
                getDisplayableGenerationCounts(c, counts);
            });
        }
        return counts;
    }

    function collectCollapsed(node, set = new Set()) {
        if (node._children) {
            set.add(node.data.getId());
        }
        if (node.children) node.children.forEach((c) => collectCollapsed(c, set));
        if (node._children) node._children.forEach((c) => collectCollapsed(c, set));
        return set;
    }
    function restoreCollapsed(node, collapsed) {
        if (node.children) {
            node.children.forEach((c) => restoreCollapsed(c, collapsed));
        }

        if (collapsed.has(node.data.getId()) && node.children) {
            node._children = node.children;
            node.children = null;
        }
    }
    function mapPositions(node, map = new Map()) {
        map.set(node.data.getId(), { x: node.x, y: node.y });

        if (node.children) node.children.forEach((c) => mapPositions(c, map));
        if (node._children) node._children.forEach((c) => mapPositions(c, map));

        return map;
    }
    function restorePositions(node, posMap) {
        const pos = posMap.get(node.data.getId());
        if (pos) {
            node.x0 = pos.x;
            node.y0 = pos.y;
        }

        if (node.children) node.children.forEach((c) => restorePositions(c, posMap));
    }
    function seedNewPositions(node) {
        if (node.parent) {
            if (node.x0 === undefined) node.x0 = node.parent.x0;
            if (node.y0 === undefined) node.y0 = node.parent.y0;
        }

        if (node.children) node.children.forEach(seedNewPositions);
        if (node._children) node._children.forEach(seedNewPositions);
    }
    function capturePositions(node) {
        node.x0 = node.x;
        node.y0 = node.y;

        if (node.children) node.children.forEach(capturePositions);
        if (node._children) node._children.forEach(capturePositions);
    }

    function update(srcNode) {
        if (d3Root) {
            capturePositions(d3Root);
        }
        const collapsed = d3Root ? collectCollapsed(d3Root) : new Set();
        const positions = d3Root ? mapPositions(d3Root) : new Map();

        // Rebuild hierarchy so getD3Children() runs again
        const inTree = connectors ? new Set() : undefined;
        d3Root = d3.hierarchy(theRoot, (d3node) => AncestorTree.getD3Children(d3node, inTree));
        collapseAfterMaxGen();

        const nodeIndex = new Map();
        d3Root.descendants().forEach((n) => nodeIndex.set(n.data.getId(), n));
        srcNode = nodeIndex.get(srcNode.data.getId()) || d3Root;

        restoreCollapsed(d3Root, collapsed);
        restorePositions(d3Root, positions);

        // ensure newly created nodes start at their parent position
        seedNewPositions(d3Root);

        // console.log("update: markedNodes", markedNodes);
        // console.log("update: markedLinks", markedPaths);

        //TODO: we can opimise this by only recalculating it when required, but for now we're lazy
        // and calculate it every time - seems to be fast enough and less error-prone
        const displayGenCounts = getDisplayableGenerationCounts(d3Root, []);
        const treeHeight = calculateTreeHeight(displayGenCounts);
        const [treeWidth, svgWidth] = calculateWidths();
        // console.log(`Update: treeHeight=${treeHeight}, treeWidth = ${treeWidth}, svgWidth = ${svgWidth}`);
        d3.select("#theSvg svg")
            .attr("width", svgWidth)
            .attr("height", treeHeight + margin.top + margin.bottom);

        // Assigns the x and y position for the nodes
        treemap = treemap.size([treeHeight, treeWidth]);
        const treeData = treemap(d3Root);
        //console.log("treeData", treeData);

        // Compute the new tree layout.
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Calculate y position of each node.
        const tWidth = edgeFactor * (currentMaxShowDepth - 1);
        const maxYear = +AncestorTree.root.getBirthYear() || +new Date().getFullYear();
        const ageSpan = maxYear - AncestorTree.minBirthYear;
        const birthScale = document.getElementById("birthScale").checked;
        const privatise = document.getElementById("privatise").checked;
        const anonLiving = document.getElementById("anonLiving").checked;
        nodes.forEach(function (d) {
            if (birthScale) {
                const bYear = +d.data.getBirthYear();
                if (bYear == 0) {
                    d.y = d.depth * edgeFactor;
                } else {
                    d.y = (tWidth * (maxYear - d.data.getBirthYear())) / ageSpan;
                }
            } else {
                d.y = d.depth * edgeFactor;
            }
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        const gnodes = svg.selectAll("g.node").data(nodes, (d) => d.data.getId());

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = gnodes
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", (d) => {
                // If srcNode exists, expand from it; otherwise, use the node's own previous position
                const origin = srcNode || d.parent || d;
                return `translate(${origin.y0 || 0},${origin.x0 || 0})`;
            });
        // .attr("transform", (d) => `translate(${srcNode.y0},${srcNode.x0})`);
        // .attr("transform", (d) => `translate(${d.y0 || d3Root.x0 || d3Root.x},${d.x0 || d3Root.y0 || d3Root.y})`);

        // Add Circle for the nodes
        nodeEnter
            .append("circle")
            .attr("class", function (d) {
                const wtId = d.data.getWtId();
                return loiNodes.has(wtId) ? (loiEndpoints.includes(wtId) ? "node end" : "node ofinterest") : "node";
            })
            .attr("r", 1e-6)
            .style("fill", (d) => (d._children ? "lightsteelblue" : "#fff"))
            .on("click", toggleAncestors)
            .append("title")
            .text((d) => birthAndDeathData(d.data));

        // Flag duplicate nodes with coloured square
        nodeEnter
            .filter((d) => d.data.isDuplicate())
            .append("rect")
            .attr("class", function (d) {
                return markedNodes.has(d.data.getNumId()) ? "dup marked" : "dup";
            })
            .attr("width", 0)
            .attr("height", 0)
            .attr("wtId", (d) => d.data.getNumId())
            .on("click", toggleDuplicate)
            .append("title")
            .text(function (d) {
                return birthAndDeathData(d.data);
            });

        // Add labels for the nodes
        const hrefs = nodeEnter
            .append("a")
            .attr("xlink:href", function (d) {
                const wtId = d.data.getWtId();
                return typeof wtId == "undefined"
                    ? "https://www.wikitree.com/wiki/Help:Privacy"
                    : `https://www.wikitree.com/wiki/${wtId}`;
            })
            .attr("target", "_blank");

        // Create a group for the label
        const labelGroup = hrefs.append("g").attr("class", "label");
        labelGroup
            .append("text")
            .attr("wtId", (d) => d.data.getNumId())
            .style("fill", (d) => (d.data.isBrickWall() ? brickWallColour : "inherit"));
        labelGroup.append("title").text((d) => birthAndDeathData(d.data));

        function formLabel(p, name) {
            const lbl = p.isBioParent() ? "[bio] " : "";
            return lbl + name;
        }
        function getPersonName(p) {
            if (anonLiving && p.isLiving()) {
                return "Living";
            }
            if (privatise) {
                if (p.isUnlisted()) return "Private";
                if (p.isPrivate()) return p._data.BirthNamePrivate || "Private";
            }
            return p?.getDisplayName() || "Private";
        }
        function birthAndDeathData(person) {
            if ((anonLiving && person.isLiving()) || (privatise && person.isUnlisted())) {
                return "This information is private.";
            }
            if (privatise && person.isPrivate()) {
                return `${birthString(person, privatise)}\n${deathString(person, privatise)}`;
            }
            return `${birthString(person)}\n${deathString(person)}`;
        }
        function isTextOnLeft(d) {
            return labelsLeftOnly || d.children || d._children;
        }
        const nameParts = [
            ["FirstName", "MiddleInitials", "LastNameAtBirth"],
            ["FirstInitial", "MiddleInitials", "LastNameAtBirth"],
            ["FirstInitial", "LastNameAtBirth"],
        ];
        const gridDelta = 16; // tolerance for treating nodes as in the same row and/or column for labelling purposes
        function computeRightEdges(nodes) {
            const map = new Map();

            function addRightEdge(row, col, rightEdge, d, lbl = "") {
                const arr = map.get(row) || [];
                arr.push([col, rightEdge, `${d.data.getDisplayName()}${lbl} @ (${d.x}, ${d.y})`]);
                map.set(row, arr);
            }

            for (const d of nodes) {
                const row = Math.round(d.x / gridDelta);
                const col = Math.round(d.y / gridDelta);
                const rightEdge = d.y + PARENT_ICON.width;

                // the node's own row
                addRightEdge(row, col, rightEdge, d);

                // father icon rows
                if (d.data.getBioFatherId()) {
                    addRightEdge(row - 1, col, rightEdge, d, "-tl");
                    if (d.data.getParentMode(D3Node.Side.FATHER) === D3Node.ParentMode.ALL) {
                        addRightEdge(row - 2, col, rightEdge, d, "-tdl");
                    }
                }
                // mother icon rows
                if (d.data.getBioMotherId()) {
                    (addRightEdge(row + 1, col, rightEdge, d), "-tl");
                    if (d.data.getParentMode(D3Node.Side.MOTHER) === D3Node.ParentMode.ALL) {
                        addRightEdge(row + 2, col, rightEdge, d, "-bdl");
                    }
                }
            }

            return map;
        }
        function getPreviousEdge(row, col, rightEdges) {
            const edges = rightEdges.get(row);
            if (!edges) return -Infinity;

            let prevEdge = -Infinity;
            for (let i = edges.length - 1; i >= 0; --i) {
                if (edges[i][0] < col) {
                    prevEdge = edges[i][1];
                    break;
                }
            }
            return prevEdge;
        }
        function renderLabels(nodeSelection) {
            nodeSelection.select("g.label").attr("transform", (d) => {
                const dx = isTextOnLeft(d) ? -LABEL_OFFSET : LABEL_OFFSET;
                return `translate(${dx},0)`;
            });

            nodeSelection
                .select("g.label text")
                .attr("text-anchor", (d) => (isTextOnLeft(d) ? "end" : "start"))
                .attr("dominant-baseline", "middle")
                .text((d) => {
                    const p = d.data;
                    return formLabel(p, getPersonName(p));
                });
            nodeSelection.select("g.label title").text((d) => birthAndDeathData(d.data));
        }
        // Collect the widths of all labels and store it on the node for when we want to adjust he lengths
        function measureLabels(nodeSelection) {
            nodeSelection.select("g.label text").each(function (d) {
                d.labelWidth = this.getBBox().width;
            });
        }
        // Ensure labels do not overlap earlier nodes and labels
        function adjustLabels(nodeSelection, rightEdges) {
            nodeSelection.select("g.label text").each(function (d) {
                //
                const width = d.labelWidth || 0;
                const row = Math.round(d.x / gridDelta);
                const col = Math.round(d.y / gridDelta);

                const prevEdge = getPreviousEdge(row, col, rightEdges);
                let labelLeft = isTextOnLeft(d) ? d.y - LABEL_OFFSET - width : d.y + LABEL_OFFSET;
                if (labelLeft >= prevEdge) return;

                const p = d.data;
                if (!p) return;

                // shorten the label
                const isLink = p.IsLink || false;
                const display = getPersonName(p);
                if (display != "Private" && display != "Living") {
                    const pName = new window.PersonName(p._data);
                    for (const wantedParts of nameParts) {
                        const shorter = (isLink ? "See " : "") + pName.withParts(wantedParts);
                        this.textContent = formLabel(p, shorter);

                        // Check if name is now short enough
                        const width = this.getBBox().width;
                        const labelLeft = d.y - LABEL_OFFSET - width;
                        if (labelLeft >= prevEdge) return;
                    }
                }
            });
        }

        // UPDATE
        const nodeUpdate = nodeEnter.merge(gnodes);

        // Transition to the proper position for the node
        nodeUpdate
            .transition()
            .duration(duration)
            .ease(d3.easeCubicInOut)
            .attr("transform", (d) => `translate(${d.y},${d.x})`)
            .end()
            .then(() => {
                renderLabels(nodeUpdate);
                measureLabels(nodeUpdate);
                const rightEdges = computeRightEdges(nodes);
                // console.log("Before layoutLabels", rightEdges);
                adjustLabels(nodeUpdate, rightEdges);
            });

        // Update the node attributes and style
        nodeUpdate
            .select("circle.node")
            .attr("r", NODE_RADIUS)
            .style("fill", (d) => (d._children ? "lightsteelblue" : "#fff"))
            .attr("cursor", "pointer");

        nodeUpdate
            .select("rect.dup")
            .attr("width", DUP_MARK_HEIGHT)
            .attr("height", DUP_MARK_HEIGHT)
            .style("fill", function (d) {
                return aDupNodeColour(duplicates.get(d.data.getNumId()));
            })
            .attr("cursor", "pointer");

        // We want to draw alternate parents buttons for nodes with biological parents different from their main parents,
        // so first we add anchor points for the buttons as g elements (if they don't exist yet), then we update their content
        // and position based on the current parent mode of the node
        const anchors = nodeEnter.append("g").attr("class", "icon-anchors");
        anchors.append("g").attr("class", "anchor-father");
        anchors.append("g").attr("class", "anchor-mother");
        nodeUpdate.select(".anchor-father").attr("transform", (d) => {
            const iconHeight = getIconHeight(d.data.getParentMode(D3Node.Side.FATHER));
            return `translate(0, ${-NODE_RADIUS - 2 - iconHeight / 2})`;
        });
        nodeUpdate.select(".anchor-mother").attr("transform", (d) => {
            const dupClearance = d.data.isDuplicate() ? DUP_MARK_HEIGHT / 2 : 0;
            const iconHeight = getIconHeight(d.data.getParentMode(D3Node.Side.MOTHER));
            return `translate(0, ${NODE_RADIUS + 2 + iconHeight / 2 + dupClearance})`;
        });

        // Draw alternate parents buttons for nodes with biological parents different from their main parents
        const icons = nodeUpdate
            .selectAll(".icon-anchors")
            .selectAll("g.alt-parent-icon")
            .data(
                (d) => getAltParentIcons(d.data),
                (d) => d.side
            );
        function getAltParentIcons(node) {
            const result = [];
            if (node.getBioFatherId()) {
                result.push({ side: D3Node.Side.FATHER });
            }
            if (node.getBioMotherId()) {
                result.push({ side: D3Node.Side.MOTHER });
            }
            return result;
        }

        const iconsEnter = icons
            .enter()
            .append("g")
            .attr("class", "alt-parent-icon")
            .style("cursor", "pointer")
            .on("click", function (event, icon) {
                event.stopPropagation();
                const node = d3.select(this.parentNode.parentNode).datum();
                node.data.toggleParentMode(icon.side);
                [, loiNodes, loiLinks, loiEndpoints, genCountsInLOI] = AncestorTree.findPaths(
                    AncestorLinesExplorer.getIdsOfInterest()
                );
                update(node);
            });

        drawIconGraphics(iconsEnter);
        function drawIconGraphics(sel) {
            const width = PARENT_ICON.width;
            const height = PARENT_ICON.height;

            // Reference point is bottom left.
            sel.append("rect")
                .attr("x", 0)
                .attr("y", -height)
                .attr("width", width)
                .attr("height", height)
                .attr("rx", 1.2)
                .attr("fill", "none")
                .attr("stroke", "#25422D");

            sel.append("g").attr("class", "labels");

            sel.append("line")
                .attr("class", "strike")
                .attr("x1", 1)
                .attr("y1", -1)
                .attr("x2", width - 1)
                .attr("y2", -height + 1)
                .attr("stroke", "#25422D")
                .attr("stroke-width", 1)
                .style("display", "none");

            sel.append("title");
        }

        // Move the icons into the correct anchor.
        icons.merge(iconsEnter).each(function (icon) {
            const nodeGroup = d3.select(this.parentNode.parentNode);
            const anchor = nodeGroup.select(icon.side === D3Node.Side.FATHER ? ".anchor-father" : ".anchor-mother");
            anchor.node().appendChild(this);
        });

        // Render the icon layout
        icons.merge(iconsEnter).each(function (icon) {
            const g = d3.select(this);
            const nodeGroup = d3.select(this.parentNode.parentNode);
            const node = nodeGroup.datum();
            const mode = node.data.getParentMode(icon.side);
            const layout = getIconLayout(mode, icon.side);
            const height = getIconHeight(mode);

            const anchor = nodeGroup.select(icon.side === D3Node.Side.FATHER ? ".anchor-father" : ".anchor-mother");
            anchor.node().appendChild(this);

            // resize rectangle
            g.select("rect")
                .attr("y", -height / 2)
                .attr("height", height);

            // labels
            const labels = g
                .select(".labels")
                .selectAll("text")
                .data(layout, (d, i) => d.label + ":" + i);

            labels
                .enter()
                .append("text")
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("dy", "0.1em") // lower the text a bit for visual centering
                .attr("fill", "#25422D")
                .merge(labels)
                .attr("x", PARENT_ICON.width / 2)
                .attr("y", (d) => d.y)
                .text((d) => d.label);

            labels.exit().remove();

            // strike through DNA
            const strikeRow = layout.find((d) => d.strike);
            const strike = g.select(".strike");
            if (strikeRow) {
                strike
                    .attr("y1", strikeRow.y + 2)
                    .attr("y2", strikeRow.y - 2)
                    // .attr("y1", strikeRow.y)
                    // .attr("y2", strikeRow.y2)
                    .attr("stroke-linecap", "round")
                    .style("display", null);
            } else {
                strike.style("display", "none");
            }

            // Tooltip
            let nextType;
            if (mode === D3Node.ParentMode.NORMAL) nextType = "the biological";
            else if (mode === D3Node.ParentMode.BIO) nextType = "all the";
            else nextType = "the adoptive";

            g.select("title").text(`Show ${nextType} parent(s) of ${node.data.getDisplayName()}`);
        });

        icons.exit().remove();

        function getIconHeight(mode) {
            return mode === D3Node.ParentMode.ALL ? PARENT_ICON.stackedHeight : PARENT_ICON.height;
        }
        function getIconLayout(mode, side) {
            if (mode === D3Node.ParentMode.NORMAL) return [{ label: "DNA", y: 0, strike: true }];
            if (mode === D3Node.ParentMode.BIO) return [{ label: "BIO", y: 0 }];

            // ALL parents mode
            const offset = 3.5;
            if (side === D3Node.Side.FATHER) {
                return [
                    { label: "DNA", y: -offset, strike: true },
                    { label: "BIO", y: offset },
                ];
            }
            return [
                { label: "BIO", y: -offset },
                { label: "DNA", y: offset, strike: true },
            ];
        }

        // Remove any exiting nodes
        const nodeExit = gnodes
            .exit()
            .transition()
            .duration(duration)
            .ease(d3.easeCubicInOut)
            .attr("transform", function (d) {
                return "translate(" + srcNode.y + "," + srcNode.x + ")";
            })
            .remove();

        // On exit reduce the node circles size to 0
        nodeExit.select("circle").attr("r", 1e-6);

        // On exit reduce the opacity of text labels
        nodeExit.select("text").style("fill-opacity", 1e-6);

        // ****************** links section ***************************

        // Update the links...
        const link = svg.selectAll("path.link").data(links, (d) => d.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("d", function (d) {
                const o = srcNode || d.parent || d;
                return diagonal(o, o);
            })
            .attr("lnk", function (d) {
                return `${d.parent.data.getWtId()}:${d.data.getWtId()}`;
            });

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate
            .attr("class", function (d) {
                const lnkId = `${d.parent.data.getWtId()}:${d.data.getWtId()}`;
                let klass = "link";
                if (loiLinks.has(lnkId)) klass += " ofinterest";
                if (d.data.isOnAdoptiveLine()) klass += " dotted";
                for (const m of markedPaths.values()) {
                    if (m.has(lnkId)) return `${klass} marked`;
                }
                return klass;
            })
            .style("stroke", (d) => {
                const id = d.data.adoptiveSubtreeId;
                if (!id) return "#ccc";
                return subtreeColour(id);
            })
            .transition()
            .duration(duration)
            .ease(d3.easeCubicInOut)
            .attr("d", (d) => diagonal(d, d.parent));

        // Remove any exiting links
        link.exit()
            .transition()
            .duration(duration)
            .ease(d3.easeCubicInOut)
            .attr("d", function (d) {
                const o = { x: srcNode.x, y: srcNode.y };
                return diagonal(o, o);
            })
            .remove();

        // Creates a curved diagonal path from parent to the child nodes
        function diagonal(s, d) {
            return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
        }

        // Collapse/expand ancestors on click.
        function toggleAncestors(event, d) {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                console.log(d.data.toString(), d, AncestorTree.getPeople());
                return;
            }
            if (event.altKey) {
                showBioCheckReport($(this), d);
                return;
            }
            if (event.shiftKey) {
                expandSubtree(d);
                const newDepth = d.depth + d.data.getNrOlderGenerations();
                currentMaxShowDepth = Math.max(currentMaxShowDepth, newDepth);
            } else if (d.children) {
                // contract
                d._children = d.children;
                d.children = null;
            } else if (d._children) {
                // expand
                d.children = d._children;
                d._children = null;
                const newDepth = d.depth + d.data.getNrOlderGenerations();
                currentMaxShowDepth = Math.max(currentMaxShowDepth, newDepth);
            }
            update(d);
        }

        // Toggle duplicate highlight on click.
        function toggleDuplicate(event, d) {
            const id = d.data.getNumId();
            // find all the paths to this person
            const setMarked = d.data.toggleMarked();
            let linksToMark;
            let linksToUnmark;
            if (setMarked) {
                const [pathsRoot, nodes, links, wtIds] = AncestorTree.findPaths([d.data.getWtId()]);
                linksToMark = links;
                markedNodes.add(id);
                markedPaths.set(id, links);
            } else {
                linksToUnmark = markedPaths.get(id);
                markedNodes.delete(id);
                markedPaths.delete(id);
            }
            // console.log("markedNodes", markedNodes);
            // console.log("markedLinks", markedPaths);

            // toggle the 'marked' class on all rectangles for this duplicate person
            d3.selectAll(`rect.dup[wtId='${id}']`).classed("marked", setMarked);
            d3.selectAll(`text[wtId='${id}']`).classed("marked", setMarked);

            // toggle the 'marked' class on all edges leading to this duplicate person
            // unless they are part of another marked path
            if (linksToMark) {
                for (const lnk of linksToMark.keys()) {
                    d3.selectAll(`path.link[lnk='${lnk}']`).classed("marked", true);
                }
            }
            if (linksToUnmark) {
                for (const lnk of linksToUnmark.keys()) {
                    if (!stillMarked(lnk)) {
                        d3.selectAll(`path.link[lnk='${lnk}']`).classed("marked", false);
                    }
                }
            }

            function stillMarked(lnk) {
                for (const markedPath of markedPaths.values()) {
                    if (markedPath.has(lnk)) return true;
                }
                return false;
            }
        }
    }

    function showBioCheckReport(jqClicked, d) {
        let person = d.data;
        if (typeof person.bioCheckReport == "undefined" || person.bioCheckReport.length == 0) {
            return;
        }
        const theClickedName = person.getWtId();
        const familyId = theClickedName.replace(" ", "_") + "_bioCheck";
        if ($(`#${familyId}`).length) {
            $(`#${familyId}`).css("z-index", `${AncestorLinesExplorer.nextZLevel++}`).slideToggle();
            return;
        }

        const bioReportTable = getBioCheckReportTable(person);
        bioReportTable.attr("id", familyId);
        showTable(jqClicked, bioReportTable, 10, 10);
    }

    function getBioCheckReportTable(person) {
        const issueWord = person.bioCheckReport.length == 1 ? "issue" : "issues";
        const bioCheckTable = $(
            `<div class='bioReport' data-wtid='${person.getWtId()}'><w>↔</w><x>[ x ]</x><table class="bioReportTable">` +
                `<caption>Bio Check found the following ${issueWord} with the biography of ${person.getDisplayName()}</caption>` +
                "<tbody><tr><td><ol></ol></td></tr></tbody></table></div>"
        );

        const ol = bioCheckTable.find("tbody ol");
        for (const [msg, subLines] of person.bioCheckReport) {
            let msgLI = $("<li></li>").text(msg);
            if (subLines && subLines.length > 0) {
                const subList = $("<ul></ul>");
                for (const line of subLines) {
                    subList.append($("<li></li>").text(line));
                }
                msgLI = msgLI.append(subList);
            }
            ol.append(msgLI);
        }
        return bioCheckTable;
    }

    function showTable(jqClicked, theTable, lOffset, tOffset) {
        // Attach the table to the container div
        theTable.prependTo($("#aleContainer"));
        theTable.draggable();
        theTable.off("dblclick").on("dblclick", function () {
            $(this).slideUp();
        });

        setOffset(jqClicked, theTable, lOffset, tOffset);
        $(window).resize(function () {
            if (theTable.length) {
                setOffset(jqClicked, theTable, lOffset, tOffset);
            }
        });

        theTable.css("z-index", `${AncestorLinesExplorer.nextZLevel++}`);
        theTable.slideDown("slow");
        theTable
            .find("x")
            .off("click")
            .on("click", function () {
                theTable.slideUp();
            });
        theTable
            .find("w")
            .off("click")
            .on("click", function () {
                theTable.toggleClass("wrap");
            });
    }

    function getOffset(el) {
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
        };
    }

    function setOffset(theClicked, elem, lOffset, tOffset) {
        const theClickedOffset = getOffset(theClicked[0]);
        const theLeft = theClickedOffset.left + lOffset;
        elem.css({ top: theClickedOffset.top + tOffset, left: theLeft });
    }
}

const DupNodeColours = [
    "Gold",
    "HotPink",
    "LightCyan",
    "Yellow",
    "AntiqueWhite",
    "MediumSpringGreen",
    "Orange",
    "DeepSkyBlue",
    "PaleGoldenRod",
    "Lime",
    "Moccasin",
    "PowderBlue",
    "DarkGreen",
    "Maroon",
    "Navy",
    "Brown",
    "Indigo",
    "RoyalBlue",
    "FireBrick",
    "Blue",
    "SlateGrey",
    "DarkMagenta",
    "Red",
    "DarkOrange",
    "DarkGoldenRod",
    "Green",
    "MediumVioletRed",
    "SteelBlue",
    "Grey",
    "MediumPurple",
    "OliveDrab",
    "Purple",
    "DarkSlateBlue",
    "SaddleBrown",
    "Pink",
    "Khaki",
    "LemonChiffon",
    "LightCyan",
    "HotPink",
    "Gold",
    "Yellow",
    "AntiqueWhite",
    "MediumSpringGreen",
    "Orange",
];
const aDupNodeColour = d3.scaleOrdinal(DupNodeColours);

const SubtreeColours = [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf",
    "#4e79a7",
    "#f28e2b",
    "#59a14f",
    "#e15759",
    "#b07aa1",
    "#9c755f",
    "#edc948",
    "#76b7b2",
    "#a0cbe8",
    "#ff9da7",
];
const subtreeColour = d3.scaleOrdinal(SubtreeColours);

/**
 * Generate text that display when and where the person was born
 */
function birthString(person, privatise = false) {
    const bDate = person.getBirthDate();
    const date = privatise || !bDate ? person.getBirthDecade() : humanDate(bDate);
    const place = privatise ? "an undisclosed place" : person.getBirthLocation();
    return `Born: ${date ? `${datePrefix(person._data.DataStatus?.BirthDate)}${date}` : "[date unknown]"} ${
        place ? `in ${place}` : "[location not provided]"
    }.`;
}

function datePrefix(dateStatus) {
    if (dateStatus) {
        switch (dateStatus) {
            case "":
            case "blank":
            case "certain":
                return "";
            case "guess":
                return "About ";
            case "after":
                return "After ";
            case "before":
                return "Before ";
            default:
                return "";
        }
    } else {
        return "";
    }
}

/**
 * Generate text that display when and where the person died
 */
function deathString(person, privatise = false) {
    if (person.isLiving()) {
        return "Still living";
    }
    const dDate = person.getDeathDate();
    const date = privatise || !dDate ? person.getDeathDecade() : humanDate(dDate);
    const place = privatise ? "an undisclosed place" : person.getDeathLocation();
    return `Died: ${date ? `${datePrefix(person._data.DataStatus?.DeathDate)}${date}` : "[date unknown]"} ${
        place ? `in ${place}` : "[location not provided]"
    }.`;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Turn a wikitree formatted date into a humanreadable date
 */
function humanDate(dateString) {
    if (dateString && /\d{4}-\d{2}-\d{2}/.test(dateString)) {
        const parts = dateString.split("-"),
            year = parseInt(parts[0], 10),
            month = parseInt(parts[1], 10),
            day = parseInt(parts[2], 10);
        if (year) {
            if (month) {
                if (day) {
                    return `${day} ${monthNames[month - 1]} ${year}`;
                } else {
                    return `${monthNames[month - 1]} ${year}`;
                }
            } else {
                return year;
            }
        }
    } else {
        return dateString;
    }
}
