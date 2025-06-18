window.PortraitView = class PortraitView extends View {
    static APP_ID = "Portraits";

    constructor() {
        super();
        this.abortController = new AbortController();
    }

    meta() {
        return {
            title: "Family Portraits",
            description: `Generate a photo gallery that displays portraits of ancestors. Click an image to visit the profile.`,
            docs: "",
            params: ["ancestors", "siblings"]
        };
    }

    close() {
        if (this.abortController) {
            this.abortController.abort();
            console.log('API processing halted.');
        }
        $('#view-options').remove();
    }

    init(selector, person_id, params) {
        this.abortController = new AbortController();

        const ancestors = params.ancestors || 10;
        const validSiblings = (siblings) => ['1', '0'].includes(siblings) ? siblings : '1';
        const siblings = validSiblings(params.siblings);

        var pageNumber = 0;
        this.getPages(pageNumber, selector, person_id, ancestors, siblings);
    }

    getPages(pageNumber, selector, person_id, ancestors, siblings) {
        WikiTreeAPI.postToAPI({
            appId: PortraitView.APP_ID,
            action: "getPeople",
            keys: person_id,
            ancestors: ancestors,
            siblings: siblings,
            fields: "Name,PhotoData",
            limit: 1000,
            start: pageNumber,
            signal: this.abortController.signal // Use the signal to allow aborting
        }).then((data) => {
            if (this.abortController.signal.aborted) {
                console.log('Request was aborted. Stopping further processing.');
                return;
            }

            const errorMessage = "Ancestor/Descendant permission denied.";
            if (
                data[0].resultByKey &&
                data[0].resultByKey[person_id] &&
                data[0].resultByKey[person_id].status === errorMessage
            ) {
                let err = `The starting profile data could not be retrieved.`;
                if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                    err += ` You may need to be added to the starting profile's Trusted List.`;
                } else {
                    err += ` Try the Apps login.`;
                }
                wtViewRegistry.showError(err);
                wtViewRegistry.hideInfoPanel();
            } else {
                const photoDataList = [];
                const galleryContainer = $(selector);
                const newGalleryDiv = $('<div id="photo-gallery"></div>');

                for (const key in data[0].people) {
                    if (data[0].people.hasOwnProperty(key)) {
                        const person = data[0].people[key];
                        const name = person.Name;
                        const url = person.PhotoData ? person.PhotoData.url : null;
                        const path = person.PhotoData ? person.PhotoData.path : null;
                        const origWidth = person.PhotoData ? person.PhotoData.orig_width : null;
                        const origHeight = person.PhotoData ? person.PhotoData.orig_height : null;

                        if (name && url && origWidth && origHeight) {
                            const aspectRatio = origWidth / origHeight;

                            if (origWidth >= 301) {
                                if (aspectRatio <= 10.0) {
                                    const new300pxUrl = url.replace('/75px-', '/300px-');
                                    photoDataList.push({ name, url: new300pxUrl });
                                }
                            } else {
                                if (!path.includes('pdf')) {
                                    photoDataList.push({ name, path });
                                }
                            }
                        }
                    }
                }

                if (galleryContainer) {
                    const galleryHTML = photoDataList.map((data) => `
                        <a href="https://www.wikitree.com/wiki/${data.name}" target="_blank">
                            <img class="portrait-gallery-image" src="https://www.wikitree.com${data.url || data.path}" alt="${data.name}" />
                        </a>
                    `).join('');
                    newGalleryDiv.html(galleryHTML);
                    galleryContainer.append(newGalleryDiv);
                }

                var numPeople = Object.keys(data[0].people).length;
                if (numPeople === 1000) {
                    pageNumber += 1000;
                    this.getPages(pageNumber, selector, person_id, ancestors, siblings);
                }
            }
        }).catch((error) => {
            if (error.name === 'AbortError') {
                console.log('API request was aborted.');
            } else {
                console.error('Error fetching data:', error);
            }
        });
    }
};
