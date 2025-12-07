/**
 * Card Builder Module
 * Single responsive layout
 */

// Point system data (loaded from server)
let pointSystem = null;

// Tooltip system
let builderTooltipElement = null;
let builderTooltipTimeout = null;

// Gameplay examples for each trait
const TRAIT_GAMEPLAY_EXAMPLES = {
    // Positive traits - Offense
    charge: "A 4/2 Charge unit can attack a 3/3 enemy and deal 8 damage (double), destroying it in one hit while taking only 3 counter-damage.",
    piercing: "Your 5/3 Piercing unit attacks an enemy 2/4. The 2-health enemy dies, and the remaining 3 damage goes straight to their hero!",
    deathtouch: "A tiny 1/1 Deathtouch unit can trade with an enemy's massive 8/8 tank, making it incredibly efficient against big threats.",
    frenzy: "Your 3/4 Frenzy attacker can destroy two enemy 3/3 units in a single turn, clearing the board twice as fast.",
    warcry: "Play your 2/3 Warcry unit and immediately attack with 4 attack. Next turn it's back to 2 attack, but the burst was valuable!",
    overpower: "Enemy has a 2/6 Armor unit taking only 1 damage per hit? Your Overpower unit ignores that armor completely.",

    // Positive traits - Defense
    taunt: "Your opponent has a 6/2 assassin aiming for your hero. Your 1/5 Taunt forces them to attack it instead, protecting your health.",
    armor: "Your 3/6 Armor unit takes hits from two 2/2 enemies. Each hit deals only 1 damage instead of 2, so it survives 6 attacks!",
    divine_shield: "A 2/1 Divine Shield unit survives an enemy's 8 attack hit, then attacks back next turn. The shield absorbed massive damage.",
    guardian: "Place your Guardian between two allies. Now those allies take 1 less damage from everything - that 4 damage hit becomes 3!",
    thorns: "Enemy attacks your 2/4 Thorns unit with their 3/3. Your unit takes 3 damage, but Thorns deals 1 back - now they're a 3/2!",
    retaliate: "Your 2/5 Retaliate is attacked by a 4/4. You take 4 damage but deal 4 back (double your 2 attack), leaving them at 4/0 - dead!",

    // Positive traits - Speed & Evasion
    swift: "Normal units can't attack the turn they're played. Your Swift 4/2 can attack immediately, removing an enemy threat right away.",
    ranged: "Your 3/3 Ranged attacks an enemy 4/2. You deal 3 damage and kill it, but take zero counter-damage. Safe and efficient!",
    stealth: "Your 4/2 Stealth sits on the field untargetable. Enemy can't remove it until you choose to attack, guaranteeing that first strike.",
    elusive: "Enemy has only 2-attack units? They literally cannot block your Elusive attacker - it slips past for guaranteed hero damage!",

    // Positive traits - Sustain
    lifesteal: "Your hero is at 10 health. Your 4/3 Lifesteal attacks and deals 4 damage - you heal to 14 health! Great for staying alive.",
    regenerate: "Your damaged 3/6 Regenerate unit is at 3/2 health. Each turn start, it heals 1, slowly recovering to fight again.",
    vampiric: "Your 3/3 Vampiric kills an enemy. It becomes 4/4! Kill another? Now it's 5/5! It snowballs into a massive threat.",
    undying: "Enemy destroys your 5/4 Undying with a removal spell. Joke's on them - it returns to your hand to be played again!",

    // Positive traits - Utility
    inspire: "Your 2/3 Inspire sits between two 2/2 allies. They become 3/3 each! That's +2/+2 total value from one unit's passive.",
    rally: "Play your Rally unit when you have 3 allies on field. All three gain +1 attack instantly - that's +3 total attack for free!",
    leech: "Your Leech unit hits the enemy hero. They lose 1 mana next turn! At low mana, this can completely lock them out of plays.",

    // Negative traits - Fragility
    frail: "Your powerful 6/5 Frail has huge stats for its cost. But one ping of damage from anything kills it instantly. High risk!",
    fragile: "Your 4/4 Fragile gets hit by a 2-attack unit. Double damage means you take 4 damage from a 2-attack source!",
    exposed: "Your 3/5 Exposed takes +1 damage from everything. That enemy 3/3 now effectively hits for 4 against you.",
    brittle: "Your 5/4 Brittle starts strong but loses 1 attack each turn. Turn 3? It's now a 3/4. Use it fast or lose value!",

    // Negative traits - Restrictions
    slow: "Your powerful 6/6 Slow can't attack the turn after it's played. Plan ahead - it needs one turn to 'wake up'.",
    pacifist: "Your 2/8 Pacifist is a great blocker and can attack enemy units, but it cannot go face. Use it for board control only.",
    cowardly: "Your 5/3 Cowardly can't attack that enemy 6/2. It's too scared of higher attack! Find smaller targets or buff your unit.",
    cursed: "Your Cursed unit can't benefit from Inspire, Rally, or healing. Those synergies are off the table - it's on its own.",

    // Negative traits - Drawbacks
    costly: "Your card shows 3 mana, but Costly adds +2. You actually pay 5 mana! Budget accordingly when building your deck.",
    exhausting: "Play your Exhausting unit this turn. Next turn you have 2 less mana to work with. Worth it for the power boost?",
    draining: "Your 6/6 Draining costs 1 mana each turn just to keep alive. If you can't pay, it dies! Manage your mana carefully.",
    clumsy: "Your 4/4 Clumsy attacks... but misses 25% of the time! Sometimes that crucial attack just whiffs.",
    reckless: "Your 4/3 Reckless MUST attack every turn if able. Even into an enemy 8/8. You don't get to play defensively.",

    // Negative traits - Doom
    soulbound: "Your 5/5 Soulbound dies. You take 3 damage to your hero. Was the early power worth the life payment?",
    volatile: "Your 7/3 Volatile has amazing stats but dies at end of turn. Play it, attack, and say goodbye. One-turn wonder!",
    doomed: "Turn 1: Your Doomed enters. Turn 2: Tick. Turn 3: Tick. End of Turn 3: Dies automatically. Use it quickly!",
    vengeful: "Your 4/4 Vengeful gets destroyed. 2 damage to YOUR hero. That's the price of its cheap stats.",
    disloyal: "Enemy has 3 units, you have 2. Your Disloyal unit switches sides! Suddenly you're down a unit AND they're up one."
};

// Initialize tooltip on page load
function initBuilderTooltip() {
    builderTooltipElement = document.createElement('div');
    builderTooltipElement.className = 'builder-tooltip';
    document.body.appendChild(builderTooltipElement);
}

// Show trait tooltip with gameplay example
function showTraitTooltip(traitId, isPositive, x, y) {
    if (!builderTooltipElement || !pointSystem) return;

    const trait = isPositive ? pointSystem.positiveTraits[traitId] : pointSystem.negativeTraits[traitId];
    if (!trait) return;

    const example = TRAIT_GAMEPLAY_EXAMPLES[traitId] || "No gameplay example available.";

    let html = `
        <div class="trait-tooltip-header">
            <span class="trait-tooltip-name">${trait.name}</span>
            <span class="trait-tooltip-cost ${isPositive ? 'positive' : 'negative'}">
                ${isPositive ? '-' : '+'}${Math.abs(trait.cost)} pts
            </span>
        </div>
        <div class="trait-tooltip-desc">${trait.description}</div>
        <div class="trait-tooltip-example">
            <div class="trait-tooltip-example-label">Gameplay Example</div>
            <div class="trait-tooltip-example-text">${example}</div>
        </div>
    `;

    builderTooltipElement.innerHTML = html;
    builderTooltipElement.classList.add('visible');

    positionTooltip(x, y);
}

// Show card tooltip (for My Cards panel)
function showCardTooltip(card, x, y) {
    if (!builderTooltipElement || !pointSystem) return;

    let manaCost = card.manaCost;
    if (card.traits.includes('costly')) {
        manaCost += 2;
    }

    let html = `
        <div class="tooltip-header">
            <span class="tooltip-name">${card.name}</span>
            <span class="tooltip-cost">${manaCost}</span>
        </div>
        <div class="tooltip-stats">
            <span class="tooltip-attack">&#9876; Attack: ${card.attack}</span>
            <span class="tooltip-health">&#9829; Health: ${card.health}</span>
        </div>
    `;

    if (card.traits && card.traits.length > 0) {
        html += '<div class="tooltip-traits">';
        card.traits.forEach(traitId => {
            const isPositive = !!pointSystem.positiveTraits[traitId];
            const trait = pointSystem.positiveTraits[traitId] || pointSystem.negativeTraits[traitId];
            if (trait) {
                html += `
                    <div class="tooltip-trait ${isPositive ? 'positive' : 'negative'}">
                        <div class="tooltip-trait-name">${trait.name}</div>
                        <div class="tooltip-trait-desc">${trait.description}</div>
                    </div>
                `;
            }
        });
        html += '</div>';
    }

    builderTooltipElement.innerHTML = html;
    builderTooltipElement.classList.add('visible');

    positionTooltip(x, y);
}

// Position tooltip intelligently
function positionTooltip(x, y) {
    if (!builderTooltipElement) return;

    requestAnimationFrame(() => {
        const tooltipRect = builderTooltipElement.getBoundingClientRect();
        const padding = 15;
        const tooltipWidth = Math.max(tooltipRect.width, 280);
        const tooltipHeight = tooltipRect.height;

        let left = x + padding;
        let top = y - padding;

        // Keep on screen horizontally
        if (left + tooltipWidth > window.innerWidth) {
            left = x - tooltipWidth - padding;
        }
        if (left < padding) {
            left = padding;
        }

        // Keep on screen vertically
        if (top + tooltipHeight > window.innerHeight - padding) {
            top = y - tooltipHeight - padding;
        }
        if (top < padding) {
            top = padding;
        }

        builderTooltipElement.style.left = `${left}px`;
        builderTooltipElement.style.top = `${top}px`;
    });
}

// Hide tooltip
function hideBuilderTooltip() {
    if (builderTooltipTimeout) {
        clearTimeout(builderTooltipTimeout);
        builderTooltipTimeout = null;
    }
    if (builderTooltipElement) {
        builderTooltipElement.classList.remove('visible');
    }
}

// Attach tooltip events to an element
function attachTraitTooltipEvents(element, traitId, isPositive) {
    element.addEventListener('mouseenter', (e) => {
        builderTooltipTimeout = setTimeout(() => {
            showTraitTooltip(traitId, isPositive, e.clientX, e.clientY);
        }, 300);
    });

    element.addEventListener('mousemove', (e) => {
        if (builderTooltipElement && builderTooltipElement.classList.contains('visible')) {
            positionTooltip(e.clientX, e.clientY);
        }
    });

    element.addEventListener('mouseleave', hideBuilderTooltip);
}

function attachCardTooltipEvents(element, card) {
    element.addEventListener('mouseenter', (e) => {
        builderTooltipTimeout = setTimeout(() => {
            showCardTooltip(card, e.clientX, e.clientY);
        }, 300);
    });

    element.addEventListener('mousemove', (e) => {
        if (builderTooltipElement && builderTooltipElement.classList.contains('visible')) {
            positionTooltip(e.clientX, e.clientY);
        }
    });

    element.addEventListener('mouseleave', hideBuilderTooltip);
}

// Available sprites (loaded from server)
let availableSprites = [];

// Current card state
let currentCard = {
    id: null,
    name: '',
    attack: 1,
    health: 1,
    manaCost: 2,
    traits: [],
    spriteId: null
};

// User's cards
let myCards = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    if (!Auth.requireAuth()) return;

    // Display username
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = Auth.user.username;

    // Initialize tooltip system
    initBuilderTooltip();

    // Load point system
    await loadPointSystem();

    // Load user's cards
    await loadMyCards();

    // Load available sprites
    await loadSprites();

    // Setup event listeners
    setupEventListeners();

    // Initial render
    updatePointsDisplay();
    updateSpriteDisplay();
});

async function loadPointSystem() {
    try {
        const response = await fetch('/api/point-system');
        pointSystem = await response.json();
        renderTraits();
    } catch (error) {
        console.error('Failed to load point system:', error);
    }
}

async function loadMyCards() {
    try {
        const response = await Auth.fetchWithAuth('/api/cards');
        const data = await response.json();
        myCards = data.cards || [];
        renderMyCards();
    } catch (error) {
        console.error('Failed to load cards:', error);
    }
}

async function loadSprites() {
    try {
        const traitsParam = currentCard.traits.length > 0 ? currentCard.traits.join(',') : '';
        const response = await fetch(`/api/sprites?traits=${traitsParam}`);
        const data = await response.json();
        availableSprites = data.sprites || [];
        renderSpriteGrid();
    } catch (error) {
        console.error('Failed to load sprites:', error);
    }
}

function renderSpriteGrid() {
    const container = document.getElementById('sprite-grid');
    if (!container) return;

    container.innerHTML = '';

    availableSprites.forEach(sprite => {
        const el = document.createElement('div');
        el.className = 'sprite-item' + (currentCard.spriteId === sprite.id ? ' selected' : '');
        el.dataset.spriteId = sprite.id;
        el.style.background = sprite.gradient;
        el.innerHTML = `<span class="sprite-icon">${sprite.icon}</span>`;
        el.title = sprite.name;

        el.addEventListener('click', () => selectSprite(sprite.id));
        container.appendChild(el);
    });
}

function selectSprite(spriteId) {
    currentCard.spriteId = spriteId;
    renderSpriteGrid();
    updateSpriteDisplay();
}

function updateSpriteDisplay() {
    const display = document.getElementById('card-sprite-display');
    if (!display) return;

    if (currentCard.spriteId) {
        const sprite = availableSprites.find(s => s.id === currentCard.spriteId);
        if (sprite) {
            display.style.background = sprite.gradient;
            display.innerHTML = `<span class="sprite-icon">${sprite.icon}</span>`;
            return;
        }
    }
    // Default display
    display.style.background = 'linear-gradient(135deg, #4a4a6a 0%, #2a2a4a 100%)';
    display.innerHTML = '<span class="sprite-icon">?</span>';
}

// Trait category definitions
const TRAIT_CATEGORIES = {
    // Positive trait categories
    offense: {
        name: 'Offense',
        icon: '',
        positive: true,
        traits: ['charge', 'piercing', 'deathtouch', 'frenzy', 'warcry', 'overpower']
    },
    defense: {
        name: 'Defense',
        icon: '',
        positive: true,
        traits: ['taunt', 'armor', 'divine_shield', 'guardian', 'thorns', 'retaliate']
    },
    speed: {
        name: 'Speed & Evasion',
        icon: '',
        positive: true,
        traits: ['swift', 'ranged', 'stealth', 'elusive']
    },
    sustain: {
        name: 'Sustain',
        icon: '',
        positive: true,
        traits: ['lifesteal', 'regenerate', 'vampiric', 'undying']
    },
    utility: {
        name: 'Utility',
        icon: '',
        positive: true,
        traits: ['inspire', 'rally', 'leech']
    },
    // Negative trait categories
    fragility: {
        name: 'Fragility',
        icon: '',
        positive: false,
        traits: ['frail', 'fragile', 'exposed', 'brittle']
    },
    restrictions: {
        name: 'Restrictions',
        icon: '',
        positive: false,
        traits: ['slow', 'pacifist', 'cowardly', 'cursed']
    },
    drawbacks: {
        name: 'Drawbacks',
        icon: '',
        positive: false,
        traits: ['costly', 'exhausting', 'draining', 'clumsy', 'reckless']
    },
    doom: {
        name: 'Doom',
        icon: '',
        positive: false,
        traits: ['soulbound', 'volatile', 'doomed', 'vengeful', 'disloyal']
    }
};

function renderTraits() {
    const container = document.getElementById('traits-container');
    if (!container) return;

    container.innerHTML = '';

    // Combine all traits
    const allPositive = Object.values(pointSystem.positiveTraits);
    const allNegative = Object.values(pointSystem.negativeTraits);

    // Render positive categories first
    const positiveCategories = Object.entries(TRAIT_CATEGORIES).filter(([_, cat]) => cat.positive);
    const negativeCategories = Object.entries(TRAIT_CATEGORIES).filter(([_, cat]) => !cat.positive);

    // Add positive section header
    const positiveHeader = document.createElement('div');
    positiveHeader.className = 'traits-section-header positive';
    positiveHeader.innerHTML = '<h3>Positive Traits <span class="cost-hint">(Cost Points)</span></h3>';
    container.appendChild(positiveHeader);

    positiveCategories.forEach(([categoryId, category]) => {
        const traitsInCategory = allPositive
            .filter(t => category.traits.includes(t.id))
            .sort((a, b) => b.cost - a.cost); // Sort by cost descending (highest first)

        if (traitsInCategory.length > 0) {
            container.appendChild(createCategoryElement(category, traitsInCategory, true));
        }
    });

    // Add negative section header
    const negativeHeader = document.createElement('div');
    negativeHeader.className = 'traits-section-header negative';
    negativeHeader.innerHTML = '<h3>Negative Traits <span class="cost-hint">(Give Points)</span></h3>';
    container.appendChild(negativeHeader);

    negativeCategories.forEach(([categoryId, category]) => {
        const traitsInCategory = allNegative
            .filter(t => category.traits.includes(t.id))
            .sort((a, b) => a.cost - b.cost); // Sort by cost ascending (most negative first, gives most points)

        if (traitsInCategory.length > 0) {
            container.appendChild(createCategoryElement(category, traitsInCategory, false));
        }
    });
}

function createCategoryElement(category, traits, isPositive) {
    const section = document.createElement('div');
    section.className = `trait-category ${isPositive ? 'positive' : 'negative'}`;

    const header = document.createElement('div');
    header.className = 'trait-category-header';
    header.innerHTML = `<span class="category-icon">${category.icon}</span> ${category.name}`;

    const list = document.createElement('div');
    list.className = 'traits-list';

    traits.forEach(trait => {
        list.appendChild(createTraitElement(trait, isPositive));
    });

    section.appendChild(header);
    section.appendChild(list);

    // Make collapsible
    header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
    });

    return section;
}

function createTraitElement(trait, isPositive) {
    const el = document.createElement('div');
    el.className = `trait-item ${isPositive ? 'positive' : 'negative'}`;
    el.draggable = true;
    el.dataset.traitId = trait.id;

    el.innerHTML = `
        <div class="trait-info">
            <div class="trait-name">${trait.name}</div>
            <div class="trait-desc">${trait.description}</div>
        </div>
        <span class="trait-cost ${isPositive ? 'positive' : 'negative'}">
            ${isPositive ? '-' : '+'}${Math.abs(trait.cost)}
        </span>
    `;

    // Drag events
    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', trait.id);
        el.classList.add('dragging');
        hideBuilderTooltip(); // Hide tooltip when dragging
    });

    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
    });

    // Click to add
    el.addEventListener('click', () => {
        addTrait(trait.id);
    });

    // Tooltip events
    attachTraitTooltipEvents(el, trait.id, isPositive);

    return el;
}

function setupEventListeners() {
    // Stat sliders
    setupSliderListener('attack-slider', 'attack-value', 'attack-display', 'attack');
    setupSliderListener('health-slider', 'health-value', 'health-display', 'health');
    setupSliderListener('mana-slider', 'mana-value', null, 'manaCost', true);

    // Card name
    const cardNameInput = document.getElementById('card-name');
    if (cardNameInput) {
        cardNameInput.addEventListener('input', (e) => {
            currentCard.name = e.target.value;
        });
    }

    // Active traits drop zone
    setupDropZone('active-traits');
}

function setupSliderListener(sliderId, valueId, displayId, property, isMana = false) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;

    slider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        currentCard[property] = value;

        // Update corresponding value display
        const valueEl = document.getElementById(valueId);
        if (valueEl) valueEl.textContent = value;

        // Update card display
        if (displayId) {
            const displayEl = document.getElementById(displayId);
            if (displayEl) displayEl.textContent = value;
        }

        if (isMana) {
            updateManaDisplay();
        }

        updatePointsDisplay();
    });
}

function setupDropZone(dropZoneId) {
    const dropZone = document.getElementById(dropZoneId);
    if (!dropZone) return;

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const traitId = e.dataTransfer.getData('text/plain');
        addTrait(traitId);
    });
}

function addTrait(traitId) {
    // Check if already has this trait
    if (currentCard.traits.includes(traitId)) {
        return;
    }

    // Check max traits limit (3 maximum)
    const maxTraits = pointSystem?.maxTraits || 3;
    if (currentCard.traits.length >= maxTraits) {
        showError(`Maximum ${maxTraits} traits per card`);
        return;
    }

    // Check for conflicting traits
    if (traitId === 'swift' && currentCard.traits.includes('slow')) {
        showError('Cannot have both Swift and Slow');
        return;
    }
    if (traitId === 'slow' && currentCard.traits.includes('swift')) {
        showError('Cannot have both Swift and Slow');
        return;
    }
    if (traitId === 'taunt' && currentCard.traits.includes('stealth')) {
        showError('Cannot have both Taunt and Stealth');
        return;
    }
    if (traitId === 'stealth' && currentCard.traits.includes('taunt')) {
        showError('Cannot have both Taunt and Stealth');
        return;
    }
    if (traitId === 'ranged' && currentCard.traits.includes('retaliate')) {
        showError('Cannot have both Ranged and Retaliate');
        return;
    }
    if (traitId === 'retaliate' && currentCard.traits.includes('ranged')) {
        showError('Cannot have both Ranged and Retaliate');
        return;
    }

    currentCard.traits.push(traitId);
    renderActiveTraits();
    updatePointsDisplay();
    // Reload sprites when traits change (more sprites become available)
    loadSprites();
}

function removeTrait(traitId) {
    currentCard.traits = currentCard.traits.filter(t => t !== traitId);
    renderActiveTraits();
    updatePointsDisplay();
    // Reload sprites when traits change (some sprites may no longer be available)
    // Also clear sprite selection if current sprite is no longer valid
    loadSprites().then(() => {
        if (currentCard.spriteId && !availableSprites.find(s => s.id === currentCard.spriteId)) {
            currentCard.spriteId = null;
            updateSpriteDisplay();
        }
    });
}

function renderActiveTraits() {
    const container = document.getElementById('active-traits');
    if (!container) return;

    const maxTraits = pointSystem?.maxTraits || 3;

    if (currentCard.traits.length === 0) {
        container.innerHTML = `<span class="empty-traits-hint">Tap traits to add (max ${maxTraits})</span>`;
        return;
    }

    container.innerHTML = '';

    currentCard.traits.forEach(traitId => {
        const trait = pointSystem.positiveTraits[traitId] || pointSystem.negativeTraits[traitId];
        if (!trait) return;

        const isPositive = !!pointSystem.positiveTraits[traitId];
        const tag = document.createElement('div');
        tag.className = `trait-tag ${isPositive ? 'positive' : 'negative'}`;
        tag.innerHTML = `
            <span class="trait-tag-name">${trait.name}</span>
            <button class="remove-trait" data-trait-id="${traitId}">&times;</button>
        `;

        // Add click handler to remove button
        const removeBtn = tag.querySelector('.remove-trait');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeTrait(traitId);
        });

        // Tooltip on the trait tag (not the remove button)
        const nameSpan = tag.querySelector('.trait-tag-name');
        attachTraitTooltipEvents(nameSpan, traitId, isPositive);

        container.appendChild(tag);
    });
}

function calculatePointCost() {
    if (!pointSystem) return 0;

    let cost = 0;

    // Stat costs
    const attackDiff = currentCard.attack - pointSystem.baseStats.attack;
    const manaDiff = pointSystem.baseStats.manaCost - currentCard.manaCost;

    cost += attackDiff * pointSystem.statCosts.attack;

    // Health scaling: 1-5 costs 1 pt each, 6+ costs 2 pts each (matches server)
    const health = currentCard.health;
    const baseHealth = pointSystem.baseStats.health;
    if (health <= 5) {
        cost += (health - baseHealth) * pointSystem.statCosts.health;
    } else {
        // First 4 points (2-5) cost 1 each, rest cost 2 each
        const cheapHealth = Math.max(0, 5 - baseHealth); // 4 pts at 1 cost each
        const expensiveHealth = health - 5; // remaining pts at 2 cost each
        cost += cheapHealth * pointSystem.statCosts.health;
        cost += expensiveHealth * 2;
    }

    cost += manaDiff * Math.abs(pointSystem.statCosts.manaCost);

    // Trait costs
    currentCard.traits.forEach(traitId => {
        const trait = pointSystem.positiveTraits[traitId] || pointSystem.negativeTraits[traitId];
        if (trait) {
            cost += trait.cost;
        }
    });

    return cost;
}

function updatePointsDisplay() {
    if (!pointSystem) return;

    const cost = calculatePointCost();
    const remaining = pointSystem.budget - cost;

    const el = document.getElementById('points-value');
    if (el) {
        el.textContent = remaining;
        el.classList.remove('over', 'under', 'exact');
        if (remaining < 0) {
            el.classList.add('over');
        } else if (remaining > 0) {
            el.classList.add('under');
        } else {
            el.classList.add('exact');
        }
    }
}

function updateManaDisplay() {
    let manaCost = currentCard.manaCost;
    // Add costly trait effect
    if (currentCard.traits.includes('costly')) {
        manaCost += 2;
    }
    const el = document.getElementById('card-mana-display');
    if (el) el.textContent = manaCost;
}

function randomizeCard() {
    if (!pointSystem) return;

    // Reset first
    resetCard();

    // Get all available traits
    const allPositiveTraits = Object.keys(pointSystem.positiveTraits);
    const allNegativeTraits = Object.keys(pointSystem.negativeTraits);

    // Randomly choose mana first to determine trait limits
    // Avoid 0-cost cards most of the time (10% chance) since they're harder to balance
    let randomMana;
    if (Math.random() < 0.1) {
        randomMana = 0;
    } else {
        randomMana = Math.floor(Math.random() * 8) + 1; // 1-8
    }

    // Zero-cost cards can only have 1 trait
    const maxTraits = randomMana === 0 ? 1 : 3;

    // Randomly decide how many traits (0-maxTraits)
    const numTraits = Math.floor(Math.random() * (maxTraits + 1));
    const selectedTraits = [];

    // Randomly select traits
    for (let i = 0; i < numTraits; i++) {
        // 50% chance positive, 50% negative
        const usePositive = Math.random() < 0.5;
        const traitPool = usePositive ? allPositiveTraits : allNegativeTraits;

        // Filter out already selected and conflicting traits
        const available = traitPool.filter(t => {
            if (selectedTraits.includes(t)) return false;
            // Check swift/slow conflict
            if (t === 'swift' && selectedTraits.includes('slow')) return false;
            if (t === 'slow' && selectedTraits.includes('swift')) return false;
            // Check taunt/stealth conflict
            if (t === 'taunt' && selectedTraits.includes('stealth')) return false;
            if (t === 'stealth' && selectedTraits.includes('taunt')) return false;
            // Check ranged/retaliate conflict
            if (t === 'ranged' && selectedTraits.includes('retaliate')) return false;
            if (t === 'retaliate' && selectedTraits.includes('ranged')) return false;
            return true;
        });

        if (available.length > 0) {
            const randomTrait = available[Math.floor(Math.random() * available.length)];
            selectedTraits.push(randomTrait);
        }
    }

    // Apply traits to current card
    currentCard.traits = selectedTraits;

    // Calculate trait costs
    let traitCost = 0;
    selectedTraits.forEach(traitId => {
        const trait = pointSystem.positiveTraits[traitId] || pointSystem.negativeTraits[traitId];
        if (trait) traitCost += trait.cost;
    });

    // Base values
    const baseAttack = pointSystem.baseStats.attack;
    const baseHealth = pointSystem.baseStats.health;
    const baseMana = pointSystem.baseStats.manaCost;

    // Stat costs
    const attackCost = pointSystem.statCosts.attack;
    const healthCost = pointSystem.statCosts.health;
    const manaCostValue = Math.abs(pointSystem.statCosts.manaCost);

    // Zero-cost penalty (5 extra points required for 0-cost cards)
    const zeroCostPenalty = randomMana === 0 ? 5 : 0;

    // Points we need to spend on stats (can be negative if traits give points)
    const statBudget = pointSystem.budget - traitCost - zeroCostPenalty;

    // Start with base stats but random mana
    let attack = baseAttack;
    let health = baseHealth;
    let mana = randomMana;
    // Calculate initial cost from mana difference
    let currentStatCost = (baseMana - mana) * manaCostValue;

    // Helper to calculate current stat cost (matches server-side tiered health)
    const calcStatCost = (a, h, m) => {
        let cost = (a - baseAttack) * attackCost;

        // Health scaling: 1-5 costs 1 pt each, 6+ costs 2 pts each
        if (h <= 5) {
            cost += (h - baseHealth) * healthCost;
        } else {
            const cheapHealth = Math.max(0, 5 - baseHealth);
            const expensiveHealth = h - 5;
            cost += cheapHealth * healthCost;
            cost += expensiveHealth * 2;
        }

        cost += (baseMana - m) * manaCostValue;
        return cost;
    };

    // Helper to get the cost of adding 1 health at current health level
    const getHealthAddCost = (h) => h >= 5 ? 2 : 1;
    // Helper to get the refund of removing 1 health at current health level
    const getHealthRemoveCost = (h) => h > 5 ? 2 : 1;

    // Randomly adjust stats while tracking cost
    // Try to reach exactly statBudget
    let maxIterations = 500;
    let iterations = 0;

    while (currentStatCost !== statBudget && iterations < maxIterations) {
        iterations++;
        const diff = statBudget - currentStatCost;
        const nextHealthCost = getHealthAddCost(health);

        if (diff > 0) {
            // Need to spend more points - increase attack/health or decrease mana
            const options = [];
            if (attack < 15 && diff >= attackCost) options.push('attack');
            if (health < 20 && diff >= nextHealthCost) options.push('health');
            if (mana > 0 && diff >= manaCostValue) options.push('mana');

            if (options.length === 0) {
                // Try to find ANY option that fits
                if (diff >= 1 && health < 5 && health < 20) {
                    health++;
                } else {
                    break;
                }
            } else {
                const choice = options[Math.floor(Math.random() * options.length)];
                if (choice === 'attack') {
                    attack++;
                } else if (choice === 'health') {
                    health++;
                } else if (choice === 'mana') {
                    mana--;
                }
            }
        } else if (diff < 0) {
            // Spent too much - decrease attack/health or increase mana
            const options = [];
            if (attack > 0) options.push('attack');
            if (health > 1) options.push('health');
            if (mana < 12) options.push('mana');

            if (options.length === 0) break;

            const choice = options[Math.floor(Math.random() * options.length)];
            if (choice === 'attack') {
                attack--;
            } else if (choice === 'health') {
                health--;
            } else if (choice === 'mana') {
                mana++;
            }
        }

        currentStatCost = calcStatCost(attack, health, mana);
    }

    // Final verification - if still not matching, try to fix deterministically
    currentStatCost = calcStatCost(attack, health, mana);
    let safetyCounter = 0;
    while (currentStatCost !== statBudget && safetyCounter < 100) {
        safetyCounter++;
        const diff = statBudget - currentStatCost;
        const nextHealthCost = getHealthAddCost(health);
        const prevHealthRefund = getHealthRemoveCost(health);

        if (diff > 0) {
            // Need to spend more - prefer options that match diff exactly or get close
            if (diff >= manaCostValue && mana > 0) {
                mana--;
            } else if (diff >= attackCost && attack < 15) {
                attack++;
            } else if (diff >= nextHealthCost && health < 20) {
                health++;
            } else if (diff >= 1 && health < 5 && health < 20) {
                // Cheap health when under 5
                health++;
            } else {
                // Can't spend remaining points - need to refund and retry
                if (attack > 0) {
                    attack--;
                } else if (health > 1) {
                    health--;
                } else {
                    break;
                }
            }
        } else if (diff < 0) {
            // Overspent - need to reduce
            if (mana < 12) {
                mana++;
            } else if (health > 1) {
                health--;
            } else if (attack > 0) {
                attack--;
            } else {
                break;
            }
        }
        currentStatCost = calcStatCost(attack, health, mana);
    }

    // Ultimate fallback - reset to a simple valid card
    if (calcStatCost(attack, health, mana) !== statBudget) {
        currentCard.traits = [];
        attack = baseAttack;
        health = baseHealth;
        mana = baseMana;
        // Spend full budget (10 pts) on attack: 10/2 = 5 extra attack
        const attackToAdd = Math.floor(pointSystem.budget / attackCost);
        attack = Math.min(15, baseAttack + attackToAdd);
    }

    // Apply stats
    currentCard.attack = attack;
    currentCard.health = health;
    currentCard.manaCost = mana;

    // Generate random name
    const prefixes = ['Shadow', 'Fire', 'Ice', 'Storm', 'Dark', 'Light', 'Wild', 'Iron', 'Golden', 'Silver', 'Ancient', 'Mystic', 'Brave', 'Swift', 'Mighty'];
    const suffixes = ['Knight', 'Mage', 'Beast', 'Dragon', 'Golem', 'Spirit', 'Warrior', 'Hunter', 'Guard', 'Slayer', 'Walker', 'Seeker', 'Bringer', 'Weaver', 'Dancer'];
    currentCard.name = prefixes[Math.floor(Math.random() * prefixes.length)] + ' ' + suffixes[Math.floor(Math.random() * suffixes.length)];

    // Update all UI elements
    const cardNameInput = document.getElementById('card-name');
    if (cardNameInput) cardNameInput.value = currentCard.name;

    const attackSlider = document.getElementById('attack-slider');
    const healthSlider = document.getElementById('health-slider');
    const manaSlider = document.getElementById('mana-slider');
    const attackValue = document.getElementById('attack-value');
    const healthValue = document.getElementById('health-value');
    const manaValue = document.getElementById('mana-value');
    const attackDisplay = document.getElementById('attack-display');
    const healthDisplay = document.getElementById('health-display');

    if (attackSlider) attackSlider.value = currentCard.attack;
    if (healthSlider) healthSlider.value = currentCard.health;
    if (manaSlider) manaSlider.value = currentCard.manaCost;
    if (attackValue) attackValue.textContent = currentCard.attack;
    if (healthValue) healthValue.textContent = currentCard.health;
    if (manaValue) manaValue.textContent = currentCard.manaCost;
    if (attackDisplay) attackDisplay.textContent = currentCard.attack;
    if (healthDisplay) healthDisplay.textContent = currentCard.health;

    // Select a random sprite
    loadSprites().then(() => {
        if (availableSprites.length > 0) {
            const randomSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
            currentCard.spriteId = randomSprite.id;
            updateSpriteDisplay();
            renderSpriteGrid();
        }
    });

    updateManaDisplay();
    renderActiveTraits();
    updatePointsDisplay();
}

function resetCard() {
    currentCard = {
        id: null,
        name: '',
        attack: 1,
        health: 1,
        manaCost: 2,
        traits: [],
        spriteId: null
    };

    // Reset UI
    const cardNameInput = document.getElementById('card-name');
    if (cardNameInput) cardNameInput.value = '';

    // Reset sliders
    const attackSlider = document.getElementById('attack-slider');
    const healthSlider = document.getElementById('health-slider');
    const manaSlider = document.getElementById('mana-slider');
    const attackValue = document.getElementById('attack-value');
    const healthValue = document.getElementById('health-value');
    const manaValue = document.getElementById('mana-value');
    const attackDisplay = document.getElementById('attack-display');
    const healthDisplay = document.getElementById('health-display');

    if (attackSlider) attackSlider.value = 1;
    if (healthSlider) healthSlider.value = 1;
    if (manaSlider) manaSlider.value = 2;
    if (attackValue) attackValue.textContent = 1;
    if (healthValue) healthValue.textContent = 1;
    if (manaValue) manaValue.textContent = 2;
    if (attackDisplay) attackDisplay.textContent = 1;
    if (healthDisplay) healthDisplay.textContent = 1;

    // Reset mana display
    const manaDisplay = document.getElementById('card-mana-display');
    if (manaDisplay) manaDisplay.textContent = '2';

    // Reset buttons
    const deleteBtn = document.getElementById('delete-card-btn');
    const saveBtn = document.getElementById('save-card-btn');
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (saveBtn) saveBtn.textContent = 'Save Card';

    renderActiveTraits();
    updatePointsDisplay();
    updateSpriteDisplay();
    loadSprites();
    hideError();

    // Deselect cards
    document.querySelectorAll('.card-mini.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

async function saveCard() {
    hideError();

    // Validate
    if (!currentCard.name || currentCard.name.trim() === '') {
        showError('Please enter a card name');
        return;
    }

    const cost = calculatePointCost();
    const remaining = pointSystem.budget - cost;

    if (remaining !== 0) {
        showError(`Must use exactly ${pointSystem.budget} points (${remaining > 0 ? remaining + ' remaining' : Math.abs(remaining) + ' over'})`);
        return;
    }

    try {
        let response;
        const cardData = {
            name: currentCard.name.trim(),
            attack: currentCard.attack,
            health: currentCard.health,
            manaCost: currentCard.manaCost,
            traits: currentCard.traits,
            spriteId: currentCard.spriteId
        };

        if (currentCard.id) {
            // Update existing
            response = await Auth.fetchWithAuth(`/api/cards/${currentCard.id}`, {
                method: 'PUT',
                body: JSON.stringify(cardData)
            });
        } else {
            // Create new
            response = await Auth.fetchWithAuth('/api/cards', {
                method: 'POST',
                body: JSON.stringify(cardData)
            });
        }

        const data = await response.json();

        if (!response.ok) {
            showError(data.error || 'Failed to save card');
            return;
        }

        // Reload cards and reset
        await loadMyCards();
        resetCard();

    } catch (error) {
        showError('Failed to save card: ' + error.message);
    }
}

async function deleteCard() {
    if (!currentCard.id) return;

    if (!confirm('Are you sure you want to delete this card?')) {
        return;
    }

    try {
        const response = await Auth.fetchWithAuth(`/api/cards/${currentCard.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            showError(data.error || 'Failed to delete card');
            return;
        }

        await loadMyCards();
        resetCard();

    } catch (error) {
        showError('Failed to delete card: ' + error.message);
    }
}

function editCard(card) {
    currentCard = {
        id: card.id,
        name: card.name,
        attack: card.attack,
        health: card.health,
        manaCost: card.manaCost,
        traits: [...card.traits],
        spriteId: card.spriteId || null
    };

    // Update UI
    const cardNameInput = document.getElementById('card-name');
    if (cardNameInput) cardNameInput.value = card.name;

    // Update sliders
    const attackSlider = document.getElementById('attack-slider');
    const healthSlider = document.getElementById('health-slider');
    const manaSlider = document.getElementById('mana-slider');
    const attackValue = document.getElementById('attack-value');
    const healthValue = document.getElementById('health-value');
    const manaValue = document.getElementById('mana-value');
    const attackDisplay = document.getElementById('attack-display');
    const healthDisplay = document.getElementById('health-display');

    if (attackSlider) attackSlider.value = card.attack;
    if (healthSlider) healthSlider.value = card.health;
    if (manaSlider) manaSlider.value = card.manaCost;
    if (attackValue) attackValue.textContent = card.attack;
    if (healthValue) healthValue.textContent = card.health;
    if (manaValue) manaValue.textContent = card.manaCost;
    if (attackDisplay) attackDisplay.textContent = card.attack;
    if (healthDisplay) healthDisplay.textContent = card.health;

    // Show delete button
    const deleteBtn = document.getElementById('delete-card-btn');
    if (deleteBtn) deleteBtn.style.display = 'block';

    // Update save button text
    const saveBtn = document.getElementById('save-card-btn');
    if (saveBtn) saveBtn.textContent = 'Update Card';

    updateManaDisplay();
    renderActiveTraits();
    updatePointsDisplay();
    loadSprites().then(() => {
        updateSpriteDisplay();
    });

    // Highlight selected card
    document.querySelectorAll('.card-mini.selected').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll(`[data-card-id="${card.id}"]`).forEach(el => {
        el.classList.add('selected');
    });
}

function renderMyCards() {
    const container = document.getElementById('my-cards');
    const countEl = document.getElementById('card-count');

    if (countEl) countEl.textContent = `${myCards.length} cards`;

    if (!container) return;

    if (myCards.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No cards yet. Create your first card!</p>';
        return;
    }

    container.innerHTML = '';

    myCards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'card-mini';
        el.dataset.cardId = card.id;

        let manaCost = card.manaCost;
        if (card.traits.includes('costly')) {
            manaCost += 2;
        }

        el.innerHTML = `
            <div class="card-mini-name">${card.name}</div>
            <div class="card-mini-stats">
                <span style="color: var(--mana-color);">${manaCost}</span>
                <span style="color: var(--attack-color);">${card.attack}</span>
                <span style="color: var(--health-color);">${card.health}</span>
            </div>
        `;

        el.addEventListener('click', () => editCard(card));

        // Card tooltip on hover
        attachCardTooltipEvents(el, card);

        container.appendChild(el);
    });
}

function showError(message) {
    const el = document.getElementById('card-error');
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideError() {
    const el = document.getElementById('card-error');
    if (el) {
        el.classList.add('hidden');
    }
}

// =====================
// CARD WIZARD
// =====================

// Wizard state
let wizardSelections = {
    role: null,
    playstyle: null,
    cost: null,
    risk: null
};

// Trait recommendations based on selections
const WIZARD_TRAIT_MAPPINGS = {
    role: {
        tank: {
            preferredTraits: ['taunt', 'armor', 'divine_shield', 'guardian', 'regenerate', 'thorns', 'retaliate'],
            statBias: { health: 0.7, attack: 0.2, mana: 0.1 },
            names: { prefixes: ['Iron', 'Stone', 'Guardian', 'Stalwart', 'Mighty'], suffixes: ['Guard', 'Defender', 'Bulwark', 'Shield', 'Sentinel'] }
        },
        damage: {
            preferredTraits: ['charge', 'piercing', 'frenzy', 'overpower', 'warcry', 'deathtouch'],
            statBias: { health: 0.2, attack: 0.7, mana: 0.1 },
            names: { prefixes: ['Brutal', 'Savage', 'Fierce', 'Deadly', 'Vicious'], suffixes: ['Slayer', 'Destroyer', 'Ravager', 'Berserker', 'Warrior'] }
        },
        support: {
            preferredTraits: ['inspire', 'rally', 'guardian', 'leech', 'regenerate'],
            statBias: { health: 0.4, attack: 0.3, mana: 0.3 },
            names: { prefixes: ['Mystic', 'Ancient', 'Wise', 'Holy', 'Blessed'], suffixes: ['Sage', 'Healer', 'Priest', 'Oracle', 'Mentor'] }
        },
        assassin: {
            preferredTraits: ['swift', 'stealth', 'deathtouch', 'elusive', 'charge', 'piercing'],
            statBias: { health: 0.15, attack: 0.75, mana: 0.1 },
            names: { prefixes: ['Shadow', 'Silent', 'Swift', 'Dark', 'Phantom'], suffixes: ['Assassin', 'Blade', 'Stalker', 'Reaper', 'Hunter'] }
        }
    },
    playstyle: {
        aggressive: {
            preferredTraits: ['swift', 'charge', 'frenzy', 'warcry', 'piercing'],
            negativeTraits: ['reckless', 'volatile', 'brittle'],
            statBias: { health: -0.1, attack: 0.15, mana: -0.05 }
        },
        defensive: {
            preferredTraits: ['taunt', 'armor', 'divine_shield', 'regenerate', 'thorns'],
            negativeTraits: ['slow', 'pacifist'],
            statBias: { health: 0.2, attack: -0.1, mana: 0.1 }
        },
        tricky: {
            preferredTraits: ['stealth', 'elusive', 'ranged', 'undying'],
            negativeTraits: ['cowardly', 'disloyal'],
            statBias: { health: 0, attack: 0.1, mana: 0 }
        },
        value: {
            preferredTraits: ['lifesteal', 'vampiric', 'regenerate', 'undying', 'leech'],
            negativeTraits: ['slow', 'cursed', 'draining'],
            statBias: { health: 0.1, attack: 0.05, mana: 0.1 }
        }
    },
    cost: {
        cheap: { manaRange: [0, 2], statMultiplier: 0.6 },
        medium: { manaRange: [3, 5], statMultiplier: 1.0 },
        expensive: { manaRange: [6, 10], statMultiplier: 1.4 }
    },
    risk: {
        safe: { negativeTraitCount: 0, bonusPoints: 0 },
        moderate: { negativeTraitCount: 1, bonusPoints: 2 },
        risky: { negativeTraitCount: 2, bonusPoints: 5 }
    }
};

function selectWizardOption(category, value, element) {
    // Deselect previous in same category
    const container = element.parentElement;
    container.querySelectorAll('.wizard-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // Select new option
    element.classList.add('selected');
    wizardSelections[category] = value;

    // Mark step as completed
    const step = element.closest('.wizard-step');
    if (step) {
        step.classList.add('completed');
    }

    // Update generate button state
    updateWizardGenerateButton();

    // Update summary
    updateWizardSummary();
}

function updateWizardGenerateButton() {
    const btn = document.getElementById('wizard-generate-btn');
    if (!btn) return;

    // Enable if at least role is selected (minimum requirement)
    const hasRole = wizardSelections.role !== null;
    btn.disabled = !hasRole;
}

function updateWizardSummary() {
    const summary = document.getElementById('wizard-summary');
    const content = document.getElementById('wizard-summary-content');
    if (!summary || !content) return;

    const selections = [];
    if (wizardSelections.role) selections.push(capitalize(wizardSelections.role));
    if (wizardSelections.playstyle) selections.push(capitalize(wizardSelections.playstyle));
    if (wizardSelections.cost) selections.push(capitalize(wizardSelections.cost) + ' cost');
    if (wizardSelections.risk) selections.push(capitalize(wizardSelections.risk) + ' risk');

    if (selections.length > 0) {
        summary.classList.remove('hidden');
        content.innerHTML = selections.map(s => `<span class="summary-tag">${s}</span>`).join('');
    } else {
        summary.classList.add('hidden');
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function resetWizard() {
    wizardSelections = { role: null, playstyle: null, cost: null, risk: null };

    // Clear all selections
    document.querySelectorAll('.wizard-option.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Clear completed states
    document.querySelectorAll('.wizard-step.completed').forEach(el => {
        el.classList.remove('completed');
    });

    // Disable generate button
    const btn = document.getElementById('wizard-generate-btn');
    if (btn) btn.disabled = true;

    // Hide summary
    const summary = document.getElementById('wizard-summary');
    if (summary) summary.classList.add('hidden');
}

function toggleWizard() {
    const panel = document.getElementById('panel-wizard');
    const toggleText = document.getElementById('wizard-toggle-text');
    if (!panel) return;

    panel.classList.toggle('collapsed');
    if (toggleText) {
        toggleText.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
    }
}

function generateFromWizard() {
    if (!pointSystem || !wizardSelections.role) return;

    // Reset card first
    resetCard();

    // Get mappings
    const roleData = WIZARD_TRAIT_MAPPINGS.role[wizardSelections.role];
    const playstyleData = wizardSelections.playstyle ? WIZARD_TRAIT_MAPPINGS.playstyle[wizardSelections.playstyle] : null;
    const costData = wizardSelections.cost ? WIZARD_TRAIT_MAPPINGS.cost[wizardSelections.cost] : WIZARD_TRAIT_MAPPINGS.cost.medium;
    const riskData = wizardSelections.risk ? WIZARD_TRAIT_MAPPINGS.risk[wizardSelections.risk] : WIZARD_TRAIT_MAPPINGS.risk.safe;

    // Collect preferred positive traits
    let preferredPositive = [...roleData.preferredTraits];
    if (playstyleData) {
        preferredPositive = [...new Set([...preferredPositive, ...playstyleData.preferredTraits])];
    }

    // Collect negative traits if risky
    let availableNegative = [];
    if (playstyleData && playstyleData.negativeTraits) {
        availableNegative = [...playstyleData.negativeTraits];
    }
    // Add all negative traits as options
    const allNegativeTraits = Object.keys(pointSystem.negativeTraits);

    // Select traits
    const selectedTraits = [];
    let traitPoints = 0;

    // Add negative traits first based on risk tolerance
    for (let i = 0; i < riskData.negativeTraitCount && selectedTraits.length < 3; i++) {
        // Prefer playstyle-aligned negative traits
        let negPool = availableNegative.length > 0 ? availableNegative : allNegativeTraits;
        negPool = negPool.filter(t => !selectedTraits.includes(t) && pointSystem.negativeTraits[t]);

        if (negPool.length > 0) {
            const trait = negPool[Math.floor(Math.random() * negPool.length)];
            selectedTraits.push(trait);
            traitPoints += pointSystem.negativeTraits[trait].cost; // Negative cost adds points
        }
    }

    // Add positive traits
    const maxPositive = 3 - selectedTraits.length;
    const shuffledPositive = preferredPositive
        .filter(t => pointSystem.positiveTraits[t] && !selectedTraits.includes(t))
        .sort(() => Math.random() - 0.5);

    for (let i = 0; i < maxPositive && i < shuffledPositive.length; i++) {
        const trait = shuffledPositive[i];
        const traitCost = pointSystem.positiveTraits[trait].cost;

        // Check if we can afford this trait
        if (traitPoints + traitCost <= pointSystem.budget + riskData.bonusPoints) {
            // Check for conflicts
            if (trait === 'swift' && selectedTraits.includes('slow')) continue;
            if (trait === 'slow' && selectedTraits.includes('swift')) continue;
            if (trait === 'taunt' && selectedTraits.includes('stealth')) continue;
            if (trait === 'stealth' && selectedTraits.includes('taunt')) continue;
            if (trait === 'ranged' && selectedTraits.includes('retaliate')) continue;
            if (trait === 'retaliate' && selectedTraits.includes('ranged')) continue;

            selectedTraits.push(trait);
            traitPoints += traitCost;
        }
    }

    currentCard.traits = selectedTraits;

    // Calculate remaining points for stats
    const statBudget = pointSystem.budget - traitPoints;

    // Determine mana cost based on preference
    const [minMana, maxMana] = costData.manaRange;
    currentCard.manaCost = Math.floor(Math.random() * (maxMana - minMana + 1)) + minMana;

    // Zero-cost cards have restrictions
    const isZeroCost = currentCard.manaCost === 0;
    const zeroCostPenalty = isZeroCost ? 5 : 0;

    // If zero-cost, limit to 1 trait max
    if (isZeroCost && selectedTraits.length > 1) {
        // Keep only the first trait
        const keptTrait = selectedTraits[0];
        selectedTraits.length = 0;
        selectedTraits.push(keptTrait);
        currentCard.traits = selectedTraits;
        // Recalculate trait points
        traitPoints = 0;
        selectedTraits.forEach(traitId => {
            const trait = pointSystem.positiveTraits[traitId] || pointSystem.negativeTraits[traitId];
            if (trait) traitPoints += trait.cost;
        });
    }

    // Calculate stat bias
    let healthBias = roleData.statBias.health;
    let attackBias = roleData.statBias.attack;

    if (playstyleData) {
        healthBias += playstyleData.statBias.health;
        attackBias += playstyleData.statBias.attack;
    }

    // Normalize biases
    const totalBias = healthBias + attackBias;
    healthBias = healthBias / totalBias;
    attackBias = attackBias / totalBias;

    // Base stats and costs
    const baseAttack = pointSystem.baseStats.attack;
    const baseHealth = pointSystem.baseStats.health;
    const baseMana = pointSystem.baseStats.manaCost;
    const attackCost = pointSystem.statCosts.attack;
    const manaCostValue = Math.abs(pointSystem.statCosts.manaCost);

    // Calculate mana cost adjustment
    const manaDiff = baseMana - currentCard.manaCost;
    const manaPointCost = manaDiff * manaCostValue;

    // Remaining points after mana and zero-cost penalty
    let remainingPoints = statBudget - manaPointCost - zeroCostPenalty;

    // Distribute between attack and health based on bias
    const attackPoints = Math.floor(remainingPoints * attackBias);
    const healthPoints = remainingPoints - attackPoints;

    // Calculate attack
    const attackIncrease = Math.floor(attackPoints / attackCost);
    currentCard.attack = Math.max(0, Math.min(15, baseAttack + attackIncrease));

    // Calculate health (accounting for tiered costs)
    let health = baseHealth;
    let healthPointsLeft = healthPoints;

    while (healthPointsLeft > 0 && health < 20) {
        const costForNext = health >= 5 ? 2 : 1;
        if (healthPointsLeft >= costForNext) {
            health++;
            healthPointsLeft -= costForNext;
        } else {
            break;
        }
    }
    currentCard.health = health;

    // Fine-tune to exactly use budget using the existing calcStatCost logic
    // Include zero-cost penalty dynamically based on current mana
    const calcTotalCost = (a, h, m) => {
        let cost = (a - baseAttack) * attackCost;
        if (h <= 5) {
            cost += (h - baseHealth) * 1;
        } else {
            cost += (5 - baseHealth) * 1 + (h - 5) * 2;
        }
        cost += (baseMana - m) * manaCostValue;
        // Add zero-cost penalty if mana is 0
        if (m === 0) cost += 5;
        return cost + traitPoints;
    };

    // Adjust to hit exact budget
    let currentCost = calcTotalCost(currentCard.attack, currentCard.health, currentCard.manaCost);
    let iterations = 0;

    while (currentCost !== pointSystem.budget && iterations < 50) {
        iterations++;
        const diff = pointSystem.budget - currentCost;

        if (diff > 0) {
            // Need to spend more
            if (diff >= 2 && currentCard.attack < 15) {
                currentCard.attack++;
            } else if (currentCard.health < 20) {
                const nextHealthCost = currentCard.health >= 5 ? 2 : 1;
                if (diff >= nextHealthCost) {
                    currentCard.health++;
                } else if (currentCard.attack < 15 && diff >= attackCost) {
                    currentCard.attack++;
                } else {
                    break;
                }
            } else {
                break;
            }
        } else {
            // Overspent
            if (currentCard.health > 1) {
                currentCard.health--;
            } else if (currentCard.attack > 0) {
                currentCard.attack--;
            } else if (currentCard.manaCost < 12) {
                currentCard.manaCost++;
            } else {
                break;
            }
        }
        currentCost = calcTotalCost(currentCard.attack, currentCard.health, currentCard.manaCost);
    }

    // Generate name based on role
    const names = roleData.names;
    const prefix = names.prefixes[Math.floor(Math.random() * names.prefixes.length)];
    const suffix = names.suffixes[Math.floor(Math.random() * names.suffixes.length)];
    currentCard.name = `${prefix} ${suffix}`;

    // Update all UI elements
    const cardNameInput = document.getElementById('card-name');
    if (cardNameInput) cardNameInput.value = currentCard.name;

    const attackSlider = document.getElementById('attack-slider');
    const healthSlider = document.getElementById('health-slider');
    const manaSlider = document.getElementById('mana-slider');
    const attackValue = document.getElementById('attack-value');
    const healthValue = document.getElementById('health-value');
    const manaValue = document.getElementById('mana-value');
    const attackDisplay = document.getElementById('attack-display');
    const healthDisplay = document.getElementById('health-display');

    if (attackSlider) attackSlider.value = currentCard.attack;
    if (healthSlider) healthSlider.value = currentCard.health;
    if (manaSlider) manaSlider.value = currentCard.manaCost;
    if (attackValue) attackValue.textContent = currentCard.attack;
    if (healthValue) healthValue.textContent = currentCard.health;
    if (manaValue) manaValue.textContent = currentCard.manaCost;
    if (attackDisplay) attackDisplay.textContent = currentCard.attack;
    if (healthDisplay) healthDisplay.textContent = currentCard.health;

    // Select a random sprite matching the traits
    loadSprites().then(() => {
        if (availableSprites.length > 0) {
            const randomSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
            currentCard.spriteId = randomSprite.id;
            updateSpriteDisplay();
            renderSpriteGrid();
        }
    });

    updateManaDisplay();
    renderActiveTraits();
    updatePointsDisplay();
}
