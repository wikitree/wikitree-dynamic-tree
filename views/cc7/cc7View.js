import { CC7 } from "./js/cc7.js";

window.CC7View = class CC7View extends View {
    meta() {
        return {
            title: "CC7 Table",
            description: "",
            docs: "",
        };
    }

    init(container_selector, person_id) {
        const cc7 = new CC7(container_selector, person_id);
    }
};
