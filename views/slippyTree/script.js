/**
 * SlippyTree consists of two classes: SlippyTree itself, and the SlippyTreePerson.
 *
 * It doesn't use D3 and it doesn't use the default "WikiTreePerson" object - requests
 * are done in SlippyTree.load() using the FetchAPI.
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
 *
 * Origin branch for this is https://github.com/faceless2/wikitree-dynamic-tree/
 */

if (typeof View != "function") { function View() { } } // To allow debugging in node.js

class SlippyTree extends View {

    static loadCount = 0;
    #VIEWPARAM = "slippyTreeState";  // Param to store details of current view in window location
    #VERSION = 0; // URLs may last over time, plan for extension
    #APIURL = "https://api.wikitree.com/api.php";
    #APPID = "SlippyTree";
    #SVG = "http://www.w3.org/2000/svg";
    #MINSCALE = 0.2;
    #MAXSCALE = 3;
    settings;

    /**
     * Props is an (optional) map with the following keys
     *  - trackpad: if true, the mousewheel is identified a trackpad, if false it's a mouse. Optional, will auto-detect by default
     *  - profileTarget: the target for any links to profiles, eg "_blank". Optional
     *  - dragScrollReversed: set to true to inverse the way drag-scrolling works. Optional.
     *  - bundleSpouses: how many depths of spouses to bundle together in the tree - 1 includes spouses of the person, 2 includes their
     *          spouses (so long as they have no other home in the tree), and so on. 0 disables bundling. Default is 2
     */
    init(container_selector, person_id, props) {
        this.browser = typeof window != "undefined";    // The code is sometimes debugged locally in nodejs too.
        this.state = {debug:{}};
        this.state.props = props || {};
        this.debug = typeof this.state.props.debug == "boolean" ? this.state.props.debug : this.browser ? window.deubgLoggingOn : true;
        this.state.container = typeof container_selector == "string" ? document.querySelector(container_selector) : container_selector;

        try {
            this.settings = JSON.parse(window.localStorage.getItem("slippyTree-settings"));
        } catch (e) {}
        if (!this.settings) {
            let hasMouse = this.browser && !window.matchMedia("not (hover: hover)").matches; // true if MQ recognised and primary device has no hover.
            this.settings = {
                wheel: hasMouse ? "zoom" : "scroll" 
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

  <div class="relationshipName"></div>
  <div class="personMenu hidden">
   <div class="output-name text-selectable"></div>
   <div data-action="focus">Focus</div>
   <div data-action="nuclear">Load family</div>
   <div data-action="ancestors">Load ancestors</div>
   <div data-action="descendants">Load descendants</div>
   <div data-action="prune">Prune to this branch</div>
   <a data-action="profile">View profile</a>
  </div>

 </div>

 <a class="slippy-help-button"></a>
 <div class="loader"></div>
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
      <g class="female living member focus" transform="translate(200 16)">
       <rect height="20" width="100"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
       <text y="14" x="50">Focus</text>
      </g>
      <g class="male spouse" transform="translate(210 46)">
       <rect height="20" width="100"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
       <text y="14" x="50">First Spouse</text>
      </g>
      <g class="male spouse" transform="translate(210 76)">
       <rect height="20" width="100"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
       <text y="14" x="50">Second Spouse</text>
      </g>
      <g class="male living" transform="translate(400 9)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
       <text y="14" x="30">Child</text>
      </g>
      <g class="male living member privacy-semiopen" transform="translate(400 49)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
       <text y="14" x="30">Child</text>
      </g>
      <g class="male" transform="translate(40 0)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
       <text y="14" x="30">Father</text>
      </g>
      <g class="female spouse" transform="translate(50 30)">
       <rect height="20" width="60"></rect>
       <path d="M 0 0 H 12 L 0 12 Z"></path>
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
      <text x="410" y="-8">Living Person</text>
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
   <div class="slippy-settings-wheel">
    <div class="slippy-settings-wheel-zoom">
     <img src="views/slippyTree/resources/mouse.svg"/>
     <span>Scroll-wheel zooms (best for mouse)</span>
    </div>
    <div class="slippy-settings-wheel-scroll">
     <img src="views/slippyTree/resources/trackpad.svg"/>
     <span>Scroll-wheel scrolls (best for trackpad)</span>
    </div>
    <p style="margin:0.5em 0 0 0">Or navigate with cursor keys and +/- to zoom</p>
   </div>
   <div class="icon-attribution">Icons by Andrew Nielsen and Simon Sim via the <a href="http://thenounproject.com">Noun Project</a> (CC BY 3.0)</div>
  </div>
 </div>
</div>

`;

        this.state.people = [];
        this.state.byid = {};
        this.state.view = {scale: 1, cx:0, cy: 0};
        this.state.focus = null;
        this.state.refocusStart = null;
        this.state.refocusEnd = null;

        if (this.browser) {
            this.state.container.style = "";   // Reset it, as some other tree types set style properties on it
            this.state.container.innerHTML = content.trim();

            this.setSettings();
            this.state.scrollPane = this.state.container.querySelector(".slippy-tree-scrollpane");
            this.state.svg = this.state.container.querySelector(".slippy-tree-scrollpane > svg");
            this.state.personMenu = this.state.container.querySelector(".personMenu");
            const helpButton = this.state.container.querySelector(".slippy-help-button");
            const helpContainer = this.state.container.querySelector(".helpContainer");
            const helpBox = helpContainer.querySelector(":scope > :first-child");
            helpButton.addEventListener("click", (e) => {
                this.state.personMenu.classList.add("hidden");
                helpContainer.classList.toggle("hidden");
            });
            helpBox.addEventListener("click", (e) => {
                helpContainer.classList.toggle("hidden");
            });
            document.querySelector(".slippy-settings-wheel-zoom").addEventListener("click", (e) => {
                this.setSettings({wheel:"zoom"}, e);
            });
            document.querySelector(".slippy-settings-wheel-scroll").addEventListener("click", (e) => {
                this.setSettings({wheel:"scroll"}, e);
            });

            for (let elt of this.state.personMenu.querySelectorAll("[data-action]")) {
                if (elt.getAttribute("data-action") != "profile") {
                    elt.addEventListener("click", () => {
                        this.state.personMenu.classList.add("hidden");
                        this.state.personMenu.person.action(elt.getAttribute("data-action"));
                    });
                }
            }
            // All the mouse/scroll events are here
            const pointers = [];
            this.state.svg.addEventListener("pointerdown", (e) => {
                pointers.push({ id:e.pointerId, screenX: e.screenX, screenY: e.screenY });
                this.state.personMenu.classList.add("hidden");
            });
            this.state.svg.addEventListener("pointerup", (e) => {
                if (e.isPrimary) {
                    pointers.length = 0;
                } else {
                    for (let i=0;i<pointers.length;i++) {
                        if (pointers[i].id == e.pointerId) {
                            pointers.splice(i, 1);
                        }
                    }
                }
            });
            this.state.personMenu.addEventListener("pointermove", (e) => {
                for (let n=this.state.personMenu.firstElementChild;n;n=n.nextElementSibling) {
                    n.classList.remove("focus");
                }
            });
            this.state.svg.addEventListener("pointermove", (e) => {
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
                        for (let elt of document.elementsFromPoint(e.pageX, e.pageY)) {
                            if (elt == this.svg) {
                                break;
                            } else if (elt.parentNode.person) {
                                found = elt.parentNode.person;
                                break;
                            }
                        }
                        this.setDescriptionFocus(found);
                        this.state.hoverScreenX = e.screenX;
                        this.state.hoverScreenY = e.screenY;
                    }
                } else if (pointers.length == 1) {
                    let elt = document.elementFromPoint(e.pageX, e.pageY);
                    if (elt == this.state.svg) {    // One finger dragging over background: scroll
                        this.state.scrollPane.scrollLeft -= pointers[0].dx;
                        this.state.scrollPane.scrollTop -= pointers[0].dy;
                    }
                } else if (pointers.length == 2) {  // Two fingers: pinch zoom
                    let ox0 = pointers[0].screenX;
                    let oy0 = pointers[0].screenY;
                    let ox1 = pointers[1].screenX;
                    let oy1 = pointers[1].screenY;
                    let nx0 = ox0 + pointers[0].dx;
                    let ny0 = oy0 + pointers[0].dy;
                    let nx1 = ox1 + pointers[1].dx;
                    let ny1 = oy1 + pointers[1].dy;
                    let od = Math.sqrt((ox1-ox0)*(ox1-ox0) + (oy1-oy0)*(oy1-oy0));
                    let nd = Math.sqrt((nx1-nx0)*(nx1-nx0) + (ny1-ny0)*(ny1-ny0));
                    const oscale = this.state.view.scale;
                    let nscale = oscale * nd / od;
                    let dx = ((nx1-ox1) + (nx0-ox0)) / 2;
                    let dy = ((ny1-oy1) + (ny0-oy0)) / 2;
                    let ncx = this.state.view.cx - dx / oscale;
                    let ncy = this.state.view.cy - dy / oscale;
                    this.reposition({scale:nscale, cx:ncx, cy:ncy});
                }
            });
            this.state.svg.addEventListener("wheel", (e) => {
                // Trackpad: wheel is scroll, wheel-with-ctrl is zoom (two finger pinch), drag is scroll
                // Mouse: wheel is zoom, drag is scroll
                // No way to auto-detect which.
                e.preventDefault();
                let view = { scale: this.state.view.scale, cx:this.state.view.cx, cy:this.state.view.cy };
                if (e.ctrlKey) {
                    view.scale -= e.deltaY * 0.01;
                } else if (this.settings.wheel == "scroll") {
                    view.cx += e.deltaX / view.scale * (this.state.props.dragScrollReversed ? -1 : 1);
                    view.cy += e.deltaY / view.scale * (this.state.props.dragScrollReversed ? -1 : 1);
                } else {
                    view.scale -= e.deltaY * 0.01;
                }
                this.reposition(view);
            });
            const self = this;
            this.state.container.addEventListener("keydown", (e) => {
                if (e.key == "ArrowUp" || e.key == "ArrowDown" || e.key == "ArrowRight" || e.key == "ArrowLeft" || e.key == "+" || e.key == "-" || e.key == "Enter" || e.key == "Escape" || e.key == "?") {
                    e.preventDefault();
                    const menu = this.state.personMenu;
                    if (menu.classList.contains("hidden")) {
                        let view = {scale: self.state.view.scale, cx:self.state.view.cx, cy:self.state.view.cy};
                        let focus = self.state.view.keyboardFocus;
                        if (!focus) {
                            focus = self.state.view.keyboardFocus = self.state.focus;
                        }
                        if (e.key == "Enter") {
                            menu.selectedIndex = 0;
                            self.showMenu(focus, e);
                        } else if (e.key == "Escape") {
                            helpContainer.classList.add("hidden");
                        } else if (e.key == "?") {
                            helpButton.click();
                        } else if (e.key == "+") {
                            view.scale *= 1.2;
                        } else if (e.key == "-") {
                            view.scale /= 1.2;
                        } else {
                            let score, best = null, max = 0x7FFFFFFF, threshold = 30;
                            for (const person of self.state.people) {
                                if (e.key == "ArrowUp" && Math.abs(person.cx - focus.cx) < threshold && person.cy < focus.cy && (score = focus.cy - person.cy) < max) {
                                    best = person;
                                    max = score;
                                } else if (e.key == "ArrowDown" && Math.abs(person.cx - focus.cx) < threshold && person.cy > focus.cy && (score = person.cy - focus.cy) < max) {
                                    best = person;
                                    max = score;
                                } else if (e.key == "ArrowRight" && person.cx - focus.cx > threshold && (score = ((person.cx - focus.cx) * 10) + Math.abs(person.cy - focus.cy)) < max) {
                                    best = person;
                                    max = score;
                                } else if (e.key == "ArrowLeft" && focus.cx - person.cx > threshold && (score = ((focus.cx - person.cx) * 10) + Math.abs(person.cy - focus.cy)) < max) {
                                    best = person;
                                    max = score;
                                }
                            }
                            if (best) {
                                view.cx = best.cx;
                                view.cy = best.cy;
                                view.keyboardFocus = best;
                                this.setSecondaryFocus(best);
                                this.setDescriptionFocus(best);
                            }
                        }
                        self.reposition(view);
                    } else {
                        let focus = menu.querySelector(":scope > .focus");
                        if (!focus) {
                            focus = menu.firstElementChild;
                            focus.classList.add("focus");
                        }
                        if (e.key == "Enter") {
                            focus.classList.remove("focus");
                            focus.click();
                        } else if (e.key == "Escape") {
                            focus.classList.remove("focus");
                            menu.classList.add("hidden");
                        } else if (e.key == "ArrowUp") {
                            if (focus.previousElementSibling) {
                                focus.previousElementSibling.classList.add("focus");
                                focus.classList.remove("focus");
                            }
                        } else if (e.key == "ArrowDown") {
                            if (focus.nextElementSibling) {
                                focus.nextElementSibling.classList.add("focus");
                                focus.classList.remove("focus");
                            }
                        }
                    }
                }
            });
            this.state.scrollPane.addEventListener("scroll", () => {
                if (!this.state) {
                    return;
                }
                this.state.view.cx = (((this.state.scrollPane.clientWidth / 2 + this.state.scrollPane.scrollLeft) - this.state.view.padx0) / this.state.view.scale) + this.state.view.x0;
                this.state.view.cy = (((this.state.scrollPane.clientHeight / 2 + this.state.scrollPane.scrollTop) - this.state.view.pady0) / this.state.view.scale) + this.state.view.y0;
            });
            this.state.resizeObserver = new ResizeObserver(entries => {
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
                helpContainer.classList.add("hidden");
                if (!this.restoreState(serializedState)) {
                    serializedState = null;
                }
            }
            if (serializedState == null) {
                if (person_id) {
                    helpContainer.classList.add("hidden");
                    this.reset(person_id);
                } else {
                    helpContainer.classList.remove("hidden");
                }
            }
        }
        SlippyTree.loadCount++;
    }

    meta() {
        return {
            // short title - will be in select control
            title: "Slippy Tree",
            // some longer description or usage
            description: "A mobile friendly tree that shows multiple relationships at once",
            // link pointing at some webpage with documentation
            docs: "",
            params: ["slippyTreeState"]
        };
    }

    close() {
        // Remember this object persists even when other views are selected.
        // Clear out all state - it's all under "this.state" now - and disconnect resize observer
        this.state.resizeObserver.disconnect();
        if (this.#VIEWPARAM) {
            let v = new URLSearchParams(window.location.hash.substring(1));
            v.delete(this.#VIEWPARAM);
            window.history.replaceState(null, null, "#" + v);
        }
        delete this.state;
    }

    setSettings(patch, e) {
        if (e) {
            e.stopPropagation();
        }
        if (patch) {
            for (let key in patch) {
                this.settings[key] = patch[key];
            }
        }
        let zoomButton = document.querySelector(".slippy-settings-wheel-zoom");
        let scrollButton = document.querySelector(".slippy-settings-wheel-scroll");
        zoomButton.classList.toggle("selected", this.settings.wheel == "zoom");
        scrollButton.classList.toggle("selected", this.settings.wheel == "scroll");
        window.localStorage.setItem("slippyTree-settings", JSON.stringify(this.settings));
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
        for (let pass=0;pass<2;pass++) {
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
        out.push(this.#VERSION);    // Plan for expansion!
        out.push((this.state.focus.id>>24)&0xFF);
        out.push((this.state.focus.id>>16)&0xFF);
        out.push((this.state.focus.id>>8)&0xFF);
        out.push((this.state.focus.id>>0)&0xFF);
        for (let j=0;j<data.length;j++) {
            const ids = data[j];
            if (j > 0) {
                out.push(0);
                out.push(0);
                out.push(0);
                out.push(0);
            }
            for (let i=0;i<ids.length;i++) {
                let delta = i == 0 ? 0 : ids[i] - ids[i - 1];
                if (i == 0 || (delta < 0 || delta > 255)) {
                    if (i > 0) {
                        out.push(0);
                    }
                    out.push((ids[i]>>24)&0xFF);
                    out.push((ids[i]>>16)&0xFF);
                    out.push((ids[i]>>8)&0xFF);
                    out.push((ids[i]>>0)&0xFF);
                } else {
                    out.push(delta);
                }
            }
            out.push(0);
        }
        // console.log("SAVE: D="+JSON.stringify(data));
        let s = out.map((b)=>String.fromCodePoint(b)).join("");
        return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    }

    /**
     * Deserialize a state string as created by "saveState". Return true if the operation succeeded
     */
    restoreState(val) {
        while ((val.length & 3) != 0) {
            val += "=";
        }
        try {
            val = atob(val.replaceAll("-","+").replaceAll("_","/"));
            let data = [[]];
            let i = 0;
            let version = val.codePointAt(i++);
            if (version != this.#VERSION) {
                return false;
            }
            let focusid = (val.codePointAt(i++)<<24) | (val.codePointAt(i++)<<16) | (val.codePointAt(i++)<<8) | val.codePointAt(i++);
            let id = 0, pass = 0;
            while (i < val.length) {
                if (id == 0) {
                    id = (val.codePointAt(i++)<<24) | (val.codePointAt(i++)<<16) | (val.codePointAt(i++)<<8) | val.codePointAt(i++);
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
            this.load({keys:data.flat()}, () => {
                for (const id of data[0]) {
                    const person = this.find(id);
                    person.childrenLoaded = true;
                }
                this.setFocus(this.find(focusid));
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
        this.state.view = {scale:1, cx:0, cy:0};
        this.state.people.length = 0;
        Object.keys(this.state.byid).forEach(key => delete this.state.byid[key]);
        this.state.focus = this.state.refocusStart = this.state.refocusEnd = null;
        // Clearing is a bit ad-hoc
        if (this.browser) {
            const container = this.state.svg.querySelector(".container");
            for (let n=container.firstChild;n;n=n.nextSibling) {
                while (n.firstChild) {
                    n.firstChild.remove();
                }
            }
        }
        if (id) {
            this.load({keys:id, nuclear:1}, () => {
                const person = this.state.byid[id];
                person.childrenLoaded = true;
                this.setFocus(person);
            });
        }
    }

    /**
     * Reposition the SVG. Expects a map with properties including scale, cx and cy (center logical coordinates0
     * @param props a map to merge over the current scale map
     */
    reposition(m) {
        if (this.state.people.length == 0) {
            this.state.view = {scale: 1, cx:0, cy: 0, x0:0, x1:0, y0:0, y1:0};
        } else {
            for (let key in m) {
                let v = m[key];
                if (typeof v != "number" || !isNaN(v)) {
                    this.state.view[key] = m[key];
                }
            }
        }
        this.state.view.scale = Math.max(this.#MINSCALE, Math.min(this.#MAXSCALE, this.state.view.scale));
        const targetWidth  = Math.round((this.state.view.x1 - this.state.view.x0) * this.state.view.scale);
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
            this.state.svg.style.paddingLeft   = this.state.view.padx0 + "px";
            this.state.svg.style.paddingRight  = this.state.view.padx1 + "px";
            this.state.svg.style.paddingTop    = this.state.view.pady0 + "px";
            this.state.svg.style.paddingBottom = this.state.view.pady1 + "px";
        }
        let tran = "scale(" + this.state.view.scale + " " + this.state.view.scale + ") ";
        tran += "translate(" + (-this.state.view.x0) + " " + (-this.state.view.y0) + ")";
        if (tran != this.state.view.tran) {
            this.state.svg.querySelector(".container").setAttribute("transform", this.state.view.tran = tran);
        }
        if (targetWidth != this.state.view.targetWidth || targetHeight != this.state.view.targetHeight) {
            this.state.svg.setAttribute("width", this.state.view.targetWidth = targetWidth);
            this.state.svg.setAttribute("height", this.state.view.targetHeight = targetHeight);
        }

        const targetX = Math.round((this.state.view.cx - this.state.view.x0) * this.state.view.scale) + this.state.view.padx0;
        const targetY = Math.round((this.state.view.cy - this.state.view.y0) * this.state.view.scale) + this.state.view.pady0;
        this.state.scrollPane.scrollLeft = Math.round(targetX - this.state.view.viewWidth / 2);
        this.state.scrollPane.scrollTop  = Math.round(targetY - this.state.view.viewHeight / 2);
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
        // Note both person and e can be missing to reposition the currently displayed menu
        if (!person) {
            person = this.state.personMenu.person;
        }
        this.state.personMenu.classList.remove("hidden");
        this.state.personMenu.showEvent = e;
        let menuWidth = this.state.personMenu.clientWidth;
        let c = this.fromSVGCoords({x:person.x - person.genwidth / 2, y:person.y + person.height / 2});
        let x0 = c.x;
        let y = c.y;
        let x1 = this.fromSVGCoords({x:person.x + person.genwidth / 2, y:0}).x;
        let sx;
        if (e) {
            document.querySelectorAll(".output-name").forEach((e) => {
                e.innerHTML = person.data.Name;
            });
            document.querySelectorAll("[data-action=\"profile\"]").forEach((e) => {
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
        let x = Math.max(x0, Math.min(x1 - menuWidth, x0 + (x1-x0)*sx - menuWidth / 2));
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
        }
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
                    let rels = first.relationships(second, { half:true, gender:true });
                    // Delete relationships with duplicate names, ie if we're second-cousin two ways.
                    let names = [];
                    for (let i=0;i<rels.length;i++) {
                        if (names.includes(rels[i].name)) {
                            rels.splice(i--, 1);
                        } else {
                            names.push(rels[i].name);
                        }
                    }
                    if (rels.length) {
                        val = "<span class=\"name\">";
                        val += second.presentationName();
                        val += "</span> is <span class=\"name\">";
                        val += first.presentationName();
                        val += "</span>'s <span class=\"rel\">";
                        val += rels[0].name;
                        if (rels.length > 1) {
                            val += "</span> (also <span class=\"rel\">";
                            for (let i=1;i<rels.length;i++) {
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
        if (this.state.view.keyboardFocus) {
            delete this.state.view.keyboardFocus;
            this.setDescriptionFocus(null);
            this.setSecondaryFocus(null);
        }

        // Setup: ensure every person has an SVG
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
                    this.setDescriptionFocus(person);
                    this.showMenu(person, e);
                });
                person.svg.setAttribute("id", "person-" + person.id);
                person.svg.appendChild(rect = document.createElementNS(this.#SVG, "rect"));
                person.svg.appendChild(path = document.createElementNS(this.#SVG, "path"));
                this.state.svg.querySelector(".people").appendChild(person.svg);
                if (person.data.Gender == "Male") {
                    person.svg.classList.add("male");
                } else if (person.data.Gender == "Female") {
                    person.svg.classList.add("female");
                }
                if (person.data.IsLiving) {
                    person.svg.classList.add("living");
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
                    person.svg.appendChild(text = document.createElementNS(this.#SVG, "text"));
                    text.appendChild(document.createTextNode(person.presentationName()));
                    text.appendChild(document.createTextNode(person.presentationExtra()));
                    let bbox = text.getBBox();
                    // NOTE: this is a hack to let us style with CSS. margin is not an SVG property
                    const style = getComputedStyle(text);
                    const pt = this.#evalLength(style, style.marginTop);
                    const pr = this.#evalLength(style, style.marginRight);
                    const pb = this.#evalLength(style, style.marginBottom);
                    const pl = this.#evalLength(style, style.marginLeft);
                    person.width = Math.ceil(bbox.width + pl + pr);
                    person.height = Math.ceil(bbox.height + pt + pb);
                    text.setAttribute("y", Math.round(pt + (person.height - pb - pt) * 0.8));
                }
                const ps = person.height * 0.6;
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
            }
        }

        // First sort people into priority, then
        // position based on focus node and priority
        // After this each person has "tx" and "ty" value set
        let ordered = this.order(focus, this.state.people);
        this.state.view.marriages = [];
        this.placeNodes(focus, ordered, this.state.view.marriages);

        // Re-add edges, people, labels in priority order
        if (this.browser) {
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
                if (isNaN(person.tx) || isNaN(person.ty)) throw new Error("Person="+person+" g="+person.generation+" tx="+person.tx+" ty="+person.ty);
                if (typeof person.x != "number") {
                    person.x = person.tx;
                }
                if (typeof person.y != "number") {
                    person.y = person.ty;
                }
                peoplepane.appendChild(person.svg);
            }
            this.redrawEdges(focus);
            this.state.refocusStart = Date.now();          // Begin our animation
            this.state.refocusEnd = Date.now() + 1000;
            this.state.focus = focus;
            this.state.view.cx0 = this.state.view.cx;
            this.state.view.cy0 = this.state.view.cy;
            this.state.view.callback = callback;
            window.requestAnimationFrame(() => { this.draw(); });

            // Initiate a load to check for unloaded children, effects
            // of which will be to add new paths. This can be done safely
            // during or after the draw callbacks
            this.checkForUnloadedChildren();
            if (this.#VIEWPARAM) {
                let v = new URLSearchParams(window.location.hash.substring(1));
                v.set(this.#VIEWPARAM, this.saveState());
                window.history.replaceState(null, null, "#" + v);
            }
        }
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
        for (let i=0;i<q.length;i++) {
            const person = q[i];
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
                throw new Error("includes hudden " + person);
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
    placeNodes(focus, ordered, marriages) {
        // These two adjust the layout quality.
        const PASSES = 5000;            // higher=slower, lower=worse layout. Visible issues with 1000, use 5000 
        const MINMOVE = 1;              // higher=faster, lower=more accuracy. Difference between 0.1 and 1 seems minimal but reduces 1000 people from 22s to 12s

        const style = this.state.svg ? getComputedStyle(this.state.svg) : null;
        const MINWIDTH = style ? this.#evalLength(style, style.getPropertyValue("--min-person-width")) : 50;
        const SPOUSEMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--spouse-margin")) : 10;
        const SPOUSEINDENT = style ? this.#evalLength(style, style.getPropertyValue("--spouse-indent")) : 10;
        const SIBLINGMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--sibling-margin")) : 20;
        const OTHERMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--other-margin")) : 40;
        const GENERATIONMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--generation-margin")) : 100;
        const DEBUG = typeof window == "undefined";     // This is never run in a browser, it's for testing locally in nodejs. So always false.
        const bundleSpouses = typeof this.state.props.bundleSpouses == "number" ? this.state.props.bundleSpouses : 2;

        const genpeople = [];
        const genwidth = [];
        const q = [];           // tmp working aray
        let miny = 99999, maxy = -99999;

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
                return this.prevClump() ? this.prevClump().nextMargin() : 0
            }
            nextMargin() {
                return this.#last.#nextMargin;
            }
            *people() {
                for (let c=this.#first;c;c=c.#next) {
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
                return "(" + count + " from \"" + this.topPerson().presentationName() + "\" to \"" + this.bottomPerson().presentationName() + "\" f="+this.force().toFixed(1)+" gap=["+this.prevMargin()+" "+this.nextMargin()+"])";
            }
            mergeWithNext() {
                let first = this.#first;
                let last = this.nextClump().#last;
                for (let c=first;;c=c.#next) {
                    c.#first = first;
                    c.#last = last;
                    if (c == last) {
                        break;
                    }
                }
            }
            resetMerge() {
                let last = this.#last;
                for (let c=this.#first;c;c=c.#next) {
                    c.#first = c.#last = c;
                    if (c == last) {
                        break;
                    }
                }
            }
            force() {
                let v = 0, c = 0;
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
        for (let person of ordered) {
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
        // that we haven't previously added.
        //
        // Store the unseen roots for each node in [roots]
        const roots = [], seen = [];
        for (let person of ordered) {
            let n = person, subroots = [];
            roots.push(subroots);
            while (q.length || n) {
                if (n != null) {
                    if (seen.includes(n)) {
                        n = null; // We have joined an already processed tree, go down again
                    } else {
                        seen.push(n);
                        const mother = n.mother && !n.mother.hidden ? n.mother : null;
                        const father = n.father && !n.father.hidden ? n.father : null;
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
        roots[0].sort((a,b) => {
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
            for (let j=1;j<=person.generation;j++) {
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
        const func = function(owner, person) {
            if (person.hidden) {
                return null;
            }
            const generation = person.generation;
            let mylast = person;
            if (!genpeople[generation].includes(person)) {
                let prev = genpeople[generation].length == 0 ? null : genpeople[generation][genpeople[generation].length - 1];
                if (prev != null && isNaN(prev.ty)) {
                    return NaN; // Following on from a half-complete item? Bail out
                }
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
                    let sq = [{depth:1, person:person}];
                    for (const spousecheck of sq) {
                        if (DEBUG) console.log("Considering spouses("+spousecheck.depth+") for "+person);
                        for (const spouse of spousecheck.person.spouses()) {
                            let reason = null;
                            if (spouse.hidden) {
                                reason = "hidden";
                            } else if (spouse.generation != generation) {
                                reason = "genmismtch"
                            } else if (genpeople[generation].includes(spouse)) {
                                reason = "already listed";
                            } else if (spousecheck.depth > 1) {
                                if (spouse.father && spouse.father.isLoaded()) {
                                    reason = "has father";
                                } else if (spouse.mother && spouse.mother.isLoaded()) {
                                    reason = "has mother";
                                } else {
                                    for (let child of spouse.children()) {
                                        if (((child.father == spouse && child.mother != spousecheck.person) || (child.mother == spouse && child.father != spousecheck.person))) {
                                            reason = "different child " + c;
                                            break;
                                        }
                                    }
                                }
                            }
                            if (!reason) {
                                if (DEBUG) console.log("Accepting spouse " + spouse + " of " + spousecheck.person);
                                genpeople[generation].push(spouse);
                                if (spouse.svg) {
                                    spouse.svg.classList.add("spouse");
                                }
                                spouse.tx += SPOUSEINDENT * spousecheck.depth;
                                marriages.push({a:spousecheck.person, b:spouse, top:mylast, bot: spouse});
                                mylast = spouse;
                                person.clump.addPerson(spouse);
                                spouseheight += spouse.height + SPOUSEMARGIN;
                                if (spousecheck.depth + 1 <= bundleSpouses) {
                                    sq.push({depth:spousecheck.depth + 1, person: spouse});
                                }
                            } else {
                                if (DEBUG) console.log("Skipping spouse " + spouse + " of " + spousecheck.person + ": " + reason);
                            }
                        }
                    }
                }
                // Recursively position children, keeping track of first/last child.
                // As we position spouses, lastchild is quite possibly a spouse
                let firstchild = null, lastchild = null;
                for (const child of person.children()) {
                    let p = func(person, child);
                    if (p) {
                        if (!firstchild) {
                            firstchild = lastchild = p;
                        } else {
                            lastchild = p;

                        }
                    }
                }
                let y = NaN;
                if (isNaN(person.ty)) {
                    if (prev) { // Y value depends on previous element
                        if (isNaN(prev.ty)) {
                            throw new Error("PREV is NaN: " + prev);
                        }
                        let rels = person.relationships(prev, {common: true, maxlength:3});  // 3=spouse's sibling's spouses
                        let rel = null;
                        y = OTHERMARGIN;
                        for (let r of person.relationships(prev, {common: true, maxlength:3})) {  // 3=spouse's sibling's spouses
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
                y = person.ty
                for (const spouse of person.clump.people()) {
                    if (spouse != person) {
                        const distance = (prev.height + spouse.height) / 2 + SPOUSEMARGIN;
                        y += distance;
                        spouse.ty = y;
                    }
                }
                return mylast;  // return here to position nodes WRT to all children, including those owned by other nodes
            } else {
                // This node has been positioned, but traverse children anyway as
                // this node might have been positioned as another's spouse, and
                // have different children to the spouse.
                for (const child of person.children()) {
                    func(person, child);
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
        for (const person of ordered) {
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
        for (let gen=maxgen;gen>=0;gen--) {
            q.push(gen);
        }
        let maxmove = 0;
        for (let pass=0;pass<PASSES && q.length;pass++) {
            const gen = q.shift();
            const column = genpeople[gen];
            maxmove = 0;
            for (let clump = column[column.length - 1].clump;clump;clump=clump.prevClump()) {
                let repeat = false;
                do {
                    repeat = false;
                    let dy = clump.force();
                    if (DEBUG) console.log("Clump: " + clump + " force="+dy);
                    if (dy > 0) {
                        let next = clump.nextClump();
                        const y = clump.bottomPerson().ty;
                        let overlap = 0;
                        if (next) {
                            overlap = (y + dy) - (next.topPerson().ty - clump.nextMargin());
                        } else {
                            overlap = 0;                        // Nodes can expand below initial height
                            // overlap = (y + dy) - maxy;       // Nodes are limited to height of initial layout
                        }
                        if (overlap > 0) {
                            dy = Math.max(0, dy - overlap);
                            if (DEBUG) console.log("  overlap! Moving " + clump + " by " + dy + (next ? " and merging down" : ", hit bottom"));
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
        }
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
        for (let n=peoplepane.firstElementChild;n;n=n.nextElementSibling) {
            const person = n.person;
            if (person) {
                people.push(person);
            }
        }
        // Any parent edge to anyone in "focuslist" gets focus.
        // Originally it contained just the person and their parents,
        // but it seems more useful to highlight all ancestors and children
        // especially in very big trees
        let focuslist = [];
        focuslist.push(focus);
        for (let i=0;i<focuslist.length;i++) {
            let p = focuslist[i];
            for (let n of p.parents()) {
                focuslist.push(n);
            }
        }
        let focuslist2 = [];
        focuslist2.push(focus);
        for (let i=0;i<focuslist2.length;i++) {
            let p = focuslist2[i];
            for (let n of p.children()) {
                focuslist2.push(n);
                focuslist.push(n);
            }
        }
        focuslist2 = null;
        for (const person of people) {
            const children = Array.from(person.children());
            const childAngle = Math.min(25, 140 / (children.length));
            const startAngle = 91 - (childAngle * (children.length - 1) / 2);       // horz lines not painted properly in Safari
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
                    let path = edges.querySelector("#edge-" + person.id + "-" + r.person.id);
                    if (!path) {
                        path = document.createElementNS(this.#SVG, "path");
                        path.setAttribute("id", "edge-" + person.id + "-" + r.person.id);
                        let focaledge = false;
                        if (r.rel == "spouse") {        // Link to spouse
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
                        } else if (r.rel == "child") {  // Link to unloaded child
                            if (person == r.person.father) {
                                path.classList.add("father-unloaded");
                            } else if (person == r.person.mother) {
                                path.classList.add("mother-unloaded");
                            }
                            path.targetAngle = startAngle + children.indexOf(r.person) * childAngle;
                            path.targetLength = unloadedChildLength;
                        } else if (!otherincluded) { // Link to unloaded parent
                            if (r.person == person.father) {
                                path.classList.add("unloaded-father");
                            } else if (r.person == person.mother) {
                                path.classList.add("unloaded-mother");
                            }
                            path.targetLength = unloadedParentLength;
                        } else {        // Loaded parent
                            if (r.person.data.Gender == "Male") {
                                path.classList.add("father");
                            } else if (r.person.data.Gender == "Female") {
                                path.classList.add("mother");
                            } else {
                                path.classList.add("parent");
                            }
                            focaledge = focuslist.includes(person) && focuslist.includes(r.person);
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
                        if (focaledge) {
                            path.classList.add("focus");
                            edges.appendChild(path);
                        } else {
                            edges.insertBefore(path, edges.firstChild);
                        }
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
                    if (person == focus) {
                        path.classList.add("focus");
                        edges.appendChild(path);
                    } else {
                        edges.insertBefore(path, edges.firstChild);
                    }
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
        for (let i=0;i<this.state.people.length;i++) {
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
            window.requestAnimationFrame(() => { this.draw() });
        }
        t = t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;  // Simple cubic bezier easing

        let x0 = null, x1, y0, y1;
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
                x1 = x + w*2;
                y1 = y + h*2;
            } else {
                x0 = Math.min(x0, x);
                y0 = Math.min(y0, y);
                x1 = Math.max(x1, x + w*2);
                y1 = Math.max(y1, y + h*2);
            }
        }
        for (let path=edges.firstElementChild;path;path=path.nextElementSibling) {
            let d = null;
            const p0 = path.person0;
            const p1 = path.person1;
            let px0 = 0, py0 = 0, px1 = 0, py1 = 0, px2 = 0, py2 = 0, px3 = 0, py3 = 0;
            const cl = path.classList;
            let xd = 0, yd = 0;
            if (cl.contains("spouse") || cl.contains("coparent")) {
                let edge = p0.cx < p1.cx ? -1 : 1;
                px0 = Math.round(p0.cx) + p0.genwidth * 0.5 * edge;
                py0 = Math.round(p0.cy) + p0.height   * 0;
                px3 = Math.round(p1.cx) + p1.genwidth * 0.5 * edge;
                py3 = Math.round(p1.cy) + p1.height   * 0;
                px1 = (edge < 0 ? Math.min(px0, px3) : Math.max(px0, px3)) + 10 * edge;
                py1 = py0;
                px2 = px1;
                py2 = py3;
            } else if (cl.contains("father") || cl.contains("mother") || cl.contains("parent")) {
                px0 = Math.round(p0.cx) + p0.genwidth * -0.5;
                py0 = Math.round(p0.cy) + p0.height * 0;
                px3 = Math.round(p1.cx) + p1.genwidth * 0.5;
                py3 = Math.round(p1.cy) + p1.height   * 0;
                if (path.targetSameGenerationBend) {
                    yd = path.targetSameGenerationBend * (py0 < py3 ? 1 : -1);
                    xd = path.targetSameGenerationBend * (px0 < px3 ? 1 : -1);
                }
                px1 = px0 + (px3 - px0) / 2;
                py1 = py0;
                px2 = px0 + (px3 - px0) / 2;
                py2 = py3;
            } else if (cl.contains("unloaded-father") || cl.contains("unloaded-mother")) {
                // p0 has a position, p1 (parent) does not.
                px0 = Math.round(p0.cx) + p0.genwidth * -0.5;
                py0 = Math.round(p0.cy) + p0.height * 0;
                px3 = px0 - path.targetLength;
                py3 = py0 + path.targetLength / (path.classList.contains("unloaded-father") ? -4 : 4);
                px1 = px0 + (px3 - px0) / 2;
                py1 = py0;
                px2 = px0 + (px3 - px0) / 2;
                py2 = py3;
            } else if (cl.contains("father-unloaded") || cl.contains("mother-unloaded")) {
                // p0 has a position, p1 (child) does not.
                px0 = px1 = Math.round(p0.cx) + p0.genwidth * +0.5;
                py0 = py1 = Math.round(p0.cy) + p0.height * 0;
                px2 = px3 = px0 + path.targetLength * Math.sin(path.targetAngle * Math.PI / 180);
                py2 = py3 = py0 - path.targetLength * Math.cos(path.targetAngle * Math.PI / 180);
            } else if (cl.contains("spouse-unloaded")) {
                px0 = Math.round(p0.cx) + p0.genwidth * -0.5
                py0 = Math.round(p0.cy) + p0.height   * 0;
                px3 = px0 - path.targetLength / 2;
                py3 = py0 + path.targetLength;
                px1 = px2 = px3;
                py1 = py0;
                py2 = py3;
            } else if (cl.contains("noissue")) {
                px0 = Math.round(p0.cx) + p0.genwidth * 0.5
                py0 = Math.round(p0.cy);
                let h = p0.height;
                d = "M " + px0 + " " + py0 + " l 5 0 m 0 " + (h / -2) + " l 0 " + h;
            }
            if (!d) {
                if (px1 == px0 && px2 == px0 && px3 == px0 && py1 == py0 && py2 == py0 && py3 == py0) {
                    d = "";
                } else if (px1 != px0 || py1 != py0 || px2 != px3 || py2 != py3) {
                    d = "M " + px0 + " " + py0 + " C ";
                    if (xd || yd) {
                        // If linking to same generation, add an extra curve at start and end
                        d += (px0 - xd) + " " + py0 + " " + (px0 - xd) + " " + (py0 + yd) + " " + px0 + " " + (py0 + yd) + " ";
                        py1 += yd;
                        py2 -= yd;
                        py3 -= yd;
                    }
                    d += px1 + " " + py1 + " " + px2 + " " + py2 + " " + px3 + " " + py3;
                    if (xd || yd) {
                        d += " " + (px3 + xd) + " " + py3 + " " + (px3 + xd) + " " + (py3 + yd) + " " + px3 + " " + (py3 + yd);
                    }
                } else {
                    d = "M " + px0 + " " + py0 + " L " + px3 + " " + py3;
                }
            }
            path.setAttribute("d", d);
        }
        for (let label=labels.firstElementChild;label;label=label.nextElementSibling) {
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
        if (this.state.people.length) {
            cx = this.state.view.cx0 + (this.state.focus.tx - this.state.view.cx0) * t;
            cy = this.state.view.cy0 + (this.state.focus.ty - this.state.view.cy0) * t;
        }
        x0 -= 50;
        x1 += 50;
        y0 -= 50;
        y1 += 50;
        this.reposition({x0:x0, y0:y0, x1:x1, y1:y1, cx:cx, cy:cy});
        if (t == 1 && this.state.view.callback) {
            setTimeout(() => { this.state.view.callback(); }, 0);
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
    };

    formatDate(date, state) {
        if (!date || date == "9999") {
            return null;
        } else if (date.endsWith("-00-00")) {
            date = date.substring(0, 4);
        } else if (date.endsWith("-00")) {
            date = date.substring(0, date.length - 2) + "27";
            date = new Intl.DateTimeFormat(undefined , { dateStyle: "medium", timeZone: "UTC"}).format(Date.parse(date));
            date = date.replace(/\b27[,]?\s*/, "");
        } else {
            date = new Intl.DateTimeFormat(undefined , { dateStyle: "medium", timeZone: "UTC"}).format(Date.parse(date));
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
     */
    find(id) {
        if (typeof id == "number") {
            id = id.toString();
        } else if (typeof id != "string") {
            throw new Error("bad argument");
        }
        let person = this.state.byid[id]; 
        if (!person) {
            person = new SlippyTreePerson(this, this.state.people.length, id);
            this.state.byid[id] = person;
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
        if (this.browser) {
            this.state.scrollPane.parentNode.classList.add("loading");
        }
        let usedparams = {
            action: "getPeople",
            fields: [ "Name", "FirstName", "MiddleName", "LastNameAtBirth", "LastNameCurrent", "Suffix", "BirthDate", "DeathDate", "Gender", "DataStatus", "IsLiving", "IsMember", "Privacy", "Spouses", "NoChildren", "HasChildren", "Father", "Mother" ],
            "appid": this.#APPID
        };
        for (let key in params) {
            usedparams[key] = params[key];
        }
        let qs = "";
        for (let key in usedparams) {
            qs += (qs.length == 0 ? '?' : '&');
            qs += encodeURIComponent(key) + "=";
            let val = usedparams[key];
            if (Array.isArray(val)) {
                for (let i=0;i<val.length;i++) {
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
            .then(x => x.json())
            .then(data => {
                if (!this.state) {
                    return;
                }
                if (this.browser) {
                    this.state.scrollPane.parentNode.classList.remove("loading");
                }
//                console.log(JSON.stringify(data));
                const len = this.state.people.length;
                if (data[0].people) {
                    let newpeople = [];
                    for (const id in data[0].people) {
                        const r = data[0].people[id];
                        if (parseInt(id) > 0) {
                            const person = this.find(id);
                            person.load(data[0].people[id]);
                            newpeople.push(person);
                        }
                    }
                    for (const person of newpeople) {
                        for (const key of ["Father", "Mother"]) {
                            const id2 = person.data[key];
                            if (id2) {
                                const other = this.find(id2);
                                let certainty = person.data.DataStatus ? person.data.DataStatus[key] : null;
                                switch (certainty) {
                                    case "30": certainty = "dna"; break;
                                    case "20": certainty = "confident"; break;
                                    case "10": certainty = "uncertain"; break;
                                    case "5": certainty = "nonbiological"; break;
                                    default: certainty = null;
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
                                const other = this.find(id2);
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
            });
    }

    /**
     * Convert an {x:n, y:n} with pixel coordinates relative to the SVG element to logical coordinates
     */
    toSVGCoords(point) {
        let x = point.x;
        let y = point.y;
        x = ((x - this.state.view.padx0) / this.state.view.scale) + this.state.view.x0;
        y = ((y - this.state.view.pady0) / this.state.view.scale) + this.state.view.y0;
        return {x:x, y:y};
    }

    /**
     * Convert an {x:n, y:n} with logical coordinates to pixel coordinates relative to the SVG element
     */
    fromSVGCoords(point) {
        let x = point.x;
        let y = point.y;
        x = (x - this.state.view.x0) * this.state.view.scale + this.state.view.padx0;
        y = (y - this.state.view.y0) * this.state.view.scale + this.state.view.pady0;
        return {x:x, y:y};
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
            this.load({keys: keys, fields: ["Father","Mother"], descendants:1}, () => {
                for (const id of keys) {
                    let person = this.state.byid[id];
                    person.childrenLoaded = true;
                }
                this.checkForUnloadedChildren();
                this.redrawEdges(this.state.focus);
                window.requestAnimationFrame(() => { this.draw(); });
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
        this.tree = tree
        this.index = index;  // local index into array
        this.id = id;        // unique number from wikitree
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
        if (data.Name && !this.tree.state.byid[data.Name]) {
            this.tree.state.byid[data.Name] = this;
        }
        if (changed) {
            if (this.svg) {
                this.svg.remove();
                delete this.svg;        // So its rebuilt
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
        let out = "\"";
        out += this.id;
        if (this.data.Name) {
            out += " " + this.data.Name;
        }
        out += " " +this.presentationName()+" "+this.presentationExtra();
        out += "\"";
        return out;
    };

    presentationName() {
        if (!this.data.Name) {
            return "Unloaded";
        }
        let out = "";
        if (this.data.FirstName) {
            out += this.data.FirstName;
        } else {
            out += "Unknown";
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
        let birthDate = this.tree.formatDate(this.data.BirthDate, this.data.DataStatus ? this.data.DataStatus.BirthDate : null);
        let deathDate = this.tree.formatDate(this.data.DeathDate, this.data.DataStatus ? this.data.DataStatus.DeathDate : null);
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
        let add = true, changed = false;
        for (let i=0;i<this.relations.length;i++) {
            const r = this.relations[i];
            if (r.person == person && r.rel == rel) {
                if ((r.date != date || r.type != type) && (type != "inferred" || date < r.date)) {
                    r.date = date;
                    r.type = type;
                    changed = true;
                }
                add = false;
                break;
            }
        }
        if (add) {
            this.relations.push({rel:rel, person:person, date:date, type:type });
            changed = true;
        }
        if (changed) {
            this.relations.sort((a,b) => {
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
    };

    *parents() {
        for (const r of this.relations) {
            if (r.rel == "parent") {
                yield r.person;
            }
        }
    };

    *spouses() {
        for (const r of this.relations) {
            if (r.rel == "spouse") {
                yield r.person;
            }
        }
    };

    *siblings() {        // Does not include self
        for (const r of this.relations) {
            if (r.rel == "sibling") {
                yield r.person;
            }
        }
    };

    /**
     * Return an array of relationships, each of the form
     *  {name:"uncle", ancestral:true, path:[{name:"father",person:n},{name:"brother",person:n}]}
     * where "name" is the english name, "ancestral" is true if there is a common ancestor, and "path" is the steps taken
     *
     * @param options may contain boolean values
     *   -- common: co-parents are classed as spouses
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
            let minAncestralLength = 9999, minNonAncestralLength = 9999;
            q.push({person:this,len:0});
            q.push({person:other,len:0});
            while (s=q.shift()) {
                for (let p of [s.person.father, s.person.mother]) {
                    if (p && !ancestors.includes(p)) {
                        ancestors.push(p);
                        if (!options.maxdistance || s.len < options.maxdistance) {
                            q.push({person:p,len:s.len + 1});
                        }
                    }
                }
            }

            q.push({person: this, ancestral: true, path:[], skip:[this]});
            while (s=q.shift()) {
                for (let r of s.person.relations) {
                    const person = s.person;
                    let rel = r.rel;
                    if (!options.common && rel == "spouse" && r.type == "inferred") {   // Don't classify co-parents as spouses in this algo
                        continue;
                    }
                    if (s.skip.includes(r.person)) {
                        continue;
                    }
                    let ancestral = s.ancestral;
                    let newskip = s.skip.concat([person]);
                    let skiprel;
                    switch (rel) {
                        case "parent":  skiprel = ["child", "parent", "sibling"]; break;
                        case "sibling": skiprel = ["parent", "sibling"]; break;
                        case "child":   skiprel = ["spouse", "child"]; break;
                        case "spouse":  skiprel = ["child"]; ancestral = false; break;
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
                    let newpath = s.path.concat([{rel:rel, person:r.person}]);
                    if (r.person == other) {
                        paths.push({path:newpath, ancestral:ancestral}); // We have found path! Add it.
                        minNonAncestralLength = Math.min(minNonAncestralLength, newpath.length);
                        if (ancestral) {
                            minAncestralLength = Math.min(minAncestralLength, newpath.length);
                        }
                    } else {
                        if (ancestral && !ancestors.includes(r.person)) {
                            ancestral = false;
                        }
                        if ((!options.maxdistance || newpath.length < options.maxdistance) && newpath.length < (ancestral ? minAncestralLength : minNonAncestralLength)) {
                            q.push({person:r.person, ancestral: ancestral, path:newpath, skip:newskip});
                        }
                    }
                }
            }
            for (let i=0;i<paths.length;i++) {
                let p = paths[i];
                // delete any paths which are longer versions of other paths. Sanity check.
                // delete any [non-ancestral] paths which are longer than the shortest path - lets keep the ancestral ones, just in case
                if (!p.ancestral && p.path.length > (p.ancestral ? minAncestralLength : minNonAncestralLength)) {
                    p = null;
                } else {
                    for (let p2 of paths) {
                        if (p != p2 && p2.path.length > p.path.length) {
                            let differs = false;
                            for (let j=0;j<p.path.length;j++) {
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
                    paths.splice(i--, 1);       // delete
                }
            }
            // length-1 paths go to the front, after that sorted by ancestry, then length
            paths.sort((a,b) => {
                if (a.path.length == 1) {
                    return -1;
                } else if (b.path.length == 1) {
                    return 1;
                } else {
                    let d = (a.ancestral?0:1) - (b.ancestral?0:1);
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
        for (let i=0;i<p.length;i++) {
            if (p[i].rel) {
                p[i] = p[i].rel;
            }
            if (typeof p[i] != "string") {
                throw new Error("Invalid argument: item " +i + " is not a string");
            }
        }
        const ggg = function(n) {
            switch (n) {
                case 0: return "";
                case 1: return "great-";
                case 2: return "great-great-";
                default: return n + "×great-";
            }
        }
        // cousins
        for (let i=1;i + 1<p.length;i++) {
            if (["parent","mother","father"].includes(p[i - 1]) && ["sibling","brother","sister","half-brother","half-sister","half-sibling"].includes(p[i]) && ["child","son","daughter"].includes(p[i + 1])) {
                p[i] = "cousin";
                p.splice(--i, 1);
                p.splice(i + 1, 1);
                let n = 1;
                while (i > 0 && i + 1 < p.length && ["parent","mother","father"].includes(p[i - 1]) && ["child","son","daughter"].includes(p[i + 1])) {
                    n++;
                    p.splice(--i, 1);
                    p.splice(i + 1, 1);
                }
                switch (n) {
                    case 1: n = "first"; break;
                    case 2: n = "second"; break;
                    case 3: n = "third"; break;
                    case 4: n = "fourth"; break;
                    case 5: n = "fifth"; break;
                    case 6: n = "sixth"; break;
                    case 7: n = "seventh"; break;
                    case 8: n = "eighth"; break;
                    case 9: n = "ninth"; break;
                    default: n = n + (n < 20 ? "th" : ((n%10)==1?"st":(n%10)==2?"nd":(n%10)==3?"rd":"th"));
                }
                p[i] = n + "-cousin";
                n = 0;
                while (i > 0 && ["parent","mother","father"].includes(p[i - 1])) {
                    p.splice(--i, 1);
                    n++;
                }
                while (i + 1 < p.length && ["child","son","daughter"].includes(p[i + 1])) {
                    p.splice(i + 1, 1);
                    n++;
                }
                if (n > 0) {
                    switch (n) {
                        case 1: n = "once"; break
                        case 2: n = "twice"; break
                        default: n += "×";
                    }
                    p[i] += " " + n + " removed";
                }
            }
        }
        // uncles/aunts
        for (let i=0;i + 1 < p.length;i++) {
            if (["parent","mother","father"].includes(p[i]) && ["sibling","brother","sister","half-brother","half-sister","half-sibling"].includes(p[i + 1])) {
                p.splice(i, 1);
                let n = 0;
                while (i > 0 && ["parent","mother","father"].includes(p[i - 1])) {
                    n++;
                    p.splice(--i, 1);
                }
                p[i] = ["brother","half-brother"].includes(p[i]) ? "uncle" : ["sister","half-sister"].includes(p[i]) ? "aunt" : "uncle/aunt";
                if (n > 0) {
                    p[i] = ggg(n) + p[i];
                }
            }
        }
        // nephew/niece
        for (let i=0;i + 1 < p.length;i++) {
            if (["sibling","brother","sister","half-brother","half-sister","half-sibling"].includes(p[i]) && ["child","son","daughter"].includes(p[i + 1])) {
                let n = 0;
                p.splice(i, 1);
                while (i + 1 < p.length && ["child","son","daughter"].includes(p[i + 1])) {
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
        for (let i=0;i + 1 < p.length;i++) {
            if (["parent","mother","father"].includes(p[i]) && ["parent","mother","father"].includes(p[i + 1])) {
                let n = 0;
                p.splice(i, 1);
                while (i + 1 < p.length && ["parent","mother","father"].includes(p[i + 1])) {
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
        for (let i=0;i + 1 < p.length;i++) {
            if (["child","son","daughter"].includes(p[i]) && ["child","son","daughter"].includes(p[i + 1])) {
                let n = 0;
                p.splice(i, 1);
                while (i + 1 < p.length && ["child","son","daughter"].includes(p[i + 1])) {
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
        for (let i=0;i + 2<p.length;i++) {
            if (["parent","mother","father"].includes(p[0]) && ["spouse","husband","wife"].includes(p[i + 1]) && ["child","son","daughter"].includes(p[i + 2])) {
                p.splice(i, 2);
                p[i] = p[i] == "child" ? "step-sibling" : p[i] == "son" ? "step-brother" : "step-sister";
            }
        }
        // sibling-in-law, case 3: spouse-sibling-spouse
        for (let i=1;i + 1<p.length;i++) {
            if (["spouse","husband","wife"].includes(p[i - 1]) && ["sibling","brother","sister","half-brother","half-sister","half-sibling"].includes(p[i]) && ["spouse","husband","wife"].includes(p[i + 1])) {
                p.splice(--i, 1);
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "sibling-in-law" : p[i] == "husband" ? "brother-in-law" : "sister-in-law";
            }
        }
        // step-parent: parent-spouse
        for (let i=0;i + 1<p.length;i++) {
            if (["parent","mother","father"].includes(p[i]) && ["spouse","husband","wife"].includes(p[i + 1])) {
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "step-parent" : p[i] == "husband" ? "step-father" : "step-mother";
            }
        }
        // step-child: spouse-child
        for (let i=0;i + 1<p.length;i++) {
            if (["spouse","husband","wife"].includes(p[i]) && ["child","son","daughter"].includes(p[i])) {
                p.splice(i, 1);
                p[i] = "step-" + p[i];
            }
        }
        // sibling-in-law: spouse-sibling
        for (let i=1;i<p.length;i++) {
            if (["spouse","husband","wife"].includes(p[i - 1]) && ["sibling","brother","sister","half-brother","half-sister","half-sibling"].includes(p[i])) {
                p.splice(--i, 1);
                p[i] += "-in-law";
            }
        }
        // sibling-in-law: sibling-spouse
        for (let i=0;i + 1<p.length;i++) {
            if (["sibling","brother","sister","half-brother","half-sister","half-sibling"].includes(p[i]) && ["spouse","husband","wife"].includes(p[i + 1])) {
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "sibling-in-law" : p[i] == "husband" ? "brother-in-law" : "sister-in-law";
            }
        }
        // child-in-law: child-spouse
        for (let i=0;i + 1<p.length;i++) {
            if (["child","son","daughter"].includes(p[i]) && ["spouse","husband","wife"].includes(p[i + 1])) {
                p.splice(i, 1);
                p[i] = p[i] == "spouse" ? "child-in-law" : p[i] == "husband" ? "son-in-law" : "daughter-in-law";
            }
        }
        // parent-in-law: spouse-parent
        for (let i=1;i<p.length;i++) {
            if (["spouse","husband","wife"].includes(p[i - 1]) && ["parent","mother","father"].includes(p[i])) {
                p.splice(--i, 1);
                p[i] += "-in-law";
            }
        }
        return p.join("'s ");
    }
    
    /**
     * Execute a popupmenu action for this person
     * @param name the name of the action
     */
    action(name) {
        if (this.debug) console.log("Action " + name + " on " + this);
        const tree = this.tree;
        if (name == "focus") {
            // Refocus the tree on this node
            tree.setFocus(this);

        } else if (name == "nuclear") {
            // Load the "nuclear" family for this node
            tree.load({keys: this.id, nuclear:1}, () => { 
                this.childrenLoaded = true;
                tree.setFocus(this);
            });
        } else if (name == "ancestors") {
            // Load 4 (the max) levels of ancestors for this node
            tree.load({keys: this.id, ancestors:4}, () => { 
                tree.setFocus(this);
            });

        } else if (name == "descendants") {
            // Load 4 (the max) levels of descendants for this node, and their spouses. Multi stage.
            // Load ...
            const depth = 4;
            this.childrenLoaded = false;
            tree.load({keys: this.id, descendants:depth}, () => {
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
            for (const person of tree.state.people) {
                person.pruned = false;
            }
            const q = [];
            q.push(this);
            for (let i=0;i<q.length;i++) {
                const person = q[i];
                if (person.mother && !person.mother.isHidden()) {
                    q.push(person.mother);
                }
                if (person.father && !person.father.isHidden()) {
                    q.push(person.father);
                }
            }
            const func = function(person) {
                if (!person.isHidden()) {
                    for (const child of person.children()) {
                        q.push(child);
                        func(child);
                    }
                }
            };
            func(this);
            for (let i=q.length-1;i>=0;i--) {
                const person = q[i];
                for (const spouse of person.spouses()) {
                    if (!spouse.isHidden()) {
                        q.push(spouse);
                    }
                }
            }
            for (const person of tree.state.people) {
                person.pruned = !q.includes(person);
            }
            tree.setFocus(this);
        }
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
        "AAEfmPYCLYV0AAIumGMAAkiNERgAAkiPXwACSzzLSQACXO6uAAJkzn0AAnQmBggAApAvNwACoLw1AAAAAAAAq2qxAQAAsOiTBgABBhOJAAEfmPYAAYx6rwMAAY8h5AABuPPIVCMAAbmlOwABzsYRAAHa7008AAHgxsEsAAILg2EAAgz9XwACEhTVAAISQV0AAi6YFG4UAAIumxsAAi92PAACOULqAAJIjVUNogACSI9sLAACSJEeZQACSLwEAAJIvWxhIjKgLSM7agACSQLJKKAAAks6_g8EJbUOAAJLt0hBYAACS7m3AAJLu7sAAkwykAACThNGAAJQf-0cAAJRy6kAAlHNjCGEJZkeAAJR0Z5VAAJR8nsAAlZ2qigAAlaDdwACVp0IAAJWnkMAAlagT08AAlaic78AAlbHJQACVtJiAAJW8WcAAlcXzwACVxn5AAJcpB4AAlzQ98wAAl3-mAACXi5KAAJeNi0eAAJizAoAAmLNTAACZFZ9AAJkwmEAAmTGIQACZNOcLAACZOILCgACZTabAAJmGKwAAmaZ9gACb5CYAAJv1fYAAm_XDAACb-GxAAJ0JZgAAny2yAACfYzcAAJ9jgwAAoXOvwAChnNGAAKShzYAApKI4gACkv41XgAAQn5rAgAAT0zyAACNTmtOAA",   // ancestors to one point
        "AABe0TUAorivAACi8roAABJtTgEAAPrv_xIAAQGSJi0AAQvH_XUAAQvJiQABC87aAAEOIagBAAEPADMAARHwXAABF0wxAAEca50AAR81DAABJLEOjnabAAEvz-5MAAEyhJsAATRwdgABNOp-AAFUsbQAAWDLYAABYkEuAAFjYrgLAAFpPG0uAAGPx2MAAZAd41EAAZBGSwABkHNaAAGQdGtAAAGSeRoXAAGU0EAAAZkVaAABmaztAAGa4Gh_AAGa4iAAAZsCw3MAAZ2uBgABncgugDkAAZ3MGQABndU9SQwKOwABnhmyrQABqafsAAGpqv4AAaq0VwABq3AZAAGw-NMAAbD62gABsPzyAAGw_sUAAbHsNQAALXyAAAHOcEYAADBe6QAAMGcdAQEBAgEBAQEBAQEBJAUBAQECAgAAMHGfAQIBAwEYBAECAQERBBkfAwYAAeqTPgAB6qCqES0AAeq64SUAADEu8QIDdwEAADFG5wICAQUAADFLCgwDAQIB_QIBAwEAAfumoQAB-6enAAIfZrMAAjOK7wACNWJuAAI2qukAAkcdIMEAAkiNVQACSQLJAAJJBlJiDwQAAlFMfgACUVb-AAJRecMAAlU-RBMAAlpqLwACX2DRAAJfempmAAJgIzMAAmAkxQACYCeEAAJkVn0AAmRZiSc4CgACZIdQnRUAAmSM0RIPNhYZTwwRBRMAAmSboQACZJ2VLAkhEQACZKLUBww8AAJl40oZAAJl6xcNAAJl8s8knAAAPXD4AAJmiAoAAmaJGJpdAAJmjWUAAmaOfQACZpr9FEYKAAJnMlEAAmdU6gACZ2JRAAJnsgAAAmfDpV1pKwACamNSEwACanfqDQACatRxAAJrSG1vGRlkIQACa0r_UQACa3UkAAJr22sAAnSv_gAAPz4XAAA_QoAwAAA_SlUCAAKLYOIAApcWQgACnE3iAAKcXWwzAAKc8QgAApz-BAACnRgUAAKeQjYEAgcRAAKeQ7UAAp5FuAYEDyUKAABDE0UAAp797wACnv8IFH0tLZh0AAKfBD8AAp8FVscAAp9CjR0AAp9D7jXJIC8MBAVuAAKfRr4AAEMpMwQCAwMCAABDLDMGBAAAQy_9AQMAAEMyWAICAABDNEwGBAEFBwYFBwgHAwcECgIEAAKgcyYAAqC4EgACoLwwBQ4EAABDVCoBAABDVskwAgMFAwAAQ2qCAQICAABGtDAEAQAATxoHAABPZlgcAABSWtULAABW4y8AAFsy9RkDAQEBAgIBAQQBBgIDAxETAABbNJMAAF3yWgAAXnI1BAoMAABemsoAAF6hyAAAXtEMAQEBAQEBAQEBAQEBHQIBAQEBAQEBAQEBAgEBAQEBAQFeAQEBAQAAXveRAAAJ2x8CAAAKjPAAAHk5XgYHCAYAAAAAAACit2MAAM4M6QABAZIbAAEW9YEAAS-7_QABMyjsAAE0cGAAAWDK8QABaTxUAAGHi3oAAZJ1AwABk407AAGUzuIAAZT2CgABlPkMAAGVHWoAAatvVQABx_i3AAHH-wsAAc7GEQAAMGdLAgMBAAAwcZ0ENQEDAgIRAQIBAiEAAeY0hQAAMS9jAgIBAQIEAgEAADFG5QoAADFLFwEDAAHz7WQAAjaV6wACSJKUXBcAAmRZoycRIAACZeM9HQACZesACQACZfK3AAJqYyIAAmt1DwACa9umGgACdQQbAAJ1BiYAAD8-CQAAP0J3DQAAQam7AAKWztUAApxC9QACnE5IAAKcXTIAApynjwACnKvsAAKcuTYAAEMTNwAAQyxGAABPGgoAAE9CxwoAAFJa3QAAVMpmAABd8kMAAF6h0QAACdsgAgEBAAAKjQIA",         // Many Mathesons
        "AAABKvkAp87nAAARwFoAALzs9AAAvPIFAAC-jVIAAMN6bQAAyLCaGA4AAM-bAAAA0CkPAADS1Z8CBAQGAwAA1p2IAADYuJUAANjINwAA2az9BgAA4yLwCANfAQ0IAADjwMgAAOsy6gAA68CXAwMBAADrznsCBgAA7b8PAAEQoBoAARChoAABEOTRAAETE3cAARqUgQABG-GvAAEb5D4AAR6IqoiKDmMQGGYAAB8XrWt3AAAfGu0AAB8ctQABO16RAAE7ZoUgAAFEJf8LKA4WAAFEWOcICAUFDAUMAw9SCFMQMVIkCNUFAAFEXYVL_gkHBA4AAURjaxZKRhEKDAkuExQAAURl7g0sHQABRHxODAZLJAZjAwQGAgYKBgMHCQABRIBEIRsAAUtIlgABTE_3AAFjtxwAAWO4yqIAAWyzRQABfaxHAAF9rZgHAAF9r80AAZA9zAABkD-7AAGrDMQAAasPugwMCQAABGUIAAG58lkAAbn5xQABvlFLAAHcGpUAAeb92wAB5wAJvxl5JiskAAICVHkAAgZbtAACCWhTAAIUwuUAAjLWQAACNIKvAAI6Ty5-HAACTJXzAAJOqfkMDQYKAxsAAk6ugAACTq_VUB8MCQgGBQACTrdNGQ8QDVIGBgYFVAkKBwdPFB8NDwmXCQQQBQQGAgoHMgQFCTVQCgACUCSSHgoHCwACUCXWDAsFCwUIkQpnCQ4FXQlOBAYJBQ0IB1AHBgwBbAoGBwYHEzEGEHgJAAJdsPAAAl4MwLEAAm0RTwACdfeVAAKSWf8AApc3JgACnlVlAAKe_nQODBA5GRYfCxsLHgACn1P4GgcAAp-ZqhAAAp_a7QULBxALFw4ZDDYPEBAKAAKgOkUDAgkAAqGglQEFZgACoaLlDifjCQIBAgIDAAKhzU0SIT8REQACoes4AgYCBgMCUQAAWknzAgcHAwYFBQcDAAABKvMFAQcJAAABLaQDAQQBAQEBAQIBAQEBAQEBAQEDAgMBAQEBAwEBAQEDAQEBAQMBAQEBAQEBAQEBAwEEAgMHAwUBBAMBAQEEAQQBCA0BAQEBAQEAAA1XNQAAjJi4AACRV18AAJZWOQAAAAAAAJyJLAAAzlk1AADQJ_IAANApDgIAANjQrQAA5XUpAAD_e3kAAQmhEwABEY3eAAES7WIAAR53NQABHohiAAEeie14GhoAADHDDQACFL_AAAA2KjEAAjLWiAACTJUOAAKfmcEAAGTrsgAAcPohAAABKwgAAAEtqwcOKCgHBgAADVddAACRlJEA",       // Four gens of Brigham Young
    ];
    let tree = new SlippyTree();
    tree.init(null, "Hansdatter-907", null);
    tree.restoreState(testvectors[0]);
}
