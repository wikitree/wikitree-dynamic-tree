/*
 * index.js
 *
 * This code runs in index.html. It sets up the Login Manager and View Registry for the Tree.
 * There's not much code here, and it was included directly in index.html. However for integration into the
 * WikiTree.com website, it was separated out.
 *
 * New Views are added here, in the View Registry below.
 *
 */

var wtViewRegistry;
window.addEventListener("DOMContentLoaded", (event) => {
    const loginManager = new LoginManager(
        WikiTreeAPI,
        (events = {
            onLoggedIn: (user) => {
                document.querySelector(
                    "#wt-api-login"
                ).innerHTML = `Logged into Apps: ${user.name} (<a class="apiLogout" href="#">Logout</a>)`;
            },
            onUnlogged: () => {
                document.querySelector("#wt-api-login").innerHTML = `
          <form id="appsLoginForm" action="https://api.wikitree.com/api.php" method="POST">
              <input type="hidden" name="action" value="clientLogin">
              <input type="hidden" id="returnURL" name="returnURL" value="${window.location.href}">
              <input type="submit" class="small" value="Apps Login"
                title="Please login to the WikiTree Apps to use the Tree Viewer on non-public profiles.">
          </form>
          `;

                if (typeof requireAppsLogin != "undefined" && requireAppsLogin) {
                    $("#appsLoginForm").submit();
                }
            },
        })
    );
    $("body").on("click", ".apiLogout", function (e) {
        e.preventDefault();
        loginManager.logout();
    });

    // To add a new View, add a unique keyword with a value of the new View().
    // The default view is the first one (but this is only used if the user has
    // not used the page before, since the last view used is saved in a cookie
    // and used the next time the user goes to this page).
    const views = {
        "couples": new CouplesTreeView(),
        "wt-dynamic-tree": new WikiTreeDynamicTreeViewer(),
        "timeline": new TimelineView(),
        "fanchart": new FanChartView(),
        "fandoku": new FandokuView(),
        "fractal": new FractalView(),
        "ahnentafel": new AhnentafelView(),
        "surnames": new SurnamesView(),
        "webs": new WebsView(),
        "familygroup": new FamilyView(),
        "printer-friendly": new PrinterFriendlyView(WikiTreeAPI, 5),
        "calendar": new calendarView(),
        "nameTest": new NameTestView(),
        "cc7": new CC7View(),
    };

    for (let key in views) {
        let meta = views[key]?.meta();
        if (meta?.disabled) {
            delete views[key];
        }
    }

    wtViewRegistry = new ViewRegistry(views, new SessionManager(WikiTreeAPI, loginManager));
    wtViewRegistry.render();
});
