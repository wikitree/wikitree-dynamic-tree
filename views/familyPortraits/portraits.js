window.PortraitView = class PortraitView extends View {
    static APP_ID = "Portraits";

    meta() {
        return {
            title: "Family Portraits",
            description: `Generate a photo gallery that displays portraits of ancestors. Click an image to visit the profile.`,
            docs: "",
        };
    }

    init(selector, person_id) {
        WikiTreeAPI.postToAPI({
            appId: PortraitView.APP_ID,
            action: "getPeople",
            keys: person_id,
            ancestors: 10,
            siblings: 1,
            fields: "Name,PhotoData",
        }).then(function (data) {
            // Define an error message for permission denial.
            const errorMessage = "Ancestor/Descendant permission denied.";

            // Check if the API response contains the permission error.
            if (
                data[0].resultByKey &&
                data[0].resultByKey[person_id] &&
                data[0].resultByKey[person_id].status === errorMessage
            ) {
                // If permission denied, display an error message.
                let err = `The starting profile data could not be retrieved.`;
                if (wtViewRegistry?.session.lm.user.isLoggedIn()) {
                    err += ` You may need to be added to the starting profile's Trusted List.`;
                } else {
                    err += ` Try the Apps login.`;
                }
                wtViewRegistry.showError(err);

                // Hide the info panel.
                wtViewRegistry.hideInfoPanel();
            } else {
                const photoDataList = [];
                const galleryContainer = $(selector);

                // Create a new div element for the photo gallery.
                const newGalleryDiv = $('<div id="photo-gallery"></div>');

                // Extract Names and PhotoData information.
                for (const key in data[0].people) {
                    if (data[0].people.hasOwnProperty(key)) {
                        const person = data[0].people[key];
                        const name = person.Name;
                        const url = person.PhotoData ? person.PhotoData.url : null;
                        const path = person.PhotoData ? person.PhotoData.path : null;
                        const origWidth = person.PhotoData ? person.PhotoData.orig_width : null;
                        const origHeight = person.PhotoData ? person.PhotoData.orig_height : null;

                        if (name && url && origWidth && origHeight) {
                            // Calculate the aspect ratio of the image.
                            const aspectRatio = origWidth / origHeight;

                            // Check if the original width is greater than or equal to 301 pixels.
                            if (origWidth >= 301) {
                                // If the aspect ratio is less than or equal to 10.0,
                                // construct a new 300px URL and add it to the photoDataList.
                                if (aspectRatio <= 10.0) {
                                    const new300pxUrl = url.replace('/75px-', '/300px-');
                                    photoDataList.push({ name, url: new300pxUrl });
                                }
                            } else {
                                // If the original width is less than 301 pixels,
                                // and the path does not include 'pdf,' add the full-size path to the photoDataList.
                                if (!path.includes('pdf')) {
                                    photoDataList.push({ name, path });
                                }
                            }
                        }
                    }
                }

                // Verify the gallery container element exists.
                if (galleryContainer) {
                    // Generate HTML for the photo gallery using the data in photoDataList.
                    const galleryHTML = photoDataList.map((data) => `
                        <a href="https://www.wikitree.com/wiki/${data.name}" target="_blank">
                            <img class="portrait-gallery-image" src="https://www.wikitree.com${data.url || data.path}" alt="${data.name}" />
                        </a>
                    `).join('');

                    // Add the gallery HTML to the newGalleryDiv.
                    newGalleryDiv.html(galleryHTML);

                    // Append the newGalleryDiv to the galleryContainer.
                    galleryContainer.append(newGalleryDiv);
                }
            }
        });
    }
};
