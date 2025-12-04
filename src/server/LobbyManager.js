const { v4: uuidv4 } = require('uuid');

class LobbyManager {
    constructor() {
        this.lobbies = new Map(); // lobbyId -> lobby data
    }

    createLobby(hostId, hostName, deckId) {
        const lobbyId = uuidv4().slice(0, 8); // Short ID for easier sharing
        const lobby = {
            id: lobbyId,
            hostId,
            hostName,
            hostDeckId: deckId,
            guestId: null,
            guestName: null,
            guestDeckId: null,
            createdAt: Date.now(),
            status: 'waiting' // 'waiting', 'ready', 'started'
        };
        this.lobbies.set(lobbyId, lobby);
        return lobby;
    }

    joinLobby(lobbyId, guestId, guestName, deckId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) {
            return { success: false, message: 'Lobby not found' };
        }
        if (lobby.status !== 'waiting') {
            return { success: false, message: 'Lobby is not available' };
        }
        if (lobby.hostId === guestId) {
            return { success: false, message: 'Cannot join your own lobby' };
        }

        lobby.guestId = guestId;
        lobby.guestName = guestName;
        lobby.guestDeckId = deckId;
        lobby.status = 'ready';

        return { success: true, lobby };
    }

    leaveLobby(lobbyId, playerId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return null;

        if (lobby.hostId === playerId) {
            // Host left - close lobby
            this.lobbies.delete(lobbyId);
            return { closed: true, guestId: lobby.guestId };
        } else if (lobby.guestId === playerId) {
            // Guest left - reopen lobby
            lobby.guestId = null;
            lobby.guestName = null;
            lobby.guestDeckId = null;
            lobby.status = 'waiting';
            return { closed: false, lobby };
        }
        return null;
    }

    startGame(lobbyId) {
        const lobby = this.lobbies.get(lobbyId);
        if (!lobby) return null;
        if (lobby.status !== 'ready') return null;

        lobby.status = 'started';
        return lobby;
    }

    deleteLobby(lobbyId) {
        this.lobbies.delete(lobbyId);
    }

    getLobby(lobbyId) {
        return this.lobbies.get(lobbyId);
    }

    getOpenLobbies() {
        const open = [];
        this.lobbies.forEach(lobby => {
            if (lobby.status === 'waiting') {
                open.push({
                    id: lobby.id,
                    hostName: lobby.hostName,
                    createdAt: lobby.createdAt
                });
            }
        });
        // Sort by newest first
        return open.sort((a, b) => b.createdAt - a.createdAt);
    }

    // Clean up old lobbies (older than 30 minutes)
    cleanup() {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes
        this.lobbies.forEach((lobby, id) => {
            if (lobby.status === 'waiting' && now - lobby.createdAt > maxAge) {
                this.lobbies.delete(id);
            }
        });
    }
}

module.exports = LobbyManager;
