import { AncestorLinesExplorer } from "./ancestor_lines_explorer.js";

window.ALEView = class ALEView extends View {
    static #DESCRIPTION = "Click on the question mark in the green circle below right for help.";
    meta() {
        return {
            title: "Ancestor Lines Explorer",
            description: ALEView.#DESCRIPTION,
            docs: "",
            params: [
                "maxgen",
                "limitgen",
                "poi",
                "exploi",
                "conn",
                "efactor",
                "hfactor",
                "onlyloi",
                "lonly",
                "bwcolour",
                "posrel",
                "priv",
                "anon",
                "bwnop",
                "bw1p",
                "bwbio",
                "bwnosp",
                "bwnoch",
            ],
        };
    }

    init(container_selector, person_id, params) {
        wtViewRegistry.setInfoPanel(ALEView.#DESCRIPTION);
        wtViewRegistry.showInfoPanel();
        const ale = new AncestorLinesExplorer(container_selector, person_id, params);
    }
};
