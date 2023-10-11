import { CC7 } from "./js/cc7.js";

window.CC7View = class CC7View extends View {
    static #DESCRIPTION =
        "Loading 7 degrees may take a while (it can be 2 minutes or more) so the default is set to 3. Feel free to change it. ";

    constructor() {
        super();
        this.overflow = undefined;
    }

    meta() {
        return {
            title: "CC7 Views",
            description: CC7View.#DESCRIPTION,
            docs: "",
        };
    }

    init(container_selector, person_id) {
        // Our view fiddles with the overflow style value of view-container, so we want to reset it to its original
        // value once the user is done with our view.
        // However, init() can be called multiple times while the view is active (i.e. everytime the GO button is clicked)
        // so we save the overflow value only if close() had been called since we last saved it
        if (!this.overflow) {
            this.overflow = $("#view-container").css("overflow");
        }
        wtViewRegistry.setInfoPanel(CC7View.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const cc7 = new CC7(container_selector, person_id);
    }

    close() {
        // Another view is about to be activated, retore the original overflow value of view-container
        $("#view-container").css({
            overflow: this.overflow,
        });
        this.overflow = undefined;
    }
};

CC7View.cancelSettings = function () {
    let theDIV = document.getElementById("settingsDIV");
    theDIV.style.display = "none";
};
