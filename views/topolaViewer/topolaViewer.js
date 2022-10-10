// Opens the Topola Genealogy Viewer in an iframe.
window.TopolaViewerView = class TopolaViewerView extends View {
    meta() {
        return {
            title: "Topola Dynamic Tree",
            description: "Click and drag to pan around. Click on a person to show their ancestors and descendants.",
            docs: "https://github.com/PeWu/topola-viewer",
        };
    }

    init(containerSelector, personId) {
        const container = $(containerSelector);
        const url =
            'https://apps.wikitree.com/apps/wiech13/topola-viewer/#/view' +
            `?indi=${personId}`+
            '&source=wikitree&standalone=false&showWikiTreeMenus=false';
        container.append(`
            <iframe
                 src="${url}"
                 style="width: 100%; height: ${container.height()}px;">
            </iframe>`);
    }
}
