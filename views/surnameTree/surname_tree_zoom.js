/*
Created By: Azure Robinson (Robinson-27225)
*/

import { HEIGHT, WIDTH } from "./surname_tree_core.js";

/** The size of the drawing: the tree's frame unless another is given (the banner's is much wider than it is tall). */
const FULL_FRAME = Object.freeze({ w: WIDTH, h: HEIGHT });

// Zoom and pan for the tree, kept as a transform { x, y, k } applied to the drawing: a point at (px, py) is drawn at
// (x + k * px, y + k * py). Like the fan chart: scroll to zoom about the pointer, drag to move, buttons to zoom about the middle.

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 40;
export const IDENTITY = Object.freeze({ x: 0, y: 0, k: 1 });
/** One press of Zoom + or Zoom - */
export const BUTTON_FACTOR = 1.6;

const clampScale = (k) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/** The transform after zooming by `factor` with the point (px, py), in drawing coordinates on screen, held still. */
export function zoomAbout(t, factor, px, py) {
    const k = clampScale(t.k * factor);
    const f = k / t.k;
    return { k, x: px - (px - t.x) * f, y: py - (py - t.y) * f };
}

export const panBy = (t, dx, dy) => ({ k: t.k, x: t.x + dx, y: t.y + dy });

export const transformText = (t) => `translate(${t.x} ${t.y}) scale(${t.k})`;

/** How many screen pixels one drawing unit is, for an SVG whose viewBox is fitted in its box (the whole drawing shows). */
export function viewScale(rect, frame = FULL_FRAME) {
    return Math.min(rect.width / frame.w, rect.height / frame.h) || 1;
}

/** A pointer position on the page, in the drawing's coordinates, for an SVG in `rect` (the viewBox is centred in the box). */
export function clientToView(rect, clientX, clientY, frame = FULL_FRAME) {
    const s = viewScale(rect, frame);
    return {
        x: (clientX - rect.left - (rect.width - frame.w * s) / 2) / s,
        y: (clientY - rect.top - (rect.height - frame.h * s) / 2) / s,
    };
}

/** The zoom factor for a mouse wheel (or a trackpad pinch, which arrives as a wheel with ctrlKey held). */
export function wheelFactor(event) {
    const unit = event.deltaMode === 1 ? 16 : 1; // lines rather than pixels
    return Math.exp(-event.deltaY * unit * (event.ctrlKey ? 0.01 : 0.0015));
}
