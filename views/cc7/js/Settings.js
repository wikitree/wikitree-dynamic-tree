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
                    // --- Section Messages ---
                    {
                        optionName: "ackb4src",
                        type: "checkbox",
                        label: "Acknowledgements before Sources",
                        defaultValue: 0,
                    },
                    {
                        optionName: "acksubsec",
                        type: "checkbox",
                        label: "Acknowledgements not a section",
                        defaultValue: 0,
                    },
                    {
                        optionName: "adnotend",
                        type: "checkbox",
                        label: "Advance Directive not at end of profile",
                        defaultValue: 0,
                    },
                    {
                        optionName: "adsubsec",
                        type: "checkbox",
                        label: "Advance Directive not a section",
                        defaultValue: 0,
                    },
                    {
                        optionName: "bioempty",
                        type: "checkbox",
                        label: "Biography is empty",
                        defaultValue: 0,
                    },
                    {
                        optionName: "comnoend",
                        type: "checkbox",
                        label: "Comment with no ending",
                        defaultValue: 0,
                    },
                    {
                        optionName: "irefafter",
                        type: "checkbox",
                        label: "Inline <ref> tag after <references >",
                        defaultValue: 0,
                    },
                    {
                        optionName: "irefnoend",
                        type: "checkbox",
                        label: "Inline <ref> tag with no ending </ref> tag",
                        defaultValue: 0,
                    },
                    {
                        optionName: "linesbetween",
                        type: "checkbox",
                        label: "Lines between Sources and <references />",
                        defaultValue: 0,
                    },
                    {
                        optionName: "munsrc",
                        type: "checkbox",
                        label: "Marked unsourced",
                        defaultValue: 0,
                    },
                    {
                        optionName: "munsrcbut",
                        type: "checkbox",
                        label: "Marked unsourced but may have sources",
                        defaultValue: 0,
                    },
                    {
                        optionName: "maybeunsrc",
                        type: "checkbox",
                        label: "May be unsourced",
                        defaultValue: 0,
                    },
                    {
                        optionName: "misref",
                        type: "checkbox",
                        label: "Missing <references /> tag",
                        defaultValue: 0,
                    },
                    {
                        optionName: "misbio",
                        type: "checkbox",
                        label: "Missing Biography heading",
                        defaultValue: 0,
                    },
                    {
                        optionName: "missrc",
                        type: "checkbox",
                        label: "Missing Sources heading",
                        defaultValue: 0,
                    },
                    {
                        optionName: "multiref",
                        type: "checkbox",
                        label: "Multiple <references /> tag",
                        defaultValue: 0,
                    },
                    {
                        optionName: "multibio",
                        type: "checkbox",
                        label: "Multiple Biography headings",
                        defaultValue: 0,
                    },
                    {
                        optionName: "multisrc",
                        type: "checkbox",
                        label: "Multiple Sources headings",
                        defaultValue: 0,
                    },
                    {
                        optionName: "nodates",
                        type: "checkbox",
                        label: "Profile has no dates",
                        defaultValue: 0,
                    },
                    {
                        optionName: "badsrcs",
                        type: "checkbox",
                        label: "Sources not reliable/clearly identified",
                        defaultValue: 0,
                    },
                    {
                        optionName: "srcsubsec",
                        type: "checkbox",
                        label: "Sources not a section",
                        defaultValue: 0,
                    },
                    {
                        optionName: "spannoend",
                        type: "checkbox",
                        label: "Span with no end",
                        defaultValue: 0,
                    },
                    {
                        optionName: "stylebr",
                        label: "Style Messages",
                        type: "br",
                    },
                    // --- Style Messages ---
                    {
                        optionName: "adnonmem",
                        type: "checkbox",
                        label: "Advance Directive on non member",
                        defaultValue: 0,
                    },
                    {
                        optionName: "biohdb4",
                        type: "checkbox",
                        label: "Biography heading before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "brnoend",
                        type: "checkbox",
                        label: "<BR without ending >",
                        defaultValue: 0,
                    },
                    {
                        optionName: "secempty",
                        type: "checkbox",
                        label: "Empty section",
                        defaultValue: 0,
                    },
                    {
                        optionName: "headb4bio",
                        type: "checkbox",
                        label: "Heading before Biography",
                        defaultValue: 0,
                    },
                    {
                        optionName: "horizb4bio",
                        type: "checkbox",
                        label: "Horizontal rule before Biography",
                        defaultValue: 0,
                    },
                    {
                        optionName: "bioemail",
                        type: "checkbox",
                        label: "Might contain email address",
                        defaultValue: 0,
                    },
                    {
                        optionName: "misrnb",
                        type: "checkbox",
                        label: "Missing Research Note box",
                        defaultValue: 0,
                    },
                    {
                        optionName: "navbb4",
                        type: "checkbox",
                        label: "Navigation Box before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "navbnb4",
                        type: "checkbox",
                        label: "Navigation Box not before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "nrhtml",
                        type: "checkbox",
                        label: "Not-recommended HTML tag(s)",
                        defaultValue: 0,
                    },
                    {
                        optionName: "pbb4",
                        type: "checkbox",
                        label: "Project Box before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "pnb4bio",
                        type: "checkbox",
                        label: "Project ... not before Biography",
                        defaultValue: 0,
                    },
                    {
                        optionName: "rnbb4",
                        type: "checkbox",
                        label: "Research Note Box before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "rnbnb4",
                        type: "checkbox",
                        label: "Research Note Box not before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "rnbstatus",
                        type: "checkbox",
                        label: "Research Note Box status",
                        defaultValue: 0,
                    },
                    {
                        optionName: "stcknabio",
                        type: "checkbox",
                        label: "Sticker not after Biography heading",
                        defaultValue: 0,
                    },
                    {
                        optionName: "sumb4",
                        type: "checkbox",
                        label: "Summary Text before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "ulb4bio",
                        type: "checkbox",
                        label: "Unexpected line before ...",
                        defaultValue: 0,
                    },
                    {
                        optionName: "ulmore",
                        type: "checkbox",
                        label: "Unexpected line ... more follow",
                        defaultValue: 0,
                    },
                    {
                        optionName: "wronglvl",
                        type: "checkbox",
                        label: "Wrong level heading",
                        defaultValue: 0,
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

    // These message were obtained by grepping for 'Messages.push' in lib/biocheck-api/src/Biography.js
    static reportMatches = [
        // Section Messages
        { opt: "ackb4src", re: /^Acknowledgements before/ },
        { opt: "acksubsec", re: /^Acknowledgements subsection/ },
        { opt: "adnotend", re: /^Advance Directive is not/ },
        { opt: "adsubsec", re: /^Advance Directive subsection/ },
        { opt: "bioempty", re: /^Biography is empty/ },
        { opt: "comnoend", re: /^Comment with no ending/ },
        { opt: "irefafter", re: /^Inline <ref> tag after/ },
        { opt: "irefnoend", re: /^Inline <ref> tag with/ },
        { opt: "linesbetween", re: /lines? between Sources/ },
        { opt: "misref", re: /^Missing <references/ },
        { opt: "misbio", re: /^Missing Biography/ },
        { opt: "missrc", re: /^Missing Sources/ },
        { opt: "multiref", re: /^Multiple <references/ },
        { opt: "multibio", re: /^Multiple Biography/ },
        { opt: "multisrc", re: /^Multiple Sources/ },
        { opt: "munsrc", re: /^Profile is marked unsourced$/ },
        { opt: "munsrcbut", re: /^Profile is marked unsourced but/ },
        { opt: "maybeunsrc", re: /^Profile may be/ },
        { opt: "nodates", re: /^Profile has no dates/ },
        { opt: "badsrcs", re: /^Bio Check found sources/ },
        { opt: "srcsubsec", re: /^Sources subsection/ },
        { opt: "spannoend", re: /^Span with no end/ },
        // Style Messages
        { opt: "adnonmem", re: /^Advance Directive on a non/ },
        { opt: "nrhtml", re: /^Biography contains HTML/ },
        { opt: "brnoend", re: /^Biography has <BR/ },
        { opt: "biohdb4", re: /^Biography heading before/ },
        { opt: "bioemail", re: /^Biography may contain email/ },
        { opt: "secempty", re: /^Empty Biography section/ },
        { opt: "headb4bio", re: /^Heading or subheading/ },
        { opt: "horizb4bio", re: /^Horizontal rule before/ },
        { opt: "misrnb", re: /^Missing Research/ },
        { opt: "navbb4", re: /^Navigation Box before/ },
        { opt: "navbnb4", re: /^Navigation.+should be/ },
        { opt: "pnb4bio", re: /^Project:.+should be/ },
        { opt: "pbb4", re: /^Project Box before/ },
        { opt: "rnbb4", re: /^Research Note Box before/ },
        { opt: "rnbnb4", re: /^Research Note Box:.+should be/ },
        { opt: "rnbstatus", re: /^Research Note Box:.+is.+status/ },
        { opt: "stcknabio", re: /^Sticker.+should be after/ },
        { opt: "sumb4", re: /^Summary Text before/ },
        { opt: "ulmore", re: /^Unexpected line.+more/ },
        { opt: "ulb4bio", re: /^Unexpected line before/ },
        { opt: "wronglvl", re: /^Wrong level/ },
    ];

    static mustHighlight(bioReport) {
        for (const [msg, subLines] of bioReport) {
            let hadMatch = false;
            for (const rm of Settings.reportMatches) {
                if (Settings.current[`biocheck_options_${rm.opt}`] && msg.match(rm.re)) {
                    hadMatch = true;
                    break;
                }
            }
            // if the current message did not match any of the flagged messages, it must be highligted
            // so we don't even have to check the rest. If it did match, we still have to check if any
            // of the other messages doesn't match
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
