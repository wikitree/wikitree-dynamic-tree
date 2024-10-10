window.HelloWorldView = class HelloWorldView extends View {
    static APP_ID = "Cemeteries";
        
    meta() {
        return {
            title: "Ancestors Cemeteries",
            description: "App to return where ancestors are buried.",
            params: ["ancestors"],
        };
    }

    async init(container_selector, person_id) {
        const personData = await WikiTreeAPI.getPerson("helloWorld", person_id, ["FirstName"]);                
        const name = personData["_data"]["FirstName"];
        document.querySelector(container_selector).innerText = `Hello, ${name}`;

        getAncestors();       
        
        function getAncestors() {              
            WikiTreeAPI.postToAPI({
                appId: HelloWorldView.APP_ID,
                action: "getAncestors",
                key: person_id,
                depth: 3,
                fields: 'Id,Name,LastNameAtBirth,Categories',
                resolveRedirect: 1,                
            }).then(function (data) {
                // console.log(data[0].ancestors[0].Categories[0]);   
                for (const key in data[0].ancestors) {                    
                    const result = findCemetery(data[0].ancestors[key].Categories);
                    console.log(result);  
                }
            })
        }
    }
};

function findCemetery(data) {
    let searchWords = ['burial', 'cemetery', 'memorial', 'gardens', 'park', 'potters', 'field']
    const regex = new RegExp(searchWords.join("|"), "i");  // 'i' for case-insensitive        
    const matchedWords = data.filter(word => regex.test(word));
    let result = JSON.stringify(matchedWords);
    result = result.replace(/[_]/g, ' ').replace(/[\[\]\'\"]/g, '');

    return result;
}