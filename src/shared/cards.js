/**
 * Card Definitions
 * All cards are deterministic - no random effects
 *
 * Card Types:
 * - unit: Creatures that can attack and defend
 * - spell: One-time effects
 * - structure: Persistent effects on the field
 */

const CARDS = {
    // ===== UNIT CARDS =====
    'knight': {
        id: 'knight',
        name: 'Knight',
        type: 'unit',
        cost: 3,
        attack: 3,
        health: 4,
        abilities: [],
        description: 'A stalwart defender.'
    },
    'archer': {
        id: 'archer',
        name: 'Archer',
        type: 'unit',
        cost: 2,
        attack: 2,
        health: 2,
        abilities: ['ranged'],
        description: 'Can attack without receiving counter-damage.'
    },
    'guardian': {
        id: 'guardian',
        name: 'Guardian',
        type: 'unit',
        cost: 4,
        attack: 2,
        health: 7,
        abilities: ['taunt'],
        description: 'Enemies must attack this unit first.'
    },
    'assassin': {
        id: 'assassin',
        name: 'Assassin',
        type: 'unit',
        cost: 3,
        attack: 4,
        health: 2,
        abilities: ['swift'],
        description: 'Can attack immediately when played.'
    },
    'mage': {
        id: 'mage',
        name: 'Battle Mage',
        type: 'unit',
        cost: 4,
        attack: 3,
        health: 3,
        abilities: ['spellpower'],
        description: 'Increases spell damage by 1.'
    },
    'healer': {
        id: 'healer',
        name: 'Healer',
        type: 'unit',
        cost: 3,
        attack: 1,
        health: 4,
        abilities: ['heal_ally'],
        description: 'At end of turn, heals an adjacent ally for 2.'
    },
    'berserker': {
        id: 'berserker',
        name: 'Berserker',
        type: 'unit',
        cost: 5,
        attack: 6,
        health: 5,
        abilities: ['frenzy'],
        description: 'Gains +1 attack each time it takes damage.'
    },
    'shieldbearer': {
        id: 'shieldbearer',
        name: 'Shieldbearer',
        type: 'unit',
        cost: 2,
        attack: 1,
        health: 5,
        abilities: ['armor'],
        description: 'Takes 1 less damage from all sources.'
    },
    'cavalry': {
        id: 'cavalry',
        name: 'Cavalry',
        type: 'unit',
        cost: 5,
        attack: 4,
        health: 4,
        abilities: ['swift', 'charge'],
        description: 'Swift. Deals double damage when attacking.'
    },
    'commander': {
        id: 'commander',
        name: 'Commander',
        type: 'unit',
        cost: 6,
        attack: 4,
        health: 5,
        abilities: ['inspire'],
        description: 'Adjacent allies gain +1/+1.'
    },

    // ===== SPELL CARDS =====
    'strike': {
        id: 'strike',
        name: 'Precise Strike',
        type: 'spell',
        cost: 2,
        effect: 'damage',
        value: 3,
        target: 'enemy_unit',
        description: 'Deal 3 damage to an enemy unit.'
    },
    'heal': {
        id: 'heal',
        name: 'Healing Light',
        type: 'spell',
        cost: 2,
        effect: 'heal',
        value: 4,
        target: 'friendly',
        description: 'Restore 4 health to a friendly unit or your hero.'
    },
    'buff': {
        id: 'buff',
        name: 'Battle Cry',
        type: 'spell',
        cost: 3,
        effect: 'buff',
        value: { attack: 2, health: 2 },
        target: 'friendly_unit',
        description: 'Give a friendly unit +2/+2.'
    },
    'draw': {
        id: 'draw',
        name: 'Tactical Insight',
        type: 'spell',
        cost: 2,
        effect: 'draw',
        value: 2,
        target: 'self',
        description: 'Draw 2 cards.'
    },
    'weaken': {
        id: 'weaken',
        name: 'Weaken',
        type: 'spell',
        cost: 1,
        effect: 'debuff',
        value: { attack: -2 },
        target: 'enemy_unit',
        description: 'Reduce an enemy unit\'s attack by 2.'
    },
    'execute': {
        id: 'execute',
        name: 'Execute',
        type: 'spell',
        cost: 4,
        effect: 'destroy',
        condition: 'damaged',
        target: 'enemy_unit',
        description: 'Destroy a damaged enemy unit.'
    },
    'shield': {
        id: 'shield',
        name: 'Divine Shield',
        type: 'spell',
        cost: 3,
        effect: 'grant_ability',
        value: 'divine_shield',
        target: 'friendly_unit',
        description: 'Give a friendly unit Divine Shield (blocks next damage).'
    },
    'mass_heal': {
        id: 'mass_heal',
        name: 'Mass Restoration',
        type: 'spell',
        cost: 5,
        effect: 'heal_all',
        value: 3,
        target: 'all_friendly',
        description: 'Restore 3 health to all friendly units.'
    },

    // ===== STRUCTURE CARDS =====
    'tower': {
        id: 'tower',
        name: 'Watchtower',
        type: 'structure',
        cost: 3,
        health: 5,
        effect: 'end_turn_damage',
        value: 1,
        target: 'all_enemies',
        description: 'At end of turn, deal 1 damage to all enemy units.'
    },
    'barracks': {
        id: 'barracks',
        name: 'Barracks',
        type: 'structure',
        cost: 4,
        health: 6,
        effect: 'cost_reduction',
        value: 1,
        target: 'unit_cards',
        description: 'Your unit cards cost 1 less to play.'
    },
    'sanctuary': {
        id: 'sanctuary',
        name: 'Sanctuary',
        type: 'structure',
        cost: 4,
        health: 5,
        effect: 'end_turn_heal',
        value: 1,
        target: 'all_friendly',
        description: 'At end of turn, heal all friendly units for 1.'
    }
};

// Pre-built decks (each deck has exactly 20 cards for quick games)
const STARTER_DECKS = {
    'balanced': {
        id: 'balanced',
        name: 'Balanced Forces',
        cards: [
            'knight', 'knight', 'knight',
            'archer', 'archer', 'archer',
            'guardian', 'guardian',
            'assassin', 'assassin',
            'healer', 'healer',
            'strike', 'strike',
            'heal', 'heal',
            'buff', 'buff',
            'draw', 'draw'
        ]
    },
    'aggro': {
        id: 'aggro',
        name: 'Swift Assault',
        cards: [
            'assassin', 'assassin', 'assassin',
            'archer', 'archer', 'archer',
            'cavalry', 'cavalry',
            'berserker', 'berserker',
            'knight', 'knight',
            'strike', 'strike', 'strike',
            'buff', 'buff',
            'weaken', 'weaken',
            'draw'
        ]
    },
    'control': {
        id: 'control',
        name: 'Fortress Defense',
        cards: [
            'guardian', 'guardian', 'guardian',
            'shieldbearer', 'shieldbearer', 'shieldbearer',
            'healer', 'healer', 'healer',
            'commander', 'commander',
            'heal', 'heal', 'heal',
            'mass_heal', 'mass_heal',
            'execute', 'execute',
            'sanctuary', 'tower'
        ]
    }
};

// Ability definitions for reference
const ABILITIES = {
    'ranged': 'Can attack without receiving counter-damage',
    'taunt': 'Enemies must attack this unit first',
    'swift': 'Can attack immediately when played',
    'spellpower': 'Increases spell damage by 1',
    'heal_ally': 'At end of turn, heals adjacent ally for 2',
    'frenzy': 'Gains +1 attack when damaged',
    'armor': 'Takes 1 less damage from all sources',
    'charge': 'Deals double damage when attacking',
    'inspire': 'Adjacent allies gain +1/+1',
    'divine_shield': 'Blocks the next instance of damage'
};

module.exports = { CARDS, STARTER_DECKS, ABILITIES };
