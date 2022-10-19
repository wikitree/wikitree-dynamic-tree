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
                document.querySelector("#wt-api-login").innerHTML = `Logged into API: ${user.name}`;
            },
            onUnlogged: () => {
                document.querySelector("#wt-api-login").innerHTML = `
          <form action="https://api.wikitree.com/api.php" method="POST">
              <input type="hidden" name="action" value="clientLogin">
              <input type="hidden" id="returnURL" name="returnURL" value="${window.location.href}">
              <input type="submit" class="small" value="Login at WikiTree API" 
                title="Please login to the WikiTree API to use the Tree Viewer on non-public profiles.">
          </form>
          `;
            },
        })
    );

    // To add a new View, add a unique keyword with a value of the new View().
    wtViewRegistry = new ViewRegistry(
        {
            "wt-dynamic-tree": new WikiTreeDynamicTreeViewer(),
            "timeline": new TimelineView(),
            "fanchart": new FanChartView(),
            "fractal": new FractalView(),
            "ahnentafel": new AhnentafelView(),
            "surnames": new SurnamesView(),
            "webs": new WebsView(),
            "calendar": new calendarView(),
        },
        new SessionManager(WikiTreeAPI, loginManager)
    );
    wtViewRegistry.render();
});
