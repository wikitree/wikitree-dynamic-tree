// Thank you to to Malcolm Maclean for the tree drawing code:
//       https://gist.github.com/d3noob/1a96af738c89b88723eb63456beb6510
// Also thank you Ian Beacall (https://www.wikitree.com/wiki/Beacall-641, https://github.com/shogenapps) for all
// the code I "stole" from you to make this app better.
//
import { AncestorTree } from "./ancestor_tree.js";

export function showTree(
    theRoot,
    pathsNodes,
    pathsLinks,
    duplicates,
    pathEndpoints,
    maxGen,
    expandPaths,
    onlyPaths,
    connectors,
    labelsLeftOnly
) {
    let markedNodes = new Set();
    let markedPaths = new Map();
    // if (pathsLinks.size == 0) onlyPaths = false;
    // Set the dimensions and margins of the diagram
    var margin = { top: 20, right: 90, bottom: 30, left: (theRoot.getDisplayName().length + 1) * 8 },
        width = $("#tWidth").val() - margin.left - margin.right,
        height = $("#tHeight").val() - margin.top - margin.bottom;

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // moves the 'group' element to the top left margin
    var svg = d3
        .select("#theSvg")
        .append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var idCounter = 0;
    const duration = 750;

    // declares a tree layout and assigns the size
    const treemap = d3.tree().size([height, width]);

    const inTree = connectors ? new Set() : undefined;
    // Assigns parent, children, height, depth
    const root = d3.hierarchy(theRoot, function (d) {
        return d.getD3Children(inTree);
    });
    root.x0 = height / 2;
    root.y0 = 0;
    // console.log("root", root);

    // Collapse after the maxGen level
    const q = [root];
    while (q.length > 0) {
        const n = q.shift();
        const wtId = n.data.getWtId();

        if (onlyPaths) {
            if (
                pathsNodes.has(wtId) &&
                !pathEndpoints.includes(wtId) &&
                (expandPaths || n.data.isBelowGeneration(maxGen))
            ) {
                if (n.children) {
                    for (const c of n.children) {
                        q.push(c);
                    }
                }
            } else {
                collapseSubtree(n);
            }
        } else {
            if (
                n.data.isBelowGeneration(maxGen) ||
                (expandPaths && pathsNodes.has(wtId) && !pathEndpoints.includes(wtId))
            ) {
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

    // Collapse the node and all it's children
    function collapseSubtree(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapseSubtree);
            d.children = null;
        }
    }

    function update(source) {
        // console.log("update: markedNodes", markedNodes);
        // console.log("update: markedLinks", markedPaths);
        // Assigns the x and y position for the nodes
        const treeData = treemap(root);
        //console.log("treeData", treeData);

        // Compute the new tree layout.
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Normalize for fixed-depth.
        nodes.forEach(function (d) {
            // d.y = d.depth * (onlyPaths ? 90 : 180);
            d.y = d.depth * ($("#edgeFactor").val() || 180);
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
                return "translate(" + source.y0 + "," + source.x0 + ")";
            });

        // Add Circle for the nodes
        nodeEnter
            .append("circle")
            .attr("class", function (d) {
                const wtId = d.data.getWtId();
                return pathsNodes.has(wtId) ? (pathEndpoints.includes(wtId) ? "node end" : "node ofinterest") : "node";
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
                return myColour(duplicates.get(d.data.getId()));
            })
            .attr("cursor", "pointer");

        // Remove any exiting nodes
        const nodeExit = node
            .exit()
            .transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + source.y + "," + source.x + ")";
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
                let klass = pathsLinks.has(lnkId) ? "link ofinterest" : "link";
                for (const m of markedPaths.values()) {
                    if (m.has(lnkId)) return `${klass} marked`;
                }
                return klass;
            })
            .attr("d", function (d) {
                var o = { x: source.x0, y: source.y0 };
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
                const o = { x: source.x, y: source.y };
                return diagonal(o, o);
            })
            .remove();

        // Store the old positions for transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // Creates a curved (diagonal) path from parent to the child nodes
        function diagonal(s, d) {
            return `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;
        }

        // Toggle children on click.
        function toggleChildren(event, d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        }

        // Toggle duplicate highlight on click.
        function toggleDuplicate(event, d) {
            // console.log("toggleDuplicate d", d);
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

function myColour(n) {
    return ColourArray[n % ColourArray.length];
}
var ColourArray = [
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
    const date = humanDate(person.getBirthDate()),
        place = person.getBirthLocation();

    return `Born: ${date ? `${date}` : "[date unknown]"} ${place ? `in ${place}` : "[location unknown]"}.`;
}

/**
 * Generate text that display when and where the person died
 */
function deathString(person) {
    const date = humanDate(person.getDeathDate()),
        place = person.getDeathLocation();

    return `Died: ${date ? `${date}` : "[date unknown]"} ${place ? `in ${place}` : "[location unknown]"}.`;
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
