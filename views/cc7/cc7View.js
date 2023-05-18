import { CC7 } from "./js/cc7.js";

window.CC7View = class CC7View extends View {
    static #DESCRIPTION =
        "Loading 7 degrees may take a long time (5 minutes plus) so the default is set to 3. Feel free to change it.";
    meta() {
        return {
            title: "CC7 Views",
            description: CC7View.#DESCRIPTION,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        wtViewRegistry.setInfoPanel(CC7View.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const cc7 = new CC7(container_selector, person_id);
    }
};
