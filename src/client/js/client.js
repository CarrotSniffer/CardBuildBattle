/**
 * Strategic Card Game - Client
 */

class GameClient {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.gameState = null;
        this.selectedCard = null;
        this.selectedAttacker = null;
        this.targetMode = null; // 'spell', 'attack', null
        this.selectedDeckId = null;
        this.myDecks = [];

        this.init();
    }

    async init() {
        // Check auth first
        if (!Auth.requireAuth()) return;

        // Display username
        document.getElementById('username-display').textContent = Auth.user.username;

        // Load user's decks
        await this.loadDecks();

        // Bind events
        this.bindEvents();

        // Connect to WebSocket
        this.connect();
    }

    async loadDecks() {
        try {
            const response = await Auth.fetchWithAuth('/api/decks');
            const data = await response.json();
            this.myDecks = data.decks || [];
            this.renderDeckSelector();
        } catch (error) {
            console.error('Failed to load decks:', error);
        }
    }

    renderDeckSelector() {
        const select = document.getElementById('deck-select');
        const warning = document.getElementById('no-deck-warning');
        const findBtn = document.getElementById('find-game-btn');

        // Clear existing options (keep first placeholder)
        select.innerHTML = '<option value="">-- Select a deck --</option>';

        if (this.myDecks.length === 0) {
            warning.style.display = 'block';
            findBtn.disabled = true;
            return;
        }

        warning.style.display = 'none';

        this.myDecks.forEach(deck => {
            const total = deck.cardList.reduce((sum, c) => sum + c.count, 0);
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = `${deck.name} (${total} cards)`;
            select.appendChild(option);
        });

        // Enable find game if a deck is selected
        select.addEventListener('change', () => {
            this.selectedDeckId = select.value || null;
            findBtn.disabled = !this.selectedDeckId;
        });
    }

    // ===== WebSocket Connection =====
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleServerMessage(data);
        };

        this.ws.onclose = () => {
            console.log('Disconnected from server');
            this.showMessage('Disconnected from server', true);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // ===== Event Handling =====
    handleServerMessage(data) {
        switch (data.type) {
            case 'connected':
                this.playerId = data.playerId;
                console.log('Assigned player ID:', this.playerId);
                break;

            case 'searching':
                this.showSearching(true);
                break;

            case 'game_found':
                this.showSearching(false);
                this.showScreen('game-screen');
                this.showMessage(`Game found! Playing against ${data.opponent}`);
                break;

            case 'game_state':
                this.gameState = data.state;
                this.render();
                break;

            case 'error':
                this.showMessage(data.message, true);
                break;

            case 'opponent_disconnected':
                this.showMessage('Opponent disconnected!', true);
                setTimeout(() => {
                    this.showScreen('menu-screen');
                }, 2000);
                break;
        }
    }

    bindEvents() {
        // Menu buttons
        document.getElementById('find-game-btn').onclick = () => this.findGame();
        document.getElementById('how-to-play-btn').onclick = () => this.showScreen('rules-screen');
        document.getElementById('back-to-menu-btn').onclick = () => this.showScreen('menu-screen');
        document.getElementById('cancel-search-btn').onclick = () => this.cancelSearch();
        document.getElementById('play-again-btn').onclick = () => this.showScreen('menu-screen');

        // Game buttons
        document.getElementById('end-turn-btn').onclick = () => this.endTurn();
        document.getElementById('cancel-target-btn').onclick = () => this.cancelTargeting();
    }

    // ===== Game Actions =====
    findGame() {
        if (!this.selectedDeckId) {
            this.showMessage('Please select a deck first!', true);
            return;
        }
        this.send({ type: 'find_game', deckId: this.selectedDeckId });
    }

    cancelSearch() {
        this.showSearching(false);
        // Note: Server doesn't have cancel implemented yet
    }

    endTurn() {
        this.send({ type: 'end_turn' });
    }

    playCard(card) {
        // Calculate effective mana cost
        let manaCost = card.manaCost || card.cost || 0;

        // Check if we have enough mana
        if (this.gameState.you.currentMana < manaCost) {
            this.showMessage('Not enough mana!', true);
            return;
        }

        if (!this.gameState.isYourTurn) {
            this.showMessage('Not your turn!', true);
            return;
        }

        // For custom cards, play immediately (they're all units)
        this.send({
            type: 'play_card',
            cardId: card.instanceId,
            target: null
        });
    }

    attackWith(unit) {
        if (!unit.canAttack) {
            this.showMessage('Unit cannot attack!', true);
            return;
        }

        if (!this.gameState.isYourTurn) {
            this.showMessage('Not your turn!', true);
            return;
        }

        this.selectedAttacker = unit;
        this.targetMode = 'attack';
        this.showTargetOverlay(`Select attack target for ${unit.name}`);
        this.highlightAttackTargets();
    }

    selectTarget(targetInfo) {
        if (this.targetMode === 'spell' && this.selectedCard) {
            this.send({
                type: 'play_card',
                cardId: this.selectedCard.instanceId,
                target: targetInfo
            });
        } else if (this.targetMode === 'attack' && this.selectedAttacker) {
            this.send({
                type: 'attack',
                attackerId: this.selectedAttacker.instanceId,
                target: targetInfo
            });
        }

        this.cancelTargeting();
    }

    cancelTargeting() {
        this.selectedCard = null;
        this.selectedAttacker = null;
        this.targetMode = null;
        this.hideTargetOverlay();
        this.clearHighlights();
    }

    // ===== Rendering =====
    render() {
        if (!this.gameState) return;

        const state = this.gameState;

        // Update player info
        document.getElementById('player-health').textContent = state.you.health;
        document.getElementById('player-mana').textContent = `${state.you.currentMana}/${state.you.maxMana}`;
        document.getElementById('player-deck').textContent = state.you.deckCount;

        document.getElementById('opponent-health').textContent = state.opponent.health;
        document.getElementById('opponent-mana').textContent = `${state.opponent.currentMana}/${state.opponent.maxMana}`;
        document.getElementById('opponent-deck').textContent = state.opponent.deckCount;
        document.getElementById('opponent-hand-count').textContent = state.opponent.handCount;

        // Update turn indicator
        document.getElementById('turn-text').textContent = state.isYourTurn ? 'Your Turn' : "Opponent's Turn";
        document.getElementById('turn-number').textContent = `Turn ${state.turnNumber}`;
        document.getElementById('end-turn-btn').disabled = !state.isYourTurn;

        // Render hands
        this.renderHand(state.you.hand);

        // Render fields
        this.renderField('player-field', state.you.field, true);
        this.renderField('opponent-field', state.opponent.field, false);

        // Render structures
        this.renderStructures('player-structures', state.you.structures);
        this.renderStructures('opponent-structures', state.opponent.structures);

        // Check for game end
        if (state.phase === 'ended') {
            this.showGameOver(state.winner);
        }
    }

    renderHand(hand) {
        const container = document.getElementById('player-hand');
        container.innerHTML = '';

        hand.forEach(card => {
            const cardEl = this.createCardElement(card, true);
            cardEl.onclick = () => this.playCard(card);
            container.appendChild(cardEl);
        });
    }

    renderField(containerId, units, isPlayer) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        // Add hero target for opponent's field
        if (!isPlayer) {
            const heroTarget = document.createElement('div');
            heroTarget.className = 'hero-target';
            heroTarget.innerHTML = '&#9829;';
            heroTarget.onclick = () => {
                if (this.targetMode) {
                    this.selectTarget({ type: 'hero', playerId: this.gameState.opponent.id });
                }
            };
            container.appendChild(heroTarget);
        }

        units.forEach(unit => {
            const cardEl = this.createUnitElement(unit, isPlayer);
            container.appendChild(cardEl);
        });
    }

    renderStructures(containerId, structures) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        structures.forEach(structure => {
            const cardEl = this.createStructureElement(structure);
            container.appendChild(cardEl);
        });
    }

    createCardElement(card, inHand = false) {
        const el = document.createElement('div');
        el.className = 'card';
        el.dataset.instanceId = card.instanceId;

        // Get mana cost (handle both old preset cards and new custom cards)
        const manaCost = card.manaCost || card.cost || 0;

        // Check if playable
        if (inHand && this.gameState.isYourTurn && this.gameState.you.currentMana >= manaCost) {
            el.classList.add('playable');
        }

        // Get traits/abilities
        const traits = card.traits || card.abilities || [];

        el.innerHTML = `
            <div class="card-cost">${manaCost}</div>
            <div class="card-name">${card.name}</div>
            <div class="card-type">unit</div>
            <div class="card-stats">
                <span class="card-attack">&#9876;${card.attack}</span>
                <span class="card-health">&#9829;${card.health}</span>
            </div>
            ${traits.length > 0 ? `
                <div class="abilities">
                    ${traits.map(a => `<span class="ability-tag">${a}</span>`).join('')}
                </div>
            ` : ''}
        `;

        return el;
    }

    createUnitElement(unit, isPlayer) {
        const el = document.createElement('div');
        el.className = 'card field-unit';
        el.dataset.instanceId = unit.instanceId;

        if (isPlayer && unit.canAttack && this.gameState.isYourTurn) {
            el.classList.add('can-attack');
            el.onclick = () => this.attackWith(unit);
        } else if (!isPlayer && this.targetMode) {
            el.classList.add('targetable');
            el.onclick = () => this.selectTarget({
                type: 'unit',
                playerId: this.gameState.opponent.id,
                instanceId: unit.instanceId
            });
        }

        const healthClass = unit.currentHealth < unit.health ? 'damaged' : '';
        const traits = unit.traits || unit.abilities || [];

        el.innerHTML = `
            <div class="card-name">${unit.name}</div>
            <div class="card-stats">
                <span class="card-attack">&#9876;${unit.currentAttack}</span>
                <span class="card-health ${healthClass}">&#9829;${unit.currentHealth}</span>
            </div>
            ${traits.length > 0 ? `
                <div class="abilities">
                    ${traits.map(a => `<span class="ability-tag">${a}</span>`).join('')}
                </div>
            ` : ''}
        `;

        return el;
    }

    createStructureElement(structure) {
        const el = document.createElement('div');
        el.className = 'card structure-card';

        el.innerHTML = `
            <div class="card-name">${structure.name}</div>
            <div class="card-health">&#9829;${structure.currentHealth}</div>
        `;

        return el;
    }

    highlightValidTargets(card) {
        // Highlight based on card target type
        const opponentUnits = document.querySelectorAll('#opponent-field .field-unit');
        const playerUnits = document.querySelectorAll('#player-field .field-unit');

        if (card.target === 'enemy_unit') {
            opponentUnits.forEach(u => u.classList.add('targetable'));
        } else if (card.target === 'friendly_unit' || card.target === 'friendly') {
            playerUnits.forEach(u => u.classList.add('targetable'));
        } else if (card.target === 'any_unit') {
            opponentUnits.forEach(u => u.classList.add('targetable'));
            playerUnits.forEach(u => u.classList.add('targetable'));
        }
    }

    highlightAttackTargets() {
        const opponentUnits = document.querySelectorAll('#opponent-field .field-unit');
        const heroTarget = document.querySelector('#opponent-field .hero-target');

        opponentUnits.forEach(u => u.classList.add('targetable'));
        if (heroTarget) heroTarget.classList.add('targetable');
    }

    clearHighlights() {
        document.querySelectorAll('.targetable').forEach(el => {
            el.classList.remove('targetable');
        });
    }

    // ===== UI Helpers =====
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showSearching(show) {
        const status = document.getElementById('searching-status');
        const findBtn = document.getElementById('find-game-btn');
        const deckSelect = document.getElementById('deck-selection');

        if (show) {
            status.classList.remove('hidden');
            findBtn.classList.add('hidden');
            deckSelect.style.display = 'none';
        } else {
            status.classList.add('hidden');
            findBtn.classList.remove('hidden');
            deckSelect.style.display = 'block';
        }
    }

    showTargetOverlay(prompt) {
        const overlay = document.getElementById('target-overlay');
        document.getElementById('target-prompt').textContent = prompt;
        overlay.classList.remove('hidden');
    }

    hideTargetOverlay() {
        document.getElementById('target-overlay').classList.add('hidden');
    }

    showMessage(text, isError = false) {
        const container = document.getElementById('game-messages');
        const msg = document.createElement('div');
        msg.className = 'game-message' + (isError ? ' error' : '');
        msg.textContent = text;
        container.appendChild(msg);

        setTimeout(() => {
            msg.remove();
        }, 3000);
    }

    showGameOver(winner) {
        const title = document.getElementById('gameover-title');
        const message = document.getElementById('gameover-message');

        if (winner === 'draw') {
            title.textContent = 'Draw!';
            message.textContent = 'Both players were defeated simultaneously.';
        } else if (winner === this.playerId) {
            title.textContent = 'Victory!';
            message.textContent = 'You have defeated your opponent!';
        } else {
            title.textContent = 'Defeat';
            message.textContent = 'Your opponent has won the game.';
        }

        this.showScreen('gameover-screen');
    }
}

// Initialize the game client
const game = new GameClient();
