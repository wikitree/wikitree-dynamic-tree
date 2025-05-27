    blocksMain += `<svg id="mainRows">`;
    blocksMain += `<svg id="mainTextShort">`;
    for (let i=0; i<ttreePeople.length; i++) {
        blocksMain += `<svg id="personTextS-${i}" x="0" y="${rowY}">`;
    blocksMain += `<svg id="mainTextLong">`;
    for (let i=0; i<ttreePeople.length; i++) {
        blocksMain += `<svg id="personTextL-${i}" x="0" y="${rowY}">`;

    let blocksFwd = `<svg id="mainBarFwd">`;
    blocksFwd += `<svg id="mainGridlinesFwd">`;
    for (let i=0; i<ttreePeople.length; i++) {
        blocksFwd += `<svg id="personSetF-${i}" x="0" y="${barY}">`;
        blocksFwd += `   <svg id="personBarF-${i}" x="0" y="0"}>`;
        blocksFwd += `<a href="http://wikitree.com/wiki/${person["Details"]["Name"]}" class="abar" target="_blank"><text x="${xUF - 10}" y="13" class="barTextF">${gn} ${sn} (${by}-${dy})</text></a>`

    let blocksBwd = `<svg id="mainBarBwd">`;
    blocksBwd += `<svg id="mainGridlinesBwd">`;
    for (let i=0; i<ttreePeople.length; i++) {
        blocksBwd += `<svg id="personSetB-${i}" x="0" y="${barY}">`;
        blocksBwd += `   <svg id="personBarB-${i}" x="0" y="0"}>`;
        blocksBwd += `<a href="http://wikitree.com/wiki/${person["Details"]["Name"]}" class="abar" target="_blank"><text x="${xUB + 10}" y="13" class="barTextB">${gn} ${sn} (${by}-${dy})</text></a>`

    // Create the vertical family lines
    blocksFwd = `<svg id="mainFamLinesFwd">`;
    blocksFwd += `<line x1="${xF}" y1="0" x2="${xF}" y2="0" id="familyLinesF-${i}" class="familyLine"/>`;

    blocksBwd = `<svg id="mainFamLinesBwd">`;
    blocksBwd += `<line x1="${xB}" y1="0" x2="${xB}" y2="0" id="familyLinesB-${i}" class="familyLine"/>`;












// ---------------------------------------------
    // Build colored row backgrounds

    let alternate = 0;
    blocksMain += `<svg id="mainRows">`;
    for (let i=0; i<maxRows; i++) {
        let rowY, rowClass;
        alternate = (alternate+1)%2;
        // Add in row background
        if (alternate==0) rowClass = "rowEven"; else rowClass = "rowOdd";
        rowY = (i * rowHeight)+15;
        blocksMain += `<rect x="0" y="${rowY}" width="10000" height="${rowHeight}" class="${rowClass}"/>`;
    }
    blocksMain += `</svg>`;


    // ---------------------------------------------
    // Build People Text (short version and long version)

    // Short version of text
    blocksMain += `<svg id="mainTextShort">`;
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const rowY = (i * rowHeight) + 14;
        blocksMain += `<svg id="personTextS-${i}" x="0" y="${rowY}">`;
        blocksMain +=   `<text x="${+locsShort[0] + +5}" y="13" class="gridText">${ (person["Gen"] > 0) ? person["Gen"] : "-"}</text>`;
        blocksMain +=   `<text x="${+locsShort[1] + +5}" y="13" class="gridText">${person["FirstName"]} ${person["Details"]["LastNameAtBirth"]}</text>`;
        blocksMain +=   `<text x="${+locsShort[2] + +5}" y="13" class="gridText">${person["Details"]["BirthDate"]} - ${person["Details"]["DeathDate"]}</text>`;
        blocksMain += `</svg>`;
    }
    blocksMain += `</svg>`;
    
    // Long version of text
    blocksMain += `<svg id="mainTextLong">`;
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const rowY = (i * rowHeight) + 14;
        blocksMain += `<svg id="personTextL-${i}" x="0" y="${rowY}">`;
        blocksMain +=   `<text x="${+locsLong[0] + +5}" y="13" class="gridText">${ (person["Gen"] > 0) ? person["Gen"] : "-"}</text>`;
        blocksMain +=   `<text x="${+locsLong[1] + +5}" y="13" class="gridText">${person["FirstName"]} ${person["Details"]["MiddleName"]} ${person["Details"]["LastNameAtBirth"]}</text>`;
        blocksMain +=   `<text x="${+locsLong[2] + +5}" y="13" class="gridText">${person["Details"]["BirthDate"]} - ${person["Details"]["DeathDate"]}</text>`;
        blocksMain +=   `<text x="${+locsLong[3] + +5}" y="13" class="gridText">${person["Details"]["BirthLocation"]}</text>`;
        blocksMain += `</svg>`;
    }
    blocksMain += `</svg>`;


    // ---------------------------------------------
    // Build People Timeline Bars (Fwd and Bwd version)

    // Add formatting info for the fade out on time timeline bars

    const barColourM0="#2222FF", barColourM1="#8888FF", barColourM2="#CCCCFF";
    const barColourF0="#FF2222", barColourF1="#FF8888", barColourF2="#FFCCCC";
    const barColourX0="#222222", barColourX1="#888888", barColourX2="#CCCCCC";
    
    blocksMain += `<defs id="svgdefs">`;
    blocksMain += `<linearGradient id='gradM0R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourM0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM0L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourM0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM1R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourM1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM1L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourM1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM2R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourM2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradM2L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourM2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourM2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF0R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourF0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF0L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourF0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF1R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourF1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF1L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourF1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF2R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourF2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradF2L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourF2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourF2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX0R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourX0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX0L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourX0};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX0};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX1R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourX1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX1L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourX1};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX1};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX2R' x1='0%' y1='0%' x2='100%' y2='0%'><stop offset='0%' style='stop-color:${barColourX2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `<linearGradient id='gradX2L' x1='100%' y1='0%' x2='0%' y2='0%'><stop offset='0%' style='stop-color:${barColourX2};stop-opacity:0'/><stop offset='100%' style='stop-color:${barColourX2};stop-opacity:1' /></linearGradient>`;
    blocksMain += `</defs>`;

    // Create Main timelines

    let rowY;
    let blocksFwd = `<svg id="mainBarFwd">`;
    let blocksBwd = `<svg id="mainBarBwd">`;

    // Gridlines - Forward version (earliest year left)
    blocksFwd += `<svg id="mainGridlinesFwd">`;
    let mainYearGrid = yearEarliest+25;
    while (mainYearGrid < yearLatest) {
        if ((mainYearGrid%100)==0) blocksFwd += `<line x1="${(mainYearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(mainYearGrid - yearEarliest)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine2"/>`;
        else                       blocksFwd += `<line x1="${(mainYearGrid - yearEarliest)*ptsPerYear}" y1="0" x2="${(mainYearGrid - yearEarliest)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine3"/>`;
        mainYearGrid += gridGap;
    }
    blocksFwd += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    blocksFwd += `</svg>`;

    // Gridlines - Reverse version (latest year left)
    blocksBwd += `<svg id="mainGridlinesBwd">`;
    mainYearGrid = yearLatest-25;
    while (mainYearGrid > yearEarliest) {
        if ((mainYearGrid%100)==0) blocksBwd += `<line x1="${(yearLatest - mainYearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - mainYearGrid)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine2"/>`;
        else                       blocksBwd += `<line x1="${(yearLatest - mainYearGrid)*ptsPerYear}" y1="0" x2="${(yearLatest - mainYearGrid)*ptsPerYear}" y2="${maxRows * rowHeight}" class="gridLine3"/>`;
        mainYearGrid -= gridGap;
    }
    blocksBwd += `<line x1="1" y1="0" x2="1" y2="20000" class="gridLine1"/>`;
    blocksBwd += `</svg>`;
    
    // Now create the bar for each person
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        const barY = (i * rowHeight) + 14;
        const sn = (person["Details"]["LastNameAtBirth"] == "Unknown") ? "?" : person["Details"]["LastNameAtBirth"];
        const gn = (person["FirstName"] == "Unknown") ? "?" : person["FirstName"];
        const by = person["Birth"]["Known"] ? person["Birth"]["Use"] : "?";
        const dy = person["Death"]["Known"] ? person["Death"]["Use"] : "?";

        let barColour, barDef;
        if (person["Type"] == "ancestor") {
            switch (person["Details"]["Gender"]) {
                case "Male"   : barColour = barColourM0; barDef = "#gradM0"; break;
                case "Female" : barColour = barColourF0; barDef = "#gradF0";  break;
                default       : barColour = barColourX0; barDef = "#gradX0"; 
            }
        }
        else if (person["Type"] == "sibling") {
            switch (person["Details"]["Gender"]) {
                case "Male"   : barColour = barColourM1; barDef = "#gradM1"; break;
                case "Female" : barColour = barColourF1; barDef = "#gradF1";  break;
                default       : barColour = barColourX1; barDef = "#gradX1"; 
            }
        }
        else {
            switch (person["Details"]["Gender"]) {
                case "Male"   : barColour = barColourM2; barDef = "#gradM2"; break;
                case "Female" : barColour = barColourF2; barDef = "#gradF2";  break;
                default       : barColour = barColourX2; barDef = "#gradX2"; 
            }
        }

        // Bar when showing forward direction
        const xBF = (person["Birth"]["Use"] - yearEarliest) * ptsPerYear;
        const xDF = (person["Death"]["Use"] - yearEarliest) * ptsPerYear;
        const xUF = (ttreeFamilies[person["ChildIn"]]["Status"]["Use"] - yearEarliest) * ptsPerYear;
        blocksFwd += `<svg id="personSetF-${i}" x="0" y="${barY}">`;
        blocksFwd += `   <svg id="personBarF-${i}" x="0" y="0"}>`;
        blocksFwd += `      <rect x="${xBF}" y="4" width="${xDF-xBF}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person["Birth"]["Known"]) blocksFwd += `      <rect x="${xBF - 50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        if (!person["Death"]["Known"]) blocksFwd += `      <rect x="${xDF}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        blocksFwd +=    `<line x1="${xUF}" y1="9" x2="${xBF+2}" y2="9" class="familyLine"/>`;
        // Add marriage dots
        for (const famIdx of person["ParentIn"]) {
            const fData = ttreeFamilies[famIdx]["Status"];
            const xPF = (fData["Use"] - yearEarliest) * ptsPerYear;
            const mdot = (fData["Married"]) ? ((fData["Known"]) ? "famDot1" : "famDot2" ) : "famDot3";
            blocksFwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        blocksFwd += `   </svg>`
        // Add names+dates
        blocksFwd += `<a href="http://wikitree.com/wiki/${person["Details"]["Name"]}" class="abar" target="_blank"><text x="${xUF - 10}" y="13" class="barTextF">${gn} ${sn} (${by}-${dy})</text></a>`
        blocksFwd += `</svg>`;

        // Bar when showing backward direction
        const xBB = (yearLatest - person["Birth"]["Use"]) * ptsPerYear;
        const xDB = (yearLatest - person["Death"]["Use"]) * ptsPerYear;
        const xUB = (yearLatest - ttreeFamilies[person["ChildIn"]]["Status"]["Use"]) * ptsPerYear;
        blocksBwd += `<svg id="personSetB-${i}" x="0" y="${barY}">`;
        blocksBwd += `   <svg id="personBarB-${i}" x="0" y="0"}>`;
        blocksBwd += `      <rect x="${xDB}" y="4" width="${xBB-xDB}" height="10" style="fill:${barColour};stroke-width:0;stroke:#000000"/>`;
        if (!person["Birth"]["Known"]) blocksBwd += `      <rect x="${xBB}" y="4" width="50" height="10" style="fill:url(${barDef}L);stroke-width:0;stroke:#000000"/>`;
        if (!person["Death"]["Known"]) blocksBwd += `      <rect x="${xDB-50}" y="4" width="50" height="10" style="fill:url(${barDef}R);stroke-width:0;stroke:#000000"/>`;
        blocksBwd +=    `<line x1="${xBB-2}" y1="9" x2="${xUB}" y2="9" class="familyLine"/>`;
        // Add marriage dots
        for (const famIdx of person["ParentIn"]) {
            const fData = ttreeFamilies[famIdx]["Status"];
            const xPF = (yearLatest - fData["Use"]) * ptsPerYear;
            const mdot = (fData["Married"]) ? ((fData["Known"]) ? "famDot1" : "famDot3" ) : "famDot3";
            blocksBwd += `<circle cx="${xPF}" cy="9" r="3" class="${mdot}"/>`;
        }
        blocksBwd += `   </svg>`
        // Add names+dates
        blocksBwd += `<a href="http://wikitree.com/wiki/${person["Details"]["Name"]}" class="abar" target="_blank"><text x="${xUB + 10}" y="13" class="barTextB">${gn} ${sn} (${by}-${dy})</text></a>`
        blocksBwd += `</svg>`;
    }
    blocksFwd += `</svg>`;
    blocksBwd += `</svg>`;
    blocksMain += blocksFwd; 
    blocksMain += blocksBwd; 


    // Create the vertical family lines
    blocksFwd = `<svg id="mainFamLinesFwd">`;
    blocksBwd = `<svg id="mainFamLinesBwd">`;

    for (let i=0; i<ttreeFamilies.length; i++) {
        const family = ttreeFamilies[i];
        // Create line, but leave Y dimensions until it is displayed
        const xF = (family["Status"]["Use"] - yearEarliest) * ptsPerYear;
        blocksFwd += `<line x1="${xF}" y1="0" x2="${xF}" y2="0" id="familyLinesF-${i}" class="familyLine"/>`;
        // For Bwd version
        const xB = (yearLatest - family["Status"]["Use"]) * ptsPerYear;
        blocksBwd += `<line x1="${xB}" y1="0" x2="${xB}" y2="0" id="familyLinesB-${i}" class="familyLine"/>`;
    }
    blocksFwd += `</svg>`;
    blocksBwd += `</svg>`;
    blocksMain += blocksFwd; 
    blocksMain += blocksBwd; 

    // ---------------------------------------------
    // Add all the items to the DOM

    svgHeader.innerHTML += blocksHeader;
    svgMain.innerHTML += blocksMain;

    // Set all people to be initially hidden
    for (let i=0; i<ttreePeople.length; i++) {
        const person = ttreePeople[i];
        person["Visible"] = false;
    }
}

