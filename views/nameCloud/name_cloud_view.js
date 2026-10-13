/*
 * Name Cloud
 *
 * A word cloud, in the shape of an oak, a heart or a picture of your own, made from the names of a person's ancestors or CC7, or of
 * everyone in a category or a WikiTree+ search: surnames, first names, middle names or both given names. Biological relatives, adoptive ones, or both. Hover a name to see how many profiles
 * have it, click it to list them, and click a person in the list for a card.
 *
 * Created By: Azure Robinson (Robinson-27225)
 */

import { mountApp } from "./name_cloud_app.js";

/** The options in the address after the view (#name=...&view=namecloud&names=first&scope=cc7&degrees=5). */
const URL_PARAMS = ["names", "scope", "generations", "degrees", "biological", "adoptive", "fill", "look", "query"];

/** Where the built-in pictures are kept: the folder this script is in. */
const IMAGES_URL = new URL("./", import.meta.url).href;

/** "0", "false", "no" and "off" are no; anything else given is yes; not given is left to the default. */
const asFlag = (value) => (value === undefined ? undefined : !/^(0|false|no|off)$/i.test(String(value)));

window.NameCloudView = class NameCloudView extends View {
    constructor() {
        super();
        this.app = null;
    }

    meta() {
        return {
            title: "Name Cloud",
            description:
                "A word cloud of the surnames (or first or middle names) of this person's ancestors or CC7, with " +
                "biological relatives, adoptive ones or both, or of everyone in a category or a WikiTree+ search, in " +
                "the shape of an oak, a heart or a picture of your own. Hover a name to see how many profiles have it, " +
                "click it to list them.",
            docs: "https://github.com/wikitree/wikitree-dynamic-tree/blob/main/views/nameCloud/README.md",
            params: URL_PARAMS,
        };
    }

    init(container_selector, person_id, params = {}) {
        // The registry calls init again, without close, when GO is pressed for the same view.
        this.close();
        const container = document.querySelector(container_selector);
        this.app = mountApp(container, person_id, {
            imagesUrl: IMAGES_URL,
            names: params.names,
            look: params.look,
            scope: params.scope,
            query: params.query,
            generations: parseInt(params.generations, 10),
            degrees: parseInt(params.degrees, 10),
            biological: asFlag(params.biological),
            adoptive: asFlag(params.adoptive),
            fillGaps: asFlag(params.fill),
        });
    }

    close() {
        if (this.app) this.app.destroy();
        this.app = null;
    }
};
