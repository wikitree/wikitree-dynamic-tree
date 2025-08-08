/*
 * This code was adpated from compactCoupleTree.js
 * We use the D3.js library to render the graph.
 *
 * The code currently makes use of getPerson API calls. Call counts come down to about one call per person being displayed
 * (in their own little box) plus one for each of their other spouses. This is regardless of whether it is for the initial
 * display, or when the tree is being expanded - every new person "in a box" requires an API call. Children that only
 * appear in drop-down lists do not need their own calls. They'll only need a call when they appear in their own box.
 * The opening display can therefore result in about 20 to 40 getPerson calls for a large family and 10 for a family
 * with 2 married children and 2 sets of grand-parents.
 *
 * At a high level it seems straight-forward to replace these calls with one or two getPerson calls, but when you dig
 * deeper, it gets complicated. None of the current api calls that retrieve more than one profile's data in one call, is
 * (imho) a good fit to give one everything one needs when retrieving more than one profile for the couples tree. The
 * reason for this is that one needs spousal and children data of the relatives.
 *
 * The result is that managing what you need to call when, in order to add the missing information that you did not get
 * the first time, becomes tricky. I think the current solution is a good one if you ignore the number of calls. However,
 * I don't think the latter is excessive. All people are cached, so there should be at most one call for any person added.
 * Sometimes a person is added as result of someone else's call and then, depending on where the user clicks, we might
 * have to make a call again for that person (to get info on relatives), but that will only happen once, if at all.
 * Since we are doing this at user click frequency, we should be ok as far as API call limits are concerned.  I might
 * be wrong, but unless there is compelling evidence for the need to reduce the number calls, I don't think it is
 * worthwhile to attempt it. You are welcome to prove me wrong, but you do it. :)  [Riël Smit, 4 Sep 2023]
 */

import { CachedPerson } from "../couplesTree/cached_person.js";
import { Couple } from "../compactCouplesTree/couple.js";
import { showTree, sortByBirthDate } from "./display.js";
import { Utils } from "../shared/Utils.js";
import { spell } from "../../lib/utilities.js";
import { Ancestors } from "./ancestors.js";

/**
 * Compact Couples Descendants Explorer
 */
export class CCDE {
    // if addTestInfo is true, a person's (integer) id is displayed in their person box (to assist with reading
    // the debug logs) and, if debug logging is on (see index.html), the Person object is logged to the console
    // whenever one clicks in a person box (i.e. when the person pop-up is generated).
    static addTestInfo = typeof debugLoggingOn != "undefined" && debugLoggingOn && true;

    static originOffsetX = 500;
    static originOffsetY = 300;
    static boxWidth = 200;
    static boxHeight = 52;
    static halfBoxWidth = CCDE.boxWidth / 2;
    static halfBoxHeight = CCDE.boxHeight / 2;
    static nodeWidth = CCDE.boxWidth * 1.5;
    static nodeHeight = CCDE.boxHeight * 3;

    static ANCESTORS = 1;
    static DESCENDANTS = -1;
    static #COOKIE_NAME = "wt_ccd_options";

    static HELP_TEXT = `
        <xx>[ x ]</xx>
        <h2 style="text-align: center">About Compact Couple Descendants</h2>
        <p>The display combines the descendant trees of two people that are in some relationship
           (e.g. in a marriage, or the parents of a child - a couple in other words) and shows the descendants
           of both members of the couple. You can expand and contract the tree and change its focus as you please.</p>
        <p>Duplicate nodes are flagged with coloured squares. Click on the square to highlight the other copies.</p>
        <p>Navigation Summary</p>
        <ul>
            <li>Click in a grayed-out circle to expand the tree at that node through the loading of more people.
            <li>Click in a white node to collapse the tree at that node. Collapsed nodes are filled with green. Click on
                it to expand the subtree again. Any previously collapsed nodes underneath it will remain collapsed.
            <li>Shift-click on a green (collapsed) node to expand it as well as any other collapsed nodes that were
                collapsed underneath it.
            <li>If you have checked the "Connectors" checkbox, duplicate subtrees are not repeated, but the root of the
                duplicate is flagged in bright blue and is labeled "See [person name]". Only the original node can be
                expanded, not the duplicate.
            <li><svg width="12" height="12"><polygon points="1,2 11,2 6,12" style="fill:green;" /></svg>
                - show the children of a couple, or all the spouses of the other member of the couple. In the children
                  dropdown, you can select which children should be shown in the tree (be default all are shown).
            <li>⤇ - select this spouse for this couple. Only the spouse of the root and their direct descendants
                can be changed, provided of course, that they have more than one spouse.
            <li><img src="https://www.wikitree.com/images/icons/pedigree.gif"/> - make this person the root of the tree.
            <li>Click on a person's name to open that person's profile in a new tab.
            <li>Use scrolling (up/down and left/right) to pan around, or use the left/right buttons at the bottom left.
        </ul>
        <p>You can double click in this box, press ESC, or click the X in the top right corner to remove this About text.</p>`;

    static #nextZLevel = 10000;

    static ancestorRoot;
    static descendantRoot;
    static userAncestors;

    constructor(containerSelector) {
        $(containerSelector).html(`
<div id="ccdContainer" class="ccd">
  <div id="controlBlock" class="ccd-not-printable">
    <div id="help-text" class="pop-up">${CCDE.HELP_TEXT}</div>
    <fieldset id="ccdFieldset">
      <legend id="ccdOptions" title="Click to Close/Open the options">Options - click here to open/close</legend>
      <table id="optionsTbl" class="table-borderless">
        <tr>
          <td>
            <label title="Remove the header (Children, Grandchildren, etc.) above the tree." class="right">
              <input id="hideTreeHeader" type="checkbox" />
              Hide tree header
            </label>
          </td>
          <td>
            <label
              class="right"
              title="Do not expand a path to beyond a duplicate if a previous path already exists. Just draw a connector.">
              <input id="connectors" type="checkbox" />
              Connectors
            </label>
          </td>
          <td>
            <label title="Determines the horizontal distance between generations. Adjust this if names overlap.">
              Edge Factor
              <input id="edgeFactor" type="number" value="200" step="10" />
            </label>
          </td>
          <td>
            <label class="left" title="Choose between curved or square edges.">
              Edges:
              <label title="Use a Bezier curve to connect nodes.">
                <input type="radio" id="etcurved" name="edgeType" value="curved" checked />
                Curved
              </label>
              <label title="Use only horizontal and vertical lines to connect nodes.">
                <input type="radio" id="etsquare" name="edgeType" value="square" />
                Square
              </label>
            </label>
          </td>
          <td>
            <button
              id="drawTreeButton"
              class="btn btn-primary btn-sm"
              title="Redraw the tree, expanding all collapsed branches">
              Redraw Tree
            </button>
            <button id="help-button" class="btn btn-secondary btn-sm" title="About this app">
              <b>?</b>
            </button>
            <!-- DEBUGGING - some help with debugging animation issues
            <label for="d3delay" title="Animation delay."> Delay </label>
            <input id="d3delay" type="number" min="0" value="200" title="Links animation delay." />
            <input id="originalSrc" type="checkbox" title="Use srcNode or d.parent as links animation source." />
            <label for="originalSrc" title="Use srcNode or d.parent as links animation source." class="right">
              Use srcNode?
            </label>
            <input id="useX0" type="checkbox" title="Links animation src coords: (x0,y0) or (x,y)?." />
            <label for="useX0" title="Links animation src coords: (x0,y0) or (x,y)?." class="right"> X0 Coords? </label>
            end of DEBUGGING options-->
          </td>
        </tr>
        <tr>
          <td>
            <label title="Anonymize names of living people and remove their dates and places." class="right">
              <input id="anonLiving" type="checkbox" />
              ${spell("Anonymize")} the living
            </label>
          </td>
          <td>
            <label
              title="Obey privacy settings when displaying names and dates, even if you are on the trusted list."
              class="right">
              <input id="privatise" type="checkbox" />
              ${spell("Privatize")}
            </label>
          </td>
          <td>
            <label
              title="Determines the display height of the tree. Adjust this if adjacent couples are too close to each other.">
              Height Factor
              <input id="ccdTHFactor" type="number" min="1" value="55" />
            </label>
          </td>
          <td colspan="2">
            <label
              title="Position couples along the horizontal tree axis relative to the year of birth of the indicated partner."
              class="left">
              Position couples relative to birth year of
              <input type="radio" id="birthScalea" name="theBirthScale" class="a-radio" value="a" />
              <input type="radio" id="birthScaleb" name="theBirthScale" class="b-radio" value="b" />
            </label>
            <label
              title="Position couples along the horizontal tree axis relative to the year of birth of the indicated partner.">
              <input type="radio" id="birthScaleno" name="theBirthScale" class="gray-radio" value="no" checked />
              None
            </label>
            <label
              class="right"
              title="Position couples along the horizontal tree axis relative to the year of birth of the indicated partner.">
              <input type="radio" id="birthScalec" name="theBirthScale" value="c" />
              Child
            </label>
          </td>
        </tr>
        <tr>
          <td style="text-align: right">
            <label title='Choose the colour for people categorised as a "brick wall".'>
              Brick wall colour
              <input id="ccdBrickWallColour" type="color" value="#FF0000" />
            </label>
            &nbsp;
          </td>
          <td colspan="3" rowspan="2">
            <fieldset>
              <legend title='Set what constitutes a "brick wall."'>Add to Brick Wall:</legend>
              <table class="table-borderless">
                <tr>
                  <td>
                    <label for="noParents" title="Anyone with no parents." class="right">
                      <input id="noParents" type="checkbox" checked />
                      No Parents [
                      <span class="cnt" title="Number of profiles with no parent"> ? </span>
                      ]
                    </label>
                  </td>
                  <td>
                    <label
                      for="noNoSpouses"
                      title='Anyone who does not have their "No more spouses" checkbox set.'
                      class="right">
                      <input id="noNoSpouses" type="checkbox" />
                      No "no more spouses" [
                      <span class="cnt" title='Number of profiles with "No more spouses" checkbox not set'> ? </span>
                      ]
                    </label>
                  </td>
                </tr>
                <tr>
                  <td>
                    <label for="oneParent" title="Anyone with only one parent." class="right">
                      <input id="oneParent" type="checkbox" />
                      Only 1 Parent [
                      <span class="cnt" title="Number of profiles with only one parent"> ? </span>
                      ]
                    </label>
                  </td>
                  <td>
                    <label
                      for="noNoChildren"
                      title='Anyone who does not have their "No more children" checkbox set.'
                      class="right">
                      <input id="noNoChildren" type="checkbox" />
                      No "no more children" [
                      <span class="cnt" title='Number of profiles with "No more children" not checked'> ? </span>
                      ]
                    </label>
                  </td>
                </tr>
              </table>
            </fieldset>
          </td>
          <td>
            <label title="Highlight direct descendants of the root person with squares." class="left">
              <input id="bloodline" type="checkbox" checked />
              Highlight descendants
            </label>
          </td>
          <!--
          <td>
            <label title="Add sleeps in between some steps of drawing the tree (for debugging help).">
              <input id="sleep" type="checkbox" />
              Sleep (test)
            </label>
          </td>
          -->
        </tr>
        <tr>
          <td style="text-align: right; vertical-align: top">
            <label title="Choose the colour for the lines connecting descendants.">
              Link line colour
              <input id="ccdLinkLineColour" type="color" value="#CCCCCC" />
            </label>
            &nbsp;
          </td>
          <td>
            <label title="Draw a box aound my direct ancestors (if any)." class="left">
              <input id="flagAncestors" type="checkbox" />
              Flag my direct ancestors
            </label>
          </td>
        </tr>
      </table>
    </fieldset>
    <div class="floating-button-div" style="position: fixed; bottom: 20px; left: 20px">
      <button id="slideLeft" title="Scroll left" class="small button">&larr;</button>
      <button id="slideRight" title="Scroll right" class="small button">&rarr;</button>
    </div>
  </div>
  <div id="svgContainer" class="ccd-printable">
    <section id="theSvg"></section>
  </div>
</div>
        `);

        const self = this;

        $("#help-button")
            .off("click")
            .on("click", function () {
                if (window.aleShowingInfo) {
                    wtViewRegistry.hideInfoPanel();
                    window.aleShowingInfo = false;
                }
                $("#help-text").css("z-index", `${CCDE.getNextZLevel()}`).slideToggle("fast");
            });
        $("#help-text").draggable();

        // Set up pop-ups (help text, alt spouse and children lists) closing and focus
        $("#ccdContainer")
            .off("dblclick", ".pop-up")
            .on("dblclick", ".pop-up", function () {
                $(this).slideToggle("fast");
            });
        $("#ccdContainer")
            .off("click", ".pop-up")
            .on("click", ".pop-up", function () {
                const self = $(this);
                const myId = self.attr("id");
                const [popupAtTop] = CCDE.findTopPopup();
                if (myId != popupAtTop.attr("id")) {
                    self.css("z-index", `${CCDE.getNextZLevel()}`);
                }
            });
        $("#help-text xx")
            .off("click")
            .on("click", function () {
                $(this).parent().slideUp("fast");
            });

        $("#drawTreeButton")
            .off("click")
            .on("click", function (e) {
                self.drawTree();
            });
        $("#edgeFactor").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#drawTreeButton").click();
            }
        });
        $("#ccdTHFactor").keyup(function (e) {
            if (e.keyCode == 13) {
                $("#drawTreeButton").click();
            }
        });
        $(
            "#ccdBrickWallColour, #ccdLinkLineColour, #hideTreeHeader, #anonLiving, #privatise, " +
                "#noParents, #oneParent, #noNoSpouses, #noNoChildren"
        )
            .off("change")
            .on("change", function () {
                $("#drawTreeButton").click();
            });
        $("#connectors")
            .off("change")
            .on("change", function (event) {
                $("#drawTreeButton").click();
            });
        $('input[name = "edgeType"]')
            .off("change")
            .on("change", function () {
                $("#drawTreeButton").click();
            });
        $('input[name = "theBirthScale"]')
            .off("change")
            .on("change", function () {
                $("#drawTreeButton").click();
            });
        $("#bloodline")
            .off("change")
            .on("change", function () {
                $("#drawTreeButton").click();
            });
        $("#flagAncestors")
            .off("change")
            .on("change", async function () {
                if (this.checked) {
                    const loggedInUserId = window.wtViewRegistry.session.lm.user.id;
                    if (!loggedInUserId) {
                        window.wtViewRegistry.showWarning(
                            "You need to be logged in for your ancestors to be highlighted."
                        );
                        CCDE.userAncestors = await Ancestors.get();
                    } else {
                        console.log(
                            `Loading ancestors for watcher ${window.wtViewRegistry.session.lm.user.name} (${loggedInUserId})`
                        );
                        Utils.showShakingTree("controlBlock");
                        CCDE.userAncestors = await Ancestors.get(loggedInUserId);
                        Utils.hideShakingTree();
                    }
                } else {
                    CCDE.userAncestors = await Ancestors.get();
                }
                $("#drawTreeButton").click();
            });
        $("#ccdOptions")
            .off("click")
            .on("click", function (e) {
                e.preventDefault();
                $("#optionsTbl").slideToggle("fast");
            });

        CCDE.retrieveOptionsFromCookie();

        const theSvgContainer = $("#theSvg");
        theSvgContainer.floatingScroll();
        $("#slideLeft")
            .off("click")
            .on("click", function (event) {
                event.preventDefault();
                theSvgContainer.animate(
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
                theSvgContainer.animate(
                    {
                        scrollLeft: "+=300px",
                    },
                    "fast"
                );
            });

        $(document).off("keyup", CCDE.closePopUp).on("keyup", CCDE.closePopUp);
    }

    static closePopUp(e) {
        if (e.key === "Escape") {
            // Find the popup with the highest z-index and close it
            const [lastPopup, highestZIndex] = CCDE.findTopPopup();
            if (lastPopup) {
                CCDE.setNextZLevel(highestZIndex + 1);
                lastPopup.slideUp("fast");
            }
        }
    }

    static findTopPopup() {
        // Find the popup with the highest z-index
        let highestZIndex = 0;
        let lastPopup = null;
        $(".pop-up:visible").each(function () {
            const zIndex = parseInt($(this).css("z-index"), 10);
            if (zIndex > highestZIndex) {
                highestZIndex = zIndex;
                lastPopup = $(this);
            }
        });
        return [lastPopup, highestZIndex];
    }

    static saveOptionCookies() {
        const options = {
            connectors: document.getElementById("connectors").checked,
            hideTreeHeader: document.getElementById("hideTreeHeader").checked,
            brickWallColour: document.getElementById("ccdBrickWallColour").value,
            linkLineColour: document.getElementById("ccdLinkLineColour").value,
            edgeFactor: document.getElementById("edgeFactor").value,
            edgeType: document.querySelector('input[name = "edgeType"]:checked').value,
            heightFactor: document.getElementById("ccdTHFactor").value,
            noParents: document.getElementById("noParents").checked,
            oneParent: document.getElementById("oneParent").checked,
            noNoSpouses: document.getElementById("noNoSpouses").checked,
            noNoChildren: document.getElementById("noNoChildren").checked,
            checkedScale: document.querySelector('input[name = "theBirthScale"]:checked').value,
            privatise: document.getElementById("privatise").checked,
            anonLiving: document.getElementById("anonLiving").checked,
            bloodline: document.getElementById("bloodline").checked,
            flagAncestors: document.getElementById("flagAncestors").checked,
        };
        // console.log(`Saving options ${JSON.stringify(options)}`);
        Utils.setCookie(CCDE.#COOKIE_NAME, JSON.stringify(options));
    }

    static retrieveOptionsFromCookie() {
        const optionsJson = Utils.getCookie(CCDE.#COOKIE_NAME);
        // console.log(`Retrieved options ${optionsJson}`);
        if (optionsJson) {
            const opt = JSON.parse(optionsJson);
            $("#connectors").attr("checked", opt.connectors);
            $("#hideTreeHeader").attr("checked", opt.hideTreeHeader);
            $("#ccdBrickWallColour").val(opt.brickWallColour);
            $("#ccdLinkLineColour").val(opt.linkLineColour);
            $("#edgeFactor").val(opt.edgeFactor);
            if (["curved", "square"].includes(opt.edgeType)) $(`#et${opt.edgeType}`).attr("checked", 1);
            $("#ccdTHFactor").val(opt.heightFactor);
            $("#noParents").attr("checked", opt.noParents);
            $("#oneParent").attr("checked", opt.oneParent);
            $("#noNoSpouses").attr("checked", opt.noNoSpouses);
            $("#noNoChildren").attr("checked", opt.noNoChildren);
            if (["a", "b", "no"].includes(opt.checkedScale)) $(`#birthScale${opt.checkedScale}`).attr("checked", 1);
            $("#privatise").attr("checked", opt.privatise);
            $("#anonLiving").attr("checked", opt.anonLiving);
            $("#bloodline").attr("checked", opt.bloodline);
            $("#flagAncestors").attr("checked", opt.flagAncestors);
        }
    }

    /**
     * Load and display a person and their spouse
     */
    loadAndDraw(id) {
        condLog(`loadAndDraw(${id})`);
        const self = this;
        window.wtViewRegistry.clearStatus();
        Utils.showShakingTree("controlBlock", function () {
            let userAncestorsPromise;
            if (document.getElementById("flagAncestors").checked) {
                const loggedInUserId = window.wtViewRegistry.session.lm.user.id;
                if (!loggedInUserId) {
                    window.wtViewRegistry.showWarning("You need to be logged in for your ancestors to be highlighted.");
                    userAncestorsPromise = Ancestors.get();
                } else {
                    console.log(
                        `Loading ancestors for watcher ${window.wtViewRegistry.session.lm.user.name} (${loggedInUserId})`
                    );
                    // Start loading ancestors, don't await
                    userAncestorsPromise = Ancestors.get(loggedInUserId);
                }
            } else {
                userAncestorsPromise = Ancestors.get();
            }

            self.richLoad(id).then(async function (person) {
                if (!CCDE.userAncestors) {
                    CCDE.userAncestors = await userAncestorsPromise;
                }
                Utils.hideShakingTree();
                condLog(`=======RICH_LOADed ${person.toString()}`, person);
                // const aRoot = Couple.get("A", { a: person, isRoot: true });
                const dRoot = Couple.get("D", { a: person, isRoot: true });
                self.drawTree(null, dRoot);
            });
        });
    }

    // Example usage:
    /**
     * Fetch the given person's data via an API call, and make separate API calls
     * for each of their spouses and children.  This is to ensure that those related
     * people are also 'enriched', i.e. each have parent, spouse and children
     * collections (since they are absent if the person data was retrieved as part of
     * a getPerson for another person ID).  We'll only call the API if we have not
     * already retrieved the 'enriched' person in the past.
     *
     * We do not have to make API calls for the parents as part of loadRelated since
     * a parent will be richLoaded before they are expanded. However, since we need
     * to know the names of a person's siblings and the names of both of their parents'
     * other spouses (if any) in order to construct children and spouse dropdowns for
     * each profile, we make getPerson calls (to get other spouses and children if
     * necessary) on each parent of the profile being richLoaded as well as on the
     * parents of his/her spouses.
     *
     * These calls are only made if we have not rerieved the relevant data in the past.
     */
    async richLoad(id, partnerId, direction = CCDE.DESCENDANTS) {
        condLog(`=======RICH_LOAD ${id}`);
        const person = await CCDE.getWithSpousesAndChildren(id);
        condLog(`=======RICH_LOAD completed await getWithChildren ${person.toString()}`);
        return await this.loadRelated(person, partnerId, direction);
    }

    async loadRelated(person, partnerId, direction) {
        const self = this;
        let loadPromises = [];
        condLog(`=======RICH_LOAD loadRelated for ${person.toString()}`);

        // Collect promises for the names of step-parents, i.e. the names of the other spouses (if any)
        // of the father and mother of this person
        // condLog(`loadRelated: getPromisesForParents of ${person.toString()}`);
        // loadPromises = getPromisesForParents(person, loadPromises);

        // Add promises for loading of current partner with the names of all of their children and spouses
        const spouseId = partnerId || person._data.PreferredSpouseId;
        if (spouseId) {
            condLog(`loadRelated: get load promise for spouse ${spouseId}`);
            loadPromises.push(CCDE.getWithSpousesAndChildren(spouseId));
        } else {
            condLog(`loadRelated called on Person ${person.toString()} without preferred spouse`, person);
        }
        // Add promises to load all the children, if we're expanding descendants. This is so that we can get
        // the names of all their spouses
        if (direction != CCDE.ANCESTORS) {
            let childrenIds = person.getChildrenIds();
            if (childrenIds) {
                condLog(`loadRelated Children`, childrenIds);
                for (const childId of childrenIds) {
                    const child = person.getChild(childId);
                    if (child && !child.getSpouseIds()) {
                        condLog(`loadRelated: get promise for child ${childId}`);
                        loadPromises.push(CCDE.getWithSpousesAndChildren(childId));
                    }
                }
            } else {
                condLog(`loadRelated called on Person ${person.toString()} without Children[]`, person);
            }
        }

        // Now wait for all the above promises to complete and process the results
        condLog(`=======loadRelated awaiting promise fulfillment for ${person.toString()}`);
        let results = await Promise.all(loadPromises);
        condLog(`=======loadRelated promises fulfilled for ${person.toString()}`);

        // Get the person object for the partner
        let selectedSpouse = undefined;
        for (const newPerson of results) {
            const id = newPerson.getId();
            if (spouseId && spouseId == id) {
                selectedSpouse = newPerson;
                break;
            }
        }

        // Now that we have loaded the current person's selected spouse, make sure we have the names of all the
        // parents (including step-parents) and their children for this spouse as well. We need these to create
        // spouse and children drop-downs for the parents.
        loadPromises = [];
        // if (selectedSpouse) {
        //     condLog(
        //         `=======loadRelated get promises for step parents and their children of selected spouse ${selectedSpouse.toString()}`
        //     );
        //     loadPromises = getPromisesForParents(selectedSpouse, loadPromises);
        // }

        // For the same reason as above, if we are expanding descendants, we also need the names of the other
        // spouses and children of each child's spouse.
        if (direction != CCDE.ANCESTORS) {
            const children = person.getChildren();
            condLog("=======loadRelated get promises for spouses of children");
            for (const i in children) {
                const child = children[i];
                const spouseIds = child.getSpouseIds() || new Set();
                for (const spouseId of spouseIds) {
                    condLog(`loadRelated: get promise for spouse ${spouseId} of child ${child.toString()}`);
                    loadPromises.push(CCDE.getWithSpousesAndChildren(spouseId));
                }
            }
        }

        condLog(`=======loadRelated awaiting spouse-related promise fulfillment for ${person.toString()}`);
        results = await Promise.all(loadPromises);
        condLog(`=======loadRelated spouse-related promises fulfilled for ${person.toString()}`);

        return person;

        function getPromisesForParents(person, promises) {
            const parentIds = [person.getFatherId(), person.getMotherId()];
            for (const i in parentIds) {
                const parentIds = [person.getFatherId(), person.getMotherId()];
                const pId = parentIds[i];
                if (pId) promises.push(CCDE.getWithSpousesAndChildren(pId));
            }
            return promises;
        }
    } // end loadRelated

    /**
     * Load more ancestors or descendants. Update existing data in place
     */
    async expand(couple, direction) {
        const self = this;
        condLog(`expand couple (direction=${direction}) ${couple.toString()}`, couple);
        const oldPerson = couple.getInFocus();
        const oldSpouse = couple.getNotInFocus();
        const wasNotExpanded = oldPerson && !oldPerson.isFullyEnriched();
        if (wasNotExpanded) {
            await self.richLoad(oldPerson.getId(), oldSpouse?.isNoSpouse ? null : oldSpouse?.getId(), direction);
            const treeInfo = this.setDescendantGenerationsAndDuplicates();
            condLog(`expand done for ${couple.toString()}`, couple);
            return treeInfo;
        } else {
            console.error("Attempted to expand for enriched person", oldPerson);
            return new Promise((resolve, reject) => {
                resolve(null);
            });
        }
    }

    /**
     * This is the function that gets called (via callbacks in the tree) when the change partner button
     * is clicked.
     * @param {*} coupleId The id of couple node for which a partner needs to be changed
     * @param {*} personId The profile id of whose partner needs to be changes
     * @param {*} newPartnerID The profile id of the new partner
     */
    async changePartner(coupleId, personId, newPartnerID) {
        condLog(`======changePartner for ${personId} in couple node ${coupleId} to ${newPartnerID}`);

        // First make sure we have all the data for the new partner profile
        const newPartner = await this.richLoad(newPartnerID, personId);
        // let foundRoot = false;

        // Find the couple node to change, remove it from the page and then change it
        d3.select(`#${coupleId}`)
            .remove()
            .each(function (d) {
                changeIt(d.data);
            });

        // Redraw the tree
        this.drawTree();

        function changeIt(couple) {
            if ([couple.a?.getId(), couple.b?.getId()].includes(+personId)) {
                const subTree = couple.idPrefix.startsWith("A") ? "ancestor" : "descendant";
                condLog(
                    `Changing partner for ${personId} in ${subTree} couple ${couple.toString()} to ${newPartnerID}`
                );
                couple.changePartner(personId, newPartner);
                condLog(`Couple changed to: ${couple.toString()}`, couple);
            } else {
                console.error(`Retrieved wrong couple ${couple.toString()}. It does not contain profile ${personId}`);
            }
        }
    }

    clearDisplay() {
        $("#svgContainer").off("click");
        $("#theSvg svg").remove();
        $("#theSvg .treeHeader").remove();
        $(".alt-spouse-list-wrapper").remove();
        $(".children-list").remove();
    }

    /**
     * Draw/redraw the tree
     */
    drawTree(ancestorRoot, descendantRoot) {
        condLog("=======drawTree for:", ancestorRoot, descendantRoot, CachedPerson.getCache());
        if (ancestorRoot) {
            CCDE.ancestorRoot = ancestorRoot;
        }
        if (descendantRoot) {
            CCDE.descendantRoot = descendantRoot;
        }
        CCDE.saveOptionCookies();
        const tInfo = this.setDescendantGenerationsAndDuplicates();

        const connectors = document.getElementById("connectors").checked;
        const hideTreeHeader = document.getElementById("hideTreeHeader").checked;

        condLog("draw descendantTree:", CCDE.descendantRoot);
        this.clearDisplay();
        showTree(this, tInfo, connectors, hideTreeHeader);
    }

    /**
     * Main WikiTree API calls
     */
    async getFullPerson(id) {
        return await CachedPerson.getWithLoad(id, ["Parents", "Spouses", "Children"]);
    }

    static async getWithSpousesAndChildren(id) {
        return await CachedPerson.getWithLoad(id, ["Spouses", "Children"]);
    }

    static async getWithSpouses(id) {
        return await CachedPerson.getWithLoad(id, ["Spouses"]);
    }

    static getD3Children(couple, cplsAlreadyInTree) {
        // condLog(`getD3Children for ${couple.toString()}`, couple);
        if (couple.IsLink) {
            condLog(`${couple.toString()} has no DescendantTree children`);
            return;
        }
        const children = [];
        const jointChildren = couple.getJointChildrenIds().map((id) => CachedPerson.get(+id));
        sortByBirthDate(jointChildren);
        for (const [i, child] of jointChildren.entries()) {
            const cpl = Couple.get(`${couple.idPrefix}_${i}`, { a: child });
            if (cplsAlreadyInTree) {
                const cplId = cpl.getCoupleId();
                if (cplsAlreadyInTree.has(cplId)) {
                    cpl.IsLink = true;
                } else {
                    cplsAlreadyInTree.add(cplId);
                }
            }
            children.push(cpl);
        }
        condLog(`Returning DescendantTree children for ${couple.toString()}`, children);
        return children;
    }

    setDescendantGenerationsAndDuplicates() {
        const rootCouple = CCDE.descendantRoot;
        const people = CachedPerson.getCache().getMap();
        const tInfo = {
            rootCouple: rootCouple,
            people: people,
            peopleByWtId: new Map(),
            genCounts: [0],
            minBirthYear: 5000,
            maxBirthYear: 0,
            maxGeneration: 0,
            duplicates: new Map(),
            profileCount: 0,
        };
        // Clear each person's generation info and add them to the byWtId map
        for (const person of people.values()) {
            person.clearGenerations();
            person.isUserAncestor = CCDE.userAncestors.has(person.getId());
            tInfo.peopleByWtId.set(person.getWtId(), person);
        }
        const q = []; // queue of ids for which to set generation of their children
        if (rootCouple.b) add_generation(rootCouple.b.getId(), 1);
        if (rootCouple.a) {
            const aId = rootCouple.a.getId();
            add_generation(aId, 1);
            q.push([aId, 1]);
            tInfo.maxGeneration = 1;
        }
        while (q.length > 0) {
            const [id, gen] = q.shift();
            const newGen = gen + 1;
            const person = people.get(+id);
            if (person) {
                add_generation(person._data.PreferredSpouseId, newGen);
            }
            for (const childId of getPreferredWifeChildrenIds(person)) {
                add_generation(childId, newGen, q);
                if (tInfo.maxGeneration < newGen) {
                    tInfo.maxGeneration = newGen;
                }
            }
        }

        // Collect the duplicates and assign each a unique number (for colouring later),
        // set each profile's NrOlderGenerations, and find the minimum and maximum birth year
        let n = 0;
        for (const p of people.values()) {
            p.setNrOlderGenerations(tInfo.maxGeneration - p.getLowestGeneration());
            const id = p.getId();
            if (p.isDuplicate() && !tInfo.duplicates.has(id)) {
                tInfo.duplicates.set(id, ++n);
            }
            tInfo.profileCount += p.getNrCopies(tInfo.maxGeneration);
            const bYear = +p.getBirthYear();
            if (bYear > 0) {
                if (bYear < tInfo.minBirthYear) {
                    tInfo.minBirthYear = bYear;
                }
                if (bYear > tInfo.maxBirthYear) {
                    tInfo.maxBirthYear = bYear;
                }
            }
        }
        // console.log(`nr profiles=${tInfo.profileCount}, nr duplicates=${tInfo.duplicates.size}`);
        // console.log(`generation counts: ${tInfo.genCounts}`, tInfo.genCounts);

        return tInfo;

        function add_generation(personId, generation, q = null) {
            const id = +personId;
            if (!id || !people.has(id)) {
                return;
            }
            const pers = people.get(id);
            pers.addGeneration(generation);
            // Create a record of the number of people at each generation
            if (typeof tInfo.genCounts[generation] == "undefined") {
                tInfo.genCounts[generation] = 1;
            } else {
                tInfo.genCounts[generation] += 1;
            }
            if (q) {
                q.push([id, generation]);
            }
        }

        function getPreferredWifeChildrenIds(a) {
            let list = [];
            if (typeof a == "undefined") return list;

            const childrenIds = a.getChildrenIds() || new Set();
            const b = a.getSpouse(); // get the preferred spouse
            if (typeof b == "undefined" || b.isNoSpouse) {
                list = [...childrenIds];
            } else {
                const otherChildrenIds = b.getChildrenIds() || new Set();
                for (const id of otherChildrenIds) {
                    if (childrenIds.has(id)) {
                        list.push(id);
                    }
                }
            }
            return list;
        }
    }

    static updateBrickWallCounts() {
        const counts = CCDE.markAndCountBricks(
            {
                noParents: document.getElementById("noParents").checked,
                oneParent: document.getElementById("oneParent").checked,
                noNoSpouses: document.getElementById("noNoSpouses").checked,
                noNoChildren: document.getElementById("noNoChildren").checked,
            },
            CachedPerson.getCache().getMap()
        );

        for (const id of ["noParents", "oneParent", "noNoSpouses", "noNoChildren"]) {
            $(`label[for=${id}`).find("span.cnt").text(counts[id]);
        }
    }

    static markAndCountBricks(opt, people) {
        let nrNoParents = 0;
        let nrOneParent = 0;
        let nrNoNoSpouses = 0;
        let nrNoNoChildren = 0;
        people.forEach((person) => {
            let isBrick = false;
            if (!person.hasAParent()) {
                ++nrNoParents;
                isBrick ||= opt.noParents;
            }
            if ((person.getFatherId() && !person.getMotherId()) || (!person.getFatherId() && person.getMotherId())) {
                ++nrOneParent;
                isBrick ||= opt.oneParent;
            }
            if (person._data.DataStatus?.Spouse != "blank") {
                ++nrNoNoSpouses;
                isBrick ||= opt.noNoSpouses;
            }
            if (person._data.NoChildren != 1) {
                ++nrNoNoChildren;
                isBrick ||= opt.noNoChildren;
            }
            person.setBrickWall(isBrick);
        });
        return {
            noParents: nrNoParents,
            oneParent: nrOneParent,
            noNoSpouses: nrNoNoSpouses,
            noNoChildren: nrNoNoChildren,
        };
    }

    static findPaths(otherWtIds, tInfo) {
        const paths = CCDE.findAllPaths(tInfo, otherWtIds);

        // Convert the paths of the form [[cpl-id-1, cpl-id-2, ...], [cpl-id-1, cpl-id-k, ...], ...] obtained from
        // the above into a set of strings of the form "<src-coupleId>|<dst-coupleId>"
        // representing the links so we can do quick checks for existence.
        const rootOfAllPaths = tInfo.rootCouple;
        const links = new Set();

        for (const path of paths) {
            let srcCoupleId = path.shift();
            for (const dstCoupleId of path) {
                const lnkId = `${srcCoupleId}_${dstCoupleId}`;
                if (!links.has(lnkId)) links.add(lnkId);
                srcCoupleId = dstCoupleId;
            }
        }
        return links;
    }

    static getGenCountsForPaths(paths) {
        const genCounts = [0];
        const pLengths = paths.map((a) => a.length);
        const maxPathLength = Math.max(...pLengths);
        for (let g = 0; g < maxPathLength; ++g) {
            let cnt = 0;
            for (const path of paths) {
                if (path[g]) cnt += 1;
            }
            genCounts.push(cnt);
        }
        return genCounts;
    }

    /**
     *
     * @param {*} tInfo
     * @param {*} dstWtIds
     * @returns All paths from the root of tInfo (a couple) to their ancestors (if any) where any member of
     *          the ancestor couple has one of the WT ids in dstWtIds.
     * The paths have the form
     *          [[couple-1, couple-2, ...], [couple-1, couple-k, ...], ...], where couple-id has the form wtId-a:wtId-b
     */
    static findAllPaths(tInfo, dstWtIds) {
        const allPaths = [];
        const srcNode = tInfo.rootCouple;
        for (const dstWtId of dstWtIds) {
            if (dstWtId == "") continue;
            if (!tInfo.peopleByWtId.has(dstWtId)) {
                console.error(`Profile ${dstWtId} is not present in the ancestor tree`);
                continue;
            }
            const path = [];
            path.push(srcNode.getCoupleId());

            // Use depth first search (with backtracking) to find all the paths in the graph
            // from srcNode to a node (i.e. couple) with dstWtId as member
            DFS(srcNode, dstWtId, path, allPaths);
        }

        return allPaths;

        function DFS(srcNode, dstWtId, path, allPaths) {
            if (srcNode.a?.getWtId() == dstWtId || srcNode.b?.getWtId() == dstWtId) {
                allPaths.push([...path]);
            } else {
                for (const adjnode of CCDE.getD3Children(srcNode)) {
                    path.push(adjnode.getCoupleId());
                    DFS(adjnode, dstWtId, path, allPaths);
                    path.pop();
                }
            }
        }
    }
    static getNextZLevel() {
        return CCDE.#nextZLevel++;
    }

    static setNextZLevel(n) {
        CCDE.#nextZLevel = n;
    }
}
