// Thank you to to Malcolm Maclean for the tree drawing code:
//       https://gist.github.com/d3noob/1a96af738c89b88723eb63456beb6510
// Also thank you Ian Beacall (https://www.wikitree.com/wiki/Beacall-641, https://github.com/shogenapps) for all
// the code I "stole" from you to make this app better.
//
import { CCTE } from "./cct_explorer.js";
import { Utils } from "../shared/Utils.js";
import { Couple } from "./couple.js";

const DOWN_ARROW = "\u21e9";
const UP_ARROW = "\u21e7";
const RIGHT_ARROW = "\u2907";

export function showTree(ccte, treeInfo, connectors = false, hideTreeHeader = false) {
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
    const edgeFactor = +$("#edgeFactor").val() || 180;
    const heightFactor = +$("#cctTHFactor").val() || 80;
    const brickWallColour = $("#cctBrickWallColour").val() || "#FF0000";
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
    // moves the 'group' element to the top left margin
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
    var d3Root = d3.hierarchy(theTree.rootCouple, function (d) {
        return CCTE.getD3Children(d, inTree);
    });
    d3Root.x0 = treeHeight / 2;
    d3Root.y0 = 0;
    // console.log(`d3Root (x,y)=(${d3Root.x},${d3Root.y}) (x0,y0)=(${d3Root.x0},${d3Root.y0})`, d3Root);
    update(d3Root);

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
            collapseBranch(d, "a");
            collapseBranch(d, "b");
            ch.forEach((c) => {
                collapseSubtree(c);
            });
        }
    }

    function expandSubtree(d) {
        expandBranch(d, "a");
        expandBranch(d, "b");

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

    async function update(srcNode) {
        // console.log("update: markedNodes", markedNodes);
        // console.log("update: markedLinks", markedPaths);
        const doSleep = document.getElementById("sleep").checked;

        //TODO: we can opimise this by only recalculating it when required, but for now we're lazy
        // and calculate it every time - seems to be fast enough and less error-prone
        const displayGenCounts = getDisplayableGenerationCounts(d3Root, []);
        const treeHeight = calculateTreeHeight(displayGenCounts);
        const [treeWidth, svgWidth] = calculateWidths();
        console.log(`Update: treeHeight=${treeHeight}, treeWidth = ${treeWidth}, svgWidth = ${svgWidth}`);
        d3.select("#theSvg svg")
            .attr("width", svgWidth)
            .attr("height", treeHeight + margin.top + margin.bottom);

        // Assigns the x and y position for the nodes
        treeLayout = treeLayout.size([treeHeight, treeWidth]);
        const treeData = treeLayout(d3Root);
        //console.log("treeData", treeData);
        console.log(`d3Root updated: (x,y)=(${d3Root.x},${d3Root.y}) (x0,y0)=(${d3Root.x0},${d3Root.y0})`, d3Root);

        if (!hideTreeHeader) {
            d3.select("#theSvg table.treeHeader").remove();
            const tbl = d3
                .select("#theSvg")
                .insert("table", ":first-child")
                .attr("class", "treeHeader")
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
        const maxYear =
            Math.max(+CCTE.ancestorRoot.a?.getBirthYear() || 0, +CCTE.ancestorRoot.b?.getBirthYear() || 0) ||
            +new Date().getFullYear();
        const ageSpan = maxYear - theTree.minBirthYear;
        const whoseBirthScale = document.querySelector('input[name = "theBirthScale"]:checked').value;
        nodes.forEach(function (d) {
            if (whoseBirthScale == "a" || whoseBirthScale == "b") {
                // Position according to birth date if possible
                // If we do we mark the nodes used for birth scale so we can highlight them in the display
                const [p, s] = whoseBirthScale == "a" ? getPS("a", "b") : getPS("b", "a");
                const bYear = +p?.getBirthYear();
                if (bYear == 0) {
                    d.y = d.depth * edgeFactor;
                    if (p && !p.isNoSpouse) p.birthPlaced = false;
                    if (s && !s.isNoSpouse) s.birthPlaced = false;
                } else {
                    d.y = (tWidth * (maxYear - bYear)) / ageSpan;
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

        const privatise = document.getElementById("privatise").checked;
        const anonLiving = document.getElementById("anonLiving").checked;

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
            .attr("transform", function (d) {
                return "translate(" + srcNode.y0 + "," + srcNode.x0 + ")";
            });

        // Add a circle for each member of a couple in each of the nodes
        drawCircles("a");
        drawCircles("b");
        function drawCircles(side) {
            nodeEnter
                .append("circle")
                .attr("class", function (d) {
                    const p = d.data[side];
                    const klass = p && p.birthPlaced ? "birthPlaced " : "";
                    return `node ${klass}${side} ${(p?.getGender() || " other").toLowerCase()}`;
                })
                .attr("r", 1e-6)
                .attr("cy", side == "a" ? -10 : 10)
                .style("fill", function (d, side) {
                    return d[savedChildrenFieldFor(side)] ? "lightsteelblue" : "#fff";
                })
                .on("click", function (e, d) {
                    toggleAncestors(e, d, side, $(this));
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
                const self = this;
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
                    d3.select(self)
                        .append("polygon")
                        .attr("class", "node")
                        .attr("points", function (d) {
                            // Draw a triangle below the 2 circles
                            return "-5,18 5,18 0,28";
                        })
                        .style("fill", "green")
                        .on("click", function (event, d) {
                            showChildren(event, d, $(this), combinedName);
                        })
                        .append("title")
                        .text(tooltip);
                    // Also draw the number of children (an make it clickable as above)
                    d3.select(self)
                        .append("text")
                        .attr("y", "28")
                        .attr("x", "-5")
                        .attr("text-anchor", "end")
                        .text(nrLabel)
                        .style("cursor", "pointer")
                        .on("click", function (event, d) {
                            showChildren(event, d, $(this), combinedName);
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
                    return birthAndDeathData(d.data[side]);
                });
        }

        // Add labels for the nodes
        addLabels("a");
        addLabels("b");
        function addLabels(side) {
            nodeEnter
                .append("a")
                .attr("xlink:href", function (d) {
                    const wtId = d.data[side]?.getWtId();
                    return typeof wtId == "undefined"
                        ? "https://www.wikitree.com/wiki/Help:Privacy"
                        : `https://www.wikitree.com/wiki/${wtId}`;
                })
                .attr("target", "_blank")
                .append("text")
                .attr("dy", side == "a" ? "-7" : "13")
                .attr("x", -13)
                .attr("text-anchor", "end")
                .attr("wtId", (d) => d.data[side]?.getId())
                .text(function (d) {
                    const p = d.data[side];
                    if (!p || p.isNoSpouse) return "";
                    if (anonLiving && p.isLiving()) {
                        return "Living";
                    }
                    if (privatise) {
                        if (p.isUnlisted()) return "Private";
                        if (p.isPrivate()) return p._data.BirthNamePrivate || "Private";
                    }
                    return p.getDisplayName() || "Private";
                })
                .style("fill", (d) => {
                    return d.data[side]?.isBrickWall() ? brickWallColour : "inherit";
                })
                .append("title")
                .text(function (d) {
                    return birthAndDeathData(d.data[side]);
                });
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
            .selectAll("circle.node")
            .attr("r", 6)
            .style("fill", function (d) {
                const side = this.classList.contains("a") ? "a" : "b";
                const result = colourOf(d.data, side);
                // Assigning this to result will colour the the circels the same for load-expand
                // BUT currently if the partner is not a person, the load-expand won't happen
                // (this.classList.contains("a") && d[savedChildrenFieldFor("a")]) ||
                // (this.classList.contains("b") && d[savedChildrenFieldFor("b")])
                //     ? "yellowgreen"
                //     : !d.data.isExpanded() && d.data.hasAParent()
                //     ? "lightsteelblue" // load-expand
                //     : "#fff";
                return result;

                // Colour the circles independently for load-expand.
                function colourOf(cpl, side) {
                    if (d[savedChildrenFieldFor(side)]) return "yellowgreen"; // branch expand
                    if (
                        (side == "a" && !cpl.isAExpanded() && cpl.a.hasAParent()) ||
                        (side == "b" && !cpl.isBExpanded() && cpl.b.hasAParent())
                    ) {
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
        const link = svg.selectAll("path.link").data(links, function (d) {
            return d.id;
        });

        // Enter any new links at the parent's previous position.
        const linkEnter = link
            .enter()
            .insert("path", "g")
            .attr("class", function (d) {
                const lnkId = `${d.parent.data.getCoupleId()}_${d.data.getCoupleId()}`;
                for (const m of markedPaths.values()) {
                    if (m.has(lnkId)) return "link marked";
                }
                return "link";
            })
            .attr("d", function (d) {
                const o = { x: d.parent.x, y: d.parent.y };
                // tree root's previous position.
                // const o = { x: d3Root.x, y: d3Root.y };
                // parent's previous position.
                // const o = { x: srcNode.x0, y: srcNode.y0 };
                return diagonal(o, o);
            })
            .attr("lnk", function (d) {
                return `${d.parent.data.getCoupleId()}_${d.data.getCoupleId()}`;
            });

        // UPDATE
        const linkUpdate = linkEnter.merge(link);

        // Remove any exiting links
        link.exit()
            .transition()
            .duration(duration)
            .attr("d", function (d) {
                const o = { x: srcNode.x, y: srcNode.y };
                return diagonal(o, o);
            })
            .remove();

        // Transition back to the parent element position
        linkUpdate
            .transition()
            .duration(duration)
            .attr("d", function (d) {
                return diagonal(d, d.parent);
            });

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

        // Creates a curved diagonal path from parent to the child nodes
        function diagonal(s, d) {
            const dir = s == d ? 0 : s.data.isAnAAncestor() ? -1 : 1;

            return arcAtSrc();

            function curvedAtSrc() {
                const epx = d.x + dir * 7;
                return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                    ${d.y + (s.y - d.y) / 20} ${d.x - dir * 20},
                    ${d.y} ${epx}`;
            }
            function arcAtSrc() {
                // Draw a bezier curve from s to d and add an (8,4) elipse arc at d,
                // with the arc pointing up/down depending on dir. If dir = 0, no arc is drawn.
                const dy = dir ? d.y + 8 : d.y;
                const eseg = dir ? ` a 8,4 0 0,${dir < 0 ? 1 : 0} -8,${dir * 4}` : "";
                return `M ${s.y} ${s.x}
                    C ${(s.y + dy) / 2} ${s.x},
                    ${(s.y + dy) / 2} ${d.x},
                    ${dy} ${d.x}
                    ${eseg}`;
            }
            function original() {
                return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                    ${(s.y + d.y) / 2} ${d.x},
                    ${d.y} ${d.x}`;
            }
        }

        // Collapse/expand ancestors on click.
        function toggleAncestors(event, d, side, jqClicked) {
            if (event.ctrlKey || event.metaKey) {
                event.preventDefault();
                console.log(`${d.data.toString()} (is${d.data.isExpanded() ? "" : "Not"}Expanded)`, d);
                return;
            }
            if (event.altKey) {
                showBioCheckReport(jqClicked, d.data[side]);
                return;
            }
            const epIds = d.data[side]?.getExpandedParentIds();
            const expandedPIds = epIds ? [...epIds.values()].sort() : "noneLoaded";
            const pIds = (d.data[side]?.getParentIds() || []).sort();
            const isAllParentsLoaded = pIds.toString() == expandedPIds.toString();
            if (event.shiftKey) {
                expandSubtree(d);
                const newDepth = d.depth + d.data.getNrOlderGenerations();
                currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
            } else if (isAllParentsLoaded && d.children && !d[savedChildrenFieldFor(side)]) {
                // contract
                collapseBranch(d, side);
            } else if (isAllParentsLoaded && d[savedChildrenFieldFor(side)]) {
                // expand
                expandBranch(d, side);
            } else if (!isAllParentsLoaded && d.data[side]) {
                expandBranchWithLoad(d, side);
            }
        }

        function expandBranchWithLoad(d, side) {
            const sideChildrenName = savedChildrenFieldFor(side);
            const sideChildren = d[sideChildrenName];
            if (sideChildren) {
                if (d.children) {
                    // The order of children is important (a before b)...
                    if (side == "a") {
                        d.children = sideChildren.concat(d.children);
                    } else {
                        d.children = d.children.concat(sideChildren);
                    }
                } else {
                    d.children = sideChildren;
                }
                d[sideChildrenName] = null;
                const newDepth = d.depth + d.data.getNrOlderGenerations();
                currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
                update(d);
            } else {
                ccte.expand(d.data, CCTE.ANCESTORS).then(function (newTreeInfo) {
                    if (newTreeInfo) {
                        theTree = newTreeInfo;
                        const newDepth = d.depth + d.data.getNrOlderGenerations();
                        currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
                        d3Root = d3.hierarchy(theTree.rootCouple, function (c) {
                            return CCTE.getD3Children(c, inTree);
                        });
                        console.log("Rebuilt root", d3Root);
                        console.log("Expanded d", d);

                        update(d);
                    }
                });
            }
        }

        function showChildren(event, d, jqClicked, combinedName) {
            const couple = d.data;
            const childListId = couple.getCoupleId() + "_children";
            const $childrenList = $(`#${childListId}`);
            if ($childrenList.length) {
                $childrenList.css("z-index", `${CCTE.getNextZLevel()}`).slideToggle("fast", () => {
                    setOffset(jqClicked, $childrenList, 5, 5);
                });
                return;
            }
            const childrenIds = couple.getJointChildrenIds();
            if (childrenIds.length > 0) {
                const childrenList = drawChildrenList(childrenIds, combinedName);
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
                $spouseList.css("z-index", `${CCTE.getNextZLevel()}`).slideToggle("fast", () => {
                    setOffset(jqClicked, $spouseList, 5, 5);
                });
                return;
            }

            // We have not created the list before, so do it now
            const personWhoseButtonWasClicked = couple[side == "a" ? "b" : "a"];
            const spouseList = getSpouseSelection(
                couple,
                personWhoseButtonWasClicked,
                personWithAltSpouses,
                couple.isRoot
            );
            if (spouseList) {
                spouseList.id = spouseListId;
                showTable(jqClicked, $(spouseList), 5, 5);
            }
        }

        // Toggle duplicate highlight on click.
        function toggleDuplicate(event, d, side) {
            const p = d.data[side];
            const id = p.getId();
            // find all the paths to this person
            const setMarked = p.toggleMarked();
            let linksToMark;
            let linksToUnmark;
            if (setMarked) {
                const links = CCTE.findPaths([p.getWtId()], theTree);
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
                    return markedPath.has(lnk);
                }
                return false;
            }
        }
    } // end of update method

    function savedChildrenFieldFor(side) {
        return `_children${side}`;
    }

    function expandBranch(d, side) {
        const sideChildrenName = savedChildrenFieldFor(side);
        const sideChildren = d[sideChildrenName];
        if (sideChildren) {
            if (d.children) {
                // The order of children is important (a before b)...
                if (side == "a") {
                    d.children = sideChildren.concat(d.children);
                } else {
                    d.children = d.children.concat(sideChildren);
                }
            } else {
                d.children = sideChildren;
            }
            d[sideChildrenName] = null;
            const newDepth = d.depth + d.data.getNrOlderGenerations();
            currentMaxShowGen = Math.max(currentMaxShowGen, newDepth + 1);
            update(d);
            return true;
        }
        return false;
    }

    function collapseBranch(d, side) {
        if (!d.children) return;

        // Warning: only works for ancestors at the moment
        const sideChildrenName = savedChildrenFieldFor(side);
        for (let i = d.children.length - 1; i >= 0; --i) {
            // move 'side' children out of d.children to d._children<side>
            // (we start at the end and work to the front so as not to mess up the loop counters)
            if (isSide(d.children[i].data, side)) {
                const x = d.children.splice(i, 1); // remove the 'side' child from .children (it is now in an array)
                d[sideChildrenName] = d[sideChildrenName] ? d[sideChildrenName].concat(x) : x;
            }
        }
        if (d.children.length == 0) d.children = null;
        update(d);

        function isSide(couple, side) {
            return couple.idPrefix.slice(-1) == side;
        }
    }

    function showBioCheckReport(jqClicked, person) {
        if (typeof person.bioCheckReport == "undefined" || person.bioCheckReport.length == 0) {
            return;
        }
        const theClickedName = person.getWtId();
        const familyId = theClickedName.replace(" ", "_") + "_bioCheck";
        const $bioReportTable = $(`#${familyId}`);
        if ($bioReportTable.length) {
            $bioReportTable.css("z-index", `${CCTE.getNextZLevel()}`).slideToggle("fast", () => {
                setOffset(jqClicked, $bioReportTable, 10, 10);
            });
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
        theTable.prependTo($("#cctContainer"));
        theTable.draggable();
        theTable.off("dblclick").on("dblclick", function () {
            $(this).slideUp("fast");
        });

        setOffset(jqClicked, theTable, lOffset, tOffset);
        $(window).resize(function () {
            if (theTable.length) {
                setOffset(jqClicked, theTable, lOffset, tOffset);
            }
        });

        theTable.css("z-index", `${CCTE.getNextZLevel()}`);
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

    function drawChildrenList(childrenIds, combinedName) {
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
        const childrenList = document.createElement("ol");
        for (const child of children) {
            const item = document.createElement("li");
            const childName = getShortName(child);
            item.appendChild(
                aDivWith(
                    "aChild",
                    aProfileLink(childName, child.getWtId()),
                    document.createTextNode(" "),
                    aTreeLink(childName, child.getWtId())
                )
            );
            childrenList.appendChild(item);
        }
        listDiv.appendChild(childrenList);

        return listDiv;
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
    function getSpouseSelection(couple, person, currentSpouse, mayChangeSpouse) {
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
                name: getShortName(spouse),
                lifespan: lifespan(spouse),
                wtId: spouse.getWtId(),
                mDate: mDate,
                msDate: Utils.dateObject(mDate),
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
                    aProfileLink(spouseData.name, spouseData.wtId),
                    aSpanWith(
                        "lifespan",
                        document.createTextNode(" "),
                        aTreeLink(spouseData.name, spouseData.wtId),
                        document.createTextNode(" "),
                        document.createTextNode(spouseData.lifespan)
                    )
                )
            );
            const marDiv = aDivWith("marriage-date", document.createTextNode(`x ${spouseData.mDate},`));
            if (mayChangeSpouse && person.getId() != spouseData.id) {
                // Create a "change partner" button
                const button = document.createElement("button");
                button.className = "select-spouse-button";
                button.textContent = RIGHT_ARROW;
                button.setAttribute("couple-id", couple.getId());
                button.setAttribute("person-id", currentSpouse.getId());
                button.setAttribute("spouse-id", spouseData.id);
                button.setAttribute("title", `Change ${currentSpouseFullName}'s spouse to ${spouseData.name}`);
                // Note; the button's click behaviour is added in Tree.drawNodes()  FIX comment!!!
                marDiv.prepend(button);
            }
            item.appendChild(marDiv);
            spouseList.appendChild(item);
        }
        listDiv.appendChild(spouseList);

        wrapper.appendChild(listDiv);
        return wrapper;
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
     */
    function aProfileLink(itsText, personId) {
        const profileLink = document.createElement("a");
        profileLink.appendChild(document.createTextNode(itsText));
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
        treeLink.setAttribute("title", `Make ${shortName} the centre of the tree`);
        return treeLink;
    }
    function sleep(ms) {
        console.log("Sleeping...");
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
        lifespan += birth;
    }
    lifespan += " – ";
    if (death && death != "0000") {
        lifespan += death;
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
function sortByBirthDate(list) {
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
