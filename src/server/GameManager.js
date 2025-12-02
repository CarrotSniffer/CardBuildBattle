const { v4: uuidv4 } = require('uuid');
const Game = require('../shared/Game');
const { CARDS } = require('../shared/cards');

class GameManager {
    constructor() {
        this.games = new Map();
    }

    createGame(player1Id, player2Id) {
        const gameId = uuidv4();
        const game = new Game(gameId, player1Id, player2Id);
        this.games.set(gameId, game);
        return gameId;
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    getGameStateForPlayer(gameId, playerId) {
        const game = this.games.get(gameId);
        if (!game) return null;
        return game.getStateForPlayer(playerId);
    }

    playCard(gameId, playerId, cardId, target) {
        const game = this.games.get(gameId);
        if (!game) {
            return { success: false, message: 'Game not found' };
        }
        return game.playCard(playerId, cardId, target);
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

    selectDeck(gameId, playerId, deckId) {
        const game = this.games.get(gameId);
        if (!game) return;
        game.selectDeck(playerId, deckId);
    }

    handleDisconnect(playerId, gameId) {
        const game = this.games.get(gameId);
        if (game) {
            game.handleDisconnect(playerId);
            // Remove game after a delay or immediately
            this.games.delete(gameId);
        }
    }
}

module.exports = GameManager;
