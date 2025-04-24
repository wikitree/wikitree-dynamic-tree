window.TimelineTreeView = class TimelineTreeView extends View {
    meta() {
        return {
            title: "Timeline Tree",
            description: "An app that shows a tree structure in a timeline format ",
        };
    }

    async init(container_selector, person_id) {
        const personData = await WikiTreeAPI.getPerson("helloWorld", person_id, ["FirstName"]);
        const name = personData["_data"]["FirstName"];
        document.querySelector(container_selector).innerText = `Hello, ${name} - we will create a timeline here`;
    }
};