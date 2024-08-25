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
 * The "refocus" method takes a person and rebuilds the tree from that position (most of
 * this work being done in placeNodes()), before calling draw() on the next animation
 * frame. This needs to be fast - it changes the node positions only and calls
 * "reposition()", which resizes the SVG and positions the scrollPane. This also needs
 * to be fast, as its called when scale or scroll takes place.
 *
 * The final operation in refocus() is checkForUnloadedChildren(), which checks all loaded
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
class SlippyTree extends View {

    static loadCount = 0;
    #VIEWPARAM = "slippyTreeState";  // Param to store details of current view in window location
    #VERSION = 0; // URLs may last over time, plan for extension
    #APIURL = "https://api.wikitree.com/api.php";
    #APPID = "SlippyTree";
    #SVG = "http://www.w3.org/2000/svg";
    #MINSCALE = 0.2;
    #MAXSCALE = 3;

    /**
     * Props is an (optional) map with the following keys
     *  - trackpad: if true, the mousewheel is identified a trackpad, if false it's a mouse. Optional, will auto-detect by default
     *  - profileTarget: the target for any links to profiles, eg "_blank". Optional
     *  - dragScrollReversed: set to true to inverse the way drag-scrolling works. Optional.
     *  - bundleSpouses: how many depths of spouses to bundle together in the tree - 1 includes spouses of the person, 2 includes their
     *          spouses (so long as they have no other home in the tree), and so on. 0 disables bundling. Default is 2
     */
    init(container_selector, person_id, props) {
        this.state = {};
        this.state.props = props || {};
        this.debug = typeof this.state.props.debug == "boolean" ? this.state.props.debug : window.deubgLoggingOn;
        this.state.container = typeof container_selector == "string" ? document.querySelector(container_selector) : container_selector;
        const content = `

<div class="slippy-tree-container">
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

 <a class="helpButton"></a>
 <div class="loader"></div>
 <div class="helpContainer">
  <div>
   <div class="helpCloseButton">&#x2715;</div>
   <h1>The Slippy Tree</h1>
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
   <p>
    A multi-root tree showing several parent and child relationships at once.<br/>
    Spouses are displayed together, refocus to change the order.
   </p>
  </div>
 </div>
</div>

`;

        this.state.container.style = "";   // Reset it, as some other tree types set style properties on it
        this.state.container.innerHTML = content.trim();
        this.state.scrollPane = this.state.container.querySelector(".slippy-tree-scrollpane");
        this.state.svg = this.state.container.querySelector(".slippy-tree-scrollpane > svg");
        this.state.personMenu = this.state.container.querySelector(".personMenu");
        const helpButton = this.state.container.querySelector(".helpButton");
        const helpContainer = this.state.container.querySelector(".helpContainer");
        const helpBox = helpContainer.querySelector(":scope > :first-child");
        helpButton.addEventListener("click", (e) => {
            helpContainer.classList.toggle("hidden");
        });
        helpBox.addEventListener("click", (e) => {
            helpContainer.classList.toggle("hidden");
        });

        this.state.people = [];
        this.state.byid = {};
        this.state.view = {scale: 1, cx:0, cy: 0};
        this.state.focus = null;
        this.state.refocusStart = null;
        this.state.refocusEnd = null;
        let trackpadReset = null;
        let trackpad = null; // this.state.props.trackpad;
        for (let elt of this.state.personMenu.querySelectorAll("[data-action]")) {
            if (elt.getAttribute("data-action") != "profile") {
                elt.addEventListener("click", () => {
                    this.state.personMenu.classList.add("hidden");
                    this.state.personMenu.person.action(elt.getAttribute("data-action"));
                });
            }
        }
        if (this.state.scrollPane) {
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

                if (pointers.length == 1) {
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
                // If a trackpad, mousewheel will run in two directions and ctrl-wheel
                // is used to pinch-zoom. If a normal mousewheel, wheel is used to zoom
                // and only goes in one direction.
                // Some device have both! So, for one second assume the same device, then reset.
                e.preventDefault();
                let view = {scale: this.state.view.scale, cx:this.state.view.cx, cy:this.state.view.cy};
                if (typeof trackpad != "boolean" && e.deltaX != 0) {
                    trackpad = true;
                }
                if (trackpad) {
                    if (e.ctrlKey) {
                        view.scale -= e.deltaY * 0.01;
                    } else {
                        view.cx += e.deltaX / view.scale * (this.state.props.dragScrollReversed ? -1 : 1);
                        view.cy += e.deltaY / view.scale * (this.state.props.dragScrollReversed ? -1 : 1);
                    }
                } else {
                    view.scale -= e.deltaY * 0.01;
                }
                this.reposition(view);
                clearTimeout(trackpadReset);
                trackpadReset = setTimeout(() => {
                    trackpad = trackpadReset = null;
                }, 1000);
            });
            const self = this;
            this.state.keyListener = (e) => {
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
                                document.querySelectorAll(".keyboardfocus").forEach((e) => {
                                    e.classList.remove("keyboardfocus");
                                });
                                view.cx = best.cx;
                                view.cy = best.cy;
                                view.keyboardFocus = best;
                                view.keyboardFocus.svg.classList.add("keyboardfocus");
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
            };
            document.body.addEventListener("keydown", this.state.keyListener);
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
        }
        // We maintain our state in the URL hash, alongside some other properties
        // that apply to all views. We need to then ignore this if the view is reloaded
        // with a different ID, but because of the slightly bodgy way this is done in
        // tree.js it's non-trivial to do this properly. Easy way is to honour the state
        // only the first time a SlippyTree is instantiated.
        let state = SlippyTree.loadCount ? null : window.wtViewRegistry?.session?.fields;
        if (state && state[this.#VIEWPARAM]) {
            helpContainer.classList.add("hidden");
            if (!this.restoreState(state[this.#VIEWPARAM])) {
                state = null;
            }
        }
        if (state == null) {
            if (person_id) {
                helpContainer.classList.add("hidden");
                this.reset(person_id);
            } else {
                helpContainer.classList.remove("hidden");
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
        };
    }

    close() {
        // Remember this object persists even when other views are selected.
        // Clear out all state - it's all under "this.state" now - and disconnect resize observer
        this.state.resizeObserver.disconnect();
        document.body.removeEventListener("keydown", this.state.keyListener);
        if (this.#VIEWPARAM) {
            let v = new URLSearchParams(window.location.hash.substring(1));
            v.delete(this.#VIEWPARAM);
            window.history.replaceState(null, null, "#" + v);
        }
        delete this.state;
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
                this.refocus(this.find(focusid));
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
        const container = this.state.svg.querySelector(".container");
        for (let n=container.firstChild;n;n=n.nextSibling) {
            while (n.firstChild) {
                n.firstChild.remove();
            }
        }
        if (id) {
            this.load({keys:id, nuclear:1}, () => {
                const person = this.state.byid[id];
                person.childrenLoaded = true;
                this.refocus(person);
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
            this.refocus(person);
        }
    }

    /**
     * Refocus the tree
     * @param focus the person to focus the tree on. Required
     * @param callback an optional method to call when focus completes
     */
    refocus(focus, callback) {
        if (this.debug) console.log("Focus " + focus);
        if (this.state.view.keyboardFocus) {
            delete this.state.view.keyboardFocus;
            document.querySelectorAll(".keyboardfocus").forEach((e) => {
                e.classList.remove("keyboardfocus");
            });
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
        const style = this.state.svg ? getComputedStyle(this.state.svg) : null;
        const MINWIDTH = style ? this.#evalLength(style, style.getPropertyValue("--min-person-width")) : 50;
        const SPOUSEMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--spouse-margin")) : 10;
        const SPOUSEINDENT = style ? this.#evalLength(style, style.getPropertyValue("--spouse-indent")) : 10;
        const SIBLINGMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--sibling-margin")) : 20;
        const OTHERMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--other-margin")) : 40;
        const GENERATIONMARGIN = style ? this.#evalLength(style, style.getPropertyValue("--generation-margin")) : 100;
        const PASSES = 1000;
        const DEBUG = typeof window == "undefined";     // This is never run in a browser, it's for testing locally in nodejs. So always false.
        const bundleSpouses = typeof this.state.props.bundleSpouses == "number" ? this.state.props.bundleSpouses : 2;

        const genpeople = [];
        const genwidth = [];
        const forces = [];       // includes func(d) where d is vertical distance from primary to secondary (may be -ve), and ret is +ve to bring closer together
        const q = []; // tmp working aray

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
            person.clump = {
                people: [person],
                shift: 0,
                shiftCount: 0,
                toString: function() {
                    return "(" + this.state.people.length + " from \"" + this.state.people[0].presentationName() + "\" to \"" + this.state.people[this.people.length - 1].presentationName() + "\" shift="+(this.state.shift/this.state.shiftCount)+" from " + this.state.shiftCount + " gap=["+this.state.prevMargin+" "+this.state.nextMargin+"])";
                }
            };
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
                    forces.push({name: "child", a: par, b: person, iterations:1, func: (d) => Math.abs(d) < 1 ? Math.abs(d) : Math.log(Math.abs(d) - 1) * 4 });
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
        let maxy = 0;
        const func = function(owner, person) {
            if (person.hidden) {
                return null;
            }
            const generation = person.generation;
            let mylast = person;
            if (!genpeople[generation].includes(person)) {
                let prev = genpeople[generation].length == 0 ? null : genpeople[generation][genpeople[generation].length - 1];
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
                                person.clump.people.push(spouse);
                                spouse.clump = person.clump;
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
                if (prev) { // Y value depends on previous element
                    let rel = person.relationshipName(prev);
                    if (rel == "spouse" || rel == "spouse-spouse") {
                        y = SPOUSEMARGIN;
                        rel = "spouse";
                    } else if (rel == "sibling" || rel == "step-sibling" || rel == "sibling-in-law") {
                        y = SIBLINGMARGIN;
                        rel = "sibling";
                    } else {
                        y = OTHERMARGIN;
                        rel = null;
                    }
                    y += (prev.height + person.height) / 2;
                    person.clump.prev = prev.clump;
                    prev.clump.next = person.clump;
                    person.clump.prevMargin = prev.clump.nextMargin = y;
                    person.clump.prevRel = prev.clump.nextRel = rel;
                    y += prev.ty;
                }
                if (firstchild) { // Y value also derived from mid-point of children
                    let midy = (firstchild.ty + lastchild.ty - spouseheight) / 2;
                    if (isNaN(y)) {
                        // This is first item in column, position based on children
                        y = midy;
                    } else if (midy > y) {
                        // Midpoint of children is lower than our minimum position.
                        // Move our position down to their midpoint.
                        y = midy;
                    }
                }
                if (isNaN(y)) { // No previous element, no children
                    y = person.height / 2;
                }
                person.ty = y;
                if (isNaN(person.ty)) { console.log(person); throw new Error("NAN"); }
                // Node is positioned, now position spouses relative to this node.
                prev = person;
                for (const spouse of person.clump.people) {
                    if (spouse != person) {
                        const distance = (prev.height + spouse.height) / 2 + SPOUSEMARGIN;
                        y += distance;
                        spouse.ty = y;
                    }
                }
                if (y > maxy) {
                    maxy = y;
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
        /*
         * - no, previous alg can put a node at -5
        if (DEBUG) console.log("MAXY="+maxy);
        for (const person of ordered) {
            if (!person.hidden && isNaN(person.ty)) { console.log(person); throw new Error("NAN"); }
            if (person.ty < -0.01 || person.ty > maxy + 0.01) {
                console.log(person);
                throw new Error();
            }
        }
        */

        // STEP 5
        // Layout is valid but we can improve it by doing a force layout between parents
        // and children to pull things to the center.
        //
        // That's the theory. In practice this algorithm is absolute hell. After many iterations
        // the algorithm is:
        //  * calculate the forces on each "clump" as the average of the pull between nodes.
        //  * for each column, see if moving a clump would collide with another clump? If it
        //    would, merge those clumps and repeat.
        //
        for (let pass=0;pass<PASSES;pass++) {
            let maxdy = 0;
            if (DEBUG) console.log("pass " + pass);
            for (const f of forces) {
                const oa = f.a.ty + (f.a.clump.shiftCount == 0 ? 0 : f.a.clump.shift / f.a.clump.shiftCount);
                const ob = f.b.ty + (f.b.clump.shiftCount == 0 ? 0 : f.b.clump.shift / f.b.clump.shiftCount);
                const distance = oa - ob;  // +ve if a is lower
                const sign = Math.sign(distance);
                let force = f.func(distance); // +ve if closer together
                if (DEBUG) console.log("  f="+f.name+" a="+f.a+"@"+oa+" b="+f.b+"@"+ob+" d="+distance+" f="+force+"*"+sign);
                f.a.clump.shift -= force * sign;
                f.a.clump.shiftCount++;
                f.b.clump.shift += force * sign;
                f.b.clump.shiftCount++;
            }
            for (let a of genpeople) {
                const MAXREPEAT = 1000; // just in case
                for (let repeat=0;repeat < MAXREPEAT;repeat++) {
                    let repeatNeeded = false;
                    let numclumps = 0;
                    for (let clump = a[0].clump;clump;clump=clump.next) {
                        clump.index = numclumps++;
                    }
                    if (DEBUG) console.log("  column " + genpeople.indexOf(a) + " has " + numclumps + " clumps");
                    for (let clump = a[0].clump;clump;clump=clump.next) {
                        const prev = clump.prev;
                        const next = clump.next;
                        let dy = clump.shift / clump.shiftCount;
                        if (dy < 0) {
                            const y = clump.people[0].ty;
                            const gap = clump.prevMargin;
                            if (prev) {
                                let prevy = prev.people[prev.people.length - 1].ty;
                                let prevdy = prev.shift / prev.shiftCount;
                                let overlap = (prevy + prevdy + gap) - (y + dy) 
                                if (overlap > 0) {  // Shift up collides
                                    dy = prevy - y + gap;
                                    if (DEBUG) console.log("      clump #" + clump.index + clump + ",top="+y+" overlaps prev " + prev + ",bot="+(prevy+prevdy)+"+"+gap+"  by " + overlap + ", moving by " + dy + " and merging up");
                                    for (const person of clump.people) {
                                        person.ty += dy;
                                        person.clump = prev;
                                    }
                                    prev.people = prev.people.concat(clump.people);
                                    prev.shift += clump.shift;
                                    prev.shiftCount += clump.shiftCount;
                                    prev.next = next;
                                    if (next) {
                                        next.prev = prev;
                                    }
                                    repeatNeeded = true;
                                } else {
                                    if (DEBUG) console.log("      clump #" + clump.index + clump + ",top="+y+" has no overlap");
                                }
                            } else if (y + dy < 0) {
                                let v = clump.shift * (y - 0) / -dy;
                                if (DEBUG) console.log("      clump #" + clump.index + clump + ",top="+y+" hits min=0, reducing shift to " + (v / clump.shiftCount));
                                clump.shift = v;
                            }
                        } else if (dy > 0) {
                            const y = clump.people[clump.people.length - 1].ty;
                            const gap = clump.nextMargin;
                            let dy = clump.shift / clump.shiftCount;
                            if (next) {
                                let nexty = next.people[0].ty;
                                let nextdy = next.shift / next.shiftCount;
                                let overlap = (y + dy) - (nexty + nextdy - gap);
                                if (overlap > 0) {  // Shift down collides
                                    dy = nexty - y - gap;
                                    if (DEBUG) console.log("      clump #" + clump.index + clump + ",bot="+y+" overlaps next " + next + ",top="+(nexty+nextdy)+"-"+gap+"  by " + overlap + ", moving by " + dy + " and merging down");
                                    for (const person of clump.people) {
                                        person.ty += dy;
                                        person.clump = next;
                                    }
                                    next.people = clump.people.concat(next.people);
                                    next.shift += clump.shift;
                                    next.shiftCount += clump.shiftCount;
                                    next.prev = prev;
                                    if (prev) {
                                        prev.next = next;
                                    }
                                    repeatNeeded = true;
                                } else {
                                    if (DEBUG) console.log("      clump #" + clump.index + clump + ",bot="+y+" has no overlap: y="+y+"+"+dy+" next.y="+nexty+"+"+nextdy+" gap="+gap+" ol="+overlap);
                                }
                            } else if (y + dy > maxy) {
                                let v = clump.shift * (maxy - y) / dy;
                                if (DEBUG) console.log("      clump #" + clump.index + clump + ",bot="+y+" hits max="+maxy+", reducing shift to " + (v / clump.shiftCount));
                                clump.shift = v;
                                repeatNeeded = true;
                            }
                        } else {
                            if (DEBUG) console.log("      clump #" + clump.index + clump + " has no shift");
                        }
                    }
                    if (!repeatNeeded) {
                        break;
                    }
                }
                let i = 0;
                for (let clump = a[0].clump;clump;clump=clump.next) {
                    clump.index = i++;
                    if (clump.shiftCount) {
                        let dy = clump.shift / clump.shiftCount;
                        maxdy = Math.max(Math.abs(dy), maxdy);
                        if (DEBUG) console.log("    clump #" + clump.index + clump + " moving by " + dy);
                        for (const person of clump.people) {
                            person.ty += dy;
                        }
                    }
                    clump.shift = clump.shiftCount = 0;
                }
            }
            if (maxdy < 1) {
                pass = PASSES;
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
                        if (person == focus || r.person == focus) {
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
        this.state.scrollPane.parentNode.classList.add("loading");
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
                this.state.scrollPane.parentNode.classList.remove("loading");
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
     * Return one of "parent", "child", "spouse", "child-inlaw", "spouse-inlaw", "parent-in-law", "step-child", "step-parent", "spouse-spouse" (ie spouse's other spouse), "sibling-in-law", "uncle/aunt', "nephew/niece"
     */
    relationshipName(other) {
        let out = null;
        if (other) {
            for (let r of this.relations) {
                if (r.person == other) {
                    out = r.rel;
                }
                if (out) break;
            }
            if (!out) {
                for (let r of this.relations) {
                    for (let r2 of r.person.relations) {
                        if (r2.person == other) {
                            if (r.rel == "spouse") {  // relative of my spouse
                                out = r2.rel == "child" ? "step-child" : r2.rel == "parent" ? "parent-in-law" : r2.rel == "sibling" ? "sibling-in-law" : "spouse-spouse";
                            } else if (r.rel == "parent") {  // relative of my parent
                                out = r2.rel == "child" ? "sibling" : r2.rel == "parent" ? "grand-parent" : r2.rel == "sibling" ? "uncle/aunt" : "parent-in-law";
                            } else if (r.rel == "child") {  // relative of my child
                                out = r2.rel == "child" ? "grand-child" : r2.rel == "parent" ? "spouse" : r2.rel == "sibling" ? "step-child" : "child-in-law";
                            } else if (r.rel == "sibling") {  // relative of my sibling
                                out = r2.rel == "child" ? "nephew/niece" : r2.rel == "parent" ? "step-parent" : r2.rel == "sibling" ? "sibling" : "sibling-in-law";
                                // child's parent is technically "co-parent" but we've already presumed spouse when record was created
                            }
                        }
                        if (out) break;
                    }
                    if (out) break;
                }
            }
        }
        return out;
    }
    
    /**
     * For any people in the tree that haven't been checked to see if they have
     * unloaded children, check. If "Children" field ever arrives as a queryable
     * key this can go away
     */
    /**
     * Execute a popupmenu action for this person
     * @param name the name of the action
     */
    action(name) {
        if (this.debug) console.log("Action " + name + " on " + this);
        const tree = this.tree;
        if (name == "focus") {
            // Refocus the tree on this node
            tree.refocus(this);

        } else if (name == "nuclear") {
            // Load the "nuclear" family for this node
            tree.load({keys: this.id, nuclear:1}, () => { 
                this.childrenLoaded = true;
                tree.refocus(this);
            });
        } else if (name == "ancestors") {
            // Load 4 (the max) levels of ancestors for this node
            tree.load({keys: this.id, ancestors:4}, () => { 
                tree.refocus(this);
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
                tree.refocus(this, () => {
                    // ... then load their unloaded spouses ...
                    // This completely destroys performance, and TBH
                    // we don't need it. We only need to indicate that
                    // there are spouses to load.
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
                        tree.refocus(this);
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
            tree.refocus(this);
        }
    }
}

window.SlippyTree = SlippyTree; // for wikitree-dynamic-tree
