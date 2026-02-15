
const BattleEngine = require('../src/engine/BattleEngine');
const EffectSystem = require('../src/engine/EffectSystem');

// Mock Data
const playerA = {
    id: "p1",
    activeEffects: [[], [], []],
    health: [100, 100, 100],
    maxHealth: [100, 100, 100],
    chakra: { current: 100 },
    cooldowns: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
};

const playerB = {
    id: "p2",
    activeEffects: [[], [], []],
    health: [100, 100, 100],
    maxHealth: [100, 100, 100],
    chakra: { current: 100 },
    cooldowns: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
};

const battle = {
    id: "test_battle",
    players: {
        "p1": playerA,
        "p2": playerB
    },
    turn: 1,
    activeTurn: "p1",
    order: ["p1", "p2"]
};

// Test Case: Rasengan Stun (1 turn) from P1 to P2
console.log("--- Starting Test: Effect Duration Logic ---");

// 1. P1 applies Stun to P2
console.log("\nStep 1: P1 applies Stun (1 turn) to P2");
const stunEffect = {
    type: "stun",
    target: "enemy",
    duration: 1
};

// Simulate Effect Application
// Note: EffectSystem.applyEffect currently adds +1 if enemy.
// We are testing CURRENT behavior first.
EffectSystem.applyEffect(playerB.activeEffects[0], stunEffect, "p1", "skill_rasengan", "Rasengan", "Stun Skill");

let appliedEffect = playerB.activeEffects[0][0];
console.log(`Applied Effect Duration: ${appliedEffect.duration} (Current: ${appliedEffect.currentDuration})`);
console.log(`Caster: ${appliedEffect.casterId}`);

// 2. Turn Switches to P2
console.log("\nStep 2: Turn Switches to P2");
battle.activeTurn = "p2";
battle.turn++;

// startNewTurn(battle, activeId, prevId)
BattleEngine.startNewTurn(battle, "p2", "p1");

appliedEffect = playerB.activeEffects[0][0];
if (appliedEffect) {
    console.log(`P2 Start Turn - Stun Duration: ${appliedEffect.currentDuration}`);
} else {
    console.log(`P2 Start Turn - Stun Effect REMOVED?`);
}

// 3. Turn Switches to P1
console.log("\nStep 3: Turn Switches to P1");
battle.activeTurn = "p1";
battle.turn++;

BattleEngine.startNewTurn(battle, "p1", "p2");

appliedEffect = playerB.activeEffects[0][0];
if (appliedEffect) {
    console.log(`P1 Start Turn - Stun Duration: ${appliedEffect.currentDuration}`);
} else {
    console.log(`P1 Start Turn - Stun Effect REMOVED`);
}

// 4. Turn Switches to P2 again
console.log("\nStep 4: Turn Switches to P2");
battle.activeTurn = "p2";
battle.turn++;

BattleEngine.startNewTurn(battle, "p2", "p1");

appliedEffect = playerB.activeEffects[0][0];
if (appliedEffect) {
    console.log(`P2 Start Turn (2) - Stun Duration: ${appliedEffect.currentDuration}`);
} else {
    console.log(`P2 Start Turn (2) - Stun Effect REMOVED`);
}
