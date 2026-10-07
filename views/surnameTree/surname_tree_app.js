/*
Created By: Azure Robinson (Robinson-27225)
*/

import {
    LOOKS,
    SCOPES,
    buildMasks,
    buildTree,
    chooseByRelation,
    NAME_KINDS,
    fullName,
    kindById,
    lookById,
    groupNames,
    hashString,
    layoutWords,
    scopeById,
    BANNER_FONTS,
    DEFAULT_BANNER_BACKGROUND,
    DEFAULT_BANNER_WORD,
    buildBannerShape,
    frameOf,
    unseenNote,
    unseenRows,
    seededRandom,
} from "./surname_tree_core.js";
import { fetchScope } from "./surname_tree_data.js";
import {
    BUILT_IN_PICTURES,
    DEFAULT_SENSITIVITY,
    MAX_SENSITIVITY,
    MIN_COVERAGE,
    MIN_SENSITIVITY,
    backdropDataUrl,
    readImageFile,
    readImageUrl,
    shapeFromPixels,
    wordColour,
} from "./surname_tree_image.js";
import { makeMeasure } from "./surname_tree_draw.js";
import {
    DEFAULT_SIZE,
    defaultSizeFor,
    sizesFor,
    FORMATS,
    MAX_WIDTH,
    MIN_WIDTH,
    PAPERS,
    exportFileName,
    formatById,
    renderImage,
    renderPdf,
    sizeLabel,
    widthFor,
} from "./surname_tree_export.js";
import { PAGE_SIZE, cardHtml, countText, escapeHtml, listHtml } from "./surname_tree_list.js";
import { attachZoom, renderTreeSvg } from "./surname_tree_svg.js";

// The Surname Tree app itself: a chart drawn in a container, with its controls, list and card. mountApp is given the
// container, the person to start from (their number or WikiTree ID) and the starting options.

/** Up to this many names that found no room are named in the note under the tree; more than that are listed in a popup. */
const UNSEEN_LISTED = 3;
const pluralize = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

// ---------------------------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------------------------

/** Draw the app in `container` for the person with this ID (the Tree Apps page gives their number). Returns { destroy }. */
export function mountApp(container, key, options) {
    const startScope = scopeById(options.scope).id;
    const state = {
        scope: startScope,
        amount: {
            ancestors: clampAmount("ancestors", parseInt(options.generations, 10)),
            cc7: clampAmount("cc7", parseInt(options.degrees, 10)),
        },
        kind: kindById(options.names).id,
        biological: options.biological !== false,
        adoptive: options.adoptive !== false,
        fillGaps: options.fillGaps !== false,
        seed: hashString(String(key)),
        shape: buildTree(hashString(String(key))), // what the words fill: an oak, or the shape cut out of a picture
        look: lookById(options.look).id,
        shapeKind: "tree", // "tree", "image" (the member's own picture), or the id of a built-in picture
        picture: null, // { pixels, rect, name }: the picture now used as the shape
        mine: null, // the member's own picture, kept while a built-in one is used
        pictures: {}, // built-in pictures already loaded, by id
        leaveWhite: false, // white parts inside a picture are left empty
        imagesUrl: options.imagesUrl || "", // where the built-in pictures are kept, ending in /
        sensitivity: DEFAULT_SENSITIVITY,
        shapeNote: "",
        name: "",
        id: String(key), // the person's WikiTree ID, once it is known (the Tree Apps page gives their number)
        loaded: {}, // what the API gave, by reach and amount, so ticking, shuffling and stepping back do not ask again
        raw: { entries: [], truncated: false },
        words: [],
        items: [],
        people: 0,
        caption: "",
        selected: "", // the surname whose people are listed
        listShown: PAGE_SIZE,
        listEntries: [],
        request: 0,
        unseen: [], // the names that found no room
        saveFormat: "png",
        saveSize: DEFAULT_SIZE,
        sizeGroup: "tree", // whether the sizes now offered are the tree's or the banner's
        bannerBackground: DEFAULT_BANNER_BACKGROUND, // the wide banner: the colour behind the words
        bannerWords: "canopy", // "canopy" (the greens of the oak's leaves) or "one" (one colour, bannerWordColor)
        bannerWordColor: DEFAULT_BANNER_WORD,
        customWidth: "2000",
        paper: "letter",
    };

    const $app = $(`
    <div class="sutree-app">
      <div class="sutree-dialog">
        <div class="sutree-controls">
          <label>Tree of <select id="suTreeKind"></select></label>
          <label>Look <select id="suTreeLook"></select></label>
          <label>Shape
            <select id="suTreeShapeKind">
              <option value="tree">Oak tree (drawn)</option>
              <option value="image">My picture</option>
              <option value="banner">Wide banner (profile background)</option>
            </select>
          </label>
          <span id="suTreeBannerBox" class="sutree-bannerbox" hidden>
            <label>Words
              <select id="suTreeBannerWords">
                <option value="canopy">Greens of the canopy</option>
                <option value="one">One colour</option>
              </select>
            </label>
            <input type="color" id="suTreeBannerWordColor" aria-label="Colour of the words" hidden>
            <label>Background <input type="color" id="suTreeBannerBackground"></label>
          </span>
          <button type="button" id="suTreeChoose" title="Choose a picture to use as the shape" hidden>Choose picture…</button>
          <label id="suTreeSenseLabel" hidden title="Raise it to cut more of the background away; lower it to keep more of the picture">
            Cut-out <input type="range" id="suTreeSense" min="8" max="160" step="1">
          </label>
          <label id="suTreeWhiteLabel" hidden title="Leave the white parts of the picture empty, so a white design shows as a gap">
            <input type="checkbox" id="suTreeWhite"> Leave white empty
          </label>
          <input type="file" id="suTreeFile" accept="image/*" class="sutree-file" tabindex="-1" aria-hidden="true">
          <label>Reach <select id="suTreeScope"></select></label>
          <span class="sutree-stepper" title="Go further out, or come back in">
            <button type="button" id="suTreeFewer" aria-label="One fewer">&minus;</button>
            <span id="suTreeAmount" aria-live="polite"></span>
            <button type="button" id="suTreeMore" aria-label="One more">+</button>
          </span>
          <span class="sutree-show">
            <span>Show</span>
            <label title="Parents by birth, and their parents"><input type="checkbox" id="suTreeBio"> Biological</label>
            <label title="Adoptive, step and foster parents, and their families"><input type="checkbox" id="suTreeAdopt"> Adoptive</label>
          </span>
          <label><input type="checkbox" id="suTreeFill"> Fill the gaps</label>
          <button type="button" id="suTreeShuffle">Shuffle</button>
          <span class="sutree-spacer"></span>
          <button type="button" id="suTreeZoomOut" title="Zoom out">Zoom &minus;</button>
          <button type="button" id="suTreeZoomIn" title="Zoom in (or scroll)">Zoom +</button>
          <button type="button" id="suTreeZoomReset" title="Show the whole tree">Reset</button>
          <button type="button" id="suTreeCopy" title="Copy the picture to paste into a post or document">Copy image</button>
          <button type="button" id="suTreeFull" title="Fill the screen">Full screen</button>
          <button type="button" id="suTreeSaveAs" aria-expanded="false" aria-controls="suTreeSavePanel" title="Save a picture or PDF">Save as…</button>
        </div>
        <div class="sutree-save" id="suTreeSavePanel" hidden>
          <fieldset class="sutree-formats">
            <legend>File type</legend>
          </fieldset>
          <div id="suTreeSizeRow" class="sutree-save-row">
            <label>What size would you like? <select id="suTreeSize"></select></label>
            <label id="suTreeCustomLabel" hidden>Width <input type="number" id="suTreeCustom" step="100"> pixels</label>
          </div>
          <div id="suTreePaperRow" class="sutree-save-row" hidden>
            <label>Paper <select id="suTreePaper"></select></label>
          </div>
          <div class="sutree-save-row">
            <span id="suTreeSizeNote" class="sutree-note"></span>
            <span class="sutree-spacer"></span>
            <button type="button" id="suTreeSaveCancel">Cancel</button>
            <button type="button" id="suTreeSaveGo" class="sutree-primary">Save</button>
          </div>
        </div>
        <div class="sutree-main">
          <div class="sutree-stage">
            <svg id="suTreeSvg" xmlns="http://www.w3.org/2000/svg"></svg>
            <div class="sutree-tip" id="suTreeTip" role="tooltip"></div>
          </div>
          <aside class="sutree-list" id="suTreeList" aria-label="People with this surname" hidden>
            <div class="sutree-list-head">
              <span><strong id="suTreeListName"></strong> <span id="suTreeListCount"></span></span>
              <button type="button" id="suTreeListClose" aria-label="Close the list">&times;</button>
            </div>
            <div class="sutree-list-body" id="suTreeListBody"></div>
          </aside>
          <div class="sutree-card" id="suTreeCard" role="dialog" aria-label="Profile card" hidden></div>
          <div class="sutree-unseen" id="suTreeUnseen" role="dialog" aria-label="Names that did not fit" hidden>
            <div class="sutree-unseen-head">
              <strong id="suTreeUnseenTitle"></strong>
              <button type="button" id="suTreeUnseenClose" aria-label="Close the list">&times;</button>
            </div>
            <div class="sutree-unseen-body" id="suTreeUnseenBody"></div>
          </div>
        </div>
        <p class="sutree-status" id="suTreeStatus" role="status"></p>
      </div>
    </div>`);
    const find = (selector) => $app.find(selector);

    LOOKS.forEach((l) =>
        $("<option>")
            .val(l.id)
            .text(l.name)
            .prop("selected", l.id === state.look)
            .appendTo(find("#suTreeLook"))
    );
    find("#suTreeSense").attr({ min: MIN_SENSITIVITY, max: MAX_SENSITIVITY }).val(state.sensitivity);
    // the pictures that come with it go between the drawn oak and the member's own picture
    BUILT_IN_PICTURES.forEach((picture) =>
        $("<option>").val(picture.id).text(picture.name).insertBefore(find("#suTreeShapeKind option[value=image]"))
    );
    NAME_KINDS.forEach((k) =>
        $("<option>")
            .val(k.id)
            .text(k.name)
            .prop("selected", k.id === state.kind)
            .appendTo(find("#suTreeKind"))
    );
    SCOPES.forEach((scope) =>
        $("<option>")
            .val(scope.id)
            .text(scope.name)
            .attr("title", scope.hint)
            .prop("selected", scope.id === state.scope)
            .appendTo(find("#suTreeScope"))
    );
    find("#suTreeBio").prop("checked", state.biological);
    find("#suTreeAdopt").prop("checked", state.adoptive);
    find("#suTreeFill").prop("checked", state.fillGaps);
    FORMATS.forEach((f) =>
        $("<label>")
            .append(
                $("<input>")
                    .attr({ type: "radio", name: "suTreeFormat", value: f.id })
                    .prop("checked", f.id === state.saveFormat)
            )
            .append(document.createTextNode(` ${f.name}`))
            .appendTo(find(".sutree-formats"))
    );
    /** The sizes offered for the shape now shown (the banner's are wider), keeping the choice when it still exists. */
    function fillSizes() {
        const sizes = sizesFor(state.shape);
        const $size = find("#suTreeSize").empty();
        sizes.forEach((size) =>
            $("<option>")
                .val(size.id)
                .text(`${size.name}: ${sizeLabel(size.width, state.shape)} (${size.use})`)
                .appendTo($size)
        );
        $("<option>").val("custom").text("Custom width…").appendTo($size);
        // each kind of shape has its own usual size, so the choice starts again when the kind changes
        const group = state.shape.kind === "banner" ? "banner" : "tree";
        if (state.sizeGroup !== group) {
            state.sizeGroup = group;
            state.saveSize = defaultSizeFor(state.shape);
        } else if (state.saveSize !== "custom" && !sizes.some((size) => size.id === state.saveSize)) {
            state.saveSize = defaultSizeFor(state.shape);
        }
        $size.val(state.saveSize);
    }
    fillSizes();
    find("#suTreeBannerBackground").val(state.bannerBackground);
    find("#suTreeBannerWordColor").val(state.bannerWordColor);
    find("#suTreeBannerWords").val(state.bannerWords);
    find("#suTreeCustom").attr({ min: MIN_WIDTH, max: MAX_WIDTH }).val(state.customWidth);
    Object.entries(PAPERS).forEach(([id, paper]) =>
        $("<option>").val(id).text(paper.name).appendTo(find("#suTreePaper"))
    );
    $(container).empty().append($app);

    const svg = find("#suTreeSvg")[0];
    const tip = find("#suTreeTip")[0];
    const card = find("#suTreeCard")[0];
    const zoom = attachZoom(svg, undefined, () => frameOf(state.shape));
    let wordGroups = new Map();

    const say = (text, isError = false) =>
        find("#suTreeStatus").text(text).removeAttr("title").toggleClass("sutree-error", isError);
    const actionButtons = "#suTreeCopy, #suTreeSaveAs, #suTreeShuffle, #suTreeZoomIn, #suTreeZoomOut, #suTreeZoomReset";
    const wordFor = (text) => state.words.find((w) => w.text === text);

    // ---- Escape closes the card, and leaves full screen
    const onKey = (e) => {
        if (e.key !== "Escape") return;
        if (!unseen.hidden) closeUnseen();
        else if (!card.hidden) hideCard();
        else if ($app.hasClass("sutree-full")) toggleFull();
    };
    $(document).on("keydown.suTree", onKey);
    const toggleFull = () => {
        const full = $app.toggleClass("sutree-full").hasClass("sutree-full");
        find("#suTreeFull").text(full ? "Leave full screen" : "Full screen");
    };
    find("#suTreeFull").on("click", toggleFull);

    // ---- the controls
    const scopeInfo = () => scopeById(state.scope);
    function syncControls() {
        const scope = scopeInfo();
        const amount = state.amount[scope.id];
        find("#suTreeAmount").text(`${amount} ${amount === 1 ? scope.unit : scope.units}`);
        find("#suTreeFewer").prop("disabled", amount <= scope.min);
        find("#suTreeMore").prop("disabled", amount >= scope.max);
    }
    const typesText = () =>
        state.biological && state.adoptive
            ? "biological and adoptive"
            : state.biological
              ? "biological only"
              : "adoptive only";

    const emptyMessage = () => {
        if (!state.biological) {
            return "No adoptive connections were found for this person in this reach. Tick Biological as well to see the whole family.";
        }
        const kind = kindById(state.kind);
        if (state.kind === "middle" || state.kind === "given") {
            return `No ${kind.nouns} could be found. They may not be recorded, or the profiles may be private.`;
        }
        return state.scope === "cc7"
            ? `No ${kind.nouns} could be found. The people close to this profile may be private.`
            : `No ${kind.nouns} could be found. The ancestors may be private, or this profile may have no known parents.`;
    };

    // ---- drawing the tree from what has been loaded
    /** Choose who to show, lay the words out, and draw. */
    function refresh() {
        hideCard();
        closeUnseen();
        const chosen = chooseByRelation(state.raw.entries, state);
        state.words = groupNames(chosen, state.kind);
        // (a person with two first names is in two words, but is one person)
        state.people = new Set(state.words.flatMap((w) => w.entries)).size;
        $app.find(actionButtons).prop("disabled", !state.words.length);
        if (!state.words.length) {
            svg.replaceChildren();
            state.items = [];
            closeList();
            say(emptyMessage(), true);
            return;
        }
        // What the words fill: the picture the member chose, or an oak. Each seed is a different oak, so Shuffle changes the shape
        // of the tree as well as where the names go.
        state.shapeNote = "";
        let shape = null;
        if (state.shapeKind === "banner") {
            shape = buildBannerShape({
                background: state.bannerBackground,
                wordColor: state.bannerWords === "one" ? state.bannerWordColor : "",
            });
        } else if (state.shapeKind !== "tree" && state.picture) {
            shape = shapeFromPixels(state.picture.pixels, state.picture.rect, state.sensitivity, {
                leaveWhite: state.leaveWhite,
            });
            if (shape.coverage < MIN_COVERAGE) {
                shape = null;
                state.shapeNote =
                    " No shape could be found in that picture, so the oak is shown. Try the Cut-out slider, or another picture.";
                setShapeKind("tree");
            } else {
                shape.picture = backdropDataUrl(shape, state.picture.pixels);
            }
        }
        if (!shape) shape = buildTree(state.seed);
        if (shape.kind !== "banner") shape.look = state.look;
        state.shape = shape;
        fillSizes();
        state.items = layoutWords({
            words: state.words,
            measure: makeMeasure(),
            random: seededRandom(state.seed),
            fillGaps: state.fillGaps,
            masks: shape.kind === "image" || shape.kind === "banner" ? shape.masks : buildMasks(shape),
            look: shape.kind === "banner" ? "flat" : state.look, // the banner's words are packed tightly
            fonts: shape.kind === "banner" ? BANNER_FONTS : undefined,
        });
        // every word one colour, when the member chose one for the banner
        if (shape.kind === "banner" && shape.wordColor) state.items.forEach((item) => (item.color = shape.wordColor));
        // a word in a picture's shape has the colour of the picture under it
        if (shape.kind === "image") state.items.forEach((item) => (item.color = wordColour(shape, item)));
        wordGroups = renderTreeSvg(svg, state.items, shape).words;
        zoom.reset();
        const shown = wordGroups.size;
        const scope = scopeInfo();
        const kind = kindById(state.kind);
        state.caption =
            `${pluralize(state.words.length, kind.noun, kind.nouns)} from ${pluralize(
                state.people,
                "person",
                "people"
            )} ` + `(${scope.name}, ${state.amount[scope.id]} ${scope.units}, ${typesText()}).`;
        // the names that found no room are told: the first few in the note, and more when the pointer rests on it
        const left = state.words.filter((w) => !wordGroups.has(w.text)).map((w) => w.text);
        const unseenText = unseenNote(left, kind.noun, kind.nouns, UNSEEN_LISTED);
        const cut = state.raw.truncated ? " Only the first 60,000 people were read." : "";
        say(
            `${state.caption}${unseenText}${cut}${state.shapeNote} Hover a ${kind.noun} to see how many profiles it has, and click it to list them.`
        );
        if (left.length > UNSEEN_LISTED) {
            state.unseen = left;
            $("<button>", { "type": "button", "class": "sutree-linkbutton", "aria-haspopup": "dialog" })
                .text("See the list")
                .on("click", openUnseen)
                .appendTo(find("#suTreeStatus").append(" "));
        }
        if (state.selected) {
            if (wordFor(state.selected)) openList(state.selected, state.listShown);
            else closeList();
        }
    }

    /** Ask the API for the reach and amount chosen (unless already loaded), then draw. */
    async function load() {
        const request = ++state.request;
        const { scope } = state;
        const amount = state.amount[scope];
        const cacheKey = `${scope}:${amount}`;
        syncControls();
        if (!state.loaded[cacheKey]) {
            say("Counting names...");
            $app.find(actionButtons).prop("disabled", true);
            try {
                state.loaded[cacheKey] = await fetchScope(scope, key, amount, (count) => {
                    if (request === state.request)
                        say(`Counting names... ${pluralize(count, "profile", "profiles")} read so far.`);
                });
            } catch (e) {
                if (request === state.request)
                    say("WikiTree could not be reached, so the tree could not be drawn.", true);
                return;
            }
        }
        if (request !== state.request) return; // the member changed the choice while this was loading
        state.raw = state.loaded[cacheKey];
        const root = state.raw.entries.find((e) => Number(e.person.Id) === Number(state.raw.rootId));
        state.name = root ? fullName(root.person) : state.name;
        state.id = (root && root.person.Name) || state.id;
        refresh();
    }

    // the names are all in what has been loaded, so changing the kind of name only draws again
    find("#suTreeKind").on("change", (e) => {
        state.kind = e.target.value;
        closeList(); // the old list was of another kind of name
        if (state.raw.entries.length) refresh();
    });
    const redraw = () => state.raw.entries.length && refresh();
    find("#suTreeLook").on("change", (e) => {
        state.look = e.target.value;
        redraw();
    });

    // ---- the shape: a drawn oak, a picture that comes with the view, or a picture of the member's own
    /** Show the controls that go with the shape: choosing a picture, how much of it to cut out, and whether white is left empty. */
    function setShapeKind(kind) {
        state.shapeKind = kind;
        find("#suTreeShapeKind").val(kind);
        const banner = kind === "banner";
        find("#suTreeChoose").prop("hidden", kind !== "image");
        find("#suTreeSenseLabel").prop("hidden", kind === "tree" || banner);
        find("#suTreeWhiteLabel").prop("hidden", kind === "tree" || banner);
        // the banner has its own colours; the look (shaded, flat, outlined) is for the trees
        find("#suTreeBannerBox").prop("hidden", !banner);
        find("#suTreeBannerWordColor").prop("hidden", state.bannerWords !== "one");
        find("#suTreeLook").prop("disabled", banner);
        find(".sutree-stage").toggleClass("sutree-banner", banner);
        find("#suTreeWhite").prop("checked", state.leaveWhite);
        if (kind === "image" && state.mine) {
            find("#suTreeChoose").attr("title", `Using ${state.mine.name}. Choose another picture`);
        }
    }
    const chooseFile = () => find("#suTreeFile")[0].click();

    /**
     * "My picture" was chosen and there is no picture yet. The file chooser is opened at once where the browser allows it, but
     * Safari only opens one from a click on a button, not from choosing in a menu, so the Choose picture button is shown too,
     * with a note saying to click it. Until a picture is chosen the tree stays as it was.
     */
    function askForPicture() {
        find("#suTreeShapeKind").val("image");
        find("#suTreeChoose").prop("hidden", false);
        say("Click Choose picture… to pick a picture from your computer.");
        chooseFile();
    }

    /** Use a picture that comes with the view, loading it the first time. */
    async function useBuiltIn(picture) {
        try {
            if (!state.pictures[picture.id]) {
                say("Loading the picture...");
                state.pictures[picture.id] = {
                    ...(await readImageUrl(state.imagesUrl + picture.file)),
                    name: picture.name,
                };
            }
            state.picture = state.pictures[picture.id];
            state.leaveWhite = picture.leaveWhite;
            setShapeKind(picture.id);
            redraw();
        } catch (error) {
            say(error.message, true);
            setShapeKind(state.shapeKind); // back to what was working
        }
    }

    find("#suTreeShapeKind").on("change", (e) => {
        const choice = e.target.value;
        if (choice === "tree") {
            setShapeKind("tree");
            return redraw();
        }
        if (choice === "banner") {
            setShapeKind("banner");
            return redraw();
        }
        if (choice === "image") {
            if (!state.mine) return askForPicture(); // setShapeKind follows once there is a picture
            state.picture = state.mine;
            state.leaveWhite = false;
            setShapeKind("image");
            return redraw();
        }
        useBuiltIn(BUILT_IN_PICTURES.find((picture) => picture.id === choice));
    });
    find("#suTreeChoose").on("click", chooseFile);
    // the banner's colours: the words (the canopy's greens, or one colour) and what is behind them
    find("#suTreeBannerWords").on("change", (e) => {
        state.bannerWords = e.target.value;
        find("#suTreeBannerWordColor").prop("hidden", state.bannerWords !== "one");
        redraw();
    });
    find("#suTreeBannerWordColor").on("input change", (e) => {
        state.bannerWordColor = e.target.value;
        redraw();
    });
    find("#suTreeBannerBackground").on("input change", (e) => {
        state.bannerBackground = e.target.value;
        redraw();
    });
    find("#suTreeFile").on("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = ""; // so the same picture can be chosen again
        if (!file) return setShapeKind(state.shapeKind);
        say("Reading the picture...");
        try {
            state.mine = { ...(await readImageFile(file)), name: file.name };
            state.picture = state.mine;
            state.leaveWhite = false;
            setShapeKind("image");
            redraw();
        } catch (error) {
            say(error.message, true);
            setShapeKind(state.shapeKind);
        }
    });
    // the file chooser was closed without a choice
    find("#suTreeFile").on("cancel", () => setShapeKind(state.shapeKind));
    find("#suTreeWhite").on("change", (e) => {
        state.leaveWhite = e.target.checked;
        redraw();
    });
    find("#suTreeSense").on("change", (e) => {
        state.sensitivity = Number(e.target.value);
        redraw();
    });

    find("#suTreeScope").on("change", (e) => {
        state.scope = e.target.value;
        load();
    });
    const step = (by) => {
        const scope = scopeInfo();
        state.amount[scope.id] = clampAmount(scope.id, state.amount[scope.id] + by);
        load();
    };
    find("#suTreeFewer").on("click", () => step(-1));
    find("#suTreeMore").on("click", () => step(1));
    find("#suTreeBio, #suTreeAdopt").on("change", (e) => {
        const biological = find("#suTreeBio").prop("checked");
        const adoptive = find("#suTreeAdopt").prop("checked");
        if (!biological && !adoptive) {
            // there has to be someone to show: put back the one just taken off
            const undo = e.target.id === "suTreeBio" ? "#suTreeBio" : "#suTreeAdopt";
            find(undo).prop("checked", true);
            return say("Keep at least one of Biological and Adoptive ticked.", true);
        }
        state.biological = biological;
        state.adoptive = adoptive;
        refresh();
    });
    find("#suTreeFill").on("change", (e) => {
        state.fillGaps = e.target.checked;
        if (state.words.length) refresh();
    });
    find("#suTreeShuffle").on("click", () => {
        state.seed = (state.seed + 0x9e3779b9) >>> 0;
        refresh();
    });
    find("#suTreeZoomIn").on("click", () => zoom.zoomIn());
    find("#suTreeZoomOut").on("click", () => zoom.zoomOut());
    find("#suTreeZoomReset").on("click", () => zoom.reset());

    // ---- hovering a surname: how many profiles; clicking it: who they are
    let hot = "";
    function setHot(surname) {
        if (hot === surname) return;
        (wordGroups.get(hot) || []).forEach((g) => g.classList.remove("is-hot"));
        hot = surname;
        (wordGroups.get(hot) || []).forEach((g) => g.classList.add("is-hot"));
        svg.classList.toggle("sutree-hovering", !!hot);
    }
    const surnameAt = (target) => target.closest && target.closest(".sutree-word")?.dataset.surname;

    function showTip(event, surname) {
        const word = wordFor(surname);
        if (!word) return;
        const stage = find(".sutree-stage")[0];
        const rect = stage.getBoundingClientRect();
        // a name seen more than once has small copies that fill the gaps; say so, since it can look like a mistake
        const copies = (wordGroups.get(surname) || []).length;
        tip.innerHTML =
            `<b></b> <span class="sutree-tip-count"></span><div class="sutree-tip-hint">Click to list them</div>` +
            (copies > 1
                ? `<div class="sutree-tip-hint">This name is shown ${copies} times. The small copies fill the gaps; untick Fill the gaps to see each name once.</div>`
                : "");
        tip.querySelector("b").textContent = surname;
        tip.querySelector(".sutree-tip-count").textContent = countText(word);
        tip.style.left = `${Math.max(4, Math.min(event.clientX - rect.left + 14, rect.width - 260))}px`;
        tip.style.top = `${Math.max(4, Math.min(event.clientY - rect.top + 14, rect.height - 70))}px`;
        tip.style.opacity = "1";
    }
    svg.addEventListener("mouseover", (event) => {
        const surname = surnameAt(event.target);
        if (surname) {
            setHot(surname);
            showTip(event, surname);
        }
    });
    svg.addEventListener("mousemove", (event) => {
        const surname = surnameAt(event.target);
        if (surname) showTip(event, surname);
    });
    svg.addEventListener("mouseout", (event) => {
        if (surnameAt(event.relatedTarget || document.body) === hot) return; // still on the same surname
        setHot("");
        tip.style.opacity = "0";
    });
    svg.addEventListener("click", (event) => {
        const surname = surnameAt(event.target);
        if (surname && !zoom.wasDragged()) openList(surname);
    });
    svg.addEventListener("keydown", (event) => {
        const surname = surnameAt(event.target);
        if (surname && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openList(surname);
        }
    });

    const list = find("#suTreeList")[0];
    /** List everyone with the surname: full name, born and died, WikiTree ID, each linking to the profile. */
    function openList(surname, shown = PAGE_SIZE) {
        const word = wordFor(surname);
        if (!word) return;
        hideCard();
        tip.style.opacity = "0"; // the words move over when the list opens, so the note would be left where they were
        (wordGroups.get(state.selected) || []).forEach((g) => g.classList.remove("is-selected"));
        state.selected = surname;
        state.listShown = shown;
        (wordGroups.get(surname) || []).forEach((g) => g.classList.add("is-selected"));
        const built = listHtml(word, shown);
        state.listEntries = built.entries;
        find("#suTreeListName").text(surname);
        find("#suTreeListCount").text(countText(word));
        find("#suTreeListBody").html(built.html);
        list.hidden = false;
    }
    function closeList() {
        (wordGroups.get(state.selected) || []).forEach((g) => g.classList.remove("is-selected"));
        state.selected = "";
        list.hidden = true;
        hideCard();
    }
    find("#suTreeListClose").on("click", closeList);
    find("#suTreeListBody").on("click", ".sutree-more", () => openList(state.selected, state.listShown + PAGE_SIZE));
    // A click on a name or ID shows the person's card; a click with Ctrl, Cmd or Shift, or a middle click, still goes to the profile.
    find("#suTreeListBody").on("click", "a.sutree-name, a.sutree-id", (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return;
        e.preventDefault();
        const entry = state.listEntries[Number(e.currentTarget.dataset.index)];
        if (entry) showCard(entry, e.currentTarget);
    });

    /** The card: beside the list, level with the link that was clicked. */
    function showCard(entry, anchor) {
        card.innerHTML = cardHtml(entry);
        card.hidden = false;
        const main = find(".sutree-main")[0].getBoundingClientRect();
        const link = anchor.getBoundingClientRect();
        const listBox = list.getBoundingClientRect();
        card.style.right = `${Math.max(8, main.right - listBox.left + 10)}px`;
        card.style.top = `${Math.max(8, Math.min(link.top - main.top - 10, main.height - card.offsetHeight - 8))}px`;
    }
    // ---- the names that did not fit, when there are more than a few: a list with how many profiles each has
    const unseen = find("#suTreeUnseen")[0];
    function openUnseen() {
        const kind = kindById(state.kind);
        const { rows, more } = unseenRows(state.words, state.unseen || []);
        hideCard();
        find("#suTreeUnseenTitle").text(
            `${pluralize(state.unseen.length, `rarer ${kind.noun}`, `rarer ${kind.nouns}`)} did not fit`
        );
        find("#suTreeUnseenBody").html(
            `<p class="sutree-unseen-hint">There was no room left for these, even in small type. Click one to list its people.</p>` +
                `<ul class="sutree-unseen-list">${rows
                    .map(
                        (row) =>
                            `<li><button type="button" class="sutree-unseen-name" data-name="${escapeHtml(row.text)}">` +
                            `${escapeHtml(row.text)}</button> <span>${pluralize(row.count, "profile", "profiles")}</span></li>`
                    )
                    .join("")}</ul>` +
                (more
                    ? `<p class="sutree-unseen-hint">and ${more.toLocaleString()} more, each with fewer profiles.</p>`
                    : "")
        );
        unseen.hidden = false;
        find("#suTreeUnseenClose")[0].focus();
    }
    function closeUnseen() {
        unseen.hidden = true;
    }
    find("#suTreeUnseenClose").on("click", closeUnseen);
    find("#suTreeUnseenBody").on("click", ".sutree-unseen-name", (e) => {
        const name = e.currentTarget.dataset.name;
        closeUnseen();
        openList(name);
    });

    function hideCard() {
        card.hidden = true;
        card.innerHTML = "";
    }
    $(card).on("click", ".sutree-card-close", hideCard);

    // ---- Save as: the file type, and for a picture the size
    const $panel = find("#suTreeSavePanel");

    /** Show only the questions that go with the chosen file type, and say how big the picture will be. */
    function syncSavePanel() {
        const format = formatById(state.saveFormat);
        find("#suTreeSizeRow").prop("hidden", !format.sized);
        find("#suTreeCustomLabel").prop("hidden", !format.sized || state.saveSize !== "custom");
        find("#suTreePaperRow").prop("hidden", format.sized);
        const width = widthFor(state.saveSize, state.customWidth, state.shape);
        find("#suTreeSizeNote").text(
            !format.sized
                ? "A single page with the tree under its title."
                : width
                  ? `The picture will be ${sizeLabel(width, state.shape)}.`
                  : `Enter a width from ${MIN_WIDTH} to ${MAX_WIDTH.toLocaleString()} pixels.`
        );
        find("#suTreeSaveGo").prop("disabled", format.sized && !width);
    }
    const closePanel = () => {
        $panel.prop("hidden", true);
        find("#suTreeSaveAs").attr("aria-expanded", "false");
    };
    find("#suTreeSaveAs").on("click", () => {
        const open = $panel.prop("hidden");
        $panel.prop("hidden", !open);
        find("#suTreeSaveAs").attr("aria-expanded", String(open));
        if (open) syncSavePanel();
    });
    find("#suTreeSaveCancel").on("click", closePanel);
    $app.find('input[name="suTreeFormat"]').on("change", (e) => {
        state.saveFormat = e.target.value;
        syncSavePanel();
    });
    find("#suTreeSize").on("change", (e) => {
        state.saveSize = e.target.value;
        syncSavePanel();
    });
    find("#suTreeCustom").on("input", (e) => {
        state.customWidth = e.target.value;
        syncSavePanel();
    });
    find("#suTreePaper").on("change", (e) => {
        state.paper = e.target.value;
    });
    find("#suTreeSaveGo").on("click", async () => {
        const format = formatById(state.saveFormat);
        const width = format.sized ? widthFor(state.saveSize, state.customWidth, state.shape) : 0;
        if (format.sized && !width) return syncSavePanel();
        find("#suTreeSaveGo").prop("disabled", true);
        say("Preparing the file...");
        let blob = null;
        try {
            blob =
                format.id === "pdf"
                    ? await renderPdf(state.items, {
                          title: `${kindById(state.kind).title} of ${state.name || "this person"}`,
                          tree: state.shape,
                          caption: state.caption,
                          paper: state.paper,
                      })
                    : await renderImage(state.items, format.mime, width, state.shape);
        } catch (e) {
            blob = null;
        }
        find("#suTreeSaveGo").prop("disabled", false);
        if (!blob) {
            return say(
                format.sized
                    ? "The picture could not be made. That size may be too big for this browser, so try a smaller one."
                    : "The PDF could not be made.",
                true
            );
        }
        download(blob, exportFileName(state.id, format.id, width, kindById(state.kind).file));
        closePanel();
        say(`Saved as ${format.name}.`);
    });
    find("#suTreeCopy").on("click", async () => {
        try {
            const blob = await renderImage(
                state.items,
                "image/png",
                widthFor(defaultSizeFor(state.shape), "", state.shape),
                state.shape
            );
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            say("Copied. Paste it into a post or a document.");
        } catch (e) {
            say("This browser would not copy the picture. Use Save as instead.", true);
        }
    });

    load();
    return {
        destroy() {
            state.request++; // a load still under way is no longer wanted
            $(document).off("keydown.suTree");
            $app.remove();
        },
    };
}

/** An amount of generations or degrees, kept within what the + and - buttons allow (and the API can give). */
function clampAmount(scopeId, value) {
    const scope = scopeById(scopeId);
    return Math.min(scope.max, Math.max(scope.min, Number.isFinite(value) ? value : scope.start));
}

function download(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
