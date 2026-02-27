// EffectSystem.js - Handles effect application, processing, and checking

class EffectSystem {
    static applyEffect(targetEffects, effect, actorId, skillId, skillName, skillDescription, casterSlot) {
        let effDuration = effect.duration || 0;
        if (effect.type === "mark" && effDuration === 0) effDuration = 9999;

        const imageId = skillId; // Usually skill ID serves as image ID for tracking

        let finalDuration = effDuration;

        targetEffects.push({
            ...effect,
            duration: effDuration,
            imageId: imageId,
            skillName: skillName.replace(/ /g, ''), // legacy format often no spaces
            description: skillDescription,
            currentDuration: finalDuration,
            casterId: actorId,
            casterSlot: casterSlot
        });

        console.log(` -> Applied Effect ${effect.type}. ActiveEffects Count: ${targetEffects.length}`);
    }

    static hasEffectType(effects, type) {
        if (!effects) return false;
        return effects.some(e => e.type === type);
    }

    static hasMark(effects, markId, casterId) {
        if (!effects) return false;
        // Check imageId or skill_id, optionally filtered by casterId
        return effects.some(e => {
            const idMatch = e.imageId == markId || e.skill_id == markId;
            if (!idMatch) return false;
            if (casterId !== undefined) return e.casterId == casterId;
            return true;
        });
    }

    static getDamageBoost(effects, skillId) {
        if (!effects) return 0;
        let totalBoost = 0;
        effects.forEach(e => {
            if (e.type === "damage_boost") {
                let applies = true;
                if (e.skill_id && e.skill_id != skillId) {
                    applies = false;
                }
                if (applies) {
                    totalBoost += e.amount;
                }
            }
        });
        return totalBoost;
    }

    static getSkillDamageNerf(effects, skillId) {
        if (!effects || !skillId) return 0;
        let totalNerf = 0;
        effects.forEach(e => {
            if (e.type === "skill_damage_nerf" && String(e.skill_id) === String(skillId)) {
                totalNerf += e.amount;
            }
        });
        return Math.min(totalNerf, 100); // Cap at 100%
    }

    static getDamageReduction(effects, isAffliction = false) {
        if (!effects) return 0;

        // check disable_damage_reduction
        const isReductionDisabled = effects.some(e => e.type === "disable_damage_reduction");
        if (isReductionDisabled) return 0;
        if (isAffliction) return 0; // Affliction ignores reduction

        let totalReduction = 0;
        effects.forEach(e => {
            if (e.type === "damage_reduction" && e.amount) {
                // Multiplicative reduction? Or Additive? 
                // Legacy code: dmg = dmg * (1 - reduction) iteratively.
                // We return array of reductions or handle it?
                // Let's return nothing here and handle iteration in caller, or helper.
            }
        });
        return 0; // Usage pattern is iterative in legacy code.
    }

    static applyDamageReduction(damage, effects, isAffliction = false) {
        if (!effects) return damage;
        if (isAffliction) return damage;

        const isReductionDisabled = effects.some(e => e.type === "disable_damage_reduction");
        if (isReductionDisabled) return damage;

        let finalDamage = damage;
        effects.forEach(e => {
            if (e.type === "damage_reduction" && e.amount) {
                const reduction = (e.amount / 100);
                finalDamage = finalDamage * (1 - reduction);
                console.log(`   -> Reduced by ${e.amount}%. New Dmg: ${finalDamage}`);
            }
        });
        return Math.floor(finalDamage);
    }
}

module.exports = EffectSystem;
