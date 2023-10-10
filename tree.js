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
 *  2. register view in ViewRegistry
 *
 *     a) link script file in header section of index.html, e.g.:
 *
 *        <script src="views/new_view/NewView.js"></script>
 *
 *     b) create new entry ("new-view-id": <NewViewObject>) in first parameter of ViewRegistry constructor (in index.js), e.g.:
 *
 *        "new-view-id": new NewViewObject(),
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

    // index.html starts with a script that creates a new ViewRegistry, and then immediately calls .render() to update the selection form.
    constructor(views, session_manager) {
        this.views = views;
        this.session = session_manager;
        this.currentView = undefined;

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
            this.session.loadUrlHash(Object.keys(views), location.hash);
        }

        addEventListener("hashchange", (e) => this.onHashChange(e));
    }

    onHashChange(e) {
        // We only want to update our session and view information if the new hash looks like it is supposed to.
        // Otherwise, it's just a regular in-page hash link "#here" that we should let operate normally.

        let h = e.target.location.hash;
        if (h.match(/^#name=.+(&view=.+)?/) || h.match(/^#view=.+(&name=.+)?/)) {
            this.session.loadUrlHash(Object.keys(this.views), e.target.location.hash);

            document.querySelector(this.WT_ID_TEXT).value = this.session.personName;
            document.querySelector(this.VIEW_SELECT).value = this.session.viewID;
            document.querySelector(this.SHOW_BTN).click();
        }
    }

    // Build the <select> option list from the individual views in the registry.
    // Add an event listener to the "go" button to call onSubmit() when clicked.
    // Fill in some data from the logged-in user.
    render() {
        let views = this.views;
        const options =
            Object.keys(this.views)
                .sort(function (a, b) {
                    // Sort the app options alphabetically by title
                    return views[a].title.localeCompare(views[b].title);
                })
                .map((id) => `<option value="${id}">${this.views[id].title}</option>`)
                .join("") + `<option value="otherapps">Other Apps</option>`;

        const submitBtn = document.querySelector(this.SHOW_BTN);
        submitBtn.addEventListener("click", (e) => this.onSubmit(e));

        const viewSelect = document.querySelector(this.VIEW_SELECT);
        viewSelect.innerHTML = options;
        viewSelect.value = this.session.viewID || (Object.keys(this.views).length ? Object.keys(this.views)[0] : "");

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
    onSubmit(e) {
        e.preventDefault();

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

        const view = this.views[viewID];
        view.id = viewID;

        const viewLoader = document.querySelector(this.VIEW_LOADER);

        // This shouldn't happen, but perhaps we should display an error so new View builders can see what happened.
        if (view === undefined) return;

        viewLoader.classList.remove("hidden");

        const basicFields = ["Id", "Name", "FirstName", "LastName", "Derived.BirthName", "Derived.BirthNamePrivate"];

        try {
            WikiTreeAPI.postToAPI({
                appId: "ViewRegistry",
                action: "getPerson",
                key: wtID,
                fields: basicFields.join(),
            }).then((data) => this.onPersonDataReceived(view, data));
        } finally {
            viewLoader.classList.add("hidden");
        }
    }

    // After the initial getPerson from the onSubmit() launch returns, this method is called.
    onPersonDataReceived(view, data) {
        const wtID = this.getCurrentWtId();
        const infoPanel = document.querySelector(this.INFO_PANEL);

        // If we have a person, go forward with launching the view, sending it the div ID to use for the display and the ID of the starting profile.
        // If we have no person, we show an error div.
        if (data[0]["person"]) {
            this.initView(view, data[0]["person"]);

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
                view.init(this.VIEW_CONTAINER, data[0]["person"]["Id"]);
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
                if (status == "Illegal WikiTree ID") {
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

    initView(view, person) {
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
        wtStatus.classList.add("hidden");
        wtStatus.classList.remove("red");
        wtStatus.classList.remove("green");
    }
    showError(msg) {
        const wtStatus = document.querySelector(this.WT_STATUS);
        this.clearStatus();
        wtStatus.innerHTML = msg;
        wtStatus.classList.add("red");
        wtStatus.classList.remove("hidden");
    }
    showWarning(msg) {
        const wtStatus = document.querySelector(this.WT_STATUS);
        this.clearStatus();
        wtStatus.innerHTML = msg;
        wtStatus.classList.remove("hidden");
    }
    showNotice(msg) {
        const wtStatus = document.querySelector(this.WT_STATUS);
        this.clearStatus();
        wtStatus.innerHTML = msg;
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
        this.personName = fields.get("name") || this.personName;

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
};

function condLog(...args) {
    if (typeof debugLoggingOn !== "undefined" && debugLoggingOn) {
        console.log.apply(null, args);
    }
}
