/*
 * tree.js
 *
 * This file contains following functionalities
 *
 * Login manager
 *  - handles login process and cookies saving and loading to preserve logged in usr on the local machine
 *  - keeps info about logged in user with
 *
 * WTUser object
 * - properties: id:int, name: str
 * - methods: isLoggedIn() -> bool
 *
 * Session Manager
 *  - handles app status (lastly logged user Name and ID, lastly used view ID) and preserves it using cookies
 *  - takes control over Login manager and calls login method during app start
 *
 * View
 *  - contains basic methods and at the same time serves as a template for class based views
 *
 * View Registry
 *  - serves as main object that orchestrates everything
 *  - usage is demonstrated in index.html
 *
 * ---------------------------------------------------------------------------------------------------------------------
 *
 * How to add create new view and register it:
 *
 *  1. [class based] Create ancestor of View class and override method
 *    - meta: use you own title, description and docs
 *    - init: use your own implementation of view
 *
 *  or
 *
 *  1. [prototype based] Create similar structure as in class based approach and add
 *     following code into the constructor:
 *
 *     Object.assign(this, this?.meta()); // this will spread object into object fields for easier access
 *
 *     alternativelly, you can create those fields directly in constructor, e.g.: this.title = "Template view"
 *
 *  2. register view in the app list in index.js (do NOT add <script> tags to index.html):
 *
 *        "new-view-id": {
 *            title: "New View",                       // shown in the TREE APP selector
 *            className: "NewViewObject",              // the global (window.NewViewObject) your script defines
 *            needs: ["d3"],                           // shared libraries from appLibraries in index.js, if any
 *            scripts: ["views/new_view/NewView.js"],  // classic scripts, run in this order
 *            modules: [],                             // ES module entry points (their imports load automatically)
 *            styles: ["views/new_view/NewView.css"],
 *        },
 *
 *     The app's files are only loaded when a user selects it and clicks GO, so the view must not rely on
 *     globals defined by another app's files. Put shared code in a library in appLibraries instead.
 *
 *  3. Enjoy your newly registered view ;-)
 *
 */

// BioCheck initialization - just once
import("./lib/biocheck-api/src/BioCheckTemplateManager.js").then((bio) => {
    window.bioCheckTemplateManager = new bio.BioCheckTemplateManager();
    window.bioCheckTemplateManager.load();
});

window.View = class View {
    constructor() {
        this.id = null;
        Object.assign(this, this?.meta()); // this will spread object into object fields for easier access
    }

    meta() {
        return {
            title: "Template view",
            description: "Showcase of the views and their registration.",
            docs: "https://example.com",
        };
    }

    // If the view fails to initialize, return an error. The ViewRegistry will then display
    // that error and hide the "info panel" that's supposed to get filled in with view information.
    init(container_selector, person_id) {
        document.querySelector(container_selector).innerHTML = `Template View for person with ID: ${person_id}`;
    }

    close() {}
};

/*
 * The AppLoader adds an app's stylesheets and scripts to the page when the app is first used, and resolves once
 * they have all loaded. Each file is only ever added once, even when several apps (or libraries) list it.
 */
window.AppLoader = class AppLoader {
    constructor(libraries = {}) {
        this.libraries = libraries;
        this.files = new Map(); // absolute URL -> Promise that resolves when the file has loaded
    }

    // Load everything an app (or library) needs: its libraries first, then its stylesheets and classic scripts
    // (which run in the order listed), and finally its ES modules.
    loadApp(app) {
        const files = { styles: [], scripts: [], modules: [] };
        this.collect(app, files, new Set());
        // views/fanChart/SettingsOptions.js stores the open settings panel in the global "self", which is normally the
        // window itself. Some libraries (e.g. FullCalendar and jsPDF) attach themselves to "self" when they load, so
        // put the window back while files load, and restore the settings panel afterwards.
        const savedSelf = window.self;
        if (savedSelf !== window) window.self = window;
        const restoreSelf = () => {
            if (savedSelf !== window && window.self === window) window.self = savedSelf;
        };

        const styles = files.styles.map((href) => this.loadFile("style", href));
        const scripts = files.scripts.map((src) => this.loadFile("script", src));
        return Promise.all([...styles, ...scripts])
            .then(() => Promise.all(files.modules.map((src) => this.loadFile("module", src))))
            .finally(restoreSelf);
    }

    collect(item, files, seen) {
        for (const name of item.needs || []) {
            const library = this.libraries[name];
            if (!library) throw new Error(`Unknown library "${name}"`);
            if (seen.has(name)) continue;
            seen.add(name);
            this.collect(library, files, seen);
        }
        for (const kind of ["styles", "scripts", "modules"]) {
            for (const file of item[kind] || []) {
                if (!files[kind].includes(file)) files[kind].push(file);
            }
        }
    }

    // file is a URL, or { url, integrity } for a file that must match a Subresource Integrity hash.
    loadFile(type, file) {
        const url = typeof file === "string" ? file : file.url;
        const absUrl = new URL(url, document.baseURI).href;
        if (!this.files.has(absUrl)) {
            const promise = this.alreadyInPage(type, absUrl)
                ? Promise.resolve()
                : this.addToPage(type, url, absUrl, file.integrity);
            this.files.set(absUrl, promise);
        }
        return this.files.get(absUrl);
    }

    // A file may still be included statically in the page (e.g. where the Tree Apps are embedded elsewhere).
    // Static scripts and stylesheets have finished loading by the time anyone clicks GO.
    alreadyInPage(type, absUrl) {
        const selector = type === "style" ? "link[rel=stylesheet][href]" : "script[src]";
        return [...document.querySelectorAll(selector)].some(
            (el) => !el.dataset.appLoader && (type === "style" ? el.href : el.src) === absUrl
        );
    }

    addToPage(type, url, absUrl, integrity) {
        return new Promise((resolve, reject) => {
            let el;
            if (type === "style") {
                el = document.createElement("link");
                el.rel = "stylesheet";
                el.href = url;
            } else {
                el = document.createElement("script");
                if (type === "module") el.type = "module";
                // Scripts added by code run as soon as they arrive unless async is false. With async false
                // they still download in parallel, but run in the order they were added.
                el.async = false;
                el.src = url;
            }
            if (integrity) {
                el.integrity = integrity;
                el.crossOrigin = "anonymous";
            }
            el.dataset.appLoader = "true";
            el.addEventListener("load", () => resolve());
            el.addEventListener("error", () => {
                // Forget the failed file so that a later attempt tries again.
                el.remove();
                this.files.delete(absUrl);
                reject(new Error(`Could not load ${url}`));
            });
            document.head.appendChild(el);
        });
    }
};

window.ViewError = class ViewError extends Error {
    constructor(message) {
        super(message); // Call parent Error class for construction
        this.name = "ViewError"; // Change name to our own, instead of "Error"
    }
};

/*
 * The ViewRegistry holds the configuration for our collection of different views, builds the <select> field to change between them,
 * and launches the selected view when the "Go" button is clicked.
 */
window.ViewRegistry = class ViewRegistry {
    // These are all divs in index.html holding the various content sections.
    VIEW_SELECT = "#view-select";
    WT_ID_TEXT = "#wt-id-text";
    SHOW_BTN = "#show-btn";
    VIEW_CONTAINER = "#view-container";
    VIEW_TITLE = "#view-title";
    VIEW_DESCRIPTION = " #view-description";
    NAME_PLACEHOLDER = "#name-placeholder";
    WT_ID_LINK = " #wt-id-link";
    VIEW_LOADER = "#view-loader";
    WT_STATUS = "#wt-status";
    INFO_PANEL = "#info-panel";

    // index.js creates a new ViewRegistry, and then immediately calls .render() to update the selection form.
    // apps describes each app and the files it needs (see index.js). An app's files are only loaded, and its view
    // only created, when it is first used.
    constructor(apps, libraries, session_manager) {
        this.apps = {};
        for (const id in apps) {
            if (!apps[id].disabled) this.apps[id] = apps[id];
        }
        this.loader = new AppLoader(libraries);
        this.views = {}; // id -> Promise of the view object, once the app has been requested
        this.session = session_manager;
        this.currentView = undefined;
        this.submitCount = 0;

        // This auto-launches the previously selected view (if there was one) when the page reloads.
        const orig_onLoggedIn_cb = this.session.lm.events?.onLoggedIn;
        this.session.lm.events["onLoggedIn"] = (user) => {
            if (!this.session.getHashParams(location.hash).get("name")) {
                document.querySelector(this.WT_ID_TEXT).value = user.name;
            }

            orig_onLoggedIn_cb(user);
            document.querySelector(this.SHOW_BTN).click();
        };

        if (location.hash) {
            this.session.loadUrlHash(Object.keys(this.apps), location.hash);
        }

        addEventListener("hashchange", (e) => this.onHashChange(e));
    }

    onHashChange(e) {
        // We only want to update our session and view information if the new hash looks like it is supposed to.
        // Otherwise, it's just a regular in-page hash link "#here" that we should let operate normally.

        let h = e.target.location.hash;
        if (h.match(/^#name=.+(&view=.+)?/) || h.match(/^#view=.+(&name=.+)?/)) {
            this.session.loadUrlHash(Object.keys(this.apps), e.target.location.hash);

            document.querySelector(this.WT_ID_TEXT).value = this.session.personName;
            document.querySelector(this.VIEW_SELECT).value = this.session.viewID;
            document.querySelector(this.SHOW_BTN).click();
        }
    }

    // Build the <select> option list from the individual views in the registry.
    // Add an event listener to the "go" button to call onSubmit() when clicked.
    // Fill in some data from the logged-in user.
    render() {
        let apps = this.apps;
        const options =
            Object.keys(this.apps)
                .sort(function (a, b) {
                    // Sort the app options alphabetically by title
                    return apps[a].title.localeCompare(apps[b].title);
                })
                .map((id) => `<option value="${id}">${this.apps[id].title}</option>`)
                .join("") + `<option value="otherapps">Other Apps</option>`;

        const submitBtn = document.querySelector(this.SHOW_BTN);
        submitBtn.addEventListener("click", (e) => this.onSubmit(e));

        const viewSelect = document.querySelector(this.VIEW_SELECT);
        viewSelect.innerHTML = options;
        viewSelect.value = this.session.viewID || (Object.keys(this.apps).length ? Object.keys(this.apps)[0] : "");

        // Start loading an app's files as soon as it is selected, so it is (nearly) ready when GO is clicked.
        viewSelect.addEventListener("change", () => {
            if (this.apps[viewSelect.value]) this.getView(viewSelect.value).catch(() => {});
        });

        document.querySelector(this.WT_ID_TEXT).value = this.session.personName;

        // If we have both a starting Profile ID and a selected View ID, draw the desired view.
        // If not, alert the user that they need to do something to begin.
        if (document.querySelector(this.WT_ID_TEXT).value && viewSelect.value) {
            submitBtn.click();
        } else {
            this.showWarning('Enter a WikiTree ID and select a View, then click "Go" to begin.');
        }
    }

    // When the "Go" button is clicked, grab the provided WikiTree ID and the selected View.
    // Currently we call getPerson() at the API to see that the provided ID is valid, and then launch the view.
    // Possibly this should be changed/removed. Different views require different incoming data, and some are just using the ID
    // and then immediately recalling getPerson() on that ID, which is a waste.
    // Load the app's files (the first time it is used) and create its view object. Returns a Promise of the view.
    getView(viewID) {
        if (!this.views[viewID]) {
            const app = this.apps[viewID];
            this.views[viewID] = this.loader
                .loadApp(app)
                .then(() => {
                    const ViewClass = window[app.className];
                    if (typeof ViewClass !== "function") {
                        throw new Error(`${app.className} was not defined by the app's files.`);
                    }
                    const view = new ViewClass(...(app.args || []));
                    view.id = viewID;
                    return view;
                })
                .catch((err) => {
                    delete this.views[viewID]; // so that a later attempt tries again
                    throw err;
                });
        }
        return this.views[viewID];
    }

    async onSubmit(e) {
        e.preventDefault();
        const submitNumber = ++this.submitCount;

        const wtID = this.getCurrentWtId();
        const viewID = document.querySelector(this.VIEW_SELECT).value;

        // Special case of "other apps" where we send the user out of the dynamic tree apps page to a page at WikiTree.
        if (viewID == "otherapps") {
            if (wtID) {
                window.open(`https://www.wikitree.com/treewidget/${wtID}/77`);
            } else {
                $(this.WT_ID_TEXT).focus();
            }
            return;
        }

        const viewLoader = document.querySelector(this.VIEW_LOADER);

        // This shouldn't happen, but perhaps we should display an error so new View builders can see what happened.
        if (this.apps[viewID] === undefined) return;

        let view;
        viewLoader.classList.remove("hidden");
        try {
            view = await this.getView(viewID);
        } catch (err) {
            viewLoader.classList.add("hidden");
            if (submitNumber === this.submitCount) {
                this.showError(`Could not load the ${this.apps[viewID].title} app. ${err.message} Please try again.`);
            }
            return;
        }
        // If GO was clicked again (perhaps for another app) while this app was loading, let that click win.
        if (submitNumber !== this.submitCount) return;

        // Extract all parameters from the URL hash
        const urlParams = new URLSearchParams(window.location.hash.slice(1));
        let allParams = {};
        urlParams.forEach((value, key) => {
            allParams[key] = value; // e.g., { ancestors: '10', siblings: '1' }
        });
        let filteredParams = {};
        const acceptedParams = view.meta().params || [];

        acceptedParams.forEach((param) => {
            if (allParams.hasOwnProperty(param)) {
                filteredParams[param] = allParams[param];
            }
        });

        viewLoader.classList.remove("hidden");

        const basicFields = ["Id", "Name", "FirstName", "LastName", "Derived.BirthName", "Derived.BirthNamePrivate"];

        try {
            WikiTreeAPI.postToAPI({
                appId: "ViewRegistry",
                action: "getPerson",
                key: wtID,
                fields: basicFields.join(),
            }).then((data) => this.onPersonDataReceived(view, data, filteredParams));
        } finally {
            viewLoader.classList.add("hidden");
        }
    }

    // After the initial getPerson from the onSubmit() launch returns, this method is called.
    onPersonDataReceived(view, data, filteredParams) {
        const wtID = this.getCurrentWtId();
        const infoPanel = document.querySelector(this.INFO_PANEL);

        // If we have a person, go forward with launching the view, sending it the div ID to use for the display and the ID of the starting profile.
        // If we have no person, we show an error div.
        if (data[0]["person"]) {
            this.initView(view, data[0]["person"], filteredParams);

            this.session.personID = data[0]["person"]["Id"];
            this.session.personName = data[0]["person"]["Name"];
            this.session.viewID = view.id;
            this.session.saveCookies();

            this.clearStatus();
            if (this.currentView && this.currentView.id != view.id && this.currentView.close) {
                if (typeof this.currentView.close === "function") {
                    try {
                        this.currentView.close();
                    } catch (err) {
                        this.showError(
                            `An error occurred when closing the previous view (${this.currentView.id}). You can ignore this, or please report it in G2G): ${err.message}`
                        );
                        this.hideInfoPanel();
                    }
                }
            }

            try {
                this.currentView = view;
                view.init(this.VIEW_CONTAINER, data[0]["person"]["Id"], filteredParams);
            } catch (err) {
                // If we have an unhandleable error from a view, display the error message and hide away
                // the "info panel", since it's probably incomplete/broken.
                this.showError(err.message);
                this.hideInfoPanel();
            }
        } else {
            infoPanel.classList.add("hidden");
            if (wtID) {
                const status = data[0]["status"];
                if (["Illegal WikiTree ID", "Invalid user"].includes(status)) {
                    this.showError(`Person not found for WikiTree ID ${wtID}.`);
                } else {
                    const help = status.toLowerCase().includes("limit exceeded")
                        ? "Wait a minute and retry, otherwise wait an hour and retry."
                        : " Refreshing the page might help.";
                    this.showError(`An unexpected error occurred: ${status}.${help}`);
                }
            } else {
                this.showError("Please enter a WikiTree ID.");
            }
        }
    }

    initView(view, person, filteredParams = {}) {
        // const wtLink = document.querySelector(this.WT_ID_LINK);
        // const viewTitle = document.querySelector(this.VIEW_TITLE);
        // const viewDescription = document.querySelector(this.VIEW_DESCRIPTION);
        // const name = document.querySelector(this.NAME_PLACEHOLDER);

        // wtLink.href = `https://www.WikiTree.com/wiki/${person.Name}`;
        // wtLink.innerHTML = person.Name;

        // viewTitle.innerHTML = view.title;
        // viewDescription.innerHTML = view.description;
        // name.innerHTML = person.BirthName ? person.BirthName : person.BirthNamePrivate;

        // Let the individual views do this if desired. Start things off hidden (in case the previous view revealed it).
        //wtViewRegistry.showInfoPanel();
        wtViewRegistry.hideInfoPanel();
        wtViewRegistry.setInfoPanel("");

        document.querySelector(this.VIEW_CONTAINER).innerHTML = "";

        const wtID = this.getCurrentWtId();
        const viewSelect = document.querySelector(this.VIEW_SELECT).value;
        let url = window.location.href.split("?")[0].split("#")[0];
        url = `${url}#name=${wtID}&view=${viewSelect}`;

        Object.keys(filteredParams).forEach((key) => {
            url += `&${key}=${filteredParams[key]}`;
        });

        history.replaceState("", "", url);
    }

    getCurrentWtId() {
        return document.querySelector(this.WT_ID_TEXT).value.trim();
    }

    hideInfoPanel() {
        let infoPanel = document.querySelector(this.INFO_PANEL);
        infoPanel.classList.add("hidden");
    }
    showInfoPanel() {
        let infoPanel = document.querySelector(this.INFO_PANEL);
        infoPanel.classList.remove("hidden");
    }
    setInfoPanel(html) {
        let infoPanel = document.querySelector(this.INFO_PANEL);
        infoPanel.innerHTML = html;
    }

    clearStatus() {
        const wtStatus = document.querySelector(this.WT_STATUS);
        wtStatus.textContent = "";
        wtStatus.classList.add("hidden");
        wtStatus.classList.remove("red");
        wtStatus.classList.remove("green");
    }
    showError(msg) {
        const wtStatus = document.querySelector(this.WT_STATUS);
        this.clearStatus();
        wtStatus.textContent = msg;
        wtStatus.classList.add("red");
        wtStatus.classList.remove("hidden");
    }
    showWarning(msg) {
        const wtStatus = document.querySelector(this.WT_STATUS);
        this.clearStatus();
        wtStatus.textContent = msg;
        wtStatus.classList.remove("hidden");
    }
    showNotice(msg) {
        const wtStatus = document.querySelector(this.WT_STATUS);
        this.clearStatus();
        wtStatus.textContent = msg;
        wtStatus.classList.add("green");
        wtStatus.classList.remove("hidden");
    }
};

// This just stores the WikiTree ID (i.e. "name") and ID of the viewing user, if they are logged into the API.
window.WTUser = class WTUser {
    constructor(name = null, id = null) {
        this.name = name;
        this.id = id;
    }

    isLoggedIn() {
        return this.name && this.id;
    }
};

// This mediates the login to the WikiTree API.
// See: https://github.com/wikitree/wikitree-api/blob/main/authentication.md
window.LoginManager = class LoginManager {
    C_WT_USERNAME = "WikiTreeAPI_userName";
    C_WT_USER_ID = "WikiTreeAPI_userId";

    constructor(wtAPI, events = {}) {
        this.wtAPI = wtAPI;
        this.events = events;

        this.user = new WTUser();

        this.loadCookies();
    }

    loadCookies() {
        this.user.name = this.wtAPI.cookie(this.C_WT_USERNAME) || null;
        this.user.id = this.wtAPI.cookie(this.C_WT_USER_ID) || null;
    }

    saveCookies() {
        this.wtAPI.cookie(this.C_WT_USERNAME, this.user.name, { path: "/" });
        this.wtAPI.cookie(this.C_WT_USER_ID, this.user.id, { path: "/" });
    }

    login() {
        const searchParams = new URLSearchParams(location.search);
        const authcode = searchParams.get("authcode") ? searchParams.get("authcode") : null;

        if (this.user.isLoggedIn()) {
            this.events?.onLoggedIn(this.user);
        } else if (authcode) {
            // user is not logged in yet, but we've received authcode
            this.wtAPI.postToAPI({ action: "clientLogin", authcode: authcode }).then((data) => this.onAuth(data));
        } else {
            this.events?.onUnlogged();
        }
    }

    logout() {
        this.wtAPI.cookie(this.C_WT_USERNAME, "", { path: "/", expires: new Date("Thu, 01 Jan 1970 00:00:01 GMT") });
        this.wtAPI.cookie(this.C_WT_USER_ID, "", { path: "/", expires: new Date("Thu, 01 Jan 1970 00:00:01 GMT") });
        this.wtAPI.postToAPI({ appId: "LoginManager", action: "clientLogin", doLogout: 1 }).then((data) => {
            window.location.reload();
        });
    }

    onAuth(data) {
        if (data.clientLogin.result === "Success") {
            this.user.name = data.clientLogin.username;
            this.user.id = data.clientLogin.userid;

            this.saveCookies();
            this.login();
        } else {
            this.events?.onAuthFail(data);
        }
    }
};
window.SessionManager = class SessionManager {
    C_PERSON_ID = "viewTreePersonId";
    C_PERSON_NAME = "viewTreePersonName";
    C_VIEW_ID = "viewTreeId";

    constructor(wtAPI, loginManager, events) {
        this.wtAPI = wtAPI;
        this.lm = loginManager;
        this.events = events || {};

        this.viewID = null;
        this.personID = null;
        this.personName = null;

        this.loadCookies();

        const orig_onLoggedIn_cb = this.lm.events?.onLoggedIn;
        this.lm.events["onLoggedIn"] = (user) => {
            this.personID ||= user.id;
            this.personName ||= user.name;

            orig_onLoggedIn_cb(user);
        };

        this.lm.login();
    }

    getHashParams(hash) {
        return new URLSearchParams(hash.slice(1));
    }

    loadUrlHash(viewIDs, urlHash) {
        const fields = this.getHashParams(urlHash);
        const nameFromHash = fields.get("name");
        if (nameFromHash != null && this.isValidWikiTreeIdFormat(nameFromHash)) {
            this.personName = nameFromHash.trim();
        }

        const viewID = fields.get("view");

        if (viewID && viewIDs.includes(viewID)) {
            this.viewID = fields.get("view");
        }
    }

    loadCookies() {
        this.viewID = this.wtAPI.cookie(this.C_VIEW_ID) || null;
        this.personID = this.wtAPI.cookie(this.C_PERSON_ID) || null;
        this.personName = this.wtAPI.cookie(this.C_PERSON_NAME) || null;
    }

    // For the version of the tree hosted on WikiTree.com itself, we want to be able to set the starting parameters by setting the cookies we use to store them.
    // Since the tree can be hosted at other paths (e.g. /treewidget/...), we need to store the cookies at the root "/" path so they are shared.
    saveCookies() {
        this.wtAPI.cookie(this.C_VIEW_ID, this.viewID, { path: "/" });
        this.wtAPI.cookie(this.C_PERSON_ID, this.personID, { path: "/" });
        this.wtAPI.cookie(this.C_PERSON_NAME, this.personName, { path: "/" });
    }

    isValidWikiTreeIdFormat(value) {
        if (typeof value !== "string") return false;
        let s = value.trim();
        try {
            s = decodeURIComponent(s.replace(/\+/g, "_"));
        } catch {
            return false;
        }
        s = s.trim();
        if (!s) return false;
        // Name segment ends with -digits; allow any-script letters, marks, digits inside the name (e.g. 松下-1, Распутин-1, Le Brun-881).
        return /^[\p{L}\p{M}][\p{L}\p{M}\p{N}'.\s_-]*-\d+$/u.test(s);
    }
};

function condLog(...args) {
    if (typeof debugLoggingOn !== "undefined" && debugLoggingOn) {
        console.log.apply(null, args);
    }
}
