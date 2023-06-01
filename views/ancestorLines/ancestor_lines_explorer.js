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
            appears at more than one generation (i.e. level in the tree).
        </p>
        <ul>
            <li>
                People that appear more than once in the tree are marked with a coloured square.
            </li><li>
                If you click on a coloured square, all the other occurrences of that person, as well as the lines to them,
                are highlighted. Click the square again to remove the highlights.
            </li><li>
                You can collapse (hide) branches of the tree by clicking on any circle that is coloured in white.
            </li><li>
                You can expand the tree by clicking on any circle that is coloured in steel-blue.
            </li><li>
                Click on the name of a person to open a new tab with that person's Wikitree Profile.
            </li><li>
                If you hover your pointer over the cricle (or square) associted with a person, the birth- and death date
                and location of that person is displayed.
            </li><li>
                If the 'Connectors' checkbox is ticked, a tree line will not be extended to beyond a duplicate person if
                there is already a line containing this person.
            </li><li>
                If the 'Labels left only' box is ticked, people's names will only appear to the left of the circle that
                represents them. Otherwise, if a tree branch has not been hidden (see below) and there are no ancestors
                to show for a person (i.e. their circle is coloured white), the name will appear to the right of the circle.
            </li><li>
                Changing any of the options only takes effect when '(Re-)Draw Tree' or 'Go' is clicked.
            </li>
        </ul>
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
        <p>
            The size of the drawn tree is determined by the data, but also by the 3 controls below. You can fine tune the
            tree layout by adjusting these parameters.
        </p>
        <ul>
            <li>
                The <b>Edge Factor</b> controls the horizontal distance between generations: the smaller the number, the
                closer the generations are on the horizontal axis.
            </li><li>
                The <b>Height Factor</b> controls the vertical distance between people at the same level in the tree.
                The larger the number, the further apart they are on the vertical axis.
            </li><li>
                The <b>Show tree to level</b> value determines how many generations of the tree will be shown with all
                the people available and not just those directly connected to a person of interest. If you set this
                value to 0,the complete tree will be shown (subject to the setting of the other parameters).
            </li>
        </ul>
        <p>
            If you find problems with this app or have suggestions for improvements, please
            <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Smit-641" , target="_blank"
            >let me know</a>.
        </p>
        <p>You can double click in this box, or click the X in the top right corner to remove this About text.</p>
   `;

    constructor(selector, startId) {
        this.selector = selector;
        $(selector).html(`<div id="aleContainer" class="ale">
            <div id="controlBlock">
              <label for="generation">Max Generations:</label
              ><select id="generation" title="The number of generations to retrieve">
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5" selected>5</option>
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
                Get 11 Generations and Draw Tree</button
              ><button
                id="savePeople"
                title="Save the currently loaded data to a file for faster loading in future."
                class="small button">
                Save</button
              ><button id="loadButton" class="small button" title="Load a previously saved data file and draw its tree.">
                Load a File</button
              ><input id="fileInput" type="file" style="display: none" /><button
                id="drawTreeButton"
                class="small button"
                title="Draw the tree, highlighting paths to the people of interest">
                (Re-)Draw Tree
              </button>
              <span id="help-button" title="About this">?</span>
              <div id="help-text">${AncestorLinesExplorer.#helpText}</div>
              <br />
              <label for="otherWtIds">People of Interest:</label>
              <input
                id="otherWtIds"
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
                        title="Ignore the 'Show tree to level' setting when drawing the lines to the above people of interest." />
                      <label
                        for="expandPaths"
                        title="Ignore the 'Show tree to level' setting when drawing the lines to the above people of interest."
                        class="right">
                        Fully expand lines of interest</label
                      >
                    </td>
                    <td>
                      <input
                        id="connectors"
                        type="checkbox"
                        title="Do not expand a path to beyond a duplicate if a previous path already exists. Just draw a connector." />
                      <label
                        for="connectors"
                        title="Do not expand a path to beyond a duplicate if a previous path already exists. Just draw a connector."
                        class="right">
                        Connectors.</label
                      >
                    </td>
                    <td>
                      <label for="edgeFactor" title="Determines the horizontal distance between generations." class="left">
                        Edge Factor</label
                      >
                      <input
                        id="edgeFactor"
                        type="number"
                        value="180"
                        step="10"
                        title="Determines the horizontal distance between generations." />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <input
                        id="onlyPaths"
                        type="checkbox"
                        title="Show only the lines to the above people of interest (exept if there are none, then all lines are shown)." />
                      <label
                        for="onlyPaths"
                        title="Show only the lines to the above people of interest (exept if there are none, then all lines are shown)."
                        class="right">
                        Show only lines of interest</label
                      >
                    </td>
                    <td>
                      <input
                        id="labels"
                        type="checkbox"
                        checked
                        title="Place people's names only to the left of the circle representing them. Otherwise people with no ancestors to show have their names to the right." />
                      <label
                        for="labels"
                        title="Place people's names only to the left of the circle representing them. Otherwise people with no ancestors to show have their names to the right."
                        class="right">
                        Labels left only.</label
                      >
                    </td>
                    <td>
                      <label for="tHFactor" title="Determines the display height of the tree." class="left"> Height Factor</label>
                      <input id="tHFactor" type="number" min="1" value="34" title="Determines the display height of the tree." />
                    </td>
                    <td>
                      <label for="maxLevel" title="The level up to which to draw the full tree (0 for all)." class="left">
                        Show tree to level:</label
                      ><select id="maxLevel" title="The level up to which to draw the full tree (0 for all).">
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
            </div>
            <div id="svgContainer">
              <section id="theSvg"></section>
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
        $("#tHFactor").keyup(function (e) {
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

    static nrGenerationsToRetrieve() {
        const nrGenerations = $("#generation").val();
        if (nrGenerations > 1) {
            return nrGenerations - 1;
        }
        return 4;
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
        await AncestorLinesExplorer.retrieveAncestorsFromWT(wtId, nrGenerations);
        AncestorLinesExplorer.hideShakingTree();
        AncestorLinesExplorer.findPathsAndDrawTree(event);
    }

    static findPathsAndDrawTree(event) {
        if (event.shiftKey) {
            AncestorLinesExplorer.setEarlySaAfricaIndiaIds();
        }
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
            .map((s) => s.replaceAll(" ", "_"))
            .filter((s) => s.length > 0);

        const [pathsRoot, nodes, links, pathEndpoints, pathGens] = AncestorTree.findPaths(otherWtIds);
        showTree(
            AncestorTree,
            nodes,
            links,
            pathEndpoints,
            pathGens,
            fullTreelevel,
            expandPaths,
            onlyPaths && links.size != 0, // If we have no lines of interest, don't only show them
            connectors,
            labelsLeftOnly
        );
    }

    static async retrieveAncestorsFromWT(wtId, nrGenerations) {
        const treeDepth = nrGenerations > 1 ? nrGenerations - 1 : 4;
        const [theTreeRoot, buildTime] = await AncestorTree.buildTreeWithGetRelatives(wtId, treeDepth);
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
            AncestorLinesExplorer.findPathsAndDrawTree(event);
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
            treeGIF.prependTo("#svgContainer");
            $("#tree").css({
                "display": "block",
                "margin": "auto",
                "height": "100px",
                "width": "100px",
                "border-radius": "50%",
                "border": "3px solid forestgreen",
                "position": "relative",
                "top": "0",
            });
        }
    }

    static hideShakingTree() {
        $("#tree").slideUp();
    }

    static setEarlySaAfricaIndiaIds() {
        // The below is just a selection, there are many more
        const earlySaAfricaAsiaIds = [
            "Goringhaikona-1",
            "Van Angola-11",
            "Van Bengale-1",
            "Van de_Caap-61",
            "Van Malbaar-1",
            "Van Malabar-16",
            "Van Mombasa-1",
            "Van Negapatnam-2",
            "Van Palicatte-2",
            "Van Samboua-1",
            "Van Timor-1",
        ];

        if (!$("#otherWtIds").val().length) {
            $("#otherWtIds").val(earlySaAfricaAsiaIds.join(","));
        }
    }
}
