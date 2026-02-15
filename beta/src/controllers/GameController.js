const BattleModel = require('../models/BattleModel');
const UserModel = require('../models/UserModel');
const CharacterModel = require('../models/CharacterModel');
const BattleEngine = require('../engine/BattleEngine');
const MatchmakingService = require('../services/MatchmakingService');
const LadderService = require('../services/LadderService');

const TURN_TIMEOUT = 120000; // 2 minutes

class GameController {
    static handleEngineRequest(req, res) {
        const type = req.query.type;
        console.log(`[Engine] Request type: ${type}`);

        if (type === 'search') {
            this.handleSearch(req, res);
        } else if (type === 'ladder') {
            this.handleLadder(req, res);
        } else if (type === 'waiting') {
            this.handleWaiting(req, res);
        } else if (type === 'calculate') {
            this.handleCalculate(req, res);
        } else if (type === 'prepare') {
            this.handlePrepare(req, res);
        } else if (type === 'selection') {
            this.handleSelection(req, res);
        } else {
            res.send('error');
        }
    }

    static handleSelection(req, res) {
        if (!req.session.userId) {
            res.set('Content-Type', 'text/plain');
            return res.send('UserId=0');
        }

        const user = UserModel.findById(req.session.userId);

        if (!user) {
            res.set('Content-Type', 'text/plain');
            return res.send('UserId=0');
        }

        // Safety: Ensure not in battle state when entering selection
        if (user.startmatch) {
            UserModel.update(user.id, { startmatch: false });
        }

        let response = `UserId=${user.id}`;
        response += `&username=${user.username}`;
        response += `&wins=${user.wins}`;
        response += `&losses=${user.losses}`;
        response += `&rank=${user.rank}`;

        const playerText = `<font size="14"><b>${user.username.toUpperCase()}</b></font>\n` +
            `${user.rank.toUpperCase()}\n` +
            `LADDER RANK: ${user.ladderPosition || 0}\n` +
            `WINS: ${user.wins}\n` +
            `LOSSES: ${user.losses}`;

        response += `&PlayerText=${playerText}`;
        // Get user's avatar path - use stored avatar or default
        const avatarPath = (user.avatar || 'images/avatars/default.jpg').replace(/^\//, '');
        response += `&avatarlink=${avatarPath}`;

        if (user.lastTeam && user.lastTeam.length === 3) {
            response += `&CharactersSelected=${user.lastTeam.join("|||")}`;
        }

        // Character Data
        const chars = CharacterModel.findAll();

        // CharacterArray: "y1|||y2|||..."
        const charArrayStr = chars.map(c => (c.locked ? "n" : "y") + c.id).join("|||");
        response += `&CharacterArray=${charArrayStr}`;

        // CharSpecs
        const charSpecsStr = this.buildCharSpecs(chars);
        response += `&CharSpecs=${charSpecsStr}`;

        res.set('Content-Type', 'text/plain');
        res.send(response);
    }

    static handleSearch(req, res) {
        if (!req.session.userId) {
            return res.send('startmatch=0');
        }
        const user = UserModel.findById(req.session.userId);

        if (user && user.startmatch) {
            const battle = BattleModel.findById(user.battleId);
            if (!battle || battle.status === 'finished' || battle.winner) {
                UserModel.update(user.id, {
                    startmatch: false,
                    battleId: null,
                    opponentId: null
                });
                res.set('Content-Type', 'text/plain');
                res.send('startmatch=0');
            } else {
                res.set('Content-Type', 'text/plain');
                res.send('startmatch=1');
            }
        } else {
            res.set('Content-Type', 'text/plain');
            res.send('startmatch=0');
        }
    }

    static handleLadder(req, res) {
        if (!req.session.userId) return res.send('error');

        const { char1, char2, char3 } = req.query;

        // Strip 'chary' prefix from character IDs (convert 'chary6' to '6')
        const cleanChar1 = char1.replace(/^chary/i, '');
        const cleanChar2 = char2.replace(/^chary/i, '');
        const cleanChar3 = char3.replace(/^chary/i, '');

        // Reset previous match state
        const user = UserModel.findById(req.session.userId);
        if (user) {
            UserModel.update(user.id, {
                startmatch: false,
                lastTeam: [cleanChar1, cleanChar2, cleanChar3]
            });
        }

        const team = [cleanChar1, cleanChar2, cleanChar3];
        MatchmakingService.addToQueue(req.session.userId, team);

        res.set('Content-Type', 'text/plain');
        res.send('success');
    }

    static handleWaiting(req, res) {
        let status = "continue";
        if (req.session.userId) {
            const user = UserModel.findById(req.session.userId);
            if (user && user.battleId) {
                const battle = BattleModel.findById(user.battleId);
                if (battle) {
                    // Update current user's lastActive - REMOVED for strict turn timer
                    // if (battle.players[user.id]) {
                    //    battle.players[user.id].lastActive = Date.now();
                    //    BattleModel.update(user.battleId, battle);
                    // }

                    if (battle.winner) {
                        status = (battle.winner == user.id) ? "winner" : "loser";
                    } else {
                        // Check for Strict Turn Timeout
                        // Timeout logic: If it's NOT my turn (I am waiting) AND the active player (opponent) has exceeded time limit since last move
                        if (battle.activeTurn != user.id) {
                            const lastMoveTime = battle.lastMoveTime || Date.now();
                            if (Date.now() - lastMoveTime > TURN_TIMEOUT) {
                                // Active Player Timed Out - Waiting Player (User) Wins
                                console.log(`[Game] Active Player ${battle.activeTurn} timed out. Winner: ${user.id}`);

                                battle.winner = user.id;
                                battle.status = "finished";
                                BattleModel.update(user.battleId, battle);

                                // Update User Stats
                                const users = UserModel.getUsers();
                                const winner = users.find(u => String(u.id) === String(user.id));
                                const loser = users.find(u => String(u.id) === String(battle.activeTurn));

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

                                // Process Ladder
                                if (winner && loser) {
                                    LadderService.processMatchResult(user.id, battle.activeTurn);
                                }

                                status = "winner";
                            }
                        }

                        if (status !== "winner") {
                            if (battle.activeTurn == user.id) {
                                status = battle.players[user.id].ready ? "waiting" : "continue";
                            } else {
                                status = "waiting";
                            }
                        }
                    }
                }
            }
        }
        res.set('Content-Type', 'text/plain');
        res.send(`battlestatus=${status}`);
    }

    static handleCalculate(req, res) {
        console.log(`[Engine] Calculate request from ${req.session.userId}`, req.query);
        const user = UserModel.findById(req.session.userId);

        if (user && user.battleId) {
            const battle = BattleModel.findById(user.battleId);
            if (battle && battle.players[user.id]) {
                const playerState = battle.players[user.id];

                // Update Request Timestamp
                // Update Request Timestamp
                // playerState.lastActive = Date.now();

                // Update Residual Chakra
                if (req.query.tai !== undefined) {
                    playerState.chakra = {
                        tai: parseInt(req.query.tai || 0),
                        blo: parseInt(req.query.blo || 0),
                        nin: parseInt(req.query.nin || 0),
                        gen: parseInt(req.query.gen || 0),
                        rnd: 0
                    };
                    const p = playerState.chakra;
                    p.rnd = p.tai + p.blo + p.nin + p.gen;
                }

                playerState.ready = true;

                // Parse Move
                const move = BattleEngine.parseMove(req.query, playerState.team);
                if (move) {
                    playerState.action = move;
                } else {
                    console.log("[Engine] Failed to parse move, using mock.");
                    playerState.action = { skill: "mock" };
                }

                BattleModel.saveBattles({ [user.battleId]: battle });

                // Try Process Turn
                if (battle.activeTurn == user.id) {
                    BattleEngine.processTurn(user.battleId);
                }
            }
        }
        res.set('Content-Type', 'text/plain');
        res.send(`status=1`);
    }

    static handlePrepare(req, res) {
        if (!req.session.userId) {
            res.set('Content-Type', 'text/plain');
            return res.send('error=1');
        }

        const user = UserModel.findById(req.session.userId);
        if (!user || !user.battleId) {
            res.set('Content-Type', 'text/plain');
            return res.send('error=1');
        }

        const battle = BattleModel.findById(user.battleId);

        if (!battle) {
            console.error(`[GameController] Battle ${user.battleId} not found for User ${user.id}`);
            res.set('Content-Type', 'text/plain');
            return res.send('error=1');
        }

        const userState = battle.players[user.id];
        if (!userState) {
            console.error(`[GameController] User ${user.id} not found in Battle ${user.battleId}`);
            console.error(`[GameController] Players: ${Object.keys(battle.players).join(', ')}`);
            res.set('Content-Type', 'text/plain');
            return res.send('error=1');
        }

        // Opponent Logic (Supports AI)
        let opponent = UserModel.findById(user.opponentId);
        let opponentState = null;

        if (opponent) {
            opponentState = battle.players[opponent.id];
        } else {
            // AI Opponent or Missing User - Find the other player
            const otherPlayerId = Object.keys(battle.players).find(pid => String(pid) !== String(user.id));
            if (otherPlayerId) {
                opponentState = battle.players[otherPlayerId];
                // Mock an opponent object for display text
                opponent = {
                    id: otherPlayerId,
                    username: opponentState.username || "CPU",
                    rank: opponentState.rank || "Genin",
                    wins: opponentState.wins || 0,
                    losses: opponentState.losses || 0,
                    ladderPosition: opponentState.ladderPosition || 0,
                    avatar: 'images/avatars/default.jpg'
                };
            }
        }

        // Helper to format Player Data
        const buildPlayerData = (u, state) => {
            const tai = state ? state.chakra.tai : 10;
            const blo = state ? state.chakra.blo : 10;
            const nin = state ? state.chakra.nin : 10;
            const gen = state ? state.chakra.gen : 10;
            const total = tai + blo + nin + gen;
            return `${u.username}///${u.rank}///1///${total}///${tai}///${blo}///${nin}///${gen}`;
        };

        // Helper to format Char Data
        const buildCharString = (team, state) => {
            return team.map((charId, idx) => {
                const c = CharacterModel.findById(charId);
                const hp = state ? state.health[idx] : 100;

                if (!c) {
                    console.log(`[GameController] Failed to find character for ID: ${charId}`);
                    return `0[[[Unknown[[[Description[[[${hp}[[[Genin`;
                }

                return `${c.id}[[[${c.name.toUpperCase()}[[[${c.description.toUpperCase()}[[[${hp}[[[Genin`;
            }).join("///");
        };

        const targetsString = this.buildTargetsString(userState.team, userState, opponentState, user.id);

        const getPlayerText = (u) => {
            return `<font size="14"><b>${u.username.toUpperCase()}</b></font>\n` +
                `${u.rank.toUpperCase()}\n` +
                `LADDER RANK: ${u.ladderPosition || 0}\n` +
                `WINS: ${u.wins}\n` +
                `LOSSES: ${u.losses}`;
        };

        const p1Text = getPlayerText(user);
        const p2Text = getPlayerText(opponent ? opponent : { username: "CPU", rank: "Genin", wins: 0, losses: 0 });

        const response =
            `players=${buildPlayerData(user, userState)}|||${buildPlayerData(opponent ? opponent : { username: "CPU", rank: "Genin" }, opponentState)}` +
            `&PlayerText=${p1Text}|||${p2Text}` +
            `&characters=${buildCharString(userState.team, userState)}|||${buildCharString(opponentState ? opponentState.team : userState.team, opponentState)}` +
            `&skills=${this.buildSkillsString(userState.team, userState.cooldowns, userState.activeEffects, user.id, opponentState ? opponentState.activeEffects : null)}|||${this.buildSkillsString(opponentState.team, opponentState.cooldowns, opponentState.activeEffects, opponent ? opponent.id : "cpu", userState ? userState.activeEffects : null)}` +
            `&targets=${targetsString}|||${this.buildTargetsString(opponentState.team, opponentState, userState, opponent ? opponent.id : 'cpu')}` +
            `&effects=${this.buildEffectsString(userState ? userState.activeEffects : null)}|||${this.buildEffectsString(opponentState ? opponentState.activeEffects : null)}` +
            `&initial_chakra=10///10///10///10///0` +
            `&players0avatar=${(user.avatar || 'images/avatars/default.jpg').replace(/^\//, '')}` +
            `&players1avatar=${(opponent && opponent.avatar ? opponent.avatar.replace(/^\//, '') : 'images/avatars/default.jpg')}` +
            `&victory=0`;

        res.set('Content-Type', 'text/plain');
        res.send(response);
    }

    static parseChakraCost(chakraStr) {
        const cost = { tai: 0, blo: 0, nin: 0, gen: 0, rnd: 0 };
        if (!chakraStr) return cost;
        for (const char of chakraStr) {
            if (char === '1') cost.tai++;
            else if (char === '2') cost.blo++;
            else if (char === '3') cost.nin++;
            else if (char === '4') cost.gen++;
            else if (char === '0') cost.rnd++;
        }
        return cost;
    }

    static buildSkillsString(team, cooldowns, activeEffects, userId, opponentActiveEffects) {
        return team.map((charId, cIdx) => {
            const c = CharacterModel.findById(charId);
            if (!c || !c.skills) return new Array(4).fill("0[[[Empty[[[Desc[[[0[[[0[[[0[[[0[[[0[[[0000[[[0[[[no[[[0").join("///");

            let skillsData = [];
            for (let i = 0; i < 4; i++) {
                if (i < c.skills.length) {
                    const s = c.skills[i];
                    const name = (s.name || "Unknown").toUpperCase();
                    const desc = (s.description || "No description").toUpperCase();
                    let chakra = s.chakra || "0";

                    // Parse Costs
                    const costs = this.parseChakraCost(chakra);

                    // Cooldown Logic
                    let cdState = "go"; // Default to "go" (0)
                    if (cooldowns && cooldowns[cIdx] && cooldowns[cIdx][i] > 0) {
                        cdState = cooldowns[cIdx][i].toString();
                    }

                    // Stun Logic
                    let isStunned = false;
                    if (activeEffects && activeEffects[cIdx]) {
                        isStunned = activeEffects[cIdx].some(e => e.type === "stun");
                    }

                    // Availability
                    let isAvailable = "go"; // Default "go" (yes)

                    // Max Active Stacks
                    if (s.max_active_stacks && s.max_active_stacks > 0) {
                        const persistentEffectsCount = s.effects ? s.effects.filter(e => {
                            if (e.type === "damage_reduction") return true;
                            if (e.type === "invulnerable") return true;
                            if (e.type === "mark") return true;
                            if (e.duration && e.duration > 0) return true;
                            return false;
                        }).length : 0;

                        if (persistentEffectsCount > 0) {
                            let totalActiveEffects = 0;
                            const countEffects = (effectsArray) => {
                                if (effectsArray) {
                                    effectsArray.forEach(charEffects => {
                                        if (charEffects) {
                                            charEffects.forEach(e => {
                                                if (e.imageId == s.id && e.casterId == userId) {
                                                    totalActiveEffects++;
                                                }
                                            });
                                        }
                                    });
                                }
                            };
                            countEffects(activeEffects);

                            // Note: We only check `activeEffects` of the current team/context. 
                            // The backup logic calls `countEffects(activeEffects)` only.
                            // Wait, backup calls it on BOTH? "countEffects(userState); countEffects(opponentState)" (Line 1433 in TargetString).
                            // But in `buildSkillsString` (Line 1682), it calls `countEffects(activeEffects)`.
                            // `activeEffects` passed to `buildSkillsString` is ONLY `userState.activeEffects` (or opponent's).
                            // So it only counts stacks on OWN team? 
                            // Or does it need opponent affects?
                            // Line 1682 in backup: `countEffects(activeEffects)`. 
                            // The `activeEffects` param passed in 1798 is `userState.activeEffects` (3-element array).
                            // So it counts instances of the effect on the USER's team.
                            // This might be correct for "Shadow Clones" (self buff).
                            // What about marks on enemies?
                            // If `max_active_stacks` limits marks on enemies, we need opponent stacks.
                            // But `buildSkillsString` does NOT receive opponent stacks in backup.
                            // So we stick to existing backup logic: checks provided `activeEffects`.

                            const currentStacks = Math.floor(totalActiveEffects / persistentEffectsCount);
                            if (currentStacks >= s.max_active_stacks) {
                                isAvailable = "no";
                            }
                        }
                    }

                    // Unique Skill: grey out if all enemy targets already have this skill's effect
                    if (s.unique && isAvailable === "go" && opponentActiveEffects) {
                        let allAffected = true;
                        for (let t = 0; t < 3; t++) {
                            if (!opponentActiveEffects[t] || !opponentActiveEffects[t].some(e => e.imageId == s.id && e.casterId == userId)) {
                                allAffected = false;
                                break;
                            }
                        }
                        if (allAffected) isAvailable = "no";
                    }

                    // Grey out enemy-targeting skills if all enemies are invulnerable
                    if (isAvailable === "go" && opponentActiveEffects && (s.target === "enemy" || s.target === "all_enemies" || s.target === "all_marked")) {
                        const allInvulnerable = opponentActiveEffects.every(charEffects =>
                            charEffects && charEffects.some(e => e.type === "invulnerable")
                        );
                        if (allInvulnerable) isAvailable = "no";
                    }

                    // Requirement Logic
                    if (isStunned) {
                        isAvailable = "no";
                    } else if (s.requires) {
                        const charEffects = activeEffects ? activeEffects[cIdx] : [];
                        const hasReq = charEffects && charEffects.some(e =>
                            e.imageId == s.requires &&
                            !['stun', 'mark', 'damage', 'aoe_damage', 'disable_damage_reduction'].includes(e.type)
                        );
                        if (!hasReq) isAvailable = "no";
                    }

                    // Target Type Logic
                    let targetType = "0"; // Default to Ally/Self
                    if (s.target === "enemy") targetType = "1";
                    else if (s.target === "all_enemies") targetType = "no";
                    else if (s.target === "all_marked") targetType = "no";
                    else if (s.target === "all") targetType = "no";
                    else if (s.target === "all_allies") targetType = "no";
                    else if (s.effects && s.effects.length > 0) {
                        if (s.effects[0].target === "enemy") targetType = "1";
                        else if (s.effects[0].target === "all_enemies") targetType = "no";
                        else if (s.effects[0].target === "all_marked") targetType = "no";
                        else if (s.effects[0].target === "all") targetType = "no";
                        else if (s.effects[0].target === "all_allies") targetType = "no";
                    }

                    // AoE/Restrict Overrides
                    if (activeEffects && activeEffects[cIdx]) {
                        const transformEffect = activeEffects[cIdx].find(e =>
                            e.type === "target_transform" && (!e.skill_id || e.skill_id === s.id)
                        );
                        if (transformEffect) targetType = "no";

                        const restrictEffect = activeEffects[cIdx].find(e =>
                            e.type === "target_restrict_marked" && (!e.skill_id || e.skill_id === s.id)
                        );
                        if (restrictEffect) targetType = "1"; // Treated as single enemy target visually
                    }

                    let clientTargetType = targetType;
                    // Client map
                    if (clientTargetType === "restrict_marked") clientTargetType = "1";
                    else if (clientTargetType === "all_marked") clientTargetType = "no";

                    // The order must match backup:
                    // ID, Name, Desc, Tai, Gen, Nin, Blo, Rnd(Length), ChakraStr, cdState, isAvailable, clientTargetType
                    skillsData.push(`${s.id}[[[${name}[[[${desc}[[[${costs.tai}[[[${costs.gen}[[[${costs.nin}[[[${costs.blo}[[[${chakra.length}[[[${chakra}[[[${cdState}[[[${isAvailable}[[[${clientTargetType}`);
                } else {
                    skillsData.push("0[[[Empty[[[Desc[[[0[[[0[[[0[[[0[[[0[[[0000[[[0[[[no[[[0");
                }
            }
            return skillsData.join("///");
        }).join("|||");
    }

    static buildTargetsString(team, userState, opponentState, userId) {
        return team.map((charId, charIndex) => {
            let charTargets = [];
            const c = CharacterModel.findById(charId);

            if (c && c.skills) {
                for (let s = 0; s < 4; s++) {
                    const skill = c.skills[s];
                    let targetsList = [];

                    if (!skill) {
                        targetsList = ["00", "01", "02"];
                    } else {
                        // Check Cooldown
                        let onCooldown = false;
                        if (userState && userState.cooldowns && userState.cooldowns[charIndex] && userState.cooldowns[charIndex][s] > 0) {
                            onCooldown = true;
                        }

                        if (onCooldown) {
                            targetsList = [];
                        } else {
                            // Check Max Active Stacks
                            if (skill.max_active_stacks && skill.max_active_stacks > 0) {
                                const persistentEffectsCount = skill.effects ? skill.effects.filter(e => {
                                    if (e.type === "damage_reduction") return true;
                                    if (e.type === "invulnerable") return true;
                                    if (e.type === "mark") return true;
                                    if (e.duration && e.duration > 0) return true;
                                    return false;
                                }).length : 0;

                                if (persistentEffectsCount > 0) {
                                    let totalActiveEffects = 0;
                                    const countEffects = (state) => {
                                        if (state && state.activeEffects) {
                                            state.activeEffects.forEach(charEffects => {
                                                charEffects.forEach(e => {
                                                    if (e.imageId == skill.id && e.casterId == userState.id) {
                                                        totalActiveEffects++;
                                                    }
                                                });
                                            });
                                        }
                                    };

                                    countEffects(userState);
                                    countEffects(opponentState);

                                    const currentStacks = Math.floor(totalActiveEffects / persistentEffectsCount);
                                    if (currentStacks >= skill.max_active_stacks) {
                                        targetsList = [];
                                        onCooldown = true;
                                    }
                                }
                            }

                            if (onCooldown) {
                                targetsList = [];
                            } else {
                                // Determine Target Type
                                let targetType = "ally";
                                if (skill.target === "enemy") targetType = "enemy";
                                else if (skill.target === "all_enemies") targetType = "all_enemies";
                                else if (skill.target === "all_marked") targetType = "all_marked";
                                else if (skill.target === "all") targetType = "all";
                                else if (skill.target === "all_allies") targetType = "all_allies";
                                else if (skill.target === "self") targetType = "self";
                                else if (skill.effects && skill.effects.length > 0) {
                                    if (skill.effects[0].target === "enemy") targetType = "enemy";
                                    else if (skill.effects[0].target === "all_enemies") targetType = "all_enemies";
                                    else if (skill.effects[0].target === "all_marked") targetType = "all_marked";
                                    else if (skill.effects[0].target === "all") targetType = "all";
                                    else if (skill.effects[0].target === "all_allies") targetType = "all_allies";
                                    else if (skill.effects[0].target === "self") targetType = "self";
                                }

                                // Check for Restrict Marked Effect
                                if (userState && userState.activeEffects && userState.activeEffects[charIndex]) {
                                    const restrictEffect = userState.activeEffects[charIndex].find(e =>
                                        e.type === "target_restrict_marked" && (!e.skill_id || e.skill_id === skill.id)
                                    );
                                    if (restrictEffect) {
                                        targetType = "restrict_marked";
                                    }
                                }

                                // Build List
                                if (targetType === "enemy") {
                                    targetsList = [];
                                    const potentialTargets = ["10", "11", "12"];
                                    potentialTargets.forEach((tid, idx) => {
                                        let isInvulnerable = false;
                                        if (opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                            isInvulnerable = opponentState.activeEffects[idx].some(e => e.type === "invulnerable");
                                        }

                                        let meetsReq = true;
                                        if (skill.target_req_effect) {
                                            meetsReq = false;
                                            if (opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                                meetsReq = opponentState.activeEffects[idx].some(e => (e.imageId == skill.target_req_effect || e.skill_id == skill.target_req_effect) && e.casterId == userId);
                                            }
                                        }

                                        // Unique skill check: skip targets that already have this skill's effect from THIS player
                                        let alreadyAffected = false;
                                        if (skill.unique && opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                            alreadyAffected = opponentState.activeEffects[idx].some(e => e.imageId == skill.id && e.casterId == userId);
                                        }

                                        if (!isInvulnerable && meetsReq && !alreadyAffected) {
                                            targetsList.push(tid);
                                        }
                                    });

                                } else if (targetType === "all_enemies") {
                                    targetsList = [];
                                    const potentialTargets = ["10", "11", "12"];
                                    potentialTargets.forEach((tid, idx) => {
                                        let isInvulnerable = false;
                                        if (opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                            isInvulnerable = opponentState.activeEffects[idx].some(e => e.type === "invulnerable");
                                        }
                                        if (!isInvulnerable) {
                                            targetsList.push(tid);
                                        }
                                    });

                                } else if (targetType === "all_marked" || targetType === "restrict_marked") {
                                    targetsList = [];
                                    const potentialTargets = ["10", "11", "12"];
                                    potentialTargets.forEach((tid, idx) => {
                                        let isInvulnerable = false;
                                        if (opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                            isInvulnerable = opponentState.activeEffects[idx].some(e => e.type === "invulnerable");
                                        }

                                        let requiredMarkId = skill.target_req_effect;
                                        if (targetType === "restrict_marked") {
                                            if (userState && userState.activeEffects && userState.activeEffects[charIndex]) {
                                                const restrictEffect = userState.activeEffects[charIndex].find(e =>
                                                    e.type === "target_restrict_marked" && (!e.skill_id || e.skill_id === skill.id)
                                                );
                                                if (restrictEffect) requiredMarkId = restrictEffect.amount;
                                            }
                                        }

                                        let hasMark = false;
                                        if (requiredMarkId && opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                            hasMark = opponentState.activeEffects[idx].some(e => (e.imageId == requiredMarkId || e.skill_id == requiredMarkId) && e.casterId == userId);
                                        }

                                        if (!isInvulnerable && hasMark) {
                                            targetsList.push(tid);
                                        }
                                    });

                                } else if (targetType === "all" || targetType === "all_allies") {
                                    targetsList = ["00", "01", "02"];
                                    if (targetType === "all") {
                                        const potentialTargets = ["10", "11", "12"];
                                        potentialTargets.forEach((tid, idx) => {
                                            let isInvulnerable = false;
                                            if (opponentState && opponentState.activeEffects && opponentState.activeEffects[idx]) {
                                                isInvulnerable = opponentState.activeEffects[idx].some(e => e.type === "invulnerable");
                                            }
                                            if (!isInvulnerable) {
                                                targetsList.push(tid);
                                            }
                                        });
                                    }

                                } else if (targetType === "self") {
                                    targetsList = [`0${charIndex}`];
                                } else {
                                    targetsList = ["00", "01", "02"];
                                }
                            }
                        }
                    }
                    charTargets.push("0[[[" + targetsList.join("[[["));
                }
            } else {
                for (let s = 0; s < 4; s++) {
                    charTargets.push("0[[[00[[[01[[[02");
                }
            }
            return charTargets.join("///");
        }).join("|||");
    }

    static buildEffectsString(activeEffects) {
        if (!activeEffects) return "0///0///0";
        return activeEffects.map(effects => {
            if (!effects || effects.length === 0) return "0";
            // Start with 0 element to ensure array structure
            let str = "0";
            effects.forEach(e => {
                if (e.hidden) return;
                str += `[[[${e.imageId}]]]${e.skillName ? e.skillName.toUpperCase() : ''}]]]${e.description ? e.description.toUpperCase() : ''}]]]${e.currentDuration}`;
            });
            return str;
        }).join("///");
    }

    static buildCharSpecs(chars) {
        if (chars.length === 0) return "";

        // Convert IDs to integers to find max
        const maxId = Math.max(...chars.map(c => parseInt(c.id)));
        const specsArray = new Array(maxId).fill("");

        chars.forEach(c => {
            let charData = [
                c.name.toUpperCase(),
                c.description.toUpperCase(),
                "0"
            ];

            if (c.skills && c.skills.length >= 4) {
                for (let i = 0; i < 4; i++) {
                    charData.push(c.skills[i].id);
                    charData.push(c.skills[i].name.toUpperCase());
                    charData.push(c.skills[i].description.toUpperCase());
                    charData.push(c.skills[i].chakra);
                }
            } else {
                for (let i = 0; i < 16; i++) charData.push("");
            }

            const charString = charData.join("///");

            const index = parseInt(c.id) - 1;
            if (index >= 0) {
                specsArray[index] = charString;
            }
        });

        return specsArray.join("|||");
    }
}

module.exports = GameController;
