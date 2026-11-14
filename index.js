/*
 * index.js
 *
 * This code runs in index.html. It sets up the Login Manager and View Registry for the Tree.
 * There's not much code here, and it was included directly in index.html. However for integration into the
 * WikiTree.com website, it was separated out.
 *
 * New Views are added here, in the app list below (and nowhere else).
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

    // Shared libraries. An app lists the ones it uses in its "needs", and they are loaded (once) before the app's
    // own files. A library can itself need other libraries.
    const appLibraries = {
        d3: {
            scripts: [
                "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.4/d3.min.js",
                "https://d3js.org/d3-selection-multi.v1.min.js",
            ],
        },
        d3Sankey: { needs: ["d3"], scripts: ["https://unpkg.com/d3-sankey@0.12.3/dist/d3-sankey.min.js"] },
        jsPDF: {
            scripts: [
                {
                    url: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.min.js",
                    integrity: "sha384-l7aOEgTYxgJ0nn2MziQWZCvuvJ2PtNcP05R4QwEoHW+kIS1gFpzupcQ7WhAdRKuq",
                },
            ],
        },
        xlsx: { scripts: ["https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"] },
        fileSaver: { scripts: ["views/shared/FileSaver.min.js"] },
        dateFormat: { scripts: ["views/shared/date.format.js"] },
        select2: {
            scripts: ["https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.7/js/select2.min.js"],
            styles: ["https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.7/css/select2.min.css"],
        },
        // A fixed version, so that a new release can't change the Family Timeline without anyone noticing.
        visTimeline: {
            scripts: ["https://unpkg.com/vis-timeline@8.5.6/standalone/umd/vis-timeline-graph2d.min.js"],
            styles: ["https://unpkg.com/vis-timeline@8.5.6/styles/vis-timeline-graph2d.min.css"],
        },
        fullCalendar: {
            scripts: [
                "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.29.1/moment.min.js",
                "https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.10.2/fullcalendar.min.js",
            ],
            styles: ["https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.10.2/fullcalendar.min.css"],
        },
        html2canvas: { scripts: ["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.3.2/html2canvas.min.js"] },
        // floatingScroll comes with gratitude from https://github.com/Amphiluke/floating-scroll/
        floatingScroll: {
            modules: ["views/shared/jquery.floatingscroll.es6.min.js"],
            styles: ["views/shared/jquery.floatingscroll.css"],
        },
        // Sortable comes from https://github.hubspot.com/sortable, with thanks to Adam Schwartz
        sortable: {
            scripts: ["views/shared/sortable.min.js"],
            styles: ["views/shared/sortable-theme-slick.css"],
        },
        jsCookie: { scripts: ["https://cdnjs.cloudflare.com/ajax/libs/js-cookie/3.0.1/js.cookie.min.js"] },
        dataTables: { scripts: ["https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js"] },
        // The person popup, settings panel and Ahnentafel helpers shared by the Fan Chart family of apps and CC7.
        fanChartCommon: {
            needs: ["d3"],
            scripts: [
                "views/fanChart/SVGfunctions.js",
                "views/fanChart/personPopup.js",
                "views/fanChart/AhnenTafel.js",
                "views/fanChart/PeopleCollection.js",
                "views/fanChart/SettingsOptions.js",
            ],
        },
    };

    // To add a new app, add a unique keyword with a description of the app and the files it needs (see the
    // comment at the top of tree.js). Do not add <script> tags for it to index.html: an app's files are only
    // loaded when someone uses it.
    // The default app is the first one (but this is only used if the user has not used the page before, since
    // the last app used is saved in a cookie and used the next time the user goes to this page).
    // Note: the keyword is used as part of the URL to get to the app.
    const apps = {
        "fanchart": {
            title: "Fan Chart",
            className: "FanChartView",
            needs: ["fanChartCommon", "jsPDF"],
            modules: ["views/fanChart/FanChartView.js"],
        },
        "couples": {
            title: "Couples Dynamic Tree",
            className: "CouplesTreeView",
            needs: ["d3", "floatingScroll"],
            modules: [
                "views/couplesTree/cached_person.js",
                "views/couplesTree/cache_loader.js",
                "views/couplesTree/people_cache.js",
                "views/couplesTree/couples_tree.js",
            ],
            styles: ["views/couplesTree/couples_tree.css"],
        },
        "cctree": {
            title: "Compact Couple Ancestors",
            className: "CCTView",
            needs: ["d3", "floatingScroll"],
            modules: ["views/compactCouplesTree/cct_view.js"],
            styles: ["views/compactCouplesTree/cct.css"],
        },
        "ccdtree": {
            title: "Compact Couple Descendants",
            className: "CCDView",
            needs: ["d3", "floatingScroll"],
            modules: ["views/compactDescendantsTree/ccd_view.js"],
            styles: ["views/compactDescendantsTree/ccd.css"],
        },
        "wt-dynamic-tree": {
            title: "Dynamic Tree",
            className: "WikiTreeDynamicTreeViewer",
            needs: ["d3"],
            scripts: ["views/baseDynamicTree/WikiTreeDynamicTreeViewer.js"],
        },
        "timeline": {
            title: "Family Timeline",
            className: "TimelineView",
            needs: ["visTimeline"],
            scripts: ["views/timeline/TimelineView.js"],
        },
        "fandoku": {
            title: "FanDoku game",
            className: "FandokuView",
            needs: ["fanChartCommon"],
            modules: ["views/fandoku/FandokuView.js"],
        },
        "fractal": {
            title: "Fractal Tree",
            className: "FractalView",
            needs: ["fanChartCommon", "jsPDF"],
            modules: ["views/fractalTree/FractalView.js"],
        },
        "ahnentafel": {
            title: "Ahnentafel Ancestor List",
            className: "AhnentafelView",
            needs: ["xlsx", "fileSaver"],
            scripts: ["views/ahnentafel/ahnentafel.js"],
            styles: ["views/ahnentafel/ahnentafel.css"],
        },
        "genealogyReport": {
            title: "Genealogy Report",
            className: "GenealogyReportView",
            modules: ["views/genealogyReport/genealogyReport.js"],
            styles: ["views/genealogyReport/genealogyReport.css"],
        },
        "surnames": {
            title: "Surnames List",
            className: "SurnamesView",
            scripts: ["views/surnames/surnames.js"],
            styles: ["views/surnames/surnames.css"],
        },
        "namecloud": {
            title: "Name Cloud",
            className: "NameCloudView",
            modules: ["views/nameCloud/name_cloud_view.js"],
            styles: ["views/nameCloud/name_cloud.css"],
        },
        "webs": {
            title: "Ancestor Webs",
            className: "WebsView",
            needs: ["fanChartCommon"],
            modules: ["views/webs/WebsView.js"],
        },
        "ccwebs": {
            title: "Connection Checkers Web",
            className: "CCWebsView",
            scripts: ["views/ccwebs/CCWebsView.js"],
        },
        "familygroup": {
            title: "Family Group View",
            className: "FamilyView",
            scripts: ["views/familyView/familyView.js"],
            styles: ["views/familyView/familyView.css"],
        },
        "printer-friendly": {
            title: "Printer Friendly",
            className: "PrinterFriendlyView",
            args: [WikiTreeAPI, 6],
            scripts: ["views/printerFriendly/PrinterFriendlyView.js"],
            styles: ["views/printerFriendly/printerFriendly.css"],
        },
        "calendar": {
            title: "Family Calendar",
            className: "CalendarView",
            needs: ["fullCalendar", "html2canvas"],
            scripts: ["views/familyCalendar/familyCalendar.js"],
            styles: ["views/familyCalendar/calendar.css"],
        },
        "portraits": {
            title: "Family Portraits",
            className: "PortraitView",
            scripts: ["views/familyPortraits/portraits.js"],
            styles: ["views/familyPortraits/portraits.css"],
        },
        "nameTest": {
            title: "Test name construction",
            className: "NameTestView",
            disabled: true,
            scripts: ["views/nameTest/name_test.js"],
        },
        "cc7": {
            title: "CC7 Views",
            className: "CC7View",
            needs: ["fanChartCommon", "jsPDF", "xlsx", "fileSaver", "select2", "floatingScroll", "dateFormat"],
            // These modules import each other in a circle, so they are listed (and run) in the order that works.
            modules: [
                "views/cc7/js/Settings.js",
                "views/cc7/js/HierarchyView.js",
                "views/cc7/js/LanceView.js",
                "views/cc7/js/PeopleTable.js",
                "views/cc7/js/cc7.js",
                "views/cc7/cc7View.js",
            ],
            styles: ["views/cc7/css/cc7.css"],
        },
        "ale": {
            title: "Ancestor Lines Explorer",
            className: "ALEView",
            needs: ["d3", "floatingScroll", "fileSaver"],
            modules: [
                "views/ancestorLines/api.js",
                "views/ancestorLines/person.js",
                "views/ancestorLines/ancestor_tree.js",
                "views/ancestorLines/display.js",
                "views/ancestorLines/ancestor_lines_explorer.js",
                "views/ancestorLines/ale_view.js",
            ],
            styles: ["views/ancestorLines/ale.css"],
        },
        "descendants": {
            title: "Descendants",
            className: "DescendantsView",
            needs: ["xlsx", "fileSaver"],
            scripts: ["views/descendants/descendants.js"],
            styles: ["views/descendants/descendants.css"],
        },
        "xtree": {
            title: "X Family Tree",
            className: "XTreeView",
            needs: ["fanChartCommon"],
            scripts: ["views/xTree/XTreeView.js"],
        },
        "familyGroupApp": {
            title: "Family Group App",
            className: "FamilyGroupAppView",
            needs: ["dateFormat"],
            modules: ["views/familyGroupApp/familyGroupApp.js"],
            styles: ["views/familyGroupApp/familyGroupApp.css"],
        },
        "superbig": {
            title: "Super Tree",
            className: "SuperBigFamView",
            needs: ["fanChartCommon", "jsPDF"],
            modules: ["views/superBigFamTree/SuperBigFamView.js"],
        },
        "slippyTree": {
            title: "Slippy Tree",
            className: "SlippyTree",
            modules: ["views/slippyTree/script.js"],
            styles: ["views/slippyTree/style.css"],
        },
        "stats": {
            title: "Statistics",
            className: "StatsView",
            needs: ["sortable"],
            modules: ["views/stats/stats.js"],
            styles: ["views/stats/stats.css"],
        },
        "wtPlusMaps": {
            title: "WT+ Maps",
            className: "WtPlusMaps",
            modules: ["views/wtPlusMaps/wtPlusMaps.js"],
        },
        "oneNameTrees": {
            title: "One Name Trees",
            className: "OneNameTrees",
            needs: ["d3", "d3Sankey", "jsCookie", "dataTables", "xlsx"],
            modules: [
                "views/oneNameTrees/location_data.js",
                "views/oneNameTrees/locationstatistics.js",
                "views/oneNameTrees/familytreestatistics.js",
                "views/oneNameTrees/oneNameTrees.js",
                "views/oneNameTrees/d3dataformatter.js",
            ],
            styles: ["views/oneNameTrees/oneNameTrees.css"],
        },
        "ancestorsCemeteries": {
            title: "Ancestors Cemeteries",
            className: "AncestorsCemeteriesView",
            needs: ["dataTables"],
            modules: ["views/ancestorsCemeteries/ancestorsCemeteries.js"],
        },
        "heritage": {
            title: "Heritage Charts",
            className: "HeritageView",
            needs: ["d3"],
            modules: ["views/heritage/heritage.js"],
            styles: ["views/heritage/heritage.css"],
        },
        "timelineTree": {
            title: "Timeline Tree",
            className: "TimelineTreeView",
            modules: ["views/timelineTree/timelineTree.js"],
            styles: ["views/timelineTree/timelineTree.css"],
        },
        "research": {
            title: "Research",
            className: "ResearchView",
            scripts: ["views/research/sites.js", "views/research/research.js"],
            styles: ["views/research/research.css"],
        },
        "lineageMatrix": {
            title: "Lineage Matrix",
            className: "LineageMatrixView",
            scripts: ["views/lineageMatrix/LineageMatrixView.js"],
            styles: ["views/lineageMatrix/lineageMatrix.css"],
        },
    };

    wtViewRegistry = new ViewRegistry(apps, appLibraries, new SessionManager(WikiTreeAPI, loginManager));
    wtViewRegistry.render();
});

