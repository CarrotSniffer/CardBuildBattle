/**
 * Deck Builder Module
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

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check auth
    if (!Auth.requireAuth()) return;

    // Display username
    document.getElementById('username-display').textContent = Auth.user.username;

    // Load data
    await Promise.all([
        loadMyCards(),
        loadMyDecks()
    ]);

    // Setup event listeners
    setupEventListeners();
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
    document.getElementById('deck-name').addEventListener('input', (e) => {
        currentDeck.name = e.target.value;
    });
}

function renderCardCollection() {
    const container = document.getElementById('card-collection');
    document.getElementById('collection-count').textContent = `${myCards.length} cards`;

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

        el.addEventListener('click', () => addCardToDeck(card.id));
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

    // Check deck size
    if (getTotalCardsInDeck() >= 25) {
        showValidation('Deck is full (25 cards max)');
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
            <div class="card-info">
                <span style="color: var(--mana-color); margin-right: 0.5rem;">${manaCost}</span>
                <span>${card.name}</span>
            </div>
            <div class="card-count">
                <button class="count-btn" onclick="removeCardFromDeck('${cardId}')">-</button>
                <span>${count}</span>
                <button class="count-btn" onclick="addCardToDeck('${cardId}')">+</button>
            </div>
        `;
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

    document.getElementById('deck-card-count').textContent = total;
    document.getElementById('deck-unique-count').textContent = unique;
    document.getElementById('deck-avg-mana').textContent = avgMana;

    // Update color based on validity
    const countEl = document.getElementById('deck-card-count');
    countEl.style.color = total === 25 ? 'var(--success-color)' : total > 25 ? 'var(--accent-color)' : 'var(--text-primary)';
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

    document.getElementById('deck-name').value = '';
    document.getElementById('delete-deck-btn').style.display = 'none';
    document.getElementById('save-deck-btn').textContent = 'Save Deck';

    renderDeckCards();
    renderCardCollection();
    updateDeckStats();
    hideValidation();

    // Deselect in saved decks
    document.querySelectorAll('#saved-decks .deck-card-item.selected').forEach(el => {
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

    document.getElementById('deck-name').value = deck.name;
    document.getElementById('delete-deck-btn').style.display = 'block';
    document.getElementById('save-deck-btn').textContent = 'Update Deck';

    renderDeckCards();
    renderCardCollection();
    updateDeckStats();
    hideValidation();

    // Highlight in saved decks
    document.querySelectorAll('#saved-decks .deck-card-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.deckId === deck.id);
    });
}

function renderSavedDecks() {
    const container = document.getElementById('saved-decks');

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
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideValidation() {
    document.getElementById('deck-validation').classList.add('hidden');
}
