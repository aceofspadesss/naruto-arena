/**
 * Ladder System Configuration
 * 
 * Adjust these values to customize the ladder ranking system.
 */
module.exports = {
    // Climb percentage when beating a higher-ranked player
    // Default: 0.25 (25% of the difference)
    CLIMB_PERCENTAGE: 0.25,

    // Ninja rank thresholds (percentile from bottom)
    // Must sum to 100 (excluding Academy Student and Hokage)
    // Order: from lowest rank to highest rank
    NINJA_RANKS: [
        { name: 'Genin', percentile: 40 },           // Bottom 40%
        { name: 'Chuunin', percentile: 30 },         // Next 30%
        { name: 'Special Jounin', percentile: 20 },  // Next 20%
        { name: 'Jounin', percentile: 8 },           // Next 8%
        { name: 'Legendary Sannin', percentile: 2 }  // Top 2%
    ],

    // Special ranks
    UNRANKED_RANK: 'Academy Student',  // For players with no wins
    TOP_RANK: 'Hokage'                 // For position #1 only
};
