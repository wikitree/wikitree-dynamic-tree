import { CC7 } from "./js/cc7.js";

window.CC7View = class CC7View extends View {
    static #DESCRIPTION =
        "Loading 7 degrees may take a while (more than a minute) so the default is set to 3. Feel free to change it. " +
        "Also, degrees of seperation might be shown as larger than actual if there are private profiles in the mix. " +
        "These private profiles may also result in it not being possible to determine the degree of separation of some " +
        "profiles, so the latter will be shown with a negative degree." +
        "Your logged in status (see top right) might influence the number of private profiles.";
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
