/**
 * Simple Bot for Testing
 * Automatically plays cards and attacks when it's the bot's turn
 */

class GameBot {
    constructor() {
        this.ws = null;
        this.playerId = null;
        this.gameState = null;
        this.isInGame = false;
        this.botName = 'TestBot_' + Math.floor(Math.random() * 1000);
        this.deckId = null;
        this.actionDelay = 800; // ms between actions

        this.init();
    }

    async init() {
        console.log(`[Bot] Initializing ${this.botName}...`);

        // First, register/login the bot
        await this.authenticate();

        // Then create cards and deck if needed
        await this.ensureDeckExists();

        // Connect to WebSocket
        this.connect();
    }

    async authenticate() {
        // Try to login, if fails register
        try {
            let response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.botName, password: 'botpassword123' })
            });

            if (!response.ok) {
                // Register new bot account
                response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: this.botName, password: 'botpassword123' })
                });
            }

            const data = await response.json();
            if (data.token) {
                this.token = data.token;
                this.userId = data.user.id;
                console.log(`[Bot] Authenticated as ${this.botName}`);
            }
        } catch (error) {
            console.error('[Bot] Auth error:', error);
        }
    }

    async fetchWithAuth(url, options = {}) {
        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        });
    }

    async ensureDeckExists() {
        // Check if bot has cards
        const cardsResponse = await this.fetchWithAuth('/api/cards');
        const cardsData = await cardsResponse.json();

        if (!cardsData.cards || cardsData.cards.length < 9) {
            console.log('[Bot] Creating bot cards...');
            await this.createBotCards();
        }

        // Check if bot has a deck
        const decksResponse = await this.fetchWithAuth('/api/decks');
        const decksData = await decksResponse.json();

        if (!decksData.decks || decksData.decks.length === 0) {
            console.log('[Bot] Creating bot deck...');
            await this.createBotDeck();
        } else {
            this.deckId = decksData.decks[0].id;
            console.log('[Bot] Using existing deck:', this.deckId);
        }
    }

    async createBotCards() {
        // Create a variety of simple cards for the bot
        const cardTemplates = [
            { name: 'Bot Soldier', attack: 2, health: 3, manaCost: 2, traits: [] },
            { name: 'Bot Knight', attack: 3, health: 4, manaCost: 3, traits: ['taunt'] },
            { name: 'Bot Archer', attack: 4, health: 2, manaCost: 3, traits: ['ranged'] },
            { name: 'Bot Tank', attack: 1, health: 6, manaCost: 4, traits: ['taunt', 'armor'] },
            { name: 'Bot Scout', attack: 2, health: 2, manaCost: 1, traits: ['swift'] },
            { name: 'Bot Warrior', attack: 4, health: 3, manaCost: 4, traits: [] },
            { name: 'Bot Healer', attack: 1, health: 4, manaCost: 3, traits: ['regenerate'] },
            { name: 'Bot Vampire', attack: 3, health: 3, manaCost: 4, traits: ['lifesteal'] },
            { name: 'Bot Charger', attack: 4, health: 2, manaCost: 3, traits: ['charge'] }
        ];

        for (const card of cardTemplates) {
            try {
                await this.fetchWithAuth('/api/cards', {
                    method: 'POST',
                    body: JSON.stringify(card)
                });
            } catch (e) {
                // Card might already exist, ignore
            }
        }
    }

    async createBotDeck() {
        // Get all bot's cards
        const response = await this.fetchWithAuth('/api/cards');
        const data = await response.json();
        const cards = data.cards || [];

        if (cards.length < 9) {
            console.error('[Bot] Not enough cards to create deck');
            return;
        }

        // Create a deck with 25 cards (max 3 of each)
        const cardList = [];
        let totalCards = 0;

        // Add 3 copies of each card until we hit 25
        for (const card of cards) {
            if (totalCards >= 25) break;
            const copies = Math.min(3, 25 - totalCards);
            cardList.push({ cardId: card.id, count: copies });
            totalCards += copies;
        }

        const deckResponse = await this.fetchWithAuth('/api/decks', {
            method: 'POST',
            body: JSON.stringify({
                name: 'Bot Deck',
                cardList
            })
        });

        const deckData = await deckResponse.json();
        if (deckData.deck) {
            this.deckId = deckData.deck.id;
            console.log('[Bot] Created deck:', this.deckId);
        }
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[Bot] Connected to server');
            // Authenticate
            this.send({
                type: 'authenticate',
                userId: this.userId,
                username: this.botName
            });

            // Auto-join or create lobby after a short delay
            setTimeout(() => this.joinOrCreateLobby(), 1000);
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.log('[Bot] Disconnected, reconnecting in 3s...');
            setTimeout(() => this.connect(), 3000);
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'connected':
                this.playerId = data.playerId;
                console.log('[Bot] Assigned ID:', this.playerId);
                break;

            case 'lobby_list':
                // If we see open lobbies, join one
                if (data.lobbies && data.lobbies.length > 0 && !this.isInGame) {
                    const lobby = data.lobbies[0];
                    console.log('[Bot] Joining lobby:', lobby.id);
                    this.send({ type: 'join_lobby', lobbyId: lobby.id, deckId: this.deckId });
                }
                break;

            case 'lobby_created':
                console.log('[Bot] Created lobby:', data.lobby.id);
                break;

            case 'lobby_joined':
            case 'lobby_guest_joined':
                console.log('[Bot] In lobby, waiting for game start');
                break;

            case 'game_started':
                console.log('[Bot] Game started against:', data.opponent);
                this.isInGame = true;
                break;

            case 'game_state':
                this.gameState = data.state;
                if (this.gameState.isYourTurn && this.gameState.phase === 'playing') {
                    this.takeTurn();
                }
                if (this.gameState.phase === 'ended') {
                    console.log('[Bot] Game ended. Winner:', this.gameState.winnerName);
                    this.isInGame = false;
                    // Look for new game after delay
                    setTimeout(() => this.joinOrCreateLobby(), 3000);
                }
                break;

            case 'error':
                console.log('[Bot] Error:', data.message);
                break;

            case 'opponent_disconnected':
                console.log('[Bot] Opponent disconnected');
                this.isInGame = false;
                setTimeout(() => this.joinOrCreateLobby(), 2000);
                break;
        }
    }

    joinOrCreateLobby() {
        if (this.isInGame) return;

        // Request lobby list, will join if one exists
        this.send({ type: 'get_lobbies' });

        // If no lobbies after a bit, create one
        setTimeout(() => {
            if (!this.isInGame) {
                console.log('[Bot] Creating lobby...');
                this.send({ type: 'create_lobby', deckId: this.deckId });
            }
        }, 2000);
    }

    async takeTurn() {
        if (!this.gameState || !this.gameState.isYourTurn) return;

        console.log('[Bot] Taking turn...');

        // Small delay to make it feel more natural
        await this.delay(this.actionDelay);

        // 1. Play cards from hand
        await this.playCards();

        // 2. Attack with units
        await this.attackWithUnits();

        // 3. End turn
        await this.delay(this.actionDelay);
        console.log('[Bot] Ending turn');
        this.send({ type: 'end_turn' });
    }

    async playCards() {
        const hand = this.gameState.you.hand;
        const mana = this.gameState.you.currentMana;
        const fieldSize = this.gameState.you.field.length;

        // Sort hand by mana cost (play cheaper cards first to maximize plays)
        const sortedHand = [...hand].sort((a, b) => (a.cost || 0) - (b.cost || 0));

        let currentMana = mana;

        for (const card of sortedHand) {
            const cost = card.cost || card.manaCost || 0;

            // Check if we can play this card
            if (cost <= currentMana && fieldSize < 6) {
                console.log(`[Bot] Playing ${card.name} (cost: ${cost})`);
                this.send({
                    type: 'play_card',
                    cardId: card.instanceId,
                    target: null
                });
                currentMana -= cost;
                await this.delay(this.actionDelay);
            }
        }
    }

    async attackWithUnits() {
        // Refresh state after playing cards
        await this.delay(300);

        if (!this.gameState) return;

        const myUnits = this.gameState.you.field.filter(u => u.canAttack);
        const enemyUnits = this.gameState.opponent.field;
        const enemyHasTaunt = enemyUnits.some(u => u.abilities && u.abilities.includes('taunt'));
        const tauntUnits = enemyUnits.filter(u => u.abilities && u.abilities.includes('taunt'));

        for (const unit of myUnits) {
            // Skip pacifist units
            if (unit.abilities && unit.abilities.includes('pacifist')) continue;

            let target;

            if (enemyHasTaunt) {
                // Must attack taunt
                target = {
                    type: 'unit',
                    playerId: this.gameState.opponent.id,
                    instanceId: tauntUnits[0].instanceId
                };
            } else if (enemyUnits.length > 0 && Math.random() > 0.3) {
                // 70% chance to attack a unit if there are any
                const randomUnit = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
                target = {
                    type: 'unit',
                    playerId: this.gameState.opponent.id,
                    instanceId: randomUnit.instanceId
                };
            } else {
                // Attack hero
                target = {
                    type: 'hero',
                    playerId: this.gameState.opponent.id
                };
            }

            console.log(`[Bot] ${unit.name} attacking ${target.type}`);
            this.send({
                type: 'attack',
                attackerId: unit.instanceId,
                target
            });

            await this.delay(this.actionDelay);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start bot when script loads
console.log('[Bot] Bot script loaded. Creating bot...');
const bot = new GameBot();
