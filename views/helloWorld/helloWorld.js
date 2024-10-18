// Application the get the cemeteries where Ancestors are buried and place in a list.
// Created By: Kohn-970

/* 
TODO:
1.  If no cemetery available do not show ancestors - Changed to showing "No Cemetery Available"
2.  Add Link to the ancestor on Wikitree  https://www.wikitree.com/wiki/Ritzman-140
3.  Add function to allow people to select depth of ancestors.
*/

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
        
        getAncestors();       
        
        // Retrieve the ancestors from the api
        function getAncestors() {              
            WikiTreeAPI.postToAPI({
                appId: HelloWorldView.APP_ID,
                action: "getAncestors",
                key: person_id,
                depth: 5,
                fields: 'Name,LastNameAtBirth,FirstName,Categories',
                resolveRedirect: 1,                
            }).then(function (data) {                                   
                const tblResult = generateTable(data[0].ancestors);                    
                document.getElementById('view-container').appendChild(tblResult);

                new DataTable('#cemeteriesTable');
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


function generateTable(data) {
    console.log(data);
    // creates a <table> element and a <tbody> element
    let tbl = document.createElement("table");
    tbl.id = 'cemeteriesTable';
    let caption = tbl.createCaption();
    caption.textContent = "Ancestors Cemeteries";

    const tblBody = document.createElement("tbody");
    
    // create table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement('tr');
    const headers = Object.keys(data[0]);    

    headers.forEach(header => {
        const th = document.createElement('th');
        
        if (header == 'Name') {
            header = 'WikiTree ID';
        }
        else if (header == 'LastNameAtBirth') {
            header = 'Last Name';
        } 
        else if (header == 'FirstName') {
            header = 'First Name';
        }
        else if (header == 'Categories') {
            header = 'Cemetery';
        }


        th.textContent = header.charAt(0).toUpperCase() + header.slice(1); // Capitalize the first letter
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    tbl.appendChild(thead);

    data.forEach(item => {
        const row = document.createElement('tr');
               
        headers.forEach(header => {
            const td = document.createElement('td');
            if (header == "Categories") {
                const cemetery = findCemetery(item[header]);
                console.log(cemetery);
                console.log(cemetery.length)
                if (cemetery.length > 1) {
                    td.textContent = cemetery;
                }
                else {
                    td.textContent = "No Cemetery Available";
                }
            } else if (header == "Name") {
                const person = item[header];                
                const url = "https://www.wikitree.com/wiki/" + person;
                td.innerHTML = `<a href="${url}">${person}</a>`;                  
            }
            else {
                td.textContent = item[header];                
            }            
            row.appendChild(td);
        });
        tblBody.appendChild(row);
    });
  
    // put the <tbody> in the <table>
    tbl.appendChild(tblBody);
    // appends <table> into <body>
    document.body.appendChild(tbl);
    // sets the border attribute of tbl to '2'
    tbl.setAttribute("border", "2");  

    return tbl;
}
  
  
