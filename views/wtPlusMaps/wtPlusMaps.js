/*
 * wtPlus Maps
 *
 */

window.WtPlusMaps = class WtPlusMaps extends View {
    static APP_ID = "wtPlusMaps";
    meta() {
        return {
            // short title - will be in select control
            title: "WT+ Maps",
            // some longer description or usage
            description: "Displays the map of ancestors as they moved arround the world.",
            // link pointing at some webpage with documentation
            docs: "https://www.wikitree.com/wiki/Help:WikiTree_Plus#Map_navigator_on_WikiTree.2B",
        };
    }

    aPerson_id; 
    
    setMap(mapType) {
        document.getElementById("map").src = `https://plus.wikitree.com/findmap.htm?aid=${this.aPerson_id}&grouptype=${mapType}`;
    }

    init(container_selector, person_id) {
        this.aPerson_id = person_id;
        document.querySelector(container_selector).innerHTML = `<center>
        <button id="ancestors" class="small button" onClick="wtViewRegistry.currentView.setMap('A');" title="Shows a map of ancestors.">Ancestors</button>
        <button id="descendants" class="small button" onClick="wtViewRegistry.currentView.setMap('D');" title="Shows a map of descendants.">Descendants</button>
        <button id="nuclear" class="small button" onClick="wtViewRegistry.currentView.setMap('N');" title="Shows a map of the nuclear family.">Nuclear family</button>
        <button id="managed" class="small button" onClick="wtViewRegistry.currentView.setMap('M');" title="Shows a map of all managed profiles.">Managed profiles</button></center>
        <iframe id="map" src="https://plus.wikitree.com/findmap.htm?aid=${person_id}&grouptype=A" width="100%" height="850px"></iframe>`;
    }
};

