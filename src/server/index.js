const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const GameManager = require('./GameManager');
const LobbyManager = require('./LobbyManager');
const ServerBot = require('./ServerBot');
const db = require('./database');
const auth = require('./auth');
const { validateCard, POSITIVE_TRAITS, NEGATIVE_TRAITS, POINT_BUDGET, BASE_STATS, STAT_COSTS, MAX_TRAITS } = require('../shared/pointSystem');
const { CARD_SPRITES, getAvailableSprites, getSpriteById } = require('../shared/cardSprites');

// Performance: Force garbage collection periodically if exposed
if (global.gc) {
    setInterval(() => {
        global.gc();
    }, 60000); // Every minute
}

const app = express();
const server = http.createServer(app);

// Performance: Increase max listeners to prevent memory leak warnings
server.setMaxListeners(50);

// Trust proxy for platforms like Railway, Render, Heroku
app.set('trust proxy', 1);

// Parse JSON bodies with size limit for performance
app.use(express.json({ limit: '1mb' }));

// Performance: Disable etag for faster responses
app.set('etag', false);

// WebSocket server with ping/pong to keep connections alive
// Performance: Optimized settings for lower latency
const wss = new WebSocket.Server({
    server,
    perMessageDeflate: false, // Disable compression for lower latency (trades bandwidth for speed)
    maxPayload: 1024 * 1024   // 1MB max payload
});

// Performance: Debounce tracking for game state broadcasts
const pendingBroadcasts = new Map();
const BROADCAST_DEBOUNCE_MS = 16; // ~60fps max update rate

const PORT = process.env.PORT || 3000;

// Initialize database
db.initializeDatabase();

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Setup auth routes
auth.setupAuthRoutes(app);

// Game manager instance
const gameManager = new GameManager();

// Lobby manager instance
const lobbyManager = new LobbyManager();

// Connected players: playerId -> { ws, gameId, lobbyId, userId, username }
const players = new Map();

// Active bots: botId -> ServerBot instance
const activeBots = new Map();

// Expose stats for cluster mode monitoring
global.activeConnections = 0;
global.activeGames = 0;
setInterval(() => {
    global.activeConnections = players.size;
    global.activeGames = gameManager.games ? gameManager.games.size : 0;
}, 5000);

// Health check endpoint for hosting platforms
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', players: players.size });
});

// ===== CARD API ROUTES =====

// Get point system info (public)
app.get('/api/point-system', (req, res) => {
    res.json({
        budget: POINT_BUDGET,
        maxTraits: MAX_TRAITS,
        baseStats: BASE_STATS,
        statCosts: STAT_COSTS,
        positiveTraits: POSITIVE_TRAITS,
        negativeTraits: NEGATIVE_TRAITS
    });
});

// Get available sprites for card (based on traits)
app.get('/api/sprites', (req, res) => {
    const traits = req.query.traits ? req.query.traits.split(',') : [];
    const sprites = getAvailableSprites(traits);
    res.json({ sprites });
});

// Get all sprites (for reference)
app.get('/api/sprites/all', (req, res) => {
    res.json({ sprites: CARD_SPRITES });
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

        // Check for duplicate card (same stats/traits, different name)
        const sortedTraits = (cardData.traits || []).sort();
        const duplicate = db.findDuplicateCard(req.user.id, {
            attack: cardData.attack,
            health: cardData.health,
            manaCost: cardData.manaCost,
            traits: sortedTraits
        });

        if (duplicate) {
            return res.status(400).json({
                error: `A card with these exact stats and traits already exists: "${duplicate.name}"`
            });
        }

        // Validate sprite if provided
        if (cardData.spriteId) {
            const sprite = getSpriteById(cardData.spriteId);
            const availableSprites = getAvailableSprites(sortedTraits);
            if (!availableSprites.find(s => s.id === cardData.spriteId)) {
                return res.status(400).json({ error: 'Invalid sprite for card traits' });
            }
        }

        // Create card
        const card = db.createCard(req.user.id, {
            name: cardData.name,
            attack: cardData.attack,
            health: cardData.health,
            manaCost: cardData.manaCost,
            traits: sortedTraits,
            pointTotal: validation.pointCost,
            spriteId: cardData.spriteId || null
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
            pointTotal: validation.pointCost,
            spriteId: cardData.spriteId || null
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

    // Check total cards (25 custom cards - 7 lands are added automatically at game start)
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

// ===== LOBBY API ROUTES =====

// Get open lobbies
app.get('/api/lobbies', auth.authMiddleware, (req, res) => {
    try {
        const lobbies = lobbyManager.getOpenLobbies();
        res.json({ lobbies });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== WEBSOCKET HANDLING =====

wss.on('connection', (ws) => {
    const playerId = uuidv4();

    // Setup ping/pong for connection keep-alive
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    players.set(playerId, { ws, gameId: null, lobbyId: null, userId: null, username: null });

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

        if (player) {
            // Handle lobby disconnect
            if (player.lobbyId) {
                const result = lobbyManager.leaveLobby(player.lobbyId, playerId);
                if (result && result.guestId && result.closed) {
                    // Notify guest that host left
                    sendToPlayer(result.guestId, { type: 'lobby_closed', message: 'Host left the lobby' });
                }
            }

            // Handle game disconnect
            if (player.gameId) {
                gameManager.handleDisconnect(playerId, player.gameId);
                notifyOpponent(playerId, player.gameId, {
                    type: 'opponent_disconnected'
                });
            }
        }

        players.delete(playerId);
    });
});

function handleMessage(playerId, data) {
    const player = players.get(playerId);

    switch (data.type) {
        // ===== AUTHENTICATION =====
        case 'authenticate':
            // Link WebSocket to user account
            player.userId = data.userId;
            player.username = data.username;
            sendToPlayer(playerId, { type: 'authenticated', username: data.username });
            break;

        // ===== LOBBY SYSTEM =====
        case 'create_lobby':
            handleCreateLobby(playerId, data.deckId);
            break;

        case 'join_lobby':
            handleJoinLobby(playerId, data.lobbyId, data.deckId);
            break;

        case 'leave_lobby':
            handleLeaveLobby(playerId);
            break;

        case 'start_game':
            handleStartGame(playerId);
            break;

        case 'get_lobbies':
            sendToPlayer(playerId, {
                type: 'lobby_list',
                lobbies: lobbyManager.getOpenLobbies()
            });
            break;

        case 'add_bot':
            handleAddBot(playerId);
            break;

        // ===== GAME ACTIONS =====
        case 'play_card':
            if (player.gameId) {
                const result = gameManager.playCard(player.gameId, playerId, data.cardId, data.target, data.position);
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
                    // Clear lastEvent after broadcast so it doesn't replay
                    const game = gameManager.getGame(player.gameId);
                    if (game) game.clearLastEvent();
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

        case 'confirm_card_selection':
            if (player.gameId) {
                const result = gameManager.confirmCardSelection(player.gameId, playerId, data.selectedCardIds || []);
                if (result.success) {
                    // Send cycle animation data to the player who cycled
                    if (result.cycleAnimation && (result.cycleAnimation.discardedCards.length > 0 || result.cycleAnimation.drawnCards.length > 0)) {
                        sendToPlayer(playerId, {
                            type: 'card_cycle_animation',
                            discardedCards: result.cycleAnimation.discardedCards,
                            drawnCards: result.cycleAnimation.drawnCards
                        });
                    }
                    // Broadcast game state after a delay to allow animation
                    setTimeout(() => {
                        broadcastGameState(player.gameId);
                    }, result.cycleAnimation && result.cycleAnimation.discardedCards.length > 0 ? 1500 : 0);
                } else {
                    sendToPlayer(playerId, { type: 'error', message: result.message });
                }
            }
            break;

        case 'skip_card_selection':
            if (player.gameId) {
                const result = gameManager.skipCardSelection(player.gameId, playerId);
                if (result.success) {
                    broadcastGameState(player.gameId);
                } else {
                    sendToPlayer(playerId, { type: 'error', message: result.message });
                }
            }
            break;

        case 'leave_game':
            if (player.gameId) {
                gameManager.handleDisconnect(playerId, player.gameId);
                notifyOpponent(playerId, player.gameId, {
                    type: 'opponent_left'
                });
                player.gameId = null;
            }
            break;

        default:
            console.log('Unknown message type:', data.type);
    }
}

// ===== LOBBY HANDLERS =====

function handleCreateLobby(playerId, deckId) {
    const player = players.get(playerId);
    if (!player || !player.username) {
        sendToPlayer(playerId, { type: 'error', message: 'Please log in first' });
        return;
    }

    if (!deckId) {
        sendToPlayer(playerId, { type: 'error', message: 'Please select a deck' });
        return;
    }

    // Leave any existing lobby
    if (player.lobbyId) {
        lobbyManager.leaveLobby(player.lobbyId, playerId);
    }

    const lobby = lobbyManager.createLobby(playerId, player.username, deckId);
    player.lobbyId = lobby.id;

    sendToPlayer(playerId, {
        type: 'lobby_created',
        lobby: {
            id: lobby.id,
            hostName: lobby.hostName,
            status: lobby.status
        }
    });

    // Broadcast updated lobby list to all players
    broadcastLobbyList();
}

function handleJoinLobby(playerId, lobbyId, deckId) {
    const player = players.get(playerId);
    if (!player || !player.username) {
        sendToPlayer(playerId, { type: 'error', message: 'Please log in first' });
        return;
    }

    if (!deckId) {
        sendToPlayer(playerId, { type: 'error', message: 'Please select a deck' });
        return;
    }

    // Leave any existing lobby
    if (player.lobbyId) {
        lobbyManager.leaveLobby(player.lobbyId, playerId);
    }

    const result = lobbyManager.joinLobby(lobbyId, playerId, player.username, deckId);

    if (!result.success) {
        sendToPlayer(playerId, { type: 'error', message: result.message });
        return;
    }

    player.lobbyId = lobbyId;

    // Notify both players
    sendToPlayer(playerId, {
        type: 'lobby_joined',
        lobby: {
            id: result.lobby.id,
            hostName: result.lobby.hostName,
            guestName: result.lobby.guestName,
            status: result.lobby.status
        }
    });

    // Notify host that guest joined
    sendToPlayer(result.lobby.hostId, {
        type: 'lobby_guest_joined',
        guestName: player.username,
        lobby: {
            id: result.lobby.id,
            hostName: result.lobby.hostName,
            guestName: result.lobby.guestName,
            status: result.lobby.status
        }
    });

    // Broadcast updated lobby list
    broadcastLobbyList();
}

function handleLeaveLobby(playerId) {
    const player = players.get(playerId);
    if (!player || !player.lobbyId) return;

    const result = lobbyManager.leaveLobby(player.lobbyId, playerId);
    player.lobbyId = null;

    sendToPlayer(playerId, { type: 'lobby_left' });

    if (result) {
        if (result.closed && result.guestId) {
            // Host left - notify guest
            const guestPlayer = players.get(result.guestId);
            if (guestPlayer) {
                guestPlayer.lobbyId = null;
                sendToPlayer(result.guestId, { type: 'lobby_closed', message: 'Host left the lobby' });
            }
        } else if (!result.closed && result.lobby) {
            // Guest left - notify host
            sendToPlayer(result.lobby.hostId, {
                type: 'lobby_guest_left',
                lobby: {
                    id: result.lobby.id,
                    hostName: result.lobby.hostName,
                    status: result.lobby.status
                }
            });
        }
    }

    // Broadcast updated lobby list
    broadcastLobbyList();
}

function handleStartGame(playerId) {
    const player = players.get(playerId);
    if (!player || !player.lobbyId) {
        sendToPlayer(playerId, { type: 'error', message: 'Not in a lobby' });
        return;
    }

    const lobby = lobbyManager.getLobby(player.lobbyId);
    if (!lobby) {
        sendToPlayer(playerId, { type: 'error', message: 'Lobby not found' });
        return;
    }

    if (lobby.hostId !== playerId) {
        sendToPlayer(playerId, { type: 'error', message: 'Only the host can start the game' });
        return;
    }

    if (lobby.status !== 'ready') {
        sendToPlayer(playerId, { type: 'error', message: 'Waiting for opponent to join' });
        return;
    }

    // Start the game
    const startedLobby = lobbyManager.startGame(player.lobbyId);
    if (!startedLobby) {
        sendToPlayer(playerId, { type: 'error', message: 'Failed to start game' });
        return;
    }

    // Check if guest is a bot
    const guestPlayer = players.get(lobby.guestId);
    const isGuestBot = guestPlayer && guestPlayer.isBot;

    // Create the game - use bot's built-in deck if it's a bot game
    let gameId;
    if (isGuestBot) {
        const bot = guestPlayer.botInstance;
        gameId = gameManager.createGameWithBotDeck(
            lobby.hostId,
            lobby.guestId,
            lobby.hostDeckId,
            bot.getBotDeck(),
            lobby.hostName,
            lobby.guestName
        );
        bot.startGame(gameId);
    } else {
        gameId = gameManager.createGame(
            lobby.hostId,
            lobby.guestId,
            lobby.hostDeckId,
            lobby.guestDeckId,
            lobby.hostName,
            lobby.guestName
        );
    }

    // Update player states
    const hostPlayer = players.get(lobby.hostId);

    if (hostPlayer) {
        hostPlayer.gameId = gameId;
        hostPlayer.lobbyId = null;
    }
    if (guestPlayer) {
        guestPlayer.gameId = gameId;
        guestPlayer.lobbyId = null;
    }

    // Notify both players
    sendToPlayer(lobby.hostId, {
        type: 'game_started',
        gameId,
        opponent: lobby.guestName
    });
    if (!isGuestBot) {
        sendToPlayer(lobby.guestId, {
            type: 'game_started',
            gameId,
            opponent: lobby.hostName
        });
    }

    // Send initial game state
    broadcastGameState(gameId);

    // Clean up lobby
    lobbyManager.deleteLobby(player.lobbyId);

    // Broadcast updated lobby list
    broadcastLobbyList();
}

function handleAddBot(playerId) {
    const player = players.get(playerId);
    if (!player || !player.lobbyId) {
        sendToPlayer(playerId, { type: 'error', message: 'Not in a lobby' });
        return;
    }

    const lobby = lobbyManager.getLobby(player.lobbyId);
    if (!lobby) {
        sendToPlayer(playerId, { type: 'error', message: 'Lobby not found' });
        return;
    }

    if (lobby.hostId !== playerId) {
        sendToPlayer(playerId, { type: 'error', message: 'Only the host can add a bot' });
        return;
    }

    if (lobby.status !== 'waiting') {
        sendToPlayer(playerId, { type: 'error', message: 'Lobby already has an opponent' });
        return;
    }

    // Create a server-side bot
    const bot = new ServerBot(gameManager, sendToPlayer, broadcastGameState);

    // Register bot as a virtual player (no WebSocket)
    players.set(bot.botId, {
        ws: { readyState: 1, send: () => {} }, // Fake ws that does nothing
        gameId: null,
        lobbyId: player.lobbyId,
        userId: bot.botId,
        username: bot.botName,
        isBot: true,
        botInstance: bot
    });

    // Join the lobby as the bot
    const result = lobbyManager.joinLobby(player.lobbyId, bot.botId, bot.botName, 'BOT_DECK');

    if (!result.success) {
        players.delete(bot.botId);
        sendToPlayer(playerId, { type: 'error', message: 'Failed to add bot: ' + result.message });
        return;
    }

    activeBots.set(bot.botId, bot);
    console.log(`[Server] Bot ${bot.botName} added to lobby ${player.lobbyId}`);

    // Notify host that bot joined
    sendToPlayer(playerId, {
        type: 'lobby_guest_joined',
        guestName: bot.botName,
        lobby: {
            id: result.lobby.id,
            hostName: result.lobby.hostName,
            guestName: result.lobby.guestName,
            status: result.lobby.status
        }
    });

    // Broadcast updated lobby list
    broadcastLobbyList();
}

// ===== UTILITY FUNCTIONS =====

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

    // Performance: Pre-serialize common data structure
    const baseMessage = { type: 'game_state' };

    // Send personalized game state to each player (hide opponent's hand)
    [game.player1Id, game.player2Id].forEach(pId => {
        const state = gameManager.getGameStateForPlayer(gameId, pId);
        const player = players.get(pId);

        // Check if this player is a bot
        if (player && player.isBot && player.botInstance) {
            // Notify the bot of the game state (no serialization needed)
            player.botInstance.onGameState(state);
        } else if (player && player.ws.readyState === WebSocket.OPEN) {
            // Performance: Direct send with pre-built message
            try {
                player.ws.send(JSON.stringify({ ...baseMessage, state }));
            } catch (e) {
                console.error('Error sending game state:', e.message);
            }
        }
    });
}

// Performance: Throttle lobby list broadcasts
let lobbyBroadcastPending = false;
let lastLobbyBroadcast = 0;
const LOBBY_BROADCAST_THROTTLE = 100; // Max 10 broadcasts per second

function broadcastLobbyList() {
    const now = Date.now();

    // Throttle broadcasts
    if (now - lastLobbyBroadcast < LOBBY_BROADCAST_THROTTLE) {
        if (!lobbyBroadcastPending) {
            lobbyBroadcastPending = true;
            setTimeout(() => {
                lobbyBroadcastPending = false;
                broadcastLobbyList();
            }, LOBBY_BROADCAST_THROTTLE);
        }
        return;
    }

    lastLobbyBroadcast = now;
    const lobbies = lobbyManager.getOpenLobbies();

    // Pre-serialize once for all recipients
    const message = JSON.stringify({ type: 'lobby_list', lobbies });

    players.forEach((player, playerId) => {
        if (player.ws.readyState === WebSocket.OPEN && !player.gameId) {
            // Only send to players not in a game
            try {
                player.ws.send(message);
            } catch (e) {
                // Ignore send errors
            }
        }
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

// Cleanup old lobbies every 5 minutes
setInterval(() => {
    lobbyManager.cleanup();
    gameManager.cleanup();
}, 5 * 60 * 1000);

wss.on('close', () => {
    clearInterval(interval);
});

// Bind to 0.0.0.0 for external access
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
});
