/*
Created By: Azure Robinson (Robinson-27225)
*/

import { CELL, HEIGHT, WIDTH, hslToHex } from "./surname_tree_core.js";

// A picture used as the shape of the tree, as in word art: the words fill the picture's silhouette and each takes the colour
// of the picture under it. The picture is read in the member's own browser and goes nowhere.
//
// The picture is placed in the same WIDTH x HEIGHT frame as the oak, and made into the same grid of cells, so the layout
// does not know the difference: a shape made from a picture is a crown with no trunk.

/** The space left round the picture, in the frame. */
export const MARGIN = 16;
/** How far (in colour) a pixel must be from the background to count as part of the shape. */
export const DEFAULT_SENSITIVITY = 45;
export const MIN_SENSITIVITY = 8;
export const MAX_SENSITIVITY = 160;
/** A shape that covers less of the frame than this is not a shape (the picture is all background, or all one colour). */
export const MIN_COVERAGE = 0.02;
/** Bits of the picture smaller than this many cells are dust, and are dropped, unless nothing bigger exists. */
const MIN_ISLAND = 40;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Where a picture of this size goes in the frame: as big as fits, centred. */
export function placeInFrame(width, height) {
    const scale = Math.min((WIDTH - 2 * MARGIN) / width, (HEIGHT - 2 * MARGIN) / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    return { x: Math.round((WIDTH - w) / 2), y: Math.round((HEIGHT - h) / 2), w, h };
}

const median = (list) => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];

/** The colour of the picture's background: the middle colour of the pixels along its four edges. */
function edgeColour(pixels, rect) {
    const { width, data } = pixels;
    const reds = [];
    const greens = [];
    const blues = [];
    const take = (x, y) => {
        const at = (y * width + x) * 4;
        if (data[at + 3] < 128) return;
        reds.push(data[at]);
        greens.push(data[at + 1]);
        blues.push(data[at + 2]);
    };
    for (let x = rect.x; x < rect.x + rect.w; x += 2) {
        take(x, rect.y);
        take(x, rect.y + rect.h - 1);
    }
    for (let y = rect.y; y < rect.y + rect.h; y += 2) {
        take(rect.x, y);
        take(rect.x + rect.w - 1, y);
    }
    return reds.length ? [median(reds), median(greens), median(blues)] : [255, 255, 255];
}

/** Drop little isolated bits (dust, specks) from a mask of cells, keeping everything big enough to be part of the shape. */
function removeSpecks(mask, cols, rows) {
    const label = new Int32Array(mask.length);
    const sizes = [0];
    let next = 0;
    for (let start = 0; start < mask.length; start++) {
        if (!mask[start] || label[start]) continue;
        next++;
        let size = 0;
        const stack = [start];
        label[start] = next;
        while (stack.length) {
            const at = stack.pop();
            size++;
            const col = at % cols;
            const row = (at - col) / cols;
            [
                col > 0 ? at - 1 : -1,
                col < cols - 1 ? at + 1 : -1,
                row > 0 ? at - cols : -1,
                row < rows - 1 ? at + cols : -1,
            ].forEach((n) => {
                if (n >= 0 && mask[n] && !label[n]) {
                    label[n] = next;
                    stack.push(n);
                }
            });
        }
        sizes.push(size);
    }
    const biggest = Math.max(0, ...sizes);
    if (biggest < MIN_ISLAND) return;
    for (let i = 0; i < mask.length; i++) if (mask[i] && sizes[label[i]] < MIN_ISLAND) mask[i] = 0;
}

/**
 * The shape in a picture. `pixels` is { width, height, data } (RGBA, like canvas ImageData) for the WIDTH x HEIGHT frame with
 * the picture placed in it at `rect` (see placeInFrame). A picture with transparent parts is cut out by its transparency;
 * any other is cut out by its background, taken to be the colour along its edges, and every pixel further from that
 * colour than `sensitivity` is the shape. Returns { kind: "image", masks, cellRgb, coverage, background }, where masks is
 * like buildMasks' (the whole shape is "crown", and there is no "trunk"), cellRgb holds the average colour of each cell
 * (three bytes a cell), and coverage is the share of the frame that the shape fills.
 */
export function shapeFromPixels(pixels, rect, sensitivity = DEFAULT_SENSITIVITY) {
    const { width, data } = pixels;
    let transparent = 0;
    for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) if (data[(y * width + x) * 4 + 3] < 128) transparent++;
    }
    const useAlpha = transparent / (rect.w * rect.h) > 0.03;
    const background = useAlpha ? null : edgeColour(pixels, rect);

    const on = new Uint8Array(width * pixels.height);
    for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
            const at = (y * width + x) * 4;
            if (data[at + 3] < 128) continue;
            if (
                background &&
                Math.hypot(data[at] - background[0], data[at + 1] - background[1], data[at + 2] - background[2]) <=
                    sensitivity
            )
                continue;
            on[y * width + x] = 1;
        }
    }

    const cols = Math.ceil(WIDTH / CELL);
    const rows = Math.ceil(HEIGHT / CELL);
    const crown = new Uint8Array(cols * rows);
    const cellRgb = new Uint8ClampedArray(cols * rows * 3);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let count = 0;
            let red = 0;
            let green = 0;
            let blue = 0;
            for (let y = row * CELL; y < Math.min(HEIGHT, (row + 1) * CELL); y++) {
                for (let x = col * CELL; x < Math.min(WIDTH, (col + 1) * CELL); x++) {
                    if (!on[y * width + x]) continue;
                    const at = (y * width + x) * 4;
                    count++;
                    red += data[at];
                    green += data[at + 1];
                    blue += data[at + 2];
                }
            }
            if (count * 2 >= CELL * CELL) {
                const cell = row * cols + col;
                crown[cell] = 1;
                cellRgb[cell * 3] = red / count;
                cellRgb[cell * 3 + 1] = green / count;
                cellRgb[cell * 3 + 2] = blue / count;
            }
        }
    }
    removeSpecks(crown, cols, rows);
    const filled = crown.reduce((n, v) => n + v, 0);
    return {
        kind: "image",
        masks: { cols, rows, crown, trunk: new Uint8Array(cols * rows) },
        cellRgb,
        coverage: filled / (cols * rows),
        background: useAlpha ? "transparent" : background,
    };
}

/** The colour of the picture at a point, as [red, green, blue], or null where there is no shape. */
function colourAt(shape, x, y) {
    const { cols, rows, crown } = shape.masks;
    const col = Math.floor(x / CELL);
    const row = Math.floor(y / CELL);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return null;
    const cell = row * cols + col;
    return crown[cell] ? [shape.cellRgb[cell * 3], shape.cellRgb[cell * 3 + 1], shape.cellRgb[cell * 3 + 2]] : null;
}

/** [red, green, blue] to hue, saturation and lightness (0-360, 0-100, 0-100). */
function toHsl([r, g, b]) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const l = (max + min) / 2;
    const d = max - min;
    if (!d) return [0, 0, l * 100];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === red ? ((green - blue) / d) % 6 : max === green ? (blue - red) / d + 2 : (red - green) / d + 4;
    h = (h * 60 + 360) % 360;
    return [h, s * 100, l * 100];
}

/** A colour from the picture made easy to read as text on white: its hue kept, but never very light or very dark. */
export function legibleColour(rgb) {
    const [h, s, l] = toHsl(rgb);
    // Averaging a picture's greens with its lights and darks makes them muddy, so a colour that has any colour in it is made
    // richer. Greys (a white or black part of the picture) stay grey.
    const richer = s > 15 ? Math.min(100, Math.max(s, 55)) : s;
    return hslToHex(h, richer, Math.min(44, Math.max(20, l)));
}

/**
 * The colour for a placed word in a shape made from a picture: the average of the picture along the word, made easy to
 * read. Where the word sits on no colour (it never should), the nearest colour is used.
 */
export function wordColour(shape, item) {
    const radians = (item.angle * Math.PI) / 180;
    const sum = [0, 0, 0];
    let n = 0;
    [-0.33, -0.17, 0, 0.17, 0.33].forEach((along) => {
        const at = colourAt(
            shape,
            item.x + Math.cos(radians) * item.w * along,
            item.y + Math.sin(radians) * item.w * along
        );
        if (!at) return;
        n++;
        for (let i = 0; i < 3; i++) sum[i] += at[i];
    });
    if (!n) {
        for (let reach = 1; reach <= 8 && !n; reach++) {
            [
                [reach, 0],
                [-reach, 0],
                [0, reach],
                [0, -reach],
            ].forEach(([dx, dy]) => {
                const at = colourAt(shape, item.x + dx * CELL, item.y + dy * CELL);
                if (!at || n) return;
                n = 1;
                for (let i = 0; i < 3; i++) sum[i] = at[i];
            });
        }
    }
    return n ? legibleColour(sum.map((v) => v / n)) : "#2f5d34";
}

/** Why a file cannot be used, or "" if it can. */
export function fileProblem(file) {
    if (!file) return "No picture was chosen.";
    if (!/^image\//.test(file.type || "")) return "That file is not a picture. Choose a PNG, JPG, GIF, WebP or SVG.";
    if (file.size > MAX_FILE_BYTES) return "That picture is too big. Choose one under 15 MB.";
    return "";
}

/** Read a picture file into the frame: { pixels, rect }. Runs in the browser; the picture is not sent anywhere. */
export function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const problem = fileProblem(file);
        if (problem) return reject(new Error(problem));
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            try {
                const rect = placeInFrame(image.naturalWidth || 1000, image.naturalHeight || 1000);
                const canvas = document.createElement("canvas");
                canvas.width = WIDTH;
                canvas.height = HEIGHT;
                const g = canvas.getContext("2d", { willReadFrequently: true });
                g.drawImage(image, rect.x, rect.y, rect.w, rect.h);
                resolve({ pixels: g.getImageData(0, 0, WIDTH, HEIGHT), rect });
            } catch (error) {
                reject(new Error("That picture could not be read."));
            } finally {
                URL.revokeObjectURL(url);
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("That picture could not be opened."));
        };
        image.src = url;
    });
}

/** The shape cut out of the picture, as a PNG data address for showing faintly behind the words ("" if it cannot be made). */
export function backdropDataUrl(shape, pixels) {
    try {
        const canvas = document.createElement("canvas");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const g = canvas.getContext("2d");
        const out = g.createImageData(WIDTH, HEIGHT);
        const { cols, crown } = shape.masks;
        for (let y = 0; y < HEIGHT; y++) {
            for (let x = 0; x < WIDTH; x++) {
                if (!crown[Math.floor(y / CELL) * cols + Math.floor(x / CELL)]) continue;
                const at = (y * WIDTH + x) * 4;
                out.data[at] = pixels.data[at];
                out.data[at + 1] = pixels.data[at + 1];
                out.data[at + 2] = pixels.data[at + 2];
                out.data[at + 3] = 255;
            }
        }
        g.putImageData(out, 0, 0);
        return canvas.toDataURL("image/png");
    } catch (error) {
        return "";
    }
}
