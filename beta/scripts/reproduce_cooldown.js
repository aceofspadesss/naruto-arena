const BattleEngine = require('../src/engine/BattleEngine');
const BattleModel = require('../src/models/BattleModel');
const CharacterModel = require('../src/models/CharacterModel');
const UserModel = require('../src/models/UserModel');

// Mock Data
const mockBattleId = 'test-battle';
const p1Id = 'user1';
const p2Id = 'user2';

const mockCharacter = {
    id: '1',
    name: 'Naruto',
    skills: [
        {
            id: 's1',
            name: 'Shadow Clones',
            cooldown: 5,
            effects: [],
            description: 'Test Skill'
        },
        { id: 's2', name: 'Skill 2', cooldown: 0 },
        { id: 's3', name: 'Skill 3', cooldown: 0 },
        { id: 's4', name: 'Skill 4', cooldown: 0 }
    ]
};

const mockBattle = {
    id: mockBattleId,
    turn: 1,
    activeTurn: p1Id,
    order: [p1Id, p2Id],
    players: {
        [p1Id]: {
            id: p1Id,
            team: ['1', '0', '0'],
            health: [100, 100, 100],
            maxHealth: [100, 100, 100],
            chakra: { red: 100, blue: 100, green: 100, white: 100 }, // Infinite chakra
            cooldowns: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            activeEffects: [[], [], []],
            action: { charIndex: 0, skillIndex: 0, targetId: '10' }, // Use Skill 0 (Shadow Clones) on Enemy 0 (P2)
            ready: true
        },
        [p2Id]: {
            id: p2Id,
            team: ['1', '0', '0'],
            health: [100, 100, 100],
            maxHealth: [100, 100, 100],
            chakra: { red: 100, blue: 100, green: 100, white: 100 },
            cooldowns: [
                [0, 0, 0, 0],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            activeEffects: [[], [], []],
            action: null,
            ready: false
        }
    }
};

// Mock Methods
BattleModel.findById = (id) => {
    if (id === mockBattleId) return mockBattle;
    return null;
};
BattleModel.saveBattles = (data) => { };
BattleModel.update = (id, data) => { };

CharacterModel.findById = (id) => {
    return mockCharacter; // Always return Naruto
};

UserModel.getUsers = () => [];
UserModel.saveUsers = () => { };

console.log('--- Start Simulation ---');
console.log(`Turn ${mockBattle.turn}: Active User ${mockBattle.activeTurn}`);
console.log(`P1 Cooldown (Before): ${mockBattle.players[p1Id].cooldowns[0][0]}`);

// Process Turn 1 (P1 uses skill)
BattleEngine.processTurn(mockBattleId);

console.log('--- After Turn 1 ---');
console.log(`Turn ${mockBattle.turn}: Active User ${mockBattle.activeTurn}`); // Should be P2
console.log(`P1 Cooldown: ${mockBattle.players[p1Id].cooldowns[0][0]}`); // Should be 5

// Setup P2 to skip turn
mockBattle.players[p2Id].ready = true;
mockBattle.players[p2Id].action = []; // No action

console.log('\n--- Start Turn 2 (P2 moves) ---');
BattleEngine.processTurn(mockBattleId);

console.log('--- After Turn 2 ---');
console.log(`Turn ${mockBattle.turn}: Active User ${mockBattle.activeTurn}`); // Should be P1
console.log(`P1 Cooldown: ${mockBattle.players[p1Id].cooldowns[0][0]}`); // Should be 4
