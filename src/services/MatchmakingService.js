const BattleModel = require('../models/BattleModel');
const UserModel = require('../models/UserModel');
const ChakraSystem = require('../engine/ChakraSystem');
const AiService = require('./AiService');
const { AI_ENABLED } = require('../config');
const BattleEngine = require('../engine/BattleEngine');

let ladderQueue = [];

class MatchmakingService {
    static addToQueue(userId, team) {
        // AI Mode Check
        if (AI_ENABLED) {
            this.createAiBattle(userId, team);
            return;
        }

        const existingIndex = ladderQueue.findIndex(u => u.userId === userId);
        if (existingIndex !== -1) {
            ladderQueue.splice(existingIndex, 1);
        }

        ladderQueue.push({ userId, team });
        console.log(`[Ladder] User ${userId} joined queue. Size: ${ladderQueue.length}`);
        this.processQueue();
    }

    static createAiBattle(userId, team) {
        console.log(`[Ladder] AI Enabled. Creating Single Player match for ${userId}`);
        const aiOpponent = AiService.generateOpponent();

        const battleId = Date.now().toString();
        const user = UserModel.findById(userId);

        if (user) {
            // Update User (Player)
            UserModel.update(user.id, {
                startmatch: true,
                battleId: battleId,
                opponentId: aiOpponent.userId,
                team: team
            });

            // Init Battle State
            // Random starter (50/50 player or AI)
            const activeId = Math.random() < 0.5 ? userId : aiOpponent.userId;
            const starterChakra = ChakraSystem.generateRandomChakra(1);
            const otherChakra = { tai: 0, blo: 0, nin: 0, gen: 0, rnd: 0 };

            const newBattle = {
                turn: 1,
                creationTime: Date.now(),
                lastMoveTime: Date.now(),
                players: {
                    [userId]: {
                        id: userId,
                        team: team,
                        health: [100, 100, 100],
                        maxHealth: [100, 100, 100],
                        chakra: userId == activeId ? starterChakra : otherChakra,
                        cooldowns: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                        activeEffects: [[], [], []],
                        action: null,
                        ready: false
                    },
                    [aiOpponent.userId]: {
                        id: aiOpponent.userId,
                        username: aiOpponent.username,
                        team: aiOpponent.team,
                        rank: aiOpponent.rank,
                        wins: aiOpponent.wins,
                        losses: aiOpponent.losses,
                        streak: aiOpponent.streak,
                        ladderPosition: aiOpponent.ladderPosition,
                        health: [100, 100, 100],
                        maxHealth: [100, 100, 100],
                        chakra: aiOpponent.userId == activeId ? starterChakra : otherChakra,
                        cooldowns: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                        activeEffects: [[], [], []],
                        action: null,
                        ready: false,
                        isAi: true,
                        // Config properties for AI logic
                        vendettaTarget: null
                    }
                },
                log: [],
                activeTurn: activeId,
                order: [userId, aiOpponent.userId]
            };

            BattleModel.create(battleId, newBattle);

            if (activeId === aiOpponent.userId) {
                console.log(`[Ladder] AI (${aiOpponent.userId}) starts first. Triggering processTurn.`);
                BattleEngine.processTurn(battleId);
            }
        }
    }

    static processQueue() {
        if (ladderQueue.length >= 2) {
            const battles = BattleModel.getBattles();
            const p1 = ladderQueue.shift();
            const p2 = ladderQueue.shift();

            const battleId = Date.now().toString();

            console.log(`[Ladder] Match found! ${p1.userId} vs ${p2.userId} (Battle ${battleId})`);

            // Update Users
            // Optimization: Fetch fresh users? Or assume passed ID is valid.
            // Using UserModel to update.
            const user1 = UserModel.findById(p1.userId);
            const user2 = UserModel.findById(p2.userId);

            if (user1 && user2) {
                // Update P1
                UserModel.update(user1.id, {
                    startmatch: true,
                    battleId: battleId,
                    opponentId: p2.userId,
                    team: p1.team
                });

                // Update P2
                UserModel.update(user2.id, {
                    startmatch: true,
                    battleId: battleId,
                    opponentId: p1.userId,
                    team: p2.team
                });

                // Init Battle State
                const activeId = Math.random() < 0.5 ? p1.userId : p2.userId;
                const starterChakra = ChakraSystem.generateRandomChakra(1);
                const otherChakra = { tai: 0, blo: 0, nin: 0, gen: 0, rnd: 0 };

                const newBattle = {
                    turn: 1,
                    creationTime: Date.now(),
                    lastMoveTime: Date.now(),
                    players: {
                        [p1.userId]: {
                            id: p1.userId,
                            team: p1.team,
                            health: [100, 100, 100],
                            maxHealth: [100, 100, 100],
                            chakra: p1.userId == activeId ? starterChakra : otherChakra,
                            cooldowns: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                            activeEffects: [[], [], []],
                            action: null,
                            ready: false
                        },
                        [p2.userId]: {
                            id: p2.userId,
                            team: p2.team,
                            health: [100, 100, 100],
                            maxHealth: [100, 100, 100],
                            chakra: p2.userId == activeId ? starterChakra : otherChakra,
                            cooldowns: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
                            activeEffects: [[], [], []],
                            action: null,
                            ready: false
                        }
                    },
                    log: [],
                    activeTurn: activeId,
                    order: [p1.userId, p2.userId]
                };

                BattleModel.create(battleId, newBattle);
            }
        }
    }
}

module.exports = MatchmakingService;
