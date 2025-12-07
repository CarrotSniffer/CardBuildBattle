/**
 * Deck Builder Module
 * Single responsive layout
 */

// User's cards
let myCards = [];

// User's decks
let myDecks = [];

// Current deck being edited
let currentDeck = {
    id: null,
    name: '',
    cardList: [] // Array of { cardId, count }
};

// Filter state
let filterState = {
    search: '',
    mana: '',
    attack: '',
    health: '',
    trait: '',
    inDeck: '',
    tag: '',
    sort: 'name'
};

// Card tags (stored locally, keyed by card id)
let cardTags = {};

// Replacement mode state
let replacementMode = {
    active: false,
    cardId: null,
    cardName: ''
};

// Deck Wizard state
let deckWizardSelections = {
    archetype: null,
    focus: null,
    risk: null,
    preferredTraits: []
};

// Negative traits list (for risk filtering)
const NEGATIVE_TRAITS = [
    'frail', 'slow', 'fragile', 'costly', 'exhausting', 'soulbound',
    'volatile', 'pacifist', 'cursed', 'clumsy', 'cowardly', 'reckless',
    'doomed', 'vengeful', 'exposed', 'draining', 'disloyal', 'brittle'
];

// Deck archetype configurations
const DECK_ARCHETYPE_CONFIG = {
    aggro: {
        name: 'Aggro',
        manaCurve: { 0: 3, 1: 5, 2: 7, 3: 5, 4: 3, 5: 2, '6+': 0 },
        avgManaTarget: 2.5,
        preferredTraits: ['swift', 'charge', 'frenzy', 'warcry', 'piercing'],
        statBias: 'attack'
    },
    midrange: {
        name: 'Midrange',
        manaCurve: { 0: 1, 1: 3, 2: 5, 3: 6, 4: 5, 5: 3, '6+': 2 },
        avgManaTarget: 3.5,
        preferredTraits: ['taunt', 'divine_shield', 'lifesteal', 'rally'],
        statBias: 'balanced'
    },
    control: {
        name: 'Control',
        manaCurve: { 0: 1, 1: 2, 2: 4, 3: 4, 4: 5, 5: 4, '6+': 5 },
        avgManaTarget: 4.5,
        preferredTraits: ['taunt', 'armor', 'regenerate', 'lifesteal', 'guardian', 'undying'],
        statBias: 'health'
    },
    combo: {
        name: 'Synergy',
        manaCurve: { 0: 2, 1: 4, 2: 5, 3: 5, 4: 4, 5: 3, '6+': 2 },
        avgManaTarget: 3.2,
        preferredTraits: ['inspire', 'rally', 'vampiric', 'thorns', 'retaliate'],
        statBias: 'traits'
    }
};

const DECK_FOCUS_CONFIG = {
    damage: {
        preferredTraits: ['charge', 'piercing', 'frenzy', 'deathtouch', 'overpower', 'warcry'],
        statWeight: { attack: 2, health: 0.5 }
    },
    survival: {
        preferredTraits: ['taunt', 'armor', 'divine_shield', 'regenerate', 'lifesteal', 'guardian', 'undying'],
        statWeight: { attack: 0.5, health: 2 }
    },
    tempo: {
        preferredTraits: ['swift', 'charge', 'ranged', 'stealth', 'elusive'],
        statWeight: { attack: 1.5, health: 0.8 }
    },
    value: {
        preferredTraits: ['lifesteal', 'vampiric', 'undying', 'inspire', 'rally', 'leech'],
        statWeight: { attack: 1, health: 1.2 }
    }
};

// Point system data (loaded from server for tooltips)
let pointSystem = null;

// Tooltip system
let deckTooltipElement = null;
let deckTooltipTimeout = null;

// Initialize tooltip on page load
function initDeckTooltip() {
    deckTooltipElement = document.createElement('div');
    deckTooltipElement.className = 'builder-tooltip';
    document.body.appendChild(deckTooltipElement);
}

// Load point system for trait info
async function loadPointSystem() {
    try {
        const response = await Auth.fetchWithAuth('/api/point-system');
        const data = await response.json();
        pointSystem = data;
    } catch (error) {
        console.error('Failed to load point system:', error);
    }
}

// Show card tooltip
function showCardTooltip(card, x, y) {
    if (!deckTooltipElement || !pointSystem) return;

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
            const isPositive = pointSystem.positiveTraits && !!pointSystem.positiveTraits[traitId];
            const trait = (pointSystem.positiveTraits && pointSystem.positiveTraits[traitId]) ||
                         (pointSystem.negativeTraits && pointSystem.negativeTraits[traitId]);
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

    deckTooltipElement.innerHTML = html;
    deckTooltipElement.classList.add('visible');

    positionTooltip(x, y);
}

// Position tooltip intelligently
function positionTooltip(x, y) {
    if (!deckTooltipElement) return;

    requestAnimationFrame(() => {
        const tooltipRect = deckTooltipElement.getBoundingClientRect();
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

        deckTooltipElement.style.left = `${left}px`;
        deckTooltipElement.style.top = `${top}px`;
    });
}

// Hide tooltip
function hideDeckTooltip() {
    if (deckTooltipTimeout) {
        clearTimeout(deckTooltipTimeout);
        deckTooltipTimeout = null;
    }
    if (deckTooltipElement) {
        deckTooltipElement.classList.remove('visible');
    }
}

// Attach tooltip events to a card element
function attachCardTooltipEvents(element, card) {
    element.addEventListener('mouseenter', (e) => {
        deckTooltipTimeout = setTimeout(() => {
            showCardTooltip(card, e.clientX, e.clientY);
        }, 300);
    });

    element.addEventListener('mousemove', (e) => {
        if (deckTooltipElement && deckTooltipElement.classList.contains('visible')) {
            positionTooltip(e.clientX, e.clientY);
        }
    });

    element.addEventListener('mouseleave', hideDeckTooltip);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    if (!Auth.requireAuth()) return;

    // Display username
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = Auth.user.username;

    // Initialize tooltip system
    initDeckTooltip();

    // Load card tags from localStorage
    loadCardTags();

    // Load data
    await Promise.all([
        loadMyCards(),
        loadMyDecks(),
        loadPointSystem()
    ]);

    // Setup event listeners
    setupEventListeners();

    // Setup filter event listeners
    setupFilterListeners();

    // Populate filter dropdowns
    populateFilterDropdowns();

    // Initialize deck wizard
    initDeckWizard();
});

async function loadMyCards() {
    try {
        const response = await Auth.fetchWithAuth('/api/cards');
        const data = await response.json();
        myCards = data.cards || [];
        renderCardCollection();
    } catch (error) {
        console.error('Failed to load cards:', error);
    }
}

async function loadMyDecks() {
    try {
        const response = await Auth.fetchWithAuth('/api/decks');
        const data = await response.json();
        myDecks = data.decks || [];
        renderSavedDecks();
    } catch (error) {
        console.error('Failed to load decks:', error);
    }
}

function setupEventListeners() {
    const deckNameInput = document.getElementById('deck-name');
    if (deckNameInput) {
        deckNameInput.addEventListener('input', (e) => {
            currentDeck.name = e.target.value;
        });
    }
}

function renderCardCollection() {
    const container = document.getElementById('card-collection');
    const countEl = document.getElementById('collection-count');

    if (countEl) countEl.textContent = `${myCards.length} cards`;

    if (!container) return;

    if (myCards.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 1rem;">
                No cards yet. <a href="/card-builder.html" style="color: var(--primary-color);">Create some cards</a> first!
            </p>
        `;
        return;
    }

    container.innerHTML = '';

    myCards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'card-mini';
        el.dataset.cardId = card.id;

        // Check how many are in deck
        const inDeck = getCardCountInDeck(card.id);
        if (inDeck >= 3) {
            el.style.opacity = '0.5';
        }

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
            ${inDeck > 0 ? `<div style="text-align: center; font-size: 0.7rem; color: var(--success-color);">x${inDeck} in deck</div>` : ''}
        `;

        el.addEventListener('click', () => {
            addCardToDeck(card.id);
        });

        // Add tooltip on hover
        attachCardTooltipEvents(el, card);

        container.appendChild(el);
    });
}

function getCardCountInDeck(cardId) {
    const entry = currentDeck.cardList.find(c => c.cardId === cardId);
    return entry ? entry.count : 0;
}

function getTotalCardsInDeck() {
    return currentDeck.cardList.reduce((sum, c) => sum + c.count, 0);
}

function addCardToDeck(cardId) {
    const currentCount = getCardCountInDeck(cardId);

    // Check max copies
    if (currentCount >= 3) {
        showValidation('Maximum 3 copies of each card');
        return;
    }

    // Check deck size (25 custom cards, 7 lands added automatically)
    if (getTotalCardsInDeck() >= 25) {
        showValidation('Deck is full (25 custom cards max)');
        return;
    }

    // Add or increment
    const existing = currentDeck.cardList.find(c => c.cardId === cardId);
    if (existing) {
        existing.count++;
    } else {
        currentDeck.cardList.push({ cardId, count: 1 });
    }

    renderDeckCards();
    renderCardCollection(); // Update opacity
    updateDeckStats();
    hideValidation();
}

function removeCardFromDeck(cardId) {
    const existing = currentDeck.cardList.find(c => c.cardId === cardId);
    if (existing) {
        existing.count--;
        if (existing.count <= 0) {
            currentDeck.cardList = currentDeck.cardList.filter(c => c.cardId !== cardId);
        }
    }

    renderDeckCards();
    renderCardCollection();
    updateDeckStats();
}

function renderDeckCards() {
    const container = document.getElementById('deck-cards');
    if (!container) return;

    if (currentDeck.cardList.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Click cards to add them</p>';
        return;
    }

    container.innerHTML = '';

    // Sort by mana cost
    const sortedCards = currentDeck.cardList
        .map(entry => {
            const card = myCards.find(c => c.id === entry.cardId);
            return { ...entry, card };
        })
        .filter(entry => entry.card)
        .sort((a, b) => {
            const aMana = a.card.manaCost + (a.card.traits.includes('costly') ? 2 : 0);
            const bMana = b.card.manaCost + (b.card.traits.includes('costly') ? 2 : 0);
            return aMana - bMana;
        });

    sortedCards.forEach(({ cardId, count, card }) => {
        let manaCost = card.manaCost;
        if (card.traits.includes('costly')) {
            manaCost += 2;
        }

        const el = document.createElement('div');
        el.className = 'deck-card-item';
        el.innerHTML = `
            <div class="card-info" style="cursor: pointer;" title="Click to find replacements">
                <span style="color: var(--mana-color); margin-right: 0.5rem;">${manaCost}</span>
                <span>${card.name}</span>
                <span class="replace-icon" style="margin-left: auto; opacity: 0.5; font-size: 0.8rem;">🔄</span>
            </div>
            <div class="card-count">
                <button class="count-btn" onclick="event.stopPropagation(); removeCardFromDeck('${cardId}')">-</button>
                <span>${count}</span>
                <button class="count-btn" onclick="event.stopPropagation(); addCardToDeck('${cardId}')">+</button>
            </div>
        `;

        // Click on card info to enter replacement mode
        const cardInfoEl = el.querySelector('.card-info');
        cardInfoEl.addEventListener('click', () => {
            enterReplacementMode(cardId);
        });

        // Add tooltip on hover (only on card-info part, not buttons)
        attachCardTooltipEvents(cardInfoEl, card);

        container.appendChild(el);
    });
}

function updateDeckStats() {
    const total = getTotalCardsInDeck();
    const unique = currentDeck.cardList.length;

    // Calculate average mana
    let totalMana = 0;
    currentDeck.cardList.forEach(entry => {
        const card = myCards.find(c => c.id === entry.cardId);
        if (card) {
            let mana = card.manaCost;
            if (card.traits.includes('costly')) mana += 2;
            totalMana += mana * entry.count;
        }
    });
    const avgMana = total > 0 ? (totalMana / total).toFixed(1) : '0';

    // Update stats
    const countEl = document.getElementById('deck-card-count');
    const uniqueEl = document.getElementById('deck-unique-count');
    const avgEl = document.getElementById('deck-avg-mana');

    if (countEl) {
        countEl.textContent = total;
        countEl.style.color = total === 25 ? 'var(--success-color)' : total > 25 ? 'var(--accent-color)' : 'var(--text-primary)';
    }
    if (uniqueEl) uniqueEl.textContent = unique;
    if (avgEl) avgEl.textContent = avgMana;

    // Update balance pentagon chart
    updateDeckBalanceChart();
}

function validateDeck() {
    const errors = [];
    const total = getTotalCardsInDeck();
    const unique = currentDeck.cardList.length;

    if (!currentDeck.name || currentDeck.name.trim() === '') {
        errors.push('Deck needs a name');
    }

    if (total !== 25) {
        errors.push(`Need exactly 25 cards (have ${total})`);
    }

    if (unique < 5) {
        errors.push(`Need at least 5 unique cards (have ${unique})`);
    }

    // Check max copies
    const overLimit = currentDeck.cardList.find(c => c.count > 3);
    if (overLimit) {
        errors.push('Max 3 copies of each card');
    }

    return errors;
}

function newDeck() {
    currentDeck = {
        id: null,
        name: '',
        cardList: []
    };

    // Reset UI
    const deckNameInput = document.getElementById('deck-name');
    const deleteBtn = document.getElementById('delete-deck-btn');
    const saveBtn = document.getElementById('save-deck-btn');

    if (deckNameInput) deckNameInput.value = '';
    if (deleteBtn) deleteBtn.style.display = 'none';
    if (saveBtn) saveBtn.textContent = 'Save Deck';

    renderDeckCards();
    renderCardCollection();
    updateDeckStats();
    hideValidation();

    // Deselect in saved decks
    document.querySelectorAll('.deck-card-item.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

async function saveDeck() {
    hideValidation();

    const errors = validateDeck();
    if (errors.length > 0) {
        showValidation(errors.join('. '));
        return;
    }

    try {
        const deckData = {
            name: currentDeck.name.trim(),
            cardList: currentDeck.cardList
        };

        let response;
        if (currentDeck.id) {
            response = await Auth.fetchWithAuth(`/api/decks/${currentDeck.id}`, {
                method: 'PUT',
                body: JSON.stringify(deckData)
            });
        } else {
            response = await Auth.fetchWithAuth('/api/decks', {
                method: 'POST',
                body: JSON.stringify(deckData)
            });
        }

        const data = await response.json();

        if (!response.ok) {
            showValidation(data.error || 'Failed to save deck');
            return;
        }

        await loadMyDecks();
        newDeck();

    } catch (error) {
        showValidation('Failed to save deck: ' + error.message);
    }
}

async function deleteDeck() {
    if (!currentDeck.id) return;

    if (!confirm('Are you sure you want to delete this deck?')) {
        return;
    }

    try {
        const response = await Auth.fetchWithAuth(`/api/decks/${currentDeck.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const data = await response.json();
            showValidation(data.error || 'Failed to delete deck');
            return;
        }

        await loadMyDecks();
        newDeck();

    } catch (error) {
        showValidation('Failed to delete deck: ' + error.message);
    }
}

function loadDeck(deck) {
    currentDeck = {
        id: deck.id,
        name: deck.name,
        cardList: [...deck.cardList]
    };

    // Update UI
    const deckNameInput = document.getElementById('deck-name');
    const deleteBtn = document.getElementById('delete-deck-btn');
    const saveBtn = document.getElementById('save-deck-btn');

    if (deckNameInput) deckNameInput.value = deck.name;
    if (deleteBtn) deleteBtn.style.display = 'block';
    if (saveBtn) saveBtn.textContent = 'Update Deck';

    renderDeckCards();
    renderCardCollection();
    updateDeckStats();
    hideValidation();

    // Highlight in saved decks
    document.querySelectorAll('.deck-card-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.deckId === deck.id);
    });
}

function renderSavedDecks() {
    const container = document.getElementById('saved-decks');
    if (!container) return;

    if (myDecks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.85rem;">No saved decks</p>';
        return;
    }

    container.innerHTML = '';

    myDecks.forEach(deck => {
        const total = deck.cardList.reduce((sum, c) => sum + c.count, 0);

        const el = document.createElement('div');
        el.className = 'deck-card-item';
        el.dataset.deckId = deck.id;
        el.style.cursor = 'pointer';

        el.innerHTML = `
            <div class="card-info">
                <span>${deck.name}</span>
                <span style="color: var(--text-secondary); font-size: 0.8rem; margin-left: 0.5rem;">(${total} cards)</span>
            </div>
        `;

        el.addEventListener('click', () => loadDeck(deck));
        container.appendChild(el);
    });
}

function showValidation(message) {
    const el = document.getElementById('deck-validation');
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideValidation() {
    const el = document.getElementById('deck-validation');
    if (el) {
        el.classList.add('hidden');
    }
}

// =====================
// DECK WIZARD
// =====================

function initDeckWizard() {
    updateDeckWizardWarning();
    renderTraitCheckboxes();
    updateDeckWizardAnalysis();
}

function updateDeckWizardWarning() {
    const warning = document.getElementById('wizard-card-warning');
    if (!warning) return;

    if (myCards.length < 9) {
        warning.classList.remove('hidden');
        warning.querySelector('.warning-text').textContent =
            `You need at least 9 cards to build a deck (each card can be used up to 3 times). You have ${myCards.length}. Create more cards first!`;
    } else {
        warning.classList.add('hidden');
    }
}

function renderTraitCheckboxes() {
    const container = document.getElementById('deck-wizard-traits');
    if (!container) return;

    // Count traits across all cards
    const traitCounts = {};
    myCards.forEach(card => {
        card.traits.forEach(trait => {
            if (!NEGATIVE_TRAITS.includes(trait)) {
                traitCounts[trait] = (traitCounts[trait] || 0) + 1;
            }
        });
    });

    // Sort by count
    const sortedTraits = Object.entries(traitCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12); // Limit to top 12 traits

    if (sortedTraits.length === 0) {
        container.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.8rem;">No traits available in your cards</span>';
        return;
    }

    container.innerHTML = '';

    sortedTraits.forEach(([trait, count]) => {
        const label = document.createElement('label');
        label.className = 'trait-checkbox';
        label.dataset.trait = trait;

        const isSelected = deckWizardSelections.preferredTraits.includes(trait);
        if (isSelected) label.classList.add('selected');

        label.innerHTML = `
            <span class="checkbox-indicator"></span>
            <span class="trait-name">${formatTraitName(trait)}</span>
            <span class="trait-count">(${count})</span>
        `;

        label.addEventListener('click', () => toggleTraitPreference(trait, label));
        container.appendChild(label);
    });
}

function formatTraitName(trait) {
    return trait.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function toggleTraitPreference(trait, element) {
    const idx = deckWizardSelections.preferredTraits.indexOf(trait);
    if (idx >= 0) {
        deckWizardSelections.preferredTraits.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        if (deckWizardSelections.preferredTraits.length < 5) {
            deckWizardSelections.preferredTraits.push(trait);
            element.classList.add('selected');
        }
    }
    updateDeckWizardSummary();
}

function selectDeckWizardOption(category, value, element) {
    // Deselect previous in same category
    const container = element.parentElement;
    container.querySelectorAll('.wizard-option').forEach(opt => {
        opt.classList.remove('selected');
    });

    // Select new option
    element.classList.add('selected');
    deckWizardSelections[category] = value;

    // Mark step as completed
    const step = element.closest('.wizard-step');
    if (step) {
        step.classList.add('completed');
    }

    // Update generate button state
    updateDeckWizardGenerateButton();

    // Update summary and analysis
    updateDeckWizardSummary();
    updateDeckWizardAnalysis();
}

function updateDeckWizardGenerateButton() {
    const btn = document.getElementById('deck-wizard-generate-btn');
    if (!btn) return;

    // Enable if archetype is selected and we have enough cards
    const hasArchetype = deckWizardSelections.archetype !== null;
    const hasEnoughCards = myCards.length >= 9;
    btn.disabled = !hasArchetype || !hasEnoughCards;
}

function updateDeckWizardSummary() {
    const summary = document.getElementById('deck-wizard-summary');
    const content = document.getElementById('deck-wizard-summary-content');
    if (!summary || !content) return;

    const selections = [];
    if (deckWizardSelections.archetype) {
        selections.push(capitalize(deckWizardSelections.archetype));
    }
    if (deckWizardSelections.focus) {
        selections.push(capitalize(deckWizardSelections.focus) + ' focus');
    }
    if (deckWizardSelections.risk) {
        selections.push(capitalize(deckWizardSelections.risk) + ' risk');
    }
    if (deckWizardSelections.preferredTraits.length > 0) {
        selections.push(`${deckWizardSelections.preferredTraits.length} traits`);
    }

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

function updateDeckWizardAnalysis() {
    const analysis = document.getElementById('deck-wizard-analysis');
    const content = document.getElementById('deck-wizard-analysis-content');
    if (!analysis || !content || myCards.length === 0) {
        if (analysis) analysis.classList.add('hidden');
        return;
    }

    // Analyze card pool
    const manaCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };
    let totalAttack = 0;
    let totalHealth = 0;

    myCards.forEach(card => {
        let mana = card.manaCost;
        if (card.traits.includes('costly')) mana += 2;

        if (mana >= 6) {
            manaCounts['6+']++;
        } else {
            manaCounts[mana]++;
        }

        totalAttack += card.attack;
        totalHealth += card.health;
    });

    const avgAttack = (totalAttack / myCards.length).toFixed(1);
    const avgHealth = (totalHealth / myCards.length).toFixed(1);

    // Build mana curve visualization
    const maxCount = Math.max(...Object.values(manaCounts), 1);

    let html = `
        <div class="analysis-stats">
            <div class="analysis-stat">
                <div class="analysis-stat-value">${myCards.length}</div>
                <div class="analysis-stat-label">Total Cards</div>
            </div>
            <div class="analysis-stat">
                <div class="analysis-stat-value" style="color: var(--attack-color);">${avgAttack}</div>
                <div class="analysis-stat-label">Avg Attack</div>
            </div>
            <div class="analysis-stat">
                <div class="analysis-stat-value" style="color: var(--health-color);">${avgHealth}</div>
                <div class="analysis-stat-label">Avg Health</div>
            </div>
            <div class="analysis-stat">
                <div class="analysis-stat-value" style="color: var(--mana-color);">${getAvgMana().toFixed(1)}</div>
                <div class="analysis-stat-label">Avg Mana</div>
            </div>
        </div>
        <div class="mana-curve">
    `;

    Object.entries(manaCounts).forEach(([cost, count]) => {
        const height = (count / maxCount) * 100;
        html += `
            <div class="mana-bar" style="height: ${Math.max(height, 5)}%;">
                <span class="mana-bar-label">${cost}</span>
                ${count > 0 ? `<span class="mana-bar-count">${count}</span>` : ''}
            </div>
        `;
    });

    html += '</div>';

    content.innerHTML = html;
    analysis.classList.remove('hidden');
}

function getAvgMana() {
    if (myCards.length === 0) return 0;

    let total = 0;
    myCards.forEach(card => {
        let mana = card.manaCost;
        if (card.traits.includes('costly')) mana += 2;
        total += mana;
    });
    return total / myCards.length;
}

function toggleDeckWizard() {
    const panel = document.getElementById('panel-deck-wizard');
    const toggleText = document.getElementById('deck-wizard-toggle-text');
    if (!panel) return;

    panel.classList.toggle('collapsed');
    if (toggleText) {
        toggleText.textContent = panel.classList.contains('collapsed') ? 'Show' : 'Hide';
    }
}

function resetDeckWizard() {
    deckWizardSelections = {
        archetype: null,
        focus: null,
        risk: null,
        preferredTraits: []
    };

    // Clear all selections
    document.querySelectorAll('#panel-deck-wizard .wizard-option.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Clear completed states
    document.querySelectorAll('#panel-deck-wizard .wizard-step.completed').forEach(el => {
        el.classList.remove('completed');
    });

    // Clear trait selections
    document.querySelectorAll('.trait-checkbox.selected').forEach(el => {
        el.classList.remove('selected');
    });

    // Disable generate button
    const btn = document.getElementById('deck-wizard-generate-btn');
    if (btn) btn.disabled = true;

    // Hide summary
    const summary = document.getElementById('deck-wizard-summary');
    if (summary) summary.classList.add('hidden');
}

function generateDeckFromWizard() {
    if (!deckWizardSelections.archetype || myCards.length < 9) return;

    // Reset current deck
    newDeck();

    // Get configurations
    const archetypeConfig = DECK_ARCHETYPE_CONFIG[deckWizardSelections.archetype];
    const focusConfig = deckWizardSelections.focus ? DECK_FOCUS_CONFIG[deckWizardSelections.focus] : null;

    // Score all cards
    const scoredCards = myCards.map(card => {
        let score = 0;

        // Get effective mana cost
        let mana = card.manaCost;
        if (card.traits.includes('costly')) mana += 2;

        // Check if card passes risk filter
        const hasNegativeTrait = card.traits.some(t => NEGATIVE_TRAITS.includes(t));
        if (deckWizardSelections.risk === 'safe' && hasNegativeTrait) {
            score -= 100; // Heavy penalty for risky cards when safe is selected
        } else if (deckWizardSelections.risk === 'risky' && hasNegativeTrait) {
            score += 5; // Bonus for risky cards
        }

        // Archetype trait matching
        const archetypeTraitMatch = card.traits.filter(t =>
            archetypeConfig.preferredTraits.includes(t)
        ).length;
        score += archetypeTraitMatch * 10;

        // Focus trait matching
        if (focusConfig) {
            const focusTraitMatch = card.traits.filter(t =>
                focusConfig.preferredTraits.includes(t)
            ).length;
            score += focusTraitMatch * 8;

            // Stat weighting
            score += card.attack * focusConfig.statWeight.attack;
            score += card.health * focusConfig.statWeight.health;
        } else {
            // Default balanced scoring
            score += card.attack + card.health;
        }

        // User preferred traits
        const userTraitMatch = card.traits.filter(t =>
            deckWizardSelections.preferredTraits.includes(t)
        ).length;
        score += userTraitMatch * 15;

        // Mana curve fit bonus
        const targetAtMana = archetypeConfig.manaCurve[mana >= 6 ? '6+' : mana] || 0;
        if (targetAtMana > 0) {
            score += 5;
        }

        // Stat bias based on archetype
        if (archetypeConfig.statBias === 'attack') {
            score += card.attack * 1.5;
        } else if (archetypeConfig.statBias === 'health') {
            score += card.health * 1.5;
        } else if (archetypeConfig.statBias === 'traits') {
            score += card.traits.length * 5;
        }

        return { card, score, mana };
    });

    // Sort by score (highest first)
    scoredCards.sort((a, b) => b.score - a.score);

    // Build deck following mana curve target
    const deckCards = [];
    const usedCounts = {}; // cardId -> count
    const manaCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };

    // Helper to get mana bucket
    const getManaBucket = (mana) => mana >= 6 ? '6+' : mana;

    // First pass: Fill according to mana curve
    for (const { card, mana } of scoredCards) {
        if (deckCards.length >= 25) break;

        const bucket = getManaBucket(mana);
        const targetForBucket = archetypeConfig.manaCurve[bucket] || 0;
        const currentInBucket = manaCounts[bucket];
        const currentCardCount = usedCounts[card.id] || 0;

        // Add up to 3 copies, respecting mana curve
        let copiesToAdd = 0;
        if (currentInBucket < targetForBucket && currentCardCount < 3) {
            copiesToAdd = Math.min(
                3 - currentCardCount,
                targetForBucket - currentInBucket,
                25 - deckCards.length
            );
        }

        if (copiesToAdd > 0) {
            for (let i = 0; i < copiesToAdd; i++) {
                deckCards.push(card.id);
                manaCounts[bucket]++;
            }
            usedCounts[card.id] = (usedCounts[card.id] || 0) + copiesToAdd;
        }
    }

    // Second pass: Fill remaining slots with best scored cards
    for (const { card, mana } of scoredCards) {
        if (deckCards.length >= 25) break;

        const currentCardCount = usedCounts[card.id] || 0;
        if (currentCardCount < 3) {
            const copiesToAdd = Math.min(3 - currentCardCount, 25 - deckCards.length);
            for (let i = 0; i < copiesToAdd; i++) {
                deckCards.push(card.id);
                manaCounts[getManaBucket(mana)]++;
            }
            usedCounts[card.id] = (usedCounts[card.id] || 0) + copiesToAdd;
        }
    }

    // Apply to current deck
    const cardListMap = {};
    deckCards.forEach(cardId => {
        cardListMap[cardId] = (cardListMap[cardId] || 0) + 1;
    });

    currentDeck.cardList = Object.entries(cardListMap).map(([cardId, count]) => ({
        cardId,
        count
    }));

    // Generate deck name
    const archName = capitalize(deckWizardSelections.archetype);
    const focusName = deckWizardSelections.focus ? capitalize(deckWizardSelections.focus) : '';
    currentDeck.name = focusName ? `${archName} ${focusName}` : `${archName} Deck`;

    // Update UI
    const deckNameInput = document.getElementById('deck-name');
    if (deckNameInput) deckNameInput.value = currentDeck.name;

    renderDeckCards();
    renderCardCollection();
    updateDeckStats();
    hideValidation();

    // Scroll to deck panel on mobile
    const deckPanel = document.getElementById('panel-deck');
    if (deckPanel && window.innerWidth < 1024) {
        deckPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

// =====================
// FILTERING SYSTEM
// =====================

function toggleFilters() {
    const panel = document.getElementById('filter-panel');
    const btn = document.getElementById('toggle-filters-btn');
    if (panel) {
        panel.classList.toggle('hidden');
        if (btn) {
            btn.textContent = panel.classList.contains('hidden') ? 'Filters' : 'Hide Filters';
        }
    }
}

function setupFilterListeners() {
    // Search input
    const searchInput = document.getElementById('filter-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterState.search = e.target.value.toLowerCase();
            applyFilters();
        });
    }

    // Stat filters
    ['mana', 'attack', 'health'].forEach(stat => {
        const select = document.getElementById(`filter-${stat}`);
        if (select) {
            select.addEventListener('change', (e) => {
                filterState[stat] = e.target.value;
                applyFilters();
            });
        }
    });

    // Trait filter
    const traitSelect = document.getElementById('filter-trait');
    if (traitSelect) {
        traitSelect.addEventListener('change', (e) => {
            filterState.trait = e.target.value;
            applyFilters();
        });
    }

    // In deck filter
    const inDeckSelect = document.getElementById('filter-in-deck');
    if (inDeckSelect) {
        inDeckSelect.addEventListener('change', (e) => {
            filterState.inDeck = e.target.value;
            applyFilters();
        });
    }

    // Tag filter
    const tagSelect = document.getElementById('filter-tag');
    if (tagSelect) {
        tagSelect.addEventListener('change', (e) => {
            filterState.tag = e.target.value;
            applyFilters();
        });
    }

    // Sort filter
    const sortSelect = document.getElementById('filter-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            filterState.sort = e.target.value;
            applyFilters();
        });
    }
}

function populateFilterDropdowns() {
    populateTraitFilter();
    populateTagFilter();
}

function populateTraitFilter() {
    const traitSelect = document.getElementById('filter-trait');
    if (!traitSelect || !pointSystem) return;

    // Clear existing options (except "Any trait")
    traitSelect.innerHTML = '<option value="">Any trait</option>';

    // Get all traits from point system
    const allTraits = [];

    if (pointSystem.positiveTraits) {
        Object.entries(pointSystem.positiveTraits).forEach(([id, trait]) => {
            allTraits.push({ id, name: trait.name, positive: true });
        });
    }

    if (pointSystem.negativeTraits) {
        Object.entries(pointSystem.negativeTraits).forEach(([id, trait]) => {
            allTraits.push({ id, name: trait.name, positive: false });
        });
    }

    // Sort alphabetically
    allTraits.sort((a, b) => a.name.localeCompare(b.name));

    // Add options
    allTraits.forEach(trait => {
        const option = document.createElement('option');
        option.value = trait.id;
        option.textContent = `${trait.name} ${trait.positive ? '(+)' : '(-)'}`;
        traitSelect.appendChild(option);
    });
}

function populateTagFilter() {
    const tagSelect = document.getElementById('filter-tag');
    if (!tagSelect) return;

    // Clear existing options (except "Any tag")
    tagSelect.innerHTML = '<option value="">Any tag</option>';

    // Get all unique tags from cardTags
    const allTags = new Set();
    Object.values(cardTags).forEach(tags => {
        tags.forEach(tag => allTags.add(tag));
    });

    // Sort alphabetically and add options
    Array.from(allTags).sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
    });
}

function applyFilters() {
    const container = document.getElementById('card-collection');
    const countEl = document.getElementById('collection-count');

    if (!container) return;

    // Filter cards
    let filteredCards = myCards.filter(card => {
        // Search filter
        if (filterState.search && !card.name.toLowerCase().includes(filterState.search)) {
            return false;
        }

        // Get effective mana cost
        let manaCost = card.manaCost;
        if (card.traits.includes('costly')) manaCost += 2;

        // Mana filter
        if (filterState.mana) {
            if (filterState.mana === '6+') {
                if (manaCost < 6) return false;
            } else {
                if (manaCost !== parseInt(filterState.mana)) return false;
            }
        }

        // Attack filter
        if (filterState.attack) {
            const [min, max] = filterState.attack.split('-').map(v => v === '+' ? Infinity : parseInt(v.replace('+', '')));
            if (filterState.attack.includes('+')) {
                if (card.attack < parseInt(filterState.attack)) return false;
            } else if (max !== undefined) {
                if (card.attack < min || card.attack > max) return false;
            }
        }

        // Health filter
        if (filterState.health) {
            const [min, max] = filterState.health.split('-').map(v => v === '+' ? Infinity : parseInt(v.replace('+', '')));
            if (filterState.health.includes('+')) {
                if (card.health < parseInt(filterState.health)) return false;
            } else if (max !== undefined) {
                if (card.health < min || card.health > max) return false;
            }
        }

        // Trait filter
        if (filterState.trait && !card.traits.includes(filterState.trait)) {
            return false;
        }

        // In deck filter
        const inDeckCount = getCardCountInDeck(card.id);
        if (filterState.inDeck === 'not-in-deck' && inDeckCount > 0) {
            return false;
        }
        if (filterState.inDeck === 'in-deck' && inDeckCount === 0) {
            return false;
        }
        if (filterState.inDeck === 'can-add' && inDeckCount >= 3) {
            return false;
        }

        // Tag filter
        if (filterState.tag) {
            const tags = cardTags[card.id] || [];
            if (!tags.includes(filterState.tag)) {
                return false;
            }
        }

        // Replacement mode filter - only show cards not in deck
        if (replacementMode.active) {
            if (inDeckCount > 0) return false;
        }

        return true;
    });

    // Sort cards
    filteredCards = sortCards(filteredCards, filterState.sort);

    // Update count
    if (countEl) {
        countEl.textContent = `${filteredCards.length} / ${myCards.length} cards`;
    }

    // Render filtered cards
    renderFilteredCards(container, filteredCards);
}

function sortCards(cards, sortBy) {
    return [...cards].sort((a, b) => {
        switch (sortBy) {
            case 'mana':
                const aMana = a.manaCost + (a.traits.includes('costly') ? 2 : 0);
                const bMana = b.manaCost + (b.traits.includes('costly') ? 2 : 0);
                return aMana - bMana;
            case 'attack':
                return b.attack - a.attack;
            case 'health':
                return b.health - a.health;
            case 'recent':
                return (b.id || '').localeCompare(a.id || '');
            case 'name':
            default:
                return a.name.localeCompare(b.name);
        }
    });
}

function renderFilteredCards(container, cards) {
    if (cards.length === 0) {
        container.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; padding: 1rem;">
                No cards match your filters.
            </p>
        `;
        return;
    }

    container.innerHTML = '';

    cards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'card-mini';
        el.dataset.cardId = card.id;

        // Check how many are in deck
        const inDeck = getCardCountInDeck(card.id);
        if (inDeck >= 3) {
            el.style.opacity = '0.5';
        }

        // Highlight replacement matches
        if (replacementMode.active) {
            el.classList.add('replacement-match');
        }

        let manaCost = card.manaCost;
        if (card.traits.includes('costly')) {
            manaCost += 2;
        }

        // Get card tags
        const tags = cardTags[card.id] || [];
        const tagHtml = tags.length > 0
            ? `<div class="card-mini-tags">${tags.slice(0, 2).map(t => `<span class="mini-tag">${t}</span>`).join('')}${tags.length > 2 ? `<span class="mini-tag">+${tags.length - 2}</span>` : ''}</div>`
            : '';

        el.innerHTML = `
            <div class="card-mini-name">${card.name}</div>
            <div class="card-mini-stats">
                <span style="color: var(--mana-color);">${manaCost}</span>
                <span style="color: var(--attack-color);">${card.attack}</span>
                <span style="color: var(--health-color);">${card.health}</span>
            </div>
            ${inDeck > 0 ? `<div style="text-align: center; font-size: 0.7rem; color: var(--success-color);">x${inDeck} in deck</div>` : ''}
            ${tagHtml}
            <button class="card-tag-btn" onclick="event.stopPropagation(); openTagModal('${card.id}')" title="Manage tags">🏷️</button>
        `;

        el.addEventListener('click', () => {
            if (replacementMode.active) {
                // Replace the card in the deck
                replaceCardInDeck(replacementMode.cardId, card.id);
            } else {
                addCardToDeck(card.id);
            }
        });

        // Add tooltip on hover
        attachCardTooltipEvents(el, card);

        container.appendChild(el);
    });
}

function clearFilters() {
    filterState = {
        search: '',
        mana: '',
        attack: '',
        health: '',
        trait: '',
        inDeck: '',
        tag: '',
        sort: 'name'
    };

    // Reset all filter inputs
    const inputs = ['filter-search'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const selects = ['filter-mana', 'filter-attack', 'filter-health', 'filter-trait', 'filter-in-deck', 'filter-tag', 'filter-sort'];
    selects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.selectedIndex = 0;
    });

    applyFilters();
}

// =====================
// TAG MANAGEMENT
// =====================

function loadCardTags() {
    try {
        const stored = localStorage.getItem('cardTags');
        if (stored) {
            cardTags = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load card tags:', error);
        cardTags = {};
    }
}

function saveCardTags() {
    try {
        localStorage.setItem('cardTags', JSON.stringify(cardTags));
    } catch (error) {
        console.error('Failed to save card tags:', error);
    }
}

let currentTagCardId = null;

function openTagModal(cardId) {
    currentTagCardId = cardId;
    const card = myCards.find(c => c.id === cardId);
    if (!card) return;

    const overlay = document.getElementById('tag-modal-overlay');
    const cardNameEl = document.getElementById('tag-modal-card-name');
    const inputEl = document.getElementById('tag-input');

    if (overlay) overlay.classList.remove('hidden');
    if (cardNameEl) cardNameEl.textContent = card.name;
    if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
    }

    renderCurrentTags();
    renderSuggestedTags();
}

function closeTagModal() {
    currentTagCardId = null;
    const overlay = document.getElementById('tag-modal-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Refresh displays
    populateTagFilter();
    applyFilters();
}

function renderCurrentTags() {
    const container = document.getElementById('current-tags');
    if (!container || !currentTagCardId) return;

    const tags = cardTags[currentTagCardId] || [];

    if (tags.length === 0) {
        container.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">No tags yet</span>';
        return;
    }

    container.innerHTML = tags.map(tag => `
        <span class="tag-chip">
            ${tag}
            <button class="tag-remove" onclick="removeTag('${tag}')">&times;</button>
        </span>
    `).join('');
}

function renderSuggestedTags() {
    const container = document.getElementById('suggested-tags');
    if (!container || !currentTagCardId) return;

    const card = myCards.find(c => c.id === currentTagCardId);
    if (!card) return;

    const currentTags = cardTags[currentTagCardId] || [];
    const suggestions = generateTagSuggestions(card).filter(t => !currentTags.includes(t));

    if (suggestions.length === 0) {
        container.innerHTML = '<span style="color: var(--text-secondary); font-size: 0.85rem;">No suggestions</span>';
        return;
    }

    container.innerHTML = suggestions.map(tag => `
        <button class="suggested-tag" onclick="addTag('${tag}')">${tag}</button>
    `).join('');
}

function generateTagSuggestions(card) {
    const suggestions = [];

    // Get effective mana cost
    let manaCost = card.manaCost;
    if (card.traits.includes('costly')) manaCost += 2;

    // Mana cost category
    if (manaCost <= 2) suggestions.push('cheap');
    else if (manaCost <= 4) suggestions.push('mid-cost');
    else suggestions.push('expensive');

    // Stat-based suggestions
    if (card.attack >= 5) suggestions.push('high-attack');
    if (card.health >= 6) suggestions.push('tanky');
    if (card.attack > card.health) suggestions.push('glass-cannon');
    if (card.health > card.attack * 2) suggestions.push('defensive');

    // Trait-based role suggestions
    if (card.traits.includes('taunt') || card.traits.includes('guardian')) suggestions.push('defender');
    if (card.traits.includes('charge') || card.traits.includes('swift')) suggestions.push('aggro');
    if (card.traits.includes('lifesteal') || card.traits.includes('vampiric')) suggestions.push('sustain');
    if (card.traits.includes('ranged')) suggestions.push('ranged');
    if (card.traits.includes('inspire') || card.traits.includes('rally')) suggestions.push('support');
    if (card.traits.includes('stealth') || card.traits.includes('elusive')) suggestions.push('elusive');

    // Has negative traits?
    const hasNegative = card.traits.some(t => NEGATIVE_TRAITS.includes(t));
    if (hasNegative) suggestions.push('risky');
    if (!hasNegative && card.traits.length > 0) suggestions.push('safe');

    // Value rating
    const statTotal = card.attack + card.health;
    if (statTotal >= manaCost * 2.5) suggestions.push('high-value');

    // Commonly used tags from other cards
    const commonTags = getCommonTags();
    commonTags.forEach(tag => {
        if (!suggestions.includes(tag)) suggestions.push(tag);
    });

    return suggestions.slice(0, 8);
}

function getCommonTags() {
    const tagCounts = {};
    Object.values(cardTags).forEach(tags => {
        tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
}

function addTagFromInput() {
    const input = document.getElementById('tag-input');
    if (!input || !input.value.trim()) return;

    addTag(input.value.trim().toLowerCase());
    input.value = '';
    input.focus();
}

function addTag(tag) {
    if (!currentTagCardId) return;

    if (!cardTags[currentTagCardId]) {
        cardTags[currentTagCardId] = [];
    }

    // Don't add duplicates
    if (cardTags[currentTagCardId].includes(tag)) return;

    // Limit to 10 tags per card
    if (cardTags[currentTagCardId].length >= 10) {
        alert('Maximum 10 tags per card');
        return;
    }

    cardTags[currentTagCardId].push(tag);
    saveCardTags();

    renderCurrentTags();
    renderSuggestedTags();
}

function removeTag(tag) {
    if (!currentTagCardId || !cardTags[currentTagCardId]) return;

    cardTags[currentTagCardId] = cardTags[currentTagCardId].filter(t => t !== tag);

    // Remove empty arrays
    if (cardTags[currentTagCardId].length === 0) {
        delete cardTags[currentTagCardId];
    }

    saveCardTags();
    renderCurrentTags();
    renderSuggestedTags();
}

// Handle Enter key in tag input
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'tag-input') {
        e.preventDefault();
        addTagFromInput();
    }
});

// =====================
// REPLACEMENT MODE
// =====================

function enterReplacementMode(cardId) {
    const card = myCards.find(c => c.id === cardId);
    if (!card) return;

    replacementMode = {
        active: true,
        cardId: cardId,
        cardName: card.name
    };

    // Show banner
    const banner = document.getElementById('replacement-mode-banner');
    const nameEl = document.getElementById('replacement-card-name');
    if (banner) banner.classList.remove('hidden');
    if (nameEl) nameEl.textContent = card.name;

    // Update filter to show cards not in deck
    filterState.inDeck = 'not-in-deck';
    const inDeckSelect = document.getElementById('filter-in-deck');
    if (inDeckSelect) inDeckSelect.value = 'not-in-deck';

    // Show filter panel if hidden
    const filterPanel = document.getElementById('filter-panel');
    if (filterPanel && filterPanel.classList.contains('hidden')) {
        filterPanel.classList.remove('hidden');
    }

    applyFilters();
}

function exitReplacementMode() {
    replacementMode = {
        active: false,
        cardId: null,
        cardName: ''
    };

    // Hide banner
    const banner = document.getElementById('replacement-mode-banner');
    if (banner) banner.classList.add('hidden');

    // Reset filter
    filterState.inDeck = '';
    const inDeckSelect = document.getElementById('filter-in-deck');
    if (inDeckSelect) inDeckSelect.value = '';

    applyFilters();
}

function replaceCardInDeck(oldCardId, newCardId) {
    // Remove one copy of old card
    removeCardFromDeck(oldCardId);

    // Add one copy of new card
    addCardToDeck(newCardId);

    // Exit replacement mode
    exitReplacementMode();
}

// =====================
// DECK BALANCE PENTAGON
// =====================

// Balance stat definitions
const BALANCE_STATS = [
    { id: 'aggression', name: 'Aggression', icon: '⚔️', description: 'Offensive power & speed' },
    { id: 'defense', name: 'Defense', icon: '🛡️', description: 'Survivability & protection' },
    { id: 'synergy', name: 'Synergy', icon: '✨', description: 'Trait combos & support' },
    { id: 'tempo', name: 'Tempo', icon: '⚡', description: 'Speed & mana efficiency' },
    { id: 'control', name: 'Control', icon: '🎯', description: 'Removal & disruption' }
];

// Traits that contribute to each stat
const STAT_TRAIT_WEIGHTS = {
    aggression: {
        positive: ['charge', 'swift', 'piercing', 'frenzy', 'warcry', 'overpower', 'deathtouch'],
        negative: ['pacifist', 'slow', 'cowardly'],
        statWeight: { attack: 1.5, health: 0.3 }
    },
    defense: {
        positive: ['taunt', 'armor', 'divine_shield', 'guardian', 'thorns', 'retaliate', 'regenerate'],
        negative: ['frail', 'fragile', 'exposed', 'brittle'],
        statWeight: { attack: 0.3, health: 1.5 }
    },
    synergy: {
        positive: ['inspire', 'rally', 'vampiric', 'leech', 'lifesteal'],
        negative: ['cursed', 'soulbound', 'disloyal'],
        statWeight: { attack: 0.5, health: 0.5 }
    },
    tempo: {
        positive: ['swift', 'charge', 'ranged', 'elusive'],
        negative: ['slow', 'costly', 'exhausting', 'draining'],
        statWeight: { attack: 0.8, health: 0.4 }
    },
    control: {
        positive: ['taunt', 'stealth', 'ranged', 'deathtouch', 'leech'],
        negative: ['reckless', 'clumsy', 'volatile'],
        statWeight: { attack: 0.6, health: 0.8 }
    }
};

let pentagonInitialized = false;

function initPentagonChart() {
    if (pentagonInitialized) return;

    const svg = document.getElementById('pentagon-svg');
    if (!svg) return;

    const center = 100;
    const maxRadius = 70;
    const numStats = BALANCE_STATS.length;

    // Draw grid (5 concentric pentagons)
    const gridGroup = svg.querySelector('.pentagon-grid');
    gridGroup.innerHTML = '';

    for (let level = 1; level <= 5; level++) {
        const radius = (level / 5) * maxRadius;
        const points = [];

        for (let i = 0; i < numStats; i++) {
            const angle = (i * 2 * Math.PI / numStats) - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            points.push(`${x},${y}`);
        }

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', points.join(' '));
        gridGroup.appendChild(polygon);
    }

    // Draw axes
    const axesGroup = svg.querySelector('.pentagon-axes');
    axesGroup.innerHTML = '';

    for (let i = 0; i < numStats; i++) {
        const angle = (i * 2 * Math.PI / numStats) - Math.PI / 2;
        const x = center + maxRadius * Math.cos(angle);
        const y = center + maxRadius * Math.sin(angle);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', center);
        line.setAttribute('y1', center);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        axesGroup.appendChild(line);
    }

    // Draw labels
    const labelsGroup = document.getElementById('pentagon-labels');
    labelsGroup.innerHTML = '';

    const labelRadius = maxRadius + 18;
    for (let i = 0; i < numStats; i++) {
        const angle = (i * 2 * Math.PI / numStats) - Math.PI / 2;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 3);
        text.textContent = BALANCE_STATS[i].icon;
        labelsGroup.appendChild(text);
    }

    pentagonInitialized = true;
}

function calculateDeckBalance() {
    const stats = {};

    BALANCE_STATS.forEach(stat => {
        stats[stat.id] = 0;
    });

    if (currentDeck.cardList.length === 0) {
        return stats;
    }

    let totalCards = 0;

    currentDeck.cardList.forEach(entry => {
        const card = myCards.find(c => c.id === entry.cardId);
        if (!card) return;

        for (let i = 0; i < entry.count; i++) {
            totalCards++;

            // Calculate each stat
            Object.keys(STAT_TRAIT_WEIGHTS).forEach(statId => {
                const config = STAT_TRAIT_WEIGHTS[statId];
                let score = 0;

                // Trait contributions
                const positiveCount = card.traits.filter(t => config.positive.includes(t)).length;
                const negativeCount = card.traits.filter(t => config.negative.includes(t)).length;
                score += positiveCount * 15;
                score -= negativeCount * 10;

                // Stat contributions
                score += card.attack * config.statWeight.attack;
                score += card.health * config.statWeight.health;

                // Mana efficiency bonus for tempo
                if (statId === 'tempo') {
                    let mana = card.manaCost;
                    if (card.traits.includes('costly')) mana += 2;
                    const efficiency = (card.attack + card.health) / Math.max(mana, 1);
                    score += efficiency * 3;

                    // Bonus for low mana cards
                    if (mana <= 2) score += 8;
                    else if (mana <= 4) score += 4;
                }

                // Synergy bonus for having multiple synergy traits
                if (statId === 'synergy') {
                    if (positiveCount >= 2) score += 10;
                }

                stats[statId] += score;
            });
        }
    });

    // Normalize to 0-100 scale
    const maxPossible = totalCards * 50; // Approximate max score per stat
    Object.keys(stats).forEach(statId => {
        stats[statId] = Math.min(100, Math.max(0, (stats[statId] / maxPossible) * 100));
    });

    return stats;
}

function updateDeckBalanceChart() {
    initPentagonChart();

    const stats = calculateDeckBalance();
    const svg = document.getElementById('pentagon-svg');
    const dataPolygon = document.getElementById('pentagon-data');
    const statsList = document.getElementById('balance-stats-list');

    if (!svg || !dataPolygon) return;

    const center = 100;
    const maxRadius = 70;
    const numStats = BALANCE_STATS.length;

    // Remove old points
    svg.querySelectorAll('.pentagon-point').forEach(el => el.remove());

    // Calculate data points
    const points = [];
    BALANCE_STATS.forEach((stat, i) => {
        const value = stats[stat.id] || 0;
        const radius = (value / 100) * maxRadius;
        const angle = (i * 2 * Math.PI / numStats) - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        points.push(`${x},${y}`);

        // Add data point circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', 4);
        circle.setAttribute('class', 'pentagon-point');
        circle.setAttribute('data-stat', stat.id);
        circle.setAttribute('data-value', Math.round(value));
        svg.appendChild(circle);
    });

    dataPolygon.setAttribute('points', points.join(' '));

    // Update stats list
    if (statsList) {
        statsList.innerHTML = BALANCE_STATS.map(stat => {
            const value = Math.round(stats[stat.id] || 0);
            const level = value < 30 ? 'low' : value < 60 ? 'medium' : 'high';
            return `
                <div class="balance-stat-item ${level}" title="${stat.description}">
                    <span class="balance-stat-icon">${stat.icon}</span>
                    <span class="balance-stat-value">${value}</span>
                    <span class="balance-stat-label">${stat.name}</span>
                </div>
            `;
        }).join('');
    }
}

function toggleBalanceChart() {
    const chart = document.getElementById('deck-balance-chart');
    const toggleText = document.getElementById('balance-toggle-text');

    if (chart) {
        chart.classList.toggle('hidden');
        if (toggleText) {
            toggleText.textContent = chart.classList.contains('hidden') ? 'Show' : 'Hide';
        }
    }
}
