import { AncestorTree } from "./ancestor_tree.js";
import { showTree } from "./display.js";

export class AncestorLinesExplorer {
    static #helpText = `
        <xx>[ x ]</xx>
        <h2 style="text-align: center">About Ancestor Line Explorer</h2>
        <p>
            Use this application to load the direct ancestors (up to 'Max Generations') of the person identified in the
            start profile and draw their family tree up to the specified tree level. Although one might have specified N
            generations to be retrieved, the maximum level of the tree might be at more than N generations if an ancestor
            appears at more than one generation (i.e. level in the tree). People that appear more than once in the tree are
            marked with a coloured square. If the 'Connectors' checkbox is ticked, a tree line will not be extended to
            beyond a duplicate person if there is already a line containing this person.
        </p>
        <p>
            To see more generations for which information has been loaded, you can expand the tree by clicking on any circle
            which has been coloured in. You can also collapse branches of the tree by clicking on any circle not coloured
            in. If you click on a coloured square (that indicates a duplicate person), all the other occurrences of that
            person, as well as the lines to them are highlighted. Click the square again to remove the highlights. If you
            click on the name of a person, a new tab is opened with that person's Wikitree Profile. If you hover over a node
            in the tree, the birth- and death date and location of that person is displayed.
        </p>
        <p>
            The more generations are requested in a load, the longer it may take, so please be patient. Once loaded, you can
            save the data locally to your device and re-load it much faster later.
        </p>
        <p>
            If you provide a list of comma-separated WikiTree IDs in the 'People of Interest' field, all the lines to those
            ancestors (if they are in the tree) will be highlighted. You can choose if these lines should be drawn in full,
            or whether they should also stop at the tree level specified. Separately you can specify whether or not only
            these "lines of interest" should be displayed or not.
        </p>
        <p>You can control the tree layout through 4 controls:</p>
        <ul>
            <li>
            The <b>Edge Factor</b> controls the horizontal distance between the tree layers: the smaller the number, the
            closer the layers are on the horizontal axis.
            </li>
            <li>
            The <b>Height</b> specifies the height of the display area and effectively controls the vertical distance
            between the nodes. The larger the number, the further the vertical distance between the nodes.
            </li>
            <li>
            The <b>Width</b> specifies the width of the display area. As the tree is drawn to the right, anything that
            does not fit into this width, will be clipped.
            </li>
            <li>
            The <b>Show tree eto level</b> value determines how many levels of the tree will be filled in with people that
            are not in a line to a person of interest. If you set this value to 0, the complete tree will be shown
            (subject to the setting of the other parameters).
            </li>
        </ul>
        <p>
            When you draw a complete tree (or any other time too!) experiment with the above values untill you find optimal
            values for readablitiy of your tree given its size. You can specify big numbers. For example a height of 15000
            and height of 3000 worked ok for me on a request of 12 generations that resulted in a tree with 16 levels. Just
            be prepared to scroll (or drag) the screen to see everything.
        </p>
        <p>
            If you find problems with this app or have suggestions for improvements, please
            <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Smit-641" , target="_blank"
            >let me know</a>.
        </p>
        <p>You can double click in this box, or click the X in the top right corner to remove this About text.</p>
   `;

    constructor(selector, startId) {
        this.selector = selector;
        $(selector).html(`<div id="aleContainer" class="ale" z-index: 1>
            <div id="controlBlock" z-index: 1000>
            <label for="generation">Max Generations:</label
            ><select id="generation" title="The number of generations to retrieve">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
                <option value="11">11</option>
                <option value="12">12</option>
                <option value="13">13</option>
                <option value="14">14</option>
                <option value="15">15</option>
                <option value="16">16</option>
                <option value="17">17</option>
                <option value="18">18</option>
                <option value="19">19</option>
                <option value="20">20</option>
            </select>
            <button id="getAncestorsButton" class="small button" title="Get ancestor data up to this generation from WikiTree">
                Get 11 Generations and Draw Tree
            </button
            ><button
                id="savePeople"
                title="Save the currently loaded data to a file for faster loading in future."
                class="small button"
            >
                Save
            </button
            ><button id="loadButton" class="small button" title="Load a previously saved data file and draw its tree.">
                Load a File
            </button
            ><input id="fileInput" type="file" style="display: none"
            /><button
                id="drawTreeButton"
                class="small button"
                title="Draw the tree, highlighting paths to the people of interest"
            >
                (Re-)Draw Tree
            </button>
            <span id="help-button" title="About this">?</span>
            <div id="help-text">${AncestorLinesExplorer.#helpText}</div>
            <br />
            <label for="otherWtIds">People of Interest:</label>
            <input id="otherWtIds"
                type="text"
                placeholder="(Optional) Enter comma-seperated WikiTree IDs"
                size="110"
                title="Identify people of interest that need to be highlighted in the tree" />
            <br />
            <fieldset>
                <legend>Options:</legend>
                <table>
                <tr>
                    <td>
                        <input
                            id="expandPaths"
                            type="checkbox"
                            checked
                            title="Ignore the 'Show tree to level' setting when drawing the lines to the above people of interest"
                        />
                        <label
                            for="expandPaths"
                            title="Ignore the 'Show tree to level' setting when drawing the lines to the above people of interest"
                            class="right"
                        >
                            Fully expand lines of interest</label
                        >
                    </td>
                    <td>
                        <input
                            id="connectors"
                            type="checkbox"
                            title="Do not expand a path to beyond a duplicate if a previous path already exists. Just draw a connector."
                        />
                        <label
                            for="connectors"
                            title="Do not expand a path to beyond a duplicate if a previous path already exists. Just draw a connector."
                            class="right"
                        >
                            Connectors.</label
                        >
                    </td>
                    <td>
                        <label for="tWidth" title="The width of the graph. If too small, content to the right is clipped." class="left">
                            Width</label
                        >
                        <input
                            id="tWidth"
                            type="number"
                            min="200"
                            step="100"
                            value="1500"
                            title="The width of the graph. If too small, content to the right is clipped."
                        />
                    </td>
                    <td>
                        <label for="edgeFactor" title="Determines the horizontal distance between nodes" class="left"> Edge Factor</label>
                        <input id="edgeFactor" type="number" value="180" step="10" title="Determines the horizontal distance between nodes" />
                    </td>
                </tr>
                <tr>
                    <td>
                        <input
                            id="onlyPaths"
                            type="checkbox"
                            title="Show only the lines to the above people of interest (exept if there are none, then all lines are shown)."
                        />
                        <label
                            for="onlyPaths"
                            title="Show only the lines to the above people of interest (exept if there are none, then all lines are shown)."
                            class="right"
                        >
                            Show only lines of interest</label
                        >
                    </td>
                    <td>
                        <input
                            id="labels"
                            type="checkbox"
                            title="Do not expand a path to beyond a duplicate if a previous path already exists. Just draw a connector."
                        />
                        <label
                            for="labels"
                            title="Place node labels only to the left of nodes"
                            class="right"
                        >
                            Labels left only.</label
                        >
                    </td>
                    <td>
                        <label
                            for="tHeight"
                            title="The height of the graph. Determines the vertical distance between nodes."
                            class="left"
                        >
                            Height</label
                        >
                        <input
                            id="tHeight"
                            type="number"
                            min="100"
                            step="100"
                            value="500"
                            title="The height of the graph. Determines the vertical distance between nodes."
                        />
                    </td>
                    <td>
                        <label for="maxLevel"
                            title="The level up to which to draw the full tree (0 for all)"
                            class="left"
                        >
                            Show tree to level:</label
                        ><select id="maxLevel" title="The level up to which to draw the full tree (0 for all)">
                            <option value="0">0</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                            <option value="6">6</option>
                            <option value="7">7</option>
                            <option value="8" selected>8</option>
                            <option value="9">9</option>
                            <option value="10">10</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                            <option value="13">13</option>
                            <option value="14">14</option>
                            <option value="15">15</option>
                            <option value="16">16</option>
                            <option value="17">17</option>
                            <option value="18">18</option>
                            <option value="19">19</option>
                            <option value="20">20</option>
                        </select>
                    </td>
                </tr>
                </table>
            </fieldset>
            </div><div id="svgContainer">
                <section id="theSvg"  z-index: 500></section>
            </div>
        </div>`);

        AncestorLinesExplorer.setGetPeopleButtonText($("#generation").val());

        AncestorTree.init();

        $("#generation").on("change", function () {
            AncestorLinesExplorer.setGetPeopleButtonText($("#generation").val());
        });
        $("#getAncestorsButton").on("click", AncestorLinesExplorer.getAncestorsAndPaint);
        $("#drawTreeButton").on("click", AncestorLinesExplorer.findPathsAndDrawTree);
        $("#edgeFactor").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#drawTreeButton").click();
            }
        });
        $("#tHeight").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#drawTreeButton").click();
            }
        });
        $("#tWidth").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#drawTreeButton").click();
            }
        });

        $("#fileInput").on("change", AncestorLinesExplorer.handleFileUpload);
        $("#savePeople").click(function (e) {
            e.preventDefault();
            const fileName = AncestorLinesExplorer.makeFilename();
            AncestorLinesExplorer.saveArrayToFile(Array.from(AncestorTree.getPeople()), fileName);
        });
        $("#loadButton").click(function (e) {
            e.preventDefault();
            $("#fileInput").click();
        });

        const container = $("#theSvg");
        container.draggable({ axis: "x" });

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
        $("#getAncestorsButton").click();
    }

    static setGetPeopleButtonText(n) {
        $("#getAncestorsButton").text(`Get ${n} Generations and Draw Tree`);
    }

    static async getAncestorsAndPaint(event) {
        let wtId;
        if (
            $(wtViewRegistry.WT_ID_TEXT)
                .val()
                .match(/.+\-.+/)
        ) {
            wtId = $(wtViewRegistry.WT_ID_TEXT).val().trim();
        } else {
            return;
        }

        AncestorTree.clear();
        AncestorLinesExplorer.clearDisplay();
        AncestorLinesExplorer.showShakingTree();
        const nrGenerations = $("#generation").val();
        const theTreeRoot = await AncestorLinesExplorer.retrieveAncestorsFromWT(wtId, nrGenerations);
        AncestorLinesExplorer.hideShakingTree();
        AncestorLinesExplorer.findPathsAndDrawTree();
    }

    static findPathsAndDrawTree() {
        AncestorLinesExplorer.checkAndSetMySpecialPeople();
        const expandPaths = document.getElementById("expandPaths").checked;
        const onlyPaths = document.getElementById("onlyPaths").checked;
        const connectors = document.getElementById("connectors").checked;
        const labelsLeftOnly = document.getElementById("labels").checked;
        let fullTreelevel = document.getElementById("maxLevel").value;
        if (fullTreelevel == 0) fullTreelevel = Number.MAX_SAFE_INTEGER;
        AncestorLinesExplorer.clearDisplay();
        const otherWtIds = $("#otherWtIds")
            .val()
            .trim()
            .split(",")
            .map((s) => s.trim())
            .map((s) => s.replaceAll(" ", "_"));

        const [pathsRoot, nodes, links, pathEndpoints] = AncestorTree.findPaths(otherWtIds);
        showTree(
            AncestorTree.root,
            nodes,
            links,
            AncestorTree.duplicates,
            pathEndpoints,
            fullTreelevel,
            expandPaths,
            onlyPaths,
            connectors,
            labelsLeftOnly
        );
    }

    static async retrieveAncestorsFromWT(wtId, nrGenerations) {
        const [theTreeRoot, buildTime] = await AncestorTree.buildTreeWithGetRelatives(wtId, nrGenerations);
        // console.log("theTreeRoot", theTreeRoot);
        // console.log(`Tree, size=${Tree.getPeople().size}, buildTime=${buildTime}ms`, Tree.getPeople());
        return theTreeRoot;
    }

    static clearDisplay() {
        $("#theSvg svg").remove();
    }

    static makeFilename() {
        return (
            `Gen_${AncestorTree.maxGeneration}_${$(wtViewRegistry.WT_ID_TEXT).val().trim()}_` +
            new Date().toISOString().replace("T", "_").replaceAll(":", "-").slice(0, 19)
        );
    }

    static saveArrayToFile(array, fileName) {
        // Convert the JavaScript array to a string
        const arrayString = JSON.stringify(array);

        // Create a Blob object with the string data
        const blob = new Blob([arrayString], { type: "text/plain" });

        // Create a link element to trigger the download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;

        // Append the link to the DOM and trigger the download
        document.body.appendChild(link);
        link.click();

        // Remove the link from the DOM
        document.body.removeChild(link);
    }

    static handleFileUpload(event) {
        const file = event.target.files[0];
        if (typeof file == "undefined" || file == "") {
            return;
        }
        const reader = new FileReader();
        AncestorLinesExplorer.clearDisplay();
        AncestorLinesExplorer.showShakingTree();

        reader.onload = async function (e) {
            const contents = e.target.result;
            let people;
            try {
                people = JSON.parse(contents);
            } catch (error) {
                AncestorLinesExplorer.hideShakingTree();
                console.error(`The input file is not valid: ${error}`);
                return;
            }
            AncestorTree.replaceWith(people);
            AncestorLinesExplorer.hideShakingTree();
            $(wtViewRegistry.WT_ID_TEXT).val(AncestorTree.root.getWtId());
            $("#generation").val(AncestorTree.maxGeneration);
            AncestorLinesExplorer.setGetPeopleButtonText(AncestorTree.maxGeneration);
            AncestorLinesExplorer.findPathsAndDrawTree();
        };

        try {
            reader.readAsText(file);
        } catch (error) {
            AncestorLinesExplorer.hideShakingTree();
            console.error(`The input file is not valid: ${error}`);
        }
    }

    static showShakingTree() {
        if ($("#tree").length) {
            $("#tree").slideDown();
        } else {
            const treeGIF = $("<img id='tree' src='./views/ancestorLines/tree.gif'>");
            treeGIF.appendTo("#buttonBlock");
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "100px",
                "width": "100px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
            });
        }
    }

    static hideShakingTree() {
        $("#tree").slideUp();
    }

    static checkAndSetMySpecialPeople() {
        const myWtId = "Smit-641";
        const smitOtherWtIds = [
            "Goringhaikona-1",
            "Van Angola-11",
            "Van Bengale-1",
            "Van Malbaar-1",
            "Van Malabar-16",
            "Van Mombasa-1",
            "Van Negapatnam-2",
            "Van Palicatte-2",
            "Van Samboua-1",
            "Van Timor-1",
        ];

        if ($(wtViewRegistry.WT_ID_TEXT).val() == myWtId && !$("#otherWtIds").val().length) {
            $("#otherWtIds").val(smitOtherWtIds.join(","));
            document.getElementById("onlyPaths").checked = true;
        }
    }
}
