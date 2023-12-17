import { Utils } from "../../shared/Utils.js";

export class Settings {
    static APP_ID = "CC7";
    static current = {};
    static #optionsObj;
    static #nextZLevel = 10000;

    static getNextZLevel() {
        return ++Settings.#nextZLevel;
    }

    static setNextZLevel(n) {
        Settings.#nextZLevel = n;
    }

    static hasSettingsChanged() {
        return Settings.#optionsObj.hasSettingsChanged(Settings.current);
    }

    static getSettingsDiv() {
        return Settings.#optionsObj.createdSettingsDIV;
    }

    // These images were obtained from either https://www.wikitree.com/wiki/Space:RTC_-_Resources
    // or https://uxwing.com/. The latter states: "Exclusive collection of free icons download for
    // commercial projects without attribution"
    static dyIcons = [
        {
            value: "47px-RTC_-_Pictures.jpeg",
            text: "IMG:views/cc7/images/47px-RTC_-_Pictures.jpeg",
            width: 30,
        },
        {
            value: "diedYoung.png",
            text: "IMG:views/cc7/images/diedYoung.png",
            width: 30,
        },
        {
            value: "RTC_-_Pictures-6.png",
            text: "IMG:views/cc7/images/RTC_-_Pictures-6.png",
            width: 30,
        },
        { value: "br" },
        {
            value: "50px-Remember_the_Children-26.png",
            text: "IMG:views/cc7/images/50px-Remember_the_Children-26.png",
            width: 30,
        },
        {
            value: "Remember_the_Children-21.png",
            text: "IMG:views/cc7/images/Remember_the_Children-21.png",
            width: 30,
        },
        {
            value: "Remember_the_Children-27.png",
            text: "IMG:views/cc7/images/Remember_the_Children-27.png",
            width: 30,
        },
        { value: "br" },
        {
            value: "butterfly-icon.png",
            text: "IMG:views/cc7/images/butterfly-icon.png",
            width: 30,
        },
        {
            value: "flower-plant-icon.png",
            text: "IMG:views/cc7/images/flower-plant-icon.png",
            width: 30,
        },
        {
            value: "candle-light-icon.png",
            text: "IMG:views/cc7/images/candle-light-icon.png",
            width: 15,
        },
        { value: "br" },
        {
            value: "flower-rose-icon.png",
            text: "IMG:views/cc7/images/flower-rose-icon.png",
            width: 30,
        },
        {
            value: "aids-ribbon-icon.png",
            text: "IMG:views/cc7/images/aids-ribbon-icon.png",
            width: 30,
        },
        {
            value: "candle-light-color-icon.png",
            text: "IMG:views/cc7/images/candle-light-color-icon.png",
            width: 15,
        },
    ];

    static optionsDef = {
        viewClassName: "CC7View",
        tabs: [
            {
                name: "icons",
                label: "Died Young Icons",
                hideSelect: true,
                subsections: [{ name: "DiedYoungIcons", label: "Died young icons" }],
                // comment: "",
            },
            {
                name: "biocheck",
                label: "Bio Check",
                hideSelect: true,
                subsections: [{ name: "BioCheckOptions", label: "Bio Check Options" }],
                // comment: "",
            },
            {
                name: "missingFamily",
                label: "Missing Family",
                hideSelect: true,
                subsections: [{ name: "mfOptions", label: "Missing Family Options" }],
                // comment: "",
            },
        ],
        optionsGroups: [
            {
                tab: "icons",
                subsection: "DiedYoungIcons",
                category: "icons",
                subcategory: "options",
                options: [
                    {
                        optionName: "sect1",
                        comment: "Icon to use for a child that died before age 5:",
                        type: "br",
                    },
                    {
                        optionName: "veryYoung",
                        type: "radio",
                        label: "",
                        values: Settings.dyIcons,
                        defaultValue: "47px-RTC_-_Pictures.jpeg",
                    },
                    {
                        optionName: "sect2",
                        comment: "Icon to use for a child that died before age 16:",
                        type: "br",
                    },
                    {
                        optionName: "young",
                        type: "radio",
                        label: "",
                        values: Settings.dyIcons,
                        defaultValue: "50px-Remember_the_Children-26.png",
                    },
                ],
            },
            {
                tab: "biocheck",
                subsection: "BioCheckOptions",
                category: "biocheck",
                subcategory: "options",
                options: [
                    {
                        optionName: "bioComment",
                        comment: "Enabling Bio Check only comes into effect at subsequent GET button clicks.",
                        type: "br",
                    },
                    {
                        optionName: "biocheckOn",
                        type: "checkbox",
                        label: "Enable Bio Check on all profiles",
                        defaultValue: 0,
                    },
                    {
                        optionName: "sect2",
                        comment: "Don't highlight the following Bio Check Issues:",
                        type: "br",
                    },
                    {
                        optionName: "sectbr",
                        label: "Section Messages",
                        type: "br",
                    },
                    // The messages below and the regular expressions that match them were obtained by grepping for
                    // 'Messages.push' in lib/biocheck-api/src/Biography.js and by comparing the result with
                    //   https://www.wikitree.com/wiki/Space:BioCheckHelp#Required_Sections and
                    //   https://www.wikitree.com/wiki/Space:BioCheckHelp#Style_Issues
                    //
                    // Note that the capitalisation in the latter 2 places cannot be trusted.
                    //
                    // --- Required Section Messages ----------------------------------------------
                    {
                        optionName: "ackb4src",
                        type: "checkbox",
                        label: "Acknowledgements before Sources",
                        defaultValue: 0,
                        re: /^Acknowledgements before/,
                    },
                    {
                        optionName: "acksubsec",
                        type: "checkbox",
                        label: "Acknowledgements not a section",
                        defaultValue: 0,
                        re: /^Acknowledgements subsection/,
                    },
                    {
                        optionName: "adnotend",
                        type: "checkbox",
                        label: "Advance Directive not at end of profile",
                        defaultValue: 0,
                        re: /^Advance Directive is not/,
                    },
                    {
                        optionName: "adsubsec",
                        type: "checkbox",
                        label: "Advance Directive not a section",
                        defaultValue: 0,
                        re: /^Advance Directive subsection/,
                    },
                    {
                        optionName: "bioempty",
                        type: "checkbox",
                        label: "Biography is empty",
                        defaultValue: 0,
                        re: /^Biography is empty/,
                    },
                    {
                        optionName: "comnoend",
                        type: "checkbox",
                        label: "Comment with no ending",
                        defaultValue: 0,
                        re: /^Comment with no ending/,
                    },
                    {
                        optionName: "irefafter",
                        type: "checkbox",
                        label: "Inline <ref> tag after <references >",
                        defaultValue: 0,
                        re: /^Inline <ref> tag after/,
                    },
                    {
                        optionName: "irefnoend",
                        type: "checkbox",
                        label: "Inline <ref> tag with no ending </ref> tag",
                        defaultValue: 0,
                        re: /^Inline <ref> tag with/,
                    },
                    {
                        optionName: "linesbetween",
                        type: "checkbox",
                        label: "Lines between Sources and <references />",
                        defaultValue: 0,
                        re: /lines? between Sources/,
                    },
                    {
                        optionName: "munsrc",
                        type: "checkbox",
                        label: "Marked unsourced",
                        defaultValue: 0,
                        re: /^Profile is marked unsourced$/,
                    },
                    {
                        optionName: "munsrcbut",
                        type: "checkbox",
                        label: "Marked unsourced but may have sources",
                        defaultValue: 0,
                        re: /^Profile is marked unsourced but/,
                    },
                    {
                        optionName: "maybeunsrc",
                        type: "checkbox",
                        label: "May be unsourced",
                        defaultValue: 0,
                        re: /^Profile may be/,
                    },
                    {
                        optionName: "misref",
                        type: "checkbox",
                        label: "Missing <references /> tag",
                        defaultValue: 0,
                        re: /^Missing <references/,
                    },
                    {
                        optionName: "misbio",
                        type: "checkbox",
                        label: "Missing Biography heading",
                        defaultValue: 0,
                        re: /^Missing Biography/,
                    },
                    {
                        optionName: "missrc",
                        type: "checkbox",
                        label: "Missing Sources heading",
                        defaultValue: 0,
                        re: /^Missing Sources/,
                    },
                    {
                        optionName: "multiref",
                        type: "checkbox",
                        label: "Multiple <references /> tag",
                        defaultValue: 0,
                        re: /^Multiple <references/,
                    },
                    {
                        optionName: "multibio",
                        type: "checkbox",
                        label: "Multiple Biography headings",
                        defaultValue: 0,
                        re: /^Multiple Biography/,
                    },
                    {
                        optionName: "multisrc",
                        type: "checkbox",
                        label: "Multiple Sources headings",
                        defaultValue: 0,
                        re: /^Multiple Sources/,
                    },
                    {
                        optionName: "nodates",
                        type: "checkbox",
                        label: "Profile has no dates",
                        defaultValue: 0,
                        re: /^Profile has no dates/,
                    },
                    {
                        optionName: "badsrcs",
                        type: "checkbox",
                        label: "Sources not reliable/clearly identified",
                        defaultValue: 0,
                        re: /^Bio Check found sources/,
                    },
                    {
                        optionName: "srcsubsec",
                        type: "checkbox",
                        label: "Sources not a section",
                        defaultValue: 0,
                        re: /^Sources subsection/,
                    },
                    {
                        optionName: "spannoend",
                        type: "checkbox",
                        label: "Span with no end",
                        defaultValue: 0,
                        re: /^Span with no end/,
                    },
                    {
                        optionName: "stylebr",
                        label: "Style Messages",
                        type: "br",
                    },
                    // --- Style Messages -----------------------------------------
                    {
                        optionName: "adnonmem",
                        type: "checkbox",
                        label: "Advance Directive on non member",
                        defaultValue: 0,
                        re: /^Advance Directive on a non/,
                    },
                    {
                        optionName: "biohdb4",
                        type: "checkbox",
                        label: "Biography heading before ...",
                        defaultValue: 0,
                        re: /^Biography heading before/,
                    },
                    {
                        optionName: "brnoend",
                        type: "checkbox",
                        label: "<BR without ending >",
                        defaultValue: 0,
                        re: /^Biography has <BR/,
                    },
                    {
                        optionName: "ecnbb4",
                        type: "checkbox",
                        label: "Easily Confused Box before ...",
                        defaultValue: 0,
                        re: /^Easily Confused/,
                    },
                    {
                        optionName: "secempty",
                        type: "checkbox",
                        label: "Empty section",
                        defaultValue: 0,
                        re: /^Empty Biography section/,
                    },
                    {
                        optionName: "headb4bio",
                        type: "checkbox",
                        label: "Heading before Biography",
                        defaultValue: 0,
                        re: /^Heading or subheading/,
                    },
                    {
                        optionName: "horizb4bio",
                        type: "checkbox",
                        label: "Horizontal rule before Biography",
                        defaultValue: 0,
                        re: /^Horizontal rule before/,
                    },
                    {
                        optionName: "bioemail",
                        type: "checkbox",
                        label: "Might contain email address",
                        defaultValue: 0,
                        re: /^Biography may contain email/,
                    },
                    {
                        optionName: "misrnb",
                        type: "checkbox",
                        label: "Missing Research Note box",
                        defaultValue: 0,
                        re: /^Missing Research/,
                    },
                    {
                        optionName: "navnb4h",
                        type: "checkbox",
                        label: "Navigation Box not before Biography",
                        defaultValue: 0,
                        re: /^Navigation.+should be before Biography h/,
                    },
                    {
                        optionName: "navnb4r",
                        type: "checkbox",
                        label: "Navigation Box not before Research Note",
                        defaultValue: 0,
                        re: /^Navigation.+should be before Research Note/,
                    },
                    {
                        optionName: "navnb4p",
                        type: "checkbox",
                        label: "Navigation Box not before Project Box",
                        defaultValue: 0,
                        re: /^Navigation.+should be before Project Box/,
                    },
                    {
                        optionName: "navnb4s",
                        type: "checkbox",
                        label: "Navigation Box not before Succession",
                        defaultValue: 0,
                        re: /^Navigation.+should be before.+Navigation/,
                    },
                    {
                        optionName: "navstatus",
                        type: "checkbox",
                        label: "Navigation Box status",
                        defaultValue: 0,
                        re: /^Navigation.+is/,
                    },
                    {
                        optionName: "nrhtml",
                        type: "checkbox",
                        label: "Not-recommended HTML tag(s)",
                        defaultValue: 0,
                        re: /^Biography contains HTML/,
                    },
                    {
                        optionName: "pbb4",
                        type: "checkbox",
                        label: "Project Box before ...",
                        defaultValue: 0,
                        re: /^Project Box before/,
                    },
                    {
                        optionName: "pnb4bio",
                        type: "checkbox",
                        label: "Project ... not before Biography",
                        defaultValue: 0,
                        re: /^Project:.+should be before B/,
                    },
                    {
                        optionName: "pnb4s",
                        type: "checkbox",
                        label: "Project ... not before Succession",
                        defaultValue: 0,
                        re: /^Project:.+should be before S/,
                    },
                    {
                        optionName: "rnbb4",
                        type: "checkbox",
                        label: "Research Note Box before ...",
                        defaultValue: 0,
                        re: /^Research Note Box before/,
                    },
                    {
                        optionName: "rnbnb4b",
                        type: "checkbox",
                        label: "Research Note Box not before Biography",
                        defaultValue: 0,
                        re: /^Research Note Box:.+should be before B/,
                    },
                    {
                        optionName: "rnbnb4p",
                        type: "checkbox",
                        label: "Research Note Box not before Project Box",
                        defaultValue: 0,
                        re: /^Research Note Box:.+should be before P/,
                    },
                    {
                        optionName: "rnbnb4s",
                        type: "checkbox",
                        label: "Research Note Box not before Succession",
                        defaultValue: 0,
                        re: /^Research Note Box:.+should be before S/,
                    },
                    {
                        optionName: "rnbstatus",
                        type: "checkbox",
                        label: "Research Note Box status",
                        defaultValue: 0,
                        re: /^Research Note Box:.+is.+status/,
                    },
                    {
                        optionName: "stcknabio",
                        type: "checkbox",
                        label: "Sticker not after Biography heading",
                        defaultValue: 0,
                        re: /^Sticker.+should be after/,
                    },
                    {
                        optionName: "sumb4",
                        type: "checkbox",
                        label: "Succession Navigation Box before ...",
                        defaultValue: 0,
                        re: /^Succession.+before/,
                    },
                    {
                        optionName: "sumb4",
                        type: "checkbox",
                        label: "Summary Text before ...",
                        defaultValue: 0,
                        re: /^Summary Text before/,
                    },
                    {
                        optionName: "ulb4bio",
                        type: "checkbox",
                        label: "Unexpected line before ...",
                        defaultValue: 0,
                        re: /^Unexpected line before/,
                    },
                    {
                        optionName: "ulmore",
                        type: "checkbox",
                        label: "Unexpected line ... more follow",
                        defaultValue: 0,
                        re: /^Unexpected line.+more/,
                    },
                    {
                        optionName: "wronglvl",
                        type: "checkbox",
                        label: "Wrong level heading",
                        defaultValue: 0,
                        re: /^Wrong level/,
                    },
                ],
            },
            {
                tab: "missingFamily",
                subsection: "mfOptions",
                category: "missingFamily",
                subcategory: "options",
                options: [
                    {
                        optionName: "mfComment",
                        comment: "Include profiles with:",
                        type: "br",
                    },
                    {
                        optionName: "noParents",
                        type: "checkbox",
                        label: "No parents",
                        defaultValue: 1,
                    },
                    {
                        optionName: "oneParent",
                        type: "checkbox",
                        label: "One parent",
                        defaultValue: 1,
                    },
                    {
                        optionName: "noNoSpouses",
                        type: "checkbox",
                        label: 'The "No more spouses" box unchecked',
                        defaultValue: 1,
                    },
                    {
                        optionName: "noNoChildren",
                        type: "checkbox",
                        label: 'The "No more children" box unchecked',
                        defaultValue: 1,
                    },
                    {
                        optionName: "noChildren",
                        type: "checkbox",
                        label: 'No children and the "No more children" box unchecked',
                        defaultValue: 1,
                    },
                ],
            },
        ],
    };

    static collectREs() {
        // Collect the regular expressions associated with each of the messages in BioCheckOptions above
        const regExes = [];
        const bioCheckTab = Settings.optionsDef.optionsGroups.find((el) => el.tab == "biocheck");
        for (const opt of bioCheckTab.options) {
            if (opt.re) {
                regExes.push({ opt: opt.optionName, re: opt.re });
            }
        }
        return regExes;
    }
    static reportMatches = Settings.collectREs();

    static mustHighlight(bioReport) {
        for (const [msg, subLines] of bioReport) {
            let hadMatch = false;
            for (const rm of Settings.reportMatches) {
                if (Settings.current[`biocheck_options_${rm.opt}`] && msg.match(rm.re)) {
                    hadMatch = true;
                    break;
                }
            }
            // if the current message did not match any of the flagged messages, the bio report must be highligted,
            // so we don't even have to check the rest of the messages. If the message did match a flagged one,
            // we still have to check if any of the other messages doesn't match (meaning the report has to be
            // highlighted because of them).
            if (!hadMatch) return true;
        }
        return false;
    }

    static restoreSettings() {
        const optionsJson = Utils.getCookie("w_diedYoung");
        // console.log(`Retrieved options ${optionsJson}`);
        if (optionsJson) {
            // Restore the settings to what the user last saved
            const opt = JSON.parse(optionsJson);
            function optionWithDefault(theOption, theDefault) {
                return typeof opt[theOption] == "undefined" ? theDefault : opt[theOption];
            }
            Settings.optionsDef.optionsGroups[0].options[1].defaultValue = optionWithDefault(
                "icons_options_veryYoung",
                "47px-RTC_-_Pictures.jpeg"
            );
            Settings.optionsDef.optionsGroups[0].options[3].defaultValue = optionWithDefault(
                "icons_options_young",
                "50px-Remember_the_Children-26.png"
            );

            Settings.optionsDef.optionsGroups[1].options[1].defaultValue = optionWithDefault(
                "biocheck_options_biocheckOn",
                0
            );
            Settings.optionsDef.optionsGroups[2].options[1].defaultValue = optionWithDefault(
                "missingFamily_options_noParents",
                1
            );
            Settings.optionsDef.optionsGroups[2].options[2].defaultValue = optionWithDefault(
                "missingFamily_options_oneParent",
                1
            );
            Settings.optionsDef.optionsGroups[2].options[3].defaultValue = optionWithDefault(
                "missingFamily_options_noNoSpouses",
                1
            );
            Settings.optionsDef.optionsGroups[2].options[4].defaultValue = optionWithDefault(
                "missingFamily_options_noNoChildren",
                1
            );
            Settings.optionsDef.optionsGroups[2].options[5].defaultValue = optionWithDefault(
                "missingFamily_options_noChildren",
                1
            );
            const msgOptions = Settings.optionsDef.optionsGroups[1].options;
            for (const rm of Settings.reportMatches) {
                for (const msgOpt of msgOptions) {
                    if (msgOpt.optionName == rm.opt) {
                        msgOpt.defaultValue = optionWithDefault(`biocheck_options_${rm.opt}`, 0);
                        break;
                    }
                }
            }
        }
        Settings.#optionsObj = new SettingsOptions.SettingsOptionsObject(Settings.optionsDef);
    }

    static renderSettings() {
        Settings.#optionsObj.buildPage();
        Settings.#optionsObj.setActiveTab("icons");
        Settings.current = Settings.#optionsObj.getDefaultOptions();
    }
}
