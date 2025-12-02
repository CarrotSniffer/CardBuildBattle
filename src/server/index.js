const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GameManager = require('./GameManager');
const db = require('./database');
const auth = require('./auth');
const { validateCard, POSITIVE_TRAITS, NEGATIVE_TRAITS, POINT_BUDGET, BASE_STATS, STAT_COSTS } = require('../shared/pointSystem');

const app = express();
const server = http.createServer(app);

// Trust proxy for platforms like Railway, Render, Heroku
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json());

// WebSocket server with ping/pong to keep connections alive
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Initialize database
db.initializeDatabase();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Setup auth routes
auth.setupAuthRoutes(app);

// Game manager instance
const gameManager = new GameManager();

// Connected players
const players = new Map();

// Health check endpoint for hosting platforms
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', players: players.size });
});

// ===== CARD API ROUTES =====

// Get point system info (public)
app.get('/api/point-system', (req, res) => {
    res.json({
        budget: POINT_BUDGET,
        baseStats: BASE_STATS,
        statCosts: STAT_COSTS,
        positiveTraits: POSITIVE_TRAITS,
        negativeTraits: NEGATIVE_TRAITS
    });
});

// Get user's cards
app.get('/api/cards', auth.authMiddleware, (req, res) => {
    try {
        const cards = db.getCardsByUser(req.user.id);
        res.json({ cards });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new card
app.post('/api/cards', auth.authMiddleware, (req, res) => {
    try {
        const cardData = req.body;

        // Validate card
        const validation = validateCard(cardData);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        // Create card
        const card = db.createCard(req.user.id, {
            name: cardData.name,
            attack: cardData.attack,
            health: cardData.health,
            manaCost: cardData.manaCost,
            traits: cardData.traits || [],
            pointTotal: validation.pointCost
        });

        res.json({ card });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a card
app.put('/api/cards/:id', auth.authMiddleware, (req, res) => {
    try {
        const cardData = req.body;

        // Validate card
        const validation = validateCard(cardData);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        // Update card
        const success = db.updateCard(req.params.id, req.user.id, {
            name: cardData.name,
            attack: cardData.attack,
            health: cardData.health,
            manaCost: cardData.manaCost,
            traits: cardData.traits || [],
            pointTotal: validation.pointCost
        });

        if (!success) {
            return res.status(404).json({ error: 'Card not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a card
app.delete('/api/cards/:id', auth.authMiddleware, (req, res) => {
    try {
        const success = db.deleteCard(req.params.id, req.user.id);
        if (!success) {
            return res.status(404).json({ error: 'Card not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== DECK API ROUTES =====

// Get user's decks
app.get('/api/decks', auth.authMiddleware, (req, res) => {
    try {
        const decks = db.getDecksByUser(req.user.id);
        res.json({ decks });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new deck
app.post('/api/decks', auth.authMiddleware, (req, res) => {
    try {
        const { name, cardList } = req.body;

        // Validate deck
        const validation = validateDeck(cardList, req.user.id);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        // Create deck
        const deck = db.createDeck(req.user.id, { name, cardList });
        res.json({ deck });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a deck
app.put('/api/decks/:id', auth.authMiddleware, (req, res) => {
    try {
        const { name, cardList } = req.body;

        // Validate deck
        const validation = validateDeck(cardList, req.user.id);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.errors.join(', ') });
        }

        const success = db.updateDeck(req.params.id, req.user.id, { name, cardList });
        if (!success) {
            return res.status(404).json({ error: 'Deck not found' });
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a deck
app.delete('/api/decks/:id', auth.authMiddleware, (req, res) => {
    try {
        const success = db.deleteDeck(req.params.id, req.user.id);
        if (!success) {
            return res.status(404).json({ error: 'Deck not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Deck validation helper
function validateDeck(cardList, userId) {
    const errors = [];

    if (!cardList || !Array.isArray(cardList)) {
        errors.push('Card list must be an array');
        return { valid: false, errors };
    }

    // Count total cards
    let totalCards = 0;
    const cardCounts = {};

    cardList.forEach(item => {
        totalCards += item.count || 1;
        cardCounts[item.cardId] = (cardCounts[item.cardId] || 0) + (item.count || 1);
    });

    // Check total cards
    if (totalCards !== 25) {
        errors.push(`Deck must have exactly 25 cards (has ${totalCards})`);
    }

    // Check max copies
    for (const [cardId, count] of Object.entries(cardCounts)) {
        if (count > 3) {
            errors.push(`Cannot have more than 3 copies of a card`);
            break;
        }
    }

    // Check minimum unique cards
    if (Object.keys(cardCounts).length < 5) {
        errors.push('Deck must have at least 5 unique cards');
    }

    // Verify all cards exist and belong to user
    const userCards = db.getCardsByUser(userId);
    const userCardIds = new Set(userCards.map(c => c.id));

    cardList.forEach(item => {
        if (!userCardIds.has(item.cardId)) {
            errors.push(`Card ${item.cardId} not found in your collection`);
        }
    });

    return { valid: errors.length === 0, errors };
}

// ===== WEBSOCKET HANDLING =====

wss.on('connection', (ws) => {
    const playerId = uuidv4();

    // Setup ping/pong for connection keep-alive
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    players.set(playerId, { ws, gameId: null });

    console.log(`Player connected: ${playerId}`);

    // Send player their ID
    ws.send(JSON.stringify({
        type: 'connected',
        playerId: playerId
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(playerId, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log(`Player disconnected: ${playerId}`);
        const player = players.get(playerId);
        if (player && player.gameId) {
            gameManager.handleDisconnect(playerId, player.gameId);
            notifyOpponent(playerId, player.gameId, {
                type: 'opponent_disconnected'
            });
        }
        players.delete(playerId);
    });
});

function handleMessage(playerId, data) {
    const player = players.get(playerId);

    switch (data.type) {
        case 'find_game':
            handleFindGame(playerId);
            break;

        case 'play_card':
            if (player.gameId) {
                const result = gameManager.playCard(player.gameId, playerId, data.cardId, data.target);
                if (result.success) {
                    broadcastGameState(player.gameId);
                } else {
                    sendToPlayer(playerId, { type: 'error', message: result.message });
                }
            }
            break;

        case 'play_land':
            if (player.gameId) {
                const result = gameManager.playLand(player.gameId, playerId);
                if (result.success) {
                    broadcastGameState(player.gameId);
                } else {
                    sendToPlayer(playerId, { type: 'error', message: result.message });
                }
            }
            break;

        case 'attack':
            if (player.gameId) {
                const result = gameManager.attack(player.gameId, playerId, data.attackerId, data.target);
                if (result.success) {
                    broadcastGameState(player.gameId);
                } else {
                    sendToPlayer(playerId, { type: 'error', message: result.message });
                }
            }
            break;

        case 'end_turn':
            if (player.gameId) {
                const result = gameManager.endTurn(player.gameId, playerId);
                if (result.success) {
                    broadcastGameState(player.gameId);
                } else {
                    sendToPlayer(playerId, { type: 'error', message: result.message });
                }
            }
            break;

        case 'select_deck':
            if (player.gameId) {
                gameManager.selectDeck(player.gameId, playerId, data.deckId);
            }
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

// Matchmaking queue
const matchmakingQueue = [];

function handleFindGame(playerId) {
    // Check if player is already in queue
    if (matchmakingQueue.includes(playerId)) {
        return;
    }

    // Add to queue
    matchmakingQueue.push(playerId);
    sendToPlayer(playerId, { type: 'searching' });

    // If we have 2 players, create a game
    if (matchmakingQueue.length >= 2) {
        const player1Id = matchmakingQueue.shift();
        const player2Id = matchmakingQueue.shift();

        const gameId = gameManager.createGame(player1Id, player2Id);

        players.get(player1Id).gameId = gameId;
        players.get(player2Id).gameId = gameId;

        // Notify both players
        sendToPlayer(player1Id, {
            type: 'game_found',
            gameId,
            opponent: 'Player 2'
        });
        sendToPlayer(player2Id, {
            type: 'game_found',
            gameId,
            opponent: 'Player 1'
        });

        // Send initial game state
        broadcastGameState(gameId);
    }
}

function sendToPlayer(playerId, data) {
    const player = players.get(playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(data));
    }
}

function notifyOpponent(playerId, gameId, data) {
    const game = gameManager.getGame(gameId);
    if (game) {
        const opponentId = game.player1Id === playerId ? game.player2Id : game.player1Id;
        sendToPlayer(opponentId, data);
    }
}

function broadcastGameState(gameId) {
    const game = gameManager.getGame(gameId);
    if (!game) return;

    // Send personalized game state to each player (hide opponent's hand)
    [game.player1Id, game.player2Id].forEach(pId => {
        const state = gameManager.getGameStateForPlayer(gameId, pId);
        sendToPlayer(pId, {
            type: 'game_state',
            state
        });
    });
}

// Keep WebSocket connections alive with ping/pong
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});

// Bind to 0.0.0.0 for external access
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
});
