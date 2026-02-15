/**
 * Resolves a Target ID string (e.g. "12") to a target object/index.
 * @param {string} tid - The target ID string (e.g., "00", "12").
 * @returns {{target: 'enemy'|'ally', index: number}|null}
 */
function resolveTargetId(tid) {
    if (!tid || typeof tid !== 'string' || tid.length < 2) return null;
    const teamPrefix = tid.charAt(0);
    const slotIndex = parseInt(tid.charAt(1));

    if (teamPrefix === "1") {
        return { target: "enemy", index: slotIndex };
    } else {
        return { target: "ally", index: slotIndex };
    }
}

module.exports = {
    resolveTargetId
};
