/*
MIT License
Copyright (c) 2022 Robert M Pavey
https://github.com/RobPavey/wikitree-sourcer/blob/main/extension/base/browser/options/options.mjs
Originally downloaded 14 October 2022.

modified by Greg Clarke, October 2022

Modifications were made to turn this into a Class that could be used in
any View of the Dynamic Tree that requires a settings panel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

window.SettingsOptions = window.SettingsOptions || {};

SettingsOptions.SettingsOptionsObject = class SettingsOptionsObject {
    // keeps track of the elements for tabs an subsections
    tabElements = {};
    self = null;

    constructor(data) {
        // the input for this constructor is the optionsRegistry object, sent in by the application that requires a settings panel
        if (data) {
            // use the object sent in (via data variable) to be the optionsRegistry for this instance of SettingsOptionsObject
            this.optionsRegistry = data;

            // create the Tab Mapping object that maps buttons and panels to their respective tabs
            this.tabMapping = this.createTabMapping(data);

            // create the HTML needed to create the Settings DIV in the original application, with its proper names for various tab / button / panel components
            this.createdSettingsDIV = this.createSettingsDIV(data);
        }

        // create a variable by which the class can be called directly inside other functions
        self = this;
    }

    // this is the default (example) optionsRegistry
    // - it gets overwritten by the data  imported by the constructor
    // The options Registry must have a tabs Array of objects (each with name, label, subsections entries)
    // as well as an optionsGroup array (which contain the individual options that get turned on/off/adjusted)

    // Though this will get changed, a shell of an example is left here to start from
    // See the FanChartView.js for a full working example
    // FanChartView.mySettingsOptionsObject = new SettingsOptions.SettingsOptionsObject({
    optionsRegistry = {
        tabs: [
            { name: "search", label: "Search", subsections: [] },
            { name: "citation", label: "Citation", subsections: [] },
            {
                name: "addPerson",
                label: "Add Person",
                subsections: [],
                comment:
                    "These options apply to filling fields in the Add Person screen. " +
                    "Person data can be saved when you are on a person page in Ancestry, FamilySearch, etc. " +
                    "It is separate from the citation.",
            },
        ],
        optionsGroups: [],
    };

    // from the optionsRegistry object that is sent into the constructor (data)
    // create the Tab mapping object that maps button and panel elements to each tab
    // e.g. {
    //        general:{panelElement:general-panel, buttonElement:general-tab}
    //      }
    createTabMapping(data) {
        // condLog("createTabMapping : ", data.tabs);
        let theMapping = {};
        for (let tab in data.tabs) {
            // condLog("createTabMapping - TAB:", tab, data.tabs[tab].name);
            let tabName = data.tabs[tab].name;
            let theElement = { panelElement: tabName + "-panel", buttonElement: tabName + "-tab" };
            theMapping[tabName] = theElement;
        }
        // condLog("createTabMapping - THE MAPPING: ", theMapping);

        return theMapping;
    }

    // returns the HTML necessary to create the Settings DIV that matches the SettingsOptionsObject that was just created
    // input --> data is the object passed through from the Dynamic View that needs the settings
    createSettingsDIV(data) {
        const SVGbtnCLOSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z" fill="red"/>
        </svg>`;
        // ORIGINAL FILL COLOUR AT END OF PATH:  #292D32

        let theDIVhtml =
            '<div id=settingsDIV style="display:none; position:absolute; right:20px; background-color:aliceblue; border: solid darkgreen 4px; border-radius: 15px; padding: 15px;}">' +
            '<span style="color:red; position:absolute; top:0.2em; right:0.6em; cursor:pointer;"><A onclick="' +
            data.viewClassName +
            '.cancelSettings();">' +
            SVGbtnCLOSE +
            "</A></span>" +
            this.createULelements(data) +
            '<br />    <div align="center">      <div id="status"></div>      <button id="saveSettingsChanges" class="saveButton">Save changes (all tabs)</button>' +
            "</div></div>";

        return theDIVhtml;
    }

    // returns the inner guts of the Settings DIV  - specifically the UL that holds the tabs, and the <div>s that hold the panels
    // input --> data is the object passed through from the Dynamic View that needs the settings
    // this function is used by the createSettingsDIV function, but could be used standalone if you wanted a different wrapper for your settings
    createULelements(data) {
        // condLog("createULelements : ", data.tabs);
        let theUL = "<ul class='profile-tabs'>";
        let theDIVs = "";
        for (let tab in data.tabs) {
            // condLog("createULelements - TAB:", tab, data.tabs[tab].name);
            let tabName = data.tabs[tab].name;
            theUL += '<li id="' + tabName + '-tab">' + data.tabs[tab].label + "</li>";
            theDIVs += '<div id="' + tabName + '-panel"></div>';
        }
        theUL += "</ul>";
        // condLog("createULelements - THE List: ", theUL);
        // condLog("createULelements - THE DIVs: ", theDIVs);
        return theUL + theDIVs;
    }

    // scours through the optionsRegistry and pulls out all the default values
    // returns an object with each of those settings / defaultValue pairs
    getDefaultOptions() {
        // build the options structure from the optionsRegistry

        let defaultOptions = {};

        // defaultOptions.options_version = 5; // perhaps we will need to revisit this variable if versioning becomes an issue down the road

        for (let optionsGroup of this.optionsRegistry.optionsGroups) {
            let optionNamePrefix = optionsGroup.category + "_" + optionsGroup.subcategory + "_";

            for (let option of optionsGroup.options) {
                if (option.type == "br") {
                    // do not include this - it's not an option but a BR placeholder to space out the options in the Settings DIV
                } else {
                    // THIS option is worth paying attention to!
                    let fullOptionName = optionNamePrefix + option.optionName;
                    defaultOptions[fullOptionName] = option.defaultValue;
                }
            }
        }
        condLog("DEFAULT OPTIONS:", defaultOptions);
        return defaultOptions;
    }

    setActiveTab(tabName) {
        // condLog("setActiveTab called: tabName is: " + tabName);
        // condLog("this:", this);
        // condLog("tabElements" , this.tabElements);

        for (let tab in this.tabElements) {
            let tabElement = this.tabElements[tab];
            // condLog(tabElement);
            if (!tabElement) {
                condLog("setActiveTab: No tab element found for '" + tab + "'");
                continue;
            }
            let tabButtonElement = tabElement.buttonElement;
            let tabPanelElement = tabElement.panelElement;

            if (tabName == tab) {
                tabPanelElement.style.display = "block";
                if (!tabButtonElement.className.includes(" current")) {
                    tabButtonElement.className += " current";
                }
            } else {
                tabPanelElement.style.display = "none";
                tabButtonElement.className = tabButtonElement.className.replace(" current", "");
            }
        }
    }

    activeTabChanged(tabName) {
        self.setActiveTab(tabName);

        // try to keep the same subsection as the last one specifically selected by the user
        // if this subsection exists on this tab
        let subsectionToSet = undefined;
        let tabElement = self.tabElements[tabName];
        // if (lastSubsectionSelected && tabElement) {
        //   let matchingSubsection = tabElement.subsections[lastSubsectionSelected];
        //   if (matchingSubsection) {
        //     subsectionToSet = lastSubsectionSelected;
        //     setActiveSubsection(tabName, lastSubsectionSelected);
        //   }
        // }

        // updateAndSaveOptionsUiState(tabName, subsectionToSet);
    }

    buildPage() {
        const tabMapping = this.tabMapping;
        // e.g. {
        //   general: { panelElement: "general-panel", buttonElement: "general-tab" },
        //   names: { panelElement: "names-panel", buttonElement: "names-tab" },
        //   dates: { panelElement: "dates-panel", buttonElement: "dates-tab" },
        //   places: { panelElement: "places-panel", buttonElement: "places-tab" },
        //   photos: {
        //     panelElement: "photos-panel",
        //     buttonElement: "photos-tab",
        //   },
        //   colours: { panelElement: "colours-panel", buttonElement: "colours-tab" },
        //   highlights: {
        //     panelElement: "highlights-panel",
        //     buttonElement: "highlights-tab",
        //   },
        // };

        this.tabElements = {};
        for (let tab in tabMapping) {
            let tabElementData = tabMapping[tab];
            if (!tabElementData) {
                condLog("buildPage: no tabElementData found for name: " + tab);
                continue;
            }

            let tabPanelElement = document.getElementById(tabElementData.panelElement);
            let tabButtonElement = document.getElementById(tabElementData.buttonElement);

            if (!tabPanelElement) {
                condLog("buildPage: no tabPanelElement found for name: " + tab);
                continue;
            }
            if (!tabButtonElement) {
                condLog("buildPage: no tabButtonElement found for name: " + tab);
                continue;
            }

            this.tabElements[tab] = {
                panelElement: tabPanelElement,
                buttonElement: tabButtonElement,
                subsections: {},
            };
        }

        // Link up the tab panels and buttons and create all the subsection elements
        for (let tab of this.optionsRegistry.tabs) {
            // condLog("buildPage: for tab of this.optionsRegistry : ", tab.name, tab);
            let tabButtonElement = this.tabElements[tab.name].buttonElement;
            tabButtonElement.onclick = function (event) {
                // condLog("going to try to do activeTabChanged", this, self);
                self.activeTabChanged(tab.name);
            };

            let tabPanelElement = this.tabElements[tab.name].panelElement;

            // this is currently empty
            let elementSubsections = this.tabElements[tab.name].subsections;

            if (tab.comment) {
                let commentElement = document.createElement("label");
                commentElement.innerText = tab.comment;
                commentElement.className = "tabComment";
                tabPanelElement.appendChild(commentElement);

                let breakElement = document.createElement("br");
                tabPanelElement.appendChild(breakElement);

                if (tab.help) {
                    // add it right away
                } else {
                    // otherwise, add an extra line break here
                    let breakElement2 = document.createElement("br");
                    tabPanelElement.appendChild(breakElement2);
                }
            }

            if (tab.help) {
                const SVGbtnHELP = `<svg fill="#006600" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
                    width="16" height="16" viewBox="0 0 95.334 95.334"
                    xml:space="preserve">
                <g>
                    <path d="M47.667,0C21.341,0,0.001,21.341,0.001,47.667s21.34,47.667,47.666,47.667s47.666-21.341,47.666-47.667S73.993,0,47.667,0z
                        M53.015,83.251c0,0.854-0.693,1.548-1.549,1.548h-7.611c-0.855,0-1.549-0.693-1.549-1.548v-6.838c0-0.854,0.693-1.548,1.549-1.548
                        h7.611c0.855,0,1.549,0.693,1.549,1.548V83.251z M61.342,50.376c-4.519,3.867-8.085,6.919-8.256,16.878
                        c-0.015,0.846-0.704,1.521-1.548,1.521h-7.742c-0.415,0-0.813-0.166-1.104-0.461c-0.291-0.297-0.451-0.696-0.445-1.11
                        c0.229-14.946,7.059-20.792,12.046-25.06c3.817-3.269,5.366-4.755,5.366-8.772c0-6.617-5.383-12-11.999-12
                        c-6.358,0-11.62,4.969-11.979,11.313c-0.047,0.819-0.726,1.46-1.546,1.46h-7.75c-0.421,0-0.822-0.17-1.114-0.473
                        c-0.292-0.303-0.448-0.71-0.434-1.13c0.444-12.341,10.47-22.008,22.823-22.008c12.593,0,22.837,10.245,22.837,22.837
                        C70.497,42.54,65.421,46.885,61.342,50.376z"/>
                </g>
                </svg>`;
                let helpElement = document.createElement("div");
                helpElement.innerHTML = "<A target='helpDoc' href='" + tab.help + "'>" + SVGbtnHELP + "</A>";
                helpElement.className = "alignRight";
                tabPanelElement.appendChild(helpElement);

                // let breakElement = document.createElement("br");
                // tabPanelElement.appendChild(breakElement);
                // let breakElement2 = document.createElement("br");
                // tabPanelElement.appendChild(breakElement2);
            }

            // Add select for the subsections, we do this even if there is only one subsection
            // for consistency of appearance
            {
                let subsectionSelectElement = document.createElement("select");
                for (let subsection of tab.subsections) {
                    let selectOptionElement = document.createElement("option");
                    selectOptionElement.value = subsection.name;
                    selectOptionElement.innerText = subsection.label;
                    subsectionSelectElement.appendChild(selectOptionElement);
                }
                let labelTextNode = document.createTextNode("Subsection: ");
                let labelElement = document.createElement("label");

                labelElement.appendChild(labelTextNode);
                labelElement.appendChild(subsectionSelectElement);
                labelElement.className = "subsectionSelector";

                // ADDED this option to keep Settings looking cleaner, if NONE of the tabs need subsections, the drop down is more of an eyesore than necessary.
                // THOUGH - there is a good argument in the case where some DO need a subsection, to show it for all, for consistency of look and feel
                if (tab.hideSelect) {
                    labelElement.style = "display:none;";
                }

                tabPanelElement.appendChild(labelElement);

                subsectionSelectElement.onchange = function () {
                    activeSubsectionChanged(tab.name, this.value);
                };

                this.tabElements[tab.name].selectElement = subsectionSelectElement;
            }

            let tabPanelInnerDiv = document.createElement("div");
            tabPanelInnerDiv.className = "subsectionsContainer";
            tabPanelElement.appendChild(tabPanelInnerDiv);

            // add subsections for tab
            for (let subsection of tab.subsections) {
                let divElement = document.createElement("div");
                divElement.className = "subsectionPanel";

                // We used to hae a heading element for the option group but it was just the same
                // as the selector text so there seems no need
                //let headingElement = document.createElement("h3");
                //headingElement.innerText = subsection.label + ":";
                //divElement.appendChild(headingElement);

                tabPanelInnerDiv.appendChild(divElement);

                elementSubsections[subsection.name] = { panelElement: divElement };
            }
        }

        // create all the individual option elements (and subheading elements)
        for (let optionsGroup of this.optionsRegistry.optionsGroups) {
            if (!optionsGroup.tab) {
                condLog("buildPage: optionsGroup has no tab, optionsGroup is:");
                condLog(optionsGroup);
                continue;
            }

            if (!optionsGroup.subsection) {
                condLog("buildPage: optionsGroup has no subsection, optionsGroup is:");
                condLog(optionsGroup);
                continue;
            }

            let tabName = optionsGroup.tab;
            let subsectionName = optionsGroup.subsection;

            let tabElementObj = this.tabElements[tabName];
            if (!tabElementObj) {
                condLog("buildPage: no element found for tab: " + tabName);
                continue;
            }

            let subsectionPanelElement = tabElementObj.subsections[subsectionName].panelElement;

            if (!subsectionPanelElement) {
                condLog("buildPage: no subsectionElement found for name: " + subsectionName);
                condLog(this.tabElements);
                condLog("optionsGroup is:");
                condLog(optionsGroup);
                continue;
            }

            // if this group has a subheading then create a heading element
            if (optionsGroup.subheading) {
                let subheading = self.getRegistrySubheading(tabName, subsectionName, optionsGroup.subheading);
                if (subheading) {
                    let label = subheading.label;
                    let subheadingElement = document.createElement("h4");
                    subheadingElement.innerText = label + ":";
                    subsectionPanelElement.appendChild(subheadingElement);
                }
            }

            let optionNamePrefix = optionsGroup.category + "_" + optionsGroup.subcategory + "_";

            for (let option of optionsGroup.options) {
                let fullOptionName = optionNamePrefix + option.optionName;

                let optionDivElement = document.createElement("div");

                let optionElement = undefined;

                if (option.type == "checkbox") {
                    optionElement = document.createElement("input");
                    optionElement.type = "checkbox";
                    optionElement.className = "optionCheckbox";
                    if (option.defaultValue == true) {
                        optionElement.checked = true;
                    }

                    let labelTextNode = document.createTextNode(" " + option.label);

                    let labelElement = document.createElement("label");

                    if (option.indent && option.indent > 0) {
                        let indentText = "";
                        for (let indent = 0; indent < option.indent; indent++) {
                            indentText += "_";
                        }
                        let indentTextNode = document.createElement("label");
                        indentTextNode.innerText = (indentText);
                        indentTextNode.style.color = "aliceblue";
                        labelElement.append(indentTextNode);                        
                    }


                    labelElement.appendChild(optionElement);
                    labelElement.appendChild(labelTextNode);

                    optionDivElement.appendChild(labelElement);
                    
                    

                } else if (option.type == "radio") {
                    optionElement = document.createElement("radio");

                    let labelElement = document.createElement("label");

                    if (option.label > "") {
                        let labelTextNode = document.createTextNode(option.label + ": ");
                        labelElement.appendChild(labelTextNode);
                    }

                    let radioNum = 0;
                    for (let value of option.values) {
                        if (value.value == "br") {
                            // condLog("Found BR in options values", value);
                            // IN CASE there is a LONG list of radio button options
                            // or a visual breaking them down into more similar chunks is needed
                            // a bogus value of "br" is put in the original initObject to force a line break
                            let breakElement = document.createElement("br");
                            labelElement.appendChild(breakElement);
                            if (value.label && value.label > "") {
                                let labelTextNode = document.createTextNode(" " + value.label);
                                labelElement.appendChild(labelTextNode);
                                let breakElement2 = document.createElement("br");
                                labelElement.appendChild(breakElement2);
                            }
                        } else {
                            let radioOptionElement = document.createElement("input");
                            radioOptionElement.value = value.value;
                            // radioOptionElement.className = "optionCheckbox";
                            radioOptionElement.type = "radio";
                            radioOptionElement.name = fullOptionName + "_radio";
                            radioNum++;
                            radioOptionElement.id = fullOptionName + "_radio" + radioNum;
                            if (option.defaultValue == value.value) {
                                radioOptionElement.checked = true;
                            }

                            labelElement.appendChild(radioOptionElement);
                            if (value.text == "SVG") {
                                let optionSVGNode = document.createElement("SVG");
                                optionSVGNode.id = fullOptionName + "_SVG" + radioNum;
                                labelElement.appendChild(optionSVGNode);
                            } else if (value.text && value.text.indexOf("IMG:") == 0) {
                                let optionIMGNode = document.createElement("IMG");
                                optionIMGNode.id = fullOptionName + "_IMG" + radioNum;
                                optionIMGNode.src = value.text.substring(4);
                                if (value.width > 0) {
                                    optionIMGNode.width = value.width;
                                }
                                labelElement.appendChild(optionIMGNode);
                            } else {
                                let optionLabelTextNode = document.createTextNode(" " + value.text);
                                labelElement.appendChild(optionLabelTextNode);
                            }

                            if (value.addOtherTextField === true) {
                                // console.log("ADD AN OTHER TEXT FIELD RIGHT HERE !!!");


                                let otherElement = document.createElement("input");
                                otherElement.type = "text";
                                otherElement.id = fullOptionName + "_otherValue";
                                // otherElement.className = "optionNumber";
                                if (value.maxLength && value.maxLength > 0) {
                                    otherElement.size = value.maxLength * 1.0 + 1;
                                    otherElement.maxlength = value.maxLength;
                                }
                                if (option.defaultOtherValue) {
                                    otherElement.value = option.defaultOtherValue;
                                } else if (value.otherValue) {
                                    otherElement.value = value.otherValue;
                                }
                                otherElement.style.padding = "2px";

                                
                                labelElement.appendChild(otherElement);
                                


                            }
                        }
                    }
                    optionDivElement.appendChild(labelElement);
                } else if (option.type == "select") {
                    optionElement = document.createElement("select");
                    optionElement.className = "optionSelect selectSimpleDropDown";
                    // optionElement.onClick = "optionElementJustChanged();";

                    for (let value of option.values) {
                        let selectOptionElement = document.createElement("option");
                        selectOptionElement.value = value.value;
                        selectOptionElement.innerText = value.text;
                        if (option.defaultValue == value.value) {
                            selectOptionElement.selected = true;
                        }
                        optionElement.appendChild(selectOptionElement);
                    }

                    let labelTextNode = document.createTextNode(option.label + ": ");

                    let labelElement = document.createElement("label");
                    labelElement.id = fullOptionName + "_label";

                    labelElement.appendChild(labelTextNode);
                    // labelElement.appendChild(optionElement);
                    optionDivElement.appendChild(labelElement);
                    optionDivElement.appendChild(optionElement);
                } else if (option.type == "number") {
                    optionElement = document.createElement("input");
                    optionElement.type = "number";
                    optionElement.className = "optionNumber";
                    if (option.defaultValue) {
                        optionElement.value = option.defaultValue;
                    }

                    let labelTextNode = document.createTextNode(option.label + ": ");

                    let labelElement = document.createElement("label");
                    labelElement.id = fullOptionName + "_label";

                    labelElement.appendChild(labelTextNode);
                    labelElement.appendChild(optionElement);
                    optionDivElement.appendChild(labelElement);
                } else if (option.type == "text") {
                    optionElement = document.createElement("input");
                    optionElement.type = "text";
                    // optionElement.className = "optionNumber";
                    if (option.maxLength && option.maxLength > 0) {
                        optionElement.size = (option.maxLength * 1.0 + 1);
                        optionElement.maxlength = option.maxLength;
                    }
                    if (option.defaultValue) {
                        optionElement.value = option.defaultValue;
                    }
                    optionElement.style.padding = "2px";

                    let labelTextNode = document.createTextNode(option.label + ": ");

                    let labelElement = document.createElement("label");
                    labelElement.id = fullOptionName + "_label";

                    labelElement.appendChild(labelTextNode);
                    labelElement.appendChild(optionElement);
                    optionDivElement.appendChild(labelElement);
                } else if (option.type == "color" || option.type == "colour") {
                    optionElement = document.createElement("input");
                    optionElement.type = "color";
                    optionElement.className = "optionNumber";

                    let labelTextNode = document.createTextNode(option.label + ": ");

                    let labelElement = document.createElement("label");
                    labelElement.id = fullOptionName + "_label";

                    labelElement.appendChild(labelTextNode);
                    labelElement.appendChild(optionElement);
                    optionDivElement.appendChild(labelElement);
                } else if (option.type == "br") {
                    // condLog("TRYING to BR", option);
                    optionElement = document.createElement("label");
                    if (option.label && option.label > "") {
                        let labelTextNode = document.createTextNode(" " + option.label);
                        optionElement.appendChild(labelTextNode);
                    }
                    optionDivElement.appendChild(optionElement);
                }

                optionElement.id = fullOptionName;

                if (option.comment) {
                    let breakElement = document.createElement("br");
                    optionDivElement.appendChild(breakElement);

                    let commentElement = document.createElement("label");
                    commentElement.innerText = option.comment;
                    commentElement.className = "optionComment";
                    optionDivElement.appendChild(commentElement);
                }

                let breakElement = document.createElement("br");
                breakElement.id = fullOptionName + "_BR";
                optionDivElement.appendChild(breakElement);

                subsectionPanelElement.appendChild(optionDivElement);
            }
        }
    }

    getRegistryTab(tabName) {
        for (let tab of self.optionsRegistry.tabs) {
            if (tab.name == tabName) {
                return tab;
            }
        }

        condLog("getRegistryTab: not found: " + tabName);
    }

    getRegistrySubsection(tabName, subsectionName) {
        let tab = self.getRegistryTab(tabName);

        if (tab) {
            for (let subsection of tab.subsections) {
                if (subsection.name == subsectionName) {
                    return subsection;
                }
            }
        }
        condLog("getRegistrySubsection: not found: " + tabName + ", " + subsectionName);
    }

    getRegistrySubheading(tabName, subsectionName, subheadingName) {
        let subsection = self.getRegistrySubsection(tabName, subsectionName);

        if (subsection) {
            for (let subheading of subsection.subheadings) {
                if (subheading.name == subheadingName) {
                    return subheading;
                }
            }
        }
        condLog("getRegistrySubheading: not found: " + tabName + ", " + subsectionName + ", " + subheadingName);
    }

    /**
     * hasSettingsChanged
     * - will process a settings object (theCurrentSettings)
     * & compare each setting to the related document HTML components from the Settings DIV
     * & establish the new value for said setting.
     *
     * @param {from View} theCurrentSettings  - object of setting / value pairs
     * @returns {Boolean} true if there is a change from the original settings object and the values found in the Settings DIV
     */
    hasSettingsChanged(theCurrentSettings) {
        let settingsChanged = false;

        for (let setting in theCurrentSettings) {
            let thisSettingObj = document.getElementById(setting);
            let thisVal = "?";
            let thisType = "?";

            if (thisSettingObj) {
                thisType = thisSettingObj.type;
                if (thisType == "checkbox") {
                    thisVal = thisSettingObj.checked;
                } else if (thisType == "number" || thisType == "text") {
                    thisVal = thisSettingObj.value;
                } else if (thisType == "select-one") {
                    thisVal = thisSettingObj.value;
                }
            } else {
                // radio buttons each have their own unique ID, so they are numbered
                // NOTE:  Currently there is a hard cap of 10 on # of radio button options
                // This arbitrary number might need to be adjusted
                // - but - one wonders if you need more than 10 options, you may need to rethink your parameters
                thisSettingObj = document.getElementById(setting + "_radio1");

                let currCounter = 1;
                if (thisSettingObj) {
                    thisType = thisSettingObj.type;
                    if (thisSettingObj.checked == true) {
                        thisVal = thisSettingObj.value;
                    } else {
                        while (currCounter < 10 && thisVal == "?") {
                            currCounter++;
                            thisSettingObj = document.getElementById(setting + "_radio" + currCounter);
                            if (thisSettingObj) {
                                if (thisSettingObj.checked == true) {
                                    thisVal = thisSettingObj.value;
                                }
                            }
                        }
                    }
                }
                // CHECK for OTHER VALUE text field trailing at the end of a set of Radio Button options
                let thisSettingObjOtherValue = document.getElementById(setting + "_otherValue");
                if (thisSettingObjOtherValue) {
                    let otherVal = thisSettingObjOtherValue.value;
                    if (theCurrentSettings[setting + "_otherValue"] != otherVal) {
                        settingsChanged = true;
                    }
                    theCurrentSettings[setting + "_otherValue"] = otherVal;
                }


            }
            if (thisVal != "?") {
                if (theCurrentSettings[setting] != thisVal) {
                    settingsChanged = true;
                }
                theCurrentSettings[setting] = thisVal;
            }
            // condLog("Setting:", setting, thisVal, thisType);
        }

        // condLog("POST  - NEW CURRENT settings are:", theCurrentSettings);

        return settingsChanged;
    }

    // Simple method to ensure the first letter of a word is UPPER CASE
    UpperCaseFirstLetter(name) {
        let Name = name[0].toUpperCase() + name.substring(1);
        return Name;
    }

    /**
     *
     * THE FUNCTIONS BELOW are from ROB PAVEY's ORIGINAL repo
     * They have NOT YET been incorporated into this Class
     *
     */

    // import { callFunctionWithStoredOptions } from "./options_loader.mjs";
    // async function callFunctionWithStoredOptions(optionsFunction) {
    //   let defaultOptions = getDefaultOptions();

    //   let loadedOptions = await loadOptions();

    //   let optionsObject = undefined;
    //   if (loadedOptions) {
    //     if (!loadedOptions.options_version) {
    //       // just in case the version failed to load
    //       loadedOptions.options_version = defaultOptions.options_version;
    //     }

    //     let convertedOptions = convertOptions(loadedOptions, defaultOptions);
    //     // We used to use the spread operator to merge the stored options and the ones from defaultOptions with
    //     // the stored ones taking priority. Out a a concern that no longer used options (that the converter forgot)
    //     // would build up it was changed to use a function.
    //     optionsObject = addNewDefaultsAndRemoveOldOptions(convertedOptions, defaultOptions);
    //   } else {
    //     optionsObject = defaultOptions;
    //   }

    //   options = optionsObject;

    //   optionsFunction(options);
    // }

    // // import { optionsRegistry } from "../../core/options/options_database.mjs";

    // import { getLocalStorageItem } from "/base/browser/common/browser_compat.mjs";

    // // import { getDefaultOptions } from "../../core/options/options_database.mjs";
    // function

    // // import { saveOptions } from "./options_storage.mjs";
    // // Saves options to chrome.storage
    // async function saveOptions(options) {
    //   let saveFormatOptions = convertOptionsObjectToSaveFormat(options);

    //   // set the values in the stored user options
    //   try {
    //     chrome.storage.sync.set(
    //       {
    //         options_search: saveFormatOptions.search,
    //         options_citation: saveFormatOptions.citation,
    //         options_narrative: saveFormatOptions.narrative,
    //         options_table: saveFormatOptions.table,
    //         options_addPerson: saveFormatOptions.addPerson,
    //         options: saveFormatOptions.options,
    //       },
    //       function () {
    //         if (!chrome.runtime.lastError) {
    //           // Update status to let user know options were saved.
    //           var status = document.getElementById("status");
    //           status.textContent = "Options saved.";
    //           setTimeout(function () {
    //             status.textContent = "";
    //           }, 750);
    //         } else {
    //           condLog("saveOptions: Runtime error is:");
    //           condLog(chrome.runtime.lastError);

    //           chrome.storage.sync.getBytesInUse(null, function (bytesInUse) {
    //             condLog("saveOptions: total sync storage in use is : " + bytesInUse);
    //           });

    //           // This fixed the issue in iPad simulator. But it seems a bit drastic...
    //           // The saved failed, clear all sync storage and try again.
    //           // Since this extension ONLY uses the sync storage area for user options it should not lose
    //           // data unless the second save fails also.
    //           chrome.storage.sync.clear(function () {
    //             chrome.storage.sync.set(
    //               {
    //                 options_search: saveFormatOptions.search,
    //                 options_citation: saveFormatOptions.citation,
    //                 options_narrative: saveFormatOptions.narrative,
    //                 options_table: saveFormatOptions.table,
    //                 options_addPerson: saveFormatOptions.addPerson,
    //                 options: saveFormatOptions.options,
    //               },
    //               function () {
    //                 if (!chrome.runtime.lastError) {
    //                   // Update status to let user know options were saved.
    //                   var status = document.getElementById("status");
    //                   status.textContent = "Options saved.";
    //                   setTimeout(function () {
    //                     status.textContent = "";
    //                   }, 750);
    //                 } else {
    //                   condLog("saveOptions, after clear: Runtime error is:");
    //                   condLog(chrome.runtime.lastError);

    //                   chrome.storage.sync.getBytesInUse(null, function (bytesInUse) {
    //                     condLog("saveOptions, after clear: total sync storage in use is : " + bytesInUse);
    //                   });

    //                   var status = document.getElementById("status");
    //                   status.textContent = "Options could not be saved.";
    //                   setTimeout(function () {
    //                     status.textContent = "";
    //                   }, 5000);
    //                 }
    //               }
    //             );
    //           });
    //         }
    //       }
    //     );
    //   } catch (e) {
    //     condLog("saveOptions: caught error is:");
    //     condLog(e);

    //     chrome.storage.sync.getBytesInUse(null, function (bytesInUse) {
    //       condLog("saveOptions: total sync storage in use is : " + bytesInUse);
    //     });

    //     var status = document.getElementById("status");
    //     status.textContent = "Options could not be saved.";
    //     setTimeout(function () {
    //       status.textContent = "";
    //     }, 5000);
    //   }
    // }

    // // Restores select box and checkbox state using the preferences
    // // stored in chrome.storage.
    // function restoreOptions() {
    //   // get the values from the stored user options
    //   callFunctionWithStoredOptions(function (options) {
    //     for (let optionsGroup of optionsRegistry.optionsGroups) {
    //       let optionNamePrefix = optionsGroup.category + "_" + optionsGroup.subcategory + "_";

    //       for (let option of optionsGroup.options) {
    //         let fullOptionName = optionNamePrefix + option.optionName;

    //         let element = document.getElementById(fullOptionName);
    //         if (!element) {
    //           condLog("restoreOptions: no element found with id: " + fullOptionName);
    //           continue;
    //         }

    //         if (option.type == "checkbox") {
    //           element.checked = options[fullOptionName];
    //         } else {
    //           element.value = options[fullOptionName];
    //         }
    //       }
    //     }
    //   });
    // }

    // function setActiveSubsection(tabName, subsectionName) {
    //   //condLog("setActiveTab called: tabName is: " + tabName);

    //   let tabElement = tabElements[tabName];
    //   if (!tabElement) {
    //     condLog("setActiveTab: No tab element found for '" + tab + "'");
    //     return;
    //   }

    //   for (let subsectionKey in tabElement.subsections) {
    //     let subsection = tabElement.subsections[subsectionKey];
    //     let panelElement = subsection.panelElement;

    //     if (subsectionName == subsectionKey) {
    //       panelElement.style.display = "block";
    //     } else {
    //       panelElement.style.display = "none";
    //     }
    //   }

    //   if (tabElement.selectElement) {
    //     tabElement.selectElement.value = subsectionName;
    //   }
    // }

    // var uiState = {
    //   activeTab: "search",
    //   activeSubsectionForTab: {
    //     search: "general",
    //     citation: "general",
    //     narrative: "general",
    //     table: "general",
    //     addPerson: "general",
    //   },
    // };

    // async function saveOptionsUiState() {
    //   let items = { options_uiState: uiState };
    //   chrome.storage.local.set(items);
    // }

    // async function restoreOptionsUiState() {
    //   let savedUiState = await getLocalStorageItem("options_uiState");
    //   if (savedUiState) {
    //     uiState = savedUiState;
    //   }
    // }

    // async function updateAndSaveOptionsUiState(tabName, subsectionName) {
    //   if (tabName) {
    //     uiState.activeTab = tabName;

    //     if (subsectionName) {
    //       uiState.activeSubsectionForTab[tabName] = subsectionName;
    //     }
    //   }
    //   saveOptionsUiState();
    // }

    // async function restoreOptionsUiStateAndSetState() {
    //   await restoreOptionsUiState();

    //   setActiveTab(uiState.activeTab);
    //   for (let tab in uiState.activeSubsectionForTab) {
    //     setActiveSubsection(tab, uiState.activeSubsectionForTab[tab]);
    //   }
    // }

    // async function saveOptionsFromPage() {
    //   // get the values from the options page

    //   let options = getDefaultOptions();
    //   for (let optionsGroup of optionsRegistry.optionsGroups) {
    //     let optionNamePrefix = optionsGroup.category + "_" + optionsGroup.subcategory + "_";

    //     for (let option of optionsGroup.options) {
    //       let fullOptionName = optionNamePrefix + option.optionName;

    //       let element = document.getElementById(fullOptionName);
    //       if (!element) {
    //         condLog("saveOptionsFromPage: no element found with id: " + fullOptionName);
    //         continue;
    //       }

    //       if (option.type == "checkbox") {
    //         options[fullOptionName] = element.checked;
    //       } else {
    //         options[fullOptionName] = element.value;
    //       }
    //     }
    //   }

    //   saveOptions(options);
    // }

    // var lastSubsectionSelected = undefined;

    // function activeSubsectionChanged(tabName, subsectionName) {
    //   setActiveSubsection(tabName, subsectionName);
    //   updateAndSaveOptionsUiState(tabName, subsectionName);
    //   lastSubsectionSelected = subsectionName;
    // }

    //   restoreOptionsUiStateAndSetState();

    //   restoreOptions();

    //   document.getElementById("save").addEventListener("click", saveOptionsFromPage);
};

// document.addEventListener("DOMContentLoaded", buildPage);
