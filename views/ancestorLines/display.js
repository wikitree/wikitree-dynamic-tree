// Thank you to to Malcolm Maclean for the tree drawing code:
//       https://gist.github.com/d3noob/1a96af738c89b88723eb63456beb6510
// Also thank you Ian Beacall (https://www.wikitree.com/wiki/Beacall-641, https://github.com/shogenapps) for all
// the code I "stole" from you to make this app better.
//
import { AncestorTree } from "./ancestor_tree.js";

export function showTree(
    theTree,
    loiNodes,
    loiLinks,
    loiEndpoints,
    genCountsInLOI,
    maxGenToShow,
    expandLOIs,
    showOnlyLOIs,
    connectors,
    hideTreeHeader,
    labelsLeftOnly
) {
    const theRoot = theTree.root;
    const duplicates = theTree.duplicates;
    const markedNodes = new Set();
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
            .attr("class", "treeHeader")
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

    var idCounter = 0;
    const duration = 750;

    // declares a tree layout and assigns the size
    var treemap = d3.tree().size([treeHeight, treeWidth]);

    const inTree = connectors ? new Set() : undefined;
    // Assigns parent, children, height, depth
    const root = d3.hierarchy(theRoot, function (d) {
        return AncestorTree.getD3Children(d, inTree);
    });
    root.x0 = treeHeight / 2;
    root.y0 = 0;
    // console.log("root", root);

    // Collapse after the maxGen level
    const q = [root];
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

    update(root);

    function genHeader(level) {
        let relType = "";
        if (level == 1) {
            return level;
        }
        const [parent, grand, great] = edgeFactor >= 120 ? ["Parents", "Grand", "Great-"] : ["P", "G", "G-"];
        if (level > 1) {
            relType = parent;
        }
        if (level > 2) {
            relType = grand + relType;
        }
        if (level > 3) {
            relType = great + relType;
        }
        if (level > 4) {
            relType = ordinal(level - 3) + " " + relType;
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

    function update(srcNode) {
        // console.log("update: markedNodes", markedNodes);
        // console.log("update: markedLinks", markedPaths);

        //TODO: we can opimise this by only recalculating it when required, but for now we're lazy
        // and calculate it every time - seems to be fast enough and less error=prone
        const displayGenCounts = getDisplayableGenerationCounts(root, []);
        const treeHeight = calculateTreeHeight(displayGenCounts);
        const [treeWidth, svgWidth] = calculateWidths();
        // console.log(`Update: treeHeight=${treeHeight}, treeWidth = ${treeWidth}, svgWidth = ${svgWidth}`);
        d3.select("#theSvg svg")
            .attr("width", svgWidth)
            .attr("height", treeHeight + margin.top + margin.bottom);

        // Assigns the x and y position for the nodes
        treemap = treemap.size([treeHeight, treeWidth]);
        const treeData = treemap(root);
        //console.log("treeData", treeData);

        // Compute the new tree layout.
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            d.y = d.depth * edgeFactor;
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        const node = svg.selectAll("g.node").data(nodes, function (d) {
            return d.id || (d.id = ++idCounter);
        });

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", function (d) {
                return "translate(" + srcNode.y0 + "," + srcNode.x0 + ")";
            });

        // Add Circle for the nodes
        nodeEnter
            .append("circle")
            .attr("class", function (d) {
                const wtId = d.data.getWtId();
                return loiNodes.has(wtId) ? (loiEndpoints.includes(wtId) ? "node end" : "node ofinterest") : "node";
            })
            .attr("r", 1e-6)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .on("click", toggleChildren)
            .append("title")
            .text(function (d) {
                return `${birthString(d.data)}\n${deathString(d.data)}`;
            });

        // Flag duplicate nodes with coloured square
        nodeEnter
            .filter((d) => d.data.isDuplicate())
            .append("rect")
            .attr("class", function (d) {
                return markedNodes.has(d.data.getId()) ? "dup marked" : "dup";
            })
            .attr("width", 0)
            .attr("height", 0)
            .attr("wtId", (d) => d.data.getId())
            .on("click", toggleDuplicate)
            .append("title")
            .text(function (d) {
                return `${birthString(d.data)}\n${deathString(d.data)}`;
            });

        // Add labels for the nodes
        nodeEnter
            .append("a")
            .attr("xlink:href", function (d) {
                return "https://www.wikitree.com/wiki/" + d.data.getWtId();
            })
            .attr("target", "_blank")
            .append("text")
            .attr("dy", ".35em")
            .attr("x", function (d) {
                return labelsLeftOnly || d.children || d._children ? -13 : 13;
            })
            .attr("text-anchor", function (d) {
                return labelsLeftOnly || d.children || d._children ? "end" : "start";
            })
            .attr("wtId", (d) => d.data.getId())
            .text(function (d) {
                return d.data.getDisplayName();
            })
            .style("fill", (d) => {
                return d.data.hasAParent() ? "inherit" : brickWallColour;
            })
            .append("title")
            .text(function (d) {
                return `${birthString(d.data)}\n${deathString(d.data)}`;
            });

        // UPDATE
        const nodeUpdate = nodeEnter.merge(node);

        // Transition to the proper position for the node
        nodeUpdate
            .transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Update the node attributes and style
        nodeUpdate
            .select("circle.node")
            .attr("r", 5)
            .style("fill", function (d) {
                return d._children ? "lightsteelblue" : "#fff";
            })
            .attr("cursor", "pointer");

        nodeUpdate
            .select("rect.dup")
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", function (d) {
                return aColour(duplicates.get(d.data.getId()));
            })
            .attr("cursor", "pointer");

        // Remove any exiting nodes
        const nodeExit = node
            .exit()
            .transition()
            .duration(duration)
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
        const link = svg.selectAll("path.link").data(links, function (d) {
            return d.id;
        });

        // Enter any new links at the parent's previous position.
        const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", function (d) {
                const lnkId = `${d.parent.data.getWtId()}:${d.data.getWtId()}`;
                let klass = loiLinks.has(lnkId) ? "link ofinterest" : "link";
                for (const m of markedPaths.values()) {
                    if (m.has(lnkId)) return `${klass} marked`;
                }
                return klass;
            })
            .attr("d", function (d) {
                const o = { x: srcNode.x0, y: srcNode.y0 };
                return diagonal(o, o);
            })
            .attr("lnk", function (d) {
                return `${d.parent.data.getWtId()}:${d.data.getWtId()}`;
            });

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate
            .transition()
            .duration(duration)
            .attr("d", function (d) {
                return diagonal(d, d.parent);
            });

        // Remove any exiting links
        link.exit()
            .transition()
            .duration(duration)
            .attr("d", function (d) {
                const o = { x: srcNode.x, y: srcNode.y };
                return diagonal(o, o);
            })
            .remove();

        // Store the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // Creates a curved diagonal path from parent to the child nodes
        function diagonal(s, d) {
            return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
        }

        // Toggle children on click.
        function toggleChildren(event, d) {
            if (event.altKey) {
                console.log(d.data.toString(), d);
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
            const id = d.data.getId();
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
            for (const path of markedPaths.values()) {
                //console.log(`marking link ${lnk}`);
                if (path.has()) d3.selectAll(`path.link[lnk='${lnk}']`).classed("marked", setMarked);
            }

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
                    return markedPath.has(lnk);
                }
                return false;
            }
        }
    }
}

function aColour(n) {
    return ColourArray[n % ColourArray.length];
}
export const ColourArray = [
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

/**
 * Generate text that display when and where the person was born
 */
function birthString(person) {
    const date = humanDate(person.getBirthDate());
    const place = person.getBirthLocation();
    return `Born: ${date ? `${datePrefix(person._data.DataStatus?.BirthDate)}${date}` : "[date unknown]"} ${
        place ? `in ${place}` : "[location unknown]"
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
function deathString(person) {
    const date = humanDate(person.getDeathDate());
    const place = person.getDeathLocation();
    if (person.isLiving()) {
        return "Still living";
    }
    return `Died: ${date ? `${datePrefix(person._data.DataStatus?.DeathDate)}${date}` : "[date unknown]"} ${
        place ? `in ${place}` : "[location unknown]"
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
