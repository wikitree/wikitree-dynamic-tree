/*
Created By: Azure Robinson (Robinson-27225)
*/

import { WIDTH, frameOf } from "./surname_tree_core.js";
import { drawTree } from "./surname_tree_draw.js";

export const FORMATS = [
    { id: "png", name: "PNG", mime: "image/png", extension: "png", sized: true },
    { id: "jpg", name: "JPG", mime: "image/jpeg", extension: "jpg", sized: true },
    { id: "pdf", name: "PDF", mime: "application/pdf", extension: "pdf", sized: false },
];

export const formatById = (id) => FORMATS.find((f) => f.id === id) || FORMATS[0];

/** Widths offered for a picture, in pixels. The height follows from the tree's shape. */
export const SIZES = [
    { id: "small", width: 800, name: "Small", use: "for email and chat" },
    { id: "medium", width: 1600, name: "Medium", use: "for the web and social media" },
    { id: "large", width: 3200, name: "Large", use: "for printing" },
];
export const DEFAULT_SIZE = "small";
/** Widths offered for the profile-background banner. WikiTree tiles a background image, so it should be wider than the screen. */
export const BANNER_SIZES = [
    { id: "small", width: 1280, name: "Small", use: "for narrow screens" },
    { id: "medium", width: 1920, name: "Medium", use: "for most screens" },
    { id: "large", width: 2560, name: "Large", use: "for wide screens" },
];
export const DEFAULT_BANNER_SIZE = "large";
/** The sizes offered for a shape, and the one chosen at first. */
export const sizesFor = (shape) => (shape && shape.kind === "banner" ? BANNER_SIZES : SIZES);
export const defaultSizeFor = (shape) => (shape && shape.kind === "banner" ? DEFAULT_BANNER_SIZE : DEFAULT_SIZE);
export const MIN_WIDTH = 200;
export const MAX_WIDTH = 6000; // 6000 x 5280 is about 32 million pixels, which browsers can still make

/** The tree's picture is this much taller than it is wide (the banner's, much less so): the height for a width, for a shape. */
export const imageHeight = (width, shape) => {
    const frame = frameOf(shape);
    return Math.round((width * frame.h) / frame.w);
};

/** The width in pixels for a size choice ("small", "medium", "large" or "custom" with a typed width), or 0 if invalid. */
export function widthFor(sizeId, customWidth, shape) {
    if (sizeId === "custom") {
        const n = Math.round(Number(customWidth));
        return Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH ? n : 0;
    }
    const size = sizesFor(shape).find((s) => s.id === sizeId);
    return size ? size.width : 0;
}

export const sizeLabel = (width, shape) =>
    `${width.toLocaleString()} × ${imageHeight(width, shape).toLocaleString()} pixels`;

export const exportFileName = (key, format, width, prefix = "surname-tree") =>
    `${prefix}-${key}${formatById(format).sized ? `-${width}px` : ""}.${formatById(format).extension}`;

const toBlob = (canvas, mime, quality) => new Promise((resolve) => canvas.toBlob(resolve, mime, quality));

/** A picture loaded from its address, or null if it will not load (or takes more than a few seconds, so an export cannot hang). */
const loadPicture = (url) =>
    new Promise((resolve) => {
        const image = new Image();
        const giveUp = setTimeout(() => resolve(null), 4000);
        image.onload = () => {
            clearTimeout(giveUp);
            resolve(image);
        };
        image.onerror = () => {
            clearTimeout(giveUp);
            resolve(null);
        };
        image.src = url;
    });

/**
 * The tree drawn afresh at `width` pixels wide, as a PNG or JPEG blob (null if the browser cannot make one that big). A shape
 * made from a picture is loaded first, so it can be drawn.
 */
export async function renderImage(items, mime, width, tree) {
    let shape = tree;
    if (tree && tree.kind === "image" && tree.picture && !tree.pictureImage) {
        shape = { ...tree, pictureImage: await loadPicture(tree.picture) };
    }
    const canvas = document.createElement("canvas");
    drawTree(canvas, items, width / WIDTH, shape);
    return toBlob(canvas, mime, mime === "image/jpeg" ? 0.92 : undefined);
}

// ---------------------------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------------------------

/** Page sizes in points (1/72 inch), portrait. */
export const PAPERS = {
    letter: { name: "Letter (8.5 × 11 in)", width: 612, height: 792 },
    a4: { name: "A4 (210 × 297 mm)", width: 595.28, height: 841.89 },
};

/** Text for a PDF string: Latin-1 only (other letters become "?"), with the characters PDF treats specially escaped. */
export function pdfText(text) {
    return String(text)
        .replace(/[\r\n]+/g, " ")
        .replace(/[^\x20-\xff]/g, "?")
        .replace(/[\\()]/g, "\\$&");
}

const latin1 = (text) => Uint8Array.from(text, (c) => c.charCodeAt(0) & 0xff);
const num = (n) => Number(n.toFixed(2)).toString();

/** A font size that is `size`, or smaller so that `text` is no wider than `maxWidth` (Helvetica is about 0.55 em a letter). */
const fitSize = (text, size, maxWidth) => Math.min(size, maxWidth / Math.max(1, text.length * 0.56));

/**
 * A one-page PDF: the title, the tree (a JPEG, embedded as it is), and a line of text under it, centred on the page.
 * jpeg is the file's bytes; pixelWidth and pixelHeight are its size.
 */
export function buildPdf({ jpeg, pixelWidth, pixelHeight, title, caption, paper = "letter" }) {
    const page = PAPERS[paper] || PAPERS.letter;
    const margin = 36;
    const usable = page.width - margin * 2;
    const imgW = usable;
    const imgH = (usable * pixelHeight) / pixelWidth;
    const titleText = pdfText(title);
    const captionText = pdfText(caption);
    const titleSize = fitSize(titleText, 20, usable);
    const captionSize = fitSize(captionText, 10, usable);
    const imgTop = page.height - margin - titleSize - 14;
    const imgBottom = imgTop - imgH;

    const content = [
        `BT /F1 ${num(titleSize)} Tf ${margin} ${num(page.height - margin - titleSize)} Td (${titleText}) Tj ET`,
        `q ${num(imgW)} 0 0 ${num(imgH)} ${margin} ${num(imgBottom)} cm /Im0 Do Q`,
        `BT /F2 ${num(captionSize)} Tf ${margin} ${num(imgBottom - 6 - captionSize)} Td (${captionText}) Tj ET`,
    ].join("\n");

    const objects = [
        latin1("<< /Type /Catalog /Pages 2 0 R >>"),
        latin1("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
        latin1(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] ` +
                "/Resources << /Font << /F1 6 0 R /F2 7 0 R >> /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>"
        ),
        latin1(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
        null, // the image, below
        latin1("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
        latin1("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    ];
    const imageHead = latin1(
        `<< /Type /XObject /Subtype /Image /Width ${pixelWidth} /Height ${pixelHeight} /ColorSpace /DeviceRGB ` +
            `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
    );
    const imageTail = latin1("\nendstream");
    objects[4] = new Uint8Array(imageHead.length + jpeg.length + imageTail.length);
    objects[4].set(imageHead, 0);
    objects[4].set(jpeg, imageHead.length);
    objects[4].set(imageTail, imageHead.length + jpeg.length);

    const parts = [latin1("%PDF-1.4\n")];
    const offsets = [];
    let length = parts[0].length;
    objects.forEach((body, i) => {
        offsets.push(length);
        const head = latin1(`${i + 1} 0 obj\n`);
        const tail = latin1("\nendobj\n");
        parts.push(head, body, tail);
        length += head.length + body.length + tail.length;
    });
    const xref =
        `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
        offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("") +
        `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;
    parts.push(latin1(xref));

    const pdf = new Uint8Array(length + xref.length);
    let at = 0;
    parts.forEach((part) => {
        pdf.set(part, at);
        at += part.length;
    });
    return pdf;
}

/** A blob's bytes. (Blob.arrayBuffer is missing from some older browsers and from the test environment.) */
function blobBytes(blob) {
    if (blob.arrayBuffer) return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result));
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
    });
}

/** The tree as a PDF blob: drawn as a JPEG about 2,400 pixels wide, then put on a page. */
export async function renderPdf(items, { title, caption, paper, tree }) {
    const width = 2400;
    const blob = await renderImage(items, "image/jpeg", width, tree);
    if (!blob) return null;
    const jpeg = await blobBytes(blob);
    return new Blob(
        [buildPdf({ jpeg, pixelWidth: width, pixelHeight: imageHeight(width, tree), title, caption, paper })],
        {
            type: "application/pdf",
        }
    );
}
