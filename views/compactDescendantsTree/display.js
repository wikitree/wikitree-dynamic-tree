// Thank you to to Malcolm Maclean for the tree drawing code:
//       https://gist.github.com/d3noob/1a96af738c89b88723eb63456beb6510
// Also thank you Ian Beacall (https://www.wikitree.com/wiki/Beacall-641, https://github.com/shogenapps) for all
// the code I "stole" from you to make this app better.
//
import { CCDE } from "./ccd_explorer.js";
// import { Couple } from "./couple.js";
import { Utils } from "../shared/Utils.js";

const DOWN_ARROW = "\u21e9";
const UP_ARROW = "\u21e7";
const RIGHT_ARROW = "⤇"; // "\u2907";
const savedChildrenField = "_children";
const dumpWithDraw = false; // Set to true to dump the tree with drawn nodes and links

export function showTree(ccde, treeInfo, connectors = false, hideTreeHeader = false) {
    if (dumpWithDraw) console.log(`showTree:`, treeInfo);
    let theTree = treeInfo;
    const SEPARATION = 500;
    const markedNodes = new Set();
    const markedPaths = new Map();

    // Set the dimensions and margins of the diagram
    const aName = theTree.rootCouple.a?.getDisplayName();
    const bName = theTree.rootCouple.b?.getDisplayName();
    const margin = {
        top: 10,
        right: 10,
        bottom: 10,
        left: Math.max(aName ? aName.length : 5, bName ? bName.length : 5) * 8,
    };
    // const originalSrc = document.getElementById("originalSrc").checked;
    // const useX0 = document.getElementById("useX0").checked;
    // const linksDelay = +$("#d3Delay").val() || 0;
    const edgeFactor = +$("#edgeFactor").val() || 180;
    const heightFactor = +$("#cccdHFactor").val() || 55;
    const brickWallColour = $("#ccdBrickWallColour").val() || "#FF0000";
    const linkLineColour = $("#ccdLinkLineColour").val() || "#000CCC";
    const privatise = $("#privatise").is(":checked");
    const anonLiving = $("#anonLiving").is(":checked");
    var currentMaxShowGen = theTree.maxGeneration;

    function calculateWidths() {
        const treeWidth = currentMaxShowGen * edgeFactor;
        return [treeWidth, calculateSvgWidth(treeWidth)];
    }

    function calculateSvgWidth(tWidth) {
        const w = tWidth + margin.right + margin.left;
        return w;
    }

    function calculateTreeHeight(theGenerationCounts) {
        const [largestGeneration] = maxAndIndex(theGenerationCounts);
        // console.log(`theGenCounts=${theGenerationCounts}`);
        // console.log(`largestGeneration = ${largestGeneration}`);
        return largestGeneration * heightFactor - margin.top - margin.bottom;
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

    const treeHeight = calculateTreeHeight(theTree.genCounts);
    const [treeWidth, svgWidth] = calculateWidths();

    // append the svg object to the body of the page
    // appends a 'group' element to 'svg'
    // move the 'group' element to the top left margin
    d3.select("#theSvg svg").remove();
    var svg = d3
        .select("#theSvg")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", treeHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const duration = 750;

    // declare a tree layout and assign the size
    var treeLayout = d3
        .tree()
        .size([treeHeight, treeWidth])
        .separation(function (a, b) {
            return SEPARATION;
        });

    const inTree = connectors ? new Set() : undefined;
    // Assign parent, children, height, depth
    var d3Root = d3.hierarchy(theTree.rootCouple, function (cpl) {
        return CCDE.getD3Children(cpl, inTree);
    });
    d3Root.x0 = treeHeight / 2;
    d3Root.y0 = 0;
    // console.log(`d3Root (x,y)=(${d3Root.x},${d3Root.y}) (x0,y0)=(${d3Root.x0},${d3Root.y0})`, d3Root);
    updateDisplay(d3Root);

    function genHeader(level) {
        let relType = "";
        if (level == 1) {
            return level;
        }
        const [child, grand, great] = edgeFactor >= 120 ? ["Children", "Grand", "Great-"] : ["C", "G", "G-"];
        if (level > 1) {
            relType = child;
        }
        if (level > 2) {
            relType = grand + relType.toLowerCase();
        }
        if (level > 3) {
            relType = great + relType;
        }
        if (level > 4) {
            relType = (level - 3).toString() + "x " + relType; // 3xGreat Grandparents
            // relType = ordinal(level - 3) + " " + relType;
        }
        return `${relType} (${level})`;
    }

    function ordinal(n) {
        let m = n % 100;
        if (m >= 10 && m <= 20) {
            return `${n}th`;
        }
        m = n % 10;
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

    // Collapse the node and all it's children
    function collapseSubtree(d) {
        if (d.children) {
            const ch = [...d.children];
            collapseBranch(d);
            ch.forEach((c) => {
                collapseSubtree(c);
            });
        }
    }

    function expandSubtree(d) {
        expandBranch(d);

        if (d.children) {
            d.children.forEach((c) => {
                expandSubtree(c);
            });
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

    function getPersonName(p, preferredValue, isLink = false) {
        if (!p || p.isNoSpouse) return "";
        if (anonLiving && p.isLiving()) {
            return "Living";
        }
        if (privatise) {
            if (p.isUnlisted()) return "Private";
            if (p.isPrivate()) return p._data.BirthNamePrivate || "Private";
        }
        let name = preferredValue;
        if (name && isLink) name = `See ${name}`;
        return name || "Private";
    }

    async function updateDisplay(srcNode) {
        CCDE.updateBrickWallCounts();
        // console.log("update: markedNodes", markedNodes);
        // console.log("update: markedLinks", markedPaths);
        const doSleep = document.getElementById("sleep")?.checked;

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
        treeLayout = treeLayout.size([treeHeight, treeWidth]);
        const treeData = treeLayout(d3Root);
        //console.log("treeData", treeData);
        // console.log(`d3Root updated: (x,y)=(${d3Root.x},${d3Root.y}) (x0,y0)=(${d3Root.x0},${d3Root.y0})`, d3Root);

        if (!hideTreeHeader) {
            d3.select("#theSvg table.treeHeader").remove();
            const tbl = d3
                .select("#theSvg")
                .insert("table", ":first-child")
                .attr("class", "treeHeader table-borderless")
                .attr("width", edgeFactor * (currentMaxShowGen - 1))
                .style("margin-left", `${margin.left}px`);
            const tr = tbl.append("tr");
            for (let lvl = 2; lvl <= currentMaxShowGen; ++lvl) {
                tr.append("td").style("width", `${edgeFactor}px`).attr("align", "right").text(genHeader(lvl));
            }
        }

        // Compute the new tree layout.
        const nodes = treeData.descendants();
        const links = treeData.descendants().slice(1);

        // Calculate y position of each node.
        // y (and width) here is the horizontal axis and x (and height) the vertical since we'll turn the tree on its side
        const tWidth = edgeFactor * (currentMaxShowGen - 1);
        const minYear = theTree.minBirthYear || +new Date().getFullYear();
        const ageSpan = theTree.maxBirthYear - minYear;
        const whoseBirthScale = document.querySelector('input[name = "theBirthScale"]:checked').value;
        nodes.forEach(function (d) {
            if (["a", "b", "c"].includes(whoseBirthScale)) {
                // Position according to birth date if possible
                // If we do, we mark the nodes used for birth scale so we can highlight them in the display
                const [p, s] =
                    whoseBirthScale == "c"
                        ? [d.data.getInFocus(), d.data.getNotInFocus()]
                        : whoseBirthScale == "a"
                        ? getPS("a", "b")
                        : getPS("b", "a");
                const bYear = +p?.getBirthYear();
                if (bYear == 0) {
                    // we're not using a birth year to position
                    d.y = d.depth * edgeFactor;
                    if (p && !p.isNoSpouse) p.birthPlaced = false;
                    if (s && !s.isNoSpouse) s.birthPlaced = false;
                } else {
                    d.y = (tWidth * (bYear - minYear)) / ageSpan;
                    if (p && !p.isNoSpouse) p.birthPlaced = true;
                    if (s && !s.isNoSpouse) s.birthPlaced = false;
                }
            } else {
                // We position according to the generation
                d.y = d.depth * edgeFactor;
                const p = d.data.a;
                const s = d.data.b;
                if (p && !p.isNoSpouse) p.birthPlaced = false;
                if (s && !s.isNoSpouse) s.birthPlaced = false;
            }

            // Get [person, spouse] of a couple such that 'person' is a proper person
            // and preferrably the m side of the couple, otherwise the n side
            function getPS(m, n) {
                let p = d.data[m];
                let s = d.data[n];
                if (!p || p.isNoSpouse) {
                    p = s;
                    s = p;
                }
                return [p, s];
            }
        });

        // ****************** Nodes section ***************************

        // Update the nodes...
        const gnodes = svg.selectAll("g.node").data(nodes, function (d) {
            return d.data.getId();
        });

        // Enter any new nodes at the parent's current position.
        const nodeEnter = gnodes
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("id", function (d) {
                return d.data.getId();
            })
            .attr("transform", function (d) {
                return "translate(" + srcNode.y0 + "," + srcNode.x0 + ")";
            });

        // Add a circle (or square) for each member of a couple in each of the (couple-) nodes
        drawPersonNodes("a");
        drawPersonNodes("b");
        function drawPersonNodes(side) {
            nodeEnter
                .append("path")
                .attr("class", function (d) {
                    const p = d.data[side];
                    const klass = p && p.birthPlaced ? "birthPlaced " : "";
                    return `node ${klass}${side} ${(p?.getGender() || " other").toLowerCase()}`;
                })
                .attr("transform", (d) => `translate(0, ${side === "a" ? -10 : 10})`)
                .attr("d", function (d) {
                    const side = this.classList.contains("a") ? "a" : "b";
                    const flagBloodline = document.getElementById("bloodline").checked;
                    return d.data.isInFocus(side) && flagBloodline
                        ? d3.symbol().type(d3.symbolSquare).size(1)()
                        : d3.symbol().type(d3.symbolCircle).size(3)(); // area = π*r²
                })
                .style("fill", function (d) {
                    return d[savedChildrenField] || d.data.isDescendantExpandable() ? "lightsteelblue" : "#fff";
                })
                .on("click", function (e, d) {
                    toggleChildren(e, d, side, this);
                })
                .append("title")
                .text(function (d) {
                    return birthAndDeathData(d.data[side]);
                });
        }

        // Draw children drop-down icons for all couples with children
        nodeEnter
            .filter((d) => d.data.mayHaveChildren())
            .each(function (d, i) {
                const couple = d.data;
                const jointChildrenIds = couple.getJointChildrenIds();
                if (jointChildrenIds.length > 0) {
                    const aName = couple.a && !couple.a.isNoSpouse ? couple.a.getDisplayName().split(" ")[0] : null;
                    const bName = couple.b && !couple.b.isNoSpouse ? couple.b.getDisplayName().split(" ")[0] : null;
                    let combinedName = aName;
                    if (bName) {
                        if (aName) {
                            combinedName += ` and ${bName}`;
                        } else {
                            combinedName = bName;
                        }
                    }
                    const nrC = jointChildrenIds.length;
                    const nrA = couple.a?.getChildrenIds()?.size || 0;
                    const nrB = couple.b?.getChildrenIds()?.size || 0;
                    let cWord = nrC == 1 ? "child" : "children";
                    let nrLabel = `${nrC}`;
                    let tooltip = `Show the ${nrC} ${cWord} of ${combinedName}`;
                    if (nrA != 0 && nrB != 0 && (nrA != nrB || nrA != nrC)) {
                        nrLabel += `[${nrA},${nrB}]`;
                        cWord = nrA == 1 ? "child" : "children in total";
                        tooltip += ` (${aName} had ${nrA} ${cWord} and ${bName} ${nrB})`;
                    }
                    // Draw the triangle and make it clickable to show the children names
                    d3.select(this)
                        .append("polygon")
                        .attr("class", "node")
                        .attr("points", function (d) {
                            // Draw a triangle below the 2 circles
                            return "-5,18 5,18 0,28";
                        })
                        .style("fill", "green")
                        .on("click", function (event) {
                            // Get the most recent data object bound to the d3 node
                            const d = d3.select(this.parentNode).datum();
                            toggleChildrenList(event, d, $(this), combinedName);
                        })
                        .append("title")
                        .text(tooltip);
                    // Also draw the number of children (an make it clickable as above)
                    d3.select(this)
                        .append("text")
                        .attr("y", "28")
                        .attr("x", "-5")
                        .attr("text-anchor", "end")
                        .text(nrLabel)
                        .style("cursor", "pointer")
                        .on("click", function (event) {
                            const d = d3.select(this.parentNode).datum();
                            toggleChildrenList(event, d, $(this), combinedName);
                        })
                        .append("title")
                        .text(tooltip);
                }
            });

        // Draw other spouse drop-down icons for everyone with >1 spouse
        drawOtherSpousesButton("a");
        drawOtherSpousesButton("b");
        function drawOtherSpousesButton(side) {
            nodeEnter
                .filter((d) => hasAlternateSpouses(d.data[side]))
                .append("polygon")
                .attr("class", "node")
                .attr("points", function (d) {
                    if (side == "a") {
                        // Draw a triangle to the right of the bottom circle
                        return "7,5 17,5 12,15";
                    } else {
                        // Draw a triangle to the right of the top circle
                        return "7,-15 17,-15 12,-5";
                    }
                })
                .style("fill", "green")
                .on("click", function (event, d) {
                    showOtherSpouses(d.data, $(this), side);
                })
                .append("title")
                .text(function (d) {
                    return `Show the other spouses of ${d.data[side].getDisplayName()}`;
                });

            function hasAlternateSpouses(person) {
                if (!person) return false;
                return person.getSpouses().length > 1;
            }
        }

        // Flag duplicate nodes with coloured square
        flagDuplicates("a");
        flagDuplicates("b");
        function flagDuplicates(side) {
            nodeEnter
                .filter((d) => d.data[side] && d.data[side].isDuplicate())
                .append("rect")
                .attr("class", function (d) {
                    return markedNodes.has(d.data[side].getId()) ? "dup marked" : "dup";
                })
                .attr("x", -10)
                .attr("y", side == "a" ? -20 : 0)
                .attr("width", 0)
                .attr("height", 0)
                .attr("wtId", (d) => d.data[side].getId())
                .on("click", (e, d) => toggleDuplicate(e, d, side))
                .append("title")
                .text(function (d) {
                    // return birthAndDeathData(d.data[side]);
                    return "Click to toggle path(s) to duplicates of this person in the tree. This will force curved tree links.";
                });
        }

        // Add labels for the nodes
        const flagAncestors = document.getElementById("flagAncestors").checked;
        addLabels("a");
        addLabels("b");
        function addLabels(side) {
            const PADDING_X = 3; // horizontal padding inside the box
            const PADDING_Y = 2; // vertical padding inside the box
            const rx = 3,
                ry = 3; // rounded corners

            const link = nodeEnter
                .append("a")
                .attr("xlink:href", function (d) {
                    const wtId = d.data[side]?.getWtId();
                    return typeof wtId === "undefined"
                        ? "https://www.wikitree.com/wiki/Help:Privacy"
                        : `https://www.wikitree.com/wiki/${wtId}`;
                })
                .attr("target", "_blank");

            // Create a group for the label
            const labelGroup = link.append("g").attr("transform", function () {
                const dy = side === "a" ? -7 : 13;
                return `translate(-13,${dy})`;
            });

            // Append text
            const text = labelGroup
                .append("text")
                .attr("text-anchor", "end") // right aligned
                .attr("wtId", (d) => d.data[side]?.getId())
                .text(function (d) {
                    const p = d.data[side];
                    return getPersonName(p, p?.getDisplayName(), d.data.IsLink || false);
                })
                .style("fill", (d) => (d.data[side]?.isBrickWall() ? brickWallColour : "inherit"));

            text.append("title").text((d) => birthAndDeathData(d.data[side]));

            if (flagAncestors) {
                // For each label group, only insert a rect when datum indicates user-ancestor.
                labelGroup.each(function (d) {
                    if (!d?.data?.[side]?.isUserAncestor) {
                        return; // no box for this node
                    }

                    const g = d3.select(this);
                    const tNode = g.select("text").node();

                    // Measure the text node; text is already in DOM so getBBox() is valid.
                    const bbox = tNode.getBBox(); // { x, y, width, height }

                    // Compute rect geometry so it's centered vertically on y=0 and right-aligned like the text.
                    const width = bbox.width + PADDING_X * 2;
                    const height = bbox.height + PADDING_Y * 2;

                    // Because text-anchor=end, the text's anchor (its "end") is at x=0 in the group.
                    // So place the rect so its right edge is at x = 0 (right aligned).
                    const rectX = -width + PADDING_X; // right edge at x=0
                    const rectY = bbox.y - PADDING_Y; // center vertically on y=0

                    // Insert rect BEFORE the text so it renders behind.
                    g.insert("rect", "text")
                        .attr("x", rectX)
                        .attr("y", rectY)
                        .attr("width", width)
                        .attr("height", height)
                        .attr("rx", rx)
                        .attr("ry", ry)
                        .style("fill", "#ffffcc")
                        .style("stroke", "#999")
                        .style("stroke-width", 1);
                });
            }
        }

        // UPDATE
        // Combine new and existing d3 nodes
        const nodeUpdate = nodeEnter.merge(gnodes);

        // Transition to the proper position for the node
        nodeUpdate
            .transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Update the node attributes and style
        nodeUpdate
            .selectAll("path.node")
            .attr("d", function (d) {
                const side = this.classList.contains("a") ? "a" : "b";
                const flagBloodline = document.getElementById("bloodline").checked;
                return d.data.isInFocus(side) && flagBloodline
                    ? d3.symbol().type(d3.symbolSquare).size(144)() // 12 x 12 pixels
                    : d3.symbol().type(d3.symbolCircle).size(113)(); // area = 113 = π*r² ≈ 36π
            })
            .style("fill", function (d) {
                // We need to look at the g.node DOM element's datum because the data of child
                // nodes do not get updated when the d3.selectAll().data() call is made
                const parentNode = d3.select(this).node().parentNode;
                const pd = d3.select(parentNode).datum();
                const side = this.classList.contains("a") ? "a" : "b";
                const result = colourOf(pd.data, side);
                return result;

                // Colour the circles independently for load-expand.
                function colourOf(cpl, side) {
                    if (pd[savedChildrenField]) return "yellowgreen"; // branch expand
                    if (cpl[side] && cpl.IsLink) return "rgb(0, 200, 255)";
                    if (!cpl[side] || cpl[side].isNoSpouse) return "#fff";
                    if (cpl.isDescendantExpandable()) {
                        return "lightsteelblue"; // load-expand
                    }
                    return "#fff";
                }
            })
            .attr("cursor", "pointer");

        // Colour the rectangles of the duplicates
        nodeUpdate
            .selectAll("rect.dup")
            .attr("width", 10)
            .attr("height", 10)
            .style("fill", function (d) {
                const id = this.getAttribute("wtId");
                const ci = theTree.duplicates.get(+id);
                return aColour(ci);
            })
            .style("cursor", "pointer");

        // Remove any exiting nodes
        const nodeExit = gnodes
            .exit()
            .transition()
            .duration(duration)
            .attr("transform", function (d) {
                return "translate(" + srcNode.y + "," + srcNode.x + ")";
            })
            .remove();

        // On exit reduce the node circles size to 0
        nodeExit.selectAll("circle").attr("r", 1e-6);

        // On exit reduce the opacity of text labels
        nodeExit.selectAll("text").style("fill-opacity", 1e-6);

        // ****************** links section ***************************
        if (doSleep) await sleep(3000); // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

        // Update the links...
        const link = svg.selectAll("path.ccdlink").data(links, function (d) {
            return d.data.getId();
        });

        // Enter any new links at the parent's previous position.
        const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", function (d) {
                const lnkId = `${d.parent.data.getCoupleId()}_${d.data.getCoupleId()}`;
                for (const m of markedPaths.values()) {
                    if (m.has(lnkId)) return "ccdlink marked";
                }
                return "ccdlink";
            })
            .attr("d", function (d) {
                // parent's previous position.
                const o = { x: srcNode.x0, y: srcNode.y0 };
                return diagonal(o, o);
            })
            .attr("stroke", linkLineColour)
            .attr("lnk", function (d) {
                return `${d.parent.data.getCoupleId()}_${d.data.getCoupleId()}`;
            });

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Transition back to the parent element position
        linkUpdate
            .transition()
            // .delay(linksDelay)
            .duration(duration)
            .attr("d", function (d) {
                return diagonal(d, d.parent);
            })
            .attr("stroke", linkLineColour);

        // Remove any existing links
        link.exit()
            .transition()
            .duration(duration)
            .attr("d", function (d) {
                const o = { x: srcNode.x, y: srcNode.y };
                return diagonal(o, o);
            })
            .remove();

        // Store the old positions for the next transition.
        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // ****************** update helper functions ***************************

        function birthAndDeathData(person) {
            if (!person) {
                return "This is not a person";
            }
            if ((anonLiving && person.isLiving()) || (privatise && person.isUnlisted())) {
                return "This information is private.";
            }
            if (privatise && person.isPrivate()) {
                return `${birthString(person, privatise)}\n${deathString(person, privatise)}`;
            }
            return `${birthString(person)}\n${deathString(person)}`;
        }

        // Creates a curved diagonal path from source (s) to destination (d)
        // (we typically call this with s = child and d = parent)
        function diagonal(s, d) {
            const edgeType = document.querySelector('input[name = "edgeType"]:checked').value;

            switch (edgeType) {
                case "square":
                    return elbow();
                case "curved":
                default:
                    return curveWithStraightEnds();
            }

            function curveWithStraightEnds() {
                // Draw a bezier curve from s to d
                return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                    ${(s.y + d.y) / 2} ${d.x},
                    ${d.y} ${d.x}`;
            }

            function elbow() {
                // We flip x and y because we draw the tree "on its side", i.e from
                // left to right rather than from top to bottom which is what the
                // default coordinate system assumes
                return `M${s.y},${s.x}H${s.y + (d.y - s.y) / 2}V${d.x}H${d.y}`;
            }

            function arcAtDst() {
                // Draw a bezier curve from s to d and add an (8,4) elipse arc at d,
                // with the arc pointing up/down depending on dir. If dir = 0, no arc is drawn.
                const dir = s == d ? 0 : s.data.isAnAAncestor() ? -1 : 1;
                const dy = dir ? d.y + 8 : d.y;
                const eseg = dir ? ` a 8,4 0 0,${dir < 0 ? 1 : 0} -8,${dir * 4}` : "";
                return `M ${s.y} ${s.x}
                    C ${(s.y + dy) / 2} ${s.x},
                    ${(s.y + dy) / 2} ${d.x},
                    ${dy} ${d.x}
                    ${eseg}`;
            }
        }

        function toggleChildren(event, dd, side, clicked) {
            const parentNode = d3.select(clicked).node().parentNode;
            const d = d3.select(parentNode).datum();
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                console.log(
                    `${d.data.toString()} (is${d.data.isExpanded() ? "" : "Not"}Expanded) (is${
                        d.data.isDescendantExpandable(true) ? "" : "Not"
                    }DescExpandable)`,
                    d
                );
                return;
            }
            if (event.shiftKey) {
                expandSubtree(d);
                const newDepth = d.depth + d.data.getNrOlderGenerations();
                currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
            } else if (d.children && !d[savedChildrenField]) {
                // contract
                collapseBranch(d);
                updateDisplay(d);
            } else if (d[savedChildrenField]) {
                // expand
                expandBranch(d);
            } else {
                expandBranchWithLoad(d, side, clicked);
            }
        }

        function expandBranchWithLoad(d, side, clicked) {
            if (d.data.IsLink) return;
            if (!expandSavedChildren(d)) {
                const circ = d3.select(clicked);
                // Display a loading... icon
                const loader = svg
                    .append("image")
                    .attrs({
                        "height": 16,
                        "width": 16,
                        "transform": circ.attr("transform"),
                        "xlink:href": "https://www.wikitree.com/images/icons/ajax-loader-snake-333-trans.gif",
                    })
                    .attr("transform", function () {
                        const dy = side == "a" ? -10 : 10;
                        return `translate(${d.y + 10}, ${d.x + dy - 8})`;
                    });
                ccde.expand(d.data, CCDE.DESCENDANTS).then(function (newTreeInfo) {
                    loader.remove();
                    if (newTreeInfo) {
                        theTree = newTreeInfo;
                        const newDepth = d.depth + d.data.getNrOlderGenerations();
                        currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
                        const oldDescendants = d3Root.descendants();
                        const inTree = connectors ? new Set() : undefined;
                        const updatedD3Root = d3.hierarchy(theTree.rootCouple, function (c) {
                            return CCDE.getD3Children(c, inTree);
                        });
                        const dCoupleId = d.data.getId();
                        updatedD3Root.descendants().forEach(function (newNode) {
                            const newCoupleId = newNode.data.getId();
                            if (newCoupleId !== dCoupleId) {
                                const matchedOldNode = oldDescendants.find((n) => n.data.getId() === newCoupleId);
                                if (matchedOldNode) {
                                    if (matchedOldNode._children) {
                                        collapseSameChildren(newNode, matchedOldNode._children);
                                    }
                                    // if (matchedOldNode._childrenb) collapseBranch(newNode, "b");
                                }
                            }
                        });
                        // console.log("Rebuilt root", updatedD3Root);
                        d3Root = updatedD3Root;
                        if (dumpWithDraw) console.log(`expanded tree:`, theTree);

                        updateDisplay(d);
                    }
                });
            }
        }

        // Collapse the children of d that are in oldHiddenChildren (an array of Jd elements)
        function collapseSameChildren(d, oldHiddenChildren) {
            if (d.children) {
                const hiddenChildrenIds = new Set(oldHiddenChildren.map((c) => c.data.getId()));
                const remaining = [];
                for (const child of d.children) {
                    if (hiddenChildrenIds.has(child.data.getId())) {
                        if (!d._children) d._children = [];
                        d._children.push(child);
                    } else {
                        remaining.push(child);
                    }
                }

                d.children = remaining;
            }
        }

        function toggleChildrenList(event, d, jqClicked, combinedName) {
            const couple = d.data;
            const childListId = couple.getId() + "_children";
            const $childrenList = $(`#${childListId}`);
            if ($childrenList.length) {
                // $childrenList.css("z-index", `${CCDE.getNextZLevel()}`).slideToggle("fast", () => {
                //     setOffset(jqClicked, $childrenList, 5, 5);
                // });
                // return;
                // We always redraw the children list, so we may as well remove it when it is being closed here
                if ($childrenList.is(":visible")) {
                    $childrenList.slideUp("fast");
                    $childrenList.remove(); // remove the old list
                    return;
                }
                $childrenList.remove(); // remove the old list
            }
            const childrenIds = couple.getJointChildrenIds();
            if (childrenIds.length > 0) {
                const childrenList = drawChildrenList(couple, childrenIds, d[savedChildrenField], combinedName);
                childrenList.id = childListId;
                showTable(jqClicked, $(childrenList), 5, 5);
            }
        }

        function showOtherSpouses(couple, jqClicked, side) {
            // 'side' here indicates which partner has the alternate spouses that should be shown.
            //  i.e. it is the 'show alternate spouses' button next to the other person that was clicked
            const personWithAltSpouses = couple[side];
            const spouseListId = `p${personWithAltSpouses.getId()}_spouses`;
            const $spouseList = $(`#${spouseListId}`);
            if ($spouseList.length) {
                $spouseList.css("z-index", `${CCDE.getNextZLevel()}`).slideToggle("fast", () => {
                    setOffset(jqClicked, $spouseList, 5, 5);
                });
                return;
            }

            // We have not created the list before, so do it now
            const personWhoseButtonWasClicked = couple[side == "a" ? "b" : "a"];
            const spouseList = getSpouseSelection(couple, personWhoseButtonWasClicked, personWithAltSpouses);
            if (spouseList) {
                spouseList.id = spouseListId;
                showTable(jqClicked, $(spouseList), 5, 5);
            }
        }

        // Toggle duplicate highlight on click.
        function toggleDuplicate(event, d, side) {
            if ($("#etsquare").is(":checked")) {
                $("#etcurved").prop("checked", true).trigger("change");
            }
            const p = d.data[side];
            const id = p.getId();
            // find all the paths to this person
            const setMarked = p.toggleMarked();
            let linksToMark;
            let linksToUnmark;
            if (setMarked) {
                const links = CCDE.findPaths([p.getWtId()], theTree);
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
                    d3.selectAll(`path.ccdlink[lnk='${lnk}']`).classed("marked", true);
                }
            }
            if (linksToUnmark) {
                for (const lnk of linksToUnmark.keys()) {
                    if (!stillMarked(lnk)) {
                        d3.selectAll(`path.ccdlink[lnk='${lnk}']`).classed("marked", false);
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
    } // end of update method

    function expandSavedChildren(d) {
        const savedChildren = d[savedChildrenField];
        if (savedChildren) {
            if (d.children) {
                d.children = d.children.concat(savedChildren);
            } else {
                d.children = savedChildren;
            }
            d.children.sort(originalChildOrder);
            d[savedChildrenField] = null;
            const newDepth = d.depth + d.data.getNrOlderGenerations();
            currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
            updateDisplay(d);
            return true;
        }
        return false;
    }

    function expandBranch(d) {
        return expandSavedChildren(d);
    }

    function originalChildOrder(a, b) {
        // Compare two children to see if they are in their original order
        // a and b are d3 nodes
        return a.data.idPrefix.split("_").at(-1) - b.data.idPrefix.split("_").at(-1);
    }

    function collapseBranch(d) {
        if (!d.children) return;
        d[savedChildrenField] = d[savedChildrenField] || []; // ensure it exists
        // move all children to savedChildren
        d[savedChildrenField] = d[savedChildrenField].concat(d.children);
        d.children = null;
    }

    function showTable(jqClicked, theTable, lOffset, tOffset) {
        theTable.addClass("pop-up");
        // Attach the table to the container div
        theTable.prependTo($("#ccdContainer"));
        theTable.draggable();

        setOffset(jqClicked, theTable, lOffset, tOffset);
        $(window).resize(function () {
            if (theTable.length) {
                setOffset(jqClicked, theTable, lOffset, tOffset);
            }
        });

        theTable.css("z-index", `${CCDE.getNextZLevel()}`);
        theTable.slideDown("fast");
        theTable
            .find("x")
            .off("click")
            .on("click", function () {
                theTable.slideUp("fast");
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

    function drawChildrenList(couple, childrenIds, hiddenJds, combinedName) {
        const listDiv = document.createElement("div");
        listDiv.className = "children-list";
        listDiv.style.display = "none";
        const x = document.createElement("x");
        x.textContent = "[ x ]";
        listDiv.appendChild(x);
        const heading = document.createElement("h4");
        heading.textContent = `Children of ${combinedName}`;
        listDiv.appendChild(heading);

        const children = [];
        for (const childId of childrenIds) {
            children.push(theTree.people.get(+childId));
        }
        sortByBirthDate(children);
        const hiddenChildrenIds = new Set(hiddenJds ? hiddenJds.map((jd) => +jd.data.getInFocus()?.getId()) : []);
        const parentsId = couple.getId();
        const childrenList = document.createElement("ol");
        for (const [i, child] of children.entries()) {
            const item = document.createElement("li");
            const childName = getPersonName(child, getShortName(child));
            const hidden = hiddenChildrenIds && hiddenChildrenIds.has(child.getId());
            item.appendChild(
                aDivWith(
                    "aChild",
                    aChildCheckBox(parentsId, i, child.getId(), !hidden),
                    document.createTextNode(" "),
                    aProfileLink(childName, child.getWtId(), child.isBrickWall()),
                    document.createTextNode(" "),
                    aTreeLink(childName, child.getWtId()),
                    document.createTextNode(` ${lifespan(child)}`)
                )
            );
            childrenList.appendChild(item);
        }
        listDiv.appendChild(childrenList);

        return listDiv;
    }

    function aChildCheckBox(parentsUniqueId, idx, personId, isChecked) {
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = parentsUniqueId + "_child_" + idx;
        checkbox.value = personId;
        checkbox.checked = isChecked;
        checkbox.dataset.parent = parentsUniqueId;
        checkbox.addEventListener("change", function () {
            // const person = theTree.people.get(+this.value);
            const d = d3.select(`#${this.dataset.parent}`).datum();
            const couple = d.data;
            if (this.checked) {
                // move child from saved/hidden to actual
                if (!d.children) d.children = [];
                moveChildById(+this.value, d[savedChildrenField], d.children);
                d.children.sort(originalChildOrder);
                if (d[savedChildrenField]?.length == 0) {
                    d[savedChildrenField] = null; // remove the children array if empty
                }
            } else {
                // move child from actual to saved/hidden
                if (!d[savedChildrenField]) d[savedChildrenField] = [];
                moveChildById(+this.value, d.children, d[savedChildrenField]);
                if (d.children.length == 0) {
                    d.children = null; // remove the children array if empty
                }
            }
            updateDisplay(d);
        });
        return checkbox;
    }

    function moveChildById(id, src, dst) {
        if (!src) return;
        const index = src.findIndex(
            (d) => (d.data.a && d.data.a.getId() === id) || (d.data.b && d.data.b.getId() === id)
        );
        if (index !== -1) {
            const [moved] = src.splice(index, 1);
            dst.push(moved);
        }
    }

    /**
     * For the given couple, conisting of 'person' and 'currentSpouse', determine the list of all
     * spouses of currentSpouse. This list will therefore contain 'person' as well as the possible
     * other spouses of their spouse 'currentSpouse'.
     * @param {*} couple The couple containing 'person' and 'currentSpouse'
     * @param {*} person The current partner of 'currentSpouse' in couple
     * @param {*} currentSpouse The current spouse of 'person' in couple
     * @param {*} mayChangeSpouse true iff we are allowed to add a 'change partner' button
     * @returns spouseList, or null if there is only one spouse
     */
    function getSpouseSelection(couple, person, currentSpouse) {
        if (!currentSpouse) return null;
        const currentSpouseFullName = currentSpouse.getDisplayName();

        // Collect a list of the names and lifespans of all the spouses of currentSpouse
        const spouses = currentSpouse.getSpouses();
        if (!spouses || spouses.length <= 1) return null;

        const list = [];
        for (const spouse of spouses) {
            const mDate = currentSpouse._data.MarriageDates[spouse.getId()].marriage_date;
            list.push({
                id: spouse.getId(),
                name: getPersonName(spouse, getShortName(spouse)),
                lifespan: lifespan(spouse),
                wtId: spouse.getWtId(),
                mDate: mDate,
                msDate: Utils.dateObject(mDate),
                isBrickWall: spouse.isBrickWall,
            });
        }

        // Sort the list of spouses
        ((spl) => {
            spl.sort((a, b) => {
                return a.msDate - b.msDate;
            });
        })(list);

        const wrapper = document.createElement("div");
        wrapper.className = "alt-spouse-list-wrapper";
        // wrapper.setAttribute("title", ""); // prevent the spouse box's title from being active here
        wrapper.style.display = "none";
        const x = document.createElement("x");
        x.textContent = "[ x ]";
        wrapper.appendChild(x);
        const heading = document.createElement("h4");
        heading.textContent = `Spouses of ${getShortName(currentSpouse)}`;
        wrapper.appendChild(heading);

        const listDiv = document.createElement("div");
        listDiv.className = "spouse-list";

        const spouseList = document.createElement("ol");
        for (const spouseData of list) {
            const item = document.createElement("li");
            item.appendChild(
                aDivWith(
                    "altSpouse",
                    aProfileLink(spouseData.name, spouseData.wtId, spouseData.isBrickWall()),
                    aSpanWith(
                        "lifespan",
                        document.createTextNode(" "),
                        aTreeLink(spouseData.name, spouseData.wtId),
                        document.createTextNode(` ${spouseData.lifespan}`)
                    )
                )
            );
            const marDiv = aDivWith("marriage-date", document.createTextNode(`x ${spouseData.mDate},`));
            const mayChangeSpouse = couple.getInFocus().getId() == currentSpouse.getId();
            if (mayChangeSpouse && person.getId() != spouseData.id) {
                // Create a "change partner" button
                const button = document.createElement("button");
                button.className = "select-spouse-button btn btn-sm";
                button.textContent = RIGHT_ARROW;
                button.setAttribute("couple-id", couple.getId());
                button.setAttribute("person-id", currentSpouse.getId());
                button.setAttribute("spouse-id", spouseData.id);
                button.setAttribute("title", `Change ${currentSpouseFullName}'s spouse to ${spouseData.name}`);
                button.addEventListener("click", changePartner);

                // FIX!!!! remove the listeners again !!!!!
                marDiv.prepend(button);
            }
            item.appendChild(marDiv);
            spouseList.appendChild(item);
        }
        listDiv.appendChild(spouseList);

        wrapper.appendChild(listDiv);
        return wrapper;
    }
    function changePartner(event) {
        event.stopPropagation();
        const coupleId = event.currentTarget.getAttribute("couple-id");
        const personId = event.currentTarget.getAttribute("person-id");
        const newPartnerId = event.currentTarget.getAttribute("spouse-id");
        ccde.changePartner(coupleId, personId, newPartnerId);
    }

    function aDivWith(itsClass, ...elements) {
        const div = document.createElement("div");
        if (itsClass) div.className = itsClass;
        div.append(...elements);
        return div;
    }

    function aSpanWith(itsClass, ...elements) {
        const div = document.createElement("span");
        if (itsClass) div.className = itsClass;
        div.append(...elements);
        return div;
    }

    /**
     * Create a link (<a href=...>)</a> to a given WikiTree profile
     * @param {*} itsText The text to display in the link
     * @param {*} personId The profile id to link to
     * @param {*} isBrickWall Whether or not the profile has been classified as a brick wall
     */
    function aProfileLink(itsText, personId, isBrickWall) {
        const profileLink = document.createElement("a");
        let txt;
        if (isBrickWall) {
            txt = document.createElement("span");
            txt.textContent = itsText;
            txt.style.color = brickWallColour;
        } else {
            txt = document.createTextNode(itsText);
        }
        profileLink.appendChild(txt);
        profileLink.href = `https://www.wikitree.com/wiki/${personId}`;
        profileLink.target = "_blank";
        profileLink.setAttribute("title", `Open the profile of ${itsText} on a new page`);
        return profileLink;
    }

    function aTreeLink(shortName, wtId) {
        // Icon and link to dynamic tree
        const img = document.createElement("img");
        img.src = "https://www.wikitree.com/images/icons/pedigree.gif";
        const treeLink = document.createElement("a");
        treeLink.href = `#name=${wtId}`;
        treeLink.appendChild(img);
        treeLink.setAttribute("title", `Make ${shortName} the root of the tree`);
        return treeLink;
    }
    function sleep(ms) {
        // console.log("Sleeping...");
        return new Promise((resolve) => setTimeout(resolve, ms));
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
function birthString(person, privatise = false) {
    const bDate = person?.getBirthDate();
    const date = privatise || !bDate ? person?.getBirthDecade() : humanDate(bDate);
    const place = privatise ? "an undisclosed place" : person?.getBirthLocation();
    return `Born: ${date ? `${datePrefix(person._data.DataStatus?.BirthDate)}${date}` : "[date unknown]"} ${
        place ? `in ${place}` : ""
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
 * Generate a string representing this person's lifespan in years, e.g. 1825 - 1898
 */
function lifespan(person) {
    if (person.isNoSpouse) {
        return "-";
    }
    let birth = "",
        death = "";
    if (person.getBirthDate()) {
        birth = person.getBirthDate().substr(0, 4);
    }
    if (person.getDeathDate()) {
        death = person.getDeathDate().substr(0, 4);
    }

    let lifespan = "";
    if (birth && birth != "0000") {
        lifespan = `${birth} –`;
    }
    if (death && death != "0000") {
        if (lifespan.length == 0) lifespan += "–";
        lifespan += ` ${death}`;
    }

    return lifespan;
}

/**
 * Generate text that display when and where the person died
 */
function deathString(person, privatise = false) {
    if (person?.isLiving()) {
        return "Still living";
    }
    const dDate = person?.getDeathDate();
    const date = privatise || !dDate ? person?.getDeathDecade() : humanDate(dDate);
    const place = privatise ? "an undisclosed place" : person?.getDeathLocation();
    return `Died: ${date ? `${datePrefix(person._data.DataStatus?.DeathDate)}${date}` : "[date unknown]"} ${
        place ? `in ${place}` : ""
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

/**
 * Sort a list of people by their birth date from earliest to latest.
 * People with no birth year is put last.
 */
export function sortByBirthDate(list) {
    return list.sort((a, b) => {
        const aBirthDate = Utils.dateObject(a.getBirthDate());
        const bBirthDate = Utils.dateObject(b.getBirthDate());

        return aBirthDate - bBirthDate;
    });
}

function getShortName(person) {
    if (person.isNoSpouse) {
        return "";
    }
    const maxLength = 32;

    // Use birth name if it is not too long (note that it includes Suffix if present)
    const birthName = person.getDisplayName();
    if (birthName.length < maxLength) {
        return birthName;
    }

    // birth name is too long, so try successive shorter versions, but first determine a few fields with which
    // to construct shorter versions
    const lastNameAtBirth = person._data.LastNameAtBirth;
    const hasSuffix = person.hasSuffix();
    let lastNameAtBirthWithSuffix = lastNameAtBirth;
    let nameToSplit = birthName;
    if (person._data.Suffix) {
        lastNameAtBirthWithSuffix = `${lastNameAtBirth} ${person._data.Suffix}`;

        // Remove the suffix from birthName so we can split it into the other names
        let idx = birthName.lastIndexOf(person._data.Suffix);
        if (idx > 0) {
            nameToSplit = nameToSplit.substring(0, idx - 1);
        }
    }
    // Remove lastNameAtBirth from nameToSplit so we can split the result into the other names
    nameToSplit = nameToSplit.replace(lastNameAtBirth, "");
    let names = nameToSplit.split(" ");

    // However, if the above resulted in only one name and we have a FirstName field, use the latter to
    // obtain the other names on the assumption that it might contain all the names (as for profiles that
    // use 'no middle name' and have all the names in FirstName).
    if (person._data.FirstName && names.length <= 1) {
        names = person._data.FirstName.split(" ");
    }
    const firstName = names[0];

    // Obtain the middle name initials. We don't trust the field MiddleInitial since it does not always contain all initials
    // (it seems to assume there is only one middle name).
    let middleInitials = "";
    if (names.length > 1) {
        middleInitials = names
            .slice(1)
            .map((item) => item.substring(0, 1).toUpperCase())
            .join(" ");
    } else if (person._data.MiddleInitial != ".") {
        middleInitials = person._data.MiddleInitial;
    }

    let nameToReturn;
    if (hasSuffix) {
        // Try <first name> <middle initials> <last name> <suffix>
        nameToReturn = `${firstName} ${middleInitials} ${lastNameAtBirthWithSuffix}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }

        // Try <first name> <last name> <suffix>
        nameToReturn = `${firstName} ${lastNameAtBirthWithSuffix}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }
    }

    // Obtain initials
    const firstInitial = firstName.substring(0, 1);
    let allInitials = firstInitial;
    if (middleInitials.length > 0) {
        allInitials = `${firstInitial} ${middleInitials}`;
    }

    if (hasSuffix) {
        // Try <all initials> <last name> <suffix>
        nameToReturn = `${allInitials} ${lastNameAtBirthWithSuffix}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }

        // Try <first initial> <last name> <suffix>
        nameToReturn = `${firstInitial} ${lastNameAtBirthWithSuffix}`;
        if (nameToReturn.length <= maxLength) {
            return nameToReturn;
        }
    }

    // Try <first name> <middle initials> <last name>
    nameToReturn = `${firstName} ${middleInitials} ${lastNameAtBirth}`;
    if (nameToReturn.length <= maxLength) {
        return nameToReturn;
    }

    // Try <first name> <last name>
    nameToReturn = `${firstName} ${lastNameAtBirth}`;
    if (nameToReturn.length <= maxLength) {
        return nameToReturn;
    }

    // Try <all initials> <last name>
    nameToReturn = `${allInitials} ${lastNameAtBirth}`;
    if (nameToReturn.length <= maxLength) {
        return nameToReturn;
    }

    // Use <first initial> <last name>, truncated if necessary
    nameToReturn = `${firstInitial} ${lastNameAtBirth}`;
    if (nameToReturn.length <= maxLength) {
        return nameToReturn;
    }
    return nameToReturn.substring(0, maxLength - 3) + "...";
}
