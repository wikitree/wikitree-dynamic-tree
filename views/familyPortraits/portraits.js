window.PortraitView = class PortraitView extends View {
    static APP_ID = "Portraits";
    meta() {
        return {
            title: "Family Portraits",
            description: `Generate a photo gallery that displays portraits of ancestors. CLick an image to visit the profile.`,
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
            // Define an error message for permission denial
            const errorMessage = "Ancestor/Descendant permission denied.";

            // Check if the API response contains the permission error
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
                // Function to shuffle an array
                function shuffleArray(array) {
                    for (let i = array.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [array[i], array[j]] = [array[j], array[i]];
                    }
                }

                // Extract Names and PhotoData.path information
                const photoDataList = [];
                const galleryContainer = $('#view-container');
                const newGalleryDiv = $('<div id="photo-gallery"></div>');

                for (const key in data[0].people) {
                    if (data[0].people.hasOwnProperty(key)) {
                        const person = data[0].people[key];
                        const name = person.Name;
                        const path = person.PhotoData ? person.PhotoData.path : null;

                        if (name && path) {
                            // Calculate the aspect ratio
                            const width = person.PhotoData.orig_width;
                            const height = person.PhotoData.orig_height;
                            const aspectRatio = width / height;

                            // Check if the aspect ratio is less than or equal to 10.0
                            if (aspectRatio <= 10.0) {
                                photoDataList.push({ name, path });
                            }
                        }
                    }
                }

                // Shuffle the photoDataList array
                shuffleArray(photoDataList);

                if (galleryContainer) {
                    const galleryHTML = photoDataList.map((data) => `
                        <a href="https://www.wikitree.com/wiki/${data.name}" target="_blank">
                        <img class="portrait-gallery-image" src="https://www.wikitree.com${data.path}" alt="${data.name}" />
                        </a>
                    `).join('');

                    newGalleryDiv.html(galleryHTML);
                    galleryContainer.append(newGalleryDiv);
                }
            }
        });
    }
};
