window.OtherAppsView = class OtherAppsView extends View {
    meta() {
        return {
            title: "Other Apps",
            description: `Check out other tools created by independent developers in the WikiTree Community.`,
            docs: "",
        };
    }

    init(containerSelector, personID) {
        //document.location = "https://www.wikitree.com/wiki/Help:Apps";
        this.loadDescription(personID);
    }
    
    async loadDescription(personID) {
        let data = await WikiTreeAPI.postToAPI({ action: "getPerson", key: personID, fields: 'Id,Name' });
        if (data.length != 1) {
            wtViewRegistry.showError(`There was an error starting with ${personID}.`);
            wtViewRegistry.hideInfoPanel();
            return;
        }

        let p = data[0].person;
        if (!p?.Name) {
            let err = `The starting profile data could not be retrieved.`;
            wtViewRegistry.showError(err);
            wtViewRegistry.hideInfoPanel();
            return;
        }

        wtViewRegistry.setDescription(`Check out other tools created by independent developers in the WikiTree Community: <a href="https://www.wikitree.com/treewidget/${data[0].person.Name}/77">Tree Widget #77</a>`);
    }
};
