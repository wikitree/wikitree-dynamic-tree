/**
 * SlippyTree consists of two classes: SlippyTree itself, and the SlippyTreePerson.
 *
 * The init() method sets up, then the person is requested with "load()", which stores
 * the people in both an array (this.people) and a map (this.byid, which is keyed on both
 * the numeric ID and the "public" ID, eg "Windsor-1"). Relationships are added between
 * the people at this time.
 *
 * The "setFocus" method takes a person and rebuilds the tree from that position (most of
 * this work being done in placeNodes()), before calling draw() on the next animation
 * frame. This needs to be fast - it changes the node positions only and calls
 * "reposition()", which resizes the SVG and positions the scrollPane. This also needs
 * to be fast, as its called when scale or scroll takes place.
 *
 * The final operation in setFocus() is checkForUnloadedChildren(), which checks all loaded
 * nodes to see if they have children by making a second, limited call to "getPeople()".
 * This is done asynchronously while the draw is going on - it may add edges to the tree,
 * but nothing that requires new layout. Ideally this would not be necessary but until we
 * can request a "Children" property, it is.
 *
 * The popup menu is created in the tree init() method, and actions set with "data-action"
 * on the menu item. When selected, SlippyPerson.action is called with that action.
 */

if (typeof View == "undefined") {
    globalThis.View = () => {};
} // To allow debugging in node.js

class SlippyTree extends View {
    #SCROLLSTEP_WHEEL = 0.0015; // Was 0.01, then 0.005
    #SCROLLSTEP_KEYS = 1.1; // Was 1.2
    #PATHPREFIX;
    static loadCount = 0;
    LIVINGPEOPLE = "Highlight living people";
    #VIEWPARAM = "slippyTreeState"; // Param to store details of current view in window location
    #VERSION = 0; // URLs may last over time, plan for extension
    #APIURL = "https://api.wikitree.com/api.php";
    #APPID = "SlippyTree";
    #HTML = "http://www.w3.org/1999/xhtml";
    #SVG = "http://www.w3.org/2000/svg";
    #MINSCALE = 0.2;
    #MAXSCALE = 3;
    #TAGSIZE = 20;
    settings;

    /**
     * Props is an (optional) map with the following keys
     *  - trackpad: if true, the mousewheel is identified a trackpad, if false it's a mouse. Optional, will auto-detect by default
     *  - profileTarget: the target for any links to profiles, eg "_blank". Optional
     *  - dragScrollReversed: set to true to inverse the way drag-scrolling works. Optional.
     *  - bundleSpouses: how many depths of spouses to bundle together in the tree - 1 includes spouses of the person, 2 includes their
     *          spouses (so long as they have no other home in the tree), and so on. 0 disables bundling. Default is 1
     */
    init(container_selector, person_id, props) {
        this.browser = typeof window != "undefined"; // The code is sometimes debugged locally in nodejs too.
        this.state = { debug: {} };
        this.state.props = props || {};
        this.debug =
            typeof this.state.props.debug == "boolean"
                ? this.state.props.debug
                : this.browser
                ? window.deubgLoggingOn
                : true;
        this.state.container =
            typeof container_selector == "string" ? document.querySelector(container_selector) : container_selector;

        try {
            this.settings = JSON.parse(window.localStorage.getItem("slippyTree-settings"));
        } catch (e) {}
        if (!this.settings) {
            let hasMouse = this.browser && !window.matchMedia("not (hover: hover)").matches; // true if MQ recognised and primary device has no hover.
            this.settings = {
                wheel: hasMouse ? "zoom" : "scroll",
            };
        }

        //        console.log("Setup: hasTrackpad="+this.hasTrackpad+" hasMouse="+this.hasMouse);
        const content = `

<div class="slippy-tree-container" tabindex="0">
 <div class="slippy-tree-scrollpane">
  <svg xmlns="http://www.w3.org/2000/svg" class="slippy-tree">
   <defs>
    <linearGradient id="unloaded-father">
     <stop offset="0%" style="stop-color: var(--father-transparent)"/>
     <stop offset="100%" style="stop-color: var(--father)"/>
    </linearGradient>
    <linearGradient id="unloaded-mother">
     <stop offset="0%" style="stop-color: var(--mother-transparent)"/>
     <stop offset="100%" style="stop-color: var(--mother)"/>
    </linearGradient>
    <linearGradient id="father-unloaded">
     <stop offset="0%" style="stop-color: var(--father)"/>
     <stop offset="100%" style="stop-color: var(--father-transparent)"/>
    </linearGradient>
    <linearGradient id="mother-unloaded">
     <stop offset="0%" style="stop-color: var(--mother)"/>
     <stop offset="100%" style="stop-color: var(--mother-transparent)"/>
    </linearGradient>
    <linearGradient id="spouse-unloaded">
     <stop offset="0%" style="stop-color: var(--spouse-transparent)"/>
     <stop offset="100%" style="stop-color: var(--spouse)"/>
    </linearGradient>
   </defs>
   <g class="container">
    <g class="relations"></g>
    <g class="labels"></g>
    <g class="people"></g>
   </g>
  </svg>

  <div class="slippy-person-menu hidden">
   <div><span class="output-name text-selectable"></span><img src="{PATHPREFIX}views/slippyTree/resources/copy.svg"/></div>
   <div class="slippy-focusable" data-shortcut="f" data-action="focus"><em>F</em>ocus</div>
   <div class="slippy-focusable" data-shortcut="l" data-action="nuclear"><em>L</em>oad family</div>
   <div class="slippy-focusable" data-shortcut="a" data-action="ancestors">Load <em>a</em>ncestors</div>
   <div class="slippy-focusable" data-shortcut="d" data-action="descendants">Load <em>d</em>escendants</div>
   <div class="slippy-focusable" data-shortcut="b" data-action="prune">Prune to this <em>b</em>ranch</div>
   <div class="slippy-focusable" data-shortcut="r" data-action="remove"><em>R</em>emove</div>
   <div class="slippy-focusable" data-shortcut="s" data-action="search"><em>S</em>earch...
     <div class="slippy-search-menu" class="hidden">
      <div class="slippy-search-list" class="hidden"></div>
      <input class="slippy-search-id" type="search" size="12" spellcheck="false" writingsuggestions="off" autocorrect="off" autocomplete="off" placeholder="Search..."/>
      <span class="slippy-search-family selected"></span>
     </div>
   </div>
   <a class="slippy-focusable" data-shortcut="p" data-action="profile">View <em>p</em>rofile</a>
  </div>

 </div>

 <div class="relationshipName"></div>

 <a class="slippy-help-button"></a>
 <a class="slippy-fullscreen-button"></a>
 <div class="slippy-loader"></div>
 <div class="helpContainer">
  <div>
   <div class="helpCloseButton">&#x2715;</div>
   <h1 style="margin:0 0 0.5em 0">The Slippy Tree</h1>
   <svg class="slippy-tree" width="500" height="140" style="display:block">
    <defs>
     <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" />
     </marker>
    </defs>
    <g transform="translate(0 20)">
     <g class="relations">
      <path class="father" d="M 639 19 C 594 19 594 56 549 56" transform="translate(-239 0)"></path>
      <path class="father uncertain" d="M 639 59 C 594 59 594 86 549 86" transform="translate(-239 0)"></path>
      <path class="spouse" d="M 2.5 20 C 2.5 40 2.5 40 10.5 40" transform="translate(-100 0)"></path>
      <path class="father dna focus" d="M 339 26 C 289.25 26 289.25 10 239.5 10" transform="translate(-139 0)"></path>
      <path class="mother nonbiological focus" d="M 339 26 C 294.25 26 294.25 40 249.5 40" transform="translate(-139 0)"></path>
      <path class="spouse focus" d="M 341 36 C 341 56 341 56 349 56" transform="translate(-139 0)"></path>
      <path class="spouse focus" d="M 341 36 C 341 86 341 86 349 86" transform="translate(-139 0)"></path>
      <path class="mother confident focus" d="M 639 19 C 589 19 589 26 539 26" transform="translate(-239 0)"></path>
      <path class="mother focus" d="M 639 59 C 589 59 589 26 539 26" transform="translate(-239 0)"></path>
      <path class="unloaded-father confident" d="M 339 26 C 319.25 26 319.25 16 289.5 16" transform="translate(-299 -17)"></path>
      <path class="father-unloaded" d="M 279 10 L 239.5 11" transform="translate(219 50)"></path>
      <path class="spouse-unloaded" d="M 339 26 C 329 26 329 46 329 46" transform="translate(-290 16)"></path>
      <path class="noissue" d="M 460 19 l 5 0 m 0 -8 l 0 16"></path>
     </g>
     <g class="labels">
      <text class="marriage focus" x="245" y="41">Marriage Date</text>
     </g>
     <g class="people">
      <g class="female member focus" transform="translate(200 16)">
       <rect height="20" width="100"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="50">Focus</text>
      </g>
      <g class="male spouse" transform="translate(210 46)">
       <rect height="20" width="100"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="50">First Spouse</text>
      </g>
      <g class="male spouse" transform="translate(210 76)">
       <rect height="20" width="100"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="50">Second Spouse</text>
      </g>
      <g class="male highlight" transform="translate(400 9)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="30">Child</text>
      </g>
      <g class="male member privacy-semiopen" transform="translate(400 49)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="30">Child</text>
      </g>
      <g class="male" transform="translate(40 0)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="30">Father</text>
      </g>
      <g class="female spouse" transform="translate(50 30)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H {TAGSIZE} L 0 {TAGSIZE} Z"></path>
       <text y="14" x="30">Mother</text>
      </g>
     </g>
     <g class="labels">
      <path d="M 330 -4 L 350 14" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="320" y="-6">Mother is confident</text>
      <path d="M 130 60 L 140 44" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="130" y="70">Mother is non-biological</text>
      <path d="M 180 -4 L 160 10" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <path d="M 165 85 L 197 75" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="190" y="-6">Father is confirmed with DNA</text>
      <text x="140" y="90">Marriage</text>
      <path d="M 350 100 L 340 86" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="350" y="110">Father is uncertain</text>
      <path d="M 415 -5 L 410 6" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="410" y="-8">Highlight</text>
      <path d="M 410 85 L 407 59" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="400" y="98">WikiTree Member</text>
      <path d="M 20 85 L 17 12" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="50" y="98">Ancestors to load</text>
      <path d="M 480 110 L 490 69" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="450" y="118">Descendants to load</text>
      <path d="M 50 72 L 46 57" stroke="black" fill="none" marker-end="url(#arrow)"/>
      <text x="70" y="85">Spouse to load</text>
      <text x="480" y="-8">No Issue</text>
      <path d="M 470 -5 L 467 7" stroke="black" fill="none" marker-end="url(#arrow)"/>
     </g>
    </g>
   </svg>
   <p class="slippy-about">
    A multi-root tree showing several parent and child relationships at once.<br/>
    Spouses are displayed together, refocus to change the order.
   </p>
   <div class="slippy-settings-view">
    <select class="slippy-categories"></select>
    <input type="checkbox" class="slippy-settings-male"/>
    <input type="checkbox" class="slippy-settings-female"/>
   </div>
   <div class="slippy-settings-wheel">
    <div class="slippy-settings-wheel-zoom">
     <img src="{PATHPREFIX}views/slippyTree/resources/mouse.svg"/>
     <span>Scroll-wheel zooms (best for mouse)</span>
    </div>
    <div class="slippy-settings-wheel-scroll">
     <img src="{PATHPREFIX}views/slippyTree/resources/trackpad.svg"/>
     <span>Scroll-wheel scrolls (best for trackpad)</span>
    </div>
    <p style="margin:0.5em 0 0 0">
    Cursor keys navigate, +/- to zoom
    <a href="" class="download-link">Download Current View</a>
    </p>
   </div>
   <div class="icon-attribution">Icons by Andrew Nielsen and Simon Sim via the <a href="http://thenounproject.com">Noun Project</a> (CC BY 3.0)</div>
  </div>
 </div>
</div>

`;

        this.state.people = [];
        this.state.byid = {};
        this.state.view = { scale: 1, cx: 0, cy: 0 };
        this.state.focus = null;
        this.state.refocusStart = null;
        this.state.refocusEnd = null;

        if (this.browser) {
            if (window.location.host == "apps.wikitree.com") {
                this.#PATHPREFIX = "";
            } else {
                this.#PATHPREFIX = "/wikitree-dynamic-tree/";
            }
            document.documentElement.classList.add("slippy-tree-root");
            this.state.container.style = ""; // Reset it, as some other tree types set style properties on it
            this.state.container.innerHTML = content
                .replace(/\{TAGSIZE\}/g, this.#TAGSIZE)
                .replace(/\{PATHPREFIX\}/g, this.#PATHPREFIX)
                .trim();

            this.setSettings();
            this.state.scrollPane = this.state.container.querySelector(".slippy-tree-scrollpane");
            const keyboardFocusContainer = this.state.container.querySelector(".slippy-tree-container");
            this.state.svg = this.state.container.querySelector(".slippy-tree-scrollpane > svg");
            this.state.personMenu = this.state.container.querySelector(".slippy-person-menu");
            this.state.searchMenu = this.state.container.querySelector(".slippy-search-menu");
            this.state.searchInput = this.state.container.querySelector(".slippy-search-id");
            this.state.searchList = this.state.container.querySelector(".slippy-search-list");
            const helpButton = this.state.container.querySelector(".slippy-help-button");
            const helpContainer = this.state.container.querySelector(".helpContainer");
            const helpBox = helpContainer.querySelector(":scope > :first-child");
            helpButton.addEventListener("click", (e) => {
                this.showMenu(false);
                this.showHelp(helpContainer.classList.contains("hidden"));
            });
            this.state.container.querySelector(".slippy-fullscreen-button").addEventListener("click", (e) => {
                // This is a bodge. To animate the full-screen animation, we first have to calculate the
                // heights we are animating from (because they're auto initially). Do that when the animation
                // to fullscreen continues, and set on variables which override the "auto" values in the
                // stylesheet. These values are removed on close()
                if (!document.documentElement.classList.contains("slippy-fullscreen")) {
                    try {
                        document.querySelectorAll("header, footer, .tabs--wrapper").forEach((e) => {
                            e.style.setProperty("--slippy-computed-height", getComputedStyle(e).height);
                        });
                    } catch (e) {}
                    document.documentElement.classList.add("slippy-fullscreen");
                } else {
                    document.documentElement.classList.remove("slippy-fullscreen");
                }
            });
            helpBox.addEventListener("click", (e) => {
                this.showHelp(false);
            });
            document.querySelector(".slippy-settings-wheel-zoom").addEventListener("click", (e) => {
                this.setSettings({ wheel: "zoom" }, e);
            });
            document.querySelector(".slippy-settings-wheel-scroll").addEventListener("click", (e) => {
                this.setSettings({ wheel: "scroll" }, e);
            });
            document.querySelector(".slippy-categories").addEventListener("click", (e) => {
                e.stopPropagation();
            });
            document.querySelector(".slippy-settings-male").addEventListener("change", (e) => {
                this.setSettings({ male: !this.settings.male }, e);
                this.setFocus(this.state.focus);
            });
            document.querySelector(".slippy-settings-female").addEventListener("change", (e) => {
                this.setSettings({ female: !this.settings.female }, e);
                this.setFocus(this.state.focus);
            });
            document.querySelector(".slippy-settings-male").addEventListener("click", (e) => {
                e.stopPropagation();
            });
            document.querySelector(".slippy-settings-female").addEventListener("click", (e) => {
                e.stopPropagation();
            });
            document.querySelector(".output-name + img").addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                let input = document.createElement("input");
                input.value = e.target.previousSibling.textContent;
                document.body.appendChild(input);
                input.select();
                document.execCommand("copy");
                input.remove();
            });
            document.querySelector(".download-link").addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.downloadTree();
            });
            document.querySelector(".download-link").style.color = getComputedStyle(
                document.querySelector(".download-link")
            ).color; // Deep magic. Remove the "visited" appearance from this link
            document.querySelector(".slippy-categories").addEventListener("change", (e) => {
                let value = e.target.options[e.target.selectedIndex].fullValue;
                this.setCategory(value);
            });

            // Search box
            this.state.searchInput.addEventListener("input", (e) => {
                // on keypress
                const searchInput = e.target;
                const searchList = this.state.searchList;
                let v = searchInput.value
                    .toLowerCase()
                    .normalize("NFKD")
                    .replace(/\p{Diacritic}/gu, "");
                searchInput.removeAttribute("data-value");
                let first = true;
                for (let n = searchList.firstElementChild; n; n = n.nextElementSibling) {
                    if (v.length && n.getAttribute("value").includes(v)) {
                        n.classList.remove("hidden");
                        if (first) {
                            searchInput.setAttribute("data-value", n.getAttribute("idref"));
                            first = false;
                        }
                    } else {
                        n.classList.add("hidden");
                        n.classList.remove("focus");
                    }
                }
                searchList.classList.toggle("hidden", first);
                searchInput.classList.toggle("slippy-search-wtid", /-\d+$/.test(v));
            });
            this.state.searchInput.addEventListener("change", (e) => {
                const searchInput = e.target;
                let value = searchInput.getAttribute("data-value");
                if (!value || value.length == 0) {
                    value = searchInput.value.trim();
                }
                if (value.length) {
                    this.state.personMenu.person.action("search", value);
                }
            });
            this.state.searchInput.addEventListener("blur", (e) => {
                this.state.searchInput.value = "";
                this.state.searchMenu.classList.add("hidden");
                this.state.searchList.classList.add("hidden");
                this.state.searchList.querySelectorAll(":scope .focus").forEach((e) => e.classList.remove("focus"));
                keyboardFocusContainer.focus();
            });

            // Menu box
            for (let elt of this.state.personMenu.querySelectorAll("[data-action]")) {
                if (elt.getAttribute("data-action") != "profile") {
                    elt.addEventListener("click", () => {
                        this.state.personMenu.person.action(elt.getAttribute("data-action"));
                    });
                }
            }
            // All the mouse/scroll events are here
            const pointers = [];
            this.state.svg.addEventListener("pointerdown", (e) => {
                pointers.push({ id: e.pointerId, screenX: e.screenX, screenY: e.screenY });
                this.showMenu(false);
            });
            this.state.svg.addEventListener("pointerup", (e) => {
                if (e.isPrimary) {
                    pointers.length = 0;
                } else {
                    for (let i = 0; i < pointers.length; i++) {
                        if (pointers[i].id == e.pointerId) {
                            pointers.splice(i, 1);
                        }
                    }
                }
            });
            const pointerMoveHandler = (e) => {
                e.preventDefault();
                // Set dx/dy on pointers, because iOS doesn't have these standard props and e is read-only
                for (const p of pointers) {
                    if (p.id == e.pointerId) {
                        p.dx = e.movementX;
                        p.dy = e.movementY;
                        if (p.dx === undefined) {
                            p.dx = p.dy = 0;
                            if (p.screenX !== undefined) {
                                p.dx = e.screenX - p.screenX;
                                p.dy = e.screenY - p.screenY;
                            }
                            p.screenX = e.screenX;
                            p.screenY = e.screenY;
                        }
                    } else {
                        p.dx = p.dy = 0;
                    }
                }

                if (pointers.length == 0) {
                    if (e.screenX != this.state.hoverScreenX || e.screenY != this.state.hoverScreenY) {
                        // Ignore pointer movements due to scrolling even though mouse is in same position on screen.
                        let found = null;
                        let unfocused = true;
                        for (let elt of document.elementsFromPoint(e.pageX, e.pageY)) {
                            if (elt == e.currentTarget) {
                                break;
                            } else if (elt.classList.contains("slippy-focusable")) {
                                // unfocus all siblings, focus on this one
                                for (let n = elt.parentNode.firstElementChild; n; n = n.nextElementSibling) {
                                    if (n.classList.contains("slippy-focusable")) {
                                        n.classList.toggle("focus", n == elt && unfocused);
                                    }
                                }
                                unfocused = false;
                            } else if (elt.parentNode.person) {
                                found = elt.parentNode.person;
                                break;
                            }
                        }
                        if (e.currentTarget == this.state.svg) {
                            this.setDescriptionFocus(found);
                        }
                        this.state.hoverScreenX = e.screenX;
                        this.state.hoverScreenY = e.screenY;
                    }
                } else if (pointers.length == 1) {
                    let elt = document.elementFromPoint(e.pageX, e.pageY);
                    if (elt == this.state.svg) {
                        // One finger dragging over background: scroll
                        this.state.scrollPane.scrollLeft -= pointers[0].dx;
                        this.state.scrollPane.scrollTop -= pointers[0].dy;
                    }
                } else if (pointers.length == 2) {
                    // Two fingers: pinch zoom
                    let ox0 = pointers[0].screenX;
                    let oy0 = pointers[0].screenY;
                    let ox1 = pointers[1].screenX;
                    let oy1 = pointers[1].screenY;
                    let nx0 = ox0 + pointers[0].dx;
                    let ny0 = oy0 + pointers[0].dy;
                    let nx1 = ox1 + pointers[1].dx;
                    let ny1 = oy1 + pointers[1].dy;
                    let od = Math.sqrt((ox1 - ox0) * (ox1 - ox0) + (oy1 - oy0) * (oy1 - oy0));
                    let nd = Math.sqrt((nx1 - nx0) * (nx1 - nx0) + (ny1 - ny0) * (ny1 - ny0));
                    const oscale = this.state.view.scale;
                    let nscale = (oscale * nd) / od;
                    let dx = (nx1 - ox1 + (nx0 - ox0)) / 2;
                    let dy = (ny1 - oy1 + (ny0 - oy0)) / 2;
                    let ncx = this.state.view.cx - dx / oscale;
                    let ncy = this.state.view.cy - dy / oscale;
                    this.reposition({ scale: nscale, cx: ncx, cy: ncy });
                }
            };
            this.state.svg.addEventListener("pointermove", pointerMoveHandler);
            this.state.searchList.addEventListener("pointermove", pointerMoveHandler);
            this.state.personMenu.addEventListener("pointermove", pointerMoveHandler);
            this.state.svg.addEventListener("wheel", (e) => {
                // Trackpad: wheel is scroll, wheel-with-ctrl is zoom (two finger pinch), drag is scroll
                // Mouse: wheel is zoom, drag is scroll
                // No way to auto-detect which.
                e.preventDefault();
                let view = { scale: this.state.view.scale, cx: this.state.view.cx, cy: this.state.view.cy };
                if (e.ctrlKey) {
                    view.scale -= e.deltaY * 0.01; // Pinch-zoom with trackpad is different!
                } else if (this.settings.wheel == "scroll") {
                    view.cx += (e.deltaX / view.scale) * (this.state.props.dragScrollReversed ? -1 : 1);
                    view.cy += (e.deltaY / view.scale) * (this.state.props.dragScrollReversed ? -1 : 1);
                } else {
                    //                    const mul = 0.01; // 0.01 is "2x cursor keys" - https://www.wikitree.com/g2g/1802306/announcing-a-new-tree-view-slippytree#1802760

                    view.scale -= e.deltaY * this.#SCROLLSTEP_WHEEL * view.scale; // Weirdly non-linear without mul by view.scale!
                }
                this.reposition(view);
            });
            document.querySelector(".slippy-search-family").addEventListener("mousedown", (e) => {
                e.preventDefault();
                let searchFamily = e.target.classList.contains("selected");
                this.setSettings({ search: searchFamily ? "individual" : "family" });
                this.state.searchInput.focus();
            });
            const self = this;
            this.state.container.firstElementChild.addEventListener("keydown", (e) => {
                if (e.target.tagName == "INPUT" || e.target.tagName == "SELECT") {
                    if (e.key == "Escape") {
                        e.target.removeAttribute("data-value");
                        e.target.blur();
                    } else if (e.target == this.state.searchInput) {
                        if (e.key == "ArrowDown" || e.key == "ArrowUp") {
                            const searchInput = this.state.searchInput;
                            const searchList = this.state.searchList;
                            let focus = searchList.querySelector(":scope .focus:not(.hidden)");
                            if (!focus) {
                                for (let n = searchList.firstElementChild; n; n = n.nextElementSibling) {
                                    if (!n.classList.contains("hidden")) {
                                        focus = n;
                                        break;
                                    }
                                }
                            } else {
                                focus.classList.remove("focus");
                                if (e.key == "ArrowUp") {
                                    for (let n = focus.previousElementSibling; n; n = n.previousElementSibling) {
                                        if (!n.classList.contains("hidden")) {
                                            focus = n;
                                            break;
                                        }
                                    }
                                } else if (e.key == "ArrowDown") {
                                    for (let n = focus.nextElementSibling; n; n = n.nextElementSibling) {
                                        if (!n.classList.contains("hidden")) {
                                            focus = n;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (focus) {
                                focus.classList.add("focus");
                                if (focus.scrollIntoViewIfNeeded) {
                                    focus.scrollIntoViewIfNeeded();
                                } else {
                                    focus.scrollIntoView();
                                }
                                searchInput.setAttribute("data-value", focus.getAttribute("idref"));
                            }
                        }
                    }
                } else if (!this.state.personMenu.classList.contains("hidden")) {
                    e.preventDefault();
                    const menu = this.state.personMenu;
                    let focus = menu.querySelector(":scope > .focus");
                    if (!focus) {
                        focus = menu.firstElementChild;
                        focus.classList.add("focus");
                    }
                    let oldfocus = focus;
                    if (e.key == "Enter") {
                        focus.classList.remove("focus");
                        focus.click();
                    } else if (e.key == "Escape") {
                        focus.classList.remove("focus");
                        menu.classList.add("hidden");
                    } else if (e.key == "ArrowUp") {
                        for (let n = focus.previousElementSibling; n; n = n.previousElementSibling) {
                            if (n.getAttribute("data-action") && !n.classList.contains("hidden")) {
                                focus = n;
                                break;
                            }
                        }
                    } else if (e.key == "ArrowDown") {
                        for (let n = focus.nextElementSibling; n; n = n.nextElementSibling) {
                            if (n.getAttribute("data-action") && !n.classList.contains("hidden")) {
                                focus = n;
                                break;
                            }
                        }
                    } else {
                        let kv = e.key.toLowerCase();
                        menu.querySelectorAll(":scope [data-shortcut]:not(.hidden)").forEach((e) => {
                            let shortcut = e.getAttribute("data-shortcut");
                            if (kv == e.getAttribute("data-shortcut")) {
                                focus = e;
                                e.click();
                            }
                        });
                    }
                    if (focus && focus != oldfocus) {
                        oldfocus.classList.remove("focus");
                        focus.classList.add("focus");
                    }
                } else if (
                    e.key == "ArrowUp" ||
                    e.key == "ArrowDown" ||
                    e.key == "ArrowRight" ||
                    e.key == "ArrowLeft" ||
                    e.key == "+" ||
                    e.key == "-" ||
                    e.key == "Enter" ||
                    e.key == "Escape" ||
                    e.key == "?"
                ) {
                    e.preventDefault();
                    let view = { scale: self.state.view.scale, cx: self.state.view.cx, cy: self.state.view.cy };
                    let focus = self.state.view.keyboardFocus;
                    if (!focus) {
                        focus = self.state.view.keyboardFocus = self.state.focus;
                    }
                    if (e.key == "Enter") {
                        self.showMenu(focus, e);
                    } else if (e.key == "Escape") {
                        this.showHelp(false);
                    } else if (e.key == "?") {
                        helpButton.click();
                    } else if (e.key == "+") {
                        view.scale *= this.#SCROLLSTEP_KEYS;
                    } else if (e.key == "-") {
                        view.scale /= this.#SCROLLSTEP_KEYS;
                    } else {
                        let score,
                            best = null,
                            max = 0x7fffffff,
                            threshold = 30;
                        for (const person of self.state.people) {
                            if (person.isHidden()) {
                                continue;
                            }
                            if (
                                e.key == "ArrowUp" &&
                                Math.abs(person.cx - focus.cx) < threshold &&
                                person.cy < focus.cy &&
                                (score = focus.cy - person.cy) < max
                            ) {
                                best = person;
                                max = score;
                            } else if (
                                e.key == "ArrowDown" &&
                                Math.abs(person.cx - focus.cx) < threshold &&
                                person.cy > focus.cy &&
                                (score = person.cy - focus.cy) < max
                            ) {
                                best = person;
                                max = score;
                            } else if (
                                e.key == "ArrowRight" &&
                                person.cx - focus.cx > threshold &&
                                (score = (person.cx - focus.cx) * 10 + Math.abs(person.cy - focus.cy)) < max
                            ) {
                                best = person;
                                max = score;
                            } else if (
                                e.key == "ArrowLeft" &&
                                focus.cx - person.cx > threshold &&
                                (score = (focus.cx - person.cx) * 10 + Math.abs(person.cy - focus.cy)) < max
                            ) {
                                best = person;
                                max = score;
                            }
                        }
                        if (best) {
                            view.cx = best.cx;
                            view.cy = best.cy;
                            this.setSecondaryFocus(best);
                        }
                    }
                    self.reposition(view);
                }
            });
            this.state.scrollPane.addEventListener("scroll", () => {
                if (!this.state) {
                    return;
                }
                this.state.view.cx =
                    (this.state.scrollPane.clientWidth / 2 + this.state.scrollPane.scrollLeft - this.state.view.padx0) /
                        this.state.view.scale +
                    this.state.view.x0;
                this.state.view.cy =
                    (this.state.scrollPane.clientHeight / 2 + this.state.scrollPane.scrollTop - this.state.view.pady0) /
                        this.state.view.scale +
                    this.state.view.y0;
            });
            this.state.resizeObserver = new ResizeObserver((entries) => {
                if (!this.state) {
                    return;
                }
                delete this.state.view.viewWidth;
                delete this.state.view.viewHeight;
                this.reposition({});
            });
            this.state.resizeObserver.observe(this.state.container);

            // We maintain our state in the URL hash, alongside some other properties
            // that apply to all views. We need to then ignore this if the view is reloaded
            // with a different ID, but because of the slightly bodgy way this is done in
            // tree.js it's non-trivial to do this properly. Easy way is to honour the state
            // only the first time a SlippyTree is instantiated.
            let serializedState = SlippyTree.loadCount ? null : this.state.props[this.#VIEWPARAM];
            if (serializedState) {
                this.showHelp(false);
                if (!this.restoreState(serializedState)) {
                    serializedState = null;
                }
            }
            if (serializedState == null) {
                if (person_id) {
                    this.showHelp(false);
                    this.reset(person_id);
                } else {
                    this.showHelp(true);
                }
            }
            setTimeout(() => {
                keyboardFocusContainer.focus();
            }, 0);
        }
        SlippyTree.loadCount++;

        // This is reasonable, isn't it? A country list is already defined, seems
        // unnecessary to reinvent the wheel. If for any reason it's problematic or
        // it fails, we simply lose the "Location" categories. Nothing else fails.
        if (!SlippyTree.COUNTRIES && this.browser) {
            SlippyTree.COUNTRIES = [];
            import("../oneNameTrees/location_data.js").then((module) => {
                SlippyTree.COUNTRIES = module.countries;
            });
        }
    }

    meta() {
        return {
            // short title - will be in select control
            title: "Slippy Tree",
            // some longer description or usage
            description: "A mobile friendly tree that shows multiple relationships at once",
            // link pointing at some webpage with documentation
            docs: "",
            params: ["slippyTreeState"],
        };
    }

    close() {
        // Remember this object persists even when other views are selected.
        // Clear out all state - it's all under "this.state" now - and disconnect resize observer
        document.documentElement.classList.remove("slippy-tree-root");
        this.state.resizeObserver.disconnect();
        document.querySelectorAll("header, footer, .tabs--wrapper").forEach((e) => {
            e.style.setProperty("--slippy-computed-height", null);
        });
        if (this.#VIEWPARAM) {
            let v = new URLSearchParams(window.location.hash.substring(1));
            v.delete(this.#VIEWPARAM);
            window.history.replaceState(null, null, "#" + v);
        }
        delete this.state;
    }

    #setLoading(loading) {
        if (this.state.scrollPane) {
            this.state.scrollPane.parentNode.classList.toggle("loading", loading);
        }
    }

    #arrayEquals(a, b) {
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length == b.length) {
                for (let i = 0; i < a.length; i++) {
                    if (a[i] != b[i]) {
                        return false;
                    }
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Set the current highlight category, or null for the default
     */
    setCategory(category) {
        if (category == null) {
            category = this.LIVINGPEOPLE;
        }
        this.#rebuildCategories();
        for (const person of this.state.people) {
            if (person.svg) {
                let found = false;
                for (let c of person.lastCats) {
                    if (this.#arrayEquals(category, c)) {
                        found = true;
                        break;
                    }
                }
                person.svg.classList.toggle("highlight", found);
            }
        }
        this.state.highlightCategory = category;
    }

    #resetCategories() {
        if (this.browser) {
            const catmenu = this.state.container.querySelector(".slippy-categories");
            while (catmenu.firstChild) {
                catmenu.firstChild.remove();
            }
        }
    }

    #rebuildCategories() {
        // Really we could do this on demand, but caching is tested because
        // displaying the popup kills performance on iOS Safari. Turns out it's
        // displaying, not rebuilding, so a browser bug and not much we can do
        // about it.
        const catmenu = this.state.container.querySelector(".slippy-categories");
        if (!catmenu.firstElementChild) {
            let categories = [];
            for (const person of this.state.people) {
                person.lastCats = [];
                if (!person.isHidden()) {
                    let cats = person.categories();
                    if (cats) {
                        person.lastCats = cats;
                        for (let j = 0; j < cats.length; j++) {
                            let c = cats[j];
                            if (typeof c == "string") {
                                cats[j] = c = [c];
                            }
                            if (c.length == 1 && c[0] == this.LIVINGPEOPLE) {
                                continue; // special
                            }
                            let found = false;
                            for (let i = 0; i < categories.length; i++) {
                                if (this.#arrayEquals(c, categories[i])) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                categories.push(c);
                            }
                        }
                    }
                }
            }
            categories.sort((a, b) => {
                if (a.length != b.length) {
                    return a.length - b.length;
                } else {
                    for (let i = 0; i < a.length; i++) {
                        let v = a[i].localeCompare(b[i]);
                        if (v != 0) {
                            return v;
                        }
                    }
                }
            });
            categories.unshift([this.LIVINGPEOPLE]);
            for (const cat of categories) {
                let elt = catmenu;
                for (let i = 0; i + 1 < cat.length; i++) {
                    let part = cat[i];
                    for (let e = elt.firstElementChild; e; e = e.nextElementSibling) {
                        if (e.tagName == "OPTGROUP" && e.label == part) {
                            elt = e;
                            part = null;
                            break;
                        }
                    }
                    if (part != null) {
                        let optgroup = document.createElement("optgroup");
                        optgroup.setAttribute("label", part);
                        elt.appendChild(optgroup);
                        elt = optgroup;
                    }
                }
                let part = cat[cat.length - 1];
                let opt = document.createElement("option");
                opt.fullValue = cat;
                opt.appendChild(document.createTextNode(part));
                elt.appendChild(opt);
                opt.selected = this.#arrayEquals(cat, this.state.highlightCategory);
            }
        }
    }

    showHelp(show) {
        const helpContainer = this.state.container.querySelector(".helpContainer");
        const catmenu = this.state.container.querySelector(".slippy-categories");
        if (!show) {
            helpContainer.classList.add("hidden");
        } else {
            helpContainer.classList.remove("hidden");
            this.#rebuildCategories();
        }
    }

    setSettings(patch, e) {
        if (e) {
            e.stopPropagation();
        }
        if (patch) {
            for (let key in patch) {
                this.settings[key] = patch[key];
            }
            // Can't turn off male AND female
            if (patch.female === false && !this.settings.male) {
                this.settings.male = true;
            } else if (patch.male === false && !this.settings.female) {
                this.settings.female = true;
            }
        }
        if (typeof this.settings.male == "undefined") {     // New setting
             this.settings.male = true;
        }
        if (typeof this.settings.female == "undefined") {     // New setting
             this.settings.female = true;
        }
        if (this.settings.male === false && this.settings.female === false) {
            this.settings.male = this.settings.female = true;   // just in case
        }
        let zoomButton = document.querySelector(".slippy-settings-wheel-zoom");
        let scrollButton = document.querySelector(".slippy-settings-wheel-scroll");
        let searchFamily = document.querySelector(".slippy-search-family");
        let male = document.querySelector(".slippy-settings-male");
        let female = document.querySelector(".slippy-settings-female");
        zoomButton.classList.toggle("selected", this.settings.wheel == "zoom");
        scrollButton.classList.toggle("selected", this.settings.wheel == "scroll");
        searchFamily.classList.toggle("selected", this.settings.search != "individual");
        male.checked = this.settings.male;
        female.checked = this.settings.female;
        window.localStorage.setItem("slippyTree-settings", JSON.stringify(this.settings));
    }

    downloadTree() {
        let src = this.state.svg.outerHTML;
        const doc = new DOMParser().parseFromString(src, "text/xml");
        let stylesheeturl;
        if (window.location.host == "apps.wikitree.com") {
            stylesheeturl = "https://" + window.location.host + window.location.pathname + "views/slippyTree/style.css";
        } else {
            stylesheeturl = "https://" + window.location.host + "/wikitree-dynamic-tree/views/slippyTree/style.css";
        }
        const width = doc.rootElement.getAttribute("width");
        const height = doc.rootElement.getAttribute("height");
        // viewBox makes the scaling nicer than using width/height
        doc.rootElement.setAttribute("viewBox", "0 0 " + width + " " + height);
        fetch(stylesheeturl)
            .then((response) => response.text())
            .then((text) => {
                const anchor = doc.rootElement.firstChild;
                doc.rootElement.style = null;

                // Add metadata and stylesheet link
                let link = doc.createElementNS(this.#HTML, "link");
                link.setAttribute("rel", "canonical");
                link.setAttribute("href", window.location);
                doc.rootElement.insertBefore(doc.createTextNode("\n  "), anchor);
                doc.rootElement.insertBefore(link, anchor);
                const nowText = new Date().toDateString();
                const isonowText = new Date().toISOString();
                const titleText = 'WikiTree Slippy Tree for "' + this.state.focus.data.Name + '" as of ' + nowText;
                let title = doc.createElementNS(this.#SVG, "title");
                title.appendChild(doc.createTextNode(titleText));
                doc.rootElement.insertBefore(doc.createTextNode("\n  "), anchor);
                doc.rootElement.insertBefore(title, anchor);
                let meta = doc.createElementNS(this.#SVG, "metadata");
                let rdf =
                    '\n   <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/">\n    <rdf:Description about="">\n     <dc:title>' +
                    titleText +
                    "</dc:title>\n     <dc:date>" +
                    isonowText +
                    "</dc:date>\n     <dc:publisher>https://www.wikitree.com</dc:publisher>\n     <dc:source>" +
                    window.location.toString().replace(/&/g, "&amp;") +
                    "</dc:source>\n    </rdf:Description>\n   </rdf:RDF>\n  ";
                meta.innerHTML = rdf;
                doc.rootElement.insertBefore(doc.createTextNode("\n  "), anchor);
                doc.rootElement.insertBefore(meta, anchor);

                let style = doc.createElementNS(this.#SVG, "style");
                style.innerHTML =
                    "\n  /*\n  This stylesheet will make the size of the PDF the same as\n  the size of the SVG when printing to PDF in Firefox or Chrome.\n  Without it the SVG will print on regular Letter or A4\n  */\n  @page {\n      size: " +
                    doc.rootElement.getAttribute("width") +
                    "px " +
                    doc.rootElement.getAttribute("height") +
                    "px;\n      margin: 0;  \n  }\n  ";
                doc.rootElement.insertBefore(doc.createTextNode("\n  "), anchor);
                doc.rootElement.insertBefore(style, anchor);

                style = doc.createElementNS(this.#SVG, "style");
                style.innerHTML = "\n/* Source: " + stylesheeturl + " */\n" + text + "\n  ";
                doc.rootElement.insertBefore(doc.createTextNode("\n  "), anchor);
                doc.rootElement.insertBefore(style, anchor);

                doc.rootElement.querySelectorAll(":is(.relations, .labels, .people) > *").forEach((e) => {
                    e.parentNode.insertBefore(doc.createTextNode("\n     "), e);
                });
                doc.rootElement.querySelectorAll(".people text").forEach((e) => {
                    const id = e.parentNode.id.replace(/person-/, "");
                    const person = this.find(id, true);
                    if (person) {
                        let a = doc.createElementNS(this.#SVG, "a");
                        a.setAttribute("href", "https://www.wikitree.com/wiki/" + person.data.Name);
                        while (e.firstChild) {
                            a.appendChild(e.firstChild);
                        }
                        e.appendChild(a);
                    }
                });
                doc.rootElement.removeAttribute("width");
                doc.rootElement.removeAttribute("height");

                src = new XMLSerializer().serializeToString(doc);
                const blob = new Blob([src], { type: "application/octet-stream" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                document.body.appendChild(a);
                a.download = "slippy-tree.svg";
                a.href = url;
                setTimeout(() => {
                    a.click();
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                        a.remove();
                    }, 0);
                }, 0);
            });
        return false;
    }

    /**
     * Serialize the current state of the view to a string, suitable for include in a URL parameter.
     * The reverse operion is "restoreState"
     */
    saveState() {
        // sort into order
        // store id as 32 bits
        // if next id - prev id < 256, store delta, otherwise store 0 and then 32-bit id.
        //
        let data = [];
        for (let pass = 0; pass < 2; pass++) {
            let ids = [];
            for (const person of this.state.people) {
                if (!person.isHidden()) {
                    let acl = person.childrenLoaded;
                    for (let child of person.children()) {
                        if (!child.isLoaded()) {
                            acl = false;
                        }
                    }
                    if (pass == 0 ? acl : !acl) {
                        ids.push(parseInt(person.id));
                    }
                }
            }
            ids.sort();
            data[pass] = ids;
        }
        while (data[data.length - 1].length == 0) {
            data.length--;
        }
        let out = [];
        out.push(this.#VERSION); // Plan for expansion!
        out.push((this.state.focus.id >> 24) & 0xff);
        out.push((this.state.focus.id >> 16) & 0xff);
        out.push((this.state.focus.id >> 8) & 0xff);
        out.push((this.state.focus.id >> 0) & 0xff);
        for (let j = 0; j < data.length; j++) {
            const ids = data[j];
            if (j > 0) {
                out.push(0);
                out.push(0);
                out.push(0);
                out.push(0);
            }
            for (let i = 0; i < ids.length; i++) {
                let delta = i == 0 ? 0 : ids[i] - ids[i - 1];
                if (i == 0 || delta < 0 || delta > 255) {
                    if (i > 0) {
                        out.push(0);
                    }
                    out.push((ids[i] >> 24) & 0xff);
                    out.push((ids[i] >> 16) & 0xff);
                    out.push((ids[i] >> 8) & 0xff);
                    out.push((ids[i] >> 0) & 0xff);
                } else {
                    out.push(delta);
                }
            }
            out.push(0);
        }
        // console.log("SAVE: D="+JSON.stringify(data));
        let s = out.map((b) => String.fromCodePoint(b)).join("");
        return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    }

    /**
     * Deserialize a state string as created by "saveState". Return true if the operation succeeded
     */
    restoreState(val, callback) {
        while ((val.length & 3) != 0) {
            val += "=";
        }
        try {
            val = atob(val.replaceAll("-", "+").replaceAll("_", "/"));
            let data = [[]];
            let i = 0;
            let version = val.codePointAt(i++);
            if (version != this.#VERSION) {
                return false;
            }
            let focusid =
                (val.codePointAt(i++) << 24) |
                (val.codePointAt(i++) << 16) |
                (val.codePointAt(i++) << 8) |
                val.codePointAt(i++);
            let id = 0,
                pass = 0;
            while (i < val.length) {
                if (id == 0) {
                    id =
                        (val.codePointAt(i++) << 24) |
                        (val.codePointAt(i++) << 16) |
                        (val.codePointAt(i++) << 8) |
                        val.codePointAt(i++);
                    if (id == 0) {
                        pass++;
                        data[pass] = [];
                    } else {
                        data[pass].push(id);
                    }
                } else {
                    let delta = val.codePointAt(i++);
                    if (delta > 0) {
                        id += delta;
                        data[pass].push(id);
                    } else {
                        id = 0;
                    }
                }
            }
            // console.log("RESTORE: D="+JSON.stringify(data));
            this.reset();
            this.load({ keys: data.flat() }, () => {
                for (const id of data[0]) {
                    const person = this.find(id, true);
                    person.childrenLoaded = true;
                }
                this.setFocus(this.find(focusid, true), callback);
            });
            return true;
        } catch (e) {
            console.warn(e);
            return false;
        }
    }

    /**
     * Remove all nodes, start again
     * @param id the id to load, or null to just clear the tree.
     */
    reset(id) {
        if (typeof id == "number") {
            id = id.toString();
        }
        this.state.view = { scale: 1, cx: 0, cy: 0 };
        this.state.people.length = 0;
        Object.keys(this.state.byid).forEach((key) => delete this.state.byid[key]);
        this.state.focus = this.state.refocusStart = this.state.refocusEnd = null;
        // Clearing is a bit ad-hoc
        if (this.browser) {
            const container = this.state.svg.querySelector(".container");
            for (let n = container.firstChild; n; n = n.nextSibling) {
                while (n.firstChild) {
                    n.firstChild.remove();
                }
            }
        }
        if (id) {
            this.load({ keys: id, nuclear: 1 }, () => {
                const person = this.find(id, false);
                if (person) {
                    person.childrenLoaded = true;
                    this.setSecondaryFocus(null);
                    this.setFocus(person);
                }
            });
        }
    }

    /**
     * Reposition the SVG. Expects a map with properties including scale, cx and cy (center logical coordinates0
     * @param props a map to merge over the current scale map
     */
    reposition(m) {
        if (this.state.people.length == 0) {
            this.state.view = { scale: 1, cx: 0, cy: 0, x0: 0, x1: 0, y0: 0, y1: 0 };
        } else {
            for (let key in m) {
                let v = m[key];
                if (typeof v != "number" || !isNaN(v)) {
                    this.state.view[key] = m[key];
                }
            }
        }
        this.state.view.scale = Math.max(this.#MINSCALE, Math.min(this.#MAXSCALE, this.state.view.scale));
        const targetWidth = Math.round((this.state.view.x1 - this.state.view.x0) * this.state.view.scale);
        const targetHeight = Math.round((this.state.view.y1 - this.state.view.y0) * this.state.view.scale);
        if (!this.state.view.viewWidth || !this.state.view.viewHeight) {
            this.state.view.viewWidth = this.state.scrollPane.clientWidth;
            this.state.view.viewHeight = this.state.scrollPane.clientHeight;
            this.state.view.padx0 = this.state.view.padx1 = Math.floor(this.state.view.viewWidth / 2);
            this.state.view.pady0 = this.state.view.pady1 = Math.floor(this.state.view.viewHeight / 2);
            if (!this.state.personMenu.previousClientHeight) {
                const hidden = this.state.personMenu.classList.contains("hidden");
                if (hidden) {
                    this.state.personMenu.classList.remove("hidden");
                }
                this.state.personMenu.previousClientHeight = this.state.personMenu.clientHeight;
                if (hidden) {
                    this.state.personMenu.classList.add("hidden");
                }
            }
            this.state.view.pady1 = Math.max(this.state.view.pady1, this.state.personMenu.previousClientHeight + 40);
            this.state.svg.style.paddingLeft = this.state.view.padx0 + "px";
            this.state.svg.style.paddingRight = this.state.view.padx1 + "px";
            this.state.svg.style.paddingTop = this.state.view.pady0 + "px";
            this.state.svg.style.paddingBottom = this.state.view.pady1 + "px";
        }
        let tran = "scale(" + this.state.view.scale + " " + this.state.view.scale + ") ";
        tran += "translate(" + -this.state.view.x0 + " " + -this.state.view.y0 + ")";
        if (tran != this.state.view.tran) {
            this.state.svg.querySelector(".container").setAttribute("transform", (this.state.view.tran = tran));
        }
        if (targetWidth != this.state.view.targetWidth || targetHeight != this.state.view.targetHeight) {
            this.state.svg.setAttribute("width", (this.state.view.targetWidth = targetWidth));
            this.state.svg.setAttribute("height", (this.state.view.targetHeight = targetHeight));
        }

        const targetX =
            Math.round((this.state.view.cx - this.state.view.x0) * this.state.view.scale) + this.state.view.padx0;
        const targetY =
            Math.round((this.state.view.cy - this.state.view.y0) * this.state.view.scale) + this.state.view.pady0;
        this.state.scrollPane.scrollLeft = Math.round(targetX - this.state.view.viewWidth / 2);
        this.state.scrollPane.scrollTop = Math.round(targetY - this.state.view.viewHeight / 2);
        //        console.log("RESCALE: scale="+JSON.stringify(o)+" target=["+targetWidth+" "+targetHeight+"] view=["+this.state.view.viewWidth+" "+this.state.view.viewHeight+"] center=["+targetX+" "+targetY+"] tr="+tran+" sp="+x+" "+y);
        if (!this.state.personMenu.classList.contains("hidden")) {
            this.showMenu();
        }
    }

    /**
     * Show the popup menu
     * @param person the person the menu relates to
     * @param e the mouse event that triggered the menu
     */
    showMenu(person, e) {
        if (person === false) {
            this.state.personMenu.classList.add("hidden");
            this.state.personMenu.querySelectorAll(":scope .focus").forEach((e) => e.classList.remove("focus"));
            this.state.searchMenu.classList.add("hidden");
            this.state.searchList.classList.add("hidden");
            this.state.searchInput.value = "";
            return;
        }
        // Note both person and e can be missing to reposition the currently displayed menu
        if (!person) {
            person = this.state.personMenu.person;
        }
        this.state.searchMenu.classList.add("hidden");
        this.state.personMenu.classList.remove("hidden");
        this.state.personMenu.showEvent = e;
        let menuWidth = this.state.personMenu.clientWidth;
        let c = this.fromSVGCoords({ x: person.x - person.genwidth / 2, y: person.y + person.height / 2 });
        let x0 = c.x;
        let y = c.y;
        let x1 = this.fromSVGCoords({ x: person.x + person.genwidth / 2, y: 0 }).x;
        let sx;
        if (e) {
            document.querySelectorAll(".output-name").forEach((e) => {
                e.innerHTML = person.data.Name;
            });
            document.querySelectorAll('[data-action="remove"]').forEach((e) => {
                e.classList.toggle("hidden", person == this.state.focus);
            });
            document.querySelectorAll('[data-action="profile"]').forEach((e) => {
                // Do this to avoid issues with popup blockers if target=_blank
                if (this.state.props.profileTarget) {
                    e.target = this.state.props.profileTarget;
                }
                e.href = "https://www.wikitree.com/wiki/" + person.data.Name;
            });
            sx = e.offsetX ? (e.offsetX - x0) / (x1 - x0) : 0;
            this.state.personMenu.sx = sx;
            this.state.personMenu.person = person;
        } else {
            sx = this.state.personMenu.sx;
        }
        let x = Math.max(x0, Math.min(x1 - menuWidth, x0 + (x1 - x0) * sx - menuWidth / 2));
        this.state.personMenu.style.left = x + "px";
        this.state.personMenu.style.top = y + "px";
        if (e && this.state.props.refocusOnClick) {
            this.setFocus(person);
        }
    }

    /**
     * "Secondary" focus is the person that the mouse/keyboard has currently
     * selected but that hasn't been nominated as the focus. Has a black border
     * around it
     */
    setSecondaryFocus(focus) {
        if (focus != this.state.secondaryFocus) {
            if (this.state.secondaryFocus) {
                this.state.secondaryFocus.svg.classList.remove("secondaryfocus");
                this.state.secondaryFocus = null;
            }
            if (focus) {
                this.state.secondaryFocus = focus;
                this.state.secondaryFocus.svg.classList.add("secondaryfocus");
            }
            this.setDescriptionFocus(focus);
            this.setEdgeFocus(this.state.focus, this.state.secondaryFocus);
            this.state.view.keyboardFocus = focus;
        }
    }

    /**
     * Focus on the edges between "a" and "b", or if b==null, on the ancestors/descendants of "a"
     */
    setEdgeFocus(a, b) {
        if (a == null) {
            // Remove focus from all edges
            this.state.svg.querySelectorAll(".relations .focus").forEach((e) => {
                e.classList.remove("focus");
            });
            return;
        }
        if (b == a) {
            b = null;
        }
        const key = b ? Math.min(a.id, b.id) + "-" + Math.max(a.id, b.id) : a.id + "-" + a.id;
        let edges = this.state.focusEdges[key];
        if (!edges) {
            edges = this.state.focusEdges[key] = [];
            if (b) {
                let rels = a.relationships(b, { half: false, gender: false, nosibling: true });
                for (let rel of rels) {
                    let n0 = a;
                    for (let p of rel.path) {
                        let n1 = p.person;
                        edges.push("edge-" + Math.min(n0.id, n1.id) + "-" + Math.max(n0.id, n1.id));
                        n0 = n1;
                    }
                }
            } else {
                let q = [a];
                while ((b = q.pop())) {
                    for (let child of b.children()) {
                        edges.push("edge-" + Math.min(b.id, child.id) + "-" + Math.max(b.id, child.id));
                        q.push(child);
                    }
                    if (b.data.NoChildren == 1) {
                        edges.push("noissue-" + b.id);
                    }
                }
                q = [a];
                while ((b = q.pop())) {
                    for (let parent of b.parents()) {
                        edges.push("edge-" + Math.min(b.id, parent.id) + "-" + Math.max(b.id, parent.id));
                        q.push(parent);
                    }
                }
            }
        }
        let firstFocus = null;
        edges.forEach((id) => {
            let e = document.getElementById(id);
            if (e && !firstFocus) {
                firstFocus = e;
            }
            if (e && !e.classList.contains("focus")) {
                e.classList.add("focus");
                e.parentNode.appendChild(e); // Move to end
            }
        });
        this.state.svg.querySelectorAll(".relations .focus").forEach((e) => {
            if (!edges.includes(e.id)) {
                e.classList.remove("focus");
                if (firstFocus) {
                    e.parentNode.insertBefore(e, firstFocus); // Move to before unfocused elements
                }
            }
        });
    }

    /**
     * "Description" focus" is the person that we're describing the relationship
     * for. When secondary focus changes it mirrors that, but it also changes if
     * the mouse moves over an element
     */
    setDescriptionFocus(focus) {
        if (focus != this.state.descriptionFocus) {
            this.state.descriptionFocus = focus;
            const first = this.state.focus;
            const second = focus;
            const elt = this.state.container.querySelector(".relationshipName");
            if (elt) {
                let val = "";
                if (first && second && first != second) {
                    let rels = first.relationships(second, { half: true, gender: true });
                    // Delete relationships with duplicate names, ie if we're second-cousin two ways.
                    let names = [];
                    for (let i = 0; i < rels.length; i++) {
                        if (names.includes(rels[i].name)) {
                            rels.splice(i--, 1);
                        } else {
                            names.push(rels[i].name);
                        }
                    }
                    if (rels.length) {
                        val = '<span class="name">';
                        val += second.presentationName();
                        val += '</span> is <span class="name">';
                        val += first.presentationName();
                        val += '</span>\'s <span class="rel">';
                        val += rels[0].name;
                        if (rels.length > 1) {
                            val += '</span> (also <span class="rel">';
                            for (let i = 1; i < rels.length; i++) {
                                if (i > 1) {
                                    val += ", ";
                                }
                                val += rels[i].name;
                            }
                        }
                        val += ")</span>";
                    }
                }
                elt.innerHTML = val;
            }
        }
    }

    /**
     * Refocus the tree
     * @param focus the person to focus the tree on. Required
     * @param callback an optional method to call when focus completes
     */
    setFocus(focus, callback) {
        if (this.debug) console.log("Focus " + focus);
        this.#setLoading(true);

        // Setup: ensure every person has an SVG
        let newpeople = false;
        for (const person of this.state.people) {
            if (!this.state.svg) {
                person.width = 100; // Dummy value for layout testing
                person.height = 20;
            } else if (!person.svg && !person.isHidden()) {
                let rect, path;
                person.svg = document.createElementNS(this.#SVG, "g");
                person.svg.person = person;
                person.svg.addEventListener("click", (e) => {
                    this.setSecondaryFocus(person);
                    this.showMenu(person, e);
                });
                person.svg.setAttribute("id", "person-" + person.id);
                person.svg.appendChild((rect = document.createElementNS(this.#SVG, "rect")));
                person.svg.appendChild((path = document.createElementNS(this.#SVG, "path")));
                this.state.svg.querySelector(".people").appendChild(person.svg);
                if (person.data.Gender == "Male") {
                    person.svg.classList.add("male");
                } else if (person.data.Gender == "Female") {
                    person.svg.classList.add("female");
                }
                if (person.data.IsMember) {
                    person.svg.classList.add("member");
                }
                if (person.data.Privacy == 20) {
                    person.svg.classList.add("privacy-private");
                } else if (person.data.Privacy == 30) {
                    person.svg.classList.add("privacy-semi");
                } else if (person.data.Privacy == 40) {
                    person.svg.classList.add("privacy-semiopen");
                } else if (person.data.Privacy == 50) {
                    person.svg.classList.add("privacy-public");
                }
                if (true) {
                    let text, a;
                    person.svg.appendChild((text = document.createElementNS(this.#SVG, "text")));
                    text.appendChild(document.createTextNode(person.presentationName()));
                    text.appendChild(document.createTextNode(person.presentationExtra()));
                    let bbox = text.getBBox();
                    const style = getComputedStyle(text);
                    const padding = style ? this.#evalLength(style, style.getPropertyValue("--text-padding")) : 4;
                    person.width = Math.ceil(bbox.width + padding + padding);
                    person.height = Math.ceil(bbox.height + padding + padding);
                    text.setAttribute("y", Math.round(padding + (person.height - padding - padding) * 0.8));
                }
                const ps = this.#TAGSIZE; // person.height;
                path.setAttribute("d", "M 0 0 H " + ps + " L 0 " + ps + " Z");
                rect.setAttribute("height", person.height);
                if (!person.x) {
                    if (person.growFrom) {
                        person.x = person.tx = person.growFrom.x;
                        person.y = person.ty = person.growFrom.y;
                    } else if (focus) {
                        person.x = focus.x;
                        person.y = focus.y;
                    }
                }
                newpeople = true;
            }
        }
        if (newpeople) {
            this.setCategory(this.state.highlightCategory);
            while (this.state.searchList.firstChild) {
                this.state.searchList.firstChild.remove();
            }
            for (const person of this.state.people) {
                if (!person.isHidden()) {
                    let e = document.createElement("div");
                    e.classList.add("slippy-focusable");
                    e.setAttribute("idref", person.data.Name);
                    e.setAttribute("value", person.searchName());
                    e.innerHTML = person.presentationName() + " " + person.presentationExtra();
                    e.addEventListener("mousedown", () => {
                        this.state.personMenu.person.action("search", person.data.Name);
                    });
                    this.state.searchList.appendChild(e);
                }
            }
            // We want to make sure "Smith-1" matches "Smith-1" not "Smith-10".
            // Easiest way: make the id the first part of the value, and sort on value
            Array.from(this.state.searchList.children)
                .sort((a, b) => {
                    return a.getAttribute("value").localeCompare(b.getAttribute("value"));
                })
                .forEach((e) => {
                    this.state.searchList.appendChild(e);
                });
        }

        // First sort people into priority, then
        // position based on focus node and priority
        // After this each person has "tx" and "ty" value set
        let ordered = this.order(focus, this.state.people);
        this.state.view.marriages = [];
        this.placeNodes(focus, ordered, this.state.view.marriages, () => {
            // Re-add edges, people, labels in priority order
            for (const person of ordered) {
                if (isNaN(person.tx) || isNaN(person.ty))
                    throw new Error(
                        "Person=" + person + " g=" + person.generation + " tx=" + person.tx + " ty=" + person.ty
                    );
                if (typeof person.x != "number" || typeof person.y != "number") {
                    person.x = person.y = 0; // INITIAL POSITION: from center
                }
            }
            if (this.browser) {
                this.#setLoading(false);
                const peoplepane = this.state.svg.querySelector(".people");
                const edges = this.state.svg.querySelector(".relations");
                const labels = this.state.svg.querySelector(".labels");
                while (edges.firstChild) {
                    edges.firstChild.remove();
                }
                while (labels.firstChild) {
                    labels.firstChild.remove();
                }
                while (peoplepane.firstChild) {
                    peoplepane.firstChild.remove();
                }
                let focusedges = [];
                for (const person of ordered) {
                    if (isNaN(person.tx) || isNaN(person.ty))
                        throw new Error(
                            "Person=" + person + " g=" + person.generation + " tx=" + person.tx + " ty=" + person.ty
                        );
                    if (typeof person.x != "number" || typeof person.y != "number") {
                        person.x = person.y = 0; // INITIAL POSITION: from center
                    }
                    peoplepane.appendChild(person.svg);
                }
                this.redrawEdges(focus);
                this.state.refocusStart = Date.now(); // Begin our animation
                this.state.refocusEnd = Date.now() + 1000;
                this.state.focus = focus;
                this.state.view.cx0 = this.state.view.cx;
                this.state.view.cy0 = this.state.view.cy;
                this.state.view.callback = callback;
                this.setEdgeFocus(this.state.focus, this.state.secondaryFocus);
                window.requestAnimationFrame(() => {
                    this.draw();
                });

                // Initiate a load to check for unloaded children, effects
                // of which will be to add new paths. This can be done safely
                // during or after the draw callbacks
                this.checkForUnloadedChildren();
                if (this.#VIEWPARAM) {
                    let v = new URLSearchParams(window.location.hash.substring(1));
                    v.set(this.#VIEWPARAM, this.saveState());
                    window.history.replaceState(null, null, "#" + v);
                }
            } else {
                if (callback) {
                    callback();
                }
            }
        });
    }

    /**
     * Sort people into priority order based on focus.
     * Also assigns them to a generation.
     * @param focus the focal node
     * @param people the list of people
     */
    order(focus, people) {
        let q = [];
        // Nodes are hidden if they have no name
        // Everything is hidden unless reachable from a non-hidden node
        // Possible for nephews to marry aunts, etc, so even generations need a focus.
        for (const person of people) {
            person.hidden = true;
            person.ty = person.tx = person.generation = NaN;
        }
        q.push(focus);
        focus.generation = 0;
        let mingen = 0;
        for (let i = 0; i < q.length; i++) {
            const person = q[i];
            if (!(person == focus || (person.data.Gender != "Male" && person.data.Gender != "Female") || (person.data.Gender == "Male" && this.settings.male) || (person.data.Gender == "Female" && this.settings.female))) {
                // If males/females are excluded and not the focus element, skip and continue
                q.splice(i--, 1);
                continue;
            }
            person.hidden = false;
            mingen = Math.min(mingen, person.generation);
            for (let spouse of person.spouses()) {
                if (!spouse.isHidden() && !q.includes(spouse)) {
                    spouse.generation = person.generation;
                    q.push(spouse);
                }
            }
            for (let child of person.children()) {
                if (!child.isHidden() && !q.includes(child)) {
                    child.generation = person.generation + 1;
                    q.push(child);
                    for (let spouse of child.spouses()) {
                        if (!spouse.isHidden() && !q.includes(spouse)) {
                            spouse.generation = person.generation + 1;
                            q.push(spouse);
                        }
                    }
                }
            }
            for (let par of person.parents()) {
                if (!par.isHidden() && !q.includes(par)) {
                    par.generation = person.generation - 1;
                    q.push(par);
                    for (let spouse of par.spouses()) {
                        if (!spouse.isHidden() && !q.includes(spouse)) {
                            spouse.generation = person.generation - 1;
                            q.push(spouse);
                        }
                    }
                }
            }
        }
        for (const person of people) {
            if (!person.hidden && !q.includes(person)) {
                throw new Error("missing " + person);
            } else if (person.hidden && q.includes(person)) {
                throw new Error("includes hidden " + person);
            }
        }
        for (let person of q) {
            person.generation -= mingen;
        }
        return q;
    }

    /**
     * Position all the nodes. After this method they all have "tx" and "ty" set
     * @param focus the focal node
     * @param ordered the ordered array of people in priority order
     * @param marriages an array to be populated with [{a:person, b:person, top: person, bot: person}]. The marriage between a and b is to be positioned between top and bot
     */
    placeNodes(focus, ordered, marriages, complete) {
        // These two adjust the layout quality.
        const PASSES = 5000; // higher=slower, lower=worse layout. Visible issues with 1000, use 5000
        const MINMOVE = 1; // higher=faster, lower=more accuracy. Difference between 0.1 and 1 seems minimal but reduces 1000 people from 22s to 12s

        const style = this.state.svg ? getComputedStyle(this.state.svg) : null;
        const MINWIDTH = style ? this.#evalLength(style, style.getPropertyValue("--min-person-width")) : 50;
        const SPOUSEMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--spouse-margin")) : 10;
        const SPOUSEINDENT = style ? this.#evalLength(style, style.getPropertyValue("--spouse-indent")) : 10;
        const SIBLINGMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--sibling-margin")) : 20;
        const OTHERMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--other-margin")) : 40;
        const GENERATIONMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--generation-margin")) : 100;
        const DEBUG = typeof window == "undefined"; // This is never run in a browser, it's for testing locally in nodejs. So always false.
        const bundleSpouses = typeof this.state.props.bundleSpouses == "number" ? this.state.props.bundleSpouses : 1;

        const genpeople = [];
        const genwidth = [];
        const q = []; // tmp working aray
        let miny = 99999,
            maxy = -99999;

        class Clump {
            #people = [];
            #nextMargin = 0;
            #next;
            #prev;
            #first;
            #last;
            constructor() {
                this.#first = this.#last = this;
            }
            addPerson(person) {
                this.#people.push(person);
                person.clump = this;
            }
            setNext(clump, margin) {
                this.#next = clump;
                clump.#prev = this;
                this.#nextMargin = margin;
            }
            prevClump() {
                return this.#first.#prev;
            }
            nextClump() {
                return this.#last.#next;
            }
            topPerson() {
                return this.#first.#people[0];
            }
            bottomPerson() {
                return this.#last.#people[this.#last.#people.length - 1];
            }
            prevMargin() {
                return this.prevClump() ? this.prevClump().nextMargin() : 0;
            }
            nextMargin() {
                return this.#last.#nextMargin;
            }
            *people() {
                for (let c = this.#first; c; c = c.#next) {
                    for (let person of c.#people) {
                        yield person;
                    }
                    if (c == this.#last) {
                        break;
                    }
                }
            }
            toString() {
                let count = 0;
                for (let p of this.people()) {
                    count++;
                }
                return (
                    "(" +
                    count +
                    ' from "' +
                    this.topPerson().presentationName() +
                    '" to "' +
                    this.bottomPerson().presentationName() +
                    '" f=' +
                    this.force().toFixed(1) +
                    " gap=[" +
                    this.prevMargin() +
                    " " +
                    this.nextMargin() +
                    "])"
                );
            }
            mergeWithNext() {
                let first = this.#first;
                let last = this.nextClump().#last;
                for (let c = first; ; c = c.#next) {
                    c.#first = first;
                    c.#last = last;
                    if (c == last) {
                        break;
                    }
                }
            }
            resetMerge() {
                let last = this.#last;
                for (let c = this.#first; c; c = c.#next) {
                    c.#first = c.#last = c;
                    if (c == last) {
                        break;
                    }
                }
            }
            force() {
                let v = 0,
                    c = 0;
                for (const p of this.people()) {
                    for (const force of p.forces) {
                        let fv = force();
                        v += fv;
                        c++;
                    }
                }
                return c == 0 ? 0 : v / c;
            }
        }
        // STEP 0
        // Preliminary stuff, work out the width for each generation,
        // reset some properties
        for (const person of this.state.people) {
            delete person.forces;
            delete person.clump;
            delete person.numVisibleChildren;
        }
        for (const person of ordered) {
            const generation = person.generation;
            if (!genpeople[generation]) {
                genpeople[generation] = [];
                genwidth[generation] = MINWIDTH;
            }
            genwidth[generation] = Math.max(genwidth[generation], person.width);
            person.forces = [];
            person.clump = new Clump();
            person.clump.addPerson(person);
            person.numVisibleChildren = 0;
        }

        // STEP 1
        // ------
        // Find the roots of the tree. For each node in our priority order,
        // traverse up on all branches and add any nodes that have no parents
        // that we haven't previously added. Note we are building a tree,
        // so parents that are grouped in the same (or a lower!) generation
        // to each node are ignored.
        //
        // Store the unseen roots for each node in [roots]
        const roots = [],
            seen = [];
        for (let person of ordered) {
            let n = person,
                subroots = [];
            roots.push(subroots);
            while (q.length || n) {
                if (n != null) {
                    if (seen.includes(n)) {
                        n = null; // We have joined an already processed tree, go down again
                    } else {
                        seen.push(n);
                        const mother =
                            n.mother && !n.mother.hidden && n.mother.generation < n.generation ? n.mother : null;
                        const father =
                            n.father && !n.father.hidden && n.father.generation < n.generation ? n.father : null;
                        if (mother) {
                            q.push(mother);
                        } else if (!father) {
                            subroots.push(n);
                        }
                        n = father;
                    }
                } else {
                    n = q.pop();
                }
            }
        }
        // STEP 2
        // The first tree we draw should ideally be the most complete, as the first one is
        // the best laid out. For now the "most complete" is simply the deepest - could
        // count descendents
        roots[0].sort((a, b) => {
            return a.generation - b.generation;
        });

        // STEP 3
        // Do the easy layout bits - we worked out the width of each generation above,
        // so give them each a width and X position. Also add a force between each
        // parent and child to forces[]
        for (const person of ordered) {
            person.genwidth = genwidth[person.generation];
            person.ty = NaN;
            person.tx = genwidth[0] / 2;
            for (let j = 1; j <= person.generation; j++) {
                person.tx += (genwidth[j - 1] + genwidth[j]) / 2 + GENERATIONMARGIN;
            }
            for (const par of person.parents()) {
                if (!par.hidden) {
                    par.forces.push(() => {
                        let v = person.ty - par.ty;
                        return v;
                    });
                    person.forces.push(() => {
                        let v = par.ty - person.ty;
                        // dividing v by parents.numVisibleChildren gives better results 90% of the time and much worse 10%. So skip.
                        return v;
                    });
                    par.numVisibleChildren++;
                }
            }
            if (person.svg) {
                let rect = person.svg.querySelector("rect");
                rect.setAttribute("width", person.genwidth);
                for (let text of person.svg.querySelectorAll("text")) {
                    text.setAttribute("x", Math.round(person.genwidth / 2));
                }
                person.svg.classList.toggle("focus", person == focus);
                person.svg.classList.toggle("pending", !person.isLoaded());
                person.svg.classList.remove("spouse");
            }
        }

        // STEP 4
        // Initial complex position of each person - the Y value.
        // Do this by traversing down from roots, doing a standard tree layout - conceptually
        // we have N columns, nodes are added to columns as the tree traverses, with the "y"
        // value increasing by the appropriate margin between the nodes each time. If a node
        // has children, its Y value is the maximum of that position and the center of its
        // children.
        //
        // The end result of this is a valid layout, no overlaps, but everything is squished
        // towards the top of each column.
        //
        // People are also assigned to "clumps" - a sequence of nodes in a column that move
        // together. Clumps are initially set to a node and its spouses.
        //
        const func = function (owner, person) {
            const generation = person.generation;
            let prev =
                genpeople[generation].length == 0 ? null : genpeople[generation][genpeople[generation].length - 1];
            if (person.hidden) {
                return null;
            }
            let mylast = person;
            if (!genpeople[generation].includes(person) && (prev == null || !isNaN(prev.ty))) {
                genpeople[generation].push(person);
                let spouseheight = 0;
                // Position spouses that have not previously been positioned
                // Only position ones with the same generation. It's theoretically
                // possible for a spouse to be in a different generation, but that
                // should only happen if they've been laid out as a child of a different root
                //
                // Also position spouses-of-spouses, recursively, if and only if they meet the following criteria:
                //  * no loaded father or mother
                //  * only children they share are shared with the original spouse.
                if (bundleSpouses > 0) {
                    let spouses = [];
                    let sq = [{ depth: 1, key: "0", person: person }];
                    for (const spousecheck of sq) {
                        if (DEBUG) console.log("Considering spouses(" + spousecheck.depth + ") for " + person);
                        let order = 0;
                        for (const spouse of spousecheck.person.spouses()) {
                            let reason = null;
                            if (spouse.hidden) {
                                reason = "hidden";
                            } else if (spouse.generation != generation) {
                                reason = "genmismtch";
                            } else if (genpeople[generation].includes(spouse)) {
                                reason = "already listed";
                            } else if (spousecheck.depth > 1) {
                                if (spouse.father && spouse.father.isLoaded()) {
                                    reason = "has father";
                                } else if (spouse.mother && spouse.mother.isLoaded()) {
                                    reason = "has mother";
                                } else {
                                    for (let child of spouse.children()) {
                                        if (
                                            (child.father == spouse && child.mother != spousecheck.person) ||
                                            (child.mother == spouse && child.father != spousecheck.person)
                                        ) {
                                            reason = "different child " + child;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!reason) {
                                if (DEBUG) console.log("Accepting spouse " + spouse + " of " + spousecheck.person);
                                let key = spousecheck.key + "." + order++;
                                spouses.push({
                                    p1: spousecheck.person,
                                    p2: spouse,
                                    depth: spousecheck.depth,
                                    key: key,
                                });
                                if (spousecheck.depth + 1 <= bundleSpouses) {
                                    sq.push({ depth: spousecheck.depth + 1, key: key, person: spouse });
                                }
                            } else {
                                if (DEBUG)
                                    console.log(
                                        "Skipping spouse " + spouse + " of " + spousecheck.person + ": " + reason
                                    );
                            }
                        }
                    }
                    // This sorts spouses "depth-first", so "second wife of first husband" is displayed before "second husband"
                    spouses.sort((a, b) => {
                        return a.key.localeCompare(b.key);
                    });
                    for (const spouse of spouses) {
                        genpeople[generation].push(spouse.p2);
                        if (spouse.p2.svg) {
                            spouse.p2.svg.classList.add("spouse");
                        }
                        spouse.p2.tx += SPOUSEINDENT * spouse.depth;
                        marriages.push({ a: spouse.p1, b: spouse.p2, top: mylast, bot: spouse.p2 });
                        mylast = spouse.p2;
                        person.clump.addPerson(spouse.p2);
                        spouseheight += spouse.p2.height + SPOUSEMARGIN;
                    }
                }
                // Recursively position children, keeping track of first/last child.
                // As we position spouses, lastchild is quite possibly a spouse
                let firstchild = null,
                    lastchild = null;
                for (const child of person.children()) {
                    if (child.generation > person.generation) {
                        let p = func(person, child);
                        if (p) {
                            if (!firstchild) {
                                firstchild = lastchild = p;
                            } else {
                                lastchild = p;
                            }
                        }
                    }
                }
                let y = NaN;
                if (isNaN(person.ty)) {
                    if (prev) {
                        // Y value depends on previous element
                        if (isNaN(prev.ty)) {
                            throw new Error("PREV is NaN: " + prev);
                        }
                        let rels = person.relationships(prev, { common: true, maxlength: 3 }); // 3=spouse's sibling's spouses
                        let rel = null;
                        y = OTHERMARGIN;
                        for (let r of person.relationships(prev, { common: true, maxlength: 3 })) {
                            // 3=spouse's sibling's spouses
                            if (r.name == "spouse" || r.name == "spouse's spouse") {
                                y = SPOUSEMARGIN;
                                rel = "spouse";
                                break;
                            } else if (r.name == "sibling" || r.name == "step-sibling" || r.name == "sibling-in-law") {
                                y = SIBLINGMARGIN;
                                rel = "sibling";
                                break;
                            }
                        }
                        y += (prev.height + person.height) / 2;
                        prev.clump.setNext(person.clump, y);
                        y += prev.ty;
                    } else {
                        y = 0;
                    }
                    person.ty = y;
                }
                // Node is positioned, now position spouses relative to this node.
                prev = person;
                y = person.ty;
                for (const spouse of person.clump.people()) {
                    if (spouse != person) {
                        const distance = (prev.height + spouse.height) / 2 + SPOUSEMARGIN;
                        y += distance;
                        spouse.ty = y;
                    }
                }
                return mylast; // return here to position nodes WRT to all children, including those owned by other nodes
            } else {
                // This node has been positioned, but traverse children anyway as
                // this node might have been positioned as another's spouse, and
                // have different children to the spouse.
                for (const child of person.children()) {
                    if (child.generation > person.generation) {
                        func(person, child);
                    }
                }
            }
            return null;
        };
        // Traverse each tree from each root
        for (let subroot of roots) {
            for (let root of subroot) {
                func(null, root);
            }
        }
        // This is the last resort fallback attempt at positioning a person.
        // If we see this something has gone wrong
        for (let gen = 0; gen < genpeople.length - 1; gen++) {
            for (const person of ordered) {
                if (person.generation == gen && isNaN(person.ty) && !person.hidden) {
                    console.warning("Emergency position! " + person);
                    func(null, person);
                }
            }
        }

        for (const person of ordered) {
            if (isNaN(person.ty) && !person.hidden) throw new Error("Person " + person + " ty is NaN");
            miny = Math.min(person.ty, miny);
            maxy = Math.max(person.ty, maxy);
        }
        for (const person of ordered) {
            person.ty -= miny;
        }
        maxy -= miny;
        miny = 0;

        // FINAL STEP
        // Improve the layout. This version of this algorithm starts with everything at the top
        // of each column, and moves nodes down only, column by column, based on the downward
        // forces on the node. If a node is moved in a column, it is queued to move again as is
        // the column either side. Repeat until passes=PASSES or nothing was moved.
        //
        // This is the slow bit and also where the heuristics are.
        const maxgen = genpeople.length - 1;
        q.length = 0;
        for (let gen = maxgen; gen >= 0; gen--) {
            q.push(gen);
        }
        let maxmove = 0;
        let pass = 0;
        const bubble = () => {
            const gen = q.shift();
            const column = genpeople[gen];
            maxmove = 0;
            for (let clump = column[column.length - 1].clump; clump; clump = clump.prevClump()) {
                let repeat = false;
                do {
                    repeat = false;
                    let dy = clump.force();
                    if (DEBUG) console.log("Clump: " + clump + " force=" + dy);
                    if (dy > 0) {
                        let next = clump.nextClump();
                        const y = clump.bottomPerson().ty;
                        let overlap = 0;
                        if (next) {
                            overlap = y + dy - (next.topPerson().ty - clump.nextMargin());
                        } else {
                            overlap = 0; // Nodes can expand below initial height
                            // overlap = (y + dy) - maxy;       // Nodes are limited to height of initial layout
                        }
                        if (overlap > 0) {
                            dy = Math.max(0, dy - overlap);
                            if (DEBUG)
                                console.log(
                                    "  overlap! Moving " +
                                        clump +
                                        " by " +
                                        dy +
                                        (next ? " and merging down" : ", hit bottom")
                                );
                            for (const person of clump.people()) {
                                person.ty += dy;
                            }
                            maxmove = Math.max(maxmove, dy);
                            if (next) {
                                clump.mergeWithNext();
                                repeat = true;
                            }
                        } else {
                            if (DEBUG) console.log("  Moving " + clump + " by " + dy);
                            for (const person of clump.people()) {
                                person.ty += dy;
                            }
                            maxmove = Math.max(maxmove, dy);
                        }
                    }
                } while (repeat);
                clump.resetMerge();
            }
            if (maxmove > MINMOVE) {
                // Relayout columns either-side and this column
                if (gen != maxgen && !q.includes(gen + 1)) {
                    q.push(gen + 1);
                }
                q.push(gen);
                if (gen != 0 && !q.includes(gen - 1)) {
                    q.push(gen - 1);
                }
            }
        };
        // Tested breaking into smaller events, but makes no real difference
        while (pass++ < PASSES && q.length) {
            bubble();
        }
        complete();
    }

    /**
     * Add any missing edges/labels
     */
    redrawEdges(focus) {
        const style = getComputedStyle(this.state.svg);
        const unloadedParentLength = this.#evalLength(style, style.getPropertyValue("--unloaded-parent-length"));
        const unloadedChildLength = this.#evalLength(style, style.getPropertyValue("--unloaded-child-length"));
        const unloadedSpouseLength = this.#evalLength(style, style.getPropertyValue("--unloaded-spouse-length"));
        const sameGenerationBend = this.#evalLength(style, style.getPropertyValue("--same-generation-bend"));
        const peoplepane = this.state.svg.querySelector(".people");
        const edges = this.state.svg.querySelector(".relations");
        const labels = this.state.svg.querySelector(".labels");
        let people = [];
        for (let n = peoplepane.firstElementChild; n; n = n.nextElementSibling) {
            const person = n.person;
            if (person) {
                people.push(person);
            }
        }
        for (const person of people) {
            const children = Array.from(person.children());
            const childAngle = Math.min(25, 140 / children.length);
            const startAngle = 91 - (childAngle * (children.length - 1)) / 2; // horz lines not painted properly in Safari
            for (const r of person.relations) {
                let add = false;
                const otherincluded = r.person.svg != null && r.person.svg.parentNode != null;
                if (r.rel == "parent") {
                    add = true;
                } else if (r.rel == "child") {
                    add = !otherincluded;
                } else if (r.rel == "spouse") {
                    if (otherincluded) {
                        add = person.ty < r.person.ty;
                    } else {
                        add = r.type != "inferred";
                    }
                }
                if (add) {
                    let pathname = "edge-" + Math.min(person.id, r.person.id) + "-" + Math.max(person.id, r.person.id);
                    let path = edges.querySelector("#" + pathname);
                    if (!path) {
                        path = document.createElementNS(this.#SVG, "path");
                        path.setAttribute("id", pathname);
                        if (r.rel == "spouse") {
                            // Link to spouse
                            if (otherincluded) {
                                if (r.type == "inferred") {
                                    path.classList.add("coparent");
                                } else {
                                    path.classList.add("spouse");
                                }
                            } else {
                                path.classList.add("spouse-unloaded");
                                path.targetLength = unloadedSpouseLength;
                            }
                        } else if (r.rel == "child") {
                            // Link to unloaded child
                            if (person == r.person.father) {
                                path.classList.add("father-unloaded");
                            } else if (person == r.person.mother) {
                                path.classList.add("mother-unloaded");
                            }
                            path.targetAngle = startAngle + children.indexOf(r.person) * childAngle;
                            path.targetLength = unloadedChildLength;
                        } else if (!otherincluded) {
                            // Link to unloaded parent
                            if (r.person == person.father) {
                                path.classList.add("unloaded-father");
                            } else if (r.person == person.mother) {
                                path.classList.add("unloaded-mother");
                            }
                            path.targetLength = unloadedParentLength;
                        } else {
                            // Loaded parent
                            if (r.person.data.Gender == "Male") {
                                path.classList.add("father");
                            } else if (r.person.data.Gender == "Female") {
                                path.classList.add("mother");
                            } else {
                                path.classList.add("parent");
                            }
                            if (person.generation == r.person.generation) {
                                path.targetSameGenerationBend = sameGenerationBend;
                            } else {
                                delete path.targetSameGenerationBend;
                            }
                        }
                        if (r.type) {
                            path.classList.add(r.type);
                        }
                        path.person0 = person;
                        path.person1 = r.person;
                        edges.appendChild(path);
                    }
                }
            }
            if (children.length == 0 && person.data.NoChildren == 1) {
                let path = edges.querySelector("#noissue-" + person.id);
                if (!path) {
                    path = document.createElementNS(this.#SVG, "path");
                    path.classList.add("noissue");
                    path.setAttribute("id", "noissue-" + person.id);
                    path.person0 = person;
                    edges.appendChild(path);
                }
            } else {
                let path = edges.querySelector("#noissue-" + person.id);
                if (path) {
                    path.remove();
                }
            }
            for (const marriage of this.state.view.marriages) {
                const person = marriage.a;
                const spouse = marriage.b;
                for (const r of person.relations) {
                    if (r.rel == "spouse" && r.person == spouse && r.type != "inferred" && r.date) {
                        let text = document.createElementNS(this.#SVG, "text");
                        text.appendChild(document.createTextNode(this.formatDate(r.date)));
                        text.classList.add("marriage");
                        text.setAttribute("id", "label-" + person.id + "-" + spouse.id);
                        labels.appendChild(text);
                        // Don't really have a good idea to display multiple spouses,
                        // at the moment it looks like each spouse marries the next one.
                        text.person = person;
                        text.person0 = marriage.top;
                        text.person1 = marriage.bot;
                        if (person == focus || r.person == focus) {
                            text.classList.add("focus");
                        }
                    }
                }
            }
        }
    }

    /**
     * Redraw. This is the animation frame, don't repeat work here
     */
    draw() {
        if (!this.state) {
            return;
        }
        const edges = this.state.svg.querySelector(".relations");
        const labels = this.state.svg.querySelector(".labels");
        let people = [];
        for (let i = 0; i < this.state.people.length; i++) {
            const person = this.state.people[i];
            if (person.svg && person.svg.parentNode) {
                people.push(person);
            }
        }

        // T from 0..1 depending on how far through animation we are
        let t = (Date.now() - this.state.refocusStart) / (this.state.refocusEnd - this.state.refocusStart);
        if (t < 0) {
            return;
        } else if (t >= 1) {
            t = 1;
        } else {
            window.requestAnimationFrame(() => {
                this.draw();
            });
        }
        t = t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; // Simple cubic bezier easing

        let x0 = null,
            x1,
            y0,
            y1;
        for (const person of people) {
            person.cx = person.x + (person.tx - person.x) * t;
            person.cy = person.y + (person.ty - person.y) * t;
            if (t == 1) {
                person.x = person.tx;
                person.y = person.ty;
            }
            //        console.log("  tick: " + i + " " + person.relations.length);
            let x = Math.round(person.cx);
            let y = Math.round(person.cy);
            let w = Math.round(person.genwidth / 2);
            let h = Math.round(person.height / 2);
            x -= w;
            y -= h;
            person.svg.setAttribute("transform", "translate(" + x + " " + y + ")");
            x = Math.round(person.tx - w);
            y = Math.round(person.ty - h);
            if (x0 == null) {
                x0 = x;
                y0 = y;
                x1 = x + w * 2;
                y1 = y + h * 2;
            } else {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x + w * 2);
                y1 = Math.max(y1, y + h * 2);
            }
        }
        let points = [];
        for (let path = edges.firstElementChild; path; path = path.nextElementSibling) {
            const cl = path.classList;
            const p0 = path.person0;
            const p1 = path.person1;
            let d = null;
            points.length = 0;
            // Points is a series of quadratic beziers; every second pair is a control point.
            if (cl.contains("spouse") || cl.contains("coparent")) {
                let edge = p0.cx < p1.cx ? -1 : 1;
                let px0 = p0.cx + p0.genwidth * 0.5 * edge;
                let py0 = p0.cy + p0.height * 0;
                let px2 = p1.cx + p1.genwidth * 0.5 * edge;
                let py2 = p1.cy + p1.height * 0;
                let px1 = (edge < 0 ? Math.min(px0, px2) : Math.max(px0, px2)) + 10 * edge;
                let py1 = (py0 + py2) / 2;
                points.push(px0);
                points.push(py0);
                points.push(px1);
                points.push(py0);
                points.push(px1);
                points.push(py1);
                points.push(px1);
                points.push(py2);
                points.push(px2);
                points.push(py2);
            } else if (cl.contains("father") || cl.contains("mother") || cl.contains("parent")) {
                let px0 = p0.cx + p0.genwidth * -0.5;
                let py0 = p0.cy + p0.height * 0;
                let px2 = p1.cx + p1.genwidth * 0.5;
                let py2 = p1.cy + p1.height * 0;
                let px1 = (px0 + px2) / 2;
                let py1 = (py0 + py2) / 2;
                points.push(px0);
                points.push(py0);
                if (path.targetSameGenerationBend) {
                    let xl = path.targetSameGenerationBend;
                    let yl = py0 < py2 ? xl / 2 : xl / -2;
                    points.push(px0 - xl);
                    points.push(py0);
                    points.push(px0 - xl);
                    points.push(py0 + yl);
                    points.push(px0 - xl);
                    points.push(py0 + yl + yl);
                    points.push(px1);
                    points.push(py1);
                    points.push(px2 + xl);
                    points.push(py2 - yl - yl);
                    points.push(px2 + xl);
                    points.push(py2 - yl);
                    points.push(px2 + xl);
                    points.push(py2);
                } else {
                    points.push((px0 + px1) / 2);
                    points.push(py0);
                    points.push(px1);
                    points.push(py1);
                    points.push((px1 + px2) / 2);
                    points.push(py2);
                }
                points.push(px2);
                points.push(py2);
            } else if (cl.contains("unloaded-father") || cl.contains("unloaded-mother")) {
                // p0 has a position, p1 (parent) does not.
                let px0 = p0.cx + p0.genwidth * -0.5;
                let py0 = p0.cy + p0.height * 0;
                let px2 = px0 - path.targetLength;
                let py2 = py0 + path.targetLength / (path.classList.contains("unloaded-father") ? -4 : 4);
                let px1 = (px0 + px2) / 2;
                let py1 = (py0 + py2) / 2;
                points.push(px0);
                points.push(py0);
                points.push((px0 + px1) / 2);
                points.push(py0);
                points.push(px1);
                points.push(py1);
                points.push((px1 + px2) / 2);
                points.push(py2);
                points.push(px2);
                points.push(py2);
            } else if (cl.contains("father-unloaded") || cl.contains("mother-unloaded")) {
                // p0 has a position, p1 (child) does not.
                let px0 = p0.cx + p0.genwidth * +0.5;
                let py0 = p0.cy + p0.height * 0;
                let px1 = px0 + path.targetLength * Math.sin((path.targetAngle * Math.PI) / 180);
                let py1 = py0 - path.targetLength * Math.cos((path.targetAngle * Math.PI) / 180);
                points.push(px0);
                points.push(py0);
                points.push(px1);
                points.push(py1);
            } else if (cl.contains("spouse-unloaded")) {
                let px0 = p0.cx + p0.genwidth * -0.5;
                let py0 = p0.cy + p0.height * 0;
                let px2 = px0 - (path.targetLength * 3) / 4;
                let py2 = py0 + path.targetLength;
                points.push(px0);
                points.push(py0);
                points.push((px0 + px2) / 2);
                points.push(py0);
                points.push(px2);
                points.push(py2);
            } else if (cl.contains("noissue")) {
                let px0 = Math.round(p0.cx) + p0.genwidth * 0.5;
                let py0 = Math.round(p0.cy);
                let h = p0.height;
                d = "M " + px0 + " " + py0 + " l 5 0 m 0 " + h / -2 + " l 0 " + h;
            }
            if (!d) {
                if (points.length < 4) {
                    d = "";
                } else {
                    d = "M " + Math.round(points[0]) + " " + Math.round(points[1]);
                    d += points.length == 4 ? " L" : " Q";
                    for (let i = 2; i < points.length; i++) {
                        d += " " + Math.round(points[i]);
                    }
                }
            }
            path.setAttribute("d", d);
        }
        for (let label = labels.firstElementChild; label; label = label.nextElementSibling) {
            const p = label.person;
            const p0 = label.person0;
            const p1 = label.person1;
            let cx = Math.round(p.cx - p.genwidth * 0.5);
            label.classList.add("left");
            let cy = Math.round(p0.cy + p1.cy) / 2;
            label.setAttribute("x", cx);
            label.setAttribute("y", cy);
        }
        let cx, cy;
        if (this.state.people.length && this.state.focus) {
            cx = this.state.view.cx0 + (this.state.focus.tx - this.state.view.cx0) * t;
            cy = this.state.view.cy0 + (this.state.focus.ty - this.state.view.cy0) * t;
        }
        x0 -= 50;
        x1 += 50;
        y0 -= 50;
        y1 += 50;
        this.reposition({ x0: x0, y0: y0, x1: x1, y1: y1, cx: cx, cy: cy });
        if (t == 1 && this.state.view.callback) {
            setTimeout(() => {
                this.state.view.callback();
            }, 0);
        }
    }

    dump() {
        let a = [];
        for (const person of this.state.people) {
            if (person.isLoaded()) {
                person.data.Id = person.id;
                if (person == this.state.focus) {
                    a.unshift(person.data);
                } else {
                    a.push(person.data);
                }
            }
        }
        console.log(JSON.stringify(a));
    }

    formatDate(date, state) {
        if (!date || date == "9999") {
            return null;
        } else if (date.endsWith("-00-00")) {
            date = date.substring(0, 4);
        } else if (date.endsWith("-00")) {
            date = date.substring(0, date.length - 2) + "27";
            date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
                Date.parse(date)
            );
            date = date.replace(/\b27[,]?\s*/, "");
        } else {
            date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
                Date.parse(date)
            );
        }
        if (state == "guess") {
            date = "c." + date;
        } else if (state == "before") {
            date = "bef." + date;
        } else if (state == "after") {
            date = "aft." + date;
        }
        return date;
    }

    /**
     * Find a person record for the specified ID, creating it if necessary
     * @param id the numeric id of a person, although a name (eg "Windsor-1") will also work for existing ids
     * @param load if true, create the record
     */
    find(id, load) {
        if (typeof id == "number") {
            id = id.toString();
        } else if (typeof id != "string") {
            throw new Error("bad argument");
        }
        // Note that wikitree IDs are case-insensitive
        let person = this.state.byid[id.toLowerCase()];
        if (!person && load) {
            person = new SlippyTreePerson(this, this.state.people.length, id);
            this.state.byid[id.toLowerCase()] = person;
            this.state.people.push(person);
        }
        return person;
    }

    /**
     * Load people.
     * @param the params to merge over the API call
     * @param callback the method to call once the people are loaded
     */
    load(params, callback) {
        this.#setLoading(true);
        this.#resetCategories();
        let usedparams = {
            action: "getPeople",
            fields: [
                "Name",
                "FirstName",
                "MiddleName",
                "LastNameAtBirth",
                "LastNameCurrent",
                "Suffix",
                "BirthDate",
                "DeathDate",
                "BirthLocation",
                "DeathLocation",
                "Gender",
                "DataStatus",
                "IsLiving",
                "IsMember",
                "Privacy",
                "Spouses",
                "NoChildren",
                "HasChildren",
                "Father",
                "Mother",
                "Manager",
                "Managers",
                "Categories",
                "Templates",
            ],
            appid: this.#APPID,
        };
        for (let key in params) {
            usedparams[key] = params[key];
        }

        const loader = (data) => {
            if (!this.state) {
                return;
            }
            this.#setLoading(false);
            //            console.log(JSON.stringify(data));
            const len = this.state.people.length;
            if (data[0].people) {
                this.state.focusEdges = {};
                let newpeople = [];
                for (const id in data[0].people) {
                    const r = data[0].people[id];
                    if (parseInt(id) > 0) {
                        const person = this.find(id, true);
                        person.load(data[0].people[id]);
                        newpeople.push(person);
                    }
                }
                for (const person of newpeople) {
                    for (const key of ["Father", "Mother"]) {
                        const id2 = person.data[key];
                        if (id2) {
                            const other = this.find(id2, true);
                            let certainty = person.data.DataStatus ? person.data.DataStatus[key] : null;
                            switch (certainty) {
                                case "30":
                                    certainty = "dna";
                                    break;
                                case "20":
                                    certainty = "confident";
                                    break;
                                case "10":
                                    certainty = "uncertain";
                                    break;
                                case "5":
                                    certainty = "nonbiological";
                                    break;
                                default:
                                    certainty = null;
                            }
                            person.link(key == "Father" ? "father" : "mother", other, certainty);
                        }
                    }
                    if (person.father && person.mother) {
                        person.father.link("spouse", person.mother, "inferred", person.data.BirthDate);
                    }
                    if (person.data.Spouses) {
                        for (const r of person.data.Spouses) {
                            const id2 = r.Id.toString();
                            const other = this.find(id2, true);
                            let certainty = r.DataStatus.MarriageDate;
                            if (certainty == "") {
                                certainty = null;
                            }
                            let date = r.MarriageDate;
                            person.link("spouse", other, certainty, date);
                        }
                    }
                }
            }
            if (callback) {
                callback();
            }
        };

        if (typeof WikiTreeAPI != "undefined" && WikiTreeAPI.postToAPI) {
            // We need to send "token" and do a POST on the live site, apparently.
            // Tap into WikiTreeAPI for this to future-proof for any other requirements.
            if (this.debug) console.log("Load " + JSON.stringify(usedparams));
            WikiTreeAPI.postToAPI(usedparams).then(loader);
        } else {
            let qs = "";
            for (let key in usedparams) {
                qs += qs.length == 0 ? "?" : "&";
                qs += encodeURIComponent(key) + "=";
                let val = usedparams[key];
                if (Array.isArray(val)) {
                    for (let i = 0; i < val.length; i++) {
                        if (i > 0) {
                            qs += ",";
                        }
                        qs += encodeURIComponent(val[i]);
                    }
                } else {
                    qs += encodeURIComponent(val);
                }
            }
            const url = this.#APIURL + qs;
            if (this.debug) console.log("Load " + url);
            fetch(url, { credentials: "include" })
                .then((x) => x.json())
                .then(loader);
        }
    }

    /**
     * Load any nodes required to make a connection between "name" and "name2",
     * and when complete call "callback")
     *
     * This is done by making a call to Wikitree+ and scraping the output to
     * get a list of IDs, then requesting those IDs (with nuclear=1) from WikiTree.
     */
    loadConnection(name, name2, nuclear, callback) {
        this.#setLoading(true);
        for (const person of this.state.people) {
            if (person.data.Name == name) {
                const url =
                    "https://plus.wikitree.com/function/WTPath/Path.htm?WikiTreeID1=" +
                    name +
                    " &WikiTreeID2=" +
                    name2 +
                    "&relatives=0&IgnoreIDs=";
                fetch(url)
                    .then((response) => {
                        return response.text();
                    })
                    .then((html) => {
                        this.#setLoading(false);
                        //                    console.log(html);
                        const doc = new DOMParser().parseFromString(html, "text/html");
                        let ids = [];
                        doc.querySelectorAll("tbody td:nth-child(3) a").forEach((e) => {
                            let href = e.href;
                            if (href.includes("/wiki/")) {
                                let id = href.substring(href.lastIndexOf("/") + 1);
                                ids.push(id);
                            }
                        });
                        console.log(
                            'Connection between "' + name + '" and "' + name2 + '" is through ' + JSON.stringify(ids)
                        );
                        if (ids.length > 0) {
                            this.load({ keys: ids, nuclear: nuclear, spouses: 1 - nuclear }, callback);
                        }
                    })
                    .catch((error) => {
                        this.#setLoading(false);
                        console.log(url);
                        console.log(error);
                    });
            }
        }
    }

    /**
     * Convert an {x:n, y:n} with pixel coordinates relative to the SVG element to logical coordinates
     */
    toSVGCoords(point) {
        let x = point.x;
        let y = point.y;
        x = (x - this.state.view.padx0) / this.state.view.scale + this.state.view.x0;
        y = (y - this.state.view.pady0) / this.state.view.scale + this.state.view.y0;
        return { x: x, y: y };
    }

    /**
     * Convert an {x:n, y:n} with logical coordinates to pixel coordinates relative to the SVG element
     */
    fromSVGCoords(point) {
        let x = point.x;
        let y = point.y;
        x = (x - this.state.view.x0) * this.state.view.scale + this.state.view.padx0;
        y = (y - this.state.view.y0) * this.state.view.scale + this.state.view.pady0;
        return { x: x, y: y };
    }

    /**
     * Evalate a CSS length in a specific context.
     * @param style the style
     * @param length the length value, eg "8px"
     */
    #evalLength(style, length) {
        // Cheat. Just do pixels for now
        return length.replace(/px$/, "") * 1;
    }

    /**
     * Query loaded nodes to see if they have children. Ideally this would not
     * be necessary, but the API makes us do this in two stages.
     */
    checkForUnloadedChildren() {
        // For each node we have that does not have the "childrenLoaded" flag
        const keys = [];
        for (const person of this.state.people) {
            if (!person.isHidden() && !person.childrenLoaded && keys.length < 98) {
                keys.push(person.id);
            }
        }
        if (keys.length) {
            this.load({ keys: keys, fields: ["Father", "Mother"], descendants: 1 }, () => {
                for (const id of keys) {
                    let person = this.find(id, false);
                    person.childrenLoaded = true;
                }
                this.checkForUnloadedChildren();
                this.redrawEdges(this.state.focus);
                window.requestAnimationFrame(() => {
                    this.draw();
                });
            });
        }
    }
}

/**
 * The SlippyTreePerson object.
 */
class SlippyTreePerson {
    // Duplicated content and probably junk in here, could certainly be trimmed

    constructor(tree, index, id) {
        this.tree = tree;
        this.index = index; // local index into array
        this.id = id; // unique number from wikitree
        this.data = {};
        this.relations = [];
    }

    load(data) {
        this.pruned = false;
        let changed = false;
        for (let key in data) {
            if (typeof this.data[key] == "undefined") {
                let val = data[key];
                if ((key == "BirthDate" || key == "DeathDate") && val == "0000-00-00") {
                    val = "9999";
                }
                if (key == "HasChildren" && val == 0) {
                    this.childrenLoaded = true;
                }
                this.data[key] = val;
                changed = true;
            }
        }
        if (data.Name && !this.tree.find(data.Name, false)) {
            this.tree.state.byid[data.Name.toLowerCase()] = this;
        }
        if (changed) {
            if (this.svg) {
                this.svg.remove();
                delete this.svg; // So its rebuilt
            }
        }
    }

    /**
     * Should we not display this person?
     */
    isHidden() {
        return !this.data.Name || this.pruned;
    }

    /**
     * Is this person loaded? "Loaded" just means we have core details, it doesn't mean we know all its relations
     */
    isLoaded() {
        return this.data.Name;
    }

    toString() {
        let out = '"';
        out += this.id;
        if (this.data.Name) {
            out += " " + this.data.Name;
        }
        out += " " + this.presentationName() + " " + this.presentationExtra();
        out += '"';
        return out;
    }

    searchName() {
        // we want 'firstname lastname', firstname middlename lastname, k
        if (!this.searchValue) {
            let out = [];
            out.push(this.data.Name);
            for (let sn of [this.data.LastNameAtBirth, this.data.LastNameCurrent, this.data.LastNameOther]) {
                let n = null;
                if (sn) {
                    if (this.data.FirstName) {
                        out.push(this.data.FirstName + " " + sn);
                    }
                    if (this.data.FirstName && this.data.MiddleName) {
                        out.push(this.data.FirstName + " " + this.data.MiddleName + " " + sn);
                    }
                    if (this.data.Nicknames) {
                        out.push(this.data.Nicknames + " " + sn);
                    }
                    if (this.data.RealName) {
                        out.push(this.data.RealName + " " + sn);
                    }
                }
            }
            for (let i = 0; i < out.length; i++) {
                // remove dups
                if (out.indexOf(out[i]) != i) {
                    out.splice(i, 1);
                }
            }
            this.searchValue = out
                .join(", ")
                .toLowerCase()
                .normalize("NFKD")
                .replace(/\p{Diacritic}/gu, "");
        }
        return this.searchValue;
    }
    presentationName() {
        if (!this.data.Name) {
            return "Unloaded";
        }
        let out = "";
        // Private Data will have no FirstName specified
        if (this.data.FirstName) {
            out += this.data.FirstName;
        } else {
            out += "[Private]";
        }
        if (this.data.MiddleName) {
            out += " " + this.data.MiddleName;
        }
        if (this.data.LastNameAtBirth != this.data.LastNameCurrent) {
            out += " (" + this.data.LastNameAtBirth + ")";
        }
        out += " " + this.data.LastNameCurrent;
        return out;
    }

    presentationExtra() {
        let out = "";
        let birthDate = this.tree.formatDate(
            this.data.BirthDate,
            this.data.DataStatus ? this.data.DataStatus.BirthDate : null
        );
        let deathDate = this.tree.formatDate(
            this.data.DeathDate,
            this.data.DataStatus ? this.data.DataStatus.DeathDate : null
        );
        if (birthDate && deathDate) {
            out += " (" + birthDate + " - " + deathDate + ")";
        } else if (birthDate) {
            out += " (" + birthDate + ")";
        } else if (deathDate) {
            out += " (- " + deathDate + ")";
        }
        return out;
    }

    /**
     * Add a relation
     * @param rel "father", "mother" or "spouse" (note "children" and "sibling" are also called, but internally)
     * @param person the other person
     * @param type the certainty to add to the relationship - "inferred" being a weak presumption of marriage between parents
     * @param date for spouses the marriage date
     */
    link(rel, person, type, date) {
        if (!person) {
            throw Error("person is null");
        }
        if (rel == "sibling" || rel == "child") {
            date = person.data.BirthDate;
        } else if (rel == "father") {
            date = this.data.BirthDate;
            this.father = person;
            this.father_certainty = type;
            rel = "parent";
        } else if (rel == "mother") {
            date = this.data.BirthDate;
            this.mother = person;
            this.mother_certainty = type;
            rel = "parent";
        } else if (rel != "spouse") {
            throw new Error("Unknown relation " + rel);
        }
        if (date == "0000" || date == "0000-00-00") {
            date = null;
        }
        // console.log("Link " + this + " " + rel + " " + person);
        let add = true,
            changed = false;
        for (let i = 0; i < this.relations.length; i++) {
            const r = this.relations[i];
            if (r.person == person && r.rel == rel) {
                if (
                    (r.date != date || r.type != type) &&
                    (type != "inferred" || (this.type == "inferred" && date < r.date))
                ) {
                    r.date = date;
                    r.type = type;
                    changed = true;
                }
                add = false;
                break;
            }
        }
        if (add) {
            this.relations.push({ rel: rel, person: person, date: date, type: type });
            changed = true;
        }
        if (changed) {
            this.relations.sort((a, b) => {
                if (a.date && b.date) {
                    return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id;
                } else if (a.date) {
                    return -1;
                } else if (b.date) {
                    return 1;
                } else {
                    return a.id - b.id;
                }
            });
            if (rel == "parent") {
                person.link("child", this, type);
                for (let sibling of person.children()) {
                    if (sibling != this) {
                        this.link("sibling", sibling);
                        sibling.link("sibling", this);
                    }
                }
            } else if (rel == "spouse") {
                person.link("spouse", this, type, date);
            }
        }
    }

    // Iterators for relations

    *children() {
        for (const r of this.relations) {
            if (r.rel == "child") {
                yield r.person;
            }
        }
    }

    *parents() {
        for (const r of this.relations) {
            if (r.rel == "parent") {
                yield r.person;
            }
        }
    }

    *spouses() {
        for (const r of this.relations) {
            if (r.rel == "spouse") {
                yield r.person;
            }
        }
    }

    *siblings() {
        // Does not include self
        for (const r of this.relations) {
            if (r.rel == "sibling") {
                yield r.person;
            }
        }
    }

    /**
     * Return an array of relationships, each of the form
     *  {name:"uncle", ancestral:true, path:[{name:"father",person:n},{name:"brother",person:n}]}
     * where "name" is the english name, "ancestral" is true if there is a common ancestor, and "path" is the steps taken
     *
     * @param options may contain boolean values
     *   -- common: co-parents are classed as spouses
     *   -- nosibling: ignore sibling relationships
     *   -- gender: gendered names: sibling becomes brother/sister, etc.
     *   -- half: half-siblings are distinguished
     *   -- maxdistance: only steps up to N are tested
     */
    relationships(other, options) {
        if (!options) {
            options = {};
        }
        let paths = [];
        if (other && other != this) {
            let q = [];
            let ancestors = [];
            let s;
            let minAncestralLength = 9999,
                minNonAncestralLength = 9999;
            q.push({ person: this, len: 0 });
            q.push({ person: other, len: 0 });
            while ((s = q.shift())) {
                for (let p of [s.person.father, s.person.mother]) {
                    if (p && !ancestors.includes(p)) {
                        ancestors.push(p);
                        if (!options.maxdistance || s.len < options.maxdistance) {
                            q.push({ person: p, len: s.len + 1 });
                        }
                    }
                }
            }

            q.push({ person: this, ancestral: true, path: [], skip: [this] });
            while ((s = q.shift())) {
                const person = s.person;
                for (let r of s.person.relations) {
                    let rel = r.rel;
                    if (!options.common && rel == "spouse" && r.type == "inferred") {
                        // Don't classify co-parents as spouses in this algo
                        continue;
                    }
                    if (options.nosibling && rel == "sibling") {
                        continue;
                    }
                    if (s.skip.includes(r.person)) {
                        continue;
                    }
                    let ancestral = s.ancestral;
                    let newskip = s.skip.concat([person]);
                    let skiprel;
                    switch (rel) {
                        case "parent":
                            skiprel = options.nosibling ? ["child", "parent"] : ["child", "parent", "sibling"];
                            break;
                        case "sibling":
                            skiprel = ["parent", "sibling"];
                            break;
                        case "child":
                            skiprel = ["spouse", "child"];
                            break;
                        case "spouse":
                            skiprel = ["child"];
                            ancestral = false;
                            break;
                    }
                    for (let r2 of person.relations) {
                        if (skiprel.includes(r2.rel) && !newskip.includes(r2.person)) {
                            newskip.push(r2.person);
                        }
                    }
                    if (options.gender) {
                        if (rel == "sibling" && r.person.data.Gender == "Male") {
                            rel = "brother";
                        } else if (rel == "sibling" && r.person.data.Gender == "Female") {
                            rel = "sister";
                        } else if (rel == "child" && r.person.data.Gender == "Male") {
                            rel = "son";
                        } else if (rel == "child" && r.person.data.Gender == "Female") {
                            rel = "daughter";
                        } else if (rel == "spouse" && r.person.data.Gender == "Male") {
                            rel = "husband";
                        } else if (rel == "spouse" && r.person.data.Gender == "Female") {
                            rel = "wife";
                        } else if (rel == "parent" && r.person.data.Gender == "Male") {
                            rel = "father";
                        } else if (rel == "parent" && r.person.data.Gender == "Female") {
                            rel = "mother";
                        }
                    }
                    if (options.half) {
                        if (rel == "sibling" || rel == "brother" || rel == "sister") {
                            if (person.father != r.person.father || person.mother != r.person.mother) {
                                rel = "half-" + rel;
                            }
                        }
                    }
                    let newpath = s.path.concat([{ rel: rel, person: r.person }]);
                    if (r.person == other) {
                        paths.push({ path: newpath, ancestral: ancestral }); // We have found path! Add it.
                        minNonAncestralLength = Math.min(minNonAncestralLength, newpath.length);
                        if (ancestral) {
                            minAncestralLength = Math.min(minAncestralLength, newpath.length);
                        }
                    } else {
                        if (ancestral && !ancestors.includes(r.person)) {
                            ancestral = false;
                        }
                        if (
                            (!options.maxdistance || newpath.length < options.maxdistance) &&
                            newpath.length < (ancestral ? minAncestralLength : minNonAncestralLength)
                        ) {
                            q.push({ person: r.person, ancestral: ancestral, path: newpath, skip: newskip });
                        }
                    }
                }
            }
            for (let i = 0; i < paths.length; i++) {
                let p = paths[i];
                // delete any paths which are longer versions of other paths. Sanity check.
                // delete any [non-ancestral] paths which are longer than the shortest path - lets keep the ancestral ones, just in case
                if (!p.ancestral && p.path.length > (p.ancestral ? minAncestralLength : minNonAncestralLength)) {
                    p = null;
                } else {
                    for (let p2 of paths) {
                        if (p != p2 && p2.path.length > p.path.length) {
                            let differs = false;
                            for (let j = 0; j < p.path.length; j++) {
                                if (p.path[j].person != p2.path[j].person) {
                                    differs = true;
                                    break;
                                }
                            }
                            if (!differs) {
                                p = null;
                                break;
                            }
                        }
                    }
                }
                if (p) {
                    p.name = this.computeEnglishRelationshipName(p.path);
                } else {
                    paths.splice(i--, 1); // delete
                }
            }
            // length-1 paths go to the front, after that sorted by ancestry, then length
            paths.sort((a, b) => {
                if (a.path.length == 1) {
                    return -1;
                } else if (b.path.length == 1) {
                    return 1;
                } else {
                    let d = (a.ancestral ? 0 : 1) - (b.ancestral ? 0 : 1);
                    if (d == 0) {
                        d = a.length - b.length;
                    }
                    return d;
                }
            });
        }
        return paths;
    }

    /**
     * Turn an array of relationship steps into an english description of the relationship.
     * This method is standalone, could be static
     * @p an array of values which may include any of ["mother", "father", "parent", "son", "daughter", "child", "husband", "wife", "spouse", "brother", "sister", "sibling", "half-brother", "half-sister", "half-sibling"]
     * @return is a string describing the relationship in english.
     */
    computeEnglishRelationshipName(p) {
        p = [...p]; // clone
        for (let i = 0; i < p.length; i++) {
            if (p[i].rel) {
                p[i] = p[i].rel;
            }
            if (typeof p[i] != "string") {
                throw new Error("Invalid argument: item " + i + " is not a string");
            }
        }
        const ggg = function (n) {
            switch (n) {
                case 0:
                    return "";
                case 1:
                    return "great-";
                case 2:
                    return "great-great-";
                default:
                    return n + "×great-";
            }
        };
        // cousins
        for (let i = 1; i + 1 < p.length; i++) {
            if (
                ["parent", "mother", "father"].includes(p[i - 1]) &&
                ["sibling", "brother", "sister", "half-brother", "half-sister", "half-sibling"].includes(p[i]) &&
                ["child", "son", "daughter"].includes(p[i + 1])
            ) {
                p[i] = "cousin";
                p.splice(--i, 1);
                p.splice(i + 1, 1);
                let n = 1;
                while (
                    i > 0 &&
                    i + 1 < p.length &&
                    ["parent", "mother", "father"].includes(p[i - 1]) &&
                    ["child", "son", "daughter"].includes(p[i + 1])
                ) {
                    n++;
                    p.splice(--i, 1);
                    p.splice(i + 1, 1);
                }
                switch (n) {
                    case 1:
                        n = "first";
                        break;
                    case 2:
                        n = "second";
                        break;
                    case 3:
                        n = "third";
                        break;
                    case 4:
                        n = "fourth";
                        break;
                    case 5:
                        n = "fifth";
                        break;
                    case 6:
                        n = "sixth";
                        break;
                    case 7:
                        n = "seventh";
                        break;
                    case 8:
                        n = "eighth";
                        break;
                    case 9:
                        n = "ninth";
                        break;
                    default:
                        n = n + (n < 20 ? "th" : n % 10 == 1 ? "st" : n % 10 == 2 ? "nd" : n % 10 == 3 ? "rd" : "th");
                }
                p[i] = n + "-cousin";
                n = 0;
                while (i > 0 && ["parent", "mother", "father"].includes(p[i - 1])) {
                    p.splice(--i, 1);
                    n++;
                }
                while (i + 1 < p.length && ["child", "son", "daughter"].includes(p[i + 1])) {
                    p.splice(i + 1, 1);
                    n++;
                }
                if (n > 0) {
                    switch (n) {
                        case 1:
                            n = "once";
                            break;
                        case 2:
                            n = "twice";
                            break;
                        default:
                            n += "×";
                    }
                    p[i] += " " + n + " removed";
                }
            }
        }
        // uncles/aunts
        for (let i = 0; i + 1 < p.length; i++) {
            if (
                ["parent", "mother", "father"].includes(p[i]) &&
                ["sibling", "brother", "sister", "half-brother", "half-sister", "half-sibling"].includes(p[i + 1])
            ) {
                p.splice(i, 1);
                let n = 0;
                while (i > 0 && ["parent", "mother", "father"].includes(p[i - 1])) {
                    n++;
                    p.splice(--i, 1);
                }
                p[i] = ["brother", "half-brother"].includes(p[i])
                    ? "uncle"
                    : ["sister", "half-sister"].includes(p[i])
                    ? "aunt"
                    : "uncle/aunt";
                if (n > 0) {
                    p[i] = ggg(n) + p[i];
                }
            }
        }
        // nephew/niece
        for (let i = 0; i + 1 < p.length; i++) {
            if (
                ["sibling", "brother", "sister", "half-brother", "half-sister", "half-sibling"].includes(p[i]) &&
                ["child", "son", "daughter"].includes(p[i + 1])
            ) {
                let n = 0;
                p.splice(i, 1);
                while (i + 1 < p.length && ["child", "son", "daughter"].includes(p[i + 1])) {
                    n++;
                    p.splice(i, 1);
                }
                p[i] = p[i] == "son" ? "nephew" : p[i] == "daughter" ? "niece" : "nephew/niece";
                if (n > 0) {
                    p[i] = ggg(n) + p[i];
                }
            }
        }
        // grandparent
        for (let i = 0; i + 1 < p.length; i++) {
            if (["parent", "mother", "father"].includes(p[i]) && ["parent", "mother", "father"].includes(p[i + 1])) {
                let n = 0;
                p.splice(i, 1);
                while (i + 1 < p.length && ["parent", "mother", "father"].includes(p[i + 1])) {
                    n++;
                    p.splice(i, 1);
                }
                p[i] = "grand" + p[i];
                if (n > 0) {
                    p[i] = ggg(n) + p[i];
                }
            }
        }
        // grandchild
        for (let i = 0; i + 1 < p.length; i++) {
            if (["child", "son", "daughter"].includes(p[i]) && ["child", "son", "daughter"].includes(p[i + 1])) {
                let n = 0;
                p.splice(i, 1);
                while (i + 1 < p.length && ["child", "son", "daughter"].includes(p[i + 1])) {
                    n++;
                    p.splice(i, 1);
                }
                p[i] = "grand" + p[i];
                if (n > 0) {
                    p[i] = ggg(n) + p[i];
                }
            }
        }

        // step-sibling: parent-spouse-child
        for (let i = 0; i + 2 < p.length; i++) {
            if (
                ["parent", "mother", "father"].includes(p[0]) &&
                ["spouse", "husband", "wife"].includes(p[i + 1]) &&
                ["child", "son", "daughter"].includes(p[i + 2])
            ) {
                p.splice(i, 2);
                p[i] = p[i] == "child" ? "step-sibling" : p[i] == "son" ? "step-brother" : "step-sister";
            }
        }
        // sibling-in-law, case 3: spouse-sibling-spouse
        for (let i = 1; i + 1 < p.length; i++) {
            if (
                ["spouse", "husband", "wife"].includes(p[i - 1]) &&
                ["sibling", "brother", "sister", "half-brother", "half-sister", "half-sibling"].includes(p[i]) &&
                ["spouse", "husband", "wife"].includes(p[i + 1])
            ) {
                p.splice(--i, 1);
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "sibling-in-law" : p[i] == "husband" ? "brother-in-law" : "sister-in-law";
            }
        }
        // step-parent: parent-spouse
        for (let i = 0; i + 1 < p.length; i++) {
            if (["parent", "mother", "father"].includes(p[i]) && ["spouse", "husband", "wife"].includes(p[i + 1])) {
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "step-parent" : p[i] == "husband" ? "step-father" : "step-mother";
            }
        }
        // step-child: spouse-child
        for (let i = 0; i + 1 < p.length; i++) {
            if (["spouse", "husband", "wife"].includes(p[i]) && ["child", "son", "daughter"].includes(p[i])) {
                p.splice(i, 1);
                p[i] = "step-" + p[i];
            }
        }
        // sibling-in-law: spouse-sibling
        for (let i = 1; i < p.length; i++) {
            if (
                ["spouse", "husband", "wife"].includes(p[i - 1]) &&
                ["sibling", "brother", "sister", "half-brother", "half-sister", "half-sibling"].includes(p[i])
            ) {
                p.splice(--i, 1);
                p[i] += "-in-law";
            }
        }
        // sibling-in-law: sibling-spouse
        for (let i = 0; i + 1 < p.length; i++) {
            if (
                ["sibling", "brother", "sister", "half-brother", "half-sister", "half-sibling"].includes(p[i]) &&
                ["spouse", "husband", "wife"].includes(p[i + 1])
            ) {
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "sibling-in-law" : p[i] == "husband" ? "brother-in-law" : "sister-in-law";
            }
        }
        // child-in-law: child-spouse
        for (let i = 0; i + 1 < p.length; i++) {
            if (["child", "son", "daughter"].includes(p[i]) && ["spouse", "husband", "wife"].includes(p[i + 1])) {
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "child-in-law" : p[i] == "husband" ? "son-in-law" : "daughter-in-law";
            }
        }
        // parent-in-law: spouse-parent
        for (let i = 1; i < p.length; i++) {
            if (["spouse", "husband", "wife"].includes(p[i - 1]) && ["parent", "mother", "father"].includes(p[i])) {
                p.splice(--i, 1);
                p[i] += "-in-law";
            }
        }
        return p.join("'s ");
    }

    /**
     * Execute a popupmenu action for this person
     * @param name the name of the action
     * @param value the secondary value, which is normally null except when "search" is run with a value
     */
    action(name, value) {
        if (this.debug) console.log("Action(" + name + "," + value + ") on " + this);
        const tree = this.tree;
        if (name != "search") {
            tree.state.personMenu.classList.add("hidden");
            tree.state.searchMenu.classList.add("hidden");
        }
        if (name == "focus") {
            // Refocus the tree on this node
            tree.setFocus(this);
        } else if (name == "nuclear") {
            // Load the "nuclear" family for this node
            tree.load({ keys: this.id, nuclear: 1 }, () => {
                this.childrenLoaded = true;
                tree.setFocus(this);
            });
        } else if (name == "ancestors") {
            // Load 4 (the max) levels of ancestors for this node
            tree.load({ keys: this.id, ancestors: 4 }, () => {
                tree.setFocus(this);
            });
        } else if (name == "descendants") {
            // Load 4 (the max) levels of descendants for this node, and their spouses. Multi stage.
            // Load ...
            const depth = 4;
            this.childrenLoaded = false;
            tree.load({ keys: this.id, descendants: depth }, () => {
                // ... focus ...
                this.childrenLoaded = true;
                for (let child of this.children()) {
                    if (depth > 1) {
                        child.childrenLoaded = true;
                        if (depth > 2) {
                            for (let gchild of child.children()) {
                                gchild.childrenLoaded = true;
                                if (depth > 3) {
                                    for (let ggchild of gchild.children()) {
                                        ggchild.childrenLoaded = true;
                                    }
                                }
                            }
                        }
                    }
                }
                tree.setFocus(this, () => {
                    // ... then load their unloaded spouses ...
                    // This completely destroys performance, and TBH
                    // we don't need it. We only need to indicate that
                    // there are spouses to load. How best to do that
                    // with the current API? Not sure.
                    // Load them and mark as hidden?
                    /*
                    let q = [];
                    q.push(this);
                    const func = function(person) {
                        if (!person.isHidden()) {
                            for (const child of person.children()) {
                                q.push(child);
                                func(child);
                            }
                        }
                    };
                    func(this);
                    let spouses = [];
                    for (let person of q) {
                        for (const spouse of person.spouses()) {
                            if (!spouse.isLoaded()) {
                                spouse.growFrom = person;
                                spouses.push(spouse.id);
                            }
                        }
                    }
                    tree.load({keys: spouses}, () => {
                        // ... then focus again
                        tree.setFocus(this);
                    });
                    */
                });
            });
        } else if (name == "prune") {
            // Mark as pruned any nodes not reachable as a parent,
            // descendant, or spouse of a descendant
            const q = [];
            q.push(this);
            for (let i = 0; i < q.length; i++) {
                const person = q[i];
                if (person.mother && !person.mother.isHidden()) {
                    q.push(person.mother);
                }
                if (person.father && !person.father.isHidden()) {
                    q.push(person.father);
                }
            }
            const func = function (person) {
                if (!person.isHidden()) {
                    for (const child of person.children()) {
                        q.push(child);
                        func(child);
                    }
                }
            };
            func(this);
            for (let i = q.length - 1; i >= 0; i--) {
                const person = q[i];
                for (const spouse of person.spouses()) {
                    if (!spouse.isHidden()) {
                        q.push(spouse);
                    }
                }
            }
            for (const person of tree.state.people) {
                person.pruned |= !q.includes(person);
            }
            tree.setFocus(this);
        } else if (name == "remove") {
            // Mark as pruned any nodes not reachable as a parent,
            // descendant, or spouse of a descendant
            const focus = tree.state.focus;
            const q = [];
            this.pruned = true;
            q.push(focus);
            for (let i = 0; i < q.length; i++) {
                const person = q[i];
                for (const p of person.parents()) {
                    if (!q.includes(p) && !p.isHidden()) {
                        q.push(p);
                    }
                }
                for (const p of person.children()) {
                    if (!q.includes(p) && !p.isHidden()) {
                        q.push(p);
                    }
                }
                for (const p of person.spouses()) {
                    if (!q.includes(p) && !p.isHidden()) {
                        q.push(p);
                    }
                }
            }
            for (const person of tree.state.people) {
                person.pruned |= !q.includes(person);
            }
            tree.setFocus(focus);
        } else if (name == "search") {
            if (value == null) {
                // Display the "search" menu.
                tree.state.searchMenu.classList.remove("hidden");
                tree.state.searchList.classList.add("hidden");
                tree.state.searchInput.focus();
            } else {
                let nuclear = document.querySelector(".slippy-search-family").classList.contains("selected") ? 1 : 0;
                // Find the specified person.
                const orig = this;
                const other = tree.find(value, false);
                tree.showMenu(false);
                if (other && !other.isHidden()) {
                    tree.setEdgeFocus(orig, other);
                    tree.setSecondaryFocus(orig);
                    tree.setFocus(other, () => {
                        tree.setEdgeFocus(orig, other);
                        tree.setFocus(other, () => {
                            tree.setSecondaryFocus(orig);
                        });
                        /*
                        if (nuclear) {
                            let rels = orig.relationships(other, { half:false, gender:false, nosibling:true });
                            let ids = [];
                            for (let r of rels) {
                                for (let p of r.path) {
                                    if (!ids.includes(p.person.id)) {
                                        ids.push(p.person.id);
                                    }
                                }
                            }
                            tree.load({keys: ids, nuclear:1}, () => {
                                for (let id of ids) {
                                    tree.find(id, true).childrenLoaded = true;
                                }
                                tree.setEdgeFocus(orig, other);
                                tree.setFocus(other, () => {
                                    tree.setSecondaryFocus(orig);
                                });
                            });
                        }
                        */
                    });
                } else {
                    // If it looks like a Wikitree-ID, load it.
                    if (/-\d+$/.test(value)) {
                        tree.loadConnection(this.data.Name, value, nuclear, () => {
                            let other = tree.find(value, false);
                            if (other) {
                                this.action("search", value);
                            }
                        });
                    }
                }
            }
        }
    }

    /**
     * Given a place, eg "Blah, Cornwall, England, United Kingdom" return country ("England")
     */
    #countryName(name) {
        if (SlippyTree.COUNTRIES) {
            let all = name.split(/, */);
            if (all.length) {
                let v = all[all.length - 1];
                for (let c of SlippyTree.COUNTRIES) {
                    if (c.name == v || (c.aliases && c.aliases.includes(v))) {
                        // Convert "England, United Kingdom" to "England"
                        if (c.name == "United Kingdom" && all.length > 1) {
                            v = all[all.length - 2];
                            if (v != "England" && v != "Scotland" && v != "Wales" && v != "Northern Ireland") {
                                v = "United Kingdom";
                            }
                        }
                        return v;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Return a free-form list of categories (strings, or arrays-of-strings for hierarchical) that apply to this person. Can be anything.
     */
    categories() {
        // Ideas:
        //   -- managed by me
        //   -- created by me
        //   -- on the trustlist
        //   -- categories and templates
        //   -- GEDCOM noise in bio
        //   -- died in different country to birthplace
        //   -- birth/death place uncertain
        //   -- no sources
        //   -- profile is not public
        //   -- profile has photo
        //   --
        let categories = [];

        if (this.data.IsLiving) {
            categories.push(this.tree.LIVINGPEOPLE);
        }

        let currentUserName = window?.wtViewRegistry?.session?.lm?.user?.name;
        if (currentUserName) {
            for (let p of this.data.Managers) {
                if (p.Name == currentUserName) {
                    categories.push(["Managed by me"]);
                }
            }
        }
        if (this.data.Manager === 0) {
            // If manager is private, "Managers" will return an empty list.
            // But "Manager" will be null (meaning private), as opposed to 0 (meaning no manager)
            categories.push(["No profile manager"]);
        }
        if (this.data.Privacy < 50) {
            categories.push(["Profile not public"]);
        }

        if (this.data.Templates) {
            for (let p of this.data.Templates) {
                if (!p.name || p.name.length == 0) {
                    continue;
                }
                const name = p.name[0].toUpperCase() + p.name.substring(1); // Sigh, case of first letter seems to be ignored, but not other letters.
                switch (name) {
                    // Skip external link templates
                    case "23AndMe":
                    case "AFAOA":
                    case "AIC-GIQ":
                    case "AncestryDNA":
                    case "Ancestry Image":
                    case "Ancestry Image":
                    case "Ancestry Record":
                    case "Ancestry Sharing":
                    case "Ancestry Tree":
                    case "Ancestry Tree Media":
                    case "Archives New Zealand":
                    case "BurkeUSP":
                    case "DAR-rgs":
                    case "EE censusf":
                    case "EE citation":
                    case "EE source":
                    case "EuroAristo Source":
                    case "FMG":
                    case "FamilySearch":
                    case "FamilySearch Book":
                    case "FamilySearch Image":
                    case "FamilySearch Record":
                    case "Family Tree DNA":
                    case "FindAGrave":
                    case "G2G":
                    case "G2GLink":
                    case "IMDb":
                    case "Kb":
                    case "MLA citation":
                    case "Mendenhall":
                    case "MyHeritageDNA":
                    case "National Archives Australia":
                    case "Newspapers.com":
                    case "ODMP":
                    case "PRDH":
                    case "Register":
                    case "SA-GA":
                    case "SBL":
                    case "SQ-NQ":
                    case "Spotify":
                    case "Tag":
                    case "Tag Link":
                    case "Texas History":
                    case "WTPlusLink":
                    case "Wikidata":
                    case "YouTube":
                        continue;
                        break;
                    // These templates are general, useful and unparameterised
                    case "Conflated":
                    case "Uncertain Existence":
                    case "Uncertain Family":
                    case "Uncertain Spouse":
                    case "Unsourced":
                        categories.push([name]);
                        break;
                    case "Occupation":
                        break;
                    default:
                        // The rest? Add them as Templates I guess...
                        categories.push(["Templates", name]);
                        break;
                }
            }
        }

        if (this.data.Categories) {
            for (let p of this.data.Categories) {
                const name = p.replace(/_/g, " ");
                categories.push(["Categories", name]);
            }
        }

        // Locations - single country means "born or died there", "X->Y" means "Born X, Died Y"
        let birthCountry = null,
            deathCountry = null;
        if (this.data.BirthLocation) {
            birthCountry = this.#countryName(this.data.BirthLocation);
        }
        if (this.data.DeathLocation) {
            deathCountry = this.#countryName(this.data.DeathLocation);
        }
        if (birthCountry && deathCountry) {
            categories.push(["Location", birthCountry + " → " + deathCountry]);
        }
        if (birthCountry) {
            categories.push(["Location", birthCountry]);
        }
        if (deathCountry && deathCountry != birthCountry) {
            categories.push(["Location", deathCountry]);
        }

        return categories;
    }
}

if (typeof window != "undefined") {
    window.SlippyTree = SlippyTree; // for wikitree-dynamic-tree
} else {
    let testvectors = [
        "AAGKixEBiosRFQACDNRiNAACl6m2AACGh-MDAQHFAAAAAAABeKXgAAGKiwYUAAGQVVsAAbJvYgAB2Oopek0A",
        "AAHY6qMBiosGCxUAAdjqowAB5k_CFCUlBwACDNRiNAACl6m2AACGh-MDAQHFAAAAAAABeKXgAAGKixoAAZBVWwABsm9iAAHY6inHAA",
        "AACGh-sBAIoLAAEVDI4AAXgwDA4NIgABeESfCgkfAAF4UJJMAAF6wglCAAGKiwYLFQABkvbzAAGTY0FOAAGUCT8FEAABmeDUNgABr_NfAAG1-C8AAbYiiBhDEAABt-rZeQABt_-7AAG4AeoAAbgoGiEoExcAAbg6DjYiJwABy0fuAAHQ0GcAAdjqo02CKDUAAdj7_0-sXgAB3gVsAAHeGVMAAeZPwhQlJQcAAghe-AACCMBOAAIM1GI0AAIaWMMAAhz7eAACIJ2uDAACJp6TFggnKQACLe16IAACMGJIAAJFJyhbChEeAAJFTXUYAAJZkgccAAJmcVMIQQACZnNlAAJuymAAAnHB6yQSMAACl6m2AAKdGJaPkR4AAp0mtRoAAHxAC0IAAIHRGwMFCgwYBAcEAACGhlkRRTgMCwsLCzw_GTADAQEDQgEBHQERAQEBTAAAlbWMBycCAAAAAAAA_7IMAAF4peAAAYqLGgABiqybAAGQVVsAAbJvYgAB2OopAAIc-vEAAhz8vwACYm3jAAJmc-kA",
        "AAF41uYBAzXXAAEg3jQAAXiDPoQHDSgAAXiScgwXAAF4pL8GCQcHBCFOIBoTGylv4AABeNWkAAF41tAWAAF5F-MAAXkopAABeXk6AAF6AkkbDxIAAYJ9aDkLG3kgxQABhY5GAAGPFEkAAZAuGAABkFVbAAGQkUsjLQABk2G9FwYiJlELFQABmyRfAAGbOIQAAZxsNgcAAawHLLgDCQoDBwYIAAGyb8ajAAHBMloAAcJOMAABysWqAAHK8gUwHIshZg8AAcsALyEPD2MOGiWWKC41RhRDG1U1AAHLnbUAAcut8ubXAAHO9lMd6jYgCwAB0SK_AAHWuL2DAAHY_mEAAdoQPw0AAeA_UQAB4FizHwAB4IDOBQULBI4GhyIqFQoOAAHj2e1DAAHlww93UgAB5ej-PHgAAeX94QwKAAHonMQtQWwuPEwbKgAB6K5iAAHor5sAAejE4R0AAejVIosAAejvqS8AAex75hcAAeynJAAB76dOAAHvzGlNOWEAAffzgAAB-B2UAAH4QzcgCAAB-Ny9ngAB-N5zXQACABA2AAIAPLgqEigAAgIQbSEAAgI1fWoAAgJFsgACAloAIRwdAAICXUQAAgKCZQ4NDooUAAIIXvgAAgzUYjQAAgzVzwACDPxUEPscFFUbEQACDTU7AAIPZiwAAhGoFQACG5KaAAIchswTGjoAAhyiKAcTAAIfDw0AAh9lVSkAAh9mfgACH5aiKkULAAIf7EcGAAIf7nkAAiAC1wACICAzBgACIHR9AAImrt0AAibFxVFGMh8rLwACJtWL3gACJxT_AAInO1IuEA0VPxoPAAI_pwkAAj-o9QUAAj_CrgACP_RuEQACTr1VAAJip295dAACYqnSMwACYrbJSIUXigACZnFTAAJmdAIAAmaBYUsAAmaD5BIvAAJmq2MkMQACZzEtAAJnMkQAAmdAyQACZ0HjAAJnfMUeJ0huPAACZ42hEz5KAAJnj0AAAmepoxsAAmesawACaBTMCDp3AAJoI-wxQi0sAAJoTVR9PwACaMybAAJo408JNClOJQACaOY5IQACaPWbICVhAAJpD3sSAAJpNgUAAmk3Z49WAAJpiUA5ECsAAmmqQw1sXxQAAnHDhxsAAnNJBh8AAnQlmB28MREAAnw4KFwAAnyQdD0AAnyShU8AAn64tQACfxhaSSAAAn9GlVIAAonqHUQAAopQWwACis9JAAKK54thAAKQBRIAApGcZBUNAAKXqbYAApe8ZygAApe_kgACnsL6AAKe5aLhAAKfCQVQYD-IJQACnx6lWmF4AAKgdogAAqDHagACoXJRAAKhmcaIAAB8QA8VHgAAfPyhFAAAgdEeBQokCwQAAIaGzQuQAQEBAQEBAgFyAwEBLwEBHwEBAQpoAACWoW4AAJeu-yMAAAAAAAEDNdIAAXiD8gABeXhhAAF7je0AAYqLEQABkC4EAAGyb2IAAdEW3QAB2Oopek0AAeWZewAB5f4MAAHo1pkAAejvlzAAAe-m7wAB-EOGAAIc-3gAAic7bwACMlmFAAJIkR4AAmZzZQACZsIrAAJnjiIAAop31gACis_lAAKK57kAApGcTQACnyAVAAKhcwcAAHxACwAAgdEbHhwAAIaHZwAAlrTXAACXrw8A",
        "AAAwZx4Ax4MvAADuAHkAAO4UFwAA-u__EgABAZJTAAFjYrgLAAGQHeMAAZBGSwABna4GAAGdyC6AOQABncwZAAGd1T1JDAo7AAGeGbKtAAHNQ7kAAd3zZgAAMF7pAAAwZx4CAwMBAAAwcZ0CAQEBAQMBLwECAQIBAQAAMS9jAgIBAQICAQECATcGAQAAMUbJAAAxSKALIQAAMUrQCQAB-6ahAAH7p6cAAmSHULIAAmSM0RJbGU8AAmSjIwAAPXD4AAA90msAAmtIbW8ZGWQhAAJrSv9RAAJ0r_4AAD9FSAUJAAA_SlUCAAA_lpQqAAKEV0QAAp0YFAACnkI2BAIHEQACnkW4BgQPJQoAAp797wACnv8IFH1aAAKfAP8AAEM0jgQKAgQAAqC8QwAAQ1QqAQAAQ1bJMAIIAwAATxkrMwsFBgAAT2ZYHAAAVMpmAgAAVuMvAABbMxYIAQYCAwMREwAAW2PGAABbgbkDCAAAXjGrCAwLBgMAAF42lQMOBxoAAF5NCFcXBwAAXk6HCgAAXnEDAgAAXoPLWwAAXpUsQAAAXtEMAQEBAQEBAQEBAQEBHQIBAQECAQEBAQECAQEBAQECXgEBAQEAAF73kQAACdsfAQEBAQEAAAneSgMCAgMDAwIBAgAACeCZAACWij0AAJaabAAAAAAAAKK4rwABAZImAAFUsbQAAWJBLgABj8djAAAwZx0CAwIBAwEBAAAxSwoAAmSH7QACZIzywAACn0KNAABDNHUAAqC8MAAAQ1b-AABbMw4AAF7ROw4A",
        "AABe0TUAorivAACi8roAAPrv_xIAAQGSJi0AAQ8AMwABY2K4AAGQHeMAAZBGSwABkEmlAAGdrgYAAZ3ILoA5AAGdzBkAAZ3VPUkMCjsAAZ4Zsq0AADBe6QAAMGcdAQEBAgEBAQEBAQEBJAUBAQECAgAAMHGdAgEBAQEDARgEAQIBAQ4BAgECAQEYHwMGAAAxLvECA20CAgEBAgIBAQIBAAAxRucCAgEFAAAxSwoMAwECAf0CAQMBAAH7p6cAAlU-RBMAAmSjIwAAPXD4AAJnw6VdaSsAAD3SawACa0htbxkZZCEAAmtLUAAAPz4XAAA_QoAwAAA_SlUCAAKeQjYEAgcRAAKe_e8AAEM0jg4CBAAAQ1QqAABPGgcAAE9mWBwAAFJa1QsAAFTKZgAAVuMvAABbMxYGBgMCAgEDJAAAXfJaAABecjUECgwAAF6aygAAXqHIAABe0QwBAQEBAQEBAQEBAQEdAgEBAQEBAQEBAQECAQEBAQEBAV4BAQEBAABe95EAAAnbHwEBAQEBAAAJ3koDAgIDAwMCAQIAAAAAAACit2MAAQGSGwABVLG0AAGHi3oAAY_HYwAAMGdLAgMBAAAwce8BAgECIQAAMUblCgAAMUsXAQMAAD8-CQAAP0J3DQAAQam7AABPGgoAAE9CxwoAAFJa3QAAWzMjAQAAXfJDAABeodEA",
        "AAJibeMBAIoLAAEVDI4AAXgwDA4NIgABeESfCgkfAAF4UJJMAAF6wf0MQgABiosGCxUAAYqsmwABkvbzAAGTY0FOAAGUCT8FEAABmeDUNgABr_NfAAG1-C8AAbYiiBhDEAABt-rZeQABt_-7AAG4AeoAAbgoGiEoExcAAbg6DjYiJwABy0fuAAHQ0GcAAdjqo02CKDUAAdj7_0-sXgAB3gVsAAHeGVMAAeZPwhQlJQcAAgg3qwACCF74AAIIwE4AAgzUYjQAAhIi8gACGljDAAIc-3gAAiCdrgwAAiaekxYIJykAAi3teiAAAjBiSAACRScoWwoRHgACRU11GAACWZIHHAACZnFTCEEAAmZzZQACbspgAAJxweskEjAAApeptgACnRiWj5EeAAKdJrUaAAB8QAtCAACB0RsDBQoMGAQHBAAAhoZZEUU4DAsLCws8PxgBMAMBAQMCQAEBHQERAQEBTAAAlbWMBycCAAAAAAAA_7IMAAF4peAAAYXdkhkUAAGKixoAAZBVWwABkJGbAAGyb2IAAdjqKQAB2OtkAAHY_mEAAeH32wAB4hzyAAHvp7AAAhz68QACHPv5xgACYm3jAAJmc-kAAIaGhQEAAIaHrgEBARUBAA",
        "AAJ9jgwCLYV0AAIumGMAAkiNERgAAkiPXw0sAAJWMTIIDAcMDgQAAlZ2qigtCAIHBgsAAlZ4MisAAlzurgACbrogAAJuu0EAAm6_ckwAAm8QoSYkGx8AAm8hHAcEAAJvJq8pLuUnAAJvNX0AAm83QtsebI8tKQMAAm870akSCAACbz9wRDkbdwACfYzcAAJ9jgwPHQwQKAACfaAcFBcLDA4P8QAAAAAAAKtqsQEAALDokwYAAR-Y9gABuPQcAAG5pTsAAc7GEQACLpgUbhQAAi6bGwACL3Y8AAJIjVUNAAJIvAQAAki9bAACVoN3AAJWnQgAAlaeQwACVqBPTwACZNOcLAACfLbIAABCfmsCAACNTmsA",
        "AAEfmPYCLYV0AAIumGMAAkiNERgAAkiPXwACSzzLSQACXO6uAAJkzn0AAnQmBggAApAvNwACoLw1AAAAAAAAq2qxAQAAsOiTBgABBhOJAAEfmPYAAYx6rwMAAY8h5AABuPPIVCMAAbmlOwABzsYRAAHa7008AAHgxsEsAAILg2EAAgz9XwACEhTVAAISQV0AAi6YFG4UAAIumxsAAi92PAACOULqAAJIjVUNogACSI9sLAACSJEeZQACSLwEAAJIvWxhIjKgLSM7agACSQLJKKAAAks6_g8EJbUOAAJLt0hBYAACS7m3AAJLu7sAAkwykAACThNGAAJQf-0cAAJRy6kAAlHNjCGEJZkeAAJR0Z5VAAJR8nsAAlZ2qigAAlaDdwACVp0IAAJWnkMAAlagT08AAlaic78AAlbHJQACVtJiAAJW8WcAAlcXzwACVxn5AAJcpB4AAlzQ98wAAl3-mAACXi5KAAJeNi0eAAJizAoAAmLNTAACZFZ9AAJkwmEAAmTGIQACZNOcLAACZOILCgACZTabAAJmGKwAAmaZ9gACb5CYAAJv1fYAAm_XDAACb-GxAAJ0JZgAAny2yAACfYzcAAJ9jgwAAoXOvwAChnNGAAKShzYAApKI4gACkv41XgAAQn5rAgAAT0zyAACNTmtOAA", // ancestors to one point
        "AABe0TUAorivAACi8roAABJtTgEAAPrv_xIAAQGSJi0AAQvH_XUAAQvJiQABC87aAAEOIagBAAEPADMAARHwXAABF0wxAAEca50AAR81DAABJLEOjnabAAEvz-5MAAEyhJsAATRwdgABNOp-AAFUsbQAAWDLYAABYkEuAAFjYrgLAAFpPG0uAAGPx2MAAZAd41EAAZBGSwABkHNaAAGQdGtAAAGSeRoXAAGU0EAAAZkVaAABmaztAAGa4Gh_AAGa4iAAAZsCw3MAAZ2uBgABncgugDkAAZ3MGQABndU9SQwKOwABnhmyrQABqafsAAGpqv4AAaq0VwABq3AZAAGw-NMAAbD62gABsPzyAAGw_sUAAbHsNQAALXyAAAHOcEYAADBe6QAAMGcdAQEBAgEBAQEBAQEBJAUBAQECAgAAMHGfAQIBAwEYBAECAQERBBkfAwYAAeqTPgAB6qCqES0AAeq64SUAADEu8QIDdwEAADFG5wICAQUAADFLCgwDAQIB_QIBAwEAAfumoQAB-6enAAIfZrMAAjOK7wACNWJuAAI2qukAAkcdIMEAAkiNVQACSQLJAAJJBlJiDwQAAlFMfgACUVb-AAJRecMAAlU-RBMAAlpqLwACX2DRAAJfempmAAJgIzMAAmAkxQACYCeEAAJkVn0AAmRZiSc4CgACZIdQnRUAAmSM0RIPNhYZTwwRBRMAAmSboQACZJ2VLAkhEQACZKLUBww8AAJl40oZAAJl6xcNAAJl8s8knAAAPXD4AAJmiAoAAmaJGJpdAAJmjWUAAmaOfQACZpr9FEYKAAJnMlEAAmdU6gACZ2JRAAJnsgAAAmfDpV1pKwACamNSEwACanfqDQACatRxAAJrSG1vGRlkIQACa0r_UQACa3UkAAJr22sAAnSv_gAAPz4XAAA_QoAwAAA_SlUCAAKLYOIAApcWQgACnE3iAAKcXWwzAAKc8QgAApz-BAACnRgUAAKeQjYEAgcRAAKeQ7UAAp5FuAYEDyUKAABDE0UAAp797wACnv8IFH0tLZh0AAKfBD8AAp8FVscAAp9CjR0AAp9D7jXJIC8MBAVuAAKfRr4AAEMpMwQCAwMCAABDLDMGBAAAQy_9AQMAAEMyWAICAABDNEwGBAEFBwYFBwgHAwcECgIEAAKgcyYAAqC4EgACoLwwBQ4EAABDVCoBAABDVskwAgMFAwAAQ2qCAQICAABGtDAEAQAATxoHAABPZlgcAABSWtULAABW4y8AAFsy9RkDAQEBAgIBAQQBBgIDAxETAABbNJMAAF3yWgAAXnI1BAoMAABemsoAAF6hyAAAXtEMAQEBAQEBAQEBAQEBHQIBAQEBAQEBAQEBAgEBAQEBAQFeAQEBAQAAXveRAAAJ2x8CAAAKjPAAAHk5XgYHCAYAAAAAAACit2MAAM4M6QABAZIbAAEW9YEAAS-7_QABMyjsAAE0cGAAAWDK8QABaTxUAAGHi3oAAZJ1AwABk407AAGUzuIAAZT2CgABlPkMAAGVHWoAAatvVQABx_i3AAHH-wsAAc7GEQAAMGdLAgMBAAAwcZ0ENQEDAgIRAQIBAiEAAeY0hQAAMS9jAgIBAQIEAgEAADFG5QoAADFLFwEDAAHz7WQAAjaV6wACSJKUXBcAAmRZoycRIAACZeM9HQACZesACQACZfK3AAJqYyIAAmt1DwACa9umGgACdQQbAAJ1BiYAAD8-CQAAP0J3DQAAQam7AAKWztUAApxC9QACnE5IAAKcXTIAApynjwACnKvsAAKcuTYAAEMTNwAAQyxGAABPGgoAAE9CxwoAAFJa3QAAVMpmAABd8kMAAF6h0QAACdsgAgEBAAAKjQIA", // Many Mathesons
        "AAABKvkAp87nAAARwFoAALzs9AAAvPIFAAC-jVIAAMN6bQAAyLCaGA4AAM-bAAAA0CkPAADS1Z8CBAQGAwAA1p2IAADYuJUAANjINwAA2az9BgAA4yLwCANfAQ0IAADjwMgAAOsy6gAA68CXAwMBAADrznsCBgAA7b8PAAEQoBoAARChoAABEOTRAAETE3cAARqUgQABG-GvAAEb5D4AAR6IqoiKDmMQGGYAAB8XrWt3AAAfGu0AAB8ctQABO16RAAE7ZoUgAAFEJf8LKA4WAAFEWOcICAUFDAUMAw9SCFMQMVIkCNUFAAFEXYVL_gkHBA4AAURjaxZKRhEKDAkuExQAAURl7g0sHQABRHxODAZLJAZjAwQGAgYKBgMHCQABRIBEIRsAAUtIlgABTE_3AAFjtxwAAWO4yqIAAWyzRQABfaxHAAF9rZgHAAF9r80AAZA9zAABkD-7AAGrDMQAAasPugwMCQAABGUIAAG58lkAAbn5xQABvlFLAAHcGpUAAeb92wAB5wAJvxl5JiskAAICVHkAAgZbtAACCWhTAAIUwuUAAjLWQAACNIKvAAI6Ty5-HAACTJXzAAJOqfkMDQYKAxsAAk6ugAACTq_VUB8MCQgGBQACTrdNGQ8QDVIGBgYFVAkKBwdPFB8NDwmXCQQQBQQGAgoHMgQFCTVQCgACUCSSHgoHCwACUCXWDAsFCwUIkQpnCQ4FXQlOBAYJBQ0IB1AHBgwBbAoGBwYHEzEGEHgJAAJdsPAAAl4MwLEAAm0RTwACdfeVAAKSWf8AApc3JgACnlVlAAKe_nQODBA5GRYfCxsLHgACn1P4GgcAAp-ZqhAAAp_a7QULBxALFw4ZDDYPEBAKAAKgOkUDAgkAAqGglQEFZgACoaLlDifjCQIBAgIDAAKhzU0SIT8REQACoes4AgYCBgMCUQAAWknzAgcHAwYFBQcDAAABKvMFAQcJAAABLaQDAQQBAQEBAQIBAQEBAQEBAQEDAgMBAQEBAwEBAQEDAQEBAQMBAQEBAQEBAQEBAwEEAgMHAwUBBAMBAQEEAQQBCA0BAQEBAQEAAA1XNQAAjJi4AACRV18AAJZWOQAAAAAAAJyJLAAAzlk1AADQJ_IAANApDgIAANjQrQAA5XUpAAD_e3kAAQmhEwABEY3eAAES7WIAAR53NQABHohiAAEeie14GhoAADHDDQACFL_AAAA2KjEAAjLWiAACTJUOAAKfmcEAAGTrsgAAcPohAAABKwgAAAEtqwcOKCgHBgAADVddAACRlJEA", // Four gens of Brigham Young
        "AAJh3r8CYd6BPjEFV0xmDQACYeHsQSEsNx6jAAJh5IcKnaALCAYNCQAClgWdJCQAAAAAAAJdCxAA", // Small but good test for spouse-bundling
        "AAAGOg0AmMdyAACZJq0FAACdAbYEAgdRAACdcZgGAwICBQAAngpCAACeD3gKAACe4mUAAKFVqwYGAwMGAACiYWIGIwwCAQUDBAAAooieCgAAo3yRAACmgVkBAACoAacMAQcAAKhmYgEFAACofzkAAKiUtAAAqKeWAACpGwoPDAQTBQdzAACsCPYHIgQDAgAArTOxAACvZWgIAQAAr5bJAAC1Qa8AALhjwgAAuU-_DwYFBAAAur1BAAC69tYAALtPfQAAvUcKBwAAAeZOAADFGp8JBgQFAADFIMcAAMWcQgAAx7v5AADH1mQAAM09gjQnBQofARIBmEcDAwAAztQ_AADO1YkAANDKmQAA0j0vAADUNHwAAOCgGwAA4UkiGRUpAADpH6MZHicFAADukyc6AgAA8QwRAAAZIqQAABkkVDUAAPuFihIKFAAA_uFkNrIJAAEAfkkAAQCyfQABALaBAAEAt4MVAAEAx-J6AAEEcWUAAQV1Eg4AAQXN3QABBeVYAwABBrcXAAEICEkAAQhBW0ZlAAEIWt8OAAEI15oAAQ0_HAABDYrmAAEP8PsAAQ_0uAABEC8wAAEQgWsRAQABEOsV3gABEkDvAAEU77YAARYNKVUYAAEWD1EAARr_1QABH96ZAAEnWzEAASdiKQABJ47wEwABKCVpCiYAASpuDgABK22BAAErcmcAATezMQ4JAAE7V5sdGAQHDRA3AAE7XCoHAAE8Rz0AAT2R1wABPeNkxzEUCxcvAAFCM1EAAUPE_x0AAUTsLQABTFErAAFZXaIAAV019TwAAV06JAABYUhwAAFilxgAAWLOvwABY1tBAAFje90HCAABY6EcAAFnJYQAAWtmqwABbq-4AAFu8S4AAXCxeAABdbGtFwUMLwABdfXNAAF6IsEAAYT4EgABh7HVAAGQuKYAACq_uwAAKsEdAAGzbi8SDAkSAAG0L3sAAbuyiQABvA5sAAHC9-IAAcNR4gABw1VxAAHDefsgCQABw3umAAHDgxcAAcOF_gABw6STAAHDqLUAAcQHxwABzBrgAAHPuyIYKAAB0JEPBA0LCgAB0RpUAAHS3WQAAdS70AAB1MFfAAHUwm8AAdTJrwYAAdU0RDjmAAHVuEQAAdXDzgAB1qBrFwAB1qM7BwgAAdkpiwAB2sMUAAHmXfoAAenhFAAB7l0gAAHuXqb0AAHuY2YAAf6newACABUMAwACDNlooiYAAhBZUQACEqmOAAIbiyQAAiJXQAACJ9RsAAIn13YAAi_psAAAOG-gAQACNWzPAAJBGwsAAkGN4AACR50RLgACVG9fAAA-F0OBAAAGOZoYAQE9ChIAAAY7rAQBAQFdAQACcJi_DwoAAnFxXSgAAnH3oS4AAnWSWRgbGAACdcbHAAJ3et0AAneHbwACd4rdgvQAAoPIUgACj-9IAABCNXcAAp6OTQAASHVIBwAASIQQBAEEAQEAAEiMrAAASv3cAABK_3B8AABVL0QAAFgQqgEBAABkHDQGAwAAaAaUDwAAb3aJAAByCUUGAQQCAAB5ocQAAHwOBwAAfYYAF0MAAH2HdQAAgL4fAACBryMFCAQLAACCOFsAAIKsIwYAAIK5zgEAAILLkQ4EBgUHAwAAgvEFAQoDAwIAAIPY-wIAAIQv8AoGAgcDAgAAhDFeBQAAhJdeAACGucYAAIbMUQkEAACHVCgJBwIFAwAAh35TGwIGBAQAAIpjdwAAjJWTvwAADhbtAACNOpUPAACNZ2wjAwkCGQAAjZumCAAAjdpvDgAAjeB6AACPUuIBAwAAj8klAACRLX0HCQUAAJFEUT4WMgAAlV5IAgAAlWAzFAYHLj0AAJViBAAAlx-4GAAAlyQ5DgAAl23nBwEAAJhydAAAAAAAAJjHaAAAmP4UAACZEdwAAJkmjQAAmtHCAACa4CgAAJtOKQAAm4A1AACcKrsAAJyDewAAnInEAACdAfAAAJ1xRQAAngmFAACeD34TAAChMBYAAKFViQAApZ2ZAACl-toAAKZYlgAAprE0AACnG_g1WgAAqAHGKAAAqGZbAACofx9sAACpGwQrJgAArTOPUAAArWgKAACtiqEAALNupAAAs4aIAACzkisAALVAewAAtj8QAAC27ycAALpMGQAAu054AAC8oMsAAL1G7wUAAAHnEwAAwrr_AADFGoQ1AADGHSMAAMe1jA4AAMvMSwAAzT2tJwsGIQMHAADPPNUAANI85AAA0tDIAADUNGMAANzPswAA4KALAADhSSkAABaTYwAAFpYkAADidY4AAOX3LwAA6R_6FAAA7pMIAADwpgkAAPaXRwAAGNIRAAD5bAIAABkjpgAA_kWeAAEAshEAAQC4DQABBHFvAAAaDPQAAQXlTgABCEHJAAEIWskAAQiD3AABCqGvAAELLaIAAQ0_EQABD789AAEQLvoAARHczAABFO91AAEXZdoAAB0fYgABKmq_AAEwvVsAATHZQwABOCI_AAE5YW0AAT2QQgABPyJ6AAE_ZuYAAUAEyAABQjNdAAFCVR8AAUPE2wABRFS2AAFE4a8AAUWmVwABRk6NAAADSiEAAUs3oAABUg88AAFXLDIAAVldiwABW-BaAAFiesEAAWLenwABY1toAAFjfscAAWZJ4wAAJIhzAAFu8OCnAAFwdw8AAXMcggABczhRAAF1sc4AAXqAWAABhPgFMwAAJvkyAAGLGbAAAYzBEwABlHccAAGUqmoAAZYwugABmxdZAAGdiqQAAZ5KBAABou1AAAGjuOwAAaSThQAAKsIvAAGyyzcAAbPk2QABup84AAG7l3IAAb2SmwABw1GdAAHDeZsAAcN7NgABw7kFAAHE1CQAAccT5wAByqXNAAHPvRwFAAHP_kwAAdEafwAB0U2YAAHRZ-AAAdG1yQAB1MmqAAHZa9MAAC9mcgAB7gaNAAHuX7MAAe5jXQAB7oSAAAHxydUAAf65dgcAAf-iFQACABTPIgACAT8aAAIPEDYAAiGlkQACKBpgAAA4b54AAjVsnwACPwqxAAJDsZoAAkt7wAACTwXAAAJUcocAAlXnQAAAPheEJA4GCwACbWuWAAAGOZEkAAAGO60BAQUAAnH3EgACdWfiAAJ3MlAAAoPIWQAChsIDAAKG3iMAAEI1cwAASHVEDwAASIQOAABJd6UAAFUvQwAAVocjAABYEK0AAGHrjgAAYit9AABkHBEnBAAAaLsnAABp7r4AAG92dQAAcI70AAByCUQAAHMIuwAADCOjAAB8DgYAAIB3GwAAglPLAACCq6IAAIK54QMAAIMTMwAAhDASAACGucwAAIbMGAAAh1RAAACIYtwAAIloMAAAi4_oAACMlZkJqgAAjWbOAACNm6MAAI3axAAAj1LnAACRQtcAAJFEGBcIAACR6xgAAJUhFQAAlV5NAACVX58AAJVu1wAAlaZwAACVqV8AAJW9GgAAlyPuAACXb7MAAJgQfAAAmHIiFVUA", // Reed-16536
        "AACRLZIAmMdyAACZJq0FAACdAbYEAgdRAACdcZgGAwICBQAAngpCAACeD3gKAACe4mUAAKFVqwYGAwMGAACiYWIGIwwCAQUDBAAAooieCgAAo3yRAACmgVkBAACoAacMAQcAAKhmYgEFAACofzkAAKiUtAAAqKeWAACpGwoPDAQTBQdzAACsCPYHIgQDAgAArTOxAACvZWgIAQAAr5bJAAC1Qa8AALhjwgAAuU-_DwYFBAAAur1BAAC69tYAALtPfQAAvUcKBwAAAeZOAADFGp8JBgQFAADFIMcAAMWcQgAAx7v5AADH1mQAAM09gjQnBQofARIBmEcDAwAAztQ_AADO1YkAANDKmQAA0j0vAADUNHwAAOCgGwAA4UkiGRUpAADpH6MZHicFAADukyc6AgAA8QwRAAAZIqQAABkkVDUAAPuFihIKFAAA_uFkNrIJAAEAfkkAAQCyfQABALaBAAEAt4MVAAEAx-J6AAEEcWUAAQV1Eg4AAQXN3QABBeVYAwABBrcXAAEICEkAAQhBW0ZlAAEIWt8OAAEI15oAAQ0_HAABDYrmAAEP8PsAAQ_0uAABEC8wAAEQgWsRAQABEOsV3gABEkDvAAEU77YAARYNKVUYAAEWD1EAARr_1QABH96ZAAEnWzEAASdiKQABJ47wEwABKCVpCiYAASpuDgABK22BAAErcmcAATezMQ4JAAE7V5sdGAQHDRA3AAE7XCoHAAE8Rz0AAT2R1wABPeNkxzEUCxcvAAFCM1EAAUPE_x0AAUTsLQABTFErAAFZXaIAAV019TwAAV06JAABYUhwAAFilxgAAWLOvwABY1tBAAFje90HCAABY6EcAAFnJYQAAWtmqwABbq-4AAFu8S4AAXCxeAABdbGtFwUMLwABdfXNAAF6IsEAAYT4EgABh7HVAAGQuKYAACq_uwAAKsEdAAGzbi8SDAkSAAG0L3sAAbuyiQABvA5sAAHC9-IAAcNR4gABw1VxAAHDefsgCQABw3umAAHDgxcAAcOF_gABw6STAAHDqLUAAcQHxwABzBrgAAHPuyIYKAAB0JEPBA0LCgAB0RpUAAHS3WQAAdS70AAB1MFfAAHUwm8AAdTJrwYAAdU0RDjmAAHVuEQAAdXDzgAB1qBrFwAB1qM7BwgAAdkpiwAB2sMUAAHmXfoAAenhFAAB7l0gAAHuXqb0AAHuY2YAAf6newACABUMAwACDNlooiYAAhBZUQACEqmOAAIbiyQAAiJXQAACJ9RsAAIn13YAAi_psAAAOG-gAQACNWzPAAJBGwsAAkGN4AACR50RLgACVG9fAAA-F0OBAAAGOZoYAQE9ChIAAAY7rAQBAQFdAQACcJi_DwoAAnFxXSgAAnH3oS4AAnWSWRgbGAACdcbHAAJ3et0AAneHbwACd4rdgvQAAoPIUgACj-9IAABCNXcAAp6OTQAASHVIBwAASIQQBAEEAQEAAEiMrAAASv3cAABK_3B8AABVL0QAAFgQqgEBAABkHDQGAwAAaAaUDwAAb3aJAAByCUUGAQQCAAB5ocQAAHwOBwAAfYYAF0MAAH2HdQAAgL4fAACBryMFCAQLAACCOFsAAIKsIwYAAIK5zgEAAILLkQ4EBgUHAwAAgvEFAQoDAwIAAIPY-wIAAIQv8AoGAgcDAgAAhDFeBQAAhJdeAACGucYAAIbMUQkEAACHVCgJBwIFAwAAh35TGwIGBAQAAIpjdwAAjJWTvwAADhbtAACNOpUPAACNZ2wjAwkCGQAAjZumCAAAjdpvDgAAjeB6AACPUuIBAwAAj8klAACRLX0HCQUAAJFEUT4WMgAAlV5IAgAAlWAzFAYHLj0AAJViBAAAlx-4GAAAlyQ5DgAAl23nBwEAAJhydAAAAAAAAJjHaAAAmP4UAACZEdwAAJkmjQAAmtHCAACa4CgAAJtOKQAAm4A1AACcKrsAAJyDewAAnInEAACdAfAAAJ1xRQAAngmFAACeD34TAAChMBYAAKFViQAApZ2ZAACl-toAAKZYlgAAprE0AACnG_g1WgAAqAHGKAAAqGZbAACofx9sAACpGwQrJgAArTOPUAAArWgKAACtiqEAALNupAAAs4aIAACzkisAALVAewAAtj8QAAC27ycAALpMGQAAu054AAC8oMsAAL1G7wUAAAHnEwAAwrr_AADFGoQ1AADGHSMAAMe1jA4AAMvMSwAAzT2tJwsGIQMHAADPPNUAANI85AAA0tDIAADUNGMAANzPswAA4KALAADhSSkAABaTYwAAFpYkAADidY4AAOX3LwAA6R_6FAAA7pMIAADwpgkAAPaXRwAAGNIRAAD5bAIAABkjpgAA_kWeAAEAshEAAQC4DQABBHFvAAAaDPQAAQXlTgABCEHJAAEIWskAAQiD3AABCqGvAAELLaIAAQ0_EQABD789AAEQLvoAARHczAABFO91AAEXZdoAAB0fYgABKmq_AAEwvVsAATHZQwABOCI_AAE5YW0AAT2QQgABPyJ6AAE_ZuYAAUAEyAABQjNdAAFCVR8AAUPE2wABRFS2AAFE4a8AAUWmVwABRk6NAAADSiEAAUs3oAABUg88AAFXLDIAAVldiwABW-BaAAFiesEAAWLenwABY1toAAFjfscAAWZJ4wAAJIhzAAFu8OCnAAFwdw8AAXMcggABczhRAAF1sc4AAXqAWAABhPgFMwAAJvkyAAGLGbAAAYzBEwABlHccAAGUqmoAAZYwugABmxdZAAGdiqQAAZ5KBAABou1AAAGjuOwAAaSThQAAKsIvAAGyyzcAAbPk2QABup84AAG7l3IAAb2SmwABw1GdAAHDeZsAAcN7NgABw7kFAAHE1CQAAccT5wAByqXNAAHPvRwFAAHP_kwAAdEafwAB0U2YAAHRZ-AAAdG1yQAB1MmqAAHZa9MAAC9mcgAB7gaNAAHuX7MAAe5jXQAB7oSAAAHxydUAAf65dgcAAf-iFQACABTPIgACAT8aAAIPEDYAAiGlkQACKBpgAAA4b54AAjVsnwACPwqxAAJDsZoAAkt7wAACTwXAAAJUcocAAlXnQAAAPheEJA4GCwACbWuWAAAGOZEkAAAGO60BAQUAAnH3EgACdWfiAAJ3MlAAAoPIWQAChsIDAAKG3iMAAEI1cwAASHVEDwAASIQOAABJd6UAAFUvQwAAVocjAABYEK0AAGHrjgAAYit9AABkHBEnBAAAaLsnAABp7r4AAG92dQAAcI70AAByCUQAAHMIuwAADCOjAAB8DgYAAIB3GwAAglPLAACCq6IAAIK54QMAAIMTMwAAhDASAACGucwAAIbMGAAAh1RAAACIYtwAAIloMAAAi4_oAACMlZkJqgAAjWbOAACNm6MAAI3axAAAj1LnAACRQtcAAJFEGBcIAACR6xgAAJUhFQAAlV5NAACVX58AAJVu1wAAlaZwAACVqV8AAJW9GgAAlyPuAACXb7MAAJgQfAAAmHIiFVUA", // Reed-16536, different focus
    ];
    let tree = new SlippyTree();
    tree.init(null, "Hansdatter-907", null);
    tree.restoreState(testvectors[testvectors.length - 1], () => {
        console.log("Layout 1 complete");
        tree.setFocus(tree.find("Davis-27116", true), () => {
            console.log("Layout 2 complete");
        });
    });
}
