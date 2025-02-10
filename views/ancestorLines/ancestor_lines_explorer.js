import { AncestorTree } from "./ancestor_tree.js";
import { showTree } from "./display.js";
import { Utils } from "../shared/Utils.js";
import { spell } from "../../lib/utilities.js";

export class AncestorLinesExplorer {
    static #COOKIE_NAME = "wt_ale_options";
    static #helpText = `
        <xx>[ x ]</xx>
        <h2 style="text-align: center">About Ancestor Line Explorer</h2>
        <p>
            Use this application to load the direct ancestors (up to 'Max Generations') of the person identified in the
            start profile and draw their family tree up to the specified tree level. Although one might have specified N
            generations to be retrieved, the maximum level of the tree might be at more than N generations if an ancestor
            appears at more than one generation (i.e. level in the tree).
        </p><p>
            <em><b>Warning</b>: A "full" (or complete) ancesstor tree of 15 generations or higher (e.g. for Windsor-1)
            WILL take a long time to retrieve and an even longer time to draw (a 15 generation tree can contain 32768 people).
            It may even crash your browser.
            It is possible, however, to retrieve 20 generations of trees that are relatively sparse in the older
            generations.</em> The more generations are requested in a load, the longer it may take, so please be patient.
            Once loaded, you can save the data locally to your device and re-load it much faster later.
        </p>
        <h3>Display and Interaction</h3>
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
                If you shift-click on a steel-blue circle in the highest generation of the tree, it will expand that branch
                to the full extent of the available data.
            </li><li>
                Click on the name of a person to open a new tab with that person's Wikitree Profile.
            </li><li>
                If you hover your pointer over a person, the birth- and death date and location of that person is displayed.
            </li><li>
                The names of people marked as a <b>Brick Wall</b> (see below) are displayed in the selected colour.
            </li>
        </ul>
        <h3>Options</h3>
        <ul>
            <li>
                If the <b>Connectors</b> checkbox is ticked, a tree line will not be extended to beyond a duplicate
                person if there is already a line containing this person.
            </li><li>
                If the <b>Labels left only</b> box is ticked, people's names will only appear to the left of the circle
                that represents them. Otherwise, if a tree branch has not been hidden (see below) and there are no ancestors
                to show for a person (i.e. their circle is coloured white), the name will appear to the right of the circle.
            </li><li>
                The table has a header labeling each generation. This can be removed via the <b>Hide tree header</b>
                checkbox.
            </li><li>
                If the <b>Position relative to birth year</b> box is ticked, people in the same generation are not aligned
                vertically, but they are positioned according to ther years of birth. Everyone born in the same year, will
                be aligned. Those with an unknown year of birth wil be placed in an average position for that generation.
            </li><li>
                The <b>Brick wall colour</b> determines, by default, in which colour the names of people with no ancestors on
                record are displayed. The default is black, i.e. they will be displayed like everyone else. If you want to
                distinguish them, choose another colour. You can control who is regarded as a "brick wall" by selecting the
                approriate options in the <b>Add to Brick Wall</b> section.
            </li><li>
                If you inlcude <b>Bio Check</b> as a brick wall option, not only are profiles with Bio Check issues displayed in
                the selected colour, but you can also see the Bio Check report by alt-clicking in their circle.
            </li><li>
                The size of the drawn tree is determined by the data, but also by the 3 controls below. You can fine tune the
                tree layout by adjusting these parameters.
                <ul>
                  <li>
                      The <b>Edge Factor</b> controls the horizontal distance between generations: the smaller the number,
                      the closer the generations are on the horizontal axis.
                  </li><li>
                      The <b>Height Factor</b> controls the vertical distance between people at the same level in the tree.
                      The larger the number, the further apart they are on the vertical axis.
                  </li><li>
                      The <b>Limit display to generation</b> value determines how many generations of the tree will be
                      shown with all the people available rather than just those directly connected to a person of
                      interest. If you select 'All',the complete tree will be shown (subject to the setting of the other
                      parameters).
                  </li>
                </ul>
            </li><li>
                You can limit the display of names and dates/location of private profiles and/or living people by selecting
                any of the following:
                <ul>
                  <li>
                      <b>${spell("Privatize")}</b> will obey the
                      <a href="https://www.wikitree.com/wiki/Help:Privacy" target="_blank">privacy settings</a>
                      when displaying names and dates, even if you are on the trusted list.
                  </li><li>
                      <b>${spell("Anonymize the living")}</b> will not display the name of any living person, and
                      wil not show their birth or death dates or location.
                </ul>
            </li><li>
                Changes to checkbox options only take effect when <b>(Re-)Draw Tree</b> or <b>Go</b> is clicked. A colour
                change takes effect immediately, while the remaining options can be applied immediatly by pressing enter
                after any of them was changed.
            </li><li>
                The list of options can be hidden by clicking on the <b>Options</b> label.
            </li>
        </ul>
        <p>
            If you provide a list of comma-separated WikiTree IDs in the <b>People of Interest</b> field, all the lines to
            those ancestors (if they are in the tree) will be highlighted. You can choose if these lines should be drawn in
            full, or whether they should also stop at the tree level specified. Separately you can specify whether or not only
            these "lines of interest" should be displayed or not.
        </p><p>
            If you find problems with this app or have suggestions for improvements, please
            <a style="color: navy; text-decoration: none" href="https://www.wikitree.com/wiki/Smit-641" target="_blank"
            >let me know</a>.
        </p><p>
            You can double click in this box, or press ESC, or click the X in the top right corner to remove this About text.
        </p>
   `;
    static nextZLevel = 10000;

    constructor(selector, startId, params) {
        this.selector = selector;
        $(selector).html(`<div id="aleContainer" class="ale">
            <div id="controlBlock" class="ale-not-printable">
              <label for="generation"  title="The number of generations to fetch from WikiTree">Max Generations:</label
              ><select id="generation" title="The number of generations to fetch from WikiTree">
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
              <button id="getAncestorsButton" class="btn btn-primary btn-sm" title="Get ancestor data up to this generation from WikiTree">
                Get 11 Generations and Draw Tree</button
              ><button
                id="savePeople"
                title="Save the currently loaded data to a file for faster loading in future."
                class="btn btn-secondary btn-sm">
                Save</button
              ><button id="loadButton" class="btn btn-secondary btn-sm"
                title="Load a previously saved data file and draw its tree.">
                Load a File</button
              ><button id="help-button" class="btn btn-secondary btn-sm" title="About this application.">
                <b>?</b></button
              ><input id="fileInput" type="file" style="display: none" />
              <div id="help-text">${AncestorLinesExplorer.#helpText}</div>
              <br />
              <fieldset id="aleFieldset">
                <legend id="aleOptions" title="Click to Close/Open the options">Options - click here to close/open</legend>
                <table id="optionsTbl" class="table-borderless">
                  <tr>
                    <td colspan="5">
                      <label for="otherWtIds" title="Identify people of interest that need to be highlighted in the tree.">
                        People of Interest:</label
                      ><input
                        id="otherWtIds"
                        type="text"
                        placeholder="(Optional) Enter comma-separated WikiTree IDs"
                        size="110"
                        title="Identify people of interest that need to be highlighted in the tree." />
                    </td>
                  </tr>
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
                        Connectors</label
                      >
                    </td>
                    <td>
                      <input
                        id="hideTreeHeader"
                        type="checkbox"
                        title="Remove the Parents, Grandparents, etc header above the tree." />
                      <label
                        for="hideTreeHeader"
                        title="Remove the Parents, Grandparents, etc header above the tree."
                        class="right">
                        Hide tree header</label
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
                    <td align="right">
                      <button
                        id="drawTreeButton"
                        class="btn btn-primary btn-sm"
                        title="Draw the tree, highlighting paths to the people of interest">
                        (Re-)Draw Tree
                      </button>
                    </rd>
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
                        id="labelsLeft"
                        type="checkbox"
                        checked
                        title="Place people's names only to the left of the circle representing them. Otherwise people with no ancestors to show have their names to the right." />
                      <label
                        for="labelsLeft"
                        title="Place people's names only to the left of the circle representing them. Otherwise people with no ancestors to show have their names to the right."
                        class="right">
                        Labels left only</label
                      >
                    </td>
                    <td>
                      <label
                        for="aleBrickWallColour"
                        title='Choose the colour for people categorised as a "brick wall".'
                        class="left">
                        Brick wall colour</label
                      >
                      <input
                        id="aleBrickWallColour"
                        type="color"
                        value="#FF0000"
                        title='Choose the colour for people chosen as a "brick wall".' />
                    </td>
                    <td>
                      <label for="tHFactor" title="Determines the display height of the tree." class="left"> Height Factor</label>
                      <input id="tHFactor" type="number" min="1" value="34" title="Determines the display height of the tree." />
                    </td>
                    <td>
                      <label for="maxLevel" title="The tree will be drawn with only this number of generations.">
                        Limit display to generation:</label
                      ><select id="maxLevel" title="The tree will be drawn with only this number of generations.">
                        <option value="0">All</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5" selected>5</option>
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <input
                        id="birthScale"
                        type="checkbox"
                        title="Position people along the horizontal tree axis relative to their year of birth." />
                      <label
                        for="birthScale"
                        title="Position people along the horizontal tree axis relative to their year of birth."
                        class="right">
                        Position relative to birth year</label
                      >
                    </td>
                    <td colspan=4 rowspan=2>
                    <fieldset><legend title='Set what constitutes a "brick wall."'>Add to Brick Wall:</legend>
                    <table class="table-borderless">
                      <tr>
                        <td>
                          <input
                            id="noParents"
                            type="checkbox"
                            checked
                            title="Anyone with no parents." />
                          <label
                            for="noParents"
                            title="Anyone with no parents."
                            class="right">
                            No Parents [<span class="cnt" title="Number of profiles with no parent">?</span>]</label
                          >
                          </td>
                        <td>
                          <input
                            id="oneParent"
                            type="checkbox"
                            title="Anyone with only one parent." />
                          <label
                            for="oneParent"
                            title="Anyone with only one parent."
                            class="right">
                            Only 1 Parent [<span class="cnt" title="Number of profiles with only one parent">?</span>]</label
                          >
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td>
                          <input
                            id="bioCheck"
                            type="checkbox"
                            title="Anyone with only one parent." />
                          <label
                            for="bioCheck"
                            title="Anyone with issues reported by Bio Check."
                            class="right">
                            Bio Check [<span class="cnt" title="Number of profiles with Bio Check Issues">?</span>]</label
                          >
                        </td>
                        <td>
                          <input
                            id="noNoSpouses"
                            type="checkbox"
                            title='Anyone who does not have their "No more spouses" checkbox set.' />
                          <label
                            for="noNoSpouses"
                            title='Anyone who does not have their "No more spouses" checkbox set.'
                            class="right">
                            No "no more spouses" [<span class="cnt" title='Number of profiles with "No more spouses" not checked'>?</span>]</label
                          >
                        </td>
                        <td>
                          <input
                            id="noNoChildren"
                            type="checkbox"
                            title='Anyone who does not have their "No more children" checkbox set.' />
                          <label
                            for="noNoChildren"
                            title='Anyone who does not have their "No more children" checkbox set.'
                            class="right">
                            No "no more children" [<span class="cnt" title='Number of profiles with "No more children" not checked'>?</span>]</label
                          >
                        </td>
                      </tr>
                    </table></fieldset>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <input
                        id="privatise"
                        type="checkbox"
                        title="Obey privacy settings when displaying names and dates, even if you are on the trusted list." />
                      <label
                        for="privatise"
                        title="Obey privacy settings when displaying names and dates, even if you are on the trusted list."
                        class="right">
                        ${spell("Privatize")}</label
                      >
                      <input
                        id="anonLiving"
                        type="checkbox"
                        title="Anonymize names of living people and remove their dates and places." />
                      <label
                        for="anonLiving"
                        title="Anonymize names of living people and remove their dates and places."
                        class="right">
                        ${spell("Anonymize")} the living</label
                      >
                    </td>
                  </tr>
                </table>
              </fieldset>
              <div class="floating-button-div" style="position: fixed; bottom: 20px; left: 20px;">
                <button id="slideLeft" title="Scroll left" class="small button">&larr;</button>
                <button id="slideRight" title="Scroll right" class="small button">&rarr;</button>
              </div>
            </div>
            <div id="svgContainer" class="ale-printable">
              <section id="theSvg"></section>
            </div>
        </div>`);

        AncestorLinesExplorer.updateMaxLevelSelection(20, 5);
        AncestorLinesExplorer.retrieveOptionsFromCookie();
        AncestorLinesExplorer.applyParameters(params);

        AncestorTree.init();

        $("#generation")
            .off("change")
            .on("change", function () {
                const maxGen = $("#generation").val();
                AncestorLinesExplorer.setGetPeopleButtonText(maxGen);
                AncestorLinesExplorer.updateMaxLevelSelection(maxGen, $("#maxLevel").val());
            });
        $("#generation").trigger("change");

        $("#getAncestorsButton").off("click").on("click", AncestorLinesExplorer.getAncestorsAndPaint);
        $("#drawTreeButton")
            .off("click")
            .on("click", function (e) {
                if (document.getElementById("bioCheck").checked && !window.aleBiosLoaded) {
                    AncestorLinesExplorer.getAncestorsAndPaint(e);
                } else {
                    AncestorLinesExplorer.updateURL();
                    AncestorLinesExplorer.findPathsAndDrawTree(e);
                }
            });
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

        $("#fileInput").off("change").on("change", AncestorLinesExplorer.handleFileUpload);
        $("#savePeople")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                const fileName = AncestorLinesExplorer.makeFilename();
                AncestorLinesExplorer.saveArrayToFile(AncestorTree.toArray(), fileName);
            });
        $("#loadButton")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                $("#fileInput").click();
            });
        $("#aleOptions")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                $("#optionsTbl").slideToggle();
            });
        $("#aleBrickWallColour")
            .off("change")
            .on("change", function () {
                $("#drawTreeButton").click();
            });

        const container = $("#theSvg");
        container.floatingScroll();
        $("#slideLeft")
            .off("click")
            .on("click", function (event) {
                event.preventDefault();
                container.animate(
                    {
                        scrollLeft: "-=300px",
                    },
                    "fast"
                );
            });
        $("#slideRight")
            .off("click")
            .on("click", function (event) {
                event.preventDefault();
                container.animate(
                    {
                        scrollLeft: "+=300px",
                    },
                    "fast"
                );
            });

        if (typeof window.aleShowingInfo === "undefined") {
            window.aleShowingInfo = true;
        } else if (!window.aleShowingInfo) {
            wtViewRegistry.hideInfoPanel();
            window.aleShowingInfo = false;
        }

        // Add click action to help button
        $("#help-button")
            .off("click")
            .on("click", function () {
                if (window.aleShowingInfo) {
                    wtViewRegistry.hideInfoPanel();
                    window.aleShowingInfo = false;
                }
                $("#help-text").slideToggle();
            });
        $("#help-text").draggable();

        // Add the help text as a pop-up
        $("#help-text")
            .off("dblclick")
            .on("dblclick", function () {
                $(this).slideToggle();
            });
        $("#help-text xx")
            .off("click")
            .on("click", function () {
                $(this).parent().slideUp();
            });
        $(document).off("keyup", AncestorLinesExplorer.closePopUp).on("keyup", AncestorLinesExplorer.closePopUp);
        $("#getAncestorsButton").click();
    }

    static applyParameters(params) {
        const maxGen = Number(params["maxgen"] || 0);
        if (maxGen) $("#generation").val(maxGen);

        const limitGen = Number(params["limitgen"] || maxGen);
        if (limitGen) $("#maxLevel").val(limitGen);

        if (params.hasOwnProperty("poi")) {
            $("#otherWtIds").val(params["poi"]);
        }
        if (params.hasOwnProperty("efactor")) {
            $("#edgeFactor").val(Number(params["efactor"]));
        }
        if (params.hasOwnProperty("hfactor")) {
            $("#tHFactor").val(Number(params["hfactor"]));
        }
        if (params.hasOwnProperty("bwcolour")) {
            $("#aleBrickWallColour").val(params["bwcolour"].trim().split(" ")[0]);
        }

        if (params.hasOwnProperty("exploi")) {
            $("#expandPaths").prop("checked", Number(params["exploi"]) != 0);
        }
        if (params.hasOwnProperty("conn")) {
            $("#connectors").prop("checked", Number(params["conn"]) != 0);
        }
        if (params.hasOwnProperty("onlyloi")) {
            $("#onlyPaths").prop("checked", Number(params["onlyloi"]) != 0);
        }
        if (params.hasOwnProperty("lonly")) {
            $("#labelsLeft").prop("checked", Number(params["lonly"]) != 0);
        }
        if (params.hasOwnProperty("posrel")) {
            $("#birthScale").prop("checked", Number(params["posrel"]) != 0);
        }
        if (params.hasOwnProperty("priv")) {
            $("#privatise").prop("checked", Number(params["priv"]) != 0);
        }
        if (params.hasOwnProperty("anon")) {
            $("#anonLiving").prop("checked", Number(params["anon"]) != 0);
        }
        if (params.hasOwnProperty("bwnop")) {
            $("#noParents").prop("checked", Number(params["bwnop"]) != 0);
        }
        if (params.hasOwnProperty("bw1p")) {
            $("#oneParent").prop("checked", Number(params["bw1p"]) != 0);
        }
        if (params.hasOwnProperty("bwbio")) {
            $("#bioCheck").prop("checked", Number(params["bwbio"]) != 0);
        }
        if (params.hasOwnProperty("bwnosp")) {
            $("#noNoSpouses").prop("checked", Number(params["bwnosp"]) != 0);
        }
        if (params.hasOwnProperty("bwnoch")) {
            $("#noNoChildren").prop("checked", Number(params["bwnoch"]) != 0);
        }
    }

    static updateURL() {
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.hash.slice(1));
        const oldHash = params.toString();
        const wtId = wtViewRegistry.getCurrentWtId();

        params.set("name", wtId);
        params.set("maxgen", $("#generation").val());
        params.set("limitgen", $("#maxLevel").val());
        params.set("poi", $("#otherWtIds").val());
        params.set("efactor", $("#edgeFactor").val());
        params.set("hfactor", $("#tHFactor").val());
        params.set("bwcolour", $("#aleBrickWallColour").val());

        params.set("exploi", $("#expandPaths").prop("checked") ? 1 : 0);
        params.set("conn", $("#connectors").prop("checked") ? 1 : 0);
        params.set("onlyloi", $("#onlyPaths").prop("checked") ? 1 : 0);
        params.set("lonly", $("#labelsLeft").prop("checked") ? 1 : 0);
        params.set("posrel", $("#birthScale").prop("checked") ? 1 : 0);
        params.set("priv", $("#privatise").prop("checked") ? 1 : 0);
        params.set("anon", $("#anonLiving").prop("checked") ? 1 : 0);
        params.set("bwnop", $("#noParents").prop("checked") ? 1 : 0);
        params.set("bw1p", $("#oneParent").prop("checked") ? 1 : 0);
        params.set("bwbio", $("#bioCheck").prop("checked") ? 1 : 0);
        params.set("bwnosp", $("#noNoSpouses").prop("checked") ? 1 : 0);
        params.set("bwnoch", $("#noNoChildren").prop("checked") ? 1 : 0);

        const newHash = params.toString();
        if (newHash != oldHash) {
            window.history.pushState(null, null, "#" + newHash);
        }
    }

    static updateMaxLevelSelection(maxLevel, selected) {
        const select = document.getElementById("maxLevel");
        select.options.length = 0;
        for (let i = 0; i <= maxLevel; ++i) {
            select.options[i] = new Option(`${i == 0 ? "All" : i}`, i, i == 5, i == selected);
        }
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

    static closePopUp(e) {
        if (e.key === "Escape") {
            // Find the popup with the highest z-index
            let highestZIndex = 0;
            let lastPopup = null;
            $(".bioReport:visible, #help-text:visible").each(function () {
                const zIndex = parseInt($(this).css("z-index"), 10);
                if (zIndex > highestZIndex) {
                    highestZIndex = zIndex;
                    lastPopup = $(this);
                }
            });

            // Close the popup with the highest z-index
            if (lastPopup) {
                AncestorLinesExplorer.nextZLevel = highestZIndex;
                lastPopup.slideUp();
            }
        }
    }

    static async getAncestorsAndPaint(event) {
        const wtId = wtViewRegistry.getCurrentWtId();
        if (!wtId.match(/.+\-.+/)) {
            return;
        }
        AncestorLinesExplorer.updateURL();

        AncestorTree.clear();
        wtViewRegistry.clearStatus();
        AncestorLinesExplorer.clearDisplay();
        Utils.showShakingTree("controlBlock");
        const nrGenerations = $("#generation").val();
        const theRoot = await AncestorLinesExplorer.retrieveAncestorsFromWT(wtId, nrGenerations);
        Utils.hideShakingTree();
        if (theRoot) {
            AncestorLinesExplorer.findPathsAndDrawTree(event);
        }
    }

    static findPathsAndDrawTree(event) {
        const validSelectedMaxLevel = Math.min(document.getElementById("maxLevel").value, AncestorTree.maxGeneration);
        AncestorLinesExplorer.updateMaxLevelSelection(AncestorTree.maxGeneration, validSelectedMaxLevel);
        if (event.shiftKey) {
            AncestorLinesExplorer.setEarlySaAfricaIndiaIds();
        }
        AncestorLinesExplorer.saveOptionCookies();

        const gen = $("#generation").val();
        const maxNrPeople = 2 ** gen - 2;
        const nrAncestorProfiles = AncestorTree.profileCount - 1;
        const nrDuplicates = AncestorTree.nrDuplicatesUpToGen(gen);
        $("#aleFieldset .report").remove();
        $("#aleFieldset").append(
            `<span class="report">Out of ${maxNrPeople} possible direct ancestors in ${gen} generations, ${nrAncestorProfiles} (${(
                (nrAncestorProfiles / maxNrPeople) *
                100
            ).toFixed(2)}%) have WikiTree profiles and out of them, ${nrDuplicates} (${(
                (nrDuplicates / nrAncestorProfiles) *
                100
            ).toFixed(2)}%) occur more than once due to pedigree collapse.</span>`
        );

        const counts = AncestorTree.markAndCountBricks({
            noParents: document.getElementById("noParents").checked,
            oneParent: document.getElementById("oneParent").checked,
            noNoSpouses: document.getElementById("noNoSpouses").checked,
            noNoChildren: document.getElementById("noNoChildren").checked,
            bioCheck: document.getElementById("bioCheck").checked,
        });

        for (const id of ["noParents", "oneParent", "noNoSpouses", "noNoChildren", "bioCheck"]) {
            $(`label[for=${id}`).find("span.cnt").text(counts[id]);
        }

        const expandPaths = document.getElementById("expandPaths").checked;
        const onlyPaths = document.getElementById("onlyPaths").checked;
        const connectors = document.getElementById("connectors").checked;
        const hideTreeHeader = document.getElementById("hideTreeHeader").checked;
        const labelsLeftOnly = document.getElementById("labelsLeft").checked;
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
            hideTreeHeader,
            labelsLeftOnly
        );
        $("#theSvg").floatingScroll("update");
    }

    static async retrieveAncestorsFromWT(wtId, nrGenerations) {
        window.aleBiosLoaded = document.getElementById("bioCheck").checked;
        const treeDepth = nrGenerations > 1 ? nrGenerations - 1 : 4;
        const [theTreeRoot, buildTime] = await AncestorTree.buildTreeWithGetPeople(
            wtId,
            treeDepth,
            window.aleBiosLoaded
        );
        // console.log("theTreeRoot", theTreeRoot);
        console.log(`Tree size=${AncestorTree.getPeople().size}, buildTime=${buildTime}ms`);
        return theTreeRoot;
    }

    static clearDisplay() {
        $("#theSvg svg").remove();
        $("#theSvg .treeHeader").remove();
    }

    static makeFilename() {
        return (
            `Gen_${AncestorTree.maxGeneration}_${wtViewRegistry.getCurrentWtId()}_` +
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
        wtViewRegistry.clearStatus();
        AncestorLinesExplorer.clearDisplay();
        Utils.showShakingTree("controlBlock");

        const reader = new FileReader();
        reader.onload = async function (e) {
            const contents = e.target.result;
            let people;
            try {
                people = JSON.parse(contents);
            } catch (error) {
                Utils.hideShakingTree();
                console.error(`The input file is not valid: ${error}`);
                return;
            }
            AncestorTree.replaceWith(people);
            Utils.hideShakingTree();
            $(wtViewRegistry.WT_ID_TEXT).val(AncestorTree.root.getWtId());
            const maxGen = Math.min(AncestorTree.maxGeneration, 20);
            $("#generation").val(maxGen);
            AncestorLinesExplorer.setGetPeopleButtonText(maxGen);
            AncestorLinesExplorer.findPathsAndDrawTree(event);
        };

        try {
            reader.readAsText(file);
        } catch (error) {
            Utils.hideShakingTree();
            console.error(`The input file is not valid: ${error}`);
        }
    }

    static saveOptionCookies() {
        const options = {
            expandPaths: document.getElementById("expandPaths").checked,
            onlyPaths: document.getElementById("onlyPaths").checked,
            connectors: document.getElementById("connectors").checked,
            labelsLeftOnly: document.getElementById("labelsLeft").checked,
            hideTreeHeader: document.getElementById("hideTreeHeader").checked,
            brickWallColour: document.getElementById("aleBrickWallColour").value,
            edgeFactor: document.getElementById("edgeFactor").value,
            heightFactor: document.getElementById("tHFactor").value,
            maxLevel: document.getElementById("maxLevel").value,
            otherWtIds: document.getElementById("otherWtIds").value,
            noParents: document.getElementById("noParents").checked,
            oneParent: document.getElementById("oneParent").checked,
            noNoSpouses: document.getElementById("noNoSpouses").checked,
            noNoChildren: document.getElementById("noNoChildren").checked,
            bioCheck: document.getElementById("bioCheck").checked,
            birthScale: document.getElementById("birthScale").checked,
            privatise: document.getElementById("privatise").checked,
            anonLiving: document.getElementById("anonLiving").checked,
        };
        // console.log(`Saving options ${JSON.stringify(options)}`);
        Utils.setCookie(AncestorLinesExplorer.#COOKIE_NAME, JSON.stringify(options));
    }

    static retrieveOptionsFromCookie() {
        const optionsJson = Utils.getCookie(AncestorLinesExplorer.#COOKIE_NAME);
        // console.log(`Retrieved options ${optionsJson}`);
        if (optionsJson) {
            const opt = JSON.parse(optionsJson);
            $("#expandPaths").prop("checked", opt.expandPaths);
            $("#onlyPaths").prop("checked", opt.onlyPaths);
            $("#connectors").prop("checked", opt.connectors);
            $("#labelsLeft").prop("checked", opt.labelsLeftOnly);
            $("#hideTreeHeader").prop("checked", opt.hideTreeHeader);
            $("#aleBrickWallColour").val(opt.brickWallColour);
            $("#edgeFactor").val(opt.edgeFactor);
            $("#tHFactor").val(opt.heightFactor);
            $("#maxLevel").val(opt.maxLevel);
            $("#otherWtIds").val(opt.otherWtIds);
            $("#noParents").prop("checked", opt.noParents);
            $("#oneParent").prop("checked", opt.oneParent);
            $("#noNoSpouses").prop("checked", opt.noNoSpouses);
            $("#noNoChildren").prop("checked", opt.noNoChildren);
            $("#bioCheck").prop("checked", opt.bioCheck);
            $("#birthScale").prop("checked", opt.birthScale);
            $("#privatise").prop("checked", opt.privatise);
            $("#anonLiving").prop("checked", opt.anonLiving);
        }
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
