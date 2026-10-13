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
    layoutToFill,
    layoutWords,
    scopeById,
    BANNER_FONTS,
    DEFAULT_BANNER_BACKGROUND,
    DEFAULT_BANNER_WORD,
    buildBannerShape,
    frameOf,
    groupQuery,
    unseenNote,
    unseenRows,
    seededRandom,
} from "./name_cloud_core.js";
import { fetchScope } from "./name_cloud_data.js";
import {
    BUILT_IN_PICTURES,
    DEFAULT_SENSITIVITY,
    MAX_SENSITIVITY,
    MIN_COVERAGE,
    MIN_SENSITIVITY,
    PLAIN_EDGE_SHARE,
    backdropDataUrl,
    readImageFile,
    readImageUrl,
    shapeFromPixels,
    wordColour,
} from "./name_cloud_image.js";
import { inkOffsets, makeMeasure } from "./name_cloud_draw.js";
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
} from "./name_cloud_export.js";
import { PAGE_SIZE, cardHtml, countText, escapeHtml, listHtml } from "./name_cloud_list.js";
import { attachZoom, renderTreeSvg } from "./name_cloud_svg.js";

// The Name Cloud app itself: a chart drawn in a container, with its controls, list and card. mountApp is given the
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
        fillGaps: options.fillGaps === true, // repeats of the rarer names are for the member to ask for
        query: String(options.query || "").trim(), // what was typed for a category or a search
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
    <div class="ncloud-app">
      <div class="ncloud-dialog">
        <div class="ncloud-controls">
          <label>Cloud of <select id="ncloudKind"></select></label>
          <label>Look <select id="ncloudLook"></select></label>
          <label>Shape
            <select id="ncloudShapeKind">
              <option value="tree">Oak tree (drawn)</option>
              <option value="image">My picture</option>
              <option value="banner">Wide banner (profile background)</option>
            </select>
          </label>
          <span id="ncloudBannerBox" class="ncloud-bannerbox" hidden>
            <label>Words
              <select id="ncloudBannerWords">
                <option value="canopy">Greens of the canopy</option>
                <option value="one">One colour</option>
              </select>
            </label>
            <input type="color" id="ncloudBannerWordColor" aria-label="Colour of the words" hidden>
            <label>Background <input type="color" id="ncloudBannerBackground"></label>
          </span>
          <button type="button" id="ncloudChoose" title="Choose a picture to use as the shape" hidden>Choose picture…</button>
          <label id="ncloudSenseLabel" hidden title="Raise it to cut more of the background away; lower it to keep more of the picture">
            Cut-out <input type="range" id="ncloudSense" min="8" max="160" step="1">
          </label>
          <label id="ncloudWhiteLabel" hidden title="Leave the white parts of the picture empty, so a white design shows as a gap">
            <input type="checkbox" id="ncloudWhite"> Leave white empty
          </label>
          <label id="ncloudWholeLabel" hidden title="Use all of the picture as the shape, as for a photograph, rather than cutting a background away">
            <input type="checkbox" id="ncloudWhole"> Fill the whole picture
          </label>
          <input type="file" id="ncloudFile" accept="image/*" class="ncloud-file" tabindex="-1" aria-hidden="true">
          <label>Reach <select id="ncloudScope"></select></label>
          <span id="ncloudQueryBox" class="ncloud-querybox" hidden>
            <input type="text" id="ncloudQuery" size="38" autocomplete="off" spellcheck="false">
            <button type="button" id="ncloudGo">Draw</button>
          </span>
          <span class="ncloud-stepper" title="Go further out, or come back in">
            <button type="button" id="ncloudFewer" aria-label="One fewer">&minus;</button>
            <span id="ncloudAmount" aria-live="polite"></span>
            <button type="button" id="ncloudMore" aria-label="One more">+</button>
          </span>
          <span class="ncloud-show">
            <span>Show</span>
            <label title="Parents by birth, and their parents"><input type="checkbox" id="ncloudBio"> Biological</label>
            <label title="Adoptive, step and foster parents, and their families"><input type="checkbox" id="ncloudAdopt"> Adoptive</label>
          </span>
          <label><input type="checkbox" id="ncloudFill"> Fill the gaps</label>
          <button type="button" id="ncloudShuffle">Shuffle</button>
          <span class="ncloud-spacer"></span>
          <button type="button" id="ncloudZoomOut" title="Zoom out">Zoom &minus;</button>
          <button type="button" id="ncloudZoomIn" title="Zoom in (or scroll)">Zoom +</button>
          <button type="button" id="ncloudZoomReset" title="Show the whole picture">Reset</button>
          <button type="button" id="ncloudCopy" title="Copy the picture to paste into a post or document">Copy image</button>
          <button type="button" id="ncloudFull" title="Fill the screen">Full screen</button>
          <button type="button" id="ncloudSaveAs" aria-expanded="false" aria-controls="ncloudSavePanel" title="Save a picture or PDF">Save as…</button>
        </div>
        <div class="ncloud-save" id="ncloudSavePanel" hidden>
          <fieldset class="ncloud-formats">
            <legend>File type</legend>
          </fieldset>
          <div id="ncloudSizeRow" class="ncloud-save-row">
            <label>What size would you like? <select id="ncloudSize"></select></label>
            <label id="ncloudCustomLabel" hidden>Width <input type="number" id="ncloudCustom" step="100"> pixels</label>
          </div>
          <div id="ncloudPaperRow" class="ncloud-save-row" hidden>
            <label>Paper <select id="ncloudPaper"></select></label>
          </div>
          <div class="ncloud-save-row">
            <span id="ncloudSizeNote" class="ncloud-note"></span>
            <span class="ncloud-spacer"></span>
            <button type="button" id="ncloudSaveCancel">Cancel</button>
            <button type="button" id="ncloudSaveGo" class="ncloud-primary">Save</button>
          </div>
        </div>
        <div class="ncloud-main">
          <div class="ncloud-stage">
            <svg id="ncloudSvg" xmlns="http://www.w3.org/2000/svg"></svg>
            <div class="ncloud-tip" id="ncloudTip" role="tooltip"></div>
          </div>
          <aside class="ncloud-list" id="ncloudList" aria-label="People with this surname" hidden>
            <div class="ncloud-list-head">
              <span><strong id="ncloudListName"></strong> <span id="ncloudListCount"></span></span>
              <button type="button" id="ncloudListClose" aria-label="Close the list">&times;</button>
            </div>
            <div class="ncloud-list-body" id="ncloudListBody"></div>
          </aside>
          <div class="ncloud-card" id="ncloudCard" role="dialog" aria-label="Profile card" hidden></div>
          <div class="ncloud-unseen" id="ncloudUnseen" role="dialog" aria-label="Names that did not fit" hidden>
            <div class="ncloud-unseen-head">
              <strong id="ncloudUnseenTitle"></strong>
              <button type="button" id="ncloudUnseenClose" aria-label="Close the list">&times;</button>
            </div>
            <div class="ncloud-unseen-body" id="ncloudUnseenBody"></div>
          </div>
        </div>
        <p class="ncloud-status" id="ncloudStatus" role="status"></p>
      </div>
    </div>`);
    const find = (selector) => $app.find(selector);

    LOOKS.forEach((l) =>
        $("<option>")
            .val(l.id)
            .text(l.name)
            .prop("selected", l.id === state.look)
            .appendTo(find("#ncloudLook"))
    );
    find("#ncloudSense").attr({ min: MIN_SENSITIVITY, max: MAX_SENSITIVITY }).val(state.sensitivity);
    // the pictures that come with it go between the drawn oak and the member's own picture
    BUILT_IN_PICTURES.forEach((picture) =>
        $("<option>").val(picture.id).text(picture.name).insertBefore(find("#ncloudShapeKind option[value=image]"))
    );
    NAME_KINDS.forEach((k) =>
        $("<option>")
            .val(k.id)
            .text(k.name)
            .prop("selected", k.id === state.kind)
            .appendTo(find("#ncloudKind"))
    );
    SCOPES.forEach((scope) =>
        $("<option>")
            .val(scope.id)
            .text(scope.name)
            .attr("title", scope.hint)
            .prop("selected", scope.id === state.scope)
            .appendTo(find("#ncloudScope"))
    );
    find("#ncloudQuery").val(state.query);
    find("#ncloudBio").prop("checked", state.biological);
    find("#ncloudAdopt").prop("checked", state.adoptive);
    find("#ncloudFill").prop("checked", state.fillGaps);
    FORMATS.forEach((f) =>
        $("<label>")
            .append(
                $("<input>")
                    .attr({ type: "radio", name: "ncloudFormat", value: f.id })
                    .prop("checked", f.id === state.saveFormat)
            )
            .append(document.createTextNode(` ${f.name}`))
            .appendTo(find(".ncloud-formats"))
    );
    /** The sizes offered for the shape now shown (the banner's are wider), keeping the choice when it still exists. */
    function fillSizes() {
        const sizes = sizesFor(state.shape);
        const $size = find("#ncloudSize").empty();
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
    find("#ncloudBannerBackground").val(state.bannerBackground);
    find("#ncloudBannerWordColor").val(state.bannerWordColor);
    find("#ncloudBannerWords").val(state.bannerWords);
    find("#ncloudCustom").attr({ min: MIN_WIDTH, max: MAX_WIDTH }).val(state.customWidth);
    Object.entries(PAPERS).forEach(([id, paper]) =>
        $("<option>").val(id).text(paper.name).appendTo(find("#ncloudPaper"))
    );
    $(container).empty().append($app);

    const svg = find("#ncloudSvg")[0];
    const tip = find("#ncloudTip")[0];
    const card = find("#ncloudCard")[0];
    const zoom = attachZoom(svg, undefined, () => frameOf(state.shape));
    let wordGroups = new Map();

    const say = (text, isError = false) =>
        find("#ncloudStatus").text(text).removeAttr("title").toggleClass("ncloud-error", isError);
    const actionButtons = "#ncloudCopy, #ncloudSaveAs, #ncloudShuffle, #ncloudZoomIn, #ncloudZoomOut, #ncloudZoomReset";
    const wordFor = (text) => state.words.find((w) => w.text === text);

    // ---- Escape closes the card, and leaves full screen
    const onKey = (e) => {
        if (e.key !== "Escape") return;
        if (!unseen.hidden) closeUnseen();
        else if (!card.hidden) hideCard();
        else if ($app.hasClass("ncloud-full")) toggleFull();
    };
    $(document).on("keydown.ncloud", onKey);
    const toggleFull = () => {
        const full = $app.toggleClass("ncloud-full").hasClass("ncloud-full");
        find("#ncloudFull").text(full ? "Leave full screen" : "Full screen");
    };
    find("#ncloudFull").on("click", toggleFull);

    // ---- the controls
    const scopeInfo = () => scopeById(state.scope);
    function syncControls() {
        const scope = scopeInfo();
        const amount = state.amount[scope.id];
        find("#ncloudAmount").text(`${amount} ${amount === 1 ? scope.unit : scope.units}`);
        find("#ncloudFewer").prop("disabled", amount <= scope.min);
        find("#ncloudMore").prop("disabled", amount >= scope.max);
        // a category or a search has no generations or degrees, and no biological or adoptive family
        find(".ncloud-stepper, .ncloud-show").prop("hidden", !!scope.group);
        find("#ncloudQueryBox").prop("hidden", !scope.group);
        find("#ncloudQuery").attr("placeholder", scope.placeholder || "");
    }
    const typesText = () =>
        state.biological && state.adoptive
            ? "biological and adoptive"
            : state.biological
              ? "biological only"
              : "adoptive only";

    const emptyMessage = () => {
        if (scopeInfo().group) {
            const what = scopeInfo().what;
            return groupQuery(state.scope, state.query)
                ? `Nobody was found in that ${what}. Check how it is written${
                      what === "category" ? " (the name as on its WikiTree page)" : ", as WikiTree+ would take it"
                  }; private profiles are not counted.`
                : `Type the ${what === "category" ? "name of a category" : "WikiTree+ search"} above and press Draw.`;
        }
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
            const cut = (whole) =>
                shapeFromPixels(state.picture.pixels, state.picture.rect, state.sensitivity, {
                    leaveWhite: state.leaveWhite,
                    whole,
                });
            shape = cut(state.picture.whole === true);
            if (state.picture.whole === undefined) {
                // a photograph, with scenery to its edges, has no background to cut away: all of it is the shape
                state.picture.whole = shape.plainShare < PLAIN_EDGE_SHARE;
                if (state.picture.whole) shape = cut(true);
                find("#ncloudWhole").prop("checked", state.picture.whole);
            }
            find("#ncloudSense").prop("disabled", state.picture.whole === true); // nothing is cut away from a whole picture
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
        const layoutArgs = {
            words: state.words,
            measure: makeMeasure(),
            fillGaps: state.fillGaps,
            masks: shape.kind === "image" || shape.kind === "banner" ? shape.masks : buildMasks(shape),
            look: shape.kind === "banner" ? "flat" : state.look, // the banner's words are packed tightly
            fonts: shape.kind === "banner" ? BANNER_FONTS : undefined,
            ink: inkOffsets, // the names take up their letters' room, so short ones can go inside the O and the D of long ones
        };
        // a whole picture (a photograph) is filled right up, with the names as big as will let every one fit
        state.items = shape.whole
            ? layoutToFill({ ...layoutArgs, makeRandom: () => seededRandom(state.seed) })
            : layoutWords({ ...layoutArgs, random: seededRandom(state.seed) });
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
            )} ` +
            (scope.group
                ? `(${scope.name}: ${state.query}).`
                : `(${scope.name}, ${state.amount[scope.id]} ${scope.units}, ${typesText()}).`);
        // the names that found no room are told: the first few in the note, and more when the pointer rests on it
        const left = state.words.filter((w) => !wordGroups.has(w.text)).map((w) => w.text);
        const unseenText = unseenNote(left, kind.noun, kind.nouns, UNSEEN_LISTED);
        const cut = state.raw.truncated
            ? ` Only the first ${(state.raw.limit || 60000).toLocaleString()} people were read.`
            : "";
        say(
            `${state.caption}${unseenText}${cut}${state.shapeNote} Hover a ${kind.noun} to see how many profiles it has, and click it to list them.`
        );
        if (left.length > UNSEEN_LISTED) {
            state.unseen = left;
            $("<button>", { "type": "button", "class": "ncloud-linkbutton", "aria-haspopup": "dialog" })
                .text("See the list")
                .on("click", openUnseen)
                .appendTo(find("#ncloudStatus").append(" "));
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
        const group = scopeInfo().group;
        const query = group ? groupQuery(scope, state.query) : "";
        const amount = group ? query : state.amount[scope];
        const cacheKey = `${scope}:${amount}`;
        syncControls();
        if (group && !query) {
            // nothing to look for yet
            state.raw = { entries: [], truncated: false };
            return refresh();
        }
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
                    say("WikiTree could not be reached, so the word cloud could not be drawn.", true);
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
    find("#ncloudKind").on("change", (e) => {
        state.kind = e.target.value;
        closeList(); // the old list was of another kind of name
        if (state.raw.entries.length) refresh();
    });
    const redraw = () => state.raw.entries.length && refresh();
    find("#ncloudLook").on("change", (e) => {
        state.look = e.target.value;
        redraw();
    });

    // ---- the shape: a drawn oak, a picture that comes with the view, or a picture of the member's own
    /** Show the controls that go with the shape: choosing a picture, how much of it to cut out, and whether white is left empty. */
    function setShapeKind(kind) {
        state.shapeKind = kind;
        find("#ncloudShapeKind").val(kind);
        const banner = kind === "banner";
        find("#ncloudChoose").prop("hidden", kind !== "image");
        find("#ncloudSenseLabel").prop("hidden", kind === "tree" || banner);
        find("#ncloudWhiteLabel").prop("hidden", kind === "tree" || banner);
        // the banner has its own colours; the look (shaded, flat, outlined) is for the trees
        find("#ncloudBannerBox").prop("hidden", !banner);
        find("#ncloudBannerWordColor").prop("hidden", state.bannerWords !== "one");
        find("#ncloudLook").prop("disabled", banner);
        find(".ncloud-stage").toggleClass("ncloud-banner", banner);
        find("#ncloudWhite").prop("checked", state.leaveWhite);
        find("#ncloudWholeLabel").prop("hidden", kind === "tree" || banner);
        find("#ncloudWhole").prop("checked", !!(state.picture && state.picture.whole));
        if (kind === "image" && state.mine) {
            find("#ncloudChoose").attr("title", `Using ${state.mine.name}. Choose another picture`);
        }
    }
    const chooseFile = () => find("#ncloudFile")[0].click();

    /**
     * "My picture" was chosen and there is no picture yet. The file chooser is opened at once where the browser allows it, but
     * Safari only opens one from a click on a button, not from choosing in a menu, so the Choose picture button is shown too,
     * with a note saying to click it. Until a picture is chosen the tree stays as it was.
     */
    function askForPicture() {
        find("#ncloudShapeKind").val("image");
        find("#ncloudChoose").prop("hidden", false);
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
                    whole: false, // the pictures that come with the view are designs with a background to cut away
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

    find("#ncloudShapeKind").on("change", (e) => {
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
    find("#ncloudChoose").on("click", chooseFile);
    // the banner's colours: the words (the canopy's greens, or one colour) and what is behind them
    find("#ncloudBannerWords").on("change", (e) => {
        state.bannerWords = e.target.value;
        find("#ncloudBannerWordColor").prop("hidden", state.bannerWords !== "one");
        redraw();
    });
    find("#ncloudBannerWordColor").on("input change", (e) => {
        state.bannerWordColor = e.target.value;
        redraw();
    });
    find("#ncloudBannerBackground").on("input change", (e) => {
        state.bannerBackground = e.target.value;
        redraw();
    });
    find("#ncloudFile").on("change", async (e) => {
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
    find("#ncloudFile").on("cancel", () => setShapeKind(state.shapeKind));
    find("#ncloudWhole").on("change", (e) => {
        if (state.picture) state.picture.whole = e.target.checked;
        redraw();
    });
    find("#ncloudWhite").on("change", (e) => {
        state.leaveWhite = e.target.checked;
        redraw();
    });
    find("#ncloudSense").on("change", (e) => {
        state.sensitivity = Number(e.target.value);
        redraw();
    });

    find("#ncloudScope").on("change", (e) => {
        state.scope = e.target.value;
        load();
    });
    // a category or a search is drawn when the member presses Draw (or Enter), not at every key
    const draw = () => {
        state.query = String(find("#ncloudQuery").val()).trim();
        if (state.query) state.seed = hashString(state.query);
        closeList();
        load();
    };
    find("#ncloudGo").on("click", draw);
    find("#ncloudQuery").on("keydown", (e) => {
        if (e.key === "Enter") draw();
    });
    const step = (by) => {
        const scope = scopeInfo();
        state.amount[scope.id] = clampAmount(scope.id, state.amount[scope.id] + by);
        load();
    };
    find("#ncloudFewer").on("click", () => step(-1));
    find("#ncloudMore").on("click", () => step(1));
    find("#ncloudBio, #ncloudAdopt").on("change", (e) => {
        const biological = find("#ncloudBio").prop("checked");
        const adoptive = find("#ncloudAdopt").prop("checked");
        if (!biological && !adoptive) {
            // there has to be someone to show: put back the one just taken off
            const undo = e.target.id === "ncloudBio" ? "#ncloudBio" : "#ncloudAdopt";
            find(undo).prop("checked", true);
            return say("Keep at least one of Biological and Adoptive ticked.", true);
        }
        state.biological = biological;
        state.adoptive = adoptive;
        refresh();
    });
    find("#ncloudFill").on("change", (e) => {
        state.fillGaps = e.target.checked;
        if (state.words.length) refresh();
    });
    find("#ncloudShuffle").on("click", () => {
        state.seed = (state.seed + 0x9e3779b9) >>> 0;
        refresh();
    });
    find("#ncloudZoomIn").on("click", () => zoom.zoomIn());
    find("#ncloudZoomOut").on("click", () => zoom.zoomOut());
    find("#ncloudZoomReset").on("click", () => zoom.reset());

    // ---- hovering a surname: how many profiles; clicking it: who they are
    let hot = "";
    function setHot(surname) {
        if (hot === surname) return;
        (wordGroups.get(hot) || []).forEach((g) => g.classList.remove("is-hot"));
        hot = surname;
        (wordGroups.get(hot) || []).forEach((g) => g.classList.add("is-hot"));
        svg.classList.toggle("ncloud-hovering", !!hot);
    }
    const surnameAt = (target) => target.closest && target.closest(".ncloud-word")?.dataset.surname;

    function showTip(event, surname) {
        const word = wordFor(surname);
        if (!word) return;
        const stage = find(".ncloud-stage")[0];
        const rect = stage.getBoundingClientRect();
        // a name seen more than once has small copies that fill the gaps; say so, since it can look like a mistake
        const copies = (wordGroups.get(surname) || []).length;
        tip.innerHTML =
            `<b></b> <span class="ncloud-tip-count"></span><div class="ncloud-tip-hint">Click to list them</div>` +
            (copies > 1
                ? `<div class="ncloud-tip-hint">This name is shown ${copies} times. The small copies fill the gaps; untick Fill the gaps to see each name once.</div>`
                : "");
        tip.querySelector("b").textContent = surname;
        tip.querySelector(".ncloud-tip-count").textContent = countText(word);
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

    const list = find("#ncloudList")[0];
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
        find("#ncloudListName").text(surname);
        find("#ncloudListCount").text(countText(word));
        find("#ncloudListBody").html(built.html);
        list.hidden = false;
    }
    function closeList() {
        (wordGroups.get(state.selected) || []).forEach((g) => g.classList.remove("is-selected"));
        state.selected = "";
        list.hidden = true;
        hideCard();
    }
    find("#ncloudListClose").on("click", closeList);
    find("#ncloudListBody").on("click", ".ncloud-more", () => openList(state.selected, state.listShown + PAGE_SIZE));
    // A click on a name or ID shows the person's card; a click with Ctrl, Cmd or Shift, or a middle click, still goes to the profile.
    find("#ncloudListBody").on("click", "a.ncloud-name, a.ncloud-id", (e) => {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2) return;
        e.preventDefault();
        const entry = state.listEntries[Number(e.currentTarget.dataset.index)];
        if (entry) showCard(entry, e.currentTarget);
    });

    /** The card: beside the list, level with the link that was clicked. */
    function showCard(entry, anchor) {
        card.innerHTML = cardHtml(entry);
        card.hidden = false;
        const main = find(".ncloud-main")[0].getBoundingClientRect();
        const link = anchor.getBoundingClientRect();
        const listBox = list.getBoundingClientRect();
        card.style.right = `${Math.max(8, main.right - listBox.left + 10)}px`;
        card.style.top = `${Math.max(8, Math.min(link.top - main.top - 10, main.height - card.offsetHeight - 8))}px`;
    }
    // ---- the names that did not fit, when there are more than a few: a list with how many profiles each has
    const unseen = find("#ncloudUnseen")[0];
    function openUnseen() {
        const kind = kindById(state.kind);
        const { rows, more } = unseenRows(state.words, state.unseen || []);
        hideCard();
        find("#ncloudUnseenTitle").text(
            `${pluralize(state.unseen.length, `rarer ${kind.noun}`, `rarer ${kind.nouns}`)} did not fit`
        );
        find("#ncloudUnseenBody").html(
            `<p class="ncloud-unseen-hint">There was no room left for these, even in small type. Click one to list its people.</p>` +
                `<ul class="ncloud-unseen-list">${rows
                    .map(
                        (row) =>
                            `<li><button type="button" class="ncloud-unseen-name" data-name="${escapeHtml(row.text)}">` +
                            `${escapeHtml(row.text)}</button> <span>${pluralize(row.count, "profile", "profiles")}</span></li>`
                    )
                    .join("")}</ul>` +
                (more
                    ? `<p class="ncloud-unseen-hint">and ${more.toLocaleString()} more, each with fewer profiles.</p>`
                    : "")
        );
        unseen.hidden = false;
        find("#ncloudUnseenClose")[0].focus();
    }
    function closeUnseen() {
        unseen.hidden = true;
    }
    find("#ncloudUnseenClose").on("click", closeUnseen);
    find("#ncloudUnseenBody").on("click", ".ncloud-unseen-name", (e) => {
        const name = e.currentTarget.dataset.name;
        closeUnseen();
        openList(name);
    });

    function hideCard() {
        card.hidden = true;
        card.innerHTML = "";
    }
    $(card).on("click", ".ncloud-card-close", hideCard);

    // ---- Save as: the file type, and for a picture the size
    const $panel = find("#ncloudSavePanel");

    /** Show only the questions that go with the chosen file type, and say how big the picture will be. */
    function syncSavePanel() {
        const format = formatById(state.saveFormat);
        find("#ncloudSizeRow").prop("hidden", !format.sized);
        find("#ncloudCustomLabel").prop("hidden", !format.sized || state.saveSize !== "custom");
        find("#ncloudPaperRow").prop("hidden", format.sized);
        const width = widthFor(state.saveSize, state.customWidth, state.shape);
        find("#ncloudSizeNote").text(
            !format.sized
                ? "A single page with the word cloud under its title."
                : width
                  ? `The picture will be ${sizeLabel(width, state.shape)}.`
                  : `Enter a width from ${MIN_WIDTH} to ${MAX_WIDTH.toLocaleString()} pixels.`
        );
        find("#ncloudSaveGo").prop("disabled", format.sized && !width);
    }
    const closePanel = () => {
        $panel.prop("hidden", true);
        find("#ncloudSaveAs").attr("aria-expanded", "false");
    };
    find("#ncloudSaveAs").on("click", () => {
        const open = $panel.prop("hidden");
        $panel.prop("hidden", !open);
        find("#ncloudSaveAs").attr("aria-expanded", String(open));
        if (open) syncSavePanel();
    });
    find("#ncloudSaveCancel").on("click", closePanel);
    $app.find('input[name="ncloudFormat"]').on("change", (e) => {
        state.saveFormat = e.target.value;
        syncSavePanel();
    });
    find("#ncloudSize").on("change", (e) => {
        state.saveSize = e.target.value;
        syncSavePanel();
    });
    find("#ncloudCustom").on("input", (e) => {
        state.customWidth = e.target.value;
        syncSavePanel();
    });
    find("#ncloudPaper").on("change", (e) => {
        state.paper = e.target.value;
    });
    find("#ncloudSaveGo").on("click", async () => {
        const format = formatById(state.saveFormat);
        const width = format.sized ? widthFor(state.saveSize, state.customWidth, state.shape) : 0;
        if (format.sized && !width) return syncSavePanel();
        find("#ncloudSaveGo").prop("disabled", true);
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
        find("#ncloudSaveGo").prop("disabled", false);
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
    find("#ncloudCopy").on("click", async () => {
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
            $(document).off("keydown.ncloud");
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
