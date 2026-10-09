/*
 * Biography cleaning for the Genealogy Report.
 *
 * The API returns a profile's biography as WikiTree-rendered HTML, which includes page furniture (stickers, table
 * of contents, edit links) and footnotes in a separate list. This module
 *   - removes that furniture,
 *   - rebuilds the HTML from an allowlist of elements and attributes, so nothing from the API can inject script or
 *     event handlers into the report,
 *   - renumbers the footnotes per person and returns them separately as endnotes.
 *
 * It needs a DOM. In the browser that is `DOMParser`; pass `parse` to substitute another parser.
 */

const WIKITREE_URL = "https://www.wikitree.com";

const ALLOWED_TAGS = new Set([
    "A",
    "ABBR",
    "B",
    "BLOCKQUOTE",
    "BR",
    "CAPTION",
    "CITE",
    "CODE",
    "DD",
    "DEL",
    "DIV",
    "DL",
    "DT",
    "EM",
    "FIGCAPTION",
    "FIGURE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "HR",
    "I",
    "IMG",
    "INS",
    "LI",
    "MARK",
    "OL",
    "P",
    "PRE",
    "Q",
    "S",
    "SMALL",
    "SPAN",
    "STRONG",
    "SUB",
    "SUP",
    "TABLE",
    "TBODY",
    "TD",
    "TFOOT",
    "TH",
    "THEAD",
    "TR",
    "U",
    "UL",
]);

// Removed together with their content.
const DROPPED_TAGS = new Set([
    "SCRIPT",
    "STYLE",
    "IFRAME",
    "OBJECT",
    "EMBED",
    "FORM",
    "INPUT",
    "BUTTON",
    "SELECT",
    "TEXTAREA",
    "SVG",
    "MATH",
    "NOSCRIPT",
    "TEMPLATE",
    "LINK",
    "META",
    "BASE",
    "AUDIO",
    "VIDEO",
    "CANVAS",
]);

// WikiTree page furniture that should not appear in a printed report.
const FURNITURE_SELECTORS = [
    ".sticker",
    ".sticker-box",
    ".stickers",
    ".status",
    ".aContents",
    ".toc",
    "#toc",
    ".editsection",
    ".mw-editsection",
    ".mw-cite-backlink",
    ".noprint",
    ".navbox",
    ".hidden",
];

/**
 * A WikiTree "sticker" (military veteran, name study, project member, ...) has no class of its own. It is a bordered
 * box floated to the right, holding a small badge image and a line of text in a "SMALL" div. Photos sit in tables, so
 * they do not match.
 */
function isSticker(el) {
    return (
        el.tagName === "DIV" &&
        /float:\s*(right|left)/i.test(el.getAttribute("style") || "") &&
        Boolean(el.querySelector(".SMALL"))
    );
}

const IMAGE_SELECTORS = ["figure", ".thumb", ".image", ".gallery", "img"];

const HEADING = /^H[1-6]$/;

/**
 * Resolve a link or image address against wikitree.com. Only https (or http on wikitree.com, upgraded to https)
 * survives; every other scheme, including javascript: and data:, is rejected with "".
 */
function absoluteUrl(value) {
    const text = (value || "").trim();
    if (!text) return "";
    let url;
    try {
        url = new URL(text, `${WIKITREE_URL}/`);
    } catch {
        return "";
    }
    if (url.protocol === "http:" && /(^|\.)wikitree\.com$/i.test(url.hostname)) url.protocol = "https:";
    return url.protocol === "https:" ? url.href : "";
}

// Lazy-loading pages keep the real address in a data attribute or srcset instead of src.
const IMAGE_SOURCE_ATTRIBUTES = ["src", "data-src", "data-original", "data-lazy-src"];

function imageSource(img) {
    for (const name of IMAGE_SOURCE_ATTRIBUTES) {
        const url = absoluteUrl(img.getAttribute(name));
        if (url) return url;
    }
    const first = (img.getAttribute("srcset") || img.getAttribute("data-srcset") || "")
        .split(",")[0]
        .trim()
        .split(/\s+/)[0];
    return absoluteUrl(first);
}

function isBlank(text) {
    return !text || !text.replace(/[\s ]+/g, "");
}

function copyAllowedAttributes(source, target, { includeImages }) {
    const tag = source.tagName;
    // The only class that survives is the marker this module adds to footnote references.
    if (tag === "SUP" && source.className === "gr-ref") target.className = "gr-ref";
    if (tag === "A") {
        const raw = source.getAttribute("href") || "";
        if (raw.startsWith("#")) {
            target.setAttribute("href", raw);
        } else {
            const href = absoluteUrl(raw);
            if (href) {
                target.setAttribute("href", href);
                target.setAttribute("rel", "noopener noreferrer");
                target.setAttribute("target", "_blank");
            }
        }
    } else if (tag === "IMG" && includeImages) {
        const src = imageSource(source);
        if (src) {
            target.setAttribute("src", src);
            target.setAttribute("alt", source.getAttribute("alt") || "");
            target.setAttribute("loading", "lazy");
        }
    } else if (tag === "TD" || tag === "TH") {
        for (const name of ["colspan", "rowspan"]) {
            const value = Number.parseInt(source.getAttribute(name), 10);
            if (value > 1 && value < 50) target.setAttribute(name, String(value));
        }
    }
}

/**
 * Copy `source`'s children into `targetParent`, keeping only allowlisted elements and attributes.
 * Unknown elements are unwrapped (their children are kept); dropped elements vanish with their content.
 */
function copyClean(source, targetParent, doc, options) {
    for (const node of source.childNodes) {
        if (node.nodeType === 3) {
            targetParent.appendChild(doc.createTextNode(node.textContent));
        } else if (node.nodeType === 1) {
            const tag = node.tagName.toUpperCase();
            if (DROPPED_TAGS.has(tag)) continue;
            if (!ALLOWED_TAGS.has(tag)) {
                copyClean(node, targetParent, doc, options);
                continue;
            }
            if (tag === "IMG") {
                if (!options.includeImages) continue;
                if (!imageSource(node)) {
                    options.droppedImages.push(node.outerHTML.slice(0, 300));
                    continue;
                }
            }
            // Biography headings sit below the entry's own h3/h4, so every biography heading becomes an h5.
            const outTag = HEADING.test(tag) ? "h5" : tag.toLowerCase();
            const copy = doc.createElement(outTag);
            copyAllowedAttributes(node, copy, options);
            copyClean(node, copy, doc, options);
            targetParent.appendChild(copy);
        }
    }
}

function removeEmptyElements(root) {
    let removed = true;
    while (removed) {
        removed = false;
        for (const el of [...root.querySelectorAll("p,div,span,li,ul,ol,dl,figure,figcaption,blockquote,h5")]) {
            if (isBlank(el.textContent) && !el.querySelector("img,table,hr")) {
                el.remove();
                removed = true;
            }
        }
    }
}

// The report supplies its own "Biography" heading, and after the footnote list is gone a "Sources" heading with
// nothing under it is just noise.
function removeRedundantHeadings(root) {
    for (const heading of [...root.querySelectorAll("h5")]) {
        const text = heading.textContent.trim();
        if (/^biography$/i.test(text)) {
            heading.remove();
        } else if (/^sources\b/i.test(text)) {
            const next = heading.nextElementSibling;
            if (!next || /^H[1-6]$/.test(next.tagName)) heading.remove();
        }
    }
}

// A link whose href was rejected (e.g. javascript:) keeps its text but is no longer a link.
function unwrapDeadLinks(root) {
    for (const link of [...root.querySelectorAll("a:not([href])")]) {
        link.replaceWith(...link.childNodes);
    }
}

function noteHtml(li, doc, options) {
    const clone = li.cloneNode(true);
    clone.querySelectorAll(".mw-cite-backlink").forEach((el) => el.remove());
    clone.querySelectorAll('a[href^="#_ref"], a[href^="#cite_ref"]').forEach((el) => el.remove());
    const body = clone.querySelector(".reference-text") || clone;
    const out = doc.createElement("div");
    copyClean(body, out, doc, { ...options, includeImages: false });
    return out.innerHTML.trim().replace(/^(?:↑|&uarr;)\s*/, "");
}

/**
 * @param {string} html  biography HTML from the API (bioHTML)
 * @param {object} [settings]
 * @param {string} [settings.noteIdPrefix]  prefix for the endnote anchors, e.g. "gr-n4-"
 * @param {boolean} [settings.includeImages]  keep biography images (default false)
 * @param {boolean} [settings.hideStickers]  remove sticker boxes (default true)
 * @param {boolean} [settings.includeNotes]  keep footnote markers and return endnotes (default true)
 * @param {(html: string) => Document} [settings.parse]
 * @returns {{ html: string, notes: string[], droppedImages: string[] }}  droppedImages lists the tags of images
 *   that had no usable https address (for diagnostics)
 */
export function sanitizeBio(html, settings = {}) {
    const { noteIdPrefix = "gr-note-", includeImages = false, hideStickers = true, includeNotes = true } = settings;
    const parse = settings.parse || ((text) => new DOMParser().parseFromString(text, "text/html"));
    const droppedImages = [];
    const options = { includeImages, droppedImages };

    if (!html || isBlank(html)) return { html: "", notes: [], droppedImages: [] };

    const source = parse(`<body>${html}</body>`);
    const body = source.body;

    FURNITURE_SELECTORS.forEach((selector) => body.querySelectorAll(selector).forEach((el) => el.remove()));
    if (hideStickers) body.querySelectorAll("div[style]").forEach((el) => isSticker(el) && el.remove());
    if (!includeImages) {
        IMAGE_SELECTORS.forEach((selector) => body.querySelectorAll(selector).forEach((el) => el.remove()));
    }

    // Footnotes: find the target of each in-text reference, number them in order of first use.
    const targets = new Map();
    body.querySelectorAll("ol.references li[id], li[id^='_note'], li[id^='cite_note']").forEach((li) => {
        targets.set(li.id, li);
    });
    const numberFor = new Map();
    const notes = [];
    body.querySelectorAll("sup.reference, sup[id^='_ref'], sup[id^='cite_ref']").forEach((sup) => {
        if (!includeNotes) {
            sup.remove(); // sources switched off: no [n] markers and no endnotes
            return;
        }
        const href = sup.querySelector("a")?.getAttribute("href") || "";
        const li = href.startsWith("#") ? targets.get(href.slice(1)) : null;
        if (!li) {
            sup.remove();
            return;
        }
        if (!numberFor.has(li.id)) {
            notes.push(noteHtml(li, source, options));
            numberFor.set(li.id, notes.length);
        }
        const number = numberFor.get(li.id);
        const marker = source.createElement("sup");
        marker.className = "gr-ref";
        const link = source.createElement("a");
        link.setAttribute("href", `#${noteIdPrefix}${number}`);
        link.textContent = `[${number}]`;
        marker.appendChild(link);
        sup.replaceWith(marker);
    });
    body.querySelectorAll("ol.references").forEach((el) => el.remove());

    const out = source.createElement("div");
    copyClean(body, out, source, options);
    unwrapDeadLinks(out);
    removeRedundantHeadings(out);
    removeEmptyElements(out);

    // Keep every note (even an empty one) so the [n] markers in the text stay aligned with the list.
    return {
        html: out.innerHTML.trim(),
        notes: notes.map((note) => (isBlank(note) ? "Citation" : note)),
        droppedImages,
    };
}
