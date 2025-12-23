import { PeopleCache } from "../couplesTree/people_cache.js";
import { CacheLoader } from "../couplesTree/cache_loader.js";
import { CCTE } from "./cct_explorer.js";

window.CCTView = class CCTView extends View {
    static APP_ID = "CCT";
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
        "NoChildren",
        "Privacy",
        "Suffix",
    ];

    static #peopleCache;
    constructor() {
        super();
        if (!CCTView.#peopleCache) {
            CCTView.#peopleCache = new PeopleCache(new CacheLoader(CCTView.APP_ID, CCTView.WANTED_PRIMARY_FIELDS));
        }
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
        // CCTView.#peopleCache.clear();
        wtViewRegistry.setInfoPanel(CCTView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const ccte = new CCTE(container_selector, CCTView.#peopleCache).loadAndDraw(person_id);
    }

    close() {
        $("#svgContainer").off();
    }
};
