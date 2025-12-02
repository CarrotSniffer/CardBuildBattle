const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'game.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables immediately (before prepared statements)
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        attack INTEGER NOT NULL,
        health INTEGER NOT NULL,
        mana_cost INTEGER NOT NULL,
        traits TEXT NOT NULL,
        point_total INTEGER NOT NULL,
        sprite_id TEXT DEFAULT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// Add sprite_id column if it doesn't exist (for existing databases)
try {
    db.exec(`ALTER TABLE cards ADD COLUMN sprite_id TEXT DEFAULT NULL`);
} catch (e) {
    // Column already exists, ignore
}

db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        card_list TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
`);

// Called from index.js (tables already created above)
function initializeDatabase() {
    console.log('Database initialized');
}

// User operations
const userOps = {
    create: db.prepare(`
        INSERT INTO users (id, username, password_hash)
        VALUES (?, ?, ?)
    `),

    findByUsername: db.prepare(`
        SELECT * FROM users WHERE username = ?
    `),

    findById: db.prepare(`
        SELECT id, username, created_at FROM users WHERE id = ?
    `)
};

// Card operations
const cardOps = {
    create: db.prepare(`
        INSERT INTO cards (id, user_id, name, attack, health, mana_cost, traits, point_total, sprite_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),

    findByUser: db.prepare(`
        SELECT * FROM cards WHERE user_id = ? ORDER BY created_at DESC
    `),

    findById: db.prepare(`
        SELECT * FROM cards WHERE id = ?
    `),

    findDuplicate: db.prepare(`
        SELECT * FROM cards
        WHERE user_id = ? AND attack = ? AND health = ? AND mana_cost = ? AND traits = ?
    `),

    update: db.prepare(`
        UPDATE cards
        SET name = ?, attack = ?, health = ?, mana_cost = ?, traits = ?, point_total = ?, sprite_id = ?
        WHERE id = ? AND user_id = ?
    `),

    delete: db.prepare(`
        DELETE FROM cards WHERE id = ? AND user_id = ?
    `)
};

// Deck operations
const deckOps = {
    create: db.prepare(`
        INSERT INTO decks (id, user_id, name, card_list)
        VALUES (?, ?, ?, ?)
    `),

    findByUser: db.prepare(`
        SELECT * FROM decks WHERE user_id = ? ORDER BY created_at DESC
    `),

    findById: db.prepare(`
        SELECT * FROM decks WHERE id = ?
    `),

    update: db.prepare(`
        UPDATE decks SET name = ?, card_list = ?
        WHERE id = ? AND user_id = ?
    `),

    delete: db.prepare(`
        DELETE FROM decks WHERE id = ? AND user_id = ?
    `)
};

// User functions
function createUser(username, passwordHash) {
    const id = uuidv4();
    try {
        userOps.create.run(id, username, passwordHash);
        return { id, username };
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            throw new Error('Username already exists');
        }
        throw error;
    }
}

function getUserByUsername(username) {
    return userOps.findByUsername.get(username);
}

function getUserById(id) {
    return userOps.findById.get(id);
}

// Card functions
function createCard(userId, cardData) {
    const id = uuidv4();
    const traits = JSON.stringify(cardData.traits || []);
    cardOps.create.run(
        id,
        userId,
        cardData.name,
        cardData.attack,
        cardData.health,
        cardData.manaCost,
        traits,
        cardData.pointTotal,
        cardData.spriteId || null
    );
    return { id, ...cardData, traits: cardData.traits || [], spriteId: cardData.spriteId || null };
}

// Check if a card with same stats/traits already exists (ignoring name)
function findDuplicateCard(userId, cardData) {
    const traits = JSON.stringify((cardData.traits || []).sort());
    const duplicate = cardOps.findDuplicate.get(
        userId,
        cardData.attack,
        cardData.health,
        cardData.manaCost,
        traits
    );
    return duplicate || null;
}

function getCardsByUser(userId) {
    const cards = cardOps.findByUser.all(userId);
    return cards.map(card => ({
        ...card,
        manaCost: card.mana_cost,
        pointTotal: card.point_total,
        traits: JSON.parse(card.traits),
        spriteId: card.sprite_id
    }));
}

function getCardById(id) {
    const card = cardOps.findById.get(id);
    if (!card) return null;
    return {
        ...card,
        manaCost: card.mana_cost,
        pointTotal: card.point_total,
        traits: JSON.parse(card.traits),
        spriteId: card.sprite_id
    };
}

function updateCard(id, userId, cardData) {
    const traits = JSON.stringify(cardData.traits || []);
    const result = cardOps.update.run(
        cardData.name,
        cardData.attack,
        cardData.health,
        cardData.manaCost,
        traits,
        cardData.pointTotal,
        cardData.spriteId || null,
        id,
        userId
    );
    return result.changes > 0;
}

function deleteCard(id, userId) {
    const result = cardOps.delete.run(id, userId);
    return result.changes > 0;
}

// Deck functions
function createDeck(userId, deckData) {
    const id = uuidv4();
    const cardList = JSON.stringify(deckData.cardList || []);
    deckOps.create.run(id, userId, deckData.name, cardList);
    return { id, ...deckData };
}

function getDecksByUser(userId) {
    const decks = deckOps.findByUser.all(userId);
    return decks.map(deck => ({
        ...deck,
        cardList: JSON.parse(deck.card_list)
    }));
}

function getDeckById(id) {
    const deck = deckOps.findById.get(id);
    if (!deck) return null;
    return {
        ...deck,
        cardList: JSON.parse(deck.card_list)
    };
}

function updateDeck(id, userId, deckData) {
    const cardList = JSON.stringify(deckData.cardList || []);
    const result = deckOps.update.run(deckData.name, cardList, id, userId);
    return result.changes > 0;
}

function deleteDeck(id, userId) {
    const result = deckOps.delete.run(id, userId);
    return result.changes > 0;
}

module.exports = {
    initializeDatabase,
    // Users
    createUser,
    getUserByUsername,
    getUserById,
    // Cards
    createCard,
    findDuplicateCard,
    getCardsByUser,
    getCardById,
    updateCard,
    deleteCard,
    // Decks
    createDeck,
    getDecksByUser,
    getDeckById,
    updateDeck,
    deleteDeck
};
