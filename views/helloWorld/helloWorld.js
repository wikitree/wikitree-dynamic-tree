window.HelloWorldView = class HelloWorldView extends View {
    meta() {
        return {
            title: "Hello World",
            description: "A simple example app.",
        };
    }

    async init(container_selector, person_id) {
        const personData = await WikiTreeAPI.getPerson("helloWorld", person_id, ["FirstName"]);
        const name = personData["_data"]["FirstName"];
        document.querySelector(container_selector).innerText = `Hello, ${name}`;
    }
};