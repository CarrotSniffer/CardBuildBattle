/**
 * Point-Buy Card Creation System
 * Each card gets a budget of points to spend on stats and traits
 */

const POINT_BUDGET = 10;
const MAX_TRAITS = 3;

// Base stats for a new card
const BASE_STATS = {
    attack: 1,
    health: 1,
    manaCost: 2
};

// Cost to increase stats (per point)
const STAT_COSTS = {
    attack: 2,      // +1 Attack costs 2 points
    health: 1,      // +1 Health costs 1 point
    manaCost: -3    // -1 Mana Cost costs 3 points (reducing cost is expensive)
};

// Positive traits (cost points)
const POSITIVE_TRAITS = {
    swift: {
        id: 'swift',
        name: 'Swift',
        cost: 3,
        description: 'Can attack immediately when played',
        effect: 'swift'
    },
    taunt: {
        id: 'taunt',
        name: 'Taunt',
        cost: 3,
        description: 'Enemies must attack this unit first',
        effect: 'taunt'
    },
    ranged: {
        id: 'ranged',
        name: 'Ranged',
        cost: 4,
        description: 'Attacks without receiving counter-damage',
        effect: 'ranged'
    },
    armor: {
        id: 'armor',
        name: 'Armor',
        cost: 2,
        description: 'Takes 1 less damage from all sources',
        effect: 'armor'
    },
    charge: {
        id: 'charge',
        name: 'Charge',
        cost: 3,
        description: 'Deals double damage when attacking',
        effect: 'charge'
    },
    lifesteal: {
        id: 'lifesteal',
        name: 'Lifesteal',
        cost: 4,
        description: 'Heals your hero for damage dealt',
        effect: 'lifesteal'
    },
    divine_shield: {
        id: 'divine_shield',
        name: 'Divine Shield',
        cost: 3,
        description: 'Blocks the first instance of damage',
        effect: 'divine_shield'
    },
    inspire: {
        id: 'inspire',
        name: 'Inspire',
        cost: 2,
        description: 'Adjacent allies gain +1/+1',
        effect: 'inspire'
    },
    regenerate: {
        id: 'regenerate',
        name: 'Regenerate',
        cost: 2,
        description: 'Heals 1 health at the start of your turn',
        effect: 'regenerate'
    },
    piercing: {
        id: 'piercing',
        name: 'Piercing',
        cost: 4,
        description: 'Excess damage hits the enemy hero',
        effect: 'piercing'
    },
    stealth: {
        id: 'stealth',
        name: 'Stealth',
        cost: 4,
        description: 'Cannot be targeted until it attacks',
        effect: 'stealth'
    },
    deathtouch: {
        id: 'deathtouch',
        name: 'Deathtouch',
        cost: 4,
        description: 'Destroys any unit it damages',
        effect: 'deathtouch'
    },
    frenzy: {
        id: 'frenzy',
        name: 'Frenzy',
        cost: 3,
        description: 'Can attack twice per turn',
        effect: 'frenzy'
    },
    // New positive traits
    thorns: {
        id: 'thorns',
        name: 'Thorns',
        cost: 2,
        description: 'Deals 1 damage to attackers',
        effect: 'thorns'
    },
    rally: {
        id: 'rally',
        name: 'Rally',
        cost: 3,
        description: 'All allies gain +1 attack when played',
        effect: 'rally'
    },
    guardian: {
        id: 'guardian',
        name: 'Guardian',
        cost: 2,
        description: 'Adjacent allies take 1 less damage',
        effect: 'guardian'
    },
    vampiric: {
        id: 'vampiric',
        name: 'Vampiric',
        cost: 3,
        description: 'Gains +1/+1 when it kills a unit',
        effect: 'vampiric'
    },
    retaliate: {
        id: 'retaliate',
        name: 'Retaliate',
        cost: 2,
        description: 'Deals double counter-attack damage',
        effect: 'retaliate'
    },
    elusive: {
        id: 'elusive',
        name: 'Elusive',
        cost: 3,
        description: 'Can only be blocked by units with 3+ attack',
        effect: 'elusive'
    },
    leech: {
        id: 'leech',
        name: 'Leech',
        cost: 2,
        description: 'Drains 1 mana from opponent when attacking hero',
        effect: 'leech'
    },
    undying: {
        id: 'undying',
        name: 'Undying',
        cost: 4,
        description: 'Returns to hand when destroyed (once)',
        effect: 'undying'
    },
    overpower: {
        id: 'overpower',
        name: 'Overpower',
        cost: 2,
        description: 'Ignores armor trait',
        effect: 'overpower'
    },
    warcry: {
        id: 'warcry',
        name: 'Warcry',
        cost: 2,
        description: 'Gains +2 attack on the turn it is played',
        effect: 'warcry'
    }
};

// Negative traits (give points back)
const NEGATIVE_TRAITS = {
    frail: {
        id: 'frail',
        name: 'Frail',
        cost: -2,
        description: 'Dies to any damage',
        effect: 'frail'
    },
    slow: {
        id: 'slow',
        name: 'Slow',
        cost: -2,
        description: 'Cannot attack for 1 turn after playing',
        effect: 'slow'
    },
    fragile: {
        id: 'fragile',
        name: 'Fragile',
        cost: -2,
        description: 'Takes double damage',
        effect: 'fragile'
    },
    costly: {
        id: 'costly',
        name: 'Costly',
        cost: -2,
        description: 'Costs +2 additional mana',
        effect: 'costly'
    },
    exhausting: {
        id: 'exhausting',
        name: 'Exhausting',
        cost: -2,
        description: 'Lose 2 mana next turn',
        effect: 'exhausting'
    },
    soulbound: {
        id: 'soulbound',
        name: 'Soulbound',
        cost: -2,
        description: 'When this dies, lose 3 health',
        effect: 'soulbound'
    },
    volatile: {
        id: 'volatile',
        name: 'Volatile',
        cost: -3,
        description: 'Dies at the end of your turn',
        effect: 'volatile'
    },
    pacifist: {
        id: 'pacifist',
        name: 'Pacifist',
        cost: -2,
        description: 'Cannot attack heroes directly',
        effect: 'pacifist'
    },
    // New negative traits
    cursed: {
        id: 'cursed',
        name: 'Cursed',
        cost: -2,
        description: 'Cannot be healed or buffed',
        effect: 'cursed'
    },
    clumsy: {
        id: 'clumsy',
        name: 'Clumsy',
        cost: -1,
        description: 'Has a 25% chance to miss attacks',
        effect: 'clumsy'
    },
    cowardly: {
        id: 'cowardly',
        name: 'Cowardly',
        cost: -2,
        description: 'Cannot attack units with higher attack',
        effect: 'cowardly'
    },
    reckless: {
        id: 'reckless',
        name: 'Reckless',
        cost: -1,
        description: 'Must attack each turn if able',
        effect: 'reckless'
    },
    doomed: {
        id: 'doomed',
        name: 'Doomed',
        cost: -2,
        description: 'Dies after 3 turns on field',
        effect: 'doomed'
    },
    vengeful: {
        id: 'vengeful',
        name: 'Vengeful',
        cost: -1,
        description: 'Deals 2 damage to your hero when destroyed',
        effect: 'vengeful'
    },
    exposed: {
        id: 'exposed',
        name: 'Exposed',
        cost: -2,
        description: 'Takes +1 damage from all sources',
        effect: 'exposed'
    },
    draining: {
        id: 'draining',
        name: 'Draining',
        cost: -2,
        description: 'Costs 1 mana each turn to keep alive',
        effect: 'draining'
    },
    disloyal: {
        id: 'disloyal',
        name: 'Disloyal',
        cost: -3,
        description: 'Switches sides if opponent has more units',
        effect: 'disloyal'
    },
    brittle: {
        id: 'brittle',
        name: 'Brittle',
        cost: -1,
        description: 'Loses 1 attack each turn',
        effect: 'brittle'
    }
};

// All traits combined
const ALL_TRAITS = { ...POSITIVE_TRAITS, ...NEGATIVE_TRAITS };

/**
 * Calculate the point cost of a card
 */
function calculatePointCost(cardData) {
    let cost = 0;

    // Stat costs (difference from base)
    const attackDiff = cardData.attack - BASE_STATS.attack;
    const manaDiff = BASE_STATS.manaCost - cardData.manaCost; // Inverted: lower mana = more cost

    cost += attackDiff * STAT_COSTS.attack;

    // Health scaling: 1-5 costs 1 pt each, 6+ costs 2 pts each
    const health = cardData.health;
    const baseHealth = BASE_STATS.health;
    if (health <= 5) {
        cost += (health - baseHealth) * STAT_COSTS.health;
    } else {
        // First 4 points (2-5) cost 1 each, rest cost 2 each
        const cheapHealth = Math.max(0, 5 - baseHealth); // 4 pts at 1 cost each
        const expensiveHealth = health - 5; // remaining pts at 2 cost each
        cost += cheapHealth * STAT_COSTS.health;
        cost += expensiveHealth * 2;
    }

    cost += manaDiff * Math.abs(STAT_COSTS.manaCost);

    // Trait costs
    if (cardData.traits && Array.isArray(cardData.traits)) {
        cardData.traits.forEach(traitId => {
            const trait = ALL_TRAITS[traitId];
            if (trait) {
                cost += trait.cost;
            }
        });
    }

    return cost;
}

/**
 * Validate a card's configuration
 */
function validateCard(cardData) {
    const errors = [];

    // Check name
    if (!cardData.name || cardData.name.length < 1) {
        errors.push('Card must have a name');
    }
    if (cardData.name && cardData.name.length > 20) {
        errors.push('Card name must be 20 characters or less');
    }

    // Check stats are valid
    if (cardData.attack < 0) {
        errors.push('Attack cannot be negative');
    }
    if (cardData.attack > 15) {
        errors.push('Attack cannot exceed 15');
    }
    if (cardData.health < 1) {
        errors.push('Health must be at least 1');
    }
    if (cardData.health > 20) {
        errors.push('Health cannot exceed 20');
    }
    if (cardData.manaCost < 0) {
        errors.push('Mana cost cannot be negative');
    }
    if (cardData.manaCost > 12) {
        errors.push('Mana cost cannot exceed 12');
    }

    // Check for invalid traits
    if (cardData.traits && Array.isArray(cardData.traits)) {
        cardData.traits.forEach(traitId => {
            if (!ALL_TRAITS[traitId]) {
                errors.push(`Unknown trait: ${traitId}`);
            }
        });

        // Check for conflicting traits
        const hasSwift = cardData.traits.includes('swift');
        const hasSlow = cardData.traits.includes('slow');
        if (hasSwift && hasSlow) {
            errors.push('Cannot have both Swift and Slow');
        }

        // Check max traits limit
        if (cardData.traits.length > MAX_TRAITS) {
            errors.push(`Card can have at most ${MAX_TRAITS} traits`);
        }
    }

    // Check point budget
    const pointCost = calculatePointCost(cardData);
    if (pointCost > POINT_BUDGET) {
        errors.push(`Card costs ${pointCost} points, but budget is ${POINT_BUDGET}`);
    }
    if (pointCost < POINT_BUDGET) {
        errors.push(`Card only uses ${pointCost} points, must use exactly ${POINT_BUDGET}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        pointCost
    };
}

/**
 * Get remaining points for a card configuration
 */
function getRemainingPoints(cardData) {
    const cost = calculatePointCost(cardData);
    return POINT_BUDGET - cost;
}

/**
 * Calculate final mana cost including trait modifiers
 */
function getFinalManaCost(cardData) {
    let cost = cardData.manaCost;

    if (cardData.traits && cardData.traits.includes('costly')) {
        cost += 2;
    }

    return Math.max(0, cost);
}

module.exports = {
    POINT_BUDGET,
    MAX_TRAITS,
    BASE_STATS,
    STAT_COSTS,
    POSITIVE_TRAITS,
    NEGATIVE_TRAITS,
    ALL_TRAITS,
    calculatePointCost,
    validateCard,
    getRemainingPoints,
    getFinalManaCost
};
