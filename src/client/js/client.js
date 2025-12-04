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
        this.targetMode = null; // 'attack', 'position', null
        this.pendingCard = null; // Card waiting to be positioned
        this.selectedDeckId = null;
        this.myDecks = [];
        this.lobbies = [];
        this.currentLobby = null;
        this.isHost = false;
        this.lastPlayedAnimation = null; // Track last animation to avoid repeats
        this.tooltipElement = null; // Hover tooltip element
        this.tooltipTimeout = null; // Delay before showing tooltip
        this.selectedCardsForShuffle = []; // Cards selected to shuffle back into deck

        // Trait descriptions for tooltips
        this.traitDescriptions = {
            // Positive traits
            swift: { desc: 'Can attack immediately when played', positive: true },
            taunt: { desc: 'Enemies must attack this unit first', positive: true },
            ranged: { desc: 'Attacks without receiving counter-damage', positive: true },
            armor: { desc: 'Takes 1 less damage from all sources', positive: true },
            charge: { desc: 'Deals DOUBLE damage when attacking', positive: true },
            lifesteal: { desc: 'Heals your hero equal to damage dealt', positive: true },
            divine_shield: { desc: 'Blocks the first instance of damage', positive: true },
            inspire: { desc: 'Adjacent allies gain +1/+1 at end of turn', positive: true },
            piercing: { desc: 'Excess damage to units hits the enemy hero', positive: true },
            regenerate: { desc: 'Heals 1 health at start of your turn', positive: true },
            stealth: { desc: 'Cannot be targeted until it attacks', positive: true },
            deathtouch: { desc: 'Destroys any unit it damages', positive: true },
            frenzy: { desc: 'Can attack twice per turn', positive: true },
            thorns: { desc: 'Deals 1 damage to attackers', positive: true },
            rally: { desc: 'All allies gain +1 attack when played', positive: true },
            guardian: { desc: 'Adjacent allies take 1 less damage', positive: true },
            vampiric: { desc: 'Gains +1/+1 when it kills a unit', positive: true },
            retaliate: { desc: 'Deals double counter-attack damage', positive: true },
            elusive: { desc: 'Can only be blocked by units with 3+ attack', positive: true },
            leech: { desc: 'Drains 1 mana from opponent when attacking hero', positive: true },
            undying: { desc: 'Returns to hand when destroyed (once)', positive: true },
            overpower: { desc: 'Ignores armor trait', positive: true },
            warcry: { desc: 'Gains +2 attack on the turn it is played', positive: true },
            // Negative traits
            frail: { desc: 'Dies to ANY damage (1 damage = death)', positive: false },
            slow: { desc: 'Cannot attack for 1 turn after playing', positive: false },
            fragile: { desc: 'Takes DOUBLE damage', positive: false },
            costly: { desc: 'Costs 2 more mana to play', positive: false },
            exhausting: { desc: 'Lose 2 mana next turn', positive: false },
            soulbound: { desc: 'You lose 3 health when this dies', positive: false },
            volatile: { desc: 'Dies at the end of your turn', positive: false },
            pacifist: { desc: 'Can only attack enemy units (not heroes or lands)', positive: false },
            cursed: { desc: 'Cannot be healed or buffed', positive: false },
            clumsy: { desc: 'Has a 25% chance to miss attacks', positive: false },
            cowardly: { desc: 'Cannot attack units with higher attack', positive: false },
            reckless: { desc: 'Must attack each turn if able', positive: false },
            doomed: { desc: 'Dies after 3 turns on field', positive: false },
            vengeful: { desc: 'Deals 2 damage to your hero when destroyed', positive: false },
            exposed: { desc: 'Takes +1 damage from all sources', positive: false },
            draining: { desc: 'Costs 1 mana each turn to keep alive', positive: false },
            disloyal: { desc: 'Switches sides if opponent has more units', positive: false },
            brittle: { desc: 'Loses 1 attack each turn', positive: false }
        };

        this.init();
    }

    async init() {
        // Check auth first
        if (!Auth.requireAuth()) return;

        // Display username
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) usernameDisplay.textContent = Auth.user.username;

        // Load user's decks
        await this.loadDecks();

        // Initialize tooltip
        this.initTooltip();

        // Bind events
        this.bindEvents();

        // Connect to WebSocket
        this.connect();
    }

    // ===== Tooltip System =====
    initTooltip() {
        // Create tooltip element
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'card-tooltip';
        this.tooltipElement.innerHTML = '';
        document.body.appendChild(this.tooltipElement);
    }

    showTooltip(cardData, x, y) {
        if (!this.tooltipElement || !cardData) return;

        const isLand = cardData.type === 'land';
        const traits = cardData.traits || cardData.abilities || [];
        const manaCost = cardData.cost || cardData.manaCost || 0;

        // Build tooltip HTML
        let html = `
            <div class="tooltip-header">
                <span class="tooltip-name">${cardData.name}</span>
                <span class="tooltip-cost">${manaCost}</span>
            </div>
        `;

        if (isLand) {
            html += `<div class="tooltip-land-info">+1 Max Mana when on field<br>5 Health</div>`;
        } else {
            // Stats
            const attack = cardData.currentAttack !== undefined ? cardData.currentAttack : cardData.attack;
            const health = cardData.currentHealth !== undefined ? cardData.currentHealth : cardData.health;
            const maxHealth = cardData.health;

            html += `
                <div class="tooltip-stats">
                    <span class="tooltip-attack">&#9876; Attack: ${attack}</span>
                    <span class="tooltip-health">&#9829; Health: ${health}${health !== maxHealth ? '/' + maxHealth : ''}</span>
                </div>
            `;

            // Traits with descriptions
            if (traits.length > 0) {
                html += '<div class="tooltip-traits">';
                traits.forEach(trait => {
                    const traitInfo = this.traitDescriptions[trait];
                    if (traitInfo) {
                        html += `
                            <div class="tooltip-trait ${traitInfo.positive ? 'positive' : 'negative'}">
                                <div class="tooltip-trait-name">${trait.replace('_', ' ')}</div>
                                <div class="tooltip-trait-desc">${traitInfo.desc}</div>
                            </div>
                        `;
                    } else {
                        html += `
                            <div class="tooltip-trait">
                                <div class="tooltip-trait-name">${trait.replace('_', ' ')}</div>
                            </div>
                        `;
                    }
                });
                html += '</div>';
            }
        }

        this.tooltipElement.innerHTML = html;
        this.tooltipElement.classList.add('visible');

        // Position tooltip after making visible so we can measure it
        // Use requestAnimationFrame to ensure the browser has rendered the content
        requestAnimationFrame(() => {
            const tooltipRect = this.tooltipElement.getBoundingClientRect();
            const padding = 15;
            const tooltipWidth = Math.max(tooltipRect.width, 280);
            const tooltipHeight = tooltipRect.height;

            let left = x + padding;
            let top = y - padding;

            // Keep tooltip on screen horizontally
            if (left + tooltipWidth > window.innerWidth) {
                left = x - tooltipWidth - padding;
            }
            if (left < padding) {
                left = padding;
            }

            // For cards near the bottom (like hand cards), show tooltip ABOVE the cursor
            // Check if tooltip would go below screen
            if (top + tooltipHeight > window.innerHeight - padding) {
                // Show above cursor instead
                top = y - tooltipHeight - padding;
            }

            // If still off the top, clamp to top
            if (top < padding) {
                top = padding;
            }

            // Final safety: if tooltip is taller than viewport, just start at top
            if (tooltipHeight > window.innerHeight - 2 * padding) {
                top = padding;
            }

            this.tooltipElement.style.left = `${left}px`;
            this.tooltipElement.style.top = `${top}px`;
        });
    }

    hideTooltip() {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
        if (this.tooltipElement) {
            this.tooltipElement.classList.remove('visible');
        }
    }

    attachTooltipEvents(element, cardData) {
        element.addEventListener('mouseenter', (e) => {
            // Small delay before showing tooltip
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltip(cardData, e.clientX, e.clientY);
            }, 200);
        });

        element.addEventListener('mousemove', (e) => {
            if (this.tooltipElement && this.tooltipElement.classList.contains('visible')) {
                // Update position as mouse moves
                const tooltipRect = this.tooltipElement.getBoundingClientRect();
                const padding = 15;
                const tooltipWidth = Math.max(tooltipRect.width, 280);
                const tooltipHeight = tooltipRect.height;

                let left = e.clientX + padding;
                let top = e.clientY - padding;

                // Keep on screen horizontally
                if (left + tooltipWidth > window.innerWidth) {
                    left = e.clientX - tooltipWidth - padding;
                }
                if (left < padding) {
                    left = padding;
                }

                // For cards near bottom, show above cursor
                if (top + tooltipHeight > window.innerHeight - padding) {
                    top = e.clientY - tooltipHeight - padding;
                }
                if (top < padding) {
                    top = padding;
                }

                this.tooltipElement.style.left = `${left}px`;
                this.tooltipElement.style.top = `${top}px`;
            }
        });

        element.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
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
        const createBtn = document.getElementById('create-lobby-btn');

        if (!select) return;

        // Clear existing options
        select.innerHTML = '<option value="">-- Select a deck --</option>';

        if (this.myDecks.length === 0) {
            if (warning) warning.style.display = 'block';
            if (createBtn) createBtn.disabled = true;
            return;
        }

        if (warning) warning.style.display = 'none';

        this.myDecks.forEach(deck => {
            const total = deck.cardList.reduce((sum, c) => sum + c.count, 0);
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = `${deck.name} (${total} cards)`;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            this.selectedDeckId = select.value || null;
            if (createBtn) createBtn.disabled = !this.selectedDeckId;
        });
    }

    // ===== WebSocket Connection =====
    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('Connected to server');
            // Authenticate with server
            this.send({
                type: 'authenticate',
                userId: Auth.user.id,
                username: Auth.user.username
            });
            // Request lobby list
            this.send({ type: 'get_lobbies' });
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

            case 'authenticated':
                console.log('Authenticated as:', data.username);
                break;

            // ===== LOBBY EVENTS =====
            case 'lobby_list':
                this.lobbies = data.lobbies || [];
                this.renderLobbyList();
                break;

            case 'lobby_created':
                this.currentLobby = data.lobby;
                this.isHost = true;
                this.showLobbyWaiting();
                break;

            case 'lobby_joined':
                this.currentLobby = data.lobby;
                this.isHost = false;
                this.showLobbyReady();
                break;

            case 'lobby_guest_joined':
                this.currentLobby = data.lobby;
                this.showLobbyReady();
                break;

            case 'lobby_guest_left':
                this.currentLobby = data.lobby;
                this.showLobbyWaiting();
                this.showMessage('Opponent left the lobby');
                break;

            case 'lobby_left':
                this.currentLobby = null;
                this.isHost = false;
                this.showScreen('menu-screen');
                break;

            case 'lobby_closed':
                this.currentLobby = null;
                this.isHost = false;
                this.showScreen('menu-screen');
                this.showMessage(data.message || 'Lobby was closed', true);
                break;

            // ===== GAME EVENTS =====
            case 'game_started':
                this.showScreen('game-screen');
                this.showMessage(`Game started! Playing against ${data.opponent}`);
                break;

            case 'game_state':
                // Store animation event before updating state
                const pendingAnimation = data.state && data.state.lastEvent ? data.state.lastEvent : null;

                // Check if this is a NEW animation (not one we've already played)
                const isNewAnimation = pendingAnimation &&
                    (!this.lastPlayedAnimation ||
                     this.lastPlayedAnimation.attackerId !== pendingAnimation.attackerId ||
                     this.lastPlayedAnimation.targetId !== pendingAnimation.targetId ||
                     this.lastPlayedAnimation.timestamp !== pendingAnimation.timestamp);

                // Store if game ended - we'll show it after animation
                const gameEnded = data.state.phase === 'ended';
                const winner = data.state.winner;
                const winnerName = data.state.winnerName;

                // If we have a death animation to play, we need to render with dead units temporarily
                const hasDeathAnimation = pendingAnimation && pendingAnimation.deaths && pendingAnimation.deaths.length > 0 && isNewAnimation;

                if (hasDeathAnimation) {
                    // Store the previous state for comparison
                    const previousState = this.gameState;

                    // Create a temporary state with dead units included for animation
                    const tempState = JSON.parse(JSON.stringify(data.state));

                    // Add dead units back to the appropriate fields for animation
                    pendingAnimation.deaths.forEach(death => {
                        // Determine if it's your unit or opponent's unit
                        const isYourUnit = death.ownerId === tempState.you.id;
                        const targetField = isYourUnit ? tempState.you.field : tempState.opponent.field;

                        // Check if the unit is not already in the field
                        if (!targetField.find(u => u.instanceId === death.instanceId)) {
                            // Create placeholder unit for death animation
                            targetField.push({
                                instanceId: death.instanceId,
                                name: death.name,
                                currentHealth: 0,
                                health: 1,
                                currentAttack: 0,
                                attack: 0,
                                abilities: [],
                                markedForDeath: true // Flag for death animation
                            });
                        }
                    });

                    this.gameState = tempState;
                    this.pendingGameOver = gameEnded ? { winner, winnerName } : null;
                    this.render();

                    // Mark this animation as played
                    this.lastPlayedAnimation = pendingAnimation;

                    // Play animation then death animations
                    setTimeout(() => {
                        this.playAttackAnimationWithDeath(pendingAnimation, () => {
                            // After animation completes, render with the real state
                            this.gameState = data.state;
                            this.render();

                            // Show game over after final render
                            if (this.pendingGameOver) {
                                setTimeout(() => {
                                    this.showGameOver(this.pendingGameOver.winner, this.pendingGameOver.winnerName);
                                    this.pendingGameOver = null;
                                }, 200);
                            }
                        });
                    }, 50);
                } else {
                    // Normal flow without death animation
                    this.gameState = data.state;
                    this.pendingGameOver = gameEnded ? { winner, winnerName } : null;
                    this.render();

                    // Play animation AFTER render so elements exist (only if NEW)
                    if (pendingAnimation && isNewAnimation) {
                        const evt = pendingAnimation;
                        if (evt.type === 'attack_hero' || evt.type === 'attack_unit' || evt.type === 'attack_land') {
                            // Mark this animation as played
                            this.lastPlayedAnimation = pendingAnimation;
                            // Small delay to ensure DOM is updated
                            setTimeout(() => {
                                this.playAttackAnimation(evt);
                                // Show game over after animation completes (animation takes ~700ms)
                                if (this.pendingGameOver) {
                                    setTimeout(() => {
                                        this.showGameOver(this.pendingGameOver.winner, this.pendingGameOver.winnerName);
                                        this.pendingGameOver = null;
                                    }, 900);
                                }
                            }, 50);
                        }
                    } else if (gameEnded && !isNewAnimation) {
                        // No animation, show game over immediately
                        this.showGameOver(winner, winnerName);
                        this.pendingGameOver = null;
                    }
                }
                break;

            case 'card_cycle_animation':
                // Play the card cycling animation (discard then draw)
                this.playCardCycleAnimation(data.discardedCards, data.drawnCards);
                break;

            case 'error':
                this.showMessage(data.message, true);
                break;

            case 'opponent_disconnected':
            case 'opponent_left':
                this.showMessage('Opponent disconnected!', true);
                setTimeout(() => {
                    this.showScreen('menu-screen');
                    this.currentLobby = null;
                }, 2000);
                break;
        }
    }

    bindEvents() {
        // Menu buttons
        const createLobbyBtn = document.getElementById('create-lobby-btn');
        const refreshBtn = document.getElementById('refresh-lobbies-btn');
        const howToPlayBtn = document.getElementById('how-to-play-btn');
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        const playAgainBtn = document.getElementById('play-again-btn');

        if (createLobbyBtn) createLobbyBtn.onclick = () => this.createLobby();
        if (refreshBtn) refreshBtn.onclick = () => this.refreshLobbies();
        if (howToPlayBtn) howToPlayBtn.onclick = () => this.showScreen('rules-screen');
        if (backToMenuBtn) backToMenuBtn.onclick = () => this.showScreen('menu-screen');
        if (playAgainBtn) playAgainBtn.onclick = () => this.backToMenu();

        // Lobby buttons
        const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
        const startGameBtn = document.getElementById('start-game-btn');
        const addBotBtn = document.getElementById('add-bot-btn');

        if (leaveLobbyBtn) leaveLobbyBtn.onclick = () => this.leaveLobby();
        if (startGameBtn) startGameBtn.onclick = () => this.startGame();
        if (addBotBtn) addBotBtn.onclick = () => this.addBot();

        // Game buttons
        const endTurnBtn = document.getElementById('end-turn-btn');
        const cancelTargetBtn = document.getElementById('cancel-target-btn');
        const playLandBtn = document.getElementById('play-land-btn');

        if (endTurnBtn) endTurnBtn.onclick = () => this.endTurn();
        if (cancelTargetBtn) cancelTargetBtn.onclick = () => this.cancelTargeting();
        if (playLandBtn) playLandBtn.onclick = () => this.playLand();

        // Cancel targeting when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.targetMode) {
                this.cancelTargeting();
            }
        });
    }

    // ===== Lobby Actions =====
    createLobby() {
        if (!this.selectedDeckId) {
            this.showMessage('Please select a deck first!', true);
            return;
        }
        this.send({ type: 'create_lobby', deckId: this.selectedDeckId });
    }

    joinLobby(lobbyId) {
        if (!this.selectedDeckId) {
            this.showMessage('Please select a deck first!', true);
            return;
        }
        this.send({ type: 'join_lobby', lobbyId, deckId: this.selectedDeckId });
    }

    leaveLobby() {
        this.send({ type: 'leave_lobby' });
        this.currentLobby = null;
        this.isHost = false;
        this.showScreen('menu-screen');
    }

    startGame() {
        this.send({ type: 'start_game' });
    }

    refreshLobbies() {
        this.send({ type: 'get_lobbies' });
    }

    backToMenu() {
        this.gameState = null;
        this.currentLobby = null;
        this.showScreen('menu-screen');
        this.refreshLobbies();
    }

    // ===== Lobby UI =====
    renderLobbyList() {
        const container = document.getElementById('lobby-list');
        if (!container) return;

        if (this.lobbies.length === 0) {
            container.innerHTML = '<p class="no-lobbies">No open lobbies. Create one to start playing!</p>';
            return;
        }

        container.innerHTML = '';

        this.lobbies.forEach(lobby => {
            const el = document.createElement('div');
            el.className = 'lobby-item';

            const timeAgo = this.formatTimeAgo(lobby.createdAt);

            el.innerHTML = `
                <div class="lobby-info">
                    <span class="lobby-host">${lobby.hostName}'s Game</span>
                    <span class="lobby-time">${timeAgo}</span>
                </div>
                <button class="btn btn-primary join-btn">Join</button>
            `;

            el.querySelector('.join-btn').onclick = () => this.joinLobby(lobby.id);
            container.appendChild(el);
        });
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 120) return '1 minute ago';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        return 'Over an hour ago';
    }

    showLobbyWaiting() {
        this.showScreen('lobby-screen');

        const lobbyIdDisplay = document.getElementById('lobby-id-display');
        const lobbyHostName = document.getElementById('lobby-host-name');
        const lobbyGuestName = document.getElementById('lobby-guest-name');
        const lobbyStatus = document.getElementById('lobby-status');
        const startGameBtn = document.getElementById('start-game-btn');
        const addBotBtn = document.getElementById('add-bot-btn');

        if (lobbyIdDisplay) lobbyIdDisplay.textContent = this.currentLobby.id;
        if (lobbyHostName) lobbyHostName.textContent = this.currentLobby.hostName;
        if (lobbyGuestName) {
            lobbyGuestName.textContent = 'Waiting for opponent...';
            lobbyGuestName.classList.add('waiting');
        }
        if (lobbyStatus) lobbyStatus.textContent = 'Waiting for an opponent to join...';
        if (startGameBtn) {
            startGameBtn.disabled = true;
            startGameBtn.style.display = this.isHost ? 'block' : 'none';
        }
        if (addBotBtn) {
            addBotBtn.style.display = this.isHost ? 'inline-block' : 'none';
        }
    }

    addBot() {
        this.send({ type: 'add_bot' });
    }

    showLobbyReady() {
        this.showScreen('lobby-screen');

        const lobbyIdDisplay = document.getElementById('lobby-id-display');
        const lobbyHostName = document.getElementById('lobby-host-name');
        const lobbyGuestName = document.getElementById('lobby-guest-name');
        const lobbyStatus = document.getElementById('lobby-status');
        const startGameBtn = document.getElementById('start-game-btn');
        const addBotBtn = document.getElementById('add-bot-btn');

        if (lobbyIdDisplay) lobbyIdDisplay.textContent = this.currentLobby.id;
        if (lobbyHostName) lobbyHostName.textContent = this.currentLobby.hostName;
        if (lobbyGuestName) {
            lobbyGuestName.textContent = this.currentLobby.guestName;
            lobbyGuestName.classList.remove('waiting');
        }
        if (startGameBtn) {
            startGameBtn.style.display = this.isHost ? 'block' : 'none';
            startGameBtn.disabled = !this.isHost;
        }
        if (addBotBtn) addBotBtn.style.display = 'none';

        const statusText = this.isHost
            ? 'Opponent joined! Click Start Game to begin.'
            : 'Waiting for host to start the game...';
        if (lobbyStatus) lobbyStatus.textContent = statusText;
    }

    // ===== Game Actions =====
    endTurn() {
        if (!this.gameState || !this.gameState.isYourTurn) {
            this.showMessage('Not your turn!', true);
            return;
        }
        // If in card selection phase, don't allow ending turn
        if (this.gameState.inCardSelection) {
            this.showMessage('Select cards to shuffle back first!', true);
            return;
        }
        this.cancelTargeting();
        this.send({ type: 'end_turn' });
    }

    // Toggle card selection for shuffle back
    toggleCardForShuffle(card) {
        const idx = this.selectedCardsForShuffle.findIndex(c => c.instanceId === card.instanceId);
        if (idx !== -1) {
            this.selectedCardsForShuffle.splice(idx, 1);
        } else {
            this.selectedCardsForShuffle.push(card);
        }
        this.renderHandForSelection(this.gameState.you.hand);
    }

    // Confirm card selection - shuffle selected cards back and draw same amount
    confirmCardSelection() {
        const selectedIds = this.selectedCardsForShuffle.map(c => c.instanceId);
        this.send({
            type: 'confirm_card_selection',
            selectedCardIds: selectedIds
        });
        this.selectedCardsForShuffle = [];
    }

    // Skip card selection - keep all cards
    skipCardSelection() {
        this.send({ type: 'skip_card_selection' });
        this.selectedCardsForShuffle = [];
    }

    playLand() {
        // Play a land from the land pool (separate from hand)
        if (!this.gameState || !this.gameState.isYourTurn) {
            this.showMessage('Not your turn!', true);
            return;
        }

        const landPool = this.gameState.you.landPool || 0;
        if (landPool <= 0) {
            this.showMessage('No lands remaining!', true);
            return;
        }

        const landCost = this.gameState.landCost || 1;
        if (this.gameState.you.currentMana < landCost) {
            this.showMessage('Not enough mana!', true);
            return;
        }

        this.send({ type: 'play_land' });
    }

    playCard(card) {
        if (!this.gameState || !this.gameState.isYourTurn) {
            this.showMessage('Not your turn!', true);
            return;
        }

        // Get mana cost
        const manaCost = card.cost || card.manaCost || 0;

        // Check if we have enough mana
        if (this.gameState.you.currentMana < manaCost) {
            this.showMessage('Not enough mana!', true);
            return;
        }

        // Check if field is full
        const currentFieldSize = this.gameState.you.field.length;
        if (currentFieldSize >= 6) {
            this.showMessage('Field is full!', true);
            return;
        }

        // Enter position selection mode for units
        this.pendingCard = card;
        this.targetMode = 'position';
        this.showTargetOverlay(`Choose position for ${card.name}`);
        this.renderPositionSlots();
    }

    renderPositionSlots() {
        const container = document.getElementById('player-field');
        const existingUnits = this.gameState.you.field || [];

        // Clear and rebuild with position slots
        container.innerHTML = '';

        // Create slots for all 6 positions
        for (let i = 0; i <= existingUnits.length; i++) {
            // Add a position slot before/between/after units
            const slot = document.createElement('div');
            slot.className = 'position-slot';
            slot.dataset.position = i;
            slot.innerHTML = '<span>+</span>';
            slot.onclick = (e) => {
                e.stopPropagation();
                this.selectPosition(i);
            };
            container.appendChild(slot);

            // Add the unit at this position (if exists)
            if (i < existingUnits.length) {
                const unit = existingUnits[i];
                const cardEl = this.createUnitElement(unit, true);
                container.appendChild(cardEl);
            }
        }
    }

    selectPosition(position) {
        if (this.targetMode === 'position' && this.pendingCard) {
            this.send({
                type: 'play_card',
                cardId: this.pendingCard.instanceId,
                target: null,
                position: position
            });
            this.cancelTargeting();
        }
    }

    attackWith(unit) {
        if (!this.gameState || !this.gameState.isYourTurn) {
            this.showMessage('Not your turn!', true);
            return;
        }

        if (!unit.canAttack) {
            this.showMessage('This unit cannot attack yet!', true);
            return;
        }

        // Check if there are any valid targets
        const opponentField = this.gameState.opponent.field || [];
        const opponentLands = this.gameState.opponent.lands || [];
        const isPacifist = unit.abilities && unit.abilities.includes('pacifist');

        // Pacifist can only attack if there are enemy units
        if (isPacifist && opponentField.length === 0) {
            this.showMessage('Pacifist: No enemy units to attack!', true);
            return;
        }

        // Mark this unit as the attacker and enter target mode
        this.selectedAttacker = unit;
        this.targetMode = 'attack';

        // Highlight the attacking unit
        document.querySelectorAll('.card.attacking').forEach(el => el.classList.remove('attacking'));
        const attackerEl = document.querySelector(`[data-instance-id="${unit.instanceId}"]`);
        if (attackerEl) attackerEl.classList.add('attacking');

        // Build prompt message
        let prompt = `Select target for ${unit.name}`;
        if (isPacifist) prompt += ' (Pacifist: units only)';

        // Show target overlay
        this.showTargetOverlay(prompt);

        // Highlight valid targets
        this.highlightAttackTargets();
    }

    selectTarget(targetInfo) {
        if (this.targetMode === 'attack' && this.selectedAttacker) {
            // Validate pacifist restriction
            const isPacifist = this.selectedAttacker.abilities &&
                               this.selectedAttacker.abilities.includes('pacifist');

            if (isPacifist && targetInfo.type === 'hero') {
                this.showMessage('Pacifist: Cannot attack heroes!', true);
                return; // Don't cancel targeting, let them pick again
            }

            if (isPacifist && targetInfo.type === 'land') {
                this.showMessage('Pacifist: Can only attack units!', true);
                return;
            }

            this.send({
                type: 'attack',
                attackerId: this.selectedAttacker.instanceId,
                target: targetInfo
            });

            this.cancelTargeting();
        }
    }

    cancelTargeting() {
        this.selectedCard = null;
        this.selectedAttacker = null;
        this.pendingCard = null;
        this.targetMode = null;
        this.hideTargetOverlay();
        this.clearHighlights();
        // Re-render field to remove position slots
        if (this.gameState) {
            this.renderField('player-field', this.gameState.you.field, true);
        }
    }

    highlightAttackTargets() {
        const opponentField = this.gameState.opponent.field || [];
        const tauntUnits = opponentField.filter(u => u.abilities && u.abilities.includes('taunt'));
        const hasTaunt = tauntUnits.length > 0;
        const isPacifist = this.selectedAttacker &&
                          this.selectedAttacker.abilities &&
                          this.selectedAttacker.abilities.includes('pacifist');

        // Highlight opponent units
        const opponentUnits = document.querySelectorAll('#opponent-field .card');
        opponentUnits.forEach(el => {
            const instanceId = el.dataset.instanceId;
            if (hasTaunt) {
                // Only highlight taunt units
                const unit = opponentField.find(u => u.instanceId === instanceId);
                if (unit && unit.abilities && unit.abilities.includes('taunt')) {
                    el.classList.add('targetable');
                }
            } else {
                el.classList.add('targetable');
            }
        });

        // Highlight opponent lands (if no taunt AND not pacifist)
        if (!hasTaunt && !isPacifist) {
            const opponentLands = document.querySelectorAll('#opponent-lands .land-card');
            opponentLands.forEach(el => el.classList.add('targetable'));
        }

        // Highlight opponent hero (if no taunt AND not pacifist)
        if (!hasTaunt && !isPacifist) {
            const heroTarget = document.getElementById('opponent-hero-target');
            if (heroTarget) heroTarget.classList.add('targetable');
        }
    }

    clearHighlights() {
        document.querySelectorAll('.targetable').forEach(el => el.classList.remove('targetable'));
        document.querySelectorAll('.attacking').forEach(el => el.classList.remove('attacking'));
    }

    // ===== Rendering =====
    render() {
        if (!this.gameState) return;

        const state = this.gameState;

        // Update player info
        document.getElementById('player-health').textContent = state.you.health;
        document.getElementById('player-mana').textContent = `${state.you.currentMana}/${state.you.maxMana}`;
        document.getElementById('player-deck').textContent = state.you.deckCount;
        document.getElementById('player-lands-count').textContent = state.you.lands ? state.you.lands.length : 0;
        document.getElementById('player-name-display').textContent = state.you.name || 'You';

        document.getElementById('opponent-health').textContent = state.opponent.health;
        document.getElementById('opponent-mana').textContent = `${state.opponent.currentMana}/${state.opponent.maxMana}`;
        document.getElementById('opponent-deck').textContent = state.opponent.deckCount;
        document.getElementById('opponent-hand-count').textContent = state.opponent.handCount;
        document.getElementById('opponent-name-display').textContent = state.opponent.name || 'Opponent';

        // Update turn indicator
        const turnBadge = document.getElementById('turn-indicator');
        const turnText = document.getElementById('turn-text');
        const turnNumber = document.getElementById('turn-number');

        if (state.isYourTurn) {
            turnText.textContent = 'Your Turn';
            turnBadge.className = 'turn-badge your-turn';
        } else {
            turnText.textContent = "Opponent's Turn";
            turnBadge.className = 'turn-badge opponent-turn';
        }
        turnNumber.textContent = `Turn ${state.turnNumber}`;

        // Update buttons
        document.getElementById('end-turn-btn').disabled = !state.isYourTurn;

        // Update play land button - now based on land pool
        const landCost = state.landCost || 1;
        const landPool = state.you.landPool || 0;
        const playLandBtn = document.getElementById('play-land-btn');
        playLandBtn.disabled = !state.isYourTurn || state.you.currentMana < landCost || landPool === 0;
        playLandBtn.textContent = `+ Land (${landPool})`;
        playLandBtn.title = landPool > 0
            ? `Play a Mana Land (Cost: ${landCost}) - ${landPool} available`
            : 'No lands remaining';

        // Render game elements
        // If in card selection phase, use selection render
        if (state.inCardSelection) {
            this.renderHandForSelection(state.you.hand);
            this.showCardSelectionOverlay();
        } else {
            this.renderHand(state.you.hand);
            this.hideCardSelectionOverlay();
            this.selectedCardsForShuffle = []; // Clear selection when not in phase
        }
        this.renderField('player-field', state.you.field, true);
        this.renderField('opponent-field', state.opponent.field, false);
        this.renderLands('player-lands', state.you.lands || [], true);
        this.renderLands('opponent-lands', state.opponent.lands || [], false);
        this.renderEventLog(state.events || []);

        // Setup opponent hero target
        this.setupOpponentHeroTarget();

        // Note: Game over screen is now handled in game_state handler
        // to allow winning animations to play first
    }

    showCardSelectionOverlay() {
        let overlay = document.getElementById('card-selection-overlay');
        if (!overlay) {
            // Create the overlay if it doesn't exist
            overlay = document.createElement('div');
            overlay.id = 'card-selection-overlay';
            overlay.className = 'card-selection-overlay';
            overlay.innerHTML = `
                <div class="card-selection-prompt">
                    <h3>End of Turn - Card Selection</h3>
                    <p>Select cards to shuffle back into your deck.</p>
                    <p>You will draw the same number of new cards.</p>
                    <div class="selection-info">
                        <span>Selected: <span id="selection-count">0</span> cards</span>
                    </div>
                    <div class="selection-buttons">
                        <button id="confirm-selection-btn" class="btn btn-primary">Confirm & Draw</button>
                        <button id="skip-selection-btn" class="btn btn-secondary">Keep All Cards</button>
                    </div>
                </div>
            `;
            document.getElementById('game-screen').appendChild(overlay);

            // Bind button events
            document.getElementById('confirm-selection-btn').onclick = () => this.confirmCardSelection();
            document.getElementById('skip-selection-btn').onclick = () => this.skipCardSelection();
        }
        overlay.classList.remove('hidden');
        this.updateSelectionCount();
    }

    hideCardSelectionOverlay() {
        const overlay = document.getElementById('card-selection-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    setupOpponentHeroTarget() {
        const heroTarget = document.getElementById('opponent-hero-target');
        if (heroTarget) {
            heroTarget.style.cursor = 'pointer';
            heroTarget.onclick = (e) => {
                e.stopPropagation();
                if (this.targetMode === 'attack') {
                    this.selectTarget({
                        type: 'hero',
                        playerId: this.gameState.opponent.id
                    });
                }
            };
        }
    }

    renderHand(hand) {
        const container = document.getElementById('player-hand');
        container.innerHTML = '';

        hand.forEach(card => {
            const cardEl = this.createCardElement(card, true);
            cardEl.style.cursor = 'pointer';
            cardEl.onclick = (e) => {
                e.stopPropagation();
                this.hideTooltip(); // Hide tooltip when clicking
                this.playCard(card);
            };
            // Attach tooltip
            this.attachTooltipEvents(cardEl, card);
            container.appendChild(cardEl);
        });
    }

    // Render hand during card selection phase
    renderHandForSelection(hand) {
        const container = document.getElementById('player-hand');
        container.innerHTML = '';

        hand.forEach(card => {
            const cardEl = this.createCardElement(card, true);
            cardEl.style.cursor = 'pointer';

            // Check if card is selected for shuffle
            const isSelected = this.selectedCardsForShuffle.some(c => c.instanceId === card.instanceId);
            if (isSelected) {
                cardEl.classList.add('selected-for-shuffle');
            }

            cardEl.onclick = (e) => {
                e.stopPropagation();
                this.hideTooltip();
                this.toggleCardForShuffle(card);
            };
            // Attach tooltip
            this.attachTooltipEvents(cardEl, card);
            container.appendChild(cardEl);
        });

        // Update selection count display
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const countEl = document.getElementById('selection-count');
        if (countEl) {
            countEl.textContent = this.selectedCardsForShuffle.length;
        }
    }

    renderField(containerId, units, isPlayer) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        units.forEach(unit => {
            const cardEl = this.createUnitElement(unit, isPlayer);
            // Attach tooltip to field units
            this.attachTooltipEvents(cardEl, unit);
            container.appendChild(cardEl);
        });
    }

    renderLands(containerId, lands, isPlayer) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        lands.forEach(land => {
            const landEl = this.createLandElement(land, isPlayer);
            // Attach tooltip to lands
            this.attachTooltipEvents(landEl, { ...land, type: 'land', name: 'Mana Land', cost: 1 });
            container.appendChild(landEl);
        });
    }

    createLandElement(land, isPlayer) {
        const el = document.createElement('div');
        el.className = 'land-card';
        el.dataset.instanceId = land.instanceId;

        const healthClass = land.currentHealth < land.health ? 'damaged' : '';

        el.innerHTML = `
            <div class="land-icon">&#9632;</div>
            <div class="land-health ${healthClass}">${land.currentHealth}</div>
        `;

        // Enemy lands can be targeted when in attack mode
        if (!isPlayer) {
            el.style.cursor = 'pointer';
            el.onclick = (e) => {
                e.stopPropagation();
                this.hideTooltip();
                if (this.targetMode === 'attack') {
                    this.selectTarget({
                        type: 'land',
                        playerId: this.gameState.opponent.id,
                        instanceId: land.instanceId
                    });
                }
            };
        }

        return el;
    }

    createCardElement(card, inHand = false) {
        const el = document.createElement('div');
        el.className = 'card';
        el.dataset.instanceId = card.instanceId;

        // Get mana cost
        const manaCost = card.cost || card.manaCost || 0;

        // Check if this is a land card
        const isLand = card.type === 'land';

        // Check if playable
        if (inHand && this.gameState && this.gameState.isYourTurn && this.gameState.you.currentMana >= manaCost) {
            el.classList.add('playable');
        }

        if (isLand) {
            el.classList.add('land-card-hand');
            el.innerHTML = `
                <div class="card-cost">${manaCost}</div>
                <div class="card-name">${card.name}</div>
                <div class="land-card-icon">&#9632;</div>
                <div class="land-card-text">+1 Max Mana</div>
            `;
        } else {
            // Get traits/abilities
            const traits = card.traits || card.abilities || [];

            el.innerHTML = `
                <div class="card-cost">${manaCost}</div>
                <div class="card-name">${card.name}</div>
                ${traits.length > 0 ? `
                    <div class="abilities">
                        ${traits.map(a => `<span class="ability-tag ${a}">${a}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="card-stats">
                    <span class="card-attack">&#9876; ${card.attack}</span>
                    <span class="card-health">&#9829; ${card.health}</span>
                </div>
            `;
        }

        return el;
    }

    createUnitElement(unit, isPlayer) {
        const el = document.createElement('div');
        el.className = 'card field-unit';
        el.dataset.instanceId = unit.instanceId;

        // Add visual indicator for stealthed units
        if (unit.hasStealthActive) {
            el.classList.add('stealthed');
        }

        // Player units that can attack
        if (isPlayer && unit.canAttack && this.gameState && this.gameState.isYourTurn) {
            el.classList.add('can-attack');
            el.onclick = (e) => {
                e.stopPropagation();
                this.hideTooltip();
                this.attackWith(unit);
            };
        } else if (!isPlayer) {
            // Opponent units - make them clickable for targeting (but not if stealthed)
            if (unit.hasStealthActive) {
                el.style.cursor = 'not-allowed';
                el.onclick = (e) => {
                    e.stopPropagation();
                    this.showMessage('Cannot target stealthed units');
                };
            } else {
                el.style.cursor = 'pointer';
                el.onclick = (e) => {
                    e.stopPropagation();
                    this.hideTooltip();
                    if (this.targetMode === 'attack') {
                        this.selectTarget({
                            type: 'unit',
                            playerId: this.gameState.opponent.id,
                            instanceId: unit.instanceId
                        });
                    }
                };
            }
        }

        const healthClass = unit.currentHealth < unit.health ? 'damaged' : '';
        const traits = unit.traits || unit.abilities || [];

        el.innerHTML = `
            <div class="card-name">${unit.name}</div>
            ${traits.length > 0 ? `
                <div class="abilities">
                    ${traits.map(a => `<span class="ability-tag ${a}">${a}</span>`).join('')}
                </div>
            ` : ''}
            <div class="card-stats">
                <span class="card-attack">&#9876; ${unit.currentAttack}</span>
                <span class="card-health ${healthClass}">&#9829; ${unit.currentHealth}</span>
            </div>
        `;

        return el;
    }

    renderEventLog(events) {
        const container = document.getElementById('event-log');
        if (!container) return;

        container.innerHTML = '';

        // Show last 8 events
        events.slice(-8).forEach(event => {
            const el = document.createElement('div');
            el.className = 'event-item';
            el.textContent = this.formatEvent(event);
            container.appendChild(el);
        });

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    formatEvent(event) {
        switch (event.type) {
            case 'game_start':
                return `Game started!`;
            case 'unit_played':
                return `${event.cardName} played (${event.attack}/${event.health})`;
            case 'attack_hero':
                return `${event.attackerName} hit hero for ${event.damage}`;
            case 'attack_unit':
                return `${event.attackerName} attacks ${event.targetName}`;
            case 'attack_land':
                return `${event.attackerName} attacks land for ${event.damage}`;
            case 'unit_destroyed':
                return `${event.unitName} destroyed`;
            case 'land_played':
                return 'Mana Land played';
            case 'land_destroyed':
                return 'Mana Land destroyed';
            case 'turn_end':
                return `Turn ${event.turnNumber} begins`;
            case 'lifesteal':
                return `Healed ${event.amount} from lifesteal`;
            case 'divine_shield_broken':
                return `${event.unitName}'s Shield broken`;
            case 'charge_damage':
                return `Charge dealt ${event.damage} damage`;
            case 'volatile_damage':
                return `Volatile dealt 2 to both heroes`;
            case 'soulbound_damage':
                return `Soulbound dealt 2 damage`;
            case 'piercing_damage':
                return `Piercing dealt ${event.damage} to hero`;
            case 'fatigue':
                return `Fatigue dealt ${event.damage} damage`;
            case 'card_selection_start':
                return 'Selecting cards to cycle';
            case 'cards_shuffled_back':
                return `Cycled ${event.count} cards`;
            default:
                return event.type;
        }
    }

    // ===== UI Helpers =====
    showScreen(screenId) {
        document.querySelectorAll('#app .screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
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

    showGameOver(winner, winnerName) {
        let titleText, messageText;

        if (winner === 'draw') {
            titleText = 'Draw!';
            messageText = 'Both players were defeated simultaneously.';
        } else if (winner === this.playerId) {
            titleText = 'Victory!';
            messageText = 'You have defeated your opponent!';
        } else {
            titleText = 'Defeat';
            messageText = `${winnerName || 'Your opponent'} has won the game.`;
        }

        const titleEl = document.getElementById('gameover-title');
        const messageEl = document.getElementById('gameover-message');
        if (titleEl) titleEl.textContent = titleText;
        if (messageEl) messageEl.textContent = messageText;

        this.showScreen('gameover-screen');
    }

    // ===== Attack Animations =====
    animateAttack(attackerEl, targetEl, damage, onComplete) {
        if (!attackerEl || !targetEl) {
            if (onComplete) onComplete();
            return;
        }

        // Get positions
        const attackerRect = attackerEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        // Calculate movement - move 70% of the way to target for a more dynamic look
        const deltaX = (targetRect.left + targetRect.width / 2 - (attackerRect.left + attackerRect.width / 2)) * 0.7;
        const deltaY = (targetRect.top + targetRect.height / 2 - (attackerRect.top + attackerRect.height / 2)) * 0.7;

        // Store original values
        const originalTransform = attackerEl.style.transform || '';
        const originalZIndex = attackerEl.style.zIndex || '';
        const originalTransition = attackerEl.style.transition || '';

        // Wind up slightly before attack (pull back)
        attackerEl.style.zIndex = '1000';
        attackerEl.style.transition = 'transform 0.1s ease-out';
        attackerEl.style.transform = `translate(${-deltaX * 0.1}px, ${-deltaY * 0.1}px) scale(1.05)`;

        // Lunge forward after wind-up
        setTimeout(() => {
            attackerEl.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
            attackerEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        }, 100);

        // On impact
        setTimeout(() => {
            // Show damage number on target
            this.showDamageNumber(targetEl, damage);

            // Add shake effect to target
            targetEl.classList.add('hit-shake');

            // Return attacker with bounce
            attackerEl.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
            attackerEl.style.transform = originalTransform;

            setTimeout(() => {
                attackerEl.style.zIndex = originalZIndex;
                attackerEl.style.transition = originalTransition;
                targetEl.classList.remove('hit-shake');
                if (onComplete) onComplete();
            }, 250);
        }, 250);
    }

    showDamageNumber(targetEl, damage) {
        if (!targetEl || damage === undefined) return;

        const rect = targetEl.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'damage-popup';
        popup.textContent = damage > 0 ? `-${damage}` : `+${Math.abs(damage)}`;

        if (damage <= 0) {
            popup.classList.add('heal');
        }

        // Position above the target with slight random offset for visual variety
        const offsetX = (Math.random() - 0.5) * 20;
        popup.style.left = `${rect.left + rect.width / 2 + offsetX}px`;
        popup.style.top = `${rect.top + rect.height * 0.3}px`;

        document.body.appendChild(popup);

        // Remove after animation completes
        setTimeout(() => {
            popup.remove();
        }, 850);
    }

    // Called when we receive attack event from server
    playAttackAnimation(event) {
        if (!event) return;

        console.log('[Animation] Playing attack animation:', event);

        // Find attacker element
        const attackerEl = document.querySelector(`[data-instance-id="${event.attackerId}"]`);
        console.log('[Animation] Attacker element:', attackerEl);

        // Find target element based on type
        let targetEl = null;
        if (event.targetType === 'hero') {
            targetEl = event.targetPlayerId === this.gameState.opponent.id
                ? document.getElementById('opponent-hero-target')
                : document.getElementById('player-hero');
        } else if (event.targetType === 'unit') {
            targetEl = document.querySelector(`[data-instance-id="${event.targetId}"]`);
        } else if (event.targetType === 'land') {
            targetEl = document.querySelector(`#opponent-lands [data-instance-id="${event.targetId}"], #player-lands [data-instance-id="${event.targetId}"]`);
        }
        console.log('[Animation] Target element:', targetEl);

        if (attackerEl && targetEl) {
            this.animateAttack(attackerEl, targetEl, event.damage);
        } else {
            console.log('[Animation] Missing element - attacker:', !!attackerEl, 'target:', !!targetEl);
            // Still show damage number on target if we have it
            if (targetEl) {
                this.showDamageNumber(targetEl, event.damage);
            }
        }
    }

    // Play attack animation with death effects
    playAttackAnimationWithDeath(event, onComplete) {
        if (!event) {
            if (onComplete) onComplete();
            return;
        }

        console.log('[Animation] Playing attack with death animation:', event);

        const attackerEl = document.querySelector(`[data-instance-id="${event.attackerId}"]`);
        let targetEl = null;
        if (event.targetType === 'hero') {
            targetEl = event.targetPlayerId === this.gameState.opponent.id
                ? document.getElementById('opponent-hero-target')
                : document.getElementById('player-hero');
        } else if (event.targetType === 'unit') {
            targetEl = document.querySelector(`[data-instance-id="${event.targetId}"]`);
        } else if (event.targetType === 'land') {
            targetEl = document.querySelector(`#opponent-lands [data-instance-id="${event.targetId}"], #player-lands [data-instance-id="${event.targetId}"]`);
        }

        if (attackerEl && targetEl) {
            // Animation with callback for deaths
            this.animateAttack(attackerEl, targetEl, event.damage, () => {
                // Show counter damage if applicable
                if (event.counterDamage && event.counterDamage > 0) {
                    this.showDamageNumber(attackerEl, event.counterDamage);
                    attackerEl.classList.add('hit-shake');
                    setTimeout(() => attackerEl.classList.remove('hit-shake'), 300);
                }

                // After attack animation, play death animations
                setTimeout(() => {
                    if (event.deaths && event.deaths.length > 0) {
                        this.playDeathAnimations(event.deaths, onComplete);
                    } else {
                        if (onComplete) onComplete();
                    }
                }, 200);
            });
        } else {
            // No animation possible, just complete
            if (targetEl) this.showDamageNumber(targetEl, event.damage);
            if (event.deaths && event.deaths.length > 0) {
                this.playDeathAnimations(event.deaths, onComplete);
            } else {
                if (onComplete) onComplete();
            }
        }
    }

    // Play death animations for multiple units
    playDeathAnimations(deaths, onComplete) {
        if (!deaths || deaths.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        console.log('[Animation] Playing death animations for:', deaths);

        // Calculate total animation duration
        const staggerDelay = 100; // ms between each death
        const deathAnimDuration = 600; // ms for death animation
        const totalDuration = (deaths.length - 1) * staggerDelay + deathAnimDuration;

        deaths.forEach((death, index) => {
            const el = document.querySelector(`[data-instance-id="${death.instanceId}"]`);
            if (el) {
                // Stagger death animations slightly
                setTimeout(() => {
                    this.playDeathAnimation(el, death.name);
                }, index * staggerDelay);
            }
        });

        // Call onComplete after all animations finish
        setTimeout(() => {
            if (onComplete) onComplete();
        }, totalDuration);
    }

    // Play death animation for a single unit
    playDeathAnimation(element, unitName) {
        if (!element) return;

        console.log('[Animation] Playing death for:', unitName);

        // Add death class for animation
        element.classList.add('unit-dying');

        // Create death effect overlay
        const deathEffect = document.createElement('div');
        deathEffect.className = 'death-effect';
        deathEffect.innerHTML = '💀';
        element.appendChild(deathEffect);

        // Animation: shrink, fade, and shake
        element.style.transition = 'all 0.5s ease-out';
        element.style.transform = 'scale(0.3) rotate(15deg)';
        element.style.opacity = '0';
        element.style.filter = 'grayscale(1) brightness(0.5)';
    }

    // Play card cycling animation (discard cards, then draw new ones)
    playCardCycleAnimation(discardedCards, drawnCards) {
        if (!discardedCards || discardedCards.length === 0) return;

        console.log('[Animation] Playing card cycle - discarding:', discardedCards.length, 'drawing:', drawnCards.length);

        // Hide the card selection overlay immediately
        this.hideCardSelectionOverlay();

        const handContainer = document.getElementById('player-hand');
        const deckElement = document.querySelector('.deck-count');
        const deckRect = deckElement ? deckElement.getBoundingClientRect() : null;

        // Find the card elements that match discarded cards
        const cardElements = handContainer.querySelectorAll('.card');
        const discardedIds = discardedCards.map(c => c.instanceId);

        let animatedCount = 0;

        // Animate discarded cards flying to deck
        cardElements.forEach(cardEl => {
            const cardId = cardEl.dataset.instanceId;
            if (discardedIds.includes(cardId)) {
                animatedCount++;

                // Get current position
                const cardRect = cardEl.getBoundingClientRect();

                // Create a clone for the flying animation
                const flyingCard = cardEl.cloneNode(true);
                flyingCard.style.position = 'fixed';
                flyingCard.style.left = cardRect.left + 'px';
                flyingCard.style.top = cardRect.top + 'px';
                flyingCard.style.width = cardRect.width + 'px';
                flyingCard.style.height = cardRect.height + 'px';
                flyingCard.style.zIndex = '2000';
                flyingCard.style.transition = 'all 0.5s ease-in-out';
                flyingCard.style.pointerEvents = 'none';
                document.body.appendChild(flyingCard);

                // Hide original
                cardEl.style.visibility = 'hidden';

                // Animate to deck position (or up and fade)
                setTimeout(() => {
                    if (deckRect) {
                        flyingCard.style.left = (deckRect.left + deckRect.width / 2 - cardRect.width / 2) + 'px';
                        flyingCard.style.top = (deckRect.top + deckRect.height / 2 - cardRect.height / 2) + 'px';
                    } else {
                        flyingCard.style.top = (cardRect.top - 200) + 'px';
                    }
                    flyingCard.style.transform = 'scale(0.3) rotate(10deg)';
                    flyingCard.style.opacity = '0.3';
                }, 50);

                // Remove flying card after animation
                setTimeout(() => {
                    flyingCard.remove();
                }, 550);
            }
        });

        // After discard animation, show draw animation
        if (drawnCards.length > 0) {
            setTimeout(() => {
                this.playDrawAnimation(drawnCards);
            }, 600);
        }
    }

    // Play draw animation for new cards coming into hand
    playDrawAnimation(drawnCards) {
        console.log('[Animation] Playing draw animation for', drawnCards.length, 'cards');

        const handContainer = document.getElementById('player-hand');
        const deckElement = document.querySelector('.deck-count');
        const deckRect = deckElement ? deckElement.getBoundingClientRect() : null;
        const handRect = handContainer.getBoundingClientRect();

        drawnCards.forEach((card, index) => {
            setTimeout(() => {
                // Create temporary card element for animation
                const cardEl = this.createCardElement(card, true);
                cardEl.style.position = 'fixed';
                cardEl.style.zIndex = '2000';
                cardEl.style.pointerEvents = 'none';
                cardEl.classList.add('card-drawing');

                // Start from deck position
                if (deckRect) {
                    cardEl.style.left = deckRect.left + 'px';
                    cardEl.style.top = deckRect.top + 'px';
                    cardEl.style.transform = 'scale(0.3)';
                    cardEl.style.opacity = '0';
                } else {
                    cardEl.style.left = (handRect.left + handRect.width / 2) + 'px';
                    cardEl.style.top = (handRect.top - 100) + 'px';
                    cardEl.style.transform = 'scale(0.5)';
                    cardEl.style.opacity = '0';
                }

                document.body.appendChild(cardEl);

                // Animate to hand position
                setTimeout(() => {
                    const targetX = handRect.left + (index * 90) + 50;
                    const targetY = handRect.top + handRect.height / 2 - 60;

                    cardEl.style.transition = 'all 0.4s ease-out';
                    cardEl.style.left = targetX + 'px';
                    cardEl.style.top = targetY + 'px';
                    cardEl.style.transform = 'scale(1)';
                    cardEl.style.opacity = '1';
                }, 50);

                // Flash effect when card arrives
                setTimeout(() => {
                    cardEl.style.boxShadow = '0 0 20px 5px rgba(100, 200, 255, 0.8)';
                }, 400);

                // Remove the animated card (the real one will be in the hand after game state updates)
                setTimeout(() => {
                    cardEl.style.opacity = '0';
                    setTimeout(() => cardEl.remove(), 200);
                }, 800);

            }, index * 150); // Stagger each card
        });
    }
}

// Initialize the game client
const game = new GameClient();
