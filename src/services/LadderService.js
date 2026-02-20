const UserModel = require('../models/UserModel');
const ladderConfig = require('../config/ladderConfig');

/**
 * Ladder Service
 * 
 * Handles all ladder ranking logic including:
 * - Position-based ranking (lower = better, position 1 is #1)
 * - Percentile-based ninja rank assignment
 * - 25% climb algorithm when beating higher-ranked players
 */
class LadderService {
    /**
     * Get all ranked users sorted by ladder position (ascending = best first)
     * @returns {Array} Sorted array of ranked users
     */
    static getRankedUsers() {
        const users = UserModel.getUsers();
        return users
            .filter(u => u.ladderPosition !== null && u.ladderPosition !== undefined)
            .sort((a, b) => a.ladderPosition - b.ladderPosition);
    }

    /**
     * Get total count of ranked players
     * @returns {number}
     */
    static getTotalRanked() {
        return this.getRankedUsers().length;
    }

    /**
     * Calculate the position thresholds for each ninja rank based on total ranked players
     * Returns an array with cumulative position thresholds from top to bottom
     * @param {number} totalRanked - Total number of ranked players
     * @returns {Array} Array of { name, maxPosition } objects
     */
    static getNinjaRankThresholds(totalRanked) {
        if (totalRanked === 0) return [];

        const thresholds = [];
        let cumulativePercentile = 0;

        // Calculate from top rank to bottom rank (reverse order)
        const ranksReversed = [...ladderConfig.NINJA_RANKS].reverse();

        for (const rank of ranksReversed) {
            cumulativePercentile += rank.percentile;
            const maxPosition = Math.ceil((cumulativePercentile / 100) * totalRanked);
            thresholds.unshift({ name: rank.name, maxPosition });
        }

        return thresholds;
    }

    /**
     * Get ninja rank for a given position
     * @param {number} position - Player's ladder position (1 = best)
     * @param {number} totalRanked - Total number of ranked players
     * @returns {string} Ninja rank name
     */
    static getNinjaRank(position, totalRanked) {
        if (position === null || position === undefined) {
            return ladderConfig.UNRANKED_RANK;
        }

        if (position === 1) {
            return ladderConfig.TOP_RANK; // Hokage
        }

        if (totalRanked === 0) {
            return ladderConfig.NINJA_RANKS[0].name; // Default to Genin
        }

        const thresholds = this.getNinjaRankThresholds(totalRanked);

        // Find the rank based on position
        // thresholds are sorted from lowest rank (Genin) to highest (Legendary Sannin)
        // Position 1 = best, higher position = worse
        for (let i = thresholds.length - 1; i >= 0; i--) {
            if (position <= thresholds[i].maxPosition) {
                return thresholds[i].name;
            }
        }

        // Fallback to lowest rank
        return ladderConfig.NINJA_RANKS[0].name;
    }

    /**
     * Get the top (best) position for a ninja rank group
     * This is used in the climb calculation
     * @param {string} ninjaRank - The ninja rank name
     * @param {number} totalRanked - Total number of ranked players
     * @returns {number} The best position in that rank group
     */
    static getTopPositionForNinjaRank(ninjaRank, totalRanked) {
        if (ninjaRank === ladderConfig.TOP_RANK || ninjaRank === 'Legendary Sannin') {
            return 1; // Top of the ladder
        }

        if (ninjaRank === ladderConfig.UNRANKED_RANK) {
            return totalRanked; // Bottom of ladder
        }

        const thresholds = this.getNinjaRankThresholds(totalRanked);

        // Find the rank index
        const rankIndex = ladderConfig.NINJA_RANKS.findIndex(r => r.name === ninjaRank);

        if (rankIndex === -1) {
            return totalRanked; // Unknown rank, return bottom
        }

        // The top position for this rank is one below the max of the rank above it
        // For the highest regular rank (Legendary Sannin), top position is 1
        if (rankIndex === ladderConfig.NINJA_RANKS.length - 1) {
            return 1;
        }

        // Get the max position of the rank above this one
        const rankAboveIndex = rankIndex + 1;
        if (rankAboveIndex < thresholds.length) {
            return thresholds[rankAboveIndex].maxPosition + 1;
        }

        return 1;
    }

    /**
     * Calculate new position after a win using the 25% climb formula
     * Formula: newPosition = winnerPosition - floor((winnerPosition - opponentGroupTop) * CLIMB_PERCENTAGE)
     * @param {number} winnerPosition - Winner's current position
     * @param {string} loserNinjaRank - Loser's ninja rank
     * @param {number} totalRanked - Total ranked players
     * @returns {number} New position for the winner
     */
    static calculateNewPosition(winnerPosition, loserNinjaRank, totalRanked) {
        const opponentGroupTop = this.getTopPositionForNinjaRank(loserNinjaRank, totalRanked);

        // Can only climb if opponent's group top is better (lower number) than current position
        if (opponentGroupTop >= winnerPosition) {
            return winnerPosition; // No change - opponent is same or lower rank
        }

        const difference = winnerPosition - opponentGroupTop;
        const climb = Math.floor(difference * ladderConfig.CLIMB_PERCENTAGE);

        return winnerPosition - climb;
    }

    /**
     * Recalculate all ladder positions to remove gaps and ensure consistency
     * This shifts all positions to be sequential starting from 1
     */
    static recalculatePositions() {
        const rankedUsers = this.getRankedUsers();
        const users = UserModel.getUsers();

        // Reassign positions sequentially
        rankedUsers.forEach((rankedUser, index) => {
            const userIndex = users.findIndex(u => String(u.id) === String(rankedUser.id));
            if (userIndex !== -1) {
                users[userIndex].ladderPosition = index + 1;
            }
        });

        UserModel.saveUsers(users);
    }

    /**
     * Add a new player to the ladder (after their first win)
     * @param {string} userId - User ID to add
     * @returns {number} The new player's position
     */
    static addToLadder(userId) {
        const totalRanked = this.getTotalRanked();
        const newPosition = totalRanked + 1;

        const users = UserModel.getUsers();
        const userIndex = users.findIndex(u => String(u.id) === String(userId));

        if (userIndex !== -1) {
            users[userIndex].ladderPosition = newPosition;
            users[userIndex].rank = this.getNinjaRank(newPosition, newPosition);
            UserModel.saveUsers(users);
        }

        return newPosition;
    }

    /**
     * Process a ladder match result
     * @param {string} winnerId - Winner's user ID
     * @param {string} loserId - Loser's user ID
     */
    static processMatchResult(winnerId, loserId) {
        const users = UserModel.getUsers();
        const winner = users.find(u => String(u.id) === String(winnerId));
        const loser = users.find(u => String(u.id) === String(loserId));

        if (!winner) return;

        let totalRanked = this.getTotalRanked();

        // Check if winner is currently unranked (first win)
        const winnerWasUnranked = winner.ladderPosition === null || winner.ladderPosition === undefined;

        if (winnerWasUnranked) {
            // Add winner to bottom of ladder
            totalRanked++;
            winner.ladderPosition = totalRanked;
        }

        // Get loser's ninja rank (or Academy Student if unranked)
        const loserNinjaRank = loser
            ? (loser.ladderPosition ? this.getNinjaRank(loser.ladderPosition, totalRanked) : ladderConfig.UNRANKED_RANK)
            : ladderConfig.UNRANKED_RANK;

        // Calculate winner's new position
        const oldPosition = winner.ladderPosition;
        const newPosition = this.calculateNewPosition(oldPosition, loserNinjaRank, totalRanked);

        if (newPosition < oldPosition) {
            // Winner is moving up - shift affected players down
            users.forEach(u => {
                if (u.ladderPosition !== null &&
                    u.ladderPosition >= newPosition &&
                    u.ladderPosition < oldPosition &&
                    String(u.id) !== String(winnerId)) {
                    u.ladderPosition++;
                }
            });

            winner.ladderPosition = newPosition;
        }

        // Update winner's ninja rank
        winner.rank = this.getNinjaRank(winner.ladderPosition, totalRanked);

        // Update all ninja ranks (percentiles may have shifted)
        this.updateAllNinjaRanks(users, totalRanked);

        UserModel.saveUsers(users);
    }

    /**
     * Update ninja ranks for all ranked users based on current percentiles
     * @param {Array} users - Array of all users
     * @param {number} totalRanked - Total ranked players
     */
    static updateAllNinjaRanks(users, totalRanked) {
        users.forEach(user => {
            if (user.ladderPosition !== null && user.ladderPosition !== undefined) {
                user.rank = this.getNinjaRank(user.ladderPosition, totalRanked);
            }
        });
    }

    /**
     * Get top N players for leaderboard display
     * @param {number} count - Number of players to return (default 10)
     * @returns {Array} Top players with position, username, rank, wins, losses
     */
    static getTopPlayers(count = 10) {
        const rankedUsers = this.getRankedUsers();
        const totalRanked = rankedUsers.length;

        return rankedUsers.slice(0, count).map(user => ({
            position: user.ladderPosition,
            username: user.username,
            ninjaRank: this.getNinjaRank(user.ladderPosition, totalRanked),
            wins: user.wins || 0,
            losses: user.losses || 0,
            streak: user.streak || 0
        }));
    }

    /**
     * Get a user's ladder info
     * @param {string} userId - User ID
     * @returns {Object} Ladder info including position, rank, etc.
     */
    static getUserLadderInfo(userId) {
        const user = UserModel.findById(userId);
        if (!user) return null;

        const totalRanked = this.getTotalRanked();

        return {
            position: user.ladderPosition,
            ninjaRank: this.getNinjaRank(user.ladderPosition, totalRanked),
            wins: user.wins || 0,
            losses: user.losses || 0,
            isRanked: user.ladderPosition !== null && user.ladderPosition !== undefined,
            totalRanked
        };
    }

    /**
     * Get top N players by total wins
     * @param {number} count - Number of players to return (default 10)
     * @returns {Array} Top players sorted by wins
     */
    static getTopByWins(count = 10) {
        const users = UserModel.getUsers();
        return users
            .filter(u => (u.wins || 0) > 0)
            .sort((a, b) => (b.wins || 0) - (a.wins || 0))
            .slice(0, count)
            .map(user => ({
                username: user.username,
                wins: user.wins || 0
            }));
    }

    /**
     * Get top N players by current win streak
     * @param {number} count - Number of players to return (default 10)
     * @returns {Array} Top players sorted by streak (only positive streaks)
     */
    static getTopByStreak(count = 10) {
        const users = UserModel.getUsers();
        return users
            .filter(u => (u.streak || 0) > 0)
            .sort((a, b) => (b.streak || 0) - (a.streak || 0))
            .slice(0, count)
            .map(user => ({
                username: user.username,
                streak: user.streak || 0
            }));
    }

    /**
     * Get Country Ladder rankings
     * Rules:
     * - Only countries with at least 10 active (ranked) players are included
     * - Points = Total Players - Average Ladder Rank of Top 10 Players
     * @returns {Array} Sorted array of country stats { name, playerCount, points }
     */
    static getCountryLadder() {
        const rankedUsers = this.getRankedUsers();
        const countries = {};

        // Group ranked users by country
        rankedUsers.forEach(user => {
            if (!user.country) return; // Skip users without country

            if (!countries[user.country]) {
                countries[user.country] = [];
            }
            countries[user.country].push(user);
        });

        const ladder = [];

        for (const [countryName, users] of Object.entries(countries)) {
            // Filter: Must have at least 10 active (ranked) players
            if (users.length < 10) continue;

            // Sort users by rank (best to worst) just to be safe, though getRankedUsers returns them sorted
            users.sort((a, b) => a.ladderPosition - b.ladderPosition);

            // Get top 10 players for calculation
            const top10 = users.slice(0, 10);

            // Calculate Average Ladder Rank of Top 10
            const totalRank = top10.reduce((sum, user) => sum + user.ladderPosition, 0);
            const avgRank = totalRank / top10.length;

            // Calculate Points: Total Players - Average Ladder Rank
            const points = users.length - avgRank;

            ladder.push({
                name: countryName,
                playerCount: users.length,
                points: points
            });
        }

        // Sort by points descending
        return ladder.sort((a, b) => b.points - a.points);
    }
}

module.exports = LadderService;
