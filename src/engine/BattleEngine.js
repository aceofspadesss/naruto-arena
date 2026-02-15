const BattleModel = require('../models/BattleModel');
const CharacterModel = require('../models/CharacterModel');
const UserModel = require('../models/UserModel');
const ChakraSystem = require('./ChakraSystem');
const EffectSystem = require('./EffectSystem');
const LadderService = require('../services/LadderService');
const AiService = require('../services/AiService');
const { resolveTargetId } = require('../utils');

/**
 * Core Battle Logic
 */
class BattleEngine {


    static processTurn(battleId) {
        const battle = BattleModel.findById(battleId);
        if (!battle) return;

        console.log(`[Battle ${battleId}] Processing Turn ${battle.turn} (Active: ${battle.activeTurn})`);

        // Ensure activeEffects
        Object.values(battle.players).forEach(p => {
            if (!p.activeEffects) p.activeEffects = [[], [], []];
        });

        const actorId = battle.activeTurn;
        const enemyId = battle.order.find(id => id != actorId);

        // AI Logic Hook
        const actorPlayer = battle.players[actorId];
        if (actorPlayer.isAi && !actorPlayer.ready) {
            AiService.prepareTurn(battle, actorId);
            // After prepareTurn, ready should be true and action set
            // We need to save the battle state so the action persists if we return here?
            // Actually dispatchAction uses in-memory battle object. 
            // So we can proceed immediately.
        }

        if (!battle.players[actorId].ready) return;

        // Support Multi-Action
        let actions = battle.players[actorId].action;
        if (!Array.isArray(actions)) actions = [actions];

        const actor = battle.players[actorId];
        const enemy = battle.players[enemyId];

        actions.forEach(action => {
            this.dispatchAction(battle, actor, enemy, action);
        });

        // Cleanup
        actor.action = null;
        actor.ready = false;

        // Switch Turn
        battle.activeTurn = enemyId;
        battle.turn++;
        battle.lastMoveTime = Date.now();

        // End of Turn Processing (Cooldowns, DoTs, Chakra) for NEW Active Player
        this.startNewTurn(battle, enemyId, actorId);

        // Check Win Condition
        this.checkWinCondition(battle);

        BattleModel.saveBattles({ [battleId]: battle });

        // Recursive Process for AI
        // If the new active turn is AI, we need to trigger processTurn again
        const nextActive = battle.activeTurn;
        const nextPlayer = battle.players[nextActive];

        console.log(`[Battle] End of turn ${battle.turn - 1}. Next Active: ${nextActive}. Status: ${battle.status}`);
        if (nextPlayer) {
            console.log(`[Battle] Next Player isAI: ${nextPlayer.isAi}`);
        } else {
            console.log(`[Battle] Next Player NOT FOUND for ID ${nextActive}`);
        }

        if (battle.status !== 'finished' && nextPlayer && nextPlayer.isAi) {
            console.log(`[Battle] Next turn is AI (${nextActive}). Triggering AI turn.`);
            // Use setImmediate to release stack? No, direct call is fine for now, we want synchronous feel for user.
            this.processTurn(battleId);
        }
    }

    static dispatchAction(battle, actor, enemy, action) {
        if (!action || !action.targetId) return;

        // Validate Cooldown
        if (actor.cooldowns &&
            actor.cooldowns[action.charIndex] &&
            actor.cooldowns[action.charIndex][action.skillIndex] > 0) {
            console.log(`[Battle] Skill on cooldown, skipping.`);
            return;
        }

        const charId = actor.team[action.charIndex];
        const charData = CharacterModel.findById(charId);
        const skill = charData ? charData.skills[action.skillIndex] : null;

        // AoE / Target Transformation Check
        let targetsToHit = this.determineTargets(actor, enemy, action, skill);

        targetsToHit.forEach((tid, idx) => {
            const isAoE = targetsToHit.length > 1;
            const aoeAction = {
                ...action,
                targetId: tid,
                isAoE: isAoE,
                isFirst: (idx === 0)
            };

            // Existence check
            const targetTeamId = tid.charAt(0) === "0" ? actor.id : enemy.id;
            const targetPlayer = targetTeamId === actor.id ? actor : enemy;
            const targetSlot = parseInt(tid.charAt(1));

            if (targetPlayer.team[targetSlot] && targetPlayer.team[targetSlot] !== "0") {
                this.applyAction(battle, actor, enemy, aoeAction);
            }
        });
    }

    static determineTargets(actor, enemy, action, skill) {
        let primaryTarget = action.targetId;
        if (Array.isArray(primaryTarget)) primaryTarget = primaryTarget[0];

        let targetsToHit = [primaryTarget];

        // Transform Effect (AoE)
        if (skill && actor.activeEffects && actor.activeEffects[action.charIndex]) {
            const transformEffect = actor.activeEffects[action.charIndex].find(e =>
                e.type === "target_transform" && (!e.skill_id || e.skill_id === skill.id)
            );
            if (transformEffect) {
                const teamPrefix = primaryTarget.charAt(0);
                targetsToHit = ["0", "1", "2"].map(s => teamPrefix + s);
                return targetsToHit;
            }
        }

        // Native AoE
        if (skill && (skill.target === "all_enemies" || (skill.effects && skill.effects.some(e => e.type === "aoe_damage")))) {
            const teamPrefix = primaryTarget.charAt(0);
            targetsToHit = ["0", "1", "2"].map(s => teamPrefix + s);
        }

        return targetsToHit;
    }

    static applyAction(battle, actor, enemy, action) {
        // ... (Logic from index.js applyAction, refactored to use EffectSystem)
        const charId = actor.team[action.charIndex];
        const charData = CharacterModel.findById(charId);
        if (!charData || !charData.skills[action.skillIndex]) return;
        const skill = charData.skills[action.skillIndex];

        // Stun Check
        if (EffectSystem.hasEffectType(actor.activeEffects[action.charIndex], "stun")) {
            console.log(`[Battle] STUNNED actor ${action.charIndex} tried to move.`);
            return;
        }

        // Target Req Check
        if (skill.target_req_effect && action.targetId) {
            const resolved = resolveTargetId(action.targetId);
            const targetObj = resolved.target === "enemy" ? enemy : actor;

            // Check Mark
            const hasMark = EffectSystem.hasMark(targetObj.activeEffects[resolved.index], skill.target_req_effect, actor.id);
            if (!hasMark) {
                console.log(`[Battle] Target Req Failed.`);
                return;
            }
        }

        // Unique Skill Check: prevent applying to a target that already has this skill's effect from THIS player
        if (skill.unique && action.targetId) {
            const resolved = resolveTargetId(action.targetId);
            const targetObj = resolved.target === "enemy" ? enemy : actor;
            if (targetObj.activeEffects[resolved.index] &&
                targetObj.activeEffects[resolved.index].some(e => e.imageId == skill.id && e.casterId == actor.id)) {
                console.log(`[Battle] Unique skill ${skill.name} already active on target ${action.targetId}. Skipping.`);
                return;
            }
        }

        console.log(`[Battle] Player ${actor.id} used ${skill.name} on ${action.targetId}`);

        if (skill.cooldown && actor.cooldowns && (!action.isAoE || action.isFirst)) {
            actor.cooldowns[action.charIndex][action.skillIndex] = skill.cooldown + 1;
        }

        if (skill.effects) {
            skill.effects.forEach(effect => {
                this.processEffect(battle, actor, enemy, action, skill, effect);
            });
        }
    }

    static processEffect(battle, actor, enemy, action, skill, effect) {
        // Resolve Targets logic (Complex "all", "ally", "enemy" logic)
        // ...
        // Simplified for brevity, need to port full logic.
        let targetOpts = [];

        // 1. Resolve Target List
        if (effect.target === "enemy" || effect.target === "all_enemies") {
            if (action.targetId && effect.target !== "all_enemies") {
                // Specific target
                const resolved = resolveTargetId(action.targetId);
                if (resolved && resolved.target === "enemy") {
                    // Check invuln
                    if (EffectSystem.hasEffectType(enemy.activeEffects[resolved.index], "invulnerable") && !EffectSystem.hasEffectType(enemy.activeEffects[resolved.index], "disable_invulnerable")) {
                        // Blocked
                    } else {
                        targetOpts.push({ team: "enemy", index: resolved.index });
                    }
                } else {
                    // Fallback first valid enemy
                    const idx = this.findFirstValidEnemy(enemy);
                    if (idx !== -1) targetOpts.push({ team: "enemy", index: idx });
                }
            } else {
                // All Enemies
                enemy.health.forEach((h, idx) => {
                    if (h > 0 && !(EffectSystem.hasEffectType(enemy.activeEffects[idx], "invulnerable") && !EffectSystem.hasEffectType(enemy.activeEffects[idx], "disable_invulnerable"))) {
                        targetOpts.push({ team: "enemy", index: idx });
                    }
                });
            }
        } else if (effect.target === "self") {
            targetOpts.push({ team: "ally", index: action.charIndex });
        } else if (effect.target === "ally") {
            if (action.targetId) {
                const resolved = resolveTargetId(action.targetId);
                if (resolved && resolved.target === "ally") {
                    targetOpts.push({ team: "ally", index: resolved.index });
                } else {
                    targetOpts.push({ team: "ally", index: action.charIndex });
                }
            } else {
                targetOpts.push({ team: "ally", index: action.charIndex });
            }
        } else if (effect.target === "all_allies") {
            actor.health.forEach((h, idx) => {
                if (h > 0) targetOpts.push({ team: "ally", index: idx });
            });
        } else if (effect.target === "all") {
            enemy.health.forEach((h, idx) => {
                if (h > 0 && !(EffectSystem.hasEffectType(enemy.activeEffects[idx], "invulnerable") && !EffectSystem.hasEffectType(enemy.activeEffects[idx], "disable_invulnerable"))) {
                    targetOpts.push({ team: "enemy", index: idx });
                }
            });
            actor.health.forEach((h, idx) => {
                if (h > 0) targetOpts.push({ team: "ally", index: idx });
            });
        } else if (effect.target === "all_marked") {
            // ...
            if (skill.target_req_effect) {
                enemy.health.forEach((h, idx) => {
                    if (h > 0 && EffectSystem.hasMark(enemy.activeEffects[idx], skill.target_req_effect, actor.id) && !(EffectSystem.hasEffectType(enemy.activeEffects[idx], "invulnerable") && !EffectSystem.hasEffectType(enemy.activeEffects[idx], "disable_invulnerable"))) {
                        targetOpts.push({ team: "enemy", index: idx });
                    }
                });
            }
        } else if (effect.target === "random_enemy") {
            const alive = [];
            enemy.health.forEach((h, idx) => {
                if (h > 0) alive.push(idx);
            });
            if (alive.length > 0) {
                const pick = alive[Math.floor(Math.random() * alive.length)];
                targetOpts.push({ team: "enemy", index: pick });
            }
        }

        // 2. Apply Effects
        targetOpts.forEach(tOpt => {
            const targetPlayer = tOpt.team === "enemy" ? enemy : actor;
            const tIdx = tOpt.index;
            const targetEffects = targetPlayer.activeEffects[tIdx];

            // Dedup for AoE
            if (action.isAoE && !action.isFirst) {
                if (["self", "ally", "all", "all_enemies", "all_allies", "all_marked"].includes(effect.target)) return;
            }

            if (effect.type === "damage" || effect.type === "aoe_damage" || effect.type === "affliction_damage") {
                let dmg = effect.amount;

                // Actor Boosts
                const boost = EffectSystem.getDamageBoost(actor.activeEffects[action.charIndex], skill.id);
                if (boost > 0) dmg = dmg * (1 + (boost / 100));

                // Target Reductions
                if (effect.duration === 0 || !effect.duration) {
                    dmg = EffectSystem.applyDamageReduction(dmg, targetEffects, effect.type === "affliction_damage");
                }

                if (effect.duration > 0) {
                    // DoT
                    // Need to update the stored effect later?
                    // We add it first, but we need to know the calculated base damage?
                    // Legacy logic: Added effect to array, THEN updated amount.
                    // Let's use EffectSystem.applyEffect but with amount modified? 
                    // Or separate "AddEffect" logic.
                } else {
                    // Instant
                    targetPlayer.health[tIdx] = Math.max(0, targetPlayer.health[tIdx] - dmg);
                    console.log(` -> Dealt ${dmg}`);
                }
            } else if (effect.type === "health_set") {
                if (targetPlayer.health[tIdx] > effect.amount) {
                    targetPlayer.health[tIdx] = effect.amount;
                }
            } else if (effect.type === "health_reduce_percent") {
                const reduction = Math.floor(targetPlayer.health[tIdx] * (effect.amount / 100));
                targetPlayer.health[tIdx] = Math.max(0, targetPlayer.health[tIdx] - reduction);
            } else if (effect.type === "heal") {
                targetPlayer.health[tIdx] = Math.min(targetPlayer.maxHealth[tIdx], targetPlayer.health[tIdx] + effect.amount);
            } else if (effect.type === "remove_chakra") {
                if ((!effect.duration || effect.duration === 0) && (!action.isAoE || action.isFirst)) {
                    // Remove immediately
                    let amount = effect.amount;
                    // Logic to remove...
                }
                // If DoT, handled in ApplyEffect
            } else if (effect.type === "drain_chakra") {
                // Drain chakra from target and give to actor
                if (effect.amount && (!action.isAoE || action.isFirst)) {
                    let remaining = effect.amount;
                    const types = ['tai', 'blo', 'nin', 'gen'];
                    while (remaining > 0) {
                        const available = types.filter(t => targetPlayer.chakra[t] > 0);
                        if (available.length === 0) break;
                        const pick = available[Math.floor(Math.random() * available.length)];
                        targetPlayer.chakra[pick]--;
                        targetPlayer.chakra.rnd--;
                        // Give drained chakra to actor
                        actor.chakra[pick]++;
                        actor.chakra.rnd++;
                        remaining--;
                    }
                    console.log(` -> Drained ${effect.amount - remaining} chakra from target, gave to actor`);
                }
            }

            // Add persistent effect
            if (effect.duration > 0 || effect.type === "mark") {
                let finalDuration = effect.duration || 0;
                if (effect.type === "mark" && finalDuration === 0) finalDuration = 9999;

                if (effect.type === "mark" && finalDuration === 0) finalDuration = 9999;

                // FIX: Removed +1 duration hack. Duration should be handled by startNewTurn logic based on caster.
                // if (tOpt.team === "enemy" && effect.type !== "damage") finalDuration += 1;

                // DoT Snapshot Damage?
                // If damage type, we likely calculated boost already.
                // We should store the boosted amount in the effect object passed to ApplyEffect.

                let effectToStore = { ...effect };
                if (effect.type === "damage" || effect.type === "aoe_damage" || effect.type === "affliction_damage") {
                    // Store calculated boosted amount (before reduction, as reduction is creating dynamic tick dmg?)
                    // Actually legacy calculates reduction on tick too.
                    // But Boost is on Caster, which might change? No, usually snapshot on cast.
                    // Legacy Logic: "dmg" (calculated) -> storedEffect.amount = dmg.
                    // Yes, snapshot the BOOSTED damage.
                    // re-calculate dmg with boost
                    let snapshotDmg = effect.amount;
                    const boost = EffectSystem.getDamageBoost(actor.activeEffects[action.charIndex], skill.id);
                    if (boost > 0) snapshotDmg = snapshotDmg * (1 + (boost / 100));
                    effectToStore.amount = Math.floor(snapshotDmg);
                }

                EffectSystem.applyEffect(targetEffects, effectToStore, actor.id, skill.id, skill.name, skill.description);

                // Override processed duration if needed (already handled in applyEffect logic roughly)
            }
        });
    }

    static findFirstValidEnemy(enemy) {
        return enemy.health.findIndex((h, idx) => {
            if (h <= 0) return false;
            return !(EffectSystem.hasEffectType(enemy.activeEffects[idx], "invulnerable") && !EffectSystem.hasEffectType(enemy.activeEffects[idx], "disable_invulnerable"));
        });
    }

    static startNewTurn(battle, activeId, prevId) {
        const nextPlayer = battle.players[activeId];

        // Decrement Cooldowns
        if (nextPlayer.cooldowns) {
            for (let c = 0; c < 3; c++) {
                for (let s = 0; s < 4; s++) {
                    if (nextPlayer.cooldowns[c][s] > 0) nextPlayer.cooldowns[c][s]--;
                }
            }
        }

        // Snapshot invulnerability state before duration decrement removes self-cast effects
        const invulSnapshot = nextPlayer.activeEffects
            ? nextPlayer.activeEffects.map(charEffects => EffectSystem.hasEffectType(charEffects, "invulnerable") && !EffectSystem.hasEffectType(charEffects, "disable_invulnerable"))
            : [false, false, false];

        // Process Active Effects (DoTs) on the Active Player
        if (nextPlayer.activeEffects) {
            nextPlayer.activeEffects.forEach((charEffects, cIdx) => {
                const isInvul = invulSnapshot[cIdx];

                for (let i = charEffects.length - 1; i >= 0; i--) {
                    const e = charEffects[i];

                    // DoT
                    if (e.type === "damage" || e.type === "affliction_damage") {
                        const isAffliction = e.type === "affliction_damage";
                        if (!isInvul || isAffliction) {
                            let tickDmg = EffectSystem.applyDamageReduction(e.amount, charEffects, isAffliction);
                            nextPlayer.health[cIdx] = Math.max(0, nextPlayer.health[cIdx] - tickDmg);
                            console.log(`[Battle] DoT Tick: ${tickDmg}`);
                        }
                    }
                    // Other DoTs (chakra)

                }
            });
        }

        // Process Duration Decrement (On Caster's Turn)
        Object.values(battle.players).forEach(p => {
            if (p.activeEffects) {
                p.activeEffects.forEach((charEffects) => {
                    for (let i = charEffects.length - 1; i >= 0; i--) {
                        const e = charEffects[i];
                        // Decrement if it's the Caster's turn
                        if (e.casterId === activeId) {
                            e.currentDuration--;
                            if (e.currentDuration <= 0) {
                                charEffects.splice(i, 1);
                            }
                        }
                    }
                });
            }
        });

        // Chakra Gain
        let chakraGain = 0;
        if (battle.turn === 2) {
            chakraGain = 3;
        } else {
            chakraGain = nextPlayer.health.filter(h => h > 0).length;
        }

        if (chakraGain > 0) {
            const gained = ChakraSystem.generateRandomChakra(chakraGain);
            ChakraSystem.addChakra(nextPlayer.chakra, gained);
        }

        // Process Chakra Removal Effects (after chakra gain)
        if (nextPlayer.activeEffects) {
            nextPlayer.activeEffects.forEach((charEffects, cIdx) => {
                const isInvul = invulSnapshot[cIdx];

                for (let i = charEffects.length - 1; i >= 0; i--) {
                    const e = charEffects[i];
                    if (e.type === "remove_chakra" && e.amount && !isInvul) {
                        let remaining = e.amount;
                        const types = ['tai', 'blo', 'nin', 'gen'];
                        // Remove from random types until amount is depleted
                        while (remaining > 0 && nextPlayer.chakra.rnd > 0) {
                            const available = types.filter(t => nextPlayer.chakra[t] > 0);
                            if (available.length === 0) break;
                            const pick = available[Math.floor(Math.random() * available.length)];
                            nextPlayer.chakra[pick]--;
                            nextPlayer.chakra.rnd--;
                            remaining--;
                        }
                        console.log(`[Battle] Removed ${e.amount - remaining} chakra from player ${activeId}`);
                    }
                }
            });
        }
    }

    static checkWinCondition(battle) {
        const p1Id = Object.keys(battle.players)[0];
        const p2Id = Object.keys(battle.players)[1];

        const p1Dead = battle.players[p1Id].health.every(h => h <= 0);
        const p2Dead = battle.players[p2Id].health.every(h => h <= 0);

        if (p1Dead || p2Dead) {
            const winnerId = p2Dead ? p1Id : p2Id;
            const loserId = winnerId === p1Id ? p2Id : p1Id;

            battle.winner = winnerId;
            battle.status = "finished";

            const winnerIsAi = battle.players[winnerId].isAi;
            const loserIsAi = battle.players[loserId].isAi;

            const users = UserModel.getUsers();

            if (!winnerIsAi && !loserIsAi) {
                // PvP Match
                const winner = users.find(u => String(u.id) === String(winnerId));
                const loser = users.find(u => String(u.id) === String(loserId));

                if (winner) {
                    winner.wins = (winner.wins || 0) + 1;
                    const prevStreak = winner.streak || 0;
                    winner.streak = prevStreak >= 0 ? prevStreak + 1 : 1;
                }
                if (loser) {
                    loser.losses = (loser.losses || 0) + 1;
                    const prevStreak = loser.streak || 0;
                    loser.streak = prevStreak <= 0 ? prevStreak - 1 : -1;
                }
                UserModel.saveUsers(users);

                if (winner && loser) {
                    LadderService.processMatchResult(winnerId, loserId);
                    console.log(`[Ladder] Match result processed: ${winner.username} beat ${loser.username}`);
                }

            } else if (!winnerIsAi && loserIsAi) {
                // Player beat AI
                console.log(`[Battle] Player beat AI. Calculating ladder update.`);
                const winner = users.find(u => String(u.id) === String(winnerId));
                const aiLoser = battle.players[loserId];

                if (winner) {
                    // 1. Update Stats
                    winner.wins = (winner.wins || 0) + 1;
                    const prevStreak = winner.streak || 0;
                    winner.streak = prevStreak >= 0 ? prevStreak + 1 : 1;

                    // 2. Ladder Calculation
                    let totalRanked = LadderService.getTotalRanked();
                    const winnerWasUnranked = winner.ladderPosition === null || winner.ladderPosition === undefined;

                    if (winnerWasUnranked) {
                        totalRanked++;
                        winner.ladderPosition = totalRanked;
                    }

                    const loserNinjaRank = aiLoser.rank || 'Academy Student';
                    const oldPosition = winner.ladderPosition;

                    const newPosition = LadderService.calculateNewPosition(oldPosition, loserNinjaRank, totalRanked);

                    if (newPosition < oldPosition) {
                        // Shift others
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

                    // Update Rank Name
                    winner.rank = LadderService.getNinjaRank(winner.ladderPosition, totalRanked);

                    // Update all ranks
                    LadderService.updateAllNinjaRanks(users, totalRanked);

                    UserModel.saveUsers(users);
                    console.log(`[Ladder] AI Match result: ${winner.username} beat AI (${loserNinjaRank}). Pos: ${oldPosition} -> ${newPosition}`);
                }

            } else if (winnerIsAi && !loserIsAi) {
                // AI beat Player
                console.log(`[Battle] AI won against Player. Stats updated (Player Loss).`);
                const loser = users.find(u => String(u.id) === String(loserId));

                if (loser) {
                    loser.losses = (loser.losses || 0) + 1;
                    const prevStreak = loser.streak || 0;
                    loser.streak = prevStreak <= 0 ? prevStreak - 1 : -1;
                    UserModel.saveUsers(users);
                }
            }
        }
    }

    static parseMove(query, playerTeam) {
        // ... (parseMove logic from index.js)
        // Helper to convert query to action object
        // ...
        // Simplified: return object or null.
        if (!query) return null;
        // ...
        // (Copy implementation)
        const moves = [];
        if (query.target) {
            for (const charIdx in query.target) {
                for (const skillIdx in query.target[charIdx]) {
                    const targets = query.target[charIdx][skillIdx];
                    const targetId = Array.isArray(targets) ? targets[0] : targets;
                    const charId = playerTeam[charIdx];
                    moves.push({
                        charIndex: parseInt(charIdx),
                        skillIndex: parseInt(skillIdx),
                        charId: charId,
                        targetId: targetId
                    });
                }
            }
        }
        const regex = /target\[(\d+)\]\[(\d+)\]\[\]/;
        for (const key in query) {
            const match = key.match(regex);
            if (match) {
                const charIdx = parseInt(match[1]);
                const skillIdx = parseInt(match[2]);
                const targetId = query[key];
                const charId = playerTeam[charIdx];
                moves.push({
                    charIndex: charIdx,
                    skillIndex: skillIdx,
                    charId: charId,
                    targetId: targetId
                });
            }
        }
        return moves.length > 0 ? moves : null;
    }
}

module.exports = BattleEngine;
