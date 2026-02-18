const MissionModel = require('../models/MissionModel');
const UserModel = require('../models/UserModel');

const RANK_ORDER = ['Academy Student', 'Genin', 'Chuunin', 'Special Jounin', 'Jounin', 'Legendary Sannin', 'Hokage'];

function isRankMet(mission, user) {
    const userIdx = RANK_ORDER.indexOf(user.rank);
    const reqIdx = RANK_ORDER.indexOf(mission.requirements.rank);
    return userIdx >= reqIdx;
}

function arePrereqsMet(mission, user) {
    const completed = user.completedMissions || [];
    return mission.requirements.missionsCompleted.every(id => completed.includes(id));
}

function isMissionActive(mission, user) {
    const completed = user.completedMissions || [];
    if (completed.includes(mission.id)) return false;
    return isRankMet(mission, user) && arePrereqsMet(mission, user);
}

// Get current progress count for a specific goal.
function getGoalCount(user, missionId, goalIndex) {
    return ((user.missionProgress || {})[missionId] || { goals: [] }).goals[goalIndex]?.count || 0;
}

function isGoalDone(goal, count) {
    return count >= goal.count;
}

function isMissionComplete(mission, user) {
    const goals = mission.goals || [];
    if (goals.length === 0) return false;
    return goals.every((goal, idx) => isGoalDone(goal, getGoalCount(user, mission.id, idx)));
}

// Called after a player wins a battle.
// winnerTeam / opponentTeam: arrays of character ID strings.
const MissionProgressService = {
    processWin(userId, winnerTeam, opponentTeam) {
        const users = UserModel.getUsers();
        const user = users.find(u => String(u.id) === String(userId));
        if (!user) return;

        const missions = MissionModel.getAllSync();
        if (!missions.length) return;

        console.log(`[Missions] processWin: user=${user.username} winnerTeam=[${winnerTeam}] opponentTeam=[${opponentTeam}]`);
        let changed = false;

        for (const mission of missions) {
            if (!isMissionActive(mission, user)) continue;

            const goals = mission.goals || [];
            if (goals.length === 0) continue;

            // Ensure progress structure exists
            if (!user.missionProgress) user.missionProgress = {};
            if (!user.missionProgress[mission.id]) {
                user.missionProgress[mission.id] = { goals: goals.map(() => ({ count: 0 })) };
            }
            // Pad goals array in case new goals were added since last play
            while (user.missionProgress[mission.id].goals.length < goals.length) {
                user.missionProgress[mission.id].goals.push({ count: 0 });
            }

            for (let i = 0; i < goals.length; i++) {
                const goal = goals[i];
                const currentCount = user.missionProgress[mission.id].goals[i].count;
                if (isGoalDone(goal, currentCount)) continue; // already complete

                const withChar = String(goal.characterId);
                let matches = false;

                if (goal.type === 'wins_with') {
                    matches = winnerTeam.map(String).includes(withChar);
                } else if (goal.type === 'wins_in_row_with') {
                    matches = winnerTeam.map(String).includes(withChar);
                } else if (goal.type === 'wins_against_with') {
                    const againstChar = String(goal.againstCharacterId);
                    matches = winnerTeam.map(String).includes(withChar) &&
                              opponentTeam.map(String).includes(againstChar);
                } else if (goal.type === 'wins_in_row_with_either') {
                    const char2 = String(goal.character2Id);
                    matches = winnerTeam.map(String).includes(withChar) ||
                              winnerTeam.map(String).includes(char2);
                } else if (goal.type === 'wins_with_any') {
                    const wt = winnerTeam.map(String);
                    matches = wt.includes(withChar) ||
                              wt.includes(String(goal.character2Id)) ||
                              wt.includes(String(goal.character3Id));
                }

                if (matches) {
                    user.missionProgress[mission.id].goals[i].count++;
                    changed = true;
                }
            }

            // Check if mission is now complete
            if (isMissionComplete(mission, user)) {
                if (!user.completedMissions) user.completedMissions = [];
                user.completedMissions.push(mission.id);
                changed = true;
                console.log(`[Missions] User ${user.username} completed mission: ${mission.name}`);
            }
        }

        if (changed) {
            UserModel.saveUsers(users);
        }
    },

    // Called after a player loses a battle.
    // loserTeam: array of character ID strings the loser used.
    processLoss(userId, loserTeam) {
        const users = UserModel.getUsers();
        const user = users.find(u => String(u.id) === String(userId));
        if (!user) return;

        const missions = MissionModel.getAllSync();
        if (!missions.length) return;

        let changed = false;

        for (const mission of missions) {
            if (!isMissionActive(mission, user)) continue;

            const goals = mission.goals || [];
            for (let i = 0; i < goals.length; i++) {
                const goal = goals[i];
                if (goal.type !== 'wins_in_row_with' && goal.type !== 'wins_in_row_with_either') continue;

                const currentCount = getGoalCount(user, mission.id, i);
                if (isGoalDone(goal, currentCount)) continue; // already done, don't reset

                // Reset if any of the tracked characters was on the losing team
                const trackedChars = [String(goal.characterId)];
                if (goal.type === 'wins_in_row_with_either' && goal.character2Id) {
                    trackedChars.push(String(goal.character2Id));
                }
                if (trackedChars.some(c => loserTeam.map(String).includes(c))) {
                    if (!user.missionProgress) user.missionProgress = {};
                    if (!user.missionProgress[mission.id]) {
                        user.missionProgress[mission.id] = { goals: goals.map(() => ({ count: 0 })) };
                    }
                    if (user.missionProgress[mission.id].goals[i]?.count > 0) {
                        user.missionProgress[mission.id].goals[i].count = 0;
                        changed = true;
                    }
                }
            }
        }

        if (changed) {
            UserModel.saveUsers(users);
        }
    }
};

module.exports = MissionProgressService;
