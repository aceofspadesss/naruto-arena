const CharacterModel = require('../models/CharacterModel');
const { AI_CONFIG } = require('../config');
const EffectSystem = require('../engine/EffectSystem');

class AiService {
    /**
     * Generate a Mock AI Opponent
     */
    static generateOpponent() {
        const chars = CharacterModel.findAll();
        // Select 3 random unique characters from unlocked ones
        const team = [];
        const availableChars = chars.filter(c => !c.locked);

        for (let i = 0; i < 3; i++) {
            if (availableChars.length === 0) break;
            const randIdx = Math.floor(Math.random() * availableChars.length);
            team.push(availableChars[randIdx].id);
            availableChars.splice(randIdx, 1);
        }

        const aiId = 'AI_' + Date.now();

        return {
            userId: aiId,
            username: 'Computer',
            team: team,
            isAi: true,
            level: Math.floor(Math.random() * 50) + 1,
            rank: this.getRandomRank(),
            wins: Math.floor(Math.random() * 100),
            losses: Math.floor(Math.random() * 50),
            streak: Math.floor(Math.random() * 10) - 2, // Some negative streaks too
            ladderPosition: Math.floor(Math.random() * 1000) + 1
        };
    }

    static getRandomRank() {
        // Must match the rank names used by LadderService / ladderConfig
        const ranks = ['Genin', 'Chuunin', 'Special Jounin', 'Jounin', 'Legendary Sannin'];
        return ranks[Math.floor(Math.random() * ranks.length)];
    }

    /**
     * Prepare AI Turn
     * Decides actions for the AI player.
     * @param {Object} battle - The current battle state
     * @param {string} aiId - The AI player ID
     */
    static prepareTurn(battle, aiId) {
        const aiPlayer = battle.players[aiId];
        const opponentId = Object.keys(battle.players).find(id => id !== aiId);
        const opponent = battle.players[opponentId]; // Actually incorrect, need to use find

        console.log(`[AI] Thinking for turn ${battle.turn}...`);

        // 1. Maintain or Choose Vendetta (random selection, re-pick randomly when target dies)
        const currentVendetta = aiPlayer.vendettaTarget;
        if (currentVendetta === undefined || currentVendetta === null || !this.isAlive(opponent, currentVendetta)) {
            aiPlayer.vendettaTarget = this.chooseVendetta(opponent);
            console.log(`[AI] New Vendetta Target: ${aiPlayer.vendettaTarget}`);
        } else {
            console.log(`[AI] Maintaining Vendetta Target: ${aiPlayer.vendettaTarget}`);
        }

        // 2. Aggression / Chakra Check (Roll for pass)
        // Roll 0..2. If 0, skip turn (pass).
        // BUT logic says "Aggression Threshold" is 2.
        // Let's implement user spec: "1 in 3 chance... picks from 0..2 and passes if 0"
        const aggressionRoll = Math.floor(Math.random() * 3); // 0, 1, 2
        console.log(`[AI] Aggression Roll: ${aggressionRoll}`);

        // If roll is 0, we SKIP everything (Pass turn) to save chakra? 
        // Or do we just skip ONE character? Spec says "Before acting with any specific Ninja... chance that a Ninja will do nothing".
        // Wait, "The AI iterates through each of its living Ninjas... Before acting with ANY specific Ninja... chance... Ninja will do nothing".
        // So it's per-ninja.

        const actions = []; // Array of actions for the turn

        // Iterate living ninjas
        aiPlayer.health.forEach((hp, charIdx) => {
            if (hp <= 0) return;

            // Stun Check: skip this ninja if stunned
            const charEffectsForStun = aiPlayer.activeEffects && aiPlayer.activeEffects[charIdx];
            if (EffectSystem.hasEffectType(charEffectsForStun, 'stun')) {
                console.log(`[AI] Ninja ${charIdx} is stunned, skipping.`);
                return;
            }

            // Aggression Check per Ninja
            const ninjaAggression = Math.floor(Math.random() * 3);
            if (ninjaAggression === 0 && aggressionRoll < AI_CONFIG.AGGRESSION_THRESHOLD) {
                // Wait, "if 0, pass". "Aggression Threshold" is 2.
                // If I roll 0, 1, 2. 0 < 2 (True). 1 < 2 (True).
                // Misunderstood spec? 
                // "There is a chance (1 in 3, roughly, since it picks from 0..2 and passes if 0)"
                // So if roll == 0 -> PASS.
                console.log(`[AI] Ninja ${charIdx} skipping turn to save chakra.`);
                return;
            }

            // Generate Options
            const validMoves = this.getValidMoves(battle, aiPlayer, opponent, charIdx);

            // Prerequisite Check:
            // Check if this character has skills with unmet prerequisites.
            // If so, proactively use the prerequisite skill this turn.
            const prereqMove = this.findPrerequisiteMove(battle, aiPlayer, opponent, charIdx);

            if (prereqMove) {
                // Prefer using the prerequisite to set up for next turn
                this.deductChakra(aiPlayer.chakra, this.parseChakraCost(prereqMove._skillChakra));
                delete prereqMove._skillChakra;
                actions.push(prereqMove);
                console.log(`[AI] Ninja ${charIdx} using prerequisite skill to set up for next turn.`);
            } else if (validMoves.length > 0) {
                // Weight Options
                const weightedMoves = [];
                validMoves.forEach(move => {
                    let weight = 1;

                    // Vendetta Weight
                    if (move.isEnemyTarget && this.isTargetingVendetta(move, aiPlayer.vendettaTarget)) {
                        weight = AI_CONFIG.VENDETTA_RATIO;
                    }

                    // Add to list 'weight' times
                    for (let k = 0; k < weight; k++) {
                        weightedMoves.push(move);
                    }
                });

                // Pick one
                const finalMove = weightedMoves[Math.floor(Math.random() * weightedMoves.length)];

                // Deduct chakra cost so subsequent ninja selections account for it
                this.deductChakra(aiPlayer.chakra, this.parseChakraCost(finalMove._skillChakra));

                // Remove helper props
                delete finalMove.isEnemyTarget;
                delete finalMove._skillChakra;

                actions.push(finalMove);
            }
        });

        // Shuffle Order (Spec: "Once actions are selected... shuffles the order")
        // Not strictly necessary as engine processes them somewhat sequentially or simultaneously depending on interpretation, for now just push to action array.
        // Actually engine processes array sequentially.

        // Return actions
        aiPlayer.action = actions;
        aiPlayer.ready = true;
    }

    static isAlive(player, targetIndex) {
        return player.health[targetIndex] > 0;
    }

    static chooseVendetta(opponent) {
        const livingIndices = [];
        opponent.health.forEach((hp, idx) => {
            if (hp > 0) livingIndices.push(idx);
        });
        if (livingIndices.length === 0) return 0;
        return livingIndices[Math.floor(Math.random() * livingIndices.length)];
    }

    /**
     * Check if a character has skills with unmet prerequisites.
     * If so, return a move to use the prerequisite skill this turn.
     */
    static findPrerequisiteMove(battle, actor, opponent, charIdx) {
        const charId = actor.team[charIdx];
        const charData = CharacterModel.findById(charId);
        if (!charData) return null;

        // Find skills that have a `requires` field and whose prerequisite isn't active
        for (const skill of charData.skills) {
            if (!skill.requires) continue;

            // Check if the prerequisite is already active
            const charEffects = actor.activeEffects ? actor.activeEffects[charIdx] : [];
            const hasReq = charEffects && charEffects.some(e =>
                e.imageId == skill.requires &&
                !['stun', 'mark', 'damage', 'aoe_damage', 'disable_damage_reduction'].includes(e.type)
            );
            if (hasReq) continue; // Already active, no need to use prereq

            // Find the prerequisite skill on this character
            const prereqSkillIdx = charData.skills.findIndex(s => s.id == skill.requires);
            if (prereqSkillIdx === -1) continue;

            const prereqSkill = charData.skills[prereqSkillIdx];

            // Check prereq is usable (not on cooldown, has chakra)
            if (actor.cooldowns[charIdx][prereqSkillIdx] > 0) continue;
            const prereqCost = this.parseChakraCost(prereqSkill.chakra);
            if (!this.hasEnoughChakra(actor.chakra, prereqCost)) continue;

            // Get valid targets for the prerequisite skill
            const prereqTargets = this.getValidTargets(prereqSkill, actor, opponent, charIdx, battle);
            if (prereqTargets.length === 0) continue;

            // Prefer vendetta target if available, otherwise random
            const vendettaIdx = actor.vendettaTarget;
            const vendettaTarget = prereqTargets.find(t => parseInt(t.slice(-1)) === vendettaIdx);
            const prereqTarget = vendettaTarget || prereqTargets[Math.floor(Math.random() * prereqTargets.length)];
            console.log(`[AI] Ninja ${charIdx} using prerequisite ${prereqSkill.name} to unlock ${skill.name}`);

            return {
                charIndex: charIdx,
                skillIndex: prereqSkillIdx,
                charId: charId,
                targetId: prereqTarget,
                _skillChakra: prereqSkill.chakra
            };
        }

        return null;
    }

    static getValidMoves(battle, actor, opponent, charIdx) {
        const moves = [];
        const charId = actor.team[charIdx];
        const charData = CharacterModel.findById(charId);

        if (!charData) return [];

        charData.skills.forEach((skill, skillIdx) => {
            // 1. Cooldown Check
            if (actor.cooldowns[charIdx][skillIdx] > 0) return;

            // 2. Chakra Check (use skill.chakra string, not skill.cost which doesn't exist)
            const skillCost = this.parseChakraCost(skill.chakra);
            if (!this.hasEnoughChakra(actor.chakra, skillCost)) return;

            // 3. Requirement Check
            if (skill.requires) {
                const charEffects = actor.activeEffects ? actor.activeEffects[charIdx] : [];
                const hasReq = charEffects && charEffects.some(e =>
                    e.imageId == skill.requires &&
                    !['stun', 'mark', 'damage', 'aoe_damage', 'disable_damage_reduction'].includes(e.type)
                );
                if (!hasReq) return;
            }

            // 4. Target Check
            const validTargets = this.getValidTargets(skill, actor, opponent, charIdx, battle);
            const isEnemyTarget = (skill.target === 'enemy' || skill.target === 'all_enemies' || skill.target === 'all_marked');

            validTargets.forEach(targetId => {
                moves.push({
                    charIndex: charIdx,
                    skillIndex: skillIdx,
                    charId: charId,
                    targetId: targetId,
                    isEnemyTarget: isEnemyTarget,
                    _skillChakra: skill.chakra
                });
            });
        });

        return moves;
    }

    static parseChakraCost(chakraStr) {
        const cost = { tai: 0, blo: 0, nin: 0, gen: 0, rnd: 0 };
        if (!chakraStr) return cost;
        for (const char of String(chakraStr)) {
            if (char === '1') cost.tai++;
            else if (char === '2') cost.blo++;
            else if (char === '3') cost.nin++;
            else if (char === '4') cost.gen++;
            else if (char === '0') cost.rnd++;
        }
        cost.rnd = cost.tai + cost.blo + cost.nin + cost.gen;
        return cost;
    }

    static hasEnoughChakra(pool, cost) {
        if (!cost) return true;
        // Check specific type requirements
        for (const type of ['tai', 'blo', 'nin', 'gen']) {
            if ((cost[type] || 0) > 0 && pool[type] < cost[type]) return false;
        }
        // Check random (any type) requirements
        if ((cost.rnd || 0) > pool.rnd) return false;
        return true;
    }

    static deductChakra(pool, cost) {
        if (!cost) return;
        for (const type of ['tai', 'blo', 'nin', 'gen']) {
            if (cost[type] > 0) {
                pool[type] = Math.max(0, pool[type] - cost[type]);
            }
        }
        pool.rnd = pool.tai + pool.blo + pool.nin + pool.gen;
    }

    static getValidTargets(skill, actor, opponent, charIdx, battle) {
        const targets = [];

        // Determine prefixes based on battle order
        // battle.players is object { id: playerObj }
        // battle.order is [p1Id, p2Id]
        // "0" prefix -> battle.order[0]
        // "1" prefix -> battle.order[1]

        const actorIndex = battle.order.indexOf(actor.id); // 0 or 1
        const opponentIndex = battle.order.indexOf(opponent.id); // 0 or 1

        const actorPrefix = String(actorIndex);
        const opponentPrefix = String(opponentIndex);

        // Enemy Targeted
        if (skill.target === 'enemy' || skill.target === 'all_enemies') {
            opponent.health.forEach((hp, idx) => {
                if (hp <= 0) return;
                if (EffectSystem.hasEffectType(opponent.activeEffects[idx], 'invulnerable')) return;

                // Unique skill check: skip targets that already have this skill's effect from this actor
                if (skill.unique && opponent.activeEffects[idx] &&
                    opponent.activeEffects[idx].some(e => e.imageId == skill.id && e.casterId == actor.id)) {
                    console.log(`[AI] Unique check: skipping target ${idx} for ${skill.name} (already affected)`);
                    return;
                }

                targets.push(`${opponentPrefix}${idx}`);
            });
        }
        // All Marked Enemies (e.g. Chakra Leach targeting enemies with Female Bug mark)
        else if (skill.target === 'all_marked') {
            const markId = skill.target_req_effect;
            let hasAnyMarkedTarget = false;
            opponent.health.forEach((hp, idx) => {
                if (hp <= 0) return;
                if (EffectSystem.hasEffectType(opponent.activeEffects[idx], 'invulnerable')) return;
                if (markId && !EffectSystem.hasMark(opponent.activeEffects[idx], markId, actor.id)) return;
                hasAnyMarkedTarget = true;
            });
            // For all_marked, the targetId is the first valid marked enemy (engine hits all marked)
            if (hasAnyMarkedTarget) {
                const firstMarked = opponent.health.findIndex((hp, idx) => {
                    if (hp <= 0) return false;
                    if (EffectSystem.hasEffectType(opponent.activeEffects[idx], 'invulnerable')) return false;
                    if (markId && !EffectSystem.hasMark(opponent.activeEffects[idx], markId, actor.id)) return false;
                    return true;
                });
                if (firstMarked !== -1) targets.push(`${opponentPrefix}${firstMarked}`);
            }
        }
        // Ally Targeted
        else if (skill.target === 'ally' || skill.target === 'self' || skill.target === 'all_allies') {
            const isSelfOnly = skill.target === 'self';
            actor.health.forEach((hp, idx) => {
                if (hp > 0) {
                    if (isSelfOnly && idx !== charIdx) return;
                    targets.push(`${actorPrefix}${idx}`);
                }
            });
        }

        return targets;
    }

    static isTargetingVendetta(move, vendettaIdx) {
        const targetSlot = parseInt(move.targetId.slice(-1));
        return targetSlot === vendettaIdx;
    }
}

module.exports = AiService;
