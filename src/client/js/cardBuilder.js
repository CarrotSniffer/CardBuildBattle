/**
 * Card Builder Module
 * Single responsive layout
 */

// Point system data (loaded from server)
let pointSystem = null;

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
    });

    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
    });

    // Click to add
    el.addEventListener('click', () => {
        addTrait(trait.id);
    });

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
            <span>${trait.name}</span>
            <button class="remove-trait" onclick="removeTrait('${traitId}')">&times;</button>
        `;
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

    // Randomly decide how many traits (0-3)
    const numTraits = Math.floor(Math.random() * 4);
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

    // Points we need to spend on stats (can be negative if traits give points)
    const statBudget = pointSystem.budget - traitCost;

    // Start with base stats (cost = 0)
    let attack = baseAttack;
    let health = baseHealth;
    let mana = baseMana;
    let currentStatCost = 0;

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
