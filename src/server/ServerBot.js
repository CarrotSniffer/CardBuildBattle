/**
 * Server-side Bot for Testing
 * Runs entirely on the server, no browser needed
 */

const { v4: uuidv4 } = require('uuid');

class ServerBot {
    constructor(gameManager, sendToPlayer, broadcastGameState) {
        this.botId = 'bot_' + uuidv4().slice(0, 8);
        this.botName = 'Bot';
        this.gameManager = gameManager;
        this.sendToPlayer = sendToPlayer;
        this.broadcastGameState = broadcastGameState;
        this.gameId = null;
        this.actionDelay = 800;
        this.isProcessingTurn = false;
    }

    // Get a pre-built bot deck (returns card data directly)
    getBotDeck() {
        const cards = [
            { name: 'Bot Soldier', attack: 2, health: 3, manaCost: 2, traits: [] },
            { name: 'Bot Knight', attack: 3, health: 4, manaCost: 3, traits: ['taunt'] },
            { name: 'Bot Archer', attack: 4, health: 2, manaCost: 3, traits: ['ranged'] },
            { name: 'Bot Tank', attack: 1, health: 6, manaCost: 4, traits: ['taunt', 'armor'] },
            { name: 'Bot Scout', attack: 2, health: 2, manaCost: 1, traits: ['swift'] },
            { name: 'Bot Warrior', attack: 4, health: 3, manaCost: 4, traits: [] },
            { name: 'Bot Mage', attack: 3, health: 2, manaCost: 2, traits: ['ranged'] },
            { name: 'Bot Vampire', attack: 3, health: 3, manaCost: 4, traits: ['lifesteal'] },
            { name: 'Bot Charger', attack: 4, health: 2, manaCost: 3, traits: ['charge'] },
        ];

        // Build a 25-card deck with 3 copies of each (9 cards x 3 = 27, take first 25)
        const deck = [];
        let count = 0;
        for (const card of cards) {
            for (let i = 0; i < 3 && count < 25; i++) {
                deck.push({
                    id: `bot_card_${count}`,
                    ...card
                });
                count++;
            }
        }
        return deck;
    }

    // Called when a game starts with this bot
    startGame(gameId) {
        this.gameId = gameId;
        console.log(`[Bot ${this.botName}] Game started: ${gameId}`);
    }

    // Called when game state updates
    onGameState(state) {
        if (!state || this.isProcessingTurn) return;

        // Handle card selection phase
        if (state.inCardSelection && state.isYourTurn) {
            this.handleCardSelection(state);
            return;
        }

        if (state.isYourTurn && state.phase === 'playing') {
            this.takeTurn(state);
        }
    }

    // Handle card selection at end of turn
    async handleCardSelection(state) {
        if (this.isProcessingTurn) return;
        this.isProcessingTurn = true;

        try {
            await this.delay(this.actionDelay);

            // Bot strategy: shuffle back high-cost cards to try to draw cheaper ones
            const hand = state.you.hand || [];
            const cardsToShuffle = [];

            // Sort by cost descending, consider shuffling back expensive cards
            const sortedHand = [...hand].sort((a, b) => (b.cost || 0) - (a.cost || 0));

            // Shuffle back up to 2 cards if they cost more than current mana
            const maxMana = state.you.maxMana || 5;
            for (const card of sortedHand) {
                const cost = card.cost || card.manaCost || 0;
                // If card costs more than we can afford, consider shuffling it
                if (cost > maxMana && cardsToShuffle.length < 2) {
                    cardsToShuffle.push(card.instanceId);
                }
            }

            console.log(`[Bot ${this.botName}] Card selection: shuffling ${cardsToShuffle.length} cards`);

            const result = this.gameManager.confirmCardSelection(this.gameId, this.botId, cardsToShuffle);
            if (result.success) {
                this.broadcastGameState(this.gameId);
            }
        } catch (error) {
            console.error(`[Bot ${this.botName}] Error during card selection:`, error);
            // If something goes wrong, just skip selection
            this.gameManager.skipCardSelection(this.gameId, this.botId);
            this.broadcastGameState(this.gameId);
        }

        this.isProcessingTurn = false;
    }

    async takeTurn(state) {
        if (this.isProcessingTurn) return;
        this.isProcessingTurn = true;

        console.log(`[Bot ${this.botName}] Taking turn...`);

        try {
            // Small delay to feel natural
            await this.delay(this.actionDelay);

            // 1. Play cards from hand
            await this.playCards(state);

            // 2. Get fresh state and attack
            const game = this.gameManager.getGame(this.gameId);
            if (game) {
                const freshState = game.getStateForPlayer(this.botId);
                await this.attackWithUnits(freshState);
            }

            // 3. End turn - reset flag BEFORE ending so card selection can trigger
            await this.delay(this.actionDelay);
            console.log(`[Bot ${this.botName}] Ending turn`);

            // Reset flag before endTurn so we can handle card selection
            this.isProcessingTurn = false;

            const result = this.gameManager.endTurn(this.gameId, this.botId);
            if (result.success) {
                this.broadcastGameState(this.gameId);

                // If card selection phase was triggered, handle it directly
                // (instead of waiting for onGameState which may have timing issues)
                if (result.cardSelection) {
                    const game = this.gameManager.getGame(this.gameId);
                    if (game) {
                        const freshState = game.getStateForPlayer(this.botId);
                        await this.handleCardSelection(freshState);
                    }
                }
            }
        } catch (error) {
            console.error(`[Bot ${this.botName}] Error during turn:`, error);
            this.isProcessingTurn = false;
        }
    }

    async playCards(state) {
        const hand = state.you.hand || [];
        let currentMana = state.you.currentMana;
        let fieldSize = state.you.field.length;
        let landPool = state.you.landPool || 0;

        // Play lands from pool first (to increase mana for future turns)
        // Bot plays 1-2 lands per turn if possible
        const landsToPlay = Math.min(2, landPool);
        for (let i = 0; i < landsToPlay; i++) {
            if (currentMana >= 1 && landPool > 0) {
                console.log(`[Bot ${this.botName}] Playing land from pool`);
                const result = this.gameManager.playLand(this.gameId, this.botId);
                if (result.success) {
                    currentMana -= 1;
                    landPool--;
                    this.broadcastGameState(this.gameId);
                    await this.delay(this.actionDelay);
                }
            }
        }

        // Sort units by mana cost (cheapest first)
        const sortedUnits = [...hand].sort((a, b) => (a.cost || a.manaCost || 0) - (b.cost || b.manaCost || 0));

        for (const card of sortedUnits) {
            const cost = card.cost || card.manaCost || 0;

            if (cost <= currentMana && fieldSize < 6) {
                console.log(`[Bot ${this.botName}] Playing ${card.name} (cost: ${cost})`);

                const result = this.gameManager.playCard(this.gameId, this.botId, card.instanceId, null);
                if (result.success) {
                    currentMana -= cost;
                    fieldSize++;
                    this.broadcastGameState(this.gameId);
                    await this.delay(this.actionDelay);
                }
            }
        }
    }

    async attackWithUnits(state) {
        if (!state) return;

        const myUnits = (state.you.field || []).filter(u => u.canAttack);
        const enemyUnits = state.opponent.field || [];
        const enemyLands = state.opponent.lands || [];
        const tauntUnits = enemyUnits.filter(u => u.abilities && u.abilities.includes('taunt'));
        const hasTaunt = tauntUnits.length > 0;

        for (const unit of myUnits) {
            // Skip pacifist units
            if (unit.abilities && unit.abilities.includes('pacifist')) continue;

            let target;

            if (hasTaunt) {
                // Must attack taunt
                target = {
                    type: 'unit',
                    playerId: state.opponent.id,
                    instanceId: tauntUnits[0].instanceId
                };
            } else if (enemyUnits.length > 0 && Math.random() > 0.4) {
                // 60% chance to attack a unit
                const randomUnit = enemyUnits[Math.floor(Math.random() * enemyUnits.length)];
                target = {
                    type: 'unit',
                    playerId: state.opponent.id,
                    instanceId: randomUnit.instanceId
                };
            } else if (enemyLands.length > 0 && Math.random() > 0.7) {
                // 30% chance to attack a land
                const randomLand = enemyLands[Math.floor(Math.random() * enemyLands.length)];
                target = {
                    type: 'land',
                    playerId: state.opponent.id,
                    instanceId: randomLand.instanceId
                };
            } else {
                // Attack hero
                target = {
                    type: 'hero',
                    playerId: state.opponent.id
                };
            }

            console.log(`[Bot ${this.botName}] ${unit.name} attacking ${target.type}`);
            const result = this.gameManager.attack(this.gameId, this.botId, unit.instanceId, target);
            if (result.success) {
                this.broadcastGameState(this.gameId);
                await this.delay(this.actionDelay);
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ServerBot;
