import { FamilyTreeStatistics } from "./familytreestatistics.js";
import { categoryMappings } from "./category_mappings.js";

let displayedIndividuals = new Set();
let displayedSpouses = new Set(); // New set to keep track of displayed spouses
let combinedResults = {};
let parentToChildrenMap = {};
let peopleById = {};
let familyTreeStats;
const monthName = ["Unk", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
window.FamilyTreeStatistics = FamilyTreeStatistics;
let nameVariants = new Map();
const shakingTree = $(`<img src="images/tree.gif" alt="Shaking Tree" title="Working" id="shakingTree">`);
shakingTree.hide().appendTo("body");

function updateAccessOrder(key) {
  let accessOrder = localStorage.getItem("accessOrder");
  accessOrder = accessOrder ? JSON.parse(accessOrder) : [];

  // Remove the key if it already exists to update its position
  const index = accessOrder.indexOf(key);
  if (index !== -1) {
    accessOrder.splice(index, 1);
  }

  // Push the key to the end to mark it as the most recently used
  accessOrder.push(key);

  // Save the updated access order
  localStorage.setItem("accessOrder", JSON.stringify(accessOrder));
}

async function fetchData() {
  try {
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vSL1WDK4-ReqYPjJ3L-ynxwGgAQOLsNdBcI7gKFCxzU3jLd5L_-YiiCz77faR9L362jjVpP-38JjSEa/pub?output=csv"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvData = await response.text();
    parseAndStoreCSV(csvData);
  } catch (error) {
    console.error("Error fetching the spreadsheet:", error);
  }
}

function parseAndStoreCSV(csvData) {
  nameVariants = parseCSV(csvData);
  storeData(nameVariants);
  console.log(nameVariants);
}

function parseCSV(csvData) {
  const lines = csvData.split("\n");
  const result = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

      if (fields) {
        const surname = fields[0];
        const variants = fields[1] ? fields[1].split(",").map((s) => s.trim().replace(/\"/g, "")) : [];
        const namesArray = [surname.replace(/\"/g, ""), ...variants];

        namesArray.forEach((name) => {
          result.set(name, namesArray);
        });
      }
    }
  }

  return result;
}

localStorage.removeItem("surnameData");
function storeData(data) {
  const objectData = Object.fromEntries(data);
  localStorage.setItem("surnameData", JSON.stringify(objectData));
}

function retrieveData() {
  const storedData = localStorage.getItem("surnameData");
  return storedData ? new Map(Object.entries(JSON.parse(storedData))) : new Map();
}

function standardizeString(str) {
  if (!str) {
    return "";
  }
  // Normalize the string to NFD (Normalization Form Decomposition)
  // then replace non-spacing marks (accents) with an empty string
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findSurnameVariants(surname) {
  if (!nameVariants.size) {
    nameVariants = retrieveData();
  }
  return nameVariants.get(surname) || [surname];
}

// Call fetchData to fetch and store data on initial load
fetchData();

function showLoadingBar() {
  $("#loadingBarContainer").show();
  document.getElementById("loadingBar").style.width = "0%";
  document.getElementById("loadingBarContainer").style.display = "block";
}

function updateLoadingBar(percentage) {
  document.getElementById("loadingBar").style.width = percentage + "%";
}

function hideLoadingBar() {
  document.getElementById("loadingBarContainer").style.display = "none";
}

function clearONSidsCache(surname) {
  // Construct the key prefix to match
  const prefix = `ONTids_${surname}`;

  // Iterate over all keys in localStorage
  for (const key in localStorage) {
    // Check if the key starts with the specified prefix
    if (key.startsWith(prefix)) {
      // Remove the item from localStorage
      localStorage.removeItem(key);
      console.log(`Cleared cached data for key: ${key}`);
    }
  }
}

function saveWithLRUStrategy(key, value) {
  try {
    // Attempt to save the item
    localStorage.setItem(key, value);
    updateAccessOrder(key); // Update access order upon successful save
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      // When storage is full, remove the least recently used item
      let accessOrder = localStorage.getItem("accessOrder");
      accessOrder = accessOrder ? JSON.parse(accessOrder) : [];

      while (accessOrder.length > 0 && error.name === "QuotaExceededError") {
        const oldestKey = accessOrder.shift(); // Remove the oldest accessed key
        localStorage.removeItem(oldestKey); // Remove the oldest item
        localStorage.setItem("accessOrder", JSON.stringify(accessOrder)); // Update the access order in storage

        try {
          localStorage.setItem(key, value); // Try to save again
          updateAccessOrder(key); // Update access order upon successful save
          error = null; // Clear error if save is successful
        } catch (e) {
          error = e; // Update error if still failing
        }
      }

      if (error) {
        console.error("Unable to free up enough space in localStorage.");
      }
    } else {
      // Handle other errors
      console.error("Error saving to localStorage:", error);
    }
  }
}

async function getONSids(surname, location) {
  setNewTitle();
  let cacheKey = `ONTids_${surname}`;
  if (location) {
    cacheKey += `_${location}`;
  }
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    console.log("Returning cached data for ONTids from localStorage");
    $("#refreshData").show();
    return JSON.parse(cachedData);
  }

  // Fetch all variants for the surname
  let locationBit = "";
  if (location) {
    locationBit = `Location%3D"${location.trim().replace(/,/, "%2C").replace(" ", "+")}"+`;
  }
  const surnameVariants = findSurnameVariants(surname);
  let query = `${locationBit}LastNameatBirth%3D"${surname}"+OR+${locationBit}CurrentLastName%3D"${surname}"+OR+${locationBit}LastNameOther%3D"${surname}"`;
  if (surnameVariants.length != 0) {
    // Construct the query part for each variant
    query = surnameVariants
      .map(
        (variant) =>
          `${locationBit}LastNameatBirth%3D"${variant}"+OR+${locationBit}CurrentLastName%3D"${variant}"+OR+${locationBit}LastNameOther%3D"${variant}"`
      )
      .join("+OR+");
  }

  const url = `https://plus.wikitree.com/function/WTWebProfileSearch/Profiles.json?Query=${query}&MaxProfiles=100000&Format=JSON`;
  console.log(url);
  const response = await fetch(url);
  const data = await response.json();

  // After fetching data, instead of directly using localStorage.setItem, use saveWithLRUStrategy
  try {
    const dataString = JSON.stringify(data); // Ensure data is serialized before saving
    saveWithLRUStrategy(cacheKey, dataString);
    console.log("Data saved with LRU strategy");
  } catch (error) {
    console.error("Error saving data with LRU strategy:", error);
  }

  //localStorage.setItem(cacheKey, JSON.stringify(data));

  console.log(data);
  return data;
}
async function getPeople(ids, options = {}) {
  const ancestors = options.ancestors || 0;
  const descendants = options.descendants || 0;
  const fields = [
    "BirthDate",
    "BirthDateDecade",
    "BirthLocation",
    "Categories",
    "Created",
    "DataStatus",
    "DeathDate",
    "DeathDateDecade",
    "DeathLocation",
    "Derived.BirthName",
    "Derived.BirthNamePrivate",
    "Derived.LongName",
    "Derived.LongNamePrivate",
    "Father",
    "FirstName",
    "Gender",
    "Id",
    //"IsLiving",
    "LastNameAtBirth",
    "LastNameCurrent",
    "LastNameOther",
    "Manager",
    "Managers",
    "MiddleName",
    "Mother",
    "Name",
    "Nicknames",
    "NoChildren",
    "Prefix",
    //"Privacy",
    "RealName",
    "ShortName",
    "Spouses",
    "Suffix",
    "Touched",
    "Templates",
  ];
  try {
    const [status, resultByKey, people] = await WikiTreeAPI.getPeople("ONS", ids, fields, {
      ancestors: ancestors,
      descendants: descendants,
    });
    return people;
  } catch (error) {
    console.error("Error in getPeople:", error);
    return []; // Return an empty array in case of error
  }
}

async function processBatches(ids, surname) {
  const userId = Cookies.get("wikidb_wtb_UserID") || Cookies.get("loggedInID");
  console.log(userId);

  if (!ids) {
    $("#results").html("<p id='noResults'>No results found.</p>");
    return;
  }
  showLoadingBar();
  let processed = 0;
  let total = ids.length;
  let extendedTotal = total * 1.2;

  let missingParents = [];

  for (let i = 0; i < ids.length; i += 1000) {
    const batchIds = ids.slice(i, i + 1000);
    const people = await getPeople(batchIds);
    // Combine the 'people' object with 'combinedResults'
    if (people && typeof people === "object") {
      Object.assign(combinedResults, people);
    }

    // Update progress
    processed += 1000;
    let percentage = (processed / total) * 100;
    updateLoadingBar(percentage);
    console.log("processed: ", processed);
  }

  if (userId) {
    // Find Father and Mother ids that are missing from the combined results
    Object.values(combinedResults).forEach((person) => {
      // if (person?.BirthDate.replace(/-/,"") > 19000000) OK?
      if (person?.BirthDateDecade?.replace(/s/, "") > 1890) {
        if (
          person?.Father > 0 &&
          !combinedResults[person.Father] &&
          person.Managers.some((manager) => manager.Id === userId)
        ) {
          missingParents.push(person.Father);
        }
        if (
          person?.Mother > 0 &&
          !combinedResults[person.Mother] &&
          person?.Managers?.some((manager) => manager.Id === userId)
        ) {
          missingParents.push(person.Mother);
        }
      }
    });
  }
  // If missing parents were found, fetch them and add them to the combined results
  console.log("Missing parents count:", missingParents.length);
  console.log(missingParents);

  // After initial batch processing, reset the loading bar for missing parents
  hideLoadingBar(); // Hide first to reset
  showLoadingBar();
  let processedParents = 0;
  let totalParents = missingParents.length;

  if (missingParents.length > 0) {
    // process in batches
    for (let i = 0; i < missingParents.length; i += 100) {
      const batchIds = missingParents.slice(i, i + 100);
      const people = await getPeople(batchIds, {
        ancestors: 1,
        descendants: 1,
      });
      // Combine the 'people' object with 'combinedResults'
      if (people && typeof people === "object") {
        Object.assign(combinedResults, people);
      }

      // Update the loading bar for missing parents
      processedParents += i + 100 > missingParents.length ? missingParents.length - i : 100;
      let percentage = (processedParents / totalParents) * 100;
      updateLoadingBar(percentage);
    }
  }

  // Hide the loading bar after completing the missing parents
  hideLoadingBar();

  console.log("Fetched profiles count:", Object.keys(combinedResults).length);

  // Now 'combinedResults' contains the combined data from all batches
  console.log(combinedResults);
  /* If the surname is not LNAB, LNC, or LNO, filter out */
  let filteredResults = {};
  // Get all variants for the surname
  const surnameVariants = findSurnameVariants(surname);
  if (surnameVariants.length == 0) {
    // If no variants are found, use the surname as-is
    surnameVariants.push(surname);
  }

  // Filter the results to include only those that match one of the surname variants
  /*
  Object.values(combinedResults).forEach((person) => {
    if (
      surnameVariants.includes(person.LastNameAtBirth) ||
      surnameVariants.includes(person.LastNameCurrent) ||
      surnameVariants.includes(person.LastNameOther)
    ) {
      filteredResults[person.Id] = person;
    }
  });
  */

  Object.values(combinedResults).forEach((person) => {
    // Standardize the person's surnames for comparison
    const standardizedLastNameAtBirth = standardizeString(person?.LastNameAtBirth) || "";
    const standardizedLastNameCurrent = standardizeString(person?.LastNameCurrent) || "";
    const standardizedLastNameOther = standardizeString(person?.LastNameOther) || "";

    // Check if any standardized surname variants include the standardized person's surnames
    const isMatch = surnameVariants.some(
      (variant) =>
        standardizeString(variant) === standardizedLastNameAtBirth ||
        standardizeString(variant) === standardizedLastNameCurrent ||
        standardizeString(variant) === standardizedLastNameOther
    );

    if (isMatch) {
      filteredResults[person.Id] = person;
    }
  });

  // After batch processing, update the progress bar for additional steps
  processed = ids.length;
  updateLoadingBar((processed / extendedTotal) * 100);

  // Sort and map children to parents
  let sortedPeople = sortPeopleByBirthDate(filteredResults);
  let parentToChildrenMap = createParentToChildrenMap(sortedPeople);
  peopleById = createPeopleByIdMap(sortedPeople);

  // Update progress bar after sorting and mapping
  processed += (extendedTotal - total) * 0.5; // Assuming these take about half of the remaining 20%
  updateLoadingBar((processed / extendedTotal) * 100);

  displayDescendantsTree(peopleById, parentToChildrenMap);

  // Update progress bar to complete
  updateLoadingBar(100);

  // After processing is complete
  hideLoadingBar();

  $("#downloadData").show();

  return;
}

function findRootIndividuals(parentToChildrenMap, peopleById) {
  let childIds = new Set();
  Object.values(parentToChildrenMap).forEach((children) => {
    children.forEach((childId) => childIds.add(childId));
  });

  let rootIndividuals = Object.keys(peopleById).filter((id) => !childIds.has(id));
  return rootIndividuals;
}

function displayDates(person) {
  let birthDate = person.BirthDate || person.BirthDateDecade || "";
  birthDate = birthDate.replace(/-.*/g, "");
  if (birthDate == "0000" || birthDate == "unknown") {
    birthDate = "";
  }
  let deathDate = person.DeathDate || person.DeathDateDecade || "";
  deathDate = deathDate.replace(/-.*/g, "");
  if (deathDate == "0000" || deathDate == "unknown") {
    deathDate = "";
  }
  return `(${birthDate}–${deathDate})`;
}

function personHtml(person, level = 0) {
  const personIdStr = String(person.Id);

  if (!person || displayedIndividuals.has(personIdStr)) {
    return ""; // Skip if undefined or already displayed
  }

  let descendantsCount = "";
  if (parentToChildrenMap[person.Id] && parentToChildrenMap[person.Id].length > 0) {
    const count = countDescendants(person.Id, parentToChildrenMap);
    descendantsCount = ` <span class="descendantsCount" title="${count} descendants">[${count}]</span>`;
    if (count == 0) {
      descendantsCount = "";
    }
  }

  displayedIndividuals.add(personIdStr); // Mark as displayed

  const aName = new PersonName(person);
  const fullName = aName.withParts(["FullName"]);

  if (!fullName) {
    console.log("No name found for person:", person);
    return ""; // Skip if no name found
  }

  let toggleButton = "";
  if (parentToChildrenMap[person.Id] && parentToChildrenMap[person.Id].length > 0) {
    toggleButton = `<button class='toggle-children' data-parent-id='${person.Id}'>−</button> `;
  }
  let gender = person.Gender;
  if (person?.DataStatus?.Gender === "blank" || !gender) {
    gender = "blank";
  }

  const categoryHTML = createCategoryHTML(person);
  const dates = displayDates(person);

  let html = `<li class='level_${level} person' data-id='${personIdStr}' data-name='${person.Name}' data-father='${
    person?.Father
  }' data-mother='${
    person?.Mother
  }' data-gender='${gender}' data-full-name='${fullName}' data-dates='${dates}'> ${toggleButton}<a href="https://www.wikitree.com/wiki/${
    person.Name
  }" target="_blank">${fullName}</a> <span class="wtid">(${
    person.Name || ""
  })</span> <span class='dates'>${dates}</span> ${categoryHTML} ${descendantsCount}`;

  // Add Spouses
  html += displaySpouses(person, level);

  html += "</li>";
  return html;
}

function showAncestralLineToRoot(element) {
  let ancestralLine = [];
  let thisElement = element.closest("li.person");
  while (thisElement.length) {
    let personData = {
      id: thisElement.data("id"),
      fullName: thisElement.data("full-name"),
      dates: thisElement.data("dates"),
      wtid: thisElement.data("wtid"),
      isTarget: ancestralLine.length === 0, // Mark the first element as the target
    };
    ancestralLine.push(personData);
    thisElement = thisElement.parents("li.person").first(); // Move up to the next ancestor
  }

  ancestralLine.reverse();
  let ancestralLineHtml = ancestralLine
    .map(
      (ancestor, index) =>
        `<div class='ancestor person ${ancestor.isTarget ? "highlighted" : ""}' data-id='${ancestor.id}' data-name='${
          ancestor.fullName
        }' data-wtid='${ancestor.wtid}'>
        ${ancestor.fullName} <span class='dates'>${ancestor.dates}</span> <span class='wtid'>(${ancestor.wtid})</span>
      </div>`
    )
    .join("");

  const ancestralPopup = $("<div id='ancestralLinePopup'></div>").html(ancestralLineHtml);
  $("body").append(ancestralPopup);
  ancestralPopup
    .css({
      top: element.offset().top + element.height() + 5,
      left: element.offset().left,
      position: "absolute",
      backgroundColor: "#fff",
      border: "1px solid #ddd",
      padding: "10px",
      borderRadius: "5px",
      boxShadow: "0 2px 4px rgba(0,0,0,.2)",
    })
    .show();

  ancestralPopup.find(".ancestor").click(function () {
    handleSearch($(this).data("wtid"));
  });
}

function createCategoryHTML(person) {
  let categoryHTML = ``;
  if (person.Categories && person.Categories.length > 0) {
    // Process Name Studies separately due to its unique handling
    categoryHTML += processNameStudies(person);

    // Process each category mapping
    categoryMappings.forEach(({ pattern, symbol, not }) => {
      categoryHTML += processCategories(person, pattern, symbol, { not });
    });
  }
  return categoryHTML;
}

function addCategoryKeyToHelp() {
  let categoryKey = `<div id='categoryKey'><h3>Category and Sticker Key</h3>`;
  categoryMappings.forEach(({ pattern, symbol, not }) => {
    categoryKey += `<div class='categoryKeyItem'><span class="symbol">${symbol}</span> <span>${pattern.source.replace(
      /[\/()]/g,
      ""
    )}</span></div>`;
  });
  categoryKey += `</div>`;
  $("#help").append(categoryKey);
}

function processNameStudies(person) {
  let html = "";
  const nameStudies = person.Categories.filter((category) => category.match(/Name_Study/));
  if (nameStudies.length > 0) {
    const nameStudiesDone = [];
    const thisSurnameVariants = findSurnameVariants($("#surname").val());
    nameStudies.forEach((nameStudy) => {
      const linkEndMatch = nameStudy.match(/[^,_]+_Name_Study/);
      if (linkEndMatch) {
        const linkEnd = linkEndMatch[0];
        const isThisStudy = thisSurnameVariants.includes(linkEnd.replace(/^.*,_/, "").replace(/_Name_Study/, ""));
        const link = `Space:${linkEnd}`;
        if (!nameStudiesDone.includes(linkEnd)) {
          nameStudiesDone.push(linkEnd);
          html += createCategoryLink(link, nameStudy, "&#x1F4DB;", isThisStudy ? { class: "thisNameStudy" } : {});
        }
      }
    });
  }
  return html;
}

const shownCats = new Set();
function processCategories(person, pattern, symbol, options = {}) {
  // Extract the 'name' values from person.Templates
  const templateNames = person.Templates.map((template) => template.name);

  // Combine person.Categories and templateNames into a single array
  const categoriesAndTemplates = person.Categories.concat(templateNames);

  if (categoriesAndTemplates.length > 2 && !shownCats.has(person.Id)) {
    console.log(categoriesAndTemplates);
    shownCats.add(person.Id);
  }

  return categoriesAndTemplates
    .filter((category) => {
      // Check if pattern matches the category or template name
      const matchesPattern = pattern?.test(category);

      // Ensure options.not is a RegExp before calling test on it
      const isExcluded = options?.not instanceof RegExp ? options.not.test(category) : false;

      // Include category if it matches pattern and does not match exclusion pattern
      return matchesPattern && !isExcluded;
    })
    .map((category) => {
      // Check if the category is actually a template (sticker) by seeing if it was originally in person.Templates
      const isSticker = templateNames.includes(category);
      // If it's a sticker, return without a link. Otherwise, return with a link.
      if (isSticker) {
        // For stickers, simply return the symbol or some representation without a link
        return `<span class='category' title='${category}'>${symbol}</span>`;
      } else {
        // Categories continue to have links
        return createCategoryLink(`Category:${category}`, category, symbol);
      }
    })
    .join("");
}

function createCategoryLink(link, category, symbol, options = {}) {
  const theClass = options.class ? ` ${options.class}` : "";
  return `<a href='https://www.wikitree.com/wiki/${link}' target='_blank' class='category${theClass}' title='${category}' data-category='${category}'>${symbol}</a>`;
}

function showMoreDetails(datesElement, showOrHide = "toggle") {
  let Id;
  if (datesElement.parent().hasClass("person")) {
    Id = datesElement.parent().data("id");
  } else {
    Id = datesElement.closest("li").data("id");
  }
  if ($(`div.details[data-id='${Id}']`).length > 0) {
    if (showOrHide == "show") {
      $(`div.details[data-id='${Id}']`).show();
    } else if (showOrHide == "hide") {
      $(`div.details[data-id='${Id}']`).hide();
    } else {
      $(`div.details[data-id='${Id}']`).toggle();
    }
    return;
  }

  const person = combinedResults[Id];

  const { birth, death } = formatBirthDeathDetails(person);

  const detailsHtml = $(`
  <div class='details' data-id='${Id}'>
    <div class='row'>${birth}</div>
    <div class='row'>${death}</div>
  </div>`);

  datesElement.after(detailsHtml);
}

function getDateStatus(person, event, length = "abbr") {
  let status = "";
  if (event === "birth") {
    status = person?.DataStatus?.BirthDate;
  } else if (event === "death") {
    status = person?.DataStatus?.DeathDate;
  }
  if (length == "abbr") {
    if (status == "guess") {
      return "abt.";
    } else if (status == "before") {
      return "bef.";
    } else if (status == "after") {
      return "aft.";
    }
  } else {
    if (status == "guess") {
      return "about";
    } else if (status == "before") {
      return "before";
    } else if (status == "after") {
      return "after";
    }
  }
}

function datePreposition(person, event, length = "abbr") {
  let eventDate;
  if (event === "birth") {
    eventDate = person?.BirthDate;
  } else if (event === "death") {
    eventDate = person?.DeathDate;
  }
  const dateStatus = getDateStatus(person, "birth", length);
  const inOn = eventDate.match(/\-00$/) ? "in" : "on"; // If only a year is present, use 'in'

  let preposition = inOn;
  if (dateStatus) {
    preposition = dateStatus;
  }
  return preposition;
}

function formatBirthDeathDetails(person) {
  let birthDetails = "";
  let deathDetails = "";

  // Birth details
  if (person.BirthDate || person.BirthLocation) {
    const birthDate = person.BirthDate ? formatDate(person.BirthDate) : "";

    const preposition = datePreposition(person, "birth", "full");

    birthDetails = `<span class='birthDetails dataItem'>Born ${
      person.BirthLocation ? `in ${person.BirthLocation}` : ""
    }${birthDate ? ` ${preposition} ${birthDate}` : ""}.</span>`;
  }

  // Death details
  if ((person.DeathDate && person.DeathDate !== "0000-00-00") || person.DeathLocation) {
    const deathDate = person.DeathDate && person.DeathDate !== "0000-00-00" ? formatDate(person.DeathDate) : "";
    const preposition = datePreposition(person, "death", "full");
    deathDetails = `<span class='deathDetails dataItem'>Died ${
      person.DeathLocation ? `in ${person.DeathLocation}` : ""
    }${deathDate ? ` ${preposition} ${deathDate}` : ""}.</span>`;
  }

  return { birth: birthDetails, death: deathDetails };
}

function formatDate(date) {
  if (!date || date === "0000-00-00") return "[date unknown]";
  let [year, month, day] = date.split("-");
  month = parseInt(month, 10);
  day = parseInt(day, 10);
  let formattedDate = `${year}`;
  if (month > 0) formattedDate = `${monthName[month]} ` + formattedDate;
  if (day > 0) formattedDate = `${day} ` + formattedDate;
  return formattedDate;
}

function displaySpouses(person, level) {
  if (!person.Spouses || !Array.isArray(person.Spouses)) {
    return ""; // Return empty if no spouses
  }

  // Collecting all spouse data
  let spousesData = person.Spouses.map((spouse) => {
    if (combinedResults[spouse.Id]) {
      let spouseInfo = combinedResults[spouse.Id];
      let married = spouse.MarriageDate || "";
      let marriageDate = married.replace(/-/g, "");
      // Normalize the date for sorting
      if (marriageDate.match(/^\d{4}$/)) {
        marriageDate += "0000"; // Append for year-only dates
      }
      return { spouseInfo, married, marriageDate };
    }
  }).filter((spouse) => spouse); // Filter out undefined entries

  // Sorting spouses by MarriageDate
  spousesData.sort((a, b) => a.marriageDate.localeCompare(b.marriageDate));

  // Generating HTML for sorted spouses
  let spouseHtml = "";
  spousesData.forEach(({ spouseInfo, married, marriageDate }) => {
    const spouseIdStr = String(spouseInfo.Id);
    if (!displayedSpouses.has(spouseIdStr) && !displayedIndividuals.has(spouseIdStr)) {
      displayedSpouses.add(spouseIdStr);
      displayedIndividuals.add(spouseIdStr);

      let gender = spouseInfo.Gender;
      if (!gender || spouseInfo?.DataStatus?.Gender === "blank") {
        gender = "blank";
      }

      const spouseName = new PersonName(spouseInfo).withParts(["FullName"]);
      if (married && married !== "0000-00-00") {
        married = ` (Married: ${married})`;
      } else {
        married = "";
      }

      spouseHtml += `<span class='spouse person' data-name='${spouseInfo.Name}' data-id='${
        spouseInfo.Id
      }' data-gender='${gender}' data-marriage-date='${marriageDate}'>m. <a href="https://www.wikitree.com/wiki/${
        spouseInfo.Name
      }" target="_blank">${spouseName}</a> <span class='wtid'>(${
        spouseInfo.Name || ""
      })</span> <span class='dates'>${displayDates(spouseInfo)}</span> ${married}</span>`;
    }
  });

  return spouseHtml;
}

function createParentToChildrenMap(peopleArray) {
  peopleArray.forEach((person) => {
    if (person.Father) {
      if (!parentToChildrenMap[person.Father]) {
        parentToChildrenMap[person.Father] = [];
      }
      parentToChildrenMap[person.Father].push(person.Id);
    }
    if (person.Mother) {
      if (!parentToChildrenMap[person.Mother]) {
        parentToChildrenMap[person.Mother] = [];
      }
      parentToChildrenMap[person.Mother].push(person.Id);
    }
  });
  return parentToChildrenMap;
}

function createPeopleByIdMap(peopleArray) {
  let map = {};
  peopleArray.forEach((person) => {
    map[person.Id] = person;
  });
  return map;
}

function naturalSort(a, b) {
  let ax = [],
    bx = [];

  a.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
    ax.push([$1 || Infinity, $2 || ""]);
  });
  b.replace(/(\d+)|(\D+)/g, function (_, $1, $2) {
    bx.push([$1 || Infinity, $2 || ""]);
  });

  while (ax.length && bx.length) {
    let an = ax.shift();
    let bn = bx.shift();
    let nn = an[0] - bn[0] || an[1].localeCompare(bn[1]);
    if (nn) return nn;
  }

  return ax.length - bx.length;
}

function createSelectBoxes() {
  createWTIDSelectBox();
  createNameSelectBox();
}

function createWTIDSelectBox() {
  $("#wtidGo").off().remove();
  let selectBox = $(`<select id='wtidGo'>`);
  // Add a title dummy option
  selectBox.append(`<option value=''>WT ID</option>`);
  // Get all of the Names (WT IDs) from the array of displayed people, sort them, and add them to the select box
  // displayedIndividuals has the IDs.  We need to get the Names from combinedResults.
  let names = [];
  for (let id of displayedIndividuals) {
    names.push(combinedResults[id].Name);
  }
  names.sort(naturalSort);

  // Filter out "undefined".
  names = names.filter((name) => name);
  for (let name of names) {
    selectBox.append(`<option value='${name}'>${name}</option>`);
  }
  // Add this to #controls (before #helpButton) and set it to work like the search input.
  // This is to replace the searchInput.
  selectBox.insertBefore($("#toggleDetails"));
  selectBox.change(function () {
    if (this.value) {
      handleSearch(this.value);
    }
  });
}

function createNameSelectBox() {
  $("#nameSelect").off().remove();
  let selectBoxName = $('<select id="nameSelect">');
  selectBoxName.append('<option value="">Person</option>');

  let individuals = [];
  for (let id of displayedIndividuals) {
    if (combinedResults[id] && combinedResults[id].LastNameAtBirth) {
      let person = combinedResults[id];
      let dates = displayDates(person); // Using displayDates function
      individuals.push({
        id: id,
        name: `${person.LastNameAtBirth}, ${person.FirstName || person.RealName} ${person.MiddleName || ""}`.trim(),
        wtid: person.Name,
        dates: dates,
      });
    }
  }

  // Sorting by name and then by dates for better organization
  individuals.sort((a, b) => {
    let nameComparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    if (nameComparison !== 0) return nameComparison;
    return a.dates.localeCompare(b.dates);
  });

  individuals.forEach((individual) => {
    selectBoxName.append(`<option value='${individual.wtid}'>${individual.name} ${individual.dates}</option>`);
  });

  selectBoxName.insertBefore($("#toggleDetails"));
  selectBoxName.change(function () {
    if (this.value) {
      handleSearch(this.value);
    }
  });
}

async function preprocessDescendantsTree(peopleById, parentToChildrenMap) {
  let surnameVariants = findSurnameVariants($("#surname").val()); // Get surname variants for the name study

  // Iterate over each person and adjust root individuals
  Object.values(peopleById).forEach((person) => {
    if (
      person.Gender === "Female" &&
      person.Spouses &&
      typeof person.Spouses === "object" &&
      Object.keys(person.Spouses).length > 0
    ) {
      Object.keys(person.Spouses).forEach((spouseId) => {
        let spouse = peopleById[spouseId];
        if (spouse && surnameVariants.includes(spouse.LastNameAtBirth)) {
          // Mark the husband as a root individual if his LNAB matches a surname variant
          spouse.isRoot = true;
          person.isRoot = false; // The wife is not a root individual as she married into the name
        }
      });
    }
  });
}

async function displayDescendantsTree(peopleById, parentToChildrenMap) {
  console.log("Displaying descendants tree");

  // Call the preprocessing function
  await preprocessDescendantsTree(peopleById, parentToChildrenMap);

  let totalIndividuals = Object.keys(peopleById).length;
  let processedIndividuals = 0;

  let rootIndividualsIds = findRootIndividuals(parentToChildrenMap, peopleById);
  let rootIndividuals = rootIndividualsIds
    .map((id) => peopleById[id])
    .filter((root) => !displayedIndividuals.has(String(root.Id)) && root.shouldBeRoot !== false)
    .sort((a, b) => getComparableDate(a).localeCompare(getComparableDate(b)));

  rootIndividuals = adjustSortingForDeathDates(rootIndividuals);

  console.log("Root individuals:", rootIndividuals);

  let resultsContainer = $("section#results");
  resultsContainer.hide().empty();
  let ulElement = $("<ul>");
  resultsContainer.append(ulElement);

  showLoadingBar();

  const batchSize = 50;

  for (let i = 0; i < rootIndividuals.length; i += batchSize) {
    let batch = rootIndividuals.slice(i, i + batchSize);

    for (let root of batch) {
      let rootIdStr = String(root.Id);
      if (!displayedIndividuals.has(rootIdStr)) {
        let liElement = $(personHtml(root, 0));
        ulElement.append(liElement);
        liElement.append(displayChildren(parentToChildrenMap, root.Id, peopleById, 1));
      }
    }

    processedIndividuals += batch.length;
    let percentage = (processedIndividuals / totalIndividuals) * 100;
    updateLoadingBar(percentage);

    // Yield control back to the browser to update UI
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  await arrangeTreeElements();
  setupToggleButtons();

  resultsContainer.fadeIn();

  $("#searchContainer,#toggleDetails,#toggleWTIDs,#toggleGeneralStats,#tableViewButton").show();
  createSelectBoxes();
  showStatistics();

  hideLoadingBar();
  shakingTree.hide();
}

async function arrangeTreeElements() {
  const allChildrenElements = $("ul.children");
  const totalElements = allChildrenElements.length;
  let processedElements = 0;

  for (const childrenElement of allChildrenElements) {
    const thisParent = $(childrenElement).data("parent-id");
    $("li.person[data-id='" + thisParent + "']").append($(childrenElement));

    processedElements++;
    let percentage = (processedElements / totalElements) * 100;
    updateLoadingBar(percentage);

    // Yield control back to the browser
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function arrangeParentChildRelationship(father, mother, element) {
  const fatherElement = $("li.person[data-id='" + father + "']");
  const motherElement = $("li.person[data-id='" + mother + "']");
  if (fatherElement.length > 0) {
    if (fatherElement.find("ul.children").length === 0) {
      fatherElement.append(`<ul class='children' data-parent-id='${fatherElement.attr("data-id")}'></ul>`);
    } else {
      fatherElement.find("ul.children").first().append(element);
    }
  } else if (motherElement.length > 0) {
    if (motherElement.find("ul.children").length === 0) {
      motherElement.append(`<ul class='children' data-parent-id='${motherElement.attr("data-id")}'></ul>`);
    } else {
      motherElement.find("ul.children").first().append(element);
    }
  }
}

// displayChildren function remains the same as in the previous example

function displayChildren(parentToChildrenMap, parentId, peopleById, level) {
  let html = "";
  if (parentToChildrenMap[parentId]) {
    // Sort the children of the current parent
    let sortedChildren = parentToChildrenMap[parentId]
      .map((childId) => peopleById[childId])
      .filter((child) => !displayedIndividuals.has(child.Id)) // Filter out already displayed
      .sort((a, b) => getComparableDate(a).localeCompare(getComparableDate(b)));

    html += `<ul class='children' data-parent-id='${parentId}'>`;
    sortedChildren.forEach((child) => {
      html += personHtml(child, level); // Use personHtml for each child
      // Recursively display children of this child, sorted
      html += displayChildren(parentToChildrenMap, child.Id, peopleById, level + 1);
    });
    html += "</ul>";
  }
  return html;
}

function sortPeopleByBirthDate(peopleObject) {
  let peopleArray = Object.values(peopleObject);

  // Primary Sorting
  peopleArray.sort((a, b) => {
    let dateA = getComparableDate(a, "BirthDate");
    let dateB = getComparableDate(b, "BirthDate");
    return dateA.localeCompare(dateB);
  });

  // Secondary Sorting (Adjustment)
  for (let i = 0; i < peopleArray.length; i++) {
    if (peopleArray[i].BirthDate === "0000-00-00" && peopleArray[i].BirthDateDecade === "") {
      // This individual is sorted by DeathDate
      let deathDate = getComparableDate(peopleArray[i], "DeathDate");
      if (deathDate !== "9999-12-31") {
        // Check if DeathDate is valid
        for (let j = i + 1; j < peopleArray.length; j++) {
          if (getComparableDate(peopleArray[j], "BirthDate") > deathDate) {
            // Move the individual with only DeathDate to a position before the first individual with a later BirthDate
            peopleArray.splice(j, 0, peopleArray.splice(i, 1)[0]);
            break;
          }
        }
      }
    }
  }

  // Adjust positions of parents without dates
  peopleArray.forEach((person, index) => {
    if (!isValidDate(person.BirthDate) && parentToChildrenMap[person.Id]) {
      let earliestChildDate = findEarliestChildDate(parentToChildrenMap[person.Id], peopleById);
      if (earliestChildDate !== "9999-12-31") {
        // Move the parent before the earliest child
        for (let j = 0; j < peopleArray.length; j++) {
          if (getComparableDate(peopleArray[j], "BirthDate") > earliestChildDate || !peopleArray[j]?.BirthDate) {
            peopleArray.splice(j, 0, peopleArray.splice(index, 1)[0]);
            break;
          }
        }
      }
    }
  });

  return peopleArray;
}

function findEarliestChildDate(childIds, peopleById) {
  return (
    childIds
      .map((childId) => getComparableDate(peopleById[childId], "BirthDate"))
      .sort()
      .shift() || "9999-12-31"
  );
}

function getComparableDate(person, primaryDateType = "BirthDate") {
  // If both BirthDate and DeathDate are unknown, set the lowest priority
  if (
    (person.BirthDate === "0000-00-00" || person.BirthDate === "unknown" || !person.BirthDate) &&
    person.BirthDateDecade === "unknown" &&
    (person.DeathDate === "0000-00-00" || person.DeathDate === "unknown" || !person.DeathDate) &&
    person.DeathDateDecade === "unknown"
  ) {
    return "9999-12-31";
  }

  // Handle DeathDate when BirthDate is unavailable or invalid
  if ((person.BirthDate === "0000-00-00" || person.BirthDateDecade === "unknown") && person.DeathDate) {
    // Convert year-only DeathDates to mid-year (July 2nd)
    if (person.DeathDate.match(/^\d{4}-00-00$/)) {
      return person.DeathDate.substring(0, 4) + "-07-02";
    }
    // Handle valid full DeathDates
    else if (isValidDate(person.DeathDate)) {
      return person.DeathDate;
    }
    // Handle decade DeathDates
    else if (person.DeathDateDecade && person.DeathDateDecade.match(/^\d{4}s$/)) {
      return transformDecadeToDate(person.DeathDateDecade);
    }
  }

  // Handle valid BirthDates
  if (isValidDate(person.BirthDate)) {
    return person.BirthDate;
  }

  // Convert year-only BirthDates to mid-year (July 2nd)
  if (person.BirthDate && person.BirthDate.match(/^\d{4}-00-00$/)) {
    return convertYearOnlyDate(person.BirthDate);
  }

  // Handle decades (e.g., "1950s") - mid-point of the decade
  if (person.BirthDateDecade && person.BirthDateDecade.match(/^\d{4}s$/)) {
    return transformDecadeToDate(person.BirthDateDecade);
  }

  // Use DeathDate as a fallback for sorting if BirthDate is invalid
  if (isValidDate(person.DeathDate)) {
    return convertYearOnlyDate(person.DeathDate);
  }
  if (person.DeathDateDecade && person.DeathDateDecade.match(/^\d{4}s$/)) {
    return transformDecadeToDate(person.DeathDateDecade);
  }

  // Default for unknown or invalid dates
  return "9999-12-31";
}

function convertYearOnlyDate(dateString) {
  // Convert year-only dates (e.g., "1565-00-00") to mid-year (July 2nd)
  if (dateString.match(/^\d{4}-00-00$/)) {
    return dateString.substring(0, 4) + "-07-02";
  }
  return dateString;
}

function isValidDate(dateString) {
  // Check for valid dates, excluding placeholders and dates with '00' for month or day
  return dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !dateString.includes("-00");
}

function transformDecadeToDate(decade) {
  // Transform "1950s" to "1955-07-02" for comparison
  return decade ? decade.replace(/0s$/, "5") + "-01-01" : "9999-12-31";
}

function adjustSortingForDeathDates(sortedPeople) {
  let adjustedList = [];
  let onlyDeathDateIndividuals = [];

  // Separate individuals with only death dates
  sortedPeople.forEach((person) => {
    if (isValidDate(person.DeathDate) && !isValidDate(person.BirthDate) && person.BirthDateDecade === "") {
      onlyDeathDateIndividuals.push(person);
    } else {
      adjustedList.push(person);
    }
  });

  // Sort only-death-date individuals by their death dates
  onlyDeathDateIndividuals.sort((a, b) => a.DeathDate.localeCompare(b.DeathDate));

  // Insert them into the main list at appropriate positions
  onlyDeathDateIndividuals.forEach((deceased) => {
    let inserted = false;
    for (let i = 0; i < adjustedList.length; i++) {
      if (isValidDate(adjustedList[i].BirthDate) && deceased.DeathDate < adjustedList[i].BirthDate) {
        adjustedList.splice(i, 0, deceased);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      adjustedList.push(deceased);
    }
  });

  return adjustedList;
}

const colours = [
  "forestgreen",
  "#F5A9A9",
  "#D0F5A9",
  "#A9F5F2",
  "#D0A9F5",
  "#F2F5A9",
  "#F78181",
  "#BEF781",
  "#81F7F3",
  "#BE81F7",
  "#F3F781",
  "#FA5858",
  "#ACFA58",
  "#58FAF4",
  "#AC58FA",
  "#F4FA58",
  "#FE2E2E",
  "#9AFE2E",
  "#2EFEF7",
  "#9A2EFE",
  "#F7FE2E",
  "#FF0000",
  "#00FFFF",
  "#80FF00",
  "#8000FF",
  "#FFFF00",
  "#DF0101",
  "#74DF00",
  "#01DFD7",
  "#7401DF",
  "#D7DF01",
  "#B40404",
  "#5FB404",
  "#04B4AE",
  "#5F04B4",
  "#AEB404",
  "#8A0808",
  "#243B0B",
  "#088A85",
  "#4B088A",
  "#868A08",
];

function generateCSSForNestedLists() {
  let styleRules = "";

  for (let i = 0; i < colours.length; i++) {
    // Generating the selector for each level
    let selector = "ul " + "ul ".repeat(i);

    // Generating the CSS rule for each level
    styleRules += `${selector} { border-left: 2px solid ${colours[i]}; }\n`;
  }

  return styleRules;
}

function addStylesToHead() {
  const styleElement = document.createElement("style");
  styleElement.appendChild(document.createTextNode(generateCSSForNestedLists()));
  document.head.appendChild(styleElement);
}

function setupToggleButtons() {
  // Remove previous click handlers to avoid duplicate bindings
  $(document).off("click.showAll").off("click.toggle-children").off("click.hideAll");

  $(".toggle-children").each(function () {
    const person = $(this).parent();
    if (person.find("> ul.children li").length === 0) {
      $(this).remove();
      person.find("> ul.children").remove();
      const personId = person.data("id");
      const child = $("li.person[data-father='" + personId + "'],li.person[data-mother='" + personId + "']").first();
      if (child.length > 0) {
        const childsParent = child.parent().closest("li.person");
        const personsHtml = person.html();
        let gender = person.data("gender");
        const notSpouseSpan = $(
          `<span data-id='${personId}' data-gender='${gender}' class='not-spouse spouse'> ${personsHtml}</span>`
        );
        if (childsParent.children(`span.not-spouse[data-id='${personId}']`).length == 0) {
          notSpouseSpan.insertBefore(childsParent.find("> ul.children").first());
        }
        person.remove();
      }
    }
  });

  $(document).on("click.toggle-children", ".toggle-children", function () {
    const parentId = $(this).data("parent-id");
    $(`li.person[data-id='${parentId}']`).find("> ul.children").toggle();

    // Change the button text (+/-)
    $(this).text($(this).text() === "−" ? "+" : "−");
  });

  $(".toggle-children").trigger("click");
  $(".toggleAll").show();

  $(document).on("click.showAll", "#showAll", function () {
    $(".toggle-children").text("−");
    $("ul.children").slideDown();
  });

  $(document).on("click.hideAll", "#hideAll", function () {
    $(".toggle-children").text("+");
    $("ul.children").slideUp();
  });

  hideLoadingBar();
}

function downloadResults(data, htmlContent, filename = "data.json") {
  const storageObject = {
    data: data,
    html: htmlContent,
  };
  const blob = new Blob([JSON.stringify(storageObject, null, 2)], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

function login() {
  let searchParams = new URLSearchParams(window.location.search);
  let authCode = searchParams.get("authcode");
  if (searchParams.has("authcode")) {
    $.ajax({
      url: "https://api.wikitree.com/api.php",
      crossDomain: true,
      xhrFields: { withCredentials: true },
      type: "POST",
      data: { action: "clientLogin", authcode: authCode },
      dataType: "json",
      success: function (data) {
        if (data.clientLogin.result == "Success") {
          Cookies.set("loggedInID", data.clientLogin.userid);
          Cookies.set("loggedInName", data.clientLogin.username);
          Cookies.set("authCode", authCode);
          window.location = window.location.href.split("?authcode=")[0];
        }
      },
    });
  } else if (Cookies.get("loggedInID") != undefined) {
    if (Cookies.get("authCode") != undefined) {
      $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        data: { action: "clientLogin", authcode: Cookies.get("authCode") },
        dataType: "json",
        success: function (data) {
          if (data.clientLogin.result == "Success") {
            console.log("logged in");
            $("#loginForm").css("display", "none");
            if ($("body.cc7Table").length) {
              $("#wtid").val(Cookies.get("loggedInName"));
            }
            if ($("#textSearch").length && $("#loggedIn").length == 0) {
              $("<span id='loggedIn'>Logged in as " + Cookies.get("loggedInName") + "</span>").insertBefore(
                $("#loginForm")
              );
            }
          }
        },
      });
    }
  }
}

function triggerError() {
  const errorMessage = $("div.error");
  errorMessage.addClass("shake");

  // Optional: Remove the class after the animation ends
  errorMessage.on("animationend", function () {
    errorMessage.removeClass("shake");
  });
}

function setNewTitle() {
  const newTitle = "One Name Trees: " + $("#surname").val();
  $("h1").text(newTitle);
  $("title").text(newTitle);
}

function handleSearch(searchId) {
  if (!searchId) {
    alert("Please enter a WikiTree ID.");
    return;
  }

  const foundElement = $(`li.person[data-name='${searchId}'],span.person[data-name='${searchId}']`);
  if (foundElement.length === 0) {
    alert("No match found for the entered WikiTree ID.");
    return;
  }

  // Highlight the found element
  $(".person").removeClass("highlight");
  foundElement.addClass("highlight");

  // Collapse all lists
  $("ul.children").slideUp();
  $(".toggle-children").text("+"); // Set all toggle buttons to collapsed state

  // Expand all ancestor lists of the found element
  foundElement.parents("ul.children").slideDown();
  foundElement.parents("li.person").find("> .toggle-children").text("−"); // Set toggle buttons to expanded state for ancestor lists

  // Calculate the height of the sticky header
  const headerHeight = $("header").outerHeight(true);

  // Scroll to the found element
  setTimeout(function () {
    $("html, body").animate(
      {
        scrollTop: foundElement.offset().top - headerHeight - 10, // Subtract the header height and a bit more for padding
      },
      500
    );
  }, 500);
  // Set the value of this back to the first (header) option
  $("#wtidGo,#nameSelect").val("").trigger("change");
}

// Event listener for the search button
$("#searchButton").click(function () {
  handleSearch();
});

// Also allow searching by pressing the enter key in the search input
$("#searchInput").on("keyup", function (event) {
  if (event.keyCode === 13) {
    handleSearch();
  }
});

function reset() {
  $("div.message").remove();
  $("#toggleDetails,#toggleWTIDs").removeClass("on");
  $("#searchContainer,#toggleDetails,#toggleWTIDs,#tableViewButton").hide();
  $("#tableViewButton").removeClass("on");
  $(
    "#wideTableButton,#noResults,#statisticsContainer,#periodButtonsContainer,#tableView,#clearFilters,#tableView_wrapper,#filtersButton"
  )
    .off()
    .remove();
  $("#wtidGo,#nameSelect,.toggle-children,descendantsCount").each(
    function () {
      $(this).off();
      $(this).remove();
    } // Remove the select boxes
  );
  $("#refreshData").hide();
  displayedIndividuals = new Set();
  displayedSpouses = new Set();
  combinedResults = {};
  parentToChildrenMap = {};
}

function generateStatsHTML(stats) {
  $("#statisticsContainer li").off();
  $("#statisticsContainer").remove(); // Remove any existing statistics container

  let $statsContainer = $("<div>", { id: "statisticsContainer" });

  // Total People
  $statsContainer.append(createStatItem("Total People: ", stats.getTotalPeople()));

  // Average Lifespan
  $statsContainer.append(createStatItem("Average Lifespan: ", stats.getAverageLifespan() + " years"));

  // Average Children Per Person
  $statsContainer.append(
    createStatItem("Average Children Per Male (over 16): ", stats.getAverageChildrenPerMaleOver16(), {
      title: `This is per male over 16 because the dataset will include their children, but not those of many of the women, whose children would tend to take their father's surname (due to this being a name study, mostly based on last name at birth).`,
    })
  );

  // Average Children Per Couple
  $statsContainer.append(
    createStatItem("Average Children Per Couple: ", stats.getAverageChildrenPerCoupleForDataset(), {
      title: "Average number of children per couple for the entire dataset.",
    })
  );

  // Most Common Names
  const topMaleNames = stats.getTopNamesByGender("Male", 5);
  const topFemaleNames = stats.getTopNamesByGender("Female", 5);
  const $commonNamesDiv = generateNamesHTML(topMaleNames, topFemaleNames);
  $statsContainer.append(createStatItem("Most Common Names: ", $commonNamesDiv));

  // Most Common Locations
  const locationStats = stats.getLocationStatistics();
  const $locationDiv = generateLocationHTML(locationStats);
  $statsContainer.append(createStatItem("Most Common Birth Locations: ", $locationDiv));

  return $statsContainer;
}

function locationCountButton(key, value) {
  return `<a class="locationCount button small" data-location="${key}">${value}</a>`;
}

function generateLocationHTML(locationStats) {
  let $locationDiv = $("<div class='commonLocations'>");

  // Limit the number of countries and subdivisions displayed
  const maxCountries = 3; // Adjust as needed
  const maxSubdivisions = 3; // Adjust as needed

  let countriesSorted = Object.entries(locationStats.countryCounts)
    .sort((a, b) => b[1] - a[1])
    .filter(([country, _]) => country !== "") // Filter out empty country names
    .slice(0, maxCountries);

  countriesSorted.forEach(([country, countryCount]) => {
    const countButton = locationCountButton(country, countryCount);
    let $countryDiv = $("<div class='country'>").html(`<span class="locationPart">${country}</span> (${countButton})`);
    let subdivisions = locationStats.subdivisionCounts[country];

    if (subdivisions) {
      let subdivisionEntries = Object.entries(subdivisions)
        .filter(([key, _]) => key !== "count" && key !== "") // Filter out 'count' and empty strings
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, maxSubdivisions);
      let $subdivisionList = $("<ul class='locationSubdivision'>");

      subdivisionEntries.forEach(([subdivision, subData]) => {
        const countButton = locationCountButton(subdivision, subData.count);
        const $clickablePart = $(`<span class="locationPart">${subdivision}</span>`);
        let $subItem = $("<li>").append($clickablePart).append(` (${countButton})`);
        if (Object.keys(subData).length > 1) {
          // Check if there are nested subdivisions
          $subItem.addClass("expandable");
          /*
          $clickablePart.on("click", function () {
            $subItem.toggleClass("expanded");
            $subItem.children("ul").toggle();
          });
          */
          let $nestedList = generateNestedSubdivisionList(subData);
          $subItem.append($nestedList.hide()); // Hide nested list initially
        }
        $subdivisionList.append($subItem);
      });

      $countryDiv.append($subdivisionList);
    }

    $locationDiv.append($countryDiv);
  });

  return $locationDiv;
}

function doFilters(value, filter) {
  if ($("#periodButtonsContainer button.on").length) {
    const period = $("#periodButtonsContainer button.on").text();
    $("#birthDateFilter").val(period);
  }
  $(`#${filter}Filter`).val(value).trigger("change");
  clearFiltersButton();
}

function loadTableWithFilter(value, filter) {
  const tableViewButton = $("#tableViewButton");
  if (tableViewButton.hasClass("on") == false) {
    tableViewButton.trigger("click");
    setTimeout(function () {
      doFilters(value, filter);
      shakingTree.hide();
      $("#toggleGeneralStats").trigger("click");
    }, 1000);
  } else {
    doFilters(value, filter);
  }
}

function generateNestedSubdivisionList(subdivisionData) {
  let $nestedList = $("<ul class='nestedSubdivision'>");

  Object.entries(subdivisionData).forEach(([key, value]) => {
    if (key !== "count" && typeof value === "object") {
      // Adjusted to generate button HTML string
      const buttonHTML = locationCountButton(key, value.count); // Assuming value.count is the count you want to show
      let $nestedItem = $("<li>");

      // Creating a span with class .locationPart as the clickable part
      let $clickablePart = $(`<span class="locationPart">${key}</span>`);

      // Set the content of the list item, injecting the button HTML directly
      $nestedItem.append($clickablePart).append(` (${buttonHTML})`);

      if (Object.keys(value).length > 1) {
        // Recursively generate nested lists
        let $subNestedList = generateNestedSubdivisionList(value);
        $nestedItem.append($subNestedList.hide());
        $nestedItem.addClass("expandable");
        // Binding click event to .locationPart only

        /*
        $clickablePart.on("click", function (event) {
          event.stopPropagation(); // Correctly stops the event from bubbling up
          $nestedItem.toggleClass("expanded");
          $subNestedList.toggle();
        });
        */
      }
      $nestedList.append($nestedItem);
    }
  });
  return $nestedList;
}

function generateNamesHTML(topMaleNames, topFemaleNames) {
  const createList = (names) => {
    let $list = $("<ul class='commonNameList'>");
    names.forEach((name) => {
      $list.append($("<li>").text(`${name.name}: ${name.count}`));
    });
    return $list;
  };

  let $namesContainer = $("<div>", { id: "namesContainer" });
  $namesContainer.append(
    $("<div class='genderNameList'>").text("Male").css("font-weight", "bold").append(createList(topMaleNames))
  );
  $namesContainer.append(
    $("<div class='genderNameList'>").text("Female").css("font-weight", "bold").append(createList(topFemaleNames))
  );

  return $namesContainer;
}

function generatePeriodStatsHTML(periodStats) {
  let $statsContainer = $("<div>", { class: "period-stats-container" });

  // Total People
  $statsContainer.append(createStatItem("Total People: ", periodStats.peopleCount));

  // Average Lifespan
  $statsContainer.append(createStatItem("Average Lifespan: ", periodStats.averageAgeAtDeath + " years"));

  // Average Children Per Person
  $statsContainer.append(
    createStatItem("Average Children Per Male (over 16): ", periodStats.averageChildren, {
      title: `Average number of children for each male born in this period and thought to have reached the age of 16. This is excludes females as the dataset will not include the children of many of the women, whose children would tend to take their father's surname (due to this being a name study, mostly based on last name at birth).`,
    })
  );

  // Average Children Per Couple
  $statsContainer.append(createStatItem("Average Children Per Couple: ", periodStats.averageChildrenPerCouple));

  // Most Common Names
  const $namesDiv = generateNamesHTMLForPeriod(periodStats.names);
  $statsContainer.append(createStatItem("Names: ", $namesDiv, { id: "commonNames" }));

  // Most Common Locations
  const $locationDiv = generateLocationHTMLForPeriod(periodStats.countryCounts, periodStats.subdivisionCounts);
  $statsContainer.append(createStatItem("Most Common Birth Places: ", $locationDiv));

  return $statsContainer;
}

function generateNamesHTMLForPeriod(namesData) {
  let $namesContainer = $("<div>");

  Object.entries(namesData).forEach(([gender, names]) => {
    if (["Male", "Female"].includes(gender) && names.length > 0) {
      let $genderContainer = $("<div>").appendTo($namesContainer);
      $genderContainer.append(
        $("<span class='genderNameList'>")
          .text(gender + ": ")
          .css("font-weight", "bold")
      );
      let $list = $("<ul class='commonNameList'>").appendTo($genderContainer);

      names.forEach(([name, count], index) => {
        const $item = $("<li>").text(`${name}: ${count}`);
        $list.append($item);
        if (index >= 5) {
          $item.addClass("hiddenName").hide();
        }
      });

      if (names.length > 5) {
        const $toggleIcon = $("<span class='toggleIcon' title='See more names'>")
          .html("&#9654;")
          .click(function () {
            $genderContainer.find(".hiddenName").slideToggle("fast", function () {
              const anyVisible = $genderContainer.find(".hiddenName:visible").length > 0;
              $toggleIcon.html(anyVisible ? "&#9660;" : "&#9654;");
              $toggleIcon.attr("title", anyVisible ? "See fewer names" : "See more names");
            });
          });
        $genderContainer.append($toggleIcon);
      }
    }
  });

  return $namesContainer;
}

function generateLocationHTMLForPeriod(countryCounts, subdivisionCounts) {
  let $locationDiv = $("<div class='commonLocations'>");

  // Process and display top countries and subdivisions
  Object.entries(countryCounts)
    .filter(([country, _]) => country !== "" && country !== "count") // Filter out 'count' and empty strings
    .sort((a, b) => b[1] - a[1]) // Sort countries by count in descending order
    .forEach(([country, count]) => {
      const countButton = locationCountButton(country, count);
      let $countryDiv = $("<div class='country'>").html(
        `<span class="locationPart">${country}</span> (${countButton})`
      );
      let subdivisions = subdivisionCounts[country];

      if (subdivisions) {
        let $subdivisionList = $("<ul class='locationSubdivision'>");
        Object.entries(subdivisions)
          .filter(([subdivision, _]) => subdivision !== "count" && subdivision !== "") // Filter out 'count' and empty strings
          .sort((a, b) => b[1].count - a[1].count) // Assuming 'count' is a property of the object
          .forEach(([subdivision, subData]) => {
            const countButton = locationCountButton(subdivision, subData.count);
            let $subItem = $("<li>").html(`<span class="locationPart">${subdivision}</span> (${countButton})`);
            if (Object.keys(subData).length > 1) {
              // Check if there are nested subdivisions
              $subItem.addClass("expandable");
              /*
              
              $subItem.addClass("expandable").on("click", function (event) {
                //event.stopPropagation(); // Prevents triggering parent list's click event
                $(this).toggleClass("expanded");
                $(this).children("ul").toggle();
              });
              */
              let $nestedList = generateNestedSubdivisionList(subData);
              $subItem.append($nestedList.hide()); // Hide nested list initially
            }
            $subdivisionList.append($subItem);
          });

        $countryDiv.append($subdivisionList);
      }

      $locationDiv.append($countryDiv);
    });

  return $locationDiv;
}

function createStatItem(label, value, options = {}) {
  // Utility function to create a stat item
  const id = options.id || "";
  const title = options.title || "";
  return $("<div>", { class: "stat-item", id: id, title: title }).append(
    $("<label>").text(label),
    value instanceof jQuery ? value : $("<span>").text(value)
  );
}

function generatePeriodButtons(periodStats) {
  const sortedPeriods = Object.keys(periodStats).sort((a, b) => parseInt(a.split("-")[0]) - parseInt(b.split("-")[0]));

  sortedPeriods.forEach((period) => {
    let $button = $("<button>")
      .text(period)
      .on("click", function () {
        $button = $(this);
        togglePeriodStats(this, periodStats[period]);
        if ($("#tableViewButton").hasClass("on")) {
          if ($("#tableView").length == 0) {
            shakingTree.show();
          }
          setTimeout(function () {
            if ($button.hasClass("on")) {
              loadTableWithFilter(period, "birthDate");
            } else {
              $("#birthDateFilter").val("").trigger("change");
            }
          }, 0);
        }
      });

    $("#periodButtonsContainer").append($button);
  });

  // Initial adjust and on resize
  adjustGridForButtons();
  window.addEventListener("resize", adjustGridForButtons);
}

function adjustGridForButtons() {
  const container = $("#periodButtonsContainer"); // Adjust the container ID accordingly
  const buttons = container.find("button:not(.invisible-button)"); // Select all buttons excluding invisible ones
  const containerWidth = container.offsetWidth;
  const buttonMinWidth = 100; // Set minimum button width or calculate dynamically
  const maxButtonsPerRow = Math.floor(containerWidth / buttonMinWidth);

  // Calculate the number of rows needed and buttons per row for even distribution
  let numRows = Math.ceil(buttons.length / maxButtonsPerRow);
  let buttonsPerRow = Math.ceil(buttons.length / numRows);

  // Adjust grid template columns to evenly distribute buttons
  if (container) {
    //container.style.display = "grid";
    //container.style.gridTemplateColumns = `repeat(${buttonsPerRow}, minmax(0, 1fr))`;
    //container.style.gridGap = "10px"; // Adjust gap as needed
  }
}

function togglePeriodStats(button, periodData) {
  const $button = $(button);
  const $generalStatsContainer = $("#statisticsContainer");
  const $periodStatsContainer = $("#periodStatisticsContainer");

  if ($button.hasClass("on")) {
    // Button was already 'on', so turn it 'off' and show general stats
    $button.removeClass("on");
    $generalStatsContainer.show();
    $periodStatsContainer.hide();
  } else {
    // Turn 'on' this button and turn 'off' all other buttons
    $("#periodButtonsContainer button").removeClass("on");
    $button.addClass("on");

    // Hide general stats and show period-specific stats
    $generalStatsContainer.hide();
    $periodStatsContainer.html(generatePeriodStatsHTML(periodData)).show();
  }
}

function addLocationSelectBoxes(locationStats) {
  $("#locationSelects").remove();
  $("#locationSelects select").off("change");
  const $locationSelects = $("<div>", { id: "locationSelects" });
  const locations = locationStats.locationCounts;
  // Create a select box full of locations, sorted by the count on the objects.
  const sortedLocations = Object.entries(locations)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([location, count]) => {
      return { location, count };
    });

  console.log("sortedLocations", sortedLocations);
  const locationSelect = $("<select>", { id: "locationSelect" });
  locationSelect.append($("<option>").text("Location").val(""));
  sortedLocations.forEach((location) => {
    locationSelect.append(
      $("<option>")
        .text(location.location + " (" + location.count.count + ")")
        .val(location.location)
    );
  });

  // Create a selext box with locations in alphabetical order
  const locationSelectAlpha = $("<select>", { id: "locationSelectAlpha" });
  locationSelectAlpha.append($("<option>").text("Location").val(""));
  sortedLocations
    .sort((a, b) => a.location.localeCompare(b.location))
    .forEach((location) => {
      locationSelectAlpha.append(
        $("<option>")
          .text(location.location + " (" + location.count.count + ")")
          .val(location.location)
      );
    });

  const locationSelectsSwitchButton = $("<button>", {
    id: "locationSelectsSwitchButton",
    title: "Switch between locations sorted by count and sorted alphabetically",
  });

  locationSelectsSwitchButton.html("&#x21C6;").on("click", function () {
    $("#locationSelect").toggle();
    $("#locationSelectAlpha").toggle();
  });

  $locationSelects.append(locationSelect, locationSelectAlpha, locationSelectsSwitchButton);
  $("#toggleGeneralStats").after($locationSelects);

  // Add event listener to the select boxes
  $("#locationSelects select").on("change", function () {
    const value = $(this).val();
    if (!value.match(/Location/)) {
      if ($("#tableView").length == 0) {
        shakingTree.show();
      }
      setTimeout(function () {
        loadTableWithFilter(value, "birthPlace");
      }, 0);
    }
  });
}

function showStatistics() {
  familyTreeStats = new FamilyTreeStatistics(combinedResults);
  console.log("Total People: ", familyTreeStats.getTotalPeople());
  console.log("Average Lifespan: ", familyTreeStats.getAverageLifespan(), "years");
  console.log("Birth Decade Distribution: ", familyTreeStats.getBirthDecadeDistribution());
  console.log("Child Counts: ", familyTreeStats.getChildCounts());
  console.log("Gender Distribution: ", familyTreeStats.getGenderDistribution());
  console.log("Common Names: ", familyTreeStats.getNameStatistics());

  // Get top 10 male names
  const topMaleNames = familyTreeStats.getTopNamesByGender("Male");
  console.log("Top 10 Male Names:", topMaleNames);

  // Get top 10 female names
  const topFemaleNames = familyTreeStats.getTopNamesByGender("Female");
  console.log("Top 10 Female Names:", topFemaleNames);

  // Get stats for each 50-year period
  const periodStats = familyTreeStats.getStatsBy50YearPeriods();
  console.log("Stats by 50-Year Periods:", periodStats);

  // Accessing location statistics
  const locationStats = familyTreeStats.getLocationStatistics();
  console.log("Country Counts: ", locationStats.countryCounts);
  console.log("Subdivision Counts: ", locationStats.subdivisionCounts);
  console.log("Location Counts: ", locationStats.locationCounts);
  // Show number of keys in locationStats.locationCounts
  console.log("Number of Location Parts: ", Object.keys(locationStats.locationCounts).length);

  // Category count
  const categoryCount = familyTreeStats.getCategoryCounts();
  console.log("Category Count: ", categoryCount);

  // Actually display the statistics
  $("#statsDisplay").append(generateStatsHTML(familyTreeStats));

  $("#periodButtonsContainer button").off();
  $("#periodButtonsContainer").remove();
  // Create a container for period buttons
  let $periodButtonsContainer = $("<div>", { id: "periodButtonsContainer" });

  // Append period buttons container to the DOM
  $("#statsDisplay").prepend($periodButtonsContainer);

  // Generate buttons for each period
  generatePeriodButtons(periodStats);

  // Add location select boxes
  addLocationSelectBoxes(locationStats);
}

function birthAndDeathDates(person) {
  let birthDate = person.BirthDate;
  let deathDate = person.DeathDate;
  let birthDateDecade = person.BirthDateDecade;
  let deathDateDecade = person.DeathDateDecade;
  if (!birthDate && birthDateDecade) {
    birthDate = birthDateDecade.replace(/s$/, "-00-00");
  }
  if (birthDate == "unknown") {
    birthDate = "";
  }
  if (!deathDate && deathDateDecade) {
    deathDate = deathDateDecade.replace(/s$/, "-00-00");
  }
  if (deathDate == "unknown") {
    deathDate = "";
  }
  // DisplayDate is the date to display in the table (remove -00 and -00-00)
  let displayBirthDate = birthDate?.replace(/-00/g, "")?.replace(/-00/g, "");
  let displayDeathDate = deathDate?.replace(/-00/g, "")?.replace(/-00/g, "");
  if (displayBirthDate === "0000") {
    displayBirthDate = "";
  }
  if (displayDeathDate === "0000") {
    displayDeathDate = "";
  }
  // SortDate is the date to use for sorting (replace -00-00 with -07-02; replace -00 with -15)
  let sortBirthDate = birthDate?.replace(/-00-00/g, "-07-02")?.replace(/-00/g, "-15");
  let sortDeathDate = deathDate?.replace(/-00-00/g, "-07-02")?.replace(/-00/g, "-15");

  return {
    Birth: { DisplayDate: displayBirthDate, SortDate: sortBirthDate, Date: person.BirthDate },
    Death: { DisplayDate: displayDeathDate, SortDate: sortDeathDate, Date: person.DeathDate },
  };
}

function buildTable() {
  if ($("#tableView").length) {
    $("#tableView").remove();
  }
  shakingTree.show();
  const $table = $("<table>").prop("id", "tableView");
  const $thead = $("<thead>");
  const $tbody = $("<tbody>");
  const $tfoot = $("<tfoot>");

  // Define your headers
  const headers = {
    givenNames: "First",
    lastNameAtBirth: "LNAB",
    lastNameCurrent: "Current",
    birthDate: "Birth Date",
    birthPlace: "Birth Place",
    deathDate: "Death Date",
    deathPlace: "Death Place",
    age: "Age",
    categoryHTML: "Categories & Stickers",
    managers: "Managers",
    created: "Created",
    modified: "Modified",
  };

  const $tr = $("<tr>");
  const $tr2 = $("<tr id='filterRow'>");
  Object.keys(headers).forEach(function (key) {
    const header = headers[key];
    const $th = $("<th>").text(header).addClass(key);
    $tr.append($th);
    const filterElement = $(`<input type="text" class="filter" />`).attr("id", key + "Filter");
    if (["birthDate", "deathDate", "created", "touched"].includes(key)) {
      filterElement.addClass("dateFilter");
    }
    $tr2.append($("<th>").append(filterElement));
  });
  $thead.append($tr);
  $tfoot.append($tr2);

  // Add rows for data
  console.log("combinedResults", combinedResults);
  Object.keys(combinedResults).forEach(function (key) {
    const person = combinedResults[key];
    if (!person.Name) {
      return;
    }
    const aName = new PersonName(person);
    let givenNames = aName.withParts(["FirstNames"]);
    givenNames = person.Name
      ? `<a href="https://www.wikitree.com/wiki/${person.Name}" target="_blank">${givenNames}</a>`
      : givenNames;
    const lastNameAtBirth = aName.withParts(["LastNameAtBirth"]);
    const lastNameCurrent = aName.withParts(["LastNameCurrent"]);
    const birthDeathDates = birthAndDeathDates(person);
    const birthDate = birthDeathDates.Birth.DisplayDate;
    const birthPlace = person.BirthLocation;
    const deathDate = birthDeathDates.Death.DisplayDate;
    const deathPlace = person.DeathLocation;
    const age =
      person.BirthDate && person.BirthDate != "0000-00-00" && person.DeathDate && person.DeathDate != "0000-00-00"
        ? familyTreeStats.calculateAgeAtDeath(person.BirthDate, person.DeathDate)
        : "";
    let managers = person.Managers
      ? person.Managers.map((manager) => {
          return `<a href="https://www.wikitree.com/wiki/${manager.Name}" target="_blank">${manager.Name}</a>`;
        }).join(",")
      : "";
    if (!managers && person.Manager) {
      managers = `<a href="https://www.wikitree.com/wiki/${person.Manager}" target="_blank">${person.Manager}</a>`;
    }
    // Created and Touched are in this format: 20100705150300	20100705150300
    // Convert to a simple ISO date
    const formatCreatedModifiedDates = (date) => {
      return date ? date.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3") : "";
    };

    const created = person.Created ? formatCreatedModifiedDates(person.Created) : "";
    const touched = person.Touched ? formatCreatedModifiedDates(person.Touched) : "";
    const $row = $("<tr>");
    // Add data to the row: data-name, data-id, data-father, data-mother, data-gender
    $row.attr("data-name", person.Name);
    $row.attr("data-id", person.Id);
    $row.attr("data-father", person.Father);
    $row.attr("data-mother", person.Mother);
    $row.attr("data-gender", person.Gender);
    $row.attr("data-corrected-location", person.CorrectedBirthLocation);
    const categoryHTML = createCategoryHTML(person);
    const rowData = {
      givenNames: givenNames,
      lastNameAtBirth: lastNameAtBirth,
      lastNameCurrent: lastNameCurrent,
      birthDate: birthDate,
      birthPlace: birthPlace,
      deathDate: deathDate,
      deathPlace: deathPlace,
      age: age,
      categoryHTML: categoryHTML,
      managers: managers,
      created: created,
      touched: touched,
    };
    Object.keys(rowData).forEach(function (key) {
      const cellData = rowData[key];
      const $cell = $("<td>").html(cellData).addClass(key);
      if (["birthDate", "deathDate", "created", "touched"].includes(key)) {
        $cell.addClass("date");
      }
      $row.append($cell);
    });
    $tbody.append($row);
  });

  $table.append($thead, $tbody, $tfoot);
  $("section#table").append($table);
  const table = $("#tableView").DataTable({
    lengthMenu: [50, 100, 200, 500, 1000],
  });

  // Apply the filter
  table.columns().every(function () {
    var column = this;

    $("input", this.footer()).on("change", function () {
      column.search(this.value).draw();
    });
    $("input", this.footer()).on("keyup", function (e) {
      if (e.keyCode === 13) {
        column.search(this.value).draw();
      }
    });
  });

  $.fn.dataTable.ext.search.push((settings, data, dataIndex) => {
    // Access the DataTable instance and the row element
    const table = $(settings.nTable).DataTable();
    const row = table.row(dataIndex).node();
    const correctedLocation = $(row).data("corrected-location") || "";
    const locationFilterValue = $("#birthPlaceFilter").val().toLowerCase();

    let isValid = true; // Initialize as true and set to false if any condition fails
    $(".dateFilter").each(function () {
      const columnIndex = $(this).closest("th").index(); // Get column index based on the position of the input
      const filterValue = $(this).val();
      const cellValue = data[columnIndex] || ""; // Get the value from the cell in the current column
      let year = cellValue.split("-")[0]; // Assuming the date is in YYYY-MM-DD format

      let minYear, maxYear;

      // Interpret filterValue
      if (filterValue.includes("-")) {
        [minYear, maxYear] = filterValue.split("-").map(Number);
      } else if (filterValue.startsWith("<")) {
        maxYear = parseInt(filterValue.substring(1), 10);
      } else if (filterValue.startsWith(">")) {
        minYear = parseInt(filterValue.substring(1), 10) + 1; // +1 to make it exclusive
      }

      // Apply filter logic
      if ((minYear && year < minYear) || (maxYear && year > maxYear)) {
        isValid = false; // If any condition fails, set isValid to false
      }
    });

    // Custom location-based filtering logic
    if (locationFilterValue && !correctedLocation.toLowerCase().includes(locationFilterValue)) {
      isValid = false;
    }

    return isValid; // Only include rows where isValid remains true
  });

  const wideTableButton = $("<button>", { id: "wideTableButton" }).text("Wide");
  $("#tableView_wrapper #tableView_length").after(wideTableButton);
  wideTableButton.on("click", function () {
    $("section#table").toggleClass("wide");
    $(this).toggleClass("on");
  });

  /*
  // Code to add the "Filters" button
  const filtersButton = $("<button>", { id: "filtersButton" }).text("Filters").attr("title", "Scroll to filters");
  // Insert the "Filters" button next to the "Wide" button
  wideTableButton.after(filtersButton);

  // Event handler for the "Filters" button
  filtersButton.on("click", function () {
    // Assuming .filterRow is within a visible container that can be scrolled
    const filterRow = $(".filterRow, tfoot").first(); // Target the first .filterRow or tfoot

    if (filterRow.length) {
      // Scroll into view
      $("html, body").animate(
        {
          scrollTop: filterRow.offset().top,
        },
        500
      ); // Adjust the duration (500ms here) as needed
      // Make the row shake to highlight it.
      filterRow.find("input").effect("shake", { times: 2, distance: 5 }, 500);
    }
  });
  */

  // Function to update the sticky header position
  function setStickyHeader() {
    const headerHeight = parseInt($("header").height() + 15) + "px";
    $thead.css({
      position: "sticky",
      top: headerHeight,
      //  "z-index": "10000", // Adjust as necessary to ensure it's above other content
    });
  }

  // Use ResizeObserver to handle dynamic changes in the header's size
  const header = document.querySelector("header");
  if (header) {
    const resizeObserver = new ResizeObserver((entries) => {
      setStickyHeader(); // Update the sticky header position whenever the header size changes
    });
    resizeObserver.observe(header);
  }

  // Example event that might change header size
  $("#toggleGeneralStats").on("click", function () {
    // If the header size changes are immediate, setStickyHeader could be called directly here
    // If there's an animation or a delay in resizing, consider using setTimeout
    setTimeout(setStickyHeader, 300); // Adjust the timeout based on actual delay
  });

  // Initial call to ensure the sticky header is correctly positioned on page load
  setStickyHeader();

  $(".dateFilter").off(); // Remove any existing event listeners

  $(".dateFilter").on("change", function () {
    table.draw();
  });
  $(".dateFilter").on("keyup", function (e) {
    if (e.keyCode === 13) {
      table.draw();
    }
  });

  $(".filter").on("keyup", function () {
    clearFiltersButton();
  });
  shakingTree.hide();
}

function clearAllFilters() {
  const table = $("#tableView").DataTable();

  // setTimeout(function () {
  // Clear global filter
  table.search("").draw();

  // Clear column filters
  table.columns().every(function () {
    const column = this;
    //  setTimeout(function () {
    column.search("");
    // }, 0);
  });
  setTimeout(function () {
    table.draw(); // Redraw the table with all filters cleared
    shakingTree.hide();
  }, 100);
  // }, 0);
}

function clearFiltersButton() {
  // If any filter has text in it then show the clear filters button else hide it
  if (
    $(".filter").filter(function () {
      return this.value;
    }).length
  ) {
    addClearFiltersButton();
  } else {
    $("#clearFilters").off().remove();
  }
}
function addClearFiltersButton() {
  if ($("#clearFilters").length) {
    return;
  }
  const $clearButton = $("<button>", { id: "clearFilters" }).text("Clear Filters");
  if ($("#tableViewButton").hasClass("on")) {
    $("#controls").append($clearButton);
  }
  $("#clearFilters").on("click", function () {
    shakingTree.show();
    setTimeout(function () {
      $(".filter").val("");
      clearAllFilters();
      $(this).off().remove();
    }, 0);
  });
}

function countDescendants(personId, parentToChildrenMap) {
  let count = 0;
  if (parentToChildrenMap[personId]) {
    const children = parentToChildrenMap[personId];
    count += children.length; // Add direct children
    children.forEach((childId) => {
      count += countDescendants(childId, parentToChildrenMap); // Recursively add the count of descendants
    });
  }
  return count;
}

function loadFromURL() {
  // Check name parameter of URL
  const urlParams = new URLSearchParams(window.location.search);
  const surname = urlParams.get("name");
  const place = urlParams.get("place");
  if (surname) {
    $("#surname").val(surname);
    if (place) {
      $("#location").val(place);
    }
    $("#submit").click();
    setNewTitle();
  }
}

// Ready
$(document).ready(function () {
  addCategoryKeyToHelp();
  login();
  $("#submit").on("click", async function () {
    console.log("Submit clicked");
    shakingTree.show();
    $("div.error").remove(); // Remove any existing error messages

    // There is a comma, the name is before the first comma. Anything after the first comma is a location.
    let surname = $("#surname").val();
    let location = $("#location").val().trim(); // Get the location from the new input field

    if (surname.includes(",")) {
      surname = surname.split(",")[0].trim();
      location = $("#surname").val().split(",").slice(1).join(",").trim();
    }

    // If surname is blank or includes a number, show an error message and return
    if (surname === "" || surname.match(/\d/)) {
      // alert("Please enter a valid surname."); Better to show a message on the page
      const errorHtml = `<div class='error'>Please enter a valid surname.</div>`;
      $("section#results").prepend(errorHtml);
      triggerError();
      return;
    }

    if (surname) {
      reset();
      const data = await getONSids(surname, location);
      const ids = data.response.profiles;
      const found = data.response.found;
      if (found === 0) {
        const errorHtml = `<div class='error'>No results found.</div>`;
        $("section#results").prepend(errorHtml);
        triggerError();
        return;
      } else if (found > 10000) {
        // Number to the nearest 1000 (rounding down)
        let roundedFound = Math.floor(found / 1000) * 1000;
        function formatNumber(number, locales, options) {
          return new Intl.NumberFormat(locales, options).format(number);
        }
        const formattedRoundedFound = formatNumber(roundedFound, "en-US");
        let message;
        const surnameInput = $("#surname").val();
        let moreSpecific = "";
        if ($("#location").val().trim() !== "") {
          moreSpecific = "more specific ";
        }

        if (found < 40000) {
          const howLong = Math.floor(roundedFound / 4000);
          message = `
        <p>There are over ${formattedRoundedFound} results.</p> 
        <p>This may take over ${howLong} minutes to load.</p> 
        <p>You could try adding a ${moreSpecific}location.</p>`;
        } else {
          message = `
          <p>There are over ${formattedRoundedFound} results.</p> 
          <p>This is too many for the app to handle.</p> 
          <p>Please add a location and go again.</p>`;
          $("#results").prepend(`<div class='message'>${message}</div>`);
          return;
        }
        $("#results").prepend(`<div class='message'>${message}</div>`);
      }
      processBatches(ids, surname);
    }
    console.log("Surname:", surname);
  });

  // Enter key submits the form
  $("#surname").keyup(function (event) {
    if (event.keyCode === 13) {
      $("#submit").click();
    }
  });

  $("#location").keyup(function (event) {
    if (event.keyCode === 13 && $("#surname").val()) {
      $("#submit").click();
    }
  });

  // Call the function to add the styles
  addStylesToHead();

  $("#results").on("click", ".dates", function () {
    showMoreDetails($(this));
  });

  $("#addNameVariants").on("click", function (e) {
    e.preventDefault();
    window.open(
      "https://docs.google.com/spreadsheets/d/1VwYnlDVIw8MH4mKDQeRfJAW_2u2kSHyiGcQUw5yBepw/edit#gid=0",
      "_blank"
    );
  });

  // Event listener for the search button
  $("#searchButton").click(function () {
    handleSearch();
  });

  // Also allow searching by pressing the enter key in the search input
  $("#searchInput").on("keyup", function (event) {
    if (event.keyCode === 13) {
      handleSearch();
    }
  });

  $(document).on("click", "#refreshData", async function () {
    const surname = $("#surname").val();
    $("#refreshData").fadeOut();
    if (surname) {
      reset();
      clearONSidsCache(surname); // Clear the cache for this surname
      displayedIndividuals.clear();
      displayedSpouses.clear();
      combinedResults = {};
      parentToChildrenMap = {};

      const data = await getONSids(surname); // Fetch data again
      const ids = data.response.profiles;
      await processBatches(ids, surname);
      setupToggleButtons();
    }
  });

  $(document).on("mouseover", ".person:not(.spouse,.notSpouse,.level_0) > a:first-of-type", function () {
    showAncestralLineToRoot($(this));
  });
  $(document).on("mouseout", ".person", function () {
    $("#ancestralLinePopup").remove();
  });

  $(document).on("click", ".commonLocations .locationCount", function (e) {
    e.preventDefault();
    // e.stopPropagation();
    const location = $(this).data("location") || $(this).attr("data-location");

    let locationParts = [];
    let currentElement = $(this);

    // Include the clicked location itself if it's distinct from its parent's locationPart
    let directLocation = currentElement.data("location");
    let parentLocationPart = currentElement.closest("li").children(".locationPart").text();

    // If the direct location is different from the parent's locationPart, add it; this check prevents immediate duplication
    if (directLocation && directLocation !== parentLocationPart) {
      locationParts.push(directLocation);
    }

    // Traverse upwards from the clicked element to capture the hierarchical locations
    currentElement.parents("li, .country").each(function () {
      let locationPart = $(this).children(".locationPart").first().text();
      if (locationPart && !locationParts.includes(locationPart)) {
        locationParts.push(locationPart);
      }
    });

    // Reverse the collected parts to order them from the most specific to the most general
    locationParts.reverse();

    // Construct the full location string
    const fullLocation = locationParts.reverse().join(", ");

    if ($("#tableView").length == 0) {
      shakingTree.show();
    }
    setTimeout(function () {
      loadTableWithFilter(fullLocation, "birthPlace");
      console.log("fullLocation", fullLocation);
    }, 0);
  });

  // Delegate from .commonLocations for .locationPart click events
  $(document).on("click", ".commonLocations .locationPart", function (event) {
    //event.stopPropagation(); // Prevent event bubbling
    const $subItem = $(this).closest("li").toggleClass("expanded");
    $subItem.children("ul").toggle(); // Toggle visibility of the nested list
  });

  $(document).on("dblclick", "#statisticsContainer,#periodStatisticsContainer", function () {
    $("#toggleGeneralStats").trigger("click");
  });

  $("#downloadData").on("click", function () {
    if (Object.keys(combinedResults).length > 0) {
      const surname = $("#surname").val();
      const fileName = "ONT_" + surname + "_" + new Date().toISOString().substring(0, 16) + ".json";
      const treeHtml = $("section#results").html(); // Get the HTML of the tree
      downloadResults(combinedResults, treeHtml, fileName);
    } else {
      alert("No data to download.");
    }
  });

  $("#fileInput").on("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      reset();
      // Extract the surname from the file name
      const fileNameParts = file.name.split("_");
      if (fileNameParts.length > 1) {
        const surname = fileNameParts[1]; // The second part is the surname
        $("#surname").val(surname); // Set the surname in the input field
        setNewTitle(); // Update the title
      }

      // Show the loading bar
      showLoadingBar();

      const reader = new FileReader();
      reader.onload = function (e) {
        const storageObject = JSON.parse(e.target.result);
        combinedResults = storageObject.data;
        const treeHtml = storageObject.html;

        $("section#results").empty(); // Clear the existing tree
        $("section#results").empty().html(treeHtml); // Load the HTML
        setupToggleButtons(); // Reinitialize any event listeners

        displayedIndividuals.clear();
        displayedSpouses.clear();
        parentToChildrenMap = {};

        let sortedPeople = sortPeopleByBirthDate(combinedResults);
        parentToChildrenMap = createParentToChildrenMap(sortedPeople);
        peopleById = createPeopleByIdMap(sortedPeople);
        displayDescendantsTree(peopleById, parentToChildrenMap);

        // Hide loading bar if it was shown
        //hideLoadingBar();
      };

      reader.onprogress = function (e) {
        if (e.lengthComputable) {
          const percentage = (e.loaded / e.total) * 100;
          updateLoadingBar(percentage);
        }
      };

      reader.readAsText(file);

      $("#tableViewButton").removeClass("on");
    }
  });

  $("#loadButton").on("click", function () {
    $("#fileInput").click(); // Triggers the hidden file input
  });

  const helpModal = $("#help");
  // #helpButton: on click, show the help text in the modal and draggable
  helpModal.draggable();
  $("#helpButton,#closeHelp").on("click", function (e) {
    e.preventDefault();
    // Calculate the position of the helpButton
    const helpButtonOffset = $("#helpButton").offset();
    const helpButtonHeight = $("#helpButton").outerHeight();

    // Position the help modal below the helpButton and align it based on your design needs
    helpModal.css({
      position: "fixed",
      top: helpButtonOffset.top + helpButtonHeight + 10, // 10px for a little spacing from the button
      zIndex: 1000, // Ensure the modal is above other content; adjust as necessary
    });

    helpModal.slideToggle();
  });
  helpModal.on("dblclick", function (e) {
    e.preventDefault();
    helpModal.slideUp();
  });
  // Escape key closes the modal
  $(document).keyup(function (e) {
    if (e.key === "Escape") {
      helpModal.slideUp();
    }
  });

  $("#toggleDetails").on("click", function () {
    if ($(this).hasClass("off")) {
      $(this).removeClass("off").addClass("on");
      $(".dates").each(function () {
        showMoreDetails($(this), "show");
      });
    } else {
      $(this).removeClass("on").addClass("off");
      $(".dates").each(function () {
        showMoreDetails($(this), "hide");
      });
    }
  });

  $("#toggleWTIDs").on("click", function () {
    if ($(this).hasClass("off")) {
      $(this).removeClass("off").addClass("on");
      $(".wtid").show();
    } else {
      $(this).removeClass("on").addClass("off");
      $(".wtid").hide();
    }
  });

  $("#toggleGeneralStats").on("click", function () {
    if ($(this).hasClass("on") == false) {
      $(this).removeClass("off").addClass("on");
      $("#statsDisplay").slideDown();
    } else {
      $(this).removeClass("on").addClass("off");
      $("#statsDisplay").slideUp();
    }
  });

  $("#wtLogo").on("click", function () {
    window.open("https://www.wikitree.com/", "_blank");
  });

  $("#tableViewButton").click(function () {
    const $tableViewContainer = $("section#table");
    const $treeViewContainer = $("section#results");

    // Toggle visibility
    if ($treeViewContainer.is(":visible")) {
      $treeViewContainer.hide();
      $tableViewContainer.show();
      $(this).addClass("on").attr("title", "Click to return to trees view");
      // Check if the table needs to be built
      if ($tableViewContainer.find("table").length === 0) {
        shakingTree.show();
        setTimeout(function () {
          buildTable(); // Function to dynamically build the table
          shakingTree.hide();
        }, 0);
      }
      $("#toggleButtons,#wtidGo,#nameSelect,#toggleDetails,#toggleWTIDs").hide();
    } else {
      $treeViewContainer.show();
      $tableViewContainer.hide();
      $(this).removeClass("on").attr("title", "Show table view");
      $("#clearFilters").off().remove();
      $("#toggleButtons,#wtidGo,#nameSelect,#toggleDetails,#toggleWTIDs").show();
    }
    if ($("#periodButtonsContainer button.on").length) {
      $("#birthDateFilter").val($("#periodButtonsContainer button.on").text());
      $("#birthDateFilter").trigger("change");
    }

    clearFiltersButton();
  });

  loadFromURL();
});
