// Shared pieces for the Family Explorer, cut down from the WikiTree Browser Extension's
// chat_chart_common.js. In the extension the explorer is a draggable popup; here it is
// drawn inside the Tree Apps view container, so the popup becomes a plain panel.

import { escapeText, fullName, personNameText, yearOf } from "./text_utils.js";

export { escapeText, fullName, personNameText, yearOf };

const MAIN_DOMAIN = "www.wikitree.com";

/** An absolute URL on the WikiTree site for a site path such as "/photo.php/…". */
export function siteUrl(path) {
    return /^https?:/i.test(path) ? path : `https://${MAIN_DOMAIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function profileUrl(wtid) {
    return `https://${MAIN_DOMAIN}/wiki/${encodeURIComponent(wtid)}`;
}

export function lifeYears(person) {
    const birth = yearOf(person?.birth);
    const death = yearOf(person?.death);
    if (!birth && !death) return "";
    return `${birth || "?"}–${death || ""}`;
}

/** First, middle and last names as on the profile ("" when it has no first name or no surname). */
export function fullWikiTreeName(person) {
    // (a semi-private profile sends no FirstName, only RealName)
    const first = person?.FirstName || person?.RealName;
    if (!first || !(person.LastNameAtBirth || person.LastNameCurrent)) return "";
    const lnab = person.LastNameAtBirth || person.LastNameCurrent;
    const current = person.LastNameCurrent || person.LastNameAtBirth;
    try {
        const name = new window.PersonName({
            ...person,
            FirstName: first,
            LastNameAtBirth: lnab,
            LastNameCurrent: current,
        }).withParts(["FirstName", "MiddleNames", "LastNameAtBirth", "LastNameCurrent"]);
        return typeof name === "string" && !name.startsWith("Invalid name part") ? name.replace(/\s+/g, " ").trim() : "";
    } catch (error) {
        return "";
    }
}

// WikiTree serves only the thumbnails it has already made: 75px (the API's) and 300px (the profile page's).
const MADE_SIZES = [75, 300];

/** Thumbnail URL for a person's photo (getPeople PhotoData), at least `size` pixels wide where there is one. */
export function photoUrl(person, size = 150) {
    const data = person?.photoData;
    if (!data) return "";
    if (size <= MADE_SIZES[0] && data.url) return siteUrl(data.url);
    const made = MADE_SIZES.find((width) => width >= size) || MADE_SIZES[MADE_SIZES.length - 1];
    if (data.path && Number(data.orig_width) > 0 && Number(data.orig_width) <= made) return siteUrl(data.path);
    if (data.dir && person.photo) return siteUrl(`${data.dir}/${person.photo}/${made}px-${person.photo}`);
    return data.url ? siteUrl(data.url) : "";
}

/** Adds a <style id="`id`"> with `css` to the page, once. */
export function addStyleOnce(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

const CHART_CSS = `
  .wbe-chart-popup { position: relative; display: flex; flex-direction: column; width: 100%; height: calc(100vh - 230px); min-height: 480px; border: 1px solid #d8d8d8; border-radius: 8px; background: #fff; overflow: hidden; box-sizing: border-box; }
  .wbe-chart-popup .chat-popup-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .3rem .75rem; padding: .45rem .75rem; border-bottom: 1px solid #ececec; background: #fff; }
  .wbe-chart-popup .chat-popup-header > strong { flex: 1 1 12rem; min-width: 0; }
  .wbe-chart-popup .chat-popup-controls { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .3rem; margin-left: auto; }
  .wbe-chart-popup .chat-popup-controls button.small { white-space: nowrap; margin: 0; }
  .wbe-chart-popup .chat-popup-body { flex: 1; display: flex; flex-direction: column; padding: 0; min-height: 0; overflow: hidden; position: relative; }
  .wbe-chart-toolbar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 10px; border-bottom: 1px solid rgba(0,0,0,.08); font-size: 12px; }
  .wbe-chart-toolbar .wbe-chart-spacer { flex: 1; }
  .wbe-chart-stage { flex: 1; position: relative; min-height: 0; }
  .wbe-chart-footer { display: flex; gap: 14px; align-items: flex-start; padding: 6px 10px 8px; border-top: 1px solid rgba(0,0,0,.08); font-size: 12px; position: relative; max-height: 30%; overflow-y: auto; }
  .wbe-chart-stats { white-space: nowrap; }
  .wbe-chart-stats strong { font-size: 18px; display: block; }
`;

export function injectChartStyles() {
    addStyleOnce("wbe-chart-style", CHART_CSS);
}

function download(name, href) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/** Saves `blob` as a file called `name`. */
export function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob);
    download(name, url);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function svgMarkup(svgNode) {
    const node = svgNode.cloneNode(true);
    node.querySelector("g")?.removeAttribute("transform");
    node.setAttribute("style", "background:#ffffff");
    return new XMLSerializer().serializeToString(node);
}

/** Saves the chart as "svg" or "png" (2400px wide, white background). The first <g> is the zoom layer and is reset. */
export function saveChart(svgNode, fileBase, format) {
    const markup = svgMarkup(svgNode);
    if (format === "svg") {
        downloadBlob(`${fileBase}.svg`, new Blob([markup], { type: "image/svg+xml" }));
        return;
    }
    const [, , w, h] = String(svgNode.getAttribute("viewBox") || "0 0 800 800")
        .split(" ")
        .map(Number);
    const scale = 2400 / w;
    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        download(`${fileBase}.png`, canvas.toDataURL("image/png"));
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

const CHART_RESUME_EVENT = "wbe-chart-resume";

/** For a view with its own animation loop: callback when the chart holding `element` comes back. Returns the remover. */
export function onChartResume(element, callback) {
    const listener = (event) => {
        if (event.target instanceof Node && event.target.contains(element)) callback();
    };
    document.addEventListener(CHART_RESUME_EVENT, listener);
    return () => document.removeEventListener(CHART_RESUME_EVENT, listener);
}

/** The panel the chart draws in, inside `host` (the Tree Apps view container). */
export function createChartPopup({ id, html, host }) {
    injectChartStyles();
    document.getElementById(id)?._wbeCloseChart?.();
    const popup = document.createElement("div");
    popup.id = id;
    popup.className = "wbe-chart-popup";
    popup.innerHTML = html;
    popup._wbeSignal = new AbortController();
    let closed = false;
    popup._wbeCloseChart = () => {
        if (closed) return;
        closed = true;
        popup._wbeSignal?.abort();
        try {
            popup._wbeChartCleanup?.();
        } finally {
            popup.remove();
        }
    };
    (host || document.body).appendChild(popup);
    return popup;
}

/** Finish setup after drawing, and register renderer cleanup for close. */
export function mountChartPopup(popup, cleanup, { stage, resize } = {}) {
    const observer = stage && resize && typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
    observer?.observe(stage);
    popup._wbeChartCleanup = () => {
        try {
            cleanup?.();
        } finally {
            observer?.disconnect();
        }
    };
}

/** Closes the chart and releases everything it holds. */
export function closeChartPopup(popup) {
    popup?._wbeCloseChart?.();
}
