/*
Created By: Azure Robinson (Robinson-27225)
*/

import {
    BACKDROP_OPACITY,
    CELL,
    BARK_OPACITY,
    COLORS,
    CROWN_SHADOW_OFFSET,
    CROWN_SHADOW_OPACITY,
    GROUND,
    GROUND_OPACITY,
    HEIGHT,
    INNER_BRANCH_OPACITY,
    LIGHT,
    WIDTH,
    barkLines,
    buildTree,
    colorFor,
    crownColors,
    frameOf,
} from "./surname_tree_core.js";

/** A tall, narrow, heavy face, like the capitals on a tree-shaped word cloud. Whatever is installed first is used. */
export const TREE_FONT = '"Roboto Condensed", "Arial Narrow", Oswald, Impact, Haettenschweiler, sans-serif';

export const treeFont = (size) => `bold ${size}px ${TREE_FONT}`;

/** A function that measures the width of a word in the tree's font, for the layout. */
let inkCanvas = null;

/**
 * The cells of the layout grid that a word's letters themselves cover (not the box round them), as [columns across, rows down]
 * from the cell holding the word's middle, with `pad` pixels of room added round the letters. Round letters such as O and D
 * leave their middles free, so a short name can go inside them. Returns null where the page cannot draw text to find out, and
 * the layout then makes do with the box.
 */
export function inkOffsets(text, size, angle, pad) {
    try {
        const scale = size < 24 ? 2 : 1; // small type is looked at more closely
        const canvas = inkCanvas || (inkCanvas = document.createElement("canvas"));
        const g = canvas.getContext("2d", { willReadFrequently: true });
        g.font = treeFont(size * scale);
        const width = g.measureText(text).width;
        const half = Math.ceil(Math.hypot(width, size * scale) / 2 + (pad + CELL) * scale) + 2;
        const side = half * 2;
        canvas.width = side; // (this also clears it)
        canvas.height = side;
        g.font = treeFont(size * scale);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillStyle = "#000";
        g.translate(half, half);
        g.rotate((angle * Math.PI) / 180);
        g.fillText(text, 0, size * scale * 0.04);
        const { data } = g.getImageData(0, 0, side, side);
        // how much ink there is in any rectangle, from a running total
        const across = side + 1;
        const total = new Uint32Array(across * across);
        for (let y = 0; y < side; y++) {
            for (let x = 0; x < side; x++) {
                total[(y + 1) * across + x + 1] =
                    (data[(y * side + x) * 4 + 3] > 60 ? 1 : 0) +
                    total[y * across + x + 1] +
                    total[(y + 1) * across + x] -
                    total[y * across + x];
            }
        }
        const inkIn = (x0, y0, x1, y1) =>
            total[y1 * across + x1] - total[y0 * across + x1] - total[y1 * across + x0] + total[y0 * across + x0];
        const reach = Math.ceil(half / (scale * CELL));
        const cells = [];
        for (let dr = -reach; dr <= reach; dr++) {
            for (let dc = -reach; dc <= reach; dc++) {
                const x0 = Math.max(0, Math.floor(half + (dc * CELL - CELL / 2 - pad) * scale));
                const x1 = Math.min(side, Math.ceil(half + (dc * CELL + CELL / 2 + pad) * scale));
                const y0 = Math.max(0, Math.floor(half + (dr * CELL - CELL / 2 - pad) * scale));
                const y1 = Math.min(side, Math.ceil(half + (dr * CELL + CELL / 2 + pad) * scale));
                if (x1 > x0 && y1 > y0 && inkIn(x0, y0, x1, y1) > 0) cells.push([dc, dr]);
            }
        }
        return cells;
    } catch (error) {
        return null;
    }
}

export function makeMeasure() {
    const g = document.createElement("canvas").getContext("2d");
    return (text, size) => {
        g.font = treeFont(size);
        return g.measureText(text).width;
    };
}

/** A hex colour as rgba(), for a gradient stop. */
function withAlpha(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** The left and right edges of the trunk and limbs, so shading can run across them. */
export function trunkSpan(tree) {
    let left = WIDTH;
    let right = 0;
    tree.trunk.forEach((c) => {
        left = Math.min(left, c.x - c.r);
        right = Math.max(right, c.x + c.r);
    });
    return { left, right };
}

/** The oak with its shading: gradients, bark, a patch of ground and a shadow under the leaves. */
function drawShadedTree(g, tree) {
    // the trunk and limbs: every circle runs the same way, so one fill gives their union, shaded across from left to right
    const { left, right } = trunkSpan(tree);
    const bark = g.createLinearGradient(left, 0, right, 0);
    bark.addColorStop(0, COLORS.trunkLight);
    bark.addColorStop(1, COLORS.trunkDark);
    g.fillStyle = bark;
    g.beginPath();
    tree.trunk.forEach((c) => {
        g.moveTo(c.x + c.r, c.y);
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    });
    g.fill();

    // ridges of bark up the trunk, kept inside it
    g.save();
    g.beginPath();
    tree.trunk.forEach((c) => {
        g.moveTo(c.x + c.r, c.y);
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    });
    g.clip();
    g.globalAlpha = BARK_OPACITY;
    g.strokeStyle = COLORS.bark;
    g.lineWidth = 2.6;
    g.lineCap = "round";
    g.lineJoin = "round";
    barkLines(tree).forEach((line) => {
        g.beginPath();
        line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
    });
    g.restore();

    // the ground the trunk stands in: a soft patch that fades out at its edges
    g.save();
    g.translate(GROUND.x, GROUND.y);
    g.scale(1, GROUND.ry / GROUND.rx);
    const turf = g.createRadialGradient(0, 0, 0, 0, 0, GROUND.rx);
    turf.addColorStop(0, withAlpha(COLORS.groundCentre, GROUND_OPACITY));
    turf.addColorStop(1, withAlpha(COLORS.groundEdge, 0));
    g.fillStyle = turf;
    g.beginPath();
    g.arc(0, 0, GROUND.rx, 0, Math.PI * 2);
    g.fill();
    g.restore();

    // the shadow the leaves cast, so the crown stands out from the trunk behind it
    g.save();
    g.translate(CROWN_SHADOW_OFFSET[0], CROWN_SHADOW_OFFSET[1]);
    g.globalAlpha = CROWN_SHADOW_OPACITY;
    g.fillStyle = COLORS.crownShadow;
    g.beginPath();
    tree.crown.forEach((c) => {
        g.moveTo(c.x + c.r, c.y);
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    });
    g.fill();
    g.restore();

    // each clump of leaves is lit at its upper left and shadowed at its lower right
    tree.crown.forEach((lobe) => {
        const { lit, shade } = crownColors(lobe);
        const fx = lobe.x + LIGHT.dx * lobe.r;
        const fy = lobe.y + LIGHT.dy * lobe.r;
        const leaves = g.createRadialGradient(fx, fy, 0, fx, fy, lobe.r * LIGHT.spread);
        leaves.addColorStop(0, lit);
        leaves.addColorStop(1, shade);
        g.fillStyle = leaves;
        g.beginPath();
        g.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
        g.fill();
    });

    // the limbs show faintly through the leaves, as branches do in a real tree
    g.save();
    g.beginPath();
    tree.crown.forEach((c) => {
        g.moveTo(c.x + c.r, c.y);
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    });
    g.clip();
    g.globalAlpha = INNER_BRANCH_OPACITY;
    g.fillStyle = COLORS.trunkInner;
    g.beginPath();
    tree.trunk.forEach((c) => {
        g.moveTo(c.x + c.r, c.y);
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    });
    g.fill();
    g.restore();
}

/** The oak in two flat tones, like a silhouette in word art: a solid crown over a solid trunk, nothing shaded. */
function drawFlatTree(g, tree) {
    const fill = (circles, colour) => {
        g.fillStyle = colour;
        g.beginPath();
        circles.forEach((c) => {
            g.moveTo(c.x + c.r, c.y);
            g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        });
        g.fill();
    };
    fill(tree.trunk, COLORS.trunkFlat);
    fill(tree.crown, COLORS.crownFlat);
}

/** The oak as clip art: a trunk and puffs of leaves, each with a dark outline. */
function drawOutlinedTree(g, tree) {
    const circlesPath = (circles) => {
        g.beginPath();
        circles.forEach((c) => {
            g.moveTo(c.x + c.r, c.y);
            g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        });
    };
    // The trunk's outline is its shape drawn once fat and dark, and again on top in its own colour, so that only the outer edge
    // of the whole shape is outlined and not every circle that it is made of.
    circlesPath(tree.trunk);
    g.fillStyle = COLORS.trunkOutline;
    g.strokeStyle = COLORS.trunkOutline;
    g.lineWidth = 7;
    g.lineJoin = "round";
    g.fill();
    g.stroke();
    circlesPath(tree.trunk);
    g.fillStyle = COLORS.trunkOutlined;
    g.fill();

    g.save();
    circlesPath(tree.trunk);
    g.clip();
    g.globalAlpha = 0.55;
    g.strokeStyle = COLORS.trunkOutline;
    g.lineWidth = 2.4;
    g.lineCap = "round";
    barkLines(tree).forEach((line) => {
        g.beginPath();
        line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
    });
    g.restore();

    // puffs of leaves, back to front, each lit at its upper left and drawn round with a dark line
    tree.crown.forEach((lobe) => {
        const fx = lobe.x + LIGHT.dx * lobe.r;
        const fy = lobe.y + LIGHT.dy * lobe.r;
        const puff = g.createRadialGradient(fx, fy, 0, fx, fy, lobe.r * LIGHT.spread);
        puff.addColorStop(0, COLORS.crownOutlined[0]);
        puff.addColorStop(1, COLORS.crownOutlined[1]);
        g.beginPath();
        g.arc(lobe.x, lobe.y, lobe.r, 0, Math.PI * 2);
        g.fillStyle = puff;
        g.fill();
        g.strokeStyle = COLORS.outline;
        g.lineWidth = 3.5;
        g.stroke();
    });
}

/** A picture used as the shape, faintly behind the words. shape.pictureImage is the loaded picture. */
function drawBackdrop(g, shape) {
    if (!shape.pictureImage) return;
    g.save();
    g.globalAlpha = shape.backdropOpacity ?? BACKDROP_OPACITY;
    g.drawImage(shape.pictureImage, 0, 0, WIDTH, HEIGHT);
    g.restore();
}

/**
 * Draw the tree (trunk and limbs, then the clumps of leaves, then the words) on a canvas sized to the drawing's frame times
 * `scale`: WIDTH x HEIGHT for a tree or a picture's shape, the banner's much wider frame for a banner.
 */
export function drawTree(canvas, items, scale = 2, tree = buildTree(1)) {
    const frame = frameOf(tree);
    canvas.width = Math.round(frame.w * scale);
    canvas.height = Math.round(frame.h * scale);
    const g = canvas.getContext("2d");
    g.setTransform(canvas.width / frame.w, 0, 0, canvas.height / frame.h, 0, 0);
    g.fillStyle = tree.kind === "banner" ? tree.background : "#fff";
    g.fillRect(0, 0, frame.w, frame.h);

    // what goes behind the words: the picture the member chose, or an oak, shaded or flat
    const look = tree.look || "shaded";
    if (tree.kind === "banner") {
        // nothing but the colour behind the words, which is already painted
    } else if (tree.kind === "image") drawBackdrop(g, tree);
    else if (look === "flat") drawFlatTree(g, tree);
    else if (look === "outlined") drawOutlinedTree(g, tree);
    else drawShadedTree(g, tree);

    g.textAlign = "center";
    g.textBaseline = "middle";
    items.forEach((item) => {
        g.save();
        g.translate(item.x, item.y);
        g.rotate((item.angle * Math.PI) / 180);
        g.font = treeFont(item.size);
        g.fillStyle = colorFor(item, look);
        g.fillText(item.text, 0, item.size * 0.04);
        g.restore();
    });
}
