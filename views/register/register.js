window.RegisterBook = class RegisterBook extends View {
    static APP_ID = "RegisterBook";

    meta() {
        return {
            title: "Register Book",
            description: "",
            docs: "",
        };
    }

    close() {
        // Another view is about to be activated, remove the display options
        $('#view-options').remove();
    }

    init(selector, person_id) {
        if ($('#view-options').length) {
            $('#view-options').remove();
        }

        const displayOptionsHTML = `
            <div id="view-options" style="display: flex; justify-content: space-between;">
                <div>
                    <label for="display-mode">Display Mode (experimental):</label><br>
                    <select id="display-mode">
                        <option value="hideNone">Show All</option>
                        <option value="hideLiving">Hide Living</option>
                        <option value="hidePrivate">Hide Private and Living</option>
                    </select>
                </div>
                <div>
                    <label for="name-format">Name Format:</label><br>
                    <select id="name-format">
                        <option value="PedigreeName">Pedigree Name</option>
                        <option value="FullName">Full Name</option>
                        <option value="ShortName">Short Name</option>
                        <option value="ColloquialName">Colloquial Name</option>
                    </select>
                </div>
                <div>
                    <label for="suppress-unknown">Suppress Blanks:</label><br>
                    <input type="checkbox" id="suppress-unknown">
                </div>
                <div>
                    <button id="cancel-button">Cancel</button>
                </div>
            </div>
        `;

        $('main').append(displayOptionsHTML);
        $(selector).append('<div id="loading-indicator">Loading...</div>');

        let peopleData = [];
        let personCounter = 1; // Counter for main individuals
        let childCounter = 2; // Counter for children across generations
        let pageNumber = 0;
        const pageSize = 1000;
        const romanNumerals = [
            { value: 1000, numeral: 'M' },
            { value: 900, numeral: 'CM' },
            { value: 500, numeral: 'D' },
            { value: 400, numeral: 'CD' },
            { value: 100, numeral: 'C' },
            { value: 90, numeral: 'XC' },
            { value: 50, numeral: 'L' },
            { value: 40, numeral: 'XL' },
            { value: 10, numeral: 'X' },
            { value: 9, numeral: 'IX' },
            { value: 5, numeral: 'V' },
            { value: 4, numeral: 'IV' },
            { value: 1, numeral: 'I' }
        ];

        let abortController = new AbortController();
        let cancelLoading = false;

        $('#cancel-button').on('click', function () {
            cancelLoading = true;
            abortController.abort();
            $('#loading-indicator').text('Process Cancelled. Please submit a new query...');
            $('#view-options').remove();
        });

        $('#display-mode, #name-format, #suppress-unknown').on('change', function () {
            const outputElement = document.querySelector(selector);
            if (outputElement) {
                outputElement.innerHTML = '';
            }

            personCounter = 1;
            childCounter = 2;

            processFamilyData(peopleData, person_id);
        });

        getPages(pageNumber);

        function getPages(pageNumber) {
            if (cancelLoading) return;
            updateLoadingIndicator(`Loading page ${pageNumber / 1000 + 1}...`);
            abortController = new AbortController();
            WikiTreeAPI.postToAPI({
                appId: RegisterBook.APP_ID,
                action: "getPeople",
                keys: person_id,
                descendants: 10,
                nuclear: 1,
                fields: "Id,DataStatus,Privacy,HasChildren,Name,FirstName,LastNameAtBirth,LastNameCurrent,LastNameOther,MiddleName,Nicknames,Prefix,RealName,Suffix,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Parents,Spouses,Father,Mother,IsLiving",
                limit: pageSize,
                start: pageNumber,
                signal: abortController.signal
            }).then(function (data) {
                if (cancelLoading) return;
                if (data.length > 0 && data[0].people) {
                    const numPeople = Object.keys(data[0].people).length;
                    peopleData = peopleData.concat(Object.values(data[0].people));
                    updateLoadingIndicator(`Loaded ${peopleData.length} people...`);

                    if (numPeople < pageSize && data[0].status !== "Maximum number of profiles (1000) reached.") {
                        processFamilyData(peopleData, person_id);
                    } else {
                        getPages(pageNumber + pageSize);
                    }
                } else {
                    const outputElement = document.querySelector(selector);
                    if (outputElement) {
                        outputElement.innerHTML = 'No data available';
                    }
                    hideLoadingIndicator();
                }
            }).catch(function (error) {
                if (error.name === 'AbortError') {
                    console.log('Fetch aborted');
                } else {
                    const outputElement = document.querySelector(selector);
                    if (outputElement) {
                        outputElement.innerHTML = 'Error fetching data: ' + error;
                    }
                }
                hideLoadingIndicator();
            });
        }

        function processFamilyData(people, rootId) {
            const displayMode = $('#display-mode').val();
            const suppressUnknown = $('#suppress-unknown').is(':checked');
            let filteredPeople = filterPeople(people, displayMode);
            personCounter = 1; // Reset person counter
            childCounter = 1; // Reset child counter
            let generations = organizeGenerations(filteredPeople, rootId);
            let output = formatGenerations(generations, filteredPeople, suppressUnknown);
            const outputElement = document.querySelector(selector);
            if (outputElement) {
                outputElement.innerHTML = output;
            } else {
                console.error('Output element not found for selector:', selector);
            }
            hideLoadingIndicator();
        }

        function filterPeople(people, displayMode) {
            return people.filter(person => {
                if (displayMode === 'hideLiving' && person.IsLiving) {
                    return false;
                }
                if (displayMode === 'hidePrivate' && (person.IsLiving || person.Privacy <= 20)) {
                    return false;
                }
                return true;
            });
        }

        function organizeGenerations(people, rootId) {
            let generations = [];
            let currentGen = [people.find(person => person && person.Id == rootId)];
            let nextGen = [];

            while (currentGen.length > 0) {
                generations.push(currentGen);
                nextGen = [];
                currentGen.forEach(person => {
                    if (person) {
                        nextGen = nextGen.concat(getChildren(person.Id, people));
                    }
                });
                currentGen = nextGen;
            }
            updateLoadingIndicator('Organizing generations...');
            return generations;
        }

        function formatGenerations(generations, people, suppressUnknown) {
            let output = '';
            generations.forEach((generation, genIndex) => {
                let filteredGeneration = generation.filter(person => genIndex === 0 || person.HasChildren);
        
                if (filteredGeneration.length > 0) {
                    output += `<h2 style="text-align: center;">GENERATION ${genIndex + 1}</h2>`;
                    output += '<table>';
        
                    filteredGeneration.forEach((person, personIndex) => {
                        output += formatPerson(person, genIndex, personIndex, generations, people, suppressUnknown);
                    });
        
                    output += '</table><br>';
                }
            });
            return output;
        }
        
        function formatPerson(person, genIndex, personIndex, generations, people, suppressUnknown) {
            if (!person) return '';
        
            const nameFormat = $('#name-format').val();
            const personName = new PersonName(person);
            let formattedName = personName.withParts([nameFormat]);
        
            let personNumber = (genIndex === 0 || person.HasChildren) ? `${personCounter++}` : null;
            let genderPronoun = person.Gender === 'Male' ? 'he' : person.Gender === 'Female' ? 'she' : 'they';
            let genderRelation = person.Gender === 'Male' ? 'son of' : person.Gender === 'Female' ? 'daughter of' : 'child of';
            let birthLocation = suppressUnknown ? (person.BirthLocation ? person.BirthLocation : '') : (person.BirthLocation || '_____');
            let deathLocation = suppressUnknown ? (person.DeathLocation ? person.DeathLocation : '') : (person.DeathLocation || '_____');
        
            let formattedPerson = '<tr>';
            if (personNumber) {
                formattedPerson += `<td class="baseline"><span id="person${personNumber}">${personNumber}.</span></td>`;
            } else {
                formattedPerson += '<td></td>';
            }
        
            formattedPerson += `<td colspan="2"><b>${formattedName}</b>`;
        
            let birthDetails = '';
            if (person.BirthDate || person.BirthLocation || !suppressUnknown) {
                if (person.BirthDate || !suppressUnknown) {
                    birthDetails += `${getStatus(person.DataStatus.BirthDate)}${formatDate(person.BirthDate, suppressUnknown)}`;
                }
                if (person.BirthLocation || !suppressUnknown) {
                    if (birthDetails) birthDetails += ' in ';
                    birthDetails += birthLocation;
                }
                if (birthDetails) {
                    formattedPerson += ` was born ${birthDetails}, `;
                }
            }
        
            formattedPerson += `${genderRelation} ${formatParents(person.Father, person.Mother, generations[genIndex - 1] || [], people, suppressUnknown)}. `;
        
            let deathDetails = '';
            if (!person.IsLiving) {
                if (person.DeathDate || person.DeathLocation || !suppressUnknown) {
                    if (person.DeathDate || !suppressUnknown) {
                        deathDetails += `${getStatus(person.DataStatus.DeathDate)}${formatDate(person.DeathDate, suppressUnknown)}`;
                    }
                    if (person.DeathLocation || !suppressUnknown) {
                        if (deathDetails) deathDetails += ' in ';
                        deathDetails += deathLocation;
                    }
                    if (deathDetails) {
                        formattedPerson += `${genderPronoun.charAt(0).toUpperCase() + genderPronoun.slice(1)} died ${deathDetails}. `;
                    }
                }
            }
        
            if (person.Spouses && person.Spouses.length > 0) {
                person.Spouses.sort((a, b) => {
                    let dateA = new Date(a.MarriageDate);
                    let dateB = new Date(b.MarriageDate);
                    return dateA - dateB;
                });
        
                person.Spouses.forEach(spouse => {
                    let spouseDetails = people.find(p => p && p.Id == spouse.Id);
                    if (spouseDetails) {
                        let spouseName = new PersonName(spouseDetails).withParts([nameFormat]);
                        formattedPerson += `${genderPronoun.charAt(0).toUpperCase() + genderPronoun.slice(1)} married at ${spouse.MarriageLocation || (suppressUnknown ? '' : 'unknown location')} on ${formatDate(spouse.MarriageDate, suppressUnknown)}, <b>${spouseName}</b>. `;
                    } else {
                        formattedPerson += `${genderPronoun.charAt(0).toUpperCase() + genderPronoun.slice(1)} married an unknown spouse in ${spouse.MarriageLocation || (suppressUnknown ? '' : 'unknown location')} on ${formatDate(spouse.MarriageDate, suppressUnknown)}. `;
                    }
                });
        
                person.Spouses.forEach(spouse => {
                    let spouseDetails = people.find(p => p && p.Id == spouse.Id);
                    let spouseName = spouseDetails ? new PersonName(spouseDetails).withParts([nameFormat]) : (suppressUnknown ? '' : '_____');
        
                    let children = getChildren(person.Id, people).filter(child => child.Mother == spouse.Id || child.Father == spouse.Id);
                    if (children.length > 0) {
                        formattedPerson += `<p style="margin-left: 15px;">Children of ${formattedName} and ${spouseName}:</p>`;
                        formattedPerson += `<table><colgroup><col style="width:5%"><col style="width:5%"><col style="width:90%"></colgroup>`;
        
                        children.forEach((child, idx) => {
                            let childName = new PersonName(child).withParts([nameFormat]);
                            let birthDetails = '';
                            let deathDetails = '';
        
                            if (child.BirthDate || child.BirthLocation || !suppressUnknown) {
                                let birthString = '';
                                if (child.BirthDate) {
                                    birthString = `${getStatus(child.DataStatus.BirthDate)}${formatDate(child.BirthDate, suppressUnknown)}`;
                                } else if (!suppressUnknown) {
                                    birthString = '_____';
                                }
        
                                if (birthString) {
                                    birthDetails = `b. ${birthString}`;
                                }
        
                                if (child.BirthLocation) {
                                    birthDetails += ` in ${child.BirthLocation}`;
                                } else if (!suppressUnknown) {
                                    birthDetails += ' in _____';
                                }
                            }
        
                            if (!child.IsLiving) {
                                let deathString = '';
                                if (child.DeathDate) {
                                    deathString = `${getStatus(child.DataStatus.DeathDate)}${formatDate(child.DeathDate, suppressUnknown)}`;
                                } else if (!suppressUnknown) {
                                    deathString = '_____';
                                }
        
                                if (deathString) {
                                    deathDetails = `d. ${deathString}`;
                                }
        
                                if (child.DeathLocation) {
                                    deathDetails += ` in ${child.DeathLocation}`;
                                } else if (!suppressUnknown) {
                                    deathDetails += ' in _____';
                                }
                            }
        
                            if (suppressUnknown) {
                                if (birthDetails.endsWith('b. ') || birthDetails.endsWith('b. abt. ') || birthDetails.endsWith('b. before ') || birthDetails.endsWith('b. after ')) {
                                    birthDetails = '';
                                }
        
                                if (deathDetails.endsWith('d. ') || deathDetails.endsWith('d. abt. ') || deathDetails.endsWith('d. before ') || deathDetails.endsWith('d. after ')) {
                                    deathDetails = '';
                                }
                            }
        
                            let lifeDetails = birthDetails;
                            if (deathDetails) {
                                if (lifeDetails) {
                                    lifeDetails += `; ${deathDetails}`;
                                } else {
                                    lifeDetails = deathDetails;
                                }
                            }
        
                            lifeDetails = lifeDetails.trim().replace(/;\s*$/, '').replace(/\.\s*$/, '');
        
                            if (child.HasChildren === 0) {
                                formattedPerson += `<tr><td></td><td>${toRoman(idx + 1)}.</td><td>${childName}${lifeDetails ? `, ${lifeDetails}` : ''}.</td></tr>`;
                            } else {
                                formattedPerson += `<tr><td><a href="#person${childCounter + 1}">${childCounter++ + 1}</a>.</td><td>${toRoman(idx + 1)}.</td><td>${childName}${lifeDetails ? `, ${lifeDetails}` : ''}.</td></tr>`;
                            }
        
                            // Ensure child is listed in previous generation
                            if (!generations[genIndex + 1]) {
                                generations[genIndex + 1] = [];
                            }
                            if (!generations[genIndex + 1].includes(child)) {
                                generations[genIndex + 1].push(child);
                            }
                        });
        
                        formattedPerson += `</table><br>`;
                    }
                });
            }
        
            formattedPerson += '</td></tr>';
            return formattedPerson;
        }
        

        function getChildren(parentId, people) {
            let children = people.filter(person => person && (person.Father == parentId || person.Mother == parentId));
            children.sort((a, b) => compareDates(a.BirthDate, b.BirthDate));
            return children;
        }

        function compareDates(dateA, dateB) {
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;

            let [yearA, monthA, dayA] = dateA.split('-').map(part => parseInt(part) || 0);
            let [yearB, monthB, dayB] = dateB.split('-').map(part => parseInt(part) || 0);

            if (yearA !== yearB) return yearA - yearB;
            if (monthA !== monthB) return monthA - monthB;
            return dayA - dayB;
        }

        function formatParents(fatherId, motherId, parents, people, suppressUnknown) {
            const nameFormat = $('#name-format').val();
            let father = people.find(person => person && person.Id == fatherId);
            let mother = people.find(person => person && person.Id == motherId);
            let parentNames = [];
            if (father) parentNames.push(new PersonName(father).withParts([nameFormat]));
            if (mother) parentNames.push(new PersonName(mother).withParts([nameFormat]));
            return parentNames.length > 0 ? parentNames.join(' and ') : (suppressUnknown ? '' : 'unknown parents');
        }

        function formatDate(date, suppressUnknown) {
            if (!date || date === '0000-00-00') return suppressUnknown ? '' : '_____';
            let [year, month, day] = date.split('-');
            if (year === '0000') return suppressUnknown ? '' : '_____';

            if (month === '00' && day === '00') {
                return year;
            } else if (day === '00') {
                return `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`;
            } else {
                return `${parseInt(day)} ${new Date(year, month - 1, day).toLocaleString('default', { month: 'long' })} ${year}`;
            }
        }

        function getStatus(status) {
            if (status === 'guess') return 'abt. ';
            if (status === 'before') return 'before ';
            if (status === 'after') return 'after ';
            return '';
        }

        function toRoman(num) {
            if (isNaN(num)) {
                return '';
            }
            let romanNumeral = '';
            for (let i = 0; i < romanNumerals.length; i++) {
                while (num >= romanNumerals[i].value) {
                    romanNumeral += romanNumerals[i].numeral;
                    num -= romanNumerals[i].value;
                }
            }
            return romanNumeral;
        }

        function updateLoadingIndicator(text) {
            const loadingIndicator = $('#loading-indicator');
            if (loadingIndicator.length) {
                loadingIndicator.text(text);
            } else {
                $(selector).append(`<div id="loading-indicator">${text}</div>`);
            }
        }

        function hideLoadingIndicator() {
            $('#loading-indicator').remove();
        }
    }
};
