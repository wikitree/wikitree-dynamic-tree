import { PeopleCache } from "../couplesTree/people_cache.js";
import { CacheLoader } from "../couplesTree/cache_loader.js";
import { CachedPerson } from "../couplesTree/cached_person.js";
import { CCTE } from "./cct_explorer.js";

window.CCTView = class CCTView extends View {
    static #DESCRIPTION = "";
    constructor() {
        super();
        CachedPerson.init(new PeopleCache(new CacheLoader()));
    }

    meta() {
        return {
            title: "Compact Couple Ancestors",
            description: CCTView.#DESCRIPTION,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        // If we need to clear the cache whenever the focus of the tree changes, uncomment the next line
        // this.#peopleCache.clear();
        wtViewRegistry.setInfoPanel(CCTView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const ccte = new CCTE(container_selector).loadAndDraw(person_id);
    }

    close() {
        $("#svgContainer").off();
    }
};
