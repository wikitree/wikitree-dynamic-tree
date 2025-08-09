import { PeopleCache } from "../couplesTree/people_cache.js";
import { CacheLoader } from "../couplesTree/cache_loader.js";
import { CachedPerson } from "../couplesTree/cached_person.js";
import { CCDE } from "./ccd_explorer.js";

window.CCDView = class CCDView extends View {
    static #DESCRIPTION = "";
    static WANTED_PRIMARY_FIELDS = [
        "BirthDate",
        "BirthDateDecade",
        "DeathDateDecade",
        "BirthLocation",
        "DataStatus",
        "DeathDate",
        "DeathLocation",
        "Derived.BirthName",
        "Derived.BirthNamePrivate",
        "Father",
        "FirstName",
        "Gender",
        "HasChildren",
        "IsLiving",
        "Id",
        "LastNameAtBirth",
        "LastNameCurrent",
        "MiddleInitial",
        "Mother",
        "Name",
        "Privacy",
        "Suffix",
    ];
    constructor() {
        super();
        CachedPerson.init(new PeopleCache(new CacheLoader(CCDView.WANTED_PRIMARY_FIELDS)));
    }

    meta() {
        return {
            title: "Compact Couple Descendants",
            description: CCDView.#DESCRIPTION,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        // If we need to clear the cache whenever the focus of the tree changes, uncomment the next line
        // this.#peopleCache.clear();
        wtViewRegistry.setInfoPanel(CCDView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const cdte = new CCDE(container_selector).loadAndDraw(person_id);
    }

    close() {
        $("#svgContainer").off();
    }
};
