/*
 * WikiTree's Research Status and Relationship Status indicators, as the API reports them.
 *
 * Research Status (https://www.wikitree.com/wiki/Help:Research_Status) is a number on a profile: how complete the
 * research is, set by members. Relationship Status (https://www.wikitree.com/wiki/Help:Relationship_Status) says how
 * sure we are of a parent-child link (kept on the child, per parent) or of a marriage.
 *
 * Pure functions so they can be tested in Node.
 */

// ResearchStatus. "No Status" (0) is not displayed anywhere on WikiTree, and is not displayed here.
export const RESEARCH_STATUS = Object.freeze({
    10: { label: "Unfinished", meaning: "This profile needs more research." },
    20: { label: "Help Requested", meaning: "A request for help finding sources." },
    30: {
        label: "Sources to Review",
        meaning: "Sources have been identified but not yet fully analyzed and integrated into the profile.",
    },
    40: { label: "Silver Standard", meaning: "More research is not needed for now." },
    50: {
        label: "Gold Standard Candidate",
        meaning: "A member believes the Gold Standard requirements are met and has asked for a review.",
    },
    60: { label: "Gold Standard", meaning: "Genealogically complete and peer reviewed." },
});

// DataStatus.Father / Mother: how sure the parent-child link is. Confident is the normal case and is not marked.
export const RELATIONSHIP_STATUS = Object.freeze({
    5: { label: "Non-biological", meaning: "Not a biological relationship (for example adoptive or step)." },
    10: { label: "Uncertain", meaning: "The relationship is not certain." },
    20: { label: "Confident", meaning: "Supported by a reliable source." },
    30: { label: "Confirmed with DNA", meaning: "Confirmed by DNA evidence." },
});

export const CONFIDENT = 20;

/**
 * The research status to show, or null for "No Status" and anything that is not one of WikiTree's values.
 */
export function researchStatusOf(code) {
    const status = RESEARCH_STATUS[Number(code)];
    return status ? { code: Number(code), ...status } : null;
}

/**
 * The parent-child relationship status for a code from DataStatus ("20", 20, ""), or null if it is unset or unknown.
 */
export function relationshipStatusOf(code) {
    const status = RELATIONSHIP_STATUS[Number.parseInt(code, 10)];
    return status ? { code: Number.parseInt(code, 10), ...status } : null;
}

/**
 * Which relationships get a mark. Confident is the normal case, so only the others are marked (as on WikiTree's
 * own tree views), and the report's key says so.
 */
export function isMarked(code) {
    const status = relationshipStatusOf(code);
    return Boolean(status && status.code !== CONFIDENT);
}

/**
 * The status of a child's link to one parent, read from the child's own DataStatus. The link may be to a listed or
 * a biological parent; each has its own status. null if the child does not name that parent or no status is set.
 *
 * @param {object} child  API person
 * @param {string} parentId
 */
export function parentLinkStatus(child, parentId) {
    if (!child || !parentId) return null;
    const data = child.DataStatus || {};
    const pairs = [
        [child.Father, data.Father],
        [child.Mother, data.Mother],
        [child.BioFather, data.BioFather],
        [child.BioMother, data.BioMother],
    ];
    // A person who is both the listed and the biological parent has both; the listed link's status is the one shown.
    for (const [id, code] of pairs) {
        if (String(id) === String(parentId) && relationshipStatusOf(code)) return relationshipStatusOf(code);
    }
    return null;
}

/**
 * A marriage's status from a Spouses entry. WikiTree records whether the marriage itself is confident or uncertain
 * (separately from its date and place) as data_status.certainty. Anything that is not clearly uncertain is not marked.
 */
export function marriageStatusOf(spouse) {
    const certainty = String(spouse?.data_status?.certainty ?? spouse?.DataStatus?.certainty ?? "").toLowerCase();
    if (certainty === "certain" || certainty === "confident") return { code: CONFIDENT, label: "Confident" };
    if (certainty === "uncertain" || certainty === "guess") return { code: 10, label: "Uncertain" };
    return null;
}
