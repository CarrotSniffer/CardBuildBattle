/**
 * Card Sprite System
 * Each trait has 10 unique sprites, plus 10 generic sprites for cards without traits
 */

const CARD_SPRITES = {
    // Generic sprites (for cards with no traits or any trait)
    generic: [
        { id: 'generic_1', name: 'Warrior', icon: '⚔️', gradient: 'linear-gradient(135deg, #4a4a6a 0%, #2a2a4a 100%)' },
        { id: 'generic_2', name: 'Mage', icon: '🔮', gradient: 'linear-gradient(135deg, #6b4a8a 0%, #3d2a5a 100%)' },
        { id: 'generic_3', name: 'Knight', icon: '🛡️', gradient: 'linear-gradient(135deg, #5a5a7a 0%, #3a3a5a 100%)' },
        { id: 'generic_4', name: 'Rogue', icon: '🗡️', gradient: 'linear-gradient(135deg, #4a5a4a 0%, #2a3a2a 100%)' },
        { id: 'generic_5', name: 'Beast', icon: '🐺', gradient: 'linear-gradient(135deg, #6a5a4a 0%, #4a3a2a 100%)' },
        { id: 'generic_6', name: 'Dragon', icon: '🐉', gradient: 'linear-gradient(135deg, #8a4a4a 0%, #5a2a2a 100%)' },
        { id: 'generic_7', name: 'Golem', icon: '🗿', gradient: 'linear-gradient(135deg, #6a6a6a 0%, #4a4a4a 100%)' },
        { id: 'generic_8', name: 'Spirit', icon: '👻', gradient: 'linear-gradient(135deg, #7a7a9a 0%, #5a5a7a 100%)' },
        { id: 'generic_9', name: 'Elemental', icon: '🌀', gradient: 'linear-gradient(135deg, #4a6a8a 0%, #2a4a5a 100%)' },
        { id: 'generic_10', name: 'Champion', icon: '👑', gradient: 'linear-gradient(135deg, #8a7a4a 0%, #5a4a2a 100%)' }
    ],

    // Swift trait sprites
    swift: [
        { id: 'swift_1', name: 'Wind Runner', icon: '💨', gradient: 'linear-gradient(135deg, #16a085 0%, #0e6655 100%)' },
        { id: 'swift_2', name: 'Lightning Dash', icon: '⚡', gradient: 'linear-gradient(135deg, #1abc9c 0%, #0d7d6d 100%)' },
        { id: 'swift_3', name: 'Falcon', icon: '🦅', gradient: 'linear-gradient(135deg, #17a589 0%, #0b5e49 100%)' },
        { id: 'swift_4', name: 'Shadow Step', icon: '👤', gradient: 'linear-gradient(135deg, #1d9a7a 0%, #0a5a4a 100%)' },
        { id: 'swift_5', name: 'Cheetah', icon: '🐆', gradient: 'linear-gradient(135deg, #20b298 0%, #0f6b5b 100%)' },
        { id: 'swift_6', name: 'Zephyr', icon: '🌪️', gradient: 'linear-gradient(135deg, #14a085 0%, #0c5045 100%)' },
        { id: 'swift_7', name: 'Scout', icon: '🏃', gradient: 'linear-gradient(135deg, #18b895 0%, #0d6b55 100%)' },
        { id: 'swift_8', name: 'Haste Mage', icon: '✨', gradient: 'linear-gradient(135deg, #15a580 0%, #0a6050 100%)' },
        { id: 'swift_9', name: 'Blur', icon: '💫', gradient: 'linear-gradient(135deg, #1cb595 0%, #0e7565 100%)' },
        { id: 'swift_10', name: 'Quickblade', icon: '⚔️', gradient: 'linear-gradient(135deg, #19b090 0%, #0b6555 100%)' }
    ],

    // Taunt trait sprites
    taunt: [
        { id: 'taunt_1', name: 'Shield Wall', icon: '🛡️', gradient: 'linear-gradient(135deg, #8e44ad 0%, #5b2c6f 100%)' },
        { id: 'taunt_2', name: 'Protector', icon: '🏰', gradient: 'linear-gradient(135deg, #9b59b6 0%, #6c3483 100%)' },
        { id: 'taunt_3', name: 'Guardian', icon: '🦁', gradient: 'linear-gradient(135deg, #8e44ad 0%, #4a235a 100%)' },
        { id: 'taunt_4', name: 'Fortress', icon: '🏯', gradient: 'linear-gradient(135deg, #a569bd 0%, #7d3c98 100%)' },
        { id: 'taunt_5', name: 'Sentinel', icon: '👁️', gradient: 'linear-gradient(135deg, #9458a2 0%, #5e3370 100%)' },
        { id: 'taunt_6', name: 'Bulwark', icon: '🧱', gradient: 'linear-gradient(135deg, #884ea0 0%, #512e5f 100%)' },
        { id: 'taunt_7', name: 'Warden', icon: '⚓', gradient: 'linear-gradient(135deg, #9b59b6 0%, #5b2c6f 100%)' },
        { id: 'taunt_8', name: 'Defender', icon: '🛡️', gradient: 'linear-gradient(135deg, #a35db8 0%, #6a3580 100%)' },
        { id: 'taunt_9', name: 'Provoke', icon: '😤', gradient: 'linear-gradient(135deg, #8844aa 0%, #4a2060 100%)' },
        { id: 'taunt_10', name: 'Aegis', icon: '💠', gradient: 'linear-gradient(135deg, #9055a5 0%, #583070 100%)' }
    ],

    // Ranged trait sprites
    ranged: [
        { id: 'ranged_1', name: 'Archer', icon: '🏹', gradient: 'linear-gradient(135deg, #d35400 0%, #a04000 100%)' },
        { id: 'ranged_2', name: 'Sniper', icon: '🎯', gradient: 'linear-gradient(135deg, #e67e22 0%, #b35900 100%)' },
        { id: 'ranged_3', name: 'Crossbow', icon: '⚙️', gradient: 'linear-gradient(135deg, #ca6f1e 0%, #8a4a10 100%)' },
        { id: 'ranged_4', name: 'Fire Mage', icon: '🔥', gradient: 'linear-gradient(135deg, #dc7633 0%, #a04000 100%)' },
        { id: 'ranged_5', name: 'Ice Mage', icon: '❄️', gradient: 'linear-gradient(135deg, #d68910 0%, #9a5a00 100%)' },
        { id: 'ranged_6', name: 'Javelin', icon: '🎋', gradient: 'linear-gradient(135deg, #e59866 0%, #af601a 100%)' },
        { id: 'ranged_7', name: 'Cannon', icon: '💥', gradient: 'linear-gradient(135deg, #dc7633 0%, #935116 100%)' },
        { id: 'ranged_8', name: 'Marksman', icon: '👁️', gradient: 'linear-gradient(135deg, #eb984e 0%, #ba4a00 100%)' },
        { id: 'ranged_9', name: 'Sharpshooter', icon: '🔫', gradient: 'linear-gradient(135deg, #d35400 0%, #873600 100%)' },
        { id: 'ranged_10', name: 'Artillery', icon: '🎆', gradient: 'linear-gradient(135deg, #e74c3c 0%, #a93226 100%)' }
    ],

    // Armor trait sprites
    armor: [
        { id: 'armor_1', name: 'Iron Clad', icon: '🛡️', gradient: 'linear-gradient(135deg, #7f8c8d 0%, #515a5a 100%)' },
        { id: 'armor_2', name: 'Steel Skin', icon: '⚙️', gradient: 'linear-gradient(135deg, #95a5a6 0%, #616a6b 100%)' },
        { id: 'armor_3', name: 'Plated', icon: '🔩', gradient: 'linear-gradient(135deg, #85929e 0%, #566573 100%)' },
        { id: 'armor_4', name: 'Fortified', icon: '🏰', gradient: 'linear-gradient(135deg, #aab7b8 0%, #717d7e 100%)' },
        { id: 'armor_5', name: 'Hardened', icon: '💎', gradient: 'linear-gradient(135deg, #839192 0%, #4d5656 100%)' },
        { id: 'armor_6', name: 'Tank', icon: '🦏', gradient: 'linear-gradient(135deg, #99a3a4 0%, #5d6d7e 100%)' },
        { id: 'armor_7', name: 'Stone Skin', icon: '🗿', gradient: 'linear-gradient(135deg, #b2babb 0%, #7b7d7d 100%)' },
        { id: 'armor_8', name: 'Mail', icon: '⛓️', gradient: 'linear-gradient(135deg, #808b96 0%, #4a545e 100%)' },
        { id: 'armor_9', name: 'Reinforced', icon: '🔧', gradient: 'linear-gradient(135deg, #a9cce3 0%, #5d8aa8 100%)' },
        { id: 'armor_10', name: 'Titanium', icon: '⚔️', gradient: 'linear-gradient(135deg, #d5d8dc 0%, #909497 100%)' }
    ],

    // Charge trait sprites
    charge: [
        { id: 'charge_1', name: 'Berserker', icon: '😡', gradient: 'linear-gradient(135deg, #e74c3c 0%, #a93226 100%)' },
        { id: 'charge_2', name: 'Bull Rush', icon: '🐂', gradient: 'linear-gradient(135deg, #c0392b 0%, #7b241c 100%)' },
        { id: 'charge_3', name: 'War Cry', icon: '📯', gradient: 'linear-gradient(135deg, #ec7063 0%, #b03a2e 100%)' },
        { id: 'charge_4', name: 'Rampage', icon: '💢', gradient: 'linear-gradient(135deg, #d63031 0%, #9b2335 100%)' },
        { id: 'charge_5', name: 'Fury', icon: '🔥', gradient: 'linear-gradient(135deg, #e55039 0%, #a93226 100%)' },
        { id: 'charge_6', name: 'Onslaught', icon: '⚡', gradient: 'linear-gradient(135deg, #cb4335 0%, #8b2323 100%)' },
        { id: 'charge_7', name: 'Slam', icon: '👊', gradient: 'linear-gradient(135deg, #e74c3c 0%, #922b21 100%)' },
        { id: 'charge_8', name: 'Stampede', icon: '🐎', gradient: 'linear-gradient(135deg, #d35400 0%, #8b3a00 100%)' },
        { id: 'charge_9', name: 'Crusher', icon: '💪', gradient: 'linear-gradient(135deg, #e63946 0%, #a82a35 100%)' },
        { id: 'charge_10', name: 'Wrath', icon: '⚔️', gradient: 'linear-gradient(135deg, #dc3545 0%, #9c2230 100%)' }
    ],

    // Lifesteal trait sprites
    lifesteal: [
        { id: 'lifesteal_1', name: 'Vampire', icon: '🧛', gradient: 'linear-gradient(135deg, #c0392b 0%, #6c1a11 100%)' },
        { id: 'lifesteal_2', name: 'Blood Mage', icon: '🩸', gradient: 'linear-gradient(135deg, #a93226 0%, #641e16 100%)' },
        { id: 'lifesteal_3', name: 'Leech', icon: '🦇', gradient: 'linear-gradient(135deg, #922b21 0%, #4a1610 100%)' },
        { id: 'lifesteal_4', name: 'Drainer', icon: '💉', gradient: 'linear-gradient(135deg, #b83227 0%, #6d1d16 100%)' },
        { id: 'lifesteal_5', name: 'Soul Eater', icon: '👁️', gradient: 'linear-gradient(135deg, #8e2424 0%, #501515 100%)' },
        { id: 'lifesteal_6', name: 'Nosferatu', icon: '🌙', gradient: 'linear-gradient(135deg, #a02828 0%, #5a1515 100%)' },
        { id: 'lifesteal_7', name: 'Blood Knight', icon: '⚔️', gradient: 'linear-gradient(135deg, #b03a3a 0%, #621e1e 100%)' },
        { id: 'lifesteal_8', name: 'Siphon', icon: '🌀', gradient: 'linear-gradient(135deg, #9a3030 0%, #551818 100%)' },
        { id: 'lifesteal_9', name: 'Hemomancer', icon: '✨', gradient: 'linear-gradient(135deg, #c23c3c 0%, #701f1f 100%)' },
        { id: 'lifesteal_10', name: 'Crimson', icon: '❤️', gradient: 'linear-gradient(135deg, #b52b2b 0%, #651818 100%)' }
    ],

    // Divine Shield trait sprites
    divine_shield: [
        { id: 'divine_shield_1', name: 'Paladin', icon: '✝️', gradient: 'linear-gradient(135deg, #f1c40f 0%, #b7950b 100%)' },
        { id: 'divine_shield_2', name: 'Angel', icon: '👼', gradient: 'linear-gradient(135deg, #f9e79f 0%, #d4ac0d 100%)' },
        { id: 'divine_shield_3', name: 'Holy Knight', icon: '⚜️', gradient: 'linear-gradient(135deg, #f4d03f 0%, #c9a608 100%)' },
        { id: 'divine_shield_4', name: 'Blessed', icon: '🌟', gradient: 'linear-gradient(135deg, #fad02c 0%, #c5a600 100%)' },
        { id: 'divine_shield_5', name: 'Sacred', icon: '🕊️', gradient: 'linear-gradient(135deg, #f5d313 0%, #b8a000 100%)' },
        { id: 'divine_shield_6', name: 'Light Bringer', icon: '☀️', gradient: 'linear-gradient(135deg, #fff200 0%, #cfca00 100%)' },
        { id: 'divine_shield_7', name: 'Templar', icon: '🛡️', gradient: 'linear-gradient(135deg, #f1e100 0%, #b0a800 100%)' },
        { id: 'divine_shield_8', name: 'Seraph', icon: '🔆', gradient: 'linear-gradient(135deg, #f7dc6f 0%, #c4a615 100%)' },
        { id: 'divine_shield_9', name: 'Radiant', icon: '💫', gradient: 'linear-gradient(135deg, #fcf300 0%, #bfb500 100%)' },
        { id: 'divine_shield_10', name: 'Celestial', icon: '⭐', gradient: 'linear-gradient(135deg, #f0e010 0%, #a8a000 100%)' }
    ],

    // Inspire trait sprites
    inspire: [
        { id: 'inspire_1', name: 'Commander', icon: '👑', gradient: 'linear-gradient(135deg, #9b59b6 0%, #6c3483 100%)' },
        { id: 'inspire_2', name: 'Banner', icon: '🚩', gradient: 'linear-gradient(135deg, #a569bd 0%, #7d3c98 100%)' },
        { id: 'inspire_3', name: 'Warlord', icon: '⚔️', gradient: 'linear-gradient(135deg, #8e44ad 0%, #5b2c6f 100%)' },
        { id: 'inspire_4', name: 'General', icon: '🎖️', gradient: 'linear-gradient(135deg, #9b59b6 0%, #6a348a 100%)' },
        { id: 'inspire_5', name: 'Herald', icon: '📯', gradient: 'linear-gradient(135deg, #af7ac5 0%, #884ea0 100%)' },
        { id: 'inspire_6', name: 'Captain', icon: '🧭', gradient: 'linear-gradient(135deg, #9a50a5 0%, #5e2b6b 100%)' },
        { id: 'inspire_7', name: 'Leader', icon: '🦁', gradient: 'linear-gradient(135deg, #b47cc5 0%, #8045a0 100%)' },
        { id: 'inspire_8', name: 'Motivator', icon: '💪', gradient: 'linear-gradient(135deg, #a860b8 0%, #703890 100%)' },
        { id: 'inspire_9', name: 'Rallier', icon: '🔔', gradient: 'linear-gradient(135deg, #9c55aa 0%, #653075 100%)' },
        { id: 'inspire_10', name: 'Champion', icon: '🏆', gradient: 'linear-gradient(135deg, #b060c0 0%, #7a4090 100%)' }
    ],

    // Regenerate trait sprites
    regenerate: [
        { id: 'regenerate_1', name: 'Troll', icon: '👹', gradient: 'linear-gradient(135deg, #27ae60 0%, #1e8449 100%)' },
        { id: 'regenerate_2', name: 'Hydra', icon: '🐍', gradient: 'linear-gradient(135deg, #2ecc71 0%, #1d8348 100%)' },
        { id: 'regenerate_3', name: 'Nature', icon: '🌿', gradient: 'linear-gradient(135deg, #28b463 0%, #196f3d 100%)' },
        { id: 'regenerate_4', name: 'Druid', icon: '🌳', gradient: 'linear-gradient(135deg, #52be80 0%, #27ae60 100%)' },
        { id: 'regenerate_5', name: 'Phoenix', icon: '🔥', gradient: 'linear-gradient(135deg, #229954 0%, #145a32 100%)' },
        { id: 'regenerate_6', name: 'Healer', icon: '💚', gradient: 'linear-gradient(135deg, #58d68d 0%, #28b463 100%)' },
        { id: 'regenerate_7', name: 'Revenant', icon: '💀', gradient: 'linear-gradient(135deg, #1e8449 0%, #145a32 100%)' },
        { id: 'regenerate_8', name: 'Lifebinder', icon: '🌱', gradient: 'linear-gradient(135deg, #48c774 0%, #20924a 100%)' },
        { id: 'regenerate_9', name: 'Restoration', icon: '✨', gradient: 'linear-gradient(135deg, #2dcc70 0%, #1a9050 100%)' },
        { id: 'regenerate_10', name: 'Rejuvenate', icon: '🍀', gradient: 'linear-gradient(135deg, #30d070 0%, #1b9050 100%)' }
    ],

    // Piercing trait sprites
    piercing: [
        { id: 'piercing_1', name: 'Spear', icon: '🔱', gradient: 'linear-gradient(135deg, #e67e22 0%, #ca6f1e 100%)' },
        { id: 'piercing_2', name: 'Lance', icon: '🎋', gradient: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)' },
        { id: 'piercing_3', name: 'Impaler', icon: '📌', gradient: 'linear-gradient(135deg, #eb984e 0%, #ca6f1e 100%)' },
        { id: 'piercing_4', name: 'Skewer', icon: '🗡️', gradient: 'linear-gradient(135deg, #dc7633 0%, #af601a 100%)' },
        { id: 'piercing_5', name: 'Rapier', icon: '⚔️', gradient: 'linear-gradient(135deg, #f5b041 0%, #d68910 100%)' },
        { id: 'piercing_6', name: 'Needle', icon: '📍', gradient: 'linear-gradient(135deg, #e59866 0%, #ba4a00 100%)' },
        { id: 'piercing_7', name: 'Thrust', icon: '💢', gradient: 'linear-gradient(135deg, #f8c471 0%, #e67e22 100%)' },
        { id: 'piercing_8', name: 'Puncture', icon: '🎯', gradient: 'linear-gradient(135deg, #d68910 0%, #9c6900 100%)' },
        { id: 'piercing_9', name: 'Penetrate', icon: '➡️', gradient: 'linear-gradient(135deg, #f0a030 0%, #c07010 100%)' },
        { id: 'piercing_10', name: 'Perforate', icon: '⚡', gradient: 'linear-gradient(135deg, #e89020 0%, #b86000 100%)' }
    ],

    // Negative traits - shared dark theme sprites
    frail: [
        { id: 'frail_1', name: 'Glass Cannon', icon: '💔', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'frail_2', name: 'Fragile Soul', icon: '👻', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'frail_3', name: 'Brittle', icon: '🥀', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    slow: [
        { id: 'slow_1', name: 'Sluggish', icon: '🐌', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'slow_2', name: 'Heavy', icon: '⚓', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'slow_3', name: 'Lumbering', icon: '🦣', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    fragile: [
        { id: 'fragile_1', name: 'Vulnerable', icon: '💀', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'fragile_2', name: 'Exposed', icon: '🎭', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'fragile_3', name: 'Weak', icon: '😰', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    costly: [
        { id: 'costly_1', name: 'Expensive', icon: '💰', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'costly_2', name: 'Heavy Toll', icon: '⚖️', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'costly_3', name: 'Burden', icon: '📦', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    exhausting: [
        { id: 'exhausting_1', name: 'Draining', icon: '😩', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'exhausting_2', name: 'Tiring', icon: '💤', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'exhausting_3', name: 'Weary', icon: '😴', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    soulbound: [
        { id: 'soulbound_1', name: 'Cursed', icon: '⛓️', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'soulbound_2', name: 'Bound', icon: '🔗', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'soulbound_3', name: 'Linked', icon: '💜', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    volatile: [
        { id: 'volatile_1', name: 'Unstable', icon: '💥', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'volatile_2', name: 'Explosive', icon: '🧨', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'volatile_3', name: 'Fleeting', icon: '💨', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ],
    pacifist: [
        { id: 'pacifist_1', name: 'Peaceful', icon: '☮️', gradient: 'linear-gradient(135deg, #5d6d7e 0%, #2c3e50 100%)' },
        { id: 'pacifist_2', name: 'Gentle', icon: '🕊️', gradient: 'linear-gradient(135deg, #6c7a89 0%, #34495e 100%)' },
        { id: 'pacifist_3', name: 'Reluctant', icon: '😔', gradient: 'linear-gradient(135deg, #5c6d7e 0%, #2e4053 100%)' }
    ]
};

/**
 * Get available sprites for a card based on its traits
 */
function getAvailableSprites(traits = []) {
    const available = [...CARD_SPRITES.generic];

    if (traits && traits.length > 0) {
        traits.forEach(trait => {
            if (CARD_SPRITES[trait]) {
                available.push(...CARD_SPRITES[trait]);
            }
        });
    }

    return available;
}

/**
 * Get a sprite by ID
 */
function getSpriteById(spriteId) {
    // Check all categories
    for (const category of Object.keys(CARD_SPRITES)) {
        const sprite = CARD_SPRITES[category].find(s => s.id === spriteId);
        if (sprite) return sprite;
    }
    return CARD_SPRITES.generic[0]; // Default fallback
}

/**
 * Get the primary trait for sprite category
 */
function getPrimaryTrait(traits = []) {
    const positiveTraits = ['swift', 'taunt', 'ranged', 'armor', 'charge', 'lifesteal', 'divine_shield', 'inspire', 'regenerate', 'piercing'];
    for (const trait of traits) {
        if (positiveTraits.includes(trait)) {
            return trait;
        }
    }
    return null;
}

module.exports = {
    CARD_SPRITES,
    getAvailableSprites,
    getSpriteById,
    getPrimaryTrait
};
