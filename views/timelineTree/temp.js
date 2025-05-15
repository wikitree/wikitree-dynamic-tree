        // ---------------------------------------------
        // Primary parameters
        // Then find the earliest and latest years

        var yearEarliest = currentYear, yearLatest = 0;
        for (var i=0; i<ttreePeople.length; i++) {
            var person = ttreePeople[i];
            if (person["Birth"]["Use"] < yearEarliest) yearEarliest = Number(person["Birth"]["Use"]);
            if (person["Birth"]["Use"] > yearLatest)   yearLatest   = Number(person["Birth"]["Use"]);
            if (person["Death"]["Use"] < yearEarliest) yearEarliest = Number(person["Death"]["Use"]);
            if (person["Death"]["Use"] > yearLatest)   yearLatest   = Number(person["Death"]["Use"]);
        }
        if (yearEarliest > yearLatest) yearEarliest = yearLatest;
        yearEarliest = yearEarliest - 25;
        yearLatest = yearLatest + 40;
        // Then move to nearest 25 year boundary
        yearEarliest -= (yearEarliest % 25);
        yearLatest   -= (yearLatest % 25);

        var ptsPerYear = 5
        var yearStart = yearLatest;
        var yearEnd = yearEarliest
        var gridGap = 25;
        
        var headerHeight = 40;
        var rowHeight = 16;
        var barStart = 1200;
        var tableWidth = barStart + (yearStart - yearEnd)*ptsPerYear;
        var tableHeight = ttreePeople.length * rowHeight + 20;

        var svgElem = document.getElementById("ttreeMain");

        // ---------------------------------------------
        // Create Header
        document.getElementById("ttreeHeader").innerHTML = '<text x="10" y="20" font-size="20">Header</text>';

        // Adjust table size
        svgElem.setAttribute("height", tableHeight + headerHeight);
        svgElem.setAttribute("width", tableWidth);

        var svgData="";
        var alternate = 1;
        var rowY, rowClass;
        var elemTxt;

//        $("#paramGens").val())


        // ---------------------------------------------
        // create grid lines

        var gridLines = '<svg id="gridLines">';
        var gridText  = '<svg id="gridText">';

        var gridYear = yearStart, gridY1 = 0, gridY2 = tableHeight;
        while (gridYear > yearEnd) {
            var gridX = calcX(gridYear);
            if ((gridYear%100)==0) gridLines += '<line x1="' + gridX + '" y1="' + gridY1 + '" x2="' + gridX + '" y2="' + gridY2 + '" class="gridLine2"/>';
            else                   gridLines += '<line x1="' + gridX + '" y1="' + gridY1 + '" x2="' + gridX + '" y2="' + gridY2 + '" class="gridLine3"/>';
            var gridXtext = gridX - 15;
            gridText += '<text x="' + gridXtext + '" y="33" class="gridText">' + gridYear + '</text>';
            gridYear -= gridGap;
        }
        gridLines += '<line x1="0" y1="' + gridY1 + '" x2="0" y2="' + gridY2 + ' class="gridLine1"/>';
        gridLines += '</svg>';
        gridText  += '</svg>';

/*

        // ---------------------------------------------
        // Create header rows

        var labelsLocShort = [0, 35, 135, 260, 360, 460];
        var labelsShort = ["Gen", "Fam Name", "Given Name", "Birth date", "Death date", "Timeline"];
        var labelsLocLong = [0, 35, 95, 195, 320, 420, 750, 850, 1140];
        var labelsLong = ["Gen", "Sex", "Fam Name", "Given Name", "Birth date", "Birth location", "Death date", "Death Location", "Timeline"];

        elemTxt = '';
        elemTxt += '<svg id="RowHeader" x=0 y=0>';
        elemTxt += '<rect x="0" y="0" width="' + tableWidth + '" height="' + headerHeight + '"/>';
        elemTxt += '<svg id="RowHeaderTextShort" class="headerText">';
        for (var i=0; i<labelsLocShort.length; i++)
            elemTxt += '<text x="' + labelsLocShort[i] + 5 + '" y="13">' + labelsShort[i] + '</text>';
        elemTxt += `</svg>`;
        elemTxt += '<svg id="RowHeaderTextLong" class="headerText">';
        for (var i=0; i<labelsLocLong.length; i++)
            elemTxt += '<text x="' + labelsLocLong[i] + 5 + '" y="13">' + labelsLong[i] + '</text>';
        elemTxt += `</svg>`;

*/

        // ---------------------------------------------
        // Create base rows

        elemTxt = "";
        for (var i=0; i<ttreePeople.length; i++) {
            // Add in row background
            if (alternate==0) rowClass = "rowEven"; else rowClass = "rowOdd";
            alternate = (alternate+1)%2;
            rowY = (i * rowHeight);
            elemTxt += '<rect x="0" y="' + rowY + '" width="' + tableWidth + '" height="' + rowHeight + '" class="' + rowClass + '"/>';
        }
        svgData += elemTxt;


        // ---------------------------------------------
        // Create time bars
        // ###

        

        // ---------------------------------------------
        // Create content rows
        //     - Short Text
        //     - Long Text
        //     - Bar
        //     - family line

        elemTxt = "";
        for (var i=0; i<ttreePeople.length; i++) {
            elemTxt += '<svg id="rowText-' + i + '" class="rowText">';
            elemTxt +=    '<text x="0" y="13">Some example text on item' + i + '</text>';
            elemTxt += '</svg>';
            elemTxt += '<svg id="rowBar-' + i + '" class="rowBar">';
            elemTxt +=    '<rect x="' + i + '" y="0" width="50" height="' + rowHeight + '"/>';
            elemTxt += '</svg>';
        }
        svgData += elemTxt;

        // Add items to the DOM
        svgElem.innerHTML = svgData;

        // And then move rows to correct location
        for (var i=0; i<ttreePeople.length; i++) {
            var txtElem = document.getElementById("rowText-" + i);
            txtElem.setAttribute("x", "0");
            txtElem.setAttribute("y", (i * rowHeight));
            var barElem = document.getElementById("rowBar-" + i);
            barElem.setAttribute("x", barStart);
            barElem.setAttribute("y", (i * rowHeight));
        }


        // ### Print all Use dates to check
/*                
        // Temp display
        $("#ttreeMain").attr("height", 100);
        var svgText = "";
        for (var i=0; i<this.people.length; i++) {
            svgText += `<text x="10" y=` + (20+(i*20)) + `" font-size="20">Person ` + i + `</text>`;
        }
                
        document.getElementById("ttreeMain").innerHTML = "Testing";
        
        // $("#ttreeMain").html(svgText);
        // $("#ttreeMain").html("This");
*/                

    //===========================================================

		function calcX(year) {
            if (paramFlip) return (year - yearEnd)*ptsPerYear;
            else return (yearStart-year)*ptsPerYear;;
        }
			

    }
