/**
 * Card Builder Module
 */

// Point system data (loaded from server)
let pointSystem = null;

// Current card state
let currentCard = {
    id: null,
    name: '',
    attack: 1,
    health: 1,
    manaCost: 2,
    traits: []
};

// User's cards
let myCards = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    if (!Auth.requireAuth()) return;

    // Display username
    document.getElementById('username-display').textContent = Auth.user.username;

    // Load point system
    await loadPointSystem();

    // Load user's cards
    await loadMyCards();

    // Setup event listeners
    setupEventListeners();

    // Initial render
    updatePointsDisplay();
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

function renderTraits() {
    // Positive traits
    const positiveContainer = document.getElementById('positive-traits');
    positiveContainer.innerHTML = '';

    Object.values(pointSystem.positiveTraits).forEach(trait => {
        positiveContainer.appendChild(createTraitElement(trait, true));
    });

    // Negative traits
    const negativeContainer = document.getElementById('negative-traits');
    negativeContainer.innerHTML = '';

    Object.values(pointSystem.negativeTraits).forEach(trait => {
        negativeContainer.appendChild(createTraitElement(trait, false));
    });
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
    document.getElementById('attack-slider').addEventListener('input', (e) => {
        currentCard.attack = parseInt(e.target.value);
        document.getElementById('attack-value').textContent = currentCard.attack;
        document.getElementById('attack-display').textContent = currentCard.attack;
        updatePointsDisplay();
    });

    document.getElementById('health-slider').addEventListener('input', (e) => {
        currentCard.health = parseInt(e.target.value);
        document.getElementById('health-value').textContent = currentCard.health;
        document.getElementById('health-display').textContent = currentCard.health;
        updatePointsDisplay();
    });

    document.getElementById('mana-slider').addEventListener('input', (e) => {
        currentCard.manaCost = parseInt(e.target.value);
        document.getElementById('mana-value').textContent = currentCard.manaCost;
        updateManaDisplay();
        updatePointsDisplay();
    });

    // Card name
    document.getElementById('card-name').addEventListener('input', (e) => {
        currentCard.name = e.target.value;
    });

    // Active traits drop zone
    const dropZone = document.getElementById('active-traits');

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
}

function removeTrait(traitId) {
    currentCard.traits = currentCard.traits.filter(t => t !== traitId);
    renderActiveTraits();
    updatePointsDisplay();
}

function renderActiveTraits() {
    const container = document.getElementById('active-traits');

    if (currentCard.traits.length === 0) {
        container.innerHTML = '<span class="empty-traits-hint">Drag traits here</span>';
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
    const healthDiff = currentCard.health - pointSystem.baseStats.health;
    const manaDiff = pointSystem.baseStats.manaCost - currentCard.manaCost;

    cost += attackDiff * pointSystem.statCosts.attack;
    cost += healthDiff * pointSystem.statCosts.health;
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

function updateManaDisplay() {
    let manaCost = currentCard.manaCost;
    // Add costly trait effect
    if (currentCard.traits.includes('costly')) {
        manaCost += 2;
    }
    document.getElementById('card-mana-display').textContent = manaCost;
}

function resetCard() {
    currentCard = {
        id: null,
        name: '',
        attack: 1,
        health: 1,
        manaCost: 2,
        traits: []
    };

    // Reset UI
    document.getElementById('card-name').value = '';
    document.getElementById('attack-slider').value = 1;
    document.getElementById('health-slider').value = 1;
    document.getElementById('mana-slider').value = 2;
    document.getElementById('attack-value').textContent = '1';
    document.getElementById('health-value').textContent = '1';
    document.getElementById('mana-value').textContent = '2';
    document.getElementById('attack-display').textContent = '1';
    document.getElementById('health-display').textContent = '1';
    document.getElementById('card-mana-display').textContent = '2';
    document.getElementById('delete-card-btn').style.display = 'none';
    document.getElementById('save-card-btn').textContent = 'Save Card';

    renderActiveTraits();
    updatePointsDisplay();
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
            traits: currentCard.traits
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
        traits: [...card.traits]
    };

    // Update UI
    document.getElementById('card-name').value = card.name;
    document.getElementById('attack-slider').value = card.attack;
    document.getElementById('health-slider').value = card.health;
    document.getElementById('mana-slider').value = card.manaCost;
    document.getElementById('attack-value').textContent = card.attack;
    document.getElementById('health-value').textContent = card.health;
    document.getElementById('mana-value').textContent = card.manaCost;
    document.getElementById('attack-display').textContent = card.attack;
    document.getElementById('health-display').textContent = card.health;
    document.getElementById('delete-card-btn').style.display = 'block';
    document.getElementById('save-card-btn').textContent = 'Update Card';

    updateManaDisplay();
    renderActiveTraits();
    updatePointsDisplay();

    // Highlight selected card
    document.querySelectorAll('.card-mini.selected').forEach(el => {
        el.classList.remove('selected');
    });
    const cardEl = document.querySelector(`[data-card-id="${card.id}"]`);
    if (cardEl) {
        cardEl.classList.add('selected');
    }
}

function renderMyCards() {
    const container = document.getElementById('my-cards');
    document.getElementById('card-count').textContent = `${myCards.length} cards`;

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
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideError() {
    document.getElementById('card-error').classList.add('hidden');
}
