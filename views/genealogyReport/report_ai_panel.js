/*
 * The AI overview panel of the Genealogy Report: a panel beside the report (never inside it, and never printed) where
 * the reader can copy a ready-made prompt, or send it to Claude, OpenAI or Gemini with their own API key.
 *
 * The API key lives only in this object's memory. It is never written to localStorage, sessionStorage, a cookie or
 * the address: Tree Apps from every WikiTree member share one origin (apps.wikitree.com), so anything stored there
 * could be read by another member's app. Only non-secret preferences (provider, model names, what to send) are saved.
 */

import { AI_PROVIDERS, AiError, buildAiPrompt, overviewToHtml, requestOverview } from "./report_ai.js";
import { dateStyleOf } from "./report_options.js";
import { esc } from "./report_html.js";

const PREFS_KEY = "genealogyReport.ai";

const DATA_LABELS = { facts: "Facts only", bios: "Facts plus short biography excerpts" };

function loadPrefs() {
    try {
        const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
        return { provider: "claude", models: {}, data: "facts", auto: false, ...saved };
    } catch {
        return { provider: "claude", models: {}, data: "facts", auto: false };
    }
}

function savePrefs(prefs) {
    try {
        // Deliberately no key here, only choices.
        localStorage.setItem(
            PREFS_KEY,
            JSON.stringify({ provider: prefs.provider, models: prefs.models, data: prefs.data, auto: prefs.auto })
        );
    } catch {
        // Storage can be blocked; the panel works without remembering anything.
    }
}

/** The panel's markup, hidden until a report has finished. */
export function aiPanelHtml() {
    const providers = Object.entries(AI_PROVIDERS)
        .map(([id, spec]) => `<option value="${id}">${esc(spec.label)}</option>`)
        .join("");
    const data = Object.entries(DATA_LABELS)
        .map(([id, label]) => `<option value="${id}">${esc(label)}</option>`)
        .join("");
    return `<section class="gr-ai-panel" aria-labelledby="gr-ai-title" hidden>
<h2 id="gr-ai-title">AI overview</h2>
<p class="gr-ai-note">This panel is not part of the report or the printout. An AI writes the overview from the facts in the report, so check it against the sources: it can make mistakes.</p>
<div class="gr-ai-row">
<label>AI provider <select class="gr-ai-provider">${providers}</select></label>
<label>Model <input type="text" class="gr-ai-model" spellcheck="false" autocomplete="off"></label>
<label>Send <select class="gr-ai-data">${data}</select></label>
</div>
<div class="gr-ai-row">
<label>Your API key <input type="password" class="gr-ai-key" autocomplete="off" spellcheck="false" placeholder="Pasted here, kept in memory only"></label>
<button type="button" class="btn gr-ai-forget">Forget key</button>
<label class="gr-check"><input type="checkbox" class="gr-ai-auto"> Write the overview automatically when a report finishes (needs the key)</label>
</div>
<p class="gr-ai-summary" aria-live="polite"></p>
<div class="gr-ai-row">
<button type="button" class="btn btn-primary gr-ai-generate">Generate overview</button>
<button type="button" class="btn gr-ai-cancel" hidden>Cancel</button>
<button type="button" class="btn gr-ai-copy-prompt">Copy prompt</button>
</div>
<p class="gr-ai-status" role="status" aria-live="polite"></p>
<div class="gr-ai-result" hidden>
<p class="gr-ai-label"></p>
<div class="gr-ai-text"></div>
<button type="button" class="btn gr-ai-copy-result">Copy overview</button>
</div>
<textarea class="gr-ai-prompt" readonly hidden aria-label="Prompt to copy" rows="8"></textarea>
</section>`;
}

export class AiPanel {
    /**
     * @param {HTMLElement} root  the element made by aiPanelHtml()
     * @param {{ fetch?: Function }} [deps]
     */
    constructor(root, deps = {}) {
        this.root = root;
        this.doFetch = deps.fetch || ((url, init) => window.fetch(url, init));
        this.prefs = loadPrefs();
        this.keys = {}; // provider -> API key; in memory only
        this.model = null;
        this.options = null;
        this.abort = null;
        this.resultText = "";

        this.provider = this.q(".gr-ai-provider");
        this.modelInput = this.q(".gr-ai-model");
        this.dataSelect = this.q(".gr-ai-data");
        this.keyInput = this.q(".gr-ai-key");
        this.autoBox = this.q(".gr-ai-auto");

        this.provider.value = AI_PROVIDERS[this.prefs.provider] ? this.prefs.provider : "claude";
        this.current = this.provider.value; // the provider whose model and key the fields below are showing
        this.dataSelect.value = this.prefs.data in DATA_LABELS ? this.prefs.data : "facts";
        this.autoBox.checked = Boolean(this.prefs.auto);
        this.showProviderFields();

        this.provider.addEventListener("change", () => this.onProviderChange());
        this.modelInput.addEventListener("input", () => this.rememberChoices());
        this.dataSelect.addEventListener("change", () => {
            this.rememberChoices();
            this.refreshSummary();
        });
        this.autoBox.addEventListener("change", () => this.rememberChoices());
        this.keyInput.addEventListener("input", () => {
            this.keys[this.current] = this.keyInput.value;
        });
        this.q(".gr-ai-forget").addEventListener("click", () => this.forgetKey());
        this.q(".gr-ai-generate").addEventListener("click", () => this.generate());
        this.q(".gr-ai-cancel").addEventListener("click", () => this.abort?.abort());
        this.q(".gr-ai-copy-prompt").addEventListener("click", () => this.copy(this.buildPrompt().prompt, "Prompt"));
        this.q(".gr-ai-copy-result").addEventListener("click", () => this.copy(this.resultText, "Overview"));
    }

    q(selector) {
        return this.root.querySelector(selector);
    }

    // ---- choices ---------------------------------------------------------------------------------------------------

    showProviderFields() {
        const id = this.provider.value;
        this.modelInput.value = this.prefs.models[id] || AI_PROVIDERS[id].defaultModel;
        this.keyInput.value = this.keys[id] || "";
    }

    onProviderChange() {
        this.rememberChoices(); // files the model box under the provider it was for
        this.current = this.provider.value;
        this.prefs.provider = this.current;
        savePrefs(this.prefs);
        this.showProviderFields();
    }

    rememberChoices() {
        const id = this.current;
        this.prefs.provider = this.provider.value;
        const model = this.modelInput.value.trim();
        if (model && model !== AI_PROVIDERS[id].defaultModel) this.prefs.models[id] = model;
        else delete this.prefs.models[id];
        this.prefs.data = this.dataSelect.value;
        this.prefs.auto = this.autoBox.checked;
        savePrefs(this.prefs);
    }

    forgetKey() {
        this.keys[this.provider.value] = "";
        this.keyInput.value = "";
        this.setStatus("Key forgotten.");
    }

    hasKey() {
        return Boolean((this.keys[this.provider.value] || "").trim());
    }

    // ---- the report finished ---------------------------------------------------------------------------------------------

    /**
     * Called when a report has finished loading. Shows the panel if the AI overview option is on.
     * @param {object} params
     * @param {object} params.model  the finished report model, with biographies attached
     * @param {object} params.options  the options the report was built with
     * @param {boolean} [params.auto]  write the overview now if the reader asked for that and a key is held
     * @param {boolean} [params.changed]  the same report was redrawn with different content (e.g. other parents chosen)
     */
    update({ model, options, auto = false, changed = false }) {
        this.model = model;
        this.options = options;
        if (!options.aiOverview) {
            this.reset();
            return;
        }
        this.root.hidden = false;
        // Biography excerpts need the biographies, which are only in the report if that option is on.
        const biosAvailable = options.includeBio;
        this.dataSelect.querySelector('option[value="bios"]').disabled = !biosAvailable;
        if (!biosAvailable && this.dataSelect.value === "bios") this.dataSelect.value = "facts";
        this.refreshSummary();
        if (changed && this.resultText) {
            this.q(".gr-ai-result").hidden = true;
            this.setStatus("The report has changed since this overview was written. Generate it again.");
        } else if (!changed) {
            this.clearResult();
            this.setStatus("");
        }
        if (auto && this.autoBox.checked && this.hasKey()) this.generate();
    }

    /** A new report is loading: hide the panel and drop anything written for the previous one. */
    reset() {
        this.abort?.abort();
        this.root.hidden = true;
        this.clearResult();
        this.setStatus("");
        this.model = null;
    }

    dispose() {
        this.abort?.abort();
        this.keys = {};
        this.keyInput.value = "";
        this.model = null;
    }

    // ---- prompt and summary ----------------------------------------------------------------------------------------------

    buildPrompt() {
        return buildAiPrompt(this.model, {
            includeBios: this.dataSelect.value === "bios" && this.options.includeBio,
            dateStyle: dateStyleOf(this.options),
        });
    }

    refreshSummary() {
        if (!this.model) return;
        const { included, excluded, withExcerpts, truncated } = this.buildPrompt();
        const parts = [
            `This will send ${included} ancestor${included === 1 ? "" : "s"}: names, dates, places and relationships`,
            withExcerpts ? ` and ${withExcerpts} short biography excerpt${withExcerpts === 1 ? "" : "s"}` : "",
            excluded
                ? `. ${excluded} ${excluded === 1 ? "person is" : "people are"} left out because they are living, presumed living or private`
                : "",
            truncated ? ". Some ancestors are left out to keep it short enough" : "",
            ".",
        ];
        this.q(".gr-ai-summary").textContent = parts.join("");
    }

    // ---- asking the AI -----------------------------------------------------------------------------------------------------

    async generate() {
        if (!this.model || this.abort) return;
        const providerId = this.provider.value;
        const spec = AI_PROVIDERS[providerId];
        const { prompt } = this.buildPrompt();
        this.abort = new AbortController();
        this.q(".gr-ai-generate").disabled = true;
        this.q(".gr-ai-cancel").hidden = false;
        this.clearResult();
        this.setStatus(`Asking ${spec.label}…`);
        try {
            const model = this.modelInput.value.trim() || spec.defaultModel;
            const text = await requestOverview({
                fetch: this.doFetch,
                provider: providerId,
                key: this.keys[providerId] || "",
                model,
                prompt,
                signal: this.abort.signal,
            });
            this.showResult(text, spec.label, model);
            this.setStatus("");
        } catch (error) {
            // Only the kind of failure is logged; the message and the key are never written to the console.
            console.warn("Genealogy Report: the AI overview failed:", error?.name || "error");
            this.setStatus(error instanceof AiError ? error.message : "The overview could not be written.");
        } finally {
            this.abort = null;
            this.q(".gr-ai-generate").disabled = false;
            this.q(".gr-ai-cancel").hidden = true;
        }
    }

    showResult(text, providerLabel, model) {
        this.resultText = text;
        this.q(".gr-ai-label").textContent =
            `Written by ${providerLabel} (${model}) from this report's facts, ${new Date().toLocaleString()}. Not checked against the sources.`;
        this.q(".gr-ai-text").innerHTML = overviewToHtml(text);
        this.q(".gr-ai-result").hidden = false;
    }

    clearResult() {
        this.resultText = "";
        this.q(".gr-ai-text").textContent = "";
        this.q(".gr-ai-result").hidden = true;
        const prompt = this.q(".gr-ai-prompt");
        prompt.hidden = true;
        prompt.value = "";
    }

    setStatus(message) {
        this.q(".gr-ai-status").textContent = message;
    }

    // ---- copying -----------------------------------------------------------------------------------------------------------

    async copy(text, what) {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            this.q(".gr-ai-prompt").hidden = true;
            this.setStatus(`${what} copied (${text.length.toLocaleString()} characters).`);
        } catch {
            // The page may not be allowed to use the clipboard: show the text, selected, to copy by hand.
            const box = this.q(".gr-ai-prompt");
            box.value = text;
            box.hidden = false;
            box.focus();
            box.select();
            this.setStatus(`Select all and copy the ${what.toLowerCase()} from the box below.`);
        }
    }
}
