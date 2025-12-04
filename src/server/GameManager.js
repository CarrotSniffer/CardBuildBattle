const { v4: uuidv4 } = require('uuid');
const Game = require('../shared/Game');
const db = require('./database');

class GameManager {
    constructor() {
        this.games = new Map();
    }

    // Create a game with custom decks
    createGame(player1Id, player2Id, player1DeckId, player2DeckId, player1Name = 'Player 1', player2Name = 'Player 2') {
        const gameId = uuidv4();

        // Load deck data for each player
        const player1Deck = this.expandDeck(player1DeckId);
        const player2Deck = this.expandDeck(player2DeckId);

        const game = new Game(
            gameId,
            player1Id,
            player2Id,
            player1Deck,
            player2Deck,
            player1Name,
            player2Name
        );

        this.games.set(gameId, game);
        return gameId;
    }

    // Create a game with a bot (bot provides deck directly, player1 uses deckId)
    createGameWithBotDeck(player1Id, player2Id, player1DeckId, player2Deck, player1Name = 'Player 1', player2Name = 'Bot') {
        const gameId = uuidv4();

        // Load deck data for player 1, use provided deck for bot
        const player1Deck = this.expandDeck(player1DeckId);

        const game = new Game(
            gameId,
            player1Id,
            player2Id,
            player1Deck,
            player2Deck, // Bot deck is already expanded
            player1Name,
            player2Name
        );

        this.games.set(gameId, game);
        return gameId;
    }

    // Expand a deck from its ID to full card data
    expandDeck(deckId) {
        if (!deckId) return [];

        const deck = db.getDeckById(deckId);
        if (!deck || !deck.cardList) return [];

        const expandedCards = [];

        // cardList is array of { cardId, count }
        deck.cardList.forEach(entry => {
            const card = db.getCardById(entry.cardId);
            if (card) {
                // Add the card `count` times
                for (let i = 0; i < (entry.count || 1); i++) {
                    expandedCards.push({
                        id: card.id,
                        name: card.name,
                        attack: card.attack,
                        health: card.health,
                        manaCost: card.manaCost || card.mana_cost,
                        traits: card.traits || []
                    });
                }
            }
        });

        return expandedCards;
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    getGameStateForPlayer(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) return null;
        return game.getStateForPlayer(playerId);
    }

    playCard(gameId, playerId, cardId, target, position = null) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.playCard(playerId, cardId, target, position);
    }

    playLand(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.playLand(playerId);
    }

    attack(gameId, playerId, attackerId, target) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.attack(playerId, attackerId, target);
    }

    endTurn(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.endTurn(playerId);
    }

    confirmCardSelection(gameId, playerId, selectedCardIds) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.confirmCardSelection(playerId, selectedCardIds);
    }

    skipCardSelection(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.skipCardSelection(playerId);
    }

    handleDisconnect(playerId, gameId) {
        const game = this.games.get(gameId);
        if (game) {
            game.handleDisconnect(playerId);
            // Remove game after disconnect
            this.games.delete(gameId);
        }
    }

    // Clean up old games
    cleanup() {
        // Remove ended games older than 5 minutes
        const now = Date.now();
        this.games.forEach((game, gameId) => {
            if (game.phase === 'ended') {
                this.games.delete(gameId);
            }
        });
    }
}

module.exports = GameManager;
