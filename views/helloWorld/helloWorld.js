// TODO:
//      1.  Get the Full Name and ID
//      2.  Add the functionality to create a table with the list of cemeteries, name and person ID

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
        document.querySelector(container_selector).innerText = '<h1>Ancestors burials location</h1>';

        getAncestors();       
        
        function getAncestors() {              
            WikiTreeAPI.postToAPI({
                appId: HelloWorldView.APP_ID,
                action: "getAncestors",
                key: person_id,
                depth: 3,
                fields: 'Name,LastNameAtBirth,FirstName,Categories',
                resolveRedirect: 1,                
            }).then(function (data) {
                // console.log(data[0].ancestors);   
                for (const key in data[0].ancestors) {                    
                    const result = findCemetery(data[0].ancestors[key].Categories);                    
                    // console.log(result);  
                    //document.querySelector(container_selector).innerText = result;
                }
                const tblResult = generateTable(data[0].ancestors);                    
                document.getElementById('view-container').appendChild(tblResult);
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
    const tbl = document.createElement("table");
    const tblBody = document.createElement("tbody");
    
    // create table header
    const thead = document.createElement("thead");
    const headerRow = document.createElement('tr');
    const headers = Object.keys(data[0]);
    console.log(headers);

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header.charAt(0).toUpperCase() + header.slice(1); // Capitalize the first letter
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    tbl.appendChild(thead);

    // creating all cells
    // for (let i = 0; i < 5; i++) {
    //     // creates a table row
    //     const row = document.createElement("tr");
  
    //     for (let j = 0; j < 2; j++) {
    //         // Create a <td> element and a text node, make the text
    //         // node the contents of the <td>, and put the <td> at
    //         // the end of the table row
    //         const cell = document.createElement("td");
    //         const cellText = document.createTextNode(`cell in row ${i}, column ${j}`);
    //         cell.appendChild(cellText);
    //         row.appendChild(cell);
    //     }
  
    //     // add the row to the end of the table body
    //     tblBody.appendChild(row);
    // }

    data.forEach(item => {
        const row = document.createElement('tr');
               
        headers.forEach(header => {
            const td = document.createElement('td');
            if (header == "Categories") {
                item[header] = findCemetery(item[header]);
                td.textContent = item[header];
                
            } else {
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
  
  
