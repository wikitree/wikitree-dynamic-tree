window.DateFormatOptions = (() => {
    const STORAGE_KEY_FORMAT = "shared_date_format_id";
    const STORAGE_KEY_STATUS = "shared_date_status_format";

    const DEFAULT_FORMAT_ID = "dsmy";
    const DEFAULT_STATUS_FORMAT = "abbreviations";

    const FORMAT_OPTIONS = [
        { id: "iso", label: "1859-11-24", descendants: "ISO", wtDate: "YYYY-MM-DD" },
        { id: "mdy", label: "November 24, 1859", descendants: "MDY", wtDate: "MMMM D, YYYY" },
        { id: "smdy", label: "Nov 24, 1859", descendants: "sMDY", wtDate: "MMM D, YYYY" },
        { id: "dmy", label: "24 November 1859", descendants: "DMY", wtDate: "D MMMM YYYY" },
        { id: "dsmy", label: "24 Nov 1859", descendants: "DsMY", wtDate: "D MMM YYYY" },
        { id: "y", label: "1859", descendants: "Y", wtDate: "YYYY" },
    ];

    const STATUS_OPTIONS = [
        { id: "abbreviations", label: "bef., aft., abt." },
        { id: "words", label: "before, after, about" },
        { id: "symbols", label: "<, >, ~" },
    ];

    const getFormatIdFromDescendants = (value) => FORMAT_OPTIONS.find((opt) => opt.descendants === value)?.id || null;

    const getFormatIdFromWtDate = (value) => FORMAT_OPTIONS.find((opt) => opt.wtDate === value)?.id || null;

    const getStoredFormatId = () => {
        const stored = localStorage.getItem(STORAGE_KEY_FORMAT);
        if (stored) return stored;

        const legacyShared = localStorage.getItem("shared_date_format");
        if (legacyShared) {
            const legacyId = getFormatIdFromWtDate(legacyShared) || getFormatIdFromDescendants(legacyShared);
            if (legacyId) return legacyId;
        }

        const descendantsLegacy = localStorage.getItem("descendantsDateFormat");
        if (descendantsLegacy) {
            const id = getFormatIdFromDescendants(descendantsLegacy);
            if (id) return id;
        }

        const familyLegacy = localStorage.getItem("familyView_options");
        if (familyLegacy) {
            try {
                const parsed = JSON.parse(familyLegacy);
                const id = getFormatIdFromWtDate(parsed?.dateFormat);
                if (id) return id;
            } catch (e) {
                // ignore
            }
        }

        return DEFAULT_FORMAT_ID;
    };

    const setStoredFormatId = (id) => {
        if (id) localStorage.setItem(STORAGE_KEY_FORMAT, id);
    };

    const getStoredStatusFormat = () =>
        localStorage.getItem(STORAGE_KEY_STATUS) ||
        localStorage.getItem("descendantsDateDataStatusFormat") ||
        DEFAULT_STATUS_FORMAT;

    const setStoredStatusFormat = (value) => {
        if (value) localStorage.setItem(STORAGE_KEY_STATUS, value);
    };

    const getFormatValue = (id, type) => {
        const opt = FORMAT_OPTIONS.find((option) => option.id === id);
        if (!opt) return null;
        return type === "descendants" ? opt.descendants : opt.wtDate;
    };

    const buildFormatOptionsHtml = (selectedId) => {
        const selected = selectedId || getStoredFormatId();
        return FORMAT_OPTIONS.map(({ id, label }) => {
            const isSelected = id === selected ? "selected" : "";
            return `<option value="${id}" ${isSelected}>${label}</option>`;
        }).join("");
    };

    const buildStatusOptionsHtml = (selectedId) => {
        const selected = selectedId || getStoredStatusFormat();
        return STATUS_OPTIONS.map(({ id, label }) => {
            const isSelected = id === selected ? "selected" : "";
            return `<option value="${id}" ${isSelected}>${label}</option>`;
        }).join("");
    };

    const applyFormatToSelect = (selectElement, selectedId) => {
        if (!selectElement) return;
        selectElement.innerHTML = buildFormatOptionsHtml(selectedId);
    };

    const applyStatusToSelect = (selectElement, selectedId) => {
        if (!selectElement) return;
        selectElement.innerHTML = buildStatusOptionsHtml(selectedId);
    };

    const formatStatus = (status, statusFormat) => {
        if (!status) return "";
        let statusOut = "";
        switch (status) {
            case "before":
                statusOut = "before";
                break;
            case "after":
                statusOut = "after";
                break;
            case "guess":
                statusOut = "about";
                break;
            case "certain":
            case "on":
            default:
                statusOut = "";
                break;
        }

        if (!statusOut) return "";

        if (statusFormat === "abbreviations") {
            return statusOut.replace("before", "bef.").replace("after", "aft.").replace("about", "abt.");
        }
        if (statusFormat === "symbols") {
            return statusOut.replace("before", "<").replace("after", ">").replace("about", "~");
        }
        return statusOut;
    };

    return {
        STORAGE_KEY_FORMAT,
        STORAGE_KEY_STATUS,
        DEFAULT_FORMAT_ID,
        DEFAULT_STATUS_FORMAT,
        FORMAT_OPTIONS,
        STATUS_OPTIONS,
        getStoredFormatId,
        setStoredFormatId,
        getStoredStatusFormat,
        setStoredStatusFormat,
        getFormatIdFromDescendants,
        getFormatIdFromWtDate,
        getFormatValue,
        buildFormatOptionsHtml,
        buildStatusOptionsHtml,
        applyFormatToSelect,
        applyStatusToSelect,
        formatStatus,
    };
})();
